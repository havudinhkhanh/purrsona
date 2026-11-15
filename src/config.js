// Mọi thứ hay đổi nằm ở đây: tên app, gói giá, quyền theo gói, giá đồ trong game.
export const APP = {
  name: "Purrsona",
  tagline: "Nhà có mèo · mỗi ngày một tính cách",
  saveKey: "purrsona.save.v1",
  version: "0.6.0",
};

// ------------------------------------------------------------------ GÓI (free / plus / pro)
// Khi nối thanh toán thật: chỉ cần ghi save.plan = "plus" | "pro" sau khi xác thực. Mọi chỗ khoá đều gọi can().
export const PLANS = {
  free: { vi: "Miễn phí", price: "0đ", note: "Đủ để nuôi 1 bé mèo mỗi ngày" },
  plus: { vi: "Plus", price: "39.000đ/tháng", note: "Thêm phòng, đồ chơi, nhật ký 30 ngày" },
  pro:  { vi: "Pro", price: "79.000đ/tháng", note: "Mèo riêng của bạn, mọi phòng, mọi phụ kiện" },
};
const RANK = { free: 0, plus: 1, pro: 2 };
// tính năng → gói tối thiểu
export const FEATURES = {
  "room.balcony": "plus",
  "toy.laser": "plus",
  "toy.feather": "plus",
  "journal.30d": "plus",
  "journal.all": "pro",
  "mood.forecast": "plus",
  "skin.bow": "plus",
  "skin.fedora": "pro",
  "cat.second": "plus",
  "cat.custom": "pro",
  "lab": "pro",
  "ai.voice": "pro",
  "letters.archive": "plus",
  "closeup.custom": "pro",
};

// ------------------------------------------------------------------ GIỌNG AI (Pro) – điền địa chỉ Worker sau khi deploy worker/ai-voice
// ------------------------------------------------------------------ KẾT NỐI LỊCH – điền sau khi tạo OAuth client Google / deploy worker/cal-proxy (README – Bước 11)
export const CAL = { googleClientId: "", proxy: "", days: 14 };

export const AI = { endpoint: "", minGapMs: 40000, timeoutMs: 3000 };
export const can = (plan, feat) => RANK[plan || "free"] >= RANK[FEATURES[feat] || "free"];
export const planOf = (feat) => FEATURES[feat] || "free";

// ------------------------------------------------------------------ KINH TẾ (cá khô 🐟)
// ------------------------------------------------------------------ NHỊP "ĐỦNG ĐỈNH" chung cho mọi mèo, mọi tính cách
// speed: tốc độ đi · run: tốc độ chạy (so với bản gốc) · transition: chuyển dáng chậm hơn · idle: ngồi yên lâu hơn giữa các việc · camera: máy quay lướt chậm
export const CHILL = { speed: 0.8, run: 0.7, transition: 1.35, idle: 1.6, camera: 1.7, accel: 0.48 };

export const ECON = {
  start: 30,
  idlePerHour: 6,          // × độ hạnh phúc (0–1), tối đa 12 giờ vắng mặt
  idleCapHours: 12,
  feed: 2, petGood: 1, play: 2, cleanLitter: 2, dailyVisit: 10,
  foodCost: 0,             // cho ăn luôn miễn phí – không bao giờ bắt trả tiền để mèo khỏi đói
};

export const SHOP = [
  { id: "toy.yarn",    kind: "toy",  vi: "Cuộn len",          icon: "🧶", price: 0,   owned: true },
  { id: "toy.laser",   kind: "toy",  vi: "Đèn laser",         icon: "🔴", price: 60,  feat: "toy.laser" },
  { id: "toy.feather", kind: "toy",  vi: "Cần câu lông vũ",   icon: "🪶", price: 90,  feat: "toy.feather" },
  { id: "skin.shades", kind: "skin", vi: "Kính râm",          icon: "🕶️", price: 40 },
  { id: "skin.bow",    kind: "skin", vi: "Nơ đỏ",             icon: "🎀", price: 70,  feat: "skin.bow" },
  { id: "skin.fedora", kind: "skin", vi: "Mũ phớt",           icon: "🎩", price: 150, feat: "skin.fedora" },
  { id: "room.balcony",kind: "room", vi: "Mở ban công",       icon: "🌿", price: 120, feat: "room.balcony" },
];
