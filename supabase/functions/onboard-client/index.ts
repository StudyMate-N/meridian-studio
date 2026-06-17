// onboard-client — admin adds a client and emails them their temporary login.
// Mirrors onboard-expert but keeps the role as `client` (no writers row). The temp
// password is generated here and only ever leaves in the email.
//
// Deploy: supabase functions deploy onboard-client

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
const FROM = Deno.env.get("EMAIL_FROM_STUDENT") ?? "Meridian Studio <hello@primemeridian.academy>";

function tempPassword() {
  const b = new Uint8Array(8); crypto.getRandomValues(b);
  const a = "abcdefghijkmnpqrstuvwxyz23456789";
  return "Mrdn-" + Array.from(b).map((x) => a[x % a.length]).join("");
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
        <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(246,241,233,.6);margin-top:4px;">Your workspace</div></td></tr>
      <tr><td style="padding:36px 36px 8px;">
        <div style="font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#BD5A33;font-weight:700;margin-bottom:14px;">Welcome</div>
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:500;font-size:30px;line-height:1.12;color:#211A14;">Welcome to Meridian${firstName ? ", " + firstName : ""}.</h1>
        <p style="font-size:15px;line-height:1.65;color:#4A4036;margin:16px 0;">Your account is ready. Sign in to upload a brief, track every order, message your expert, and download your completed work. Here are your temporary login details — set your own password once you're in.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;background:#F4F1EA;border:1px solid #E4DCCF;border-radius:12px;"><tr><td style="padding:6px 18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cred("Email", email)}${cred("Temporary password", password)}</table>
        </td></tr></table>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 4px;"><tr><td style="background:#BD5A33;border-radius:999px;">
          <a href="https://primemeridian.academy/workspace" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">Sign in to your workspace &rarr;</a></td></tr></table>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;"><tr><td style="border:1.5px solid #E4DCCF;border-radius:999px;">
          <a href="https://primemeridian.academy/workspace" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#211A14;text-decoration:none;border-radius:999px;">Upload your first brief</a></td></tr></table>
        <p style="font-family:Georgia,serif;font-style:italic;font-size:14px;color:#6E6357;margin-top:14px;">For your security, change this password from your profile after you sign in.</p>
      </td></tr>
      <tr><td style="padding:24px 36px 28px;border-top:1px solid #E4DCCF;font-size:12px;color:#938878;">Meridian Studio — confidential academic support.</td></tr>
    </table>
  </td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  const CORS = cors(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" }, CORS);

  // Admin-only.
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!bearer) return json(403, { error: "forbidden" }, CORS);
  const { data: { user } } = await admin.auth.getUser(bearer);
  if (!user) return json(403, { error: "forbidden" }, CORS);
  const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return json(403, { error: "forbidden" }, CORS);

  let body: { email?: string; name?: string; school?: string; program?: string; client_type?: string; sendEmail?: boolean };
  try { body = await req.json(); } catch { return json(400, { error: "bad_json" }, CORS); }
  const email = (body.email ?? "").trim().toLowerCase();
  const name = (body.name ?? "").trim();
  const school = (body.school ?? "").trim();
  const program = (body.program ?? "").trim();
  const client_type = body.client_type === "custom" || body.client_type === "general" ? body.client_type : "";
  const sendEmail = body.sendEmail !== false;
  if (!email || !/.+@.+\..+/.test(email)) return json(400, { error: "bad_email" }, CORS);

  const password = tempPassword();
  // Stamp provenance so a later delivery email can hand a never-signed-in,
  // portal-added client their login automatically (consumed on first delivery).
  const meta: Record<string, unknown> = { onboarded_by_admin: true };
  if (name) meta.name = name;
  let existed = false;
  const { error: cErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: meta,
  });
  if (cErr) {
    if (!/already|registered|exists/i.test(cErr.message)) return json(400, { error: cErr.message }, CORS);
    existed = true;
    const uid = await findUserId(email);
    if (uid) await admin.auth.admin.updateUserById(uid, { password, email_confirm: true, user_metadata: meta });
  }
  // Ensure a profile exists with name/email (role stays 'client'). Only set the
  // optional fields when provided, so blanks never clobber existing values.
  const { data: prof } = await admin.from("profiles").select("id, role").ilike("email", email).maybeSingle();
  if (prof) {
    await admin.from("profiles").update({
      ...(name ? { name } : {}),
      ...(school ? { school } : {}),
      ...(program ? { program } : {}),
      ...(client_type ? { client_type } : {}),
      email,
    }).eq("id", prof.id);
  }

  // Honor the admin's "skip email" choice: account + profile are still ensured.
  if (!sendEmail) return json(200, { ok: true, existed, emailed: false, created: true }, CORS);

  if (!Deno.env.get("RESEND_API_KEY")) return json(200, { ok: true, existed, emailed: false, error: "missing_resend_key" }, CORS);
  const sent = await resend.emails.send({
    from: FROM, to: email, subject: "Your Meridian workspace login",
    html: emailHtml(name.split(" ")[0] || "", email, password),
  });
  return json(200, { ok: true, existed, emailed: !sent.error, emailError: sent.error?.message ?? null }, CORS);
});

function json(status: number, body: unknown, CORS: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });
}
