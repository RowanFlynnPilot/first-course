// Installing to the home screen: the manifest, the icons, and standalone mode.

import { expect, FRESH, test } from './kitchen'

interface Manifest {
  name: string
  short_name: string
  start_url: string
  scope: string
  display: string
  icons: { src: string; sizes: string; type: string; purpose: string }[]
}

/** Width and height from a PNG's header. */
function pngSize(png: Buffer): string {
  return `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`
}

test('installs to the home screen and opens standalone at the menu', async ({ page, kitchen }) => {
  await kitchen.open('./', FRESH)
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(href).toBe('/first-course/manifest.webmanifest')
  const manifestUrl = new URL(href ?? '', page.url())
  const response = await page.request.get(manifestUrl.href)
  expect(response.ok()).toBe(true)
  const manifest = (await response.json()) as Manifest

  expect(manifest).toMatchObject({ name: 'First Course', short_name: 'First Course', display: 'standalone' })
  // It opens at the menu, and every page of the app is inside its scope.
  const start = new URL(manifest.start_url, manifestUrl).href
  expect(start).toBe(new URL('/first-course/', manifestUrl).href)
  expect(new URL(manifest.scope, manifestUrl).href).toBe(start)

  for (const icon of manifest.icons) {
    const file = await page.request.get(new URL(icon.src, manifestUrl).href)
    expect(file.headers()['content-type'], icon.src).toBe('image/png')
    expect(pngSize(await file.body()), icon.src).toBe(icon.sizes)
  }
  expect(manifest.icons.map((icon) => `${icon.sizes} ${icon.purpose}`)).toEqual([
    '192x192 any',
    '512x512 any',
    '512x512 maskable',
  ])

  const touch = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')
  const touchIcon = await page.request.get(new URL(touch ?? '', page.url()).href)
  expect(pngSize(await touchIcon.body())).toBe('180x180')
})
