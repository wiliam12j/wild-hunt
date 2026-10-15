import type { SymbolId } from './types.ts';

// Optional image overrides. Put a file with one of these names in public/art/ and the game
// uses it instead of the built-in drawing; anything missing falls back to the drawing.
// See public/art/README.md for sizes and formats.

export const ART = {
  /** Folder (relative to the page) that holds override images. */
  basePath: 'art/',

  symbols: {
    TEN: 'symbols/ten.png',
    J: 'symbols/j.png',
    Q: 'symbols/q.png',
    K: 'symbols/k.png',
    A: 'symbols/a.png',
    RABBIT: 'symbols/rabbit.png',
    PHEASANT: 'symbols/pheasant.png',
    FOX: 'symbols/fox.png',
    STAG: 'symbols/stag.png',
    HUNTER: 'symbols/hunter.png',
    LODGE: 'symbols/lodge.png',
    CASH_RABBIT: 'symbols/trophy-rabbit.png',
    CASH_PHEASANT: 'symbols/trophy-pheasant.png',
    CASH_FOX: 'symbols/trophy-fox.png',
    CASH_DEER: 'symbols/trophy-deer.png',
    CASH_GOLDEN_STAG: 'symbols/trophy-golden-stag.png',
    TROPHY: 'symbols/trophy-mystery.png',
  } satisfies Record<SymbolId, string>,

  /** Full-screen background behind everything (cropped to fill, so keep the middle interesting). */
  background: 'background.jpg',
} as const;
