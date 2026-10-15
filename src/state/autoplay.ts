import { AUTOPLAY } from '../config/autoplay.ts';
import { Emitter } from './events.ts';
import type { CompletedRound, GameMachine } from './machine.ts';

export interface AutoplayOptions {
  /** Spins to play; normally one of AUTOPLAY.counts. */
  readonly spins: number;
  /** Stop after a round paying at least AUTOPLAY.bigWinStopMultiplier × bet. */
  readonly stopOnBigWin: boolean;
  /** Stop after a round that triggered free spins. */
  readonly stopOnFeature: boolean;
}

export type AutoplayStopReason = 'done' | 'bigWin' | 'feature' | 'balance' | 'manual';

export interface AutoplayEvents extends Record<string, unknown> {
  start: { spins: number };
  /** Spins left after the round that just started. */
  progress: { remaining: number };
  stop: { reason: AutoplayStopReason };
}

/**
 * Starts the next paid spin each time a round completes, until a stop rule fires.
 * A manual stop lets the current round finish.
 */
export class Autoplay {
  readonly events = new Emitter<AutoplayEvents>();
  private remaining = 0;
  private options: AutoplayOptions | null = null;
  private unsubscribe: (() => void) | null = null;
  private readonly game: GameMachine;
  private readonly bigWinMultiplier: number;

  constructor(game: GameMachine, bigWinMultiplier: number = AUTOPLAY.bigWinStopMultiplier) {
    this.game = game;
    this.bigWinMultiplier = bigWinMultiplier;
  }

  get active(): boolean {
    return this.options !== null;
  }

  get spinsRemaining(): number {
    return this.remaining;
  }

  /** Starts autoplay and the first spin. Returns false if already running or the game can't spin. */
  start(options: AutoplayOptions): boolean {
    if (this.active || options.spins <= 0 || !this.game.canSpin) return false;
    this.options = options;
    this.remaining = options.spins;
    this.unsubscribe = this.game.events.on('roundComplete', (r) => this.onRoundComplete(r));
    this.events.emit('start', { spins: options.spins });
    this.spinNext();
    return true;
  }

  stop(): void {
    if (this.active) this.end('manual');
  }

  private onRoundComplete(completed: CompletedRound): void {
    const options = this.options!;
    if (options.stopOnFeature && completed.round.freeSpins) return this.end('feature');
    if (options.stopOnBigWin && completed.winCents >= completed.betCents * this.bigWinMultiplier) {
      return this.end('bigWin');
    }
    if (this.remaining === 0) return this.end('done');
    if (!this.game.canSpin) return this.end('balance');
    this.spinNext();
  }

  private spinNext(): void {
    this.remaining--;
    this.game.spin();
    this.events.emit('progress', { remaining: this.remaining });
  }

  private end(reason: AutoplayStopReason): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.options = null;
    this.remaining = 0;
    this.events.emit('stop', { reason });
  }
}
