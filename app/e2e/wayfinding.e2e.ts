import { expect, FRESH, SALAD_DONE, test } from './kitchen'

// Knowing the next move, and keeping your place: the fourth review's
// walkthrough as a beginner, with a keyboard and a screen reader in mind.

test.describe('the next move', () => {
  test('a locked recipe names the whole way there', async ({ page, kitchen }) => {
    await kitchen.open('#/recipe/chicken-pan-sauce', FRESH)
    const locked = page.locator('.notice').filter({ hasText: /^Locked\./ })
    await expect(locked).toContainText('Learn searing and judging doneness from Seared chicken thighs with roasted broccoli.')
    await expect(locked).toContainText('The way there, each cooked at “Decent” or better:')
    await expect(locked.getByRole('link', { name: 'Chopped salad with lemon vinaigrette' })).toBeVisible()
    await expect(locked).toContainText(', then this.')
  })

  test('a fresh menu suggests planning first, then shopping', async ({ page, kitchen }) => {
    await kitchen.open('./', FRESH)
    const tray = page.locator('.tray')
    await expect(page.getByRole('heading', { name: 'Cook this next: Chopped salad with lemon vinaigrette' })).toBeVisible()
    await expect(tray.locator('.actions > *').first()).toHaveText('Add to this week')
    await tray.getByRole('button', { name: 'Add to this week' }).click()
    await expect(tray.getByRole('link', { name: 'Shop for it' })).toBeFocused()
    await expect(page.getByRole('heading', { name: 'On this week’s plan: Chopped salad with lemon vinaigrette' })).toBeVisible()
    await tray.getByRole('link', { name: 'Shop for it' }).click()
    await expect(page.getByRole('heading', { name: 'This week' })).toBeVisible()
  })

  test('after Done shopping, the way back to cook', async ({ page, kitchen }) => {
    await kitchen.open('#/shop', { plan: ['chopped-salad'], checks: ['lemon'] })
    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('button', { name: 'Done shopping' }).click()
    await page.getByRole('link', { name: 'Go to the menu to cook' }).click()
    await expect(page.getByText('Groceries bought')).toBeVisible()
  })

  test('the kit leads to the pantry, and the pantry to the week', async ({ page, kitchen }) => {
    await kitchen.open('#/kit', FRESH)
    await page.getByRole('link', { name: 'Next: your pantry' }).click()
    await expect(page.getByRole('heading', { name: 'Your pantry' })).toBeVisible()
    await page.getByRole('link', { name: 'Next: plan this week' }).click()
    await expect(page.getByRole('heading', { name: 'This week' })).toBeVisible()
  })

  test('the pantry asks about week one’s staples first, filed like the kit', async ({ page, kitchen }) => {
    await kitchen.open('#/pantry', FRESH)
    const start = page.locator('section').filter({ has: page.getByRole('heading', { name: 'To start' }) })
    await expect(start.getByRole('checkbox', { name: /Kosher salt/ })).toBeVisible()
    await expect(start.getByRole('checkbox', { name: /curry paste/i })).toHaveCount(0)
    await expect(page.getByRole('checkbox', { name: /curry paste/i })).toBeVisible()
  })

  test('the recipe page says what “you keep” counts, and what the dish counts toward', async ({ page, kitchen }) => {
    await kitchen.open('#/recipe/chopped-salad', FRESH)
    await expect(page.getByText('First course. Counts toward the basics.')).toBeVisible()
    await expect(page.locator('.tab-kept')).toContainText('For 2 servings')
    await page.goto('#/recipe/soft-scrambled-eggs')
    await expect(page.locator('.tab-kept')).toContainText('For 1 serving')
  })

  test('This week offers at most four recipes to add', async ({ page, kitchen }) => {
    await kitchen.open('#/shop', {
      logs: [
        { recipe: 'chopped-salad', rating: 2 },
        { recipe: 'soft-scrambled-eggs', rating: 2 },
      ],
    })
    await expect(page.getByRole('button', { name: /^Add .* to this week$/ })).toHaveCount(4)
  })
})

test.describe('cook mode', () => {
  test('a timer passed by without starting waits as a chip that starts it', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/sheet-pan-sausage/3', SALAD_DONE)
    await expect(page.getByRole('button', { name: 'Start 15:00 timer' })).toBeVisible()
    await page.getByRole('link', { name: 'Next step' }).click()
    const chip = page.getByRole('button', { name: 'Potatoes: start 15:00' })
    await expect(chip).toBeVisible()
    await chip.click()
    await expect(page.getByRole('link', { name: /^Potatoes: 1[45]:\d\d$/ })).toBeVisible()
    await expect(chip).toHaveCount(0)
  })

  test('a timer stopped on purpose does not come back as one to start', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/sheet-pan-sausage/3', SALAD_DONE)
    await page.getByRole('button', { name: 'Start 15:00 timer' }).click()
    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('button', { name: 'Stop timer' }).click()
    await page.getByRole('link', { name: 'Next step' }).click()
    await expect(page.getByText(/^Step 4 of /)).toBeVisible()
    await expect(page.locator('.timer-strip')).toHaveCount(0)
  })
})

test.describe('keeping your place', () => {
  test('correcting a price puts the cursor in it, and Cancel comes back to the price', async ({ page, kitchen }) => {
    await kitchen.open('#/shop', { plan: ['chopped-salad'] })
    const price = page.getByRole('button', { name: /correct the price of lemon/i })
    await price.click()
    await expect(page.getByLabel(/Lemon/)).toBeFocused()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(price).toBeFocused()
  })

  test('adding a recipe from Ready to cook moves focus to it on the plan', async ({ page, kitchen }) => {
    await kitchen.open('#/shop', FRESH)
    await page.getByRole('button', { name: 'Add Chopped salad with lemon vinaigrette to this week' }).click()
    await expect(page.getByRole('link', { name: 'Chopped salad with lemon vinaigrette' })).toBeFocused()
    await page.getByRole('button', { name: 'Take off: Chopped salad with lemon vinaigrette' }).click()
    await expect(page.getByRole('heading', { name: 'The plan' })).toBeFocused()
  })

  test('“I have all of these” leaves focus on what replaced it', async ({ page, kitchen }) => {
    await kitchen.open('#/kit', FRESH)
    await page.getByRole('button', { name: 'I have all of these' }).first().click()
    await expect(page.getByText('You have all of it.').first()).toBeFocused()
  })

  test('the sign-in screen names each form, and switching moves focus to it', async ({ page, kitchen }) => {
    await kitchen.open('./', { signedIn: false })
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await page.getByRole('button', { name: 'New here? Create an account' }).click()
    await expect(page.getByRole('heading', { name: 'Create an account' })).toBeFocused()
    await page.getByRole('button', { name: 'Have an account? Sign in' }).click()
    await page.getByRole('button', { name: 'Forgot your password?' }).click()
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeFocused()
  })
})
