import React from 'react';
import {eo} from './lib';

/** Masked rise-in text. Generous vertical padding keeps Vietnamese diacritics unclipped. */
export const Rise: React.FC<{
  t: number;
  at: number;
  dur?: number;
  out?: number; // time to exit (optional)
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({t, at, dur = 0.7, out, style, children}) => {
  const p = eo(t, at, dur);
  const q = out !== undefined ? eo(t, out, 0.45) : 0;
  return (
    <div style={{overflow: 'hidden', padding: '0.22em 0.06em 0.18em', margin: '-0.22em -0.06em -0.18em', ...style}}>
      <div
        style={{
          transform: `translateY(${(1 - p) * 110 - q * 110}%)`,
          opacity: Math.min(p * 1.4, 1 - q),
          filter: `blur(${(1 - p) * 6}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Per-word stagger reveal */
export const Words: React.FC<{
  t: number;
  at: number;
  text: string;
  stagger?: number;
  style?: React.CSSProperties;
  wordStyle?: (i: number, w: string) => React.CSSProperties;
}> = ({t, at, text, stagger = 0.06, style, wordStyle}) => (
  <div style={{display: 'flex', flexWrap: 'wrap', columnGap: '0.26em', ...style}}>
    {text.split(' ').map((w, i) => (
      <Rise key={i} t={t} at={at + i * stagger} dur={0.6}>
        <span style={wordStyle ? wordStyle(i, w) : undefined}>{w}</span>
      </Rise>
    ))}
  </div>
);

export const Eyebrow: React.FC<{color: string; children: React.ReactNode; style?: React.CSSProperties}> = ({color, children, style}) => (
  <div
    style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 30, letterSpacing: 4, textTransform: 'uppercase',
      color, fontWeight: 700, ...style,
    }}
  >
    {children}
  </div>
);
