// Badges: achievements read off the cook log. Like all other progress they
// are derived, never stored, so an edited or deleted cook can take one away.
// The art for each is in components/badgeArt.ts.

import { RECIPES } from '../curriculum/recipes'
import type { Recipe, Tier } from '../curriculum/types'
import { totalKeptCents, type Prices } from './cost'
import { disciplineStats } from './leveling'
import { goodCooks, learnedTechniques, recipeState, type CookLog } from './progress'
import { longestStreak } from './streak'

export interface Badge {
  readonly id: BadgeId
  readonly name: string
  /** How to earn it, shown under the badge on the chef sheet. */
  readonly how: string
  readonly earned: (logs: readonly CookLog[], prices: Prices) => boolean
}

const COURSES: readonly Tier[] = [1, 2, 3, 4]

/** The badge for cooking each dish of the usual, by recipe id. */
export const USUAL_BADGES = {
  'double-smash-burger': 'usual-burger',
  'crispy-chicken-sandwich': 'usual-chicken-sandwich',
  'margherita-pizza': 'usual-pizza',
  'ragu-bolognese': 'usual-ragu',
  'pad-thai': 'usual-pad-thai',
  'general-tsos-chicken': 'usual-general-tso',
  'chicken-tikka-masala': 'usual-tikka-masala',
} as const satisfies Record<string, BadgeId>

export function usualBadge(recipe: Recipe): BadgeId {
  const id = (USUAL_BADGES as Readonly<Record<string, BadgeId>>)[recipe.id]
  if (id === undefined) throw new Error(`${recipe.title} is not a dish of the usual`)
  return id
}

const usual = (id: string, name: string): Omit<Badge, 'id'> => {
  const recipe = RECIPES.find((candidate) => candidate.id === id && candidate.tier === 5)
  if (recipe === undefined) throw new Error(`Badge for ${id}, which is not a dish of the usual`)
  return {
    name,
    how: `Cook ${recipe.title.toLowerCase()} at “Decent” or better.`,
    earned: (logs) => goodCooks(recipe, logs) > 0,
  }
}

const courseLearned = (logs: readonly CookLog[]) => {
  const learned = learnedTechniques(logs)
  return COURSES.some((tier) =>
    RECIPES.filter((recipe: Recipe) => recipe.tier === tier).every((recipe) =>
      recipe.teaches.every((technique) => learned.has(technique)),
    ),
  )
}

const DEFINITIONS = {
  'first-cook': { name: 'First cook', how: 'Log your first cook.', earned: (logs) => logs.length > 0 },
  'nailed-it': {
    name: 'Nailed it',
    how: 'Rate a cook “Nailed it”.',
    earned: (logs) => logs.some((log) => log.rating === 3),
  },
  mastered: {
    name: 'Mastered',
    how: 'Master a recipe: three good cooks, one of them “Nailed it”.',
    earned: (logs) => RECIPES.some((recipe) => recipeState(recipe, logs) === 'mastered'),
  },
  'course-cleared': {
    name: 'Course cleared',
    how: 'Learn every skill one course teaches.',
    earned: courseLearned,
  },
  specialist: {
    name: 'Specialist',
    how: 'Learn every skill of one kind: prep, pan, pot, oven, sauce or palate.',
    earned: (logs) => disciplineStats(logs).some((stat) => stat.learned === stat.skills.length),
  },
  'kept-100': {
    name: '$100 kept',
    how: 'Keep $100 by cooking instead of ordering.',
    earned: (logs, prices) => totalKeptCents(logs, prices) >= 100_00,
  },
  'kept-500': {
    name: '$500 kept',
    how: 'Keep $500 by cooking instead of ordering.',
    earned: (logs, prices) => totalKeptCents(logs, prices) >= 500_00,
  },
  'four-weeks': {
    name: 'Four weeks running',
    how: 'Cook at least once a week, four weeks in a row.',
    earned: (logs) => longestStreak(logs) >= 4,
  },
  'usual-burger': usual('double-smash-burger', 'Double smash'),
  'usual-chicken-sandwich': usual('crispy-chicken-sandwich', 'Crispy chicken'),
  'usual-pizza': usual('margherita-pizza', 'Margherita'),
  'usual-ragu': usual('ragu-bolognese', 'Ragù'),
  'usual-pad-thai': usual('pad-thai', 'Pad thai'),
  'usual-general-tso': usual('general-tsos-chicken', 'General Tso’s'),
  'usual-tikka-masala': usual('chicken-tikka-masala', 'Tikka masala'),
} as const satisfies Record<string, Omit<Badge, 'id'>>

export type BadgeId = keyof typeof DEFINITIONS

/** Every badge, in the order the chef sheet shows them. */
export const BADGES: readonly Badge[] = (Object.keys(DEFINITIONS) as BadgeId[]).map((id) => ({ id, ...DEFINITIONS[id] }))

export function earnedBadges(logs: readonly CookLog[], prices: Prices): BadgeId[] {
  return BADGES.filter((badge) => badge.earned(logs, prices)).map((badge) => badge.id)
}

export function badgeById(id: BadgeId): Badge {
  const badge = BADGES.find((candidate) => candidate.id === id)
  if (badge === undefined) throw new Error(`Unknown badge ${id}`)
  return badge
}
