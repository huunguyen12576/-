// Xuất danh sách sự kiện âm thanh từ chính timeline của hình ảnh → âm thanh khớp từng frame.
import {writeFileSync} from 'node:fs';
import {audioEvents, DURATION, FPS} from '../src/timeline.ts';

const events = audioEvents();
writeFileSync(new URL('../build/events.json', import.meta.url), JSON.stringify({fps: FPS, duration: DURATION / FPS, events}, null, 1));
console.log(`events: ${events.length}`);
