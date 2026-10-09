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

interface IngredientBase {
  /** The product, as the grocery list and the pantry name it, and as a recipe lists one of it or less. */
  readonly name: string
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
   * No recipe uses it any more. It stays, because a cook's pantry or prices
   * may hold its id, and loading throws on an id that is gone (ids.test.ts).
   */
  readonly retired?: true
}

/**
 * Everything from the meat case says how it is made safe, so no recipe check
 * can skip a meat that forgot to say (curriculum.test.ts):
 * - a number: raw meat, safe at that internal temperature in °F. A recipe
 *   using it lists the thermometer, checks this temperature the whole way,
 *   says to wash your hands, and cleans what it touched in hot, soapy water.
 * - 'cured': raw pork in the package that is cooked until crisp, so crisp is
 *   the cue and there is no thermometer check (bacon). Hands, board and knife
 *   still get washed.
 * - 'fully-cooked': only needs heating through (smoked sausage). No raw-meat
 *   routine.
 */
export type MeatSafety = number | 'cured' | 'fully-cooked'

interface Meat extends IngredientBase {
  readonly section: 'meat'
  readonly safeTempF: MeatSafety
  /**
   * Days it keeps in the fridge from the day it is bought, unopened, by the
   * USDA's cold storage chart, at the short end: raw poultry and ground meat
   * 1 to 2 days, so 2; a whole cut of beef 3 to 5, so 3; bacon a week; a
   * fully cooked smoked sausage 2 weeks. The menu says to cook a bought
   * recipe by then, or freeze its meat (lib/freshness.ts).
   */
  readonly fridgeDays: number
}

interface NotMeat extends IngredientBase {
  readonly section: Exclude<Section, 'meat'>
  readonly safeTempF?: never
}

/**
 * Counted ingredients read after their count in a recipe's list, so each one
 * has a plural for more than one: "3 Large eggs", but "½ Lemon".
 */
interface Counted {
  readonly unit: 'each'
  readonly plural: string
}

interface Measured {
  readonly unit: Exclude<Unit, 'each'>
  readonly plural?: never
}

export type Ingredient = (Meat | NotMeat) & (Counted | Measured)

export const INGREDIENTS = {
  // Produce
  tomato: {
    name: 'Tomato',
    plural: 'Tomatoes',
    section: 'produce',
    unit: 'each',
    staple: false,
    package: { label: '1 vine tomato', priceCents: 90, units: 1 },
  },
  cucumber: {
    name: 'Cucumber',
    plural: 'Cucumbers',
    section: 'produce',
    unit: 'each',
    staple: false,
    package: { label: '1 cucumber', priceCents: 149, units: 1 },
  },
  'red-onion': {
    name: 'Red onion',
    plural: 'Red onions',
    section: 'produce',
    unit: 'each',
    staple: false,
    package: { label: '1 red onion', priceCents: 129, units: 1 },
  },
  lemon: {
    name: 'Lemon',
    plural: 'Lemons',
    section: 'produce',
    unit: 'each',
    staple: false,
    package: { label: '1 lemon', priceCents: 79, units: 1 },
  },
  garlic: {
    name: 'Garlic',
    section: 'produce',
    unit: 'clove',
    staple: true,
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
    plural: 'Scallions',
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
    plural: 'Broccoli crowns',
    section: 'produce',
    unit: 'each',
    staple: false,
    package: { label: '1 crown', priceCents: 199, units: 1 },
  },
  'bell-pepper': {
    name: 'Bell pepper',
    plural: 'Bell peppers',
    section: 'produce',
    unit: 'each',
    staple: false,
    package: { label: '1 pepper', priceCents: 129, units: 1 },
  },
  'yellow-onion': {
    name: 'Yellow onion',
    plural: 'Yellow onions',
    section: 'produce',
    unit: 'each',
    staple: false,
    package: { label: '1 yellow onion', priceCents: 99, units: 1 },
  },
  ginger: {
    name: 'Fresh ginger',
    section: 'produce',
    unit: 'tbsp',
    staple: true,
    // A 1-inch piece grates to about 1 tablespoon.
    package: { label: '1 knob, about 3 inches', priceCents: 99, units: 3 },
  },
  'russet-potatoes': {
    name: 'Russet potatoes',
    section: 'produce',
    unit: 'lb',
    staple: false,
    package: { label: '1 large russet', priceCents: 90, units: 0.75 },
  },
  lime: {
    name: 'Lime',
    plural: 'Limes',
    section: 'produce',
    unit: 'each',
    staple: false,
    package: { label: '1 lime', priceCents: 50, units: 1 },
  },
  basil: {
    name: 'Fresh basil',
    section: 'produce',
    unit: 'bunch',
    staple: false,
    package: { label: '1 bunch', priceCents: 249, units: 1 },
  },
  carrot: {
    name: 'Carrot',
    plural: 'Carrots',
    section: 'produce',
    unit: 'each',
    staple: false,
    package: { label: '1 lb bag (about 6)', priceCents: 129, units: 6 },
  },
  'bean-sprouts': {
    name: 'Bean sprouts',
    section: 'produce',
    unit: 'cup',
    staple: false,
    package: { label: '8 oz bag (about 4 cups)', priceCents: 199, units: 4 },
  },

  // Meat
  kielbasa: {
    name: 'Fully cooked smoked sausage (kielbasa)',
    plural: 'Fully cooked smoked sausages (kielbasa)',
    section: 'meat',
    unit: 'each',
    staple: false,
    package: { label: '13 oz rope', priceCents: 449, units: 1 },
    safeTempF: 'fully-cooked',
    fridgeDays: 14,
  },
  'chicken-thighs': {
    name: 'Boneless skinless chicken thighs',
    section: 'meat',
    unit: 'lb',
    staple: false,
    package: { label: '1.5 lb pack', priceCents: 599, units: 1.5 },
    safeTempF: 165,
    fridgeDays: 2,
  },
  'ground-beef': {
    name: '80% lean ground beef',
    section: 'meat',
    unit: 'lb',
    staple: false,
    package: { label: '1 lb pack', priceCents: 649, units: 1 },
    safeTempF: 160,
    fridgeDays: 2,
  },
  'chicken-breasts': {
    name: 'Boneless skinless chicken breasts',
    section: 'meat',
    unit: 'lb',
    staple: false,
    package: { label: '1.5 lb pack (about 2 large)', priceCents: 749, units: 1.5 },
    safeTempF: 165,
    fridgeDays: 2,
  },
  'flank-steak': {
    // A whole cut, not ground: safe at 145°F, where ground beef needs 160°F.
    name: 'Flank steak',
    section: 'meat',
    unit: 'lb',
    staple: false,
    package: { label: '1 steak, about 1¼ lb', priceCents: 1249, units: 1.25 },
    safeTempF: 145,
    fridgeDays: 3,
  },
  bacon: {
    // Thick-cut runs about 1½ oz a slice, so the pack is about 11 slices.
    name: 'Thick-cut bacon',
    section: 'meat',
    unit: 'oz',
    staple: false,
    package: { label: '16 oz pack', priceCents: 749, units: 16 },
    safeTempF: 'cured',
    fridgeDays: 7,
  },

  // Dairy
  eggs: {
    name: 'Large egg',
    plural: 'Large eggs',
    section: 'dairy',
    unit: 'each',
    staple: true,
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
    package: { label: '4 oz tub, crumbled', priceCents: 349, units: 4 },
  },
  parmesan: {
    name: 'Parmesan',
    section: 'dairy',
    unit: 'oz',
    staple: true,
    package: { label: '5 oz wedge', priceCents: 599, units: 5 },
  },
  cheddar: {
    // A wrapped block keeps for weeks in the fridge, and a grilled cheese uses a quarter of it.
    name: 'Sharp cheddar',
    section: 'dairy',
    unit: 'oz',
    staple: true,
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
    plural: 'Pasteurized large eggs',
    section: 'dairy',
    unit: 'each',
    staple: false,
    package: { label: '1 dozen, pasteurized in the shell', priceCents: 549, units: 12 },
  },
  mozzarella: {
    name: 'Low-moisture mozzarella',
    section: 'dairy',
    unit: 'oz',
    staple: false,
    package: { label: '8 oz block', priceCents: 349, units: 8 },
  },
  yogurt: {
    name: 'Plain whole-milk yogurt',
    section: 'dairy',
    unit: 'cup',
    staple: false,
    package: { label: '16 oz tub (2 cups)', priceCents: 279, units: 2 },
  },
  'fresh-mozzarella': {
    name: 'Fresh mozzarella',
    section: 'dairy',
    unit: 'oz',
    staple: false,
    package: { label: '8 oz ball', priceCents: 499, units: 8 },
  },
  'heavy-cream': {
    name: 'Heavy cream',
    section: 'dairy',
    unit: 'cup',
    staple: false,
    package: { label: '½ pint (1 cup)', priceCents: 249, units: 1 },
  },

  // Bakery
  'sandwich-bread': {
    // Kept in the freezer, the loaf lasts for months, and slices toast straight from frozen.
    name: 'Sandwich bread',
    section: 'bakery',
    unit: 'slice',
    staple: true,
    package: { label: '1 loaf (about 20 slices)', priceCents: 349, units: 20 },
  },
  'burger-buns': {
    name: 'Burger buns',
    plural: 'Burger buns',
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
    staple: false,
    package: { label: '16 oz box', priceCents: 179, units: 16 },
  },
  'jasmine-rice': {
    name: 'Jasmine rice',
    section: 'pantry',
    unit: 'cup',
    staple: true,
    package: { label: '5 lb bag', priceCents: 749, units: 11 },
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
    staple: true,
    package: { label: '4.5 oz tube (about 8 tbsp)', priceCents: 299, units: 8 },
  },
  'chicken-broth': {
    name: 'Low-sodium chicken broth',
    section: 'pantry',
    unit: 'cup',
    staple: false,
    package: { label: '14.5 oz can', priceCents: 129, units: 1.75 },
  },
  'red-lentils': {
    name: 'Red lentils',
    section: 'pantry',
    unit: 'cup',
    staple: true,
    package: { label: '1 lb bag (about 2¼ cups)', priceCents: 279, units: 2.25 },
  },
  chickpeas: {
    name: 'Canned chickpeas (15.5 oz)',
    plural: 'Cans of chickpeas (15.5 oz)',
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
    plural: 'Dill pickle chips',
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
  'all-purpose-flour': {
    name: 'All-purpose flour',
    section: 'pantry',
    unit: 'cup',
    staple: true,
    package: { label: '5 lb bag (about 18 cups)', priceCents: 349, units: 18 },
  },
  'instant-yeast': {
    name: 'Instant yeast (¼ oz packet)',
    plural: 'Packets of instant yeast (¼ oz)',
    section: 'pantry',
    unit: 'each',
    staple: true,
    package: { label: '1 strip of 3 packets', priceCents: 199, units: 3 },
  },
  panko: {
    name: 'Panko breadcrumbs',
    section: 'pantry',
    unit: 'cup',
    staple: true,
    package: { label: '8 oz box (about 4 cups)', priceCents: 299, units: 4 },
  },
  paprika: {
    name: 'Paprika',
    section: 'pantry',
    unit: 'tsp',
    staple: true,
    package: { label: '2.1 oz jar', priceCents: 299, units: 26 },
  },
  'coconut-milk': {
    name: 'Full-fat coconut milk (13.5 oz can)',
    plural: 'Cans of full-fat coconut milk (13.5 oz)',
    section: 'pantry',
    unit: 'each',
    staple: false,
    package: { label: '13.5 oz can', priceCents: 249, units: 1 },
  },
  'green-curry-paste': {
    name: 'Thai green curry paste',
    section: 'pantry',
    unit: 'tbsp',
    staple: true,
    package: { label: '4 oz jar (about 7 tbsp)', priceCents: 349, units: 7 },
  },
  'fish-sauce': {
    name: 'Fish sauce',
    section: 'pantry',
    unit: 'tbsp',
    staple: true,
    package: { label: '6.76 fl oz bottle', priceCents: 349, units: 13 },
  },
  'rice-vinegar': {
    name: 'Unseasoned rice vinegar',
    section: 'pantry',
    unit: 'tbsp',
    staple: true,
    package: { label: '12 fl oz bottle', priceCents: 279, units: 24 },
  },
  sriracha: {
    name: 'Sriracha',
    section: 'pantry',
    unit: 'tbsp',
    staple: true,
    package: { label: '17 oz bottle', priceCents: 449, units: 30 },
  },
  tamarind: {
    // The pourable Thai kind. The thick black Indian paste is several times stronger.
    name: 'Pourable Thai tamarind concentrate',
    section: 'pantry',
    unit: 'tbsp',
    staple: true,
    package: { label: '8 oz jar (about 14 tbsp), at an Asian grocery', priceCents: 349, units: 14 },
  },
  'rice-noodles': {
    name: 'Flat rice noodles (¼ inch wide)',
    section: 'pantry',
    unit: 'oz',
    staple: true,
    package: { label: '14 oz box', priceCents: 299, units: 14 },
  },
  tagliatelle: {
    name: 'Dried egg tagliatelle or egg fettuccine',
    section: 'pantry',
    unit: 'oz',
    staple: false,
    package: { label: '8.8 oz bag of nests', priceCents: 349, units: 8.8 },
  },
  'roasted-peanuts': {
    name: 'Unsalted roasted peanuts',
    section: 'pantry',
    unit: 'cup',
    staple: true,
    package: { label: '16 oz jar (about 3 cups)', priceCents: 329, units: 3 },
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
