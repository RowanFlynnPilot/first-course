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

/** `cookedOn` is the cook's local date (YYYY-MM-DD), never the server's. */
export async function insertCookLog(input: {
  recipeId: string
  cookedOn: string
  rating: Rating
  notes: string
}): Promise<CookLog> {
  const { data, error } = await supabase
    .from('cook_logs')
    .insert({
      recipe_id: input.recipeId,
      cooked_on: input.cookedOn,
      rating: input.rating,
      notes: input.notes,
    })
    .select(COLUMNS)
    .single()
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

export async function deleteCookLog(id: string): Promise<void> {
  const { data, error } = await supabase.from('cook_logs').delete().eq('id', id).select('id')
  if (error) throw new Error(`Could not delete this cook: ${error.message}`)
  if (data.length !== 1) throw new Error('That cook was not in your log')
}
