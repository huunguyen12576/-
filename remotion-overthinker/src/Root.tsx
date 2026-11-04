import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/800.css';
import '@fontsource/montserrat/900.css';
import React from 'react';
import {Composition, continueRender, delayRender} from 'remotion';
import {Overthinker} from './Overthinker';
import T from './timeline.json';

const handle = typeof document !== 'undefined' ? delayRender('Loading Montserrat') : null;
if (typeof document !== 'undefined') {
  Promise.all(
    [600, 700, 800, 900].map((w) => document.fonts.load(`${w} 40px Montserrat`, 'Cùng một tin nhắn ĐÊM KHÁC NHAU Ẩn Ữ ệ'))
  ).then(() => continueRender(handle!));
}

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Overthinker"
    component={Overthinker}
    durationInFrames={T.duration}
    fps={T.fps}
    width={1080}
    height={1920}
  />
);
