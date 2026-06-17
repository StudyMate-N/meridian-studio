import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase.js'

export function useBriefs() {
  const [briefs,  setBriefs]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('briefs')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) { setError(err.message); console.error('useBriefs:', err) }
    else setBriefs(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
    // Live updates so a freshly-submitted brief appears immediately (no refresh).
    const channel = supabase
      .channel('briefs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'briefs' }, payload => {
        if (payload.eventType === 'INSERT') {
          setBriefs(prev => prev.some(b => b.id === payload.new.id) ? prev : [payload.new, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setBriefs(prev => prev.map(b => b.id === payload.new.id ? { ...b, ...payload.new } : b))
        } else if (payload.eventType === 'DELETE') {
          setBriefs(prev => prev.filter(b => b.id !== payload.old.id))
        }
      })
      .subscribe()

    // Reliability fallback so a freshly-submitted brief always appears even if the
    // realtime socket drops or an event is missed.
    const poll = setInterval(async () => {
      const { data } = await supabase.from('briefs').select('*').order('created_at', { ascending: false })
      if (data) setBriefs(data)
    }, 15000)

    return () => { supabase.removeChannel(channel); clearInterval(poll) }
  }, [fetch])

  return { briefs, loading, error, refetch: fetch }
}
