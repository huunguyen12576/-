import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT, MONO, cue, eo, scene} from '../lib';
import {Rise} from '../ui';

export const Cta: React.FC<{t: number}> = ({t}) => {
  const [a] = scene('cta');
  const at = cue('c43').t0 - 0.1;
  const bounce = Math.abs(Math.sin((t - at) * 3.2)) * 22 * (t > at ? 1 : 0);
  return (
    <AbsoluteFill style={{opacity: eo(t, a, 0.5)}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1215, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14}}>
        <Rise t={t} at={at}>
          <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 64, color: '#FFFFFF', lineHeight: 1.25}}>Repo ở bình luận đầu tiên</div>
        </Rise>
        <div style={{transform: `translateY(${bounce}px)`, opacity: eo(t, at + 0.3, 0.4)}}>
          <svg width="80" height="80" viewBox="0 0 24 24">
            <path d="M12 4v15M5 12l7 7 7-7" stroke={C.blueprintLine} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{fontFamily: MONO, fontSize: 30, color: 'rgba(255,255,255,0.7)', opacity: eo(t, at + 0.6, 0.5)}}>github.com/github/spec-kit</div>
      </div>
    </AbsoluteFill>
  );
};
