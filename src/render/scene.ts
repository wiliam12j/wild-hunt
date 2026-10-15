import gsap from 'gsap';
import { Container, Graphics, Text, type Application, type Texture } from 'pixi.js';
import { AUDIO } from '../config/audio.ts';
import { GAME } from '../config/game.ts';
import { PRESENTATION } from '../config/presentation.ts';
import type { FreeSpinResult, Position } from '../engine/types.ts';
import { silentSfx, type Sfx } from '../audio/sound.ts';
import type { GameMachine, GameState } from '../state/machine.ts';
import { winCents } from '../state/wallet.ts';
import { formatCredits, formatCreditsShort } from '../ui/format.ts';
import { BigWin } from './bigWin.ts';
import { playCollect, type Playing } from './collect.ts';
import { Meter, type MeterState } from './meter.ts';
import { Particles, shake, type ParticleStyle } from './particles.ts';
import { ReelGrid } from './reels.ts';
import { winTier } from './rules.ts';
import { Screen } from './screens.ts';
import type { SymbolTextures } from './symbols.ts';
import { Background } from './background.ts';

const { colors, fontFamily, framePadding, headerHeight, particles: fx, screens, show, stageMargin, timing, turboFactor } =
  PRESENTATION;

/** 1st, 2nd, 3rd, 4th, 11th, 21st … */
function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
}

export interface SceneOptions {
  /** Whether autoplay is running (screens then continue on their own sooner). */
  readonly isAutoplay: () => boolean;
  readonly sfx?: Sfx;
  /** Symbol textures (built-in art or the player's images), from createSymbolTextures. */
  readonly textures: SymbolTextures;
  /** The player's background image, if any; otherwise a drawn forest. */
  readonly background: Texture | null;
}

/**
 * Draws the game and walks it through each state: plays the animation for the state the
 * machine is in, then calls advance(). `skip()` hurries whatever is currently showing.
 */
export class Scene {
  private readonly root = new Container();
  /** Everything that shakes; sits at (0, 0) inside root. */
  private readonly shaker = new Container();
  private readonly grid: ReelGrid;
  private readonly particles: Particles;
  private readonly bigWin: BigWin;
  private readonly sfx: Sfx;
  private readonly background: Background;
  private readonly info: Text;
  private readonly meter: Meter;
  private readonly screen: Screen;
  private readonly designWidth: number;
  private readonly designHeight: number;
  private readonly game: GameMachine;
  private readonly app: Application;
  private readonly options: SceneOptions;

  /** Ends the current timed hold early. */
  private endHold: (() => void) | null = null;
  private collecting: Playing | null = null;

  constructor(app: Application, game: GameMachine, options: SceneOptions) {
    this.app = app;
    this.game = game;
    this.options = options;
    this.sfx = options.sfx ?? silentSfx;
    const cfg = game.config;
    this.grid = new ReelGrid(options.textures, cfg);
    this.background = new Background(options.background);

    const frameW = this.grid.width + framePadding * 2;
    const frameH = this.grid.height + framePadding * 2;
    this.designWidth = frameW;
    this.designHeight = frameH + headerHeight;

    this.info = new Text({
      text: '',
      style: { fontFamily, fontWeight: 'bold', fontSize: 40, fill: colors.highlight, align: 'center' },
    });

    this.meter = new Meter(
      frameW,
      cfg.freeSpins.multiplierLadder,
      cfg.freeSpins.huntersPerUpgrade,
      headerHeight + frameH / 2,
    );
    this.meter.view.visible = false;

    const frame = new Graphics()
      .roundRect(0, headerHeight, frameW, frameH, 28)
      .fill(colors.frame)
      .stroke({ width: 6, color: colors.frameEdge })
      .roundRect(framePadding, headerHeight + framePadding, this.grid.width, this.grid.height, 12)
      .fill(colors.reelBackground);
    this.grid.view.position.set(framePadding, headerHeight + framePadding);

    this.screen = new Screen(this.designWidth, this.designHeight);
    this.particles = new Particles(app.renderer, app.ticker);
    this.bigWin = new BigWin(this.designWidth, this.designHeight, this.particles);

    this.shaker.addChild(frame, this.grid.view, this.meter.view, this.info);
    this.root.addChild(this.shaker, this.screen.view, this.bigWin.view, this.particles.view);
    app.stage.addChild(this.background.view, this.root);
    this.sfx.music('musicBase');
    this.placeInfo('base');

    app.renderer.on('resize', () => this.layout());
    this.layout();

    game.events.on('stateChange', ({ to }) => void this.onState(to));
    game.events.on('quickStop', () => this.grid.slam());
  }

  /** Hurries the current presentation: closes a screen, finishes a collect or ends a hold. */
  skip(): boolean {
    if (this.bigWin.skip()) return true;
    if (this.screen.dismiss()) return true;
    if (this.collecting) {
      this.collecting.skip();
      return true;
    }
    if (this.endHold) {
      this.endHold();
      return true;
    }
    return false;
  }

  private layout(): void {
    const { width, height } = this.app.screen;
    this.background.resize(width, height);
    const margin = Math.min(width, height) * stageMargin;
    const scale = Math.min((width - margin * 2) / this.designWidth, (height - margin * 2) / this.designHeight);
    this.root.scale.set(scale);
    this.root.position.set((width - this.designWidth * scale) / 2, (height - this.designHeight * scale) / 2);
  }

  /** Base game: messages centred in the header. Free spins: right of the Hunter badges. */
  private placeInfo(mode: 'base' | 'free'): void {
    if (mode === 'base') {
      this.info.anchor.set(0.5);
      this.info.style.fontSize = 40;
      this.info.position.set(this.designWidth / 2, headerHeight / 2);
    } else {
      this.info.anchor.set(1, 0.5);
      this.info.style.fontSize = 30;
      this.info.position.set(this.designWidth, 92);
    }
  }

  private get speed(): number {
    return this.game.turbo ? 1 / turboFactor : 1;
  }

  /** Waits `seconds` (shorter in turbo) unless skipped. */
  private hold(seconds: number): Promise<void> {
    return new Promise((resolve) => {
      const call = gsap.delayedCall(seconds / this.speed, () => end());
      const end = () => {
        call.kill();
        this.endHold = null;
        resolve();
      };
      this.endHold = end;
    });
  }

  private credits(multiple: number): string {
    return formatCredits(winCents(multiple, this.game.bet));
  }

  private get autoContinue(): number {
    return this.options.isAutoplay() ? screens.autoContinueAutoplay : screens.autoContinue;
  }

  private async onState(state: GameState): Promise<void> {
    // Let the machine finish emitting before we react (and possibly advance again).
    await Promise.resolve();
    const game = this.game;
    const spin = game.currentSpin;

    switch (state) {
      case 'IDLE':
        return;

      case 'SPINNING':
      case 'FREE_SPINNING': {
        this.info.text = '';
        if (game.mode === 'free') this.meter.set(this.meterBefore(game.currentFreeSpin!));
        const bet = game.bet;
        this.sfx.loop('spin');
        await this.grid.spin(
          spin!,
          (value) => formatCreditsShort(winCents(value, bet)),
          game.turbo ? timing.turbo : timing.normal,
          {
            anticipate: game.mode === 'base',
            onStop: () => this.sfx.play('stop'),
            onAnticipate: () => this.sfx.restart('anticipation'),
          },
        );
        this.sfx.stop('spin');
        break;
      }

      case 'EVALUATE_LINES':
        if (spin!.lineWins.length > 0) {
          const lineTotal = spin!.lineWins.reduce((sum, w) => sum + w.win, 0);
          this.sfx.play(lineTotal < AUDIO.winJingle.medium ? 'winSmall' : 'winMedium');
          this.grid.drawLines(spin!.lineWins);
          const cells = spin!.lineWins.flatMap((w) => w.positions);
          this.grid.highlight(cells);
          for (const c of cells) this.burstAt(c, fx.lineSpark);
          await this.hold(show.lines);
          this.grid.clear();
        }
        break;

      case 'RESOLVE_COLLECT':
        if (spin!.collect.win > 0) {
          const { collect } = spin!;
          this.grid.highlight([...collect.hunters, ...spin!.cash]);
          const mult = collect.multiplier > 1 ? `  (×${collect.multiplier})` : '';
          this.collecting = playCollect(this.grid.effects, {
            hunters: collect.hunters,
            cash: spin!.cash,
            multiplier: collect.multiplier,
            centre: (p) => this.grid.cellCentre(p),
            label: (m) => formatCreditsShort(winCents(m, game.bet)),
            onTotal: (m) => {
              this.info.text = `COLLECT ${this.credits(m)}${mult}`;
              this.sfx.play('coin');
            },
            onThrow: (style) => this.sfx.play(style),
            onHit: (style, target) => this.onCollectHit(style, target),
            speed: this.speed,
          });
          await this.collecting.done;
          this.collecting = null;
          this.info.text = `COLLECT ${this.credits(collect.win)}${mult}`;
          await this.hold(show.payout);
          this.grid.clear();
        }
        break;

      case 'PAYOUT':
        if (game.mode === 'free') {
          const fs = game.currentFreeSpin!;
          await this.meter.advance(fs.collect.hunters.length, this.meterAfter(fs), fs.spinsAdded, this.speed, {
            onFill: () => this.sfx.play('meter'),
            onRetrigger: () => this.sfx.play('retrigger'),
          });
        } else if (spin!.scatter.freeSpins > 0) {
          this.grid.highlight(spin!.scatter.positions);
          for (const p of spin!.scatter.positions) this.burstAt(p, fx.spark);
          this.info.text = `${spin!.scatter.count} LODGES!`;
          await this.hold(show.payout * 2);
        } else if (winTier(spin!.win, GAME.winTiers)) {
          this.grid.clear();
          await this.playBigWin(spin!.win);
        } else if (spin!.win > 0) {
          await this.hold(show.payout);
        }
        this.grid.clear();
        break;

      case 'FREE_SPIN_INTRO': {
        const fs = game.currentRound!.freeSpins!;
        const per = game.config.freeSpins.huntersPerUpgrade;
        const extra = game.config.freeSpins.retriggerSpins;
        this.sfx.play('fsStart');
        this.sfx.music('musicFree');
        await this.screen.show(
          {
            kicker: 'THE HUNT BEGINS',
            title: `${fs.spinsAwarded} FREE SPINS`,
            lines: [`Every ${ordinal(per)} Hunter that collects: +${extra} spins`, 'and a bigger collect multiplier'],
          },
          this.autoContinue,
        );
        this.info.text = '';
        this.grid.clear();
        this.grid.setStrips(game.config.freeReels);
        this.meter.set({ spin: 0, totalSpins: fs.spinsAwarded, badges: 0, level: 0 });
        this.meter.view.visible = true;
        this.placeInfo('free');
        break;
      }

      case 'FREE_SPIN_SUMMARY': {
        const fs = game.currentRound!.freeSpins!;
        if (winTier(fs.win, GAME.winTiers)) await this.playBigWin(fs.win);
        this.sfx.play('fsEnd');
        await this.screen.show(
          {
            kicker: 'HUNT OVER',
            title: this.credits(fs.win),
            lines: [
              `${fs.spins.length} free spins · ${fs.huntersCollected} Hunters collected`,
              `Top multiplier ×${fs.finalMultiplier}${fs.capped ? ' · MAX WIN!' : ''}`,
            ],
          },
          this.autoContinue,
        );
        this.sfx.music('musicBase');
        this.meter.view.visible = false;
        this.info.text = '';
        this.placeInfo('base');
        this.grid.setStrips(game.config.baseReels);
        break;
      }
    }
    game.advance();
  }

  /** Big / Mega / Epic overlay; quicker in turbo or autoplay. One jingle, then a ting per tier-up. */
  private playBigWin(multiple: number): Promise<void> {
    const speed = this.game.turbo || this.options.isAutoplay() ? 1 / turboFactor : 1;
    let first = true;
    return this.bigWin.play(
      multiple,
      GAME.winTiers,
      (m) => this.credits(m),
      () => {
        this.sfx.play(first ? 'winBig' : 'coin');
        first = false;
      },
      speed,
    );
  }

  /** Net landing: a dust puff. Shot: sparks, smoke and a shake (harder for the big animals). */
  private onCollectHit(style: 'net' | 'shot', target: Position & { symbol: string }): void {
    if (style === 'net') {
      this.burstAt(target, fx.dust, fx.gravity * 0.3);
      return;
    }
    this.burstAt(target, fx.spark, fx.gravity * 0.5);
    this.burstAt(target, fx.smoke);
    const big = target.symbol === 'CASH_DEER' || target.symbol === 'CASH_GOLDEN_STAG';
    const { shake: cfg } = PRESENTATION;
    shake(this.shaker, big ? cfg.bigShot : cfg.shot, cfg.duration);
  }

  /** Particle burst at a reel cell, converting grid coordinates to the shared layer. */
  private burstAt(cell: Position, style: ParticleStyle, gravity = 0): void {
    const { x, y } = this.grid.cellCentre(cell);
    this.particles.burst(x + this.grid.view.x, y + this.grid.view.y, style, { gravity });
  }

  private meterBefore(fs: FreeSpinResult): MeterState {
    const per = this.game.config.freeSpins.huntersPerUpgrade;
    const ladder = this.game.config.freeSpins.multiplierLadder;
    return {
      spin: fs.index,
      // As it stood before this spin, so a retrigger isn't given away early.
      totalSpins: fs.index + fs.spinsRemaining - fs.spinsAdded,
      badges: (fs.huntersCollected - fs.collect.hunters.length) % per,
      level: ladder.indexOf(fs.collect.multiplier),
    };
  }

  private meterAfter(fs: FreeSpinResult): MeterState {
    const per = this.game.config.freeSpins.huntersPerUpgrade;
    return {
      spin: fs.index,
      totalSpins: fs.index + fs.spinsRemaining,
      badges: fs.huntersCollected % per,
      level: this.game.config.freeSpins.multiplierLadder.indexOf(fs.multiplierAfter),
    };
  }
}
