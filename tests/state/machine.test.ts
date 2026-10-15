import { describe, expect, it } from 'vitest';
import { BET_LEVELS, DEFAULT_BET_INDEX, STARTING_BALANCE } from '../../src/config/betLevels.ts';
import { DEFAULT_CONFIG } from '../../src/engine/defaultConfig.ts';
import { createSeededRng } from '../../src/engine/rng.ts';
import { GameMachine } from '../../src/state/machine.ts';
import { profitCents } from '../../src/state/session.ts';
import { MemoryStorage } from '../../src/state/storage.ts';
import { toCents } from '../../src/state/wallet.ts';
import { FEATURE, LOSING, WINNING, makeGame, runToIdle, trackStates } from './helpers.ts';

const START = toCents(STARTING_BALANCE);
const BASE_FLOW = ['SPINNING', 'EVALUATE_LINES', 'RESOLVE_COLLECT', 'PAYOUT', 'IDLE'];

describe('new game', () => {
  it('starts idle with the starting balance and default bet', () => {
    const { game } = makeGame(LOSING);
    expect(game.state).toBe('IDLE');
    expect(game.displayBalanceCents).toBe(START);
    expect(game.bet).toBe(BET_LEVELS[DEFAULT_BET_INDEX]);
    expect(game.canSpin).toBe(true);
  });
});

describe('base round', () => {
  it('walks the base flow and takes the bet on a losing spin', () => {
    const { game } = makeGame(LOSING);
    const states = trackStates(game);
    expect(game.spin()).toBe(true);
    runToIdle(game);
    expect(states).toEqual(BASE_FLOW);
    expect(game.displayBalanceCents).toBe(START - toCents(game.bet));
    expect(game.run).toMatchObject({ spins: 1, wageredCents: toCents(game.bet), wonCents: 0 });
  });

  it('settles at once but shows the win only at PAYOUT', () => {
    const { game } = makeGame(WINNING);
    game.setBetIndex(3); // 10 credits
    const win = toCents(WINNING.paytable.A[5] * 10); // one payline, so line pay = total-bet multiple
    game.spin();
    expect(game.settledBalanceCents).toBe(START - 1_000 + win);
    expect(game.displayBalanceCents).toBe(START - 1_000);
    game.advance(); // EVALUATE_LINES
    game.advance(); // RESOLVE_COLLECT
    expect(game.displayBalanceCents).toBe(START - 1_000);
    game.advance(); // PAYOUT
    expect(game.state).toBe('PAYOUT');
    expect(game.displayBalanceCents).toBe(START - 1_000 + win);
    expect(game.roundWinCents).toBe(win);
  });

  it('reports the completed round', () => {
    const { game } = makeGame(WINNING);
    const completed: number[] = [];
    game.events.on('roundComplete', (r) => completed.push(r.winCents));
    game.spin();
    runToIdle(game);
    expect(completed).toEqual([toCents(WINNING.paytable.A[5] * game.bet)]);
  });
});

describe('free-spin round', () => {
  const spins = FEATURE.freeSpins.spinsByScatterCount[3];
  const perSpin = FEATURE.paytable.TEN[5];
  const scatter = FEATURE.freeSpins.scatterPayByCount[3];

  it('walks intro, every free spin, summary, then idle', () => {
    const { game } = makeGame(FEATURE);
    const states = trackStates(game);
    const modes: string[] = [];
    game.events.on('stateChange', ({ to }) => to === 'FREE_SPINNING' && modes.push(game.mode));
    game.spin();
    runToIdle(game);
    const freeLoop = ['FREE_SPINNING', 'EVALUATE_LINES', 'RESOLVE_COLLECT', 'PAYOUT'];
    expect(states).toEqual([
      ...BASE_FLOW.slice(0, -1),
      'FREE_SPIN_INTRO',
      ...Array.from({ length: spins }, () => freeLoop).flat(),
      'FREE_SPIN_SUMMARY',
      'IDLE',
    ]);
    expect(modes).toEqual(new Array(spins).fill('free'));
    expect(game.mode).toBe('base');
  });

  it('pays each free spin into the shown balance as it lands', () => {
    const { game } = makeGame(FEATURE);
    const shown: number[] = [];
    game.events.on('balance', ({ cents }) => shown.push(cents));
    game.spin();
    runToIdle(game);
    const afterBet = START - 100;
    expect(shown).toEqual([
      afterBet,
      afterBet + scatter * 100,
      ...Array.from({ length: spins }, (_, i) => afterBet + (scatter + perSpin * (i + 1)) * 100),
    ]);
    expect(game.displayBalanceCents).toBe(game.settledBalanceCents);
  });

  it('exposes the free spin on screen and records the round in stats', () => {
    const { game } = makeGame(FEATURE);
    game.spin();
    while (game.state !== 'FREE_SPINNING') game.advance();
    expect(game.currentFreeSpin?.index).toBe(1);
    expect(game.currentSpin).toBe(game.currentFreeSpin);
    runToIdle(game);
    expect(game.run).toMatchObject({
      freeSpinRounds: 1,
      bestFreeSpinRoundCents: spins * perSpin * 100,
      biggestWinX: scatter + spins * perSpin,
    });
  });
});

describe('locked actions', () => {
  it('ignores bet changes, spins and resets while a round is playing', () => {
    const { game } = makeGame(LOSING);
    game.spin();
    expect(game.betUp()).toBe(false);
    expect(game.spin()).toBe(false);
    expect(game.resetBalance()).toBe(false);
    runToIdle(game);
    expect(game.betUp()).toBe(true);
  });

  it('allows quick stop only while reels spin', () => {
    const { game } = makeGame(FEATURE);
    let stops = 0;
    game.events.on('quickStop', () => stops++);
    expect(game.quickStop()).toBe(false);
    game.spin();
    expect(game.quickStop()).toBe(true);
    game.advance();
    expect(game.quickStop()).toBe(false); // EVALUATE_LINES
    while (game.state !== 'FREE_SPINNING') game.advance();
    expect(game.quickStop()).toBe(true);
    expect(stops).toBe(2);
  });

  it('clamps bet changes at both ends of the ladder', () => {
    const { game } = makeGame(LOSING);
    game.setBetIndex(0);
    expect(game.betDown()).toBe(false);
    game.setBetIndex(BET_LEVELS.length - 1);
    expect(game.betUp()).toBe(false);
    expect(game.setBetIndex(99)).toBe(false);
  });

  it('refuses a spin the balance cannot cover', () => {
    const { game } = makeGame(LOSING, { startingBalance: 1 });
    game.setBetIndex(1); // 2 credits
    expect(game.canSpin).toBe(false);
    expect(game.spin()).toBe(false);
    game.setBetIndex(0);
    expect(game.spin()).toBe(true);
  });
});

describe('persistence', () => {
  it('saves settled state at spin time, so a reload mid-round keeps the winnings', () => {
    const storage = new MemoryStorage();
    const { game } = makeGame(FEATURE, { storage });
    game.spin();
    game.advance(); // mid-round
    const reloaded = makeGame(FEATURE, { storage }).game;
    expect(reloaded.state).toBe('IDLE');
    expect(reloaded.displayBalanceCents).toBe(game.settledBalanceCents);
    expect(reloaded.run.spins).toBe(1);
  });

  it('restores bet and turbo', () => {
    const storage = new MemoryStorage();
    const { game } = makeGame(LOSING, { storage });
    game.setBetIndex(4);
    game.setTurbo(true);
    const reloaded = makeGame(LOSING, { storage }).game;
    expect(reloaded.betIndex).toBe(4);
    expect(reloaded.turbo).toBe(true);
  });

  it('starts fresh if the save is corrupt', () => {
    const storage = new MemoryStorage();
    storage.saved = { version: 1, balanceCents: 'lots' } as never;
    expect(makeGame(LOSING, { storage }).game.displayBalanceCents).toBe(START);
  });
});

describe('reset balance', () => {
  it('starts a new run but keeps lifetime stats', () => {
    const { game } = makeGame(LOSING);
    for (let i = 0; i < 3; i++) {
      game.spin();
      runToIdle(game);
    }
    expect(game.resetBalance()).toBe(true);
    expect(game.displayBalanceCents).toBe(START);
    expect(game.run.spins).toBe(0);
    expect(game.lifetime.spins).toBe(3);
  });
});

describe('long seeded session on the live config', () => {
  it('keeps balance equal to start - wagered + won, and display equal to settled when idle', () => {
    const game = new GameMachine({ rng: createSeededRng(77), storage: new MemoryStorage(), config: DEFAULT_CONFIG });
    let rounds = 0;
    while (rounds < 3_000 && game.canSpin) {
      game.spin();
      runToIdle(game);
      rounds++;
      if (rounds % 500 === 0) game.betUp();
    }
    expect(game.displayBalanceCents).toBe(game.settledBalanceCents);
    expect(game.settledBalanceCents).toBe(START + profitCents(game.run));
    expect(game.run.spins).toBe(rounds);
  });
});
