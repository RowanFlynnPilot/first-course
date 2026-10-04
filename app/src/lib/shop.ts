// The shop and the kit: this week's plan, the pantry, grocery checks, price
// corrections and the equipment a cook owns. The only Supabase reads and
// writes for them; rows become app data here and nowhere else.

import { EQUIPMENT, type EquipmentId } from '../curriculum/equipment'
import { INGREDIENTS, type IngredientId } from '../curriculum/ingredients'
import { recipeById } from '../curriculum/recipes'
import { supabase } from '../supabase'
import type { Prices } from './cost'

export interface Shop {
  /** Recipe ids on this week's plan, in the order they were added. */
  readonly plan: readonly string[]
  readonly pantry: ReadonlySet<IngredientId>
  /** Ingredients already in the cart. */
  readonly checks: ReadonlySet<IngredientId>
  readonly prices: Prices
  readonly kit: ReadonlySet<EquipmentId>
}

/** How a screen changes the shop after a write succeeds. */
export type ShopChange = (change: (shop: Shop) => Shop) => void

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
    load<{ recipe_id: string }>('plan_items', 'recipe_id', 'this week’s plan', 'added_at'),
    load<{ ingredient_id: string }>('pantry_items', 'ingredient_id', 'your pantry'),
    load<{ ingredient_id: string }>('grocery_checks', 'ingredient_id', 'your grocery list'),
    load<{ ingredient_id: string; price_cents: number }>('price_overrides', 'ingredient_id, price_cents', 'your prices'),
    load<{ equipment_id: string }>('kit_items', 'equipment_id', 'your kit'),
  ])
  return {
    plan: plan.map((row) => recipeById(row.recipe_id).id),
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

export const addToPlan = (recipeId: string) => add('plan_items', { recipe_id: recipeId }, 'add it to this week')
export const removeFromPlan = (recipeId: string) =>
  remove('plan_items', 'recipe_id', recipeId, 'take it off this week')

export const stockPantry = (id: IngredientId) => add('pantry_items', { ingredient_id: id }, 'add it to your pantry')
export const clearFromPantry = (id: IngredientId) =>
  remove('pantry_items', 'ingredient_id', id, 'take it out of your pantry')

export const checkOff = (id: IngredientId) => add('grocery_checks', { ingredient_id: id }, 'check it off')
export const uncheck = (id: IngredientId) => remove('grocery_checks', 'ingredient_id', id, 'uncheck it')

export const addToKit = (id: EquipmentId) => add('kit_items', { equipment_id: id }, 'add it to your kit')
export const removeFromKit = (id: EquipmentId) => remove('kit_items', 'equipment_id', id, 'take it out of your kit')

/** The package price the cook paid, in place of the estimate in ingredients.ts. */
export async function setPrice(id: IngredientId, priceCents: number) {
  if (!Number.isInteger(priceCents) || priceCents <= 0) throw new Error(`A price must be above zero, not ${priceCents}`)
  const { error } = await supabase.from('price_overrides').upsert({ ingredient_id: id, price_cents: priceCents })
  if (error) throw new Error(`Could not save the price: ${error.message}`)
}

export const resetPrice = (id: IngredientId) =>
  remove('price_overrides', 'ingredient_id', id, 'go back to the estimate')

/** "Done shopping": bought staples go into the pantry, then the checks and the plan are cleared. One transaction. */
export async function finishShopping(boughtStaples: readonly IngredientId[]) {
  const { error } = await supabase.rpc('finish_shopping', { bought_staples: boughtStaples })
  if (error) throw new Error(`Could not finish shopping: ${error.message}`)
}
