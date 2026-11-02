import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT, MONO, cue, eback, eio, eo, scene, sceneAlpha} from '../lib';
import {Eyebrow, Rise} from '../ui';
import {LockIcon} from './Idea';

const Icon: React.FC<{k: number; color: string}> = ({k, color}) => {
  const s = {stroke: color, strokeWidth: 6, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  if (k === 0)
    return (
      <svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="22" {...s} /><circle cx="32" cy="32" r="10" {...s} /><circle cx="32" cy="32" r="2" fill={color} /></svg>
    );
  if (k === 1)
    return (
      <svg width="64" height="64" viewBox="0 0 64 64"><path d="M22 24a10 10 0 1 1 14 9c-3 1.5-4 3.5-4 7" {...s} /><circle cx="32" cy="50" r="3.5" fill={color} /></svg>
    );
  if (k === 2)
    return (
      <svg width="64" height="64" viewBox="0 0 64 64"><path d="M32 10 54 22 32 34 10 22Z" {...s} /><path d="M10 32l22 12 22-12M10 42l22 12 22-12" {...s} /></svg>
    );
  return (
    <svg width="64" height="64" viewBox="0 0 64 64"><path d="M22 18 8 32l14 14M42 18l14 14-14 14M36 12 28 52" {...s} /></svg>
  );
};

const STEPS = [
  {cue: 'c13', title: 'Hiểu', sub: 'bạn muốn xây gì'},
  {cue: 'c14', title: 'Hỏi', sub: 'những gì còn thiếu'},
  {cue: 'c15', title: 'Tổ chức', sub: 'cấu trúc dự án'},
  {cue: 'c17', title: 'Lập trình', sub: 'chỉ sau cùng'},
];

export const Steps: React.FC<{t: number}> = ({t}) => {
  const [a, b] = scene('steps');
  const alpha = sceneAlpha(t, a, b, 0.4, 0.4);
  const top = 470;
  const gap = 250;
  const unlock = eio(t, cue('c17').t0 - 0.12, 0.45);
  const lastOn = cue('c17').t0 - 0.1;
  // the travelling progress line: fills toward each node as it activates
  const lineH = [1, 2, 3].reduce((acc, i) => acc + eio(t, cue(STEPS[i].cue).t0 - 0.55, 0.5) * gap, 0);
  const prog = STEPS.reduce((acc, s, i) => (t >= cue(s.cue).t0 - 0.1 ? i : acc), -1);
  const camY = -lineH * 0.16; void prog;

  return (
    <AbsoluteFill style={{opacity: alpha, transform: `translateY(${camY}px)`}}>
      <div style={{position: 'absolute', left: 90, top: 250}}>
        <Rise t={t} at={cue('c12').t0 - 0.05}>
          <Eyebrow color={C.violet}>Đầu tiên, AI sẽ…</Eyebrow>
        </Rise>
      </div>
      {/* rail */}
      <div style={{position: 'absolute', left: 152, top: top + 60, width: 6, height: gap * 3, borderRadius: 3, background: 'rgba(21,22,43,0.08)'}} />
      <div
        style={{
          position: 'absolute', left: 152, top: top + 60, width: 6, borderRadius: 3, background: C.violet,
          height: lineH, boxShadow: `0 0 18px ${C.violetGlow}`,
        }}
      />
      {STEPS.map((s, i) => {
        const at = cue(s.cue).t0 - 0.1;
        const p = eback(t, at, 0.5);
        const isLast = i === 3;
        const active = t >= at;
        const done = isLast ? unlock > 0.5 : t >= at;
        const col = isLast ? (done ? C.mint : C.inkSoft) : C.violet;
        const dim = active ? 1 : 0.28;
        return (
          <div key={i} style={{position: 'absolute', left: 90, top: top + i * gap, display: 'flex', alignItems: 'center', gap: 44, opacity: isLast ? Math.max(0.28, eo(t, 28.3, 0.4)) : Math.max(dim, 0.28)}}>
            <div
              style={{
                width: 130, height: 130, borderRadius: 40, background: active || (isLast && t > 28.3) ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${active ? 0.85 + p * 0.15 : 0.85})`,
                boxShadow: active ? `0 20px 50px rgba(110,86,207,0.22), 0 0 0 ${isLast && done ? 6 : 3}px ${col}` : 'none',
              }}
            >
              {isLast && !done ? <LockIcon open={unlock} color={C.inkSoft} size={70} /> : <Icon k={i} color={col} />}
            </div>
            <div>
              <div style={{fontFamily: MONO, fontSize: 26, color: col, fontWeight: 700, letterSpacing: 2}}>0{i + 1}</div>
              <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 92, color: C.ink, lineHeight: 1.15, letterSpacing: -2}}>{s.title}</div>
              <div style={{fontFamily: FONT, fontWeight: 400, fontSize: 40, color: C.inkSoft, lineHeight: 1.3}}>{s.sub}</div>
            </div>
          </div>
        );
      })}
      {/* unlock burst */}
      <svg width="1080" height="1920" style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
        {Array.from({length: 12}).map((_, k) => {
          const ang = (k / 12) * Math.PI * 2;
          const p = eo(t, lastOn, 0.7);
          const r0 = 80 + p * 40;
          const r1 = 80 + p * 130;
          const cx = 155;
          const cy = top + 3 * gap + 65;
          return (
            <line
              key={k} x1={cx + Math.cos(ang) * r0} y1={cy + Math.sin(ang) * r0} x2={cx + Math.cos(ang) * r1} y2={cy + Math.sin(ang) * r1}
              stroke={C.mint} strokeWidth={6} strokeLinecap="round" opacity={t > lastOn ? 1 - p : 0}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
