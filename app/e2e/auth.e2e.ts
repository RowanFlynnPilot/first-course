import { EMAIL, expect, PASSWORD, test } from './kitchen'

test.describe('signing in and creating a chef', () => {
  test('signs in, creates a chef, and lands on the menu as a level 1 dishwasher', async ({ page, kitchen }) => {
    await kitchen.open('./', { signedIn: false, chef: null })

    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByRole('heading', { name: 'Create your chef' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create chef' })).toBeDisabled()
    await page.getByLabel('Chef’s name').fill('  Remy  ')
    await page.getByRole('radio', { name: 'Tone 4' }).check()
    await page.getByRole('radio', { name: 'Red' }).check()
    await page.getByRole('button', { name: 'Create chef' }).click()

    await expect(page.getByRole('link', { name: /Remy/ })).toContainText('Level 1 dishwasher')
    await expect(page.getByRole('img', { name: 'Your chef, a dishwasher' })).toBeVisible()
    await expect(page.getByText('Cook this next')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Chopped salad with lemon vinaigrette' })).toBeVisible()
    expect(kitchen.backend.table('chefs')).toMatchObject([{ name: 'Remy', skin: 3, hair: 3 }])
  })

  test('says so when the password is wrong', async ({ page, kitchen }) => {
    await kitchen.open('./', { signedIn: false })
    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Password').fill('not the password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toHaveText('Invalid login credentials')
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  })

  test('creates an account and goes straight to creating a chef', async ({ page, kitchen }) => {
    await kitchen.open('./', { signedIn: false })
    await expect(page.getByRole('button', { name: 'Create account' })).toBeDisabled()
    await page.getByLabel('Email').fill('new-cook@example.test')
    await page.getByLabel('Password').fill('a long enough password')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByRole('heading', { name: 'Create your chef' })).toBeVisible()
  })

  test('signs out and stays signed out after a reload', async ({ page, kitchen }) => {
    await kitchen.open('./')
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('keeps everything after signing out and back in', async ({ page, kitchen }) => {
    await kitchen.open('./', { logs: [{ recipe: 'chopped-salad', rating: 2 }] })
    await expect(page.getByText('$22.75')).toBeVisible()
    await page.getByRole('button', { name: 'Sign out' }).click()
    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('link', { name: /Remy/ })).toContainText('Level 2 dishwasher')
    await expect(page.getByText('$22.75')).toBeVisible()
  })
})
