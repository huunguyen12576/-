import React from 'react';
import {Img, staticFile} from 'remotion';
import {Ball, RED} from './parts';
import {HOOK_FLOOR, R, S, clamp, ease, hookBall, inv, periodBall, tween, v} from './timeline';

const font = 'Montserrat, sans-serif';
const kick = (f: number, at: number, amp: number) => {
  const t = f - at;
  return t < 0 ? 0 : amp * Math.exp(-t / 3.5) * Math.sin(t * 2.2);
};

/** chữ "đập" xuống theo nhịp bóng nảy */
const Slam: React.FC<{f: number; at: number; children: React.ReactNode; style?: React.CSSProperties}> = ({f, at, children, style}) => {
  const t = inv(at, at + 9, f);
  const s = 1 + (1 - ease.outQuint(t)) * 0.35;
  return (
    <div
      style={{
        opacity: clamp(t * 2.5),
        transform: `scale(${s})`,
        filter: `blur(${(1 - ease.out(t)) * 10}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ================================================================ MÓC MỞ ĐẦU
export const Hook: React.FC<{f: number}> = ({f}) => {
  if (f > S.hookOut + 16) return null;
  const SC = 2.7;
  const {p, squash} = hookBall(f);
  const out = ease.in(inv(S.hookOut, S.hookOut + 14, f));
  const shake = kick(f, S.hookThud, 22) + kick(f, 32, 9);
  const ring = inv(S.hookThud, S.hookThud + 22, f);
  const ring2 = inv(32, 50, f);
  const floorGlow = f >= S.hookThud ? 0.35 + 0.65 * Math.exp(-(f - S.hookThud) / 8) : 0;
  const ballY = p.y + 40 - R * SC; // đáy bóng chạm sàn
  return (
    <div style={{position: 'absolute', inset: 0, opacity: 1 - out, transform: `translateY(${shake}px) scale(${1 + out * 0.18})`}}>
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <defs>
          <linearGradient id="hookfloor" x1="0" x2="1">
            <stop offset="0" stopColor="#fff" stopOpacity={0} />
            <stop offset="0.5" stopColor="#fff" stopOpacity={1} />
            <stop offset="1" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="hookrefl" gradientUnits="userSpaceOnUse" x1="0" y1={HOOK_FLOOR} x2="0" y2={HOOK_FLOOR + 220}>
            <stop offset="0" stopColor="#fff" stopOpacity={1} />
            <stop offset="1" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
          <mask id="hookreflmask">
            <rect x={0} y={HOOK_FLOOR} width={1080} height={240} fill="url(#hookrefl)" />
          </mask>
        </defs>
        <rect x={0} y={HOOK_FLOOR - 1.5} width={1080} height={3} fill="url(#hookfloor)" opacity={0.25 + floorGlow * 0.6} />
        {ring > 0 && ring < 1 && (
          <ellipse cx={540} cy={HOOK_FLOOR} rx={60 + ease.out(ring) * 520} ry={8 + ease.out(ring) * 60} fill="none" stroke="#fff" strokeWidth={3 * (1 - ring)} opacity={(1 - ring) * 0.7} />
        )}
        {ring2 > 0 && ring2 < 1 && (
          <ellipse cx={540} cy={HOOK_FLOOR} rx={60 + ease.out(ring2) * 320} ry={8 + ease.out(ring2) * 36} fill="none" stroke={RED} strokeWidth={2.5 * (1 - ring2)} opacity={(1 - ring2) * 0.7} />
        )}
        <ellipse cx={540} cy={HOOK_FLOOR + 6} rx={70 + (HOOK_FLOOR - ballY) * 0.05} ry={10} fill="#000" opacity={0.9} filter="url(#blur3)" />
        <ellipse cx={540} cy={HOOK_FLOOR} rx={240} ry={26} fill={RED} opacity={floorGlow * 0.25} filter="url(#blur14)" />
        <g mask="url(#hookreflmask)" opacity={0.3}>
          <g transform={`translate(0 ${HOOK_FLOOR * 2}) scale(1 -1)`} filter="url(#blur2)">
            <g transform={`translate(${p.x} ${ballY}) scale(${SC})`}>
              <Ball p={v(0, 0)} rot={f * 0.12} squash={squash} id="hookm" glow={0.8} />
            </g>
          </g>
        </g>
        <g transform={`translate(${p.x} ${ballY}) scale(${SC})`}>
          <Ball p={v(0, 0)} rot={f * 0.12} squash={squash} id="hook" glow={0.8} />
        </g>
      </svg>
      <div style={{position: 'absolute', top: 560, width: 1080, textAlign: 'center', fontFamily: font, color: '#fff'}}>
        <Slam f={f} at={S.hookThud}>
          <div style={{fontSize: 132, fontWeight: 900, letterSpacing: '-0.01em', lineHeight: 1.15}}>BẠN LÀ AI</div>
        </Slam>
        <Slam f={f} at={32}>
          <div style={{fontSize: 62, fontWeight: 800, letterSpacing: '0.06em', marginTop: 14}}>
            TRONG <span style={{color: RED, textShadow: '0 0 30px rgba(255,46,42,0.6)'}}>3</span> NGƯỜI NÀY?
          </div>
        </Slam>
      </div>
    </div>
  );
};

// ================================================================ KẾT
const Word: React.FC<{f: number; at: number; children: React.ReactNode; color?: string}> = ({f, at, children, color}) => {
  const t = ease.out(inv(at, at + 12, f));
  return (
    <span style={{display: 'inline-block', opacity: t, transform: `translateY(${(1 - t) * 34}px)`, filter: `blur(${(1 - t) * 8}px)`, color}}>
      {children}
    </span>
  );
};

const Line: React.FC<{f: number; at: number; children: React.ReactNode}> = ({f, at, children}) => {
  const t = ease.outQuint(inv(at, at + 16, f));
  return (
    <div style={{overflow: 'hidden', paddingTop: 22, marginTop: -22}}>
      <div style={{transform: `translateY(${(1 - t) * 110}%)`, opacity: clamp(t * 1.6)}}>{children}</div>
    </div>
  );
};

export const Ending: React.FC<{f: number}> = ({f}) => {
  if (f < S.line1 - 2) return null;
  const words1 = ['Đừng', 'đợi', 'cú', 'ném', 'hoàn', 'hảo.'];
  const BIG = 108;
  const pb = periodBall(f, v(0, 0));
  const landed = f >= S.periodDrop ? Math.exp(-(f - S.periodDrop) / 14) : 0;
  const ctaT = ease.out(inv(S.cta, S.cta + 18, f));
  const push = 1 + inv(S.endFade, S.end, f) * 0.04;
  return (
    <div style={{position: 'absolute', inset: 0, fontFamily: font, color: '#fff', transform: `scale(${push})`}}>
      <div style={{position: 'absolute', top: 590, width: 1080, textAlign: 'center', fontSize: 50, fontWeight: 600, color: '#b8b8b8', letterSpacing: '0.005em'}}>
        {words1.map((w, k) => (
          <React.Fragment key={k}>
            <Word f={f} at={S.line1 + k * 3}>{w}</Word>{' '}
          </React.Fragment>
        ))}
      </div>
      <div style={{position: 'absolute', top: 735, width: 1080, textAlign: 'center', fontSize: BIG, fontWeight: 900, lineHeight: 1.22, letterSpacing: '-0.01em'}}>
        <Line f={f} at={S.line2}>
          HÃY CỨ <span style={{color: RED, textShadow: '0 0 40px rgba(255,46,42,0.45)'}}>NÉM</span>
        </Line>
        <Line f={f} at={S.line2 + 7}>CHO ĐẾN KHI</Line>
        <Line f={f} at={S.line2 + 14}>
          <span style={{display: 'inline-flex', alignItems: 'baseline'}}>
            NÓ HOÀN HẢO
            <span style={{display: 'inline-block', width: 58, height: 10, position: 'relative', marginLeft: 10}}>
              <svg width={58} height={58} viewBox="-29 -29 58 58" style={{position: 'absolute', left: 0, bottom: -4, overflow: 'visible'}}>
                <g opacity={pb.a} transform={`translate(0 ${pb.p.y - 4})`}>
                  {landed > 0 && <circle r={60} fill={RED} opacity={landed * 0.5} filter="url(#blur14)" />}
                  <g transform="scale(1.75)">
                    <Ball p={v(0, 0)} rot={f * 0.1} squash={pb.squash} id="period" glow={0.9} />
                  </g>
                </g>
              </svg>
            </span>
          </span>
        </Line>
      </div>
      <div style={{position: 'absolute', top: 1310, width: 1080, textAlign: 'center', opacity: ctaT, transform: `translateY(${(1 - ctaT) * 20}px)`}}>
        <div style={{width: 64, height: 3, background: RED, margin: '0 auto 34px', transform: `scaleX(${ctaT})`, boxShadow: '0 0 18px rgba(255,46,42,0.7)'}} />
        <div style={{fontSize: 22, fontWeight: 700, letterSpacing: '0.32em', color: '#7d7d7d'}}>BẠN LÀ AI TRONG 3 NGƯỜI?</div>
        <div style={{fontSize: 42, fontWeight: 600, marginTop: 18, color: '#f2f2f2'}}>Cú ném tiếp theo sẽ trả lời.</div>
      </div>
    </div>
  );
};

// ================================================================ hậu kỳ: vignette, grain, flash
export const Post: React.FC<{f: number; swish: number}> = ({f, swish}) => {
  const fl = f >= swish ? Math.exp(-(f - swish) / 5) : 0;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 50%, rgba(255,60,50,${fl * 0.35}) 0%, rgba(255,40,30,${fl * 0.12}) 40%, transparent 75%)`, mixBlendMode: 'screen'}} />
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 75% 60% at 50% 48%, transparent 55%, rgba(0,0,0,0.78) 100%)'}} />
      <Img
        src={staticFile(`grain/g${Math.floor(f / 2) % 8}.png`)}
        style={{position: 'absolute', inset: 0, width: 1080, height: 1920, mixBlendMode: 'overlay', opacity: 0.16, imageRendering: 'pixelated'}}
      />
    </>
  );
};

export const GlobalDefs: React.FC = () => (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <defs>
      <filter id="blur2" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation={1.6} />
      </filter>
      <filter id="blur3" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation={3} />
      </filter>
      <filter id="blur9" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation={9} />
      </filter>
      <filter id="blur14" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation={16} />
      </filter>
    </defs>
  </svg>
);

export {tween};
