/* ============================================================
   Expert — Assignment detail. Two-column receiving layout: the
   order (facts → brief → source files → submission) on the left,
   a sticky controls rail (pay/status/deadline/conversation) on the
   right. Bundles add a PartSwitcher; each part is briefed, submitted
   and QC-reviewed independently (per-part file scoping + status).
   Also serves the read-only invitation preview. ES module.
   ============================================================ */
import React from "react";
import { Icon } from "../workspace/kit/icons.jsx";
import { MM } from "../workspace/kit/model.js";
import { Avatar, Meta, Button, TypeBadge } from "../workspace/kit/components.jsx";
import { EM } from "./expert-model.js";
import { ExpChip, EXP_LABELS } from "./expert-mywork.jsx";
import { PartSwitcher } from "./expert-parts.jsx";
import { ChatMini } from "./expert-chat.jsx";
import { parseBrief } from "./parseBrief.js";

const { useState, useEffect, useRef } = React;

/* Card shell used across the detail page */
function Panel({ title, icon, accentEdge, children, pad = 22, right }) {
  return (
    <div style={{ background: "var(--surface)", border: `1px solid ${accentEdge || "var(--line)"}`, borderRadius: 18, overflow: "hidden" }}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "13px 18px", borderBottom: "1px solid var(--line)" }}>
          {icon && <Icon name={icon} size={15} style={{ color: "var(--ink-2)" }} />}
          <h3 style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em", margin: 0, color: "var(--ink-2)", fontSize: 11.5 }}>{title}</h3>
          <div style={{ flex: 1 }} />
          {right}
        </div>
      )}
      <div style={{ padding: pad }}>{children}</div>
    </div>
  );
}

function FactsStrip({ a }) {
  const dash = (v) => (v == null || v === "" || v === "—");
  const lengthVal = a.pages ? `${a.pages} pages${a.words ? ` · ~${a.words.toLocaleString()} words` : ""}` : (a.words ? `~${a.words.toLocaleString()} words` : null);
  const facts = [
    { k: "Discipline", v: a.discipline || a.program },
    { k: "Academic level", v: a.level_label },
    { k: "Scope", v: a.scope_label },
    { k: "Length", v: lengthVal },
    { k: "Citation style", v: a.citation },
    { k: "Format", v: a.format || "Word (.docx)" },
  ].map((f) => dash(f.v) ? { ...f, v: "Not specified", soft: true } : f);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1, background: "var(--line)", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden" }}>
      {facts.map((f) => (
        <div key={f.k} style={{ background: "var(--surface)", padding: "14px 16px" }}>
          <div style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".07em", fontSize: 9.5, color: "var(--muted)", marginBottom: 6 }}>{f.k}</div>
          <div style={{ fontSize: 14, fontWeight: f.soft ? 500 : 600, fontStyle: f.soft ? "italic" : "normal", color: f.soft ? "var(--muted)" : "var(--ink)", lineHeight: 1.3 }}>{f.v}</div>
        </div>
      ))}
    </div>
  );
}

/* Rubric band label → tone (Excellent=green … Poor=stone). parseBrief itself
   lives in ./parseBrief.js (pure + unit-tested). */
const RUBRIC_TONE = {
  Excellent: { color: "var(--st-done)", bg: "var(--st-done-bg)", edge: "var(--st-done-edge)" },
  Good: { color: "var(--st-progress)", bg: "var(--st-progress-bg)", edge: "var(--st-progress-edge)" },
  Fair: { color: "var(--st-action)", bg: "var(--st-action-bg)", edge: "var(--st-action-edge)" },
  Poor: { color: "var(--st-new)", bg: "var(--st-new-bg)", edge: "var(--st-new-edge)" },
  _default: { color: "var(--ink-2)", bg: "var(--surface-2)", edge: "var(--line)" },
};

function BriefBody({ raw, requirements }) {
  const blocks = parseBrief(raw, requirements);
  if (!blocks.length) return <div style={{ fontSize: 14, color: "var(--muted)", fontStyle: "italic" }}>No brief text provided. Check the attached files below.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {blocks.map((b, i) => {
        if (b.type === "p") return <p key={i} style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: "var(--ink-2)", fontFamily: "var(--sans)" }}>{b.text}</p>;
        if (b.type === "ul") return (
          <div key={i}>
            <div style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".07em", fontSize: 10, color: "var(--muted)", marginBottom: 10 }}>Required sections</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {b.items.map((it, j) => (
                <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--accent)", flex: "0 0 6px", marginTop: 8 }} />
                  <span style={{ fontSize: 14.5, color: "var(--ink)", lineHeight: 1.5 }}>{it}</span>
                </div>
              ))}
            </div>
          </div>
        );
        if (b.type === "checklist") return (
          <div key={i}>
            <div style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".07em", fontSize: 10, color: "var(--muted)", marginBottom: 12 }}>Key requirements</div>
            <Requirements items={b.items} />
          </div>
        );
        if (b.type === "rubric") return (
          <div key={i}>
            <div style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".07em", fontSize: 10, color: "var(--muted)", marginBottom: 12 }}>Grading rubric</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {b.rows.map((r, j) => {
                const tn = RUBRIC_TONE[r.label] || RUBRIC_TONE._default;
                return (
                  <div key={j} style={{ display: "flex", gap: 12, padding: "12px 14px", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 12, alignItems: "flex-start" }}>
                    <div style={{ flex: "0 0 92px" }}>
                      <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: tn.color, background: tn.bg, border: `1px solid ${tn.edge}`, padding: "3px 9px", borderRadius: 99, whiteSpace: "nowrap" }}>{r.label}</span>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--muted)", marginTop: 6, letterSpacing: ".02em" }}>{r.band}</div>
                    </div>
                    <div style={{ flex: 1, fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5 }}>{r.desc || <span style={{ color: "var(--faint)", fontStyle: "italic" }}>—</span>}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
        return null;
      })}
    </div>
  );
}

function Requirements({ items }) {
  if (!items || !items.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {items.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
          <span style={{ width: 20, height: 20, borderRadius: 6, background: "var(--accent-soft)", color: "var(--accent-deep)", display: "grid", placeItems: "center", flex: "0 0 20px", marginTop: 1, fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700 }}>{i + 1}</span>
          <span style={{ fontSize: 14.5, color: "var(--ink)", lineHeight: 1.5 }}>{r}</span>
        </div>
      ))}
    </div>
  );
}

function SourceFiles({ files, onPreview }) {
  const src = files.filter((f) => ["brief", "rubric"].includes(f.kind) || (f.uploaded_by && f.uploaded_by !== "me" && f.kind !== "final"));
  if (!src.length) return null;
  const label = { brief: "Brief", rubric: "Rubric", source: "Source" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {src.map((f) => (
        <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)" }}>
          <TypeBadge name={f.name} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{label[f.kind] || "File"}{f.size ? ` · ${f.size}` : ""}{f.at ? ` · ${f.at}` : ""}</div>
          </div>
          <Button size="sm" variant="ghost" icon="eye" onClick={() => onPreview && onPreview(f)}>Open</Button>
        </div>
      ))}
    </div>
  );
}

function ExpFileChip({ f, onRemove, onPreview, score }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface)" }}>
      <TypeBadge name={f.name} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>{f.size || ""}{f.at ? ` · ${f.at}` : ""}{score != null && f.score != null ? ` · score ${f.score}%` : ""}</div>
      </div>
      <button onClick={() => onPreview && onPreview(f)} title="Preview" style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "transparent", color: "var(--ink-2)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icon name="eye" size={15} /></button>
      {onRemove && <button onClick={() => onRemove(f)} title="Remove" style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "transparent", color: "var(--faint)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icon name="x" size={14} /></button>}
    </div>
  );
}

function PackageBuilder({ unitStatus, files, addFile, removeFile, onPreview, onSubmit, busy }) {
  const refs = useRef({});
  const finalReady = EM.hasFinal(files, "me");
  const version = EM.nextVersion(files);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {unitStatus === "revision" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: "var(--st-revision-bg)", border: "1px solid var(--st-revision-edge)", borderRadius: 11, fontSize: 13, color: "var(--ink-2)" }}>
          <Icon name="refresh" size={15} style={{ color: "var(--st-revision)", flex: "0 0 auto" }} />{` Revision requested — update your files and resubmit as ${version}.`}
        </div>
      )}
      {EM.PKG_SLOTS.map((slot) => {
        const slotFiles = files.filter((f) => f.kind === slot.kind && f.uploaded_by === "me");
        return (
          <div key={slot.kind} style={{ border: `1px solid ${slot.required && !slotFiles.length ? "var(--st-action-edge)" : "var(--line)"}`, borderRadius: 14, padding: 16, background: "var(--surface)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: slotFiles.length ? 12 : 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{slot.title}</span>
              {slot.required && <span style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em", fontSize: 9.5, color: slotFiles.length ? "var(--st-done)" : "var(--st-action)", background: slotFiles.length ? "var(--st-done-bg)" : "var(--st-action-bg)", padding: "2px 7px", borderRadius: 99 }}>{slotFiles.length ? "ready" : "required"}</span>}
              <div style={{ flex: 1 }} />
            </div>
            {slotFiles.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {slotFiles.map((f) => <ExpFileChip key={f.id} f={f} score={slot.score} onRemove={removeFile} onPreview={onPreview} />)}
              </div>
            )}
            <input ref={(el) => refs.current[slot.kind] = el} type="file" multiple style={{ display: "none" }}
              accept=".pdf,.docx,.doc,.txt,.ppt,.pptx,.xls,.xlsx,.png,.jpg"
              onChange={(e) => { addFile(slot, e.target.files, refs.current[slot.kind + "_s"] ? refs.current[slot.kind + "_s"].value : undefined); e.target.value = ""; }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => refs.current[slot.kind] && refs.current[slot.kind].click()} disabled={busy}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 10, border: "1.5px dashed var(--line-2)", background: "var(--surface-2)", color: "var(--ink)", fontSize: 13.5, fontWeight: 600, cursor: busy ? "wait" : "pointer" }}>
                <Icon name="upload" size={16} /> Add file{slot.kind === "final" ? "" : "(s)"}
              </button>
              {slot.score && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--muted)" }}>
                  <span>Score</span>
                  <input ref={(el) => refs.current[slot.kind + "_s"] = el} type="number" min={0} max={100} defaultValue={0}
                    style={{ width: 60, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--surface)", fontSize: 13, color: "var(--ink)", outline: "none" }} />
                  <span>%</span>
                </div>
              )}
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{slot.hint}</span>
            </div>
          </div>
        );
      })}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: busy ? "var(--accent-deep)" : finalReady ? "var(--st-done)" : "var(--st-action)", fontWeight: 600 }}>
            {busy
              ? <><span style={{ width: 15, height: 15, borderRadius: 99, border: "2px solid var(--accent-soft)", borderTopColor: "var(--accent)", display: "inline-block", animation: "spin .7s linear infinite" }} /> Submitting {version} for QC review…</>
              : <><Icon name={finalReady ? "check" : "alert"} size={16} /> {finalReady ? `Ready to submit as ${version}` : "Add a Final document to submit"}</>}
          </div>
          <div style={{ flex: 1 }} />
          <Button variant="primary" icon="upload" disabled={!finalReady || busy} onClick={onSubmit}>{busy ? "Submitting…" : "Submit for review"}</Button>
        </div>
      </div>
    </div>
  );
}

function PackageReadOnly({ files, onPreview }) {
  const subs = files.filter((f) => ["final", "ai_report", "plag_report"].includes(f.kind));
  const labels = { final: "Final document", ai_report: "AI-detection report", plag_report: "Originality report" };
  if (!subs.length) return <div style={{ color: "var(--muted)", fontSize: 13.5 }}>No submission files.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {subs.map((f) => (
        <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", border: "1px solid var(--line)", borderRadius: 11, background: "var(--surface)" }}>
          <TypeBadge name={f.name} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{f.name}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{labels[f.kind]}{f.version ? ` · ${f.version}` : ""}{f.score != null ? ` · score ${f.score}%` : ""}</div>
          </div>
          <Button size="sm" variant="ghost" icon="eye" onClick={() => onPreview && onPreview(f)}>Preview</Button>
        </div>
      ))}
    </div>
  );
}

export function AssignmentDetail({ a, files, msgs, narrow, onBack, onStart, onAddFile, onRemoveFile, onSubmit, onSend, onPreview, busy, preview, onRespond }) {
  const isBundle = Array.isArray(a.parts) && a.parts.length > 0;
  const defaultPartId = (o) => {
    if (!(Array.isArray(o.parts) && o.parts.length)) return null;
    const actionable = o.parts.find((p) => !["delivered", "closed"].includes(p.status));
    return (actionable || o.parts[0]).id;
  };
  const [activePart, setActivePart] = useState(defaultPartId(a));
  useEffect(() => { setActivePart(defaultPartId(a)); }, [a.id]);

  const part = isBundle ? a.parts.find((p) => p.id === activePart) || a.parts[0] : null;
  const unit = part || a;
  const unitStatus = unit.status;
  const tn = MM.tone(unitStatus);
  const na = EM.nextAction(unit);
  const code = a.client_code || "Student";
  // target descriptor for the wired handlers (a part vs the whole order)
  const target = isBundle ? { orderId: a.id, partId: unit.id } : { orderId: a.id, partId: null };
  // per-part file scoping: a bundle's submission area sees only this part's files
  const submissionFiles = isBundle ? files.filter((f) => f.part_id === activePart) : files.filter((f) => !f.part_id);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", animation: "rise .3s ease both" }}>
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "transparent", border: "none", color: "var(--ink-2)", fontSize: 14, fontWeight: 500, padding: "4px 0", marginBottom: 16, cursor: "pointer", fontFamily: "var(--sans)", whiteSpace: "nowrap" }}>
        <Icon name="left" size={17} /> Back to my work
      </button>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em", fontSize: 12, color: "var(--faint)", whiteSpace: "nowrap" }}>{a.ref}</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-2)", whiteSpace: "nowrap" }}>{a.program}</span>
            {a.client_code && <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--faint)" }}>· {a.client_code}</span>}
            {isBundle && <span style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".07em", fontSize: 10, color: "var(--accent-deep)", background: "var(--accent-soft)", padding: "3px 9px", borderRadius: 99 }}>{a.parts.length}-part bundle</span>}
            {preview
              ? <span style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".07em", fontSize: 10, color: "var(--st-action)", background: "var(--st-action-bg)", border: "1px solid var(--st-action-edge)", padding: "3px 9px 3px 7px", borderRadius: 99, display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="mail" size={12} /> Invitation · preview</span>
              : <ExpChip status={a.status} pulse={["writing", "in_review", "revision"].includes(a.status)} />}
          </div>
          <h1 style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.14, color: "var(--ink)" }}>{a.title}</h1>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "minmax(0, 1fr) 340px", gap: narrow ? 20 : 24, alignItems: "start" }}>
        {/* LEFT — the order */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0, order: narrow ? 2 : 1 }}>
          <FactsStrip a={a} />

          {isBundle && (
            <Panel title="Deliverables" icon="briefcase" right={<span style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".07em", fontSize: 9.5, color: "var(--accent-deep)", background: "var(--accent-soft)", padding: "3px 9px", borderRadius: 99 }}>reviewed separately</span>}>
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55, marginBottom: 14 }}>
                Each part is briefed, submitted and QC-reviewed on its own. Select a part to load its brief and submission below.
              </div>
              <PartSwitcher parts={a.parts} activeId={activePart} onPick={setActivePart} />
            </Panel>
          )}

          <Panel title={isBundle ? `Brief — ${part.title}` : "The brief"} icon="pencil">
            <BriefBody raw={isBundle ? part.notes : a.notes} requirements={(part || a).requirements} />
            {isBundle && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)", display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
                <Meta mono>{part.pages} pages</Meta><Meta mono>{part.citation}</Meta><Meta mono>Due {part.due_date}</Meta>
                {(() => { const r = !["delivered", "closed"].includes(part.status) && EM.dueRel(part); return r ? <span style={{ fontSize: 11.5, fontWeight: 700, color: r.urgent ? "var(--st-action)" : "var(--muted)" }}>{r.text}</span> : null; })()}
              </div>
            )}
          </Panel>

          {files.filter((f) => ["brief", "rubric"].includes(f.kind)).length > 0 && (
            <Panel title="From the student" icon="download">
              <SourceFiles files={files} onPreview={onPreview} />
            </Panel>
          )}

          {!preview && (
            <Panel title="Your submission" icon="upload"
              accentEdge={unitStatus === "in_review" ? "var(--st-action-edge)" : ["delivered", "closed"].includes(unitStatus) ? "var(--st-done-edge)" : "var(--line)"}>
              {(unitStatus === "writing" || unitStatus === "revision") && (
                <PackageBuilder unitStatus={unitStatus} files={submissionFiles}
                  addFile={(slot, fl, score) => onAddFile(slot, fl, target, score)} removeFile={onRemoveFile}
                  onPreview={onPreview} onSubmit={() => onSubmit(target)} busy={busy} />
              )}
              {unitStatus === "assigned" && (
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "6px 2px" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: "var(--surface-2)", border: "1px solid var(--line)", display: "grid", placeItems: "center", color: "var(--accent)", flex: "0 0 42px" }}><Icon name="pencil" size={20} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>Start work to build your submission</div>
                    <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 2 }}>The package builder unlocks once you begin{isBundle ? " this part" : ""}.</div>
                  </div>
                  <Button variant="primary" icon="pencil" disabled={busy} onClick={() => onStart(target)}>Start work</Button>
                </div>
              )}
              {unitStatus === "in_review" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <Icon name="shield" size={18} style={{ color: "var(--st-action)" }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Under QC review — submitted, locked for edits.</span>
                  </div>
                  <PackageReadOnly files={submissionFiles} onPreview={onPreview} />
                </div>
              )}
              {["delivered", "closed"].includes(unitStatus) && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <Icon name="check" size={18} style={{ color: "var(--st-done)" }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Delivered to the student. Nice work.</span>
                  </div>
                  <PackageReadOnly files={submissionFiles} onPreview={onPreview} />
                </div>
              )}
            </Panel>
          )}
        </div>

        {/* RIGHT — sticky controls rail */}
        <div style={{ position: narrow ? "static" : "sticky", top: 16, display: "flex", flexDirection: "column", gap: 16, order: narrow ? 1 : 2 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 18, padding: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em", fontSize: 9.5, color: "var(--muted)" }}>{preview ? "You'll earn" : isBundle ? "This part pays" : "You earn"}</div>
              {(() => {
                const info = EM.payInfo(isBundle && !preview ? unit : a);
                return info.known
                  ? <div style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 600, color: "var(--accent-deep)", lineHeight: 1 }}>{EM.money(info.amount)}</div>
                  : <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <span style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 600, color: "var(--ink-2)", lineHeight: 1 }}>Set by admin</span>
                    </div>;
              })()}
              {!EM.payInfo(isBundle && !preview ? unit : a).known && (
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 7, lineHeight: 1.4 }}>Final fee is confirmed by admin before you start.</div>
              )}
              {isBundle && EM.payInfo(a).known && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9, fontSize: 11.5, color: "var(--muted)" }}>
                  <Icon name="briefcase" size={13} style={{ color: "var(--faint)" }} />
                  <span>Bundle total <span style={{ fontWeight: 700, color: "var(--ink-2)" }}>{EM.money(EM.payFor(a))}</span> · {a.parts.length} parts</span>
                </div>
              )}
            </div>

            {preview ? (
              <div>
                <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 16 }}>
                  You've been invited to this order. Review the brief, then confirm to add it to your work or decline.
                </div>
                <Button full variant="primary" icon="check" onClick={() => onRespond(a, true)}>Confirm &amp; accept</Button>
                <div style={{ height: 8 }} />
                <Button full variant="ghost" icon="x" onClick={() => onRespond(a, false)}>Decline</Button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", borderRadius: 11, background: tn.bg, border: `1px solid ${tn.edge}`, marginBottom: 14 }}>
                  <Icon name={tn.icon} size={16} style={{ color: tn.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: tn.color }}>{EXP_LABELS[unitStatus] || unitStatus}{isBundle ? ` · ${part.title.split(" — ")[0]}` : ""}</span>
                </div>
                <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: na ? 16 : 0 }}>{EM.statusSentence(unit)}</div>
                {na && na.to === "writing" && <Button full variant="primary" icon="pencil" disabled={busy} onClick={() => onStart(target)}>Start work{isBundle ? " on this part" : ""}</Button>}
                {na && na.to === "in_review" && (
                  <div style={{ fontSize: 12.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 7 }}>
                    <Icon name="info" size={14} /> Submit from the package builder on the left.
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 18, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: "var(--surface-2)", display: "grid", placeItems: "center", color: "var(--accent)", flex: "0 0 40px" }}><Icon name="calendar" size={20} /></div>
            <div>
              <div style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".07em", fontSize: 9.5, color: "var(--muted)" }}>Deadline</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{unit.due_date}</div>
              {(() => {
                const done = ["delivered", "closed"].includes(unitStatus);
                const r = done ? null : EM.dueRel(unit);
                const tier = a.deadline_tier || "";
                if (r) return <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2, color: r.urgent ? "var(--st-action)" : "var(--muted)" }}>{r.text[0].toUpperCase() + r.text.slice(1)}{tier ? ` · ${tier}` : ""}</div>;
                return tier ? <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>{tier}</div> : null;
              })()}
            </div>
          </div>

          {!preview && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 2px rgba(40,33,22,.04),0 14px 36px -20px rgba(40,33,22,.4)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "14px 16px", background: "linear-gradient(180deg, var(--accent-soft) 0%, var(--surface) 100%)", borderBottom: "1px solid var(--line)" }}>
                <div style={{ position: "relative", flex: "0 0 auto" }}>
                  <Avatar initials={code.slice(-2)} size={38} tone="accent" />
                  <span style={{ position: "absolute", right: -1, bottom: -1, width: 11, height: 11, borderRadius: 99, background: "var(--st-done)", border: "2px solid var(--surface)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{code}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}><Icon name="shield" size={11} style={{ color: "var(--muted)" }} /> Student · identity hidden</div>
                </div>
                <span style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".07em", fontSize: 9, color: "var(--accent-deep)", background: "var(--surface)", border: "1px solid var(--accent-soft)", padding: "4px 9px", borderRadius: 99, display: "inline-flex", alignItems: "center", gap: 5, flex: "0 0 auto" }}><Icon name="chat" size={11} /> Chat</span>
              </div>
              <div style={{ padding: 16 }}>
                <ChatMini msgs={msgs} onSend={onSend} code={code} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AssignmentDetail;
