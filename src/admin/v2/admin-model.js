/* ============================================================
   admin-model.js — admin helpers over the shared MM. ES module. → AM
   ============================================================ */
import { MM } from "../../workspace/kit/model.js";

const STATUS_ORDER = ["new", "brief_received", "assigned", "writing", "in_review", "revision", "delivered", "closed"];

// Valid transitions from a given status — constrains the admin status dropdown so
// it can't skip past the expert/file gates (e.g. jump straight to delivered, or
// to writing with no expert). The current status is always included so the
// <select> value stays valid. delivered & in_review additionally require work
// files (enforced in the drawer via AM.hasWork). Bundle orders ignore this — their
// status is derived from parts by the DB rollup trigger (migration 034).
const STATUS_TRANSITIONS = {
  new:            ["new", "brief_received", "assigned"],
  brief_received: ["brief_received", "assigned"],
  assigned:       ["assigned", "writing", "revision"],
  writing:        ["writing", "in_review", "revision"],
  in_review:      ["in_review", "writing", "revision", "delivered"],
  revision:       ["revision", "writing", "in_review"],
  delivered:      ["delivered", "revision", "closed"],
  closed:         ["closed", "delivered"],
};
const nextStatuses = (s) => STATUS_TRANSITIONS[s] || STATUS_ORDER;

const WORK_KINDS = ["final", "draft", "revision"];
const hasWork = (files) => (files || []).some((f) => WORK_KINDS.includes(f.kind));
const canDeliver = (o) => o.hasWork != null ? o.hasWork : hasWork(o.files);

const PRIORITY = {
  low:    { label: "Low",    color: "var(--muted)",       bg: "var(--surface-2)" },
  normal: { label: "Normal", color: "var(--st-progress)", bg: "var(--st-progress-bg)" },
  high:   { label: "High",   color: "var(--st-action)",   bg: "var(--st-action-bg)" },
  urgent: { label: "Urgent", color: "#B23B3B",            bg: "#F6E0DE" },
};
const priority = (p) => PRIORITY[p] || PRIORITY.normal;

const FILE_KIND = {
  brief:       { label: "Client brief",       color: "var(--muted)" },
  final:       { label: "Final document",     color: "var(--st-done)" },
  draft:       { label: "Draft",              color: "var(--st-progress)" },
  revision:    { label: "Revision",           color: "var(--st-revision)" },
  ai_report:   { label: "AI-detection report",color: "var(--accent)" },
  plag_report: { label: "Originality report", color: "var(--accent)" },
  other:       { label: "File",               color: "var(--muted)" },
};
const SCORED_KINDS = ["ai_report", "plag_report"];
const fileKind = (k) => FILE_KIND[k] || { label: k, color: "var(--muted)" };

const money = (n) => "$" + (Math.round((n || 0) * 100) / 100).toFixed(n % 1 ? 2 : 0);
const fmtBytes = (b) => b == null ? "" : b < 1024 ? b + " B" : b < 1048576 ? Math.round(b / 1024) + " KB" : (b / 1048576).toFixed(1) + " MB";
const initials = (name) => (name || "?").replace(/^Dr\.?\s+/i, "").split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();

// Admin-lens status labels are the shared kit's single source of truth so every
// surface reads the same word (New / Brief / Assigned / Writing / QC review /
// Revision / Delivered / Closed). Delegates to MM.label(s, 'admin').
const statusLabel = (s) => MM.label(s, "admin");

const balance = (o) => Math.max(0, (o.quote_total || 0) - (o.quote_deposit || 0));

/* ============================================================
   Auto-scope intake — pure, deterministic heuristic ported from
   the prototype. NO server/AI call. Given a free-text request (and
   the live client roster) it derives a draft order: level, subject/
   program, assignment type→title, scope, citation, length, sources,
   due date (+rush), a $ quote, and a fuzzy client match.
   ============================================================ */
const TEMP_LIMIT = 5;

// Same auto-scoping the client workspace applies: level → citation, sources, length.
function scopeSpec(level, program, over) {
  over = over || {};
  const lvlSpec = {
    Undergraduate: { cite: "APA 7th edition", src: "3 peer-reviewed sources", len: "~1,000 words" },
    Graduate:      { cite: "APA 7th edition", src: "5 peer-reviewed sources", len: "~1,500 words" },
    Doctoral:      { cite: "APA 7th edition", src: "8 peer-reviewed sources", len: "~2,500 words" },
  };
  const ls = lvlSpec[level] || lvlSpec.Graduate;
  const cite = over.cite || ls.cite, src = over.src || ls.src, len = over.len || ls.len;
  const isNursing = /nursing|health/i.test(program || "");
  const subject = isNursing ? "nursing" : (program && program !== "—" ? program.toLowerCase() : "general");
  return { cite, src, len, subject, summary: `${level}-level ${subject} assignment — ${cite}, ${src} from the last five years, ${len}.` };
}
const estWords = (len) => { const m = (len || "").match(/([\d,]{3,})/); return m ? parseInt(m[1].replace(/,/g, ""), 10) : 1500; };
const titleCase = (s) => s.replace(/\b([a-z])/g, (_, c) => c.toUpperCase());
const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// Fuzzy client match against the live roster. Each client may carry { name, email }.
function matchClient(text, clients) {
  const t = (text || "").toLowerCase();
  for (const c of (clients || [])) {
    const nm = (c.name || "").toLowerCase();
    if (nm && t.includes(nm)) return c;
    const first = (c.name || "").replace(/^dr\.?\s*/i, "").split(/\s+/)[0] || "";
    if (first.length > 2 && new RegExp("\\b" + first.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "") + "\\b").test(t)) return c;
    const email = (c.email || "").toLowerCase();
    if (email && t.includes(email)) return c;
  }
  return null;
}

function parseDue(text) {
  const t = (text || "").toLowerCase();
  const today = new Date();
  const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const add = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };
  let m;
  if (/\btomorrow\b/.test(t)) return { due: fmt(add(1)), rush: true };
  if (/\b(tonight|by today|asap|urgent|same day)\b/.test(t)) return { due: fmt(today), rush: true };
  if ((m = t.match(/in\s+(\d{1,2})\s+days?/))) { const n = +m[1]; return { due: fmt(add(n)), rush: n <= 3 }; }
  if ((m = t.match(/in\s+(a|one|two|three)\s+weeks?/))) { const map = { a: 7, one: 7, two: 14, three: 21 }; return { due: fmt(add(map[m[1]])), rush: false }; }
  if (/\bnext week\b/.test(t)) return { due: fmt(add(7)), rush: false };
  if (/\bthis week\b/.test(t)) return { due: fmt(add(4)), rush: true };
  if (/\bend of (the )?week\b/.test(t)) return { due: fmt(add(5)), rush: true };
  if ((m = t.match(/(?:due|by|deadline[: ]+)\s*(?:on\s+|the\s+)?([a-z]{3,9}\.?\s+\d{1,2})(?:st|nd|rd|th)?/))) return { due: cap(m[1].replace(/\s+/g, " ").trim()), rush: false };
  const wk = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };
  if ((m = t.match(/\b(?:by |due |next )?(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/))) {
    const target = wk[m[1]]; let n = (target - today.getDay() + 7) % 7; if (n === 0) n = 7;
    return { due: fmt(add(n)), rush: n <= 3 };
  }
  return { due: "", rush: false };
}

// The core analyzer. `clients` is the live roster (objects with name/email).
function scopeIntake(text, clients) {
  const raw = (text || "").trim();
  const t = raw.toLowerCase();
  const hits = [];
  // level
  let level = "Graduate", levelSure = false;
  if (/\b(doctoral|doctorate|ph\.?d|dnp|dba|edd|dissertation|capstone)\b/.test(t)) { level = "Doctoral"; levelSure = true; }
  else if (/\b(undergrad|undergraduate|bachelor|bsn|associate|freshman|sophomore|101|intro to)\b/.test(t)) { level = "Undergraduate"; levelSure = true; }
  else if (/\b(master'?s?|graduate|grad\b|msn|mba|mph|m\.?s\.?n?|fnp|pmhnp|np program)\b/.test(t)) { level = "Graduate"; levelSure = true; }
  if (levelSure) hits.push("level");
  // subject / program
  let program = "General", subjSure = false;
  const subj = [
    [/\b(nursing|nurse|soap|care plan|picot|pharmacolog|clinical|patient|health promotion|nclex|evidence[- ]based|ebp|pathophys|community health)\b/, "Nursing & Health Sciences"],
    [/\b(psycholog|cbt|psychotherap|cognitive[- ]behav|counsel|mental health|developmental psych)\b/, "Psychology"],
    [/\b(history|religion|theolog|ethics|philosoph|literature|english lit|humanities|comparative)\b/, "Humanities"],
    [/\b(business|marketing|management|finance|accounting|economic|strategy|operations)\b/, "Business"],
    [/\b(biology|chemistry|physics|engineering|calculus|statistics|data science|computer science|programming|algorithm)\b/, "STEM"],
    [/\b(education|teaching|curriculum|pedagog|lesson plan)\b/, "Education"],
  ];
  for (const [re, name] of subj) { if (re.test(t)) { program = name; subjSure = true; break; } }
  if (!subjSure) {
    const codeMap = [
      [/\b(nurs|nsg|hlth)[- ]?\d/, "Nursing & Health Sciences"], [/\bnr[- ]?\d{3}/, "Nursing & Health Sciences"],
      [/\b(psy|psyc)[- ]?\d/, "Psychology"], [/\b(hist|hum|engl|phil|rel)[- ]?\d/, "Humanities"],
      [/\b(bus|mkt|mgmt|fin|acct|econ|mba)[- ]?\d/, "Business"], [/\b(biol|chem|phys|math|stat|cs|comp|engr)[- ]?\d/, "STEM"],
      [/\b(educ|edu|tch)[- ]?\d/, "Education"],
    ];
    for (const [re, name] of codeMap) { if (re.test(t)) { program = name; subjSure = true; break; } }
  }
  if (subjSure) hits.push("subject");
  // assignment type
  const typeMap = [
    [/care plan/, "Care Plan"], [/soap note/, "SOAP Note Set"], [/picot/, "PICOT Proposal"],
    [/case study|case analysis/, "Case Study"], [/reflect/, "Reflective Essay"],
    [/discussion (board|post|response)/, "Discussion Responses"], [/literature review/, "Literature Review"],
    [/annotated bibliograph/, "Annotated Bibliography"], [/research proposal/, "Research Proposal"],
    [/research paper/, "Research Paper"], [/dissertation/, "Dissertation Chapter"], [/capstone/, "Capstone Project"],
    [/term paper/, "Term Paper"], [/lab report/, "Lab Report"], [/analysis/, "Analysis"],
    [/proposal/, "Proposal"], [/report/, "Report"], [/presentation|powerpoint|slides/, "Presentation"], [/essay/, "Essay"],
  ];
  let typeNoun = "Assignment", typeSure = false;
  for (const [re, noun] of typeMap) { if (re.test(t)) { typeNoun = noun; typeSure = true; break; } }
  // title — prefer an explicit quoted phrase, else "on …" topic, else subject + type
  let title;
  const quoted = raw.match(/["“']([^"”']{6,90})["”']/);
  const onTopic = raw.match(/\b(?:on|about|regarding|titled|topic[: ]+)\s+([a-z][^.,;\n]{8,70})/i);
  if (quoted) title = quoted[1].trim();
  else if (onTopic) title = titleCase(onTopic[1].trim()) + (typeSure ? " " + typeNoun : "");
  else { const subjWord = program === "Nursing & Health Sciences" ? "Nursing" : (program === "General" ? "" : program.split(/[ &]/)[0]); title = ((subjWord ? subjWord + " " : "") + typeNoun).trim(); }
  if (title.length > 84) title = title.slice(0, 82).trim() + "…";
  // scope
  let scope = "One assignment";
  if (/\b(entire|whole|full|all of (the|my))\s+(program|course|class|semester|module|term|degree)\b/.test(t) || /\bevery (assignment|week|discussion)\b/.test(t) || /\bongoing\b/.test(t)) scope = "Full program";
  // base spec then overrides
  const spec = scopeSpec(level, program);
  let cite = spec.cite, citeSure = false;
  if (/\bapa\b/.test(t)) { cite = "APA 7th edition"; citeSure = true; }
  else if (/\bmla\b/.test(t)) { cite = "MLA 9th edition"; citeSure = true; }
  else if (/\bama\b/.test(t)) { cite = "AMA"; citeSure = true; }
  else if (/\bharvard\b/.test(t)) { cite = "Harvard"; citeSure = true; }
  else if (/\b(chicago|turabian)\b/.test(t)) { cite = "Chicago"; citeSure = true; }
  if (citeSure) hits.push("citation");
  let src = spec.src, len = spec.len, lenSure = false;
  let m;
  if ((m = t.match(/([\d,]{3,6})\s*words?/))) { len = "~" + parseInt(m[1].replace(/,/g, ""), 10).toLocaleString("en-US") + " words"; lenSure = true; }
  else if ((m = t.match(/(\d{1,3})\s*pages?/))) { const p = +m[1]; len = p + " page" + (p > 1 ? "s" : "") + " (~" + (p * 275).toLocaleString("en-US") + " words)"; lenSure = true; }
  if (lenSure) hits.push("length");
  if ((m = t.match(/(\d{1,2})\s*(?:peer[- ]reviewed\s*)?(?:scholarly\s*)?(?:sources?|references?|citations?)/))) { src = m[1] + " peer-reviewed sources"; hits.push("sources"); }
  // due
  const { due, rush } = parseDue(raw);
  if (due) hits.push("due");
  // value estimate
  const words = estWords(len);
  const pages = Math.max(1, Math.round(words / 275));
  const perPage = { Undergraduate: 16, Graduate: 21, Doctoral: 29 }[level] || 21;
  let value = pages * perPage;
  if (scope === "Full program") value = Math.round(value * 4.5);
  if (rush) value = Math.round(value * 1.25);
  value = Math.max(40, Math.round(value / 5) * 5);
  // client match
  const matchedClient = matchClient(raw, clients);
  if (matchedClient) hits.push("client");
  // instructions = the raw request, lightly cleaned
  const instructions = raw.replace(/\s+/g, " ").trim();
  const filled = 5 + (due ? 1 : 0) + (matchedClient ? 1 : 0); // title, program, level, scope, quote always + extras
  const signal = (levelSure ? 1 : 0) + (subjSure ? 1 : 0) + (typeSure ? 1 : 0) + (citeSure ? 1 : 0) + (lenSure ? 1 : 0) + (due ? 1 : 0);
  const confidence = signal >= 4 ? "High confidence" : signal >= 2 ? "Good confidence" : "Best guess";
  return {
    title, program, level, scope, cite, src, len, value, due, rush,
    matchedClient, instructions, filled, confidence, hits,
    chips: [
      matchedClient ? { k: "Client", v: matchedClient.name || matchedClient.email } : null,
      { k: "Level", v: level }, { k: "Subject", v: program },
      { k: "Scope", v: scope }, citeSure ? { k: "Citation", v: cite } : null,
      lenSure ? { k: "Length", v: len.replace("~", "") } : null,
      due ? { k: "Due", v: due } : null, { k: "Quote", v: money(value) },
    ].filter(Boolean),
  };
}

// A submitted brief auto-creates a trackable order (same email, moments later),
// so the admin "Convert to order" action would create a DUPLICATE. This finds the
// order a brief already became, so the UI can show it as tracked instead of
// offering a second conversion. Match = same email + order created in a tight
// window around the brief (auto-order is created seconds after the brief).
const BRIEF_ORDER_BACK_MS = 2 * 60 * 1000;     // 2 min before (clock skew)
const BRIEF_ORDER_FWD_MS = 30 * 60 * 1000;     // 30 min after (generous, still bounded)
const orderForBrief = (brief, orders) => {
  if (!brief) return null;
  const be = (brief.email || "").trim().toLowerCase();
  if (!be) return null;
  const bt = brief.created_at ? new Date(brief.created_at).getTime() : 0;
  return (orders || []).find((o) => {
    const oe = (o.client_email || "").trim().toLowerCase();
    if (!oe || oe !== be) return false;
    const ot = o.created_at ? new Date(o.created_at).getTime() : 0;
    return ot >= bt - BRIEF_ORDER_BACK_MS && ot <= bt + BRIEF_ORDER_FWD_MS;
  }) || null;
};

export const AM = { STATUS_ORDER, STATUS_TRANSITIONS, nextStatuses, WORK_KINDS, hasWork, canDeliver, PRIORITY, priority, FILE_KIND, SCORED_KINDS, fileKind, money, fmtBytes, initials, statusLabel, balance, orderForBrief, TEMP_LIMIT, scopeSpec, parseDue, matchClient, scopeIntake };
export default AM;
