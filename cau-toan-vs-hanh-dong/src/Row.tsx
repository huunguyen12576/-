import React from 'react';
import {Ball, BallShadow, Court, Figure, HoopBack, HoopFront, RED, mixColor} from './parts';
import {FLOOR, FX, R, RIM, ROW_H, ROW_TOP, S, camAt, clamp, ease, inv, row1Days, rowState, tween} from './timeline';

const LABEL = [93, 6, 1];
const TAGS = [
  {main: 'CẦU TOÀN', sub: 'Chuẩn bị mãi. Chưa từng ném.', at: 236},
  {main: 'CẦU TOÀN', sub: 'Trượt một lần. Bỏ cuộc mãi mãi.', at: 350},
  {main: 'HÀNH ĐỘNG', sub: 'Trượt 99 lần. Vẫn ném lần thứ 100.', at: 676},
];

const font = 'Montserrat, sans-serif';

/** hiệu ứng "nảy" khi con số thay đổi */
const popOf = (vals: (f: number) => number, f: number) => {
  const now = vals(f);
  for (let k = 1; k <= 6; k++) if (vals(f - k) !== now) return 1 + 0.28 * (1 - k / 7);
  return 1;
};

const Stat: React.FC<{label: string; value: string; pop: number; color?: string}> = ({label, value, pop, color = '#fff'}) => (
  <span style={{display: 'inline-flex', alignItems: 'baseline', gap: 10}}>
    <span style={{fontSize: 17, fontWeight: 700, letterSpacing: '0.22em', color: '#8d8d8d'}}>{label}</span>
    <span
      style={{
        fontSize: 27,
        fontWeight: 800,
        color,
        fontVariantNumeric: 'tabular-nums',
        display: 'inline-block',
        transform: `scale(${pop})`,
        transformOrigin: 'left 70%',
      }}
    >
      {value}
    </span>
  </span>
);

const fmt = (n: number) => n.toLocaleString('de-DE');

export const Row: React.FC<{i: number; f: number}> = ({i, f}) => {
  const st = rowState(i, f);
  const cam = camAt(f);
  const w = cam.focus[i];
  const a = S.reveal[i];
  const id = `r${i}`;

  // xuất hiện
  const draw = tween(f, a, a + 20, 0, 1, ease.out);
  const hoopY = tween(f, a + 4, a + 24, 70, 0, ease.outBack);
  const hoopO = tween(f, a + 4, a + 12, 0, 1);
  const figO = tween(f, a + 8, a + 16, 0, 1);
  const figY = tween(f, a + 8, a + 20, -26, 0, ease.outBack);
  const labelT = ease.out(inv(a + 6, a + 26, f));
  const labelN = Math.round(LABEL[i] * labelT);
  const hudO = tween(f, a + 22, a + 34, 0, 1);

  // độ sâu trường ảnh: hàng không được chú ý → mờ & tối
  const blur = (1 - w) * 6;
  const bright = 0.28 + 0.72 * w;

  const heat = st.heat;
  const labelColor = i === 2 ? mixColor('#ffffff', RED, clamp(heat * 1.4)) : '#ffffff';

  // HUD
  let hud: React.ReactNode;
  if (i === 0) {
    hud = (
      <>
        <Stat label="NÉM" value="0" pop={1} />
        <span style={{color: '#444'}}>／</span>
        <Stat label="CHUẨN BỊ" value={`${fmt(row1Days(f))} NGÀY`} pop={1} color="#cfcfcf" />
      </>
    );
  } else if (i === 1) {
    const t = st.throws;
    const miss = f >= 304 ? 1 : 0;
    hud = (
      <>
        <Stat label="NÉM" value={`${t}`} pop={popOf((x) => rowState(1, x).throws, f)} />
        <span style={{color: '#444'}}>／</span>
        <Stat label="TRƯỢT" value={`${miss}`} pop={popOf((x) => (x >= 304 ? 1 : 0), f)} color={miss ? '#9a9a9a' : '#fff'} />
      </>
    );
  } else {
    const t = st.throws;
    hud = (
      <>
        <Stat label="NÉM" value={`${t}`} pop={popOf((x) => rowState(2, x).throws, f)} color={mixColor('#ffffff', '#ff6b5e', heat)} />
        <span style={{color: '#444'}}>／</span>
        <Stat label="VÀO" value={`${st.makes}`} pop={popOf((x) => rowState(2, x).makes, f) * (st.makes ? 1 + 0.4 * Math.exp(-(f - 650) / 8) : 1)} color={st.makes ? RED : '#fff'} />
      </>
    );
  }

  const tag = TAGS[i];
  const tagT = ease.out(inv(tag.at, tag.at + 14, f));
  const tagRed = i === 2;

  // ánh sáng: cột đèn từ trên xuống, mạnh lên khi được chú ý
  const beam = 0.1 + 0.55 * w + (i === 2 ? st.hoopGlow * 0.25 : 0);

  const scene = (forReflection: boolean) => (
    <g>
      <g transform={`translate(0 ${hoopY})`} opacity={hoopO}>
        <HoopBack glow={st.hoopGlow} />
      </g>
      <g opacity={figO} transform={`translate(0 ${figY})`}>
        <Figure pose={st.pose} id={`${id}${forReflection ? 'm' : ''}`} heat={heat} dim={st.dim} bloom={!forReflection && i === 2} />
      </g>
      {st.ghosts.map((g, k) => (
        <g key={k}>
          {g.trail.map((q, n) => (
            <circle key={n} cx={q.x} cy={q.y} r={R * (1 - n * 0.12)} fill={RED} opacity={0.16 * (1 - n / 6)} />
          ))}
          <Ball p={g.p} rot={f * 0.4} id={`${id}g${k}${forReflection ? 'm' : ''}`} opacity={g.a * 0.75} glow={0.6} />
        </g>
      ))}
      {st.ball && figO > 0 && (
        <Ball p={st.ball} rot={st.ballRot} squash={st.ballSquash} id={`${id}b${forReflection ? 'm' : ''}`} glow={0.35 + st.hoopGlow * 0.4} opacity={figO} />
      )}
      <g transform={`translate(0 ${hoopY})`} opacity={hoopO}>
        <HoopFront glow={st.hoopGlow} net={st.net} />
      </g>
    </g>
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: ROW_TOP[i],
        width: 1080,
        height: ROW_H,
        filter: blur > 0.25 ? `blur(${blur.toFixed(1)}px) brightness(${bright.toFixed(3)})` : bright < 0.999 ? `brightness(${bright.toFixed(3)})` : undefined,
      }}
    >
      <svg width={1080} height={ROW_H} viewBox={`0 0 1080 ${ROW_H}`} style={{position: 'absolute', overflow: 'visible'}}>
        <defs>
          <linearGradient id={`beam-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity={0} />
            <stop offset="0.5" stopColor="#fff" stopOpacity={0.05} />
            <stop offset="1" stopColor="#fff" stopOpacity={0.11} />
          </linearGradient>
          <linearGradient id={`refl-${id}`} gradientUnits="userSpaceOnUse" x1="0" y1={FLOOR} x2="0" y2={FLOOR + 120}>
            <stop offset="0" stopColor="#fff" stopOpacity={1} />
            <stop offset="1" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
          <mask id={`reflmask-${id}`}>
            <rect x={-300} y={FLOOR} width={1700} height={140} fill={`url(#refl-${id})`} />
          </mask>
          <radialGradient id={`burst-${id}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={RED} stopOpacity={0.55} />
            <stop offset="0.4" stopColor={RED} stopOpacity={0.16} />
            <stop offset="1" stopColor={RED} stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* cột sáng thể tích */}
        <polygon points={`${FX - 10},-170 ${FX + 70},-170 ${FX + 250},${FLOOR + 30} ${FX - 170},${FLOOR + 30}`} fill={`url(#beam-${id})`} opacity={beam * draw} filter="url(#blur14)" />
        {i === 2 && st.hoopGlow > 0 && <ellipse cx={RIM.x} cy={RIM.y + 30} rx={380} ry={300} fill={`url(#burst-${id})`} opacity={st.hoopGlow} />}

        <Court draw={draw} id={id} light={0.6 + w * 0.6} />
        {i === 2 && st.hoopGlow > 0 && <ellipse cx={RIM.x} cy={FLOOR + 6} rx={260} ry={36} fill={RED} opacity={st.hoopGlow * 0.16} filter="url(#blur14)" />}

        {/* phản chiếu trên sàn bóng */}
        <g mask={`url(#reflmask-${id})`} opacity={0.24}>
          <g transform={`translate(0 ${FLOOR * 2 + 2}) scale(1 -1)`} filter="url(#blur2)">
            {scene(true)}
          </g>
        </g>

        {/* bóng đổ */}
        <ellipse cx={FX + 4} cy={FLOOR + 3} rx={44} ry={7} fill="#000" opacity={0.85 * figO} filter="url(#blur3)" />
        {st.ball && <BallShadow p={st.ball} opacity={figO} />}

        {scene(false)}
      </svg>

      {/* nhãn */}
      <div
        style={{
          position: 'absolute',
          left: 160,
          top: 52,
          width: 540,
          textAlign: 'center',
          fontFamily: font,
          color: '#fff',
          opacity: clamp(labelT * 3),
        }}
      >
        <div style={{fontSize: 46, fontWeight: 800, letterSpacing: '0.04em', lineHeight: 1.2, textShadow: i === 2 && heat > 0.5 ? `0 0 ${30 * heat}px rgba(255,46,42,${0.55 * heat})` : undefined}}>
          <span style={{color: labelColor, fontVariantNumeric: 'tabular-nums'}}>{labelN}%</span> SỐ NGƯỜI
        </div>
        <div style={{marginTop: 10, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 16, opacity: hudO}}>{hud}</div>
      </div>

      {/* nhãn tâm lý */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          width: 1080,
          top: 498,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 18,
          fontFamily: font,
          opacity: tagT,
          transform: `translateY(${(1 - tagT) * 16}px)`,
        }}
      >
        <span
          style={{
            fontSize: 19,
            fontWeight: 800,
            letterSpacing: '0.26em',
            padding: '9px 14px 9px 18px',
            borderRadius: 4,
            color: tagRed ? '#fff' : '#d0d0d0',
            background: tagRed ? RED : 'transparent',
            border: tagRed ? `1.5px solid ${RED}` : '1.5px solid #5a5a5a',
            boxShadow: tagRed ? '0 0 34px rgba(255,46,42,0.55)' : undefined,
          }}
        >
          {tag.main}
        </span>
        <span style={{fontSize: 22, fontWeight: 500, color: tagRed ? '#ffffff' : '#9b9b9b', letterSpacing: '0.01em'}}>{tag.sub}</span>
      </div>
    </div>
  );
};
