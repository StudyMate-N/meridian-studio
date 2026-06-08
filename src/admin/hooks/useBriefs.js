import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase.js'

// Brief submissions from the homepage intake flow. Each is linked to a client
// account (client_id / email) created at submission time.
export function useBriefs() {
  const [briefs,  setBriefs]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('briefs')
      .select('id, title, discipline, level, scope, pages, citation, deadline, requirements, estimate_usd, wants_call, name, email, whatsapp, notes, status, client_id, created_at')
      .order('created_at', { ascending: false })
    if (err) { setError(err.message); console.error('useBriefs:', err) }
    else setBriefs(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { briefs, loading, error, refetch: fetch }
}
