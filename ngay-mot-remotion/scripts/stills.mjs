// Render several QA stills with one bundle:  node scripts/stills.mjs outDir 40 300 ...
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';

const [outDir, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browserExecutable = process.env.REMOTION_CHROME || null;
const composition = await selectComposition({serveUrl, id: 'NgayMot', browserExecutable});
for (const fr of frames) {
  await renderStill({composition, serveUrl, frame: Number(fr), output: path.join(outDir, `f${fr.padStart(4, '0')}.png`), scale: 0.5, browserExecutable});
  console.log('still', fr);
}
