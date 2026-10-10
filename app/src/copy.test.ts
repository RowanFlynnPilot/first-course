// Rules about the app's own words and notices that a test can read off the
// source (CLAUDE.md, Design and Vocabulary).

import { describe, expect, it } from 'vitest'

const SOURCES = import.meta.glob(['./**/*.ts', './**/*.tsx', '!./**/*.test.ts', '!./database.types.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

describe('the app’s words', () => {
  it('has the sources to read', () => {
    expect(Object.keys(SOURCES)).toContain('./screens/MenuScreen.tsx')
    expect(Object.keys(SOURCES)).toContain('./curriculum/recipes.ts')
  })

  it('never name a delivery brand: say "ordering" or "delivered"', () => {
    const brands = /\b(?:Door ?Dash|Uber ?Eats|Grubhub|Postmates|Instacart|Seamless|Caviar)\b/i
    for (const [path, text] of Object.entries(SOURCES)) expect(text, path).not.toMatch(brands)
  })

  it('check things off, never tick them, in anything the cook reads', () => {
    // Comments may say what they like; a line of code is where the app's words live.
    for (const [path, text] of Object.entries(SOURCES)) {
      const code = text.split('\n').filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      for (const line of code) expect(line, path).not.toMatch(/\bticked\b|\btick (it |them )?off\b|\bticks\b/i)
    }
  })

  it('give the yolk edge only to the after-cook notice: every other notice says what kind it is', () => {
    // A bare .notice has the yolk edge (styles.css), which means something earned. A plain notice is
    // .notice-info, an error .notice-error.
    const bare = Object.entries(SOURCES).flatMap(([path, text]) => [...text.matchAll(/className="notice"/g)].map(() => path))
    expect(bare).toEqual(['./screens/MenuScreen.tsx'])
  })
})
