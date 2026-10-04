import { badgeById, type BadgeId } from '../lib/badges'
import { BADGE_PALETTE, badgeRows, LOCKED_PALETTE } from './badgeSprites'
import { PixelArt } from './PixelArt'

export function BadgeArt({ id, earned, scale }: { id: BadgeId; earned: boolean; scale: number }) {
  const badge = badgeById(id)
  return (
    <PixelArt
      frames={[badgeRows(id)]}
      palette={earned ? BADGE_PALETTE : LOCKED_PALETTE}
      scale={scale}
      label={earned ? `${badge.name} badge` : `${badge.name} badge, not earned yet`}
      className="badge-art"
    />
  )
}
