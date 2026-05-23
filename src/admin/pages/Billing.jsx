import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'
import { T, F, PAYMENT_CONFIG, fmtDate, fmtMoney } from '../constants.js'
import { PaymentBadge } from '../components/StatusBadge.jsx'
import StatCard from '../components/StatCard.jsx'

export default function Billing({ orders }) {
  const [payments, setPayments] = useState([])
  const [loading,  setLoading]  = useState(true)

  const unpaid     = orders.filter(o => o.payment_status === 'unpaid' && o.status !== 'closed').length
  const deposit    = orders.filter(o => o.payment_status === 'deposit_paid').length
  const paidInFull = orders.filter(o => o.payment_status === 'paid_in_full').length

  useEffect(() => {
    supabase.from('payments')
      .select('*, order:orders(ref, client_name)')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => { setPayments(data || []); setLoading(false) })
  }, [])

  const totalCollected = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0)

  const thStyle = {
    padding: '10px 14px', textAlign: 'left', fontFamily: F.sans,
    fontSize: 11, fontWeight: 700, color: T.inkMid, whiteSpace: 'nowrap',
    borderBottom: `1px solid ${T.border}`, background: T.alt,
  }
  const tdStyle = {
    padding: '11px 14px', fontFamily: F.sans, fontSize: 12, color: T.ink,
    borderBottom: `1px solid ${T.border}`,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        <StatCard
          label="Total Collected"
          value={fmtMoney(totalCollected)}
          sub={`${payments.length} payments recorded`}
        />
        <StatCard
          label="Unpaid Orders"
          value={unpaid}
          sub="No deposit received"
          accent={unpaid > 0}
        />
        <StatCard
          label="Deposit Only"
          value={deposit}
          sub="Balance outstanding"
        />
        <StatCard
          label="Paid in Full"
          value={paidInFull}
          sub="Both deposit + balance"
        />
      </div>

      {/* Payment breakdown by order status */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 14 }}>
          Payment Status Breakdown
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {Object.entries(PAYMENT_CONFIG).map(([key, cfg]) => {
            const count  = orders.filter(o => o.payment_status === key).length
            const pct    = orders.length > 0 ? Math.round((count / orders.length) * 100) : 0
            return (
              <div key={key} style={{ flex: count || 1, minWidth: 60, padding: '0 12px' }}>
                <div style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 700, color: cfg.text, marginBottom: 6 }}>
                  {cfg.label}
                </div>
                <div style={{
                  height: 8, borderRadius: 4,
                  background: cfg.bg, border: `1px solid ${cfg.border}`,
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: `${pct}%`, background: cfg.border, borderRadius: 4,
                  }} />
                </div>
                <div style={{ fontFamily: F.sans, fontSize: 11, color: T.inkLight, marginTop: 4 }}>
                  {count} orders ({pct}%)
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Payments ledger */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, fontFamily: F.sans, fontSize: 13, fontWeight: 700, color: T.ink }}>
          Recent Payments
        </div>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: T.inkLight, fontFamily: F.sans, fontSize: 13 }}>Loading…</div>
        ) : payments.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: T.inkLight, fontFamily: F.sans, fontSize: 13 }}>No payments recorded yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Ref','Client','Type','Amount','Method','Reference','Date'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: F.mono, color: T.accent, fontWeight: 600 }}>
                        {p.order?.ref || '—'}
                      </span>
                    </td>
                    <td style={tdStyle}>{p.order?.client_name || '—'}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                        fontFamily: F.sans, textTransform: 'uppercase',
                        background: p.type === 'deposit' ? '#FFFBEB' : '#ECFDF5',
                        color:      p.type === 'deposit' ? '#92400E' : '#065F46',
                      }}>{p.type}</span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: T.green }}>{fmtMoney(p.amount)}</td>
                    <td style={tdStyle}>{p.method || '—'}</td>
                    <td style={{ ...tdStyle, fontFamily: F.mono, fontSize: 11 }}>{p.reference || '—'}</td>
                    <td style={{ ...tdStyle, color: T.inkLight, whiteSpace: 'nowrap' }}>
                      {fmtDate(p.confirmed_at || p.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
