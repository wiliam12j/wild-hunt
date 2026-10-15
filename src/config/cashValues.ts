import type { CashValueTable, TrophyWeights } from './types.ts';

// Value assigned to a Cash symbol when it lands, in multiples of total bet.
// One entry is drawn by weight. Placeholders; tune with the simulator.
export const CASH_VALUES: CashValueTable = {
  CASH_RABBIT: [
    { value: 1, weight: 40 },
    { value: 2, weight: 30 },
    { value: 3, weight: 15 },
    { value: 4, weight: 10 },
    { value: 5, weight: 5 },
  ],
  CASH_PHEASANT: [
    { value: 5, weight: 40 },
    { value: 6, weight: 25 },
    { value: 8, weight: 20 },
    { value: 10, weight: 15 },
  ],
  CASH_FOX: [
    { value: 10, weight: 40 },
    { value: 12, weight: 25 },
    { value: 15, weight: 20 },
    { value: 20, weight: 15 },
  ],
  CASH_DEER: [
    { value: 25, weight: 45 },
    { value: 30, weight: 25 },
    { value: 40, weight: 20 },
    { value: 50, weight: 10 },
  ],
  CASH_GOLDEN_STAG: [
    { value: 100, weight: 60 },
    { value: 150, weight: 25 },
    { value: 200, weight: 10 },
    { value: 250, weight: 5 },
  ],
};

// Which Cash symbol a landed TROPHY becomes. Relative weights; tune with the simulator.
export const TROPHY_WEIGHTS: Readonly<{ base: TrophyWeights; free: TrophyWeights }> = {
  base: {
    CASH_RABBIT: 892,
    CASH_PHEASANT: 85,
    CASH_FOX: 18,
    CASH_DEER: 4,
    CASH_GOLDEN_STAG: 1,
  },
  free: {
    CASH_RABBIT: 600,
    CASH_PHEASANT: 250,
    CASH_FOX: 100,
    CASH_DEER: 40,
    CASH_GOLDEN_STAG: 10,
  },
};
