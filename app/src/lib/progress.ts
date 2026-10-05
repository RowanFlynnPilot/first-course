// The rules of the game. Progress is never stored; it is always derived from
// the cook log, so there is one source of truth.

import { RECIPES, recipeById } from '../curriculum/recipes'
import type { TechniqueId } from '../curriculum/techniques'
import type { Recipe, RecipeContent } from '../curriculum/types'

export type Rating = 1 | 2 | 3

export const RATINGS: readonly { value: Rating; label: string; hint: string }[] = [
  { value: 1, label: 'Rough', hint: 'Edible, maybe. I want another go.' },
  { value: 2, label: 'Decent', hint: 'It worked. I get the idea.' },
  { value: 3, label: 'Nailed it', hint: 'I would serve this to someone.' },
]

export interface CookLog {
  readonly id: string
  readonly recipeId: string
  /** Local calendar date, YYYY-MM-DD. */
  readonly cookedOn: string
  readonly rating: Rating
  readonly notes: string
}

/** A cook at this rating or better teaches the recipe's skills. */
export const LEARNED_RATING: Rating = 2
/** Good cooks needed to master a recipe. One of them must be "Nailed it". */
export const MASTERED_COOKS = 3

export type RecipeState = 'locked' | 'ready' | 'cooked' | 'mastered'

export function learnedTechniques(logs: readonly CookLog[]): ReadonlySet<TechniqueId> {
  const learned = new Set<TechniqueId>()
  for (const recipe of RECIPES) {
    if (goodCooks(recipe, logs) > 0) {
      for (const technique of recipe.teaches) learned.add(technique)
    }
  }
  return learned
}

export function missingTechniques(recipe: Recipe, logs: readonly CookLog[]): TechniqueId[] {
  const learned = learnedTechniques(logs)
  return recipe.requires.filter((technique) => !learned.has(technique))
}

export function goodCooks(recipe: Recipe, logs: readonly CookLog[]): number {
  return logs.filter((log) => log.recipeId === recipe.id && log.rating >= LEARNED_RATING).length
}

export function recipeState(recipe: Recipe, logs: readonly CookLog[]): RecipeState {
  if (missingTechniques(recipe, logs).length > 0) return 'locked'
  const own = logs.filter((log) => log.recipeId === recipe.id)
  if (own.length === 0) return 'ready'
  const nailedOnce = own.some((log) => log.rating === 3)
  if (goodCooks(recipe, logs) >= MASTERED_COOKS && nailedOnce) return 'mastered'
  return 'cooked'
}

/**
 * What the menu suggests cooking next: the first recipe on this week's plan
 * that is unlocked; else, in menu order, the first unlocked recipe without a
 * good cook; failing that, the first not yet mastered.
 */
export function nextRecipe(logs: readonly CookLog[], plan: readonly string[]): Recipe | null {
  // This week's plan first, in the order it was added: those groceries are bought or on the list.
  const planned = plan.map(recipeById).find((recipe) => recipeState(recipe, logs) !== 'locked')
  if (planned !== undefined) return planned
  const open = RECIPES.filter((recipe) => recipeState(recipe, logs) !== 'locked')
  return (
    open.find((recipe) => goodCooks(recipe, logs) === 0) ??
    open.find((recipe) => recipeState(recipe, logs) !== 'mastered') ??
    null
  )
}

/**
 * What changing the log from `before` to `after` takes away: skills that are
 * no longer learned, recipes that lock again, and masteries lost. Editing or
 * deleting a cook re-scores everything, so the cook is told first.
 */
export function progressLost(
  before: readonly CookLog[],
  after: readonly CookLog[],
): { skills: TechniqueId[]; locked: Recipe[]; unmastered: Recipe[] } {
  const had = learnedTechniques(before)
  const has = learnedTechniques(after)
  return {
    skills: [...had].filter((technique) => !has.has(technique)),
    locked: RECIPES.filter((recipe) => recipeState(recipe, before) !== 'locked' && recipeState(recipe, after) === 'locked'),
    unmastered: RECIPES.filter(
      (recipe) => recipeState(recipe, before) === 'mastered' && recipeState(recipe, after) !== 'mastered',
    ),
  }
}

/**
 * The most recent note left on a recipe's cooks, for the next time it is
 * cooked: the latest cooked_on wins, and on the same day the cook saved last.
 */
export function lastNote(recipeId: string, logs: readonly CookLog[]): string | null {
  const noted = logs.filter((log) => log.recipeId === recipeId && log.notes !== '')
  const latest = noted.reduce<CookLog | null>((best, log) => (best === null || log.cookedOn >= best.cookedOn ? log : best), null)
  return latest === null ? null : latest.notes
}

/** The recipe and its content, or a thrown reason it cannot be cooked or logged right now. */
export function cookable(id: string, logs: readonly CookLog[]): { recipe: Recipe; content: RecipeContent } {
  const recipe = recipeById(id)
  if (recipeState(recipe, logs) === 'locked') throw new Error(`${recipe.title} is still locked`)
  return { recipe, content: recipe.content }
}
