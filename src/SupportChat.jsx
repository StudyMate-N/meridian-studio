import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase.js'

function initials(name) { if (!name) return '?'; return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() }
function timeStr(d) { return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }

// A human-support thread: the client/expert messages the Meridian team here, and
// the admin Support Console reads + replies (realtime both ways). Find-or-create
// keeps a single open conversation per user.
export default function SupportChat({ user, name, surface = 'client', onClose }) {
  const [convo, setConvo] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    let active = true, channel = null
    // Safety net: whatever happens (query error, RLS, network), the widget must
    // never sit on "Loading…" forever — resolve it within 8s no matter what.
    const guard = setTimeout(() => { if (active) setLoading(false) }, 8000)
    ;(async () => {
      try {
        let { data } = await supabase.from('support_conversations')
          .select('*').eq('user_id', user.id).neq('status', 'closed')
          .order('last_message_at', { ascending: false }).limit(1)
        let c = data && data[0]
        if (!c) {
          const { data: created, error } = await supabase.from('support_conversations')
            .insert({ user_id: user.id, name: name || null, email: user.email, surface, subject: 'Support request', status: 'waiting' })
            .select().single()
          if (error) console.error('support convo create', error)
          c = created
        }
        if (!active) return
        setConvo(c || null)
        if (!c) return
        const { data: m } = await supabase.from('support_messages')
          .select('*').eq('conversation_id', c.id).order('created_at', { ascending: true })
        if (!active) return
        setMsgs(m || [])
        channel = supabase.channel('support-' + c.id)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `conversation_id=eq.${c.id}` },
            p => setMsgs(prev => prev.some(x => x.id === p.new.id) ? prev : [...prev, p.new]))
          .subscribe()
      } catch (e) {
        console.error('support load failed', e)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false; clearTimeout(guard); if (channel) supabase.removeChannel(channel) }
  }, [user.id])

  useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }) }, [msgs, loading])

  async function send(e) {
    e.preventDefault()
    const b = draft.trim(); if (!b || sending || !convo) return
    setSending(true); setDraft('')
    const { data, error } = await supabase.from('support_messages')
      .insert({ conversation_id: convo.id, role: 'user', sender_name: name || 'You', body: b })
      .select().single()
    setSending(false)
    if (error) { setDraft(b); console.error('support send', error); return }
    if (data) setMsgs(prev => prev.some(x => x.id === data.id) ? prev : [...prev, data])
  }

  return (
    <div className="app">
      <div onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
        style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(20,15,10,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
        <div style={{ width: '100%', maxWidth: 460, height: 'min(620px, 86vh)', background: 'var(--paper)', borderRadius: 18, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,.4)' }}>
          {/* Header */}
          <div style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span className="avatar accent" style={{ width: 38, height: 38, fontSize: 15 }}>M</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Message the team</div>
                <div style={{ fontSize: 11.5, opacity: .72, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--good-bright, #8FD3A6)' }}></span>
                  We typically reply within a few hours
                </div>
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'inherit', fontSize: 20, cursor: 'pointer', opacity: .7, lineHeight: 1 }}>✕</button>
          </div>

          {/* Thread */}
          <div className="thread" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <div className="msg sys"><span className="s-pill">Start a conversation — we'll reply here and by email.</span></div>
            {loading ? (
              <div style={{ padding: 22, textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>Loading…</div>
            ) : msgs.map(m => m.role === 'system' ? (
              <div className="msg sys" key={m.id}><span className="s-pill">{m.body}</span></div>
            ) : (
              <div className={'msg ' + (m.role === 'user' ? 'me' : 'them')} key={m.id}>
                <span className={'avatar m-av ' + (m.role === 'user' ? '' : 'accent')} style={{ width: 32, height: 32, fontSize: 12 }}>
                  {m.role === 'user' ? initials(name) : 'M'}
                </span>
                <div className="m-body">
                  <div className="m-meta">
                    <span className="nm">{m.role === 'user' ? 'You' : (m.sender_name || 'Meridian')}</span>
                    <span className="tm">{timeStr(m.created_at)}</span>
                  </div>
                  <div className="m-bubble">{m.body}</div>
                </div>
              </div>
            ))}
            <div ref={endRef}></div>
          </div>

          {/* Composer */}
          <form className="composer" onSubmit={send} style={{ flexShrink: 0 }}>
            <textarea placeholder="Type your message…" value={draft} rows={1}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) send(e) }} />
            <button type="submit" className="btn btn-accent" disabled={!draft.trim() || sending} aria-label="Send">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
