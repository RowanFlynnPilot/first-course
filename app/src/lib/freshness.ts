// How long a bought recipe's meat keeps: the day to cook it by, from the day
// its groceries were bought (plan_items.shopped_on, 00009) and how long each
// meat keeps in the fridge (fridgeDays in ingredients.ts). Raw chicken and
// ground beef keep two days, so a Sunday shop's chicken is a Tuesday dinner,
// or goes in the freezer that night.

import { INGREDIENTS, type Ingredient } from '../curriculum/ingredients'
import { recipeById } from '../curriculum/recipes'
import type { Recipe } from '../curriculum/types'
import { formatCookedOn } from './format'

/** The local date `days` after another, both YYYY-MM-DD. */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}

/** Meat that keeps longer than this outlasts the week it was planned for, so it gets no cook-by day. */
export const WEEK_DAYS = 7

/**
 * The day a recipe bought on `boughtOn` should be cooked by, while its meat
 * is fresh, or null when it has no meat that keeps a week or less (a smoked
 * sausage keeps two weeks).
 */
export function cookBy(recipe: Recipe, boughtOn: string): string | null {
  const days = recipe.content.ingredients.flatMap(({ ingredientId }) => {
    const ingredient: Ingredient = INGREDIENTS[ingredientId]
    return ingredient.section === 'meat' && ingredient.fridgeDays <= WEEK_DAYS ? [ingredient.fridgeDays] : []
  })
  return days.length === 0 ? null : addDays(boughtOn, Math.min(...days))
}

/** The cook-by day of each bought recipe on the plan that has meat, by recipe id. */
export function cookByDates(shoppedOn: ReadonlyMap<string, string>): Map<string, string> {
  return new Map(
    [...shoppedOn].flatMap(([id, boughtOn]) => {
      const by = cookBy(recipeById(id), boughtOn)
      return by === null ? [] : [[id, by] as const]
    }),
  )
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * A day near today, as a cook says it: "today", "tomorrow", "yesterday", a
 * weekday within the week either side ("Tuesday"), "Oct 14" further off this
 * year, or "Oct 14, 2025" in another.
 */
export function dayName(date: string, today: string): string {
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  if (Math.abs(days) < 7) return WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()] ?? date
  const full = formatCookedOn(date)
  return date.slice(0, 4) === today.slice(0, 4) ? full.replace(/,? \d{4}$/, '') : full
}

/** Groceries with no meat that keeps only days are asked about once they are this many days old. */
export const ASK_AFTER_DAYS = 7

/**
 * How a bought recipe's groceries stand. `fresh`: ready to cook. `past`: its
 * meat is past the day to cook it by. `frozen`: bought with meat that keeps
 * only days, and no date, because the cook said "I froze it" (or bought it
 * before dates were kept). `old`: bought more than ASK_AFTER_DAYS ago, with no
 * such meat, so the app asks whether they are still there.
 */
export type Bought = 'fresh' | 'past' | 'frozen' | 'old'

export function boughtState(recipe: Recipe, boughtOn: string | undefined, today: string): Bought {
  const keepsDays = cookBy(recipe, today) !== null
  if (boughtOn === undefined) return keepsDays ? 'frozen' : 'fresh'
  const by = cookBy(recipe, boughtOn)
  if (by !== null) return by < today ? 'past' : 'fresh'
  return addDays(boughtOn, ASK_AFTER_DAYS) < today ? 'old' : 'fresh'
}

/** What a bought recipe's plan line says, by how its groceries stand (boughtState). */
export function boughtNote(recipe: Recipe, boughtOn: string | undefined, today: string): string {
  const state = boughtState(recipe, boughtOn, today)
  if (state === 'frozen') return 'Groceries bought, the meat in the freezer'
  if (boughtOn === undefined) return 'Groceries bought'
  if (state === 'past') return `Bought ${dayName(boughtOn, today)}. Unless you froze it, the meat is past its days`
  if (state === 'old') return `Bought ${dayName(boughtOn, today)}. Still have these?`
  const by = cookBy(recipe, boughtOn)
  if (by === null) return 'Groceries bought'
  return by === today ? 'Groceries bought. Cook it today' : `Groceries bought. Cook it by ${dayName(by, today)}`
}
