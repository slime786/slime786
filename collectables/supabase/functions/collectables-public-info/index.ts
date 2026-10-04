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

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = isAllowedOrigin(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
    "Cache-Control": "no-store"
  };
}

Deno.serve((req) => {
  const headers = { ...cors(req), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  }

  const origin = req.headers.get("origin") || "";
  if (origin && !isAllowedOrigin(origin)) {
    return new Response(JSON.stringify({ error: "origin_not_allowed" }), { status: 403, headers });
  }

  if (Deno.env.get("COLLECTABLES_PUBLIC_BUSINESS_INFO_ENABLED") !== "true") {
    return new Response(JSON.stringify({ error: "business_info_unavailable" }), { status: 503, headers });
  }

  const sellerName = Deno.env.get("COLLECTABLES_SELLER_NAME")?.trim() || "";
  const sellerAddress = Deno.env.get("COLLECTABLES_SELLER_ADDRESS")?.trim() || "";
  const contactEmail = Deno.env.get("COLLECTABLES_CONTACT_EMAIL")?.trim() || "";
  if (!sellerName || !sellerAddress || !contactEmail) {
    return new Response(JSON.stringify({ error: "business_info_incomplete" }), { status: 503, headers });
  }

  return new Response(JSON.stringify({
    seller_name: sellerName,
    seller_address: sellerAddress,
    contact_email: contactEmail
  }), { status: 200, headers });
});
