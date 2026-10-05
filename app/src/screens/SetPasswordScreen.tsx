// After a password reset link: the link signed the cook in, and this sets the
// password they will sign in with from now on.

import { useState, type FormEvent } from 'react'
import { usePageTitle } from '../components/usePageTitle'
import { useWrite } from '../components/useWrite'
import { supabase } from '../supabase'

export function SetPasswordScreen({ email, onDone }: { email: string | undefined; onDone: () => void }) {
  usePageTitle('Set a new password')
  if (email === undefined) throw new Error('A password reset signed in an account with no email')
  const [password, setPassword] = useState('')
  const [saved, setSaved] = useState(false)
  const { busy, error, run } = useWrite()

  function save(event: FormEvent) {
    event.preventDefault()
    void run(async () => {
      const { error: failure } = await supabase.auth.updateUser({ password })
      if (failure) throw new Error(`Could not set the password: ${failure.message}`)
      setSaved(true)
    })
  }

  return (
    <main className="page auth">
      <h1 className="title">Set a new password</h1>
      <p className="lede">For {email}. You will sign in with it from now on.</p>
      {saved ? (
        <>
          <p className="notice" role="status">
            Saved.
          </p>
          <div className="actions">
            <button className="button" type="button" onClick={onDone}>
              Go to the menu
            </button>
          </div>
        </>
      ) : (
        <form className="form" onSubmit={save}>
          <label className="field">
            New password
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
          {error !== null && (
            <p className="notice notice-error" role="alert">
              {error}
            </p>
          )}
          <button className="button" type="submit" disabled={busy || password.length < 8}>
            Save new password
          </button>
        </form>
      )}
    </main>
  )
}
