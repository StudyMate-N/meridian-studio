/* ============================================================
   Billing — consolidated invoice page + payment method modal.
   Payment ACCOUNT DETAILS are never rendered here: they are
   emailed by the `payments` edge function only.
   ============================================================ */
import React from "react";
import ReactDOM from "react-dom";
import { supabase } from "../lib/supabase.js";
import { Icon } from "./kit/icons.jsx";
import { MM } from "./kit/model.js";
import { Button } from "./kit/components.jsx";

const { useState, useEffect, useMemo } = React;
const money = (n) => "$" + Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtTs = (ts) => { try { const d = new Date(ts); return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) + " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); } catch { return ""; } };

async function callPayments(action, invoice_id, note, method) {
  const { data, error } = await supabase.functions.invoke("payments", { body: { action, invoice_id, note, method } });
  if (error) {
    // surface the function's JSON error body when available
    try { const ctx = await error.context?.json?.(); if (ctx) return ctx; } catch {}
    return { error: error.message || "request_failed" };
  }
  return data || { ok: true };
}

/* ---- Payment method selector (first-time + change) --------- */
export function PaymentMethodModal({ profile, onSaved, onClose, notify }) {
  const [sel, setSel] = useState(profile?.default_payment_method || null);
  const [busy, setBusy] = useState(false);
  const methods = MM.PAYMENT_METHOD_CATALOG.filter((m) => !m.kenyaOnly || profile?.country === "Kenya");
  const selMeta = MM.PAYMENT_METHOD_CATALOG.find((m) => m.id === sel);
  async function save() {
    if (!sel) return;
    setBusy(true);
    // Saved server-side via the payments function (service role) — robust against
    // any client-side RLS/column-grant subtlety, and validates the method + Kenya gate.
    const r = await callPayments("set_method", null, null, sel);
    setBusy(false);
    if (r?.error === "mpesa_restricted") { notify && notify(r.message); setSel(null); return; }
    if (r?.error) { notify && notify("Could not save your choice — try again."); return; }
    onSaved(sel);
  }
  return ReactDOM.createPortal(
    <div onClick={onClose} className="mer-root" style={{ position: "fixed", inset: 0, zIndex: 4200, height: "auto", width: "auto",
      overflow: "hidden", background: "rgba(20,16,10,.6)",
      backdropFilter: "blur(3px)", display: "grid", placeItems: "center", padding: 16, animation: "rise .2s ease both" }}>
      <div onClick={(e) => e.stopPropagation()} className="scroll" style={{ width: "min(620px,100%)", maxHeight: "92vh", overflowY: "auto",
        background: "var(--surface)", borderRadius: "var(--r-lg)", padding: "28px 26px 22px", boxShadow: "var(--shadow-pop)" }}>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 6px", color: "var(--ink)" }}>
          How would you like to pay?
        </h2>
        <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 20px" }}>Your choice will be saved as your default for future payments.</p>
        <div className="mer-paygrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {methods.map((m) => {
            const on = sel === m.id;
            return (
              <button key={m.id} onClick={() => setSel(m.id)} style={{ position: "relative", textAlign: "left", padding: "14px 15px",
                borderRadius: 13, border: `1.5px solid ${on ? "var(--accent)" : "var(--line-2)"}`,
                background: on ? "var(--accent-soft)" : "var(--surface)", cursor: "pointer", fontFamily: "var(--sans)", transition: "all .13s" }}>
                {on && <span style={{ position: "absolute", top: 10, right: 10, width: 20, height: 20, borderRadius: 99,
                  background: "var(--accent)", color: "var(--on-accent)", display: "grid", placeItems: "center" }}><Icon name="check" size={12} stroke={3} /></span>}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{m.label}</span>
                  {m.indirect && <span className="mono" style={{ fontSize: 8, color: "var(--st-progress)", background: "var(--st-progress-bg)", padding: "1px 6px", borderRadius: 99 }}>LINK</span>}
                </div>
                <div className="mono" style={{ fontSize: 9, color: "var(--accent-deep)", marginBottom: 5 }}>{m.tags}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{m.desc}</div>
              </button>
            );
          })}
        </div>
        {selMeta?.indirect && (
          <div style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "11px 13px", borderRadius: 11, marginBottom: 16,
            background: "var(--st-progress-bg)", border: "1px solid var(--st-progress-edge)" }}>
            <Icon name="info" size={15} style={{ color: "var(--st-progress)", flex: "0 0 auto", marginTop: 1 }} />
            <span style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
              With {selMeta.label}, we'll email you a <b>secure payment link</b> with the amount pre-filled — usually within a few hours of your request.
            </span>
          </div>
        )}
        <Button full variant="primary" iconRight="right" disabled={!sel || busy} onClick={save}>Save &amp; continue</Button>
      </div>
    </div>,
    document.body,
  );
}

/* ---- Consolidated invoice page ------------------------------ */
export function InvoiceView({ invoices, profile, user, back, notify, onChangeMethod, onDeclared }) {
  const open = useMemo(() => (invoices || []).filter((i) => MM.OPEN_INVOICE_STATES.includes(i.status))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), [invoices]);
  const reference = open[0] || null;
  const total = open.reduce((a, i) => a + Number(i.total_due || 0), 0);
  const anyDeclared = open.some((i) => i.status === "payment_declared");
  const anyFlagged = open.some((i) => i.status === "payment_flagged");
  const flagNote = (open.find((i) => i.status === "payment_flagged" && i.flag_note) || {}).flag_note;
  const lastPaid = useMemo(() => (invoices || []).filter((i) => i.status === "paid")
    .sort((a, b) => new Date(b.paid_at || 0) - new Date(a.paid_at || 0))[0], [invoices]);

  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [detailsSent, setDetailsSent] = useState(!!reference?.details_sent_at);
  const [cooldown, setCooldown] = useState(0);
  const [payLink, setPayLink] = useState(null);
  useEffect(() => { setDetailsSent(!!reference?.details_sent_at); }, [reference?.id]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown > 0]);

  const methodMeta = MM.PAYMENT_METHOD_CATALOG.find((m) => m.id === profile?.default_payment_method);
  const isIndirect = !!methodMeta?.indirect;
  // indirect flow stage, derived from the reference invoice's status
  const stage = reference?.status; // unpaid | details_sent | link_pending | link_sent | payment_flagged

  // For an indirect, link-based method, pull the platform link once the admin
  // has sent it (RLS lets the client read only their own sent link).
  useEffect(() => {
    let alive = true;
    if (isIndirect && reference?.id && (stage === "link_sent" || reference?.link_sent_at)) {
      supabase.from("payment_links").select("link_url, method, expires_at").eq("invoice_id", reference.id).maybeSingle()
        .then(({ data }) => { if (alive) setPayLink(data || null); });
    } else { setPayLink(null); }
    return () => { alive = false; };
  }, [isIndirect, reference?.id, stage, reference?.link_sent_at]);

  async function sendDetails() {
    if (!reference) return;
    if (!profile?.default_payment_method) { onChangeMethod(); return; }
    setBusy(true);
    const r = await callPayments("send_details", reference.id);
    setBusy(false);
    if (r?.error === "mpesa_restricted") { notify(r.message); onChangeMethod(); return; }
    if (r?.error === "cooldown") { setCooldown(r.retry_in || 60); return; }
    if (r?.error) { notify("Could not send the details — try again."); return; }
    setDetailsSent(true); setCooldown(60);
    notify(r?.indirect
      ? "Request received — we'll email your secure payment link shortly."
      : "Payment details sent to your email.");
  }

  async function declare() {
    setBusy(true);
    for (const inv of open.filter((i) => i.status !== "payment_declared")) {
      const r = await callPayments("declare", inv.id);
      if (r?.error) { setBusy(false); notify("Could not record your declaration — try again."); return; }
    }
    setBusy(false); setConfirming(false);
    notify("Thank you — we're verifying your payment now.");
    onDeclared && onDeclared();
  }

  // Shared "I've sent payment" → confirm flow (used by both direct + link flows).
  const declareBlock = (
    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
      {!confirming ? (
        <>
          <div style={{ fontSize: 13.5, color: "var(--ink-2)", marginBottom: 10 }}>Sent your payment?</div>
          <Button variant="ghost" iconRight="right" onClick={() => setConfirming(true)}>I've sent payment</Button>
        </>
      ) : (
        <div style={{ background: "var(--surface-2)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>Please confirm:</div>
          <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.8, marginBottom: 14 }}>
            Method: <b>{methodMeta?.label || "—"}</b><br />
            Amount: <b>{money(total)}</b><br />
            Reference: <b className="mono" style={{ fontSize: 11.5 }}>{reference?.invoice_number}</b>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <Button variant="primary" icon="check" disabled={busy} onClick={declare}>Confirm — I've sent this payment</Button>
            <button onClick={() => setConfirming(false)} style={{ background: "transparent", border: "none", color: "var(--muted)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", animation: "rise .3s ease both" }}>
      <button onClick={back} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "transparent", border: "none",
        color: "var(--ink-2)", fontSize: 14, fontWeight: 500, padding: "4px 0", marginBottom: 18, cursor: "pointer" }}>
        <Icon name="left" size={17} /> Back to orders
      </button>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--accent)", marginBottom: 8 }}>Academic Coaching &amp; Study Support</div>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(28px,3.4vw,38px)", fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>Invoice</h1>
          {reference && <div style={{ fontSize: 13.5, color: "var(--ink-2)", marginTop: 8 }}>
            <span className="mono" style={{ fontSize: 11.5 }}>{reference.invoice_number}</span> · Issued {fmtTs(reference.issued_date).split(" at ")[0]} · Due on receipt
          </div>}
          {open.length > 1 && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
            Consolidates orders: {open.map((i) => i.invoice_number).join(", ")}
          </div>}
        </div>
        {open.length > 0 && <Button variant="ghost" icon="download" onClick={() => window.print()}>Download PDF</Button>}
      </div>

      {open.length === 0 ? (
        <div style={{ textAlign: "center", padding: "56px 20px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--st-done-bg)", color: "var(--st-done)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}><Icon name="check" size={28} /></div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--ink)", marginBottom: 6 }}>All clear ✓</div>
          <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>You have no outstanding invoices.</p>
          {lastPaid && <p style={{ fontSize: 12.5, color: "var(--faint)", margin: "10px 0 0" }}>Last payment: {lastPaid.invoice_number} · {fmtTs(lastPaid.paid_at)}</p>}
        </div>
      ) : (
        <>
          {/* line items */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", overflow: "hidden", marginBottom: 22 }}>
            {open.map((inv) => (inv.line_items || []).map((li, i) => (
              <div key={inv.id + "-" + i} style={{ display: "flex", alignItems: "baseline", gap: 14, padding: "15px 20px", borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>{li.description}</div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>{li.sub_description} · <span className="mono" style={{ fontSize: 10 }}>{inv.invoice_number}</span></div>
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-2)", whiteSpace: "nowrap" }}>{li.qty} × {money(li.rate)}</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 600, color: "var(--ink)", width: 90, textAlign: "right" }}>{money(li.amount)}</div>
              </div>
            )))}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 30, padding: "13px 20px", borderBottom: "1px solid var(--line)" }}>
              <span style={{ fontSize: 13.5, color: "var(--muted)" }}>Subtotal</span>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", width: 90, textAlign: "right" }}>{money(total)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "baseline", gap: 30, padding: "15px 20px", background: "var(--accent-soft)" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--accent-deep)" }}>Total due</span>
              <span style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 600, color: "var(--accent-deep)", width: 110, textAlign: "right" }}>{money(total)}</span>
            </div>
          </div>

          {/* payment section — states */}
          {anyDeclared ? (
            /* State C — declared, awaiting confirmation */
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "18px 20px", borderRadius: "var(--r-lg)",
              background: "var(--st-action-bg)", border: "1px solid var(--st-action-edge)" }}>
              <Icon name="clock" size={20} style={{ color: "var(--st-action)", flex: "0 0 auto", marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>Payment under review</div>
                <p style={{ fontSize: 13.5, color: "var(--ink-2)", margin: 0, lineHeight: 1.55 }}>
                  You declared payment on {fmtTs((open.find((i) => i.status === "payment_declared") || {}).declared_at)}.
                  We're verifying receipt — this usually takes a few hours.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: "20px 20px 18px" }}>
              {anyFlagged && (
                /* State E — flagged */
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderRadius: 12, marginBottom: 18,
                  background: "var(--st-revision-bg)", border: "1px solid var(--st-revision-edge)" }}>
                  <Icon name="alert" size={18} style={{ color: "var(--st-revision)", flex: "0 0 auto", marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 3 }}>Payment not confirmed</div>
                    <p style={{ fontSize: 13, color: "var(--ink-2)", margin: 0, lineHeight: 1.5 }}>
                      We were unable to verify your payment. Please check your transfer and declare again, or message us for help.
                      {flagNote && <><br /><i>"{flagNote}"</i></>}
                    </p>
                  </div>
                </div>
              )}

              <div style={{ fontSize: 15.5, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>Ready to pay?</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Paying via</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent-deep)", background: "var(--accent-soft)", padding: "4px 12px", borderRadius: 99 }}>
                  {methodMeta ? methodMeta.label : "No method selected"}
                </span>
                <button onClick={onChangeMethod} style={{ background: "transparent", border: "none", color: "var(--muted)", fontSize: 12.5, textDecoration: "underline", cursor: "pointer" }}>Change</button>
              </div>

              {isIndirect ? (
                /* INDIRECT — Wise / Payoneer: admin generates a secure link */
                (stage === "link_sent" || payLink) ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "var(--st-done)", fontWeight: 600, marginBottom: 12 }}>
                      <Icon name="check" size={15} /> {methodMeta?.label} payment link sent to {profile?.email || user?.email}
                    </div>
                    {payLink?.link_url && (
                      <a href={payLink.link_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "inline-block", marginBottom: 18 }}>
                        <Button variant="primary" icon="card">Pay {money(total)} via {methodMeta?.label} →</Button>
                      </a>
                    )}
                    {declareBlock}
                  </>
                ) : (stage === "link_pending" || detailsSent) ? (
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderRadius: 12,
                    background: "var(--st-progress-bg)", border: "1px solid var(--st-progress-edge)" }}>
                    <Icon name="clock" size={18} style={{ color: "var(--st-progress)", flex: "0 0 auto", marginTop: 1 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 3 }}>Your payment link is being prepared</div>
                      <p style={{ fontSize: 13, color: "var(--ink-2)", margin: 0, lineHeight: 1.5 }}>
                        We're generating your secure {methodMeta?.label} link and will email it to {profile?.email || user?.email} shortly — usually within a few hours.
                      </p>
                    </div>
                  </div>
                ) : (
                  <Button variant="primary" icon="send" disabled={busy} onClick={sendDetails}>Request my payment link</Button>
                )
              ) : (
                /* DIRECT — Sendwave / Western Union / M-Pesa / TapTap / Skrill */
                detailsSent ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "var(--st-done)", fontWeight: 600, marginBottom: 6 }}>
                      <Icon name="check" size={15} /> Payment details sent to {profile?.email || user?.email}
                    </div>
                    <button disabled={cooldown > 0 || busy} onClick={sendDetails} style={{ background: "transparent", border: "none",
                      color: cooldown > 0 ? "var(--faint)" : "var(--muted)", fontSize: 12.5, textDecoration: "underline",
                      cursor: cooldown > 0 ? "default" : "pointer", padding: 0, marginBottom: 18 }}>
                      {cooldown > 0 ? `Resend in 0:${String(cooldown).padStart(2, "0")}` : "Resend"}
                    </button>
                    {declareBlock}
                  </>
                ) : (
                  <Button variant="primary" icon="send" disabled={busy} onClick={sendDetails}>Send me payment details</Button>
                )
              )}
              <p style={{ fontSize: 11.5, color: "var(--faint)", margin: "14px 0 0" }}>
                {isIndirect
                  ? "For your security, your payment link is delivered privately by email — and shown here once it's ready."
                  : "For your security, payment details are delivered privately by email — never shown here."}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
