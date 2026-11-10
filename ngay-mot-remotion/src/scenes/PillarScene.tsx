import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Block, Caption, Horizon, SharedDefs, Trophy} from '../components/common';
import {Figure, FigureDefs, mix, P, Pose, POSES, walk, walkBob} from '../components/Figure';
import {WordSwap} from '../components/WordSwap';
import {clamp, drift, EASE, keys, lerp, prog, rand, shake, spr} from '../lib/anim';

/**
 * Scene 1+2 (one continuous shot, 0–330):
 * A gigantic pillar crowned by a trophy erupts next to a tiny figure ("MỘT NGÀY").
 * The impossible leap shatters into a staircase; the words flip to "NGÀY MỘT"
 * and the figure takes the first steps.
 */
const G = 1480; // ground
const N = 16;
const X0 = 200;
const X1 = 920;
const W = (X1 - X0) / N;
const H = 1100;
const RISE = H / N;

const ERUPT = 6;
const STEPS_AT = 158;
const stepStart = (i: number) => STEPS_AT + (N - 2 - i) * 4.2;

export const stepHeight = (f: number, i: number) => {
  if (i === N - 1) {
    const s = spr(f, ERUPT, {damping: 30, stiffness: 170, mass: 1.2});
    return H * s;
  }
  const s = spr(f, stepStart(i), {damping: 22, stiffness: 190, mass: 0.9});
  return (i + 1) * RISE * s;
};

const figureState = (f: number): {x: number; y: number; pose: Pose; bob: number; air: number} => {
  // 0–150: standing near the pillar, startled, looks up, hops for the trophy, gives a small shrug
  let x = 560;
  let y = G;
  let pose: Pose = POSES.stand;
  let bob = 0;
  let air = 0;
  if (f < 150) {
    const startle = spr(f, ERUPT + 2, {damping: 9, stiffness: 220});
    const lookUp = prog(f, 14, 34, EASE.out);
    pose = mix(POSES.stand, POSES.lookUp, lookUp);
    pose = {...pose, lean: pose.lean - 10 * Math.sin(startle * Math.PI) };
    x = 560 - 14 * prog(f, ERUPT + 2, ERUPT + 14, EASE.out);
    // the futile hop for the trophy
    const hop = prog(f, 112, 132, EASE.linear);
    if (hop > 0 && hop < 1) {
      air = Math.sin(hop * Math.PI) * 46;
      pose = mix(pose, POSES.reach, Math.sin(hop * Math.PI) * 1.1 > 1 ? 1 : Math.sin(hop * Math.PI) * 1.1);
    }
    const crouch = prog(f, 104, 112) * (1 - prog(f, 112, 116));
    bob += crouch * 12;
    const land = prog(f, 132, 136) * (1 - prog(f, 136, 146));
    bob += land * 10;
    const deflate = prog(f, 136, 150, EASE.out);
    pose = mix(pose, P({head: 18, lean: 6, aF: 2, aB: -2}), deflate);
  } else if (f < 236) {
    // stairs come rushing toward him — he backs away, then looks at the first step
    const back = prog(f, 166, 204, EASE.inOut);
    x = lerp(546, 150, back);
    const moving = back > 0 && back < 1;
    const ph = -(f - 166) / 14;
    pose = moving ? walk(ph, 1, P({head: -6, lean: -4})) : back >= 1 ? P({head: lerp(-6, 6, prog(f, 204, 228))}) : P({head: lerp(18, -10, prog(f, 150, 170))});
    bob = moving ? walkBob(ph) : 0;
  } else {
    // walk to the first step and climb
    const walkIn = prog(f, 236, 250, EASE.inOut);
    x = lerp(150, X0 - 22, walkIn);
    pose = walkIn < 1 ? walk((f - 236) / 15, 1) : POSES.stand;
    bob = walkIn < 1 ? walkBob((f - 236) / 15) : 0;
    const climbT = (f - 250) / 13; // 13 frames per step
    if (climbT > 0) {
      const k = Math.floor(climbT);
      const t = climbT - k;
      const e = EASE.inOut(t);
      const fromX = k === 0 ? X0 - 22 : X0 + (k - 1) * W + W * 0.5;
      const toX = X0 + k * W + W * 0.5;
      x = lerp(fromX, toX, e);
      const fromY = k === 0 ? G : G - k * RISE;
      y = lerp(fromY, G - (k + 1) * RISE, EASE.out(clamp(t * 1.4)));
      const lift = Math.sin(t * Math.PI);
      const odd = k % 2 === 0;
      const step: Pose = P({
        lean: 10,
        head: -14,
        hF: odd ? 60 * lift : -10 * lift,
        kF: odd ? 70 * lift : 20 * lift,
        hB: odd ? -10 * lift : 60 * lift,
        kB: odd ? 20 * lift : 70 * lift,
        aF: odd ? -25 * lift : 30 * lift,
        aB: odd ? 30 * lift : -25 * lift,
        eF: 30,
        eB: 30,
      });
      pose = step;
      bob = -lift * 6;
    }
  }
  return {x, y, pose, bob, air};
};

const Dust: React.FC<{f: number; at: number; x: number; y: number; n?: number; spread?: number; color?: string}> = ({
  f,
  at,
  x,
  y,
  n = 26,
  spread = 1,
  color = '#cfe0ff',
}) => {
  const t = (f - at) / 30;
  if (t < 0 || t > 1.4) return null;
  return (
    <g>
      {new Array(n).fill(0).map((_, i) => {
        const a = Math.PI + rand(i + at) * Math.PI; // upward hemisphere
        const v = (180 + rand(i * 3 + at) * 420) * spread;
        const px = x + Math.cos(a) * v * t * (rand(i) > 0.5 ? 1 : 1) + (rand(i * 7) - 0.5) * 30;
        const py = y + Math.sin(a) * v * t * 0.55 + 260 * t * t;
        const r = 1.5 + rand(i * 11) * 4;
        return <circle key={i} cx={px} cy={Math.min(py, y)} r={r} fill={color} opacity={(1 - t / 1.4) * 0.8} />;
      })}
    </g>
  );
};

export const PillarScene: React.FC = () => {
  const f = useCurrentFrame();

  // ---------------- camera ----------------
  const s = keys(f, [
    [0, 1.85],
    [24, 1.85],
    [66, 1.5],
    [84, 1.5],
    [124, 1.0],
    [236, 1.0],
    [330, 1.32],
  ], EASE.cam);
  const cx = keys(f, [
    [0, 700],
    [24, 720],
    [66, 820],
    [84, 820],
    [124, 560],
    [236, 560],
    [330, 470],
  ], EASE.cam);
  const cy = keys(f, [
    [0, 1330],
    [24, 1300],
    [66, 470],
    [84, 470],
    [124, 960],
    [236, 960],
    [330, 900],
  ], EASE.cam);
  const sh1 = shake(f, ERUPT + 9, 22, 22);
  const sh2 = shake(f, STEPS_AT + 40, 6, 40);
  const d = drift(f, 2.5);
  const camT = `translate(${540 + sh1.x + sh2.x + d.x}, ${960 + sh1.y + sh2.y + d.y}) scale(${s}) translate(${-cx}, ${-cy}) rotate(${sh1.r})`;

  const fig = figureState(f);
  const shine = Math.max(0, 1 - Math.abs(f - 70) / 8) + Math.max(0, 1 - Math.abs(f - 300) / 10) * 0.8;
  const pillarTop = G - stepHeight(f, N - 1);
  const goldWarm = prog(f, 190, 260);

  const world = (refl: boolean) => (
    <g>
      {/* steps (left to right so the 2.5D side faces overlap correctly) */}
      {new Array(N).fill(0).map((_, i) => {
        const h = stepHeight(f, i);
        return (
          <Block
            key={i}
            x={X0 + i * W}
            y={G - h}
            w={W + 0.6}
            h={h}
            d={14}
            front="url(#stepFront)"
            side="url(#stepSide)"
            top="#d6e4ff"
          />
        );
      })}
      {/* trophy riding the pillar */}
      <Trophy x={X0 + (N - 0.5) * W + 4} y={pillarTop - 12} s={1.05} shine={refl ? 0 : shine} glow={0.7 + goldWarm * 0.6} />
      <Figure x={fig.x} y={fig.y} pose={fig.pose} bob={fig.bob} airborne={fig.air} scale={0.92} glow={0.4} />
    </g>
  );

  return (
    <AbsoluteFill style={{background: '#000'}}>
      {/* ambient key light pools */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 60% 40% at 55% ${70 - goldWarm * 5}%, rgba(70,110,220,${0.22 * clamp(f / 20)}), rgba(0,0,0,0) 70%)`,
        }}
      />
      <AbsoluteFill>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920">
          <defs>
            <FigureDefs />
            <SharedDefs />
            <linearGradient id="stepFront" gradientUnits="userSpaceOnUse" x1="0" y1={G - H} x2="0" y2={G}>
              <stop offset="0" stopColor="#b5ceff" />
              <stop offset="0.45" stopColor="#6d93e6" />
              <stop offset="1" stopColor="#1b2f5c" />
            </linearGradient>
            <linearGradient id="stepSide" gradientUnits="userSpaceOnUse" x1="0" y1={G - H} x2="0" y2={G}>
              <stop offset="0" stopColor="#5a7ccc" />
              <stop offset="1" stopColor="#0c1730" />
            </linearGradient>
            <linearGradient id="reflOverlay" gradientUnits="userSpaceOnUse" x1="0" y1={G} x2="0" y2={G + 520}>
              <stop offset="0" stopColor="#000" stopOpacity="0.62" />
              <stop offset="1" stopColor="#000" stopOpacity="1" />
            </linearGradient>
          </defs>
          <g transform={camT}>
          {/* glossy floor reflection */}
          <g transform={`translate(0,${2 * G}) scale(1,-1)`} opacity={0.5}>
            {world(true)}
          </g>
          <rect x={-2000} y={G} width={5000} height={1600} fill="url(#reflOverlay)" />
          <Horizon y={G} width={1700} o={clamp(f / 6)} />
          {world(false)}
          <Dust f={f} at={ERUPT + 1} x={X0 + (N - 0.5) * W} y={G} n={34} />
          <Dust f={f} at={STEPS_AT + 30} x={X0 + 6 * W} y={G} n={22} spread={1.3} />
          </g>
        </svg>
      </AbsoluteFill>

      {/* typography (screen space) */}
      <WordSwap a="MỘT" b="NGÀY" at={92} swapAt={186} out={316} y={560} size={96} cx={430} />
      <Caption words={[{t: 'một', w: 400}, {t: 'ngày', w: 400}, {t: 'nào', w: 400}, {t: 'đó…', w: 400}]} at={102} out={176} y={622} size={40} stagger={3} />
      <Caption
        words={[{t: 'không', w: 400}, {t: 'phải', w: 400}, {t: 'một', w: 400}, {t: 'cú', w: 400}, {t: 'nhảy.', w: 400}, {t: 'Là', w: 400, br: true}, {t: 'từng', w: 700, c: '#ffd76a'}, {t: 'bậc', w: 700, c: '#ffd76a'}, {t: 'thang.', w: 400}]}
        at={224}
        out={312}
        y={622}
        size={42}
        stagger={3}
      />
    </AbsoluteFill>
  );
};
