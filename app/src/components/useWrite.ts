// One write to Supabase from a button: busy while it runs, and the error
// message on screen if it fails. Writes throw a message that says what failed
// (see lib/shop.ts and lib/cookLogs.ts).

import { useRef, useState } from 'react'

export function useWrite() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // A tap while the write is out does nothing. So a button can say it is busy
  // with aria-disabled and keep focus, where a disabled button drops it.
  const running = useRef(false)

  async function run(write: () => Promise<void>) {
    if (running.current) return
    running.current = true
    setBusy(true)
    setError(null)
    try {
      await write()
    } catch (cause) {
      setError((cause as Error).message)
    } finally {
      running.current = false
      setBusy(false)
    }
  }

  return { busy, error, run }
}
