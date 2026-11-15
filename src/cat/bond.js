// GẮN BÓ: điểm 0–100 giữa mèo và bạn. Mỗi bậc mở khoá một kiểu "quấn người" mới.
// Tăng khi chăm đúng cách (vuốt đúng chỗ, cho ăn lúc đói, chơi, nhận quà, ghé thăm mỗi ngày), giảm nhẹ khi bỏ bê nhiều ngày.
import { clamp, dayKey } from "../core/util.js";
import { save, log } from "../core/store.js";

export const TIERS = [
  { min: 0, id: "stranger", vi: "Người lạ", emo: "🙀", unlock: "Còn dè chừng. Cho ăn đúng giờ, vuốt đúng chỗ để làm quen." },
  { min: 12, id: "known", vi: "Quen mặt", emo: "😼", unlock: "Lẽo đẽo đi theo khi bạn sang phòng khác." },
  { min: 28, id: "friend", vi: "Bạn", emo: "😺", unlock: "Dụi đầu vào màn hình, tha quà về, chớp mắt chậm với bạn." },
  { min: 50, id: "bestie", vi: "Bạn thân", emo: "😻", unlock: "Nhào bột, khoe bụng (coi chừng bẫy), gõ màn hình khi nhớ bạn." },
  { min: 75, id: "soul", vi: "Tri kỷ", emo: "💞", unlock: "Ngủ ngay cạnh bạn, chạy ra tận cửa đón, thư mỗi sáng dài hơn." },
];
export const tierIndex = (b) => { let i = 0; TIERS.forEach((t, k) => { if (b >= t.min) i = k; }); return i; };

export function createBond(game) {
  const s = game.save;
  // bỏ bê quá 3 ngày → nguội dần, nhưng không rơi khỏi bậc hiện có quá 1 bậc
  const gapD = (Date.now() - (game.lastSeen0 || Date.now())) / 864e5;
  if (gapD > 3) { const floor = TIERS[Math.max(0, tierIndex(s.cat.bond) - 1)].min; s.cat.bond = Math.max(floor, s.cat.bond - Math.min(8, (gapD - 3) * 1.5)); }
  const B = {
    get v() { return s.cat.bond; },
    get tier() { return tierIndex(s.cat.bond); },
    get T() { return TIERS[tierIndex(s.cat.bond)]; },
    get next() { return TIERS[tierIndex(s.cat.bond) + 1] || null; },
    /** % tiến tới bậc kế */
    get pct() { const i = tierIndex(s.cat.bond), a = TIERS[i].min, b = TIERS[i + 1]?.min ?? 100; return Math.round(clamp((s.cat.bond - a) / (b - a), 0, 1) * 100); },
    at: (id) => tierIndex(s.cat.bond) >= TIERS.findIndex((t) => t.id === id),
    gain(n, why) {
      const before = tierIndex(s.cat.bond); s.cat.bond = clamp(s.cat.bond + n, 0, 100); const after = tierIndex(s.cat.bond);
      game.emit("bond", { n, why });
      if (after > before) { const t = TIERS[after]; log(s, "bond", `${t.emo} Thành ${t.vi} của nhau`); save(s, true); game.emit("bond-up", t); }
    },
  };
  // ghé thăm mỗi ngày = thêm một chút thân
  if (s.bondDay !== dayKey()) { s.bondDay = dayKey(); B.gain(1.5, "visit"); }
  return B;
}
