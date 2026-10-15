import { GAME } from './game.ts';

export const AUTOPLAY = {
  /** Spin counts offered in the autoplay menu. */
  counts: [10, 25, 50, 100] as readonly number[],
  /** "Stop on big win" triggers at a round win of at least this many times the total bet. */
  bigWinStopMultiplier: GAME.winTiers.big,
} as const;
