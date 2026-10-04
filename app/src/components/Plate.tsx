// The signature element: an enamel plate whose yolk grows with every good cook.

import { MASTERED_COOKS, type RecipeState } from '../lib/progress'

const STATE_LABELS: Record<RecipeState, string> = {
  locked: 'Locked',
  ready: 'Ready to cook',
  cooked: 'Cooked',
  mastered: 'Mastered',
}

export function Plate({
  state,
  goodCooks,
  size,
  celebrate = false,
}: {
  state: RecipeState
  goodCooks: number
  size: number
  celebrate?: boolean
}) {
  // Radius 5, 8, 11 for one, two, three good cooks.
  const yolk = goodCooks === 0 ? 0 : 2 + 3 * Math.min(goodCooks, MASTERED_COOKS)
  return (
    <svg
      className={`plate plate-${state}${celebrate ? ' plate-celebrate' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={STATE_LABELS[state]}
    >
      <circle className="plate-rim" cx="24" cy="24" r="21" />
      <circle className="plate-well" cx="24" cy="24" r="14" />
      {state === 'cooked' && yolk === 0 && <circle className="plate-attempt" cx="24" cy="24" r="5" />}
      {yolk > 0 && <circle className="plate-yolk" cx="24" cy="24" r={yolk} />}
      {state === 'mastered' && <circle className="plate-mastered" cx="24" cy="24" r="17.5" />}
    </svg>
  )
}
