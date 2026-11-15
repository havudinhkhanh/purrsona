# Kiến trúc Purrsona

Web thuần (ES modules), **không cần build**, không thư viện ngoài. Mở bằng bất kỳ web server tĩnh nào.

```
index.html, manifest.webmanifest, sw.js      vỏ PWA (cài như app, chạy không mạng)
styles/app.css                               1 bộ token màu / bo góc / khoảng cách cho cả app
src/
  config.js            TÊN APP · GÓI free/plus/pro · quyền theo gói · giá đồ – chỗ hay sửa nhất
  main.js              khởi động
  game.js              bộ điều phối: lưu trữ, nhu cầu, vắng nhà, di chuyển giữa phòng, tương tác
  core/                util (số ngẫu nhiên theo hạt giống…), store (lưu máy, nâng cấp dữ liệu), sound
  render/
    clips.js           TỪ VỰNG ĐỘNG TÁC CHUẨN + bảng lùi – hợp đồng giữa bộ não và bộ vẽ
    registry.js        HỢP ĐỒNG RENDERER + đăng ký kiểu vẽ (vector, sprite, … thêm Lottie / Spine sau)
    vector/            biến hình đường viền (na na từ my-bit)
    sprite/            phát khung hình PNG/WebP (bộ khung do AI tạo)
  cat/
    personality.js     tính cách gốc + tâm trạng & sở thích HÔM NAY + thói tật cả đời + món mê của tuần + tuổi (mèo con 7 ngày đầu)
    memory.js          TRÍ NHỚ & KỸ NĂNG: giờ bạn hay ghé / cho ăn, chỗ bạn hay gãi, giận (nguôi dần), kiên nhẫn (hồi dần), 5 kỹ năng lên cấp, sổ "mèo nhớ…"
    voice.js           giọng AI (Pro, tuỳ chọn) qua worker/ai-voice – mèo nói đúng chuyện đã xảy ra
    brain.js           chọn việc (ăn, ngủ, ngắm trời, đi dạo, chạy rần rần…) + tìm đường giữa các phòng
    body.js            thân mèo: đi / nhảy / leo, bóng đổ, bong bóng thoại, mắt sáng ban đêm
    lines.js           lời thoại theo tình huống × tâm trạng × phòng
  world/
    rooms.js           DỮ LIỆU CĂN NHÀ: phòng, cửa, đồ đạc (độ sâu), chỗ mèo hay tới, đèn
    art.js             cọ vẽ chung (tường, sàn, cửa sổ, cây, đèn…)
    scene.js           sân khấu: máy quay theo mèo, ánh sáng theo giờ thật, thời tiết, chuyển cảnh check-in
    events.js          SỰ KIỆN BẤT NGỜ có độ hiếm: chim, bướm, thạch sùng, thùng hàng, mưa giông, "nhìn thấy ma"
    decor.js           đồ ĐỘNG (cốc trên bàn bếp / mảnh vỡ, thùng giấy) + trang trí theo MÙA (Tết, Trung thu, Giáng sinh, Halloween)
  ui/hud.js            thẻ mèo, phòng, cá khô, thanh hành động, thẻ check-in, các bảng
assets/cats/<id>/      mỗi con mèo 1 thư mục + cat.json (renderer: vector | sprite)
tools/                 bake_frames.py · pack-frames.mjs · video-to-frames.sh
lab.html               Animation Lab – duyệt từng động tác của từng mèo
```

## 3 lớp tách rời – đổi lớp này không đụng lớp kia

```
 bộ não (brain.js)  ── gọi tên động tác chuẩn ──►  thân (body.js)  ── hợp đồng renderer ──►  vector | sprite | (Lottie…)
        ▲                                               │
  nhu cầu + tính cách hôm nay + giờ thật          vị trí trong phòng (rooms.js, scene.js)
```

- **Đổi hình mèo** (AI vẽ lại): chỉ thay `assets/cats/<id>/`. Không sửa code.
- **Thêm động tác**: thêm tên vào `render/clips.js` → thêm thư mục khung → dùng trong 1 hoạt động ở `brain.js`.
- **Thêm hoạt động**: thêm 1 mục `{ id, score, run }` vào `ACTS` trong `brain.js`.
- **Thêm phòng**: thêm 1 mục vào `ROOMS` + `ORDER` trong `rooms.js`. Muốn nền là ảnh AI vẽ: `bgImage: "assets/rooms/x.webp"` (cỡ W×900).
- **Thêm kiểu vẽ** (Lottie, Spine, video có kênh alpha…): 1 file theo hợp đồng trong `registry.js` + 1 dòng đăng ký.

## Gói & khoá tính năng

Mọi chỗ khoá đều gọi `can(plan, "tên-tính-năng")` với bảng `FEATURES` trong `config.js`.
Nối thanh toán thật (Stripe / Apple / Google / MoMo…) = sau khi xác thực, ghi `save.plan = "plus" | "pro"`.
Không có chỗ nào khác phải sửa.

| | Free | Plus | Pro |
|---|---|---|---|
| Phòng | 4 | + Ban công | tất cả |
| Đồ chơi | Len | + Laser, lông vũ | tất cả |
| Nhật ký | 3 ngày | 30 ngày | không giới hạn |
| Tâm trạng ngày mai | – | ✓ | ✓ |
| Mèo | na na | + mèo thứ 2 | + mèo riêng (bộ khung của bạn) |
| Phụ kiện | Kính râm | + Nơ | + Mũ phớt |

## Lưu trữ

`localStorage["purrsona.save.v1"]`, có số phiên bản `v`. Thêm trường mới: thêm vào `fresh()` trong `store.js` –
bản lưu cũ tự được bổ sung, không mất dữ liệu. Muốn đồng bộ nhiều máy sau này: đẩy cùng JSON này lên Supabase / Cloudflare D1.

## Mèo "sống" thế nào (bản 0.2)

| Lớp | Cơ chế | Sửa ở |
|---|---|---|
| Mượt | Đổi 2 dáng khác xa → nắn hình qua 1 dáng trạm (ngồi / ổ bánh mì / thủ thế / nằm) thay vì hoà mờ; tăng tốc – giảm tốc khi đi; quay người co hình 78% chứ không lật phẳng; nghiêng người theo đường nhảy; nhún khi đi xéo; chớp mắt | `render/vector/vector-renderer.js` (`HUBS`), `cat/body.js` |
| Thông minh | 18 hoạt động chấm điểm theo nhu cầu × tính cách hôm nay × thói tật × món mê tuần × giờ thật × kỹ năng × tuổi | `cat/brain.js` → `ACTS` |
| Chảnh | Kiên nhẫn cạn → bỏ đi / cào; giận kéo dài vài giờ (dỗi quay lưng, gọi không tới, vuốt cũng gạt); đẩy cốc rơi; ngồi chiếm thanh nút; 5 giờ sáng réo ăn; chớp mắt chậm khi tin bạn | `cat/brain.js`, `game.js` (tương tác) |
| Học & nhớ | `save.cat.mem`: giờ ghé, giờ cho ăn, chỗ gãi, giận, kiên nhẫn, kỹ năng (XP → cấp 0–5), sổ ghi nhớ | `cat/memory.js` |
| Khôn lường | Bộ bài sự kiện (thường / hiếm / cực hiếm), 2 thói tật cả đời bốc theo ngày nhận nuôi, món mê đổi mỗi thứ hai, mùa lễ, mèo con lớn dần 7 ngày | `world/events.js`, `cat/personality.js`, `world/decor.js` |

Thử nhanh trên console trình duyệt: `PURR.events.fire("storm")`, `PURR.memory.xp("hunter", 20)`, `PURR.memory.offend(50, "thử")`, `PURR.setHour(5)`.

## Bản 0.3 – chill, hù doạ, phong phú

| Phần | File | Ghi chú |
|---|---|---|
| Nhịp "đủng đỉnh" chung | `src/config.js` → `CHILL` | Mọi mèo, mọi tính cách: đi chậm, hiếm chạy, chuyển dáng lâu hơn, ngồi yên lâu hơn, máy quay lướt chậm. Chỉnh 1 chỗ. |
| Hù doạ | `src/world/scares.js` | Mắt trắng lúc ngủ, cúp điện + đôi mắt lao tới, mặt mèo ló sát màn hình, bóng mèo khổng lồ trên tường (dùng `<use>` soi đúng hình mèo đang động), mèo lạ ngoài cửa sổ, tiếng RẦM phòng khác, phóng ngang lúc 3 giờ sáng. Mức Tắt / Nhẹ / Đủ đô trong Cài đặt. |
| Nhiệm vụ hằng ngày | `src/meta/quests.js` | 3 việc / ngày, bắn tín hiệu bằng `game.emit("q", "<tên>")`. |
| Sổ khoảnh khắc + ảnh | `src/meta/album.js` | 30 khoảnh khắc có độ hiếm ★–★★★, mở khoá khi bạn đang xem; nút 📷 lưu polaroid dáng hiện tại. |
| Nhạc lo-fi | `src/core/music.js` | Tự sinh bằng Web Audio, không cần file, không bản quyền; đêm tự nhỏ lại. |
| Giao diện | `src/ui/hud.js`, `styles/app.css` | Avatar tròn có vòng nhu cầu, thanh lối tắt bên phải, nút tròn nổi; cỡ Nhỏ / Vừa / Lớn; 👁️ ẩn giao diện để chỉ ngắm mèo. |

Thử trên console: `PURR.scares.fire("blackout")` · `"peek"` · `"shadow"` · `"stranger"` · `"whiteeyes"` · `"dash"` · `"crash"`.

## Bản 0.4 – mèo sống theo lịch của bạn, xem như camera ở nhà

| Phần | File | Ghi chú |
|---|---|---|
| Lịch của chủ | `src/meta/schedule.js` → `DEFAULT_OWNER` | Ngày đi làm / ngày nghỉ: dậy, ra khỏi nhà, về, đi ngủ + 2 giờ máy cho ăn tự động. Sửa trong app: 🗓️. |
| Kế hoạch ngày của mèo | `planFor(ngày)` | Khối giờ cố định theo lịch + tính cách hôm nay: gọi dậy → ăn sáng → tiễn ra cửa → ngủ / ngắm cửa sổ / đi tuần → 30 phút trước giờ về ra cửa chờ → đón → ăn tối → giờ điên → lên giường ngủ cùng → đi tuần đêm. Cùng ngày luôn giống nhau. |
| Mở app = đúng khoảnh khắc | `game.spawnPlan()` | Vắng > 10 phút: mèo hiện đúng phòng, đúng chỗ của khối giờ hiện tại. Bản ghi lúc vắng lấy từ kế hoạch nên luôn khớp. |
| Bộ não theo lịch | `cat/brain.js` → `choose()` | Việc của khối hiện tại được nhân điểm mạnh, các việc theo lịch (gọi dậy, tiễn, chờ cửa, đón, lên giường) chỉ xuất hiện đúng giờ. Sự kiện, hù doạ, tương tác vẫn chen ngang được. |
| Về / đi thật theo giờ | `game.ownerArrives()` / `ownerLeaves()` | Đúng giờ trong lịch: cửa chính mở, mèo ra đón hoặc tiễn, app tự đổi chế độ. |
| Chế độ camera | `ui/hud.js`, `styles/app.css` (`#app[data-mode=cam]`) | REC, CAM 1–5, đồng hồ, hạt nhiễu, đêm hồng ngoại đen trắng, cắt cam có nhiễu, nói qua loa, ném snack (5 viên/ngày), laser, chụp, lưới các cam, bản ghi chuyển động. Ở xa không vuốt được. Nút 📹 để tự chuyển. |

## Bản 0.5 – đọc lịch thật của người chơi

| Phần | File | Ghi chú |
|---|---|---|
| Kết nối lịch | `src/meta/calendar.js` | Google Calendar (Google Identity Services, quyền `calendar.events.readonly`, chạy trên trình duyệt), link iCal qua `worker/cal-proxy`, nhập file `.ics`. Bộ đọc ICS có TZID, cả ngày, RRULE (DAILY/WEEKLY+BYDAY/MONTHLY/YEARLY, COUNT, UNTIL), EXDATE. |
| Xếp loại sự kiện | `classify()` + `KW` | away / busy / trip / off / ignore theo từ khoá (Việt + Anh), địa điểm, link họp. Người dùng chạm để sửa → `calendar.overrides`. |
| Trộn với lịch nền | `schedule.dayInfo()` | Lịch nền + đoạn từ lịch thật → nhiều đoạn đi vắng / họp online / đi xa trong 1 ngày; dậy sớm & ngủ muộn theo việc. `planFor`, `ownerState`, `busyNow` đều dùng `dayInfo`. |
| Mèo phá họp online | brain `meeting` | Đúng giờ họp (đang ở nhà, app mở): mèo đi tới trước "camera", ngồi chiếm thanh nút. |

## Bản 0.6 – giao diện mới & mèo "quấn người"

| Phần | File | Ghi chú |
|---|---|---|
| Bộ icon nét | `src/ui/icons.js` | `icon(name)` trả SVG 24×24 theo `currentColor`. Emoji chỉ còn cho nội dung (tâm trạng, quà, phòng). |
| Phông | `assets/fonts/` | Be Vietnam Pro 400–800, tự lưu (offline, không gọi Google Fonts). |
| HUD kính tối | `styles/app.css` (lớp 0.6) | Token `--hud*`, viên trạng thái, đảo thông báo (toast + check-in nở ra từ viên tên phòng, chạy hàng đợi), thanh lối tắt 1 khối, thanh hành động 1 khối với nút chính gradient. |
| Gắn bó | `src/cat/bond.js` | 5 bậc: Người lạ 0 · Quen mặt 12 · Bạn 28 · Bạn thân 50 · Tri kỷ 75. `bond.gain(n, why)` → sự kiện `bond-up`. Nguội dần khi bỏ bê > 3 ngày (không rơi quá 1 bậc). |
| Hành vi quấn người | `src/cat/brain.js` | `headbutt`, `blinkat`, `gift` (Bạn) · `knead`, `bellyup`, `pawtap` (Bạn thân) · `sleepnear` (Tri kỷ; từ Bạn sau 21h) · đi theo bạn sang phòng (Quen mặt, `game.viewRoom`) · đón cửa có dụi đầu khi vắng > 2 giờ. Hồi chiêu lưu ở `save.cd`. Chỉ diễn khi `game.attention()`. |
| Cận mặt | `src/ui/closeup.js` | `headbutt` / `pawtap` / `slowblink`. Có `closeups` trong `cat.json` → phát video Flow, tách nền xanh bằng canvas; không có → mặt mèo vector. Để lại vết mũi trên "kính", vuốt để lau. |
| Quà | `src/meta/gifts.js` | 12 món, độ hiếm theo kỹ năng săn. Quà nằm trên sàn (`save.house.gift`) tới khi bạn chạm. Bộ sưu tập: Sổ khoảnh khắc → Quà. |
| Thư mỗi sáng | `src/meta/letter.js` | Viết từ nhật ký hôm qua + tâm trạng + bậc gắn bó. Lưu 30 lá; đọc lại thư cũ = Plus (`letters.archive`). |
| Cách mèo gọi bạn | `save.profile.nick` | Mặc định "Sen". Lời thoại dùng `{cat}` / `{sen}`, điền lúc chạy (`setNames`). |
| Rung | `game.buzz()` | Chỉ rung sau khi người dùng đã chạm (tránh trình duyệt chặn), tắt được trong Cài đặt. |
