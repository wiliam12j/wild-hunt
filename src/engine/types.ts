import type {
  CashSymbolId,
  CashValueTable,
  MatchCount,
  Payline,
  PayingSymbolId,
  Paytable,
  ReelSet,
  SymbolDef,
  SymbolId,
} from '../config/types.ts';

// All win amounts in the engine are multiples of the TOTAL bet.
// The state layer converts to credits by multiplying by the bet.

/** Everything the engine reads. Built from /src/config by default; tests pass their own. */
export interface EngineConfig {
  readonly reels: number;
  readonly rows: number;
  readonly minMatch: number;
  readonly maxWinMultiplier: number;
  readonly symbols: readonly SymbolDef[];
  readonly paylines: readonly Payline[];
  readonly paytable: Paytable;
  readonly baseReels: ReelSet;
  readonly freeReels: ReelSet;
  readonly cashValues: CashValueTable;
  readonly freeSpins: {
    readonly minScatters: number;
    readonly spinsByScatterCount: Readonly<Record<MatchCount, number>>;
    readonly scatterPayByCount: Readonly<Record<MatchCount, number>>;
    readonly huntersPerUpgrade: number;
    readonly retriggerSpins: number;
    readonly multiplierLadder: readonly number[];
  };
}

/** grid[reel][row], row 0 = top. */
export type Grid = readonly (readonly SymbolId[])[];

export interface Position {
  readonly reel: number;
  readonly row: number;
}

export interface SpunGrid {
  readonly grid: Grid;
  /** Strip index shown in the top row of each reel. */
  readonly stops: readonly number[];
}

export interface CashSymbol extends Position {
  readonly symbol: CashSymbolId;
  /** Multiple of total bet, before any collect multiplier. */
  readonly value: number;
}

export interface LineWin {
  /** Index into the paylines config. */
  readonly line: number;
  readonly symbol: PayingSymbolId;
  readonly count: number;
  /** Cells that form the win, left to right. */
  readonly positions: readonly Position[];
  readonly win: number;
}

export interface CollectResult {
  /** Hunter positions that collected (empty when nothing was collected). */
  readonly hunters: readonly Position[];
  /** Sum of visible Cash values, before multiplier and hunter count. */
  readonly cashTotal: number;
  readonly multiplier: number;
  /** cashTotal × hunters × multiplier. */
  readonly win: number;
}

export interface ScatterResult {
  readonly count: number;
  readonly positions: readonly Position[];
  /** Free spins awarded (0 when not triggered). */
  readonly freeSpins: number;
  readonly win: number;
}

export interface SpinResult extends SpunGrid {
  readonly cash: readonly CashSymbol[];
  readonly lineWins: readonly LineWin[];
  readonly collect: CollectResult;
  readonly scatter: ScatterResult;
  /** Total for this spin (after any max-win cap). */
  readonly win: number;
  /** True if the max-win cap cut this spin's win short. */
  readonly capped: boolean;
}

export interface FreeSpinResult extends SpinResult {
  /** 1-based spin number within the round. */
  readonly index: number;
  /** Collecting Hunters counted toward the meter after this spin (round total). */
  readonly huntersCollected: number;
  /** Multiplier level that applies from the next spin. */
  readonly multiplierAfter: number;
  /** Spins added by this spin's retriggers. */
  readonly spinsAdded: number;
  readonly spinsRemaining: number;
}

export interface FreeSpinRoundResult {
  readonly spins: readonly FreeSpinResult[];
  readonly spinsAwarded: number;
  readonly retriggers: number;
  readonly huntersCollected: number;
  readonly finalMultiplier: number;
  /** Win from the free spins only. */
  readonly win: number;
  /** True if the round ended early on the max-win cap. */
  readonly capped: boolean;
}

/** A paid base spin plus the free-spin round it triggered, if any. */
export interface RoundResult {
  readonly base: SpinResult;
  readonly freeSpins: FreeSpinRoundResult | null;
  readonly win: number;
  readonly capped: boolean;
}
