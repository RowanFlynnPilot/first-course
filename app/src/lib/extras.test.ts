import { describe, expect, it } from 'vitest'
import { RECIPES } from '../curriculum/recipes'
import type { Track } from '../curriculum/types'
import { EXTRAS, SLOTS, trackCooks, unlockedExtras, wornExtras } from './extras'
import type { CookLog, Rating } from './progress'

let next = 0
const log = (recipeId: string, rating: Rating): CookLog => ({ id: `log-${next++}`, recipeId, rating, cookedOn: '2026-10-01', notes: '' })
const times = (count: number, recipeId: string, rating: Rating = 2) => Array.from({ length: count }, () => log(recipeId, rating))

describe('extras', () => {
  it('has two per track, at 5 and 15 good cooks, each in a known slot', () => {
    const tracks: Track[] = ['foundations', 'burgers-sandwiches', 'pizza-pasta', 'wok-curry']
    for (const track of tracks) {
      expect(EXTRAS.filter((extra) => extra.track === track).map((extra) => extra.cooks), track).toEqual([5, 15])
    }
    const slots = new Set(SLOTS.map((slot) => slot.id))
    for (const extra of EXTRAS) expect(slots.has(extra.slot), extra.id).toBe(true)
  })

  it('counts good cooks across every recipe on a track, and not Rough ones', () => {
    const logs = [...times(3, 'smash-cheeseburger'), ...times(2, 'onion-melt'), log('oven-fries-aioli', 1)]
    expect(trackCooks('burgers-sandwiches', logs)).toBe(5)
    expect(RECIPES.find((recipe) => recipe.id === 'onion-melt')?.track).toBe('burgers-sandwiches')
  })

  it('unlocks at the fifth good cook of burgers and sandwiches, and the spatula at the fifteenth', () => {
    expect(unlockedExtras(times(4, 'smash-cheeseburger'))).toEqual([])
    expect(unlockedExtras(times(5, 'smash-cheeseburger'))).toEqual(['red-clogs'])
    expect(unlockedExtras(times(15, 'smash-cheeseburger'))).toEqual(['red-clogs', 'smash-spatula'])
  })

  it('only wears what is still earned, so changing a cook can take an extra off', () => {
    const five = times(5, 'smash-cheeseburger')
    expect(wornExtras(['red-clogs', 'whisk'], five)).toEqual(['red-clogs'])
    expect(wornExtras(['red-clogs'], five.slice(1))).toEqual([])
  })
})
