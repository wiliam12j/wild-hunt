import gsap from 'gsap';
import { Container, Graphics, Text } from 'pixi.js';
import { PRESENTATION } from '../config/presentation.ts';
import type { CashSymbol, Position } from '../engine/types.ts';

const { cell, colors, collect: cfg, fontFamily } = PRESENTATION;

export interface CollectPlan {
  readonly hunters: readonly Position[];
  readonly cash: readonly CashSymbol[];
  readonly multiplier: number;
  /** Cell centre in the effects layer's coordinates. */
  readonly centre: (p: Position) => { x: number; y: number };
  /** Display text for an amount in multiples of total bet. */
  readonly label: (multiple: number) => string;
  /** Called each time a value reaches a Hunter, with the running total (multiples of bet). */
  readonly onTotal: (multiple: number) => void;
  /** 1 = normal speed; larger is faster (turbo). */
  readonly speed: number;
}

/** A hunting net: a ring with cross-hatching, drawn centred on its origin. */
function drawNet(): Graphics {
  const r = cell.width * 0.42;
  const g = new Graphics().circle(0, 0, r);
  for (let i = -2; i <= 2; i++) {
    const o = (i / 2.5) * r;
    const h = Math.sqrt(r * r - o * o);
    g.moveTo(o, -h).lineTo(o, h).moveTo(-h, o).lineTo(h, o);
  }
  return g.stroke({ width: 4, color: cfg.netColor, alpha: 0.95 });
}

export interface Playing {
  /** Resolves when the animation has finished (or been skipped). */
  readonly done: Promise<void>;
  /** Jumps to the end, still firing every total update. */
  readonly skip: () => void;
}

/**
 * Plays every Hunter collecting every Cash symbol: a net or shot per trophy, then its value
 * flies to the Hunter. Each Hunter collects in turn.
 */
export function playCollect(layer: Container, plan: CollectPlan): Playing {
  const tl = gsap.timeline();
  tl.timeScale(plan.speed);
  const stagger = Math.min(cfg.stagger, cfg.maxSequence / Math.max(1, plan.cash.length));
  let total = 0;
  let at = 0;

  for (const hunter of plan.hunters) {
    const from = plan.centre(hunter);
    const pulse = new Graphics().circle(0, 0, cell.width * 0.55).stroke({ width: 6, color: colors.highlight });
    pulse.position.set(from.x, from.y);
    pulse.alpha = 0;
    layer.addChild(pulse);
    tl.to(pulse, { alpha: 1, duration: 0.15 }, at);

    plan.cash.forEach((c, i) => {
      const start = at + i * stagger;
      const to = plan.centre(c);
      const style = cfg.style[c.symbol];

      if (style === 'net') {
        const net = drawNet();
        net.position.set(from.x, from.y);
        net.scale.set(0.2);
        net.alpha = 0;
        layer.addChild(net);
        // Thrown in an arc: x/y linear, a lift on y, growing as it flies, then settling.
        const lift = { y: 0 };
        tl.set(net, { alpha: 1 }, start)
          .to(net, { x: to.x, duration: cfg.effectTime, ease: 'none' }, start)
          .to(lift, {
            y: 1,
            duration: cfg.effectTime,
            ease: 'none',
            onUpdate: () => {
              const t = lift.y;
              net.y = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * cell.height * 0.8;
              net.rotation = t * Math.PI * 0.6;
            },
          }, start)
          .to(net.scale, { x: 1, y: 1, duration: cfg.effectTime, ease: 'power2.out' }, start)
          .to(net, { alpha: 0, duration: 0.25 }, start + cfg.effectTime + cfg.flyTime);
      } else {
        // Rifle shot: a tracer from the Hunter, then a flash on the trophy.
        const tracer = new Graphics()
          .moveTo(from.x, from.y)
          .lineTo(to.x, to.y)
          .stroke({ width: 5, color: cfg.shotColor });
        tracer.alpha = 0;
        const flash = new Graphics().circle(0, 0, cell.width * 0.45).fill(cfg.flashColor);
        flash.position.set(to.x, to.y);
        flash.alpha = 0;
        flash.scale.set(0.3);
        layer.addChild(tracer, flash);
        const hit = start + cfg.effectTime * 0.4;
        tl.to(tracer, { alpha: 1, duration: 0.05 }, start)
          .to(tracer, { alpha: 0, duration: 0.2 }, start + 0.08)
          .to(flash, { alpha: 0.9, duration: 0.06 }, hit)
          .to(flash.scale, { x: 1.2, y: 1.2, duration: 0.3, ease: 'power2.out' }, hit)
          .to(flash, { alpha: 0, duration: 0.3 }, hit + 0.06);
      }

      // The value flies from the trophy to the Hunter and adds to the total on arrival.
      const amount = c.value * plan.multiplier;
      const value = new Text({
        text: plan.label(amount),
        style: { fontFamily, fontWeight: 'bold', fontSize: 40, fill: colors.highlight, stroke: { color: 0x000000, width: 5 } },
      });
      value.anchor.set(0.5);
      value.position.set(to.x, to.y);
      value.alpha = 0;
      layer.addChild(value);
      const flyAt = start + cfg.effectTime;
      tl.set(value, { alpha: 1 }, flyAt)
        .to(value, { x: from.x, y: from.y, duration: cfg.flyTime, ease: 'power2.in' }, flyAt)
        .to(value.scale, { x: 0.6, y: 0.6, duration: cfg.flyTime }, flyAt)
        .add(() => {
          total += amount;
          plan.onTotal(total);
          value.visible = false;
        }, flyAt + cfg.flyTime)
        .fromTo(pulse.scale, { x: 1.15, y: 1.15 }, { x: 1, y: 1, duration: 0.15 }, flyAt + cfg.flyTime);
    });

    at += (plan.cash.length - 1) * stagger + cfg.effectTime + cfg.flyTime + 0.1;
    tl.to(pulse, { alpha: 0, duration: 0.2 }, at);
  }

  const done = new Promise<void>((resolve) => {
    tl.eventCallback('onComplete', () => {
      layer.removeChildren().forEach((child) => child.destroy());
      resolve();
    });
  });
  return { done, skip: () => tl.progress(1) };
}
