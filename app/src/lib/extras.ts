// Extras: things the chef wears or carries over the rank's outfit, earned by
// cooking one kind of dish. Like badges they are derived from the cook log,
// never stored, so editing a cook can take one away. The chef row stores only
// which extras the cook chose to wear; the sprite wears the ones still earned.
// The art is in components/chefSprites.ts.

import { RECIPES } from '../curriculum/recipes'
import type { Track } from '../curriculum/types'
import { goodCooks, type CookLog } from './progress'

export type ExtraSlot = 'hand' | 'waist' | 'chest' | 'feet'

/** Where an extra goes. A chef wears at most one extra in each. */
export const SLOTS: readonly { readonly id: ExtraSlot; readonly name: string }[] = [
  { id: 'hand', name: 'In hand' },
  { id: 'waist', name: 'At the waist' },
  { id: 'chest', name: 'On the jacket' },
  { id: 'feet', name: 'On the feet' },
]

const TRACK_NAMES: Readonly<Record<Track, string>> = {
  foundations: 'the basics',
  'burgers-sandwiches': 'burgers and sandwiches',
  'pizza-pasta': 'pizza and pasta',
  'wok-curry': 'wok and curry dishes',
}

interface ExtraRule {
  readonly name: string
  readonly slot: ExtraSlot
  readonly track: Track
  /** Good cooks of that track's recipes that earn it. */
  readonly cooks: number
}

// Two per track: one at 5 good cooks, one at 15. In the order the chef sheet lists them.
const DEFINITIONS = {
  'kitchen-towel': { name: 'Kitchen towel', slot: 'waist', track: 'foundations', cooks: 5 },
  'wooden-spoon': { name: 'Wooden spoon', slot: 'hand', track: 'foundations', cooks: 15 },
  'red-clogs': { name: 'Red clogs', slot: 'feet', track: 'burgers-sandwiches', cooks: 5 },
  'smash-spatula': { name: 'Smash spatula', slot: 'hand', track: 'burgers-sandwiches', cooks: 15 },
  'pizza-patch': { name: 'Pizza patch', slot: 'chest', track: 'pizza-pasta', cooks: 5 },
  whisk: { name: 'Whisk', slot: 'hand', track: 'pizza-pasta', cooks: 15 },
  'yellow-clogs': { name: 'Yellow clogs', slot: 'feet', track: 'wok-curry', cooks: 5 },
  chopsticks: { name: 'Chopsticks', slot: 'hand', track: 'wok-curry', cooks: 15 },
} as const satisfies Record<string, ExtraRule>

export type ExtraId = keyof typeof DEFINITIONS

export interface Extra extends ExtraRule {
  readonly id: ExtraId
  /** How to earn it, shown in the editor and on the chef sheet. */
  readonly how: string
}

export const EXTRAS: readonly Extra[] = (Object.keys(DEFINITIONS) as ExtraId[]).map((id) => {
  const rule: ExtraRule = DEFINITIONS[id]
  return { id, ...rule, how: `Cook ${TRACK_NAMES[rule.track]} ${rule.cooks} times at “Decent” or better.` }
})

export function isExtraId(value: string): value is ExtraId {
  return Object.hasOwn(DEFINITIONS, value)
}

export function extraById(id: ExtraId): Extra {
  const extra = EXTRAS.find((candidate) => candidate.id === id)
  if (extra === undefined) throw new Error(`Unknown extra ${id}`)
  return extra
}

/** Good cooks, counted across every recipe on one track. */
export function trackCooks(track: Track, logs: readonly CookLog[]): number {
  return RECIPES.filter((recipe) => recipe.track === track).reduce((sum, recipe) => sum + goodCooks(recipe, logs), 0)
}

export function unlockedExtras(logs: readonly CookLog[]): ExtraId[] {
  return EXTRAS.filter((extra) => trackCooks(extra.track, logs) >= extra.cooks).map((extra) => extra.id)
}

/** What the sprite wears: the extras the cook chose that are still earned. */
export function wornExtras(chosen: readonly ExtraId[], logs: readonly CookLog[]): ExtraId[] {
  const unlocked = new Set(unlockedExtras(logs))
  return chosen.filter((id) => unlocked.has(id))
}
