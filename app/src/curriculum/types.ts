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
  readonly timerSeconds: number | null
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
  /** What you would have ordered instead, at its in-app menu price per serving. */
  readonly delivery: { readonly label: string; readonly menuPriceCents: number }
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
  /** null = on the menu but not written yet. */
  readonly content: RecipeContent | null
}
