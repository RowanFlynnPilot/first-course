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
    await page.getByText('The steps').click()
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
    await resume.getByRole('link', { name: 'Back to step 3' }).click()
    await expect(page.getByRole('timer')).toContainText(/1[45]:\d\d/)
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
    const stir = page.getByRole('button', { name: 'Sauce: stir it now' })
    await expect(stir).toBeVisible()
    await expect.poll(beeps).toBe(1)
    // Said in words too, for a screen reader: the beep carries none.
    await expect(page.getByText('Sauce: stir it now.', { exact: true })).toBeAttached()
    await stir.click()
    await expect(stir).toHaveCount(0)

    await page.clock.fastForward('05:00')
    await expect(stir).toBeVisible()
    await expect.poll(beeps).toBe(2)
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
