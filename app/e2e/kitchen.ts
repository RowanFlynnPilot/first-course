// The fixture every e2e test uses: a fake Supabase behind the page, and a
// check after each test that nothing went wrong quietly.

import { test as base, expect, type Page } from '@playwright/test'
import { FakeSupabase, SUPABASE_URL, type Seed } from './fakeSupabase'

export { expect }
export { EMAIL, PASSWORD } from './fakeSupabase'

export interface Kitchen {
  readonly backend: FakeSupabase
  /** Seeds the fake, then opens a hash route such as './' or '#/chef'. */
  open(route: string, seed?: Seed): Promise<void>
  /** This test ends on the error screen, which React also logs to the console. */
  expectErrorScreen(): void
}

export const test = base.extend<{ kitchen: Kitchen }>({
  // Playwright calls the second argument `use`; named `provide` here so lint does not take it for a React hook.
  kitchen: async ({ page }, provide, testInfo) => {
    const backend = new FakeSupabase()
    const pageErrors: string[] = []
    const consoleErrors: string[] = []
    let errorScreenExpected = false
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('console', (message) => {
      // Chrome logs every 4xx and 5xx response. The fake records the ones that matter.
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
        consoleErrors.push(message.text())
      }
    })
    // The suite never waits on Google Fonts. The screens project lets them load so screenshots look real.
    if (testInfo.project.name !== 'screens') {
      await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
        route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
      )
    }
    await page.route(`${SUPABASE_URL}/**`, (route) => backend.handle(route))

    await provide({
      backend,
      async open(route, seed = {}) {
        await backend.load(page, seed)
        await page.goto(route)
      },
      expectErrorScreen() {
        errorScreenExpected = true
      },
    })

    expect(backend.unhandled, 'requests the fake Supabase does not handle').toEqual([])
    expect(pageErrors, 'uncaught errors on the page').toEqual([])
    if (!errorScreenExpected) expect(consoleErrors, 'console errors').toEqual([])
  },
})

// ── Seeds ──

/** Signed in, chef named Remy, nothing cooked. */
export const FRESH: Seed = {}

/** The salad cooked once at Decent: knife basics and seasoning learned, the sheet pan open. */
export const SALAD_DONE: Seed = { logs: [{ recipe: 'chopped-salad', rating: 2 }] }

// ── Steps a cook takes ──

/** From step 0 of cook mode to the log form, one step at a time. Returns the number of steps. */
export async function cookThrough(page: Page): Promise<number> {
  await page.getByRole('link', { name: 'Everything is out' }).click()
  const count = page.getByText(/^Step \d+ of \d+$/)
  await expect(count).toHaveText(/^Step 1 of \d+$/)
  const last = Number((await count.textContent())?.replace(/^Step 1 of /, ''))
  for (let step = 1; step < last; step += 1) {
    await expect(count).toHaveText(`Step ${step} of ${last}`)
    await page.getByRole('link', { name: 'Next step' }).click()
  }
  await expect(count).toHaveText(`Step ${last} of ${last}`)
  await page.getByRole('link', { name: 'Finish and log it' }).click()
  await expect(page.getByRole('heading', { name: 'How did it go?' })).toBeVisible()
  return last
}

export async function rateAndSave(page: Page, rating: 'Rough' | 'Decent' | 'Nailed it', notes = '') {
  await page.getByRole('radio', { name: new RegExp(`^${rating}`) }).check()
  if (notes !== '') await page.getByLabel('Notes for next time').fill(notes)
  await page.getByRole('button', { name: 'Save this cook' }).click()
}

/** The lines of the after-cook notice on the menu. */
export function noticeLines(page: Page) {
  return page.getByRole('status').locator('.notice-lines > li')
}
