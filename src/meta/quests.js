// NHIỆM VỤ HẰNG NGÀY – mỗi ngày bốc 3 việc nhỏ (cùng ngày → cùng nhiệm vụ). Game bắn tín hiệu game.emit("q", tên).
import { rng, dayKey } from "../core/util.js";

export const QUESTS = [
  { id: "pet_like", vi: "Gãi đúng chỗ mèo thích 3 lần", ev: "pet_like", n: 3, reward: 8 },
  { id: "feed", vi: "Cho mèo ăn", ev: "feed", n: 1, reward: 4 },
  { id: "checkin", vi: "Theo mèo check-in 3 phòng", ev: "checkin", n: 3, reward: 6 },
  { id: "play", vi: "Chơi cùng mèo 5 lượt", ev: "play_hit", n: 5, reward: 8 },
  { id: "highfive", vi: "Đập tay thành công", ev: "highfive", n: 1, reward: 10 },
  { id: "photo", vi: "Chụp 2 tấm ảnh mèo", ev: "photo", n: 2, reward: 6 },
  { id: "moment", vi: "Mở khoá 1 khoảnh khắc mới", ev: "moment", n: 1, reward: 12 },
  { id: "clean", vi: "Dọn dẹp nhà", ev: "clean", n: 1, reward: 4 },
  { id: "call", vi: "Gọi mèo tới 2 lần", ev: "call_come", n: 2, reward: 6 },
  { id: "scare", vi: "Sống sót qua 1 pha hù", ev: "scare", n: 1, reward: 12 },
  { id: "watch", vi: "Ngồi ngắm mèo 5 phút", ev: "watch_min", n: 5, reward: 6 },
  { id: "music", vi: "Bật nhạc chill cho mèo", ev: "music", n: 1, reward: 3 },
];

export function createQuests(game) {
  const s = game.save;
  function today() {
    const d = dayKey();
    if (s.quests?.day !== d) { const r = rng("quest|" + d), pool = QUESTS.slice(), ids = []; for (let i = 0; i < 3; i++) ids.push(pool.splice(Math.floor(r() * pool.length), 1)[0].id); s.quests = { day: d, ids, p: {}, claimed: {} }; }
    return s.quests;
  }
  game.on("q", (ev) => {
    const q = today(); let changed = false;
    for (const id of q.ids) { const def = QUESTS.find((x) => x.id === id); if (def.ev === ev && (q.p[id] || 0) < def.n) { q.p[id] = (q.p[id] || 0) + 1; changed = true; if (q.p[id] === def.n) game.emit("toast", { text: `🎯 Xong nhiệm vụ: ${def.vi} – nhận ${def.reward} 🐟` }); } }
    if (changed) game.emit("quests");
  });
  return {
    list() { const q = today(); return q.ids.map((id) => { const d = QUESTS.find((x) => x.id === id); return { ...d, p: Math.min(d.n, q.p[id] || 0), claimed: !!q.claimed[id] }; }); },
    claim(id) { const q = today(), d = QUESTS.find((x) => x.id === id); if (!d || q.claimed[id] || (q.p[id] || 0) < d.n) return 0; q.claimed[id] = 1; game.coins(d.reward, "quest"); game.emit("quests"); return d.reward; },
    get claimable() { return this.list().filter((x) => x.p >= x.n && !x.claimed).length; },
  };
}
