// Progress through the current level. After a cook it fills from where it was.

import { useEffect, useState } from 'react'
import { levelForXp, levelFraction, xpForLevel } from '../lib/leveling'

export function XpBar({ xp, fromXp }: { xp: number; fromXp: number | null }) {
  const level = levelForXp(xp)
  const fraction = levelFraction(xp)
  // A level-up starts the new level's bar from empty.
  const start = fromXp === null ? fraction : levelForXp(fromXp) === level ? levelFraction(fromXp) : 0
  const [shown, setShown] = useState(start)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(fraction))
    return () => cancelAnimationFrame(frame)
  }, [fraction])

  return (
    <span className="xp">
      <span className="xp-track" aria-hidden="true">
        <span className="xp-fill" style={{ width: `${shown * 100}%` }} />
      </span>
      <span className="row-note">
        {(xpForLevel(level + 1) - xp).toLocaleString()} XP to level {level + 1}
      </span>
    </span>
  )
}
