import React from 'react';
import {Composition} from 'remotion';
import {Video} from './Video';
import T from './timeline.json';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="NgayMot"
    component={Video}
    durationInFrames={T.duration}
    fps={T.fps}
    width={T.width}
    height={T.height}
  />
);
