// The two Supabase clients the app uses: Auth (accounts and the session)
// and the Data API (the tables and finish_shopping). supabase-js would bring
// Realtime, Storage and Functions too, which the app never calls: a third of
// the download on weak signal.

import { AuthClient } from '@supabase/auth-js'
import { PostgrestClient } from '@supabase/postgrest-js'
import type { Database } from './database.types'

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

/**
 * An email link that brought the cook here carrying a session, or null. The
 * app asks Supabase whose it is (`linkOwner`) before signing in with it:
 * anyone can send a link carrying their own account's tokens, so a cook
 * already signed in as someone else is asked first.
 */
export const emailLink =
  accessToken !== null && refreshToken !== null ? { accessToken, refreshToken, recovery: landing.get('type') === 'recovery' } : null

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

/** How long any request may take before it fails and says so. On weak signal a request can otherwise wait for minutes. */
const REQUEST_TIMEOUT_MS = 15_000

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
}

const base = new URL(url)

/**
 * Accounts and the session. The session is kept under the key supabase-js
 * used, so a cook signed in before the app stopped using it stays signed in.
 * It does not read the address bar: the email link is read above.
 */
export const auth = new AuthClient({
  url: new URL('auth/v1', base).href,
  headers: { Authorization: `Bearer ${key}`, apikey: key },
  storageKey: `sb-${base.hostname.split('.')[0]}-auth-token`,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,
  fetch: fetchWithTimeout,
})

/** Every Data API request carries the key, and the signed-in cook's token, so row-level security knows whose rows. */
async function fetchAsTheCook(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const { data } = await auth.getSession()
  const headers = new Headers(init?.headers)
  if (!headers.has('apikey')) headers.set('apikey', key ?? '')
  if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${data.session?.access_token ?? key}`)
  return fetchWithTimeout(input, { ...init, headers })
}

/** The tables and the database function, typed from the migrations (database.types.ts). */
export const db = new PostgrestClient<Database>(new URL('rest/v1', base).href, { fetch: fetchAsTheCook })

/**
 * Who an email link's token really signs in, as Supabase says: the token is
 * checked on the server, so a link carrying a forged one (anyone can write a
 * token that names any email) fails here. Never read the token's own claims.
 */
export async function linkOwner(link: NonNullable<typeof emailLink>): Promise<{ id: string; email: string | null }> {
  const { data, error } = await auth.getUser(link.accessToken)
  if (error) throw new Error('That email link did not work.')
  return { id: data.user.id, email: data.user.email ?? null }
}

/** Signs in with an email link's tokens, checked by `linkOwner` first. Rejects with why it failed. */
export async function signInFromLink(link: NonNullable<typeof emailLink>): Promise<void> {
  const { error } = await auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken })
  if (error) throw new Error('That email link did not sign you in.')
}
