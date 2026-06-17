// send-recovery — cross-device password recovery for EVERY surface (client / expert / admin).
//
// Why this exists:
//   The project mints PKCE recovery tokens (token=pkce_...). A PKCE recovery link
//   can ONLY be completed in the same browser that requested it (the code_verifier
//   lives in that browser's localStorage). Open it on your phone / another browser
//   and it bounces to login. This breaks reset for basically everyone.
//
//   Fix: we DON'T email Supabase's pkce verify link. We call admin.generateLink to
//   mint a recovery token, then email a link to OUR OWN page:
//       https://primemeridian.academy/reset?token_hash=<hashed_token>&type=recovery&surface=<surface>
//   That page calls supabase.auth.verifyOtp({ token_hash, type:'recovery' }) — a
//   one-time, server-verifiable token that works in ANY browser/device, no PKCE.
//
// Deploy: supabase functions deploy send-recovery

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

const SITE = "https://primemeridian.academy";
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");
const FROM_STUDENT = Deno.env.get("EMAIL_FROM_STUDENT") ?? "Meridian Studio <hello@primemeridian.academy>";
const FROM_EXPERT = Deno.env.get("EMAIL_FROM_EXPERT") ?? "Meridian Studio <experts@primemeridian.academy>";
const FROM_SYSTEM = Deno.env.get("EMAIL_FROM_SYSTEM") ?? "Meridian System <system@primemeridian.academy>";

type Surface = "client" | "expert" | "admin";
const SURFACES: Record<Surface, { from: string; label: string; intro: string }> = {
  client: { from: FROM_STUDENT, label: "your Meridian account", intro: "We received a request to reset the password for your Meridian Studio account." },
  expert: { from: FROM_EXPERT,  label: "your expert account",   intro: "We received a request to reset the password for your Meridian expert account." },
  admin:  { from: FROM_SYSTEM,  label: "your admin account",    intro: "We received a request to reset the password for your Meridian admin account." },
};

function emailHtml(resetUrl: string, s: { label: string; intro: string }) {
  return `<!doctype html><html><body style="margin:0;background:#F1EBDD;font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1EBDD;padding:30px 12px;"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#FBF8F1;border:1px solid #E3DBC9;border-radius:16px;overflow:hidden;">
      <tr><td style="background:#211D17;padding:20px 30px;color:#fff;font-family:Georgia,serif;font-size:20px;">Meridian Studio</td></tr>
      <tr><td style="padding:36px 36px 8px;">
        <div style="font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#BD5A2C;font-weight:700;margin-bottom:14px;">Password reset</div>
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:500;font-size:30px;line-height:1.12;color:#211D17;">Reset your password.</h1>
        <p style="font-size:15px;line-height:1.65;color:#4A4036;margin:16px 0;">${s.intro} Tap the button to choose a new one. This link works on any device and expires within the hour.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 4px;"><tr><td style="background:#BD5A2C;border-radius:999px;">
          <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">Set a new password &rarr;</a></td></tr></table>
        <p style="font-size:12.5px;color:#756B5A;margin:18px 0 0;">Or paste this link into your browser:<br><span style="color:#3C6699;word-break:break-all;">${resetUrl}</span></p>
        <p style="font-family:Georgia,serif;font-style:italic;font-size:14px;color:#6E6357;margin-top:18px;">Didn't request this? You can safely ignore this email — ${s.label} stays secure.</p>
      </td></tr>
      <tr><td style="padding:24px 36px 28px;border-top:1px solid #E3DBC9;font-size:12px;color:#938878;">Meridian Studio · primemeridian.academy</td></tr>
    </table>
  </td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  const CORS = cors(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" }, CORS);

  let body: { email?: string; surface?: string };
  try { body = await req.json(); } catch { return json(400, { error: "bad_json" }, CORS); }
  const email = (body.email ?? "").trim().toLowerCase();
  const surface: Surface = (["client", "expert", "admin"].includes(body.surface ?? "") ? body.surface : "client") as Surface;
  if (!email || !/.+@.+\..+/.test(email)) return json(400, { error: "missing_email" }, CORS);

  // Admin resets are privileged — only send to accounts that are actually admins.
  if (surface === "admin") {
    const { data: prof } = await admin.from("profiles").select("role").ilike("email", email).limit(1);
    const isAdmin = Array.isArray(prof) && prof[0]?.role === "admin";
    if (!isAdmin) return json(200, { ok: true, sent: false, notAdmin: true }, CORS);
  }

  // Mint a recovery token. We use properties.hashed_token (NOT the pkce action_link).
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
  const hashedToken = (data as any)?.properties?.hashed_token as string | undefined;
  if (error || !hashedToken) {
    // Don't reveal whether the account exists (security) — respond as if sent.
    return json(200, { ok: true, sent: false }, CORS);
  }

  const resetUrl = `${SITE}/reset?token_hash=${encodeURIComponent(hashedToken)}&type=recovery&surface=${surface}`;
  const cfg = SURFACES[surface];

  if (!Deno.env.get("RESEND_API_KEY")) return json(200, { ok: true, sent: false, error: "missing_resend_key" }, CORS);
  // Always send from the proven, verified student sender — guarantees delivery for
  // every surface (avoids silent failures if experts@/system@ aren't DKIM-verified).
  const sent = await resend.emails.send({
    from: FROM_STUDENT,
    to: email,
    subject: "Reset your Meridian password",
    html: emailHtml(resetUrl, cfg),
  });
  if (sent.error) return json(200, { ok: true, sent: false, error: sent.error.message }, CORS);
  return json(200, { ok: true, sent: true }, CORS);
});

function json(status: number, body: unknown, CORS: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });
}
