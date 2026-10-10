// The rules of the game. Progress is never stored; it is always derived from
// the cook log, so there is one source of truth.

import { RECIPES, recipeById } from '../curriculum/recipes'
import type { TechniqueId } from '../curriculum/techniques'
import { skillList } from './format'
import type { Recipe, RecipeContent } from '../curriculum/types'

export type Rating = 1 | 2 | 3

export const RATINGS: readonly { value: Rating; label: string; hint: string }[] = [
  { value: 1, label: 'Rough', hint: 'Edible, maybe. I want another go.' },
  { value: 2, label: 'Decent', hint: 'It worked. I get the idea.' },
  { value: 3, label: 'Nailed it', hint: 'I would serve this to someone.' },
]

/** "Rough", "Decent" or "Nailed it": the one place a rating gets its name. */
export function ratingLabel(rating: Rating): string {
  const found = RATINGS.find((option) => option.value === rating)
  if (found === undefined) throw new Error(`No rating ${String(rating)}`)
  return found.label
}

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

/** What one recipe's cooks add up to. */
interface RecipeRecord {
  readonly good: number
  readonly nailed: boolean
  /** The latest day it was cooked, YYYY-MM-DD. */
  readonly last: string
  /** Every cook's rating, in log order. */
  readonly ratings: readonly Rating[]
}

interface Progress {
  readonly learned: ReadonlySet<TechniqueId>
  readonly records: ReadonlyMap<string, RecipeRecord>
}

// Progress is derived, never stored (locked decision 2), and every screen
// asks for it many times a render: each recipe's state needs the learned
// skills, which need every recipe's good cooks. One pass over the log builds
// all of it, kept per log array. The app never changes a log array in place
// (it makes a new one for every change, and freezes it), so a log array's
// progress never goes stale.
const progressByLog = new WeakMap<readonly CookLog[], Progress>()

function progressOf(logs: readonly CookLog[]): Progress {
  const known = progressByLog.get(logs)
  if (known !== undefined) return known
  const building = new Map<string, { good: number; nailed: boolean; last: string; ratings: Rating[] }>()
  for (const log of logs) {
    const record = building.get(log.recipeId) ?? { good: 0, nailed: false, last: log.cookedOn, ratings: [] }
    if (log.rating >= LEARNED_RATING) record.good += 1
    if (log.rating === 3) record.nailed = true
    if (log.cookedOn > record.last) record.last = log.cookedOn
    record.ratings.push(log.rating)
    building.set(log.recipeId, record)
  }
  const learned = new Set<TechniqueId>()
  for (const recipe of RECIPES) {
    if ((building.get(recipe.id)?.good ?? 0) > 0) for (const technique of recipe.teaches) learned.add(technique)
  }
  const progress: Progress = { learned, records: building }
  progressByLog.set(logs, progress)
  return progress
}

export function learnedTechniques(logs: readonly CookLog[]): ReadonlySet<TechniqueId> {
  return progressOf(logs).learned
}

export function missingTechniques(recipe: Recipe, logs: readonly CookLog[]): TechniqueId[] {
  const { learned } = progressOf(logs)
  return recipe.requires.filter((technique) => !learned.has(technique))
}

export function goodCooks(recipe: Recipe, logs: readonly CookLog[]): number {
  return progressOf(logs).records.get(recipe.id)?.good ?? 0
}

/** Every cook's rating of a recipe, in log order. */
export function ratingsOf(recipe: Recipe, logs: readonly CookLog[]): readonly Rating[] {
  return progressOf(logs).records.get(recipe.id)?.ratings ?? []
}

export function recipeState(recipe: Recipe, logs: readonly CookLog[]): RecipeState {
  const { learned, records } = progressOf(logs)
  if (recipe.requires.some((technique) => !learned.has(technique))) return 'locked'
  const record = records.get(recipe.id)
  if (record === undefined) return 'ready'
  if (record.good >= MASTERED_COOKS && record.nailed) return 'mastered'
  return 'cooked'
}

/** A recipe rests this many days after a cook before the menu suggests it again. */
export const REST_DAYS = 7

/** The latest day a recipe was cooked (YYYY-MM-DD), or null. */
export function lastCooked(recipe: Recipe, logs: readonly CookLog[]): string | null {
  return progressOf(logs).records.get(recipe.id)?.last ?? null
}

/** Whole days from one local date to another, both YYYY-MM-DD. */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/**
 * Unlocked recipes in the order the menu suggests them: a dish of the usual
 * that has come into reach without a good cook yet (what everything builds
 * toward), then, in menu order, recipes without a good cook (a Rough one
 * keeps its place; a side never cooked waits behind the meals, so night one
 * is a dinner), then those not yet mastered, then mastered ones, the longest
 * uncooked first. A recipe with a good cook that was cooked at all in the
 * last REST_DAYS goes to the back, so the suggestion is never what was just
 * cooked; one with only Rough cooks skips the rest, since its skill is still
 * the way on.
 */
function suggestionOrder(logs: readonly CookLog[], today: string, exclude: readonly string[]): Recipe[] {
  const open = RECIPES.filter((recipe) => !exclude.includes(recipe.id) && recipeState(recipe, logs) !== 'locked')
  const since = (recipe: Recipe) => lastCooked(recipe, logs) ?? '0000-00-00'
  // A recipe rests once its skill is learned (a good cook, ever), counted from its last cook of any rating.
  const recent = (recipe: Recipe) => {
    const last = lastCooked(recipe, logs)
    return last !== null && goodCooks(recipe, logs) > 0 && daysBetween(last, today) < REST_DAYS
  }
  const rested = open.filter((recipe) => !recent(recipe))
  const ordered = [
    ...rested.filter((recipe) => recipe.tier === 5 && goodCooks(recipe, logs) === 0),
    // A side never cooked waits behind a meal, so night one is a dinner; a Rough cook keeps its place.
    ...rested.filter(
      (recipe) => goodCooks(recipe, logs) === 0 && (lastCooked(recipe, logs) !== null || !recipe.content.delivery.side),
    ),
    ...rested.filter((recipe) => goodCooks(recipe, logs) === 0),
    ...rested.filter((recipe) => goodCooks(recipe, logs) > 0 && recipeState(recipe, logs) !== 'mastered'),
    // Everything mastered: the dish that has waited longest, the usual's before the courses'.
    ...rested
      .filter((recipe) => recipeState(recipe, logs) === 'mastered')
      .sort((a, b) => since(a).localeCompare(since(b)) || Number(b.tier === 5) - Number(a.tier === 5)),
    ...open.filter(recent).sort((a, b) => since(a).localeCompare(since(b))),
  ]
  return ordered.filter((recipe, index) => ordered.indexOf(recipe) === index)
}

/**
 * Whether a recipe can go on this week's plan: it is unlocked, or every
 * recipe on its way there is planned already, so the week's cooks open it
 * before its night comes. One shop then covers a week that runs past what is
 * open today. Planning is not cooking: cookable() still gates that.
 */
export function plannable(recipe: Recipe, logs: readonly CookLog[], plan: readonly string[]): boolean {
  return pathTo(recipe, logs).every((step) => plan.includes(step.id))
}

/**
 * Recipes not on this week's plan that could go on it: the unlocked ones in
 * the order the menu suggests them, then, in menu order, locked ones the plan
 * already opens.
 */
export function readyToPlan(logs: readonly CookLog[], plan: readonly string[], today: string): Recipe[] {
  const ahead = RECIPES.filter(
    (recipe) => !plan.includes(recipe.id) && recipeState(recipe, logs) === 'locked' && plannable(recipe, logs, plan),
  )
  return [...suggestionOrder(logs, today, plan), ...ahead]
}

/**
 * What still stands between a recipe and mastery, as a sentence. The one
 * place it is worded: the log form, the recipe page and the menu all use it.
 */
export function masteryLeft(recipe: Recipe, logs: readonly CookLog[]): string {
  if (recipeState(recipe, logs) === 'mastered') return 'Mastered.'
  const more = Math.max(0, MASTERED_COOKS - goodCooks(recipe, logs))
  const nailed = progressOf(logs).records.get(recipe.id)?.nailed ?? false
  // Without a "Nailed it" yet, the last good cook it needs has to be one.
  if (!nailed && more <= 1) return 'A “Nailed it” masters it.'
  if (nailed) return more === 1 ? 'One more good cook masters it.' : `${more} more good cooks master it.`
  return `${more} more good cooks, one of them “Nailed it”, master it.`
}

/**
 * What this cook's rating decides, said before it is saved: the skills a
 * good cook teaches, or how far the recipe is from mastery.
 */
export function whatTheRatingDecides(recipe: Recipe, logs: readonly CookLog[]): string {
  const learned = learnedTechniques(logs)
  const toLearn = recipe.teaches.filter((technique) => !learned.has(technique))
  if (toLearn.length > 0) return `Decent or better teaches ${skillList(toLearn)}.`
  if (recipeState(recipe, logs) === 'mastered') return 'Mastered already. Every cook still counts toward what you keep.'
  return masteryLeft(recipe, logs)
}

/** What a recipe needs next, in a few words, for its row on the menu. */
export function rowNote(recipe: Recipe, logs: readonly CookLog[]): string {
  const state = recipeState(recipe, logs)
  if (state === 'locked') return `Needs ${skillList(missingTechniques(recipe, logs))}`
  if (state === 'mastered') return 'Mastered'
  if (state === 'ready') return recipe.teaches.length > 0 ? `Teaches ${skillList(recipe.teaches)}` : 'In reach. Cook it any time'
  const good = goodCooks(recipe, logs)
  if (good === 0) {
    return recipe.teaches.length > 0
      ? `Rough so far. A Decent cook teaches ${skillList(recipe.teaches)}`
      : 'Rough so far. Cook it again at Decent or better'
  }
  if (good < MASTERED_COOKS) return `${good} of ${MASTERED_COOKS} good cooks`
  // Row notes go without a full stop.
  return `${good} good cooks. ${masteryLeft(recipe, logs).slice(0, -1)}`
}

/** The one recipe that teaches a skill (locked decision 3). */
export function teacherOf(technique: TechniqueId): Recipe {
  const recipe = RECIPES.find((candidate) => candidate.teaches.includes(technique))
  if (recipe === undefined) throw new Error(`No recipe teaches ${technique}`)
  return recipe
}

/**
 * The recipes to cook, each at Decent or better, before this one opens: the
 * ones that teach what it is missing, and what those are missing, each
 * after the recipes it needs. Empty when it is not locked.
 */
export function pathTo(recipe: Recipe, logs: readonly CookLog[]): Recipe[] {
  const path: Recipe[] = []
  function visit(target: Recipe) {
    for (const technique of missingTechniques(target, logs)) {
      const teacher = teacherOf(technique)
      if (path.includes(teacher)) continue
      visit(teacher)
      path.push(teacher)
    }
  }
  visit(recipe)
  return path
}

/**
 * What the menu suggests cooking next: the first unlocked recipe on this
 * week's plan, groceries bought before groceries still to buy, and among the
 * bought, the one whose meat should be cooked soonest first (`cookBy`, by
 * recipe id: lib/freshness.ts), the rest in the order added; else the first
 * in suggestion order (a dish of the usual just in reach, then a recipe
 * without a good cook, then one not mastered, then the mastered one that has
 * waited longest; anything cooked well in the last week last). There is
 * always one: the eggs and the salad need no skills.
 */
export function nextRecipe(
  logs: readonly CookLog[],
  plan: readonly string[],
  shopped: ReadonlySet<string>,
  cookBy: ReadonlyMap<string, string>,
  today: string,
): Recipe {
  const bought = plan.filter((id) => shopped.has(id))
  // Meat in its days first, the soonest due leading; then what has no day; then meat past its
  // days, which needs a new shop (or "I froze it"), and comes before what is not bought yet.
  const by = (id: string) => cookBy.get(id) ?? null
  const fresh = bought
    .filter((id) => (by(id) ?? '') >= today)
    .toSorted((a, b) => (by(a) ?? '').localeCompare(by(b) ?? ''))
  const past = bought.filter((id) => {
    const day = by(id)
    return day !== null && day < today
  })
  const planned = [
    ...fresh,
    ...bought.filter((id) => by(id) === null),
    ...past,
    ...plan.filter((id) => !shopped.has(id)),
  ]
    .map(recipeById)
    .find((recipe) => recipeState(recipe, logs) !== 'locked')
  if (planned !== undefined) return planned
  const next = suggestionOrder(logs, today, [])[0]
  if (next === undefined) throw new Error('No recipe on the menu is open')
  return next
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

/**
 * A recipe named in the address bar. Anyone can put text there (a link in an
 * email, say), and the error screen shows what is thrown, so the error never
 * repeats it.
 */
export function recipeFromRoute(id: string): Recipe {
  const recipe = RECIPES.find((candidate) => candidate.id === id)
  if (recipe === undefined) throw new Error('That recipe is not on the menu.')
  return recipe
}

/**
 * Whether a recipe can be cooked or logged right now (locked decision 13):
 * its content, or the skills it is missing. A recipe can lock again while
 * its screen is open, when a catch-up brings in a cook deleted elsewhere, so
 * a locked one is a state to show, not an error.
 */
export function cookable(
  id: string,
  logs: readonly CookLog[],
): { recipe: Recipe; content: RecipeContent; missing: null } | { recipe: Recipe; content: null; missing: TechniqueId[] } {
  const recipe = recipeFromRoute(id)
  const missing = missingTechniques(recipe, logs)
  return missing.length > 0 ? { recipe, content: null, missing } : { recipe, content: recipe.content, missing: null }
}
