// The chef. Rank decides the costume; the cook's look fills in skin and hair.
// `idle` gives the two-frame bob, for the places the chef is standing around
// (the menu, the chef sheet, a promotion). The ladder and the editor stay still.

import { RANKS, type RankIndex } from '../lib/leveling'
import { spriteFrames, spritePalette, type LookIndex } from './chefSprites'
import { PixelArt } from './PixelArt'

export function ChefSprite({
  rank,
  skin,
  hair,
  scale,
  idle = false,
}: {
  rank: RankIndex
  skin: LookIndex
  hair: LookIndex
  scale: number
  idle?: boolean
}) {
  return (
    <PixelArt
      frames={idle ? spriteFrames(rank) : spriteFrames(rank).slice(0, 1)}
      palette={spritePalette(skin, hair)}
      scale={scale}
      label={`Your chef, a ${RANKS[rank].name.toLowerCase()}`}
      className="sprite"
      idle={idle}
    />
  )
}
