// Full-screen moments after a cook: a promotion, and a dish of the usual
// coming into reach. Each one holds the screen until the cook moves on, then
// the menu shows the rest of what the cook earned.

import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { Recipe } from '../curriculum/types'
import { badgeById, usualBadge } from '../lib/badges'
import type { Chef } from '../lib/chefs'
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
  extra,
}: {
  kicker: string
  title: string
  children: ReactNode
  art: ReactNode
  onDone: () => void
  doneLabel: string
  extra?: ReactNode
}) {
  const done = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    done.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onDone()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onDone])

  return (
    <div className="beat" role="dialog" aria-modal="true" aria-labelledby="beat-title">
      <div className="beat-body">
        <p className="beat-kicker">{kicker}</p>
        <div className="beat-art">{art}</div>
        <h2 className="beat-title" id="beat-title">
          {title}
        </h2>
        <div className="beat-note">{children}</div>
        <div className="beat-actions">
          {extra}
          <button ref={done} className="button" type="button" onClick={onDone}>
            {doneLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function PromotionBeat({ chef, rank, onDone }: { chef: Chef; rank: RankIndex; onDone: () => void }) {
  const next = RANKS[rank + 1]
  return (
    <Beat
      kicker="Promoted"
      title={`${chef.name} is now a ${RANKS[rank].name.toLowerCase()}`}
      art={
        <div className="beat-stage beat-plate">
          <ChefSprite rank={rank} skin={chef.skin} hair={chef.hair} scale={7} idle />
        </div>
      }
      onDone={onDone}
      doneLabel="Back to the menu"
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

export function UsualBeat({ recipe, onDone }: { recipe: Recipe; onDone: () => void }) {
  const badge = usualBadge(recipe)
  return (
    <Beat
      kicker="From the usual"
      title={`${recipe.title} is in reach`}
      art={
        // The dish, on a plate.
        <div className="beat-stage beat-plate beat-dish">
          <PixelArt frames={[SYMBOLS[badge]]} palette={BADGE_PALETTE} scale={10} label={recipe.title} className="dish-art" />
        </div>
      }
      onDone={onDone}
      doneLabel="Back to the menu"
      extra={
        <Link className="button button-quiet" to={`/recipe/${recipe.id}`}>
          See the dish
        </Link>
      }
    >
      <p>You have learned every skill it needs. It is one of the dishes you order.</p>
      <p>Cook it any time. Cooking it earns the {badgeById(badge).name} badge.</p>
    </Beat>
  )
}
