// payments — invoice payment flow (Deno edge function).
// Actions:
//   set_method   — save the client's default payment method (never shown in UI).
//   send_details — DIRECT: email payment details immediately (60s cooldown).
//                  INDIRECT (wise/payoneer): email the client a holding note +
//                  alert the admin to generate a platform link.
//   submit_link  — ADMIN pastes a Wise/Payoneer link → emailed to the client.
//   declare      — client declares they've sent payment (also re-declare from flagged).
//   confirm      — admin confirms receipt → invoice paid, order synced, client emailed.
//   flag         — admin flags a declaration → client emailed with optional note.
//   send_welcome — ADMIN sends a new client a magic-link welcome (first delivery).
//
// Deploy: supabase functions deploy payments --project-ref nwgwlznqghwgvhgbwtpr

import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend";
import { PAYMENT_DETAILS, isIndirect, methodLabel as labelOf, type PaymentMethod } from "./paymentDetails.ts";
import {
  DIRECT_PAYMENT_DETAILS_EMAIL, ADMIN_INDIRECT_PAYMENT_REQUIRED_EMAIL,
  CLIENT_PAYMENT_LINK_PENDING_EMAIL, INDIRECT_PAYMENT_LINK_EMAIL,
  ADMIN_PAYMENT_DECLARED_EMAIL, PAYMENT_CONFIRMED_EMAIL,
  CLIENT_PAYMENT_FLAGGED_EMAIL, NEW_CLIENT_WELCOME_EMAIL,
} from "./emailTemplates.ts";

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

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");
const FROM = Deno.env.get("EMAIL_FROM_STUDENT") ?? "Meridian Studio <hello@primemeridian.academy>";
const ADMIN_EMAIL = Deno.env.get("ADMIN_ALERT_TO") ?? "";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://primemeridian.academy";

const money = (n: unknown) => "$" + Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const when = (d: Date) => d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const fmtDate = (v: unknown) => { try { return new Date(v as string).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); } catch { return ""; } };
const first = (name?: string | null) => (name || "there").split(" ")[0];

// Build the email's payment-detail rows from the (server-only) PAYMENT_DETAILS.
function buildRows(method: string, d: Record<string, string>): { key: string; value: string }[] {
  const rows: { key: string; value: string }[] = [];
  const push = (k: string, v?: string) => { if (v) rows.push({ key: k, value: String(v) }); };
  switch (method) {
    case "sendwave":
    case "taptap":
      push("Recipient", d.recipientName); push("M-Pesa Number", d.mPesaNumber);
      push("Country", d.country); push("Delivery", d.delivery); push("Send From", d.sendFrom);
      break;
    case "westernUnion":
      push("Receiver", d.receiverName); push("Country", d.country); push("City", d.city);
      push("Deliver To", [d.deliverTo, d.mPesaNumber].filter(Boolean).join(" · "));
      push("Speed", d.speed); push("Currencies", d.currencies);
      break;
    case "skrill":
      push("Account Email", d.accountEmail); push("Account Name", d.accountName);
      push("How to Pay", d.howToPay); push("Speed", d.speed); push("Currencies", d.currencies);
      break;
    case "mpesa":
      push("Registered Name", d.registeredName); push("Phone Number", d.phoneNumber);
      push("Speed", d.speed); push("Currency", d.currency);
      break;
  }
  if (d.instruction) push("How", d.instruction);
  return rows;
}

async function send(to: string, tpl: { subject: string; htmlBody: string; textBody: string }) {
  return await resend.emails.send({ from: FROM, to, subject: tpl.subject, html: tpl.htmlBody, text: tpl.textBody });
}

Deno.serve(async (req) => {
  const CORS = cors(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" }, CORS);

  let body: { action?: string; invoice_id?: string; note?: string; method?: string; client_id?: string; payment_link_url?: string; expires_at?: string; force?: boolean };
  try { body = await req.json(); } catch { return json(400, { error: "bad_json" }, CORS); }
  const { action, invoice_id, note, method, client_id, payment_link_url, expires_at, force } = body;
  if (!action) return json(400, { error: "missing_action" }, CORS);

  // Caller identity (real verification via auth.getUser)
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!bearer) return json(403, { error: "forbidden" }, CORS);
  const { data: { user } } = await db.auth.getUser(bearer);
  if (!user) return json(403, { error: "forbidden" }, CORS);
  const { data: me } = await db.from("profiles").select("role, name, email, country, default_payment_method").eq("id", user.id).single();
  const isAdmin = me?.role === "admin";

  // ── CLIENT: set_method — save default payment method (no invoice needed) ────
  if (action === "set_method") {
    const m = String(method ?? "");
    if (!(m in PAYMENT_DETAILS)) return json(400, { error: "invalid_method" }, CORS);
    if (m === "mpesa" && (me?.country ?? "") !== "Kenya") {
      return json(400, { error: "mpesa_restricted", message: "M-Pesa is only available for Kenya-based clients. Please select a different method." }, CORS);
    }
    const { error } = await db.from("profiles").update({ default_payment_method: m }).eq("id", user.id);
    if (error) return json(502, { error: error.message }, CORS);
    return json(200, { ok: true, method: m, indirect: isIndirect(m) }, CORS);
  }

  // ── ADMIN: send_welcome — magic-link welcome for a new client (no invoice) ──
  if (action === "send_welcome") {
    if (!isAdmin) return json(403, { error: "forbidden" }, CORS);
    if (!client_id) return json(400, { error: "missing_client" }, CORS);
    const { data: client } = await db.from("profiles").select("name, email, welcome_sent").eq("id", client_id).single();
    if (!client?.email) return json(404, { error: "client_not_found" }, CORS);
    if (client.welcome_sent && !force) return json(409, { error: "already_sent", message: "Welcome email already sent to this client." }, CORS);
    const { data: link, error: linkErr } = await db.auth.admin.generateLink({
      type: "magiclink", email: client.email, options: { redirectTo: `${SITE_URL}/workspace` },
    });
    const magicLinkUrl = (link as { properties?: { action_link?: string } } | null)?.properties?.action_link;
    if (linkErr || !magicLinkUrl) return json(502, { error: "link_failed", message: linkErr?.message }, CORS);
    const tpl = NEW_CLIENT_WELCOME_EMAIL({ firstName: first(client.name), email: client.email, magicLinkUrl, portalUrl: `${SITE_URL}/workspace` });
    const sent = await send(client.email, tpl);
    if (sent.error) return json(502, { error: sent.error.message }, CORS);
    await db.from("profiles").update({ welcome_sent: true }).eq("id", client_id);
    return json(200, { ok: true }, CORS);
  }

  if (!invoice_id) return json(400, { error: "missing_fields" }, CORS);

  const { data: inv } = await db.from("invoices").select("*").eq("id", invoice_id).single();
  if (!inv) return json(404, { error: "invoice_not_found" }, CORS);
  const isOwner = inv.client_id === user.id;
  const { data: order } = await db.from("orders").select("id, ref, program, scope_label, client_name, client_email").eq("id", inv.order_id).maybeSingle();
  const subject = order?.program || order?.scope_label || "Order";
  const issued = fmtDate(inv.issued_date);

  // ── CLIENT: send_details — DIRECT details, or INDIRECT holding + admin alert ─
  if (action === "send_details") {
    if (!isOwner) return json(403, { error: "forbidden" }, CORS);
    if (inv.status === "paid") return json(400, { error: "already_paid" }, CORS);
    const m = (me?.default_payment_method ?? "") as PaymentMethod;
    const details = PAYMENT_DETAILS[m] as Record<string, string> | undefined;
    if (!details) return json(400, { error: "no_method", message: "Choose a payment method first." }, CORS);
    if (m === "mpesa" && (me?.country ?? "") !== "Kenya") {
      return json(400, { error: "mpesa_restricted", message: "M-Pesa is only available for Kenya-based clients. Please select a different method." }, CORS);
    }
    // 60s cooldown, enforced server-side (shared throttle for both flows)
    if (inv.details_sent_at && Date.now() - new Date(inv.details_sent_at).getTime() < 60_000) {
      const wait = Math.ceil((60_000 - (Date.now() - new Date(inv.details_sent_at).getTime())) / 1000);
      return json(429, { error: "cooldown", retry_in: wait }, CORS);
    }
    const label = labelOf(m);
    const to = me!.email || user.email!;
    const basePatch: Record<string, unknown> = {
      details_sent_at: new Date().toISOString(),
      details_sent_count: (inv.details_sent_count ?? 0) + 1,
      payment_method: m,
    };

    if (isIndirect(m)) {
      // Client holding email + admin "generate a link" alert.
      const clientTpl = CLIENT_PAYMENT_LINK_PENDING_EMAIL({ firstName: first(me?.name), invoiceNumber: inv.invoice_number, totalDue: money(inv.total_due), issuedDate: issued, methodLabel: label });
      const sent = await send(to, clientTpl);
      if (sent.error) return json(502, { error: sent.error.message }, CORS);
      if (ADMIN_EMAIL) {
        const adminTpl = ADMIN_INDIRECT_PAYMENT_REQUIRED_EMAIL({
          clientName: me?.name || to, clientEmail: to, invoiceNumber: inv.invoice_number,
          totalDue: money(inv.total_due), issuedDate: issued, methodLabel: label,
          orderSubject: subject, dashboardUrl: `${SITE_URL}/admin`,
        });
        try { await send(ADMIN_EMAIL, adminTpl); } catch (_e) { /* admin alert best-effort */ }
      }
      await db.from("invoices").update({ ...basePatch, link_pending_at: new Date().toISOString(), ...(inv.status === "unpaid" ? { status: "link_pending" } : {}) }).eq("id", inv.id);
      return json(200, { ok: true, indirect: true }, CORS);
    }

    // DIRECT — email the payment details immediately.
    const tpl = DIRECT_PAYMENT_DETAILS_EMAIL({
      firstName: first(me?.name), invoiceNumber: inv.invoice_number, totalDue: money(inv.total_due),
      issuedDate: issued, methodLabel: label, paymentRows: buildRows(m, details),
    });
    const sent = await send(to, tpl);
    if (sent.error) return json(502, { error: sent.error.message }, CORS);
    await db.from("invoices").update({ ...basePatch, ...(inv.status === "unpaid" ? { status: "details_sent" } : {}) }).eq("id", inv.id);
    return json(200, { ok: true, indirect: false }, CORS);
  }

  // ── ADMIN: submit_link — paste a Wise/Payoneer link, email it to the client ─
  if (action === "submit_link") {
    if (!isAdmin) return json(403, { error: "forbidden" }, CORS);
    const url = String(payment_link_url ?? "").trim();
    if (!/^https?:\/\/.+/i.test(url)) return json(400, { error: "bad_url", message: "Enter a valid payment link (https://…)." }, CORS);
    const m = String(inv.payment_method ?? "");
    if (!isIndirect(m)) return json(400, { error: "not_indirect", message: "This invoice isn't set to a link-based method yet." }, CORS);
    const { data: client } = await db.from("profiles").select("name, email").eq("id", inv.client_id).single();
    const to = client?.email || order?.client_email;
    if (!to) return json(404, { error: "no_client_email" }, CORS);
    const nowIso = new Date().toISOString();
    const expIso = expires_at ? new Date(expires_at).toISOString() : null;
    // One link per invoice — replace any prior one (admin may correct a bad link).
    await db.from("payment_links").delete().eq("invoice_id", inv.id);
    const { error: insErr } = await db.from("payment_links").insert({
      invoice_id: inv.id, client_id: inv.client_id, method: m, link_url: url,
      created_by: user.id, sent_at: nowIso, expires_at: expIso,
    });
    if (insErr) return json(502, { error: insErr.message }, CORS);
    const tpl = INDIRECT_PAYMENT_LINK_EMAIL({
      firstName: first(client?.name), invoiceNumber: inv.invoice_number, totalDue: money(inv.total_due),
      issuedDate: issued, methodLabel: labelOf(m), paymentLinkUrl: url,
      linkExpiresAt: expIso ? fmtDate(expIso) : undefined,
    });
    const sent = await send(to, tpl);
    if (sent.error) return json(502, { error: sent.error.message }, CORS);
    await db.from("invoices").update({ link_sent_at: nowIso, ...(["unpaid", "link_pending", "details_sent"].includes(inv.status) ? { status: "link_sent" } : {}) }).eq("id", inv.id);
    return json(200, { ok: true }, CORS);
  }

  // ── CLIENT: declare (any open state → payment_declared) ─────────────────────
  if (action === "declare") {
    if (!isOwner) return json(403, { error: "forbidden" }, CORS);
    if (!["unpaid", "details_sent", "link_pending", "link_sent", "payment_flagged"].includes(inv.status)) return json(400, { error: "bad_state" }, CORS);
    const now = new Date();
    await db.from("invoices").update({ status: "payment_declared", declared_at: now.toISOString(), declared_by: user.id }).eq("id", inv.id);
    if (ADMIN_EMAIL) {
      const m = (me?.default_payment_method ?? inv.payment_method ?? "") as string;
      const tpl = ADMIN_PAYMENT_DECLARED_EMAIL({
        clientName: me?.name || me?.email || "Client", invoiceNumber: inv.invoice_number,
        totalDue: money(inv.total_due), methodLabel: labelOf(m) || "—", isIndirect: isIndirect(m),
        declaredAt: when(now), orderSubject: subject, dashboardUrl: `${SITE_URL}/admin`,
      });
      try { await send(ADMIN_EMAIL, tpl); } catch (_e) { /* admin alert best-effort */ }
    }
    return json(200, { ok: true }, CORS);
  }

  // ── ADMIN: confirm ──────────────────────────────────────────────────────────
  if (action === "confirm") {
    if (!isAdmin) return json(403, { error: "forbidden" }, CORS);
    const now = new Date();
    await db.from("invoices").update({ status: "paid", paid_at: now.toISOString(), confirmed_by: user.id }).eq("id", inv.id);
    const { data: client } = await db.from("profiles").select("name, email").eq("id", inv.client_id).single();
    const to = client?.email || order?.client_email;
    if (to) {
      const tpl = PAYMENT_CONFIRMED_EMAIL({
        firstName: first(client?.name), invoiceNumber: inv.invoice_number, totalPaid: money(inv.total_due),
        confirmedDate: when(now), orderSubject: subject, portalUrl: `${SITE_URL}/workspace`,
      });
      try { await send(to, tpl); } catch (_e) { /* best-effort */ }
    }
    return json(200, { ok: true }, CORS);
  }

  // ── ADMIN: flag ─────────────────────────────────────────────────────────────
  if (action === "flag") {
    if (!isAdmin) return json(403, { error: "forbidden" }, CORS);
    await db.from("invoices").update({ status: "payment_flagged", flagged_at: new Date().toISOString(), flag_note: (note || "").slice(0, 200) || null }).eq("id", inv.id);
    const { data: client } = await db.from("profiles").select("name, email, default_payment_method").eq("id", inv.client_id).single();
    const to = client?.email || order?.client_email;
    if (to) {
      const m = (client?.default_payment_method ?? inv.payment_method ?? "") as string;
      const tpl = CLIENT_PAYMENT_FLAGGED_EMAIL({
        firstName: first(client?.name), invoiceNumber: inv.invoice_number, totalDue: money(inv.total_due),
        methodLabel: labelOf(m) || "your selected method", adminNote: (note || "").slice(0, 200) || undefined,
        portalUrl: `${SITE_URL}/workspace`,
      });
      try { await send(to, tpl); } catch (_e) { /* best-effort */ }
    }
    return json(200, { ok: true }, CORS);
  }

  return json(400, { error: "unknown_action" }, CORS);
});

function json(status: number, body: unknown, CORS: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });
}
