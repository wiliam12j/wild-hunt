import gsap from 'gsap';
import { Container, Graphics, Text } from 'pixi.js';
import { PRESENTATION } from '../config/presentation.ts';

const { colors, fontFamily } = PRESENTATION;

/** Centred message panel for collects, free-spin intro and summary (placeholder for Phase 6 screens). */
export class Banner {
  readonly view = new Container();
  private readonly panel = new Graphics();
  private readonly title = new Text({
    text: '',
    style: { fontFamily, fontWeight: 'bold', fontSize: 64, fill: colors.highlight, align: 'center' },
  });
  private readonly subtitle = new Text({
    text: '',
    style: { fontFamily, fontSize: 32, fill: colors.text, align: 'center' },
  });

  private readonly width: number;
  private readonly height: number;

  /** Size of the area the banner centres itself in. */
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.title.anchor.set(0.5);
    this.subtitle.anchor.set(0.5);
    this.view.addChild(this.panel, this.title, this.subtitle);
    this.view.visible = false;
  }

  show(title: string, subtitle = ''): void {
    this.title.text = title;
    this.subtitle.text = subtitle;
    const w = Math.max(this.title.width, this.subtitle.width) + 80;
    const h = subtitle ? 190 : 130;
    this.panel
      .clear()
      .roundRect(-w / 2, -h / 2, w, h, 24)
      .fill({ color: colors.bannerBackground, alpha: 0.92 })
      .stroke({ width: 4, color: colors.bannerEdge });
    this.title.y = subtitle ? -32 : 0;
    this.subtitle.y = 48;
    this.view.position.set(this.width / 2, this.height / 2);
    this.view.visible = true;
    gsap.fromTo(this.view.scale, { x: 0.8, y: 0.8 }, { x: 1, y: 1, duration: 0.25, ease: 'back.out(2)' });
  }

  hide(): void {
    this.view.visible = false;
  }
}
