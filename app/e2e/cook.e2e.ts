import { cookThrough, expect, FRESH, noticeLines, rateAndSave, test } from './kitchen'

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
    await expect(page.getByText('Side Greek salad')).toBeVisible()
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
    expect(steps).toBe(7)

    await expect(page.getByRole('button', { name: 'Save this cook' })).toBeDisabled()
    await rateAndSave(page, 'Decent', 'More lemon next time.')

    await expect(noticeLines(page)).toHaveText([
      '+120 XP. Level 2.',
      'Kept $22.75 by not ordering.',
      'Learned knife basics and seasoning to taste.',
      'Now ready to cook: Sheet-pan sausage and vegetables.',
    ])
    await expect(page.getByRole('status').getByRole('img', { name: 'First cook badge' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Remy/ })).toContainText('Level 2 dishwasher')
    await expect(page.locator('.kept')).toHaveText('$22.75 kept by cooking')
    // The yolk lands on the plate just cooked, and only there.
    await expect(page.locator('.plate-celebrate')).toHaveCount(1)
    await expect(page.getByRole('link', { name: /Chopped salad/ }).locator('.plate-celebrate')).toHaveCount(1)
    // What unlocked is now ready on the menu.
    await expect(page.getByRole('link', { name: /Sheet-pan sausage/ })).toContainText('Teaches roasting')

    expect(kitchen.backend.table('cook_logs')).toMatchObject([
      { recipe_id: 'chopped-salad', rating: 2, notes: 'More lemon next time.', cooked_on: '2026-10-03' },
    ])
  })

  test('Back from the menu lands on the last step, never the log form', async ({ page, kitchen }) => {
    await kitchen.open('./', FRESH)
    await page.getByRole('link', { name: 'Start cooking' }).click()
    await cookThrough(page)
    await rateAndSave(page, 'Decent')
    await expect(noticeLines(page).first()).toHaveText('+120 XP. Level 2.')
    await page.goBack()
    await expect(page.getByText('Step 7 of 7')).toBeVisible()
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
      '+10 XP.',
      'Kept $17.15 by not ordering.',
      'Cook it again at “Decent” or better to learn heat control.',
    ])
    await expect(page.getByRole('link', { name: /Soft scrambled eggs/ })).toContainText('Cooked 1 time')
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
    await expect(noticeLines(page).first()).toHaveText('+130 XP. Level 2.')
    expect(kitchen.backend.table('cook_logs')).toHaveLength(1)
  })
})
