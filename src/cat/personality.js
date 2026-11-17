// TÍNH CÁCH: gốc (cố định theo từng con, trong cat.json) + TÂM TRẠNG HÔM NAY (đổi mỗi ngày, cùng ngày luôn giống nhau)
// + SỞ THÍCH HÔM NAY (chỗ thích được gãi, đồ chơi ưa, chỗ ngủ ưa, món ghét) – người chơi tự khám phá.
import { rng, dayKey, weighted, pick, clamp } from "../core/util.js";

export const TRAITS = { playful: "Ham chơi", lazy: "Lười", curious: "Tò mò", affectionate: "Tình cảm", sassy: "Đanh đá", greedy: "Tham ăn", brave: "Gan dạ" };

export const MOODS = [
  { id: "zoomie", vi: "Tăng động", emo: "⚡", desc: "Chạy khắp nhà, ra vườn đuổi bướm. Học nhanh thì bé đỡ phá.", mod: { playful: 0.35, lazy: -0.4, curious: 0.15 }, w: (t) => t.playful, speed: 1.25 },
  { id: "sleepy", vi: "Lười biếng", emo: "☁️", desc: "Ngủ là chính. Kháy ít hơn, nhưng kháy câu nào trúng câu đó.", mod: { lazy: 0.45, playful: -0.3, curious: -0.2 }, w: (t) => t.lazy, speed: 0.8 },
  { id: "diva", vi: "Õng ẹo", emo: "💅", desc: "Khen nhỏ giọt, chê thả cửa. Sai một câu là quay lưng.", mod: { sassy: 0.35, affectionate: -0.2 }, w: (t) => t.sassy, speed: 0.95 },
  { id: "clingy", vi: "Bám người", emo: "💕", desc: "Đi đâu theo đó, đúng một câu là mừng. Hôm nay dễ thương bất thường.", mod: { affectionate: 0.5, sassy: -0.3 }, w: (t) => 1 - t.sassy * 0.5 + t.affectionate, speed: 1 },
  { id: "explorer", vi: "Tò mò", emo: "🔍", desc: "Lục khắp nhà lẫn vườn. Hay đố bất chợt chữ cũ.", mod: { curious: 0.45, brave: 0.2 }, w: (t) => t.curious, speed: 1.05 },
  { id: "grumpy", vi: "Cáu kỉnh", emo: "😾", desc: "Đụng vào là cào, sai là mắng. Học cho đủ chỉ tiêu thì yên.", mod: { sassy: 0.4, affectionate: -0.4, playful: -0.15 }, w: (t) => t.sassy * 0.6, speed: 0.95 },
  { id: "foodie", vi: "Thèm ăn", emo: "🐟", desc: "Mỗi câu đúng coi như một viên snack. Đòi liên tục.", mod: { greedy: 0.5 }, w: (t) => t.greedy, speed: 1 },
  { id: "poet", vi: "Mơ màng", emo: "🌙", desc: "Ngồi bậu cửa sổ ngắm trời, viết chữ lên tường như làm thơ.", mod: { curious: 0.1, lazy: 0.15, playful: -0.2 }, w: (t) => 0.5 + t.curious * 0.3, speed: 0.9 },
];
export const ZONES = { head: "Đỉnh đầu", chin: "Cằm", back: "Lưng", tail: "Gốc đuôi" };
export const TOYS = { "toy.yarn": "Cuộn len", "toy.laser": "Đèn laser", "toy.feather": "Cần lông vũ" };
export const SPOTS = { desk: "Bàn học", shelf: "Nóc kệ sách", sill: "Bậu cửa sổ", catbed: "Ổ riêng", rug: "Thảm", bench: "Ghế đá", branch: "Cành cây", swing: "Xích đu", flowers: "Luống hoa", sunny: "Vệt nắng" };

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
  { id: "deskhog", vi: "Chiếm bàn học", emo: "💻", desc: "Thích nằm đè lên laptop đúng lúc bạn cần học.", spot: { desk: 3 } },
  { id: "shelfking", vi: "Vua kệ sách", emo: "📚", desc: "Ngồi trên nóc kệ nhìn xuống phán xét.", spot: { shelf: 3 } },
  { id: "graffiti", vi: "Hoạ sĩ vẽ bậy", emo: "✏️", desc: "Viết lên tường nhiều gấp đôi mèo thường.", mod: { write: 2.2 } },
  { id: "butterfly", vi: "Thợ săn bướm", emo: "🦋", desc: "Ra vườn là đuổi bướm, kể cả bướm mang chữ.", mod: { chase: 2.2, explore: 1.3 } },
  { id: "examiner", vi: "Giám khảo khó tính", emo: "📝", desc: "Hay chạy tới đố bất chợt chữ cũ.", mod: { quizme: 2 } },
  { id: "windowpoet", vi: "Thi sĩ cửa sổ", emo: "🪟", desc: "Có thể ngắm trời cả buổi chiều.", mod: { watch: 2 } },
  { id: "velcro", vi: "Mèo dán keo", emo: "🧲", desc: "Thích ở cùng khu với bạn hơn mọi chỗ khác.", mod: { seek: 2 } },
  { id: "nightsinger", vi: "Ca sĩ nửa đêm", emo: "🎤", desc: "Kêu to lúc khuya, nhất là khi bạn chưa ôn bài.", night: 1 },
];
export function quirksOf(cat, adoptedAt) {
  const r = rng(cat.id + "|quirk|" + adoptedAt), a = QUIRKS.slice();
  const out = []; for (let i = 0; i < 2; i++) out.push(a.splice(Math.floor(r() * a.length), 1)[0]); return out;
}

// ------------------------------------------------------------------ MÓN MÊ CỦA TUẦN (đổi mỗi thứ hai)
export const OBSESSIONS = [
  { spot: "desk", vi: "Bàn học" }, { spot: "shelf", vi: "Nóc kệ sách" }, { spot: "sill", vi: "Bậu cửa sổ" }, { spot: "bench", vi: "Ghế đá ngoài vườn" },
  { spot: "branch", vi: "Cành cây" }, { spot: "swing", vi: "Xích đu" }, { spot: "catbed", vi: "Ổ riêng" }, { spot: "sunny", vi: "Vệt nắng ngoài vườn" },
];
export function weekKey(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return dayKey(x); }
export const obsessionOf = (cat, d = new Date()) => { const r = rng(cat.id + "|week|" + weekKey(d)); return OBSESSIONS[Math.floor(r() * OBSESSIONS.length)]; };

// ------------------------------------------------------------------ TUỔI: 7 ngày đầu là mèo con (nhỏ hơn, ham chơi, chạy nhanh)
export function ageOf(adoptedAt, now = Date.now()) {
  const days = Math.floor((now - adoptedAt) / 86400e3) + 1;
  return days <= 7 ? { stage: "kitten", vi: "Mèo con", days, scale: 0.72 + days * 0.04, playful: 0.25, speed: 1.12 } : { stage: "adult", vi: "Trưởng thành", days, scale: 1, playful: 0, speed: 1 };
}
