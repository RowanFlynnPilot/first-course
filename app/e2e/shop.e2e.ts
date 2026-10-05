import { expect, SALAD_DONE, test } from './kitchen'

// The sheet pan's grocery list at the estimates in ingredients.ts, one whole
// package each: sausage 4.49, potatoes 3.99, broccoli 1.99, pepper 1.29, red
// onion 1.29, olive oil 8.99, kosher salt 4.49, black pepper 3.99.
const SHEET_PAN_CHECKOUT = '$30.52'

test.describe('this week: the plan and the grocery list', () => {
  test('adds a recipe to the week, shops for it, corrects a price and finishes', async ({ page, kitchen }) => {
    await kitchen.open('#/recipe/sheet-pan-sausage', SALAD_DONE)
    await page.getByRole('button', { name: 'Add to this week' }).click()
    await expect(page.getByRole('button', { name: 'Take off this week' })).toBeVisible()
    expect(kitchen.backend.table('plan_items')).toMatchObject([{ recipe_id: 'sheet-pan-sausage' }])

    await page.getByRole('link', { name: 'Menu' }).click()
    await page.getByRole('link', { name: 'This week (1)' }).click()
    await expect(page.getByRole('heading', { name: 'This week', level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { level: 3 })).toHaveText(['Produce', 'Meat', 'Pantry'])
    const total = page.locator('.tab-kept dd')
    await expect(total).toHaveText(SHEET_PAN_CHECKOUT)

    // Check something off.
    await page.getByRole('checkbox', { name: /Smoked sausage/ }).click()
    await expect(page.getByRole('checkbox', { name: /Smoked sausage/ })).toBeChecked()
    expect(kitchen.backend.table('grocery_checks')).toMatchObject([{ ingredient_id: 'kielbasa' }])

    // Correct a price, then go back to the estimate.
    await page.getByRole('button', { name: 'Correct the price of Extra-virgin olive oil' }).click()
    await page.getByLabel(/Extra-virgin olive oil/).fill('7.49')
    await page.getByRole('button', { name: 'Save price' }).click()
    await expect(total).toHaveText('$29.02')
    expect(kitchen.backend.table('price_overrides')).toMatchObject([{ ingredient_id: 'olive-oil', price_cents: 749 }])
    await page.getByRole('button', { name: 'Correct the price of Extra-virgin olive oil' }).click()
    await page.getByRole('button', { name: /Go back to the estimate/ }).click()
    await expect(total).toHaveText(SHEET_PAN_CHECKOUT)
    expect(kitchen.backend.table('price_overrides')).toEqual([])

    // Finish with two staples in the cart; the rest are not checked off.
    await page.getByRole('checkbox', { name: /Extra-virgin olive oil/ }).click()
    await expect(page.getByRole('checkbox', { name: /Extra-virgin olive oil/ })).toBeChecked()
    await page.getByRole('checkbox', { name: /Kosher salt/ }).click()
    await expect(page.getByRole('checkbox', { name: /Kosher salt/ })).toBeChecked()
    await expect(page.getByText('3 of 8 things in the cart.')).toBeVisible()
    const asked: string[] = []
    page.once('dialog', (dialog) => {
      asked.push(dialog.message())
      void dialog.accept()
    })
    await page.getByRole('button', { name: 'Done shopping' }).click()
    await expect(page.getByRole('status')).toHaveText(
      'Done shopping. Extra-virgin olive oil and Kosher salt went into your pantry.',
    )
    expect(asked).toEqual(['5 things are not checked off. Finish shopping anyway?'])
    expect(kitchen.backend.table('plan_items')).toEqual([])
    expect(kitchen.backend.table('grocery_checks')).toEqual([])
    expect(kitchen.backend.table('pantry_items').map((row) => row.ingredient_id).sort()).toEqual(['kosher-salt', 'olive-oil'])
    await expect(page.getByText('Nothing planned yet.')).toBeVisible()

    // Next week, the staples stay off the list.
    await page.goto('#/recipe/sheet-pan-sausage')
    await page.getByRole('button', { name: 'Add to this week' }).click()
    await page.getByRole('link', { name: 'this week’s list' }).click()
    await expect(page.getByText('Left off because your pantry has them: extra-virgin olive oil and kosher salt.')).toBeVisible()
    await expect(page.getByRole('checkbox', { name: /Kosher salt/ })).toHaveCount(0)
  })

  test('the pantry keeps a staple off the list until it is unticked', async ({ page, kitchen }) => {
    await kitchen.open('#/shop', { logs: [{ recipe: 'soft-scrambled-eggs', rating: 2 }], plan: ['grilled-cheese'], pantry: ['butter'] })
    await expect(page.getByRole('checkbox', { name: /Salted butter/ })).toHaveCount(0)
    await page.getByRole('link', { name: 'pantry' }).click()
    await expect(page.getByRole('checkbox', { name: /Salted butter/ })).toBeChecked()
    await page.getByRole('checkbox', { name: /Salted butter/ }).click()
    await expect(page.getByRole('checkbox', { name: /Salted butter/ })).not.toBeChecked()
    expect(kitchen.backend.table('pantry_items')).toEqual([])
    await page.goto('#/shop')
    await expect(page.getByRole('checkbox', { name: /Salted butter/ })).toBeVisible()
  })

  test('says what kit the plan still needs', async ({ page, kitchen }) => {
    await kitchen.open('#/shop', { plan: ['chopped-salad'], kit: ['chefs-knife', 'cutting-board', 'large-bowl'] })
    await expect(page.getByText('To cook these you also need: measuring spoons, small bowls, fork, and paper towels.')).toBeVisible()
  })

  test('a check that fails to save says why and stays unchecked', async ({ page, kitchen }) => {
    await kitchen.open('#/shop', { plan: ['chopped-salad'] })
    kitchen.backend.failNext('grocery_checks', 'POST', 'no signal in the store')
    await page.getByRole('checkbox', { name: /Lemon/ }).click()
    await expect(page.getByRole('alert')).toHaveText('Could not check it off: no signal in the store')
    await expect(page.getByRole('checkbox', { name: /Lemon/ })).not.toBeChecked()
  })

  test('a price must be a price', async ({ page, kitchen }) => {
    await kitchen.open('#/shop', { plan: ['chopped-salad'] })
    await page.getByRole('button', { name: 'Correct the price of Lemon' }).click()
    await page.getByLabel(/Lemon/).fill('a lot')
    await page.getByRole('button', { name: 'Save price' }).click()
    await expect(page.getByRole('alert')).toHaveText('Enter the price you paid, like 3.49.')
    expect(kitchen.backend.table('price_overrides')).toEqual([])
  })

  test('cancelling Done shopping keeps the plan and the checks', async ({ page, kitchen }) => {
    await kitchen.open('#/shop', { plan: ['chopped-salad'], checks: ['lemon'] })
    page.once('dialog', (dialog) => void dialog.dismiss())
    await page.getByRole('button', { name: 'Done shopping' }).click()
    await expect(page.getByRole('link', { name: 'Chopped salad with lemon vinaigrette' })).toBeVisible()
    expect(kitchen.backend.table('plan_items')).toHaveLength(1)
    expect(kitchen.backend.table('grocery_checks')).toHaveLength(1)
  })

  test('a corrected price changes what the recipe page says you keep', async ({ page, kitchen }) => {
    await kitchen.open('#/recipe/chopped-salad', { prices: { feta: 900 } })
    // Feta at $9.00 for 6 oz instead of $4.49. The salad uses 2 oz, so cooking it costs $1.51 more
    // ($8.02 instead of $6.51) and you keep $21.24 instead of $22.75.
    await expect(page.locator('.tab-kept mark')).toHaveText('$21.24')
  })
})
