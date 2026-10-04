// The chef sprites: original 16-bit RPG-style characters, 16 pixels wide,
// drawn as rows of palette keys. Rank changes the hat and the outfit; the
// cook's chosen skin tone and hair color fill in S, s and H.
//
//   . clear      K outline    E eyes
//   S skin       s skin shade H hair
//   W white      w white shade
//   B cobalt     b cobalt highlight
//   Y yolk       G grey tee   P navy trousers
//
// To edit a sprite, edit the rows. chefSprites.test.ts checks every row is 16
// wide and uses only these keys.

import type { RankIndex } from '../lib/leveling'

export const SPRITE_WIDTH = 16

const HAIRLINE = '...KHHSSSSHHK...'

const FACE = [
  '...KHSESSESHK...',
  '...KSSESSESSK...',
  '...KSSSSSSSSK...',
  '...KSSSssSSSK...',
  '....KSSSSSSK....',
] as const

type Six = readonly [readonly string[], readonly string[], readonly string[], readonly string[], readonly string[], readonly string[]]

// Everything above the eyes, ending in the hairline row.
const HATS: Six = [
  // Dishwasher
  [
    '....KKKKKKKK....',
    '...KBBBBBBBBK...',
    '...KBBBBBBBBKK..',
    '...KbbbbbbbbKBK.',
    '...KHHSSSSHHKK..',
  ],
  // Prep cook
  [
    '....KKKKKKKK....',
    '...KWWWWWWWWK...',
    '...KWWWWWWWWK...',
    '...KwwwwwwwwK...',
    HAIRLINE,
  ],
  // Line cook
  [
    '....KK.KK.KK....',
    '...KWWKWWKWWK...',
    '..KWWWWWWWWWWK..',
    '..KKWWWWWWWWKK..',
    '...KwwwwwwwwK...',
    HAIRLINE,
  ],
  // Sous chef
  [
    '....KK.KK.KK....',
    '...KWWKWWKWWK...',
    '..KWWWWWWWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KKWWwWWwWWKK..',
    '...KWWwWWwWWK...',
    '...KwwwwwwwwK...',
    HAIRLINE,
  ],
  // Head chef
  [
    '....KK.KK.KK....',
    '...KWWKWWKWWK...',
    '..KWWWWWWWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KKWWwWWwWWKK..',
    '...KWWwWWwWWK...',
    '...KWWwWWwWWK...',
    '...KWWwWWwWWK...',
    '...KwwwwwwwwK...',
    HAIRLINE,
  ],
  // Executive chef
  [
    '....KK.KK.KK....',
    '...KWWKWWKWWK...',
    '..KWWWWWWWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KKWWwWWwWWKK..',
    '...KWWwWWwWWK...',
    '...KWWwWWwWWK...',
    '...KWWwWWwWWK...',
    '...KWWwWWwWWK...',
    '...KWWwWWwWWK...',
    '...KYYYYYYYYK...',
    HAIRLINE,
  ],
]

// Shoulders to shoes.
const BODIES: Six = [
  // Dishwasher: bandana knotted at the side, grey tee, white apron, yellow rubber gloves
  [
    '....KKKKKKKK....',
    '...KGWWWWWWGK...',
    '..KGGWWWWWWGGK..',
    '..KSKWWWWWWKSK..',
    '..KSKWWWWWWKSK..',
    '..KYKWWWWWWKYK..',
    '..KKKWWWWWWKKK..',
    '....KWWWWWWK....',
    '....KPPKKPPK....',
    '....KPPKKPPK....',
    '...KKKK..KKKK...',
  ],
  // Prep cook: skull cap, white tee, cobalt apron
  [
    '....KKKKKKKK....',
    '...KWBBBBBBWK...',
    '..KWWBBBBBBWWK..',
    '..KSKBBBBBBKSK..',
    '..KSKBBBBBBKSK..',
    '..KSKBBBBBBKSK..',
    '..KKKBBBBBBKKK..',
    '....KBBBBBBK....',
    '....KPPKKPPK....',
    '....KPPKKPPK....',
    '...KKKK..KKKK...',
  ],
  // Line cook: short toque, white jacket, checked trousers
  [
    '....KKKKKKKK....',
    '...KWWWWWWWWK...',
    '..KWWWWWWWWWWK..',
    '..KWKWWWWWwKWK..',
    '..KWKWWWWWwKWK..',
    '..KSKWWWWWwKSK..',
    '..KKKwwwwwwKKK..',
    '....KPWPWPWK....',
    '....KWPKKWPK....',
    '....KPWKKPWK....',
    '...KKKK..KKKK...',
  ],
  // Sous chef: taller toque, yolk neckerchief
  [
    '....KKKKKKKK....',
    '...KWWYYYYWWK...',
    '..KWWWWYYWWWWK..',
    '..KWKWWWWWwKWK..',
    '..KWKWWWWWwKWK..',
    '..KSKWWWWWwKSK..',
    '..KKKwwwwwwKKK..',
    '....KPWPWPWK....',
    '....KWPKKWPK....',
    '....KPWKKPWK....',
    '...KKKK..KKKK...',
  ],
  // Head chef: tall toque, cobalt buttons, plain trousers
  [
    '....KKKKKKKK....',
    '...KWWYYYYWWK...',
    '..KWWWWYYWWWWK..',
    '..KWKWBWWBwKWK..',
    '..KWKWWWWWwKWK..',
    '..KSKWBWWBwKSK..',
    '..KKKwwwwwwKKK..',
    '....KPPPPPPK....',
    '....KPPKKPPK....',
    '....KPPKKPPK....',
    '...KKKK..KKKK...',
  ],
  // Executive chef: tallest toque with a gold band, gold buttons
  [
    '....KKKKKKKK....',
    '...KWWYYYYWWK...',
    '..KWWWWYYWWWWK..',
    '..KWKWYWWYwKWK..',
    '..KWKWWWWWwKWK..',
    '..KSKWYWWYwKSK..',
    '..KKKwwwwwwKKK..',
    '....KPPPPPPK....',
    '....KPPKKPPK....',
    '....KPPKKPPK....',
    '...KKKK..KKKK...',
  ],
]

export function spriteRows(rank: RankIndex): readonly string[] {
  return [...HATS[rank], ...FACE, ...BODIES[rank]]
}

// ── Looks: the two things a cook chooses about their chef ──

export type LookIndex = 0 | 1 | 2 | 3 | 4
export const LOOK_INDEXES: readonly LookIndex[] = [0, 1, 2, 3, 4]

type Five<T> = readonly [T, T, T, T, T]

export const SKIN_TONES: Five<{ readonly name: string; readonly base: string; readonly shade: string }> = [
  { name: 'Tone 1', base: '#f8d9bd', shade: '#e3b08a' },
  { name: 'Tone 2', base: '#eebd94', shade: '#d39a70' },
  { name: 'Tone 3', base: '#cf9566', shade: '#b07748' },
  { name: 'Tone 4', base: '#a06c45', shade: '#82532f' },
  { name: 'Tone 5', base: '#7b5137', shade: '#5e3b26' },
]

export const HAIR_COLORS: Five<{ readonly name: string; readonly color: string }> = [
  { name: 'Black', color: '#23232e' },
  { name: 'Brown', color: '#5c3b25' },
  { name: 'Blond', color: '#d2a03c' },
  { name: 'Red', color: '#a44a2b' },
  { name: 'Grey', color: '#9aa1ad' },
]

export const SPRITE_KEYS = ['K', 'E', 'S', 's', 'H', 'W', 'w', 'B', 'b', 'Y', 'G', 'P'] as const
export type SpriteKey = (typeof SPRITE_KEYS)[number]

export function spritePalette(skin: LookIndex, hair: LookIndex): Record<SpriteKey, string> {
  return {
    K: '#131a33',
    E: '#131a33',
    S: SKIN_TONES[skin].base,
    s: SKIN_TONES[skin].shade,
    H: HAIR_COLORS[hair].color,
    W: '#ffffff',
    w: '#c9d2e6',
    B: '#1d3a9e',
    b: '#4868cf',
    Y: '#f5b81c',
    G: '#9aa5b8',
    P: '#2b3660',
  }
}
