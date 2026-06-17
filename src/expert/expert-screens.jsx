/* ============================================================
   Expert — Earnings (+ M-Pesa payout), Availability, Auth,
   Not-an-expert. ES module. Pay is derived (pages × $2.32);
   payout is via M-Pesa, surfaced here on Earnings.
   ============================================================ */
import React from "react";
import { supabase } from "../lib/supabase.js";
import { Icon } from "../workspace/kit/icons.jsx";
import { Button } from "../workspace/kit/components.jsx";
import { EM } from "./expert-model.js";
import { EXP_LABELS } from "./expert-mywork.jsx";

const fmtMpesa = (n) => { const d = (n || "").replace(/\D/g, ""); if (d.startsWith("254")) return "+" + d; if (d.startsWith("0")) return "+254 " + d.slice(1, 4) + " " + d.slice(4, 7) + " " + d.slice(7); return d || ""; };

/* ── EARNINGS + M-PESA PAYOUT ─────────────────────────────── */
export function Earnings({ assignments, writer, onSave, notify }) {
  const b = EM.earningsBuckets(assignments);
  const [editing, setEditing] = React.useState(false);
  const [mpesa, setMpesa] = React.useState(writer.mpesa_number || "");
  const [mpesaName, setMpesaName] = React.useState(writer.mpesa_name || "");
  const [saving, setSaving] = React.useState(false);
  const hasPayout = !!writer.mpesa_number;
  const verified = !!writer.mpesa_verified;

  async function save() {
    setSaving(true);
    await onSave({ mpesa_number: mpesa.trim() || null, mpesa_name: mpesaName.trim() || null, mpesa_verified: false });
    setSaving(false); setEditing(false); notify && notify("M-Pesa details saved — pending verification.");
  }

  const stateChip = (s) => {
    const m = { paid: ["var(--st-done)", "var(--st-done-bg)", "Paid"], processing: ["var(--st-action)", "var(--st-action-bg)", "Processing"], upcoming: ["var(--st-progress)", "var(--st-progress-bg)", "Upcoming"] }[s];
    return <span style={{ fontSize: 11.5, fontWeight: 600, color: m[0], background: m[1], padding: "3px 9px", borderRadius: 99 }}>{m[2]}</span>;
  };
  const card = (label, val, borderColor) => (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 13, padding: "18px 20px", borderTop: `3px solid ${borderColor}` }}>
      <div style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em", fontSize: 10, color: "var(--muted)", marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 600, color: "var(--ink)" }}>{EM.money(val)}</div>
    </div>
  );
  const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 11, border: "1px solid var(--line-2)", background: "var(--surface)", fontSize: 14.5, color: "var(--ink)", outline: "none", fontFamily: "var(--sans)" };

  return (
    <div style={{ maxWidth: 880, animation: "rise .3s ease both" }}>
      <h1 style={{ fontFamily: "var(--serif)", fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Earnings</h1>
      <p style={{ fontSize: 14.5, color: "var(--ink-2)", margin: "0 0 24px" }}>Payouts are sent to your M-Pesa number as orders are delivered.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 20 }}>
        {card("Paid", b.paid, "var(--st-done)")}{card("Processing", b.processing, "var(--st-action)")}{card("Upcoming", b.upcoming, "var(--st-progress)")}
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 18, padding: 20, marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: editing ? 18 : 14 }}>
          {/* M-Pesa mark — generic mobile-money glyph in M-Pesa green. Swap this
              tile's contents for the official M-Pesa logo asset when available. */}
          <div style={{ width: 42, height: 42, borderRadius: 11, background: "#43B02A", display: "grid", placeItems: "center", flex: "0 0 42px", color: "#fff", boxShadow: "inset 0 1px 0 rgba(255,255,255,.25)" }}><Icon name="phone" size={20} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>M-Pesa payout</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Where your earnings are sent</div>
          </div>
          {!editing && <Button size="sm" variant="ghost" icon="pencil" onClick={() => setEditing(true)}>{hasPayout ? "Edit" : "Add number"}</Button>}
        </div>

        {!editing && hasPayout && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--surface-2)", borderRadius: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".07em", fontSize: 9.5, color: "var(--muted)", marginBottom: 4 }}>Number</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", fontFamily: "var(--mono)", letterSpacing: "0.02em" }}>{fmtMpesa(writer.mpesa_number)}</div>
            </div>
            <span style={{ width: 1, height: 34, background: "var(--line)" }} />
            <div>
              <div style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".07em", fontSize: 9.5, color: "var(--muted)", marginBottom: 4 }}>Registered name</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{writer.mpesa_name || "—"}</div>
            </div>
            <div style={{ flex: 1 }} />
            {verified
              ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--st-done)", background: "var(--st-done-bg)", padding: "5px 11px", borderRadius: 99 }}><Icon name="check" size={13} stroke={2.4} /> Verified</span>
              : <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--st-action)", background: "var(--st-action-bg)", padding: "5px 11px", borderRadius: 99 }}><Icon name="clock" size={13} /> Pending verification</span>}
          </div>
        )}

        {!editing && !hasPayout && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "var(--st-action-bg)", border: "1px solid var(--st-action-edge)", borderRadius: 12, fontSize: 13.5, color: "var(--ink-2)" }}>
            <Icon name="alert" size={16} style={{ color: "var(--st-action)", flex: "0 0 auto" }} />
            Add your M-Pesa number to receive payouts. Earnings hold until a number is on file.
          </div>
        )}

        {editing && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em", display: "block", color: "var(--ink-2)", fontSize: 11, marginBottom: 8 }}>M-Pesa number</label>
                <input value={mpesa} onChange={(e) => setMpesa(e.target.value)} placeholder="0712 345 678" inputMode="tel" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em", display: "block", color: "var(--ink-2)", fontSize: 11, marginBottom: 8 }}>Registered name</label>
                <input value={mpesaName} onChange={(e) => setMpesaName(e.target.value)} placeholder="As registered on M-Pesa" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Icon name="shield" size={14} style={{ color: "var(--muted)" }} />
              <span style={{ fontSize: 12, color: "var(--muted)", flex: 1, minWidth: 180 }}>Must match your Safaricom M-Pesa registration. Our team verifies it before the first payout.</span>
              <Button size="sm" variant="ghost" onClick={() => { setMpesa(writer.mpesa_number || ""); setMpesaName(writer.mpesa_name || ""); setEditing(false); }}>Cancel</Button>
              <Button size="sm" variant="primary" icon="check" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </div>
        )}
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
          <h3 style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em", margin: 0, color: "var(--ink-2)", fontSize: 11.5 }}>Per order</h3>
        </div>
        {assignments.length === 0 && <div style={{ padding: "24px 18px", color: "var(--muted)", fontSize: 14 }}>No orders yet.</div>}
        {assignments.map((o, i) => (
          <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderTop: i ? "1px solid var(--line)" : "none" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.title}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{o.ref}{o.pages ? ` · ${o.pages} pages` : ""} · {EXP_LABELS[o.status] || o.status}</div>
            </div>
            {stateChip(EM.earningsState(o))}
            <div style={{ fontFamily: "var(--serif)", fontSize: EM.payInfo(o).known ? 18 : 13, fontWeight: 600, color: EM.payInfo(o).known ? "var(--ink)" : "var(--muted)", fontStyle: EM.payInfo(o).known ? "normal" : "italic", width: 90, textAlign: "right" }}>{EM.payLabel(o)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── AVAILABILITY ─────────────────────────────────────────── */
function AvField({ label, value, onChange, type = "text", area }) {
  const st = { width: "100%", padding: "11px 14px", borderRadius: 11, border: "1px solid var(--line-2)", background: "var(--surface)", fontSize: 14.5, color: "var(--ink)", outline: "none", resize: "vertical", fontFamily: "var(--sans)" };
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em", display: "block", color: "var(--ink-2)", fontSize: 11, marginBottom: 8 }}>{label}</label>
      {area ? <textarea rows={3} style={st} value={value || ""} onChange={(e) => onChange(e.target.value)} /> : <input type={type} style={st} value={value || ""} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}

export function Availability({ writer, accepting, setAccepting, onSave, notify }) {
  const [w, setW] = React.useState(writer);
  const [saving, setSaving] = React.useState(false);
  const [pw, setPw] = React.useState("");
  const [pwBusy, setPwBusy] = React.useState(false);
  React.useEffect(() => { setW(writer); }, [writer]);
  const set = (k, v) => setW((p) => ({ ...p, [k]: v }));

  async function save() {
    setSaving(true);
    await onSave({ name: w.name, specialty: w.specialty, field: w.field, degree: w.degree, max_concurrent: w.max_concurrent ? Number(w.max_concurrent) : null, bio: w.bio });
    setSaving(false); notify && notify("Profile saved");
  }
  async function changePw() {
    if (pw.length < 6) { notify && notify("Use at least 6 characters.", "error"); return; }
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setPwBusy(false);
    if (error) { notify && notify(error.message, "error"); return; }
    setPw(""); notify && notify("Password updated");
  }

  return (
    <div style={{ maxWidth: 720, animation: "rise .3s ease both" }}>
      <h1 style={{ fontFamily: "var(--serif)", fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 24px" }}>Availability</h1>
      <div style={{ display: "flex", alignItems: "center", gap: 16, background: "var(--surface)", border: `1px solid ${accepting ? "var(--accent)" : "var(--line)"}`, borderRadius: 20, padding: 22, marginBottom: 18 }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: accepting ? "var(--accent-soft)" : "var(--surface-2)", color: accepting ? "var(--accent)" : "var(--muted)", display: "grid", placeItems: "center", flex: "0 0 46px" }}><Icon name="power" size={22} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 500, color: "var(--ink)" }}>{accepting ? "Available for assignments" : "At capacity"}</div>
          <div style={{ fontSize: 13.5, color: "var(--ink-2)", marginTop: 2 }}>{accepting ? "Admin can assign or invite you to new work." : "You're hidden from new assignments until you turn this back on."}</div>
        </div>
        <button onClick={() => setAccepting(!accepting)} aria-label="Toggle availability" style={{ position: "relative", width: 52, height: 30, borderRadius: 99, border: "none", background: accepting ? "var(--accent)" : "var(--line-2)", cursor: "pointer", flex: "0 0 52px" }}>
          <span style={{ position: "absolute", top: 3, left: accepting ? 25 : 3, width: 24, height: 24, borderRadius: 99, background: "#fff", transition: "left .15s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
        </button>
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 20, padding: 24, marginBottom: 18 }}>
        <h3 style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 18px", color: "var(--ink-2)", fontSize: 11.5 }}>Your profile</h3>
        <AvField label="Display name" value={w.name} onChange={(v) => set("name", v)} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <AvField label="Specialty" value={w.specialty} onChange={(v) => set("specialty", v)} />
          <AvField label="Field" value={w.field} onChange={(v) => set("field", v)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <AvField label="Highest degree" value={w.degree} onChange={(v) => set("degree", v)} />
          <AvField label="Max concurrent" type="number" value={w.max_concurrent} onChange={(v) => set("max_concurrent", v)} />
        </div>
        <AvField label="Bio" area value={w.bio} onChange={(v) => set("bio", v)} />
        <Button variant="primary" icon="check" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save profile"}</Button>
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 20, padding: 24 }}>
        <h3 style={{ fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 18px", color: "var(--ink-2)", fontSize: 11.5 }}>Change password</h3>
        <AvField label="New password" type="password" value={pw} onChange={setPw} />
        <Button variant="soft" disabled={pwBusy} onClick={changePw}>{pwBusy ? "Updating…" : "Update password"}</Button>
      </div>
    </div>
  );
}

/* ── PROFILE ──────────────────────────────────────────────── */
export function Profile({ writer }) {
  return (
    <div style={{ maxWidth: 680, animation: "rise .3s ease both" }}>
      <h1 style={{ fontFamily: "var(--serif)", fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 24px" }}>Profile</h1>
      <div style={{ display: "flex", alignItems: "center", gap: 18, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 20, padding: 24, marginBottom: 18 }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--accent)", color: "var(--on-accent)", display: "grid", placeItems: "center", fontFamily: "var(--serif)", fontWeight: 600, fontSize: 27, flex: "0 0 64px" }}>{writer.initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 600 }}>{writer.name}</div>
          <div style={{ fontSize: 14, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="star" size={13} style={{ color: "var(--accent)" }} /> {writer.rating || "—"}{writer.degree ? ` · ${writer.degree}` : ""}{writer.field ? ` · ${writer.field}` : ""}
          </div>
        </div>
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 20, padding: 24 }}>
        {writer.bio && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>{writer.bio}</p>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: writer.bio ? 16 : 0 }}>
          {(writer.specialties || [writer.specialty].filter(Boolean)).map((s) => (
            <span key={s} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent-deep)", background: "var(--accent-soft)", padding: "5px 12px", borderRadius: 99 }}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- Auth + Not-an-expert (§1/§2) ------------------------- */
export function ExpAuth({ recovery, onRecovered, notify }) {
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [err, setErr] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const fld = { width: "100%", padding: "13px 15px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--surface)", fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink)", outline: "none" };

  async function submit() {
    if (recovery) {
      if (pw.length < 6) { setErr("Use at least 6 characters."); return; }
      setErr(""); setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: pw });
      setLoading(false);
      if (error) { setErr(error.message); return; }
      onRecovered && onRecovered();
      return;
    }
    if (!/.+@.+\..+/.test(email.trim())) { setErr("Enter a valid email."); return; }
    if (!pw) { setErr("Enter your password."); return; }
    setErr(""); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pw });
    setLoading(false);
    if (error) setErr(/invalid login/i.test(error.message) ? "That email and password don’t match." : error.message);
  }
  async function forgot() {
    if (!/.+@.+\..+/.test(email.trim())) { setErr("Enter your email above first."); return; }
    setErr(""); setLoading(true);
    const { error } = await supabase.functions.invoke("send-recovery", { body: { email: email.trim().toLowerCase(), surface: "expert" } });
    setLoading(false);
    if (error) { setErr("Could not send the reset link — please try again."); return; }
    setSent(true);
  }

  return (
    <div style={{ height: "100vh", width: "100%", display: "grid", placeItems: "center", background: "var(--paper)", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, animation: "rise .35s ease both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 26 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--accent)", display: "grid", placeItems: "center", fontFamily: "var(--serif)", fontWeight: 600, fontSize: 24, color: "var(--on-accent)" }}>M</div>
          <div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 19, fontWeight: 600, color: "var(--ink)", lineHeight: 1, whiteSpace: "nowrap" }}>Meridian Studio</div>
            <div className="mono" style={{ color: "var(--accent)", fontSize: 9.5, marginTop: 4, letterSpacing: ".12em" }}>Expert Workspace</div>
          </div>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 30, boxShadow: "var(--shadow-card)" }}>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 6px" }}>{recovery ? "Set a new password" : "Expert sign in"}</h1>
          <p style={{ fontSize: 14.5, color: "var(--ink-2)", margin: "0 0 22px" }}>{recovery ? "Choose a new password for your expert account." : "Sign in to pick up assignments and submit work."}</p>
          {sent ? (
            <div style={{ background: "var(--st-done-bg)", border: "1px solid var(--st-done-edge)", borderRadius: 12, padding: "16px 18px", color: "var(--st-done)", fontSize: 14, lineHeight: 1.55 }}>
              <b>Check your inbox</b><br />We sent a password-reset link to {email}.
            </div>
          ) : (
            <>
              {!recovery && (
                <label style={{ display: "block", marginBottom: 16 }}>
                  <span className="mono" style={{ display: "block", color: "var(--ink-2)", fontSize: 11, marginBottom: 8 }}>Email</span>
                  <input type="email" style={fld} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoFocus />
                </label>
              )}
              <label style={{ display: "block", marginBottom: 16 }}>
                <span className="mono" style={{ display: "block", color: "var(--ink-2)", fontSize: 11, marginBottom: 8 }}>{recovery ? "New password" : "Password"}</span>
                <input type="password" style={fld} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" autoFocus={recovery}
                  onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
              </label>
              {!recovery && (
                <div style={{ textAlign: "right", marginTop: -4, marginBottom: 16 }}>
                  <button onClick={forgot} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 13, fontWeight: 600 }}>Forgot password?</button>
                </div>
              )}
              {err && <div style={{ color: "var(--st-action)", fontSize: 13, marginBottom: 12 }}>{err}</div>}
              <Button full variant="primary" disabled={loading} onClick={submit}>{loading ? "Please wait…" : recovery ? "Update password" : "Sign in"}</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function NotExpert({ user, onClaim, onSignOut }) {
  return (
    <div style={{ height: "100vh", width: "100%", display: "grid", placeItems: "center", background: "var(--paper)", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 440, textAlign: "center", animation: "rise .35s ease both" }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--st-action-bg)", color: "var(--st-action)", display: "grid", placeItems: "center", margin: "0 auto 22px" }}><Icon name="alert" size={32} /></div>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 10px" }}>Not an expert account</h1>
        <p style={{ fontSize: 15, color: "var(--ink-2)", lineHeight: 1.6, margin: "0 0 26px" }}>
          This workspace is for Meridian experts. {user?.email ? <>The email <b>{user.email}</b> isn't linked to an expert profile yet.</> : null} If an admin just onboarded you, refresh to link your account. If you're a client, head to your workspace instead.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Button variant="primary" icon="refresh" onClick={onClaim}>Refresh &amp; link account</Button>
          <a href="/workspace" style={{ textDecoration: "none" }}><Button variant="ghost">Go to client workspace</Button></a>
          <Button variant="ghost" onClick={onSignOut}>Sign out</Button>
        </div>
      </div>
    </div>
  );
}
