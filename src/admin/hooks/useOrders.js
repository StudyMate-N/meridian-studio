import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase.js'

const ORDER_SELECT = `
  id, ref, scope_label, level_label, program,
  client_name, client_phone, client_email,
  due_date, priority, status, payment_status, created_at,
  rate_writing, rate_project, notes, access_method, payment_method,
  writer_id,
  writer:writers(id, name)
`

export function useOrders() {
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [toast,   setToast]   = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .order('created_at', { ascending: false })
    if (err) { setError(err.message); console.error('useOrders:', err) }
    else setOrders(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()

    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        if (payload.eventType === 'INSERT') {
          setOrders(prev => [payload.new, ...prev])
          setToast({ message: `New order received: ${payload.new.ref}`, type: 'success' })
          setTimeout(() => setToast(null), 4000)
        }
        if (payload.eventType === 'UPDATE') {
          setOrders(prev => prev.map(o => o.id === payload.new.id
            ? { ...o, ...payload.new }
            : o
          ))
        }
        if (payload.eventType === 'DELETE') {
          setOrders(prev => prev.filter(o => o.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetch])

  return { orders, loading, error, refetch: fetch, toast, setToast }
}
