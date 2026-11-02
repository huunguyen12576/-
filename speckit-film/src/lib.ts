import {Easing} from 'remotion';
import tl from './timeline.json';

export const TL = tl;
export const W = 1080;
export const H = 1920;
export const cue = (id: string) => {
  const c = tl.cues.find((x) => x.id === id);
  if (!c) throw new Error('cue ' + id);
  return c;
};
export const scene = (k: keyof typeof tl.scenes) => tl.scenes[k] as [number, number];

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lin = (t: number, a: number, d: number) => clamp((t - a) / d);
const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);
const backOut = Easing.bezier(0.34, 1.56, 0.64, 1);
/** eased 0..1 progress starting at time a over d seconds */
export const eo = (t: number, a: number, d: number) => expoOut(lin(t, a, d));
export const eio = (t: number, a: number, d: number) => inOut(lin(t, a, d));
export const eback = (t: number, a: number, d: number) => backOut(lin(t, a, d));
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;

/** scene-level visibility envelope: fade in at start, out at end */
export const sceneAlpha = (t: number, a: number, b: number, fin = 0.35, fout = 0.35) =>
  Math.min(eio(t, a - 0.2, fin), 1 - eio(t, b - 0.1, fout)); // overlapping crossfade, no dead frames

// deterministic pseudo random
export const rand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

export const C = {
  night: '#07080F',
  nightInk: '#ECEAFF',
  red: '#FF4D5E',
  amber: '#FFB547',
  paper: '#EEF0FA',
  paper2: '#E2E5F5',
  ink: '#15162B',
  inkSoft: '#5A5C7A',
  violet: '#6E56CF',
  violetSoft: '#B9AEF5',
  violetGlow: '#8B7CFF',
  mint: '#14A86E',
  blueprint: '#0E1F4D',
  blueprintLine: '#9DB8FF',
};

export const FONT = "'Be Vietnam Pro', sans-serif";
export const MONO = "'JetBrains Mono', monospace";
