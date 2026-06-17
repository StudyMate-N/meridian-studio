/* ============================================================
   auth.jsx — Workspace auth surface (ES module, wired).
   Sign-in, sign-up (?mode=signup), forgot, and the recovery /
   set-new-password view (?type=recovery). Real supabase.auth.*.
   ============================================================ */
import React from "react";
import { supabase } from "../lib/supabase.js";
import { Button } from "./kit/components.jsx";

const REDIRECT = "https://primemeridian.academy/workspace";

function AuthField({ label, type = "text", value, onChange, placeholder, autoFocus, onEnter }) {
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      <span className="mono" style={{ display: "block", color: "var(--ink-2)", fontSize: 11, marginBottom: 8 }}>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus}
        onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
        style={{ width: "100%", padding: "13px 15px", borderRadius: 12, border: "1px solid var(--line-2)",
          background: "var(--surface)", fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink)", outline: "none" }} />
    </label>
  );
}

function GoogleButton({ onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%",
      padding: "12px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--surface)",
      fontFamily: "var(--sans)", fontSize: 14.5, fontWeight: 600, color: "var(--ink)", cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
      <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.1 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.8 6.1C12.2 13.3 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16.9z"/><path fill="#FBBC05" d="M10.3 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.7l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.1 0 11.3-2 15-5.5l-7.1-5.5c-2 1.3-4.6 2.1-7.9 2.1-6.4 0-11.8-3.8-13.7-9.4l-7.8 6.1C6.4 42.6 14.6 48 24 48z"/></svg>
      Continue with Google
    </button>
  );
}

export function AuthScreen({ recovery, signup, onRecovered, notify }) {
  const [mode, setMode] = React.useState(signup ? "signup" : "signin"); // signin | signup | forgot
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [err, setErr] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [gLoading, setGLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);          // forgot link sent
  const [confirmSent, setConfirmSent] = React.useState(false); // signup confirmation

  const switchMode = (m) => { setErr(""); setSent(false); setConfirmSent(false); setMode(m); };

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
    if (mode === "signup") return doSignUp();
    return doSignIn();
  }

  async function doSignIn() {
    if (!/.+@.+\..+/.test(email.trim())) { setErr("Enter a valid email address."); return; }
    if (!pw) { setErr("Enter your password."); return; }
    setErr(""); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pw });
    setLoading(false);
    if (error) { setErr(/invalid login/i.test(error.message) ? "That email and password don’t match. Use the password you set up, or reset it below." : error.message); return; }
    // PortalApp's onAuthStateChange takes over.
  }

  async function doSignUp() {
    if (!name.trim()) { setErr("Enter your first name."); return; }
    if (!/.+@.+\..+/.test(email.trim())) { setErr("Enter a valid email address."); return; }
    if (pw.length < 6) { setErr("Use at least 6 characters."); return; }
    setErr(""); setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(), password: pw,
      options: { data: { name: name.trim() }, emailRedirectTo: REDIRECT },
    });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setErr("An account with this email already exists — sign in instead."); setMode("signin"); return;
    }
    if (!data.session) { setConfirmSent(true); return; }
    // else onAuthStateChange takes over.
  }

  async function google() {
    setErr(""); setGLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google", options: { redirectTo: REDIRECT, queryParams: { prompt: "select_account" } },
    });
    if (error) {
      setGLoading(false);
      setErr(/not enabled|unsupported provider/i.test(error.message)
        ? "Google sign-in isn't enabled yet — use email and password for now." : error.message);
    }
  }

  async function forgot() {
    if (!/.+@.+\..+/.test(email.trim())) { setErr("Enter your email above first."); return; }
    setErr(""); setLoading(true);
    // Cross-device recovery: a server-minted one-time link to /reset (no PKCE).
    const { error } = await supabase.functions.invoke("send-recovery", { body: { email: email.trim().toLowerCase(), surface: "client" } });
    setLoading(false);
    if (error) { setErr("Could not send the reset link — please try again."); return; }
    setSent(true);
  }

  const heading = recovery ? "Set a new password" : mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back";
  const sub = recovery ? "Choose a new password for your Meridian account."
    : mode === "signup" ? "Start your first brief in minutes."
    : mode === "forgot" ? "We'll email you a link to set a new password."
    : "Sign in to your client workspace.";

  return (
    <div style={{ height: "100vh", width: "100%", display: "grid", gridTemplateColumns: "1fr", placeItems: "center",
      background: "var(--paper)", overflow: "auto", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, animation: "rise .35s ease both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--accent)", display: "grid",
            placeItems: "center", fontFamily: "var(--serif)", fontWeight: 600, fontSize: 24, color: "var(--on-accent)" }}>M</div>
          <div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 19, fontWeight: 600, color: "var(--ink)", lineHeight: 1, whiteSpace: "nowrap" }}>Meridian Studio</div>
            <div className="mono" style={{ color: "var(--muted)", fontSize: 9.5, marginTop: 4 }}>Client Workspace</div>
          </div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)",
          padding: 30, boxShadow: "var(--shadow-card)" }}>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 27, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 6px" }}>{heading}</h1>
          <p style={{ fontSize: 14.5, color: "var(--ink-2)", margin: "0 0 24px" }}>{sub}</p>

          {confirmSent ? (
            <div style={{ background: "var(--st-done-bg)", border: "1px solid var(--st-done-edge)", borderRadius: 12, padding: "16px 18px", color: "var(--st-done)", fontSize: 14, lineHeight: 1.55 }}>
              <b>Check your inbox</b><br />We sent a confirmation link to {email}. Click it to finish creating your account.
            </div>
          ) : sent ? (
            <div style={{ background: "var(--st-done-bg)", border: "1px solid var(--st-done-edge)", borderRadius: 12, padding: "16px 18px", color: "var(--st-done)", fontSize: 14, lineHeight: 1.55 }}>
              <b>Check your inbox</b><br />We sent a password-reset link to {email}.
            </div>
          ) : (
            <>
              {!recovery && mode === "signup" && <AuthField label="Full name" value={name} onChange={setName} placeholder="Your name" autoFocus onEnter={submit} />}
              {!recovery && <AuthField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@email.com" autoFocus={mode === "signin"} onEnter={submit} />}
              {mode !== "forgot" && (
                <AuthField label={recovery ? "New password" : "Password"} type="password" value={pw} onChange={setPw}
                  placeholder={recovery ? "New password" : "••••••••"} autoFocus={recovery} onEnter={submit} />
              )}

              {!recovery && mode === "signin" && (
                <div style={{ textAlign: "right", marginTop: -6, marginBottom: 16 }}>
                  <button onClick={() => switchMode("forgot")} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 13, fontWeight: 600 }}>Forgot password?</button>
                </div>
              )}

              {err && <div style={{ color: "var(--st-action)", fontSize: 13, marginBottom: 12, lineHeight: 1.45 }}>{err}</div>}

              {mode === "forgot" ? (
                <Button full variant="primary" onClick={forgot} disabled={loading}>{loading ? "Sending…" : "Email me a reset link"}</Button>
              ) : (
                <Button full variant="primary" onClick={submit} disabled={loading}>
                  {loading ? "Please wait…" : recovery ? "Update password" : mode === "signup" ? "Create account" : "Sign in"}
                </Button>
              )}

              {!recovery && mode !== "forgot" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
                    <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
                    <span className="mono" style={{ color: "var(--faint)", fontSize: 10 }}>or</span>
                    <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
                  </div>
                  <GoogleButton onClick={google} loading={gLoading} />
                </>
              )}
            </>
          )}
        </div>

        {!recovery && (
          <p style={{ textAlign: "center", fontSize: 14, color: "var(--ink-2)", marginTop: 20 }}>
            {mode === "forgot" ? (
              <button onClick={() => switchMode("signin")} style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 600, fontSize: 14 }}>← Back to sign in</button>
            ) : (
              <>
                {mode === "signup" ? "Already have an account? " : "New to Meridian? "}
                <button onClick={() => switchMode(mode === "signup" ? "signin" : "signup")}
                  style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 600, fontSize: 14 }}>
                  {mode === "signup" ? "Sign in" : "Create one"}
                </button>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

export default AuthScreen;
