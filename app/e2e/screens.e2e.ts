// Not a test: a screenshot of every screen at phone size, for looking at.
// Run with `npm run screens`; the pictures land in app/screens/.

import type { Page } from '@playwright/test'
import type { Seed } from './fakeSupabase'
import { rateAndSave, SALAD_DONE, test } from './kitchen'

// What the phone shows (390x844), and the whole page.
async function shoot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `screens/${name}.png`, scale: 'css', animations: 'disabled' })
  await page.screenshot({ path: `screens/${name}-full.png`, fullPage: true, scale: 'css', animations: 'disabled' })
}

const COOKED: Seed = {
  logs: [
    { recipe: 'chopped-salad', rating: 2 },
    { recipe: 'soft-scrambled-eggs', rating: 3 },
    { recipe: 'grilled-cheese', rating: 1 },
  ],
}

test('sign in', async ({ page, kitchen }) => {
  await kitchen.open('./', { signedIn: false })
  await shoot(page, 'auth')
})

test('create your chef', async ({ page, kitchen }) => {
  await kitchen.open('./', { chef: null })
  await page.getByLabel('Chef’s name').fill('Remy')
  await shoot(page, 'name-chef')
})

test('menu, fresh', async ({ page, kitchen }) => {
  await kitchen.open('./')
  await shoot(page, 'menu-fresh')
})

test('menu, after a cook', async ({ page, kitchen }) => {
  await kitchen.open('#/cook/sheet-pan-sausage/log', COOKED)
  await rateAndSave(page, 'Decent')
  await page.waitForTimeout(1500)
  await shoot(page, 'menu-after-cook')
})

test('recipe', async ({ page, kitchen }) => {
  await kitchen.open('#/recipe/sheet-pan-sausage', SALAD_DONE)
  await shoot(page, 'recipe')
})

test('cook mode', async ({ page, kitchen }) => {
  await kitchen.open('#/cook/sheet-pan-sausage/0', SALAD_DONE)
  await shoot(page, 'cook-0')
  await page.goto('#/cook/sheet-pan-sausage/3')
  await page.getByRole('button', { name: /Start .* timer/ }).click()
  await shoot(page, 'cook-timer')
  await page.goto('#/cook/sheet-pan-sausage/4')
  await shoot(page, 'cook-strip')
})

test('third course: recipe page and its longest step', async ({ page, kitchen }) => {
  await kitchen.open('#/recipe/chicken-pan-sauce', { logs: [{ recipe: 'seared-chicken-thighs', rating: 2 }] })
  await shoot(page, 'recipe-pan-sauce')
  await page.goto('#/cook/chicken-pan-sauce/4')
  await shoot(page, 'cook-long-step')
})

test('log', async ({ page, kitchen }) => {
  await kitchen.open('#/cook/chopped-salad/log')
  await shoot(page, 'log')
})

test('chef sheet', async ({ page, kitchen }) => {
  await kitchen.open('#/chef', COOKED)
  await shoot(page, 'chef')
})

test('edit chef', async ({ page, kitchen }) => {
  await kitchen.open('#/chef/edit', COOKED)
  await shoot(page, 'edit-chef')
})

test('error', async ({ page, kitchen }) => {
  kitchen.expectErrorScreen()
  await kitchen.open('#/cook/grilled-cheese/0')
  await shoot(page, 'error')
})
