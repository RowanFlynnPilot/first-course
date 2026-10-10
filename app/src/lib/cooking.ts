// The cook in progress on this phone: which recipe, which step, and when it
// was last on screen. An installed app that the phone closes (the cook opened
// the camera, took a call) reopens at the menu, so the menu offers the way
// back to the step, or, once the last step is done, to logging it: the log
// is what unlocks the next recipe, and a cook eaten but never logged is lost.
// Kept in localStorage with the timers (lib/timers.ts), per account.

/** The cook in progress. */
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
  /** When it was last on screen, in milliseconds. */
  readonly at: number
}

const isStep = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0

/** A cook left this long is forgotten: long enough for dinner and the next morning. */
export const RESUME_FOR_MS = 12 * 60 * 60 * 1000

const key = (owner: string) => `first-course:cooking:${owner}`

/** The cook in progress, or null when there is none or it was left too long ago. */
export function loadCooking(storage: Storage, owner: string, now: number): Cooking | null {
  const stored = storage.getItem(key(owner))
  if (stored === null) return null
  const parsed = JSON.parse(stored) as Partial<Record<keyof Cooking, unknown>> | null
  const valid =
    parsed !== null &&
    typeof parsed.recipeId === 'string' &&
    (parsed.step === 'log' || isStep(parsed.step)) &&
    // A cook saved before the first step was kept (October 9, 2026) began at the start.
    (parsed.from === undefined || isStep(parsed.from)) &&
    typeof parsed.at === 'number'
  if (!valid) throw new Error('The cook in progress saved on this phone is malformed')
  const cooking = { ...parsed, from: parsed.from ?? 0 } as Cooking
  return now - cooking.at > RESUME_FOR_MS ? null : cooking
}

export function saveCooking(storage: Storage, owner: string, cooking: Cooking) {
  storage.setItem(key(owner), JSON.stringify(cooking))
}

export function clearCooking(storage: Storage, owner: string) {
  storage.removeItem(key(owner))
}
