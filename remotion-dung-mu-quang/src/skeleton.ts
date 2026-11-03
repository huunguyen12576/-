// Stick-figure skeleton: poses + forward kinematics (local metres, x = facing, y up).
import { clamp, lerp } from './sim';

export type Pose = {
  lean: number; // torso from vertical, + forward
  head: number; // head tilt relative to torso
  hipN: number; // near leg hip angle from "down", + forward
  kneeN: number; // knee flex ≥ 0
  hipF: number; // far leg
  kneeF: number;
  shN: number; // near arm shoulder angle from "down", + forward
  elN: number; // elbow flex (forearm rotates forward/up)
  shF: number;
  elF: number;
};

export const HIP = 0.92;
const TORSO = 0.55;
const NECK = 0.2;
const THIGH = 0.46;
const SHIN = 0.46;
const UARM = 0.31;
const FARM = 0.29;
export const HEAD_R = 0.14;

export const mix = (a: Pose, b: Pose, t: number): Pose => {
  t = clamp(t);
  const o = {} as Pose;
  (Object.keys(a) as (keyof Pose)[]).forEach((k) => (o[k] = lerp(a[k], b[k], t)));
  return o;
};

export const STAND: Pose = { lean: 0.02, head: 0, hipN: 0.05, kneeN: 0.06, hipF: -0.05, kneeF: 0.08, shN: 0.06, elN: 0.12, shF: -0.06, elF: 0.15 };

export function walk(phase: number, amp = 1, armAmp = 0.32): Pose {
  const a = phase * Math.PI * 2;
  const s = Math.sin(a);
  const c = Math.cos(a);
  return {
    lean: 0.07 * amp + 0.015 * Math.abs(c),
    head: 0.02,
    hipN: amp * 0.44 * s,
    kneeN: amp * (0.08 + 0.75 * Math.pow(Math.max(0, c), 1.6)),
    hipF: -amp * 0.44 * s,
    kneeF: amp * (0.08 + 0.75 * Math.pow(Math.max(0, -c), 1.6)),
    shN: -armAmp * amp * s,
    elN: 0.22 + 0.18 * amp * Math.max(0, -s),
    shF: armAmp * amp * s,
    elF: 0.22 + 0.18 * amp * Math.max(0, s),
  };
}

/** Blind conga: arms reaching forward onto the shoulders ahead. */
export function push(phase: number, strain = 1): Pose {
  const w = walk(phase, 0.5);
  return { ...w, lean: 0.26 + 0.06 * strain, head: 0.05, shN: 1.38 + 0.05 * Math.sin(phase * 6.28), elN: 0.12, shF: 1.3, elF: 0.2 };
}

export function flail(t: number, seed: number): Pose {
  return {
    lean: -0.15 + 0.15 * Math.sin(t * 5 + seed),
    head: -0.2,
    hipN: 0.55 + 0.45 * Math.sin(t * 7.3 + seed),
    kneeN: 0.7 + 0.4 * Math.sin(t * 6.1 + seed * 2),
    hipF: -0.25 + 0.5 * Math.sin(t * 6.7 + seed * 3),
    kneeF: 0.9 + 0.3 * Math.sin(t * 8.2 + seed),
    shN: 2.6 + 0.55 * Math.sin(t * 9.1 + seed),
    elN: 0.5 + 0.4 * Math.sin(t * 7.7 + seed * 1.7),
    shF: 2.1 + 0.6 * Math.sin(t * 8.3 + seed * 2.3),
    elF: 0.6 + 0.4 * Math.sin(t * 10.1 + seed),
  };
}

export const REACH: Pose = { lean: 0.0, head: 0.08, hipN: 0.05, kneeN: 0.08, hipF: -0.06, kneeF: 0.1, shN: 2.05, elN: 2.15, shF: -0.05, elF: 0.2 };
export const PULLED: Pose = { lean: 0.04, head: 0.0, hipN: 0.05, kneeN: 0.08, hipF: -0.06, kneeF: 0.1, shN: 1.05, elN: 0.3, shF: -0.05, elF: 0.2 };
export const SEE: Pose = { lean: 0.12, head: 0.32, hipN: 0.06, kneeN: 0.1, hipF: -0.08, kneeF: 0.12, shN: 0.35, elN: 0.35, shF: 0.2, elF: 0.3 };
export const SHOCK: Pose = { lean: -0.2, head: 0.18, hipN: 0.32, kneeN: 0.15, hipF: -0.3, kneeF: 0.42, shN: 0.95, elN: 0.55, shF: 0.75, elF: 0.6 };
export const STOP: Pose = { lean: 0.08, head: -0.05, hipN: 0.38, kneeN: 0.22, hipF: -0.38, kneeF: 0.12, shN: 1.75, elN: -0.05, shF: 1.2, elF: 0.6 };
export const BRACE: Pose = { lean: 0.3, head: 0.05, hipN: 0.55, kneeN: 0.55, hipF: -0.5, kneeF: 0.1, shN: 1.45, elN: 0.35, shF: 1.35, elF: 0.45 };
export const RECOIL: Pose = { lean: 0.02, head: -0.25, hipN: 0.45, kneeN: 0.35, hipF: -0.62, kneeF: 0.05, shN: 1.2, elN: 0.9, shF: 1.1, elF: 0.95 };
export const TEETER: Pose = { lean: -0.42, head: -0.3, hipN: 0.5, kneeN: 0.25, hipF: -0.25, kneeF: 0.15, shN: 2.4, elN: 0.2, shF: 2.0, elF: 0.3 };

export type Joints = {
  hip: [number, number];
  neck: [number, number];
  head: [number, number];
  kneeN: [number, number];
  footN: [number, number];
  kneeF: [number, number];
  footF: [number, number];
  elbowN: [number, number];
  handN: [number, number];
  elbowF: [number, number];
  handF: [number, number];
};

const dir = (a: number): [number, number] => [Math.sin(a), -Math.cos(a)];
const add = (p: [number, number], d: [number, number], l: number): [number, number] => [p[0] + d[0] * l, p[1] + d[1] * l];

/** FK. If grounded, the lowest foot is placed on y = 0 (gives natural bob). */
export function fk(p: Pose, grounded = true, scale = 1): Joints {
  const hip: [number, number] = [0, HIP];
  const neck: [number, number] = [Math.sin(p.lean) * TORSO, HIP + Math.cos(p.lean) * TORSO];
  const ha = p.lean + p.head;
  const head: [number, number] = [neck[0] + Math.sin(ha) * NECK, neck[1] + Math.cos(ha) * NECK];
  const kneeN = add(hip, dir(p.hipN), THIGH);
  const footN = add(kneeN, dir(p.hipN - p.kneeN), SHIN);
  const kneeF = add(hip, dir(p.hipF), THIGH);
  const footF = add(kneeF, dir(p.hipF - p.kneeF), SHIN);
  const sh: [number, number] = [neck[0] - Math.sin(p.lean) * 0.04, neck[1] - Math.cos(p.lean) * 0.04];
  const elbowN = add(sh, dir(p.shN), UARM);
  const handN = add(elbowN, dir(p.shN + p.elN), FARM);
  const elbowF = add(sh, dir(p.shF), UARM);
  const handF = add(elbowF, dir(p.shF + p.elF), FARM);
  const j: Joints = { hip, neck, head, kneeN, footN, kneeF, footF, elbowN, handN, elbowF, handF };
  const dy = grounded ? -Math.min(footN[1], footF[1]) : 0;
  (Object.keys(j) as (keyof Joints)[]).forEach((k) => {
    j[k] = [j[k][0] * scale, (j[k][1] + dy) * scale];
  });
  return j;
}
