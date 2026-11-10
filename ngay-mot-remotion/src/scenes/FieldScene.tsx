import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Caption, FONT, SharedDefs} from '../components/common';
import {Figure, FigureDefs, mix, P, Pose, POSES, walk, walkBob} from '../components/Figure';
import {clamp, drift, EASE, keys, lerp, prog, rand, shake, spr} from '../lib/anim';

/**
 * Scene 3+4 (local 0–390): missing again and again is NOT failure.
 * Walking away from the ball IS.
 */
const GY = 1180; // figure ground line
const KX = 250; // kicking spot
const BALL0 = {x: KX + 58, y: GY - 12};

type Seg = {at: number; dur: number; p0: [number, number]; c: [number, number]; p1: [number, number]; ease?: (t: number) => number};

export const KICKS = [40, 96, 142, 158, 172, 185, 197, 208, 218];

// rest spots for montage balls (scattered around the goal mouth)
const REST: Array<[number, number]> = [
  [700, 1196],
  [0, 0], // ball 2 leaves frame
  [790, 1214],
  [905, 1150],
  [744, 1160],
  [0, 0],
  [838, 1226],
  [960, 1188],
  [672, 1172],
];

const ballPath = (i: number): Seg[] => {
  const K = KICKS[i];
  if (i === 0) {
    // smashes the crossbar, ricochets back
    return [
      {at: K, dur: 15, p0: [BALL0.x, BALL0.y], c: [560, 900], p1: [846, 1032], ease: EASE.linear},
      {at: K + 15, dur: 18, p0: [846, 1032], c: [790, 930], p1: [730, 1194], ease: EASE.linear},
      {at: K + 33, dur: 30, p0: [730, 1194], c: [715, 1182], p1: REST[0], ease: EASE.out},
    ];
  }
  if (i === 1 || i === 5) {
    // sails over the bar and out of frame
    return [{at: K, dur: 22, p0: [BALL0.x, BALL0.y], c: [620, 760], p1: [1180, 820], ease: EASE.linear}];
  }
  const r = REST[i];
  const hitPost = i % 2 === 0;
  const mid: [number, number] = hitPost ? [842 + rand(i) * 30, 1080 + rand(i + 3) * 60] : [r[0] + 40, r[1] - 160];
  return [
    {at: K, dur: 12, p0: [BALL0.x, BALL0.y], c: [520 + rand(i) * 80, 880 + rand(i * 2) * 60], p1: mid, ease: EASE.linear},
    {at: K + 12, dur: 16, p0: mid, c: [(mid[0] + r[0]) / 2, Math.min(mid[1], r[1]) - 70], p1: r, ease: EASE.out},
  ];
};

const qb = (s: Seg, t: number): [number, number] => {
  const u = 1 - t;
  return [u * u * s.p0[0] + 2 * u * t * s.c[0] + t * t * s.p1[0], u * u * s.p0[1] + 2 * u * t * s.c[1] + t * t * s.p1[1]];
};

const ballAt = (i: number, f: number): {x: number; y: number; vis: boolean; spin: number} | null => {
  const K = KICKS[i];
  if (f < K - 14) return null;
  const segs = ballPath(i);
  if (f < K) return {x: BALL0.x, y: BALL0.y, vis: true, spin: 0};
  const last = segs[segs.length - 1];
  if (f >= last.at + last.dur) {
    if (last.p1[0] > 1100) return null;
    return {x: last.p1[0], y: last.p1[1], vis: true, spin: (last.at + last.dur - K) * 30};
  }
  for (const s of segs) {
    if (f < s.at + s.dur) {
      const t = (s.ease ?? EASE.linear)(clamp((f - s.at) / s.dur));
      const [x, y] = qb(s, t);
      return {x, y, vis: true, spin: (f - K) * 30};
    }
  }
  return null;
};

const Ball: React.FC<{x: number; y: number; spin: number; o?: number; r?: number}> = ({x, y, spin, o = 1, r = 14}) => (
  <g transform={`translate(${x},${y}) rotate(${spin})`} opacity={o}>
    <circle r={r} fill="url(#ballGrad)" />
    <polygon points="0,-5 4.8,-1.5 3,4 -3,4 -4.8,-1.5" fill="#1a1d24" />
    <path d={`M0,-5 L0,${-r} M4.8,-1.5 L${r * 0.95},-4 M3,4 L${r * 0.6},${r * 0.8} M-3,4 L${-r * 0.6},${r * 0.8} M-4.8,-1.5 L${-r * 0.95},-4`} stroke="#1a1d24" strokeWidth={1.6} />
  </g>
);

const Goal: React.FC<{dim: number}> = ({dim}) => {
  // 2.5D goal seen from the side: near post, far post, crossbar, receding net
  const nb = [846, 1222];
  const fb = [902, 1150];
  const hgt = 190;
  const back = 96;
  const lines: React.ReactNode[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    lines.push(<line key={'v' + i} x1={nb[0] + back * t} y1={nb[1] - hgt + 30 * t} x2={nb[0] + back * t} y2={nb[1]} />);
    lines.push(<line key={'w' + i} x1={fb[0] + back * t} y1={fb[1] - hgt + 30 * t} x2={fb[0] + back * t} y2={fb[1]} />);
  }
  for (let j = 0; j <= 7; j++) {
    const t = j / 7;
    lines.push(<line key={'h' + j} x1={nb[0]} y1={nb[1] - hgt * (1 - t)} x2={nb[0] + back} y2={nb[1] - (hgt - 30) * (1 - t)} />);
    lines.push(<line key={'d' + j} x1={nb[0] + back} y1={nb[1] - (hgt - 30) * (1 - t)} x2={fb[0] + back} y2={fb[1] - (hgt - 30) * (1 - t)} />);
  }
  return (
    <g opacity={1 - dim * 0.5}>
      <g stroke="#ffffff" strokeOpacity={0.32} strokeWidth={1.6}>
        {lines}
      </g>
      {/* frame */}
      <g stroke="#ffffff" strokeWidth={9} strokeLinecap="round" fill="none">
        <line x1={fb[0]} y1={fb[1]} x2={fb[0]} y2={fb[1] - hgt} stroke="#c9cfda" />
        <line x1={nb[0]} y1={nb[1] - hgt} x2={fb[0]} y2={fb[1] - hgt} />
        <line x1={nb[0]} y1={nb[1]} x2={nb[0]} y2={nb[1] - hgt} />
      </g>
    </g>
  );
};

export const FieldScene: React.FC = () => {
  const f = useCurrentFrame();
  const dim = prog(f, 300, 392, EASE.inOut); // the light leaves with him

  // ---------- figure ----------
  let x = KX;
  let pose: Pose = POSES.stand;
  let bob = 0;
  let flip = false;
  let sx = 1;
  let kicking = false;
  for (const K of KICKS) {
    if (f >= K - 16 && f < K + 14) {
      kicking = true;
      const run = prog(f, K - 16, K - 4, EASE.inOut);
      x = KX - 34 + 34 * run;
      if (f < K - 5) {
        pose = walk((f - K) / 11, 1.1);
        bob = walkBob((f - K) / 11);
      } else if (f < K) {
        pose = mix(POSES.stand, POSES.kickBack, prog(f, K - 5, K - 1, EASE.out));
      } else {
        const hit = prog(f, K, K + 3, EASE.out);
        const rec = prog(f, K + 4, K + 14, EASE.inOut);
        pose = mix(mix(POSES.kickBack, POSES.kickHit, hit), POSES.stand, rec);
        bob = -6 * Math.sin(prog(f, K, K + 8) * Math.PI);
      }
    }
  }
  if (!kicking && f >= KICKS[0] - 16) x = KX;
  // tired: hands on knees, heavy breathing
  const tired = prog(f, 232, 246, EASE.out) * (1 - prog(f, 284, 298, EASE.inOut));
  if (f >= 232 && f < 298) {
    const breathe = Math.sin((f - 232) / 5.5) * 0.08;
    pose = mix(POSES.stand, {...POSES.handsOnKnees, lean: POSES.handsOnKnees.lean + breathe * 40}, tired);
  }
  // stands up, doubt (?) → looks down at the ball → turns away
  if (f >= 298 && f < 336) {
    const look = prog(f, 300, 312);
    const down = prog(f, 318, 330);
    pose = P({head: lerp(lerp(0, -6, look), 26, down), lean: lerp(0, 4, down), aF: 4, aB: -4});
  }
  if (f >= 336) {
    const turn = prog(f, 336, 344, EASE.inOut);
    sx = Math.cos(turn * Math.PI);
    flip = false;
    const walkAway = prog(f, 344, 410, EASE.in);
    x = KX - 340 * walkAway;
    const ph = (f - 344) / 17;
    pose = f >= 344 ? walk(ph, 0.85, P({lean: 8, head: 22, aF: 2, aB: -2})) : P({head: 20, lean: 6});
    bob = f >= 344 ? walkBob(ph, 0.8) : 0;
  }

  // ---------- camera ----------
  const s = keys(f, [
    [0, 1.5],
    [40, 1.38],
    [130, 1.24],
    [228, 1.36],
    [298, 1.6],
    [336, 1.6],
    [420, 1.32],
  ], EASE.cam);
  const cx = keys(f, [
    [0, 470],
    [40, 540],
    [130, 575],
    [228, 520],
    [298, 330],
    [336, 330],
    [420, 360],
  ], EASE.cam);
  const cy = 1130;
  const sk1 = shake(f, KICKS[0] + 15, 9, 16);
  const d = drift(f, 2.5);
  const camT = `translate(${540 + sk1.x + d.x}, ${960 + sk1.y + d.y}) rotate(-3) scale(${s}) translate(${-cx}, ${-cy})`;

  // current ball for montage flash (new ball appears at the feet)
  const qmark = spr(f, 302, {damping: 8, stiffness: 200}) * (1 - prog(f, 330, 338));

  const grassTop = `rgb(${lerp(126, 40, dim)},${lerp(186, 58, dim)},${lerp(54, 52, dim)})`;
  const grassBot = `rgb(${lerp(64, 16, dim)},${lerp(110, 26, dim)},${lerp(28, 30, dim)})`;

  return (
    <AbsoluteFill style={{background: '#000'}}>
      {/* stadium light spill */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 30% at 50% 58%, rgba(150,220,120,${0.16 * (1 - dim)}), rgba(0,0,0,0) 70%)`,
        }}
      />
      <AbsoluteFill>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920">
          <defs>
            <FigureDefs />
            <SharedDefs />
            <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={grassTop} />
              <stop offset="1" stopColor={grassBot} />
            </linearGradient>
            <radialGradient id="ballGrad" cx="0.35" cy="0.3" r="0.8">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#b9c0cc" />
            </radialGradient>
            <linearGradient id="grassEdge" x1="0" x2="1">
              <stop offset="0" stopColor="#000" stopOpacity="1" />
              <stop offset="0.12" stopColor="#000" stopOpacity="0" />
              <stop offset="0.88" stopColor="#000" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="1" />
            </linearGradient>
          </defs>
          <g transform={camT}>
          {/* pitch: perspective slab with mowing stripes */}
          <polygon points="-300,1110 1400,1110 1400,1262 -300,1262" fill="url(#grass)" />
          {new Array(14).fill(0).map((_, i) => (
            <polygon
              key={i}
              points={`${-300 + i * 130},1110 ${-300 + i * 130 + 65},1110 ${-300 + i * 130 + 40},1262 ${-300 + i * 130 - 25},1262`}
              fill="#ffffff"
              opacity={0.045 * (1 - dim)}
            />
          ))}
          {/* grass blades on the far edge */}
          <path
            d={new Array(120)
              .fill(0)
              .map((_, i) => {
                const gx = -300 + i * 14.2;
                return `M${gx},1111 L${gx + 3},${1100 - rand(i) * 9} L${gx + 7},1111`;
              })
              .join(' ')}
            fill={grassTop}
          />
          <polygon points="-300,1262 1400,1262 1400,1290 -300,1290" fill="#000" opacity={0.6} />
          <rect x={-300} y={1100} width={1700} height={200} fill="url(#grassEdge)" />
          {/* chalk line */}
          <line x1={-300} y1={1140} x2={1400} y2={1140} stroke="#fff" strokeOpacity={0.18 * (1 - dim)} strokeWidth={3} />

          <Goal dim={dim} />

          {/* balls + motion trails */}
          {KICKS.map((K, i) => {
            const b = ballAt(i, f);
            if (!b) return null;
            const trail = [] as React.ReactNode[];
            if (f >= K && f < K + 24) {
              for (let k = 1; k <= 5; k++) {
                const pb = ballAt(i, f - k * 1.5);
                if (pb && f - k * 1.5 >= K) trail.push(<Ball key={k} x={pb.x} y={pb.y} spin={pb.spin} o={0.28 - k * 0.05} />);
              }
            }
            // a new ball materialises at the feet before each montage kick
            const appear = i >= 2 ? prog(f, K - 14, K - 8, EASE.out) : 1;
            return (
              <g key={i}>
                {trail}
                <ellipse cx={b.x} cy={Math.max(b.y, 1150) + 14} rx={12} ry={3} fill="#000" opacity={0.35 * clamp(1 - (1150 - b.y) / 200)} />
                <Ball x={b.x} y={b.y} spin={b.spin} o={appear * (1 - dim * 0.55)} />
              </g>
            );
          })}
          {/* the final, untaken ball */}
          {f >= 290 && <Ball x={BALL0.x} y={BALL0.y} spin={0} o={prog(f, 290, 300) * (1 - dim * 0.4)} />}

          {/* impact flash on the crossbar */}
          {f >= KICKS[0] + 15 && f < KICKS[0] + 24 && (
            <circle cx={846} cy={1032} r={20 + (f - KICKS[0] - 15) * 9} fill="none" stroke="#fff" strokeWidth={4} opacity={1 - (f - KICKS[0] - 15) / 9} />
          )}

          <Figure x={x} y={GY} pose={pose} bob={bob} flip={flip} sx={sx} scale={0.9} opacity={1 - prog(f, 396, 418) * 0.7} />

          {/* sweat + breath */}
          {f >= 240 && f < 296 && (
            <g opacity={Math.sin(((f - 240) / 56) * Math.PI)}>
              <path d={`M${KX + 70},${GY - 150 + ((f - 240) % 28)} q6,10 0,14 q-6,-4 0,-14`} fill="#9fd4ff" />
            </g>
          )}
          {qmark > 0.01 && (
            <text
              x={KX + 18}
              y={GY - 250 - qmark * 10}
              fontFamily={FONT}
              fontWeight={800}
              fontSize={64 * qmark}
              fill="#ffffff"
              textAnchor="middle"
              opacity={clamp(qmark)}
            >
              ?
            </text>
          )}
          </g>
        </svg>
      </AbsoluteFill>
      {/* cold wash when he leaves */}
      <AbsoluteFill style={{background: 'rgba(10,20,45,1)', mixBlendMode: 'multiply', opacity: dim * 0.5}} />

      <Caption
        words={[{t: 'Sút'}, {t: 'trượt'}, {t: 'nhiều', w: 400}, {t: 'lần…', w: 400}]}
        at={64}
        out={150}
        y={560}
        size={56}
      />
      <Caption
        words={[{t: 'Đây'}, {t: 'KHÔNG', c: '#9be36b', w: 800}, {t: 'phải'}, {t: 'thất', br: false}, {t: 'bại.'}]}
        at={170}
        out={296}
        y={560}
        size={62}
      />
      <Caption
        words={[{t: 'Bỏ', w: 400}, {t: 'đi', w: 400}, {t: 'mới', w: 400}, {t: 'là', w: 400}]}
        at={344}
        y={540}
        size={48}
        stagger={5}
      />
      <Caption words={[{t: 'THẤT', c: '#ff4b4b', w: 800}, {t: 'BẠI.', c: '#ff4b4b', w: 800}]} at={364} y={600} size={96} stagger={4} />
    </AbsoluteFill>
  );
};
