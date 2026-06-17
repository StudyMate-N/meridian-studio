// send-email — Meridian transactional email sender (Supabase Edge Function, Deno).
// One function, switch on event_id. Renders a template (templates.ts), respects the
// per-event + master switches, is idempotent (dedupe_key), and logs every send.
//
// Deploy:  supabase functions deploy send-email
// Secrets: supabase secrets set RESEND_API_KEY=re_... \
//            EMAIL_FROM_STUDENT="Meridian Studio <hello@primemeridian.academy>" \
//            EMAIL_FROM_EXPERT="Meridian Studio <experts@primemeridian.academy>" \
//            EMAIL_FROM_SYSTEM="Meridian System <system@primemeridian.academy>" \
//            ADMIN_ALERT_TO=ops@primemeridian.academy
//
// Triggers call it server-side with the service-role bearer (see migration 012).
// The Admin console's "Send test" calls it with the operator's session token and
// a `test_to` address (forces delivery, ignores switches + dedupe).

import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend";
import { TEMPLATES } from "./templates.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");
const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const FROM: Record<string, string> = {
  student: Deno.env.get("EMAIL_FROM_STUDENT") ?? "Meridian Studio <hello@primemeridian.academy>",
  expert:  Deno.env.get("EMAIL_FROM_EXPERT")  ?? "Meridian Studio <experts@primemeridian.academy>",
  system:  Deno.env.get("EMAIL_FROM_SYSTEM")  ?? "Meridian System <system@primemeridian.academy>",
};

// Same temp-password recipe as onboard-client (Mrdn- + 8 unambiguous chars). The
// password is generated server-side, lives only in the delivery email, never stored.
function tempPassword(): string {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  const a = "abcdefghijkmnpqrstuvwxyz23456789";
  return "Mrdn-" + Array.from(b).map((x) => a[x % a.length]).join("");
}

// Look up a full auth user by email (paginated). Returns null if not found.
async function findUser(email: string) {
  let page = 1;
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

// Decode the `role` claim from a JWT without verifying signature (used only to
// fast-path the service-role bearer that DB triggers send; admin users are
// verified properly via auth.getUser below).
function jwtRole(token: string): string | null {
  try {
    const p = token.split(".")[1];
    if (!p) return null;
    const b64 = p.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(p.length / 4) * 4, "=");
    return (JSON.parse(atob(b64)).role as string) ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  // ── Caller authorization ──────────────────────────────────────────────────
  // Only (a) the service-role bearer used by DB triggers, or (b) a signed-in
  // admin (the console "Send test") may send mail. This closes the open relay.
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  let authorized = jwtRole(bearer) === "service_role";
  if (!authorized && bearer) {
    const { data: { user } } = await db.auth.getUser(bearer);
    if (user) {
      const { data: prof } = await db.from("profiles").select("role").eq("id", user.id).single();
      authorized = prof?.role === "admin";
    }
  }
  if (!authorized) return json(403, { error: "forbidden" });

  let payload: { event_id?: string; data?: Record<string, unknown>; test_to?: string };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "bad_json" });
  }

  const { event_id, data = {}, test_to } = payload;
  if (!event_id) return json(400, { error: "missing event_id" });
  const tpl = TEMPLATES[event_id];
  if (!tpl) return json(400, { error: "unknown event_id" });

  // 1. respect switches (auth + onboarding emails always send)
  const ALWAYS_SEND = new Set(["magiclink", "admin_password_reset", "writer_welcome", "revision_requested"]);
  if (!ALWAYS_SEND.has(event_id) && !test_to) {
    const [{ data: cfg }, { data: row }] = await Promise.all([
      db.from("email_config").select("sending_on").eq("id", 1).single(),
      db.from("email_settings").select("enabled").eq("event_id", event_id).single(),
    ]);
    if (cfg && !cfg.sending_on) return json(200, { skipped: "sending_off" });
    if (row && !row.enabled)    return json(200, { skipped: "event_disabled" });
  }

  // 2. idempotency
  const dedupe = tpl.dedupeKey ? tpl.dedupeKey(data) : null;
  if (dedupe && !test_to) {
    const { data: dup } = await db.from("email_log").select("id").eq("dedupe_key", dedupe).maybeSingle();
    if (dup) return json(200, { skipped: "already_sent" });
  }

  // 2.5 delivery credentials — when the work is delivered to a client who was added
  // via the admin portal and has NEVER signed in, mint a fresh temporary password
  // and surface their login right in the delivery email (so they can access the
  // workspace without separate onboarding). The flag is consumed on first use so we
  // don't keep resetting the password on later deliveries.
  if (event_id === "delivered") {
    try {
      const email = String(data.to ?? "").trim().toLowerCase();
      if (email) {
        const u = await findUser(email);
        const meta = (u?.user_metadata ?? {}) as Record<string, unknown>;
        if (u && !u.last_sign_in_at && meta.onboarded_by_admin === true) {
          const pw = tempPassword();
          await db.auth.admin.updateUserById(u.id, {
            password: pw, email_confirm: true,
            user_metadata: { ...meta, onboarded_by_admin: false },
          });
          (data as Record<string, unknown>).login_email = u.email ?? email;
          (data as Record<string, unknown>).temp_password = pw;
        }
      }
    } catch (_e) { /* never block a delivery on a credential hiccup */ }
  }

  // 2.6 delivered file list — the actual documents are RESERVED FOR THE WORKSPACE
  // and are NOT attached to the email. We pass their names so the email can show
  // what's ready and link the client to their workspace to download.
  if (event_id === "delivered" && data.order_id) {
    try {
      const { data: files } = await db.from("order_files")
        .select("file_name, kind, created_at")
        .eq("order_id", String(data.order_id))
        .in("kind", ["final", "ai_report", "plag_report"])
        .order("created_at", { ascending: false });
      const seen = new Set<string>();
      const picks = (files ?? []).filter((f) => (seen.has(f.kind) ? false : (seen.add(f.kind), true)));
      (data as Record<string, unknown>).files = picks.map((f) => ({ name: f.file_name, kind: f.kind }));
    } catch (_e) { /* best-effort file list */ }
  }

  // 3. render + send
  const subject = tpl.subject(data);
  const html = tpl.html(data);
  const to = test_to ?? tpl.recipient(data);
  if (!to) return json(200, { skipped: "no_recipient" });
  const from = FROM[tpl.audience];

  if (!Deno.env.get("RESEND_API_KEY")) {
    return json(500, { error: "missing RESEND_API_KEY" });
  }

  // The delivered email no longer carries attachments — the completed documents are
  // reserved for the workspace; the email lists what's ready and links the client
  // there to download (with login credentials for portal-added new clients).
  const sent = await resend.emails.send({ from, to, subject, html });

  // 4. log (no dedupe row for tests)
  await db.from("email_log").insert({
    event_id, to_addr: to, subject,
    order_id: (data.order_id as string) ?? null,
    provider_id: sent.data?.id ?? null,
    status: sent.error ? "failed" : "sent",
    dedupe_key: test_to ? null : dedupe,
    error: sent.error?.message ?? null,
  });

  return sent.error
    ? json(502, { error: sent.error.message })
    : json(200, { id: sent.data?.id });
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}
