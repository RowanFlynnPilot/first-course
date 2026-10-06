import { describe, expect, it } from 'vitest'
import { recipeById } from '../curriculum/recipes'
import {
  cookable,
  lastNote,
  learnedTechniques,
  masteryLeft,
  missingTechniques,
  nextRecipe,
  pathTo,
  progressLost,
  readyToPlan,
  recipeState,
  rowNote,
  teacherOf,
  whatTheRatingDecides,
  type CookLog,
  type Rating,
} from './progress'

let counter = 0
function log(recipeId: string, rating: Rating): CookLog {
  counter += 1
  return { id: String(counter), recipeId, cookedOn: '2026-10-03', rating, notes: '' }
}

const eggs = recipeById('soft-scrambled-eggs')
const grilledCheese = recipeById('grilled-cheese')

describe('progress', () => {
  it('starts with the two no-prerequisite recipes ready and the rest locked', () => {
    expect(recipeState(recipeById('chopped-salad'), [])).toBe('ready')
    expect(recipeState(eggs, [])).toBe('ready')
    expect(recipeState(grilledCheese, [])).toBe('locked')
    expect(nextRecipe([], [], new Set())?.id).toBe('chopped-salad')
  })

  it('does not teach a skill on a rough cook', () => {
    const logs = [log(eggs.id, 1)]
    expect(learnedTechniques(logs).has('heat-control')).toBe(false)
    expect(recipeState(eggs, logs)).toBe('cooked')
    expect(recipeState(grilledCheese, logs)).toBe('locked')
  })

  it('teaches the skill and unlocks dependents on a decent cook', () => {
    const logs = [log(eggs.id, 2)]
    expect(learnedTechniques(logs).has('heat-control')).toBe(true)
    expect(recipeState(grilledCheese, logs)).toBe('ready')
  })

  it('suggests a rough cook again before moving on', () => {
    const logs = [log('chopped-salad', 2), log(eggs.id, 1)]
    expect(recipeState(recipeById('sheet-pan-sausage'), logs)).toBe('ready')
    expect(nextRecipe(logs, [], new Set())?.id).toBe(eggs.id)
  })

  it('suggests what is on this week’s plan first, unless it is locked', () => {
    const logs = [log('chopped-salad', 2)]
    const plan = ['grilled-cheese', 'sheet-pan-sausage', eggs.id]
    expect(nextRecipe(logs, plan, new Set())?.id).toBe('sheet-pan-sausage')
    // Groceries bought come first.
    expect(nextRecipe(logs, plan, new Set([eggs.id]))?.id).toBe(eggs.id)
    expect(nextRecipe(logs, ['grilled-cheese'], new Set(['grilled-cheese']))?.id).toBe(eggs.id)
  })

  it('refuses to cook or log a locked recipe, and says what it is missing', () => {
    expect(cookable('chopped-salad', []).content).not.toBeNull()
    for (const id of ['grilled-cheese', 'marinara-pasta', 'margherita-pizza']) {
      const gate = cookable(id, [])
      expect(gate.content, id).toBeNull()
      expect(gate.missing, id).toEqual(missingTechniques(recipeById(id), []))
    }
  })

  it('masters a recipe after three good cooks including one nailed', () => {
    expect(recipeState(eggs, [log(eggs.id, 2), log(eggs.id, 2), log(eggs.id, 2)])).toBe('cooked')
    expect(recipeState(eggs, [log(eggs.id, 2), log(eggs.id, 3)])).toBe('cooked')
    expect(recipeState(eggs, [log(eggs.id, 1), log(eggs.id, 2), log(eggs.id, 3)])).toBe('cooked')
    expect(recipeState(eggs, [log(eggs.id, 2), log(eggs.id, 2), log(eggs.id, 3)])).toBe('mastered')
  })

  it('finds the last note left on a recipe: the latest day, then the latest saved', () => {
    const noted = (cookedOn: string, notes: string): CookLog => ({ ...log(eggs.id, 2), cookedOn, notes })
    expect(lastNote(eggs.id, [])).toBeNull()
    expect(lastNote(eggs.id, [noted('2026-10-01', ''), log('chopped-salad', 2)])).toBeNull()
    const logs = [noted('2026-10-02', 'Lower heat.'), noted('2026-09-01', 'Older.'), noted('2026-10-02', 'More butter.'), noted('2026-10-03', '')]
    expect(lastNote(eggs.id, logs)).toBe('More butter.')
  })

  it('says before saving what the rating decides', () => {
    const salad = recipeById('chopped-salad')
    expect(whatTheRatingDecides(salad, [])).toBe('Decent or better teaches knife basics and seasoning to taste.')
    expect(whatTheRatingDecides(salad, [log(salad.id, 2)])).toBe('2 more good cooks, one of them “Nailed it”, master it.')
    expect(whatTheRatingDecides(salad, [log(salad.id, 2), log(salad.id, 3)])).toBe('One more good cook masters it.')
    expect(whatTheRatingDecides(salad, [log(salad.id, 2), log(salad.id, 2), log(salad.id, 2)])).toBe('A “Nailed it” masters it.')
    // Two Decent: the one good cook it still needs has to be the "Nailed it".
    expect(whatTheRatingDecides(salad, [log(salad.id, 2), log(salad.id, 2)])).toBe('A “Nailed it” masters it.')
    expect(whatTheRatingDecides(salad, [log(salad.id, 2), log(salad.id, 2), log(salad.id, 3)])).toMatch(/^Mastered already/)
  })

  it('offers unplanned recipes in the order the menu suggests them', () => {
    const logs = [log('chopped-salad', 2)]
    const ready = readyToPlan(logs, ['soft-scrambled-eggs']).map((recipe) => recipe.id)
    expect(ready).not.toContain('soft-scrambled-eggs')
    expect(ready).not.toContain('grilled-cheese')
    // Not yet cooked well comes before cooked and not mastered.
    expect(ready.indexOf('sheet-pan-sausage')).toBeLessThan(ready.indexOf('chopped-salad'))
  })

  it('words how far a recipe is from mastery the same way everywhere', () => {
    const salad = recipeById('chopped-salad')
    expect(masteryLeft(salad, [])).toBe('3 more good cooks, one of them “Nailed it”, master it.')
    expect(masteryLeft(salad, [log(salad.id, 3), log(salad.id, 2), log(salad.id, 2)])).toBe('Mastered.')
    expect(rowNote(salad, [log(salad.id, 2)])).toBe('1 of 3 good cooks')
    expect(rowNote(salad, [log(salad.id, 2), log(salad.id, 2), log(salad.id, 2)])).toBe('3 good cooks. A “Nailed it” masters it')
    expect(rowNote(salad, [log(salad.id, 1)])).toBe('Rough so far. A Decent cook teaches knife basics and seasoning to taste')
    expect(rowNote(grilledCheese, [])).toMatch(/^Needs /)
  })

  it('finds the whole way to a locked recipe, each recipe after the ones it needs', () => {
    const target = recipeById('chicken-pan-sauce')
    const path = pathTo(target, [])
    expect(path.length).toBeGreaterThan(1)
    expect(path).not.toContain(target)
    // Cooking the path in order, each well, opens the target.
    const cooked: CookLog[] = []
    for (const recipe of path) {
      expect(recipeState(recipe, cooked), recipe.id).not.toBe('locked')
      cooked.push(log(recipe.id, 2))
    }
    expect(recipeState(target, cooked)).not.toBe('locked')
    // It names only recipes that still teach something missing on the way.
    for (const technique of missingTechniques(target, [])) expect(path).toContain(teacherOf(technique))
    expect(pathTo(recipeById('chopped-salad'), [])).toEqual([])
  })

  it('never offers or suggests a mastered recipe while another is open', () => {
    const salad = recipeById('chopped-salad')
    const mastered = [log(salad.id, 2), log(salad.id, 2), log(salad.id, 3)]
    expect(readyToPlan(mastered, []).map((recipe) => recipe.id)).not.toContain(salad.id)
    expect(nextRecipe(mastered, [], new Set())?.id).not.toBe(salad.id)
  })

  it('says when a change undoes a mastery', () => {
    const salad = recipeById('chopped-salad')
    const before = [log(salad.id, 2), log(salad.id, 2), log(salad.id, 3)]
    expect(progressLost(before, before.slice(0, 2)).unmastered.map((recipe) => recipe.id)).toEqual([salad.id])
    expect(progressLost(before, before).unmastered).toEqual([])
  })
})
