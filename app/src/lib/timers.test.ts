import { describe, expect, it } from 'vitest'
import { clearTimers, dueTimers, liveTimers, loadTimers, saveTimers, STALE_AFTER_MS } from './timers'

// A minimal Storage, so the tests do not need a browser.
function memoryStorage(): Storage {
  const items = new Map<string, string>()
  return {
    get length() {
      return items.size
    },
    clear: () => items.clear(),
    getItem: (name) => items.get(name) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (name) => void items.delete(name),
    setItem: (name, value) => void items.set(name, value),
  }
}

const NOW = Date.parse('2026-10-04T18:00:00Z')

describe('cook-mode timers', () => {
  it('survive a save and a load', () => {
    const storage = memoryStorage()
    saveTimers(storage, 'sheet-pan-sausage', { Potatoes: { endsAt: NOW + 60_000, rang: false } })
    expect(loadTimers(storage, 'sheet-pan-sausage', NOW)).toEqual({ Potatoes: { endsAt: NOW + 60_000, rang: false } })
    expect(loadTimers(storage, 'chopped-salad', NOW)).toEqual({})
  })

  it('drop a timer that finished more than half an hour ago, and keep one that just finished', () => {
    const timers = {
      Potatoes: { endsAt: NOW - STALE_AFTER_MS - 1, rang: true },
      Roasting: { endsAt: NOW - 1000, rang: true },
    }
    expect(liveTimers(timers, NOW)).toEqual({ Roasting: { endsAt: NOW - 1000, rang: true } })
  })

  it('know which ran out and have not chimed', () => {
    const timers = {
      Potatoes: { endsAt: NOW - 1000, rang: false },
      Rice: { endsAt: NOW - 1000, rang: true },
      Roasting: { endsAt: NOW + 1000, rang: false },
    }
    expect(dueTimers(timers, NOW)).toEqual(['Potatoes'])
  })

  it('are cleared, and an empty set leaves nothing behind', () => {
    const storage = memoryStorage()
    saveTimers(storage, 'sheet-pan-sausage', { Potatoes: { endsAt: NOW, rang: false } })
    clearTimers(storage, 'sheet-pan-sausage')
    expect(storage.length).toBe(0)
    saveTimers(storage, 'sheet-pan-sausage', {})
    expect(storage.length).toBe(0)
  })

  it('refuse saved data they did not write', () => {
    const storage = memoryStorage()
    storage.setItem('first-course:timers-by-label:sheet-pan-sausage', JSON.stringify({ Potatoes: { endsAt: 'soon' } }))
    expect(() => loadTimers(storage, 'sheet-pan-sausage', NOW)).toThrow('malformed')
  })
})
