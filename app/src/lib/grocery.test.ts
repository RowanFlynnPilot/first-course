import { describe, expect, it } from 'vitest'
import { INGREDIENTS, type IngredientId } from '../curriculum/ingredients'
import { ESTIMATES } from './cost'
import { groceryList } from './grocery'

const NOTHING = new Set<IngredientId>()

describe('the grocery list', () => {
  it('buys whole packages of everything the plan uses, in store order', () => {
    const list = groceryList(['grilled-cheese'], NOTHING, ESTIMATES)
    expect(list.sections.map((section) => section.id)).toEqual(['dairy', 'bakery'])
    expect(list.lines.map((line) => [line.ingredientId, line.packages])).toEqual([
      ['butter', 1],
      ['cheddar', 1],
      ['sandwich-bread', 1],
    ])
    const checkout =
      INGREDIENTS.butter.package.priceCents +
      INGREDIENTS.cheddar.package.priceCents +
      INGREDIENTS['sandwich-bread'].package.priceCents
    expect(list.totalCents).toBe(checkout)
  })

  it('adds up an ingredient across recipes before rounding up to packages', () => {
    // 2 cups of rice for the stir-fry and 2 for the chana masala: 4 cups, one 4½-cup bag.
    const one = groceryList(['chicken-broccoli-stir-fry', 'chana-masala'], NOTHING, ESTIMATES)
    expect(one.lines.find((line) => line.ingredientId === 'jasmine-rice')).toMatchObject({ qty: 4, packages: 1 })
    // Two 28-ounce recipes need two cans, not one.
    const two = groceryList(['marinara-pasta', 'weeknight-meat-sauce'], NOTHING, ESTIMATES)
    expect(two.lines.find((line) => line.ingredientId === 'crushed-tomatoes')).toMatchObject({ qty: 56, packages: 2 })
  })

  it('leaves off what the pantry has, and says so', () => {
    const list = groceryList(['grilled-cheese'], new Set<IngredientId>(['butter']), ESTIMATES)
    expect(list.lines.map((line) => line.ingredientId)).toEqual(['cheddar', 'sandwich-bread'])
    expect(list.inPantry).toEqual(['butter'])
  })

  it('charges the price the cook corrected', () => {
    const list = groceryList(['grilled-cheese'], NOTHING, new Map<IngredientId, number>([['cheddar', 500]]))
    expect(list.lines.find((line) => line.ingredientId === 'cheddar')).toMatchObject({ packagePriceCents: 500, totalCents: 500 })
  })

  it('refuses a plan with an unwritten recipe', () => {
    expect(() => groceryList(['margherita-pizza'], NOTHING, ESTIMATES)).toThrow('not written yet')
  })

  it('is empty for an empty plan', () => {
    expect(groceryList([], NOTHING, ESTIMATES)).toEqual({ sections: [], lines: [], totalCents: 0, inPantry: [] })
  })
})
