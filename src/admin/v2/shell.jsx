/* ============================================================
   Admin shell — sidebar nav (overhaul v2) + top bar. ES module.
   Sidebar: command/search trigger, primary "New order" CTA, nav
   groups w/ section labels, rail-collapse toggle (localStorage),
   account-row popover menu (notifications/settings/profile/sign-out).
   All sidebar classes are `ops-*` (NOT `ad-*` — ad-blocker safe).
   ============================================================ */
import React from "react";
import { Icon } from "../../workspace/kit/icons.jsx";
import { Avatar } from "../../workspace/kit/components.jsx";
import { NotifBell } from "../../workspace/kit/notifications.jsx";
import { AM } from "./admin-model.js";

const { useState, useEffect } = React;

export const SEL = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--surface)", fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink)", outline: "none" };

export const ADMIN_NAV = [
  { id: "dashboard", icon: "grid", label: "Dashboard" },
  { id: "orders", icon: "briefcase", label: "Orders" },
  { id: "briefs", icon: "doc", label: "Briefs" },
  { id: "clients", icon: "user", label: "Clients" },
  { id: "writers", icon: "users", label: "Experts" },
  { id: "support", icon: "chat", label: "Support" },
  { id: "billing", icon: "wallet", label: "Billing" },
  { id: "emails", icon: "mail", label: "Emails" },
];

// Nav groups (overhaul v2): Dashboard stands alone above the groups.
const NAV_GROUPS = [
  { items: ["dashboard"] },
  { label: "Operations", sep: true, items: ["orders", "briefs", "support"] },
  { label: "People", sep: true, items: ["clients", "writers"] },
  { label: "Finance & Comms", sep: true, items: ["billing", "emails"] },
];
const BADGE_ACCENT = new Set(["orders", "briefs", "support"]);
const navById = (id) => ADMIN_NAV.find((n) => n.id === id);

// Sidebar CSS — `ops-*` classes; keyframes reuse the live names (rise/fadeIn/
// drawerIn) which exist in kit/theme.css and are reduced-motion guarded there.
const SIDEBAR_CSS = `
.ops-sidebar { transition: width .24s cubic-bezier(.22,1,.36,1), flex-basis .24s cubic-bezier(.22,1,.36,1), padding .24s; }
.ops-side-head { display:flex; align-items:center; gap:11px; padding:2px 6px 14px; }
.ops-brandtext { flex:1; min-width:0; overflow:hidden; }
.ops-collapse { flex:0 0 auto; width:28px; height:28px; border-radius:8px; border:1px solid rgba(241,235,221,.16); background:transparent; color:rgba(241,235,221,.6); display:grid; place-items:center; cursor:pointer; transition:background .15s,color .15s,border-color .15s; }
.ops-collapse:hover { background:rgba(241,235,221,.1); color:#F1EBDD; border-color:rgba(241,235,221,.3); }
.ops-cmd { display:flex; align-items:center; gap:9px; width:100%; padding:9px 11px; margin-bottom:9px; border-radius:11px; border:1px solid rgba(241,235,221,.14); background:rgba(241,235,221,.05); color:rgba(241,235,221,.6); font-family:var(--sans); font-size:13px; cursor:pointer; transition:background .15s,border-color .15s,color .15s; }
.ops-cmd:hover { background:rgba(241,235,221,.1); border-color:rgba(241,235,221,.26); color:#F1EBDD; }
.ops-cmd-label { flex:1; text-align:left; }
.ops-cmd-kbd { font-family:var(--mono); font-size:10px; padding:2px 6px; border-radius:6px; background:rgba(241,235,221,.1); color:rgba(241,235,221,.55); letter-spacing:.04em; }
.ops-cta { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:11px; margin-bottom:14px; border-radius:11px; border:none; background:linear-gradient(150deg,var(--accent),var(--accent-deep)); color:var(--on-accent); font-family:var(--sans); font-size:13.5px; font-weight:600; cursor:pointer; box-shadow:0 8px 20px -8px rgba(67,71,158,.7); transition:filter .15s,transform .1s; }
.ops-cta:hover { filter:brightness(1.07); }
.ops-cta:active { transform:translateY(1px); }
.ops-navgroup { font-family:var(--mono); text-transform:uppercase; font-size:9.5px; letter-spacing:.15em; color:rgba(241,235,221,.34); padding:15px 12px 7px; }
.ops-navgroupsep { display:none; height:1px; background:rgba(241,235,221,.1); margin:11px 8px; }
.ops-navbtn { position:relative; display:flex; align-items:center; gap:12px; width:100%; padding:9px 12px; border-radius:11px; border:1px solid transparent; background:transparent; color:rgba(241,235,221,.74); text-align:left; font-size:14px; font-weight:500; font-family:var(--sans); letter-spacing:-0.01em; cursor:pointer; transition:background .15s,color .15s; }
.ops-navbtn:hover { background:rgba(241,235,221,.07); color:#F1EBDD; }
.ops-navbtn.on { background:rgba(67,71,158,.26); color:#ECECFA; font-weight:600; }
.ops-navbtn.on::before { content:''; position:absolute; left:-16px; top:50%; transform:translateY(-50%); width:4px; height:20px; border-radius:0 4px 4px 0; background:var(--accent); }
.ops-navico { flex:0 0 auto; display:inline-flex; }
.ops-navlabel { flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ops-navbadge { flex:0 0 auto; min-width:19px; height:19px; padding:0 6px; border-radius:99px; font-size:11px; font-weight:700; display:grid; place-items:center; }
.ops-navdot { display:none; position:absolute; top:8px; right:14px; width:7px; height:7px; border-radius:99px; box-shadow:0 0 0 2px var(--roast); }
.ops-navbtn:focus-visible, .ops-cmd:focus-visible, .ops-cta:focus-visible, .ops-collapse:focus-visible, .ops-acct:focus-visible, .ops-menuitem:focus-visible { outline:2px solid #8E92E6; outline-offset:2px; }
.ops-side-foot { position:relative; margin-top:8px; padding-top:11px; border-top:1px solid rgba(241,235,221,.1); }
.ops-acct { display:flex; align-items:center; gap:10px; width:100%; padding:8px 6px; border-radius:11px; border:1px solid transparent; background:transparent; cursor:pointer; transition:background .15s; text-align:left; }
.ops-acct:hover { background:rgba(241,235,221,.07); }
.ops-usertext { flex:1; min-width:0; }
.ops-acctchev { flex:0 0 auto; color:rgba(241,235,221,.4); display:inline-flex; }
.ops-menu { position:absolute; left:6px; right:6px; bottom:calc(100% + 8px); background:var(--roast-2); border:1px solid rgba(241,235,221,.14); border-radius:13px; padding:6px; box-shadow:0 -10px 44px -10px rgba(0,0,0,.65); z-index:30; animation:ops-menupop .16s ease; }
@keyframes ops-menupop { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
.ops-menuitem { display:flex; align-items:center; gap:10px; width:100%; padding:9px 11px; border-radius:9px; border:none; background:transparent; color:rgba(241,235,221,.82); font-family:var(--sans); font-size:13.5px; font-weight:500; text-align:left; cursor:pointer; transition:background .12s,color .12s; }
.ops-menuitem:hover { background:rgba(241,235,221,.09); color:#F1EBDD; }
.ops-menusep { height:1px; background:rgba(241,235,221,.1); margin:5px 4px; }
@media (min-width: 881px) {
  .ops-sidebar.ops-rail { width:76px !important; flex-basis:76px !important; padding-left:13px !important; padding-right:13px !important; }
  .ops-sidebar.ops-rail .ops-brandtext,
  .ops-sidebar.ops-rail .ops-navlabel,
  .ops-sidebar.ops-rail .ops-navbadge,
  .ops-sidebar.ops-rail .ops-navgroup,
  .ops-sidebar.ops-rail .ops-usertext,
  .ops-sidebar.ops-rail .ops-acctchev,
  .ops-sidebar.ops-rail .ops-cmd-kbd,
  .ops-sidebar.ops-rail .ops-cmd-label,
  .ops-sidebar.ops-rail .ops-cta-label { display:none !important; }
  .ops-sidebar.ops-rail .ops-side-head { flex-direction:column; align-items:center; gap:14px; padding:2px 0 14px; }
  .ops-sidebar.ops-rail .ops-cmd, .ops-sidebar.ops-rail .ops-cta { justify-content:center; padding:10px 0; gap:0; }
  .ops-sidebar.ops-rail .ops-navbtn { justify-content:center; padding:11px 0; gap:0; }
  .ops-sidebar.ops-rail .ops-navbtn.on::before { left:-13px; }
  .ops-sidebar.ops-rail .ops-navdot { display:block; }
  .ops-sidebar.ops-rail .ops-navgroupsep { display:block; }
  .ops-sidebar.ops-rail .ops-side-foot { padding-left:0; padding-right:0; }
  .ops-sidebar.ops-rail .ops-acct { justify-content:center; padding:8px 0; }
  .ops-sidebar.ops-rail .ops-tip:hover::after { content:attr(data-tip); position:absolute; left:calc(100% + 14px); top:50%; transform:translateY(-50%); white-space:nowrap; background:var(--roast-2); color:#F1EBDD; font-family:var(--sans); font-size:12.5px; font-weight:500; padding:7px 11px; border-radius:8px; box-shadow:0 8px 24px -8px rgba(0,0,0,.6); border:1px solid rgba(241,235,221,.12); z-index:40; pointer-events:none; }
  .ops-sidebar.ops-rail .ops-tip:hover::before { content:''; position:absolute; left:calc(100% + 9px); top:50%; transform:translateY(-50%) rotate(45deg); width:8px; height:8px; background:var(--roast-2); border-left:1px solid rgba(241,235,221,.12); border-bottom:1px solid rgba(241,235,221,.12); z-index:41; pointer-events:none; }
}
`;

export function AdSidebar({ route, go, counts, adminUser, onSignOut, onClose, notifs, setNotifs, onNewOrder, openCmd, railed, setRailed }) {
  const [acctMenu, setAcctMenu] = useState(false);
  const mobile = !!onClose;            // mobile drawer instance never collapses to a rail
  const isRail = railed && !mobile;
  const name = adminUser?.name || "Admin";
  const initials = AM.initials(adminUser?.name || adminUser?.email);
  const notifCount = (notifs || []).filter((n) => !n.read).length;

  useEffect(() => {
    if (!acctMenu) return;
    const onKey = (e) => { if (e.key === "Escape") setAcctMenu(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [acctMenu]);

  const navBtn = (id) => {
    const n = navById(id); if (!n) return null;
    const active = route === id;
    const badge = counts[id];
    const accent = BADGE_ACCENT.has(id);
    return (
      <button key={id} className={"ops-navbtn ops-tip" + (active ? " on" : "")} data-tip={n.label}
        onClick={() => { go(id); onClose && onClose(); }} title={n.label} aria-current={active ? "page" : undefined}>
        <span className="ops-navico" style={{ color: active ? "var(--accent)" : "rgba(241,235,221,.55)" }}><Icon name={n.icon} size={18} /></span>
        <span className="ops-navlabel">{n.label}</span>
        {badge > 0 && <>
          <span className="ops-navbadge" style={{ background: accent ? "var(--accent)" : "rgba(241,235,221,.14)", color: "#fff" }}>{badge}</span>
          <span className="ops-navdot" style={{ background: accent ? "var(--accent)" : "rgba(241,235,221,.4)" }} />
        </>}
      </button>
    );
  };

  return (
    <aside className={"scroll ops-sidebar" + (isRail ? " ops-rail" : "")}
      style={{ width: isRail ? 76 : 256, flex: isRail ? "0 0 76px" : "0 0 256px", background: "var(--roast)", height: "100%", display: "flex", flexDirection: "column",
        padding: "20px 16px 16px", overflowY: "auto", borderRight: "1px solid rgba(0,0,0,.3)" }}>
      <style>{SIDEBAR_CSS}</style>

      <div className="ops-side-head">
        <div style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(150deg,var(--accent),var(--accent-deep))", flex: "0 0 38px", display: "grid", placeItems: "center",
          fontFamily: "var(--serif)", fontWeight: 600, fontSize: 20, color: "var(--on-accent)", boxShadow: "0 6px 16px -4px rgba(67,71,158,.55)" }}>M</div>
        <div className="ops-brandtext">
          <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 600, color: "#F1EBDD", lineHeight: 1.15, whiteSpace: "nowrap" }}>Meridian Studio</div>
          <div className="mono" style={{ textTransform: "uppercase", color: "var(--accent)", fontSize: 9, marginTop: 3, letterSpacing: ".14em" }}>Ops Console</div>
        </div>
        {onClose
          ? <button onClick={onClose} aria-label="Close menu" style={{ marginLeft: "auto", background: "transparent", border: "none", color: "rgba(241,235,221,.6)", display: "inline-flex", cursor: "pointer" }}><Icon name="x" size={20} /></button>
          : setRailed && <button className="ops-collapse ops-tip" data-tip={isRail ? "Expand" : "Collapse"} onClick={() => setRailed(!railed)} title={isRail ? "Expand" : "Collapse"} aria-label={isRail ? "Expand sidebar" : "Collapse sidebar"}><Icon name={isRail ? "right" : "left"} size={16} /></button>}
      </div>

      {openCmd && <button className="ops-cmd ops-tip" data-tip="Search · ⌘K" onClick={openCmd} aria-label="Search and commands">
        <span className="ops-navico"><Icon name="search" size={17} /></span>
        <span className="ops-cmd-label">Search…</span>
        <span className="ops-cmd-kbd">⌘K</span>
      </button>}

      {onNewOrder && <button className="ops-cta ops-tip" data-tip="New order" onClick={() => { onNewOrder(); onClose && onClose(); }} aria-label="New order">
        <span className="ops-navico"><Icon name="plus" size={17} stroke={2.4} /></span>
        <span className="ops-cta-label">New order</span>
      </button>}

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }} aria-label="Primary navigation">
        {NAV_GROUPS.map((g, gi) => (
          <React.Fragment key={gi}>
            {g.sep && <div className="ops-navgroupsep" />}
            {g.label && <div className="ops-navgroup">{g.label}</div>}
            {g.items.map(navBtn)}
          </React.Fragment>
        ))}
      </nav>

      <div style={{ flex: 1, minHeight: 16 }} />

      <div className="ops-side-foot">
        {acctMenu && (
          <div className="ops-menu" role="menu">
            <div className="ops-menuitem" role="menuitem" style={{ padding: "5px 7px", cursor: "default" }}>
              {notifs && <NotifBell items={notifs} setItems={setNotifs} dark go={(r) => { setAcctMenu(false); go(r); onClose && onClose(); }} />}
              <span style={{ flex: 1 }}>Notifications</span>
              {notifCount > 0 && <span style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 99, background: "var(--accent)", color: "#fff", fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center" }}>{notifCount}</span>}
            </div>
            <button className="ops-menuitem" role="menuitem" onClick={() => { setAcctMenu(false); go("emails"); onClose && onClose(); }}><Icon name="gear" size={17} /><span style={{ flex: 1 }}>Settings</span></button>
            <button className="ops-menuitem" role="menuitem" onClick={() => { setAcctMenu(false); }}><Icon name="user" size={17} /><span style={{ flex: 1 }}>Your profile</span></button>
            <div className="ops-menusep" />
            <button className="ops-menuitem" role="menuitem" onClick={onSignOut} style={{ color: "#E89B9B" }}><Icon name="logout" size={17} /><span style={{ flex: 1 }}>Sign out</span></button>
          </div>
        )}
        <button className="ops-acct ops-tip" data-tip={`${name} · Admin`} onClick={() => setAcctMenu((o) => !o)} aria-haspopup="menu" aria-expanded={acctMenu}>
          <div style={{ position: "relative", flex: "0 0 34px" }}>
            <Avatar initials={initials} size={34} tone="accent" />
            {notifCount > 0 && <span style={{ position: "absolute", top: -2, right: -2, width: 9, height: 9, borderRadius: 99, background: "var(--accent)", boxShadow: "0 0 0 2px var(--roast)" }} />}
          </div>
          <div className="ops-usertext">
            <div style={{ color: "#F1EBDD", fontWeight: 600, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
            <div className="mono" style={{ color: "rgba(241,235,221,.45)", fontSize: 9.5, letterSpacing: ".08em" }}>ADMIN</div>
          </div>
          <span className="ops-acctchev"><Icon name={acctMenu ? "down" : "up"} size={16} /></span>
        </button>
      </div>
      {acctMenu && <div onClick={() => setAcctMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 20 }} />}
    </aside>
  );
}

export function AdTopbar({ title, sub, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 26, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(28px,3.4vw,38px)", fontWeight: 500, letterSpacing: "-0.025em", margin: 0, lineHeight: 1.05 }}>{title}</h1>
        {sub && <p style={{ fontSize: 14.5, color: "var(--ink-2)", margin: "8px 0 0" }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}
