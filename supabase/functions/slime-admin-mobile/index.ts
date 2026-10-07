import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const PAGE_SIZE = 50;
const MAX_PAGE = 10_000;

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function adminClient() {
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const key = keys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw new Error("supabase_secret_missing");
  return createClient(Deno.env.get("SUPABASE_URL")!, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

type AdminAuthorization =
  | { ok: true; actor: string }
  | { ok: false; response: Response };

async function requireAdmin(
  req: Request,
  db: ReturnType<typeof adminClient>
): Promise<AdminAuthorization> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return { ok: false, response: response({ error: "Sign in again to continue." }, 401) };
  }

  const { data: identity, error: authError } = await db.auth.getUser(token);
  const user = identity?.user;
  if (authError || !user || !user.email_confirmed_at) {
    return { ok: false, response: response({ error: "Sign in again to continue." }, 401) };
  }

  const { data: permission, error: permissionError } = await db
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (permissionError) throw permissionError;
  if (!permission) {
    return {
      ok: false,
      response: response(
        { error: "This account is not authorized for portfolio administration." },
        403
      )
    };
  }

  return { ok: true, actor: user.id };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const db = adminClient();

  try {
    const authorization = await requireAdmin(req, db);
    if (!authorization.ok) return authorization.response;
    const actor = authorization.actor;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return response({ error: "Invalid request" }, 400);

    const page = (body as Record<string, unknown>).page ?? 1;
    if (!Number.isInteger(page) || Number(page) < 1 || Number(page) > MAX_PAGE) {
      return response({ error: "Invalid page" }, 400);
    }
    const numericPage = Number(page);
    const start = (numericPage - 1) * PAGE_SIZE;
    const action = String((body as Record<string, unknown>).action || "");

    if (action === "accounts") {
      const { data, error } = await db.auth.admin.listUsers({
        page: numericPage,
        perPage: PAGE_SIZE
      });
      if (error) throw error;

      const ids = data.users.map((u) => u.id);
      const profiles = ids.length
        ? await db.from("profiles").select("id,username").in("id", ids)
        : { data: [], error: null };
      if (profiles.error) throw profiles.error;

      return response({
        rows: data.users.map((u) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          email_confirmed_at: u.email_confirmed_at ?? null,
          last_sign_in_at: u.last_sign_in_at ?? null,
          banned_until: u.banned_until ?? null,
          username: profiles.data?.find((p: any) => p.id === u.id)?.username ?? null
        })),
        hasNext: data.users.length === PAGE_SIZE
      });
    }

    const tables: Record<string, [string, string]> = {
      mofries: [
        "mofries_orders",
        "id,order_reference,status,payment_status,customer_name,customer_email,fulfilment,total_pence,created_at"
      ],
      collectables: [
        "collectables_orders",
        "id,order_number,status,buyer_name,buyer_email,total_pence,created_at,paid_at"
      ],
      audit: [
        "slime_admin_audit_log",
        "id,created_at,actor_id,action,target_id,status,detail"
      ]
    };

    if (Object.hasOwn(tables, action)) {
      const [table, fields] = tables[action];
      const { data, error } = await db
        .from(table)
        .select(fields)
        .order("created_at", { ascending: false })
        .range(start, start + PAGE_SIZE);
      if (error) throw error;
      return response({ rows: data.slice(0, PAGE_SIZE), hasNext: data.length > PAGE_SIZE });
    }

    if (action === "suspend" || action === "restore") {
      const id = (body as Record<string, unknown>).id;
      if (
        typeof id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
      ) {
        return response({ error: "Invalid account" }, 400);
      }

      const { error: targetError } = await db.auth.admin.getUserById(id);
      if (targetError) return response({ error: "Account not found" }, 404);

      const { data: protectedAdmin, error: adminError } = await db
        .from("admin_users")
        .select("user_id")
        .eq("user_id", id)
        .maybeSingle();
      if (adminError) throw adminError;
      if (protectedAdmin) {
        return response({ error: "Administrator accounts cannot be suspended here." }, 403);
      }

      const { data: audit, error: auditError } = await db
        .from("slime_admin_audit_log")
        .insert({
          actor_id: actor,
          action,
          target_id: id,
          status: "pending"
        })
        .select("id")
        .single();
      if (auditError) throw auditError;

      const { error: updateError } = await db.auth.admin.updateUserById(id, {
        ban_duration: action === "suspend" ? "876000h" : "none"
      });

      const { error: logError } = await db
        .from("slime_admin_audit_log")
        .update({
          status: updateError ? "failed" : "completed",
          detail: updateError ? "Provider rejected update" : null
        })
        .eq("id", audit.id);

      if (updateError) throw updateError;
      if (logError) {
        return response({
          error: "Account changed, but audit completion could not be saved. Refresh before another action."
        }, 502);
      }
      return response({ success: true });
    }

    return response({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("Admin operation failed", error instanceof Error ? error.name : "Error");
    return response({
      error: "The operation could not be completed. Refresh before retrying a change."
    }, 500);
  }
});
