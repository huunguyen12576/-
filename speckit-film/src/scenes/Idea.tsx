import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT, MONO, cue, eback, eio, eo, scene, sceneAlpha} from '../lib';
import {Eyebrow, Rise} from '../ui';

const SPEC: {k: 'h1' | 'h2' | 'li' | 'sp'; s: string}[] = [
  {k: 'h1', s: '# spec.md'},
  {k: 'h2', s: '## Người dùng cần gì?'},
  {k: 'li', s: '- Tạo, giao, theo dõi công việc'},
  {k: 'sp', s: ''},
  {k: 'h2', s: '## Yêu cầu'},
  {k: 'li', s: '- Lọc theo trạng thái'},
  {k: 'li', s: '- Thông báo khi tới hạn'},
  {k: 'sp', s: ''},
  {k: 'h2', s: '## Tiêu chí chấp nhận'},
  {k: 'li', s: '- [ ] Tạo việc trong < 3 thao tác'},
];

export const LockIcon: React.FC<{open: number; color: string; size?: number}> = ({open, color, size = 90}) => (
  <svg width={size} height={size} viewBox="0 0 90 90">
    <path
      d={`M27 40 V28 a18 18 0 0 1 36 0 V${40 - open * 14}`}
      stroke={color} strokeWidth="8" fill="none" strokeLinecap="round"
      transform={`translate(${open * 18} ${-open * 6})`}
    />
    <rect x="16" y="40" width="58" height="42" rx="10" fill={color} />
    <circle cx="45" cy="58" r="6" fill="#fff" />
    <rect x="42" y="60" width="6" height="12" rx="3" fill="#fff" />
  </svg>
);

export const Idea: React.FC<{t: number}> = ({t}) => {
  const [a, b] = scene('idea');
  const alpha = sceneAlpha(t, a, b, 0.45, 0.4);
  const specIn = eo(t, 16.6, 0.9);
  const lineT0 = 17.4;
  const lineDt = 0.4;
  const lock = cue('c11').t0;
  const lockPulse = Math.max(0, 1 - Math.abs(t - lock - 0.25) / 0.35);
  const exit = eio(t, b - 0.45, 0.5);
  const cam = 1 + (t - a) * 0.006;

  return (
    <AbsoluteFill style={{opacity: alpha, transform: `scale(${cam}) translateY(${-exit * 60}px)`}}>
      <div style={{position: 'absolute', left: 90, top: 210}}>
        <Rise t={t} at={15.45}>
          <Eyebrow color={C.violet}>Ý tưởng cốt lõi · chỉ một</Eyebrow>
        </Rise>
      </div>
      <div style={{position: 'absolute', left: 84, top: 280, fontFamily: FONT, fontWeight: 900, fontSize: 150, lineHeight: 1.12, letterSpacing: -5}}>
        <Rise t={t} at={cue('c10').t0 - 0.05}>
          <span style={{color: C.ink}}>Spec trước.</span>
        </Rise>
        <Rise t={t} at={cue('c11').t0 - 0.05}>
          <span style={{color: C.violet}}>Code sau.</span>
        </Rise>
      </div>

      {/* locked code editor, behind */}
      <div
        style={{
          position: 'absolute', left: 560, top: 760, width: 440, height: 560, borderRadius: 28,
          background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(21,22,43,0.08)',
          transform: `perspective(1600px) rotateY(-14deg) translateX(${(1 - specIn) * 120}px)`, opacity: specIn * 0.95,
          boxShadow: '0 30px 80px rgba(60,40,140,0.12)', overflow: 'hidden',
        }}
      >
        <div style={{padding: '22px 26px', fontFamily: MONO, fontSize: 24, color: C.inkSoft, borderBottom: '1px solid rgba(21,22,43,0.08)'}}>src/</div>
        {Array.from({length: 9}).map((_, i) => (
          <div key={i} style={{margin: '22px 26px', height: 14, width: `${40 + ((i * 37) % 50)}%`, borderRadius: 7, background: 'rgba(21,22,43,0.08)'}} />
        ))}
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 18, background: 'rgba(238,240,250,0.55)',
          }}
        >
          <div style={{transform: `scale(${1 + lockPulse * 0.18})`}}>
            <LockIcon open={0} color={C.ink} />
          </div>
          <div style={{fontFamily: MONO, fontSize: 26, color: C.ink, textAlign: 'center', lineHeight: 1.4}}>
            0 dòng code
            <br />
            <span style={{color: C.inkSoft}}>cho tới khi spec xong</span>
          </div>
        </div>
      </div>

      {/* the spec writing itself */}
      <div
        style={{
          position: 'absolute', left: 80, top: 700, width: 600, height: 680, borderRadius: 30, padding: '38px 40px',
          background: '#FFFFFF', boxShadow: '0 40px 100px rgba(60,40,140,0.18)', border: '1px solid rgba(110,86,207,0.18)',
          transform: `translateY(${(1 - specIn) * 120}px) perspective(1600px) rotateY(${(1 - specIn) * 10 + 4}deg)`, opacity: specIn,
        }}
      >
        {SPEC.map((l, i) => {
          const p = eo(t, lineT0 + i * lineDt, 0.5);
          const chars = Math.floor(Math.min(1, (t - (lineT0 + i * lineDt)) / 0.35) * l.s.length);
          const style: React.CSSProperties =
            l.k === 'h1'
              ? {fontFamily: MONO, fontWeight: 700, fontSize: 34, color: C.violet, marginBottom: 14}
              : l.k === 'h2'
                ? {fontFamily: FONT, fontWeight: 800, fontSize: 32, color: C.ink, marginTop: 6}
                : l.k === 'li'
                  ? {fontFamily: FONT, fontWeight: 400, fontSize: 29, color: C.inkSoft}
                  : {height: 18};
          return (
            <div key={i} style={{...style, opacity: p, lineHeight: 1.5, whiteSpace: 'nowrap'}}>
              {chars > 0 ? l.s.slice(0, chars) : ' '}
            </div>
          );
        })}
        <div
          style={{
            position: 'absolute', right: 30, bottom: 28, fontFamily: MONO, fontSize: 24, padding: '8px 16px', borderRadius: 10,
            color: '#fff', background: C.mint, opacity: eback(t, 21.2, 0.4), transform: `scale(${0.7 + eback(t, 21.2, 0.4) * 0.3})`,
          }}
        >
          ✓ có cấu trúc
        </div>
      </div>
    </AbsoluteFill>
  );
};
