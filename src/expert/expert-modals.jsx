/* ============================================================
   Expert workspace overlays — in-app File preview + Invitation
   brief modals. Match the design prototype (Expert Workspace.dc.html
   ~796-839): a centered modal-card with a header (badge + title +
   close ×), a scrollable body, and a footer action row. Dismiss on
   backdrop click + Esc. ES module. → FilePreviewModal, BriefModal.
   ============================================================ */
import React from "react";
import { Icon } from "../workspace/kit/icons.jsx";
import { Button } from "../workspace/kit/components.jsx";
import { EM } from "./expert-model.js";

const { useEffect } = React;

// Shared modal shell — backdrop + centered card, Esc + backdrop dismiss,
// header (badge/title/sub + close) and an optional footer action row.
function ModalShell({ onClose, badge, badgeTone = "var(--accent-deep)", badgeBg = "var(--accent-soft)", title, sub, children, footer, width = 560 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(24,33,31,.5)", zIndex: 3000, display: "grid", placeItems: "center", padding: 24, animation: "fadeIn .15s ease" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width, maxWidth: "100%", maxHeight: "86vh", display: "flex", flexDirection: "column", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 20, overflow: "hidden", boxShadow: "var(--shadow-pop)", animation: "rise .18s ease both" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "18px 20px", borderBottom: "1px solid var(--line)" }}>
          {badge && (
            <span style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em", fontSize: 10, color: badgeTone, background: badgeBg, padding: "4px 9px", borderRadius: 99, display: "inline-flex", alignItems: "center", gap: 5, flex: "0 0 auto", marginTop: 2 }}>
              {badge}
            </span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, color: "var(--ink)", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
            {sub && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{sub}</div>}
          </div>
          <button onClick={onClose} aria-label="Close"
            style={{ width: 30, height: 30, borderRadius: 9, border: "none", background: "var(--surface-2)", color: "var(--ink-2)", display: "grid", placeItems: "center", cursor: "pointer", flex: "0 0 30px" }}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="mer-scroll scroll" style={{ padding: 20, overflowY: "auto", flex: 1, minHeight: 0 }}>{children}</div>
        {footer && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderTop: "1px solid var(--line)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// File extension → coarse kind for choosing the embed element.
function fileExt(name) { const m = /\.([a-z0-9]+)$/i.exec(name || ""); return m ? m[1].toLowerCase() : ""; }
const IMG_EXT = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"];

/* In-app file preview — embeds the real signed URL (iframe/object for PDFs,
   <img> for images), framed inside the prototype modal. Footer = Download +
   Close. (Replaces the old window.open new-tab behavior.) */
export function FilePreviewModal({ file, url, loading, onClose }) {
  const ext = fileExt(file && file.name);
  const isImg = IMG_EXT.includes(ext);
  const isPdf = ext === "pdf";
  const frame = { width: "100%", minHeight: 420, height: "58vh", border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface-2)", display: "block" };

  return (
    <ModalShell
      onClose={onClose}
      width={720}
      badge={<><Icon name="files" size={12} /> File</>}
      title={(file && file.name) || "Preview"}
      sub={file && [file.size, file.version].filter(Boolean).join(" · ") || undefined}
      footer={
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--muted)" }}>
            <Icon name="eye" size={14} /> Previewing the live file.
          </div>
          <div style={{ flex: 1 }} />
          <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
          {url && <a href={url} download={file && file.name} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            <Button size="sm" variant="primary" icon="download">Download</Button>
          </a>}
        </>
      }
    >
      {loading || !url ? (
        <div style={{ ...frame, display: "grid", placeItems: "center", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 12 }}>
          {loading ? "Loading preview…" : "Preview unavailable — use Download."}
        </div>
      ) : isImg ? (
        <div style={{ ...frame, display: "grid", placeItems: "center", overflow: "auto", padding: 12 }}>
          <img src={url} alt={(file && file.name) || "preview"} style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8, boxShadow: "var(--shadow-card)" }} />
        </div>
      ) : isPdf ? (
        <object data={url} type="application/pdf" style={frame}>
          <iframe src={url} title={(file && file.name) || "preview"} style={frame} />
        </object>
      ) : (
        <iframe src={url} title={(file && file.name) || "preview"} style={frame} />
      )}
    </ModalShell>
  );
}

/* Invitation brief — a lightweight popover (not a full-page route): fact-pill
   row (pages · citation · Due · pay), the order title/scope/level header, the
   brief paragraphs, and a numbered "Key requirements" list. Footer wires to the
   existing respond() handler (Accept / Decline) + Close. Match design ~814-829. */
export function BriefModal({ o, onRespond, onClose, busy }) {
  if (!o) return null;
  const facts = [];
  if (o.pages) facts.push(`${o.pages} pages`);
  if (o.citation) facts.push(o.citation);
  const rel = EM.dueRel(o);
  facts.push(`Due ${o.due_date}${rel ? ` · ${rel.text}` : ""}`);
  facts.push(`Pay ${EM.payLabel(o)}`);

  const paras = String(o.notes || "").split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  const reqs = Array.isArray(o.requirements) ? o.requirements : [];
  const subBits = [o.scope_label, o.level_label, o.program].filter(Boolean);

  return (
    <ModalShell
      onClose={onClose}
      badge={<><Icon name="mail" size={12} /> Invitation</>}
      badgeTone="var(--st-action)"
      badgeBg="var(--st-action-bg)"
      title={o.title}
      sub={subBits.join(" · ") || undefined}
      footer={
        <>
          <div style={{ flex: 1 }} />
          <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
          <Button size="sm" variant="ghost" icon="x" onClick={() => onRespond(o, false)} disabled={busy}>Decline</Button>
          <Button size="sm" variant="primary" icon="check" onClick={() => onRespond(o, true)} disabled={busy}>Accept</Button>
        </>
      }
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {facts.map((f, i) => (
          <span key={i} style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)", background: "var(--surface-2)", border: "1px solid var(--line)", padding: "4px 10px", borderRadius: 99 }}>{f}</span>
        ))}
      </div>

      {paras.length > 0 && paras.map((p, i) => (
        <p key={i} style={{ margin: "0 0 14px", fontSize: 14.5, lineHeight: 1.62, color: "var(--ink-2)" }}>{p}</p>
      ))}

      {reqs.length > 0 && (
        <>
          <div style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".07em", fontSize: 10, color: "var(--muted)", margin: "6px 0 11px" }}>Key requirements</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {reqs.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ width: 19, height: 19, borderRadius: 6, background: "var(--accent-soft)", color: "var(--accent-deep)", display: "grid", placeItems: "center", flex: "0 0 19px", marginTop: 1, fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700 }}>{i + 1}</span>
                <span style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.5 }}>{r}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {paras.length === 0 && reqs.length === 0 && (
        <p style={{ margin: 0, fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>No brief details were provided with this invitation. Accept to open the full workspace, or decline.</p>
      )}
    </ModalShell>
  );
}
