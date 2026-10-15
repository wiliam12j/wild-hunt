import { emptySession, type SessionStats } from './session.ts';

export const SAVE_VERSION = 1;

/** Settled player state. Always saved as if the current round had fully paid out. */
export interface SavedGame {
  version: number;
  balanceCents: number;
  betIndex: number;
  turbo: boolean;
  /** Stats since the last balance reset. */
  run: SessionStats;
  /** Stats across every run. */
  lifetime: SessionStats;
  /** Balance resets so far. */
  resets: number;
}

/** Where the game persists. Browser localStorage is plugged in by the UI layer. */
export interface GameStorage {
  load(): unknown;
  save(game: SavedGame): void;
}

export class MemoryStorage implements GameStorage {
  saved: SavedGame | null = null;
  load(): unknown {
    return this.saved && (JSON.parse(JSON.stringify(this.saved)) as SavedGame);
  }
  save(game: SavedGame): void {
    this.saved = JSON.parse(JSON.stringify(game)) as SavedGame;
  }
}

export function newSave(startingBalanceCents: number, betIndex: number): SavedGame {
  return {
    version: SAVE_VERSION,
    balanceCents: startingBalanceCents,
    betIndex,
    turbo: false,
    run: emptySession(),
    lifetime: emptySession(),
    resets: 0,
  };
}

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

function isSession(v: unknown): v is SessionStats {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return (Object.keys(emptySession()) as (keyof SessionStats)[]).every((k) => isCount(s[k]));
}

/** Validates loaded data; anything unrecognised or corrupt yields null (start fresh). */
export function parseSave(data: unknown, betLevelCount: number): SavedGame | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  if (d.version !== SAVE_VERSION) return null;
  if (!isCount(d.balanceCents) || !Number.isInteger(d.balanceCents)) return null;
  if (!Number.isInteger(d.betIndex) || (d.betIndex as number) < 0 || (d.betIndex as number) >= betLevelCount) {
    return null;
  }
  if (typeof d.turbo !== 'boolean' || !isSession(d.run) || !isSession(d.lifetime) || !isCount(d.resets)) {
    return null;
  }
  return d as unknown as SavedGame;
}
