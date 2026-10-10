// What is in the cart, kept on this phone while the cook shops: groceries
// checked off, and kit checked off in the kit aisle. A store is where signal
// is weakest, so a check never waits on the network: the checks reach
// Supabase together, through the one "Done shopping" call, and wait here
// until it succeeds (Rowan's calls, October 9, 2026). Kept per account, so
// another account signed in on this phone starts with an empty cart.
//
// The cart also keeps which recipes its list was for, so checks made for one
// list never stand for another: a recipe planned on another device does not
// find its chicken already checked off (`settleCart`).

import { EQUIPMENT, type EquipmentId } from '../curriculum/equipment'
import { INGREDIENTS, type IngredientId } from '../curriculum/ingredients'
import { recipeById } from '../curriculum/recipes'
import { groceryList } from './grocery'
import { missingKit } from './kit'
import type { Shop } from './shop'

export interface Cart {
  /** Ingredients checked off on the grocery list. */
  readonly checks: ReadonlySet<IngredientId>
  /** Kit checked off in the list's kit aisle: bought, and going into the kit at Done shopping. */
  readonly kitChecks: ReadonlySet<EquipmentId>
  /** The recipes the list was for when these were checked, by id. */
  readonly checkedFor: readonly string[]
}

export const EMPTY_CART: Cart = { checks: new Set(), kitChecks: new Set(), checkedFor: [] }

// The key names the format: the checks were once a bare list of ingredients.
const key = (owner: string) => `first-course:cart:${owner}`
const oldKey = (owner: string) => `first-course:grocery-checks:${owner}`

function stringsIn(value: unknown, what: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`The ${what} saved on this phone are not a list`)
  }
  return value as string[]
}

export function loadCart(storage: Storage, owner: string): Cart {
  // Checks kept before the cart knew its list cannot say what they were for: they go.
  storage.removeItem(oldKey(owner))
  const stored = storage.getItem(key(owner))
  if (stored === null) return EMPTY_CART
  const parsed = JSON.parse(stored) as { checks?: unknown; kitChecks?: unknown; checkedFor?: unknown } | null
  if (parsed === null || typeof parsed !== 'object') throw new Error('The cart saved on this phone is malformed')
  return {
    checks: new Set(
      stringsIn(parsed.checks, 'grocery checks').map((id) => {
        if (!Object.hasOwn(INGREDIENTS, id)) throw new Error(`Your grocery list has an ingredient the menu no longer has: ${id}`)
        return id as IngredientId
      }),
    ),
    kitChecks: new Set(
      stringsIn(parsed.kitChecks, 'kit checks').map((id) => {
        if (!Object.hasOwn(EQUIPMENT, id)) throw new Error(`Your grocery list has kit the menu no longer has: ${id}`)
        return id as EquipmentId
      }),
    ),
    checkedFor: stringsIn(parsed.checkedFor, 'recipes of the cart').map((id) => recipeById(id).id),
  }
}

/**
 * The cart as it stands for the list now. A grocery check stays only on a
 * line still listed, and none stays on a line that a recipe new to the list
 * uses: it may need more than the cart holds, or the check was made for a
 * list without it (a recipe planned on another device). A kit check stays
 * only while the plan still needs that kit. Applied to every load and every
 * change of the shop (App.tsx), so checks never outlive their list.
 */
export function settleCart(shop: Shop): Shop {
  // The list is for the planned recipes not yet bought (toShopFor in shop.ts).
  const listFor = shop.plan.filter((id) => !shop.shopped.has(id))
  const added = listFor.filter((id) => !shop.checkedFor.includes(id))
  const touched = new Set(added.flatMap((id) => recipeById(id).content.ingredients.map((line) => line.ingredientId)))
  const listed = new Set(groceryList(listFor, shop.pantry, shop.prices).lines.map((line) => line.ingredientId))
  const needed = new Set(missingKit(shop.plan.map(recipeById), shop.kit))
  return {
    ...shop,
    checks: new Set([...shop.checks].filter((id) => listed.has(id) && !touched.has(id))),
    kitChecks: new Set([...shop.kitChecks].filter((id) => needed.has(id))),
    checkedFor: listFor,
  }
}

export function saveCart(storage: Storage, owner: string, cart: Cart) {
  if (cart.checks.size + cart.kitChecks.size === 0) storage.removeItem(key(owner))
  else
    storage.setItem(
      key(owner),
      JSON.stringify({ checks: [...cart.checks], kitChecks: [...cart.kitChecks], checkedFor: cart.checkedFor }),
    )
}
