// What the phone keeps between visits: the cart's checks and the cook in
// progress (the timers have their own tests).

import { describe, expect, it } from 'vitest'
import { loadChecks, saveChecks } from './checks'
import { clearCooking, loadCooking, RESUME_FOR_MS, saveCooking } from './cooking'
import { memoryStorage } from './memoryStorage'

const NOW = Date.parse('2026-10-09T18:00:00-05:00')

describe('the cart’s checks', () => {
  it('survive a save and a load, for their account only', () => {
    const storage = memoryStorage()
    saveChecks(storage, 'rowan', new Set(['kosher-salt', 'lemon']))
    expect([...loadChecks(storage, 'rowan')].toSorted()).toEqual(['kosher-salt', 'lemon'])
    expect(loadChecks(storage, 'someone-else').size).toBe(0)
  })

  it('leave nothing behind once the cart is empty', () => {
    const storage = memoryStorage()
    saveChecks(storage, 'rowan', new Set(['lemon']))
    saveChecks(storage, 'rowan', new Set())
    expect(storage.length).toBe(0)
  })

  it('refuse an ingredient the menu does not have, rather than drop it quietly', () => {
    const storage = memoryStorage()
    storage.setItem('first-course:grocery-checks:rowan', JSON.stringify(['lemon', 'unicorn']))
    expect(() => loadChecks(storage, 'rowan')).toThrow('Your grocery list has an ingredient the menu no longer has: unicorn')
  })
})

describe('the cook in progress', () => {
  it('comes back for half a day, then is forgotten', () => {
    const storage = memoryStorage()
    saveCooking(storage, 'rowan', { recipeId: 'seared-chicken-thighs', step: 7, at: NOW })
    expect(loadCooking(storage, 'rowan', NOW + 60_000)).toEqual({ recipeId: 'seared-chicken-thighs', step: 7, at: NOW })
    expect(loadCooking(storage, 'rowan', NOW + RESUME_FOR_MS + 1)).toBeNull()
    expect(loadCooking(storage, 'someone-else', NOW)).toBeNull()
  })

  it('remembers a cook finished and not yet logged', () => {
    const storage = memoryStorage()
    saveCooking(storage, 'rowan', { recipeId: 'chopped-salad', step: 'log', at: NOW })
    expect(loadCooking(storage, 'rowan', NOW)?.step).toBe('log')
    clearCooking(storage, 'rowan')
    expect(loadCooking(storage, 'rowan', NOW)).toBeNull()
  })

  it('refuses a malformed one', () => {
    const storage = memoryStorage()
    storage.setItem('first-course:cooking:rowan', JSON.stringify({ recipeId: 'chopped-salad', step: -1, at: NOW }))
    expect(() => loadCooking(storage, 'rowan', NOW)).toThrow('malformed')
  })
})
