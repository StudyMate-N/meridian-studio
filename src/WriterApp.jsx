import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from './lib/supabase.js'
import SupportChat from './SupportChat.jsx'
import './portal.css'
import './clay-extra.css'

// ── ICONS ─────────────────────────────────────────────────────────────────────
const WIco = {
  arrow:(p)=><svg className="arr" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>,
  chev:(p)=><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 6l6 6-6 6"/></svg>,
  check:(p)=><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="20 6 9 17 4 12"/></svg>,
  x:(p)=><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 6L6 18M6 6l12 12"/></svg>,
  msg:(p)=><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/></svg>,
  file:(p)=><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>,
  clock:(p)=><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  user:(p)=><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="8" r="3.4"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>,
  money:(p)=><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  logout:(p)=><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
  shield:(p)=><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6z"/></svg>,
  inbox:(p)=><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 12h5l2 3h4l2-3h5"/><path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/></svg>,
}

const WSTATUS = {
  new:{label:'New',tone:'tone-info'}, brief_received:{label:'Brief in',tone:'tone-warn'},
  assigned:{label:'To start',tone:'tone-violet'}, writing:{label:'In progress',tone:'tone-accent'},
  in_review:{label:'Submitted',tone:'tone-warn'}, revision:{label:'Revision',tone:'tone-bad'},
  delivered:{label:'Delivered',tone:'tone-good'}, closed:{label:'Closed',tone:'tone-mute'},
}
const FILE_TONE = { rubric:'tone-violet', brief:'tone-info', draft:'tone-warn', final:'tone-good', revision:'tone-bad', ai_report:'tone-info', plag_report:'tone-violet', other:'tone-mute' }

// Progress stages shown in the assignment timeline (matches the client view).
const WFLOW = [['assigned','Assigned'],['writing','In progress'],['in_review','Submitted'],['delivered','Delivered']]
function wFlowIndex(status){
  if (['delivered','closed'].includes(status)) return 3
  if (status === 'in_review') return 2
  if (['writing','revision'].includes(status)) return 1
  return 0
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function wmoney(n){ return '$' + Number(n || 0).toLocaleString('en-US') }
function wdate(s){ if(!s) return '—'; return new Date(s + (String(s).includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-US',{month:'short',day:'numeric'}) }
function wdays(s){ if(!s) return null; return Math.ceil((new Date(s + (String(s).includes('T')?'':'T00:00:00')) - new Date())/86400000) }
function wMsgTime(d){ return d.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) }
function initials(name){ if(!name) return '?'; return name.trim().split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() }
function fmtBytes(n){ if(!n) return '—'; if(n<1024) return n+' B'; if(n<1048576) return Math.round(n/1024)+' KB'; return (n/1048576).toFixed(1)+' MB' }
// Stable anonymized client code (no PII) — deterministic from order id.
function clientCode(id){ let h = 0; const s = String(id || ''); for (let i=0;i<s.length;i++){ h = (h*31 + s.charCodeAt(i)) >>> 0 } return 'CLT-' + String(1000 + (h % 9000)) }
function orderPay(o){ return Number(o.rate_project || o.rate_writing || 0) }

function WBadge({ status }) {
  const c = WSTATUS[status]; if (!c) return null
  return <span className={'badge ' + c.tone}><span className="dot" style={{ background:'currentColor' }}></span>{c.label}</span>
}

// ── SIGN IN ───────────────────────────────────────────────────────────────────
function WSignIn() {
  const [mode, setMode] = useState('signin')   // signin | forgot
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!/.+@.+\..+/.test(email.trim())) { setErr('Enter a valid email address.'); return }
    if (!password) { setErr('Enter your password.'); return }
    setErr(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    setLoading(false)
    if (error) { setErr(/invalid login/i.test(error.message) ? 'That email and password don’t match. Use the temporary password from your welcome email, or reset it below.' : error.message); return }
  }

  async function sendReset(e) {
    e.preventDefault()
    if (!/.+@.+\..+/.test(email.trim())) { setErr('Enter a valid email address.'); return }
    setErr(''); setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: 'https://primemeridian.academy/expert' })
    setLoading(false)
    if (error) { setErr(error.message); return }
    setSent(true)
  }

  return (
    <div className="auth">
      <aside className="auth-aside on-ink">
        <a className="brand" href="/"><span className="mk" aria-hidden="true">M</span><span><span className="nm" style={{display:'block'}}>Meridian Studio</span><span className="tg">Expert workspace</span></span></a>
        <div>
          <p className="auth-quote">"The work I'm proudest of — supporting students I'll never meet, and being <span className="accent">paid fairly</span> for it."</p>
          <p className="auth-attr">— A Meridian expert</p>
        </div>
        <div className="auth-mini">
          <div className="m"><div className="n">Fri</div><div className="l">Weekly payouts</div></div>
          <div className="m"><div className="n">100%</div><div className="l">Anonymized students</div></div>
          <div className="m"><div className="n">You</div><div className="l">Set your capacity</div></div>
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          {mode === 'signin' && (
            <>
              <h1>Expert <span className="italic">sign-in.</span></h1>
              <p className="lede">Access your assignments, message students, deliver work, and track earnings.</p>
              <form className="auth-form" onSubmit={submit} noValidate>
                <div className="fld"><label htmlFor="we">Email address</label><input id="we" type="email" autoComplete="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)} /></div>
                <div className="fld"><label htmlFor="wp">Password</label><input id="wp" type="password" autoComplete="current-password" placeholder="Your password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
                {err && <div style={{ color:'var(--bad)', fontSize:13 }} role="alert">{err}</div>}
                <button type="submit" className="btn btn-accent btn-lg" style={{ width:'100%' }} disabled={loading}>{loading ? 'Signing in…' : <>Sign in {WIco.arrow()}</>}</button>
                <p className="auth-foot" style={{ marginTop:4 }}><a href="#" onClick={e=>{e.preventDefault();setErr('');setSent(false);setMode('forgot')}}>Forgot your password?</a></p>
                <p className="auth-note">{WIco.shield({ width:16, height:16 })}<span>First sign-in? Use the temporary password from your welcome email — change it in Availability.</span></p>
              </form>
            </>
          )}
          {mode === 'forgot' && !sent && (
            <>
              <h1>Reset your <span className="italic">password.</span></h1>
              <p className="lede">We'll email you a secure link to set a new password.</p>
              <form className="auth-form" onSubmit={sendReset} noValidate>
                <div className="fld"><label htmlFor="wfe">Email address</label><input id="wfe" type="email" autoComplete="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)} /></div>
                {err && <div style={{ color:'var(--bad)', fontSize:13 }} role="alert">{err}</div>}
                <button type="submit" className="btn btn-accent btn-lg" style={{ width:'100%' }} disabled={loading}>{loading ? 'Sending…' : <>Email me a reset link {WIco.arrow()}</>}</button>
                <p className="auth-foot" style={{ marginTop:4 }}><a href="#" onClick={e=>{e.preventDefault();setErr('');setMode('signin')}}>← Back to sign in</a></p>
              </form>
            </>
          )}
          {mode === 'forgot' && sent && (
            <div className="auth-ok">
              <span className="ck" aria-hidden="true">{WIco.msg({ width:28, height:28 })}</span>
              <h1 style={{ fontSize:38 }}>Check your <span className="italic">inbox.</span></h1>
              <p className="lede" style={{ marginTop:16 }}>We sent a password-reset link to <span className="em">{email}</span>.</p>
              <p className="auth-foot" style={{ marginTop:18 }}><a href="#" onClick={e=>{e.preventDefault();setSent(false);setMode('signin')}}>← Back to sign in</a></p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ── SET NEW PASSWORD (after a recovery link) ───────────────────────────────────
function WSetNewPassword({ onDone }) {
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
      <aside className="auth-aside on-ink">
        <a className="brand" href="/"><span className="mk" aria-hidden="true">M</span><span><span className="nm" style={{display:'block'}}>Meridian Studio</span><span className="tg">Expert workspace</span></span></a>
        <div><p className="auth-quote">"One secure password, and you're back in."</p><p className="auth-attr">— Meridian Studio</p></div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <h1>Set a new <span className="italic">password.</span></h1>
          <p className="lede">Choose a password you'll use to sign in from now on.</p>
          <form className="auth-form" onSubmit={submit} noValidate>
            <div className="fld"><label htmlFor="wn1">New password</label><input id="wn1" type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
            <div className="fld"><label htmlFor="wn2">Confirm password</label><input id="wn2" type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} /></div>
            {err && <div style={{ color:'var(--bad)', fontSize:13 }} role="alert">{err}</div>}
            <button type="submit" className="btn btn-accent btn-lg" style={{ width:'100%' }} disabled={loading}>{loading ? 'Saving…' : <>Save password {WIco.arrow()}</>}</button>
          </form>
        </div>
      </main>
    </div>
  )
}

// ── SHELL ─────────────────────────────────────────────────────────────────────
function WShell({ writer, route, setRoute, available, onToggleAvail, onSignOut, setLayout, children }) {
  const [menu, setMenu] = useState(false)
  useEffect(() => {
    const close = e => { if (!e.target.closest('.acct') && !e.target.closest('.menu')) setMenu(false) }
    document.addEventListener('click', close); return () => document.removeEventListener('click', close)
  }, [])
  const links = [['work','My work'],['earnings','Earnings'],['availability','Availability']]
  return (
    <div>
      <header className="pnav">
        <div className="pnav-inner">
          <a className="brand" href="#" onClick={e=>{e.preventDefault();setRoute('work')}}>
            <span className="mk" aria-hidden="true">M</span>
            <span><span className="nm" style={{display:'block'}}>Meridian Studio</span><span className="tg">Expert workspace</span></span>
          </a>
          <nav className="pnav-links" aria-label="Workspace">
            {links.map(([id,l]) => <button key={id} className={route===id?'on':''} onClick={()=>setRoute(id)}>{l}</button>)}
          </nav>
          <div className="pnav-right">
            <button className={'avail-pill' + (available?' on':'')} onClick={onToggleAvail} aria-pressed={available}>
              <span className="lbl">{available ? 'Available' : 'Paused'}</span>
              <span className={'sw' + (available?' on':'')} style={{ width:40, height:23 }}></span>
            </button>
            <button className="acct" onClick={()=>setMenu(m=>!m)} aria-haspopup="true" aria-expanded={menu}>
              <span className="who"><span className="n" style={{display:'block'}}>{writer.name}</span><span className="e">{writer.field || writer.specialty || 'Expert'}</span></span>
              <span className="avatar accent" style={{ width:34, height:34, fontSize:13 }}>{initials(writer.name)}</span>
            </button>
            {menu && (
              <div className="menu" role="menu">
                <button role="menuitem" onClick={()=>{setRoute('availability');setMenu(false)}}>{WIco.user()} Profile &amp; availability</button>
                <button role="menuitem" onClick={()=>{setRoute('earnings');setMenu(false)}}>{WIco.money()} Earnings</button>
                {setLayout && <button role="menuitem" onClick={()=>{setMenu(false);setLayout('sidebar')}}>{WIco.shield()} Sidebar view</button>}
                <div className="sep"></div>
                <button role="menuitem" onClick={()=>{setMenu(false);onSignOut()}}>{WIco.logout()} Sign out</button>
              </div>
            )}
          </div>
        </div>
      </header>
      {children}
      {/* Mobile bottom nav — the top links collapse on small screens. */}
      <nav className="bottom-nav" aria-label="Workspace">
        {[['work','Work',WIco.inbox],['earnings','Earnings',WIco.money],['availability','Profile',WIco.user]].map(([id,l,ic]) => (
          <button key={id} className={route===id?'on':''} onClick={()=>setRoute(id)}>{ic({ width:18, height:18 })}<span>{l}</span></button>
        ))}
      </nav>
    </div>
  )
}

// ── SIDEBAR SHELL (default — matches the client/admin workspace) ────────────────
function WSidebar({ writer, route, setRoute, available, onToggleAvail, onSignOut, setLayout, offers, assignments, onSupport, children }) {
  const isOn = id => route === id || (route === 'assignment' && id === 'work')
  const offerCount = offers?.length || 0
  const list = assignments || []
  const active = list.filter(a => ['assigned','writing','revision','new','brief_received'].includes(a.status)).length
  const load = list.filter(a => ['assigned','writing','revision','in_review','new','brief_received'].includes(a.status)).length
  const cap = writer.max_concurrent || 5
  const available_$ = list.filter(a => ['delivered','closed'].includes(a.status)).reduce((s,a) => s + orderPay(a), 0)
  const nextDue = list.filter(a => ['assigned','writing','revision'].includes(a.status) && a.due_date).map(a => a.due_date).sort()[0]
  const pct = cap ? Math.min(100, Math.round(load / cap * 100)) : 0
  const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER || '12057279363'
  const dim = 'rgba(248,243,236,.5)'
  return (
    <div className="sb-layout">
      <aside className="sidebar">
        <div className="sb-brand">
          <button onClick={() => setRoute('work')} style={{ display:'flex', alignItems:'center', gap:12, background:'none', border:'none', cursor:'pointer' }}>
            <span style={{ width:34, height:34, borderRadius:9, background:'var(--accent)', color:'#fff', display:'grid', placeItems:'center', fontFamily:'var(--serif)', fontWeight:600, fontSize:21, flexShrink:0 }}>M</span>
            <span>
              <span style={{ fontFamily:'var(--serif)', fontSize:16.5, color:'#fff', display:'block', letterSpacing:'-.01em', lineHeight:1.2 }}>Meridian Studio</span>
              <span style={{ fontFamily:'var(--mono)', fontSize:7.5, letterSpacing:'.18em', textTransform:'uppercase', color:'rgba(248,243,236,.35)', display:'block', marginTop:2 }}>Expert workspace</span>
            </span>
          </button>
        </div>

        <nav className="sb-nav">
          <div className="sb-label">Workspace</div>
          <button className={'sb-item' + (isOn('work') ? ' on' : '')} onClick={() => setRoute('work')}>
            {WIco.inbox({ width:16, height:16 })} My work
            {active > 0 && <span style={{ marginLeft:'auto', fontFamily:'var(--mono)', fontSize:11, opacity:.6 }}>{active}</span>}
          </button>
          <button className={'sb-item' + (isOn('earnings') ? ' on' : '')} onClick={() => setRoute('earnings')}>
            {WIco.money({ width:16, height:16 })} Earnings
          </button>
          <button className={'sb-item' + (isOn('availability') ? ' on' : '')} onClick={() => setRoute('availability')}>
            {WIco.user({ width:16, height:16 })} Profile &amp; availability
          </button>
          {available && offerCount > 0 && (
            <button className="sb-item" onClick={() => setRoute('work')} style={{ color:'var(--accent)' }}>
              {WIco.shield({ width:16, height:16 })} New offers
              <span style={{ marginLeft:'auto', background:'var(--accent)', color:'#fff', fontFamily:'var(--mono)', fontSize:10, fontWeight:700, borderRadius:10, padding:'1px 7px' }}>{offerCount}</span>
            </button>
          )}

          {/* At a glance — workload, available earnings, next deadline */}
          <div className="sb-label" style={{ marginTop:20 }}>At a glance</div>
          <div style={{ padding:'2px 14px 4px', display:'flex', flexDirection:'column', gap:13 }}>
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--mono)', fontSize:10, letterSpacing:'.05em', color:dim, marginBottom:6 }}>
                <span>WORKLOAD</span><span>{load}/{cap}</span>
              </div>
              <div style={{ height:5, borderRadius:4, background:'rgba(255,255,255,.1)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:pct + '%', background: load >= cap ? 'var(--bad, #e2725b)' : 'var(--accent)', borderRadius:4, transition:'width .3s' }}></div>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'.05em', color:dim }}>AVAILABLE</span>
              <button onClick={() => setRoute('earnings')} style={{ background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'var(--serif)', fontSize:16, fontWeight:600, color:'#fff' }}>{wmoney(available_$)}</button>
            </div>
            {nextDue && (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                <span style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'.05em', color:dim }}>NEXT DUE</span>
                <span style={{ fontSize:12.5, color:'rgba(248,243,236,.85)' }}>{wdate(nextDue)}</span>
              </div>
            )}
          </div>

          <div className="sb-label" style={{ marginTop:20 }}>Support</div>
          <button className="sb-item" onClick={() => onSupport && onSupport()}>
            {WIco.msg({ width:16, height:16 })} Message the team
          </button>
          <a className="sb-item" href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" style={{ textDecoration:'none' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.8c2.18 0 4.22.85 5.76 2.39a8.07 8.07 0 0 1 2.39 5.72c0 4.49-3.65 8.13-8.14 8.13a8.2 8.2 0 0 1-4.16-1.14l-.3-.18-3.11.82.83-3.03-.19-.31a8.1 8.1 0 0 1-1.24-4.3c0-4.48 3.65-8.13 8.14-8.13zm4.47 10.27c-.24-.12-1.43-.71-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.95-1.2-.72-.64-1.2-1.44-1.34-1.68-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.57.18 1.1.16 1.51.1.46-.07 1.43-.58 1.63-1.15.2-.57.2-1.06.14-1.15-.06-.1-.22-.16-.46-.28z"/></svg>
            WhatsApp
          </a>
        </nav>

        <div className="sb-foot">
          <button className="layout-toggle" onClick={onToggleAvail} style={{ width:'100%', justifyContent:'space-between', padding:'10px 12px' }} aria-pressed={available}>
            <span style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background: available ? 'var(--good-bright, #34d399)' : 'rgba(248,243,236,.4)' }}></span>
              {available ? 'Accepting work' : 'Paused'}
            </span>
            <span className={'sw' + (available ? ' on' : '')} style={{ width:34, height:20 }}></span>
          </button>
          <div style={{ height:1, background:'rgba(255,255,255,.07)', margin:'4px 0' }}></div>
          <div className="sb-acct">
            <span className="avatar accent" style={{ width:30, height:30, fontSize:12, flexShrink:0 }}>{initials(writer.name)}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <span style={{ fontSize:13, fontWeight:600, color:'rgba(248,243,236,.9)', display:'block', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{writer.name}</span>
              <span style={{ fontSize:10, color:'rgba(248,243,236,.36)', fontFamily:'var(--mono)', display:'block', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{writer.field || writer.specialty || 'Expert'}</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:4 }}>
            <button onClick={onSignOut} className="layout-toggle" style={{ flex:1 }}>{WIco.logout({ width:13, height:13 })} Sign out</button>
            <button className="layout-toggle" onClick={() => setLayout('top')}>
              <svg viewBox="0 0 16 12" width="13" height="11" fill="currentColor"><rect x="0" y="0" width="16" height="2.5" rx="1"/><rect x="0" y="5" width="11" height="2" rx="1" opacity=".6"/><rect x="0" y="9.5" width="7" height="2" rx="1" opacity=".4"/></svg>
              Top nav
            </button>
          </div>
        </div>
      </aside>

      <main className="sb-main">{children}</main>

      <nav className="bottom-nav" aria-label="Workspace">
        {[['work','Work',WIco.inbox],['earnings','Earnings',WIco.money],['availability','Profile',WIco.user]].map(([id,l,ic]) => (
          <button key={id} className={isOn(id) ? 'on' : ''} onClick={() => setRoute(id)}>{ic({ width:20, height:20 })}<span>{l}</span></button>
        ))}
      </nav>
    </div>
  )
}

// ── OFFER + WORK ROW ──────────────────────────────────────────────────────────
function Offer({ o, onAccept, busy }) {
  return (
    <div className="offer">
      <div className="of-top"><span className="of-code">{WIco.shield({width:13,height:13})} {clientCode(o.id)} · {o.ref}</span></div>
      <div className="of-title">{o.title || o.program || 'Assignment'}</div>
      <div className="of-meta">{o.level_label || '—'}<span className="d"></span>{o.scope_label || '—'}</div>
      <div className="of-meta" style={{ marginTop:7 }}>{WIco.clock()} due {wdate(o.due_date)}</div>
      <div className="of-acts" style={{ marginTop:18 }}>
        <button className="btn btn-accent" style={{ flex:1 }} disabled={busy} onClick={()=>onAccept(o)}>Accept {WIco.arrow()}</button>
      </div>
    </div>
  )
}

function WorkRow({ a, onOpen }) {
  const d = wdays(a.due_date), soon = d !== null && d <= 2 && !['delivered','closed'].includes(a.status)
  const code = clientCode(a.id)
  const pay = orderPay(a)
  return (
    <button className="wrow" onClick={()=>onOpen(a)}>
      <span className="avatar" style={{ width:42, height:42, fontSize:12, fontFamily:'var(--mono)' }}>{code.split('-')[1]}</span>
      <span>
        <span className="wr-code" style={{ display:'block', marginBottom:3 }}>{code} · {a.ref}</span>
        <span className="wr-title" style={{ display:'block' }}>{a.program || a.scope_label || 'Assignment'}</span>
        <span className="wr-meta">{a.level_label || a.level || '—'}<span className="d"></span>{a.scope_label || '—'}</span>
      </span>
      <span style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'flex-start' }}><WBadge status={a.status} />{pay>0 && <span className="wr-pay">{wmoney(pay)}</span>}</span>
      <span className="wr-due"><span className="lbl">{a.status==='delivered'?'Delivered':'Due'}</span><span className={'val'+(soon?' soon':'')}>{wdate(a.due_date)}{soon && d>=0?` · ${d}d`:''}</span></span>
    </button>
  )
}

// ── MY WORK ───────────────────────────────────────────────────────────────────
function MyWork({ writer, offers, assignments, available, loading, onAccept, onOpen, acceptBusy }) {
  const [filter, setFilter] = useState('active')
  const counts = useMemo(() => ({
    active: assignments.filter(a => ['assigned','writing','revision','new','brief_received'].includes(a.status)).length,
    submitted: assignments.filter(a => a.status === 'in_review').length,
    delivered: assignments.filter(a => ['delivered','closed'].includes(a.status)).length,
  }), [assignments])
  const list = useMemo(() => assignments.filter(a =>
    filter === 'active' ? ['assigned','writing','revision','new','brief_received'].includes(a.status)
    : filter === 'submitted' ? a.status === 'in_review' : ['delivered','closed'].includes(a.status)
  ), [assignments, filter])
  const earned = useMemo(() => assignments.filter(a => ['delivered','closed'].includes(a.status)).reduce((s,a) => s + orderPay(a), 0), [assignments])
  const load = counts.active + counts.submitted
  const cap = writer.max_concurrent || 5

  return (
    <main className="pwrap">
      <div className="phead">
        <div><h1>My <span className="italic">work.</span></h1><p className="sub">Welcome back, {writer.name}. {load} active · {Math.max(0, cap - load)} slots open.</p></div>
        <div className="chip" style={{ flex:'none', minWidth:0, padding:'12px 18px' }}><div className="n accent" style={{ fontSize:24 }}>{load}/{cap}</div><div className="l">Current load</div></div>
      </div>

      <div className="statgrid" style={{ marginBottom:24 }}>
        <div className="stat t-accent"><div className="s-top"><span className="s-ic">{WIco.inbox()}</span></div><div className="s-n">{counts.active}</div><div className="s-l">Active assignments</div></div>
        <div className="stat t-info"><div className="s-top"><span className="s-ic">{WIco.clock()}</span></div><div className="s-n">{counts.submitted}</div><div className="s-l">In review</div></div>
        <div className="stat t-good"><div className="s-top"><span className="s-ic">{WIco.check()}</span></div><div className="s-n">{counts.delivered}</div><div className="s-l">Delivered</div></div>
        <div className="stat t-warn"><div className="s-top"><span className="s-ic">{WIco.money()}</span></div><div className="s-n">{wmoney(earned)}</div><div className="s-l">Earned to date</div></div>
      </div>

      <div className="wbanner" style={{ marginBottom:24 }}>
        <span className="wb-ic">{WIco.shield()}</span>
        Students appear as anonymized IDs. Meridian monitors every thread and may step in at any time.
      </div>

      {available && offers.length > 0 && (
        <div style={{ marginBottom:34 }}>
          <div className="ptools" style={{ margin:'0 0 16px' }}>
            <h2 style={{ fontSize:22 }}>Offered to you <span style={{ color:'var(--muted-2)', fontFamily:'var(--mono)', fontSize:14 }}>({offers.length})</span></h2>
            <span className="mono" style={{ fontSize:12, color:'var(--muted)' }}>unassigned work you can claim</span>
          </div>
          <div className="offer-grid">{offers.map(o => <Offer key={o.id} o={o} onAccept={onAccept} busy={acceptBusy} />)}</div>
        </div>
      )}

      <div className="ptools">
        <div className="seg" role="tablist">
          {[['active','Active'],['submitted','Submitted'],['delivered','Delivered']].map(([id,l]) => (
            <button key={id} role="tab" aria-selected={filter===id} className={filter===id?'on':''} onClick={()=>setFilter(id)}>{l}<span className="ct">{counts[id]}</span></button>
          ))}
        </div>
        <span className="mono" style={{ fontSize:12, color:'var(--muted)' }}>{loading ? 'Loading…' : `${list.length} ${list.length===1?'assignment':'assignments'}`}</span>
      </div>

      {loading ? (
        <div style={{ padding:'48px 0', textAlign:'center', color:'var(--muted)', fontFamily:'var(--mono)', fontSize:13 }}>Loading your work…</div>
      ) : list.length ? (
        <div className="olist">{list.map(a => <WorkRow key={a.id} a={a} onOpen={onOpen} />)}</div>
      ) : (
        <div className="empty card"><div className="ic">{WIco.inbox()}</div><h3>Nothing here</h3><p>{filter==='active' ? 'No active assignments right now. Accept an offer above to get started.' : `No ${filter} assignments yet.`}</p></div>
      )}
    </main>
  )
}

// ── ASSIGNMENT DETAIL ─────────────────────────────────────────────────────────
function WAssignmentDetail({ a, writer, user, onBack, onChanged, onToast }) {
  const [tab, setTab] = useState('chat')
  const [thread, setThread] = useState([])
  const [msgsLoading, setMsgsLoading] = useState(true)
  const [files, setFiles] = useState([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)
  const draftRef = useRef(null)
  const finalRef = useRef(null)
  const aiRef = useRef(null)
  const plagRef = useRef(null)
  const [pkgVersion, setPkgVersion] = useState('v1')
  const [aiScore, setAiScore] = useState('')
  const [plagScore, setPlagScore] = useState('')
  const [qcNote, setQcNote] = useState('')
  const code = clientCode(a.id)

  function mapMsg(r) {
    return { id:r.id, mine: r.sender_id === user.id, body:r.body, time:new Date(r.created_at) }
  }
  useEffect(() => {
    let active = true
    setTab((a.status === 'writing' || a.status === 'revision') ? 'files' : 'chat'); setDraft(''); setMsgsLoading(true)
    supabase.from('order_messages').select('*').eq('order_id', a.id).eq('is_internal', false).order('created_at', { ascending:true })
      .then(({ data }) => { if (active) { setThread((data||[]).map(mapMsg)); setMsgsLoading(false) } })
    const loadFiles = () => supabase.from('order_files').select('*').eq('order_id', a.id).order('created_at', { ascending:true })
      .then(({ data }) => { if (active) setFiles(data||[]) })
    loadFiles()
    const ch = supabase.channel(`wo-${a.id}-msgs`)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'order_messages', filter:`order_id=eq.${a.id}` },
        p => { if (p.new.is_internal) return; setThread(t => t.some(m=>m.id===p.new.id)?t:[...t, mapMsg(p.new)]) })
      .on('postgres_changes', { event:'*', schema:'public', table:'order_files', filter:`order_id=eq.${a.id}` }, () => loadFiles())
      .subscribe()
    return () => { active = false; supabase.removeChannel(ch) }
  }, [a.id])
  useEffect(() => { endRef.current?.parentElement?.scrollTo?.(0, 1e6) }, [thread, tab])

  async function send(e) {
    e.preventDefault()
    const b = draft.trim(); if (!b || sending) return
    setSending(true); setDraft('')
    const { data, error } = await supabase.from('order_messages').insert({ order_id:a.id, sender_id:user.id, sender_name:writer.name, body:b, is_internal:false }).select().single()
    setSending(false)
    if (error) { setDraft(b); console.error(error); return }
    if (data) setThread(t => t.some(m=>m.id===data.id)?t:[...t, mapMsg(data)])
  }

  async function downloadFile(f) {
    const { data, error } = await supabase.storage.from('order-files').createSignedUrl(f.file_path, 120)
    if (error || !data?.signedUrl) { console.error(error); return }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  // Upload one OR several files into a submission slot (a slot is a collection).
  async function deliver(fileList, kind, opts = {}) {
    const list = Array.from(fileList || []).filter(Boolean)
    if (!list.length) return
    setBusy(true)
    const score = opts.score
    let ok = 0
    for (const file of list) {
      const path = `${a.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${file.name.replace(/[^\w.\-]+/g,'_')}`
      const { error: upErr } = await supabase.storage.from('order-files').upload(path, file)
      if (upErr) { console.error(upErr); continue }
      const { data, error: insErr } = await supabase.from('order_files').insert({
        order_id:a.id, uploaded_by:user.id, file_name:file.name, file_path:path, kind, size_bytes:file.size,
        version: null,
        score: (score != null && score !== '' && !isNaN(Number(score))) ? Number(score) : null,
      }).select().single()
      if (insErr) { console.error(insErr); continue }
      if (data) setFiles(f => [...f, data])
      ok++
    }
    setBusy(false)
    const noun = kind === 'final' ? 'Final document' : kind === 'ai_report' ? 'AI report' : kind === 'plag_report' ? 'Originality report' : 'Draft'
    if (ok > 1) onToast(`${ok} files attached.`)
    else if (ok === 1) onToast(`${noun} attached.`)
    else onToast('Upload failed — please try again.')
  }

  // Remove a file the writer added (RLS blocks direct deletes, so go via the fn).
  async function removeFile(f) {
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('delete-order-file', { body: { file_id: f.id } })
      if (error || !data?.ok) { onToast(data?.error === 'locked' ? 'Files are locked once submitted.' : 'Could not remove that file.'); setBusy(false); return }
      setFiles(fs => fs.filter(x => x.id !== f.id))
      onToast('File removed.')
    } catch (e) { console.error(e); onToast('Could not remove that file.') }
    setBusy(false)
  }

  async function setStatus(status, label) {
    setBusy(true)
    const { data, error } = await supabase.rpc('writer_set_status', { p_order:a.id, p_status:status })
    setBusy(false)
    if (error || !data) { console.error(error); onToast('Could not update'); return }
    onChanged(a.id, { status }); onToast(label)
  }

  // Submission requires the final document, always routes to QC review (never
  // straight to the student), and groups this round's files under one version.
  const hasFinal = files.some(f => f.kind === 'final' && f.uploaded_by === user.id)
  async function submitForReview() {
    if (!hasFinal) { onToast('Attach your final document before submitting.'); return }
    setBusy(true)
    const round = 'v' + (new Set(files.filter(f => f.version).map(f => f.version)).size + 1)
    const toVersion = files.filter(f => f.uploaded_by === user.id && !f.version)
    for (const f of toVersion) { await supabase.from('order_files').update({ version: round }).eq('id', f.id) }
    if (toVersion.length) setFiles(fs => fs.map(f => toVersion.some(u => u.id === f.id) ? { ...f, version: round } : f))
    const note = qcNote.trim()
    if (note) await supabase.from('order_messages').insert({ order_id:a.id, sender_id:user.id, sender_name:writer.name, body:'[Submission note] ' + note, is_internal:true })
    const { data, error } = await supabase.rpc('writer_set_status', { p_order:a.id, p_status:'in_review' })
    setBusy(false)
    if (error || !data) { console.error(error); onToast('Could not submit — please try again.'); return }
    onChanged(a.id, { status:'in_review' }); setQcNote('')
    onToast(a.status === 'revision' ? 'Resubmitted for review.' : 'Submitted — QC will review before the student sees it.')
  }

  // A submission slot is a COLLECTION — it can hold several files. (Render fn, not
  // a component, so the score input keeps focus.)
  const pkgSlot = (kind, fref, title, hint, opts = {}) => {
    const slotFiles = files.filter(x => x.kind === kind && x.uploaded_by === user.id)
    const has = slotFiles.length > 0
    return (
      <div style={{ border:`1.5px solid ${has?'var(--good-line)':'var(--line)'}`, borderRadius:10, background: has?'var(--good-bg)':'var(--paper)', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 13px' }}>
          <span style={{ width:24, height:24, borderRadius:'50%', flexShrink:0, display:'grid', placeItems:'center', background: has?'var(--good)':'var(--paper-3)', color: has?'#fff':'var(--muted-2)' }}>{has ? WIco.check({ width:13, height:13 }) : ''}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13.5, fontWeight:600 }}>{title}{opts.required && <span style={{ color:'var(--accent)' }}> *</span>}{has && <span style={{ fontWeight:400, color:'var(--muted)' }}> · {slotFiles.length} file{slotFiles.length>1?'s':''}</span>}</div>
            <div style={{ fontSize:12, color:'var(--muted)' }}>{hint}</div>
          </div>
          {opts.scorePh && <input value={opts.scoreVal} onChange={e=>opts.scoreSet(e.target.value)} placeholder={opts.scorePh} type="number" min={0} max={100} title={opts.scorePh}
            style={{ width:62, padding:'6px 8px', border:'1.5px solid var(--line)', borderRadius:7, background:'var(--paper-2)', fontFamily:'var(--sans)', fontSize:12.5, flexShrink:0 }} />}
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={()=>fref.current?.click()} style={{ flexShrink:0 }}>{has ? 'Add file' : 'Upload'}</button>
        </div>
        {has && (
          <div style={{ borderTop:'1px solid var(--good-line)', padding:'8px 13px', display:'flex', flexDirection:'column', gap:6 }}>
            {slotFiles.map(f => (
              <div key={f.id} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12.5 }}>
                <span style={{ color:'var(--good)', flexShrink:0, display:'grid', placeItems:'center' }}>{WIco.file({ width:12, height:12 })}</span>
                <span style={{ flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--ink-soft)' }}>{f.file_name}</span>
                <span style={{ color:'var(--muted-2)', flexShrink:0, fontFamily:'var(--mono)', fontSize:11 }}>{fmtBytes(f.size_bytes)}</span>
                <button onClick={()=>removeFile(f)} disabled={busy} title="Remove file" style={{ border:'none', background:'none', cursor: busy?'default':'pointer', color:'var(--muted)', flexShrink:0, fontSize:16, lineHeight:1, padding:'0 3px' }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const nextAction = a.status === 'assigned' ? { label:'Start work', fn:() => setStatus('writing', 'Marked in progress') } : null
  const pay = orderPay(a)

  return (
    <main className="pwrap">
      <button className="back" onClick={onBack}>{WIco.chev({ style:{ transform:'rotate(180deg)' } })} My work</button>

      <div className="od-head">
        <div>
          <div className="o-ref" style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)' }}>{WIco.shield({ width:12, height:12 })} {code} · {a.ref}</div>
          <h1 style={{ marginTop:8 }}>{a.program || a.scope_label || 'Assignment'}</h1>
          <div className="od-badges"><WBadge status={a.status} />{pay>0 && <span className="pill-tag" style={{ color:'var(--accent-deep)', background:'var(--accent-soft)' }}>You earn {wmoney(pay)}</span>}</div>
        </div>
        {nextAction && <button className="btn btn-accent btn-lg" disabled={busy} onClick={nextAction.fn}>{nextAction.label} {WIco.arrow()}</button>}
      </div>

      <div className="wbanner" style={{ margin:'22px 0 0' }}>
        <span className="wb-ic">{WIco.shield()}</span>
        This student is anonymized as <b style={{ color:'var(--ink)', margin:'0 4px' }}>{code}</b>. Meridian monitors this thread and may step in at any time.
      </div>

      <div className="od-grid">
        <section>
          <div className="tabs" role="tablist">
            <button className={'tab'+(tab==='chat'?' on':'')} onClick={()=>setTab('chat')}>{WIco.msg()} Conversation</button>
            <button className={'tab'+(tab==='files'?' on':'')} onClick={()=>setTab('files')}>{WIco.file()} Files {files.length>0 && <span className="ct">{files.length}</span>}</button>
            <button className={'tab'+(tab==='brief'?' on':'')} onClick={()=>setTab('brief')}>Brief</button>
          </div>

          {tab === 'chat' && (
            <div>
              <div className="thread scrollbar" style={{ maxHeight:440, overflowY:'auto' }}>
                <div className="msg sys"><span className="s-pill">Assigned to you · {a.ref}. Brief and rubric are in Files.</span></div>
                {msgsLoading ? (
                  <div style={{ padding:24, textAlign:'center', color:'var(--muted)', fontFamily:'var(--mono)', fontSize:12 }}>Loading…</div>
                ) : thread.map(m => (
                  <div className={'msg '+(m.mine?'me':'them')} key={m.id}>
                    <span className={'avatar m-av '+(m.mine?'accent':'')} style={!m.mine?{ fontFamily:'var(--mono)', fontSize:10 }:null}>{m.mine?initials(writer.name):code.split('-')[1]}</span>
                    <div className="m-body">
                      <div className="m-meta"><span className="nm">{m.mine?'You':code}</span><span className="tm">{wMsgTime(m.time)}</span></div>
                      <div className="m-bubble">{m.body}</div>
                    </div>
                  </div>
                ))}
                <div ref={endRef}></div>
              </div>
              <form className="composer" onSubmit={send}>
                <textarea placeholder={`Message ${code}…`} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey) send(e) }} />
                <button type="submit" className="btn btn-accent btn-lg" disabled={!draft.trim()||sending}>{WIco.arrow()}</button>
              </form>
            </div>
          )}

          {tab === 'files' && (
            <div>
              {/* Hidden file inputs (shared by the builder + status views) */}
              <input ref={draftRef} type="file" multiple hidden onChange={e=>{ const fl=e.target.files; e.target.value=''; deliver(fl,'draft') }} />
              <input ref={finalRef} type="file" multiple hidden onChange={e=>{ const fl=e.target.files; e.target.value=''; deliver(fl,'final') }} />
              <input ref={aiRef} type="file" multiple hidden onChange={e=>{ const fl=e.target.files; e.target.value=''; deliver(fl,'ai_report',{score:aiScore}) }} />
              <input ref={plagRef} type="file" multiple hidden onChange={e=>{ const fl=e.target.files; e.target.value=''; deliver(fl,'plag_report',{score:plagScore}) }} />

              {/* Submission — adapts to the stage of the work */}
              {(a.status === 'writing' || a.status === 'revision') ? (
                <div className="card-2" style={{ padding:20, marginBottom:16 }}>
                  <div style={{ fontWeight:700, fontSize:15 }}>{a.status === 'revision' ? 'Make your revisions & resubmit' : 'Submit your work for review'}</div>
                  <div style={{ fontSize:13, color:'var(--muted)', marginTop:3, maxWidth:480 }}>Attach your completed work and supporting reports, then submit. Our QC team checks everything before the student sees it — work is never sent to them directly.</div>
                  <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:9 }}>
                    {pkgSlot('final', finalRef, 'Final document(s)', 'Your completed work — add as many files as the submission needs', { required:true })}
                    {pkgSlot('ai_report', aiRef, 'AI-detection report', 'Optional — attach your AI score', { scoreVal:aiScore, scoreSet:setAiScore, scorePh:'AI %' })}
                    {pkgSlot('plag_report', plagRef, 'Originality report', 'Optional — attach your similarity score', { scoreVal:plagScore, scoreSet:setPlagScore, scorePh:'Sim %' })}
                    {pkgSlot('draft', draftRef, 'Supporting files', 'Optional — appendices, data, drafts, anything extra', {})}
                  </div>
                  <label style={{ display:'block', marginTop:14, fontSize:11, color:'var(--muted-2)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'.06em' }}>Note to QC <span style={{ textTransform:'none', letterSpacing:0, color:'var(--muted)' }}>(optional)</span></label>
                  <textarea value={qcNote} onChange={e=>setQcNote(e.target.value)} rows={2} placeholder="Anything the reviewer should know about this submission…"
                    style={{ width:'100%', boxSizing:'border-box', marginTop:6, padding:'9px 12px', border:'1.5px solid var(--line)', borderRadius:8, background:'var(--paper-2)', fontFamily:'var(--sans)', fontSize:13, resize:'vertical', minHeight:46 }} />
                  <div style={{ marginTop:14, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                    <button className="btn btn-accent btn-lg" disabled={busy || !hasFinal} onClick={submitForReview}>{busy ? 'Submitting…' : <>{a.status === 'revision' ? 'Resubmit for review' : 'Submit for review'} {WIco.arrow()}</>}</button>
                    <span style={{ fontSize:12.5, color: hasFinal ? 'var(--muted)' : 'var(--accent-deep)' }}>{hasFinal ? 'We review it before it reaches the student.' : 'Attach your final document to submit.'}</span>
                  </div>
                </div>
              ) : a.status === 'assigned' ? (
                <div className="card-2" style={{ padding:20, marginBottom:16, fontSize:13.5, color:'var(--muted)' }}>Hit <b style={{ color:'var(--ink)' }}>Start work</b> above to begin — your submission tools appear here once you've started.</div>
              ) : a.status === 'in_review' ? (
                <div className="card-2" style={{ padding:20, marginBottom:16, display:'flex', gap:12, alignItems:'flex-start' }}>
                  <span style={{ color:'var(--accent)', flexShrink:0, marginTop:1 }}>{WIco.clock()}</span>
                  <div><div style={{ fontWeight:700, fontSize:14.5 }}>Submitted — under QC review</div><div style={{ fontSize:13, color:'var(--muted)', marginTop:2 }}>Our team is checking your submission. You'll be notified if it's approved for the student or sent back with revision notes.</div></div>
                </div>
              ) : (
                <div className="card-2" style={{ padding:20, marginBottom:16, display:'flex', gap:12, alignItems:'flex-start' }}>
                  <span style={{ color:'var(--good)', flexShrink:0, marginTop:1 }}>{WIco.check()}</span>
                  <div><div style={{ fontWeight:700, fontSize:14.5 }}>Delivered to the student</div><div style={{ fontSize:13, color:'var(--muted)', marginTop:2 }}>This assignment is complete. Nice work.</div></div>
                </div>
              )}
              {files.length === 0 ? (
                <div style={{ padding:'8px 4px', color:'var(--muted)', fontSize:13.5, fontStyle:'italic', fontFamily:'var(--serif)' }}>No files yet. The student's rubric and your drafts will appear here.</div>
              ) : files.map(f => (
                <div className="frow" key={f.id}>
                  <span className="fic">{WIco.file({ width:20, height:20 })}</span>
                  <span className="fmeta">
                    <span className="fn">{f.file_name}</span>
                    <span className="fs">
                      <span className={'badge '+(FILE_TONE[f.kind]||'tone-mute')} style={{ padding:'1px 8px', fontSize:11 }}>{(f.kind||'other').replace('_',' ')}</span>
                      {f.version && <><span className="d"></span><span style={{ fontFamily:'var(--mono)', fontSize:11 }}>{f.version}</span></>}
                      {f.score != null && <><span className="d"></span><span className="badge tone-good" style={{ padding:'1px 8px', fontSize:11 }}>{f.score}%</span></>}
                      <span className="d"></span>{fmtBytes(f.size_bytes)}<span className="d"></span>{f.uploaded_by===user.id?'Uploaded by you':'From student'}
                    </span>
                  </span>
                  <button className="btn btn-sm btn-ghost" onClick={()=>downloadFile(f)}>Download</button>
                </div>
              ))}
            </div>
          )}

          {tab === 'brief' && (
            <div>
              <div className="kv">
                <div className="row"><span className="k">Program</span><span className="v">{a.program || '—'}</span></div>
                <div className="row"><span className="k">Level</span><span className="v">{a.level_label || a.level || '—'}</span></div>
                <div className="row"><span className="k">Scope</span><span className="v">{a.scope_label || '—'}</span></div>
                <div className="row"><span className="k">Due</span><span className="v">{wdate(a.due_date)}</span></div>
                {a.notes && <div className="row"><span className="k">Notes</span><span className="v" style={{ maxWidth:300, textAlign:'right' }}>{a.notes}</span></div>}
              </div>
            </div>
          )}
        </section>

        <aside className="od-side">
          <div className="side-card">
            <div className="sc-h">Status</div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}><WBadge status={a.status} /><span className="mono" style={{ fontSize:12, color:'var(--muted)' }}>due {wdate(a.due_date)}</span></div>
            {nextAction ? <button className="btn btn-accent" style={{ width:'100%' }} disabled={busy} onClick={nextAction.fn}>{nextAction.label}</button>
              : <div style={{ fontSize:13, color:'var(--muted)', fontStyle:'italic', fontFamily:'var(--serif)' }}>{a.status==='in_review'?'Submitted — awaiting student & Meridian review.':'Delivered and closed. Nice work.'}</div>}
          </div>
          <div className="side-card">
            <div className="sc-h">Timeline</div>
            <div className="timeline">
              {WFLOW.map(([s,label],i) => {
                const eff = wFlowIndex(a.status)
                const cls = i < eff ? 'done' : i === eff ? 'cur' : 'pending'
                return (
                  <div key={s} className={'tl ' + cls}>
                    <div className="rail"><span className="dot"></span><span className="line"></span></div>
                    <div className="tl-b"><div className="tl-t">{label}</div><div className="tl-d">{i < eff ? 'Complete' : i === eff ? 'Now' : 'Upcoming'}</div></div>
                  </div>
                )
              })}
            </div>
          </div>
          {pay > 0 && (
            <div className="side-card">
              <div className="sc-h">Payment to you</div>
              <div className="kv">
                <div className="row"><span className="k">You earn</span><span className="v mono" style={{ color:'var(--accent-deep)' }}>{wmoney(pay)}</span></div>
                <div className="row"><span className="k">Paid</span><span className="v">{a.status==='delivered'?'On delivery ✓':'On delivery'}</span></div>
              </div>
            </div>
          )}
          <div className="side-card">
            <div className="sc-h">Student</div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span className="avatar" style={{ width:42, height:42, fontFamily:'var(--mono)', fontSize:12 }}>{code.split('-')[1]}</span>
              <div><div style={{ fontWeight:700, fontSize:14 }}>{code}</div><div style={{ color:'var(--muted)', fontSize:12.5 }}>Identity hidden by Meridian</div></div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}

// ── EARNINGS ──────────────────────────────────────────────────────────────────
function WEarnings({ assignments }) {
  const tx = useMemo(() => assignments.map(a => ({
    ref:a.ref, code:clientCode(a.id), amount:orderPay(a),
    status: ['delivered','closed'].includes(a.status) ? 'paid' : a.status === 'in_review' ? 'processing' : 'upcoming',
    date: a.due_date,
  })).filter(t => t.amount > 0).sort((x,y) => String(y.date||'').localeCompare(String(x.date||''))), [assignments])
  const stats = useMemo(() => ({
    available: tx.filter(t=>t.status==='paid').reduce((s,t)=>s+t.amount,0),
    processing: tx.filter(t=>t.status==='processing').reduce((s,t)=>s+t.amount,0),
    upcoming: tx.filter(t=>t.status==='upcoming').reduce((s,t)=>s+t.amount,0),
  }), [tx])
  const TONE = { paid:'tone-good', processing:'tone-warn', upcoming:'tone-mute' }
  const LABEL = { paid:'Paid', processing:'Processing', upcoming:'On delivery' }
  return (
    <main className="pwrap" style={{ maxWidth:980 }}>
      <div className="phead">
        <div><h1>Your <span className="italic">earnings.</span></h1><p className="sub">Paid on delivery. Payouts run every Friday.</p></div>
        <a className="btn btn-accent btn-lg" href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || '12057279363'}`} target="_blank" rel="noreferrer">Request payout</a>
      </div>
      <div className="statgrid">
        <div className="stat"><div className="s-top"><span className="s-ic">{WIco.money()}</span></div><div className="s-n accent">{wmoney(stats.available)}</div><div className="s-l">Available to withdraw</div></div>
        <div className="stat"><div className="s-top"><span className="s-ic">{WIco.clock()}</span></div><div className="s-n">{wmoney(stats.processing)}</div><div className="s-l">Processing</div></div>
        <div className="stat"><div className="s-top"><span className="s-ic">{WIco.file()}</span></div><div className="s-n">{wmoney(stats.upcoming)}</div><div className="s-l">Upcoming on delivery</div></div>
        <div className="stat"><div className="s-top"><span className="s-ic">{WIco.check()}</span></div><div className="s-n">{tx.length}</div><div className="s-l">Total assignments</div></div>
      </div>
      <div className="ord-table-wrap">
        <div className="t-wrap">
          <table className="tbl">
            <thead><tr><th>Assignment</th><th>Student</th><th>Status</th><th>Date</th><th style={{ textAlign:'right' }}>Amount</th></tr></thead>
            <tbody>
              {tx.length === 0 ? (
                <tr style={{ cursor:'default' }}><td colSpan="5" style={{ textAlign:'center', color:'var(--muted)', fontStyle:'italic', fontFamily:'var(--serif)', padding:'28px 0' }}>No earnings yet — they'll appear as you deliver work.</td></tr>
              ) : tx.map((t,i) => (
                <tr key={i} style={{ cursor:'default' }}>
                  <td className="td-ref">{t.ref}</td>
                  <td style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)' }}>{t.code}</td>
                  <td><span className={'badge '+TONE[t.status]} style={{ padding:'2px 9px', fontSize:11 }}><span className="dot" style={{ background:'currentColor' }}></span>{LABEL[t.status]}</span></td>
                  <td style={{ fontSize:13, color:'var(--muted)' }}>{wdate(t.date)}</td>
                  <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontSize:12.5 }}>{wmoney(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}

// ── AVAILABILITY / PROFILE ──────────────────────────────────────────────────────
function WAvailability({ writer, available, onToggleAvail, load, onSave, onToast }) {
  const [cap, setCap] = useState(writer.max_concurrent || 5)
  const [tags, setTags] = useState(writer.specialties || [])
  const [newTag, setNewTag] = useState('')
  const [p, setP] = useState({ name:writer.name || '', degree:writer.degree || '', field:writer.field || writer.specialty || '', email:writer.payout_email || writer.email || '', bio:writer.bio || '' })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setP(x => ({ ...x, [k]:v }))
  function addTag(e){ e.preventDefault(); const t = newTag.trim(); if(!t) return; if(!tags.includes(t)) setTags(ts => [...ts, t]); setNewTag('') }
  async function save() {
    setSaving(true)
    await onSave({ name:p.name, degree:p.degree, field:p.field, payout_email:p.email, bio:p.bio, max_concurrent:cap, specialties:tags })
    setSaving(false); onToast('Profile saved')
  }
  return (
    <main className="pwrap prof-wrap" style={{ maxWidth:820 }}>
      <div className="phead"><div><h1>Profile &amp; <span className="italic">availability.</span></h1><p className="sub">Control your workload and the work you get matched to.</p></div></div>
      <div className="prof-id">
        <span className="avatar accent">{initials(p.name)}</span>
        <div><div className="nm">{p.name}</div><div className="meta">{p.field}{p.degree?` · ${p.degree}`:''} · {WIco.shield({ width:13, height:13 })}</div></div>
      </div>
      <div className="psec">
        <div className="psec-h">Availability</div>
        <div className="pcard">
          <div className="toggle-row" style={{ borderBottom:'1px solid var(--line)' }}>
            <div className="t-tx"><div className="t-t">Accepting new assignments</div><div className="t-s">When off, you won't be offered new work — active assignments continue.</div></div>
            <button className={'sw'+(available?' on':'')} role="switch" aria-checked={available} onClick={onToggleAvail}></button>
          </div>
          <div className="toggle-row" style={{ borderBottom:'none' }}>
            <div className="t-tx"><div className="t-t">Max concurrent assignments</div><div className="t-s">You're carrying {load} right now.</div></div>
            <select value={cap} onChange={e=>setCap(Number(e.target.value))} style={{ width:90 }}>{[3,4,5,6,7].map(n => <option key={n} value={n}>{n}</option>)}</select>
          </div>
          <div style={{ marginTop:6 }}><div className="loadbar" style={{ gap:4 }}>{Array.from({ length:cap }).map((_,i)=><span key={i} className={i<load?'f':''} style={{ width:'100%', height:6 }}></span>)}</div></div>
        </div>
      </div>
      <div className="psec">
        <div className="psec-h">Specialties · what you get matched to</div>
        <div className="pcard">
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>
            {tags.map(t => (
              <span key={t} className="pill-tag" style={{ padding:'6px 10px', fontSize:12.5, gap:8 }}>{t}
                <button onClick={()=>setTags(ts=>ts.filter(x=>x!==t))} aria-label={'Remove '+t} style={{ display:'grid', placeItems:'center', color:'var(--muted)' }}>{WIco.x({ width:12, height:12 })}</button>
              </span>
            ))}
            {tags.length === 0 && <span style={{ color:'var(--muted)', fontSize:13, fontStyle:'italic', fontFamily:'var(--serif)' }}>Add specialties so we can match you with the right work.</span>}
          </div>
          <form onSubmit={addTag} style={{ display:'flex', gap:8 }}>
            <input type="text" placeholder="Add a specialty…" value={newTag} onChange={e=>setNewTag(e.target.value)} />
            <button type="submit" className="btn btn-soft btn-sm" disabled={!newTag.trim()}>Add</button>
          </form>
        </div>
      </div>
      <div className="psec">
        <div className="psec-h">Profile</div>
        <div className="pcard">
          <div className="pgrid">
            <div className="fld"><label>Display name</label><input type="text" value={p.name} onChange={e=>set('name',e.target.value)} /></div>
            <div className="fld"><label>Degree</label><input type="text" value={p.degree} onChange={e=>set('degree',e.target.value)} /></div>
            <div className="fld"><label>Primary field</label><input type="text" value={p.field} onChange={e=>set('field',e.target.value)} /></div>
            <div className="fld"><label>Payout email</label><input type="email" value={p.email} onChange={e=>set('email',e.target.value)} /></div>
            <div className="fld full"><label>Short bio (shown to Meridian, never to students)</label><textarea rows="3" value={p.bio} onChange={e=>set('bio',e.target.value)}></textarea></div>
          </div>
        </div>
      </div>
      <div className="savebar">
        <span className="saved">{WIco.shield({ width:15, height:15 })} Your identity is never shared with students.</span>
        <button className="btn btn-accent btn-lg" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
      </div>

      <WChangePassword onToast={onToast} />
    </main>
  )
}

// ── CHANGE PASSWORD (expert) ───────────────────────────────────────────────────
function WChangePassword({ onToast }) {
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
        <p style={{ color:'var(--muted)', fontSize:13.5, margin:'0 0 14px' }}>Set your own password here — choose one you'll remember.</p>
        <div className="pgrid">
          <div className="fld"><label>New password</label><input type="password" autoComplete="new-password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="At least 5 characters" /></div>
          <div className="fld"><label>Confirm new password</label><input type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Re-enter it" /></div>
        </div>
        {err && <div style={{ color:'var(--bad)', fontSize:13, marginTop:10 }} role="alert">{err}</div>}
        <div style={{ marginTop:14 }}><button className="btn btn-accent" onClick={save} disabled={saving || !pw}>{saving ? 'Updating…' : 'Update password'}</button></div>
      </div>
    </div>
  )
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function WriterApp() {
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [writer, setWriter] = useState(null)
  const [writerChecked, setWriterChecked] = useState(false)
  const [route, setRoute] = useState('work')
  const [offers, setOffers] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState(null)
  const [toast, setToast] = useState(null)
  const [acceptBusy, setAcceptBusy] = useState(false)
  const [recovery, setRecovery] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  // Sidebar is the default expert layout. (Key bumped so any prior 'top' choice
  // resets to the sidebar default; experts can still switch via the menu.)
  const [layout, setLayout] = useState(() => { try { return localStorage.getItem('ms_ex_layout2') || 'sidebar' } catch { return 'sidebar' } })
  useEffect(() => { try { localStorage.setItem('ms_ex_layout2', layout) } catch {} }, [layout])

  useEffect(() => { document.title = 'Expert workspace — Meridian Studio' }, [])
  useEffect(() => {
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      setUser(session?.user ?? null); setAuthChecked(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) { setWriter(null); setWriterChecked(false); setAssignments([]); setOffers([]); return }
    let active = true
    ;(async () => {
      let { data } = await supabase.from('writers').select('*').eq('profile_id', user.id).maybeSingle()
      // Self-heal: a newly-added expert may not be linked to their writers row yet.
      // claim_writer_profile() links it by matching their verified email, so the
      // expert reaches their dashboard instead of "Not an expert account".
      if (!data) {
        try { await supabase.rpc('claim_writer_profile') } catch {}
        ;({ data } = await supabase.from('writers').select('*').eq('profile_id', user.id).maybeSingle())
      }
      if (!active) return
      setWriter(data); setWriterChecked(true); if (data) loadAll(data)
    })()
    return () => { active = false }
  }, [user])

  async function loadAll(w) {
    setLoading(true)
    const [{ data: orders }, { data: off }] = await Promise.all([
      supabase.from('orders').select('id, ref, program, scope_label, level, level_label, due_date, status, rate_writing, rate_project, notes, writer_id').eq('writer_id', w.id).order('created_at', { ascending:false }),
      supabase.rpc('writer_offers'),
    ])
    setAssignments(orders || [])
    setOffers(off || [])
    setLoading(false)
  }

  function showToast(m) { setToast(m); setTimeout(() => setToast(null), 2200) }
  function openAssign(a) { setCurrent(a); setRoute('assignment'); window.scrollTo(0,0) }
  function patchAssign(id, patch) {
    setAssignments(as => as.map(a => a.id===id ? { ...a, ...patch } : a))
    setCurrent(c => c && c.id===id ? { ...c, ...patch } : c)
  }
  async function accept(o) {
    setAcceptBusy(true)
    const { data, error } = await supabase.rpc('writer_accept_order', { p_order:o.id })
    setAcceptBusy(false)
    if (error || !data) { showToast('That offer is no longer available'); if (writer) loadAll(writer); return }
    showToast(`Accepted ${o.ref}`)
    if (writer) loadAll(writer)
  }
  async function toggleAvail() {
    if (!writer) return
    const next = !writer.accepting
    setWriter(w => ({ ...w, accepting: next }))
    await supabase.from('writers').update({ accepting: next }).eq('id', writer.id)
    loadAll({ ...writer, accepting: next })
  }
  async function saveProfile(patch) {
    if (!writer) return
    const { data } = await supabase.from('writers').update(patch).eq('id', writer.id).select().single()
    if (data) setWriter(data)
  }
  async function signOut() {
    await supabase.auth.signOut()
    setUser(null); setWriter(null); setWriterChecked(false); setRoute('work'); setCurrent(null)
  }

  if (!authChecked) return <div className="app" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', color:'var(--muted)', fontFamily:'var(--mono)', fontSize:13 }}>Loading…</div>
  if (recovery) return <div className="app"><WSetNewPassword onDone={() => setRecovery(false)} /></div>
  if (!user) return <div className="app"><WSignIn /></div>
  if (!writerChecked) return <div className="app" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', color:'var(--muted)', fontFamily:'var(--mono)', fontSize:13 }}>Loading your workspace…</div>
  if (!writer) {
    return (
      <div className="app">
        <main className="pwrap" style={{ minHeight:'70vh', display:'grid', placeItems:'center' }}>
          <div className="empty card" style={{ maxWidth:460 }}>
            <div className="ic">{WIco.shield()}</div>
            <h3>Not an expert account</h3>
            <p>This workspace is for Meridian experts. The email <b>{user.email}</b> isn't linked to an expert profile. If you're a client, head to your workspace instead.</p>
            <div className="acts"><a className="btn btn-accent btn-lg" href="/workspace">Go to client workspace</a><button className="btn btn-ghost btn-lg" onClick={signOut}>Sign out</button></div>
          </div>
        </main>
      </div>
    )
  }

  const load = assignments.filter(a => ['assigned','writing','revision','in_review','new','brief_received'].includes(a.status)).length

  const ShellComponent = layout === 'sidebar' ? WSidebar : WShell

  return (
    <div className="app">
      <ShellComponent writer={writer} route={route} setRoute={setRoute} available={!!writer.accepting} onToggleAvail={toggleAvail} onSignOut={signOut} setLayout={setLayout} offers={offers} assignments={assignments} onSupport={()=>setSupportOpen(true)}>
        {route === 'work' && <MyWork writer={writer} offers={offers} assignments={assignments} available={!!writer.accepting} loading={loading} onAccept={accept} onOpen={openAssign} acceptBusy={acceptBusy} />}
        {route === 'assignment' && current && <WAssignmentDetail a={current} writer={writer} user={user} onBack={()=>setRoute('work')} onChanged={patchAssign} onToast={showToast} />}
        {route === 'earnings' && <WEarnings assignments={assignments} />}
        {route === 'availability' && <WAvailability writer={writer} available={!!writer.accepting} onToggleAvail={toggleAvail} load={load} onSave={saveProfile} onToast={showToast} />}
      </ShellComponent>
      {supportOpen && <SupportChat user={user} name={writer.name} surface="writer" onClose={()=>setSupportOpen(false)} />}
      {toast && <div className="toast" role="status"><span className="tk">{WIco.check({ width:14, height:14 })}</span>{toast}</div>}
    </div>
  )
}
