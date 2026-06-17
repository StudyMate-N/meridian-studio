/* ============================================================
   Expert — My Work (greeting, stat cards, invitations, grouped
   assignments). Revision is first-class: own stat card, greeting
   clause, and leading group. Experts never claim/browse — work
   arrives by assignment or invitation only. ES module.
   ============================================================ */
import React from "react";
import { Icon } from "../workspace/kit/icons.jsx";
import { MM } from "../workspace/kit/model.js";
import { Meta, SectionLabel, Button, StatCard as DashStat, DashStatRow, DashWidgets, DashWidget } from "../workspace/kit/components.jsx";
import { EM } from "./expert-model.js";

// Single source of truth — the expert-lens labels live in the shared kit
// (MM.LABELS.expert) so they can't drift from the other surfaces.
export const EXP_LABELS = MM.LABELS.expert;
export const EXP_PCT = { assigned: 22, writing: 52, revision: 58, in_review: 84, delivered: 100, closed: 100 };

export function ExpChip({ status, pulse }) {
  const tn = MM.tone(status);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px 4px 8px", borderRadius: 999, background: tn.bg, color: tn.color, border: `1px solid ${tn.edge}`, fontWeight: 600, fontSize: 12.5, whiteSpace: "nowrap", flex: "0 0 auto" }}>
      <span style={{ display: "inline-flex", animation: pulse ? "pulse-dot 1.6s infinite" : "none" }}><Icon name={tn.icon} size={13} stroke={2} /></span>
      {EXP_LABELS[status] || status}
    </span>
  );
}

export function ExpTrack({ status }) {
  const done = ["delivered", "closed"].includes(status);
  const tn = MM.tone(status);
  return (
    <div style={{ height: 5, borderRadius: 99, background: "var(--line)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: (EXP_PCT[status] || 0) + "%", borderRadius: 99, background: done ? "var(--st-done)" : tn.color, transition: "width .45s ease" }} />
    </div>
  );
}

function dueColor(o) {
  const t = EM.dueTone(o);
  return t === "urgent" ? "var(--st-action)" : t === "soon" ? "var(--accent-deep)" : t === "muted" ? "var(--muted)" : "var(--ink)";
}

function AssignmentCard({ o, open }) {
  const [hov, setHov] = React.useState(false);
  const tn = MM.tone(o.status);
  const released = ["delivered", "closed"].includes(o.status);
  return (
    <article onClick={() => open(o)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      role="button" tabIndex={0} aria-label={`Open ${o.ref} — ${o.title}`}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(o); } }}
      style={{ position: "relative", display: "flex", background: "var(--surface)", border: `1px solid ${hov ? tn.edge : "var(--line)"}`, borderRadius: 20, overflow: "hidden", cursor: "pointer", boxShadow: hov ? "var(--shadow-pop)" : "var(--shadow-card)", transform: hov ? "translateY(-2px)" : "none", transition: "all .18s ease" }}>
      <div style={{ width: 5, flex: "0 0 5px", background: tn.color }} />
      <div style={{ flex: 1, padding: 24, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em", fontSize: 11.5, color: "var(--faint)" }}>{o.ref}</span>
          <span style={{ width: 3, height: 3, borderRadius: 99, background: "var(--faint)" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)", whiteSpace: "nowrap" }}>{o.program}</span>
          {o.client_code && <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--faint)" }}>· {o.client_code}</span>}
          <div style={{ flex: 1 }} />
          {o.unread > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--accent)", fontSize: 11.5, fontWeight: 700 }}><Icon name="chat" size={13} />{o.unread}</span>}
          <ExpChip status={o.status} pulse={["writing", "in_review", "revision"].includes(o.status)} />
        </div>
        <h3 style={{ margin: "0 0 10px", fontFamily: "var(--serif)", fontSize: 20, fontWeight: 500, letterSpacing: "-0.015em", color: "var(--ink)", lineHeight: 1.18, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{o.title}</h3>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
          {o.level_label && <Meta>{o.level_label}</Meta>}{o.scope_label && <Meta>{o.scope_label}</Meta>}{o.pages ? <Meta>{o.pages} pages</Meta> : null}
        </div>
        <div style={{ marginBottom: 14 }}>
          <ExpTrack status={o.status} />
          <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 8 }}>{EM.statusSentence(o)}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", paddingTop: 14, borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name={released ? "check" : "clock"} size={15} style={{ color: dueColor(o) }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: dueColor(o) }}>{released ? o.due_date : `Due ${o.due_date}`}</span>
            {!released && (() => { const r = EM.dueRel(o); return r ? <span style={{ fontSize: 12, fontWeight: 600, color: r.urgent ? "var(--st-action)" : "var(--muted)" }}>· {r.text}</span> : null; })()}
          </div>
          <span style={{ width: 3, height: 3, borderRadius: 99, background: "var(--faint)" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: EM.payInfo(o).known ? "var(--accent-deep)" : "var(--muted)" }}>{EM.payLabel(o)}</span>
          <div style={{ flex: 1 }} />
          <Button size="sm" variant="soft" iconRight="right">Open</Button>
        </div>
      </div>
    </article>
  );
}

/* Experts cannot claim orders — assignments come via admin direct-assign or
   invitation only. (Locked product rule; no OfferCard exists.) */
function InvitationCard({ o, onRespond, onPreview }) {
  const [hov, setHov] = React.useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ flex: "1 1 240px", minWidth: 240, background: "var(--surface)", border: `1px solid ${hov ? "var(--st-action)" : "var(--st-action-edge)"}`, borderRadius: 15, padding: 18, transition: "all .15s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em", fontSize: 10, color: "var(--st-action)", background: "var(--st-action-bg)", padding: "3px 8px 3px 6px", borderRadius: 99, display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Icon name="mail" size={12} /> Invitation
        </span>
        <div style={{ flex: 1 }} />
        {o.client_code && <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--faint)" }}>{o.client_code}</span>}
      </div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 500, color: "var(--ink)", marginBottom: o.program ? 4 : 10 }}>{o.scope_label} · {o.level_label}</div>
      {o.program && <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)", marginBottom: 10 }}>{o.program}</div>}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
        {o.pages ? <Meta>{o.pages} pages</Meta> : null}<Meta mono>Due {o.due_date}</Meta>
        {(() => { const r = EM.dueRel(o); return r ? <span style={{ fontSize: 11.5, fontWeight: 700, color: r.urgent ? "var(--st-action)" : "var(--muted)" }}>{r.text}</span> : null; })()}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 12, borderTop: "1px solid var(--line)", marginBottom: 14 }}>
        <div style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em", fontSize: 9.5, color: "var(--muted)" }}>You earn</div>
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 600, color: "var(--accent-deep)" }}>{EM.money(EM.payFor(o))}</div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <Button size="sm" variant="primary" icon="check" onClick={() => onRespond(o, true)} full>Confirm</Button>
        <Button size="sm" variant="ghost" icon="x" onClick={() => onRespond(o, false)}>Decline</Button>
      </div>
      <button onClick={() => onPreview(o)} style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: "transparent", border: "none", color: "var(--accent-deep)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--sans)", padding: "2px 0" }}>
        <Icon name="eye" size={14} /> Review brief first
      </button>
    </div>
  );
}

function StatCard({ label, value, borderColor, onClick, selected }) {
  const [hov, setHov] = React.useState(false);
  const interactive = !!onClick;
  const base = {
    background: "var(--surface)",
    border: `1px solid ${selected ? "var(--accent)" : (interactive && hov) ? "var(--line-2)" : "var(--line)"}`,
    borderRadius: 13, padding: "16px 18px", borderTop: `3px solid ${borderColor}`,
    boxShadow: selected ? "inset 0 0 0 1px var(--accent)" : "none",
    transition: "border-color .15s, box-shadow .15s, transform .15s",
    transform: interactive && hov && !selected ? "translateY(-1px)" : "none",
  };
  if (!interactive) {
    return (
      <div style={base}>
        <div style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em", fontSize: 10, color: "var(--muted)", marginBottom: 8 }}>{label}</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 600, color: "var(--ink)" }}>{value}</div>
      </div>
    );
  }
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      aria-pressed={selected || undefined}
      style={{ ...base, textAlign: "left", cursor: "pointer", fontFamily: "var(--sans)", display: "block", width: "100%" }}>
      <div style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em", fontSize: 10, color: selected ? "var(--accent-deep)" : "var(--muted)", marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 600, color: "var(--ink)" }}>{value}</div>
    </button>
  );
}

export function MyWork({ writer, assignments, invitations = [], accepting, stats, workFilter = null, setWorkFilter, open, respond, previewInvite, go }) {
  const groups = [
    { key: "revision", label: "Needs revision", color: "var(--st-revision)", filter: (o) => o.status === "revision", note: "changes requested" },
    { key: "active", label: "Active", color: "var(--st-progress)", filter: (o) => ["assigned", "writing"].includes(o.status) },
    { key: "review", label: "In QC review", color: "var(--st-action)", filter: (o) => o.status === "in_review" },
    { key: "done", label: "Delivered", color: "var(--st-done)", filter: (o) => ["delivered", "closed"].includes(o.status) },
  ];
  // workFilter (a status group) → which group keys to show. null shows all.
  const FILTER_GROUPS = { active: ["active"], revision: ["revision"], in_review: ["review"], delivered: ["done"] };
  const FILTER_LABELS = { active: "Active", revision: "Needs revision", in_review: "In QC review", delivered: "Delivered" };
  const setFilter = setWorkFilter || (() => {});
  const toggleFilter = (f) => setFilter(workFilter === f ? null : f);
  const shownKeys = workFilter ? FILTER_GROUPS[workFilter] : null;
  const first = (writer.name || "there").replace(/^Dr\.?\s+/i, "").split(" ")[0];
  const now = new Date();
  const hr = now.getHours();
  const greet = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const hasActiveWork = assignments.filter((o) => ["assigned", "writing", "revision", "in_review"].includes(o.status)).length > 0;

  return (
    <div style={{ animation: "rise .3s ease both" }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".14em", fontSize: 10.5, color: "var(--accent-deep)", fontWeight: 600 }}>{dateStr}</span>
          <span style={{ flex: "0 0 auto", width: 5, height: 5, borderRadius: 99, background: "var(--faint)" }} />
          <span style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".1em", fontSize: 10.5, color: "var(--faint)" }}>My work</span>
        </div>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(30px,4vw,44px)", fontWeight: 500, letterSpacing: "-0.025em", margin: 0, lineHeight: 1.04 }}>
          {greet}, <span style={{ fontStyle: "italic", color: "var(--accent)" }}>{first}.</span>
        </h1>
        <p style={{ fontSize: 15, color: "var(--ink-2)", margin: "12px 0 0" }}>
          {stats.active} active{stats.revision ? ` · ${stats.revision} in revision` : ""} · {stats.review} in review · {EM.money(stats.upcoming)} upcoming
        </p>
        {workFilter && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, marginTop: 14, padding: "6px 7px 6px 14px", borderRadius: 999, background: "var(--accent-soft)" }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent-deep)" }}>Showing {FILTER_LABELS[workFilter]}</span>
            <button onClick={() => setFilter(null)} aria-label="Clear filter"
              style={{ display: "grid", placeItems: "center", width: 22, height: 22, borderRadius: 99, border: "none", background: "var(--surface)", color: "var(--accent-deep)", cursor: "pointer", padding: 0 }}>
              <Icon name="x" size={13} stroke={2.5} />
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 32 }}>
        <StatCard label="Active" value={stats.active} borderColor="var(--st-progress)" onClick={() => toggleFilter("active")} selected={workFilter === "active"} />
        {stats.revision > 0 && <StatCard label="Needs revision" value={stats.revision} borderColor="var(--st-revision)" onClick={() => toggleFilter("revision")} selected={workFilter === "revision"} />}
        <StatCard label="In QC review" value={stats.review} borderColor="var(--st-action)" onClick={() => toggleFilter("in_review")} selected={workFilter === "in_review"} />
        <StatCard label="Delivered" value={stats.delivered} borderColor="var(--st-done)" onClick={() => toggleFilter("delivered")} selected={workFilter === "delivered"} />
        <StatCard label="Earned this month" value={EM.money(stats.monthEarnedNum)} borderColor="var(--accent)" onClick={() => go && go("earnings")} />
      </div>

      {invitations.length > 0 && (
        <section style={{ marginBottom: 34 }}>
          <SectionLabel color="var(--st-action)" count={invitations.length} right={<span style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em", fontSize: 10, color: "var(--muted)" }}>respond to continue</span>}>Pending invitations</SectionLabel>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {invitations.map((o) => <InvitationCard key={o.id} o={o} onRespond={respond} onPreview={previewInvite} />)}
          </div>
        </section>
      )}

      {invitations.length === 0 && !hasActiveWork && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "20px 22px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, marginBottom: 34 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: "var(--accent-soft)", display: "grid", placeItems: "center", flex: "0 0 40px" }}><Icon name="info" size={20} style={{ color: "var(--accent)" }} /></div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>How you receive assignments</div>
            <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
              Assignments are created and matched by the Meridian admin team. You'll be notified by email when you're assigned directly or invited to confirm a project. No action is needed until then.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
        {groups.map((g) => {
          if (shownKeys && !shownKeys.includes(g.key)) return null;
          const items = assignments.filter(g.filter);
          if (!items.length) return null;
          return (
            <section key={g.key}>
              <SectionLabel color={g.color} count={items.length} right={g.note ? <span style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em", fontSize: 10, color: "var(--st-revision)", fontWeight: 600 }}>{g.note}</span> : undefined}>{g.label}</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {items.map((o) => <AssignmentCard key={o.id} o={o} open={open} />)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   Expert Dashboard — at-a-glance overview. Stat cards + a scalable
   widget grid (shared kit primitives). Each widget is self-contained;
   push another onto `widgets` to extend it — the grid reflows.
   ============================================================ */
// Upcoming deadlines — date-chip list (day + month) with a countdown.
function ExpDeadlines({ assignments, open }) {
  const items = assignments
    .filter((o) => !["delivered", "closed"].includes(o.status) && o.due_at)
    .map((o) => ({ o, rel: EM.dueRel(o), d: new Date(o.due_at) }))
    .filter((x) => x.rel && !isNaN(+x.d))
    .sort((a, b) => a.rel.days - b.rel.days)
    .slice(0, 4);
  if (!items.length) return <div style={{ fontSize: 13, color: "var(--muted)" }}>No deadlines on your plate right now.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {items.map(({ o, rel, d }, i) => (
        <button key={o.id} onClick={() => open(o)}
          style={{ display: "flex", alignItems: "center", gap: 13, padding: "10px 0", width: "100%", textAlign: "left",
            border: "none", borderTop: i ? "1px solid var(--line)" : "none", background: "transparent", cursor: "pointer", fontFamily: "var(--sans)" }}>
          <span style={{ flex: "0 0 auto", width: 40, textAlign: "center", lineHeight: 1 }}>
            <span style={{ display: "block", fontFamily: "var(--serif)", fontSize: 19, fontWeight: 600, color: rel.urgent ? "var(--st-action)" : "var(--ink)" }}>{d.getDate()}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".1em", color: "var(--muted)", textTransform: "uppercase" }}>{d.toLocaleDateString("en-US", { month: "short" })}</span>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.title}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{o.ref} · {o.program || o.scope_label || ""}</div>
          </div>
          <ExpChip status={o.status} />
        </button>
      ))}
    </div>
  );
}

// Earnings bar chart — last 6 months of paid earnings; current month striped.
function MiniBars({ data }) {
  const max = Math.max(1, ...data.map((m) => m.value));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 110, padding: "4px 0 0" }}>
      {data.map((m) => (
        <div key={m.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
          <div title={EM.money(m.value)} style={{ width: "100%", maxWidth: 34, height: Math.max(4, Math.round((m.value / max) * 80)), borderRadius: "6px 6px 0 0",
            background: m.current ? "transparent" : "var(--accent-soft)",
            border: m.current ? "1.5px dashed var(--accent)" : "none",
            backgroundImage: m.current ? "repeating-linear-gradient(45deg, var(--accent-soft), var(--accent-soft) 4px, transparent 4px, transparent 8px)" : "none" }} />
          <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: m.current ? "var(--accent-deep)" : "var(--faint)", textTransform: "uppercase", letterSpacing: ".05em" }}>{m.label}</span>
        </div>
      ))}
    </div>
  );
}

// One "needs your attention" card (revision / invitation / due-soon).
function NeedsCard({ tone, icon, label, title, sub, action, onClick }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ flex: "1 1 240px", minWidth: 220, textAlign: "left", display: "flex", gap: 12, alignItems: "flex-start", padding: 16,
        background: "var(--surface)", border: `1px solid ${hov ? tone : "var(--line)"}`, borderRadius: 14, cursor: "pointer",
        fontFamily: "var(--sans)", transition: "border-color .15s, transform .15s", transform: hov ? "translateY(-2px)" : "none" }}>
      <span style={{ width: 34, height: 34, borderRadius: 9, background: "var(--surface-2)", display: "grid", placeItems: "center", color: tone, flex: "0 0 34px" }}><Icon name={icon} size={17} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: tone, fontWeight: 700, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{sub}</div>
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: tone, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 3 }}>{action} <Icon name="chevR" size={13} /></span>
    </button>
  );
}

// One performance metric tile. value null → "—" (not yet tracked).
function PerfTile({ label, value, suffix, pct, tone }) {
  return (
    <div style={{ background: "var(--surface-2)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 600, color: value == null ? "var(--faint)" : "var(--ink)", lineHeight: 1 }}>
        {value == null ? "—" : value}{value != null && suffix ? <span style={{ fontSize: 14, color: "var(--muted)" }}>{suffix}</span> : null}
      </div>
      {pct != null && <div style={{ height: 4, borderRadius: 99, background: "var(--line)", marginTop: 10, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.max(0, Math.min(100, pct))}%`, background: tone || "var(--accent)", borderRadius: 99 }} /></div>}
    </div>
  );
}

export function ExpDashboard({ writer, assignments, invitations = [], accepting, setAccepting, stats, perf, activity = [], open, respond, previewInvite, go }) {
  const first = (writer.name || "there").replace(/^Dr\.?\s+/i, "").split(" ")[0];
  const hr = new Date().getHours();
  const greet = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  const dateStr = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const revision = assignments.find((o) => o.status === "revision");
  const invite = invitations[0];
  const dueSoon = assignments
    .filter((o) => !["delivered", "closed"].includes(o.status) && o.due_at)
    .map((o) => ({ o, rel: EM.dueRel(o) })).filter((x) => x.rel)
    .sort((a, b) => a.rel.days - b.rel.days)[0];

  // ── "Needs your attention" cards — show the few live, time-sensitive items. ──
  const needs = [];
  if (revision) needs.push(<NeedsCard key="rev" tone="var(--st-revision)" icon="refresh" label="Revision requested" title={revision.title} sub={`Due ${revision.due_date}`} action="Resume" onClick={() => open(revision)} />);
  if (invite) needs.push(<NeedsCard key="inv" tone="var(--st-action)" icon="mail" label="New invitation" title={`${invite.scope_label || invite.program || "Assignment"}`} sub={`${EM.money(EM.payFor(invite))} · due ${invite.due_date}`} action="Review" onClick={() => previewInvite(invite)} />);
  if (dueSoon && dueSoon.o.id !== (revision && revision.id)) needs.push(<NeedsCard key="due" tone="var(--accent)" icon="clock" label="Due soon" title={dueSoon.o.title} sub={`${dueSoon.rel.text[0].toUpperCase() + dueSoon.rel.text.slice(1)} · ${EXP_LABELS[dueSoon.o.status] || dueSoon.o.status}`} action="Open" onClick={() => open(dueSoon.o)} />);

  const months = EM.monthlyEarnings(assignments);
  const buckets = EM.earningsBuckets(assignments);

  // ── Widgets — independent panels; append to extend the dashboard. ──
  const widgets = [];

  // Earnings
  widgets.push(
    <DashWidget key="earn" title="Earnings" icon="wallet" action={<button onClick={() => go("earnings")} style={{ background: "none", border: "none", color: "var(--accent-deep)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--sans)" }}>Open earnings ›</button>}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>This month so far</div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>{EM.money(months[months.length - 1].value)}</div>
      <MiniBars data={months} />
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Paid <b style={{ color: "var(--st-done)" }}>{EM.money(buckets.paid)}</b></span>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Processing <b style={{ color: "var(--st-action)" }}>{EM.money(buckets.processing)}</b></span>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Upcoming <b style={{ color: "var(--st-progress)" }}>{EM.money(buckets.upcoming)}</b></span>
        <div style={{ flex: 1 }} />
        {writer.mpesa_verified
          ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: "var(--st-done)" }}><Icon name="check" size={12} stroke={2.4} /> M-Pesa verified</span>
          : <button onClick={() => go("earnings")} style={{ background: "none", border: "none", fontSize: 11.5, fontWeight: 600, color: "var(--st-action)", cursor: "pointer" }}>Add M-Pesa →</button>}
      </div>
    </DashWidget>
  );

  // Performance
  widgets.push(
    <DashWidget key="perf" title="Performance" icon="star">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <PerfTile label="Rating" value={perf && perf.rating != null ? Number(perf.rating).toFixed(1) : null} suffix=" / 5" pct={perf && perf.rating != null ? (perf.rating / 5) * 100 : null} tone="var(--accent)" />
        <PerfTile label="On-time" value={perf && perf.ontime_pct != null ? perf.ontime_pct : null} suffix="%" pct={perf && perf.ontime_pct} tone="var(--st-done)" />
        <PerfTile label="Acceptance" value={perf && perf.acceptance_pct != null ? perf.acceptance_pct : null} suffix="%" pct={perf && perf.acceptance_pct} tone="var(--st-progress)" />
        <PerfTile label="Rework" value={perf && perf.rework_pct != null ? perf.rework_pct : null} suffix="%" pct={perf && perf.rework_pct} tone="var(--st-revision)" />
      </div>
      {perf && (perf.streak > 0 || perf.delivered > 0) && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12, fontSize: 12, color: "var(--muted)" }}>
          <Icon name="check" size={13} style={{ color: "var(--st-done)" }} />
          {perf.streak > 0 ? <span><b style={{ color: "var(--ink)" }}>{perf.streak}</b> on-time in a row</span> : null}
          {perf.streak > 0 && perf.delivered > 0 ? <span>·</span> : null}
          {perf.delivered > 0 ? <span><b style={{ color: "var(--ink)" }}>{perf.delivered}</b> delivered all-time</span> : null}
        </div>
      )}
    </DashWidget>
  );

  // Upcoming deadlines
  widgets.push(
    <DashWidget key="deadlines" title="Upcoming deadlines" icon="clock" action={<button onClick={() => go("work")} style={{ background: "none", border: "none", color: "var(--accent-deep)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--sans)" }}>All work ›</button>}>
      <ExpDeadlines assignments={assignments} open={open} />
    </DashWidget>
  );

  // Capacity
  const maxConcurrent = (writer && writer.max_concurrent) || 5;
  const activeCount = assignments.filter((o) => ["assigned", "writing", "revision", "in_review"].includes(o.status)).length;
  widgets.push(
    <DashWidget key="cap" title="Capacity" icon="power">
      <button onClick={() => setAccepting(!accepting)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "4px 0", background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--sans)", textAlign: "left" }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: accepting ? "var(--st-done-bg)" : "var(--surface-2)", display: "grid", placeItems: "center", color: accepting ? "var(--st-done)" : "var(--muted)", flex: "0 0 34px" }}><Icon name="power" size={18} /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{accepting ? "Available for assignments" : "At capacity"}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{accepting ? "Admin can assign you new work." : "Hidden from new assignments."}</div>
        </div>
        <span style={{ position: "relative", width: 38, height: 22, borderRadius: 99, background: accepting ? "var(--accent)" : "var(--line-2)", flex: "0 0 38px" }}>
          <span style={{ position: "absolute", top: 2, left: accepting ? 18 : 2, width: 18, height: 18, borderRadius: 99, background: "#fff", transition: "left .15s" }} />
        </span>
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)" }}>Concurrent</span>
        <span style={{ flex: "0 0 auto", width: 3, height: 3, borderRadius: 99, background: "var(--faint)" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
          <span style={{ color: activeCount >= maxConcurrent ? "var(--st-action)" : "var(--ink)" }}>{activeCount}</span>
          <span style={{ color: "var(--muted)" }}> / {maxConcurrent}</span>
        </span>
      </div>
    </DashWidget>
  );

  // Recent activity (from order_log)
  if (activity && activity.length) {
    widgets.push(
      <DashWidget key="activity" title="Recent activity" icon="clock" full>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2px 28px" }}>
          {activity.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0" }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, background: "var(--surface-2)", display: "grid", placeItems: "center", color: "var(--accent)", flex: "0 0 26px" }}><Icon name="check" size={13} /></span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.event}</span>
              <span style={{ fontSize: 11, color: "var(--faint)", whiteSpace: "nowrap" }}>{MM.ago(a.created_at)}</span>
            </div>
          ))}
        </div>
      </DashWidget>
    );
  }

  return (
    <div style={{ animation: "rise .3s ease both" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".14em", fontSize: 10.5, color: "var(--accent-deep)", fontWeight: 600 }}>{dateStr}</span>
            <span style={{ flex: "0 0 auto", width: 5, height: 5, borderRadius: 99, background: "var(--faint)" }} />
            <span style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".1em", fontSize: 10.5, color: "var(--faint)" }}>Dashboard</span>
          </div>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(30px,4vw,44px)", fontWeight: 500, letterSpacing: "-0.025em", margin: 0, lineHeight: 1.04 }}>
            {greet}, <span style={{ fontStyle: "italic", color: "var(--accent)" }}>{first}.</span>
          </h1>
          <p style={{ fontSize: 15, color: "var(--ink-2)", margin: "12px 0 0" }}>
            {needs.length ? `${needs.length} thing${needs.length > 1 ? "s" : ""} need${needs.length > 1 ? "" : "s"} your attention today.` : "You're all caught up — nothing needs you right now."}
          </p>
        </div>
        <button onClick={() => setAccepting(!accepting)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 99, border: `1px solid ${accepting ? "var(--st-done-edge)" : "var(--st-action-edge)"}`, background: accepting ? "var(--st-done-bg)" : "var(--st-action-bg)", color: accepting ? "var(--st-done)" : "var(--st-action)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--sans)" }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: "currentColor" }} /> {accepting ? "Available" : "At capacity"}
        </button>
      </div>

      {needs.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <DashWidget title="Needs your attention" icon="alert" full pad={14} action={<span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".08em", color: "var(--muted)", textTransform: "uppercase" }}>{needs.length} open</span>}>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>{needs}</div>
          </DashWidget>
        </div>
      )}

      <DashWidgets>{widgets}</DashWidgets>
    </div>
  );
}

export default MyWork;
