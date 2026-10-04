// The cooking streak: weeks in a row with at least one cook. Derived from
// cooked_on like all other progress, never stored, and display only: it
// earns no XP and gates nothing.
//
// A week runs Monday to Sunday. A streak stays alive through the current
// week: if you cooked last week but not yet this week, it still counts, and
// the menu says to cook this week to keep it.

import type { CookLog } from './progress'

const DAY_MS = 24 * 60 * 60 * 1000

/** Weeks since the Monday of 1970-01-05, for a YYYY-MM-DD date. Consecutive weeks differ by one. */
export function weekNumber(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) throw new Error(`Bad cooked_on date: ${date}`)
  // UTC midnight, so daylight saving never shifts a day.
  const days = Math.round(Date.UTC(year, month - 1, day) / DAY_MS)
  // 1970-01-05 was a Monday, 4 days after the epoch.
  return Math.floor((days - 4) / 7)
}

function cookedWeeks(logs: readonly CookLog[]): Set<number> {
  return new Set(logs.map((log) => weekNumber(log.cookedOn)))
}

export interface Streak {
  /** Weeks in a row, ending this week or last week. 0 = no streak. */
  readonly weeks: number
  /** True when the streak ends last week: cook this week to keep it. */
  readonly needsThisWeek: boolean
}

/** `today` is the cook's local date, YYYY-MM-DD. */
export function currentStreak(logs: readonly CookLog[], today: string): Streak {
  const weeks = cookedWeeks(logs)
  const thisWeek = weekNumber(today)
  const end = weeks.has(thisWeek) ? thisWeek : weeks.has(thisWeek - 1) ? thisWeek - 1 : null
  if (end === null) return { weeks: 0, needsThisWeek: false }
  let count = 0
  while (weeks.has(end - count)) count += 1
  return { weeks: count, needsThisWeek: end !== thisWeek }
}

/** The longest run of weeks ever, for the four-week badge, which stays earned once earned. */
export function longestStreak(logs: readonly CookLog[]): number {
  const weeks = [...cookedWeeks(logs)].sort((a, b) => a - b)
  let longest = 0
  let run = 0
  let previous: number | null = null
  for (const week of weeks) {
    run = previous !== null && week === previous + 1 ? run + 1 : 1
    longest = Math.max(longest, run)
    previous = week
  }
  return longest
}
