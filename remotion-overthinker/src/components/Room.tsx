import React from 'react';
import {interpolateColors} from 'remotion';
import {lerp, rand} from '../anim';

export const W = 1080;
export const H = 1920;

// Window
const WX0 = 330;
const WX1 = 750;
const WY0 = 470;
const WY1 = 790;

const sky = (d: number) => {
  const top = interpolateColors(d, [0, 0.45, 0.75, 1], ['#070b1d', '#141634', '#3b3a6a', '#6c78b4']);
  const mid = interpolateColors(d, [0, 0.45, 0.75, 1], ['#0c1230', '#2a2450', '#a0607a', '#eea58a']);
  const bot = interpolateColors(d, [0, 0.45, 0.75, 1], ['#151b40', '#3f2c58', '#e88a6a', '#ffd38c']);
  return {top, mid, bot};
};

// deterministic skyline
const BUILDINGS = Array.from({length: 16}).map((_, i) => {
  const w = 22 + rand(i * 3.1) * 34;
  const h = 40 + rand(i * 7.7) * 120;
  return {w, h};
});

export const Backdrop: React.FC<{dawn: number; frame: number; wallWarm: number}> = ({dawn, frame, wallWarm}) => {
  const s = sky(dawn);
  const wall = interpolateColors(wallWarm, [0, 1], ['#14161d', '#2a2522']);
  const wallLow = interpolateColors(wallWarm, [0, 1], ['#0d0e13', '#1d1917']);
  const floor = interpolateColors(wallWarm, [0, 1], ['#0b0c10', '#1a1612']);
  let bx = WX0 - 10;
  const moonY = lerp(560, 700, dawn);
  const sunY = lerp(860, 735, Math.max(0, (dawn - 0.6) / 0.4));
  return (
    <g>
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={wallLow} />
          <stop offset="0.55" stopColor={wall} />
          <stop offset="1" stopColor={wallLow} />
        </linearGradient>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s.top} />
          <stop offset="0.6" stopColor={s.mid} />
          <stop offset="1" stopColor={s.bot} />
        </linearGradient>
        <radialGradient id="sun" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff4d6" stopOpacity={1} />
          <stop offset="0.25" stopColor="#ffd08a" stopOpacity={0.8} />
          <stop offset="1" stopColor="#ff9a5a" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="windowSpill" cx="50%" cy="0%" r="80%">
          <stop offset="0" stopColor={s.bot} stopOpacity={0.35} />
          <stop offset="1" stopColor={s.bot} stopOpacity={0} />
        </radialGradient>
        <clipPath id="winClip">
          <rect x={WX0} y={WY0} width={WX1 - WX0} height={WY1 - WY0} />
        </clipPath>
        <filter id="blur6">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="blur24">
          <feGaussianBlur stdDeviation="24" />
        </filter>
      </defs>

      {/* black above the room for headroom */}
      <rect x={0} y={0} width={W} height={H} fill="#030304" />
      {/* wall */}
      <rect x={0} y={380} width={W} height={540} fill="url(#wall)" />
      {/* floor */}
      <rect x={0} y={900} width={W} height={760} fill={floor} />
      <rect x={0} y={1640} width={W} height={280} fill="url(#floorFade)" />
      <defs>
        <linearGradient id="floorFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={floor} />
          <stop offset="1" stopColor="#030304" />
        </linearGradient>
      </defs>
      {/* top fade */}
      <rect x={0} y={380} width={W} height={60} fill="url(#topFade)" />
      <defs>
        <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#030304" />
          <stop offset="1" stopColor="#030304" stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* window glow onto the wall */}
      <rect x={WX0 - 160} y={WY0 - 60} width={WX1 - WX0 + 320} height={500} fill="url(#windowSpill)" opacity={0.4 + dawn * 0.9} />

      {/* sky */}
      <g clipPath="url(#winClip)">
        <rect x={WX0} y={WY0} width={WX1 - WX0} height={WY1 - WY0} fill="url(#sky)" />
        {/* stars */}
        {Array.from({length: 38}).map((_, i) => {
          const tw = 0.5 + 0.5 * Math.sin(frame * 0.12 + i * 1.7);
          return (
            <circle
              key={i}
              cx={WX0 + rand(i * 1.3) * (WX1 - WX0)}
              cy={WY0 + rand(i * 2.9) * 200}
              r={0.8 + rand(i * 5.1) * 1.6}
              fill="#fff"
              opacity={(1 - dawn * 1.4) * (0.35 + 0.65 * tw)}
            />
          );
        })}
        {/* moon */}
        <g opacity={1 - dawn * 0.75}>
          <circle cx={620} cy={moonY} r={60} fill="#dfe6ff" opacity={0.12} filter="url(#blur24)" />
          <circle cx={620} cy={moonY} r={24} fill="#f1f3ff" />
          <circle cx={631} cy={moonY - 7} r={22} fill={s.top} opacity={1 - dawn} />
        </g>
        {/* sun */}
        <circle cx={540} cy={sunY} r={150} fill="url(#sun)" opacity={Math.max(0, (dawn - 0.55) / 0.45)} />
        {/* skyline */}
        <g>
          {BUILDINGS.map((b, i) => {
            const x = bx;
            bx += b.w + 2;
            const top = WY1 - b.h;
            return (
              <g key={i}>
                <rect x={x} y={top} width={b.w} height={b.h} fill={interpolateColors(dawn, [0, 1], ['#05060c', '#2b2236'])} />
                {Array.from({length: Math.floor(b.h / 16)}).map((__, r) =>
                  Array.from({length: Math.floor(b.w / 10)}).map((___, c) => {
                    const id = i * 100 + r * 10 + c;
                    const on = rand(id) > 0.62;
                    const offAt = rand(id + 0.5);
                    if (!on) return null;
                    return (
                      <rect
                        key={`${r}-${c}`}
                        x={x + 4 + c * 10}
                        y={top + 6 + r * 16}
                        width={4}
                        height={6}
                        fill="#ffcf7a"
                        opacity={dawn > offAt * 0.9 + 0.05 ? 0.05 : 0.75}
                      />
                    );
                  })
                )}
              </g>
            );
          })}
        </g>
      </g>
      {/* window frame */}
      <rect x={WX0} y={WY0} width={WX1 - WX0} height={WY1 - WY0} fill="none" stroke="#2c2f3a" strokeWidth={12} />
      <line x1={(WX0 + WX1) / 2} y1={WY0} x2={(WX0 + WX1) / 2} y2={WY1} stroke="#2c2f3a" strokeWidth={9} />
      <line x1={WX0} y1={(WY0 + WY1) / 2 - 20} x2={WX1} y2={(WY0 + WY1) / 2 - 20} stroke="#2c2f3a" strokeWidth={7} />
      {/* sill (3D) */}
      <rect x={WX0 - 26} y={WY1 + 4} width={WX1 - WX0 + 52} height={14} fill="#272a33" />
      <rect x={WX0 - 26} y={WY1 + 18} width={WX1 - WX0 + 52} height={8} fill="#121319" />
      {/* curtain rod + curtains */}
      <rect x={WX0 - 80} y={WY0 - 22} width={WX1 - WX0 + 160} height={6} rx={3} fill="#3a3d48" />
      {[WX0 - 66, WX1 + 6].map((cx, i) => (
        <g key={i}>
          <path
            d={`M ${cx} ${WY0 - 18} h 60 v ${WY1 - WY0 + 60} q -30 10 -60 0 z`}
            fill={interpolateColors(wallWarm, [0, 1], ['#1f2230', '#3a3038'])}
          />
          {[12, 28, 44].map((o) => (
            <line key={o} x1={cx + o} y1={WY0 - 14} x2={cx + o + (i ? -3 : 3)} y2={WY1 + 38} stroke="#000" strokeOpacity={0.35} strokeWidth={3} />
          ))}
        </g>
      ))}
      {/* headboard shelves */}
      {[
        [40, 500],
        [580, 1040],
      ].map(([a, b], i) => (
        <g key={i}>
          <rect x={a} y={870} width={b - a} height={18} fill={interpolateColors(wallWarm, [0, 1], ['#262934', '#3d3530'])} />
          <rect x={a} y={888} width={b - a} height={12} fill="#0c0d11" />
        </g>
      ))}
    </g>
  );
};

/** Morning light shafts through the window, with drifting dust. */
export const LightShafts: React.FC<{dawn: number; frame: number}> = ({dawn, frame}) => {
  const o = Math.max(0, (dawn - 0.55) / 0.45);
  if (o <= 0) return null;
  return (
    <g style={{mixBlendMode: 'screen'}} opacity={o}>
      <defs>
        <linearGradient id="shaft" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffcf98" stopOpacity={0.42} />
          <stop offset="0.6" stopColor="#ffb27a" stopOpacity={0.14} />
          <stop offset="1" stopColor="#ff9a6a" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`M ${WX0} ${WY1} L ${WX1} ${WY1} L 1060 1620 L 20 1620 Z`} fill="url(#shaft)" filter="url(#blur6)" />
      <path d={`M ${(WX0 + WX1) / 2 - 6} ${WY1} L ${(WX0 + WX1) / 2 + 6} ${WY1} L 560 1620 L 520 1620 Z`} fill="#000" opacity={0.25} filter="url(#blur6)" />
      {Array.from({length: 40}).map((_, i) => {
        const t = frame * 0.004 + rand(i) * 10;
        const x = 120 + rand(i * 3.3) * 840 + Math.sin(t * 2 + i) * 18;
        const y = 820 + ((rand(i * 7.1) * 800 + frame * (0.3 + rand(i) * 0.5)) % 800);
        return <circle key={i} cx={x} cy={y} r={1 + rand(i * 9) * 2.2} fill="#fff1d8" opacity={0.25 + 0.4 * rand(i * 4.4)} />;
      })}
    </g>
  );
};

type BedSide = 'left' | 'right';

export const bedGeom = (side: BedSide) => {
  const cx = side === 'left' ? 270 : 810;
  return {cx, top: 900, bot: 1470, wTop: 400, wBot: 452};
};

export const BedBase: React.FC<{side: BedSide; tint: string; warm: number}> = ({side, tint, warm}) => {
  const g = bedGeom(side);
  const x0t = g.cx - g.wTop / 2;
  const x1t = g.cx + g.wTop / 2;
  const x0b = g.cx - g.wBot / 2;
  const x1b = g.cx + g.wBot / 2;
  const sheet = interpolateColors(warm, [0, 1], ['#2b2f3b', '#4a4440']);
  return (
    <g>
      {/* drop shadow on floor */}
      <path d={`M ${x0t - 10} ${g.top + 40} L ${x1t + 10} ${g.top + 40} L ${x1b + 30} ${g.bot + 130} L ${x0b - 30} ${g.bot + 130} Z`} fill="#000" opacity={0.6} filter="url(#blur24)" />
      {/* frame front (3D thickness) */}
      <path d={`M ${x0b} ${g.bot} L ${x1b} ${g.bot} L ${x1b - 4} ${g.bot + 96} L ${x0b + 4} ${g.bot + 96} Z`} fill={interpolateColors(warm, [0, 1], ['#16171d', '#2a211b'])} />
      <path d={`M ${x0b} ${g.bot} L ${x1b} ${g.bot} L ${x1b} ${g.bot + 14} L ${x0b} ${g.bot + 14} Z`} fill={tint} opacity={0.55} />
      {/* mattress */}
      <path d={`M ${x0t} ${g.top} L ${x1t} ${g.top} L ${x1b} ${g.bot} L ${x0b} ${g.bot} Z`} fill={sheet} />
      {/* pillow */}
      <rect x={g.cx - 140} y={g.top + 18} width={280} height={96} rx={44} fill={interpolateColors(warm, [0, 1], ['#3a3f4d', '#5c554f'])} />
      <rect x={g.cx - 128} y={g.top + 26} width={256} height={40} rx={20} fill="#fff" opacity={0.05} />
    </g>
  );
};

export const Blanket: React.FC<{side: BedSide; top: number; tint: string; frame: number; breathe: number}> = ({side, top, tint, frame, breathe}) => {
  const g = bedGeom(side);
  const t = (y: number) => (y - g.top) / (g.bot - g.top);
  const wAt = (y: number) => lerp(g.wTop, g.wBot, t(y)) / 2 + 14;
  const ty = Math.max(g.top + 40, top);
  const hump = 26 + breathe;
  const xl = g.cx - wAt(ty);
  const xr = g.cx + wAt(ty);
  const d = `M ${xl} ${ty + 28} Q ${g.cx} ${ty - hump} ${xr} ${ty + 28} L ${g.cx + wAt(g.bot) + 6} ${g.bot + 8} Q ${g.cx} ${g.bot + 20} ${g.cx - wAt(g.bot) - 6} ${g.bot + 8} Z`;
  const id = `bl-${side}`;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={tint} />
          <stop offset="1" stopColor={tint} />
        </linearGradient>
        <linearGradient id={`${id}-dk`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.3} />
        </linearGradient>
        <linearGradient id={`${id}-sh`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity={0.35} />
          <stop offset="0.25" stopColor="#000" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={d} fill={`url(#${id})`} />
      {/* folded hem */}
      <path d={`M ${xl + 4} ${ty + 26} Q ${g.cx} ${ty - hump + 2} ${xr - 4} ${ty + 26}`} stroke="#fff" strokeOpacity={0.12} strokeWidth={10} fill="none" />
      {/* soft folds */}
      {[0.32, 0.55, 0.78].map((k, i) => {
        const y = lerp(ty + 60, g.bot - 20, k);
        const sway = Math.sin(frame * 0.02 + i) * 4;
        return (
          <path
            key={i}
            d={`M ${g.cx - wAt(y) + 24} ${y + sway} Q ${g.cx - 40} ${y - 26} ${g.cx + 10} ${y + 6} T ${g.cx + wAt(y) - 30} ${y - 10}`}
            stroke="#000"
            strokeOpacity={0.18}
            strokeWidth={6}
            fill="none"
          />
        );
      })}
      <path d={d} fill={`url(#${id}-dk)`} />
      <path d={d} fill={`url(#${id}-sh)`} />
    </g>
  );
};

export const Nightstand: React.FC<{warm: number}> = ({warm}) => {
  const top = interpolateColors(warm, [0, 1], ['#22242c', '#3a3029']);
  const front = interpolateColors(warm, [0, 1], ['#16171d', '#29211b']);
  return (
    <g>
      <rect x={470} y={1000} width={140} height={330} fill="#000" opacity={0.6} filter="url(#blur24)" />
      <rect x={478} y={944} width={124} height={86} rx={6} fill={top} />
      <rect x={478} y={1030} width={124} height={250} fill={front} />
      <rect x={490} y={1060} width={100} height={84} rx={4} fill="none" stroke="#000" strokeOpacity={0.4} strokeWidth={3} />
      <circle cx={540} cy={1102} r={4} fill="#5a5d66" />
      <rect x={490} y={1168} width={100} height={84} rx={4} fill="none" stroke="#000" strokeOpacity={0.4} strokeWidth={3} />
      <circle cx={540} cy={1210} r={4} fill="#5a5d66" />
    </g>
  );
};
