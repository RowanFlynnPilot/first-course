import type { EquipmentId } from './equipment'
import type { IngredientId } from './ingredients'
import type { TechniqueId } from './techniques'

export type Tier = 1 | 2 | 3 | 4 | 5

export type Track = 'foundations' | 'burgers-sandwiches' | 'pizza-pasta' | 'wok-curry'

export interface RecipeIngredient {
  readonly ingredientId: IngredientId
  /** In the ingredient's own unit. */
  readonly qty: number
  readonly prep: string | null
}

export interface Step {
  readonly text: string
  /** The reason behind the step. This is where the teaching happens. */
  readonly why: string | null
  /**
   * A timer where a clock is the right judge. The label names it on the
   * chips cook mode shows for timers running on other steps: "Rice 12:40".
   * `stirEvery` (seconds) is for a simmer the step says to stir on a
   * schedule: cook mode beeps softly and says "stir" each time, on whatever
   * step the cook has moved on to, while the timer runs.
   */
  readonly timer: { readonly seconds: number; readonly label: string; readonly stirEvery?: number } | null
}

export interface Pairing {
  readonly wine: string
  /** The general rule this pairing demonstrates. */
  readonly principle: string
  readonly why: string
}

export interface RecipeContent {
  readonly servings: number
  readonly activeMinutes: number
  readonly totalMinutes: number
  readonly equipment: readonly EquipmentId[]
  readonly ingredients: readonly RecipeIngredient[]
  readonly steps: readonly Step[]
  /**
   * What you would have ordered instead, at its in-app menu price per serving.
   * A side rides on another order, so it carries no delivery fee of its own.
   */
  readonly delivery: { readonly label: string; readonly menuPriceCents: number; readonly side: boolean }
  readonly pairing: Pairing
}

export interface Recipe {
  readonly id: string
  readonly title: string
  /** Tier 5 is "the usual": the dishes the whole menu builds toward. */
  readonly tier: Tier
  readonly track: Track
  readonly blurb: string
  readonly teaches: readonly TechniqueId[]
  readonly requires: readonly TechniqueId[]
  readonly content: RecipeContent
}
