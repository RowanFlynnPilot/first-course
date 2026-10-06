// Badges: achievements read off the cook log. Like all other progress they
// are derived, never stored, so an edited or deleted cook can take one away.
// The art for each is in components/badgeArt.ts.

import { RECIPES } from '../curriculum/recipes'
import { DISCIPLINES, type DisciplineId } from '../curriculum/techniques'
import type { Recipe, Tier } from '../curriculum/types'
import { totalKeptCents, type Prices } from './cost'
import { COURSE_NAMES } from './format'
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

/** `dish` is how the dish reads in "Cook ___ at “Decent” or better." */
const usual = (id: string, name: string, dish: string): Omit<Badge, 'id'> => {
  const recipe = RECIPES.find((candidate) => candidate.id === id && candidate.tier === 5)
  if (recipe === undefined) throw new Error(`Badge for ${id}, which is not a dish of the usual`)
  return {
    name,
    how: `Cook ${dish} at “Decent” or better.`,
    earned: (logs) => goodCooks(recipe, logs) > 0,
  }
}

/** One per course: every skill that course teaches is learned. */
const course = (tier: Exclude<Tier, 5>): Omit<Badge, 'id'> => {
  const name = COURSE_NAMES[tier]
  return {
    name: `${name} cleared`,
    how: `Learn every skill the ${name.toLowerCase()} teaches.`,
    earned: (logs) => {
      const learned = learnedTechniques(logs)
      return RECIPES.filter((recipe: Recipe) => recipe.tier === tier).every((recipe) =>
        recipe.teaches.every((technique) => learned.has(technique)),
      )
    },
  }
}

/** One per discipline: every skill of that kind is learned. */
const discipline = (id: DisciplineId): Omit<Badge, 'id'> => {
  const { name } = DISCIPLINES[id]
  return {
    name: `${name} specialist`,
    how: `Learn every ${name.toLowerCase()} skill.`,
    earned: (logs) => {
      const stat = disciplineStats(logs).find((candidate) => candidate.id === id)
      if (stat === undefined) throw new Error(`No discipline ${id}`)
      return stat.learned === stat.skills.length
    },
  }
}

/** Money kept, at today's prices. */
const kept = (dollars: number): Omit<Badge, 'id'> => ({
  name: `$${dollars.toLocaleString('en-US')} kept`,
  how: `Keep $${dollars.toLocaleString('en-US')} by cooking instead of ordering.`,
  earned: (logs, prices) => totalKeptCents(logs, prices) >= dollars * 100,
})

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
  'course-1': course(1),
  'course-2': course(2),
  'course-3': course(3),
  'course-4': course(4),
  'prep-specialist': discipline('prep'),
  'pan-specialist': discipline('pan'),
  'pot-specialist': discipline('pot'),
  'oven-specialist': discipline('oven'),
  'sauce-specialist': discipline('sauce'),
  'palate-specialist': discipline('palate'),
  'kept-100': kept(100),
  'kept-500': kept(500),
  'kept-1000': kept(1000),
  'kept-2500': kept(2500),
  'four-weeks': {
    name: 'Four weeks running',
    how: 'Cook at least once a week, four weeks in a row.',
    earned: (logs) => longestStreak(logs) >= 4,
  },
  'every-recipe': {
    name: 'The whole menu',
    how: 'Cook every recipe on the menu at least once, the usual included.',
    earned: (logs) => RECIPES.every((recipe) => logs.some((log) => log.recipeId === recipe.id)),
  },
  'usual-burger': usual('double-smash-burger', 'Double smash', 'the double smash burger'),
  'usual-chicken-sandwich': usual('crispy-chicken-sandwich', 'Crispy chicken', 'the crispy chicken sandwich'),
  'usual-pizza': usual('margherita-pizza', 'Margherita', 'a margherita pizza'),
  'usual-ragu': usual('ragu-bolognese', 'Ragù', 'the ragù bolognese'),
  'usual-pad-thai': usual('pad-thai', 'Pad thai', 'pad thai'),
  'usual-general-tso': usual('general-tsos-chicken', 'General Tso’s', 'General Tso’s chicken'),
  'usual-tikka-masala': usual('chicken-tikka-masala', 'Tikka masala', 'chicken tikka masala'),
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
