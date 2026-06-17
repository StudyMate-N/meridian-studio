/* ============================================================
   ResetPassword — the ONE reset page for every surface (/reset).
   Recovery emails (client/expert/admin) all link here with
   ?token_hash=...&type=recovery&surface=... . We verify the
   one-time token (verifyOtp — works on ANY device, no PKCE),
   then let the user set a new password.
   ============================================================ */
import React from "react";
import { supabase } from "./lib/supabase.js";
import { Button } from "./workspace/kit/components.jsx";
import { Icon } from "./workspace/kit/icons.jsx";
import "./workspace/kit/theme.css";

const { useState, useEffect, useMemo } = React;

const SURFACE_HOME = { client: "/workspace", expert: "/expert", admin: "/admin" };
const SURFACE_LABEL = { client: "your workspace", expert: "the expert workspace", admin: "the admin console" };

export default function ResetPassword() {
  const params = useMemo(() => { try { return new URLSearchParams(window.location.search); } catch { return new URLSearchParams(); } }, []);
  const surface = ["client", "expert", "admin"].includes(params.get("surface")) ? params.get("surface") : "client";

  const [status, setStatus] = useState("verifying"); // verifying | form | saving | done | invalid
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");

  // Establish the recovery session from the link, then show the form.
  useEffect(() => {
    let active = true;
    (async () => {
      const tokenHash = params.get("token_hash");
      // Primary path: one-time token_hash → verifyOtp (cross-device, no PKCE).
      // Type is pinned to 'recovery' (these links are always password resets).
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
        if (!active) return;
        setStatus(error ? "invalid" : "form");
        return;
      }
      // Fallbacks for older links: an implicit-hash session, or a PKCE ?code that
      // detectSessionInUrl already exchanged → if a session exists, allow reset.
      const onAuth = supabase.auth.onAuthStateChange((_e, session) => { if (active && session) setStatus("form"); });
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (session) setStatus("form");
      else setTimeout(() => { if (active) setStatus((s) => s === "verifying" ? "invalid" : s); }, 4000);
      return () => onAuth.data.subscription.unsubscribe();
    })();
    return () => { active = false; };
  }, []);

  async function save() {
    if (pw.length < 6) { setErr("Use at least 6 characters."); return; }
    if (pw !== confirm) { setErr("Those passwords don’t match."); return; }
    setErr(""); setStatus("saving");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { setErr(error.message); setStatus("form"); return; }
    setStatus("done");
    // Send them straight into their surface (the recovery session is now a full session).
    setTimeout(() => { try { window.location.replace(SURFACE_HOME[surface] || "/workspace"); } catch {} }, 1600);
  }

  const fld = { width: "100%", padding: "13px 15px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--surface)", fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink)", outline: "none", marginBottom: 14, boxSizing: "border-box" };

  return (
    <div className="mer-root" style={{ display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, animation: "rise .35s ease both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 26 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--accent)", display: "grid", placeItems: "center", fontFamily: "var(--serif)", fontWeight: 600, fontSize: 24, color: "var(--on-accent)" }}>M</div>
          <div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 19, fontWeight: 600, color: "var(--ink)", lineHeight: 1, whiteSpace: "nowrap" }}>Meridian Studio</div>
            <div className="mono" style={{ color: "var(--muted)", fontSize: 9.5, marginTop: 4 }}>Password reset</div>
          </div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 30, boxShadow: "var(--shadow-card)" }}>
          {status === "verifying" && (
            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)" }}>
              <div className="mono" style={{ fontSize: 12 }}>Verifying your reset link…</div>
            </div>
          )}

          {status === "invalid" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 54, height: 54, borderRadius: 15, background: "var(--st-action-bg)", color: "var(--st-action)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}><Icon name="alert" size={26} /></div>
              <h1 style={{ fontFamily: "var(--serif)", fontSize: 23, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 8px" }}>This reset link has expired</h1>
              <p style={{ fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.6, margin: "0 0 20px" }}>Reset links work once and expire within the hour. Request a fresh one from the sign-in page.</p>
              <a href={(SURFACE_HOME[surface] || "/workspace")} style={{ textDecoration: "none" }}><Button full variant="primary">Back to sign in</Button></a>
            </div>
          )}

          {status === "done" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 54, height: 54, borderRadius: 15, background: "var(--st-done-bg)", color: "var(--st-done)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}><Icon name="check" size={28} stroke={2.5} /></div>
              <h1 style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 8px" }}>Password updated</h1>
              <p style={{ fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.6, margin: "0 0 18px" }}>Taking you to {SURFACE_LABEL[surface]}…</p>
              <a href={(SURFACE_HOME[surface] || "/workspace")} style={{ textDecoration: "none" }}><Button full variant="primary">Continue</Button></a>
            </div>
          )}

          {(status === "form" || status === "saving") && (
            <>
              <h1 style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Set a new password</h1>
              <p style={{ fontSize: 14.5, color: "var(--ink-2)", margin: "0 0 22px" }}>Choose a new password for {SURFACE_LABEL[surface]}.</p>
              <label className="mono" style={{ display: "block", color: "var(--ink-2)", fontSize: 11, marginBottom: 8 }}>New password</label>
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus style={fld} placeholder="••••••••" />
              <label className="mono" style={{ display: "block", color: "var(--ink-2)", fontSize: 11, marginBottom: 8 }}>Confirm password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); }} style={fld} placeholder="••••••••" />
              {err && <div style={{ color: "var(--st-action)", fontSize: 13, marginBottom: 12 }}>{err}</div>}
              <Button full variant="primary" disabled={status === "saving"} onClick={save}>{status === "saving" ? "Saving…" : "Update password"}</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
