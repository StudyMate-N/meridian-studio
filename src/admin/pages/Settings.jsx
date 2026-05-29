import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'
import { T, F } from '../constants.js'

const LEVELS = [
  { id: 'undergrad',   label: 'Undergraduate' },
  { id: 'graduate',   label: 'Graduate' },
  { id: 'masters_adv',label: 'Masters Advanced' },
  { id: 'dnp',        label: 'DNP' },
  { id: 'phd',        label: 'PhD' },
]

const DEFAULT_RATES = {
  undergrad:   { rW: 12, rP: null },
  graduate:    { rW: 18, rP: null },
  masters_adv: { rW: 20, rP: 25 },
  dnp:         { rW: 25, rP: 30 },
  phd:         { rW: 28, rP: 35 },
}

export default function Settings() {
  const [rates,   setRates]   = useState(DEFAULT_RATES)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  useEffect(() => {
    supabase.from('settings').select('value').eq('key', 'rates').single()
      .then(({ data }) => {
        if (data?.value) setRates({ ...DEFAULT_RATES, ...data.value })
        setLoading(false)
      })
  }, [])

  async function saveRates() {
    setSaving(true)
    const { error } = await supabase.from('settings')
      .upsert({ key: 'rates', value: rates, updated_at: new Date().toISOString() })
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    else console.error('Settings save error:', error)
    setSaving(false)
  }

  const inp = {
    border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px',
    fontFamily: F.sans, fontSize: 13, color: T.ink, background: T.surface,
    width: 90, outline: 'none', textAlign: 'right',
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: T.inkLight, fontFamily: F.sans, fontSize: 13 }}>
      Loading settings…
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 620 }}>
      {/* Rates editor */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontFamily: F.sans, fontSize: 15, fontWeight: 700, color: T.ink }}>Rate Sheet</div>
          <div style={{ fontFamily: F.sans, fontSize: 12, color: T.inkMid, marginTop: 3 }}>
            Per-page writing and project rates by academic level. Changes apply to new orders immediately.
          </div>
        </div>

        <div style={{ padding: '0 24px' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 120px 120px',
            padding: '12px 0', borderBottom: `1px solid ${T.border}`,
            fontFamily: F.sans, fontSize: 11, fontWeight: 700, color: T.inkMid,
          }}>
            <span>Level</span>
            <span style={{ textAlign: 'right' }}>Writing $/page</span>
            <span style={{ textAlign: 'right' }}>Project $/page</span>
          </div>

          {LEVELS.map(level => {
            const r = rates[level.id] || { rW: 0, rP: null }
            return (
              <div key={level.id} style={{
                display: 'grid', gridTemplateColumns: '1fr 120px 120px',
                padding: '14px 0', borderBottom: `1px solid ${T.border}`,
                alignItems: 'center',
              }}>
                <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: T.ink }}>
                  {level.label}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <input
                    type="number" style={inp} value={r.rW ?? ''}
                    onChange={e => setRates(p => ({
                      ...p, [level.id]: { ...p[level.id], rW: e.target.value ? parseFloat(e.target.value) : null }
                    }))}
                    min={0} step={0.5}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <input
                    type="number" style={{ ...inp, opacity: r.rP == null ? 0.4 : 1 }}
                    value={r.rP ?? ''}
                    placeholder="n/a"
                    onChange={e => setRates(p => ({
                      ...p, [level.id]: { ...p[level.id], rP: e.target.value ? parseFloat(e.target.value) : null }
                    }))}
                    min={0} step={0.5}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={saveRates} disabled={saving} style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            background: T.side, color: '#fff', fontFamily: F.sans, fontSize: 13, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Saving…' : 'Save Rates'}
          </button>
          {saved && (
            <span style={{ fontFamily: F.sans, fontSize: 12, color: T.green, fontWeight: 600 }}>
              ✓ Saved successfully
            </span>
          )}
        </div>
      </div>

      {/* System info */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24 }}>
        <div style={{ fontFamily: F.sans, fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 16 }}>
          System Info
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Supabase Project', value: 'nwgwlznqghwgvhgbwtpr', mono: true },
            {
              label: 'WhatsApp Number',
              value: import.meta.env.VITE_WHATSAPP_NUMBER || '(set in Vercel env vars)',
              note: 'Update VITE_WHATSAPP_NUMBER in Vercel dashboard to change',
            },
            {
              label: 'Live URL',
              value: 'https://primemeridian.academy',
              mono: true,
            },
          ].map(row => (
            <div key={row.label} style={{
              display: 'flex', gap: 16, alignItems: 'flex-start',
              padding: '10px 14px', borderRadius: 8, background: T.alt,
            }}>
              <div style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 600, color: T.inkMid, width: 160, flexShrink: 0 }}>
                {row.label}
              </div>
              <div>
                <div style={{
                  fontFamily: row.mono ? F.mono : F.sans,
                  fontSize: 12, color: T.ink,
                }}>{row.value}</div>
                {row.note && (
                  <div style={{ fontFamily: F.sans, fontSize: 11, color: T.inkLight, marginTop: 3 }}>{row.note}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div style={{
        background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10,
        padding: '14px 18px', fontFamily: F.sans, fontSize: 12, color: '#92400E', lineHeight: 1.6,
      }}>
        <strong>Notes:</strong> Rate changes take effect for new orders only. Existing orders lock rates at creation time.
        To add new supported schools or programs, use Claude Code to update the <code>PROGRAMS</code> data in <code>CatalogApp.jsx</code>.
      </div>
    </div>
  )
}
