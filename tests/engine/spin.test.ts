import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/engine/defaultConfig.ts';
import { playFreeSpins, playRound } from '../../src/engine/freeSpins.ts';
import { createSeededRng } from '../../src/engine/rng.ts';
import { resolveSpin, spinBase } from '../../src/engine/spin.ts';
import type { CashSymbol } from '../../src/engine/types.ts';
import { S, oneRowConfig, spun } from './helpers.ts';

const cfg = DEFAULT_CONFIG;

describe('resolveSpin', () => {
  const grid = spun([
    [S.SC, S.A, S.SC, S.Q, S.cR],
    [S.A, S.W, S.A, S.K, S.Q],
    [S.T, S.J, S.Q, S.K, S.SC],
  ]);
  const cash: CashSymbol[] = [{ reel: 4, row: 0, symbol: S.cR, value: 2 }];

  it('adds line wins, collect and scatter bonus', () => {
    const result = resolveSpin(grid, cash, { multiplier: 1, scatters: true, winCap: Infinity }, cfg);
    const lineTotal = result.lineWins.reduce((sum, w) => sum + w.win, 0);
    expect(result.lineWins.find((w) => w.line === 0)).toMatchObject({ symbol: S.A, count: 3 });
    expect(result.collect.win).toBe(2);
    expect(result.scatter).toMatchObject({ count: 3, freeSpins: 10 });
    expect(result.win).toBeCloseTo(lineTotal + 2 + cfg.freeSpins.scatterPayByCount[3]);
    expect(result.capped).toBe(false);
  });

  it('ignores Scatters when they are switched off', () => {
    const result = resolveSpin(grid, cash, { multiplier: 1, scatters: false, winCap: Infinity }, cfg);
    expect(result.scatter).toMatchObject({ count: 0, freeSpins: 0, win: 0 });
  });

  it('caps the win', () => {
    const result = resolveSpin(grid, cash, { multiplier: 1, scatters: true, winCap: 1 }, cfg);
    expect(result).toMatchObject({ win: 1, capped: true });
  });
});

describe('spinBase', () => {
  it('is deterministic for a seed', () => {
    expect(spinBase(createSeededRng(11))).toEqual(spinBase(createSeededRng(11)));
  });

  it('pays a 5-of-a-kind line from the base strips', () => {
    const c = oneRowConfig([S.ST, S.ST, S.ST, S.ST, S.ST], [S.T, S.T, S.T, S.T, S.T]);
    expect(spinBase(createSeededRng(1), c).win).toBe(cfg.paytable.STAG[5]);
  });
});

describe('playFreeSpins', () => {
  // One row: a Hunter on reel 2 and four Rabbit trophies worth 1x each. Every spin the
  // Hunter collects 4x the current multiplier and adds one badge to the meter.
  const free = [S.cR, S.W, S.cR, S.cR, S.cR];
  const base = [S.T, S.J, S.Q, S.K, S.A];
  const ruleset = (retriggerSpins: number, maxWinMultiplier = cfg.maxWinMultiplier) =>
    oneRowConfig(base, free, {
      maxWinMultiplier,
      freeSpins: { ...cfg.freeSpins, huntersPerUpgrade: 4, retriggerSpins, multiplierLadder: [1, 2, 3, 10] },
    });

  it('ends when spins run out without reaching the meter', () => {
    const round = playFreeSpins(createSeededRng(1), 3, ruleset(2));
    expect(round).toMatchObject({ spinsAwarded: 3, retriggers: 0, huntersCollected: 3, win: 12, capped: false });
    expect(round.spins.map((s) => s.spinsRemaining)).toEqual([2, 1, 0]);
  });

  it('retriggers on every 4th collecting Hunter and raises the multiplier from the next spin', () => {
    const round = playFreeSpins(createSeededRng(1), 4, ruleset(2));
    // Spins 1-4 at x1 (4 each); spin 4 fills the meter: +2 spins at x2 (8 each).
    expect(round.spins.map((s) => s.win)).toEqual([4, 4, 4, 4, 8, 8]);
    expect(round.spins.map((s) => s.collect.multiplier)).toEqual([1, 1, 1, 1, 2, 2]);
    expect(round.spins[3]).toMatchObject({ spinsAdded: 2, multiplierAfter: 2, huntersCollected: 4 });
    expect(round).toMatchObject({ retriggers: 1, huntersCollected: 6, finalMultiplier: 2, win: 32 });
  });

  it('only counts Hunters that collect', () => {
    const c = oneRowConfig(base, [S.T, S.W, S.J, S.Q, S.K], {
      freeSpins: { ...cfg.freeSpins, huntersPerUpgrade: 1 },
    });
    const round = playFreeSpins(createSeededRng(1), 5, c);
    expect(round).toMatchObject({ huntersCollected: 0, retriggers: 0 });
    expect(round.spins).toHaveLength(5);
  });

  it('stops at the max-win cap, counting what was already won', () => {
    // x1: 4,4,4,4 (16) → x2: 8,8,8,8 (48) → x3: 12,12,12,12 (96) → x10: 40, capped at 100.
    const round = playFreeSpins(createSeededRng(1), 4, ruleset(10, 100));
    expect(round.spins).toHaveLength(13);
    expect(round.spins.at(-1)).toMatchObject({ win: 4, capped: true, spinsRemaining: 0 });
    expect(round).toMatchObject({ win: 100, capped: true, finalMultiplier: 10 });

    const afterBase = playFreeSpins(createSeededRng(1), 4, ruleset(10, 100), 90);
    expect(afterBase).toMatchObject({ win: 10, capped: true });
  });

  it('keeps retriggering at the top of the ladder', () => {
    const round = playFreeSpins(createSeededRng(1), 4, ruleset(4, 1_000));
    expect(round.finalMultiplier).toBe(10);
    expect(round.retriggers).toBeGreaterThan(3);
  });
});

describe('playRound', () => {
  it('plays the free-spin round triggered by the base spin', () => {
    const c = oneRowConfig([S.SC, S.T, S.SC, S.T, S.SC], [S.T, S.T, S.T, S.T, S.T]);
    const round = playRound(createSeededRng(1), c);
    const fivesTens = c.paytable.TEN[5]; // one payline, so line pay = total-bet multiple
    expect(round.base).toMatchObject({ win: c.freeSpins.scatterPayByCount[3] });
    expect(round.freeSpins).toMatchObject({ spinsAwarded: 10, win: 10 * fivesTens });
    expect(round.win).toBe(c.freeSpins.scatterPayByCount[3] + 10 * fivesTens);
  });

  it('has no free-spin round when nothing triggers', () => {
    const c = oneRowConfig([S.T, S.J, S.Q, S.K, S.A], [S.T, S.T, S.T, S.T, S.T]);
    expect(playRound(createSeededRng(1), c)).toMatchObject({ freeSpins: null, win: 0 });
  });
});

describe('default config smoke run', () => {
  it('stays within the rules over many seeded rounds', () => {
    const rng = createSeededRng(2026);
    let triggered = 0;
    for (let i = 0; i < 20_000; i++) {
      const round = playRound(rng);
      expect(round.win).toBeGreaterThanOrEqual(0);
      expect(round.win).toBeLessThanOrEqual(cfg.maxWinMultiplier);
      round.base.collect.hunters.forEach((h) => expect([1, 2, 3]).toContain(h.reel));
      if (round.freeSpins) {
        triggered++;
        const fs = round.freeSpins;
        if (!fs.capped) {
          expect(fs.spins).toHaveLength(fs.spinsAwarded + fs.retriggers * cfg.freeSpins.retriggerSpins);
        }
        expect(fs.huntersCollected).toBe(fs.spins.reduce((n, s) => n + s.collect.hunters.length, 0));
      }
    }
    expect(triggered).toBeGreaterThan(0);
  });
});
