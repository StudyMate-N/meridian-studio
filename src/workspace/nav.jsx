/* ============================================================
   Navigation — Sidebar (ES module). Pure wayfinding: brand,
   one create CTA, nav with badges, quiet support row, account.
   Stats live on the page (one fact, one surface).
   ============================================================ */
import React from "react";
import { Icon } from "./kit/icons.jsx";
import { Avatar } from "./kit/components.jsx";

/* ---- SIDEBAR ---------------------------------------------- */
export function Sidebar({ user, route, ordersTab, go, goTab, goInvoice, stats, unread, clientType, capReached, onClose, openSupport, onSignOut, density = "comfy", setDensity, onCollapse }) {
  const item = (id, icon, label, badge, opts = {}) => {
    const active = opts.tab ? (route === "orders" && ordersTab === opts.tab) : (route === id);
    const onClick = () => { (opts.onClick ? opts.onClick() : go(id)); onClose && onClose(); };
    return (
      <button onClick={onClick} key={label}
        style={{
          display: "flex", alignItems: "center", gap: 13, width: "100%",
          padding: "10px 14px", borderRadius: 12,
          border: `1px solid ${active ? "rgba(189,90,44,.4)" : "transparent"}`,
          background: active ? "rgba(189,90,44,.16)" : "transparent",
          color: active ? "var(--side-ink)" : "var(--side-ink-dim)",
          textAlign: "left", fontSize: 14.5, fontWeight: active ? 600 : 500,
          fontFamily: "var(--sans)", letterSpacing: "-0.01em",
          transition: "background .15s, color .15s", cursor: "pointer",
        }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(241,235,221,.06)"; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
        <span style={{ color: active ? "var(--accent)" : "var(--side-ink-faint)", display: "inline-flex" }}>
          <Icon name={icon} size={18} />
        </span>
        <span style={{ flex: 1 }}>{label}</span>
        {badge > 0 && (
          <span className={opts.pulse ? "mer-badge-pulse" : undefined}
            style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 99,
            background: "var(--accent)", color: "var(--on-accent)", fontSize: 11.5, fontWeight: 700,
            display: "grid", placeItems: "center" }}>{badge}</span>
        )}
      </button>
    );
  };

  /* status board row — colored dot (status tone) + label + count tinted to that tone */
  const statusRow = (label, count, tone, tab, opts = {}) => {
    const active = route === "orders" && ordersTab === tab;
    const onClick = () => { goTab(tab); onClose && onClose(); };
    return (
      <button onClick={onClick} key={label}
        style={{
          display: "flex", alignItems: "center", gap: 11, width: "100%",
          padding: "10px 14px", borderRadius: 12,
          border: `1px solid ${active ? "rgba(189,90,44,.4)" : "transparent"}`,
          background: active ? "rgba(189,90,44,.16)" : "transparent",
          color: active ? "var(--side-ink)" : "var(--side-ink-dim)",
          textAlign: "left", fontSize: 14.5, fontWeight: active ? 600 : 500,
          fontFamily: "var(--sans)", letterSpacing: "-0.01em",
          transition: "background .15s, color .15s", cursor: "pointer",
        }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(241,235,221,.06)"; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
        <span className={opts.pulse ? "mer-badge-pulse" : undefined}
          style={{ width: 8, height: 8, borderRadius: 99, background: tone, flex: "0 0 auto" }} />
        <span style={{ flex: 1 }}>{label}</span>
        {count > 0 && <span style={{ fontSize: 12.5, fontWeight: 700, color: tone }}>{count}</span>}
      </button>
    );
  };

  return (
    <aside className="scroll" style={{
      width: 278, flex: "0 0 278px", background: "linear-gradient(180deg, #2A2420 0%, var(--roast) 40%)",
      height: "100%", display: "flex", flexDirection: "column",
      padding: "20px 16px 16px", overflowY: "auto", position: "relative",
      borderRight: "1px solid rgba(0,0,0,.3)",
    }}>
      {/* brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 6px 18px" }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: "var(--accent)", flex: "0 0 40px",
          display: "grid", placeItems: "center", fontFamily: "var(--serif)", fontWeight: 600,
          fontSize: 22, color: "var(--on-accent)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.2), 0 4px 12px rgba(189,90,44,.35)" }}>M</div>
        <div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 600, color: "var(--side-ink)", lineHeight: 1.15, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>Meridian Studio</div>
          <div className="mono" style={{ color: "var(--side-ink-faint)", fontSize: 9.5, marginTop: 3 }}>Client Workspace</div>
        </div>
        <div style={{ flex: 1 }} />
        {onClose ? (
          <button onClick={onClose} aria-label="Close menu" style={{ marginLeft: "auto", background: "transparent", border: "none",
            color: "var(--side-ink-dim)", display: "inline-flex", cursor: "pointer" }}><Icon name="x" size={20} /></button>
        ) : onCollapse && (
          <button onClick={onCollapse} aria-label="Collapse sidebar" title="Collapse sidebar"
            style={{ background: "transparent", border: "none", color: "var(--side-ink-faint)", display: "inline-flex",
              cursor: "pointer", padding: 4, borderRadius: 7, transition: "color .15s, background .15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--side-ink)"; e.currentTarget.style.background = "rgba(241,235,221,.06)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--side-ink-faint)"; e.currentTarget.style.background = "transparent"; }}>
            <Icon name="panelLeft" size={18} />
          </button>
        )}
      </div>

      {/* the one global create CTA — always available (an unpaid balance only warns) */}
      {(
        <button onClick={() => { go("new"); onClose && onClose(); }} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
          width: "100%", padding: "13px", borderRadius: 13, border: "none",
          background: "var(--accent)", color: "var(--on-accent)", fontWeight: 600, fontSize: 15,
          fontFamily: "var(--sans)", marginBottom: 20, cursor: "pointer",
          boxShadow: "0 8px 20px -10px var(--accent), inset 0 1px 0 rgba(255,255,255,.18)",
          transition: "background .15s",
        }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--accent-deep)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "var(--accent)"}>
          <Icon name="plus" size={18} /> Start a new brief
        </button>
      )}

      {/* OVERVIEW */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 18 }}>
        {item("dashboard", "grid", "Dashboard")}
      </nav>

      {/* YOUR ORDERS — real filter tabs (client lens) */}
      <div className="mono" style={{ color: "var(--side-ink-faint)", fontSize: 10, padding: "0 8px 8px" }}>Your orders</div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {statusRow("Under review", stats.action, "var(--st-action)", "action", { pulse: stats.unpaidPulse })}
        {statusRow("In progress", stats.progress, "var(--st-progress)", "progress")}
        {stats.revision > 0 && statusRow("In revision", stats.revision, "var(--st-revision)", "revision")}
        {statusRow("Completed", stats.done, "var(--st-done)", "done")}
      </nav>

      {/* ACCOUNT */}
      <div className="mono" style={{ color: "var(--side-ink-faint)", fontSize: 10, padding: "20px 8px 8px" }}>Account</div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {item("messages", "chat", "Messages", unread)}
        {item("profile", "user", "Profile")}
        {item("support", "info", "Support", 0, { onClick: () => (openSupport ? openSupport() : go("messages")) })}
      </nav>

      {/* DENSITY — comfy / compact (sets data-density on .mer-root) */}
      <div className="mono" style={{ color: "var(--side-ink-faint)", fontSize: 10, padding: "20px 8px 8px" }}>Density</div>
      <div style={{ display: "flex", gap: 3, background: "rgba(241,235,221,.05)", borderRadius: 9, padding: 3 }}>
        {[["comfy", "Comfy"], ["compact", "Compact"]].map(([key, label]) => {
          const on = density === key;
          return (
            <button key={key} onClick={() => setDensity && setDensity(key)}
              style={{ flex: 1, padding: "6px 0", fontSize: 11.5, fontWeight: 600, fontFamily: "var(--sans)",
                border: "none", borderRadius: 7, cursor: "pointer", transition: "all .14s",
                background: on ? "rgba(241,235,221,.12)" : "transparent",
                color: on ? "var(--side-ink)" : "var(--side-ink-faint)" }}>{label}</button>
          );
        })}
      </div>

      <div style={{ flex: 1, minHeight: 18 }} />

      {/* BALANCE CARD — boxed "Pay now" / settled state (custom keeps its note) */}
      {clientType === "custom" ? (
        <div style={{ padding: "10px 14px 14px", fontSize: 12.5, color: "var(--side-ink-faint)" }}>Custom account</div>
      ) : stats.balance > 0 ? (
        <div style={{ background: "rgba(241,235,221,.05)", border: "1px solid rgba(241,235,221,.1)",
          borderRadius: 15, padding: "15px 16px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
            <span className="mono" style={{ color: "var(--side-ink-faint)", fontSize: 9.5 }}>Balance due</span>
            {stats.nextDue && <span style={{ fontSize: 11, color: "var(--side-ink-faint)" }}>Next {stats.nextDue}</span>}
          </div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 600, color: "var(--side-ink)", lineHeight: 1, marginBottom: 13 }}>${stats.balance}</div>
          <button onClick={() => { goInvoice && goInvoice(); onClose && onClose(); }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: "9px 0",
              borderRadius: 10, border: "none", background: "var(--accent)", color: "var(--on-accent)", fontWeight: 600,
              fontSize: 13, fontFamily: "var(--sans)", cursor: "pointer", transition: "background .15s" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--accent-deep)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "var(--accent)"}>
            <Icon name="card" size={15} /> Pay now
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderRadius: 13,
          background: "rgba(59,122,85,.14)", border: "1px solid rgba(59,122,85,.25)", marginBottom: 14 }}>
          <Icon name="check" size={15} style={{ color: "#9FC9AC" }} />
          <span style={{ fontSize: 13, color: "#9FC9AC", fontWeight: 600 }}>All settled — nothing owed</span>
        </div>
      )}

      {/* user */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 8px 0",
        borderTop: "1px solid rgba(241,235,221,.1)" }}>
        <Avatar initials={user?.initials || "?"} size={36} tone="accent" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "var(--side-ink)", fontWeight: 600, fontSize: 14 }}>{user?.name || "Your account"}</div>
          <div style={{ color: "var(--side-ink-faint)", fontSize: 11.5, overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</div>
        </div>
        <button title="Sign out" aria-label="Sign out" onClick={onSignOut} style={{ background: "transparent", border: "none",
          color: "var(--side-ink-dim)", display: "inline-flex", cursor: "pointer" }}><Icon name="logout" size={18} /></button>
      </div>
    </aside>
  );
}
