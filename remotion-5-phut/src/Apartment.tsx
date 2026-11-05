import React from 'react';
import {Cam, CEIL, FLOOR, PH, PW, VY, clamp, mix, proj, pts, rnd, shade} from './engine';

export type Theme = 'day' | 'night';

export const PALETTE = {
  day: {back: '#8f8a84', side: '#77716b', floor: '#4f4842', ceil: '#a29d97', trim: '#3c3732', wood: '#6b4a32', sheet: '#d9d6d0', blanket: '#cfcac2', metal: '#b9bcc0', tile: '#a7b0b3'},
  night: {back: '#1e2944', side: '#18213a', floor: '#121a2e', ceil: '#18213a', trim: '#0e1424', wood: '#2a2a3c', sheet: '#2b3a66', blanket: '#24366d', metal: '#3a4566', tile: '#2a3656'},
};

type BoxSpec = {x0: number; x1: number; z0: number; z1: number; y0: number; y1: number; c: string; k?: number};

/** Perspective cuboid with correct face visibility (2.5D) */
export const Box: React.FC<{cam: Cam; b: BoxSpec; stroke?: string}> = ({cam, b, stroke}) => {
  const P = (x: number, y: number, z: number) => proj(cam, x, y, z);
  const faces: React.ReactNode[] = [];
  const k = b.k ?? 1;
  // side faces
  if (b.x0 > cam.x) faces.push(<polygon key="l" points={pts([P(b.x0, b.y0, b.z0), P(b.x0, b.y0, b.z1), P(b.x0, b.y1, b.z1), P(b.x0, b.y1, b.z0)])} fill={shade(b.c, 0.72 * k)} />);
  if (b.x1 < cam.x) faces.push(<polygon key="r" points={pts([P(b.x1, b.y0, b.z0), P(b.x1, b.y0, b.z1), P(b.x1, b.y1, b.z1), P(b.x1, b.y1, b.z0)])} fill={shade(b.c, 0.62 * k)} />);
  // top or bottom
  if (b.y0 > VY) faces.push(<polygon key="t" points={pts([P(b.x0, b.y0, b.z0), P(b.x1, b.y0, b.z0), P(b.x1, b.y0, b.z1), P(b.x0, b.y0, b.z1)])} fill={shade(b.c, 1.12 * k)} />);
  if (b.y1 < VY) faces.push(<polygon key="b" points={pts([P(b.x0, b.y1, b.z0), P(b.x1, b.y1, b.z0), P(b.x1, b.y1, b.z1), P(b.x0, b.y1, b.z1)])} fill={shade(b.c, 0.55 * k)} />);
  // front
  faces.push(<polygon key="f" points={pts([P(b.x0, b.y0, b.z1), P(b.x1, b.y0, b.z1), P(b.x1, b.y1, b.z1), P(b.x0, b.y1, b.z1)])} fill={shade(b.c, 0.92 * k)} stroke={stroke} strokeWidth={stroke ? 1 : 0} />);
  return <g>{faces}</g>;
};

/** Soft contact shadow on the floor */
export const FloorShadow: React.FC<{cam: Cam; x: number; z: number; w: number; o?: number; y?: number}> = ({cam, x, z, w, o = 0.45, y = FLOOR}) => {
  const [sx, sy] = proj(cam, x, y, z);
  const s = (1 + 0.95 * z) * cam.zoom;
  return <ellipse cx={sx} cy={sy} rx={w * s} ry={w * s * 0.16} fill="#000" opacity={o} filter="url(#soft8)" />;
};

export type AptState = {
  theme: Theme;
  frame: number;
  alarmRing: number; // 0..1 intensity of ringing glow
  alarmDigits: string;
  doorOpen: number; // 0..1
  doorLight: number; // brightness of the world outside
  showerOn: number; // 0..1
  steam: number; // 0..1
  lampsOn: number; // 0..1
  stoveOn: number; // 0..1
  windowGlow: number;
};

export const Apartment: React.FC<{cam: Cam; st: AptState; mid: React.ReactNode; over?: React.ReactNode; id: string}> = ({cam, st, mid, over, id}) => {
  const C = PALETTE[st.theme];
  const P = (x: number, y: number, z: number) => proj(cam, x, y, z);
  const XA = -400;
  const XB = 4400;
  const f = st.frame;
  const day = st.theme === 'day';

  // ---- back wall + floor + ceiling ----
  const floorPoly = pts([P(XA, FLOOR, 0), P(XB, FLOOR, 0), P(XB, FLOOR, 1.4), P(XA, FLOOR, 1.4)]);
  const ceilPoly = pts([P(XA, CEIL, 0), P(XB, CEIL, 0), P(XB, CEIL, 1.4), P(XA, CEIL, 1.4)]);
  const [bx0, by0] = P(XA, CEIL, 0);
  const [bx1, by1] = P(XB, FLOOR, 0);

  const planks: React.ReactNode[] = [];
  for (let x = -400; x <= 4400; x += 70) {
    const a = P(x, FLOOR, 0);
    const b = P(x, FLOOR, 1.4);
    if (b[0] < -400 || a[0] > PW + 400) continue;
    planks.push(<line key={x} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#000" strokeOpacity={0.13} strokeWidth={1.2} />);
  }

  // partitions between rooms
  const partitions = [1000, 2000, 3000].map((x) => {
    const zEnd = 0.2;
    const face = x > cam.x
      ? pts([P(x - 14, CEIL, 0), P(x - 14, CEIL, zEnd), P(x - 14, FLOOR, zEnd), P(x - 14, FLOOR, 0)])
      : pts([P(x + 14, CEIL, 0), P(x + 14, CEIL, zEnd), P(x + 14, FLOOR, zEnd), P(x + 14, FLOOR, 0)]);
    const front = pts([P(x - 14, CEIL, zEnd), P(x + 14, CEIL, zEnd), P(x + 14, FLOOR, zEnd), P(x - 14, FLOOR, zEnd)]);
    return (
      <g key={x}>
        <polygon points={face} fill={C.side} />
        <polygon points={front} fill={shade(C.back, 1.05)} />
        <polygon points={pts([P(x - 14, FLOOR - 14, zEnd), P(x + 14, FLOOR - 14, zEnd), P(x + 14, FLOOR, zEnd), P(x - 14, FLOOR, zEnd)])} fill={C.trim} />
      </g>
    );
  });

  // skirting
  const sk = pts([P(XA, FLOOR - 12, 0), P(XB, FLOOR - 12, 0), P(XB, FLOOR, 0), P(XA, FLOOR, 0)]);

  // ---- bedroom ----
  const win = {x0: 390, x1: 630, y0: 140, y1: 300};
  const [wx0, wy0] = P(win.x0, win.y0, 0);
  const [wx1, wy1] = P(win.x1, win.y1, 0);
  const [cx, cy] = P(230, 386, 0.25); // alarm display
  const s25 = (1 + 0.95 * 0.25) * cam.zoom;

  // ---- door ----
  const hinge = 3480;
  const dw = 180;
  const th = (st.doorOpen * 100 * Math.PI) / 180;
  const fx = hinge + dw * Math.cos(th);
  const fz = (dw * Math.sin(th)) / 420;
  const dl = st.doorLight;

  // lamp light pools
  const lamps = [500, 1500, 2500, 3500];

  // shower water streaks
  const water: React.ReactNode[] = [];
  if (st.showerOn > 0) {
    for (let i = 0; i < 26; i++) {
      const xx = 2470 + rnd(i) * 110;
      const zz = 0.12 + rnd(i + 50) * 0.2;
      const sp = 26 + rnd(i + 9) * 14;
      const yy = 175 + ((f * sp + rnd(i + 3) * 300) % 300);
      const a = P(xx, yy, zz);
      const b = P(xx, yy + 26, zz);
      water.push(<line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#e8f4ff" strokeWidth={1.6} strokeOpacity={0.55 * st.showerOn} strokeLinecap="round" />);
    }
  }

  return (
    <g>
      <defs>
        <linearGradient id={`${id}-dawn`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a3a78" />
          <stop offset="0.55" stopColor="#b56a8c" />
          <stop offset="0.85" stopColor="#f09a6a" />
          <stop offset="1" stopColor="#ffc98a" />
        </linearGradient>
        <radialGradient id={`${id}-lamp`} cx="0.5" cy="0" r="0.75">
          <stop offset="0" stopColor="#fff1d6" stopOpacity={0.55} />
          <stop offset="1" stopColor="#fff1d6" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}-red`}>
          <stop offset="0" stopColor="#ff2a3a" stopOpacity={0.9} />
          <stop offset="1" stopColor="#ff2a3a" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}-door`}>
          <stop offset="0" stopColor="#fff6e2" stopOpacity={1} />
          <stop offset="0.4" stopColor="#ffd9a0" stopOpacity={0.6} />
          <stop offset="1" stopColor="#ffb870" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${id}-floorfade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity={0.35} />
          <stop offset="1" stopColor="#000" stopOpacity={0} />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.22} />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity={0.05} />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity={0.18} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0.04} />
        </linearGradient>
      </defs>

      {/* back wall */}
      <rect x={bx0} y={by0} width={bx1 - bx0} height={by1 - by0} fill={C.back} />
      <polygon points={ceilPoly} fill={C.ceil} />
      <polygon points={floorPoly} fill={C.floor} />
      {planks}
      <polygon points={pts([P(XA, FLOOR, 0), P(XB, FLOOR, 0), P(XB, FLOOR, 0.35), P(XA, FLOOR, 0.35)])} fill={`url(#${id}-floorfade)`} />
      <polygon points={sk} fill={C.trim} />

      {/* ---------- BEDROOM ---------- */}
      <rect x={wx0 - 8} y={wy0 - 8} width={wx1 - wx0 + 16} height={wy1 - wy0 + 16} fill={C.trim} />
      <rect x={wx0} y={wy0} width={wx1 - wx0} height={wy1 - wy0} fill={`url(#${id}-dawn)`} opacity={0.75 + 0.25 * st.windowGlow} />
      <circle cx={(wx0 + wx1) / 2 + 30} cy={wy1 + 6} r={22 * cam.zoom} fill="#ffe2b0" opacity={0.85 * st.windowGlow} filter="url(#soft8)" />
      <line x1={(wx0 + wx1) / 2} y1={wy0} x2={(wx0 + wx1) / 2} y2={wy1} stroke={C.trim} strokeWidth={6 * cam.zoom} />
      <line x1={wx0} y1={(wy0 + wy1) / 2} x2={wx1} y2={(wy0 + wy1) / 2} stroke={C.trim} strokeWidth={5 * cam.zoom} />
      {/* window light patch on floor */}
      <polygon
        points={pts([P(win.x0 + 40, FLOOR, 0.05), P(win.x1 + 40, FLOOR, 0.05), P(win.x1 + 160, FLOOR, 0.9), P(win.x0 + 160, FLOOR, 0.9)])}
        fill="#ffb98a" opacity={day ? 0.08 : 0.07} filter="url(#soft8)"
      />

      {/* nightstand + alarm */}
      <Box cam={cam} b={{x0: 180, x1: 285, z0: 0.06, z1: 0.42, y0: 400, y1: FLOOR, c: C.wood}} />
      <Box cam={cam} b={{x0: 205, x1: 258, z0: 0.18, z1: 0.3, y0: 372, y1: 400, c: '#1a1a1e'}} />
      <text x={cx} y={cy} fontFamily="Montserrat" fontWeight={800} fontSize={13 * s25} fill="#ff3344" textAnchor="middle"
        opacity={0.55 + 0.45 * st.alarmRing}>{st.alarmDigits}</text>
      {st.alarmRing > 0 && (
        <circle cx={cx} cy={cy - 5} r={(70 + 40 * st.alarmRing) * s25} fill={`url(#${id}-red)`} opacity={0.75 * st.alarmRing} />
      )}
      {/* bed */}
      <Box cam={cam} b={{x0: 300, x1: 322, z0: 0.05, z1: 0.62, y0: 320, y1: FLOOR, c: C.wood}} />
      <Box cam={cam} b={{x0: 322, x1: 740, z0: 0.05, z1: 0.62, y0: 418, y1: 452, c: C.wood}} />
      <Box cam={cam} b={{x0: 726, x1: 742, z0: 0.05, z1: 0.62, y0: 380, y1: FLOOR, c: C.wood}} />
      <Box cam={cam} b={{x0: 324, x1: 726, z0: 0.07, z1: 0.6, y0: 396, y1: 420, c: C.sheet}} />
      <Box cam={cam} b={{x0: 330, x1: 410, z0: 0.12, z1: 0.52, y0: 380, y1: 397, c: '#e9e6e0', k: day ? 1 : 0.45}} />

      {/* ---------- KITCHEN ---------- */}
      <Box cam={cam} b={{x0: 1120, x1: 1720, z0: 0, z1: 0.07, y0: 150, y1: 245, c: C.wood}} />
      <Box cam={cam} b={{x0: 1100, x1: 1740, z0: 0, z1: 0.22, y0: 372, y1: FLOOR, c: C.wood}} />
      <Box cam={cam} b={{x0: 1100, x1: 1740, z0: 0, z1: 0.23, y0: 366, y1: 374, c: day ? '#d8d3cb' : '#3a4566'}} />
      <Box cam={cam} b={{x0: 1780, x1: 1940, z0: 0, z1: 0.3, y0: 150, y1: FLOOR, c: day ? '#cfd2d4' : '#2c3656'}} />
      {/* hood */}
      <Box cam={cam} b={{x0: 1440, x1: 1600, z0: 0, z1: 0.16, y0: 245, y1: 275, c: C.metal}} />

      {/* ---------- BATHROOM ---------- */}
      {(() => {
        const tiles: React.ReactNode[] = [];
        for (let x = 2380; x < 2690; x += 34) {
          for (let y = 120; y < FLOOR; y += 34) {
            const a = P(x, y, 0);
            const b = P(x + 34, y + 34, 0);
            tiles.push(<rect key={`${x}-${y}`} x={a[0]} y={a[1]} width={b[0] - a[0] - 1.5} height={b[1] - a[1] - 1.5} fill={shade(C.tile, 0.95 + rnd(x * 3 + y) * 0.1)} />);
          }
        }
        return <g>{tiles}</g>;
      })()}
      <Box cam={cam} b={{x0: 2380, x1: 2690, z0: 0, z1: 0.42, y0: 458, y1: FLOOR, c: day ? '#e4e6e8' : '#2c3656'}} />
      {/* shower head */}
      <Box cam={cam} b={{x0: 2512, x1: 2540, z0: 0, z1: 0.14, y0: 148, y1: 158, c: C.metal}} />
      <Box cam={cam} b={{x0: 2500, x1: 2552, z0: 0.11, z1: 0.17, y0: 158, y1: 166, c: C.metal}} />
      {/* sink + mirror */}
      {(() => {
        const a = P(2110, 170, 0);
        const b = P(2240, 300, 0);
        return (
          <g>
            <rect x={a[0] - 5} y={a[1] - 5} width={b[0] - a[0] + 10} height={b[1] - a[1] + 10} fill={C.trim} />
            <rect x={a[0]} y={a[1]} width={b[0] - a[0]} height={b[1] - a[1]} fill={day ? '#b9c6cc' : '#22305a'} />
            <polygon points={pts([[a[0] + 20, a[1]], [a[0] + 50, a[1]], [a[0] + 10, b[1]], [a[0] - 20 + 20, b[1]]])} fill="#fff" opacity={0.12} />
          </g>
        );
      })()}
      <Box cam={cam} b={{x0: 2160, x1: 2190, z0: 0.05, z1: 0.14, y0: 370, y1: FLOOR, c: day ? '#e4e6e8' : '#2c3656'}} />
      <Box cam={cam} b={{x0: 2100, x1: 2250, z0: 0, z1: 0.24, y0: 342, y1: 372, c: day ? '#eceef0' : '#2f3a5e'}} />

      {/* ---------- HALLWAY / DOOR ---------- */}
      {(() => {
        const a = P(hinge, 160, 0);
        const b = P(hinge + dw, FLOOR, 0);
        const fr = 12 * cam.zoom;
        const out = st.doorOpen > 0.001;
        return (
          <g>
            <rect x={a[0] - fr} y={a[1] - fr} width={b[0] - a[0] + fr * 2} height={b[1] - a[1] + fr} fill={C.trim} />
            <rect x={a[0]} y={a[1]} width={b[0] - a[0]} height={b[1] - a[1]} fill={out ? mix('#1a1a1a', '#fff6e4', dl) : '#111'} />
            {out && <rect x={a[0]} y={a[1]} width={b[0] - a[0]} height={b[1] - a[1]} fill="#ffffff" opacity={dl * 0.7} />}
          </g>
        );
      })()}
      {/* door light spill on floor */}
      {st.doorOpen > 0 && (
        <g style={{mixBlendMode: 'screen'}}>
          <polygon
            points={pts([P(hinge, FLOOR, 0), P(hinge + dw, FLOOR, 0), P(hinge + dw + 260, FLOOR, 1.3), P(hinge - 160, FLOOR, 1.3)])}
            fill="#ffe0b0" opacity={0.45 * dl * clamp(st.doorOpen * 2)} filter="url(#soft8)"
          />
          {(() => {
            const [dx, dy] = P(hinge + dw / 2, 320, 0);
            return <circle cx={dx} cy={dy} r={420 * cam.zoom * (0.6 + dl)} fill={`url(#${id}-door)`} opacity={0.85 * dl} />;
          })()}
        </g>
      )}
      {/* door leaf */}
      <polygon
        points={pts([P(hinge, 160, 0), P(fx, 160, fz), P(fx, FLOOR, fz), P(hinge, FLOOR, 0)])}
        fill={day ? '#7a4a2c' : '#3a2c32'}
      />
      {(() => {
        const k = P(lerp2(hinge, fx, 0.86), 320, fz * 0.86);
        return <circle cx={k[0]} cy={k[1]} r={4 * cam.zoom} fill={day ? '#e3c27a' : '#8a7a5a'} />;
      })()}
      {/* coat hook + coat */}
      <Box cam={cam} b={{x0: 3240, x1: 3330, z0: 0, z1: 0.05, y0: 210, y1: 222, c: C.wood}} />

      {/* ceiling lamps */}
      {lamps.map((lx) => {
        const [x0, y0] = P(lx - 40, CEIL, 0.3);
        const [x1] = P(lx + 40, CEIL, 0.3);
        return (
          <g key={lx}>
            <rect x={x0} y={y0} width={x1 - x0} height={6 * cam.zoom} fill={st.lampsOn > 0.5 ? '#fff6e0' : '#2a2f40'} />
            {st.lampsOn > 0 && (
              <polygon
                points={pts([P(lx - 40, CEIL + 6, 0.3), P(lx + 40, CEIL + 6, 0.3), P(lx + 300, FLOOR, 0.45), P(lx - 300, FLOOR, 0.45)])}
                fill={`url(#${id}-lamp)`} opacity={st.lampsOn * 0.55} style={{mixBlendMode: 'screen'}}
              />
            )}
          </g>
        );
      })}

      {partitions}

      {/* ---------- MID LAYER (characters) ---------- */}
      {mid}

      {/* ---------- FRONT LAYER ---------- */}
      {/* kitchen island in front of the cook */}
      <Box cam={cam} b={{x0: 1330, x1: 1700, z0: 0.6, z1: 0.86, y0: 392, y1: FLOOR, c: day ? '#5c4130' : '#22283e'}} />
      <Box cam={cam} b={{x0: 1320, x1: 1710, z0: 0.58, z1: 0.88, y0: 384, y1: 393, c: day ? '#e2ddd5' : '#36415f'}} />
      {/* stove glow */}
      {st.stoveOn > 0 && (() => {
        const [sx, sy] = P(1500, 384, 0.73);
        return <ellipse cx={sx} cy={sy} rx={60 * cam.zoom} ry={12 * cam.zoom} fill="#ff6a2a" opacity={0.35 * st.stoveOn} filter="url(#soft8)" />;
      })()}

      {/* shower water + glass */}
      {water}
      <polygon points={pts([P(2380, 120, 0.45), P(2690, 120, 0.45), P(2690, FLOOR - 10, 0.45), P(2380, FLOOR - 10, 0.45)])} fill={`url(#${id}-glass)`} />
      <polyline points={pts([P(2380, 120, 0.45), P(2690, 120, 0.45), P(2690, FLOOR - 10, 0.45)])} fill="none" stroke={C.metal} strokeWidth={3 * cam.zoom} opacity={0.8} />
      {st.steam > 0 && (() => {
        const [sx, sy] = P(2535, 260, 0.3);
        return (
          <g opacity={st.steam} style={{mixBlendMode: 'screen'}}>
            {[0, 1, 2, 3, 4].map((i) => (
              <circle key={i} cx={sx + Math.sin(f / 20 + i * 2) * 60 + (i - 2) * 50} cy={sy - ((f * 0.8 + i * 40) % 160)}
                r={(60 + i * 10) * cam.zoom} fill="#ffffff" opacity={0.12} filter="url(#soft20)" />
            ))}
          </g>
        );
      })()}

      {over}

      {/* foreground pillars (deep parallax, defocused) */}
      {[1000, 2000, 3000, 4000].map((x) => {
        const a = P(x - 34, CEIL - 200, 1.45);
        const b = P(x + 34, FLOOR + 200, 1.45);
        if (b[0] < -50 || a[0] > PW + 50) return null;
        return <rect key={x} x={a[0]} y={-20} width={b[0] - a[0]} height={PH + 40} fill="#060709" opacity={0.92} filter="url(#soft6)" />;
      })}
    </g>
  );
};

const lerp2 = (a: number, b: number, t: number) => a + (b - a) * t;
