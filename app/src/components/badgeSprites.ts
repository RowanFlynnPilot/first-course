// The badge sprites: original 16-pixel medals in the same format and palette as the
// chef sprite. Each badge is a 10 by 10 symbol drawn on a shared cobalt medal.
// A badge not yet earned is the same picture as a grey silhouette.
//
//   . clear      K outline    B cobalt     b cobalt highlight
//   W white      w white shade
//   Y yolk       y yolk shade R ketchup
//
// The sprite's palette plus two: ketchup, which is already the app's color
// for the price of ordering, and one shade of yolk, as every other sprite
// color has one. chefSprites.test.ts checks every row.

import type { BadgeId } from '../lib/badges'

export const BADGE_SIZE = 16
export const SYMBOL_SIZE = 10
const SYMBOL_AT = 3

const MEDAL = [
  '.....KKKKKK.....',
  '...KKBBBBBBKK...',
  '..KBBbbbbBBBBK..',
  '.KBbBBBBBBBBBBK.',
  '.KbBBBBBBBBBBBK.',
  'KBbBBBBBBBBBBBBK',
  'KBBBBBBBBBBBBBBK',
  'KBBBBBBBBBBBBBBK',
  'KBBBBBBBBBBBBBBK',
  'KBBBBBBBBBBBBBBK',
  'KBBBBBBBBBBBBBBK',
  '.KBBBBBBBBBBBBK.',
  '.KBBBBBBBBBBBBK.',
  '..KBBBBBBBBBBK..',
  '...KKBBBBBBKK...',
  '.....KKKKKK.....',
] as const

export const SYMBOLS: Readonly<Record<BadgeId, readonly string[]>> = {
  // A fried egg.
  'first-cook': [
    '..........',
    '...WWWW...',
    '..WWWWWW..',
    '.WWWYYWWW.',
    '.WWYYYYWW.',
    '.WWYYYYWW.',
    '.WWWYYWWW.',
    '..WWWWWW..',
    '...WWWw...',
    '..........',
  ],
  // A star.
  'nailed-it': [
    '....YY....',
    '....YY....',
    '...YYYY...',
    'YYYYYYYYYY',
    '.YYYYYYYY.',
    '..YYYYYY..',
    '..YYyyYY..',
    '.YYy..yYY.',
    '.YY....YY.',
    '..........',
  ],
  // A crown.
  mastered: [
    '..........',
    'Y...YY...Y',
    'YY..YY..YY',
    'YYY.YY.YYY',
    'YYYYYYYYYY',
    'YRYYWWYYRY',
    'YYYYYYYYYY',
    'yyyyyyyyyy',
    '..........',
    '..........',
  ],
  // A check mark.
  'course-cleared': [
    '..........',
    '.........W',
    '........WW',
    '.......WW.',
    'W.....WW..',
    'WW...WW...',
    '.WW.WW....',
    '..WWW.....',
    '...W......',
    '..........',
  ],
  // A chef's knife.
  specialist: [
    '.........W',
    '........WW',
    '.......WWw',
    '......WWw.',
    '.....WWw..',
    '....WWw...',
    '...yy.....',
    '..yyy.....',
    '.yyy......',
    '.yy.......',
  ],
  // A coin.
  'kept-100': [
    '...yyyy...',
    '.yyYYYYyy.',
    '.yYYYKYYy.',
    'yYYYKKKYYy',
    'yYYYKYYYYy',
    'yYYYKKKYYy',
    'yYYYYYKYYy',
    '.yYYKKKYy.',
    '.yyYYKYyy.',
    '...yyyy...',
  ],
  // A stack of coins.
  'kept-500': [
    '..yyyyyy..',
    '.yYYYYYYy.',
    '..yyyyyy..',
    '.yYYYYYYy.',
    '..yyyyyy..',
    '.yYYYYYYy.',
    '..yyyyyy..',
    '.yYYYYYYy.',
    '.yYYYYYYy.',
    '..yyyyyy..',
  ],
  // A calendar with four weeks filled in.
  'four-weeks': [
    '.K.....K..',
    'WKWWWWWKWW',
    'RRRRRRRRRR',
    'WWWWWWWWWW',
    'WYYWYYWYYW',
    'WYYWYYWYYW',
    'WWWWWWWWWW',
    'WYYWwwWwwW',
    'WYYWwwWwwW',
    'WWWWWWWWWW',
  ],
  // A double cheeseburger.
  'usual-burger': [
    '..........',
    '..yyyyyy..',
    '.yYYYYYYy.',
    'yYWYYWYYWy',
    'KKKKKKKKKK',
    'YYYYYYYYYY',
    'KKKKKKKKKK',
    'yYYYYYYYYy',
    '.yyyyyyyy.',
    '..........',
  ],
  // A crispy chicken sandwich with spicy mayo.
  'usual-chicken-sandwich': [
    '..........',
    '..yyyyyy..',
    '.yYYYYYYy.',
    'yYYYYYYYYy',
    'RRRRRRRRRR',
    'yYyyYyyYyy',
    'yyYyyYyyYy',
    'yYYYYYYYYy',
    '.yyyyyyyy.',
    '..........',
  ],
  // A slice of pizza.
  'usual-pizza': [
    'yyyyyyyyyy',
    'yYYYYYYYYy',
    '.WRWWWWRW.',
    '.WWWWRWWW.',
    '..WRWWWW..',
    '..WWWWRW..',
    '...WRWW...',
    '...WWWW...',
    '....WW....',
    '....WW....',
  ],
  // A bowl of pasta with meat sauce.
  'usual-ragu': [
    '..........',
    '..RRRRRR..',
    '.RRYRRYRR.',
    'YRYYRYYRYY',
    'WWWWWWWWWW',
    'wWWWWWWWWw',
    '.wWWWWWWw.',
    '..wwwwww..',
    '...wwww...',
    '..........',
  ],
  // Noodles and chopsticks.
  'usual-pad-thai': [
    '.......K.K',
    '......K.K.',
    '.....K.K..',
    '..YYKYKYY.',
    'YyYyYyYyYy',
    'WWWWWWWWWW',
    'wWWWWWWWWw',
    '.wWWWWWWw.',
    '..wwwwww..',
    '..........',
  ],
  // A takeout box.
  'usual-general-tso': [
    '...KKKK...',
    '..K....K..',
    'WWWWWWWWWW',
    '.WWWWWWWW.',
    '.WWRRRRWW.',
    '.WWRRRRWW.',
    '..WWWWWW..',
    '..WWWWWW..',
    '..wwwwww..',
    '..........',
  ],
  // A bowl of curry, steaming.
  'usual-tikka-masala': [
    '..W...W...',
    '...W...W..',
    '..W...W...',
    '.RRYRRYRR.',
    'RYRRYRRYRR',
    'WWWWWWWWWW',
    'wWWWWWWWWw',
    '.wWWWWWWw.',
    '..wwwwww..',
    '..........',
  ],
}

export const BADGE_KEYS = ['K', 'B', 'b', 'W', 'w', 'Y', 'y', 'R'] as const

export const BADGE_PALETTE: Readonly<Record<(typeof BADGE_KEYS)[number], string>> = {
  K: '#131a33',
  B: '#1d3a9e',
  b: '#4868cf',
  W: '#ffffff',
  w: '#c9d2e6',
  Y: '#f5b81c',
  y: '#c98e0a',
  R: '#c4321f',
}

/** Not earned yet: the same picture in greys, like a locked plate. */
export const LOCKED_PALETTE: Readonly<Record<(typeof BADGE_KEYS)[number], string>> = {
  K: '#9aa1ad',
  B: '#e3e7ea',
  b: '#e3e7ea',
  W: '#c4cad2',
  w: '#c4cad2',
  Y: '#c4cad2',
  y: '#c4cad2',
  R: '#c4cad2',
}

/** The medal with the badge's symbol drawn in its middle. */
export function badgeRows(id: BadgeId): string[] {
  const symbol = SYMBOLS[id]
  return MEDAL.map((row, y) =>
    [...row]
      .map((pixel, x) => {
        const inside = y >= SYMBOL_AT && y < SYMBOL_AT + SYMBOL_SIZE && x >= SYMBOL_AT && x < SYMBOL_AT + SYMBOL_SIZE
        const drawn = inside ? symbol[y - SYMBOL_AT]?.charAt(x - SYMBOL_AT) : undefined
        return drawn !== undefined && drawn !== '.' ? drawn : pixel
      })
      .join(''),
  )
}
