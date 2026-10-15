import type { ReelSet, SymbolId, SymbolKind } from '../config/types.ts';
import { randomInt, type Rng } from './rng.ts';
import type { EngineConfig, Grid, Position, SpunGrid } from './types.ts';

/** Picks a random stop on each strip and reads `rows` symbols downward (wrapping). */
export function spinGrid(rng: Rng, reels: ReelSet, rows: number): SpunGrid {
  const stops: number[] = [];
  const grid: SymbolId[][] = [];
  for (const strip of reels) {
    const stop = randomInt(rng, strip.length);
    stops.push(stop);
    grid.push(gridColumn(strip, stop, rows));
  }
  return { grid, stops };
}

/** The visible column for a given stop. Exposed so tests and the renderer can rebuild a grid. */
export function gridColumn(strip: readonly SymbolId[], stop: number, rows: number): SymbolId[] {
  const column: SymbolId[] = [];
  for (let row = 0; row < rows; row++) column.push(strip[(stop + row) % strip.length]!);
  return column;
}

const kindCache = new WeakMap<EngineConfig['symbols'], ReadonlyMap<SymbolId, SymbolKind>>();

export function symbolKinds(cfg: EngineConfig): ReadonlyMap<SymbolId, SymbolKind> {
  let kinds = kindCache.get(cfg.symbols);
  if (!kinds) {
    kinds = new Map(cfg.symbols.map((s) => [s.id, s.kind]));
    kindCache.set(cfg.symbols, kinds);
  }
  return kinds;
}

/** Every cell holding a symbol of the given kind, reel by reel, top to bottom. */
export function findKind(grid: Grid, cfg: EngineConfig, kind: SymbolKind): Position[] {
  const kinds = symbolKinds(cfg);
  const found: Position[] = [];
  grid.forEach((column, reel) => {
    column.forEach((symbol, row) => {
      if (kinds.get(symbol) === kind) found.push({ reel, row });
    });
  });
  return found;
}
