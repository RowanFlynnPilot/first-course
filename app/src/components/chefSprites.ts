// The chef sprites: original 16-bit RPG-style characters, drawn as rows of
// palette keys. Rank changes the hat and the outfit. The cook's look (skin,
// hair color, hairstyle, facial hair, glasses) and the extras they have earned
// are drawn over it as patches, so the hat and jacket always show the rank.
//
//   . clear      K outline    E eyes
//   S skin       s skin shade H hair
//   W white      w white shade
//   B cobalt     b cobalt highlight
//   Y yolk       y yolk shade R ketchup
//   G grey       P navy trousers
//
// The rank art below is 16 wide; the sprite is drawn 20 wide, with 2 clear
// columns each side, so a tool held beside the chef has room. To edit a
// sprite, edit the rows. chefSprites.test.ts checks every row and patch.

import type { ExtraId } from '../lib/extras'
import type { RankIndex } from '../lib/leveling'

export const SPRITE_WIDTH = 20
const PAD = '..'

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

// ── Patches: the look and the extras, drawn over the rank's art ──

/**
 * Pixels to draw over the sprite. `top` counts rows from the first face row
 * (the eyes): -1 is the hairline, 5 is the shoulders, 15 the shoes. `left` is
 * the column in the 20-wide sprite. In `rows`, '.' leaves a pixel alone.
 */
export interface Patch {
  readonly top: number
  readonly left: number
  readonly rows: readonly string[]
}

const face = (top: number, rows: readonly string[]): Patch => ({ top, left: 0, rows })

/** A tool held in the right hand, beside the arm: 5 wide, from the eyes to the waist. */
const tool = (rows: readonly string[]): Patch => ({ top: 0, left: 15, rows })

// ── Looks: what a cook chooses about their chef ──

/** The indexes of a fixed list of options: 0 | 1 | ... | length - 1. */
type IndexOf<T extends readonly unknown[]> = Exclude<Partial<T>['length'], T['length']>

// Existing chefs store these indexes, so new options go at the end.
export const SKIN_TONES = [
  { name: 'Tone 1', base: '#f8d9bd', shade: '#e3b08a' },
  { name: 'Tone 2', base: '#eebd94', shade: '#d39a70' },
  { name: 'Tone 3', base: '#cf9566', shade: '#b07748' },
  { name: 'Tone 4', base: '#a06c45', shade: '#82532f' },
  { name: 'Tone 5', base: '#7b5137', shade: '#5e3b26' },
  { name: 'Tone 6', base: '#5f3d29', shade: '#47291b' },
  { name: 'Tone 7', base: '#462c1f', shade: '#331e14' },
] as const

export const HAIR_COLORS = [
  { name: 'Black', color: '#23232e' },
  { name: 'Brown', color: '#5c3b25' },
  { name: 'Blond', color: '#d2a03c' },
  { name: 'Red', color: '#a44a2b' },
  { name: 'Gray', color: '#9aa1ad' },
  { name: 'Blue', color: '#3f8fd6' },
  { name: 'Pink', color: '#e38ab2' },
  { name: 'Green', color: '#3f9a6c' },
  { name: 'Purple', color: '#7b5ac6' },
] as const

export const HAIR_STYLES = [
  { name: 'Short', patches: [] },
  { name: 'Cropped', patches: [face(-1, ['.......S....S.......', '......S......S......'])] },
  {
    name: 'Long',
    patches: [
      face(-1, [
        '....KH........HK....',
        '....KH........HK....',
        '....KH........HK....',
        '....KH........HK....',
        '....KH........HK....',
        '....KHH......HHK....',
        '....KHH......HHK....',
        '....KH........HK....',
      ]),
    ],
  },
  {
    name: 'Curly',
    patches: [face(-1, ['...KHHH......HHHK...', '...KHHH......HHHK...', '....KHH......HHK....'])],
  },
] as const satisfies readonly { readonly name: string; readonly patches: readonly Patch[] }[]

export const FACIAL_HAIR = [
  { name: 'None', patches: [] },
  { name: 'Mustache', patches: [face(3, ['........HHHH........'])] },
  {
    name: 'Beard',
    patches: [face(2, ['......H......H......', '......HHHHHHHH......', '.......HHHHHH.......'])],
  },
  { name: 'Stubble', patches: [face(3, ['......ss....ss......', '.......ssssss.......'])] },
] as const satisfies readonly { readonly name: string; readonly patches: readonly Patch[] }[]

export const GLASSES = [
  { name: 'None', patches: [] },
  {
    name: 'Round',
    patches: [face(-1, ['........w..w........', '.......w.ww.w.......', '.......w.ww.w.......', '........w..w........'])],
  },
  {
    name: 'Square',
    patches: [face(-1, ['.......KKKKKK.......', '.......w.ww.w.......', '.......wwwwww.......'])],
  },
] as const satisfies readonly { readonly name: string; readonly patches: readonly Patch[] }[]

export type SkinIndex = IndexOf<typeof SKIN_TONES>
export type HairIndex = IndexOf<typeof HAIR_COLORS>
export type HairStyleIndex = IndexOf<typeof HAIR_STYLES>
export type FacialHairIndex = IndexOf<typeof FACIAL_HAIR>
export type GlassesIndex = IndexOf<typeof GLASSES>

/** Everything a cook chooses about how their chef looks. Rank chooses the rest. */
export interface Look {
  readonly skin: SkinIndex
  readonly hair: HairIndex
  readonly hairStyle: HairStyleIndex
  readonly facialHair: FacialHairIndex
  readonly glasses: GlassesIndex
}

/** True when `value` is an index into `options`. */
export function isIndexOf<T extends readonly unknown[]>(options: T, value: number): value is Extract<IndexOf<T>, number> {
  return Number.isInteger(value) && value >= 0 && value < options.length
}

// ── Extras: earned by cooking (lib/extras.ts), worn over the outfit ──

const HANDLE = '.KyK.'

export const EXTRA_ART: Readonly<Record<ExtraId, readonly Patch[]>> = {
  'kitchen-towel': [{ top: 11, left: 3, rows: ['KWWK', 'KBBK', 'KWWK', 'KBBK', '.KK.'] }],
  'wooden-spoon': [tool(['.....', '.KKK.', 'KyyyK', 'KyyyK', '.KyK.', HANDLE, HANDLE, HANDLE, HANDLE, HANDLE, HANDLE, HANDLE, '..K..'])],
  'red-clogs': [{ top: 15, left: 5, rows: ['KRRK..KRRK'] }],
  'smash-spatula': [tool(['.....', 'KKKKK', 'KGGGK', 'KGGGK', 'KKKKK', HANDLE, HANDLE, HANDLE, HANDLE, HANDLE, HANDLE, HANDLE, '..K..'])],
  'pizza-patch': [{ top: 8, left: 9, rows: ['YR', 'RY'] }],
  whisk: [tool(['.KKK.', 'KwKwK', 'KwKwK', 'KwKwK', '.KKK.', '.KGK.', '.KGK.', '.KGK.', '.KGK.', '.KGK.', '.KGK.', '.KGK.', '..K..'])],
  'yellow-clogs': [{ top: 15, left: 5, rows: ['KYYK..KYYK'] }],
  chopsticks: [tool(['.....', '.K.K.', '.K.K.', '.K.K.', '.K.K.', '.K.K.', '.K.K.', '.K.K.', '.K.K.', '.KK..', '.KK..', '.KK..'])],
}

// ── Drawing ──

function drawPatch(rows: string[], patch: Patch, faceRow: number): void {
  patch.rows.forEach((pixels, offset) => {
    const y = faceRow + patch.top + offset
    const row = rows[y]
    if (row === undefined) throw new Error(`Patch row ${patch.top + offset} is outside the sprite`)
    if (patch.left < 0 || patch.left + pixels.length > row.length) throw new Error(`Patch "${pixels}" is outside the sprite`)
    let next = row
    for (const [x, key] of [...pixels].entries()) {
      if (key === '.') continue
      next = next.slice(0, patch.left + x) + key + next.slice(patch.left + x + 1)
    }
    rows[y] = next
  })
}

export function spriteRows(rank: RankIndex, look: Look, extras: readonly ExtraId[]): readonly string[] {
  const hat = HATS[rank]
  const rows = [...hat, ...FACE, ...BODIES[rank]].map((row) => PAD + row + PAD)
  const patches = [
    ...HAIR_STYLES[look.hairStyle].patches,
    ...FACIAL_HAIR[look.facialHair].patches,
    ...GLASSES[look.glasses].patches,
    ...extras.flatMap((id) => EXTRA_ART[id]),
  ]
  for (const patch of patches) drawPatch(rows, patch, hat.length)
  return rows
}

/**
 * The two idle frames: standing, then a bob. The bob drops everything above
 * the trousers by one pixel (losing the row just above them), so the chef
 * dips at the knees while the feet stay planted and the height stays the same.
 */
export function spriteFrames(
  rank: RankIndex,
  look: Look,
  extras: readonly ExtraId[],
): readonly [readonly string[], readonly string[]] {
  const rows = spriteRows(rank, look, extras)
  const trousers = rows.length - 3
  const bob = ['.'.repeat(SPRITE_WIDTH), ...rows.slice(0, trousers - 1), ...rows.slice(trousers)]
  return [rows, bob]
}

export const SPRITE_KEYS = ['K', 'E', 'S', 's', 'H', 'W', 'w', 'B', 'b', 'Y', 'y', 'R', 'G', 'P'] as const
export type SpriteKey = (typeof SPRITE_KEYS)[number]

export function spritePalette(look: Look): Record<SpriteKey, string> {
  return {
    K: '#131a33',
    E: '#131a33',
    S: SKIN_TONES[look.skin].base,
    s: SKIN_TONES[look.skin].shade,
    H: HAIR_COLORS[look.hair].color,
    W: '#ffffff',
    w: '#c9d2e6',
    B: '#1d3a9e',
    b: '#4868cf',
    Y: '#f5b81c',
    y: '#c98e0a',
    R: '#c4321f',
    G: '#9aa5b8',
    P: '#2b3660',
  }
}
