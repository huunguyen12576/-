import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT, MONO, cue, eback, eio, eo, scene, sceneAlpha} from '../lib';

// Verified via GitHub API (repos/github/spec-kit) on 2026-11-02: 145,306 stars, 13,025 forks, MIT license.
const STARS_K = 145;
const FORKS_K = 13;

const Star: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" fill={color} />
  </svg>
);
const Fork: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round">
    <circle cx="6" cy="5" r="2.4" />
    <circle cx="18" cy="5" r="2.4" />
    <circle cx="12" cy="19" r="2.4" />
    <path d="M6 7.4v1.6a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7.4M12 12v4.6" />
  </svg>
);

export const Stats: React.FC<{t: number}> = ({t}) => {
  const [a, b] = scene('stats');
  const alpha = sceneAlpha(t, a, b, 0.4, 0.45);
  const oss = eback(t, a - 0.1, 0.5);
  const gh = eo(t, cue('c37').t0 - 0.1, 0.6);
  const st = cue('c38').t0 - 0.05;
  const count = Math.round(eio(t, st, 1.25) * STARS_K);
  const starPop = eback(t, st, 0.5);
  const fk = eback(t, cue('c39').t0 - 0.1, 0.5);
  const fkCount = Math.round(eio(t, cue('c39').t0 - 0.1, 0.7) * FORKS_K);
  const ring = eo(t, st + 1.2, 0.9);

  return (
    <AbsoluteFill style={{opacity: alpha}}>
      {/* repo card */}
      <div
        style={{
          position: 'absolute', left: 80, right: 80, top: 220, borderRadius: 36, padding: '36px 44px', background: '#FFFFFF',
          boxShadow: '0 30px 90px rgba(60,40,140,0.15)', border: '1px solid rgba(110,86,207,0.18)',
          opacity: Math.min(1, oss), transform: `translateY(${(1 - Math.min(1, oss)) * 60}px)`,
        }}
      >
        <div style={{fontFamily: MONO, fontSize: 40, color: C.ink}}>
          <span style={{color: C.inkSoft}}>github / </span>
          <b>spec-kit</b>
        </div>
        <div style={{display: 'flex', gap: 16, marginTop: 24, flexWrap: 'wrap'}}>
          <div style={{padding: '10px 22px', borderRadius: 999, background: C.mint, color: '#fff', fontFamily: FONT, fontWeight: 800, fontSize: 34, transform: `scale(${oss})`}}>
            Mã nguồn mở
          </div>
          <div style={{padding: '10px 22px', borderRadius: 999, background: 'rgba(21,22,43,0.06)', color: C.ink, fontFamily: MONO, fontSize: 32, opacity: oss}}>MIT</div>
          <div
            style={{
              padding: '10px 22px', borderRadius: 999, background: 'rgba(110,86,207,0.12)', color: C.violet, fontFamily: FONT,
              fontWeight: 800, fontSize: 34, opacity: gh, transform: `translateX(${(1 - gh) * 30}px)`,
            }}
          >
            Tạo bởi GitHub
          </div>
        </div>
      </div>

      {/* stars */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: eo(t, st - 0.1, 0.3)}}>
        <div style={{position: 'relative', transform: `scale(${0.7 + starPop * 0.3})`}}>
          <div
            style={{
              position: 'absolute', left: '50%', top: '50%', width: 170, height: 170, marginLeft: -85, marginTop: -85, borderRadius: '50%',
              border: `4px solid ${C.amber}`, transform: `scale(${1 + ring * 1.8})`, opacity: t > st + 1.2 ? 1 - ring : 0,
            }}
          />
          <Star size={150} color={C.amber} />
        </div>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 250, color: C.ink, lineHeight: 1.05, letterSpacing: -10, fontVariantNumeric: 'tabular-nums'}}>
          {count}K<span style={{color: C.violet}}>+</span>
        </div>
        <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 52, color: C.inkSoft, marginTop: -6}}>sao trên GitHub</div>
      </div>

      {/* forks */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: 1200, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 22,
          opacity: Math.min(1, fk), transform: `translateY(${(1 - Math.min(1, fk)) * 40}px)`,
        }}
      >
        <Fork size={72} color={C.violet} />
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 96, color: C.ink, fontVariantNumeric: 'tabular-nums'}}>{fkCount}K+</div>
        <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 48, color: C.inkSoft}}>lượt fork</div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1360, textAlign: 'center', fontFamily: MONO, fontSize: 24, color: C.inkSoft, opacity: fk * 0.9}}>
        Nguồn: GitHub API · 02/11/2026 · 145.306 ★ · 13.025 fork
      </div>
    </AbsoluteFill>
  );
};
