import gsap from 'gsap';
import { Container, Graphics, Text } from 'pixi.js';
import { PRESENTATION } from '../config/presentation.ts';

const { colors, fontFamily, meter: cfg } = PRESENTATION;

export interface MeterState {
  readonly spin: number;
  readonly totalSpins: number;
  /** Hunters collected toward the next upgrade (0 … perUpgrade-1). */
  readonly badges: number;
  /** Index into the multiplier ladder. */
  readonly level: number;
}

/**
 * Free-spin header: spin counter, Hunter badges toward the next upgrade, and the multiplier
 * ladder with the current step lit.
 */
export class Meter {
  readonly view = new Container();
  private readonly counter: Text;
  private readonly badgeViews: Graphics[] = [];
  private readonly steps: Text[] = [];
  private readonly popup: Text;
  private readonly perUpgrade: number;
  private state: MeterState = { spin: 0, totalSpins: 0, badges: 0, level: 0 };

  /**
   * Lays itself out across `width` at the top of the scene. The "+N SPINS" popup appears at
   * `popupY` (the middle of the reels) so it never covers the meter itself.
   */
  constructor(width: number, ladder: readonly number[], perUpgrade: number, popupY: number) {
    this.perUpgrade = perUpgrade;
    const textStyle = { fontFamily, fontWeight: 'bold' as const, fill: colors.highlight };

    this.counter = new Text({ text: '', style: { ...textStyle, fontSize: 34 } });
    this.counter.anchor.set(0, 0.5);
    this.counter.position.set(0, 34);

    const badges = new Container();
    const d = cfg.badgeRadius * 2 + cfg.badgeGap;
    for (let i = 0; i < perUpgrade; i++) {
      const g = new Graphics();
      g.position.set(i * d + cfg.badgeRadius, 0);
      badges.addChild(g);
      this.badgeViews.push(g);
    }
    const huntersLabel = new Text({ text: 'HUNTERS', style: { ...textStyle, fontSize: 18, fill: colors.text } });
    huntersLabel.anchor.set(0.5, 1);
    huntersLabel.position.set((perUpgrade * d - cfg.badgeGap) / 2, -cfg.badgeRadius - 6);
    badges.addChild(huntersLabel);
    badges.position.set(width / 2 - (perUpgrade * d - cfg.badgeGap) / 2, 92);

    const ladderView = new Container();
    let x = 0;
    for (const m of ladder) {
      const t = new Text({ text: `×${m}`, style: { ...textStyle, fontSize: 34 } });
      t.anchor.set(0, 0.5);
      t.x = x;
      x += t.width + 18;
      ladderView.addChild(t);
      this.steps.push(t);
    }
    ladderView.position.set(width - (x - 18), 34);

    this.popup = new Text({ text: '', style: { ...textStyle, fontSize: 96, stroke: { color: 0x000000, width: 8 } } });
    this.popup.anchor.set(0.5);
    this.popup.position.set(width / 2, popupY);
    this.popup.alpha = 0;

    this.view.addChild(this.counter, badges, ladderView, this.popup);
    this.draw();
  }

  /** Sets the meter instantly. */
  set(state: MeterState): void {
    this.state = state;
    this.draw();
  }

  /**
   * Fills one badge per collecting Hunter. Each time the meter fills it flashes, empties and
   * steps the ladder; a retrigger then shows "+N SPINS". Ends exactly on `next`.
   */
  async advance(collected: number, next: MeterState, spinsAdded: number, speed: number): Promise<void> {
    const tl = gsap.timeline();
    tl.timeScale(speed);
    let { badges, level } = this.state;
    const top = this.steps.length - 1;

    for (let i = 0; i < collected; i++) {
      badges++;
      const filled = badges;
      tl.add(() => this.patch({ badges: filled }));
      tl.fromTo(this.badgeViews[filled - 1]!.scale, { x: 1.5, y: 1.5 }, { x: 1, y: 1, duration: cfg.fillTime });
      if (badges === this.perUpgrade) {
        badges = 0;
        level = Math.min(level + 1, top);
        const newLevel = level;
        tl.to([...this.badgeViews], { alpha: 0.3, duration: 0.1, yoyo: true, repeat: 3 });
        tl.add(() => this.patch({ badges: 0, level: newLevel }));
        tl.fromTo(this.steps[newLevel]!.scale, { x: 1.7, y: 1.7 }, { x: 1, y: 1, duration: 0.45, ease: 'back.out(2)' });
      }
    }

    if (spinsAdded > 0) {
      tl.add(() => {
        this.popup.text = `+${spinsAdded} SPINS!`;
        this.patch({ totalSpins: next.totalSpins });
      });
      tl.fromTo(this.popup, { alpha: 0 }, { alpha: 1, duration: 0.15 });
      tl.fromTo(this.popup.scale, { x: 0.5, y: 0.5 }, { x: 1.2, y: 1.2, duration: 0.35, ease: 'back.out(2)' }, '<');
      tl.to(this.popup, { alpha: 0, duration: 0.3 }, `+=${cfg.upgradeTime}`);
    }
    tl.add(() => this.set(next));
    await tl;
  }

  private patch(change: Partial<MeterState>): void {
    this.state = { ...this.state, ...change };
    this.draw();
  }

  private draw(): void {
    const { spin, totalSpins, badges, level } = this.state;
    this.counter.text = `FREE SPIN ${spin} / ${totalSpins}`;
    this.badgeViews.forEach((g, i) => {
      g.clear()
        .circle(0, 0, cfg.badgeRadius)
        .fill(i < badges ? cfg.fillColor : cfg.emptyColor)
        .stroke({ width: 3, color: colors.frameEdge });
    });
    this.steps.forEach((t, i) => {
      t.style.fill = i === level ? colors.highlight : cfg.ladderInactive;
      t.alpha = i === level ? 1 : 0.8;
    });
  }
}
