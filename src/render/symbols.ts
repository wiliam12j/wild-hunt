import { Container, Rectangle, Sprite, Text, Texture, type Renderer } from 'pixi.js';
import { ART } from '../config/art.ts';
import { PRESENTATION } from '../config/presentation.ts';
import type { SymbolDef, SymbolId } from '../config/types.ts';
import { drawSymbol } from './art.ts';
import { loadOptionalImage } from './artLoader.ts';

// Symbol textures: an override image from public/art/ when the player has supplied one,
// otherwise the built-in vector drawing (art.ts). Every texture ends up exactly one cell in
// size, so the reels never need to care which it is.

const { cell, colors, fontFamily } = PRESENTATION;

export type SymbolTextures = ReadonlyMap<SymbolId, Texture>;

/** Fits an image inside the cell, keeping its aspect ratio, centred. */
function fitted(texture: Texture): Container {
  const c = new Container();
  const sprite = new Sprite(texture);
  const scale = Math.min(cell.width / texture.width, cell.height / texture.height);
  sprite.scale.set(scale);
  sprite.anchor.set(0.5);
  sprite.position.set(cell.width / 2, cell.height / 2);
  c.addChild(sprite);
  return c;
}

export async function createSymbolTextures(renderer: Renderer, symbols: readonly SymbolDef[]): Promise<SymbolTextures> {
  const overrides = await Promise.all(symbols.map((def) => loadOptionalImage(ART.basePath + ART.symbols[def.id])));
  const textures = new Map<SymbolId, Texture>();
  // Fixed frame so every texture is exactly one cell, whatever the content's own bounds.
  const frame = new Rectangle(0, 0, cell.width, cell.height);
  symbols.forEach((def, i) => {
    const image = overrides[i];
    const tile = image ? fitted(image) : drawSymbol(def);
    textures.set(def.id, renderer.generateTexture({ target: tile, resolution: 2, frame }));
    tile.destroy({ children: true });
  });
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
