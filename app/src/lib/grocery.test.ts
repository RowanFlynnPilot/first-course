import { describe, expect, it } from 'vitest'
import { INGREDIENTS, type IngredientId } from '../curriculum/ingredients'
import { ESTIMATES } from './cost'
import { RECIPES } from '../curriculum/recipes'
import { formatAmount } from './format'
import { groceryList, groceryText, staplesByCourse } from './grocery'

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
    // 2 cups of rice for the stir-fry and 2 for the chana masala: 4 cups, one 5 lb bag of about 11 cups.
    const one = groceryList(['chicken-broccoli-stir-fry', 'chana-masala'], NOTHING, ESTIMATES)
    expect(one.lines.find((line) => line.ingredientId === 'jasmine-rice')).toMatchObject({ qty: 4, packages: 1 })
    // Two 28-ounce recipes need two cans, not one.
    const two = groceryList(['marinara-pasta', 'weeknight-meat-sauce'], NOTHING, ESTIMATES)
    expect(two.lines.find((line) => line.ingredientId === 'crushed-tomatoes')).toMatchObject({ qty: 56, packages: 2 })
  })

  it('leaves off what the pantry has, and says so', () => {
    const list = groceryList(['grilled-cheese'], new Set<IngredientId>(['butter']), ESTIMATES)
    expect(list.lines.map((line) => line.ingredientId)).toEqual(['cheddar', 'sandwich-bread'])
    expect(list.inPantry).toEqual([{ ingredientId: 'butter', qty: 1 }])
  })

  it('charges the price the cook corrected', () => {
    const list = groceryList(['grilled-cheese'], NOTHING, new Map<IngredientId, number>([['cheddar', 500]]))
    expect(list.lines.find((line) => line.ingredientId === 'cheddar')).toMatchObject({ packagePriceCents: 500, totalCents: 500 })
  })

  it('shares what is still to buy as plain text, aisle by aisle', () => {
    const list = groceryList(['grilled-cheese'], NOTHING, ESTIMATES)
    const { butter, cheddar } = INGREDIENTS
    expect(groceryText(['grilled-cheese'], list, new Set<IngredientId>(['sandwich-bread']))).toBe(
      [
        'Grocery list for Grilled cheese',
        `Dairy and eggs\n- ${butter.name}: ${butter.package.label}\n- ${cheddar.name}: ${cheddar.package.label}`,
      ].join('\n\n'),
    )
    expect(() => groceryText(['grilled-cheese'], list, new Set(list.lines.map((line) => line.ingredientId)))).toThrow(
      'nothing to share',
    )
  })

  it('prints every line for any two recipes planned together, and for the whole menu', () => {
    // The salad's ¼ teaspoon of pepper and the eggs' ⅛ once summed to ⅜, which had no glyph.
    // Quantities are whole quarters now, so every sum is too.
    const plans = [...RECIPES.flatMap((a, i) => RECIPES.slice(i + 1).map((b) => [a.id, b.id])), RECIPES.map((recipe) => recipe.id)]
    for (const plan of plans) {
      for (const line of groceryList(plan, NOTHING, ESTIMATES).lines) formatAmount(line.qty, INGREDIENTS[line.ingredientId].unit)
    }
    expect(() => formatAmount(0.375, 'tsp')).toThrow('No fraction glyph')
  })

  it('is empty for an empty plan', () => {
    expect(groceryList([], NOTHING, ESTIMATES)).toEqual({ sections: [], lines: [], totalCents: 0, inPantry: [] })
  })

  it('buys whole packages, rounding up: a little over one package is two', () => {
    // Find two recipes whose shared ingredient comes to between one and one and a half packages.
    const found = RECIPES.flatMap((first) =>
      RECIPES.filter((second) => second !== first).flatMap((second) =>
        first.content.ingredients.flatMap(({ ingredientId }) => {
          const qty = [first, second]
            .flatMap((recipe) => recipe.content.ingredients)
            .filter((line) => line.ingredientId === ingredientId)
            .reduce((sum, line) => sum + line.qty, 0)
          const units = INGREDIENTS[ingredientId].package.units
          return qty > units && qty < units * 1.5 ? [{ plan: [first.id, second.id], ingredientId }] : []
        }),
      ),
    )[0]
    if (found === undefined) throw new Error('No two recipes need between one and one and a half packages of anything')
    const line = groceryList(found.plan, NOTHING, ESTIMATES).lines.find((candidate) => candidate.ingredientId === found.ingredientId)
    expect(line?.packages).toBe(2)
  })

  it('files every staple under the first course that uses it, once', () => {
    const filed = staplesByCourse()
    const all = filed.flatMap((course) => course.staples)
    expect(new Set(all).size).toBe(all.length)
    expect(all.sort()).toEqual((Object.keys(INGREDIENTS) as IngredientId[]).filter((id) => INGREDIENTS[id].staple).sort())
    for (const { tier, staples } of filed) {
      for (const id of staples) {
        const tiers = RECIPES.filter((recipe) => recipe.content.ingredients.some((line) => line.ingredientId === id)).map((recipe) => recipe.tier)
        expect(Math.min(...tiers), id).toBe(tier)
      }
    }
  })
})
