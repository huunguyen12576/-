# CẦU TOÀN vs HÀNH ĐỘNG — Remotion short (9:16)

Phim ngắn 30 giây, 1080×1920, 30 fps, dựng lại từ video tham chiếu "93% / 6% / 1% of people"
(3 sân bóng rổ) bằng **Remotion + React + SVG 2.5D**. Video gốc không được dùng làm nền,
mọi hình ảnh và âm thanh đều sinh bằng code.

**File thành phẩm:** `out/cau-toan-vs-hanh-dong.mp4` (H.264 CRF 16 + AAC 320k)

## Chạy

```bash
npm install
npm run studio          # xem & chỉnh trong Remotion Studio
npm run audio           # sinh lại build/events.json + public/audio.wav (cần python3 + numpy)
npm run render          # audio + render MP4 ra out/
```

`remotion.config.ts` dùng Chromium có sẵn tại `/opt/pw-browsers/chromium` nếu tồn tại; trên máy khác Remotion tự tải trình duyệt.

## Kịch bản (storyboard)

| Thời gian | Cảnh | Ý đồ tâm lý / thị giác |
|---|---|---|
| 0:00–0:02 | **Móc mở đầu**: quả bóng đỏ rơi từ trên xuống, đập xuống sàn, sàn loé sóng. Chữ "BẠN LÀ AI / TRONG **3** NGƯỜI NÀY?" đập xuống đúng nhịp bóng nảy. | Chuyển động ngay frame đầu (bắt mắt) và một câu hỏi về chính người xem (hiệu ứng tự liên hệ, khoảng trống tò mò). |
| 0:02–0:04 | **Lộ diện bố cục 3 sân**: vạch sân tự vẽ, rổ bật lên, số % đếm lên. Cả ba nhân vật đều trắng, đều dẫn bóng. | Ai cũng bắt đầu giống nhau. |
| 0:04–0:08 | **93%**: camera đẩy vào. Nhân vật dẫn bóng, hai lần nâng bóng lên tư thế ném rồi… hạ xuống (kèm nhịp tim). Bộ đếm "CHUẨN BỊ … NGÀY" chạy, "NÉM 0" đứng yên. Nhãn: **CẦU TOÀN — Chuẩn bị mãi. Chưa từng ném.** | Show, don't tell: sự do dự hiện ra qua chuyển động. |
| 0:08–0:13 | **6%**: ném một lần, bóng đập vành sau văng khỏi khung hình, nhân vật ôm mặt, cơ thể tắt màu dần. Nhãn: **CẦU TOÀN — Trượt một lần. Bỏ cuộc mãi mãi.** | Mặt thứ hai của cầu toàn: kiểu tư duy "được ăn cả, ngã về không". |
| 0:13–0:23 | **1%**: trượt, trượt, trượt… rồi một đoạn ném dồn dập có vệt bóng mờ, bộ đếm chạy từ 3 lên 99. Mỗi lần ném cơ thể **đỏ dần lên**, tức là màu nhấn có được nhờ hành động. Cú thứ 100 quay chậm, nhạc lặng hẳn, có hai nhịp tim, rồi bóng vào lưới: rổ bừng đỏ, chớp sáng, máy rung, hợp âm chuyển từ Rê thứ sang **Rê trưởng**, nhân vật bật nhảy. Nhãn: **HÀNH ĐỘNG — Trượt 99 lần. Vẫn ném lần thứ 100.** | Đường cong căng thẳng rồi giải toả, đặt đỉnh cảm xúc ở đây (peak-end rule). |
| 0:23–0:25 | **Tương phản**: camera kéo ra toàn cảnh, hai hàng cầu toàn tối và mờ (93% vẫn đang "chuẩn bị" tới 2.000+ ngày), hàng hành động sáng đỏ. | Ba kết cục đặt cạnh nhau trong một khung hình. |
| 0:25–0:30 | **Thông điệp**: "Đừng đợi cú ném hoàn hảo." / **HÃY CỨ NÉM / CHO ĐẾN KHI / NÓ HOÀN HẢO●**. Quả bóng đỏ rơi xuống làm *dấu chấm câu*, khép lại với cú rơi ở mở đầu. CTA: "BẠN LÀ AI TRONG 3 NGƯỜI? Cú ném tiếp theo sẽ trả lời." | Câu kết ngắn, dễ chia sẻ, trả lời câu hỏi mở đầu (khép vòng Zeigarnik). |

## Kiến trúc

```
src/timeline.ts   ← nguồn sự thật duy nhất: lịch dựng, rig + IK, quỹ đạo bóng, camera, sự kiện âm thanh
src/parts.tsx     ← Figure (ống 3D có highlight, IK 2 khớp), Ball, Hoop, Court (gạch phối cảnh)
src/Row.tsx       ← một sân: phản chiếu sàn, bóng đổ, cột sáng, DOF, nhãn/HUD
src/Scenes.tsx    ← Hook, Ending, hậu kỳ (vignette, grain, flash)
src/Main.tsx      ← camera ảo + ghép cảnh + audio
scripts/export-events.ts  ← xuất sự kiện từ timeline.ts (node --experimental-strip-types)
scripts/make_audio.py     ← tổng hợp toàn bộ SFX + nhạc (numpy), reverb FFT, master −1 dBFS
```

Âm thanh khớp hình vì tiếng bóng nảy được **phát hiện từ chính quỹ đạo bóng** (vận tốc đổi chiều ở mặt sàn),
còn tiếng ném, va vành, lưới và nhịp tim lấy từ cùng các mốc frame mà hình ảnh dùng.

## Bản quyền

- **Âm thanh**: 100% tổng hợp bằng thuật toán trong `scripts/make_audio.py`, không dùng sample của bên thứ ba, dùng thương mại tự do.
- **Font**: Montserrat (SIL Open Font License 1.1) qua `@fontsource/montserrat`, nạp cục bộ, có đủ subset tiếng Việt.
- Không dùng logo hay thương hiệu của kênh gốc.
