// What went wrong, in the cook's words. A failed request comes back from the
// browser or Supabase in a developer's words ("TypeError: Load failed",
// "Invalid login credentials"); the screen shows the app's. Anything not
// listed keeps its own message, which still says what failed.

/** No answer at all: no signal, or too slow to answer (the request timeout in supabase.ts). */
const NO_CONNECTION = /failed to fetch|load failed|networkerror|network request failed|timed? ?out|aborterror|timeouterror/i

/** Supabase Auth's error codes the sign-in, sign-up and reset forms can meet. */
const AUTH_CODES: Readonly<Record<string, string>> = {
  invalid_credentials: 'That email and password do not match an account.',
  user_already_exists: 'There is already an account for that email. Sign in, or reset the password.',
  email_exists: 'There is already an account for that email. Sign in, or reset the password.',
  email_not_confirmed: 'Confirm your email first: open the link we sent, then sign in.',
  over_email_send_rate_limit: 'Too many emails for now. Wait an hour, then try again.',
  over_request_rate_limit: 'Too many tries for now. Wait a few minutes, then try again.',
  weak_password: 'Use at least 8 characters.',
  same_password: 'That is your current password. Choose a new one.',
}

export const NO_CONNECTION_MESSAGE = 'No connection. Check your signal and try again.'

export function plainMessage(error: { readonly message: string; readonly code?: string | undefined }): string {
  if (NO_CONNECTION.test(error.message)) return NO_CONNECTION_MESSAGE
  return (error.code === undefined ? undefined : AUTH_CODES[error.code]) ?? error.message
}
