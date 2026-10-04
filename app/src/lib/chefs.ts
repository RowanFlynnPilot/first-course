// The chef's name and look are the only things about the chef that are
// stored. Level, rank and stats are derived in leveling.ts.

import { LOOK_INDEXES, type LookIndex } from '../components/chefSprites'
import { supabase } from '../supabase'

export const CHEF_NAME_MAX = 24

export interface Chef {
  readonly name: string
  readonly skin: LookIndex
  readonly hair: LookIndex
}

const COLUMNS = 'name, skin, hair'

interface ChefRow {
  name: string
  skin: number
  hair: number
}

function toLookIndex(value: number, column: string): LookIndex {
  const index = LOOK_INDEXES.find((candidate) => candidate === value)
  if (index === undefined) throw new Error(`Chef row has ${column} ${value}`)
  return index
}

// The one place a database row becomes a Chef.
function toChef(row: ChefRow): Chef {
  if (typeof row.name !== 'string' || row.name === '') throw new Error('Chef row has no name')
  return { name: row.name, skin: toLookIndex(row.skin, 'skin'), hair: toLookIndex(row.hair, 'hair') }
}

/** null means this account has not created a chef yet. */
export async function fetchChef(): Promise<Chef | null> {
  const { data, error } = await supabase.from('chefs').select(COLUMNS).maybeSingle()
  if (error) throw new Error(`Could not load your chef: ${error.message}`)
  return data === null ? null : toChef(data as ChefRow)
}

export async function createChef(chef: Chef): Promise<Chef> {
  const { data, error } = await supabase.from('chefs').insert(chef).select(COLUMNS).single()
  if (error) throw new Error(`Could not create your chef: ${error.message}`)
  return toChef(data as ChefRow)
}

export async function updateChef(userId: string, chef: Chef): Promise<Chef> {
  const { data, error } = await supabase.from('chefs').update(chef).eq('user_id', userId).select(COLUMNS).single()
  if (error) throw new Error(`Could not save your chef: ${error.message}`)
  return toChef(data as ChefRow)
}
