import { describe, expect, it } from 'vitest'
import { RECIPES } from '../curriculum/recipes'
import { BADGES, earnedBadges } from './badges'
import { ESTIMATES } from './cost'
import type { CookLog, Rating } from './progress'

let counter = 0
function log(recipeId: string, rating: Rating, cookedOn = '2026-10-01'): CookLog {
  counter += 1
  return { id: String(counter), recipeId, cookedOn, rating, notes: '' }
}

const FIRST_COURSE = RECIPES.filter((recipe) => recipe.tier === 1).map((recipe) => log(recipe.id, 2))

describe('badges', () => {
  it('number about a dozen, with one for each dish of the usual', () => {
    expect(BADGES.length).toBe(15)
    const usual = RECIPES.filter((recipe) => recipe.tier === 5)
    expect(BADGES.filter((badge) => badge.id.startsWith('usual-'))).toHaveLength(usual.length)
  })

  it('start with none, and the first cook earns the first', () => {
    expect(earnedBadges([], ESTIMATES)).toEqual([])
    expect(earnedBadges([log('chopped-salad', 1)], ESTIMATES)).toEqual(['first-cook'])
  })

  it('give Nailed it for a Nailed it, and Mastered for a mastery', () => {
    expect(earnedBadges([log('chopped-salad', 3)], ESTIMATES)).toContain('nailed-it')
    const mastered = [log('chopped-salad', 2), log('chopped-salad', 2), log('chopped-salad', 3)]
    expect(earnedBadges(mastered, ESTIMATES)).toContain('mastered')
    expect(earnedBadges(mastered.slice(0, 2), ESTIMATES)).not.toContain('mastered')
  })

  it('clear a course once every skill it teaches is learned', () => {
    expect(earnedBadges(FIRST_COURSE.slice(1), ESTIMATES)).not.toContain('course-cleared')
    expect(earnedBadges(FIRST_COURSE, ESTIMATES)).toContain('course-cleared')
  })

  it('make a specialist of a cook who learns every skill of one kind', () => {
    // Prep is knife basics (salad), mise en place (aglio e olio) and velveting (Fourth course).
    expect(earnedBadges(FIRST_COURSE, ESTIMATES)).not.toContain('specialist')
    // Pot is boiling pasta, steamed rice and simmering (marinara).
    expect(earnedBadges([...FIRST_COURSE, log('marinara-pasta', 2)], ESTIMATES)).toContain('specialist')
  })

  it('count kept money at today’s prices', () => {
    const sauces = Array.from({ length: 3 }, () => log('weeknight-meat-sauce', 2))
    // Each meat sauce keeps $41.59 at the estimates: two dinners not ordered, not four.
    expect(earnedBadges(sauces.slice(1), ESTIMATES)).not.toContain('kept-100')
    expect(earnedBadges(sauces, ESTIMATES)).toContain('kept-100')
    expect(earnedBadges(sauces, ESTIMATES)).not.toContain('kept-500')
  })

  it('give four weeks running for four weeks in a row, and keep it after the streak breaks', () => {
    const weeks = ['2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24', '2026-09-30'].map((date) =>
      log('chopped-salad', 1, date),
    )
    expect(earnedBadges(weeks, ESTIMATES)).toContain('four-weeks')
    expect(earnedBadges(weeks.slice(1), ESTIMATES)).not.toContain('four-weeks')
  })
})
