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

function moneyToPence(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error("invalid_capture_amount");
  return Math.round(n * 100);
}

Deno.serve(async (req) => {
  const headers = { ...cors(req, "POST, OPTIONS"), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });

  const origin = req.headers.get("origin") || "";
  if (!isAllowedOrigin(origin)) {
    return new Response(JSON.stringify({ error: "origin_not_allowed" }), { status: 403, headers });
  }

  try {
    const body = await req.json();
    const paypalOrderId = String(body.paypal_order_id || "");
    const localOrderId = String(body.local_order_id || "");
    if (!paypalOrderId || !localOrderId) {
      return new Response(JSON.stringify({ error: "missing_order_id" }), { status: 400, headers });
    }

    const supabase = adminClient();
    const { data: existing, error: existingError } = await supabase
      .from("collectables_orders")
      .select("id,order_number,status,paypal_order_id,total_pence,currency")
      .eq("id", localOrderId)
      .single();
    if (existingError || !existing) return new Response(JSON.stringify({ error: "order_not_found" }), { status: 404, headers });
    if (existing.paypal_order_id !== paypalOrderId) return new Response(JSON.stringify({ error: "paypal_order_mismatch" }), { status: 400, headers });
    if (existing.status === "paid") return new Response(JSON.stringify({ ok: true, order_number: existing.order_number, already_paid: true }), { status: 200, headers });

    const pp = await paypalAccessToken();
    const captureRes = await fetch(`${pp.base}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${pp.token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `sc-capture-${localOrderId}`
      }
    });

    const captureData = await captureRes.json();
    if (!captureRes.ok) {
      return new Response(JSON.stringify({ error: "paypal_capture_failed" }), { status: 502, headers });
    }

    const purchaseUnit = captureData.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];
    if (captureData.status !== "COMPLETED" || capture?.status !== "COMPLETED") {
      return new Response(JSON.stringify({ error: "paypal_capture_not_completed" }), { status: 409, headers });
    }

    const amountPence = moneyToPence(capture.amount?.value || "0");
    const currency = capture.amount?.currency_code || "";
    const buyerEmail = captureData.payer?.email_address || null;
    const buyerName = [captureData.payer?.name?.given_name, captureData.payer?.name?.surname].filter(Boolean).join(" ") || null;
    const shippingAddress = purchaseUnit?.shipping || null;

    const { data: orderNumber, error: finalizeError } = await supabase.rpc("collectables_finalize_order", {
      p_order_id: localOrderId,
      p_paypal_order_id: paypalOrderId,
      p_paypal_capture_id: capture.id,
      p_capture_amount_pence: amountPence,
      p_currency: currency,
      p_buyer_email: buyerEmail,
      p_buyer_name: buyerName,
      p_shipping_address: shippingAddress,
      p_paypal_response: captureData
    });
    if (finalizeError) {
      await supabase.from("collectables_orders").update({
        last_error: finalizeError.message,
        updated_at: new Date().toISOString()
      }).eq("id", localOrderId);
      return new Response(JSON.stringify({ error: "order_finalize_failed" }), { status: 500, headers });
    }

    return new Response(JSON.stringify({
      ok: true,
      order_number: orderNumber,
      paypal_capture_id: capture.id
    }), { status: 200, headers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "capture_error";
    const status = message === "paypal_not_configured" ? 503 : 400;
    return new Response(JSON.stringify({ error: message }), { status, headers });
  }
});