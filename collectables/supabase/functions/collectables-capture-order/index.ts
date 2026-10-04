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

async function enforceRateLimit(supabase: any, req: Request) {
  const keyHash = await sha256Hex(`checkout-capture:${clientAddress(req)}`);
  const policies = [
    { action: "capture_10m", limit: 12, window: 600 },
    { action: "capture_day", limit: 100, window: 86400 }
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

function moneyToPence(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error("invalid_capture_amount");
  return Math.round(n * 100);
}

function completedCapture(payload: any) {
  const purchaseUnit = payload?.purchase_units?.[0];
  const capture = purchaseUnit?.payments?.captures?.find((item: any) => item?.status === "COMPLETED");
  if (payload?.status !== "COMPLETED" || !capture?.id) return null;
  return { purchaseUnit, capture };
}

async function markReconciliation(supabase: any, localOrderId: string, reason: string) {
  await supabase.rpc("collectables_mark_reconciliation_required", {
    p_order_id: localOrderId,
    p_reason: reason
  });
}

async function persistAndFinalize(
  supabase: any,
  localOrderId: string,
  paypalOrderId: string,
  payload: any
) {
  const completed = completedCapture(payload);
  if (!completed) {
    await markReconciliation(supabase, localOrderId, "paypal_capture_not_completed");
    return { status: 409, body: { error: "paypal_capture_not_completed", reconciliation_required: true } };
  }

  const { purchaseUnit, capture } = completed;
  const amountPence = moneyToPence(capture.amount?.value || "0");
  const currency = capture.amount?.currency_code || "";
  const buyerEmail = payload.payer?.email_address || null;
  const buyerName = [payload.payer?.name?.given_name, payload.payer?.name?.surname].filter(Boolean).join(" ") || null;
  const shippingAddress = purchaseUnit?.shipping || null;

  const { error: recordError } = await supabase.rpc("collectables_record_capture", {
    p_order_id: localOrderId,
    p_paypal_order_id: paypalOrderId,
    p_paypal_capture_id: capture.id,
    p_capture_amount_pence: amountPence,
    p_currency: currency,
    p_buyer_email: buyerEmail,
    p_buyer_name: buyerName,
    p_shipping_address: shippingAddress,
    p_paypal_response: payload
  });

  if (recordError) {
    await markReconciliation(supabase, localOrderId, `capture_record_failed:${recordError.message}`);
    return { status: 500, body: { error: "capture_record_failed", reconciliation_required: true } };
  }

  const { data: orderNumber, error: finalizeError } = await supabase.rpc(
    "collectables_finalize_captured_order",
    { p_order_id: localOrderId }
  );

  if (finalizeError) {
    await markReconciliation(supabase, localOrderId, `finalize_failed:${finalizeError.message}`);
    return { status: 500, body: { error: "order_reconciliation_required", reconciliation_required: true } };
  }

  return {
    status: 200,
    body: {
      ok: true,
      order_number: orderNumber,
      paypal_capture_id: capture.id
    }
  };
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
    const checkoutSession = String(req.headers.get("x-checkout-session") || body.checkout_session || "");

    if (!paypalOrderId || !localOrderId) {
      return new Response(JSON.stringify({ error: "missing_order_id" }), { status: 400, headers });
    }
    if (!checkoutSession || checkoutSession.length > 256) {
      return new Response(JSON.stringify({ error: "checkout_session_required" }), { status: 401, headers });
    }

    const supabase = adminClient();
    const retryAfter = await enforceRateLimit(supabase, req);
    if (retryAfter) {
      return new Response(JSON.stringify({ error: "checkout_rate_limited" }), {
        status: 429,
        headers: { ...headers, "Retry-After": String(retryAfter) }
      });
    }

    const { data: existing, error: existingError } = await supabase
      .from("collectables_orders")
      .select("id,order_number,status,paypal_order_id,paypal_capture_id,total_pence,currency,checkout_token_hash")
      .eq("id", localOrderId)
      .single();

    if (existingError || !existing) {
      return new Response(JSON.stringify({ error: "order_not_found" }), { status: 404, headers });
    }
    if (existing.paypal_order_id !== paypalOrderId) {
      return new Response(JSON.stringify({ error: "paypal_order_mismatch" }), { status: 400, headers });
    }

    const presentedHash = await sha256Hex(checkoutSession);
    if (!existing.checkout_token_hash || presentedHash !== existing.checkout_token_hash) {
      return new Response(JSON.stringify({ error: "checkout_session_invalid" }), { status: 401, headers });
    }

    if (existing.status === "paid") {
      return new Response(JSON.stringify({
        ok: true,
        order_number: existing.order_number,
        already_paid: true
      }), { status: 200, headers });
    }

    if (existing.status === "captured_unfinalized" && existing.paypal_capture_id) {
      const { data: orderNumber, error: finalizeError } = await supabase.rpc(
        "collectables_finalize_captured_order",
        { p_order_id: localOrderId }
      );
      if (!finalizeError) {
        return new Response(JSON.stringify({
          ok: true,
          order_number: orderNumber,
          paypal_capture_id: existing.paypal_capture_id,
          reconciled: true
        }), { status: 200, headers });
      }
      await markReconciliation(supabase, localOrderId, `retry_finalize_failed:${finalizeError.message}`);
      return new Response(JSON.stringify({
        error: "order_reconciliation_required",
        reconciliation_required: true
      }), { status: 500, headers });
    }

    const pp = await paypalAccessToken();

    if (existing.status === "capture_pending" || existing.status === "reconciliation_required") {
      const probeRes = await fetch(`${pp.base}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, {
        headers: { "Authorization": `Bearer ${pp.token}` }
      });

      if (!probeRes.ok) {
        await markReconciliation(supabase, localOrderId, `paypal_probe_failed:${probeRes.status}`);
        return new Response(JSON.stringify({
          error: "payment_status_unknown",
          reconciliation_required: true
        }), { status: 502, headers });
      }

      const probeData = await probeRes.json();
      if (completedCapture(probeData)) {
        const recovered = await persistAndFinalize(supabase, localOrderId, paypalOrderId, probeData);
        return new Response(JSON.stringify(recovered.body), { status: recovered.status, headers });
      }

      if (probeData?.status !== "APPROVED") {
        await markReconciliation(supabase, localOrderId, `paypal_status:${String(probeData?.status || "unknown")}`);
        return new Response(JSON.stringify({
          error: "payment_status_requires_review",
          reconciliation_required: true
        }), { status: 409, headers });
      }
    }

    const { error: prepareError } = await supabase.rpc("collectables_prepare_capture", {
      p_order_id: localOrderId,
      p_paypal_order_id: paypalOrderId
    });
    if (prepareError) {
      const expired = prepareError.message.includes("reservation_expired")
        || prepareError.message.includes("reservation_missing_or_expired");
      return new Response(JSON.stringify({
        error: expired ? "reservation_expired" : "capture_not_ready"
      }), { status: expired ? 409 : 400, headers });
    }

    let captureRes: Response;
    try {
      captureRes = await fetch(`${pp.base}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${pp.token}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": `sc-capture-${localOrderId}`
        }
      });
    } catch {
      await markReconciliation(supabase, localOrderId, "paypal_capture_network_error");
      return new Response(JSON.stringify({
        error: "payment_status_unknown",
        reconciliation_required: true
      }), { status: 502, headers });
    }

    const captureData = await captureRes.json().catch(() => ({}));
    if (!captureRes.ok) {
      await markReconciliation(supabase, localOrderId, `paypal_capture_failed:${captureRes.status}`);
      return new Response(JSON.stringify({
        error: "paypal_capture_failed",
        reconciliation_required: true
      }), { status: 502, headers });
    }

    const result = await persistAndFinalize(supabase, localOrderId, paypalOrderId, captureData);
    return new Response(JSON.stringify(result.body), { status: result.status, headers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "capture_error";
    const status = message === "paypal_not_configured" || message === "rate_limit_unavailable" ? 503 : 400;
    return new Response(JSON.stringify({ error: message }), { status, headers });
  }
});
