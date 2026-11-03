// ─────────────────────────────────────────────────────────────
//  WORLD SIMULATION — deterministic, stateless per frame.
//  Units: metres / seconds. x → toward the cliff, y ↑, z → depth.
// ─────────────────────────────────────────────────────────────

export const W = 1080;
export const H = 1920;
export const FPS = 30;
export const DURATION = 690; // 23 s
export const PRE = 150; // pre-roll so the world is already "alive" at frame 0
export const HZ = 640; // horizon line on screen (camera has no pitch)

export const X_E = 1.47; // cliff edge
export const EDGE = X_E + 0.1; // hip passes this → falls
export const FRONT_Z = -0.6; // front face of the stone slab
export const STRIDE = 1.4; // metres per full gait cycle
export const V = STRIDE / (32 / FPS); // lock-step: one footfall every 16 frames
export const G = 9.8;
export const LANE_Z = [0, 1.7, 3.4, 5.1, 6.8, 8.5, 10.2, 11.9];
export const MAX_Z = 11.9;

// Story beats (frames)
export const K = {
  heroStop: 140,
  heroStopped: 154,
  reach: 160,
  pull: 178,
  awaken: 190,
  shock: 210,
  shockEnd: 226,
  turn: 236,
  turned: 252,
  contact: 272,
  pushStart: 280,
  edge: 424,
  fall: 448,
  line1: 198,
  line2: 500,
  dimStart: 548,
  dimEnd: 596,
  card1: 604,
  card2: 634,
  bandDrop: 654,
  end: 690,
};

// ── math helpers ───────────────────────────────────────────────
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
export const ease = (t: number) => {
  t = clamp(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t: number) => Math.pow(clamp(t), 3);
export const range = (f: number, a: number, b: number) => clamp((f - a) / (b - a));

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── time warp (slow motion around the hero's fall) ────────────
export function speedAt(f: number) {
  if (f < 428) return 1;
  if (f < 442) return lerp(1, 0.26, smooth((f - 428) / 14));
  if (f < 476) return 0.26;
  if (f < 496) return lerp(0.26, 1, smooth((f - 476) / 20));
  return 1;
}
const TAU = new Float64Array(DURATION + PRE + 4);
TAU[0] = -PRE / FPS;
for (let i = 1; i < TAU.length; i++) TAU[i] = TAU[i - 1] + speedAt(i - 1 - PRE) / FPS;
/** Simulation time (seconds) at a (fractional) frame. */
export function tau(f: number) {
  const i = f + PRE;
  const i0 = Math.max(0, Math.min(TAU.length - 2, Math.floor(i)));
  return TAU[i0] + (TAU[i0 + 1] - TAU[i0]) * (i - i0);
}
/** Lock-step gait phase shared by the whole crowd (conformity made visible). */
export const crowdPhase = (f: number) => (V * tau(f)) / STRIDE;

// ── hero script ────────────────────────────────────────────────
export const XS = -1.2; // where he stops
export const XB = -1.38; // after the startled step back
export const XEDGE = X_E - 0.05;
const DDEC = V * (14 / FPS) * 0.5;
export const SHOVES = Array.from({ length: 9 }, (_, i) => K.pushStart + i * 16);
const SW = SHOVES.map((_, i) => 1 + 0.24 * i);
const SWSUM = SW.reduce((a, b) => a + b, 0);
const X1 = XB + 0.06;

const shoveCurve = (u: number) =>
  u < 7 / 16 ? 0.86 * easeOut(u / (7 / 16)) : 0.86 + 0.14 * ((u - 7 / 16) / (9 / 16));

export function heroX(f: number): number {
  if (f <= K.heroStop) return XS - DDEC - (V * (K.heroStop - f)) / FPS;
  if (f < K.heroStopped) {
    const u = (f - K.heroStop) / 14;
    return XS - DDEC + V * (14 / FPS) * (u - (u * u) / 2);
  }
  if (f < K.shock) return XS;
  if (f < K.pushStart) {
    const back = lerp(XS, XB, ease((f - K.shock) / 16));
    const jolt = f >= K.contact ? 0.06 * easeOut((f - K.contact) / 6) : 0;
    return back + jolt;
  }
  if (f < SHOVES[SHOVES.length - 1] + 16) {
    const i = Math.min(SHOVES.length - 1, Math.floor((f - K.pushStart) / 16));
    let acc = 0;
    for (let j = 0; j < i; j++) acc += SW[j];
    const u = (f - SHOVES[i]) / 16;
    acc += SW[i] * shoveCurve(u);
    return X1 + ((XEDGE - X1) * acc) / SWSUM;
  }
  return XEDGE;
}
/** Recoil impulse of the latest shove (0..1, decays). */
export function shoveImpulse(f: number) {
  let v = 0;
  SHOVES.forEach((b, i) => {
    if (f >= b) v = Math.max(v, Math.exp(-(f - b) / 5) * (0.55 + 0.05 * i));
  });
  if (f >= K.contact && f < K.contact + 30) v = Math.max(v, Math.exp(-(f - K.contact) / 5) * 0.6);
  return v;
}

// ── front lane (lane 0): figures ahead of the hero + the followers ──
const HERO0 = heroX(0);
const SP_AHEAD = (EDGE - V * 0.2 - HERO0) / 7; // the 7th one steps off at frame 6 (hook)
export const AHEAD_BASE = Array.from({ length: 22 }, (_, k) => HERO0 + SP_AHEAD * (k + 1));

export const NF = 10;
const GAP_PUSH = 0.62;
const XF0 = XB - GAP_PUSH - V * tau(K.contact);
const freeF = (k: number, f: number) => XF0 - 1.2 * k + V * tau(f);

type FollowerTrack = { x: Float64Array; fc: number; contact: number };
const F0 = -PRE;
const NFR = DURATION + PRE + 1;
export const FOLLOWERS: FollowerTrack[] = (() => {
  const out: FollowerTrack[] = [];
  for (let k = 0; k < NF; k++) {
    const x = new Float64Array(NFR);
    let fc = Infinity;
    let contact = Infinity;
    const cRel = heroX(K.fall) - GAP_PUSH * (k + 1);
    for (let i = 0; i < NFR; i++) {
      const f = i + F0;
      const free = freeF(k, f);
      const c =
        f < K.fall ? heroX(f) - GAP_PUSH * (k + 1) : cRel + V * (tau(f) - tau(K.fall));
      if (free >= c - 1e-6 && contact === Infinity) contact = f;
      x[i] = Math.min(free, c);
      if (x[i] > EDGE && fc === Infinity) fc = f;
    }
    out.push({ x, fc, contact });
  }
  return out;
})();
export const followerX = (k: number, f: number) => {
  const tr = FOLLOWERS[k].x;
  const i = clamp(f - F0, 0, NFR - 1);
  const i0 = Math.min(NFR - 2, Math.floor(i));
  return tr[i0] + (tr[i0 + 1] - tr[i0]) * (i - i0);
};

// ── background lanes ───────────────────────────────────────────
export type LaneWalker = { base: number; z: number; lane: number; seed: number; h: number; jit: number };
export const WALKERS: LaneWalker[] = (() => {
  const r = rng(7);
  const out: LaneWalker[] = [];
  for (let l = 1; l < LANE_Z.length; l++) {
    const off = r() * 1.3;
    const sp = 1.3 + r() * 0.3;
    for (let k = -14; k < 46; k++) {
      out.push({
        base: X_E - off - sp * k - 0.4,
        z: LANE_Z[l] + (r() - 0.5) * 0.25,
        lane: l,
        seed: r() * 1000,
        h: 0.96 + r() * 0.08,
        jit: (r() - 0.5) * 0.05,
      });
    }
  }
  return out;
})();

// ── camera ────────────────────────────────────────────────────
export type Cam = { x: number; y: number; z: number; f: number };
//            frame   x      y     z     focal
const KEYS: [number, number, number, number, number][] = [
  [0, 1.05, 2.25, -3.5, 1350],
  [16, 1.0, 2.3, -3.7, 1350],
  [86, 0.1, 3.5, -9.2, 1350],
  [140, -0.55, 3.25, -8.4, 1350],
  [188, -1.0, 2.7, -5.5, 1350],
  [208, -0.95, 2.62, -5.2, 1350],
  [234, 0.2, 3.0, -7.6, 1760], // dolly-zoom reveal of the abyss
  [264, -0.7, 2.8, -6.4, 1450],
  [300, -0.55, 2.8, -6.4, 1400],
  [424, 0.85, 2.45, -5.0, 1400],
  [450, 1.15, 2.1, -4.4, 1400],
  [484, 1.3, 1.1, -4.7, 1400],
  [524, 0.4, 3.4, -9.0, 1350],
  [560, -0.2, 2.8, -7.2, 1350],
  [606, -0.62, 1.9, -4.4, 1350],
  [690, -0.66, 1.85, -4.2, 1350],
];
function hermite(f: number, idx: number) {
  let i = 0;
  while (i < KEYS.length - 2 && f > KEYS[i + 1][0]) i++;
  const k0 = KEYS[Math.max(0, i - 1)];
  const k1 = KEYS[i];
  const k2 = KEYS[i + 1];
  const k3 = KEYS[Math.min(KEYS.length - 1, i + 2)];
  const dt = k2[0] - k1[0];
  const u = clamp((f - k1[0]) / dt);
  // tangents: zero at the ends of "hold" segments, Catmull-Rom elsewhere, scaled down for weight
  const m1 = i === 0 ? 0 : ((k2[idx] - k0[idx]) / (k2[0] - k0[0])) * dt * 0.6;
  const m2 = i + 2 >= KEYS.length ? 0 : ((k3[idx] - k1[idx]) / (k3[0] - k1[0])) * dt * 0.6;
  const u2 = u * u;
  const u3 = u2 * u;
  return (
    (2 * u3 - 3 * u2 + 1) * k1[idx] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * k2[idx] + (u3 - u2) * m2
  );
}
export function camera(f: number): Cam {
  const imp = shoveImpulse(f);
  const hand = 0.012 * Math.sin(f * 0.051) + 0.008 * Math.sin(f * 0.137 + 1.3);
  const handY = 0.01 * Math.sin(f * 0.043 + 2.1) + 0.006 * Math.sin(f * 0.17);
  const sh = imp * 0.05 * Math.sin(f * 2.3);
  return {
    x: hermite(f, 1) + hand + sh,
    y: hermite(f, 2) + handY + sh * 0.5,
    z: hermite(f, 3),
    f: hermite(f, 4),
  };
}
export function project(cam: Cam, X: number, Y: number, Z: number) {
  const d = Math.max(0.05, Z - cam.z);
  const s = cam.f / d;
  return { x: W / 2 + (X - cam.x) * s, y: HZ - (Y - cam.y) * s, s };
}
