import { describe, expect, it } from 'vitest'
import { recipeById } from '../curriculum/recipes'
import { addDays, cookBy, cookByDates, dayName } from './freshness'

describe('how long bought meat keeps', () => {
  it('gives raw chicken two days, and no day to a recipe with no meat or meat that outlasts the week', () => {
    expect(cookBy(recipeById('seared-chicken-thighs'), '2026-10-04')).toBe('2026-10-06')
    expect(cookBy(recipeById('chopped-salad'), '2026-10-04')).toBeNull()
    // A smoked sausage keeps two weeks: the plan's week is over first.
    expect(cookBy(recipeById('sheet-pan-sausage'), '2026-10-04')).toBeNull()
  })

  it('goes by the meat that keeps least', () => {
    // Carbonara's bacon keeps a week; nothing else in it is meat.
    expect(cookBy(recipeById('carbonara'), '2026-10-04')).toBe('2026-10-11')
  })

  it('works out a cook-by day for each bought recipe with meat', () => {
    const dates = cookByDates(new Map([['seared-chicken-thighs', '2026-10-04'], ['chopped-salad', '2026-10-04']]))
    expect([...dates]).toEqual([['seared-chicken-thighs', '2026-10-06']])
  })

  it('counts days across a month', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02')
  })

  it('says a day near today as a cook would', () => {
    const today = '2026-10-04' // a Sunday
    expect(dayName('2026-10-04', today)).toBe('today')
    expect(dayName('2026-10-05', today)).toBe('tomorrow')
    expect(dayName('2026-10-06', today)).toBe('Tuesday')
    expect(dayName('2026-10-10', today)).toBe('Saturday')
    expect(dayName('2026-10-11', today)).toMatch(/Oct 11/)
  })
})
