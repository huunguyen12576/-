/**
 * timeline.ts — "nguồn sự thật" duy nhất cho HÌNH và TIẾNG.
 * Thuần toán học, không React: được dùng bởi các component Remotion VÀ bởi
 * scripts/export-events.ts để sinh danh sách sự kiện âm thanh khớp từng frame.
 */

export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const DURATION = 900; // 30 giây

// ---------------------------------------------------------------- bố cục 3 sân
export const ROW_TOP = [170, 730, 1290];
export const ROW_H = 560;
export const FLOOR = 430; // mặt sàn (toạ độ cục bộ của từng hàng)
export const R = 15; // bán kính bóng
export const FX = 240; // vị trí chân nhân vật
export const RIM = {x: 738, y: 176, rx: 30, ry: 8};
export const P = 15; // chu kỳ dẫn bóng = 1 phách ở 120 BPM

// ---------------------------------------------------------------- các mốc dựng
export const S = {
  hookThud: 14,
  hookOut: 50,
  reveal: [56, 66, 76],
  focus1: 120,
  focus2: 250,
  focus3: 380,
  wide: 694,
  contrast: 716,
  endFade: 762,
  line1: 786,
  line2: 806,
  periodDrop: 838,
  cta: 862,
  end: DURATION,
};

// ---------------------------------------------------------------- tiện ích
export type V = {x: number; y: number};
export const v = (x: number, y: number): V => ({x, y});
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpV = (a: V, b: V, t: number): V => v(lerp(a.x, b.x, t), lerp(a.y, b.y, t));
export const inv = (a: number, b: number, x: number) => clamp((x - a) / (b - a));
export const ease = {
  linear: (t: number) => t,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  outQuint: (t: number) => 1 - Math.pow(1 - t, 5),
  in: (t: number) => t * t * t,
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};
/** nội suy theo khoảng frame có easing */
export const tween = (f: number, f0: number, f1: number, a: number, b: number, e = ease.inOut) =>
  lerp(a, b, e(inv(f0, f1, f)));
const mod = (a: number, n: number) => ((a % n) + n) % n;

// ---------------------------------------------------------------- tư thế (rig 2 khớp + IK)
export type Pose = {
  hip: V;
  lean: number; // rad, + = cúi về phía trước (phải)
  head: number; // rad, + = cúi đầu, - = ngẩng
  hL: V; // tay sau
  hR: V; // tay trước
  fL: V; // chân sau
  fR: V; // chân trước
};

export const lerpPose = (a: Pose, b: Pose, t: number): Pose => ({
  hip: lerpV(a.hip, b.hip, t),
  lean: lerp(a.lean, b.lean, t),
  head: lerp(a.head, b.head, t),
  hL: lerpV(a.hL, b.hL, t),
  hR: lerpV(a.hR, b.hR, t),
  fL: lerpV(a.fL, b.fL, t),
  fR: lerpV(a.fR, b.fR, t),
});

const fl = FLOOR;
const FEET = {fL: v(FX - 15, fl), fR: v(FX + 17, fl)};

/** tay ôm bóng (nhìn ngang) */
const held = (ball: V) => ({hR: v(ball.x - 9, ball.y + 9), hL: v(ball.x - 17, ball.y + 4)});

export const DRIB_X = FX + 52;
export const DRIB_TOP = v(DRIB_X, fl - R - 62);
export const CHEST = v(FX + 30, fl - 152);
const DIPBALL = v(FX + 26, fl - 140);
export const RELEASE = v(FX + 52, fl - 242);
const SETPOINT = v(FX + 34, fl - 206);

export const POSES = {
  stand: {hip: v(FX, fl - 93), lean: 0.05, head: 0.05, hL: v(FX - 4, fl - 92), hR: v(FX + 10, fl - 90), ...FEET} as Pose,
  proud: {hip: v(FX, fl - 94), lean: -0.05, head: -0.12, hL: v(FX - 10, fl - 94), hR: v(FX + 6, fl - 92), ...FEET} as Pose,
  gather: {hip: v(FX, fl - 90), lean: 0.12, head: 0.02, ...held(CHEST), ...FEET} as Pose,
  dip: {hip: v(FX - 3, fl - 80), lean: 0.2, head: -0.12, ...held(DIPBALL), ...FEET} as Pose,
  release: {
    hip: v(FX + 3, fl - 104),
    lean: 0.02,
    head: -0.28,
    ...held(RELEASE),
    fL: v(FX - 12, fl - 7),
    fR: v(FX + 18, fl - 9),
  } as Pose,
  follow: {hip: v(FX + 3, fl - 95), lean: 0.04, head: -0.24, hL: v(FX + 40, fl - 222), hR: v(FX + 60, fl - 214), ...FEET} as Pose,
  setpoint: {hip: v(FX, fl - 95), lean: 0.06, head: -0.2, ...held(SETPOINT), ...FEET} as Pose,
  watch: {hip: v(FX, fl - 94), lean: 0.03, head: -0.18, hL: v(FX + 4, fl - 150), hR: v(FX + 30, fl - 160), ...FEET} as Pose,
  slump: {hip: v(FX - 6, fl - 84), lean: 0.52, head: 0.75, hL: v(FX + 40, fl - 146), hR: v(FX + 50, fl - 140), ...FEET} as Pose,
  crouch: {hip: v(FX - 2, fl - 76), lean: 0.3, head: -0.1, hL: v(FX - 6, fl - 100), hR: v(FX + 20, fl - 104), ...FEET} as Pose,
  jump: {
    hip: v(FX + 4, fl - 128),
    lean: -0.08,
    head: -0.35,
    hL: v(FX - 28, fl - 268),
    hR: v(FX + 34, fl - 272),
    fL: v(FX - 20, fl - 30),
    fR: v(FX + 16, fl - 36),
  } as Pose,
  land: {hip: v(FX, fl - 80), lean: 0.22, head: -0.05, hL: v(FX - 30, fl - 200), hR: v(FX + 36, fl - 206), ...FEET} as Pose,
};

const dribblePose = (ball: V, u: number): Pose => {
  const bob = Math.cos(2 * Math.PI * u);
  return {
    hip: v(FX - 4, fl - 86 + bob * 1.6),
    lean: 0.36 + bob * 0.02,
    head: 0.22,
    hL: v(FX + 2, fl - 100 + bob),
    hR: v(ball.x - 3, Math.min(ball.y - R + 1, fl - 84)),
    fL: v(FX - 17, fl),
    fR: v(FX + 19, fl),
  };
};

const dribbleBall = (u: number): {ball: V; squash: number} => {
  const c = Math.abs(Math.cos(Math.PI * u));
  const squash = 1 - 0.2 * clamp(1 - Math.abs(u - 0.5) / 0.05);
  return {ball: v(DRIB_X, fl - R - 62 * c), squash};
};

// ---------------------------------------------------------------- quỹ đạo bóng
export type Seg = {f0: number; f1: number; p0: V; p1: V; h: number; remap?: (t: number) => number; fall?: boolean};
const arcAt = (s: Seg, f: number): V => {
  let u = inv(s.f0, s.f1, f);
  if (s.remap) u = s.remap(u);
  if (s.fall) return v(lerp(s.p0.x, s.p1.x, u), lerp(s.p0.y, s.p1.y, u * u));
  return v(lerp(s.p0.x, s.p1.x, u), lerp(s.p0.y, s.p1.y, u) - 4 * s.h * u * (1 - u));
};
const segAt = (segs: Seg[], f: number): V | null => {
  for (const s of segs) if (f >= s.f0 && f <= s.f1) return arcAt(s, f);
  return null;
};

// tiếp xúc vành
export const FRONT_RIM = v(RIM.x - RIM.rx - 3, RIM.y - R + 3);
export const BACK_RIM = v(RIM.x + RIM.rx - 6, RIM.y - R - 1);
export const SWISH = v(RIM.x, RIM.y - R + 2);

// ---------------------------------------------------------------- keyframe track
type Key = {f: number; pose: Pose; e?: (t: number) => number};
const keyed = (keys: Key[], f: number): Pose => {
  if (f <= keys[0].f) return keys[0].pose;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (f <= b.f) return lerpPose(a.pose, b.pose, (b.e ?? ease.inOut)(inv(a.f, b.f, f)));
  }
  return keys[keys.length - 1].pose;
};

// ================================================================ HÀNG 1 — 93%: chuẩn bị mãi, không bao giờ ném
const ROW1_DRIB_START = S.reveal[0];
const HES_LEN = 40;
export const HESITATIONS: number[] = (() => {
  const out: number[] = [];
  let removed = 0;
  for (const nominal of [150, 204]) {
    let s = nominal;
    while (mod(s - removed - ROW1_DRIB_START, P) !== 0) s++;
    out.push(s);
    removed += HES_LEN;
  }
  return out;
})();

const row1Eff = (f: number) => {
  let e = f;
  for (const s of HESITATIONS) if (f >= s + HES_LEN) e -= HES_LEN;
  return e - ROW1_DRIB_START;
};

const hesitationKeys = (s: number, variant: number): Key[] => {
  const top = dribblePose(DRIB_TOP, 0);
  const sp = variant === 0 ? POSES.setpoint : {...POSES.setpoint, head: 0.1, lean: 0.12};
  return [
    {f: s, pose: top},
    {f: s + 7, pose: POSES.gather},
    {f: s + 13, pose: POSES.dip},
    {f: s + 19, pose: sp, e: ease.out},
    {f: s + 30, pose: {...sp, hip: v(sp.hip.x, sp.hip.y + 2)}}, // giữ… do dự
    {f: s + 36, pose: POSES.gather},
    {f: s + HES_LEN, pose: top},
  ];
};

// ================================================================ HÀNG 2 — 6%: ném một lần, trượt, bỏ cuộc
export const R2 = {gather: 262, release: 284, rim: 304, floor1: 322, out: 340, slump: 326, slumped: 338};
const row2Segs: Seg[] = [
  {f0: R2.release, f1: R2.rim, p0: RELEASE, p1: BACK_RIM, h: 175},
  {f0: R2.rim, f1: R2.floor1, p0: BACK_RIM, p1: v(990, fl - R), h: 120},
  {f0: R2.floor1, f1: R2.out, p0: v(990, fl - R), p1: v(1190, fl - R), h: 46},
];
const row2Keys: Key[] = [
  {f: R2.gather, pose: dribblePose(DRIB_TOP, 0)},
  {f: R2.gather + 8, pose: POSES.gather},
  {f: R2.gather + 16, pose: POSES.dip},
  {f: R2.release, pose: POSES.release, e: ease.out},
  {f: R2.release + 8, pose: POSES.follow},
  {f: R2.rim + 2, pose: POSES.follow},
  {f: R2.floor1 - 2, pose: POSES.watch},
  {f: R2.slump, pose: POSES.watch},
  {f: R2.slumped, pose: POSES.slump, e: ease.out},
];

// ================================================================ HÀNG 3 — 1%: trượt, trượt, trượt… vẫn ném
export const R3 = {
  gather: 385,
  releases: [407, 453, 499] as number[],
  montage: [535, 586] as [number, number],
  finalCatch: 586,
  finalRelease: 606,
  swish: 650,
  floor: 666,
};
const TF = 18; // bay tới vành
const TR = 18; // bật về tay
export const MONTAGE_CYCLE = 5;
export const GHOST_UP = 10;
export const GHOST_LEN = 20;
export const MONTAGE_RELEASES: number[] = (() => {
  const out: number[] = [];
  for (let f = R3.montage[0] + 6; f <= R3.montage[1] - GHOST_LEN; f += MONTAGE_CYCLE) out.push(f);
  return out;
})();

const slowmo = (t: number) => t + (0.72 * Math.sin(2 * Math.PI * t)) / (2 * Math.PI);

const row3Segs: Seg[] = (() => {
  const s: Seg[] = [];
  for (const r of R3.releases) {
    s.push({f0: r, f1: r + TF, p0: RELEASE, p1: FRONT_RIM, h: 150});
    s.push({f0: r + TF, f1: r + TF + TR, p0: FRONT_RIM, p1: CHEST, h: 95});
  }
  const fr = R3.finalRelease;
  s.push({f0: fr, f1: R3.swish, p0: RELEASE, p1: SWISH, h: 190, remap: slowmo});
  s.push({f0: R3.swish, f1: R3.swish + 16, p0: SWISH, p1: v(RIM.x + 14, fl - R), h: 0, fall: true});
  const f0 = R3.swish + 16;
  s.push({f0, f1: f0 + 16, p0: v(RIM.x + 14, fl - R), p1: v(RIM.x + 62, fl - R), h: 52});
  s.push({f0: f0 + 16, f1: f0 + 28, p0: v(RIM.x + 62, fl - R), p1: v(RIM.x + 92, fl - R), h: 20});
  s.push({f0: f0 + 28, f1: f0 + 36, p0: v(RIM.x + 92, fl - R), p1: v(RIM.x + 108, fl - R), h: 7});
  s.push({f0: f0 + 36, f1: f0 + 70, p0: v(RIM.x + 108, fl - R), p1: v(RIM.x + 130, fl - R), h: 0, remap: ease.out});
  return s;
})();

const row3Keys: Key[] = (() => {
  const k: Key[] = [
    {f: R3.gather, pose: dribblePose(DRIB_TOP, 0)},
    {f: R3.gather + 8, pose: POSES.gather},
    {f: R3.gather + 16, pose: POSES.dip},
  ];
  R3.releases.forEach((r, i) => {
    k.push({f: r, pose: POSES.release, e: ease.out});
    k.push({f: r + 8, pose: POSES.follow});
    k.push({f: r + TF + TR - 6, pose: {...POSES.gather, head: -0.05}});
    k.push({f: r + TF + TR, pose: POSES.gather});
    if (i < R3.releases.length - 1) k.push({f: r + TF + TR + 5, pose: POSES.dip});
  });
  // montage: những cú ném dồn dập
  for (const r of MONTAGE_RELEASES) {
    k.push({f: r - 2, pose: POSES.dip});
    k.push({f: r, pose: POSES.release, e: ease.out});
    k.push({f: r + 2, pose: POSES.follow});
  }
  k.push({f: R3.finalCatch, pose: POSES.gather});
  k.push({f: R3.finalRelease - 8, pose: {...POSES.dip, hip: v(FX - 4, fl - 76)}, e: ease.inOutSine}); // hít một hơi
  k.push({f: R3.finalRelease, pose: POSES.release, e: ease.out});
  k.push({f: R3.finalRelease + 10, pose: POSES.follow});
  k.push({f: R3.swish, pose: POSES.follow});
  k.push({f: R3.swish + 5, pose: POSES.crouch});
  k.push({f: R3.swish + 13, pose: POSES.jump, e: ease.out});
  k.push({f: R3.swish + 21, pose: POSES.land, e: ease.in});
  k.push({f: R3.swish + 27, pose: {...POSES.jump, hip: v(FX + 2, fl - 108), fL: v(FX - 16, fl - 14), fR: v(FX + 18, fl - 16)}, e: ease.out});
  k.push({f: R3.swish + 33, pose: POSES.land, e: ease.in});
  k.push({f: R3.swish + 46, pose: POSES.proud});
  return k;
})();

// ================================================================ trạng thái mỗi hàng
export type Ghost = {p: V; a: number; trail: V[]};
export type RowState = {
  pose: Pose;
  ball: V | null;
  ballSquash: number;
  ballRot: number;
  heat: number; // 0 trắng → 1 đỏ
  dim: number; // 0 bình thường → 1 xám tắt lửa
  hoopGlow: number;
  net: number; // độ giãn lưới
  ghosts: Ghost[];
  throws: number;
  makes: number;
};

const breathe = (p: Pose, f: number, amt = 1.4): Pose => ({
  ...p,
  hip: v(p.hip.x, p.hip.y + Math.sin(f / 13) * amt),
  lean: p.lean + Math.sin(f / 13) * 0.012,
});

const ghostAt = (r: number, f: number): V | null => {
  const t = f - r;
  if (t < 0 || t > GHOST_LEN) return null;
  const jitter = ((r * 7919) % 13) - 6;
  const hit = v(FRONT_RIM.x + jitter, FRONT_RIM.y);
  if (t <= GHOST_UP) return arcAt({f0: 0, f1: GHOST_UP, p0: RELEASE, p1: hit, h: 145}, t);
  return arcAt({f0: GHOST_UP, f1: GHOST_LEN, p0: hit, p1: CHEST, h: 80 + jitter * 3}, t);
};

export const rowState = (row: number, f: number): RowState => {
  const base: RowState = {
    pose: POSES.stand,
    ball: null,
    ballSquash: 1,
    ballRot: 0,
    heat: 0,
    dim: 0,
    hoopGlow: 0,
    net: 0,
    ghosts: [],
    throws: 0,
    makes: 0,
  };

  if (row === 0) {
    const inWin = HESITATIONS.find((s) => f >= s && f < s + HES_LEN);
    if (inWin !== undefined) {
      const variant = HESITATIONS.indexOf(inWin);
      const pose = keyed(hesitationKeys(inWin, variant), f);
      const ball = v(pose.hR.x + 9, pose.hR.y - 9);
      return {...base, pose, ball, ballRot: f * 0.05};
    }
    const u = mod(row1Eff(f), P) / P;
    const {ball, squash} = dribbleBall(u);
    return {...base, pose: dribblePose(ball, u), ball, ballSquash: squash, ballRot: f * 0.18};
  }

  if (row === 1) {
    if (f < R2.gather) {
      const u = mod(f - R2.gather, P) / P;
      const {ball, squash} = dribbleBall(u);
      return {...base, pose: dribblePose(ball, u), ball, ballSquash: squash, ballRot: f * 0.18};
    }
    let pose = keyed(row2Keys, f);
    if (f > R2.slumped) pose = breathe(pose, f, 1.2);
    let ball: V | null = segAt(row2Segs, f);
    if (!ball && f < R2.release) ball = v(pose.hR.x + 9, pose.hR.y - 9);
    if (f > R2.out) ball = null;
    const squash = ball && Math.abs(f - R2.floor1) < 1.2 ? 0.8 : 1;
    return {
      ...base,
      pose,
      ball,
      ballSquash: squash,
      ballRot: f < R2.release ? f * 0.05 : -(f - R2.release) * 0.35,
      dim: tween(f, R2.slumped - 6, R2.slumped + 40, 0, 1),
      throws: f >= R2.release ? 1 : 0,
    };
  }

  // row === 2
  if (f < R3.gather) {
    const u = mod(f - R3.gather, P) / P;
    const {ball, squash} = dribbleBall(u);
    return {...base, pose: dribblePose(ball, u), ball, ballSquash: squash, ballRot: f * 0.18};
  }
  let pose = keyed(row3Keys, f);
  if (f > R3.swish + 46) pose = breathe(pose, f, 1);
  let ball: V | null = segAt(row3Segs, f);
  const inMontage = f > R3.releases[2] + TF + TR && f < R3.finalCatch;
  if (!ball && !inMontage && f < R3.finalRelease) ball = v(pose.hR.x + 9, pose.hR.y - 9);
  if (!ball && f > R3.swish) ball = segAt(row3Segs, row3Segs[row3Segs.length - 1].f1);

  const ghosts: Ghost[] = [];
  if (f >= R3.montage[0] - 1 && f <= R3.montage[1] + 6) {
    for (const r of MONTAGE_RELEASES) {
      const p = ghostAt(r, f);
      if (!p) continue;
      const trail: V[] = [];
      for (let i = 1; i <= 5; i++) {
        const q = ghostAt(r, f - i * 0.8);
        if (q) trail.push(q);
      }
      ghosts.push({p, a: 0.85, trail});
    }
    // bóng thật hiện lại khi về tay
    if (f > R3.montage[1] - 4 && f < R3.finalCatch) ball = v(pose.hR.x + 9, pose.hR.y - 9);
  }

  // số lần ném
  let throws = 0;
  R3.releases.forEach((r) => f >= r && throws++);
  if (f >= R3.montage[0]) throws = Math.round(lerp(3, 99, ease.in(inv(R3.montage[0], R3.montage[1], f)) * 0.35 + inv(R3.montage[0], R3.montage[1], f) * 0.65));
  if (f >= R3.finalRelease) throws = 100;

  let heat = 0;
  if (f >= R3.releases[0]) heat = 0.1;
  if (f >= R3.releases[1]) heat = 0.18;
  if (f >= R3.releases[2]) heat = 0.26;
  if (f >= R3.montage[0]) heat = tween(f, R3.montage[0], R3.montage[1], 0.26, 0.72, ease.linear);
  if (f >= R3.finalRelease) heat = tween(f, R3.finalRelease, R3.swish, 0.72, 0.82);
  if (f >= R3.swish) heat = tween(f, R3.swish, R3.swish + 6, 0.82, 1, ease.out);

  const hoopGlow = f >= R3.swish ? 0.75 + 0.25 * Math.exp(-(f - R3.swish) / 10) : 0;
  const net = f >= R3.swish - 1 ? Math.exp(-(f - R3.swish) / 5) * Math.sin(((f - R3.swish) / 4) * Math.PI + 0.6) : 0;

  return {
    ...base,
    pose,
    ball,
    ballSquash: 1,
    ballRot: f < R3.finalRelease ? f * 0.06 : -(f - R3.finalRelease) * 0.25,
    heat,
    hoopGlow,
    net: Math.max(0, net),
    ghosts,
    throws,
    makes: f >= R3.swish ? 1 : 0,
  };
};

// ================================================================ camera
export type Cam = {cx: number; cy: number; s: number; focus: [number, number, number]};
const WIDE: Cam = {cx: W / 2, cy: H / 2, s: 1, focus: [1, 1, 1]};
const rowCam = (i: number, s = 1.34): Cam => {
  const focus: [number, number, number] = [0, 0, 0];
  focus[i] = 1;
  return {cx: W / 2, cy: ROW_TOP[i] + ROW_H * 0.47, s, focus};
};
const CAM_KEYS: {f: number; c: Cam; e?: (t: number) => number}[] = [
  {f: 0, c: WIDE},
  {f: S.focus1, c: WIDE},
  {f: S.focus1 + 22, c: rowCam(0)},
  {f: S.focus2 - 4, c: rowCam(0, 1.38)},
  {f: S.focus2 + 20, c: rowCam(1)},
  {f: S.focus3 - 4, c: rowCam(1, 1.38)},
  {f: S.focus3 + 20, c: rowCam(2)},
  {f: R3.montage[0], c: rowCam(2, 1.36)},
  {f: R3.montage[1], c: rowCam(2, 1.46), e: ease.in},
  {f: R3.finalRelease, c: rowCam(2, 1.42)},
  {f: R3.swish, c: {...rowCam(2, 1.52), cx: W / 2 + 85, cy: ROW_TOP[2] + 200}, e: ease.inOutSine},
  {f: R3.swish + 30, c: {...rowCam(2, 1.42), cx: W / 2 + 40}},
  {f: S.wide, c: rowCam(2, 1.38)},
  {f: S.wide + 24, c: {...WIDE, focus: [0.62, 0.62, 1]}},
  {f: S.endFade, c: {...WIDE, s: 1.03, focus: [0.5, 0.5, 1]}, e: ease.linear},
  {f: S.end, c: {...WIDE, s: 1.03, focus: [0.5, 0.5, 1]}},
];

export const camAt = (f: number): Cam => {
  let c = CAM_KEYS[CAM_KEYS.length - 1].c;
  for (let i = 0; i < CAM_KEYS.length - 1; i++) {
    const a = CAM_KEYS[i];
    const b = CAM_KEYS[i + 1];
    if (f >= a.f && f <= b.f) {
      const t = (b.e ?? ease.inOut)(inv(a.f, b.f, f));
      c = {
        cx: lerp(a.c.cx, b.c.cx, t),
        cy: lerp(a.c.cy, b.c.cy, t),
        s: lerp(a.c.s, b.c.s, t),
        focus: [0, 1, 2].map((k) => lerp(a.c.focus[k], b.c.focus[k], t)) as [number, number, number],
      };
      break;
    }
  }
  // rung máy cầm tay rất nhẹ + cú rung khi va chạm
  const drift = {x: Math.sin(f / 37) * 2.2 + Math.sin(f / 23) * 1.1, y: Math.cos(f / 41) * 1.8};
  const kick = (at: number, amp: number) => {
    const t = f - at;
    return t < 0 ? 0 : amp * Math.exp(-t / 4) * Math.sin(t * 2.4);
  };
  const shake = kick(R3.swish, 9) + kick(S.hookThud, 0);
  return {...c, cx: c.cx + drift.x + shake * 0.6, cy: c.cy + drift.y + shake};
};

// ================================================================ số liệu HUD hàng 1
export const row1Days = (f: number) => {
  const a = Math.round(lerp(1, 365, ease.out(inv(S.focus1 + 10, S.focus2 - 10, f))));
  const b = Math.round(lerp(0, 2555, ease.in(inv(S.focus2, S.endFade, f)))); // vẫn chuẩn bị… 7 năm
  return a + b;
};

// ================================================================ móc mở đầu — quả bóng rơi
export const HOOK_FLOOR = 1180;
export const hookBall = (f: number): {p: V; squash: number} => {
  const x = W / 2;
  const top = -120;
  const bottom = HOOK_FLOOR - 40;
  const b = [S.hookThud, 32, 44, 52, 57];
  const hs = [0, 330, 120, 40, 12];
  if (f <= b[0]) {
    const u = f / b[0];
    return {p: v(x, lerp(top, bottom, u * u)), squash: 1};
  }
  for (let i = 0; i < b.length - 1; i++) {
    if (f <= b[i + 1]) {
      const u = inv(b[i], b[i + 1], f);
      const sq = 1 - 0.28 * Math.exp(-(f - b[i]) * 1.6) * (hs[i + 1] / 330 + 0.2);
      return {p: v(x, bottom - 4 * hs[i + 1] * u * (1 - u)), squash: sq};
    }
  }
  return {p: v(x, bottom), squash: 1};
};
export const HOOK_BOUNCES = [S.hookThud, 32, 44, 52, 57];

// ================================================================ kết — quả bóng làm dấu chấm câu
export const periodBall = (f: number, target: V): {p: V; squash: number; a: number} => {
  const t0 = S.periodDrop - 14;
  const top = v(target.x, target.y - 700);
  if (f < t0) return {p: top, squash: 1, a: 0};
  if (f <= S.periodDrop) {
    const u = inv(t0, S.periodDrop, f);
    return {p: v(target.x, lerp(top.y, target.y, u * u)), squash: 1, a: 1};
  }
  const bounces = [S.periodDrop, S.periodDrop + 10, S.periodDrop + 16, S.periodDrop + 20];
  const hs = [0, 46, 14, 4];
  for (let i = 0; i < bounces.length - 1; i++) {
    if (f <= bounces[i + 1]) {
      const u = inv(bounces[i], bounces[i + 1], f);
      return {p: v(target.x, target.y - 4 * hs[i + 1] * u * (1 - u)), squash: 1 - 0.25 * Math.exp(-(f - bounces[i]) * 1.4) * (hs[i + 1] / 46), a: 1};
    }
  }
  return {p: target, squash: 1, a: 1};
};
export const PERIOD_BOUNCES = [S.periodDrop, S.periodDrop + 10, S.periodDrop + 16];

// ================================================================ danh sách sự kiện âm thanh
export type AudioEvent = {t: number; type: string; row?: number; gain?: number; pan?: number; pitch?: number};

export const audioEvents = (): AudioEvent[] => {
  const ev: AudioEvent[] = [];
  const t = (f: number) => f / FPS;
  const focusGain = (row: number, f: number) => {
    const c = camAt(f);
    return 0.25 + 0.75 * c.focus[row] * (c.s > 1.1 || c.focus.every((x) => x > 0.9) ? 1 : 0.8);
  };
  const panX = (x: number) => clamp((x - W / 2) / (W / 2), -1, 1) * 0.6;

  // HOOK
  HOOK_BOUNCES.forEach((f, i) => ev.push({t: t(f), type: 'thud', gain: [1.25, 0.8, 0.55, 0.35, 0.2][i], pitch: 0.82}));
  ev.push({t: t(S.hookThud), type: 'boom', gain: 0.55});
  ev.push({t: t(S.hookThud + 1), type: 'textSlam', gain: 0.6});
  ev.push({t: t(32 + 1), type: 'textSlam', gain: 0.7});
  ev.push({t: t(S.hookOut - 6), type: 'whoosh', gain: 0.7, pitch: 1});

  // REVEAL
  S.reveal.forEach((f, i) => {
    ev.push({t: t(f), type: 'rise', gain: 0.45, pan: [-0.1, 0, 0.1][i]});
    for (let k = 0; k < 6; k++) ev.push({t: t(f + 6 + k * 3), type: 'tick', gain: 0.18, pitch: 1 + i * 0.12 + k * 0.03});
  });

  // dribble của các hàng
  for (let row = 0; row < 3; row++) {
    let prevY = 0;
    let prevV = 0;
    for (let f = S.reveal[row] + 4; f < S.end - 30; f += 0.25) {
      const st = rowState(row, f);
      if (!st.ball) {
        prevV = 0;
        continue;
      }
      const vy = st.ball.y - prevY;
      // va chạm sàn: vận tốc đổi chiều từ xuống sang lên gần mặt sàn
      if (prevV > 0.6 && vy <= 0 && st.ball.y > FLOOR - R - 6) {
        const strength = clamp(prevV / 9, 0.25, 1);
        ev.push({t: t(f), type: 'thud', row, gain: strength * focusGain(row, f) * (f > S.endFade ? 0.3 : 1), pan: panX(st.ball.x)});
      }
      prevV = vy;
      prevY = st.ball.y;
    }
  }

  // HÀNG 1 — nhịp tim lúc do dự
  HESITATIONS.forEach((s) => {
    ev.push({t: t(s + 19), type: 'heart', gain: 0.7});
    ev.push({t: t(s + 27), type: 'heart', gain: 0.5});
  });
  ev.push({t: t(S.focus1), type: 'whoosh', gain: 0.45, pitch: 0.8});

  // HÀNG 2
  ev.push({t: t(S.focus2), type: 'whoosh', gain: 0.45, pitch: 0.85});
  ev.push({t: t(R2.release), type: 'shot', gain: 0.9, pan: -0.3});
  ev.push({t: t(R2.rim), type: 'clank', gain: 1, pitch: 0.95, pan: 0.35});
  ev.push({t: t(R2.slump), type: 'deflate', gain: 0.8});

  // HÀNG 3
  ev.push({t: t(S.focus3), type: 'whoosh', gain: 0.45, pitch: 0.9});
  R3.releases.forEach((r, i) => {
    ev.push({t: t(r), type: 'shot', gain: 0.8, pan: -0.3});
    ev.push({t: t(r + TF), type: 'clank', gain: 0.95, pitch: 1 + i * 0.04, pan: 0.35});
    ev.push({t: t(r + TF + TR), type: 'catch', gain: 0.7, pan: -0.3});
    ev.push({t: t(r), type: 'counter', gain: 0.35, pitch: 1 + i * 0.06});
  });
  MONTAGE_RELEASES.forEach((r, i) => {
    ev.push({t: t(r), type: 'shot', gain: 0.45, pan: -0.3, pitch: 1.1 + i * 0.05});
    ev.push({t: t(r + GHOST_UP), type: 'clank', gain: 0.55 + i * 0.03, pitch: 1.05 + i * 0.05, pan: 0.35});
  });
  for (let f = R3.montage[0]; f < R3.montage[1]; f += 2.5) ev.push({t: t(f), type: 'tick', gain: 0.12, pitch: 1.4 + (f - R3.montage[0]) / 60});
  ev.push({t: t(R3.montage[0]), type: 'riser', gain: 0.9});
  ev.push({t: t(R3.finalRelease - 10), type: 'heart', gain: 0.9});
  ev.push({t: t(R3.finalRelease - 2), type: 'heart', gain: 0.7});
  ev.push({t: t(R3.finalRelease), type: 'shotSlow', gain: 1, pan: -0.2});
  ev.push({t: t(R3.swish - 14), type: 'reverseSwell', gain: 0.9});
  ev.push({t: t(R3.swish), type: 'swish', gain: 1.1, pan: 0.3});
  ev.push({t: t(R3.swish), type: 'boom', gain: 1});
  ev.push({t: t(R3.swish), type: 'chord', gain: 1});
  ev.push({t: t(R3.swish + 13), type: 'whoosh', gain: 0.3, pitch: 1.4});
  ev.push({t: t(R3.swish + 21), type: 'land', gain: 0.6});
  ev.push({t: t(R3.swish + 33), type: 'land', gain: 0.4});

  // TƯƠNG PHẢN + KẾT
  ev.push({t: t(S.wide), type: 'whoosh', gain: 0.5, pitch: 0.7});
  ev.push({t: t(S.contrast + 2), type: 'tagHit', gain: 0.7});
  ev.push({t: t(S.endFade), type: 'reverseSwell', gain: 0.5});
  ev.push({t: t(S.line1), type: 'note', gain: 0.55, pitch: 587.33});
  ev.push({t: t(S.line2), type: 'note', gain: 0.6, pitch: 739.99});
  ev.push({t: t(S.line2 + 10), type: 'note', gain: 0.6, pitch: 880});
  PERIOD_BOUNCES.forEach((f, i) => ev.push({t: t(f), type: 'thud', gain: [0.9, 0.45, 0.2][i], pitch: 1.05}));
  ev.push({t: t(S.periodDrop), type: 'boomSoft', gain: 0.8});
  ev.push({t: t(S.cta), type: 'note', gain: 0.45, pitch: 1174.66});
  return ev.sort((a, b) => a.t - b.t);
};
