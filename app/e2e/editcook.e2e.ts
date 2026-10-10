import { expect, test } from './kitchen'

const ONE_SALAD = { logs: [{ recipe: 'chopped-salad', rating: 2 as const, cookedOn: '2026-10-01', notes: 'Too much onion.' }] }

test.describe('changing and deleting a cook', () => {
  test('changes the date, rating and notes of a cook', async ({ page, kitchen }) => {
    await kitchen.open('#/recipe/chopped-salad', ONE_SALAD)
    await page.getByRole('link', { name: /Decent, Oct 1, 2026/ }).click()
    await expect(page.getByRole('heading', { name: 'Change this cook' })).toBeVisible()
    await expect(page.getByLabel('Cooked on')).toHaveValue('2026-10-01')
    await expect(page.getByLabel('Notes for next time')).toHaveValue('Too much onion.')

    await page.getByLabel('Cooked on').fill('2026-09-30')
    await page.getByRole('radio', { name: /^Nailed it/ }).check()
    await page.getByLabel('Notes for next time').fill('Half the onion was right.')
    await page.getByRole('button', { name: 'Save changes' }).click()

    await expect(page.getByRole('heading', { name: 'Chopped salad with lemon vinaigrette' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Nailed it, Sep 30, 2026/ })).toContainText('Half the onion was right.')
    expect(kitchen.backend.table('cook_logs')).toMatchObject([
      { recipe_id: 'chopped-salad', rating: 3, cooked_on: '2026-09-30', notes: 'Half the onion was right.' },
    ])
  })

  test('a change to a cook deleted on another device says so in plain words', async ({ page, kitchen }) => {
    await kitchen.open('#/recipe/chopped-salad', ONE_SALAD)
    await page.getByRole('link', { name: /Decent, Oct 1, 2026/ }).click()
    await expect(page.getByRole('heading', { name: 'Change this cook' })).toBeVisible()
    kitchen.backend.deleteElsewhere('cook_logs', { recipe_id: 'chopped-salad' })
    await page.getByLabel('Notes for next time').fill('Less onion.')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('alert')).toHaveText('Could not save your changes: that cook is no longer in your log.')
  })

  test('warns before a change takes away what you learned', async ({ page, kitchen }) => {
    await kitchen.open('#/recipe/chopped-salad', ONE_SALAD)
    await page.getByRole('link', { name: /Decent, Oct 1, 2026/ }).click()
    await page.getByRole('radio', { name: /^Rough/ }).check()
    await expect(
      page.locator('form').getByText(
        'This would unlearn knife basics and seasoning to taste. It would also lock Sheet-pan sausage and vegetables again.',
      ),
    ).toBeVisible()
  })

  test('deletes a cook after asking, and everything re-scores', async ({ page, kitchen }) => {
    await kitchen.open('#/recipe/chopped-salad', ONE_SALAD)
    await page.getByRole('link', { name: /Decent, Oct 1, 2026/ }).click()
    const asked: string[] = []
    page.once('dialog', (dialog) => {
      asked.push(dialog.message())
      void dialog.accept()
    })
    await page.getByRole('button', { name: 'Delete this cook' }).click()
    await expect(page.getByRole('heading', { name: 'Chopped salad with lemon vinaigrette' })).toBeVisible()
    expect(asked[0]).toContain('Delete this cook? This would unlearn knife basics')
    await expect(page.getByRole('heading', { name: 'Your cooks' })).toHaveCount(0)
    expect(kitchen.backend.table('cook_logs')).toEqual([])
    await page.getByRole('link', { name: 'Menu' }).click()
    await expect(page.locator('.kept')).toHaveText('$0.00 kept by cooking')
    await expect(page.getByRole('link', { name: /Remy/ })).toContainText('Level 1 dishwasher')
  })

  test('keeps the cook when the delete is cancelled', async ({ page, kitchen }) => {
    await kitchen.open('#/recipe/chopped-salad', ONE_SALAD)
    await page.getByRole('link', { name: /Decent, Oct 1, 2026/ }).click()
    page.once('dialog', (dialog) => void dialog.dismiss())
    await page.getByRole('button', { name: 'Delete this cook' }).click()
    await expect(page.getByRole('heading', { name: 'Change this cook' })).toBeVisible()
    expect(kitchen.backend.table('cook_logs')).toHaveLength(1)
  })

  test('a cook that is not in the log says so, without failing the app', async ({ page, kitchen }) => {
    await kitchen.open('#/cook-log/not-a-cook', ONE_SALAD)
    await expect(page.getByRole('heading', { name: 'That cook is not in your log' })).toBeVisible()
    await page.getByRole('link', { name: 'Menu' }).click()
    await expect(page.getByText('Cook this next')).toBeVisible()
  })
})
