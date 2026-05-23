import { useState, useMemo } from 'react'
import { T, F, fmtDate, initials } from '../constants.js'
import { StatusBadge } from '../components/StatusBadge.jsx'
import OrderDrawer from '../components/OrderDrawer.jsx'

export default function Clients({ clients, orders, user, writers }) {
  const [search,      setSearch]      = useState('')
  const [selected,    setSelected]    = useState(null) // client
  const [activeOrder, setActiveOrder] = useState(null)

  const filtered = useMemo(() => {
    if (!search) return clients
    const q = search.toLowerCase()
    return clients.filter(c =>
      (c.name||'').toLowerCase().includes(q) ||
      (c.email||'').toLowerCase().includes(q) ||
      (c.school||'').toLowerCase().includes(q)
    )
  }, [clients, search])

  // Client's orders
  const clientOrders = useMemo(() => {
    if (!selected) return []
    return orders.filter(o => o.client_email === selected.email || o.client_id === selected.id)
  }, [selected, orders])

  const activeClientOrders = clientOrders.filter(o => !['closed','delivered'].includes(o.status))

  return (
    <div style={{ display: 'flex', gap: 20, height: '100%' }}>
      {/* Client list */}
      <div style={{ flex: selected ? '0 0 340px' : 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input
          style={{
            border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 12px',
            fontFamily: F.sans, fontSize: 12, color: T.ink, outline: 'none', width: '100%', boxSizing: 'border-box',
          }}
          placeholder="Search clients…"
          value={search} onChange={e => setSearch(e.target.value)}
        />

        {filtered.length === 0 && (
          <div style={{ color: T.inkLight, fontFamily: F.sans, fontSize: 13, textAlign: 'center', padding: 24 }}>
            No clients found.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filtered.map(c => {
            const cOrders = orders.filter(o => o.client_email === c.email || o.client_id === c.id)
            const cActive  = cOrders.filter(o => !['closed','delivered'].includes(o.status))
            const isActive = selected?.id === c.id

            return (
              <div
                key={c.id}
                onClick={() => setSelected(isActive ? null : c)}
                style={{
                  background: T.surface, border: `1.5px solid ${isActive ? T.accent : T.border}`,
                  borderRadius: 12, padding: '16px 18px', cursor: 'pointer',
                  boxShadow: isActive ? `0 0 0 3px ${T.accentSoft}` : 'none',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = T.borderMid }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = T.border }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', background: T.side,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontFamily: F.sans, fontSize: 13, fontWeight: 700, flexShrink: 0,
                  }}>
                    {initials(c.name)}
                  </div>
                  <div>
                    <div style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 700, color: T.ink }}>
                      {c.name || 'Unnamed'}
                    </div>
                    <div style={{ fontFamily: F.sans, fontSize: 11, color: T.inkMid }}>
                      Member since {fmtDate(c.created_at)}
                    </div>
                  </div>
                </div>

                <div style={{ fontFamily: F.sans, fontSize: 12, color: T.inkMid, display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 10 }}>
                  {c.email && <span>{c.email}</span>}
                  {c.phone && <span>{c.phone}</span>}
                  {c.school && <span style={{ color: T.inkLight }}>{c.school}</span>}
                  {c.program && <span style={{ color: T.inkLight, fontSize: 11 }}>{c.program}</span>}
                </div>

                <div style={{ display: 'flex', gap: 14, fontFamily: F.sans, fontSize: 11 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: T.ink, fontSize: 16 }}>{cOrders.length}</div>
                    <div style={{ color: T.inkLight }}>Total orders</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: cActive.length > 0 ? T.accent : T.ink, fontSize: 16 }}>{cActive.length}</div>
                    <div style={{ color: T.inkLight }}>Active</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Client orders panel */}
      {selected && (
        <div style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: F.sans, fontSize: 15, fontWeight: 700, color: T.ink }}>{selected.name}</div>
              <div style={{ fontFamily: F.sans, fontSize: 12, color: T.inkMid }}>
                {clientOrders.length} orders · {activeClientOrders.length} active
              </div>
            </div>
            <button onClick={() => setSelected(null)} style={{
              background: 'none', border: `1px solid ${T.border}`, borderRadius: 8,
              padding: '6px 12px', cursor: 'pointer', fontFamily: F.sans, fontSize: 12, color: T.inkMid,
            }}>✕ Close</button>
          </div>

          {clientOrders.length === 0 && (
            <div style={{ color: T.inkLight, fontFamily: F.sans, fontSize: 13, textAlign: 'center', padding: 24 }}>
              No orders from this client.
            </div>
          )}

          {clientOrders.map(order => (
            <div key={order.id} onClick={() => setActiveOrder(order)} style={{
              padding: '12px 14px', borderRadius: 10, border: `1px solid ${T.border}`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
            }}
              onMouseEnter={e => e.currentTarget.style.background = T.alt}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 600, color: T.accent }}>{order.ref}</span>
              <span style={{ fontFamily: F.sans, fontSize: 12, flex: 1, color: T.ink }}>{order.scope_label}</span>
              <StatusBadge status={order.status} />
            </div>
          ))}
        </div>
      )}

      {activeOrder && (
        <OrderDrawer
          order={activeOrder} user={user} writers={writers}
          onClose={() => setActiveOrder(null)} onUpdated={() => setActiveOrder(null)}
        />
      )}
    </div>
  )
}
