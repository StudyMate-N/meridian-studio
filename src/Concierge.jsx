/* Concierge.jsx — Meridian Concierge: live AI support widget.
   React port of the prototype (meridian/support.jsx). AI Q&A + rubric parsing
   are proxied through the `concierge` Supabase Edge Function so the Anthropic
   key stays server-side. Render <Concierge /> once near the app root. */
import { useState, useEffect, useRef } from 'react'
import './concierge.css'

/* ---- shared rate data (kept in sync with HomePage LEVELS/SCOPES/DEADLINES) -- */
const LV = [
  { id: 'ug',  name: 'Undergraduate',       rate: 14, proj: null },
  { id: 'ms',  name: "Master's",            rate: 19, proj: null },
  { id: 'adv', name: 'Advanced / Pro',      rate: 23, proj: 26  },
  { id: 'dnp', name: 'Doctoral · Practice', rate: 27, proj: 31  },
  { id: 'phd', name: 'Doctoral · Research', rate: 30, proj: 36  },
]
const SC = [
  { id: 'one',    label: 'One assignment',     def: 5,   proj: false },
  { id: 'course', label: 'A full course',      def: 28,  proj: false },
  { id: 'term',   label: 'A full term',        def: 60,  proj: false },
  { id: 'cap',    label: 'Capstone / thesis',  def: 80,  proj: true  },
  { id: 'diss',   label: 'Dissertation',       def: 180, proj: true  },
  { id: 'prog',   label: 'Your whole program', def: 180, proj: false },
]
const DL = [
  { id: 'relaxed',  label: 'Relaxed',  sub: '10+ days' },
  { id: 'standard', label: 'Standard', sub: '3–7 days' },
  { id: 'rush',     label: 'Rush',     sub: '24–48 hrs' },
]
const MINRATE = Math.min(...LV.map(l => l.rate))
const lvl = id => LV.find(l => l.id === id)
const scp = id => SC.find(s => s.id === id)
const perPage = (levelId, scopeId) => { const l = lvl(levelId), s = scp(scopeId); if (!l) return MINRATE; return (s && s.proj && l.proj != null) ? l.proj : l.rate }

const WA = import.meta.env.VITE_WHATSAPP_NUMBER || '12057279363'
const FN_URL = (import.meta.env.VITE_SUPABASE_URL || '') + '/functions/v1/concierge'
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

async function callAI(prompt, system) {
  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON },
    body: JSON.stringify({ prompt, system }),
  })
  if (!res.ok) throw new Error('ai_http_' + res.status)
  const data = await res.json()
  const text = (data && data.text || '').trim()
  if (!text) throw new Error('ai_empty')
  return text
}

const I = {
  chat: p => <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.6 9.6 0 0 1-3.3-.5L3 21l1.3-4a8 8 0 0 1-1-4A8.4 8.4 0 0 1 12 4a8.4 8.4 0 0 1 9 7.5z" /></svg>,
  min: p => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14" /></svg>,
  send: p => <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 5l7 7-7 7" /></svg>,
  clip: p => <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 11.5l-8.4 8.4a5 5 0 0 1-7-7l8.4-8.4a3.3 3.3 0 0 1 4.7 4.7l-8.4 8.4a1.7 1.7 0 0 1-2.3-2.3l7.7-7.7" /></svg>,
  up: p => <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M12 16V4M7 9l5-5 5 5" /></svg>,
  x: p => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 6L6 18M6 6l12 12" /></svg>,
  wa: p => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...p}><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-.9 1.2-.3.2-.6.1c-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5s0-.4 0-.5-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.5.3-.7.3-1.4.2-1.5z M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.4.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2" /></svg>,
  spark: p => <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" {...p}><path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6z" /></svg>,
}

const GROUND = `You are the Meridian Concierge, the friendly support assistant for Meridian Studio — a legitimate academic SUPPORT service (coaching, editing, research help, model work) for students across 40+ disciplines and all degree levels, undergraduate through PhD.
Key facts: human experts hold advanced degrees in the student's field; same expert stays with you; APA 7 default; 50% deposit to start, balance on delivery; quote confirmed free within 4 hours; delivered before deadline; unlimited revisions; originality + AI screened; fully confidential.
PRICING RULE — never state large totals. Only ever quote the lowest unit, e.g. "support starts from $${MINRATE}/page", or a single level's per-page rate. Totals are confirmed later inside a brief.
Framing: it's legitimate help you learn from and can defend — like a writing centre or tutor. Never promise grades. Stay strictly on academic-support topics. If asked something sensitive, about a dispute, or you're unsure, suggest talking to a person.
Reply warmly and SHORT — under 60 words, plain text, no markdown.`

const MAIN = [
  { id: 'upload', label: 'Upload my rubric', primary: true },
  { id: 'estimate', label: 'Get a quick estimate' },
  { id: 'allowed', label: 'Is this allowed?' },
  { id: 'how', label: 'How it works' },
  { id: 'human', label: 'Talk to a person' },
]
const LS = 'mc_state_v1'

export default function Concierge() {
  const [open, setOpen] = useState(false)
  const [nudge, setNudge] = useState(false)
  const [msgs, setMsgs] = useState([])
  const [sugg, setSugg] = useState(MAIN)
  const [typing, setTyping] = useState(false)
  const [input, setInput] = useState('')
  const [flow, setFlow] = useState(null)
  const [est, setEst] = useState({})
  const [over, setOver] = useState(false)
  const bodyRef = useRef(null)
  const fileRef = useRef(null)
  const seq = useRef(0)
  const nid = () => 'm' + (++seq.current)

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(LS) || 'null')
      if (s && s.msgs && s.msgs.length) { setMsgs(s.msgs); setSugg(s.sugg || MAIN); setFlow(s.flow || null); setEst(s.est || {}); seq.current = s.seq || s.msgs.length }
    } catch (e) {}
    const seen = localStorage.getItem('mc_nudge_seen')
    if (!seen) { const t = setTimeout(() => setNudge(true), 7000); return () => clearTimeout(t) }
  }, [])
  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify({ msgs, sugg, flow, est, seq: seq.current })) } catch (e) {} }, [msgs, sugg, flow, est])
  useEffect(() => { const el = bodyRef.current; if (el) el.scrollTop = el.scrollHeight }, [msgs, typing, sugg])

  function add(node) { setMsgs(m => [...m, { _id: nid(), ...node }]) }
  function botSay(text, suggestions, delay = 600) {
    setTyping(true); setSugg([])
    setTimeout(() => { setTyping(false); add({ type: 'bot', text }); if (suggestions !== undefined) setSugg(suggestions) }, delay)
  }
  function openPanel() {
    setOpen(true); setNudge(false); localStorage.setItem('mc_nudge_seen', '1')
    if (!msgs.length) {
      const greet = `Hi! I'm the Meridian Concierge. I can scope your assignment, answer questions, or get you a quick estimate — support starts from just $${MINRATE}/page. How can I help?`
      botSay(greet, MAIN, 350)
    }
  }

  // ---- AI free text -------------------------------------------------------
  async function askAI(text) {
    setTyping(true); setSugg([])
    const history = msgs.filter(m => m.type === 'bot' || m.type === 'user').slice(-6).map(m => `${m.type === 'user' ? 'Student' : 'Concierge'}: ${m.text}`).join('\n')
    try {
      const out = await callAI(`Conversation so far:\n${history}\n\nUser: ${text}\nConcierge:`, GROUND)
      setTyping(false); add({ type: 'bot', text: out || fallback(text) })
    } catch (e) { setTyping(false); add({ type: 'bot', text: fallback(text) }) }
    setSugg([{ id: 'upload', label: 'Upload my rubric', primary: true }, { id: 'estimate', label: 'Get an estimate' }, { id: 'human', label: 'Talk to a person' }])
  }
  function fallback(t) {
    const q = t.toLowerCase()
    if (/price|cost|how much|rate|\$/.test(q)) return `Support starts from $${MINRATE}/page and depends on your level and scope. Share your rubric and I'll scope it precisely — your full quote is confirmed free within 4 hours.`
    if (/allow|legal|cheat|caught|plagiar/.test(q)) return 'It’s legitimate academic support — coaching, editing and model work you learn from and can defend, like a writing centre or tutor. Everything’s originality- and AI-screened, and fully confidential.'
    return 'Happy to help with that. The quickest way is to share your rubric so I can scope it — or I can connect you with a person.'
  }

  // ---- flows --------------------------------------------------------------
  function handleChip(c) {
    if (c.id.includes(':')) return handleStep(c)
    add({ type: 'user', text: c.label })
    if (c.id === 'upload') { setFlow('upload'); botSay('Perfect — drop your rubric or assignment file below (PDF, Word or text) and I’ll read the level, scope, deadline and citation style for you. No typing needed.', [], 450); setTimeout(() => add({ type: 'drop' }), 480) }
    else if (c.id === 'estimate') { setFlow('estimate'); setEst({}); botSay(`Easy — and support starts from just $${MINRATE}/page. First, what level are you working at?`, LV.map(l => ({ id: 'lvl:' + l.id, label: l.name })), 450) }
    else if (c.id === 'allowed') botSay('Totally fair question. Meridian is legitimate academic support — coaching, editing, research help and model work you learn from and can defend, the same kind of help a writing centre or tutor gives. Everything’s originality- and AI-screened, and always confidential.', MAIN)
    else if (c.id === 'how') botSay('Three steps: 1) Share your rubric and pick your scope. 2) We match you with a degree-holding expert in your field and confirm a fixed quote within 4 hours. 3) You get model work, edits and guidance — with unlimited revisions, delivered before your deadline.', [{ id: 'upload', label: 'Upload my rubric', primary: true }, { id: 'estimate', label: 'Get an estimate' }])
    else if (c.id === 'human') { setFlow(null); botSay('Of course — Imani from our team usually replies within the hour. You can message us on WhatsApp now, or leave your details and we’ll reach out.', []); setTimeout(() => add({ type: 'card', kind: 'handoff' }), 480) }
    else if (c.id === 'lead') { setFlow('lead'); botSay('Great — what’s your name and the best WhatsApp number to reach you?', []) }
    else if (c.id === 'restart') { setFlow(null); setEst({}); botSay('No problem — what would you like to do?', MAIN) }
  }

  function handleStep(c) {
    const [k, v] = c.id.split(':')
    add({ type: 'user', text: c.label })
    if (k === 'lvl') { const e = { ...est, level: v }; setEst(e); botSay(`Good choice. ${lvl(v).name} support is $${lvl(v).rate}/page. What’s the scope?`, SC.map(s => ({ id: 'scope:' + s.id, label: s.label })), 500) }
    else if (k === 'scope') { const e = { ...est, scope: v }; setEst(e); botSay('Roughly how long is it? A ballpark is fine — we confirm exact length from your rubric.', [{ id: 'pg:8', label: 'A few pages' }, { id: 'pg:25', label: '~25 pages' }, { id: 'pg:60', label: '60+ pages' }, { id: 'pg:0', label: 'Not sure yet' }], 480) }
    else if (k === 'pg') { const e = { ...est, pages: Number(v) || null }; setEst(e); botSay('And how soon do you need it?', DL.map(d => ({ id: 'dl:' + d.id, label: `${d.label} · ${d.sub}` })), 420) }
    else if (k === 'dl') { const e = { ...est, deadline: v }; setEst(e); setTyping(true); setTimeout(() => { setTyping(false); add({ type: 'card', kind: 'estimate', data: e }); setSugg([{ id: 'start', label: 'Start my brief', primary: true }, { id: 'human', label: 'Talk to a person' }, { id: 'restart', label: 'Start over' }]) }, 500) }
    else if (k === 'start') startBrief(est)
  }

  // ---- file read + parse --------------------------------------------------
  function onFile(file) {
    if (!file) return
    const name = file.name.toLowerCase()
    const done = txt => parseRubric((txt || '').trim(), file.name)
    setMsgs(m => [...m, { _id: nid(), type: 'user', text: `📎 ${file.name}` }])
    setTyping(true); setSugg([])
    ;(async () => {
      try {
        if (/\.(txt|md|rtf|csv)$/i.test(name) || (file.type && file.type.startsWith('text'))) {
          const r = new FileReader(); r.onload = () => done(String(r.result || '')); r.readAsText(file)
        } else {
          setTyping(false)
          add({ type: 'bot', text: 'Got your file! I’ll read it in full when you start your brief and attach it there. Want to start one now, or get a quick estimate?' })
          setSugg([{ id: 'start', label: 'Start a brief', primary: true }, { id: 'estimate', label: 'Quick estimate' }])
        }
      } catch (e) {
        setTyping(false)
        add({ type: 'bot', text: 'Hmm, I couldn’t read that one automatically. No problem — we’ll grab it on your brief. Want to start one?' })
        setSugg([{ id: 'start', label: 'Start my brief', primary: true }, { id: 'human', label: 'Talk to a person' }])
      }
    })()
  }

  async function parseRubric(text) {
    if (!text) { setTyping(false); add({ type: 'bot', text: 'That file looked empty — try another, or tell me the basics?' }); setSugg(MAIN); return }
    const prompt = `Extract a JSON object (no prose) from this assignment brief with keys: "title" (max 8 words), "discipline" (best guess), "level" one of "ug","ms","adv","dnp","phd", "scope" one of "one","course","term","cap","diss","prog", "pages" integer (≈275 words=1 page; midpoint if range; else null), "citation" one of "APA 7","MLA 9","Chicago","Harvard","Other / not sure", "deadline" "rush" if due ≤2 days, "standard" if ≤9 days, else "relaxed".\n\nBRIEF:\n"""${text.slice(0, 6000)}"""`
    try {
      const res = await callAI(prompt)
      const j = JSON.parse(res.slice(res.indexOf('{'), res.lastIndexOf('}') + 1))
      const level = lvl(j.level) ? j.level : 'ms'
      const scope = scp(j.scope) ? j.scope : 'one'
      const s = scp(scope); const pages = Number.isFinite(j.pages) && j.pages > 0 ? Math.round(j.pages) : (s ? s.def : 8)
      const data = { title: j.title || 'Your assignment', discipline: j.discipline || '—', level, scope, pages, citation: j.citation || 'APA 7', deadline: ['rush', 'standard', 'relaxed'].includes(j.deadline) ? j.deadline : 'standard' }
      setTyping(false)
      add({ type: 'bot', text: 'Done! Here’s what I pulled from your rubric — have a look and tweak anything when you start the brief.' })
      add({ type: 'card', kind: 'brief', data })
      setSugg([{ id: 'start', label: 'Start my brief', primary: true }, { id: 'human', label: 'Something’s off' }])
      setEst(data)
    } catch (e) {
      setTyping(false); add({ type: 'bot', text: 'I read your file but couldn’t auto-structure it. Let’s just start your brief and confirm the details there.' })
      setSugg([{ id: 'start', label: 'Start my brief', primary: true }, { id: 'human', label: 'Talk to a person' }])
    }
  }

  function startBrief(data) {
    const pre = data && data.level ? { levelId: data.level, scopeId: data.scope, pages: data.pages, dlId: data.deadline } : undefined
    setOpen(false)
    if (typeof window !== 'undefined' && window.MeridianOpenBrief) window.MeridianOpenBrief(pre)
    else window.location.href = '/#pricing'
  }

  function submit(e) {
    e.preventDefault()
    const t = input.trim(); if (!t) return
    setInput('')
    if (flow === 'lead') { add({ type: 'user', text: t }); setFlow(null); botSay('Thank you — we’ve noted that and someone will reach out on WhatsApp shortly. Anything else I can help with meanwhile?', MAIN); return }
    add({ type: 'user', text: t }); askAI(t)
  }

  // ---- cards --------------------------------------------------------------
  function Card({ kind, data }) {
    if (kind === 'handoff') return (
      <div className="mc-card">
        <div className="mc-c-top"><div className="mc-c-k">Talk to a person</div><div className="mc-c-title" style={{ padding: '8px 0 0' }}>Imani is online</div><div className="mc-c-meta" style={{ padding: '4px 0 0' }}>Typically replies within the hour</div></div>
        <div className="mc-c-foot">
          <a className="mc-c-btn" href={`https://wa.me/${WA}`} target="_blank" rel="noreferrer">{I.wa()} Message on WhatsApp</a>
          <button className="mc-c-btn ghost" onClick={() => handleChip({ id: 'lead', label: 'Leave my details' })}>Leave my details instead</button>
        </div>
      </div>
    )
    const l = lvl(data.level), s = scp(data.scope), d = DL.find(x => x.id === data.deadline)
    const rate = perPage(data.level, data.scope)
    if (kind === 'estimate') return (
      <div className="mc-card">
        <div className="mc-c-top">
          <div className="mc-c-k">Your estimate</div>
          <div className="mc-c-rate"><span className="from">from</span><span className="amt">${rate}</span><span className="per">/ page</span></div>
        </div>
        <div className="mc-c-meta" style={{ padding: '12px 16px 0' }}>{l && l.name}<span>·</span>{s && s.label}<span>·</span>{d && d.label}</div>
        <div className="mc-c-foot">
          <div className="mc-c-note">That’s the per-page support rate. Your full, fixed quote is confirmed free within 4 hours — start your brief and we’ll scope it to your rubric.</div>
          <button className="mc-c-btn" onClick={() => startBrief(data)}>Start my brief {I.send()}</button>
        </div>
      </div>
    )
    return ( // brief preview
      <div className="mc-card">
        <div className="mc-c-top" style={{ paddingBottom: 0, borderBottom: 0 }}><div className="mc-c-k">{I.spark()} From your rubric</div></div>
        <div className="mc-c-title">{data.title}</div>
        <div className="mc-c-meta">{data.discipline}<span>·</span>{l && l.name}<span>·</span>~{data.pages}pp<span>·</span>{data.citation}<span>·</span>{d && d.label}</div>
        <div className="mc-c-rows"><div className="mc-c-row"><span className="l">Support rate</span><span className="v">from ${rate}/page</span></div></div>
        <div className="mc-c-foot">
          <div className="mc-c-note">Everything check out? Start your brief and we’ll confirm your fixed quote — free — within 4 hours.</div>
          <button className="mc-c-btn" onClick={() => startBrief(data)}>Start my brief {I.send()}</button>
          <button className="mc-c-btn ghost" onClick={() => handleChip({ id: 'human', label: 'Something’s off' })}>Something’s off</button>
        </div>
      </div>
    )
  }

  return (
    <div className="mc-root">
      {!open && nudge && (
        <div className="mc-nudge" onClick={openPanel} role="button">
          <button className="mc-nudge-x" onClick={e => { e.stopPropagation(); setNudge(false); localStorage.setItem('mc_nudge_seen', '1') }} aria-label="Dismiss">{I.x()}</button>
          <div className="mc-nudge-row"><span className="mc-nudge-av" aria-hidden="true">M</span><span><b>Meridian Concierge</b><span className="mc-nudge-on"><i></i>Online now</span></span></div>
          <div className="mc-nudge-tx">Need a hand? I can scope your assignment in about 30 seconds — or just say hi.</div>
        </div>
      )}
      {!open && (
        <button className="mc-launch" onClick={openPanel} aria-label="Open support chat">{I.chat()}<span className="mc-online" aria-hidden="true"></span>{!msgs.length && <span className="mc-badge">1</span>}</button>
      )}
      {open && (
        <div className="mc-panel" role="dialog" aria-label="Meridian Concierge">
          <div className="mc-head">
            <div className="mc-h-row">
              <div className="mc-h-id">
                <span className="mc-mk" aria-hidden="true">M</span>
                <div><div className="mc-nm">Meridian Concierge</div><div className="mc-status"><span className="mc-dot"></span>Online · replies instantly</div></div>
              </div>
              <button className="mc-min" onClick={() => setOpen(false)} aria-label="Minimize">{I.min()}</button>
            </div>
            <div className="mc-tag">Ask anything, get an estimate, or drop your rubric and I’ll scope it.</div>
          </div>

          <div className="mc-body" ref={bodyRef}
            onDragOver={e => { if (flow === 'upload') { e.preventDefault(); setOver(true) } }}
            onDragLeave={() => setOver(false)}
            onDrop={e => { if (flow === 'upload') { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files[0]) } }}>
            {msgs.map(m => {
              if (m.type === 'bot') return <div className="mc-msg bot" key={m._id}><span className="mc-av" aria-hidden="true">M</span><div className="mc-bubble">{m.text}</div></div>
              if (m.type === 'user') return <div className="mc-msg user" key={m._id}><div className="mc-bubble">{m.text}</div></div>
              if (m.type === 'drop') return (
                <div className={'mc-drop' + (over ? ' over' : '')} key={m._id} onClick={() => fileRef.current && fileRef.current.click()}>
                  <span className="mc-d-ic">{I.up()}</span>
                  <div className="mc-d-t">Drop your rubric or click to upload</div>
                  <div className="mc-d-s">PDF · DOCX · TXT — I read it for you</div>
                </div>
              )
              if (m.type === 'card') return <Card key={m._id} kind={m.kind} data={m.data} />
              return null
            })}
            {typing && <div className="mc-msg bot"><span className="mc-av" aria-hidden="true">M</span><div className="mc-bubble"><div className="mc-typing"><span></span><span></span><span></span></div></div></div>}
            {!typing && sugg.length > 0 && (
              <div className={'mc-chips' + (msgs.length && msgs[msgs.length - 1].type === 'user' ? ' bare' : '')}>
                {sugg.map(c => <button key={c.id} className={'mc-chip' + (c.primary ? ' primary' : '')} onClick={() => handleChip(c)}>{c.label}</button>)}
              </div>
            )}
          </div>

          <div className="mc-foot">
            <form className="mc-compose" onSubmit={submit}>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.md,.rtf" hidden onChange={e => onFile(e.target.files[0])} />
              <button type="button" className="mc-attach" aria-label="Attach rubric" onClick={() => { setFlow('upload'); fileRef.current && fileRef.current.click() }}>{I.clip()}</button>
              <textarea rows="1" placeholder="Message the Concierge…" value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) submit(e) }} />
              <button type="submit" className="mc-send" disabled={!input.trim()} aria-label="Send">{I.send()}</button>
            </form>
            <div className="mc-disc">AI assistant · <b>confidential</b> · a human can join anytime</div>
          </div>
        </div>
      )}
    </div>
  )
}
