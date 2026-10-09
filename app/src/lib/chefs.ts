// The chef's name, look and chosen extras are the only things about the chef
// that are stored. Level, rank, stats and which extras are earned are derived
// in leveling.ts and extras.ts.

import {
  FACIAL_HAIR,
  GLASSES,
  HAIR_COLORS,
  HAIR_STYLES,
  isIndexOf,
  SKIN_TONES,
  type Look,
} from '../components/chefSprites'
import type { Database } from '../database.types'
import { db } from '../supabase'
import { plainMessage } from './errors'
import { extraById, isExtraId, type ExtraId } from './extras'

export const CHEF_NAME_MAX = 24

export interface Chef extends Look {
  readonly name: string
  /** The extras the cook chose to wear, at most one per slot. Worn only while earned. */
  readonly extras: readonly ExtraId[]
}

/** A new chef's look: what every chef had before the look had more to it. */
export const DEFAULT_LOOK: Look = { skin: 1, hair: 1, hairStyle: 0, facialHair: 0, glasses: 0 }

const COLUMNS = 'name, skin, hair, hair_style, facial_hair, glasses, extras'

/** The columns read, as the migrations define them (database.types.ts). */
type ChefRow = Pick<
  Database['public']['Tables']['chefs']['Row'],
  'name' | 'skin' | 'hair' | 'hair_style' | 'facial_hair' | 'glasses' | 'extras'
>

function index<T extends readonly unknown[]>(options: T, value: number, column: string) {
  if (!isIndexOf(options, value)) throw new Error(`Chef row has ${column} ${value}`)
  return value
}

function toExtras(values: readonly string[]): ExtraId[] {
  const slots = new Set<string>()
  return values.map((value) => {
    if (!isExtraId(value)) throw new Error(`Chef row has unknown extra ${value}`)
    const { slot } = extraById(value)
    if (slots.has(slot)) throw new Error(`Chef row wears two extras ${slot}`)
    slots.add(slot)
    return value
  })
}

// The one place a database row becomes a Chef.
function toChef(row: ChefRow): Chef {
  if (typeof row.name !== 'string' || row.name === '') throw new Error('Chef row has no name')
  return {
    name: row.name,
    skin: index(SKIN_TONES, row.skin, 'skin'),
    hair: index(HAIR_COLORS, row.hair, 'hair'),
    hairStyle: index(HAIR_STYLES, row.hair_style, 'hair_style'),
    facialHair: index(FACIAL_HAIR, row.facial_hair, 'facial_hair'),
    glasses: index(GLASSES, row.glasses, 'glasses'),
    extras: toExtras(row.extras),
  }
}

function toRow(chef: Chef): ChefRow {
  return {
    name: chef.name,
    skin: chef.skin,
    hair: chef.hair,
    hair_style: chef.hairStyle,
    facial_hair: chef.facialHair,
    glasses: chef.glasses,
    extras: [...chef.extras],
  }
}

/** null means this account has not created a chef yet. */
export async function fetchChef(): Promise<Chef | null> {
  const { data, error } = await db.from('chefs').select(COLUMNS).maybeSingle()
  if (error) throw new Error(`Could not load your chef: ${plainMessage(error)}`)
  return data === null ? null : toChef(data)
}

/**
 * An account has one chef. A duplicate key means it already has one: a
 * retry after the answer was lost on weak signal, or a chef made on another
 * device. Either way that chef is the one to show.
 */
export async function createChef(chef: Chef): Promise<Chef> {
  const { data, error } = await db.from('chefs').insert(toRow(chef)).select(COLUMNS).single()
  if (error?.code === '23505') {
    const existing = await fetchChef()
    if (existing === null) throw new Error(`Could not create your chef: ${plainMessage(error)}`)
    return existing
  }
  if (error) throw new Error(`Could not create your chef: ${plainMessage(error)}`)
  return toChef(data)
}

export async function updateChef(userId: string, chef: Chef): Promise<Chef> {
  const { data, error } = await db.from('chefs').update(toRow(chef)).eq('user_id', userId).select(COLUMNS).single()
  if (error) throw new Error(`Could not save your chef: ${plainMessage(error)}`)
  return toChef(data)
}
