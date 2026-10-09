import { describe, expect, it } from 'vitest'
import { INGREDIENTS } from '../curriculum/ingredients'
import { SPICES, type SpiceId } from '../curriculum/spices'
import { spiceShelf } from './spices'

describe('the spice shelf', () => {
  it('files every spice in the guide under the course that first uses it, once', () => {
    const shelf = spiceShelf()
    const ids = shelf.flatMap((course) => course.items.map((spice) => spice.id))
    expect(ids.toSorted()).toEqual((Object.keys(SPICES) as SpiceId[]).toSorted())
    // The Fourth course adds no new spice.
    expect(shelf.map((course) => course.tier)).toEqual([1, 2, 3])
  })

  it('starts with salt, pepper and pepper flakes, and ends with paprika', () => {
    const shelf = spiceShelf()
    expect(shelf[0]?.items.map((spice) => spice.id)).toEqual(['kosher-salt', 'black-pepper', 'red-pepper-flakes'])
    expect(shelf[0]?.items[0]?.firstIn.id).toBe('chopped-salad')
    expect(shelf.at(-1)?.items.map((spice) => spice.id).at(-1)).toBe('paprika')
    expect(shelf.at(-1)?.items.at(-1)?.firstIn.id).toBe('chicken-tikka')
  })

  it('only guides pantry staples, the things you keep a jar of', () => {
    for (const id of Object.keys(SPICES) as SpiceId[]) expect(INGREDIENTS[id].staple, id).toBe(true)
  })
})
