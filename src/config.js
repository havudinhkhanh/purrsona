// Mọi thứ hay đổi nằm ở đây: tên app, gói giá, quyền theo gói, nhịp chuyển động.
export const APP = {
  name: "Purrsona",
  tagline: "Mèo đanh đá dạy chữ · Anh – Trung",
  saveKey: "purrsona.save.v2",      // v2: bản học chữ (không đọc bản lưu nuôi mèo cũ)
  version: "2.2.0",
};

// ------------------------------------------------------------------ GÓI (free / plus / pro)
// Khi nối thanh toán thật: chỉ cần ghi save.plan = "plus" | "pro" sau khi xác thực. Mọi chỗ khoá đều gọi can().
export const PLANS = {
  free: { vi: "Miễn phí", price: "0đ", note: "Học mỗi ngày, cấp cơ bản A2 / HSK 1" },
  plus: { vi: "Plus", price: "39.000đ/tháng", note: "Mọi cấp độ, nghe & gõ, 20 từ/ngày, đủ chữ nóng mỗi ngày" },
  pro:  { vi: "Pro", price: "79.000đ/tháng", note: "Gói chuyên ngành, tự nhập từ, mèo AI, kho chữ nóng 30 ngày" },
};
const RANK = { free: 0, plus: 1, pro: 2 };
// tính năng → gói tối thiểu
export const FEATURES = {
  "level.plus": "plus",        // B1, B2, HSK 2, HSK 3
  "level.pro": "pro",          // gói chuyên ngành (tài chính – kinh doanh…)
  "quiz.listen": "plus",       // nghe đọc → chọn từ
  "quiz.type": "plus",         // tự gõ từ / pinyin
  "streak.freeze": "plus",     // 2 lần "đóng băng" chuỗi mỗi tháng
  "stats.full": "plus",        // thống kê 30 ngày, từ khó
  "notes.archive": "plus",     // đọc lại giấy nhắn cũ của mèo
  "import.csv": "pro",         // tự nhập danh sách từ
  "ai.voice": "pro",           // mèo kháy bằng AI, theo đúng từ bạn hay sai
  "skin.fedora": "pro",
  "book.unlimited": "plus",     // Sổ của tôi: Free 30 từ, Plus trở lên không giới hạn
  "read.long": "plus",          // Đọc cùng mèo: Free quét 1.500 ký tự, Plus 60.000
  "read.ai": "pro",             // mèo đọc bằng AI: giải nghĩa từ lạ theo ngữ cảnh
  "trend.all": "plus",          // Chữ nóng: Free 2 chữ/ngày mỗi thứ tiếng, Plus đủ cả mẻ
  "trend.archive": "pro",       // xem lại chữ nóng 30 ngày trước
  "weather.pick": "plus",       // tự chọn thời tiết cho vườn (Free: theo trời thật hoặc tự đổi)
  "remind.multi": "plus",       // mèo nhắc: Free 1 giờ/ngày, Plus tới 3 giờ + nhắc cứu chuỗi buổi tối
};
export const TREND_FREE = 2;
export const BOOK_LIMIT = { free: 30 };
export const READ_LIMIT = { free: 1500, plus: 60000, pro: 60000 };
export const can = (plan, feat) => RANK[plan || "free"] >= RANK[FEATURES[feat] || "free"];
export const planOf = (feat) => FEATURES[feat] || "free";
/** số từ mới tối đa mỗi ngày theo gói */
export const DAILY_OPTS = { free: [3, 5], plus: [3, 5, 10, 15, 20], pro: [3, 5, 10, 15, 20, 30, 50] };

// ------------------------------------------------------------------ PHỤ KIỆN mở theo số hoa (từ đã thuộc)
export const SKINS = [
  { id: "classic", vi: "Cổ điển", flowers: 0 },
  { id: "shades", vi: "Kính râm", flowers: 10 },
  { id: "bow", vi: "Nơ", flowers: 30 },
  { id: "fedora", vi: "Mũ phớt", flowers: 60, feat: "skin.fedora" },
];

// ------------------------------------------------------------------ NHỊP chuyển động chung (đủng đỉnh, đanh đá)
// đi bộ từ tốn (speed thấp); chạy giữ nguyên tốc độ cũ (run bù lại) – chỉ dùng lúc đuổi bướm, vồ hoa, chạy rần rần
export const CHILL = { speed: 0.58, run: 1.1, transition: 1.5, idle: 2.2, camera: 1.6, accel: 0.7 };

// ------------------------------------------------------------------ GIỌNG AI (Pro) – điền địa chỉ Worker sau khi deploy worker/ai-voice
export const AI = { endpoint: "", minGapMs: 30000, timeoutMs: 3000 };
// ------------------------------------------------------------------ MÈO NHẮC (thông báo) – điền địa chỉ Worker sau khi deploy worker/remind
// Chưa có Worker: vẫn nhắc được khi app còn mở/chạy nền (máy tính, Android). Có Worker: nhắc cả khi đã đóng app (Web Push).
export const REMIND = { endpoint: "", presets: ["07:30", "12:15", "20:30", "22:00"] };
