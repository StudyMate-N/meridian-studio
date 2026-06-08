import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { T, F, initials } from './constants.js'
import { useOrders }  from './hooks/useOrders.js'
import { useClients } from './hooks/useClients.js'
import { useWriters } from './hooks/useWriters.js'
import { useBriefs }  from './hooks/useBriefs.js'

import Dashboard  from './pages/Dashboard.jsx'
import Orders     from './pages/Orders.jsx'
import Clients    from './pages/Clients.jsx'
import Writers    from './pages/Writers.jsx'
import Billing    from './pages/Billing.jsx'
import Settings   from './pages/Settings.jsx'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'orders',    label: 'Orders',    icon: '≡'  },
  { id: 'clients',   label: 'Clients',   icon: '◎'  },
  { id: 'writers',   label: 'Writers',   icon: '◈'  },
  { id: 'billing',   label: 'Billing',   icon: '◇'  },
  { id: 'settings',  label: 'Settings',  icon: '⚙'  },
]

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  orders:    'Orders',
  clients:   'Clients',
  writers:   'Writers',
  billing:   'Billing',
  settings:  'Settings',
}

export default function AdminLayout({ user }) {
  const [page,       setPage]       = useState('dashboard')
  const [pageState,  setPageState]  = useState(null)

  const { orders,  loading: ordersLoading,  toast, setToast, refetch: refetchOrders } = useOrders()
  const { clients, loading: clientsLoading, refetch: refetchClients } = useClients()
  const { writers, loading: writersLoading, refetch: refetchWriters } = useWriters()
  const { briefs,  refetch: refetchBriefs } = useBriefs()

  function navigate(p, state = null) {
    setPage(p)
    setPageState(state)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const sideItemStyle = (id) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 16px', borderRadius: 8, cursor: 'pointer',
    fontFamily: F.sans, fontSize: 13, fontWeight: 600,
    color:   page === id ? '#fff' : T.sideText,
    background: page === id ? 'rgba(255,255,255,0.1)' : 'transparent',
    border: 'none', width: '100%', textAlign: 'left',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ display: 'flex', height: '100vh', background: T.bg, fontFamily: F.sans, overflow: 'hidden' }}>
      {/* Sidebar */}
      <nav style={{
        width: 220, background: T.side, display: 'flex', flexDirection: 'column',
        flexShrink: 0, borderRight: `1px solid ${T.sideBorder}`,
      }}>
        {/* Logo */}
        <div style={{
          padding: '24px 20px 20px',
          borderBottom: `1px solid ${T.sideBorder}`,
        }}>
          <div style={{ fontFamily: F.serif, fontSize: 18, color: '#fff', fontWeight: 600, letterSpacing: '0.01em' }}>
            Meridian Studio
          </div>
          <div style={{ fontFamily: F.sans, fontSize: 10, color: T.sideText, marginTop: 2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Admin Panel
          </div>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              style={sideItemStyle(item.id)}
              onMouseEnter={e => { if (page !== item.id) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { if (page !== item.id) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 14, opacity: 0.8, width: 18, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
              {/* Badge for orders */}
              {item.id === 'orders' && orders.filter(o => o.status === 'new').length > 0 && (
                <span style={{
                  marginLeft: 'auto', background: '#F87171', color: '#fff',
                  fontSize: 10, fontWeight: 700, borderRadius: 10,
                  padding: '1px 6px', lineHeight: 1.5,
                }}>{orders.filter(o => o.status === 'new').length}</span>
              )}
            </button>
          ))}
        </div>

        {/* User footer */}
        <div style={{ padding: '16px 16px', borderTop: `1px solid ${T.sideBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: '#374151',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>
              {initials(user?.name || user?.email)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name || 'Admin'}
              </div>
              <div style={{ color: T.sideText, fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
            </div>
          </div>
          <button onClick={signOut} style={{
            width: '100%', padding: '7px 0', borderRadius: 8,
            border: `1px solid ${T.sideBorder}`, background: 'transparent',
            color: T.sideText, fontFamily: F.sans, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px', height: 56, borderBottom: `1px solid ${T.border}`,
          background: T.surface, flexShrink: 0,
        }}>
          <div>
            <span style={{ fontFamily: F.sans, fontSize: 11, color: T.inkLight }}>Meridian Studio / </span>
            <span style={{ fontFamily: F.sans, fontSize: 11, color: T.ink, fontWeight: 600 }}>
              {PAGE_TITLES[page]}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Order count badge */}
            {!ordersLoading && (
              <span style={{
                fontFamily: F.sans, fontSize: 11, color: T.inkMid,
                background: T.alt, padding: '3px 10px', borderRadius: 20,
                border: `1px solid ${T.border}`,
              }}>
                {orders.length} orders
              </span>
            )}
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          {/* Page title */}
          <h1 style={{ fontFamily: F.serif, fontSize: 28, fontWeight: 600, color: T.ink, margin: '0 0 24px 0' }}>
            {PAGE_TITLES[page]}
          </h1>

          {page === 'dashboard' && (
            <Dashboard
              orders={orders}
              user={user}
              writers={writers}
              onNavigate={navigate}
            />
          )}
          {page === 'orders' && (
            <Orders
              orders={orders}
              user={user}
              writers={writers}
              initialFilter={pageState}
            />
          )}
          {page === 'clients' && (
            <Clients
              clients={clients}
              orders={orders}
              briefs={briefs}
              user={user}
              writers={writers}
            />
          )}
          {page === 'writers' && (
            <Writers
              writers={writers}
              refetch={refetchWriters}
            />
          )}
          {page === 'billing' && (
            <Billing orders={orders} />
          )}
          {page === 'settings' && (
            <Settings />
          )}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: T.greenBg, border: `1px solid ${T.greenBord}`, color: T.green,
          padding: '12px 16px', borderRadius: 10, fontSize: 13,
          fontFamily: F.sans, fontWeight: 500,
          boxShadow: '0 4px 20px rgba(17,20,24,0.12)',
          maxWidth: 320, lineHeight: 1.5,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span>🔔</span>
          {toast.message}
          <button onClick={() => setToast(null)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: T.green, fontSize: 14, padding: 0, marginLeft: 4,
          }}>✕</button>
        </div>
      )}
    </div>
  )
}
