/* ============================================================
   Admin pages — Dashboard, Orders, Briefs, Clients, Writers,
   Support, Billing, Emails. ES module, wired.
   ============================================================ */
import React from "react";
import { supabase } from "../../lib/supabase.js";
import { Icon } from "../../workspace/kit/icons.jsx";
import { MM } from "../../workspace/kit/model.js";
import { Button, PaymentBadge, Avatar, Meta, SectionLabel } from "../../workspace/kit/components.jsx";
import { ChatThread, ChatComposer } from "../../workspace/kit/chat.jsx";
import { AM } from "./admin-model.js";
import { AdTopbar, SEL } from "./shell.jsx";
import { AdStatusPill } from "./drawer.jsx";

const { useState, useEffect, useRef } = React;
const fmtWhen = (ts) => { if (!ts) return ""; try { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return ts; } };

function AdStatCard({ label, value, tone, sub, icon }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r)", padding: "16px 18px", borderTop: `3px solid ${tone}`, boxShadow: "var(--shadow-card)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
        {icon && <span style={{ color: tone, display: "inline-flex" }}><Icon name={icon} size={15} /></span>}
        <span className="mono" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: ".06em" }}>{label}</span>
      </div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 27, fontWeight: 600, color: "var(--ink)", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}
// Panel header: optional leading icon (tone-colored) + uppercase mono title + count badge.
function AdPanel({ title, children, right, icon, iconTone, count, countTone }) {
  return (
    <section style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
      {title && <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
        {icon && <span style={{ display: "inline-flex", color: iconTone || "var(--accent)" }}><Icon name={icon} size={16} /></span>}
        <h3 className="mono" style={{ margin: 0, color: "var(--ink-2)", fontSize: 11.5, letterSpacing: ".06em" }}>{title}</h3>
        <div style={{ flex: 1 }} />{right}
        {count != null && <span style={{ fontSize: 11.5, fontWeight: 700, color: countTone || "var(--accent)", background: countTone ? "transparent" : "var(--accent-soft)", padding: "2px 9px", borderRadius: 99 }}>{count}</span>}</div>}
      {children}
    </section>
  );
}

/* ---- Centered form modal shell (matches the design's create-modal) ----
   Scrim (fadeIn) + panel (rise), header icon tile + serif title + sub + close. */
function FormModal({ icon = "user", title, sub, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 20px", overflowY: "auto" }}>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(24,24,38,.5)", animation: "fadeIn .18s ease both" }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", width: 520, maxWidth: "96vw", maxHeight: "92vh", background: "var(--paper)", borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-pop)", overflow: "hidden", animation: "rise .24s cubic-bezier(.22,1,.36,1) both" }}>
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 12, padding: "20px 24px", borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
          <span style={{ width: 40, height: 40, borderRadius: 11, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center", flex: "0 0 40px" }}><Icon name={icon} size={20} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 21, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink)", margin: 0, lineHeight: 1.1 }}>{title}</h2>
            {sub && <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "3px 0 0" }}>{sub}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--surface)", cursor: "pointer", color: "var(--ink-2)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 30px" }}><Icon name="x" size={16} /></button>
        </div>
        <div className="scroll" style={{ padding: "22px 24px", flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>
        {footer && <div style={{ flexShrink: 0, padding: "16px 24px", borderTop: "1px solid var(--line)", display: "flex", gap: 10, justifyContent: "flex-end", background: "var(--surface)" }}>{footer}</div>}
      </div>
    </div>
  );
}
const MODAL_LBL = { fontFamily: "var(--mono)", textTransform: "uppercase", fontSize: 10, color: "var(--muted)", letterSpacing: ".06em" };
const MODAL_INP = { display: "block", width: "100%", marginTop: 6, padding: "11px 12px", borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--surface)", fontFamily: "var(--sans)", fontSize: 13.5, color: "var(--ink)", outline: "none" };
// Pill switch matching the email-toggle styling, for the modal "send email" toggles.
function ModalToggle({ on, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", cursor: "pointer" }}>
      <span style={{ flex: 1, fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>{label}</span>
      <span onClick={(e) => { e.preventDefault(); onChange(!on); }} style={{ position: "relative", width: 44, height: 25, borderRadius: 99, background: on ? "var(--accent)" : "var(--line-2)", flex: "0 0 44px", transition: "background .15s" }}>
        <span style={{ position: "absolute", top: 2.5, left: on ? 22 : 2.5, width: 20, height: 20, borderRadius: 99, background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,.2)" }} />
      </span>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} style={{ display: "none" }} />
    </label>
  );
}

/* ---- Dashboard ---- */
export function AdDashboard({ orders, openDrawer }) {
  const inReview = orders.filter((o) => o.status === "in_review");
  const active = orders.filter((o) => ["assigned", "writing", "revision"].includes(o.status)).length;
  const unpaid = orders.filter((o) => o.payment_status === "unpaid").length;
  const revenue = orders.filter((o) => ["delivered", "closed"].includes(o.status)).reduce((a, o) => a + (o.quote_total || 0), 0);
  const byStatus = AM.STATUS_ORDER.map((s) => ({ s, n: orders.filter((o) => o.status === s).length })).filter((x) => x.n);
  const exportCsv = () => {
    const rows = [["Ref", "Title", "Client", "Status", "Payment", "Quote"], ...orders.map((o) => [o.ref, o.title, o.client_name || "", o.status, o.payment_status || "", o.quote_total || 0])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "meridian-orders.csv"; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div>
      <AdTopbar title="Dashboard" sub={`${orders.length} orders · ${inReview.length} awaiting QC`}
        right={<Button variant="ghost" icon="download" onClick={exportCsv}>Export</Button>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }} className="ops-grid4">
        <AdStatCard label="Awaiting QC" value={inReview.length} tone="var(--st-action)" sub="needs your review" icon="shield" />
        <AdStatCard label="Active" value={active} tone="var(--st-progress)" sub="in production" icon="pencil" />
        <AdStatCard label="Unpaid" value={unpaid} tone="#B23B3B" sub="invoice outstanding" icon="alert" />
        <AdStatCard label="Revenue" value={AM.money(revenue)} tone="var(--st-done)" sub="delivered orders" icon="wallet" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, alignItems: "start" }} className="ops-2col">
        <AdPanel title="Awaiting QC review" icon="shield" iconTone="var(--st-action)" count={inReview.length} countTone="var(--st-action)">
          {inReview.length ? inReview.map((o, i) => (
            <button key={o.id} onClick={() => openDrawer(o)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "13px 18px", border: "none", borderTop: i ? "1px solid var(--line)" : "none", background: "transparent", textAlign: "left", cursor: "pointer" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-2)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <span className="mono" style={{ color: "var(--faint)", fontSize: 11, flex: "0 0 auto" }}>{o.ref}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.title}</span>
              {o.updated_at && <span style={{ fontSize: 11.5, color: "var(--muted)", whiteSpace: "nowrap" }}>{MM.ago(o.updated_at)}</span>}
              {o.hasWork != null && <span style={{ fontSize: 12, color: o.hasWork ? "var(--st-done)" : "#B23B3B", fontWeight: 600 }}>{o.hasWork ? "ready" : "no files"}</span>}
              <Icon name="chevR" size={16} style={{ color: "var(--faint)" }} />
            </button>
          )) : <div style={{ padding: "26px 18px", color: "var(--muted)", fontSize: 13.5, textAlign: "center" }}>QC queue is clear 🎉</div>}
        </AdPanel>
        <AdPanel title="Pipeline by status">
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 11 }}>
            {byStatus.map(({ s, n }) => {
              const tn = MM.tone(s);
              return <div key={s} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 9, height: 9, borderRadius: 99, background: tn.color }} />
                <span style={{ fontSize: 13.5, color: "var(--ink)" }}>{MM.label(s, "admin")}</span>
                <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
                <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>{n}</span></div>;
            })}
            {!byStatus.length && <div style={{ color: "var(--muted)", fontSize: 13 }}>No orders yet.</div>}
          </div>
        </AdPanel>
      </div>
    </div>
  );
}

/* ---- Payment declarations queue ---- */
function PaymentQueue({ invoices, orders, clients, onAction, openDrawer, busy }) {
  const [flagFor, setFlagFor] = useState(null);
  const [note, setNote] = useState("");
  const pending = (invoices || []).filter((i) => ["payment_declared", "payment_flagged", "link_pending"].includes(i.status));
  if (!pending.length) return null;
  const methodLabel = (i) => (MM.PAYMENT_METHOD_CATALOG.find((m) => m.id === i.payment_method) || {}).label || i.payment_method || "";
  const orderFor = (i) => orders.find((o) => o.id === i.order_id);
  const fmtTs = (ts) => { try { const d = new Date(ts); return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); } catch { return ""; } };
  const nameOf = (i) => (clients.find((c) => c.id === i.client_id) || {}).name
    || (orders.find((o) => o.id === i.order_id) || {}).client_name || "Client";
  return (
    <AdPanel title="Payments to action" icon="wallet" iconTone="var(--accent)" count={pending.length}
      right={<span style={{ fontSize: 11.5, color: "var(--muted)" }}>{pending.filter((i) => i.status === "payment_declared").length} declared · {pending.filter((i) => i.status === "link_pending").length} need a link</span>}>
      {pending.map((i, idx) => (
        <div key={i.id} style={{ padding: "14px 18px", borderTop: idx ? "1px solid var(--line)" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--faint)" }}>{i.invoice_number}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{nameOf(i)}</span>
            {i.status === "payment_flagged" && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--st-revision)", background: "var(--st-revision-bg)", padding: "2px 9px", borderRadius: 99 }}>Flagged</span>}
            {i.status === "link_pending" && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--st-progress)", background: "var(--st-progress-bg)", padding: "2px 9px", borderRadius: 99 }}>Link required</span>}
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>{AM.money(Number(i.total_due))}</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", margin: "4px 0 10px" }}>
            {methodLabel(i) ? `${methodLabel(i)} · ` : ""}
            {i.status === "link_pending"
              ? `Selected ${fmtTs(i.link_pending_at) || "recently"} — generate & send a payment link`
              : i.declared_at ? `Declared ${fmtTs(i.declared_at)}` : "Awaiting re-declaration"}
          </div>
          {flagFor === i.id ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input style={{ ...SEL, flex: "1 1 240px", width: "auto" }} maxLength={200} value={note}
                onChange={(e) => setNote(e.target.value)} placeholder="Add a note for the client (optional)…" />
              <Button size="sm" variant="primary" disabled={busy} onClick={async () => { if (await onAction(i, "flag", note)) { setFlagFor(null); setNote(""); } }}>Send</Button>
              <Button size="sm" variant="ghost" onClick={() => { setFlagFor(null); setNote(""); }}>Cancel</Button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {i.status === "payment_declared" && <>
                <Button size="sm" variant="primary" icon="check" disabled={busy} onClick={() => onAction(i, "confirm")}>Confirm payment</Button>
                <Button size="sm" variant="soft" icon="x" disabled={busy} onClick={() => setFlagFor(i.id)}>Flag / reject</Button>
              </>}
              {i.status === "payment_flagged" && (
                <Button size="sm" variant="soft" icon="check" disabled={busy} onClick={() => onAction(i, "confirm")}>Mark as paid</Button>
              )}
              {i.status === "link_pending" && (
                <Button size="sm" variant="primary" icon="send" disabled={busy || !orderFor(i)} onClick={() => openDrawer && openDrawer(orderFor(i))}>Send payment link →</Button>
              )}
            </div>
          )}
        </div>
      ))}
    </AdPanel>
  );
}

/* ============================================================
   New order modal — create an order on behalf of a client, with an
   AI-intake panel (pure deterministic auto-scope via AM.scopeIntake)
   and a live auto-scope card. Submits through onCreate (→ Supabase).
   ============================================================ */
const TEXT_LIKE = /\.(txt|md|markdown|rtf|csv|tsv|html?|json|tex)$/i;
const fmtSize = (bytes) => bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(bytes / 1024)) + " KB";

export function NewOrderModal({ clients, writers, orders, onCreate, onClose, notify }) {
  // client roster for matching/options — normalize to { id, name, email }
  const roster = (clients || []).map((c) => ({ id: c.id, name: c.name || c.email, email: c.email }));
  const orderCountFor = (email) => (orders || []).filter((o) => (o.client_email || "").toLowerCase() === (email || "").toLowerCase()).length;
  const first = roster[0];
  const [form, setForm] = useState({
    clientId: first ? first.id : "", title: "", program: "", level: "Graduate",
    scope: "One assignment", value: "", due: "", expertId: "", payment: "unpaid",
    instructions: "", cite: "", src: "", len: "",
  });
  const [intakeText, setIntakeText] = useState("");
  const [attachments, setAttachments] = useState([]);   // { name, size, text }
  const [stage, setStage] = useState("idle");            // idle | analyzing | drafted
  const [meta, setMeta] = useState(null);                // { chips, confidence, filled, fromFiles }
  const [busy, setBusy] = useState(false);
  const timerRef = useRef(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const selClient = roster.find((c) => c.id === form.clientId) || null;

  // live auto-scope card — derived from level + program (+ any AI overrides)
  const spec = AM.scopeSpec(form.level, form.program || "—", { cite: form.cite, src: form.src, len: form.len });

  async function onIntakeFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const items = [];
    for (const fl of files) {
      let text = "";
      if (TEXT_LIKE.test(fl.name) && fl.size < 400000) { try { text = await fl.text(); } catch (_) {} }
      items.push({ name: fl.name, size: fmtSize(fl.size), size_bytes: fl.size, text, file: fl });
    }
    e.target.value = "";
    setAttachments((prev) => [...prev, ...items]);
    const readable = items.filter((i) => i.text).length;
    notify && notify(`${items.length} file${items.length > 1 ? "s" : ""} attached` + (readable ? " · contents will be scoped" : " · filename used for scoping"));
  }
  const removeAttachment = (i) => setAttachments((prev) => prev.filter((_, ix) => ix !== i));

  function runIntake() {
    const typed = (intakeText || "").trim();
    const names = attachments.map((a) => a.name).join(" ");
    const texts = attachments.map((a) => a.text || "").filter(Boolean).join("\n");
    const analysisText = [typed, names, texts].filter(Boolean).join("\n");
    if (analysisText.length < 8) { notify && notify("Paste a request or attach a file first"); return; }
    setStage("analyzing");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const r = AM.scopeIntake(analysisText, roster);
      const sourceNote = typed || (names ? "Scoped from uploaded file(s): " + names : r.instructions);
      setForm((f) => ({
        ...f,
        clientId: (r.matchedClient && r.matchedClient.id) || f.clientId,
        title: r.title, program: r.program, level: r.level, scope: r.scope,
        value: String(r.value), due: r.due || f.due,
        cite: r.cite, src: r.src, len: r.len,
        instructions: (f.instructions ? f.instructions + "\n\n" : "") + sourceNote,
      }));
      setMeta({ chips: r.chips, confidence: r.confidence, filled: r.filled, fromFiles: attachments.length });
      setStage("drafted");
      notify && notify(`Drafted ${r.filled} fields · ${r.confidence.toLowerCase()}`);
    }, 1000);
  }

  async function submit() {
    if (!selClient) { notify && notify("Pick a client for the order"); return; }
    if (!(form.title || "").trim()) { notify && notify("Add an order title"); return; }
    setBusy(true);
    const ok = await onCreate({
      client: selClient, title: form.title.trim(), program: form.program.trim(),
      level: form.level, scope: form.scope, value: Number(form.value) || 0,
      due: form.due.trim(), expertId: form.expertId, payment: form.payment,
      instructions: form.instructions.trim(), spec, attachments,
    });
    setBusy(false);
    if (ok) onClose();
  }

  // temp-login note (TEMP_LIMIT = 5) — based on the chosen client's order count
  const seq = selClient ? orderCountFor(selClient.email) + 1 : 0;
  const temp = seq > 0 && seq <= AM.TEMP_LIMIT;
  const noteText = !selClient ? "Select a client to see how their access is handled."
    : temp ? `Order ${seq} of 5 for ${selClient.name} — the notification email will carry the client's temporary login details so they can reach their workspace and this work.`
    : `Order ${seq} for ${selClient.name} — beyond the first 5, so the client already has workspace access and no login is attached.`;
  const noteStyle = { display: "flex", gap: 11, padding: "13px 15px", borderRadius: 12, fontSize: 12.5, lineHeight: 1.5,
    background: temp ? "var(--accent-soft)" : "var(--surface-2)", border: `1px solid ${temp ? "rgba(67,71,158,.3)" : "var(--line)"}`,
    color: temp ? "var(--accent-deep)" : "var(--muted)" };

  const lbl = { fontFamily: "var(--mono)", textTransform: "uppercase", fontSize: 10, color: "var(--muted)", letterSpacing: ".06em" };
  const inp = { display: "block", width: "100%", marginTop: 6, padding: "11px 12px", borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--surface)", fontFamily: "var(--sans)", fontSize: 13.5, color: "var(--ink)", outline: "none" };
  const confTone = meta?.confidence === "High confidence" ? "var(--st-done)" : meta?.confidence === "Good confidence" ? "var(--st-progress)" : "var(--muted)";
  const scopeRows = [{ k: "Citation", v: spec.cite }, { k: "Sources", v: spec.src }, { k: "Length", v: spec.len }, { k: "Subject", v: spec.subject }];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 20px", overflowY: "auto" }}>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(24,24,38,.5)" }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", width: 620, maxWidth: "96vw", maxHeight: "92vh", background: "var(--paper)", borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-pop)", overflow: "hidden", animation: "rise .24s cubic-bezier(.22,1,.36,1) both" }}>
        {/* header */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 12, padding: "20px 24px", borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
          <span style={{ width: 40, height: 40, borderRadius: 11, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center", flex: "0 0 40px" }}><Icon name="briefcase" size={20} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 21, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink)", margin: 0, lineHeight: 1.1 }}>New order</h2>
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "3px 0 0" }}>Create an order on behalf of a client and assign it</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--surface)", cursor: "pointer", color: "var(--ink-2)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 30px" }}><Icon name="x" size={16} /></button>
        </div>

        {/* body */}
        <div className="scroll" style={{ padding: "22px 24px", flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* AI intake panel */}
          <div style={{ flexShrink: 0, border: "1px solid rgba(67,71,158,.2)", borderRadius: 15, overflow: "hidden", background: "linear-gradient(152deg,#ECECF7 0%,var(--surface) 54%)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px 0" }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(145deg,#565ABB 0%,#363A86 100%)", color: "#fff", display: "grid", placeItems: "center", flex: "0 0 34px", boxShadow: "0 4px 12px -3px rgba(67,71,158,.6)" }}><Icon name="sparkle" size={17} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", letterSpacing: "-.01em", whiteSpace: "nowrap" }}>AI intake</span>
                  <span className="mono" style={{ fontSize: 8.5, fontWeight: 700, color: "var(--accent)", background: "var(--surface)", border: "1px solid var(--accent-soft)", padding: "2px 6px 1px", borderRadius: 5, letterSpacing: ".1em" }}>AUTO-SCOPE</span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 2 }}>Draft the order from the client's request or rubric</div>
              </div>
            </div>
            <div style={{ padding: "12px 16px 15px" }}>
              <textarea value={intakeText} onChange={(e) => setIntakeText(e.target.value)} rows={5}
                placeholder="Paste the client's message or rubric — e.g. “Hi, I need help with my DNP evidence-based practice care plan in APA 7, about 2,500 words and 8 sources, due next Friday.”"
                style={{ display: "block", width: "100%", minHeight: 132, padding: "13px 14px", borderRadius: 11, border: "1px solid var(--line-2)", background: "var(--surface)", fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.6, color: "var(--ink)", outline: "none", resize: "vertical" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 16px", borderRadius: 999, border: "1px solid var(--line-2)", background: "var(--surface)", color: "var(--ink-2)", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", cursor: "pointer" }}>
                  <Icon name="paperclip" size={15} /> Attach files
                  <input type="file" multiple onChange={onIntakeFiles} style={{ display: "none" }} />
                </label>
                <span style={{ fontSize: 11.5, color: "var(--muted)", flex: 1, minWidth: 80 }}>Paste text, upload several files, or both — then draft.</span>
                <button onClick={runIntake} disabled={stage === "analyzing"} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: 999, border: "none", background: "var(--accent)", color: "var(--on-accent)", fontWeight: 600, fontSize: 13.5, whiteSpace: "nowrap", cursor: stage === "analyzing" ? "default" : "pointer", boxShadow: "0 4px 12px -3px rgba(67,71,158,.6)" }}>
                  <Icon name="sparkle" size={15} /> {stage === "analyzing" ? "Analyzing…" : stage === "drafted" ? "Re-analyze" : "Draft order with AI"}
                </button>
              </div>
              {attachments.length > 0 && (
                <div style={{ marginTop: 12, padding: "11px 13px", borderRadius: 11, background: "var(--accent-soft)", border: "1px solid rgba(67,71,158,.18)" }}>
                  <div className="mono" style={{ textTransform: "uppercase", fontSize: 9, color: "var(--accent-deep)", letterSpacing: ".06em", marginBottom: 9 }}>{attachments.length} file{attachments.length > 1 ? "s" : ""} attached</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {attachments.map((fl, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 9, background: "var(--surface)", border: "1px solid var(--line)" }}>
                        <Icon name="doc" size={14} style={{ color: "var(--muted)" }} />
                        <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fl.name}</span>
                        <span style={{ fontSize: 10.5, color: "var(--faint)", whiteSpace: "nowrap" }}>{fl.size}</span>
                        <button onClick={() => removeAttachment(i)} aria-label="Remove file" style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center", flex: "0 0 22px", color: "var(--ink-2)" }}><Icon name="x" size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {stage === "drafted" && meta && (
                <div style={{ marginTop: 12, padding: "13px 14px", borderRadius: 12, background: "var(--st-done-bg)", border: "1px solid var(--st-done-edge)", animation: "rise .22s cubic-bezier(.22,1,.36,1) both" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 11 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 99, background: "var(--surface)", border: "1px solid var(--st-done-edge)", color: "var(--st-done)", display: "grid", placeItems: "center", flex: "0 0 22px" }}><Icon name="check" size={13} /></span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", flex: 1 }}>Draft ready — {meta.filled} field{meta.filled !== 1 ? "s" : ""} filled</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: confTone, background: "var(--surface)", border: `1px solid ${confTone}`, padding: "2px 9px", borderRadius: 99 }}>{meta.confidence}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {meta.chips.map((ch, i) => (
                      <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px 3px 8px", borderRadius: 999, background: "var(--surface)", border: "1px solid var(--st-done-edge)", fontSize: 11, color: "var(--ink)", whiteSpace: "nowrap" }}>
                        <span className="mono" style={{ textTransform: "uppercase", fontSize: 8.5, color: "var(--st-done)", letterSpacing: ".05em" }}>{ch.k}</span>{ch.v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {stage === "analyzing" && (
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 11, padding: "13px 14px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--line)" }}>
                  <span style={{ display: "inline-flex", gap: 4, flex: "0 0 auto" }}>
                    {[0, 0.2, 0.4].map((d, i) => (
                      <span key={i} style={{ width: 7, height: 7, borderRadius: 99, background: "var(--accent)", animation: "pulse-dot 1.2s ease-in-out infinite", animationDelay: `${d}s` }} />
                    ))}
                  </span>
                  <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Reading the request — detecting level, subject, scope &amp; citation…</span>
                </div>
              )}
            </div>
          </div>

          {/* divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
            <span className="mono" style={{ fontSize: 9.5, color: "var(--faint)", textTransform: "uppercase", letterSpacing: ".08em" }}>Order details</span>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
          </div>

          {/* client */}
          <label style={{ display: "block" }}>
            <span style={lbl}>Client</span>
            <select value={form.clientId} onChange={(e) => set({ clientId: e.target.value })} style={{ ...inp, cursor: "pointer" }}>
              {!roster.length && <option value="">No clients yet</option>}
              {roster.map((c) => <option key={c.id} value={c.id}>{c.name} · {orderCountFor(c.email)} orders</option>)}
            </select>
          </label>
          {/* title */}
          <label style={{ display: "block" }}>
            <span style={lbl}>Order title</span>
            <input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Evidence-Based Care Plan Analysis" style={inp} />
          </label>
          {/* program / level */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <label style={{ display: "block" }}>
              <span style={lbl}>Program / code</span>
              <input value={form.program} onChange={(e) => set({ program: e.target.value })} placeholder="NURS-6630" style={inp} />
            </label>
            <label style={{ display: "block" }}>
              <span style={lbl}>Level</span>
              <select value={form.level} onChange={(e) => set({ level: e.target.value })} style={{ ...inp, cursor: "pointer" }}>
                {["Undergraduate", "Graduate", "Doctoral"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
          </div>
          {/* scope / quote / due */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <label style={{ display: "block" }}>
              <span style={lbl}>Scope</span>
              <select value={form.scope} onChange={(e) => set({ scope: e.target.value })} style={{ ...inp, cursor: "pointer" }}>
                {["One assignment", "Full program"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label style={{ display: "block" }}>
              <span style={lbl}>Quote ($)</span>
              <input value={form.value} onChange={(e) => set({ value: e.target.value })} type="number" placeholder="340" style={inp} />
            </label>
            <label style={{ display: "block" }}>
              <span style={lbl}>Due</span>
              <input value={form.due} onChange={(e) => set({ due: e.target.value })} placeholder="Jun 22" style={inp} />
            </label>
          </div>
          {/* expert / payment */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
            <label style={{ display: "block" }}>
              <span style={lbl}>Assign expert</span>
              <select value={form.expertId} onChange={(e) => set({ expertId: e.target.value })} style={{ ...inp, cursor: "pointer" }}>
                <option value="">Unassigned — leave in New queue</option>
                {(writers || []).map((w) => <option key={w.id} value={w.id}>{w.name} · {w.specialty || "General"}</option>)}
              </select>
            </label>
            <label style={{ display: "block" }}>
              <span style={lbl}>Payment</span>
              <select value={form.payment} onChange={(e) => set({ payment: e.target.value })} style={{ ...inp, cursor: "pointer" }}>
                <option value="unpaid">Unpaid</option>
                <option value="deposit_paid">Deposit paid</option>
                <option value="paid_in_full">Paid in full</option>
              </select>
            </label>
          </div>
          {/* instructions */}
          <label style={{ display: "block" }}>
            <span style={lbl}>Additional instructions</span>
            <textarea value={form.instructions} onChange={(e) => set({ instructions: e.target.value })} rows={3} placeholder="Rubric notes, professor preferences, sources to use, formatting requirements…" style={{ ...inp, lineHeight: 1.55, resize: "vertical" }} />
          </label>

          {/* live auto-scope card */}
          <div style={{ flexShrink: 0, border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", background: "var(--surface)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", borderBottom: "1px solid var(--line)", background: "var(--accent-soft)" }}>
              <Icon name="sparkle" size={14} style={{ color: "var(--accent-deep)" }} />
              <span className="mono" style={{ textTransform: "uppercase", fontSize: 10, color: "var(--accent-deep)", letterSpacing: ".06em", flex: 1 }}>Auto-scoped · same logic as the client brief</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--line)" }}>
              {scopeRows.map((sp, i) => (
                <div key={i} style={{ background: "var(--surface)", padding: "10px 14px" }}>
                  <div className="mono" style={{ textTransform: "uppercase", fontSize: 9, color: "var(--faint)", letterSpacing: ".06em", marginBottom: 3 }}>{sp.k}</div>
                  <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>{sp.v}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: "11px 14px", fontSize: 12, color: "var(--muted)", lineHeight: 1.5, borderTop: "1px solid var(--line)" }}>{spec.summary}</div>
          </div>

          {/* temp-login note */}
          <div style={noteStyle}>
            <span style={{ display: "inline-flex", flex: "0 0 auto", marginTop: 1 }}><Icon name={temp ? "lock" : "check"} size={15} /></span>
            <span>{noteText}</span>
          </div>
        </div>

        {/* footer */}
        <div style={{ flexShrink: 0, padding: "16px 24px", borderTop: "1px solid var(--line)", display: "flex", gap: 10, justifyContent: "flex-end", background: "var(--surface)" }}>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" icon="check" disabled={busy} onClick={submit}>{busy ? "Creating…" : "Create order"}</Button>
        </div>
      </div>
    </div>
  );
}

/* ---- Orders (table + board) ---- */
export function AdOrders({ orders, invoices, clients, writers, openDrawer, onInvoiceAction, onCreateOrder, onNewOrder, notify, busy }) {
  const [view, setView] = useState("table");
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? orders : filter === "qc" ? orders.filter((o) => o.status === "in_review") : orders.filter((o) => o.status === filter);
  const toggle = (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <select style={{ ...SEL, width: "auto", padding: "8px 10px", fontSize: 13 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="all">All statuses</option><option value="qc">Awaiting QC</option>
        {AM.STATUS_ORDER.map((s) => <option key={s} value={s}>{AM.statusLabel(s)}</option>)}
      </select>
      <div style={{ display: "flex", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 9, padding: 3 }}>
        {[["table", "table"], ["board", "columns"]].map(([v, ic]) => (
          <button key={v} onClick={() => setView(v)} aria-label={v} style={{ width: 32, height: 28, borderRadius: 6, border: "none", background: view === v ? "var(--surface)" : "transparent", color: view === v ? "var(--ink)" : "var(--ink-2)", display: "grid", placeItems: "center", cursor: "pointer", boxShadow: view === v ? "var(--shadow-card)" : "none" }}><Icon name={ic} size={16} /></button>
        ))}
      </div>
      <Button variant="primary" icon="plus" onClick={onNewOrder}>New order</Button>
    </div>
  );
  return (
    <div>
      <AdTopbar title="Orders" sub={`${filtered.length} shown`} right={toggle} />
      <div style={{ marginBottom: 18 }}>
        <PaymentQueue invoices={invoices} orders={orders} clients={clients || []} onAction={onInvoiceAction} openDrawer={openDrawer} busy={busy} />
      </div>
      {view === "table" ? (
        <AdPanel>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
              <thead><tr style={{ borderBottom: "1px solid var(--line)" }}>
                {["Ref", "Order", "Status", "Expert", "Payment"].map((h) => <th key={h} className="mono" style={{ textAlign: "left", padding: "12px 16px", fontSize: 10, color: "var(--muted)", fontWeight: 600, letterSpacing: ".06em" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {filtered.map((o) => {
                  const done = ["delivered", "closed"].includes(o.status);
                  const r = done ? null : MM.relDue(o.due_at);
                  const pr = AM.priority(o.priority);
                  return (
                  <tr key={o.id} onClick={() => openDrawer(o)} style={{ borderBottom: "1px solid var(--line)", cursor: "pointer" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-2)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "13px 16px" }}><span className="mono" style={{ fontSize: 11.5, color: "var(--faint)" }}>{o.ref}</span></td>
                    <td style={{ padding: "13px 16px", maxWidth: 320 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.title}</div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{o.client_name || "—"} · {o.program}
                        {o.priority && o.priority !== "normal" ? <span style={{ color: pr.color, fontWeight: 700 }}> · {pr.label}</span> : null}
                        {o.due_date ? <span> · {o.due_date}</span> : null}
                        {r ? <span style={{ color: r.urgent ? "var(--st-action)" : "var(--muted)", fontWeight: 700 }}> · {r.text}</span> : null}</div>
                    </td>
                    <td style={{ padding: "13px 16px" }}><AdStatusPill status={o.status} /></td>
                    <td style={{ padding: "13px 16px", fontSize: 13, color: o.writer ? "var(--ink)" : "var(--faint)", whiteSpace: "nowrap" }}>{o.writer ? o.writer.name : "Unassigned"}</td>
                    <td style={{ padding: "13px 16px" }}><PaymentBadge status={o.payment_status} /></td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AdPanel>
      ) : (
        <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8 }}>
          {AM.STATUS_ORDER.filter((s) => s !== "closed").map((s) => {
            const items = filtered.filter((o) => o.status === s); const tn = MM.tone(s);
            return (
              <div key={s} style={{ flex: "0 0 260px", width: 260, background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 16, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 4px" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: tn.color }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{MM.label(s, "admin")}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--faint)" }}>{items.length}</span>
                </div>
                {items.map((o) => (
                  <button key={o.id} onClick={() => openDrawer(o)} style={{ textAlign: "left", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 13, cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><span className="mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>{o.ref}</span><div style={{ flex: 1 }} /><span style={{ fontSize: 11, fontWeight: 600, color: AM.priority(o.priority).color }}>{AM.priority(o.priority).label}</span></div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3, marginBottom: 8 }}>{o.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{o.writer ? o.writer.name : "Unassigned"} · {o.due_date || "—"}{(() => { const done = ["delivered", "closed"].includes(o.status); const r = done ? null : MM.relDue(o.due_at); return r ? <span style={{ color: r.urgent ? "var(--st-action)" : "var(--muted)", fontWeight: 700 }}> · {r.text}</span> : null; })()}</div>
                  </button>
                ))}
                {!items.length && <div style={{ padding: "16px 8px", textAlign: "center", color: "var(--faint)", fontSize: 12 }}>—</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---- Briefs ---- */
export function AdBriefs({ briefs, orders, onConvert, busy }) {
  const decorated = (briefs || []).map((b) => ({ b, order: AM.orderForBrief(b, orders) }));
  const awaiting = decorated.filter((d) => !d.order).length;
  const tracked = decorated.length - awaiting;
  return (
    <div>
      <AdTopbar title="Incoming briefs" sub={`${awaiting} awaiting conversion${tracked ? ` · ${tracked} already tracked` : ""}`} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {decorated.map(({ b, order }) => (
          <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 16, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 20, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>{b.topic || b.title || "Brief"}</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>{b.discipline && <Meta>{b.discipline}</Meta>}{b.level && <Meta>{b.level}</Meta>}{b.scope && <Meta>{b.scope}</Meta>}{b.created_at && <Meta mono>{fmtWhen(b.created_at)}</Meta>}{!order && b.created_at && (() => { const stale = (new Date() - new Date(b.created_at)) / 86400000 >= 2; return <span style={{ fontSize: 11.5, fontWeight: 700, color: stale ? "var(--st-action)" : "var(--muted)" }}>waiting {MM.ago(b.created_at).replace(/ ago$/, "")}</span>; })()}</div>
              {b.email && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>{b.email}</div>}
            </div>
            {order ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--st-done)", background: "var(--st-done-bg)", border: "1px solid var(--st-done-edge)", padding: "6px 12px", borderRadius: 99, whiteSpace: "nowrap" }}>
                  <Icon name="check" size={14} /> Order created · {order.ref}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--muted)" }}>Already tracked — open it under Orders.</span>
              </div>
            ) : (
              <Button variant="primary" icon="arrow" disabled={busy} onClick={() => onConvert(b)}>Convert to order</Button>
            )}
          </div>
        ))}
        {!briefs.length && <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>All briefs converted 🎉</div>}
      </div>
    </div>
  );
}

/* ---- Clients ---- */
/* ---- destructive delete confirmation (handles the open-work choice inline) ---- */
function ConfirmDelete({ name, role, body, busy, blocked, onConfirm, onArchive, onPurge, onClose }) {
  const danger = { padding: "11px 18px", borderRadius: 999, border: "none", background: "#B23B3B", color: "#fff", fontWeight: 600, fontSize: 14, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 };
  const choice = { display: "block", width: "100%", textAlign: "left", padding: "13px 15px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--surface-2)", cursor: busy ? "default" : "pointer", marginBottom: 10, fontFamily: "var(--sans)" };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 4000, background: "rgba(24,24,38,.5)", backdropFilter: "blur(2px)", display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(480px,100%)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 24, boxShadow: "var(--shadow-pop)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, background: "#F6E0DE", color: "#B23B3B", display: "grid", placeItems: "center", flex: "0 0 38px" }}><Icon name="alert" size={20} /></span>
          <h3 style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 19, fontWeight: 600, color: "var(--ink)" }}>{blocked ? `${name} has open work` : `Delete ${name}?`}</h3>
        </div>
        {!blocked ? (
          <>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6, margin: "0 0 20px" }}>{body} <b style={{ color: "var(--ink)" }}>This can't be undone.</b></p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
              <button onClick={onConfirm} disabled={busy} style={danger}>{busy ? "Deleting…" : "Delete permanently"}</button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6, margin: "0 0 16px" }}>
              {[blocked.activeOrders ? `${blocked.activeOrders} active order${blocked.activeOrders > 1 ? "s" : ""}` : "", blocked.openInvoices ? `${blocked.openInvoices} open invoice${blocked.openInvoices > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ")}. Choose how to handle the orders before removing the account:
            </p>
            <button onClick={onArchive} disabled={busy} style={choice}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Archive their orders &amp; delete</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>Keep the order records (hidden from active views), then remove the account. Recommended.</div>
            </button>
            <button onClick={onPurge} disabled={busy} style={{ ...choice, borderColor: "#E7C3BC", background: "#FBEDEA" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#B23B3B" }}>Delete their orders too</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>Permanently remove the orders as well. For confirmed test data — can't be undone.</div>
            </button>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---- per-user lifecycle actions: deactivate (reversible) + delete (permanent) ---- */
function UserActions({ id, name, role, disabled, onUserAction }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(null);   // { activeOrders, openInvoices } → show the orders choice
  if (!id) return null;   // orphaned row with no account to act on
  const run = async (action, mode) => {
    setBusy(true);
    const r = await onUserAction(id, role, action, name, mode);
    setBusy(false);
    if (action === "delete") {
      if (r?.blocked) setBlocked(r.info);             // client with open work → offer archive/purge
      else if (r?.ok) { setConfirm(false); setBlocked(null); }
    }
  };
  const body = role === "expert"
    ? "Their expert account and login are removed. Any active assignments are unassigned and returned to the pool."
    : "Their account and login are removed. Their invoices & payment links are deleted; past orders are kept but unassigned.";
  const pill = { fontSize: 11.5, fontWeight: 600, padding: "4px 11px", borderRadius: 99, border: "none", cursor: busy ? "default" : "pointer" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
      {disabled && <span className="mono" style={{ fontSize: 9, color: "var(--muted)", background: "var(--surface-2)", border: "1px solid var(--line)", padding: "2px 8px", borderRadius: 99 }}>Deactivated</span>}
      <button onClick={() => run(disabled ? "reactivate" : "deactivate")} disabled={busy} style={{ ...pill, color: disabled ? "var(--st-done)" : "var(--ink-2)", background: disabled ? "var(--st-done-bg)" : "var(--surface-2)" }}>{disabled ? "Reactivate" : "Deactivate"}</button>
      <button onClick={() => setConfirm(true)} disabled={busy} title="Delete permanently" style={{ ...pill, color: "#B23B3B", background: "#F6E0DE" }}>Delete</button>
      {confirm && <ConfirmDelete name={name} role={role} body={body} busy={busy} blocked={blocked}
        onConfirm={() => run("delete")} onArchive={() => run("delete", "archive")} onPurge={() => run("delete", "purge")}
        onClose={() => { setConfirm(false); setBlocked(null); }} />}
    </div>
  );
}

export function AdClients({ clients, orders, onAddClient, onSetType, onUserAction }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", school: "", program: "", client_type: "general", sendEmail: true });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [types, setTypes] = useState({});   // optimistic client_type overrides
  const ordersFor = (email) => orders.filter((o) => (o.client_email || "").toLowerCase() === (email || "").toLowerCase());
  const countFor = (email) => ordersFor(email).length;
  const activeFor = (email) => ordersFor(email).filter((o) => ["new", "brief_received", "assigned", "writing", "in_review", "revision"].includes(o.status)).length;
  const sinceOf = (c) => { if (!c.created_at) return null; try { return new Date(c.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }); } catch { return null; } };
  const typeOf = (c) => types[c.id] || c.client_type || "general";
  const setType = (c, t) => { setTypes((p) => ({ ...p, [c.id]: t })); onSetType && onSetType(c, t); };
  async function add() {
    if (!form.email.trim()) { setMsg("Enter the client’s email."); return; }
    setBusy(true); setMsg("");
    const r = await onAddClient({
      email: form.email.trim().toLowerCase(),
      name: form.name.trim(),
      school: form.school.trim(),
      program: form.program.trim(),
      client_type: form.client_type,
      sendEmail: form.sendEmail,
    });
    setBusy(false);
    setMsg(r?.ok ? `✓ ${form.name || form.email} added${r.emailed ? " — temp login emailed" : " — no email sent"}.` : (r?.error || "Could not add the client."));
    if (r?.ok) { setForm({ name: "", email: "", school: "", program: "", client_type: "general", sendEmail: true }); setOpen(false); }
  }
  return (
    <div>
      <AdTopbar title="Clients" sub={`${clients.length} accounts`} right={<Button variant="primary" icon="plus" onClick={() => { setMsg(""); setOpen(true); }}>Add client</Button>} />
      {open && (
        <FormModal icon="user" title="Add a client" sub="Create a client account and (optionally) email their login"
          onClose={() => setOpen(false)}
          footer={<>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="primary" icon="check" disabled={busy} onClick={add}>{busy ? "Adding…" : (form.sendEmail ? "Add & email login" : "Add client")}</Button>
          </>}>
          <label style={{ display: "block" }}><span style={MODAL_LBL}>Full name</span><input style={MODAL_INP} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Client name" /></label>
          <label style={{ display: "block" }}><span style={MODAL_LBL}>Email</span><input style={MODAL_INP} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="client@email.com" /></label>
          <label style={{ display: "block" }}><span style={MODAL_LBL}>Account type</span><select style={{ ...MODAL_INP, cursor: "pointer" }} value={form.client_type} onChange={(e) => setForm((f) => ({ ...f, client_type: e.target.value }))}><option value="general">General — full invoice flow</option><option value="custom">Custom — pre-arranged, no invoices</option></select></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <label style={{ display: "block" }}><span style={MODAL_LBL}>School</span><input style={MODAL_INP} value={form.school} onChange={(e) => setForm((f) => ({ ...f, school: e.target.value }))} placeholder="e.g. Walden University" /></label>
            <label style={{ display: "block" }}><span style={MODAL_LBL}>Program</span><input style={MODAL_INP} value={form.program} onChange={(e) => setForm((f) => ({ ...f, program: e.target.value }))} placeholder="e.g. PMHNP" /></label>
          </div>
          <ModalToggle on={form.sendEmail} onChange={(v) => setForm((f) => ({ ...f, sendEmail: v }))} label="Send onboarding email (temporary login)" />
          {msg && <div style={{ fontSize: 13, color: "var(--st-action)" }}>{msg}</div>}
        </FormModal>
      )}
      {msg && !open && <div style={{ marginBottom: 14, fontSize: 13, color: "var(--ink-2)" }}>{msg}</div>}
      {clients.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {clients.map((c) => {
            const t = typeOf(c);
            return (
              <div key={c.id} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 20, boxShadow: "var(--shadow-card)", display: "flex", flexDirection: "column", gap: 14, opacity: c.disabled_at ? 0.72 : 1, transition: "border-color .15s" }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent)"} onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--line)"}>
                {/* header: avatar + name/email + type pill */}
                <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                  <Avatar initials={AM.initials(c.name || c.email)} size={44} tone="soft" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name || "—"}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</div>
                  </div>
                  <span className="mono" style={{ fontSize: 9, flex: "0 0 auto",
                    color: t === "custom" ? "var(--st-progress)" : "var(--ink-2)",
                    background: t === "custom" ? "var(--st-progress-bg)" : "var(--surface-2)",
                    border: `1px solid ${t === "custom" ? "var(--st-progress-edge)" : "var(--line)"}`,
                    padding: "2px 8px", borderRadius: 99 }}>{t === "custom" ? "Custom" : "General"}</span>
                </div>

                {/* school + program block (render only if present) */}
                {(c.school || c.program) && (
                  <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
                    {c.school && <div>{c.school}</div>}
                    {c.program && <div style={{ color: "var(--muted)" }}>{c.program}</div>}
                  </div>
                )}

                {/* stat columns + since */}
                <div style={{ display: "flex", gap: 22, alignItems: "flex-end", borderTop: "1px solid var(--line)", paddingTop: 13 }}>
                  <div>
                    <div className="mono" style={{ textTransform: "uppercase", fontSize: 9.5, color: "var(--faint)", letterSpacing: ".06em" }}>Orders</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 19, fontWeight: 600, color: "var(--ink)" }}>{countFor(c.email)}</div>
                  </div>
                  <div>
                    <div className="mono" style={{ textTransform: "uppercase", fontSize: 9.5, color: "var(--faint)", letterSpacing: ".06em" }}>Active</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 19, fontWeight: 600, color: "var(--accent)" }}>{activeFor(c.email)}</div>
                  </div>
                  {sinceOf(c) && <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--faint)" }}>Since {sinceOf(c)}</div>}
                </div>

                {/* unpaid-count display (general accounts) */}
                {t === "general" && c.unpaid_invoice_count > 0 && (
                  <span style={{ alignSelf: "flex-start", fontSize: 11.5, fontWeight: 600, color: "var(--st-action)", background: "var(--st-action-bg)", padding: "3px 10px", borderRadius: 99 }}>
                    {c.unpaid_invoice_count} of 3 unpaid
                  </span>
                )}

                {/* actions: client_type toggle + user actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", borderTop: "1px solid var(--line)", paddingTop: 13 }}>
                  <select value={t} onChange={(e) => setType(c, e.target.value)} title="Client type"
                    style={{ ...SEL, flex: "1 1 auto", width: "auto", padding: "6px 9px", fontSize: 12.5 }}>
                    <option value="general">General — full invoice flow</option>
                    <option value="custom">Custom — pre-arranged, no invoices</option>
                  </select>
                  <UserActions id={c.id} name={c.name || c.email} role="client" disabled={!!c.disabled_at} onUserAction={onUserAction} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <AdPanel><div style={{ padding: 30, textAlign: "center", color: "var(--muted)" }}>No clients yet.</div></AdPanel>
      )}
    </div>
  );
}

/* ---- Writers / Experts ---- */
export function AdWriters({ writers, applications, onOnboardExpert, onAppAction, onToggleActive, onToggleVerified, onUserAction }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", specialty: "", mpesa_number: "", sendEmail: true });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function onboard(payload) {
    setBusy(true); setMsg("");
    const r = await onOnboardExpert(payload);
    setBusy(false);
    setMsg(r?.ok ? `✓ ${payload.name || payload.email} onboarded${r.emailed ? " — temp login emailed" : " — no email sent"}.` : (r?.error || "Could not onboard."));
    if (r?.ok) { setForm({ name: "", email: "", specialty: "", mpesa_number: "", sendEmail: true }); setOpen(false); }
  }
  const activeCount = writers.filter((w) => w.active !== false).length;
  return (
    <div>
      <AdTopbar title="Experts" sub={`${activeCount} active · ${(applications || []).length} applications`} right={<Button variant="primary" icon="plus" onClick={() => { setMsg(""); setOpen(true); }}>Onboard expert</Button>} />
      {open && (
        <FormModal icon="users" title="Onboard an expert" sub="Add an expert to the roster and (optionally) send their welcome email"
          onClose={() => setOpen(false)}
          footer={<>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="primary" icon="check" disabled={busy} onClick={() => onboard({ email: form.email.trim().toLowerCase(), name: form.name.trim(), specialty: form.specialty.trim(), mpesa_number: form.mpesa_number.trim(), sendEmail: form.sendEmail })}>{busy ? "Onboarding…" : (form.sendEmail ? "Onboard & email login" : "Onboard expert")}</Button>
          </>}>
          <label style={{ display: "block" }}><span style={MODAL_LBL}>Name</span><input style={MODAL_INP} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Expert name" /></label>
          <label style={{ display: "block" }}><span style={MODAL_LBL}>Specialty</span><input style={MODAL_INP} value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))} placeholder="e.g. Business" /></label>
          <label style={{ display: "block" }}><span style={MODAL_LBL}>Email</span><input style={MODAL_INP} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="expert@email.com" /></label>
          <label style={{ display: "block" }}><span style={MODAL_LBL}>Payout (M-Pesa number)</span><input style={MODAL_INP} value={form.mpesa_number} onChange={(e) => setForm((f) => ({ ...f, mpesa_number: e.target.value }))} placeholder="e.g. 0712 345 678" /></label>
          <ModalToggle on={form.sendEmail} onChange={(v) => setForm((f) => ({ ...f, sendEmail: v }))} label="Send welcome email (temporary login)" />
          {msg && <div style={{ fontSize: 13, color: "var(--st-action)" }}>{msg}</div>}
        </FormModal>
      )}
      {msg && !open && <div style={{ marginBottom: 14, fontSize: 13, color: "var(--ink-2)" }}>{msg}</div>}
      {(applications || []).length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <SectionLabel color="var(--accent)" count={applications.length}>Applications</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {applications.map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 18px", flexWrap: "wrap" }}>
                <Avatar initials={AM.initials(a.name)} size={38} tone="soft" />
                <div style={{ flex: 1, minWidth: 160 }}><div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{a.name}{a.degree ? <span style={{ color: "var(--muted)", fontWeight: 400 }}> · {a.degree}</span> : null}</div><div style={{ fontSize: 12.5, color: "var(--muted)" }}>{a.specialty || "—"} · {a.email}</div></div>
                <Button size="sm" variant="primary" icon="check" disabled={busy} onClick={() => onboard({ email: a.email, name: a.name, specialty: a.specialty, appId: a.id })}>Approve & onboard</Button>
                <Button size="sm" variant="ghost" onClick={() => onAppAction && onAppAction(a.id, "declined")}>Decline</Button>
              </div>
            ))}
          </div>
        </div>
      )}
      <SectionLabel color="var(--st-done)" count={writers.length}>Roster</SectionLabel>
      {writers.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {writers.map((w) => {
            const load = (w.orders || []).filter((o) => ["assigned", "writing", "revision", "in_review"].includes(o.status)).length;
            const done = (w.orders || []).filter((o) => ["delivered", "closed"].includes(o.status)).length;
            const inactive = w.active === false;
            return (
              <div key={w.id} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 20, boxShadow: "var(--shadow-card)", display: "flex", flexDirection: "column", gap: 14, opacity: (w.profile && w.profile.disabled_at) ? 0.72 : 1, transition: "border-color .15s" }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent)"} onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--line)"}>
                {/* header: avatar + name + specialty */}
                <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                  <Avatar initials={AM.initials(w.name)} size={44} tone={inactive ? "soft" : "progress"} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.specialty || "—"}</div>
                  </div>
                </div>

                {/* M-Pesa verified pill (toggle) + email */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {w.mpesa_number
                    ? <button onClick={() => onToggleVerified && onToggleVerified(w)} title={`M-Pesa ${w.mpesa_number}${w.mpesa_name ? " · " + w.mpesa_name : ""} — click to ${w.mpesa_verified ? "un-verify" : "verify"}`} style={{ fontSize: 11.5, fontWeight: 600, color: w.mpesa_verified ? "var(--st-done)" : "var(--st-action)", background: w.mpesa_verified ? "var(--st-done-bg)" : "var(--st-action-bg)", padding: "4px 11px", borderRadius: 99, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name={w.mpesa_verified ? "check" : "clock"} size={12} /> M-Pesa {w.mpesa_verified ? "verified" : "verify"}</button>
                    : <span style={{ fontSize: 11.5, color: "var(--faint)" }}>No M-Pesa</span>}
                  <span style={{ fontSize: 11.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: "1 1 auto", minWidth: 0, textAlign: "right" }}>{w.email}</span>
                </div>

                {/* stat columns */}
                <div style={{ display: "flex", gap: 22, borderTop: "1px solid var(--line)", paddingTop: 13 }}>
                  <div>
                    <div className="mono" style={{ textTransform: "uppercase", fontSize: 9.5, color: "var(--faint)", letterSpacing: ".06em" }}>Active</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 19, fontWeight: 600, color: "var(--accent)" }}>{load}</div>
                  </div>
                  <div>
                    <div className="mono" style={{ textTransform: "uppercase", fontSize: 9.5, color: "var(--faint)", letterSpacing: ".06em" }}>Completed</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 19, fontWeight: 600, color: "var(--ink)" }}>{done}</div>
                  </div>
                </div>

                {/* actions: capacity toggle + user actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", borderTop: "1px solid var(--line)", paddingTop: 13 }}>
                  <button onClick={() => onToggleActive && onToggleActive(w)} title="Toggle capacity (available for assignments)" style={{ fontSize: 11.5, fontWeight: 600, color: !inactive ? "var(--st-done)" : "var(--muted)", background: !inactive ? "var(--st-done-bg)" : "var(--surface-2)", padding: "4px 11px", borderRadius: 99, border: "none", cursor: "pointer" }}>{!inactive ? "Active" : "Inactive"}</button>
                  <div style={{ flex: 1 }} />
                  <UserActions id={w.profile_id} name={w.name} role="expert" disabled={!!(w.profile && w.profile.disabled_at)} onUserAction={onUserAction} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <AdPanel><div style={{ padding: 30, textAlign: "center", color: "var(--muted)" }}>No experts yet.</div></AdPanel>
      )}
    </div>
  );
}

/* ---- Support (live support_conversations / support_messages) ---- */
export function AdSupport({ adminName, orders, openDrawer }) {
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const chRef = useRef(null);
  const dayOf = (ts) => { try { const d = new Date(ts), n = new Date(); if (d.toDateString() === n.toDateString()) return "Today"; return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return "Today"; } };
  const timeOf = (ts) => { try { return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); } catch { return ""; } };

  useEffect(() => {
    supabase.from("support_conversations").select("*").order("last_message_at", { ascending: false }).then(({ data }) => {
      setThreads(data || []);
      if (data && data[0]) open(data[0]);
    });
  }, []);

  function open(t) {
    setActive(t);
    supabase.from("support_messages").select("*").eq("conversation_id", t.id).order("created_at", { ascending: true })
      .then(({ data }) => setMsgs((data || []).map((m) => ({ id: m.id, from: m.role === "admin" ? "you" : "them", body: m.body, time: timeOf(m.created_at), day: dayOf(m.created_at), status: "read" }))));
    if (chRef.current) supabase.removeChannel(chRef.current);
    chRef.current = supabase.channel(`adm-support-${t.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${t.id}` },
        (p) => setMsgs((prev) => prev.some((x) => x.id === p.new.id) ? prev : [...prev, { id: p.new.id, from: p.new.role === "admin" ? "you" : "them", body: p.new.body, time: timeOf(p.new.created_at), day: dayOf(p.new.created_at), status: "read" }]))
      .subscribe();
  }
  useEffect(() => () => { if (chRef.current) supabase.removeChannel(chRef.current); }, []);

  async function send(text) {
    if (!active) return;
    await supabase.from("support_messages").insert({ conversation_id: active.id, role: "admin", sender_name: adminName || "Meridian", body: text });
    await supabase.from("support_conversations").update({ status: "open" }).eq("id", active.id);
  }

  const waiting = threads.filter((t) => t.status === "waiting").length;
  return (
    <div>
      <AdTopbar title="Support" sub={`${threads.length} conversations · ${waiting} waiting`} />
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 18, height: "62vh" }} className="ops-support">
        <AdPanel>
          {threads.map((t) => (
            <button key={t.id} onClick={() => open(t)} style={{ display: "flex", gap: 12, width: "100%", textAlign: "left", padding: "14px 16px", border: "none", borderBottom: "1px solid var(--line)", borderLeft: `3px solid ${active && active.id === t.id ? "var(--accent)" : "transparent"}`, background: active && active.id === t.id ? "var(--surface-2)" : "transparent", cursor: "pointer" }}>
              <Avatar initials={AM.initials(t.name || t.email)} size={36} tone={t.surface === "writer" || t.surface === "expert" ? "done" : "soft"} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8 }}><span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{t.name || t.email || "User"}</span>{t.surface && <span className="mono" style={{ fontSize: 9, color: "var(--accent)", background: "var(--accent-soft)", padding: "1px 6px", borderRadius: 99 }}>{t.surface}</span>}<div style={{ flex: 1 }} />{t.status === "waiting" && <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--accent)" }} />}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject || t.email}</div>
              </div>
            </button>
          ))}
          {!threads.length && <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No conversations.</div>}
        </AdPanel>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 18, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {active ? <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>{active.name || active.email} <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>· {active.surface || "client"}</span></div>
              {active.order_ref && (() => {
                const linked = (orders || []).find((o) => o.ref === active.order_ref);
                return (
                  <button onClick={() => linked && openDrawer && openDrawer(linked)} disabled={!linked} title={linked ? "Open this order" : "Order not in the active list"}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid rgba(67,71,158,.2)", padding: "3px 11px", borderRadius: 99, cursor: linked ? "pointer" : "default" }}>
                    <Icon name="briefcase" size={13} /> {active.order_ref}
                  </button>
                );
              })()}
            </div>
            <ChatThread messages={msgs} scrollKey={active.id} />
            <ChatComposer onSend={send} placeholder="Reply…" />
          </> : <div style={{ margin: "auto", color: "var(--muted)" }}>Select a conversation.</div>}
        </div>
      </div>
    </div>
  );
}

/* ---- Billing ---- */
export function AdBilling({ orders }) {
  const [reminded, setReminded] = useState(() => new Set());
  const paid = orders.filter((o) => o.payment_status === "paid_in_full");
  const collected = paid.reduce((a, o) => a + (o.quote_total || 0), 0);
  const owing = orders.filter((o) => o.payment_status !== "paid_in_full");
  const outstanding = owing.reduce((a, o) => a + AM.balance(o), 0);
  const deposits = orders.filter((o) => o.payment_status === "deposit_paid").length;
  const avgOrder = orders.length ? Math.round(orders.reduce((a, o) => a + (o.quote_total || 0), 0) / orders.length) : 0;
  // Ledger: collected orders, most recent first. Outstanding: anything with a balance.
  const ledger = [...paid].sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
  const outRows = owing.filter((o) => AM.balance(o) > 0 || o.payment_status === "unpaid");
  const fmtTs = (ts) => { if (!ts) return ""; try { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return ""; } };
  const remind = (o) => setReminded((p) => { const s = new Set(p); s.add(o.id); return s; });
  return (
    <div>
      <AdTopbar title="Billing" sub={`${AM.money(collected)} collected · ${AM.money(outstanding)} outstanding`} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 22 }} className="ops-grid5">
        <AdStatCard label="Collected" value={AM.money(collected)} tone="var(--st-done)" sub={`${paid.length} paid in full`} icon="wallet" />
        <AdStatCard label="Outstanding" value={AM.money(outstanding)} tone="var(--st-action)" sub={`${outRows.length} awaiting payment`} icon="alert" />
        <AdStatCard label="On deposit" value={deposits} tone="var(--st-progress)" sub="balance due on approval" icon="clock" />
        <AdStatCard label="Avg order" value={AM.money(avgOrder)} tone="var(--st-progress)" sub="across all orders" icon="briefcase" />
        <AdStatCard label="Orders" value={orders.length} tone="var(--accent)" sub="all time" icon="doc" />
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 9, marginBottom: 14 }}>
        <span style={{ display: "inline-flex", color: "var(--muted)", marginTop: 1 }}><Icon name="alert" size={15} /></span>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>Payments are received off-platform (M-Pesa, Wise, Sendwave) and reconciled here once an operator confirms a declared transfer.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, alignItems: "start" }} className="ops-2col">
        <AdPanel title="Payment ledger" icon="wallet" iconTone="var(--st-done)" count={ledger.length} countTone="var(--st-done)">
          {ledger.length ? ledger.map((o, i) => (
            <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 18px", borderTop: i ? "1px solid var(--line)" : "none" }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: "var(--st-done-bg)", color: "var(--st-done)", display: "grid", placeItems: "center", flex: "0 0 36px" }}><Icon name="check" size={17} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.client_name || o.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{o.ref}{o.updated_at || o.created_at ? ` · ${fmtTs(o.updated_at || o.created_at)}` : ""}</div>
              </div>
              <span style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 600, color: "var(--st-done)", whiteSpace: "nowrap" }}>+{AM.money(o.quote_total)}</span>
            </div>
          )) : <div style={{ padding: 30, textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>Nothing collected yet.</div>}
        </AdPanel>
        <AdPanel title="Outstanding" icon="alert" iconTone="var(--st-action)" count={outRows.length} countTone="var(--st-action)">
          {outRows.length ? outRows.map((o, i) => (
            <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", borderTop: i ? "1px solid var(--line)" : "none" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.client_name || o.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 2 }}>
                  <span className="mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>{o.ref}</span>
                  <PaymentBadge status={o.payment_status} />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <span style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 600, color: "var(--st-action)", whiteSpace: "nowrap" }}>{AM.money(AM.balance(o) || o.quote_total)}</span>
                <button onClick={() => remind(o)} disabled={reminded.has(o.id)} style={{ padding: "4px 11px", borderRadius: 99, border: "1px solid var(--line-2)", background: "var(--surface-2)", color: reminded.has(o.id) ? "var(--st-done)" : "var(--ink-2)", fontWeight: 600, fontSize: 11.5, fontFamily: "var(--sans)", cursor: reminded.has(o.id) ? "default" : "pointer" }}>{reminded.has(o.id) ? "Reminded ✓" : "Remind"}</button>
              </div>
            </div>
          )) : <div style={{ padding: 34, textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>Everything's collected 🎉</div>}
        </AdPanel>
      </div>
    </div>
  );
}

/* ---- Emails (live email_settings) ---- */
// Per-event descriptors ported from the prototype (label · audience · icon ·
// occasion). Audience drives the colored dot/tag; occasion is the "when it fires"
// blurb shown in the detail pane. The enable toggle stays wired to email_settings.
const EMAIL_META = {
  invoice_ready:       { label: "Invoice ready",      audience: "Client", icon: "wallet",    occasion: "Sent to the client once an operator prepares the quote. For a client's first orders it also carries their temporary workspace login." },
  delivered:           { label: "Work delivered",     audience: "Client", icon: "check",     occasion: "Sent to the client when finished work is released after QC — ready to view and download." },
  assigned:            { label: "Expert assigned",    audience: "Expert", icon: "user",      occasion: "Sent to an expert the moment they're assigned to an order, with the brief and client files." },
  revision_requested:  { label: "Revision requested", audience: "Expert", icon: "refresh",   occasion: "Sent to the expert when QC returns a deliverable for changes." },
  writer_welcome:      { label: "Expert onboarded",   audience: "Expert", icon: "users",     occasion: "Sent to a new expert when an operator onboards them — only if the welcome email is enabled at onboarding." },
  order_received:      { label: "Order received",     audience: "Ops",    icon: "briefcase", occasion: "Sent to operators the moment a paid order enters the pipeline." },
  brief_received:      { label: "Brief received",     audience: "Ops",    icon: "sparkle",   occasion: "Sent to operators when the AI intake captures a request — before it becomes an order." },
  magiclink:           { label: "Magic sign-in link", audience: "All",    icon: "key",       occasion: "Sent whenever a client or expert requests a passwordless sign-in link." },
  admin_password_reset:{ label: "Admin password reset", audience: "Ops",  icon: "lock",      occasion: "Sent when an operator requests a password reset for the Ops Console." },
};
const AUD_TONE = {
  Client: { color: "var(--st-progress)", bg: "var(--st-progress-bg)" },
  Expert: { color: "var(--st-done)",     bg: "var(--st-done-bg)" },
  Ops:    { color: "var(--accent)",       bg: "var(--accent-soft)" },
  All:    { color: "var(--muted)",        bg: "var(--surface-2)" },
};
const emailMeta = (id) => EMAIL_META[id] || { label: id, audience: "All", icon: "mail", occasion: "" };

// Per-event email TEMPLATES — the realistic copy each transactional email
// carries, used to render the "exactly as the recipient receives it" preview in
// the detail pane. Keyed by event_id (matches EMAIL_META / email_settings).
// Shape: { subject, preheader, eyebrow, headline, greeting, paras[],
//   detail:{ title, rows:[[k,v]], emphasizeLast }, bullets:{ title, items[] },
//   cta, showsCredentials, internal, fromName, fromEmail, toName, toEmail }.
const _sampleOrder = { ref: "MS-3038", title: "Evidence-Based Care Plan Analysis", scopeLine: "Graduate nursing · APA 7 · 5 sources · ~1,500 words", due: "Jun 18" };
const _sampleCreds = { email: "grace.m@email.com", password: "MS-7K4P-QR29", link: "app.meridianstudio.co/workspace" };
const BRAND_SUB = { Ops: "STUDIO ADMIN", Client: "STUDENT WORKSPACE", Expert: "EXPERT PORTAL", All: "MERIDIAN STUDIO" };
const EMAIL_DOC = {
  invoice_ready: {
    fromName: "Meridian Studio", fromEmail: "billing@meridianstudio.co", toName: "Grace Mwangi", toEmail: "grace.m@email.com",
    subject: "Your Meridian quote is ready — $340", preheader: "Confirm and send payment to get started",
    eyebrow: "Quote ready", headline: "Your quote is ready.", greeting: "Hi Grace,",
    paras: ["Thanks for your request — your quote for the assignment below is ready to review.",
            "Payments are handled securely off-platform. Send payment by M-Pesa, Wise, or Sendwave, then reply with the transfer reference and we’ll confirm right away."],
    detail: { title: "Your quote", rows: [["Assignment", _sampleOrder.title], ["Level", "Graduate · NURS-6630"], ["Citation", "APA 7 · 5 sources"], ["Length", "~1,500 words"], ["Due", _sampleOrder.due], ["Total", "$340"]], emphasizeLast: true },
    cta: "View quote & payment details", showsCredentials: true },
  delivered: {
    fromName: "Meridian Studio", fromEmail: "hello@meridianstudio.co", toName: "Grace Mwangi", toEmail: "grace.m@email.com",
    subject: "Your document is ready — Evidence-Based Care Plan Analysis", preheader: "Passed quality review · ready to download",
    eyebrow: "Work delivered", headline: "Your work is ready.", greeting: "Hi Grace,",
    paras: ["Great news — your completed work has passed quality review and is now in your workspace, ready to view and download.",
            "If anything needs adjusting, you can request a revision directly from your workspace."],
    detail: { title: "Delivered", rows: [["Assignment", _sampleOrder.title], ["Format", "APA 7 · ~1,500 words"], ["Status", "QC approved"], ["Order", _sampleOrder.ref]] },
    cta: "View & download your work", showsCredentials: true },
  assigned: {
    fromName: "Meridian Studio", fromEmail: "experts@meridianstudio.co", toName: "L. Chachoute", toEmail: "l.chachoute@expert.meridianstudio.co",
    subject: "New assignment · Evidence-Based Care Plan — due Jun 18", preheader: "Brief and client files are in your workspace",
    eyebrow: "New assignment", headline: "You’ve got a new assignment.", greeting: "Hi there,",
    paras: ["You’ve been matched to a new order. The full brief and any client files are waiting in your workspace.",
            "Please confirm you can meet the deadline — your payout is released as soon as the work passes quality review."],
    detail: { title: "Assignment " + _sampleOrder.ref, rows: [["Assignment", _sampleOrder.title], ["Scope", _sampleOrder.scopeLine], ["Due", _sampleOrder.due], ["Payout", "$120 on QC approval"]], emphasizeLast: true },
    cta: "Open assignment" },
  revision_requested: {
    fromName: "Meridian QC", fromEmail: "qc@meridianstudio.co", toName: "L. Chachoute", toEmail: "l.chachoute@expert.meridianstudio.co",
    subject: "Revision requested · MS-3038 — Care Plan Analysis", preheader: "3 notes from quality review · new due Jun 18",
    eyebrow: "Revision requested", headline: "A few changes were requested.", greeting: "Hi there,",
    paras: ["Quality review has returned this order with a few notes. Please address them and resubmit through your workspace."],
    bullets: { title: "Reviewer notes", items: ["Tighten the intervention rationale in section 2.", "Add one more recent (≤5 years) peer-reviewed source.", "Align the in-text citations with the reference list."] },
    detail: { rows: [["Order", _sampleOrder.ref], ["New due", "Jun 18"]] },
    cta: "View revision notes" },
  writer_welcome: {
    fromName: "Meridian Studio", fromEmail: "experts@meridianstudio.co", toName: "A. Mensah", toEmail: "a.mensah@expert.meridianstudio.co",
    subject: "Welcome to Meridian Studio", preheader: "Set up your profile to start receiving work",
    eyebrow: "Welcome", headline: "Welcome to Meridian Studio.", greeting: "Welcome aboard,",
    paras: ["We’re glad to have you on the Meridian expert roster. Your portal is ready — finish setup to start receiving assignments matched to your specialty."],
    bullets: { title: "Get started", items: ["Complete your expert profile", "Add your M-Pesa or Wise payout details", "Review the Meridian style guide"] },
    cta: "Set up your profile", showsCredentials: true },
  order_received: {
    fromName: "Meridian Ops", fromEmail: "ops@meridianstudio.co", toName: "Operations", toEmail: "ops@meridianstudio.co",
    subject: "New order · MS-3038 — Evidence-Based Care Plan Analysis", preheader: "Paid in full · due Jun 18 · ready to assign",
    eyebrow: "New order", headline: "New order in the pipeline.", greeting: "New order in the pipeline",
    paras: ["A paid order just entered the pipeline and is ready to assign to an expert."],
    detail: { title: "Order " + _sampleOrder.ref, rows: [["Client", "Grace Mwangi"], ["Assignment", _sampleOrder.title], ["Scope", _sampleOrder.scopeLine], ["Value", "$340 · paid in full"], ["Due", _sampleOrder.due]] },
    cta: "Assign an expert", internal: true },
  brief_received: {
    fromName: "Meridian Ops", fromEmail: "ops@meridianstudio.co", toName: "Operations", toEmail: "ops@meridianstudio.co",
    subject: "New brief · Grace Mwangi — Evidence-Based Care Plan", preheader: "Captured by AI intake · awaiting conversion",
    eyebrow: "Needs assignment", headline: "New brief just landed.", greeting: "A new client brief is in",
    paras: ["The AI intake just captured a new request and auto-scoped it. Review and convert it into an order when you’re ready."],
    detail: { title: "Brief", rows: [["Client", "Grace Mwangi"], ["Topic", _sampleOrder.title], ["Auto-scope", _sampleOrder.scopeLine], ["Submitted", "just now"]] },
    cta: "Review & convert to order", internal: true },
  magiclink: {
    fromName: "Meridian Studio", fromEmail: "no-reply@meridianstudio.co", toName: "Grace Mwangi", toEmail: "grace.m@email.com",
    subject: "Your Meridian sign-in link", preheader: "One-tap secure login · expires in 15 minutes",
    eyebrow: "Secure sign-in", headline: "Here’s your sign-in link.", greeting: "Hi,",
    paras: ["Use the secure button below to sign in to your Meridian workspace — no password needed.",
            "This link expires in 15 minutes and can only be used once. If you didn’t request it, you can safely ignore this email."],
    cta: "Sign in to Meridian" },
  admin_password_reset: {
    fromName: "Meridian Ops", fromEmail: "no-reply@meridianstudio.co", toName: "Operations", toEmail: "ops@meridianstudio.co",
    subject: "Reset your Ops Console password", preheader: "Secure reset link · expires in 30 minutes",
    eyebrow: "Secure reset", headline: "Reset your password.", greeting: "Hi,",
    paras: ["A password reset was requested for your Meridian Ops Console account. Use the button below to choose a new password.",
            "This link expires in 30 minutes and can only be used once. If you didn’t request it, no change has been made — you can ignore this email."],
    cta: "Reset password", internal: true },
};
const emailDoc = (id) => EMAIL_DOC[id] || EMAIL_DOC.invoice_ready;
export function AdEmails({ notify }) {
  const [rows, setRows] = useState([]);
  const [sel, setSel] = useState(null);
  useEffect(() => { supabase.from("email_settings").select("*").then(({ data }) => { setRows(data || []); if (data && data[0]) setSel(data[0].event_id); }); }, []);
  async function toggle(r) {
    const next = !r.enabled;
    setRows((p) => p.map((x) => x.event_id === r.event_id ? { ...x, enabled: next } : x));
    await supabase.from("email_settings").update({ enabled: next }).eq("event_id", r.event_id);
  }
  const active = rows.find((r) => r.event_id === sel) || null;
  const am = active ? emailMeta(active.event_id) : null;
  const Tog = ({ r, size = "lg" }) => (
    <button onClick={(e) => { e.stopPropagation(); toggle(r); }} aria-label="toggle event" style={{ position: "relative", width: size === "lg" ? 44 : 40, height: size === "lg" ? 25 : 23, borderRadius: 99, border: "none", background: r.enabled ? "var(--accent)" : "var(--line-2)", cursor: "pointer", flex: "0 0 auto", transition: "background .15s" }}>
      <span style={{ position: "absolute", top: 2.5, left: r.enabled ? (size === "lg" ? 22 : 19) : 2.5, width: size === "lg" ? 20 : 18, height: size === "lg" ? 20 : 18, borderRadius: 99, background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,.2)" }} />
    </button>
  );
  const enabledCount = rows.filter((r) => r.enabled).length;
  return (
    <div>
      <AdTopbar title="Emails" sub={`Every transactional email the system sends, shown exactly as the recipient receives it · ${enabledCount} of ${rows.length} events active`} />
      {!rows.length ? (
        <AdPanel><div style={{ padding: 30, textAlign: "center", color: "var(--muted)" }}>No email events configured.</div></AdPanel>
      ) : (
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 18, alignItems: "start" }} className="ops-emailwrap">
        <AdPanel title="Email events" icon="mail" iconTone="var(--accent)">
          {rows.map((e) => {
            const m = emailMeta(e.event_id); const at = AUD_TONE[m.audience] || AUD_TONE.All; const on = e.event_id === sel;
            return (
              <button key={e.event_id} onClick={() => setSel(e.event_id)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "13px 16px", border: "none", borderTop: "1px solid var(--line)", borderLeft: `3px solid ${on ? "var(--accent)" : "transparent"}`, background: on ? "var(--surface-2)" : "transparent", cursor: "pointer" }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: at.bg, color: at.color, display: "grid", placeItems: "center", flex: "0 0 34px" }}><Icon name={m.icon} size={16} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.label}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 99, background: at.color, flex: "0 0 7px" }} />
                    <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{m.audience}</span>
                    {!e.enabled && <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 600, color: "var(--faint)" }}>Off</span>}
                  </div>
                </div>
                <span title={e.enabled ? "Enabled" : "Disabled"} style={{ width: 8, height: 8, borderRadius: 99, flex: "0 0 8px", background: e.enabled ? "var(--st-done)" : "var(--line-2)", boxShadow: e.enabled ? "0 0 0 3px var(--st-done-bg)" : "none" }} />
              </button>
            );
          })}
        </AdPanel>
        {active && am && (() => { const at = AUD_TONE[am.audience] || AUD_TONE.All; return (
          <section style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 13, padding: "18px 20px", borderBottom: "1px solid var(--line)" }}>
              <span style={{ width: 44, height: 44, borderRadius: 12, background: at.bg, color: at.color, display: "grid", placeItems: "center", flex: "0 0 44px" }}><Icon name={am.icon} size={20} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 21, fontWeight: 500, letterSpacing: "-0.015em", color: "var(--ink)", lineHeight: 1.2 }}>{am.label}</h2>
                <span style={{ display: "inline-block", marginTop: 6, fontSize: 11, fontWeight: 600, color: at.color, background: at.bg, padding: "2px 10px", borderRadius: 99 }}>{am.audience}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: active.enabled ? "var(--st-done)" : "var(--muted)" }}>{active.enabled ? "Enabled" : "Disabled"}</span>
                <Tog r={active} />
              </div>
            </div>
            <div style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "12px 14px", borderRadius: 11, background: "var(--accent-soft)", border: "1px solid rgba(67,71,158,.16)" }}>
                <span style={{ display: "inline-flex", flex: "0 0 auto", marginTop: 1, color: "var(--accent)" }}><Icon name="clock" size={15} /></span>
                <span style={{ fontSize: 12.5, color: "var(--accent-deep)", lineHeight: 1.55 }}>{am.occasion}</span>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "14px 0 0", lineHeight: 1.55 }}>
                Toggle this event off to stop the system from sending it. Order- and account-critical actions still happen — only the email is suppressed.
              </p>
            </div>
            {/* Rendered email — shown exactly as the recipient receives it */}
            {(() => {
              const doc = emailDoc(active.event_id);
              const showGreeting = doc.greeting && /,\s*$/.test(doc.greeting);
              const brandSub = BRAND_SUB[am.audience] || BRAND_SUB.All;
              const footerNote = doc.internal
                ? "Internal notification · Meridian Studio admin."
                : "You’re receiving this because you have an active Meridian account.";
              const detailRows = doc.detail ? doc.detail.rows : [];
              // Warm recipient brand — the email is rendered exactly as clients/experts
              // receive it, so the preview canvas uses the warm Meridian brand (NOT the
              // indigo admin theme). Hardcoded to this block only.
              const warm = "#BD5A2D", warmHead = "#271E17", warmSoft = "#F6E7DB", warmEdge = "rgba(189,90,45,.42)", warmDeep = "#9A4420";
              return (
                <div style={{ padding: "4px 20px 22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
                    <span style={{ height: 1, flex: 1, background: "var(--line)" }} />
                    <span className="mono" style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)" }}>Shown exactly as the recipient receives it</span>
                    <span style={{ height: 1, flex: 1, background: "var(--line)" }} />
                  </div>
                  {/* From / To / Subject envelope */}
                  <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "11px 14px", marginBottom: 14, background: "var(--surface-2)" }}>
                    <div style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--muted)", padding: "2px 0" }}>
                      <span style={{ width: 46, flex: "0 0 46px", color: "var(--faint)" }}>From</span>
                      <span style={{ color: "var(--ink-2)" }}>{doc.fromName} <span style={{ color: "var(--faint)" }}>&lt;{doc.fromEmail}&gt;</span></span>
                    </div>
                    <div style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--muted)", padding: "2px 0" }}>
                      <span style={{ width: 46, flex: "0 0 46px", color: "var(--faint)" }}>To</span>
                      <span style={{ color: "var(--ink-2)" }}>{doc.toName} <span style={{ color: "var(--faint)" }}>&lt;{doc.toEmail}&gt;</span></span>
                    </div>
                    <div style={{ display: "flex", gap: 8, fontSize: 12.5, padding: "5px 0 2px", marginTop: 4, borderTop: "1px solid var(--line)" }}>
                      <span style={{ width: 46, flex: "0 0 46px", color: "var(--faint)" }}>Subject</span>
                      <span style={{ color: "var(--ink)", fontWeight: 600 }}>{doc.subject}</span>
                    </div>
                  </div>
                  {/* Email canvas */}
                  <div style={{ background: "var(--surface-2)", borderRadius: 14, padding: "clamp(12px,2.5vw,24px)" }}>
                    <div style={{ maxWidth: 540, margin: "0 auto", background: "var(--surface)", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 30px -12px rgba(24,24,38,.28)", border: "1px solid var(--line)" }}>
                      {/* Brand header — warm recipient brand */}
                      <div style={{ background: warmHead, padding: "22px 30px", display: "flex", alignItems: "center", gap: 14 }}>
                        <span style={{ width: 46, height: 46, borderRadius: 13, background: warm, display: "grid", placeItems: "center", flex: "0 0 46px", fontFamily: "var(--serif)", fontSize: 25, fontWeight: 600, color: "#FBFBFE", lineHeight: 1 }}>M</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 600, color: "var(--paper)", lineHeight: 1.1, whiteSpace: "nowrap" }}>Meridian Studio</div>
                          <div className="mono" style={{ fontSize: 9, letterSpacing: ".2em", color: "var(--faint)", marginTop: 5, whiteSpace: "nowrap" }}>{brandSub}</div>
                        </div>
                      </div>
                      {/* Body */}
                      <div style={{ padding: "28px 30px 26px" }}>
                        <div className="mono" style={{ textTransform: "uppercase", fontSize: 10, fontWeight: 700, letterSpacing: ".18em", color: warm, marginBottom: 13 }}>{doc.eyebrow}</div>
                        <h1 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, letterSpacing: "-0.01em", color: "var(--ink)", lineHeight: 1.12, margin: "0 0 17px" }}>{doc.headline}</h1>
                        {/* Preheader */}
                        <div style={{ fontSize: 12, color: "var(--faint)", margin: "-8px 0 16px", fontStyle: "italic" }}>{doc.preheader}</div>
                        {showGreeting && <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--ink-2)", margin: "0 0 14px" }}>{doc.greeting}</p>}
                        {doc.paras.map((t, i) => (
                          <p key={i} style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--ink-2)", margin: "0 0 14px" }}>{t}</p>
                        ))}
                        {/* Detail rows */}
                        {doc.detail && (
                          <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "5px 18px 10px", margin: "20px 0", background: "var(--surface-2)" }}>
                            {doc.detail.title && <div className="mono" style={{ textTransform: "uppercase", fontSize: 9.5, color: "var(--faint)", letterSpacing: ".08em", padding: "12px 0 3px" }}>{doc.detail.title}</div>}
                            {detailRows.map((r, i) => {
                              const emph = doc.detail.emphasizeLast && i === detailRows.length - 1;
                              return (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "9px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                                  <span style={{ fontSize: 13, color: "var(--muted)", flex: "0 0 auto" }}>{r[0]}</span>
                                  <span style={{ fontSize: emph ? 15 : 13, fontWeight: emph ? 700 : 500, color: emph ? warm : "var(--ink)", textAlign: "right" }}>{r[1]}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {/* Bullets */}
                        {doc.bullets && (
                          <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "15px 17px", margin: "20px 0", background: "var(--surface-2)" }}>
                            <div className="mono" style={{ textTransform: "uppercase", fontSize: 9.5, color: "var(--faint)", letterSpacing: ".08em", marginBottom: 11 }}>{doc.bullets.title}</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              {doc.bullets.items.map((b, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
                                  <span style={{ width: 6, height: 6, borderRadius: 99, background: warm, flex: "0 0 6px", marginTop: 7 }} />
                                  <span style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-2)" }}>{b}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* CTA */}
                        <div style={{ margin: "22px 0 6px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 26px", borderRadius: 999, background: warm, color: "#FBFBFE", fontWeight: 600, fontSize: 14, fontFamily: "var(--sans)", boxShadow: "0 5px 16px -5px rgba(189,90,45,.55)" }}>
                            {doc.cta}<Icon name="right" size={13} stroke={2.4} />
                          </span>
                        </div>
                        {/* Temp-login credentials */}
                        {doc.showsCredentials && (
                          <div style={{ border: `1.5px dashed ${warmEdge}`, borderRadius: 12, padding: "15px 17px", margin: "20px 0 6px", background: warmSoft }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 }}>
                              <span style={{ display: "inline-flex", color: warm }}><Icon name="lock" size={13} /></span>
                              <span className="mono" style={{ textTransform: "uppercase", fontSize: 9.5, color: warmDeep, letterSpacing: ".07em" }}>Your temporary login</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "6px 0", fontSize: 13 }}><span style={{ color: "var(--muted)" }}>Email</span><span className="mono" style={{ color: "var(--ink)" }}>{_sampleCreds.email}</span></div>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "6px 0", borderTop: `1px solid ${warmEdge}`, fontSize: 13 }}><span style={{ color: "var(--muted)" }}>Temp password</span><span className="mono" style={{ fontWeight: 700, color: warmDeep, letterSpacing: ".04em" }}>{_sampleCreds.password}</span></div>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "6px 0", borderTop: `1px solid ${warmEdge}`, fontSize: 13 }}><span style={{ color: "var(--muted)" }}>Workspace</span><span className="mono" style={{ color: "var(--ink)" }}>{_sampleCreds.link}</span></div>
                            <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 10, lineHeight: 1.5 }}>You’ll be asked to set your own password on first sign-in.</div>
                          </div>
                        )}
                        <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--ink-2)", margin: "18px 0 0" }}>— The Meridian Studio team</p>
                      </div>
                      {/* Footer */}
                      <div style={{ padding: "18px 30px 24px", borderTop: "1px solid var(--line)" }}>
                        <div style={{ fontSize: 11.5, color: "var(--faint)", lineHeight: 1.6 }}>{footerNote}</div>
                        <div style={{ marginTop: 9, fontSize: 12.5, fontWeight: 700, color: warm }}>Message us on WhatsApp</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>
        ); })()}
      </div>
      )}
    </div>
  );
}
