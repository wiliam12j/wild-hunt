export const GAME = {
  reels: 5,
  rows: 3,
  /** Fewest left-to-right matches that pay. */
  minMatch: 3,
  /** 0-based reel indices where the Hunter Wild may appear (reels 2-4). */
  wildReels: [1, 2, 3],
  /** A round ends immediately once total win reaches this many times the total bet. */
  maxWinMultiplier: 10_000,
  /** Win overlay thresholds, in multiples of total bet. */
  winTiers: {
    big: 15,
    mega: 30,
    epic: 100,
  },
} as const;
