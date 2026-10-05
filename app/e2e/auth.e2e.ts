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
    await page.getByRole('radio', { name: 'Red', exact: true }).check()
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

  test('with email confirmation on, as on the live site, sign-up says to check email', async ({ page, kitchen }) => {
    await kitchen.open('./', { signedIn: false, confirmEmail: true })
    await page.getByLabel('Email').fill('new-cook@example.test')
    await page.getByLabel('Password').fill('a long enough password')
    await page.getByRole('button', { name: 'Create account' }).click()
    // Good news, so a plain notice, not an error.
    await expect(page.getByRole('status')).toHaveText('Check your email to confirm the account, then sign in.')
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('signs out and stays signed out after a reload', async ({ page, kitchen }) => {
    await kitchen.open('./')
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('sends a password reset link, without saying whether the email has an account', async ({ page, kitchen }) => {
    await kitchen.open('./', { signedIn: false })
    await page.getByRole('button', { name: 'Forgot your password?' }).click()
    await expect(page.getByLabel('Password')).toHaveCount(0)
    await page.getByLabel('Email').fill(EMAIL)
    await page.getByRole('button', { name: 'Send the link' }).click()
    await expect(page.getByRole('status')).toHaveText('If there is an account for that email, the link is on its way.')
    expect(kitchen.backend.resetRequests).toEqual([EMAIL])
    await page.getByRole('button', { name: 'Back to sign in' }).click()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('the reset link asks for a new password first, and the new one signs in', async ({ page, kitchen }) => {
    const hash = kitchen.backend.recoveryHash()
    await kitchen.open(`./${hash}`, { signedIn: false })
    await expect(page.getByRole('heading', { name: 'Set a new password' })).toBeVisible()
    await expect(page).toHaveTitle('Set a new password · First Course')
    // The client took the tokens out of the address.
    expect(new URL(page.url()).hash).toBe('')
    await expect(page.getByRole('button', { name: 'Save new password' })).toBeDisabled()
    await page.getByLabel('New password').fill('a brand new password')
    await page.getByRole('button', { name: 'Save new password' }).click()
    await expect(page.getByRole('status')).toHaveText('Saved.')
    await page.getByRole('button', { name: 'Go to the menu' }).click()
    await expect(page.getByText('Cook this next')).toBeVisible()

    await page.getByRole('button', { name: 'Sign out' }).click()
    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Password').fill('a brand new password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Cook this next')).toBeVisible()
  })

  test('an expired email link says so, and signing in still reaches the menu', async ({ page, kitchen }) => {
    await kitchen.open('./#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired', {
      signedIn: false,
    })
    await expect(page.getByRole('alert')).toHaveText('Email link is invalid or has expired')
    // Left in the address, the router would take the error for a page.
    expect(new URL(page.url()).hash).toBe('')
    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Cook this next')).toBeVisible()
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
