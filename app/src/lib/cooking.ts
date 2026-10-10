// The cooks in progress on this phone, one per recipe: which step, and when
// it was last on screen. An installed app that the phone closes (the cook
// opened the camera, took a call) reopens at the menu, so the menu offers the
// way back to the step, or, once the last step is done, to logging it: the
// log is what unlocks the next recipe, and a cook eaten but never logged is
// lost. One per recipe, so a main and its side each keep their place, and a
// dinner not yet logged is still asked about after the next cook begins
// (Rowan's call, October 10, 2026). Kept in localStorage with the timers
// (lib/timers.ts), per account.

import { addDays } from './freshness'
import { localDateString } from './format'

/** A cook in progress. */
export interface Cooking {
  readonly recipeId: string
  /** The step on screen (0 is "get everything out"), or 'log' once the cook tapped "Finish and log it". */
  readonly step: number | 'log'
  /**
   * The step the cook began at: 0 from Start cooking, later from a link
   * partway in (leftover rice into egg fried rice, at step 3). Cook mode
   * offers a timer the cook passed by only on a step after this one.
   */
  readonly from: number
  /**
   * How many cooks of the recipe the log held when this one began: one more
   * means it was logged, here or on another device, and the menu stops
   * asking about it. A second cook of a dish the same day still comes back.
   */
  readonly cooksBefore: number
  /** When it was last on screen, in milliseconds. */
  readonly at: number
}

const isStep = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0

/**
 * A cook left mid-way this long is forgotten. One finished and not yet
 * logged is kept until the end of the next day instead, so dinner can be
 * logged the next evening.
 */
export const RESUME_FOR_MS = 12 * 60 * 60 * 1000

const prefix = (owner: string) => `first-course:cooking:${owner}:`
const key = (owner: string, recipeId: string) => `${prefix(owner)}${recipeId}`

function parsed(stored: string, recipeId: string): Cooking {
  const fields = JSON.parse(stored) as Partial<Record<keyof Cooking, unknown>> | null
  const valid =
    fields !== null &&
    fields.recipeId === recipeId &&
    (fields.step === 'log' || isStep(fields.step)) &&
    isStep(fields.from) &&
    isStep(fields.cooksBefore) &&
    typeof fields.at === 'number'
  if (!valid) throw new Error(`The cook of ${recipeId} saved on this phone is malformed`)
  return fields as Cooking
}

/** Whether a cook is still kept at `now`: left mid-way within RESUME_FOR_MS, or finished and the next day not over. */
function kept(cooking: Cooking, now: number): boolean {
  if (cooking.step !== 'log') return now - cooking.at <= RESUME_FOR_MS
  return localDateString(new Date(now)) <= addDays(localDateString(new Date(cooking.at)), 1)
}

/** The cook of a recipe in progress, or null when there is none or it was left too long ago. */
export function loadCooking(storage: Storage, owner: string, recipeId: string, now: number): Cooking | null {
  const stored = storage.getItem(key(owner, recipeId))
  if (stored === null) return null
  const cooking = parsed(stored, recipeId)
  return kept(cooking, now) ? cooking : null
}

/**
 * Every cook in progress on this phone for an account, the latest first,
 * leaving out ones left too long ago. Only this account's are read.
 */
export function cooksInProgress(storage: Storage, owner: string, now: number): Cooking[] {
  const mine = prefix(owner)
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
    (stored): stored is string => stored !== null && stored.startsWith(mine),
  )
  const cooks = keys.flatMap((stored) => {
    const cooking = loadCooking(storage, owner, stored.slice(mine.length), now)
    return cooking === null ? [] : [cooking]
  })
  return cooks.toSorted((a, b) => b.at - a.at)
}

export function saveCooking(storage: Storage, owner: string, cooking: Cooking) {
  storage.setItem(key(owner, cooking.recipeId), JSON.stringify(cooking))
}

export function clearCooking(storage: Storage, owner: string, recipeId: string) {
  storage.removeItem(key(owner, recipeId))
}
