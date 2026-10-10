import { EMAIL, expect, FRESH, PASSWORD, test, useTheLink } from './kitchen'

/** An email link whose access token claims an account in a token the server never issued. */
function forgedHash(hash: string): string {
  const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const forged = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'nobody', email: 'someone.else@example.test', role: 'authenticated', exp: 4102444800 })}.e2e`
  return hash.replace(/access_token=[^&]+/, `access_token=${forged}`)
}

test.describe('signing in and creating a chef', () => {
  test('signs in, creates a chef, and lands on the menu as a level 1 dishwasher', async ({ page, kitchen }) => {
    await kitchen.open('./', { signedIn: false, chef: null })

    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByRole('heading', { name: 'Create your chef' })).toBeVisible()
    // Says it cannot go yet, and keeps focus: a tap goes to the name it needs.
    await expect(page.getByRole('button', { name: 'Create chef' })).toHaveAttribute('aria-disabled', 'true')
    // (Playwright will not tap a button marked aria-disabled unless forced; a finger will.)
    await page.getByRole('button', { name: 'Create chef' }).click({ force: true })
    await expect(page.getByLabel('Chef’s name')).toBeFocused()
    // Nothing is earned yet, so the extras are one line, not eight locked ones.
    await expect(page.getByText(/^Extras, like clogs or a tool in hand, are earned by cooking\./)).toBeVisible()
    await expect(page.getByRole('group', { name: 'In hand' })).toHaveCount(0)
    await page.getByLabel('Chef’s name').fill('  Remy  ')
    await page.getByRole('radio', { name: 'Tone 4' }).check()
    await page.getByRole('radio', { name: 'Red', exact: true }).check()
    await page.getByRole('button', { name: 'Create chef' }).click()

    // The card's words name the chef and the rank, so its sprite is not read as well.
    await expect(page.getByRole('link', { name: /Remy/ })).toHaveAccessibleName(/^Remy Level 1 dishwasher/)
    // Two recipes are open, and the salad is a side: night one is the eggs.
    await expect(page.getByRole('heading', { name: 'Cook this next: Soft scrambled eggs on toast' })).toBeVisible()
    expect(kitchen.backend.table('chefs')).toMatchObject([{ name: 'Remy', skin: 3, hair: 3 }])
  })

  test('says so when the password is wrong', async ({ page, kitchen }) => {
    await kitchen.open('./', { signedIn: false })
    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Password').fill('not the password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toHaveText('That email and password do not match an account.')
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  })

  test('creates an account and goes straight to creating a chef', async ({ page, kitchen }) => {
    await kitchen.open('./', { signedIn: false })
    await page.getByRole('button', { name: 'New here? Create an account' }).click()
    await expect(page).toHaveTitle('Create an account · First Course')
    await expect(page.getByLabel('Password')).toHaveAttribute('autocomplete', 'new-password')
    // The hint is read with the field, not as part of its name.
    await expect(page.getByLabel('Password')).toHaveAccessibleDescription('At least 8 characters.')
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
    await expect(page.getByText('Check your email to confirm the account, then sign in.')).toBeVisible()
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
    await expect(page.getByText('If there is an account for that email, the link is on its way.')).toBeVisible()
    expect(kitchen.backend.resetRequests).toEqual([EMAIL])
    await page.getByRole('button', { name: 'Back to sign in' }).click()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('the reset link asks for a new password first, and the new one signs in', async ({ page, kitchen }) => {
    const hash = kitchen.backend.recoveryHash()
    await kitchen.open(`./${hash}`, { signedIn: false })
    await useTheLink(page)
    await expect(page.getByRole('heading', { name: 'Set a new password' })).toBeVisible()
    await expect(page).toHaveTitle('Set a new password · First Course')
    // The client took the tokens out of the address.
    expect(new URL(page.url()).hash).toBe('')
    await expect(page.getByLabel('New password')).toHaveAccessibleDescription('At least 8 characters.')
    await page.getByLabel('New password').fill('a brand new password')
    await page.getByRole('button', { name: 'Save new password' }).click()
    await expect(page.getByText('Saved.', { exact: true })).toBeVisible()
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

  test('a confirmation link signs the new account in, once asked, straight to the menu', async ({ page, kitchen }) => {
    await kitchen.open(`./${kitchen.backend.signupHash()}`, { signedIn: false })
    await expect(page.getByText(`This email link signs in as ${EMAIL}. If you did not ask for this email, do not use it.`)).toBeVisible()
    await useTheLink(page)
    await expect(page.getByText('Cook this next')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Set a new password' })).toHaveCount(0)
    expect(new URL(page.url()).hash).toBe('')
  })

  test('a link that cannot sign in says so in the app’s words', async ({ page, kitchen }) => {
    await kitchen.open(`./${forgedHash(kitchen.backend.recoveryHash())}`, { signedIn: false })
    await expect(page.getByRole('alert')).toHaveText('That email link did not work.')
    await expect(page.getByRole('heading', { name: 'Set a new password' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })

  test('a forged link never asks to switch accounts: the server has to vouch for it first', async ({ page, kitchen }) => {
    // Anyone can write a token that claims an account. Only one the server accepts gets as far as "Switch accounts?".
    await kitchen.open(`./${forgedHash(kitchen.backend.recoveryHash())}`, FRESH)
    await expect(page.getByRole('alert')).toHaveText('That email link did not work. You are still signed in.')
    await expect(page.getByRole('heading', { name: 'Switch accounts?' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /Remy/ })).toBeVisible()
  })

  test('a reset link that lands with no signal is kept: Try again uses it once there is signal', async ({ page, kitchen }) => {
    kitchen.backend.dropNext('auth/user', 'GET')
    await kitchen.open(`./${kitchen.backend.recoveryHash()}`, { signedIn: false })
    await expect(page.getByRole('heading', { name: 'No connection' })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveText(
      'No connection, so the email link could not be checked. Check your signal and try again.',
    )
    // The tokens are already out of the address bar: only the app still has them.
    expect(page.url()).not.toContain('access_token')
    await page.getByRole('button', { name: 'Try again' }).click()
    await useTheLink(page)
    await expect(page.getByRole('heading', { name: 'Set a new password' })).toBeVisible()
  })

  test('a link that lands on a phone signed out signs no one in until the cook says so', async ({ page, kitchen }) => {
    // Anyone can send a link carrying their own account: on a phone nobody is signed in to, it still asks.
    await kitchen.open(`./${kitchen.backend.strangerHash()}`, { signedIn: false })
    await expect(page.getByRole('heading', { name: 'Sign in with this link?' })).toBeVisible()
    await expect(page.getByText('This email link signs in as someone.else@example.test.')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await page.getByRole('button', { name: 'Not now' }).click()
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Set a new password' })).toHaveCount(0)
    expect(await page.evaluate(() => localStorage.getItem('sb-e2e-auth-token'))).toBeNull()
  })

  test('a link carrying a session and an error signs no one in, and says it failed', async ({ page, kitchen }) => {
    await kitchen.open(`./${kitchen.backend.strangerHash()}&error=access_denied&error_code=otp_expired`, { signedIn: false })
    await expect(page.getByRole('alert')).toHaveText('That email link has expired.')
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('sb-e2e-auth-token'))).toBeNull()
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
    // Two emails, one of them long, and nothing runs off the side.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
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
    // The server's own words are not repeated: the cook needs to know what happened, not what the server said.
    await expect(page.getByRole('alert')).toHaveText(
      'Signed out on this phone, but the sign-out did not reach the server. Sign in and out again when you have signal.',
    )
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('an account that never confirmed can ask for the email again', async ({ page, kitchen }) => {
    await kitchen.open('./', { signedIn: false, confirmEmail: true, unconfirmed: true })
    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toHaveText('Confirm your email first: open the link we sent, then sign in.')
    await page.getByRole('button', { name: 'Send the confirmation email again' }).click()
    await expect(page.getByText('Sent. Open the newest email’s link, then sign in.')).toBeVisible()
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
    await useTheLink(page)
    await page.getByLabel('New password').fill('a brand new password')
    await page.getByRole('button', { name: 'Save new password' }).click()
    await page.getByRole('button', { name: 'Go to the menu' }).click()
    await expect(page.getByText('Cook this next')).toBeVisible()
    await page.goBack()
    expect(page.url()).not.toContain('access_token')
  })
})

test.describe('email links on weak signal', () => {
  const EVENING = new Date('2026-10-09T18:00:00-05:00')

  test('a link that lands while the sign-in here cannot be renewed waits, rather than sign in over it', async ({ page, kitchen }) => {
    await page.clock.install({ time: EVENING })
    // The token renewal never gets through; the link's own check does.
    kitchen.backend.dropEvery('auth/token', 'POST')
    // The link's own check answers at once; let it land before the clock jumps past its 15-second limit.
    const checked = page.waitForResponse((response) => response.url().endsWith('/auth/v1/user'))
    await kitchen.open(`./${kitchen.backend.strangerHash()}`, { ...FRESH, sessionExpired: true })
    await checked
    await page.clock.runFor('00:45')
    await expect(page.getByRole('heading', { name: 'No connection' })).toBeVisible()
    await expect(page.getByRole('alert')).toContainText('could not check who is signed in here')
    await expect(page.getByRole('heading', { name: 'Switch accounts?' })).toHaveCount(0)
    // The phone still holds this cook's sign-in, not the stranger's.
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('sb-e2e-auth-token') ?? 'null') as { user: { id: string } } | null)
    expect(stored?.user.id).toBe(kitchen.backend.userId)
  })

  test('a link that lands while Supabase is down is kept: Try again uses it', async ({ page, kitchen }) => {
    kitchen.backend.failNext('auth/user', 'GET', 'upstream connect error')
    await kitchen.open(`./${kitchen.backend.recoveryHash()}`, { signedIn: false })
    await expect(page.getByRole('heading', { name: 'No connection' })).toBeVisible()
    await page.getByRole('button', { name: 'Try again' }).click()
    await useTheLink(page)
    await expect(page.getByRole('heading', { name: 'Set a new password' })).toBeVisible()
  })

  test('a link whose token is not a token says it did not work, and asks for nothing', async ({ page, kitchen }) => {
    await kitchen.open('./#access_token=not%0Aa%20token&refresh_token=x&type=recovery', { signedIn: false })
    await expect(page.getByRole('alert')).toHaveText('That email link did not work.')
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })
})

test.describe('whose kitchen this is', () => {
  test('the menu names the account, and Sign out signs out this phone only', async ({ page, kitchen }) => {
    await kitchen.open('./', FRESH)
    await expect(page.getByText(`Signed in on this phone as ${EMAIL}`)).toBeVisible()
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    expect(kitchen.backend.logouts).toEqual(['local'])
  })

  test('a new chef lands at the top of the menu, with focus on its name', async ({ page, kitchen }) => {
    await kitchen.open('./', { chef: null })
    await expect(page.getByRole('heading', { name: 'Create your chef' })).toBeFocused()
    await page.getByLabel('Chef’s name').fill('Remy')
    await page.getByRole('button', { name: 'Create chef' }).click()
    await expect(page.getByRole('heading', { name: 'First Course', level: 1 })).toBeFocused()
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
  })
})
