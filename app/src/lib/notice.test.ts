import { describe, expect, it } from 'vitest'
import { recipeById } from '../curriculum/recipes'
import { ESTIMATES } from './cost'
import { cookNotice } from './notice'
import type { CookLog, Rating } from './progress'

let counter = 0
function log(recipeId: string, rating: Rating): CookLog {
  counter += 1
  return { id: String(counter), recipeId, cookedOn: '2026-10-03', rating, notes: '' }
}

describe('the after-cook notice', () => {
  it('reports XP, the level-up, skills and what opened up on a first good cook', () => {
    const notice = cookNotice(recipeById('chopped-salad'), [], log('chopped-salad', 2), 'Remy', ESTIMATES)
    expect(notice.xpBefore).toBe(0)
    expect(notice.lines).toEqual([
      '+120 XP. Level 2.',
      'Kept $22.50 by not ordering.',
      'Learned knife basics and seasoning to taste.',
      'Now ready to cook: Sheet-pan sausage and vegetables.',
    ])
    expect(notice).toMatchObject({ levelUp: 2, promotion: null, badges: ['first-cook'], usualUnlocked: [] })
  })

  it('says what a rough cook still owes', () => {
    const notice = cookNotice(recipeById('soft-scrambled-eggs'), [], log('soft-scrambled-eggs', 1), 'Remy', ESTIMATES)
    expect(notice.lines[0]).toBe('+10 XP.')
    expect(notice.lines).toContain('Cook it again at “Decent” or better to learn heat control.')
  })

  it('names the promotion with the chef’s name', () => {
    // 260 XP before; the next good cook crosses 300, which is level 3 and prep cook.
    const before = [log('chopped-salad', 2), log('soft-scrambled-eggs', 2), log('grilled-cheese', 2)]
    const notice = cookNotice(recipeById('sheet-pan-sausage'), before, log('sheet-pan-sausage', 2), 'Remy', ESTIMATES)
    expect(notice.lines[0]).toBe('+70 XP. Level 3.')
    expect(notice.lines[1]).toBe('Remy is promoted to prep cook.')
    expect(notice).toMatchObject({ levelUp: 3, promotion: 1 })
  })

  it('names what a good cook opened up', () => {
    const before = [log('chopped-salad', 2), log('soft-scrambled-eggs', 2)]
    const notice = cookNotice(recipeById('aglio-e-olio'), before, log('aglio-e-olio', 2), 'Remy', ESTIMATES)
    expect(notice.lines).toContain('Now ready to cook: Pasta with quick marinara and Pasta al limone.')
  })

  it('opens a Fourth-course recipe only once a Third-course skill it needs is learned', () => {
    // Carbonara needs the pasta-water sauce, separating an egg (the aioli) and spooning off fat (the pan sauce).
    const before = ['chopped-salad', 'soft-scrambled-eggs', 'aglio-e-olio', 'pasta-al-limone', 'seared-chicken-thighs', 'oven-fries-aioli']
      .map((id) => log(id, 2))
    const notice = cookNotice(recipeById('chicken-pan-sauce'), before, log('chicken-pan-sauce', 2), 'Remy', ESTIMATES)
    expect(notice.lines.find((line) => line.startsWith('Now ready to cook:'))).toContain('Spaghetti carbonara')
  })

  it('announces mastery and the end of XP for a recipe', () => {
    const eggs = recipeById('soft-scrambled-eggs')
    const two = [log(eggs.id, 2), log(eggs.id, 2)]
    expect(cookNotice(eggs, two, log(eggs.id, 3), 'Remy', ESTIMATES).lines).toContain('Soft scrambled eggs on toast is mastered.')
    const five = [...two, log(eggs.id, 3), log(eggs.id, 3), log(eggs.id, 3)]
    expect(cookNotice(eggs, five, log(eggs.id, 3), 'Remy', ESTIMATES).lines[0]).toBe('No XP this time. A recipe pays out for its first 5 cooks.')
  })

  it('names an extra the cook just earned', () => {
    const before = [log('smash-cheeseburger', 2), log('smash-cheeseburger', 2), log('onion-melt', 2), log('onion-melt', 3)]
    const notice = cookNotice(recipeById('smash-cheeseburger'), before, log('smash-cheeseburger', 2), 'Remy', ESTIMATES)
    expect(notice.lines).toContain('New extra for Remy: Red clogs. Put it on from the chef sheet.')
  })

  it('makes a dish of the usual coming into reach its own moment, not a line', () => {
    // The double smash burger needs the smash crust, caramelizing and cold emulsions.
    const before = [log('smash-cheeseburger', 2), log('onion-melt', 2)]
    const notice = cookNotice(recipeById('oven-fries-aioli'), before, log('oven-fries-aioli', 2), 'Remy', ESTIMATES)
    expect(notice.usualUnlocked.map((recipe) => recipe.id)).toEqual(['double-smash-burger'])
    expect(notice.lines.some((line) => line.includes('Double smash burger'))).toBe(false)
  })

  it('names only the badges this cook earned', () => {
    const before = [log('chopped-salad', 2)]
    const notice = cookNotice(recipeById('chopped-salad'), before, log('chopped-salad', 3), 'Remy', ESTIMATES)
    expect(notice.badges).toEqual(['nailed-it'])
    expect(notice.lines.some((line) => line.includes('Nailed it'))).toBe(false)
    expect(notice.levelUp).toBeNull()
  })
})