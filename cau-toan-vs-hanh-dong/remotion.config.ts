import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setAudioCodec('aac');
Config.setAudioBitrate('320k');
Config.setConcurrency(4);
Config.setChromiumOpenGlRenderer('angle');
Config.setDelayRenderTimeoutInMilliseconds(180000);
// Dùng Chromium cài sẵn trong môi trường (bỏ dòng này nếu máy bạn cho phép Remotion tự tải).
if (require('fs').existsSync('/opt/pw-browsers/chromium')) {
  Config.setBrowserExecutable('/opt/pw-browsers/chromium');
}
