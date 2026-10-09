import type { Route } from '@playwright/test'
import { recipeById } from '../src/curriculum/recipes'
import { expect, FRESH, phoneChecks, rateAndSave, SALAD_DONE, test } from './kitchen'

/** Everything the salad uses: a cart with all of it checked off covers the salad. */
const SALAD = recipeById('chopped-salad').content.ingredients.map((line) => line.ingredientId)

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
    // The kit the plan still needs is on the list too, last.
    await expect(page.getByRole('heading', { level: 3 })).toHaveText(['Produce', 'Meat', 'Pantry', 'Kit'])
    const total = page.locator('.tab-kept dd')
    await expect(total).toHaveText(SHEET_PAN_CHECKOUT)

    // Check something off: kept on the phone, through a reload, with nothing sent.
    await page.getByRole('checkbox', { name: /smoked sausage/ }).click()
    await expect(page.getByRole('checkbox', { name: /smoked sausage/ })).toBeChecked()
    expect(await phoneChecks(page)).toEqual(['kielbasa'])
    await page.reload()
    await expect(page.getByRole('checkbox', { name: /smoked sausage/ })).toBeChecked()
    expect(kitchen.backend.table('grocery_checks')).toEqual([])

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
    await expect(page.getByText(/^Done shopping\./)).toHaveText(
      'Done shopping. Into your pantry: extra-virgin olive oil and kosher salt. Sheet-pan sausage and vegetables stays on the list for what you did not check off. Go to the menu to cook',
    )
    // The confirm names what was not bought, and that its recipe stays on the list.
    expect(asked).toHaveLength(1)
    expect(asked[0]).toMatch(/^Not checked off: .*red onion.*\. Sheet-pan sausage and vegetables stays on the list for them\. Finish shopping\?$/)
    // The staples went into the pantry, but the recipe is not bought: the store may have been out.
    expect(kitchen.backend.table('plan_items')).toMatchObject([{ recipe_id: 'sheet-pan-sausage', shopped: false }])
    expect(kitchen.backend.table('pantry_items').map((row) => row.ingredient_id).sort()).toEqual(['kosher-salt', 'olive-oil'])
    // The sausage stays checked off; the rest is still to buy.
    await expect(page.getByRole('checkbox', { name: /smoked sausage/ })).toBeChecked()
    expect(await phoneChecks(page)).toEqual(['kielbasa'])

    // Everything else, then Done shopping again: no question, and the recipe is bought.
    const unchecked = page.getByRole('checkbox', { checked: false })
    while ((await unchecked.count()) > 0) await unchecked.first().click()
    await page.getByRole('button', { name: 'Done shopping' }).click()
    await expect(page.getByText(/^Done shopping\./)).toHaveText('Done shopping. Into your pantry: black pepper. Go to the menu to cook')
    expect(asked).toHaveLength(1)
    expect(kitchen.backend.table('plan_items')).toMatchObject([{ recipe_id: 'sheet-pan-sausage', shopped: true }])
    expect(await phoneChecks(page)).toEqual([])
    await expect(page.getByText('Groceries bought')).toBeVisible()
    await expect(page.getByText(/^Everything on the plan is bought\./)).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(0)

    // Cooking it takes it off the plan.
    await page.getByRole('link', { name: 'Sheet-pan sausage and vegetables' }).click()
    await page.getByRole('link', { name: 'Log a cook' }).click()
    await rateAndSave(page, 'Decent')
    await expect(page.getByRole('link', { name: 'This week', exact: true })).toBeVisible()
    expect(kitchen.backend.table('plan_items')).toEqual([])

    // Next week, the staples stay off the list.
    await page.goto('#/recipe/sheet-pan-sausage')
    await page.getByRole('button', { name: 'Add to this week' }).click()
    await page.getByRole('link', { name: 'this week’s plan' }).click()
    await expect(page.getByText(/^Left off because your pantry has them\./)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Put it on the list: extra-virgin olive oil' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Put it on the list: kosher salt' })).toBeVisible()
    await expect(page.getByRole('checkbox', { name: /Kosher salt/ })).toHaveCount(0)
  })

  test('a recipe added after shopping gets a list of only what it needs', async ({ page, kitchen }) => {
    await kitchen.open('#/shop', {
      logs: [{ recipe: 'soft-scrambled-eggs', rating: 2 }],
      plan: ['chopped-salad', 'grilled-cheese'],
      shopped: ['chopped-salad'],
    })
    await expect(page.getByText('Groceries bought')).toHaveCount(1)
    await expect(page.getByRole('checkbox', { name: /Sharp cheddar/ })).toBeVisible()
    await expect(page.getByRole('checkbox', { name: /Lemon/ })).toHaveCount(0)
  })

  test('the menu suggests what is on this week’s plan first', async ({ page, kitchen }) => {
    await kitchen.open('./', { ...FRESH, plan: ['soft-scrambled-eggs'] })
    const tray = page.locator('.tray')
    await expect(tray.getByText('On this week’s plan')).toBeVisible()
    await expect(tray.getByRole('heading', { name: 'Soft scrambled eggs on toast' })).toBeVisible()
  })

  test('the menu suggests a planned recipe with its groceries bought before one without', async ({ page, kitchen }) => {
    await kitchen.open('./', { plan: ['soft-scrambled-eggs', 'chopped-salad'], shopped: ['chopped-salad'] })
    const tray = page.locator('.tray')
    await expect(tray.getByText('Groceries bought')).toBeVisible()
    await expect(tray.getByRole('heading', { name: 'Soft scrambled eggs on toast' })).toHaveCount(0)
    await expect(tray.getByRole('heading', { name: 'Chopped salad with lemon vinaigrette' })).toBeVisible()
  })

  test('ticks left from a shop that never finished do not carry into a new list', async ({ page, kitchen }) => {
    // Lemon was ticked for a salad since cooked, without "Done shopping".
    await kitchen.open('#/recipe/chopped-salad', { checks: ['lemon', 'feta'] })
    await page.getByRole('button', { name: 'Add to this week' }).click()
    await expect(page.getByRole('button', { name: 'Take off this week' })).toBeVisible()
    expect(await phoneChecks(page)).toEqual([])
    await page.getByRole('link', { name: 'this week’s plan' }).click()
    await expect(page.getByRole('checkbox', { name: /Lemon/ })).not.toBeChecked()
  })

  test('clearing old ticks leaves the ones the list still shows', async ({ page, kitchen }) => {
    // Butter is on the eggs' list; lemon is left from a salad since cooked.
    await kitchen.open('#/recipe/chopped-salad', { plan: ['soft-scrambled-eggs'], checks: ['butter', 'lemon'] })
    await page.getByRole('button', { name: 'Add to this week' }).click()
    await expect(page.getByRole('button', { name: 'Take off this week' })).toBeVisible()
    expect(await phoneChecks(page)).toEqual(['butter'])
  })

  test('with everything in the cart, the list says to finish', async ({ page, kitchen }) => {
    await kitchen.open('#/shop', {
      logs: [{ recipe: 'soft-scrambled-eggs', rating: 2 }],
      plan: ['grilled-cheese'],
      checks: ['butter', 'cheddar', 'sandwich-bread'],
    })
    await expect(page.getByText(/^Everything is in the cart\. Tap “Done shopping”/)).toBeVisible()
  })

  test('a recipe shopped for can go back on the list', async ({ page, kitchen }) => {
    await kitchen.open('#/shop', { plan: ['chopped-salad'], shopped: ['chopped-salad'] })
    await expect(page.getByRole('checkbox')).toHaveCount(0)
    await page.getByRole('button', { name: 'Put it back on the list' }).click()
    await expect(page.getByRole('checkbox', { name: /Lemon/ })).toBeVisible()
    await expect(page.getByText('Groceries bought')).toHaveCount(0)
    expect(kitchen.backend.table('plan_items')).toMatchObject([{ recipe_id: 'chopped-salad', shopped: false }])
  })

  test('a staple that ran out goes back on the list from This week', async ({ page, kitchen }) => {
    await kitchen.open('#/shop', { logs: [{ recipe: 'soft-scrambled-eggs', rating: 2 }], plan: ['grilled-cheese'], pantry: ['butter'] })
    await page.getByRole('button', { name: 'Put it on the list: salted butter' }).click()
    await expect(page.getByRole('checkbox', { name: /Salted butter/ })).toBeVisible()
    expect(kitchen.backend.table('pantry_items')).toEqual([])
  })

  test('a change that would lock a planned recipe says so', async ({ page, kitchen }) => {
    await kitchen.open('#/recipe/soft-scrambled-eggs', { logs: [{ recipe: 'soft-scrambled-eggs', rating: 2 }], plan: ['grilled-cheese'] })
    await page.getByRole('link', { name: /Change/ }).click()
    await expect(page.getByText(/Grilled cheese is on this week’s plan\./).first()).toBeVisible()
  })

  test('a planned recipe that is locked says which cooks open it', async ({ page, kitchen }) => {
    await kitchen.open('#/shop', { plan: ['grilled-cheese'] })
    await expect(page.locator('.plan-row').filter({ hasText: 'Grilled cheese' })).toContainText('Opens after you cook Soft scrambled eggs on toast')
  })

  test('planning ahead: a locked recipe goes on the plan once what opens it is planned', async ({ page, kitchen }) => {
    await kitchen.open('#/recipe/grilled-cheese', FRESH)
    // Locked, and nothing that opens it is planned: no way to plan it yet.
    await expect(page.getByRole('button', { name: 'Add to this week' })).toHaveCount(0)
    await page.goto('#/shop')
    await page.getByRole('button', { name: 'Add Soft scrambled eggs on toast to this week' }).click()
    // The eggs open it, so This week offers it now, saying what it waits for.
    const ahead = page.locator('.plan-row').filter({ hasText: 'Grilled cheese' })
    await expect(ahead).toContainText('Opens after you cook Soft scrambled eggs on toast')
    await page.getByRole('button', { name: 'Add Grilled cheese to this week' }).click()
    expect(kitchen.backend.table('plan_items').map((row) => row.recipe_id)).toEqual(['soft-scrambled-eggs', 'grilled-cheese'])
    // One list covers both: the bread and cheddar are on it.
    await expect(page.getByRole('checkbox', { name: /Sandwich bread/ })).toBeVisible()
    // Still locked: it cannot be cooked yet.
    await page.goto('#/cook/grilled-cheese/0')
    await expect(page.getByText(/Grilled cheese is locked/)).toBeVisible()
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

  test('puts the kit the plan still needs on the list, and a check puts it in the kit', async ({ page, kitchen }) => {
    await kitchen.open('#/shop', { plan: ['chopped-salad'], kit: ['chefs-knife', 'cutting-board', 'large-bowl'] })
    const kit = page.locator('.aisle').filter({ has: page.getByRole('heading', { name: 'Kit' }) })
    await expect(kit.locator('.row-title')).toHaveText(['Measuring spoons', 'Small bowls', 'Fork', 'Paper towels', 'Plastic wrap'])
    await kit.getByRole('checkbox', { name: /^Fork/ }).click()
    await expect(kit.getByRole('checkbox', { name: /^Fork/ })).toHaveCount(0)
    // Focus goes to the next line, not the top of the page.
    await expect(kit.getByRole('checkbox', { name: /^Paper towels/ })).toBeFocused()
    expect(kitchen.backend.table('kit_items').map((row) => row.equipment_id)).toContain('fork')
  })

  test('with the groceries bought, the plan still says what kit it needs', async ({ page, kitchen }) => {
    await kitchen.open('#/shop', { plan: ['chopped-salad'], shopped: ['chopped-salad'], kit: ['chefs-knife', 'cutting-board', 'large-bowl'] })
    await expect(page.getByText('To cook these you also need: measuring spoons, small bowls, fork, paper towels, and plastic wrap.')).toBeVisible()
  })

  test('with no signal, checks still work, and a failed Done shopping keeps them', async ({ page, kitchen }) => {
    await kitchen.open('#/shop', { plan: ['chopped-salad'] })
    await expect(page.getByRole('checkbox', { name: /Lemon/ })).toBeVisible()
    // The store has no signal: every request fails from here (this route goes ahead of the fake's).
    const offline = (route: Route) => route.abort('internetdisconnected')
    await page.route('https://e2e.supabase.test/**', offline)
    // The groceries: a check of one is on the phone. (A kit line is a write to the kit, which needs signal.)
    const groceries = page.locator('.aisle').filter({ hasNot: page.getByRole('heading', { name: 'Kit' }) })
    for (const box of await groceries.getByRole('checkbox').all()) await box.click()
    await expect(groceries.getByRole('checkbox', { checked: false })).toHaveCount(0)
    await page.getByRole('button', { name: 'Done shopping' }).click()
    await expect(page.getByRole('alert')).toHaveText(
      'Could not finish shopping: No connection. Check your signal and try again. Your checks are kept on this phone.',
    )
    expect(await phoneChecks(page)).toEqual(SALAD.toSorted())
    // Signal again: the same tap finishes it.
    await page.unroute('https://e2e.supabase.test/**', offline)
    await page.getByRole('button', { name: 'Done shopping' }).click()
    await expect(page.getByText(/^Done shopping\./)).toBeVisible()
    expect(kitchen.backend.table('plan_items')).toMatchObject([{ recipe_id: 'chopped-salad', shopped: true }])
  })

  test('shares what is still to buy as text', async ({ page, kitchen }) => {
    // The share sheet is the phone's; here it records what it was handed.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        value: (data: ShareData) => {
          sessionStorage.setItem('shared', JSON.stringify(data))
          return Promise.resolve()
        },
      })
    })
    await kitchen.open('#/shop', { plan: ['grilled-cheese'], checks: ['sandwich-bread'] })
    await page.getByRole('button', { name: 'Share the list' }).click()
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('shared'))).not.toBeNull()
    const shared = JSON.parse((await page.evaluate(() => sessionStorage.getItem('shared'))) ?? '{}') as ShareData
    expect(shared.title).toBe('Grocery list')
    expect(shared.text).toContain('Grocery list for Grilled cheese\n\nDairy and eggs\n- ')
    // Already in the cart, so not on the shared list.
    expect(shared.text).not.toContain('bread')
  })

  test('closing the share sheet is not an error', async ({ page, kitchen }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        value: () => Promise.reject(new DOMException('Share canceled', 'AbortError')),
      })
    })
    await kitchen.open('#/shop', { plan: ['grilled-cheese'] })
    await page.getByRole('button', { name: 'Share the list' }).click()
    await expect(page.getByRole('button', { name: 'Share the list' })).toBeEnabled()
    await expect(page.getByRole('alert')).toHaveCount(0)
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
    // Since 00006 the plan keeps its row either way: what Done shopping would change is "shopped".
    expect(kitchen.backend.table('plan_items')).toMatchObject([{ recipe_id: 'chopped-salad', shopped: false }])
    expect(await phoneChecks(page)).toEqual(['lemon'])
  })

  test('a corrected price changes what the recipe page says you keep', async ({ page, kitchen }) => {
    await kitchen.open('#/recipe/chopped-salad', { prices: { feta: 900 } })
    // Feta at $9.00 for a 4 oz tub instead of $3.49. The salad uses the whole tub, so cooking two
    // servings costs $5.51 more, and you keep $11.25 instead of $16.76.
    await expect(page.locator('.tab-kept mark')).toHaveText('$11.25')
  })

  test('a staple already at home goes to the pantry from the list', async ({ page, kitchen }) => {
    await kitchen.open('#/shop', { ...SALAD_DONE, plan: ['sheet-pan-sausage'] })
    // The line after it in the list, by the order the list shows, once the list is on screen.
    await expect(page.getByRole('checkbox', { name: /Kosher salt/ })).toBeVisible()
    const groceries = page.locator('.aisle').filter({ hasNot: page.getByRole('heading', { name: 'Kit' }) })
    const boxes = groceries.locator('.checks-cart input[type=checkbox]')
    const names = await groceries.locator('.checks-cart .check-label .row-title').allTextContents()
    const after = names[names.indexOf('Kosher salt') + 1] ?? names[names.indexOf('Kosher salt') - 1]
    expect(await boxes.count()).toBe(names.length)
    await page.getByRole('button', { name: 'Have it: kosher salt' }).click()
    await expect(page.getByRole('checkbox', { name: /Kosher salt/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Put it on the list: kosher salt' })).toBeVisible()
    expect(kitchen.backend.table('pantry_items')).toMatchObject([{ ingredient_id: 'kosher-salt' }])
    // Focus moves to the neighbouring line, not the top of a long list.
    await expect(page.getByRole('checkbox', { name: new RegExp(`^${after}`) })).toBeFocused()
    // And back on the list, the salt's own box takes it.
    await page.getByRole('button', { name: 'Put it on the list: kosher salt' }).click()
    await expect(page.getByRole('checkbox', { name: /^Kosher salt/ })).toBeFocused()
  })

  test('in the store the list comes first, and This week offers recipes to add', async ({ page, kitchen }) => {
    await kitchen.open('#/shop', { plan: ['chopped-salad'] })
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Grocery list', 'The plan', 'Ready to cook'])
    await page.getByRole('button', { name: 'Add Soft scrambled eggs on toast to this week' }).click()
    await expect(page.getByRole('link', { name: 'Soft scrambled eggs on toast' }).first()).toBeVisible()
    expect(kitchen.backend.table('plan_items').map((row) => row.recipe_id)).toEqual(['chopped-salad', 'soft-scrambled-eggs'])
  })

  test('the menu puts its suggestion on this week in one tap', async ({ page, kitchen }) => {
    await kitchen.open('./', FRESH)
    const tray = page.locator('.tray')
    await tray.getByRole('button', { name: 'Add to this week' }).click()
    await expect(tray.getByText('On this week’s plan')).toBeVisible()
    await expect(tray.getByRole('button', { name: 'Add to this week' })).toHaveCount(0)
    expect(kitchen.backend.table('plan_items')).toMatchObject([{ recipe_id: 'soft-scrambled-eggs' }])
  })

  test('Done shopping leaves alone what another device added meanwhile', async ({ page, kitchen }) => {
    await kitchen.open('#/shop', { plan: ['chopped-salad'], checks: SALAD })
    await expect(page.getByRole('checkbox', { name: /Lemon/ })).toBeChecked()
    // The laptop plans the eggs after the phone loaded its list.
    kitchen.backend.writeElsewhere('plan_items', { recipe_id: 'soft-scrambled-eggs', shopped: false })
    await page.getByRole('button', { name: 'Done shopping' }).click()
    await expect(page.getByText(/^Done shopping\./)).toBeVisible()
    const plan = Object.fromEntries(kitchen.backend.table('plan_items').map((row) => [row.recipe_id, row.shopped]))
    expect(plan).toEqual({ 'chopped-salad': true, 'soft-scrambled-eggs': false })
  })
})
