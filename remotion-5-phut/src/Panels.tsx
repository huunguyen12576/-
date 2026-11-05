import React from 'react';
import {Apartment, AptState, FloorShadow} from './Apartment';
import {Cam, FLOOR, PH, PW, clamp, ease, easeIn, easeOut, lerp, proj, prog, rnd, scaleAt, springy} from './engine';
import {P, Pose, R, STAND_H, Stickman, lerpPose, solve, toLocal, walkPose} from './Stickman';
import T from './timeline.json';

export const CH = 1.45; // character scale in world units
const STAND_Y = FLOOR - STAND_H * CH - 1;
const BED_Y = 388;

type V = [number, number];
type CharState = {
  x: number; z: number; y: number; // world hip position
  pose: Pose;
  facing?: 1 | -1;
  ik?: {hand?: V; hand2?: V; foot?: V; foot2?: V}; // world-aligned local units, relative to hip
  opacity?: number;
  handProp?: Parameters<typeof Stickman>[0]['handProp'];
  headProp?: Parameters<typeof Stickman>[0]['headProp'];
  armOver?: boolean; // re-draw near arm above the front layer
  shadow?: number;
};

const STAND = P({});
const LIE = P({rot: -90, a1: 4, a2: 8, b1: -2, b2: 2, l1: 0, l2: 0, m1: 2, m2: 2, hd: -10});
const SIT = P({rot: 0, t: 4, l1: 88, l2: 88, m1: 84, m2: 84, a1: 30, a2: 60, b1: 24, b2: 50});
const SIT_EDGE = P({rot: 0, t: 6, l1: 80, l2: 6, m1: 74, m2: -2, a1: 20, a2: 40, b1: 14, b2: 30});

/** world-aligned local vector from hip to a world point */
const toHipLocal = (cam: Cam, c: CharState, wx: number, wy: number, wz: number): V => {
  const h = proj(cam, c.x, c.y, c.z);
  const t = proj(cam, wx, wy, wz);
  const s = scaleAt(c.z) * cam.zoom * CH;
  return [((t[0] - h[0]) / s) * (c.facing ?? 1), (t[1] - h[1]) / s];
};

const walkBetween = (f: number, a: number, b: number, x0: number, x1: number, run = false, slump = 0) => {
  const k = prog(f, a, b, run ? (t: number) => t : ease);
  const x = lerp(x0, x1, k);
  const stride = run ? 120 : 82;
  const ph = (Math.abs(x - x0) / stride) * Math.PI;
  const w = walkPose(ph, {run, slump, amp: run ? 34 : 26});
  // blend in/out of the walk so starts and stops have weight
  const inW = clamp((f - a) / 5);
  const outW = clamp((b - f) / 5);
  const wgt = Math.min(inW, outW);
  return {x, pose: lerpPose(STAND, w.pose, wgt), bob: w.bob * wgt};
};

// --------------------------------------------------------------------------------------------
// TOP: "5 PHÚT" — the disciplined morning
// --------------------------------------------------------------------------------------------
const topCam = (f: number): Cam => {
  const t = T.top;
  let x = 500;
  x = lerp(x, 1500, prog(f, t.walkKitchen[0] + 4, t.walkKitchen[1] + 2));
  x = lerp(x, 2520, prog(f, t.walkBath[0] - 2, t.walkBath[1] + 2));
  x = lerp(x, 3540, prog(f, t.walkDoor[0], t.walkDoor[1] + 4));
  const zoom = 1.02 + 0.04 * prog(f, 45, 160) - 0.04 * prog(f, 160, 175) + 0.05 * prog(f, 198, 250) - 0.05 * prog(f, 250, 262)
    + 0.04 * prog(f, 276, 330) - 0.04 * prog(f, 330, 340) + 0.14 * prog(f, 356, 404, easeIn);
  return {x: x + Math.sin(f / 40) * 4, zoom};
};

const topChar = (f: number, cam: Cam): CharState => {
  const t = T.top;
  const z = 0.33;
  // 1 — in bed, alarm off
  if (f < t.sitUp[0]) {
    const c: CharState = {x: 520, z, y: BED_Y, pose: LIE};
    const reach = prog(f, t.alarmOff - 9, t.alarmOff - 1) * (1 - prog(f, t.alarmOff + 1, t.alarmOff + 6));
    if (reach > 0) {
      const tgt = toHipLocal(cam, c, 232, 368, 0.25);
      const rest: V = [-6, -8];
      c.ik = {hand: toLocal([lerp(rest[0], tgt[0], reach), lerp(rest[1], tgt[1], reach)], LIE.rot)};
    }
    return c;
  }
  // 2 — sit up, swing off the bed
  if (f < t.standUp[0]) {
    const k = prog(f, t.sitUp[0], t.sitUp[1], easeOut);
    return {x: lerp(520, 600, k), z, y: BED_Y - 4 * k, pose: lerpPose(LIE, SIT, k)};
  }
  if (f < t.pushups[0]) {
    const k = prog(f, t.standUp[0], t.standUp[1]);
    const k2 = prog(f, t.standUp[0], t.standUp[0] + 8);
    const arc = Math.sin(k * Math.PI) * 18;
    const pose = k < 0.5 ? lerpPose(SIT, SIT_EDGE, k2) : lerpPose(SIT_EDGE, STAND, prog(f, t.standUp[0] + 8, t.standUp[1]));
    return {x: lerp(600, 640, k), z: lerp(z, 0.66, k), y: lerp(BED_Y - 4, STAND_Y, k) - arc, pose};
  }
  // 3 — push-ups (feet planted, IK hands)
  if (f < t.walkKitchen[0]) {
    const feetX = 470;
    const zp = 0.66;
    const downs = t.pushupDown;
    let rot = 64;
    const into = prog(f, t.pushups[0], t.pushups[0] + 9);
    const out = prog(f, t.pushups[1] - 8, t.pushups[1] + 2);
    downs.forEach((d) => {
      // smooth lower / press cycle with a slight hold at the bottom
      const a = prog(f, d - 7, d, ease);
      const b = prog(f, d + 2, d + 9, easeOut);
      rot += 17 * (a - b);
    });
    const hipX = feetX + 73 * Math.sin((rot * Math.PI) / 180) * CH;
    const hipY = FLOOR - 73 * Math.cos((rot * Math.PI) / 180) * CH - 4;
    const handWL: V = [52, 73 * Math.cos((rot * Math.PI) / 180) + 2];
    const pu = P({rot, t: 0, hd: -6, l1: 0, l2: 0, m1: 0, m2: 0});
    const pushState: CharState = {x: hipX, z: zp, y: hipY, pose: pu, ik: {hand: toLocal(handWL, rot), hand2: toLocal([handWL[0] + 4, handWL[1]], rot)}};
    const standState: CharState = {x: 640, z: zp, y: STAND_Y, pose: STAND};
    const blend = into * (1 - out);
    if (blend >= 0.999) return pushState;
    // crouch in/out blend
    const crouch = P({t: 40, l1: 70, l2: -20, m1: 60, m2: -30, a1: 50, a2: 60, b1: 40, b2: 50});
    const mid = blend < 0.5 ? lerpPose(STAND, crouch, blend * 2) : lerpPose(crouch, pu, (blend - 0.5) * 2);
    return {
      x: lerp(standState.x, pushState.x, blend), z: zp,
      y: lerp(STAND_Y, hipY, blend) + Math.sin(blend * Math.PI) * 22,
      pose: mid,
      ik: blend > 0.5 ? pushState.ik : undefined,
    };
  }
  // 4 — walk to kitchen
  if (f < t.cook[0]) {
    const w = walkBetween(f, t.walkKitchen[0], t.walkKitchen[1] + 2, 640, 1450);
    return {x: w.x, z: lerp(0.66, 0.36, prog(f, t.walkKitchen[0], t.walkKitchen[1])), y: STAND_Y + w.bob, pose: w.pose};
  }
  // 5 — cook eggs
  if (f < t.walkBath[0]) {
    const c: CharState = {x: 1450, z: 0.36, y: STAND_Y, pose: P({t: 8, hd: 14}), armOver: true};
    const panX = 1530;
    const lift = flipLift(f);
    c.ik = {
      hand: toHipLocal(cam, c, panX - 62, 380 - lift, 0.68),
      hand2: crackHand(f, cam, c),
    };
    const settle = prog(f, t.cook[1] - 6, t.cook[1]);
    c.pose = lerpPose(c.pose, STAND, settle);
    if (settle > 0.5) c.ik = undefined;
    return c;
  }
  // 6 — walk to bathroom
  if (f < t.shower[0]) {
    const w = walkBetween(f, t.walkBath[0], t.walkBath[1] + 2, 1450, 2530);
    return {x: w.x, z: lerp(0.36, 0.25, prog(f, t.walkBath[0], t.walkBath[1])), y: STAND_Y + w.bob, pose: w.pose};
  }
  // 7 — shower, scrubbing hair
  if (f < t.walkDoor[0]) {
    const c: CharState = {x: 2530, z: 0.25, y: STAND_Y, pose: P({hd: -8, t: -2})};
    const rig = solve(c.pose);
    const sc = Math.sin(f * 0.9) * 7;
    const inA = prog(f, t.shower[0], t.shower[0] + 6) * (1 - prog(f, t.shower[1] - 6, t.shower[1]));
    if (inA > 0.01) {
      const h = rig.head;
      const restA: V = [rig.hand[0], rig.hand[1]];
      const restB: V = [rig.hand2[0], rig.hand2[1]];
      const ta: V = [h[0] + 12 + sc, h[1] - 12];
      const tb: V = [h[0] - 12 - sc, h[1] - 10];
      c.ik = {hand: [lerp(restA[0], ta[0], inA), lerp(restA[1], ta[1], inA)], hand2: [lerp(restB[0], tb[0], inA), lerp(restB[1], tb[1], inA)]};
    }
    return c;
  }
  // 8 — to the door
  if (f < t.ready[0]) {
    const w = walkBetween(f, t.walkDoor[0], t.walkDoor[1] + 2, 2530, 3400);
    return {x: w.x, z: lerp(0.25, 0.33, prog(f, t.walkDoor[0], t.walkDoor[1])), y: STAND_Y + w.bob, pose: w.pose};
  }
  // 9 — ready: straighten collar, step to the door, open it, walk into the light
  const r0 = t.ready[0];
  if (f < r0 + 12) {
    const c: CharState = {x: 3400, z, y: STAND_Y, pose: P({hd: -6 * prog(f, r0, r0 + 10)})};
    const rig = solve(c.pose);
    const k = Math.sin(prog(f, r0, r0 + 12) * Math.PI);
    c.ik = {hand: [lerp(rig.hand[0], rig.neck[0] + 8, k), lerp(rig.hand[1], rig.neck[1] + 6, k)]};
    return c;
  }
  if (f < t.doorOpen) {
    const w = walkBetween(f, r0 + 12, t.doorOpen - 2, 3400, 3560);
    const c: CharState = {x: w.x, z, y: STAND_Y + w.bob, pose: w.pose};
    const reach = prog(f, t.doorOpen - 8, t.doorOpen);
    if (reach > 0) c.ik = {hand: toHipLocal(cam, c, lerp(3600, 3638, reach), 320, lerp(0.2, 0.02, reach))};
    return c;
  }
  const w = walkBetween(f, t.doorOpen + 8, t.doorOpen + 40, 3560, 3575);
  const k = prog(f, t.doorOpen + 6, t.doorOpen + 22);
  return {
    x: w.x, z: lerp(0.33, 0.02, k), y: STAND_Y + w.bob, pose: f < t.doorOpen + 8 ? P({a1: 30, a2: 40}) : w.pose,
    opacity: 1 - 0.6 * prog(f, t.doorOpen + 10, t.doorOpen + 24), shadow: 1 - k,
  };
};

const flipLift = (f: number) => {
  const t = T.top.flip;
  return Math.sin(prog(f, t - 3, t + 5) * Math.PI) * 24;
};

const crackHand = (f: number, cam: Cam, c: CharState): V => {
  const t = T.top.eggCrack;
  const rest = toHipLocal(cam, c, 1470, 372, 0.62);
  const up = toHipLocal(cam, c, 1535, 318, 0.68);
  const k = prog(f, t - 8, t - 2) * (1 - prog(f, t + 4, t + 10));
  const tap = Math.sin(prog(f, t - 2, t + 2) * Math.PI) * 10;
  return [lerp(rest[0], up[0], k), lerp(rest[1], up[1], k) + tap];
};

/** pan + egg, drawn in the front layer */
const PanAndEgg: React.FC<{f: number; cam: Cam}> = ({f, cam}) => {
  const t = T.top;
  if (f < t.cook[0] - 10 || f > t.walkBath[1] + 6) return null;
  const lift = flipLift(f);
  const [px, py] = proj(cam, 1530, 380 - lift, 0.73);
  const s = scaleAt(0.73) * cam.zoom;
  const [hx, hy] = proj(cam, 1530 - 62, 380 - lift, 0.68);
  const crack = t.eggCrack;
  // egg in hand before crack, falling, then spreading
  const eggInHand = f < crack + 1;
  const spread = springy(f, crack + 2, 12, 5, 1.6);
  // flip arc
  const fl = prog(f, t.flip - 1, t.flip + 12, (x) => x);
  const flipping = fl > 0 && fl < 1;
  const arcY = -Math.sin(fl * Math.PI) * 70 * s;
  const rotE = fl * 180;
  const squash = f > t.flip + 12 ? 1 + 0.25 * Math.exp(-(f - t.flip - 12) / 3) * Math.cos((f - t.flip - 12) * 1.4) : 1;
  const sizzle = f > crack + 2 && f < t.cook[1];
  const egg = (
    <g>
      <ellipse rx={30 * s * spread} ry={9 * s * spread} fill="#f8f6ef" />
      <ellipse cx={4 * s} cy={-2 * s} rx={9 * s * spread} ry={6 * s * spread} fill="#ffb21f" />
      <ellipse cx={1 * s} cy={-4 * s} rx={3 * s * spread} ry={1.6 * s * spread} fill="#fff6c8" opacity={0.8} />
    </g>
  );
  const [ex, ey] = proj(cam, 1535, 318, 0.68);
  const fall = prog(f, crack, crack + 3, easeIn);
  return (
    <g>
      {/* handle */}
      <line x1={hx} y1={hy} x2={px - 40 * s} y2={py} stroke="#1b1b1d" strokeWidth={7 * s} strokeLinecap="round" />
      <ellipse cx={px} cy={py + 4 * s} rx={44 * s} ry={12 * s} fill="#141416" />
      <ellipse cx={px} cy={py} rx={42 * s} ry={10 * s} fill="#2a2a2e" />
      <ellipse cx={px} cy={py - 1} rx={36 * s} ry={7 * s} fill="#38383d" />
      {eggInHand && (
        <ellipse cx={ex} cy={lerp(ey, py - 4, fall)} rx={8 * s} ry={10 * s} fill="#f2e6d0" stroke="#c9b48e" strokeWidth={1} />
      )}
      {!eggInHand && (
        <g transform={`translate(${px} ${py - 3 + (flipping ? arcY : 0)}) rotate(${flipping ? rotE : 0}) scale(${1 / squash} ${squash})`}>{egg}</g>
      )}
      {sizzle && [...Array(9)].map((_, i) => {
        const life = ((f + i * 3) % 9) / 9;
        const ang = rnd(i + Math.floor((f + i * 3) / 9) * 13) * Math.PI;
        return (
          <circle key={i} cx={px + Math.cos(ang) * 40 * s * life} cy={py - Math.sin(ang) * 30 * s * life - 6 * s * life}
            r={1.6 * s} fill="#fff4d0" opacity={(1 - life) * 0.9} />
        );
      })}
      {sizzle && [0, 1, 2].map((i) => (
        <path key={`st${i}`} d={`M${px + (i - 1) * 16 * s} ${py - 8 * s} q ${8 * s} ${-14 * s} 0 ${-28 * s} q ${-8 * s} ${-14 * s} 0 ${-28 * s}`}
          fill="none" stroke="#ffffff" strokeWidth={2.2 * s} strokeLinecap="round"
          opacity={0.18 + 0.1 * Math.sin(f / 4 + i)} transform={`translate(0 ${-((f * 1.5 + i * 12) % 30)})`} />
      ))}
    </g>
  );
};

// --------------------------------------------------------------------------------------------
// BOTTOM: "KHÔNG KỊP" — the snoozed morning
// --------------------------------------------------------------------------------------------
const botCharX = (f: number) => {
  const b = T.bot;
  if (f < b.getUp[0]) return 520;
  if (f < b.runKitchen[0]) return lerp(600, 800, prog(f, b.getUp[0], b.getUp[1]));
  if (f < b.grab[0]) return lerp(800, 1440, prog(f, b.runKitchen[0], b.runKitchen[1] + 2, (x) => x));
  if (f < b.runBath[0]) return 1440;
  if (f < b.noShower[0]) return lerp(1440, 2420, prog(f, b.runBath[0], b.runBath[1] + 2, (x) => x));
  if (f < b.runDoor[0]) return 2420;
  if (f < b.runDoor[1]) return lerp(2420, 3420, prog(f, b.runDoor[0], b.runDoor[1] + 2, (x) => x));
  return lerp(3420, 3560, prog(f, b.runDoor[1], b.doorOpen - 2));
};

const botCam = (f: number): Cam => {
  // lagging follow-cam with handheld nerves
  let acc = 0;
  for (let k = 0; k < 8; k++) acc += Math.max(500, Math.min(3540, botCharX(f - k * 1.5)));
  const x = acc / 8;
  const panic = prog(f, T.bot.late, T.bot.late + 4) * (1 - prog(f, 396, 404));
  const shakeX = (Math.sin(f * 1.7) * 3 + Math.sin(f * 3.1) * 2) * panic;
  const shakeY = (Math.cos(f * 2.3) * 2 + Math.sin(f * 1.3) * 1.5) * panic;
  const zoom = 1.02 + 0.03 * prog(f, 45, 230) + 0.08 * (springy(f, T.bot.late, 14, 5, 2) - prog(f, T.bot.late + 6, T.bot.late + 20));
  return {x, zoom, shakeX, shakeY};
};

const GREY = '#9a9aa4';

const botChar = (f: number, cam: Cam): CharState => {
  const b = T.bot;
  const z = 0.33;
  // 1 — buried under the blanket, snoozing
  if (f < b.late) {
    const c: CharState = {x: 520, z, y: BED_Y, pose: P({...LIE, hd: -14 + Math.sin(f / 18) * 3})};
    let reach = 0;
    b.snooze.forEach((s) => {
      reach = Math.max(reach, prog(f, s - 8, s - 1) * (1 - prog(f, s + 2, s + 9)));
    });
    if (reach > 0) {
      const tgt = toHipLocal(cam, c, 232, 368, 0.25);
      c.ik = {hand: toLocal([lerp(-10, tgt[0], reach), lerp(-4, tgt[1], reach)], LIE.rot)};
    }
    c.armOver = reach > 0.05;
    return c;
  }
  // 2 — panic jolt
  if (f < b.getUp[0]) {
    const k = springy(f, b.late, 10, 6, 2.2);
    return {x: 560, z, y: BED_Y - 8 * k, pose: lerpPose(LIE, P({...SIT, a1: -40, a2: -60, b1: -30, b2: -70}), clamp(k, 0, 1.15))};
  }
  if (f < b.runKitchen[0]) {
    const k = prog(f, b.getUp[0], b.getUp[1]);
    const arc = Math.sin(k * Math.PI) * 24;
    return {x: lerp(560, 800, k), z, y: lerp(BED_Y - 8, STAND_Y, k) - arc, pose: lerpPose(SIT, walkPose(f * 0.5, {run: true}).pose, k)};
  }
  const runSeg = (a: number, bb: number, x0: number, x1: number, slump = 0) => {
    const w = walkBetween(f, a, bb + 2, x0, x1, true, slump);
    return {x: w.x, z, y: STAND_Y + w.bob, pose: w.pose} as CharState;
  };
  // 3 — run to kitchen, grab a bánh mì, eat while running
  if (f < b.grab[0]) return {...runSeg(b.runKitchen[0], b.runKitchen[1], 800, 1440)};
  if (f < b.runBath[0]) {
    const c: CharState = {x: 1440, z, y: STAND_Y, pose: P({t: 14})};
    const k = Math.sin(prog(f, b.grab[0], b.grab[0] + 8) * Math.PI);
    const tgt = toHipLocal(cam, c, 1430 + 60, 368, 0.12);
    const toMouth = prog(f, b.grab[0] + 6, b.grab[1]);
    const rig = solve(c.pose);
    const mouth: V = [rig.head[0] + 16, rig.head[1] + 6];
    const rest: V = [rig.hand[0], rig.hand[1]];
    const h1: V = [lerp(rest[0], tgt[0], k), lerp(rest[1], tgt[1], k)];
    c.ik = {hand: toMouth > 0 ? [lerp(h1[0], mouth[0], toMouth), lerp(h1[1], mouth[1], toMouth)] : h1};
    c.handProp = f > b.grab[0] + 4 ? banhMi : undefined;
    return c;
  }
  if (f < b.noShower[0]) {
    const c = runSeg(b.runBath[0], b.runBath[1], 1440, 2420);
    const rig = solve(c.pose);
    c.ik = {hand: [rig.head[0] + 16, rig.head[1] + 8]};
    c.handProp = banhMi;
    return c;
  }
  // 4 — no time to shower: sniff, wince
  if (f < b.runDoor[0]) {
    const c: CharState = {x: 2420, z, y: STAND_Y, pose: P({t: 6, hd: 30 * prog(f, b.noShower[0] + 4, b.noShower[0] + 10), b1: -10})};
    const rig = solve(c.pose);
    const raise = prog(f, b.noShower[0] + 2, b.noShower[0] + 8) * (1 - prog(f, b.noShower[1] - 6, b.noShower[1]));
    c.ik = {hand: [lerp(rig.hand[0], rig.sh[0] - 10, raise), lerp(rig.hand[1], rig.sh[1] - 40, raise)]};
    c.headProp = stink(f);
    return c;
  }
  // 5 — sprint to the door, then frozen, panting
  if (f < b.runDoor[1]) {
    const c = runSeg(b.runDoor[0], b.runDoor[1], 2420, 3420);
    c.headProp = sweat(f);
    return c;
  }
  const w = walkBetween(f, b.runDoor[1], b.doorOpen - 2, 3420, 3560, false, 0.6);
  const pant = Math.sin(f * 0.8) * 3;
  const c: CharState = {x: w.x, z, y: STAND_Y + w.bob + 4, pose: lerpPose(w.pose, P({t: 28 + pant, hd: 10, a1: 20, a2: 30, b1: 14, b2: 24, l1: 12, l2: -10, m1: -8, m2: -20}), prog(f, b.doorOpen - 6, b.doorOpen))};
  const reach = prog(f, b.doorOpen - 8, b.doorOpen) * (1 - prog(f, b.doorOpen + 4, b.doorOpen + 10));
  if (reach > 0) c.ik = {hand: toHipLocal(cam, c, 3638, 320, 0.02)};
  c.headProp = sweat(f);
  return c;
};

const banhMi = (r: ReturnType<typeof solve>) => (
  <g transform={`translate(${r.hand[0]} ${r.hand[1]}) rotate(-25)`}>
    <rect x={-6} y={-30} width={13} height={42} rx={6.5} fill="#d48a3a" stroke="#0b0b0d" strokeWidth={2.4} />
    <path d="M-3 -24 l6 5 M-3 -14 l6 5 M-3 -4 l6 5" stroke="#f3c27a" strokeWidth={1.6} />
  </g>
);

const stink = (f: number) => (r: ReturnType<typeof solve>) => (
  <g opacity={0.85}>
    {[0, 1, 2].map((i) => (
      <path key={i} d={`M${r.sh[0] - 6 + i * 9} ${r.sh[1] - 4} q 5 -8 0 -16 q -5 -8 0 -16`}
        fill="none" stroke="#9fd36a" strokeWidth={2.4} strokeLinecap="round"
        transform={`translate(0 ${-((f * 0.9 + i * 6) % 14)})`} opacity={0.7} />
    ))}
  </g>
);

const sweat = (f: number) => (r: ReturnType<typeof solve>) => (
  <g>
    {[0, 1].map((i) => {
      const l = ((f + i * 7) % 14) / 14;
      return <path key={i} d={`M${r.head[0] + (i ? -20 : 16)} ${r.head[1] - 14 + l * 22} q 3 5 0 8 q -3 -3 0 -8`} fill="#bfe3ff" opacity={1 - l} />;
    })}
  </g>
);

// --------------------------------------------------------------------------------------------
// Shared character renderer
// --------------------------------------------------------------------------------------------
const CharAt: React.FC<{cam: Cam; c: CharState; color: string; only?: 'arm'; rim?: number}> = ({cam, c, color, only, rim = 0}) => {
  const [sx, sy] = proj(cam, c.x, c.y, c.z);
  const s = scaleAt(c.z) * cam.zoom * CH;
  return (
    <Stickman x={sx} y={sy} scale={s} pose={c.pose} facing={c.facing ?? 1} color={color} ik={c.ik} opacity={c.opacity ?? 1}
      handProp={c.handProp} headProp={only ? undefined : c.headProp} only={only} rim={rim} />
  );
};

const Zzz: React.FC<{f: number; cam: Cam; on: number}> = ({f, cam, on}) => {
  if (on <= 0) return null;
  const [x, y] = proj(cam, 400, 330, 0.33);
  return (
    <g opacity={on}>
      {[0, 1, 2].map((i) => {
        const l = ((f + i * 14) % 42) / 42;
        return (
          <text key={i} x={x + 10 + l * 40 + Math.sin(l * 6) * 6} y={y - l * 90} fontFamily="Montserrat" fontWeight={800}
            fontSize={18 + l * 14} fill="#c9d4ff" opacity={Math.sin(l * Math.PI) * 0.9}>z</text>
        );
      })}
    </g>
  );
};

const Blanket: React.FC<{cam: Cam; cover: number; color: string; breathe: number; crumple?: number}> = ({cam, cover, color, breathe, crumple = 0}) => {
  // a soft quilt from x0 to the foot of the bed; its bump follows the body
  const x0 = lerp(735, 430, cover);
  const P = (x: number, y: number) => proj(cam, x, y, 0.36);
  const top = 392 - 6 * breathe;
  const a = P(x0, 398);
  const b = P(x0 + 30, top - 14 - crumple * 26);
  const c = P(lerp(x0, 740, 0.55), top - 20 - crumple * 10);
  const d = P(745, 398);
  const e = P(748, 432);
  const g = P(x0 - 4, 432);
  if (cover <= 0.02 && crumple <= 0) return null;
  const s = scaleAt(0.36) * cam.zoom;
  return (
    <g>
      <path d={`M${g[0]} ${g[1]} L${a[0]} ${a[1]} Q${b[0]} ${b[1]} ${c[0]} ${c[1]} Q${d[0] - 10} ${c[1] + 4} ${d[0]} ${d[1]} L${e[0]} ${e[1]} Z`}
        fill={color} stroke="#0b0b0d" strokeWidth={2.5 * s} strokeLinejoin="round" />
      <path d={`M${a[0] + 20 * s} ${a[1] + 6 * s} Q${c[0]} ${c[1] + 26 * s} ${d[0] - 20 * s} ${d[1] + 4 * s}`} fill="none" stroke="#000" strokeOpacity={0.18} strokeWidth={3 * s} />
    </g>
  );
};

const Exclaim: React.FC<{f: number; cam: Cam; c: CharState}> = ({f, cam, c}) => {
  const st = T.bot.late;
  if (f < st || f > st + 30) return null;
  const k = springy(f, st, 10, 5, 2.4);
  const [x, y] = proj(cam, c.x - 60, 250, c.z);
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`} opacity={1 - prog(f, st + 20, st + 30)}>
      <circle r={30} fill="#ff3b3b" opacity={0.25} filter="url(#soft8)" />
      <text textAnchor="middle" y={20} fontFamily="Montserrat" fontWeight={900} fontSize={64} fill="#ff4646" stroke="#0b0b0d" strokeWidth={3}>!</text>
    </g>
  );
};

const Defs: React.FC = () => (
  <defs>
    <filter id="soft6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
    <filter id="soft8" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" /></filter>
    <filter id="soft20" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="20" /></filter>
    <radialGradient id="pvig" cx="0.5" cy="0.5" r="0.75">
      <stop offset="0.55" stopColor="#000" stopOpacity={0} />
      <stop offset="1" stopColor="#000" stopOpacity={0.55} />
    </radialGradient>
  </defs>
);

const digitsAt = (f: number) => {
  const sec = Math.floor(clamp((f - T.split[0]) / (T.split[1] - T.split[0])) * 300);
  return `06:0${Math.floor(sec / 60)}`;
};

export const TopPanel: React.FC<{f: number}> = ({f}) => {
  const t = T.top;
  const cam = topCam(f);
  const c = topChar(f, cam);
  const ring = f < t.alarmOff ? 0.6 + 0.4 * Math.sin(f * 1.2) : 0;
  const st: AptState = {
    theme: 'day', frame: f, alarmRing: ring, alarmDigits: digitsAt(f),
    doorOpen: prog(f, t.doorOpen, t.doorOpen + 14, easeOut), doorLight: prog(f, t.doorOpen, t.doorOpen + 18),
    showerOn: prog(f, t.shower[0] + 2, t.shower[0] + 6) * (1 - prog(f, t.shower[1] - 4, t.shower[1])),
    steam: prog(f, t.shower[0] + 4, t.shower[0] + 30) * (1 - prog(f, t.walkDoor[0], t.walkDoor[1])),
    lampsOn: prog(f, t.alarmOff + 2, t.alarmOff + 4), stoveOn: prog(f, t.cook[0], t.cook[0] + 6) * (1 - prog(f, t.cook[1] - 4, t.cook[1])),
    windowGlow: 0.6 + 0.4 * prog(f, 45, 400),
  };
  const cover = 1 - prog(f, t.sitUp[0] - 2, t.sitUp[0] + 8, easeOut);
  const shadowW = c.pose.rot > 30 ? 120 : 46;
  const mid = (
    <g>
      {c.y > STAND_Y - 30 && <FloorShadow cam={cam} x={c.x + (c.pose.rot > 30 ? 0 : 0)} z={c.z} w={shadowW} o={0.4 * (c.shadow ?? 1)} />}
      <CharAt cam={cam} c={c} color="#f6f5f1" />
      <Blanket cam={cam} cover={cover * 0.62} color="#cbc5bb" breathe={0} crumple={1 - cover} />
    </g>
  );
  return (
    <svg width={PW} height={PH} viewBox={`0 0 ${PW} ${PH}`} style={{display: 'block'}}>
      <Defs />
      <rect width={PW} height={PH} fill="#000" />
      <Apartment id="top" cam={cam} st={st} mid={mid} over={<>
        <PanAndEgg f={f} cam={cam} />
        {c.armOver && <CharAt cam={cam} c={c} color="#f6f5f1" only="arm" />}
      </>} />
      {/* warm grade + vignette */}
      <rect width={PW} height={PH} fill="#ffb070" opacity={0.06} style={{mixBlendMode: 'soft-light'}} />
      <rect width={PW} height={PH} fill="url(#pvig)" />
      {/* light flood when the door opens */}
      <rect width={PW} height={PH} fill="#fff4e0" opacity={prog(f, t.doorOpen + 4, 404, easeIn) * 0.95} />
    </svg>
  );
};

export const BottomPanel: React.FC<{f: number}> = ({f}) => {
  const b = T.bot;
  const cam = botCam(f);
  const c = botChar(f, cam);
  let ring = 0;
  b.ring.forEach(([a, e]) => {
    if (f >= a && f < e) ring = 0.6 + 0.4 * Math.sin(f * 1.2);
  });
  if (f >= b.late - 2 && f < b.late + 10) ring = 1;
  const late = f >= b.late;
  const st: AptState = {
    theme: 'night', frame: f, alarmRing: ring, alarmDigits: digitsAt(f),
    doorOpen: prog(f, b.doorOpen, b.doorOpen + 12, easeOut), doorLight: prog(f, b.doorOpen, b.doorOpen + 18) * 0.85,
    showerOn: 0, steam: 0, lampsOn: 0, stoveOn: 0, windowGlow: 0.4 + 0.6 * prog(f, 45, 400),
  };
  const snoozing = !late;
  const zOn = snoozing ? 1 - Math.max(...b.ring.map(([a, e]) => prog(f, a - 2, a + 2) * (1 - prog(f, e + 2, e + 10)))) : 0;
  const cover = late ? 1 - prog(f, b.late, b.late + 6, easeOut) : 1;
  const mid = (
    <g>
      {c.y > STAND_Y - 30 && <FloorShadow cam={cam} x={c.x} z={c.z} w={46} o={0.5} />}
      <CharAt cam={cam} c={c} color={GREY} />
      <Blanket cam={cam} cover={cover} color="#2c4486" breathe={snoozing ? (Math.sin(f / 12) + 1) / 2 : 0} crumple={late ? 1 : 0} />
      {c.armOver && <CharAt cam={cam} c={c} color={GREY} only="arm" />}
      <Zzz f={f} cam={cam} on={zOn} />
      <Exclaim f={f} cam={cam} c={c} />
    </g>
  );
  const redPulse = late ? (0.5 + 0.5 * Math.sin(f * 0.5)) * 0.12 * (1 - prog(f, 392, 404)) : 0;
  return (
    <svg width={PW} height={PH} viewBox={`0 0 ${PW} ${PH}`} style={{display: 'block'}}>
      <Defs />
      <rect width={PW} height={PH} fill="#000" />
      <Apartment id="bot" cam={cam} st={st} mid={mid} />
      <rect width={PW} height={PH} fill="#2a4cff" opacity={0.07} style={{mixBlendMode: 'soft-light'}} />
      <rect width={PW} height={PH} fill="url(#pvig)" />
      <rect width={PW} height={PH} fill="#ff1e2e" opacity={redPulse} style={{mixBlendMode: 'screen'}} />
      {late && f < b.late + 3 && <rect width={PW} height={PH} fill="#ff2a3a" opacity={0.25} />}
      <rect width={PW} height={PH} fill="#f3ead8" opacity={prog(f, b.doorOpen + 4, 404, easeIn) * 0.9} />
    </svg>
  );
};

export {R};
