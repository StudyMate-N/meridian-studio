import { supabase } from './supabase'

// ──────────────────────────────────────────────────────────────────────────────
// Shared account helpers
//
// These power every place a new client can enter the system — the dedicated
// sign-in / sign-up screens, the homepage brief flow, and the catalog order
// modal. Creating a real auth account (rather than an anonymous order) is what
// makes a client show up for admins on the Clients page, because the
// `handle_new_user` trigger inserts a row into `public.profiles` on sign-up.
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Ensure there is an authenticated account for the given identity.
 *
 * - If a session already exists, it is reused.
 * - Otherwise we attempt a sign-up (first name stored as user metadata, which
 *   the DB trigger copies into the profile).
 * - If the email is already registered, we fall back to signing in with the
 *   supplied password.
 *
 * Returns `{ user, session, isNew, needsConfirm, error }`.
 */
export async function ensureAccount({ email, password, name }) {
  email = (email || '').trim().toLowerCase()
  const cleanName = (name || '').trim()

  // 1) Reuse an existing session if we already have one.
  const { data: { session: existing } } = await supabase.auth.getSession()
  if (existing?.user) {
    // Keep the profile name fresh if they just typed one.
    if (cleanName) {
      await supabase.from('profiles').update({ name: cleanName }).eq('id', existing.user.id)
    }
    return { user: existing.user, session: existing, isNew: false, needsConfirm: false, error: null }
  }

  if (!/.+@.+\..+/.test(email)) return { error: 'Enter a valid email address.' }
  if (!password || password.length < 6) return { error: 'Password must be at least 6 characters.' }

  // 2) Try to create the account.
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name: cleanName },
      emailRedirectTo: redirectURL('/workspace'),
    },
  })

  if (!signUpErr) {
    // Email confirmation OFF → a session is returned and they're signed in.
    // Email confirmation ON  → no session; they must confirm first.
    return {
      user: signUpData.user,
      session: signUpData.session,
      isNew: true,
      needsConfirm: !signUpData.session,
      error: null,
    }
  }

  // 3) Sign-up failed. The most common reason is the email already exists —
  //    try to sign them in with the password they just entered.
  const alreadyRegistered = /already|registered|exists/i.test(signUpErr.message || '')
  if (alreadyRegistered) {
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
    if (!signInErr && signInData.session) {
      if (cleanName) {
        await supabase.from('profiles').update({ name: cleanName }).eq('id', signInData.user.id)
      }
      return { user: signInData.user, session: signInData.session, isNew: false, needsConfirm: false, error: null }
    }
    return {
      error: 'An account already exists for this email. Enter your existing password, or use “Forgot your password?” to reset it.',
    }
  }

  return { error: signUpErr.message || 'Could not create your account. Please try again.' }
}

/**
 * Start a Google OAuth sign-in. Redirects away from the page, so persist any
 * in-progress form draft (see savePendingIntake) BEFORE calling this.
 */
export async function signInWithGoogle(redirectPath = '/workspace') {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectURL(redirectPath),
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  })
}

/** Link any guest orders/briefs (matched by email) to the now-authenticated user. */
export async function claimGuestRecords() {
  try { await supabase.rpc('claim_my_orders') } catch (e) { console.warn('claim_my_orders:', e) }
  try { await supabase.rpc('claim_my_briefs') } catch (e) { console.warn('claim_my_briefs:', e) }
}

function redirectURL(path) {
  if (typeof window === 'undefined') return path
  return window.location.origin + path
}

// ── Draft persistence (survives the OAuth redirect round-trip) ─────────────────
const INTAKE_KEY = 'meridian:pending-intake'

export function savePendingIntake(payload) {
  try { localStorage.setItem(INTAKE_KEY, JSON.stringify({ ...payload, ts: Date.now() })) } catch {}
}

export function loadPendingIntake() {
  try {
    const raw = localStorage.getItem(INTAKE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    // Drafts older than 1 hour are stale — ignore them.
    if (!data?.ts || Date.now() - data.ts > 3600_000) { clearPendingIntake(); return null }
    return data
  } catch { return null }
}

export function clearPendingIntake() {
  try { localStorage.removeItem(INTAKE_KEY) } catch {}
}
