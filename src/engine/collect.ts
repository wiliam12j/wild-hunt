import { findKind } from './grid.ts';
import type { CashSymbol, CollectResult, EngineConfig, Grid } from './types.ts';

/**
 * Each Hunter on the grid collects every visible Cash symbol, so two Hunters pay the
 * Cash twice. Nothing is collected unless at least one Hunter and one Cash symbol land.
 */
export function evaluateCollect(
  grid: Grid,
  cash: readonly CashSymbol[],
  multiplier: number,
  cfg: EngineConfig,
): CollectResult {
  const hunters = findKind(grid, cfg, 'wild');
  if (hunters.length === 0 || cash.length === 0) {
    return { hunters: [], cashTotal: 0, multiplier, win: 0 };
  }
  const cashTotal = cash.reduce((sum, c) => sum + c.value, 0);
  return { hunters, cashTotal, multiplier, win: cashTotal * hunters.length * multiplier };
}
