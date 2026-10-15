import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/engine/defaultConfig.ts';
import { gridColumn, spinGrid } from '../../src/engine/grid.ts';
import { createSeededRng } from '../../src/engine/rng.ts';
import { assignCashValues } from '../../src/engine/cash.ts';
import { S, gridFromRows } from './helpers.ts';

describe('spinGrid', () => {
  it('shows `rows` consecutive symbols from each stop', () => {
    const { grid, stops } = spinGrid(createSeededRng(3), DEFAULT_CONFIG.baseReels, DEFAULT_CONFIG.rows);
    expect(grid).toHaveLength(DEFAULT_CONFIG.reels);
    grid.forEach((column, reel) => {
      const strip = DEFAULT_CONFIG.baseReels[reel]!;
      expect(stops[reel]).toBeGreaterThanOrEqual(0);
      expect(stops[reel]).toBeLessThan(strip.length);
      expect(column).toEqual(gridColumn(strip, stops[reel]!, DEFAULT_CONFIG.rows));
    });
  });

  it('wraps around the end of the strip', () => {
    expect(gridColumn([S.A, S.K, S.Q, S.J], 3, 3)).toEqual([S.J, S.A, S.K]);
  });

  it('is deterministic for a seed', () => {
    const a = spinGrid(createSeededRng(42), DEFAULT_CONFIG.baseReels, 3);
    const b = spinGrid(createSeededRng(42), DEFAULT_CONFIG.baseReels, 3);
    expect(a).toEqual(b);
  });
});

describe('assignCashValues', () => {
  it('gives every Cash symbol a value from its table, and nothing else', () => {
    const grid = gridFromRows([
      [S.cR, S.A, S.cG, S.K, S.cD],
      [S.T, S.W, S.J, S.SC, S.Q],
      [S.cP, S.cF, S.A, S.K, S.T],
    ]);
    const cash = assignCashValues(createSeededRng(1), grid, DEFAULT_CONFIG);
    expect(cash.map((c) => [c.reel, c.row, c.symbol])).toEqual([
      [0, 0, S.cR],
      [0, 2, S.cP],
      [1, 2, S.cF],
      [2, 0, S.cG],
      [4, 0, S.cD],
    ]);
    for (const c of cash) {
      const allowed = DEFAULT_CONFIG.cashValues[c.symbol].map((v) => v.value);
      expect(allowed).toContain(c.value);
    }
  });
});
