import { createSeededRng } from '../../src/engine/rng.ts';
import type { EngineConfig } from '../../src/engine/types.ts';
import { GameMachine, type GameState } from '../../src/state/machine.ts';
import { MemoryStorage } from '../../src/state/storage.ts';
import { S, oneRowConfig } from '../engine/helpers.ts';

/** Every spin pays nothing. */
export const LOSING = oneRowConfig([S.T, S.J, S.Q, S.K, S.A], [S.T, S.J, S.Q, S.K, S.A]);
/** Every base spin pays five Aces on the single line. */
export const WINNING = oneRowConfig([S.A, S.A, S.A, S.A, S.A], [S.T, S.J, S.Q, S.K, S.A]);
/** Every base spin lands 3 Scatters; every free spin pays five Tens. */
export const FEATURE = oneRowConfig([S.SC, S.T, S.SC, S.T, S.SC], [S.T, S.T, S.T, S.T, S.T]);

export function makeGame(config: EngineConfig, options: { startingBalance?: number; storage?: MemoryStorage } = {}) {
  const storage = options.storage ?? new MemoryStorage();
  const game = new GameMachine({
    rng: createSeededRng(1),
    storage,
    config,
    startingBalance: options.startingBalance,
  });
  return { game, storage };
}

/** Advances until the game is idle with nothing left to do (including any autoplay). */
export function runToIdle(game: GameMachine): void {
  let guard = 0;
  while (game.advance()) if (++guard > 1_000_000) throw new Error('runaway');
}

/** Records every state entered. */
export function trackStates(game: GameMachine): GameState[] {
  const states: GameState[] = [];
  game.events.on('stateChange', ({ to }) => states.push(to));
  return states;
}
