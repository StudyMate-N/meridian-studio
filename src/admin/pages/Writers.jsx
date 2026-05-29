import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'
import { T, F, initials } from '../constants.js'
import { StatusBadge } from '../components/StatusBadge.jsx'

export default function Writers({ writers, refetch }) {
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState({ name: '', email: '', specialty: '' })
  const [saving,   setSaving]   = useState(false)
  const [toggling, setToggling] = useState(null)

  // Writer applications state
  const [applications,    setApplications]    = useState([])
  const [appsLoading,     setAppsLoading]     = useState(true)
  const [updatingApp,     setUpdatingApp]     = useState(null)

  useEffect(() => {
    fetchApplications()
  }, [])

  async function fetchApplications() {
    setAppsLoading(true)
    const { data, error } = await supabase
      .from('writer_applications')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setApplications(data || [])
    else console.error('Fetch applications error:', error)
    setAppsLoading(false)
  }

  async function updateAppStatus(id, status) {
    setUpdatingApp(id)
    const { error } = await supabase
      .from('writer_applications')
      .update({ status })
      .eq('id', id)
    if (!error) setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a))
    else console.error('Update application status error:', error)
    setUpdatingApp(null)
  }

  async function addWriter() {
    if (!form.name.trim() || !form.email.trim()) return
    setSaving(true)
    const email = form.email.trim().toLowerCase()
    const { data: created, error } = await supabase.from('writers').insert({
      name: form.name.trim(), email,
      specialty: form.specialty.trim() || null, active: true,
    }).select().single()
    if (!error) {
      // If this expert has already signed in, link their profile now so they
      // get the writer role and /expert works immediately. New sign-ins are
      // linked automatically by the on_profile_link_writer trigger.
      const { data: prof } = await supabase.from('profiles').select('id').ilike('email', email).maybeSingle()
      if (prof && created) {
        await supabase.from('writers').update({ profile_id: prof.id }).eq('id', created.id)
        await supabase.from('profiles').update({ role: 'writer' }).eq('id', prof.id)
      }
      setForm({ name:'', email:'', specialty:'' }); setShowForm(false); refetch()
    }
    else console.error('Add writer error:', error)
    setSaving(false)
  }

  async function toggleActive(writer) {
    setToggling(writer.id)
    await supabase.from('writers').update({ active: !writer.active }).eq('id', writer.id)
    await refetch()
    setToggling(null)
  }

  const inp = {
    border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px',
    fontFamily: F.sans, fontSize: 13, color: T.ink, background: T.surface,
    width: '100%', boxSizing: 'border-box', outline: 'none',
  }

  const active   = writers.filter(w => w.active)
  const inactive = writers.filter(w => !w.active)

  const APP_STATUS_OPTIONS = ['pending', 'contacted', 'rejected', 'onboarded']
  const APP_STATUS_COLORS = {
    pending:   { bg: '#fff8e6', color: '#b45309' },
    contacted: { bg: '#e8f4fd', color: '#1d4ed8' },
    rejected:  { bg: '#fef2f2', color: '#b91c1c' },
    onboarded: { bg: '#f0fdf4', color: '#15803d' },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ── Writer Applications ─────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: F.sans, fontSize: 15, fontWeight: 700, color: T.ink }}>
              Writer Applications
            </div>
            <div style={{ fontFamily: F.sans, fontSize: 12, color: T.inkMid, marginTop: 2 }}>
              Expressions of interest from the homepage
            </div>
          </div>
          <button
            onClick={fetchApplications}
            style={{
              padding: '6px 14px', borderRadius: 8, border: `1px solid ${T.border}`,
              background: T.surface, fontFamily: F.sans, fontSize: 12, fontWeight: 600,
              color: T.inkMid, cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>

        {appsLoading ? (
          <div style={{ fontFamily: F.sans, fontSize: 13, color: T.inkMid, padding: 16 }}>Loading applications…</div>
        ) : applications.length === 0 ? (
          <div style={{
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12,
            padding: '28px 20px', textAlign: 'center',
            fontFamily: F.sans, fontSize: 13, color: T.inkMid,
          }}>
            No applications yet
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: F.sans, fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                  {['Name', 'WhatsApp', 'Degree', 'Specialty', 'Date', 'Status'].map(h => (
                    <th key={h} style={{
                      padding: '8px 12px', textAlign: 'left',
                      fontWeight: 700, fontSize: 11, color: T.inkMid,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {applications.map(app => {
                  const sc = APP_STATUS_COLORS[app.status] || APP_STATUS_COLORS.pending
                  return (
                    <tr key={app.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: T.ink }}>{app.name}</td>
                      <td style={{ padding: '10px 12px', color: T.inkMid }}>{app.phone}</td>
                      <td style={{ padding: '10px 12px', color: T.inkMid }}>{app.degree}</td>
                      <td style={{ padding: '10px 12px', color: T.inkLight }}>{app.specialty || '—'}</td>
                      <td style={{ padding: '10px 12px', color: T.inkLight, whiteSpace: 'nowrap' }}>
                        {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <select
                          value={app.status}
                          disabled={updatingApp === app.id}
                          onChange={e => updateAppStatus(app.id, e.target.value)}
                          style={{
                            padding: '4px 8px', borderRadius: 6, border: 'none',
                            fontFamily: F.sans, fontSize: 11, fontWeight: 700,
                            background: sc.bg, color: sc.color,
                            cursor: updatingApp === app.id ? 'not-allowed' : 'pointer',
                            outline: 'none',
                          }}
                        >
                          {APP_STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Writer ──────────────────────────────────────────── */}
      <div>
        <div style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 700, color: T.inkMid, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
          Team Roster
        </div>
        {showForm ? (
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 700, color: T.ink }}>Add New Writer</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input style={inp} placeholder="Full name *" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              <input style={inp} placeholder="Email *" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <input style={inp} placeholder="Specialty (e.g. DNP, PhD research)" value={form.specialty}
              onChange={e => setForm(p => ({ ...p, specialty: e.target.value }))} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowForm(false)} style={{
                flex: 1, padding: '9px 0', borderRadius: 8, border: `1px solid ${T.border}`,
                background: T.surface, fontFamily: F.sans, fontSize: 12, fontWeight: 600, color: T.inkMid, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={addWriter} disabled={saving} style={{
                flex: 2, padding: '9px 0', borderRadius: 8, border: 'none',
                background: T.side, color: '#fff', fontFamily: F.sans, fontSize: 12, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
              }}>{saving ? 'Adding…' : 'Add Writer'}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)} style={{
            padding: '9px 20px', borderRadius: 8, border: `1.5px dashed ${T.borderMid}`,
            background: 'none', fontFamily: F.sans, fontSize: 13, fontWeight: 600,
            color: T.inkMid, cursor: 'pointer',
          }}>+ Add Writer</button>
        )}
      </div>

      {/* ── Active writers ──────────────────────────────────────── */}
      <WriterSection
        title={`Active Writers (${active.length})`}
        writers={active}
        toggling={toggling}
        onToggle={toggleActive}
      />

      {/* ── Inactive writers ────────────────────────────────────── */}
      {inactive.length > 0 && (
        <WriterSection
          title={`Inactive Writers (${inactive.length})`}
          writers={inactive}
          toggling={toggling}
          onToggle={toggleActive}
          dimmed
        />
      )}
    </div>
  )
}

function WriterSection({ title, writers, toggling, onToggle, dimmed }) {
  return (
    <div>
      <div style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 700, color: T.inkMid, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
        {title}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {writers.map(writer => {
          const wOrders = writer.orders || []
          const activeOrds    = wOrders.filter(o => !['closed','delivered'].includes(o.status))
          const completedOrds = wOrders.filter(o => ['closed','delivered'].includes(o.status))

          return (
            <div key={writer.id} style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 12, padding: '18px 18px',
              opacity: dimmed ? 0.6 : 1,
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: dimmed ? T.borderMid : T.side,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontFamily: F.sans, fontSize: 14, fontWeight: 700,
                }}>
                  {initials(writer.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 700, color: T.ink }}>{writer.name}</div>
                  <div style={{ fontFamily: F.sans, fontSize: 11, color: T.inkMid }}>{writer.email}</div>
                  {writer.specialty && (
                    <div style={{ fontFamily: F.sans, fontSize: 11, color: T.inkLight, marginTop: 2 }}>{writer.specialty}</div>
                  )}
                </div>
                <button
                  onClick={() => onToggle(writer)}
                  disabled={toggling === writer.id}
                  style={{
                    padding: '4px 10px', borderRadius: 6, cursor: 'pointer', flexShrink: 0,
                    fontFamily: F.sans, fontSize: 10, fontWeight: 700,
                    border: `1px solid ${writer.active ? T.border : T.accent}`,
                    background: writer.active ? T.surface : T.accentSoft,
                    color: writer.active ? T.inkMid : T.accent,
                    opacity: toggling === writer.id ? 0.5 : 1,
                  }}
                >
                  {toggling === writer.id ? '…' : writer.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 20, fontFamily: F.sans, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.accent }}>{activeOrds.length}</div>
                  <div style={{ fontSize: 10, color: T.inkLight }}>Active</div>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.green }}>{completedOrds.length}</div>
                  <div style={{ fontSize: 10, color: T.inkLight }}>Completed</div>
                </div>
              </div>

              {/* Current assignments */}
              {activeOrds.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {activeOrds.slice(0, 3).map(o => (
                    <div key={o.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '5px 8px', borderRadius: 6, background: T.alt,
                      fontFamily: F.sans, fontSize: 11,
                    }}>
                      <span style={{ flex: 1, color: T.inkMid, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.scope_label}
                      </span>
                      <StatusBadge status={o.status} />
                    </div>
                  ))}
                  {activeOrds.length > 3 && (
                    <div style={{ fontSize: 10, color: T.inkLight, fontFamily: F.sans, paddingLeft: 8 }}>
                      +{activeOrds.length - 3} more
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
