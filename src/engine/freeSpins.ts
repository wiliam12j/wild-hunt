import { landCash } from './cash.ts';
import { DEFAULT_CONFIG } from './defaultConfig.ts';
import { spinGrid } from './grid.ts';
import type { Rng } from './rng.ts';
import { resolveSpin, spinBase } from './spin.ts';
import type { EngineConfig, FreeSpinResult, FreeSpinRoundResult, RoundResult } from './types.ts';

/**
 * Plays a whole free-spin round on the free reel set.
 *
 * Only Hunters that actually collect (land with at least one Cash symbol) fill the meter.
 * Every `huntersPerUpgrade` of them retriggers and moves one step up the multiplier ladder.
 * The new multiplier applies from the next spin. Retriggers continue at the top of the ladder.
 *
 * @param winSoFar Already won in this round (the triggering spin), counted toward the cap.
 */
export function playFreeSpins(
  rng: Rng,
  spinsAwarded: number,
  cfg: EngineConfig = DEFAULT_CONFIG,
  winSoFar = 0,
): FreeSpinRoundResult {
  const { multiplierLadder: ladder, huntersPerUpgrade, retriggerSpins } = cfg.freeSpins;
  const cap = cfg.maxWinMultiplier - winSoFar;

  const spins: FreeSpinResult[] = [];
  let remaining = spinsAwarded;
  let level = 0;
  let hunters = 0;
  let retriggers = 0;
  let win = 0;
  let capped = false;

  while (remaining > 0) {
    remaining--;
    const { spun, cash } = landCash(rng, spinGrid(rng, cfg.freeReels, cfg.rows), cfg.trophyWeights.free, cfg);
    const result = resolveSpin(
      spun,
      cash,
      { multiplier: ladder[level]!, scatters: false, winCap: cap - win },
      cfg,
    );
    win += result.win;

    const before = Math.floor(hunters / huntersPerUpgrade);
    hunters += result.collect.hunters.length;
    const upgrades = Math.floor(hunters / huntersPerUpgrade) - before;
    const spinsAdded = upgrades * retriggerSpins;
    retriggers += upgrades;
    remaining += spinsAdded;
    level = Math.min(level + upgrades, ladder.length - 1);

    if (result.capped) {
      capped = true;
      remaining = 0;
    }

    spins.push({
      ...result,
      index: spins.length + 1,
      huntersCollected: hunters,
      multiplierAfter: ladder[level]!,
      spinsAdded,
      spinsRemaining: remaining,
    });
  }

  return {
    spins,
    spinsAwarded,
    retriggers,
    huntersCollected: hunters,
    finalMultiplier: ladder[level]!,
    win,
    capped,
  };
}

/** A paid base spin, plus the full free-spin round if it triggered one. */
export function playRound(rng: Rng, cfg: EngineConfig = DEFAULT_CONFIG): RoundResult {
  const base = spinBase(rng, cfg);
  const freeSpins =
    base.scatter.freeSpins > 0 && !base.capped
      ? playFreeSpins(rng, base.scatter.freeSpins, cfg, base.win)
      : null;
  return {
    base,
    freeSpins,
    win: base.win + (freeSpins?.win ?? 0),
    capped: base.capped || (freeSpins?.capped ?? false),
  };
}
