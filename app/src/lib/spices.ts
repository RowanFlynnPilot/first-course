// The spice shelf: each spice in the guide, filed under the first course whose
// recipes use it, with the recipe that uses it first. Derived from the
// recipes, like the kit, so it can never disagree with them.

import { RECIPES } from '../curriculum/recipes'
import { SPICES, type SpiceId } from '../curriculum/spices'
import type { Recipe, Tier } from '../curriculum/types'

export interface ShelfSpice {
  readonly id: SpiceId
  /** The first recipe on the menu that uses it. */
  readonly firstIn: Recipe
}

export function spiceShelf(): { tier: Tier; spices: ShelfSpice[] }[] {
  const shelf = (Object.keys(SPICES) as SpiceId[]).map((id) => {
    const firstIn = RECIPES.find((recipe) => recipe.content.ingredients.some((line) => line.ingredientId === id))
    if (firstIn === undefined) throw new Error(`The spice guide lists ${id}, but no recipe uses it`)
    return { id, firstIn }
  })
  const tiers: Tier[] = [1, 2, 3, 4, 5]
  return tiers
    .map((tier) => ({
      tier,
      spices: shelf
        .filter((spice) => spice.firstIn.tier === tier)
        .sort((a, b) => RECIPES.indexOf(a.firstIn) - RECIPES.indexOf(b.firstIn)),
    }))
    .filter((course) => course.spices.length > 0)
}
