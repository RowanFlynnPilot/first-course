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

/**
 * The most servings one cook counts as meals not ordered. Dinner is for one
 * or two: a six-serving ragù is not six delivered meals, however many lunches
 * the leftovers make.
 */
export const COUNTED_SERVINGS = 2

/** The servings a cook counts as meals not ordered: what the recipe makes, up to COUNTED_SERVINGS. */
export function countedServings(content: RecipeContent): number {
  return Math.min(content.servings, COUNTED_SERVINGS)
}

/** One order covering the counted servings, with one delivery fee. */
export function orderCostCents(content: RecipeContent): number {
  const food = content.delivery.menuPriceCents * countedServings(content)
  return Math.round(food * (1 + SERVICE_FEE_RATE + TIP_RATE)) + DELIVERY_FEE_CENTS
}

export function orderCostPerServingCents(content: RecipeContent): number {
  return Math.round(orderCostCents(content) / countedServings(content))
}

/**
 * Ordering the counted servings, minus what cooking those servings costs.
 * Leftovers count for nothing either way: not as meals kept, not as cost.
 */
export function keptPerCookCents(content: RecipeContent, prices: Prices): number {
  const cookCost = (cookCostCents(content, prices) * countedServings(content)) / content.servings
  return orderCostCents(content) - Math.round(cookCost)
}

export function totalKeptCents(logs: readonly CookLog[], prices: Prices): number {
  return logs.reduce((sum, log) => {
    return sum + keptPerCookCents(recipeById(log.recipeId).content, prices)
  }, 0)
}
