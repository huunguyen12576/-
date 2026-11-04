import {Easing, interpolate, spring} from 'remotion';
import T from './timeline.json';

export const FPS = T.fps;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Eased 0→1 ramp between two frames. */
export const ramp = (
  f: number,
  a: number,
  b: number,
  ease: (t: number) => number = Easing.bezier(0.45, 0, 0.2, 1)
) => interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});

/** Physical spring 0→1 starting at a frame. */
export const sp = (
  f: number,
  start: number,
  config: {damping?: number; mass?: number; stiffness?: number} = {},
  durationInFrames?: number
) =>
  spring({
    frame: f - start,
    fps: FPS,
    config: {damping: 16, mass: 1, stiffness: 120, ...config},
    durationInFrames,
  });

/** Deterministic pseudo-random. */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Smooth value noise in [-1,1] (for organic hand-held drift / tremor). */
export const noise1 = (t: number, seed = 0) => {
  const i = Math.floor(t);
  const fr = t - i;
  const a = rand(i + seed * 101) * 2 - 1;
  const b = rand(i + 1 + seed * 101) * 2 - 1;
  const s = fr * fr * (3 - 2 * fr);
  return a + (b - a) * s;
};

export type Num = Record<string, number>;

export const mixObj = <P extends Num>(a: P, b: P, t: number): P => {
  const out: Num = {};
  for (const k of Object.keys(b)) out[k] = lerp(a[k] ?? b[k], b[k], t);
  return out as P;
};

export type Key<P extends Num> = {
  f: number;
  v: P;
  /** spring config; omit for default "weighty" spring */
  cfg?: {damping?: number; mass?: number; stiffness?: number};
  /** use eased ramp of given length instead of spring */
  dur?: number;
};

/**
 * Keyframed state where every key blends from the *current* state (not the previous
 * target), so interrupting an animation never pops — motion keeps its continuity.
 */
export const keyed = <P extends Num>(frame: number, keys: Key<P>[]): P => {
  let state = keys[0].v;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (frame < k.f) break;
    const next = keys[i + 1];
    // state at the moment this key started is already in `state` (computed up to k.f)
    const localEnd = next && next.f <= frame ? next.f : frame;
    const t = k.dur
      ? ramp(localEnd, k.f, k.f + k.dur)
      : sp(localEnd, k.f, k.cfg ?? {damping: 18, mass: 1.2, stiffness: 90});
    state = mixObj(state, k.v, t);
  }
  return state;
};
