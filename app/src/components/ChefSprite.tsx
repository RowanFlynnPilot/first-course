// Draws a chef sprite as crisp SVG pixels. `scale` is whole screen pixels per
// sprite pixel; keep it an integer or the pixels come out uneven.

import { RANKS, type RankIndex } from '../lib/leveling'
import { SPRITE_KEYS, SPRITE_WIDTH, spritePalette, spriteRows, type LookIndex, type SpriteKey } from './chefSprites'

function isSpriteKey(key: string): key is SpriteKey {
  return (SPRITE_KEYS as readonly string[]).includes(key)
}

export function ChefSprite({
  rank,
  skin,
  hair,
  scale,
}: {
  rank: RankIndex
  skin: LookIndex
  hair: LookIndex
  scale: number
}) {
  const rows = spriteRows(rank)
  const palette = spritePalette(skin, hair)

  // One rect per horizontal run of the same color.
  const runs: { x: number; y: number; width: number; fill: string }[] = []
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const key = row.charAt(x)
      let end = x + 1
      while (end < row.length && row.charAt(end) === key) end += 1
      if (key !== '.') {
        if (!isSpriteKey(key)) throw new Error(`Sprite for rank ${rank} uses unknown key "${key}"`)
        runs.push({ x, y, width: end - x, fill: palette[key] })
      }
      x = end
    }
  })

  return (
    <svg
      className="sprite"
      width={SPRITE_WIDTH * scale}
      height={rows.length * scale}
      viewBox={`0 0 ${SPRITE_WIDTH} ${rows.length}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Your chef, a ${RANKS[rank].name.toLowerCase()}`}
    >
      {runs.map((run) => (
        <rect key={`${run.x}-${run.y}`} x={run.x} y={run.y} width={run.width} height={1} fill={run.fill} />
      ))}
    </svg>
  )
}
