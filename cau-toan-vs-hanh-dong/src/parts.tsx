import React from 'react';
import {FLOOR, FX, Pose, R, RIM, V, clamp, lerp, v} from './timeline';

// ------------------------------------------------------------ màu
export const RED = '#ff2e2a';
export const RED_DEEP = '#8f0b08';
const hex = (h: string): number[] =>
  h.startsWith('rgb') ? (h.match(/[\d.]+/g) as string[]).slice(0, 3).map(Number) : [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const mixColor = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${A.map((x, i) => Math.round(lerp(x, B[i], clamp(t)))).join(',')})`;
};

// ------------------------------------------------------------ IK 2 khớp
const ik = (a: V, target: V, l1: number, l2: number, bend: number): V => {
  const dx = target.x - a.x;
  const dy = target.y - a.y;
  const d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.01);
  const ang = Math.atan2(dy, dx);
  const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const al = Math.acos(cosA);
  return v(a.x + l1 * Math.cos(ang + bend * al), a.y + l1 * Math.sin(ang + bend * al));
};
const reach = (a: V, t: V, max: number): V => {
  const d = Math.hypot(t.x - a.x, t.y - a.y);
  if (d <= max) return t;
  return v(a.x + ((t.x - a.x) / d) * max, a.y + ((t.y - a.y) / d) * max);
};

export const LEN = {torso: 62, neck: 23, upper: 37, fore: 35, thigh: 49, shin: 49, head: 15.5};

export const solve = (p: Pose) => {
  const sh = v(p.hip.x + LEN.torso * Math.sin(p.lean), p.hip.y - LEN.torso * Math.cos(p.lean));
  const ha = p.lean + p.head;
  const head = v(sh.x + LEN.neck * Math.sin(ha), sh.y - LEN.neck * Math.cos(ha));
  const armMax = LEN.upper + LEN.fore - 0.5;
  const hL = reach(sh, p.hL, armMax);
  const hR = reach(sh, p.hR, armMax);
  const legMax = LEN.thigh + LEN.shin - 0.5;
  const fL = reach(p.hip, p.fL, legMax);
  const fR = reach(p.hip, p.fR, legMax);
  return {
    sh,
    head,
    hL,
    hR,
    fL,
    fR,
    eL: ik(sh, hL, LEN.upper, LEN.fore, 1),
    eR: ik(sh, hR, LEN.upper, LEN.fore, 1),
    kL: ik(p.hip, fL, LEN.thigh, LEN.shin, -1),
    kR: ik(p.hip, fR, LEN.thigh, LEN.shin, -1),
    hip: p.hip,
  };
};

// ------------------------------------------------------------ ống 3D (capsule) có highlight
const Tube: React.FC<{pts: V[]; w: number; grad: string; shade?: number; hi?: number}> = ({pts, w, grad, shade = 1, hi = 0.6}) => {
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  return (
    <g>
      <path d={d} stroke="#050505" strokeWidth={w + 2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
      <path d={d} stroke={grad} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {shade < 1 && <path d={d} stroke="#000" strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={1 - shade} />}
      <path
        d={d}
        transform={`translate(${-w * 0.2} ${-w * 0.22})`}
        stroke="#fff"
        strokeWidth={w * 0.28}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={hi * shade}
      />
    </g>
  );
};

export const Figure: React.FC<{pose: Pose; id: string; heat: number; dim: number; bloom?: boolean}> = ({pose, id, heat, dim, bloom}) => {
  const j = solve(pose);
  const light = mixColor(mixColor('#ffffff', '#ff6a5c', heat), '#7a7a7a', dim);
  const mid = mixColor(mixColor('#d9d9d9', RED, heat), '#4a4a4a', dim);
  const dark = mixColor(mixColor('#7d7d7d', RED_DEEP, heat), '#222222', dim);
  const g = `url(#fg-${id})`;
  const hi = lerp(0.65, 0.25, dim);
  const body = (
    <g>
      <Tube pts={[j.hip, j.kL, j.fL]} w={14} grad={g} shade={0.62} hi={hi} />
      <Tube pts={[j.sh, j.eL, j.hL]} w={11} grad={g} shade={0.62} hi={hi} />
      <Tube pts={[j.hip, j.sh]} w={25} grad={g} hi={hi} />
      <circle cx={j.head.x} cy={j.head.y} r={LEN.head + 1.2} fill="#050505" opacity={0.6} />
      <circle cx={j.head.x} cy={j.head.y} r={LEN.head} fill={`url(#fh-${id})`} />
      <ellipse cx={j.head.x - 5} cy={j.head.y - 6} rx={5} ry={3.4} fill="#fff" opacity={hi * 0.9} transform={`rotate(-30 ${j.head.x - 5} ${j.head.y - 6})`} />
      <Tube pts={[j.hip, j.kR, j.fR]} w={15} grad={g} hi={hi} />
      <Tube pts={[j.sh, j.eR, j.hR]} w={11.5} grad={g} hi={hi} />
    </g>
  );
  return (
    <g>
      <defs>
        <linearGradient id={`fg-${id}`} gradientUnits="userSpaceOnUse" x1={FX - 70} y1={FLOOR - 280} x2={FX + 90} y2={FLOOR + 10}>
          <stop offset="0" stopColor={light} />
          <stop offset="0.55" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <radialGradient id={`fh-${id}`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor={light} />
          <stop offset="0.6" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <filter id={`bloom-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={10} />
        </filter>
      </defs>
      {bloom && heat > 0.02 && (
        <g filter={`url(#bloom-${id})`} opacity={heat * 0.85}>
          {body}
        </g>
      )}
      {body}
    </g>
  );
};

// ------------------------------------------------------------ bóng
export const Ball: React.FC<{p: V; rot: number; squash?: number; id: string; opacity?: number; glow?: number}> = ({p, rot, squash = 1, id, opacity = 1, glow = 0.35}) => {
  const sx = 1 + (1 - squash) * 0.8;
  return (
    <g opacity={opacity} transform={`translate(${p.x} ${p.y + (R * (1 - squash))}) scale(${sx} ${squash})`}>
      <defs>
        <radialGradient id={`bg-${id}`} cx="0.36" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#ffb3a8" />
          <stop offset="0.22" stopColor="#ff4b3e" />
          <stop offset="0.7" stopColor="#c8120d" />
          <stop offset="1" stopColor="#3d0201" />
        </radialGradient>
        <clipPath id={`bc-${id}`}>
          <circle r={R} />
        </clipPath>
      </defs>
      {glow > 0 && <circle r={R * 2.2} fill={RED} opacity={glow * 0.3} filter="url(#blur9)" />}
      <circle r={R} fill={`url(#bg-${id})`} />
      <g clipPath={`url(#bc-${id})`} transform={`rotate(${(rot * 180) / Math.PI})`} stroke="#2a0000" strokeWidth={1.4} fill="none" opacity={0.75}>
        <line x1={-R} y1={0} x2={R} y2={0} />
        <line x1={0} y1={-R} x2={0} y2={R} />
        <path d={`M ${-R * 0.55} ${-R} Q ${R * 0.05} 0 ${-R * 0.55} ${R}`} />
        <path d={`M ${R * 0.55} ${-R} Q ${-R * 0.05} 0 ${R * 0.55} ${R}`} />
      </g>
      <ellipse cx={-R * 0.38} cy={-R * 0.42} rx={R * 0.32} ry={R * 0.18} fill="#fff" opacity={0.75} transform={`rotate(-35 ${-R * 0.38} ${-R * 0.42})`} />
    </g>
  );
};

/** bóng đổ mềm trên sàn */
export const BallShadow: React.FC<{p: V; opacity?: number}> = ({p, opacity = 1}) => {
  const h = clamp((FLOOR - R - p.y) / 260);
  return <ellipse cx={p.x + h * 8} cy={FLOOR + 3} rx={R * (1.25 + h * 1.2)} ry={4 + h * 2} fill="#000" opacity={(0.75 - h * 0.6) * opacity} filter="url(#blur3)" />;
};

// ------------------------------------------------------------ rổ
export const HoopBack: React.FC<{glow: number}> = ({glow}) => {
  const c = mixColor('#ffffff', '#ff5a4a', glow);
  return (
    <g>
      <defs>
        <linearGradient id="pole" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9a9a9a" />
          <stop offset="0.3" stopColor="#ffffff" />
          <stop offset="1" stopColor="#6d6d6d" />
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.14} />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity={0.02} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0.07} />
        </linearGradient>
      </defs>
      {/* trụ */}
      <path d="M 938 440 L 938 214 Q 938 170 896 160 L 834 146" stroke="url(#pole)" strokeWidth={22} fill="none" strokeLinejoin="round" />
      <line x1={876} y1={440} x2={1000} y2={440} stroke="#e8e8e8" strokeWidth={9} strokeLinecap="round" />
      {/* bảng */}
      <polygon points="770,64 834,36 834,168 770,190" fill="url(#glass)" stroke={c} strokeWidth={5} strokeLinejoin="round" />
      <polygon points="785,128 812,118 812,150 785,160" fill="none" stroke={c} strokeWidth={3} />
      <line x1={770} y1={180} x2={RIM.x + RIM.rx - 2} y2={RIM.y + 1} stroke={c} strokeWidth={4} />
      {/* nửa sau vành */}
      <path d={`M ${RIM.x - RIM.rx} ${RIM.y} A ${RIM.rx} ${RIM.ry} 0 0 1 ${RIM.x + RIM.rx} ${RIM.y}`} stroke={mixColor('#bdbdbd', '#ff5a4a', glow)} strokeWidth={3.5} fill="none" />
    </g>
  );
};

export const HoopFront: React.FC<{glow: number; net: number}> = ({glow, net}) => {
  const c = mixColor('#ffffff', '#ff5a4a', glow);
  const stretch = net * 14;
  const bottomY = RIM.y + 38 + stretch;
  const bRx = 17 - net * 4;
  const n = 7;
  const lines: React.ReactNode[] = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * (i / n);
    const x0 = RIM.x - Math.cos(a) * RIM.rx;
    const y0 = RIM.y + Math.sin(a) * RIM.ry;
    const x1 = RIM.x - Math.cos(a) * bRx;
    const y1 = bottomY + Math.sin(a) * 3;
    lines.push(<line key={i} x1={x0} y1={y0} x2={x1} y2={y1} />);
    if (i < n) {
      const a2 = Math.PI * ((i + 1) / n);
      const xm = RIM.x - Math.cos(a2) * lerp(RIM.rx, bRx, 0.5);
      const ym = lerp(RIM.y + Math.sin(a2) * RIM.ry, bottomY, 0.5);
      lines.push(<line key={`d${i}`} x1={x0} y1={y0} x2={xm} y2={ym} />);
      lines.push(<line key={`e${i}`} x1={xm} y1={ym} x2={x1} y2={y1} />);
    }
  }
  return (
    <g>
      <g stroke={mixColor('#d6d6d6', '#ff7a6a', glow)} strokeWidth={1.6} opacity={0.9}>
        {lines}
      </g>
      <path d={`M ${RIM.x - RIM.rx} ${RIM.y} A ${RIM.rx} ${RIM.ry} 0 0 0 ${RIM.x + RIM.rx} ${RIM.y}`} stroke={c} strokeWidth={4.5} fill="none" strokeLinecap="round" />
    </g>
  );
};

// ------------------------------------------------------------ sân + gạch phản chiếu
export const Court: React.FC<{draw: number; id: string; light: number}> = ({draw, id, light}) => {
  const dash = (len: number) => ({strokeDasharray: len, strokeDashoffset: len * (1 - draw)});
  // lưới gạch phối cảnh (điểm tụ phía xa)
  const vp = v(560, FLOOR - 340);
  const tiles: React.ReactNode[] = [];
  for (let i = -10; i <= 22; i++) {
    const x = 60 + i * 60;
    const yb = FLOOR + 80;
    const t = (FLOOR - 26 - vp.y) / (yb - vp.y);
    tiles.push(<line key={`v${i}`} x1={lerp(vp.x, x, t)} y1={FLOOR - 26} x2={x} y2={yb} />);
  }
  for (let k = 0; k < 7; k++) {
    const y = FLOOR - 26 + Math.pow(k / 6, 1.6) * 106;
    tiles.push(<line key={`h${k}`} x1={-200} y1={y} x2={1280} y2={y} />);
  }
  return (
    <g>
      <defs>
        <radialGradient id={`tilefade-${id}`} cx="0.42" cy="0.5" r="0.55">
          <stop offset="0" stopColor="#fff" stopOpacity={1} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <mask id={`tilemask-${id}`}>
          <rect x={-200} y={FLOOR - 40} width={1480} height={140} fill={`url(#tilefade-${id})`} />
        </mask>
        <radialGradient id={`pool-${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" stopOpacity={0.16} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={FX + 60} cy={FLOOR + 4} rx={300} ry={46} fill={`url(#pool-${id})`} opacity={light * draw} />
      <g mask={`url(#tilemask-${id})`} stroke="#fff" strokeWidth={1} opacity={0.075 * draw}>
        {tiles}
      </g>
      <g stroke="#f2f2f2" strokeWidth={4.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx={290} cy={FLOOR} rx={150} ry={26} style={dash(960)} />
        <line x1={272} y1={FLOOR + 26} x2={316} y2={FLOOR - 26} style={dash(70)} />
        <line x1={290} y1={FLOOR - 26} x2={760} y2={FLOOR - 26} style={dash(470)} />
        <line x1={290} y1={FLOOR + 26} x2={820} y2={FLOOR + 26} style={dash(530)} />
        <line x1={724} y1={FLOOR - 38} x2={884} y2={FLOOR + 46} style={dash(181)} />
      </g>
    </g>
  );
};
