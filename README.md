# 🐈‍⬛ Purrsona · Nhà có mèo

Game nuôi mèo nhàn rỗi (idle) dạng web + PWA. Mèo sống trong căn nhà 5 phòng, tự đi lại, ăn, ngủ, ngắm trời, chạy rần rần;
mỗi ngày một tâm trạng và một bộ sở thích riêng. Mỗi lần mèo sang phòng khác, máy quay đi theo kèm thẻ **check-in**.

- Tâm trạng hôm nay (8 kiểu: Tăng động, Lười biếng, Õng ẹo, Bám người, Tò mò, Cáu kỉnh, Thèm ăn, Mơ màng) được tính từ **id mèo + ngày**: cùng ngày thì mọi máy giống nhau, qua ngày mới thì đổi.
- Sở thích hôm nay: chỗ thích được gãi, chỗ ghét bị chạm, đồ chơi ưa, chỗ ngủ ruột, giờ "điên" buổi tối. Người chơi tự khám phá.
- Ánh sáng theo giờ thật: bình minh, trưa, hoàng hôn, đêm (đèn bật, mắt mèo phát sáng).
- Vắng nhà vẫn có chuyện: mở lại app sẽ thấy "Trong lúc bạn vắng nhà" + cá khô tích được.
- Mèo **nhớ và học**: giờ bạn hay ghé (tới giờ ra cửa ngồi chờ), giờ cho ăn, chỗ bạn gãi giỏi; **giận dai** vài giờ nếu bị chọc; 5 kỹ năng lên cấp (gọi tên, săn mồi, leo trèo, đồng hồ sinh học, đập tay).
- Mèo **chảnh**: đẩy cốc khỏi bàn bếp, ngồi chiếm thanh nút, 5 giờ sáng réo ăn, dỗi quay lưng; tin bạn thì chớp mắt chậm.
- **Sống theo lịch của bạn** (🗓️): khai giờ dậy / đi làm / về / ngủ. Mèo gọi bạn dậy, tiễn ra cửa, ngủ ngày, 30 phút trước giờ về ra cửa chính ngồi chờ, đón bạn, tối chơi, đêm ngủ cùng. Mở app lúc nào thì mèo đang ở đúng chỗ của giờ đó.
- **Như camera ở nhà** (📹): giờ bạn đi vắng app tự thành pet-cam – REC, CAM từng phòng, đêm hồng ngoại đen trắng, nói qua loa, ném snack, laser, xem nhiều cam, bản ghi chuyển động; máy cho ăn tự động chạy theo giờ.
- **Đủng đỉnh**: mèo nào, tính cách gì cũng giữ nhịp thong thả – đi chậm, hiếm khi chạy, chuyển dáng mềm. Chỉnh chung ở `CHILL` trong `src/config.js`.
- **Hù doạ** (Tắt / Nhẹ / Đủ đô): nửa đêm mở mắt trắng, cúp điện chỉ còn đôi mắt rồi lao tới, mặt mèo ló sát màn hình, bóng mèo khổng lồ trên tường, mèo lạ ngoài cửa sổ, tiếng RẦM phòng bên, 3 giờ sáng phóng ngang.
- **Phong phú**: 3 nhiệm vụ mỗi ngày, sổ 30 khoảnh khắc sưu tập (★ đến ★★★), nút 📷 chụp polaroid, nhạc lo-fi tự sinh, ẩn giao diện để chỉ ngắm mèo, cỡ giao diện Nhỏ / Vừa / Lớn.
- **Khôn lường**: sự kiện hiếm (chim, bướm, thạch sùng, thùng hàng, mưa giông, "nhìn thấy ma"), 2 thói tật cả đời, món mê đổi mỗi tuần, đồ trang trí theo mùa Tết / Trung thu / Giáng sinh.

---

## Hướng dẫn từng bước

### Bước 1 – Chạy thử trên máy (5 phút)

```bash
cd purrsona
python3 -m http.server 8765
```
Mở trình duyệt: <http://localhost:8765>. Trang thử động tác: <http://localhost:8765/lab.html>.

> Phải mở qua web server (không mở file trực tiếp bằng double-click) vì trình duyệt chặn ES modules từ `file://`.

### Bước 2 – Mã nguồn trên GitHub

Repo: `havudinhkhanh/purrsona` (nhánh `main`). Sửa trên máy rồi `git push` là Cloudflare tự đăng bản mới.
Thư mục `raw/` (khung hình gốc chưa đóng gói, video AI) nằm trong `.gitignore` – không bị đẩy lên.

### Bước 3 – Đăng web bằng Cloudflare Pages (miễn phí, có HTTPS → PWA cài được)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → chọn repo `purrsona`.
2. Framework preset: **None**. Build command: **để trống**. Build output directory: **`/`**.
3. **Save and Deploy**. Vài chục giây sau có địa chỉ `https://purrsona.pages.dev`.
4. (Tuỳ chọn) **Custom domains** → gắn tên miền riêng.
5. Từ giờ mỗi lần `git push` là web tự cập nhật.

### Bước 4 – Cài như app trên điện thoại

- **iPhone**: mở link bằng Safari → nút Chia sẻ → **Thêm vào MH chính**.
- **Android**: mở bằng Chrome → menu ⋮ → **Cài đặt ứng dụng**.
- Mở 1 lần có mạng là lần sau chạy được cả khi không có mạng.

### Bước 5 – Thay mèo bằng khung hình do Gemini / ChatGPT tạo

Chi tiết quy ước nằm trong [`docs/ANIMATION_SPEC.md`](docs/ANIMATION_SPEC.md). Tóm tắt:

1. Nhờ AI tạo **video** từng động tác (Veo trong Gemini, Sora trong ChatGPT): mèo nhìn ngang, quay mặt phải, đi tại chỗ, nền xanh lá trơn, máy quay cố định. Câu lệnh mẫu có sẵn trong spec.
2. Tách video thành khung trong suốt:
   ```bash
   bash tools/video-to-frames.sh walk.mp4 raw/mimi/walk 30 512
   ```
3. Xem lại, xoá khung thừa để vòng lặp khép kín. Làm tương tự cho `idle`, `sleep`, `run`…
4. Đóng gói thành mèo trong game:
   ```bash
   node tools/pack-frames.mjs raw/mimi mimi "Mimi"
   ```
5. Mở `lab.html` → chọn Mimi → duyệt từng động tác; chỉnh `speed` (chân trượt) và `fps` trong `assets/cats/mimi/cat.json`.
6. Trong game: ☰ → Hồ sơ mèo → **Mèo trong nhà** → chọn Mimi.

Mèo **Bông** (trắng, mắt xanh) có sẵn trong gói chính là mèo dạng khung hình được xuất tự động từ na na bằng `tools/bake_frames.py` – ví dụ chạy thật của đường ống này.

### Bước 6 – Nhờ Claude gắn khung hình vào lại

Gửi Claude 1 trong 2 thứ:
- File nén thư mục `raw/<tên-mèo>/` (mỗi động tác 1 thư mục khung), hoặc
- Các video gốc + mô tả "đây là walk, đây là sleep…".

Kèm câu: *"Đóng gói mèo <tên> theo docs/ANIMATION_SPEC.md, duyệt trong lab, chỉnh speed cho chân khớp sàn."*
Claude chạy bước 2–5 ở trên và gửi lại thư mục `assets/cats/<tên>/` để chép vào dự án.

### Bước 7 – Sửa những thứ hay đổi

| Muốn đổi | Sửa ở |
|---|---|
| Tên app, khẩu hiệu | `src/config.js` → `APP` · `manifest.webmanifest` · `index.html` |
| Giá gói, tính năng mỗi gói | `src/config.js` → `PLANS`, `FEATURES` |
| Giá đồ trong cửa hàng, cá khô thưởng | `src/config.js` → `SHOP`, `ECON` |
| Lời thoại | `src/cat/lines.js` |
| Tâm trạng, sở thích theo ngày | `src/cat/personality.js` |
| Phòng, đồ đạc, chỗ mèo hay tới | `src/world/rooms.js` |
| Hoạt động của mèo | `src/cat/brain.js` → `ACTS` |

### Bước 8 – Phát hành bản mới

1. Tăng `VERSION` trong `sw.js` (ví dụ `purrsona-0.1.1`) – để máy người chơi tải bản mới thay vì bản đã lưu.
2. Tăng `APP.version` trong `src/config.js`.
3. `git commit` + `git push`.

### Bước 9 – (Tuỳ chọn, gói Pro) Giọng AI: mèo nói đúng chuyện đã xảy ra

1. Lấy khoá API Anthropic.
2. ```bash
   cd worker/ai-voice
   npx wrangler deploy
   npx wrangler secret put ANTHROPIC_API_KEY
   ```
3. Sửa `ALLOWED_ORIGINS` trong `worker/ai-voice/wrangler.toml` thành địa chỉ web của bạn, deploy lại.
4. Dán địa chỉ worker vào `src/config.js` → `AI.endpoint`, bật `save.settings.aiVoice` (Cài đặt).
Chưa làm bước này thì mèo vẫn nói bằng câu có sẵn – không có gì hỏng.

### Bước 10 – Kết nối lịch thật (Google / Apple / Outlook) để mèo tự chỉnh theo lịch của bạn

Trong app: 🗓️ → **Kết nối lịch của bạn**. Có 3 cách, chọn 1:

**A. Google Calendar (đăng nhập Google, đồng bộ mỗi lần mở app)** – cần làm 1 lần:
1. Vào <https://console.cloud.google.com> → tạo project "Purrsona".
2. **APIs & Services → Library** → bật **Google Calendar API**.
3. **OAuth consent screen**: User type *External*, điền tên app, email; mục *Scopes* thêm `.../auth/calendar.events.readonly`; mục *Test users* thêm email Google của bạn (và tối đa 100 người thử).
4. **Credentials → Create credentials → OAuth client ID** → *Web application* → *Authorized JavaScript origins*: `https://purrsona.pages.dev` và `http://localhost:8765`.
5. Chép **Client ID** dán vào `src/config.js` → `CAL.googleClientId`. Deploy lại.
> Quyền đọc lịch là quyền "nhạy cảm": khi còn ở chế độ thử, Google hiện cảnh báo "ứng dụng chưa xác minh" – bấm *Tiếp tục*. Muốn mở cho mọi người phải gửi Google xác minh app (vài tuần).

**B. Dán link iCal** – dùng được cho Apple, Outlook, Google, không cần đăng nhập:
- *Apple iCloud*: app Lịch trên iPhone → (i) cạnh tên lịch → bật **Lịch công khai** → Chia sẻ liên kết.
- *Outlook*: outlook.com → Cài đặt → Lịch → Lịch dùng chung → **Phát hành lịch** → chép link ICS.
- *Google*: Cài đặt lịch → **Địa chỉ bí mật ở định dạng iCal**.
- Máy chủ lịch không cho trình duyệt đọc thẳng, nên cần deploy proxy 1 lần: `cd worker/cal-proxy && npx wrangler deploy`, sửa `ALLOWED_ORIGINS`, dán URL worker vào `src/config.js` → `CAL.proxy`.

**C. Nhập file .ics** – xuất lịch ra file rồi chọn file. Không cần mạng, không cần cấu hình gì; muốn cập nhật thì nhập lại.

Cách mèo hiểu lịch (tự đoán, chạm vào nhãn của từng sự kiện để sửa): 🏢 *Ra ngoài* (có địa điểm, họp, gym, tiệc…) · 💻 *Ở nhà, bận* (Zoom/Meet/Teams, WFH, có link) → mèo chen vào "phá họp" · ✈️ *Đi xa* (công tác, du lịch, chuyến bay – cả ngày) → mèo ở nhà một mình, máy cho ăn lo bữa · 🏠 *Nghỉ ở nhà* (nghỉ phép, holiday, WFH cả ngày) → bỏ giờ đi làm của lịch nền. Có việc sớm thì mèo gọi dậy sớm; tiệc khuya thì mèo đi ngủ muộn theo.

🔒 Chỉ đọc, chỉ 14 ngày tới, lưu trên máy người dùng, không gửi đi đâu. Ngắt kết nối bất cứ lúc nào.

### Bước 11 – Lộ trình gợi ý

1. **Thanh toán thật** cho Plus/Pro (Stripe hoặc MoMo/VNPay qua 1 Cloudflare Worker) → xác thực xong ghi `save.plan`.
2. **Đồng bộ đám mây** (Supabase / Cloudflare D1) để chơi trên nhiều máy.
3. **Thông báo đẩy**: "na na đói rồi", "na na vừa check-in Ban công".
4. **Nhiều mèo cùng lúc** trong nhà (kiến trúc đã tách thân / não theo từng mèo).
5. **Nền phòng do AI vẽ**: mỗi phòng nhận `bgImage` thay SVG.

---

## Tài liệu

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) – sơ đồ thư mục, 3 lớp tách rời, gói & khoá tính năng.
- [`docs/ANIMATION_SPEC.md`](docs/ANIMATION_SPEC.md) – quy ước khung hình + câu lệnh mẫu cho AI.

Mèo na na: hình và bộ máy biến hình lấy từ mascot của my-bit.
