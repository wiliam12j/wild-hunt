import { assignCashValues } from './cash.ts';
import { evaluateCollect } from './collect.ts';
import { DEFAULT_CONFIG } from './defaultConfig.ts';
import { spinGrid } from './grid.ts';
import { evaluateLines } from './lines.ts';
import type { Rng } from './rng.ts';
import { evaluateScatter, NO_SCATTER } from './scatter.ts';
import type { CashSymbol, EngineConfig, SpinResult, SpunGrid } from './types.ts';

export interface ResolveOptions {
  /** Collect multiplier for this spin. */
  readonly multiplier: number;
  /** Whether Scatters pay and trigger (base game only). */
  readonly scatters: boolean;
  /** Most this spin may pay, in multiples of total bet. */
  readonly winCap: number;
}

/** Scores an already-spun grid. Pure, so tests can feed hand-built grids. */
export function resolveSpin(
  spun: SpunGrid,
  cash: readonly CashSymbol[],
  options: ResolveOptions,
  cfg: EngineConfig,
): SpinResult {
  const lineWins = evaluateLines(spun.grid, cfg);
  const collect = evaluateCollect(spun.grid, cash, options.multiplier, cfg);
  const scatter = options.scatters ? evaluateScatter(spun.grid, cfg) : NO_SCATTER;

  const raw = lineWins.reduce((sum, w) => sum + w.win, 0) + collect.win + scatter.win;
  const capped = raw > options.winCap;
  return {
    ...spun,
    cash,
    lineWins,
    collect,
    scatter,
    win: capped ? options.winCap : raw,
    capped,
  };
}

/** One paid base-game spin. */
export function spinBase(rng: Rng, cfg: EngineConfig = DEFAULT_CONFIG): SpinResult {
  const spun = spinGrid(rng, cfg.baseReels, cfg.rows);
  const cash = assignCashValues(rng, spun.grid, cfg);
  return resolveSpin(
    spun,
    cash,
    { multiplier: cfg.freeSpins.multiplierLadder[0]!, scatters: true, winCap: cfg.maxWinMultiplier },
    cfg,
  );
}
