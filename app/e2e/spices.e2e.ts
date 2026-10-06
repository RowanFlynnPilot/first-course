import { expect, test } from './kitchen'

test.describe('the spice guide', () => {
  test('opens from the menu and files each spice under the course that first needs it', async ({ page, kitchen }) => {
    await kitchen.open('./', { pantry: ['kosher-salt', 'black-pepper'] })
    await page.getByRole('link', { name: 'Spices', exact: true }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Spices' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2 })).toHaveText([
      'How spices work',
      'To start',
      'New for the second course',
      'New for the third course',
      'Worth adding later',
    ])

    const start = page.locator('section').filter({ has: page.getByRole('heading', { name: 'To start' }) })
    await expect(start.getByRole('heading', { level: 3 })).toHaveText(['Kosher salt', 'Black pepper', 'Red pepper flakes'])
    await expect(start.getByText('2 of 3 in your pantry.')).toBeVisible()
    const salt = start.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Kosher salt' }) })
    await expect(salt).toContainText('In your pantry. First used in Chopped salad with lemon vinaigrette.')

    const third = page.locator('section').filter({ has: page.getByRole('heading', { name: 'New for the third course' }) })
    await expect(third.getByRole('heading', { level: 3 })).toHaveText(['Ground coriander', 'Garam masala', 'Paprika'])
    await third.getByRole('link', { name: 'Broiled chicken tikka' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Broiled chicken tikka' })).toBeVisible()
  })

  test('the pantry points to it', async ({ page, kitchen }) => {
    await kitchen.open('#/pantry')
    await page.getByRole('link', { name: 'spice guide' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Spices' })).toBeVisible()
  })
})
