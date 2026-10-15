import { buildReels } from './buildStrip.ts';
import type { ReelCounts, SymbolId } from './types.ts';

// Reels are defined as symbol counts; buildReels lays them out deterministically.
// Tune by editing counts only. The Hunter may appear only on GAME.wildReels (reels 2-4).
// TROPHY becomes a Cash symbol when it lands (see TROPHY_WEIGHTS in cashValues.ts).

/** Minimum distance between copies of these symbols, so one reel never shows two at once. */
export const STRIP_SPACING: Readonly<Partial<Record<SymbolId, number>>> = {
  LODGE: 3,
  HUNTER: 3,
};

/** Seeds for the layout shuffle. Changing them reshuffles strips without changing counts. */
export const STRIP_SEEDS = { base: 1000, free: 2000 } as const;

export const BASE_REEL_COUNTS: readonly ReelCounts[] = [
  { TEN: 10, J: 10, Q: 9, K: 9, A: 8, RABBIT: 6, PHEASANT: 5, FOX: 4, STAG: 3, LODGE: 2, TROPHY: 4 },
  { TEN: 10, J: 10, Q: 9, K: 9, A: 8, RABBIT: 6, PHEASANT: 5, FOX: 4, STAG: 3, HUNTER: 2, LODGE: 2, TROPHY: 4 },
  { TEN: 10, J: 10, Q: 9, K: 9, A: 8, RABBIT: 6, PHEASANT: 5, FOX: 4, STAG: 3, HUNTER: 2, LODGE: 2, TROPHY: 4 },
  { TEN: 10, J: 10, Q: 9, K: 9, A: 8, RABBIT: 6, PHEASANT: 5, FOX: 4, STAG: 3, HUNTER: 2, LODGE: 2, TROPHY: 4 },
  { TEN: 10, J: 10, Q: 9, K: 9, A: 8, RABBIT: 6, PHEASANT: 5, FOX: 4, STAG: 3, LODGE: 2, TROPHY: 4 },
];

// Free spins: far more Trophies, no Scatters (retriggers come from Hunters).
export const FREE_REEL_COUNTS: readonly ReelCounts[] = [
  { TEN: 10, J: 10, Q: 9, K: 9, A: 8, RABBIT: 6, PHEASANT: 5, FOX: 4, STAG: 3, TROPHY: 12 },
  { TEN: 10, J: 10, Q: 9, K: 9, A: 8, RABBIT: 6, PHEASANT: 5, FOX: 4, STAG: 3, HUNTER: 2, TROPHY: 12 },
  { TEN: 10, J: 10, Q: 9, K: 9, A: 8, RABBIT: 6, PHEASANT: 5, FOX: 4, STAG: 3, HUNTER: 2, TROPHY: 12 },
  { TEN: 10, J: 10, Q: 9, K: 9, A: 8, RABBIT: 6, PHEASANT: 5, FOX: 4, STAG: 3, HUNTER: 2, TROPHY: 12 },
  { TEN: 10, J: 10, Q: 9, K: 9, A: 8, RABBIT: 6, PHEASANT: 5, FOX: 4, STAG: 3, TROPHY: 12 },
];

export const BASE_REELS = buildReels(BASE_REEL_COUNTS, STRIP_SPACING, STRIP_SEEDS.base);
export const FREE_REELS = buildReels(FREE_REEL_COUNTS, STRIP_SPACING, STRIP_SEEDS.free);
