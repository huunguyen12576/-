import React from 'react';
import {Num} from '../anim';

/** Pose in coordinates relative to the figure anchor (head centre when sitting upright). */
export type Pose = Num & {
  hx: number; hy: number;
  slx: number; sly: number; srx: number; sry: number;
  elx: number; ely: number; erx: number; ery: number;
  hlx: number; hly: number; hrx: number; hry: number;
  px: number; py: number; pr: number; // phone position / rotation
  blanket: number; // blanket top edge (relative y)
  arms: number; // arm visibility 0..1 (0 = under the blanket)
  torso: number; // torso end y
};

const base = {
  hx: 0, hy: 0,
  slx: -44, sly: 58, srx: 44, sry: 58,
  torso: 220, arms: 1, pr: 0,
};

export const POSES: Record<string, Pose> = {
  sitPhone: {
    ...base,
    elx: -82, ely: 128, erx: 82, ery: 128,
    hlx: -17, hly: 110, hrx: 17, hry: 110,
    px: 0, py: 104, blanket: 86,
  },
  stare: {
    ...base, hy: 6,
    slx: -44, sly: 62, srx: 44, sry: 62,
    elx: -76, ely: 150, erx: 76, ery: 150,
    hlx: -15, hly: 150, hrx: 15, hry: 150,
    px: 0, py: 146, blanket: 92,
  },
  handsHead: {
    ...base, hy: 30,
    slx: -46, sly: 84, srx: 46, sry: 84,
    elx: -80, ely: 110, erx: 80, ery: 110,
    hlx: -44, hly: 30, hrx: 44, hry: 30,
    px: 34, py: 168, pr: 24, blanket: 100,
  },
  lieAwake: {
    ...base, hy: -60,
    slx: -46, sly: -4, srx: 46, sry: -4,
    elx: -86, ely: 30, erx: 86, ery: 30,
    hlx: -15, hly: -6, hrx: 15, hry: -6,
    px: 0, py: -12, blanket: 34, torso: 160,
  },
  hunch: {
    ...base, hy: 40,
    slx: -48, sly: 92, srx: 48, sry: 92,
    elx: -70, ely: 168, erx: 70, ery: 168,
    hlx: -15, hly: 140, hrx: 15, hry: 140,
    px: 0, py: 136, pr: 0, blanket: 120,
  },
  lieSleep: {
    ...base, hy: -62,
    slx: -40, sly: -8, srx: 40, sry: -8,
    elx: -46, ely: 30, erx: 46, ery: 30,
    hlx: -30, hly: 50, hrx: 30, hry: 50,
    px: 128, py: 190, pr: 64, blanket: -14, arms: 0, torso: 140,
  },
  stretch: {
    ...base, hy: -6,
    slx: -46, sly: 54, srx: 46, sry: 54,
    elx: -112, ely: 4, erx: 112, ery: 4,
    hlx: -126, hly: -78, hrx: 126, hry: -78,
    px: 128, py: 190, pr: 64, blanket: 96,
  },
  slump: {
    ...base, hx: -26, hy: 34,
    slx: -66, sly: 92, srx: 30, sry: 84,
    elx: -118, ely: 176, erx: 70, ery: 158,
    hlx: -128, hly: 252, hrx: 18, hry: 162,
    px: -128, py: 262, pr: -28, blanket: 104,
  },
  slumpDropped: {
    ...base, hx: -26, hy: 36,
    slx: -66, sly: 94, srx: 30, sry: 86,
    elx: -116, ely: 178, erx: 70, ery: 158,
    hlx: -126, hly: 250, hrx: 18, hry: 162,
    px: -96, py: 330, pr: -118, blanket: 104,
  },
  headDown: {
    ...base, hx: -4, hy: 58,
    slx: -50, sly: 104, srx: 46, sry: 104,
    elx: -96, ely: 70, erx: 92, ery: 70,
    hlx: -44, hly: 44, hrx: 40, hry: 44,
    px: -96, py: 330, pr: -118, blanket: 112,
  },
};

const OUT = '#07080c';

type Props = {
  pose: Pose;
  x: number;
  y: number;
  phoneOn: number; // screen brightness 0..1
  phoneTint?: string;
  glow?: number; // body rim-light strength
  warm?: number; // 0 cool → 1 warm body tint (morning)
  idSuffix: string;
};

const limb = (p: Pose, side: 'l' | 'r') => {
  const s = side === 'l' ? [p.slx, p.sly] : [p.srx, p.sry];
  const e = side === 'l' ? [p.elx, p.ely] : [p.erx, p.ery];
  const h = side === 'l' ? [p.hlx, p.hly] : [p.hrx, p.hry];
  return `M ${s[0]} ${s[1]} Q ${e[0]} ${e[1]} ${(e[0] + h[0]) / 2 + (e[0] - h[0]) * 0.1} ${(e[1] + h[1]) / 2} T ${h[0]} ${h[1]}`;
};

export const Figure: React.FC<Props> = ({pose: p, x, y, phoneOn, phoneTint = '#bcd4ff', glow = 0.5, warm = 0, idSuffix}) => {
  const body = warm > 0 ? `rgb(${255},${Math.round(255 - warm * 14)},${Math.round(255 - warm * 34)})` : '#ffffff';
  const neckY = p.hy + 40;
  return (
    <g transform={`translate(${x} ${y})`}>
      <defs>
        <radialGradient id={`ph-${idSuffix}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={phoneTint} stopOpacity={0.55 * phoneOn} />
          <stop offset="45%" stopColor={phoneTint} stopOpacity={0.16 * phoneOn} />
          <stop offset="100%" stopColor={phoneTint} stopOpacity={0} />
        </radialGradient>
        <filter id={`soft-${idSuffix}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      {/* contact shadow on the bed — gives weight */}
      <ellipse
        cx={p.hx * 0.6 + 10}
        cy={(p.hy + p.blanket) / 2 + 40}
        rx={110}
        ry={70 + (p.blanket - p.hy) * 0.25}
        fill="#000"
        opacity={0.45}
        filter={`url(#soft-${idSuffix})`}
      />

      {/* torso (mostly hidden under the blanket) */}
      <path
        d={`M ${p.slx + 8} ${p.sly} Q ${p.hx * 0.6} ${neckY - 6} ${p.srx - 8} ${p.sry} L ${p.srx * 0.8} ${p.torso} L ${p.slx * 0.8} ${p.torso} Z`}
        fill={body}
        stroke={OUT}
        strokeWidth={8}
        strokeLinejoin="round"
      />
    </g>
  );
};

/** Parts drawn above the blanket: head, arms, phone. Split so the blanket can sit between. */
export const FigureTop: React.FC<Props> = ({pose: p, x, y, phoneOn, phoneTint = '#bcd4ff', glow = 0.5, warm = 0, idSuffix}) => {
  const body = warm > 0 ? `rgb(255,${Math.round(255 - warm * 14)},${Math.round(255 - warm * 34)})` : '#ffffff';
  const armO = p.arms;
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* rim glow */}
      <circle cx={p.hx} cy={p.hy} r={78} fill={body} opacity={0.10 * glow} filter={`url(#soft-${idSuffix})`} />

      {/* shoulders visible above the blanket */}
      <g opacity={1}>
        <path
          d={`M ${p.slx} ${p.sly} Q ${p.hx * 0.6} ${p.hy + 34} ${p.srx} ${p.sry}`}
          stroke={OUT}
          strokeWidth={40}
          strokeLinecap="round"
          fill="none"
          opacity={p.blanket < p.sly + 20 ? 0 : 1}
        />
        <path
          d={`M ${p.slx} ${p.sly} Q ${p.hx * 0.6} ${p.hy + 34} ${p.srx} ${p.sry}`}
          stroke={body}
          strokeWidth={26}
          strokeLinecap="round"
          fill="none"
          opacity={p.blanket < p.sly + 20 ? 0 : 1}
        />
      </g>

      {/* head */}
      <circle cx={p.hx} cy={p.hy} r={46} fill={body} stroke={OUT} strokeWidth={8} />
      {/* subtle 3D shading on the head (light from phone below / window above) */}
      <circle cx={p.hx} cy={p.hy} r={42} fill={`url(#headShade-${idSuffix})`} />
      <defs>
        <radialGradient id={`headShade-${idSuffix}`} cx="42%" cy="34%" r="70%">
          <stop offset="0%" stopColor="#fff" stopOpacity={0} />
          <stop offset="78%" stopColor="#9aa3b8" stopOpacity={0.05} />
          <stop offset="100%" stopColor="#5d6478" stopOpacity={0.35} />
        </radialGradient>
      </defs>

      {/* arms */}
      <g opacity={armO}>
        {(['l', 'r'] as const).map((s) => (
          <g key={s}>
            <path d={limb(p, s)} stroke={OUT} strokeWidth={38} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d={limb(p, s)} stroke={body} strokeWidth={24} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>
        ))}
      </g>

      {/* phone */}
      <g transform={`translate(${p.px} ${p.py}) rotate(${p.pr})`}>
        <circle r={300} fill={`url(#ph-${idSuffix})`} style={{mixBlendMode: 'screen'}} />
        <rect x={-15} y={-26} width={30} height={52} rx={7} fill="#111318" stroke={OUT} strokeWidth={4} />
        <rect x={-11} y={-22} width={22} height={44} rx={4} fill={phoneTint} opacity={0.15 + 0.85 * phoneOn} />
      </g>

      {/* hands sit on top of the phone */}
      <g opacity={armO}>
        {(['l', 'r'] as const).map((s) => {
          const hx = s === 'l' ? p.hlx : p.hrx;
          const hy = s === 'l' ? p.hly : p.hry;
          return <circle key={s} cx={hx} cy={hy} r={12} fill={body} />;
        })}
      </g>
    </g>
  );
};
