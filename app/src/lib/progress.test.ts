import { describe, expect, it } from 'vitest'
import { RECIPES, recipeById } from '../curriculum/recipes'
import {
  cookable,
  lastNote,
  learnedTechniques,
  masteryLeft,
  missingTechniques,
  nextRecipe,
  pathTo,
  plannable,
  recipeFromRoute,
  progressLost,
  readyToPlan,
  recipeState,
  rowNote,
  teacherOf,
  whatTheRatingDecides,
  type CookLog,
  type Rating,
} from './progress'

let counter = 0
function log(recipeId: string, rating: Rating): CookLog {
  counter += 1
  return { id: String(counter), recipeId, cookedOn: '2026-10-03', rating, notes: '' }
}

const eggs = recipeById('soft-scrambled-eggs')
/** Well after the test cooks (dated 2026-10-03), so none of them is resting. */
const TODAY = '2026-11-01'
const grilledCheese = recipeById('grilled-cheese')

describe('progress', () => {
  it('starts with the two no-prerequisite recipes ready and the rest locked', () => {
    expect(recipeState(recipeById('chopped-salad'), [])).toBe('ready')
    expect(recipeState(eggs, [])).toBe('ready')
    expect(recipeState(grilledCheese, [])).toBe('locked')
    // Both are open; the salad is a side, so night one is the eggs.
    expect(nextRecipe([], [], new Set(), new Map(), TODAY)?.id).toBe(eggs.id)
  })

  it('does not teach a skill on a rough cook', () => {
    const logs = [log(eggs.id, 1)]
    expect(learnedTechniques(logs).has('heat-control')).toBe(false)
    expect(recipeState(eggs, logs)).toBe('cooked')
    expect(recipeState(grilledCheese, logs)).toBe('locked')
  })

  it('teaches the skill and unlocks dependents on a decent cook', () => {
    const logs = [log(eggs.id, 2)]
    expect(learnedTechniques(logs).has('heat-control')).toBe(true)
    expect(recipeState(grilledCheese, logs)).toBe('ready')
  })

  it('suggests a rough cook again before moving on', () => {
    const logs = [log('chopped-salad', 2), log(eggs.id, 1)]
    expect(recipeState(recipeById('sheet-pan-sausage'), logs)).toBe('ready')
    expect(nextRecipe(logs, [], new Set(), new Map(), TODAY)?.id).toBe(eggs.id)
  })

  it('suggests what is on this week’s plan first, unless it is locked', () => {
    const logs = [log('chopped-salad', 2)]
    const plan = ['grilled-cheese', 'sheet-pan-sausage', eggs.id]
    expect(nextRecipe(logs, plan, new Set(), new Map(), TODAY)?.id).toBe('sheet-pan-sausage')
    // Groceries bought come first.
    expect(nextRecipe(logs, plan, new Set([eggs.id]), new Map(), TODAY)?.id).toBe(eggs.id)
    expect(nextRecipe(logs, ['grilled-cheese'], new Set(['grilled-cheese']), new Map(), TODAY)?.id).toBe(eggs.id)
  })

  it('among the groceries bought, suggests first the meat to cook soonest', () => {
    const logs = [log('chopped-salad', 2), log(eggs.id, 2)]
    const plan = ['sheet-pan-sausage', 'grilled-cheese']
    const bought = new Set(plan)
    // Bought in the order added: the sheet pan first, until the cheese's (made-up) meat is due sooner.
    expect(nextRecipe(logs, plan, bought, new Map(), TODAY).id).toBe('sheet-pan-sausage')
    expect(nextRecipe(logs, plan, bought, new Map([['grilled-cheese', '2026-11-02']]), TODAY).id).toBe('grilled-cheese')
    expect(
      nextRecipe(logs, plan, bought, new Map([['grilled-cheese', '2026-11-05'], ['sheet-pan-sausage', '2026-11-03']]), TODAY).id,
    ).toBe('sheet-pan-sausage')
  })

  it('refuses to cook or log a locked recipe, and says what it is missing', () => {
    expect(cookable('chopped-salad', []).content).not.toBeNull()
    for (const id of ['grilled-cheese', 'marinara-pasta', 'margherita-pizza']) {
      const gate = cookable(id, [])
      expect(gate.content, id).toBeNull()
      expect(gate.missing, id).toEqual(missingTechniques(recipeById(id), []))
    }
  })

  it('masters a recipe after three good cooks including one nailed', () => {
    expect(recipeState(eggs, [log(eggs.id, 2), log(eggs.id, 2), log(eggs.id, 2)])).toBe('cooked')
    expect(recipeState(eggs, [log(eggs.id, 2), log(eggs.id, 3)])).toBe('cooked')
    expect(recipeState(eggs, [log(eggs.id, 1), log(eggs.id, 2), log(eggs.id, 3)])).toBe('cooked')
    expect(recipeState(eggs, [log(eggs.id, 2), log(eggs.id, 2), log(eggs.id, 3)])).toBe('mastered')
  })

  it('finds the last note left on a recipe: the latest day, then the latest saved', () => {
    const noted = (cookedOn: string, notes: string): CookLog => ({ ...log(eggs.id, 2), cookedOn, notes })
    expect(lastNote(eggs.id, [])).toBeNull()
    expect(lastNote(eggs.id, [noted('2026-10-01', ''), log('chopped-salad', 2)])).toBeNull()
    const logs = [noted('2026-10-02', 'Lower heat.'), noted('2026-09-01', 'Older.'), noted('2026-10-02', 'More butter.'), noted('2026-10-03', '')]
    expect(lastNote(eggs.id, logs)).toBe('More butter.')
  })

  it('says before saving what the rating decides', () => {
    const salad = recipeById('chopped-salad')
    expect(whatTheRatingDecides(salad, [])).toBe('Decent or better teaches knife basics and seasoning to taste.')
    expect(whatTheRatingDecides(salad, [log(salad.id, 2)])).toBe('2 more good cooks, one of them “Nailed it”, master it.')
    expect(whatTheRatingDecides(salad, [log(salad.id, 2), log(salad.id, 3)])).toBe('One more good cook masters it.')
    expect(whatTheRatingDecides(salad, [log(salad.id, 2), log(salad.id, 2), log(salad.id, 2)])).toBe('A “Nailed it” masters it.')
    // Two Decent: the one good cook it still needs has to be the "Nailed it".
    expect(whatTheRatingDecides(salad, [log(salad.id, 2), log(salad.id, 2)])).toBe('A “Nailed it” masters it.')
    expect(whatTheRatingDecides(salad, [log(salad.id, 2), log(salad.id, 2), log(salad.id, 3)])).toMatch(/^Mastered already/)
  })

  it('offers unplanned recipes in the order the menu suggests them', () => {
    const logs = [log('chopped-salad', 2)]
    const ready = readyToPlan(logs, ['soft-scrambled-eggs'], TODAY).map((recipe) => recipe.id)
    expect(ready).not.toContain('soft-scrambled-eggs')
    // Not yet cooked well comes before cooked and not mastered.
    expect(ready.indexOf('sheet-pan-sausage')).toBeLessThan(ready.indexOf('chopped-salad'))
    // Grilled cheese is locked, but the eggs that open it are on the plan: it can go on too, after everything open.
    const open = ready.filter((id) => recipeState(recipeById(id), logs) !== 'locked')
    expect(ready.slice(0, open.length)).toEqual(open)
    expect(ready.slice(open.length)).toContain('grilled-cheese')
  })

  it('lets a locked recipe on the plan once everything that opens it is planned', () => {
    // Grilled cheese needs the eggs' heat control; the cutlets are further off.
    expect(plannable(grilledCheese, [], [])).toBe(false)
    expect(plannable(grilledCheese, [], [eggs.id])).toBe(true)
    expect(plannable(grilledCheese, [log(eggs.id, 2)], [])).toBe(true)
    const cutlets = recipeById('chicken-cutlets')
    const way = pathTo(cutlets, [])
    expect(plannable(cutlets, [], way.slice(1).map((recipe) => recipe.id))).toBe(false)
    expect(plannable(cutlets, [], way.map((recipe) => recipe.id))).toBe(true)
  })

  it('words how far a recipe is from mastery the same way everywhere', () => {
    const salad = recipeById('chopped-salad')
    expect(masteryLeft(salad, [])).toBe('3 more good cooks, one of them “Nailed it”, master it.')
    expect(masteryLeft(salad, [log(salad.id, 3), log(salad.id, 2), log(salad.id, 2)])).toBe('Mastered.')
    expect(rowNote(salad, [log(salad.id, 2)])).toBe('1 of 3 good cooks')
    expect(rowNote(salad, [log(salad.id, 2), log(salad.id, 2), log(salad.id, 2)])).toBe('3 good cooks. A “Nailed it” masters it')
    expect(rowNote(salad, [log(salad.id, 1)])).toBe('Rough so far. A Decent cook teaches knife basics and seasoning to taste')
    expect(rowNote(grilledCheese, [])).toMatch(/^Needs /)
  })

  it('finds the whole way to a locked recipe, each recipe after the ones it needs', () => {
    const target = recipeById('chicken-pan-sauce')
    const path = pathTo(target, [])
    expect(path.length).toBeGreaterThan(1)
    expect(path).not.toContain(target)
    // Cooking the path in order, each well, opens the target.
    let cooked: readonly CookLog[] = []
    for (const recipe of path) {
      expect(recipeState(recipe, cooked), recipe.id).not.toBe('locked')
      cooked = [...cooked, log(recipe.id, 2)]
    }
    expect(recipeState(target, cooked)).not.toBe('locked')
    // It names only recipes that still teach something missing on the way.
    for (const technique of missingTechniques(target, [])) expect(path).toContain(teacherOf(technique))
    expect(pathTo(recipeById('chopped-salad'), [])).toEqual([])
  })

  it('offers a mastered recipe only after every other open one, and never suggests it while another is open', () => {
    const salad = recipeById('chopped-salad')
    const mastered = [log(salad.id, 2), log(salad.id, 2), log(salad.id, 3)]
    const ready = readyToPlan(mastered, [], TODAY).map((recipe) => recipe.id)
    expect(ready.at(-1)).toBe(salad.id)
    expect(nextRecipe(mastered, [], new Set(), new Map(), TODAY).id).not.toBe(salad.id)
  })

  it('rests a recipe cooked well for a week, then offers it again; a Rough one comes straight back', () => {
    const decentRecently = [
      { ...log('chopped-salad', 2), cookedOn: '2026-10-31' },
      { ...log(eggs.id, 2), cookedOn: '2026-10-01' },
    ]
    const ready = readyToPlan(decentRecently, [], TODAY).map((recipe) => recipe.id)
    // Without the rest, the salad would come before the eggs (menu order).
    expect(ready.indexOf(eggs.id)).toBeLessThan(ready.indexOf('chopped-salad'))
    expect(ready.at(-1)).toBe('chopped-salad')
    const decentLastMonth = decentRecently.map((entry) => ({ ...entry, cookedOn: '2026-10-01' }))
    const later = readyToPlan(decentLastMonth, [], TODAY).map((recipe) => recipe.id)
    expect(later.indexOf('chopped-salad')).toBeLessThan(later.indexOf(eggs.id))
    // A Rough cook yesterday: no good cook yet, so no rest. It comes back before anything new.
    const roughYesterday = [{ ...log('chopped-salad', 1), cookedOn: '2026-10-31' }]
    expect(nextRecipe(roughYesterday, [], new Set(), new Map(), TODAY).id).toBe('chopped-salad')
  })

  it('puts a dish of the usual first once it comes into reach', () => {
    const burger = recipeById('double-smash-burger')
    const path = pathTo(burger, []).map((recipe) => log(recipe.id, 2))
    expect(recipeState(burger, path)).toBe('ready')
    expect(nextRecipe(path, [], new Set(), new Map(), TODAY).id).toBe(burger.id)
    expect(readyToPlan(path, [], TODAY)[0]?.id).toBe(burger.id)
    // Cooked well once, it takes its place among the rest.
    expect(nextRecipe([...path, log(burger.id, 2)], [], new Set(), new Map(), TODAY).id).not.toBe(burger.id)
  })

  it('with everything mastered, suggests the dish that has waited longest, the usual first', () => {
    const everything = RECIPES.flatMap((recipe, index) =>
      [2, 2, 3].map((rating) => ({ ...log(recipe.id, rating as Rating), cookedOn: `2026-10-${String(1 + (index % 20)).padStart(2, '0')}` })),
    )
    const next = nextRecipe(everything, [], new Set(), new Map(), TODAY)
    const oldest = everything.reduce((min, entry) => (entry.cookedOn < min ? entry.cookedOn : min), '9999')
    expect(everything.filter((entry) => entry.recipeId === next.id).every((entry) => entry.cookedOn === oldest)).toBe(true)
    // Among the dishes cooked on that day, one of the usual comes first when there is one.
    const tied = RECIPES.filter((recipe) => everything.some((entry) => entry.recipeId === recipe.id && entry.cookedOn === oldest))
    if (tied.some((recipe) => recipe.tier === 5)) expect(next.tier).toBe(5)
    expect(readyToPlan(everything, [], TODAY)).toHaveLength(RECIPES.length)
  })

  it('says when a change undoes a mastery', () => {
    const salad = recipeById('chopped-salad')
    const before = [log(salad.id, 2), log(salad.id, 2), log(salad.id, 3)]
    expect(progressLost(before, before.slice(0, 2)).unmastered.map((recipe) => recipe.id)).toEqual([salad.id])
    expect(progressLost(before, before).unmastered).toEqual([])
  })

  it('never repeats an address-bar recipe id in its error', () => {
    expect(recipeFromRoute('chopped-salad').id).toBe('chopped-salad')
    expect(() => recipeFromRoute('Your session expired. Sign in at evil.example')).toThrow(/^That recipe is not on the menu\.$/)
    expect(() => cookable('Your session expired', [])).toThrow(/^That recipe is not on the menu\.$/)
  })

  it('works progress out once per log array, and the same for a copy', () => {
    const logs = Object.freeze([log('chopped-salad', 2), log('chopped-salad', 3), log('chopped-salad', 2)])
    expect(recipeState(recipeById('chopped-salad'), logs)).toBe('mastered')
    expect(recipeState(recipeById('chopped-salad'), [...logs])).toBe('mastered')
    expect(recipeState(recipeById('chopped-salad'), logs.slice(0, 2))).toBe('cooked')
    // The app's arrays are frozen, so changing one in place, which would leave its progress stale, throws.
    expect(() => (logs as CookLog[]).push(log(eggs.id, 2))).toThrow()
  })
})
