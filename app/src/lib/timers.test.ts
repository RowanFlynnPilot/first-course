import { describe, expect, it } from 'vitest'
import { RESUME_FOR_MS } from './cooking'
import { memoryStorage } from './memoryStorage'
import { clearTimers, dueTimers, forgetOldTimers, loadTimers, saveTimers, shownTimers, STALE_AFTER_MS, stopped } from './timers'

const NOW = Date.parse('2026-10-04T18:00:00Z')
const COOK = 'b6a1c0de-0000-4000-8000-000000000001'
const OTHER = 'b6a1c0de-0000-4000-8000-000000000002'

describe('cook-mode timers', () => {
  it('forget a cook left long ago, and keep one still going', () => {
    const storage = memoryStorage()
    saveTimers(storage, COOK, 'ragu-bolognese', { Ragù: { endsAt: NOW - RESUME_FOR_MS - 1, rang: true, stopped: false } })
    saveTimers(storage, COOK, 'sheet-pan-sausage', { Potatoes: { endsAt: NOW - 60_000, rang: true, stopped: false } })
    storage.setItem('something-else', 'kept')
    // Another account's stored data, even malformed, is not this account's to read.
    storage.setItem(`first-course:timers:${OTHER}:sheet-pan-sausage`, 'not json')
    forgetOldTimers(storage, COOK, NOW)
    expect(storage.getItem(`first-course:timers:${OTHER}:sheet-pan-sausage`)).toBe('not json')
    expect(loadTimers(storage, COOK, 'ragu-bolognese')).toEqual({})
    expect(Object.keys(loadTimers(storage, COOK, 'sheet-pan-sausage'))).toEqual(['Potatoes'])
    expect(storage.getItem('something-else')).toBe('kept')
  })

  it('survive a save and a load, for the account that saved them only', () => {
    const storage = memoryStorage()
    saveTimers(storage, COOK, 'sheet-pan-sausage', { Potatoes: { endsAt: NOW + 60_000, rang: false, stopped: false } })
    expect(loadTimers(storage, COOK, 'sheet-pan-sausage')).toEqual({ Potatoes: { endsAt: NOW + 60_000, rang: false, stopped: false } })
    expect(loadTimers(storage, COOK, 'chopped-salad')).toEqual({})
    expect(loadTimers(storage, OTHER, 'sheet-pan-sausage')).toEqual({})
    clearTimers(storage, OTHER, 'sheet-pan-sausage')
    expect(Object.keys(loadTimers(storage, COOK, 'sheet-pan-sausage'))).toEqual(['Potatoes'])
  })

  it('hide one finished more than half an hour ago, and one stopped, but keep both as started', () => {
    const timers = {
      Potatoes: { endsAt: NOW - STALE_AFTER_MS - 1, rang: true, stopped: false },
      Roasting: { endsAt: NOW - 1000, rang: true, stopped: false },
      Rice: stopped({ endsAt: NOW + 60_000, rang: false, stopped: false }, NOW),
    }
    expect(shownTimers(timers, NOW)).toEqual({ Roasting: { endsAt: NOW - 1000, rang: true, stopped: false } })
    expect(Object.keys(timers)).toEqual(['Potatoes', 'Roasting', 'Rice'])
  })

  it('stop at once: ended now, its ring over, and hidden', () => {
    expect(stopped({ endsAt: NOW + 60_000, rang: false, stopped: false }, NOW)).toEqual({ endsAt: NOW, rang: true, stopped: true })
    // One that already ran out keeps its end time.
    expect(stopped({ endsAt: NOW - 5000, rang: false, stopped: false }, NOW).endsAt).toBe(NOW - 5000)
  })

  it('know which ran out and have not chimed', () => {
    const timers = {
      Potatoes: { endsAt: NOW - 1000, rang: false, stopped: false },
      Rice: { endsAt: NOW - 1000, rang: true, stopped: false },
      Roasting: { endsAt: NOW + 1000, rang: false, stopped: false },
    }
    expect(dueTimers(timers, NOW)).toEqual(['Potatoes'])
  })

  it('are cleared, and an empty set leaves nothing behind', () => {
    const storage = memoryStorage()
    saveTimers(storage, COOK, 'sheet-pan-sausage', { Potatoes: { endsAt: NOW, rang: false, stopped: false } })
    clearTimers(storage, COOK, 'sheet-pan-sausage')
    expect(storage.length).toBe(0)
    saveTimers(storage, COOK, 'sheet-pan-sausage', {})
    expect(storage.length).toBe(0)
  })

  it('refuse saved data they did not write', () => {
    const storage = memoryStorage()
    storage.setItem(`first-course:timers:${COOK}:sheet-pan-sausage`, JSON.stringify({ Potatoes: { endsAt: 'soon' } }))
    expect(() => loadTimers(storage, COOK, 'sheet-pan-sausage')).toThrow('malformed')
  })
})
