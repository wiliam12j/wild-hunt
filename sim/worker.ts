import { parentPort, workerData } from 'node:worker_threads';
import { DEFAULT_CONFIG } from '../src/engine/defaultConfig.ts';
import { playRound } from '../src/engine/freeSpins.ts';
import { createSeededRng } from '../src/engine/rng.ts';
import { emptyStats, record } from './stats.ts';

export interface ChunkJob {
  readonly rounds: number;
  readonly seed: number;
}

const { rounds, seed } = workerData as ChunkJob;
const ladder = DEFAULT_CONFIG.freeSpins.multiplierLadder;
const rng = createSeededRng(seed);
const stats = emptyStats(ladder.length);
for (let i = 0; i < rounds; i++) record(stats, playRound(rng, DEFAULT_CONFIG), ladder);
parentPort!.postMessage(stats);
