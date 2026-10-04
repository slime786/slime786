import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const PROD_ORIGIN = "https://slime786.github.io";

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
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-checkout-session",
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

function clientAddress(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded
    || req.headers.get("cf-connecting-ip")
    || req.headers.get("x-real-ip")
    || "unknown";
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

async function enforceRateLimit(supabase: any, req: Request) {
  const keyHash = await sha256Hex(`checkout-create:${clientAddress(req)}`);
  const policies = [
    { action: "create_10m", limit: 6, window: 600 },
    { action: "create_day", limit: 30, window: 86400 }
  ];

  for (const policy of policies) {
    const { data, error } = await supabase.rpc("collectables_take_rate_limit", {
      p_key_hash: keyHash,
      p_action: policy.action,
      p_limit: policy.limit,
      p_window_seconds: policy.window
    });
    if (error) throw new Error("rate_limit_unavailable");
    const row = Array.isArray(data) ? data[0] : data;
    if (row && row.allowed === false) {
      return Math.max(1, Number(row.retry_after_seconds || 60));
    }
  }
  return 0;
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

Deno.serve(async (req) => {
  const headers = { ...cors(req, "POST, OPTIONS"), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });

  const origin = req.headers.get("origin") || "";
  if (!isAllowedOrigin(origin)) {
    return new Response(JSON.stringify({ error: "origin_not_allowed" }), { status: 403, headers });
  }

  let localOrderId: string | null = null;
  try {
    const { cart } = await req.json();
    if (!Array.isArray(cart) || cart.length < 1) {
      return new Response(JSON.stringify({ error: "cart_empty" }), { status: 400, headers });
    }

    const supabase = adminClient();
    const retryAfter = await enforceRateLimit(supabase, req);
    if (retryAfter) {
      return new Response(JSON.stringify({ error: "checkout_rate_limited" }), {
        status: 429,
        headers: { ...headers, "Retry-After": String(retryAfter) }
      });
    }

    const cleanCart = cart.map((x: any) => ({
      id: String(x.id || "").slice(0, 120),
      quantity: Number(x.quantity)
    }));

    const { data: reserve, error: reserveError } = await supabase
      .rpc("collectables_reserve_order", { p_cart: cleanCart });
    if (reserveError) throw new Error(reserveError.message);

    const order = Array.isArray(reserve) ? reserve[0] : reserve;
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

    const paypalData = await paypalRes.json().catch(() => ({}));
    if (!paypalRes.ok || !paypalData.id) {
      await supabase.rpc("collectables_cancel_order", {
        p_order_id: localOrderId,
        p_reason: "PayPal order creation failed"
      });
      return new Response(JSON.stringify({ error: "paypal_create_failed" }), { status: 502, headers });
    }

    const checkoutSession = randomToken();
    const checkoutTokenHash = await sha256Hex(checkoutSession);
    const { error: updateError } = await supabase
      .from("collectables_orders")
      .update({
        paypal_order_id: paypalData.id,
        checkout_token_hash: checkoutTokenHash,
        status: "paypal_created",
        updated_at: new Date().toISOString()
      })
      .eq("id", localOrderId);

    if (updateError) {
      await supabase.rpc("collectables_cancel_order", {
        p_order_id: localOrderId,
        p_reason: "Local order setup failed after PayPal order creation"
      });
      throw new Error("local_order_setup_failed");
    }

    return new Response(JSON.stringify({
      id: paypalData.id,
      local_order_id: localOrderId,
      order_number: order.order_number,
      checkout_session: checkoutSession
    }), { status: 200, headers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "checkout_error";
    const status = message === "paypal_not_configured" ? 503
      : message === "rate_limit_unavailable" ? 503
      : 400;
    return new Response(JSON.stringify({ error: message }), { status, headers });
  }
});
