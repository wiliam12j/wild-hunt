import { Application } from 'pixi.js';
import { PRESENTATION } from './config/presentation.ts';
import { createCryptoRng, createSeededRng } from './engine/rng.ts';
import { Scene } from './render/scene.ts';
import { GameMachine } from './state/machine.ts';
import { MemoryStorage } from './state/storage.ts';
import { mountHud } from './ui/hud.ts';
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

  // Controls go in first so the stage's size is final before the canvas measures it.
  mountHud(hud, game);

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

  new Scene(app, game);

  // Dev-only handle for debugging and automated checks. Stripped from production builds.
  if (import.meta.env.DEV) (window as unknown as { game: GameMachine }).game = game;
}

void start();
