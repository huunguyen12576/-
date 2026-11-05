import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/800.css';
import '@fontsource/montserrat/900.css';
import {backOut, clamp, easeIn, easeOut, lerp, prog, springy} from './engine';
import {BottomPanel, TopPanel} from './Panels';
import {Street} from './Street';
import T from './timeline.json';

const FONT = 'Montserrat, sans-serif';
const PANEL_W = 1000;
const PANEL_H = 640;
const TOP_Y = 270;
const CLOCK_Y = 960;
const BOT_Y = 1010;

// ---------------------------------------------------------------- labels
type Sub = {at: number; text: string; red?: boolean};
const TOP_SUBS: Sub[] = [
  {at: 45, text: '06:00'},
  {at: 56, text: 'TẮT BÁO THỨC'},
  {at: 100, text: 'HÍT ĐẤT'},
  {at: 192, text: 'ỐP TRỨNG'},
  {at: 270, text: 'TẮM'},
  {at: 350, text: 'SẴN SÀNG'},
];
const BOT_SUBS: Sub[] = [
  {at: 45, text: '06:00'},
  {at: 60, text: 'BÁO LẠI'},
  {at: 122, text: 'BÁO LẠI ×2'},
  {at: 190, text: 'BÁO LẠI ×3'},
  {at: 236, text: 'MUỘN RỒI!', red: true},
  {at: 280, text: 'ĂN VỘI'},
  {at: 316, text: 'KHÔNG KỊP TẮM'},
  {at: 366, text: 'TRỄ GIỜ', red: true},
];

const PanelLabel: React.FC<{f: number; title: string; subs: Sub[]; strike?: number; accent: string}> = ({f, title, subs, strike = 0, accent}) => {
  let idx = 0;
  subs.forEach((s, i) => {
    if (f >= s.at) idx = i;
  });
  const cur = subs[idx];
  const k = prog(f, cur.at, cur.at + 8, easeOut);
  const prev = idx > 0 ? subs[idx - 1] : null;
  const pk = prog(f, cur.at, cur.at + 5, easeIn);
  const pop = cur.red ? springy(f, cur.at, 12, 5, 2.4) : 1;
  return (
    <div style={{position: 'absolute', left: 34, top: 26, fontFamily: FONT, color: '#fff', textShadow: '0 2px 14px rgba(0,0,0,0.65)'}}>
      <div style={{fontWeight: 900, fontSize: 46, letterSpacing: 3, lineHeight: 1, position: 'relative', display: 'inline-block'}}>
        {title}
        {strike > 0 && (
          <div style={{position: 'absolute', left: -6, top: '52%', height: 6, width: `${strike * 104}%`, background: '#ff3b47', borderRadius: 3, boxShadow: '0 0 18px #ff3b47'}} />
        )}
      </div>
      <div style={{position: 'relative', height: 40, marginTop: 10, overflow: 'hidden'}}>
        {prev && pk < 1 && (
          <div style={{position: 'absolute', fontWeight: 600, fontSize: 28, letterSpacing: 5, opacity: 1 - pk, transform: `translateY(${-pk * 30}px)`, color: prev.red ? '#ff4b55' : 'rgba(255,255,255,0.78)'}}>
            {prev.text}
          </div>
        )}
        <div style={{
          position: 'absolute', fontWeight: cur.red ? 800 : 600, fontSize: 28, letterSpacing: 5, whiteSpace: 'nowrap',
          opacity: k, transform: `translateY(${(1 - k) * 30}px) scale(${pop})`, transformOrigin: 'left center',
          color: cur.red ? '#ff4b55' : 'rgba(255,255,255,0.78)',
        }}>
          <span style={{display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: cur.red ? '#ff4b55' : accent, marginRight: 12, verticalAlign: 'middle', boxShadow: `0 0 12px ${cur.red ? '#ff4b55' : accent}`}} />
          {cur.text}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- clock
const Clock: React.FC<{f: number}> = ({f}) => {
  const [a, b] = T.split;
  const p = clamp((f - a) / (b - a - 5));
  const sec = Math.floor(p * 300);
  const mm = Math.floor(sec / 60);
  const ss = `${sec % 60}`.padStart(2, '0');
  const appear = springy(f, 34, 16, 5, 1.8);
  const done = f >= b - 5;
  const pulse = done ? 1 + 0.2 * Math.exp(-(f - b + 5) / 5) : 1;
  const r = 50;
  const C = 2 * Math.PI * r;
  return (
    <div style={{position: 'absolute', left: 540 - 70, top: CLOCK_Y - 70, width: 140, height: 140, transform: `scale(${appear * pulse})`}}>
      <svg width={140} height={140}>
        <circle cx={70} cy={70} r={62} fill="#050506" stroke="rgba(255,255,255,0.08)" strokeWidth={2} />
        <circle cx={70} cy={70} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={6} />
        <circle cx={70} cy={70} r={r} fill="none" stroke={done ? '#ffd28a' : '#ffffff'} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={`${C * p} ${C}`} transform="rotate(-90 70 70)" style={{filter: `drop-shadow(0 0 ${done ? 14 : 6}px ${done ? '#ffb45a' : 'rgba(255,255,255,0.6)'})`}} />
        {/* comet head */}
        {p > 0 && p < 1 && (
          <circle cx={70 + Math.cos(p * 2 * Math.PI - Math.PI / 2) * r} cy={70 + Math.sin(p * 2 * Math.PI - Math.PI / 2) * r} r={6} fill="#fff" style={{filter: 'drop-shadow(0 0 8px #fff)'}} />
        )}
      </svg>
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 30, color: '#fff', fontVariantNumeric: 'tabular-nums', letterSpacing: 1}}>
        {mm}:{ss}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- hook: the alarm
const Hook: React.FC<{f: number}> = ({f}) => {
  if (f > 50) return null;
  const beeps = [0, 6, 12, 20, 26, 32];
  let hit = 0;
  beeps.forEach((b) => {
    if (f >= b) hit = Math.max(hit, Math.exp(-(f - b) / 2.2));
  });
  const shrink = prog(f, 30, 44, easeIn);
  const scale = lerp(1, 0.32, shrink) * (1 + hit * 0.06);
  const y = lerp(960, CLOCK_Y, shrink);
  const op = 1 - prog(f, 33, 41);
  const blink = f < 30 ? (Math.floor(f / 3) % 2 === 0 ? 1 : 0.55) : 1;
  return (
    <div style={{position: 'absolute', left: 0, top: y - 200, width: 1080, height: 400, opacity: op, transform: `scale(${scale}) translateX(${(hit * (f % 2 ? 6 : -6))}px)`}}>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(closest-side, rgba(255,40,60,0.45), rgba(255,40,60,0))', opacity: 0.5 + hit * 0.5}} />
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 230, letterSpacing: 8, color: '#ff3346', opacity: blink, textShadow: `0 0 ${30 + hit * 50}px rgba(255,40,60,0.9), 0 0 120px rgba(255,40,60,0.5)`, fontVariantNumeric: 'tabular-nums'}}>
        06:00
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- split screen
const Split: React.FC<{f: number}> = ({f}) => {
  if (f < 28 || f > T.flash[1]) return null;
  // eyelids opening: the panels unfold from the centre line
  const open = prog(f, 32, 50, easeOut);
  const line = prog(f, 28, 36, easeOut) * (1 - prog(f, 44, 52));
  const panel = (y: number, child: React.ReactNode, glow: string, fromTop: boolean) => {
    const h = PANEL_H * open;
    const clipTop = fromTop ? PANEL_H - h : 0;
    return (
      <div style={{
        position: 'absolute', left: 40, top: y, width: PANEL_W, height: PANEL_H, borderRadius: 22, overflow: 'hidden',
        clipPath: `inset(${clipTop}px 0 ${fromTop ? 0 : PANEL_H - h}px 0 round 22px)`,
        boxShadow: `0 0 80px ${glow}, 0 30px 60px rgba(0,0,0,0.8)`, outline: '1px solid rgba(255,255,255,0.07)',
      }}>
        {child}
      </div>
    );
  };
  const strike = prog(f, 398, 408, easeOut);
  return (
    <>
      {panel(TOP_Y, <><TopPanel f={Math.max(f, 45)} /><PanelLabel f={f} title="5 PHÚT" subs={TOP_SUBS} accent="#ffb45a" /></>, 'rgba(255,170,90,0.10)', true)}
      {panel(BOT_Y, <><BottomPanel f={Math.max(f, 45)} /><PanelLabel f={f} title="KHÔNG KỊP" subs={BOT_SUBS} strike={strike} accent="#6f8cff" /></>, 'rgba(80,110,255,0.10)', false)}
      <div style={{position: 'absolute', left: 40, right: 40, top: CLOCK_Y - 1, height: 2, background: '#fff', transform: `scaleX(${line})`, boxShadow: '0 0 20px #fff', opacity: line}} />
      {f >= 34 && <Clock f={f} />}
    </>
  );
};

// ---------------------------------------------------------------- flash + titles
const Flash: React.FC<{f: number}> = ({f}) => {
  const [a, b] = T.flash;
  if (f < a || f > b) return null;
  const inK = prog(f, a + 4, a + 10, easeIn);
  const outK = prog(f, a + 18, b, easeOut);
  return <AbsoluteFill style={{background: '#fbf3e6', opacity: inK * (1 - outK)}} />;
};

const Letters: React.FC<{text: string; f: number; start: number; size: number; weight: number; color?: string; spacing?: number; stagger?: number}> = ({text, f, start, size, weight, color = '#fff', spacing = 4, stagger = 1.2}) => (
  <div style={{fontFamily: FONT, fontWeight: weight, fontSize: size, letterSpacing: spacing, color, whiteSpace: 'pre', textAlign: 'center'}}>
    {[...text].map((ch, i) => {
      const k = prog(f, start + i * stagger, start + i * stagger + 14, backOut);
      const o = prog(f, start + i * stagger, start + i * stagger + 8);
      return (
        <span key={i} style={{display: 'inline-block', opacity: o, transform: `translateY(${(1 - k) * 26}px)`, filter: `blur(${(1 - o) * 6}px)`}}>{ch}</span>
      );
    })}
  </div>
);

const StreetTitles: React.FC<{f: number}> = ({f}) => {
  const out = prog(f, T.end[0] - 4, T.end[0] + 10);
  if (f < T.flash[0] + 14 || out >= 1) return null;
  const under = prog(f, 446, 470, easeOut);
  return (
    <div style={{position: 'absolute', top: 300, width: 1080, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, opacity: 1 - out, transform: `translateY(${-out * 20}px)`, textShadow: '0 4px 30px rgba(0,0,0,0.6)'}}>
      <Letters text="CÙNG 5 PHÚT." f={f} start={T.flash[0] + 14} size={66} weight={800} />
      <Letters text="KHÁC CẢ MỘT NGÀY." f={f} start={446} size={66} weight={800} color="#ffc07a" />
      <div style={{width: 120 * under, height: 4, borderRadius: 2, background: '#ffc07a', marginTop: 12, boxShadow: '0 0 16px #ffa04a'}} />
    </div>
  );
};

const Ending: React.FC<{f: number}> = ({f}) => {
  const s = T.end[0] + 12;
  if (f < s) return null;
  const fade = prog(f, T.total - 34, T.total - 14);
  return (
    <div style={{position: 'absolute', top: 560, width: 1080, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textShadow: '0 4px 30px rgba(0,0,0,0.8)', opacity: 1 - fade}}>
      <Letters text="Không ai thắng cả một ngày." f={f} start={s} size={50} weight={400} spacing={1} stagger={0.7} />
      <div style={{display: 'flex', gap: 0}}>
        <Letters text="Họ thắng " f={f} start={s + 30} size={58} weight={800} spacing={1} stagger={0.8} />
        <Letters text="5 phút đầu tiên." f={f} start={s + 37} size={58} weight={900} spacing={1} color="#ffc07a" stagger={0.8} />
      </div>
    </div>
  );
};

/** loop-friendly coda: back to black, the alarm returns */
const Coda: React.FC<{f: number}> = ({f}) => {
  const k = prog(f, T.total - 30, T.total - 12, easeIn);
  if (k <= 0) return null;
  const d = prog(f, T.total - 14, T.total - 8, easeOut);
  return (
    <AbsoluteFill style={{background: `rgba(0,0,0,${k})`, alignItems: 'center', justifyContent: 'center'}}>
      <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 74, letterSpacing: 6, color: '#ff3346', opacity: d, textShadow: '0 0 30px rgba(255,40,60,0.8)', fontVariantNumeric: 'tabular-nums'}}>06:00</div>
    </AbsoluteFill>
  );
};

const Grain: React.FC<{f: number}> = ({f}) => (
  <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'overlay', opacity: 0.09}}>
    <svg width={1080} height={1920}>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={f % 23} /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width={1080} height={1920} filter="url(#grain)" />
    </svg>
  </AbsoluteFill>
);

export const NamPhut: React.FC = () => {
  const f = useCurrentFrame();
  const streetOn = f >= T.flash[0] + 12;
  const streetPush = 1.04 - 0.04 * prog(f, T.street[0], T.end[0] + 60, easeOut);
  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      {streetOn && (
        <AbsoluteFill style={{transform: `scale(${streetPush})`}}>
          <Street f={f} />
        </AbsoluteFill>
      )}
      {!streetOn && <Split f={f} />}
      <Hook f={f} />
      <Flash f={f} />
      {streetOn && <StreetTitles f={f} />}
      <Ending f={f} />
      <Coda f={f} />
      <Grain f={f} />
      <Audio src={staticFile('audio/soundtrack.wav')} />
    </AbsoluteFill>
  );
};
