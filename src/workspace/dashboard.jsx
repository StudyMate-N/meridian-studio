/* ============================================================
   Dashboard — Stream + Board (ES module). Bound to the real
   status model (MM). orders come from useWorkspaceData().
   ============================================================ */
import React from "react";
import { Icon } from "./kit/icons.jsx";
import { MM } from "./kit/model.js";
import { Button, StatusChip, Meta, SectionLabel, StatCard, DashStatRow, DashWidgets, DashWidget } from "./kit/components.jsx";

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
export function initialsOf(name) {
  if (!name) return "··";
  return name.replace(/^Dr\.?\s+/i, "").split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
}
export const inProgressStatus = (s) => ["assigned", "writing", "in_review", "revision"].includes(s);

/* Academic-level → expected citation/sources/length spec. Used to *derive* the
   structured brief fields the prototype shows when the order doesn't carry them
   explicitly. Keyed on the client-facing level_label, with a Graduate default. */
export const LEVEL_SPEC = {
  Undergraduate: { citation: "APA 7th edition", sources: "3 peer-reviewed sources", length: "~1,000 words" },
  Graduate:      { citation: "APA 7th edition", sources: "5 peer-reviewed sources", length: "~1,500 words" },
  Doctoral:      { citation: "APA 7th edition", sources: "8 peer-reviewed sources", length: "~2,500 words" },
};
export const levelSpec = (level) => LEVEL_SPEC[level] || LEVEL_SPEC.Graduate;

/* honest relative due line — computed from the RAW date (due_at), never the
   pre-formatted string */
function dueInfo(o) {
  if (!o.due_at) return null;
  try {
    const due = new Date(o.due_at); if (isNaN(+due)) return null;
    const days = Math.ceil((due - new Date()) / 86400000);
    const label = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (days < 0) return { text: `Due ${label} · overdue`, urgent: true };
    if (days === 0) return { text: `Due ${label} · today`, urgent: true };
    return { text: `Due ${label} · in ${days} day${days === 1 ? "" : "s"}`, urgent: days <= 3 };
  } catch { return null; }
}

/* a11y: whole-card click that also works from the keyboard */
const pressable = (onActivate) => ({
  role: "button", tabIndex: 0,
  onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onActivate(); } },
});

/* static payment-state badge (declared / flagged / paid) — live dot on pending */
function PayStateBadge({ status }) {
  const cfg = status === "payment_declared"
    ? { label: "Payment pending", color: "var(--st-action)", bg: "var(--st-action-bg)", edge: "var(--st-action-edge)", dot: true }
    : status === "payment_flagged"
      ? { label: "Payment issue", color: "var(--st-revision)", bg: "var(--st-revision-bg)", edge: "var(--st-revision-edge)", icon: "alert" }
      : { label: "Invoice paid ✓", color: "var(--st-done)", bg: "var(--st-done-bg)", edge: "var(--st-done-edge)" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 999,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.edge}`, fontWeight: 600, fontSize: 12.5, whiteSpace: "nowrap" }}>
      {cfg.dot && <span style={{ width: 7, height: 7, borderRadius: 99, background: cfg.color, animation: "pulse-dot 2s ease-in-out infinite" }} />}
      {cfg.icon && <Icon name={cfg.icon} size={13} />}
      {cfg.label}
    </span>
  );
}

/* ---- Order card — one status encoding, one contextual CTA --- */
function OrderCard({ o, open, variant = "progress", onPay }) {
  const tn = MM.tone(o.status);
  const [hover, setHover] = React.useState(false);
  const due = dueInfo(o);
  const showProgram = o.program && o.program !== o.title;
  const inv = o.invoice;
  const invoiceDue = inv ? Number(inv.total_due || 0) : (MM.balance(o) > 0 ? MM.balance(o) : o.quote_total);
  return (
    <article onClick={() => open(o)} {...pressable(() => open(o))}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: "relative", display: "flex", background: "var(--surface)",
        border: `1px solid ${hover ? tn.edge : "var(--line)"}`,
        borderRadius: "var(--r-lg)", overflow: "hidden", cursor: "pointer",
        boxShadow: hover ? "var(--shadow-pop)" : "var(--shadow-card)",
        transform: hover ? "translateY(-2px)" : "none", transition: "all .18s ease",
      }}>
      <div style={{ width: 5, flex: "0 0 5px", background: tn.color }} />

      <div style={{ flex: 1, padding: "var(--pad-card)", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 13, flexWrap: "wrap" }}>
          <span className="mono" style={{ color: "var(--faint)", fontSize: 11.5 }}>{o.ref}</span>
          {showProgram && <>
            <span style={{ width: 3, height: 3, borderRadius: 99, background: "var(--faint)" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)", letterSpacing: "-0.01em" }}>{o.program}</span>
          </>}
          <div style={{ flex: 1 }} />
          {o.unread > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--st-progress)",
              fontSize: 11.5, fontWeight: 700 }}><Icon name="chat" size={13} />{o.unread}</span>
          )}
          <StatusChip status={o.status} pulse={["assigned", "writing", "revision"].includes(o.status)} />
        </div>

        <h3 style={{ margin: "0 0 8px", fontFamily: "var(--serif)", fontSize: 22, fontWeight: 500,
          letterSpacing: "-0.015em", color: "var(--ink)", lineHeight: 1.18, textWrap: "balance" }}>{o.title}</h3>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
          {o.level_label && <Meta>{o.level_label}</Meta>}
          {o.scope_label && <Meta>{o.scope_label}</Meta>}
          {o.client_type !== "custom" && o.quote_total > 0 && <Meta>${o.quote_total}</Meta>}
        </div>

        <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 14 }}>{MM.statusSentence(o)}</div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
          paddingTop: 14, borderTop: "1px solid var(--line)" }}>
          {!MM.isReleased(o) && due ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="clock" size={15} style={{ color: due.urgent ? "var(--st-action)" : "var(--muted)" }} />
              <span style={{ fontSize: 13, fontWeight: due.urgent ? 600 : 500, color: due.urgent ? "var(--st-action)" : "var(--ink)" }}>{due.text}</span>
            </div>
          ) : inv ? (
            <span className="mono" style={{ fontSize: 11, color: "var(--faint)" }}>{inv.invoice_number}</span>
          ) : null}
          <div style={{ flex: 1 }} />
          {o.client_type === "custom" ? (
            <Icon name="chevR" size={17} style={{ color: "var(--faint)" }} />
          ) : inv && inv.status === "payment_declared" ? (
            <PayStateBadge status="payment_declared" />
          ) : inv && inv.status === "payment_flagged" ? (
            <div onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <PayStateBadge status="payment_flagged" />
              <Button size="sm" variant="soft" onClick={() => (onPay ? onPay(o) : open(o, "invoice"))}>Resolve</Button>
            </div>
          ) : inv && inv.status === "paid" ? (
            <PayStateBadge status="paid" />
          ) : variant === "action" && inv ? (
            <div onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="primary" icon="doc" onClick={() => (onPay ? onPay(o) : open(o, "invoice"))}>Pay invoice · ${invoiceDue}</Button>
            </div>
          ) : variant === "action" ? (
            <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Invoice coming shortly</span>
          ) : (
            <Icon name="chevR" size={17} style={{ color: "var(--faint)" }} />
          )}
        </div>
      </div>
    </article>
  );
}

/* ---- Compact delivered tile -------------------------------- */
function OrderTile({ o, open }) {
  const tn = MM.tone(o.status);
  const [hover, setHover] = React.useState(false);
  return (
    <article onClick={() => open(o, "files")} {...pressable(() => open(o, "files"))}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: "linear-gradient(180deg, var(--surface) 0%, var(--surface-2) 100%)",
        border: `1px solid ${hover ? "var(--st-done-edge)" : "var(--line)"}`,
        borderRadius: 15, padding: "19px 17px", cursor: "pointer", borderTop: "3px solid var(--st-done)",
        boxShadow: hover ? "var(--shadow-pop)" : "var(--shadow-card)",
        transform: hover ? "translateY(-2px)" : "none", transition: "all .18s",
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span className="mono" style={{ color: "var(--faint)", fontSize: 10.5 }}>{o.ref}</span>
        <div style={{ flex: 1 }} />
        {o.unread > 0 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--st-progress)",
            fontSize: 11.5, fontWeight: 700 }}><Icon name="chat" size={13} />{o.unread}</span>
        )}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, color: "var(--st-done)" }}>
          <Icon name="check" size={13} stroke={2.5} /> {MM.label(o.status, "client")}
        </span>
      </div>
      <h4 style={{ margin: "0 0 6px", fontFamily: "var(--serif)", fontSize: 18, fontWeight: 500,
        letterSpacing: "-0.01em", lineHeight: 1.22, color: "var(--ink)" }}>{o.title}</h4>
      <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        {o.program && o.program !== o.title && <Meta>{o.program}</Meta>}
        {o.level_label && <Meta>{o.level_label}</Meta>}
        {o.client_type !== "custom" && o.quote_total > 0 && <Meta>${o.quote_total}</Meta>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 11px", borderRadius: 10,
        background: "var(--st-done-bg)", border: "1px solid var(--st-done-edge)", marginBottom: 12 }}>
        <Icon name="shield" size={14} style={{ color: "var(--st-done)", flex: "0 0 auto" }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--st-done)" }}>Integrity verified</span>
        <span style={{ fontSize: 12, color: "var(--ink-2)" }}>· AI report &amp; Originality included</span>
      </div>
      <p className="serif italic" style={{ margin: "0 0 14px", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55 }}>
        Open the delivery to preview your completed documents.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1 }} />
        <div onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="soft" icon="files" onClick={() => open(o, "files")}>View delivery</Button>
        </div>
      </div>
    </article>
  );
}

/* ---- "Needs you" queue — every action item, exactly once ---- */
export function ActionQueue({ orders, open, onPay, hideLabel }) {
  const [showAll, setShowAll] = React.useState(false);
  const actionOrders = orders.filter((o) => MM.bucketOf(o) === "action");
  const unreadRows = orders.filter((o) => MM.bucketOf(o) !== "action" && o.unread > 0);
  const total = actionOrders.length + unreadRows.length;
  if (!total) return null;
  const visible = showAll ? actionOrders : actionOrders.slice(0, 3);
  const rows = showAll ? unreadRows : unreadRows.slice(0, Math.max(0, 3 - visible.length));
  const hidden = total - visible.length - rows.length;
  return (
    <section id="mer-grp-action" style={{ marginBottom: 34 }}>
      {!hideLabel && <SectionLabel color="var(--st-action)" count={total}>{MM.BUCKET_LABELS.action}</SectionLabel>}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-list)" }}>
        {visible.map((o) => <OrderCard key={o.id} o={o} open={open} variant="action" onPay={onPay} />)}
        {rows.map((o) => (
          <div key={"r-" + o.id} onClick={() => open(o)} {...pressable(() => open(o))}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", cursor: "pointer",
              background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 13, boxShadow: "var(--shadow-card)" }}>
            <Icon name="chat" size={17} style={{ color: "var(--st-progress)", flex: "0 0 auto" }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              New reply on <b>{o.title}</b>
            </span>
            <div onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="soft" iconRight="right" onClick={() => open(o)}>Open</Button>
            </div>
          </div>
        ))}
        {hidden > 0 && !showAll && (
          <Button variant="ghost" onClick={() => setShowAll(true)}>Show all {total}</Button>
        )}
      </div>
    </section>
  );
}

/* ---- "Ready for you" — delivered packages, one card per order */
export function ReadyShelf({ packages, onDownload, open, hideLabel }) {
  if (!packages.length) return null;
  return (
    <section style={{ marginBottom: hideLabel ? 0 : 34 }}>
      {!hideLabel && <SectionLabel color="var(--st-done)" count={packages.length}>Ready for you</SectionLabel>}
      <div className="scroll" style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 6 }}>
        {packages.map((p) => (
          <div key={p.order.id} style={{ flex: "0 0 270px", width: 270, background: "var(--surface)",
            border: "1px solid var(--st-done-edge)", borderRadius: 15, padding: 16, boxShadow: "var(--shadow-card)" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 500, color: "var(--ink)",
              lineHeight: 1.25, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.order.title}</div>
            <div className="mono" style={{ fontSize: 10, color: "var(--faint)", marginBottom: 8 }}>
              {p.order.ref} · Delivered {p.deliveredAt}
            </div>
            {p.version > 1 && (
              <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, color: "var(--st-revision)",
                background: "var(--st-revision-bg)", border: "1px solid var(--st-revision-edge)",
                padding: "2px 8px", borderRadius: 99, marginBottom: 8 }}>v{p.version} · revised</span>
            )}
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14, lineHeight: 1.5 }}>{p.contents}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="sm" variant="primary" icon="download" onClick={() => onDownload(p.finalFile)} full>Download</Button>
              {p.order.status === "delivered" && (
                <Button size="sm" variant="ghost" onClick={() => open(p.order, "files")}>Revision</Button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 12, color: "var(--muted)" }}>
        <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--st-done)", flex: "0 0 auto" }} />
        Every delivery includes an AI report and an Originality Report.
      </div>
    </section>
  );
}

/* ---- quiet end-of-page re-order row ------------------------- */
export function EndCap({ onStart }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 38 }}>
      <span className="serif italic" style={{ fontSize: 15, color: "var(--ink-2)" }}>Need something else?</span>
      <Button variant="ghost" icon="plus" onClick={() => onStart()}>Start a new brief</Button>
    </div>
  );
}

/* ---- Empty / loading / error states ----------------------- */
export function EmptyState({
  title = "No orders yet.",
  body = "Drop your rubric and our AI intake drafts the brief for you — you review and send. No payment until your invoice is ready.",
  cta = "Start your first brief",
  onStart,
  padding = "60px 24px",
} = {}) {
  const start = onStart || (() => window.MeridianOpenBrief && window.MeridianOpenBrief());
  return (
    <div style={{ textAlign: "center", padding, animation: "rise .3s ease both" }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--accent-soft)", color: "var(--accent)",
        display: "grid", placeItems: "center", margin: "0 auto 22px" }}>
        <Icon name="sparkle" size={32} />
      </div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 8px", color: "var(--ink)" }}>
        {title}
      </h2>
      <p style={{ fontSize: 15, color: "var(--ink-2)", maxWidth: 420, margin: "0 auto 24px", lineHeight: 1.6 }}>
        {body}
      </p>
      <Button variant="primary" icon="plus" onClick={() => start()}>{cta}</Button>
    </div>
  );
}

function SkeletonCard() {
  const bar = (w, h = 12) => <div style={{ width: w, height: h, borderRadius: 6, background: "var(--line)" }} />;
  return (
    <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
      <div style={{ width: 5, background: "var(--line)" }} />
      <div style={{ flex: 1, padding: "var(--pad-card)", display: "flex", flexDirection: "column", gap: 14 }} className="mer-shimmer">
        <div style={{ display: "flex", gap: 10 }}>{bar(70, 10)}{bar(90, 10)}</div>
        {bar("60%", 22)}
        <div style={{ display: "flex", gap: 12 }}>{bar(80, 10)}{bar(70, 10)}{bar(120, 10)}</div>
        {bar("100%", 5)}
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 6 }}>{bar(140, 10)}<div style={{ flex: 1 }} />{bar(120, 32)}</div>
      </div>
    </div>
  );
}
function SkeletonStat() {
  return (
    <div className="mer-shimmer" style={{ background: "var(--surface)", border: "1px solid var(--line)",
      borderTop: "3px solid var(--line-2)", borderRadius: "var(--r)", padding: "16px 18px" }}>
      <div style={{ width: "60%", height: 9, borderRadius: 5, background: "var(--line)", marginBottom: 15 }} />
      <div style={{ width: "38%", height: 22, borderRadius: 6, background: "var(--line-2)" }} />
    </div>
  );
}
export function DashboardSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-list)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(158px, 1fr))", gap: 12 }}>
        <SkeletonStat /><SkeletonStat /><SkeletonStat /><SkeletonStat />
      </div>
      <SkeletonCard /><SkeletonCard /><SkeletonCard />
    </div>
  );
}

export function ErrorState({ onRetry }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 24px", animation: "rise .3s ease both" }}>
      <div style={{ width: 60, height: 60, borderRadius: 16, background: "var(--st-action-bg)", color: "var(--st-action)",
        display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
        <Icon name="alert" size={28} />
      </div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
        We couldn't load your orders.
      </h2>
      <p style={{ fontSize: 14.5, color: "var(--ink-2)", maxWidth: 360, margin: "0 auto 22px", lineHeight: 1.6 }}>
        Something went wrong on our side. Check your connection and try again — your work is safe.
      </p>
      <Button variant="primary" icon="refresh" onClick={onRetry}>Try again</Button>
    </div>
  );
}

/* ---- Orders overview — In progress (due-soonest) + Delivered */
export function OrdersOverview({ orders, open }) {
  const [showAllDone, setShowAllDone] = React.useState(false);
  const progress = orders
    .filter((o) => MM.bucketOf(o) === "progress")
    .slice()
    .sort((a, b) => {
      const ta = a.due_at ? new Date(a.due_at).getTime() : Infinity;
      const tb = b.due_at ? new Date(b.due_at).getTime() : Infinity;
      return ta - tb;
    });
  const done = orders.filter((o) => MM.bucketOf(o) === "delivered");
  const doneVisible = showAllDone ? done : done.slice(0, 3);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
      {progress.length > 0 && (
        <section id="mer-grp-progress">
          <SectionLabel color="var(--st-progress)" count={progress.length}>{MM.BUCKET_LABELS.progress}</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-list)" }}>
            {progress.map((o) => <OrderCard key={o.id} o={o} open={open} />)}
          </div>
        </section>
      )}
      {done.length > 0 && (
        <section id="mer-grp-done">
          <SectionLabel color="var(--st-done)" count={done.length}>{MM.BUCKET_LABELS.delivered}</SectionLabel>
          <div className="mer-donegrid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
            {doneVisible.map((o) => <OrderTile key={o.id} o={o} open={open} />)}
          </div>
          {done.length > 3 && !showAllDone && (
            <div style={{ marginTop: 12 }}>
              <Button variant="ghost" onClick={() => setShowAllDone(true)}>Show all delivered ({done.length})</Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* ---- Tabbed orders — sidebar items + these pills drive one filter --------- */
export function OrdersTabs({ tab, setTab, stats }) {
  const tabs = [
    { k: "action", label: MM.BUCKET_LABELS.action, n: stats.action },
    { k: "progress", label: MM.BUCKET_LABELS.progress, n: stats.progress },
  ];
  // "In revision" surfaces as its own tab only when something is actually in
  // revision (matches the prototype + sidebar).
  if (stats.revision > 0) tabs.push({ k: "revision", label: MM.label("revision", "client"), n: stats.revision });
  tabs.push({ k: "done", label: MM.BUCKET_LABELS.delivered, n: stats.done });
  return (
    <div style={{ display: "flex", gap: 26, marginBottom: 26, borderBottom: "1px solid var(--line)" }}>
      {tabs.map((t) => {
        const on = tab === t.k;
        return (
          <button key={t.k} onClick={() => setTab(t.k)} style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 0 12px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "var(--sans)",
            fontSize: 15, fontWeight: on ? 700 : 500, color: on ? "var(--ink)" : "var(--muted)", transition: "color .15s" }}>
            {t.label}
            {t.n > 0 && <span style={{ minWidth: 19, height: 19, padding: "0 6px", borderRadius: 99, fontSize: 11, fontWeight: 700,
              background: on ? "var(--accent)" : "var(--surface-2)", color: on ? "var(--on-accent)" : "var(--muted)",
              display: "grid", placeItems: "center" }}>{t.n}</span>}
            {on && <span style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2, background: "var(--accent)", borderRadius: 99 }} />}
          </button>
        );
      })}
    </div>
  );
}

function EmptyTab({ icon, title, body }) {
  return (
    <div style={{ textAlign: "center", padding: "52px 20px", color: "var(--muted)", animation: "rise .25s ease both" }}>
      <div style={{ width: 54, height: 54, borderRadius: 15, background: "var(--surface-2)", color: "var(--faint)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
        <Icon name={icon} size={26} />
      </div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 20, color: "var(--ink)", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 14, maxWidth: 360, margin: "0 auto", lineHeight: 1.55 }}>{body}</div>
    </div>
  );
}

/* The single filtered list for the active tab, with a real empty state each. */
export function OrdersPanel({ tab, orders, packages, open, onDownload, onPay }) {
  if (tab === "progress") {
    // `revision` has its own tab — exclude it from the generic progress list.
    const prog = orders.filter((o) => MM.bucketOf(o) === "progress" && o.status !== "revision").slice()
      .sort((a, b) => (a.due_at ? new Date(a.due_at).getTime() : Infinity) - (b.due_at ? new Date(b.due_at).getTime() : Infinity));
    if (!prog.length) return <EmptyTab icon="pencil" title="Nothing in progress yet" body="Once your invoice is settled, your expert gets to work and the order appears here." />;
    return <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-list)" }}>{prog.map((o) => <OrderCard key={o.id} o={o} open={open} />)}</div>;
  }
  if (tab === "revision") {
    const rev = orders.filter((o) => o.status === "revision").slice()
      .sort((a, b) => (a.due_at ? new Date(a.due_at).getTime() : Infinity) - (b.due_at ? new Date(b.due_at).getTime() : Infinity));
    if (!rev.length) return <EmptyTab icon="refresh" title="Nothing in revision" body="If you request changes on a delivery, the order moves here while your expert revises it." />;
    return <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-list)" }}>{rev.map((o) => <OrderCard key={o.id} o={o} open={open} />)}</div>;
  }
  if (tab === "done") {
    const done = orders.filter((o) => MM.bucketOf(o) === "delivered");
    if (!done.length) return <EmptyTab icon="check" title="No completed orders yet" body="Delivered work shows here, ready to preview and download." />;
    return (
      <>
        <ReadyShelf packages={packages} onDownload={onDownload} open={open} />
        <div className="mer-donegrid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {done.map((o) => <OrderTile key={o.id} o={o} open={open} />)}
        </div>
      </>
    );
  }
  // action / "Under review"
  const hasAction = orders.some((o) => MM.bucketOf(o) === "action") || orders.some((o) => MM.bucketOf(o) !== "action" && o.unread > 0);
  if (!hasAction) return <EmptyTab icon="check" title="Nothing needs you right now" body="When an invoice is ready or your expert replies, it'll show up here." />;
  return <ActionQueue orders={orders} open={open} onPay={onPay} hideLabel />;
}

/* ============================================================
   Dashboard — at-a-glance overview. Stat cards + a scalable
   widget grid. Each widget below is self-contained; to extend the
   dashboard (now or later) push another entry onto `widgets` and
   the grid reflows automatically — no layout wiring needed.
   ============================================================ */
function UpcomingDeadlines({ orders, open }) {
  const items = orders
    .filter((o) => !MM.isReleased(o) && o.due_at)
    .map((o) => ({ o, rel: MM.relDue(o.due_at) }))
    .filter((x) => x.rel)
    .sort((a, b) => a.rel.days - b.rel.days)
    .slice(0, 6);
  if (!items.length) return <div style={{ fontSize: 13, color: "var(--muted)" }}>No active deadlines right now.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {items.map(({ o, rel }, i) => (
        <button key={o.id} onClick={() => open(o)}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", width: "100%", textAlign: "left",
            border: "none", borderTop: i ? "1px solid var(--line)" : "none", background: "transparent", cursor: "pointer", fontFamily: "var(--sans)" }}>
          <Icon name="clock" size={15} style={{ color: rel.urgent ? "var(--st-action)" : "var(--muted)", flex: "0 0 auto" }} />
          <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.title}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: rel.urgent ? "var(--st-action)" : "var(--muted)", whiteSpace: "nowrap" }}>{rel.text}</span>
        </button>
      ))}
    </div>
  );
}

export function ClientDashboard({ stats, orders, packages, open, onDownload, onPay, onNewBrief, go, goTab, clientType }) {
  // ── Stat cards — add/remove freely; the row reflows. Each carries a
  //    sub-label per the prototype (invoices to pay / due soonest / ready /
  //    next deadline). ──
  const cards = [
    { id: "action", label: "Needs you", value: stats.action, tone: "var(--st-action)", icon: "alert", onClick: () => goTab("action"),
      sub: stats.invoicesToPay > 0 ? `${stats.invoicesToPay} invoice${stats.invoicesToPay > 1 ? "s" : ""} to pay` : (stats.action > 0 ? "Review your orders" : null) },
    { id: "progress", label: "In progress", value: stats.progress, tone: "var(--st-progress)", icon: "pencil", onClick: () => goTab("progress"),
      sub: stats.progDue ? `Due ${stats.progDue}` : (stats.progress > 0 ? "In production" : null) },
    { id: "done", label: "Completed", value: stats.done, tone: "var(--st-done)", icon: "check", onClick: () => goTab("done"),
      sub: stats.readyCount > 0 ? `${stats.readyCount} ready to download` : (stats.done > 0 ? "All downloaded" : null) },
  ];
  if (clientType !== "custom") {
    cards.push({ id: "balance", label: "Balance due", value: stats.balance ? "$" + stats.balance : "$0",
      tone: stats.balance ? "var(--accent)" : "var(--st-done)", icon: "card",
      onClick: onPay, sub: stats.nextDue ? `Next deadline ${stats.nextDue}` : undefined });
  } else if (stats.nextDue) {
    cards.push({ id: "next", label: "Next deadline", value: stats.nextDue, tone: "var(--accent)", icon: "calendar" });
  }

  // ── Widgets — independent panels; append to extend the dashboard. ──
  const widgets = [];
  if (stats.action > 0) {
    widgets.push({ id: "needs", node: (
      <DashWidget key="needs" title="Needs your attention" icon="alert" full pad={14}>
        <ActionQueue orders={orders} open={open} onPay={onPay} hideLabel />
      </DashWidget>) });
  }
  widgets.push({ id: "deadlines", node: (
    <DashWidget key="deadlines" title="Upcoming deadlines" icon="clock">
      <UpcomingDeadlines orders={orders} open={open} />
    </DashWidget>) });
  widgets.push({ id: "quick", node: (
    <DashWidget key="quick" title="Quick actions" icon="plus">
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        <Button variant="primary" icon="plus" full onClick={onNewBrief}>Start a new brief</Button>
        <Button variant="soft" icon="chat" full onClick={() => go("messages")}>Messages</Button>
        {clientType !== "custom" && stats.balance > 0 && <Button variant="soft" icon="card" full onClick={onPay}>Pay balance · ${stats.balance}</Button>}
      </div>
    </DashWidget>) });
  widgets.push({ id: "concierge", node: (
    <DashWidget key="concierge" title="Need a hand?" icon="chat" bg="linear-gradient(140deg, var(--accent-soft) 0%, var(--surface) 62%)">
      <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
        Chat with your concierge about an order, a payment, or a deadline — real people, fast replies.
      </p>
      <Button variant="primary" icon="chat" full onClick={() => window.MeridianOpenConcierge && window.MeridianOpenConcierge()}>Start a chat</Button>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12, fontSize: 12, color: "var(--muted)" }}>
        <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--st-done)" }} /> Typical reply in under an hour.
      </div>
    </DashWidget>) });
  if (packages && packages.length) {
    widgets.push({ id: "ready", node: (
      <DashWidget key="ready" title="Ready to download" icon="download" full pad={14}>
        <ReadyShelf packages={packages} onDownload={onDownload} open={open} hideLabel />
      </DashWidget>) });
  }

  return (
    <>
      <DashStatRow>{cards.map((c) => <StatCard key={c.id} {...c} />)}</DashStatRow>
      <DashWidgets>{widgets.map((w) => w.node)}</DashWidgets>
    </>
  );
}
