import gsap from 'gsap';
import { Container, Graphics, Sprite, type Text } from 'pixi.js';
import { PRESENTATION, type SpinTiming } from '../config/presentation.ts';
import type { ReelStrip, SymbolId } from '../config/types.ts';
import { createValueText, type SymbolTextures } from './symbols.ts';

const { cell } = PRESENTATION;
const PITCH = cell.height + cell.gap;
/** Symbols covered by the final decelerate-and-bounce. */
const SETTLE_SYMBOLS = 3;

/** A result drawn over the strip with its top row at `anchor`. */
interface Placed {
  readonly landing: Landing;
  readonly anchor: number;
}

export interface Landing {
  readonly stop: number;
  /** What actually landed in each visible row (Trophies already turned into animals). */
  readonly symbols: readonly SymbolId[];
  /** Cash value per visible row, if any, as display text. */
  readonly values: readonly (string | null)[];
}

interface Slot {
  readonly root: Container;
  readonly sprite: Sprite;
  readonly value: Text;
}

/**
 * One reel. `position` is the strip index shown in the top row (fractional while moving).
 * Symbols scroll downward, so spinning decreases the position.
 *
 * Every spin scrolls a fixed distance and draws the result wherever it ends up, rather than
 * travelling to the engine's real stop index (which could add up to a whole lap). The strip
 * symbols around the result are only ever glimpsed in motion, so nobody can tell.
 */
export class Reel {
  readonly view = new Container();
  private readonly slots: Slot[] = [];
  private readonly content = new Container();
  private readonly textures: SymbolTextures;
  private readonly rows: number;
  private strip: ReelStrip;
  private landing: Placed | null = null;
  /** The previous result stays drawn in its window until it scrolls away. */
  private previous: Placed | null = null;
  private position = 0;
  private tween: gsap.core.Timeline | null = null;
  private target = 0;
  private timing: SpinTiming = PRESENTATION.timing.normal;
  private resolveSpin: (() => void) | null = null;

  constructor(textures: SymbolTextures, strip: ReelStrip, rows: number) {
    this.textures = textures;
    this.rows = rows;
    this.strip = strip;
    const mask = new Graphics().rect(0, 0, cell.width, rows * PITCH - cell.gap).fill(0xffffff);
    this.view.addChild(this.content, mask);
    this.content.mask = mask;
    // One spare slot above and below so scrolling never shows a gap.
    for (let i = 0; i < rows + 2; i++) {
      const root = new Container();
      const sprite = new Sprite();
      const value = createValueText();
      root.addChild(sprite, value);
      this.content.addChild(root);
      this.slots.push({ root, sprite, value });
    }
    this.render();
  }

  /** Switches strip (base vs free spins) while stopped. */
  setStrip(strip: ReelStrip): void {
    this.strip = strip;
    this.position = Math.min(Math.round(this.position), strip.length - 1);
    this.landing = null;
    this.previous = null;
    this.render();
  }

  /** Shows a landed result without animating (used on load). */
  show(landing: Landing): void {
    this.landing = { landing, anchor: landing.stop };
    this.previous = null;
    this.position = landing.stop;
    this.render();
  }

  /** Scrolls to the landing. Resolves once the reel has settled. */
  spin(landing: Landing, timing: SpinTiming, startDelay: number, stopDelay: number): Promise<void> {
    this.tween?.kill();
    this.timing = timing;
    const len = this.strip.length;
    const start = Math.round(this.position);
    const distance = Math.max(SETTLE_SYMBOLS + 1, Math.round(timing.speed * (timing.spinTime + stopDelay)));
    this.target = start - distance;
    this.previous = this.landing;
    this.landing = { landing, anchor: ((this.target % len) + len) % len };

    const settleDistance = SETTLE_SYMBOLS;
    const tl = gsap.timeline({ delay: startDelay, onUpdate: () => this.render() });
    tl.to(this, {
      position: this.target + settleDistance,
      duration: (distance - settleDistance) / timing.speed,
      ease: 'power1.in',
    });
    tl.to(this, { position: this.target, duration: timing.settleTime, ease: `back.out(${timing.bounce})` });
    this.tween = tl;
    return new Promise((resolve) => {
      this.resolveSpin = resolve;
      tl.eventCallback('onComplete', () => this.finish());
    });
  }

  /** Lands immediately-ish, keeping the bounce. */
  slam(): void {
    if (!this.tween || !this.resolveSpin) return;
    this.tween.kill();
    // Drop in from one symbol above so the bounce still reads.
    this.position = this.target + 1;
    this.tween = gsap.timeline({ onUpdate: () => this.render(), onComplete: () => this.finish() });
    this.tween.to(this, { position: this.target, duration: this.timing.quickStopTime, ease: `back.out(${this.timing.bounce})` });
  }

  private finish(): void {
    this.tween = null;
    this.previous = null;
    const len = this.strip.length;
    this.position = ((this.target % len) + len) % len;
    this.render();
    const resolve = this.resolveSpin;
    this.resolveSpin = null;
    resolve?.();
  }

  private render(): void {
    const len = this.strip.length;
    const top = Math.floor(this.position);
    const frac = this.position - top;
    for (let k = 0; k < this.slots.length; k++) {
      const slot = this.slots[k]!;
      const row = k - 1;
      const index = (((top + row) % len) + len) % len;
      const { symbol, value } = this.symbolAt(index);
      slot.sprite.texture = this.textures.get(symbol)!;
      slot.value.text = value ?? '';
      slot.root.y = (row - frac) * PITCH;
    }
  }

  /** Strip symbol at an index, with landed results substituted in their stop windows. */
  private symbolAt(index: number): { symbol: SymbolId; value: string | null } {
    const len = this.strip.length;
    for (const placed of [this.landing, this.previous]) {
      if (!placed) continue;
      const offset = (((index - placed.anchor) % len) + len) % len;
      if (offset < this.rows) {
        return { symbol: placed.landing.symbols[offset]!, value: placed.landing.values[offset] ?? null };
      }
    }
    return { symbol: this.strip[index]!, value: null };
  }
}
