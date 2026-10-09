// Graph rules the type system cannot check. Ids of skills and ingredients are
// already checked at compile time.

import { describe, expect, it } from 'vitest'
import { cookCostPerServingCents, ESTIMATES, orderCostPerServingCents } from '../lib/cost'
import { formatAmount, formatDuration } from '../lib/format'
import { EQUIPMENT, type EquipmentId } from './equipment'
import { INGREDIENTS, type Ingredient, type IngredientId, type MeatSafety } from './ingredients'
import { pathTo } from '../lib/progress'
import { RECIPES, recipeById } from './recipes'
import { SPICE_HABITS, SPICES, SPICES_LATER } from './spices'
import { DISCIPLINES, TECHNIQUES, type TechniqueId } from './techniques'
import type { RecipeContent } from './types'

const techniqueIds = Object.keys(TECHNIQUES) as TechniqueId[]

/** Characters in one step's text. Roughly ten lines in cook mode at 390px wide. */
const STEP_MAX = 360

/** Everything that sits on a burner. */
const STOVETOP: readonly EquipmentId[] = [
  'small-nonstick-skillet',
  'large-skillet',
  'steel-skillet',
  'cast-iron-skillet',
  'small-saucepan',
  'medium-saucepan',
  'large-pot',
]

function teacherOf(technique: TechniqueId) {
  const teachers = RECIPES.filter((recipe) => recipe.teaches.includes(technique))
  if (teachers.length !== 1) {
    throw new Error(`${technique} is taught by ${teachers.length} recipes, expected exactly 1`)
  }
  return teachers[0]!
}

/** How each meat in a recipe is made safe. Every meat says, so none can slip past a check. */
function meatSafety(content: RecipeContent): MeatSafety[] {
  return content.ingredients.flatMap(({ ingredientId }) => {
    const ingredient: Ingredient = INGREDIENTS[ingredientId]
    return ingredient.section === 'meat' ? [ingredient.safeTempF] : []
  })
}

/** Meat that is raw in the package: a safe temperature, or cured (bacon). Smoked sausage is already cooked. */
function rawMeat(content: RecipeContent): MeatSafety[] {
  return meatSafety(content).filter((safety) => safety !== 'fully-cooked')
}

describe('the menu', () => {
  it('has unique recipe ids', () => {
    const ids = RECIPES.map((recipe) => recipe.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('teaches every skill in exactly one recipe', () => {
    for (const technique of techniqueIds) teacherOf(technique)
  })

  it('lists the skills in the order the menu teaches them', () => {
    // The chef sheet lists skills in this order, course by course.
    const order = techniqueIds.map((technique) => RECIPES.indexOf(teacherOf(technique)))
    expect(order).toEqual(order.toSorted((a, b) => a - b))
  })

  it('says how every meat is made safe, and nothing else claims to', () => {
    // The type requires it; this catches a cast that gets around the type.
    for (const [id, ingredient] of Object.entries(INGREDIENTS) as [IngredientId, Ingredient][]) {
      expect(ingredient.safeTempF !== undefined, id).toBe(ingredient.section === 'meat')
    }
  })

  it('teaches something in tiers 1 to 4 and nothing new in tier 5', () => {
    for (const recipe of RECIPES) {
      if (recipe.tier === 5) expect(recipe.teaches, recipe.id).toHaveLength(0)
      else expect(recipe.teaches.length, recipe.id).toBeGreaterThan(0)
    }
  })

  it('never requires a skill from a later tier, or one it teaches itself', () => {
    for (const recipe of RECIPES) {
      for (const technique of recipe.requires) {
        expect(recipe.teaches, recipe.id).not.toContain(technique)
        expect(teacherOf(technique).tier, `${recipe.id} requires ${technique}`).toBeLessThanOrEqual(recipe.tier)
      }
    }
  })

  it('opens each course only once the one before it is under way', () => {
    // Courses 2 to 4: at least one required skill is taught in the course just before.
    for (const recipe of RECIPES) {
      if (recipe.tier < 2 || recipe.tier > 4) continue
      const fromBefore = recipe.requires.some((technique) => teacherOf(technique).tier === recipe.tier - 1)
      expect(fromBefore, `${recipe.id} (course ${recipe.tier}) needs a skill from course ${recipe.tier - 1}`).toBe(true)
    }
  })

  it('handles raw meat only after the recipe that teaches doneness', () => {
    // Every skill taught by the recipes a recipe needs, and by the recipes those needed, all the way down.
    function allLearned(technique: TechniqueId): TechniqueId[] {
      const teacher = teacherOf(technique)
      return [...teacher.teaches, ...teacher.requires.flatMap(allLearned)]
    }
    for (const recipe of RECIPES) {
      if (rawMeat(recipe.content).length === 0) continue
      const known = new Set([...recipe.teaches, ...recipe.requires.flatMap(allLearned)])
      expect(known.has('doneness'), `${recipe.id} uses raw meat`).toBe(true)
    }
  })

  it('can be cooked start to finish from nothing', () => {
    const learned = new Set<TechniqueId>()
    const cooked = new Set<string>()
    let progressed = true
    while (progressed) {
      progressed = false
      for (const recipe of RECIPES) {
        if (cooked.has(recipe.id)) continue
        if (recipe.requires.every((technique) => learned.has(technique))) {
          cooked.add(recipe.id)
          for (const technique of recipe.teaches) learned.add(technique)
          progressed = true
        }
      }
    }
    expect(RECIPES.filter((recipe) => !cooked.has(recipe.id)).map((recipe) => recipe.id)).toEqual([])
  })

})

describe('written recipes', () => {
  const written = RECIPES.map((recipe) => ({ id: recipe.id, content: recipe.content }))

  it('have steps, positive quantities that format, and no repeated ingredient', () => {
    for (const { id, content } of written) {
      expect(content.steps.length, id).toBeGreaterThan(0)
      expect(content.servings, id).toBeGreaterThan(0)
      const ids = content.ingredients.map((line) => line.ingredientId)
      expect(new Set(ids).size, id).toBe(ids.length)
      for (const line of content.ingredients) {
        expect(line.qty, `${id} ${line.ingredientId}`).toBeGreaterThan(0)
        // Whole quarters: a standard set of measuring spoons stops at ¼ teaspoon, any sum of
        // quarters prints on the grocery list too, and the app's fonts carry ¼ ½ ¾ but no eighths.
        expect(Number.isInteger(line.qty * 4), `${id} ${line.ingredientId} is not a whole number of quarters`).toBe(true)
        formatAmount(line.qty, INGREDIENTS[line.ingredientId].unit) // throws on an unprintable fraction
      }
      for (const step of content.steps) {
        if (step.timer === null) continue
        formatDuration(step.timer.seconds) // throws unless it is whole minutes, as the recipe page prints it
        // Unique in the recipe: cook mode keeps its timers by label.
        expect(content.steps.filter((other) => other.timer?.label === step.timer?.label), `${id}: ${step.timer.label}`).toHaveLength(1)
        // Short enough for a chip at the top of cook mode, beside its clock.
        expect(step.timer.label.length, `${id}: ${step.timer.label}`).toBeGreaterThan(0)
        expect(step.timer.label.length, `${id}: ${step.timer.label}`).toBeLessThanOrEqual(16)
      }
    }
  })

  it('remind the cook to stir a simmer on the schedule its step gives, and only there', () => {
    // "stirring every 5 minutes" on a timed step: cook mode says "stir" every 5 minutes, on whatever step
    // the cook has moved on to. A schedule judged by eye (no timer) has nothing to count from.
    for (const { id, content } of written) {
      content.steps.forEach((step, index) => {
        const said = /\b[Ss]tir(?:ring)? every (\d+) minutes\b/.exec(step.text)
        const where = `${id} step ${index + 1}`
        if (step.timer === null) return
        expect(step.timer.stirEvery, where).toBe(said === null ? undefined : Number(said[1]) * 60)
        if (step.timer.stirEvery !== undefined) expect(step.timer.stirEvery, where).toBeLessThan(step.timer.seconds)
      })
    }
  })

  it('say how to reheat what is left of every recipe that makes more than two servings, and only those', () => {
    for (const { id, content } of written) {
      expect(content.leftovers !== null, `${id} serves ${content.servings}`).toBe(content.servings > 2)
      if (content.leftovers === null) continue
      // The last step already says how to keep them; the reheat says how to eat them again, safely.
      expect(content.steps.at(-1)?.why ?? '', id).toMatch(/lidded container/)
      const poultry = content.ingredients.some(({ ingredientId }) => {
        const ingredient: Ingredient = INGREDIENTS[ingredientId]
        return ingredient.safeTempF === 165
      })
      if (poultry) expect(content.leftovers.reheat, id).toContain('at least 165°F')
    }
  })

  it('measure in spoons a standard set has: never a fraction of a tablespoon', () => {
    for (const { id, content } of written) {
      const words = [...content.steps.flatMap((step) => [step.text, step.why ?? '']), ...content.ingredients.map((line) => line.prep ?? '')]
      // "1½ tablespoons" is a tablespoon and a half; "½ tablespoon" needs a spoon most sets lack.
      for (const text of words) expect(text, id).not.toMatch(/(?<!\d)[¼½¾⅓⅔] tablespoon/)
    }
  })

  it('say how to peel garlic in every recipe that uses it and can come before the aglio, which teaches it', () => {
    const aglio = recipeById('aglio-e-olio')
    for (const recipe of RECIPES) {
      const garlic = recipe.content.ingredients.some((line) => line.ingredientId === 'garlic')
      if (!garlic || recipe === aglio || pathTo(recipe, []).includes(aglio)) continue
      expect(recipe.content.steps.map((step) => step.text).join(' '), recipe.id).toMatch(/\bpeel/i)
    }
  })

  it('simmer tomatoes for 20 minutes or more in a saucepan, never the skillet', () => {
    // The kit steers a buyer to cast iron, and a long acid simmer strips its seasoning.
    for (const { id, content } of written) {
      if (!content.ingredients.some((line) => line.ingredientId === 'crushed-tomatoes')) continue
      for (const step of content.steps) {
        if (step.timer === null || step.timer.seconds < 20 * 60 || !/simmer/i.test(step.text)) continue
        expect(step.text, `${id}: ${step.timer.label}`).not.toMatch(/skillet/)
        expect(content.equipment.some((item) => item.endsWith('saucepan')), id).toBe(true)
      }
    }
  })

  it('never say "until done": every doneness cue is something you can see, smell, hear or measure', () => {
    for (const { id, content } of written) {
      for (const step of content.steps) expect(step.text, id).not.toMatch(/until (it is |they are )?done/i)
    }
  })

  it('keep every step short enough to read from across the counter', () => {
    // About ten lines of cook-mode type on a phone. Longer steps get split.
    for (const { id, content } of written) {
      content.steps.forEach((step, index) => expect(step.text.length, `${id} step ${index + 1}`).toBeLessThanOrEqual(STEP_MAX))
    }
  })

  it('turn off every burner they use, one for each pan, and the oven', () => {
    for (const { id, content } of written) {
      const text = content.steps.map((step) => step.text).join(' ')
      // A saucepan is sometimes a tool off the heat: the cutlets are pounded flat with one.
      const heatsASaucepan = content.steps.some((step) => /\bsaucepan\b/i.test(step.text) && /\b(heat|burner|boil|simmer)/i.test(step.text))
      const pans = content.equipment.filter((item) => STOVETOP.includes(item) && (!item.endsWith('saucepan') || heatsASaucepan))
      const offs =
        (text.match(/turn off (?:the|that) burner|turn (?:the|that) burner off|turn the burners off/gi)?.length ?? 0) +
        2 * (text.match(/turn off both burners/gi)?.length ?? 0)
      expect(offs, `${id} heats ${pans.join(', ')} and turns off ${offs} burners`).toBeGreaterThanOrEqual(pans.length)
      if (/\boven\b(?! mitt)/i.test(text)) expect(text, id).toMatch(/turn off the oven/i)
    }
  })

  it('move, tilt, tip or swirl a pan that has been on the heat only with an oven mitt', () => {
    // "lift the pan off the burner", "slide the skillet onto a cool burner", "swirling the pan by its handle".
    const movesAPan = /\b(?:move|moving|slide|sliding|lift|lifting|tilt|tilting|tip|tipping|swirl|swirling|take|taking) (?:the|that) (?:skillet|pan|saucepan|pot)\b/i
    for (const { id, content } of written) {
      for (const [index, step] of content.steps.entries()) {
        const words = `${step.text} ${step.why ?? ''}`
        if (!movesAPan.test(words)) continue
        expect(words, `${id} step ${index + 1}`).toMatch(/oven mitt/i)
        expect(content.equipment, `${id} step ${index + 1}`).toContain('oven-mitts')
      }
    }
  })

  it('handle raw meat safely: the thermometer, the safe temperature, and clean hands', () => {
    for (const { id, content } of written) {
      const raw = rawMeat(content)
      if (raw.length === 0) continue
      const text = content.steps.map((step) => step.text).join(' ')
      // Cured bacon is still raw pork in the package: no thermometer, but the same washing.
      expect(text, id).toMatch(/wash your hands/i)
      expect(text, id).toMatch(/hot, soapy water/)
      const temperatures = raw.filter((safety) => typeof safety === 'number')
      if (temperatures.length === 0) continue
      expect(content.equipment, id).toContain('thermometer')
      for (const temperature of temperatures) expect(text, id).toContain(`at least ${temperature}°F`)
    }
  })

  it('never tell the cook to rinse raw meat', () => {
    // Rinsing splashes germs around the sink and removes none of them.
    const meat = /\b(chicken|beef|pork|steak|bacon|meat|thighs?|breasts?)\b/i
    for (const { id, content } of written) {
      for (const [index, step] of content.steps.entries()) {
        for (const sentence of step.text.split(/(?<=[.;!?])\s+/)) {
          if (!/\brins(e|ing)\b/i.test(sentence) || !meat.test(sentence)) continue
          expect(sentence, `${id} step ${index + 1}`).toMatch(/\b(do not|don’t|never) rinse\b/i)
        }
      }
    }
  })

  it('list every tool a step names, so the kit is honest', () => {
    // The verb, not the noun: "slice the garlic", never "a slice of bread".
    const cuts = /\b(slice|chop|mince|dice|cut) (the|it|them|a|an|into|in|each|both|one|crosswise|thin)\b/i
    // Nouns only: "whisk" and "board" are left out because they are also verbs or too vague.
    const tools: readonly [RegExp, readonly EquipmentId[]][] = [
      [/paper towel/i, ['paper-towels']],
      [/\bfork\b/i, ['fork']],
      [/\btongs\b/i, ['tongs']],
      [/\bcolander\b/i, ['colander']],
      [/\bstrainer\b/i, ['strainer']],
      [/\bthermometer\b/i, ['thermometer']],
      [/oven mitt/i, ['oven-mitts']],
      [/plastic wrap/i, ['plastic-wrap']],
      // The verb: "wrap the rest for the fridge", "wrap it in the plastic wrap". Never "unwrap" or "the wrap".
      [/\bwrap (?:the|it|them)\b/i, ['plastic-wrap']],
      [/\bparchment\b/i, ['parchment']],
      [/\bfoil\b/i, ['foil']],
      [/\bladle\b/i, ['ladle']],
      [/\bgrater\b/i, ['grater']],
      [/\bmug\b/i, ['mug']],
      [/wooden spoon/i, ['wooden-spoon']],
      [/\bspatula\b/i, ['spatula', 'metal-spatula', 'silicone-spatula']],
      [/wire rack/i, ['wire-rack']],
      [/measuring spoon/i, ['measuring-spoons']],
      [/kitchen towel|folded towel/i, ['kitchen-towels']],
      [/\bsheet pan\b/i, ['sheet-pan']],
      [/\bsaucepan\b/i, ['small-saucepan', 'medium-saucepan']],
      // A cut needs the knife, and the board under it.
      [cuts, ['chefs-knife']],
      [cuts, ['cutting-board']],
      [/\bcutting board\b|\bthe board\b/i, ['cutting-board']],
      [/\bopen the can\b/i, ['can-opener']],
    ]
    for (const { id, content } of written) {
      for (const [index, step] of content.steps.entries()) {
        for (const [pattern, ids] of tools) {
          if (!pattern.test(step.text)) continue
          expect(ids.some((tool) => content.equipment.includes(tool)), `${id} step ${index + 1} names ${pattern}`).toBe(true)
        }
      }
    }
  })

  it('say how an ingredient is split when a step uses part of it', () => {
    // "of the salt", "the remaining oil", "half the butter", "the rest of the lemon": the
    // list's prep note has to say how the amount divides, so the parts add up.
    for (const { id, content } of written) {
      const text = content.steps.map((step) => step.text).join(' ')
      for (const line of content.ingredients) {
        // The last word of the name, leaving out any parentheses: "Neutral oil (canola or vegetable)" is "oil".
        const words = INGREDIENTS[line.ingredientId].name.replace(/\s*\(.*?\)/g, '').toLowerCase().split(' ')
        const noun = words.at(-1)
        if (noun === undefined) throw new Error(`${line.ingredientId} has no name`)
        // A word before the noun has to be part of this ingredient's name: "half the sesame oil" is not the olive oil.
        const part = new RegExp(String.raw`\b(?:of the|remaining|half the|rest of the) (?:(\w+) )?${noun}\b`, 'gi')
        const used = [...text.matchAll(part)].some((match) => match[1] === undefined || words.includes(match[1].toLowerCase()))
        if (used) expect(line.prep, `${id}: ${line.ingredientId} is used in parts`).not.toBeNull()
      }
    }
  })

  it('split an ingredient into parts that add up to the list', () => {
    // "1 for the beef, ½ for the sauce, 6 for the pasta water" is 7½.
    // Quantities are whole quarters (above), so a split never prints an eighth.
    const amount = String.raw`(\d+)?\s*([¼½¾])?`
    const GLYPHS: Record<string, number> = { '¼': 0.25, '½': 0.5, '¾': 0.75 }
    for (const { id, content } of written) {
      for (const line of content.ingredients) {
        // "1 for each batch" is a count, not a part: leave those notes to the reader.
        if (line.prep === null || /\bfor each\b/.test(line.prep)) continue
        const parts = [...line.prep.matchAll(new RegExp(String.raw`(?:^|[,:;] )${amount} (?:for|to|with) `, 'g'))]
          .filter((match) => match[1] !== undefined || match[2] !== undefined)
          .map((match) => Number(match[1] ?? 0) + (match[2] === undefined ? 0 : (GLYPHS[match[2]] ?? 0)))
        if (parts.length < 2) continue
        expect(parts.reduce((sum, part) => sum + part, 0), `${id} ${line.ingredientId}: ${line.prep}`).toBe(line.qty)
      }
    }
  })

  it('check every safe temperature the whole way: where, how long, and what if it is low', () => {
    for (const { id, content } of written) {
      for (const temperature of meatSafety(content)) {
        if (typeof temperature !== 'number') continue
        const check = content.steps.find((step) => step.text.includes(`at least ${temperature}°F`))
        expect(check, `${id}: no step checks ${temperature}°F`).toBeDefined()
        const text = check?.text ?? ''
        expect(text, `${id}: where the probe goes`).toMatch(/\btip\b|\bprobe\b/i)
        expect(text, `${id}: wait for the reading`).toMatch(/stops climbing/i)
        expect(text, `${id}: what to do if it is low`).toMatch(/if (it is|it’s|any is|one is) (lower|below)/i)
      }
    }
  })

  it('separate eggs only for pasteurized ones, whose raw yolk is safe', () => {
    for (const { id, content } of written) {
      if (!content.steps.some((step) => /\bseparate the (egg|third)\b/i.test(step.text))) continue
      expect(content.ingredients.map((line) => line.ingredientId), id).toContain('pasteurized-eggs')
    }
  })

  it('say to carry on during any timer of 30 minutes or more', () => {
    for (const { id, content } of written) {
      for (const [index, step] of content.steps.entries()) {
        if (step.timer === null || step.timer.seconds < 1800) continue
        const next = content.steps[index + 1]?.text ?? ''
        const carryOn = /go (straight )?on to the next step|while (it|they|that|the)|meanwhile/i
        expect(carryOn.test(step.text) || /^(while|meanwhile)/i.test(next), `${id} step ${index + 1}`).toBe(true)
      }
    }
  })

  it('drain a pot into a colander with oven mitts, tipping it away from you, its burner off', () => {
    for (const { id, content } of written) {
      for (const [index, step] of content.steps.entries()) {
        if (!/pour [^.]*into the colander/i.test(step.text)) continue
        expect(step.text, `${id} step ${index + 1}`).toMatch(/oven mitts/i)
        expect(step.text, `${id} step ${index + 1}`).toMatch(/away from you/i)
        // The pot leaves the burner here; a burner left on high under nothing is how kitchen fires start.
        expect(step.text, `${id} step ${index + 1}`).toMatch(/turn off the burner/i)
      }
    }
  })

  it('never call a staple something one recipe uses up', () => {
    // A staple is used a little at a time. A recipe that needs a whole package of it is shopping for it each time.
    for (const { id, content } of written) {
      for (const line of content.ingredients) {
        const ingredient = INGREDIENTS[line.ingredientId]
        if (ingredient.staple) expect(line.qty, `${id} ${line.ingredientId}`).toBeLessThan(ingredient.package.units)
      }
    }
  })

  it('cost less to cook than to order', () => {
    for (const { id, content } of written) {
      expect(cookCostPerServingCents(content, ESTIMATES), id).toBeLessThan(orderCostPerServingCents(content))
    }
  })
})

describe('the copy', () => {
  /** A hand-written sentence and where it lives. */
  type Copy = readonly [where: string, text: string]
  // Prep notes are left out: "1 for the beef, ½ for the sauce" is a terse form of its own.
  const copy: readonly Copy[] = [
    ...RECIPES.flatMap((recipe): Copy[] => [
      [recipe.id, recipe.title],
      [recipe.id, recipe.blurb],
      [recipe.id, recipe.content.pairing.principle],
      [recipe.id, recipe.content.pairing.why],
      [`${recipe.id} leftovers`, recipe.content.leftovers?.reheat ?? ''],
      ...recipe.content.steps.flatMap((step, index): Copy[] => [
        [`${recipe.id} step ${index + 1}`, step.text],
        [`${recipe.id} step ${index + 1} why`, step.why ?? ''],
      ]),
    ]),
    ...Object.entries(TECHNIQUES).map(([id, technique]): Copy => [id, technique.summary]),
    ...Object.entries(DISCIPLINES).map(([id, discipline]): Copy => [id, discipline.summary]),
    ...Object.entries(EQUIPMENT).map(([id, item]): Copy => [id, item.note ?? '']),
    ...Object.entries(SPICES).flatMap(([id, spice]) => [spice.tastes, spice.buy, spice.use, ...spice.tryOn].map((text): Copy => [id, text])),
    ...SPICE_HABITS.flatMap(({ habit, why }) => [habit, why].map((text): Copy => [habit, text])),
    ...SPICES_LATER.map(({ name, why }): Copy => [name, why]),
  ]

  it('put the serial comma in every list: "salt, oil, and lemons"', () => {
    // One word on each side, "X, Y and Z", tells a list from a clause such as "Cook, stirring now and then".
    const unserial = /\b\w+, \w+ (?:and|or) \w+/g
    // These read like that and are not lists.
    const notLists = ['stirring and scraping', 'wash and dry', 'low and close', 'seeds and all']
    for (const [where, text] of copy) {
      const lists = [...text.matchAll(unserial)].map((match) => match[0]).filter((list) => !notLists.some((phrase) => list.includes(phrase)))
      expect(lists, where).toEqual([])
    }
  })

  it('name every ingredient and tool without a comma, since lists of them are joined with commas', () => {
    // "You cooked with a grater, a 12-inch skillet, and tongs" cannot tell which comma ends a name.
    const names = [
      ...Object.values(INGREDIENTS).flatMap((ingredient: Ingredient) => [ingredient.name, ingredient.plural ?? '']),
      ...Object.values(EQUIPMENT).map((item) => item.name),
    ]
    expect(names.filter((name) => name.includes(','))).toEqual([])
  })
})
