import React from 'react';
import { useCurrentFrame } from 'remotion';
import { G, K, clamp, easeIn, easeOut, range, smooth } from './sim';

const FONT = "'Montserrat', sans-serif";

type Word = { t: string; red?: boolean };

/** Word-by-word reveal: rises, de-blurs and tightens its tracking. */
const Line: React.FC<{ words: Word[]; start: number; size: number; weight: number; f: number; gap?: number; tracking?: number }> = ({
  words, start, size, weight, f, gap = 4, tracking = 0.08,
}) => (
  <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', columnGap: size * 0.32 }}>
    {words.map((w, i) => {
      const u = easeOut(range(f, start + i * gap, start + i * gap + 14));
      return (
        <span
          key={i}
          style={{
            fontFamily: FONT,
            fontWeight: weight,
            fontSize: size,
            lineHeight: 1.45,
            letterSpacing: `${tracking + (1 - u) * 0.25}em`,
            color: w.red ? '#ff2b36' : '#f5f5f5',
            opacity: u,
            transform: `translateY(${(1 - u) * 22}px)`,
            filter: `blur(${(1 - u) * 10}px)`,
            textShadow: w.red ? '0 0 26px rgba(255,40,50,0.55)' : '0 0 22px rgba(255,255,255,0.18)',
            whiteSpace: 'pre',
          }}
        >
          {w.t}
        </span>
      );
    })}
  </div>
);

const words = (s: string, redFrom = Infinity): Word[] => s.split(' ').map((t, i) => ({ t, red: i >= redFrom }));

export const Typography: React.FC = () => {
  const f = useCurrentFrame();
  const out = 1 - smooth(range(f, K.dimStart + 16, K.dimEnd - 6));

  // end card: the last line is "blindfolded" by a red band that slips off
  const bandT = Math.max(0, (f - K.bandDrop) / 30);
  const bandY = 0.5 * G * 120 * bandT * bandT + 30 * bandT;
  const bandRot = 26 * bandT * bandT + 8 * bandT;
  const bandIn = easeOut(range(f, K.card2 - 2, K.card2 + 10));
  const bandOpacity = bandIn * (1 - smooth(range(f, K.bandDrop + 12, K.bandDrop + 26)));
  const reveal = smooth(range(f, K.bandDrop + 2, K.bandDrop + 14));
  const finalOut = 1 - smooth(range(f, K.end - 8, K.end));

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* in-story lines (top negative space, like the reference) */}
      <div style={{ position: 'absolute', top: 250, left: 60, right: 60, opacity: out, textAlign: 'center' }}>
        <Line words={words('ĐỪNG MÙ QUÁNG ĐI THEO.')} start={K.line1} size={52} weight={800} f={f} />
        <div style={{ height: 6 }} />
        <Line words={words('NẾU KHÔNG, BẠN SẼ PHẢI TRẢ GIÁ.', 5)} start={K.line2} size={36} weight={600} f={f} gap={5} tracking={0.1} />
      </div>

      {/* end card */}
      {f >= K.card1 - 2 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: finalOut }}>
          <Line words={words('Đám đông không có mắt.')} start={K.card1} size={58} weight={300} f={f} gap={3} tracking={0.02} />
          <div style={{ height: 40 }} />
          <div style={{ position: 'relative' }}>
            <div style={{ opacity: clamp(range(f, K.card2, K.card2 + 6)), filter: `brightness(${0.35 + 0.65 * reveal})` }}>
              <Line words={[{ t: 'Bạn' }, { t: 'thì' }, { t: 'có.', red: reveal > 0.5 }]} start={K.card2} size={112} weight={800} f={f} gap={0} tracking={0.0} />
            </div>
            {bandOpacity > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: -46,
                  right: -46,
                  top: '50%',
                  height: 66,
                  marginTop: -44,
                  background: 'linear-gradient(180deg,#ff3a44 0%,#e2242c 45%,#a8141b 100%)',
                  borderRadius: 10,
                  boxShadow: '0 18px 40px rgba(0,0,0,0.6), 0 0 40px rgba(255,40,50,0.35)',
                  transformOrigin: '85% 50%',
                  transform: `translateY(${bandY}px) rotate(${bandRot}deg) scaleX(${bandIn})`,
                  opacity: bandOpacity,
                }}
              />
            )}
          </div>
          <div style={{ height: 90 }} />
          <div
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 500,
              fontSize: 24,
              letterSpacing: '0.42em',
              color: 'rgba(255,255,255,0.5)',
              opacity: easeIn(range(f, K.bandDrop + 10, K.bandDrop + 26)),
            }}
          >
            HÃY MỞ MẮT
          </div>
        </div>
      )}
    </div>
  );
};
