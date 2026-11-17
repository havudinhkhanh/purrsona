# Kiến trúc · Purrsona 1.0

Không có bước build. ES modules chạy thẳng trên trình duyệt, PWA cache bằng `sw.js`.

```
index.html            bộ lọc SVG "nét chì" (#pencil), màn mở app
styles/app.css        token giấy/mực, khu vườn, chữ trên nền, bảng trượt, cận mặt
src/main.js           khởi động
src/game.js           bộ điều phối: mèo + khu vườn + bộ học + tương tác
src/config.js         gói giá, quyền theo gói (can), số từ/ngày, phụ kiện, nhịp chuyển động
src/learn/
  packs/*.js          dữ liệu từ (en-core, zh-core, en-business)
  packs.js            nạp & chuẩn hoá thẻ, đọc CSV
  srs.js              chọn từ mới mỗi ngày, ôn lặp lại (hộp 0–6), chuỗi ngày, XP
  tts.js              đọc to bằng Web Speech
src/world/
  yard.js             khu vườn nhìn từ trên: phép chiếu (u,v) → màn hình, vẽ bằng rough.js, hoa chữ
  critters.js         bướm (mang đáp án khi đố) và ong
src/ui/
  wall.js             chữ trên hình nền: từ đang treo, đố trên cảnh, giờ, lời thì thầm, chữ mèo viết lề
  hud.js              bảng trượt phụ: menu, sổ từ, tiến độ, giấy nhắn, hồ sơ mèo, cài đặt, gói
  closeup.js          mèo áp sát màn hình (dụi đầu, gõ kính, chớp mắt)
  icons.js            bộ icon nét
src/cat/
  body.js             thân mèo: đi, nhảy, nói, bóng; to/nhỏ theo yard.depth(y)
  brain.js            chọn việc: ngủ, chạy, đuổi bướm, viết lề, kháy, đố, quấn người…
  lines.js            lời thoại (xưng "tui", gọi chủ {sen})
  bond.js memory.js personality.js voice.js
src/meta/note.js      giấy nhắn mỗi sáng
src/render/           bộ vẽ mèo (vector morph hoặc khung hình) – xem ANIMATION_SPEC.md
src/vendor/rough.js   nét vẽ tay (MIT)
worker/ai-voice/      Cloudflare Worker gọi Claude cho câu kháy AI (gói Pro)
```

## Khu vườn

Mặt đất là hình chữ nhật `UW × UH` (100 × 64). `yard.P(u, v, h)` xoay một góc (−13° màn ngang, −24° màn dọc) rồi nén dọc để ra góc nhìn từ trên xuống hơi xiên.
Màn dọc cho khu vườn tràn hai mép như ảnh nền. Mọi đồ đứng (cây, ghế, kệ, hoa) là một lớp SVG có `z-index` bằng toạ độ y chân đồ, nên mèo đi trước/sau đúng.

## Học trên cảnh

`wall.js` có các trạng thái: `ambient` (treo từ theo giờ) → `new` (từ mới, bấm "nhớ rồi") → `quiz` (bướm mang đáp án) → `result`.
Mọi câu trả lời đi qua `learn.answer(id, ok)` → sự kiện `learn` → mèo phản ứng (`game.react`), hoa nở khi thuộc (`bloom`).

## Gói

| Tính năng | Khoá |
|---|---|
| Cấp B1, B2, HSK 2, HSK 3 | `level.plus` |
| Gói chuyên ngành | `level.pro` |
| Câu nghe | `quiz.listen` |
| Thống kê 30 ngày, từ hay sai | `stats.full` |
| Đọc lại giấy nhắn cũ | `notes.archive` |
| Nhập CSV | `import.csv` |
| Mèo kháy bằng AI | `ai.voice` |

Nối thanh toán thật chỉ cần ghi `save.plan` sau khi xác thực.
