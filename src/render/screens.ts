import gsap from 'gsap';
import { Container, Graphics, Text } from 'pixi.js';
import { PRESENTATION } from '../config/presentation.ts';

const { colors, fontFamily, screens: cfg } = PRESENTATION;

export interface ScreenContent {
  readonly kicker: string;
  readonly title: string;
  readonly lines: readonly string[];
}

/**
 * Full-area overlay for the free-spin intro and summary. Resolves on tap, on `dismiss()`
 * (e.g. the spin button or space bar), or after a timeout.
 */
export class Screen {
  readonly view = new Container();
  private readonly backdrop = new Graphics();
  private readonly panel = new Graphics();
  private readonly kicker: Text;
  private readonly title: Text;
  private readonly body: Text;
  private readonly hint: Text;
  private readonly width: number;
  private readonly height: number;
  private close: (() => void) | null = null;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.backdrop.rect(0, 0, width, height).fill({ color: colors.dim, alpha: cfg.overlayAlpha });
    this.kicker = new Text({ text: '', style: { fontFamily, fontSize: 30, fill: colors.text, letterSpacing: 4 } });
    this.title = new Text({
      text: '',
      style: { fontFamily, fontWeight: 'bold', fontSize: 92, fill: colors.highlight, stroke: { color: 0x000000, width: 6 } },
    });
    this.body = new Text({ text: '', style: { fontFamily, fontSize: 30, fill: colors.text, align: 'center', lineHeight: 44 } });
    this.hint = new Text({ text: 'TAP TO CONTINUE', style: { fontFamily, fontSize: 22, fill: colors.text, letterSpacing: 3 } });
    for (const t of [this.kicker, this.title, this.body, this.hint]) t.anchor.set(0.5, 0);
    this.view.addChild(this.backdrop, this.panel, this.kicker, this.title, this.body, this.hint);
    this.view.visible = false;
    this.view.eventMode = 'static';
    this.view.cursor = 'pointer';
    this.view.on('pointertap', () => this.dismiss());
  }

  show(content: ScreenContent, autoContinueSeconds: number): Promise<void> {
    this.kicker.text = content.kicker;
    this.title.text = content.title;
    this.body.text = content.lines.join('\n');

    const gap = 22;
    const blockH = this.kicker.height + this.title.height + this.body.height + this.hint.height + gap * 3;
    const panelW = Math.min(this.width - 40, Math.max(this.title.width, this.body.width) + 120);
    const panelH = blockH + 80;
    const cx = this.width / 2;
    let y = (this.height - blockH) / 2;
    this.panel
      .clear()
      .roundRect(cx - panelW / 2, (this.height - panelH) / 2, panelW, panelH, 28)
      .fill({ color: colors.bannerBackground, alpha: 0.95 })
      .stroke({ width: 5, color: colors.bannerEdge });
    for (const t of [this.kicker, this.title, this.body, this.hint]) {
      t.position.set(cx, y);
      y += t.height + gap;
    }

    this.view.visible = true;
    gsap.fromTo(this.view, { alpha: 0 }, { alpha: 1, duration: 0.25 });
    gsap.fromTo(this.title.scale, { x: 0.6, y: 0.6 }, { x: 1, y: 1, duration: 0.45, ease: 'back.out(2.5)' });
    const blink = gsap.to(this.hint, { alpha: 0.35, duration: 0.7, yoyo: true, repeat: -1 });

    return new Promise((resolve) => {
      const timer = gsap.delayedCall(autoContinueSeconds, () => this.dismiss());
      this.close = () => {
        timer.kill();
        blink.kill();
        this.hint.alpha = 1;
        this.close = null;
        gsap.to(this.view, {
          alpha: 0,
          duration: 0.2,
          onComplete: () => {
            this.view.visible = false;
            resolve();
          },
        });
      };
    });
  }

  /** Closes the screen if one is showing. Returns true if it did. */
  dismiss(): boolean {
    if (!this.close) return false;
    this.close();
    return true;
  }
}
