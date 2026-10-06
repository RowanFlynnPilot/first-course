// Where focus goes when a write takes away the control that made it: "Add"
// leaves Ready to cook, "I have all of these" goes once all of it is ticked.
// Focus left on a control that disappears falls back to the top of the page,
// so a keyboard or switch user loses their place in a long list. The write
// names what will replace the control, and that element takes focus when it
// is drawn.
//
// The target is named only once the write has succeeded (a failed write keeps
// focus on its button), only if the cook is still on the screen that made
// it, and only for a moment: a target that is never drawn, or a write that
// lands after the cook moved on, never pulls focus later.

import { useEffect, useRef } from 'react'

/** How long a named target waits to be drawn. */
const WAIT_MS = 1500

let pending: { target: string; until: number } | null = null

/** Runs a write, then moves focus to the element that uses `target` once it is drawn. */
export async function focusAfter(target: string, write: () => Promise<void>) {
  const screen = window.location.hash
  await write()
  // The write's change renders in a later task, after this, so the target is named in time.
  if (window.location.hash === screen) pending = { target, until: Date.now() + WAIT_MS }
}

/** Moves focus to the element that uses `target` the next time it is drawn: closing a form, say. */
export function focusNext(target: string) {
  pending = { target, until: Date.now() + WAIT_MS }
}

/** Forgets any target: the cook went to another screen. */
export function clearFocusTarget() {
  pending = null
}

/** A ref for the element that takes focus when a write names `target`. Give it tabIndex -1 unless it is a control. */
export function useFocusTarget<T extends HTMLElement>(target: string) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (pending === null || pending.target !== target || ref.current === null) return
    const fresh = Date.now() <= pending.until
    pending = null
    if (fresh) ref.current.focus()
  })
  return ref
}
