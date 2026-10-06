import { describe, expect, it } from 'vitest'
import { RECIPES } from '../curriculum/recipes'
import { BADGES, earnedBadges } from './badges'
import { ESTIMATES, keptPerCookCents } from './cost'
import { recipeById } from '../curriculum/recipes'
import type { CookLog, Rating } from './progress'

let counter = 0
function log(recipeId: string, rating: Rating, cookedOn = '2026-10-01'): CookLog {
  counter += 1
  return { id: String(counter), recipeId, cookedOn, rating, notes: '' }
}

const FIRST_COURSE = RECIPES.filter((recipe) => recipe.tier === 1).map((recipe) => log(recipe.id, 2))

describe('badges', () => {
  it('number 26: one per course, discipline and dish of the usual, and four for money kept', () => {
    expect(BADGES.length).toBe(26)
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

  it('clear a course once every skill it teaches is learned, each course its own badge', () => {
    expect(earnedBadges(FIRST_COURSE.slice(1), ESTIMATES)).not.toContain('course-1')
    expect(earnedBadges(FIRST_COURSE, ESTIMATES)).toContain('course-1')
    expect(earnedBadges(FIRST_COURSE, ESTIMATES)).not.toContain('course-2')
  })

  it('make a specialist of each kind separately', () => {
    // Prep is knife basics (salad), mise en place (aglio e olio) and velveting (Fourth course).
    expect(earnedBadges(FIRST_COURSE, ESTIMATES)).not.toContain('prep-specialist')
    // Pot is boiling pasta, steamed rice and simmering (marinara).
    const withMarinara = earnedBadges([...FIRST_COURSE, log('marinara-pasta', 2)], ESTIMATES)
    expect(withMarinara).toContain('pot-specialist')
    expect(withMarinara).not.toContain('pan-specialist')
  })

  it('keep counting money past $500, and crown a cook who has cooked everything', () => {
    expect(BADGES.map((badge) => badge.name)).toEqual(expect.arrayContaining(['$1,000 kept', '$2,500 kept']))
    const everything = RECIPES.map((recipe) => log(recipe.id, 1))
    expect(earnedBadges(everything.slice(1), ESTIMATES)).not.toContain('every-recipe')
    expect(earnedBadges(everything, ESTIMATES)).toContain('every-recipe')
  })

  it('count kept money at today’s prices', () => {
    const sauces = Array.from({ length: 3 }, () => log('weeknight-meat-sauce', 2))
    // Each meat sauce keeps about $41 at the estimates: two dinners not ordered, not four.
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

  it('gives a dish of the usual its badge only for a good cook of it', () => {
    expect(earnedBadges([log('pad-thai', 1)], ESTIMATES)).not.toContain('usual-pad-thai')
    expect(earnedBadges([log('pad-thai', 2)], ESTIMATES)).toContain('usual-pad-thai')
  })

  it('needs the usual too for the whole menu', () => {
    const courses = RECIPES.filter((recipe) => recipe.tier < 5).map((recipe) => log(recipe.id, 2))
    expect(earnedBadges(courses, ESTIMATES)).not.toContain('every-recipe')
    expect(earnedBadges([...courses, ...RECIPES.filter((recipe) => recipe.tier === 5).map((recipe) => log(recipe.id, 1))], ESTIMATES)).toContain(
      'every-recipe',
    )
  })

  it('counts money kept at the prices the cook corrected', () => {
    // Enough cooks of the salad to sit just over $100 kept at the estimates.
    const salad = recipeById('chopped-salad')
    const each = keptPerCookCents(salad.content, ESTIMATES)
    const cooks = Array.from({ length: Math.ceil(10_000 / each) }, () => log(salad.id, 2))
    expect(earnedBadges(cooks, ESTIMATES)).toContain('kept-100')
    // Feta at $40 a tub makes the salad cost more than it kept.
    const dear = new Map([['feta' as const, 4000]])
    expect(earnedBadges(cooks, dear)).not.toContain('kept-100')
  })
})
