import React from 'react';
import {AbsoluteFill, staticFile, useCurrentFrame} from 'remotion';
import {clamp, EASE, prog, rand} from '../lib/anim';

export const FONT = "'Montserrat', sans-serif";

/* ------------------------------------------------------------------ */
/* Caption: premium word-by-word reveal (rise + de-blur + tracking).   */
/* ------------------------------------------------------------------ */
export type Word = {t: string; c?: string; w?: number; size?: number; br?: boolean};

export const Caption: React.FC<{
  words: Word[];
  at: number; // local frame of reveal start
  out?: number; // local frame to begin exit
  y?: number;
  size?: number;
  stagger?: number;
  weight?: number;
  align?: 'center';
  letter?: number;
}> = ({words, at, out = 99999, y = 520, size = 64, stagger = 4, weight = 600, letter = 0.01}) => {
  const f = useCurrentFrame();
  const exit = prog(f, out, out + 12, EASE.in);
  const lines: Word[][] = [[]];
  words.forEach((w) => {
    if (w.br) lines.push([]);
    lines[lines.length - 1].push(w);
  });
  let idx = 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: y,
        textAlign: 'center',
        fontFamily: FONT,
        color: '#fff',
        opacity: 1 - exit,
        transform: `translateY(${-exit * 20}px)`,
        filter: exit > 0 ? `blur(${exit * 10}px)` : undefined,
      }}
    >
      {lines.map((ln, li) => (
        <div key={li} style={{lineHeight: 1.25, whiteSpace: 'nowrap'}}>
          {ln.map((w) => {
            const i = idx++;
            const p = prog(f, at + i * stagger, at + i * stagger + 16, EASE.out);
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  margin: '0 0.16em',
                  fontSize: w.size ?? size,
                  fontWeight: w.w ?? weight,
                  color: w.c ?? '#f4f6fb',
                  letterSpacing: `${letter + (1 - p) * 0.12}em`,
                  opacity: p,
                  transform: `translateY(${(1 - p) * 26}px)`,
                  filter: p < 1 ? `blur(${(1 - p) * 12}px)` : undefined,
                  textShadow: w.c ? `0 0 28px ${w.c}66` : '0 2px 18px rgba(0,0,0,0.6)',
                }}
              >
                {w.t}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Film finish: grain, vignette, letterbox light-leak.                 */
/* ------------------------------------------------------------------ */
export const FilmFinish: React.FC<{vignette?: number}> = ({vignette = 0.75}) => {
  const f = useCurrentFrame();
  const g = Math.floor(f / 2) % 4;
  const ox = Math.floor(rand(f) * 400);
  const oy = Math.floor(rand(f + 9) * 400);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 75% 60% at 50% 48%, rgba(0,0,0,0) 45%, rgba(0,0,0,${vignette}) 100%)`,
        }}
      />
      <AbsoluteFill style={{opacity: 0.09, mixBlendMode: 'screen', overflow: 'hidden'}}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${staticFile(`grain/grain${g}.png`)})`,
            backgroundRepeat: 'repeat',
            backgroundPosition: `${-ox}px ${-oy}px`,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Fade a whole scene in/out (local frames). */
export const SceneFade: React.FC<{
  inDur?: number;
  outAt: number;
  outDur?: number;
  children: React.ReactNode;
}> = ({inDur = 10, outAt, outDur = 10, children}) => {
  const f = useCurrentFrame();
  const o = clamp(f / inDur) * (1 - prog(f, outAt, outAt + outDur, EASE.in));
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

/* ------------------------------------------------------------------ */
/* 2.5D extruded block (front face + side + top)                       */
/* ------------------------------------------------------------------ */
export const Block: React.FC<{
  x: number;
  y: number; // top
  w: number;
  h: number;
  d?: number; // depth offset
  front: string;
  side: string;
  top: string;
  opacity?: number;
  edge?: string;
}> = ({x, y, w, h, d = 16, front, side, top, opacity = 1, edge = 'rgba(255,255,255,0.55)'}) => {
  const dx = d;
  const dy = -d * 0.62;
  if (h <= 0.5) return null;
  return (
    <g opacity={opacity}>
      <polygon points={`${x + w},${y} ${x + w + dx},${y + dy} ${x + w + dx},${y + h + dy} ${x + w},${y + h}`} fill={side} />
      <polygon points={`${x},${y} ${x + dx},${y + dy} ${x + w + dx},${y + dy} ${x + w},${y}`} fill={top} />
      <rect x={x} y={y} width={w} height={h} fill={front} />
      <line x1={x} y1={y + 0.5} x2={x + w} y2={y + 0.5} stroke={edge} strokeWidth={1.5} />
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Trophy with specular glint                                          */
/* ------------------------------------------------------------------ */
export const Trophy: React.FC<{x: number; y: number; s?: number; shine?: number; glow?: number}> = ({
  x,
  y,
  s = 1,
  shine = 0,
  glow = 1,
}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <circle cx={0} cy={-30} r={90} fill="url(#trophyGlow)" opacity={glow} />
    {/* handles */}
    <path d="M-26,-52 C-52,-52 -50,-22 -20,-20" fill="none" stroke="#d9a520" strokeWidth={6} />
    <path d="M26,-52 C52,-52 50,-22 20,-20" fill="none" stroke="#b9861a" strokeWidth={6} />
    {/* cup */}
    <path d="M-28,-58 L28,-58 C28,-24 16,-10 0,-8 C-16,-10 -28,-24 -28,-58 Z" fill="url(#gold)" />
    <rect x={-5} y={-10} width={10} height={14} fill="#b98a1b" />
    <path d="M-18,4 L18,4 L22,14 L-22,14 Z" fill="url(#gold)" />
    <rect x={-26} y={14} width={52} height={7} rx={2} fill="#8c6512" />
    {/* specular sweep */}
    <path d="M-20,-55 C-20,-30 -12,-16 -4,-12" stroke="#fff6cf" strokeWidth={5} fill="none" opacity={0.75} strokeLinecap="round" />
    {shine > 0 && (
      <g opacity={shine} transform="translate(-16,-44)">
        <path d="M0,-34 L4,-4 L34,0 L4,4 L0,34 L-4,4 L-34,0 L-4,-4 Z" fill="#fffbe8" />
      </g>
    )}
  </g>
);

export const SharedDefs: React.FC = () => (
  <>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#fff1a8" />
      <stop offset="0.35" stopColor="#f2c230" />
      <stop offset="0.7" stopColor="#c58b12" />
      <stop offset="1" stopColor="#8a5c08" />
    </linearGradient>
    <radialGradient id="trophyGlow">
      <stop offset="0" stopColor="#ffd34d" stopOpacity="0.55" />
      <stop offset="0.4" stopColor="#ffb300" stopOpacity="0.16" />
      <stop offset="1" stopColor="#ffb300" stopOpacity="0" />
    </radialGradient>
    <linearGradient id="reflFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#000" stopOpacity="0.55" />
      <stop offset="0.45" stopColor="#000" stopOpacity="1" />
    </linearGradient>
  </>
);

/** Horizon line that fades to the edges, with a soft light bloom. */
export const Horizon: React.FC<{y: number; color?: string; o?: number; width?: number}> = ({
  y,
  color = '#8fb2ff',
  o = 1,
  width = 1080,
}) => (
  <g opacity={o}>
    <defs>
      <linearGradient id={`hz${y}`} x1="0" x2="1">
        <stop offset="0" stopColor={color} stopOpacity="0" />
        <stop offset="0.5" stopColor={color} stopOpacity="1" />
        <stop offset="1" stopColor={color} stopOpacity="0" />
      </linearGradient>
    </defs>
    <rect x={540 - width / 2} y={y - 1.5} width={width} height={3} fill={`url(#hz${y})`} />
    <rect x={540 - width / 2} y={y - 14} width={width} height={28} fill={`url(#hz${y})`} opacity={0.08} />
  </g>
);
