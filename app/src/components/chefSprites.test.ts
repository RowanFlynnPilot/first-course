import { describe, expect, it } from 'vitest'
import { RANK_INDEXES } from '../lib/leveling'
import { BADGES } from '../lib/badges'
import { BADGE_KEYS, BADGE_SIZE, badgeRows, SYMBOL_SIZE, SYMBOLS } from './badgeSprites'
import { EXTRAS, type ExtraId } from '../lib/extras'
import {
  EXTRA_ART,
  FACIAL_HAIR,
  GLASSES,
  HAIR_STYLES,
  SPRITE_KEYS,
  SPRITE_WIDTH,
  spriteFrames,
  spritePalette,
  spriteRows,
  type Look,
} from './chefSprites'

const PLAIN: Look = { skin: 1, hair: 1, hairStyle: 0, facialHair: 0, glasses: 0 }

/** Every look a cook can choose, one option at a time, plus everything at once. */
const LOOKS: readonly Look[] = [
  PLAIN,
  ...HAIR_STYLES.map((_, index) => ({ ...PLAIN, hairStyle: index as Look['hairStyle'] })),
  ...FACIAL_HAIR.map((_, index) => ({ ...PLAIN, facialHair: index as Look['facialHair'] })),
  ...GLASSES.map((_, index) => ({ ...PLAIN, glasses: index as Look['glasses'] })),
  { skin: 6, hair: 8, hairStyle: 2, facialHair: 2, glasses: 2 },
]

/** No extras, each one alone, and one in every slot. */
const EXTRA_SETS: readonly (readonly ExtraId[])[] = [
  [],
  ...EXTRAS.map((extra) => [extra.id]),
  ['smash-spatula', 'kitchen-towel', 'pizza-patch', 'red-clogs'],
]

describe('chef sprites', () => {
  it('are 20 wide and use only palette keys, with any look and any extras', () => {
    const allowed = new Set<string>(['.', ...SPRITE_KEYS])
    for (const rank of RANK_INDEXES) {
      for (const look of LOOKS) {
        for (const extras of EXTRA_SETS) {
          for (const row of spriteRows(rank, look, extras)) {
            expect(row.length, `rank ${rank}: ${row}`).toBe(SPRITE_WIDTH)
            for (const key of row) expect(allowed.has(key), `rank ${rank}: "${key}" in ${row}`).toBe(true)
          }
        }
      }
    }
  })

  it('draw every look option and every extra as a visible change', () => {
    const plain = spriteRows(2, PLAIN, []).join('')
    for (const look of LOOKS.slice(1)) {
      if (look.hairStyle + look.facialHair + look.glasses === 0) continue
      expect(spriteRows(2, look, []).join(''), JSON.stringify(look)).not.toBe(plain)
    }
    for (const extra of EXTRAS) expect(spriteRows(2, PLAIN, [extra.id]).join(''), extra.id).not.toBe(plain)
  })

  it('leave the hat alone, so the rank always shows', () => {
    for (const rank of RANK_INDEXES) {
      const plain = spriteRows(rank, PLAIN, [])
      const hat = plain.length - 16
      for (const look of LOOKS) {
        for (const extras of EXTRA_SETS) {
          // The hairline row is shared with the hair, so only the rows above it are the hat alone.
          expect(spriteRows(rank, look, extras).slice(0, hat - 1), `rank ${rank}`).toEqual(plain.slice(0, hat - 1))
        }
      }
    }
  })

  it('bob in place: the idle frame is the same size, with the feet where they were', () => {
    for (const rank of RANK_INDEXES) {
      const [standing, bob] = spriteFrames(rank, PLAIN, ['red-clogs'])
      expect(bob.length, `rank ${rank}`).toBe(standing.length)
      for (const row of bob) expect(row.length, `rank ${rank}: ${row}`).toBe(SPRITE_WIDTH)
      expect(bob.slice(-3), `rank ${rank}`).toEqual(standing.slice(-3))
      expect(bob[0], `rank ${rank}`).toBe('.'.repeat(SPRITE_WIDTH))
    }
  })

  it('get taller with every promotion from line cook up', () => {
    const heights = RANK_INDEXES.map((rank) => spriteRows(rank, PLAIN, []).length)
    for (const rank of [3, 4, 5] as const) expect(heights[rank]).toBeGreaterThan(heights[rank - 1] ?? Infinity)
  })

  it('has art for every extra, and a palette entry for every key', () => {
    for (const extra of EXTRAS) expect(EXTRA_ART[extra.id].length, extra.id).toBeGreaterThan(0)
    for (const look of LOOKS) expect(Object.keys(spritePalette(look)).toSorted()).toEqual([...SPRITE_KEYS].toSorted())
  })
})

describe('badge art', () => {
  it('has a 10 by 10 symbol for every badge, in badge palette keys only', () => {
    const allowed = new Set<string>(['.', ...BADGE_KEYS])
    for (const badge of BADGES) {
      const symbol = SYMBOLS[badge.id]
      expect(symbol.length, badge.id).toBe(SYMBOL_SIZE)
      for (const row of symbol) {
        expect(row.length, `${badge.id}: ${row}`).toBe(SYMBOL_SIZE)
        for (const key of row) expect(allowed.has(key), `${badge.id}: "${key}" in ${row}`).toBe(true)
      }
    }
  })

  it('draws every badge as a 16-pixel medal', () => {
    for (const badge of BADGES) {
      const rows = badgeRows(badge.id)
      expect(rows.length, badge.id).toBe(BADGE_SIZE)
      for (const row of rows) expect(row.length, `${badge.id}: ${row}`).toBe(BADGE_SIZE)
    }
  })

  it('gives every badge its own picture', () => {
    const pictures = BADGES.map((badge) => badgeRows(badge.id).join('\n'))
    expect(new Set(pictures).size).toBe(BADGES.length)
  })
})
