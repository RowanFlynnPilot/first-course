// Every ingredient has ONE unit. Recipes give quantities in that unit and
// nothing else, so cost and (in Phase 2) the grocery list never convert units.
//
// package.units = how many of that unit are in the package you buy.
// Prices are seeded estimates for a midwestern supermarket, Oct 2026.
// Phase 2 lets a signed-in cook override them per ingredient.
// Salt quantities assume Morton coarse kosher salt.

export type Unit = 'each' | 'clove' | 'slice' | 'bunch' | 'cup' | 'tbsp' | 'tsp' | 'oz' | 'lb'

/** Store order: the grocery list walks the aisles in this order. */
export type Section = 'produce' | 'meat' | 'dairy' | 'bakery' | 'pantry' | 'frozen'

export interface Ingredient {
  readonly name: string
  readonly section: Section
  readonly unit: Unit
  /**
   * Used a little at a time and keeps for weeks once bought, so it belongs in
   * the pantry. Something a recipe uses up whole (a can, a pack of meat) is not.
   */
  readonly staple: boolean
  readonly package: {
    readonly label: string
    readonly priceCents: number
    readonly units: number
  }
  /**
   * Raw meat only: the internal temperature, in °F, that makes it safe. Any
   * recipe using it must name this temperature, list the thermometer and say
   * to wash your hands (curriculum.test.ts).
   */
  readonly safeTempF?: number
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
  'yellow-onion': {
    name: 'Yellow onion',
    section: 'produce',
    unit: 'each',
    staple: false,
    package: { label: '1 yellow onion', priceCents: 99, units: 1 },
  },
  ginger: {
    name: 'Fresh ginger, grated',
    section: 'produce',
    unit: 'tbsp',
    staple: false,
    // A 1-inch piece grates to about 1 tablespoon.
    package: { label: '1 knob, about 3 inches', priceCents: 99, units: 3 },
  },
  'russet-potatoes': {
    name: 'Russet potatoes',
    section: 'produce',
    unit: 'lb',
    staple: false,
    package: { label: '5 lb bag', priceCents: 449, units: 5 },
  },

  // Meat
  kielbasa: {
    name: 'Smoked sausage (kielbasa), fully cooked',
    section: 'meat',
    unit: 'each',
    staple: false,
    package: { label: '13 oz rope', priceCents: 449, units: 1 },
  },
  'chicken-thighs': {
    name: 'Boneless, skinless chicken thighs',
    section: 'meat',
    unit: 'lb',
    staple: false,
    package: { label: '1.5 lb pack', priceCents: 599, units: 1.5 },
    safeTempF: 165,
  },
  'ground-beef': {
    name: 'Ground beef, 80% lean',
    section: 'meat',
    unit: 'lb',
    staple: false,
    package: { label: '1 lb pack', priceCents: 649, units: 1 },
    safeTempF: 160,
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
  'american-cheese': {
    name: 'American cheese',
    section: 'dairy',
    unit: 'slice',
    staple: false,
    package: { label: '12-slice pack', priceCents: 299, units: 12 },
  },
  'pasteurized-eggs': {
    // For sauces where the yolk stays raw. Pasteurized in the shell, sold next to the other eggs.
    name: 'Pasteurized large egg',
    section: 'dairy',
    unit: 'each',
    staple: false,
    package: { label: '1 dozen, pasteurized in the shell', priceCents: 549, units: 12 },
  },

  // Bakery
  'sandwich-bread': {
    name: 'Sandwich bread',
    section: 'bakery',
    unit: 'slice',
    staple: false,
    package: { label: '1 loaf (about 20 slices)', priceCents: 349, units: 20 },
  },
  'burger-buns': {
    name: 'Burger buns',
    section: 'bakery',
    unit: 'each',
    staple: false,
    package: { label: '8-pack', priceCents: 299, units: 8 },
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
  'crushed-tomatoes': {
    name: 'Crushed tomatoes',
    section: 'pantry',
    unit: 'oz',
    staple: false,
    package: { label: '28 oz can', priceCents: 249, units: 28 },
  },
  'tomato-paste': {
    name: 'Tomato paste',
    section: 'pantry',
    unit: 'tbsp',
    staple: false,
    package: { label: '6 oz can (about 10 tbsp)', priceCents: 109, units: 10 },
  },
  'chicken-broth': {
    name: 'Low-sodium chicken broth',
    section: 'pantry',
    unit: 'cup',
    staple: false,
    package: { label: '32 oz carton (4 cups)', priceCents: 279, units: 4 },
  },
  'red-lentils': {
    name: 'Red lentils',
    section: 'pantry',
    unit: 'cup',
    staple: true,
    package: { label: '1 lb bag (about 2¼ cups)', priceCents: 279, units: 2.25 },
  },
  chickpeas: {
    name: 'Chickpeas, 15.5 oz can',
    section: 'pantry',
    unit: 'each',
    staple: false,
    package: { label: '15.5 oz can', priceCents: 109, units: 1 },
  },
  turmeric: {
    name: 'Ground turmeric',
    section: 'pantry',
    unit: 'tsp',
    staple: true,
    package: { label: '1 oz jar', priceCents: 299, units: 10 },
  },
  'cumin-seeds': {
    name: 'Cumin seeds',
    section: 'pantry',
    unit: 'tsp',
    staple: true,
    package: { label: '1.5 oz jar', priceCents: 399, units: 20 },
  },
  coriander: {
    name: 'Ground coriander',
    section: 'pantry',
    unit: 'tsp',
    staple: true,
    package: { label: '1.25 oz jar', priceCents: 349, units: 18 },
  },
  'garam-masala': {
    name: 'Garam masala',
    section: 'pantry',
    unit: 'tsp',
    staple: true,
    package: { label: '1.5 oz jar', priceCents: 449, units: 18 },
  },
  sugar: {
    name: 'Granulated sugar',
    section: 'pantry',
    unit: 'tbsp',
    staple: true,
    package: { label: '4 lb bag', priceCents: 399, units: 145 },
  },
  cornstarch: {
    name: 'Cornstarch',
    section: 'pantry',
    unit: 'tbsp',
    staple: true,
    package: { label: '16 oz box', priceCents: 249, units: 56 },
  },
  'oyster-sauce': {
    name: 'Oyster sauce',
    section: 'pantry',
    unit: 'tbsp',
    staple: true,
    package: { label: '9 oz bottle', priceCents: 349, units: 14 },
  },
  'dill-pickles': {
    name: 'Dill pickle chips',
    section: 'pantry',
    unit: 'each',
    staple: true,
    package: { label: '16 oz jar (about 60 chips)', priceCents: 299, units: 60 },
  },
  ketchup: {
    name: 'Ketchup',
    section: 'pantry',
    unit: 'tbsp',
    staple: true,
    package: { label: '20 oz bottle', priceCents: 279, units: 33 },
  },
  'dijon-mustard': {
    name: 'Dijon mustard',
    section: 'pantry',
    unit: 'tsp',
    staple: true,
    package: { label: '8 oz jar', priceCents: 299, units: 45 },
  },

  // Frozen
  'frozen-peas-carrots': {
    name: 'Frozen peas and carrots',
    section: 'frozen',
    unit: 'cup',
    staple: true,
    package: { label: '12 oz bag (about 2½ cups)', priceCents: 179, units: 2.5 },
  },
} as const satisfies Record<string, Ingredient>

export type IngredientId = keyof typeof INGREDIENTS
