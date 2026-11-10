# NGÀY MỘT — Remotion (9:16 · 1080×1920 · 30fps · 48s)

Bản tái dựng + nâng cấp điện ảnh từ video tham chiếu “One Day / Day One”:
nền đen, nhân vật trắng 2.5D, màu nhấn theo bản gốc (xanh cột/bậc thang, vàng cúp, xanh cỏ,
xanh núi, xanh ngọc nước, xô xanh lá). Toàn bộ Việt hóa, font Montserrat (OFL).

## Cấu trúc câu chuyện
| # | Cảnh | Frame | Ý đồ |
|---|------|-------|------|
| 1 | **MỘT NGÀY** — cột khổng lồ đội cúp phóng lên, cướp chiếc cúp khỏi tầm tay | 0–150 | Hook giây đầu: va chạm + rung máy + tilt lên cúp |
| 2 | Cột vỡ thành bậc thang, chữ đổi chỗ **NGÀY MỘT**, bước lên bậc đầu | 150–330 | Mỗi bậc là một nốt nhạc; leo lên = thang âm đi lên |
| 3 | Sút trượt liên tục: **Đây KHÔNG phải thất bại** | 330–660 | Bóng tích tụ quanh khung thành = bằng chứng của nỗ lực |
| 4 | “?” → quay lưng bỏ đi, ánh sáng rút theo: **Bỏ đi mới là THẤT BẠI** | 660–750 | Đổi màu lạnh, nhạc rơi xuống drone |
| 5 | Kiệt sức trên vách núi → kéo máy 6× lộ cả ngọn núi, vệt sáng những bước đã đi, đỉnh ngay trên đầu | 750–1020 | Cao trào cảm xúc, C trưởng |
| 6 | **1% mỗi ngày** — time-lapse 365 ngày, bể đầy theo đường cong lãi kép: 1,01³⁶⁵ ≈ 37,8 | 1020–1290 | Tick đồng hồ tăng tốc khớp bộ đếm |
| 7 | **Đừng chờ ~~một ngày~~. Hãy bắt đầu NGÀY MỘT.** | 1290–1440 | Vòng kết nối với mở đầu |

## Chạy
```bash
npm install
npm run audio      # tổng hợp nhạc + SFX -> public/audio/soundtrack.wav (cần python3 + numpy)
npm run studio     # xem trước
npm run render     # -> out/ngay-mot.mp4
```
Nếu không tải được Chrome, đặt `REMOTION_CHROME=/đường/dẫn/chrome-headless-shell`.

## Âm thanh & bản quyền
- Nhạc và SFX **tổng hợp 100% bằng code** (`scripts/make_audio.py`, numpy) — không dùng sample bên thứ ba,
  dùng thương mại tự do. Mọi cue khóa theo frame từ `src/timeline.json`.
- Font Montserrat: SIL Open Font License (`public/fonts/OFL-LICENSE.txt`).
- Grain phim tạo bằng `scripts/make_grain.py`.
