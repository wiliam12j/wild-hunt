/** Per-run (or lifetime) totals. Money in cents. */
export interface SessionStats {
  spins: number;
  wageredCents: number;
  wonCents: number;
  biggestWinCents: number;
  /** Biggest round win as a multiple of its bet. */
  biggestWinX: number;
  freeSpinRounds: number;
  bestFreeSpinRoundCents: number;
  bestFreeSpinRoundX: number;
}

export function emptySession(): SessionStats {
  return {
    spins: 0,
    wageredCents: 0,
    wonCents: 0,
    biggestWinCents: 0,
    biggestWinX: 0,
    freeSpinRounds: 0,
    bestFreeSpinRoundCents: 0,
    bestFreeSpinRoundX: 0,
  };
}

export interface RoundOutcome {
  readonly betCents: number;
  /** Everything the round paid, base spin plus free spins. */
  readonly winCents: number;
  /** Free-spin round win, or null if the round had no free spins. */
  readonly freeSpinCents: number | null;
}

export function recordRound(stats: SessionStats, round: RoundOutcome): void {
  stats.spins++;
  stats.wageredCents += round.betCents;
  stats.wonCents += round.winCents;
  const winX = round.winCents / round.betCents;
  if (round.winCents > stats.biggestWinCents) stats.biggestWinCents = round.winCents;
  if (winX > stats.biggestWinX) stats.biggestWinX = winX;
  if (round.freeSpinCents !== null) {
    stats.freeSpinRounds++;
    const fsX = round.freeSpinCents / round.betCents;
    if (round.freeSpinCents > stats.bestFreeSpinRoundCents) stats.bestFreeSpinRoundCents = round.freeSpinCents;
    if (fsX > stats.bestFreeSpinRoundX) stats.bestFreeSpinRoundX = fsX;
  }
}

/** Profit/loss: total won minus total wagered. */
export const profitCents = (stats: SessionStats): number => stats.wonCents - stats.wageredCents;
