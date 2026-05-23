import { STATUS_CONFIG, PAYMENT_CONFIG, PRIORITY_CONFIG, F } from '../constants.js'

export function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.new
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 20,
      background: c.bg, color: c.text,
      fontSize: 11, fontWeight: 600, fontFamily: F.sans,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  )
}

export function PaymentBadge({ status }) {
  const c = PAYMENT_CONFIG[status] || PAYMENT_CONFIG.unpaid
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px', borderRadius: 20,
      background: c.bg, color: c.text,
      border: `1px solid ${c.border}`,
      fontSize: 11, fontWeight: 600, fontFamily: F.sans,
      whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  )
}

export function PriorityBadge({ priority }) {
  const c = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal
  if (priority === 'normal') return null
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 7px', borderRadius: 20,
      background: c.bg, color: c.text,
      fontSize: 10, fontWeight: 700, fontFamily: F.sans,
      letterSpacing: '0.05em', textTransform: 'uppercase',
    }}>
      {c.label}
    </span>
  )
}
