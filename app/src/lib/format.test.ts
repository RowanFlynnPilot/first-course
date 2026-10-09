import { describe, expect, it } from 'vitest'
import {
  checkCookedOn,
  formatCents,
  formatClock,
  formatDuration,
  formatMinutes,
  inSentence,
  listOf,
  listPieces,
  packagesOf,
  MAX_PRICE_CENTS,
  parseCents,
  readyAt,
} from './format'

describe('when dinner would be ready', () => {
  it('is the time the cook starts plus the recipe, to the nearest 5 minutes', () => {
    const six = new Date(2026, 9, 9, 18, 0, 3).getTime()
    expect(readyAt(six, 10)).toMatch(/^6:10\sPM$/u)
    expect(readyAt(six, 55)).toMatch(/^6:55\sPM$/u)
    expect(readyAt(six + 2 * 60_000, 10)).toMatch(/^6:10\sPM$/u)
    expect(readyAt(six + 3 * 60_000, 10)).toMatch(/^6:15\sPM$/u)
  })
})

describe('format', () => {
  it('reads a clock under an hour as m:ss and an hour or more as h:mm:ss', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(545)).toBe('9:05')
    expect(formatClock(3599)).toBe('59:59')
    expect(formatClock(3600)).toBe('1:00:00')
    expect(formatClock(9000)).toBe('2:30:00')
  })

  it('says how long a timer runs in words, and refuses part of a minute', () => {
    expect(formatDuration(60)).toBe('1 minute')
    expect(formatDuration(900)).toBe('15 minutes')
    expect(formatDuration(3600)).toBe('1 hour')
    expect(formatDuration(9000)).toBe('2 hours 30 minutes')
    expect(() => formatDuration(90)).toThrow('whole minutes')
  })

  it('says how many packages to buy in words when it can', () => {
    expect(packagesOf(1, '1 red onion')).toBe('1 red onion')
    expect(packagesOf(2, '1 red onion')).toBe('2 red onions')
    expect(packagesOf(3, '1 vine tomato')).toBe('3 vine tomatoes')
    expect(packagesOf(2, '1 bunch')).toBe('2 bunches')
    expect(packagesOf(2, '1 dozen')).toBe('2 dozen')
    expect(packagesOf(2, '1.5 lb pack')).toBe('2 × 1.5 lb pack')
    expect(packagesOf(2, '1 bunch (about 6)')).toBe('2 × 1 bunch (about 6)')
  })

  it('writes money with a thousands comma, and long times in hours', () => {
    expect(formatCents(0)).toBe('$0.00')
    expect(formatCents(133_832)).toBe('$1,338.32')
    expect(formatMinutes(35)).toBe('35 minutes')
    expect(formatMinutes(165)).toBe('2 hours 45 minutes')
  })

  it('takes a cook dated today or earlier, and nothing else', () => {
    expect(() => checkCookedOn('2026-10-05', '2026-10-05')).not.toThrow()
    expect(() => checkCookedOn('2026-09-30', '2026-10-05')).not.toThrow()
    expect(() => checkCookedOn('2026-10-06', '2026-10-05')).toThrow('after today')
    expect(() => checkCookedOn('', '2026-10-05')).toThrow('Choose the date')
  })

  it('keeps a proper noun capitalized in the middle of a sentence', () => {
    expect(inSentence('Kosher salt')).toBe('kosher salt')
    expect(inSentence('Thai green curry paste')).toBe('Thai green curry paste')
    expect(inSentence('Chef’s knife')).toBe('chef’s knife')
  })

  it('reads a price the way a cook types it', () => {
    expect(parseCents('3.49')).toBe(349)
    expect(parseCents('$3.49')).toBe(349)
    expect(parseCents(' 3 ')).toBe(300)
    expect(parseCents('3.5')).toBe(350)
    expect(parseCents('.99')).toBe(99)
    expect(parseCents('$.5')).toBe(50)
    for (const typed of ['', '0', '0.00', 'three', '3.499', '-2', '$']) expect(() => parseCents(typed), typed).toThrow('like 3.49')
  })

  it('joins a list of links the same way listOf joins words', () => {
    const words = ['salt', 'oil', 'lemons']
    for (const count of [1, 2, 3]) {
      const joined = listPieces(count)
        .map((piece) => ('text' in piece ? piece.text : words[piece.index]))
        .join('')
      expect(joined).toBe(listOf(words.slice(0, count)))
    }
  })

  it('refuses a price over $1,000 in plain words, as the database would', () => {
    expect(parseCents('1000')).toBe(MAX_PRICE_CENTS)
    expect(() => parseCents('1000.01')).toThrow('more than $1,000')
    expect(() => parseCents('99999999999')).toThrow('more than $1,000')
  })

  it('refuses a cook dated before 1900, as the database does, in plain words', () => {
    expect(() => checkCookedOn('1900-01-01', '2026-10-09')).not.toThrow()
    expect(() => checkCookedOn('1899-12-31', '2026-10-09')).toThrow('Choose a date after 1900.')
    expect(() => checkCookedOn('0026-10-09', '2026-10-09')).toThrow('Choose a date after 1900.')
  })
})
