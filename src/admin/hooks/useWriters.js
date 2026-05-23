import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase.js'

export function useWriters() {
  const [writers, setWriters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('writers')
      .select('id, name, email, specialty, active, orders:orders(id, status, scope_label, due_date)')
      .order('name')
    if (err) { setError(err.message); console.error('useWriters:', err) }
    else setWriters(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { writers, loading, error, refetch: fetch }
}
