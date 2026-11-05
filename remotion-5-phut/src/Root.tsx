import React from 'react';
import {Composition} from 'remotion';
import {NamPhut} from './NamPhut';
import T from './timeline.json';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="NamPhut"
    component={NamPhut}
    durationInFrames={T.total}
    fps={T.fps}
    width={1080}
    height={1920}
  />
);
