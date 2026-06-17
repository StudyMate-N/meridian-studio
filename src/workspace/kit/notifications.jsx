/* ============================================================
   notifications.jsx — shared NotifBell + dropdown (ES module)
   Items are derived client-side from real signals (orders,
   messages, invoices). → export NotifBell
   ============================================================ */
import React from "react";
import { Icon } from "./icons.jsx";
import { MM } from "./model.js";

const NOTIF_STYLE = `
.nb-pop{ position:fixed; z-index:5000; width:340px; max-width:calc(100vw - 24px); max-height:70vh;
  background:var(--surface); border:1px solid var(--line); border-radius:16px; overflow:hidden;
  box-shadow:var(--shadow-pop); display:flex; flex-direction:column; animation:rise .16s ease both; }
.nb-hd{ display:flex; align-items:center; gap:10px; padding:14px 16px; border-bottom:1px solid var(--line); }
.nb-list{ overflow-y:auto; }
.nb-item{ display:flex; gap:12px; width:100%; text-align:left; padding:13px 16px; border:none;
  border-bottom:1px solid var(--line); background:transparent; cursor:pointer; transition:background .12s; }
.nb-item:hover{ background:var(--surface-2); }
.nb-item.unread{ background:color-mix(in oklab, var(--accent-soft) 45%, var(--surface)); }
.nb-dot{ width:8px; height:8px; border-radius:99px; background:var(--accent); flex:0 0 8px; margin-top:6px; }
`;

export function NotifBell({ items, setItems, dark, go }) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 60, left: 60 });
  const btnRef = React.useRef(null);
  const list = items || [];
  const unread = list.filter((i) => !i.read).length;

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const left = Math.min(window.innerWidth - 352, Math.max(12, r.left));
      setPos({ top: Math.min(r.bottom + 8, window.innerHeight - 80), left });
    }
    setOpen((o) => !o);
  };
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const markAll = () => setItems && setItems(list.map((i) => ({ ...i, read: true })));
  const onClick = (it) => {
    setItems && setItems(list.map((i) => i.id === it.id ? { ...i, read: true } : i));
    if (it.route && go) { go(it.route); setOpen(false); }
  };

  return (
    <>
      <style>{NOTIF_STYLE}</style>
      <button ref={btnRef} onClick={toggle} aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        style={{ position: "relative", width: 36, height: 36, borderRadius: 10, border: "none", cursor: "pointer",
          background: dark ? "rgba(241,235,221,.08)" : "var(--surface-2)", color: dark ? "rgba(241,235,221,.85)" : "var(--ink-2)",
          display: "grid", placeItems: "center", flex: "0 0 36px" }}>
        <Icon name="bell" size={18} />
        {unread > 0 && <span style={{ position: "absolute", top: -3, right: -3, minWidth: 17, height: 17, padding: "0 4px",
          borderRadius: 99, background: "var(--accent)", color: "#fff", fontSize: 10.5, fontWeight: 700,
          display: "grid", placeItems: "center", border: `2px solid ${dark ? "var(--roast)" : "var(--paper)"}` }}>{unread}</span>}
      </button>
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 4999 }} onClick={() => setOpen(false)}>
          <div className="nb-pop" style={{ top: pos.top, left: pos.left }} onClick={(e) => e.stopPropagation()}>
            <div className="nb-hd">
              <span style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 600, color: "var(--ink)" }}>Notifications</span>
              <div style={{ flex: 1 }} />
              {unread > 0 && <button onClick={markAll} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Mark all read</button>}
            </div>
            <div className="nb-list scroll">
              {list.length === 0 && <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>You're all caught up.</div>}
              {list.map((it) => {
                const tn = it.tone ? (MM.TONE[it.tone] || null) : null;
                const col = tn ? tn.color : "var(--accent)";
                const bg = tn ? tn.bg : "var(--accent-soft)";
                return (
                  <button key={it.id} className={"nb-item" + (it.read ? "" : " unread")} onClick={() => onClick(it)}>
                    <span style={{ width: 34, height: 34, borderRadius: 9, background: bg, color: col, display: "grid", placeItems: "center", flex: "0 0 34px" }}>
                      <Icon name={it.icon || "bell"} size={17} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{it.title}</span>
                        <span style={{ flex: 1 }} />
                        <span className="mono" style={{ fontSize: 10, color: "var(--faint)", flex: "0 0 auto" }}>{it.at}</span>
                      </span>
                      <span style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.45, marginTop: 2 }}>{it.body}</span>
                    </span>
                    {!it.read && <span className="nb-dot" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default NotifBell;
