// admin-reset — send a password-reset link ONLY to emails registered as admin.
//
// Why this shape:
//  1) Gating — an anon client can't read other users' profiles (RLS), so the
//     "is this an admin?" check runs with the service role here.
//  2) Reliability — we mint the link with admin.generateLink(), which produces a
//     NON-PKCE recovery link. A server-side PKCE reset is fundamentally broken: the
//     code_verifier would live in this function, not the user's browser, so the
//     browser could never finish the exchange and the link just bounced to login.
//     generateLink's action_link verifies server-side and returns an implicit
//     session in the URL, so it opens the reset page in ANY browser.
//  3) Delivery — emailed directly via Resend (same sender the app already uses).
//
// Deploy: supabase functions deploy admin-reset

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
const RECOVERY_REDIRECT = "https://primemeridian.academy/admin?type=recovery";

function emailHtml(resetUrl: string) {
  return `<!doctype html><html><body style="margin:0;background:#F4F1EA;font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EA;padding:30px 12px;"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#FBFAF7;border:1px solid #E4DCCF;border-radius:16px;overflow:hidden;">
      <tr><td style="background:#211A14;padding:20px 30px;color:#fff;font-family:Georgia,serif;font-size:20px;">Meridian Studio
        <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(246,241,233,.6);margin-top:4px;">Admin access</div></td></tr>
      <tr><td style="padding:36px 36px 8px;">
        <div style="font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#BD5A33;font-weight:700;margin-bottom:14px;">Password reset</div>
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:500;font-size:30px;line-height:1.12;color:#211A14;">Reset your password.</h1>
        <p style="font-size:15px;line-height:1.65;color:#4A4036;margin:16px 0;">We received a request to reset the password for your Meridian <b>admin</b> account. Tap below to choose a new one — it opens the admin panel's set-password screen, and the link expires within the hour.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 4px;"><tr><td style="background:#BD5A33;border-radius:999px;">
          <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">Set a new password &rarr;</a></td></tr></table>
        <p style="font-family:Georgia,serif;font-style:italic;font-size:14px;color:#6E6357;margin-top:14px;">Didn't request this? You can safely ignore this email — your account stays secure.</p>
      </td></tr>
      <tr><td style="padding:24px 36px 28px;border-top:1px solid #E4DCCF;font-size:12px;color:#938878;">Internal notification · Meridian Studio admin.</td></tr>
    </table>
  </td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  const CORS = cors(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" }, CORS);

  let body: { email?: string };
  try { body = await req.json(); } catch { return json(400, { error: "bad_json" }, CORS); }
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !/.+@.+\..+/.test(email)) return json(400, { error: "missing_email" }, CORS);

  // Only admins may receive an admin-panel reset link.
  const { data: prof } = await admin
    .from("profiles")
    .select("id, role")
    .ilike("email", email)
    .limit(1);
  const isAdmin = Array.isArray(prof) && prof[0]?.role === "admin";
  if (!isAdmin) return json(200, { ok: true, sent: false, notAdmin: true }, CORS);

  // Mint a non-PKCE recovery link.
  const { data: link, error: lErr } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: RECOVERY_REDIRECT },
  });
  const resetUrl = (link as any)?.properties?.action_link as string | undefined;
  if (lErr || !resetUrl) return json(200, { ok: true, sent: false, error: lErr?.message ?? "link_failed" }, CORS);

  if (!Deno.env.get("RESEND_API_KEY")) return json(200, { ok: true, sent: false, error: "missing_resend_key" }, CORS);

  const sent = await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Reset your Meridian admin password",
    html: emailHtml(resetUrl),
  });
  if (sent.error) return json(200, { ok: true, sent: false, error: sent.error.message }, CORS);
  return json(200, { ok: true, sent: true }, CORS);
});

function json(status: number, body: unknown, CORS: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}
