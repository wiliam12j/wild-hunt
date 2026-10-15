import { describe, expect, it } from 'vitest';
import { evaluateCollect } from '../../src/engine/collect.ts';
import { DEFAULT_CONFIG } from '../../src/engine/defaultConfig.ts';
import { evaluateScatter } from '../../src/engine/scatter.ts';
import type { CashSymbol } from '../../src/engine/types.ts';
import { DEAD_ROW, S, gridFromRows } from './helpers.ts';

const cfg = DEFAULT_CONFIG;

describe('evaluateCollect', () => {
  const cash: CashSymbol[] = [
    { reel: 0, row: 0, symbol: S.cR, value: 3 },
    { reel: 4, row: 2, symbol: S.cF, value: 10 },
  ];

  it('collects nothing without a Hunter', () => {
    const grid = gridFromRows([[S.cR, S.A, S.K, S.Q, S.J], DEAD_ROW, [S.T, S.J, S.Q, S.K, S.cF]]);
    expect(evaluateCollect(grid, cash, 1, cfg)).toMatchObject({ hunters: [], win: 0 });
  });

  it('collects nothing without Cash symbols', () => {
    const grid = gridFromRows([DEAD_ROW, [S.T, S.W, S.Q, S.K, S.A], DEAD_ROW]);
    expect(evaluateCollect(grid, [], 3, cfg)).toMatchObject({ hunters: [], win: 0 });
  });

  it('adds every Cash value, times the multiplier', () => {
    const grid = gridFromRows([
      [S.cR, S.A, S.K, S.Q, S.J],
      [S.T, S.W, S.Q, S.K, S.A],
      [S.T, S.J, S.Q, S.K, S.cF],
    ]);
    expect(evaluateCollect(grid, cash, 1, cfg)).toEqual({
      hunters: [{ reel: 1, row: 1 }],
      cashTotal: 13,
      multiplier: 1,
      win: 13,
    });
    expect(evaluateCollect(grid, cash, 3, cfg).win).toBe(39);
  });

  it('pays the Cash once per Hunter', () => {
    const grid = gridFromRows([
      [S.cR, S.W, S.K, S.Q, S.J],
      [S.T, S.A, S.Q, S.W, S.A],
      [S.T, S.J, S.Q, S.K, S.cF],
    ]);
    expect(evaluateCollect(grid, cash, 2, cfg)).toMatchObject({ cashTotal: 13, win: 13 * 2 * 2 });
  });
});

describe('evaluateScatter', () => {
  it('does not trigger on 2 Scatters', () => {
    const grid = gridFromRows([[S.SC, S.A, S.K, S.Q, S.J], DEAD_ROW, [S.T, S.J, S.Q, S.K, S.SC]]);
    expect(evaluateScatter(grid, cfg)).toMatchObject({ count: 2, freeSpins: 0, win: 0 });
  });

  it.each([
    [3, 10],
    [4, 15],
    [5, 20],
  ] as const)('%i Scatters anywhere award %i free spins and the scatter bonus', (n, spins) => {
    const row = DEAD_ROW.map((s, i) => (i < n ? S.SC : s));
    const grid = gridFromRows([DEAD_ROW, DEAD_ROW, row]);
    expect(evaluateScatter(grid, cfg)).toMatchObject({
      count: n,
      freeSpins: spins,
      win: cfg.freeSpins.scatterPayByCount[n],
    });
  });
});
