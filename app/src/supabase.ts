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
// page. Read it here, before the client below takes it apart.
const landing = new URLSearchParams(window.location.hash.slice(1))

/**
 * The cook arrived from a password reset link. The client signs them in from
 * the link and clears the hash; the app then asks for a new password.
 */
export const fromPasswordReset = landing.get('type') === 'recovery'

/**
 * Why an email link failed ("Email link is invalid or has expired"), or null.
 * The client leaves a failed link in the address, so it is cleared here and
 * the sign-in screen says what went wrong.
 */
export const linkError = landing.get('error_description')
if (linkError !== null) window.history.replaceState(null, '', window.location.pathname + window.location.search)

export const supabase = createClient(url, key)
