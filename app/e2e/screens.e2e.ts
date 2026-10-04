// Not a test: a screenshot of every screen at phone size, for looking at.
// Run with `npm run screens`; the pictures land in app/screens/.

import type { Page } from '@playwright/test'
import { RECIPES } from '../src/curriculum/recipes'
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

test('the three longest steps in the book', async ({ page, kitchen }) => {
  const steps = RECIPES.flatMap((recipe) =>
    (recipe.content?.steps ?? []).map((step, index) => ({ recipe: recipe.id, number: index + 1, length: step.text.length })),
  ).sort((a, b) => b.length - a.length)
  const everything = RECIPES.filter((recipe) => recipe.content !== null).map((recipe) => ({ recipe: recipe.id, rating: 2 as const }))
  await kitchen.open('./', { logs: everything })
  for (const [rank, step] of steps.slice(0, 3).entries()) {
    await page.goto(`#/cook/${step.recipe}/${step.number}`)
    await shoot(page, `longest-step-${rank + 1}`)
  }
})

test('this week', async ({ page, kitchen }) => {
  await kitchen.open('#/shop', {
    logs: [{ recipe: 'chopped-salad', rating: 2 }],
    plan: ['chopped-salad', 'sheet-pan-sausage'],
    pantry: ['kosher-salt'],
    checks: ['lemon', 'tomato'],
    prices: { feta: 499 },
    kit: ['chefs-knife', 'cutting-board'],
  })
  await shoot(page, 'shop')
  await page.getByRole('button', { name: 'Correct the price of Feta' }).click()
  await shoot(page, 'shop-price')
})

test('pantry and kit', async ({ page, kitchen }) => {
  await kitchen.open('#/pantry', { pantry: ['kosher-salt', 'black-pepper', 'olive-oil'] })
  await shoot(page, 'pantry')
  await page.goto('#/kit')
  await shoot(page, 'kit')
})

test('change a cook', async ({ page, kitchen }) => {
  await kitchen.open('#/recipe/chopped-salad', { logs: [{ recipe: 'chopped-salad', rating: 2, notes: 'Too much onion.' }] })
  await page.getByRole('link', { name: /Decent/ }).click()
  await page.getByRole('radio', { name: /^Rough/ }).check()
  await shoot(page, 'edit-cook')
})

test('cook mode after a reload with a timer running', async ({ page, kitchen }) => {
  await kitchen.open('#/cook/sheet-pan-sausage/3', SALAD_DONE)
  await page.getByRole('button', { name: /Start .* timer/ }).click()
  await page.goto('#/cook/sheet-pan-sausage/4')
  await page.reload()
  await page.getByText('The page reloaded.').waitFor()
  await shoot(page, 'cook-reloaded')
})

test('the moments after a cook: promotion, the usual, badges', async ({ page, kitchen }) => {
  await kitchen.open('#/cook/sheet-pan-sausage/log', {
    logs: [
      { recipe: 'chopped-salad', rating: 2 },
      { recipe: 'soft-scrambled-eggs', rating: 2 },
      { recipe: 'grilled-cheese', rating: 2 },
    ],
  })
  await rateAndSave(page, 'Nailed it')
  await page.getByRole('dialog').waitFor()
  await shoot(page, 'beat-promotion')
  await page.getByRole('button', { name: 'Back to the menu' }).click()
  await page.waitForTimeout(1200)
  await shoot(page, 'menu-after-promotion')
})

test('a dish of the usual in reach', async ({ page, kitchen }) => {
  await kitchen.open('#/cook/oven-fries-aioli/log', {
    logs: [
      { recipe: 'chopped-salad', rating: 2 },
      { recipe: 'sheet-pan-sausage', rating: 2 },
      { recipe: 'smash-cheeseburger', rating: 2 },
      { recipe: 'onion-melt', rating: 2 },
    ],
  })
  await rateAndSave(page, 'Decent')
  await page.getByRole('dialog').waitFor()
  await shoot(page, 'beat-usual')
})

test('chef sheet with badges', async ({ page, kitchen }) => {
  await kitchen.open('#/chef', {
    logs: [
      { recipe: 'chopped-salad', rating: 2, cookedOn: '2026-09-15' },
      { recipe: 'chopped-salad', rating: 2, cookedOn: '2026-09-22' },
      { recipe: 'chopped-salad', rating: 3, cookedOn: '2026-09-30' },
      { recipe: 'soft-scrambled-eggs', rating: 2, cookedOn: '2026-10-01' },
    ],
  })
  await page.getByRole('heading', { name: 'Badges' }).scrollIntoViewIfNeeded()
  await shoot(page, 'chef-badges')
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
