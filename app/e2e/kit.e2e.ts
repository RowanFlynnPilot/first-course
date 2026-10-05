import { expect, FRESH, test } from './kitchen'

// Everything the First course uses.
const FIRST_COURSE_KIT = [
  'chefs-knife',
  'cutting-board',
  'butter-knife',
  'grater',
  'small-nonstick-skillet',
  'large-skillet',
  'skillet-lid',
  'small-saucepan',
  'large-pot',
  'sheet-pan',
  'tongs',
  'spatula',
  'silicone-spatula',
  'colander',
  'strainer',
  'measuring-spoons',
  'measuring-cups',
  'oven-mitts',
  'toaster',
  'large-bowl',
  'small-bowl',
  'mug',
  'fork',
  'paper-towels',
]

test.describe('the kit', () => {
  test('ticking what you own saves it and clears it from the recipes', async ({ page, kitchen }) => {
    await kitchen.open('#/recipe/chopped-salad', FRESH)
    const equipment = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Equipment' }) })
    await expect(equipment.getByText('Not in your kit yet')).toHaveCount(7)

    await page.getByRole('link', { name: 'Your kit' }).click()
    await expect(page.getByRole('heading', { name: 'Your kit' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2 })).toHaveText([
      'To start',
      'New for the second course',
      'New for the third course',
      'New for the fourth course',
    ])
    await page.getByRole('checkbox', { name: /Chef’s knife/ }).click()
    await expect(page.getByRole('checkbox', { name: /Chef’s knife/ })).toBeChecked()
    expect(kitchen.backend.table('kit_items')).toMatchObject([{ equipment_id: 'chefs-knife' }])

    await page.goBack()
    await expect(equipment.getByText('Not in your kit yet')).toHaveCount(6)
  })

  test('the menu says how much kit each course still needs', async ({ page, kitchen }) => {
    await kitchen.open('./', { kit: FIRST_COURSE_KIT })
    const course = (name: string) => page.locator('section').filter({ has: page.getByRole('heading', { name }) })
    await expect(course('First course').getByRole('link', { name: /Kit:/ })).toHaveCount(0)
    await expect(course('Second course').getByRole('link', { name: /Kit:/ })).toHaveText('Kit: 7 new things to get')
    // The same count the kit screen gives under “New for the fourth course”.
    await expect(course('Fourth course').getByRole('link', { name: /Kit:/ })).toHaveText('Kit: 5 new things to get')
  })

  test('a stainless or cast-iron skillet counts as a 12-inch skillet', async ({ page, kitchen }) => {
    await kitchen.open('#/kit', { kit: ['steel-skillet'] })
    const large = page.getByRole('listitem').filter({ hasText: /^Large skillet, 12 inch(?!,)/ })
    await expect(large).toContainText('Something else in your kit does this job.')
    await expect(large.getByRole('checkbox')).not.toBeChecked()
  })

  test('cook mode lists the equipment and marks what is missing', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/chopped-salad/0', { kit: ['chefs-knife', 'cutting-board', 'large-bowl', 'fork'] })
    await expect(page.getByText('Measuring spoons')).toBeVisible()
    await expect(page.getByText('Not in your kit yet')).toHaveCount(3)
  })
})
