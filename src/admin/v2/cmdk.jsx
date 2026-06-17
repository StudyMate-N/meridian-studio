/* ============================================================
   Command palette (⌘K) — opens on ⌘K/Ctrl+K and from the sidebar
   search trigger. Searches the 8 nav destinations, open orders
   (ref/title → openDrawer), and people (clients/experts by name →
   go to screen). Arrow up/down + Enter to select, Esc to close.
   ES module, wired to AdminApp's go()/openDrawer().
   ============================================================ */
import React from "react";
import { Icon } from "../../workspace/kit/icons.jsx";
import { ADMIN_NAV } from "./shell.jsx";

const { useState, useEffect, useMemo, useRef } = React;

export function CmdPalette({ open, onClose, go, openDrawer, orders, clients, writers, notify }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => { if (open) { setQuery(""); setIndex(0); requestAnimationFrame(() => { try { inputRef.current && inputRef.current.focus(); } catch {} }); } }, [open]);

  // Build the full item set: nav destinations, open orders, people.
  const items = useMemo(() => {
    const out = [];
    ADMIN_NAV.forEach((n) => out.push({ group: "Go to", icon: n.icon, title: n.label, sub: "Section", run: () => { go(n.id); onClose(); } }));
    const openOrders = (orders || []).filter((o) => !["closed"].includes(o.status));
    openOrders.forEach((o) => out.push({ group: "Orders", icon: "briefcase", title: o.title || o.ref, sub: `${o.ref} · ${o.client_name || "—"}`, meta: o.ref, run: () => { go("orders"); openDrawer(o); onClose(); } }));
    (clients || []).forEach((c) => out.push({ group: "People", icon: "user", title: c.name || c.email, sub: "Client · " + (c.program || c.school || c.email || ""), run: () => { go("clients"); onClose(); notify && notify(`${c.name || c.email} — opening Clients`); } }));
    (writers || []).forEach((w) => out.push({ group: "People", icon: "users", title: w.name, sub: "Expert · " + (w.specialty || ""), run: () => { go("writers"); onClose(); notify && notify(`${w.name} — opening Experts`); } }));
    return out;
  }, [orders, clients, writers, go, openDrawer, onClose, notify]);

  const results = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return items.filter((i) => i.group === "Go to");
    return items.map((i) => {
      const hay = (i.title + " " + i.sub + " " + i.group).toLowerCase();
      let s = -1;
      if (hay.startsWith(q)) s = 3; else if ((i.title || "").toLowerCase().includes(q)) s = 2; else if (hay.includes(q)) s = 1;
      return { i, s };
    }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 12).map((x) => x.i);
  }, [items, query]);

  useEffect(() => { if (index >= results.length) setIndex(0); }, [results.length, index]);

  // Build a flat render list with group headers interleaved.
  const rows = useMemo(() => {
    const r = []; let last = null; let itemIdx = 0;
    results.forEach((it) => {
      if (it.group !== last) { r.push({ header: it.group }); last = it.group; }
      r.push({ item: it, idx: itemIdx }); itemIdx++;
    });
    return r;
  }, [results]);

  const onKey = (e) => {
    const k = e.key;
    if (k === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(i + 1, Math.max(0, results.length - 1))); }
    else if (k === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
    else if (k === "Enter") { e.preventDefault(); const it = results[index]; if (it) it.run(); }
    else if (k === "Escape") { e.preventDefault(); onClose(); }
  };

  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,12,20,.5)", zIndex: 1600, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "14vh 16px 16px", animation: "fadeIn .14s ease both" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(580px,96vw)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow-pop)", overflow: "hidden", animation: "rise .2s cubic-bezier(.22,1,.36,1) both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
          <span style={{ display: "inline-flex", color: "var(--muted)" }}><Icon name="search" size={18} /></span>
          <input ref={inputRef} value={query} onChange={(e) => { setQuery(e.target.value); setIndex(0); }} onKeyDown={onKey}
            placeholder="Search orders, people, or jump to a section…"
            style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", outline: "none", fontFamily: "var(--sans)", fontSize: 15.5, color: "var(--ink)" }} />
          <span className="mono" style={{ fontSize: 10, color: "var(--faint)", border: "1px solid var(--line-2)", borderRadius: 6, padding: "2px 7px" }}>ESC</span>
        </div>
        <div ref={listRef} className="scroll" style={{ maxHeight: "56vh", overflowY: "auto", padding: 7 }}>
          {rows.map((row, i) => row.header ? (
            <div key={"h" + i} className="mono" style={{ textTransform: "uppercase", fontSize: 9.5, letterSpacing: ".13em", color: "var(--faint)", padding: "11px 11px 5px" }}>{row.header}</div>
          ) : (() => {
            const sel = row.idx === index;
            return (
              <button key={"i" + i} onClick={() => row.item.run()} onMouseEnter={() => setIndex(row.idx)}
                style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "9px 11px", border: "none", borderRadius: 10, background: sel ? "var(--surface-2)" : "transparent", cursor: "pointer", textAlign: "left" }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface-2)", display: "grid", placeItems: "center", flex: "0 0 30px", color: "var(--accent)" }}><Icon name={row.item.icon} size={16} /></span>
                <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.item.title}</span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.item.sub}</span>
                </span>
                {row.item.meta && <span className="mono" style={{ fontSize: 10.5, color: "var(--faint)", flex: "0 0 auto" }}>{row.item.meta}</span>}
                <span style={{ display: "inline-flex", color: "var(--faint)" }}><Icon name="arrow" size={15} /></span>
              </button>
            );
          })())}
          {results.length === 0 && <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>No matches for “{query}”.</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "9px 15px", borderTop: "1px solid var(--line)", fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", letterSpacing: ".04em" }}>
          <span>↑ ↓ &nbsp;navigate</span><span>↵ &nbsp;open</span><span>esc &nbsp;close</span>
        </div>
      </div>
    </div>
  );
}

export default CmdPalette;
