// A row with a checkbox that saves itself: the grocery list, the pantry and
// the kit. The box changes only once the write has succeeded; a failed write
// says why under the row and leaves the box as it was.

import type { ReactNode } from 'react'
import { useWrite } from './useWrite'

export function CheckRow({
  checked,
  onChange,
  label,
  note,
  aside,
}: {
  checked: boolean
  onChange: (checked: boolean) => Promise<void>
  label: string
  note?: ReactNode
  /** Sits beside the label, outside it, so a button there does not tick the box. */
  aside?: ReactNode
}) {
  const { busy, error, run } = useWrite()
  return (
    <li className={checked ? 'check check-on' : 'check'}>
      <div className="check-line">
        <label className="check-label">
          <input type="checkbox" checked={checked} disabled={busy} onChange={() => void run(() => onChange(!checked))} />
          <span>
            <span className="row-title">{label}</span>
            {note !== undefined && <span className="row-note">{note}</span>}
          </span>
        </label>
        {aside}
      </div>
      {error !== null && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
    </li>
  )
}
