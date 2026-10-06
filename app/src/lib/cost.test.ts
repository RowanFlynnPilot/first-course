import { describe, expect, it } from 'vitest'
import { INGREDIENTS, type IngredientId } from '../curriculum/ingredients'
import type { RecipeContent } from '../curriculum/types'
import {
  cookCostCents,
  COUNTED_SERVINGS,
  DELIVERY_FEE_CENTS,
  ESTIMATES,
  keptPerCookCents,
  orderCostCents,
  packagePriceCents,
  SERVICE_FEE_RATE,
  TIP_RATE,
  totalKeptCents,
} from './cost'
import { recipeById } from '../curriculum/recipes'
import type { CookLog } from './progress'

const content: RecipeContent = {
  servings: 2,
  activeMinutes: 1,
  totalMinutes: 1,
  equipment: [],
  ingredients: [
    { ingredientId: 'eggs', qty: 4, prep: null },
    { ingredientId: 'butter', qty: 2, prep: null },
  ],
  steps: [{ text: 'Cook.', why: null, timer: null }],
  delivery: { label: 'Eggs', menuPriceCents: 1000, side: false },
  pairing: { wine: 'Cava', principle: 'Bubbles cut richness', why: '' },
}

describe('cost', () => {
  it('charges only the share of each package the recipe uses', () => {
    const eggs = (4 * INGREDIENTS.eggs.package.priceCents) / INGREDIENTS.eggs.package.units
    const butter = (2 * INGREDIENTS.butter.package.priceCents) / INGREDIENTS.butter.package.units
    expect(cookCostCents(content, ESTIMATES)).toBe(Math.round(eggs + butter))
  })

  it('uses a price the cook corrected in place of the estimate, and only for that ingredient', () => {
    const prices = new Map<IngredientId, number>([['eggs', 600]])
    expect(packagePriceCents('eggs', prices)).toBe(600)
    expect(packagePriceCents('butter', prices)).toBe(INGREDIENTS.butter.package.priceCents)
    const butter = (2 * INGREDIENTS.butter.package.priceCents) / INGREDIENTS.butter.package.units
    expect(cookCostCents(content, prices)).toBe(Math.round((4 * 600) / 12 + butter))
  })

  it('prices an order as every serving plus fees, tip and one delivery fee', () => {
    expect(orderCostCents(content)).toBe(Math.round(2000 * (1 + SERVICE_FEE_RATE + TIP_RATE)) + DELIVERY_FEE_CENTS)
    expect(keptPerCookCents(content, ESTIMATES)).toBe(orderCostCents(content) - cookCostCents(content, ESTIMATES))
  })

  it('prices a side as every serving plus fees and tip, with no delivery fee: it rides on another order', () => {
    const side: RecipeContent = { ...content, delivery: { ...content.delivery, side: true } }
    expect(orderCostCents(side)).toBe(Math.round(2000 * (1 + SERVICE_FEE_RATE + TIP_RATE)))
    expect(orderCostCents(side)).toBe(orderCostCents(content) - DELIVERY_FEE_CENTS)
    expect(keptPerCookCents(side, ESTIMATES)).toBe(orderCostCents(side) - cookCostCents(side, ESTIMATES))
    expect(recipeById('chopped-salad').content.delivery.side).toBe(true)
    expect(recipeById('oven-fries-aioli').content.delivery.side).toBe(true)
  })

  it('counts at most two servings as meals not ordered, against their share of the cook', () => {
    const big: RecipeContent = { ...content, servings: 6 }
    expect(COUNTED_SERVINGS).toBe(2)
    expect(orderCostCents(big)).toBe(orderCostCents(content))
    expect(keptPerCookCents(big, ESTIMATES)).toBe(orderCostCents(big) - Math.round(cookCostCents(big, ESTIMATES) / 3))
  })

  it('counts every cook toward what is kept, Rough ones included: you still did not order', () => {
    const rough: CookLog = { id: 'r', recipeId: 'chopped-salad', cookedOn: '2026-10-01', rating: 1, notes: '' }
    const salad = recipeById('chopped-salad').content
    expect(totalKeptCents([rough], ESTIMATES)).toBe(keptPerCookCents(salad, ESTIMATES))
    expect(totalKeptCents([rough, { ...rough, id: 'd', rating: 2 }], ESTIMATES)).toBe(2 * keptPerCookCents(salad, ESTIMATES))
  })
})
