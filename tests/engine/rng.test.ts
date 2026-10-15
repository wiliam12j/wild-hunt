import { describe, expect, it } from 'vitest';
import {
  createCryptoRng,
  createSeededRng,
  randomInt,
  weightedPick,
  type Rng,
} from '../../src/engine/rng.ts';

const take = (rng: Rng, n: number) => Array.from({ length: n }, () => rng.next());

describe('seeded rng', () => {
  it('repeats the same sequence for the same seed', () => {
    expect(take(createSeededRng(123), 50)).toEqual(take(createSeededRng(123), 50));
  });

  it('gives different sequences for different seeds', () => {
    expect(take(createSeededRng(1), 10)).not.toEqual(take(createSeededRng(2), 10));
  });

  it('produces floats in [0, 1) with a mean near 0.5', () => {
    const values = take(createSeededRng(7), 100_000);
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    expect(mean).toBeCloseTo(0.5, 2);
  });
});

describe('crypto rng', () => {
  it('produces floats in [0, 1) across buffer refills', () => {
    const rng = createCryptoRng(16);
    for (const v of take(rng, 100)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('randomInt', () => {
  it('covers [0, n) roughly uniformly', () => {
    const rng = createSeededRng(99);
    const n = 30;
    const draws = 300_000;
    const counts = new Array<number>(n).fill(0);
    for (let i = 0; i < draws; i++) counts[randomInt(rng, n)]!++;
    for (const c of counts) expect(Math.abs(c - draws / n)).toBeLessThan(draws / n * 0.05);
  });
});

describe('weightedPick', () => {
  it('picks in proportion to weight', () => {
    const rng = createSeededRng(5);
    const items = [
      { id: 'a', weight: 1 },
      { id: 'b', weight: 3 },
      { id: 'c', weight: 6 },
    ];
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    const draws = 100_000;
    for (let i = 0; i < draws; i++) counts[weightedPick(rng, items).id]!++;
    expect(counts.a! / draws).toBeCloseTo(0.1, 2);
    expect(counts.b! / draws).toBeCloseTo(0.3, 2);
    expect(counts.c! / draws).toBeCloseTo(0.6, 2);
  });

  it('returns the only item from a single-entry table', () => {
    expect(weightedPick(createSeededRng(1), [{ weight: 5 }])).toEqual({ weight: 5 });
  });
});
