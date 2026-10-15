import { Application } from 'pixi.js';
import { SoundManager } from './audio/sound.ts';
import { BET_LEVELS } from './config/betLevels.ts';
import { PRESENTATION } from './config/presentation.ts';
import { createCryptoRng, createSeededRng } from './engine/rng.ts';
import { Scene } from './render/scene.ts';
import { Autoplay } from './state/autoplay.ts';
import { GameMachine } from './state/machine.ts';
import { MemoryStorage } from './state/storage.ts';
import { mountHud } from './ui/hud.ts';
import { loadAudioSettings, saveAudioSettings } from './ui/audioSettings.ts';
import { LocalGameStorage } from './ui/storage.ts';

async function start(): Promise<void> {
  const stage = document.querySelector<HTMLElement>('#stage')!;
  const hud = document.querySelector<HTMLElement>('#hud')!;

  // Dev only: ?seed=N makes spins repeatable (and skips saving) for debugging and checks.
  const seed = import.meta.env.DEV ? new URLSearchParams(location.search).get('seed') : null;
  const game = new GameMachine(
    seed === null
      ? { rng: createCryptoRng(), storage: new LocalGameStorage() }
      : { rng: createSeededRng(Number(seed)), storage: new MemoryStorage() },
  );

  const autoplay = new Autoplay(game);
  const sound = new SoundManager(loadAudioSettings());
  const audio = {
    get muted() {
      return sound.muted;
    },
    get volume() {
      return sound.volume;
    },
    setMuted(muted: boolean) {
      sound.setMuted(muted);
      saveAudioSettings({ muted, volume: sound.volume });
    },
    setVolume(volume: number) {
      sound.setVolume(volume);
      saveAudioSettings({ muted: sound.muted, volume: sound.volume });
    },
  };
  let scene: Scene | null = null;

  // Controls go in first so the stage's size is final before the canvas measures it.
  mountHud(hud, { game, audio, autoplay, betLevels: BET_LEVELS, skip: () => scene?.skip() ?? false });

  const app = new Application();
  await app.init({
    resizeTo: stage,
    background: PRESENTATION.colors.background,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio,
  });
  stage.appendChild(app.canvas);
  // resizeTo only reacts to window resizes; also follow the stage itself (HUD wrapping, rotation).
  new ResizeObserver(() => app.resize()).observe(stage);

  scene = new Scene(app, game, { isAutoplay: () => autoplay.active, sfx: sound });

  // Dev-only handle for debugging and automated checks. Stripped from production builds.
  if (import.meta.env.DEV) Object.assign(window, { game, sound });
}

void start();
