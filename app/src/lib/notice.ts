// What one cook earned: short lines for the menu to show once, plus the
// moments the menu stages around them (a level-up, a promotion, a dish of
// the usual coming into reach) and the badges it earned.

import { RECIPES } from '../curriculum/recipes'
import type { Recipe } from '../curriculum/types'
import { earnedBadges, type BadgeId } from './badges'
import { unlockedExtras, type ExtraId } from './extras'
import { keptPerCookCents, type Prices } from './cost'
import { formatCents, skillList } from './format'
import { levelForXp, rankIndexForLevel, RANKS, totalXp, XP_COOKS_PER_RECIPE, type RankIndex } from './leveling'
import { learnedTechniques, ratingLabel, recipeState, type CookLog } from './progress'

export interface CookNotice {
  readonly lines: readonly string[]
  readonly cookedId: string
  /** XP before this cook, so the bar can fill from there. */
  readonly xpBefore: number
  /** The new level, when this cook reached one. */
  readonly levelUp: number | null
  /** The new rank, when this cook crossed into one. */
  readonly promotion: RankIndex | null
  /** Badges this cook earned. */
  readonly badges: readonly BadgeId[]
  /** Dishes of the usual whose skills are now all learned. Each one is its own moment, not a line. */
  readonly usualUnlocked: readonly Recipe[]
  /** Course recipes this cook unlocked, which the menu links to. */
  readonly readyNow: readonly Recipe[]
  /** Extras this cook earned, which the menu offers to put on. */
  readonly newExtras: readonly ExtraId[]
}

export function cookNotice(
  recipe: Recipe,
  before: readonly CookLog[],
  log: CookLog,
  chefName: string,
  prices: Prices,
): CookNotice {
  const after = [...before, log]
  const lines: string[] = []

  const xpBefore = totalXp(before)
  const xpAfter = totalXp(after)
  const levelBefore = levelForXp(xpBefore)
  const levelAfter = levelForXp(xpAfter)
  // The first line says what was cooked, so the notice reads on its own.
  const rated = `${recipe.title}: ${ratingLabel(log.rating)}.`
  if (xpAfter === xpBefore) {
    lines.push(`${rated} No XP this time. A recipe pays out for its first ${XP_COOKS_PER_RECIPE} cooks.`)
  } else {
    lines.push(`${rated} +${xpAfter - xpBefore} XP.${levelAfter > levelBefore ? ` Level ${levelAfter}.` : ''}`)
  }
  const rankAfter = rankIndexForLevel(levelAfter)
  const promoted = rankAfter > rankIndexForLevel(levelBefore)
  if (promoted) lines.push(`${chefName} is promoted to ${RANKS[rankAfter].name.toLowerCase()}.`)

  lines.push(`Kept ${formatCents(keptPerCookCents(recipe.content, prices))} by not ordering.`)

  const hadLearned = learnedTechniques(before)
  const hasLearned = learnedTechniques(after)
  const newSkills = [...hasLearned].filter((technique) => !hadLearned.has(technique))
  if (newSkills.length > 0) lines.push(`Learned ${skillList(newSkills)}.`)

  const stillUnlearned = recipe.teaches.filter((technique) => !hasLearned.has(technique))
  if (stillUnlearned.length > 0) {
    lines.push(`Cook it again at “Decent” or better to learn ${skillList(stillUnlearned)}.`)
  }

  if (recipeState(recipe, before) !== 'mastered' && recipeState(recipe, after) === 'mastered') {
    lines.push(`${recipe.title} is mastered.`)
  }

  const unlocked = RECIPES.filter(
    (other) => recipeState(other, before) === 'locked' && recipeState(other, after) !== 'locked',
  )
  const usualUnlocked = unlocked.filter((other) => other.tier === 5)

  const hadBadges = new Set(earnedBadges(before, prices))
  const badges = earnedBadges(after, prices).filter((id) => !hadBadges.has(id))

  const hadExtras = new Set(unlockedExtras(before))

  return {
    lines,
    cookedId: recipe.id,
    xpBefore,
    levelUp: levelAfter > levelBefore ? levelAfter : null,
    promotion: promoted ? rankAfter : null,
    badges,
    usualUnlocked,
    readyNow: unlocked.filter((other) => other.tier !== 5),
    newExtras: unlockedExtras(after).filter((other) => !hadExtras.has(other)),
  }
}
