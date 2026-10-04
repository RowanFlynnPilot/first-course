// Skills, in the order the menu teaches them. Each one is taught by exactly
// one recipe (enforced in curriculum.test.ts).

// The six stats on the chef sheet. Every skill belongs to exactly one.
export const DISCIPLINES = {
  prep: { name: 'Prep', summary: 'Knife work and getting ready.' },
  pan: { name: 'Pan', summary: 'Dry heat on the stove.' },
  pot: { name: 'Pot', summary: 'Water, steam and simmering.' },
  oven: { name: 'Oven', summary: 'Roasting, baking and broiling.' },
  sauce: { name: 'Sauce', summary: 'Building sauces and holding them together.' },
  palate: { name: 'Palate', summary: 'Tasting, seasoning and judging.' },
} as const

export type DisciplineId = keyof typeof DISCIPLINES

export interface Technique {
  readonly name: string
  readonly discipline: DisciplineId
  readonly summary: string
}

export const TECHNIQUES = {
  // First course
  'knife-basics': {
    discipline: 'prep',
    name: 'Knife basics',
    summary: 'Pinch grip, claw hand, and making a flat side before you cut anything round.',
  },
  seasoning: {
    discipline: 'palate',
    name: 'Seasoning to taste',
    summary: 'Taste, adjust salt and acid, taste again. The habit every other skill leans on.',
  },
  'heat-control': {
    discipline: 'pan',
    name: 'Heat control',
    summary: 'Reading the pan and moving it on and off the burner instead of trusting the dial.',
  },
  'boiling-pasta': {
    discipline: 'pot',
    name: 'Boiling pasta',
    summary: 'Salted rolling boil, pulling it early, and saving the starchy water.',
  },
  'mise-en-place': {
    discipline: 'prep',
    name: 'Mise en place',
    summary: 'Everything cut, measured and within reach before the heat goes on.',
  },
  griddling: {
    discipline: 'pan',
    name: 'Griddling',
    summary: 'Slow, even browning in a pan over moderate heat.',
  },
  'steaming-rice': {
    discipline: 'pot',
    name: 'Steamed rice',
    summary: 'Rinse, measure, cover, and leave the lid alone.',
  },
  roasting: {
    discipline: 'oven',
    name: 'Roasting',
    summary: 'A hot oven, even pieces, and enough space on the pan for food to brown.',
  },

  // Second course
  'sweating-aromatics': {
    discipline: 'sauce',
    name: 'Sweating aromatics',
    summary: 'Softening onion and garlic in fat without browning, as the base of a sauce.',
  },
  simmering: {
    discipline: 'pot',
    name: 'Simmering',
    summary: 'Holding a gentle bubble and reducing a sauce until it tastes concentrated.',
  },
  'pan-emulsion': {
    discipline: 'sauce',
    name: 'Pasta-water sauce',
    summary: 'Tossing pasta with fat and starchy water until they bind into a glossy sauce.',
  },
  searing: {
    discipline: 'pan',
    name: 'Searing',
    summary: 'Dry surface, hot pan, and leaving the food alone until it releases.',
  },
  doneness: {
    discipline: 'palate',
    name: 'Judging doneness',
    summary: 'Using an instant-read thermometer so cooked meat is a fact, not a guess.',
  },
  'stir-frying': {
    discipline: 'pan',
    name: 'Stir-frying',
    summary: 'High heat, small batches, and ingredients added in the order they cook.',
  },
  caramelizing: {
    discipline: 'pan',
    name: 'Caramelizing onions',
    summary: 'Cooking onions low and long until they turn brown, soft and sweet.',
  },
  'blooming-spices': {
    discipline: 'palate',
    name: 'Blooming spices',
    summary: 'Frying spices briefly in hot fat so their flavor carries through the dish.',
  },

  // Third course
  'pan-sauce': {
    discipline: 'sauce',
    name: 'Pan sauce',
    summary: 'Deglazing the browned bits left after searing and reducing them into a sauce.',
  },
  'smash-crust': {
    discipline: 'pan',
    name: 'Smash-burger crust',
    summary: 'Loosely formed beef pressed hard onto a very hot pan for a thin, crisp crust.',
  },
  'browning-meat': {
    discipline: 'pan',
    name: 'Browning ground meat',
    summary: 'Cooking off the water so crumbled meat browns instead of turning grey.',
  },
  'stir-fry-sauce': {
    discipline: 'sauce',
    name: 'Stir-fry sauce',
    summary: 'Mixing a sauce ahead and thickening it in the pan with a cornstarch slurry.',
  },
  'masala-base': {
    discipline: 'sauce',
    name: 'Masala base',
    summary: 'Cooking onion, ginger, garlic, tomato and spices down until the oil separates.',
  },
  emulsions: {
    discipline: 'sauce',
    name: 'Cold emulsions',
    summary: 'Whisking oil into egg or mustard drop by drop for aioli, mayo and burger sauce.',
  },

  // Fourth course
  'yeasted-dough': {
    discipline: 'oven',
    name: 'Yeasted dough',
    summary: 'Mixing, kneading and proofing dough, and knowing by feel when it is ready.',
  },
  'tempering-eggs': {
    discipline: 'sauce',
    name: 'Tempering eggs',
    summary: 'Using gentle leftover heat to thicken eggs into a sauce without scrambling them.',
  },
  'breading-frying': {
    discipline: 'pan',
    name: 'Breading and shallow-frying',
    summary: 'Flour, egg, crumbs, then steady oil temperature for a crisp, even crust.',
  },
  'curry-balance': {
    discipline: 'palate',
    name: 'Balancing a curry',
    summary: 'Frying curry paste, then tuning salty, sweet, sour and hot at the end.',
  },
  velveting: {
    discipline: 'prep',
    name: 'Velveting',
    summary: 'Coating sliced meat in cornstarch so it stays tender in a hot pan.',
  },
  'marinating-broiling': {
    discipline: 'oven',
    name: 'Marinating and broiling',
    summary: 'A yogurt marinade and the broiler for charred, tender meat without a grill.',
  },
} as const satisfies Record<string, Technique>

export type TechniqueId = keyof typeof TECHNIQUES
