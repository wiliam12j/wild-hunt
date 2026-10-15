import gsap from 'gsap';
import { Container, Graphics, Text, type Application } from 'pixi.js';
import { PRESENTATION } from '../config/presentation.ts';
import type { FreeSpinResult } from '../engine/types.ts';
import type { GameMachine, GameState } from '../state/machine.ts';
import { winCents } from '../state/wallet.ts';
import { formatCredits, formatCreditsShort } from '../ui/format.ts';
import { playCollect, type Playing } from './collect.ts';
import { Meter, type MeterState } from './meter.ts';
import { ReelGrid } from './reels.ts';
import { Screen } from './screens.ts';
import { createSymbolTextures } from './symbols.ts';

const { colors, fontFamily, framePadding, headerHeight, screens, show, stageMargin, timing, turboFactor } = PRESENTATION;

/** 1st, 2nd, 3rd, 4th, 11th, 21st … */
function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
}

export interface SceneOptions {
  /** Whether autoplay is running (screens then continue on their own sooner). */
  readonly isAutoplay: () => boolean;
}

/**
 * Draws the game and walks it through each state: plays the animation for the state the
 * machine is in, then calls advance(). `skip()` hurries whatever is currently showing.
 */
export class Scene {
  private readonly root = new Container();
  private readonly grid: ReelGrid;
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
    const cfg = game.config;
    const textures = createSymbolTextures(app.renderer, cfg.symbols);
    this.grid = new ReelGrid(textures, cfg);

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

    this.root.addChild(frame, this.grid.view, this.meter.view, this.info, this.screen.view);
    app.stage.addChild(this.root);
    this.placeInfo('base');

    app.renderer.on('resize', () => this.layout());
    this.layout();

    game.events.on('stateChange', ({ to }) => void this.onState(to));
    game.events.on('quickStop', () => this.grid.slam());
  }

  /** Hurries the current presentation: closes a screen, finishes a collect or ends a hold. */
  skip(): boolean {
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
        await this.grid.spin(
          spin!,
          (value) => formatCreditsShort(winCents(value, bet)),
          game.turbo ? timing.turbo : timing.normal,
        );
        break;
      }

      case 'EVALUATE_LINES':
        if (spin!.lineWins.length > 0) {
          this.grid.drawLines(spin!.lineWins);
          this.grid.highlight(spin!.lineWins.flatMap((w) => w.positions));
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
            onTotal: (m) => (this.info.text = `COLLECT ${this.credits(m)}${mult}`),
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
          await this.meter.advance(fs.collect.hunters.length, this.meterAfter(fs), fs.spinsAdded, this.speed);
        } else if (spin!.scatter.freeSpins > 0) {
          this.grid.highlight(spin!.scatter.positions);
          this.info.text = `${spin!.scatter.count} LODGES!`;
          await this.hold(show.payout * 2);
        } else if (spin!.win > 0) {
          await this.hold(show.payout);
        }
        this.grid.clear();
        break;

      case 'FREE_SPIN_INTRO': {
        const fs = game.currentRound!.freeSpins!;
        const per = game.config.freeSpins.huntersPerUpgrade;
        const extra = game.config.freeSpins.retriggerSpins;
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
        this.meter.view.visible = false;
        this.info.text = '';
        this.placeInfo('base');
        this.grid.setStrips(game.config.baseReels);
        break;
      }
    }
    game.advance();
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
