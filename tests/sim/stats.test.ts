import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/engine/defaultConfig.ts';
import { playRound } from '../../src/engine/freeSpins.ts';
import { createSeededRng } from '../../src/engine/rng.ts';
import { BUCKET_LABELS, bucketIndex, emptyStats, merge, record, report } from '../../sim/stats.ts';

const ladder = DEFAULT_CONFIG.freeSpins.multiplierLadder;

function simulate(seed: number, rounds: number) {
  const rng = createSeededRng(seed);
  const stats = emptyStats(ladder.length);
  for (let i = 0; i < rounds; i++) record(stats, playRound(rng), ladder);
  return stats;
}

describe('bucketIndex', () => {
  it.each([
    [0, '0x'],
    [0.5, '<1x'],
    [1, '1-5x'],
    [4.99, '1-5x'],
    [5, '5-20x'],
    [99, '20-100x'],
    [100, '100-1000x'],
    [1000, '1000x+'],
    [10_000, '1000x+'],
  ])('puts %f in %s', (win, label) => {
    expect(BUCKET_LABELS[bucketIndex(win)]).toBe(label);
  });
});

describe('sim stats', () => {
  it('splits total win into base and free spins', () => {
    const stats = simulate(1, 5_000);
    expect(stats.rounds).toBe(5_000);
    expect(stats.baseWin + stats.freeWin).toBeCloseTo(stats.totalWin, 6);
    expect(stats.baseLineWin + stats.baseCollectWin + stats.scatterWin).toBeCloseTo(stats.baseWin, 6);
    expect(stats.buckets.reduce((a, b) => a + b, 0)).toBe(5_000);
    expect(stats.finalLevel.reduce((a, b) => a + b, 0)).toBe(stats.triggers);
  });

  it('merges chunks into the same totals as one run', () => {
    const a = simulate(1, 2_000);
    const b = simulate(2, 3_000);
    const merged = merge(a, b);
    expect(merged.rounds).toBe(5_000);
    expect(merged.totalWin).toBeCloseTo(a.totalWin + b.totalWin, 6);
    expect(merged.maxWin).toBe(Math.max(a.maxWin, b.maxWin));
    expect(merged.buckets).toEqual(a.buckets.map((v, i) => v + b.buckets[i]!));
  });

  it('reports RTP as total win over rounds, with matching parts', () => {
    const stats = simulate(3, 5_000);
    const r = report(stats, ladder);
    expect(r.rtp).toBeCloseTo(stats.totalWin / stats.rounds, 9);
    expect(r.baseRtp + r.freeRtp).toBeCloseTo(r.rtp, 9);
    expect(Object.values(r.buckets).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
  });
});
