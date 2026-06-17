// delete-user — admin-only user lifecycle: deactivate / reactivate / delete.
// Mirrors onboard-* (service-role client + admin-bearer authz + CORS allowlist).
//
//   action "deactivate" → ban the auth user (revokes login) + stamp
//                         profiles.disabled_at; experts also get writers.active=false.
//                         Reversible. All data preserved.
//   action "reactivate" → lift the ban + clear disabled_at (+ writers.active=true).
//   action "delete"     → PERMANENT. Blocked when the user still has active work
//                         (non-closed orders, or — for clients — open invoices).
//                         Otherwise: experts' writers row is removed first
//                         (orders.writer_id → null), then the auth.users row is
//                         deleted, which cascades the profile (→ that client's
//                         invoices + payment_links; orders.client_id → null).
//
// Deploy: supabase functions deploy delete-user

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED = new Set([
  "https://primemeridian.academy",
  "https://www.primemeridian.academy",
  "http://localhost:5173",
  "http://localhost:4173",
]);
function cors(origin: string | null) {
  const allow = origin && ALLOWED.has(origin) ? origin : "https://primemeridian.academy";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const ACTIVE_STATUSES = ["new", "brief_received", "assigned", "writing", "in_review", "revision"];
const BAN_DURATION = "876000h"; // ~100 years — effectively permanent until reactivated

function json(status: number, obj: unknown, cors: Record<string, string>) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "content-type": "application/json" } });
}

Deno.serve(async (req) => {
  const CORS = cors(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" }, CORS);

  // ── admin-only ──────────────────────────────────────────────────────────
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!bearer) return json(403, { error: "forbidden" }, CORS);
  const { data: { user } } = await admin.auth.getUser(bearer);
  if (!user) return json(403, { error: "forbidden" }, CORS);
  const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return json(403, { error: "forbidden" }, CORS);

  let body: { user_id?: string; role?: string; action?: string; orders_mode?: string };
  try { body = await req.json(); } catch { return json(400, { error: "bad_json" }, CORS); }
  const userId = (body.user_id ?? "").trim();
  const role = body.role === "expert" ? "expert" : "client";
  const action = body.action ?? "";
  const ordersMode = body.orders_mode === "archive" || body.orders_mode === "purge" ? body.orders_mode : null;
  if (!userId) return json(400, { error: "bad_request" }, CORS);
  if (userId === user.id) return json(400, { error: "cannot_target_self" }, CORS);
  if (!["deactivate", "reactivate", "delete"].includes(action)) return json(400, { error: "bad_action" }, CORS);

  // Resolve the profile (+ writer row for experts).
  const { data: profile } = await admin.from("profiles").select("id, role").eq("id", userId).single();
  if (!profile) return json(404, { error: "not_found" }, CORS);
  let writerId: string | null = null;
  if (role === "expert") {
    const { data: w } = await admin.from("writers").select("id").eq("profile_id", userId).maybeSingle();
    writerId = w?.id ?? null;
  }

  try {
    if (action === "deactivate") {
      await admin.auth.admin.updateUserById(userId, { ban_duration: BAN_DURATION });
      await admin.from("profiles").update({ disabled_at: new Date().toISOString() }).eq("id", userId);
      if (writerId) await admin.from("writers").update({ active: false }).eq("id", writerId);
      return json(200, { ok: true, action }, CORS);
    }

    if (action === "reactivate") {
      await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
      await admin.from("profiles").update({ disabled_at: null }).eq("id", userId);
      if (writerId) await admin.from("writers").update({ active: true }).eq("id", writerId);
      return json(200, { ok: true, action }, CORS);
    }

    // ── delete (permanent) ───────────────────────────────────────────────
    if (role === "expert") {
      // An expert's assignments belong to clients — they are never deleted here.
      // Removing the writers row sets orders.writer_id → null (back to the pool),
      // so deleting an expert never dead-ends. Report how many were unassigned.
      let unassigned = 0;
      if (writerId) {
        const { count } = await admin.from("orders").select("id", { count: "exact", head: true })
          .eq("writer_id", writerId).in("status", ACTIVE_STATUSES);
        unassigned = count ?? 0;
        const { error: wErr } = await admin.from("writers").delete().eq("id", writerId);
        if (wErr) return json(500, { error: "writer_delete_failed", detail: wErr.message }, CORS);
      }
      const { error: dErr } = await admin.auth.admin.deleteUser(userId);
      if (dErr) return json(500, { error: "auth_delete_failed", detail: dErr.message }, CORS);
      return json(200, { ok: true, action: "delete", unassigned }, CORS);
    }

    // Client: guard on open work unless the admin chose how to handle the orders.
    const { count: oc } = await admin.from("orders").select("id", { count: "exact", head: true })
      .eq("client_id", userId).in("status", ACTIVE_STATUSES);
    const activeOrders = oc ?? 0;
    const { count: ic } = await admin.from("invoices").select("id", { count: "exact", head: true })
      .eq("client_id", userId).neq("status", "paid");
    const openInvoices = ic ?? 0;
    if ((activeOrders > 0 || openInvoices > 0) && !ordersMode) {
      return json(409, { error: "active_work", activeOrders, openInvoices }, CORS);
    }

    if (ordersMode === "purge") {
      // Remove the client's orders entirely (cascades parts/files/messages/invoices).
      const { error: oErr } = await admin.from("orders").delete().eq("client_id", userId);
      if (oErr) return json(500, { error: "orders_purge_failed", detail: oErr.message }, CORS);
    } else if (ordersMode === "archive") {
      // Preserve the orders but drop them from active views (client_id is nulled by
      // the account cascade below; archived_at keeps them out of every list).
      const { error: aErr } = await admin.from("orders").update({ archived_at: new Date().toISOString() }).eq("client_id", userId);
      if (aErr) return json(500, { error: "orders_archive_failed", detail: aErr.message }, CORS);
    }
    // Deleting the auth user cascades the profile (→ remaining invoices/payment_links; orders.client_id → null).
    const { error: dErr } = await admin.auth.admin.deleteUser(userId);
    if (dErr) return json(500, { error: "auth_delete_failed", detail: dErr.message }, CORS);
    return json(200, { ok: true, action: "delete", orders_mode: ordersMode }, CORS);
  } catch (e) {
    return json(500, { error: "failed", detail: String(e) }, CORS);
  }
});
