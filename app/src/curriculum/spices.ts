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
    tastes: 'Salt adds no flavor of its own. It makes food taste more like itself, and every recipe uses it.',
    buy: 'A 3 lb box of Morton coarse kosher salt, in the baking or spice aisle; the recipes are measured for it. Table salt is denser, so use about three-quarters as much. Diamond Crystal kosher salt is much lighter, so use nearly twice as much.',
    use: 'Salt early and a little at a time: on meat before it cooks, in onions as they soften, in pasta water. Then taste at the end and add a pinch if it tastes flat.',
    tryOn: ['A sliced tomato with olive oil', 'Eggs, salted before they go in the pan', 'Pasta water that tastes like mild seawater'],
  },
  'black-pepper': {
    tastes: 'Warm, woody and gently hot. Its smell fades within minutes of grinding, which is why pre-ground pepper tastes of dust.',
    buy: 'Whole peppercorns in a grinder. When it runs out, refill it from a bag of whole peppercorns, which costs far less.',
    use: 'Grind it over food near the end, or just before it cooks; long, hard heat dulls it. Most grinders twist to set coarse or fine.',
    tryOn: ['A fried egg', 'Buttered pasta with parmesan', 'Avocado on toast'],
  },
  'red-pepper-flakes': {
    tastes: 'Dried, crushed chili, seeds and all: more heat than flavor. In a simmering sauce the heat spreads and builds.',
    buy: 'A small jar in the spice aisle.',
    use: 'Sizzled in oil with garlic, the heat runs through the whole dish; sprinkled on at the end, it stays on top. Start with ¼ teaspoon. You can add more, but you cannot take it out.',
    tryOn: ['Pizza and buttered noodles', 'Roasted broccoli', 'Scrambled eggs'],
  },
  'cumin-seeds': {
    tastes: 'Earthy, warm and a little smoky: the smell of dal, chili and taco seasoning.',
    buy: 'Whole seeds, in a small jar or, far cheaper, a bag from the international aisle or an Indian grocery. Whole seeds keep their flavor for a year or two; ground cumin fades in months.',
    use: 'Drop them into hot oil first, before anything else. In about 30 seconds they sizzle, darken a shade and smell toasty. That is blooming, and it is the whole trick.',
    tryOn: [
      '½ teaspoon sizzled in a spoonful of oil, poured over plain rice',
      'Carrots or potatoes, tossed with the seeds before roasting',
      'Plain yogurt with salt, as a dip',
    ],
  },
  turmeric: {
    tastes: 'Mild, earthy and a little bitter. It is there mostly for its deep yellow color.',
    buy: 'Ground, in a small jar. One lasts a long time: recipes use ½ teaspoon at most.',
    use: 'Cook it in fat for a minute with the onions or the other spices, which takes away its raw, dusty taste. Never sprinkle it on at the end. It stains boards, counters and clothes, so wipe spills right away.',
    tryOn: ['A pinch in the water for yellow rice', 'Scrambled eggs', 'Lentil or chicken soup'],
  },
  coriander: {
    tastes: 'Citrusy, floral and mild. It is the seed of the cilantro plant, but tastes nothing like the leaves.',
    buy: 'Ground, in a small jar.',
    use: 'The easygoing one: it rarely overpowers anything. Bloom it in oil for 30 seconds with the other ground spices. It almost always travels with cumin.',
    tryOn: ['Chicken thighs, rubbed with coriander and salt before searing', 'Roasted carrots or chickpeas, with cumin', 'A lemon vinaigrette'],
  },
  'garam-masala': {
    tastes: 'A blend, not one spice: warm and sweet-smelling, from cinnamon, cardamom, clove, pepper, cumin and coriander. Every brand mixes it a little differently.',
    buy: 'A small jar. An Indian grocery sells it fresher and cheaper by the bag.',
    use: 'It goes in with the other ground spices, and a pinch near the end of cooking brings back its perfume.',
    tryOn: ['Roasted sweet potatoes or squash', 'Roasted chickpeas', 'Plain yogurt with salt and lemon, as a dip'],
  },
  paprika: {
    tastes: 'Ground dried sweet peppers: mild, a little sweet, and deep red. Smoked paprika and hot paprika are different spices.',
    buy: 'Sweet paprika, often labeled just “paprika”, in a small jar. Smoked paprika is worth a second jar later.',
    use: 'It scorches fast and turns bitter, so bloom it briefly over medium-low heat, or sprinkle it on food before it cooks.',
    tryOn: ['Potatoes before roasting, with oil and salt', 'Chicken before it goes in the oven', 'Mayonnaise, as a dip for fries'],
  },
} as const satisfies Partial<Record<IngredientId, SpiceGuide>>

export type SpiceId = keyof typeof SPICES

/** How spices work, before any one of them. */
export const SPICE_HABITS: readonly { readonly habit: string; readonly why: string }[] = [
  {
    habit: 'Buy small, and when the menu needs it',
    why: 'One jar you use is worth more than a full rack you do not. Ground spices lose most of their smell within about a year.',
  },
  {
    habit: 'Buy bags, refill jars',
    why: 'The international aisle and Indian or Latin groceries sell the same spices by the bag for a fraction of the price of a jar.',
  },
  {
    habit: 'Smell before you trust it',
    why: 'Rub a pinch between your fingers. If you can barely smell it, it has gone flat, and it will taste flat too.',
  },
  {
    habit: 'Keep them cool and dark',
    why: 'Not on a shelf over the stove, and not in the sun. Heat and light fade them fast. Close the lids tight.',
  },
  {
    habit: 'Bloom them in fat',
    why: 'The flavor in spices dissolves in fat, not water. A few seconds in hot oil wakes them up. The dal is where you learn it.',
  },
  {
    habit: 'Add a little, then taste',
    why: 'You can always add more. You can never take it out.',
  },
]

/** Not on the menu, but the next jars worth owning. */
export const SPICES_LATER: readonly { readonly name: string; readonly why: string }[] = [
  { name: 'Dried oregano', why: 'Tomato sauce, pizza and Greek salad. Crush it between your fingers as it goes in.' },
  { name: 'Smoked paprika', why: 'Eggs, potatoes and beans, and anything you want to taste a little of the campfire.' },
  { name: 'Ground cinnamon', why: 'Oatmeal and baking, and a pinch in chili or a tomato sauce.' },
  { name: 'Chili powder', why: 'A blend of chili, cumin and oregano for chili and tacos. Not the same as ground chili pepper.' },
  { name: 'Bay leaves', why: 'One or two in soup, beans or ragù while it simmers. Take them out before serving.' },
]
