import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { T, F } from './constants.js'
import AdminLayout from './AdminLayout.jsx'

export default function AdminApp() {
  const [state, setState] = useState('loading') // loading | signin | denied | ready
  const [user,  setUser]  = useState(null)
  const [email, setEmail] = useState('')
  const [sent,  setSent]  = useState(false)
  const [err,   setErr]   = useState('')

  useEffect(() => {
    // Safety timeout: if checkSession hangs for any reason, fall through to sign-in
    const timeout = setTimeout(() => setState(s => s === 'loading' ? 'signin' : s), 5000)

    checkSession().finally(() => clearTimeout(timeout))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      if (session) checkSession()
      else setState('signin')
    })
    return () => subscription.unsubscribe()
  }, [])

  async function checkSession() {
    try {
      const { data: { session }, error: sessErr } = await supabase.auth.getSession()
      if (sessErr) throw sessErr
      if (!session) { setState('signin'); return }

      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('role, name, email')
        .eq('id', session.user.id)
        .single()

      if (profErr) {
        // Profile not found or RLS blocked — treat as not-admin
        console.warn('Profile fetch error:', profErr.message)
        setState('denied')
        return
      }

      if (profile?.role === 'admin') {
        setUser({ ...session.user, ...profile })
        setState('ready')
      } else {
        setState('denied')
      }
    } catch (e) {
      console.error('checkSession failed:', e)
      setState('signin') // fail open to sign-in form, never stuck loading
    }
  }

  async function sendMagicLink() {
    if (!email.trim()) return
    setErr('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin + '/admin' },
    })
    if (error) setErr(error.message)
    else setSent(true)
  }

  if (state === 'loading') return <LoadingScreen />
  if (state === 'signin')  return <SignInScreen email={email} setEmail={setEmail} onSubmit={sendMagicLink} sent={sent} err={err} />
  if (state === 'denied')  return <DeniedScreen />
  return <AdminLayout user={user} />
}

// ── Loading ───────────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.side }}>
      <div style={{ fontFamily: F.serif, fontSize: 24, color: 'rgba(255,255,255,0.5)' }}>
        Meridian Studio
      </div>
    </div>
  )
}

// ── Sign In ───────────────────────────────────────────────────────────────────
function SignInScreen({ email, setEmail, onSubmit, sent, err }) {
  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: T.side, fontFamily: F.sans,
    }}>
      <div style={{
        background: T.surface, borderRadius: 16, padding: '40px 44px',
        width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: F.serif, fontSize: 26, fontWeight: 600, color: T.ink, marginBottom: 6 }}>
            Admin Access
          </div>
          <div style={{ fontSize: 13, color: T.inkMid }}>
            Meridian Studio · Internal Panel
          </div>
        </div>

        {sent ? (
          <div style={{
            background: T.greenBg, border: `1px solid #A7F3D0`, borderRadius: 10,
            padding: '16px 18px', color: T.green, fontSize: 13, lineHeight: 1.6,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>✓ Check your inbox</div>
            We sent a sign-in link to <strong>{email}</strong>.
            Click it to access the admin dashboard.
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.inkMid, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onSubmit() }}
                placeholder="admin@meridianstudio.com"
                autoFocus
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: `1px solid ${T.border}`, borderRadius: 8,
                  padding: '10px 12px', fontFamily: F.sans, fontSize: 13, color: T.ink,
                  outline: 'none',
                }}
              />
            </div>

            {err && (
              <div style={{ marginBottom: 12, color: T.accent, fontSize: 12 }}>{err}</div>
            )}

            <button onClick={onSubmit} style={{
              width: '100%', padding: '11px 0', borderRadius: 8, border: 'none',
              background: T.side, color: '#fff', fontFamily: F.sans,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              Send Sign-In Link
            </button>

            <div style={{ marginTop: 16, fontSize: 11, color: T.inkLight, textAlign: 'center', lineHeight: 1.5 }}>
              A magic link will be sent to your email.<br />
              Only users with admin role can access this panel.
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Access Denied ─────────────────────────────────────────────────────────────
function DeniedScreen() {
  async function signOut() { await supabase.auth.signOut() }

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: T.side, fontFamily: F.sans,
    }}>
      <div style={{
        background: T.surface, borderRadius: 16, padding: '40px 44px',
        width: 360, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🚫</div>
        <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 600, color: T.ink, marginBottom: 10 }}>
          Access Denied
        </div>
        <div style={{ fontSize: 13, color: T.inkMid, lineHeight: 1.6, marginBottom: 24 }}>
          Your account does not have admin permissions.
          Contact the system administrator to request access.
        </div>
        <button onClick={signOut} style={{
          padding: '9px 24px', borderRadius: 8, border: `1px solid ${T.border}`,
          background: 'none', fontFamily: F.sans, fontSize: 13, fontWeight: 600,
          color: T.inkMid, cursor: 'pointer',
        }}>
          Sign Out
        </button>
      </div>
    </div>
  )
}
