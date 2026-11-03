import React from 'react';
import {Composition} from 'remotion';
import {Main} from './Main';
import {DURATION, FPS, H, W} from './timeline';

export const RemotionRoot: React.FC = () => (
  <Composition id="CauToanVsHanhDong" component={Main} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
);
