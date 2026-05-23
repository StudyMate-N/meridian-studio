import { T, F, STATUS_CONFIG, STATUS_ORDER, fmtDate } from '../constants.js'
import { StatusBadge, PaymentBadge, PriorityBadge } from './StatusBadge.jsx'
import { initials } from '../constants.js'

export default function KanbanBoard({ orders, onCardClick }) {
  const columns = STATUS_ORDER.map(status => ({
    status,
    config: STATUS_CONFIG[status],
    cards: orders.filter(o => o.status === status),
  }))

  return (
    <div style={{
      display: 'flex', gap: 12, overflowX: 'auto',
      paddingBottom: 16,
      /* scrollbar styling */
    }}>
      {columns.map(col => (
        <div key={col.status} style={{
          minWidth: 220, maxWidth: 220, flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {/* Column header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 8,
            background: col.config.bg,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: col.config.dot, flexShrink: 0 }} />
            <span style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 700, color: col.config.text, flex: 1 }}>
              {col.config.label}
            </span>
            <span style={{
              fontFamily: F.mono, fontSize: 10, fontWeight: 600, color: col.config.text,
              background: col.config.dot + '22', padding: '1px 6px', borderRadius: 10,
            }}>{col.cards.length}</span>
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {col.cards.length === 0 && (
              <div style={{
                padding: '20px 10px', textAlign: 'center',
                color: T.inkLight, fontFamily: F.sans, fontSize: 11,
                border: `1.5px dashed ${T.border}`, borderRadius: 8,
              }}>Empty</div>
            )}
            {col.cards.map(order => (
              <KanbanCard key={order.id} order={order} onClick={() => onCardClick(order)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function KanbanCard({ order, onClick }) {
  const isOverdue = order.due_date && new Date(order.due_date) < new Date()

  return (
    <div onClick={onClick} style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 10, padding: '12px 12px', cursor: 'pointer',
      transition: 'box-shadow 0.15s, transform 0.1s',
      boxShadow: '0 1px 3px rgba(17,20,24,0.05)',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(17,20,24,0.1)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(17,20,24,0.05)'
        e.currentTarget.style.transform = 'none'
      }}
    >
      {/* Ref + priority */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 600, color: '#B91C1C' }}>
          {order.ref}
        </span>
        <PriorityBadge priority={order.priority} />
      </div>

      {/* Scope */}
      <div style={{ fontFamily: F.sans, fontSize: 12, color: T.ink, fontWeight: 600, marginBottom: 2, lineHeight: 1.3 }}>
        {order.scope_label}
      </div>

      {/* Client */}
      <div style={{ fontFamily: F.sans, fontSize: 11, color: T.inkMid, marginBottom: 8 }}>
        {order.client_name}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Due date */}
        {order.due_date ? (
          <span style={{
            fontFamily: F.sans, fontSize: 10, fontWeight: 600,
            color: isOverdue ? '#991B1B' : T.inkLight,
            background: isOverdue ? '#FEF2F2' : 'none',
            padding: isOverdue ? '1px 5px' : '0', borderRadius: 4,
          }}>
            {isOverdue ? '⚠ ' : ''}{fmtDate(order.due_date)}
          </span>
        ) : <span />}

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {/* Payment dot */}
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: order.payment_status === 'paid_in_full' ? '#34D399'
              : order.payment_status === 'deposit_paid' ? '#FBBF24' : '#F87171',
            flexShrink: 0,
          }} title={order.payment_status} />

          {/* Writer initials */}
          {order.writer?.name && (
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: T.side, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: F.sans, fontSize: 8, fontWeight: 700,
            }}>
              {initials(order.writer.name)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
