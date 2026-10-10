// Where focus goes when a write takes away the control that made it: "Add"
// leaves More for this week, "I have all of these" goes once all of it is
// checked off.
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

// The targets on screen now, by name: one already drawn takes focus at once
// (a card that goes takes its buttons, and the heading after it is there).
const drawn = new Map<string, HTMLElement>()

/** Runs a write, then moves focus to the element that uses `target` once it is drawn. */
export async function focusAfter(target: string, write: () => Promise<void>) {
  const screen = window.location.hash
  await write()
  // The write's change renders in a later task, after this, so the target is named in time.
  if (window.location.hash === screen) pending = { target, until: Date.now() + WAIT_MS }
}

/**
 * Moves focus to the element that uses `target`: now, when it is on screen
 * already, or else the next time it is drawn (closing a form, say).
 */
export function focusNext(target: string) {
  const element = drawn.get(target)
  if (element?.isConnected === true) {
    pending = null
    element.focus()
    return
  }
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
    const element = ref.current
    if (element === null) return
    drawn.set(target, element)
    return () => {
      if (drawn.get(target) === element) drawn.delete(target)
    }
  })
  useEffect(() => {
    if (pending === null || pending.target !== target || ref.current === null) return
    const fresh = Date.now() <= pending.until
    pending = null
    if (fresh) ref.current.focus()
  })
  return ref
}
