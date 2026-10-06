import { EMAIL, expect, FRESH, PASSWORD, test } from './kitchen'

test.describe('signing in and creating a chef', () => {
  test('signs in, creates a chef, and lands on the menu as a level 1 dishwasher', async ({ page, kitchen }) => {
    await kitchen.open('./', { signedIn: false, chef: null })

    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByRole('heading', { name: 'Create your chef' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create chef' })).toBeDisabled()
    // Nothing is earned yet, so the extras are one line, not eight locked ones.
    await expect(page.getByText(/^Extras, like clogs or a tool in hand, are earned by cooking\./)).toBeVisible()
    await expect(page.getByRole('group', { name: 'In hand' })).toHaveCount(0)
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
    await page.getByRole('button', { name: 'New here? Create an account' }).click()
    await expect(page).toHaveTitle('Create an account · First Course')
    await expect(page.getByLabel('Password')).toHaveAttribute('autocomplete', 'new-password')
    await expect(page.getByRole('button', { name: 'Create account' })).toBeDisabled()
    await page.getByLabel('Email').fill('new-cook@example.test')
    await page.getByLabel('Password').fill('a long enough password')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByRole('heading', { name: 'Create your chef' })).toBeVisible()
  })

  test('with email confirmation on, as on the live site, sign-up says to check email', async ({ page, kitchen }) => {
    await kitchen.open('./', { signedIn: false, confirmEmail: true })
    await page.getByRole('button', { name: 'New here? Create an account' }).click()
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
    await expect(page.getByRole('alert')).toHaveText('That email link has expired.')
    await expect(page.getByText(/^Email links expire\./)).toBeVisible()
    // Left in the address, the router would take the error for a page.
    expect(new URL(page.url()).hash).toBe('')
    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Cook this next')).toBeVisible()
    // Shown once: signing out later does not bring the old link's error back.
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('a confirmation link signs the new account in, straight to the menu', async ({ page, kitchen }) => {
    await kitchen.open(`./${kitchen.backend.signupHash()}`, { signedIn: false })
    await expect(page.getByText('Cook this next')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Set a new password' })).toHaveCount(0)
    expect(new URL(page.url()).hash).toBe('')
  })

  test('a link that cannot sign in says so in the app’s words', async ({ page, kitchen }) => {
    const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
    const stranger = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'nobody', role: 'authenticated', exp: 4102444800 })}.e2e`
    const hash = kitchen.backend.recoveryHash().replace(/access_token=[^&]+/, `access_token=${stranger}`)
    await kitchen.open(`./${hash}`, { signedIn: false })
    await expect(page.getByRole('alert')).toHaveText(/^That email link did not sign you in: /)
    await expect(page.getByRole('heading', { name: 'Set a new password' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })

  test('a failed link while already signed in says so above the menu', async ({ page, kitchen }) => {
    await kitchen.open('./#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired', FRESH)
    await expect(page.getByRole('alert')).toHaveText('That email link has expired. You are still signed in.')
    await page.getByRole('button', { name: 'Hide this' }).click()
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.getByText('Cook this next')).toBeVisible()
  })

  test('a link error left showing above the menu does not come back after a sign-out', async ({ page, kitchen }) => {
    await kitchen.open('./#error=access_denied&error_code=otp_expired&error_description=x', FRESH)
    await expect(page.getByRole('alert')).toHaveText('That email link has expired. You are still signed in.')
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('a link for another account asks before switching, and staying keeps this one', async ({ page, kitchen }) => {
    await kitchen.open(`./${kitchen.backend.strangerHash()}`, FRESH)
    await expect(page.getByRole('heading', { name: 'Switch accounts?' })).toBeVisible()
    await expect(page.getByText(`This email link signs in as someone.else@example.test. You are signed in here as ${EMAIL}.`)).toBeVisible()
    await page.getByRole('button', { name: `Stay signed in as ${EMAIL}` }).click()
    await expect(page.getByRole('link', { name: /Remy/ })).toBeVisible()
    // No new password is asked for: the reset was for the other account.
    await expect(page.getByRole('heading', { name: 'Set a new password' })).toHaveCount(0)
  })

  test('a link for another account can be followed when the cook chooses it', async ({ page, kitchen }) => {
    await kitchen.open(`./${kitchen.backend.strangerHash()}`, FRESH)
    await page.getByRole('button', { name: 'Switch to someone.else@example.test' }).click()
    await expect(page.getByRole('heading', { name: 'Set a new password' })).toBeVisible()
    await expect(page.getByText('someone.else@example.test')).toBeVisible()
  })

  test('a sign-out the server never heard says so', async ({ page, kitchen }) => {
    await kitchen.open('./', FRESH)
    kitchen.backend.failNext('auth/logout', 'POST', 'The server is away')
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page.getByRole('alert')).toHaveText(
      'Signed out on this phone, but the sign-out did not reach the server: The server is away. Sign in and out again when you have signal.',
    )
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('an account that never confirmed can ask for the email again', async ({ page, kitchen }) => {
    await kitchen.open('./', { signedIn: false, confirmEmail: true, unconfirmed: true })
    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toHaveText('Email not confirmed')
    await page.getByRole('button', { name: 'Send the confirmation email again' }).click()
    await expect(page.getByRole('status')).toHaveText('Sent. Open the newest email’s link, then sign in.')
    await expect(page.getByRole('button', { name: 'Send the confirmation email again' })).toHaveCount(0)
    expect(kitchen.backend.resendRequests).toEqual([EMAIL])
  })

  test('keeps everything after signing out and back in', async ({ page, kitchen }) => {
    await kitchen.open('./', { logs: [{ recipe: 'chopped-salad', rating: 2 }] })
    await expect(page.getByText('$16.76')).toBeVisible()
    await page.getByRole('button', { name: 'Sign out' }).click()
    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('link', { name: /Remy/ })).toContainText('Level 2 dishwasher')
    await expect(page.getByText('$16.76')).toBeVisible()
  })

  test('Back after a reset link never lands on the link, or keeps its tokens in history', async ({ page, kitchen }) => {
    await page.goto('about:blank')
    await kitchen.open(`./${kitchen.backend.recoveryHash()}`, { signedIn: false })
    await page.getByLabel('New password').fill('a brand new password')
    await page.getByRole('button', { name: 'Save new password' }).click()
    await page.getByRole('button', { name: 'Go to the menu' }).click()
    await expect(page.getByText('Cook this next')).toBeVisible()
    await page.goBack()
    expect(page.url()).not.toContain('access_token')
  })
})
