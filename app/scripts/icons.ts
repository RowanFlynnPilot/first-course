// Draws the home-screen icons from the plate, with the Chromium that
// Playwright already installs. Run `npm run icons` after changing the plate;
// the PNGs in public/ are committed.
//
// The plate sits on an enamel square, inside the middle 80% that Android may
// crop a maskable icon to, so one picture serves every purpose.

import { writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const PLATE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#f2f4f1"/>
  <circle cx="32" cy="32" r="21" fill="#ffffff" stroke="#1d3a9e" stroke-width="3.5"/>
  <circle cx="32" cy="32" r="14" fill="none" stroke="#1d3a9e" stroke-opacity="0.18" stroke-width="1.25"/>
  <circle cx="32" cy="32" r="9" fill="#f5b81c"/>
</svg>`

const SIZES = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
]

const browser = await chromium.launch()
const page = await browser.newPage()
for (const { file, size } of SIZES) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${PLATE}`)
  await writeFile(new URL(`../public/${file}`, import.meta.url), await page.screenshot())
  console.log(`public/${file}`)
}
await browser.close()
