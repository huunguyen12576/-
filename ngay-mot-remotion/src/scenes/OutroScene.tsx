import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FONT, Horizon, SharedDefs, Trophy} from '../components/common';
import {Figure, FigureDefs, P, walk, walkBob} from '../components/Figure';
import {clamp, EASE, lerp, prog, spr} from '../lib/anim';

/**
 * Scene 7 (local 0–150): the callback. A small golden staircase, the figure takes
 * the first step. "Đừng chờ một ngày. Hãy bắt đầu ngày một."
 */
const G = 1330;
const N = 12;
const X0 = 330;
const X1 = 780;
const W = (X1 - X0) / N;
const H = 420;
const R = H / N;

const Line: React.FC<{children: React.ReactNode; at: number; y: number; out?: number}> = ({children, at, y, out = 9999}) => {
  const f = useCurrentFrame();
  const p = prog(f, at, at + 18, EASE.out);
  const o = 1 - prog(f, out, out + 14, EASE.in);
  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        width: '100%',
        textAlign: 'center',
        fontFamily: FONT,
        color: '#fff',
        opacity: p * o,
        transform: `translateY(${(1 - p) * 30}px)`,
        filter: p < 1 ? `blur(${(1 - p) * 12}px)` : undefined,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </div>
  );
};

export const OutroScene: React.FC = () => {
  const f = useCurrentFrame();
  const strike = prog(f, 44, 58, EASE.inOut);
  const lit = prog(f, 66, 100, EASE.out);
  // figure: walks in, steps onto the first step
  const walkIn = prog(f, 8, 34, EASE.out);
  let x = lerp(220, X0 - 18, walkIn);
  let y = G;
  let pose = walk(f / 14, 1 - prog(f, 28, 34));
  let bob = walkBob(f / 14, 1 - prog(f, 28, 34));
  const st = prog(f, 70, 84, EASE.inOut);
  if (f >= 70) {
    x = lerp(X0 - 18, X0 + W * 0.5, st);
    y = lerp(G, G - R, EASE.out(clamp(st * 1.4)));
    const l = Math.sin(st * Math.PI);
    pose = P({lean: 8, head: -12, hF: 60 * l, kF: 70 * l, hB: -8 * l, kB: 16 * l, aF: -20 * l, aB: 26 * l, eF: 30, eB: 30});
    bob = -l * 5;
  }
  if (f >= 84) pose = P({head: -16, lean: -2});
  const end = prog(f, 136, 150, EASE.in);
  const glowPulse = 0.6 + 0.4 * Math.sin(f / 8);

  return (
    <AbsoluteFill style={{background: '#000', opacity: 1 - end}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 55% 30% at 50% 66%, rgba(255,190,60,${0.05 + 0.16 * lit}), rgba(0,0,0,0) 70%)`,
        }}
      />
      <AbsoluteFill>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920">
          <defs>
            <FigureDefs />
            <SharedDefs />
            <linearGradient id="oStep" gradientUnits="userSpaceOnUse" x1="0" y1={G - H} x2="0" y2={G}>
              <stop offset="0" stopColor="#ffd76a" stopOpacity="0.9" />
              <stop offset="1" stopColor="#ffd76a" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <Horizon y={G} color="#ffd76a" width={900} o={0.5 + lit * 0.5} />
          {new Array(N).fill(0).map((_, i) => {
            const rise = spr(f, 2 + i * 2, {damping: 20, stiffness: 160});
            const h = (i + 1) * R * rise;
            const isFirst = i === 0;
            const glow = isFirst ? lit : 0;
            return (
              <g key={i}>
                <rect x={X0 + i * W} y={G - h} width={W - 2} height={h} fill="url(#oStep)" opacity={0.18 + 0.12 * lit} />
                <line
                  x1={X0 + i * W}
                  y1={G - h}
                  x2={X0 + (i + 1) * W - 2}
                  y2={G - h}
                  stroke={isFirst ? '#fff1b8' : '#ffd76a'}
                  strokeWidth={isFirst ? 3 + glow * 3 : 2}
                  opacity={isFirst ? 0.5 + glow * 0.5 : 0.55}
                />
                {isFirst && glow > 0 && (
                  <rect x={X0 - 6} y={G - h - 24} width={W + 8} height={30} fill="#ffd76a" opacity={0.18 * glow * glowPulse} style={{filter: 'blur(8px)'}} />
                )}
              </g>
            );
          })}
          <Trophy x={X1 - W / 2} y={G - H - 12} s={0.55} glow={0.5 + lit * 0.5} shine={Math.max(0, 1 - Math.abs(f - 104) / 8)} />
          <Figure x={x} y={y} pose={pose} bob={bob} scale={0.5} glow={0.5} shadow={false} />
        </svg>
      </AbsoluteFill>

      <Line at={8} y={560}>
        <span style={{fontSize: 52, fontWeight: 300}}>Đừng chờ </span>
        <span style={{position: 'relative', fontSize: 52, fontWeight: 700}}>
          một ngày.
          <span
            style={{
              position: 'absolute',
              left: -6,
              top: '52%',
              height: 5,
              width: `calc(${strike * 100}% + 12px)`,
              background: '#ff5a5a',
              borderRadius: 3,
              boxShadow: '0 0 16px rgba(255,80,80,0.7)',
            }}
          />
        </span>
      </Line>
      <Line at={60} y={650}>
        <span style={{fontSize: 52, fontWeight: 300}}>Hãy bắt đầu</span>
      </Line>
      <Line at={70} y={720}>
        <span
          style={{
            fontSize: 118,
            fontWeight: 800,
            letterSpacing: '0.02em',
            color: '#ffc93c',
            textShadow: `0 0 ${30 + 30 * glowPulse}px rgba(255,190,40,0.55)`,
          }}
        >
          NGÀY MỘT.
        </span>
      </Line>
    </AbsoluteFill>
  );
};
