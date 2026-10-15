// Pure presentation rules (no Pixi), so they can be unit-tested headless.

import type { SymbolDef } from '../config/types.ts';
import type { Grid } from '../engine/types.ts';

export type WinTier = 'big' | 'mega' | 'epic';

/** The highest tier a win (in multiples of bet) reaches, or null below "big". */
export function winTier(multiple: number, tiers: { big: number; mega: number; epic: number }): WinTier | null {
  if (multiple >= tiers.epic) return 'epic';
  if (multiple >= tiers.mega) return 'mega';
  if (multiple >= tiers.big) return 'big';
  return null;
}

export interface AnticipationRule {
  /** Slow the remaining reels once this many Scatters have landed. */
  readonly scatters: number;
  /** Also slow them once a Hunter and a Cash symbol have both landed. */
  readonly collect: boolean;
}

/** For each reel: whether what has already landed to its left makes it worth a slow-down. */
export function anticipatingReels(grid: Grid, symbols: readonly SymbolDef[], rule: AnticipationRule): boolean[] {
  const kinds = new Map(symbols.map((s) => [s.id, s.kind]));
  let scatters = 0;
  let hunter = false;
  let cash = false;
  return grid.map((column) => {
    const on = scatters >= rule.scatters || (rule.collect && hunter && cash);
    for (const symbol of column) {
      const kind = kinds.get(symbol);
      if (kind === 'scatter') scatters++;
      if (kind === 'wild') hunter = true;
      if (kind === 'cash') cash = true;
    }
    return on;
  });
}
