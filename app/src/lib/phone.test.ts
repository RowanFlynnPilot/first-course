// What the phone keeps between visits: the cart and the cook in progress
// (the timers have their own tests).

import { describe, expect, it } from 'vitest'
import { EMPTY_CART, loadCart, saveCart, settleCart } from './checks'
import { clearCooking, loadCooking, RESUME_FOR_MS, saveCooking } from './cooking'
import { memoryStorage } from './memoryStorage'
import type { Shop } from './shop'

const NOW = Date.parse('2026-10-09T18:00:00-05:00')

describe('the cart', () => {
  it('survives a save and a load, for its account only', () => {
    const storage = memoryStorage()
    saveCart(storage, 'rowan', { checks: new Set(['kosher-salt', 'lemon']), kitChecks: new Set(['thermometer']), checkedFor: ['chopped-salad'] })
    const cart = loadCart(storage, 'rowan')
    expect([...cart.checks].toSorted()).toEqual(['kosher-salt', 'lemon'])
    expect([...cart.kitChecks]).toEqual(['thermometer'])
    expect(cart.checkedFor).toEqual(['chopped-salad'])
    expect(loadCart(storage, 'someone-else')).toEqual(EMPTY_CART)
  })

  it('leaves nothing behind once it is empty, and forgets checks kept before it knew its list', () => {
    const storage = memoryStorage()
    saveCart(storage, 'rowan', { checks: new Set(['lemon']), kitChecks: new Set(), checkedFor: ['chopped-salad'] })
    saveCart(storage, 'rowan', EMPTY_CART)
    expect(storage.length).toBe(0)
    storage.setItem('first-course:grocery-checks:rowan', JSON.stringify(['lemon']))
    expect(loadCart(storage, 'rowan')).toEqual(EMPTY_CART)
    expect(storage.length).toBe(0)
  })

  it('refuses an ingredient the menu does not have, rather than drop it quietly', () => {
    const storage = memoryStorage()
    storage.setItem('first-course:cart:rowan', JSON.stringify({ checks: ['lemon', 'unicorn'], kitChecks: [], checkedFor: [] }))
    expect(() => loadCart(storage, 'rowan')).toThrow('Your grocery list has an ingredient the menu no longer has: unicorn')
  })
})

describe('settling the cart to the list', () => {
  const shop = (change: Partial<Shop>): Shop => ({
    plan: ['seared-chicken-thighs'],
    shopped: new Set(),
    shoppedOn: new Map(),
    pantry: new Set(),
    prices: new Map(),
    kit: new Set(['chefs-knife']),
    checks: new Set(['chicken-thighs', 'broccoli']),
    kitChecks: new Set(['thermometer']),
    checkedFor: ['seared-chicken-thighs'],
    ...change,
  })

  it('keeps checks on the list they were made for', () => {
    const settled = settleCart(shop({}))
    expect([...settled.checks].toSorted()).toEqual(['broccoli', 'chicken-thighs'])
    expect([...settled.kitChecks]).toEqual(['thermometer'])
  })

  it('drops checks on what a recipe new to the list uses, as when it was planned on another device', () => {
    // The thighs were checked for the seared thighs, cooked since; the pan sauce, planned elsewhere, uses thighs too.
    const settled = settleCart(shop({ plan: ['chicken-pan-sauce'], checkedFor: ['seared-chicken-thighs'] }))
    expect(settled.checks.has('chicken-thighs')).toBe(false)
    expect(settled.checkedFor).toEqual(['chicken-pan-sauce'])
  })

  it('drops checks on lines the list no longer has, and kit the plan no longer needs', () => {
    const settled = settleCart(shop({ plan: [], checkedFor: ['seared-chicken-thighs'] }))
    expect(settled.checks.size).toBe(0)
    expect(settled.kitChecks.size).toBe(0)
  })

  it('keeps checks on lines still listed when a recipe on the list is bought', () => {
    const plan = ['seared-chicken-thighs', 'chicken-pan-sauce']
    const settled = settleCart(shop({ plan, shopped: new Set(['chicken-pan-sauce']), checkedFor: plan }))
    expect(settled.checks.has('chicken-thighs')).toBe(true)
  })
})

describe('the cook in progress', () => {
  it('comes back for half a day, then is forgotten', () => {
    const storage = memoryStorage()
    saveCooking(storage, 'rowan', { recipeId: 'seared-chicken-thighs', step: 7, from: 0, at: NOW })
    expect(loadCooking(storage, 'rowan', NOW + 60_000)).toEqual({ recipeId: 'seared-chicken-thighs', step: 7, from: 0, at: NOW })
    expect(loadCooking(storage, 'rowan', NOW + RESUME_FOR_MS + 1)).toBeNull()
    expect(loadCooking(storage, 'someone-else', NOW)).toBeNull()
  })

  it('remembers a cook finished and not yet logged', () => {
    const storage = memoryStorage()
    saveCooking(storage, 'rowan', { recipeId: 'chopped-salad', step: 'log', from: 0, at: NOW })
    expect(loadCooking(storage, 'rowan', NOW)?.step).toBe('log')
    clearCooking(storage, 'rowan')
    expect(loadCooking(storage, 'rowan', NOW)).toBeNull()
  })

  it('reads one kept before the first step was, as begun at the start', () => {
    const storage = memoryStorage()
    storage.setItem('first-course:cooking:rowan', JSON.stringify({ recipeId: 'chopped-salad', step: 3, at: NOW }))
    expect(loadCooking(storage, 'rowan', NOW)?.from).toBe(0)
  })

  it('refuses a malformed one', () => {
    const storage = memoryStorage()
    storage.setItem('first-course:cooking:rowan', JSON.stringify({ recipeId: 'chopped-salad', step: -1, at: NOW }))
    expect(() => loadCooking(storage, 'rowan', NOW)).toThrow('malformed')
  })
})
