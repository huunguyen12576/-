import React from 'react';
import {clamp, easeOut, lerp, prog, rnd} from './engine';
import {P, Stickman, solve, walkPose} from './Stickman';
import T from './timeline.json';

const W = 1080;
const H = 1920;
const HORIZON = 1250;
const WALK_Y = 1500; // feet line on the sidewalk
const SC = 2.55;

type Bld = {x: number; w: number; h: number; seed: number};
const layer = (n: number, seed: number, minH: number, maxH: number, minW: number, maxW: number, gap: number): Bld[] => {
  const out: Bld[] = [];
  let x = -200;
  for (let i = 0; i < n; i++) {
    const w = lerp(minW, maxW, rnd(seed + i * 3.1));
    out.push({x, w, h: lerp(minH, maxH, rnd(seed + i * 7.7)), seed: seed + i});
    x += w + gap * rnd(seed + i * 1.3);
  }
  return out;
};
const FAR = layer(40, 11, 160, 420, 70, 150, 20);
const MID = layer(34, 47, 260, 640, 90, 190, 30);

const Skyline: React.FC<{blds: Bld[]; offset: number; period: number; color: string; windows: boolean; f: number; base: number}> = ({blds, offset, period, color, windows, f, base}) => {
  const items: React.ReactNode[] = [];
  for (const copy of [0, 1, 2]) {
    blds.forEach((b, i) => {
      const x = ((b.x - offset) % period + period) % period - 300 + copy * period - period;
      if (x > W + 50 || x + b.w < -50) return;
      const top = base - b.h;
      items.push(
        <g key={`${copy}-${i}`}>
          <rect x={x} y={top} width={b.w} height={b.h + 10} fill={color} />
          {/* sunset rim on the left edges */}
          <rect x={x} y={top} width={3} height={b.h} fill="#ff9a62" opacity={0.25} />
          {windows && [...Array(Math.floor(b.h / 34))].map((_, r) =>
            [...Array(Math.floor(b.w / 26))].map((__, cI) => {
              const s = b.seed * 31 + r * 7 + cI * 13;
              if (rnd(s) > 0.24) return null;
              const tw = rnd(s + Math.floor(f / 40)) > 0.97 ? 0.3 : 1;
              return <rect key={`${r}-${cI}`} x={x + 10 + cI * 26} y={top + 16 + r * 34} width={9} height={13} fill="#ffcf8a" opacity={(0.45 + rnd(s + 2) * 0.5) * tw} />;
            }),
          )}
        </g>,
      );
    });
  }
  return <g>{items}</g>;
};

export const Street: React.FC<{f: number}> = ({f}) => {
  const st = T.street[0];
  const lf = f - st;
  // camera travels with the confident walker
  const speed = 7.2;
  const camX = lf * speed;
  // the slumped walker is slower; he falls behind
  const greyX = lf * lerp(speed * 0.93, speed * 0.8, prog(f, st, T.end[0] + 40));

  const whiteScreenX = 640;
  const greyScreenX = 430 + (greyX - camX) * 1;

  // walk cycles
  const wPh = (camX / 92) * Math.PI;
  const gPh = (greyX / 80) * Math.PI;
  const wW = walkPose(wPh, {amp: 27, lean: 2, arm: 18});
  // the grey walker slowly lifts his head at the very end — tomorrow is another chance
  const hope = prog(f, T.end[0] + 50, T.end[0] + 90);
  const gW = walkPose(gPh, {amp: 18, slump: lerp(1, 0.45, hope), arm: 8});

  // street lamps every 520 px of world
  const lampSpacing = 520;
  const lamps: number[] = [];
  for (let k = Math.floor((camX - 200) / lampSpacing); k <= Math.floor((camX + W + 200) / lampSpacing); k++) lamps.push(k * lampSpacing - camX + 120);
  const lampLight = (sx: number) => lamps.reduce((m, lx) => Math.max(m, clamp(1 - Math.abs(sx - lx) / 260)), 0);

  const briefcase = (r: ReturnType<typeof solve>) => (
    <g transform={`translate(${r.hand[0]} ${r.hand[1]})`}>
      <path d="M-7 -2 q 0 -7 7 -7 q 7 0 7 7" fill="none" stroke="#0b0b0d" strokeWidth={2.6} />
      <rect x={-16} y={-2} width={32} height={22} rx={3} fill="#7a4a2c" stroke="#0b0b0d" strokeWidth={2.6} />
      <rect x={-16} y={5} width={32} height={2} fill="#5a341e" />
    </g>
  );
  const stress = (r: ReturnType<typeof solve>) => (
    <g transform={`translate(${r.head[0] - 4} ${r.head[1] - 32})`} opacity={1 - hope * 0.8}>
      {[-1, 1].map((sgn) => (
        <path key={sgn} d={`M${sgn * 8} 0 q ${sgn * 6} -5 0 -10 q ${sgn * -6} -5 0 -10 q ${sgn * 6} -5 0 -10`} fill="none" stroke="#c8c8d0"
          strokeWidth={2.2} strokeLinecap="round" transform={`translate(0 ${Math.sin(f / 4 + sgn) * 2})`} />
      ))}
    </g>
  );

  const fadeIn = prog(f, st, st + 16);
  const whiteRim = lampLight(whiteScreenX);
  const greyRim = lampLight(greyScreenX);
  const shadowFor = (sx: number) => {
    // shadow points away from the closest lamp
    let best = lamps[0] ?? 0;
    lamps.forEach((lx) => {
      if (Math.abs(lx - sx) < Math.abs(best - sx)) best = lx;
    });
    const d = clamp((sx - best) / 300, -1, 1);
    return d;
  };

  const walker = (sx: number, ww: {pose: ReturnType<typeof P>; bob: number}, color: string, rim: number, extra: Partial<React.ComponentProps<typeof Stickman>>, op = 1) => {
    const hipY = WALK_Y - 73 * SC + ww.bob * SC;
    const sd = shadowFor(sx);
    return (
      <g opacity={op}>
        <ellipse cx={sx + sd * 70} cy={WALK_Y + 4} rx={60 + Math.abs(sd) * 60} ry={9} fill="#000" opacity={0.55} filter="url(#sblur)" />
        {/* reflection on the polished pavement */}
        <g transform={`translate(0 ${WALK_Y * 2 + 6}) scale(1 -1)`} opacity={0.12}>
          <Stickman x={sx} y={hipY} scale={SC} pose={ww.pose} color={color} />
        </g>
        <Stickman x={sx} y={hipY} scale={SC} pose={ww.pose} color={color} rim={rim} rimColor="#ffc07a" {...extra} />
      </g>
    );
  };

  const greyOp = 1 - prog(f, T.end[0] + 95, T.end[1] - 4) * 0.6;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{display: 'block'}}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#070b1f" />
          <stop offset="0.35" stopColor="#1b2050" />
          <stop offset="0.55" stopColor="#4b2f62" />
          <stop offset="0.66" stopColor="#c0607a" />
          <stop offset="0.7" stopColor="#ff9a62" />
        </linearGradient>
        <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd59a" stopOpacity={0.9} />
          <stop offset="1" stopColor="#ff8a5a" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="lampglow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe2a8" stopOpacity={0.9} />
          <stop offset="0.3" stopColor="#ffb86a" stopOpacity={0.35} />
          <stop offset="1" stopColor="#ff9a50" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd9a0" stopOpacity={0.35} />
          <stop offset="1" stopColor="#ffd9a0" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="walk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b3442" />
          <stop offset="1" stopColor="#1d1a22" />
        </linearGradient>
        <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141219" />
          <stop offset="1" stopColor="#050507" />
        </linearGradient>
        <filter id="sblur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
        <filter id="bigblur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="30" /></filter>
        <radialGradient id="svig" cx="0.5" cy="0.45" r="0.8">
          <stop offset="0.5" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.7} />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#sky)" />
      {/* stars */}
      {[...Array(60)].map((_, i) => (
        <circle key={i} cx={rnd(i) * W} cy={rnd(i + 99) * 700} r={rnd(i + 5) * 1.6 + 0.4} fill="#fff"
          opacity={(0.25 + 0.5 * rnd(i + 3)) * (0.6 + 0.4 * Math.sin(f / 9 + i))} />
      ))}
      <ellipse cx={W * 0.62 - camX * 0.02} cy={HORIZON - 40} rx={520} ry={260} fill="url(#sun)" opacity={0.8} />
      <Skyline blds={FAR} offset={camX * 0.12} period={4400} color="#2b2547" windows={false} f={f} base={HORIZON} />
      <rect x={0} y={HORIZON - 260} width={W} height={260} fill="#ff8a5a" opacity={0.12} filter="url(#bigblur)" />
      <Skyline blds={MID} offset={camX * 0.3} period={4600} color="#17142a" windows f={f} base={HORIZON + 30} />

      {/* railing */}
      <rect x={0} y={1300} width={W} height={8} fill="#2a2433" />
      <rect x={0} y={1300} width={W} height={2} fill="#ff9f70" opacity={0.35} />
      {[...Array(40)].map((_, i) => {
        const x = ((i * 34 - camX * 0.92) % (40 * 34) + 40 * 34) % (40 * 34) - 40;
        return <rect key={i} x={x} y={1308} width={4} height={92} fill="#201b27" />;
      })}
      <rect x={0} y={1398} width={W} height={6} fill="#2a2433" />

      {/* sidewalk */}
      <rect x={0} y={1404} width={W} height={150} fill="url(#walk)" />
      {[...Array(14)].map((_, i) => {
        const x = ((i * 120 - camX) % 1680 + 1680) % 1680 - 120;
        return <line key={i} x1={x} y1={1404} x2={x - 60} y2={1554} stroke="#000" strokeOpacity={0.25} strokeWidth={2} />;
      })}
      <rect x={0} y={1554} width={W} height={14} fill="#4a4250" />
      <rect x={0} y={1568} width={W} height={H - 1568} fill="url(#road)" />

      {/* lamps: pole, head, glow cone, pavement pool, road reflection */}
      {lamps.map((lx, i) => (
        <g key={i}>
          <ellipse cx={lx} cy={1480} rx={240} ry={44} fill="#ffcf8a" opacity={0.16} filter="url(#sblur)" />
          <polygon points={`${lx - 16},${720} ${lx + 16},${720} ${lx + 220},${1500} ${lx - 220},${1500}`} fill="url(#cone)" opacity={0.55} />
          <rect x={lx - 5} y={712} width={10} height={700} fill="#14111a" />
          <rect x={lx - 26} y={706} width={52} height={12} rx={4} fill="#14111a" />
          <circle cx={lx} cy={722} r={150} fill="url(#lampglow)" />
          <circle cx={lx} cy={722} r={9} fill="#fff4dc" />
          <rect x={lx - 14} y={1600} width={28} height={260} fill="#ffb86a" opacity={0.08} filter="url(#sblur)" />
        </g>
      ))}

      {/* walkers */}
      <g opacity={fadeIn}>
        {walker(greyScreenX, gW, '#8e8e98', greyRim * 0.5, {headProp: stress}, greyOp)}
        {walker(whiteScreenX, wW, '#f7f6f2', whiteRim, {
          ik: undefined,
          handProp: briefcase,
          pose: P({...wW.pose, a1: wW.pose.a1 * 0.35, a2: wW.pose.a1 * 0.35 + 5}),
        })}
      </g>

      {/* foreground passing lamp post (deep parallax) */}
      {(() => {
        const x = ((700 - camX * 1.9) % 2600 + 2600) % 2600 - 300;
        return <rect x={x} y={0} width={70} height={H} fill="#030304" opacity={0.95} filter="url(#sblur)" />;
      })()}

      <rect width={W} height={H} fill="url(#svig)" />
      <rect width={W} height={H} fill="#000" opacity={prog(f, T.end[0], T.end[0] + 30, easeOut) * 0.45} />
    </svg>
  );
};
