// onboard-expert — provision a writer's workspace account and email them their
// temporary login. Admin-only.
//
// Does it all server-side so the temp password is generated here and only ever
// leaves in the email (never returned to the client):
//   1. generate a unique temporary password
//   2. ensure a writers row exists (insert from the application details)
//   3. create the auth account with that password (or reset it if they exist),
//      email pre-confirmed so they can sign in immediately
//   4. link the profile → writer role
//   5. email the expert their sign-in link + email + temp password (Resend)
//
// Deploy: supabase functions deploy onboard-expert

import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend";

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
const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");
const FROM = Deno.env.get("EMAIL_FROM_EXPERT") ?? "Meridian Studio <experts@primemeridian.academy>";

// Readable temp password, e.g. "Mrdn-k3p9qm2x" (no ambiguous chars).
function tempPassword() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const a = "abcdefghijkmnpqrstuvwxyz23456789";
  return "Mrdn-" + Array.from(bytes).map((b) => a[b % a.length]).join("");
}

async function findUserId(email: string): Promise<string | null> {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

function emailHtml(firstName: string, email: string, password: string) {
  const cred = (label: string, value: string) =>
    `<tr><td style="padding:8px 0;font-size:13px;color:#6E6357;border-bottom:1px solid #E4DCCF;">${label}</td>`
    + `<td align="right" style="padding:8px 0;font-family:'Spline Sans Mono',monospace;font-size:14px;font-weight:700;color:#211A14;border-bottom:1px solid #E4DCCF;">${value}</td></tr>`;
  return `<!doctype html><html><body style="margin:0;background:#F4F1EA;font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EA;padding:30px 12px;"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#FBFAF7;border:1px solid #E4DCCF;border-radius:16px;overflow:hidden;">
      <tr><td style="background:#211A14;padding:20px 30px;color:#fff;font-family:Georgia,serif;font-size:20px;">Meridian Studio
        <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(246,241,233,.6);margin-top:4px;">For experts</div></td></tr>
      <tr><td style="padding:36px 36px 8px;">
        <div style="font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#BD5A33;font-weight:700;margin-bottom:14px;">You're in</div>
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:500;font-size:30px;line-height:1.12;color:#211A14;">Welcome to the team${firstName ? ", " + firstName : ""}.</h1>
        <p style="font-size:15px;line-height:1.65;color:#4A4036;margin:16px 0;">Your application has been approved and your Meridian expert workspace is ready. Here are your temporary login details — you'll be prompted to set your own password on first sign-in.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;background:#F4F1EA;border:1px solid #E4DCCF;border-radius:12px;"><tr><td style="padding:6px 18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cred("Email", email)}${cred("Temporary password", password)}</table>
        </td></tr></table>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 4px;"><tr><td style="background:#BD5A33;border-radius:999px;">
          <a href="https://primemeridian.academy/expert" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">Sign in to your workspace &rarr;</a></td></tr></table>
        <p style="font-family:Georgia,serif;font-style:italic;font-size:14px;color:#6E6357;margin-top:14px;">For your security, change this password from your profile right after you sign in. Then add your specialties and payout details so we can match you with the right work.</p>
      </td></tr>
      <tr><td style="padding:24px 36px 28px;border-top:1px solid #E4DCCF;font-size:12px;color:#938878;">You're receiving this as a newly-approved Meridian expert. Student identities are always anonymized.</td></tr>
    </table>
  </td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  const CORS = cors(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" }, CORS);

  try {
  // Admin-only.
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!bearer) return json(403, { error: "forbidden" }, CORS);
  const { data: { user } } = await admin.auth.getUser(bearer);
  if (!user) return json(403, { error: "forbidden" }, CORS);
  const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return json(403, { error: "forbidden" }, CORS);

  let body: { email?: string; name?: string; specialty?: string; mpesa_number?: string; sendEmail?: boolean };
  try { body = await req.json(); } catch { return json(400, { error: "bad_json" }, CORS); }
  const email = (body.email ?? "").trim().toLowerCase();
  const name = (body.name ?? "").trim();
  const specialty = (body.specialty ?? "").trim() || null;
  const mpesa_number = (body.mpesa_number ?? "").trim();
  const sendEmail = body.sendEmail !== false;
  if (!email || !/.+@.+\..+/.test(email)) return json(400, { error: "bad_email" }, CORS);

  const password = tempPassword();

  // 1) Ensure a writers row exists (so the link trigger fires on account create).
  //    Set mpesa_number on insert when provided; for an existing row, only fill it
  //    in when given so we never clobber a stored number with a blank.
  const { data: existingW } = await admin.from("writers").select("id").ilike("email", email).limit(1);
  if (!existingW?.length) {
    const { error: wErr } = await admin.from("writers").insert({ name: name || email, email, specialty, active: true, ...(mpesa_number ? { mpesa_number } : {}) });
    if (wErr) return json(400, { error: "writer_insert_failed", detail: wErr.message }, CORS);
  } else if (mpesa_number) {
    await admin.from("writers").update({ mpesa_number }).ilike("email", email);
  }

  // 2) Create the auth account (or reset its password if they already have one).
  let existed = false;
  const { error: cErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: name ? { name } : undefined,
  });
  if (cErr) {
    if (!/already|registered|exists/i.test(cErr.message || "")) {
      return json(400, {
        error: "create_user_failed",
        message: cErr.message || null,
        status: (cErr as { status?: number }).status ?? null,
        code: (cErr as { code?: string }).code ?? null,
        name: cErr.name || null,
        raw: JSON.stringify(cErr, Object.getOwnPropertyNames(cErr)),
      }, CORS);
    }
    existed = true;
    const uid = await findUserId(email);
    if (uid) await admin.auth.admin.updateUserById(uid, { password, email_confirm: true });
  }

  // 3) Make sure the profile is linked to the writers row + has the writer role.
  const { data: prof } = await admin.from("profiles").select("id, role").ilike("email", email).maybeSingle();
  if (prof) {
    await admin.from("writers").update({ profile_id: prof.id }).ilike("email", email);
    if (prof.role !== "admin") await admin.from("profiles").update({ role: "writer" }).eq("id", prof.id);
  }

  // 4) Email the temporary login (unless the admin opted to skip it; the account
  //    + writers/profile link are already in place either way).
  if (!sendEmail) return json(200, { ok: true, existed, emailed: false, created: true }, CORS);
  if (!Deno.env.get("RESEND_API_KEY")) return json(200, { ok: true, existed, emailed: false, error: "missing_resend_key" }, CORS);
  // The account + writer/profile link are already in place. An email failure must
  // NEVER crash the onboard — report it and still return ok so the admin can re-send.
  let emailed = false; let emailError: string | null = null;
  try {
    const sent = await resend.emails.send({
      from: FROM, to: email,
      subject: "Your Meridian expert login",
      html: emailHtml(name.split(" ")[0] || "", email, password),
    });
    emailed = !sent.error; emailError = sent.error?.message ?? null;
  } catch (e) { emailError = (e as Error)?.message ?? "send_failed"; }
  return json(200, { ok: true, existed, emailed, emailError }, CORS);
  } catch (e) {
    // Any unhandled error → CORS-readable JSON (never an opaque 500 the browser blocks).
    return json(500, { error: "server_error", detail: String((e as Error)?.message ?? e) }, CORS);
  }
});

function json(status: number, body: unknown, CORS: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });
}
