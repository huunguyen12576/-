import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT, MONO, cue, eback, eio, eo, scene, sceneAlpha} from '../lib';
import {Eyebrow, Rise} from '../ui';

const MAIN = [
  {cue: 'c35a', name: 'Claude Code'},
  {cue: 'c35b', name: 'Cursor'},
  {cue: 'c35c', name: 'Copilot'},
  {cue: 'c35d', name: 'Codex'},
  {cue: 'c35e', name: 'Gemini CLI'},
];

// Integrations listed in github/spec-kit docs/integrations/index.md (Nov 2026), names only — no logos.
const OTHERS = [
  'Alquimia AI', 'Amp', 'Antigravity', 'Auggie CLI', 'Cline', 'CodeBuddy CLI', 'Command Code', 'DeepSeek Harness',
  'Devin for Terminal', 'Docker Agent', 'Factory Droid', 'Firebender', 'Forge', 'Goose', 'Grok Build', 'Hermes', 'IBM Bob',
  'Junie', 'Kilo Code', 'Kimi Code', 'Kiro CLI', 'Lingma', 'MiniMax Code', 'Mistral Vibe', 'Muse Code', 'Oh My Pi', 'opencode',
  'Pi Coding Agent', 'Qoder CLI', 'Qwen Code', 'RovoDev', 'SHAI', 'Tabnine CLI', 'Trae', 'ZCode', 'Zed',
];

export const Agents: React.FC<{t: number}> = ({t}) => {
  const [a, b] = scene('agents');
  const alpha = sceneAlpha(t, a, b, 0.4, 0.4);
  const wallT = cue('c35f').t0 - 0.1;
  const wall = eio(t, wallT, 0.8);

  return (
    <AbsoluteFill style={{opacity: alpha}}>
      <div style={{position: 'absolute', left: 90, top: 220, opacity: 1 - wall}}>
        <Rise t={t} at={a - 0.15}>
          <Eyebrow color={C.violet}>Chạy cùng agent bạn đang dùng</Eyebrow>
        </Rise>
      </div>
      {/* the five named agents */}
      {MAIN.map((m, i) => {
        const p = eback(t, cue(m.cue).t0 - 0.12, 0.5);
        const y0 = 330 + i * 160;
        return (
          <div
            key={i}
            style={{
              position: 'absolute', left: 0, right: 0, top: y0 - wall * 120, display: 'flex', justifyContent: 'center',
              opacity: Math.min(1, p) * (1 - wall * 0.85), transform: `scale(${(0.7 + p * 0.3) * (1 - wall * 0.3)})`,
              filter: `blur(${wall * 6}px)`,
            }}
          >
            <div
              style={{
                padding: '22px 46px', borderRadius: 999, background: '#FFFFFF', boxShadow: '0 20px 60px rgba(60,40,140,0.15)',
                border: '1px solid rgba(110,86,207,0.2)', fontFamily: FONT, fontWeight: 800, fontSize: 76, color: C.ink, lineHeight: 1.2,
              }}
            >
              {m.name}
            </div>
          </div>
        );
      })}
      {/* the wall: every other integration */}
      <AbsoluteFill style={{opacity: wall}}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((row) => {
          const names = OTHERS.filter((_, k) => k % 8 === row);
          const items = [...names, ...names, ...names];
          const dir = row % 2 === 0 ? -1 : 1;
          const off = ((t - wallT) * 90 * dir + row * 137) % 900;
          return (
            <div
              key={row}
              style={{
                position: 'absolute', top: 250 + row * 148, left: -400 + off, display: 'flex', gap: 22, whiteSpace: 'nowrap',
                opacity: row === 3 || row === 4 ? 0.25 : 0.75,
              }}
            >
              {items.map((n, k) => (
                <div
                  key={k}
                  style={{
                    padding: '14px 30px', borderRadius: 999, background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(110,86,207,0.18)',
                    fontFamily: FONT, fontWeight: 600, fontSize: 40, color: C.ink, opacity: eo(t, wallT + ((k * 7 + row * 3) % 12) * 0.06, 0.4),
                  }}
                >
                  {n}
                </div>
              ))}
            </div>
          );
        })}
        <div style={{position: 'absolute', left: 0, right: 0, top: 640, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <div
            style={{
              padding: '30px 70px 40px', borderRadius: 60, background: 'rgba(238,240,250,0.92)', boxShadow: '0 40px 120px rgba(60,40,140,0.25)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${0.8 + eback(t, wallT + 0.15, 0.6) * 0.2})`,
            }}
          >
            <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 260, color: C.violet, lineHeight: 1.05, letterSpacing: -10}}>40+</div>
            <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 56, color: C.ink}}>agent tương thích</div>
            <div style={{fontFamily: MONO, fontSize: 24, color: C.inkSoft, marginTop: 10}}>theo tài liệu tích hợp của Spec Kit</div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
