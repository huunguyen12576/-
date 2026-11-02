import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/800.css';
import '@fontsource/be-vietnam-pro/900.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import {C, FONT, TL, clamp, eio, scene} from './lib';
import {Hook} from './scenes/Hook';
import {Collapse} from './scenes/Collapse';
import {Reveal} from './scenes/Reveal';
import {Idea} from './scenes/Idea';
import {Steps} from './scenes/Steps';
import {Commands} from './scenes/Commands';
import {Results} from './scenes/Results';
import {Agents} from './scenes/Agents';
import {Stats} from './scenes/Stats';
import {Insight} from './scenes/Insight';
import {Cta} from './scenes/Cta';

const useFonts = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const specs = [
      '400 40px "Be Vietnam Pro"', '600 40px "Be Vietnam Pro"', '800 40px "Be Vietnam Pro"', '900 40px "Be Vietnam Pro"',
      '400 40px "JetBrains Mono"', '700 40px "JetBrains Mono"',
    ];
    Promise.all(specs.map((s) => document.fonts.load(s, 'Ắệỹ Spec'))).then(() => continueRender(handle));
  }, [handle]);
};

/** 0 = night (chaos), 1 = paper (clarity), 2 = blueprint (payoff) */
const themeAt = (t: number) => {
  const toPaper = eio(t, 11.25, 0.9);
  const toBlue = eio(t, scene('insight')[0] - 0.35, 0.8);
  return {toPaper, toBlue};
};

const Background: React.FC<{t: number}> = ({t}) => {
  const {toPaper, toBlue} = themeAt(t);
  const drift = t * 6;
  const gridOpacity = toPaper * (1 - toBlue) * 0.55;
  return (
    <AbsoluteFill>
      {/* night */}
      <AbsoluteFill style={{background: `radial-gradient(120% 70% at 50% ${40 + Math.sin(t * 0.4) * 4}%, #1A1530 0%, ${C.night} 60%)`}} />
      {/* paper: soft lavender atmosphere (echoes the reference's misty light UI) */}
      <AbsoluteFill
        style={{
          opacity: toPaper * (1 - toBlue),
          background: `radial-gradient(90% 55% at ${30 + Math.sin(t * 0.21) * 8}% 18%, #FFFFFF 0%, rgba(255,255,255,0) 60%),
            radial-gradient(80% 50% at ${78 + Math.cos(t * 0.17) * 6}% 85%, #D9D2FF 0%, rgba(217,210,255,0) 65%),
            linear-gradient(180deg, ${C.paper} 0%, ${C.paper2} 100%)`,
        }}
      />
      {/* blueprint grid on paper */}
      <AbsoluteFill
        style={{
          opacity: gridOpacity,
          backgroundImage: `linear-gradient(rgba(110,86,207,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(110,86,207,0.10) 1px, transparent 1px),
            linear-gradient(rgba(110,86,207,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(110,86,207,0.05) 1px, transparent 1px)`,
          backgroundSize: '120px 120px, 120px 120px, 24px 24px, 24px 24px',
          backgroundPosition: `0 ${drift}px, 0 ${drift}px, 0 ${drift}px, 0 ${drift}px`,
        }}
      />
      {/* blueprint (payoff) */}
      <AbsoluteFill
        style={{
          opacity: toBlue,
          background: `radial-gradient(100% 70% at 50% 45%, #18306E 0%, ${C.blueprint} 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: toBlue * 0.8,
          backgroundImage: `linear-gradient(rgba(157,184,255,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(157,184,255,0.16) 1px, transparent 1px),
            linear-gradient(rgba(157,184,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(157,184,255,0.07) 1px, transparent 1px)`,
          backgroundSize: '120px 120px, 120px 120px, 24px 24px, 24px 24px',
        }}
      />
    </AbsoluteFill>
  );
};

const Grain: React.FC<{frame: number}> = ({frame}) => (
  <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'overlay', opacity: 0.22}}>
    <svg width="100%" height="100%">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 12} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  </AbsoluteFill>
);

const Vignette: React.FC<{t: number}> = ({t}) => {
  const {toPaper, toBlue} = themeAt(t);
  const strength = 0.75 - toPaper * 0.55 + toBlue * 0.35;
  return (
    <AbsoluteFill
      style={{pointerEvents: 'none', background: `radial-gradient(120% 85% at 50% 45%, rgba(0,0,0,0) 55%, rgba(5,5,15,${strength}) 100%)`}}
    />
  );
};

const Captions: React.FC<{t: number}> = ({t}) => {
  // the CTA scene already shows its line as on-screen type, so the burned-in caption steps aside there
  const caps = TL.captions as [number, number, string][];
  const cap = t > 74.9 ? undefined : caps.find(([a, b]) => t >= a - 0.08 && t <= b);
  if (!cap) return null;
  const [a, b, text] = cap;
  const k = Math.min(clamp((t - (a - 0.08)) / 0.14), clamp((b - t) / 0.14));
  const {toPaper, toBlue} = themeAt(t);
  const light = toPaper > 0.5 && toBlue < 0.5;
  return (
    <div
      style={{
        position: 'absolute', left: 0, right: 0, top: 1528, display: 'flex', justifyContent: 'center',
        opacity: k, transform: `translateY(${(1 - k) * 10}px)`,
      }}
    >
      <div
        style={{
          maxWidth: 900, padding: '16px 30px 18px', borderRadius: 22, textAlign: 'center',
          fontFamily: FONT, fontWeight: 600, fontSize: 46, lineHeight: 1.32, letterSpacing: -0.3,
          color: light ? C.ink : '#FFFFFF',
          background: light ? 'rgba(255,255,255,0.78)' : 'rgba(8,8,20,0.62)',
          boxShadow: light ? '0 10px 40px rgba(60,40,140,0.12)' : '0 10px 40px rgba(0,0,0,0.35)',
          border: light ? '1px solid rgba(110,86,207,0.15)' : '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const Film: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const vis = (k: keyof typeof TL.scenes, pad = 0.6) => {
    const [a, b] = scene(k);
    return t >= a - pad && t <= b + pad;
  };
  const endFade = 1 - eio(t, TL.duration - 0.7, 0.7);
  return (
    <AbsoluteFill style={{backgroundColor: C.night, fontFamily: FONT}}>
      <AbsoluteFill style={{opacity: endFade}}>
        <Background t={t} />
        {vis('hook') && <Hook t={t} />}
        {vis('collapse') && <Collapse t={t} />}
        {vis('reveal') && <Reveal t={t} />}
        {vis('idea') && <Idea t={t} />}
        {vis('steps') && <Steps t={t} />}
        {vis('commands') && <Commands t={t} />}
        {vis('results') && <Results t={t} />}
        {vis('agents') && <Agents t={t} />}
        {vis('stats') && <Stats t={t} />}
        {(vis('insight') || vis('cta')) && <Insight t={t} />}
        {vis('cta') && <Cta t={t} />}
        <Vignette t={t} />
        <Grain frame={frame} />
        <Captions t={t} />
      </AbsoluteFill>
      <Audio src={staticFile('audio/master.wav')} />
    </AbsoluteFill>
  );
};
