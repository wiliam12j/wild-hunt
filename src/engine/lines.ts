import type { MatchCount, PayingSymbolId, SymbolId } from '../config/types.ts';
import { symbolKinds } from './grid.ts';
import type { EngineConfig, Grid, LineWin } from './types.ts';

/** Pay for `count` matches in multiples of the line bet, 0 if it doesn't pay. */
function linePay(cfg: EngineConfig, symbol: PayingSymbolId, count: number): number {
  if (count < cfg.minMatch) return 0;
  return cfg.paytable[symbol][Math.min(count, cfg.reels) as MatchCount] ?? 0;
}

/**
 * Evaluates one payline left to right. Wilds substitute for low/high symbols.
 * A line can pay as Wilds alone or as the first non-wild symbol; the higher pay counts.
 */
export function evaluateLine(grid: Grid, cfg: EngineConfig, lineIndex: number): LineWin | null {
  const kinds = symbolKinds(cfg);
  const payline = cfg.paylines[lineIndex]!;
  const symbols: SymbolId[] = payline.map((row, reel) => grid[reel]![row]!);
  const isWild = (s: SymbolId) => kinds.get(s) === 'wild';

  let wildRun = 0;
  while (wildRun < symbols.length && isWild(symbols[wildRun]!)) wildRun++;

  let best: { symbol: PayingSymbolId; count: number; pay: number } | null = null;
  if (wildRun > 0) {
    const symbol = symbols[0] as PayingSymbolId;
    const pay = linePay(cfg, symbol, wildRun);
    if (pay > 0) best = { symbol, count: wildRun, pay };
  }

  const target = symbols[wildRun];
  const targetKind = target === undefined ? undefined : kinds.get(target);
  if (target !== undefined && (targetKind === 'low' || targetKind === 'high')) {
    let count = wildRun + 1;
    while (count < symbols.length && (symbols[count] === target || isWild(symbols[count]!))) count++;
    const symbol = target as PayingSymbolId;
    const pay = linePay(cfg, symbol, count);
    if (pay > (best?.pay ?? 0)) best = { symbol, count, pay };
  }

  if (!best) return null;
  return {
    line: lineIndex,
    symbol: best.symbol,
    count: best.count,
    positions: payline.slice(0, best.count).map((row, reel) => ({ reel, row })),
    win: best.pay / cfg.paylines.length,
  };
}

export function evaluateLines(grid: Grid, cfg: EngineConfig): LineWin[] {
  const wins: LineWin[] = [];
  for (let i = 0; i < cfg.paylines.length; i++) {
    const win = evaluateLine(grid, cfg, i);
    if (win) wins.push(win);
  }
  return wins;
}
