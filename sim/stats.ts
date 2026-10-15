import type { RoundResult } from '../src/engine/types.ts';

// Pure accumulator for simulation results. No Node imports, so it is unit-testable and
// can be merged across worker threads.

/** Upper bounds (exclusive) of the round-win buckets, in multiples of total bet. 0x is its own bucket. */
export const BUCKET_EDGES = [1, 5, 20, 100, 1000] as const;
export const BUCKET_LABELS = ['0x', '<1x', '1-5x', '5-20x', '20-100x', '100-1000x', '1000x+'] as const;

export interface SimStats {
  rounds: number;
  totalWin: number;
  totalWinSq: number;
  maxWin: number;
  capHits: number;
  buckets: number[];

  baseWin: number;
  baseLineWin: number;
  baseCollectWin: number;
  scatterWin: number;
  baseHits: number;
  baseCollects: number;

  triggers: number;
  freeWin: number;
  freeWinSq: number;
  freeSpinsPlayed: number;
  retriggers: number;
  maxFreeWin: number;
  /** Rounds that ended on each multiplier-ladder level, by ladder index. */
  finalLevel: number[];
}

export function emptyStats(ladderLength: number): SimStats {
  return {
    rounds: 0,
    totalWin: 0,
    totalWinSq: 0,
    maxWin: 0,
    capHits: 0,
    buckets: new Array<number>(BUCKET_LABELS.length).fill(0),
    baseWin: 0,
    baseLineWin: 0,
    baseCollectWin: 0,
    scatterWin: 0,
    baseHits: 0,
    baseCollects: 0,
    triggers: 0,
    freeWin: 0,
    freeWinSq: 0,
    freeSpinsPlayed: 0,
    retriggers: 0,
    maxFreeWin: 0,
    finalLevel: new Array<number>(ladderLength).fill(0),
  };
}

export function bucketIndex(win: number): number {
  if (win === 0) return 0;
  const i = BUCKET_EDGES.findIndex((edge) => win < edge);
  return i === -1 ? BUCKET_EDGES.length + 1 : i + 1;
}

export function record(stats: SimStats, round: RoundResult, ladder: readonly number[]): void {
  const { base, freeSpins, win } = round;
  stats.rounds++;
  stats.totalWin += win;
  stats.totalWinSq += win * win;
  if (win > stats.maxWin) stats.maxWin = win;
  if (round.capped) stats.capHits++;
  stats.buckets[bucketIndex(win)]!++;

  stats.baseWin += base.win;
  for (const lw of base.lineWins) stats.baseLineWin += lw.win;
  stats.baseCollectWin += base.collect.win;
  stats.scatterWin += base.scatter.win;
  if (base.win > 0) stats.baseHits++;
  if (base.collect.win > 0) stats.baseCollects++;

  if (freeSpins) {
    stats.triggers++;
    stats.freeWin += freeSpins.win;
    stats.freeWinSq += freeSpins.win * freeSpins.win;
    stats.freeSpinsPlayed += freeSpins.spins.length;
    stats.retriggers += freeSpins.retriggers;
    if (freeSpins.win > stats.maxFreeWin) stats.maxFreeWin = freeSpins.win;
    stats.finalLevel[ladder.indexOf(freeSpins.finalMultiplier)]!++;
  }
}

export function merge(a: SimStats, b: SimStats): SimStats {
  const sumArrays = (x: number[], y: number[]) => x.map((v, i) => v + y[i]!);
  return {
    rounds: a.rounds + b.rounds,
    totalWin: a.totalWin + b.totalWin,
    totalWinSq: a.totalWinSq + b.totalWinSq,
    maxWin: Math.max(a.maxWin, b.maxWin),
    capHits: a.capHits + b.capHits,
    buckets: sumArrays(a.buckets, b.buckets),
    baseWin: a.baseWin + b.baseWin,
    baseLineWin: a.baseLineWin + b.baseLineWin,
    baseCollectWin: a.baseCollectWin + b.baseCollectWin,
    scatterWin: a.scatterWin + b.scatterWin,
    baseHits: a.baseHits + b.baseHits,
    baseCollects: a.baseCollects + b.baseCollects,
    triggers: a.triggers + b.triggers,
    freeWin: a.freeWin + b.freeWin,
    freeWinSq: a.freeWinSq + b.freeWinSq,
    freeSpinsPlayed: a.freeSpinsPlayed + b.freeSpinsPlayed,
    retriggers: a.retriggers + b.retriggers,
    maxFreeWin: Math.max(a.maxFreeWin, b.maxFreeWin),
    finalLevel: sumArrays(a.finalLevel, b.finalLevel),
  };
}

export interface SimReport {
  rounds: number;
  rtp: number;
  /** Half-width of the 95% confidence interval on RTP. */
  rtpCi95: number;
  baseRtp: number;
  baseLineRtp: number;
  baseCollectRtp: number;
  scatterRtp: number;
  freeRtp: number;
  hitFrequency: number;
  baseCollectFrequency: number;
  triggerOneIn: number;
  avgFreeSpinWin: number;
  freeSpinWinStdDev: number;
  avgFreeSpinsPerRound: number;
  retriggersPerRound: number;
  maxWin: number;
  maxFreeSpinWin: number;
  capHitOneIn: number;
  stdDev: number;
  buckets: Record<string, number>;
  /** Share of free-spin rounds ending on each multiplier, keyed like "x10". */
  finalMultiplier: Record<string, number>;
}

const stdDev = (sum: number, sumSq: number, n: number) =>
  n === 0 ? 0 : Math.sqrt(Math.max(0, sumSq / n - (sum / n) ** 2));

export function report(stats: SimStats, ladder: readonly number[]): SimReport {
  const n = stats.rounds;
  const t = stats.triggers;
  const sd = stdDev(stats.totalWin, stats.totalWinSq, n);
  return {
    rounds: n,
    rtp: stats.totalWin / n,
    rtpCi95: (1.96 * sd) / Math.sqrt(n),
    baseRtp: stats.baseWin / n,
    baseLineRtp: stats.baseLineWin / n,
    baseCollectRtp: stats.baseCollectWin / n,
    scatterRtp: stats.scatterWin / n,
    freeRtp: stats.freeWin / n,
    hitFrequency: stats.baseHits / n,
    baseCollectFrequency: stats.baseCollects / n,
    triggerOneIn: t === 0 ? Infinity : n / t,
    avgFreeSpinWin: t === 0 ? 0 : stats.freeWin / t,
    freeSpinWinStdDev: stdDev(stats.freeWin, stats.freeWinSq, t),
    avgFreeSpinsPerRound: t === 0 ? 0 : stats.freeSpinsPlayed / t,
    retriggersPerRound: t === 0 ? 0 : stats.retriggers / t,
    maxWin: stats.maxWin,
    maxFreeSpinWin: stats.maxFreeWin,
    capHitOneIn: stats.capHits === 0 ? Infinity : n / stats.capHits,
    stdDev: sd,
    buckets: Object.fromEntries(BUCKET_LABELS.map((label, i) => [label, stats.buckets[i]! / n])),
    finalMultiplier: Object.fromEntries(
      ladder.map((m, i) => [`x${m}`, t === 0 ? 0 : stats.finalLevel[i]! / t]),
    ),
  };
}

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
const oneIn = (v: number) => (Number.isFinite(v) ? `1 in ${Math.round(v).toLocaleString('en-GB')}` : 'never');
const x = (v: number) => `${v.toFixed(2)}x`;

export function formatReport(r: SimReport, meta: Record<string, string | number>): string {
  const rows: [string, string][] = [
    ...Object.entries(meta).map(([k, v]): [string, string] => [k, String(v)]),
    ['', ''],
    ['RTP', `${pct(r.rtp)} ± ${pct(r.rtpCi95)} (95%)`],
    ['  base', `${pct(r.baseRtp)}  (${pct(r.baseRtp / r.rtp)} of total)`],
    ['    lines', pct(r.baseLineRtp)],
    ['    collects', pct(r.baseCollectRtp)],
    ['    scatter bonus', pct(r.scatterRtp)],
    ['  free spins', `${pct(r.freeRtp)}  (${pct(r.freeRtp / r.rtp)} of total)`],
    ['Hit frequency', pct(r.hitFrequency)],
    ['Base collect frequency', pct(r.baseCollectFrequency)],
    ['Free-spin trigger', oneIn(r.triggerOneIn)],
    ['Avg free-spin round', `${x(r.avgFreeSpinWin)} (sd ${x(r.freeSpinWinStdDev)})`],
    ['Avg spins per round', r.avgFreeSpinsPerRound.toFixed(1)],
    ['Retriggers per round', r.retriggersPerRound.toFixed(3)],
    ['Max win', x(r.maxWin)],
    ['Max free-spin round', x(r.maxFreeSpinWin)],
    ['Max-win cap hit', oneIn(r.capHitOneIn)],
    ['Std deviation', x(r.stdDev)],
    ['', ''],
    ['Win distribution', ''],
    ...Object.entries(r.buckets).map(([k, v]): [string, string] => [`  ${k}`, pct(v)]),
    ['', ''],
    ['Free-spin final multiplier', ''],
    ...Object.entries(r.finalMultiplier).map(([k, v]): [string, string] => [`  ${k}`, pct(v)]),
  ];
  const width = Math.max(...rows.map(([k]) => k.length)) + 2;
  return rows.map(([k, v]) => (k ? `${k.padEnd(width)}${v}` : '')).join('\n') + '\n';
}
