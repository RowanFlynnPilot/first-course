import { describe, expect, it } from 'vitest'
import { RECIPES } from '../curriculum/recipes'
import { DISCIPLINES, TECHNIQUES } from '../curriculum/techniques'
import {
  cookXp,
  disciplineStats,
  levelForXp,
  levelFraction,
  RANKS,
  rankIndexForLevel,
  totalXp,
  xpForLevel,
  XP_COOKS_PER_RECIPE,
  XP_PER_MASTERY,
} from './leveling'
import type { CookLog, Rating } from './progress'

let counter = 0
function log(recipeId: string, rating: Rating): CookLog {
  counter += 1
  return { id: String(counter), recipeId, cookedOn: '2026-10-03', rating, notes: '' }
}

describe('xp', () => {
  it('starts at zero, level 1, dishwasher', () => {
    expect(totalXp([])).toBe(0)
    expect(levelForXp(0)).toBe(1)
    expect(RANKS[rankIndexForLevel(1)].name).toBe('Dishwasher')
  })

  it('scales with tier and rating', () => {
    expect(cookXp(1, 1)).toBe(10)
    expect(cookXp(5, 3)).toBe(150)
  })

  it('pays for the cook and for each skill learned', () => {
    // Tier 1 at Decent is 20; the salad teaches two skills at 50 each.
    expect(totalXp([log('chopped-salad', 2)])).toBe(120)
    // A Rough cook earns its 10 and teaches nothing.
    expect(totalXp([log('soft-scrambled-eggs', 1)])).toBe(10)
  })

  it('adds the mastery bonus once', () => {
    const logs = [log('soft-scrambled-eggs', 2), log('soft-scrambled-eggs', 2), log('soft-scrambled-eggs', 3)]
    expect(totalXp(logs)).toBe(20 + 20 + 30 + 50 + 100)
  })

  it('stops paying after a recipe has been cooked enough', () => {
    const many = Array.from({ length: XP_COOKS_PER_RECIPE + 4 }, () => log('grilled-cheese', 3))
    const capped = many.slice(0, XP_COOKS_PER_RECIPE)
    expect(totalXp(many)).toBe(totalXp(capped))
  })

  it('pays for the best five cooks of a recipe, so getting better counts', () => {
    // Five Decents, then a Nailed it: the Nailed it replaces a Decent among the five that count.
    // (The Nailed it also masters the eggs.)
    const decent = Array.from({ length: XP_COOKS_PER_RECIPE }, () => log('soft-scrambled-eggs', 2))
    const better = [...decent, log('soft-scrambled-eggs', 3)]
    expect(totalXp(better) - totalXp(decent)).toBe(cookXp(1, 3) - cookXp(1, 2) + XP_PER_MASTERY)
    // A Rough after five good cooks changes nothing.
    expect(totalXp([...better, log('soft-scrambled-eggs', 1)])).toBe(totalXp(better))
  })

  it('never goes down when a cook is added', () => {
    // A new array for every cook, as the app makes one: progress is kept per log array.
    let logs: readonly CookLog[] = []
    let previous = 0
    for (const recipe of RECIPES) {
      for (const rating of [1, 2, 3] as const) {
        logs = [...logs, log(recipe.id, rating)]
        const xp = totalXp(logs)
        expect(xp).toBeGreaterThanOrEqual(previous)
        previous = xp
      }
    }
    expect(previous).toBeGreaterThan(0)
  })
})

describe('levels and ranks', () => {
  it('needs 100, 300, 600 total XP for levels 2, 3, 4', () => {
    expect([2, 3, 4].map(xpForLevel)).toEqual([100, 300, 600])
    expect(levelForXp(99)).toBe(1)
    expect(levelForXp(100)).toBe(2)
    expect(levelForXp(599)).toBe(3)
    expect(levelFraction(100)).toBe(0)
    expect(levelFraction(200)).toBe(0.5)
  })

  it('maps every rank threshold to its rank', () => {
    RANKS.forEach((rank, index) => {
      expect(rankIndexForLevel(rank.fromLevel)).toBe(index)
      if (index > 0) expect(rankIndexForLevel(rank.fromLevel - 1)).toBe(index - 1)
    })
  })

  it('puts executive chef within reach of a perfect run, and only near one', () => {
    const perfect = RECIPES.flatMap((recipe) => Array.from({ length: XP_COOKS_PER_RECIPE }, () => log(recipe.id, 3)))
    expect(RANKS[rankIndexForLevel(levelForXp(totalXp(perfect)))].name).toBe('Executive chef')
    const once = RECIPES.map((recipe) => log(recipe.id, 2))
    expect(rankIndexForLevel(levelForXp(totalXp(once)))).toBeLessThan(4)
  })
})

describe('disciplines', () => {
  it('cover every skill exactly once', () => {
    const stats = disciplineStats([])
    expect(stats.map((stat) => stat.id)).toEqual(Object.keys(DISCIPLINES))
    expect(stats.flatMap((stat) => stat.skills).length).toBe(Object.keys(TECHNIQUES).length)
    for (const stat of stats) expect(stat.skills.length, stat.id).toBeGreaterThan(0)
  })

  it('count a learned skill under its discipline', () => {
    const stats = disciplineStats([log('chopped-salad', 2)])
    expect(stats.find((stat) => stat.id === 'prep')?.learned).toBe(1)
    expect(stats.find((stat) => stat.id === 'palate')?.learned).toBe(1)
    expect(stats.find((stat) => stat.id === 'pan')?.learned).toBe(0)
  })
})
