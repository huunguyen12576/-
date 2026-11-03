# ĐỪNG MÙ QUÁNG — Remotion short (9:16, 1080×1920, 30fps, 23s)

Phim ngắn dựng lại bằng code theo video tham chiếu: một đám đông bịt mắt đỏ diễu hành đều bước ra mép vực.
Một người tháo băng bịt mắt, thấy vực và cố chặn đám đông lại, nhưng bị chính đám đông đẩy rơi xuống.

**Kết quả:** `out/dung-mu-quang.mp4` (H.264 + AAC)

## Cấu trúc kịch bản
| Giây | Nhịp | Thủ pháp |
|---|---|---|
| 0–2.8 | **Hook**: cận cảnh mép vực, người rơi ngay frame đầu, tiếng sub-boom | camera kéo lùi hé lộ đám đông vô tận |
| 2.8–6.3 | Đám đông đều bước (lock-step), một người dần chậm lại | mọi bàn chân chạm đất cùng một nhịp trống |
| 6.3–8.7 | Tháo băng bịt mắt, **thức tỉnh** | âm thanh bị bóp nghẹt, tiếng ù tai, có cột sáng chiếu xuống |
| 7–8.5 | Nhìn thấy vực | dolly-zoom (kiểu Vertigo) |
| 8.5–14 | Quay lại chặn đám đông, bị đẩy từng nhịp | mỗi cú đẩy khớp với bước chân đám đông, nhịp tim tăng dần |
| 14–16.5 | Rơi | slow-motion 0.26×, sau đó là im lặng |
| 16.5–20 | Đám đông nối đuôi nhau rơi theo | dòng chữ "…TRẢ GIÁ." hiện lên đúng lúc đám đông phải trả giá |
| 20–23 | Kết | dải băng đỏ bị bỏ lại; "Đám đông không có mắt. / Bạn thì có." Dải băng che chữ rồi rơi xuống |

## Kỹ thuật
- `src/sim.ts`: thế giới tất định (mét/giây), time-warp slow-motion, camera spline có focal (dolly-zoom), phép chiếu phối cảnh 2.5D.
- `src/skeleton.ts`: khung xương người que, forward kinematics, chu kỳ đi bộ có chân bám đất tự nhiên.
- `src/world.ts`: đám đông nhiều lớp chiều sâu, chuỗi người đẩy (ràng buộc vật lý), rơi theo trọng lực, vải đỏ rơi có lực cản, đá vụn.
- `src/Scene.tsx`: khối đá 3D (vân gạch), sàn bóng phản chiếu, sương theo chiều sâu, bloom, cột sáng, motion trail, grain, vignette.
- `src/Typography.tsx`: Montserrat (variable, đủ subset tiếng Việt, đóng gói local).
- Âm thanh: `scripts/make_audio.py` **tự tổng hợp 100%** (không dùng sample bên thứ ba), nên dùng thương mại an toàn.
  Mọi SFX được đặt theo `out/events.json` xuất từ chính mô phỏng, nên khớp từng bước chân, cú đẩy, cú rơi.

## Chạy
```bash
npm install
npm run audio      # xuất sự kiện + tổng hợp soundtrack.wav (cần python3 + numpy)
npm run studio     # xem trước
npm run render     # -> out/dung-mu-quang.mp4
```
