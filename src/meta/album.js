// SỔ KHOẢNH KHẮC + ẢNH CHỤP – sưu tập kiểu sticker. Khoảnh khắc chưa mở hiện "???" để người chơi tò mò.
// Mở khoá: game.moment(id) (khi người chơi đang XEM đúng lúc đó). Chụp: nút 📷 → lưu dáng hiện tại thành polaroid.
import { ROOMS } from "../world/rooms.js";
import { hhmm, dayKey } from "../core/util.js";

export const MOMENTS = [
  { id: "spot:sofa", vi: "Chiếm sofa", rare: 1 }, { id: "spot:sunbeam", vi: "Tắm nắng", rare: 1 }, { id: "spot:treetop", vi: "Đỉnh trụ cào", rare: 1 },
  { id: "spot:window", vi: "Ngắm phố", rare: 1 }, { id: "spot:bed", vi: "Ngủ giường chủ", rare: 1 }, { id: "spot:catbed", vi: "Ổ riêng ấm áp", rare: 1 },
  { id: "spot:counter", vi: "Trèo lên bếp", rare: 1 }, { id: "spot:tub", vi: "Thành bồn tắm", rare: 1 }, { id: "spot:sink", vi: "Ngồi bồn rửa mặt", rare: 2 },
  { id: "spot:chair", vi: "Ghế mây ban công", rare: 2 }, { id: "spot:ledge", vi: "Đi trên lan can", rare: 2 }, { id: "spot:fridge", vi: "Nóc tủ lạnh", rare: 3 },
  { id: "spot:box", vi: "Mèo trong hộp", rare: 2 }, { id: "cup", vi: "Thủ phạm vỡ cốc", rare: 2 }, { id: "dock", vi: "Chiếm nút bấm", rare: 2 },
  { id: "highfive", vi: "Đập tay", rare: 2 }, { id: "slowblink", vi: "Chớp mắt chậm", rare: 2 }, { id: "bird", vi: "Rình chim", rare: 1 },
  { id: "butterfly", vi: "Vờn bướm", rare: 2 }, { id: "gecko", vi: "Săn thạch sùng", rare: 3 }, { id: "storm", vi: "Trốn sấm", rare: 3 },
  { id: "phantom", vi: "Thấy… gì đó", rare: 3 }, { id: "whiteeyes", vi: "Mắt trắng nửa đêm", rare: 3 }, { id: "blackout", vi: "Cúp điện", rare: 3 },
  { id: "peek", vi: "Ló mặt", rare: 3 }, { id: "shadow", vi: "Bóng ma trên tường", rare: 3 }, { id: "stranger", vi: "Mèo lạ ngoài cửa sổ", rare: 3 },
  { id: "dash", vi: "Phóng lúc 3 giờ sáng", rare: 3 }, { id: "crash", vi: "RẦM!", rare: 2 }, { id: "season", vi: "Mùa lễ cùng mèo", rare: 3 },
  // quấn người
  { id: "follow", vi: "Lẽo đẽo theo bạn", rare: 1 }, { id: "headbutt", vi: "Dụi đầu vào màn hình", rare: 2 }, { id: "gift", vi: "Quà đầu tiên", rare: 2 },
  { id: "knead", vi: "Nhào bột", rare: 2 }, { id: "belly_trap", vi: "Dính bẫy bụng", rare: 2 }, { id: "belly_ok", vi: "Được gãi bụng", rare: 3 },
  { id: "pawtap", vi: "Gõ cửa kính", rare: 2 }, { id: "sleepnear", vi: "Ngủ cạnh bạn", rare: 3 }, { id: "greetrun", vi: "Chạy ra tận cửa", rare: 2 },
];
const BG = { living: "#F4E6D2", kitchen: "#DDEBE2", bedroom: "#DCE3EC", bathroom: "#F6E1DE", balcony: "#CFE6F2" };

export function createAlbum(game) {
  const s = game.save; s.album ||= { moments: {}, photos: [] };
  const A = s.album;
  const card = (room) => ({ room, bg: BG[room] || "#F4E6D2", svg: game.R.snapshotNow(), t: Date.now(), night: (game.scene.S.night || 0) > 0.5 });
  return {
    A,
    /** mở khoá khoảnh khắc (chỉ khi người chơi đang thấy mèo, trừ khoảnh khắc không cần nhìn) */
    unlock(id, force = false) {
      const m = MOMENTS.find((x) => x.id === id); if (!m || A.moments[id]) return;
      if (!force && game.scene.room !== game.body.room) return;
      A.moments[id] = card(game.body.room); game.emit("moment", m); game.emit("q", "moment"); game.journal("moment", `📸 Khoảnh khắc mới: ${m.vi}`);
    },
    photo() {
      const c = card(game.body.room); c.caption = `${ROOMS[game.body.room].vi} · ${hhmm()} · ${dayKey()}`;
      A.photos.unshift(c); if (A.photos.length > 40) A.photos.pop(); game.emit("q", "photo"); game.journal("photo", "📷 Chụp ảnh mèo"); return c;
    },
    get count() { return Object.keys(A.moments).length; },
  };
}
