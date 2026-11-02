import React from 'react';
import {Composition} from 'remotion';
import {Film} from './Film';
import tl from './timeline.json';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="SpecKitFilm"
    component={Film}
    durationInFrames={Math.round(tl.duration * tl.fps)}
    fps={tl.fps}
    width={1080}
    height={1920}
  />
);
