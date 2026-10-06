// The shop and the kit: this week's plan, the pantry, grocery checks, price
// corrections and the equipment a cook owns. The only Supabase reads and
// writes for them; rows become app data here and nowhere else.

import { EQUIPMENT, type EquipmentId } from '../curriculum/equipment'
import { INGREDIENTS, type IngredientId } from '../curriculum/ingredients'
import { recipeById } from '../curriculum/recipes'
import { supabase } from '../supabase'
import type { Prices } from './cost'
import { groceryList } from './grocery'

export interface Shop {
  /** Recipe ids on this week's plan, in the order they were added. A recipe leaves it when it is cooked. */
  readonly plan: readonly string[]
  /** Planned recipes whose groceries are bought ("Done shopping"), so they are off the grocery list. */
  readonly shopped: ReadonlySet<string>
  readonly pantry: ReadonlySet<IngredientId>
  /** Ingredients already in the cart. */
  readonly checks: ReadonlySet<IngredientId>
  readonly prices: Prices
  readonly kit: ReadonlySet<EquipmentId>
}

/** How a screen changes the shop after a write succeeds. */
export type ShopChange = (change: (shop: Shop) => Shop) => void

/** Planned recipes whose groceries are still to buy: the grocery list covers only these. */
export function toShopFor(shop: Shop): string[] {
  return shop.plan.filter((id) => !shop.shopped.has(id))
}

/** The shop with a recipe off the plan: taken off, or cooked (the database does that itself, 00006). */
export function withoutPlanned(shop: Shop, recipeId: string): Shop {
  const shopped = new Set(shop.shopped)
  shopped.delete(recipeId)
  return { ...shop, plan: shop.plan.filter((id) => id !== recipeId), shopped }
}

function toIngredientId(value: string, where: string): IngredientId {
  if (!Object.hasOwn(INGREDIENTS, value)) throw new Error(`${where} has an ingredient the menu no longer has: ${value}`)
  return value as IngredientId
}

function toEquipmentId(value: string): EquipmentId {
  if (!Object.hasOwn(EQUIPMENT, value)) throw new Error(`Your kit has equipment the menu no longer has: ${value}`)
  return value as EquipmentId
}

async function load<Row>(table: string, columns: string, what: string, orderBy?: string): Promise<Row[]> {
  const query = supabase.from(table).select(columns)
  const { data, error } = await (orderBy === undefined ? query : query.order(orderBy))
  if (error) throw new Error(`Could not load ${what}: ${error.message}`)
  return data as Row[]
}

export async function fetchShop(): Promise<Shop> {
  const [plan, pantry, checks, prices, kit] = await Promise.all([
    load<{ recipe_id: string; shopped: boolean }>('plan_items', 'recipe_id, shopped', 'this week’s plan', 'added_at'),
    load<{ ingredient_id: string }>('pantry_items', 'ingredient_id', 'your pantry'),
    load<{ ingredient_id: string }>('grocery_checks', 'ingredient_id', 'your grocery list'),
    load<{ ingredient_id: string; price_cents: number }>('price_overrides', 'ingredient_id, price_cents', 'your prices'),
    load<{ equipment_id: string }>('kit_items', 'equipment_id', 'your kit'),
  ])
  return {
    plan: plan.map((row) => recipeById(row.recipe_id).id),
    shopped: new Set(plan.filter((row) => row.shopped).map((row) => row.recipe_id)),
    pantry: new Set(pantry.map((row) => toIngredientId(row.ingredient_id, 'Your pantry'))),
    checks: new Set(checks.map((row) => toIngredientId(row.ingredient_id, 'Your grocery list'))),
    prices: new Map(prices.map((row) => [toIngredientId(row.ingredient_id, 'Your prices'), row.price_cents])),
    kit: new Set(kit.map((row) => toEquipmentId(row.equipment_id))),
  }
}

// ── Writes. Each one either succeeds or throws a message that says what failed. ──

// Adding ignores a row that is already there, so a double tap is harmless.
async function add(table: string, row: Record<string, string>, what: string) {
  const { error } = await supabase.from(table).upsert(row, { ignoreDuplicates: true })
  if (error) throw new Error(`Could not ${what}: ${error.message}`)
}

async function remove(table: string, column: string, value: string, what: string) {
  const { error } = await supabase.from(table).delete().eq(column, value)
  if (error) throw new Error(`Could not ${what}: ${error.message}`)
}

/** Adds a recipe to this week, and says whether it was already there and shopped for (on another device). */
async function addToPlan(recipeId: string): Promise<{ shopped: boolean }> {
  await add('plan_items', { recipe_id: recipeId }, 'add it to this week')
  const { data, error } = await supabase.from('plan_items').select('shopped').eq('recipe_id', recipeId).single()
  if (error) throw new Error(`Could not add it to this week: ${error.message}`)
  return { shopped: (data as { shopped: boolean }).shopped }
}
export const removeFromPlan = (recipeId: string) =>
  remove('plan_items', 'recipe_id', recipeId, 'take it off this week')

export const stockPantry = (id: IngredientId) => add('pantry_items', { ingredient_id: id }, 'add it to your pantry')
export const clearFromPantry = (id: IngredientId) =>
  remove('pantry_items', 'ingredient_id', id, 'take it out of your pantry')

export const checkOff = (id: IngredientId) => add('grocery_checks', { ingredient_id: id }, 'check it off')
export const uncheck = (id: IngredientId) => remove('grocery_checks', 'ingredient_id', id, 'uncheck it')

/**
 * Clears ticks the current list no longer shows: left from a shop that never
 * got "Done shopping", for recipes since cooked or taken off. Called before
 * the list grows, so a new list never opens with things ticked that were
 * never bought for it. Returns the ticks it cleared.
 */
async function clearStaleChecks(shop: Shop): Promise<IngredientId[]> {
  const listed = new Set(groceryList(toShopFor(shop), shop.pantry, shop.prices).lines.map((line) => line.ingredientId))
  const stale = [...shop.checks].filter((id) => !listed.has(id))
  if (stale.length === 0) return stale
  const { error } = await supabase.from('grocery_checks').delete().in('ingredient_id', stale)
  if (error) throw new Error(`Could not clear old ticks from the list: ${error.message}`)
  return stale
}

/** The shop without these ticks, applied to the latest shop so a tick saved meanwhile survives. */
function withoutChecks(shop: Shop, ids: readonly IngredientId[]): Shop {
  return { ...shop, checks: new Set([...shop.checks].filter((id) => !ids.includes(id))) }
}

/**
 * "Add to this week", from any screen: old ticks go first, then the recipe,
 * as the database has it (already there and shopped for, if another device
 * did that).
 */
export async function planRecipe(shop: Shop, recipeId: string, onShopChange: ShopChange) {
  const stale = await clearStaleChecks(shop)
  onShopChange((previous) => withoutChecks(previous, stale))
  const { shopped } = await addToPlan(recipeId)
  onShopChange((previous) => ({
    ...previous,
    plan: previous.plan.includes(recipeId) ? previous.plan : [...previous.plan, recipeId],
    shopped: shopped ? new Set([...previous.shopped, recipeId]) : previous.shopped,
  }))
}

/**
 * A recipe already shopped for goes back on the grocery list: the groceries
 * were not bought, or went off. Old ticks go first, as when adding.
 */
export async function shopForAgain(shop: Shop, recipeId: string, onShopChange: ShopChange) {
  const stale = await clearStaleChecks(shop)
  onShopChange((previous) => withoutChecks(previous, stale))
  const { data, error } = await supabase.from('plan_items').update({ shopped: false }).eq('recipe_id', recipeId).select('recipe_id')
  if (error) throw new Error(`Could not put it back on the list: ${error.message}`)
  if (data.length !== 1) throw new Error('It is not on this week’s plan any more: it was cooked or taken off on another device.')
  onShopChange((previous) => {
    const shopped = new Set(previous.shopped)
    shopped.delete(recipeId)
    return { ...previous, shopped }
  })
}

export const addToKit = (id: EquipmentId) => add('kit_items', { equipment_id: id }, 'add it to your kit')

/** Several at once, in one request: "I have all of these". */
export async function addAllToKit(ids: readonly EquipmentId[]) {
  const rows = ids.map((id) => ({ equipment_id: id }))
  const { error } = await supabase.from('kit_items').upsert(rows, { ignoreDuplicates: true })
  if (error) throw new Error(`Could not add them to your kit: ${error.message}`)
}
export const removeFromKit = (id: EquipmentId) => remove('kit_items', 'equipment_id', id, 'take it out of your kit')

/** The package price the cook paid, in place of the estimate in ingredients.ts. */
export async function setPrice(id: IngredientId, priceCents: number) {
  if (!Number.isInteger(priceCents) || priceCents <= 0) throw new Error(`A price must be above zero, not ${priceCents}`)
  const { error } = await supabase.from('price_overrides').upsert({ ingredient_id: id, price_cents: priceCents })
  if (error) throw new Error(`Could not save the price: ${error.message}`)
}

export const resetPrice = (id: IngredientId) =>
  remove('price_overrides', 'ingredient_id', id, 'go back to the estimate')

/**
 * "Done shopping": bought staples go into the pantry, the ticks this list
 * showed are cleared, and the recipes it covered are marked shopped. One
 * transaction (00007). Only what this device saw changes, so a recipe or a
 * tick added on another device meanwhile is left alone.
 */
export async function finishShopping(done: {
  boughtStaples: readonly IngredientId[]
  shoppedRecipes: readonly string[]
  seenChecks: readonly IngredientId[]
}) {
  const { error } = await supabase.rpc('finish_shopping', {
    bought_staples: done.boughtStaples,
    shopped_recipes: done.shoppedRecipes,
    seen_checks: done.seenChecks,
  })
  if (error) throw new Error(`Could not finish shopping: ${error.message}`)
}
