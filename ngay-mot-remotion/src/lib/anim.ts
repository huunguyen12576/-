import {Easing, interpolate, spring} from 'remotion';

export const FPS = 30;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 0→1 progress between two frames, with easing. */
export const prog = (
  f: number,
  from: number,
  to: number,
  ease: (t: number) => number = Easing.bezier(0.45, 0, 0.2, 1),
) =>
  interpolate(f, [from, to], [0, 1], {
    easing: ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const EASE = {
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  out: Easing.bezier(0.16, 1, 0.3, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  cam: Easing.bezier(0.45, 0, 0.15, 1),
  linear: (t: number) => t,
};

/** Physically based spring starting at frame `at`. */
export const spr = (
  f: number,
  at: number,
  cfg: {damping?: number; stiffness?: number; mass?: number} = {},
) =>
  spring({
    frame: f - at,
    fps: FPS,
    config: {damping: 14, stiffness: 120, mass: 1, ...cfg},
  });

/** Map piecewise keyframes [[frame, value], ...] with eased segments. */
export const keys = (
  f: number,
  k: Array<[number, number]>,
  ease: (t: number) => number = EASE.inOut,
) => {
  if (f <= k[0][0]) return k[0][1];
  for (let i = 0; i < k.length - 1; i++) {
    const [f0, v0] = k[i];
    const [f1, v1] = k[i + 1];
    if (f <= f1) return lerp(v0, v1, ease(clamp((f - f0) / (f1 - f0))));
  }
  return k[k.length - 1][1];
};

/** Deterministic pseudo random. */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Damped camera shake, deterministic. */
export const shake = (f: number, at: number, amp: number, dur = 18) => {
  const t = f - at;
  if (t < 0 || t > dur) return {x: 0, y: 0, r: 0};
  const k = Math.exp(-t / (dur / 4)) * amp;
  return {
    x: Math.sin(t * 2.7) * k,
    y: Math.cos(t * 3.3) * k * 0.8,
    r: Math.sin(t * 1.9) * k * 0.03,
  };
};

/** Subtle handheld drift for a living camera. */
export const drift = (f: number, amp = 3) => ({
  x: Math.sin(f / 47) * amp + Math.sin(f / 23) * amp * 0.4,
  y: Math.cos(f / 53) * amp + Math.sin(f / 31) * amp * 0.3,
});
