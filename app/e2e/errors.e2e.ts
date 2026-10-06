import { expect, FRESH, test } from './kitchen'

// Anything that cannot happen is thrown, and the root error boundary puts the
// message on screen with a way back to the menu.

test.describe('error paths', () => {
  test('a locked recipe cannot be cooked: cook mode says why instead', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/grilled-cheese/0', FRESH)
    await expect(page.getByRole('heading', { name: 'Grilled cheese is locked' })).toBeVisible()
    await expect(page.getByText('Locked. Learn heat control from Soft scrambled eggs on toast.')).toBeVisible()
    await expect(page.getByRole('button', { name: /timer/ })).toHaveCount(0)
  })

  test('a locked recipe cannot be logged: the form is not there', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/grilled-cheese/log', FRESH)
    await expect(page.getByRole('heading', { name: 'Grilled cheese is locked' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save this cook' })).toHaveCount(0)
    expect(kitchen.backend.table('cook_logs')).toHaveLength(0)
  })

  test('an unknown route is not on the menu, and the way back works', async ({ page, kitchen }) => {
    kitchen.expectErrorScreen()
    await kitchen.open('#/somewhere-else', FRESH)
    await expect(page.getByRole('alert')).toHaveText('That page is not on the menu.')
    await page.getByRole('link', { name: 'Back to the menu' }).click()
    await expect(page.getByText('Cook this next')).toBeVisible()
  })

  test('an unknown recipe id says so', async ({ page, kitchen }) => {
    kitchen.expectErrorScreen()
    await kitchen.open('#/recipe/beef-wellington', FRESH)
    await expect(page.getByRole('alert')).toHaveText('Unknown recipe id: beef-wellington')
  })

  test('a step past the end says so', async ({ page, kitchen }) => {
    kitchen.expectErrorScreen()
    await kitchen.open('#/cook/chopped-salad/99', FRESH)
    await expect(page.getByRole('alert')).toHaveText('Chopped salad with lemon vinaigrette has no step 99')
  })

  test('a cook log that cannot load says so, and trying again loads it', async ({ page, kitchen }) => {
    kitchen.backend.failNext('cook_logs', 'GET', 'connection reset')
    await kitchen.open('./', FRESH)
    await expect(page.getByRole('alert')).toHaveText('Could not load your cook log: connection reset')
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByText('Cook this next')).toBeVisible()
  })
})
