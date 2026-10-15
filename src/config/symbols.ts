import type { SymbolDef } from './types.ts';

export const SYMBOLS: readonly SymbolDef[] = [
  { id: 'TEN', kind: 'low', label: '10' },
  { id: 'J', kind: 'low', label: 'J' },
  { id: 'Q', kind: 'low', label: 'Q' },
  { id: 'K', kind: 'low', label: 'K' },
  { id: 'A', kind: 'low', label: 'A' },

  { id: 'RABBIT', kind: 'high', label: 'Rabbit' },
  { id: 'PHEASANT', kind: 'high', label: 'Pheasant' },
  { id: 'FOX', kind: 'high', label: 'Fox' },
  { id: 'STAG', kind: 'high', label: 'Stag' },

  { id: 'HUNTER', kind: 'wild', label: 'Hunter' },
  { id: 'LODGE', kind: 'scatter', label: 'Lodge' },

  { id: 'CASH_RABBIT', kind: 'cash', label: 'Rabbit Trophy' },
  { id: 'CASH_PHEASANT', kind: 'cash', label: 'Pheasant Trophy' },
  { id: 'CASH_FOX', kind: 'cash', label: 'Fox Trophy' },
  { id: 'CASH_DEER', kind: 'cash', label: 'Deer Trophy' },
  { id: 'CASH_GOLDEN_STAG', kind: 'cash', label: 'Golden Stag' },

  // Only appears on strips. Turns into one of the Cash symbols above when it lands.
  { id: 'TROPHY', kind: 'trophy', label: 'Trophy' },
];
