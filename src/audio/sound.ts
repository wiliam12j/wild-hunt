import { Howl, Howler } from 'howler';
import { AUDIO, SOUNDS, type MusicId, type SoundId } from '../config/audio.ts';

export interface AudioSettings {
  muted: boolean;
  volume: number;
}

/** What the renderer needs from audio; lets the scene run silently in tests or without sound. */
export interface Sfx {
  play(id: SoundId): void;
  /** Plays a sound, cutting off any copy of it that is still playing. */
  restart(id: SoundId): void;
  /** Starts a looping sound if not already playing. */
  loop(id: SoundId): void;
  stop(id: SoundId): void;
  music(id: MusicId): void;
}

export const silentSfx: Sfx = { play() {}, restart() {}, loop() {}, stop() {}, music() {} };

/** Howler-backed sounds. Browsers unlock audio on the first tap/key; Howler handles that. */
export class SoundManager implements Sfx {
  private readonly howls = new Map<SoundId, Howl>();
  private readonly loops = new Map<SoundId, number>();
  private currentMusic: MusicId | null = null;
  private musicIds = new Map<MusicId, number>();
  private settings: AudioSettings;

  constructor(settings: AudioSettings) {
    this.settings = settings;
    for (const [id, def] of Object.entries(SOUNDS) as [SoundId, (typeof SOUNDS)[SoundId]][]) {
      this.howls.set(
        id,
        new Howl({ src: [AUDIO.basePath + def.file], volume: def.volume, loop: 'loop' in def && def.loop, preload: true }),
      );
    }
    this.apply();
  }

  get muted(): boolean {
    return this.settings.muted;
  }
  get volume(): number {
    return this.settings.volume;
  }

  setMuted(muted: boolean): void {
    this.settings = { ...this.settings, muted };
    this.apply();
  }

  setVolume(volume: number): void {
    this.settings = { ...this.settings, volume: Math.min(1, Math.max(0, volume)) };
    this.apply();
  }

  play(id: SoundId): void {
    this.howls.get(id)?.play();
  }

  restart(id: SoundId): void {
    const howl = this.howls.get(id);
    howl?.stop();
    howl?.play();
  }

  loop(id: SoundId): void {
    if (this.loops.has(id)) return;
    const howl = this.howls.get(id);
    if (howl) this.loops.set(id, howl.play());
  }

  stop(id: SoundId): void {
    const howl = this.howls.get(id);
    const playing = this.loops.get(id);
    if (howl && playing !== undefined) howl.stop(playing);
    this.loops.delete(id);
  }

  /** Cross-fades to a music track. */
  music(id: MusicId): void {
    if (this.currentMusic === id) return;
    const fadeMs = AUDIO.musicFade * 1000;
    if (this.currentMusic) {
      const old = this.howls.get(this.currentMusic)!;
      const oldId = this.musicIds.get(this.currentMusic);
      if (oldId !== undefined) {
        old.fade(old.volume(oldId) as number, 0, fadeMs, oldId);
        old.once('fade', () => old.stop(oldId), oldId);
      }
    }
    const howl = this.howls.get(id)!;
    const playId = howl.play();
    howl.fade(0, SOUNDS[id].volume, fadeMs, playId);
    this.musicIds.set(id, playId);
    this.currentMusic = id;
  }

  private apply(): void {
    Howler.mute(this.settings.muted);
    Howler.volume(this.settings.volume);
  }
}
