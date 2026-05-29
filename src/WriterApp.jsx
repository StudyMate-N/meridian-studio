import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from './lib/supabase.js'
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
const FILE_TONE = { rubric:'tone-violet', brief:'tone-info', draft:'tone-warn', final:'tone-good', revision:'tone-bad', other:'tone-mute' }

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
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  async function submit(e) {
    e.preventDefault()
    if (!/.+@.+\..+/.test(email.trim())) { setErr('Enter a valid email address.'); return }
    setErr(''); setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: 'https://primemeridian.academy/expert' } })
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
          {!sent ? (
            <>
              <h1>Expert <span className="italic">sign-in.</span></h1>
              <p className="lede">Access your assignments, message students, deliver work, and track earnings.</p>
              <form className="auth-form" onSubmit={submit} noValidate>
                <div className="fld"><label htmlFor="we">Email address</label><input id="we" type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)} /></div>
                {err && <div style={{ color:'var(--bad)', fontSize:13 }} role="alert">{err}</div>}
                <button type="submit" className="btn btn-accent btn-lg" style={{ width:'100%' }} disabled={loading}>{loading ? 'Sending…' : <>Email me a magic link {WIco.arrow()}</>}</button>
                <p className="auth-note">{WIco.shield({ width:16, height:16 })}<span>Expert accounts are invite-only. Use the email Meridian set you up with.</span></p>
              </form>
            </>
          ) : (
            <div className="auth-ok">
              <span className="ck" aria-hidden="true">{WIco.msg({ width:28, height:28 })}</span>
              <h1 style={{ fontSize:38 }}>Check your <span className="italic">inbox.</span></h1>
              <p className="lede" style={{ marginTop:16 }}>We sent a secure sign-in link to <span className="em">{email}</span>.</p>
              <p className="auth-foot" style={{ marginTop:18 }}>Didn't get it? <a href="#" onClick={e=>{e.preventDefault();setSent(false)}}>Try another email</a></p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ── SHELL ─────────────────────────────────────────────────────────────────────
function WShell({ writer, route, setRoute, available, onToggleAvail, onSignOut, children }) {
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
                <div className="sep"></div>
                <button role="menuitem" onClick={()=>{setMenu(false);onSignOut()}}>{WIco.logout()} Sign out</button>
              </div>
            )}
          </div>
        </div>
      </header>
      {children}
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
  const load = counts.active + counts.submitted
  const cap = writer.max_concurrent || 5

  return (
    <main className="pwrap">
      <div className="phead">
        <div><h1>My <span className="italic">work.</span></h1><p className="sub">Welcome back, {writer.name}. {load} active · {Math.max(0, cap - load)} slots open.</p></div>
        <div className="chip" style={{ flex:'none', minWidth:0, padding:'12px 18px' }}><div className="n accent" style={{ fontSize:24 }}>{load}/{cap}</div><div className="l">Current load</div></div>
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
  const code = clientCode(a.id)

  function mapMsg(r) {
    return { id:r.id, mine: r.sender_id === user.id, body:r.body, time:new Date(r.created_at) }
  }
  useEffect(() => {
    let active = true
    setTab('chat'); setDraft(''); setMsgsLoading(true)
    supabase.from('order_messages').select('*').eq('order_id', a.id).eq('is_internal', false).order('created_at', { ascending:true })
      .then(({ data }) => { if (active) { setThread((data||[]).map(mapMsg)); setMsgsLoading(false) } })
    supabase.from('order_files').select('*').eq('order_id', a.id).order('created_at', { ascending:true })
      .then(({ data }) => { if (active) setFiles(data||[]) })
    const ch = supabase.channel(`wo-${a.id}-msgs`)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'order_messages', filter:`order_id=eq.${a.id}` },
        p => { if (p.new.is_internal) return; setThread(t => t.some(m=>m.id===p.new.id)?t:[...t, mapMsg(p.new)]) })
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

  async function deliver(file, kind) {
    if (!file) return
    setBusy(true)
    const path = `${a.id}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g,'_')}`
    const { error: upErr } = await supabase.storage.from('order-files').upload(path, file)
    if (upErr) { setBusy(false); console.error(upErr); onToast('Upload failed'); return }
    const { data } = await supabase.from('order_files').insert({ order_id:a.id, uploaded_by:user.id, file_name:file.name, file_path:path, kind, size_bytes:file.size }).select().single()
    if (data) setFiles(f => [...f, data])
    if (kind === 'final') {
      await supabase.rpc('writer_set_status', { p_order:a.id, p_status:'in_review' })
      onChanged(a.id, { status:'in_review' })
      onToast('Final delivered · submitted for review')
    } else { onToast('Draft uploaded') }
    setBusy(false)
  }

  async function setStatus(status, label) {
    setBusy(true)
    const { data, error } = await supabase.rpc('writer_set_status', { p_order:a.id, p_status:status })
    setBusy(false)
    if (error || !data) { console.error(error); onToast('Could not update'); return }
    onChanged(a.id, { status }); onToast(label)
  }

  const nextAction = a.status === 'assigned' ? { label:'Start work', fn:() => setStatus('writing', 'Marked in progress') }
    : a.status === 'writing' ? { label:'Submit for review', fn:() => setStatus('in_review', 'Submitted for review') }
    : a.status === 'revision' ? { label:'Resubmit', fn:() => setStatus('in_review', 'Resubmitted') }
    : null
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
            <button className={'tab'+(tab==='files'?' on':'')} onClick={()=>setTab('files')}>{WIco.file()} Files &amp; deliver {files.length>0 && <span className="ct">{files.length}</span>}</button>
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
              <div className="card-2" style={{ padding:18, marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, flexWrap:'wrap' }}>
                <div><div style={{ fontWeight:700, fontSize:15 }}>Deliver your work</div><div style={{ fontSize:13, color:'var(--muted)', marginTop:3 }}>Upload a draft for feedback, or deliver the final to submit for review.</div></div>
                <div style={{ display:'flex', gap:10 }}>
                  <input ref={draftRef} type="file" hidden onChange={e=>{ deliver(e.target.files[0],'draft'); e.target.value='' }} />
                  <input ref={finalRef} type="file" hidden onChange={e=>{ deliver(e.target.files[0],'final'); e.target.value='' }} />
                  <button className="btn btn-ghost" disabled={busy} onClick={()=>draftRef.current?.click()}>Upload draft</button>
                  <button className="btn btn-accent" disabled={busy} onClick={()=>finalRef.current?.click()}>Deliver final {WIco.arrow()}</button>
                </div>
              </div>
              {files.length === 0 ? (
                <div style={{ padding:'8px 4px', color:'var(--muted)', fontSize:13.5, fontStyle:'italic', fontFamily:'var(--serif)' }}>No files yet. The student's rubric and your drafts will appear here.</div>
              ) : files.map(f => (
                <div className="frow" key={f.id}>
                  <span className="fic">{WIco.file({ width:20, height:20 })}</span>
                  <span className="fmeta">
                    <span className="fn">{f.file_name}</span>
                    <span className="fs"><span className={'badge '+(FILE_TONE[f.kind]||'tone-mute')} style={{ padding:'1px 8px', fontSize:11 }}>{f.kind}</span><span className="d"></span>{fmtBytes(f.size_bytes)}<span className="d"></span>{f.uploaded_by===user.id?'Uploaded by you':'From student'}</span>
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
    </main>
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

  useEffect(() => { document.title = 'Expert workspace — Meridian Studio' }, [])
  useEffect(() => {
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((_e, session) => { setUser(session?.user ?? null); setAuthChecked(true) })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) { setWriter(null); setWriterChecked(false); setAssignments([]); setOffers([]); return }
    supabase.from('writers').select('*').eq('profile_id', user.id).maybeSingle()
      .then(({ data }) => { setWriter(data); setWriterChecked(true); if (data) loadAll(data) })
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

  return (
    <div className="app">
      <WShell writer={writer} route={route} setRoute={setRoute} available={!!writer.accepting} onToggleAvail={toggleAvail} onSignOut={signOut}>
        {route === 'work' && <MyWork writer={writer} offers={offers} assignments={assignments} available={!!writer.accepting} loading={loading} onAccept={accept} onOpen={openAssign} acceptBusy={acceptBusy} />}
        {route === 'assignment' && current && <WAssignmentDetail a={current} writer={writer} user={user} onBack={()=>setRoute('work')} onChanged={patchAssign} onToast={showToast} />}
        {route === 'earnings' && <WEarnings assignments={assignments} />}
        {route === 'availability' && <WAvailability writer={writer} available={!!writer.accepting} onToggleAvail={toggleAvail} load={load} onSave={saveProfile} onToast={showToast} />}
      </WShell>
      {toast && <div className="toast" role="status"><span className="tk">{WIco.check({ width:14, height:14 })}</span>{toast}</div>}
    </div>
  )
}
