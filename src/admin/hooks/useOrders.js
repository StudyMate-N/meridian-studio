import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase.js'

const ORDER_SELECT = `
  id, ref, title, scope_label, level_label, program,
  discipline, pages, citation, requirements,
  client_name, client_phone, client_email,
  due_date, priority, status, payment_status, created_at, updated_at,
  rate_writing, rate_project, estimate_usd, quote_total, quote_deposit,
  notes, access_method, payment_method,
  writer_id, invited_writer_id, invitation_status,
  writer:writers!orders_writer_id_fkey(id, name)
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
      .is('archived_at', null)          // archived orders are preserved but hidden from active views
      .order('created_at', { ascending: false })
    if (err) { setError(err.message); console.error('useOrders:', err) }
    else setOrders(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()

    // Realtime rows arrive without the writer:writers(...) join, so refetch the
    // single row with the join before inserting/merging (keeps the writer column
    // populated instead of going blank).
    const fetchOne = async (id) => {
      const { data } = await supabase.from('orders').select(ORDER_SELECT).eq('id', id).single()
      return data
    }

    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async payload => {
        if (payload.eventType === 'INSERT') {
          const row = await fetchOne(payload.new.id)
          setOrders(prev => prev.some(o => o.id === payload.new.id) ? prev : [row || payload.new, ...prev])
          setToast({ message: `New order received: ${payload.new.ref}`, type: 'success' })
          setTimeout(() => setToast(null), 4000)
        }
        if (payload.eventType === 'UPDATE') {
          if (payload.new.archived_at) { setOrders(prev => prev.filter(o => o.id !== payload.new.id)); return }  // archived → drop from active list
          const row = await fetchOne(payload.new.id)
          setOrders(prev => prev.map(o => o.id === payload.new.id ? (row || { ...o, ...payload.new }) : o))
        }
        if (payload.eventType === 'DELETE') {
          setOrders(prev => prev.filter(o => o.id !== payload.old.id))
        }
      })
      .subscribe()

    // Reliability fallback: realtime sockets can drop or miss an event (and then
    // a freshly-placed order never appears until a manual refresh). A silent poll
    // guarantees new/changed orders show up within a few seconds regardless.
    const poll = setInterval(async () => {
      const { data } = await supabase.from('orders').select(ORDER_SELECT).is('archived_at', null).order('created_at', { ascending: false })
      if (data) setOrders(data)
    }, 15000)

    return () => { supabase.removeChannel(channel); clearInterval(poll) }
  }, [fetch])

  return { orders, loading, error, refetch: fetch, toast, setToast }
}
