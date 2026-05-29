import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from './lib/supabase.js'
import Concierge from './Concierge.jsx'
import './portal.css'

const WA_NUM = import.meta.env.VITE_WHATSAPP_NUMBER || '12057279363'

// ── ICONS ─────────────────────────────────────────────────────────────────────
const PIco = {
  arrow: (p) => <svg className="arr" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>,
  chev:  (p) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M9 6l6 6-6 6"/></svg>,
  doc:   (p) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>,
  plus:  (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  x:     (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M18 6L6 18M6 6l12 12"/></svg>,
  msg:   (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/></svg>,
  file:  (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>,
  user:  (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><circle cx="12" cy="8" r="3.4"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>,
  logout:(p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
  info:  (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>,
  wa:    (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true" focusable="false" {...p}><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-.9 1.2-.3.2-.6.1c-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5s-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.5.3-.7.3-1.4.2-1.5-.1-.1-.3-.2-.6-.3M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.4.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2"/></svg>,
  inbox: (p) => <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M3 12h5l2 3h4l2-3h5"/><path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/></svg>,
}

// ── STATUS CONFIG ─────────────────────────────────────────────────────────────
const STATUS = {
  new:            { label: 'New',          tone: 'tone-info'   },
  brief_received: { label: 'Brief in',     tone: 'tone-warn'   },
  brief:          { label: 'Brief in',     tone: 'tone-warn'   },
  assigned:       { label: 'Assigned',     tone: 'tone-violet' },
  writing:        { label: 'In progress',  tone: 'tone-accent' },
  in_review:      { label: 'In review',    tone: 'tone-warn'   },
  review:         { label: 'In review',    tone: 'tone-warn'   },
  delivered:      { label: 'Delivered',    tone: 'tone-good'   },
  revision:       { label: 'Revision',     tone: 'tone-bad'    },
  closed:         { label: 'Closed',       tone: 'tone-mute'   },
}
const STATUS_FLOW = ['new', 'brief_received', 'assigned', 'writing', 'in_review', 'delivered']

const PAY = {
  unpaid:       { label: 'Unpaid',       tone: 'tone-bad'  },
  deposit_paid: { label: 'Deposit paid', tone: 'tone-warn' },
  partial:      { label: 'Deposit paid', tone: 'tone-warn' },
  paid_in_full: { label: 'Paid in full', tone: 'tone-good' },
  paid:         { label: 'Paid in full', tone: 'tone-good' },
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function fmtD(s) {
  if (!s) return '—'
  return new Date(s + (s.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtShort(s) {
  if (!s) return '—'
  return new Date(s + (s.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function fmtMsgTime(d) {
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
function fmtMoney(n) { return '$' + Number(n || 0).toLocaleString('en-US') }
function daysUntil(s) {
  if (!s) return null
  const ms = new Date(s + (s.includes('T') ? '' : 'T00:00:00')) - new Date()
  return Math.ceil(ms / 86400000)
}
function initials(name) {
  if (!name) return '?'
  return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ── BADGE ─────────────────────────────────────────────────────────────────────
function Badge({ status, payment }) {
  const cfg = status ? STATUS[status] : PAY[payment]
  if (!cfg) return null
  return (
    <span className={'badge ' + cfg.tone}>
      <span className="dot" style={{ background: 'currentColor' }}></span>
      {cfg.label}
    </span>
  )
}

// ── PROGRESS MINI ─────────────────────────────────────────────────────────────
function ProgressMini({ status }) {
  const idx = STATUS_FLOW.indexOf(status)
  const eff = status === 'revision' ? STATUS_FLOW.indexOf('in_review')
    : status === 'closed' ? STATUS_FLOW.length - 1 : idx
  const lbl = status === 'delivered' || status === 'closed' ? 'Complete'
    : status === 'revision' ? 'In revision'
    : eff >= 0 ? `Step ${eff + 1} of ${STATUS_FLOW.length}` : 'In progress'
  return (
    <div>
      <div className="prog" aria-hidden="true">
        {STATUS_FLOW.map((s, i) => (
          <span key={s} className={'seg-bar' + (i < eff ? ' done' : i === eff ? ' cur' : '')}></span>
        ))}
      </div>
      <div className="prog-lbl" style={{ marginTop: 7 }}>{lbl}</div>
    </div>
  )
}

// ── PROGRESS BLOCK ────────────────────────────────────────────────────────────
function ProgressBlock({ status }) {
  const idx = STATUS_FLOW.indexOf(status)
  const eff = status === 'revision' ? STATUS_FLOW.indexOf('in_review')
    : status === 'closed' ? STATUS_FLOW.length - 1 : idx
  const pct = Math.round(((eff + (status === 'delivered' || status === 'closed' ? 1 : 0.5)) / STATUS_FLOW.length) * 100)
  const safeLabel = STATUS[status]?.label || 'In progress'
  return (
    <div className="card-2" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{safeLabel}</span>
        <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 6, background: 'var(--line-2)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: 'var(--accent)', borderRadius: 6, transition: 'width .4s' }}></div>
      </div>
    </div>
  )
}

// ── SECTION LABEL ─────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted-2)', margin: '26px 0 12px' }}>
      {children}
    </div>
  )
}

// ── SIGN IN ───────────────────────────────────────────────────────────────────
function SignIn({ onAuthed }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!/.+@.+\..+/.test(email.trim())) { setErr('Enter a valid email address.'); return }
    setErr(''); setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: 'https://primemeridian.academy/workspace' },
    })
    setLoading(false)
    if (error) { setErr(error.message); return }
    setSent(true)
  }

  return (
    <div className="auth">
      <aside className="auth-aside on-ink">
        <a className="brand" href="/">
          <span className="mk" aria-hidden="true">M</span>
          <span>
            <span className="nm" style={{ display: 'block' }}>Meridian Studio</span>
            <span className="tg">Client workspace</span>
          </span>
        </a>
        <div>
          <p className="auth-quote">
            "They didn't just hand me a paper — they walked me through it until I could{' '}
            <span className="accent">defend every line.</span>"
          </p>
          <p className="auth-attr">— Dana R. · DNP Candidate</p>
        </div>
        <div className="auth-mini">
          <div className="m"><div className="n">4.9★</div><div className="l">Student rating</div></div>
          <div className="m"><div className="n">98%</div><div className="l">Delivered early</div></div>
          <div className="m"><div className="n">Same</div><div className="l">Expert, every time</div></div>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          {!sent ? (
            <>
              <h1>Welcome <span className="italic">back.</span></h1>
              <p className="lede">Sign in to track your orders, message your expert, and pick up where you left off.</p>
              <form className="auth-form" onSubmit={submit} noValidate>
                <div className="fld">
                  <label htmlFor="si-email">Email address</label>
                  <input id="si-email" type="email" placeholder="you@email.com"
                    value={email} onChange={e => setEmail(e.target.value)} aria-invalid={!!err} />
                </div>
                {err && <div style={{ color: 'var(--bad)', fontSize: 13 }} role="alert">{err}</div>}
                <button type="submit" className="btn btn-accent btn-lg" style={{ width: '100%' }} disabled={loading}>
                  {loading ? 'Sending…' : <>Email me a magic link {PIco.arrow()}</>}
                </button>
                <p className="auth-note">
                  {PIco.info({ width: 16, height: 16 })}
                  <span>No password needed. We'll email a secure one-time link that signs you straight in.</span>
                </p>
              </form>
              <div className="auth-div">new to Meridian?</div>
              <p className="auth-foot">Don't have an order yet? <a href="/#pricing">Start a brief →</a></p>
            </>
          ) : (
            <div className="auth-ok">
              <span className="ck" aria-hidden="true">
                {PIco.msg({ width: 28, height: 28 })}
              </span>
              <h1 style={{ fontSize: 38 }}>Check your <span className="italic">inbox.</span></h1>
              <p className="lede" style={{ marginTop: 16 }}>
                We sent a secure sign-in link to <span className="em">{email}</span>. It's valid for 15 minutes.
              </p>
              <button className="btn btn-accent btn-lg" style={{ width: '100%', marginTop: 26 }} onClick={onAuthed}>
                Continue to workspace {PIco.arrow()}
              </button>
              <p className="auth-foot" style={{ marginTop: 18 }}>
                Didn't get it? <a href="#" onClick={e => { e.preventDefault(); setSent(false) }}>Try another email</a>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ── SHELL (NAV) ───────────────────────────────────────────────────────────────
function Shell({ user, profile, route, setRoute, onSignOut, children }) {
  const [menu, setMenu] = useState(false)
  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest('.acct') && !e.target.closest('.menu')) setMenu(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Account'
  const userInitials = profile?.name ? initials(profile.name) : (user?.email?.[0] || '?').toUpperCase()
  const links = [['orders', 'Your orders'], ['messages', 'Messages'], ['profile', 'Profile']]

  return (
    <div>
      <header className="pnav" role="banner">
        <div className="pnav-inner">
          <a className="brand" href="/" aria-label="Meridian Studio — home">
            <span className="mk" aria-hidden="true">M</span>
            <span>
              <span className="nm" style={{ display: 'block' }}>Meridian Studio</span>
              <span className="tg">Client workspace</span>
            </span>
          </a>
          <nav className="pnav-links" aria-label="Workspace">
            {links.map(([id, l]) => (
              <button key={id} className={route === id ? 'on' : ''} onClick={() => setRoute(id)}>
                {l}
                {id === 'messages' && (
                  <span className="badge tone-accent" style={{ marginLeft: 8, padding: '1px 7px', fontSize: 11 }}>—</span>
                )}
              </button>
            ))}
          </nav>
          <div className="pnav-right">
            <a href="/#pricing" className="btn btn-accent btn-sm">{PIco.plus()} Start a brief</a>
            <button className="acct" onClick={() => setMenu(m => !m)} aria-haspopup="true" aria-expanded={menu}>
              <span className="who">
                <span className="n" style={{ display: 'block' }}>{displayName}</span>
                <span className="e">{user?.email}</span>
              </span>
              <span className="avatar" style={{ width: 34, height: 34, fontSize: 14 }}>{userInitials}</span>
            </button>
            {menu && (
              <div className="menu" role="menu">
                <button role="menuitem" onClick={() => { setRoute('profile'); setMenu(false) }}>{PIco.user()} My profile</button>
                <button role="menuitem" onClick={() => { setRoute('messages'); setMenu(false) }}>{PIco.msg()} Messages</button>
                <div className="sep"></div>
                <button role="menuitem" onClick={() => { setMenu(false); onSignOut() }}>{PIco.logout()} Sign out</button>
              </div>
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}

// ── ORDER ROW ─────────────────────────────────────────────────────────────────
function OrderRow({ o, onOpen }) {
  const d = daysUntil(o.due_date || o.due)
  const soon = d !== null && d <= 3 && o.status !== 'delivered' && o.status !== 'closed'
  const title = o.title || o.program || o.scope_label || 'Order'
  return (
    <button className="orow" onClick={() => onOpen(o)}>
      <span className="o-disc" aria-hidden="true">{PIco.doc()}</span>
      <span className="o-main">
        <span className="o-ref" style={{ display: 'block', marginBottom: 4 }}>{o.ref}</span>
        <span className="o-title" style={{ display: 'block' }}>{title}</span>
        <span className="o-meta">
          <span>{o.level_label || o.level || '—'}</span>
          <span className="d"></span>
          <span>{o.scope_label || o.scope || '—'}</span>
          {o.writer?.name && <><span className="d"></span><span>{o.writer.name}</span></>}
        </span>
      </span>
      <span className="o-mid">
        <Badge status={o.status} />
        <ProgressMini status={o.status} />
      </span>
      <span className="o-due">
        <span className="lbl">{o.status === 'delivered' || o.status === 'closed' ? 'Delivered' : 'Due'}</span>
        <span className={'val' + (soon ? ' soon' : '')}>{fmtShort(o.due_date || o.due)}{soon && d >= 0 ? ` · ${d}d` : ''}</span>
      </span>
      <span className="chev" aria-hidden="true">{PIco.chev()}</span>
    </button>
  )
}

// ── ORDER DRAWER ──────────────────────────────────────────────────────────────
function OrderDrawer({ o, onClose, onFull }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  if (!o) return null

  const title = o.title || o.program || o.scope_label || 'Order'
  const est = o.estimate_usd || o.rate_writing || 0
  const dep = o.deposit_usd || 0
  const balance = est - dep

  return (
    <>
      <div className="drawer-scrim" onClick={onClose}></div>
      <aside className="drawer scrollbar" role="dialog" aria-modal="true" aria-label={'Order ' + o.ref}>
        <div className="drawer-head">
          <div>
            <div className="o-ref" style={{ marginBottom: 8 }}>{o.ref}</div>
            <h3 style={{ fontSize: 26, lineHeight: 1.08 }}>{title}</h3>
            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge status={o.status} />
              <Badge payment={o.payment_status || o.payment} />
            </div>
          </div>
          <button className="btn btn-icon btn-soft" onClick={onClose} aria-label="Close">{PIco.x()}</button>
        </div>
        <div className="drawer-body">
          <ProgressBlock status={o.status} />

          <SectionLabel>Brief</SectionLabel>
          <div className="kv">
            <div className="row"><span className="k">Level</span><span className="v">{o.level_label || o.level || '—'}</span></div>
            <div className="row"><span className="k">Scope</span><span className="v">{o.scope_label || o.scope || '—'}</span></div>
            {o.program && <div className="row"><span className="k">Program</span><span className="v">{o.program}</span></div>}
            <div className="row"><span className="k">Due</span><span className="v">{fmtD(o.due_date || o.due)}</span></div>
          </div>

          <SectionLabel>Your expert</SectionLabel>
          {o.writer?.name ? (
            <div className="card-2" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <span className="avatar accent" style={{ width: 46, height: 46, fontSize: 18 }}>
                {initials(o.writer.name)}
              </span>
              <div><div style={{ fontWeight: 700, fontSize: 15 }}>{o.writer.name}</div></div>
            </div>
          ) : (
            <div className="card-2" style={{ padding: 16, color: 'var(--muted)', fontSize: 13.5, fontStyle: 'italic', fontFamily: 'var(--serif)' }}>
              We're matching you with a specialist in your discipline — you'll be introduced within four hours.
            </div>
          )}

          {est > 0 && (
            <>
              <SectionLabel>Payment</SectionLabel>
              <div className="kv">
                <div className="row"><span className="k">Estimate</span><span className="v mono">{fmtMoney(est)}</span></div>
                <div className="row"><span className="k">Deposit (50%)</span><span className="v mono">{fmtMoney(dep)}</span></div>
                <div className="row"><span className="k">Balance on delivery</span><span className="v mono">{fmtMoney(balance)}</span></div>
              </div>
            </>
          )}
        </div>
        <div className="drawer-foot">
          <button className="btn btn-accent btn-lg" style={{ flex: 1 }} onClick={() => onFull(o)}>
            Open full order {PIco.arrow()}
          </button>
          <a className="btn btn-ghost btn-lg" href={`https://wa.me/${WA_NUM}`} target="_blank" rel="noreferrer">
            {PIco.wa()}
          </a>
        </div>
      </aside>
    </>
  )
}

// ── MY ORDERS ─────────────────────────────────────────────────────────────────
function MyOrders({ user, profile, orders, loading, onOpen, onOpenFull }) {
  const [filter, setFilter] = useState('active')
  const [banner, setBanner] = useState(true)

  const counts = useMemo(() => ({
    all: orders.length,
    active: orders.filter(o => !['delivered', 'closed'].includes(o.status)).length,
    done: orders.filter(o => ['delivered', 'closed'].includes(o.status)).length,
  }), [orders])

  const list = useMemo(() => orders.filter(o =>
    filter === 'all' ? true
      : filter === 'active' ? !['delivered', 'closed'].includes(o.status)
      : ['delivered', 'closed'].includes(o.status)
  ), [orders, filter])

  const firstName = profile?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'
  const activeN = counts.active
  const balance = orders.filter(o => !['closed'].includes(o.status)).reduce((s, o) => s + ((o.estimate_usd || 0) - (o.deposit_usd || 0)), 0)

  return (
    <main className="pwrap">
      <div className="phead">
        <div>
          <h1>Your <span className="italic">orders.</span></h1>
          <p className="sub">Welcome back, {firstName}. Here's everything in motion.</p>
        </div>
        <a href="/#pricing" className="btn btn-accent btn-lg">{PIco.plus()} Start a new brief</a>
      </div>

      <div className="chips">
        <div className="chip"><div className="n accent">{activeN}</div><div className="l">Active orders</div></div>
        <div className="chip"><div className="n">{orders.filter(o => o.status === 'in_review' || o.status === 'review').length}</div><div className="l">Awaiting your review</div></div>
        <div className="chip"><div className="n">{balance > 0 ? fmtMoney(balance) : '—'}</div><div className="l">Balance on delivery</div></div>
        <div className="chip"><div className="n">{orders.length}</div><div className="l">Total orders</div></div>
      </div>

      {banner && orders.length === 0 && !loading && (
        <div className="banner" style={{ marginBottom: 22 }}>
          <span className="b-ic">{PIco.info()}</span>
          <span className="b-tx">
            <b>Placed an order as a guest?</b> If you ordered before signing in, sign in with the same email and we'll automatically link it to your workspace here.
          </span>
          <button className="b-x" onClick={() => setBanner(false)} aria-label="Dismiss">{PIco.x({ width: 15, height: 15 })}</button>
        </div>
      )}

      <div className="ptools">
        <div className="seg" role="tablist">
          {[['active', 'Active'], ['done', 'Completed'], ['all', 'All']].map(([id, l]) => (
            <button key={id} role="tab" aria-selected={filter === id} className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>
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
      ) : list.length ? (
        <div className="olist">
          {list.map(o => <OrderRow key={o.id} o={o} onOpen={onOpen} />)}
        </div>
      ) : (
        <div className="empty card">
          <div className="ic">{PIco.inbox()}</div>
          <h3>{filter === 'done' ? 'Nothing completed yet' : 'No orders here yet'}</h3>
          <p>
            {filter === 'done'
              ? 'Delivered and closed orders will appear here once your work wraps up.'
              : 'When you start a brief, it\'ll show up here so you can track every step.'}
          </p>
          <div className="acts">
            <a href="/#pricing" className="btn btn-accent btn-lg">{PIco.plus()} Start your first brief</a>
          </div>
        </div>
      )}
    </main>
  )
}

// ── FILE HELPERS ──────────────────────────────────────────────────────────────
const FILE_TONE = { rubric: 'tone-violet', brief: 'tone-info', draft: 'tone-warn', final: 'tone-good', revision: 'tone-bad', other: 'tone-mute' }
function fmtBytes(n) {
  if (!n) return '—'
  if (n < 1024) return n + ' B'
  if (n < 1048576) return Math.round(n / 1024) + ' KB'
  return (n / 1048576).toFixed(1) + ' MB'
}

// ── ORDER DETAIL ──────────────────────────────────────────────────────────────
function OrderDetail({ o, user, profile, onBack }) {
  const [tab, setTab] = useState('chat')
  const [draft, setDraft] = useState('')
  const [thread, setThread] = useState([])
  const [msgsLoading, setMsgsLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [files, setFiles] = useState([])
  const [log, setLog] = useState([])
  const [uploading, setUploading] = useState(false)
  const endRef = useRef(null)
  const fileRef = useRef(null)
  const title = o.title || o.program || o.scope_label || 'Order'

  function mapMsg(r) {
    return {
      id: r.id,
      from: r.sender_id && r.sender_id === user.id ? 'me' : 'them',
      name: r.sender_name || o.writer?.name || 'Meridian',
      body: r.body,
      time: new Date(r.created_at),
    }
  }

  // Load messages + realtime subscribe
  useEffect(() => {
    let active = true
    setTab('chat'); setDraft(''); setMsgsLoading(true)
    supabase.from('order_messages').select('*').eq('order_id', o.id).eq('is_internal', false)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (active) { setThread((data || []).map(mapMsg)); setMsgsLoading(false) } })

    const ch = supabase.channel(`order-${o.id}-msgs`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_messages', filter: `order_id=eq.${o.id}` },
        payload => {
          if (payload.new.is_internal) return
          setThread(t => t.some(m => m.id === payload.new.id) ? t : [...t, mapMsg(payload.new)])
        })
      .subscribe()
    return () => { active = false; supabase.removeChannel(ch) }
  }, [o.id])

  // Load files + timeline log
  useEffect(() => {
    let active = true
    supabase.from('order_files').select('*').eq('order_id', o.id).order('created_at', { ascending: true })
      .then(({ data }) => { if (active) setFiles(data || []) })
    supabase.from('order_log').select('*').eq('order_id', o.id).order('created_at', { ascending: true })
      .then(({ data }) => { if (active) setLog(data || []) })
    return () => { active = false }
  }, [o.id])

  useEffect(() => { endRef.current?.parentElement?.scrollTo?.(0, 1e6) }, [thread, tab])

  async function send(e) {
    e.preventDefault()
    const b = draft.trim(); if (!b || sending) return
    setSending(true); setDraft('')
    const { data, error } = await supabase.from('order_messages').insert({
      order_id: o.id,
      sender_id: user.id,
      sender_name: profile?.name || user.email,
      body: b,
      is_internal: false,
    }).select().single()
    setSending(false)
    if (error) { setDraft(b); console.error(error); return }
    if (data) setThread(t => t.some(m => m.id === data.id) ? t : [...t, mapMsg(data)])
  }

  async function downloadFile(f) {
    const { data, error } = await supabase.storage.from('order-files').createSignedUrl(f.file_path, 120)
    if (error || !data?.signedUrl) { console.error(error); return }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  async function onUpload(file) {
    if (!file || uploading) return
    setUploading(true)
    const path = `${o.id}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`
    const { error: upErr } = await supabase.storage.from('order-files').upload(path, file)
    if (upErr) { setUploading(false); console.error(upErr); return }
    const { data } = await supabase.from('order_files').insert({
      order_id: o.id, uploaded_by: user.id, file_name: file.name, file_path: path, kind: 'other', size_bytes: file.size,
    }).select().single()
    if (data) setFiles(f => [...f, data])
    setUploading(false)
  }

  const userInitials = profile?.name ? initials(profile.name) : (user?.email?.[0] || '?').toUpperCase()
  const curIdx = o.status === 'revision' ? STATUS_FLOW.indexOf('in_review')
    : o.status === 'closed' ? STATUS_FLOW.length - 1 : STATUS_FLOW.indexOf(o.status)

  return (
    <main className="pwrap">
      <button className="back" onClick={onBack}>
        {PIco.chev({ style: { transform: 'rotate(180deg)' } })} All orders
      </button>

      <div className="od-head">
        <div>
          <div className="o-ref">{o.ref}</div>
          <h1>{title}</h1>
          <div className="od-badges">
            <Badge status={o.status} />
            <Badge payment={o.payment_status || o.payment} />
            {o.writer?.name && <span className="pill-tag">{PIco.user()} {o.writer.name}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a className="btn btn-ghost" href={`https://wa.me/${WA_NUM}`} target="_blank" rel="noreferrer">{PIco.wa()} WhatsApp</a>
        </div>
      </div>

      <div className="od-grid">
        <section>
          <div className="tabs" role="tablist">
            <button role="tab" className={'tab' + (tab === 'chat' ? ' on' : '')} onClick={() => setTab('chat')}>
              {PIco.msg()} Conversation
            </button>
            <button role="tab" className={'tab' + (tab === 'files' ? ' on' : '')} onClick={() => setTab('files')}>
              {PIco.file()} Files {files.length > 0 && <span className="ct">{files.length}</span>}
            </button>
            <button role="tab" className={'tab' + (tab === 'brief' ? ' on' : '')} onClick={() => setTab('brief')}>
              {PIco.doc({ width: 16, height: 16 })} Brief
            </button>
          </div>

          {tab === 'chat' && (
            <div>
              <div className="thread scrollbar" style={{ maxHeight: 480, overflowY: 'auto' }}>
                <div className="msg sys"><span className="s-pill">Brief received — order {o.ref} created.</span></div>
                {msgsLoading ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>Loading conversation…</div>
                ) : thread.length === 0 ? (
                  <div className="msg sys"><span className="s-pill">{o.writer?.name ? `${o.writer.name} will message you here.` : "We're matching you with a specialist — they'll introduce themselves here."}</span></div>
                ) : thread.map(m => (
                  <div className={'msg ' + (m.from === 'me' ? 'me' : 'them')} key={m.id}>
                    <span className={'avatar m-av ' + (m.from === 'me' ? '' : 'accent')}>
                      {m.from === 'me' ? userInitials : initials(m.name)}
                    </span>
                    <div className="m-body">
                      <div className="m-meta">
                        <span className="nm">{m.from === 'me' ? 'You' : m.name}</span>
                        <span className="tm">{fmtMsgTime(m.time)}</span>
                      </div>
                      <div className="m-bubble">{m.body}</div>
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
                />
                <button type="submit" className="btn btn-accent btn-lg" disabled={!draft.trim() || sending}>{PIco.arrow()}</button>
              </form>
            </div>
          )}

          {tab === 'files' && (
            <div>
              {files.length === 0 ? (
                <div style={{ padding: '20px 4px', color: 'var(--muted)', fontSize: 13.5, fontFamily: 'var(--serif)', fontStyle: 'italic' }}>
                  No files yet. Share your rubric or any reference material with your expert below.
                </div>
              ) : files.map(f => (
                <div className="frow" key={f.id}>
                  <span className="fic">{PIco.file({ width: 20, height: 20 })}</span>
                  <span className="fmeta">
                    <span className="fn">{f.file_name}</span>
                    <span className="fs">
                      <span className={'badge ' + (FILE_TONE[f.kind] || 'tone-mute')} style={{ padding: '1px 8px', fontSize: 11 }}>{f.kind}</span>
                      <span className="d"></span>{fmtBytes(f.size_bytes)}
                      <span className="d"></span>{f.uploaded_by === user.id ? 'Uploaded by you' : 'From your expert'}
                      <span className="d"></span>{fmtShort(f.created_at)}
                    </span>
                  </span>
                  <button className="btn btn-sm btn-ghost" onClick={() => downloadFile(f)}>Download</button>
                </div>
              ))}
              <input ref={fileRef} type="file" hidden onChange={e => { onUpload(e.target.files[0]); e.target.value = '' }} />
              <div className="updrop" onClick={() => !uploading && fileRef.current?.click()}>
                {PIco.file()} &nbsp;{uploading ? 'Uploading…' : 'Share a file with your expert — click to upload'}
              </div>
            </div>
          )}

          {tab === 'brief' && (
            <div>
              <div className="kv">
                <div className="row"><span className="k">Program</span><span className="v">{o.program || '—'}</span></div>
                <div className="row"><span className="k">Academic level</span><span className="v">{o.level_label || o.level || '—'}</span></div>
                <div className="row"><span className="k">Scope</span><span className="v">{o.scope_label || o.scope_id || '—'}</span></div>
                <div className="row"><span className="k">Due date</span><span className="v">{fmtD(o.due_date || o.due)}</span></div>
                {o.notes && <div className="row"><span className="k">Notes</span><span className="v" style={{ maxWidth: 300, textAlign: 'right' }}>{o.notes}</span></div>}
              </div>
            </div>
          )}
        </section>

        <aside className="od-side">
          <div className="side-card">
            <div className="sc-h">Progress</div>
            <ProgressBlock status={o.status} />
          </div>
          <div className="side-card">
            <div className="sc-h">Order timeline</div>
            <div className="timeline">
              {log.length > 0 ? log.map((e, i) => (
                <div className={'tl ' + (i === log.length - 1 ? 'cur' : 'done')} key={e.id}>
                  <div className="rail"><span className="dot"></span><span className="line"></span></div>
                  <div className="tl-b">
                    <div className="tl-t">{e.event}</div>
                    <div className="tl-d">{fmtShort(e.created_at)}</div>
                  </div>
                </div>
              )) : STATUS_FLOW.map((s, i) => {
                const cls = i < curIdx ? 'done' : i === curIdx ? 'cur' : 'pending'
                return (
                  <div className={'tl ' + cls} key={s}>
                    <div className="rail"><span className="dot"></span><span className="line"></span></div>
                    <div className="tl-b">
                      <div className="tl-t">{STATUS[s]?.label || s}</div>
                      <div className="tl-d">{i <= curIdx ? 'In progress' : 'Upcoming'}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          {o.writer?.name && (
            <div className="side-card">
              <div className="sc-h">Your expert</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <span className="avatar accent" style={{ width: 48, height: 48, fontSize: 19 }}>{initials(o.writer.name)}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{o.writer.name}</div>
                  {o.writer.specialty && <div style={{ color: 'var(--muted)', fontSize: 13 }}>{o.writer.specialty}</div>}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  )
}

// ── PROFILE ───────────────────────────────────────────────────────────────────
function Profile({ user, profile, onToast }) {
  const [f, setF] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
    school: profile?.school || '',
    program: profile?.program || '',
  })
  const [notif, setNotif] = useState({ status: true, messages: true, marketing: false })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const userInitials = f.name ? initials(f.name) : (user?.email?.[0] || '?').toUpperCase()

  async function save() {
    setSaving(true)
    await supabase.from('profiles').update({
      name: f.name || null,
      phone: f.phone || null,
    }).eq('id', user.id)
    setSaving(false)
    onToast('Profile saved')
  }

  return (
    <main className="pwrap prof-wrap">
      <div className="phead">
        <div>
          <h1>Your <span className="italic">profile.</span></h1>
          <p className="sub">Keep your details current so your experts always have the right context.</p>
        </div>
      </div>

      <div className="prof-id">
        <span className="avatar" style={{ width: 72, height: 72, fontSize: 28 }}>{userInitials}</span>
        <div>
          <div className="nm">{f.name || user?.email}</div>
          <div className="meta">{user?.email}</div>
        </div>
      </div>

      <div className="psec">
        <div className="psec-h">Account</div>
        <div className="pcard">
          <div className="pgrid">
            <div className="fld"><label>Full name</label><input type="text" value={f.name} onChange={e => set('name', e.target.value)} placeholder="Your name" /></div>
            <div className="fld"><label>Email (used to sign in)</label><input type="email" value={user?.email || ''} readOnly style={{ opacity: 0.6 }} /></div>
            <div className="fld full"><label>WhatsApp / phone</label><input type="tel" value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 555 123 4567" /></div>
          </div>
        </div>
      </div>

      <div className="psec">
        <div className="psec-h">Notifications</div>
        <div className="pcard">
          {[
            ['status', 'Order status updates', 'When an order moves stage or is delivered.'],
            ['messages', 'New messages', 'When your expert replies in a thread.'],
            ['marketing', 'Tips & offers', 'Occasional study tips and seasonal pricing.'],
          ].map(([key, title, sub]) => (
            <div className="toggle-row" key={key}>
              <div className="t-tx">
                <div className="t-t">{title}</div>
                <div className="t-s">{sub}</div>
              </div>
              <button
                className={'sw' + (notif[key] ? ' on' : '')}
                role="switch" aria-checked={notif[key]}
                onClick={() => setNotif(n => ({ ...n, [key]: !n[key] }))}
              ></button>
            </div>
          ))}
        </div>
      </div>

      <div className="savebar">
        <span className="saved">{PIco.info({ width: 15, height: 15 })} Changes are kept private to your account.</span>
        <button className="btn btn-accent btn-lg" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </main>
  )
}

// ── PLACEHOLDER ───────────────────────────────────────────────────────────────
function Placeholder({ title, body, onBack }) {
  return (
    <main className="pwrap">
      <div className="phead"><div><h1>{title}</h1></div></div>
      <div className="empty card" style={{ marginTop: 24 }}>
        <div className="ic">{PIco.inbox()}</div>
        <h3>Coming soon</h3>
        <p>{body}</p>
        <div className="acts">
          <button className="btn btn-ghost btn-lg" onClick={onBack}>Back to your orders</button>
        </div>
      </div>
    </main>
  )
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function PortalApp() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [route, setRoute] = useState('orders')
  const [drawer, setDrawer] = useState(null)
  const [current, setCurrent] = useState(null)
  const [toast, setToast] = useState(null)

  // auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthChecked(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  // load profile + orders when user is set
  useEffect(() => {
    if (!user) { setProfile(null); setOrders([]); return }
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => setProfile(data))
    // Link any guest orders placed with this email, then load.
    supabase.rpc('claim_my_orders').then(() => loadOrders()).catch(() => loadOrders())
  }, [user])

  async function loadOrders() {
    if (!user) return
    setOrdersLoading(true)
    // RLS returns only orders where client_id = auth.uid(); claim_my_orders()
    // links guest orders by email first so messages/files/log become readable.
    const { data, error } = await supabase
      .from('orders')
      .select('id, ref, program, scope_id, scope_label, level, level_label, has_project, is_bundle, rate_writing, rate_project, priority, client_name, client_email, due_date, status, payment_status, created_at, writer_id, notes, writer:writers(id, name, specialty)')
      .order('created_at', { ascending: false })
    if (error) console.error('loadOrders', error)
    setOrders(data || [])
    setOrdersLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null); setProfile(null); setOrders([])
    setRoute('orders'); setDrawer(null); setCurrent(null)
  }

  function showToast(m) { setToast(m); setTimeout(() => setToast(null), 2200) }
  function openFull(o) { setDrawer(null); setCurrent(o); setRoute('order'); window.scrollTo(0, 0) }

  useEffect(() => { document.title = 'My Orders — Meridian Studio' }, [])

  if (!authChecked) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 13 }}>
        Loading…
      </div>
    )
  }

  if (!user) {
    return <div className="app"><SignIn onAuthed={() => {}} /></div>
  }

  return (
    <div className="app">
      <Shell user={user} profile={profile} route={route} setRoute={setRoute} onSignOut={signOut}>
        {route === 'orders' && (
          <MyOrders user={user} profile={profile} orders={orders} loading={ordersLoading} onOpen={setDrawer} onOpenFull={openFull} />
        )}
        {route === 'messages' && (
          <Placeholder
            title={<>Your <span className="italic">messages.</span></>}
            body="A unified inbox connecting you with your experts is coming soon. For now, open any active order to see the conversation thread."
            onBack={() => setRoute('orders')}
          />
        )}
        {route === 'profile' && (
          <Profile user={user} profile={profile} onToast={showToast} />
        )}
        {route === 'order' && current && (
          <OrderDetail o={current} user={user} profile={profile} onBack={() => setRoute('orders')} />
        )}
      </Shell>

      {drawer && <OrderDrawer o={drawer} onClose={() => setDrawer(null)} onFull={openFull} />}

      {toast && (
        <div className="toast" role="status">
          <span className="tk">{PIco.arrow({ width: 15, height: 15 })}</span>{toast}
        </div>
      )}

      <Concierge />
    </div>
  )
}
