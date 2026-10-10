// What the phone keeps between visits: the cart and the cook in progress
// (the timers have their own tests).

import { describe, expect, it } from 'vitest'
import { boughtDay, EMPTY_CART, loadCart, saveCart, settleCart } from './cart'
import { clearCooking, cooksInProgress, loadCooking, RESUME_FOR_MS, saveCooking } from './cooking'
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
      since: NOW,
    })
    const cart = loadCart(storage, 'rowan')
    expect([...cart.checks].toSorted()).toEqual(['kosher-salt', 'lemon'])
    expect([...cart.kitChecks]).toEqual(['thermometer'])
    expect(cart.checkedFor).toEqual(['chopped-salad'])
    expect(cart.since).toBe(NOW)
    expect(loadCart(storage, 'someone-else')).toEqual(EMPTY_CART)
  })

  it('keeps until Done shopping, however long that takes', () => {
    const storage = memoryStorage()
    saveCart(storage, 'rowan', { checks: new Set(['butter']), kitChecks: new Set(), checkedFor: ['grilled-cheese'], since: null })
    expect(loadCart(storage, 'rowan').checks.size).toBe(1)
  })

  it('leaves nothing behind once it is empty, and forgets one kept before it knew when its groceries were bought', () => {
    const storage = memoryStorage()
    saveCart(storage, 'rowan', { checks: new Set(['lemon']), kitChecks: new Set(), checkedFor: ['chopped-salad'], since: NOW })
    saveCart(storage, 'rowan', EMPTY_CART)
    expect(storage.length).toBe(0)
    storage.setItem('first-course:cart:rowan', JSON.stringify({ checks: ['lemon'], kitChecks: [], checkedFor: ['chopped-salad'], at: NOW }))
    expect(loadCart(storage, 'rowan')).toEqual(EMPTY_CART)
    expect(storage.length).toBe(0)
  })

  it('refuses an ingredient the menu does not have, rather than drop it quietly', () => {
    const storage = memoryStorage()
    storage.setItem('first-course:cart:rowan', JSON.stringify({ checks: ['lemon', 'unicorn'], kitChecks: [], checkedFor: [], since: NOW }))
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
    since: NOW,
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

  it('keeps the day its groceries were bought while one is in it, and drops it with the last', () => {
    // The chicken stays checked for the thighs, whose broccoli the store was out of: still bought on the first day.
    expect(settleCart(shop({ checks: new Set(['chicken-thighs', 'olive-oil']) })).since).toBe(NOW)
    // Only staples left: they keep for weeks, so they date nothing.
    expect(settleCart(shop({ plan: [], checks: new Set(['chicken-thighs', 'olive-oil']) })).since).toBeNull()
  })
})

describe('the day the groceries were bought', () => {
  it('is the day the cart began, not the day Done shopping was tapped', () => {
    // Checked off Saturday evening; Done shopping on Monday.
    const saturday = new Date(2026, 9, 10, 18, 0).getTime()
    const cart = { ...EMPTY_CART, checks: new Set(['chicken-thighs' as const]), since: saturday }
    expect(boughtDay(cart, '2026-10-12')).toBe('2026-10-10')
    expect(boughtDay({ ...cart, since: null }, '2026-10-12')).toBe('2026-10-12')
  })
})

describe('the cooks in progress', () => {
  const cooking = { recipeId: 'seared-chicken-thighs', step: 7, from: 0, cooksBefore: 0, at: NOW }
  const THIGHS = 'seared-chicken-thighs'

  it('come back for half a day, then are forgotten', () => {
    const storage = memoryStorage()
    saveCooking(storage, 'rowan', cooking)
    expect(loadCooking(storage, 'rowan', THIGHS, NOW + 60_000)).toEqual(cooking)
    expect(loadCooking(storage, 'rowan', THIGHS, NOW + RESUME_FOR_MS + 1)).toBeNull()
    expect(loadCooking(storage, 'someone-else', THIGHS, NOW)).toBeNull()
  })

  it('keep one per recipe, so a main and its side each keep their place, the latest first', () => {
    const storage = memoryStorage()
    saveCooking(storage, 'rowan', { ...cooking, recipeId: 'oven-fries-aioli', step: 4 })
    saveCooking(storage, 'rowan', { ...cooking, recipeId: 'smash-cheeseburger', step: 2, at: NOW + 60_000 })
    expect(cooksInProgress(storage, 'rowan', NOW + 120_000).map((cook) => [cook.recipeId, cook.step])).toEqual([
      ['smash-cheeseburger', 2],
      ['oven-fries-aioli', 4],
    ])
    clearCooking(storage, 'rowan', 'smash-cheeseburger')
    expect(cooksInProgress(storage, 'rowan', NOW + 120_000).map((cook) => cook.recipeId)).toEqual(['oven-fries-aioli'])
    // Another account's are not read, and one left too long ago is left out.
    expect(cooksInProgress(storage, 'someone-else', NOW)).toEqual([])
    expect(cooksInProgress(storage, 'rowan', NOW + RESUME_FOR_MS + 1)).toEqual([])
  })

  it('remember a cook finished and not yet logged until the end of the next day', () => {
    const storage = memoryStorage()
    // Finished at 6 PM on October 9 where the phone is: still asked about all of October 10, gone on the 11th.
    const local = (day: number, hour: number, minute: number) => new Date(2026, 9, day, hour, minute).getTime()
    saveCooking(storage, 'rowan', { ...cooking, step: 'log', at: local(9, 18, 0) })
    expect(loadCooking(storage, 'rowan', THIGHS, local(10, 23, 30))?.step).toBe('log')
    expect(loadCooking(storage, 'rowan', THIGHS, local(11, 0, 30))).toBeNull()
    clearCooking(storage, 'rowan', THIGHS)
    expect(loadCooking(storage, 'rowan', THIGHS, NOW)).toBeNull()
  })

  it('refuse a malformed one', () => {
    const storage = memoryStorage()
    storage.setItem(`first-course:cooking:rowan:${THIGHS}`, JSON.stringify({ ...cooking, step: -1 }))
    expect(() => loadCooking(storage, 'rowan', THIGHS, NOW)).toThrow('malformed')
    // Kept under another recipe's name, or without where it began, is malformed too.
    storage.setItem(`first-course:cooking:rowan:${THIGHS}`, JSON.stringify({ ...cooking, recipeId: 'chopped-salad' }))
    expect(() => loadCooking(storage, 'rowan', THIGHS, NOW)).toThrow('malformed')
    storage.setItem(`first-course:cooking:rowan:${THIGHS}`, JSON.stringify({ recipeId: THIGHS, step: 3, at: NOW }))
    expect(() => loadCooking(storage, 'rowan', THIGHS, NOW)).toThrow('malformed')
  })
})
