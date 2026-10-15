import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import { createSeededRng } from '../engine/rng.ts';

// Full-screen backdrop behind the reels: the player's image (cropped to cover) if supplied,
// otherwise a drawn misty forest at dusk with lantern glows. Redrawn on every resize.

/** Backdrop palette: sky, far/mid/near tree layers, fog, lantern light. */
const P = {
  skyTop: 0x0b0f0c,
  skyBottom: 0x26302a,
  moon: 0xe9e2c8,
  far: 0x1e2a24,
  mid: 0x16201b,
  near: 0x0d1410,
  fog: 0xa9b3a6,
  lantern: 0xffc46b,
  ground: 0x0a0f0b,
} as const;

/** Fixed layout seed so the forest looks the same on every visit. */
const FOREST_SEED = 1871;

export class Background {
  readonly view = new Container();
  private readonly image: Sprite | null;
  private readonly drawn = new Graphics();

  constructor(image: Texture | null) {
    this.image = image ? new Sprite(image) : null;
    this.view.addChild(this.image ?? this.drawn);
  }

  resize(width: number, height: number): void {
    if (this.image) {
      const tex = this.image.texture;
      const scale = Math.max(width / tex.width, height / tex.height);
      this.image.scale.set(scale);
      this.image.position.set((width - tex.width * scale) / 2, (height - tex.height * scale) / 2);
      return;
    }
    this.drawForest(width, height);
  }

  private drawForest(w: number, h: number): void {
    const g = this.drawn.clear();
    const rng = createSeededRng(FOREST_SEED);

    // Sky: banded vertical gradient.
    const bands = 24;
    for (let i = 0; i < bands; i++) {
      g.rect(0, (h * i) / bands, w, h / bands + 1).fill(lerpColor(P.skyTop, P.skyBottom, i / (bands - 1)));
    }
    // Moon with a soft halo.
    const mx = w * 0.78;
    const my = h * 0.16;
    const mr = Math.min(w, h) * 0.05;
    for (let i = 5; i >= 1; i--) g.circle(mx, my, mr * (1 + i * 0.6)).fill({ color: P.moon, alpha: 0.025 });
    g.circle(mx, my, mr).fill({ color: P.moon, alpha: 0.85 });

    // Three layers of pines, far to near, with fog between them.
    const layers = [
      { color: P.far, base: 0.62, height: 0.3, count: 26, fog: 0.1 },
      { color: P.mid, base: 0.74, height: 0.38, count: 18, fog: 0.08 },
      { color: P.near, base: 0.9, height: 0.5, count: 11, fog: 0 },
    ];
    for (const layer of layers) {
      for (let i = 0; i < layer.count; i++) {
        const x = ((i + rng.next() * 0.8) / layer.count) * w * 1.1 - w * 0.05;
        const th = h * layer.height * (0.65 + rng.next() * 0.5);
        pine(g, x, h * layer.base, th, layer.color);
      }
      g.rect(0, h * layer.base, w, h * (1 - layer.base)).fill(layer.color);
      if (layer.fog > 0) {
        for (let k = 0; k < 4; k++) {
          g.rect(0, h * (layer.base - 0.06 + k * 0.025), w, h * 0.05).fill({ color: P.fog, alpha: layer.fog / (k + 1) });
        }
      }
    }
    g.rect(0, h * 0.95, w, h * 0.05).fill(P.ground);

    // Lantern glows at the sides, as if hung on the lodge porch.
    for (const lx of [w * 0.06, w * 0.94]) {
      const ly = h * 0.42;
      for (let i = 6; i >= 1; i--) g.circle(lx, ly, Math.min(w, h) * 0.02 * i).fill({ color: P.lantern, alpha: 0.035 });
      g.circle(lx, ly, Math.min(w, h) * 0.012).fill(P.lantern);
    }
  }
}

function pine(g: Graphics, x: number, baseY: number, height: number, color: number): void {
  const tiers = 4;
  const width = height * 0.42;
  for (let t = 0; t < tiers; t++) {
    const top = baseY - height + (t * height) / (tiers + 0.5);
    const bottom = top + height * 0.42;
    const half = (width / 2) * ((t + 1.4) / (tiers + 0.4));
    g.poly([x, top, x + half, bottom, x - half, bottom]).fill(color);
  }
  g.rect(x - width * 0.05, baseY - height * 0.12, width * 0.1, height * 0.12).fill(color);
}

function lerpColor(a: number, b: number, t: number): number {
  const ch = (c: number, s: number) => (c >> s) & 0xff;
  const mix = (s: number) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t) << s;
  return mix(16) | mix(8) | mix(0);
}
