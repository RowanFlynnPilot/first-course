// A row with a checkbox: the grocery list (its checks kept on the phone, so
// the change is at once), the pantry and the kit (saved to Supabase). A box
// that saves changes only once the write has succeeded, with "Saving…" in its
// status until then, so a slow tap is not tapped again; a failed write says
// why under the row and leaves the box as it was.

import type { ReactNode } from 'react'
import { useFocusTarget } from './useFocusTarget'
import { useWrite } from './useWrite'
import { Saving } from './WriteStatus'

export function CheckRow({
  checked,
  onChange,
  label,
  note,
  aside,
  error: asideError,
  focusTarget,
}: {
  checked: boolean
  onChange: (checked: boolean) => Promise<void>
  label: string
  note?: ReactNode
  /** Sits beside the label, outside it, so a button there does not check the box. */
  aside?: ReactNode
  /** Why a write from the aside failed, shown under the row like the box's own. */
  error?: string | null
  /** The name a write uses to put focus on this box (see useFocusTarget). */
  focusTarget: string
}) {
  const { busy, error, run } = useWrite()
  const box = useFocusTarget<HTMLInputElement>(focusTarget)
  return (
    <li className={checked ? 'check check-on' : 'check'}>
      <div className="check-line">
        <label className="check-label">
          {/* aria-disabled, not disabled: a disabled box drops focus to the top of the page. useWrite ignores the tap. */}
          <input
            ref={box}
            type="checkbox"
            checked={checked}
            aria-disabled={busy}
            onChange={() => void run(() => onChange(!checked))}
          />
          <span>
            <span className="row-title">{label}</span>
            {note !== undefined && <span className="row-note">{note}</span>}
          </span>
        </label>
        <Saving busy={busy} />
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
