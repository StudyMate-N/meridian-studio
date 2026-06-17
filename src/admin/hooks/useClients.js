import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase.js'

export function useClients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('profiles')
      .select('id, name, email, phone, school, program, created_at, client_type, unpaid_invoice_count, default_payment_method, disabled_at')
      .eq('role', 'client')
      .order('created_at', { ascending: false })
    if (err) { setError(err.message); console.error('useClients:', err) }
    else setClients(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { clients, loading, error, refetch: fetch }
}
