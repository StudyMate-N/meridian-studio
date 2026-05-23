// OrderDetail is surfaced via the OrderDrawer component.
// This page is a stub that immediately renders the drawer for deep-linking.
import OrderDrawer from '../components/OrderDrawer.jsx'

export default function OrderDetail({ order, user, writers, onBack }) {
  if (!order) return (
    <div style={{ padding: 40, textAlign: 'center', fontFamily: 'DM Sans, sans-serif', color: '#A8A29E' }}>
      No order selected. Go back to Orders.
    </div>
  )
  return (
    <OrderDrawer
      order={order}
      user={user}
      writers={writers}
      onClose={onBack}
      onUpdated={onBack}
    />
  )
}
