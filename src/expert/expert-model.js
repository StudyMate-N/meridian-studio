/* ============================================================
   expert-model.js — expert-side status/earnings/submission logic
   (ES module). Reuses the shared MM tones/labels. → export EM.
   ============================================================ */
import { MM } from "../workspace/kit/model.js";

// §6 WFLOW — the expert lifecycle track
const WFLOW = ["assigned", "writing", "in_review", "delivered"];
const WFLOW_LABELS = { assigned: "Assigned", writing: "Writing", in_review: "QC review", delivered: "Delivered" };

function statusSentence(o) {
  switch (o.status) {
    case "assigned":  return "Ready to start — review the brief, then begin.";
    case "writing":   return "In progress — upload your package and submit for review.";
    case "in_review": return "Submitted. Our QC team is reviewing before release.";
    case "revision":  return "Revision requested — update your package and resubmit.";
    case "delivered": return "Delivered to the student. Nice work.";
    case "closed":    return "Order complete and closed.";
    default:          return "";
  }
}

// expert can ONLY: assigned→writing, writing|revision→in_review. Never delivered.
function nextAction(o) {
  if (o.status === "assigned") return { label: "Start work", to: "writing", icon: "pencil" };
  if (o.status === "writing" || o.status === "revision") return { label: "Submit for review", to: "in_review", icon: "upload", gated: true };
  return null;
}

// §5 submit gate — needs at least one Final file uploaded by this writer
const hasFinal = (files, userId) => (files || []).some((f) => f.kind === "final" && (!userId || f.uploaded_by === userId));

// PAY IS DERIVED — pages × $2.32 (locked product rule). Bundles sum their parts'
// pages. When there's NO page count and NO flat fee, pay is NOT $0.00 — payInfo
// reports known:false and payLabel renders "Set by admin".
const RATE = 2.32;
const round2 = (n) => Math.round((n || 0) * 100) / 100;
const payFor = (o) => {
  if (o && Array.isArray(o.parts) && o.parts.length) return round2(o.parts.reduce((s, p) => s + (p.pages || 0), 0) * RATE);
  if (o && o.rate_project != null) return round2(o.rate_project);   // admin flat-fee OVERRIDE (takes precedence over pages)
  if (o && o.pages != null) return round2(o.pages * RATE);
  return 0;
};
// { amount, known } — known:false ⇒ pay can't be derived (no pages, no flat fee)
const payInfo = (o) => {
  const hasParts = !!(o && Array.isArray(o.parts) && o.parts.length);
  const hasPages = hasParts ? o.parts.some((p) => p.pages != null) : !!(o && o.pages != null);
  const hasFlat = !!(o && o.rate_project != null);
  return { amount: payFor(o), known: hasPages || hasFlat };
};
const money = (n) => "$" + (Math.round((n || 0) * 100) / 100).toFixed(2);
// Display string for a pay figure — "Set by admin" when not yet derivable.
const payLabel = (o) => { const i = payInfo(o); return i.known ? money(i.amount) : "Set by admin"; };

// Bundle display status — derive an order's overall status from its parts so it
// groups/labels correctly on My Work. (Per-part status is the source of truth.)
function bundleStatus(parts) {
  const ss = (parts || []).map((p) => p.status);
  if (!ss.length) return "assigned";
  if (ss.some((s) => s === "revision")) return "revision";
  if (ss.every((s) => ["delivered", "closed"].includes(s))) return "delivered";
  if (ss.every((s) => ["in_review", "delivered", "closed"].includes(s))) return "in_review";
  if (ss.some((s) => s === "writing")) return "writing";
  return "assigned";
}

// Last 6 calendar months of PAID earnings (delivered orders, by delivery month)
// — feeds the dashboard earnings chart. The current month is flagged so the UI
// can render it as in-progress.
function monthlyEarnings(orders) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-US", { month: "short" }), value: 0, current: i === 0 });
  }
  const idx = Object.fromEntries(months.map((m, i) => [m.key, i]));
  (orders || []).forEach((o) => {
    if (!["delivered", "closed"].includes(o.status) || !o.updated_at) return;
    const d = new Date(o.updated_at); if (isNaN(+d)) return;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key in idx) months[idx[key]].value += payFor(o);
  });
  return months;
}

// §6 earnings buckets, status-driven
function earningsBuckets(orders) {
  const b = { paid: 0, processing: 0, upcoming: 0 };
  (orders || []).forEach((o) => {
    const p = payFor(o);
    if (["delivered", "closed"].includes(o.status)) b.paid += p;
    else if (o.status === "in_review") b.processing += p;
    else b.upcoming += p;
  });
  return b;
}
const earningsState = (o) => ["delivered", "closed"].includes(o.status) ? "paid" : o.status === "in_review" ? "processing" : "upcoming";

// §5 multi-file package slots
const PKG_SLOTS = [
  { kind: "final",       title: "Final document",       hint: "The completed work — required to submit.", required: true,  score: false },
  { kind: "ai_report",   title: "AI-detection report",  hint: "Upload the report and enter the score.",   required: false, score: true },
  { kind: "plag_report", title: "Originality report",   hint: "Plagiarism / similarity report + score.",   required: false, score: true },
  { kind: "draft",       title: "Supporting files",     hint: "Outlines, sources, anything helpful.",      required: false, score: false },
];

function nextVersion(files) {
  let max = 0;
  (files || []).forEach((f) => { const m = /v(\d+)/.exec(f.version || ""); if (m) max = Math.max(max, +m[1]); });
  return "v" + (max + 1);
}

// Deadline countdown — { text, urgent, overdue, days } from the raw due date.
const dueRel = (o) => MM.relDue(o && o.due_at);
function dueTone(o) {
  if (["delivered", "closed", "in_review"].includes(o.status)) return "muted";
  const r = dueRel(o);
  if (!r) return "ok";
  if (r.overdue || r.days <= 0) return "urgent";   // today or past
  if (r.days <= 3) return "soon";
  return "ok";
}

export const EM = {
  WFLOW, WFLOW_LABELS, statusSentence, nextAction, hasFinal,
  RATE, payFor, payInfo, payLabel, money, earningsBuckets, earningsState, monthlyEarnings, PKG_SLOTS, nextVersion, dueTone, dueRel,
  bundleStatus,
};

export default EM;
