import { describe, expect, it } from 'vitest'
import { recipeById } from '../curriculum/recipes'
import { addDays, boughtNote, boughtState, cookBy, cookByDates, dayName } from './freshness'

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
    expect(dayName('2026-10-11', today)).toBe('Oct 11')
    expect(dayName('2026-10-03', today)).toBe('yesterday')
    expect(dayName('2026-09-30', today)).toBe('Wednesday')
    // Another year says which.
    expect(dayName('2025-12-30', today)).toBe('Dec 30, 2025')
  })

  it('says on the plan when to cook bought meat by, and when it is past its days', () => {
    const thighs = recipeById('seared-chicken-thighs')
    expect(boughtNote(thighs, '2026-10-04', '2026-10-04')).toBe('Groceries bought. Cook it by Tuesday')
    expect(boughtNote(thighs, '2026-10-04', '2026-10-06')).toBe('Groceries bought. Cook it today')
    expect(boughtNote(thighs, '2026-10-04', '2026-10-07')).toBe('Bought Sunday. Unless you froze it, the meat is past its days')
    // No date on meat that keeps only days: "I froze it".
    expect(boughtNote(thighs, undefined, '2026-10-07')).toBe('Groceries bought, the meat in the freezer')
    // Nothing that keeps only days: bought, until a week has gone by, then asked about.
    const salad = recipeById('chopped-salad')
    expect(boughtNote(salad, '2026-10-04', '2026-10-11')).toBe('Groceries bought')
    expect(boughtNote(salad, '2026-10-04', '2026-10-12')).toBe('Bought Oct 4. Still have these?')
    expect(boughtNote(salad, undefined, '2026-10-30')).toBe('Groceries bought')
  })

  it('say how bought groceries stand: fresh, past their day, frozen, or old enough to ask about', () => {
    const thighs = recipeById('seared-chicken-thighs')
    const salad = recipeById('chopped-salad')
    expect(boughtState(thighs, '2026-10-04', '2026-10-06')).toBe('fresh')
    expect(boughtState(thighs, '2026-10-04', '2026-10-07')).toBe('past')
    expect(boughtState(thighs, undefined, '2026-10-07')).toBe('frozen')
    expect(boughtState(salad, '2026-10-04', '2026-10-11')).toBe('fresh')
    expect(boughtState(salad, '2026-10-04', '2026-10-12')).toBe('old')
    // The smoked sausage keeps two weeks: no cook-by day, so it is asked about after a week like the salad.
    expect(boughtState(recipeById('sheet-pan-sausage'), '2026-10-04', '2026-10-12')).toBe('old')
  })
})
