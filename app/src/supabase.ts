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

/** The cook arrived from a password reset link, so the app asks for a new password first. */
export const fromPasswordReset = accessToken !== null && landing.get('type') === 'recovery'

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

/** Signing in from the link's tokens, or null when there were none. Rejects with why it failed. */
export const landingSignIn: Promise<void> | null =
  accessToken !== null && refreshToken !== null
    ? supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
        if (error) throw new Error(`That email link did not sign you in: ${error.message}`)
      })
    : null
