import { describe, expect, it } from 'vitest'
import { INGREDIENTS } from '../curriculum/ingredients'
import type { RecipeContent } from '../curriculum/types'
import { cookCostCents, DELIVERY_FEE_CENTS, keptPerCookCents, orderCostCents, SERVICE_FEE_RATE, TIP_RATE } from './cost'

const content: RecipeContent = {
  servings: 2,
  activeMinutes: 1,
  totalMinutes: 1,
  equipment: [],
  ingredients: [
    { ingredientId: 'eggs', qty: 4, prep: null },
    { ingredientId: 'butter', qty: 2, prep: null },
  ],
  steps: [{ text: 'Cook.', why: null, timerSeconds: null }],
  delivery: { label: 'Eggs', menuPriceCents: 1000 },
  pairing: { wine: 'Cava', principle: 'Bubbles cut richness', why: '' },
}

describe('cost', () => {
  it('charges only the share of each package the recipe uses', () => {
    const eggs = (4 * INGREDIENTS.eggs.package.priceCents) / INGREDIENTS.eggs.package.units
    const butter = (2 * INGREDIENTS.butter.package.priceCents) / INGREDIENTS.butter.package.units
    expect(cookCostCents(content)).toBe(Math.round(eggs + butter))
  })

  it('prices an order as every serving plus fees, tip and one delivery fee', () => {
    expect(orderCostCents(content)).toBe(Math.round(2000 * (1 + SERVICE_FEE_RATE + TIP_RATE)) + DELIVERY_FEE_CENTS)
    expect(keptPerCookCents(content)).toBe(orderCostCents(content) - cookCostCents(content))
  })
})
