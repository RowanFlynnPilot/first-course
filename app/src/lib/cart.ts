// What is in the cart, kept on this phone while the cook shops: groceries
// checked off, and kit checked off in the kit aisle. A store is where signal
// is weakest, so a check never waits on the network: the checks reach
// Supabase together, through the one "Done shopping" call, and wait here
// until it succeeds (Rowan's calls, October 9, 2026). Kept per account, so
// another account signed in on this phone starts with an empty cart.
//
// The cart also keeps which recipes its list was for, so checks made for one
// list never stand for another (a recipe planned on another device does not
// find its chicken already checked off), and when the first grocery in it
// that is not a staple was checked: the day its meat was bought, which Done
// shopping dates the shop by, however late it is tapped. It keeps until Done
// shopping, or "Clear the cart" (Rowan's call, October 10, 2026).

import { EQUIPMENT, type EquipmentId } from '../curriculum/equipment'
import { INGREDIENTS, type IngredientId } from '../curriculum/ingredients'
import { recipeById } from '../curriculum/recipes'
import { localDateString } from './format'
import { groceryList, toShopFor } from './grocery'
import { hasKit } from './kit'
import type { Shop } from './shop'

export interface Cart {
  /** Ingredients checked off on the grocery list. */
  readonly checks: ReadonlySet<IngredientId>
  /** Kit checked off in the list's kit aisle: bought, and going into the kit at Done shopping. */
  readonly kitChecks: ReadonlySet<EquipmentId>
  /** The recipes the list was for when these were checked, by id. */
  readonly checkedFor: readonly string[]
  /**
   * When the first grocery in the cart that is not a staple was checked off,
   * in milliseconds, or null with none: the day the meat in it was bought.
   */
  readonly since: number | null
}

export const EMPTY_CART: Cart = { checks: new Set(), kitChecks: new Set(), checkedFor: [], since: null }

const key = (owner: string) => `first-course:cart:${owner}`

function stringsIn(value: unknown, what: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`The ${what} saved on this phone are not a list`)
  }
  return value as string[]
}

export function loadCart(storage: Storage, owner: string): Cart {
  const stored = storage.getItem(key(owner))
  if (stored === null) return EMPTY_CART
  const parsed = JSON.parse(stored) as { checks?: unknown; kitChecks?: unknown; checkedFor?: unknown; since?: unknown } | null
  if (parsed === null || typeof parsed !== 'object') throw new Error('The cart saved on this phone is malformed')
  // A cart kept before it knew when its groceries were bought (October 9, 2026) cannot date them: it goes.
  if (!('since' in parsed)) {
    storage.removeItem(key(owner))
    return EMPTY_CART
  }
  const { since } = parsed
  if (since !== null && typeof since !== 'number') throw new Error('The cart saved on this phone is malformed')
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
    since,
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
  const listFor = toShopFor(shop)
  const added = listFor.filter((id) => !shop.checkedFor.includes(id))
  const touched = new Set(added.flatMap((id) => recipeById(id).content.ingredients.map((line) => line.ingredientId)))
  const listed = new Set(groceryList(listFor, shop.pantry, shop.prices).lines.map((line) => line.ingredientId))
  const stays = (id: IngredientId) =>
    !shop.pantry.has(id) && (INGREDIENTS[id].staple || (listed.has(id) && !touched.has(id)))
  const checks = [...shop.checks].filter(stays)
  return {
    ...shop,
    checks: new Set(checks),
    kitChecks: new Set([...shop.kitChecks].filter((id) => !hasKit(id, shop.kit))),
    checkedFor: listFor,
    // The clock stops when the last grocery that dates the shop is gone (Done shopping took it).
    since: checks.some((id) => !INGREDIENTS[id].staple) ? shop.since : null,
  }
}

/**
 * The day the groceries in the cart were bought, YYYY-MM-DD: the day the
 * first of them that is not a staple was checked off (`since`), or today.
 * Meat keeps from that day, not from the day Done shopping was tapped.
 */
export function boughtDay(cart: Cart, today: string): string {
  return cart.since === null ? today : localDateString(new Date(cart.since))
}

export function saveCart(storage: Storage, owner: string, cart: Cart) {
  if (cart.checks.size + cart.kitChecks.size === 0) storage.removeItem(key(owner))
  else
    storage.setItem(
      key(owner),
      JSON.stringify({ checks: [...cart.checks], kitChecks: [...cart.kitChecks], checkedFor: cart.checkedFor, since: cart.since }),
    )
}
