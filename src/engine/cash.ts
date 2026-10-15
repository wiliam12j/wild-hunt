import type { CashSymbolId } from '../config/types.ts';
import { findKind } from './grid.ts';
import { weightedPick, type Rng } from './rng.ts';
import type { CashSymbol, EngineConfig, Grid } from './types.ts';

/** Draws a value for every Cash symbol on the grid. Values show whether or not a Hunter lands. */
export function assignCashValues(rng: Rng, grid: Grid, cfg: EngineConfig): CashSymbol[] {
  return findKind(grid, cfg, 'cash').map(({ reel, row }) => {
    const symbol = grid[reel]![row] as CashSymbolId;
    const { value } = weightedPick(rng, cfg.cashValues[symbol]);
    return { reel, row, symbol, value };
  });
}
