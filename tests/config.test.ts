import { describe, expect, it } from 'vitest';
import { BET_LEVELS, DEFAULT_BET_INDEX, STARTING_BALANCE } from '../src/config/betLevels.ts';
import { CASH_VALUES, TROPHY_WEIGHTS } from '../src/config/cashValues.ts';
import { FREE_SPINS } from '../src/config/freeSpins.ts';
import { GAME } from '../src/config/game.ts';
import { PAYLINES } from '../src/config/paylines.ts';
import { PAYTABLE } from '../src/config/paytable.ts';
import { minGap } from '../src/config/buildStrip.ts';
import { BASE_REELS, FREE_REELS, STRIP_SPACING } from '../src/config/reelStrips.ts';
import { SYMBOLS } from '../src/config/symbols.ts';
import type { MatchCount } from '../src/config/types.ts';

const symbolIds = new Set(SYMBOLS.map((s) => s.id));
const idsOfKind = (...kinds: string[]) =>
  SYMBOLS.filter((s) => kinds.includes(s.kind)).map((s) => s.id);
const MATCH_COUNTS: MatchCount[] = [3, 4, 5];

describe('symbols', () => {
  it('has unique ids', () => {
    expect(symbolIds.size).toBe(SYMBOLS.length);
  });

  it('has exactly one wild and one scatter', () => {
    expect(idsOfKind('wild')).toEqual(['HUNTER']);
    expect(idsOfKind('scatter')).toEqual(['LODGE']);
  });
});

describe('paylines', () => {
  it('has 10 lines spanning every reel with valid rows', () => {
    expect(PAYLINES).toHaveLength(10);
    for (const line of PAYLINES) {
      expect(line).toHaveLength(GAME.reels);
      for (const row of line) {
        expect(row).toBeGreaterThanOrEqual(0);
        expect(row).toBeLessThan(GAME.rows);
      }
    }
  });

  it('has no duplicate lines', () => {
    const keys = new Set(PAYLINES.map((l) => l.join(',')));
    expect(keys.size).toBe(PAYLINES.length);
  });
});

describe('paytable', () => {
  it('covers exactly the low and high symbols (the Hunter never starts a line)', () => {
    expect(Object.keys(PAYTABLE).sort()).toEqual(idsOfKind('low', 'high').sort());
    expect(GAME.wildReels).not.toContain(0);
  });

  it('has positive, non-decreasing pays for 3/4/5', () => {
    for (const pays of Object.values(PAYTABLE)) {
      expect(pays[3]).toBeGreaterThan(0);
      expect(pays[4]).toBeGreaterThanOrEqual(pays[3]);
      expect(pays[5]).toBeGreaterThanOrEqual(pays[4]);
    }
  });
});

describe.each([
  ['base', BASE_REELS],
  ['free', FREE_REELS],
])('%s reel strips', (_name, reels) => {
  it('has one strip per reel, each longer than the visible rows', () => {
    expect(reels).toHaveLength(GAME.reels);
    for (const strip of reels) expect(strip.length).toBeGreaterThan(GAME.rows);
  });

  it('uses only known symbols', () => {
    for (const strip of reels) for (const id of strip) expect(symbolIds.has(id)).toBe(true);
  });

  it('places the Hunter only on allowed reels', () => {
    const allowed: readonly number[] = GAME.wildReels;
    reels.forEach((strip, reel) => {
      if (!allowed.includes(reel)) expect(strip).not.toContain('HUNTER');
    });
  });

  it('never shows two of a spaced symbol on one reel', () => {
    for (const strip of reels) {
      for (const id of Object.keys(STRIP_SPACING) as (keyof typeof STRIP_SPACING)[]) {
        expect(minGap(strip, id)).toBeGreaterThanOrEqual(GAME.rows);
      }
    }
  });
});

describe('cash values', () => {
  it('has a non-empty table for every cash symbol and nothing else', () => {
    expect(Object.keys(CASH_VALUES).sort()).toEqual(idsOfKind('cash').sort());
    for (const table of Object.values(CASH_VALUES)) expect(table.length).toBeGreaterThan(0);
  });

  it('has positive values and weights', () => {
    for (const table of Object.values(CASH_VALUES)) {
      for (const { value, weight } of table) {
        expect(value).toBeGreaterThan(0);
        expect(weight).toBeGreaterThan(0);
      }
    }
  });
});

describe('trophy weights', () => {
  it.each(['base', 'free'] as const)('%s covers every cash symbol with non-negative weights', (mode) => {
    const weights = TROPHY_WEIGHTS[mode];
    expect(Object.keys(weights).sort()).toEqual(idsOfKind('cash').sort());
    for (const w of Object.values(weights)) expect(w).toBeGreaterThanOrEqual(0);
    expect(Object.values(weights).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });
});

describe('free spins', () => {
  it('awards spins and scatter pays for 3, 4 and 5 scatters', () => {
    for (const n of MATCH_COUNTS) {
      expect(FREE_SPINS.spinsByScatterCount[n]).toBeGreaterThan(0);
      expect(FREE_SPINS.scatterPayByCount[n]).toBeGreaterThanOrEqual(0);
    }
  });

  it('has a multiplier ladder starting at x1 and strictly increasing', () => {
    const ladder = FREE_SPINS.multiplierLadder;
    expect(ladder[0]).toBe(1);
    for (let i = 1; i < ladder.length; i++) expect(ladder[i]!).toBeGreaterThan(ladder[i - 1]!);
  });
});

describe('bet levels and wallet', () => {
  it('has positive, strictly increasing bet levels', () => {
    expect(BET_LEVELS.length).toBeGreaterThan(0);
    for (let i = 0; i < BET_LEVELS.length; i++) {
      expect(BET_LEVELS[i]!).toBeGreaterThan(i === 0 ? 0 : BET_LEVELS[i - 1]!);
    }
  });

  it('has a valid default bet and a starting balance that covers it', () => {
    const defaultBet = BET_LEVELS[DEFAULT_BET_INDEX];
    expect(defaultBet).toBeDefined();
    expect(STARTING_BALANCE).toBeGreaterThanOrEqual(defaultBet!);
  });
});

describe('game limits', () => {
  it('has ordered win tiers and a max win above them', () => {
    const { big, mega, epic } = GAME.winTiers;
    expect(big).toBeLessThan(mega);
    expect(mega).toBeLessThan(epic);
    expect(GAME.maxWinMultiplier).toBeGreaterThan(epic);
  });
});
