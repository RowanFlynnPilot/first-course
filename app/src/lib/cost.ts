// Cooking cost vs. ordering cost. Cooking cost is the portion of each package
// a recipe actually uses, not what the first shop costs at checkout.

import { INGREDIENTS } from '../curriculum/ingredients'
import { recipeById } from '../curriculum/recipes'
import type { RecipeContent } from '../curriculum/types'
import type { CookLog } from './progress'

// Delivery assumptions, applied to the in-app menu price. Tune these here.
export const SERVICE_FEE_RATE = 0.15
export const TIP_RATE = 0.18
export const DELIVERY_FEE_CENTS = 399

export function cookCostCents(content: RecipeContent): number {
  const total = content.ingredients.reduce((sum, { ingredientId, qty }) => {
    const { priceCents, units } = INGREDIENTS[ingredientId].package
    return sum + (qty * priceCents) / units
  }, 0)
  return Math.round(total)
}

export function cookCostPerServingCents(content: RecipeContent): number {
  return Math.round(cookCostCents(content) / content.servings)
}

/** One order covering every serving the recipe makes, with one delivery fee. */
export function orderCostCents(content: RecipeContent): number {
  const food = content.delivery.menuPriceCents * content.servings
  return Math.round(food * (1 + SERVICE_FEE_RATE + TIP_RATE)) + DELIVERY_FEE_CENTS
}

export function orderCostPerServingCents(content: RecipeContent): number {
  return Math.round(orderCostCents(content) / content.servings)
}

export function keptPerCookCents(content: RecipeContent): number {
  return orderCostCents(content) - cookCostCents(content)
}

export function totalKeptCents(logs: readonly CookLog[]): number {
  return logs.reduce((sum, log) => {
    const { content } = recipeById(log.recipeId)
    if (content === null) throw new Error(`Cook log ${log.id} points at unwritten recipe ${log.recipeId}`)
    return sum + keptPerCookCents(content)
  }, 0)
}
