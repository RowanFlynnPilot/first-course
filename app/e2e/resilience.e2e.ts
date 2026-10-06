import type { Page } from '@playwright/test'
import { expect, FRESH, noticeLines, SALAD_DONE, test } from './kitchen'

// Weak signal and a second device: answers that arrive late or never, and a
// catch-up that brings in what another device did.

const EVENING = new Date('2026-10-03T18:00:00-05:00')

/** The phone is put away for some minutes, then looked at again. */
async function awayFor(page: Page, minutes: number) {
  const show = (state: 'hidden' | 'visible') =>
    page.evaluate((next) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: next })
      document.dispatchEvent(new Event('visibilitychange'))
    }, state)
  await show('hidden')
  await page.clock.fastForward(`${String(minutes).padStart(2, '0')}:00`)
  await show('visible')
}

const isRead = (table: string) => (request: { url: () => string; method: () => string }) =>
  request.url().includes(`/rest/v1/${table}`) && request.method() === 'GET'

test.describe('weak signal and other devices', () => {
  test('a catch-up that read the log before a save does not take the cook off the screen', async ({ page, kitchen }) => {
    await page.clock.install({ time: EVENING })
    await kitchen.open('#/cook/chopped-salad/log', FRESH)
    await page.getByRole('radio', { name: /^Decent/ }).check()
    // The catch-up's read of the log is answered late, with the log as it was before the save.
    const release = kitchen.backend.holdNext('cook_logs', 'GET')
    await awayFor(page, 11)
    await page.getByRole('button', { name: 'Save this cook' }).click()
    await expect(noticeLines(page).first()).toHaveText(/^Chopped salad with lemon vinaigrette: Decent\./)

    const readAgain = page.waitForRequest(isRead('cook_logs'))
    release()
    await readAgain
    await expect(page.locator('.kept')).toHaveText('$16.76 kept by cooking')
    await expect(page.locator('a.row').filter({ hasText: 'Chopped salad' })).toContainText('1 of 3 good cooks')
  })

  test('a save retried after a catch-up brought it in counts the cook once', async ({ page, kitchen }) => {
    await page.clock.install({ time: EVENING })
    await kitchen.open('#/cook/chopped-salad/log', { logs: [{ recipe: 'chopped-salad', rating: 3 }] })
    await expect(page.getByText('2 more good cooks master it.')).toBeVisible()
    await page.getByRole('radio', { name: /^Decent/ }).check()
    kitchen.backend.loseNextAnswer('cook_logs', 'POST')
    await page.getByRole('button', { name: 'Save this cook' }).click()
    await expect(page.getByRole('alert')).toContainText('Could not save this cook')

    // Away and back: the catch-up loads the cook that did save.
    await awayFor(page, 11)
    await expect(page.getByText('One more good cook masters it.')).toBeVisible()
    await page.getByRole('button', { name: 'Save this cook' }).click()
    await expect(noticeLines(page).first()).toHaveText(/^Chopped salad with lemon vinaigrette: Decent\./)
    // A Nailed it and one Decent: two good cooks, not mastered.
    await expect(page.getByRole('status')).not.toContainText('is mastered')
    await expect(page.locator('a.row').filter({ hasText: 'Chopped salad' })).toContainText('2 of 3 good cooks')
    expect(kitchen.backend.table('cook_logs')).toHaveLength(2)
  })

  test('a retried save sends what the form says now', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/chopped-salad/log', FRESH)
    await page.getByRole('radio', { name: /^Decent/ }).check()
    kitchen.backend.loseNextAnswer('cook_logs', 'POST')
    await page.getByRole('button', { name: 'Save this cook' }).click()
    await expect(page.getByRole('alert')).toContainText('Could not save this cook')
    await page.getByRole('radio', { name: /^Nailed it/ }).check()
    await page.getByRole('button', { name: 'Save this cook' }).click()
    await expect(noticeLines(page).first()).toHaveText(/: Nailed it\./)
    expect(kitchen.backend.table('cook_logs')).toMatchObject([{ rating: 3 }])
  })

  test('a delete whose answer was lost is done on the retry', async ({ page, kitchen }) => {
    await kitchen.open('#/recipe/chopped-salad', SALAD_DONE)
    await page.getByRole('link', { name: /^Decent, / }).click()
    page.on('dialog', (dialog) => void dialog.accept())
    kitchen.backend.loseNextAnswer('cook_logs', 'DELETE')
    await page.getByRole('button', { name: 'Delete this cook' }).click()
    await expect(page.getByRole('alert')).toContainText('Could not delete this cook')
    await page.getByRole('button', { name: 'Delete this cook' }).click()
    await expect(page.getByRole('heading', { name: 'Chopped salad with lemon vinaigrette' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Your cooks' })).toHaveCount(0)
    expect(kitchen.backend.table('cook_logs')).toEqual([])
  })

  test('creating the chef, when the answer was lost, reaches the menu on the retry', async ({ page, kitchen }) => {
    await kitchen.open('./', { chef: null })
    await page.getByLabel('Chef’s name').fill('Remy')
    kitchen.backend.loseNextAnswer('chefs', 'POST')
    const create = page.getByRole('button', { name: /^Create/ })
    await create.click()
    await expect(page.getByRole('alert')).toBeVisible()
    await create.click()
    await expect(page.getByRole('link', { name: /Remy/ })).toContainText('Level 1 dishwasher')
    expect(kitchen.backend.table('chefs')).toHaveLength(1)
  })

  test('a cook deleted on another device: its screen says so after the catch-up', async ({ page, kitchen }) => {
    await page.clock.install({ time: EVENING })
    await kitchen.open('#/recipe/chopped-salad', SALAD_DONE)
    await page.getByRole('link', { name: /^Decent, / }).click()
    await expect(page.getByRole('heading', { name: 'Change this cook' })).toBeVisible()
    kitchen.backend.deleteElsewhere('cook_logs', { recipe_id: 'chopped-salad' })
    await awayFor(page, 11)
    await expect(page.getByRole('heading', { name: 'That cook is not in your log' })).toBeVisible()
  })

  test('a recipe locked again on another device: cook mode says why, mid-cook', async ({ page, kitchen }) => {
    await page.clock.install({ time: EVENING })
    await kitchen.open('#/cook/grilled-cheese/2', { logs: [{ recipe: 'soft-scrambled-eggs', rating: 2 }] })
    await expect(page.getByText(/^Step 2 of /)).toBeVisible()
    kitchen.backend.deleteElsewhere('cook_logs', { recipe_id: 'soft-scrambled-eggs' })
    await awayFor(page, 11)
    await expect(page.getByRole('heading', { name: 'Grilled cheese is locked' })).toBeVisible()
    await expect(page.getByText('Locked. Learn heat control from Soft scrambled eggs on toast.')).toBeVisible()
  })

  test('under ten minutes away there is no catch-up; a failed one says so and can try again', async ({ page, kitchen }) => {
    await page.clock.install({ time: EVENING })
    await kitchen.open('./', FRESH)
    // The menu's own first load is done before the count starts.
    await expect(page.locator('.kept')).toHaveText('$0.00 kept by cooking')
    kitchen.backend.writeElsewhere('cook_logs', { recipe_id: 'chopped-salad', rating: 2, cooked_on: '2026-10-03', notes: '' })
    const reads: string[] = []
    page.on('request', (request) => {
      if (isRead('cook_logs')(request)) reads.push(request.url())
    })
    await awayFor(page, 9)
    await expect(page.getByRole('heading', { name: 'First Course', exact: true })).toBeVisible()
    expect(reads).toEqual([])
    await expect(page.locator('.kept')).toHaveText('$0.00 kept by cooking')

    kitchen.backend.failNext('cook_logs', 'GET', 'The kitchen is closed')
    await awayFor(page, 11)
    await expect(page.getByRole('alert')).toHaveText(
      'Could not catch up with your other devices: Could not load your cook log: The kitchen is closed',
    )
    // What was on screen stays.
    await expect(page.locator('.kept')).toHaveText('$0.00 kept by cooking')
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.locator('.kept')).toHaveText('$16.76 kept by cooking')
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('Done shopping waits for a tick still saving, and the tick keeps focus', async ({ page, kitchen }) => {
    await kitchen.open('#/shop', { plan: ['chopped-salad'] })
    const release = kitchen.backend.holdNext('grocery_checks', 'POST')
    const salt = page.getByRole('checkbox', { name: /Kosher salt/ })
    await salt.click()
    await expect(page.getByText('Saving…')).toBeVisible()
    await expect(salt).toBeFocused()
    const done = page.getByRole('button', { name: 'Done shopping' })
    await expect(done).toHaveAttribute('aria-disabled', 'true')
    // Tapped while the tick is out, it does nothing: no question, no shop finished.
    // (Playwright will not tap a button marked aria-disabled unless forced; a finger will.)
    await done.click({ force: true })
    await expect(page.getByRole('status')).toHaveCount(0)

    release()
    await expect(salt).toBeChecked()
    page.once('dialog', (dialog) => void dialog.accept())
    await done.click()
    await expect(page.getByRole('status')).toContainText('Kosher salt went into your pantry.')
    await expect(page.getByRole('status')).toBeFocused()
    expect(kitchen.backend.table('pantry_items').map((row) => row.ingredient_id)).toEqual(['kosher-salt'])
  })

  test('a second tap on Done shopping while the first is out asks nothing', async ({ page, kitchen }) => {
    await kitchen.open('#/shop', { plan: ['chopped-salad'], checks: ['lemon'] })
    const asked: string[] = []
    page.on('dialog', (dialog) => {
      asked.push(dialog.message())
      void dialog.accept()
    })
    const release = kitchen.backend.holdNext('rpc/finish_shopping', 'POST')
    const done = page.getByRole('button', { name: 'Done shopping' })
    await done.click()
    await expect(done).toHaveAttribute('aria-disabled', 'true')
    await done.click({ force: true })
    release()
    await expect(page.getByRole('status')).toContainText('Done shopping.')
    expect(asked).toHaveLength(1)
  })

  test('a log of more than a thousand cooks loads in full', async ({ page, kitchen }) => {
    const many = Array.from({ length: 1005 }, (_, index) => ({ recipe: index % 2 === 0 ? 'chopped-salad' : 'soft-scrambled-eggs', rating: 2 as const }))
    await kitchen.open('#/chef', { logs: many })
    await expect(page.locator('.record')).toContainText('1005')
  })

  test('a cook dated a day ahead on another device still takes a change of notes', async ({ page, kitchen }) => {
    await page.clock.install({ time: EVENING })
    await kitchen.open('#/recipe/chopped-salad', { logs: [{ recipe: 'chopped-salad', rating: 2, cookedOn: '2026-10-04' }] })
    await page.getByRole('link', { name: /^Decent, Oct 4, 2026/ }).click()
    await page.getByLabel('Notes for next time').fill('Less onion.')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('link', { name: /^Decent, Oct 4, 2026/ })).toContainText('Less onion.')
  })
})
