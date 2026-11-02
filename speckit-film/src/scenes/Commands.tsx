import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT, MONO, cue, eback, eio, eo, scene, sceneAlpha} from '../lib';

// Command names as documented in github/spec-kit (docs/reference/agentic-sdd.md).
const CMDS = [
  {cue: 'c19', name: 'constitution', desc: 'Quy tắc & tiêu chuẩn', out: 'constitution.md'},
  {cue: 'c21', name: 'specify', desc: 'Bạn muốn xây gì', out: 'spec.md'},
  {cue: 'c23', name: 'clarify', desc: 'Làm rõ trước khi bắt đầu', out: 'spec.md ✎'},
  {cue: 'c25', name: 'plan', desc: 'Kiến trúc & công nghệ', out: 'plan.md'},
  {cue: 'c27', name: 'tasks', desc: 'Nhiệm vụ theo thứ tự', out: 'tasks.md'},
  {cue: 'c29', name: 'implement', desc: 'Thực thi', out: 'code ✓'},
];

const LIST_TOP = 250;
const ROW = 98;
const CARD_TOP = 930;

export const Commands: React.FC<{t: number}> = ({t}) => {
  const [a, b] = scene('commands');
  const alpha = sceneAlpha(t, a, b, 0.4, 0.4);
  const six = cue('c18').t0;
  const sixIn = eback(t, six + 0.15, 0.7);
  const sixOut = eio(t, cue('c19').t0 - 0.5, 0.45);
  const starts = CMDS.map((c) => cue(c.cue).t0 - 0.18);

  return (
    <AbsoluteFill style={{opacity: alpha}}>
      {/* "6 lệnh" */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: 360, display: 'flex', flexDirection: 'column', alignItems: 'center',
          opacity: Math.min(eo(t, six + 0.1, 0.4), 1 - sixOut), transform: `scale(${(0.6 + sixIn * 0.4) * (1 - sixOut * 0.3)}) translateY(${-sixOut * 200}px)`,
        }}
      >
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 560, lineHeight: 1, color: C.violet, letterSpacing: -20}}>6</div>
        <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 92, color: C.ink, marginTop: -10}}>lệnh</div>
        <div style={{fontFamily: FONT, fontWeight: 400, fontSize: 42, color: C.inkSoft, marginTop: 16}}>từ ý tưởng tới code</div>
      </div>

      {/* progress segments */}
      <div style={{position: 'absolute', left: 90, right: 90, top: 160, display: 'flex', gap: 12, opacity: eo(t, starts[0] - 0.2, 0.4)}}>
        {CMDS.map((_, i) => (
          <div key={i} style={{flex: 1, height: 10, borderRadius: 5, background: 'rgba(21,22,43,0.08)', overflow: 'hidden'}}>
            <div style={{width: `${eio(t, starts[i], 0.5) * 100}%`, height: '100%', background: i === 5 ? C.mint : C.violet}} />
          </div>
        ))}
      </div>

      {CMDS.map((c, i) => {
        const at = starts[i];
        const next = i < 5 ? starts[i + 1] : 999;
        const enter = eo(t, at, 0.6);
        const leave = eio(t, next - 0.05, 0.45);
        const rowIn = eo(t, next - 0.05, 0.5);
        const finalRow = i === 5 ? eo(t, cue('c30').t1 + 0.1, 0.4) : 0;
        if (t < at - 0.1) return null;
        return (
          <React.Fragment key={i}>
            {/* list row (history) */}
            <div
              style={{
                position: 'absolute', left: 90, right: 90, top: LIST_TOP + i * ROW, height: ROW - 14, display: 'flex', alignItems: 'center', gap: 22,
                opacity: Math.max(rowIn, finalRow), transform: `translateY(${(1 - Math.max(rowIn, finalRow)) * 40}px)`,
              }}
            >
              <div style={{width: 52, height: 52, borderRadius: 26, background: i === 5 ? C.mint : C.violet, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <svg width="28" height="28" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div style={{fontFamily: MONO, fontSize: 38, color: C.ink, fontWeight: 700}}>
                <span style={{color: C.violet, fontWeight: 400}}>/speckit.</span>
                {c.name}
              </div>
              <div style={{flex: 1}} />
              <div style={{fontFamily: MONO, fontSize: 28, color: C.inkSoft}}>{c.out}</div>
            </div>
            {/* active card */}
            {t < next + 0.6 && (
              <div
                style={{
                  position: 'absolute', left: 80, right: 80, top: CARD_TOP, padding: '46px 54px 50px', borderRadius: 44,
                  background: '#FFFFFF', border: `2px solid ${i === 5 ? 'rgba(20,168,110,0.35)' : 'rgba(110,86,207,0.25)'}`,
                  boxShadow: '0 50px 120px rgba(60,40,140,0.20)',
                  opacity: enter * (1 - leave),
                  transform: `perspective(1800px) translateY(${(1 - enter) * 260 - leave * 420}px) rotateX(${(1 - enter) * -24 + leave * 18}deg) scale(${1 - leave * 0.35})`,
                  transformOrigin: '50% 0%',
                }}
              >
                <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 28, color: C.inkSoft}}>
                  <span>0{i + 1} / 06</span>
                  <span style={{color: i === 5 ? C.mint : C.violet}}>→ {c.out}</span>
                </div>
                <div style={{marginTop: 26, fontFamily: MONO, fontSize: 44, color: C.violet}}>/speckit.</div>
                <div style={{fontFamily: MONO, fontWeight: 700, fontSize: c.name.length > 10 ? 104 : 120, color: C.ink, lineHeight: 1.1, letterSpacing: -3}}>
                  {c.name.split('').map((ch, k) => (
                    <span key={k} style={{opacity: eo(t, at + 0.05 + k * 0.025, 0.2)}}>{ch}</span>
                  ))}
                </div>
                <div style={{marginTop: 22, fontFamily: FONT, fontWeight: 800, fontSize: 58, color: i === 5 ? C.mint : C.ink, lineHeight: 1.25, opacity: eo(t, cue(CMDS[i].cue).t1 - 0.05, 0.5)}}>
                  {c.desc}
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
