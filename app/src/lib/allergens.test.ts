import { describe, expect, it } from 'vitest'
import { RECIPES, recipeById } from '../curriculum/recipes'
import { allergensOf, containsLine } from './allergens'

describe('allergens', () => {
  it('are worked out from the ingredients, in the FDA’s order', () => {
    // Butter, eggs, bread: milk, egg, wheat, in that order.
    const eggs = allergensOf(recipeById('soft-scrambled-eggs').content)
    expect(eggs).toEqual(expect.arrayContaining(['milk', 'egg', 'wheat']))
    expect(eggs.indexOf('milk')).toBeLessThan(eggs.indexOf('wheat'))
    expect(allergensOf(recipeById('pad-thai').content)).toContain('peanut')
    expect(containsLine(recipeById('grilled-cheese').content)).toMatch(/^Contains milk, wheat/)
  })

  it('name each allergen once, in a sentence with the serial comma', () => {
    for (const recipe of RECIPES) {
      const found = allergensOf(recipe.content)
      expect(new Set(found).size, recipe.id).toBe(found.length)
      const line = containsLine(recipe.content)
      if (found.length >= 3) expect(line, recipe.id).toMatch(/, and [a-z ]+\.$/)
    }
  })
})
