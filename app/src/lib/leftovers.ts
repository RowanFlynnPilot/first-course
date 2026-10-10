// What is left from a recent cook. A recipe that makes more than two
// servings leaves some (the cost counts two: lib/cost.ts), which keep 4 days
// in a lidded container in the fridge. The menu says so for those days, with
// how to reheat them (`leftovers` in the recipe), until they are past their
// days or the cook says they are eaten. Leftover rice can become egg fried
// rice, which wants day-old rice.

import { recipeById } from '../curriculum/recipes'
import type { Recipe } from '../curriculum/types'
import { addDays } from './freshness'
import type { CookLog } from './progress'

/** Leftovers keep this many days in the fridge, as every recipe's last step says. */
export const LEFTOVER_DAYS = 4

export interface Leftover {
  readonly cook: CookLog
  readonly recipe: Recipe
  /** How to reheat them (the recipe's `leftovers`). */
  readonly reheat: string
  /** The last day to eat them, YYYY-MM-DD. */
  readonly eatBy: string
}

/**
 * The latest cook of each recipe that leaves leftovers, from before today
 * and still within its days, newest first, leaving out those the cook said
 * are eaten (`eaten`, by cook id). Today's cook is still dinner, not
 * leftovers.
 */
export function leftoversOf(logs: readonly CookLog[], today: string, eaten: ReadonlySet<string>): Leftover[] {
  const latest = new Map<string, CookLog>()
  for (const cook of logs) {
    const known = latest.get(cook.recipeId)
    if (known === undefined || cook.cookedOn >= known.cookedOn) latest.set(cook.recipeId, cook)
  }
  return [...latest.values()]
    .flatMap((cook) => {
      const recipe = recipeById(cook.recipeId)
      const { leftovers } = recipe.content
      const eatBy = addDays(cook.cookedOn, LEFTOVER_DAYS)
      const fresh = leftovers !== null && cook.cookedOn < today && today <= eatBy && !eaten.has(cook.id)
      return fresh ? [{ cook, recipe, reheat: leftovers.reheat, eatBy }] : []
    })
    .toSorted((a, b) => b.cook.cookedOn.localeCompare(a.cook.cookedOn))
}

/** The recipe that wants day-old rice. */
export const FRIED_RICE = recipeById('egg-fried-rice')

/** Whether a recipe makes extra rice, which egg fried rice can use. */
export function makesRice(recipe: Recipe): boolean {
  return recipe.id !== FRIED_RICE.id && recipe.content.ingredients.some(({ ingredientId }) => ingredientId === 'jasmine-rice')
}

const key = (owner: string) => `first-course:leftovers-eaten:${owner}`

/** The cooks whose leftovers the cook said are eaten, kept on this phone, per account. */
export function loadEaten(storage: Storage, owner: string): Set<string> {
  const stored = storage.getItem(key(owner))
  if (stored === null) return new Set()
  const parsed: unknown = JSON.parse(stored)
  if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === 'string')) {
    throw new Error('The leftovers marked eaten on this phone are not a list')
  }
  return new Set(parsed as string[])
}

/**
 * Marks a cook's leftovers eaten. Only marks for cooks still within their
 * days are kept, eaten or not, so the list never grows past a handful.
 */
export function markEaten(storage: Storage, owner: string, cookId: string, logs: readonly CookLog[], today: string): Set<string> {
  const recent = new Set(leftoversOf(logs, today, new Set()).map((left) => left.cook.id))
  const eaten = new Set([...loadEaten(storage, owner), cookId].filter((id) => recent.has(id)))
  storage.setItem(key(owner), JSON.stringify([...eaten]))
  return eaten
}
