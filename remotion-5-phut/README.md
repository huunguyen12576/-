# 5 PHÚT — Cùng 5 phút. Khác cả một ngày.

Một video ngắn 9:16 (1080×1920, 30fps, 24 giây) làm bằng **Remotion + React**. Video dựng lại concept "split-screen buổi sáng" của video tham chiếu: nền đen, nhân vật trắng, căn hộ 2.5D, hành động và ẩn dụ giữ nguyên. Toàn bộ nội dung đã Việt hóa, dùng font Montserrat.

**Thành phẩm:** `out/nam-phut.mp4`

## Kịch bản & nhịp dựng

| Thời gian | Cảnh | Chủ đích |
|---|---|---|
| 0.0–1.5s | **HOOK** — màn đen, đồng hồ báo thức đỏ `06:00` nhấp nháy, tiếng bíp | Gây chú ý ngay giây đầu bằng âm thanh ai cũng quen. Con số co lại thành đồng hồ trung tâm (match-cut) |
| 1.0–1.7s | Một đường sáng xé ngang màn hình, hai khung **mở ra như mí mắt** | Ẩn dụ "thức dậy". Từ đây chia đôi màn hình, hai lựa chọn |
| 1.5–13.5s | **5 PHÚT** (trên, ấm, đèn sáng): tắt báo thức → hít đất → ốp trứng → tắm → sẵn sàng → mở cửa ra ánh sáng<br>**KHÔNG KỊP** (dưới, xanh lạnh, tối): báo lại ×3 → **MUỘN RỒI!** → ăn vội bánh mì → không kịp tắm → trễ giờ | Cùng một căn hộ, cùng một chiếc đồng hồ (0:00 → 5:00). Máy quay phía trên mượt và vững, phía dưới rung tay, giật cục, có lúc đỏ rực |
| 13.2–14.4s | Hai cánh cửa mở, **chớp sáng trắng**, "KHÔNG KỊP" bị gạch đỏ | Điểm bùng nổ |
| 14–20s | Phố lúc hoàng hôn: người trắng đi thẳng lưng, xách cặp; người xám còng lưng, đầu rối, tụt lại phía sau. Chữ: **CÙNG 5 PHÚT. / KHÁC CẢ MỘT NGÀY.** | Hệ quả nhìn thấy được (show, don't tell) |
| 20–23s | **Không ai thắng cả một ngày. / Họ thắng *5 phút đầu tiên*.** Người xám ngẩng đầu lên một chút | Thông điệp chốt, đọng lại và có hy vọng |
| 23–24s | Tối dần, `06:00` đỏ cùng tiếng bíp quay lại | Kết nối vòng lặp với đầu video, khuyến khích xem lại |

## Kỹ thuật

- `src/engine.ts`: phép chiếu phối cảnh 2.5D (điểm tụ, chiều sâu z), easing và lò xo vật lý cho chuyển động có quán tính.
- `src/Apartment.tsx`: căn hộ 4 phòng dựng bằng khối hộp phối cảnh thật. Mặt khối hiện hay ẩn theo vị trí camera, có parallax khi lia máy, cột tiền cảnh làm mờ, đèn trần, ánh bình minh qua cửa sổ, kính phòng tắm, hơi nước, ánh sáng tràn qua cửa. Hai panel dùng chung căn hộ, hai bảng màu ngày/đêm.
- `src/Stickman.tsx`: rig nhân vật có khớp vai, khuỷu, hông, gối. Dùng **IK 2 xương** để tay chạm đúng báo thức, chảo hay nắm cửa, chân bám sàn khi hít đất. Dáng đi và chạy sinh theo thủ tục, có độ nảy và trọng lượng.
- `src/Panels.tsx`: diễn xuất từng khung hình cho hai nhân vật. `src/Street.tsx`: thành phố 3 lớp parallax, đèn đường chiếu viền sáng (rim light) lên nhân vật, bóng đổ theo đèn, phản chiếu trên vỉa hè.
- `src/timeline.json`: **nguồn duy nhất** cho mọi mốc thời gian, dùng chung cho cả hình và âm thanh.

## Âm thanh (dùng thương mại an toàn)

`scripts/make-audio.mjs` **tự tổng hợp 100% âm thanh bằng code**: không dùng sample hay nhạc bên thứ ba, nên không vướng bản quyền. Các thành phần:

- Tiếng bíp báo thức, tích tắc đồng hồ (nhịp căng thẳng tăng dần), sub-bass như nhịp tim.
- SFX khớp với từng chuyển động: click tắt chuông, tiếng huỵch khi hít đất, tiếng đập trứng và trứng xèo xèo, nước tắm, bước chân (người trên bước đều, người dưới chạy dồn dập), chăn bị hất tung, sting "MUỘN RỒI!", tiếng thở hổn hển, bản lề và ánh sáng cửa.
- Riser dẫn vào cú impact lúc chớp sáng. Nhạc nền phố là vòng hợp âm hy vọng Fmaj7 – C – Am7 – G, có arpeggio và giai điệu.
- Âm thanh panel trên lệch nhẹ sang trái, panel dưới lệch sang phải. Có reverb và soft-clip, loudness khoảng −16.8 LUFS, chuẩn mạng xã hội.

## Chạy

```bash
npm install
npm run studio         # xem trước và chỉnh sửa
npm run render         # tạo âm thanh rồi xuất out/nam-phut.mp4
```

Nếu máy không tải được Chromium của Remotion, chỉ định trình duyệt có sẵn:
`REMOTION_CHROME=/duong/dan/chrome-headless-shell npm run render`
