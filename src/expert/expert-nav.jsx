/* ============================================================
   Expert nav — sidebar (My work / Earnings / Availability / Profile)
   with revision-aware sub-stats. ES module. Used as a persistent
   rail on desktop and an off-canvas drawer on mobile (onClose set).
   ============================================================ */
import React from "react";
import { Icon } from "../workspace/kit/icons.jsx";
import { Avatar } from "../workspace/kit/components.jsx";
import { NotifBell } from "../workspace/kit/notifications.jsx";

function PipeRow({ label, value, dot, glow, onClick }) {
  const [hov, setHov] = React.useState(false);
  const isZero = value === 0 || value === "0";
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: "flex", alignItems: "center", gap: 11, width: "100%",
        padding: "7px 13px", border: "none",
        background: hov ? "rgba(239,242,240,.05)" : "transparent", cursor: "pointer", fontFamily: "var(--sans)",
        textAlign: "left", borderRadius: 9 }}>
      <span style={{ flex: "0 0 8px", width: 8, height: 8, borderRadius: 2.5, background: dot, boxShadow: `0 0 7px ${glow}`, opacity: isZero ? 0.4 : 1 }} />
      <span style={{ flex: 1, fontSize: 13, color: "rgba(239,242,240,.7)", fontWeight: 500 }}>{label}</span>
      <span style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 600, minWidth: 18, textAlign: "right", color: isZero ? "rgba(239,242,240,.28)" : "#EFE9DC" }}>{value}</span>
    </button>
  );
}

function NavItem({ icon, label, badge, active, onClick }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 13px", borderRadius: 11,
        border: "none",
        background: active ? "rgba(15,126,132,.16)" : hov ? "rgba(239,242,240,.06)" : "transparent",
        color: active ? "#EAF6F5" : "rgba(239,242,240,.72)", textAlign: "left", fontSize: 14.5,
        fontWeight: active ? 600 : 500, fontFamily: "var(--sans)", letterSpacing: "-0.01em",
        boxShadow: active ? "inset 3px 0 0 var(--accent)" : "none" }}>
      <span style={{ color: active ? "var(--accent)" : "rgba(239,242,240,.55)", display: "inline-flex" }}><Icon name={icon} size={19} /></span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge > 0 && <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 99, background: "var(--accent)", color: "#fff", fontSize: 11.5, fontWeight: 700, display: "grid", placeItems: "center" }}>{badge}</span>}
    </button>
  );
}

export function ExpSidebar({ route, go, stats, unread, setWorkFilter, accepting, setAccepting, writer, onSignOut, onClose, notifs, setNotifs }) {
  const pipeTotal = (stats.active || 0) + (stats.revision || 0) + (stats.review || 0) + (stats.delivered || 0);
  const goFiltered = (f) => { setWorkFilter && setWorkFilter(f); go("work"); onClose && onClose(); };
  return (
    <aside className="scroll" style={{ width: onClose ? 270 : 250, flex: onClose ? "1 1 auto" : "0 0 250px", maxWidth: onClose ? "82vw" : undefined, background: "var(--roast)", height: "100%", display: "flex", flexDirection: "column", padding: "20px 16px 16px", overflowY: "auto", borderRight: "1px solid rgba(0,0,0,.3)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 6px 22px" }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--accent)", flex: "0 0 38px", display: "grid", placeItems: "center", fontFamily: "var(--serif)", fontWeight: 600, fontSize: 20, color: "var(--on-accent)" }}>M</div>
        <div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 600, color: "var(--side-ink)", lineHeight: 1.15, whiteSpace: "nowrap" }}>Meridian Studio</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--accent)", marginTop: 3, letterSpacing: ".13em", textTransform: "uppercase" }}>Expert Workspace</div>
        </div>
        <div style={{ flex: 1 }} />
        {onClose
          ? <button onClick={onClose} aria-label="Close menu" style={{ background: "transparent", border: "none", color: "rgba(239,242,240,.72)", display: "inline-flex", cursor: "pointer" }}><Icon name="x" size={20} /></button>
          : (notifs && <NotifBell items={notifs} setItems={setNotifs} dark go={go} />)}
      </div>

      <div style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".1em", color: "rgba(239,242,240,.34)", fontSize: 9.5, padding: "2px 12px 9px" }}>Menu</div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <NavItem icon="grid" label="Dashboard" active={route === "dashboard"} onClick={() => { go("dashboard"); onClose && onClose(); }} />
        <NavItem icon="briefcase" label="My work" badge={unread} active={route === "work"} onClick={() => { setWorkFilter && setWorkFilter(null); go("work"); onClose && onClose(); }} />
        <NavItem icon="calendar" label="Availability" active={route === "availability"} onClick={() => { go("availability"); onClose && onClose(); }} />
        <NavItem icon="user" label="Profile" active={route === "profile"} onClick={() => { go("profile"); onClose && onClose(); }} />
      </nav>

      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 12px 9px", marginTop: 18 }}>
        <span style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".1em", fontSize: 9.5, color: "rgba(239,242,240,.34)" }}>Pipeline</span>
        <span style={{ flex: 1, height: 1, background: "rgba(239,242,240,.08)" }} />
        <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "rgba(239,242,240,.3)" }}>{pipeTotal} total</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <PipeRow label="Active" value={stats.active} dot="#6FA8E0" glow="#6FA8E059" onClick={() => goFiltered("active")} />
        <PipeRow label="Needs revision" value={stats.revision} dot="#C98FCB" glow="#C98FCB59" onClick={() => goFiltered("revision")} />
        <PipeRow label="In QC review" value={stats.review} dot="#E0A356" glow="#E0A35659" onClick={() => goFiltered("in_review")} />
        <PipeRow label="Delivered" value={stats.delivered} dot="#6FBF8E" glow="#6FBF8E59" onClick={() => goFiltered("delivered")} />
      </div>

      <button onClick={() => { go("earnings"); onClose && onClose(); }}
        style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 16, padding: "12px 14px", borderRadius: 13, border: "1px solid rgba(239,242,240,.1)", background: "rgba(239,242,240,.03)", width: "100%", cursor: "pointer" }}
        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239,242,240,.06)"} onMouseLeave={(e) => e.currentTarget.style.background = "rgba(239,242,240,.03)"}>
        <span style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(15,126,132,.18)", display: "grid", placeItems: "center", color: "var(--accent)", flex: "0 0 30px" }}><Icon name="wallet" size={17} /></span>
        <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
          <div style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em", fontSize: 9, color: "rgba(239,242,240,.42)" }}>Earned this month</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 19, fontWeight: 600, color: "var(--side-ink)", lineHeight: 1.1, marginTop: 2 }}>{stats.monthEarned}</div>
        </div>
        <Icon name="chevR" size={15} style={{ color: "rgba(239,242,240,.4)" }} />
      </button>

      <button onClick={() => setAccepting(!accepting)} style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 22, padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(239,242,240,.14)", background: "rgba(239,242,240,.04)", width: "100%", cursor: "pointer" }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, background: accepting ? "rgba(15,126,132,.22)" : "rgba(239,242,240,.06)", display: "grid", placeItems: "center", color: accepting ? "var(--accent)" : "rgba(239,242,240,.5)", flex: "0 0 30px" }}><Icon name="power" size={17} /></span>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--side-ink)" }}>{accepting ? "Available" : "At capacity"}</div>
          <div style={{ fontSize: 11, color: "rgba(239,242,240,.45)" }}>{accepting ? "Open to assignments" : "Hidden from admin"}</div>
        </div>
        <span style={{ position: "relative", width: 34, height: 20, borderRadius: 99, background: accepting ? "var(--accent)" : "rgba(239,242,240,.2)", flex: "0 0 34px", transition: "background .15s" }}>
          <span style={{ position: "absolute", top: 2, left: accepting ? 16 : 2, width: 16, height: 16, borderRadius: 99, background: "#fff", transition: "left .15s" }} />
        </span>
      </button>

      <div style={{ flex: 1, minHeight: 20 }} />

      <button onClick={() => { go("support"); onClose && onClose(); }} style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", padding: "11px 14px", borderRadius: 12, border: "1px solid transparent", background: "transparent", color: "rgba(239,242,240,.62)", fontWeight: 500, fontSize: 14, fontFamily: "var(--sans)", textAlign: "left", marginBottom: 10, cursor: "pointer" }}
        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239,242,240,.06)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
        <span style={{ color: "rgba(239,242,240,.4)", display: "inline-flex" }}><Icon name="chat" size={18} /></span>
        <span style={{ flex: 1 }}>Support</span>
        <Icon name="chevR" size={15} style={{ color: "rgba(239,242,240,.4)" }} />
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 8px 0", borderTop: "1px solid rgba(239,242,240,.1)" }}>
        <Avatar initials={writer.initials} size={34} tone="accent" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "var(--side-ink)", fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{writer.name}</div>
          <div style={{ color: "rgba(239,242,240,.45)", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
            <Icon name="star" size={11} style={{ color: "var(--accent)" }} /> {writer.rating || "—"} · {writer.degree || "Expert"}
          </div>
        </div>
        <button title="Sign out" onClick={onSignOut} style={{ background: "transparent", border: "none", color: "rgba(239,242,240,.5)", display: "inline-flex", cursor: "pointer" }}><Icon name="logout" size={17} /></button>
      </div>
    </aside>
  );
}

export default ExpSidebar;
