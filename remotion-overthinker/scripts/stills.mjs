// Render preview stills: node scripts/stills.mjs <outDir> <scale> frame1 frame2 ...
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';

const [outDir, scale, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browserExecutable = process.env.REMOTION_BROWSER ?? null;
const composition = await selectComposition({serveUrl, id: 'Overthinker', browserExecutable});
for (const f of frames) {
  await renderStill({composition, serveUrl, frame: Number(f), output: path.join(outDir, `s_${f}.png`), scale: Number(scale), browserExecutable});
  console.log('still', f);
}
