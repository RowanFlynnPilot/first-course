import { useEffect } from 'react'

const APP = 'First Course'

/**
 * The title of the screen, for the browser tab, the app switcher and screen
 * readers: "This week · First Course". null is the menu, titled just the app.
 */
export function usePageTitle(title: string | null) {
  useEffect(() => {
    document.title = title === null ? APP : `${title} · ${APP}`
  }, [title])
}
