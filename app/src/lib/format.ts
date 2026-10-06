import type { Unit } from '../curriculum/ingredients'
import { TECHNIQUES, type TechniqueId } from '../curriculum/techniques'

const DOLLARS = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

/** "$1,338.32": by month three the kept total runs into the thousands. */
export function formatCents(cents: number): string {
  return DOLLARS.format(cents / 100)
}

// Recipe quantities are whole quarters (curriculum.test.ts checks), so every
// sum the grocery list makes prints too. The self-hosted fonts' latin files
// carry these three and no eighths, which would fall back to another font.
const FRACTIONS: Record<string, string> = {
  '0.25': '¼',
  '0.5': '½',
  '0.75': '¾',
}

export function formatQty(qty: number): string {
  const whole = Math.floor(qty)
  const rest = qty - whole
  if (rest === 0) return String(whole)
  const fraction = FRACTIONS[String(rest)]
  if (!fraction) throw new Error(`No fraction glyph for quantity ${qty}. Add it to FRACTIONS or change the recipe.`)
  return whole === 0 ? fraction : `${whole}${fraction}`
}

const UNIT_LABELS: Record<Unit, { one: string; many: string }> = {
  each: { one: '', many: '' },
  clove: { one: 'clove', many: 'cloves' },
  slice: { one: 'slice', many: 'slices' },
  bunch: { one: 'bunch', many: 'bunches' },
  cup: { one: 'cup', many: 'cups' },
  tbsp: { one: 'tbsp', many: 'tbsp' },
  tsp: { one: 'tsp', many: 'tsp' },
  oz: { one: 'oz', many: 'oz' },
  lb: { one: 'lb', many: 'lb' },
}

export function formatAmount(qty: number, unit: Unit): string {
  const label = qty > 1 ? UNIT_LABELS[unit].many : UNIT_LABELS[unit].one
  return label === '' ? formatQty(qty) : `${formatQty(qty)} ${label}`
}

/** 9:05, or 1:00:00 and up for an hour or more. */
export function formatClock(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return hours === 0 ? `${minutes}:${seconds}` : `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
}

/** A timer's length in words: "15 minutes", "1 hour", "2 hours 30 minutes". Timers run in whole minutes. */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0 || totalSeconds % 60 !== 0) throw new Error(`A timer runs in whole minutes, not ${totalSeconds} seconds`)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = (totalSeconds % 3600) / 60
  const parts = [hours > 0 ? plural(hours, 'hour', 'hours') : '', minutes > 0 ? plural(minutes, 'minute', 'minutes') : '']
  return parts.filter((part) => part !== '').join(' ')
}

/** A recipe's time in words: "35 minutes", "2 hours 45 minutes". */
export function formatMinutes(minutes: number): string {
  return formatDuration(minutes * 60)
}

/**
 * How many packages to buy, in words: "2 red onions" from "1 red onion".
 * A label that is not a plain "1 <thing>" keeps a count in front: "2 × 1 lb pack".
 */
export function packagesOf(count: number, label: string): string {
  if (count === 1) return label
  const single = /^1 ([a-z][a-z ]*[a-z])$/.exec(label)?.[1]
  if (single === undefined) return `${count} × ${label}`
  const words = single.split(' ')
  const last = words.at(-1) ?? ''
  const many = /(o|ch|sh|s|x)$/.test(last) ? `${last}es` : /[^aeiou]y$/.test(last) ? `${last.slice(0, -1)}ies` : `${last}s`
  return `${count} ${[...words.slice(0, -1), last === 'dozen' ? last : many].join(' ')}`
}

// Words that keep their capital in the middle of a sentence.
const PROPER = new Set(['American', 'Dijon', 'Thai'])

/** A name as it reads mid-sentence: "kosher salt", but "Thai green curry paste". */
export function inSentence(name: string): string {
  const first = name.split(' ')[0] ?? ''
  return PROPER.has(first) ? name : name.charAt(0).toLowerCase() + name.slice(1)
}

/**
 * A cook's date as the forms send it: YYYY-MM-DD, and never after today. The
 * date field's max says so too, but not every phone enforces it.
 */
export function checkCookedOn(cookedOn: string, today: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cookedOn)) throw new Error('Choose the date you cooked it.')
  // Dates in this form compare correctly as text.
  if (cookedOn > today) throw new Error('A cook cannot be dated after today.')
}

/** Today's date where the cook is standing, not in UTC. */
export function localDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatCookedOn(cookedOn: string): string {
  const [year, month, day] = cookedOn.split('-').map(Number)
  if (!year || !month || !day) throw new Error(`Bad cooked_on date: ${cookedOn}`)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export const COURSE_NAMES = {
  1: 'First course',
  2: 'Second course',
  3: 'Third course',
  4: 'Fourth course',
  5: 'The usual',
} as const

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

const LIST = new Intl.ListFormat('en', { type: 'conjunction' })

/** "salt, oil, and lemons": the one way the app joins a list, serial comma and all. */
export function listOf(items: readonly string[]): string {
  return LIST.format(items)
}

/**
 * The same list as listOf, in pieces, for a list whose items are links: each
 * piece is an item's index or the text between items.
 */
export function listPieces(count: number): ({ index: number } | { text: string })[] {
  const marks = Array.from({ length: count }, (_, index) => `\u0000${index}\u0000`)
  return LIST.formatToParts(marks).map((part) =>
    part.type === 'element' ? { index: Number(part.value.slice(1, -1)) } : { text: part.value },
  )
}

/** The most a package can cost, as the database checks it. */
export const MAX_PRICE_CENTS = 100_000

/**
 * A price typed by the cook, in cents: "3.49", "$3.49", "3", "3.5" or ".99".
 * Anything else, or nothing above zero, says what to type.
 */
export function parseCents(typed: string): number {
  const match = /^\$?\s*(\d*)(?:\.(\d{1,2}))?$/.exec(typed.trim())
  const dollars = match?.[1] ?? ''
  const cents = match?.[2] ?? ''
  if (match === null || (dollars === '' && cents === '')) throw new Error('Enter the price you paid, like 3.49.')
  const total = Number(dollars || '0') * 100 + Number(cents.padEnd(2, '0'))
  if (total <= 0) throw new Error('Enter the price you paid, like 3.49.')
  // The database refuses more (00008), and no package here costs that much.
  if (total > MAX_PRICE_CENTS) throw new Error('That is more than $1,000. Enter the price of one package, like 3.49.')
  return total
}

/** "knife basics, heat control, and roasting" */
export function skillList(ids: readonly TechniqueId[]): string {
  return listOf(ids.map((id) => TECHNIQUES[id].name.toLowerCase()))
}
