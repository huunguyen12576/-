import React from 'react';
import {interpolate} from 'remotion';
import {clamp, noise1, rand, ramp, sp} from '../anim';

export const FONT = "'Montserrat', sans-serif";

/* ------------------------------------------------------------------ */
/* Notification card                                                   */
/* ------------------------------------------------------------------ */
export const Notification: React.FC<{
  x: number;
  y: number;
  text: string;
  appear: number; // 0..1 spring
  opacity?: number;
  scale?: number;
  glow?: number;
  time?: string;
}> = ({x, y, text, appear, opacity = 1, scale = 1, glow = 0, time = 'vừa xong'}) => {
  const a = clamp(appear, 0, 1.2);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 400,
        transform: `translate(-50%, -50%) translateY(${(1 - a) * 40}px) scale(${(0.85 + 0.15 * a) * scale})`,
        opacity: clamp(appear * 2) * opacity,
        fontFamily: FONT,
        borderRadius: 28,
        padding: '18px 22px 20px',
        background: 'linear-gradient(180deg, rgba(44,47,58,0.94), rgba(26,28,35,0.94))',
        border: '1.5px solid rgba(255,255,255,0.10)',
        boxShadow: `0 24px 50px rgba(0,0,0,0.65), 0 0 ${40 * glow}px rgba(255,90,90,${0.35 * glow}), inset 0 1px 0 rgba(255,255,255,0.08)`,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10}}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(160deg,#ff5f57,#d92f2f)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(217,47,47,0.45)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <rect x="3" y="7" width="18" height="13" rx="2.5" fill="#fff" />
            <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" stroke="#fff" strokeWidth="2.2" fill="none" />
            <rect x="3" y="11.5" width="18" height="2" fill="#d92f2f" />
          </svg>
        </div>
        <div style={{color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: 0.3}}>Sếp</div>
        <div style={{marginLeft: 'auto', color: 'rgba(255,255,255,0.45)', fontWeight: 600, fontSize: 17}}>{time}</div>
      </div>
      <div style={{color: '#fff', fontWeight: 700, fontSize: 25, lineHeight: 1.3}}>{text}</div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* LED clock with rolling digits                                       */
/* ------------------------------------------------------------------ */
export const Clock: React.FC<{frame: number; schedule: [number, string][]; alarm: number}> = ({frame, schedule, alarm}) => {
  let idx = 0;
  for (let i = 0; i < schedule.length; i++) if (frame >= schedule[i][0]) idx = i;
  const cur = schedule[idx][1];
  const prev = idx > 0 ? schedule[idx - 1][1] : cur;
  const t = idx > 0 ? ramp(frame, schedule[idx][0], schedule[idx][0] + 7) : 1;
  const flash = idx > 0 ? 1 - ramp(frame, schedule[idx][0], schedule[idx][0] + 14) : 0;
  const alarmOn = frame >= alarm && frame < alarm + 44 ? (Math.floor((frame - alarm) / 5) % 2 === 0 ? 1 : 0.25) : 1;
  return (
    <div
      style={{
        position: 'absolute',
        left: 540,
        top: 987,
        transform: 'translate(-50%, -50%)',
        width: 112,
        height: 50,
        borderRadius: 8,
        background: 'linear-gradient(180deg,#0b0b0e,#141419)',
        border: '2px solid #2a2b31',
        boxShadow: `0 6px 14px rgba(0,0,0,0.6), 0 0 ${18 + flash * 30}px rgba(255,40,40,${0.25 + flash * 0.35})`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: 27,
        letterSpacing: 1,
        color: '#ff3a3a',
        opacity: alarmOn,
        textShadow: '0 0 10px rgba(255,40,40,0.9), 0 0 2px #ff8080',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {cur.split('').map((ch, i) => {
        const changed = prev[i] !== ch;
        if (!changed) return <span key={i} style={{display: 'inline-block', width: ch === ':' ? 8 : 18, textAlign: 'center'}}>{ch}</span>;
        return (
          <span key={i} style={{display: 'inline-block', width: 18, height: 34, overflow: 'hidden', position: 'relative', textAlign: 'center'}}>
            <span style={{position: 'absolute', left: 0, right: 0, top: -t * 34, lineHeight: '34px'}}>{prev[i]}</span>
            <span style={{position: 'absolute', left: 0, right: 0, top: (1 - t) * 34, lineHeight: '34px'}}>{ch}</span>
          </span>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Thought bubble stack                                                */
/* ------------------------------------------------------------------ */
export type ThoughtLine = {text: string; at: number; heat: number};

export const ThoughtStack: React.FC<{
  frame: number;
  x: number;
  bottom: number;
  lines: ThoughtLine[];
  headX: number;
  headY: number;
  collapseAt?: number;
  tremor?: number;
  dim?: number;
}> = ({frame, x, bottom, lines, headX, headY, collapseAt, tremor = 0, dim = 0}) => {
  const visible = lines.filter((l) => frame >= l.at);
  if (visible.length === 0) return null;
  const first = visible[0].at;
  const trail = clamp(sp(frame, first, {damping: 14}));
  const collapsing = collapseAt !== undefined && frame >= collapseAt;
  const trailFade = collapsing ? 1 - ramp(frame, collapseAt!, collapseAt! + 10) : 1;
  return (
    <>
      {/* trailing thought dots from head */}
      {[0, 1, 2].map((i) => {
        const k = (i + 1) / 4;
        const px = headX + (x - headX) * k * 0.6;
        const py = headY - 60 - (headY - 60 - bottom) * k;
        const s = clamp(trail * 3 - i * 0.6) * trailFade;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: px,
              top: py,
              width: 12 + i * 7,
              height: 12 + i * 7,
              borderRadius: '50%',
              background: '#4b4f5c',
              border: '1.5px solid rgba(255,255,255,0.12)',
              transform: `translate(-50%,-50%) scale(${s})`,
            }}
          />
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: x,
          top: bottom,
          transform: 'translate(-50%, -100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: 1 - dim,
        }}
      >
        {visible.map((l, i) => {
          const s = sp(frame, l.at, {damping: 11, stiffness: 170, mass: 0.7});
          const hgt = clamp(sp(frame, l.at, {damping: 20, stiffness: 160})) * 58;
          const shake = tremor * (0.4 + l.heat) * 3.2;
          const jx = noise1(frame * 0.9, i * 3 + 1) * shake;
          const jy = noise1(frame * 0.9, i * 3 + 2) * shake * 0.6;
          // collapse: lines fall with gravity, staggered from the top
          let fy = 0;
          let fr = 0;
          let fo = 1;
          if (collapsing) {
            const order = visible.length - 1 - i;
            const t0 = collapseAt! + i * 1.6;
            const tt = Math.max(0, frame - t0);
            fy = 0.9 * tt * tt * (0.8 + rand(i) * 0.5);
            fr = (rand(i * 7) - 0.5) * tt * 1.6;
            fo = 1 - clamp(tt / 22);
            void order;
          }
          const red = l.heat;
          return (
            <div key={i} style={{height: hgt, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'visible'}}>
              <div
                style={{
                  transform: `translate(${jx}px, ${jy + fy}px) rotate(${fr}deg) scale(${0.55 + 0.45 * s})`,
                  opacity: clamp(s * 2) * fo,
                  margin: '3px 0',
                  padding: '9px 22px 10px',
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                  fontFamily: FONT,
                  fontWeight: 700,
                  fontSize: 25,
                  letterSpacing: 0.2,
                  color: '#fff',
                  background: `linear-gradient(180deg, rgba(${78 + red * 40},${82 - red * 22},${94 - red * 30},0.96), rgba(${56 + red * 34},${58 - red * 20},${68 - red * 26},0.96))`,
                  border: `1.5px solid rgba(255,${255 - red * 170},${255 - red * 170},${0.14 + red * 0.25})`,
                  boxShadow: `0 10px 24px rgba(0,0,0,0.55), 0 0 ${red * 24}px rgba(255,60,60,${red * 0.25})`,
                }}
              >
                {l.text}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Zzz                                                                 */
/* ------------------------------------------------------------------ */
export const Zzz: React.FC<{frame: number; start: number; end: number; x: number; y: number}> = ({frame, start, end, x, y}) => {
  if (frame < start || frame > end + 20) return null;
  const fade = 1 - ramp(frame, end, end + 20);
  return (
    <>
      {[0, 1, 2].map((i) => {
        const period = 66;
        const t = ((frame - start - i * 22) % period) / period;
        if (frame - start - i * 22 < 0) return null;
        const o = Math.sin(t * Math.PI) * fade;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x + t * 46 + Math.sin(t * 6) * 6,
              top: y - t * 120,
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 26 + t * 18,
              color: '#dfe5f5',
              opacity: o * 0.85,
              transform: `rotate(${-10 + t * 20}deg)`,
              textShadow: '0 0 12px rgba(200,215,255,0.5)',
            }}
          >
            z
          </div>
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Reply chip (chill person)                                           */
/* ------------------------------------------------------------------ */
export const ReplyChip: React.FC<{frame: number; typing: number; send: number; away: number; x: number; y: number}> = ({frame, typing, send, away, x, y}) => {
  if (frame < typing) return null;
  const a = sp(frame, typing, {damping: 14, stiffness: 160});
  const sent = frame >= send;
  const sa = sp(frame, send, {damping: 12, stiffness: 180});
  const awayT = ramp(frame, away, away + 14);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%,-50%) translate(${awayT * 140}px, ${-awayT * 10}px) scale(${0.6 + 0.4 * clamp(a)})`,
        opacity: clamp(a * 2) * (1 - awayT),
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: 24,
        color: '#fff',
        padding: sent ? '11px 22px' : '14px 20px',
        borderRadius: 999,
        background: sent ? 'linear-gradient(180deg,#3a8dff,#1f6fe0)' : 'rgba(60,63,74,0.95)',
        boxShadow: sent ? `0 10px 26px rgba(31,111,224,${0.45 * clamp(sa)})` : '0 8px 20px rgba(0,0,0,0.5)',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}
    >
      {sent ? (
        <span>Dạ, ok anh ạ</span>
      ) : (
        [0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#fff',
              opacity: 0.35 + 0.65 * Math.max(0, Math.sin((frame - typing) * 0.45 - i * 0.9)),
              display: 'inline-block',
            }}
          />
        ))
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Kinetic headline                                                    */
/* ------------------------------------------------------------------ */
export const Kinetic: React.FC<{
  frame: number;
  at: number;
  text: string;
  size: number;
  weight?: number;
  color?: string;
  tracking?: number;
  stagger?: number;
  accent?: string[];
  accentStyle?: React.CSSProperties;
  upper?: boolean;
}> = ({frame, at, text, size, weight = 800, color = '#fff', tracking = 0, stagger = 3, accent = [], accentStyle, upper}) => {
  const words = text.split(' ');
  return (
    <span style={{display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: size * 0.28}}>
      {words.map((w, i) => {
        const s = sp(frame, at + i * stagger, {damping: 18, stiffness: 140});
        const o = interpolate(s, [0, 1], [0, 1], {extrapolateRight: 'clamp'});
        const blur = (1 - clamp(s)) * 10;
        const isAcc = accent.includes(w);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              fontFamily: FONT,
              fontWeight: weight,
              fontSize: size,
              letterSpacing: tracking,
              lineHeight: 1.25,
              color,
              opacity: o,
              filter: `blur(${blur}px)`,
              transform: `translateY(${(1 - s) * size * 0.5}px)`,
              textTransform: upper ? 'uppercase' : undefined,
              ...(isAcc ? accentStyle : {}),
            }}
          >
            {w}
          </span>
        );
      })}
    </span>
  );
};
