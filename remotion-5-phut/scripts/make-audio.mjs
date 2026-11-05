// Procedural soundtrack + SFX, synthesized from scratch (100% original → free for commercial use).
// Every cue is read from src/timeline.json so sound stays frame-locked to the picture.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const T = JSON.parse(fs.readFileSync(path.join(root, 'src/timeline.json'), 'utf8'));
const SR = 48000;
const DUR = T.total / T.fps;
const N = Math.ceil(SR * DUR);
const L = new Float32Array(N);
const Rr = new Float32Array(N);
const fr = (f) => f / T.fps; // frame -> seconds

// deterministic noise
let seed = 1234567;
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2147483648 - 1;
};

const put = (i, v, pan = 0) => {
  if (i < 0 || i >= N) return;
  const a = (pan + 1) * Math.PI / 4;
  L[i] += v * Math.cos(a);
  Rr[i] += v * Math.sin(a);
};

// one-pole filters
const lp = (c) => { let y = 0; return (x) => (y += c * (x - y)); };
const hp = (c) => { let y = 0, px = 0; return (x) => { y = c * (y + x - px); px = x; return y; }; };

// ------------------------------------------------------------------ instruments
const tone = (t0, dur, freq, gain, {pan = 0, type = 'sine', attack = 0.005, decay = null, glide = 0, cut = 1} = {}) => {
  const s0 = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  const f = lp(cut);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const fq = freq * (1 + glide * (t / dur));
    ph += (2 * Math.PI * fq) / SR;
    let v;
    if (type === 'square') v = Math.sign(Math.sin(ph)) * 0.6;
    else if (type === 'saw') v = ((ph / Math.PI) % 2) - 1;
    else if (type === 'tri') v = (2 / Math.PI) * Math.asin(Math.sin(ph));
    else v = Math.sin(ph);
    const env = Math.min(1, t / attack) * (decay ? Math.exp(-t / decay) : Math.min(1, (dur - t) / 0.02));
    put(s0 + i, f(v) * env * gain, pan);
  }
};

const noiseBurst = (t0, dur, gain, {pan = 0, lpC = 0.3, hpC = 0.0, decay = 0.05, attack = 0.001, sweep = null} = {}) => {
  const s0 = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  let fl = lp(lpC);
  const fh = hp(hpC || 0.0001);
  let y = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let c = lpC;
    if (sweep) c = sweep(t / dur);
    y += c * (noise() - y);
    let v = hpC ? fh(y) : y;
    const env = Math.min(1, t / attack) * (decay ? Math.exp(-t / decay) : Math.min(1, (dur - t) / 0.05));
    put(s0 + i, v * env * gain, pan);
  }
  void fl;
};

// soft electric-piano-like pluck
const pluck = (t0, freq, gain, pan = 0, decay = 1.2) => {
  tone(t0, decay * 3, freq, gain, {pan, decay, attack: 0.004});
  tone(t0, decay * 2, freq * 2, gain * 0.35, {pan, decay: decay * 0.5, attack: 0.004});
  tone(t0, decay, freq * 3.01, gain * 0.12, {pan, decay: decay * 0.25, attack: 0.002});
};

// lush pad: detuned saws through a low-pass, slow swell
const pad = (t0, dur, freqs, gain, {attack = 0.8, release = 1.0, cut = 0.02, pan = 0} = {}) => {
  const s0 = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  freqs.forEach((fq, k) => {
    [-1, 1].forEach((d) => {
      const f = lp(cut);
      const f2 = lp(cut);
      let ph = (noise() + 1) * 3;
      for (let i = 0; i < n; i++) {
        const t = i / SR;
        ph += (2 * Math.PI * fq * (1 + d * 0.004)) / SR;
        const v = ((ph / Math.PI) % 2) - 1;
        const env = Math.min(1, t / attack) * Math.min(1, (dur - t) / release);
        put(s0 + i, f2(f(v)) * env * gain, pan + d * 0.35 * (k % 2 ? 1 : -1));
      }
    });
  });
};

const N2F = (n) => 440 * Math.pow(2, (n - 69) / 12);

// ------------------------------------------------------------------ SFX
const alarmBeep = (t0, gain = 0.22, pan = 0, muffle = 1) => {
  for (let k = 0; k < 3; k++) tone(t0 + k * 0.075, 0.05, 2093, gain, {type: 'square', pan, cut: muffle});
};
const click = (t0, gain = 0.25, pan = 0) => {
  noiseBurst(t0, 0.03, gain, {pan, lpC: 0.9, hpC: 0.6, decay: 0.006});
  tone(t0, 0.04, 2400, gain * 0.3, {pan, decay: 0.01});
};
const thud = (t0, gain = 0.45, pan = 0) => {
  tone(t0, 0.3, 70, gain, {pan, decay: 0.09, glide: -0.4});
  noiseBurst(t0, 0.08, gain * 0.3, {pan, lpC: 0.08, decay: 0.03});
};
const step = (t0, gain = 0.18, pan = 0, bright = 0.25) => {
  noiseBurst(t0, 0.07, gain, {pan, lpC: bright, hpC: 0.9, decay: 0.022});
  tone(t0, 0.08, 110, gain * 0.6, {pan, decay: 0.03});
};
const whoosh = (t0, dur, gain = 0.3, pan = 0) =>
  noiseBurst(t0, dur, gain, {pan, decay: 0, attack: dur * 0.5, sweep: (p) => 0.02 + 0.25 * Math.sin(p * Math.PI)});
const tick = (t0, gain = 0.08, pan = 0) => {
  noiseBurst(t0, 0.02, gain, {pan, lpC: 0.95, hpC: 0.7, decay: 0.004});
  tone(t0, 0.03, 3200, gain * 0.25, {pan, decay: 0.006});
};
const shimmer = (t0, gain = 0.12, pan = 0) => {
  [72, 76, 79, 84, 88, 91].forEach((n, i) => tone(t0 + i * 0.04, 2.6, N2F(n), gain * (1 - i * 0.1), {pan: pan + (i % 2 ? 0.3 : -0.3), decay: 0.9, attack: 0.01}));
};
const riser = (t0, dur, gain = 0.2) => {
  tone(t0, dur, 180, gain * 0.5, {type: 'saw', attack: dur * 0.9, glide: 3, cut: 0.05});
  noiseBurst(t0, dur, gain * 0.8, {decay: 0, attack: dur * 0.95, sweep: (p) => 0.01 + p * 0.5});
};
const impact = (t0, gain = 0.6) => {
  tone(t0, 1.6, 48, gain, {decay: 0.45, glide: -0.3});
  noiseBurst(t0, 1.2, gain * 0.35, {lpC: 0.15, decay: 0.25});
};
const sting = (t0, gain = 0.35, pan = 0) => {
  [N2F(70), N2F(71), N2F(77)].forEach((f) => tone(t0, 0.5, f, gain / 3, {type: 'saw', pan, decay: 0.16, cut: 0.25}));
  thud(t0, gain, pan);
};

// ================================================================== CUE SHEET
const TOP = -0.35; // the disciplined morning sits slightly left
const BOT = 0.35; // the snoozed morning slightly right

// HOOK — alarm in the dark
[0, 6, 12, 20, 26, 32].forEach((f) => alarmBeep(fr(f), 0.2));
whoosh(fr(26), 0.6, 0.25);
thud(fr(36), 0.35);
noiseBurst(fr(32), 0.5, 0.12, {lpC: 0.9, hpC: 0.8, decay: 0.15}); // the line "cuts" open

// SPLIT — clock ticks (tension metronome), heartbeat-like sub pulse
for (let f = T.split[0]; f < T.split[1] - 4; f += 15) tick(fr(f), 0.07 + 0.05 * ((f - T.split[0]) / 360));
for (let f = T.split[0]; f < T.split[1] - 4; f += 30) tone(fr(f), 0.25, 55, 0.18 + 0.1 * ((f - T.split[0]) / 360), {decay: 0.1});

// harmonic bed: hopeful (top) and uneasy (bottom) layered, building
pad(fr(45), fr(360) + 0.5, [N2F(45), N2F(52), N2F(57), N2F(64)], 0.035, {attack: 2, release: 0.4, pan: 0});
pad(fr(236), fr(170), [N2F(46), N2F(53)], 0.03, {attack: 1.2, release: 0.3, cut: 0.03, pan: BOT}); // tense semitone rub after "late"

// top-panel events
const t = T.top;
[45, 51].forEach((f) => alarmBeep(fr(f), 0.12, TOP));
click(fr(t.alarmOff), 0.3, TOP);
tone(fr(t.alarmOff + 2), 0.6, N2F(76), 0.06, {pan: TOP, decay: 0.3}); // little "ding" — light switches on
noiseBurst(fr(t.sitUp[0]), 0.5, 0.06, {pan: TOP, lpC: 0.05, decay: 0}); // sheets rustle
t.pushupDown.forEach((f) => { thud(fr(f), 0.3, TOP); noiseBurst(fr(f + 4), 0.25, 0.05, {pan: TOP, lpC: 0.2, decay: 0.08}); });
for (let f = t.walkKitchen[0] + 3; f < t.walkKitchen[1]; f += 9) step(fr(f), 0.12, TOP);
click(fr(t.cook[0] + 2), 0.15, TOP); // stove knob
tone(fr(t.cook[0] + 3), 0.4, 600, 0.03, {pan: TOP, decay: 0.15, type: 'tri'});
noiseBurst(fr(t.eggCrack), 0.05, 0.25, {pan: TOP, lpC: 0.5, decay: 0.012}); // crack
// sizzle
{
  const s0 = Math.floor(fr(t.eggCrack + 2) * SR), n = Math.floor(fr(t.cook[1] - t.eggCrack) * SR);
  const fh = hp(0.97);
  for (let i = 0; i < n; i++) {
    const env = Math.min(1, i / 2000) * Math.min(1, (n - i) / 8000);
    const pop = noise() > 0.995 ? 4 : 1;
    put(s0 + i, fh(noise()) * 0.05 * env * pop, TOP);
  }
}
whoosh(fr(t.flip - 2), 0.35, 0.18, TOP);
thud(fr(t.flip + 12), 0.15, TOP);
for (let f = t.walkBath[0] + 2; f < t.walkBath[1]; f += 8) step(fr(f), 0.12, TOP);
whoosh(fr(t.walkBath[0]), 0.7, 0.12, TOP);
// shower water
{
  const s0 = Math.floor(fr(t.shower[0] + 2) * SR), n = Math.floor(fr(t.shower[1] - t.shower[0] - 4) * SR);
  const fl = lp(0.35), fh = hp(0.9);
  for (let i = 0; i < n; i++) {
    const env = Math.min(1, i / 6000) * Math.min(1, (n - i) / 6000);
    put(s0 + i, fh(fl(noise())) * 0.16 * env, TOP + Math.sin(i / 9000) * 0.1);
  }
}
for (let f = t.walkDoor[0] + 2; f < t.walkDoor[1]; f += 9) step(fr(f), 0.12, TOP);
whoosh(fr(t.walkDoor[0]), 0.7, 0.12, TOP);
for (let f = t.ready[0] + 12; f < t.doorOpen; f += 9) step(fr(f), 0.11, TOP);
click(fr(t.doorOpen - 1), 0.2, TOP); // latch
tone(fr(t.doorOpen), 0.7, 240, 0.05, {pan: TOP, type: 'tri', glide: 0.25, decay: 0.35}); // hinge
shimmer(fr(t.doorOpen + 2), 0.07, TOP);

// bottom-panel events
const b = T.bot;
b.ring.forEach(([a, e]) => { for (let f = a; f < e; f += 6) alarmBeep(fr(f), 0.11, BOT, 0.35); });
b.snooze.forEach((f) => { click(fr(f), 0.22, BOT); tone(fr(f + 2), 0.7, 140, 0.05, {pan: BOT, decay: 0.25, glide: -0.2}); }); // dull "mm" groan
sting(fr(b.late), 0.4, BOT);
[b.late - 2, b.late + 4].forEach((f) => alarmBeep(fr(f), 0.18, BOT, 0.7));
noiseBurst(fr(b.late + 3), 0.4, 0.14, {pan: BOT, lpC: 0.12, decay: 0.12}); // blanket thrown
const runSteps = (a, e) => { for (let f = a + 2; f < e; f += 5) step(fr(f), 0.13, BOT, 0.35); };
runSteps(b.getUp[1] - 4, b.runKitchen[1]);
noiseBurst(fr(b.grab[0] + 4), 0.15, 0.12, {pan: BOT, lpC: 0.4, decay: 0.04}); // paper bag grab
noiseBurst(fr(b.grab[1] - 2), 0.12, 0.1, {pan: BOT, lpC: 0.6, decay: 0.03}); // crunch
runSteps(b.runBath[0], b.runBath[1]);
noiseBurst(fr(b.noShower[0] + 8), 0.35, 0.08, {pan: BOT, lpC: 0.25, hpC: 0.95, decay: 0.12}); // sniff
tone(fr(b.noShower[0] + 14), 0.5, 220, 0.06, {pan: BOT, type: 'tri', glide: -0.35, decay: 0.2}); // "ugh" wobble
runSteps(b.runDoor[0], b.runDoor[1]);
for (let f = b.runDoor[1]; f < b.doorOpen + 6; f += 12) noiseBurst(fr(f), 0.18, 0.05, {pan: BOT, lpC: 0.3, hpC: 0.9, decay: 0.08}); // panting
click(fr(b.doorOpen - 1), 0.18, BOT);

// FLASH — riser into impact + bright chord
riser(fr(340), fr(T.flash[0] + 6 - 340), 0.16);
impact(fr(T.flash[0] + 6), 0.55);
shimmer(fr(T.flash[0] + 6), 0.09, 0);
tick(fr(T.split[1] - 5), 0.2); // the clock hits 5:00

// STREET — hopeful theme: Fmaj7 · C/E · Am7 · G(sus)  @ 96 bpm
const bpm = 96, beat = 60 / bpm;
const tS = fr(T.flash[0] + 8);
const chords = [
  [N2F(41), [65, 69, 72, 76]],
  [N2F(40), [64, 67, 72, 76]],
  [N2F(45), [64, 67, 69, 72]],
  [N2F(43), [62, 67, 71, 74]],
  [N2F(41), [65, 69, 72, 77]],
];
chords.forEach(([bass, notes], i) => {
  const t0 = tS + i * beat * 4;
  const last = i === chords.length - 1;
  const len = last ? DUR - t0 : beat * 4 + 0.6;
  pad(t0, len, notes.map(N2F), 0.022, {attack: 0.25, release: last ? 1.6 : 0.5, cut: 0.04});
  tone(t0, len, bass, 0.12, {attack: 0.05, decay: last ? 2.5 : 1.8});
  // arpeggio plucks (top melody)
  if (!last) [0, 1, 2, 3, 2, 1, 3, 2].forEach((k, j) => pluck(t0 + j * beat * 0.5, N2F(notes[k] + 12), 0.04, (j % 2 ? 0.25 : -0.25), 0.5));
});
// melody line, simple and singable
[[0, 76], [1.5, 77], [2, 79], [4, 79], [5.5, 77], [6, 76], [8, 72], [9.5, 74], [10, 76], [12, 74], [14, 71], [16, 72]].forEach(([bt, n]) =>
  pluck(tS + bt * beat, N2F(n), 0.07, 0, 0.9));

// footsteps: confident (crisp, regular) vs dragging (soft, slow)
{
  const lf0 = T.street[0];
  for (let f = T.flash[0] + 14; f < T.total - 20; f++) {
    const lf = f - lf0;
    const camX = lf * 7.2;
    const prevX = (lf - 1) * 7.2;
    if (Math.floor(camX / 92) !== Math.floor(prevX / 92)) step(fr(f), 0.1, 0.15, 0.4);
  }
  let gx = 0;
  for (let f = T.flash[0] + 14; f < T.total - 20; f++) {
    const lf = f - lf0;
    const k = Math.min(1, Math.max(0, (f - lf0) / (T.end[0] + 40 - lf0)));
    const sp = 7.2 * (0.93 + (0.8 - 0.93) * k);
    const nx = gx + sp;
    if (Math.floor(nx / 80) !== Math.floor(gx / 80) && lf > 0) noiseBurst(fr(f), 0.16, 0.05, {pan: -0.35, lpC: 0.08, decay: 0.06}); // scuff
    gx = nx;
  }
}
// titles
whoosh(fr(T.flash[0] + 12), 0.5, 0.08);
whoosh(fr(444), 0.5, 0.08);
shimmer(fr(446), 0.04);
// ending message
whoosh(fr(T.end[0] + 10), 0.8, 0.07);
shimmer(fr(T.end[0] + 48), 0.05);
// coda: the alarm returns (loop)
alarmBeep(fr(T.total - 12), 0.14);

// ------------------------------------------------------------------ master: soft-clip, simple reverb, fade
const rev = (buf, pre) => {
  const out = new Float32Array(N);
  const taps = [[0.029, 0.35], [0.043, 0.3], [0.061, 0.25], [0.089, 0.2], [0.127, 0.15], [0.171, 0.1]];
  for (let i = 0; i < N; i++) {
    let v = 0;
    for (const [d, g] of taps) {
      const j = i - Math.floor((d + pre) * SR);
      if (j >= 0) v += (buf[j] + out[j] * 0.35) * g;
    }
    out[i] = v * 0.5;
  }
  return out;
};
const rL = rev(L, 0), rR = rev(Rr, 0.007);
let peak = 0;
for (let i = 0; i < N; i++) {
  L[i] += rL[i] * 0.45;
  Rr[i] += rR[i] * 0.45;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(Rr[i]));
}
const norm = 0.92 / Math.max(peak, 1e-6);
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8);
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
const sat = (x) => Math.tanh(x * 1.2) / Math.tanh(1.2);
for (let i = 0; i < N; i++) {
  const fade = Math.min(1, (N - i) / (SR * 0.05));
  buf.writeInt16LE(Math.round(sat(L[i] * norm) * fade * 32000), 44 + i * 4);
  buf.writeInt16LE(Math.round(sat(Rr[i] * norm) * fade * 32000), 46 + i * 4);
}
const outPath = path.join(root, 'public/audio/soundtrack.wav');
fs.mkdirSync(path.dirname(outPath), {recursive: true});
fs.writeFileSync(outPath, buf);
console.log(`soundtrack.wav  ${DUR.toFixed(2)}s  peak-normalised x${norm.toFixed(2)}`);
