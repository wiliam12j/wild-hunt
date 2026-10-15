import type { GameStorage, SavedGame } from '../state/storage.ts';

const KEY = 'wild-hunt:save';

/** Browser persistence. Never throws: private mode or blocked storage just means no saving. */
export class LocalGameStorage implements GameStorage {
  load(): unknown {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as unknown) : null;
    } catch {
      return null;
    }
  }

  save(game: SavedGame): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(game));
    } catch {
      // Storage unavailable; the game still works for this session.
    }
  }
}
