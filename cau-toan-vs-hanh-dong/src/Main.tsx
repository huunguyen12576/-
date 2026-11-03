import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {Row} from './Row';
import {Ending, GlobalDefs, Hook, Post} from './Scenes';
import {H, R3, S, W, camAt, ease, inv, tween} from './timeline';
import './fonts';

export const Main: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camAt(f);
  const inT = ease.out(inv(S.hookOut, S.hookOut + 16, f));
  const fade = 1 - ease.inOut(inv(S.endFade, S.endFade + 22, f));
  const stageO = inT * fade;
  const s = cam.s * (1 + (1 - inT) * 0.08) * (1 - (1 - fade) * 0.06);
  const tx = W / 2 - cam.cx * s;
  const ty = H / 2 - cam.cy * s;
  return (
    <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden'}}>
      <GlobalDefs />
      {stageO > 0.001 && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: W,
            height: H,
            transformOrigin: '0 0',
            transform: `translate(${tx}px, ${ty}px) scale(${s})`,
            opacity: stageO,
            filter: fade < 1 ? `blur(${(1 - fade) * 10}px)` : undefined,
          }}
        >
          {[0, 1, 2].map((i) => (
            <Row key={i} i={i} f={f} />
          ))}
        </div>
      )}
      <Hook f={f} />
      <Ending f={f} />
      <Post f={f} swish={R3.swish} />
      <Audio src={staticFile('audio.wav')} volume={tween(f, S.end - 12, S.end, 1, 0)} />
    </AbsoluteFill>
  );
};
