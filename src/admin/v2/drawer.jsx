/* ============================================================
   Admin — OrderDrawer (QC review center). ES module, wired.
   Tabs: Details / Files / Messages / Payments.
   Release gate: deliver only when hasWork(files).
   ============================================================ */
import React from "react";
import { supabase } from "../../lib/supabase.js";
import { Icon } from "../../workspace/kit/icons.jsx";
import { MM } from "../../workspace/kit/model.js";
import { Button, PaymentBadge, TypeBadge } from "../../workspace/kit/components.jsx";
import { ChatThread, ChatComposer } from "../../workspace/kit/chat.jsx";
import { FilePreview } from "../../workspace/orderDetail.jsx";
import { AM } from "./admin-model.js";
import { SEL } from "./shell.jsx";

const { useState, useEffect, useRef } = React;

const fmtWhen = (ts) => { if (!ts) return ""; try { const d = new Date(ts), n = new Date(); return d.toDateString() === n.toDateString() ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return ""; } };
const timeOf = (ts) => { try { return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); } catch { return ""; } };
const dayOf = (ts) => { if (!ts) return "Today"; try { const d = new Date(ts), n = new Date(); if (d.toDateString() === n.toDateString()) return "Today"; const y = new Date(n); y.setDate(n.getDate() - 1); if (d.toDateString() === y.toDateString()) return "Yesterday"; return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return "Today"; } };
const normFile = (r) => ({ id: r.id, name: r.file_name, path: r.file_path, kind: r.kind, size: r.size_bytes, score: r.score, at: fmtWhen(r.created_at), version: r.version, by: r.kind === "brief" ? "Client" : "Expert", uploaded_by: r.uploaded_by });

// Derived bundle status — mirrors EM.bundleStatus / the DB rollup (migration 034)
// so the drawer reflects a multi-part order's true status without a reopen.
const deriveBundle = (ps) => {
  const ss = (ps || []).map((p) => p.status);
  if (!ss.length) return null;
  if (ss.some((s) => s === "revision")) return "revision";
  if (ss.every((s) => ["delivered", "closed"].includes(s))) return "delivered";
  if (ss.every((s) => ["in_review", "delivered", "closed"].includes(s))) return "in_review";
  if (ss.some((s) => s === "writing")) return "writing";
  return "assigned";
};

function AdStatusPill({ status }) {
  const tn = MM.tone(status);
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px 4px 8px", borderRadius: 999,
    background: tn.bg, color: tn.color, border: `1px solid ${tn.edge}`, fontWeight: 600, fontSize: 12.5, whiteSpace: "nowrap" }}>
    <Icon name={tn.icon} size={13} stroke={2} /> {AM.statusLabel(status)}</span>;
}
function AdRow({ k, v }) {
  return <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
    <span style={{ fontSize: 13, color: "var(--muted)" }}>{k}</span><span style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 600, textAlign: "right" }}>{v}</span></div>;
}

export function OrderDrawer({ o, writers, user, profile, invoice, clientType = "general", onInvoiceAction, onSaved, onClose, notify }) {
  const [tab, setTab] = useState("details");
  const [writerId, setWriterId] = useState(o.writer_id || (o.writer ? o.writer.id : ""));
  const [reassign, setReassign] = useState(false);
  const [status, setStatus] = useState(o.status);
  const [files, setFiles] = useState([]);
  const [msgs, setMsgs] = useState([]);
  const [internal, setInternal] = useState(false);
  const [revNote, setRevNote] = useState("");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkExp, setLinkExp] = useState("");
  const [parts, setParts] = useState([]);
  const [feedback, setFeedback] = useState(null);   // client's post-delivery rating/comment
  const [pForm, setPForm] = useState({ title: "", pages: "", citation: "", due_date: "", requirements: "" });
  const [pOpen, setPOpen] = useState(false);
  // pricing & pay — drives the client invoice (quote) + expert pay (pages/flat)
  const [quoteTotal, setQuoteTotal] = useState(o.quote_total ?? "");
  const [quoteDeposit, setQuoteDeposit] = useState(o.quote_deposit ?? "");
  const [pages, setPages] = useState(o.pages ?? "");
  const [rateProject, setRateProject] = useState(o.rate_project ?? "");
  const addRef = useRef();

  const loadParts = () => supabase.from("order_parts").select("*").eq("order_id", o.id).order("idx", { ascending: true }).then(({ data }) => setParts(data || []));
  async function addPart() {
    if (!pForm.title.trim()) { notify("Give the part a title."); return; }
    setBusy(true);
    const idx = (parts.reduce((m, p) => Math.max(m, p.idx || 0), 0)) + 1;
    const { error } = await supabase.from("order_parts").insert({ order_id: o.id, idx, title: pForm.title.trim(), pages: pForm.pages ? Number(pForm.pages) : null, citation: pForm.citation.trim() || null, due_date: pForm.due_date || null, requirements: pForm.requirements.trim() || null });
    setBusy(false);
    if (error) { console.error(error); notify("Could not add the part."); return; }
    setPForm({ title: "", pages: "", citation: "", due_date: "", requirements: "" }); setPOpen(false); loadParts(); notify("Part added.");
  }
  async function delPart(p) { setBusy(true); await supabase.from("order_parts").delete().eq("id", p.id); setBusy(false); loadParts(); notify("Part removed."); }

  const INDIRECT = ["wise", "payoneer"];
  const isIndirectInv = invoice && INDIRECT.includes(invoice.payment_method);
  const clientId = o.client_id || invoice?.client_id;
  async function submitLink() {
    if (!linkUrl.trim() || !onInvoiceAction) return;
    const ok = await onInvoiceAction(invoice, "submit_link", null, { payment_link_url: linkUrl.trim(), expires_at: linkExp || undefined });
    if (ok) { setLinkUrl(""); setLinkExp(""); }
  }

  const mapMsg = (r) => ({ id: r.id, from: r.sender_id === user?.id ? "you" : "them", body: r.body, time: timeOf(r.created_at), day: dayOf(r.created_at), internal: r.is_internal, status: "read" });

  useEffect(() => {
    setWriterId(o.writer_id || (o.writer ? o.writer.id : "")); setStatus(o.status); setTab("details"); setReassign(false);
    setLinkUrl(""); setLinkExp(""); setPOpen(false);
    setQuoteTotal(o.quote_total ?? ""); setQuoteDeposit(o.quote_deposit ?? ""); setPages(o.pages ?? ""); setRateProject(o.rate_project ?? "");
    let active = true;
    const loadFiles = () => supabase.from("order_files").select("*").eq("order_id", o.id).order("created_at", { ascending: true }).then(({ data }) => { if (active) setFiles((data || []).map(normFile)); });
    loadFiles();
    supabase.from("order_parts").select("*").eq("order_id", o.id).order("idx", { ascending: true }).then(({ data }) => { if (active) setParts(data || []); });
    supabase.from("order_messages").select("*").eq("order_id", o.id).order("created_at", { ascending: true }).then(({ data }) => { if (active) setMsgs((data || []).map(mapMsg)); });
    setFeedback(null);
    supabase.from("order_feedback").select("*").eq("order_id", o.id).maybeSingle().then(({ data }) => { if (active) setFeedback(data || null); });
    const ch = supabase.channel(`adm-${o.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_files", filter: `order_id=eq.${o.id}` }, loadFiles)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_messages", filter: `order_id=eq.${o.id}` }, (p) => setMsgs((t) => t.some((m) => m.id === p.new.id) ? t : [...t, mapMsg(p.new)]))
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [o.id]);

  const work = AM.hasWork(files);
  const bundle = parts.length ? deriveBundle(parts) : null;   // null ⇒ single deliverable
  const headerStatus = bundle || status;                       // bundles: show the rolled-up status
  const tabs = [["details", "Details"], ["files", "Files"], ["messages", "Messages"], ["payments", "Payments"]];

  async function patch(updates, msg) {
    setBusy(true);
    const { error } = await supabase.from("orders").update(updates).eq("id", o.id);
    setBusy(false);
    if (error) { console.error(error); notify("Could not save — please try again."); return false; }
    onSaved && onSaved(o.id, updates);
    if (msg) notify(msg);
    return true;
  }

  const num = (v) => v === "" || v == null ? null : Number(v);
  const saveDetails = async () => {
    const updates = {
      quote_total: num(quoteTotal), quote_deposit: num(quoteDeposit),
      pages: num(pages), rate_project: num(rateProject),
    };
    // Single-deliverable orders: admin drives status (gated on work files for the
    // QC stages). Bundles: status is derived from parts by the DB trigger, so we
    // never overwrite it here.
    if (!parts.length) {
      if ((status === "delivered" || status === "in_review") && !work) {
        notify(`Add a work file before moving to ${AM.statusLabel(status)}.`); return;
      }
      updates.status = status;
    }
    await patch(updates, "Order updated");
  };
  // Admin per-part QC (bundles): write the part status; the rollup trigger
  // (migration 034) updates orders.status, and the expert sees it live.
  const setPartStatus = async (p, st) => {
    setBusy(true);
    const { error } = await supabase.from("order_parts").update({ status: st }).eq("id", p.id);
    setBusy(false);
    if (error) { console.error(error); notify("Could not update the part."); return; }
    loadParts(); notify(`${p.title} → ${AM.statusLabel(st)}`);
  };
  // ── Assignment: invite (handshake) vs assign directly ──────────────────────
  const sendInvite = async () => {
    if (!writerId) { notify("Pick an expert to invite."); return; }
    const w = writers.find((x) => x.id === writerId);
    // The DB trigger emails the expert when invited_writer_id is set (no client mail yet).
    // writer_id:null clears any prior assignment so an order is never both assigned + pending.
    if (await patch({ invited_writer_id: writerId, invitation_status: "pending", writer_id: null }, `Invitation sent to ${w?.name || "expert"}`)) setReassign(false);
  };
  const cancelInvite = async () => {
    await patch({ invited_writer_id: null, invitation_status: null }, "Invitation cancelled");
  };
  const assignDirect = async () => {
    if (!writerId) { notify("Pick an expert."); return; }
    const next = ["new", "brief_received"].includes(status) ? "assigned" : status;
    if (await patch({ writer_id: writerId, status: next, invited_writer_id: null, invitation_status: null }, "Expert assigned")) { setStatus(next); setReassign(false); }
  };
  const deliver = async () => {
    if (!work) { notify("Cannot deliver — no work files attached."); return; }
    if (await patch({ status: "delivered" }, "Delivered to client")) setStatus("delivered");
  };
  const sendRevision = async () => {
    if (await patch({ status: "revision" }, "Sent back for revision")) {
      setStatus("revision");
      try {
        let email = writers.find((w) => w.id === (o.writer_id || (o.writer && o.writer.id)))?.email;
        if (!email && (o.writer_id)) { const { data: w } = await supabase.from("writers").select("email").eq("id", o.writer_id).maybeSingle(); email = w?.email; }
        if (email) await supabase.functions.invoke("send-email", { body: { event_id: "revision_requested", data: { to: email, ref: o.ref, note: revNote } } });
      } catch (e) { console.warn("revision email failed", e); }
      setRevNote("");
    }
  };
  const addFiles = async (fl) => {
    const arr = Array.from(fl || []); if (!arr.length) return;
    setBusy(true);
    for (const file of arr) {
      const path = `${o.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("order-files").upload(path, file);
      if (upErr) { console.error(upErr); continue; }
      await supabase.from("order_files").insert({ order_id: o.id, uploaded_by: user.id, file_name: file.name, file_path: path, kind: "final", size_bytes: file.size, version: null });
    }
    setBusy(false); notify("File uploaded.");
  };
  const download = async (f) => {
    if (!f.path) return;
    const { data } = await supabase.storage.from("order-files").createSignedUrl(f.path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  };
  const sendMsg = async (text) => {
    await supabase.from("order_messages").insert({ order_id: o.id, sender_id: user.id, sender_name: profile?.name || "Meridian", body: text, is_internal: internal });
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3500, display: "flex", justifyContent: "flex-end", animation: "rise .18s ease both" }}>
      <FilePreview file={preview} onClose={() => setPreview(null)} onDownload={download} />
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(24,24,38,.5)", backdropFilter: "blur(2px)" }} />
      <div className="mer-drawer-panel" style={{ position: "relative", width: "min(560px,100%)", height: "100%", background: "var(--paper)",
        boxShadow: "var(--shadow-pop)", display: "flex", flexDirection: "column", animation: "drawerIn .26s cubic-bezier(.22,1,.36,1) both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4, flexWrap: "wrap" }}>
              <span className="mono" style={{ color: "var(--faint)", fontSize: 11.5 }}>{o.ref}</span>
              <AdStatusPill status={headerStatus} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: AM.priority(o.priority).color, background: AM.priority(o.priority).bg, padding: "2px 8px", borderRadius: 99 }}>{AM.priority(o.priority).label}</span>
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 21, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: 1.14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.title}</div>
            {(o.client_name || o.program) && <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[o.client_name, o.program].filter(Boolean).join(" · ")}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 36, height: 36, borderRadius: 99, border: "none", background: "var(--surface-2)", color: "var(--ink-2)", display: "grid", placeItems: "center", cursor: "pointer", flex: "0 0 36px" }}><Icon name="x" size={19} /></button>
        </div>

        {!parts.length && status === "in_review" && (
          <div style={{ padding: "14px 20px", background: "var(--st-action-bg)", borderBottom: "1px solid var(--st-action-edge)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
              <Icon name="shield" size={16} style={{ color: "var(--st-action)" }} /> Ready for QC review
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: work ? "var(--st-done)" : "#B23B3B" }}>{work ? "✓ work attached" : "no work files"}</span>
            </div>
            <textarea rows={2} value={revNote} onChange={(e) => setRevNote(e.target.value)} placeholder="Optional feedback for the expert (sent with a revision request)…"
              style={{ width: "100%", padding: "9px 11px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--surface)", fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)", outline: "none", resize: "vertical", marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button size="sm" variant="primary" icon="check" disabled={!work || busy} onClick={deliver}>Approve &amp; release</Button>
              <Button size="sm" variant="soft" icon="refresh" disabled={busy} onClick={sendRevision}>Send back for revision</Button>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 9, lineHeight: 1.5 }}>Releasing delivers the final document, AI report and Originality Report to the client and triggers the balance invoice.</div>
            {!work && <div style={{ fontSize: 12, color: "#B23B3B", marginTop: 8 }}>Attach a final/draft file in the Files tab to enable delivery.</div>}
          </div>
        )}

        <div style={{ display: "flex", gap: 4, padding: "12px 20px 0", borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: "9px 14px", border: "none", background: "transparent", position: "relative",
              color: tab === id ? "var(--ink)" : "var(--ink-2)", fontSize: 13.5, fontWeight: tab === id ? 700 : 500, fontFamily: "var(--sans)", cursor: "pointer" }}>
              {label}{tab === id && <span style={{ position: "absolute", left: 8, right: 8, bottom: -1, height: 2, background: "var(--accent)", borderRadius: 99 }} />}
            </button>
          ))}
        </div>

        <div className="scroll" style={{ flex: 1, overflowY: "auto", padding: 20, minHeight: 0 }}>
          {tab === "details" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label className="mono" style={{ display: "block", color: "var(--ink-2)", fontSize: 10.5, marginBottom: 8 }}>Assignment</label>
                {(() => {
                  const assignedWriter = writers.find((w) => w.id === (o.writer_id || (o.writer && o.writer.id)));
                  const invitedWriter = writers.find((w) => w.id === o.invited_writer_id);
                  const isAssigned = !!(o.writer_id || (o.writer && o.writer.id));
                  const isPending = o.invitation_status === "pending" && !isAssigned;
                  if (isAssigned && !reassign) {
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 11, border: "1px solid var(--st-done-edge)", background: "var(--st-done-bg)" }}>
                        <Icon name="check" size={16} style={{ color: "var(--st-done)" }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{assignedWriter?.name || "Assigned expert"}</div>
                          <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Confirmed &amp; working{assignedWriter?.specialty ? ` · ${assignedWriter.specialty}` : ""}</div>
                        </div>
                        <Button size="sm" variant="soft" icon="refresh" disabled={busy} onClick={() => { setWriterId(""); setReassign(true); }}>Reassign</Button>
                      </div>
                    );
                  }
                  if (isPending && !reassign) {
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 11, border: "1px solid var(--st-action-edge)", background: "var(--st-action-bg)" }}>
                        <Icon name="clock" size={16} style={{ color: "var(--st-action)" }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>Invitation sent to {invitedWriter?.name || "expert"}</div>
                          <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Awaiting their response — the client isn't notified yet.</div>
                        </div>
                        <Button size="sm" variant="soft" icon="x" disabled={busy} onClick={cancelInvite}>Cancel</Button>
                      </div>
                    );
                  }
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <select style={SEL} value={writerId} onChange={(e) => setWriterId(e.target.value)}>
                        <option value="">— Choose an expert —</option>
                        {writers.map((w) => <option key={w.id} value={w.id}>{w.name}{w.specialty ? ` · ${w.specialty}` : ""}{w.active === false ? " (inactive)" : ""}</option>)}
                      </select>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Button size="sm" variant="primary" icon="send" disabled={busy || !writerId} onClick={sendInvite}>Send invitation</Button>
                        <Button size="sm" variant="soft" icon="check" disabled={busy || !writerId} onClick={assignDirect}>Assign directly</Button>
                        {(isAssigned || isPending) && <Button size="sm" variant="ghost" disabled={busy} onClick={() => setReassign(false)}>Keep current</Button>}
                      </div>
                      {o.invitation_status === "rejected" && !isAssigned && <div style={{ fontSize: 12, color: "var(--st-action)" }}>A previous invite was declined. Pick another expert.</div>}
                      <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5 }}>
                        <b>Send invitation</b> emails the expert to confirm or decline — the client is only told once they confirm. <b>Assign directly</b> skips the handshake.
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div>
                <label className="mono" style={{ display: "block", color: "var(--ink-2)", fontSize: 10.5, marginBottom: 8 }}>Status</label>
                {parts.length ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface-2)" }}>
                    <AdStatusPill status={headerStatus} />
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>Derived from the {parts.length} parts below — QC each part there.</span>
                  </div>
                ) : (
                  <select style={SEL} value={status} onChange={(e) => setStatus(e.target.value)}>
                    {AM.nextStatuses(o.status).map((s) => <option key={s} value={s}>{AM.statusLabel(s)}</option>)}
                  </select>
                )}
              </div>

              {/* Pricing & pay — quote drives the client invoice; pages/flat fee drive expert pay */}
              <div>
                <label className="mono" style={{ display: "block", color: "var(--ink-2)", fontSize: 10.5, marginBottom: 8 }}>Pricing &amp; pay</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  <input style={{ ...SEL, flex: "1 1 120px", width: "auto" }} type="number" min={0} step="0.01" placeholder="Quote total ($)" value={quoteTotal} onChange={(e) => setQuoteTotal(e.target.value)} />
                  <input style={{ ...SEL, flex: "1 1 120px", width: "auto" }} type="number" min={0} step="0.01" placeholder="Deposit ($)" value={quoteDeposit} onChange={(e) => setQuoteDeposit(e.target.value)} />
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input style={{ ...SEL, flex: "1 1 120px", width: "auto" }} type="number" min={0} placeholder="Pages" value={pages} onChange={(e) => setPages(e.target.value)} disabled={!!parts.length} />
                  <input style={{ ...SEL, flex: "1 1 120px", width: "auto" }} type="number" min={0} step="0.01" placeholder="Flat fee ($, optional)" value={rateProject} onChange={(e) => setRateProject(e.target.value)} />
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>
                  Client invoice uses the <b>quote total</b>. Expert pay = {parts.length ? "the sum of each part's pages" : "pages"} × $2.32, or the flat fee if set. Leave blank to show the expert "Set by admin".
                </div>
              </div>

              <Button variant="primary" icon="check" disabled={busy} onClick={saveDetails}>Save changes</Button>
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 18 }}>
                <AdRow k="Client" v={o.client_name || "—"} />
                <AdRow k="Email" v={o.client_email || "—"} />
                <AdRow k="Program" v={o.program || "—"} />
                <AdRow k="Scope" v={`${o.level_label || "—"} · ${o.scope_label || "—"}${o.pages ? ` · ${o.pages}pp` : ""}`} />
                <AdRow k="Due" v={(() => { const done = ["delivered", "closed"].includes(o.status); const r = done ? null : MM.relDue(o.due_at); return <>{o.due_date || "—"}{r ? <span style={{ marginLeft: 8, fontSize: 11.5, fontWeight: 700, color: r.urgent ? "var(--st-action)" : "var(--muted)" }}>{r.text}</span> : null}</>; })()} />
                <AdRow k="Created" v={o.created_at ? `${fmtWhen(o.created_at)} · ${MM.ago(o.created_at)}` : "—"} />
              </div>
              {/* Auto-scoped brief — same scoping logic as the client brief, plus the
                  client's instructions and any attachments they submitted. */}
              {(() => {
                const scope = AM.scopeSpec(o.level_label || "Graduate", o.program || "—");
                const briefFiles = files.filter((f) => f.kind === "brief");
                if (!scope.summary && !o.notes && !briefFiles.length) return null;
                return (
                  <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", background: "var(--surface)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", borderBottom: "1px solid var(--line)", background: "var(--accent-soft)" }}>
                      <Icon name="sparkle" size={15} style={{ color: "var(--accent-deep)" }} />
                      <span className="mono" style={{ textTransform: "uppercase", fontSize: 10, color: "var(--accent-deep)", letterSpacing: ".06em", flex: 1 }}>Auto-scoped brief</span>
                    </div>
                    <div style={{ padding: "13px 15px", fontSize: 13, color: "var(--ink)", lineHeight: 1.55 }}>{scope.summary}</div>
                    {o.notes && (
                      <div style={{ padding: "0 15px 13px" }}>
                        <div className="mono" style={{ textTransform: "uppercase", fontSize: 9, color: "var(--faint)", letterSpacing: ".06em", marginBottom: 5 }}>Client instructions</div>
                        <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55, fontStyle: "italic" }}>“{o.notes}”</div>
                      </div>
                    )}
                    {briefFiles.length > 0 && (
                      <div style={{ borderTop: "1px solid var(--line)", padding: "11px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                        {briefFiles.map((f) => (
                          <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Icon name="doc" size={14} style={{ color: "var(--accent)", flex: "0 0 auto" }} />
                            <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                            {f.size ? <span style={{ fontSize: 11, color: "var(--faint)" }}>{AM.fmtBytes(f.size)}</span> : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Client feedback — read-only, shown when the client has rated the delivery */}
              {feedback && (
                <div style={{ background: "var(--surface)", border: "1px solid var(--accent-soft)", borderRadius: 14, padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-2)" }}>Client feedback</span>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{fmtWhen(feedback.created_at)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: feedback.comment ? 10 : 0 }}>
                    <span style={{ display: "inline-flex", gap: 3 }}>
                      {[1, 2, 3, 4, 5].map((n) => {
                        const c = n <= feedback.rating ? "var(--accent)" : "var(--line-2)";
                        return (
                          <svg key={n} width={18} height={18} viewBox="0 0 24 24" fill={n <= feedback.rating ? c : "none"}
                            stroke={c} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 4l2.3 4.7 5.2.8-3.7 3.7.9 5.1L12 16l-4.6 2.4.9-5.1L4.6 9.5l5.2-.8z" />
                          </svg>
                        );
                      })}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{feedback.rating}.0</span>
                  </div>
                  {feedback.comment && (
                    <p className="serif italic" style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--ink)" }}>“{feedback.comment}”</p>
                  )}
                </div>
              )}

              {/* Deliverables — split an order into independently-reviewed parts (bundle) */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: parts.length || pOpen ? 12 : 4 }}>
                  <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-2)" }}>Deliverables{parts.length ? ` · ${parts.length}-part bundle` : ""}</span>
                  <div style={{ flex: 1 }} />
                  {!pOpen && <Button size="sm" variant="soft" icon="plus" onClick={() => setPOpen(true)}>Add part</Button>}
                </div>
                {parts.length === 0 && !pOpen && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Single deliverable. Add parts to make this a multi-part bundle — each part is briefed, submitted and QC-reviewed on its own.</div>}
                {parts.map((p) => (
                  <div key={p.id} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 22, height: 22, borderRadius: 6, background: "var(--surface-2)", color: "var(--muted)", display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontWeight: 700, fontSize: 11, flex: "0 0 22px" }}>{p.idx}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{p.pages ? `${p.pages}pp · ` : ""}{p.citation || ""}{p.due_date ? ` · due ${fmtWhen(p.due_date)}` : ""}{(() => { const done = ["delivered", "closed"].includes(p.status); const r = done ? null : MM.relDue(p.due_date); return r ? <span style={{ marginLeft: 6, fontWeight: 700, color: r.urgent ? "var(--st-action)" : "var(--muted)" }}>{r.text}</span> : null; })()}</div>
                      </div>
                      <AdStatusPill status={p.status} />
                      <button onClick={() => delPart(p)} title="Remove part" style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "transparent", color: "var(--faint)", display: "grid", placeItems: "center", cursor: "pointer", flex: "0 0 28px" }}><Icon name="x" size={14} /></button>
                    </div>
                    {p.status === "in_review" && (
                      <div style={{ display: "flex", gap: 8, marginTop: 8, paddingLeft: 32 }}>
                        <Button size="sm" variant="primary" icon="check" disabled={busy} onClick={() => setPartStatus(p, "delivered")}>Deliver part</Button>
                        <Button size="sm" variant="soft" icon="refresh" disabled={busy} onClick={() => setPartStatus(p, "revision")}>Send back</Button>
                      </div>
                    )}
                    {(p.status === "delivered" || p.status === "closed") && (
                      <div style={{ display: "flex", gap: 8, marginTop: 8, paddingLeft: 32 }}>
                        <Button size="sm" variant="ghost" icon="refresh" disabled={busy} onClick={() => setPartStatus(p, "revision")}>Reopen for revision</Button>
                      </div>
                    )}
                  </div>
                ))}
                {pOpen && (
                  <div style={{ borderTop: parts.length ? "1px solid var(--line)" : "none", paddingTop: parts.length ? 12 : 0, marginTop: parts.length ? 8 : 0, display: "flex", flexDirection: "column", gap: 8 }}>
                    <input style={SEL} placeholder="Part title (e.g. Part 1 — Practicum reflective journal)" value={pForm.title} onChange={(e) => setPForm((f) => ({ ...f, title: e.target.value }))} />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <input style={{ ...SEL, width: 90, flex: "0 0 90px" }} type="number" min={1} placeholder="Pages" value={pForm.pages} onChange={(e) => setPForm((f) => ({ ...f, pages: e.target.value }))} />
                      <input style={{ ...SEL, flex: "1 1 120px", width: "auto" }} placeholder="Citation (APA 7)" value={pForm.citation} onChange={(e) => setPForm((f) => ({ ...f, citation: e.target.value }))} />
                      <input style={{ ...SEL, flex: "0 0 auto", width: "auto" }} type="date" value={pForm.due_date} onChange={(e) => setPForm((f) => ({ ...f, due_date: e.target.value }))} />
                    </div>
                    <textarea style={{ ...SEL, minHeight: 56, resize: "vertical" }} placeholder="Key requirements (one per line)" value={pForm.requirements} onChange={(e) => setPForm((f) => ({ ...f, requirements: e.target.value }))} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button size="sm" variant="primary" icon="check" disabled={busy || !pForm.title.trim()} onClick={addPart}>Add part</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setPOpen(false); setPForm({ title: "", pages: "", citation: "", due_date: "", requirements: "" }); }}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "files" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input ref={addRef} type="file" multiple style={{ display: "none" }} onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              <button onClick={() => addRef.current && addRef.current.click()} disabled={busy} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, padding: "12px", borderRadius: 12, border: "1.5px dashed var(--line-2)", background: "var(--surface-2)", color: "var(--ink)", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 4 }}>
                <Icon name="upload" size={17} /> Upload a file
              </button>
              {files.length === 0 && <div style={{ padding: "20px 4px", color: "var(--muted)", fontSize: 13.5, textAlign: "center" }}>No files yet.</div>}
              {files.map((f) => {
                const k = AM.fileKind(f.kind);
                return (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", border: "1px solid var(--line)", borderRadius: 11, background: "var(--surface)" }}>
                    <TypeBadge name={f.name} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)" }}><span style={{ color: k.color, fontWeight: 600 }}>{k.label}</span>{f.size ? ` · ${AM.fmtBytes(f.size)}` : ""}{f.score != null ? ` · ${f.score}%` : ""}{f.version ? ` · ${f.version}` : ""}</div>
                    </div>
                    <button onClick={() => setPreview(f)} title="Preview" aria-label="Preview" style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", color: "var(--ink-2)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icon name="eye" size={16} /></button>
                    <button onClick={() => download(f)} title="Download" aria-label="Download" style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", color: "var(--ink-2)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icon name="download" size={16} /></button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "messages" && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <ChatThread messages={msgs} scrollKey={tab} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0 0", fontSize: 13, color: "var(--ink-2)", cursor: "pointer" }}>
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal note (not visible to client)
              </label>
              <ChatComposer onSend={sendMsg} placeholder={internal ? "Internal note…" : "Message the client/expert…"} />
            </div>
          )}

          {tab === "payments" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {clientType === "custom" ? (
                <div style={{ background: "var(--st-progress-bg)", border: "1px solid var(--st-progress-edge)", borderRadius: 14, padding: 18, fontSize: 13.5, color: "var(--ink)" }}>
                  <b>Custom account</b> — payment is pre-arranged for this client. No invoices are generated and no payment steps apply.
                </div>
              ) : (
                <>
                  {invoice && (() => {
                    const ST = {
                      paid:             { l: "Paid",            c: "var(--st-done)",     b: "var(--st-done-bg)" },
                      payment_declared: { l: "Payment pending", c: "var(--st-action)",   b: "var(--st-action-bg)" },
                      payment_flagged:  { l: "Flagged",         c: "var(--st-revision)", b: "var(--st-revision-bg)" },
                      details_sent:     { l: "Details sent",    c: "var(--accent-deep)", b: "var(--accent-soft)" },
                      link_pending:     { l: "Link required",   c: "var(--st-progress)", b: "var(--st-progress-bg)" },
                      link_sent:        { l: "Link sent",       c: "var(--st-progress)", b: "var(--st-progress-bg)" },
                    };
                    const st = ST[invoice.status] || { l: "Unpaid", c: "var(--accent-deep)", b: "var(--accent-soft)" };
                    const methodLabel = (MM.PAYMENT_METHOD_CATALOG.find((m) => m.id === invoice.payment_method) || {}).label || invoice.payment_method || "—";
                    return (
                    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                        <span className="mono" style={{ fontSize: 11.5, color: "var(--faint)" }}>{invoice.invoice_number}</span>
                        <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 11px", borderRadius: 99, color: st.c, background: st.b }}>{st.l}</span>
                        <div style={{ flex: 1 }} />
                        <span style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600 }}>{AM.money(Number(invoice.total_due))}</span>
                      </div>
                      <AdRow k="Method on file" v={methodLabel} />
                      {invoice.declared_at && <AdRow k="Declared" v={fmtWhen(invoice.declared_at)} />}
                      {invoice.link_sent_at && <AdRow k="Link sent" v={fmtWhen(invoice.link_sent_at)} />}
                      {invoice.paid_at && <AdRow k="Paid" v={fmtWhen(invoice.paid_at)} />}

                      {/* INDIRECT (Wise/Payoneer): paste the platform payment link */}
                      {isIndirectInv && invoice.status !== "paid" && (
                        <div style={{ marginTop: 14, background: invoice.link_sent_at ? "var(--surface-2)" : "var(--st-progress-bg)", border: `1px solid ${invoice.link_sent_at ? "var(--line)" : "var(--st-progress-edge)"}`, borderRadius: 12, padding: 14 }}>
                          <div className="mono" style={{ fontSize: 9, letterSpacing: ".12em", color: invoice.link_sent_at ? "var(--muted)" : "var(--st-progress)", marginBottom: 8 }}>
                            {invoice.link_sent_at ? `${methodLabel} link sent · ${fmtWhen(invoice.link_sent_at)}` : "Payment link required"}
                          </div>
                          {!invoice.link_sent_at && (
                            <p style={{ fontSize: 12.5, color: "var(--ink-2)", margin: "0 0 10px", lineHeight: 1.5 }}>
                              Generate a {methodLabel} payment request for <b>{AM.money(Number(invoice.total_due))}</b>, then paste the link below to email it to the client.
                            </p>
                          )}
                          <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder={`Paste ${methodLabel} payment link (https://…)`} style={{ ...SEL, width: "100%", marginBottom: 8 }} />
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <input type="date" value={linkExp} onChange={(e) => setLinkExp(e.target.value)} title="Link expiry (optional)" style={{ ...SEL, width: "auto", flex: "0 0 auto" }} />
                            <Button size="sm" variant="primary" icon="send" disabled={busy || !linkUrl.trim()} onClick={submitLink}>
                              {invoice.link_sent_at ? "Resend link" : "Send to client"}
                            </Button>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 8 }}>Emailed straight to the client — don't send the link directly.</div>
                        </div>
                      )}

                      {invoice.status !== "paid" && (
                        <div style={{ marginTop: 12 }}>
                          <Button size="sm" variant="primary" icon="check" disabled={busy}
                            onClick={() => onInvoiceAction && onInvoiceAction(invoice, "confirm")}>Mark as paid</Button>
                        </div>
                      )}
                    </div>
                    );
                  })()}
                  <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <PaymentBadge status={o.payment_status} /><div style={{ flex: 1 }} />
                    </div>
                    <AdRow k="Order total" v={AM.money(o.quote_total)} />
                    <AdRow k="Deposit" v={AM.money(o.quote_deposit)} />
                    <AdRow k="Balance" v={AM.money(AM.balance(o))} />
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>Payments are received off-platform and tracked on the invoice above — confirming it emails the client and marks the order paid automatically.</div>
                </>
              )}

              {/* Client access — magic-link welcome (use on first delivery) */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>Client access</div>
                <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
                  Email {o.client_name || "the client"} a magic-link welcome so they can reach their portal — ideal on first delivery.
                </p>
                <Button size="sm" variant="soft" icon="mail" disabled={busy || !clientId}
                  onClick={() => onInvoiceAction && onInvoiceAction(null, "send_welcome", null, { client_id: clientId })}>Send welcome email</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { AdStatusPill, AdRow };
