import { createClient } from "npm:@supabase/supabase-js@2.117.2";

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

async function verifyWebhook(req: Request, event: unknown, pp: { token: string; base: string }) {
  const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
  if (!webhookId) throw new Error("paypal_webhook_not_configured");

  const fields = {
    transmission_id: req.headers.get("paypal-transmission-id"),
    transmission_time: req.headers.get("paypal-transmission-time"),
    cert_url: req.headers.get("paypal-cert-url"),
    auth_algo: req.headers.get("paypal-auth-algo"),
    transmission_sig: req.headers.get("paypal-transmission-sig")
  };
  if (Object.values(fields).some((value) => !value)) return false;

  const r = await fetch(`${pp.base}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${pp.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...fields,
      webhook_id: webhookId,
      webhook_event: event
    })
  });
  if (!r.ok) throw new Error("paypal_webhook_verification_unavailable");
  const result = await r.json();
  return result?.verification_status === "SUCCESS";
}

function moneyToPence(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error("invalid_capture_amount");
  return Math.round(n * 100);
}

function compactPaymentAudit(orderData: any, capture: any) {
  return {
    order_id: orderData?.id || null,
    order_status: orderData?.status || null,
    capture: {
      id: capture?.id || null,
      status: capture?.status || null,
      amount: capture?.amount || null,
      create_time: capture?.create_time || null,
      update_time: capture?.update_time || null
    },
    payer_id: orderData?.payer?.payer_id || null,
    source: "paypal_webhook"
  };
}

async function setWebhookOutcome(supabase: any, eventId: string, eventType: string, paypalOrderId: string | null, outcome: string) {
  await supabase.from("collectables_paypal_webhook_events").upsert({
    event_id: eventId,
    event_type: eventType,
    paypal_order_id: paypalOrderId,
    outcome,
    processed_at: new Date().toISOString()
  }, { onConflict: "event_id" });
}

Deno.serve(async (req) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  }

  let event: any;
  try {
    event = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers });
  }

  try {
    const pp = await paypalAccessToken();
    if (!(await verifyWebhook(req, event, pp))) {
      return new Response(JSON.stringify({ error: "invalid_signature" }), { status: 401, headers });
    }

    const eventId = String(event?.id || "");
    const eventType = String(event?.event_type || "");
    if (!eventId || !eventType) {
      return new Response(JSON.stringify({ error: "invalid_event" }), { status: 400, headers });
    }

    const paypalOrderId = String(
      event?.resource?.supplementary_data?.related_ids?.order_id || ""
    ) || null;
    const supabase = adminClient();

    const { data: previous } = await supabase
      .from("collectables_paypal_webhook_events")
      .select("outcome")
      .eq("event_id", eventId)
      .maybeSingle();
    if (previous?.outcome?.startsWith("processed")) {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), { status: 200, headers });
    }

    await setWebhookOutcome(supabase, eventId, eventType, paypalOrderId, "processing");

    if (!paypalOrderId) {
      await setWebhookOutcome(supabase, eventId, eventType, null, "processed_ignored_no_order");
      return new Response(JSON.stringify({ ok: true, ignored: true }), { status: 200, headers });
    }

    const { data: localOrder } = await supabase
      .from("collectables_orders")
      .select("id,order_number,status,paypal_order_id,total_pence,currency")
      .eq("paypal_order_id", paypalOrderId)
      .maybeSingle();

    if (!localOrder) {
      await setWebhookOutcome(supabase, eventId, eventType, paypalOrderId, "processed_ignored_unknown_order");
      return new Response(JSON.stringify({ ok: true, ignored: true }), { status: 200, headers });
    }

    if (eventType === "PAYMENT.CAPTURE.DENIED") {
      await supabase.rpc("collectables_mark_capture_failed", {
        p_order_id: localOrder.id,
        p_reason: "PayPal reported PAYMENT.CAPTURE.DENIED"
      });
      await setWebhookOutcome(supabase, eventId, eventType, paypalOrderId, "processed_capture_denied");
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }

    if (eventType === "PAYMENT.CAPTURE.PENDING") {
      await supabase.rpc("collectables_mark_order_review", {
        p_order_id: localOrder.id,
        p_reason: "PayPal reported PAYMENT.CAPTURE.PENDING"
      });
      await setWebhookOutcome(supabase, eventId, eventType, paypalOrderId, "processed_capture_pending");
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }

    if (eventType !== "PAYMENT.CAPTURE.COMPLETED") {
      await setWebhookOutcome(supabase, eventId, eventType, paypalOrderId, "processed_ignored_event_type");
      return new Response(JSON.stringify({ ok: true, ignored: true }), { status: 200, headers });
    }

    if (localOrder.status === "paid") {
      await setWebhookOutcome(supabase, eventId, eventType, paypalOrderId, "processed_already_paid");
      return new Response(JSON.stringify({ ok: true, already_paid: true }), { status: 200, headers });
    }

    const detailsRes = await fetch(`${pp.base}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, {
      headers: {
        "Authorization": `Bearer ${pp.token}`,
        "Content-Type": "application/json"
      }
    });
    const orderData = await detailsRes.json();
    if (!detailsRes.ok || orderData?.id !== paypalOrderId) {
      throw new Error("paypal_order_lookup_failed");
    }

    const purchaseUnit = orderData.purchase_units?.[0];
    const eventCaptureId = String(event?.resource?.id || "");
    const capture = purchaseUnit?.payments?.captures?.find((x: any) => x?.id === eventCaptureId)
      || purchaseUnit?.payments?.captures?.[0];

    if (orderData.status !== "COMPLETED" || capture?.status !== "COMPLETED" || !capture?.id) {
      throw new Error("paypal_completed_event_not_confirmed");
    }

    const shippingCountry = purchaseUnit?.shipping?.address?.country_code || "";
    if (shippingCountry !== "GB") {
      await supabase.rpc("collectables_mark_order_review", {
        p_order_id: localOrder.id,
        p_reason: `Captured PayPal order has unsupported shipping country: ${shippingCountry || "missing"}`
      });
      await setWebhookOutcome(supabase, eventId, eventType, paypalOrderId, "processed_review_non_gb");
      return new Response(JSON.stringify({ ok: true, review_required: true }), { status: 200, headers });
    }

    const amountPence = moneyToPence(capture.amount?.value || "0");
    const currency = capture.amount?.currency_code || "";
    if (amountPence !== localOrder.total_pence || currency !== localOrder.currency) {
      await supabase.rpc("collectables_mark_order_review", {
        p_order_id: localOrder.id,
        p_reason: "Captured PayPal amount does not match local order"
      });
      await setWebhookOutcome(supabase, eventId, eventType, paypalOrderId, "processed_review_amount_mismatch");
      return new Response(JSON.stringify({ ok: true, review_required: true }), { status: 200, headers });
    }

    await supabase.rpc("collectables_mark_order_review", {
      p_order_id: localOrder.id,
      p_reason: "Reconciling completed PayPal capture from verified webhook"
    });

    const buyerEmail = orderData.payer?.email_address || null;
    const buyerName = [
      orderData.payer?.name?.given_name,
      orderData.payer?.name?.surname
    ].filter(Boolean).join(" ") || null;

    const { data: orderNumber, error: finalizeError } = await supabase.rpc("collectables_finalize_order", {
      p_order_id: localOrder.id,
      p_paypal_order_id: paypalOrderId,
      p_paypal_capture_id: capture.id,
      p_capture_amount_pence: amountPence,
      p_currency: currency,
      p_buyer_email: buyerEmail,
      p_buyer_name: buyerName,
      p_shipping_address: purchaseUnit?.shipping || null,
      p_paypal_response: compactPaymentAudit(orderData, capture)
    });

    if (finalizeError) {
      await supabase.rpc("collectables_mark_order_review", {
        p_order_id: localOrder.id,
        p_reason: `Verified PayPal capture needs manual reconciliation: ${finalizeError.message}`
      });
      await setWebhookOutcome(supabase, eventId, eventType, paypalOrderId, "processed_review_finalize_failed");
      return new Response(JSON.stringify({ ok: true, review_required: true }), { status: 200, headers });
    }

    await setWebhookOutcome(supabase, eventId, eventType, paypalOrderId, "processed_paid");
    return new Response(JSON.stringify({ ok: true, order_number: orderNumber }), { status: 200, headers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "webhook_error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers });
  }
});
