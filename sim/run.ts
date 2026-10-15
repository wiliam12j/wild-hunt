// Headless simulator: plays N paid rounds (base spin + any free-spin round) and reports
// the math model. Usage: npm run sim -- [--spins 10000000] [--seed 1] [--threads N]
//
// Work is split into a fixed number of chunks, each with its own derived seed, so results
// depend only on --spins and --seed, never on how many cores the machine has.

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { parseArgs } from 'node:util';
import { Worker } from 'node:worker_threads';
import { DEFAULT_CONFIG } from '../src/engine/defaultConfig.ts';
import { emptyStats, formatReport, merge, report, type SimStats } from './stats.ts';
import type { ChunkJob } from './worker.ts';

const CHUNKS = 64;

const { values } = parseArgs({
  options: {
    spins: { type: 'string', default: '10000000' },
    seed: { type: 'string', default: '1' },
    threads: { type: 'string', default: String(availableParallelism()) },
  },
});
const rounds = Number(values.spins);
const seed = Number(values.seed);
const threads = Math.max(1, Number(values.threads));

const configHash = createHash('sha256').update(JSON.stringify(DEFAULT_CONFIG)).digest('hex').slice(0, 8);
const ladder = DEFAULT_CONFIG.freeSpins.multiplierLadder;

/** Chunk seeds derived from the run seed so chunks don't share sequences. */
const chunkSeed = (i: number) => createHash('sha256').update(`${seed}:${i}`).digest().readUInt32LE(0);

const jobs: ChunkJob[] = Array.from({ length: CHUNKS }, (_, i) => ({
  rounds: Math.floor(rounds / CHUNKS) + (i < rounds % CHUNKS ? 1 : 0),
  seed: chunkSeed(i),
})).filter((j) => j.rounds > 0);

function runJob(job: ChunkJob): Promise<SimStats> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { workerData: job });
    worker.once('message', resolve);
    worker.once('error', reject);
  });
}

const started = Date.now();
const chunks: SimStats[] = [];
let done = 0;
let next = 0;
async function lane(): Promise<void> {
  while (next < jobs.length) {
    const i = next++;
    chunks[i] = await runJob(jobs[i]!);
    done++;
    if (process.stdout.isTTY) process.stdout.write(`\r${done}/${jobs.length} chunks`);
  }
}
await Promise.all(Array.from({ length: Math.min(threads, jobs.length) }, lane));
if (process.stdout.isTTY) process.stdout.write('\n\n');

// Merge in chunk order so float sums come out identical on every run.
const total = chunks.reduce(merge, emptyStats(ladder.length));

if (total.rounds !== rounds) throw new Error(`Lost results: ran ${total.rounds} of ${rounds} rounds`);
const seconds = (Date.now() - started) / 1000;
const result = report(total, ladder);
const meta = {
  date: new Date().toISOString(),
  configHash,
  seed,
  rounds,
  seconds: seconds.toFixed(1),
};
const text = formatReport(result, meta);
console.log(text);

const dir = new URL('./results/', import.meta.url);
mkdirSync(dir, { recursive: true });
const name = `${meta.date.replace(/[:.]/g, '-')}_${configHash}`;
writeFileSync(new URL(`${name}.json`, dir), JSON.stringify({ meta, report: result, config: DEFAULT_CONFIG }, null, 2));
writeFileSync(new URL(`${name}.txt`, dir), text);
console.log(`Saved sim/results/${name}.{json,txt}`);
