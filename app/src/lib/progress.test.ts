import { describe, expect, it } from 'vitest'
import { recipeById } from '../curriculum/recipes'
import { cookable, learnedTechniques, nextRecipe, recipeState, type CookLog, type Rating } from './progress'

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
    expect(nextRecipe([])?.id).toBe('chopped-salad')
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
    expect(nextRecipe(logs)?.id).toBe(eggs.id)
  })

  it('refuses to cook or log a locked recipe', () => {
    expect(cookable('chopped-salad', []).recipe.id).toBe('chopped-salad')
    expect(() => cookable('grilled-cheese', [])).toThrow('still locked')
    expect(() => cookable('marinara-pasta', [])).toThrow('still locked')
    expect(() => cookable('margherita-pizza', [])).toThrow('still locked')
  })

  it('masters a recipe after three good cooks including one nailed', () => {
    expect(recipeState(eggs, [log(eggs.id, 2), log(eggs.id, 2), log(eggs.id, 2)])).toBe('cooked')
    expect(recipeState(eggs, [log(eggs.id, 2), log(eggs.id, 3)])).toBe('cooked')
    expect(recipeState(eggs, [log(eggs.id, 1), log(eggs.id, 2), log(eggs.id, 3)])).toBe('cooked')
    expect(recipeState(eggs, [log(eggs.id, 2), log(eggs.id, 2), log(eggs.id, 3)])).toBe('mastered')
  })
})
