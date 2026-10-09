// End-to-end tests drive the production build at phone size, with Supabase
// replaced by the fake in e2e/fakeSupabase.ts.
//
//   npm run e2e       the suite (also runs in the deploy workflow)
//   npm run screens   a screenshot of every screen, into screens/

import { defineConfig } from '@playwright/test'
import { SUPABASE_KEY, SUPABASE_URL } from './e2e/fakeSupabase'

// Not 4173, which `npm run preview` takes by default: the two can run at once.
const PORT = 4183

export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.e2e.ts',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: process.env.CI !== undefined,
  reporter: process.env.CI === undefined ? 'list' : [['list'], ['github']],
  use: {
    baseURL: `http://localhost:${PORT}/first-course/`,
    browserName: 'chromium',
    // An iPhone-sized phone, in the cook's own time zone.
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    timezoneId: 'America/Chicago',
    locale: 'en-US',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'phone', testIgnore: 'screens.e2e.ts' },
    { name: 'screens', testMatch: 'screens.e2e.ts' },
  ],
  webServer: {
    // Its own build, so the deploy build keeps the real Supabase URL.
    command: `npx vite build --outDir dist-e2e --emptyOutDir --logLevel warn && npx vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/first-course/`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { VITE_SUPABASE_URL: SUPABASE_URL, VITE_SUPABASE_ANON_KEY: SUPABASE_KEY },
  },
})
