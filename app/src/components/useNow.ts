// The time, kept current for a screen that says what time it is or what day
// it is: it moves on every minute, and at once when the page comes back into
// view, since an installed app can sit open in the background overnight.

import { useEffect, useState } from 'react'
import { localDateString } from '../lib/format'

const EVERY_MS = 60 * 1000

export function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const update = () => setNow(Date.now())
    const tick = window.setInterval(update, EVERY_MS)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearInterval(tick)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])
  return now
}

/** Today's date where the cook is standing, YYYY-MM-DD, kept current like useNow. */
export function useToday(): string {
  return localDateString(new Date(useNow()))
}
