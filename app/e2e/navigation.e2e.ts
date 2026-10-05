// Moving between screens: each one names itself in the title, and a new
// screen starts a screen reader at its heading.

import { expect, FRESH, test } from './kitchen'

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
    await page.getByRole('link', { name: 'This week' }).click()
    await expect(page).toHaveTitle('This week · First Course')
    await expect(page.getByRole('heading', { level: 1, name: 'This week' })).toBeFocused()
  })

  test('the log form says why it cannot save yet', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/chopped-salad/log', FRESH)
    await expect(page.getByRole('button', { name: 'Save this cook' })).toBeDisabled()
    await expect(page.getByText('Pick how it went first.')).toBeVisible()
    await page.getByRole('radio', { name: /^Decent/ }).check()
    await expect(page.getByText('Pick how it went first.')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Save this cook' })).toBeEnabled()
  })
})
