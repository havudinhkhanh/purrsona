// TÍNH CÁCH: gốc (cố định theo từng con, trong cat.json) + TÂM TRẠNG HÔM NAY (đổi mỗi ngày, cùng ngày luôn giống nhau)
// + SỞ THÍCH HÔM NAY (chỗ thích được gãi, đồ chơi ưa, chỗ ngủ ưa, món ghét) – người chơi tự khám phá.
import { rng, dayKey, weighted, pick, clamp } from "../core/util.js";

export const TRAITS = { playful: "Ham chơi", lazy: "Lười", curious: "Tò mò", affectionate: "Tình cảm", sassy: "Đanh đá", greedy: "Tham ăn", brave: "Gan dạ" };

export const MOODS = [
  { id: "zoomie", vi: "Tăng động", emo: "⚡", desc: "Chạy khắp nhà, khó ngồi yên. Chơi laser với bé hôm nay là hết sẩy.", mod: { playful: 0.35, lazy: -0.4, curious: 0.15 }, w: (t) => t.playful, speed: 1.25 },
  { id: "sleepy", vi: "Lười biếng", emo: "☁️", desc: "Ngủ là chính, dậy là phụ. Đừng gọi trừ khi có đồ ăn.", mod: { lazy: 0.45, playful: -0.3, curious: -0.2 }, w: (t) => t.lazy, speed: 0.8 },
  { id: "diva", vi: "Õng ẹo", emo: "💅", desc: "Chỉ chịu được vuốt đúng chỗ, đúng chiều. Sai là quay lưng.", mod: { sassy: 0.35, affectionate: -0.2 }, w: (t) => t.sassy, speed: 0.95 },
  { id: "clingy", vi: "Bám người", emo: "💕", desc: "Đi đâu theo đó, gọi là tới. Hôm nay dễ thương bất thường.", mod: { affectionate: 0.5, sassy: -0.3 }, w: (t) => 1 - t.sassy * 0.5 + t.affectionate, speed: 1 },
  { id: "explorer", vi: "Tò mò", emo: "🔍", desc: "Lục mọi phòng, leo mọi chỗ. Dễ check-in nhiều phòng nhất.", mod: { curious: 0.45, brave: 0.2 }, w: (t) => t.curious, speed: 1.05 },
  { id: "grumpy", vi: "Cáu kỉnh", emo: "😾", desc: "Đụng vào là cào. Để bé yên, cho ăn đúng giờ là được.", mod: { sassy: 0.4, affectionate: -0.4, playful: -0.15 }, w: (t) => t.sassy * 0.6, speed: 0.95 },
  { id: "foodie", vi: "Thèm ăn", emo: "🐟", desc: "Đòi ăn liên tục, ngồi canh bát. Cho ăn là thân ngay.", mod: { greedy: 0.5 }, w: (t) => t.greedy, speed: 1 },
  { id: "poet", vi: "Mơ màng", emo: "🌙", desc: "Ngồi bậu cửa sổ ngắm trời hàng giờ. Rất triết lý.", mod: { curious: 0.1, lazy: 0.15, playful: -0.2 }, w: (t) => 0.5 + t.curious * 0.3, speed: 0.9 },
];
export const ZONES = { head: "Đỉnh đầu", chin: "Cằm", back: "Lưng", tail: "Gốc đuôi" };
export const TOYS = { "toy.yarn": "Cuộn len", "toy.laser": "Đèn laser", "toy.feather": "Cần lông vũ" };
export const SPOTS = { sofa: "Sofa", sunbeam: "Vệt nắng", treetop: "Đỉnh trụ cào", bed: "Giường chủ", catbed: "Ổ riêng", window: "Bậu cửa sổ", chair: "Ghế mây", counter: "Mặt bếp", tub: "Thành bồn tắm" };

/** tính cách hôm nay của con mèo id (cùng ngày → cùng kết quả trên mọi máy) */
export function today(cat, date = new Date()) {
  const key = dayKey(date), r = rng(cat.id + "|" + key), base = cat.personality || {};
  const mood = weighted(MOODS, (m) => 0.25 + m.w(base), r);
  const traits = {}; for (const k in TRAITS) traits[k] = clamp((base[k] ?? 0.5) + (mood.mod[k] || 0) + (r() - 0.5) * 0.16, 0, 1);
  const zones = Object.keys(ZONES), likeZone = pick(zones, r), hateZone = pick(zones.filter((z) => z !== likeZone), r);
  return {
    key, mood, traits,
    likeZone, hateZone,
    toy: pick(Object.keys(TOYS), r),
    spot: pick(Object.keys(SPOTS), r),
    // giờ "điên" buổi tối (mèo hay chạy rần rần lúc chạng vạng)
    crazyHour: 19 + Math.floor(r() * 4),
  };
}

// ------------------------------------------------------------------ THÓI TẬT CỐ ĐỊNH (bốc ngẫu nhiên 2 cái lúc mới nhận nuôi – theo mèo cả đời)
// mod: hoạt động → hệ số điểm; spot: chỗ → hệ số; khác: cờ cho bộ não / sự kiện
export const QUIRKS = [
  { id: "faucet", vi: "Mê nước vòi", emo: "🚰", desc: "Hay ngồi trong bồn rửa mặt chờ nước chảy.", spot: { sink: 3 } },
  { id: "bedhog", vi: "Chiếm giường chủ", emo: "🛏️", desc: "Ngủ giữa giường của bạn, không phải ổ riêng.", spot: { bed: 3, catbed: 0.4 } },
  { id: "boxlover", vi: "Nghiện hộp giấy", emo: "📦", desc: "Thấy hộp là chui vào, không cần biết to nhỏ.", spot: { box: 4 } },
  { id: "laserhater", vi: "Coi thường laser", emo: "🙄", desc: "Biết thừa chấm đỏ là trò lừa. Hiếm khi đuổi.", laser: 0.35 },
  { id: "nightsinger", vi: "Ca sĩ nửa đêm", emo: "🎤", desc: "Kêu to lúc khuya không vì lý do gì.", night: 1 },
  { id: "geckohunter", vi: "Thợ săn thạch sùng", emo: "🦎", desc: "Nghe tiếng chắc chắc là bật dậy.", gecko: 2 },
  { id: "counterthief", vi: "Đạo chích mặt bếp", emo: "🥷", desc: "Thích nhảy lên bếp và đẩy đồ rơi.", mod: { knock: 2.5, perch: 1.3 } },
  { id: "windowpoet", vi: "Thi sĩ cửa sổ", emo: "🪟", desc: "Có thể ngắm trời cả buổi chiều.", mod: { watch: 2 } },
  { id: "velcro", vi: "Mèo dán keo", emo: "🧲", desc: "Thích ở cùng phòng với bạn hơn mọi chỗ khác.", mod: { seek: 2 } },
  { id: "foodclock", vi: "Đồng hồ báo cơm", emo: "⏰", desc: "Đói đúng giờ, réo đúng giờ, kể cả 5 giờ sáng.", mod: { dawnyell: 2.5, beg: 1.5 } },
];
export function quirksOf(cat, adoptedAt) {
  const r = rng(cat.id + "|quirk|" + adoptedAt), a = QUIRKS.slice();
  const out = []; for (let i = 0; i < 2; i++) out.push(a.splice(Math.floor(r() * a.length), 1)[0]); return out;
}

// ------------------------------------------------------------------ MÓN MÊ CỦA TUẦN (đổi mỗi thứ hai)
export const OBSESSIONS = [
  { spot: "tub", vi: "Thành bồn tắm" }, { spot: "window", vi: "Bậu cửa sổ" }, { spot: "treetop", vi: "Đỉnh trụ cào" },
  { spot: "counter", vi: "Mặt bếp" }, { spot: "chair", vi: "Ghế mây ban công" }, { spot: "bed", vi: "Giường chủ" },
  { spot: "sunbeam", vi: "Vệt nắng" }, { spot: "catbed", vi: "Ổ riêng" }, { spot: "sink", vi: "Bồn rửa mặt" },
];
export function weekKey(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return dayKey(x); }
export const obsessionOf = (cat, d = new Date()) => { const r = rng(cat.id + "|week|" + weekKey(d)); return OBSESSIONS[Math.floor(r() * OBSESSIONS.length)]; };

// ------------------------------------------------------------------ TUỔI: 7 ngày đầu là mèo con (nhỏ hơn, ham chơi, chạy nhanh)
export function ageOf(adoptedAt, now = Date.now()) {
  const days = Math.floor((now - adoptedAt) / 86400e3) + 1;
  return days <= 7 ? { stage: "kitten", vi: "Mèo con", days, scale: 0.72 + days * 0.04, playful: 0.25, speed: 1.12 } : { stage: "adult", vi: "Trưởng thành", days, scale: 1, playful: 0, speed: 1 };
}
