import { useState, type FormEvent } from 'react'
import { usePageTitle } from '../components/usePageTitle'
import { supabase } from '../supabase'

/** `linkError` is why an email link that brought the cook here failed, if it did. */
export function AuthScreen({ linkError }: { linkError: string | null }) {
  usePageTitle('Sign in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(linkError)
  // "Confirm email" is on for the live project: a new account waits for its link.
  const [confirmationSent, setConfirmationSent] = useState(false)
  // Forgot the password: the same screen asks only for the email and sends a link.
  const [resetting, setResetting] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function signIn(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setConfirmationSent(false)
    const { error: failure } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    setError(failure ? failure.message : null)
  }

  async function createAccount() {
    setBusy(true)
    const { data, error: failure } = await supabase.auth.signUp({ email, password })
    setBusy(false)
    setError(failure ? failure.message : null)
    setConfirmationSent(failure === null && data.session === null)
  }

  async function sendReset(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    // The link comes back to the Site URL set on the Supabase project: the deployed app.
    const { error: failure } = await supabase.auth.resetPasswordForEmail(email)
    setBusy(false)
    setError(failure ? failure.message : null)
    setResetSent(failure === null)
  }

  function switchTo(next: boolean) {
    setResetting(next)
    setError(null)
    setConfirmationSent(false)
    setResetSent(false)
  }

  const emailField = (
    <label className="field">
      Email
      <input
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
    </label>
  )
  const errorNotice = error !== null && (
    <p className="notice notice-error" role="alert">
      {error}
    </p>
  )

  return (
    <main className="page auth">
      <h1 className="wordmark">First Course</h1>
      <p className="lede">Learn to cook the things you keep ordering, one skill at a time.</p>
      {resetting ? (
        <form className="form" onSubmit={sendReset}>
          <p>Enter the email you signed up with, and we will send a link to set a new password.</p>
          {emailField}
          {errorNotice}
          {resetSent && (
            <p className="notice" role="status">
              If there is an account for that email, the link is on its way.
            </p>
          )}
          <button className="button" type="submit" disabled={busy}>
            Send the link
          </button>
          <button className="link-button" type="button" onClick={() => switchTo(false)}>
            Back to sign in
          </button>
        </form>
      ) : (
        <form className="form" onSubmit={signIn}>
          {emailField}
          <label className="field">
            Password
            <span className="row-note">At least 8 characters.</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {errorNotice}
          {confirmationSent && (
            <p className="notice" role="status">
              Check your email to confirm the account, then sign in.
            </p>
          )}
          <button className="button" type="submit" disabled={busy}>
            Sign in
          </button>
          <button
            className="button button-quiet"
            type="button"
            disabled={busy || email === '' || password.length < 8}
            onClick={createAccount}
          >
            Create account
          </button>
          <button className="link-button" type="button" onClick={() => switchTo(true)}>
            Forgot your password?
          </button>
        </form>
      )}
    </main>
  )
}
