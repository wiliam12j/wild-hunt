import type { CashSymbolId, SymbolId, TrophyWeights } from '../config/types.ts';
import { findKind } from './grid.ts';
import { weightedPick, type Rng } from './rng.ts';
import type { CashSymbol, EngineConfig, Grid, SpunGrid } from './types.ts';

const trophyTables = new WeakMap<TrophyWeights, readonly { id: CashSymbolId; weight: number }[]>();

function trophyTable(weights: TrophyWeights) {
  let table = trophyTables.get(weights);
  if (!table) {
    table = (Object.entries(weights) as [CashSymbolId, number][])
      .filter(([, weight]) => weight > 0)
      .map(([id, weight]) => ({ id, weight }));
    trophyTables.set(weights, table);
  }
  return table;
}

/** Replaces every landed Trophy with a Cash symbol drawn by weight. */
export function landTrophies(rng: Rng, grid: Grid, weights: TrophyWeights, cfg: EngineConfig): Grid {
  const trophies = findKind(grid, cfg, 'trophy');
  if (trophies.length === 0) return grid;
  const table = trophyTable(weights);
  const landed: SymbolId[][] = grid.map((column) => [...column]);
  for (const { reel, row } of trophies) landed[reel]![row] = weightedPick(rng, table).id;
  return landed;
}

/** Draws a value for every Cash symbol on the grid. Values show whether or not a Hunter lands. */
export function assignCashValues(rng: Rng, grid: Grid, cfg: EngineConfig): CashSymbol[] {
  return findKind(grid, cfg, 'cash').map(({ reel, row }) => {
    const symbol = grid[reel]![row] as CashSymbolId;
    const { value } = weightedPick(rng, cfg.cashValues[symbol]);
    return { reel, row, symbol, value };
  });
}

/** Lands Trophies as Cash symbols, then values every Cash symbol on the grid. */
export function landCash(
  rng: Rng,
  spun: SpunGrid,
  weights: TrophyWeights,
  cfg: EngineConfig,
): { spun: SpunGrid; cash: CashSymbol[] } {
  const grid = landTrophies(rng, spun.grid, weights, cfg);
  return { spun: { ...spun, grid }, cash: assignCashValues(rng, grid, cfg) };
}
