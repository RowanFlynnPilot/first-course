// Graph rules the type system cannot check. Ids of skills and ingredients are
// already checked at compile time.

import { describe, expect, it } from 'vitest'
import { cookCostPerServingCents, ESTIMATES, orderCostPerServingCents } from '../lib/cost'
import { formatAmount, formatDuration } from '../lib/format'
import type { EquipmentId } from './equipment'
import { INGREDIENTS, type Ingredient } from './ingredients'
import { RECIPES } from './recipes'
import { TECHNIQUES, type TechniqueId } from './techniques'

const techniqueIds = Object.keys(TECHNIQUES) as TechniqueId[]

/** Characters in one step's text. Roughly ten lines in cook mode at 390px wide. */
const STEP_MAX = 360

function teacherOf(technique: TechniqueId) {
  const teachers = RECIPES.filter((recipe) => recipe.teaches.includes(technique))
  if (teachers.length !== 1) {
    throw new Error(`${technique} is taught by ${teachers.length} recipes, expected exactly 1`)
  }
  return teachers[0]!
}

describe('the menu', () => {
  it('has unique recipe ids', () => {
    const ids = RECIPES.map((recipe) => recipe.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('teaches every skill in exactly one recipe', () => {
    for (const technique of techniqueIds) teacherOf(technique)
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
      const rawMeat = recipe.content.ingredients.some(({ ingredientId }) => {
        const ingredient: Ingredient = INGREDIENTS[ingredientId]
        return ingredient.safeTempF !== undefined
      })
      if (!rawMeat) continue
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
  const written = RECIPES.flatMap((recipe) => (recipe.content ? [{ id: recipe.id, content: recipe.content }] : []))

  it('exist', () => {
    expect(written.length).toBeGreaterThan(0)
  })

  it('have steps, positive quantities that format, and no repeated ingredient', () => {
    for (const { id, content } of written) {
      expect(content.steps.length, id).toBeGreaterThan(0)
      expect(content.servings, id).toBeGreaterThan(0)
      const ids = content.ingredients.map((line) => line.ingredientId)
      expect(new Set(ids).size, id).toBe(ids.length)
      for (const line of content.ingredients) {
        expect(line.qty, `${id} ${line.ingredientId}`).toBeGreaterThan(0)
        // Whole eighths, so any sum of them prints on the grocery list too.
        expect(Number.isInteger(line.qty * 8), `${id} ${line.ingredientId} is not a whole number of eighths`).toBe(true)
        formatAmount(line.qty, INGREDIENTS[line.ingredientId].unit) // throws on an unprintable fraction
      }
      for (const step of content.steps) {
        if (step.timer === null) continue
        formatDuration(step.timer.seconds) // throws unless it is whole minutes, as the recipe page prints it
        // Short enough for a chip at the top of cook mode, beside its clock.
        expect(step.timer.label.length, `${id}: ${step.timer.label}`).toBeGreaterThan(0)
        expect(step.timer.label.length, `${id}: ${step.timer.label}`).toBeLessThanOrEqual(16)
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

  it('turn off every burner and oven they use', () => {
    for (const { id, content } of written) {
      const text = content.steps.map((step) => step.text).join(' ')
      if (content.equipment.some((item) => /skillet|saucepan|pot\b/i.test(item))) {
        expect(text, id).toMatch(/turn off (the|that) burner/i)
      }
      if (/\boven\b(?! mitt)/i.test(text)) expect(text, id).toMatch(/turn off the oven/i)
    }
  })

  it('handle raw meat safely: the thermometer, the safe temperature, and clean hands', () => {
    for (const { id, content } of written) {
      const temperatures = content.ingredients.flatMap(({ ingredientId }) => {
        const ingredient: Ingredient = INGREDIENTS[ingredientId]
        return ingredient.safeTempF === undefined ? [] : [ingredient.safeTempF]
      })
      if (temperatures.length === 0) continue
      const text = content.steps.map((step) => step.text).join(' ')
      expect(content.equipment, id).toContain('thermometer')
      for (const temperature of temperatures) expect(text, id).toContain(`at least ${temperature}°F`)
      expect(text, id).toMatch(/wash your hands/i)
      expect(text, id).toMatch(/hot, soapy water/)
    }
  })

  it('list every tool a step names, so the kit is honest', () => {
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
      // The verb, not the noun: "slice the garlic", never "a slice of bread".
      [/\b(slice|chop|mince|dice|cut) (the|it|them|a|an|into|in|each|both|one|crosswise|thin)\b/i, ['chefs-knife']],
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
        // The last word of the name before any comma or parentheses: "Neutral oil (canola or vegetable)" is "oil".
        const words = (INGREDIENTS[line.ingredientId].name.replace(/\s*\(.*?\)/g, '').split(',')[0] ?? '')
          .toLowerCase()
          .split(' ')
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
    const amount = String.raw`(\d+)?\s*([⅛¼⅜½⅝¾⅞])?`
    const GLYPHS: Record<string, number> = { '⅛': 0.125, '¼': 0.25, '⅜': 0.375, '½': 0.5, '⅝': 0.625, '¾': 0.75, '⅞': 0.875 }
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
      for (const { ingredientId } of content.ingredients) {
        const ingredient: Ingredient = INGREDIENTS[ingredientId]
        const temperature = ingredient.safeTempF
        if (temperature === undefined) continue
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

  it('drain a pot into a colander with oven mitts, tipping it away from you', () => {
    for (const { id, content } of written) {
      for (const [index, step] of content.steps.entries()) {
        if (!/pour [^.]*into the colander/i.test(step.text)) continue
        expect(step.text, `${id} step ${index + 1}`).toMatch(/oven mitts/i)
        expect(step.text, `${id} step ${index + 1}`).toMatch(/away from you/i)
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
