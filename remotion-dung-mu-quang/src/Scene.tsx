import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Cam, FRONT_Z, H, HZ, K, MAX_Z, W, X_E, camera, clamp, lerp, project, range, smooth } from './sim';
import { HEAD_R, HIP, fk } from './skeleton';
import { Fig, awakenK, clothAt, figuresAt, heroFig, pebblesAt } from './world';

const RED = [226, 36, 44];
const grey = (l: number) => {
  const v = Math.round(255 * clamp(l));
  return `rgb(${v},${v},${v})`;
};
const red = (l: number) => `rgb(${RED.map((c) => Math.round(c * clamp(l))).join(',')})`;

// ── geometry helpers ──────────────────────────────────────────
type P2 = { x: number; y: number; s: number };
function toWorld(fig: Fig, lx: number, ly: number, mirror = false): [number, number] {
  // rotate around the hip (pivot), then place in the world
  let px = lx;
  let py = ly;
  if (fig.rot !== 0 || !fig.grounded) {
    const c = Math.cos(fig.rot);
    const s = Math.sin(fig.rot);
    const dx = lx;
    const dy = ly - HIP;
    px = dx * c + dy * s;
    py = HIP + (-dx * s + dy * c) + fig.yFall;
  }
  const X = fig.x + fig.dirScale * px * fig.h;
  const Y = py * fig.h;
  return [X, mirror ? -Y : Y];
}

const ptsToPath = (pts: P2[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');

// ── a single figure ───────────────────────────────────────────
const Figure: React.FC<{ fig: Fig; cam: Cam; f: number; mirror?: boolean; alphaMul?: number; flat?: string }> = ({
  fig, cam, f, mirror = false, alphaMul = 1, flat,
}) => {
  const j = fk(fig.pose, fig.grounded);
  const P = (p: [number, number]): P2 => {
    const [X, Y] = toWorld(fig, p[0], p[1], mirror);
    return project(cam, X, Y, fig.z);
  };
  const hip = P(j.hip);
  const sc = hip.s * fig.h;
  const sw = 0.092 * sc;
  if (sw < 0.4) return null;
  const near = flat ?? grey(fig.lum);
  const far = flat ?? grey(fig.lum * 0.74);
  const headP = P(j.head);
  const r = HEAD_R * sc;
  const line = (pts: P2[], color: string) => (
    <path d={ptsToPath(pts)} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  );

  // blindfold band, built in head-local space so it follows rotation/turning
  let band: React.ReactNode = null;
  if (fig.blind && !flat) {
    const hc = j.head;
    const R = HEAD_R * 1.07;
    const top = 0.3;
    const bot = -0.34;
    const poly: [number, number][] = [];
    const a0 = Math.asin(top);
    const a1 = Math.asin(bot);
    const tilt = -0.08;
    for (let i = 0; i <= 8; i++) {
      const a = lerp(a0, a1, i / 8);
      poly.push([Math.cos(a) * R, Math.sin(a) * R + tilt * Math.cos(a) * R]);
    }
    for (let i = 0; i <= 8; i++) {
      const a = lerp(a1, a0, i / 8);
      poly.push([-Math.cos(a) * R, Math.sin(a) * R - tilt * Math.cos(a) * R]);
    }
    const bandPts = poly.map(([x, y]) => P([hc[0] + x, hc[1] + y]));
    const t = f / 30;
    const tails = [0, 1].map((n) => {
      const pts: P2[] = [];
      for (let i = 0; i < 5; i++) {
        const fl = 0.025 * i * Math.sin(t * 11 + fig.seed + i * 1.1 + n * 1.7);
        pts.push(P([hc[0] - R * 0.95 - i * 0.055, hc[1] + 0.01 - n * 0.03 - i * (0.018 + n * 0.012) + fl]));
      }
      return pts;
    });
    const rc = red(0.35 + 0.65 * fig.lum);
    band = (
      <>
        {tails.map((tp, i) => (
          <path key={i} d={ptsToPath(tp)} stroke={red((0.3 + 0.6 * fig.lum) * (i ? 0.75 : 1))} strokeWidth={sw * 0.55} fill="none" strokeLinecap="round" />
        ))}
        <path d={ptsToPath(bandPts) + 'Z'} fill={rc} />
        {/* specular sheen on the fabric */}
        <path d={ptsToPath(bandPts.slice(1, 6))} stroke="rgba(255,255,255,0.28)" strokeWidth={sw * 0.18} fill="none" strokeLinecap="round" />
      </>
    );
  }

  return (
    <g opacity={fig.alpha * alphaMul}>
      {line([P(j.neck), P(j.elbowF), P(j.handF)], far)}
      {line([hip, P(j.kneeF), P(j.footF)], far)}
      {line([hip, P(j.neck)], near)}
      {line([hip, P(j.kneeN), P(j.footN)], near)}
      <circle cx={headP.x} cy={headP.y} r={r} fill={near} />
      {band}
      {line([P(j.neck), P(j.elbowN), P(j.handN)], near)}
    </g>
  );
};

// ── the stone slab ("gạch 3D") ────────────────────────────────
const jagTop = (z: number) => 0.06 * Math.sin(z * 7.1) + 0.04 * Math.sin(z * 13.3 + 1) - 0.03;
const jagFace = (y: number) => -0.03 + 0.07 * Math.sin(y * 3.1) + 0.05 * Math.sin(y * 7.9 + 2) + 0.025 * y;

const Slab: React.FC<{ cam: Cam; part: 'top' | 'face' }> = ({ cam, part }) => {
  const pr = (x: number, y: number, z: number) => project(cam, x, y, z);
  if (part === 'top') {
    const edge: P2[] = [];
    for (let z = FRONT_Z; z <= 40; z += z < 8 ? 0.25 : 1.5) edge.push(pr(X_E + jagTop(z), 0, z));
    const poly = [pr(-60, 0, FRONT_Z), ...edge, pr(-60, 0, 40)];
    const front = pr(0, 0, FRONT_Z);
    const lines: React.ReactNode[] = [];
    for (let z = FRONT_Z + 1; z < 26; z += 1.0) {
      const a = pr(-60, 0, z);
      const b = pr(X_E + jagTop(z), 0, z);
      lines.push(<line key={`z${z}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeOpacity={0.06 * (1 - z / 26)} strokeWidth={1.2} />);
    }
    for (let x = Math.floor(X_E) - 0.53; x > -30; x -= 1.0) {
      const a = pr(x, 0, FRONT_Z);
      const b = pr(x, 0, 26);
      lines.push(<line key={`x${x}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeOpacity={0.045} strokeWidth={1.2} />);
    }
    const pool = pr(-0.6, 0, 3.5);
    return (
      <g>
        <defs>
          <linearGradient id="floorG" gradientUnits="userSpaceOnUse" x1="0" y1={HZ} x2="0" y2={front.y}>
            <stop offset="0" stopColor="#060606" />
            <stop offset="1" stopColor="#1b1b1c" />
          </linearGradient>
          <clipPath id="floorClip">
            <path d={ptsToPath(poly) + 'Z'} />
          </clipPath>
          <radialGradient id="poolG">
            <stop offset="0" stopColor="#fff" stopOpacity="0.11" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d={ptsToPath(poly) + 'Z'} fill="url(#floorG)" />
        <g clipPath="url(#floorClip)">
          {lines}
          <ellipse cx={pool.x} cy={pool.y} rx={pool.s * 6.5} ry={pool.s * 2.2} fill="url(#poolG)" />
        </g>
        <path d={ptsToPath(edge)} stroke="#fff" strokeOpacity={0.22} strokeWidth={1.6} fill="none" />
      </g>
    );
  }
  // front face
  const right: P2[] = [];
  for (let y = 0; y >= -30; y -= y > -6 ? 0.2 : 1) right.push(pr(X_E + jagTop(FRONT_Z) + jagFace(y), y, FRONT_Z));
  const tl = pr(-60, 0, FRONT_Z);
  const poly = [tl, ...right, pr(-60, -30, FRONT_Z)];
  const top = right[0];
  const s = top.s;
  const bricks: React.ReactNode[] = [];
  for (let n = 1; n < 14; n++) {
    const y = -0.5 * n;
    const a = pr(-60, y, FRONT_Z);
    const b = pr(X_E + 0.3, y, FRONT_Z);
    bricks.push(<line key={`h${n}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeOpacity={0.05 * (1 - n / 14)} strokeWidth={1.2} />);
    for (let x = X_E - (n % 2 ? 0.45 : 0.95); x > -20; x -= 1.0) {
      const c = pr(x, y, FRONT_Z);
      const d = pr(x, y + 0.5, FRONT_Z);
      bricks.push(<line key={`v${n}_${x}`} x1={c.x} y1={c.y} x2={d.x} y2={d.y} stroke="#fff" strokeOpacity={0.04 * (1 - n / 14)} strokeWidth={1.2} />);
    }
  }
  return (
    <g>
      <defs>
        <linearGradient id="faceG" gradientUnits="userSpaceOnUse" x1="0" y1={top.y} x2="0" y2={top.y + s * 7}>
          <stop offset="0" stopColor="#1d1d1e" />
          <stop offset="0.12" stopColor="#111112" />
          <stop offset="1" stopColor="#030303" />
        </linearGradient>
        <linearGradient id="faceSide" gradientUnits="userSpaceOnUse" x1={top.x - s * 2.5} y1="0" x2={top.x} y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </linearGradient>
        <clipPath id="faceClip">
          <path d={ptsToPath(poly) + 'Z'} />
        </clipPath>
      </defs>
      <path d={ptsToPath(poly) + 'Z'} fill="url(#faceG)" />
      <g clipPath="url(#faceClip)">
        {bricks}
        <rect x={top.x - s * 2.5} y={0} width={s * 2.6} height={H} fill="url(#faceSide)" />
      </g>
      {/* rim light on the lip of the slab */}
      <line x1={tl.x} y1={tl.y} x2={top.x} y2={top.y} stroke="#fff" strokeOpacity={0.34} strokeWidth={2} />
      <path d={ptsToPath(right.slice(0, 40))} stroke="#fff" strokeOpacity={0.12} strokeWidth={1.4} fill="none" />
    </g>
  );
};

// ── composition ───────────────────────────────────────────────
export const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camera(f);
  const aw = awakenK(f);
  const figs = figuresAt(f);
  const ghosts1 = figuresAt(f - 1).filter((g) => g.falling > 0.05);
  const ghosts2 = figuresAt(f - 2).filter((g) => g.falling > 0.05);
  const sorted = [...figs].sort((a, b) => b.z - a.z || (a.hero ? 1 : 0) - (b.hero ? 1 : 0));
  const hero = heroFig(f);
  const cloth = clothAt(f);
  const dim = 1 - smooth(range(f, K.dimStart, K.dimEnd));
  const fadeIn = lerp(0.55, 1, smooth(f / 4));
  const heroP = project(cam, hero.x, hero.grounded ? 0 : HIP + hero.yFall, 0);
  const heroHead = project(cam, hero.x, hero.grounded ? 1.7 : HIP + hero.yFall + 0.7, 0);
  const coneA = aw * (1 - smooth(range(f, K.fall + 10, K.fall + 60))) * 0.9;

  const clothNode = (glow: boolean) => {
    if (!cloth) return null;
    const pts = cloth.pts.map(([x, y, z]) => project(cam, x, y, z));
    const sw = 0.055 * pts[0].s;
    return (
      <g>
        {glow && <path d={ptsToPath(pts)} stroke="#ff2a35" strokeOpacity={0.55} strokeWidth={sw * 3.4} fill="none" strokeLinecap="round" filter="url(#blurM)" />}
        <path d={ptsToPath(pts)} stroke={red(1)} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={ptsToPath(pts.slice(1, -1))} stroke="rgba(255,255,255,0.25)" strokeWidth={sw * 0.22} fill="none" strokeLinecap="round" />
      </g>
    );
  };

  const fallersEcho = (list: Fig[], a: number) =>
    list.map((g) => <Figure key={`e${a}${g.id}`} fig={g} cam={cam} f={f} alphaMul={a} />);

  const clothSpot = cloth && cloth.grounded ? project(cam, cloth.pts[4][0], 0, cloth.pts[4][2]) : null;
  const endSpot = smooth(range(f, K.dimStart + 10, K.dimEnd)) * (1 - smooth(range(f, K.dimEnd, K.dimEnd + 16)));

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <radialGradient id="bgG" cx="0.5" cy="0.36" r="0.75">
          <stop offset="0" stopColor="#101012" />
          <stop offset="0.6" stopColor="#040404" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <linearGradient id="abyssG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.45" stopColor="#1c1c22" stopOpacity="0" />
          <stop offset="1" stopColor="#1c1c22" stopOpacity="0.45" />
        </linearGradient>
        <radialGradient id="vig" cx="0.5" cy="0.48" r="0.72">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.85" />
        </radialGradient>
        <linearGradient id="coneG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.0" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0.07" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.16" />
        </linearGradient>
        <radialGradient id="spotG">
          <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id="blurL" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
        <filter id="blurM" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={f % 97} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>

      <rect width={W} height={H} fill="url(#bgG)" />

      <g opacity={dim * fadeIn}>
        <Slab cam={cam} part="top" />
        {/* reflections on the polished stone */}
        <g opacity={0.1}>
          {sorted.filter((g) => g.grounded && g.z < 7).map((g) => (
            <Figure key={`r${g.id}`} fig={g} cam={cam} f={f} mirror />
          ))}
        </g>
        {/* light pool under the awakened one */}
        {hero.grounded && aw > 0 && (
          <ellipse cx={heroP.x} cy={heroP.y} rx={heroP.s * 1.3} ry={heroP.s * 0.32} fill="url(#spotG)" opacity={coneA} />
        )}
        {cloth && cloth.grounded && clothNode(false)}

        {fallersEcho(ghosts2, 0.1)}
        {fallersEcho(ghosts1, 0.22)}
        {sorted.map((g) => {
          if (!g.hero) return <Figure key={g.id} fig={g} cam={cam} f={f} />;
          const glow = aw * (g.grounded ? 1 : 1.2);
          return (
            <g key="hero">
              {glow > 0 && (
                <g filter="url(#blurM)" opacity={0.75 * glow}>
                  <Figure fig={g} cam={cam} f={f} flat="#ffffff" />
                </g>
              )}
              <Figure fig={{ ...g, lum: lerp(0.95, 1.0, aw) }} cam={cam} f={f} />
            </g>
          );
        })}
        {pebblesAt(f).map((p, i) => {
          const q = project(cam, p.x, p.y, p.z);
          const s = p.size * q.s;
          return <rect key={`p${i}`} x={q.x - s / 2} y={q.y - s / 2} width={s} height={s} fill="#9a9a9a" opacity={p.a} transform={`rotate(${i * 37 + f * 9} ${q.x} ${q.y})`} />;
        })}
        {/* depth haze rising from the abyss */}
        <rect x={0} y={0} width={W} height={H} fill="url(#abyssG)" />
        <Slab cam={cam} part="face" />
        {cloth && !cloth.grounded && clothNode(true)}
      </g>

      {/* volumetric light shaft once he sees */}
      {coneA > 0.01 && (
        <polygon
          points={`${heroHead.x - 30},0 ${heroHead.x + 30},0 ${heroP.x + heroP.s * 1.1},${heroP.y} ${heroP.x - heroP.s * 1.1},${heroP.y}`}
          fill="url(#coneG)"
          filter="url(#blurL)"
          opacity={coneA * dim}
          style={{ mixBlendMode: 'screen' }}
        />
      )}

      {/* the abandoned blindfold stays lit as the world goes dark */}
      {clothSpot && endSpot > 0 && (
        <g>
          <ellipse cx={clothSpot.x} cy={clothSpot.y} rx={clothSpot.s * 1.1} ry={clothSpot.s * 0.3} fill="url(#spotG)" opacity={endSpot} />
          <g opacity={endSpot}>{clothNode(true)}</g>
        </g>
      )}

      <rect width={W} height={H} fill="url(#vig)" />
      <rect width={W} height={H} filter="url(#grain)" opacity={0.06} style={{ mixBlendMode: 'overlay' }} />
      {/* flash of clarity at the moment of awakening */}
      <rect width={W} height={H} fill="#fff" opacity={0.1 * Math.exp(-Math.max(0, f - K.awaken) / 3) * (f >= K.awaken ? 1 : 0)} />
    </svg>
  );
};

export { MAX_Z };
