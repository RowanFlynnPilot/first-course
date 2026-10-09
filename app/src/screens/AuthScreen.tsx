import { useEffect, useRef, useState, type FormEvent } from 'react'
import { usePageTitle } from '../components/usePageTitle'
import { plainMessage } from '../lib/errors'
import { supabase } from '../supabase'

/**
 * What the screen is for: signing in, creating an account (its own form, so
 * a password manager offers a new password), or asking for a reset link.
 */
type Mode = 'sign-in' | 'create' | 'reset'

const TITLES: Record<Mode, string> = { 'sign-in': 'Sign in', create: 'Create an account', reset: 'Reset your password' }

/**
 * `linkError` is why an email link that brought the cook here failed, if it
 * did. The screen keeps it and tells the app it has been shown, so it does
 * not come back on the next visit.
 */
export function AuthScreen({
  linkError,
  onLinkErrorShown,
  signOutProblem,
}: {
  linkError: string | null
  onLinkErrorShown: () => void
  /** The last sign-out did not reach the server. */
  signOutProblem: string | null
}) {
  const [mode, setMode] = useState<Mode>('sign-in')
  usePageTitle(TITLES[mode])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [fromLink] = useState(linkError)
  const [error, setError] = useState<string | null>(linkError)
  useEffect(() => {
    if (fromLink !== null) onLinkErrorShown()
  }, [fromLink, onLinkErrorShown])
  // Switching between signing in, creating an account and a reset moves focus
  // to the new form's heading, so a screen reader hears which one it is.
  const heading = useRef<HTMLHeadingElement>(null)
  const switched = useRef(false)
  useEffect(() => {
    if (switched.current) heading.current?.focus()
  }, [mode])
  // "Confirm email" is on for the live project: a new account waits for its link.
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  // Signed up, but the confirmation link expired or never came: send another.
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [confirmationResent, setConfirmationResent] = useState(false)

  async function signIn(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setConfirmationResent(false)
    const { error: failure } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    setError(failure ? plainMessage(failure) : null)
    setUnconfirmed(failure?.code === 'email_not_confirmed')
  }

  async function resendConfirmation() {
    setBusy(true)
    const { error: failure } = await supabase.auth.resend({ type: 'signup', email })
    setBusy(false)
    setError(failure ? plainMessage(failure) : null)
    setUnconfirmed(failure !== null)
    setConfirmationResent(failure === null)
  }

  async function createAccount(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    const { data, error: failure } = await supabase.auth.signUp({ email, password })
    setBusy(false)
    setError(failure ? plainMessage(failure) : null)
    if (failure === null && data.session === null) {
      // Confirmation on: the account waits for its link, and then the cook signs in here.
      setConfirmationSent(true)
      setMode('sign-in')
    }
  }

  async function sendReset(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    // The link comes back to the Site URL set on the Supabase project: the deployed app.
    const { error: failure } = await supabase.auth.resetPasswordForEmail(email)
    setBusy(false)
    setError(failure ? plainMessage(failure) : null)
    setResetSent(failure === null)
  }

  function switchTo(next: Mode) {
    switched.current = true
    setMode(next)
    setError(null)
    setConfirmationSent(false)
    setResetSent(false)
    setUnconfirmed(false)
    setConfirmationResent(false)
  }

  const emailField = (
    <label className="field">
      Email
      <input
        type="email"
        autoComplete="username"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
    </label>
  )
  const errorNotice = error !== null && (
    <>
      <p className="notice notice-error" role="alert">
        {error}
      </p>
      {error !== null && error === fromLink && (
        <p className="section-note">
          Email links expire. For a new confirmation link, sign in and ask for one. For a new password link, use
          “Forgot your password?”.
        </p>
      )}
    </>
  )

  return (
    <main className="page auth">
      <h1 className="wordmark">First Course</h1>
      <p className="lede">Learn to cook the things you keep ordering, one skill at a time.</p>
      {signOutProblem !== null && (
        <p className="notice notice-error" role="alert">
          {signOutProblem} Sign in and out again when you have signal.
        </p>
      )}
      <h2 className="section-title" ref={heading} tabIndex={-1}>
        {TITLES[mode]}
      </h2>
      {mode === 'reset' && (
        <form className="form" onSubmit={sendReset}>
          <p>Enter the email you signed up with, and we will send a link to set a new password.</p>
          {emailField}
          {errorNotice}
          {resetSent && (
            <p className="notice notice-info" role="status">
              If there is an account for that email, the link is on its way.
            </p>
          )}
          <button className="button" type="submit" disabled={busy}>
            Send the link
          </button>
          <button className="link-button" type="button" onClick={() => switchTo('sign-in')}>
            Back to sign in
          </button>
        </form>
      )}
      {mode === 'create' && (
        <form className="form" onSubmit={createAccount}>
          {emailField}
          <label className="field">
            Password
            <span className="row-note">At least 8 characters.</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {errorNotice}
          <button className="button" type="submit" disabled={busy || email === '' || password.length < 8}>
            Create account
          </button>
          <button className="link-button" type="button" onClick={() => switchTo('sign-in')}>
            Have an account? Sign in
          </button>
        </form>
      )}
      {mode === 'sign-in' && (
        <form className="form" onSubmit={signIn}>
          {emailField}
          <label className="field">
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {errorNotice}
          {unconfirmed && (
            <button className="button button-quiet" type="button" disabled={busy} onClick={resendConfirmation}>
              Send the confirmation email again
            </button>
          )}
          {confirmationSent && (
            <p className="notice notice-info" role="status">
              Check your email to confirm the account, then sign in.
            </p>
          )}
          {confirmationResent && (
            <p className="notice notice-info" role="status">
              Sent. Open the newest email’s link, then sign in.
            </p>
          )}
          <button className="button" type="submit" disabled={busy}>
            Sign in
          </button>
          {busy && (
            <span className="busy" role="status">
              Signing in…
            </span>
          )}
          <div className="form-links">
            <button className="link-button" type="button" onClick={() => switchTo('create')}>
              New here? Create an account
            </button>
            <button className="link-button" type="button" onClick={() => switchTo('reset')}>
              Forgot your password?
            </button>
          </div>
        </form>
      )}
    </main>
  )
}
