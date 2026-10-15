import { createSeededRng, randomInt } from '../engine/rng.ts';
import type { ReelCounts, ReelSet, ReelStrip, SymbolId } from './types.ts';

/**
 * Lays out a reel strip from symbol counts, deterministically for a given seed.
 *
 * Symbols listed in `spacing` are spread evenly around the strip and kept at least that
 * many positions apart (circularly), so e.g. a 3-row window never shows two Scatters on one
 * reel. Everything else is shuffled into the remaining slots.
 */
export function buildStrip(
  counts: ReelCounts,
  spacing: Readonly<Partial<Record<SymbolId, number>>>,
  seed: number,
): ReelStrip {
  const rng = createSeededRng(seed);
  const entries = Object.entries(counts) as [SymbolId, number][];
  const length = entries.reduce((n, [, c]) => n + c, 0);
  const strip = new Array<SymbolId | undefined>(length).fill(undefined);

  const spaced = entries.filter(([id, c]) => c > 0 && spacing[id] !== undefined);
  for (const [id, count] of spaced) {
    const offset = randomInt(rng, length);
    for (let i = 0; i < count; i++) {
      let pos = Math.floor(offset + (i * length) / count) % length;
      while (strip[pos] !== undefined) pos = (pos + 1) % length;
      strip[pos] = id;
    }
  }

  const rest: SymbolId[] = [];
  for (const [id, count] of entries) {
    if (spacing[id] === undefined) for (let i = 0; i < count; i++) rest.push(id);
  }
  for (let i = rest.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1);
    [rest[i], rest[j]] = [rest[j]!, rest[i]!];
  }
  let next = 0;
  for (let i = 0; i < length; i++) if (strip[i] === undefined) strip[i] = rest[next++]!;

  const result = strip as SymbolId[];
  for (const [id] of spaced) {
    const gap = minGap(result, id);
    if (gap < spacing[id]!) {
      throw new Error(`Strip too dense: ${id} only ${gap} apart, needs ${spacing[id]}. Lower its count.`);
    }
  }
  return result;
}

/** Smallest circular distance between two copies of `id` (Infinity if fewer than two). */
export function minGap(strip: ReelStrip, id: SymbolId): number {
  const at = strip.flatMap((s, i) => (s === id ? [i] : []));
  if (at.length < 2) return Infinity;
  let gap = strip.length - at[at.length - 1]! + at[0]!;
  for (let i = 1; i < at.length; i++) gap = Math.min(gap, at[i]! - at[i - 1]!);
  return gap;
}

export function buildReels(
  reels: readonly ReelCounts[],
  spacing: Readonly<Partial<Record<SymbolId, number>>>,
  seed: number,
): ReelSet {
  return reels.map((counts, i) => buildStrip(counts, spacing, seed + i));
}
