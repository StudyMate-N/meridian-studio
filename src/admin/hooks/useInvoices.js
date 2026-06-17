import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase.js'

export function useInvoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.error('useInvoices:', error)
    else setInvoices(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
    const channel = supabase
      .channel('invoices-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, fetch)
      .subscribe()
    // Reliability fallback (same pattern as orders/briefs)
    const poll = setInterval(fetch, 15000)
    return () => { supabase.removeChannel(channel); clearInterval(poll) }
  }, [fetch])

  return { invoices, loading, refetch: fetch }
}
