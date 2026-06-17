/* ============================================================
   model.js — Meridian system model (ported to ES module).
   Mirrors the live status model, release gate, payment, and file
   view so the redesign renders the REAL data shapes. → export MM.
   ============================================================ */

// ---- WhatsApp Business number (registered) ----------------
export const WHATSAPP = "12057279363"; // +1 205 727 9363
export const waLink = (text) =>
  `https://wa.me/${WHATSAPP}` + (text ? `?text=${encodeURIComponent(text)}` : "");

// ---- STATUS MODEL -----------------------------------------
// The linear progress track. `revision` + `closed` handled specially.
export const STATUS_FLOW = ["new", "brief_received", "assigned", "writing", "in_review", "delivered"];

// STATUS_META[status] = { label, tone, strip, pct }
export const STATUS_META = {
  new:            { label: "Under review",    tone: "new",  strip: "s-new",    pct: 6 },
  brief_received: { label: "Under review",    tone: "new",  strip: "s-new",    pct: 18 },
  assigned:       { label: "Expert assigned", tone: "info", strip: "s-prog",   pct: 36 },
  writing:        { label: "In progress",     tone: "info", strip: "s-prog",   pct: 60 },
  in_review:      { label: "In QC review",    tone: "warn", strip: "s-review", pct: 84 },
  delivered:      { label: "Completed",       tone: "good", strip: "s-done",   pct: 100 },
  revision:       { label: "In revision",     tone: "rev",  strip: "s-rev",    pct: 72 },
  closed:         { label: "Completed",       tone: "good", strip: "s-done",   pct: 100 },
};

// tone → design tokens (defined in theme.css)
export const TONE = {
  new:  { color: "var(--st-new)",      bg: "var(--st-new-bg)",      edge: "var(--st-new-edge)",      icon: "clock" },
  info: { color: "var(--st-progress)", bg: "var(--st-progress-bg)", edge: "var(--st-progress-edge)", icon: "pencil" },
  warn: { color: "var(--st-action)",   bg: "var(--st-action-bg)",   edge: "var(--st-action-edge)",   icon: "shield" },
  good: { color: "var(--st-done)",     bg: "var(--st-done-bg)",     edge: "var(--st-done-edge)",     icon: "check" },
  rev:  { color: "var(--st-revision)", bg: "var(--st-revision-bg)", edge: "var(--st-revision-edge)", icon: "refresh" },
};

const meta = (status) => STATUS_META[status] || STATUS_META.new;
const tone = (status) => TONE[meta(status).tone] || TONE.new;

// Per-surface status labels — the SAME status reads differently by lens (expert
// vs client vs admin), so they live in ONE table and never drift apart. Mirrors
// meridian-kit.js LABELS. Falls back to the canonical STATUS_META label.
export const LABELS = {
  expert: { assigned: "Assigned to you", writing: "Writing", in_review: "In QC review", revision: "Revision", delivered: "Delivered", closed: "Closed" },
  client: { new: "Under review", brief_received: "Under review", assigned: "Expert assigned", writing: "In progress", in_review: "In QC review", revision: "In revision", delivered: "Completed", closed: "Completed" },
  admin:  { new: "New", brief_received: "Brief", assigned: "Assigned", writing: "Writing", in_review: "QC review", revision: "Revision", delivered: "Delivered", closed: "Closed" },
};
const label = (status, surface = "client") => (LABELS[surface] && LABELS[surface][status]) || (STATUS_META[status] && STATUS_META[status].label) || status;
// chip(status, surface) → flat tokens a component can drop straight into styles.
const chip = (status, surface = "client") => { const t = tone(status); return { color: t.color, bg: t.bg, edge: t.edge, icon: t.icon, label: label(status, surface) }; };

// RELEASE GATE — the most important rule. Client must NOT see the
// deliverable until admin marks delivered/closed.
const isReleased = (o) => ["delivered", "closed"].includes(o.status);
// Files the client may open: released orders, PLUS a revision-in-progress keeps
// the previously delivered version available while the new one is prepared.
const filesVisible = (o) => isReleased(o) || o.status === "revision";

// Dashboard triage bucket (derived; UI-only).
const bucketOf = (o) => {
  if (isReleased(o)) return "delivered";
  if (o.payment_status === "unpaid") return "action";
  return "progress";
};
// One shared vocabulary for the buckets across client/expert/admin surfaces.
export const BUCKET_LABELS = { action: "Under review", progress: "In progress", delivered: "Completed" };

// Invoice states (invoices.status) — drives card CTAs and the invoice page.
// details_sent / link_pending / link_sent are the in-between states added with
// the email system; they still count as "open" (unpaid) for balances + the cap.
export const INVOICE_STATES = {
  unpaid:           { label: "Unpaid",                  tone: "warn" },
  details_sent:     { label: "Details sent",            tone: "warn" },
  link_pending:     { label: "Link being prepared",     tone: "warn" },
  link_sent:        { label: "Payment link sent",       tone: "warn" },
  payment_declared: { label: "Payment pending",         tone: "warn" },
  payment_flagged:  { label: "Payment issue",           tone: "rev" },
  paid:             { label: "Invoice paid ✓",          tone: "good" },
};

// Invoice statuses that still need money / action (drive balances, the cap, and
// the "open" filter). Everything except `paid`.
export const OPEN_INVOICE_STATES = ["unpaid", "details_sent", "link_pending", "link_sent", "payment_declared", "payment_flagged"];

// Client-safe payment method catalog — labels/tags ONLY. Account details live
// server-side in the payments edge function and are delivered by email only.
// `indirect` methods (Wise, Payoneer) email a secure platform link instead of
// static account details — the admin generates the link.
export const PAYMENT_METHOD_CATALOG = [
  { id: "sendwave",     label: "Sendwave",                 tags: "Zero fees · ~30 sec",        desc: "Fastest · USA, UK, Canada, EU" },
  { id: "taptap",       label: "TapTap Send / WorldRemit", tags: "No fees · 130+ countries",   desc: "Widest global coverage" },
  { id: "wise",         label: "Wise",                     tags: "Secure link · low FX fees",  desc: "Pay by a secure Wise link", indirect: true },
  { id: "payoneer",     label: "Payoneer",                 tags: "Secure link · card or bank", desc: "Pay by a secure Payoneer link", indirect: true },
  { id: "skrill",       label: "Skrill",                   tags: "40 currencies · e-wallet",   desc: "E-commerce & digital" },
  { id: "westernUnion", label: "Western Union",            tags: "200+ countries · cash/card", desc: "Walk-in or online" },
  { id: "mpesa",        label: "M-Pesa",                   tags: "Kenya only · instant · free", desc: "Kenya-based clients only", kenyaOnly: true },
];

// PAYMENT — payment_status ∈ {unpaid, deposit_paid, paid_in_full}
export const PAYMENT_META = {
  unpaid:        { label: "Unpaid",       tone: "warn" },
  deposit_paid:  { label: "Deposit paid", tone: "info" },
  paid_in_full:  { label: "Paid in full", tone: "good" },
};
const paymentMeta = (p) => PAYMENT_META[p] || PAYMENT_META.unpaid;
const balance = (o) => Math.max(0, (o.quote_total || 0) - (o.quote_deposit || 0));

// Payment is handled OFF-PLATFORM.
export const PAYMENT_METHODS = ["Payoneer", "Western Union", "Sendwave", "Wise", "Bank transfer"];

// statusSentence(o) — the human "what's happening now" line. Invoice-aware when
// the order carries an attached `invoice` (general clients).
function statusSentence(o) {
  const w = (o.writer && o.writer.name) || "Your expert";
  const scope = o.scope_label || o.scope || "work";
  const inv = o.invoice;
  if (["new", "brief_received"].includes(o.status)) {
    if (o.client_type === "custom") return "Under review — we're lining up your expert.";
    if (!inv) return "Under review — your invoice is on its way.";
    if (inv.status === "unpaid") return "Invoice ready — payment required to begin.";
    if (inv.status === "details_sent") return "Payment details sent — complete payment to begin.";
    if (inv.status === "link_pending") return "Preparing your secure payment link…";
    if (inv.status === "link_sent") return "Payment link sent — complete payment to begin.";
    if (inv.status === "payment_declared") return "Payment declared — awaiting confirmation.";
    if (inv.status === "payment_flagged") return "Payment issue — please check your transfer.";
    return "Payment received — we're matching you with an expert.";
  }
  switch (o.status) {
    case "assigned":       return `${w} has been assigned and is reviewing your brief.`;
    case "writing":        return `${w} is working on your ${scope}.`;
    case "in_review":      return "Our QC team is checking your work before release.";
    case "delivered":      return "Completed — your files are ready to download.";
    case "revision":       return `${w} is revising based on your feedback.`;
    case "closed":         return "This order is complete and closed.";
    default:               return "We'll keep you posted here.";
  }
}

// buildFileView(files) → { uploads, submissions } — submissions grouped into
// PACKAGES by version (final + AI report + originality report under one version).
// Live kinds use `plag_report`; the prototype used `originality_report` — accept both.
export const SUBMISSION_KINDS = ["final", "ai_report", "plag_report", "originality_report"];
function buildFileView(files) {
  const uploads = [], byVersion = {};
  (files || []).forEach((f) => {
    if (SUBMISSION_KINDS.includes(f.kind)) {
      const v = f.version || 1;
      (byVersion[v] = byVersion[v] || []).push(f);
    } else {
      uploads.push(f);
    }
  });
  const submissions = Object.keys(byVersion)
    .sort((a, b) => b - a)
    .map((v) => ({ version: Number(v), files: byVersion[v], at: byVersion[v][0] && byVersion[v][0].at }));
  return { uploads, submissions };
}

// ── Shared time helpers (used across client / expert / admin) ───────────────
// relDue: a deadline countdown — { text, urgent, overdue } or null. urgent =
// due within 3 days or past, so all three surfaces flag at-risk work the same
// way and with the same wording.
function relDue(raw) {
  if (!raw) return null;
  // Parse date-only strings ("YYYY-MM-DD") as a LOCAL calendar day, not UTC
  // midnight — otherwise a date due today reads as "overdue" during the day and
  // can be off by one in negative-offset timezones.
  let due;
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-").map(Number);
    due = new Date(y, m - 1, d);
  } else {
    due = new Date(raw);
  }
  if (isNaN(+due)) return null;
  const n = new Date();
  const today = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const days = Math.round((dueDay - today) / 86400000);   // whole calendar days
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, urgent: true, overdue: true, days };
  if (days === 0) return { text: "due today", urgent: true, overdue: false, days };
  if (days === 1) return { text: "due tomorrow", urgent: true, overdue: false, days };
  return { text: `in ${days} days`, urgent: days <= 3, overdue: false, days };
}
// ago: how long since an event — "just now" / "2h ago" / "3d ago". For surfacing
// the age of items waiting on someone (briefs to convert, orders in QC, etc.).
function ago(raw) {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(+d)) return "";
  const s = Math.floor((new Date() - d) / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24);
  if (dd < 30) return `${dd}d ago`;
  const mo = Math.floor(dd / 30);
  return mo < 12 ? `${mo}mo ago` : `${Math.floor(mo / 12)}y ago`;
}

export const MM = {
  WHATSAPP, waLink,
  STATUS_FLOW, STATUS_META, TONE, meta, tone, LABELS, label, chip,
  isReleased, filesVisible, bucketOf, BUCKET_LABELS,
  INVOICE_STATES, OPEN_INVOICE_STATES, PAYMENT_METHOD_CATALOG,
  PAYMENT_META, paymentMeta, balance, PAYMENT_METHODS,
  statusSentence, buildFileView, SUBMISSION_KINDS,
  relDue, ago,
};

export default MM;
