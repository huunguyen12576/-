import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT, MONO, cue, eio, eo, scene, sceneAlpha} from '../lib';
import {Eyebrow, Rise} from '../ui';

export const Reveal: React.FC<{t: number}> = ({t}) => {
  const [a, b] = scene('reveal');
  const alpha = sceneAlpha(t, a - 0.55, b, 0.25, 0.45);
  const open = eio(t, 11.15, 1.1);
  const seam = Math.max(0, 1 - Math.abs(open - 0.15) * 2.2);
  const title = cue('c8').t0 - 0.12;
  const guides = eio(t, title - 0.5, 0.9);
  const exitUp = eio(t, b - 0.45, 0.5);
  const letters = 'Spec Kit'.split('');

  return (
    <AbsoluteFill style={{opacity: alpha}}>
      <AbsoluteFill style={{transform: `translateY(${-exitUp * 120}px)`}}>
        <div style={{position: 'absolute', top: 560, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <Rise t={t} at={11.55} dur={0.8}>
            <Eyebrow color={C.violet}>GitHub · lời giải</Eyebrow>
          </Rise>
        </div>

        {/* construction guides around the title */}
        <svg width="1080" height="1920" style={{position: 'absolute', inset: 0}}>
          {[690, 930].map((y, k) => (
            <line key={k} x1={540 - 520 * guides} x2={540 + 520 * guides} y1={y} y2={y} stroke={C.violet} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="10 10" />
          ))}
          {[110, 970].map((x, k) => (
            <line key={k} x1={x} x2={x} y1={810 - 200 * guides} y2={810 + 200 * guides} stroke={C.violet} strokeOpacity={0.3} strokeWidth={2} />
          ))}
          {[[110, 690], [970, 690], [110, 930], [970, 930]].map(([x, y], k) => (
            <circle key={k} cx={x} cy={y} r={9 * guides} fill="none" stroke={C.violet} strokeWidth={3} />
          ))}
          <text x={540} y={984} textAnchor="middle" fontFamily={MONO} fontSize={24} fill={C.violet} opacity={guides * 0.7}>
            ← spec trước khi code →
          </text>
        </svg>

        <div style={{position: 'absolute', top: 668, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          {letters.map((ch, i) => {
            const p = eo(t, title + i * 0.045, 0.7);
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block', fontFamily: FONT, fontWeight: 900, fontSize: 218, letterSpacing: -8, color: C.ink,
                  transform: `translateY(${(1 - p) * 80}px) scale(${0.9 + p * 0.1})`, opacity: p, filter: `blur(${(1 - p) * 10}px)`,
                  width: ch === ' ' ? 56 : undefined,
                }}
              >
                {ch === ' ' ? '' : ch}
              </span>
            );
          })}
        </div>
        <div style={{position: 'absolute', top: 1060, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: eo(t, title + 0.45, 0.6)}}>
          <div
            style={{
              fontFamily: MONO, fontSize: 34, color: C.violet, padding: '14px 28px', borderRadius: 999,
              background: 'rgba(110,86,207,0.10)', border: '1px solid rgba(110,86,207,0.3)',
            }}
          >
            github.com/github/spec-kit
          </div>
        </div>
      </AbsoluteFill>

      {/* dawn: the darkness splits open along a line of light */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 960 * (1 - open), background: '#000'}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 960 * (1 - open), background: '#000'}} />
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: 958, height: 4, background: '#fff',
          boxShadow: `0 0 80px 30px rgba(185,174,245,${seam}), 0 0 12px 4px #fff`, opacity: seam,
        }}
      />
    </AbsoluteFill>
  );
};
