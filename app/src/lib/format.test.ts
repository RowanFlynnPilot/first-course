import { describe, expect, it } from 'vitest'
import { formatClock, inSentence, packagesOf } from './format'

describe('format', () => {
  it('reads a clock under an hour as m:ss and an hour or more as h:mm:ss', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(545)).toBe('9:05')
    expect(formatClock(3599)).toBe('59:59')
    expect(formatClock(3600)).toBe('1:00:00')
    expect(formatClock(9000)).toBe('2:30:00')
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

  it('keeps a proper noun capitalized in the middle of a sentence', () => {
    expect(inSentence('Kosher salt')).toBe('kosher salt')
    expect(inSentence('Thai green curry paste')).toBe('Thai green curry paste')
    expect(inSentence('Chef’s knife')).toBe('chef’s knife')
  })
})
