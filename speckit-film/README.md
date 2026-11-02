# Spec Kit — phim giải thích 9:16 (Remotion)

Video dọc 1080×1920, 30 fps, dài 80 giây, giải thích **GitHub Spec Kit**. Thuyết minh tiếng Việt (Gemini TTS, giọng Charon), phụ đề in sẵn trên hình và file SRT riêng.

**Ý tưởng chính:** *Spec trước. Code sau.* Tòa tháp code sụp ở màn mở đầu được dựng lại ở màn kết, lần này theo một bản thiết kế.

## Giao nộp (`out/`)

| File | Nội dung |
| --- | --- |
| `speckit-film.mp4` | Bản cuối: H.264 1080×1920, AAC 320k, −14 LUFS, true peak −1.5 dBTP |
| `speckit-film.vi.srt` | Phụ đề tiếng Việt, 34 dòng |
| `audio-master.flac` | Bản mix cuối (giọng + nhạc + SFX) |
| `audio-voice.flac` / `audio-music.flac` / `audio-sfx.flac` | Các stem tách riêng |
| `voiceover-script.txt` | Lời thoại |

## Cấu trúc

1. **Hook (0–4.7s):** gõ một prompt mơ hồ, nhấn Enter, rồi "cầu nguyện".
2. **Sụp đổ (4.7–10.9s):** tòa tháp code chồng lên, báo lỗi rồi sụp đổ. Hiện chữ "VIBE CODING" với hiệu ứng glitch.
3. **Hé lộ (10.9–15.2s):** khung hình đen tách ra thành một vệt sáng, nền đổi sang giấy kẻ blueprint, hiện tên Spec Kit.
4. **Ý tưởng (15.2–22.1s):** `spec.md` tự viết dần ra, còn khung code bị khóa.
5. **4 bước (22.1–30.8s):** Hiểu → Hỏi → Tổ chức → Lập trình. Bước cuối mới mở khóa.
6. **6 lệnh (30.8–48.3s):** `/speckit.constitution` → `specify` → `clarify` → `plan` → `tasks` → `implement`.
7. **Kết quả (48.3–55.4s):** các chấm hỗn loạn xếp lại thành lưới. Chỉ là hình minh họa định tính, không có số liệu bịa.
8. **Agent (55.4–63.2s):** 5 agent được nêu tên, sau đó là "bức tường" 40+ tích hợp.
9. **Số liệu (63.2–69.7s):** 145K+ sao, 13K+ fork, giấy phép MIT.
10. **Insight + CTA (69.7–80s):** tòa tháp được vẽ lại trên blueprint, mỗi tầng là một artifact của Spec Kit.

## Kiểm chứng dữ liệu (ngày 02/11/2026)

- Sao và fork lấy từ GitHub API `repos/github/spec-kit`: **145.306 sao, 13.025 fork, giấy phép MIT**, repo tạo ngày 21/08/2025. Nội dung gốc ghi "120K sao / 10K fork". Video dùng số liệu hiện tại ("hơn 145 nghìn sao, hơn 13 nghìn fork") và ghi nguồn ngay trên hình.
- Tên lệnh lấy từ `docs/reference/agentic-sdd.md` của repo. Cú pháp thật là `/speckit.<lệnh>`, nên trên hình hiển thị đầy đủ tiền tố `speckit.`.
- Danh sách agent lấy từ `docs/integrations/index.md`: có 41 tích hợp có tên, không tính "None" và "Generic". Vì vậy video nói "hơn bốn mươi agent" chứ không dùng con số "25" như nội dung gốc.
- Câu "ngay lập tức vượt 120K sao" không được giữ lại, vì repo đã ra đời từ 08/2025, không phải mới ra mắt.

## Bản quyền tài nguyên

| Tài nguyên | Nguồn | Giấy phép |
| --- | --- | --- |
| Nhạc nền | Tự tổng hợp bằng code (`scripts/audio.py`, numpy/scipy), không dùng sample bên ngoài | Tác phẩm gốc của dự án, dùng thương mại được |
| Hiệu ứng âm thanh | Tự tổng hợp trong cùng script | Như trên |
| Thuyết minh | Google Gemini TTS (`gemini-3.8-flash-tts`, giọng Charon), tạo bằng API key của người dùng | Theo [Điều khoản Gemini API](https://ai.google.dev/gemini-api/terms) |
| Font Be Vietnam Pro | `@fontsource/be-vietnam-pro` | SIL Open Font License 1.1 |
| Font JetBrains Mono | `@fontsource/jetbrains-mono` | SIL Open Font License 1.1 |
| Hình ảnh, icon, minh họa | Vẽ bằng React/SVG/CSS trong `src/` | Tác phẩm gốc |
| Remotion | `remotion` 4.0.290 | [Remotion License](https://www.remotion.dev/license): cá nhân hoặc công ty ≤ 3 người được dùng miễn phí. Công ty lớn hơn cần Company License |

Video không dùng logo hay nhãn hiệu dạng hình ảnh. Tên GitHub, Claude Code, Cursor, Copilot, Codex, Gemini CLI… chỉ xuất hiện dưới dạng chữ, để nêu thông tin.

## Dựng lại

```bash
npm install
# 1) Thuyết minh: đọc một lần, liền mạch, giọng Charon
GEMINI_API_KEY=... python3 scripts/tts.py gemini-3.8-flash-tts /tmp/vo_take.wav
#    Model TTS đọc luôn phần chỉ dẫn phong cách ở đầu, nên phải cắt bỏ đoạn đó,
#    rồi lưu thành public/audio/vo_raw.wav (bản giao nộp cắt tại 34.45s, sau đó bỏ khoảng lặng đầu).
# 2) Nhạc + SFX + mix (cần numpy, scipy, soundfile)
python3 scripts/audio.py .
ffmpeg -i public/audio/mix.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -c:a pcm_s24le public/audio/master.wav
# 3) Hình
npm run render          # -> out/speckit-film.mp4
node scripts/stills.mjs /tmp/qa 1.5 7.7 14.3   # ảnh tĩnh để duyệt
```

Mốc thời gian của lời thoại, phụ đề và cảnh nằm chung trong `src/timeline.json`. Cả phần hình (TS) và phần âm thanh (Python) đều đọc từ file này, nên hình, giọng, nhạc và SFX luôn khớp nhau.
