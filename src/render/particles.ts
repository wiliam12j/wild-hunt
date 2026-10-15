import gsap from 'gsap';
import { Container, Graphics, Sprite, type Renderer, type Texture, type Ticker } from 'pixi.js';
import { PRESENTATION } from '../config/presentation.ts';

const { particles: cfg } = PRESENTATION;

export interface ParticleStyle {
  readonly colors: readonly number[];
  readonly speed: number;
  readonly life: number;
  readonly size: number;
  readonly count?: number;
}

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  age: number;
  life: number;
  gravity: number;
  spin: number;
}

/** Lightweight sprite particles: bursts and a coin fountain. Updated from the Pixi ticker. */
export class Particles {
  readonly view = new Container();
  private readonly texture: Texture;
  private readonly live: Particle[] = [];
  private fountain: { x: number; y: number; rate: number; carry: number } | null = null;

  constructor(renderer: Renderer, ticker: Ticker) {
    const dot = new Graphics().circle(16, 16, 16).fill(0xffffff);
    this.texture = renderer.generateTexture({ target: dot, resolution: 2 });
    dot.destroy();
    ticker.add((t) => this.update(t.deltaMS / 1000));
  }

  /** Throws `count` particles out from a point. `angle`/`spread` in radians (default: all round). */
  burst(x: number, y: number, style: ParticleStyle, opts: { gravity?: number; angle?: number; spread?: number } = {}): void {
    const count = style.count ?? 10;
    const spread = opts.spread ?? Math.PI * 2;
    const angle = opts.angle ?? 0;
    for (let i = 0; i < count; i++) {
      const a = angle - spread / 2 + Math.random() * spread;
      const v = style.speed * (0.4 + Math.random() * 0.6);
      this.spawn(x, y, Math.cos(a) * v, Math.sin(a) * v, style, opts.gravity ?? 0);
    }
  }

  /** Starts a coin fountain spraying upward from a point (one at a time). */
  startFountain(x: number, y: number, rate: number): void {
    this.fountain = { x, y, rate, carry: 0 };
  }

  stopFountain(): void {
    this.fountain = null;
  }

  /** Fades out and removes everything. */
  clear(): void {
    this.fountain = null;
    for (const p of this.live) gsap.to(p.sprite, { alpha: 0, duration: 0.2 });
  }

  private spawn(x: number, y: number, vx: number, vy: number, style: ParticleStyle, gravity: number): void {
    if (this.live.length >= cfg.limit) return;
    const sprite = new Sprite(this.texture);
    sprite.anchor.set(0.5);
    sprite.position.set(x, y);
    sprite.tint = style.colors[Math.floor(Math.random() * style.colors.length)]!;
    sprite.scale.set((style.size / 16) * (0.6 + Math.random() * 0.8));
    this.view.addChild(sprite);
    this.live.push({ sprite, vx, vy, age: 0, life: style.life * (0.7 + Math.random() * 0.6), gravity, spin: (Math.random() - 0.5) * 8 });
  }

  private update(dt: number): void {
    const f = this.fountain;
    if (f) {
      f.carry += f.rate * dt;
      const c = cfg.coin;
      while (f.carry >= 1) {
        f.carry--;
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
        const v = c.speed * (0.6 + Math.random() * 0.4);
        this.spawn(f.x, f.y, Math.cos(a) * v, Math.sin(a) * v, c, cfg.gravity);
      }
    }
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i]!;
      p.age += dt;
      if (p.age >= p.life || p.sprite.alpha <= 0) {
        p.sprite.destroy();
        this.live.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      p.sprite.rotation += p.spin * dt;
      const remaining = 1 - p.age / p.life;
      p.sprite.alpha = Math.min(p.sprite.alpha, Math.min(1, remaining * 2.5));
    }
  }
}

const shakeState = new WeakMap<Container, gsap.core.Tween>();

/** Shakes a container that normally sits at (0, 0); overlapping shakes restart cleanly. */
export function shake(target: Container, strength: number, duration: number): void {
  shakeState.get(target)?.kill();
  const state = { t: 0 };
  const tween = gsap.to(state, {
    t: 1,
    duration,
    ease: 'none',
    onUpdate: () => {
      const s = strength * (1 - state.t);
      target.position.set((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
    },
    onComplete: () => target.position.set(0, 0),
  });
  shakeState.set(target, tween);
}
