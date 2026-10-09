// The spice guide: what each spice on the menu tastes like, what to buy, how
// to use it, and everyday food to start on. Keyed by IngredientId, so a guide
// entry for an ingredient that does not exist is a compile error. Which course
// first needs each spice is derived from the recipes (lib/spices.ts).

import type { IngredientId } from './ingredients'

export interface SpiceGuide {
  readonly tastes: string
  readonly buy: string
  readonly use: string
  /** Everyday food to try it on, outside the recipes. */
  readonly tryOn: readonly string[]
}

// In the order the shelf lists them within a course.
export const SPICES = {
  'kosher-salt': {
    tastes: 'Salt tastes salty, but its real job is making food taste more like itself. Every recipe uses it.',
    buy: 'A 3 lb box of Morton coarse kosher salt, in the baking or spice aisle; the recipes are measured for it. Table salt is denser, so use about three-quarters as much. Diamond Crystal kosher salt is lighter, so use about 1½ times as much, then taste.',
    use: 'Salt early and a little at a time: on meat before it cooks, in onions as they soften, in pasta water. Then taste at the end and add a pinch if it tastes flat. If a doctor has told you to limit sodium, follow their numbers: start with half the recipe’s salt and finish with lemon or pepper.',
    tryOn: ['A sliced tomato with olive oil and a pinch of salt', 'Eggs, salted before they go in the pan', 'Pasta water that tastes like mild seawater'],
  },
  'black-pepper': {
    tastes: 'Warm, woody, and gently hot. Its smell starts fading as soon as it is ground, which is why pre-ground pepper tastes flat and dusty.',
    buy: 'Whole peppercorns in a grinder. When it runs out, refill it from a bag of whole peppercorns, which costs far less. If yours will not open, buy a refillable grinder once.',
    use: 'Grind it over food near the end, or just before it cooks; long, hard heat dulls it. Most grinders twist to set coarse or fine. To measure it, grind straight into the measuring spoon.',
    tryOn: ['A fried egg', 'Buttered pasta with parmesan', 'Avocado on toast'],
  },
  'red-pepper-flakes': {
    tastes: 'Dried, crushed chili, seeds and all: more heat than flavor. In a simmering sauce the heat spreads and builds.',
    buy: 'A small jar in the spice aisle.',
    use: 'Warmed in the oil with garlic, the heat runs through the whole dish; sprinkled on at the end, it stays on top. They scorch in seconds, so add them over low heat or just after the burner goes off. On your own food, start with ¼ teaspoon for two servings. Wash your hands after touching them, before you touch your eyes.',
    tryOn: ['A pinch on a slice of pizza', 'Buttered noodles for two, with ¼ teaspoon', 'Roasted broccoli'],
  },
  'cumin-seeds': {
    tastes: 'Earthy, warm, and a little smoky: the smell of dal, chili, and taco seasoning.',
    buy: 'Whole seeds in a small jar. Whole seeds keep for two years or more; ground cumin fades within a year.',
    use: 'Bloom them in hot fat: first, before the onion, as in the chana masala, or in butter at the end, poured over, as in the dal. Test the fat with one seed. They sizzle at once, and in 20 to 30 seconds they darken a shade and smell toasty.',
    tryOn: [
      '½ teaspoon bloomed in a spoonful of oil, poured over plain rice',
      'Carrots or potatoes, tossed with ½ teaspoon per pound before roasting',
      'Plain yogurt with salt and ¼ teaspoon of seeds toasted in a dry skillet for a minute, as a dip',
    ],
  },
  turmeric: {
    tastes: 'Mild, earthy, and a little bitter. It is there mostly for its deep yellow color.',
    buy: 'Ground, in a small jar. One lasts a long time: recipes use ½ teaspoon at a time.',
    use: 'Cook it in the fat: a minute with the onions, as in the dal, or 30 seconds with the other ground spices. That takes away its raw, dusty taste, so never sprinkle it on at the end. It stains plastic tubs, silicone spatulas, wooden boards, and clothes: wipe spills right away with soapy water. A stain on a board fades in sunlight.',
    tryOn: ['A pinch in the pot for yellow rice, with a teaspoon of butter', 'A pinch beaten into eggs before they cook', 'Lentil or chicken soup'],
  },
  coriander: {
    tastes: 'Citrusy, floral, and mild. It is the seed of the cilantro plant, but tastes nothing like the leaves.',
    buy: 'Ground coriander, in a small jar in the spice aisle. Not the green bunch in produce: that is cilantro, which tastes completely different.',
    use: 'The easygoing one: it rarely overpowers anything. Bloom it in the fat for 30 seconds with the other ground spices. It often travels with cumin.',
    tryOn: [
      'The seared chicken thighs, with ½ teaspoon of coriander added to the salt bowl',
      'Roasted carrots or chickpeas, with cumin',
      'A lemon vinaigrette',
    ],
  },
  'garam-masala': {
    tastes: 'A blend, not one spice: warm and sweet-smelling, usually from cinnamon, cardamom, clove, black pepper, cumin, and coriander. Brands vary; some add nutmeg, bay, or chili.',
    buy: 'A small jar. An Indian grocery sells it fresher and cheaper.',
    use: 'The recipes add it with the other ground spices. In your own curries, a pinch stirred in off the heat at the end brings back its perfume.',
    tryOn: ['Roasted sweet potatoes or squash', 'Roasted chickpeas', 'Plain yogurt with salt and lemon, as a dip'],
  },
  paprika: {
    tastes: 'Ground dried sweet peppers: mild, a little sweet, and deep red. Smoked paprika tastes of a campfire and hot paprika is spicy, so neither stands in for sweet.',
    buy: 'Sweet paprika, often labeled just “paprika”, in a small jar. Smoked paprika is worth a second jar later.',
    use: 'It scorches fast and turns bitter, so bloom it briefly over medium-low heat, or sprinkle it on food before it cooks.',
    tryOn: [
      'Potatoes before roasting, with oil and salt',
      'The seared chicken thighs, with ½ teaspoon of paprika added to the salt bowl',
      'Mayonnaise, as a dip for fries',
    ],
  },
} as const satisfies Partial<Record<IngredientId, SpiceGuide>>

export type SpiceId = keyof typeof SPICES

/** How spices work, before any one of them. */
export const SPICE_HABITS: readonly { readonly habit: string; readonly why: string }[] = [
  {
    habit: 'Buy small, and when the menu needs it',
    why: 'One jar you use is worth more than a full rack you do not. Ground spices fade noticeably within a year; whole seeds last two years or more.',
  },
  {
    habit: 'Read the label',
    why: 'Skip pre-ground pepper, giant value jars, and any “seasoning” whose first ingredient is salt. A 1 to 2 oz jar of each spice lasts the whole menu.',
  },
  {
    habit: 'Refill jars from bags',
    why: 'Once you have used up a jar, refill it from a bag. The international aisle and Indian or Latin groceries sell the same spices for a fraction of the price.',
  },
  {
    habit: 'Smell before you trust it',
    why: 'Rub a pinch between your fingers, or just sniff the jar for pepper flakes. If you can barely smell it, or paprika has faded from red to brown, it has gone flat. Replace it.',
  },
  {
    habit: 'Keep them cool and dark',
    why: 'Not on a shelf over the stove, which also means reaching across hot burners, and not in the sun. Heat and light fade them fast. Close the lids tight, and never shake a jar over a steaming pot: steam gets in and the spice cakes.',
  },
  {
    habit: 'Bloom them in fat',
    why: 'The flavor in spices dissolves in fat, not water. 20 to 45 seconds in hot oil or butter wakes them up. Measure them into a bowl before the fat goes on: they burn in less time than it takes to open a jar. If they turn black or smell bitter, wipe out the pan and start again. The dal is where you learn it.',
  },
  {
    habit: 'Add a little, then taste',
    why: 'On your own food for two, start with ½ teaspoon of a mild spice or ¼ teaspoon of pepper flakes, then taste. You can always add more. You can never take it out.',
  },
]

/** Not on the menu, but the next jars worth owning. */
export const SPICES_LATER: readonly { readonly name: string; readonly why: string }[] = [
  { name: 'Dried oregano', why: 'Tomato sauce, pizza, and Greek salad. Crush it between your fingers as it goes in.' },
  {
    name: 'Smoked paprika',
    why: 'Eggs, potatoes, and beans, and anything you want to taste a little of the campfire. Buy the sweet kind (dulce) unless you want heat.',
  },
  { name: 'Ground cinnamon', why: 'Oatmeal and baking, and a pinch in chili or a tomato sauce.' },
  {
    name: 'Chili powder',
    why: 'A blend of ground chili, cumin, oregano, and garlic, sometimes with salt, for chili and tacos. In Indian and British recipes, “chili powder” means pure ground chili, which is far hotter.',
  },
  {
    name: 'Bay leaves',
    why: 'One or two in soup, beans, or ragù while it simmers. Take them out before serving: they stay stiff and sharp and can scratch your throat.',
  },
]
