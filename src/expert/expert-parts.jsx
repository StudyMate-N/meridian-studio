/* ============================================================
   Expert — PartSwitcher for bundled / multi-part orders.
   Each part is briefed, submitted and QC-reviewed independently;
   per-part pay is pages × $2.32. ES module.
   ============================================================ */
import React from "react";
import { Icon } from "../workspace/kit/icons.jsx";
import { MM } from "../workspace/kit/model.js";
import { EM } from "./expert-model.js";
import { ExpChip, EXP_PCT } from "./expert-mywork.jsx";

export function PartSwitcher({ parts, activeId, onPick }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {parts.map((p, i) => {
        const active = p.id === activeId;
        const tn = MM.tone(p.status);
        const done = ["delivered", "closed"].includes(p.status);
        return (
          <button key={p.id} onClick={() => onPick(p.id)}
            style={{ position: "relative", display: "flex", alignItems: "stretch", gap: 13, width: "100%", textAlign: "left", padding: "13px 15px 13px 14px", borderRadius: 14, cursor: "pointer", overflow: "hidden",
              border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`, background: active ? "var(--accent-soft)" : "var(--surface)", fontFamily: "var(--sans)",
              boxShadow: active ? "0 1px 2px rgba(40,33,22,.05),0 8px 22px -14px rgba(15,126,132,.4)" : "none", transition: "all .15s" }}>
            {active && <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "var(--accent)" }} />}
            <span style={{ width: 26, height: 26, borderRadius: 8, background: active ? "var(--accent)" : "var(--surface-2)", color: active ? "var(--on-accent)" : "var(--muted)", display: "grid", placeItems: "center", flex: "0 0 26px", fontFamily: "var(--mono)", fontWeight: 700, fontSize: 12, marginTop: 1 }}>{done ? <Icon name="check" size={14} stroke={2.6} /> : i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{p.title.replace(/^Part \d+ — /, "")}</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 14.5, fontWeight: 600, color: "var(--accent-deep)", flex: "0 0 auto" }}>{EM.money(EM.payFor(p))}</div>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", margin: "3px 0 8px" }}>{p.pages} pages · {p.citation} · due {p.due_date}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 99, background: "var(--line)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: (EXP_PCT[p.status] || 0) + "%", borderRadius: 99, background: done ? "var(--st-done)" : tn.color, transition: "width .4s ease" }} />
                </div>
                <ExpChip status={p.status} />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default PartSwitcher;
