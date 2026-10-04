// The chef: XP, level, rank and stats. Like progress, none of it is stored.
// Everything here is derived from the cook log, and none of it gates anything:
// recipes unlock through skills, never through level.

import { RECIPES } from '../curriculum/recipes'
import { DISCIPLINES, TECHNIQUES, type DisciplineId, type TechniqueId } from '../curriculum/techniques'
import type { Tier } from '../curriculum/types'
import { learnedTechniques, recipeState, type CookLog, type Rating } from './progress'

/** Only a recipe's first few cooks earn XP, so nobody levels up on grilled cheese alone. */
export const XP_COOKS_PER_RECIPE = 5
export const XP_PER_SKILL = 50
export const XP_PER_MASTERY = 100

/** Harder recipes and better cooks earn more: tier 1 Rough is 10, tier 5 Nailed it is 150. */
export function cookXp(tier: Tier, rating: Rating): number {
  return tier * 10 * rating
}

export function totalXp(logs: readonly CookLog[]): number {
  let xp = learnedTechniques(logs).size * XP_PER_SKILL
  for (const recipe of RECIPES) {
    const counted = logs.filter((log) => log.recipeId === recipe.id).slice(0, XP_COOKS_PER_RECIPE)
    for (const log of counted) xp += cookXp(recipe.tier, log.rating)
    if (recipeState(recipe, logs) === 'mastered') xp += XP_PER_MASTERY
  }
  return xp
}

/** Total XP needed to reach a level: 0, 100, 300, 600, 1000, ... */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1)
}

export function levelForXp(xp: number): number {
  let level = 1
  while (xpForLevel(level + 1) <= xp) level += 1
  return level
}

/** How far through the current level, from 0 to 1. */
export function levelFraction(xp: number): number {
  const level = levelForXp(xp)
  return (xp - xpForLevel(level)) / (xpForLevel(level + 1) - xpForLevel(level))
}

// The kitchen brigade, bottom to top. Rank comes from level alone.
// `costume` is what the promotion moment says changed (see chefSprites.ts).
export const RANKS = [
  { name: 'Dishwasher', fromLevel: 1, costume: 'A bandana and yellow rubber gloves.' },
  { name: 'Prep cook', fromLevel: 3, costume: 'A skull cap and a cobalt apron.' },
  { name: 'Line cook', fromLevel: 6, costume: 'A white jacket and a first toque.' },
  { name: 'Sous chef', fromLevel: 10, costume: 'A taller toque and a yolk neckerchief.' },
  { name: 'Head chef', fromLevel: 14, costume: 'A taller toque still, and cobalt buttons.' },
  { name: 'Executive chef', fromLevel: 18, costume: 'Gold buttons and a gold hat band.' },
] as const

export type RankIndex = 0 | 1 | 2 | 3 | 4 | 5
export const RANK_INDEXES: readonly RankIndex[] = [0, 1, 2, 3, 4, 5]

export function rankIndexForLevel(level: number): RankIndex {
  if (level >= 18) return 5
  if (level >= 14) return 4
  if (level >= 10) return 3
  if (level >= 6) return 2
  if (level >= 3) return 1
  return 0
}

export interface DisciplineStat {
  readonly id: DisciplineId
  readonly skills: readonly { readonly id: TechniqueId; readonly learned: boolean }[]
  readonly learned: number
}

export function disciplineStats(logs: readonly CookLog[]): DisciplineStat[] {
  const learned = learnedTechniques(logs)
  const techniqueIds = Object.keys(TECHNIQUES) as TechniqueId[]
  return (Object.keys(DISCIPLINES) as DisciplineId[]).map((id) => {
    const skills = techniqueIds
      .filter((technique) => TECHNIQUES[technique].discipline === id)
      .map((technique) => ({ id: technique, learned: learned.has(technique) }))
    return { id, skills, learned: skills.filter((skill) => skill.learned).length }
  })
}
