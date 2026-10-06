// Cook-mode timers, kept in sessionStorage so a reload or a phone that
// discards a backgrounded tab does not lose them. Stored per recipe as the
// moment each timer ends, so nothing has to keep counting while the page is
// away: the time left is always the end time minus now.
//
// Timers are keyed by their label ("Potatoes"), not by step number, so a
// deploy that splits a step mid-cook still finds them.
//
// Every timer started in a cook stays stored until the cook is over, even
// once it is stopped or long finished, so cook mode knows which timers were
// never started and can offer them on a later step.

/**
 * One timer: when it ends, whether its ring is over (the cook tapped the
 * page while it rang, or it rang long enough), and whether the cook stopped
 * it early. A stopped timer is not shown.
 */
export interface Timer {
  readonly endsAt: number
  readonly rang: boolean
  readonly stopped: boolean
}

/** Timers by label. */
export type Timers = Readonly<Record<string, Timer>>

/** A finished timer stays on screen this long, then it is dropped as stale. */
export const STALE_AFTER_MS = 30 * 60 * 1000

// The key names the format: timers were once keyed by step number.
const key = (recipeId: string) => `first-course:timers-by-label:${recipeId}`

/** The timers cook mode shows: not stopped, and not finished for longer than STALE_AFTER_MS. */
export function shownTimers(timers: Timers, now: number): Timers {
  return Object.fromEntries(
    Object.entries(timers).filter(([, timer]) => !timer.stopped && now - timer.endsAt < STALE_AFTER_MS),
  )
}

/** A timer stopped now: over, and hidden, but still counted as started. */
export function stopped(timer: Timer, now: number): Timer {
  return { endsAt: Math.min(timer.endsAt, now), rang: true, stopped: true }
}

/** Timers that have run out and whose ring is not over, by label. */
export function dueTimers(timers: Timers, now: number): string[] {
  return Object.entries(timers)
    .filter(([, timer]) => !timer.rang && timer.endsAt <= now)
    .map(([label]) => label)
}

export function loadTimers(storage: Storage, recipeId: string): Timers {
  const stored = storage.getItem(key(recipeId))
  if (stored === null) return {}
  const parsed: unknown = JSON.parse(stored)
  if (typeof parsed !== 'object' || parsed === null) throw new Error(`Saved timers for ${recipeId} are not an object`)
  return Object.fromEntries(
    Object.entries(parsed).map(([label, timer]: [string, unknown]) => {
      const fields = timer as Partial<Record<keyof Timer, unknown>> | null
      const valid =
        label !== '' &&
        typeof timer === 'object' &&
        fields !== null &&
        typeof fields.endsAt === 'number' &&
        typeof fields.rang === 'boolean' &&
        // Timers saved before October 6, 2026 have no stopped mark: a stopped one was deleted then.
        (fields.stopped === undefined || typeof fields.stopped === 'boolean')
      if (!valid) throw new Error(`Saved timer “${label}” for ${recipeId} is malformed`)
      return [label, { endsAt: fields.endsAt as number, rang: fields.rang as boolean, stopped: fields.stopped === true }]
    }),
  )
}

export function saveTimers(storage: Storage, recipeId: string, timers: Timers) {
  if (Object.keys(timers).length === 0) storage.removeItem(key(recipeId))
  else storage.setItem(key(recipeId), JSON.stringify(timers))
}

/** Leaving cook mode or logging the cook stops every timer for that recipe. */
export function clearTimers(storage: Storage, recipeId: string) {
  storage.removeItem(key(recipeId))
}
