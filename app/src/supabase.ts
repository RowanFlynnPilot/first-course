import { createClient } from '@supabase/supabase-js'

const url: string | undefined = import.meta.env.VITE_SUPABASE_URL
const key: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy app/.env.example to app/.env and fill in both.',
  )
}

// An email link (confirming an account, resetting a password) sends the cook
// back with its result in the hash, where the hash router would take it for a
// page. It is read here and taken out of the address with replaceState, so
// neither the tokens nor an error stay one Back away in the history. The
// client is told not to look at the address itself.
const landing = new URLSearchParams(window.location.hash.slice(1))
const accessToken = landing.get('access_token')
const refreshToken = landing.get('refresh_token')
const failed = landing.has('error') || landing.has('error_code') || landing.has('error_description')
if ((accessToken !== null && refreshToken !== null) || failed) {
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
}

/** Who an access token signs in: its user id and email, read from the token's payload, or null if it is not one. */
function tokenOwner(token: string): { id: string; email: string | null } | null {
  const payload = token.split('.')[1]
  if (payload === undefined) return null
  try {
    // A link is anyone's to write, so a payload that is not a token is a broken link, not a bug.
    const claims: unknown = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    if (typeof claims !== 'object' || claims === null) return null
    const { sub, email } = claims as { sub?: unknown; email?: unknown }
    return typeof sub === 'string' ? { id: sub, email: typeof email === 'string' ? email : null } : null
  } catch {
    return null
  }
}

/**
 * An email link that brought the cook here carrying a session, or null. The
 * app checks whose it is before signing in with it: anyone can send a link
 * carrying their own account's tokens, so a cook already signed in as
 * someone else is asked first.
 */
export const emailLink =
  accessToken !== null && refreshToken !== null
    ? { accessToken, refreshToken, owner: tokenOwner(accessToken), recovery: landing.get('type') === 'recovery' }
    : null

/** The cook arrived from a password reset link, so the app asks for a new password first. */
export const fromPasswordReset = emailLink?.recovery === true

/**
 * Why an email link that brought the cook here failed, in the app's own words,
 * or null. The link's own text is never shown: anyone can write a link.
 */
export const linkError = failed
  ? landing.get('error_code') === 'otp_expired'
    ? 'That email link has expired.'
    : 'That email link did not work.'
  : null

export const supabase = createClient(url, key, { auth: { detectSessionInUrl: false } })

/** Signs in with an email link's tokens. Rejects with why it failed. */
export async function signInFromLink(link: NonNullable<typeof emailLink>): Promise<void> {
  if (link.owner === null) throw new Error('That email link did not work.')
  const { error } = await supabase.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken })
  if (error) throw new Error(`That email link did not sign you in: ${error.message}`)
}
