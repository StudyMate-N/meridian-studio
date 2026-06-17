/* ============================================================
   Order detail — release gate, payment, grouped packages (ES module).
   Files + conversation load live from order_files / order_messages
   (realtime); downloads use signed URLs. Bound to MM.
   ============================================================ */
import React from "react";
import ReactDOM from "react-dom";
import { supabase } from "../lib/supabase.js";
import { Icon } from "./kit/icons.jsx";
import { MM } from "./kit/model.js";
import { Button, StatusChip, StageTracker, Avatar, Meta, PaymentBadge, TypeBadge, fileMeta } from "./kit/components.jsx";
import { ChatThread, ChatComposer } from "./kit/chat.jsx";
import { initialsOf, inProgressStatus, levelSpec } from "./dashboard.jsx";

const { useState, useEffect, useMemo, useRef } = React;

/* ---- small formatters ------------------------------------- */
function fmtBytes(n) {
  if (n == null) return "";
  if (n < 1024) return n + " B";
  if (n < 1048576) return Math.round(n / 1024) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}
function fmtWhen(ts) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    const today = new Date();
    const same = d.toDateString() === today.toDateString();
    return same ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return ""; }
}
function fmtMsgTime(d) {
  try { return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
  catch { return ""; }
}
// Subtle relative phrase for a date — "today" / "tomorrow" / "in 5 days" /
// "overdue". Kept quiet on purpose: it rides alongside the formatted date.
function relPhrase(raw) {
  if (!raw) return null;
  try {
    const d = new Date(raw); if (isNaN(+d)) return null;
    const days = Math.ceil((d - new Date()) / 86400000);
    if (days < 0) return { text: "overdue", urgent: true };
    if (days === 0) return { text: "today", urgent: true };
    if (days === 1) return { text: "tomorrow", urgent: false };
    return { text: `in ${days} days`, urgent: days <= 3 };
  } catch { return null; }
}
// Short date-only, e.g. "Jun 14" — for issued/sent lines.
function fmtDay(ts) {
  if (!ts) return "";
  try { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  catch { return ""; }
}
const normFile = (r) => ({
  id: r.id, name: r.file_name, path: r.file_path, kind: r.kind,
  version: r.version, size: fmtBytes(r.size_bytes), at: fmtWhen(r.created_at), uploaded_by: r.uploaded_by,
});

// Synthesize a light "Updates" timeline from the order (no events table).
function deriveTimeline(o) {
  const items = [{ at: fmtWhen(o.created_at), label: "Brief received", body: "We received your brief and started setting things up." }];
  if (o.payment_status && o.payment_status !== "unpaid") items.push({ at: "", label: MM.paymentMeta(o.payment_status).label, body: "Payment recorded — your work is underway." });
  if (o.writer) items.push({ at: "", label: "Expert assigned", body: `${o.writer.name} is your specialist.` });
  items.push({ at: o.due_date || "", label: MM.label(o.status, "client"), body: MM.statusSentence(o), highlight: true });
  return items;
}

/* one-shot confetti burst — brand-colored ticker tape */
export function Confetti() {
  const pieces = useMemo(() => {
    const colors = ["var(--accent)", "var(--st-done)", "#D9A441", "#C9836A", "var(--ink)"];
    return Array.from({ length: 30 }).map((_, i) => ({
      left: 8 + Math.random() * 84, color: colors[i % colors.length],
      delay: Math.random() * 0.3, dur: 1.5 + Math.random() * 1.1,
      cx: (Math.random() * 2 - 1) * 90, cy: 150 + Math.random() * 220,
      cr: (Math.random() * 2 - 1) * 540, w: 4 + Math.random() * 4, h: 9 + Math.random() * 9,
    }));
  }, []);
  return (
    <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 0, pointerEvents: "none", zIndex: 6 }}>
      {pieces.map((p, i) => (
        <span key={i} style={{
          position: "absolute", left: p.left + "%", top: 0, width: p.w, height: p.h,
          background: p.color, borderRadius: 1, opacity: 0.95,
          "--cx": p.cx + "px", "--cy": p.cy + "px", "--cr": p.cr + "deg",
          animation: `confettiFall ${p.dur}s cubic-bezier(.2,.6,.5,1) ${p.delay}s forwards`,
        }} />
      ))}
    </div>
  );
}

const FILE_LABEL = { final: "Final document", ai_report: "AI-use report", plag_report: "Originality report", originality_report: "Originality report", draft: "Supporting file", revision: "Revision", other: "Your upload", upload: "Your upload" };

export function FileRow({ f, onDownload, onPreview }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
      display: "flex", alignItems: "center", gap: 13, padding: "11px 13px",
      border: "1px solid var(--line)", borderRadius: 12, background: hover ? "var(--surface-2)" : "var(--surface)",
      transition: "background .15s" }}>
      <TypeBadge name={f.name} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{FILE_LABEL[f.kind] || "File"}{f.size ? ` · ${f.size}` : ""}{f.at ? ` · ${f.at}` : ""}</div>
      </div>
      <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
        {onPreview && <Button size="sm" variant="ghost" icon="eye" onClick={() => onPreview(f)}>Preview</Button>}
        <Button size="sm" variant="soft" icon="download" onClick={() => onDownload(f)}>Download</Button>
      </div>
    </div>
  );
}

/* ---- File preview modal (real file via signed URL) -------- */
const EXT_OF = (name) => { const m = /\.([^.\/\\]+)$/.exec(String(name || "")); return m ? m[1].toLowerCase() : ""; };
const IMG_EXT = ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp", "heic"];
const FRAME_EXT = ["pdf", "txt", "csv", "md", "json", "log"];
const OFFICE_EXT = ["doc", "docx", "ppt", "pptx", "xls", "xlsx"];
const VIDEO_EXT = ["mp4", "webm", "mov", "m4v"];
const AUDIO_EXT = ["mp3", "wav", "m4a", "ogg", "aac"];

/* Notes-for-expert: a raw paste can be very long. Preserve its line breaks but
   cap the height with a Read-more toggle so it never floods the detail page. */
// `bare` renders just the text + read-more (no own box/label) so it can sit
// inside the new "Your original request" block. `italic`/`quoted` style the
// client's raw words. Default (legacy) keeps the framed "Notes for expert" box.
function BriefNotes({ text, bare = false, italic = false, quoted = false }) {
  const [open, setOpen] = useState(false);
  const long = (text || "").length > 320 || (text.match(/\n/g) || []).length > 5;
  const body = (
    <>
      <div style={{ position: "relative", maxHeight: open || !long ? "none" : 120, overflow: "hidden" }}>
        <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word",
          fontStyle: italic ? "italic" : "normal" }}>{quoted ? `“${text}”` : text}</div>
        {long && !open && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 46,
            background: "linear-gradient(to bottom, transparent, var(--surface-2))" }} />
        )}
      </div>
      {long && (
        <button onClick={() => setOpen((v) => !v)} style={{ marginTop: 8, background: "transparent", border: "none",
          color: "var(--accent)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0 }}>
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </>
  );
  if (bare) return body;
  return (
    <div style={{ marginTop: 14, padding: 14, background: "var(--surface-2)", borderRadius: 12 }}>
      <span className="mono" style={{ fontSize: 10, color: "var(--muted)", display: "block", marginBottom: 7 }}>Notes for expert</span>
      {body}
    </div>
  );
}

export function FilePreview({ file, onClose, onDownload }) {
  const [url, setUrl] = useState(null);
  const [state, setState] = useState("loading"); // loading | image | frame | office | video | audio | fallback | error
  const path = file && file.path;
  const e = EXT_OF(file && file.name);

  useEffect(() => {
    const k = (ev) => ev.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  // Fetch a signed URL once per file.path (not per render) so the preview is stable
  // and never flickers/re-fetches. Long TTL so it doesn't expire while open.
  useEffect(() => {
    if (!path) { setUrl(null); setState(file ? "error" : "loading"); return; }
    let active = true;
    setUrl(null); setState("loading");
    supabase.storage.from("order-files").createSignedUrl(path, 3600).then(({ data, error }) => {
      if (!active) return;
      if (error || !data || !data.signedUrl) { setState("error"); return; }
      setUrl(data.signedUrl);
      setState(
        IMG_EXT.includes(e) ? "image"
        : FRAME_EXT.includes(e) ? "frame"
        : OFFICE_EXT.includes(e) ? "office"
        : VIDEO_EXT.includes(e) ? "video"
        : AUDIO_EXT.includes(e) ? "audio"
        : "fallback",
      );
    });
    return () => { active = false; };
  }, [path]);

  if (!file) return null;
  const m = fileMeta(file.name);
  const openTab = () => { if (url) window.open(url, "_blank", "noopener"); else if (onDownload) onDownload(file); };

  // Rendered through a PORTAL to <body>: position:fixed inside the app shell is
  // unreliable (the shell is zoomed + scroll-contained, which re-anchors fixed
  // elements in Chromium — the modal could land below the fold). On <body> it is
  // always glued to the real viewport and dead-centered. The wrapper carries
  // .mer-root so the design tokens (and the global density) still apply.
  return ReactDOM.createPortal(
    <div onClick={onClose} className="mer-root" style={{ position: "fixed", inset: 0, zIndex: 4000, height: "auto", width: "auto",
      background: "rgba(20,16,10,.66)", overflow: "hidden",
      backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", display: "grid", placeItems: "center",
      padding: "clamp(6px, 2.4vw, 22px)", animation: "rise .2s ease both" }}>
      <div onClick={(ev) => ev.stopPropagation()} className="mer-fp-panel" style={{ width: "min(1180px,100%)", height: "min(94vh,1040px)",
        maxHeight: "94vh", background: "var(--surface)", borderRadius: "var(--r-lg)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-pop)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: "1px solid var(--line)", flex: "0 0 auto" }}>
          <TypeBadge name={file.name} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{m.label}{file.size ? ` · ${file.size}` : ""}{file.at ? ` · ${file.at}` : ""}</div>
          </div>
          {url && <Button size="sm" variant="ghost" icon="expand" onClick={openTab}>Open</Button>}
          <Button size="sm" variant="soft" icon="download" onClick={() => onDownload && onDownload(file)}>Download</Button>
          <button onClick={onClose} title="Close (Esc)" aria-label="Close" style={{ width: 34, height: 34, borderRadius: 99, border: "none",
            background: "transparent", color: "var(--ink-2)", display: "grid", placeItems: "center", cursor: "pointer", flex: "0 0 34px" }}>
            <Icon name="x" size={19} />
          </button>
        </div>
        <div className="mer-fp-body" style={{ flex: 1, minHeight: 0, background: "#322d25", display: "flex", overflow: "hidden" }}>
          {state === "loading" && <div style={{ margin: "auto", color: "var(--faint)", fontFamily: "var(--mono)", fontSize: 13 }}>Loading preview…</div>}
          {state === "image" && url && (
            <div className="scroll" style={{ flex: 1, overflow: "auto", display: "grid", placeItems: "center", padding: 16 }}>
              <img src={url} alt={file.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 6, boxShadow: "0 10px 40px rgba(0,0,0,.45)" }} />
            </div>
          )}
          {state === "frame" && url && (
            <iframe src={url} title={file.name} style={{ flex: 1, width: "100%", height: "100%", border: "none", background: "#fff" }} />
          )}
          {state === "office" && url && (
            <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
              title={file.name} style={{ flex: 1, width: "100%", height: "100%", border: "none", background: "#fff" }} />
          )}
          {state === "video" && url && (
            <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 16, minWidth: 0 }}>
              <video src={url} controls playsInline style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8, boxShadow: "0 10px 40px rgba(0,0,0,.45)", background: "#000" }} />
            </div>
          )}
          {state === "audio" && url && (
            <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 24 }}>
              <div style={{ width: "min(560px, 100%)", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 19, color: "#E7DFCC", marginBottom: 16 }}>{file.name}</div>
                <audio src={url} controls style={{ width: "100%" }} />
              </div>
            </div>
          )}
          {(state === "fallback" || state === "error") && (
            <div style={{ margin: "auto", textAlign: "center", color: "#E7DFCC", padding: 28, maxWidth: 440 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(255,255,255,.08)", display: "grid", placeItems: "center", margin: "0 auto 16px", color: "#E7DFCC" }}><Icon name="files" size={30} /></div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 21, fontWeight: 500, marginBottom: 8 }}>
                {state === "error" ? "Preview unavailable" : `${(e || "This file").toUpperCase()} won't preview inline`}
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "#C8BEAA", margin: "0 0 18px" }}>
                {state === "error"
                  ? "We couldn't load this file right now — download it to open on your device."
                  : "This file type opens best on your device. Open it in a new tab or download it below."}
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                {url && state !== "error" && <Button size="sm" variant="primary" icon="expand" onClick={openTab}>Open in new tab</Button>}
                <Button size="sm" variant="soft" icon="download" onClick={() => onDownload && onDownload(file)}>Download file</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function PackageCard({ pkg, onDownload, onPreview }) {
  return (
    <div style={{ border: "1px solid var(--st-done-edge)", borderRadius: 14, overflow: "hidden", background: "var(--surface)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
        background: "var(--st-done-bg)", borderBottom: "1px solid var(--st-done-edge)" }}>
        <Icon name="package" size={17} style={{ color: "var(--st-done)" }} />
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>Final delivery</span>
        <span className="mono" style={{ fontSize: 10.5, color: "var(--st-done)" }}>v{pkg.version}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{pkg.at}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12 }}>
        {pkg.files.map((f, i) => <FileRow key={i} f={f} onDownload={onDownload} onPreview={onPreview} />)}
      </div>
    </div>
  );
}

function GatedFiles({ status }) {
  const qc = status === "in_review";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "20px 18px",
      border: "1px dashed var(--line-2)", borderRadius: 14, background: "var(--surface-2)" }}>
      <div style={{ width: 42, height: 42, borderRadius: 11, background: qc ? "var(--st-action-bg)" : "var(--surface)",
        border: "1px solid var(--line)", display: "grid", placeItems: "center",
        color: qc ? "var(--st-action)" : "var(--muted)", flex: "0 0 42px" }}>
        <Icon name="lock" size={20} />
      </div>
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>
          {qc ? "Your work is with our QC team" : "Your files aren't ready yet"}
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 2, lineHeight: 1.5 }}>
          {qc
            ? "We're checking quality and originality before release. Files unlock here the moment it's approved."
            : "Once your expert finishes and QC approves, your deliverables appear here."}
        </div>
      </div>
    </div>
  );
}

function Timeline({ items }) {
  return (
    <div style={{ position: "relative", paddingLeft: 6 }}>
      {items.map((t, i) => (
        <div key={i} style={{ display: "flex", gap: 16, position: "relative", paddingBottom: i < items.length - 1 ? 22 : 0 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto" }}>
            <span style={{ width: 13, height: 13, borderRadius: 99, marginTop: 3,
              background: t.highlight ? "var(--accent)" : "var(--surface)",
              border: `2px solid ${t.highlight ? "var(--accent)" : "var(--line-2)"}`,
              boxShadow: t.highlight ? "0 0 0 4px var(--accent-soft)" : "none", zIndex: 1 }} />
            {i < items.length - 1 && <span style={{ width: 2, flex: 1, background: "var(--line)", marginTop: 4 }} />}
          </div>
          <div style={{ flex: 1, paddingBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 3 }}>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>{t.label}</span>
              {t.at && <span className="mono" style={{ color: "var(--faint)", fontSize: 10.5 }}>{t.at}</span>}
            </div>
            <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5 }}>{t.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Panel({ title, children, pad = 22, action }) {
  return (
    <section style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: pad }}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          <h3 className="mono" style={{ margin: 0, color: "var(--ink-2)", fontSize: 11.5 }}>{title}</h3>
          <div style={{ flex: 1 }} />
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function BriefRow({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
      <span style={{ fontSize: 13.5, color: "var(--muted)" }}>{k}</span>
      <span style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 600, textAlign: "right" }}>{v}</span>
    </div>
  );
}

/* ---- "Your brief" — structured-by-AI panel ----------------- */
// Derive the 8 structured fields + the serif AI summary line from the order.
// Anything we can't determine is left null and rendered as a soft "Not specified".
function deriveBrief(o) {
  const spec = levelSpec(o.level_label);
  const subject = o.program || o.discipline || null;
  const sources = o.requirements || spec.sources;            // explicit reqs win when present
  const length = o.pages ? `${o.pages} pages (~${(o.pages * 275).toLocaleString()} words)` : null;
  const fields = [
    { k: "Deliverable", v: o.scope_label },
    { k: "Subject area", v: subject },
    { k: "Academic level", v: o.level_label },
    { k: "Scope", v: o.scope_label || "One assignment" },
    { k: "Citation style", v: o.citation || spec.citation },
    { k: "Sources", v: sources },
    { k: "Length", v: length },
    { k: "Due date", v: o.due_date },
  ];
  // AI summary line — built clause-by-clause, omitting any missing field.
  const parts = [];
  const lead = [o.level_label ? `${o.level_label}-level` : null, subject ? `${subject}` : null].filter(Boolean).join(" ");
  let head = `${lead || "Academic"} assignment`;
  if (o.title) head += ` — “${o.title}.”`;
  parts.push(head);
  const tail = [];
  if (o.scope_label) tail.push(o.scope_label);
  const written = [];
  if (o.citation || spec.citation) written.push(`written to ${o.citation || spec.citation}`);
  if (sources) written.push(`with ${sources} from the last five years`);
  let clause = tail.join(", ");
  if (written.length) clause = [clause, written.join(" ")].filter(Boolean).join(", ");
  clause = [clause, "and a formal academic tone"].filter(Boolean).join(" ");
  const summary = `${parts.join(" ")} ${clause}.`.replace(/\s+/g, " ").trim();
  return { fields, summary };
}

export function BriefPanel({ o }) {
  const { fields, summary } = deriveBrief(o);
  const dash = (v) => v == null || v === "" || v === "—";
  return (
    <Panel title="Your brief" action={
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 11px", borderRadius: 999,
        background: "var(--accent-soft)", color: "var(--accent-deep)", fontSize: 11, fontWeight: 600 }}>
        <Icon name="sparkle" size={12} /> Structured by Meridian AI
      </span>}>
      <p className="serif italic" style={{ margin: "0 0 16px", fontSize: 15.5, lineHeight: 1.6, color: "var(--ink)" }}>{summary}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--line)",
        border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", marginBottom: o.notes ? 16 : 0 }}>
        {fields.map((f, i) => (
          <div key={i} style={{ background: "var(--surface)", padding: "11px 14px" }}>
            <div className="mono" style={{ fontSize: 9.5, color: "var(--faint)", marginBottom: 3 }}>{f.k}</div>
            <div style={{ fontSize: 13.5, fontWeight: 500, fontStyle: dash(f.v) ? "italic" : "normal",
              color: dash(f.v) ? "var(--muted)" : "var(--ink)" }}>{dash(f.v) ? "Not specified" : f.v}</div>
          </div>
        ))}
      </div>
      {o.notes && (
        <div style={{ background: "var(--surface-2)", borderRadius: 12, padding: "13px 15px" }}>
          <span className="mono" style={{ fontSize: 10, color: "var(--muted)", display: "block", marginBottom: 7 }}>Your original request</span>
          <BriefNotes text={o.notes} bare italic quoted />
        </div>
      )}
    </Panel>
  );
}

/* live order conversation (order_messages, realtime) */
function OrderChat({ o, user, profile }) {
  const [msgs, setMsgs] = useState([]);
  const who = (o.writer && o.writer.name) || "your expert";
  const mapMsg = (r) => ({
    id: r.id,
    from: r.sender_id && user && r.sender_id === user.id ? "you" : "them",
    name: r.sender_name || (o.writer && o.writer.name) || "Meridian",
    body: r.body, time: fmtMsgTime(r.created_at), status: "read",
  });
  useEffect(() => {
    let active = true;
    supabase.from("order_messages").select("*").eq("order_id", o.id).eq("is_internal", false)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (active) setMsgs((data || []).map(mapMsg)); });
    const ch = supabase.channel(`order-${o.id}-msgs`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_messages", filter: `order_id=eq.${o.id}` },
        (payload) => { if (payload.new.is_internal) return; setMsgs((t) => t.some((x) => x.id === payload.new.id) ? t : [...t, mapMsg(payload.new)]); })
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [o.id]);
  async function send(text) {
    if (!user) return;
    const { data } = await supabase.from("order_messages").insert({
      order_id: o.id, sender_id: user.id, sender_name: profile?.name || user.email, body: text, is_internal: false,
    }).select().single();
    if (data) setMsgs((t) => t.some((x) => x.id === data.id) ? t : [...t, mapMsg(data)]);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
        <Avatar initials={initialsOf(who)} size={36} tone="progress" />
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{who}</div>
          <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{o.writer ? o.writer.specialty : "Meridian"}</div></div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, color: "var(--st-done)" }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--st-done)" }} /> Online
        </span>
      </div>
      <ChatThread messages={msgs} scrollKey={o.id} />
      <ChatComposer onSend={send} placeholder={`Message ${who.split(" ")[0]}…`} quick={["Thanks!", "Any update?", "Can we adjust the deadline?"]} />
    </div>
  );
}

const sizeMeta = (o) => {
  if (o.words) return `${o.words.toLocaleString()} words${o.pages ? ` · ${o.pages} pages` : ""}`;
  if (o.pages) return `${o.pages} pages`;
  return null;
};

/* ---- Star rating ------------------------------------------- */
// Interactive (onPick set) or read-only display of a 1–5 rating. Stars are
// gold (--accent) when filled, faint when empty.
const STAR_D = "M12 4l2.3 4.7 5.2.8-3.7 3.7.9 5.1L12 16l-4.6 2.4.9-5.1L4.6 9.5l5.2-.8z";
function StarRating({ value = 0, onPick, size = 26, gap = 4 }) {
  const [hover, setHover] = useState(0);
  const interactive = !!onPick;
  const shown = hover || value;
  return (
    <div style={{ display: "inline-flex", gap }} onMouseLeave={() => interactive && setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= shown;
        return (
          <span key={n}
            onClick={interactive ? () => onPick(n) : undefined}
            onMouseEnter={interactive ? () => setHover(n) : undefined}
            role={interactive ? "button" : undefined}
            aria-label={interactive ? `${n} star${n > 1 ? "s" : ""}` : undefined}
            style={{ display: "inline-flex", cursor: interactive ? "pointer" : "default",
              color: on ? "var(--accent)" : "var(--line-2)", transition: "color .12s, transform .12s",
              transform: interactive && n <= hover ? "scale(1.12)" : "none" }}>
            <svg width={size} height={size} viewBox="0 0 24 24" fill={on ? "currentColor" : "none"}
              stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d={STAR_D} />
            </svg>
          </span>
        );
      })}
    </div>
  );
}

/* ---- Client feedback — inline panel on the released rail ---- */
// Lets the client rate the delivery (1–5) + optional comment, upserting into
// order_feedback. Prefills + shows the submitted state when feedback exists.
function FeedbackPanel({ o, user, feedback, onSaved, notify }) {
  const existing = feedback && feedback.order_id === o.id ? feedback : null;
  const [editing, setEditing] = useState(!existing);
  const [rating, setRating] = useState(existing ? existing.rating : 0);
  const [comment, setComment] = useState(existing ? existing.comment || "" : "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEditing(!existing);
    setRating(existing ? existing.rating : 0);
    setComment(existing ? existing.comment || "" : "");
  }, [existing && existing.id, o.id]);

  async function submit() {
    if (!user) { notify && notify("Please sign in to leave feedback."); return; }
    if (!rating) { notify && notify("Pick a rating first."); return; }
    setBusy(true);
    const { data, error } = await supabase.from("order_feedback")
      .upsert({ order_id: o.id, client_id: user.id, rating, comment: comment.trim() || null },
        { onConflict: "order_id" })
      .select().single();
    setBusy(false);
    if (error || !data) { console.error(error); notify && notify("Could not save your feedback — try again."); return; }
    onSaved && onSaved(data);
    setEditing(false);
    notify && notify("Thanks for your feedback!");
  }

  if (!editing && existing) {
    return (
      <Panel pad={18} title="Your feedback">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: existing.comment ? 10 : 0 }}>
          <StarRating value={existing.rating} size={20} />
          <span style={{ fontSize: 13, color: "var(--muted)" }}>You rated this</span>
        </div>
        {existing.comment && (
          <p className="serif italic" style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.55, color: "var(--ink)" }}>“{existing.comment}”</p>
        )}
        <button onClick={() => setEditing(true)} style={{ background: "transparent", border: "none",
          color: "var(--accent)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>
          Edit feedback
        </button>
      </Panel>
    );
  }

  return (
    <Panel pad={18} title="Leave feedback">
      <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 12 }}>
        How was your experience? Your rating helps us improve.
      </div>
      <div style={{ marginBottom: 12 }}>
        <StarRating value={rating} onPick={setRating} size={30} gap={6} />
      </div>
      <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment (optional)…"
        style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10,
          border: "1px solid var(--line-2)", background: "var(--surface)", fontFamily: "var(--sans)",
          fontSize: 13.5, color: "var(--ink)", outline: "none", resize: "vertical", marginBottom: 12 }} />
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Button variant="primary" icon="check" disabled={busy || !rating} onClick={submit}>
          {existing ? "Update feedback" : "Submit feedback"}
        </Button>
        {existing && <Button variant="ghost" disabled={busy} onClick={() => setEditing(false)}>Cancel</Button>}
      </div>
    </Panel>
  );
}

export function OrderDetail({ o, user, profile, initialIntent, back, notify, go }) {
  const tn = MM.tone(o.status);
  const released = MM.isReleased(o);
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(null);
  const [feedback, setFeedback] = useState(null);   // client's rating/comment for this order
  const feedbackRef = useRef(null);

  // deep-link intent from dashboard CTAs: scroll to the invoice or files panel
  useEffect(() => {
    if (!initialIntent) return;
    const t = setTimeout(() => {
      const el = document.getElementById(initialIntent === "invoice" ? "mer-detail-invoice" : "mer-detail-files");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => clearTimeout(t);
  }, [initialIntent, o.id]);

  // files (+ realtime so a delivery appears the moment it lands)
  useEffect(() => {
    let active = true;
    const load = () => supabase.from("order_files").select("*").eq("order_id", o.id).order("created_at", { ascending: true })
      .then(({ data }) => { if (active) setFiles((data || []).map(normFile)); });
    load();
    const ch = supabase.channel(`order-${o.id}-files`)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_files", filter: `order_id=eq.${o.id}` }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [o.id]);

  // existing feedback for this order (released orders only — RLS allows the rest)
  useEffect(() => {
    if (!released) { setFeedback(null); return; }
    let active = true;
    supabase.from("order_feedback").select("*").eq("order_id", o.id).maybeSingle()
      .then(({ data }) => { if (active) setFeedback(data || null); });
    return () => { active = false; };
  }, [o.id, released]);

  const { uploads, submissions } = MM.buildFileView(files);
  const visibleSubs = MM.filesVisible(o) ? submissions : []; // RELEASE GATE (revision keeps last delivered version)
  const bal = MM.balance(o);
  const sm = sizeMeta(o);
  const rel = relPhrase(o.due_at);   // subtle "in N days" alongside the delivery date
  // Estimated-delivery block, shared by the in-progress + custom rail branches:
  // the date, with a quiet relative line beneath it (amber only when close/late).
  const estDelivery = o.due_date ? (
    <>
      <div style={{ marginBottom: 6, fontSize: 13, color: "var(--muted)" }}>Estimated delivery</div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600, color: "var(--ink)", marginBottom: rel ? 4 : 16 }}>{o.due_date}</div>
      {rel && <div style={{ fontSize: 12.5, fontWeight: rel.urgent ? 600 : 500, color: rel.urgent ? "var(--st-action)" : "var(--muted)", marginBottom: 16 }}>{rel.text[0].toUpperCase() + rel.text.slice(1)}</div>}
    </>
  ) : null;
  const timeline = o.timeline && o.timeline.length ? o.timeline : deriveTimeline(o);

  async function dl(f) {
    if (!f || !f.path) { notify && notify("Preparing your download…"); return; }
    const { data, error } = await supabase.storage.from("order-files").createSignedUrl(f.path, 120);
    if (error || !data?.signedUrl) { console.error(error); notify && notify("Could not open that file — try again."); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", animation: "rise .3s ease both" }}>
      <FilePreview file={preview} onClose={() => setPreview(null)} onDownload={dl} />
      {released && <Confetti />}
      <button onClick={back} style={{ display: "inline-flex", alignItems: "center", gap: 7,
        background: "transparent", border: "none", color: "var(--ink-2)", fontSize: 14, fontWeight: 500,
        padding: "4px 0", marginBottom: 18 }}>
        <Icon name="left" size={17} /> Back to orders
      </button>

      {released && (
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
          padding: "18px 22px", marginBottom: 22, borderRadius: "var(--r-lg)", overflow: "hidden",
          background: "linear-gradient(100deg, var(--st-done-bg), #EAF1E6)", border: "1px solid var(--st-done-edge)",
          animation: "rise .4s ease both" }}>
          <div style={{ width: 46, height: 46, borderRadius: 99, background: "var(--st-done)", color: "#fff",
            display: "grid", placeItems: "center", flex: "0 0 46px", animation: "pop .55s cubic-bezier(.2,.8,.3,1.3) .1s both" }}>
            <Icon name="check" size={25} stroke={2.6} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 21, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.01em" }}>Your work is ready.</div>
            <div style={{ fontSize: 13.5, color: "var(--ink-2)", marginTop: 2 }}>{o.due_date} — download your final files below.</div>
          </div>
          <Button variant="primary" icon="download" onClick={() => dl(visibleSubs[0] ? visibleSubs[0].files[0] : null)}>Download</Button>
        </div>
      )}

      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap", marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 10, flexWrap: "wrap" }}>
            <span className="mono" style={{ color: "var(--faint)", fontSize: 12 }}>{o.ref}</span>
            <span style={{ width: 3, height: 3, borderRadius: 99, background: "var(--faint)" }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-2)" }}>{o.program}</span>
            <StatusChip status={o.status} pulse={inProgressStatus(o.status)} />
            <PaymentBadge status={o.payment_status} />
          </div>
          <h1 style={{ margin: 0, fontFamily: "var(--serif)", fontSize: "clamp(26px, 4vw, 34px)", fontWeight: 500,
            letterSpacing: "-0.02em", lineHeight: 1.12, color: "var(--ink)", textWrap: "balance" }}>{o.title}</h1>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12 }}>
            {o.level_label && <Meta>{o.level_label}</Meta>}{o.scope_label && <Meta>{o.scope_label}</Meta>}
            {sm && <Meta>{sm}</Meta>}
            {o.created_at && <Meta>Placed {fmtWhen(o.created_at)}</Meta>}
          </div>
        </div>
      </div>

      {/* full tracker */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)",
        padding: "26px 24px", margin: "24px 0 26px" }}>
        <StageTracker variant="full" status={o.status} />
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: tn.color }} />
          <span style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>{MM.statusSentence(o)}</span>
        </div>
      </div>

      {/* two column */}
      <div className="mer-detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 22, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, minWidth: 0 }}>
          {/* deliverables — gated */}
          <div id="mer-detail-files" style={{ scrollMarginTop: 16 }}>
          <Panel title="Deliverables">
            {o.status === "revision" && visibleSubs.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "11px 14px",
                background: "var(--st-revision-bg)", border: "1px solid var(--st-revision-edge)", borderRadius: 11,
                fontSize: 13, color: "var(--ink-2)" }}>
                <Icon name="refresh" size={15} style={{ color: "var(--st-revision)", flex: "0 0 auto" }} />
                A revised version is on the way — your current files stay available below.
              </div>
            )}
            {visibleSubs.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {visibleSubs.map((p) => <PackageCard key={p.version} pkg={p} onDownload={dl} onPreview={setPreview} />)}
              </div>
            ) : <GatedFiles status={o.status} />}
          </Panel>
          </div>

          {/* uploads — client's own files, always visible */}
          {uploads.length > 0 && (
            <Panel title="Your uploads">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {uploads.map((f, i) => <FileRow key={i} f={f} onDownload={dl} onPreview={setPreview} />)}
              </div>
            </Panel>
          )}

          {o.writer && (
            <Panel title="Conversation">
              <OrderChat o={o} user={user} profile={profile} />
            </Panel>
          )}

          <Panel title="Updates"><Timeline items={timeline} /></Panel>

          {released && (
            <div ref={feedbackRef} style={{ scrollMarginTop: 16 }}>
              <FeedbackPanel o={o} user={user} feedback={feedback} onSaved={setFeedback} notify={notify} />
            </div>
          )}

          <BriefPanel o={o} />
        </div>

        {/* rail */}
        <div className="mer-rail" style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 0 }}>
          <div id="mer-detail-invoice" style={{ background: "var(--surface)", border: `1px solid ${tn.edge}`, borderRadius: "var(--r-lg)",
            padding: 22, borderTop: `4px solid ${tn.color}`, scrollMarginTop: 16 }}>
            {o.payment_status === "unpaid" && o.client_type !== "custom" && (
              o.invoice ? (
                <>
                  <div className="mono" style={{ color: "var(--st-action)", fontSize: 10.5, marginBottom: 10 }}>
                    Invoice {o.invoice.invoice_number}{o.invoice.issued_date ? ` · issued ${fmtDay(o.invoice.issued_date)}` : ""}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontFamily: "var(--serif)", fontSize: 40, fontWeight: 600, color: "var(--ink)" }}>${Number(o.invoice.total_due) || 0}</span>
                    <span style={{ fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap" }}>due</span>
                  </div>
                  <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
                    {o.invoice.status === "payment_declared"
                      ? "Payment declared — we're verifying receipt, usually within a few hours."
                      : o.invoice.status === "payment_flagged"
                        ? "We couldn't verify your payment. Open your invoice to check and re-send."
                        : "Open your invoice to choose how to pay — details are sent privately to your email, never shown here."}
                  </p>
                  <Button full variant="primary" icon="doc" onClick={() => go("invoice")}>View invoice &amp; pay</Button>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10, color: "var(--muted)", fontSize: 12 }}>
                    <Icon name="shield" size={13} /> Payment details delivered privately by email
                  </div>
                </>
              ) : (
                <>
                  <div className="mono" style={{ color: "var(--st-action)", fontSize: 10.5, marginBottom: 10 }}>Under review</div>
                  <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 14 }}>
                    Your invoice is on its way — we'll email you the moment it's ready, and it'll appear here to pay.
                  </div>
                  {o.writer && <Button full variant="soft" icon="chat" onClick={() => go("messages")}>Message us</Button>}
                </>
              )
            )}
            {o.payment_status === "unpaid" && o.client_type === "custom" && !released && (
              <>
                <div className="mono" style={{ color: tn.color, fontSize: 10.5, marginBottom: 12 }}>{MM.label(o.status, "client")}</div>
                <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 14 }}>{MM.statusSentence(o)}</div>
                {estDelivery}
                {o.writer && <Button full variant="primary" icon="chat" onClick={() => go("messages")}>Message your expert{o.unread ? ` · ${o.unread}` : ""}</Button>}
              </>
            )}
            {o.payment_status !== "unpaid" && !released && (
              <>
                <div className="mono" style={{ color: tn.color, fontSize: 10.5, marginBottom: 12 }}>{MM.label(o.status, "client")}</div>
                <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 14 }}>{MM.statusSentence(o)}</div>
                {estDelivery}
                {o.writer && <Button full variant="primary" icon="chat" onClick={() => go("messages")}>Message your expert{o.unread ? ` · ${o.unread}` : ""}</Button>}
              </>
            )}
            {released && (
              <>
                <div className="mono" style={{ color: "var(--st-done)", fontSize: 10.5, marginBottom: 10 }}>{MM.label(o.status, "client")}</div>
                {o.due_date && (
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 99, background: "var(--st-done-bg)",
                      display: "grid", placeItems: "center", color: "var(--st-done)" }}><Icon name="check" size={19} stroke={2.4} /></div>
                    <span style={{ fontSize: 14, color: "var(--ink)", fontWeight: 600 }}>{o.due_date}</span>
                  </div>
                )}
                <Button full variant="primary" icon="download" onClick={() => dl(visibleSubs[0] ? visibleSubs[0].files[0] : null)}>Download files</Button>
                <button onClick={() => feedbackRef.current && feedbackRef.current.scrollIntoView({ behavior: "smooth", block: "start" })}
                  style={{ width: "100%", marginTop: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
                    background: "transparent", border: "1px solid var(--line-2)", borderRadius: 10, color: "var(--ink-2)", fontSize: 13, fontWeight: 600, padding: "9px 8px", cursor: "pointer" }}>
                  <Icon name="star" size={15} style={{ color: "var(--accent)" }} />
                  {feedback ? "Edit your feedback" : "Leave feedback"}
                </button>
                {o.status !== "closed" && (
                  <button onClick={() => go("support")} style={{ width: "100%", marginTop: 10,
                    background: "transparent", border: "none", color: "var(--ink-2)", fontSize: 13, fontWeight: 600, padding: 8 }}>
                    Request a revision
                  </button>
                )}
              </>
            )}
          </div>

          {/* expert */}
          {o.writer && (
            <Panel pad={18} title="Your expert">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar initials={initialsOf(o.writer.name)} size={42} tone="progress" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>{o.writer.name}</div>
                  {o.writer.specialty && (
                    <div style={{ fontSize: 12.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                      <Icon name="star" size={12} style={{ color: "var(--accent)" }} /> {o.writer.specialty}
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          )}

          {/* summary — money rows hidden for custom clients (pre-arranged billing) */}
          <Panel pad={18} title="Order summary">
            {o.client_type !== "custom" && <>
              <BriefRow k="Order total" v={`$${o.quote_total || o.estimate_usd || 0}`} />
              {o.quote_deposit > 0 && o.quote_deposit < (o.quote_total || 0) && <BriefRow k="Deposit paid" v={`$${o.quote_deposit}`} />}
              <BriefRow k="Balance" v={bal > 0 ? `$${bal}` : "$0"} />
            </>}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12 }}>
              <span style={{ fontSize: 13.5, color: "var(--muted)" }}>Need help?</span>
              <button onClick={() => go("support")} style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 600, fontSize: 13.5 }}>Contact support</button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

export default OrderDetail;
