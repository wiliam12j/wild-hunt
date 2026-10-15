import type { CashSymbolId } from './types.ts';

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

  /** Space above the reel frame for messages and the free-spin meter. */
  headerHeight: 130,

  collect: {
    /** Animation per trophy animal: a thrown net for small game, a rifle shot for the rest. */
    style: {
      CASH_RABBIT: 'net',
      CASH_PHEASANT: 'shot',
      CASH_FOX: 'shot',
      CASH_DEER: 'shot',
      CASH_GOLDEN_STAG: 'shot',
    } satisfies Record<CashSymbolId, 'net' | 'shot'>,
    /** Seconds for the net to fly or the shot to land. */
    effectTime: 0.32,
    /** Seconds for a trophy's value to fly to the Hunter. */
    flyTime: 0.4,
    /** Seconds between consecutive trophies being taken. */
    stagger: 0.22,
    /** Upper bound on one Hunter's whole sequence; stagger shrinks to fit. */
    maxSequence: 2.0,
    netColor: 0xd9c9a0,
    shotColor: 0xfff1c1,
    flashColor: 0xffffff,
  },

  meter: {
    badgeRadius: 20,
    badgeGap: 14,
    emptyColor: 0x3a3226,
    fillColor: 0x4f9a5c,
    /** Seconds for one badge to fill. */
    fillTime: 0.25,
    /** Seconds for the upgrade flash, ladder step and "+N SPINS" popup. */
    upgradeTime: 1.3,
    ladderInactive: 0x6b5b40,
  },

  screens: {
    /** Intro/summary continue on their own after this many seconds if nobody taps. */
    autoContinue: 10,
    /** ...or after this many while autoplay is running. */
    autoContinueAutoplay: 2.5,
    overlayAlpha: 0.72,
  },

  anticipation: {
    /** Slow the remaining reels once this many Scatters are showing. */
    scatters: 2,
    /** Also slow them once a Hunter and a Trophy have both landed (base game only). */
    collect: true,
    /** Extra seconds added per anticipating reel. */
    extraTime: 0.85,
    glowColor: 0xffc857,
  },

  particles: {
    /** Max live particles; bursts beyond this are trimmed. */
    limit: 400,
    gravity: 900,
    spark: { colors: [0xfff1c1, 0xffc857, 0xff9f43], count: 18, speed: 520, life: 0.45, size: 5 },
    smoke: { colors: [0x8d8576, 0x6f685c], count: 10, speed: 110, life: 0.9, size: 16 },
    dust: { colors: [0xb39b6b, 0x8f7a52], count: 14, speed: 220, life: 0.6, size: 7 },
    coin: { colors: [0xffd166, 0xe0b23a, 0xfff1c1], speed: 900, life: 2.2, size: 11 },
    lineSpark: { colors: [0xffe08a], count: 6, speed: 160, life: 0.5, size: 4 },
  },

  shake: {
    /** Design units of displacement for a normal shot and for Deer / Golden Stag shots. */
    shot: 5,
    bigShot: 14,
    duration: 0.25,
  },

  bigWin: {
    labels: { big: 'BIG WIN', mega: 'MEGA WIN', epic: 'EPIC WIN' },
    /** Seconds the count-up takes, by the final tier reached. */
    countTime: { big: 2.8, mega: 4.2, epic: 6.0 },
    /** Seconds to hold the final amount before closing on its own. */
    hold: 1.8,
    /** Coins per second from the fountain. */
    coinRate: 45,
  },

  /** HUD win count-up: seconds = clamp(winX × perX, min, max). */
  winCountUp: { perX: 0.06, min: 0.25, max: 2.5 },

  /** Payline colours, by payline index. */
  lineColors: [0xffd166, 0x06d6a0, 0xef476f, 0x118ab2, 0xf78c6b, 0x83d483, 0xc77dff, 0xffa3a3, 0x4cc9f0, 0xf4a261],
  lineWidth: 8,
} as const;
