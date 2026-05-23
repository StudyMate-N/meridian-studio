import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase.js'
import {
  T, F, STATUS_CONFIG, STATUS_ORDER, PAYMENT_CONFIG, FILE_KIND_CONFIG,
  fmtDate, fmtDateTime, fmtBytes, fmtMoney,
} from '../constants.js'
import { StatusBadge, PaymentBadge, PriorityBadge } from './StatusBadge.jsx'

const TABS = ['Details', 'Files', 'Messages', 'Log', 'Payment']

export default function OrderDrawer({ order: initialOrder, user, writers, onClose, onUpdated }) {
  const [order,   setOrder]  = useState(initialOrder)
  const [tab,     setTab]    = useState('Details')
  const [saving,  setSaving] = useState(false)

  // Refresh order data when drawer opens
  useEffect(() => {
    if (!initialOrder?.id) return
    supabase.from('orders')
      .select('*, writer:writers(id,name)')
      .eq('id', initialOrder.id)
      .single()
      .then(({ data }) => { if (data) setOrder(data) })
  }, [initialOrder?.id])

  async function updateOrder(updates, logEvent) {
    setSaving(true)
    const { error } = await supabase.from('orders').update(updates).eq('id', order.id)
    if (!error) {
      setOrder(prev => ({ ...prev, ...updates }))
      if (logEvent) {
        await supabase.from('order_log').insert({
          order_id: order.id, actor_name: user?.name || user?.email || 'Admin', event: logEvent,
        })
      }
      if (onUpdated) onUpdated()
    } else {
      console.error('updateOrder error:', error)
    }
    setSaving(false)
  }

  if (!order) return null

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(17,20,24,0.4)', zIndex: 1000,
      }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 560,
        background: T.surface, zIndex: 1001,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 40px rgba(17,20,24,0.15)',
        overflowY: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: T.side, color: '#fff', padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontFamily: F.mono, fontSize: 16, fontWeight: 600, color: '#F87171' }}>
                  {order.ref}
                </span>
                <StatusBadge status={order.status} />
                <PriorityBadge priority={order.priority} />
              </div>
              <div style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 600, color: '#fff' }}>
                {order.client_name}
              </div>
              <div style={{ fontFamily: F.sans, fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                {order.client_phone} · Created {fmtDate(order.created_at)}
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
              fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1,
            }}>✕</button>
          </div>

          {/* Scope + rate strip */}
          <div style={{
            background: 'rgba(255,255,255,0.06)', borderRadius: 8,
            padding: '10px 14px', fontFamily: F.sans, fontSize: 12,
          }}>
            <div style={{ color: '#fff', fontWeight: 600, marginBottom: 2 }}>
              {order.scope_label} — {order.level_label}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)' }}>
              {order.program}
              {order.rate_writing && ` · Writing: ${fmtMoney(order.rate_writing)}/page`}
              {order.rate_project && ` · Project: ${fmtMoney(order.rate_project)}/page`}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', borderBottom: `1px solid ${T.border}`,
          background: T.surface, flexShrink: 0,
        }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: F.sans, fontSize: 12, fontWeight: 600,
              color: tab === t ? T.accent : T.inkMid,
              borderBottom: tab === t ? `2px solid ${T.accent}` : '2px solid transparent',
              transition: 'color 0.15s',
            }}>{t}</button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'Details'  && <DetailsTab order={order} writers={writers} onSave={updateOrder} saving={saving} />}
          {tab === 'Files'    && <FilesTab   order={order} user={user} />}
          {tab === 'Messages' && <MessagesTab order={order} user={user} />}
          {tab === 'Log'      && <LogTab     order={order} />}
          {tab === 'Payment'  && <PaymentTab order={order} user={user} onPaymentSaved={(newPayStatus) => {
            setOrder(prev => ({ ...prev, payment_status: newPayStatus }))
            if (onUpdated) onUpdated()
          }} />}
        </div>
      </div>
    </>
  )
}

// ── Details Tab ───────────────────────────────────────────────────────────────
function DetailsTab({ order, writers, onSave, saving }) {
  const [form, setForm] = useState({
    status:         order.status,
    payment_status: order.payment_status,
    writer_id:      order.writer_id || '',
    priority:       order.priority || 'normal',
    due_date:       order.due_date || '',
    notes:          order.notes || '',
  })

  function field(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function save() {
    const updates = { ...form, writer_id: form.writer_id || null }
    const changed = []
    if (form.status !== order.status) changed.push(`Status → ${STATUS_CONFIG[form.status]?.label}`)
    if (form.writer_id !== (order.writer_id||'')) {
      const w = writers.find(w => w.id === form.writer_id)
      changed.push(`Writer → ${w?.name || 'Unassigned'}`)
    }
    if (form.priority !== order.priority) changed.push(`Priority → ${form.priority}`)
    if (form.due_date !== (order.due_date||'')) changed.push(`Due date updated`)
    const logEvent = changed.length ? changed.join('; ') : null
    await onSave(updates, logEvent)
  }

  const inp = {
    fontFamily: F.sans, fontSize: 13, color: T.ink,
    border: `1px solid ${T.border}`, borderRadius: 8,
    padding: '8px 10px', background: T.surface, width: '100%', boxSizing: 'border-box',
    outline: 'none',
  }
  const lbl = { fontFamily: F.sans, fontSize: 11, fontWeight: 600, color: T.inkMid, marginBottom: 4, display: 'block' }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Status */}
      <div>
        <label style={lbl}>Order Status</label>
        <select style={inp} value={form.status} onChange={e => field('status', e.target.value)}>
          {Object.entries(STATUS_CONFIG).map(([k,v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Payment status */}
      <div>
        <label style={lbl}>Payment Status</label>
        <select style={inp} value={form.payment_status} onChange={e => field('payment_status', e.target.value)}>
          {Object.entries(PAYMENT_CONFIG).map(([k,v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Writer */}
      <div>
        <label style={lbl}>Assigned Writer</label>
        <select style={inp} value={form.writer_id} onChange={e => field('writer_id', e.target.value)}>
          <option value="">— Unassigned —</option>
          {(writers||[]).filter(w => w.active).map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      {/* Priority */}
      <div>
        <label style={lbl}>Priority</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['normal','high','urgent'].map(p => (
            <button key={p} onClick={() => field('priority', p)} style={{
              flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
              fontFamily: F.sans, fontSize: 12, fontWeight: 600,
              border: `1.5px solid ${form.priority === p ? T.accent : T.border}`,
              background: form.priority === p ? T.accentSoft : T.surface,
              color: form.priority === p ? T.accent : T.inkMid,
              textTransform: 'capitalize',
            }}>{p}</button>
          ))}
        </div>
      </div>

      {/* Due date */}
      <div>
        <label style={lbl}>Due Date</label>
        <input type="date" style={inp} value={form.due_date}
          onChange={e => field('due_date', e.target.value)} />
      </div>

      {/* Notes */}
      <div>
        <label style={lbl}>Internal Notes</label>
        <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }}
          value={form.notes} onChange={e => field('notes', e.target.value)}
          placeholder="Add notes visible to admin only…" />
      </div>

      {/* Client info (read-only) */}
      <div style={{
        background: T.alt, borderRadius: 8, padding: '14px 16px',
        fontFamily: F.sans, fontSize: 12,
      }}>
        <div style={{ fontWeight: 700, color: T.ink, marginBottom: 8 }}>Client Info</div>
        <div style={{ color: T.inkMid, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span>{order.client_name}</span>
          <span>{order.client_phone}</span>
          {order.client_email && <span>{order.client_email}</span>}
          <span style={{ marginTop: 4 }}>{order.access_method === 'portal' ? '🔐 Portal access' : '💻 Device access'}</span>
          {order.payment_method && <span>Payment via: {order.payment_method}</span>}
        </div>
      </div>

      <button onClick={save} disabled={saving} style={{
        background: T.side, color: '#fff', border: 'none', borderRadius: 8,
        padding: '11px 0', fontFamily: F.sans, fontSize: 13, fontWeight: 600,
        cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
      }}>
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  )
}

// ── Files Tab ─────────────────────────────────────────────────────────────────
function FilesTab({ order, user }) {
  const [files,    setFiles]   = useState([])
  const [loading,  setLoading] = useState(true)
  const [uploading,setUploading] = useState(false)
  const [kind,     setKind]    = useState('brief')
  const fileRef = useRef()

  async function loadFiles() {
    const { data } = await supabase.from('order_files')
      .select('*').eq('order_id', order.id).order('created_at', { ascending: false })
    setFiles(data || [])
    setLoading(false)
  }

  useEffect(() => { loadFiles() }, [order.id])

  async function download(file) {
    const { data } = await supabase.storage.from('order-files').createSignedUrl(file.file_path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function upload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const path = `${order.id}/${Date.now()}-${file.name}`
    const { error: upErr } = await supabase.storage.from('order-files').upload(path, file)
    if (!upErr) {
      await supabase.from('order_files').insert({
        order_id: order.id, file_name: file.name,
        file_path: path, kind, size_bytes: file.size,
      })
      await loadFiles()
    } else {
      console.error('Upload error:', upErr)
    }
    setUploading(false)
    e.target.value = ''
  }

  const c = FILE_KIND_CONFIG

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Upload zone */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select value={kind} onChange={e => setKind(e.target.value)} style={{
          border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px',
          fontFamily: F.sans, fontSize: 12, color: T.ink, background: T.surface,
        }}>
          {Object.entries(c).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{
          flex: 1, padding: '9px 12px', borderRadius: 8, cursor: uploading ? 'wait' : 'pointer',
          border: `1.5px dashed ${T.borderMid}`, background: T.alt,
          fontFamily: F.sans, fontSize: 12, fontWeight: 600, color: T.inkMid,
        }}>
          {uploading ? 'Uploading…' : '+ Upload File'}
        </button>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={upload} />
      </div>

      {/* File list */}
      {loading ? (
        <div style={{ color: T.inkLight, fontFamily: F.sans, fontSize: 13, textAlign: 'center', padding: 24 }}>
          Loading files…
        </div>
      ) : files.length === 0 ? (
        <div style={{ color: T.inkLight, fontFamily: F.sans, fontSize: 13, textAlign: 'center', padding: 24 }}>
          No files uploaded yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {files.map(f => {
            const fc = c[f.kind] || c.other
            return (
              <div key={f.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 8,
                border: `1px solid ${T.border}`, background: T.surface,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: T.ink, truncate: true }}>
                    {f.file_name}
                  </div>
                  <div style={{ fontFamily: F.sans, fontSize: 11, color: T.inkLight, marginTop: 2 }}>
                    {fmtBytes(f.size_bytes)} · {fmtDate(f.created_at)}
                  </div>
                </div>
                <span style={{
                  padding: '2px 8px', borderRadius: 20,
                  background: fc.bg, color: fc.text,
                  fontSize: 10, fontWeight: 700, fontFamily: F.sans,
                  textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
                }}>{fc.label}</span>
                <button onClick={() => download(f)} style={{
                  background: T.side, color: '#fff', border: 'none', borderRadius: 6,
                  padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  fontFamily: F.sans, flexShrink: 0,
                }}>↓</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Messages Tab ──────────────────────────────────────────────────────────────
function MessagesTab({ order, user }) {
  const [messages,   setMessages]   = useState([])
  const [body,       setBody]       = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sending,    setSending]    = useState(false)
  const [loading,    setLoading]    = useState(true)
  const bottomRef = useRef()

  useEffect(() => {
    supabase.from('order_messages')
      .select('*').eq('order_id', order.id).order('created_at', { ascending: true })
      .then(({ data }) => { setMessages(data || []); setLoading(false) })

    const channel = supabase
      .channel(`order-messages-${order.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'order_messages',
        filter: `order_id=eq.${order.id}`,
      }, payload => setMessages(prev => [...prev, payload.new]))
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [order.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send() {
    if (!body.trim()) return
    setSending(true)
    await supabase.from('order_messages').insert({
      order_id: order.id, sender_name: user?.name || 'Admin',
      body: body.trim(), is_internal: isInternal,
    })
    setBody('')
    setSending(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 0 }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && <div style={{ color: T.inkLight, fontFamily: F.sans, fontSize: 13, textAlign: 'center' }}>Loading…</div>}
        {!loading && messages.length === 0 && (
          <div style={{ color: T.inkLight, fontFamily: F.sans, fontSize: 13, textAlign: 'center', marginTop: 24 }}>
            No messages yet. Send the first one.
          </div>
        )}
        {messages.map(m => {
          const isAdmin = m.sender_name === 'Admin' || m.sender_name === user?.name
          return (
            <div key={m.id} style={{
              display: 'flex', flexDirection: 'column',
              alignItems: isAdmin ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '80%', padding: '10px 14px', borderRadius: 12,
                background: m.is_internal ? '#FFFBEB' : isAdmin ? T.side : T.alt,
                color: m.is_internal ? '#92400E' : isAdmin ? '#fff' : T.ink,
                fontFamily: F.sans, fontSize: 13, lineHeight: 1.5,
                border: m.is_internal ? '1px solid #FDE68A' : 'none',
              }}>
                {m.is_internal && <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 4, opacity: 0.7 }}>INTERNAL NOTE</div>}
                {m.body}
              </div>
              <div style={{ fontSize: 10, color: T.inkLight, fontFamily: F.sans, marginTop: 3 }}>
                {m.sender_name} · {fmtDateTime(m.created_at)}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div style={{
        borderTop: `1px solid ${T.border}`, padding: '12px 24px',
        display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0,
        background: T.surface,
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} />
          <span style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 600, color: '#92400E' }}>
            Internal note (admin only)
          </span>
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send() }}
            placeholder="Type a message… (Ctrl+Enter to send)"
            rows={2}
            style={{
              flex: 1, border: `1px solid ${T.border}`, borderRadius: 8,
              padding: '8px 10px', fontFamily: F.sans, fontSize: 12, resize: 'none', outline: 'none',
            }}
          />
          <button onClick={send} disabled={sending || !body.trim()} style={{
            background: T.side, color: '#fff', border: 'none', borderRadius: 8,
            padding: '0 16px', cursor: 'pointer', fontFamily: F.sans, fontSize: 12, fontWeight: 600,
            opacity: (sending || !body.trim()) ? 0.5 : 1,
          }}>Send</button>
        </div>
      </div>
    </div>
  )
}

// ── Log Tab ───────────────────────────────────────────────────────────────────
function LogTab({ order }) {
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('order_log')
      .select('*').eq('order_id', order.id).order('created_at', { ascending: false })
      .then(({ data }) => { setLog(data || []); setLoading(false) })
  }, [order.id])

  return (
    <div style={{ padding: 24 }}>
      {loading && <div style={{ color: T.inkLight, fontFamily: F.sans, fontSize: 13 }}>Loading…</div>}
      {!loading && log.length === 0 && (
        <div style={{ color: T.inkLight, fontFamily: F.sans, fontSize: 13, textAlign: 'center' }}>
          No activity recorded yet.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {log.map((entry, i) => (
          <div key={entry.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
            {/* Timeline line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: T.accent,
                marginTop: 5, flexShrink: 0,
              }} />
              {i < log.length - 1 && (
                <div style={{ width: 1, flex: 1, background: T.border, marginTop: 4, marginBottom: 4 }} />
              )}
            </div>
            <div style={{ paddingBottom: i < log.length - 1 ? 16 : 0, paddingTop: 0 }}>
              <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: T.ink, lineHeight: 1.4 }}>
                {entry.event}
              </div>
              <div style={{ fontFamily: F.sans, fontSize: 11, color: T.inkLight, marginTop: 2 }}>
                {entry.actor_name} · {fmtDateTime(entry.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Payment Tab ───────────────────────────────────────────────────────────────
function PaymentTab({ order, user, onPaymentSaved }) {
  const [payments, setPayments] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'deposit', amount: '', method: 'M-Pesa', reference: '' })
  const [saving, setSaving] = useState(false)

  async function loadPayments() {
    const { data } = await supabase.from('payments')
      .select('*').eq('order_id', order.id).order('created_at', { ascending: true })
    setPayments(data || [])
    setLoading(false)
  }

  useEffect(() => { loadPayments() }, [order.id])

  async function recordPayment() {
    if (!form.amount || isNaN(parseFloat(form.amount))) return
    setSaving(true)
    const { data: newPay, error } = await supabase.from('payments').insert({
      order_id:     order.id,
      amount:       parseFloat(form.amount),
      type:         form.type,
      method:       form.method,
      reference:    form.reference || null,
      confirmed_by: user?.id || null,
      confirmed_at: new Date().toISOString(),
    }).select().single()

    if (!error) {
      const all = [...payments, newPay]
      const hasDeposit = all.some(p => p.type === 'deposit')
      const hasBalance = all.some(p => p.type === 'balance')
      const newPayStatus = (hasDeposit && hasBalance) ? 'paid_in_full' : hasDeposit ? 'deposit_paid' : 'unpaid'
      await supabase.from('orders').update({ payment_status: newPayStatus }).eq('id', order.id)
      await supabase.from('order_log').insert({
        order_id: order.id, actor_name: user?.name || 'Admin',
        event: `Payment recorded: ${form.type} ${fmtMoney(form.amount)} via ${form.method}`,
      })
      onPaymentSaved(newPayStatus)
      setPayments(all)
      setShowForm(false)
      setForm({ type: 'deposit', amount: '', method: 'M-Pesa', reference: '' })
    } else {
      console.error('Payment error:', error)
    }
    setSaving(false)
  }

  const inp = {
    fontFamily: F.sans, fontSize: 13, color: T.ink,
    border: `1px solid ${T.border}`, borderRadius: 8,
    padding: '8px 10px', background: T.surface, width: '100%', boxSizing: 'border-box', outline: 'none',
  }
  const lbl = { fontFamily: F.sans, fontSize: 11, fontWeight: 600, color: T.inkMid, marginBottom: 4, display: 'block' }

  const totalRecorded = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0)

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary */}
      <div style={{
        background: T.alt, borderRadius: 8, padding: '14px 16px',
        fontFamily: F.sans, fontSize: 13, display: 'flex', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontWeight: 700, color: T.ink }}>Total Recorded</div>
          <div style={{ color: T.inkMid, marginTop: 2 }}>{payments.length} payment{payments.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ fontWeight: 700, fontSize: 20, color: T.green }}>
          {fmtMoney(totalRecorded)}
        </div>
      </div>

      {/* Payments list */}
      {loading ? (
        <div style={{ color: T.inkLight, fontFamily: F.sans, fontSize: 13, textAlign: 'center' }}>Loading…</div>
      ) : payments.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {payments.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 8,
              border: `1px solid ${T.border}`, background: T.surface,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: T.ink }}>
                  {fmtMoney(p.amount)} — {p.method}
                </div>
                <div style={{ fontFamily: F.sans, fontSize: 11, color: T.inkLight, marginTop: 2 }}>
                  {p.reference && `Ref: ${p.reference} · `}{fmtDate(p.confirmed_at || p.created_at)}
                </div>
              </div>
              <span style={{
                padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                fontFamily: F.sans, textTransform: 'uppercase', letterSpacing: '0.05em',
                background: p.type === 'deposit' ? '#FFFBEB' : '#ECFDF5',
                color: p.type === 'deposit' ? '#92400E' : '#065F46',
              }}>{p.type}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: T.inkLight, fontFamily: F.sans, fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
          No payments recorded yet.
        </div>
      )}

      {/* Record payment form */}
      {showForm ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: T.alt, borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Type</label>
              <select style={inp} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                <option value="deposit">Deposit</option>
                <option value="balance">Balance</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Amount (USD)</label>
              <input type="number" style={inp} value={form.amount} placeholder="0.00"
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Method</label>
              <select style={inp} value={form.method} onChange={e => setForm(p => ({ ...p, method: e.target.value }))}>
                <option>M-Pesa</option>
                <option>Sendwave</option>
                <option>PayPal</option>
                <option>Bank Transfer</option>
                <option>Other</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Reference / Code</label>
              <input type="text" style={inp} value={form.reference} placeholder="TXN123"
                onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(false)} style={{
              flex: 1, padding: '9px 0', borderRadius: 8, border: `1px solid ${T.border}`,
              background: T.surface, fontFamily: F.sans, fontSize: 12, fontWeight: 600,
              color: T.inkMid, cursor: 'pointer',
            }}>Cancel</button>
            <button onClick={recordPayment} disabled={saving} style={{
              flex: 2, padding: '9px 0', borderRadius: 8, border: 'none',
              background: T.green, color: '#fff', fontFamily: F.sans, fontSize: 12, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            }}>{saving ? 'Recording…' : 'Record Payment'}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} style={{
          padding: '10px 0', borderRadius: 8, border: `1.5px dashed ${T.borderMid}`,
          background: 'none', fontFamily: F.sans, fontSize: 13, fontWeight: 600,
          color: T.inkMid, cursor: 'pointer', width: '100%',
        }}>+ Record Payment</button>
      )}
    </div>
  )
}
