// Generates the placeholder sound set as WAV files in public/audio/.
// Everything is synthesised here from oscillators, seeded noise and envelopes, so the sounds
// are original and the output is identical on every run. Real recordings can replace these
// files later without code changes (keep the names).
//
// Usage: npm run sounds

import { mkdirSync, writeFileSync } from 'node:fs';
import { createSeededRng } from '../src/engine/rng.ts';

const RATE = 22050;
const OUT = new URL('../public/audio/', import.meta.url);

type Buffer32 = Float32Array;

const buf = (seconds: number): Buffer32 => new Float32Array(Math.round(seconds * RATE));
const noiseRng = createSeededRng(4242);
const noise = () => noiseRng.next() * 2 - 1;
const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);

/** Adds `src` into `dst` at `at` seconds, scaled. */
function mix(dst: Buffer32, src: Buffer32, at = 0, gain = 1): void {
  const o = Math.round(at * RATE);
  for (let i = 0; i < src.length && o + i < dst.length; i++) dst[o + i]! += src[i]! * gain;
}

/** Attack/decay envelope, exponential decay. */
function env(i: number, n: number, attack: number, decay: number): number {
  const t = i / RATE;
  if (t < attack) return t / attack;
  return Math.exp(-(t - attack) / decay) * (1 - Math.min(1, Math.max(0, (i - n * 0.97) / (n * 0.03))));
}

type Wave = 'sine' | 'tri' | 'saw' | 'square';
function osc(wave: Wave, phase: number): number {
  const p = phase - Math.floor(phase);
  switch (wave) {
    case 'sine':
      return Math.sin(2 * Math.PI * p);
    case 'tri':
      return 4 * Math.abs(p - 0.5) - 1;
    case 'saw':
      return 2 * p - 1;
    case 'square':
      return p < 0.5 ? 1 : -1;
  }
}

/** One note with a frequency glide from f0 to f1. */
function tone(seconds: number, f0: number, f1: number, wave: Wave, attack: number, decay: number): Buffer32 {
  const b = buf(seconds);
  let phase = 0;
  for (let i = 0; i < b.length; i++) {
    const f = f0 + (f1 - f0) * (i / b.length);
    phase += f / RATE;
    b[i] = osc(wave, phase) * env(i, b.length, attack, decay);
  }
  return b;
}

function noiseBurst(seconds: number, attack: number, decay: number): Buffer32 {
  const b = buf(seconds);
  for (let i = 0; i < b.length; i++) b[i] = noise() * env(i, b.length, attack, decay);
  return b;
}

/** One-pole low-pass; `cutoff` may vary over the buffer (0..1 progress → Hz). */
function lowpass(b: Buffer32, cutoff: number | ((t: number) => number)): Buffer32 {
  let y = 0;
  for (let i = 0; i < b.length; i++) {
    const fc = typeof cutoff === 'number' ? cutoff : cutoff(i / b.length);
    const a = 1 - Math.exp((-2 * Math.PI * fc) / RATE);
    y += a * (b[i]! - y);
    b[i] = y;
  }
  return b;
}

const highpass = (b: Buffer32, cutoff: number): Buffer32 => {
  const low = lowpass(Float32Array.from(b), cutoff);
  for (let i = 0; i < b.length; i++) b[i]! -= low[i]!;
  return b;
};

/** Simple feedback echo. */
function echo(b: Buffer32, delay: number, feedback: number, taps = 3): Buffer32 {
  const out = Float32Array.from(b);
  for (let k = 1; k <= taps; k++) mix(out, b, delay * k, feedback ** k);
  return out;
}

function normalise(b: Buffer32, peak = 0.85): Buffer32 {
  let m = 0;
  for (const v of b) m = Math.max(m, Math.abs(v));
  if (m > 0) for (let i = 0; i < b.length; i++) b[i] = (b[i]! / m) * peak;
  return b;
}

/** Names of looping sounds: these must not be faded, or the loop would dip. */
const LOOPS = new Set(['spin', 'music-base', 'music-free']);
const FADE_OUT = 0.02;

function writeWav(name: string, b: Buffer32): void {
  if (!LOOPS.has(name)) {
    const n = Math.min(b.length, Math.round(FADE_OUT * RATE));
    for (let i = 0; i < n; i++) b[b.length - 1 - i]! *= i / n;
  }
  const data = Buffer.alloc(44 + b.length * 2);
  data.write('RIFF', 0);
  data.writeUInt32LE(36 + b.length * 2, 4);
  data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); // PCM
  data.writeUInt16LE(1, 22); // mono
  data.writeUInt32LE(RATE, 24);
  data.writeUInt32LE(RATE * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(b.length * 2, 40);
  for (let i = 0; i < b.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, b[i]!)) * 32767), 44 + i * 2);
  writeFileSync(new URL(`${name}.wav`, OUT), data);
  console.log(`${name}.wav  ${(b.length / RATE).toFixed(2)}s`);
}

/** Notes (midi) played one after another. */
function arpeggio(notes: readonly number[], step: number, noteLen: number, wave: Wave, decay: number): Buffer32 {
  const b = buf(step * (notes.length - 1) + noteLen);
  notes.forEach((n, i) => mix(b, tone(noteLen, midi(n), midi(n), wave, 0.005, decay), i * step, 0.6));
  return b;
}

/** Hunting-horn style note: filtered saw with a little vibrato. */
function horn(seconds: number, note: number): Buffer32 {
  const b = buf(seconds);
  let phase = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / RATE;
    const f = midi(note) * (1 + 0.006 * Math.sin(2 * Math.PI * 5.5 * t));
    phase += f / RATE;
    const a = Math.min(1, t / 0.06) * Math.min(1, (seconds - t) / 0.15);
    b[i] = osc('saw', phase) * a;
  }
  return lowpass(b, 1400);
}

// ---------------------------------------------------------------------------

mkdirSync(OUT, { recursive: true });

// Reel spin loop: soft whirr plus ticks, exactly 0.8 s so it loops seamlessly.
{
  const b = buf(0.8);
  const whirr = lowpass(Float32Array.from(b, () => noise()), 500);
  mix(b, whirr, 0, 0.5);
  for (let k = 0; k < 8; k++) mix(b, highpass(noiseBurst(0.03, 0.001, 0.006), 1500), k * 0.1, 0.5);
  writeWav('spin', normalise(b, 0.5));
}

// Reel stop: a short wooden thunk.
{
  const b = tone(0.18, 140, 55, 'sine', 0.002, 0.05);
  mix(b, lowpass(noiseBurst(0.04, 0.001, 0.01), 1800), 0, 0.5);
  writeWav('stop', normalise(b, 0.8));
}

// Anticipation: a rising, trembling tone.
{
  const b = buf(1.6);
  let phase = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / RATE;
    phase += (260 + 520 * (t / 1.6) ** 1.5) / RATE;
    b[i] = osc('tri', phase) * Math.min(1, t / 0.3) * (0.7 + 0.3 * Math.sin(2 * Math.PI * 9 * t));
  }
  writeWav('anticipation', normalise(lowpass(b, 2500), 0.55));
}

// Coin / value arrival: a bright two-partial ting.
{
  const b = tone(0.3, 1568, 1568, 'sine', 0.002, 0.08);
  mix(b, tone(0.3, 2352, 2352, 'sine', 0.002, 0.05), 0, 0.5);
  writeWav('coin', normalise(b, 0.6));
}

// Win jingles by size.
writeWav('win-small', normalise(arpeggio([72, 76, 79], 0.08, 0.3, 'tri', 0.12), 0.6));
writeWav('win-medium', normalise(arpeggio([72, 76, 79, 84, 88], 0.08, 0.5, 'tri', 0.2), 0.7));
{
  const b = buf(2.2);
  mix(b, arpeggio([60, 64, 67, 72, 76, 79, 84], 0.09, 0.6, 'square', 0.15), 0, 0.35);
  for (const n of [72, 76, 79, 84]) mix(b, tone(1.4, midi(n), midi(n), 'tri', 0.01, 0.6), 0.7, 0.3);
  writeWav('win-big', normalise(lowpass(b, 4000), 0.8));
}

// Net throw: a swept whoosh.
writeWav('net', normalise(lowpass(noiseBurst(0.4, 0.12, 0.12), (t) => 300 + 2200 * Math.sin(Math.PI * t)), 0.6));

// Rifle shot: a crack, a low thump and a rolling echo.
{
  const b = buf(1.0);
  mix(b, highpass(noiseBurst(0.12, 0.0005, 0.02), 900), 0, 1);
  mix(b, tone(0.25, 110, 40, 'sine', 0.001, 0.06), 0, 0.9);
  mix(b, lowpass(noiseBurst(0.6, 0.002, 0.15), 700), 0, 0.5);
  writeWav('shot', normalise(echo(b, 0.14, 0.35), 0.9));
}

// Meter badge fill: a pluck.
{
  const b = tone(0.25, midi(79), midi(79), 'tri', 0.002, 0.07);
  mix(b, tone(0.25, midi(86), midi(86), 'sine', 0.002, 0.05), 0, 0.4);
  writeWav('meter', normalise(b, 0.6));
}

// Retrigger: rising horn call.
{
  const b = buf(1.3);
  [67, 72, 76, 79].forEach((n, i) => mix(b, horn(i === 3 ? 0.7 : 0.22, n), i * 0.18, 0.6));
  writeWav('retrigger', normalise(b, 0.8));
}

// Free spins start / end: hunting horn calls.
{
  const start = buf(1.6);
  mix(start, horn(0.45, 67), 0, 0.7);
  mix(start, horn(1.0, 74), 0.5, 0.7);
  writeWav('fs-start', normalise(echo(start, 0.25, 0.25, 2), 0.8));
  const end = buf(1.6);
  mix(end, horn(0.45, 74), 0, 0.7);
  mix(end, horn(1.0, 67), 0.5, 0.7);
  writeWav('fs-end', normalise(echo(end, 0.25, 0.25, 2), 0.8));
}

// Base-game ambience: quiet forest pad with sparse plucks. 8 s, loops seamlessly.
{
  const len = 8;
  const b = buf(len);
  for (let i = 0; i < b.length; i++) {
    const t = i / RATE;
    const lfo = 0.6 + 0.4 * Math.sin((2 * Math.PI * t) / len);
    b[i] = (Math.sin(2 * Math.PI * midi(45) * t) + 0.6 * Math.sin(2 * Math.PI * midi(52) * t)) * 0.25 * lfo;
  }
  const scale = [69, 72, 74, 76, 79, 81];
  const rng = createSeededRng(7);
  for (let k = 0; k < 12; k++) {
    const at = k * (len / 12);
    const n = scale[Math.floor(rng.next() * scale.length)]!;
    mix(b, tone(Math.min(0.9, len - at), midi(n), midi(n), 'tri', 0.01, 0.25), at, 0.18);
  }
  writeWav('music-base', normalise(lowpass(b, 2000), 0.4));
}

// Free-spin music: driving drums and a minor pad, 120 bpm, 8 s (4 bars) loop.
{
  const len = 8;
  const beat = 0.5;
  const b = buf(len);
  for (let k = 0; k < len / beat; k++) {
    mix(b, tone(0.3, 120, 45, 'sine', 0.001, 0.08), k * beat, 0.8); // kick
    if (k % 2 === 1) mix(b, lowpass(noiseBurst(0.2, 0.001, 0.05), 3000), k * beat, 0.35); // snare-ish
    mix(b, highpass(noiseBurst(0.05, 0.001, 0.01), 5000), k * beat + beat / 2, 0.2); // hat
    if (k % 4 === 3) mix(b, tone(0.25, 180, 90, 'sine', 0.001, 0.06), k * beat + 0.25, 0.5); // tom
  }
  const chords = [
    [50, 57, 62],
    [48, 55, 60],
    [46, 53, 58],
    [45, 52, 57],
  ];
  chords.forEach((chord, bar) => {
    for (const n of chord) mix(b, lowpass(tone(2, midi(n), midi(n), 'saw', 0.1, 1.5), 900), bar * 2, 0.12);
  });
  writeWav('music-free', normalise(b, 0.5));
}
