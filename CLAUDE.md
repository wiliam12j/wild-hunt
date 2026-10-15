Wild Hunt: Hunting-Themed Slot Machine (Play Money)

A browser-based, high-volatility 5x3 video slot with a hunting theme, built for two friends to play for fun. Fake money only. Never add real-money payments, wallets or gambling-site integrations. Working title: "Wild Hunt" (rename freely).

Inspired by the mechanics style of modern collect-feature slots (a Wild that collects cash-value symbols, free spins with escalating multipliers). All art, names, sounds and wording must be original. Do not copy assets, symbols or branding from any existing game.

How to work in this repo
Plan before coding. For each phase, propose the file structure and approach first and wait for approval.
One phase at a time. Finish, test and commit a phase before starting the next.
Game logic and rendering are strictly separate. The math engine is pure TypeScript with zero DOM/Pixi imports so it can run headless in Node.
No magic numbers. Paytable, reel strips, weights, cash values, multipliers and bet levels live in config files (/src/config), never hardcoded in logic.
Tests required for the math engine (Vitest). Use a seedable RNG so tests are deterministic.
Keep commits small with clear messages. Ask before adding a dependency not listed below.
Tech stack
TypeScript (strict), Vite
PixiJS for rendering, GSAP for animation, Howler.js for audio
Vitest for tests
Leaderboard backend: Supabase (free tier), or a tiny Node/SQLite server if we'd rather self-host
Deploy: Netlify or GitHub Pages (static front end)
Suggested structure
/src
  /config        paytable, reel strips, paylines, bonus rules, bet levels
  /engine        RNG, spin, line evaluation, feature logic (pure, no graphics)
  /state         game state machine, wallet/balance, session stats
  /render        Pixi scenes, reels, symbol sprites, win overlays
  /audio         sound manager
  /ui            bet panel, autoplay, menus, leaderboard screen
  /api           leaderboard client
/sim             headless simulation scripts (run in Node)
/tests
Game design
Grid and lines
5 reels x 3 rows, 10 fixed paylines, wins pay left to right on 3+ matching symbols (Wilds substitute).
Payline definitions (row index per reel, 0 = top, 1 = middle, 2 = bottom):
1,1,1,1,1
0,0,0,0,0
2,2,2,2,2
0,1,2,1,0
2,1,0,1,2
0,0,1,2,2
2,2,1,0,0
1,0,0,0,1
1,2,2,2,1
1,0,1,2,1
Total bet = 10 line bets. Paytable values are expressed in multiples of the line bet.
Only the highest win per payline counts; line wins are summed.
Symbols
Low: 10, J, Q, K, A (stylised engraved/wood-carved look)
High: Rabbit, Pheasant, Fox, Stag (animals as symbols)
Wild (Hunter): substitutes for all symbols except Scatter and Cash symbols. Appears on reels 2-4 only (configurable). Also acts as the collector (see below).
Scatter (Hunting Lodge): 3+ anywhere triggers free spins.
Cash symbols (Trophies): each carries a cash value (multiple of total bet) and does not pay by itself. It can only be won when a Hunter Wild lands on the same spin and collects it.
Starting paytable (multiples of line bet; placeholders to be tuned by the simulator)
Symbol	3	4	5
10, J	5	15	40
Q, K	5	20	50
A	10	25	75
Rabbit	10	30	100
Pheasant	15	50	150
Fox	20	75	250
Stag	30	100	500
Hunter Wild: no line pay of its own (it only lands on reels 2-4, so it can never start a line). It only substitutes. Live values are in /src/config/paytable.ts.
Core feature: Hunter collect

When a Hunter Wild lands on the same spin as one or more Cash symbols, the Hunter collects all visible Cash symbols, and each value is added to the win (multiplied by the current collect multiplier).

Cash symbol values scale with the animal and the animation shown:
Rabbit (caught in a net): small values, e.g. 1x-5x total bet
Pheasant: 5x-10x
Fox: 10x-20x
Deer (shot): 25x-50x
Golden Stag (rare, big shot): 100x+
Each collect plays an animation per animal type: net toss for rabbits, rifle shot for deer, etc.
Value tables and weights are config-driven.
Free spins
3 Scatters = 10 free spins (4 = 15, 5 = 20). Pays a scatter bonus.
Cash symbols appear far more often in free spins (separate reel strips).
Every 4th Hunter Wild collected during the round: retrigger +10 free spins and upgrade the collect multiplier along the ladder x2 → x3 → x10. The multiplier applies to all subsequent collected Cash values.
Show a progress meter (Hunter badges collected toward the next upgrade).
Round ends when spins run out. Show a total-win summary screen.
Optional extras (after core is done)
Bonus Buy (about 100x total bet) with its own simulated RTP
Gamble/double feature is not included
Max win cap at 10,000x total bet (round ends immediately when hit)
Math model targets
RTP: about 96% (acceptable 95.5-96.5%)
Volatility: high. Many dead spins, with big free-spin swings.
Hit frequency: about 20-25% of base spins win something
Free spin trigger: about 1 in 150-250 spins (tune with the simulator)
RTP split target: roughly 55-65% base game (incl. collects), 35-45% free spins
Separate configurable reel strips for base game and free spins
RNG: seedable PRNG for tests and simulation; use crypto.getRandomValues in the live game
Simulator (/sim)

A Node script that runs N spins (default 10 million, including full free-spin rounds) with a fixed seed and outputs:

Total RTP, base RTP, free-spin RTP
Hit frequency, free-spin trigger frequency, average free-spin round win
Max win seen, distribution of wins (buckets: 0x, <1x, 1-5x, 5-20x, 20-100x, 100-1000x, 1000x+)
Volatility estimate (standard deviation)
Save each run's output to /sim/results/ with a timestamp and config hash so we can compare tweaks.

Tuning rule: change weights in config only, rerun the simulator, never tweak payouts in code.

Game flow (state machine)

IDLE → SPINNING → EVALUATE_LINES → RESOLVE_COLLECT → PAYOUT → (FREE_SPIN_INTRO → FREE_SPINNING → … → FREE_SPIN_SUMMARY) → IDLE

Actions locked during spins. Support: bet up/down, spin, quick stop, turbo spin, autoplay (10/25/50/100 with stop-on-big-win and stop-on-feature options).

Wallet and Profit/Loss leaderboard (leaderboard DEFERRED: no backend for now; wallet and per-device stats are built)
Each player starts with 1,000 credits, with a "reset balance" button that starts a new run.
Bet levels (config): 1, 2, 5, 10, 20, 50, 100 total bet.
Track per player: balance, total wagered, total won, P/L = total won - total wagered, spins played, biggest win (x), best free-spin round.
Leaderboard ranks by P/L. Also show a "biggest win" column.
Player enters a display name once (stored locally). No passwords needed (trust-based between friends).
Sync stats to the backend after each spin batch (or every N seconds), not on every frame.
Include an optional "reset season" action for the leaderboard.
Presentation and feel
Dark misty-forest or Highland-lodge aesthetic, warm lantern lighting, original art
Reel spin with stagger, bounce-stop, and anticipation slow-down when 2 Scatters are showing (or Hunter Wild + Cash symbols are lined up)
Win line highlights, count-up win numbers, Big / Mega / Epic win overlays at thresholds (e.g. 15x / 30x / 100x total bet)
Screen shake and particle bursts on shots and net throws
Layered sound: spin loop, reel stop, win jingles by size, collect shot/net sounds, free-spin music
Responsive: playable on desktop and phone (portrait and landscape)
Placeholder art first (coloured shapes with labels), swapped for real art at the end
Build phases
Setup: repo, Vite + TS, Vitest, config files, this spec.
Math engine: RNG, reel strips, payline evaluation, wild logic, cash collect, free spins with retriggers and multiplier ladder, plus unit tests.
Simulator: results reporting as above, then a first balancing pass to hit the targets.
State machine and wallet: headless flow with session stats.
Rendering with placeholder art: reels, spin animation, line highlights.
Features in UI: collect animations, free-spin intro/summary, multiplier meter, bet panel, autoplay, turbo.
Leaderboard: backend, P/L tracking, leaderboard screen. DEFERRED (Oct 2026): skipped until we want a backend; go straight to Juice.
Juice: audio, particles, win overlays, anticipation.
Final art swap, balance re-check, mobile testing, deploy.
Definition of done per phase
Tests pass, simulator still within RTP target (once it exists), no hardcoded game values, committed with a clear message.
Out of scope

Real money, real payments, user accounts with personal data, public marketing, loot boxes or any monetisation.