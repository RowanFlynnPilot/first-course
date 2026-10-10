// Every recipe opens, and cook mode shows every one of its steps: its words,
// and its timer where it has one.

import { INGREDIENTS } from '../src/curriculum/ingredients'
import { RECIPES } from '../src/curriculum/recipes'
import { formatClock } from '../src/lib/format'
import type { SeedLog } from './fakeSupabase'
import { expect, test } from './kitchen'

// One good cook of every recipe, so everything is unlocked.
const EVERYTHING: readonly SeedLog[] = RECIPES.map((recipe) => ({ recipe: recipe.id, rating: 2 }))

for (const recipe of RECIPES) {
  const steps = recipe.content.steps.length
  const usesMeat = recipe.content.ingredients.some(({ ingredientId }) => INGREDIENTS[ingredientId].section === 'meat')
  test(`${recipe.title} opens, and cook mode shows each step`, async ({ page, kitchen }) => {
    await kitchen.open(`#/recipe/${recipe.id}`, { logs: EVERYTHING })
    await expect(page.getByRole('heading', { level: 1, name: recipe.title })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Start cooking' })).toBeVisible()

    await page.goto(`#/cook/${recipe.id}/0`)
    await expect(page.getByText('Before you start')).toBeVisible()
    // Step 0 says to get everything out, so it says when the meat is the exception.
    await expect(page.getByText('Leave the meat in the fridge until the step that uses it.')).toHaveCount(usesMeat ? 1 : 0)
    for (const [index, { text, timer, why }] of recipe.content.steps.entries()) {
      const step = index + 1
      await page.goto(`#/cook/${recipe.id}/${step}`)
      await expect(page.locator('.cook-count')).toHaveText(new RegExp(`^Step ${step} of ${steps}`))
      await expect(page.locator('h1.cook-text')).toHaveText(text)
      await expect(page.locator('.why')).toHaveCount(why === null ? 0 : 1)
      await expect(page.getByRole('button', { name: /^Start .* timer$/ })).toHaveText(timer === null ? [] : [`Start ${formatClock(timer.seconds)} timer`])
    }
    await expect(page.getByRole('link', { name: 'Finish and log it' })).toBeVisible()
  })
}
