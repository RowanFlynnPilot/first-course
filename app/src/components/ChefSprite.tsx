// The chef. Rank decides the costume; the cook's look and the extras they wear
// are drawn over it. `idle` gives the two-frame bob, for the places the chef is
// standing around (the menu, the chef sheet, a promotion). The ladder and the
// editor stay still.

import type { ExtraId } from '../lib/extras'
import { RANKS, type RankIndex } from '../lib/leveling'
import { spriteFrames, spritePalette, type Look } from './chefSprites'
import { PixelArt } from './PixelArt'

export function ChefSprite({
  rank,
  look,
  extras,
  scale,
  idle = false,
}: {
  rank: RankIndex
  look: Look
  /** Only extras the cook has earned: see wornExtras in lib/extras.ts. */
  extras: readonly ExtraId[]
  scale: number
  idle?: boolean
}) {
  const frames = spriteFrames(rank, look, extras)
  return (
    <PixelArt
      frames={idle ? frames : frames.slice(0, 1)}
      palette={spritePalette(look)}
      scale={scale}
      label={`Your chef, a ${RANKS[rank].name.toLowerCase()}`}
      className="sprite"
      idle={idle}
    />
  )
}
