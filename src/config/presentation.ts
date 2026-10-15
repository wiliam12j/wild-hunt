import type { SymbolId } from './types.ts';

// Look and timing of the game. Rendering reads these; nothing visual is hardcoded in /src/render.
// Sizes are in "design units": the reel area is laid out at this size and scaled to fit.

export interface SpinTiming {
  /** Seconds each reel spins at full speed before the first one starts stopping. */
  readonly spinTime: number;
  /** Extra seconds between consecutive reels starting. */
  readonly startStagger: number;
  /** Extra seconds between consecutive reels stopping. */
  readonly stopStagger: number;
  /** Full-speed scroll, in symbols per second. */
  readonly speed: number;
  /** Seconds for the final deceleration onto the stop. */
  readonly settleTime: number;
  /** How far the reel overshoots before bouncing back (GSAP back.out strength). */
  readonly bounce: number;
  /** Seconds a slammed reel takes to land. */
  readonly quickStopTime: number;
}

export const PRESENTATION = {
  cell: { width: 150, height: 130, gap: 10, radius: 18 },
  /** Space around the reel grid inside the frame. */
  framePadding: 24,
  /** Space between the reel frame and the edge of the canvas, as a share of the smaller side. */
  stageMargin: 0.04,

  timing: {
    normal: {
      spinTime: 0.55,
      startStagger: 0.07,
      stopStagger: 0.18,
      speed: 22,
      settleTime: 0.45,
      bounce: 1.6,
      quickStopTime: 0.18,
    },
    turbo: {
      spinTime: 0.2,
      startStagger: 0.02,
      stopStagger: 0.06,
      speed: 34,
      settleTime: 0.25,
      bounce: 1.2,
      quickStopTime: 0.1,
    },
  } satisfies Record<'normal' | 'turbo', SpinTiming>,

  /** Seconds to show each presentation step (scaled by turboFactor in turbo mode). */
  show: {
    lines: 1.2,
    collect: 1.4,
    payout: 0.6,
    banner: 2.4,
  },
  turboFactor: 0.4,

  colors: {
    background: 0x12160f,
    frame: 0x2b2116,
    frameEdge: 0x8a6a3a,
    reelBackground: 0x1b1a14,
    dim: 0x000000,
    dimAlpha: 0.55,
    highlight: 0xffe08a,
    text: 0xf3e6c4,
    textShadow: 0x000000,
    bannerBackground: 0x0d0f0a,
    bannerEdge: 0xc79a4a,
  },

  fontFamily: 'Georgia, "Times New Roman", serif',

  /** Placeholder art: one colour per symbol until the real art lands. */
  symbolColors: {
    TEN: 0x6b4f33,
    J: 0x75573a,
    Q: 0x806043,
    K: 0x8b6a4b,
    A: 0x977554,
    RABBIT: 0x9c8f7a,
    PHEASANT: 0xa5482e,
    FOX: 0xc8692a,
    STAG: 0x7a5230,
    HUNTER: 0x2f5d3a,
    LODGE: 0xb8862f,
    CASH_RABBIT: 0x8c8c8c,
    CASH_PHEASANT: 0x5a7fa6,
    CASH_FOX: 0xb85c2c,
    CASH_DEER: 0x7d3fa0,
    CASH_GOLDEN_STAG: 0xe0b23a,
    TROPHY: 0x6e5a3a,
  } satisfies Record<SymbolId, number>,

  /** Payline colours, by payline index. */
  lineColors: [0xffd166, 0x06d6a0, 0xef476f, 0x118ab2, 0xf78c6b, 0x83d483, 0xc77dff, 0xffa3a3, 0x4cc9f0, 0xf4a261],
  lineWidth: 8,
} as const;
