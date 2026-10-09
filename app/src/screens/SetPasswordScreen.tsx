// After a password reset link: the link signed the cook in, and this sets the
// password they will sign in with from now on.

import { useState, type FormEvent } from 'react'
import { focusAfter, useFocusTarget } from '../components/useFocusTarget'
import { usePageTitle } from '../components/usePageTitle'
import { useWrite } from '../components/useWrite'
import { ErrorNotice, Saving } from '../components/WriteStatus'
import { plainMessage } from '../lib/errors'
import { supabase } from '../supabase'

export function SetPasswordScreen({ email, onDone }: { email: string | undefined; onDone: () => void }) {
  usePageTitle('Set a new password')
  if (email === undefined) throw new Error('A password reset signed in an account with no email')
  const [password, setPassword] = useState('')
  const [saved, setSaved] = useState(false)
  const { busy, error, run } = useWrite()
  // The form goes once the password is saved, so focus goes to the way on.
  const goOn = useFocusTarget<HTMLButtonElement>('password-saved')

  function save(event: FormEvent) {
    event.preventDefault()
    void run(() =>
      focusAfter('password-saved', async () => {
        const { error: failure } = await supabase.auth.updateUser({ password })
        if (failure) throw new Error(`Could not set the password: ${plainMessage(failure)}`)
        setSaved(true)
      }),
    )
  }

  return (
    <main className="page auth">
      <h1 className="title">Set a new password</h1>
      <p className="lede">For {email}. You will sign in with it from now on.</p>
      {/* Always there, so a screen reader hears "Saved." arrive. */}
      <div role="status">{saved && <p className="notice notice-info">Saved.</p>}</div>
      {saved ? (
        <div className="actions">
          <button className="button" type="button" ref={goOn} onClick={onDone}>
            Go to the menu
          </button>
        </div>
      ) : (
        <form className="form" onSubmit={save}>
          <label className="field">
            New password
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              aria-describedby={error === null ? 'password-hint' : 'password-hint password-error'}
              aria-invalid={error !== null}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {/* Outside the label, so it is read as a hint and not as part of the field's name. */}
          <p className="row-note field-hint" id="password-hint">
            At least 8 characters.
          </p>
          <ErrorNotice error={error} id="password-error" />
          <div className="actions">
            <button className="button" type="submit" aria-disabled={busy}>
              Save new password
            </button>
            <Saving busy={busy} />
          </div>
        </form>
      )}
    </main>
  )
}
