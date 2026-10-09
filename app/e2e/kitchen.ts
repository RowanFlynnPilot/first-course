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
  kitchen: async ({ page, baseURL }, provide) => {
    const backend = new FakeSupabase()
    const pageErrors: string[] = []
    const consoleErrors: string[] = []
    // The app is served whole from its own site (fonts included); only Supabase is elsewhere.
    const otherSites: string[] = []
    const own = new URL(baseURL ?? '').origin
    let errorScreenExpected = false
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (url.protocol === 'data:' || url.protocol === 'blob:') return
      if (url.origin !== own && url.origin !== SUPABASE_URL) otherSites.push(request.url())
    })
    page.on('console', (message) => {
      // Chrome logs every 4xx and 5xx response. The fake records the ones that matter.
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
        consoleErrors.push(message.text())
      }
    })
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
    expect(otherSites, 'requests to other sites').toEqual([])
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
  // The counter also carries the step's words for a screen reader, after "Step 3 of 8".
  const count = page.locator('.cook-count')
  await expect(count).toHaveText(/^Step 1 of \d+\./)
  const last = Number(/^Step 1 of (\d+)/.exec((await count.textContent()) ?? '')?.[1])
  for (let step = 1; step < last; step += 1) {
    await expect(count).toHaveText(new RegExp(`^Step ${step} of ${last}\\.`))
    await page.getByRole('link', { name: 'Next step' }).click()
  }
  await expect(count).toHaveText(new RegExp(`^Step ${last} of ${last}\\.`))
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
/** An init script that counts every oscillator the page starts: one per beep. */
export const COUNT_BEEPS = () => {
  const counter = window as unknown as { beeps: number }
  counter.beeps = 0
  const start = OscillatorNode.prototype.start
  OscillatorNode.prototype.start = function (this: OscillatorNode, ...args: Parameters<OscillatorNode['start']>) {
    counter.beeps += 1
    return start.apply(this, args)
  }
}

/** The cart's checks, as the phone keeps them (lib/checks.ts), sorted. */
export async function phoneChecks(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find((name) => name.startsWith('first-course:grocery-checks:'))
    return key === undefined ? [] : (JSON.parse(localStorage.getItem(key) ?? '[]') as string[]).toSorted()
  })
}

/** The after-cook notice on the menu: what the cook just logged earned. */
export function cookNotice(page: Page) {
  return page.getByRole('region', { name: 'This cook' })
}

export function noticeLines(page: Page) {
  return cookNotice(page).locator('.notice-lines > li')
}
