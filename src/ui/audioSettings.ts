import { AUDIO } from '../config/audio.ts';
import type { AudioSettings } from '../audio/sound.ts';

const KEY = 'wild-hunt:audio';

/** Mute and volume, remembered per browser. Falls back to defaults if storage is unavailable. */
export function loadAudioSettings(): AudioSettings {
  const fallback = { muted: false, volume: AUDIO.defaultVolume };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const data = JSON.parse(raw) as Partial<AudioSettings>;
    return {
      muted: typeof data.muted === 'boolean' ? data.muted : fallback.muted,
      volume: typeof data.volume === 'number' && data.volume >= 0 && data.volume <= 1 ? data.volume : fallback.volume,
    };
  } catch {
    return fallback;
  }
}

export function saveAudioSettings(settings: AudioSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Not saved; still applies for this session.
  }
}
