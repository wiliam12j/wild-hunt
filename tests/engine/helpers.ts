import type { SymbolId } from '../../src/config/types.ts';
import { DEFAULT_CONFIG } from '../../src/engine/defaultConfig.ts';
import type { EngineConfig, Grid, SpunGrid } from '../../src/engine/types.ts';

/** Short aliases so test grids read like the screen. */
export const S = {
  T: 'TEN',
  J: 'J',
  Q: 'Q',
  K: 'K',
  A: 'A',
  RB: 'RABBIT',
  PH: 'PHEASANT',
  FX: 'FOX',
  ST: 'STAG',
  W: 'HUNTER',
  SC: 'LODGE',
  cR: 'CASH_RABBIT',
  cP: 'CASH_PHEASANT',
  cF: 'CASH_FOX',
  cD: 'CASH_DEER',
  cG: 'CASH_GOLDEN_STAG',
} as const satisfies Record<string, SymbolId>;

/** Builds grid[reel][row] from rows as they appear on screen (top row first). */
export function gridFromRows(rows: readonly (readonly SymbolId[])[]): Grid {
  const reels = rows[0]!.length;
  return Array.from({ length: reels }, (_, reel) => rows.map((row) => row[reel]!));
}

export function spun(rows: readonly (readonly SymbolId[])[]): SpunGrid {
  const grid = gridFromRows(rows);
  return { grid, stops: grid.map(() => 0) };
}

/** Filler row that never forms a line win on its own. */
export const DEAD_ROW: readonly SymbolId[] = [S.T, S.J, S.Q, S.K, S.A];

/** The default config with overrides, for tests that need controllable outcomes. */
export function testConfig(overrides: Partial<EngineConfig> = {}): EngineConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

/**
 * One-row config with a single straight payline and length-1 strips, so every spin is
 * fully determined by the strips.
 */
export function oneRowConfig(
  base: readonly SymbolId[],
  free: readonly SymbolId[],
  overrides: Partial<EngineConfig> = {},
): EngineConfig {
  return testConfig({
    rows: 1,
    paylines: [[0, 0, 0, 0, 0]],
    baseReels: base.map((s) => [s]),
    freeReels: free.map((s) => [s]),
    cashValues: {
      CASH_RABBIT: [{ value: 1, weight: 1 }],
      CASH_PHEASANT: [{ value: 5, weight: 1 }],
      CASH_FOX: [{ value: 10, weight: 1 }],
      CASH_DEER: [{ value: 25, weight: 1 }],
      CASH_GOLDEN_STAG: [{ value: 100, weight: 1 }],
    },
    ...overrides,
  });
}
