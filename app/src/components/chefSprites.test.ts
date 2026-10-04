import { describe, expect, it } from 'vitest'
import { RANK_INDEXES } from '../lib/leveling'
import { SPRITE_KEYS, SPRITE_WIDTH, spriteRows } from './chefSprites'

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

  it('get taller with every promotion from line cook up', () => {
    const heights = RANK_INDEXES.map((rank) => spriteRows(rank).length)
    for (const rank of [3, 4, 5] as const) expect(heights[rank]).toBeGreaterThan(heights[rank - 1] ?? Infinity)
  })
})
