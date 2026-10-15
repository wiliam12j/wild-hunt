import type { GameMachine } from '../state/machine.ts';
import { toCents } from '../state/wallet.ts';
import { formatCredits } from './format.ts';

// Minimal controls so the game is playable now. The full bet panel and autoplay menu come in Phase 6.

export function mountHud(root: HTMLElement, game: GameMachine): void {
  root.innerHTML = `
    <div class="hud-stat"><span>Balance</span><strong data-balance></strong></div>
    <div class="hud-stat"><span>Win</span><strong data-win></strong></div>
    <div class="hud-bet">
      <button data-bet-down aria-label="Lower bet">−</button>
      <div class="hud-stat"><span>Bet</span><strong data-bet></strong></div>
      <button data-bet-up aria-label="Raise bet">+</button>
    </div>
    <button class="hud-spin" data-spin>SPIN</button>
    <label class="hud-toggle"><input type="checkbox" data-turbo /> Turbo</label>
    <button class="hud-small" data-reset>Reset balance</button>
  `;
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const balance = $('[data-balance]');
  const win = $('[data-win]');
  const bet = $('[data-bet]');
  const betDown = $<HTMLButtonElement>('[data-bet-down]');
  const betUp = $<HTMLButtonElement>('[data-bet-up]');
  const spin = $<HTMLButtonElement>('[data-spin]');
  const turbo = $<HTMLInputElement>('[data-turbo]');
  const reset = $<HTMLButtonElement>('[data-reset]');

  const render = () => {
    const idle = game.isIdle;
    const spinning = game.state === 'SPINNING' || game.state === 'FREE_SPINNING';
    balance.textContent = formatCredits(game.displayBalanceCents);
    win.textContent = game.roundWinCents > 0 ? formatCredits(game.roundWinCents) : '–';
    bet.textContent = formatCredits(toCents(game.bet));
    betDown.disabled = !idle;
    betUp.disabled = !idle;
    reset.disabled = !idle;
    turbo.checked = game.turbo;
    // The spin button doubles as quick stop while reels are moving.
    spin.textContent = spinning ? 'STOP' : 'SPIN';
    spin.disabled = !(game.canSpin || spinning);
  };

  const press = () => {
    if (game.isIdle) game.spin();
    else game.quickStop();
  };

  spin.addEventListener('click', press);
  betDown.addEventListener('click', () => game.betDown());
  betUp.addEventListener('click', () => game.betUp());
  turbo.addEventListener('change', () => game.setTurbo(turbo.checked));
  reset.addEventListener('click', () => game.resetBalance());
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.repeat) return;
    e.preventDefault();
    press();
  });

  for (const event of ['stateChange', 'balance', 'bet', 'turbo', 'reset'] as const) game.events.on(event, render);
  render();
}
