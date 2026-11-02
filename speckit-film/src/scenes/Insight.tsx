import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT, MONO, cue, eio, eo, scene} from '../lib';
import {Rise} from '../ui';

// The tower that collapsed in act one — rebuilt, layer by layer, on a blueprint.
const LAYERS = [
  {name: 'constitution', w: 760},
  {name: 'spec', w: 700},
  {name: 'clarify', w: 640},
  {name: 'plan', w: 580},
  {name: 'tasks', w: 520},
  {name: 'code', w: 460},
];
const LH = 104;
const BASE = 1390;

export const Insight: React.FC<{t: number}> = ({t}) => {
  const [a] = scene('insight');
  const ctaStart = scene('cta')[0];
  const alpha = eio(t, a - 0.3, 0.6);
  const draw = (i: number) => eio(t, cue('c40').t0 + i * 0.32, 0.9);
  const fillAt = cue('c42').t0 - 0.05;
  const cta = eio(t, ctaStart - 0.1, 0.9);
  const line1Out = cue('c41').t0 - 0.25;
  const hl = eio(t, cue('c42').t0 + 0.35, 0.6);

  return (
    <AbsoluteFill style={{opacity: alpha}}>
      {/* words */}
      <div style={{position: 'absolute', left: 90, right: 90, top: 210, fontFamily: FONT, color: '#FFFFFF', opacity: 1 - cta}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 0, opacity: 1 - eio(t, line1Out, 0.35)}}>
          <Rise t={t} at={cue('c40').t0 - 0.05}>
            <div style={{fontWeight: 600, fontSize: 60, lineHeight: 1.3, color: 'rgba(255,255,255,0.75)'}}>AI chưa bao giờ</div>
          </Rise>
          <Rise t={t} at={cue('c40').t0 + 0.55}>
            <div style={{fontWeight: 900, fontSize: 104, lineHeight: 1.2, letterSpacing: -3}}>thiếu tốc độ.</div>
          </Rise>
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 0}}>
          <Rise t={t} at={cue('c41').t0 - 0.05}>
            <div style={{fontWeight: 600, fontSize: 60, lineHeight: 1.3, color: 'rgba(255,255,255,0.75)'}}>Thứ nó thiếu…</div>
          </Rise>
          <Rise t={t} at={cue('c42').t0 - 0.05}>
            <div style={{fontWeight: 900, fontSize: 86, lineHeight: 1.2, letterSpacing: -3, whiteSpace: 'nowrap'}}>
              là một{' '}
              <span style={{position: 'relative', color: '#FFFFFF'}}>
                bản thiết kế.
                <span
                  style={{
                    position: 'absolute', left: 0, bottom: -4, height: 12, borderRadius: 6, width: `${hl * 100}%`,
                    background: C.blueprintLine, boxShadow: `0 0 24px ${C.blueprintLine}`,
                  }}
                />
              </span>
            </div>
          </Rise>
        </div>
      </div>

      {/* end tag during CTA */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 230, textAlign: 'center', opacity: cta}}>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 112, color: '#FFFFFF', lineHeight: 1.2, letterSpacing: -3}}>
          Spec trước.
          <br />
          <span style={{color: C.blueprintLine}}>Code sau.</span>
        </div>
      </div>

      {/* blueprint tower */}
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${-cta * 330}px) scale(${1 - cta * 0.3})`, transformOrigin: '50% 90%'}}>
        <svg width="1080" height="1920" style={{position: 'absolute', inset: 0}}>
          {/* ground line */}
          <line x1={540 - 460 * draw(0)} x2={540 + 460 * draw(0)} y1={BASE} y2={BASE} stroke={C.blueprintLine} strokeWidth={3} />
          {/* dimension line */}
          <g opacity={draw(3)}>
            <line x1={70} x2={70} y1={BASE} y2={BASE - LAYERS.length * LH * draw(3)} stroke={C.blueprintLine} strokeWidth={2} />
            <line x1={56} x2={84} y1={BASE} y2={BASE} stroke={C.blueprintLine} strokeWidth={2} />
            <line x1={56} x2={84} y1={BASE - LAYERS.length * LH} y2={BASE - LAYERS.length * LH} stroke={C.blueprintLine} strokeWidth={2} opacity={draw(5)} />
          </g>
          {LAYERS.map((L, i) => {
            const p = draw(i);
            const x = 540 - L.w / 2;
            const y = BASE - (i + 1) * LH + 8;
            const h = LH - 16;
            const per = 2 * (L.w + h);
            const f = eo(t, fillAt + i * 0.12, 0.6);
            return (
              <g key={i}>
                <rect
                  x={x} y={y} width={L.w} height={h} rx={16} fill={`rgba(157,184,255,${0.04 + f * 0.22})`} stroke={C.blueprintLine}
                  strokeWidth={3} strokeDasharray={per} strokeDashoffset={per * (1 - p)}
                />
                <rect x={x} y={y} width={L.w} height={h} rx={16} fill="#FFFFFF" opacity={f * 0.92} />
                <text
                  x={540} y={y + h / 2 + 12} textAnchor="middle" fontFamily={MONO} fontSize={36} fontWeight={700}
                  fill={f > 0.5 ? C.blueprint : C.blueprintLine} opacity={eo(t, cue('c40').t0 + i * 0.32 + 0.5, 0.5)}
                >
                  {i === 5 ? 'code' : L.name === 'clarify' ? 'clarify' : `${L.name}.md`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </AbsoluteFill>
  );
};
