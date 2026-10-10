// What is in the cart, kept on this phone while the cook shops: groceries
// checked off, and kit checked off in the kit aisle. A store is where signal
// is weakest, so a check never waits on the network: the checks reach
// Supabase together, through the one "Done shopping" call, and wait here
// until it succeeds (Rowan's calls, October 9, 2026). Kept per account, so
// another account signed in on this phone starts with an empty cart.
//
// The cart also keeps which recipes its list was for, so checks made for one
// list never stand for another (a recipe planned on another device does not
// find its chicken already checked off), and when it last changed: a cart
// left two days no longer says what is in it.

import { EQUIPMENT, type EquipmentId } from '../curriculum/equipment'
import { INGREDIENTS, type IngredientId } from '../curriculum/ingredients'
import { recipeById } from '../curriculum/recipes'
import { groceryList } from './grocery'
import { hasKit } from './kit'
import type { Shop } from './shop'

export interface Cart {
  /** Ingredients checked off on the grocery list. */
  readonly checks: ReadonlySet<IngredientId>
  /** Kit checked off in the list's kit aisle: bought, and going into the kit at Done shopping. */
  readonly kitChecks: ReadonlySet<EquipmentId>
  /** The recipes the list was for when these were checked, by id. */
  readonly checkedFor: readonly string[]
  /** When a check last changed, in milliseconds. */
  readonly at: number
}

/** A cart nobody has checked anything in for this long is forgotten: a shop, and the next day to finish it. */
export const CART_KEEPS_MS = 2 * 24 * 60 * 60 * 1000

export const EMPTY_CART: Cart = { checks: new Set(), kitChecks: new Set(), checkedFor: [], at: 0 }

// The key names the format: the checks were once a bare list of ingredients.
const key = (owner: string) => `first-course:cart:${owner}`
const oldKey = (owner: string) => `first-course:grocery-checks:${owner}`

function stringsIn(value: unknown, what: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`The ${what} saved on this phone are not a list`)
  }
  return value as string[]
}

export function loadCart(storage: Storage, owner: string, now: number): Cart {
  // Checks kept before the cart knew its list cannot say what they were for: they go.
  storage.removeItem(oldKey(owner))
  const stored = storage.getItem(key(owner))
  if (stored === null) return EMPTY_CART
  const parsed = JSON.parse(stored) as { checks?: unknown; kitChecks?: unknown; checkedFor?: unknown; at?: unknown } | null
  if (parsed === null || typeof parsed !== 'object') throw new Error('The cart saved on this phone is malformed')
  // A cart saved before it kept a time (October 9, 2026) counts as checked just now.
  const at = parsed.at === undefined ? now : parsed.at
  if (typeof at !== 'number') throw new Error('The cart saved on this phone is malformed')
  if (now - at > CART_KEEPS_MS) {
    storage.removeItem(key(owner))
    return EMPTY_CART
  }
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
    at,
  }
}

/**
 * The cart as it stands for the list now. What it holds stays bought: a
 * checked staple stays until Done shopping puts it in the pantry, and checked
 * kit until it goes in the kit, even if the recipe it was for was cooked or
 * taken off meanwhile. A check on anything else stays only while its line is
 * listed and no recipe new to the list uses it: it may need more than the
 * cart holds, or the check was made for a list without it (a recipe planned
 * on another device). Applied to every load and every change of the shop
 * (App.tsx), so checks never outlive their list.
 */
export function settleCart(shop: Shop): Shop {
  // The list is for the planned recipes not yet bought (toShopFor in shop.ts).
  const listFor = shop.plan.filter((id) => !shop.shopped.has(id))
  const added = listFor.filter((id) => !shop.checkedFor.includes(id))
  const touched = new Set(added.flatMap((id) => recipeById(id).content.ingredients.map((line) => line.ingredientId)))
  const listed = new Set(groceryList(listFor, shop.pantry, shop.prices).lines.map((line) => line.ingredientId))
  const stays = (id: IngredientId) =>
    !shop.pantry.has(id) && (INGREDIENTS[id].staple || (listed.has(id) && !touched.has(id)))
  return {
    ...shop,
    checks: new Set([...shop.checks].filter(stays)),
    kitChecks: new Set([...shop.kitChecks].filter((id) => !hasKit(id, shop.kit))),
    checkedFor: listFor,
  }
}

export function saveCart(storage: Storage, owner: string, cart: Cart) {
  if (cart.checks.size + cart.kitChecks.size === 0) storage.removeItem(key(owner))
  else
    storage.setItem(
      key(owner),
      JSON.stringify({ checks: [...cart.checks], kitChecks: [...cart.kitChecks], checkedFor: cart.checkedFor, at: cart.at }),
    )
}
