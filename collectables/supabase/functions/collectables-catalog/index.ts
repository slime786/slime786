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

Deno.serve(async (req) => {
  const headers = { ...cors(req, "GET, OPTIONS"), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "GET") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });

  const origin = req.headers.get("origin") || "";
  if (origin && !isAllowedOrigin(origin)) {
    return new Response(JSON.stringify({ error: "origin_not_allowed" }), { status: 403, headers });
  }

  try {
    const supabase = adminClient();
    await supabase.rpc("collectables_expire_reservations");
    const { data, error } = await supabase.rpc("collectables_catalog");
    if (error) throw error;
    return new Response(JSON.stringify({ products: data || [] }), { status: 200, headers });
  } catch {
    return new Response(JSON.stringify({ error: "catalog_unavailable" }), { status: 500, headers });
  }
});