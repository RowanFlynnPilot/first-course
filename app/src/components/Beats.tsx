// Full-screen moments after a cook: a promotion, and a dish of the usual
// coming into reach. Each one holds the screen until the cook moves on, then
// the menu shows the rest of what the cook earned.

import { useEffect, useRef, type ReactNode } from 'react'
import type { Recipe } from '../curriculum/types'
import { badgeById, usualBadge } from '../lib/badges'
import type { Chef } from '../lib/chefs'
import type { ExtraId } from '../lib/extras'
import { RANKS, type RankIndex } from '../lib/leveling'
import { BADGE_PALETTE, SYMBOLS } from './badgeSprites'
import { ChefSprite } from './ChefSprite'
import { PixelArt } from './PixelArt'

function Beat({
  kicker,
  title,
  children,
  art,
  onDone,
  doneLabel,
}: {
  kicker: string
  title: string
  children: ReactNode
  art: ReactNode
  onDone: () => void
  doneLabel: string
}) {
  const done = useRef<HTMLButtonElement>(null)
  // The menu behind redraws every minute with a new onDone: Escape reads the latest, and focus is
  // placed once, when the moment opens, not pulled back on every redraw.
  const latestOnDone = useRef(onDone)
  useEffect(() => {
    latestOnDone.current = onDone
  }, [onDone])
  useEffect(() => {
    done.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') latestOnDone.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    // The note is the dialog's description, so a screen reader reads it with the title: focus goes straight to the button.
    <div className="beat" role="dialog" aria-modal="true" aria-labelledby="beat-title" aria-describedby="beat-note">
      <div className="beat-body">
        <p className="beat-kicker">{kicker}</p>
        <div className="beat-art">{art}</div>
        <h2 className="beat-title" id="beat-title">
          {title}
        </h2>
        <div className="beat-note" id="beat-note">
          {children}
        </div>
        <div className="beat-actions">
          <button ref={done} className="button" type="button" onClick={onDone}>
            {doneLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function PromotionBeat({
  chef,
  extras,
  rank,
  last,
  onDone,
}: {
  chef: Chef
  /** The extras the chef is wearing: see wornExtras. */
  extras: readonly ExtraId[]
  rank: RankIndex
  /** No other moment follows this one. */
  last: boolean
  onDone: () => void
}) {
  const next = RANKS[rank + 1]
  return (
    <Beat
      kicker="Promoted"
      title={`${chef.name} is promoted to ${RANKS[rank].name.toLowerCase()}`}
      art={
        <div className="beat-stage beat-plate">
          <ChefSprite rank={rank} look={chef} extras={extras} scale={7} idle />
        </div>
      }
      onDone={onDone}
      doneLabel={last ? 'Back to the menu' : 'Next'}
    >
      <p>{RANKS[rank].costume}</p>
      <p>
        {next === undefined
          ? 'Top of the kitchen.'
          : `Next: ${next.name.toLowerCase()} at level ${next.fromLevel}.`}
      </p>
    </Beat>
  )
}

export function UsualBeat({ recipe, last, onDone }: { recipe: Recipe; last: boolean; onDone: () => void }) {
  const badge = usualBadge(recipe)
  return (
    <Beat
      kicker="The usual"
      title={`${recipe.title} is in reach`}
      art={
        // The dish, on a plate.
        <div className="beat-stage beat-plate beat-dish">
          <PixelArt frames={[SYMBOLS[badge]]} palette={BADGE_PALETTE} scale={10} label={recipe.title} className="dish-art" />
        </div>
      }
      onDone={onDone}
      doneLabel={last ? 'Back to the menu' : 'Next'}
    >
      {/* No link to the recipe here: leaving the menu now would drop what is still to show of this cook. */}
      <p>You have learned every skill it needs. Next time you would order it, cook it instead.</p>
      <p>A cook at Decent or better earns the {badgeById(badge).name} badge.</p>
    </Beat>
  )
}
