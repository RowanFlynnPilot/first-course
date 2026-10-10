// What a recipe contains of the major food allergens, worked out from its
// ingredients (`allergens` in ingredients.ts), like everything else the app
// says about a recipe. The recipe page says it under the ingredients.

import { INGREDIENTS, type Allergen } from '../curriculum/ingredients'
import type { RecipeContent } from '../curriculum/types'
import { listOf } from './format'

/** Each allergen as a sentence says it, in the order the FDA lists them. */
const NAMES: Readonly<Record<Allergen, string>> = {
  milk: 'milk',
  egg: 'egg',
  fish: 'fish',
  shellfish: 'shellfish',
  'tree-nut': 'tree nuts',
  peanut: 'peanuts',
  wheat: 'wheat',
  soy: 'soy',
  sesame: 'sesame',
}

/** The major allergens any ingredient of a recipe contains, in the FDA's order. */
export function allergensOf(content: RecipeContent): Allergen[] {
  const found = new Set<Allergen>(content.ingredients.flatMap(({ ingredientId }) => INGREDIENTS[ingredientId].allergens))
  return (Object.keys(NAMES) as Allergen[]).filter((allergen) => found.has(allergen))
}

/** "Contains milk, egg, and wheat.", or null when it contains none of them. */
export function containsLine(content: RecipeContent): string | null {
  const allergens = allergensOf(content)
  return allergens.length === 0 ? null : `Contains ${listOf(allergens.map((allergen) => NAMES[allergen]))}.`
}
