import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import {EASE, lerp, prog} from '../lib/anim';
import {FONT} from './common';

const measure = (text: string, size: number, weight: number) => {
  if (typeof document === 'undefined') return text.length * size * 0.7;
  const c = document.createElement('canvas').getContext('2d');
  if (!c) return text.length * size * 0.7;
  c.font = `${weight} ${size}px Montserrat`;
  return c.measureText(text).width;
};

/**
 * Two words that physically trade places along arcs:  A B  →  B A
 * (the "Một ngày" → "Ngày một" pivot of the film).
 */
export const WordSwap: React.FC<{
  a: string;
  b: string;
  at: number; // reveal
  swapAt: number;
  out?: number;
  y: number;
  size?: number;
  weight?: number;
  colorFrom?: string;
  colorTo?: string;
  cx?: number;
  gap?: number;
}> = ({a, b, at, swapAt, out = 99999, y, size = 104, weight = 800, colorFrom = '#ffffff', colorTo = '#ffc93c', cx = 540, gap = 0.32}) => {
  const f = useCurrentFrame();
  const wa = useMemo(() => measure(a, size, weight), [a, size, weight]);
  const wb = useMemo(() => measure(b, size, weight), [b, size, weight]);
  const g = size * gap;
  const total = wa + wb + g;
  const left = cx - total / 2;
  // before: A at left, B after.   after: B at left, A after.
  const aFrom = left + wa / 2;
  const bFrom = left + wa + g + wb / 2;
  const bTo = left + wb / 2;
  const aTo = left + wb + g + wa / 2;
  const t = prog(f, swapAt, swapAt + 22, EASE.inOut);
  const reveal = prog(f, at, at + 18, EASE.out);
  const exit = prog(f, out, out + 12, EASE.in);
  const arc = Math.sin(t * Math.PI);
  const col = (k: number) => {
    // blend white→gold
    const c1 = [parseInt(colorFrom.slice(1, 3), 16), parseInt(colorFrom.slice(3, 5), 16), parseInt(colorFrom.slice(5, 7), 16)];
    const c2 = [parseInt(colorTo.slice(1, 3), 16), parseInt(colorTo.slice(3, 5), 16), parseInt(colorTo.slice(5, 7), 16)];
    return `rgb(${c1.map((v, i) => Math.round(lerp(v, c2[i], k))).join(',')})`;
  };
  const style = (x: number, dy: number, sc: number, rot: number): React.CSSProperties => ({
    position: 'absolute',
    left: x,
    top: y + dy,
    transform: `translate(-50%, -50%) scale(${sc}) rotate(${rot}deg)`,
    fontFamily: FONT,
    fontWeight: weight,
    fontSize: size,
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
    color: col(t),
    textShadow: `0 0 ${20 + 40 * t}px ${t > 0.05 ? `rgba(255,190,40,${0.45 * t})` : 'rgba(0,0,0,0.6)'}`,
  });
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: reveal * (1 - exit),
        filter: reveal < 1 ? `blur(${(1 - reveal) * 14}px)` : exit > 0 ? `blur(${exit * 10}px)` : undefined,
      }}
    >
      <div style={style(lerp(aFrom, aTo, t), -arc * size * 0.9 + (1 - reveal) * 30, 1 + arc * 0.08, arc * -6)}>{a}</div>
      <div style={style(lerp(bFrom, bTo, t), arc * size * 0.9 + (1 - reveal) * 30, 1 - arc * 0.06, arc * 6)}>{b}</div>
    </div>
  );
};
