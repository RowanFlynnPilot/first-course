// Graph rules the type system cannot check. Ids of skills and ingredients are
// already checked at compile time.

import { describe, expect, it } from 'vitest'
import { cookCostPerServingCents, ESTIMATES, orderCostPerServingCents } from '../lib/cost'
import { formatAmount } from '../lib/format'
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

  it('only writes recipes whose prerequisites are also written', () => {
    for (const recipe of RECIPES) {
      if (recipe.content === null) continue
      for (const technique of recipe.requires) {
        expect(teacherOf(technique).content, `${recipe.id} needs ${technique}`).not.toBeNull()
      }
    }
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
        formatAmount(line.qty, INGREDIENTS[line.ingredientId].unit) // throws on an unprintable fraction
      }
      for (const step of content.steps) {
        if (step.timerSeconds !== null) expect(step.timerSeconds, id).toBeGreaterThan(0)
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

  it('cost less to cook than to order', () => {
    for (const { id, content } of written) {
      expect(cookCostPerServingCents(content, ESTIMATES), id).toBeLessThan(orderCostPerServingCents(content))
    }
  })
})
