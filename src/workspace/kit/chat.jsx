/* ============================================================
   chat.jsx — shared lively chat kit (ES module)
   ChatThread + ChatComposer. Outgoing = --accent, incoming = surface.
   ============================================================ */
import React from "react";
import { Icon } from "./icons.jsx";

const CHAT_STYLE = `
.chat-wrap{ display:flex; flex-direction:column; }
.chat-scroll{ display:flex; flex-direction:column; gap:4px;
  background:var(--surface-2);
  background-image:radial-gradient(rgba(157,138,107,.10) 1px, transparent 1.4px);
  background-size:24px 24px; border-radius:14px; padding:14px 18px; }
.cbub{ position:relative; max-width:76%; padding:9px 13px 6px; border-radius:16px;
  font-size:14.5px; line-height:1.46; box-shadow:0 1px 1.5px rgba(40,33,22,.07);
  animation:cbubIn .3s cubic-bezier(.2,.75,.3,1) both; word-wrap:break-word; }
.cbub.them{ background:var(--surface); color:var(--ink); border:1px solid var(--line); }
.cbub.you{ background:var(--accent); color:#fff; }
.cbub.them.tail{ border-top-left-radius:5px; }
.cbub.you.tail{ border-top-right-radius:5px; }
.cbub.them.tail::after{ content:''; position:absolute; left:-6px; top:0; width:0; height:0; border-top:9px solid var(--surface); border-left:9px solid transparent; }
.cbub.you.tail::after{ content:''; position:absolute; right:-6px; top:0; width:0; height:0; border-top:9px solid var(--accent); border-right:9px solid transparent; }
.cmeta{ display:flex; align-items:center; justify-content:flex-end; gap:4px; font-size:10.5px; margin-top:3px; font-family:var(--mono); letter-spacing:.03em; }
.cbub.them .cmeta{ color:var(--faint); } .cbub.you .cmeta{ color:rgba(255,255,255,.72); }
@keyframes cbubIn{ from{ opacity:0; transform:translateY(7px) scale(.985);} to{ opacity:1; transform:none; } }
.cday{ display:flex; justify-content:center; margin:14px 0 12px; }
.cday span{ background:rgba(33,29,23,.055); color:var(--ink-2); font-family:var(--mono); font-size:9.5px; letter-spacing:.1em; text-transform:uppercase; padding:5px 13px; border-radius:99px; font-weight:600; }
.cnote{ display:flex; justify-content:center; margin:8px 0; }
.cnote span{ background:var(--st-revision-bg); color:var(--st-revision); border:1px solid var(--st-revision-edge); font-size:11.5px; font-weight:600; padding:5px 13px; border-radius:99px; max-width:80%; text-align:center; }
.ctyping{ display:inline-flex; gap:4px; align-items:center; padding:12px 15px; }
.ctyping i{ width:7px; height:7px; border-radius:99px; background:var(--muted); animation:ctyped 1.25s infinite; }
.ctyping i:nth-child(2){ animation-delay:.18s; } .ctyping i:nth-child(3){ animation-delay:.36s; }
@keyframes ctyped{ 0%,60%,100%{ transform:translateY(0); opacity:.35; } 30%{ transform:translateY(-4px); opacity:1; } }
.cquick{ display:flex; gap:8px; padding:12px 0 0; overflow-x:auto; scrollbar-width:none; }
.cquick::-webkit-scrollbar{ display:none; }
.cquick button{ flex:0 0 auto; border:1px solid var(--accent-soft); background:var(--surface); border-radius:99px; padding:7px 14px; font-size:13px; font-weight:500; color:var(--accent-deep); font-family:var(--sans); white-space:nowrap; cursor:pointer; transition:all .14s; }
.cquick button:hover{ background:var(--accent-soft); transform:translateY(-1px); }
`;

function CTicks({ read }) {
  return <span style={{ display: "inline-flex", color: read ? "#BFE3FF" : "rgba(255,255,255,.7)" }}><Icon name="ticks" size={15} stroke={2.1} /></span>;
}
export function ChatBubble({ m, tail }) {
  const you = m.from === "you" || m.from === "me";
  return (
    <div style={{ display: "flex", justifyContent: you ? "flex-end" : "flex-start", marginTop: tail ? 6 : 0 }}>
      <div className={`cbub ${you ? "you" : "them"} ${tail ? "tail" : ""}`}>
        <div>{m.body}</div>
        <div className="cmeta"><span>{m.time || m.at}</span>{you && <CTicks read={m.status === "read"} />}</div>
      </div>
    </div>
  );
}

const _dayOf = (at) => /(\d:|am|pm|now)/i.test(String(at || "")) ? "Today" : (at || "Today");

export function ChatThread({ messages, typing, scrollKey }) {
  const ref = React.useRef(null);
  React.useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [scrollKey, messages && messages.length, typing]);
  const rows = [];
  let lastDay = null;
  (messages || []).forEach((m, i) => {
    if (m.internal) { rows.push({ type: "note", body: m.body, key: "n" + i }); return; }
    const day = m.day || _dayOf(m.at);
    if (day !== lastDay) { rows.push({ type: "day", day, key: "d" + i }); lastDay = day; }
    const prev = messages[i - 1];
    const tail = !prev || prev.from !== m.from || (prev.day || _dayOf(prev.at)) !== day || prev.internal;
    rows.push({ type: "msg", m, tail, key: "m" + i });
  });
  return (
    <>
      <style>{CHAT_STYLE}</style>
      <div ref={ref} className="chat-scroll scroll" style={{ flex: 1, overflowY: "auto", minHeight: 220, maxHeight: "46vh" }}>
        {rows.length === 0 && <div style={{ color: "var(--muted)", fontSize: 13.5, padding: "10px 2px", textAlign: "center" }}>No messages yet.</div>}
        {rows.map((r) => r.type === "day" ? <div className="cday" key={r.key}><span>{r.day}</span></div>
          : r.type === "note" ? <div className="cnote" key={r.key}><span>{r.body}</span></div>
          : <ChatBubble key={r.key} m={r.m} tail={r.tail} />)}
        {typing && <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 6 }}><div className="cbub them tail ctyping"><i /><i /><i /></div></div>}
      </div>
    </>
  );
}

export function ChatComposer({ onSend, placeholder = "Write a message…", quick }) {
  const [v, setV] = React.useState("");
  const send = (text) => { const b = (text != null ? text : v).trim(); if (!b) return; onSend(b); setV(""); };
  return (
    <div>
      {quick && quick.length > 0 && (
        <div className="cquick">{quick.map((q) => <button key={q} onClick={() => send(q)}>{q}</button>)}</div>
      )}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
        <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={placeholder}
          style={{ flex: 1, padding: "12px 16px", borderRadius: 999, border: "1px solid var(--line-2)", background: "var(--surface-2)", fontFamily: "var(--sans)", fontSize: 14.5, outline: "none", color: "var(--ink)" }} />
        <button onClick={() => send()} aria-label="Send message" style={{ width: 44, height: 44, borderRadius: 99, border: "none", background: "var(--accent)", color: "#fff", display: "grid", placeItems: "center", flex: "0 0 44px", boxShadow: "0 4px 12px -4px var(--accent)" }}>
          <Icon name="send" size={19} />
        </button>
      </div>
    </div>
  );
}
