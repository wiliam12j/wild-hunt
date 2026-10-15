import { Container, Graphics } from 'pixi.js';
import { PRESENTATION, type SpinTiming } from '../config/presentation.ts';
import type { ReelSet } from '../config/types.ts';
import type { EngineConfig, LineWin, Position, SpinResult } from '../engine/types.ts';
import { Reel, type Landing } from './reel.ts';
import type { SymbolTextures } from './symbols.ts';

const { cell, colors, lineColors, lineWidth } = PRESENTATION;
const PITCH_X = cell.width + cell.gap;
const PITCH_Y = cell.height + cell.gap;

/** The 5×3 reel grid plus its win-line and highlight overlays. */
export class ReelGrid {
  readonly view = new Container();
  readonly width: number;
  readonly height: number;
  private readonly reels: Reel[];
  private readonly dimLayer = new Graphics();
  private readonly lineLayer = new Graphics();
  private readonly cfg: EngineConfig;

  constructor(textures: SymbolTextures, cfg: EngineConfig) {
    this.cfg = cfg;
    this.width = cfg.reels * PITCH_X - cell.gap;
    this.height = cfg.rows * PITCH_Y - cell.gap;
    this.reels = cfg.baseReels.map((strip, i) => {
      const reel = new Reel(textures, strip, cfg.rows);
      reel.view.x = i * PITCH_X;
      this.view.addChild(reel.view);
      return reel;
    });
    this.view.addChild(this.dimLayer, this.lineLayer);
  }

  setStrips(strips: ReelSet): void {
    this.reels.forEach((reel, i) => reel.setStrip(strips[i]!));
  }

  /** Spins every reel onto the result, staggered. Resolves when the last reel settles. */
  spin(result: SpinResult, cashLabel: (value: number) => string, timing: SpinTiming): Promise<void> {
    this.clear();
    return Promise.all(
      this.reels.map((reel, i) =>
        reel.spin(this.landing(result, i, cashLabel), timing, i * timing.startStagger, i * timing.stopStagger),
      ),
    ).then(() => undefined);
  }

  slam(): void {
    for (const reel of this.reels) reel.slam();
  }

  /** Dims every cell except the given ones. */
  highlight(cells: readonly Position[]): void {
    const keep = new Set(cells.map((c) => `${c.reel},${c.row}`));
    this.dimLayer.clear();
    for (let reel = 0; reel < this.cfg.reels; reel++) {
      for (let row = 0; row < this.cfg.rows; row++) {
        if (keep.has(`${reel},${row}`)) continue;
        this.dimLayer.roundRect(reel * PITCH_X, row * PITCH_Y, cell.width, cell.height, cell.radius);
      }
    }
    this.dimLayer.fill({ color: colors.dim, alpha: colors.dimAlpha });
  }

  /** Draws each winning payline through the centre of its cells, across all reels. */
  drawLines(wins: readonly LineWin[]): void {
    this.lineLayer.clear();
    for (const win of wins) {
      const payline = this.cfg.paylines[win.line]!;
      payline.forEach((row, reel) => {
        const { x, y } = this.cellCentre({ reel, row });
        if (reel === 0) this.lineLayer.moveTo(x - cell.width / 2, y).lineTo(x, y);
        else this.lineLayer.lineTo(x, y);
      });
      const last = this.cellCentre({ reel: payline.length - 1, row: payline.at(-1)! });
      this.lineLayer.lineTo(last.x + cell.width / 2, last.y);
      this.lineLayer.stroke({
        width: lineWidth,
        color: lineColors[win.line % lineColors.length]!,
        cap: 'round',
        join: 'round',
      });
    }
  }

  clear(): void {
    this.dimLayer.clear();
    this.lineLayer.clear();
  }

  cellCentre({ reel, row }: Position): { x: number; y: number } {
    return { x: reel * PITCH_X + cell.width / 2, y: row * PITCH_Y + cell.height / 2 };
  }

  private landing(result: SpinResult, reel: number, cashLabel: (value: number) => string): Landing {
    const values = new Array<string | null>(this.cfg.rows).fill(null);
    for (const c of result.cash) if (c.reel === reel) values[c.row] = cashLabel(c.value);
    return { stop: result.stops[reel]!, symbols: result.grid[reel]!, values };
  }
}
