import { describe, expect, it } from 'vitest'
import { EQUIPMENT } from '../curriculum/equipment'
import { INGREDIENTS } from '../curriculum/ingredients'
import { RECIPES } from '../curriculum/recipes'
import { EXTRAS } from './extras'

// Migration 00008 checks every id a row holds against these shapes, so a new
// id that broke them could never be saved. Kept in step with the migration.
const ID = /^[a-z0-9-]{1,64}$/
const EXTRA_ID = /^[a-z0-9-]{1,32}$/

// Every id that has shipped, and so may sit in a cook's rows: a cook log or
// a plan row holds a recipe id, the pantry and the prices an ingredient id,
// the kit an equipment id, the chef an extra id. Loading the kitchen throws
// on an id the curriculum no longer has, so the cook would see "Could not
// load your kitchen" every time: none of these may ever go. To stop using
// an ingredient or a piece of equipment, mark it `retired: true` instead. A
// new id is added here in the commit that ships it.
const SHIPPED = {
  recipes: [
    'chopped-salad', 'soft-scrambled-eggs', 'aglio-e-olio', 'grilled-cheese', 'fried-egg-rice-bowl',
    'sheet-pan-sausage', 'marinara-pasta', 'pasta-al-limone', 'seared-chicken-thighs', 'egg-fried-rice',
    'onion-melt', 'red-lentil-dal', 'oven-fries-aioli', 'chicken-pan-sauce', 'smash-cheeseburger',
    'weeknight-meat-sauce', 'chicken-broccoli-stir-fry', 'chana-masala', 'pan-pizza', 'chicken-cutlets',
    'chicken-tikka', 'carbonara', 'thai-green-curry', 'beef-and-broccoli', 'double-smash-burger',
    'crispy-chicken-sandwich', 'margherita-pizza', 'ragu-bolognese', 'pad-thai', 'general-tsos-chicken',
    'chicken-tikka-masala'
  ],
  ingredients: [
    'tomato', 'cucumber', 'red-onion', 'lemon', 'garlic', 'parsley', 'scallion', 'baby-potatoes', 'broccoli',
    'bell-pepper', 'yellow-onion', 'ginger', 'russet-potatoes', 'lime', 'basil', 'carrot', 'bean-sprouts',
    'kielbasa', 'chicken-thighs', 'ground-beef', 'chicken-breasts', 'flank-steak', 'bacon', 'eggs', 'butter',
    'feta', 'parmesan', 'cheddar', 'american-cheese', 'pasteurized-eggs', 'mozzarella', 'yogurt',
    'fresh-mozzarella', 'heavy-cream', 'sandwich-bread', 'burger-buns', 'olive-oil', 'neutral-oil', 'sesame-oil',
    'soy-sauce', 'kosher-salt', 'black-pepper', 'red-pepper-flakes', 'spaghetti', 'jasmine-rice',
    'crushed-tomatoes', 'tomato-paste', 'chicken-broth', 'red-lentils', 'chickpeas', 'turmeric', 'cumin-seeds',
    'coriander', 'garam-masala', 'sugar', 'cornstarch', 'oyster-sauce', 'dill-pickles', 'ketchup',
    'dijon-mustard', 'all-purpose-flour', 'instant-yeast', 'panko', 'paprika', 'coconut-milk',
    'green-curry-paste', 'fish-sauce', 'rice-vinegar', 'sriracha', 'tamarind', 'rice-noodles', 'tagliatelle',
    'roasted-peanuts', 'frozen-peas-carrots'
  ],
  equipment: [
    'chefs-knife', 'cutting-board', 'butter-knife', 'grater', 'can-opener', 'small-nonstick-skillet',
    'large-skillet', 'steel-skillet', 'cast-iron-skillet', 'skillet-lid', 'small-saucepan', 'medium-saucepan',
    'large-pot', 'sheet-pan', 'wire-rack', 'tongs', 'spatula', 'metal-spatula', 'silicone-spatula',
    'wooden-spoon', 'ladle', 'whisk', 'colander', 'strainer', 'thermometer', 'measuring-spoons', 'measuring-cups',
    'liquid-measuring-cup', 'oven-mitts', 'toaster', 'large-bowl', 'medium-bowl', 'small-bowl', 'heatproof-bowl',
    'plates', 'shallow-dishes', 'mug', 'fork', 'spoon', 'kitchen-towels', 'paper-towels', 'parchment', 'foil',
    'plastic-wrap'
  ],
  extras: [
    'kitchen-towel', 'wooden-spoon', 'red-clogs', 'smash-spatula', 'pizza-patch', 'whisk', 'yellow-clogs',
    'chopsticks'
  ],
} as const

describe('ids the database checks', () => {
  it('fit migration 00008', () => {
    for (const recipe of RECIPES) expect(recipe.id, recipe.id).toMatch(ID)
    for (const id of Object.keys(INGREDIENTS)) expect(id, id).toMatch(ID)
    for (const id of Object.keys(EQUIPMENT)) expect(id, id).toMatch(ID)
    for (const extra of EXTRAS) expect(extra.id, extra.id).toMatch(EXTRA_ID)
  })
})

describe('ids a cook has saved', () => {
  it('keep every id that has shipped', () => {
    const recipes = new Set(RECIPES.map((recipe) => recipe.id))
    const extras = new Set(EXTRAS.map((extra) => extra.id))
    expect(SHIPPED.recipes.filter((id) => !recipes.has(id)), 'recipes gone').toEqual([])
    expect(SHIPPED.ingredients.filter((id) => !Object.hasOwn(INGREDIENTS, id)), 'ingredients gone').toEqual([])
    expect(SHIPPED.equipment.filter((id) => !Object.hasOwn(EQUIPMENT, id)), 'equipment gone').toEqual([])
    expect(SHIPPED.extras.filter((id) => !extras.has(id)), 'extras gone').toEqual([])
  })

  it('list every id that ships, so the list above stays whole', () => {
    const shipped = (ids: readonly string[]) => new Set<string>(ids)
    expect(RECIPES.map((recipe) => recipe.id).filter((id) => !shipped(SHIPPED.recipes).has(id))).toEqual([])
    expect(Object.keys(INGREDIENTS).filter((id) => !shipped(SHIPPED.ingredients).has(id))).toEqual([])
    expect(Object.keys(EQUIPMENT).filter((id) => !shipped(SHIPPED.equipment).has(id))).toEqual([])
    expect(EXTRAS.map((extra) => extra.id).filter((id) => !shipped(SHIPPED.extras).has(id))).toEqual([])
  })
})
