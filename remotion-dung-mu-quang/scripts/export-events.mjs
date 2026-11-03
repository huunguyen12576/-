// Exports every sound-relevant event of the simulation, so audio is frame-synced to motion.
import { writeFileSync } from 'node:fs';
import * as S from '../src/sim.ts';

const { DURATION, K, crowdPhase, tau, speedAt, SHOVES, FOLLOWERS, AHEAD_BASE, WALKERS, EDGE, V } = S;
const steps = [];
for (let f = 1; f < DURATION; f++) {
  if (Math.floor(crowdPhase(f) * 2) !== Math.floor(crowdPhase(f - 1) * 2)) steps.push(f);
}
// tau → frame lookup
const frameOfTau = (t) => {
  for (let f = -150; f < DURATION; f++) if (tau(f) >= t) return f;
  return Infinity;
};
const falls = [];
for (const w of WALKERS) falls.push({ f: frameOfTau((EDGE - w.base) / V), z: w.z });
for (const b of AHEAD_BASE) falls.push({ f: frameOfTau((EDGE - b) / V), z: 0 });
for (const fl of FOLLOWERS) if (fl.fc !== Infinity) falls.push({ f: fl.fc, z: 0 });
const contacts = FOLLOWERS.map((fl) => fl.contact).filter((c) => c !== Infinity && c < K.fall);
const speed = Array.from({ length: DURATION }, (_, f) => speedAt(f));
const data = {
  fps: S.FPS, duration: DURATION, K, steps, shoves: SHOVES, contacts, speed,
  falls: falls.filter((e) => e.f >= -30 && e.f < DURATION).sort((a, b) => a.f - b.f),
};
writeFileSync(new URL('../out/events.json', import.meta.url), JSON.stringify(data));
console.log('steps', steps.length, 'falls', data.falls.length, 'contacts', contacts);
