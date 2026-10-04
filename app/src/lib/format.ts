import type { Unit } from '../curriculum/ingredients'
import { TECHNIQUES, type TechniqueId } from '../curriculum/techniques'

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

const FRACTIONS: Record<string, string> = {
  '0.125': '⅛',
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

export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
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

export function listOf(items: readonly string[]): string {
  return LIST.format(items)
}

/** "knife basics, heat control and roasting" */
export function skillList(ids: readonly TechniqueId[]): string {
  return listOf(ids.map((id) => TECHNIQUES[id].name.toLowerCase()))
}
