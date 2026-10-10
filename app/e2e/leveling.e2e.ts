import type { SeedLog } from './fakeSupabase'
import { cookNotice, expect, noticeLines, rateAndSave, test } from './kitchen'

// 280 XP: one more good cook of the sheet pan (+100) crosses 300, level 3, prep cook.
const ALMOST_PREP_COOK: readonly SeedLog[] = [
  { recipe: 'chopped-salad', rating: 2 },
  { recipe: 'soft-scrambled-eggs', rating: 2 },
]

// Everything the double smash burger needs except whisking an emulsion, which the oven fries teach.
const ALMOST_DOUBLE_SMASH: readonly SeedLog[] = [
  { recipe: 'chopped-salad', rating: 2 },
  { recipe: 'sheet-pan-sausage', rating: 2 },
  { recipe: 'smash-cheeseburger', rating: 2 },
  { recipe: 'onion-melt', rating: 2 },
]

test.describe('leveling up', () => {
  test('a promotion takes the whole screen, then the menu', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/sheet-pan-sausage/log', { logs: ALMOST_PREP_COOK })
    await rateAndSave(page, 'Decent')

    const beat = page.getByRole('dialog', { name: 'Remy is promoted to prep cook' })
    await expect(beat).toBeVisible()
    await expect(beat.getByRole('img', { name: 'Your chef: prep cook' })).toBeVisible()
    await expect(beat).toContainText('A skull cap and a cobalt apron.')
    await expect(beat).toContainText('Next: line cook at level 6.')
    await expect(beat.getByRole('button', { name: 'Back to the menu' })).toBeFocused()
    // The menu behind is inert: Tab cannot reach it, so focus stays in the moment.
    await expect(page.locator('main.page')).toHaveAttribute('inert', '')
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.closest('main.page') === null)).toBe(true)

    await beat.getByRole('button', { name: 'Back to the menu' }).click()
    await expect(beat).toHaveCount(0)
    await expect(page.locator('main.page')).not.toHaveAttribute('inert')
    await expect(noticeLines(page).nth(1)).toHaveText('Remy is promoted to prep cook.')
    await expect(page.locator('.chef-card-levelup')).toContainText('Level 3 prep cook')
  })

  test('zoomed far in, the moment fits the screen, its way on included', async ({ page, kitchen }) => {
    await page.setViewportSize({ width: 195, height: 422 })
    await kitchen.open('#/cook/sheet-pan-sausage/log', { logs: ALMOST_PREP_COOK })
    await rateAndSave(page, 'Decent')
    const beat = page.getByRole('dialog', { name: 'Remy is promoted to prep cook' })
    await expect(beat).toBeVisible()
    const fits = await beat.evaluate((element) => element.scrollWidth <= element.clientWidth)
    expect(fits).toBe(true)
    await beat.getByRole('button', { name: 'Back to the menu' }).scrollIntoViewIfNeeded()
    await expect(beat.getByRole('button', { name: 'Back to the menu' })).toBeInViewport()
  })

  test('Escape also closes the moment', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/sheet-pan-sausage/log', { logs: ALMOST_PREP_COOK })
    await rateAndSave(page, 'Decent')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('a level-up without a promotion is a smaller beat on the chef card', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/chopped-salad/log', {})
    await rateAndSave(page, 'Decent')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('.chef-card-levelup')).toContainText('Level 2 dishwasher')
  })

  test('a dish of the usual coming into reach is its own moment', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/oven-fries-aioli/log', { logs: ALMOST_DOUBLE_SMASH })
    await rateAndSave(page, 'Decent')

    const beat = page.getByRole('dialog', { name: 'Double smash burger with oven fries is in reach' })
    await expect(beat).toBeVisible()
    await expect(beat).toContainText('Next time you would order it, cook it instead.')
    await beat.getByRole('button', { name: 'Back to the menu' }).click()
    // Behind the moment the menu is hidden from assistive tech, so the notice is read only now.
    await expect(noticeLines(page).first()).toHaveText(/^Oven fries with garlic aioli: Decent\./)
    await expect(cookNotice(page)).not.toContainText('Double smash burger with oven fries')
    await expect(page.getByRole('link', { name: /Double smash burger/ })).toContainText('In reach. Cook it any time')
  })
})

test.describe('badges', () => {
  test('the after-cook notice shows the badges a cook earned', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/chopped-salad/log', {})
    await rateAndSave(page, 'Nailed it')
    const notice = cookNotice(page)
    await expect(notice.getByRole('img', { name: 'First cook badge' })).toBeVisible()
    await expect(notice.getByRole('img', { name: 'Nailed it badge' })).toBeVisible()
    // The art carries each badge's name, so the lines do not repeat it.
    await expect(noticeLines(page)).not.toContainText(['First cook'])
  })

  test('the chef sheet shows every badge, earned or not', async ({ page, kitchen }) => {
    await kitchen.open('#/chef', { logs: [{ recipe: 'chopped-salad', rating: 3 }] })
    await expect(page.locator('.record')).toContainText('2 of 31')
    await expect(page.getByRole('img', { name: 'First cook badge' })).toBeVisible()
    await expect(page.getByRole('img', { name: 'Mastered badge, not earned yet', exact: true })).toBeVisible()
    await expect(page.locator('.badge-earned')).toHaveCount(2)
    await expect(page.locator('.badge')).toHaveCount(31)
    await expect(page.getByRole('img', { name: 'First course mastered badge, not earned yet' })).toBeVisible()
    await expect(page.getByRole('img', { name: 'The usual mastered badge, not earned yet' })).toBeVisible()
  })
})

test.describe('the cooking streak', () => {
  // Saturday, October 3, 2026.
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-03T12:00:00-05:00') })
  })

  test('counts weeks in a row on the menu and the chef sheet', async ({ page, kitchen }) => {
    await kitchen.open('./', {
      logs: [
        { recipe: 'chopped-salad', rating: 2, cookedOn: '2026-09-15' },
        { recipe: 'chopped-salad', rating: 2, cookedOn: '2026-09-22' },
        { recipe: 'chopped-salad', rating: 2, cookedOn: '2026-09-30' },
      ],
    })
    await expect(page.getByRole('link', { name: /Remy/ })).toContainText('3-week cooking streak')
    await page.getByRole('link', { name: /Remy/ }).click()
    await expect(page.locator('.record')).toContainText('3 weeks')
    await expect(page.getByText('You have cooked this week. Longest: 3 weeks.')).toBeVisible()
  })

  test('asks for a cook this week to keep it going', async ({ page, kitchen }) => {
    await kitchen.open('./', {
      logs: [
        { recipe: 'chopped-salad', rating: 2, cookedOn: '2026-09-15' },
        { recipe: 'chopped-salad', rating: 2, cookedOn: '2026-09-22' },
      ],
    })
    await expect(page.getByRole('link', { name: /Remy/ })).toContainText(
      '2-week cooking streak. Cook this week to keep it.',
    )
  })

  test('says nothing when there is no streak', async ({ page, kitchen }) => {
    await kitchen.open('./', { logs: [{ recipe: 'chopped-salad', rating: 2, cookedOn: '2026-09-01' }] })
    await expect(page.getByRole('link', { name: /Remy/ })).not.toContainText('streak')
  })
})

test.describe('motion', () => {
  test('the chef idles in two frames', async ({ page, kitchen }) => {
    await kitchen.open('./', {})
    const dip = page.locator('.chef-card .pixel-frame-1')
    await expect(dip).toHaveCSS('animation-name', 'frame-dip')
  })

  test('reduced motion keeps the chef still and the moments plain', async ({ page, kitchen }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await kitchen.open('#/cook/sheet-pan-sausage/log', { logs: ALMOST_PREP_COOK })
    await rateAndSave(page, 'Decent')
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.locator('.beat')).toHaveCSS('animation-name', 'none')
    await expect(page.locator('.beat .pixel-frame-1')).toHaveCSS('display', 'none')
    await page.getByRole('button', { name: 'Back to the menu' }).click()
    await expect(page.locator('.chef-card .sprite')).toHaveCSS('animation-name', 'none')
  })
})
