import { describe, expect, it } from 'vitest'
import { EQUIPMENT } from '../curriculum/equipment'
import { INGREDIENTS } from '../curriculum/ingredients'
import { RECIPES } from '../curriculum/recipes'
import { EXTRAS } from './extras'

// Migration 00008 checks every id a row holds against these shapes, so a new
// id that broke them could never be saved. Kept in step with the migration.
const ID = /^[a-z0-9-]{1,64}$/
const EXTRA_ID = /^[a-z0-9-]{1,32}$/

describe('ids the database checks', () => {
  it('fit migration 00008', () => {
    for (const recipe of RECIPES) expect(recipe.id, recipe.id).toMatch(ID)
    for (const id of Object.keys(INGREDIENTS)) expect(id, id).toMatch(ID)
    for (const id of Object.keys(EQUIPMENT)) expect(id, id).toMatch(ID)
    for (const extra of EXTRAS) expect(extra.id, extra.id).toMatch(EXTRA_ID)
  })
})
