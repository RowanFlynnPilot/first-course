import { expect, SALAD_DONE, test } from './kitchen'

test.describe('the chef', () => {
  test('the chef sheet shows level, six disciplines, every skill and the kitchen ladder', async ({ page, kitchen }) => {
    await kitchen.open('./', SALAD_DONE)
    await page.getByRole('link', { name: /Remy/ }).click()

    await expect(page.getByRole('heading', { name: 'Remy', level: 1 })).toBeVisible()
    await expect(page.getByText('Level 2 dishwasher')).toBeVisible()
    await expect(page.getByRole('heading', { level: 3 })).toHaveText(['Prep', 'Pan', 'Pot', 'Oven', 'Sauce', 'Palate'])
    await expect(page.getByRole('img', { name: '1 of 4 learned' }).first()).toBeVisible()
    const knife = page.getByRole('listitem').filter({ hasText: 'Knife basics' })
    await expect(knife).toContainText('Learned from Chopped salad with lemon vinaigrette')
    const roasting = page.getByRole('listitem').filter({ hasText: /^Roasting/ })
    await expect(roasting).toContainText('Taught by Sheet-pan sausage and vegetables')

    const ladder = page.getByRole('list').filter({ hasText: 'Executive chef' })
    await expect(ladder.getByRole('listitem')).toHaveCount(6)
    await expect(ladder.getByRole('listitem').first()).toContainText('You are here')
    await expect(page.getByText('Next promotion: prep cook at level 3.')).toBeVisible()
  })

  test('changing the name and look saves and shows everywhere', async ({ page, kitchen }) => {
    await kitchen.open('#/chef', SALAD_DONE)
    await page.getByRole('link', { name: 'Change name or look' }).click()
    await expect(page.getByRole('heading', { name: 'Change your chef' })).toBeVisible()
    await expect(page.getByLabel('Chef’s name')).toHaveValue('Remy')

    await page.getByLabel('Chef’s name').fill('Colette')
    await page.getByRole('radio', { name: 'Tone 2' }).check()
    await page.getByRole('radio', { name: 'Black' }).check()
    await page.getByRole('button', { name: 'Save chef' }).click()

    await expect(page.getByRole('heading', { name: 'Colette', level: 1 })).toBeVisible()
    expect(kitchen.backend.table('chefs')).toMatchObject([{ name: 'Colette', skin: 1, hair: 0 }])
    await page.getByRole('link', { name: 'Menu' }).click()
    await expect(page.getByRole('link', { name: /Colette/ })).toContainText('Level 2 dishwasher')
  })

  test('a failed save keeps the form and says why', async ({ page, kitchen }) => {
    await kitchen.open('#/chef/edit', SALAD_DONE)
    kitchen.backend.failNext('chefs', 'PATCH', 'try again later')
    await page.getByLabel('Chef’s name').fill('Colette')
    await page.getByRole('button', { name: 'Save chef' }).click()
    await expect(page.getByRole('alert')).toHaveText('Could not save your chef: try again later')
    await expect(page.getByRole('button', { name: 'Save chef' })).toBeEnabled()
    expect(kitchen.backend.table('chefs')).toMatchObject([{ name: 'Remy' }])
  })
})
