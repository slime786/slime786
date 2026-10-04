import { createClient } from "npm:@supabase/supabase-js@2.117.2";

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

function capturesEnabled() {
  return Deno.env.get("COLLECTABLES_CAPTURES_ENABLED") === "true";
}

function liveCommerceReady() {
  if ((Deno.env.get("PAYPAL_ENV") || "sandbox") !== "live") return true;
  if (Deno.env.get("COLLECTABLES_PUBLIC_BUSINESS_INFO_ENABLED") !== "true") return false;
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

function moneyToPence(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error("invalid_capture_amount");
  return Math.round(n * 100);
}


async function sendOrderConfirmation(
  supabase: any,
  orderId: string,
  buyerEmail: string | null,
  orderNumber: string
) {
  const apiKey = Deno.env.get("RESEND_API_KEY") || "";
  const from = Deno.env.get("COLLECTABLES_FROM_EMAIL") || "";
  const sellerName = Deno.env.get("COLLECTABLES_SELLER_NAME") || "Slime's Collectables";
  const sellerAddress = Deno.env.get("COLLECTABLES_SELLER_ADDRESS") || "";
  const contactEmail = Deno.env.get("COLLECTABLES_CONTACT_EMAIL") || "";

  if (!buyerEmail || !apiKey || !from || !sellerAddress || !contactEmail) {
    return { sent: false, error: "confirmation_email_not_configured" };
  }

  const { data: order, error: orderError } = await supabase
    .from("collectables_orders")
    .select("subtotal_pence,shipping_pence,total_pence,confirmation_email_sent_at")
    .eq("id", orderId)
    .single();
  if (orderError || !order) return { sent: false, error: "confirmation_order_lookup_failed" };
  if (order.confirmation_email_sent_at) return { sent: true, alreadySent: true };

  const { data: items, error: itemsError } = await supabase
    .from("collectables_order_items")
    .select("product_name,unit_price_pence,quantity")
    .eq("order_id", orderId)
    .order("id");
  if (itemsError) return { sent: false, error: "confirmation_items_lookup_failed" };

  const money = (pence: number) => `£${(Number(pence || 0) / 100).toFixed(2)}`;
  const lines = [
    `Order confirmed — ${orderNumber}`,
    "",
    `Seller: ${sellerName}`,
    sellerAddress,
    `Contact: ${contactEmail}`,
    "",
    "Order summary:",
    ...(items || []).map((item: any) =>
      `- ${item.product_name} x ${item.quantity} — ${money(Number(item.unit_price_pence) * Number(item.quantity))}`
    ),
    "",
    `Items: ${money(order.subtotal_pence)}`,
    `Delivery: ${money(order.shipping_pence)}`,
    `Total paid: ${money(order.total_pence)}`,
    "",
    "Where UK distance-selling cancellation rights apply, you can tell us within 14 days of receiving the goods that you wish to cancel, then return them within the following 14 days.",
    "This does not limit rights for faulty, damaged, incorrect or misdescribed goods.",
    "",
    "Shipping & Returns: https://slime786.github.io/slime786/collectables/shipping-returns.html",
    "Terms: https://slime786.github.io/slime786/collectables/terms.html",
    "Cancellation form: https://slime786.github.io/slime786/collectables/cancellation-form.html"
  ];

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `collectables-order-confirmation/${orderId}`
    },
    body: JSON.stringify({
      from,
      to: [buyerEmail],
      reply_to: contactEmail,
      subject: `Slime's Collectables order ${orderNumber}`,
      text: lines.join("\\n")
    })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result?.id) {
    await supabase.from("collectables_orders").update({
      confirmation_email_error: `Resend HTTP ${response.status}`,
      updated_at: new Date().toISOString()
    }).eq("id", orderId);
    return { sent: false, error: "confirmation_email_failed" };
  }

  await supabase.from("collectables_orders").update({
    confirmation_email_id: result.id,
    confirmation_email_sent_at: new Date().toISOString(),
    confirmation_email_error: null,
    updated_at: new Date().toISOString()
  }).eq("id", orderId);

  return { sent: true };
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
    source: "browser_capture"
  };
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
  if (!capturesEnabled()) {
    return new Response(JSON.stringify({ error: "capture_temporarily_disabled" }), { status: 503, headers });
  }
  if (!liveCommerceReady()) {
    return new Response(JSON.stringify({ error: "live_launch_configuration_incomplete" }), { status: 503, headers });
  }

  try {
    const body = await req.json();
    const paypalOrderId = String(body.paypal_order_id || "").trim();
    const localOrderId = String(body.local_order_id || "").trim();
    if (!paypalOrderId || !localOrderId) {
      return new Response(JSON.stringify({ error: "missing_order_id" }), { status: 400, headers });
    }

    const supabase = adminClient();
    const { data: existing, error: existingError } = await supabase
      .from("collectables_orders")
      .select("id,order_number,status,paypal_order_id,total_pence,currency")
      .eq("id", localOrderId)
      .single();

    if (existingError || !existing) {
      return new Response(JSON.stringify({ error: "order_not_found" }), { status: 404, headers });
    }
    if (existing.paypal_order_id !== paypalOrderId) {
      return new Response(JSON.stringify({ error: "paypal_order_mismatch" }), { status: 400, headers });
    }
    if (existing.status === "paid") {
      return new Response(JSON.stringify({
        ok: true,
        order_number: existing.order_number,
        already_paid: true
      }), { status: 200, headers });
    }
    if (existing.status !== "paypal_created") {
      return new Response(JSON.stringify({
        error: ["capturing","review"].includes(existing.status)
          ? "payment_review_required"
          : "order_not_payable"
      }), { status: 409, headers });
    }

    const pp = await paypalAccessToken();

    const detailsRes = await fetch(`${pp.base}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, {
      headers: {
        "Authorization": `Bearer ${pp.token}`,
        "Content-Type": "application/json"
      }
    });
    const orderData = await detailsRes.json();
    if (!detailsRes.ok || orderData?.id !== paypalOrderId) {
      return new Response(JSON.stringify({ error: "paypal_order_lookup_failed" }), { status: 502, headers });
    }

    const purchaseUnit = orderData.purchase_units?.[0];
    if (purchaseUnit?.reference_id !== localOrderId || purchaseUnit?.custom_id !== localOrderId) {
      await supabase.rpc("collectables_mark_order_review", {
        p_order_id: localOrderId,
        p_reason: "PayPal purchase-unit reference mismatch"
      });
      return new Response(JSON.stringify({ error: "paypal_reference_mismatch" }), { status: 409, headers });
    }

    const paypalAmount = moneyToPence(purchaseUnit?.amount?.value || "0");
    const paypalCurrency = purchaseUnit?.amount?.currency_code || "";
    if (paypalAmount !== existing.total_pence || paypalCurrency !== existing.currency) {
      await supabase.rpc("collectables_mark_order_review", {
        p_order_id: localOrderId,
        p_reason: "PayPal order total mismatch before capture"
      });
      return new Response(JSON.stringify({ error: "paypal_amount_mismatch" }), { status: 409, headers });
    }

    const shippingCountry = purchaseUnit?.shipping?.address?.country_code || "";
    if (shippingCountry !== "GB") {
      await supabase.rpc("collectables_cancel_order", {
        p_order_id: localOrderId,
        p_reason: `Unsupported shipping country: ${shippingCountry || "missing"}`
      });
      return new Response(JSON.stringify({ error: "shipping_country_not_supported" }), { status: 400, headers });
    }

    if (orderData.status !== "APPROVED") {
      return new Response(JSON.stringify({ error: "paypal_order_not_approved" }), { status: 409, headers });
    }

    const { error: beginError } = await supabase.rpc("collectables_begin_capture", {
      p_order_id: localOrderId,
      p_paypal_order_id: paypalOrderId
    });
    if (beginError) {
      return new Response(JSON.stringify({ error: beginError.message }), { status: 409, headers });
    }

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
      await supabase.rpc("collectables_mark_order_review", {
        p_order_id: localOrderId,
        p_reason: `PayPal capture returned HTTP ${captureRes.status}`
      });
      return new Response(JSON.stringify({ error: "paypal_capture_needs_review" }), { status: 502, headers });
    }

    const completedPurchaseUnit = captureData.purchase_units?.[0];
    const capture = completedPurchaseUnit?.payments?.captures?.[0];
    if (captureData.status !== "COMPLETED" || capture?.status !== "COMPLETED" || !capture?.id) {
      await supabase.rpc("collectables_mark_order_review", {
        p_order_id: localOrderId,
        p_reason: "PayPal capture response was not completed"
      });
      return new Response(JSON.stringify({ error: "paypal_capture_not_completed" }), { status: 409, headers });
    }

    const amountPence = moneyToPence(capture.amount?.value || "0");
    const currency = capture.amount?.currency_code || "";
    const buyerEmail = captureData.payer?.email_address || null;
    const buyerName = [
      captureData.payer?.name?.given_name,
      captureData.payer?.name?.surname
    ].filter(Boolean).join(" ") || null;
    const shippingAddress = completedPurchaseUnit?.shipping || null;

    const { data: orderNumber, error: finalizeError } = await supabase.rpc("collectables_finalize_order", {
      p_order_id: localOrderId,
      p_paypal_order_id: paypalOrderId,
      p_paypal_capture_id: capture.id,
      p_capture_amount_pence: amountPence,
      p_currency: currency,
      p_buyer_email: buyerEmail,
      p_buyer_name: buyerName,
      p_shipping_address: shippingAddress,
      p_paypal_response: compactPaymentAudit(captureData, capture)
    });

    if (finalizeError) {
      await supabase.rpc("collectables_mark_order_review", {
        p_order_id: localOrderId,
        p_reason: `Captured at PayPal; local finalisation failed: ${finalizeError.message}`
      });
      return new Response(JSON.stringify({ error: "order_finalize_needs_review" }), { status: 500, headers });
    }

    const confirmation = await sendOrderConfirmation(
      supabase,
      localOrderId,
      buyerEmail,
      String(orderNumber)
    );

    return new Response(JSON.stringify({
      ok: true,
      order_number: orderNumber,
      paypal_capture_id: capture.id,
      confirmation_email_sent: Boolean(confirmation.sent)
    }), { status: 200, headers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "capture_error";
    const status = message === "paypal_not_configured" ? 503 : 400;
    return new Response(JSON.stringify({ error: message }), { status, headers });
  }
});
