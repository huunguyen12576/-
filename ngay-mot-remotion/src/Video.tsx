import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, Sequence, staticFile} from 'remotion';
import {FilmFinish, SceneFade} from './components/common';
import {BucketScene} from './scenes/BucketScene';
import {FieldScene} from './scenes/FieldScene';
import {MountainScene} from './scenes/MountainScene';
import {OutroScene} from './scenes/OutroScene';
import {PillarScene} from './scenes/PillarScene';
import T from './timeline.json';

const VI_RANGE =
  'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB';
const LATIN_RANGE =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const LATIN_EXT_RANGE =
  'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF';

const useMontserrat = () => {
  const [handle] = useState(() => delayRender('Loading Montserrat'));
  useEffect(() => {
    const faces = [
      new FontFace('Montserrat', `url(${staticFile('fonts/montserrat-latin-wght-normal.woff2')}) format('woff2')`, {weight: '100 900', unicodeRange: LATIN_RANGE}),
      new FontFace('Montserrat', `url(${staticFile('fonts/montserrat-latin-ext-wght-normal.woff2')}) format('woff2')`, {weight: '100 900', unicodeRange: LATIN_EXT_RANGE}),
      new FontFace('Montserrat', `url(${staticFile('fonts/montserrat-vietnamese-wght-normal.woff2')}) format('woff2')`, {weight: '100 900', unicodeRange: VI_RANGE}),
    ];
    Promise.all(faces.map((ff) => ff.load()))
      .then((loaded) => {
        loaded.forEach((ff) => (document.fonts as unknown as {add: (f: FontFace) => void}).add(ff));
        return document.fonts.ready;
      })
      .then(() => continueRender(handle))
      .catch((e) => {
        console.error(e);
        continueRender(handle);
      });
  }, [handle]);
};

const S = T.scenes;

export const Video: React.FC = () => {
  useMontserrat();
  const seq = (k: keyof typeof S, el: React.ReactNode, inDur = 8, outDur = 9) => {
    const [a, b] = S[k];
    return (
      <Sequence from={a} durationInFrames={b - a} name={k}>
        <SceneFade inDur={inDur} outAt={b - a - outDur} outDur={outDur}>
          {el}
        </SceneFade>
      </Sequence>
    );
  };
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {seq('pillar', <PillarScene />, 1)}
      {seq('field', <FieldScene />)}
      {seq('mountain', <MountainScene />)}
      {seq('bucket', <BucketScene />)}
      {seq('outro', <OutroScene />, 8, 1)}
      <FilmFinish />
      <Audio src={staticFile('audio/soundtrack.wav')} />
    </AbsoluteFill>
  );
};
