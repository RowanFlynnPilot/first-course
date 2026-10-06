import { expect, noticeLines, rateAndSave, SALAD_DONE, test } from './kitchen'

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
    await page.getByRole('link', { name: 'Change name, look or extras' }).click()
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

  test('the character creator saves hairstyle, facial hair, glasses and the new colors', async ({ page, kitchen }) => {
    await kitchen.open('#/chef/edit', SALAD_DONE)
    await page.getByRole('radio', { name: 'Tone 7' }).check()
    await page.getByRole('radio', { name: 'Pink' }).check()
    await page.getByRole('radio', { name: 'Long', exact: true }).check()
    await page.getByRole('radio', { name: 'Beard' }).check()
    await page.getByRole('radio', { name: 'Round' }).check()
    await page.getByRole('button', { name: 'Save chef' }).click()

    await expect(page.getByRole('heading', { name: 'Remy', level: 1 })).toBeVisible()
    expect(kitchen.backend.table('chefs')).toMatchObject([
      { skin: 6, hair: 6, hair_style: 2, facial_hair: 2, glasses: 1, extras: [] },
    ])
  })

  test('extras stay locked until earned, then go on over the outfit', async ({ page, kitchen }) => {
    const burgers = Array.from({ length: 5 }, () => ({ recipe: 'smash-cheeseburger', rating: 2 as const }))
    await kitchen.open('#/chef/edit', { logs: burgers })

    await expect(page.getByRole('radio', { name: 'Smash spatula (locked)' })).toBeDisabled()
    await expect(page.getByText('Smash spatula: Cook burgers and sandwiches 15 times at “Decent” or better.')).toBeVisible()
    await page.getByRole('radio', { name: 'Red clogs', exact: true }).check()
    await page.getByRole('button', { name: 'Save chef' }).click()

    await expect(page.getByRole('heading', { name: 'Remy', level: 1 })).toBeVisible()
    expect(kitchen.backend.table('chefs')).toMatchObject([{ extras: ['red-clogs'] }])
    const extras = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Extras' }) })
    await expect(extras.getByRole('listitem').filter({ hasText: 'Red clogs' })).toContainText('Red clogs, wearing itEarned.')
    await expect(extras.getByRole('listitem').filter({ hasText: 'Smash spatula' })).toContainText('5 of 15 so far.')
  })

  test('the fifth good cook of a kind of dish earns an extra, named after the cook', async ({ page, kitchen }) => {
    const burgers = Array.from({ length: 4 }, () => ({ recipe: 'smash-cheeseburger', rating: 2 as const }))
    await kitchen.open('#/cook/smash-cheeseburger/log', {
      logs: [{ recipe: 'grilled-cheese', rating: 2 }, { recipe: 'seared-chicken-thighs', rating: 2 }, ...burgers],
    })
    await rateAndSave(page, 'Decent')
    const line = noticeLines(page).filter({ hasText: 'New extra for Remy: Red clogs.' })
    // Nothing is on the feet yet, so it goes on from right here.
    await line.getByRole('button', { name: 'Wear it' }).click()
    await expect(line).toContainText('Wearing it.')
    expect(kitchen.backend.table('chefs')).toMatchObject([{ extras: ['red-clogs'] }])
  })
})
