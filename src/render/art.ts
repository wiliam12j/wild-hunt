import { Container, Graphics, Text } from 'pixi.js';
import { PRESENTATION } from '../config/presentation.ts';
import type { SymbolDef, SymbolId } from '../config/types.ts';

// Built-in vector art, drawn in code so it is original and needs no files. Each function
// draws one symbol tile at PRESENTATION.cell size. Replaced per symbol by any image the
// player drops into public/art/ (see config/art.ts).

const { cell, fontFamily } = PRESENTATION;
const W = cell.width;
const H = cell.height;

/** Art palette. Kept here because it only describes the built-in drawings. */
const C = {
  ink: 0x1a120a,
  bone: 0xf1e4c3,
  woodEdge: 0x4a3018,
  brass: 0xc9a14a,
  silver: 0xc8cdd2,
  gold: 0xf2c94c,
  goldDark: 0x9c7a1f,
  lanternGlow: 0xffd27a,
  red: 0xb8392b,
  white: 0xf4efe6,
  shadow: 0x000000,
} as const;

/** Wood tone per card letter, light to dark. */
const WOOD: Partial<Record<SymbolId, number>> = {
  TEN: 0x8a6440,
  J: 0x7d5a39,
  Q: 0x93693f,
  K: 0x6f4e30,
  A: 0xa0774a,
};

/** Background and silhouette colour per badge symbol. */
const BADGE: Partial<Record<SymbolId, { bg: number; rim: number; fg: number }>> = {
  RABBIT: { bg: 0x5f6b4e, rim: 0xb8a77a, fg: 0xd9ccb0 },
  PHEASANT: { bg: 0x5a3a2e, rim: 0xc98a4a, fg: 0xc0602f },
  FOX: { bg: 0x3d4a55, rim: 0xc98a4a, fg: 0xd9732f },
  STAG: { bg: 0x3b3326, rim: 0xd8b469, fg: 0x8a5a32 },
  HUNTER: { bg: 0x23472c, rim: 0xe0b23a, fg: 0x13241a },
  LODGE: { bg: 0x2a2f45, rim: 0xe0b23a, fg: 0x5a3a22 },
};

/** Trophy plaque rim by animal (value tier). */
const PLAQUE_RIM: Partial<Record<SymbolId, number>> = {
  CASH_RABBIT: C.silver,
  CASH_PHEASANT: C.brass,
  CASH_FOX: C.brass,
  CASH_DEER: C.gold,
  CASH_GOLDEN_STAG: C.gold,
};

// ---------------------------------------------------------------------------
// Shared pieces

function roundedTile(g: Graphics, fill: number, rim: number, rimWidth = 4): Graphics {
  return g.roundRect(4, 4, W - 8, H - 8, cell.radius).fill(fill).stroke({ width: rimWidth, color: rim });
}

/** Soft inner shading so flat fills read as carved or lit. */
function vignette(g: Graphics): Graphics {
  for (let i = 0; i < 4; i++) {
    const inset = 6 + i * 5;
    g.roundRect(inset, inset, W - inset * 2, H - inset * 2, cell.radius).stroke({ width: 5, color: C.shadow, alpha: 0.06 });
  }
  return g;
}

/** Engraved letter: a dark cut with a light lower edge. */
function engraved(text: string, size: number, x: number, y: number): Container {
  const c = new Container();
  const style = { fontFamily, fontWeight: 'bold' as const, fontSize: size };
  const light = new Text({ text, style: { ...style, fill: C.bone } });
  const cut = new Text({ text, style: { ...style, fill: C.ink } });
  for (const t of [light, cut]) t.anchor.set(0.5);
  light.position.set(x + 2, y + 2);
  light.alpha = 0.55;
  cut.position.set(x, y);
  cut.alpha = 0.85;
  c.addChild(light, cut);
  return c;
}

function caption(text: string, y: number, color: number = C.bone): Text {
  const t = new Text({
    text,
    style: { fontFamily, fontWeight: 'bold', fontSize: 15, fill: color, letterSpacing: 2 },
  });
  t.anchor.set(0.5);
  t.position.set(W / 2, y);
  return t;
}

// ---------------------------------------------------------------------------
// Silhouettes, drawn around (0, 0) at roughly 100 × 80 units

function rabbit(g: Graphics, fg: number): void {
  g.ellipse(-4, 14, 30, 22).fill(fg); // body
  g.circle(-32, 16, 8).fill(C.white); // tail
  g.circle(22, -6, 14).fill(fg); // head
  g.poly([14, -16, 8, -50, 16, -52, 22, -18]).fill(fg); // back ear
  g.poly([22, -18, 26, -54, 34, -52, 30, -16]).fill(fg); // front ear
  g.ellipse(14, 34, 12, 5).fill(fg); // foot
  g.circle(27, -9, 2.4).fill(C.ink); // eye
}

function pheasant(g: Graphics, fg: number): void {
  g.poly([-20, 2, -60, -26, -56, -18, -18, 12]).fill(0x7a3a1f); // long tail
  g.ellipse(-2, 6, 28, 17).fill(fg); // body
  g.poly([16, -2, 22, -26, 30, -24, 28, 0]).fill(0x2f5a3a); // green neck
  g.circle(27, -28, 8).fill(0x2f5a3a); // head
  g.circle(30, -28, 4.5).fill(C.red); // wattle
  g.poly([34, -30, 42, -27, 34, -25]).fill(C.brass); // beak
  g.rect(18, 4, 18, 3).fill(C.white); // collar ring
  g.moveTo(-4, 22).lineTo(-8, 38).moveTo(6, 22).lineTo(8, 38).stroke({ width: 3, color: C.ink });
}

function fox(g: Graphics, fg: number): void {
  g.poly([-34, -34, -20, -2, -40, 4]).fill(fg); // left ear
  g.poly([34, -34, 20, -2, 40, 4]).fill(fg);
  g.poly([-27, -22, -22, -6, -32, -2]).fill(C.ink); // inner ears
  g.poly([27, -22, 22, -6, 32, -2]).fill(C.ink);
  g.poly([-40, -4, 40, -4, 30, 18, 0, 42, -30, 18]).fill(fg); // head
  g.poly([-36, 4, -6, 18, 0, 42, -24, 22]).fill(C.white); // cheeks
  g.poly([36, 4, 6, 18, 0, 42, 24, 22]).fill(C.white);
  g.circle(0, 40, 5).fill(C.ink); // nose
  g.ellipse(-14, 6, 4, 3).fill(C.ink); // eyes
  g.ellipse(14, 6, 4, 3).fill(C.ink);
}

function stag(g: Graphics, fg: number, antler: number): void {
  // Antlers first, so the head overlaps their base.
  const side = (s: number) => {
    g.moveTo(10 * s, -12)
      .lineTo(26 * s, -34)
      .lineTo(34 * s, -56)
      .moveTo(22 * s, -28)
      .lineTo(42 * s, -36)
      .moveTo(30 * s, -46)
      .lineTo(48 * s, -52)
      .moveTo(30 * s, -46)
      .lineTo(26 * s, -62);
  };
  side(-1);
  side(1);
  g.stroke({ width: 6, color: antler, cap: 'round', join: 'round' });
  g.ellipse(-24, -6, 12, 6).fill(fg); // ears
  g.ellipse(24, -6, 12, 6).fill(fg);
  g.poly([-16, -14, 16, -14, 14, 20, 6, 42, -6, 42, -14, 20]).fill(fg); // head
  g.ellipse(0, 40, 8, 5).fill(C.ink); // nose
  g.circle(-9, 4, 3).fill(C.ink);
  g.circle(9, 4, 3).fill(C.ink);
}

function hunter(g: Graphics, fg: number): void {
  g.moveTo(-40, 40).lineTo(42, -44).stroke({ width: 7, color: 0x3a2716, cap: 'round' }); // rifle stock/barrel
  g.moveTo(26, -28).lineTo(42, -44).stroke({ width: 4, color: 0x9aa0a6, cap: 'round' }); // barrel tip
  g.roundRect(-36, 14, 72, 40, 22).fill(fg); // shoulders
  g.circle(0, -2, 17).fill(0xd9a982); // face
  g.ellipse(0, -16, 32, 7).fill(0x3d2b1a); // hat brim
  g.roundRect(-18, -38, 36, 24, 8).fill(0x3d2b1a); // hat crown
  g.rect(-18, -20, 36, 5).fill(C.red); // hat band
  g.circle(-6, -2, 2.2).fill(C.ink);
  g.circle(6, -2, 2.2).fill(C.ink);
  g.moveTo(-8, 8).quadraticCurveTo(0, 12, 8, 8).stroke({ width: 2.5, color: C.ink }); // smile
}

function lodge(g: Graphics, wall: number): void {
  g.rect(18, -46, 12, 22).fill(0x4b3a2e); // chimney
  g.circle(26, -54, 7).fill({ color: 0xbfb6a8, alpha: 0.6 }); // smoke
  g.circle(34, -62, 9).fill({ color: 0xbfb6a8, alpha: 0.4 });
  g.poly([-48, -6, 0, -44, 48, -6]).fill(0x3a2a1a); // roof
  g.rect(-38, -8, 76, 46).fill(wall); // walls
  for (let y = -2; y < 38; y += 9) g.moveTo(-38, y).lineTo(38, y); // logs
  g.stroke({ width: 2, color: C.ink, alpha: 0.4 });
  g.rect(-28, 4, 18, 16).fill(C.lanternGlow); // lit window
  g.rect(-20, 4, 2, 16).fill(C.ink);
  g.rect(8, 8, 18, 30).fill(0x2a1b10); // door
  g.circle(-19, 12, 18).fill({ color: C.lanternGlow, alpha: 0.18 }); // window glow
}

// ---------------------------------------------------------------------------
// Tiles

function cardTile(def: SymbolDef): Container {
  const c = new Container();
  const wood = WOOD[def.id]!;
  const g = roundedTile(new Graphics(), wood, C.woodEdge, 5);
  // Grain lines.
  for (let i = 0; i < 6; i++) {
    const y = 18 + i * 17;
    g.moveTo(10, y).bezierCurveTo(W * 0.35, y - 6, W * 0.65, y + 6, W - 10, y - 2);
  }
  g.stroke({ width: 1.5, color: C.ink, alpha: 0.18 });
  vignette(g);
  c.addChild(g, engraved(def.label, def.id === 'TEN' ? 60 : 70, W / 2, H / 2 + 2));
  return c;
}

function badgeTile(def: SymbolDef): Container {
  const c = new Container();
  const { bg, rim, fg } = BADGE[def.id]!;
  const isSpecial = def.kind === 'wild' || def.kind === 'scatter';
  const g = roundedTile(new Graphics(), bg, rim, isSpecial ? 7 : 4);
  vignette(g);
  c.addChild(g);

  const art = new Graphics();
  switch (def.id) {
    case 'RABBIT':
      rabbit(art, fg);
      break;
    case 'PHEASANT':
      pheasant(art, fg);
      break;
    case 'FOX':
      fox(art, fg);
      break;
    case 'STAG':
      stag(art, fg, 0xe8d7b0);
      break;
    case 'HUNTER':
      hunter(art, fg);
      break;
    case 'LODGE':
      lodge(art, fg);
      break;
  }
  // The stag's antlers are tall: shrink it a touch and drop it so they stay inside the tile.
  const isStag = def.id === 'STAG';
  art.position.set(W / 2, H / 2 + (isStag ? 6 : -4));
  art.scale.set(isSpecial ? 0.95 : isStag ? 0.82 : 1);
  c.addChild(art);

  if (def.kind === 'wild') c.addChild(ribbon('WILD', C.gold, C.ink));
  else if (def.kind === 'scatter') c.addChild(ribbon('FREE SPINS', C.gold, C.ink));
  else c.addChild(caption(def.label.toUpperCase(), H - 16));
  return c;
}

function ribbon(text: string, fill: number, ink: number): Container {
  const c = new Container();
  const g = new Graphics()
    .poly([10, H - 30, W - 10, H - 30, W - 18, H - 19, W - 10, H - 8, 10, H - 8, 18, H - 19])
    .fill(fill)
    .stroke({ width: 2, color: C.woodEdge });
  const t = new Text({ text, style: { fontFamily, fontWeight: 'bold', fontSize: text.length > 6 ? 13 : 16, fill: ink, letterSpacing: 2 } });
  t.anchor.set(0.5);
  t.position.set(W / 2, H - 19);
  c.addChild(g, t);
  return c;
}

/** Wooden shield plaque with a small mounted head; the value is drawn on top at runtime. */
function plaqueTile(def: SymbolDef): Container {
  const c = new Container();
  const golden = def.id === 'CASH_GOLDEN_STAG';
  const rim = PLAQUE_RIM[def.id] ?? C.brass;
  const wood = golden ? C.goldDark : 0x6a4426;
  const shield = new Graphics()
    .moveTo(W * 0.08, H * 0.06)
    .lineTo(W * 0.92, H * 0.06)
    .lineTo(W * 0.92, H * 0.56)
    .quadraticCurveTo(W * 0.92, H * 0.86, W * 0.5, H * 0.97)
    .quadraticCurveTo(W * 0.08, H * 0.86, W * 0.08, H * 0.56)
    .closePath()
    .fill(wood)
    .stroke({ width: golden ? 6 : 5, color: rim });
  // Value window (the number sits here).
  shield.roundRect(W * 0.2, H * 0.44, W * 0.6, H * 0.28, 10).fill({ color: C.ink, alpha: 0.45 });
  c.addChild(shield);

  if (def.kind === 'trophy') {
    c.addChild(engraved('?', 54, W / 2, H * 0.32));
    return c;
  }

  const head = new Graphics();
  const fg = golden ? C.gold : 0xd2b48a;
  switch (def.id) {
    case 'CASH_RABBIT':
      rabbit(head, fg);
      break;
    case 'CASH_PHEASANT':
      pheasant(head, 0xc0602f);
      break;
    case 'CASH_FOX':
      fox(head, 0xd9732f);
      break;
    default:
      stag(head, golden ? C.gold : 0x8a5a32, golden ? 0xfff1c1 : 0xe8d7b0);
  }
  // Antlers reach higher than the other heads, so the stag sits a little lower.
  const isStag = def.id === 'CASH_DEER' || golden;
  head.scale.set(isStag ? 0.5 : 0.62);
  head.position.set(W / 2, H * (isStag ? 0.3 : 0.24));
  c.addChild(head);
  return c;
}

/** Builds the built-in tile for a symbol. */
export function drawSymbol(def: SymbolDef): Container {
  switch (def.kind) {
    case 'low':
      return cardTile(def);
    case 'cash':
    case 'trophy':
      return plaqueTile(def);
    default:
      return badgeTile(def);
  }
}
