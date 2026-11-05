import {Easing, interpolate} from 'remotion';

// ----- Easing & time helpers -----------------------------------------------
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ease = Easing.bezier(0.45, 0, 0.2, 1);
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn = Easing.bezier(0.6, 0, 0.9, 0.4);
export const backOut = Easing.bezier(0.34, 1.56, 0.64, 1);

/** progress 0..1 of frame inside [a,b] with easing */
export const prog = (f: number, a: number, b: number, e: (t: number) => number = ease) =>
  interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e});

/** damped spring overshoot 0..1 (physically plausible settle) */
export const springy = (f: number, start: number, dur = 18, damp = 6, freq = 2.2) => {
  if (f <= start) return 0;
  const t = clamp((f - start) / dur, 0, 4);
  return 1 - Math.exp(-damp * t) * Math.cos(freq * Math.PI * t);
};

// Deterministic pseudo-random
export const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ----- 2.5D projection -----------------------------------------------------
// World: x along the apartment, y = "back-plane" vertical coordinate
// (ceiling 60, floor 470), z = depth 0 (back wall) .. 1 (front).
export const PW = 1000; // panel width
export const PH = 640; // panel height
export const VY = 300; // vanishing height
export const FLOOR = 470;
export const CEIL = 60;
export const DEPTH = 0.95;

export type Cam = {x: number; zoom: number; shakeX?: number; shakeY?: number};

export const scaleAt = (z: number) => 1 + DEPTH * z;

export const proj = (cam: Cam, x: number, y: number, z: number): [number, number] => {
  const s = scaleAt(z) * cam.zoom;
  return [PW / 2 + (x - cam.x) * s + (cam.shakeX ?? 0), VY + (y - VY) * s + (cam.shakeY ?? 0)];
};

export const pts = (p: [number, number][]) => p.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');

// shade a hex colour by factor (k<1 darker, >1 lighter)
export const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) * k, 0, 255);
  const g = clamp(((n >> 8) & 255) * k, 0, 255);
  const b = clamp((n & 255) * k, 0, 255);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
};

export const mix = (a: string, b: string, t: number) => {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const c = (sh: number) => Math.round(lerp((na >> sh) & 255, (nb >> sh) & 255, t));
  return `#${((1 << 24) + (c(16) << 16) + (c(8) << 8) + c(0)).toString(16).slice(1)}`;
};
