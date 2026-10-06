// Moving between screens: each one names itself in the title, and a new
// screen starts a screen reader at its heading.

import { expect, FRESH, SALAD_DONE, test } from './kitchen'

test.describe('moving between screens', () => {
  test('each screen has its own title, and focus moves to the new heading', async ({ page, kitchen }) => {
    await kitchen.open('./', FRESH)
    await expect(page).toHaveTitle('First Course')

    await page.getByRole('link', { name: 'Read the recipe' }).click()
    await expect(page).toHaveTitle('Chopped salad with lemon vinaigrette · First Course')
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused()

    await page.getByRole('link', { name: 'Start cooking' }).click()
    await expect(page).toHaveTitle('Before you start: Chopped salad with lemon vinaigrette · First Course')
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused()

    // Within cook mode the tapped button stays put, so focus stays on it for the next tap.
    await page.getByRole('link', { name: 'Everything is out' }).click()
    await expect(page).toHaveTitle(/^Step 1 of \d+: Chopped salad/)
    await expect(page.getByRole('link', { name: 'Next step' })).toBeFocused()

    await page.getByRole('link', { name: 'Leave cook mode' }).click()
    await page.getByRole('link', { name: 'Menu' }).click()
    await page.getByRole('link', { name: 'This week', exact: true }).click()
    await expect(page).toHaveTitle('This week · First Course')
    await expect(page.getByRole('heading', { level: 1, name: 'This week' })).toBeFocused()
  })

  test('a locked recipe names the recipe that teaches what it needs', async ({ page, kitchen }) => {
    await kitchen.open('#/recipe/grilled-cheese', FRESH)
    await expect(page.locator('.notice').first()).toHaveText('Locked. Learn heat control from Soft scrambled eggs on toast.')
    await page.getByRole('link', { name: 'Soft scrambled eggs on toast' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Soft scrambled eggs on toast' })).toBeVisible()
  })

  test('the error screen has a full-size way back, and says so in the title', async ({ page, kitchen }) => {
    kitchen.expectErrorScreen()
    await kitchen.open('#/somewhere-else', FRESH)
    await expect(page).toHaveTitle('Something broke · First Course')
    const back = page.getByRole('link', { name: 'Back to the menu' })
    expect((await back.boundingBox())?.height).toBeGreaterThanOrEqual(48)
  })

  test('the log form says why it cannot save yet', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/chopped-salad/log', FRESH)
    await expect(page.getByRole('button', { name: 'Save this cook' })).toBeDisabled()
    await expect(page.getByText('Pick how it went first.')).toBeVisible()
    await page.getByRole('radio', { name: /^Decent/ }).check()
    await expect(page.getByText('Pick how it went first.')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Save this cook' })).toBeEnabled()
  })

  test('a new cook sees where to start, ticked off as it is done', async ({ page, kitchen }) => {
    await kitchen.open('./', { kit: ['chefs-knife'] })
    const steps = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Where to start' }) }).getByRole('listitem')
    await expect(steps).toHaveCount(5)
    await expect(steps.first()).toContainText('Done')
    await expect(steps.nth(1)).not.toContainText('Done')
  })

  test('a course with every recipe mastered folds away', async ({ page, kitchen }) => {
    const firstCourse = ['chopped-salad', 'soft-scrambled-eggs', 'aglio-e-olio', 'grilled-cheese', 'fried-egg-rice-bowl', 'sheet-pan-sausage']
    const logs = firstCourse.flatMap((recipe) => [2, 2, 3].map((rating) => ({ recipe, rating: rating as 2 | 3 })))
    await kitchen.open('./', { logs })
    const course = page.locator('section').filter({ has: page.getByRole('heading', { name: 'First course' }) })
    await expect(course.getByText('All 6 recipes mastered')).toBeVisible()
    await expect(course.getByRole('link', { name: /Grilled cheese/ })).toBeHidden()
    await course.getByText('All 6 recipes mastered').click()
    await expect(course.getByRole('link', { name: /Grilled cheese/ })).toBeVisible()
  })

  test('back after a while away, the app catches up with another device', async ({ page, kitchen }) => {
    await page.clock.install({ time: new Date('2026-10-03T18:00:00-05:00') })
    await kitchen.open('./', FRESH)
    await expect(page.locator('.kept')).toHaveText('$0.00 kept by cooking')
    kitchen.backend.writeElsewhere('cook_logs', { recipe_id: 'chopped-salad', rating: 2, cooked_on: '2026-10-03', notes: '' })
    const show = (state: 'hidden' | 'visible') =>
      page.evaluate((next) => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: next })
        document.dispatchEvent(new Event('visibilitychange'))
      }, state)
    await show('hidden')
    await page.clock.fastForward('11:00')
    await show('visible')
    await expect(page.locator('.kept')).toHaveText('$22.50 kept by cooking')
  })

  test('zoomed far in, no screen runs off the side', async ({ page, kitchen }) => {
    await page.setViewportSize({ width: 195, height: 422 })
    await kitchen.open('#/recipe/sheet-pan-sausage', { ...SALAD_DONE, plan: ['sheet-pan-sausage'] })
    for (const route of ['#/recipe/sheet-pan-sausage', '#/cook/sheet-pan-sausage/3', '#/shop', '#/chef', './']) {
      await page.goto(route)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
      expect(fits, route).toBe(true)
    }
  })
})
