import type { Paytable } from './types.ts';

// Multiples of the line bet. Starting placeholders; tune with the simulator.
export const PAYTABLE: Paytable = {
  TEN: { 3: 5, 4: 15, 5: 40 },
  J: { 3: 5, 4: 15, 5: 40 },
  Q: { 3: 5, 4: 20, 5: 50 },
  K: { 3: 5, 4: 20, 5: 50 },
  A: { 3: 10, 4: 25, 5: 75 },

  RABBIT: { 3: 10, 4: 30, 5: 100 },
  PHEASANT: { 3: 15, 4: 50, 5: 150 },
  FOX: { 3: 20, 4: 75, 5: 250 },
  STAG: { 3: 30, 4: 100, 5: 500 },

  HUNTER: { 3: 50, 4: 200, 5: 1000 },
};
