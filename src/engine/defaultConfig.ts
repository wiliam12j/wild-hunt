import { CASH_VALUES, TROPHY_WEIGHTS } from '../config/cashValues.ts';
import { FREE_SPINS } from '../config/freeSpins.ts';
import { GAME } from '../config/game.ts';
import { PAYLINES } from '../config/paylines.ts';
import { PAYTABLE } from '../config/paytable.ts';
import { BASE_REELS, FREE_REELS } from '../config/reelStrips.ts';
import { SYMBOLS } from '../config/symbols.ts';
import type { EngineConfig } from './types.ts';

export const DEFAULT_CONFIG: EngineConfig = {
  reels: GAME.reels,
  rows: GAME.rows,
  minMatch: GAME.minMatch,
  maxWinMultiplier: GAME.maxWinMultiplier,
  symbols: SYMBOLS,
  paylines: PAYLINES,
  paytable: PAYTABLE,
  baseReels: BASE_REELS,
  freeReels: FREE_REELS,
  cashValues: CASH_VALUES,
  trophyWeights: TROPHY_WEIGHTS,
  freeSpins: FREE_SPINS,
};
