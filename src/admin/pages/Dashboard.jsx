import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'
import { T, F } from '../constants.js'
import StatCard from '../components/StatCard.jsx'
import KanbanBoard from '../components/KanbanBoard.jsx'
import OrderDrawer from '../components/OrderDrawer.jsx'

export default function Dashboard({ orders, user, writers, onNavigate }) {
  const [stats,       setStats]       = useState({ active: 0, awaitingBrief: 0, unassigned: 0, unpaid: 0 })
  const [statsLoad,   setStatsLoad]   = useState(true)
  const [activeOrder, setActiveOrder] = useState(null)

  const nonClosed = orders.filter(o => o.status !== 'closed')

  useEffect(() => {
    async function loadStats() {
      setStatsLoad(true)
      const [
        { count: active },
        { count: awaitingBrief },
        { count: unassigned },
        { count: unpaid },
      ] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true })
          .not('status', 'in', '("delivered","closed")'),
        supabase.from('orders').select('*', { count: 'exact', head: true })
          .eq('status', 'new'),
        supabase.from('orders').select('*', { count: 'exact', head: true })
          .is('writer_id', null)
          .not('status', 'in', '("closed","delivered")'),
        supabase.from('orders').select('*', { count: 'exact', head: true })
          .eq('payment_status', 'unpaid')
          .not('status', 'eq', 'closed'),
      ])
      setStats({ active: active||0, awaitingBrief: awaitingBrief||0, unassigned: unassigned||0, unpaid: unpaid||0 })
      setStatsLoad(false)
    }
    loadStats()
  }, [orders.length]) // re-check when orders change

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        <StatCard
          label="Active Orders"
          value={statsLoad ? '…' : stats.active}
          sub="Not delivered or closed"
        />
        <StatCard
          label="Awaiting Brief"
          value={statsLoad ? '…' : stats.awaitingBrief}
          sub="Status: New"
          accent={stats.awaitingBrief > 0}
          onClick={() => onNavigate('orders', { status: 'new' })}
        />
        <StatCard
          label="Unassigned"
          value={statsLoad ? '…' : stats.unassigned}
          sub="No writer assigned"
          accent={stats.unassigned > 0}
          onClick={() => onNavigate('orders')}
        />
        <StatCard
          label="Unpaid Deposits"
          value={statsLoad ? '…' : stats.unpaid}
          sub="Payment status: Unpaid"
          accent={stats.unpaid > 0}
          onClick={() => onNavigate('billing')}
        />
      </div>

      {/* Kanban */}
      <div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 14,
        }}>
          <h2 style={{ fontFamily: F.serif, fontSize: 20, fontWeight: 600, color: T.ink, margin: 0 }}>
            Pipeline
          </h2>
          <span style={{ fontFamily: F.sans, fontSize: 12, color: T.inkLight }}>
            {nonClosed.length} active order{nonClosed.length !== 1 ? 's' : ''}
          </span>
        </div>
        <KanbanBoard
          orders={nonClosed}
          onCardClick={setActiveOrder}
        />
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
