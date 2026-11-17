# Purrsona · Mèo đanh đá dạy chữ

App học từ vựng **tiếng Anh** và **tiếng Trung** cho người Việt, dạng web + PWA, vẽ toàn bộ bằng nét chì trắng đen.
Màn hình là một khu vườn nhìn từ trên xuống, hơi xiên, có căn nhà ở góc. Một con mèo đen chạy nhảy khắp nơi và kháy bạn mỗi khi lười.

- **Như hình nền / màn hình khoá**: góc trái trên luôn có một từ (chữ, phiên âm hoặc pinyin, nghĩa, câu ví dụ). Từ tự đổi theo giờ (5, 15 hoặc 60 phút). Góc phải là giờ, ngày, chuỗi ngày học, số hoa.
- **Học ngay trên cảnh, không có cửa sổ bật lên**: bấm "học" là từ mới hiện lên từng từ; bấm "nhớ rồi" thì bướm bay ra, mỗi con mang một đáp án. Chạm đúng con bướm là xong câu.
- **Ôn lặp lại ngắt quãng** (hộp Leitner 0–6): đúng thì 1, 2, 4, 8, 16, 35 ngày sau mới hỏi lại; sai thì hỏi lại sau 10 phút. Lên hộp 4 là thuộc, ngoài vườn nở một bông hoa có ghi chữ đó.
- **Mèo kháy**: viết câu ngắn ngay cạnh nó và ghi bậy ra lề giấy ("3 từ chưa ôn", "ôn đi trời"). Đúng thì khen nhỏ giọt, sai thì nói thẳng, sai một từ nhiều lần thì nhắc đích danh từ đó. Đang ngồi không lâu quá thì mèo tự chạy tới đố.
- **Mèo có tính cách**: mỗi ngày một tâm trạng, có trí nhớ, biết giận khi bị bỏ bê, gắn bó tăng dần (dụi đầu vào màn hình, chớp mắt chậm, gõ kính đòi học, nhào bột, khoe bụng có bẫy).
- **Giấy nhắn mỗi sáng**: mèo viết lại kết quả học hôm qua.
- **Đọc to**: chạm vào chữ lớn là nghe, từ mới tự đọc khi hiện (tắt được trong Cài đặt). Dùng giọng có sẵn của máy (Web Speech), chạy offline sau lần mở đầu.
- **Sổ của tôi**: bấm ☆ ở chữ trên tường để lưu. Sổ là tab đầu tiên trong Sổ từ, có nút "Học sổ này". Từ lạ lưu từ web thì tự điền nghĩa, mèo mới đố.
- **Đọc cùng mèo**: dán một đoạn văn (hoặc bấm Chia sẻ → Purrsona trên điện thoại). Mèo quét, chỉ ra chữ trong gói và chữ lạ đáng lưu, rồi kháy một câu.
- **Tiện ích Chrome "Mèo đọc ké"** (thư mục `extension/`): mèo ngồi góc mọi trang, gạch dưới chữ đã học, rê chuột vào ra nghĩa, bôi đen chữ là lưu vô sổ, kháy theo loại trang (mạng xã hội, báo, mua sắm, làm việc…). Mở app là sổ tự đồng bộ.

Gói: **Free** (A2, HSK 1, tối đa 5 từ/ngày, sổ 30 từ, đọc ké 1.500 ký tự) · **Plus** (đến B2 và HSK 3, câu nghe, 20 từ/ngày, thống kê 30 ngày, sổ không giới hạn, đọc ké bài dài) · **Pro** (gói tiếng Anh tài chính – kinh doanh, tự nhập từ bằng CSV, mèo kháy bằng AI). Mọi chỗ khoá đều đi qua `can()` trong `src/config.js`.

---

## Hướng dẫn từng bước

### Bước 1 – Chạy thử trên máy

```bash
cd purrsona
python3 -m http.server 8765
```
Mở <http://localhost:8765>. Phải chạy qua web server vì trình duyệt chặn ES modules mở từ `file://`.

### Bước 2 – Đưa lên GitHub

```bash
git add . && git commit -m "Purrsona 1.1" && git push
```

### Bước 3 – Đăng web bằng Cloudflare Pages

1. Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → chọn repo.
2. Framework preset: **None**. Build command: `exit 0`. Build output directory: `/`.
3. **Save and Deploy**. Mỗi lần `git push` là web tự cập nhật.

### Bước 4 – Cài như app

- iPhone: mở bằng Safari → Chia sẻ → **Thêm vào MH chính**.
- Android: mở bằng Chrome → ⋮ → **Cài đặt ứng dụng**.

### Bước 5 – Thêm từ

- Mỗi gói là một file trong `src/learn/packs/`. Một từ là một dòng:
  - Tiếng Anh: `[từ, IPA, từ loại, nghĩa, câu ví dụ, dịch câu ví dụ]`
  - Tiếng Trung: `[chữ Hán, pinyin, từ loại, nghĩa, câu ví dụ, pinyin câu ví dụ, dịch câu ví dụ]`
- Gói mới: tạo file theo mẫu `en-business.js`, thêm vào mảng `PACKS` trong `src/learn/packs.js`, đặt `tier` là `free`, `plus` hoặc `pro`.
- Người dùng gói Pro tự nhập được trong Cài đặt: file CSV các cột `từ, phiên âm, nghĩa, ví dụ, dịch ví dụ`.

### Bước 6 – Thay mèo vẽ tay bằng khung hình Google Flow / AI

Xem `docs/ANIMATION_SPEC.md`. Clip đặt theo tên động tác (`walk`, `sleep`, `knead`…), thiếu động tác nào game tự lùi về động tác gần nhất.

### Bước 7 – (Tuỳ chọn, Pro) Mèo kháy bằng AI

```bash
cd worker/ai-voice
npx wrangler deploy
npx wrangler secret put ANTHROPIC_API_KEY
```
Sửa `ALLOWED_ORIGINS` trong `wrangler.toml` thành địa chỉ web, rồi dán địa chỉ worker vào `AI.endpoint` trong `src/config.js`. Chưa làm bước này thì mèo dùng câu có sẵn.

### Bước 8 – Cài tiện ích Chrome "Mèo đọc ké"

1. Chrome → `chrome://extensions` → bật **Developer mode**.
2. **Load unpacked** → chọn thư mục `extension/`.
3. Bấm biểu tượng Purrsona trên thanh công cụ → dán địa chỉ app (vd. địa chỉ Cloudflare Pages) vào ô **Địa chỉ app**.
4. Mở app một lần để tiện ích biết bạn đã học những từ nào. Từ lưu trên web nằm chờ (số trên biểu tượng) và tự vào sổ khi mở app.

Sau khi sửa gói từ hoặc `src/learn/scan.js`, chạy `node tools/build-extension.mjs` để sinh lại `extension/words.js`, `scan.js`, `poses.js`.

**Quyền riêng tư:** tiện ích đọc chữ trên trang ngay trong máy, không gửi nội dung đi đâu, không có mạng. Không chạy trên trang có ô mật khẩu, trang thanh toán, Gmail, Outlook, trang đăng nhập. Ẩn mèo theo từng trang trong popup. Chỉ đồng bộ với app qua `postMessage` trong cùng thẻ trang app.

### Bước 9 – Phát hành bản mới

1. Tăng `VERSION` trong `sw.js`.
2. Tăng `APP.version` trong `src/config.js` (và `version` trong `extension/manifest.json` nếu tiện ích đổi).
3. `git push`.

---

## Tài liệu

- `docs/ARCHITECTURE.md` – sơ đồ thư mục và luồng dữ liệu.
- `docs/ANIMATION_SPEC.md` – quy ước khung hình cho mèo.

Phông chữ: Be Vietnam Pro và Patrick Hand (SIL OFL, kèm giấy phép trong `assets/fonts/`). Nét vẽ tay: rough.js (MIT, `src/vendor/`).
