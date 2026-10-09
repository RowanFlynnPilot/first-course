// What a cook needs to own, and what they still need. Derived from the
// recipes' equipment and the kit the cook has marked; nothing here is stored.

import { EQUIPMENT, type EquipmentId } from '../curriculum/equipment'
import { RECIPES } from '../curriculum/recipes'
import type { Recipe, Tier } from '../curriculum/types'
import { byFirstCourse, firstTierUsing } from './courses'

const ORDER = Object.keys(EQUIPMENT) as EquipmentId[]

/** Owning the item, or something that does its job (a cast-iron skillet is a 12-inch skillet). */
export function hasKit(id: EquipmentId, kit: ReadonlySet<EquipmentId>): boolean {
  return kit.has(id) || EQUIPMENT[id].coveredBy.some((other) => kit.has(other))
}

/** Everything these recipes use, in the kit screen's order. */
export function kitFor(recipes: readonly Recipe[]): EquipmentId[] {
  const used = new Set(recipes.flatMap((recipe) => recipe.content.equipment))
  return ORDER.filter((id) => used.has(id))
}

/** What these recipes use that the cook does not have yet. */
export function missingKit(recipes: readonly Recipe[], kit: ReadonlySet<EquipmentId>): EquipmentId[] {
  return kitFor(recipes).filter((id) => !hasKit(id, kit))
}

/** Each piece of equipment under the first course whose written recipes use it. */
export function kitByCourse(): { tier: Tier; items: EquipmentId[] }[] {
  return byFirstCourse(kitFor(RECIPES), (id) => firstTierUsing((recipe) => recipe.content.equipment.includes(id), id))
}
