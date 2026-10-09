// Where the menu was scrolled, so a "Menu" back link opens it there, as Back
// would. The installed app has no Back button, so these links are the way
// back, and a cook browsing the Fourth course should not land at the top
// every time. A save lands at the top, where its notice is.

import { useEffect } from 'react'

/** The state a "Menu" back link carries. */
export const BACK_TO_MENU = { back: true } as const

let menuScroll = 0

/** Where the menu was scrolled when the cook last left it. */
export function menuScrollPosition(): number {
  return menuScroll
}

/** Keeps track of the menu's scroll while it is on screen. */
export function useKeepMenuScroll() {
  useEffect(() => {
    const keep = () => {
      menuScroll = window.scrollY
    }
    window.addEventListener('scroll', keep, { passive: true })
    return () => window.removeEventListener('scroll', keep)
  }, [])
}
