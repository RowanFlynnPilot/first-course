// Cook-mode timers, kept in localStorage so a reload, a phone that discards
// a backgrounded tab, or an installed app the phone closed does not lose
// them (session storage goes with the closed app). Stored per account and
// recipe as the moment each timer ends, so nothing has to keep counting while
// the page is away: the time left is always the end time minus now. Per
// account, like the rest of what the phone keeps: on a shared phone, one
// cook's timers never ring for another.
//
// Timers are keyed by their label ("Potatoes"), not by step number, so a
// deploy that splits a step mid-cook still finds them.
//
// Every timer started in a cook stays stored until the cook is over, even
// once it is stopped or long finished, so cook mode knows which timers were
// never started and can offer them on a later step.

import { RESUME_FOR_MS } from './cooking'

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

// The key names the format: timers were once keyed by step number, then by
// recipe alone (OLD_PREFIX), before they were kept per account.
const PREFIX = 'first-course:timers:'
const OLD_PREFIX = 'first-course:timers-by-label:'
const key = (owner: string, recipeId: string) => `${PREFIX}${owner}:${recipeId}`

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

export function loadTimers(storage: Storage, owner: string, recipeId: string): Timers {
  const stored = storage.getItem(key(owner, recipeId))
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
        typeof fields.stopped === 'boolean'
      if (!valid) throw new Error(`Saved timer “${label}” for ${recipeId} is malformed`)
      return [label, { endsAt: fields.endsAt as number, rang: fields.rang as boolean, stopped: fields.stopped as boolean }]
    }),
  )
}

export function saveTimers(storage: Storage, owner: string, recipeId: string, timers: Timers) {
  if (Object.keys(timers).length === 0) storage.removeItem(key(owner, recipeId))
  else storage.setItem(key(owner, recipeId), JSON.stringify(timers))
}

/** Leaving cook mode or logging the cook stops every timer for that recipe. */
export function clearTimers(storage: Storage, owner: string, recipeId: string) {
  storage.removeItem(key(owner, recipeId))
}

/**
 * Forgets an account's timers of cooks left without leaving cook mode or
 * logging: a recipe whose every timer ended longer ago than a cook in
 * progress is kept (RESUME_FOR_MS). Run on every load, so storage does not
 * fill with them. Only the signed-in account's are read: another account's
 * wait for that account, and cannot stop this one loading. Timers kept
 * before they were per account go too.
 */
export function forgetOldTimers(storage: Storage, owner: string, now: number) {
  const mine = `${PREFIX}${owner}:`
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
    (stored): stored is string => stored !== null && (stored.startsWith(mine) || stored.startsWith(OLD_PREFIX)),
  )
  for (const stored of keys) {
    if (stored.startsWith(OLD_PREFIX)) {
      storage.removeItem(stored)
      continue
    }
    const timers = loadTimers(storage, owner, stored.slice(mine.length))
    if (Object.values(timers).every((timer) => now - timer.endsAt > RESUME_FOR_MS)) storage.removeItem(stored)
  }
}
