import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT, MONO, clamp, eio, eo, lin, scene, sceneAlpha} from '../lib';

const PROMPT = 'làm app quản lý công việc. đẹp vào. chạy là được';
const TYPE_A = 0.35;
const TYPE_B = 2.25;
const ENTER = 2.55;

export const Hook: React.FC<{t: number}> = ({t}) => {
  const [a, b] = scene('hook');
  const alpha = sceneAlpha(t, a, b + 0.15, 0.25, 0.4);
  const n = Math.floor(clamp((t - TYPE_A) / (TYPE_B - TYPE_A)) * PROMPT.length);
  const typed = PROMPT.slice(0, n);
  const sent = eo(t, ENTER, 0.55);
  const caretOn = Math.floor(t * 2.4) % 2 === 0 || (t > TYPE_A && t < TYPE_B);
  // camera: slow push-in, then a fast push toward the "Working…" line on "cầu nguyện"
  const push = 1 + t * 0.018 + eio(t, 3.55, 1.1) * 0.12;
  const flash = Math.max(0, 1 - Math.abs(t - ENTER) / 0.12) * 0.5;
  const working = eo(t, 3.0, 0.4);
  const dots = '.'.repeat(1 + (Math.floor(t * 3) % 3));
  const pray = eio(t, 3.6, 0.9);

  return (
    <AbsoluteFill style={{opacity: alpha, transform: `scale(${push})`, transformOrigin: '50% 58%'}}>
      {/* sent bubble */}
      <div
        style={{
          position: 'absolute', right: 100, top: 760 - sent * 200, maxWidth: 760, opacity: sent,
          padding: '28px 34px', borderRadius: '32px 32px 8px 32px', background: 'rgba(139,124,255,0.18)',
          border: '1px solid rgba(139,124,255,0.35)', color: C.nightInk, fontFamily: FONT, fontSize: 44, lineHeight: 1.35,
          fontWeight: 400,
        }}
      >
        {PROMPT}
      </div>
      {/* agent status */}
      <div
        style={{
          position: 'absolute', left: 100, top: 800, opacity: working * (1 - pray * 0.2), display: 'flex', alignItems: 'center',
          gap: 22, fontFamily: MONO, fontSize: 38, color: 'rgba(236,234,255,0.75)',
        }}
      >
        <svg width="46" height="46" viewBox="0 0 46 46" style={{transform: `rotate(${t * 360}deg)`}}>
          <circle cx="23" cy="23" r="18" stroke="rgba(139,124,255,0.25)" strokeWidth="5" fill="none" />
          <path d="M23 5 A18 18 0 0 1 41 23" stroke={C.violetGlow} strokeWidth="5" fill="none" strokeLinecap="round" />
        </svg>
        Agent đang làm việc{dots}
      </div>
      {/* input box */}
      <div
        style={{
          position: 'absolute', left: 80, right: 80, top: 1040, minHeight: 220, borderRadius: 36, padding: '38px 40px',
          background: 'rgba(22,20,40,0.85)', border: `2px solid rgba(139,124,255,${0.25 + flash})`,
          boxShadow: `0 0 ${60 + flash * 200}px rgba(139,124,255,${0.18 + flash})`,
          transform: `translateY(${sent * 40}px)`,
        }}
      >
        <div style={{fontFamily: FONT, fontSize: 48, lineHeight: 1.38, color: '#FFFFFF', fontWeight: 400}}>
          {t < ENTER ? typed : ''}
          <span style={{opacity: caretOn ? 1 : 0, color: C.violetGlow, fontWeight: 300}}>▍</span>
          {t >= ENTER && <span style={{color: 'rgba(236,234,255,0.35)'}}> Hỏi agent bất cứ điều gì…</span>}
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 34, alignItems: 'center'}}>
          <div style={{fontFamily: MONO, fontSize: 28, color: 'rgba(236,234,255,0.4)'}}>agent mode</div>
          <div
            style={{
              width: 76, height: 76, borderRadius: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: t >= ENTER - 0.05 && t < ENTER + 0.25 ? '#FFFFFF' : C.violetGlow,
              transform: `scale(${1 - Math.max(0, 1 - Math.abs(t - ENTER) / 0.12) * 0.15})`,
            }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7" stroke={C.night} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
      </div>
      {/* "and pray" — darkness closes in around the waiting line */}
      <AbsoluteFill
        style={{
          pointerEvents: 'none', opacity: pray,
          background: `radial-gradient(42% 14% at 32% 42%, rgba(0,0,0,0) 0%, rgba(4,4,10,${0.25 + lin(t, 3.6, 1) * 0.6}) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
