import gsap from 'gsap';
import { AUTOPLAY } from '../config/autoplay.ts';
import { PRESENTATION } from '../config/presentation.ts';
import type { Autoplay, AutoplayStopReason } from '../state/autoplay.ts';
import type { GameMachine } from '../state/machine.ts';
import { toCents } from '../state/wallet.ts';
import { formatCredits } from './format.ts';

export interface HudControls {
  readonly game: GameMachine;
  readonly autoplay: Autoplay;
  readonly betLevels: readonly number[];
  /** Hurries the current animation; returns true if there was one. */
  readonly skip: () => boolean;
}

const STOP_MESSAGES: Record<AutoplayStopReason, string> = {
  done: '',
  manual: '',
  bigWin: 'Autoplay stopped: big win',
  feature: 'Autoplay stopped: free spins',
  balance: 'Autoplay stopped: not enough balance',
};

export function mountHud(root: HTMLElement, controls: HudControls): void {
  const { game, autoplay, betLevels } = controls;
  root.innerHTML = `
    <div class="hud-stat"><span>Balance</span><strong data-balance></strong></div>
    <div class="hud-stat"><span>Win</span><strong data-win></strong></div>
    <div class="hud-bet">
      <button data-bet-down aria-label="Lower bet">−</button>
      <button class="hud-stat hud-bet-value" data-bet-open aria-haspopup="true" aria-label="Choose bet">
        <span>Bet</span><strong data-bet></strong>
      </button>
      <button data-bet-up aria-label="Raise bet">+</button>
    </div>
    <button class="hud-spin" data-spin>SPIN</button>
    <button class="hud-auto" data-auto aria-haspopup="true">AUTO</button>
    <label class="hud-toggle"><input type="checkbox" data-turbo /> Turbo</label>
    <button class="hud-small" data-reset>Reset balance</button>
    <p class="hud-note" data-note role="status"></p>

    <div class="hud-pop" data-bet-panel hidden>
      <h2>Total bet</h2>
      <div class="hud-grid" data-bet-options></div>
    </div>

    <div class="hud-pop" data-auto-panel hidden>
      <h2>Autoplay</h2>
      <div class="hud-grid" data-auto-counts></div>
      <label class="hud-toggle"><input type="checkbox" data-stop-big checked /> Stop on big win</label>
      <label class="hud-toggle"><input type="checkbox" data-stop-feature checked /> Stop on free spins</label>
      <button class="hud-start" data-auto-start>Start</button>
    </div>
  `;
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const balance = $('[data-balance]');
  const win = $('[data-win]');
  const bet = $('[data-bet]');
  const betDown = $<HTMLButtonElement>('[data-bet-down]');
  const betUp = $<HTMLButtonElement>('[data-bet-up]');
  const betOpen = $<HTMLButtonElement>('[data-bet-open]');
  const betPanel = $('[data-bet-panel]');
  const spin = $<HTMLButtonElement>('[data-spin]');
  const auto = $<HTMLButtonElement>('[data-auto]');
  const autoPanel = $('[data-auto-panel]');
  const autoStart = $<HTMLButtonElement>('[data-auto-start]');
  const stopBig = $<HTMLInputElement>('[data-stop-big]');
  const stopFeature = $<HTMLInputElement>('[data-stop-feature]');
  const turbo = $<HTMLInputElement>('[data-turbo]');
  const reset = $<HTMLButtonElement>('[data-reset]');
  const note = $('[data-note]');

  // ---- popovers ----
  const panels = [betPanel, autoPanel];
  const closePanels = () => panels.forEach((p) => (p.hidden = true));
  const toggle = (panel: HTMLElement) => {
    const open = panel.hidden;
    closePanels();
    panel.hidden = !open;
  };
  document.addEventListener('pointerdown', (e) => {
    if (!root.contains(e.target as Node)) closePanels();
  });

  const betButtons = betLevels.map((level, index) => {
    const b = document.createElement('button');
    b.textContent = formatCredits(toCents(level));
    b.addEventListener('click', () => {
      game.setBetIndex(index);
      closePanels();
    });
    $('[data-bet-options]').appendChild(b);
    return b;
  });

  let autoCount = AUTOPLAY.counts[0]!;
  const countButtons = AUTOPLAY.counts.map((count) => {
    const b = document.createElement('button');
    b.textContent = String(count);
    b.addEventListener('click', () => {
      autoCount = count;
      render();
    });
    $('[data-auto-counts]').appendChild(b);
    return { b, count };
  });

  // ---- win count-up ----
  const shownWin = { cents: 0 };
  let winTween: gsap.core.Tween | null = null;
  const drawWin = () => (win.textContent = shownWin.cents > 0 ? formatCredits(Math.round(shownWin.cents)) : '–');
  const countWinTo = (cents: number) => {
    winTween?.kill();
    if (cents <= shownWin.cents) {
      shownWin.cents = cents;
      drawWin();
      return;
    }
    const { perX, min, max } = PRESENTATION.winCountUp;
    const x = (cents - shownWin.cents) / toCents(game.bet);
    const duration = Math.min(max, Math.max(min, x * perX)) * (game.turbo ? PRESENTATION.turboFactor : 1);
    winTween = gsap.to(shownWin, { cents, duration, ease: 'power1.out', onUpdate: drawWin });
  };

  // ---- render ----
  const render = () => {
    const idle = game.isIdle;
    const spinning = game.state === 'SPINNING' || game.state === 'FREE_SPINNING';
    const canChange = idle && !autoplay.active;
    balance.textContent = formatCredits(game.displayBalanceCents);
    bet.textContent = formatCredits(toCents(game.bet));
    betDown.disabled = !canChange || game.betIndex === 0;
    betUp.disabled = !canChange || game.betIndex === betLevels.length - 1;
    betOpen.disabled = !canChange;
    reset.disabled = !canChange;
    turbo.checked = game.turbo;
    betButtons.forEach((b, i) => b.classList.toggle('is-active', i === game.betIndex));
    countButtons.forEach(({ b, count }) => b.classList.toggle('is-active', count === autoCount));

    // The spin button doubles as stop / skip while a round is playing.
    spin.textContent = spinning ? 'STOP' : idle ? 'SPIN' : 'SKIP';
    spin.disabled = idle ? !game.canSpin || autoplay.active : false;

    auto.textContent = autoplay.active ? `STOP AUTO (${autoplay.spinsRemaining})` : 'AUTO';
    auto.classList.toggle('is-running', autoplay.active);
    auto.disabled = !autoplay.active && !game.canSpin;
    if (!canChange) closePanels();
  };

  const press = () => {
    closePanels();
    if (game.isIdle) {
      if (!autoplay.active) {
        note.textContent = '';
        game.spin();
      }
    } else if (!game.quickStop()) {
      controls.skip();
    }
  };

  spin.addEventListener('click', press);
  betDown.addEventListener('click', () => game.betDown());
  betUp.addEventListener('click', () => game.betUp());
  betOpen.addEventListener('click', () => toggle(betPanel));
  auto.addEventListener('click', () => {
    if (autoplay.active) autoplay.stop();
    else toggle(autoPanel);
    render();
  });
  autoStart.addEventListener('click', () => {
    closePanels();
    note.textContent = '';
    autoplay.start({ spins: autoCount, stopOnBigWin: stopBig.checked, stopOnFeature: stopFeature.checked });
    render();
  });
  turbo.addEventListener('change', () => game.setTurbo(turbo.checked));
  reset.addEventListener('click', () => {
    game.resetBalance();
    note.textContent = 'Balance reset. New run started.';
  });
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.repeat) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) return;
    e.preventDefault();
    press();
  });

  game.events.on('roundStart', () => {
    shownWin.cents = 0;
    winTween?.kill();
    drawWin();
  });
  game.events.on('balance', () => countWinTo(game.roundWinCents));
  autoplay.events.on('progress', render);
  autoplay.events.on('stop', ({ reason }) => {
    note.textContent = STOP_MESSAGES[reason];
    render();
  });
  for (const event of ['stateChange', 'balance', 'bet', 'turbo', 'reset'] as const) game.events.on(event, render);
  drawWin();
  render();
}
