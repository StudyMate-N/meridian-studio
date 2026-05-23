import { useState, useMemo } from 'react'
import { T, F, STATUS_CONFIG, PAYMENT_CONFIG, fmtDate } from '../constants.js'
import { StatusBadge, PaymentBadge, PriorityBadge } from '../components/StatusBadge.jsx'
import OrderDrawer from '../components/OrderDrawer.jsx'

const inp = {
  border: `1px solid #E8E5E0`, borderRadius: 8, padding: '7px 10px',
  fontFamily: 'DM Sans, system-ui, sans-serif', fontSize: 12, color: '#111418',
  background: '#FFFFFF', outline: 'none',
}

export default function Orders({ orders, user, writers, initialFilter }) {
  const [search,      setSearch]      = useState('')
  const [statusF,     setStatusF]     = useState(initialFilter?.status || '')
  const [payF,        setPayF]        = useState('')
  const [writerF,     setWriterF]     = useState('')
  const [priorityF,   setPriorityF]   = useState('')
  const [activeOrder, setActiveOrder] = useState(null)

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (statusF   && o.status !== statusF) return false
      if (payF      && o.payment_status !== payF) return false
      if (writerF   && o.writer_id !== writerF) return false
      if (priorityF && o.priority !== priorityF) return false
      if (search) {
        const q = search.toLowerCase()
        return (o.ref||'').toLowerCase().includes(q)
          || (o.client_name||'').toLowerCase().includes(q)
          || (o.scope_label||'').toLowerCase().includes(q)
      }
      return true
    })
  }, [orders, statusF, payF, writerF, priorityF, search])

  const activeWriters = (writers||[]).filter(w => w.active)

  const thStyle = {
    padding: '10px 14px', textAlign: 'left', fontFamily: F.sans,
    fontSize: 11, fontWeight: 700, color: T.inkMid, whiteSpace: 'nowrap',
    borderBottom: `1px solid ${T.border}`, background: T.alt,
  }
  const tdStyle = {
    padding: '12px 14px', fontFamily: F.sans, fontSize: 12, color: T.ink,
    borderBottom: `1px solid ${T.border}`,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          style={{ ...inp, minWidth: 200, flex: 1 }}
          placeholder="Search ref, client, scope…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <select style={inp} value={statusF} onChange={e => setStatusF(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select style={inp} value={payF} onChange={e => setPayF(e.target.value)}>
          <option value="">All Payments</option>
          {Object.entries(PAYMENT_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select style={inp} value={writerF} onChange={e => setWriterF(e.target.value)}>
          <option value="">All Writers</option>
          {activeWriters.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select style={inp} value={priorityF} onChange={e => setPriorityF(e.target.value)}>
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
        </select>
        {(statusF||payF||writerF||priorityF||search) && (
          <button onClick={() => { setSearch(''); setStatusF(''); setPayF(''); setWriterF(''); setPriorityF('') }}
            style={{ ...inp, color: T.accent, fontWeight: 600, cursor: 'pointer', border: `1px solid #FECACA` }}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Ref','Client','Scope','Level','Status','Writer','Due','Payment','Created'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: T.inkLight, padding: 32 }}>
                    No orders match your filters.
                  </td>
                </tr>
              )}
              {filtered.map(order => (
                <tr key={order.id}
                  onClick={() => setActiveOrder(order)}
                  style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = T.alt}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: F.mono, fontWeight: 600, color: T.accent }}>{order.ref}</span>
                      <PriorityBadge priority={order.priority} />
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{order.client_name}</div>
                    <div style={{ fontSize: 11, color: T.inkLight, marginTop: 1 }}>{order.client_phone}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {order.scope_label}
                    </div>
                  </td>
                  <td style={tdStyle}>{order.level_label}</td>
                  <td style={tdStyle}><StatusBadge status={order.status} /></td>
                  <td style={tdStyle}>{order.writer?.name || <span style={{ color: T.inkLight }}>—</span>}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmtDate(order.due_date)}</td>
                  <td style={tdStyle}><PaymentBadge status={order.payment_status} /></td>
                  <td style={{ ...tdStyle, color: T.inkLight, whiteSpace: 'nowrap' }}>{fmtDate(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div style={{
            padding: '10px 14px', fontFamily: F.sans, fontSize: 11, color: T.inkLight,
            borderTop: `1px solid ${T.border}`, background: T.alt,
          }}>
            Showing {filtered.length} of {orders.length} orders
          </div>
        )}
      </div>

      {activeOrder && (
        <OrderDrawer
          order={activeOrder}
          user={user}
          writers={writers}
          onClose={() => setActiveOrder(null)}
          onUpdated={() => setActiveOrder(null)}
        />
      )}
    </div>
  )
}
