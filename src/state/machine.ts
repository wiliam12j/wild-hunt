import { BET_LEVELS, DEFAULT_BET_INDEX, STARTING_BALANCE } from '../config/betLevels.ts';
import { DEFAULT_CONFIG } from '../engine/defaultConfig.ts';
import { playRound } from '../engine/freeSpins.ts';
import type { Rng } from '../engine/rng.ts';
import type { EngineConfig, FreeSpinResult, RoundResult, SpinResult } from '../engine/types.ts';
import { Emitter } from './events.ts';
import { emptySession, recordRound } from './session.ts';
import { newSave, parseSave, type GameStorage, type SavedGame } from './storage.ts';
import { toCents, Wallet, winCents } from './wallet.ts';

export type GameState =
  | 'IDLE'
  | 'SPINNING'
  | 'EVALUATE_LINES'
  | 'RESOLVE_COLLECT'
  | 'PAYOUT'
  | 'FREE_SPIN_INTRO'
  | 'FREE_SPINNING'
  | 'FREE_SPIN_SUMMARY';

export type SpinMode = 'base' | 'free';

export interface CompletedRound {
  readonly round: RoundResult;
  readonly betCents: number;
  readonly winCents: number;
}

export interface GameEvents extends Record<string, unknown> {
  stateChange: { from: GameState; to: GameState };
  roundStart: { round: RoundResult; betCents: number };
  roundComplete: CompletedRound;
  /** The balance shown to the player changed. */
  balance: { cents: number };
  bet: { index: number; credits: number };
  turbo: { on: boolean };
  /** Player asked to slam the reels; the renderer shortens its animation. */
  quickStop: undefined;
  reset: undefined;
}

export interface GameOptions {
  readonly rng: Rng;
  readonly storage: GameStorage;
  readonly config?: EngineConfig;
  readonly betLevels?: readonly number[];
  readonly defaultBetIndex?: number;
  readonly startingBalance?: number;
}

/**
 * Headless game flow. The engine computes the whole round when a spin starts; the machine
 * then walks through it one presentation step per `advance()` call. The renderer calls
 * `advance()` when each animation finishes; tests just loop.
 *
 * Wallet and stats are settled (and saved) the moment a spin starts, so a reload mid-round
 * never loses winnings. The displayed balance trails the settled one until each win is shown.
 *
 *   IDLE → SPINNING → EVALUATE_LINES → RESOLVE_COLLECT → PAYOUT → IDLE
 *   PAYOUT → FREE_SPIN_INTRO → (FREE_SPINNING → EVALUATE_LINES → RESOLVE_COLLECT → PAYOUT)×N
 *          → FREE_SPIN_SUMMARY → IDLE
 */
export class GameMachine {
  readonly events = new Emitter<GameEvents>();

  private readonly rng: Rng;
  private readonly storage: GameStorage;
  private readonly cfg: EngineConfig;
  private readonly betLevels: readonly number[];
  private readonly startingBalanceCents: number;
  private readonly save: SavedGame;
  private readonly wallet: Wallet;

  private _state: GameState = 'IDLE';
  private _mode: SpinMode = 'base';
  private round: RoundResult | null = null;
  private roundBetCredits = 0;
  private freeIndex = -1;
  /** Settled winnings of the current round not yet shown to the player. */
  private unpaidCents = 0;
  /** Winnings of the current round shown so far. */
  private paidCents = 0;

  constructor(options: GameOptions) {
    this.rng = options.rng;
    this.storage = options.storage;
    this.cfg = options.config ?? DEFAULT_CONFIG;
    this.betLevels = options.betLevels ?? BET_LEVELS;
    this.startingBalanceCents = toCents(options.startingBalance ?? STARTING_BALANCE);
    this.save =
      parseSave(this.storage.load(), this.betLevels.length) ??
      newSave(this.startingBalanceCents, options.defaultBetIndex ?? DEFAULT_BET_INDEX);
    this.wallet = new Wallet(this.save.balanceCents);
  }

  // ---- read-only view for the UI ----

  get config(): EngineConfig {
    return this.cfg;
  }
  get state(): GameState {
    return this._state;
  }
  get mode(): SpinMode {
    return this._mode;
  }
  get isIdle(): boolean {
    return this._state === 'IDLE';
  }
  get betIndex(): number {
    return this.save.betIndex;
  }
  get bet(): number {
    return this.betLevels[this.save.betIndex]!;
  }
  get turbo(): boolean {
    return this.save.turbo;
  }
  /** Balance as the player should see it (trails the settled balance mid-round). */
  get displayBalanceCents(): number {
    return this.wallet.balanceCents - this.unpaidCents;
  }
  /** Balance after the current round fully pays out. */
  get settledBalanceCents(): number {
    return this.wallet.balanceCents;
  }
  get canSpin(): boolean {
    return this.isIdle && this.wallet.canAfford(toCents(this.bet));
  }
  /** Round winnings shown so far. */
  get roundWinCents(): number {
    return this.paidCents;
  }
  get run() {
    return this.save.run;
  }
  get lifetime() {
    return this.save.lifetime;
  }
  get currentRound(): RoundResult | null {
    return this.round;
  }
  /** The spin currently on screen. */
  get currentSpin(): SpinResult | null {
    if (!this.round) return null;
    return this._mode === 'free' ? this.currentFreeSpin : this.round.base;
  }
  get currentFreeSpin(): FreeSpinResult | null {
    return this.round?.freeSpins?.spins[this.freeIndex] ?? null;
  }

  // ---- player actions ----

  betUp(): boolean {
    return this.setBetIndex(this.save.betIndex + 1);
  }

  betDown(): boolean {
    return this.setBetIndex(this.save.betIndex - 1);
  }

  setBetIndex(index: number): boolean {
    if (!this.isIdle || index < 0 || index >= this.betLevels.length || index === this.save.betIndex) {
      return false;
    }
    this.save.betIndex = index;
    this.persist();
    this.events.emit('bet', { index, credits: this.bet });
    return true;
  }

  setTurbo(on: boolean): void {
    if (this.save.turbo === on) return;
    this.save.turbo = on;
    this.persist();
    this.events.emit('turbo', { on });
  }

  /** Only meaningful while reels are spinning; the renderer decides what "stop now" looks like. */
  quickStop(): boolean {
    if (this._state !== 'SPINNING' && this._state !== 'FREE_SPINNING') return false;
    this.events.emit('quickStop', undefined);
    return true;
  }

  /** Starts a paid round. Returns false if not idle or the bet isn't affordable. */
  spin(): boolean {
    if (!this.canSpin) return false;
    const betCredits = this.bet;
    const betCents = toCents(betCredits);
    const round = playRound(this.rng, this.cfg);
    const totalCents = this.roundCents(round, betCredits);

    this.wallet.debit(betCents);
    this.wallet.credit(totalCents);
    const outcome = {
      betCents,
      winCents: totalCents,
      freeSpinCents: round.freeSpins ? this.freeSpinCents(round, betCredits) : null,
    };
    recordRound(this.save.run, outcome);
    recordRound(this.save.lifetime, outcome);
    this.persist();

    this.round = round;
    this.roundBetCredits = betCredits;
    this._mode = 'base';
    this.freeIndex = -1;
    this.unpaidCents = totalCents;
    this.paidCents = 0;
    this.events.emit('roundStart', { round, betCents });
    this.events.emit('balance', { cents: this.displayBalanceCents });
    this.goto('SPINNING');
    return true;
  }

  /** Moves to the next presentation step. Returns false when idle (nothing to advance). */
  advance(): boolean {
    const round = this.round;
    if (this._state === 'IDLE' || !round) return false;

    switch (this._state) {
      case 'SPINNING':
      case 'FREE_SPINNING':
        this.goto('EVALUATE_LINES');
        break;
      case 'EVALUATE_LINES':
        this.goto('RESOLVE_COLLECT');
        break;
      case 'RESOLVE_COLLECT':
        this.pay(this.currentSpin!.win);
        this.goto('PAYOUT');
        break;
      case 'PAYOUT':
        if (this._mode === 'base') {
          if (round.freeSpins) this.goto('FREE_SPIN_INTRO');
          else this.finishRound();
        } else if (this.freeIndex + 1 < round.freeSpins!.spins.length) {
          this.nextFreeSpin();
        } else {
          this.goto('FREE_SPIN_SUMMARY');
        }
        break;
      case 'FREE_SPIN_INTRO':
        this._mode = 'free';
        this.nextFreeSpin();
        break;
      case 'FREE_SPIN_SUMMARY':
        this.finishRound();
        break;
    }
    return true;
  }

  /** Starts a new run: starting balance, fresh run stats. Lifetime stats are kept. */
  resetBalance(): boolean {
    if (!this.isIdle) return false;
    this.wallet.reset(this.startingBalanceCents);
    this.save.resets++;
    this.save.run = emptySession();
    this.persist();
    this.events.emit('reset', undefined);
    this.events.emit('balance', { cents: this.displayBalanceCents });
    return true;
  }

  // ---- internals ----

  private nextFreeSpin(): void {
    this.freeIndex++;
    this.goto('FREE_SPINNING');
  }

  private pay(multiple: number): void {
    const cents = Math.min(winCents(multiple, this.roundBetCredits), this.unpaidCents);
    if (cents === 0) return;
    this.unpaidCents -= cents;
    this.paidCents += cents;
    this.events.emit('balance', { cents: this.displayBalanceCents });
  }

  private finishRound(): void {
    const round = this.round!;
    const betCents = toCents(this.roundBetCredits);
    // Anything left (rounding remainder) is shown now so display and settled balance agree.
    if (this.unpaidCents !== 0) {
      this.paidCents += this.unpaidCents;
      this.unpaidCents = 0;
      this.events.emit('balance', { cents: this.displayBalanceCents });
    }
    const winCentsTotal = this.paidCents;
    this._mode = 'base';
    this.goto('IDLE');
    this.events.emit('roundComplete', { round, betCents, winCents: winCentsTotal });
  }

  /** Round total in cents, as the sum of each spin's cents so per-spin payouts add up exactly. */
  private roundCents(round: RoundResult, betCredits: number): number {
    return winCents(round.base.win, betCredits) + this.freeSpinCents(round, betCredits);
  }

  private freeSpinCents(round: RoundResult, betCredits: number): number {
    return (round.freeSpins?.spins ?? []).reduce((sum, s) => sum + winCents(s.win, betCredits), 0);
  }

  private goto(to: GameState): void {
    const from = this._state;
    this._state = to;
    this.events.emit('stateChange', { from, to });
  }

  private persist(): void {
    this.save.balanceCents = this.wallet.balanceCents;
    this.storage.save(this.save);
  }
}
