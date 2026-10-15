import gsap from 'gsap';
import { Container, Graphics, Text } from 'pixi.js';
import { PRESENTATION } from '../config/presentation.ts';
import type { Particles } from './particles.ts';
import { winTier, type WinTier } from './rules.ts';

const { bigWin: cfg, colors, fontFamily, screens } = PRESENTATION;


/**
 * Full-screen Big / Mega / Epic win: the amount counts up, the title upgrades as it passes
 * each threshold, and coins fountain. Skip jumps to the final amount, a second skip closes.
 */
export class BigWin {
  readonly view = new Container();
  private readonly title: Text;
  private readonly amount: Text;
  private readonly width: number;
  private readonly height: number;
  private readonly particles: Particles;
  private skipHandler: (() => void) | null = null;

  constructor(width: number, height: number, particles: Particles) {
    this.width = width;
    this.height = height;
    this.particles = particles;
    const backdrop = new Graphics().rect(0, 0, width, height).fill({ color: colors.dim, alpha: screens.overlayAlpha });
    this.title = new Text({
      text: '',
      style: {
        fontFamily,
        fontWeight: 'bold',
        fontSize: 120,
        fill: colors.highlight,
        stroke: { color: 0x3a1f00, width: 10 },
        dropShadow: { color: 0x000000, distance: 6, alpha: 0.8, blur: 6, angle: Math.PI / 2 },
      },
    });
    this.amount = new Text({
      text: '',
      style: { fontFamily, fontWeight: 'bold', fontSize: 84, fill: colors.text, stroke: { color: 0x000000, width: 8 } },
    });
    this.title.anchor.set(0.5);
    this.amount.anchor.set(0.5);
    this.title.position.set(width / 2, height * 0.38);
    this.amount.position.set(width / 2, height * 0.62);
    this.view.addChild(backdrop, this.title, this.amount);
    this.view.visible = false;
    this.view.eventMode = 'static';
    this.view.cursor = 'pointer';
    this.view.on('pointertap', () => this.skip());
  }

  /**
   * Plays the overlay. `tiers` are thresholds in multiples of bet; `format` turns a multiple
   * into display credits. `speed` > 1 shortens it (turbo / autoplay).
   */
  play(
    multiple: number,
    tiers: { big: number; mega: number; epic: number },
    format: (multiple: number) => string,
    onTier: (tier: WinTier) => void,
    speed: number,
  ): Promise<void> {
    const finalTier = winTier(multiple, tiers) ?? 'big';
    const counter = { value: 0 };
    let tier: WinTier | null = null;
    const setTier = (t: WinTier) => {
      if (t === tier) return;
      tier = t;
      this.title.text = cfg.labels[t];
      gsap.fromTo(this.title.scale, { x: 1.5, y: 1.5 }, { x: 1, y: 1, duration: 0.45, ease: 'back.out(3)' });
      onTier(t);
    };

    this.view.visible = true;
    this.view.alpha = 1;
    setTier('big');
    this.amount.text = format(0);
    this.particles.startFountain(this.width / 2, this.height * 0.95, cfg.coinRate);

    const count = gsap.to(counter, {
      value: multiple,
      duration: cfg.countTime[finalTier] / speed,
      ease: 'power1.out',
      onUpdate: () => {
        this.amount.text = format(counter.value);
        const t = winTier(counter.value, tiers);
        if (t) setTier(t);
      },
    });
    const pulse = gsap.to(this.amount.scale, { x: 1.06, y: 1.06, duration: 0.3, yoyo: true, repeat: -1 });

    return new Promise((resolve) => {
      let holding: gsap.core.Tween | null = null;
      const close = () => {
        this.skipHandler = null;
        holding?.kill();
        pulse.kill();
        this.particles.stopFountain();
        gsap.to(this.view, {
          alpha: 0,
          duration: 0.3,
          onComplete: () => {
            this.view.visible = false;
            this.amount.scale.set(1);
            resolve();
          },
        });
      };
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        count.eventCallback('onComplete', null);
        count.progress(1);
        this.amount.text = format(multiple);
        setTier(finalTier);
        holding = gsap.delayedCall(cfg.hold / speed, close);
        this.skipHandler = close;
      };
      count.eventCallback('onComplete', finish);
      this.skipHandler = finish;
    });
  }

  /** First skip jumps to the final amount, second closes. Returns true if it did anything. */
  skip(): boolean {
    if (!this.skipHandler) return false;
    this.skipHandler();
    return true;
  }
}
