import { T, F } from '../constants.js'

export default function StatCard({ label, value, sub, accent, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: T.surface,
        border: `1px solid ${accent ? '#FECACA' : T.border}`,
        borderRadius: 12,
        padding: '20px 24px',
        display: 'flex', flexDirection: 'column', gap: 4,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s',
        boxShadow: accent ? '0 0 0 3px #FEE2E2' : 'none',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.boxShadow = '0 4px 16px rgba(17,20,24,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = accent ? '0 0 0 3px #FEE2E2' : 'none' }}
    >
      <div style={{
        fontSize: 32, fontWeight: 700, fontFamily: F.sans,
        color: accent ? T.accent : T.ink, lineHeight: 1,
      }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: accent ? T.accent : T.ink, fontFamily: F.sans }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: T.inkLight, fontFamily: F.sans, marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  )
}
