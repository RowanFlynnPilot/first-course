import { describe, expect, it } from 'vitest'
import { RANK_INDEXES } from '../lib/leveling'
import { BADGES } from '../lib/badges'
import { BADGE_KEYS, BADGE_SIZE, badgeRows, SYMBOL_SIZE, SYMBOLS } from './badgeSprites'
import { SPRITE_KEYS, SPRITE_WIDTH, spriteFrames, spriteRows } from './chefSprites'

describe('chef sprites', () => {
  it('are 16 wide and use only palette keys', () => {
    const allowed = new Set<string>(['.', ...SPRITE_KEYS])
    for (const rank of RANK_INDEXES) {
      for (const row of spriteRows(rank)) {
        expect(row.length, `rank ${rank}: ${row}`).toBe(SPRITE_WIDTH)
        for (const key of row) expect(allowed.has(key), `rank ${rank}: "${key}" in ${row}`).toBe(true)
      }
    }
  })

  it('bob in place: the idle frame is the same size, with the feet where they were', () => {
    for (const rank of RANK_INDEXES) {
      const [standing, bob] = spriteFrames(rank)
      expect(bob.length, `rank ${rank}`).toBe(standing.length)
      for (const row of bob) expect(row.length, `rank ${rank}: ${row}`).toBe(SPRITE_WIDTH)
      expect(bob.slice(-3), `rank ${rank}`).toEqual(standing.slice(-3))
      expect(bob[0], `rank ${rank}`).toBe('.'.repeat(SPRITE_WIDTH))
    }
  })

  it('get taller with every promotion from line cook up', () => {
    const heights = RANK_INDEXES.map((rank) => spriteRows(rank).length)
    for (const rank of [3, 4, 5] as const) expect(heights[rank]).toBeGreaterThan(heights[rank - 1] ?? Infinity)
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
