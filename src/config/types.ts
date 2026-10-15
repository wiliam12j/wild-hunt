// Shapes shared by all config files. Data lives in the sibling files.

export type LowSymbolId = 'TEN' | 'J' | 'Q' | 'K' | 'A';
export type HighSymbolId = 'RABBIT' | 'PHEASANT' | 'FOX' | 'STAG';
export type WildSymbolId = 'HUNTER';
export type ScatterSymbolId = 'LODGE';
export type CashSymbolId =
  | 'CASH_RABBIT'
  | 'CASH_PHEASANT'
  | 'CASH_FOX'
  | 'CASH_DEER'
  | 'CASH_GOLDEN_STAG';
/** Strip-only placeholder; becomes a Cash symbol (drawn by weight) when it lands. */
export type TrophySymbolId = 'TROPHY';

/** Symbols that can form payline wins. */
export type PayingSymbolId = LowSymbolId | HighSymbolId | WildSymbolId;
export type SymbolId = PayingSymbolId | ScatterSymbolId | CashSymbolId | TrophySymbolId;

export type SymbolKind = 'low' | 'high' | 'wild' | 'scatter' | 'cash' | 'trophy';

export interface SymbolDef {
  readonly id: SymbolId;
  readonly kind: SymbolKind;
  /** Placeholder label drawn on the coloured shape until real art lands. */
  readonly label: string;
}

/** Match count that pays. */
export type MatchCount = 3 | 4 | 5;

/** Row index per reel, 0 = top. */
export type Payline = readonly number[];

/** Payouts in multiples of the line bet, keyed by match count. */
export type Paytable = Readonly<Record<PayingSymbolId, Readonly<Record<MatchCount, number>>>>;

export type ReelStrip = readonly SymbolId[];
/** One strip per reel, left to right. */
export type ReelSet = readonly ReelStrip[];

export interface WeightedValue {
  /** Multiple of total bet. */
  readonly value: number;
  readonly weight: number;
}

export type CashValueTable = Readonly<Record<CashSymbolId, readonly WeightedValue[]>>;

/** Relative chance of each Cash symbol when a Trophy lands. */
export type TrophyWeights = Readonly<Record<CashSymbolId, number>>;

/** Symbol counts for one reel; the strip builder lays them out. */
export type ReelCounts = Readonly<Partial<Record<SymbolId, number>>>;
