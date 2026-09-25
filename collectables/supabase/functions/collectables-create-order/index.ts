import { createClient } from "npm:@supabase/supabase-js@2";

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

    const paypalData = await paypalRes.json();
    if (!paypalRes.ok || !paypalData.id) {
      await supabase.rpc("collectables_cancel_order", {
        p_order_id: localOrderId,
        p_reason: "PayPal order creation failed"
      });
      return new Response(JSON.stringify({ error: "paypal_create_failed" }), { status: 502, headers });
    }

    const { error: updateError } = await supabase
      .from("collectables_orders")
      .update({
        paypal_order_id: paypalData.id,
        status: "paypal_created",
        updated_at: new Date().toISOString()
      })
      .eq("id", localOrderId);
    if (updateError) throw new Error(updateError.message);

    return new Response(JSON.stringify({
      id: paypalData.id,
      local_order_id: localOrderId,
      order_number: order.order_number
    }), { status: 200, headers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "checkout_error";
    const status = message === "paypal_not_configured" ? 503 : 400;
    return new Response(JSON.stringify({ error: message }), { status, headers });
  }
});