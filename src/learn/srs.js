import { BOOK_LIMIT, can } from "../config.js";
// BỘ HỌC: chọn từ mới mỗi ngày + ôn lặp lại ngắt quãng (hộp Leitner 0–6).
// Đúng → lên hộp, ôn lại sau 1, 2, 4, 8, 16, 35 ngày. Sai → về hộp 1, ôn lại sau 10 phút.
// Hộp ≥ 4 = "thuộc" → nở thành 1 bông hoa trong vườn.
import { dayKey, rng, clamp } from "../core/util.js";
import { allCards, levelsOf, cardsOfLevel } from "./packs.js";

const DAY = 864e5, MIN = 6e4;
export const BOX_IV = [10 * MIN, 1 * DAY, 2 * DAY, 4 * DAY, 8 * DAY, 16 * DAY, 35 * DAY];
export const MASTER = 4;
export const DAILY_MAX = { free: 5, plus: 20, pro: 50 };

export function freshLearn() {
  return { lang: "en", level: { en: "en-core/A2", zh: "zh-core/HSK1" }, daily: 3, cards: {}, days: {}, streak: { n: 0, last: "", best: 0, freezes: 0 }, xp: 0, today: { d: "", ids: [] }, custom: [], book: [], combo: 0 };
}

export function createLearn(game) {
  const s = game.save; s.learn ||= freshLearn();
  const L = s.learn; L.level ||= { en: "en-core/A2", zh: "zh-core/HSK1" }; L.custom ||= []; L.book ||= [];
  const cards = () => allCards(L.custom);
  const get = (id) => cards().get(id);
  const st = (id) => (L.cards[id] ||= { box: 0, due: 0, seen: 0, right: 0, wrong: 0, lapses: 0, last: 0, added: Date.now() });
  const day = (d = dayKey()) => (L.days[d] ||= { new: 0, rev: 0, right: 0, wrong: 0, xp: 0 });

  /** từ mới hôm nay: lấy theo thứ tự trộn cố định của cấp đang học, bỏ từ đã có */
  function pickToday() {
    const d = dayKey(); if (L.today.d === d && L.today.lang === L.lang) return L.today.ids;
    const booked = L.book.map((b) => get(b.id)).filter((c) => c && c.lang === L.lang && c.vi && !L.cards[c.id]);      // từ trong sổ được học trước
    const pool = cardsOfLevel(L.level[L.lang], L.custom).filter((c) => c.lang === L.lang && !L.cards[c.id] && !booked.includes(c));
    const r = rng(L.lang + "|" + L.level[L.lang]); const order = pool.map((c) => [r(), c]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    const keep = L.today.d === d ? L.today.ids.filter((id) => get(id)?.lang === L.lang) : [];
    const want = [...booked, ...order].filter((c) => !keep.includes(c.id));
    L.today = { d, lang: L.lang, ids: [...keep, ...want.slice(0, Math.max(0, L.daily - keep.length)).map((c) => c.id)] };
    return L.today.ids;
  }

  const api = {
    L,
    get lang() { return L.lang; },
    card: get,
    stat: (id) => L.cards[id],
    /** từ mới hôm nay chưa học */
    newToday() { return pickToday().filter((id) => { const c = L.cards[id]; return !c || c.right + c.wrong === 0; }).map(get).filter(Boolean); },
    /** mọi từ của hôm nay (để vẽ lên tường) */
    todayCards() { return pickToday().map(get).filter(Boolean); },
    /** từ tới hạn ôn của ngôn ngữ đang học */
    due(now = Date.now()) { return Object.entries(L.cards).filter(([id, c]) => c.seen && c.right + c.wrong > 0 && c.due <= now && get(id)?.lang === L.lang).sort((a, b) => a[1].due - b[1].due).map(([id]) => get(id)); },
    /** từ đã thuộc (vẽ hoa) – mọi ngôn ngữ */
    mastered() { return Object.entries(L.cards).filter(([, c]) => c.box >= MASTER).map(([id]) => get(id)).filter(Boolean); },
    learning() { return Object.entries(L.cards).filter(([id, c]) => c.seen && c.box < MASTER && get(id)?.lang === L.lang).map(([id]) => get(id)); },
    /** từ "khó" = sai nhiều */
    weak(n = 5) { return Object.entries(L.cards).filter(([id, c]) => c.wrong > 0 && get(id)?.lang === L.lang).sort((a, b) => (b[1].lapses * 2 + b[1].wrong - b[1].right) - (a[1].lapses * 2 + a[1].wrong - a[1].right)).slice(0, n).map(([id]) => get(id)); },
    /** việc còn lại hôm nay */
    todo() { return { neu: api.newToday().length, due: api.due().length }; },
    /** đã xem thẻ (học từ mới) */
    seen(id) { const c = st(id); if (!c.seen) { c.seen = Date.now(); c.box = 0; c.due = Date.now(); day().new++; game.emit("learn", { type: "new", id }); } },
    /** chấm 1 câu trả lời. Trả về { ok, box, mastered, lapses } */
    answer(id, ok) {
      const c = st(id), now = Date.now(), wasDue = c.due <= now; c.seen ||= now; c.last = now; const d = day();
      if (ok) {
        c.right++; d.right++; L.combo = (L.combo || 0) + 1;
        if (wasDue || c.box === 0) { c.box = clamp(c.box + 1, 0, BOX_IV.length - 1); c.due = now + BOX_IV[c.box] * (0.9 + Math.random() * 0.2); d.rev++; }
      } else { c.wrong++; d.wrong++; L.combo = 0; if (c.box >= 2) c.lapses++; c.box = Math.min(c.box, 1); c.due = now + BOX_IV[0]; }
      const xp = ok ? 10 + Math.min(10, L.combo) : 2; L.xp += xp; d.xp += xp;
      const mastered = ok && c.box === MASTER;
      api.touchStreak(); game.emit("learn", { type: "answer", id, ok, box: c.box, mastered, combo: L.combo, xp });
      return { ok, box: c.box, mastered, lapses: c.lapses, combo: L.combo, xp };
    },
    /** chuỗi ngày học: tính khi trả lời ít nhất 1 câu trong ngày */
    touchStreak() {
      const S = L.streak, d = dayKey(); if (S.last === d) return;
      const y = new Date(); y.setDate(y.getDate() - 1); const yd = dayKey(y);
      const y2 = new Date(); y2.setDate(y2.getDate() - 2);
      if (S.last === yd) S.n++; else if (S.last === dayKey(y2) && S.freezes > 0) { S.freezes--; S.n++; } else S.n = 1;
      S.last = d; S.best = Math.max(S.best, S.n); game.emit("streak", S.n);
    },
    /** chuỗi còn sống? (hôm qua hoặc hôm nay có học) */
    streakAlive() { const S = L.streak, y = new Date(); y.setDate(y.getDate() - 1); return S.last === dayKey() || S.last === dayKey(y) ? S.n : 0; },
    doneToday() { const t = api.todo(); return t.neu === 0 && t.due === 0; },
    studiedToday() { const d = L.days[dayKey()]; return !!d && d.right + d.wrong > 0; },
    day,
    setLang(l) { if (L.lang === l) return; L.lang = l; L.combo = 0; game.emit("lang", l); },
    setLevel(key) { L.level[L.lang] = key; L.today.d = ""; game.emit("lang", L.lang); },
    setDaily(n) { L.daily = n; L.today.d = ""; pickToday(); },
    levels: () => levelsOf(L.lang, L.custom),
    /** 4 lựa chọn: đáp án đúng + 3 từ cùng ngôn ngữ, ưu tiên cùng cấp */
    options(c, n = 4) {
      const same = [...cards().values()].filter((x) => x.lang === c.lang && x.id !== c.id && x.vi && x.vi !== c.vi);
      const lvl = same.filter((x) => x.level === c.level), pool = lvl.length >= n + 2 ? lvl : same;
      const out = [c]; const r = Math.random; while (out.length < n && pool.length) { const x = pool.splice(Math.floor(r() * pool.length), 1)[0]; if (!out.some((o) => o.w === x.w || o.vi === x.vi)) out.push(x); }
      return out.sort(() => r() - 0.5);
    },
    // ---- SỔ CỦA TÔI: lưu từ từ app, từ đoạn đọc ké, từ tiện ích Chrome
    booked: (id) => L.book.some((b) => b.id === id),
    book() { return L.book.map((b) => ({ ...b, card: get(b.id) })).filter((b) => b.card); },
    /** lưu 1 từ. item: thẻ có sẵn, hoặc { w, lang, vi?, ph?, ctx?, src?, url? } (từ lạ → tạo thẻ riêng) */
    bookmark(item, plan = "free") {
      if (!can(plan, "book.unlimited") && L.book.length >= BOOK_LIMIT.free) return { ok: false, full: true };
      let c = item.id ? get(item.id) : null;
      if (!c) {
        const lang = item.lang || (/[\u4e00-\u9fff]/.test(item.w) ? "zh" : "en"), w = String(item.w || "").trim().slice(0, 40); if (!w) return { ok: false };
        const pack = [...cards().values()].find((x) => x.lang === lang && x.w.toLowerCase() === w.toLowerCase());
        c = pack || { id: `${lang}:my:${w.toLowerCase()}`, lang, pack: "book", level: "book", w, ph: item.ph || "", pos: "", vi: item.vi || "", ex: item.ctx || "", exPh: "", exVi: "" };
        if (!pack && !L.custom.some((x) => x.id === c.id)) L.custom.push(c);
      }
      if (L.book.some((b) => b.id === c.id)) return { ok: true, card: c, dup: true };
      L.book.unshift({ id: c.id, t: Date.now(), src: item.src || "app", url: item.url || "", ctx: (item.ctx || "").slice(0, 200) });
      game.emit("book", c); return { ok: true, card: c };
    },
    unbook(id) { L.book = L.book.filter((b) => b.id !== id); game.emit("book", null); },
    /** điền nghĩa cho từ lạ đã lưu */
    setMeaning(id, vi) { const c = L.custom.find((x) => x.id === id); if (c) { c.vi = vi.trim().slice(0, 80); game.emit("book", c); } },
    counts() { const all = Object.entries(L.cards).filter(([id]) => get(id)?.lang === L.lang).map(([, c]) => c); return { learning: all.filter((c) => c.seen && c.box < MASTER).length, mastered: all.filter((c) => c.box >= MASTER).length, total: cardsOfLevel(L.level[L.lang], L.custom).length }; },
  };
  return api;
}
