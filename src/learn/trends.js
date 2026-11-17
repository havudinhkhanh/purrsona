// CHỮ NÓNG HÔM NAY: mỗi sáng một mẻ chữ đang nổi trên báo và mạng (data/trends/latest.json,
// do việc chạy hằng ngày soạn rồi kiểm bằng tools/trend-check.mjs). App tải về, biến thành thẻ học.
// Chữ đã có trong gói thì dùng lại thẻ của gói; chữ mới thành thẻ riêng "lang:hot:chữ" (pack "trend").
import { save } from "../core/store.js";
import { dayKey } from "../core/util.js";

const KEEP_DAYS = 30;
const cut = (x, n) => String(x ?? "").slice(0, n);

export async function loadTrends(game) {
  let data;
  try { const r = await fetch("data/trends/latest.json", { cache: "no-cache" }); if (!r.ok) return false; data = await r.json(); } catch { return false; }
  return applyTrends(game, data);
}

/** nạp một mẻ chữ nóng; trả về true nếu là mẻ mới */
export function applyTrends(game, data) {
  const s = game.save, L = s.learn, learn = game.learn;
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data.d) || !Array.isArray(data.words)) return false;
  const sig = `${data.d}|${data.words.length}|${data.words.map((x) => x.w).join(",")}`.slice(0, 400);
  L.hot ||= { d: "", sig: "", items: [], archive: [] };
  if (L.hot.sig === sig) return false;
  const items = [];
  for (const x of data.words.slice(0, 14)) {
    if (!x || !x.w || !x.vi || !["en", "zh", "ja"].includes(x.lang)) continue;
    const w = cut(x.w, 40), packId = `${x.lang}:${w}`;
    let id = learn.card(packId) && learn.card(packId).pack !== "trend" ? packId : `${x.lang}:hot:${w.toLowerCase()}`;
    if (id !== packId || !learn.card(id)) {
      const c = { id, lang: x.lang, pack: "trend", level: data.d, w, ph: cut(x.ph, 60), pos: cut(x.pos, 30), vi: cut(x.vi, 90), ex: cut(x.ex, 160), exPh: cut(x.exPh, 200), exVi: cut(x.exVi, 200) };
      const i = L.custom.findIndex((y) => y.id === id); if (i >= 0) L.custom[i] = c; else L.custom.push(c);
    }
    items.push({ id, lang: x.lang, tag: cut(x.tag, 20), level: cut(x.level, 8), why: cut(x.why, 140), src: (x.src || []).filter((y) => /^https:\/\//.test(y?.u || "")).slice(0, 2).map((y) => ({ t: cut(y.t, 40), u: cut(y.u, 300) })) });
  }
  if (!items.length) return false;
  const fresh = L.hot.d !== data.d;
  if (fresh && L.hot.d && L.hot.items.length) L.hot.archive = [{ d: L.hot.d, items: L.hot.items }, ...(L.hot.archive || []).filter((a) => a.d !== L.hot.d)].slice(0, KEEP_DAYS);
  L.hot.d = data.d; L.hot.sig = sig; L.hot.items = items;
  // dọn thẻ chữ nóng cũ: không còn trong 30 ngày, chưa học, không nằm trong sổ
  const live = new Set([...items, ...L.hot.archive.flatMap((a) => a.items)].map((h) => h.id)), booked = new Set(L.book.map((b) => b.id));
  L.custom = L.custom.filter((c) => c.pack !== "trend" || live.has(c.id) || L.cards[c.id] || booked.has(c.id));
  // chưa học chữ nào hôm nay thì cho chữ nóng vào danh sách hôm nay luôn
  if (fresh && L.today.d === dayKey() && !L.today.ids.some((id) => L.cards[id]?.right + L.cards[id]?.wrong > 0)) L.today.d = "";
  save(s); game.emit("hot", { fresh, items });
  return true;
}
