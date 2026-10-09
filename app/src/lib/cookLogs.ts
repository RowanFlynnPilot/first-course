import { recipeById } from '../curriculum/recipes'
import type { Database } from '../database.types'
import { db } from '../supabase'
import { plainMessage } from './errors'
import type { CookLog, Rating } from './progress'

const COLUMNS = 'id, recipe_id, cooked_on, rating, notes'

/** The longest note a cook can hold, as the database checks it (00008). The note fields stop there. */
export const NOTES_MAX = 2000

/** Rows per read. The Data API returns at most 1,000 at a time, and a keen cook passes that in a few years. */
const PAGE = 1000

/** The columns read, as the migrations define them (database.types.ts). */
type CookLogRow = Pick<Database['public']['Tables']['cook_logs']['Row'], 'id' | 'recipe_id' | 'cooked_on' | 'rating' | 'notes'>

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

export async function fetchCookLogs(): Promise<readonly CookLog[]> {
  const rows: CookLogRow[] = []
  for (;;) {
    const { data, error } = await db
      .from('cook_logs')
      .select(COLUMNS)
      .order('created_at')
      .order('id')
      .range(rows.length, rows.length + PAGE - 1)
    if (error) throw new Error(`Could not load your cook log: ${plainMessage(error)}`)
    rows.push(...data)
    // Frozen: progress is kept per log array (progress.ts), so the array must never change in place.
    if (data.length < PAGE) return Object.freeze(rows.map(toCookLog))
  }
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
  const { data, error } = await db
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
  if (error) throw new Error(`Could not save this cook: ${plainMessage(error)}`)
  return toCookLog(data)
}

/** The date, rating and notes of a cook can change. Its recipe cannot: that would be a different cook. */
export async function updateCookLog(
  id: string,
  change: { cookedOn: string; rating: Rating; notes: string },
): Promise<CookLog> {
  const { data, error } = await db
    .from('cook_logs')
    .update({ cooked_on: change.cookedOn, rating: change.rating, notes: change.notes })
    .eq('id', id)
    .select(COLUMNS)
    .single()
  if (error) throw new Error(`Could not save your changes: ${plainMessage(error)}`)
  return toCookLog(data)
}

/**
 * Deletes a cook. Finding nothing to delete means it is already gone: a
 * retry after an answer lost on weak signal, or a delete on another device.
 */
export async function deleteCookLog(id: string): Promise<void> {
  const { error } = await db.from('cook_logs').delete().eq('id', id)
  if (error) throw new Error(`Could not delete this cook: ${plainMessage(error)}`)
}
