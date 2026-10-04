// Every ingredient has ONE unit. Recipes give quantities in that unit and
// nothing else, so cost and (in Phase 2) the grocery list never convert units.
//
// package.units = how many of that unit are in the package you buy.
// Prices are seeded estimates for a midwestern supermarket, Oct 2026.
// Phase 2 lets a signed-in cook override them per ingredient.
// Salt quantities assume Morton coarse kosher salt.

export type Unit = 'each' | 'clove' | 'slice' | 'bunch' | 'cup' | 'tbsp' | 'tsp' | 'oz' | 'lb'

export type Section = 'produce' | 'meat' | 'dairy' | 'bakery' | 'pantry'

export interface Ingredient {
  readonly name: string
  readonly section: Section
  readonly unit: Unit
  /** Keeps for weeks once bought; Phase 2 pantry candidates. */
  readonly staple: boolean
  readonly package: {
    readonly label: string
    readonly priceCents: number
    readonly units: number
  }
}

export const INGREDIENTS = {
  // Produce
  tomato: {
    name: 'Tomato',
    section: 'produce',
    unit: 'each',
    staple: false,
    package: { label: '1 vine tomato', priceCents: 90, units: 1 },
  },
  cucumber: {
    name: 'Cucumber',
    section: 'produce',
    unit: 'each',
    staple: false,
    package: { label: '1 cucumber', priceCents: 149, units: 1 },
  },
  'red-onion': {
    name: 'Red onion',
    section: 'produce',
    unit: 'each',
    staple: false,
    package: { label: '1 red onion', priceCents: 129, units: 1 },
  },
  lemon: {
    name: 'Lemon',
    section: 'produce',
    unit: 'each',
    staple: false,
    package: { label: '1 lemon', priceCents: 79, units: 1 },
  },
  garlic: {
    name: 'Garlic',
    section: 'produce',
    unit: 'clove',
    staple: false,
    package: { label: '1 head', priceCents: 79, units: 10 },
  },
  parsley: {
    name: 'Flat-leaf parsley',
    section: 'produce',
    unit: 'bunch',
    staple: false,
    package: { label: '1 bunch', priceCents: 149, units: 1 },
  },
  scallion: {
    name: 'Scallion',
    section: 'produce',
    unit: 'each',
    staple: false,
    package: { label: '1 bunch (about 6)', priceCents: 129, units: 6 },
  },
  'baby-potatoes': {
    name: 'Baby potatoes',
    section: 'produce',
    unit: 'lb',
    staple: false,
    package: { label: '1.5 lb bag', priceCents: 399, units: 1.5 },
  },
  broccoli: {
    name: 'Broccoli crown',
    section: 'produce',
    unit: 'each',
    staple: false,
    package: { label: '1 crown', priceCents: 199, units: 1 },
  },
  'bell-pepper': {
    name: 'Bell pepper',
    section: 'produce',
    unit: 'each',
    staple: false,
    package: { label: '1 pepper', priceCents: 129, units: 1 },
  },

  // Meat
  kielbasa: {
    name: 'Smoked sausage (kielbasa), fully cooked',
    section: 'meat',
    unit: 'each',
    staple: false,
    package: { label: '13 oz rope', priceCents: 449, units: 1 },
  },

  // Dairy
  eggs: {
    name: 'Large egg',
    section: 'dairy',
    unit: 'each',
    staple: false,
    package: { label: '1 dozen', priceCents: 349, units: 12 },
  },
  butter: {
    name: 'Salted butter',
    section: 'dairy',
    unit: 'tbsp',
    staple: true,
    package: { label: '1 lb (4 sticks)', priceCents: 449, units: 32 },
  },
  feta: {
    name: 'Feta',
    section: 'dairy',
    unit: 'oz',
    staple: false,
    package: { label: '6 oz tub, crumbled', priceCents: 449, units: 6 },
  },
  parmesan: {
    name: 'Parmesan',
    section: 'dairy',
    unit: 'oz',
    staple: false,
    package: { label: '5 oz wedge', priceCents: 599, units: 5 },
  },
  cheddar: {
    name: 'Sharp cheddar',
    section: 'dairy',
    unit: 'oz',
    staple: false,
    package: { label: '8 oz block', priceCents: 349, units: 8 },
  },

  // Bakery
  'sandwich-bread': {
    name: 'Sandwich bread',
    section: 'bakery',
    unit: 'slice',
    staple: false,
    package: { label: '1 loaf (about 20 slices)', priceCents: 349, units: 20 },
  },

  // Pantry
  'olive-oil': {
    name: 'Extra-virgin olive oil',
    section: 'pantry',
    unit: 'tbsp',
    staple: true,
    package: { label: '16.9 fl oz bottle', priceCents: 899, units: 33 },
  },
  'neutral-oil': {
    name: 'Neutral oil (canola or vegetable)',
    section: 'pantry',
    unit: 'tbsp',
    staple: true,
    package: { label: '48 fl oz bottle', priceCents: 499, units: 96 },
  },
  'sesame-oil': {
    name: 'Toasted sesame oil',
    section: 'pantry',
    unit: 'tsp',
    staple: true,
    package: { label: '5 fl oz bottle', priceCents: 499, units: 30 },
  },
  'soy-sauce': {
    name: 'Soy sauce',
    section: 'pantry',
    unit: 'tbsp',
    staple: true,
    package: { label: '10 fl oz bottle', priceCents: 349, units: 20 },
  },
  'kosher-salt': {
    name: 'Kosher salt',
    section: 'pantry',
    unit: 'tsp',
    staple: true,
    package: { label: '3 lb box', priceCents: 449, units: 280 },
  },
  'black-pepper': {
    name: 'Black pepper',
    section: 'pantry',
    unit: 'tsp',
    staple: true,
    package: { label: '1.24 oz grinder', priceCents: 399, units: 16 },
  },
  'red-pepper-flakes': {
    name: 'Red pepper flakes',
    section: 'pantry',
    unit: 'tsp',
    staple: true,
    package: { label: '1.5 oz jar', priceCents: 299, units: 22 },
  },
  spaghetti: {
    name: 'Spaghetti',
    section: 'pantry',
    unit: 'oz',
    staple: true,
    package: { label: '16 oz box', priceCents: 179, units: 16 },
  },
  'jasmine-rice': {
    name: 'Jasmine rice',
    section: 'pantry',
    unit: 'cup',
    staple: true,
    package: { label: '2 lb bag', priceCents: 399, units: 4.5 },
  },
} as const satisfies Record<string, Ingredient>

export type IngredientId = keyof typeof INGREDIENTS
