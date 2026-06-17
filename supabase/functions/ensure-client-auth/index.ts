// ensure-client-auth — give a brief submitter a workspace login (Deno).
//
// When a brief is submitted we create the client's auth account (email pre-confirmed)
// so they can sign in at /workspace immediately — no confirmation link needed, and no
// public unverified signups. The client may pass a password they chose; if none is
// supplied we generate a random temporary one (never a shared default) and, for a
// BRAND-NEW account, RETURN it as `tempPassword` so the owner can complete their first
// sign-in and then set their own password. We NEVER return a client-supplied password,
// and NEVER return any password for an already-existing account. Abuse is bounded: we
// only provision for an email that owns a freshly-created order.
//
// Deploy: supabase functions deploy ensure-client-auth

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

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Random fallback only — never a shared default.
function randomTemp() {
  const b = new Uint8Array(8); crypto.getRandomValues(b);
  const a = "abcdefghijkmnpqrstuvwxyz23456789";
  return "Mrdn-" + Array.from(b).map((x) => a[x % a.length]).join("");
}

// Find an existing auth user id by email (paginated, case-insensitive).
async function findUserId(email: string): Promise<string | null> {
  let page = 1;
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

// Link THIS verified order to the owning account immediately, so it shows up in
// the client workspace without depending on a later claim_my_orders() call. Only
// touches the single order we already verified (by ref) and only if still unlinked.
async function linkOrder(ref: string, uid: string) {
  try { await db.from("orders").update({ client_id: uid }).eq("ref", ref).is("client_id", null); }
  catch (_e) { /* best-effort — never block account provisioning */ }
}

Deno.serve(async (req) => {
  const CORS = cors(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" }, CORS);

  let body: { email?: string; ref?: string; password?: string; name?: string };
  try { body = await req.json(); } catch { return json(400, { error: "bad_json" }, CORS); }
  const email = (body.email ?? "").trim().toLowerCase();
  const ref = (body.ref ?? "").trim();
  // The client MAY pass a password they chose during the brief flow. If they don't,
  // we generate a temporary one — and, only in that case and only for a brand-new
  // account, we return it below so the owner can complete first sign-in.
  const suppliedPassword = (body.password ?? "").trim();
  const generatedTemp = suppliedPassword ? "" : randomTemp();
  const password = suppliedPassword || generatedTemp;
  const name = (body.name ?? "").trim();
  if (!email || !/.+@.+\..+/.test(email) || !ref) return json(400, { error: "missing_fields" }, CORS);

  // The email must own a recently-created order (the brief just made one).
  const { data: order } = await db.from("orders").select("created_at, client_email").eq("ref", ref).single();
  if (!order) return json(404, { error: "order_not_found" }, CORS);
  if ((order.client_email ?? "").toLowerCase() !== email) return json(403, { error: "email_mismatch" }, CORS);
  const ageMs = Date.now() - new Date(order.created_at as string).getTime();
  if (ageMs > 1000 * 60 * 60 * 6) return json(403, { error: "order_too_old" }, CORS);

  // Pre-confirmed account (no email link needed) with the user's chosen password
  // and name. If the email already has an account we leave it untouched and report
  // `created: false` so the client knows NOT to auto-sign-in with the entered
  // password (it may not match the existing account).
  const { data: created, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: name ? { name } : undefined,
  });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      // Returning client placing a new order: link the order to their existing
      // account now (they sign in with their own password), so it never goes
      // missing while they're signed out.
      const uid = await findUserId(email);
      if (uid) await linkOrder(ref, uid);
      return json(200, { ok: true, created: false }, CORS);
    }
    return json(400, { error: error.message }, CORS);
  }
  // New account — link the order to it immediately (belt-and-braces with the
  // client-side claim_my_orders() that runs on first workspace load).
  const uid = created?.user?.id ?? null;
  if (uid) await linkOrder(ref, uid);
  // Only when WE generated the temp password (the client supplied none) AND a new
  // account was actually created do we hand the password back, so the owner can
  // complete first sign-in. Never echo a client-supplied password.
  const isNew = !!created?.user;
  if (isNew && generatedTemp) {
    return json(200, { ok: true, created: true, tempPassword: generatedTemp }, CORS);
  }
  return json(200, { ok: true, created: isNew }, CORS);
});

function json(status: number, body: unknown, CORS: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}
