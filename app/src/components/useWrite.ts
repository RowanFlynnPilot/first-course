// One write to Supabase from a button: busy while it runs, and the error
// message on screen if it fails. Writes throw a message that says what failed
// (see lib/shop.ts and lib/cookLogs.ts).

import { useState } from 'react'

export function useWrite() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(write: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await write()
    } catch (cause) {
      setError((cause as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return { busy, error, run }
}
