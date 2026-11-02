import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT, MONO, clamp, cue, eback, eio, eo, lin, rand, scene, sceneAlpha} from '../lib';
import {Rise} from '../ui';

const BLOCKS = 13;
const BASE_Y = 1390;
const BH = 66;
const ERRORS = ['TypeError', 'undefined', '500', 'merge conflict', 'null', 'build failed', 'any'];
const LINE_COLORS = ['#8B7CFF', '#5CC8FF', '#FFB547', '#FF7AB6', '#7CE0A3', '#ECEAFF'];

export const CodeBlock: React.FC<{w: number; seed: number; tint?: string; err?: string; errAlpha?: number}> = ({w, seed, tint, err, errAlpha = 0}) => {
  const segs = 3 + Math.floor(rand(seed) * 4);
  return (
    <div
      style={{
        width: w, height: BH - 8, borderRadius: 14, background: tint ?? 'rgba(30,27,52,0.95)',
        border: '1px solid rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px',
        position: 'relative', boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      }}
    >
      {Array.from({length: segs}).map((_, k) => (
        <div
          key={k}
          style={{
            height: 12, borderRadius: 6, flex: `0 0 ${30 + rand(seed * 7 + k) * (w / segs - 40)}px`,
            background: LINE_COLORS[Math.floor(rand(seed * 3 + k * 5) * LINE_COLORS.length)], opacity: 0.85,
          }}
        />
      ))}
      {err && (
        <div
          style={{
            position: 'absolute', right: -16, top: -22, padding: '6px 14px', borderRadius: 10, background: C.red,
            color: '#fff', fontFamily: MONO, fontSize: 24, fontWeight: 700, opacity: errAlpha,
            transform: `scale(${0.6 + errAlpha * 0.4})`, whiteSpace: 'nowrap',
          }}
        >
          {err}
        </div>
      )}
    </div>
  );
};

export const Collapse: React.FC<{t: number}> = ({t}) => {
  const [a, b] = scene('collapse');
  const alpha = sceneAlpha(t, a, b, 0.3, 0.5);
  const tc = cue('c5').t0 - 0.02; // "vỡ vụn"
  const shake = t > tc && t < tc + 0.7 ? (1 - (t - tc) / 0.7) * 26 : 0;
  const sx = Math.sin(t * 91) * shake;
  const sy = Math.cos(t * 77) * shake;
  const redFlash = Math.max(0, 1 - Math.abs(t - tc - 0.04) / 0.25);
  const vibe = cue('c6').t0;
  const glitchOn = t > vibe && t < vibe + 1.6;
  const gx = glitchOn ? (rand(Math.floor(t * 24)) - 0.5) * 22 : 0;

  return (
    <AbsoluteFill style={{opacity: alpha}}>
      <AbsoluteFill style={{transform: `translate(${sx}px, ${sy}px)`}}>
        {Array.from({length: BLOCKS}).map((_, i) => {
          const appear = a + 0.08 + i * 0.15;
          const p = eback(t, appear, 0.35);
          const w = 330 + rand(i + 1) * 300;
          const instability = lin(t, 5.2, 2.2);
          const wob = Math.sin(t * (5 + i * 0.6) + i) * instability * (6 + i * 3.2);
          const x0 = 540 - w / 2 + (rand(i * 13) - 0.5) * 70 + wob;
          const y0 = BASE_Y - (i + 1) * BH;
          const r0 = (rand(i * 17) - 0.5) * 4 * instability + wob * 0.08;
          let x = x0;
          let y = y0 - (1 - p) * 260;
          let r = r0;
          if (t > tc) {
            const dt = t - tc - i * 0.012;
            if (dt > 0) {
              const vx = (rand(i * 31) - 0.5) * 1400;
              const vy = -300 - rand(i * 41) * 900 + i * 40;
              x = x0 + vx * dt;
              y = y0 + vy * dt + 0.5 * 4200 * dt * dt;
              r = r0 + (rand(i * 7) - 0.5) * 520 * dt;
            }
          }
          const errIdx = i % 2 === 1 ? Math.floor(i / 2) % ERRORS.length : -1;
          const errAt = 5.3 + (i % 7) * 0.24;
          return (
            <div key={i} style={{position: 'absolute', left: x, top: y, transform: `rotate(${r}deg)`, opacity: Math.min(1, p * 1.5)}}>
              <CodeBlock
                w={w}
                seed={i + 3}
                tint={t > errAt && errIdx >= 0 ? 'rgba(70,22,36,0.95)' : undefined}
                err={errIdx >= 0 ? ERRORS[errIdx] : undefined}
                errAlpha={errIdx >= 0 ? eback(t, errAt, 0.3) : 0}
              />
            </div>
          );
        })}
      </AbsoluteFill>

      {/* red impact flash */}
      <AbsoluteFill style={{background: C.red, mixBlendMode: 'screen', opacity: redFlash * 0.45, pointerEvents: 'none'}} />

      {/* "the price of vibe coding" */}
      <AbsoluteFill style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 520, flexDirection: 'column'}}>
        <Rise t={t} at={vibe - 0.1} dur={0.5}>
          <div style={{fontFamily: FONT, fontWeight: 600, fontSize: 52, color: 'rgba(236,234,255,0.8)', textAlign: 'center'}}>Cái giá của</div>
        </Rise>
        <div style={{position: 'relative', marginTop: 24, opacity: eo(t, vibe + 0.05, 0.3)}}>
          {[
            {c: '#FF2D55', dx: -gx * 0.6, dy: gx * 0.2, o: glitchOn ? 0.8 : 0},
            {c: '#2DE1FF', dx: gx * 0.6, dy: -gx * 0.2, o: glitchOn ? 0.8 : 0},
            {c: '#FFFFFF', dx: 0, dy: 0, o: 1},
          ].map((l, k) => (
            <div
              key={k}
              style={{
                position: k < 2 ? 'absolute' : 'relative', left: 0, top: 0, transform: `translate(${l.dx}px, ${l.dy}px)`,
                fontFamily: FONT, fontWeight: 900, fontSize: 170, lineHeight: 1.05, letterSpacing: -6, color: l.c,
                opacity: l.o, mixBlendMode: k < 2 ? 'screen' : 'normal', textAlign: 'center',
                clipPath: glitchOn && k === 2 && rand(Math.floor(t * 30)) > 0.7 ? `inset(${rand(t) * 50}% 0 ${rand(t + 1) * 30}% 0)` : undefined,
              }}
            >
              VIBE
              <br />
              CODING
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 40, width: 720 * eio(t, vibe + 0.5, 0.7), height: 8, borderRadius: 4, background: C.red,
            boxShadow: `0 0 30px ${C.red}`,
          }}
        />
      </AbsoluteFill>
      {/* close to black before revelation */}
      <AbsoluteFill style={{background: '#000', opacity: clamp((t - 10.25) / 0.5), pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};
