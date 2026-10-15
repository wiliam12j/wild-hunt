import { describe, expect, it } from 'vitest';
import { buildStrip, minGap } from '../src/config/buildStrip.ts';
import type { ReelCounts } from '../src/config/types.ts';

const counts: ReelCounts = { TEN: 10, J: 10, Q: 8, LODGE: 3, HUNTER: 2, TROPHY: 5 };

describe('buildStrip', () => {
  it('contains exactly the requested symbol counts', () => {
    const strip = buildStrip(counts, { LODGE: 3 }, 1);
    expect(strip).toHaveLength(38);
    for (const [id, n] of Object.entries(counts)) expect(strip.filter((s) => s === id)).toHaveLength(n);
  });

  it('is deterministic for a seed and varies across seeds', () => {
    expect(buildStrip(counts, {}, 7)).toEqual(buildStrip(counts, {}, 7));
    expect(buildStrip(counts, {}, 7)).not.toEqual(buildStrip(counts, {}, 8));
  });

  it('keeps spaced symbols apart, including across the wrap', () => {
    for (let seed = 0; seed < 50; seed++) {
      const strip = buildStrip(counts, { LODGE: 3, HUNTER: 3 }, seed);
      expect(minGap(strip, 'LODGE')).toBeGreaterThanOrEqual(3);
      expect(minGap(strip, 'HUNTER')).toBeGreaterThanOrEqual(3);
    }
  });

  it('refuses a strip too dense to space', () => {
    expect(() => buildStrip({ TEN: 2, LODGE: 4 }, { LODGE: 3 }, 1)).toThrow(/too dense/);
  });
});

describe('minGap', () => {
  it('measures circular distance', () => {
    expect(minGap(['LODGE', 'TEN', 'TEN', 'TEN', 'LODGE', 'TEN'], 'LODGE')).toBe(2);
    expect(minGap(['LODGE', 'TEN', 'TEN'], 'LODGE')).toBe(Infinity);
  });
});
