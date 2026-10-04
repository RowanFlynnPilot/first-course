import { describe, expect, it } from 'vitest'
import { EQUIPMENT, type EquipmentId } from '../curriculum/equipment'
import { RECIPES, recipeById } from '../curriculum/recipes'
import { hasKit, kitByCourse, kitFor, missingKit } from './kit'

const written = RECIPES.filter((recipe) => recipe.content !== null)

describe('the kit', () => {
  it('lists only equipment some written recipe uses', () => {
    const used = new Set(kitFor(written))
    const unused = (Object.keys(EQUIPMENT) as EquipmentId[]).filter((id) => !used.has(id))
    expect(unused).toEqual([])
  })

  it('never says an item is covered by itself or by something unknown', () => {
    for (const [id, item] of Object.entries(EQUIPMENT)) {
      for (const other of item.coveredBy) {
        expect(other, id).not.toBe(id)
        expect(Object.keys(EQUIPMENT), id).toContain(other)
      }
    }
  })

  it('counts a stainless or cast-iron skillet as a 12-inch skillet, but not the other way round', () => {
    expect(hasKit('large-skillet', new Set<EquipmentId>(['steel-skillet']))).toBe(true)
    expect(hasKit('steel-skillet', new Set<EquipmentId>(['large-skillet']))).toBe(false)
  })

  it('says what a recipe still needs', () => {
    const salad = recipeById('chopped-salad')
    expect(missingKit([salad], new Set())).toEqual(['chefs-knife', 'cutting-board', 'measuring-spoons', 'large-bowl', 'fork'])
    expect(missingKit([salad], new Set<EquipmentId>(['chefs-knife', 'cutting-board', 'measuring-spoons', 'large-bowl', 'fork']))).toEqual([])
  })

  it('files each item under the first course that needs it, once', () => {
    const courses = kitByCourse()
    expect(courses[0]?.tier).toBe(1)
    const all = courses.flatMap((course) => course.items)
    expect(new Set(all).size).toBe(all.length)
    expect(courses.find((course) => course.items.includes('thermometer'))?.tier).toBe(2)
    expect(courses.find((course) => course.items.includes('steel-skillet'))?.tier).toBe(3)
  })
})
