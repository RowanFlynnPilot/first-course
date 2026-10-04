// Every written recipe opens, and cook mode shows every one of its steps.

import { RECIPES } from '../src/curriculum/recipes'
import type { SeedLog } from './fakeSupabase'
import { expect, test } from './kitchen'

const written = RECIPES.flatMap((recipe) => (recipe.content === null ? [] : [{ recipe, steps: recipe.content.steps.length }]))

// One good cook of every written recipe, so everything written is unlocked.
const EVERYTHING: readonly SeedLog[] = written.map(({ recipe }) => ({ recipe: recipe.id, rating: 2 }))

test('every written recipe opens, and cook mode shows each step', async ({ page, kitchen }) => {
  await kitchen.open('./', { logs: EVERYTHING })
  await expect(page.getByText('Cook this again')).toBeVisible()

  for (const { recipe, steps } of written) {
    await page.goto(`#/recipe/${recipe.id}`)
    await expect(page.getByRole('heading', { level: 1, name: recipe.title })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Start cooking' })).toBeVisible()

    await page.goto(`#/cook/${recipe.id}/0`)
    await expect(page.getByText('Before you start')).toBeVisible()
    for (let step = 1; step <= steps; step += 1) {
      await page.goto(`#/cook/${recipe.id}/${step}`)
      await expect(page.getByText(`Step ${step} of ${steps}`)).toBeVisible()
    }
    await expect(page.getByRole('link', { name: 'Finish and log it' })).toBeVisible()
  }
})
