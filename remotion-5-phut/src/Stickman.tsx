import React from 'react';
import {lerp} from './engine';

// Rig lengths (local units). Origin = hip. y down. Facing +x.
export const R = {torso: 62, head: 17, neck: 5, ua: 30, fa: 29, th: 37, sh: 36};
export const STAND_H = R.th + R.sh; // hip height when standing straight

type V = [number, number];

export type Pose = {
  rot: number; // whole body rotation (deg, clockwise)
  t: number; // torso lean (deg, + forward)
  hd: number; // head tilt relative to torso
  a1: number; a2: number; // near arm: shoulder, elbow (absolute, 0 = down, + forward)
  b1: number; b2: number; // far arm
  l1: number; l2: number; // near leg: hip, knee
  m1: number; m2: number; // far leg
};

export const P = (p: Partial<Pose>): Pose => ({
  rot: 0, t: 0, hd: 0, a1: 6, a2: 14, b1: -6, b2: 4, l1: 3, l2: 0, m1: -3, m2: -4, ...p,
});

export const lerpPose = (a: Pose, b: Pose, k: number): Pose => {
  const o = {} as Pose;
  (Object.keys(a) as (keyof Pose)[]).forEach((key) => (o[key] = lerp(a[key], b[key], k)));
  return o;
};

const dir = (deg: number, len: number): V => {
  const r = (deg * Math.PI) / 180;
  return [Math.sin(r) * len, Math.cos(r) * len];
};
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];

/** Two-bone IK. Returns the middle joint. bend: +1 / -1 picks the solution side */
export const ik = (s: V, tgt: V, a: number, b: number, bend: number): V => {
  const dx = tgt[0] - s[0];
  const dy = tgt[1] - s[1];
  let d = Math.hypot(dx, dy);
  d = Math.min(d, a + b - 0.01);
  d = Math.max(d, Math.abs(a - b) + 0.01);
  const ang = Math.atan2(dy, dx);
  const cosA = (a * a + d * d - b * b) / (2 * a * d);
  const A = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const k = ang + bend * A;
  return [s[0] + Math.cos(k) * a, s[1] + Math.sin(k) * a];
};

/** Solve rig points in local space; optional IK targets are given in local space too */
export const solve = (p: Pose, ikT?: {hand?: V; hand2?: V; foot?: V; foot2?: V}) => {
  const hip: V = [0, 0];
  const tr = (p.t * Math.PI) / 180;
  const up: V = [Math.sin(tr), -Math.cos(tr)];
  const neck: V = [up[0] * R.torso, up[1] * R.torso];
  const sh: V = [up[0] * R.torso * 0.9, up[1] * R.torso * 0.9];
  const hr = ((p.t + p.hd) * Math.PI) / 180;
  const head: V = [neck[0] + Math.sin(hr) * (R.neck + R.head), neck[1] - Math.cos(hr) * (R.neck + R.head)];
  const limb = (root: V, d1: number, d2: number, L1: number, L2: number, target?: V, bend = 1) => {
    if (target) {
      const mid = ik(root, target, L1, L2, bend);
      const dx = target[0] - mid[0];
      const dy = target[1] - mid[1];
      const dd = Math.hypot(dx, dy) || 1;
      return [mid, [mid[0] + (dx / dd) * L2, mid[1] + (dy / dd) * L2] as V] as const;
    }
    const m = add(root, dir(d1, L1));
    return [m, add(m, dir(d2, L2))] as const;
  };
  const [el, hand] = limb(sh, p.a1, p.a2, R.ua, R.fa, ikT?.hand, -1);
  const [el2, hand2] = limb(sh, p.b1, p.b2, R.ua, R.fa, ikT?.hand2, -1);
  const [kn, foot] = limb(hip, p.l1, p.l2, R.th, R.sh, ikT?.foot, 1);
  const [kn2, foot2] = limb(hip, p.m1, p.m2, R.th, R.sh, ikT?.foot2, 1);
  return {hip, neck, sh, head, el, hand, el2, hand2, kn, foot, kn2, foot2, up};
};

export type Rig = ReturnType<typeof solve>;

type Props = {
  x: number; // screen x of hip
  y: number; // screen y of hip
  scale: number;
  pose: Pose;
  facing?: 1 | -1;
  color?: string;
  outline?: string;
  ik?: {hand?: V; hand2?: V; foot?: V; foot2?: V};
  rim?: number; // 0..1 rim light intensity
  rimColor?: string;
  opacity?: number;
  handProp?: (r: Rig) => React.ReactNode; // drawn at near hand, local coords
  headProp?: (r: Rig) => React.ReactNode;
  blur?: number;
  only?: 'arm';
};

/** Convert a world-space offset (relative to hip, screen-aligned, local units) into rig-local space */
export const toLocal = (v: V, rot: number, facing: 1 | -1 = 1): V => {
  const r = (-rot * Math.PI) / 180;
  const x = v[0] * facing;
  return [x * Math.cos(r) - v[1] * Math.sin(r), x * Math.sin(r) + v[1] * Math.cos(r)];
};

export const Stickman: React.FC<Props> = ({
  x, y, scale, pose, facing = 1, color = '#f4f4f2', outline = '#0b0b0d', ik: ikT,
  rim = 0, rimColor = '#ffd7a0', opacity = 1, handProp, headProp, blur = 0, only,
}) => {
  const r = solve(pose, ikT);
  const W = 9.5;
  const O = 3.2;
  const far = shadeHex(color, 0.78);
  const seg = (pts: V[]) => `M${pts.map((q) => `${q[0].toFixed(2)} ${q[1].toFixed(2)}`).join(' L')}`;
  const limb = (pts: V[], c: string) => (
    <>
      <path d={seg(pts)} stroke={outline} strokeWidth={W + O * 2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={seg(pts)} stroke={c} strokeWidth={W} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
  return (
    <g
      transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${(scale * facing).toFixed(4)} ${scale.toFixed(4)}) rotate(${pose.rot.toFixed(2)})`}
      opacity={opacity}
      style={blur ? {filter: `blur(${blur}px)`} : undefined}
    >
      {only === 'arm' ? (<>{limb([r.sh, r.el, r.hand], color)}{handProp?.(r)}</>) : (<>
      {/* far limbs */}
      {limb([r.hip, r.kn2, r.foot2], far)}
      {limb([r.sh, r.el2, r.hand2], far)}
      {/* torso */}
      {limb([r.hip, r.neck], color)}
      {/* near leg */}
      {limb([r.hip, r.kn, r.foot], color)}
      {/* head */}
      <circle cx={r.head[0]} cy={r.head[1]} r={R.head + O} fill={outline} />
      <circle cx={r.head[0]} cy={r.head[1]} r={R.head} fill={color} />
      {rim > 0 && (
        <circle cx={r.head[0]} cy={r.head[1]} r={R.head - 1.5} fill="none" stroke={rimColor} strokeWidth={3}
          strokeDasharray={`${R.head * 2.2} 400`} transform={`rotate(-80 ${r.head[0]} ${r.head[1]})`} opacity={rim} />
      )}
      {headProp?.(r)}
      {/* near arm */}
      {limb([r.sh, r.el, r.hand], color)}
      {rim > 0 && (
        <path d={seg([r.hip, r.neck])} stroke={rimColor} strokeWidth={2.5} fill="none" opacity={rim * 0.8}
          transform="translate(3 0)" strokeLinecap="round" />
      )}
      {handProp?.(r)}
      </>)}
    </g>
  );
};

function shadeHex(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.round(((n >> s) & 255) * k);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}

// ---- Procedural locomotion ------------------------------------------------
export const walkPose = (ph: number, opts: {amp?: number; lean?: number; arm?: number; run?: boolean; slump?: number} = {}): {pose: Pose; bob: number} => {
  const amp = opts.amp ?? 26;
  const run = !!opts.run;
  const s = Math.sin(ph);
  const s2 = Math.sin(ph + Math.PI);
  const knee = (sv: number, phase: number) => {
    // knee bends while the leg swings forward (recovery)
    const swing = Math.max(0, Math.sin(phase + (run ? 1.9 : 1.6)));
    return sv * amp - swing * (run ? 85 : 38);
  };
  const arm = opts.arm ?? (run ? 40 : 22);
  const slump = opts.slump ?? 0;
  const pose = P({
    t: (opts.lean ?? (run ? 16 : 4)) + slump * 18,
    hd: slump * 22,
    l1: s * amp, l2: knee(s, ph),
    m1: s2 * amp, m2: knee(s2, ph + Math.PI),
    a1: -s * arm + slump * 10, a2: -s * arm + (run ? 75 : 22) + slump * 10,
    b1: s * arm + slump * 10, b2: s * arm + (run ? 75 : 22) + slump * 10,
  });
  const bob = -Math.abs(Math.cos(ph)) * (run ? 9 : 4) + (run ? 6 : 2);
  return {pose, bob};
};
