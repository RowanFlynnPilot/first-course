// Moving between screens: each one names itself in the title, and a new
// screen starts a screen reader at its heading.

import { recipeById } from '../src/curriculum/recipes'
import { pathTo } from '../src/lib/progress'
import { awayFor, expect, FRESH, SALAD_DONE, test } from './kitchen'

test.describe('moving between screens', () => {
  test('each screen has its own title, and focus moves to the new heading', async ({ page, kitchen }) => {
    await kitchen.open('./', FRESH)
    await expect(page).toHaveTitle('First Course')

    await page.getByRole('link', { name: /Chopped salad/ }).click()
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
    const save = page.getByRole('button', { name: 'Save this cook' })
    await expect(save).toHaveAttribute('aria-disabled', 'true')
    await expect(save).toHaveAccessibleDescription('Pick how it went first.')
    // A tap too early goes to the choices, and saves nothing. (Forced: Playwright will not tap aria-disabled; a finger will.)
    await save.click({ force: true })
    await expect(page.getByRole('radio', { name: /^Rough/ })).toBeFocused()
    expect(kitchen.backend.table('cook_logs')).toEqual([])
    await page.getByRole('radio', { name: /^Decent/ }).check()
    await expect(page.getByText('Pick how it went first.')).toHaveCount(0)
    await expect(save).toHaveAttribute('aria-disabled', 'false')
    // No later than today, and no earlier than the database takes.
    await expect(page.getByLabel('Cooked on')).toHaveAttribute('min', '1900-01-01')
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

  test('a course cooked well but not mastered stays open', async ({ page, kitchen }) => {
    const firstCourse = ['chopped-salad', 'soft-scrambled-eggs', 'aglio-e-olio', 'grilled-cheese', 'fried-egg-rice-bowl', 'sheet-pan-sausage']
    const logs = firstCourse.flatMap((recipe) => [2, 2, 2].map((rating) => ({ recipe, rating: rating as 2 })))
    await kitchen.open('./', { logs })
    const course = page.locator('section').filter({ has: page.getByRole('heading', { name: 'First course' }) })
    await expect(course.getByText(/recipes mastered/)).toHaveCount(0)
    await expect(course.getByRole('link', { name: /Grilled cheese/ })).toContainText('3 good cooks. A “Nailed it” masters it')
  })

  test('the usual sits below the courses while none of it is in reach', async ({ page, kitchen }) => {
    await kitchen.open('./', FRESH)
    await expect(page.getByText('Everything above builds toward cooking these.')).toBeVisible()
    expect((await page.locator('h2.section-title').allTextContents()).at(-1)).toBe('The usual')
  })

  test('once a dish of the usual is in reach, the usual leads the menu', async ({ page, kitchen }) => {
    const burger = recipeById('double-smash-burger')
    await kitchen.open('./', { logs: pathTo(burger, []).map((recipe) => ({ recipe: recipe.id, rating: 2 as const })) })
    await expect(page.getByText('Everything below builds toward cooking these.')).toBeVisible()
    const headings = await page.locator('h2.section-title').allTextContents()
    expect(headings.indexOf('The usual')).toBeGreaterThan(-1)
    expect(headings.indexOf('The usual')).toBeLessThan(headings.indexOf('First course'))
  })

  test('the Menu link goes back to where the menu was scrolled', async ({ page, kitchen }) => {
    await kitchen.open('./', FRESH)
    const curry = page.getByRole('link', { name: /Thai green curry/ })
    await curry.scrollIntoViewIfNeeded()
    const scrolled = await page.evaluate(() => window.scrollY)
    expect(scrolled).toBeGreaterThan(1000)
    await curry.click()
    await expect(page.getByRole('heading', { name: 'Thai green curry' })).toBeVisible()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await page.getByRole('link', { name: 'Menu', exact: true }).click()
    await expect(curry).toBeInViewport()
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - scrolled)).toBeLessThan(2)
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
  })

  test('a course still shut says what opens it', async ({ page, kitchen }) => {
    await kitchen.open('./', FRESH)
    const course = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Second course' }) })
    await expect(course.getByText('Opens as you learn first course skills. Each recipe below says which it needs.')).toBeVisible()
    const first = page.locator('section').filter({ has: page.getByRole('heading', { name: 'First course' }) })
    await expect(first.getByText(/^Opens as you learn/)).toHaveCount(0)
  })

  test('back after a while away, the app catches up with another device', async ({ page, kitchen }) => {
    await page.clock.install({ time: new Date('2026-10-03T18:00:00-05:00') })
    await kitchen.open('./', FRESH)
    await expect(page.locator('.kept')).toHaveText('$0.00 kept by cooking')
    kitchen.backend.writeElsewhere('cook_logs', { recipe_id: 'chopped-salad', rating: 2, cooked_on: '2026-10-03', notes: '' })
    await awayFor(page, 11)
    await expect(page.locator('.kept')).toHaveText('$16.76 kept by cooking')
  })

  test('every control is a full-size tap target, 3rem each way, the ways back included', async ({ page, kitchen }) => {
    await kitchen.open('./', { ...SALAD_DONE, plan: ['sheet-pan-sausage'] })
    const cook = kitchen.backend.table('cook_logs')[0]
    if (cook === undefined) throw new Error('The seed has no cook to change')
    const routes = [
      './',
      '#/recipe/sheet-pan-sausage',
      '#/cook/sheet-pan-sausage/3',
      '#/cook/sheet-pan-sausage/log',
      `#/cook-log/${String(cook.id)}`,
      '#/shop',
      '#/chef',
      '#/chef/edit',
      '#/kit',
      '#/pantry',
      '#/spices',
    ]
    for (const route of routes) {
      await page.goto(route)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      // Links inside a sentence are exempt; every control on its own is not.
      const small = await page.evaluate(() =>
        [
          ...document.querySelectorAll<HTMLElement>(
            'button, a.button, .link-button, .back a, .cook-head > a, .timer-chip, .row, summary, .quick-links a, .chef-card, .usual-item, .check-label, .rating, .price-button, .plan-row a.row-title',
          ),
        ]
          .filter((element) => element.offsetParent !== null)
          .filter((element) => {
            const box = element.getBoundingClientRect()
            return box.height < 47.5 || box.width < 47.5
          })
          .map((element) => (element.textContent ?? '').trim()),
      )
      expect(small, route).toEqual([])
    }
  })

  test('with text at 200%, no screen runs off the side', async ({ page, kitchen }) => {
    // A phone's largest text setting, as the browser applies it: the root font doubles.
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.style.fontSize = '200%'
      })
    })
    await kitchen.open('#/recipe/sheet-pan-sausage', { ...SALAD_DONE, plan: ['sheet-pan-sausage'] })
    const routes = ['#/recipe/sheet-pan-sausage', '#/cook/sheet-pan-sausage/3', '#/shop', '#/chef', '#/kit', '#/pantry', './']
    for (const route of routes) {
      await page.goto(route)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
      expect(fits, route).toBe(true)
    }
  })

  test('zoomed far in, no screen runs off the side', async ({ page, kitchen }) => {
    await page.setViewportSize({ width: 195, height: 422 })
    await kitchen.open('#/recipe/sheet-pan-sausage', { ...SALAD_DONE, plan: ['sheet-pan-sausage'] })
    const routes = ['#/recipe/sheet-pan-sausage', '#/cook/sheet-pan-sausage/3', '#/shop', '#/chef', '#/kit', '#/pantry', '#/recipe/chicken-pan-sauce', './']
    for (const route of routes) {
      await page.goto(route)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
      expect(fits, route).toBe(true)
    }
  })
})
