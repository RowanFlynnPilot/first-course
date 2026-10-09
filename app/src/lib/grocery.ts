// The grocery list: what this week's plan costs at the register. Whole
// packages, never a share of one (locked decision 6). Derived from the plan,
// the pantry and the prices; nothing here is stored.

import { EQUIPMENT, type EquipmentId } from '../curriculum/equipment'
import { INGREDIENTS, type IngredientId, type Section } from '../curriculum/ingredients'
import { recipeById } from '../curriculum/recipes'
import type { Recipe, Tier } from '../curriculum/types'
import { byFirstCourse, firstTierUsing } from './courses'
import { packagePriceCents, type Prices } from './cost'
import { listOf, packagesOf } from './format'

/** Store order: the list walks the aisles in this order. */
export const SECTIONS: readonly { readonly id: Section; readonly name: string }[] = [
  { id: 'produce', name: 'Produce' },
  { id: 'meat', name: 'Meat' },
  { id: 'dairy', name: 'Dairy and eggs' },
  { id: 'bakery', name: 'Bakery' },
  { id: 'pantry', name: 'Pantry' },
  { id: 'frozen', name: 'Frozen' },
]

export interface GroceryLine {
  readonly ingredientId: IngredientId
  /** What the plan uses in total, in the ingredient's own unit. */
  readonly qty: number
  readonly packages: number
  readonly packagePriceCents: number
  readonly totalCents: number
}

export interface GroceryList {
  readonly sections: readonly { readonly id: Section; readonly name: string; readonly lines: readonly GroceryLine[] }[]
  readonly lines: readonly GroceryLine[]
  readonly totalCents: number
  /** Ingredients the plan uses that the pantry already has, so they are left off, with what the plan uses. */
  readonly inPantry: readonly { readonly ingredientId: IngredientId; readonly qty: number }[]
}

export function groceryList(plan: readonly string[], pantry: ReadonlySet<IngredientId>, prices: Prices): GroceryList {
  const needed = new Map<IngredientId, number>()
  for (const recipeId of plan) {
    for (const { ingredientId, qty } of recipeById(recipeId).content.ingredients) {
      needed.set(ingredientId, (needed.get(ingredientId) ?? 0) + qty)
    }
  }

  const lines: GroceryLine[] = []
  const inPantry: { ingredientId: IngredientId; qty: number }[] = []
  for (const [ingredientId, qty] of needed) {
    if (pantry.has(ingredientId)) {
      inPantry.push({ ingredientId, qty })
      continue
    }
    const packages = Math.ceil(qty / INGREDIENTS[ingredientId].package.units)
    const price = packagePriceCents(ingredientId, prices)
    lines.push({ ingredientId, qty, packages, packagePriceCents: price, totalCents: packages * price })
  }

  const sections = SECTIONS.map(({ id, name }) => ({
    id,
    name,
    lines: lines
      .filter((line) => INGREDIENTS[line.ingredientId].section === id)
      .sort((a, b) => INGREDIENTS[a.ingredientId].name.localeCompare(INGREDIENTS[b.ingredientId].name)),
  })).filter((section) => section.lines.length > 0)

  return {
    sections,
    lines: sections.flatMap((section) => section.lines),
    totalCents: lines.reduce((sum, line) => sum + line.totalCents, 0),
    inPantry,
  }
}

/**
 * What is still to buy, as plain text: for a note on the phone that works
 * with no signal in the store, or for someone else doing the shop.
 */
export function groceryText(
  plan: readonly string[],
  list: GroceryList,
  checks: ReadonlySet<IngredientId>,
  kit: readonly EquipmentId[],
): string {
  const aisles = list.sections.flatMap(({ name, lines }) => {
    const left = lines.filter((line) => !checks.has(line.ingredientId))
    if (left.length === 0) return []
    const items = left.map(({ ingredientId, packages }) => {
      const { name: item, package: bought } = INGREDIENTS[ingredientId]
      return `- ${item}: ${packagesOf(packages, bought.label)}`
    })
    return [[name, ...items].join('\n')]
  })
  // The tools the plan needs and the kit does not have, so the thermometer is not left on the shelf.
  const tools = kit.length === 0 ? [] : [['Kit', ...kit.map((id) => `- ${EQUIPMENT[id].name}`)].join('\n')]
  if (aisles.length + tools.length === 0) throw new Error('Everything on the list is in the cart, so there is nothing to share')
  const recipes = listOf(plan.map((id) => recipeById(id).title))
  return [`Grocery list for ${recipes}`, ...aisles, ...tools].join('\n\n')
}

/** Whether the pantry holds everything a recipe uses (grilled cheese, eggs on toast): no shop needed. */
export function pantryCovers(recipe: Recipe, pantry: ReadonlySet<IngredientId>): boolean {
  return recipe.content.ingredients.every(({ ingredientId }) => pantry.has(ingredientId))
}

/**
 * The recipes on a list that a shop covers: every ingredient checked off or
 * already in the pantry. One with a line left unchecked (the store was out of
 * chicken) is not, so its card never says "Groceries bought" over an empty
 * fridge.
 */
export function boughtFor(
  toShop: readonly string[],
  pantry: ReadonlySet<IngredientId>,
  checks: ReadonlySet<IngredientId>,
): string[] {
  return toShop.filter((id) =>
    recipeById(id).content.ingredients.every(({ ingredientId }) => pantry.has(ingredientId) || checks.has(ingredientId)),
  )
}

/**
 * The pantry's staples, each under the first course whose recipes use it, as
 * the kit is filed, so week one is not a list of curry paste and tamarind.
 * In store order, then by name.
 */
export function staplesByCourse(): { tier: Tier; items: IngredientId[] }[] {
  const order = SECTIONS.map((section) => section.id)
  const staples = (Object.keys(INGREDIENTS) as IngredientId[])
    .filter((id) => INGREDIENTS[id].staple)
    .sort(
      (a, b) =>
        order.indexOf(INGREDIENTS[a].section) - order.indexOf(INGREDIENTS[b].section) ||
        INGREDIENTS[a].name.localeCompare(INGREDIENTS[b].name),
    )
  return byFirstCourse(staples, (id) =>
    firstTierUsing((recipe) => recipe.content.ingredients.some((line) => line.ingredientId === id), `the staple ${id}`),
  )
}
