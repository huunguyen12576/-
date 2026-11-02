import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT, cue, eback, eio, eo, mix, rand, scene, sceneAlpha} from '../lib';
import {Rise} from '../ui';

const ROWS = [
  {cue: 'c32', label: 'Giờ sửa lỗi ngớ ngẩn', up: false},
  {cue: 'c33', label: 'Code vô nghĩa', up: false},
  {cue: 'c34', label: 'Độ dễ đoán', up: true},
];

const Arrow: React.FC<{up: boolean; color: string}> = ({up, color}) => (
  <svg width="40" height="40" viewBox="0 0 24 24" style={{transform: up ? 'none' : 'rotate(180deg)'}}>
    <path d="M12 20V5M5 11l7-7 7 7" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 64 particles: 40 "good" (become an ordered grid), 12 bugs (red), 12 junk (grey)
const DOTS = Array.from({length: 64}, (_, i) => ({kind: i < 40 ? 'good' : i < 52 ? 'bug' : 'junk', i}));
const FIELD = {x: 130, y: 930, w: 820, h: 440};

export const Results: React.FC<{t: number}> = ({t}) => {
  const [a, b] = scene('results');
  const alpha = sceneAlpha(t, a, b, 0.4, 0.4);
  const q = cue('c31').t0;
  const head = eback(t, a + 0.0, 0.6);
  const fieldIn = eo(t, q + 0.2, 0.7);
  const tBug = cue('c32').t0 + 0.2;
  const tJunk = cue('c33').t0 + 0.2;
  const tOrder = cue('c34').t0 + 0.6;

  return (
    <AbsoluteFill style={{opacity: alpha}}>
      <div
        style={{
          position: 'absolute', left: 90, top: 220, fontFamily: FONT, fontWeight: 900, fontSize: 150, color: C.ink, letterSpacing: -5,
          lineHeight: 1.15, transform: `scale(${0.85 + head * 0.15})`, transformOrigin: '0% 50%', opacity: Math.min(1, head),
        }}
      >
        Kết quả<span style={{color: C.violet}}>?</span>
      </div>
      {ROWS.map((r, i) => {
        const at = cue(r.cue).t0 - 0.1;
        const col = r.up ? C.violet : C.mint;
        return (
          <div key={i} style={{position: 'absolute', left: 90, right: 90, top: 470 + i * 128}}>
            <Rise t={t} at={at} dur={0.55}>
              <div style={{display: 'flex', alignItems: 'center', gap: 26}}>
                <div style={{width: 76, height: 76, borderRadius: 24, background: r.up ? 'rgba(110,86,207,0.12)' : 'rgba(20,168,110,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <Arrow up={r.up} color={col} />
                </div>
                <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 58, color: C.ink, lineHeight: 1.25}}>{r.label}</div>
                <div style={{flex: 1}} />
                <div style={{fontFamily: FONT, fontWeight: 600, fontSize: 38, color: col}}>{r.up ? 'cao hơn' : 'ít hơn'}</div>
              </div>
            </Rise>
          </div>
        );
      })}

      {/* chaos → order */}
      <div
        style={{
          position: 'absolute', left: FIELD.x - 30, top: FIELD.y - 30, width: FIELD.w + 60, height: FIELD.h + 60, borderRadius: 40,
          background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(110,86,207,0.15)', opacity: fieldIn,
        }}
      />
      <svg width="1080" height="1920" style={{position: 'absolute', inset: 0, opacity: fieldIn}}>
        {DOTS.map(({kind, i}) => {
          const jx = Math.sin(t * (1.3 + rand(i) * 2.2) + i) * 26;
          const jy = Math.cos(t * (1.1 + rand(i + 9) * 2.0) + i * 2) * 26;
          const cx0 = FIELD.x + 30 + rand(i * 3 + 1) * (FIELD.w - 60) + jx;
          const cy0 = FIELD.y + 30 + rand(i * 5 + 2) * (FIELD.h - 60) + jy;
          let r = 16;
          let fill: string = kind === 'bug' ? C.red : kind === 'junk' ? '#A9ABC2' : C.ink;
          let cx = cx0;
          let cy = cy0;
          if (kind === 'bug') r *= 1 - eio(t, tBug + rand(i) * 0.5, 0.35);
          if (kind === 'junk') r *= 1 - eio(t, tJunk + rand(i) * 0.5, 0.35);
          if (kind === 'good') {
            const col = i % 8;
            const row = Math.floor(i / 8);
            const gx = FIELD.x + 60 + col * ((FIELD.w - 120) / 7);
            const gy = FIELD.y + 50 + row * ((FIELD.h - 100) / 4);
            const p = eio(t, tOrder - 0.5 + (col + row) * 0.03, 0.7);
            cx = mix(cx0, gx, p);
            cy = mix(cy0, gy, p);
            fill = p > 0.5 ? C.violet : C.ink;
            r = 16 + p * 4;
          }
          return r > 0.5 ? <circle key={i} cx={cx} cy={cy} r={r} fill={fill} opacity={0.9} /> : null;
        })}
      </svg>
    </AbsoluteFill>
  );
};
