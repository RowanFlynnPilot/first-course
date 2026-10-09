import { describe, expect, it } from 'vitest'
import { recipeById } from '../curriculum/recipes'
import { leftoversOf, loadEaten, makesRice, markEaten } from './leftovers'
import { memoryStorage } from './memoryStorage'
import type { CookLog } from './progress'

const cook = (id: string, recipeId: string, cookedOn: string): CookLog => ({ id, recipeId, cookedOn, rating: 2, notes: '' })

describe('leftovers', () => {
  it('come from a recipe that makes more than two servings, from the day after, for 4 days', () => {
    const logs = [cook('a', 'sheet-pan-sausage', '2026-10-06'), cook('b', 'chopped-salad', '2026-10-06')]
    // The salad makes two: nothing is left.
    expect(leftoversOf(logs, '2026-10-06', new Set())).toEqual([])
    expect(leftoversOf(logs, '2026-10-07', new Set()).map((left) => [left.recipe.id, left.eatBy])).toEqual([['sheet-pan-sausage', '2026-10-10']])
    expect(leftoversOf(logs, '2026-10-10', new Set())).toHaveLength(1)
    expect(leftoversOf(logs, '2026-10-11', new Set())).toEqual([])
  })

  it('follow only the latest cook of a recipe, newest first, and not one marked eaten', () => {
    const logs = [
      cook('old', 'sheet-pan-sausage', '2026-10-01'),
      cook('new', 'sheet-pan-sausage', '2026-10-06'),
      cook('dal', 'chana-masala', '2026-10-07'),
    ]
    expect(leftoversOf(logs, '2026-10-08', new Set()).map((left) => left.cook.id)).toEqual(['dal', 'new'])
    expect(leftoversOf(logs, '2026-10-08', new Set(['dal'])).map((left) => left.cook.id)).toEqual(['new'])
  })

  it('know which recipes leave rice for egg fried rice', () => {
    expect(makesRice(recipeById('chana-masala'))).toBe(true)
    expect(makesRice(recipeById('sheet-pan-sausage'))).toBe(false)
    expect(makesRice(recipeById('egg-fried-rice'))).toBe(false)
  })

  it('keep what was eaten on the phone, only while it matters', () => {
    const storage = memoryStorage()
    markEaten(storage, 'rowan', 'a', ['a', 'b'])
    expect([...markEaten(storage, 'rowan', 'b', ['b'])]).toEqual(['b'])
    expect([...loadEaten(storage, 'rowan')]).toEqual(['b'])
    expect(loadEaten(storage, 'someone-else').size).toBe(0)
  })
})
