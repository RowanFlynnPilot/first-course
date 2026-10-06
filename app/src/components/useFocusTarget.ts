// Where focus goes when a write takes away the control that made it: "Add"
// leaves Ready to cook, "I have all of these" goes once all of it is ticked.
// Focus left on a control that disappears falls back to the top of the page,
// so a keyboard or switch user loses their place in a long list. The write
// names what will replace the control, and that element takes focus when it
// is drawn.

import { useEffect, useRef } from 'react'

let pending: string | null = null

/** Runs a write, then moves focus to the element that uses `target`, once it is on screen. */
export async function focusAfter(target: string, write: () => Promise<void>) {
  pending = target
  try {
    await write()
  } catch (cause) {
    if (pending === target) pending = null
    throw cause
  }
}

/** Moves focus to the element that uses `target` the next time it is drawn: closing a form, say. */
export function focusNext(target: string) {
  pending = target
}

/** A ref for the element that takes focus when a write names `target`. Give it tabIndex -1 unless it is a control. */
export function useFocusTarget<T extends HTMLElement>(target: string) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (pending !== target || ref.current === null) return
    pending = null
    ref.current.focus()
  })
  return ref
}
