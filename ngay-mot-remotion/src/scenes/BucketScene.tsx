import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Caption, FONT, Horizon, SharedDefs} from '../components/common';
import {Figure, FigureDefs, mix, P, Pose, POSES, solve, walk, walkBob} from '../components/Figure';
import {clamp, drift, EASE, keys, lerp, prog, rand, spr} from '../lib/anim';

/**
 * Scene 6 (local 0–270): "1% mỗi ngày" — one small bucket a day.
 * Time-lapse of 365 days; the tank fills with a compounding curve. "Sau một năm".
 */
const G = 1320;
const TX = 640;
const TW = 270;
const TH = 160;
const DX = 22;
const DY = -14;
const SC = 0.92;
const POUR_X = 548;

export const TL_START = 106;
export const TL_END = 204;

export const dayAt = (f: number) => {
  const u = prog(f, TL_START, TL_END, (t) => t * t * (1.6 - 0.6 * t));
  return f < TL_START ? 1 : Math.min(365, Math.round(1 + 364 * u));
};
const levelOf = (day: number) => {
  const lin = (day - 1) / 364;
  const comp = (Math.pow(1.01, day - 1) - 1) / (Math.pow(1.01, 364) - 1);
  return 0.045 + 0.955 * (0.45 * lin + 0.55 * comp);
};

type FigState = {x: number; pose: Pose; bob: number; flip: boolean; tilt: number; o: number};

const loopState = (p: number): FigState => {
  // one daily loop: walk in, pour, walk out
  if (p < 0.4) {
    const t = p / 0.4;
    return {x: lerp(300, POUR_X, t), pose: walk(t * 3, 1, POSES.carry), bob: walkBob(t * 3), flip: false, tilt: 0, o: 1};
  }
  if (p < 0.6) {
    const t = (p - 0.4) / 0.2;
    const k = Math.sin(t * Math.PI);
    return {x: POUR_X, pose: mix(POSES.carry, POSES.pour, k), bob: 0, flip: false, tilt: 135 * k, o: 1};
  }
  const t = (p - 0.6) / 0.4;
  return {x: lerp(POUR_X, 300, t), pose: walk(t * 3, 1, POSES.carry), bob: walkBob(t * 3), flip: true, tilt: 0, o: 1};
};

const figAt = (f: number): FigState => {
  if (f < 52) {
    const t = prog(f, 0, 52, EASE.out);
    const ph = f / 15;
    return {x: lerp(-90, POUR_X, t), pose: walk(ph, 1 - prog(f, 40, 52), POSES.carry), bob: walkBob(ph, 1 - prog(f, 40, 52)), flip: false, tilt: 0, o: 1};
  }
  if (f < 92) {
    const k = prog(f, 54, 64, EASE.inOut) * (1 - prog(f, 82, 92, EASE.inOut));
    return {x: POUR_X, pose: mix(POSES.carry, POSES.pour, k), bob: 0, flip: false, tilt: 135 * k, o: 1};
  }
  if (f < TL_START) {
    const t = prog(f, 92, TL_START);
    return {...loopState(0.6 + t * 0.4 * 0.5), o: 1};
  }
  if (f < TL_END) {
    const day = dayAt(f);
    const p = ((day * 0.37) % 1 + 1) % 1;
    return loopState((0.8 + p) % 1);
  }
  // final: standing proud beside the full tank, bucket set down
  const k = prog(f, TL_END + 4, TL_END + 22, EASE.out);
  return {x: POUR_X - 30, pose: mix(POSES.carry, POSES.proud, k), bob: 0, flip: false, tilt: 0, o: 1};
};

const Bucket: React.FC<{x: number; y: number; tilt: number; s?: number; fill?: number}> = ({x, y, tilt, s = SC, fill = 0.6}) => (
  <g transform={`translate(${x},${y}) rotate(${tilt}) scale(${s})`}>
    <path d="M-17,10 C-17,-8 17,-8 17,10" fill="none" stroke="#c8cfda" strokeWidth={2.5} />
    <path d="M-19,10 L19,10 L15,46 L-15,46 Z" fill="url(#bucketGrad)" />
    <rect x={-20} y={8} width={40} height={5} rx={2} fill="#3ed07c" />
    {fill > 0 && tilt < 30 && <rect x={-16} y={12} width={32} height={3} fill="#5ff0e2" opacity={0.9} />}
  </g>
);

export const BucketScene: React.FC = () => {
  const f = useCurrentFrame();
  const st = figAt(f);
  const day = dayAt(f);
  const pourSeg = f >= 58 && f < 88;
  const firstLevel = 0.045 * prog(f, 60, 88, EASE.inOut);
  const level = f < TL_START ? firstLevel : levelOf(day);
  const settle = spr(f, TL_END, {damping: 9, stiffness: 90});
  const slosh = f >= TL_END ? Math.sin((f - TL_END) / 3) * 10 * (1 - settle) * 0.9 + Math.sin((f - TL_END) / 3) * 2 : 0;

  // hand → bucket world position
  const sol = solve(st.pose);
  const sign = st.flip ? -1 : 1;
  const hx = st.x + sign * sol.armF[2][0] * SC;
  const hy = G + (sol.armF[2][1] - sol.ground + st.bob) * SC;
  const th = (st.tilt * Math.PI) / 180;
  const mouth = [hx + (-Math.sin(th) * 10) * SC * sign, hy + Math.cos(th) * 10 * SC];

  const speed = f >= TL_START && f < TL_END ? clamp((dayAt(f + 1) - dayAt(f - 1)) / 10) : 0;

  // camera
  const s = keys(f, [
    [0, 1.25],
    [60, 1.3],
    [100, 1.12],
    [TL_END, 1.0],
    [270, 1.08],
  ], EASE.cam);
  const cx = keys(f, [
    [0, 520],
    [60, 650],
    [100, 620],
    [TL_END, 600],
    [270, 640],
  ], EASE.cam);
  const cy = keys(f, [
    [0, 1180],
    [60, 1170],
    [100, 1120],
    [TL_END, 1060],
    [270, 1100],
  ], EASE.cam);
  const d = drift(f, 2);
  const camT = `translate(${540 + d.x}, ${960 + d.y}) scale(${s}) translate(${-cx}, ${-cy})`;

  const waterH = TH * clamp(level) - 6;
  const wy = G - 6 - waterH;
  const wave = (ph: number, amp: number) => {
    let dd = `M${TX + 6},${wy}`;
    for (let i = 0; i <= 24; i++) {
      const xx = TX + 6 + ((TW - 12) * i) / 24;
      const yy = wy + Math.sin(i / 2.2 + ph) * amp + slosh * ((i - 12) / 12);
      dd += ` L${xx.toFixed(1)},${yy.toFixed(1)}`;
    }
    dd += ` L${TX + TW - 6},${G - 6} L${TX + 6},${G - 6} Z`;
    return dd;
  };
  const amp = 3 + speed * 4 + (pourSeg ? 3 : 0);

  const tank = (refl: boolean) => (
    <g>
      {/* back frame (2.5D) */}
      <polygon points={`${TX},${G - TH} ${TX + DX},${G - TH + DY} ${TX + TW + DX},${G - TH + DY} ${TX + TW},${G - TH}`} fill="#ffffff" opacity={0.05} />
      <g stroke="#5d6573" strokeWidth={5} fill="none">
        <line x1={TX + DX} y1={G - TH + DY} x2={TX + TW + DX} y2={G - TH + DY} />
        <line x1={TX + TW + DX} y1={G - TH + DY} x2={TX + TW + DX} y2={G + DY} />
      </g>
      {/* water */}
      {waterH > 1 && (
        <g>
          <path d={wave(f / 5, amp * 0.6)} fill="#0d8f8a" opacity={0.9} transform={`translate(${DX * 0.6},${DY * 0.6})`} />
          <path d={wave(f / 4 + 1.3, amp)} fill="url(#waterGrad)" />
          <path d={wave(f / 4 + 1.3, amp).split(' L' + (TX + TW - 6))[0]} fill="none" stroke="#b8fff7" strokeWidth={3} opacity={0.9} />
          {!refl &&
            new Array(10).fill(0).map((_, i) => {
              const bt = ((f / 40 + rand(i)) % 1 + 1) % 1;
              const by = G - 10 - bt * waterH;
              return <circle key={i} cx={TX + 20 + rand(i * 5) * (TW - 40)} cy={by} r={2 + rand(i) * 3} fill="#d8fffb" opacity={0.35 * (1 - bt)} />;
            })}
        </g>
      )}
      {/* glass front */}
      <rect x={TX} y={G - TH} width={TW} height={TH} fill="url(#glass)" />
      <line x1={TX + 18} y1={G - TH + 14} x2={TX + 18} y2={G - 20} stroke="#fff" strokeOpacity={0.35} strokeWidth={4} strokeLinecap="round" />
      <g stroke="#7b8494" strokeWidth={9} fill="none" strokeLinecap="square">
        <line x1={TX} y1={G - TH} x2={TX} y2={G} />
        <line x1={TX + TW} y1={G - TH} x2={TX + TW} y2={G} />
        <line x1={TX} y1={G - 2} x2={TX + TW} y2={G - 2} />
      </g>
      <g stroke="#5d6573" strokeWidth={5}>
        <line x1={TX} y1={G - TH} x2={TX + DX} y2={G - TH + DY} />
        <line x1={TX + TW} y1={G - TH} x2={TX + TW + DX} y2={G - TH + DY} />
      </g>
    </g>
  );

  const ghosts = speed > 0.25 ? [3, 2, 1] : [];
  const figure = (
    <g>
      {ghosts.map((k) => {
        const g = figAt(f - k * 0.5);
        return <Figure key={k} x={g.x} y={G} pose={g.pose} bob={g.bob} flip={g.flip} scale={SC} opacity={0.18 * speed} shadow={false} />;
      })}
      <Figure x={st.x} y={G} pose={st.pose} bob={st.bob} flip={st.flip} scale={SC} glow={f > TL_END ? 0.6 * prog(f, TL_END, TL_END + 30) : 0} />
      {f < TL_END + 4 ? (
        <Bucket x={hx} y={hy} tilt={st.tilt * sign} />
      ) : (
        <Bucket x={POUR_X - 90} y={G - 46 * SC} tilt={0} fill={0} />
      )}
    </g>
  );

  // pouring stream
  const streamA = pourSeg ? Math.sin(prog(f, 58, 88) * Math.PI) : speed > 0.1 && st.tilt > 60 ? 0.8 : 0;
  const tgt = [TX + 70, wy];

  const finalGlow = prog(f, TL_END, TL_END + 40);

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 60% 26% at 62% 66%, rgba(30,210,200,${0.08 + 0.2 * clamp(level) + 0.12 * finalGlow}), rgba(0,0,0,0) 70%)`,
        }}
      />
      {/* day counter, deep in the background */}
      <div
        style={{
          position: 'absolute',
          top: 610,
          width: '100%',
          textAlign: 'center',
          fontFamily: FONT,
          color: '#fff',
          opacity: prog(f, TL_START - 8, TL_START + 6) * (1 - prog(f, 252, 264)),
        }}
      >
        <div style={{fontSize: 34, fontWeight: 500, letterSpacing: '0.5em', opacity: 0.55, marginLeft: '0.5em'}}>NGÀY</div>
        <div
          style={{
            fontSize: 210,
            fontWeight: 200,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
            color: day === 365 ? '#5ff0e2' : '#ffffff',
            textShadow: day === 365 ? '0 0 50px rgba(60,240,220,0.6)' : 'none',
            transform: `scale(${1 + (day === 365 ? 0.08 * (1 - settle) : 0)})`,
          }}
        >
          {day}
        </div>
      </div>
      <AbsoluteFill>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920">
          <defs>
            <FigureDefs />
            <SharedDefs />
            <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4ff2e1" />
              <stop offset="1" stopColor="#0aa39b" />
            </linearGradient>
            <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.14" />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.03" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="bucketGrad" x1="0" x2="1">
              <stop offset="0" stopColor="#2fd27a" />
              <stop offset="1" stopColor="#13874a" />
            </linearGradient>
            <linearGradient id="reflOverlayB" gradientUnits="userSpaceOnUse" x1="0" y1={G} x2="0" y2={G + 300}>
              <stop offset="0" stopColor="#000" stopOpacity="0.6" />
              <stop offset="1" stopColor="#000" stopOpacity="1" />
            </linearGradient>
          </defs>
          <g transform={camT}>
            <g transform={`translate(0,${2 * G}) scale(1,-1)`} opacity={0.45}>
              {tank(true)}
              {figure}
            </g>
            <rect x={-1000} y={G} width={3000} height={900} fill="url(#reflOverlayB)" />
            <Horizon y={G} color="#ffffff" width={1500} />
            {tank(false)}
            {streamA > 0 && (
              <g opacity={streamA}>
                <path
                  d={`M${mouth[0]},${mouth[1]} Q${mouth[0] + 40},${mouth[1] - 6} ${tgt[0]},${tgt[1]}`}
                  fill="none"
                  stroke="#6ff5e8"
                  strokeWidth={9}
                  strokeLinecap="round"
                  opacity={0.9}
                />
                <path
                  d={`M${mouth[0]},${mouth[1]} Q${mouth[0] + 40},${mouth[1] - 6} ${tgt[0]},${tgt[1]}`}
                  fill="none"
                  stroke="#e6fffc"
                  strokeWidth={3}
                  strokeDasharray="10 14"
                  strokeDashoffset={-f * 6}
                />
                {new Array(7).fill(0).map((_, i) => {
                  const t = ((f / 8 + i / 7) % 1 + 1) % 1;
                  return (
                    <circle
                      key={i}
                      cx={tgt[0] + (rand(i) - 0.5) * 50 * t}
                      cy={tgt[1] - 26 * Math.sin(t * Math.PI)}
                      r={3}
                      fill="#bafff8"
                      opacity={1 - t}
                    />
                  );
                })}
              </g>
            )}
            {figure}
          </g>
        </svg>
      </AbsoluteFill>

      <Caption
        words={[{t: '1%', c: '#5ff0e2', w: 800, size: 96}, {t: 'mỗi', w: 600}, {t: 'ngày', w: 600}]}
        at={12}
        out={TL_START - 6}
        y={420}
        size={64}
        stagger={5}
      />
      <Caption
        words={[{t: 'Sau'}, {t: 'một'}, {t: 'năm', c: '#5ff0e2'}]}
        at={TL_END + 6}
        out={258}
        y={420}
        size={64}
      />
      <div
        style={{
          position: 'absolute',
          top: 1430,
          width: '100%',
          textAlign: 'center',
          fontFamily: FONT,
          fontSize: 50,
          fontWeight: 300,
          color: '#e9f2f7',
          opacity: prog(f, TL_END + 26, TL_END + 42) * (1 - prog(f, 256, 266)),
          transform: `translateY(${(1 - prog(f, TL_END + 26, TL_END + 42, EASE.out)) * 24}px)`,
        }}
      >
        1,01<sup style={{fontSize: 28, fontWeight: 500}}>365</sup> ≈{' '}
        <span style={{fontWeight: 800, color: '#5ff0e2', textShadow: '0 0 30px rgba(60,240,220,0.5)'}}>37,8</span> lần
      </div>
    </AbsoluteFill>
  );
};
