import { useState, type FormEvent } from 'react'
import { supabase } from '../supabase'

export function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // "Confirm email" is on for the live project: a new account waits for its link.
  const [confirmationSent, setConfirmationSent] = useState(false)

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

  return (
    <main className="page auth">
      <h1 className="wordmark">First Course</h1>
      <p className="lede">Learn to cook the things you keep ordering, one skill at a time.</p>
      <form className="form" onSubmit={signIn}>
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
        <label className="field">
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error !== null && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}
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
      </form>
    </main>
  )
}
