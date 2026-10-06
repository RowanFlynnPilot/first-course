import { recipeById } from '../curriculum/recipes'
import { supabase } from '../supabase'
import type { CookLog, Rating } from './progress'

const COLUMNS = 'id, recipe_id, cooked_on, rating, notes'

interface CookLogRow {
  id: string
  recipe_id: string
  cooked_on: string
  rating: number
  notes: string
}

// The one place database rows become app data.
function toCookLog(row: CookLogRow): CookLog {
  recipeById(row.recipe_id) // throws on an id the menu no longer has
  if (row.rating !== 1 && row.rating !== 2 && row.rating !== 3) {
    throw new Error(`Cook log ${row.id} has rating ${row.rating}`)
  }
  if (typeof row.cooked_on !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.cooked_on)) {
    throw new Error(`Cook log ${row.id} has no date`)
  }
  if (typeof row.notes !== 'string') throw new Error(`Cook log ${row.id} has no notes field`)
  return {
    id: row.id,
    recipeId: row.recipe_id,
    cookedOn: row.cooked_on,
    rating: row.rating,
    notes: row.notes,
  }
}

export async function fetchCookLogs(): Promise<CookLog[]> {
  const { data, error } = await supabase.from('cook_logs').select(COLUMNS).order('created_at')
  if (error) throw new Error(`Could not load your cook log: ${error.message}`)
  return (data as CookLogRow[]).map(toCookLog)
}

/**
 * A new cook's id, made by the log form once. A random version-4 UUID from
 * getRandomValues, which, unlike crypto.randomUUID, also works on the
 * plain-HTTP address used to test on a phone.
 */
export function newCookId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * `cookedOn` is the cook's local date (YYYY-MM-DD), never the server's. `id`
 * comes from the form, made once: when a save lands but its answer is lost
 * on weak signal, the retry finds that cook already saved (a duplicate key)
 * and saves what the form says now over it, instead of logging the cook
 * twice or keeping a rating the cook has since changed.
 */
export async function insertCookLog(input: {
  id: string
  recipeId: string
  cookedOn: string
  rating: Rating
  notes: string
}): Promise<CookLog> {
  const { data, error } = await supabase
    .from('cook_logs')
    .insert({
      id: input.id,
      recipe_id: input.recipeId,
      cooked_on: input.cookedOn,
      rating: input.rating,
      notes: input.notes,
    })
    .select(COLUMNS)
    .single()
  if (error?.code === '23505') {
    return updateCookLog(input.id, { cookedOn: input.cookedOn, rating: input.rating, notes: input.notes })
  }
  if (error) throw new Error(`Could not save this cook: ${error.message}`)
  return toCookLog(data as CookLogRow)
}

/** The date, rating and notes of a cook can change. Its recipe cannot: that would be a different cook. */
export async function updateCookLog(
  id: string,
  change: { cookedOn: string; rating: Rating; notes: string },
): Promise<CookLog> {
  const { data, error } = await supabase
    .from('cook_logs')
    .update({ cooked_on: change.cookedOn, rating: change.rating, notes: change.notes })
    .eq('id', id)
    .select(COLUMNS)
    .single()
  if (error) throw new Error(`Could not save your changes: ${error.message}`)
  return toCookLog(data as CookLogRow)
}

/**
 * Deletes a cook. Finding nothing to delete means it is already gone: a
 * retry after an answer lost on weak signal, or a delete on another device.
 */
export async function deleteCookLog(id: string): Promise<void> {
  const { error } = await supabase.from('cook_logs').delete().eq('id', id)
  if (error) throw new Error(`Could not delete this cook: ${error.message}`)
}
