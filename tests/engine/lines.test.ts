import { describe, expect, it } from 'vitest';
import type { SymbolId } from '../../src/config/types.ts';
import { DEFAULT_CONFIG } from '../../src/engine/defaultConfig.ts';
import { evaluateLine, evaluateLines } from '../../src/engine/lines.ts';
import { DEAD_ROW, S, gridFromRows } from './helpers.ts';

const cfg = DEFAULT_CONFIG;
const lines = cfg.paylines.length;
const MIDDLE = 0; // payline 1 is the middle row

/** Evaluates payline 1 with the given middle row and dead rows above and below. */
function middle(row: readonly SymbolId[]) {
  return evaluateLine(gridFromRows([DEAD_ROW, row, DEAD_ROW]), cfg, MIDDLE);
}

describe('evaluateLine', () => {
  it('pays 3, 4 and 5 of a kind from the left, in multiples of total bet', () => {
    expect(middle([S.A, S.A, S.A, S.K, S.Q])).toMatchObject({ symbol: S.A, count: 3, win: 10 / lines });
    expect(middle([S.ST, S.ST, S.ST, S.ST, S.Q])).toMatchObject({ symbol: S.ST, count: 4, win: 100 / lines });
    expect(middle([S.FX, S.FX, S.FX, S.FX, S.FX])).toMatchObject({ symbol: S.FX, count: 5, win: 250 / lines });
  });

  it('does not pay 2 of a kind or matches that skip the first reel', () => {
    expect(middle([S.A, S.A, S.K, S.K, S.K])).toBeNull();
    expect(middle([S.Q, S.A, S.A, S.A, S.A])).toBeNull();
  });

  it('lets the Hunter substitute anywhere in the run', () => {
    expect(middle([S.A, S.W, S.A, S.K, S.Q])).toMatchObject({ symbol: S.A, count: 3 });
    expect(middle([S.W, S.ST, S.W, S.ST, S.Q])).toMatchObject({ symbol: S.ST, count: 4 });
    expect(middle([S.W, S.W, S.RB, S.K, S.Q])).toMatchObject({ symbol: S.RB, count: 3 });
  });

  it('pays Hunters as their own line when that beats the substituted symbol', () => {
    // 3 Hunters (50) beats 4 Tens (15).
    expect(middle([S.W, S.W, S.W, S.T, S.J])).toMatchObject({ symbol: S.W, count: 3, win: 50 / lines });
    // 5 Foxes (250) beats 3 Hunters (50).
    expect(middle([S.W, S.W, S.W, S.FX, S.FX])).toMatchObject({ symbol: S.FX, count: 5, win: 250 / lines });
    expect(middle([S.W, S.W, S.W, S.W, S.W])).toMatchObject({ symbol: S.W, count: 5, win: 1000 / lines });
  });

  it('never substitutes for Scatter or Cash symbols', () => {
    expect(middle([S.SC, S.W, S.SC, S.SC, S.Q])).toBeNull();
    expect(middle([S.cR, S.W, S.cR, S.K, S.Q])).toBeNull();
    expect(middle([S.A, S.A, S.SC, S.A, S.A])).toBeNull();
    // Hunters before a Cash symbol still pay as Hunters.
    expect(middle([S.W, S.W, S.W, S.cR, S.Q])).toMatchObject({ symbol: S.W, count: 3 });
  });

  it('returns the winning cells along the payline', () => {
    const grid = gridFromRows([
      [S.K, S.Q, S.J, S.T, S.A],
      [S.Q, S.K, S.T, S.K, S.J],
      [S.J, S.T, S.K, S.Q, S.A],
    ]);
    // Payline 4 is the V shape: rows 0,1,2,1,0.
    expect(evaluateLine(grid, cfg, 3)).toMatchObject({
      symbol: S.K,
      count: 4,
      positions: [
        { reel: 0, row: 0 },
        { reel: 1, row: 1 },
        { reel: 2, row: 2 },
        { reel: 3, row: 1 },
      ],
    });
  });
});

describe('evaluateLines', () => {
  it('sums wins across every payline', () => {
    const grid = gridFromRows([
      [S.A, S.A, S.A, S.A, S.A],
      [S.K, S.K, S.K, S.J, S.Q],
      [S.T, S.Q, S.J, S.K, S.T],
    ]);
    const wins = evaluateLines(grid, cfg);
    const byLine = Object.fromEntries(wins.map((w) => [w.line, [w.symbol, w.count]]));
    // Every other line breaks on reel 2 (e.g. line 8 reads K, A, ...).
    expect(byLine).toEqual({
      0: [S.K, 3], // middle row
      1: [S.A, 5], // top row
    });
    expect(wins.reduce((sum, w) => sum + w.win, 0)).toBeCloseTo((5 + 75) / lines);
  });

  it('returns nothing for a dead grid', () => {
    expect(evaluateLines(gridFromRows([DEAD_ROW, [S.J, S.K, S.T, S.A, S.Q], DEAD_ROW]), cfg)).toEqual([]);
  });
});
