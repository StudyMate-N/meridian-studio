/* ============================================================
   Expert — refined Conversation module (right-rail chat).
   Student-only thread, anonymised. Wired to order_messages by the
   detail page (onSend inserts; realtime appends). ES module.
   ============================================================ */
import React from "react";
import { Icon } from "../workspace/kit/icons.jsx";
import { Avatar } from "../workspace/kit/components.jsx";

function QuickReply({ label, onClick }) {
  const [h, setH] = React.useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 99, border: `1px solid ${h ? "var(--accent)" : "var(--line-2)"}`, background: h ? "var(--accent-soft)" : "var(--surface)", color: h ? "var(--accent-deep)" : "var(--ink-2)", fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "var(--sans)", transition: "all .13s", whiteSpace: "nowrap" }}>
      {h && <Icon name="send" size={11} />}{label}
    </button>
  );
}

export function ChatMini({ msgs, onSend, code }) {
  const [v, setV] = React.useState("");
  const [focus, setFocus] = React.useState(false);
  const streamRef = React.useRef(null);
  const quickReplies = ["Got it, thanks", "Could you clarify the scope?", "On track for the deadline"];
  React.useEffect(() => { const el = streamRef.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs.length]);
  const submit = (text) => { const t = (text != null ? text : v).trim(); if (!t) return; onSend(t); setV(""); };
  const hasText = v.trim().length > 0;
  return (
    <div>
      <div ref={streamRef} className="scroll" style={{ maxHeight: 236, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, padding: "14px 14px 16px", background: "var(--surface-2)", borderRadius: 14, border: "1px solid var(--line)", marginBottom: 14 }}>
        {msgs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 12px" }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "var(--surface)", border: "1px solid var(--line)", display: "grid", placeItems: "center", margin: "0 auto 12px", color: "var(--faint)" }}><Icon name="chat" size={20} /></div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>No messages yet</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>Send an update or ask the student a question.</div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
              <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
              <span style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".09em", fontSize: 9, color: "var(--faint)" }}>Today</span>
              <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
            </div>
            {msgs.map((m) => {
              const mine = m.from === "you";
              return (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 7, maxWidth: "88%", flexDirection: mine ? "row-reverse" : "row" }}>
                    {!mine && <Avatar initials={(code || "ST").slice(-2)} size={22} tone="soft" />}
                    <div style={{ background: mine ? "var(--accent)" : "var(--surface)", color: mine ? "var(--on-accent)" : "var(--ink)", padding: "9px 13px", borderRadius: mine ? "15px 15px 5px 15px" : "15px 15px 15px 5px", fontSize: 13.5, lineHeight: 1.5, border: mine ? "none" : "1px solid var(--line)", boxShadow: mine ? "0 1px 1px rgba(0,0,0,.14),inset 0 1px 0 rgba(255,255,255,.16)" : "0 1px 2px rgba(40,33,22,.05)" }}>
                      {m.body}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, margin: mine ? "5px 3px 0 0" : "5px 0 0 29px", fontSize: 10, color: "var(--faint)" }}>
                    {m.time}{mine && <Icon name="check" size={12} stroke={2.6} style={{ color: "var(--accent)" }} />}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <div style={{ marginBottom: 11 }}>
        <div style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em", fontSize: 9.5, color: "var(--muted)", marginBottom: 8 }}>Quick replies</div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {quickReplies.map((q) => <QuickReply key={q} label={q} onClick={() => submit(q)} />)}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 5px 5px 4px", borderRadius: 999, border: `1.5px solid ${focus ? "var(--accent)" : "var(--line-2)"}`, background: "var(--surface)", transition: "border-color .15s,box-shadow .15s", boxShadow: focus ? "0 0 0 3px var(--accent-soft)" : "none" }}>
        <input value={v} onChange={(e) => setV(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }} placeholder="Reply to the student…"
          style={{ flex: 1, padding: "9px 4px 9px 14px", border: "none", background: "transparent", fontSize: 14, color: "var(--ink)", outline: "none", fontFamily: "var(--sans)" }} />
        <button onClick={() => submit()} disabled={!hasText} title="Send"
          style={{ width: 38, height: 38, borderRadius: 99, border: "none", background: hasText ? "var(--accent)" : "var(--surface-2)", color: hasText ? "var(--on-accent)" : "var(--faint)", display: "grid", placeItems: "center", cursor: hasText ? "pointer" : "default", flex: "0 0 38px", transition: "all .15s", boxShadow: hasText ? "0 1px 1px rgba(0,0,0,.14),inset 0 1px 0 rgba(255,255,255,.18)" : "none" }}>
          <Icon name="send" size={17} />
        </button>
      </div>
    </div>
  );
}

export default ChatMini;
