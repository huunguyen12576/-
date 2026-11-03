// Builds the full list of figures (with poses) for any frame.
import {
  AHEAD_BASE, EDGE, FOLLOWERS, G, K, LANE_Z, MAX_Z, NF, V, WALKERS, X_E, XEDGE,
  clamp, crowdPhase, ease, easeOut, followerX, heroX, lerp, range, shoveImpulse, smooth, tau,
} from './sim';
import {
  BRACE, HIP, PULLED, Pose, REACH, RECOIL, SEE, SHOCK, STAND, STOP, TEETER, fk, flail, mix, push, walk,
} from './skeleton';

export type Fig = {
  id: string;
  x: number;
  z: number;
  pose: Pose;
  dirScale: number; // 1 facing the cliff, -1 facing the crowd
  rot: number; // body rotation around the hip (+ = forward tumble)
  yFall: number;
  grounded: boolean;
  lum: number; // 0..1 brightness (fog)
  blind: boolean;
  hero: boolean;
  alpha: number;
  h: number;
  seed: number;
  falling: number; // seconds since stepping off (−1 = not falling)
};

export const awakenK = (f: number) => smooth((f - (K.awaken - 2)) / 14);
export const laneLum = (z: number) => lerp(0.9, 0.17, Math.pow(clamp(z / MAX_Z), 0.7));

function fallState(t: number, seed: number, from: Pose) {
  const a = 4.5 + (seed % 3);
  const rot = 0.9 * t + 0.5 * a * t * t * 0.45;
  return {
    yFall: -0.5 * G * t * t,
    rot,
    pose: mix(from, flail(t, seed), smooth(t / 0.32)),
    alpha: 1 - smooth((t - 1.1) / 1.4),
  };
}

// ── the hero ──────────────────────────────────────────────────
export function heroFig(f: number): Fig {
  const ph = crowdPhase(f);
  let pose: Pose;
  let dirScale = 1;
  if (f >= K.turn) dirScale = f >= K.turned ? -1 : Math.cos(Math.PI * ease(range(f, K.turn, K.turned)));
  const imp = shoveImpulse(f);
  if (f < K.heroStop) pose = walk(ph, 1);
  else if (f < K.heroStopped) {
    const u = range(f, K.heroStop, K.heroStopped);
    pose = mix(walk(ph, 1 - u * 0.6), STAND, easeOut(u));
  } else if (f < K.reach) pose = STAND;
  else if (f < K.pull) pose = mix(STAND, REACH, ease(range(f, K.reach, K.pull - 2)));
  else if (f < K.awaken) pose = mix(REACH, PULLED, ease(range(f, K.pull, K.awaken)));
  else if (f < K.shock) pose = mix(PULLED, SEE, ease(range(f, K.awaken + 2, K.awaken + 16)));
  else if (f < K.turn) {
    const p = mix(SEE, SHOCK, easeOut(range(f, K.shock, K.shock + 10)));
    p.lean += 0.02 * Math.sin(f * 0.5); // breathing / trembling
    pose = p;
  } else if (f < K.contact) {
    const p = mix(SHOCK, STOP, ease(range(f, K.turn, K.turned + 4)));
    p.shN += 0.06 * Math.sin(f * 0.9) * range(f, K.turned, K.turned + 6);
    pose = p;
  } else if (f < K.edge) {
    const b = mix(STOP, BRACE, easeOut(range(f, K.contact, K.contact + 8)));
    const strain = 0.04 * Math.sin(f * 1.7);
    b.lean += strain;
    pose = mix(b, RECOIL, imp * 0.9);
    // the rear foot slides back with each shove
    pose.hipF -= 0.12 * imp;
  } else if (f < K.fall) {
    const u = range(f, K.edge, K.fall);
    const spin = (tau(f) - tau(K.edge)) * 11;
    const p = mix(mix(BRACE, RECOIL, 0.5), TEETER, easeOut(u * 1.6));
    p.lean = lerp(0.0, -0.62, easeOut(u));
    p.shN = 2.2 + spin;
    p.shF = 2.2 + spin + Math.PI * 0.9;
    pose = p;
  } else {
    const t = tau(f) - tau(K.fall);
    const spin = (tau(K.fall) - tau(K.edge)) * 11;
    const tp = { ...TEETER, lean: -0.62, shN: 2.2 + spin, shF: 2.2 + spin + Math.PI * 0.9 };
    return {
      id: 'hero',
      x: XEDGE + 0.35 * t + 0.05,
      z: 0,
      pose: mix(tp, flail(t * 0.9, 3.3), smooth(t / 0.45)),
      dirScale: -1,
      rot: -(0.2 + 1.4 * t + 0.9 * t * t),
      yFall: -0.5 * G * t * t,
      grounded: false,
      lum: 1,
      blind: false,
      hero: true,
      alpha: 1 - smooth((t - 1.6) / 1.2),
      h: 1,
      seed: 3.3,
      falling: t,
    };
  }
  return {
    id: 'hero', x: heroX(f), z: 0, pose, dirScale, rot: 0, yFall: 0, grounded: true,
    lum: 0.95, blind: f < K.pull, hero: true, alpha: 1, h: 1, seed: 1, falling: -1,
  };
}

/** Hero's near hand in world coordinates (used to carry the blindfold). */
export function heroHand(f: number): [number, number, number] {
  const hf = heroFig(f);
  const j = fk(hf.pose, true);
  return [hf.x + hf.dirScale * j.handN[0], j.handN[1], 0];
}

// ── everyone ──────────────────────────────────────────────────
export function figuresAt(f: number): Fig[] {
  const out: Fig[] = [];
  const tf = tau(f);
  const ph = crowdPhase(f);
  const aw = awakenK(f);

  // background lanes
  for (const w of WALKERS) {
    const x = w.base + V * tf;
    const tc = (EDGE - w.base) / V;
    const lum = laneLum(w.z) * lerp(1, 0.72, aw * (1 - smooth((f - 470) / 40)));
    const wp = walk(ph + w.jit, 1);
    if (tf < tc) {
      if (x < -16) continue;
      out.push({ id: `w${w.seed}`, x, z: w.z, pose: wp, dirScale: 1, rot: 0, yFall: 0, grounded: true, lum, blind: true, hero: false, alpha: 1, h: w.h, seed: w.seed, falling: -1 });
    } else {
      const t = tf - tc;
      if (t > 2.6) continue;
      const fs = fallState(t, w.seed, walk(crowdPhase(f) + w.jit, 1));
      out.push({ id: `w${w.seed}`, x: EDGE + V * 0.85 * t, z: w.z, pose: fs.pose, dirScale: 1, rot: fs.rot, yFall: fs.yFall, grounded: false, lum, blind: true, hero: false, alpha: fs.alpha, h: w.h, seed: w.seed, falling: t });
    }
  }

  // front lane — ahead of the hero
  AHEAD_BASE.forEach((base, k) => {
    const x = base + V * tf;
    const tc = (EDGE - base) / V;
    const lum = lerp(0.95, 0.8, aw);
    if (tf < tc) {
      out.push({ id: `a${k}`, x, z: 0, pose: walk(ph, 1), dirScale: 1, rot: 0, yFall: 0, grounded: true, lum, blind: true, hero: false, alpha: 1, h: 1, seed: k * 13.1, falling: -1 });
    } else {
      const t = tf - tc;
      if (t > 2.6) return;
      const fs = fallState(t, k * 13.1, walk(ph, 1));
      out.push({ id: `a${k}`, x: EDGE + V * 0.85 * t, z: 0, pose: fs.pose, dirScale: 1, rot: fs.rot, yFall: fs.yFall, grounded: false, lum, blind: true, hero: false, alpha: fs.alpha, h: 1, seed: k * 13.1, falling: t });
    }
  });

  // front lane — followers who end up pushing
  const imp = shoveImpulse(f);
  for (let k = 0; k < NF; k++) {
    const tr = FOLLOWERS[k];
    const pushW = tr.contact === Infinity ? 0 : smooth((f - tr.contact + 4) / 8);
    const base = mix(walk(ph, 1), push(ph, imp), pushW);
    const lum = lerp(0.95, 0.8, aw);
    if (f < tr.fc) {
      const x = followerX(k, f);
      if (x < -16) continue;
      out.push({ id: `f${k}`, x, z: 0, pose: base, dirScale: 1, rot: 0, yFall: 0, grounded: true, lum, blind: true, hero: false, alpha: 1, h: 1, seed: k * 7.7, falling: -1 });
    } else {
      const t = tf - tau(tr.fc);
      if (t > 2.6) continue;
      const fs = fallState(t, k * 7.7, base);
      out.push({ id: `f${k}`, x: followerX(k, tr.fc) + V * 0.85 * t, z: 0, pose: fs.pose, dirScale: 1, rot: fs.rot, yFall: fs.yFall, grounded: false, lum, blind: true, hero: false, alpha: fs.alpha, h: 1, seed: k * 7.7, falling: t });
    }
  }

  out.push(heroFig(f));
  return out;
}

// ── the red blindfold once it leaves the head ─────────────────
export type Cloth = { pts: [number, number, number][]; grounded: boolean } | null;
const LAND_Z = -0.12;
export function clothAt(f: number): Cloth {
  if (f < K.pull) return null;
  const N = 9;
  if (f < K.awaken) {
    const hd = heroHand(f);
    const pts: [number, number, number][] = [];
    for (let i = 0; i < N; i++) {
      const sway = 0.025 * Math.sin(f * 0.45 + i * 0.7) * (i / N);
      pts.push([hd[0] - 0.02 * i + sway, hd[1] - 0.06 * i, 0.02]);
    }
    return { pts, grounded: false };
  }
  const h0 = heroHand(K.awaken);
  const t = tau(f) - tau(K.awaken);
  // drag-limited fall
  const vy = 1.15;
  const yC = Math.max(0.02, h0[1] - 0.25 - (vy * t + 0.35 * t * t));
  const tLand = (() => {
    // solve h0-0.25 - (vy t + .35t²) = 0.02
    const c = h0[1] - 0.27;
    return (-vy + Math.sqrt(vy * vy + 4 * 0.35 * c)) / (2 * 0.35);
  })();
  const tt = Math.min(t, tLand);
  const xC = h0[0] + 0.32 * tt + 0.05 * Math.sin(tt * 7);
  const zC = lerp(0.02, LAND_Z, clamp(tt / tLand));
  const land = smooth((t - tLand + 0.08) / 0.16);
  const ang = 1.35 + 0.9 * tt + 0.35 * Math.sin(tt * 6);
  const pts: [number, number, number][] = [];
  for (let i = 0; i < N; i++) {
    const s = (i - (N - 1) / 2) * 0.065;
    const wv = 0.04 * Math.sin(i * 1.3 + tt * 13);
    const ax = xC + Math.cos(ang) * s - Math.sin(ang) * wv;
    const ay = yC + Math.sin(ang) * s + Math.cos(ang) * wv;
    const gx = xC + (i - (N - 1) / 2) * 0.062 + 0.02 * Math.sin(i * 2.1);
    const gz = zC + 0.07 * Math.sin(i * 1.15 + 0.6);
    pts.push([lerp(ax, gx, land), lerp(Math.max(0.012, ay), 0.012, land), lerp(zC, gz, land)]);
  }
  return { pts, grounded: land > 0.5 };
}

// ── edge debris (pebbles crumbling under the hero's heels + fallers) ──
export type Pebble = { x: number; y: number; z: number; size: number; a: number };
const PEBBLES = (() => {
  const out: { t0: number; x: number; z: number; vx: number; vy: number; s: number }[] = [];
  let s = 99;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 34; i++) {
    out.push({ t0: tau(K.edge + 4 + r() * 30), x: X_E - 0.02 + r() * 0.06, z: (r() - 0.5) * 0.5, vx: 0.1 + r() * 0.5, vy: r() * 0.4, s: 0.012 + r() * 0.03 });
  }
  return out;
})();
export function pebblesAt(f: number): Pebble[] {
  const tf = tau(f);
  const out: Pebble[] = [];
  for (const p of PEBBLES) {
    const t = tf - p.t0;
    if (t < 0 || t > 2.2) continue;
    out.push({ x: p.x + p.vx * t, y: p.vy * t - 0.5 * G * t * t, z: p.z, size: p.s, a: 1 - smooth((t - 1) / 1.2) });
  }
  // a few crumbs for every front-lane figure that steps off
  const fronts = [...AHEAD_BASE.map((b) => (EDGE - b) / V), ...FOLLOWERS.map((fl) => (fl.fc === Infinity ? 1e9 : tau(fl.fc)))];
  fronts.forEach((tc, k) => {
    const t = tf - tc;
    if (t < 0 || t > 1.6) return;
    for (let i = 0; i < 5; i++) {
      const q = Math.sin(k * 91.7 + i * 12.9) * 0.5 + 0.5;
      out.push({ x: X_E + 0.01 + q * 0.2 * t, y: q * 0.2 * t - 0.5 * G * t * t, z: (q - 0.5) * 0.3, size: 0.012 + q * 0.02, a: 1 - smooth((t - 0.6) / 1) });
    }
  });
  return out;
}

export { HIP, fk, easeOut };
