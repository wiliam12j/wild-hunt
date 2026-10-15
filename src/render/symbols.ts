import { Container, Graphics, Rectangle, Text, Texture, type Renderer } from 'pixi.js';
import { PRESENTATION } from '../config/presentation.ts';
import type { SymbolDef, SymbolId } from '../config/types.ts';

// Placeholder art: a coloured rounded tile with the symbol's label. Generated once as textures.
// Swapped for real art in the final phase by replacing this module.

const { cell, colors, fontFamily, symbolColors } = PRESENTATION;

export type SymbolTextures = ReadonlyMap<SymbolId, Texture>;

function drawTile(def: SymbolDef): Container {
  const tile = new Container();
  const color = symbolColors[def.id];
  const shape = new Graphics();
  if (def.kind === 'cash' || def.kind === 'trophy') {
    // Trophies are shield shapes so they read differently from paying symbols.
    const w = cell.width;
    const h = cell.height;
    shape
      .moveTo(w * 0.1, h * 0.08)
      .lineTo(w * 0.9, h * 0.08)
      .lineTo(w * 0.9, h * 0.55)
      .quadraticCurveTo(w * 0.9, h * 0.85, w * 0.5, h * 0.96)
      .quadraticCurveTo(w * 0.1, h * 0.85, w * 0.1, h * 0.55)
      .closePath();
  } else {
    shape.roundRect(4, 4, cell.width - 8, cell.height - 8, cell.radius);
  }
  shape.fill(color).stroke({ width: def.kind === 'wild' || def.kind === 'scatter' ? 6 : 3, color: colors.frameEdge });
  tile.addChild(shape);

  const isCash = def.kind === 'cash';
  const label = new Text({
    text: def.kind === 'trophy' ? '?' : def.label.toUpperCase(),
    style: {
      fontFamily,
      fontWeight: 'bold',
      fontSize: def.kind === 'low' ? 46 : def.label.length > 8 ? 17 : 22,
      fill: colors.text,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: cell.width - 24,
      dropShadow: { color: colors.textShadow, distance: 2, alpha: 0.7, blur: 2, angle: Math.PI / 4 },
    },
  });
  label.anchor.set(0.5);
  // Cash tiles keep the middle free for their value.
  label.position.set(cell.width / 2, isCash ? cell.height * 0.24 : cell.height / 2);
  tile.addChild(label);
  return tile;
}

export function createSymbolTextures(renderer: Renderer, symbols: readonly SymbolDef[]): SymbolTextures {
  const textures = new Map<SymbolId, Texture>();
  // Fixed frame so every texture is exactly one cell, whatever the shape's own bounds.
  const frame = new Rectangle(0, 0, cell.width, cell.height);
  for (const def of symbols) {
    const tile = drawTile(def);
    textures.set(def.id, renderer.generateTexture({ target: tile, resolution: 2, frame }));
    tile.destroy({ children: true });
  }
  return textures;
}

/** Text drawn over a Cash tile showing its value. */
export function createValueText(): Text {
  const text = new Text({
    text: '',
    style: {
      fontFamily,
      fontWeight: 'bold',
      fontSize: 34,
      fill: colors.highlight,
      dropShadow: { color: colors.textShadow, distance: 2, alpha: 0.9, blur: 3, angle: Math.PI / 4 },
    },
  });
  text.anchor.set(0.5);
  text.position.set(cell.width / 2, cell.height * 0.58);
  return text;
}
