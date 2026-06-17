/* ============================================================
   Expert — loading / empty / error states for My Work. ES module.
   Scoped to .mer-root.exp-root tokens; shimmer/keyframes in
   expert-theme.css.
   ============================================================ */
import React from "react";
import { Icon } from "../workspace/kit/icons.jsx";
import { Button } from "../workspace/kit/components.jsx";

function Sk({ w = "100%", h = 14, r = 8, style }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,#ECE5D6 25%,#F6F1E5 37%,#ECE5D6 63%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s ease-in-out infinite", ...style }} />;
}

export function WorkSkeleton() {
  const cardSk = (
    <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 20, overflow: "hidden" }}>
      <div style={{ width: 5, flex: "0 0 5px", background: "var(--line-2)" }} />
      <div style={{ flex: 1, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <Sk w={64} h={11} /><Sk w={90} h={11} /><div style={{ flex: 1 }} /><Sk w={104} h={24} r={999} />
        </div>
        <Sk w="76%" h={22} style={{ marginBottom: 14 }} />
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}><Sk w={70} h={11} /><Sk w={90} h={11} /><Sk w={56} h={11} /></div>
        <Sk h={5} r={99} style={{ marginBottom: 18 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
          <Sk w={120} h={12} /><div style={{ flex: 1 }} /><Sk w={84} h={30} r={999} />
        </div>
      </div>
    </div>
  );
  return (
    <div>
      <div style={{ marginBottom: 26 }}>
        <Sk w={360} h={42} r={10} style={{ marginBottom: 14 }} /><Sk w={280} h={15} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 32 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 13, padding: "16px 18px", borderTop: "3px solid var(--line-2)" }}>
            <Sk w={70} h={9} style={{ marginBottom: 12 }} /><Sk w={44} h={24} />
          </div>
        ))}
      </div>
      <Sk w={180} h={12} style={{ marginBottom: 16 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{cardSk}{cardSk}</div>
    </div>
  );
}

function ReceiveMark() {
  return (
    <div style={{ position: "relative", width: 108, height: 108, flex: "0 0 108px" }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: 99, border: "1px solid var(--line-2)" }} />
      <span style={{ position: "absolute", inset: 14, borderRadius: 99, border: "1px solid var(--line)", background: "var(--surface)" }} />
      <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <span style={{ width: 54, height: 54, borderRadius: 16, background: "var(--accent-soft)", display: "grid", placeItems: "center", color: "var(--accent-deep)" }}>
          <Icon name="inbox" size={26} stroke={1.6} />
        </span>
      </span>
    </div>
  );
}

export function EmptyWork({ writer, accepting, setAccepting }) {
  const first = (writer.name || "there").replace(/^Dr\.?\s+/i, "").split(" ")[0];
  const steps = [
    { icon: "shield", t: "Admin matches you", d: "Our team routes orders to experts by discipline and availability." },
    { icon: "mail", t: "You're notified", d: "A direct assignment or an invitation to confirm arrives by email." },
    { icon: "pencil", t: "You fulfil it here", d: "The brief, files and submission package all live on the order page." },
  ];
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", paddingTop: 8, animation: "rise .3s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 26, flexWrap: "wrap" }}>
        <ReceiveMark />
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(26px,3.4vw,34px)", fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 10px", lineHeight: 1.1 }}>
            You're all caught up, <span style={{ fontStyle: "italic", color: "var(--accent)" }}>{first}.</span>
          </h1>
          <p style={{ fontSize: 15, color: "var(--ink-2)", margin: 0, lineHeight: 1.6 }}>
            No assignments on your plate right now. Work arrives when admin assigns or invites you — there's nothing to chase.
          </p>
        </div>
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 18, padding: "8px 22px" }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 15, padding: "16px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, background: "var(--surface-2)", border: "1px solid var(--line)", display: "grid", placeItems: "center", color: "var(--accent)", flex: "0 0 38px" }}><Icon name={s.icon} size={18} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", marginBottom: 3 }}>{s.t}</div>
              <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55 }}>{s.d}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18, padding: "16px 20px", borderRadius: 16, border: `1px solid ${accepting ? "var(--st-done-edge)" : "var(--st-action-edge)"}`, background: accepting ? "var(--st-done-bg)" : "var(--st-action-bg)" }}>
        <Icon name={accepting ? "check" : "alert"} size={20} style={{ color: accepting ? "var(--st-done)" : "var(--st-action)", flex: "0 0 auto" }} />
        <div style={{ flex: 1, fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
          {accepting
            ? <><strong style={{ color: "var(--ink)" }}>You're available.</strong> Admin can assign or invite you to new work.</>
            : <><strong style={{ color: "var(--ink)" }}>You're at capacity.</strong> You won't receive new work until you turn availability back on.</>}
        </div>
        {!accepting && <Button size="sm" variant="primary" icon="power" onClick={() => setAccepting(true)}>Go available</Button>}
      </div>
    </div>
  );
}

export function LoadError({ onRetry, onSupport }) {
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", paddingTop: 40, textAlign: "center", animation: "rise .3s ease both" }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--st-action-bg)", border: "1px solid var(--st-action-edge)", display: "grid", placeItems: "center", color: "var(--st-action)", margin: "0 auto 20px" }}>
        <Icon name="wifiOff" size={30} stroke={1.7} />
      </div>
      <h1 style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 10px" }}>We couldn't load your work</h1>
      <p style={{ fontSize: 14.5, color: "var(--ink-2)", margin: "0 0 24px", lineHeight: 1.6 }}>
        Something went wrong reaching the server. Your assignments and files are safe — this is only a display problem.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <Button variant="primary" icon="refresh" onClick={onRetry}>Try again</Button>
        <Button variant="ghost" icon="chat" onClick={onSupport}>Contact support</Button>
      </div>
    </div>
  );
}
