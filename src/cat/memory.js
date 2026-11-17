// TRÍ NHỚ & KỸ NĂNG – mèo học dần từ cách bạn đối xử (và học hành) với nó. Mọi thứ lưu trong save.cat.mem, sống qua nhiều ngày.
//  · thói quen của bạn: giờ hay mở app, giờ hay cho ăn, chỗ hay gãi
//  · cảm xúc kéo dài: GIẬN (nguôi dần, nửa đời 2 giờ) và KIÊN NHẪN (hồi dần, cạn thì bỏ đi / cào)
//  · kỹ năng lên cấp nhờ lặp lại: gọi tên, săn mồi, leo trèo, chờ ăn, đập tay
//  · sổ "mèo nhớ…" – những điều mèo đã rút ra, người chơi đọc được
import { clamp, hhmm } from "../core/util.js";

export const SKILLS = {
  callname: { vi: "Nghe gọi tên", emo: "📣", how: "Gọi mèo thường xuyên", perk: "Gọi là tới, kể cả lúc đang dỗi" },
  hunter:   { vi: "Bắt bướm", emo: "🦋", how: "Để mèo ra vườn đuổi bướm", perk: "Vồ trúng nhiều hơn" },
  climber:  { vi: "Leo trèo", emo: "🧗", how: "Để mèo tự leo trèo", perk: "Cấp 2: lên được nóc kệ sách" },
  highfive: { vi: "Đập tay", emo: "🖐️", how: "Chạm đúp vào mèo", perk: "Đập tay thành công nhiều hơn" },
};
const LV = [0, 4, 12, 28, 55, 100];
export const levelOf = (xp) => { let l = 0; while (l < LV.length - 1 && xp >= LV[l + 1]) l++; return l; };
export const nextXp = (xp) => LV[Math.min(LV.length - 1, levelOf(xp) + 1)];
const ZV = { head: "đỉnh đầu", chin: "cằm", back: "lưng", tail: "gốc đuôi" };

export function createMemory(game) {
  const s = game.save;
  const M = (s.cat.mem ||= {});
  M.visits ||= Array(24).fill(0); M.feeds ||= Array(24).fill(0); M.zones ||= { head: 0, chin: 0, back: 0, tail: 0 };
  M.skills ||= {}; for (const k in SKILLS) M.skills[k] ??= 0;
  M.notes ||= []; M.grudge ??= 0; M.patience ??= 100; M.t ??= Date.now(); M.lastVisitMark ??= 0; M.seen ||= {};

  const api = {
    M,
    /** thời gian trôi: giận nguôi, kiên nhẫn hồi */
    tick() {
      const h = (Date.now() - M.t) / 3600e3; M.t = Date.now(); if (h <= 0) return;
      M.grudge *= Math.pow(0.5, h / 2); if (M.grudge < 1) M.grudge = 0;
      M.patience = clamp(M.patience + h * 45, 0, 100);
    },
    /** đánh dấu bạn đang ở nhà (mỗi 30 phút 1 lần) → học giờ bạn hay ghé */
    visit() {
      if (Date.now() - M.lastVisitMark < 30 * 60e3) return; M.lastVisitMark = Date.now();
      const h = new Date().getHours(); M.visits[h]++;
      const u = api.usualHour(); if (u != null) api.note("visit", `Bạn hay ghé lúc ${u} giờ – tới giờ là ra ngồi chờ.`);
    },
    usualHour() { const tot = M.visits.reduce((a, b) => a + b, 0); let best = -1, bi = null; M.visits.forEach((v, i) => { if (v > best) { best = v; bi = i; } }); return best >= 3 && best / tot >= 0.22 ? bi : null; },
    usualFeedHour() { let best = -1, bi = null; M.feeds.forEach((v, i) => { if (v > best) { best = v; bi = i; } }); return best >= 2 ? bi : null; },
    fed() {
      const h = new Date().getHours(), u = api.usualFeedHour(); M.feeds[h]++;
      if (u != null && Math.abs(u - h) <= 1) api.xp("mealtime", 2); else api.xp("mealtime", 1);
      if (api.usualFeedHour() != null) api.note("feed", `Cơm thường có lúc ${api.usualFeedHour()} giờ.`);
      api.appease(25, "food");
    },
    /** gãi đúng / sai chỗ → mèo quen dần chỗ bạn hay gãi */
    pet(zone, good) {
      M.zones[zone] = clamp(M.zones[zone] + (good ? 1 : -0.6), -20, 200);
      const top = Object.entries(M.zones).sort((a, b) => b[1] - a[1])[0];
      if (top[1] >= 10) api.note("zone", `Bạn gãi ${ZV[top[0]]} giỏi nhất.`);
      if (good) { M.patience = clamp(M.patience + 1.5, 0, 100); api.appease(2); }
    },
    /** zone đã quen → cộng thêm vào sở thích hôm nay */
    learnedLike(zone) { const v = M.zones[zone], max = Math.max(...Object.values(M.zones)); return v >= 10 && v === max; },
    offend(amount, why) {
      const before = M.grudge; M.grudge = clamp(M.grudge + amount, 0, 100); M.patience = clamp(M.patience - amount * 0.8, 0, 100);
      if (before < 35 && M.grudge >= 35) { game.emit("grudge", true); game.journal("grudge", `😾 Giận bạn (${why})`); api.note("grudge-" + why, `Từng bị ${why}. Nhớ dai.`, true); }
    },
    appease(amount, how) { const before = M.grudge; M.grudge = clamp(M.grudge - amount, 0, 100); if (before >= 35 && M.grudge < 35) { game.emit("grudge", false); game.journal("grudge", `💗 Hết giận${how === "food" ? " nhờ đồ ăn" : ""}`); } },
    spend(p) { M.patience = clamp(M.patience - p, 0, 100); return M.patience; },
    get angry() { return M.grudge >= 35; },
    get grudge() { return M.grudge; },
    get patience() { return M.patience; },
    level: (k) => levelOf(M.skills[k] || 0),
    xp(k, n = 1) {
      const a = levelOf(M.skills[k]); M.skills[k] = (M.skills[k] || 0) + n; const b = levelOf(M.skills[k]);
      if (b > a) { game.emit("skill", { k, level: b }); game.journal("skill", `${SKILLS[k].emo} Lên cấp ${SKILLS[k].vi} ${b}`); }
      return b;
    },
    /** ghi 1 điều mèo "rút ra" (cùng key thì cập nhật, không trùng) */
    note(key, text, quiet = false) {
      const old = M.notes.find((n) => n.key === key);
      if (old) { if (old.text === text) return; old.text = text; old.t = Date.now(); return; }
      M.notes.unshift({ key, text, t: Date.now() }); if (M.notes.length > 30) M.notes.pop();
      if (!quiet) game.emit("note", text);
    },
    seen(id) { M.seen[id] = (M.seen[id] || 0) + 1; return M.seen[id]; },
    summary() { return { notes: M.notes.slice(0, 6).map((n) => n.text), mood: game.today.mood.vi, grudge: Math.round(M.grudge), skills: Object.fromEntries(Object.keys(SKILLS).map((k) => [k, api.level(k)])) }; },
    stamp: hhmm,
  };
  return api;
}
