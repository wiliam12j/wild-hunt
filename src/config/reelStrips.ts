import type { ReelSet, SymbolId } from './types.ts';

// Placeholder strips. Balanced in Phase 3 by editing these only.
// Hunter appears on reels 2-4 only (see GAME.wildReels).

const T: SymbolId = 'TEN';
const J: SymbolId = 'J';
const Q: SymbolId = 'Q';
const K: SymbolId = 'K';
const A: SymbolId = 'A';
const RB: SymbolId = 'RABBIT';
const PH: SymbolId = 'PHEASANT';
const FX: SymbolId = 'FOX';
const ST: SymbolId = 'STAG';
const W: SymbolId = 'HUNTER';
const SC: SymbolId = 'LODGE';
const cR: SymbolId = 'CASH_RABBIT';
const cP: SymbolId = 'CASH_PHEASANT';
const cF: SymbolId = 'CASH_FOX';
const cD: SymbolId = 'CASH_DEER';
const cG: SymbolId = 'CASH_GOLDEN_STAG';

export const BASE_REELS: ReelSet = [
  [A, T, K, RB, J, Q, SC, T, PH, A, J, K, FX, Q, T, cR, J, ST, K, A, Q, RB, T, J, PH, Q, K, cP, A, T],
  [K, Q, W, T, RB, J, A, SC, Q, PH, T, K, cR, J, FX, A, Q, T, W, ST, K, J, RB, A, cF, T, Q, PH, J, K],
  [Q, J, T, PH, A, W, K, RB, SC, T, Q, cR, J, FX, K, A, T, ST, Q, cD, J, W, RB, K, T, A, PH, Q, cP, J],
  [T, A, RB, Q, K, W, J, PH, T, SC, A, cR, Q, FX, J, K, T, W, ST, A, Q, cF, RB, J, T, K, PH, A, cG, Q],
  [J, K, PH, T, A, Q, RB, SC, J, T, FX, K, cR, A, Q, ST, T, J, RB, K, cP, A, Q, PH, T, J, cD, K, A, Q],
];

// Free spins: far more Cash symbols, no Scatters (retriggers come from Hunters).
export const FREE_REELS: ReelSet = [
  [A, cR, K, RB, J, cP, Q, T, PH, cR, A, J, FX, cF, Q, T, cR, ST, K, cD, A, Q, RB, cP, T, J, PH, cR, K, cG],
  [K, cR, W, T, RB, cP, J, A, Q, PH, cR, T, K, W, FX, cF, A, Q, ST, cD, J, RB, W, cR, T, Q, PH, cP, K, J],
  [Q, cP, J, T, W, PH, cR, A, K, RB, cF, T, Q, W, FX, cR, K, A, ST, cD, J, W, RB, cP, T, Q, PH, cR, cG, K],
  [T, cR, A, RB, W, Q, cP, K, J, PH, cR, T, A, W, FX, cF, Q, J, ST, cD, K, W, RB, cR, T, A, PH, cP, Q, J],
  [J, cR, K, PH, T, cP, A, Q, RB, cR, J, T, FX, cF, K, A, ST, cR, Q, cD, T, RB, J, cP, K, PH, A, cR, Q, cG],
];
