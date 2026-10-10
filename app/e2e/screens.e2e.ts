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

test('forgot password, and the new password after the link', async ({ page, kitchen }) => {
  await kitchen.open('./', { signedIn: false })
  await page.getByRole('button', { name: 'Forgot your password?' }).click()
  await shoot(page, 'auth-reset')
  const hash = kitchen.backend.recoveryHash()
  // A new hash alone does not load the page again, so reload as the email link would.
  await page.goto(`./${hash}`)
  await page.reload()
  await page.getByRole('heading', { name: 'Set a new password' }).waitFor()
  await shoot(page, 'set-password')
})

test('sign-up with email confirmation on', async ({ page, kitchen }) => {
  await kitchen.open('./', { signedIn: false, confirmEmail: true })
  await page.getByRole('button', { name: 'New here? Create an account' }).click()
  await shoot(page, 'auth-create')
  await page.getByLabel('Email').fill('new-cook@example.test')
  await page.getByLabel('Password').fill('a long enough password')
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.getByText('Check your email to confirm the account, then sign in.').waitFor()
  await shoot(page, 'auth-confirm')
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
  await shoot(page, 'cook-timer-start')
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

test('fourth course: a recipe page and a frying step', async ({ page, kitchen }) => {
  await kitchen.open('#/recipe/pan-pizza', {
    logs: [
      { recipe: 'marinara-pasta', rating: 2 },
      { recipe: 'sheet-pan-sausage', rating: 2 },
      { recipe: 'seared-chicken-thighs', rating: 2 },
    ],
  })
  await shoot(page, 'recipe-pan-pizza')
  await page.goto('#/cook/chicken-cutlets/7')
  await shoot(page, 'cook-frying')
})

test('the usual: a recipe page and the ragù’s long simmer', async ({ page, kitchen }) => {
  const everything = RECIPES.filter((recipe) => recipe.tier < 5).map((recipe) => ({ recipe: recipe.id, rating: 2 as const }))
  await kitchen.open('#/recipe/double-smash-burger', { logs: everything })
  await shoot(page, 'recipe-usual')
  await page.goto('#/cook/ragu-bolognese/12')
  await page.getByRole('button', { name: /Start .* timer/ }).click()
  await shoot(page, 'cook-long-timer')
})

test('the three longest steps in the book', async ({ page, kitchen }) => {
  const steps = RECIPES.flatMap((recipe) =>
    recipe.content.steps.map((step, index) => ({ recipe: recipe.id, number: index + 1, length: step.text.length })),
  ).sort((a, b) => b.length - a.length)
  const everything = RECIPES.map((recipe) => ({ recipe: recipe.id, rating: 2 as const }))
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

test('this week, after shopping, with one recipe added since', async ({ page, kitchen }) => {
  await kitchen.open('#/shop', {
    logs: [{ recipe: 'chopped-salad', rating: 2 }, { recipe: 'soft-scrambled-eggs', rating: 2 }],
    plan: ['chopped-salad', 'sheet-pan-sausage', 'grilled-cheese'],
    shopped: ['chopped-salad', 'sheet-pan-sausage'],
    pantry: ['kosher-salt'],
    kit: ['chefs-knife', 'cutting-board'],
  })
  await shoot(page, 'shop-shopped')
})

test('pantry and kit', async ({ page, kitchen }) => {
  await kitchen.open('#/pantry', { pantry: ['kosher-salt', 'black-pepper', 'olive-oil'] })
  await shoot(page, 'pantry')
  await page.goto('#/kit')
  await shoot(page, 'kit')
})

test('spice guide', async ({ page, kitchen }) => {
  await kitchen.open('#/spices', { pantry: ['kosher-salt', 'black-pepper'] })
  await shoot(page, 'spices')
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
  // 280 XP: the sheet pan's cook crosses 300, level 3 and prep cook.
  await kitchen.open('#/cook/sheet-pan-sausage/log', {
    logs: [
      { recipe: 'chopped-salad', rating: 2 },
      { recipe: 'soft-scrambled-eggs', rating: 2 },
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
  await page.getByRole('heading', { name: 'How did it go?' }).waitFor()
  await shoot(page, 'log')
})

test('chef sheet', async ({ page, kitchen }) => {
  await kitchen.open('#/chef', COOKED)
  await shoot(page, 'chef')
})

test('character creator and extras', async ({ page, kitchen }) => {
  const burgers = Array.from({ length: 15 }, () => ({ recipe: 'smash-cheeseburger', rating: 2 as const }))
  const basics = Array.from({ length: 5 }, () => ({ recipe: 'chopped-salad', rating: 3 as const }))
  await kitchen.open('#/chef/edit', {
    logs: [...burgers, ...basics],
    chef: { name: 'Remy', skin: 3, hair: 6, hair_style: 2, facial_hair: 1, glasses: 1, extras: ['smash-spatula', 'red-clogs'] },
  })
  await shoot(page, 'chef-creator')
  await page.goto('#/chef')
  await shoot(page, 'chef-dressed')
  await page.goto('./')
  await shoot(page, 'menu-dressed')
})

test('edit chef', async ({ page, kitchen }) => {
  await kitchen.open('#/chef/edit', COOKED)
  await page.getByRole('heading', { name: 'Change your chef' }).waitFor()
  await shoot(page, 'edit-chef')
})

test('error', async ({ page, kitchen }) => {
  kitchen.expectErrorScreen()
  await kitchen.open('#/cook/grilled-cheese/0')
  await shoot(page, 'error')
})
