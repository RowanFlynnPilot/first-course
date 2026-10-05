// The kit: everything in the kitchen that is not food. Recipes list their
// equipment by these ids, so a typo is a compile error, and the kit screen can
// say what a cook still needs before a course. Ids are permanent: kit_items
// rows reference them as plain text.

export interface Equipment {
  readonly name: string
  /** What to look for, for a cook who has never bought one. */
  readonly note: string | null
  /** Other items that do this one's job. Owning one of them counts as having this. */
  readonly coveredBy: readonly string[]
}

// In the order the kit screen lists them.
export const EQUIPMENT = {
  // Knives and boards
  'chefs-knife': { name: 'Chef’s knife', note: 'About 8 inches long. It does almost every job.', coveredBy: [] },
  'cutting-board': { name: 'Cutting board', note: 'At least 12 by 18 inches, so food stays on it.', coveredBy: [] },
  'butter-knife': { name: 'Butter knife', note: null, coveredBy: [] },
  grater: {
    name: 'Grater',
    note: 'A box grater: the fine side for zest, parmesan and ginger, the big holes for cheese that melts.',
    coveredBy: [],
  },
  'can-opener': { name: 'Can opener', note: null, coveredBy: [] },

  // Pans and pots
  'small-nonstick-skillet': { name: 'Nonstick skillet, 8 to 10 inch', note: 'For eggs and single sandwiches.', coveredBy: [] },
  'large-skillet': {
    name: 'Large skillet, 12 inch',
    note: 'Any kind. Buying one? Buy cast iron: it is also the skillet the third and fourth courses ask for.',
    coveredBy: ['steel-skillet', 'cast-iron-skillet'],
  },
  'steel-skillet': {
    name: 'Large skillet, 12 inch, stainless steel or cast iron',
    note: 'Not nonstick: pan sauces and smash burgers need a pan that browns and takes high heat. Cast iron counts.',
    coveredBy: ['cast-iron-skillet'],
  },
  'cast-iron-skillet': {
    name: 'Cast-iron skillet, 12 inch',
    note: 'Pre-seasoned is fine. It goes from the stove into a 500°F oven and holds heat for a crisp crust.',
    coveredBy: [],
  },
  'skillet-lid': { name: 'Lid or plate that covers the skillet', note: 'A large plate or a sheet pan works.', coveredBy: [] },
  'small-saucepan': { name: 'Small saucepan with a tight lid', note: 'About 2 quarts. For a pot of rice.', coveredBy: [] },
  'medium-saucepan': { name: 'Medium saucepan with lid', note: 'About 3 quarts.', coveredBy: [] },
  'large-pot': { name: 'Large pot with lid', note: 'At least 6 quarts, for pasta.', coveredBy: [] },
  'sheet-pan': {
    name: 'Rimmed sheet pan',
    note: 'A half sheet, about 13 by 18 inches, with a lip all the way around.',
    coveredBy: [],
  },
  'wire-rack': {
    name: 'Wire rack that fits in the sheet pan',
    note: 'Oven-safe metal. Air under the food keeps a crust crisp.',
    coveredBy: [],
  },

  // Tools
  tongs: { name: 'Tongs', note: 'About 12 inches long.', coveredBy: [] },
  spatula: { name: 'Spatula', note: 'A flat turner for flipping.', coveredBy: ['metal-spatula'] },
  'metal-spatula': { name: 'Stiff metal spatula', note: 'Wide and sturdy, with a sharp front edge for scraping.', coveredBy: [] },
  'silicone-spatula': { name: 'Silicone spatula', note: 'Heatproof, for scraping a pan clean.', coveredBy: [] },
  'wooden-spoon': { name: 'Wooden spoon', note: null, coveredBy: [] },
  ladle: { name: 'Ladle', note: null, coveredBy: [] },
  whisk: { name: 'Whisk', note: null, coveredBy: [] },
  colander: { name: 'Colander', note: null, coveredBy: [] },
  strainer: { name: 'Fine-mesh strainer', note: 'For rinsing rice and lentils, which fall through a colander.', coveredBy: [] },
  thermometer: {
    name: 'Instant-read thermometer',
    note: 'Digital, reads in a few seconds. The only sure way to know meat is cooked.',
    coveredBy: [],
  },
  'measuring-spoons': { name: 'Measuring spoons', note: null, coveredBy: [] },
  'measuring-cups': { name: 'Measuring cups', note: 'For rice, lentils and water.', coveredBy: [] },
  'liquid-measuring-cup': { name: 'Liquid measuring cup', note: 'Glass, with a spout. 2 cups is plenty.', coveredBy: [] },
  'oven-mitts': { name: 'Oven mitts', note: null, coveredBy: [] },
  toaster: { name: 'Toaster', note: null, coveredBy: [] },

  // Bowls, plates and the rest
  'large-bowl': { name: 'Large bowl', note: null, coveredBy: [] },
  'medium-bowl': { name: 'Medium bowl', note: null, coveredBy: [] },
  'small-bowl': { name: 'Small bowls', note: 'Two or three, for things measured out ahead.', coveredBy: [] },
  'heatproof-bowl': { name: 'Heatproof bowl', note: 'Glass or metal, for hot fat.', coveredBy: [] },
  plates: { name: 'Two large plates', note: null, coveredBy: [] },
  'shallow-dishes': { name: 'Three shallow dishes', note: 'Pie plates or wide, shallow bowls, for breading.', coveredBy: [] },
  mug: { name: 'Mug', note: null, coveredBy: [] },
  fork: { name: 'Fork', note: null, coveredBy: [] },
  spoon: { name: 'Spoon', note: null, coveredBy: [] },
  'kitchen-towels': { name: 'Kitchen towels', note: null, coveredBy: [] },
  'paper-towels': { name: 'Paper towels', note: null, coveredBy: [] },
  parchment: { name: 'Parchment paper', note: null, coveredBy: [] },
  foil: { name: 'Aluminum foil', note: null, coveredBy: [] },
  'plastic-wrap': { name: 'Plastic wrap', note: null, coveredBy: [] },
} as const satisfies Record<string, Equipment>

export type EquipmentId = keyof typeof EQUIPMENT
