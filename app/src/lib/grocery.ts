// The grocery list: what this week's plan costs at the register. Whole
// packages, never a share of one (locked decision 6). Derived from the plan,
// the pantry and the prices; nothing here is stored.

import { INGREDIENTS, type IngredientId, type Section } from '../curriculum/ingredients'
import { recipeById } from '../curriculum/recipes'
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
  /** Ingredients the plan uses that the pantry already has, so they are left off. */
  readonly inPantry: readonly IngredientId[]
}

export function groceryList(plan: readonly string[], pantry: ReadonlySet<IngredientId>, prices: Prices): GroceryList {
  const needed = new Map<IngredientId, number>()
  for (const recipeId of plan) {
    for (const { ingredientId, qty } of recipeById(recipeId).content.ingredients) {
      needed.set(ingredientId, (needed.get(ingredientId) ?? 0) + qty)
    }
  }

  const lines: GroceryLine[] = []
  const inPantry: IngredientId[] = []
  for (const [ingredientId, qty] of needed) {
    if (pantry.has(ingredientId)) {
      inPantry.push(ingredientId)
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
export function groceryText(plan: readonly string[], list: GroceryList, checks: ReadonlySet<IngredientId>): string {
  const aisles = list.sections.flatMap(({ name, lines }) => {
    const left = lines.filter((line) => !checks.has(line.ingredientId))
    if (left.length === 0) return []
    const items = left.map(({ ingredientId, packages }) => {
      const { name: item, package: bought } = INGREDIENTS[ingredientId]
      return `- ${item}: ${packagesOf(packages, bought.label)}`
    })
    return [[name, ...items].join('\n')]
  })
  if (aisles.length === 0) throw new Error('Everything on the list is in the cart, so there is nothing to share')
  const recipes = listOf(plan.map((id) => recipeById(id).title))
  return [`Grocery list for ${recipes}`, ...aisles].join('\n\n')
}
