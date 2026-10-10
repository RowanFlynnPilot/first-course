// A real weeknight: what is ready tonight, a cook the phone interrupted, a
// simmer that needs stirring while the cook is on another step, and the
// timer's controls handing focus on.

import { recipeById } from '../src/curriculum/recipes'
import { pathTo } from '../src/lib/progress'
import { COUNT_BEEPS, expect, FRESH, rateAndSave, SALAD_DONE, test } from './kitchen'

const SIX_PM = new Date('2026-10-09T18:00:00-05:00')

/** Every ingredient a recipe uses: a pantry with all of them needs no shop. */
const everything = (id: string) => recipeById(id).content.ingredients.map((line) => line.ingredientId)

test.describe('tonight', () => {
  test('a suggestion the pantry covers leads with Start cooking, and says when dinner would be ready', async ({ page, kitchen }) => {
    await page.clock.install({ time: SIX_PM })
    await kitchen.open('./', { ...FRESH, pantry: everything('soft-scrambled-eggs') })
    const tray = page.locator('.tray')
    await expect(tray.getByRole('heading', { name: 'Cook this next: Soft scrambled eggs on toast' })).toBeVisible()
    // Ten minutes from six.
    await expect(tray.locator('.tray-body')).toContainText('10 minutes: start now and eat around 6:10 PM.')
    await expect(tray.locator('.actions > :not(.busy)').first()).toHaveText('Start cooking')
    await expect(tray.getByRole('button', { name: 'Add to this week' })).toHaveCount(0)
  })

  test('other dinners that need no shop are listed under the suggestion, quickest first', async ({ page, kitchen }) => {
    await page.clock.install({ time: SIX_PM })
    await kitchen.open('./', {
      ...SALAD_DONE,
      plan: ['sheet-pan-sausage'],
      shopped: ['sheet-pan-sausage'],
      pantry: everything('soft-scrambled-eggs'),
    })
    await expect(page.getByRole('heading', { name: 'Groceries bought: Sheet-pan sausage and vegetables' })).toBeVisible()
    const tonight = page.getByRole('region', { name: 'Also ready tonight, with what you have' })
    await expect(tonight.getByRole('link')).toHaveText(['Soft scrambled eggs on toast10 minutes: eat around 6:10 PM'])
  })

  test('step 0 says when dinner would be ready, and lists the steps to read first', async ({ page, kitchen }) => {
    await page.clock.install({ time: SIX_PM })
    await kitchen.open('#/cook/sheet-pan-sausage/0', SALAD_DONE)
    await expect(page.getByText(/^Start now and you eat around \d+:\d\d [AP]M\.$/)).toBeVisible()
    await page.getByText('Read every step once first').click()
    await expect(page.locator('details ol.method > li')).toHaveCount(recipeById('sheet-pan-sausage').content.steps.length)
  })
})

test.describe('a cook the phone interrupted', () => {
  test('comes back from the menu at its step, with its timer still running', async ({ page, kitchen }) => {
    await page.clock.install({ time: SIX_PM })
    await kitchen.open('#/cook/sheet-pan-sausage/3', SALAD_DONE)
    await expect(page.locator('.cook-count')).toHaveText(/^Step 3 of 8/)
    await page.getByRole('button', { name: 'Start 15:00 timer' }).click()
    // The phone closes the installed app (the camera, a call): session storage goes, and it reopens at the menu.
    await page.evaluate(() => sessionStorage.clear())
    await page.goto('./')
    await page.reload()
    const resume = page.getByRole('region', { name: 'The cook in progress' })
    await expect(resume).toContainText('You were cooking Sheet-pan sausage and vegetables: step 3 of 8.')
    // Food may be in the oven: the card says when its timer ends.
    await expect(resume).toContainText('Potatoes timer: ends at 6:15 PM.')
    await resume.getByRole('link', { name: 'Back to step 3' }).click()
    await expect(page.getByRole('timer')).toContainText(/1[45]:\d\d/)
  })

  test('a cook logged on another device is not asked about again', async ({ page, kitchen }) => {
    await page.clock.install({ time: SIX_PM })
    await kitchen.open('#/cook/chopped-salad/8', FRESH)
    await page.getByRole('link', { name: 'Finish and log it' }).click()
    await expect(page.getByRole('heading', { name: 'How did it go?' })).toBeVisible()
    kitchen.backend.writeElsewhere('cook_logs', { recipe_id: 'chopped-salad', rating: 2, cooked_on: '2026-10-09', notes: '' })
    await page.goto('./')
    await expect(page.getByText('Cook this next')).toBeVisible()
    await expect(page.getByRole('region', { name: 'The cook in progress' })).toHaveCount(0)
  })

  test('logged from the menu the next morning, a cook is dated the evening it was finished', async ({ page, kitchen }) => {
    await page.clock.install({ time: new Date('2026-10-09T21:00:00-05:00') })
    await kitchen.open('#/cook/chopped-salad/8', FRESH)
    await page.getByRole('link', { name: 'Finish and log it' }).click()
    await expect(page.getByRole('heading', { name: 'How did it go?' })).toBeVisible()
    await page.goto('./')
    await expect(page.getByRole('region', { name: 'The cook in progress' })).toBeVisible()
    await page.clock.fastForward('10:00:00')
    await page.reload()
    await page.getByRole('region', { name: 'The cook in progress' }).getByRole('link', { name: 'Log it' }).click()
    await expect(page.getByLabel('Cooked on')).toHaveValue('2026-10-09')
    await rateAndSave(page, 'Decent')
    await expect(page.getByRole('region', { name: 'This cook' })).toBeVisible()
    expect(kitchen.backend.table('cook_logs')).toMatchObject([{ recipe_id: 'chopped-salad', cooked_on: '2026-10-09' }])
  })

  test('a cook finished but not logged asks how it went, until it is logged', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/chopped-salad/8', FRESH)
    await page.getByRole('link', { name: 'Finish and log it' }).click()
    await expect(page.getByRole('heading', { name: 'How did it go?' })).toBeVisible()
    await page.goto('./')
    const resume = page.getByRole('region', { name: 'The cook in progress' })
    await expect(resume).toContainText('You finished Chopped salad with lemon vinaigrette. How did it go?')
    await resume.getByRole('link', { name: 'Log it' }).click()
    await rateAndSave(page, 'Decent')
    await expect(page.getByRole('region', { name: 'This cook' })).toBeVisible()
    await expect(resume).toHaveCount(0)
  })

  test('“Not cooking it now” forgets it, timers and all', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/sheet-pan-sausage/3', SALAD_DONE)
    await page.getByRole('button', { name: 'Start 15:00 timer' }).click()
    await page.goto('./')
    const resume = page.getByRole('region', { name: 'The cook in progress' })
    await resume.getByRole('button', { name: 'Not cooking it now' }).click()
    await expect(resume).toHaveCount(0)
    // The card took its buttons with it: focus is on what the menu suggests, not the top of the page.
    await expect(page.locator('.tray-title')).toBeFocused()
    await page.reload()
    await expect(page.getByText('Cook this next')).toBeVisible()
    await expect(resume).toHaveCount(0)
    // Its timer went too: back in cook mode, it has not been started.
    await page.goto('#/cook/sheet-pan-sausage/3')
    await expect(page.getByRole('button', { name: 'Start 15:00 timer' })).toBeVisible()
  })

  test('leaving cook mode on purpose leaves nothing to come back to', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/chopped-salad/4', FRESH)
    await page.getByRole('link', { name: 'Leave cook mode' }).click()
    await page.getByRole('link', { name: 'Menu' }).click()
    await expect(page.getByText('Cook this next')).toBeVisible()
    await expect(page.getByRole('region', { name: 'The cook in progress' })).toHaveCount(0)
  })
})

test.describe('a simmer that needs stirring', () => {
  const marinara = recipeById('marinara-pasta')
  const OPEN = { logs: pathTo(marinara, []).map((recipe) => ({ recipe: recipe.id, rating: 2 as const })) }

  test('beeps once, softly, and says "stir it now" every 5 minutes, on whatever step the cook is on', async ({ page, kitchen }) => {
    const beeps = () => page.evaluate(() => (window as unknown as { beeps: number }).beeps)
    await page.clock.install({ time: SIX_PM })
    await page.addInitScript(COUNT_BEEPS)
    await kitchen.open('#/cook/marinara-pasta/6', OPEN)
    await expect(page.locator('.cook-count')).toHaveText(/^Step 6 of/)
    await page.getByRole('button', { name: 'Start 20:00 timer' }).click()
    // A timer this long: the page can ring only while it is on screen.
    await expect(page.getByText(/^This page can ring only while it is on screen\./)).toBeVisible()
    await page.getByRole('link', { name: 'Next step' }).click()
    await expect(page.locator('.cook-count')).toHaveText(/^Step 7 of/)

    await page.clock.fastForward('05:01')
    const stir = page.locator('.timer-chip-stir')
    await expect(stir).toHaveText('Sauce: stir it now')
    await expect.poll(beeps).toBe(1)
    // Said in words too, for a screen reader: the beep carries none.
    await expect(page.getByText('Sauce: stir it now.', { exact: true })).toBeAttached()
    await page.getByRole('button', { name: 'Stirred: Sauce' }).click()
    await expect(stir).toHaveCount(0)
    // The reminder went with its button: focus is on the way forward.
    await expect(page.getByRole('link', { name: 'Next step' })).toBeFocused()

    await page.clock.fastForward('05:00')
    await expect(stir).toBeVisible()
    await expect.poll(beeps).toBe(2)
  })
})

test.describe('a simmer whose phone was locked right after Start', () => {
  const marinara = recipeById('marinara-pasta')
  const OPEN = { logs: pathTo(marinara, []).map((recipe) => ({ recipe: recipe.id, rating: 2 as const })) }

  test('still counts its stirs from the start', async ({ page, kitchen }) => {
    await page.clock.install({ time: SIX_PM })
    await kitchen.open('#/cook/marinara-pasta/6', OPEN)
    await expect(page.locator('.cook-count')).toHaveText(/^Step 6 of/)
    // No check runs between the tap and the jump, as on a phone locked at once.
    await page.clock.pauseAt(SIX_PM.getTime() + 60_000)
    await page.getByRole('button', { name: 'Start 20:00 timer' }).click()
    await page.clock.fastForward('05:01')
    await expect(page.getByRole('button', { name: 'Stirred: Sauce' })).toBeVisible()
  })
})

test.describe('the timer’s controls', () => {
  test('starting and stopping a timer hands focus to the control that replaces it', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/sheet-pan-sausage/3', SALAD_DONE)
    await page.getByRole('button', { name: 'Start 15:00 timer' }).click()
    await expect(page.getByRole('button', { name: 'Stop timer' })).toBeFocused()
    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('button', { name: 'Stop timer' }).click()
    await expect(page.getByRole('button', { name: 'Start 15:00 timer' })).toBeFocused()
  })

  test('a timer started from its dashed chip hands focus to the chip that counts it down', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/sheet-pan-sausage/3', SALAD_DONE)
    await page.getByRole('link', { name: 'Next step' }).click()
    await page.getByRole('button', { name: 'Potatoes: start 15:00' }).click()
    await expect(page.getByRole('link', { name: /^Potatoes: 1[45]:\d\d$/ })).toBeFocused()
  })
})

test.describe('bought meat', () => {
  const thighs = recipeById('seared-chicken-thighs')
  // Everything up to the thighs cooked well, and the eggs too, which need nothing bought.
  const OPEN = [...pathTo(thighs, []).map((recipe) => recipe.id), 'soft-scrambled-eggs'].map((recipe) => ({ recipe, rating: 2 as const }))
  const SUNDAY = new Date('2026-10-04T17:00:00-05:00')

  test('Done shopping dates the groceries and says when to cook the meat by', async ({ page, kitchen }) => {
    await page.clock.install({ time: SUNDAY })
    await kitchen.open('#/shop', { logs: OPEN, plan: [thighs.id], checks: everything(thighs.id) })
    await page.getByRole('button', { name: 'Done shopping' }).click()
    await expect(page.getByText(/^Done shopping\./)).toContainText(
      'Seared chicken thighs with roasted broccoli: cook it by Tuesday, or freeze the meat tonight and thaw it in the fridge the night before you cook.',
    )
    expect(kitchen.backend.table('plan_items')).toMatchObject([{ recipe_id: thighs.id, shopped: true, shopped_on: '2026-10-04' }])
    await expect(page.locator('.plan-row').filter({ hasText: 'Seared chicken thighs' })).toContainText('Groceries bought. Cook it by Tuesday')
  })

  test('the menu suggests the meat to cook soonest first, with its day', async ({ page, kitchen }) => {
    await page.clock.install({ time: new Date('2026-10-05T17:00:00-05:00') })
    await kitchen.open('./', {
      logs: OPEN,
      // The salad was planned and bought first; the thighs keep only until Tuesday.
      plan: ['chopped-salad', thighs.id],
      shopped: ['chopped-salad', thighs.id],
      shoppedOn: { 'chopped-salad': '2026-10-04', [thighs.id]: '2026-10-04' },
    })
    const tray = page.locator('.tray')
    await expect(tray.getByRole('heading', { name: `Groceries bought: ${thighs.title}` })).toBeVisible()
    await expect(tray.locator('.tray-body')).toContainText('Cook it by tomorrow, while the meat is fresh.')
  })

  test('past the day the meat keeps, the card says so, and can put it back on the list', async ({ page, kitchen }) => {
    await page.clock.install({ time: new Date('2026-10-08T17:00:00-05:00') })
    await kitchen.open('./', { logs: OPEN, plan: [thighs.id], shopped: [thighs.id], shoppedOn: { [thighs.id]: '2026-10-04' } })
    const tray = page.locator('.tray')
    await expect(tray.locator('.tray-body')).toContainText(
      'Bought Sunday. Unless you froze it, the meat is past its days: throw it out and put it back on the list.',
    )
    // Cooking does not lead: the meat may be off.
    await expect(tray.locator('.actions > :not(.busy)').first()).toHaveText('Put it back on the list')
    await tray.getByRole('button', { name: 'Put it back on the list' }).click()
    await expect(tray.getByRole('heading', { name: `On this week’s plan: ${thighs.title}` })).toBeVisible()
    expect(kitchen.backend.table('plan_items')).toMatchObject([{ recipe_id: thighs.id, shopped: false, shopped_on: null }])
  })

  test('“I froze it” takes the day away, and the card says to thaw the meat', async ({ page, kitchen }) => {
    await page.clock.install({ time: new Date('2026-10-08T17:00:00-05:00') })
    await kitchen.open('./', { logs: OPEN, plan: [thighs.id], shopped: [thighs.id], shoppedOn: { [thighs.id]: '2026-10-04' } })
    const tray = page.locator('.tray')
    await tray.getByRole('button', { name: 'I froze it' }).click()
    await expect(tray.locator('.tray-body')).toContainText('If the meat is in the freezer, move it to the fridge the night before you cook.')
    await expect(tray.locator('.tray-title')).toBeFocused()
    await expect(tray.locator('.actions > :not(.busy)').first()).toHaveText('Start cooking')
    expect(kitchen.backend.table('plan_items')).toMatchObject([{ recipe_id: thighs.id, shopped: true, shopped_on: null }])
  })

  test('meat past its day is not ready tonight, and fresh groceries come first', async ({ page, kitchen }) => {
    await page.clock.install({ time: new Date('2026-10-08T17:00:00-05:00') })
    await kitchen.open('./', {
      logs: OPEN,
      plan: [thighs.id, 'sheet-pan-sausage'],
      shopped: [thighs.id, 'sheet-pan-sausage'],
      shoppedOn: { [thighs.id]: '2026-10-04', 'sheet-pan-sausage': '2026-10-04' },
      pantry: everything('soft-scrambled-eggs'),
    })
    // The smoked sausage keeps two weeks: it leads, ahead of the thighs past their day, which are not offered tonight.
    await expect(page.getByRole('heading', { name: 'Groceries bought: Sheet-pan sausage and vegetables' })).toBeVisible()
    const tonight = page.getByRole('region', { name: 'Also ready tonight, with what you have' })
    await expect(tonight.getByRole('link')).toHaveText(['Soft scrambled eggs on toast10 minutes: eat around 5:10 PM'])
  })

  test('a recipe bought before the date was kept says only that it is bought', async ({ page, kitchen }) => {
    await kitchen.open('#/shop', { logs: OPEN, plan: [thighs.id], shopped: [thighs.id] })
    await expect(page.locator('.plan-row').filter({ hasText: 'Seared chicken thighs' }).locator('.row-note')).toHaveText('Groceries bought')
  })
})

test.describe('leftovers', () => {
  const WEDNESDAY = new Date('2026-10-07T17:00:00-05:00')

  test('the day after a cook that made more than two servings, the menu says what is left and how to reheat it', async ({ page, kitchen }) => {
    await page.clock.install({ time: WEDNESDAY })
    await kitchen.open('./', { logs: [{ recipe: 'chopped-salad', rating: 2, cookedOn: '2026-10-06' }, { recipe: 'sheet-pan-sausage', rating: 2, cookedOn: '2026-10-06' }] })
    const left = page.getByRole('region', { name: 'Leftovers' })
    // The salad makes two: nothing of it is left.
    await expect(left.getByRole('listitem')).toHaveCount(1)
    await expect(left).toContainText('Sheet-pan sausage and vegetables')
    await expect(left).toContainText('From yesterday. Eat by Saturday.')
    await expect(left).toContainText('reheat in a 400°F oven for about 10 minutes')

    await left.getByRole('button', { name: 'All eaten: Sheet-pan sausage and vegetables' }).click()
    await expect(left).toHaveCount(0)
    // The section went with the last one: focus is on what the menu suggests.
    await expect(page.locator('.tray-title')).toBeFocused()
    await page.reload()
    await expect(page.getByText('Cook this next')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Leftovers' })).toHaveCount(0)
  })

  test('marking a second leftover eaten keeps the first one eaten', async ({ page, kitchen }) => {
    await page.clock.install({ time: WEDNESDAY })
    const chana = recipeById('chana-masala')
    const cooked = pathTo(chana, []).map((recipe) => ({ recipe: recipe.id, rating: 2 as const, cookedOn: '2026-09-01' }))
    await kitchen.open('./', {
      logs: [...cooked, { recipe: 'sheet-pan-sausage', rating: 2, cookedOn: '2026-10-06' }, { recipe: chana.id, rating: 2, cookedOn: '2026-10-06' }],
    })
    const left = page.getByRole('region', { name: 'Leftovers' })
    await expect(left.getByRole('button', { name: /^All eaten/ })).toHaveCount(2)
    await left.getByRole('button', { name: 'All eaten: Sheet-pan sausage and vegetables' }).click()
    await expect(left.getByRole('button', { name: 'All eaten: Sheet-pan sausage and vegetables' })).toHaveCount(0)
    await expect(left.getByRole('heading', { name: 'Leftovers' })).toBeFocused()
    await left.getByRole('button', { name: `All eaten: ${chana.title}` }).click()
    await expect(left).toHaveCount(0)
    await page.reload()
    await expect(page.getByText('Cook this next')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Leftovers' })).toHaveCount(0)
  })

  test('leftover rice points to egg fried rice, from the step after the rice', async ({ page, kitchen }) => {
    await page.clock.install({ time: WEDNESDAY })
    const chana = recipeById('chana-masala')
    const friedRice = recipeById('egg-fried-rice')
    const cooked = [...new Set([...pathTo(chana, []), ...pathTo(friedRice, [])].map((recipe) => recipe.id))]
    await kitchen.open('./', {
      logs: [...cooked.map((recipe) => ({ recipe, rating: 2 as const, cookedOn: '2026-09-01' })), { recipe: chana.id, rating: 2, cookedOn: '2026-10-06' }],
    })
    const left = page.getByRole('region', { name: 'Leftovers' })
    await left.getByRole('link', { name: 'make egg fried rice with it, from step 3' }).click()
    await expect(page.locator('.cook-count')).toHaveText(/^Step 3 of/)
    // The rice is already cold: cook mode does not offer the chilling timer of a step this cook never saw.
    await expect(page.getByRole('button', { name: /: start \d/ })).toHaveCount(0)
  })

  test('the recipe page says how to keep and reheat what is left, when there is some', async ({ page, kitchen }) => {
    await kitchen.open('#/recipe/sheet-pan-sausage', SALAD_DONE)
    await expect(page.getByRole('heading', { name: 'Leftovers' })).toBeVisible()
    await expect(page.getByText(/^It makes 3 servings\. What is left keeps 4 days in a lidded container in the fridge\./)).toBeVisible()
    await page.goto('#/recipe/chopped-salad')
    await expect(page.getByRole('heading', { name: 'Chopped salad with lemon vinaigrette' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Leftovers' })).toHaveCount(0)
  })
})
