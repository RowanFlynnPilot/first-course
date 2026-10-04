import { describe, expect, it } from 'vitest'
import type { CookLog } from './progress'
import { currentStreak, longestStreak, weekNumber } from './streak'

function cookedOn(...dates: string[]): CookLog[] {
  return dates.map((date, index) => ({ id: String(index), recipeId: 'chopped-salad', cookedOn: date, rating: 2, notes: '' }))
}

// Saturday, October 3, 2026. Its week runs Monday, September 28 to Sunday, October 4.
const SATURDAY = '2026-10-03'

describe('the cooking streak', () => {
  it('puts Monday through Sunday in one week', () => {
    expect(weekNumber('2026-09-28')).toBe(weekNumber('2026-10-04'))
    expect(weekNumber('2026-10-05')).toBe(weekNumber('2026-10-04') + 1)
    expect(weekNumber('2026-09-27')).toBe(weekNumber('2026-09-28') - 1)
  })

  it('is zero with no cooks, or when the last cook was two weeks ago', () => {
    expect(currentStreak([], SATURDAY)).toEqual({ weeks: 0, needsThisWeek: false })
    expect(currentStreak(cookedOn('2026-09-18'), SATURDAY)).toEqual({ weeks: 0, needsThisWeek: false })
  })

  it('counts weeks in a row ending this week, however many cooks each week has', () => {
    const logs = cookedOn('2026-09-15', '2026-09-22', '2026-09-24', '2026-09-30')
    expect(currentStreak(logs, SATURDAY)).toEqual({ weeks: 3, needsThisWeek: false })
  })

  it('stays alive through this week when last week had a cook', () => {
    const logs = cookedOn('2026-09-15', '2026-09-22')
    expect(currentStreak(logs, SATURDAY)).toEqual({ weeks: 2, needsThisWeek: true })
  })

  it('stops at a week with no cooks', () => {
    const logs = cookedOn('2026-09-01', '2026-09-08', '2026-09-22', '2026-09-30')
    expect(currentStreak(logs, SATURDAY)).toEqual({ weeks: 2, needsThisWeek: false })
  })

  it('remembers the longest run even after it breaks', () => {
    const logs = cookedOn('2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24', '2026-09-30')
    expect(longestStreak(logs)).toBe(4)
    expect(currentStreak(logs, SATURDAY).weeks).toBe(1)
    expect(longestStreak([])).toBe(0)
  })
})
