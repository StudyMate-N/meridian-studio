/* ============================================================
   Messages — order conversations (live order_messages, realtime)
   + a WhatsApp-styled support channel. ES module.
   ============================================================ */
import React from "react";
import { supabase } from "../lib/supabase.js";
import { Icon } from "./kit/icons.jsx";
import { MM } from "./kit/model.js";
import { Avatar, Button } from "./kit/components.jsx";
import { initialsOf } from "./dashboard.jsx";

const { useState, useEffect, useRef, useMemo } = React;

const MCHAT_STYLE = `
.mchat-bg{
  background-color: var(--surface-2);
  background-image:
    radial-gradient(rgba(157,138,107,.12) 1px, transparent 1.4px),
    radial-gradient(rgba(157,138,107,.06) 1px, transparent 1.4px);
  background-size: 26px 26px, 26px 26px;
  background-position: 0 0, 13px 13px;
}
.mchat-wa{
  background-color:#EFEAE2;
  background-image:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><g fill='none' stroke='%23D2C8B8' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' opacity='0.5'><path d='M20 30h26a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H32l-8 7v-7h-4a4 4 0 0 1-4-4V34a4 4 0 0 1 4-4z'/><path d='M150 28c-4-6-13-3-13 4 0 5 7 10 13 14 6-4 13-9 13-14 0-7-9-10-13-4z'/><circle cx='40' cy='112' r='13'/><path d='M35 110h.01M45 110h.01'/><path d='M34 116a8 8 0 0 0 12 0'/><path d='M110 80l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z'/><path d='M160 96l24-9-9 24-5-9z'/><path d='M150 150h22a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3h-22a3 3 0 0 1-3-3v-14a3 3 0 0 1 3-3z'/><path d='M155 150l3-4h8l3 4'/><circle cx='161' cy='162' r='5'/><path d='M70 150v22M70 150l14-3v18'/><circle cx='66' cy='172' r='4.5'/><circle cx='80' cy='168' r='4.5'/></g></svg>");
  background-size:200px 200px;
}
.mbub{ position:relative; max-width:76%; padding:9px 13px 6px; border-radius:16px;
  font-size:14.5px; line-height:1.46; box-shadow:0 1px 1.5px rgba(40,33,22,.07);
  animation: bubIn .3s cubic-bezier(.2,.75,.3,1) both; word-wrap:break-word; }
.mbub.them{ background:var(--surface); color:var(--ink); border:1px solid var(--line); }
.mbub.you{ background:var(--accent); color:var(--on-accent); }
.mbub.them.tail{ border-top-left-radius:5px; }
.mbub.you.tail{ border-top-right-radius:5px; }
.mbub.them.tail::after{ content:''; position:absolute; left:-6px; top:0; width:0; height:0;
  border-top:9px solid var(--surface); border-left:9px solid transparent; }
.mbub.you.tail::after{ content:''; position:absolute; right:-6px; top:0; width:0; height:0;
  border-top:9px solid var(--accent); border-right:9px solid transparent; }
.mbub-meta{ display:flex; align-items:center; justify-content:flex-end; gap:4px;
  font-size:10.5px; margin-top:3px; font-family:var(--mono); letter-spacing:.03em; }
.mbub.them .mbub-meta{ color:var(--faint); }
.mbub.you .mbub-meta{ color:rgba(252,247,240,.72); }
@keyframes bubIn{ from{ opacity:0; transform:translateY(7px) scale(.985);} to{ opacity:1; transform:none; } }
.mday{ display:flex; justify-content:center; margin:16px 0 14px; }
.mday span{ background:rgba(33,29,23,.055); color:var(--ink-2); font-family:var(--mono);
  font-size:9.5px; letter-spacing:.1em; text-transform:uppercase; padding:5px 13px; border-radius:99px; font-weight:600; }
.monline{ position:relative; width:8px; height:8px; border-radius:99px; background:var(--st-done); }
.monline::after{ content:''; position:absolute; inset:-4px; border-radius:99px;
  border:1.5px solid var(--st-done); opacity:.5; animation:onlinePulse 1.8s ease-out infinite; }
@keyframes onlinePulse{ from{ transform:scale(.6); opacity:.6; } to{ transform:scale(1.5); opacity:0; } }
.micon-btn{ width:38px; height:38px; border-radius:99px; border:none; background:transparent;
  color:var(--ink-2); display:grid; place-items:center; transition:background .14s; cursor:pointer; }
.micon-btn:hover{ background:var(--surface-2); }
.mquick{ display:flex; gap:8px; padding:10px 16px 0; overflow-x:auto; scrollbar-width:none; }
.mquick::-webkit-scrollbar{ display:none; }
.mquick button{ flex:0 0 auto; border:1px solid var(--accent-soft); background:var(--surface); border-radius:99px;
  padding:7px 14px; font-size:13px; font-weight:500; color:var(--accent-deep); font-family:var(--sans);
  white-space:nowrap; cursor:pointer; transition:all .14s; }
.mquick button:hover{ background:var(--accent-soft); transform:translateY(-1px); }
.mtyping{ display:inline-flex; gap:4px; align-items:center; padding:12px 15px; }
.mtyping i{ width:7px; height:7px; border-radius:99px; background:var(--muted); animation:mtyped 1.25s infinite; }
.mtyping i:nth-child(2){ animation-delay:.18s; } .mtyping i:nth-child(3){ animation-delay:.36s; }
@keyframes mtyped{ 0%,60%,100%{ transform:translateY(0); opacity:.35; } 30%{ transform:translateY(-4px); opacity:1; } }
`;

function Ticks({ read }) {
  return <span style={{ display: "inline-flex", color: read ? "#BFE3FF" : "rgba(252,247,240,.7)" }}>
    <Icon name="ticks" size={15} stroke={2.1} /></span>;
}
function Bubble({ m, tail }) {
  const you = m.from === "you";
  return (
    <div style={{ display: "flex", justifyContent: you ? "flex-end" : "flex-start" }}>
      <div className={`mbub ${you ? "you" : "them"} ${tail ? "tail" : ""}`}>
        <div>{m.body}</div>
        <div className="mbub-meta"><span>{m.time}</span>{you && <Ticks read={m.status === "read"} />}</div>
      </div>
    </div>
  );
}

const dayOf = (ts) => {
  if (!ts) return "Today";
  try {
    const d = new Date(ts), now = new Date();
    if (d.toDateString() === now.toDateString()) return "Today";
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return "Today"; }
};
const timeOf = (ts) => { try { return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); } catch { return ""; } };

/* live order thread (order_messages + realtime) */
function useOrderThread(orderId, user, writerName) {
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(false);
  const map = (r) => ({
    id: r.id, from: r.sender_id && user && r.sender_id === user.id ? "you" : "them",
    body: r.body, time: timeOf(r.created_at), day: dayOf(r.created_at), status: "read",
    name: r.sender_name || writerName || "Meridian",
  });
  useEffect(() => {
    if (!orderId) { setMsgs([]); setLoading(false); return; }
    let active = true;
    setMsgs([]); setLoading(true);   // reset on convo switch so the prior thread never bleeds through
    const load = (retry = false) =>
      supabase.from("order_messages").select("*").eq("order_id", orderId).eq("is_internal", false)
        .order("created_at", { ascending: true })
        .then(({ data, error }) => {
          if (!active) return;
          // a transient read error must not look like an empty thread — retry once
          if (error && !retry) { setTimeout(() => active && load(true), 600); return; }
          setMsgs((data || []).map(map)); setLoading(false);
        });
    load();
    const ch = supabase.channel(`order-${orderId}-msgs-inbox`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_messages", filter: `order_id=eq.${orderId}` },
        (payload) => { if (payload.new.is_internal) return; setMsgs((t) => t.some((x) => x.id === payload.new.id) ? t : [...t, map(payload.new)]); })
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [orderId, user && user.id]);
  return [msgs, setMsgs, map, loading];
}

const QUICK_REPLIES = ["Thank you!", "Any update?", "Can we adjust the deadline?"];

export function Messages({ orders, lastMessages, user, profile, initialId, onSupport, notify }) {
  // conversations = orders that have a writer or an existing thread
  const orderConvos = useMemo(() => (orders || [])
    .filter((o) => o.writer || (lastMessages && lastMessages[o.id]))
    .map((o) => ({
      id: o.id, ref: o.ref, orderTitle: o.title, writerName: o.writer?.name || "Meridian",
      who: o.writer?.name || "Meridian", initials: initialsOf(o.writer?.name || "Meridian"),
      unread: o.unread || 0, last: (lastMessages && lastMessages[o.id]?.body) || "Start the conversation",
      at: (lastMessages && lastMessages[o.id]?.ts) || "",
    })), [orders, lastMessages]);

  const SUPPORT = { id: "support", who: "Meridian support", orderTitle: "We're here to help", initials: "MS", whatsapp: true, unread: 0, last: "Message us anytime — we usually reply fast.", at: "" };
  const convos = [SUPPORT, ...orderConvos];

  const [activeId, setActiveId] = useState(
    initialId && convos.some((c) => c.id === initialId) ? initialId
      : (orderConvos[0] ? orderConvos[0].id : "support"));
  const [mobileThread, setMobileThread] = useState(false);
  const active = convos.find((c) => c.id === activeId) || convos[0];
  const wa = !!(active && active.whatsapp);

  const [thread, , , threadLoading] = useOrderThread(wa ? null : activeId, user, active && active.writerName);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [activeId, thread.length]);

  const openConvo = (id) => { setActiveId(id); setMobileThread(true); };

  async function send(text) {
    const body = (text != null ? text : draft).trim();
    if (!body || wa || !user) return;
    setDraft("");
    await supabase.from("order_messages").insert({
      order_id: activeId, sender_id: user.id, sender_name: profile?.name || user.email, body, is_internal: false,
    });
    // realtime INSERT echoes it back into the thread
  }

  const fileRef = useRef(null);
  async function attach(file) {
    if (!file || wa || !user) return;
    const oid = activeId;
    const path = `${oid}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
    const { error } = await supabase.storage.from("order-files").upload(path, file);
    if (error) { notify && notify("Couldn't attach that file."); return; }
    await supabase.from("order_files").insert({ order_id: oid, uploaded_by: user.id, file_name: file.name, file_path: path, kind: "other", size_bytes: file.size });
    notify && notify("File attached to your order.");
  }

  // rendered rows with day dividers + tail logic
  const rows = [];
  let lastDay = null;
  thread.forEach((m, i) => {
    if (m.day !== lastDay) { rows.push({ type: "day", day: m.day, key: "d" + i }); lastDay = m.day; }
    const prev = thread[i - 1];
    const tail = !prev || prev.from !== m.from || prev.day !== m.day;
    rows.push({ type: "msg", m, tail, key: "m" + i });
  });

  const waHref = MM.waLink("Hi Meridian — I'd like to continue our conversation from my workspace.");

  return (
    <div className="mer-msg" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 18, height: "100%", minHeight: 0 }}>
      <style>{MCHAT_STYLE}</style>

      {/* list */}
      <div className={"mer-msg-list" + (mobileThread ? " mer-hide-mobile" : "")}
        style={{ display: "flex", flexDirection: "column", background: "var(--surface)",
          border: "1px solid var(--line)", borderRadius: "var(--r-lg)", overflow: "hidden", minHeight: 0 }}>
        <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid var(--line)" }}>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 500, margin: 0 }}>Messages</h2>
        </div>
        <div className="scroll" style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
          {convos.map((c) => {
            const on = c.id === activeId;
            return (
              <button key={c.id} onClick={() => openConvo(c.id)} style={{
                display: "flex", gap: 12, width: "100%", textAlign: "left", padding: "15px 16px",
                background: on ? "var(--surface-2)" : "transparent", border: "none",
                borderLeft: `3px solid ${on ? "var(--accent)" : "transparent"}`,
                borderBottom: "1px solid var(--line)" }}>
                <div style={{ position: "relative", flex: "0 0 auto" }}>
                  <Avatar initials={c.initials} size={40} tone={c.whatsapp ? "done" : "progress"} />
                  {c.whatsapp ? (
                    <span style={{ position: "absolute", right: -2, bottom: -2, width: 16, height: 16, borderRadius: 99,
                      background: "#25D366", border: "2px solid var(--surface)", display: "grid", placeItems: "center", color: "#fff" }}>
                      <Icon name="whatsapp" size={10} />
                    </span>
                  ) : (
                    <span style={{ position: "absolute", right: -1, bottom: -1, width: 11, height: 11, borderRadius: 99,
                      background: "var(--st-done)", border: "2px solid var(--surface)" }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{c.who}</span>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 11, color: c.unread ? "var(--accent)" : "var(--faint)", flex: "0 0 auto", fontWeight: c.unread ? 700 : 400 }}>{c.at}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 4px", overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.orderTitle}</div>
                  <div style={{ fontSize: 12.5, color: c.unread ? "var(--ink)" : "var(--muted)", fontWeight: c.unread ? 600 : 400,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.last}</div>
                </div>
                {c.unread > 0 && <span style={{ width: 18, height: 18, borderRadius: 99, background: "var(--accent)",
                  color: "#fff", fontSize: 11, fontWeight: 700, display: "grid", placeItems: "center", flex: "0 0 18px", marginTop: 2 }}>{c.unread}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* thread */}
      <div className={"mer-msg-thread" + (mobileThread ? "" : " mer-hide-mobile")}
        style={{ display: "flex", flexDirection: "column", border: "1px solid var(--line)",
          borderRadius: "var(--r-lg)", overflow: "hidden", minHeight: 0 }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px",
          borderBottom: `1px solid ${wa ? "#D9E5DC" : "var(--line)"}`,
          background: wa ? "#F6F8F4" : "var(--surface)", zIndex: 2 }}>
          <button className="mer-back-btn micon-btn" onClick={() => setMobileThread(false)} style={{ display: "none" }}><Icon name="left" size={20} /></button>
          <div style={{ position: "relative", flex: "0 0 auto" }}>
            <Avatar initials={active.initials} size={40} tone={wa ? "done" : "progress"} />
            {wa && (
              <span style={{ position: "absolute", right: -3, bottom: -3, width: 18, height: 18, borderRadius: 99,
                background: "#25D366", border: "2px solid #F6F8F4", display: "grid", placeItems: "center", color: "#fff" }}>
                <Icon name="whatsapp" size={11} />
              </span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{active.who}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6, overflow: "hidden", whiteSpace: "nowrap" }}>
              <span className="monline" style={{ flex: "0 0 auto" }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{wa ? "WhatsApp · online" : `Online · ${active.orderTitle}`}</span>
            </div>
          </div>
          {wa ? (
            <a href={waHref} target="_blank" rel="noopener noreferrer" title="Open this chat in WhatsApp"
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 99,
                background: "#25D366", color: "#fff", fontWeight: 600, fontSize: 13, textDecoration: "none", whiteSpace: "nowrap",
                boxShadow: "0 4px 12px -5px rgba(37,211,102,.85), inset 0 1px 0 rgba(255,255,255,.25)" }}>
              <Icon name="whatsapp" size={16} /> <span className="mer-wa-label">Continue on WhatsApp</span>
            </a>
          ) : (
            <>
              <button className="micon-btn" title="Call"><Icon name="phone" size={19} /></button>
              <button className="micon-btn" title="Order info" onClick={() => notify && notify(active.ref)}><Icon name="info" size={19} /></button>
            </>
          )}
        </div>

        {/* messages */}
        <div ref={scrollRef} className={"scroll " + (wa ? "mchat-wa" : "mchat-bg")} style={{ flex: 1, overflowY: "auto", padding: "10px 22px 18px", minHeight: 0,
          display: "flex", flexDirection: "column", gap: 4 }}>
          {wa ? (
            <div style={{ margin: "auto", textAlign: "center", maxWidth: 340, padding: 20 }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, background: "#25D366", color: "#fff", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
                <Icon name="whatsapp" size={32} />
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 500, color: "var(--ink)", marginBottom: 8 }}>Chat with the Meridian team</div>
              <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55, margin: "0 0 18px" }}>
                Reach us in-app or continue on WhatsApp — questions about an order, payment, or anything else.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                {onSupport && <Button variant="primary" icon="chat" onClick={onSupport}>Open support chat</Button>}
                <a href={waHref} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <Button variant="soft" icon="whatsapp">WhatsApp</Button>
                </a>
              </div>
            </div>
          ) : (
            <>
              {rows.length === 0 && (
                threadLoading
                  ? <div style={{ margin: "auto", color: "var(--faint)", fontFamily: "var(--mono)", fontSize: 12 }}>Loading messages…</div>
                  : <div style={{ margin: "auto", textAlign: "center", color: "var(--muted)", fontSize: 14, maxWidth: 280 }}>
                      No messages yet. Say hello to {active.who.split(" ")[0]}.
                    </div>
              )}
              {rows.map((r) => r.type === "day"
                ? <div className="mday" key={r.key}><span>{r.day}</span></div>
                : <div key={r.key} style={{ marginTop: r.tail ? 6 : 0 }}><Bubble m={r.m} tail={r.tail} /></div>)}
            </>
          )}
        </div>

        {/* quick replies + composer (order threads only) */}
        {!wa && (
          <>
            <div className="mquick" style={{ background: "var(--surface)" }}>
              {QUICK_REPLIES.map((q) => <button key={q} onClick={() => send(q)}>{q}</button>)}
            </div>
            <input ref={fileRef} type="file" style={{ display: "none" }}
              onChange={(e) => { attach(e.target.files && e.target.files[0]); e.target.value = ""; }} />
            <div style={{ padding: "10px 14px 14px", background: "var(--surface)",
              display: "flex", gap: 10, alignItems: "center" }}>
              <button className="micon-btn" title="Attach a file" aria-label="Attach a file" onClick={() => fileRef.current && fileRef.current.click()}><Icon name="paperclip" size={20} /></button>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "4px 6px 4px 16px",
                borderRadius: 999, border: "1px solid var(--line-2)", background: "var(--surface-2)" }}>
                <input value={draft} onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Write a message…"
                  style={{ flex: 1, padding: "8px 0", border: "none", background: "transparent",
                    fontFamily: "var(--sans)", fontSize: 14.5, outline: "none", color: "var(--ink)" }} />
                <button className="micon-btn" title="Emoji" style={{ width: 32, height: 32 }} onClick={() => setDraft((d) => d + " 🙂")}><Icon name="smile" size={19} /></button>
              </div>
              <button onClick={() => send()} aria-label={draft.trim() ? "Send message" : "Voice message"} style={{ width: 44, height: 44, borderRadius: 99, border: "none",
                background: "var(--accent)", color: "#fff", display: "grid", placeItems: "center", flex: "0 0 44px",
                boxShadow: "0 4px 12px -4px var(--accent)", transition: "transform .12s" }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.06)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}>
                <Icon name={draft.trim() ? "send" : "mic"} size={20} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Messages;
