import gsap from 'gsap';
import { Container, Graphics, Text, type Application } from 'pixi.js';
import { PRESENTATION } from '../config/presentation.ts';
import type { GameMachine, GameState } from '../state/machine.ts';
import { winCents } from '../state/wallet.ts';
import { formatCredits, formatCreditsShort } from '../ui/format.ts';
import { Banner } from './banner.ts';
import { ReelGrid } from './reels.ts';
import { createSymbolTextures } from './symbols.ts';

const { colors, fontFamily, framePadding, show, stageMargin, timing, turboFactor } = PRESENTATION;
const INFO_HEIGHT = 70;

const wait = (seconds: number) => new Promise<void>((resolve) => gsap.delayedCall(seconds, resolve));

/**
 * Draws the game and walks it through each state: plays the animation for the state the
 * machine is in, then calls advance(). The machine never waits on the renderer otherwise.
 */
export class Scene {
  private readonly root = new Container();
  private readonly grid: ReelGrid;
  private readonly banner: Banner;
  private readonly info: Text;
  private readonly designWidth: number;
  private readonly designHeight: number;
  private readonly game: GameMachine;
  private readonly app: Application;

  constructor(app: Application, game: GameMachine) {
    this.app = app;
    this.game = game;
    const textures = createSymbolTextures(app.renderer, game.config.symbols);
    this.grid = new ReelGrid(textures, game.config);

    const frameW = this.grid.width + framePadding * 2;
    const frameH = this.grid.height + framePadding * 2;
    this.designWidth = frameW;
    this.designHeight = frameH + INFO_HEIGHT;

    this.info = new Text({
      text: '',
      style: { fontFamily, fontWeight: 'bold', fontSize: 34, fill: colors.highlight, align: 'center' },
    });
    this.info.anchor.set(0.5);
    this.info.position.set(frameW / 2, INFO_HEIGHT / 2);

    const frame = new Graphics()
      .roundRect(0, INFO_HEIGHT, frameW, frameH, 28)
      .fill(colors.frame)
      .stroke({ width: 6, color: colors.frameEdge })
      .roundRect(framePadding, INFO_HEIGHT + framePadding, this.grid.width, this.grid.height, 12)
      .fill(colors.reelBackground);
    this.grid.view.position.set(framePadding, INFO_HEIGHT + framePadding);

    this.banner = new Banner(frameW, frameH);
    this.banner.view.y = INFO_HEIGHT;

    this.root.addChild(frame, this.grid.view, this.info, this.banner.view);
    app.stage.addChild(this.root);

    app.renderer.on('resize', () => this.layout());
    this.layout();

    game.events.on('stateChange', ({ to }) => void this.onState(to));
    game.events.on('quickStop', () => this.grid.slam());
  }

  private layout(): void {
    const { width, height } = this.app.screen;
    const margin = Math.min(width, height) * stageMargin;
    const scale = Math.min((width - margin * 2) / this.designWidth, (height - margin * 2) / this.designHeight);
    this.root.scale.set(scale);
    this.root.position.set((width - this.designWidth * scale) / 2, (height - this.designHeight * scale) / 2);
  }

  private get turbo(): boolean {
    return this.game.turbo;
  }

  private hold(seconds: number): Promise<void> {
    return wait(this.turbo ? seconds * turboFactor : seconds);
  }

  private credits(multiple: number): string {
    return formatCredits(winCents(multiple, this.game.bet));
  }

  private async onState(state: GameState): Promise<void> {
    // Let the machine finish emitting before we react (and possibly advance again).
    await Promise.resolve();
    const game = this.game;
    const spin = game.currentSpin;

    switch (state) {
      case 'IDLE':
        if (game.mode === 'base') this.info.text = '';
        return;

      case 'SPINNING':
      case 'FREE_SPINNING': {
        this.banner.hide();
        this.updateInfo();
        const bet = game.bet;
        await this.grid.spin(
          spin!,
          (value) => formatCreditsShort(winCents(value, bet)),
          this.turbo ? timing.turbo : timing.normal,
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
          const times = collect.hunters.length > 1 ? ` ×${collect.hunters.length} HUNTERS` : '';
          const mult = collect.multiplier > 1 ? ` ×${collect.multiplier}` : '';
          // Shown above the reels, not as a banner, so the collected symbols stay visible.
          const previous = this.info.text;
          this.info.text = `COLLECT! ${this.credits(collect.win)}${times}${mult}`;
          await this.hold(show.collect);
          this.info.text = previous;
          this.grid.clear();
        }
        break;

      case 'PAYOUT':
        if (spin!.scatter.freeSpins > 0) this.grid.highlight(spin!.scatter.positions);
        if (spin!.win > 0) await this.hold(show.payout);
        this.grid.clear();
        break;

      case 'FREE_SPIN_INTRO': {
        const awarded = game.currentRound!.freeSpins!.spinsAwarded;
        this.banner.show(`${awarded} FREE SPINS`, 'The hunt begins');
        await wait(show.banner);
        this.grid.setStrips(game.config.freeReels);
        break;
      }

      case 'FREE_SPIN_SUMMARY': {
        const fs = game.currentRound!.freeSpins!;
        this.banner.show('HUNT OVER', `Free spins won ${this.credits(fs.win)}`);
        await wait(show.banner);
        this.banner.hide();
        this.grid.setStrips(game.config.baseReels);
        this.info.text = '';
        break;
      }
    }
    game.advance();
  }

  private updateInfo(): void {
    const fs = this.game.currentFreeSpin;
    if (this.game.mode !== 'free' || !fs) {
      this.info.text = '';
      return;
    }
    // Show the state as it was before this spin, so a retrigger isn't given away early.
    const totalSoFar = fs.index + fs.spinsRemaining - fs.spinsAdded;
    const perUpgrade = this.game.config.freeSpins.huntersPerUpgrade;
    const huntersBefore = fs.huntersCollected - fs.collect.hunters.length;
    this.info.text =
      `FREE SPIN ${fs.index} / ${totalSoFar}   ` +
      `×${fs.collect.multiplier}   HUNTERS ${huntersBefore % perUpgrade}/${perUpgrade}`;
  }
}
