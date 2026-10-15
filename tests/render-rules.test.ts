import { describe, expect, it } from 'vitest';
import { GAME } from '../src/config/game.ts';
import { SYMBOLS } from '../src/config/symbols.ts';
import { anticipatingReels, winTier } from '../src/render/rules.ts';
import { DEAD_ROW, S, gridFromRows } from './engine/helpers.ts';

describe('winTier', () => {
  const tiers = GAME.winTiers;
  it.each([
    [0, null],
    [tiers.big - 0.01, null],
    [tiers.big, 'big'],
    [tiers.mega, 'mega'],
    [tiers.epic - 1, 'mega'],
    [tiers.epic, 'epic'],
    [10_000, 'epic'],
  ])('%f× is %s', (x, tier) => {
    expect(winTier(x, tiers)).toBe(tier);
  });
});

describe('anticipatingReels', () => {
  const rule = { scatters: 2, collect: true };

  it('slows every reel after the second Scatter lands', () => {
    const grid = gridFromRows([[S.SC, S.A, S.K, S.Q, S.J], [S.T, S.SC, S.J, S.A, S.Q], DEAD_ROW]);
    expect(anticipatingReels(grid, SYMBOLS, rule)).toEqual([false, false, true, true, true]);
  });

  it('slows the reels after a Hunter and a Trophy have both landed', () => {
    const grid = gridFromRows([[S.cR, S.A, S.K, S.Q, S.J], [S.T, S.J, S.W, S.A, S.Q], DEAD_ROW]);
    expect(anticipatingReels(grid, SYMBOLS, rule)).toEqual([false, false, false, true, true]);
    expect(anticipatingReels(grid, SYMBOLS, { ...rule, collect: false })).toEqual([false, false, false, false, false]);
  });

  it('does nothing on a quiet spin', () => {
    const grid = gridFromRows([DEAD_ROW, [S.SC, S.J, S.T, S.A, S.Q], DEAD_ROW]);
    expect(anticipatingReels(grid, SYMBOLS, rule)).toEqual([false, false, false, false, false]);
  });
});
