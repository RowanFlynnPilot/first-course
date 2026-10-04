// Cooking cost vs. ordering cost. Cooking cost is the portion of each package
// a recipe actually uses, not what the first shop costs at checkout (that is
// grocery.ts).

import { INGREDIENTS, type IngredientId } from '../curriculum/ingredients'
import { recipeById } from '../curriculum/recipes'
import type { RecipeContent } from '../curriculum/types'
import type { CookLog } from './progress'

// Delivery assumptions, applied to the in-app menu price. Tune these here.
export const SERVICE_FEE_RATE = 0.15
export const TIP_RATE = 0.18
export const DELIVERY_FEE_CENTS = 399

/** Package prices the cook corrected, by ingredient. Anything not here costs the estimate. */
export type Prices = ReadonlyMap<IngredientId, number>

/** No corrections: every price is the estimate in ingredients.ts. */
export const ESTIMATES: Prices = new Map()

/**
 * The one place a package price is read. A price the cook corrected replaces
 * the estimate everywhere, past cooks included: kept totals use today's prices.
 */
export function packagePriceCents(id: IngredientId, prices: Prices): number {
  return prices.get(id) ?? INGREDIENTS[id].package.priceCents
}

export function cookCostCents(content: RecipeContent, prices: Prices): number {
  const total = content.ingredients.reduce(
    (sum, { ingredientId, qty }) =>
      sum + (qty * packagePriceCents(ingredientId, prices)) / INGREDIENTS[ingredientId].package.units,
    0,
  )
  return Math.round(total)
}

export function cookCostPerServingCents(content: RecipeContent, prices: Prices): number {
  return Math.round(cookCostCents(content, prices) / content.servings)
}

/** One order covering every serving the recipe makes, with one delivery fee. */
export function orderCostCents(content: RecipeContent): number {
  const food = content.delivery.menuPriceCents * content.servings
  return Math.round(food * (1 + SERVICE_FEE_RATE + TIP_RATE)) + DELIVERY_FEE_CENTS
}

export function orderCostPerServingCents(content: RecipeContent): number {
  return Math.round(orderCostCents(content) / content.servings)
}

export function keptPerCookCents(content: RecipeContent, prices: Prices): number {
  return orderCostCents(content) - cookCostCents(content, prices)
}

export function totalKeptCents(logs: readonly CookLog[], prices: Prices): number {
  return logs.reduce((sum, log) => {
    return sum + keptPerCookCents(recipeById(log.recipeId).content, prices)
  }, 0)
}
