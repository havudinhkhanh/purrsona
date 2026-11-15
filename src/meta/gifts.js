// QUÀ mèo tha về cho bạn. Hiếm hơn khi kỹ năng săn còn thấp. Bộ sưu tập nằm trong Sổ khoảnh khắc → Quà.
import { weighted } from "../core/util.js";

export const GIFTS = [
  { id: "mouse", emo: "🐭", vi: "Chuột bông", rare: 1 },
  { id: "sock", emo: "🧦", vi: "Chiếc tất lẻ của {sen}", rare: 1 },
  { id: "leaf", emo: "🍃", vi: "Lá cây ngoài ban công", rare: 1 },
  { id: "hairtie", emo: "🎀", vi: "Dây buộc tóc", rare: 1 },
  { id: "cap", emo: "🔘", vi: "Nắp chai", rare: 1 },
  { id: "feather", emo: "🪶", vi: "Lông chim sẻ", rare: 2 },
  { id: "cricket", emo: "🦗", vi: "Con dế (vẫn còn sống!)", rare: 2 },
  { id: "flower", emo: "🌸", vi: "Bông hoa giấy", rare: 2 },
  { id: "coin", emo: "🪙", vi: "Đồng xu dưới gầm sofa", rare: 2 },
  { id: "key", emo: "🔑", vi: "Chìa khoá dự phòng", rare: 3 },
  { id: "earbud", emo: "🎧", vi: "Tai nghe mất tích", rare: 3 },
  { id: "ring", emo: "💍", vi: "Chiếc nhẫn bạn tìm cả tuần", rare: 3 },
];
export const giftName = (g, sen) => g.vi.replaceAll("{sen}", sen);
/** chọn quà: kỹ năng săn càng cao càng dễ ra đồ hiếm */
export function pickGift(hunterLv = 0) {
  return weighted(GIFTS, (g) => (g.rare === 1 ? 6 : g.rare === 2 ? 2 + hunterLv * 0.6 : 0.4 + hunterLv * 0.35));
}
