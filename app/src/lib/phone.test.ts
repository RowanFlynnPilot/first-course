// What the phone keeps between visits: the cart and the cook in progress
// (the timers have their own tests).

import { describe, expect, it } from 'vitest'
import { CART_KEEPS_MS, EMPTY_CART, loadCart, saveCart, settleCart } from './cart'
import { clearCooking, loadCooking, RESUME_FOR_MS, saveCooking } from './cooking'
import { memoryStorage } from './memoryStorage'
import type { Shop } from './shop'

const NOW = Date.parse('2026-10-09T18:00:00-05:00')

describe('the cart', () => {
  it('survives a save and a load, for its account only', () => {
    const storage = memoryStorage()
    saveCart(storage, 'rowan', {
      checks: new Set(['kosher-salt', 'lemon']),
      kitChecks: new Set(['thermometer']),
      checkedFor: ['chopped-salad'],
      at: NOW,
    })
    const cart = loadCart(storage, 'rowan', NOW + 60_000)
    expect([...cart.checks].toSorted()).toEqual(['kosher-salt', 'lemon'])
    expect([...cart.kitChecks]).toEqual(['thermometer'])
    expect(cart.checkedFor).toEqual(['chopped-salad'])
    expect(loadCart(storage, 'someone-else', NOW)).toEqual(EMPTY_CART)
  })

  it('is forgotten once nothing has been checked in it for two days', () => {
    const storage = memoryStorage()
    saveCart(storage, 'rowan', { checks: new Set(['butter']), kitChecks: new Set(), checkedFor: ['grilled-cheese'], at: NOW })
    expect(loadCart(storage, 'rowan', NOW + CART_KEEPS_MS).checks.size).toBe(1)
    expect(loadCart(storage, 'rowan', NOW + CART_KEEPS_MS + 1)).toEqual(EMPTY_CART)
    expect(storage.length).toBe(0)
  })

  it('leaves nothing behind once it is empty, and forgets checks kept before it knew its list', () => {
    const storage = memoryStorage()
    saveCart(storage, 'rowan', { checks: new Set(['lemon']), kitChecks: new Set(), checkedFor: ['chopped-salad'], at: NOW })
    saveCart(storage, 'rowan', EMPTY_CART)
    expect(storage.length).toBe(0)
    storage.setItem('first-course:grocery-checks:rowan', JSON.stringify(['lemon']))
    expect(loadCart(storage, 'rowan', NOW)).toEqual(EMPTY_CART)
    expect(storage.length).toBe(0)
  })

  it('refuses an ingredient the menu does not have, rather than drop it quietly', () => {
    const storage = memoryStorage()
    storage.setItem('first-course:cart:rowan', JSON.stringify({ checks: ['lemon', 'unicorn'], kitChecks: [], checkedFor: [], at: NOW }))
    expect(() => loadCart(storage, 'rowan', NOW)).toThrow('Your grocery list has an ingredient the menu no longer has: unicorn')
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
    at: NOW,
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

  it('drops checks on food the list no longer has, but keeps staples and kit in the cart for Done shopping', () => {
    // The thighs were cooked before Done shopping: the chicken is eaten, the olive oil and the thermometer are still bought.
    const settled = settleCart(shop({ plan: [], checks: new Set(['chicken-thighs', 'olive-oil']) }))
    expect([...settled.checks]).toEqual(['olive-oil'])
    expect([...settled.kitChecks]).toEqual(['thermometer'])
  })

  it('drops a staple the pantry has now, and kit the kit has now', () => {
    const settled = settleCart(shop({ checks: new Set(['olive-oil']), pantry: new Set(['olive-oil']), kit: new Set(['thermometer']) }))
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
  const cooking = { recipeId: 'seared-chicken-thighs', step: 7, from: 0, cooksBefore: 0, at: NOW }

  it('comes back for half a day, then is forgotten', () => {
    const storage = memoryStorage()
    saveCooking(storage, 'rowan', cooking)
    expect(loadCooking(storage, 'rowan', NOW + 60_000)).toEqual(cooking)
    expect(loadCooking(storage, 'rowan', NOW + RESUME_FOR_MS + 1)).toBeNull()
    expect(loadCooking(storage, 'someone-else', NOW)).toBeNull()
  })

  it('remembers a cook finished and not yet logged until the end of the next day', () => {
    const storage = memoryStorage()
    // Finished at 6 PM on October 9 where the phone is: still asked about all of October 10, gone on the 11th.
    const local = (day: number, hour: number, minute: number) => new Date(2026, 9, day, hour, minute).getTime()
    saveCooking(storage, 'rowan', { ...cooking, step: 'log', at: local(9, 18, 0) })
    expect(loadCooking(storage, 'rowan', local(10, 23, 30))?.step).toBe('log')
    expect(loadCooking(storage, 'rowan', local(11, 0, 30))).toBeNull()
    clearCooking(storage, 'rowan')
    expect(loadCooking(storage, 'rowan', NOW)).toBeNull()
  })

  it('reads one kept before the first step and the cooks before it were, as begun at the start with none', () => {
    const storage = memoryStorage()
    storage.setItem('first-course:cooking:rowan', JSON.stringify({ recipeId: 'chopped-salad', step: 3, at: NOW }))
    expect(loadCooking(storage, 'rowan', NOW)).toMatchObject({ from: 0, cooksBefore: 0 })
  })

  it('refuses a malformed one', () => {
    const storage = memoryStorage()
    storage.setItem('first-course:cooking:rowan', JSON.stringify({ recipeId: 'chopped-salad', step: -1, at: NOW }))
    expect(() => loadCooking(storage, 'rowan', NOW)).toThrow('malformed')
  })
})
