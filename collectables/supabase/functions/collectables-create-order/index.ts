import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const PROD_ORIGIN = "https://slime786.github.io";
const MAX_BODY_BYTES = 16_384;

function isAllowedOrigin(origin: string) {
  if (origin === PROD_ORIGIN) return true;
  try {
    const url = new URL(origin);
    return url.protocol === "http:"
      && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

function cors(req: Request, methods: string) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = isAllowedOrigin(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "content-type, apikey, authorization",
    "Access-Control-Allow-Methods": methods,
    "Vary": "Origin",
    "Cache-Control": "no-store"
  };
}

function adminClient() {
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const key = keys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw new Error("supabase_secret_missing");
  return createClient(Deno.env.get("SUPABASE_URL")!, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function newOrdersEnabled() {
  return Deno.env.get("COLLECTABLES_NEW_ORDERS_ENABLED") === "true";
}

function liveCommerceReady() {
  if ((Deno.env.get("PAYPAL_ENV") || "sandbox") !== "live") return true;
  return [
    "RESEND_API_KEY",
    "COLLECTABLES_FROM_EMAIL",
    "COLLECTABLES_SELLER_NAME",
    "COLLECTABLES_SELLER_ADDRESS",
    "COLLECTABLES_CONTACT_EMAIL"
  ].every((key) => Boolean(Deno.env.get(key)?.trim()));
}

async function paypalAccessToken() {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  const env = Deno.env.get("PAYPAL_ENV") || "sandbox";
  if (!clientId || !secret) throw new Error("paypal_not_configured");
  const base = env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const auth = btoa(`${clientId}:${secret}`);
  const r = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  if (!r.ok) throw new Error("paypal_auth_failed");
  const data = await r.json();
  return { token: data.access_token as string, base };
}

function penceToGBP(pence: number) {
  return (pence / 100).toFixed(2);
}

function cleanCart(input: unknown) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 50) {
    throw new Error(input && Array.isArray(input) ? "cart_too_large" : "cart_empty");
  }

  const grouped = new Map<string, number>();
  for (const item of input) {
    if (!item || typeof item !== "object") throw new Error("invalid_cart_item");
    const raw = item as Record<string, unknown>;
    const id = String(raw.id || "").trim().slice(0, 120);
    const quantity = Number(raw.quantity);
    if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      throw new Error("invalid_cart_item");
    }
    const next = (grouped.get(id) || 0) + quantity;
    if (next > 10) throw new Error("invalid_quantity");
    grouped.set(id, next);
  }
  return [...grouped].map(([id, quantity]) => ({ id, quantity }));
}

async function clientKey(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded
    || req.headers.get("cf-connecting-ip")
    || req.headers.get("x-real-ip")
    || "unknown";
  const ua = (req.headers.get("user-agent") || "unknown").slice(0, 300);
  const bytes = new TextEncoder().encode(`${ip}|${ua}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const headers = { ...cors(req, "POST, OPTIONS"), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  }

  const origin = req.headers.get("origin") || "";
  if (!isAllowedOrigin(origin)) {
    return new Response(JSON.stringify({ error: "origin_not_allowed" }), { status: 403, headers });
  }
  if (!newOrdersEnabled()) {
    return new Response(JSON.stringify({ error: "store_not_accepting_orders" }), { status: 503, headers });
  }
  if (!liveCommerceReady()) {
    return new Response(JSON.stringify({ error: "live_launch_configuration_incomplete" }), { status: 503, headers });
  }

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: "request_too_large" }), { status: 413, headers });
  }

  let localOrderId: string | null = null;
  try {
    const body = await req.json();
    const cart = cleanCart(body?.cart);
    const supabase = adminClient();

    const fingerprint = await clientKey(req);
    const { data: allowed, error: limitError } = await supabase.rpc(
      "collectables_checkout_rate_limit",
      { p_client_key: fingerprint, p_limit: 8, p_window_seconds: 600 }
    );
    if (limitError) throw new Error("rate_limit_unavailable");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "checkout_rate_limited" }), { status: 429, headers });
    }

    const { data: reserve, error: reserveError } = await supabase
      .rpc("collectables_reserve_order", { p_cart: cart });
    if (reserveError) throw new Error(reserveError.message);

    const order = Array.isArray(reserve) ? reserve[0] : reserve;
    if (!order?.order_id) throw new Error("reservation_failed");
    localOrderId = order.order_id;

    let pp;
    try {
      pp = await paypalAccessToken();
    } catch (e) {
      await supabase.rpc("collectables_cancel_order", {
        p_order_id: localOrderId,
        p_reason: "PayPal credentials are not configured"
      });
      throw e;
    }

    const paypalRes = await fetch(`${pp.base}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${pp.token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `sc-create-${localOrderId}`
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: localOrderId,
          custom_id: localOrderId,
          invoice_id: order.order_number,
          description: "Slime's Collectables order",
          amount: {
            currency_code: "GBP",
            value: penceToGBP(order.total_pence),
            breakdown: {
              item_total: { currency_code: "GBP", value: penceToGBP(order.subtotal_pence) },
              shipping: { currency_code: "GBP", value: penceToGBP(order.shipping_pence) }
            }
          }
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "Slime's Collectables",
              user_action: "PAY_NOW",
              shipping_preference: "GET_FROM_FILE",
              locale: "en-GB"
            }
          }
        }
      })
    });

    const paypalData = await paypalRes.json();
    if (!paypalRes.ok || !paypalData.id) {
      await supabase.rpc("collectables_cancel_order", {
        p_order_id: localOrderId,
        p_reason: "PayPal order creation failed"
      });
      return new Response(JSON.stringify({ error: "paypal_create_failed" }), { status: 502, headers });
    }

    const { error: attachError } = await supabase.rpc("collectables_attach_paypal_order", {
      p_order_id: localOrderId,
      p_paypal_order_id: paypalData.id
    });
    if (attachError) {
      await supabase.rpc("collectables_cancel_order", {
        p_order_id: localOrderId,
        p_reason: "Local PayPal order attachment failed"
      });
      throw new Error("paypal_order_attach_failed");
    }

    return new Response(JSON.stringify({
      id: paypalData.id,
      local_order_id: localOrderId,
      order_number: order.order_number
    }), { status: 200, headers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "checkout_error";
    const status = message === "paypal_not_configured" ? 503
      : message === "checkout_rate_limited" ? 429
      : 400;
    return new Response(JSON.stringify({ error: message }), { status, headers });
  }
});
