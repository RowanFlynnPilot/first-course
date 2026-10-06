// Cook-mode timers, kept in sessionStorage so a reload or a phone that
// discards a backgrounded tab does not lose them. Stored per recipe as the
// moment each timer ends, so nothing has to keep counting while the page is
// away: the time left is always the end time minus now.
//
// Timers are keyed by their label ("Potatoes"), not by step number, so a
// deploy that splits a step mid-cook still finds them.

/**
 * One timer: when it ends, and whether its ring is over (the cook tapped the
 * page while it rang, or it rang long enough).
 */
export interface Timer {
  readonly endsAt: number
  readonly rang: boolean
}

/** Timers by label. */
export type Timers = Readonly<Record<string, Timer>>

/** A finished timer stays on screen this long, then it is dropped as stale. */
export const STALE_AFTER_MS = 30 * 60 * 1000

// The key names the format: timers were once keyed by step number.
const key = (recipeId: string) => `first-course:timers-by-label:${recipeId}`

/** Timers that have not been finished for longer than STALE_AFTER_MS. */
export function liveTimers(timers: Timers, now: number): Timers {
  return Object.fromEntries(Object.entries(timers).filter(([, timer]) => now - timer.endsAt < STALE_AFTER_MS))
}

/** Timers that have run out and whose ring is not over, by label. */
export function dueTimers(timers: Timers, now: number): string[] {
  return Object.entries(timers)
    .filter(([, timer]) => !timer.rang && timer.endsAt <= now)
    .map(([label]) => label)
}

export function loadTimers(storage: Storage, recipeId: string, now: number): Timers {
  const stored = storage.getItem(key(recipeId))
  if (stored === null) return {}
  const parsed: unknown = JSON.parse(stored)
  if (typeof parsed !== 'object' || parsed === null) throw new Error(`Saved timers for ${recipeId} are not an object`)
  for (const [label, timer] of Object.entries(parsed)) {
    const valid =
      label !== '' &&
      typeof timer === 'object' &&
      timer !== null &&
      typeof (timer as Timer).endsAt === 'number' &&
      typeof (timer as Timer).rang === 'boolean'
    if (!valid) throw new Error(`Saved timer “${label}” for ${recipeId} is malformed`)
  }
  return liveTimers(parsed as Timers, now)
}

export function saveTimers(storage: Storage, recipeId: string, timers: Timers) {
  if (Object.keys(timers).length === 0) storage.removeItem(key(recipeId))
  else storage.setItem(key(recipeId), JSON.stringify(timers))
}

/** Leaving cook mode or logging the cook stops every timer for that recipe. */
export function clearTimers(storage: Storage, recipeId: string) {
  storage.removeItem(key(recipeId))
}
