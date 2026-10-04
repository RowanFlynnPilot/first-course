// Every recipe opens, and cook mode shows every one of its steps.

import { INGREDIENTS } from '../src/curriculum/ingredients'
import { RECIPES } from '../src/curriculum/recipes'
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
    for (let step = 1; step <= steps; step += 1) {
      await page.goto(`#/cook/${recipe.id}/${step}`)
      await expect(page.getByText(`Step ${step} of ${steps}`)).toBeVisible()
    }
    await expect(page.getByRole('link', { name: 'Finish and log it' })).toBeVisible()
  })
}
