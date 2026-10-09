// The shop and the kit: this week's plan, the pantry, grocery checks, price
// corrections and the equipment a cook owns. The only Supabase reads and
// writes for them; rows become app data here and nowhere else. The checks
// (what is in the cart) live on the phone until Done shopping (lib/checks.ts).

import { EQUIPMENT, type EquipmentId } from '../curriculum/equipment'
import { INGREDIENTS, type IngredientId } from '../curriculum/ingredients'
import { recipeById } from '../curriculum/recipes'
import type { Recipe } from '../curriculum/types'
import type { Database } from '../database.types'
import { db } from '../supabase'
import { plainMessage } from './errors'
import type { Prices } from './cost'
import { boughtFor, groceryList, pantryCovers } from './grocery'

export interface Shop {
  /** Recipe ids on this week's plan, in the order they were added. A recipe leaves it when it is cooked. */
  readonly plan: readonly string[]
  /** Planned recipes whose groceries are bought ("Done shopping"), so they are off the grocery list. */
  readonly shopped: ReadonlySet<string>
  /** The cook's local date each was bought, YYYY-MM-DD (00009); none for one bought before the date was kept. */
  readonly shoppedOn: ReadonlyMap<string, string>
  readonly pantry: ReadonlySet<IngredientId>
  /** Ingredients already in the cart, kept on this phone (lib/checks.ts). */
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

/** Whether a recipe can be cooked tonight with no shop first (lib/grocery.ts). */
export function readyTonight(recipe: Recipe, shop: Shop): boolean {
  return shop.shopped.has(recipe.id) || pantryCovers(recipe, shop.pantry)
}

/** The shop with a recipe off the plan: taken off, or cooked (the database does that itself, 00006). */
export function withoutPlanned(shop: Shop, recipeId: string): Shop {
  const shopped = new Set(shop.shopped)
  shopped.delete(recipeId)
  const shoppedOn = new Map(shop.shoppedOn)
  shoppedOn.delete(recipeId)
  return { ...shop, plan: shop.plan.filter((id) => id !== recipeId), shopped, shoppedOn }
}

function toIngredientId(value: string, where: string): IngredientId {
  if (!Object.hasOwn(INGREDIENTS, value)) throw new Error(`${where} has an ingredient the menu no longer has: ${value}`)
  return value as IngredientId
}

function toEquipmentId(value: string): EquipmentId {
  if (!Object.hasOwn(EQUIPMENT, value)) throw new Error(`Your kit has equipment the menu no longer has: ${value}`)
  return value as EquipmentId
}

/** A read's rows, or what failed. */
function rows<Row>({ data, error }: { data: Row[] | null; error: { message: string; code?: string } | null }, what: string): Row[] {
  if (error) throw new Error(`Could not load ${what}: ${plainMessage(error)}`)
  if (data === null) throw new Error(`Could not load ${what}: nothing came back`)
  return data
}

/** A row of this week's plan as Supabase has it (database.types.ts). */
type PlanRow = Pick<Database['public']['Tables']['plan_items']['Row'], 'recipe_id' | 'shopped' | 'shopped_on'>

function checkPlanRow(row: PlanRow) {
  if (typeof row.shopped !== 'boolean') throw new Error(`This week’s plan has no shopped mark for ${row.recipe_id}`)
  if (row.shopped_on !== null && !/^\d{4}-\d{2}-\d{2}$/.test(row.shopped_on)) {
    throw new Error(`This week’s plan has a bought date that is not a date for ${row.recipe_id}: ${row.shopped_on}`)
  }
}

/**
 * The bought date of each shopped recipe. The app before 00009 marked a
 * recipe shopped without a date and cleared the mark without clearing a
 * date, so a date counts only on a row that is shopped.
 */
function boughtOn(rows: readonly PlanRow[]): Map<string, string> {
  return new Map(rows.flatMap((row) => (row.shopped && row.shopped_on !== null ? [[row.recipe_id, row.shopped_on] as const] : [])))
}

/** The shop as Supabase has it, with the cart's checks from this phone. */
export async function fetchShop(checks: ReadonlySet<IngredientId>): Promise<Shop> {
  const [planRead, pantryRead, pricesRead, kitRead] = await Promise.all([
    db.from('plan_items').select('recipe_id, shopped, shopped_on').order('added_at'),
    db.from('pantry_items').select('ingredient_id'),
    db.from('price_overrides').select('ingredient_id, price_cents'),
    db.from('kit_items').select('equipment_id'),
  ])
  const plan = rows(planRead, 'this week’s plan')
  const pantry = rows(pantryRead, 'your pantry')
  const prices = rows(pricesRead, 'your prices')
  const kit = rows(kitRead, 'your kit')
  for (const row of plan) checkPlanRow(row)
  for (const row of prices) {
    if (!Number.isInteger(row.price_cents) || row.price_cents <= 0) {
      throw new Error(`Your price for ${row.ingredient_id} is not a price: ${row.price_cents}`)
    }
  }
  return {
    plan: plan.map((row) => recipeById(row.recipe_id).id),
    shopped: new Set(plan.filter((row) => row.shopped).map((row) => row.recipe_id)),
    shoppedOn: boughtOn(plan),
    pantry: new Set(pantry.map((row) => toIngredientId(row.ingredient_id, 'Your pantry'))),
    checks,
    prices: new Map(prices.map((row) => [toIngredientId(row.ingredient_id, 'Your prices'), row.price_cents])),
    kit: new Set(kit.map((row) => toEquipmentId(row.equipment_id))),
  }
}

// ── Writes. Each one either succeeds and then changes the shop on screen, or
// throws a message that says what failed and changes nothing. A change is
// applied to the latest shop, so another write that finished meanwhile
// survives it.

/** Waits for a write and throws what failed. Each caller builds its own query, so its row is checked against its table. */
async function written(write: PromiseLike<{ error: { message: string; code?: string } | null }>, what: string) {
  const { error } = await write
  if (error) throw new Error(`Could not ${what}: ${plainMessage(error)}`)
}

function toggled<T>(set: ReadonlySet<T>, item: T, on: boolean): Set<T> {
  const next = new Set(set)
  if (on) next.add(item)
  else next.delete(item)
  return next
}

/**
 * Adds a recipe to this week, and says how the plan has it: already there
 * and shopped for (on another device), and when. One trip when the recipe is
 * new to the plan, the usual case: the insert answers with the row. A second
 * read only when the row was already there, which the insert leaves alone.
 */
async function addToPlan(recipeId: string): Promise<PlanRow> {
  const columns = 'recipe_id, shopped, shopped_on'
  const { data, error } = await db.from('plan_items').upsert({ recipe_id: recipeId }, { ignoreDuplicates: true }).select(columns)
  if (error) throw new Error(`Could not add it to this week: ${plainMessage(error)}`)
  const added = data[0]
  if (added !== undefined) {
    checkPlanRow(added)
    return added
  }
  const { data: there, error: readError } = await db.from('plan_items').select(columns).eq('recipe_id', recipeId).single()
  if (readError) throw new Error(`Could not add it to this week: ${plainMessage(readError)}`)
  checkPlanRow(there)
  return there
}

/** "Take off": the recipe leaves this week's plan, bought or not. */
export async function takeOffPlan(recipeId: string, onShopChange: ShopChange) {
  await written(db.from('plan_items').delete().eq('recipe_id', recipeId), 'take it off this week')
  onShopChange((previous) => withoutPlanned(previous, recipeId))
}

/** A staple at home (the pantry), or not: "Have it" and "Put it on the list" on This week, and the pantry's ticks. */
export async function setInPantry(id: IngredientId, have: boolean, onShopChange: ShopChange) {
  // Adding ignores a row that is already there, so a double tap is harmless.
  await (have
    ? written(db.from('pantry_items').upsert({ ingredient_id: id }, { ignoreDuplicates: true }), 'add it to your pantry')
    : written(db.from('pantry_items').delete().eq('ingredient_id', id), 'take it out of your pantry'))
  onShopChange((previous) => ({ ...previous, pantry: toggled(previous.pantry, id, have) }))
}

/** Checked off on the grocery list (in the cart), or not. On this phone only, so it never waits on signal. */
export function setChecked(id: IngredientId, checked: boolean, onShopChange: ShopChange) {
  onShopChange((previous) => ({ ...previous, checks: toggled(previous.checks, id, checked) }))
}

/** One piece of equipment in the kit, or not. */
export async function setInKit(id: EquipmentId, own: boolean, onShopChange: ShopChange) {
  await (own
    ? written(db.from('kit_items').upsert({ equipment_id: id }, { ignoreDuplicates: true }), 'add it to your kit')
    : written(db.from('kit_items').delete().eq('equipment_id', id), 'take it out of your kit'))
  onShopChange((previous) => ({ ...previous, kit: toggled(previous.kit, id, own) }))
}

/** Several at once, in one request: "I have all of these", and the tools of a recipe just cooked. */
export async function addAllToKit(ids: readonly EquipmentId[], onShopChange: ShopChange) {
  const rows = ids.map((id) => ({ equipment_id: id }))
  const { error } = await db.from('kit_items').upsert(rows, { ignoreDuplicates: true })
  if (error) throw new Error(`Could not add them to your kit: ${plainMessage(error)}`)
  onShopChange((previous) => ({ ...previous, kit: new Set([...previous.kit, ...ids]) }))
}

/**
 * The shop without the ticks its list no longer shows: left from a shop that
 * never got "Done shopping", for recipes since cooked or taken off. Applied
 * before the list grows, so a new list never opens with things ticked that
 * were never bought for it.
 */
function withoutStaleChecks(shop: Shop): Shop {
  const listed = new Set(groceryList(toShopFor(shop), shop.pantry, shop.prices).lines.map((line) => line.ingredientId))
  return { ...shop, checks: new Set([...shop.checks].filter((id) => listed.has(id))) }
}

/**
 * "Add to this week", from any screen: the recipe as the database has it
 * (already there and shopped for, if another device did that), with old
 * ticks cleared first.
 */
export async function planRecipe(recipeId: string, onShopChange: ShopChange) {
  const row = await addToPlan(recipeId)
  const bought = boughtOn([row]).get(recipeId)
  onShopChange((previous) => {
    const cleared = withoutStaleChecks(previous)
    return {
      ...cleared,
      plan: cleared.plan.includes(recipeId) ? cleared.plan : [...cleared.plan, recipeId],
      shopped: row.shopped ? new Set([...cleared.shopped, recipeId]) : cleared.shopped,
      shoppedOn: bought === undefined ? cleared.shoppedOn : new Map(cleared.shoppedOn).set(recipeId, bought),
    }
  })
}

/**
 * A recipe already shopped for goes back on the grocery list: the groceries
 * were not bought, or went off. Old ticks are cleared first, as when adding.
 */
export async function shopForAgain(recipeId: string, onShopChange: ShopChange) {
  const { data, error } = await db
    .from('plan_items')
    .update({ shopped: false, shopped_on: null })
    .eq('recipe_id', recipeId)
    .select('recipe_id')
  if (error) throw new Error(`Could not put it back on the list: ${plainMessage(error)}`)
  if (data.length !== 1) throw new Error('It is not on this week’s plan any more: it was cooked or taken off on another device.')
  onShopChange((previous) => {
    const cleared = withoutStaleChecks(previous)
    const shoppedOn = new Map(cleared.shoppedOn)
    shoppedOn.delete(recipeId)
    return { ...cleared, shopped: toggled(cleared.shopped, recipeId, false), shoppedOn }
  })
}

/** The package price the cook paid, in place of the estimate in ingredients.ts. */
export async function setPrice(id: IngredientId, priceCents: number, onShopChange: ShopChange) {
  if (!Number.isInteger(priceCents) || priceCents <= 0) throw new Error(`A price must be above zero, not ${priceCents}`)
  const { error } = await db.from('price_overrides').upsert({ ingredient_id: id, price_cents: priceCents })
  if (error) throw new Error(`Could not save the price: ${plainMessage(error)}`)
  onShopChange((previous) => ({ ...previous, prices: new Map(previous.prices).set(id, priceCents) }))
}

/** Back to the estimate in ingredients.ts. */
export async function resetPrice(id: IngredientId, onShopChange: ShopChange) {
  await written(db.from('price_overrides').delete().eq('ingredient_id', id), 'go back to the estimate')
  onShopChange((previous) => {
    const prices = new Map(previous.prices)
    prices.delete(id)
    return { ...previous, prices }
  })
}

/** The recipes on the list that this shop covers (lib/grocery.ts). */
export function coveredRecipes(shop: Shop): string[] {
  return boughtFor(toShopFor(shop), shop.pantry, shop.checks)
}

/**
 * "Done shopping" for the list this screen shows, on `today` (the cook's
 * local date): the staples checked off go into the pantry, and the recipes
 * it covers are marked shopped, with the day, in one transaction (00007,
 * 00009). Ticks for what is still to buy stay on the phone; the rest are
 * cleared. Only the recipes this device listed change, so one added on
 * another device meanwhile is left alone. Says what went into the pantry,
 * which recipes were bought, and which are still on the list.
 */
export async function doneShopping(
  shop: Shop,
  today: string,
  onShopChange: ShopChange,
): Promise<{ staples: IngredientId[]; bought: string[]; stillToShop: string[] }> {
  const toShop = toShopFor(shop)
  const covered = coveredRecipes(shop)
  const staples = groceryList(toShop, shop.pantry, shop.prices)
    .lines.map((line) => line.ingredientId)
    .filter((id) => shop.checks.has(id) && INGREDIENTS[id].staple)
  // The ticks live on the phone (lib/checks.ts), so the database has none to clear.
  const { error } = await db.rpc('finish_shopping', {
    bought_staples: staples,
    shopped_recipes: covered,
    seen_checks: [],
    bought_on: today,
  })
  if (error) throw new Error(`Could not finish shopping: ${plainMessage(error)} Your checks are kept on this phone.`)
  const stillToShop = toShop.filter((id) => !covered.includes(id))
  const pantry = new Set([...shop.pantry, ...staples])
  const stillListed = new Set(groceryList(stillToShop, pantry, shop.prices).lines.map((line) => line.ingredientId))
  onShopChange((previous) => ({
    ...previous,
    shopped: new Set([...previous.shopped, ...covered]),
    shoppedOn: new Map([...previous.shoppedOn, ...covered.map((id) => [id, today] as const)]),
    checks: new Set([...previous.checks].filter((id) => stillListed.has(id))),
    pantry: new Set([...previous.pantry, ...staples]),
  }))
  return { staples, bought: covered, stillToShop }
}
