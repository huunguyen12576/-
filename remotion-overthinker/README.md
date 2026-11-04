# Cùng một tin nhắn. Hai đêm khác nhau.

Phim ngắn 9:16 (1080×1920, 30fps, 33s) dựng bằng **Remotion + React**, tái dựng từ concept video tham chiếu
"Overthinker vs Chill" và nâng cấp lên chuẩn điện ảnh. Toàn bộ hình ảnh vẽ bằng SVG/CSS, không dùng video gốc.

## Cấu trúc nhịp kể (cognitive storytelling)

| Thời gian | Nhịp | Ý đồ |
|---|---|---|
| 0–1.3s | **Hook**: rung máy, cận cảnh thông báo "Sếp: Mai mình nói chuyện chút nhé?" | Tin nhắn mơ hồ = vùng trống thông tin, não tự lấp |
| 1.3–5s | Thẻ thông báo **tách đôi** về hai giường, camera kéo ra | "Cùng một tin nhắn" được *thấy*, không cần nói |
| 3–6s | Người thảnh thơi trả lời "Dạ, ok anh ạ", úp máy, ngủ | Đối chứng |
| 6.5–15.7s | **Vòng xoáy**: đồng hồ nhảy 00:19 → 05:49, bong bóng suy nghĩ chồng lên che cả cửa sổ, tim đập nhanh dần, camera dồn ép | Escalation: từ lo lắng hợp lý → thảm hoạ phi lý ("Học câu cá.") |
| 15.7s | Báo thức 07:00 — bình minh, bong bóng sụp đổ theo trọng lực | Giải toả |
| 18s | Tin nhắn thứ hai: "Chỉ muốn khen em: làm tốt lắm :)" | Twist |
| 20–23.5s | Rơi điện thoại, rồi... "Sao lại có ':)' ??" | Chu kỳ lặp lại — đúng bản chất overthinking |
| 24.5–33s | Outro: 6 chữ được đếm ↔ cả đêm suy nghĩ bủa vây → thông điệp | **Đừng viết hộ người khác cái kết tệ nhất.** |

## Âm thanh
`scripts/make_audio.py` **tự tổng hợp 100% từ toán học** (không dùng sample) → sở hữu hoàn toàn, dùng thương mại an toàn.
Mọi cue (rung, ting, nhịp tim, tick đồng hồ, chim hót, báo thức, cú rơi, nốt piano cho từng chữ...) đồng bộ
khung hình từ cùng một nguồn `src/timeline.json` mà video dùng.

## Chạy
```bash
npm install
npm run audio      # tạo public/audio/soundtrack.wav
npm run studio     # xem/chỉnh trong Remotion Studio
npm run render     # xuất out/cung-mot-tin-nhan.mp4
```
Nếu không tải được Chrome Headless Shell, đặt `REMOTION_BROWSER=/đường/dẫn/chrome-headless-shell`.

## Cấu trúc
- `src/timeline.json` – nguồn sự thật duy nhất cho thời điểm hình & tiếng
- `src/anim.ts` – spring keyframes liên tục (không giật khi đổi tư thế), noise cho rung tay/run rẩy
- `src/components/Figure.tsx` – nhân vật trắng tham số hoá, các tư thế nội suy vật lý
- `src/components/Room.tsx` – phòng 2.5D: trời đêm → bình minh, skyline tắt đèn dần, tia nắng + bụi
- `src/components/UI.tsx` – thông báo, đồng hồ LED cuộn số, bong bóng suy nghĩ, typography động
- `src/Overthinker.tsx` – đạo diễn: camera, ánh sáng, grade, outro
- Font: Montserrat (`@fontsource/montserrat`, có subset tiếng Việt, SIL OFL)
