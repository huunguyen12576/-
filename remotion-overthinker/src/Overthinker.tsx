import React from 'react';
import {AbsoluteFill, Audio, Easing, interpolate, staticFile, useCurrentFrame} from 'remotion';
import T from './timeline.json';
import {clamp, keyed, lerp, noise1, ramp, rand, sp} from './anim';
import {Figure, FigureTop, POSES, Pose} from './components/Figure';
import {Backdrop, BedBase, Blanket, LightShafts, Nightstand, H, W} from './components/Room';
import {Clock, FONT, Kinetic, Notification, ReplyChip, ThoughtLine, ThoughtStack, Zzz} from './components/UI';

const MSG1 = 'Mai mình nói chuyện chút nhé?';
const MSG2 = 'Chỉ muốn khen em: làm tốt lắm :)';

const THOUGHTS: [string, number][] = [
  ['Mình đã làm gì sai?', 0],
  ['Là vụ cái email à?', 0.05],
  ['Mình lỡ bấm “Trả lời tất cả”…', 0.15],
  ['Sao lại hẹn mai?', 0.25],
  ['Sao không nói luôn??', 0.38],
  ['Mình sắp bị đuổi việc à?', 0.6],
  ['Sửa CV ngay.', 0.7],
  ['Bán xe.', 0.8],
  ['Về quê ở ẩn.', 0.9],
  ['Học câu cá.', 1],
];
const LINES: ThoughtLine[] = THOUGHTS.map(([text, heat], i) => ({text, heat, at: T.thoughts[i]}));
const TWIST: ThoughtLine[] = [
  {text: 'Sao lại có “:)” ??', heat: 0.3, at: T.twist[0]},
  {text: 'Khen thật… hay là mỉa??', heat: 0.6, at: T.twist[1]},
];

/** Heartbeat schedule — mirrored in scripts/make_audio.py */
export const heartbeats = () => {
  const out: number[] = [];
  let t = T.thoughts[0];
  while (t < T.alarm - 4) {
    out.push(Math.round(t));
    const k = (t - T.thoughts[0]) / (T.alarm - T.thoughts[0]);
    t += lerp(27, 11, k);
  }
  return out;
};
const BEATS = heartbeats();

const AL = {x: 270, y: 1010};
const AR = {x: 810, y: 1010};
const P = POSES;

const phoneAway: Pose = {...P.sitPhone, elx: -70, ely: 150, erx: 96, ery: 150, hlx: -40, hly: 170, hrx: 110, hry: 178, px: 128, py: 190, pr: 64};
const happy: Pose = {...P.sitPhone, hy: -10, sly: 50, sry: 50};

const OT_KEYS = [
  {f: 0, v: P.sitPhone},
  {f: T.otFreeze, v: P.stare, cfg: {damping: 26, stiffness: 60}},
  {f: T.otPoses.handsHead, v: P.handsHead, cfg: {damping: 15, stiffness: 110, mass: 1.1}},
  {f: T.otPoses.lieAwake, v: P.lieAwake, cfg: {damping: 20, stiffness: 70, mass: 1.4}},
  {f: T.otPoses.hunch, v: P.hunch, cfg: {damping: 16, stiffness: 120}},
  {f: T.otPoses.sitPhone, v: P.sitPhone, cfg: {damping: 18, stiffness: 140}},
  {f: T.alarm, v: P.stare, cfg: {damping: 9, stiffness: 260, mass: 0.7}},
  {f: T.otRelief, v: P.slump, cfg: {damping: 22, stiffness: 50, mass: 1.6}},
  {f: T.phoneDrop, v: P.slumpDropped, cfg: {damping: 7, stiffness: 220, mass: 0.6}},
  {f: T.headDown, v: P.headDown, cfg: {damping: 14, stiffness: 120, mass: 1.3}},
];
const CH_KEYS = [
  {f: 0, v: P.sitPhone},
  {f: T.chillPhoneDown, v: phoneAway, cfg: {damping: 18, stiffness: 120}},
  {f: T.chillLieDown, v: P.lieSleep, cfg: {damping: 22, stiffness: 55, mass: 1.5}},
  {f: T.chillWake, v: P.stretch, cfg: {damping: 13, stiffness: 80, mass: 1.2}},
  {f: T.chillSitUp, v: P.sitPhone, cfg: {damping: 17, stiffness: 110}},
  {f: T.chillHappy, v: happy, cfg: {damping: 8, stiffness: 240, mass: 0.6}},
  {f: T.chillHappy + 14, v: P.sitPhone, cfg: {damping: 14, stiffness: 120}},
];

type Cam = {x: number; y: number; s: number; r: number};
const CAM_KEYS = [
  {f: 0, v: {x: 540, y: 1150, s: 2.25, r: 0}},
  {f: T.split, v: {x: 540, y: 870, s: 1.06, r: 0}, cfg: {damping: 22, stiffness: 38, mass: 1.6}},
  {f: T.thoughts[0] - 10, v: {x: 440, y: 800, s: 1.14, r: -0.6}, dur: 140},
  {f: 330, v: {x: 390, y: 760, s: 1.26, r: -1.6}, dur: 140},
  {f: T.alarm, v: {x: 540, y: 870, s: 1.06, r: 0}, cfg: {damping: 15, stiffness: 140, mass: 0.8}},
  {f: T.otRelief + 40, v: {x: 410, y: 890, s: 1.2, r: 0.4}, dur: 110},
  {f: T.outro, v: {x: 540, y: 900, s: 1.0, r: 0}, dur: 70},
];

export const Overthinker: React.FC = () => {
  const f = useCurrentFrame();

  /* ---------------- states ---------------- */
  const dawn = ramp(f, T.dawn[0], T.dawn[1], Easing.inOut(Easing.sin));
  const warm = ramp(f, T.dawn[0] + 80, T.dawn[1] + 20);
  const spiral = ramp(f, T.thoughts[0], T.alarm, Easing.in(Easing.quad)); // anxiety level
  const afterAlarm = f >= T.alarm;

  let ot = keyed(f, OT_KEYS);
  const ch = keyed(f, CH_KEYS);

  // anxious tremor + breathing
  const trem = (afterAlarm ? 0 : spiral) * 3.2;
  const br = Math.sin(f * (0.11 + spiral * 0.12)) * (1.4 + spiral * 1.2);
  ot = {
    ...ot,
    hx: ot.hx + noise1(f * 0.7, 1) * trem,
    hy: ot.hy + noise1(f * 0.7, 2) * trem + br * 0.5,
    sly: ot.sly + br,
    sry: ot.sry + br,
  };
  const chBreathe = Math.sin(f * 0.07) * 5;

  // camera
  const cam = keyed(f, CAM_KEYS as never) as unknown as Cam;
  const shake = f >= T.alarm && f < T.alarm + 24 ? (1 - (f - T.alarm) / 24) * 9 : 0;
  const hand = 1.2;
  const cx = cam.x + noise1(f * 0.03, 11) * hand * 4 + noise1(f * 1.3, 12) * shake;
  const cy = cam.y + noise1(f * 0.03, 13) * hand * 4 + noise1(f * 1.3, 14) * shake;
  const camT = `translate(${W / 2}px, ${H / 2}px) rotate(${cam.r}deg) scale(${cam.s}) translate(${-cx}px, ${-cy}px)`;

  // phones
  const otPhone = f < T.phoneDrop ? 1 : lerp(0.85, 0.35, ramp(f, T.phoneDrop, T.outro));
  const flicker = f > T.thoughts[0] && f < T.alarm ? 0.88 + 0.12 * noise1(f * 0.8, 5) : 1;
  const chPhone = f < T.chillPhoneDown + 6 ? 1 : f > T.chillSitUp + 8 ? ramp(f, T.chillSitUp + 8, T.chillSitUp + 16) : 0;

  // notifications
  const n1a = sp(f, T.notif1, {damping: 13, stiffness: 150});
  const split = sp(f, T.split + 4, {damping: 17, stiffness: 70, mass: 1.1});
  const buzz = (f >= T.buzz[0] && f < T.buzz[0] + 12) || (f >= T.buzz[1] && f < T.buzz[1] + 12) ? Math.sin(f * 3.1) * 5 : 0;
  const notifY = 1250;
  const otN1Fade = 1 - ramp(f, 300, 340);
  const chN1Fade = 1 - ramp(f, T.chillCardAway, T.chillCardAway + 14);
  const chN1Slide = ramp(f, T.chillCardAway, T.chillCardAway + 14) * 160;
  const n2a = sp(f, T.notif2, {damping: 13, stiffness: 150});
  const n2Fade = 1 - ramp(f, T.otRelief + 50, T.otRelief + 80);

  // grade
  const fadeIn = ramp(f, 0, 6);
  const outro = ramp(f, T.outro, T.outro + 40);
  const fadeOut = 1 - ramp(f, T.fadeOut, T.duration - 1);
  const beatPulse = BEATS.reduce((acc, b) => Math.max(acc, f >= b ? Math.exp(-(f - b) / 5) : 0), 0) * spiral;

  // tension light on the overthinker side (cool) vs warm calm
  const labelsIn = sp(f, T.labels, {damping: 20, stiffness: 120});
  const labelsOut = 1 - outro;

  return (
    <AbsoluteFill style={{backgroundColor: '#030304', fontFamily: FONT}}>
      <Audio src={staticFile('audio/soundtrack.wav')} />

      {/* ------------------- WORLD (camera) ------------------- */}
      <AbsoluteFill
        style={{
          transformOrigin: '0 0',
          transform: camT,
          filter: `blur(${outro * 7}px) brightness(${(1 - outro * 0.72) * fadeIn})`,
        }}
      >
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <Backdrop dawn={dawn} frame={f} wallWarm={warm} />
          <Nightstand warm={warm} />
          <BedBase side="left" tint="#5d7cb8" warm={warm * 0.6} />
          <BedBase side="right" tint="#b88a5d" warm={warm} />

          <Figure pose={ot} x={AL.x} y={AL.y} phoneOn={otPhone} idSuffix="ot" />
          <Figure pose={ch} x={AR.x} y={AR.y} phoneOn={chPhone} idSuffix="ch" />

          <Blanket side="left" top={AL.y + ot.blanket} tint={`rgb(${lerp(46, 70, warm)},${lerp(66, 74, warm)},${lerp(104, 98, warm)})`} frame={f} breathe={0} />
          <Blanket side="right" top={AR.y + ch.blanket} tint={`rgb(${lerp(78, 112, warm)},${lerp(68, 90, warm)},${lerp(62, 70, warm)})`} frame={f} breathe={ch.arms < 0.5 ? chBreathe : 0} />

          <FigureTop pose={ot} x={AL.x} y={AL.y} phoneOn={otPhone * flicker} idSuffix="ot" glow={0.6 + spiral} />
          <FigureTop pose={ch} x={AR.x} y={AR.y} phoneOn={chPhone} idSuffix="ch" warm={f > T.chillHappy ? 0.4 * ramp(f, T.chillHappy, T.chillHappy + 20) : 0} glow={0.5 + (f > T.chillHappy ? 1.2 * Math.exp(-(f - T.chillHappy) / 25) : 0)} />

          <LightShafts dawn={dawn} frame={f} />

          {/* chill's happy warm bloom */}
          {f > T.chillHappy && (
            <circle cx={AR.x} cy={AR.y + 40} r={240} fill="url(#happyGlow)" opacity={Math.exp(-(f - T.chillHappy) / 30) * 0.9} style={{mixBlendMode: 'screen'}} />
          )}
          <defs>
            <radialGradient id="happyGlow">
              <stop offset="0" stopColor="#ffd59a" stopOpacity={0.55} />
              <stop offset="1" stopColor="#ffb070" stopOpacity={0} />
            </radialGradient>
          </defs>

          {/* night darkness: the room sinks into shadow, except where phones light it */}
          <rect x={-400} y={0} width={W + 800} height={H} fill="#02030a" opacity={lerp(0.28, 0, warm)} style={{mixBlendMode: 'multiply'}} />
        </svg>

        {/* world-anchored UI */}
        <Clock frame={f} schedule={T.clock as [number, string][]} alarm={T.alarm} />

        <Notification
          x={lerp(540, AL.x, split) + buzz}
          y={lerp(1110, notifY, split)}
          text={MSG1}
          appear={n1a}
          opacity={otN1Fade}
          scale={lerp(1, 0.86, split)}
          glow={f < T.split ? 1 : 0.4 * otN1Fade}
          time="23:12"
        />
        <Notification
          x={lerp(540, AR.x, split) + buzz + chN1Slide}
          y={lerp(1110, notifY, split)}
          text={MSG1}
          appear={n1a}
          opacity={chN1Fade * (f < T.split ? 0 : 1)}
          scale={lerp(1, 0.86, split)}
          time="23:12"
        />
        <ReplyChip frame={f} typing={T.chillTyping} send={T.chillSend} away={T.chillCardAway} x={AR.x + 70} y={notifY + 120} />

        <Notification x={AL.x} y={notifY} text={MSG2} appear={n2a} opacity={n2Fade} scale={0.86} time="07:00" glow={0.3} />
        <Notification x={AR.x} y={notifY} text={MSG2} appear={n2a} opacity={n2Fade} scale={0.86} time="07:00" />

        <Zzz frame={f} start={T.zzz} end={T.chillWake} x={AR.x + 40} y={AR.y - 90} />

        <ThoughtStack
          frame={f}
          x={AL.x + 40}
          bottom={AL.y - 110}
          lines={LINES}
          headX={AL.x + ot.hx}
          headY={AL.y + ot.hy}
          collapseAt={T.collapse}
          tremor={afterAlarm ? 0 : spiral}
        />
        {f < T.outro + 30 && (
          <ThoughtStack frame={f} x={AL.x + 60} bottom={AL.y - 60} lines={TWIST} headX={AL.x + ot.hx} headY={AL.y + ot.hy} tremor={0.15} dim={outro} />
        )}
      </AbsoluteFill>

      {/* ------------------- GRADE ------------------- */}
      {/* heartbeat red vignette */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at 30% 45%, rgba(0,0,0,0) 40%, rgba(150,10,20,0.55) 100%)',
          opacity: beatPulse * 0.75 + spiral * 0.25 * (afterAlarm ? 0 : 1),
          mixBlendMode: 'multiply',
        }}
      />
      {/* vignette */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 52%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.7) 100%)'}} />

      {/* ------------------- SCREEN TYPOGRAPHY ------------------- */}
      <div style={{position: 'absolute', top: 236, width: W, textAlign: 'center', opacity: labelsOut}}>
        {f >= T.titleSame && (
          <div>
            <Kinetic frame={f} at={T.titleSame} text="CÙNG MỘT TIN NHẮN." size={40} weight={800} tracking={6} stagger={4} />
          </div>
        )}
        {f >= T.titleDiff && (
          <div style={{marginTop: 4}}>
            <Kinetic
              frame={f}
              at={T.titleDiff}
              text="HAI ĐÊM KHÁC NHAU."
              size={40}
              weight={800}
              tracking={6}
              stagger={4}
              color="#ffc58a"
            />
          </div>
        )}
      </div>
      {[
        {x: AL.x, t: 'NGHĨ NHIỀU', c: '#a9c4ff'},
        {x: AR.x, t: 'THẢNH THƠI', c: '#ffd2a1'},
      ].map((l, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: 396,
            left: l.x,
            transform: `translate(-50%, ${(1 - clamp(labelsIn)) * 20}px)`,
            opacity: clamp(labelsIn) * labelsOut * (1 - 0.5 * (i === 1 ? spiral * (afterAlarm ? 0 : 1) : 0)) * (i === 0 ? 1 - ramp(f, 384, 398) + ramp(f, T.collapse + 10, T.collapse + 30) : 1),
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 27,
            letterSpacing: 7,
            color: '#fff',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{width: 10, height: 10, borderRadius: 5, background: l.c, boxShadow: `0 0 12px ${l.c}`}} />
          {l.t}
        </div>
      ))}

      <Outro f={f} />

      {/* film grain */}
      <AbsoluteFill style={{opacity: 0.07, mixBlendMode: 'overlay'}}>
        <svg width={W} height={H}>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={f % 12} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width={W} height={H} filter="url(#grain)" />
        </svg>
      </AbsoluteFill>

      <AbsoluteFill style={{background: '#000', opacity: 1 - fadeOut}} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Outro: show, don't tell — 6 words vs a whole night of thoughts       */
/* ------------------------------------------------------------------ */
const Outro: React.FC<{f: number}> = ({f}) => {
  if (f < T.outroWords - 4) return null;
  const words = MSG1.split(' ');
  const cardIn = sp(f, T.outroWords, {damping: 15, stiffness: 120});
  const clear = ramp(f, T.outroFinal - 10, T.outroFinal + 8);
  const ghostIn = (i: number) => sp(f, T.outroGhosts + i * 2.2, {damping: 14, stiffness: 150});
  const finalGlow = ramp(f, T.outroFinal + 20, T.outroFinal + 80);
  return (
    <AbsoluteFill>
      {/* ghosts: the night's thoughts crowd around the six words */}
      {THOUGHTS.map(([t, heat], i) => {
        const s = ghostIn(i);
        if (f < T.outroGhosts + i * 2.2) return null;
        const top = i % 2 === 0;
        const slot = Math.floor(i / 2);
        const x = 220 + slot * 160 + (rand(i * 3) - 0.5) * 60 + (top ? 0 : 40);
        const y = top ? 470 + (slot % 3) * 95 + rand(i * 5) * 30 : 1250 + ((slot + 1) % 3) * 95 + rand(i * 5) * 30;
        const drift = Math.sin(f * 0.03 + i) * 8;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y + drift - clear * 60,
              transform: `translate(-50%,-50%) rotate(${(rand(i * 9) - 0.5) * 14}deg) scale(${0.6 + 0.4 * clamp(s)})`,
              opacity: clamp(s) * (1 - clear) * 0.85,
              padding: '8px 18px',
              borderRadius: 999,
              background: `rgba(${70 + heat * 60},${70 - heat * 20},${80 - heat * 25},0.75)`,
              color: 'rgba(255,255,255,0.85)',
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 23,
              whiteSpace: 'nowrap',
              filter: `blur(${(1 - clamp(s)) * 6 + 0.6}px)`,
            }}
          >
            {t}
          </div>
        );
      })}

      {/* the six words */}
      <div
        style={{
          position: 'absolute',
          left: 540,
          top: 820,
          transform: `translate(-50%,-50%) scale(${(0.8 + 0.2 * clamp(cardIn)) * (1 - clear * 0.2)}) translateY(${(1 - clamp(cardIn)) * 40 - clear * 80}px)`,
          opacity: clamp(cardIn * 2) * (1 - clear),
          padding: '26px 34px',
          borderRadius: 30,
          background: 'linear-gradient(180deg, rgba(44,47,58,0.96), rgba(26,28,35,0.96))',
          border: '1.5px solid rgba(255,255,255,0.12)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.7)',
          display: 'flex',
          gap: 12,
        }}
      >
        {words.map((w, i) => {
          const hit = sp(f, T.outroWords + 10 + i * 5, {damping: 10, stiffness: 220, mass: 0.6});
          return (
            <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
              <span style={{fontFamily: FONT, fontWeight: 800, fontSize: 34, color: '#fff', whiteSpace: 'nowrap'}}>{w}</span>
              <span
                style={{
                  marginTop: 8,
                  fontFamily: FONT,
                  fontWeight: 800,
                  fontSize: 18,
                  color: '#ff5f57',
                  opacity: clamp(hit),
                  transform: `scale(${0.4 + 0.6 * hit})`,
                }}
              >
                {i + 1}
              </span>
            </div>
          );
        })}
      </div>

      {/* lines */}
      <div style={{position: 'absolute', top: 980, width: W, textAlign: 'center', opacity: 1 - clear}}>
        <Kinetic frame={f} at={T.outroWords + 44} text="Tin nhắn chỉ có 6 chữ." size={50} weight={700} stagger={3} />
        <div style={{height: 14}} />
        {f >= T.outroGhosts + 12 && (
          <Kinetic frame={f} at={T.outroGhosts + 12} text="Nỗi lo viết thêm cả một đêm." size={50} weight={700} stagger={3} color="#ff8a80" />
        )}
      </div>

      {/* final message */}
      {f >= T.outroFinal && (
        <div style={{position: 'absolute', top: 760, width: W, textAlign: 'center', padding: '0 70px', boxSizing: 'border-box'}}>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 150,
              width: 900,
              height: 500,
              transform: 'translate(-50%,-50%)',
              background: 'radial-gradient(ellipse at center, rgba(255,170,100,0.22), rgba(255,140,90,0) 65%)',
              opacity: finalGlow,
            }}
          />
          <div style={{position: 'relative'}}>
            <Kinetic frame={f} at={T.outroFinal} text="Đừng viết hộ người khác" size={70} weight={800} stagger={4} />
          </div>
          <div style={{position: 'relative', marginTop: 6}}>
            <Kinetic
              frame={f}
              at={T.outroFinal + 16}
              text="cái kết tệ nhất."
              size={70}
              weight={900}
              stagger={5}
              accent={['tệ', 'nhất.']}
              accentStyle={{
                background: 'linear-gradient(180deg,#ffe0a8 0%,#ff9b6a 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            />
          </div>
          <div
            style={{
              position: 'relative',
              marginTop: 46,
              fontFamily: FONT,
              fontWeight: 600,
              fontSize: 28,
              letterSpacing: 8,
              color: 'rgba(255,255,255,0.55)',
              opacity: ramp(f, T.outroFinal + 46, T.outroFinal + 66),
              transform: `translateY(${(1 - ramp(f, T.outroFinal + 46, T.outroFinal + 66)) * 12}px)`,
            }}
          >
            NGỦ ĐI. MAI RỒI TÍNH.
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// keep unused helper import from being tree-shaken warnings
void interpolate;
