import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Caption, SharedDefs} from '../components/common';
import {Figure, FigureDefs, mix, P, POSES} from '../components/Figure';
import {clamp, drift, EASE, lerp, prog, rand} from '../lib/anim';

/**
 * Scene 5 (local 0–270): "Khi bạn muốn bỏ cuộc…"
 * Close on an exhausted figure on a steep ledge → epic pull-out reveals the whole
 * mountain, a glowing trail of every step already taken, and the summit just above.
 */
type Pt = [number, number];
// main ridge, from far left, over the summit, down to bottom-right
const RIDGE: Pt[] = [
  [-200, 1130],
  [40, 820],
  [170, 640],
  [250, 560], // summit
  [318, 598],
  [372, 672],
  [400, 700], // ledge start
  [446, 706], // ledge end (figure)
  [492, 748],
  [560, 818],
  [612, 905],
  [690, 990],
  [760, 1050],
  [840, 1160],
  [930, 1270],
  [1010, 1400],
  [1090, 1520],
  [1200, 1700],
  [1300, 1900],
];
const FIG: Pt = [424, 703];

const smooth = (pts: Pt[]) => {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
};
const RIDGE_D = smooth(RIDGE);
const BODY_D = RIDGE_D + ' L1400,2400 L-400,2400 Z';

// trail points: walk the ridge polyline from the bottom up to the figure
const TRAIL: Pt[] = (() => {
  const idx = RIDGE.findIndex((p) => p[0] === 446);
  const path = RIDGE.slice(idx).reverse(); // bottom → ledge
  path[path.length - 1] = FIG;
  const out: Pt[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(len / 17));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 5]);
    }
  }
  return out.filter((p) => p[1] < 1960);
})();

const FACETS = [
  'M300,620 C330,760 300,900 360,1060 C330,900 360,760 330,640 Z',
  'M470,760 C520,900 480,1050 560,1240 C520,1050 540,900 500,780 Z',
  'M640,950 C690,1080 650,1220 720,1420 C690,1220 700,1080 670,960 Z',
  'M820,1150 C860,1260 830,1400 900,1600 C870,1400 880,1260 850,1160 Z',
  'M120,760 C150,920 110,1060 180,1260 C150,1060 170,920 150,780 Z',
  'M210,680 C260,860 230,1080 300,1340 C270,1080 290,860 240,700 Z',
  'M560,860 C600,1000 580,1180 640,1420 C620,1180 620,1000 590,880 Z',
];

const Cloud: React.FC<{x: number; y: number; s: number; o: number; c?: string}> = ({x, y, s, o, c = '#3f5fae'}) => (
  <g transform={`translate(${x},${y}) scale(${s})`} opacity={o} fill={c}>
    <circle cx={-60} cy={10} r={42} />
    <circle cx={0} cy={-14} r={60} />
    <circle cx={64} cy={6} r={46} />
    <circle cx={112} cy={22} r={28} />
    <rect x={-102} y={10} width={240} height={42} rx={21} />
  </g>
);

export const MountainScene: React.FC = () => {
  const f = useCurrentFrame();

  // camera: log-space zoom for a constant perceived pull-out speed
  const z = prog(f, 104, 206, EASE.cam);
  const s = Math.exp(lerp(Math.log(6.2), Math.log(0.98), z));
  const cx = lerp(FIG[0] - 4, 540, EASE.inOut(clamp(z * 1.05)));
  const cy = lerp(FIG[1] - 26, 900, EASE.inOut(clamp(z * 1.05)));
  const push = 1 + prog(f, 0, 104, EASE.linear) * 0.06; // slow creeping push-in on the struggle
  const d = drift(f, 1.5);
  const S = s * (z > 0 ? 1 + (push - 1) * (1 - z) : push);
  const camT = `translate(${540 + d.x}, ${960 + d.y}) scale(${S}) translate(${-cx}, ${-cy})`;

  // figure acting
  let pose = mix(POSES.stand, POSES.handOnHead, prog(f, 6, 24, EASE.out));
  const breathe = Math.sin(f / 6) * 3;
  pose = {...pose, lean: pose.lean + breathe * 0.6};
  const sit = prog(f, 62, 84, EASE.inOut);
  pose = mix(pose, POSES.sit, sit);
  const lookBack = prog(f, 112, 132, EASE.inOut);
  pose = mix(pose, P({...POSES.sit, head: 8, lean: 10, aF: 60, eF: -10}), lookBack);
  const heart = Math.max(0, Math.sin(f / 5)) ** 6 * (1 - prog(f, 90, 130));
  const headColor = `rgb(255,${Math.round(255 - 150 * heart * prog(f, 10, 30))},${Math.round(255 - 160 * heart * prog(f, 10, 30))})`;

  const trailP = prog(f, 126, 214, EASE.inOut);
  const lit = trailP * TRAIL.length;
  const summit = prog(f, 196, 230, EASE.out);
  const flagWave = Math.sin(f / 4) * 6;
  const sky = prog(f, 110, 200);

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920">
          <defs>
            <FigureDefs />
            <SharedDefs />
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0d1a3d" />
              <stop offset="0.5" stopColor="#070d22" />
              <stop offset="1" stopColor="#020308" />
            </linearGradient>
            <linearGradient id="rock" gradientUnits="userSpaceOnUse" x1="200" y1="560" x2="900" y2="1900">
              <stop offset="0" stopColor="#8fb2ff" />
              <stop offset="0.45" stopColor="#6a90e4" />
              <stop offset="1" stopColor="#2a4180" />
            </linearGradient>
            <linearGradient id="backRock" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#24376e" />
              <stop offset="1" stopColor="#0a1022" />
            </linearGradient>
            <radialGradient id="summitGlow">
              <stop offset="0" stopColor="#ffe27a" stopOpacity="0.7" />
              <stop offset="1" stopColor="#ffe27a" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="dotGlow">
              <stop offset="0" stopColor="#fff3b0" stopOpacity="1" />
              <stop offset="0.35" stopColor="#ffd04a" stopOpacity="0.7" />
              <stop offset="1" stopColor="#ffb000" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g transform={camT}>
            {/* sky + stars (only seen as we pull out) */}
            <rect x={-1500} y={-1500} width={4200} height={4800} fill="url(#sky)" opacity={0.25 + sky * 0.75} />
            {new Array(90).fill(0).map((_, i) => (
              <circle
                key={i}
                cx={-300 + rand(i) * 1700}
                cy={-500 + rand(i + 50) * 1300}
                r={0.8 + rand(i + 7) * 2}
                fill="#fff"
                opacity={sky * (0.3 + 0.7 * Math.abs(Math.sin(f / 9 + i)))}
              />
            ))}
            {/* distant range */}
            <path d="M-500,1300 L-100,880 L120,1020 L420,760 L700,980 L980,700 L1300,1000 L1600,900 L1600,2400 L-500,2400 Z" fill="url(#backRock)" opacity={0.9} />
            {/* high clouds (parallax drift) */}
            <Cloud x={-120 + f * 0.25} y={250} s={1.6} o={0.85 * sky} c="#3a58a4" />
            <Cloud x={560 - f * 0.18} y={180} s={1.2} o={0.75 * sky} c="#4664b4" />
            <Cloud x={980 - f * 0.12} y={330} s={0.9} o={0.7 * sky} c="#3a58a4" />
            {/* main mountain */}
            <path d={BODY_D} fill="url(#rock)" />
            <g fill="#2c4384" opacity={0.55}>
              {FACETS.map((p, i) => (
                <path key={i} d={p} />
              ))}
            </g>
            {/* ridge rim light */}
            <path d={RIDGE_D} fill="none" stroke="#d4e2ff" strokeWidth={3} opacity={0.75} vectorEffect="non-scaling-stroke" />
            {/* glowing trail of past steps */}
            {TRAIL.map((p, i) => {
              const a = clamp(lit - i);
              if (a <= 0) return null;
              const head = Math.max(0, 1 - (lit - i) / 6);
              return (
                <g key={i}>
                  <circle cx={p[0]} cy={p[1]} r={11 + head * 10} fill="url(#dotGlow)" opacity={a * 0.8} />
                  <circle cx={p[0]} cy={p[1]} r={2.6} fill="#fff6cc" opacity={a} />
                </g>
              );
            })}
            {/* summit flag */}
            <circle cx={250} cy={540} r={70} fill="url(#summitGlow)" opacity={0.4 + summit * 0.6} />
            <line x1={250} y1={562} x2={250} y2={496} stroke="#e8eefc" strokeWidth={3} />
            <path d={`M250,498 Q270,${500 + flagWave} 292,${506 + flagWave * 0.5} Q272,${514 + flagWave} 250,522 Z`} fill="#ffcf2e" />
            {/* the climber */}
            <Figure x={FIG[0]} y={FIG[1] + 1} pose={pose} scale={0.16} headColor={headColor} shadow={false} glow={0.3} />
            {/* low clouds in front for depth */}
            <Cloud x={-60 - f * 0.4} y={1480} s={2.4} o={0.55 * sky} c="#1b2c5c" />
            <Cloud x={820 + f * 0.3} y={1700} s={2.8} o={0.5 * sky} c="#16244e" />
          </g>
        </svg>
      </AbsoluteFill>

      <Caption words={[{t: 'Khi'}, {t: 'bạn'}, {t: 'muốn', c: '#ff8a7a'}, {t: 'bỏ', c: '#ff8a7a'}, {t: 'cuộc…', c: '#ff8a7a'}]} at={14} out={106} y={360} size={60} />
      <Caption
        words={[
          {t: 'hãy', w: 400},
          {t: 'nhìn', w: 400},
          {t: 'lại', w: 400},
          {t: 'chặng', br: true, w: 700},
          {t: 'đường', w: 700},
          {t: 'bạn', w: 700},
          {t: 'đã', w: 700, c: '#ffd76a'},
          {t: 'đi.', w: 700, c: '#ffd76a'},
        ]}
        at={150}
        out={258}
        y={190}
        size={58}
        stagger={4}
      />
    </AbsoluteFill>
  );
};
