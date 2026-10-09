import { cookThrough, expect, FRESH, noticeLines, rateAndSave, SALAD_DONE, test } from './kitchen'

// An evening cook in Wausau. In UTC it is already October 4, which is why the
// client sends its own date (locked decision 10).
const EVENING = new Date('2026-10-03T21:30:00-05:00')

test.describe('the menu', () => {
  test('starts with the salad up next, two ready plates and everything else locked', async ({ page, kitchen }) => {
    await kitchen.open('./', FRESH)
    await expect(page.getByText('Cook this next')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Chopped salad with lemon vinaigrette' })).toBeVisible()
    await expect(page.locator('.row-ready')).toHaveCount(2)
    await expect(page.getByRole('link', { name: /Grilled cheese/ })).toContainText('Needs heat control')
    await expect(page.getByText('$0.00')).toBeVisible()
  })

  test('opens a recipe with its cost, the ordering price and the pairing', async ({ page, kitchen }) => {
    await kitchen.open('./', FRESH)
    await page.getByRole('link', { name: 'Read the recipe' }).click()
    await expect(page.getByRole('heading', { name: 'Chopped salad with lemon vinaigrette' })).toBeVisible()
    await expect(page.getByText('Cooking it')).toBeVisible()
    await expect(page.getByText('Greek salad')).toBeVisible()
    await expect(page.getByText('Sauvignon Blanc')).toBeVisible()
    await expect(page.getByText('Match acid with acid.')).toBeVisible()
  })
})

test.describe('cooking and logging', () => {
  test('cooks the salad start to finish, logs it, and shows what it earned', async ({ page, kitchen }) => {
    await page.clock.install({ time: EVENING })
    await kitchen.open('./', FRESH)

    await page.getByRole('link', { name: 'Start cooking' }).click()
    await expect(page.getByRole('heading', { name: 'Get everything out before you turn anything on.' })).toBeVisible()
    await expect(page.getByText('Before you start')).toBeVisible()
    const steps = await cookThrough(page)
    expect(steps).toBe(8)

    await expect(page.getByRole('button', { name: 'Save this cook' })).toBeDisabled()
    await rateAndSave(page, 'Decent', 'More lemon next time.')

    await expect(noticeLines(page)).toHaveText([
      'Chopped salad with lemon vinaigrette: Decent. +120 XP. Level 2.',
      'Kept $16.76 by not ordering.',
      'Learned knife basics and seasoning to taste.',
      'Now ready to cook: Sheet-pan sausage and vegetables.',
      'You cooked with 8 things not checked off in your kit. Add them to your kit',
    ])
    // Focus is on what the cook earned, so a screen reader reads it first.
    await expect(page.getByRole('status')).toBeFocused()
    // The tools the cook plainly owns now go into the kit in one tap.
    await page.getByRole('button', { name: 'Add them to your kit' }).click()
    await expect(page.getByText('Added 8 things to your kit.')).toBeFocused()
    expect(kitchen.backend.table('kit_items')).toHaveLength(8)
    await expect(page.getByRole('status').getByRole('img', { name: 'First cook badge' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Remy/ })).toContainText('Level 2 dishwasher')
    await expect(page.locator('.kept')).toHaveText('$16.76 kept by cooking')
    // The yolk lands on the plate just cooked, at the top of the notice where the cook is looking, and only there.
    await expect(page.locator('.plate-celebrate')).toHaveCount(1)
    await expect(page.getByRole('status').locator('.notice-cooked .plate-celebrate')).toHaveCount(1)
    // What unlocked is linked from the notice, and ready on the menu.
    await expect(page.getByRole('status').getByRole('link', { name: 'Sheet-pan sausage and vegetables' })).toBeVisible()
    await expect(page.locator('a.row').filter({ hasText: 'Sheet-pan sausage' })).toContainText('Teaches roasting')

    expect(kitchen.backend.table('cook_logs')).toMatchObject([
      { recipe_id: 'chopped-salad', rating: 2, notes: 'More lemon next time.', cooked_on: '2026-10-03' },
    ])
  })

  test('Back from the menu lands on the last step, never the log form', async ({ page, kitchen }) => {
    await kitchen.open('./', FRESH)
    await page.getByRole('link', { name: 'Start cooking' }).click()
    await cookThrough(page)
    await rateAndSave(page, 'Decent')
    await expect(noticeLines(page).first()).toHaveText('Chopped salad with lemon vinaigrette: Decent. +120 XP. Level 2.')
    await page.goBack()
    await expect(page.getByText('Step 8 of 8')).toBeVisible()
    expect(kitchen.backend.table('cook_logs')).toHaveLength(1)
  })

  test('the notice goes once you leave the menu', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/chopped-salad/log', FRESH)
    await rateAndSave(page, 'Decent')
    await expect(page.getByRole('status')).toBeVisible()
    await page.getByRole('link', { name: /Remy/ }).click()
    await page.getByRole('link', { name: 'Menu' }).click()
    await expect(page.getByRole('status')).toHaveCount(0)
    await expect(page.locator('.plate-celebrate')).toHaveCount(0)
  })

  test('a rough cook counts as cooked but teaches and unlocks nothing', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/soft-scrambled-eggs/log', FRESH)
    await rateAndSave(page, 'Rough')
    await expect(noticeLines(page)).toHaveText([
      'Soft scrambled eggs on toast: Rough. +10 XP.',
      'Kept $17.12 by not ordering.',
      'Cook it again at Decent or better to learn heat control.',
      'You cooked with 7 things not checked off in your kit. Add them to your kit',
    ])
    // The menu row says what a Decent cook would do.
    await expect(page.getByRole('link', { name: /Soft scrambled eggs/ })).toContainText('Rough so far. A Decent cook teaches heat control')
    await expect(page.getByRole('link', { name: /Grilled cheese/ })).toContainText('Needs heat control')
  })

  test('a cook can be logged from the recipe page, for another day', async ({ page, kitchen }) => {
    await kitchen.open('#/recipe/chopped-salad')
    await page.getByRole('link', { name: 'Log a cook' }).click()
    await expect(page.getByRole('heading', { name: 'How did it go?' })).toBeVisible()
    await page.getByLabel('Cooked on').fill('2026-01-15')
    await rateAndSave(page, 'Decent')
    await expect(page.getByText('Cook this next')).toBeVisible()
    expect(kitchen.backend.table('cook_logs')).toMatchObject([{ recipe_id: 'chopped-salad', cooked_on: '2026-01-15', rating: 2 }])
  })

  test('the last note comes back on the recipe page and before cooking', async ({ page, kitchen }) => {
    await kitchen.open('#/recipe/chopped-salad', {
      logs: [
        { recipe: 'chopped-salad', rating: 1, notes: 'Too much onion.', cookedOn: '2026-09-20' },
        { recipe: 'chopped-salad', rating: 2, notes: 'Slice the onion thinner.', cookedOn: '2026-09-27' },
      ],
    })
    await expect(page.getByText('Last time you wrote: “Slice the onion thinner.”')).toBeVisible()
    await page.getByRole('link', { name: 'Start cooking' }).click()
    await expect(page.getByText('Before you start')).toBeVisible()
    await expect(page.getByText('Last time you wrote: “Slice the onion thinner.”')).toBeVisible()
  })

  test('a failed save says why and lets the cook try again', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/chopped-salad/log', FRESH)
    kitchen.backend.failNext('cook_logs', 'POST', 'the database is asleep')
    await rateAndSave(page, 'Nailed it')
    await expect(page.getByRole('alert')).toHaveText('Could not save this cook: the database is asleep')
    expect(kitchen.backend.table('cook_logs')).toHaveLength(0)
    await page.getByRole('button', { name: 'Save this cook' }).click()
    await expect(noticeLines(page).first()).toHaveText('Chopped salad with lemon vinaigrette: Nailed it. +130 XP. Level 2.')
    expect(kitchen.backend.table('cook_logs')).toHaveLength(1)
  })

  test('a save whose answer is lost on weak signal is not logged twice when tried again', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/chopped-salad/log', FRESH)
    kitchen.backend.loseNextAnswer('cook_logs', 'POST')
    await rateAndSave(page, 'Decent')
    await expect(page.getByRole('alert')).toContainText('Could not save this cook')
    // The first try landed; only its answer was lost.
    expect(kitchen.backend.table('cook_logs')).toHaveLength(1)
    await page.getByRole('button', { name: 'Save this cook' }).click()
    await expect(noticeLines(page).first()).toHaveText('Chopped salad with lemon vinaigrette: Decent. +120 XP. Level 2.')
    expect(kitchen.backend.table('cook_logs')).toHaveLength(1)
  })

  test('a cook cannot be dated after today, even where the phone ignores the date limit', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/chopped-salad/log', FRESH)
    await page.getByLabel('Cooked on').evaluate((input) => input.removeAttribute('max'))
    await page.getByLabel('Cooked on').fill('2099-01-01')
    await rateAndSave(page, 'Decent')
    await expect(page.getByRole('alert')).toHaveText('A cook cannot be dated after today.')
    expect(kitchen.backend.table('cook_logs')).toEqual([])
  })

  test('the log form says what the rating decides', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/chopped-salad/log', FRESH)
    await expect(page.getByText('Decent or better teaches knife basics and seasoning to taste.')).toBeVisible()
  })

  test('cook mode shows what comes next', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/sheet-pan-sausage/2', SALAD_DONE)
    await expect(page.getByText('Next: Roast the potatoes on their own.')).toBeVisible()
    await page.goto('#/cook/sheet-pan-sausage/8')
    await expect(page.getByText('Next: log how it went.')).toBeVisible()
  })
})
