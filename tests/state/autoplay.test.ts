import { describe, expect, it } from 'vitest';
import { Autoplay, type AutoplayStopReason } from '../../src/state/autoplay.ts';
import { FEATURE, LOSING, WINNING, makeGame, runToIdle } from './helpers.ts';

function setup(config: typeof LOSING, startingBalance?: number) {
  const { game } = makeGame(config, { startingBalance });
  const autoplay = new Autoplay(game);
  const stops: AutoplayStopReason[] = [];
  autoplay.events.on('stop', ({ reason }) => stops.push(reason));
  return { game, autoplay, stops };
}

const plain = { stopOnBigWin: false, stopOnFeature: false };

describe('autoplay', () => {
  it('plays the requested number of spins, then stops', () => {
    const { game, autoplay, stops } = setup(LOSING);
    expect(autoplay.start({ spins: 10, ...plain })).toBe(true);
    runToIdle(game);
    expect(game.run.spins).toBe(10);
    expect(stops).toEqual(['done']);
    expect(autoplay.active).toBe(false);
  });

  it('counts down remaining spins', () => {
    const { game, autoplay } = setup(LOSING);
    const remaining: number[] = [];
    autoplay.events.on('progress', ({ remaining: r }) => remaining.push(r));
    autoplay.start({ spins: 3, ...plain });
    runToIdle(game);
    expect(remaining).toEqual([2, 1, 0]);
  });

  it('stops after a free-spin round when asked', () => {
    const { game, autoplay, stops } = setup(FEATURE);
    autoplay.start({ spins: 10, stopOnBigWin: false, stopOnFeature: true });
    runToIdle(game);
    expect(game.run.spins).toBe(1);
    expect(stops).toEqual(['feature']);
  });

  it('stops on a big win only when asked', () => {
    const big = setup(WINNING);
    big.autoplay.start({ spins: 10, stopOnBigWin: true, stopOnFeature: false });
    runToIdle(big.game);
    expect(big.game.run.spins).toBe(1);
    expect(big.stops).toEqual(['bigWin']);

    const keepGoing = setup(WINNING);
    keepGoing.autoplay.start({ spins: 10, ...plain });
    runToIdle(keepGoing.game);
    expect(keepGoing.game.run.spins).toBe(10);
  });

  it('stops when the balance runs out', () => {
    const { game, autoplay, stops } = setup(LOSING, 3);
    autoplay.start({ spins: 10, ...plain });
    runToIdle(game);
    expect(game.run.spins).toBe(3);
    expect(stops).toEqual(['balance']);
  });

  it('lets the current round finish after a manual stop', () => {
    const { game, autoplay, stops } = setup(LOSING);
    autoplay.start({ spins: 10, ...plain });
    game.advance();
    autoplay.stop();
    runToIdle(game);
    expect(game.run.spins).toBe(1);
    expect(stops).toEqual(['manual']);
  });

  it('will not start mid-round, twice, or with nothing to play', () => {
    const { game, autoplay } = setup(LOSING);
    expect(autoplay.start({ spins: 0, ...plain })).toBe(false);
    game.spin();
    expect(autoplay.start({ spins: 5, ...plain })).toBe(false);
    runToIdle(game);
    expect(autoplay.start({ spins: 5, ...plain })).toBe(true);
    expect(autoplay.start({ spins: 5, ...plain })).toBe(false);
  });
});
