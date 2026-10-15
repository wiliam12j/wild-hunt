import type { MatchCount } from '../config/types.ts';
import { findKind } from './grid.ts';
import type { EngineConfig, Grid, ScatterResult } from './types.ts';

/** Counts Scatters anywhere; 3+ award free spins and a bonus in multiples of total bet. */
export function evaluateScatter(grid: Grid, cfg: EngineConfig): ScatterResult {
  const positions = findKind(grid, cfg, 'scatter');
  const count = positions.length;
  if (count < cfg.freeSpins.minScatters) return { count, positions, freeSpins: 0, win: 0 };

  // More scatters than the table covers pay as the top entry.
  const key = Math.min(count, cfg.reels) as MatchCount;
  return {
    count,
    positions,
    freeSpins: cfg.freeSpins.spinsByScatterCount[key],
    win: cfg.freeSpins.scatterPayByCount[key],
  };
}

export const NO_SCATTER: ScatterResult = { count: 0, positions: [], freeSpins: 0, win: 0 };
