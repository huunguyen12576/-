import React from 'react';
import {lerp} from '../lib/anim';

/**
 * 2.5D white pictogram character driven by forward kinematics.
 * Angles in degrees. Limb angle 0 = pointing straight down, +90 = pointing forward (+x).
 * Torso `lean` 0 = upright, positive = leaning forward.
 */
export type Pose = {
  lean: number;
  head: number; // head tilt (+ = looking down/forward, - = looking up)
  aF: number; // near (front) arm: shoulder angle
  eF: number; // near arm elbow bend (+ = forearm swings forward/up)
  aB: number; // far (back) arm
  eB: number;
  hF: number; // near leg hip angle
  kF: number; // near knee bend (shin swings backward)
  hB: number;
  kB: number;
};

export const P = (p: Partial<Pose> = {}): Pose => ({
  lean: 0,
  head: 0,
  aF: 6,
  eF: 4,
  aB: -6,
  eB: 4,
  hF: 3,
  kF: 0,
  hB: -3,
  kB: 0,
  ...p,
});

export const POSES = {
  stand: P(),
  lookUp: P({head: -28, lean: -6, aF: 4, aB: -4}),
  reach: P({head: -30, lean: -4, aF: 165, eF: 5, aB: -8}),
  handOnHead: P({head: 14, lean: 4, aF: 150, eF: 120, aB: -4}),
  handsOnKnees: P({lean: 55, head: 22, aF: -12, eF: -6, aB: -18, eB: -4, hF: 30, kF: 40, hB: 14, kB: 30}),
  sit: P({lean: 24, head: 30, aF: 68, eF: -16, aB: 60, eB: -10, hF: 118, kF: 104, hB: 110, kB: 100}),
  kickBack: P({lean: -8, head: 10, aF: -40, eF: 30, aB: 50, eB: 20, hF: -45, kF: 90, hB: 4, kB: 10}),
  kickHit: P({lean: -14, head: 12, aF: -30, eF: 20, aB: 70, eB: 10, hF: 80, kF: 6, hB: -6, kB: 6}),
  carry: P({aF: 4, eF: 0, aB: -2, eB: 4}),
  pour: P({lean: 10, head: 18, aF: 95, eF: 25, aB: 60, eB: 60}),
  proud: P({lean: -3, head: -8, aF: 10, eF: 70, aB: -10, eB: 70}),
  shrug: P({head: -8, aF: 40, eF: 100, aB: -30, eB: 100}),
};

export const mix = (a: Pose, b: Pose, t: number): Pose => {
  const o = {} as Pose;
  (Object.keys(a) as (keyof Pose)[]).forEach((k) => {
    o[k] = lerp(a[k], b[k], t);
  });
  return o;
};

/** Walk / run cycle, phase in cycles. */
export const walk = (phase: number, amt = 1, base: Pose = POSES.stand): Pose => {
  const s = Math.sin(phase * Math.PI * 2);
  const c = Math.cos(phase * Math.PI * 2);
  return {
    ...base,
    lean: base.lean + 4 * amt,
    hF: base.hF + 26 * s * amt,
    hB: base.hB - 26 * s * amt,
    kF: base.kF + Math.max(0, 40 * c) * amt + 4,
    kB: base.kB + Math.max(0, -40 * c) * amt + 4,
    aF: base.aF - 24 * s * amt,
    aB: base.aB + 24 * s * amt,
    eF: base.eF + 18 * amt,
    eB: base.eB + 18 * amt,
  };
};
/** vertical bob that matches walk() */
export const walkBob = (phase: number, amt = 1) => -Math.abs(Math.cos(phase * Math.PI * 2)) * 5 * amt;

const L = {torso: 74, neck: 7, head: 21, upper: 44, fore: 42, thigh: 58, shin: 58, w: 17};

const dir = (deg: number) => {
  const r = (deg * Math.PI) / 180;
  return [Math.sin(r), Math.cos(r)] as const;
};

export const solve = (p: Pose) => {
  const hip = [0, 0];
  const [tx, ty] = dir(180 - p.lean); // torso points up
  const sh = [hip[0] + tx * L.torso, hip[1] + ty * L.torso];
  const headC = [sh[0] + tx * (L.neck + L.head) + Math.sin((p.head * Math.PI) / 180) * 4, sh[1] + ty * (L.neck + L.head)];
  const limb = (o: number[], a1: number, a2: number, l1: number, l2: number) => {
    const [x1, y1] = dir(a1);
    const j = [o[0] + x1 * l1, o[1] + y1 * l1];
    const [x2, y2] = dir(a2);
    return [o, j, [j[0] + x2 * l2, j[1] + y2 * l2]];
  };
  const shoulder = [sh[0] - tx * 4, sh[1] - ty * 4];
  const armF = limb(shoulder, p.aF, p.aF + p.eF, L.upper, L.fore);
  const armB = limb(shoulder, p.aB, p.aB + p.eB, L.upper, L.fore);
  const legF = limb(hip, p.hF, p.hF - p.kF, L.thigh, L.shin);
  const legB = limb(hip, p.hB, p.hB - p.kB, L.thigh, L.shin);
  const ground = Math.max(legF[2][1], legB[2][1], hip[1] + 8);
  return {hip, sh, headC, armF, armB, legF, legB, ground};
};

export const FIGURE_HEIGHT = L.thigh + L.shin + L.torso + L.neck + L.head * 2;

type Props = {
  x: number;
  y: number; // ground level
  pose: Pose;
  scale?: number;
  flip?: boolean;
  bob?: number;
  color?: string;
  far?: string;
  opacity?: number;
  headColor?: string;
  shadow?: boolean;
  glow?: number; // 0..1 rim glow
  children?: React.ReactNode; // props attached to near hand, local coords
  hand?: (h: {x: number; y: number}) => React.ReactNode;
  airborne?: number; // lift above ground
  sx?: number; // horizontal squash for 3D turn (-1..1)
};

const poly = (pts: number[][]) => pts.map((q) => `${q[0].toFixed(2)},${q[1].toFixed(2)}`).join(' ');

export const Figure: React.FC<Props> = ({
  x,
  y,
  pose,
  scale = 1,
  flip = false,
  bob = 0,
  color = '#ffffff',
  far = '#aeb9cc',
  opacity = 1,
  headColor,
  shadow = true,
  glow = 0,
  hand,
  airborne = 0,
  sx = 1,
}) => {
  const s = solve(pose);
  const oy = -s.ground + bob - airborne;
  const line = (pts: number[][], c: string, w = L.w) => (
    <polyline points={poly(pts)} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
  );
  const shadowW = 46 * Math.max(0.3, 1 - airborne / 160);
  return (
    <g transform={`translate(${x},${y}) scale(${(flip ? -scale : scale) * sx},${scale})`} opacity={opacity}>
      {shadow && (
        <ellipse cx={s.hip[0] * 0.3} cy={2} rx={shadowW} ry={7} fill="url(#figShadow)" opacity={0.9} />
      )}
      <g transform={`translate(0,${oy})`}>
        {glow > 0 && (
          <g opacity={glow * 0.35} style={{filter: 'blur(10px)'}}>
            {line([s.hip, s.sh], '#bfe0ff', 40)}
            <circle cx={s.headC[0]} cy={s.headC[1]} r={L.head + 10} fill="#bfe0ff" />
          </g>
        )}
        {/* far limbs */}
        {line(s.legB, far)}
        {line(s.armB, far, L.w - 1)}
        {/* torso */}
        {line([s.hip, s.sh], color, L.w + 6)}
        {line(s.legF, color)}
        {/* head */}
        <circle cx={s.headC[0]} cy={s.headC[1]} r={L.head} fill={headColor ?? 'url(#headGrad)'} />
        {line(s.armF, color, L.w - 1)}
        {/* rim light */}
        <polyline
          points={poly([s.hip, s.sh])}
          stroke="#ffffff"
          strokeOpacity={0.9}
          strokeWidth={3}
          transform="translate(-6,0)"
          fill="none"
          strokeLinecap="round"
        />
        {hand && <g>{hand({x: s.armF[2][0], y: s.armF[2][1]})}</g>}
      </g>
    </g>
  );
};

/** Shared gradient definitions. Put once inside each <svg>. */
export const FigureDefs: React.FC = () => (
  <>
    <radialGradient id="headGrad" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stopColor="#ffffff" />
      <stop offset="0.7" stopColor="#f2f5fb" />
      <stop offset="1" stopColor="#c6d0e2" />
    </radialGradient>
    <radialGradient id="figShadow">
      <stop offset="0" stopColor="#000" stopOpacity="0.85" />
      <stop offset="1" stopColor="#000" stopOpacity="0" />
    </radialGradient>
  </>
);
