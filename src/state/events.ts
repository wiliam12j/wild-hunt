/** Minimal typed event emitter so the UI can follow the game without the state layer knowing about it. */
export class Emitter<Events extends Record<string, unknown>> {
  private readonly listeners: { [K in keyof Events]?: Set<(payload: Events[K]) => void> } = {};

  /** Subscribes; returns an unsubscribe function. */
  on<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): () => void {
    const set = (this.listeners[event] ??= new Set());
    set.add(listener);
    return () => set.delete(listener);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    for (const listener of [...(this.listeners[event] ?? [])]) listener(payload);
  }
}
