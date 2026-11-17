# Đặc tả khung hình mèo (dùng khi nhờ Gemini / ChatGPT / video AI vẽ động tác)

Game không quan tâm mèo được vẽ bằng gì. Chỉ cần **một thư mục khung hình đúng quy ước dưới đây**, rồi chạy
`node tools/pack-frames.mjs` là mèo mới xuất hiện trong game, không sửa dòng code nào.

## 1. Quy ước bắt buộc

| Mục | Quy ước | Vì sao |
|---|---|---|
| Hướng mặt | Mèo **quay mặt sang PHẢI**, nhìn ngang (side view) | Game tự lật khi mèo đi sang trái |
| Nền | **Trong suốt** (PNG/WebP có alpha) | Mèo đặt lên mọi phòng |
| Cỡ khung | Mọi khung **cùng cỡ**, vuông, khuyên dùng 512×512 | Không giật khi đổi khung |
| Điểm chạm đất | Chân mèo chạm **cùng 1 đường ngang** ở mọi khung (mặc định 94% chiều cao khung, giữa khung theo chiều ngang) | Mèo không nhảy lên xuống khi đổi khung |
| Máy quay | **Cố định**, mèo đi tại chỗ (in-place), không trôi ngang | Game tự dời mèo theo tốc độ – chân khớp sàn |
| Cỡ mèo | Mèo ngồi cao ~45% khung | Mọi động tác cùng tỉ lệ |
| Vòng lặp | Khung cuối nối liền khung đầu (đi, chạy, ngồi thở…) | Lặp không thấy mối nối |
| Tên file | `0001.webp`, `0002.webp`… theo thứ tự | Đọc đúng thứ tự |

## 2. Tên động tác (thư mục)

Bắt buộc: `idle`. Rất nên có: `walk`. Còn lại có bao nhiêu dùng bấy nhiêu, thiếu thì game tự lùi về động tác gần nhất.

| Thư mục | Động tác | Loại | Gợi ý số khung @30fps |
|---|---|---|---|
| `idle` | Ngồi thở, đuôi phe phẩy nhẹ | lặp | 24–48 |
| `idle_tail` | Ngồi vẫy đuôi rõ | lặp | 24 |
| `look_up` | Ngồi ngửa cổ nhìn lên | lặp | 12–24 |
| `loaf` | Ngồi ổ bánh mì (khoanh chân) | lặp | 12–24 |
| `lie` | Nằm nghiêng | lặp | 12–24 |
| `sleep` | Cuộn tròn ngủ, thở chậm | lặp | 24–48 |
| `groom` | Liếm chân | lặp | 16–24 |
| `groom_full` | Rửa mặt trọn bộ | 1 lần | 48–90 |
| `lick_body`, `lick_lip` | Liếm lông, liếm mép | lặp | 16 |
| `stretch` | Vươn vai | lặp | 24 |
| `crouch` | Hạ người, ngoáy mông sắp vồ | lặp | 8–16 |
| `eat` | Cúi ăn | lặp | 16 |
| `walk` | Đi bộ – **1 chu kỳ 2 bước** | lặp + di chuyển | 24–32 |
| `run` | Chạy | lặp + di chuyển | 16–24 |
| `stalk` | Rình bò thấp | lặp + di chuyển | 24–48 |
| `jump` | Dáng giữa không trung (quỹ đạo do game tính) | lặp | 1–8 |
| `chase` | Dáng vồ | lặp | 1–8 |
| `roll`, `roll_play` | Lăn lộn / lăn lộn trọn bộ | lặp / 1 lần | 24–60 |
| `play_yarn` | Vờn len | lặp | 24 |
| `scratch` | Cào trụ | lặp | 8–16 |
| `trot_tailup` | Đi đuôi dựng chào (lúc đón bạn) | lặp, tại chỗ | 16–24 |
| `rub` | Cọ má, cọ sườn | lặp | 24 |
| `knead` | Nhào bột | lặp | 16–24 |
| `belly_up`, `belly_trap` | Khoe bụng / bẫy bụng | lặp / 1 lần | 24 |
| `chirp` | Kêu chào "mrrp" | 1 lần | 12–20 |
| `gift_carry`, `gift_drop` | Ngậm quà đi / thả quà | lặp tại chỗ / 1 lần | 16–24 |

**Clip cận mặt** (khung dọc 9:16, mèo nhìn thẳng ống kính) không tách khung mà giữ nguyên video nền xanh:
đặt `closeups/headbutt.mp4`, `closeups/pawtap.mp4`, `closeups/slowblink.mp4` trong thư mục mèo và khai báo
`"closeups": { "headbutt": "closeups/headbutt.mp4", … }` trong `cat.json`. Game tự xoá nền xanh khi phát.
Thiếu file nào thì dùng mặt mèo vẽ vector. Toàn bộ câu lệnh cho Google Flow: tài liệu "Purrsona – Bộ prompt Google Flow".

Danh sách gốc nằm ở `src/render/clips.js`. Thêm tên mới = thêm 1 dòng ở đó + dùng trong `src/cat/brain.js`.

## 3. Cấu hình (tuỳ chọn) – `_cat.json` đặt cạnh các thư mục

```json
{
  "name": "Mimi", "breed": "Mèo Anh lông ngắn",
  "anchor": [256, 482],
  "personality": { "playful": 0.7, "lazy": 0.4, "curious": 0.6, "affectionate": 0.8, "sassy": 0.2, "greedy": 0.6, "brave": 0.5 },
  "clips": {
    "walk":  { "fps": 30, "speed": 165 },
    "sleep": { "fps": 8, "blend": true },
    "groom_full": { "loop": false }
  }
}
```

- `speed`: tốc độ (đơn vị hình/giây) mà 1 chu kỳ bước khớp sàn. Đi sai tốc độ → chân trượt. Chỉnh trong `lab.html` (thanh "Tốc độ đi") tới khi chân dính sàn.
- `blend: true`: hoà 2 khung kề nhau – dùng cho bộ ít khung (thở chậm, ngủ) để vẫn mượt.
- `anchor`: điểm chạm đất (px trong khung). Bỏ trống = giữa khung, 94% chiều cao.

## 4. Về "120 khung/giây"

- Game vẽ theo **thời gian thật**, khớp mọi màn hình 60/90/120/144 Hz. Bộ 30 khung/giây đã chạy mượt ở 120 Hz (mỗi khung hiển thị 4 lần).
- Bộ 120 khung/giây mượt hơn nhưng **nặng gấp 4** (≈2–4 MB mỗi động tác ở 512 px). Khuyên: 30–60 khung/giây cho đi/chạy, 8–24 cho động tác chậm (+ `blend`).
- Muốn 120: tạo video 24–30 fps rồi nội suy (`INTERP=120` trong `tools/video-to-frames.sh`, hoặc RIFE).

## 5. Câu lệnh mẫu gửi AI

**Video (khuyên dùng – Veo trong Gemini, Sora trong ChatGPT):**
> Side view of a [mô tả mèo: fluffy cream British Shorthair with amber eyes], walking in place on a treadmill-like loop, facing right, full body visible, locked-off static camera, flat solid pure green (#00FF00) background, even studio lighting, no shadows on background, 3 seconds, the cat completes exactly two steps per cycle, seamless loop, 2D illustrated style matching a cozy flat vector game.

Đổi phần "walking in place" thành: *sitting still breathing and slowly swishing tail* (idle), *curled up asleep breathing slowly* (sleep), *crouching low and wiggling hips before pouncing* (crouch)…

**Ảnh lưới khung (sprite sheet):**
> A sprite sheet of 8 frames in a single row, same [mô tả mèo], side view facing right, walk cycle, each frame the same size, feet on the same baseline, transparent background, consistent character, flat 2D game art.

Rồi cắt lưới thành 8 file (hoặc khai báo `"atlas"` trong cat.json – xem `src/render/sprite/sprite-renderer.js`).

**Mẹo giữ đúng 1 con mèo qua mọi động tác:** dùng chung 1 ảnh tham chiếu (mặt + thân) cho mọi lần tạo, và gửi kèm khung tham chiếu tư thế do `tools/bake_frames.py` xuất từ na (đúng cỡ, đúng điểm neo).

## 6. Quy trình 5 bước

1. Tạo video / ảnh cho từng động tác (mục 5).
2. `bash tools/video-to-frames.sh walk.mp4 raw/mimi/walk 30 512` (lặp cho từng động tác).
3. Xem từng khung, xoá khung thừa cho vòng lặp khép kín.
4. `node tools/pack-frames.mjs raw/mimi mimi "Mimi"`
5. Mở `lab.html` → chọn Mimi → duyệt từng động tác, chỉnh `speed` / `fps` trong `assets/cats/mimi/cat.json`.
