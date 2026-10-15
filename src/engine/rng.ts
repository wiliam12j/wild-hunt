/** Source of uniform randomness. */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
}

const UINT32 = 0x1_0000_0000;

/** splitmix32: expands one 32-bit seed into well-mixed state words. */
function splitmix32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) >>> 0;
  };
}

/**
 * Seedable PRNG (sfc32, period ~2^128) for tests and simulation.
 * Same seed, same sequence, on every platform.
 */
export function createSeededRng(seed: number): Rng {
  const init = splitmix32(seed);
  let a = init();
  let b = init();
  let c = init();
  let d = init();
  return {
    next() {
      const t = (((a + b) >>> 0) + d) >>> 0;
      d = (d + 1) >>> 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) >>> 0;
      c = ((c << 21) | (c >>> 11)) >>> 0;
      c = (c + t) >>> 0;
      return t / UINT32;
    },
  };
}

interface CryptoLike {
  getRandomValues<T extends Uint32Array>(array: T): T;
}

/** Live-game RNG backed by crypto.getRandomValues (browser and Node 19+). */
export function createCryptoRng(bufferSize = 256): Rng {
  const crypto = (globalThis as { crypto?: CryptoLike }).crypto;
  if (!crypto) throw new Error('crypto.getRandomValues is not available');
  const buffer = new Uint32Array(bufferSize);
  let index = bufferSize;
  return {
    next() {
      if (index >= bufferSize) {
        crypto.getRandomValues(buffer);
        index = 0;
      }
      return buffer[index++]! / UINT32;
    },
  };
}

/** Uniform integer in [0, n). */
export function randomInt(rng: Rng, n: number): number {
  return Math.floor(rng.next() * n);
}

/** Picks one item with probability proportional to its weight. */
export function weightedPick<T extends { readonly weight: number }>(rng: Rng, items: readonly T[]): T {
  let total = 0;
  for (const item of items) total += item.weight;
  let r = rng.next() * total;
  for (const item of items) {
    r -= item.weight;
    if (r < 0) return item;
  }
  // Only reachable through float rounding at the very top of the range.
  return items[items.length - 1]!;
}
