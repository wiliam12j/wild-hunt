import { describe, expect, it } from 'vitest';
import { emptySession, profitCents, recordRound } from '../../src/state/session.ts';
import { MemoryStorage, newSave, parseSave } from '../../src/state/storage.ts';
import { toCents, toCredits, Wallet, winCents } from '../../src/state/wallet.ts';

describe('wallet', () => {
  it('converts between credits and cents without drift', () => {
    expect(toCents(0.8)).toBe(80);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCredits(1234)).toBe(12.34);
    expect(winCents(0.8, 1)).toBe(80);
    expect(winCents(12.5, 20)).toBe(25_000);
  });

  it('debits, credits and refuses to go negative', () => {
    const w = new Wallet(500);
    w.debit(200);
    w.credit(80);
    expect(w.balanceCents).toBe(380);
    expect(w.canAfford(380)).toBe(true);
    expect(w.canAfford(381)).toBe(false);
    expect(() => w.debit(381)).toThrow(/Insufficient/);
    w.reset(100_000);
    expect(w.balanceCents).toBe(100_000);
  });
});

describe('session stats', () => {
  it('sums wagers and wins and tracks bests', () => {
    const s = emptySession();
    recordRound(s, { betCents: 100, winCents: 0, freeSpinCents: null });
    recordRound(s, { betCents: 100, winCents: 2_500, freeSpinCents: 2_300 });
    recordRound(s, { betCents: 1_000, winCents: 5_000, freeSpinCents: null });
    expect(s).toMatchObject({
      spins: 3,
      wageredCents: 1_200,
      wonCents: 7_500,
      biggestWinCents: 5_000,
      biggestWinX: 25, // the 2,500 win on a 100 bet
      freeSpinRounds: 1,
      bestFreeSpinRoundCents: 2_300,
      bestFreeSpinRoundX: 23,
    });
    expect(profitCents(s)).toBe(6_300);
  });
});

describe('storage', () => {
  it('round-trips a save through memory storage as a copy', () => {
    const storage = new MemoryStorage();
    const save = newSave(100_000, 2);
    storage.save(save);
    save.balanceCents = 1;
    expect(parseSave(storage.load(), 7)).toMatchObject({ balanceCents: 100_000, betIndex: 2 });
  });

  it.each([
    ['nothing', null],
    ['a string', 'hello'],
    ['an old version', { ...newSave(100, 0), version: 0 }],
    ['a fractional balance', { ...newSave(100, 0), balanceCents: 1.5 }],
    ['a negative balance', { ...newSave(100, 0), balanceCents: -1 }],
    ['a bet index out of range', newSave(100, 7)],
    ['broken stats', { ...newSave(100, 0), run: { spins: 'lots' } }],
  ])('rejects %s', (_label, data) => {
    expect(parseSave(data, 7)).toBeNull();
  });
});
