// Render QA stills at given seconds: node scripts/stills.mjs out_dir 1.2 5.0 ...
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
const [outDir, ...times] = process.argv.slice(2);
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id: 'SpecKitFilm'});
for (const s of times) {
  const frame = Math.round(parseFloat(s) * composition.fps);
  await renderStill({serveUrl, composition, frame, output: path.join(outDir, `f_${s.padStart(5, '0')}.jpg`), imageFormat: 'jpeg', scale: 0.5});
  console.log('ok', s);
}
