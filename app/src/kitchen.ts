// The kitchen: what the screens read (who is signed in, the chef, the cook
// log, the shop) and the ways they change it, in one context. A screen takes
// what it needs with useKitchen() instead of every layer passing it down.
// App.tsx provides it once the opening reads are in, and every change goes
// through the functions here, which apply it to the latest state (App.tsx).

import { createContext, useContext } from 'react'
import type { Chef } from './lib/chefs'
import type { CookLog } from './lib/progress'
import type { Shop, ShopChange } from './lib/shop'

export interface Kitchen {
  readonly userId: string
  /** The signed-in account's email, said beside Sign out so a cook knows whose kitchen this is. */
  readonly email: string | null
  readonly chef: Chef
  /** Frozen: progress is kept per log array (lib/progress.ts). */
  readonly logs: readonly CookLog[]
  readonly shop: Shop
  readonly onShopChange: ShopChange
  readonly onChefSaved: (chef: Chef) => void
  /** A cook saved: added to the log, and its recipe taken off the plan (00006). */
  readonly onLogged: (log: CookLog) => void
  readonly onLogUpdated: (log: CookLog) => void
  readonly onLogDeleted: (id: string) => void
  readonly onSignOut: () => Promise<void>
}

export const KitchenContext = createContext<Kitchen | null>(null)

/** The kitchen, for a screen drawn inside it. */
export function useKitchen(): Kitchen {
  const kitchen = useContext(KitchenContext)
  if (kitchen === null) throw new Error('A screen was drawn before the kitchen loaded')
  return kitchen
}
