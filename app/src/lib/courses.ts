// Filing things under the course that first needs them. The kit, the
// pantry's staples and the spice guide all do it, so a beginner meets week
// one's things first, and none of them can disagree with the recipes.

import { RECIPES } from '../curriculum/recipes'
import type { Recipe, Tier } from '../curriculum/types'
import { COURSE_NAMES } from './format'

const TIERS: readonly Tier[] = [1, 2, 3, 4, 5]

/** The first course with a recipe that `uses` something. Throws for something no recipe uses: `what` names it. */
export function firstTierUsing(uses: (recipe: Recipe) => boolean, what: string): Tier {
  const tiers = RECIPES.filter(uses).map((recipe) => recipe.tier)
  if (tiers.length === 0) throw new Error(`No recipe uses ${what}`)
  return Math.min(...tiers) as Tier
}

/** Items under the course that first needs each, in course order, each course keeping the items' own order. Courses that add none are left out. */
export function byFirstCourse<T>(items: readonly T[], tierOf: (item: T) => Tier): { tier: Tier; items: T[] }[] {
  const tiers = new Map(items.map((item) => [item, tierOf(item)] as const))
  return TIERS.map((tier) => ({ tier, items: items.filter((item) => tiers.get(item) === tier) })).filter(
    (course) => course.items.length > 0,
  )
}

/** The heading of a course's things: "To start", "New for the second course", "For the usual". */
export function courseHeading(tier: Tier): string {
  if (tier === 1) return 'To start'
  if (tier === 5) return 'For the usual'
  return `New for the ${COURSE_NAMES[tier].toLowerCase()}`
}
