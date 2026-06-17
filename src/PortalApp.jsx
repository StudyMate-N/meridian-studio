import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from './lib/supabase.js'
import Concierge from './Concierge.jsx'
import SupportChat from './SupportChat.jsx'
import { BriefFlow } from './HomePage.jsx'
import './portal.css'

const BRIEF_URL = '/#brief'

// ── HELPERS ──────────────────────────────────────────────────
function initials(name) {
  if (!name) return '?'
  return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function daysUntil(s) {
  if (!s) return null
  return Math.ceil((new Date(s + (String(s).includes('T') ? '' : 'T00:00:00')) - new Date()) / 86400000)
}
function fmtDue(s) {
  if (!s) return '—'
  const d = new Date(String(s).includes('T') ? s : s + 'T00:00:00')
  if (isNaN(d)) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function shortDate(s) {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d)) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function fmtMsgTime(d) {
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
function fmtBytes(n) {
  if (!n) return '—'
  if (n < 1048576) return Math.round(n / 1024) + ' KB'
  return (n / 1048576).toFixed(1) + ' MB'
}
function money(n) { return '$' + Number(n || 0).toLocaleString('en-US') }
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
function ext(name) { return (name || '').split('.').pop().toLowerCase() }

const STATUS_FLOW = ['new', 'brief_received', 'assigned', 'writing', 'in_review', 'delivered']
const STATUS_META = {
  new:            { label: 'New',         tone: 'tone-info',   strip: 's-new',    pct: 10 },
  brief_received: { label: 'Brief in',    tone: 'tone-warn',   strip: 's-new',    pct: 20 },
  brief:          { label: 'Brief in',    tone: 'tone-warn',   strip: 's-new',    pct: 20 },
  assigned:       { label: 'Assigned',    tone: 'tone-violet', strip: 's-new',    pct: 35 },
  writing:        { label: 'In progress', tone: 'tone-accent', strip: '',         pct: 60 },
  in_review:      { label: 'In review',   tone: 'tone-warn',   strip: 's-review', pct: 82 },
  review:         { label: 'In review',   tone: 'tone-warn',   strip: 's-review', pct: 82 },
  delivered:      { label: 'Delivered',   tone: 'tone-good',   strip: 's-done',   pct: 100 },
  revision:       { label: 'In revision', tone: 'tone-bad',    strip: 's-review', pct: 75 },
  closed:         { label: 'Closed',      tone: 'tone-mute',   strip: 's-done',   pct: 100 },
}
const PAY_META = {
  unpaid:       { label: 'Unpaid',       tone: 'tone-bad'  },
  deposit_paid: { label: 'Deposit paid', tone: 'tone-warn' },
  partial:      { label: 'Deposit paid', tone: 'tone-warn' },
  paid_in_full: { label: 'Paid in full', tone: 'tone-good' },
  paid:         { label: 'Paid in full', tone: 'tone-good' },
}
const FILE_TONE = { rubric: 'tone-violet', brief: 'tone-info', draft: 'tone-warn', final: 'tone-good', revision: 'tone-bad', other: 'tone-mute', ai_report: 'tone-info', plag_report: 'tone-violet' }

function statusSentence(o) {
  const w = o.writer?.name
  switch (o.status) {
    case 'new':
    case 'brief_received':
    case 'brief':          return 'Order received — your invoice arrives within 30 minutes to 2 hours'
    case 'assigned':       return w ? <span><strong>{w}</strong> is assigned — work begins once your deposit is in</span> : 'Expert assigned — work begins once your deposit is in'
    case 'writing':        return w ? <span><strong>{w}</strong> is working on your project</span> : 'Your expert is working on your project'
    case 'in_review':
    case 'review':         return 'In quality review — your work is being checked before release'
    case 'delivered':      return 'Completed — download your work from Files'
    case 'revision':       return w ? <span><strong>{w}</strong> is revising based on your feedback</span> : 'Revision in progress'
    case 'closed':         return 'Completed and closed'
    default:               return 'In progress'
  }
}

// derived money from real order rows
// Money source of truth: the admin-confirmed quote wins; otherwise the brief's
// rough estimate; otherwise 0 (UI then shows "quote pending" instead of a
// misleading per-page-rate number).
function orderEstimate(o) {
  if (o.quote_total != null) return o.quote_total
  if (o.estimate_usd != null) return o.estimate_usd
  return 0
}
function orderDeposit(o) {
  if (o.quote_deposit != null) return o.quote_deposit
  if (o.deposit_usd != null) return o.deposit_usd
  const e = orderEstimate(o)
  if (!e) return 0
  const p = o.payment_status || o.payment
  if (p === 'paid_in_full' || p === 'paid') return e
  if (p === 'deposit_paid' || p === 'partial') return Math.round(e / 2)
  return 0
}
// normalize a DB order into the shape the screens expect
function viewOrder(o) {
  return {
    ...o,
    title: o.title || o.program || o.scope_label || 'Order',
    level: o.level_label || o.level || '—',
    scope: o.scope_label || o.scope || o.scope_id || '—',
    due: o.due_date || o.due || null,
    estimate_usd: orderEstimate(o),
    deposit_usd: orderDeposit(o),
    payment_status: o.payment_status || o.payment || 'unpaid',
    writer: o.writer || (o.writer_name ? { name: o.writer_name } : null),
  }
}

// ── ICONS ────────────────────────────────────────────────────
const Ico = {
  arrow: (p = {}) => <svg className="arr" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>,
  chev:  (p = {}) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 6l6 6-6 6"/></svg>,
  doc:   (p = {}) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>,
  plus:  (p = {}) => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  x:     (p = {}) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 6L6 18M6 6l12 12"/></svg>,
  msg:   (p = {}) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/></svg>,
  file:  (p = {}) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>,
  user:  (p = {}) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="8" r="3.4"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>,
  logout:(p = {}) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
  info:  (p = {}) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>,
  inbox: (p = {}) => <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 12h5l2 3h4l2-3h5"/><path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/></svg>,
  orders:(p = {}) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  download: (p = {}) => <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M7 2v8M4 7l3 3 3-3M2 12h10"/></svg>,
}

// ── BADGE ────────────────────────────────────────────────────
function Badge({ status, payment }) {
  const cfg = status ? STATUS_META[status] : PAY_META[payment]
  if (!cfg) return null
  return (
    <span className={'badge ' + cfg.tone}>
      <span className="dot" style={{ background: 'currentColor' }}></span>
      {cfg.label}
    </span>
  )
}

// ── SIGN IN ──────────────────────────────────────────────────
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"/>
    </svg>
  )
}

function SignIn() {
  // Deep-link: /workspace?mode=signup opens the sign-up view (used by the
  // "Create account" CTAs on the Getting Started page); otherwise sign in.
  const [mode, setMode] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('mode') === 'signup' ? 'signup' : 'signin' }
    catch { return 'signin' }
  })   // signin | signup | forgot
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [sent, setSent] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [err, setErr] = useState('')
  const REDIRECT = 'https://primemeridian.academy/workspace'
  function switchMode(m) { setErr(''); setSent(false); setConfirmSent(false); setMode(m) }

  async function submit(e) {
    e.preventDefault()
    if (!/.+@.+\..+/.test(email.trim())) { setErr('Enter a valid email address.'); return }
    if (!password) { setErr('Enter your password.'); return }
    setErr(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    setLoading(false)
    if (error) { setErr(/invalid login/i.test(error.message) ? 'That email and password don’t match. Use the password you set up, or reset it with “Forgot your password?”.' : error.message); return }
    // onAuthStateChange in the root takes over from here.
  }

  async function sendReset(e) {
    e.preventDefault()
    if (!/.+@.+\..+/.test(email.trim())) { setErr('Enter a valid email address.'); return }
    setErr(''); setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: REDIRECT + '?type=recovery' })
    setLoading(false)
    if (error) { setErr(error.message); return }
    setSent(true)
  }

  async function signUp(e) {
    e.preventDefault()
    if (!name.trim()) { setErr('Enter your first name.'); return }
    if (!/.+@.+\..+/.test(email.trim())) { setErr('Enter a valid email address.'); return }
    if (password.length < 6) { setErr('Use at least 6 characters.'); return }
    setErr(''); setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { name: name.trim() }, emailRedirectTo: REDIRECT },
    })
    setLoading(false)
    if (error) { setErr(error.message); return }
    // Supabase returns a user with zero identities when the email is already registered.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setErr('An account with this email already exists — sign in instead.'); setMode('signin'); return
    }
    if (!data.session) { setConfirmSent(true); return }   // email confirmation required
    // otherwise onAuthStateChange in the root takes over (signed in).
  }

  async function google() {
    setErr(''); setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: REDIRECT, queryParams: { prompt: 'select_account' } },
    })
    if (error) {
      setGoogleLoading(false)
      setErr(/not enabled|unsupported provider/i.test(error.message)
        ? "Google sign-in isn't enabled yet — use email and password for now."
        : error.message)
    }
    // on success the browser redirects to Google; the root listener handles the return.
  }

  return (
    <div className="auth">
      <aside className="auth-aside">
        <a className="brand" href="/">
          <span className="mk">M</span>
          <span>
            <span className="nm" style={{ display: 'block' }}>Meridian Studio</span>
            <span className="tg">Client workspace</span>
          </span>
        </a>
        <div>
          <p className="auth-quote">
            "They didn't just hand me a paper — they walked me through it until I could{' '}
            <em>defend every line.</em>"
          </p>
          <p className="auth-attr">— Dana R. · DNP Candidate</p>
        </div>
        <div className="auth-stats">
          <div className="st"><div className="n">4.9★</div><div className="l">Student rating</div></div>
          <div className="st"><div className="n">98%</div><div className="l">Delivered on time</div></div>
          <div className="st"><div className="n">100%</div><div className="l">Repeat specialists</div></div>
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          {mode === 'signin' && (
            <>
              <h1>Welcome <em>back.</em></h1>
              <p className="lede">Sign in to track your orders, message your expert, and pick up where you left off.</p>
              <button type="button" className="btn btn-ghost btn-lg auth-google" onClick={google} disabled={googleLoading}>
                <GoogleMark /> {googleLoading ? 'Connecting…' : 'Continue with Google'}
              </button>
              <div className="auth-div">or</div>
              <form className="auth-form" onSubmit={submit} noValidate>
                <div className="fld">
                  <label htmlFor="si-email">Email address</label>
                  <input id="si-email" type="email" autoComplete="email" placeholder="you@email.com"
                    value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="fld">
                  <label htmlFor="si-pass">Password</label>
                  <input id="si-pass" type="password" autoComplete="current-password" placeholder="Your password"
                    value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                {err && <div style={{ color: 'var(--bad)', fontSize: 13 }} role="alert">{err}</div>}
                <button type="submit" className="btn btn-accent btn-lg" style={{ width: '100%' }} disabled={loading}>
                  {loading ? 'Signing in…' : <>Sign in {Ico.arrow()}</>}
                </button>
                <p className="auth-foot" style={{ marginTop: 4 }}>
                  <a href="#" onClick={e => { e.preventDefault(); setErr(''); setSent(false); setMode('forgot') }}>Forgot your password?</a>
                </p>
                <p className="auth-note">
                  {Ico.info()}
                  <span>First time here? Use the password you chose when you started your brief — or reset it with “Forgot your password?”.</span>
                </p>
              </form>
              <div className="auth-div">new to meridian?</div>
              <p className="auth-foot">New here? <a href="#" onClick={e => { e.preventDefault(); switchMode('signup') }}>Create an account →</a></p>
              <p className="auth-foot" style={{ marginTop: 8 }}>Don't have an order yet? <a href={BRIEF_URL}>Start a brief →</a></p>
            </>
          )}
          {mode === 'signup' && !confirmSent && (
            <>
              <h1>Create your <em>account.</em></h1>
              <p className="lede">Set up your workspace to track orders, message your expert, and keep everything in one place.</p>
              <button type="button" className="btn btn-ghost btn-lg auth-google" onClick={google} disabled={googleLoading}>
                <GoogleMark /> {googleLoading ? 'Connecting…' : 'Continue with Google'}
              </button>
              <div className="auth-div">or</div>
              <form className="auth-form" onSubmit={signUp} noValidate>
                <div className="fld">
                  <label htmlFor="su-name">First name</label>
                  <input id="su-name" type="text" autoComplete="given-name" placeholder="First name is fine"
                    value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="fld">
                  <label htmlFor="su-email">Email address</label>
                  <input id="su-email" type="email" autoComplete="email" placeholder="you@email.com"
                    value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="fld">
                  <label htmlFor="su-pass">Password</label>
                  <input id="su-pass" type="password" autoComplete="new-password" placeholder="At least 6 characters"
                    value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                {err && <div style={{ color: 'var(--bad)', fontSize: 13 }} role="alert">{err}</div>}
                <button type="submit" className="btn btn-accent btn-lg" style={{ width: '100%' }} disabled={loading}>
                  {loading ? 'Creating your account…' : <>Create account {Ico.arrow()}</>}
                </button>
              </form>
              <div className="auth-div">already with us?</div>
              <p className="auth-foot">Already have an account? <a href="#" onClick={e => { e.preventDefault(); switchMode('signin') }}>Sign in →</a></p>
            </>
          )}
          {mode === 'signup' && confirmSent && (
            <div className="auth-ok">
              <span className="ck">{Ico.msg({ width: 26, height: 26 })}</span>
              <h1>Confirm your <em>email.</em></h1>
              <p className="lede" style={{ marginTop: 14 }}>
                We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.
              </p>
              <p className="auth-foot" style={{ marginTop: 22 }}>
                <a href="#" onClick={e => { e.preventDefault(); switchMode('signin') }}>← Back to sign in</a>
              </p>
            </div>
          )}
          {mode === 'forgot' && !sent && (
            <>
              <h1>Reset your <em>password.</em></h1>
              <p className="lede">Enter your email and we'll send you a secure link to set a new password.</p>
              <form className="auth-form" onSubmit={sendReset} noValidate>
                <div className="fld">
                  <label htmlFor="fp-email">Email address</label>
                  <input id="fp-email" type="email" autoComplete="email" placeholder="you@email.com"
                    value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                {err && <div style={{ color: 'var(--bad)', fontSize: 13 }} role="alert">{err}</div>}
                <button type="submit" className="btn btn-accent btn-lg" style={{ width: '100%' }} disabled={loading}>
                  {loading ? 'Sending…' : <>Email me a reset link {Ico.arrow()}</>}
                </button>
                <p className="auth-foot" style={{ marginTop: 4 }}>
                  <a href="#" onClick={e => { e.preventDefault(); setErr(''); setMode('signin') }}>← Back to sign in</a>
                </p>
              </form>
            </>
          )}
          {mode === 'forgot' && sent && (
            <div className="auth-ok">
              <span className="ck">{Ico.msg({ width: 26, height: 26 })}</span>
              <h1>Check your <em>inbox.</em></h1>
              <p className="lede" style={{ marginTop: 14 }}>
                We sent a password-reset link to <strong>{email}</strong>. Click it to set a new password.
              </p>
              <p className="auth-foot" style={{ marginTop: 22 }}>
                <a href="#" onClick={e => { e.preventDefault(); setSent(false); setMode('signin') }}>← Back to sign in</a>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ── SET NEW PASSWORD (after a recovery link) ─────────────────
function SetNewPassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (password.length < 5) { setErr('Use at least 5 characters.'); return }
    if (password !== confirm) { setErr('Those passwords don’t match.'); return }
    setErr(''); setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setErr(error.message); return }
    onDone?.()
  }

  return (
    <div className="auth">
      <aside className="auth-aside">
        <a className="brand" href="/">
          <span className="mk">M</span>
          <span><span className="nm" style={{ display: 'block' }}>Meridian Studio</span><span className="tg">Client workspace</span></span>
        </a>
        <div>
          <p className="auth-quote">"One secure password, and you're back in — across every device."</p>
          <p className="auth-attr">— Meridian Studio</p>
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <h1>Set a new <em>password.</em></h1>
          <p className="lede">Choose a password you'll remember — you'll use it to sign in from now on.</p>
          <form className="auth-form" onSubmit={submit} noValidate>
            <div className="fld">
              <label htmlFor="np1">New password</label>
              <input id="np1" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div className="fld">
              <label htmlFor="np2">Confirm password</label>
              <input id="np2" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>
            {err && <div style={{ color: 'var(--bad)', fontSize: 13 }} role="alert">{err}</div>}
            <button type="submit" className="btn btn-accent btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Saving…' : <>Save password {Ico.arrow()}</>}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

// ── TOP-NAV SHELL ────────────────────────────────────────────
function Shell({ user, profile, orders, lastMessages, route, setRoute, onSignOut, setLayout, goNewBrief, children }) {
  const [menu, setMenu] = useState(false)
  useEffect(() => {
    const close = e => { if (!e.target.closest('.acct') && !e.target.closest('.menu')) setMenu(false) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const name = profile?.name || user?.email?.split('@')[0] || 'Account'
  const ini = profile?.name ? initials(profile.name) : (user?.email?.[0] || '?').toUpperCase()
  const unread = orders.some(o => { const lm = lastMessages[o.id]; return lm && lm.from === 'them' })

  return (
    <div>
      <header className="pnav">
        <div className="pnav-inner">
          <button className="brand" onClick={() => setRoute('orders')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <span className="mk">M</span>
            <span>
              <span className="nm" style={{ display: 'block' }}>Meridian Studio</span>
              <span className="tg">Client workspace</span>
            </span>
          </button>
          <nav className="pnav-links">
            {[['orders', 'Your orders'], ['messages', 'Messages'], ['profile', 'Profile']].map(([id, l]) => (
              <button key={id} className={(route === id || (route === 'order-detail' && id === 'orders')) ? 'on' : ''}
                onClick={() => setRoute(id)}>
                {l}
                {id === 'messages' && unread && (
                  <span className="badge tone-accent" style={{ marginLeft: 6, padding: '1px 7px', fontSize: 10.5 }}>New</span>
                )}
              </button>
            ))}
          </nav>
          <div className="pnav-right">
            <button className="sb-toggle" onClick={() => setLayout('sidebar')} title="Switch to sidebar">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><rect x="1" y="1" width="4" height="14" rx="1"/><rect x="7" y="1" width="8" height="2.2" rx="1" opacity=".5"/><rect x="7" y="5" width="8" height="2.2" rx="1" opacity=".5"/><rect x="7" y="9" width="5" height="2.2" rx="1" opacity=".4"/></svg>
            </button>
            <button className="btn btn-accent btn-sm" onClick={goNewBrief}>{Ico.plus()} New brief</button>
            <button className="acct" onClick={() => setMenu(m => !m)}>
              <span className="who">
                <span className="n">{name}</span>
                <span className="e">{user?.email}</span>
              </span>
              <span className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}>{ini}</span>
            </button>
            {menu && (
              <div className="menu">
                <button onClick={() => { setRoute('profile'); setMenu(false) }}>{Ico.user()} My profile</button>
                <button onClick={() => { setRoute('messages'); setMenu(false) }}>{Ico.msg()} Messages</button>
                <div className="sep"></div>
                <button onClick={() => { setMenu(false); onSignOut() }}>{Ico.logout()} Sign out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {children}

      <nav className="bottom-nav">
        {[['orders', Ico.orders, 'Orders'], ['messages', Ico.msg, 'Messages'], ['profile', Ico.user, 'Profile']].map(([id, Icon, l]) => (
          <button key={id} className={(route === id || (route === 'order-detail' && id === 'orders')) ? 'on' : ''}
            onClick={() => setRoute(id)}>
            <Icon width={20} height={20} />{l}
          </button>
        ))}
      </nav>
    </div>
  )
}

// ── SIDEBAR SHELL ────────────────────────────────────────────
function SidebarShell({ user, profile, orders, lastMessages, route, setRoute, onSignOut, setLayout, filter, setFilter, goNewBrief, onSupport, children }) {
  const name = profile?.name || user?.email?.split('@')[0] || 'Account'
  const ini = profile?.name ? initials(profile.name) : (user?.email?.[0] || '?').toUpperCase()
  const unread = orders.some(o => { const lm = lastMessages[o.id]; return lm && lm.from === 'them' })
  const isOn = id => route === id || (route === 'order-detail' && id === 'orders')
  const counts = {
    all: orders.length,
    active: orders.filter(o => !['delivered', 'closed', 'revision'].includes(o.status)).length,
    revision: orders.filter(o => o.status === 'revision').length,
    done: orders.filter(o => ['delivered', 'closed'].includes(o.status)).length,
  }
  const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER || '12057279363'
  const openOrders = orders.filter(o => !['delivered', 'closed'].includes(o.status))
  const inProgress = openOrders.length
  const balance = openOrders.reduce((s, o) => s + Math.max(0, (o.estimate_usd || 0) - (o.deposit_usd || 0)), 0)
  const nextDue = openOrders.map(o => o.due).filter(Boolean).sort()[0]
  const glanceLbl = { fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.05em', color: 'rgba(248,243,236,.5)' }
  const supportBtn = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 8px', borderRadius: 9, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', color: 'rgba(248,243,236,.92)', fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }

  return (
    <div className="sb-layout">
      <aside className="sidebar">
        <div className="sb-brand">
          <button onClick={() => setRoute('orders')} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
            <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 21, flexShrink: 0 }}>M</span>
            <span>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 16.5, color: '#fff', display: 'block', letterSpacing: '-.01em', lineHeight: 1.2 }}>Meridian Studio</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(248,243,236,.35)', display: 'block', marginTop: 2 }}>Client workspace</span>
            </span>
          </button>
        </div>

        <nav className="sb-nav">
          <div className="sb-label">Workspace</div>
          <button className={'sb-item' + (isOn('orders') ? ' on' : '')} onClick={() => setRoute('orders')}>
            <Ico.orders width={16} height={16} /> Your orders
          </button>
          {isOn('orders') && (
            <div className="sb-sub-filter">
              {[['active', 'Active', counts.active], ['revision', 'Revision', counts.revision], ['done', 'Completed', counts.done], ['all', 'All', counts.all]]
                .filter(([key, , count]) => key === 'all' || count > 0)
                .map(([key, label, count]) => (
                  <button key={key} className={filter === key ? 'on' : ''} onClick={() => { setFilter(key); if (route === 'order-detail') setRoute('orders') }}>
                    {label} <span style={{ opacity: .6 }}>{count}</span>
                  </button>
                ))}
            </div>
          )}
          <button className={'sb-item' + (isOn('messages') ? ' on' : '')} onClick={() => setRoute('messages')}>
            <Ico.msg width={16} height={16} /> Messages
            {unread && <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }}></span>}
          </button>
          <button className={'sb-item' + (isOn('profile') ? ' on' : '')} onClick={() => setRoute('profile')}>
            <Ico.user width={16} height={16} /> Profile
          </button>

          {orders.length > 0 && (
            <>
              <div className="sb-label" style={{ marginTop: 20 }}>At a glance</div>
              <div style={{ padding: '2px 14px 4px', display: 'flex', flexDirection: 'column', gap: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={glanceLbl}>IN PROGRESS</span>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600, color: inProgress > 0 ? 'var(--accent)' : '#fff' }}>{inProgress}</span>
                </div>
                {nextDue && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={glanceLbl}>NEXT DUE</span>
                    <span style={{ fontSize: 12.5, color: 'rgba(248,243,236,.85)' }}>{fmtDue(nextDue)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={glanceLbl}>BALANCE</span>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600, color: balance > 0 ? 'var(--accent)' : '#fff' }}>{money(balance)}</span>
                </div>
              </div>
            </>
          )}

          <div className="sb-label" style={{ marginTop: 20 }}>Support</div>
          <div style={{ padding: '2px 12px 4px', display: 'flex', gap: 8 }}>
            <button style={supportBtn} onClick={() => (onSupport ? onSupport() : (window.MeridianOpenConcierge && window.MeridianOpenConcierge()))}>
              {Ico.msg({ width: 15, height: 15 })} Message us
            </button>
            <a style={{ ...supportBtn, textDecoration: 'none' }} href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.8c2.18 0 4.22.85 5.76 2.39a8.07 8.07 0 0 1 2.39 5.72c0 4.49-3.65 8.13-8.14 8.13a8.2 8.2 0 0 1-4.16-1.14l-.3-.18-3.11.82.83-3.03-.19-.31a8.1 8.1 0 0 1-1.24-4.3c0-4.48 3.65-8.13 8.14-8.13zm4.47 10.27c-.24-.12-1.43-.71-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.95-1.2-.72-.64-1.2-1.44-1.34-1.68-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.57.18 1.1.16 1.51.1.46-.07 1.43-.58 1.63-1.15.2-.57.2-1.06.14-1.15-.06-.1-.22-.16-.46-.28z"/></svg>
              WhatsApp
            </a>
          </div>
        </nav>

        <div className="sb-foot">
          <button className="btn btn-accent" style={{ width: '100%', justifyContent: 'center', fontSize: 13.5, padding: '11px 14px' }} onClick={goNewBrief}>
            {Ico.plus()} New brief
          </button>
          <div style={{ height: 1, background: 'rgba(255,255,255,.07)', margin: '4px 0' }}></div>
          <div className="sb-acct">
            <span className="avatar" style={{ width: 30, height: 30, fontSize: 12, background: 'rgba(255,255,255,.14)', flexShrink: 0 }}>{ini}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(248,243,236,.9)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
              <span style={{ fontSize: 10, color: 'rgba(248,243,236,.36)', fontFamily: 'var(--mono)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={onSignOut} className="layout-toggle" style={{ flex: 1 }}>
              {Ico.logout({ width: 13, height: 13 })} Sign out
            </button>
            <button className="layout-toggle" onClick={() => setLayout('top')}>
              <svg viewBox="0 0 16 12" width="13" height="11" fill="currentColor"><rect x="0" y="0" width="16" height="2.5" rx="1"/><rect x="0" y="5" width="11" height="2" rx="1" opacity=".6"/><rect x="0" y="9.5" width="7" height="2" rx="1" opacity=".4"/></svg>
              Top nav
            </button>
          </div>
        </div>
      </aside>

      <main className="sb-main">{children}</main>

      <nav className="bottom-nav">
        {[['orders', Ico.orders, 'Orders'], ['messages', Ico.msg, 'Messages'], ['profile', Ico.user, 'Profile']].map(([id, Icon, l]) => (
          <button key={id} className={isOn(id) ? 'on' : ''} onClick={() => setRoute(id)}>
            <Icon width={20} height={20} />{l}
          </button>
        ))}
      </nav>
    </div>
  )
}

// ── ORDER CARD ───────────────────────────────────────────────
function OrderCard({ o, onClick }) {
  const m = STATUS_META[o.status] || {}
  const d = daysUntil(o.due)
  const isActive = !['delivered', 'closed'].includes(o.status)
  const soon = isActive && d !== null && d <= 5
  return (
    <button className={'ord-card ' + (m.strip || '')} onClick={() => onClick(o)}>
      <span className="c-strip"></span>
      <span className="c-body">
        <span className="c-top">
          <span className="c-left">
            <span className="c-ref">{o.ref}</span>
            <span className="c-title">{o.title}</span>
            <span className="c-meta">
              {o.level}
              <span className="d"></span>
              {o.scope}
              {o.writer?.name && <><span className="d"></span>{o.writer.name}</>}
            </span>
            <span className="c-sentence">{statusSentence(o)}</span>
          </span>
          <span className="c-right">
            <Badge status={o.status} />
            <span className="c-due-lbl">{isActive ? 'Due' : 'Delivered'}</span>
            <span className="c-due-val">{fmtDue(o.due)}</span>
            {d !== null && isActive && (
              <span className={'c-days' + (soon ? ' urgent' : '')}>
                {d === 0 ? 'Today' : d < 0 ? `${Math.abs(d)}d overdue` : `${d}d`}
              </span>
            )}
            <span className="c-chev">{Ico.chev()}</span>
          </span>
        </span>
        <span className="c-track">
          <span className="c-fill" style={{ width: (m.pct || 0) + '%' }}></span>
        </span>
      </span>
    </button>
  )
}

// ── MY ORDERS ────────────────────────────────────────────────
function MyOrders({ user, profile, orders, loading, onOpen, filter, setFilter, goNewBrief }) {
  const firstName = profile?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'
  const activeOrders = orders.filter(o => !['delivered', 'closed'].includes(o.status))
  const nextDue = [...activeOrders].filter(o => o.due).sort((a, b) => new Date(a.due) - new Date(b.due))[0]
  const d = nextDue ? daysUntil(nextDue.due) : null

  const ctxLine = loading ? 'Loading your orders…'
    : activeOrders.length === 0 ? 'All caught up — start a new brief when you\'re ready.'
    : nextDue ? `${activeOrders.length} active ${activeOrders.length === 1 ? 'order' : 'orders'} · Next deadline ${d === 0 ? 'today' : d === 1 ? 'tomorrow' : d < 0 ? 'overdue' : `in ${d} days`}`
    : `${activeOrders.length} active orders in progress`

  const counts = {
    all: orders.length,
    active: orders.filter(o => !['delivered', 'closed', 'revision'].includes(o.status)).length,
    revision: orders.filter(o => o.status === 'revision').length,
    done: orders.filter(o => ['delivered', 'closed'].includes(o.status)).length,
  }
  const list = orders.filter(o =>
    filter === 'all' ? true
      : filter === 'active' ? !['delivered', 'closed', 'revision'].includes(o.status)
      : filter === 'revision' ? o.status === 'revision'
      : ['delivered', 'closed'].includes(o.status)
  )

  return (
    <main className="pwrap">
      <div className="greet-bar">
        <div>
          <h1>{greeting()}, <em>{firstName}.</em></h1>
          <p className="ctx">{ctxLine}</p>
        </div>
        <button className="btn btn-accent btn-lg" onClick={goNewBrief}>{Ico.plus()} New brief</button>
      </div>

      <div className="ptools">
        <div className="seg" role="tablist">
          {[['active', 'Active'], ['revision', 'Revision'], ['done', 'Completed'], ['all', 'All']]
            .filter(([id]) => id === 'all' || (counts[id] || 0) > 0)
            .map(([id, l]) => (
              <button key={id} role="tab" className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>
                {l}<span className="ct">{counts[id]}</span>
              </button>
            ))}
        </div>
        <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
          {loading ? 'Loading…' : `${list.length} ${list.length === 1 ? 'order' : 'orders'}`}
        </span>
      </div>

      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 13 }}>Loading your orders…</div>
      ) : list.length > 0 ? (
        <div className="olist">
          {list.map(o => <OrderCard key={o.id} o={o} onClick={onOpen} />)}
        </div>
      ) : (
        <div className="empty card" style={{ marginTop: 16 }}>
          <div className="ic">{Ico.inbox()}</div>
          <h3>{filter === 'done' ? 'Nothing completed yet' : filter === 'revision' ? 'No orders in revision' : 'No active orders'}</h3>
          <p>{filter === 'done' ? 'Delivered orders appear here once work is closed.' : filter === 'revision' ? 'Any orders sent back for revision will appear here.' : 'Start a brief and it\'ll appear here to track every step.'}</p>
          <div className="acts">
            <button className="btn btn-accent btn-lg" onClick={goNewBrief}>{Ico.plus()} Start a brief</button>
          </div>
        </div>
      )}
    </main>
  )
}

// ── PREVIEW MODAL (real file via signed URL) ─────────────────
function PreviewModal({ file, onClose }) {
  const [url, setUrl] = useState(null)
  const [state, setState] = useState('loading') // loading | frame | fallback | error
  const e = ext(file.name)
  const inlineable = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'txt'].includes(e)

  useEffect(() => {
    const h = ev => { if (ev.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  useEffect(() => {
    let active = true
    if (!file.path) { setState('error'); return }
    supabase.storage.from('order-files').createSignedUrl(file.path, 600).then(({ data, error }) => {
      if (!active) return
      if (error || !data?.signedUrl) { setState('error'); return }
      setUrl(data.signedUrl)
      setState(inlineable ? 'frame' : 'fallback')
    })
    return () => { active = false }
  }, [file.path])

  function download() {
    if (url) window.open(url, '_blank', 'noopener')
  }

  return (
    <div className="pv-overlay" onClick={ev => { if (ev.target === ev.currentTarget) onClose() }}>
      <div className="pv-modal">
        <div className="pv-toolbar">
          <span className="pv-kind">{file.kind}</span>
          <span className="pv-name">{file.name}</span>
          <button className="btn btn-sm btn-ghost" onClick={download} disabled={!url}>{Ico.download()} Download</button>
          <button className="pv-close" onClick={onClose} title="Close (Esc)">
            <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>
          </button>
        </div>
        <div className={'pv-body' + (state === 'frame' ? ' is-frame' : '')}>
          {state === 'loading' && <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 13 }}>Loading preview…</div>}
          {state === 'frame' && url && <iframe className="pv-frame" src={url} title={file.name}></iframe>}
          {(state === 'fallback' || state === 'error') && (
            <div className="pv-fallback">
              <div className="pv-fic">{Ico.file({ width: 26, height: 26 })}</div>
              <h4>{state === 'error' ? 'Preview unavailable' : 'Preview not supported'}</h4>
              <p>
                {state === 'error'
                  ? 'We couldn\'t load this file right now. Try downloading it instead.'
                  : `${e.toUpperCase()} files can't be previewed inline. Download to open it on your device.`}
              </p>
              {url && <button className="btn btn-accent" onClick={download}>{Ico.download()} Download file</button>}
            </div>
          )}
        </div>
        <div className="pv-foot">
          <span className="pv-pages">{fmtBytes(file.size)}{file.name.includes('.') ? ' · ' + e.toUpperCase() : ''}</span>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>Close preview</button>
        </div>
      </div>
    </div>
  )
}

// ── NEXT STEP CARD ───────────────────────────────────────────
function NextStep({ o, setTab }) {
  const steps = {
    new:            { label: 'What happens next', action: false, text: 'We\'ve received your order. Your invoice arrives within 30 minutes to 2 hours — once it\'s settled, your assigned expert begins right away.' },
    brief_received: { label: 'What happens next', action: false, text: 'We\'ve received your order. Your invoice arrives within 30 minutes to 2 hours — once it\'s settled, your assigned expert begins right away.' },
    brief:          { label: 'What happens next', action: false, text: 'We\'ve received your order. Your invoice arrives within 30 minutes to 2 hours — once it\'s settled, your assigned expert begins right away.' },
    assigned:       { label: 'Action needed', action: true, text: 'Your expert is assigned. Settle your invoice to start the work, and say hello in the conversation.', btn: 'Open conversation', tab: 'chat' },
    writing:        { label: 'What happens next', action: false, text: 'Your expert is actively working. Track each stage right here — we\'ll notify you as your project progresses.' },
    in_review:      { label: 'What happens next', action: false, text: 'Your work is in final quality review. We\'ll release it here the moment our QC team approves it.' },
    review:         { label: 'What happens next', action: false, text: 'Your work is in final quality review. We\'ll release it here the moment our QC team approves it.' },
    revision:       { label: 'What happens next', action: false, text: 'Your expert is revising based on your feedback. Turnaround is typically 24 hours.' },
    delivered:      { label: 'Order complete', action: true, text: 'Your completed work has been released and is ready to download.', btn: 'Go to Files', tab: 'files' },
  }
  const s = steps[o.status]
  if (!s) return null
  return (
    <div className={'next-step' + (s.action ? ' action' : '')}>
      <div className="ns-label">{s.label}</div>
      <div className="ns-text">{s.text}</div>
      {s.btn && <div className="ns-actions"><button className={'btn btn-sm ' + (s.action ? 'btn-accent' : 'btn-ghost')} onClick={() => setTab(s.tab)}>{s.btn}</button></div>}
    </div>
  )
}

// ── SUBMISSION PACKAGE ───────────────────────────────────────
function SubmissionPackage({ sub, onPreview, onDownload }) {
  function scoreBadge(score, type) {
    if (score === null || score === undefined) return null
    const ok = type === 'ai' ? score <= 5 : score <= 10
    const mid = type === 'ai' ? score <= 15 : score <= 20
    const col = ok ? '#1f8a5b' : mid ? '#b07d20' : '#b83232'
    const bg = ok ? 'rgba(31,138,91,.08)' : mid ? 'rgba(176,125,32,.08)' : 'rgba(184,50,50,.08)'
    const label = type === 'ai' ? `${score}% AI` : `${score}% match`
    return <span className="pkg-score" style={{ color: col, background: bg, border: `1px solid ${col}33` }}>{label}</span>
  }
  const rows = [
    sub.work && { file: sub.work, type: 'work', label: 'Completed work', dot: 'var(--accent)', score: null },
    sub.aiReport && { file: sub.aiReport, type: 'ai', label: 'AI report', dot: 'oklch(52% .18 256)', score: sub.aiReport.score },
    sub.plagReport && { file: sub.plagReport, type: 'plag', label: 'Plagiarism report', dot: 'oklch(52% .18 160)', score: sub.plagReport.score },
  ].filter(Boolean)
  const workRow = rows.find(r => r.type === 'work')
  const verifyRows = rows.filter(r => r.type !== 'work')

  function PkgRow({ file, type, label, dot, score }) {
    return (
      <div className="pkg-row">
        <span className="pkg-dot" style={{ background: dot }}></span>
        <div className="pkg-info">
          <span className="pkg-lbl">{label}</span>
          <span className="pkg-fn">{file.name}</span>
        </div>
        {scoreBadge(score, type)}
        <div className="pkg-acts">
          <button className="btn btn-sm btn-ghost" onClick={() => onPreview(file)}>Preview</button>
          <button className="btn btn-sm btn-ghost" style={{ padding: '5px 8px' }} onClick={() => onDownload(file)}>
            {Ico.download()}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="sub-pkg">
      <div className="pkg-hd">
        <span className="pkg-ver">Submission {sub.version}</span>
        <span className="pkg-date mono">{sub.date}</span>
        {sub.submittedBy && <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginLeft: 'auto' }}>by {sub.submittedBy}</span>}
      </div>
      {workRow && <PkgRow {...workRow} />}
      {verifyRows.length > 0 && (
        <>
          <div className="pkg-sep">Verification documents</div>
          {verifyRows.map(r => <PkgRow key={r.file.id} {...r} />)}
        </>
      )}
    </div>
  )
}

// build {uploads, submissions} from raw order_files rows
function buildFileView(files, userId, writerName) {
  const mapFile = f => ({
    id: f.id, name: f.file_name, kind: f.kind || 'other', size: f.size_bytes,
    score: f.score, path: f.file_path, from: f.uploaded_by === userId ? 'me' : 'them',
    date: shortDate(f.created_at), created_at: f.created_at,
  })
  const byCreated = (a, b) => new Date(a.created_at) - new Date(b.created_at)
  const shared = [], works = [], ai = [], plag = []
  files.forEach(f => {
    if (f.kind === 'ai_report') ai.push(f)
    else if (f.kind === 'plag_report') plag.push(f)
    else if (['draft', 'final', 'revision'].includes(f.kind)) works.push(f)
    else shared.push(f)
  })
  works.sort(byCreated); ai.sort(byCreated); plag.sort(byCreated)

  const hasVersion = [...works, ...ai, ...plag].some(f => f.version)
  let submissions = []

  if (hasVersion) {
    const vmap = {}
    const add = (f, slot) => {
      const v = f.version || '—'
      vmap[v] = vmap[v] || { id: 'v-' + v, version: v, date: shortDate(f.created_at), submittedBy: writerName || null }
      vmap[v][slot] = mapFile(f)
    }
    works.forEach(f => add(f, 'work')); ai.forEach(f => add(f, 'aiReport')); plag.forEach(f => add(f, 'plagReport'))
    submissions = Object.values(vmap)
  } else if (works.length) {
    submissions = works.map((w, i) => ({
      id: w.id,
      version: works.length > 1 ? 'v' + (i + 1) : (w.kind === 'final' ? 'Final' : 'v1'),
      date: shortDate(w.created_at),
      work: mapFile(w),
      submittedBy: writerName || null,
    }))
    const last = submissions[submissions.length - 1]
    if (ai.length) last.aiReport = mapFile(ai[ai.length - 1])
    if (plag.length) last.plagReport = mapFile(plag[plag.length - 1])
  } else if (ai.length || plag.length) {
    submissions = [{
      id: 'reports', version: 'Reports', date: shortDate((ai[0] || plag[0]).created_at),
      aiReport: ai[0] && mapFile(ai[0]), plagReport: plag[0] && mapFile(plag[0]),
      submittedBy: writerName || null,
    }]
  }
  return { uploads: shared.map(mapFile), submissions }
}

// ── ORDER DETAIL ─────────────────────────────────────────────
function OrderDetail({ o, user, profile, initialTab = 'chat', onBack }) {
  const [tab, setTab] = useState(initialTab)
  const [draft, setDraft] = useState('')
  const [preview, setPreview] = useState(null)
  const [thread, setThread] = useState([])
  const [msgsLoading, setMsgsLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [fileView, setFileView] = useState({ uploads: [], submissions: [] })
  const [uploading, setUploading] = useState(false)
  const endRef = useRef(null)
  const fileInputRef = useRef(null)

  const m = STATUS_META[o.status] || {}
  const curIdx = STATUS_FLOW.indexOf(o.status)
  const eff = o.status === 'revision' ? STATUS_FLOW.indexOf('in_review')
    : o.status === 'closed' ? STATUS_FLOW.length - 1 : curIdx
  const myInitials = profile?.name ? initials(profile.name) : (user?.email?.[0] || '?').toUpperCase()

  function mapMsg(r) {
    return {
      id: r.id,
      from: r.sender_id && r.sender_id === user.id ? 'me' : 'them',
      name: r.sender_name || o.writer?.name || 'Meridian',
      body: r.body,
      ts: fmtMsgTime(new Date(r.created_at)),
    }
  }

  // messages + realtime
  useEffect(() => {
    let active = true
    setMsgsLoading(true)
    supabase.from('order_messages').select('*').eq('order_id', o.id).eq('is_internal', false)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (active) { setThread((data || []).map(mapMsg)); setMsgsLoading(false) } })
    const ch = supabase.channel(`order-${o.id}-msgs`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_messages', filter: `order_id=eq.${o.id}` },
        payload => {
          if (payload.new.is_internal) return
          setThread(t => t.some(x => x.id === payload.new.id) ? t : [...t, mapMsg(payload.new)])
        })
      .subscribe()
    return () => { active = false; supabase.removeChannel(ch) }
  }, [o.id])

  // files (+ realtime so a delivery appears the moment it lands)
  useEffect(() => {
    let active = true
    const load = () => supabase.from('order_files').select('*').eq('order_id', o.id).order('created_at', { ascending: true })
      .then(({ data }) => { if (active) setFileView(buildFileView(data || [], user.id, o.writer?.name)) })
    load()
    const ch = supabase.channel(`order-${o.id}-files`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_files', filter: `order_id=eq.${o.id}` }, load)
      .subscribe()
    return () => { active = false; supabase.removeChannel(ch) }
  }, [o.id])

  useEffect(() => {
    if (endRef.current) {
      const el = endRef.current.closest('.thread')
      if (el) el.scrollTop = el.scrollHeight
    }
  }, [thread, tab])

  async function send(e) {
    e.preventDefault()
    const b = draft.trim()
    if (!b || sending) return
    setSending(true); setDraft('')
    const { data, error } = await supabase.from('order_messages').insert({
      order_id: o.id, sender_id: user.id, sender_name: profile?.name || user.email, body: b, is_internal: false,
    }).select().single()
    setSending(false)
    if (error) { setDraft(b); console.error(error); return }
    if (data) setThread(t => t.some(x => x.id === data.id) ? t : [...t, mapMsg(data)])
  }

  async function download(f) {
    const { data, error } = await supabase.storage.from('order-files').createSignedUrl(f.path, 120)
    if (error || !data?.signedUrl) { console.error(error); return }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  async function onUpload(file) {
    if (!file || uploading) return
    setUploading(true)
    const path = `${o.id}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`
    const { error: upErr } = await supabase.storage.from('order-files').upload(path, file)
    if (upErr) { setUploading(false); console.error(upErr); return }
    await supabase.from('order_files').insert({
      order_id: o.id, uploaded_by: user.id, file_name: file.name, file_path: path, kind: 'other', size_bytes: file.size,
    })
    const { data } = await supabase.from('order_files').select('*').eq('order_id', o.id).order('created_at', { ascending: true })
    setFileView(buildFileView(data || [], user.id, o.writer?.name))
    setUploading(false)
  }

  const { uploads, submissions } = fileView
  // Release gate: the completed work is held back from the client until admin/QC
  // marks the order delivered (or closed). Before that the client tracks live
  // progress but cannot see or download the deliverable package.
  const released = ['delivered', 'closed'].includes(o.status)
  const visibleSubs = released ? submissions : []
  const fileCount = visibleSubs.length > 0 ? visibleSubs.length + '×3' : uploads.length

  return (
    <>
      <main className="pwrap">
        <button className="back" onClick={onBack}>
          {Ico.chev({ style: { transform: 'rotate(180deg)' } })} All orders
        </button>

        <div className="od-head">
          <div>
            <div className="o-ref">{o.ref}</div>
            <h1 style={{ marginTop: 6 }}>{o.title}</h1>
            <div className="od-meta-line">
              {o.writer?.name && (
                <span className="avatar accent" style={{ width: 22, height: 22, fontSize: 9, flexShrink: 0 }}>{initials(o.writer.name)}</span>
              )}
              <div className="od-meta-text">
                {statusSentence(o)}
                {daysUntil(o.due) !== null && !['delivered', 'closed'].includes(o.status) && (
                  <span className={'ow-due' + (daysUntil(o.due) <= 3 ? ' ow-urgent' : '')}>
                    {' · '}Due {fmtDue(o.due)}{daysUntil(o.due) === 0 ? ' · today' : daysUntil(o.due) > 0 ? ` · ${daysUntil(o.due)}d` : ''}
                  </span>
                )}
              </div>
              <Badge payment={o.payment_status} />
            </div>
          </div>
        </div>

        <div className="od-layout">
          <section>
            <div className="tabs">
              <button className={'tab' + (tab === 'chat' ? ' on' : '')} onClick={() => setTab('chat')}>{Ico.msg()} Conversation</button>
              <button className={'tab' + (tab === 'files' ? ' on' : '')} onClick={() => setTab('files')}>
                {Ico.file()} Files {(visibleSubs.length > 0 || uploads.length > 0) && <span className="ct">{fileCount}</span>}
              </button>
              <button className={'tab' + (tab === 'brief' ? ' on' : '')} onClick={() => setTab('brief')}>{Ico.doc({ width: 14, height: 14 })} Brief</button>
            </div>

            {tab === 'chat' && (
              <div className="chat-panel">
                <div className="thread">
                  <div className="msg sys"><span className="s-pill">Order {o.ref} created — brief received.</span></div>
                  {msgsLoading ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>Loading conversation…</div>
                  ) : thread.length === 0 ? (
                    <div className="msg sys"><span className="s-pill">{o.writer?.name ? `${o.writer.name} will message you here.` : 'We\'re matching you with a specialist — they\'ll introduce themselves here.'}</span></div>
                  ) : thread.map(msg => (
                    <div key={msg.id} className={'msg ' + msg.from}>
                      <span className={'avatar m-av ' + (msg.from === 'me' ? '' : 'accent')} style={{ width: 32, height: 32, fontSize: 12 }}>
                        {msg.from === 'me' ? myInitials : initials(msg.name)}
                      </span>
                      <div className="m-body">
                        <div className="m-meta">
                          <span className="nm">{msg.from === 'me' ? 'You' : msg.name}</span>
                          <span className="tm">{msg.ts}</span>
                        </div>
                        <div className="m-bubble">{msg.body}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={endRef}></div>
                </div>
                <form className="composer" onSubmit={send}>
                  <textarea
                    placeholder={o.writer?.name ? `Message ${o.writer.name}…` : 'Add a note to your brief…'}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) send(e) }}
                    rows={1}
                  />
                  <button type="submit" className="btn btn-accent" disabled={!draft.trim() || sending}>{Ico.arrow()}</button>
                </form>
              </div>
            )}

            {tab === 'files' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {/* Work submitted by the expert but not yet released by QC */}
                {!released && submissions.length > 0 && (
                  <div style={{
                    background: 'var(--alt, #f6f4ef)', border: '1px solid var(--border, #e7e3da)',
                    borderRadius: 12, padding: '16px 18px', marginBottom: 4,
                    display: 'flex', flexDirection: 'column', gap: 5,
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Your work is in quality review</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 }}>
                      Our QC team is checking your completed project before it's released. It'll appear here the moment it's approved — and we'll notify you right away.
                    </div>
                  </div>
                )}
                {visibleSubs.length === 0 && uploads.length === 0 && !(!released && submissions.length > 0) && (
                  <p style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: 13.5, padding: '6px 0' }}>
                    No files yet. Your expert will share your completed work here once it's ready.
                  </p>
                )}
                {visibleSubs.map(sub => (
                  <SubmissionPackage key={sub.id} sub={sub} onPreview={setPreview} onDownload={download} />
                ))}
                {uploads.length > 0 && (
                  <div style={{ marginTop: visibleSubs.length > 0 ? 20 : 0 }}>
                    {visibleSubs.length > 0 && <div className="sc-h" style={{ marginBottom: 10 }}>Shared files</div>}
                    {uploads.map(f => (
                      <div key={f.id} className="frow">
                        <span className="fic">{Ico.file({ width: 18, height: 18 })}</span>
                        <span className="fmeta">
                          <span className="fn">{f.name}</span>
                          <span className="fs">
                            <span className={'badge ' + (FILE_TONE[f.kind] || 'tone-mute')} style={{ padding: '1px 8px', fontSize: 10.5 }}>{f.kind}</span>
                            <span>{fmtBytes(f.size)}</span>
                            <span>·</span>
                            <span>{f.from === 'me' ? 'Uploaded by you' : 'From your expert'}</span>
                            <span>·</span>
                            <span>{f.date}</span>
                          </span>
                        </span>
                        <button className="btn btn-sm btn-ghost" style={{ marginRight: 6 }} onClick={() => setPreview(f)}>Preview</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => download(f)}>Download</button>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={fileInputRef} type="file" hidden onChange={e => { onUpload(e.target.files[0]); e.target.value = '' }} />
                <div className="updrop" style={{ marginTop: 16 }} onClick={() => !uploading && fileInputRef.current?.click()}>
                  {Ico.file()} &nbsp; {uploading ? 'Uploading…' : 'Share a file with your expert — click to upload'}
                </div>
              </div>
            )}

            {tab === 'brief' && (
              <div className="kv">
                <div className="row"><span className="k">Academic level</span><span className="v">{o.level}</span></div>
                <div className="row"><span className="k">Scope</span><span className="v">{o.scope}</span></div>
                {o.program && <div className="row"><span className="k">Program</span><span className="v">{o.program}</span></div>}
                <div className="row"><span className="k">Due date</span><span className="v">{fmtDue(o.due)}</span></div>
                {o.estimate_usd > 0 ? (
                  <>
                    <div className="row"><span className="k">{o.quote_total != null ? 'Quote' : 'Estimate'}</span><span className="v mono">{money(o.estimate_usd)}</span></div>
                    <div className="row"><span className="k">Deposit paid</span><span className="v mono">{money(o.deposit_usd)}</span></div>
                    <div className="row"><span className="k">Balance due</span><span className="v mono">{money(o.estimate_usd - o.deposit_usd)}</span></div>
                  </>
                ) : (
                  <div className="row"><span className="k">Invoice</span><span className="v" style={{ color: 'var(--muted)' }}>Pending · arrives within 30 min – 2 hrs</span></div>
                )}
                {o.notes && <div className="row"><span className="k">Brief notes</span><span className="v" style={{ maxWidth: 260, textAlign: 'right', fontSize: 13, lineHeight: 1.5 }}>{o.notes}</span></div>}
              </div>
            )}
          </section>

          <aside className="od-side">
            {o.writer?.name && (
              <div className="expert-strip">
                <span className="avatar accent" style={{ width: 36, height: 36, fontSize: 13, flexShrink: 0 }}>{initials(o.writer.name)}</span>
                <div className="es-info">
                  <div className="es-name">{o.writer.name}</div>
                  {o.writer.specialty && <div className="es-spec">{o.writer.specialty}</div>}
                </div>
              </div>
            )}

            <NextStep o={o} setTab={setTab} />

            {o.due && !['closed', 'delivered'].includes(o.status) && (() => {
              const dd = daysUntil(o.due)
              const urgent = dd !== null && dd <= 3
              return (
                <div className={'deadline-widget' + (urgent ? ' urgent' : '')}>
                  <div className="dw-days">{dd === 0 ? '0' : dd < 0 ? Math.abs(dd) : dd}</div>
                  <div>
                    <div className="dw-label">{dd < 0 ? 'days overdue' : dd === 0 ? 'Due today' : 'days until deadline'}</div>
                    <div className="dw-date">{fmtDue(o.due)}</div>
                  </div>
                </div>
              )
            })()}

            <div className="side-card">
              <div className="sc-h">Timeline</div>
              <div className="timeline">
                {STATUS_FLOW.map((s, i) => {
                  const cls = i < eff ? 'done' : i === eff ? 'cur' : 'pending'
                  return (
                    <div key={s} className={'tl ' + cls}>
                      <div className="rail"><span className="dot"></span><span className="line"></span></div>
                      <div className="tl-b">
                        <div className="tl-t">{STATUS_META[s]?.label || s}</div>
                        <div className="tl-d">{i < eff ? 'Complete' : i === eff ? 'Now' : 'Upcoming'}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {o.estimate_usd > 0 && (
              <div className="side-card" style={{ padding: '14px 16px' }}>
                <div className="sc-h">Payment</div>
                <div className="kv">
                  <div className="row"><span className="k">Estimate</span><span className="v mono">{money(o.estimate_usd)}</span></div>
                  <div className="row"><span className="k">Deposit paid</span><span className="v mono">{money(o.deposit_usd)}</span></div>
                  <div className="row"><span className="k">Balance due</span><span className="v mono">{money(o.estimate_usd - o.deposit_usd)}</span></div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
    </>
  )
}

// ── MESSAGES INBOX ───────────────────────────────────────────
function MessageInbox({ orders, lastMessages, loading, onOpenOrder }) {
  const rows = orders.map(o => ({ o, lm: lastMessages[o.id] })).filter(x => x.lm)

  return (
    <main className="pwrap">
      <div style={{ marginBottom: 30 }}>
        <h1>Your <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>messages.</em></h1>
        <p style={{ color: 'var(--muted)', fontSize: 14.5, marginTop: 8 }}>Every conversation with your experts, in one place.</p>
      </div>

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 13 }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div className="empty card">
          <div className="ic">{Ico.msg({ width: 26, height: 26 })}</div>
          <h3>No messages yet</h3>
          <p>When you start an order, your conversation with the assigned expert will appear here.</p>
        </div>
      ) : (
        <div className="inbox-list">
          {rows.map(({ o, lm }) => {
            const isUnread = lm.from === 'them'
            const senderLabel = lm.from === 'me' ? 'You' : (lm.name || 'Expert').split(' ').slice(0, 2).join(' ')
            const preview = `${senderLabel}: ${lm.body}`.slice(0, 90)
            return (
              <button key={o.id} className={'inbox-row ' + (isUnread ? '' : 'read')} onClick={() => onOpenOrder(o, 'chat')}>
                <span className={'i-dot ' + (isUnread ? '' : 'read')}></span>
                <span className="i-main">
                  <span className="i-ref">{o.ref}</span>
                  <span className="i-title">{o.title}</span>
                  <span className="i-preview">{preview}</span>
                </span>
                <span className="i-right">
                  <span className="i-time">{lm.ts.split(',')[0]}</span>
                  <div className="i-badge" style={{ marginTop: 5 }}><Badge status={o.status} /></div>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </main>
  )
}

// ── PROFILE ──────────────────────────────────────────────────
function Profile({ user, profile, onToast, onSaved }) {
  const [f, setF] = useState({ name: profile?.name || '', phone: profile?.phone || '' })
  const [notif, setNotif] = useState(() => ({ status: true, messages: true, marketing: false, ...(profile?.email_prefs || {}) }))
  const [saving, setSaving] = useState(false)
  const ini = f.name ? initials(f.name) : (user?.email?.[0] || '?').toUpperCase()

  async function save() {
    setSaving(true)
    await supabase.from('profiles').update({ name: f.name || null, phone: f.phone || null, email_prefs: notif }).eq('id', user.id)
    setSaving(false)
    onSaved?.(f)
    onToast('Profile saved')
  }

  return (
    <main className="pwrap" style={{ maxWidth: 740 }}>
      <div>
        <h1>Your <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>profile.</em></h1>
        <p style={{ color: 'var(--muted)', fontSize: 15, marginTop: 8 }}>Keep your details current so your experts have the right context.</p>
      </div>
      <div className="prof-id">
        <span className="avatar" style={{ width: 68, height: 68, fontSize: 26 }}>{ini}</span>
        <div>
          <div className="nm">{f.name || user?.email}</div>
          <div className="meta">{user?.email}</div>
        </div>
      </div>
      <div className="psec">
        <div className="psec-h">Account</div>
        <div className="pcard">
          <div className="pgrid">
            <div className="fld"><label>Full name</label><input type="text" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} placeholder="Your name" /></div>
            <div className="fld"><label>Email (sign-in)</label><input type="email" value={user?.email || ''} readOnly style={{ opacity: .55 }} /></div>
            <div className="fld full"><label>WhatsApp / phone</label><input type="tel" value={f.phone} onChange={e => setF(p => ({ ...p, phone: e.target.value }))} placeholder="+1 555 123 4567" /></div>
          </div>
        </div>
      </div>
      <div className="psec">
        <div className="psec-h">Notifications</div>
        <div className="pcard">
          {[['status', 'Order status updates', 'When an order moves stage or is delivered.'],
            ['messages', 'New messages', 'When your expert replies in your thread.'],
            ['marketing', 'Tips & offers', 'Occasional study tips and seasonal pricing.']
          ].map(([key, title, sub]) => (
            <div key={key} className="toggle-row">
              <div><div className="t-t">{title}</div><div className="t-s">{sub}</div></div>
              <button className={'sw' + (notif[key] ? ' on' : '')} role="switch" aria-checked={notif[key]}
                onClick={() => setNotif(n => ({ ...n, [key]: !n[key] }))}></button>
            </div>
          ))}
        </div>
      </div>
      <div className="savebar">
        <span style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', gap: 7, alignItems: 'center' }}>
          {Ico.info()} Changes are private to your account.
        </span>
        <button className="btn btn-accent btn-lg" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
      </div>

      <ChangePassword onToast={onToast} />
    </main>
  )
}

// ── CHANGE PASSWORD (in profile/settings) ────────────────────
function ChangePassword({ onToast }) {
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    setErr('')
    if (pw.length < 5) { setErr('Use at least 5 characters.'); return }
    if (pw !== confirm) { setErr('Those passwords don’t match.'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setSaving(false)
    if (error) { setErr(error.message); return }
    setPw(''); setConfirm(''); onToast?.('Password updated')
  }

  return (
    <div className="psec">
      <div className="psec-h">Password</div>
      <div className="pcard">
        <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: '0 0 14px' }}>
          Change your password any time — choose one you'll remember.
        </p>
        <div className="pgrid">
          <div className="fld"><label>New password</label><input type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} placeholder="At least 5 characters" /></div>
          <div className="fld"><label>Confirm new password</label><input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter it" /></div>
        </div>
        {err && <div style={{ color: 'var(--bad)', fontSize: 13, marginTop: 10 }} role="alert">{err}</div>}
        <div style={{ marginTop: 14 }}>
          <button className="btn btn-accent" onClick={save} disabled={saving || !pw}>{saving ? 'Updating…' : 'Update password'}</button>
        </div>
      </div>
    </div>
  )
}

// ── ROOT ─────────────────────────────────────────────────────
export default function PortalApp() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState([])
  const [lastMessages, setLastMessages] = useState({})
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [layout, setLayout] = useState(() => {
    try { return localStorage.getItem('ms_ws_layout') || 'sidebar' } catch { return 'sidebar' }
  })
  const [route, setRoute] = useState('orders')
  const [filter, setFilter] = useState('active')
  const [currentOrder, setCurrentOrder] = useState(null)
  const [currentTab, setCurrentTab] = useState('chat')
  const [toast, setToast] = useState(null)
  const [recovery, setRecovery] = useState(false)
  // PKCE recovery: the reset link lands on /workspace?type=recovery and the code
  // exchange fires SIGNED_IN (not reliably PASSWORD_RECOVERY), so detect the marker
  // (captured at mount) and force the set-new-password screen when a session lands.
  const recoveryRequested = useMemo(() => {
    try { return new URLSearchParams(window.location.search).get('type') === 'recovery' } catch { return false }
  }, [])
  const recoveryHandledRef = useRef(false)
  const [briefOpen, setBriefOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)

  useEffect(() => { try { localStorage.setItem('ms_ws_layout', layout) } catch {} }, [layout])
  useEffect(() => { document.title = 'My Orders — Meridian Studio' }, [])

  // auth listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && recoveryRequested && !recoveryHandledRef.current)) setRecovery(true)
      setUser(session?.user ?? null)
      setAuthChecked(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  // load profile + orders when user changes
  useEffect(() => {
    if (!user) { setProfile(null); setOrders([]); setLastMessages({}); return }
    supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => setProfile(data))
    supabase.rpc('claim_my_orders').then(() => loadOrders()).catch(() => loadOrders())
  }, [user])

  async function loadOrders() {
    if (!user) return
    setOrdersLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('id, ref, program, scope_id, scope_label, level, level_label, has_project, is_bundle, rate_writing, rate_project, estimate_usd, deposit_usd, quote_total, quote_deposit, priority, client_name, client_email, due_date, status, payment_status, created_at, writer_id, notes, writer:writers!orders_writer_id_fkey(id, name, specialty)')
      .order('created_at', { ascending: false })
    if (error) console.error('loadOrders', error)
    const mapped = (data || []).map(viewOrder)
    setOrders(mapped)
    setOrdersLoading(false)
    loadLastMessages(mapped)
  }

  async function loadLastMessages(list) {
    const ids = list.map(o => o.id)
    if (!ids.length) { setLastMessages({}); return }
    const { data } = await supabase.from('order_messages')
      .select('order_id, sender_id, sender_name, body, created_at')
      .in('order_id', ids).eq('is_internal', false)
      .order('created_at', { ascending: true })
    const map = {}
    ;(data || []).forEach(r => {
      map[r.order_id] = {
        from: r.sender_id === user.id ? 'me' : 'them',
        name: r.sender_name || 'Meridian',
        body: r.body,
        ts: fmtMsgTime(new Date(r.created_at)),
      }
    })
    setLastMessages(map)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null); setProfile(null); setOrders([]); setLastMessages({})
    setRoute('orders'); setCurrentOrder(null)
  }

  function goNewBrief() { setBriefOpen(true) }
  function openOrder(o, tab = 'chat') { setCurrentOrder(o); setCurrentTab(tab); setRoute('order-detail'); window.scrollTo(0, 0) }
  function navigate(r) { setRoute(r); if (r !== 'order-detail') setCurrentOrder(null); window.scrollTo(0, 0) }
  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2200) }

  if (!authChecked) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 13 }}>
        Loading…
      </div>
    )
  }

  // After a "forgot password" link, let the user set a new one before continuing.
  if (recovery) {
    return <div className="app"><SetNewPassword onDone={() => { recoveryHandledRef.current = true; try { window.history.replaceState({}, '', '/workspace') } catch {} ; setRecovery(false) }} /></div>
  }

  if (!user) {
    return <div className="app"><SignIn /></div>
  }

  const ShellComponent = layout === 'sidebar' ? SidebarShell : Shell

  return (
    <div className="app">
      <ShellComponent
        user={user} profile={profile} orders={orders} lastMessages={lastMessages}
        route={route} setRoute={navigate} onSignOut={signOut} setLayout={setLayout}
        filter={filter} setFilter={setFilter} goNewBrief={goNewBrief}
        onSupport={() => setSupportOpen(true)}
      >
        {route === 'orders' && (
          <MyOrders user={user} profile={profile} orders={orders} loading={ordersLoading}
            onOpen={openOrder} filter={filter} setFilter={setFilter} goNewBrief={goNewBrief} />
        )}
        {route === 'messages' && (
          <MessageInbox orders={orders} lastMessages={lastMessages} loading={ordersLoading} onOpenOrder={openOrder} />
        )}
        {route === 'profile' && (
          <Profile user={user} profile={profile} onToast={showToast} onSaved={f => setProfile(p => ({ ...(p || {}), ...f }))} />
        )}
        {route === 'order-detail' && currentOrder && (
          <OrderDetail o={currentOrder} user={user} profile={profile} initialTab={currentTab} onBack={() => navigate('orders')} />
        )}
      </ShellComponent>

      {toast && (
        <div className="toast"><span style={{ color: 'var(--good-bright)' }}>✓</span>{toast}</div>
      )}

      {/* In-workspace brief intake — overlays the workspace (no jump to the homepage).
          Wrapped in `.ms` so the marketing modal's CSS variables resolve. */}
      {briefOpen && (
        <div className="ms">
          <BriefFlow open={briefOpen} onClose={() => { setBriefOpen(false); supabase.rpc('claim_my_orders').then(loadOrders).catch(loadOrders) }} />
        </div>
      )}

      {supportOpen && <SupportChat user={user} name={profile?.name} surface="client" onClose={() => setSupportOpen(false)} />}

      <Concierge />
    </div>
  )
}
