// A row with a checkbox that saves itself: the grocery list, the pantry and
// the kit. The box changes only once the write has succeeded, and says
// "Saving…" until then, so a slow tap in a store is not tapped again; a
// failed write says why under the row and leaves the box as it was.

import type { ReactNode } from 'react'
import { useWrite } from './useWrite'

export function CheckRow({
  checked,
  onChange,
  label,
  note,
  aside,
  error: asideError,
}: {
  checked: boolean
  onChange: (checked: boolean) => Promise<void>
  label: string
  note?: ReactNode
  /** Sits beside the label, outside it, so a button there does not tick the box. */
  aside?: ReactNode
  /** Why a write from the aside failed, shown under the row like the box's own. */
  error?: string | null
}) {
  const { busy, error, run } = useWrite()
  return (
    <li className={checked ? 'check check-on' : 'check'}>
      <div className="check-line">
        <label className="check-label">
          {/* aria-disabled, not disabled: a disabled box drops focus to the top of the page. useWrite ignores the tap. */}
          <input type="checkbox" checked={checked} aria-disabled={busy} onChange={() => void run(() => onChange(!checked))} />
          <span>
            <span className="row-title">{label}</span>
            {busy ? <span className="row-note">Saving…</span> : note !== undefined && <span className="row-note">{note}</span>}
          </span>
        </label>
        {aside}
      </div>
      {[error, asideError ?? null].map(
        (message) =>
          message !== null && (
            <p key={message} className="notice notice-error" role="alert">
              {message}
            </p>
          ),
      )}
    </li>
  )
}
