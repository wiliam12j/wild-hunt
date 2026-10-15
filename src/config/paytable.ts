import type { Paytable } from './types.ts';

// Multiples of the line bet. Tuned with the simulator (see sim/results).
export const PAYTABLE: Paytable = {
  TEN: { 3: 8, 4: 25, 5: 60 },
  J: { 3: 8, 4: 25, 5: 60 },
  Q: { 3: 8, 4: 30, 5: 75 },
  K: { 3: 8, 4: 30, 5: 75 },
  A: { 3: 15, 4: 40, 5: 120 },

  RABBIT: { 3: 15, 4: 45, 5: 150 },
  PHEASANT: { 3: 20, 4: 75, 5: 250 },
  FOX: { 3: 30, 4: 100, 5: 400 },
  STAG: { 3: 50, 4: 150, 5: 750 },

  // No HUNTER entry: it only lands on reels 2-4, so it can't start a line. It still
  // substitutes for the symbols above.
};
