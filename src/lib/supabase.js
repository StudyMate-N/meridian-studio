import { createClient } from '@supabase/supabase-js'

// Persistent sessions: the access token auto-refreshes and the session is stored
// in localStorage, so users stay signed in across visits (well beyond 30 days)
// without re-entering their password — until they sign out or the token is
// revoked. detectSessionInUrl + pkce let the "forgot password" recovery link
// establish a temporary session so the user can set a new password.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  }
)
