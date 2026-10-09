// What is in the cart, kept on this phone while the cook shops. A store is
// where signal is weakest, so a tick never waits on the network: the ticks
// reach Supabase together, through the one "Done shopping" call, and wait
// here until it succeeds (Rowan's call, October 9, 2026). Kept per account,
// so another account signed in on this phone starts with an empty cart.

import { INGREDIENTS, type IngredientId } from '../curriculum/ingredients'

const key = (owner: string) => `first-course:grocery-checks:${owner}`

export function loadChecks(storage: Storage, owner: string): Set<IngredientId> {
  const stored = storage.getItem(key(owner))
  if (stored === null) return new Set()
  const parsed: unknown = JSON.parse(stored)
  if (!Array.isArray(parsed)) throw new Error('The grocery ticks saved on this phone are not a list')
  return new Set(
    parsed.map((id: unknown) => {
      if (typeof id !== 'string' || !Object.hasOwn(INGREDIENTS, id)) {
        throw new Error(`Your grocery list has an ingredient the menu no longer has: ${String(id)}`)
      }
      return id as IngredientId
    }),
  )
}

export function saveChecks(storage: Storage, owner: string, checks: ReadonlySet<IngredientId>) {
  if (checks.size === 0) storage.removeItem(key(owner))
  else storage.setItem(key(owner), JSON.stringify([...checks]))
}
