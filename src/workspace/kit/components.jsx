/* ============================================================
   Shared primitives — Meridian workspace (ES module)
   ============================================================ */
import React from "react";
import { Icon } from "./icons.jsx";
import { MM } from "./model.js";

const M = MM;

/* ---- Button ------------------------------------------------ */
export function Button({ children, variant = "primary", size = "md", icon, iconRight, onClick, full, type = "button", disabled }) {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    gap: 8, border: "1px solid transparent", borderRadius: 999,
    fontWeight: 600, fontFamily: "var(--sans)", letterSpacing: "-0.01em",
    cursor: disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap",
    transition: "transform .12s ease, background .15s ease, box-shadow .15s ease, border-color .15s",
    width: full ? "100%" : "auto", opacity: disabled ? 0.5 : 1,
  };
  const sizes = {
    sm: { padding: "7px 13px", fontSize: 13 },
    md: { padding: "11px 18px", fontSize: 14.5 },
    lg: { padding: "14px 24px", fontSize: 16 },
  };
  const variants = {
    primary: { background: "var(--accent)", color: "var(--on-accent)", boxShadow: "0 1px 1px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.18)" },
    dark:    { background: "var(--roast)", color: "#F1EBDD" },
    ghost:   { background: "transparent", color: "var(--ink)", borderColor: "var(--line-2)" },
    soft:    { background: "var(--surface-2)", color: "var(--ink)", borderColor: "var(--line)" },
    quiet:   { background: "transparent", color: "var(--ink-2)" },
  };
  const [hover, setHover] = React.useState(false);
  const hoverFx = !disabled && hover ? {
    transform: "translateY(-1px)",
    boxShadow: variant === "primary" ? "0 6px 16px -6px var(--accent), inset 0 1px 0 rgba(255,255,255,.2)" : "0 4px 12px -8px rgba(40,33,22,.4)",
    background: variant === "primary" ? "var(--accent-deep)" : variant === "ghost" ? "var(--surface-2)" : undefined,
  } : {};
  return (
    <button type={type} onClick={disabled ? undefined : onClick} disabled={disabled}
            onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
            style={{ ...base, ...sizes[size], ...variants[variant], ...hoverFx }}>
      {icon && <Icon name={icon} size={size === "sm" ? 15 : 17} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "sm" ? 15 : 17} />}
    </button>
  );
}

/* ---- StatusChip — bold, color coded (real STATUS_META) ---- */
export const STATUS_LOOK = { current: "soft" };
export function StatusChip({ status, size = "md", pulse, look, surface = "client" }) {
  const tn = M.tone(status);
  const lbl = M.label(status, surface);   // client lens by default
  const big = size === "lg";
  const mode = look || STATUS_LOOK.current;
  const skin = mode === "solid"
    ? { background: tn.color, color: "#fff", border: "1px solid transparent" }
    : mode === "dot"
    ? { background: "transparent", color: tn.color, border: "1px solid transparent", padding: 0 }
    : { background: tn.bg, color: tn.color, border: `1px solid ${tn.edge}` };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: big ? 8 : 6,
      padding: big ? "7px 14px 7px 11px" : "4px 10px 4px 8px",
      borderRadius: 999, fontWeight: 600, whiteSpace: "nowrap", flex: "0 0 auto",
      fontSize: big ? 14 : 12.5, letterSpacing: "-0.01em", lineHeight: 1, ...skin,
    }}>
      {mode === "dot" ? (
        <span style={{ width: big ? 9 : 8, height: big ? 9 : 8, borderRadius: 99, background: tn.color,
          animation: pulse ? "pulse-dot 1.6s ease-in-out infinite" : "none" }} />
      ) : (
        <span style={{ display: "inline-flex", animation: pulse ? "pulse-dot 1.6s ease-in-out infinite" : "none" }}>
          <Icon name={tn.icon} size={big ? 16 : 13} stroke={2} />
        </span>
      )}
      {lbl}
    </span>
  );
}

/* ---- StageTracker — STATUS_FLOW lifecycle ----------------- */
const FLOW_LABELS = { new: "Received", brief_received: "Brief", assigned: "Expert", writing: "Writing", in_review: "QC review", delivered: "Delivered" };
export function StageTracker({ status, variant = "bar" }) {
  const FLOW = M.STATUS_FLOW;
  const done = status === "delivered" || status === "closed";
  const revision = status === "revision";
  let idx = FLOW.indexOf(status);
  if (revision) idx = FLOW.indexOf("in_review");
  if (status === "closed" || idx === -1) idx = done ? FLOW.length - 1 : 0;
  const tn = M.tone(status);
  const activeColor = done ? "var(--st-done)" : tn.color;
  const pct = M.meta(status).pct || 0;

  if (variant === "mini") {
    return (
      <div style={{ height: 5, borderRadius: 99, background: "var(--line)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", borderRadius: 99,
          background: done ? "var(--st-done)" : activeColor, transition: "width .45s ease" }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
      {FLOW.map((st, i) => {
        const complete = done ? true : i < idx;
        const current = !done && i === idx;
        const ahead = !done && i > idx;
        const filled = done || i < idx;
        const label = (revision && current) ? "In revision" : FLOW_LABELS[st];
        return (
          <React.Fragment key={st}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9, flex: "0 0 auto", width: 84 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 99,
                display: "grid", placeItems: "center", position: "relative",
                background: complete ? "var(--st-done)" : current ? activeColor : "var(--surface)",
                border: `2px solid ${complete || current ? "transparent" : "var(--line-2)"}`,
                color: complete || current ? "#fff" : "var(--faint)",
                boxShadow: current ? `0 0 0 4px ${tn.bg}` : "none",
                animation: `trackPop .45s cubic-bezier(.2,.8,.3,1.2) both`, animationDelay: `${i * 0.11}s`,
              }}>
                {current && (
                  <span style={{ position: "absolute", inset: -2, borderRadius: 99,
                    border: `2px solid ${activeColor}`, animation: "haloPulse 1.8s ease-out infinite", animationDelay: `${i * 0.11 + 0.4}s` }} />
                )}
                {complete ? <Icon name="check" size={15} stroke={2.4} />
                  : current ? <span style={{ width: 8, height: 8, borderRadius: 99, background: "#fff" }} />
                  : <span style={{ fontSize: 12, fontWeight: 700 }}>{i + 1}</span>}
              </div>
              <span style={{
                fontSize: 11.5, fontWeight: current ? 700 : 500, textAlign: "center",
                color: ahead ? "var(--faint)" : current ? "var(--ink)" : "var(--ink-2)",
                letterSpacing: "-0.01em", lineHeight: 1.2,
                animation: "labelFade .4s ease both", animationDelay: `${i * 0.11 + 0.12}s`,
              }}>{label}</span>
            </div>
            {i < FLOW.length - 1 && (
              <div style={{ flex: 1, height: 2, marginTop: 14, borderRadius: 99, background: "var(--line)", minWidth: 12, overflow: "hidden" }}>
                {filled && (
                  <div style={{ height: "100%", background: "var(--st-done)", transformOrigin: "left center",
                    animation: "growX .5s ease both", animationDelay: `${i * 0.11 + 0.22}s` }} />
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ---- Avatar ------------------------------------------------ */
export function Avatar({ initials, size = 34, tone = "accent", ring }) {
  const tones = {
    accent: { bg: "var(--accent)", fg: "var(--on-accent)" },
    roast:  { bg: "#3A332A", fg: "#F1EBDD" },
    soft:   { bg: "var(--surface-2)", fg: "var(--ink-2)" },
    progress: { bg: "var(--st-progress-bg)", fg: "var(--st-progress)" },
    done:   { bg: "var(--st-done-bg)", fg: "var(--st-done)" },
  };
  const t = tones[tone] || tones.accent;
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.28),
      background: t.bg, color: t.fg, display: "grid", placeItems: "center",
      fontFamily: "var(--serif)", fontWeight: 600, fontSize: size * 0.42,
      flex: "0 0 auto", boxShadow: ring ? "0 0 0 3px var(--paper), 0 0 0 4px var(--line)" : "none",
    }}>{initials}</div>
  );
}

/* ---- Tag / meta pill -------------------------------------- */
export function Meta({ children, mono }) {
  return (
    <span style={{
      fontSize: mono ? 11 : 13, color: "var(--ink-2)",
      fontFamily: mono ? "var(--mono)" : "var(--sans)",
      letterSpacing: mono ? "0.06em" : "-0.01em",
      textTransform: mono ? "uppercase" : "none",
    }}>{children}</span>
  );
}

/* ---- Section label ----------------------------------------- */
export function SectionLabel({ children, count, color, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      {color && <span style={{ width: 9, height: 9, borderRadius: 99, background: color }} />}
      <span className="mono" style={{ color: "var(--ink-2)", fontSize: 11.5 }}>{children}</span>
      {count != null && (
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--faint)", fontWeight: 600 }}>{String(count).padStart(2, "0")}</span>
      )}
      <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
      {right}
    </div>
  );
}

/* ---- PaymentBadge (payment_status) ------------------------ */
export function PaymentBadge({ status }) {
  const m = M.paymentMeta(status);
  const tn = M.TONE[m.tone] || M.TONE.warn;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px",
      borderRadius: 999, background: tn.bg, color: tn.color, border: `1px solid ${tn.edge}`,
      fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
      <Icon name="card" size={13} /> {m.label}
    </span>
  );
}

/* ---- File type badge -------------------------------------- */
const FILE_TYPES = {
  pdf:  { label: "PDF", color: "#C0392B", cat: "doc" },
  doc:  { label: "DOC", color: "#2B5C9E", cat: "doc" },  docx: { label: "DOC", color: "#2B5C9E", cat: "doc" },
  ppt:  { label: "PPT", color: "#C26B2A", cat: "slide" }, pptx: { label: "PPT", color: "#C26B2A", cat: "slide" },
  xls:  { label: "XLS", color: "#2F7D4F", cat: "sheet" }, xlsx: { label: "XLS", color: "#2F7D4F", cat: "sheet" }, csv: { label: "CSV", color: "#2F7D4F", cat: "sheet" },
  txt:  { label: "TXT", color: "#6A6256", cat: "doc" },
  png:  { label: "IMG", color: "#7A5AA6", cat: "image" }, jpg: { label: "IMG", color: "#7A5AA6", cat: "image" }, jpeg: { label: "IMG", color: "#7A5AA6", cat: "image" },
  zip:  { label: "ZIP", color: "#8A7A55", cat: "other" },
};
export function fileMeta(name) {
  const ext = (String(name).split(".").pop() || "").toLowerCase();
  return FILE_TYPES[ext] ? { ext, ...FILE_TYPES[ext] } : { ext, label: (ext || "FILE").toUpperCase().slice(0, 4), color: "#6A6256", cat: "other" };
}
export function TypeBadge({ name, size = 40 }) {
  const m = fileMeta(name);
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.22), background: m.color, color: "#fff",
      display: "grid", placeItems: "center", flex: `0 0 ${size}px`, fontFamily: "var(--mono)", fontWeight: 700,
      fontSize: Math.round(size * 0.27), letterSpacing: ".02em", boxShadow: "inset 0 1px 0 rgba(255,255,255,.22)" }}>{m.label}</div>
  );
}

/* ---- Dashboard primitives (scalable widget grid) ------------
   StatCard = one headline metric (optionally a link). DashStatRow + DashWidgets
   are responsive auto-fit grids that reflow on their own, so adding a stat or a
   <DashWidget> — now or in the future — needs no layout wiring. DashWidget is a
   titled panel; pass `full` to span the whole row. Shared by client + expert
   (and available to admin) so every dashboard stays consistent and extensible. */
/* count-up: ease 0→numeric over ~720ms on mount, preserving $/commas; skips for
   non-numeric values (e.g. "—") and when the user prefers reduced motion. */
function useCountUp(value, dur = 720) {
  const str = String(value);
  const m = str.match(/-?\d[\d,]*(\.\d+)?/);
  const reduce = typeof window !== "undefined" && window.matchMedia
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const target = m ? parseFloat(m[0].replace(/,/g, "")) : null;
  const decimals = m && m[1] ? m[1].length - 1 : 0;
  const [n, setN] = React.useState(reduce || target == null ? target : 0);
  React.useEffect(() => {
    if (reduce || target == null) { setN(target); return; }
    let raf, start;
    const step = (t) => {
      if (start == null) start = t;
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setN(target * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, dur, reduce]);
  if (target == null) return str; // non-numeric → render as-is
  const fmt = n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return str.replace(m[0], fmt);
}

export function StatCard({ label, value, sub, tone = "var(--accent)", icon, onClick }) {
  const [hov, setHov] = React.useState(false);
  const shown = useCountUp(value);
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: "block", textAlign: "left", width: "100%", background: "var(--surface)",
        border: `1px solid ${hov && onClick ? tone : "var(--line)"}`, borderRadius: "var(--r)", padding: "16px 18px",
        borderTop: `3px solid ${tone}`, cursor: onClick ? "pointer" : "default", fontFamily: "var(--sans)",
        boxShadow: "var(--shadow-card)", transition: "border-color .15s, transform .15s",
        transform: hov && onClick ? "translateY(-2px)" : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        {icon && <Icon name={icon} size={15} style={{ color: tone }} />}
        <span className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 600, color: "var(--ink)", lineHeight: 1 }}>{shown}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{sub}</div>}
    </Tag>
  );
}
export function DashStatRow({ children, min = 158 }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 12, marginBottom: 22 }}>{children}</div>;
}
export function DashWidgets({ children, min = 300 }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 16, alignItems: "start", animation: "rise .55s ease both", animationDelay: ".14s" }}>{children}</div>;
}
export function DashWidget({ title, icon, action, full, pad = 18, bg = "var(--surface)", children }) {
  return (
    <section style={{ gridColumn: full ? "1 / -1" : "auto", background: bg, border: "1px solid var(--line)",
      borderRadius: "var(--r-lg)", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
      {title && (
        <header style={{ display: "flex", alignItems: "center", gap: 9, padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
          {icon && <Icon name={icon} size={16} style={{ color: "var(--accent)" }} />}
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>{title}</h3>
          <div style={{ flex: 1 }} />
          {action}
        </header>
      )}
      <div style={{ padding: pad }}>{children}</div>
    </section>
  );
}
