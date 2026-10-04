// What one cook earned, as short lines for the menu to show once.

import { RECIPES } from '../curriculum/recipes'
import type { Recipe } from '../curriculum/types'
import { keptPerCookCents } from './cost'
import { formatCents, listOf, skillList } from './format'
import { levelForXp, rankIndexForLevel, RANKS, totalXp, XP_COOKS_PER_RECIPE } from './leveling'
import { learnedTechniques, recipeState, type CookLog } from './progress'

export interface CookNotice {
  readonly lines: readonly string[]
  readonly cookedId: string
  /** XP before this cook, so the bar can fill from there. */
  readonly xpBefore: number
}

export function cookNotice(recipe: Recipe, before: readonly CookLog[], log: CookLog, chefName: string): CookNotice {
  if (recipe.content === null) throw new Error(`Logged a cook for unwritten recipe ${recipe.id}`)
  const after = [...before, log]
  const lines: string[] = []

  const xpBefore = totalXp(before)
  const xpAfter = totalXp(after)
  const levelBefore = levelForXp(xpBefore)
  const levelAfter = levelForXp(xpAfter)
  if (xpAfter === xpBefore) {
    lines.push(`No XP this time. A recipe pays out for its first ${XP_COOKS_PER_RECIPE} cooks.`)
  } else {
    lines.push(`+${xpAfter - xpBefore} XP.${levelAfter > levelBefore ? ` Level ${levelAfter}.` : ''}`)
  }
  const rankAfter = rankIndexForLevel(levelAfter)
  if (rankAfter > rankIndexForLevel(levelBefore)) {
    lines.push(`${chefName} is promoted to ${RANKS[rankAfter].name.toLowerCase()}.`)
  }

  lines.push(`Kept ${formatCents(keptPerCookCents(recipe.content))} by not ordering.`)

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
  const written = unlocked.filter((other) => other.content !== null).map((other) => other.title)
  const unwritten = unlocked.filter((other) => other.content === null).map((other) => other.title)
  if (written.length > 0) lines.push(`Now ready to cook: ${listOf(written)}.`)
  if (unwritten.length > 0) lines.push(`Unlocked, but not written yet: ${listOf(unwritten)}.`)

  return { lines, cookedId: recipe.id, xpBefore }
}
