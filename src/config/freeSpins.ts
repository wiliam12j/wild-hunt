import type { MatchCount } from './types.ts';

export const FREE_SPINS = {
  /** Scatters (anywhere) needed to trigger. */
  minScatters: 3,
  /** Free spins awarded by scatter count. */
  spinsByScatterCount: { 3: 10, 4: 15, 5: 20 } as Readonly<Record<MatchCount, number>>,
  /** Scatter bonus paid on trigger, in multiples of total bet. Placeholders. */
  scatterPayByCount: { 3: 2, 4: 10, 5: 50 } as Readonly<Record<MatchCount, number>>,

  /** Every Nth Hunter Wild collected in the round retriggers and upgrades the multiplier. */
  huntersPerUpgrade: 4,
  retriggerSpins: 10,
  /** Collect multiplier levels. Round starts at index 0; each upgrade moves one step. */
  multiplierLadder: [1, 2, 3, 10] as readonly number[],
} as const;
