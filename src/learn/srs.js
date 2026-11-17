import { BOOK_LIMIT, TREND_FREE, DAILY_OPTS, can } from "../config.js";
// BỘ HỌC: chọn từ mới mỗi ngày + ôn lặp lại ngắt quãng (hộp Leitner 0–6).
// Đúng → lên hộp, ôn lại sau 1, 2, 4, 8, 16, 35 ngày. Sai → về hộp 1, ôn lại sau 10 phút.
// Hộp ≥ 4 = "thuộc" → nở thành 1 bông hoa trong vườn.
import { dayKey, rng, clamp } from "../core/util.js";
import { allCards, levelsOf, cardsOfLevel, nextLevel, START_LEVEL, levelTag, LADDERS, LEVEL_TAG } from "./packs.js";

const DAY = 864e5, MIN = 6e4;
export const BOX_IV = [10 * MIN, 1 * DAY, 2 * DAY, 4 * DAY, 8 * DAY, 16 * DAY, 35 * DAY];
export const MASTER = 4;
export const DAILY_MAX = { free: 5, plus: 20, pro: 50 };

export function freshLearn() {
  return { lang: "en", level: { ...START_LEVEL }, daily: 3, cards: {}, days: {}, streak: { n: 0, last: "", best: 0, freezes: 0 }, xp: 0, today: { d: "", ids: [] }, custom: [], book: [], combo: 0 };
}

export function createLearn(game) {
  const s = game.save; s.learn ||= freshLearn();
  const L = s.learn; L.level ||= { ...START_LEVEL }; for (const k in START_LEVEL) L.level[k] ||= START_LEVEL[k]; L.adapt ||= { first: [] }; L.custom ||= []; L.book ||= [];
  const cards = () => allCards(L.custom);
  const get = (id) => cards().get(id);
  const st = (id) => (L.cards[id] ||= { box: 0, due: 0, seen: 0, right: 0, wrong: 0, lapses: 0, last: 0, added: Date.now() });
  const day = (d = dayKey()) => (L.days[d] ||= { new: 0, rev: 0, right: 0, wrong: 0, xp: 0 });

  /** từ mới hôm nay: lấy theo thứ tự trộn cố định của cấp đang học, bỏ từ đã có */
  function pickToday() {
    const d = dayKey(); if (L.today.d === d && L.today.lang === L.lang) return L.today.ids;
    const booked = L.book.map((b) => get(b.id)).filter((c) => c && c.lang === L.lang && c.vi && !L.cards[c.id]);      // từ trong sổ được học trước
    const hot = api.hotToday().map((h) => h.card).filter((c) => c.vi && !L.cards[c.id] && !booked.includes(c)).slice(0, 2);      // tối đa 2 chữ nóng vào bài hôm nay
    booked.push(...hot);
    const order = levelPool(booked);
    const keep = L.today.d === d ? L.today.ids.filter((id) => get(id)?.lang === L.lang) : [];
    const seenIds = new Set(keep), want = [...booked, ...order].filter((c) => (seenIds.has(c.id) ? false : (seenIds.add(c.id), true)));      // không trùng chữ
    L.today = { d, lang: L.lang, ids: [...keep, ...want.slice(0, Math.max(0, L.daily - keep.length)).map((c) => c.id)] };
    return L.today.ids;
  }

  // HỌC THÍCH ỨNG: hết chữ ở cấp đang học → tự lên cấp kế (nếu gói cho phép); thiếu thì lấy thêm từ cấp kế
  const tierOk = (key) => { const lv = levelsOf(L.lang, L.custom).find((x) => x.key === key); return !!lv && (lv.tier === "free" || can(s.plan, lv.tier === "pro" ? "level.pro" : "level.plus")); };
  // hết chữ mà cấp kế bị khoá → mượn chữ Free cùng tiếng (đời thường, trong vườn, chữ sâu) để ngày nào cũng có chữ mới
  const FALLBACK = (lang) => [`${lang}-life/LIFE`, `${lang}-scene/SCENE`, `${lang}-deep/DEEP1`];
  function levelPool(skip = []) {
    const no = new Set(skip.map((c) => (typeof c === "string" ? c : c?.id)));      // so theo id: thẻ được tạo mới mỗi lần gọi
    const fresh = (key) => { const r = rng(L.lang + "|" + key); return cardsOfLevel(key, L.custom).filter((c) => c.lang === L.lang && !L.cards[c.id] && !no.has(c.id)).map((c) => [r(), c]).sort((a, b) => a[0] - b[0]).map((x) => x[1]); };
    let key = L.level[L.lang], out = fresh(key);
    if (!out.length) { const nx = nextLevel(key); if (nx && tierOk(nx)) { L.level[L.lang] = key = nx; out = fresh(key); setTimeout(() => game.emit("levelup", { key, tag: levelTag({ pack: key.split("/")[0], level: key.split("/")[1] }) }), 0); } }
    else if (out.length < L.daily) { const nx = nextLevel(key); if (nx && tierOk(nx)) out = out.concat(fresh(nx)); }
    if (out.length < L.daily) for (const fk of FALLBACK(L.lang)) { if (fk === key) continue; for (const c of fresh(fk)) if (!out.some((x) => x.id === c.id)) out.push(c); if (out.length >= L.daily + 3) break; }
    return out;
  }
  const api = {
    L,
    tierOk,
    /** tỉ lệ trả lời đúng ngay lần đầu của 12 chữ mới gần nhất (0–1), null nếu chưa đủ dữ liệu */
    pace() { const a = L.adapt.first.slice(-12); return a.length >= 6 ? a.reduce((x, y) => x + y, 0) / a.length : null; },
    /** học thêm hôm nay: xong bài mới mà còn hăng → cho thêm n chữ (không vượt trần của gói) */
    canExtra() { const cap = DAILY_MAX[s.plan] || 5, d = day(); return api.newToday().length === 0 && d.new < cap * 2 && levelPool(L.today.ids).length > 0; },
    extra(n = 3) { pickToday(); const more = levelPool(L.today.ids).filter((c) => !L.today.ids.includes(c.id)).slice(0, n); L.today.ids.push(...more.map((c) => c.id)); game.emit("learn", { type: "extra", n: more.length }); return more.length; },
    /** hết chữ ở cấp đang học mà cấp kế bị khoá theo gói → { next, tier } để mời nâng cấp / thi nhảy lớp */
    stalled() { const key = L.level[L.lang], nx = nextLevel(key); const left = cardsOfLevel(key, L.custom).filter((c) => !L.cards[c.id]).length; return !left && nx && !tierOk(nx) ? { next: nx, tier: levelsOf(L.lang, L.custom).find((x) => x.key === nx)?.tier } : null; },
    // ---- TỰ ĐÁNH GIÁ: nhớ lại được bao nhiêu, đều tay không, đang vững cấp nào, nên làm gì tiếp
    assess() {
      const days = [], now = new Date(); for (let i = 0; i < 14; i++) { const d = new Date(now); d.setDate(d.getDate() - i); days.push(L.days[dayKey(d)] || null); }
      const active = days.filter((d) => d && d.right + d.wrong > 0).length, full = days.slice(0, 7).filter((d) => d && d.new >= Math.min(L.daily, 3)).length;
      const tot = days.reduce((a, d) => ({ r: a.r + (d?.right || 0), w: a.w + (d?.wrong || 0) }), { r: 0, w: 0 }), acc = tot.r + tot.w >= 10 ? tot.r / (tot.r + tot.w) : null;      // chưa đủ 10 câu thì chưa kết luận
      const recall = api.pace() ?? acc;
      // cấp vững = cấp cao nhất trong lộ trình mà ≥ 50% chữ đã nhớ qua ít nhất 1 lần ôn (hộp ≥ 2)
      let solid = null, working = L.level[L.lang];
      for (const tr of LADDERS[L.lang] || []) for (const key of tr) { const C = cardsOfLevel(key, L.custom); if (!C.length) continue; const k = C.filter((c) => (L.cards[c.id]?.box || 0) >= 2).length / C.length; if (k >= 0.5) solid = key; }
      const lapses = Object.entries(L.cards).filter(([id, c]) => c.lapses > 0 && get(id)?.lang === L.lang).length;
      const tips = [];
      if (recall !== null && recall < 0.6) tips.push("Nhớ lại dưới 60%: bớt chữ mới, ôn nhiều hơn. App đã tự giảm số chữ mới mỗi ngày.");
      if (recall !== null && recall >= 0.85) tips.push("Nhớ rất tốt: có thể thi nhảy lớp hoặc tăng chữ mới.");
      if (active < 7) tips.push(`Mới học ${active}/14 ngày. Đều tay 5 phút mỗi ngày nhớ lâu hơn học dồn.`);
      if (lapses >= 5) tips.push(`${lapses} chữ quên đi quên lại: mở Sổ › Hay sai để ôn riêng.`);
      if (!tips.length) tips.push("Nhịp ổn. Giữ chuỗi ngày là đủ.");
      return { recall, acc, active, full, solid, solidTag: solid ? LEVEL_TAG[solid] : null, working, workingTag: LEVEL_TAG[working] || "", lapses, tips, log: (L.tuneLog || []).slice(-3) };
    },
    /** tự chỉnh số chữ mới mỗi ngày (1 lần/ngày): nhớ kém → giảm, nhớ tốt và đều tay → tăng; tôn trọng chỉnh tay trong 7 ngày */
    autoTune() {
      const d = dayKey(); if (L.tuneDay === d) return null; L.tuneDay = d;
      if (L.dailySetAt && Date.now() - L.dailySetAt < 7 * 864e5) return null;
      const opts = DAILY_OPTS[s.plan] || DAILY_OPTS.free, i = Math.max(0, opts.indexOf(L.daily)), a = api.assess(); let to = null, why = "";
      if (a.recall !== null && a.recall < 0.55 && L.adapt.first.length >= 8 && i > 0) { to = opts[i - 1]; why = "nhớ lại kém – bớt chữ mới, tập trung ôn"; }
      else if (a.recall !== null && a.recall >= 0.85 && a.full >= 5 && i < opts.length - 1) { to = opts[i + 1]; why = "nhớ tốt và đều tay – thêm chữ mới"; }
      if (to === null || to === L.daily) return null;
      const from = L.daily; api.setDaily(to, true); (L.tuneLog ||= []).push({ d, from, to, why }); L.tuneLog = L.tuneLog.slice(-10);
      game.emit("tune", { from, to, why }); return { from, to, why };
    },
    /** thi nhảy lớp đạt: đánh dấu các chữ đã biết + chuyển lên cấp mới */
    jumpTo(key, knownIds = []) { for (const id of knownIds) { const c = st(id); if (!c.seen) { c.seen = Date.now(); c.box = 3; c.right = 1; c.last = Date.now(); c.due = Date.now() + BOX_IV[3]; } } L.level[L.lang] = key; L.today.d = ""; game.emit("lang", L.lang); game.emit("levelup", { key, jump: true }); },
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
    answer(id, ok, o = {}) {
      const c = st(id), now = Date.now(), wasDue = c.due <= now; c.seen ||= now; c.last = now; const d = day();
      const n0 = c.right + c.wrong, first = n0 === 0;
      // nhịp học = khả năng NHỚ LẠI: tính ở lần ôn đầu tiên (sau khi đã xa chữ), hoặc lần đố "biết rồi" khi chưa xem nghĩa
      if (n0 === 1 || (first && o.blind)) { L.adapt.first.push(ok ? 1 : 0); L.adapt.first = L.adapt.first.slice(-30); }
      if (ok) {
        c.right++; d.right++; L.combo = (L.combo || 0) + 1;
        // nhảy cóc: chữ mới mà đúng ngay, và đang học nhanh → coi như đã biết sẵn, ôn thưa hơn
        if (first && o.blind && c.box === 0) { c.box = 2; c.due = now + BOX_IV[2]; d.rev++; c.skip = 1; }      // nhảy cóc: chưa xem nghĩa mà đoán đúng = biết sẵn
        else
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
    setDaily(n, auto = false) { L.daily = n; if (!auto) L.dailySetAt = Date.now(); L.today.d = ""; pickToday(); },
    levels: () => levelsOf(L.lang, L.custom),
    /** 4 lựa chọn: đáp án đúng + 3 từ cùng ngôn ngữ, ưu tiên cùng cấp */
    options(c, n = 4) {
      const same = [...cards().values()].filter((x) => x.lang === c.lang && x.id !== c.id && x.vi && x.vi !== c.vi);
      const hot = c.pack === "trend", lvl = same.filter((x) => x.level === c.level || (hot && x.pack === "trend")), pool = lvl.length >= (hot ? n - 1 : n + 2) ? lvl : same;      // chữ nóng: nhiễu cũng là chữ nóng, khỏi đoán bừa
      const out = [c]; const r = Math.random; while (out.length < n && pool.length) { const x = pool.splice(Math.floor(r() * pool.length), 1)[0]; if (!out.some((o) => o.w === x.w || o.vi === x.vi)) out.push(x); }
      return out.sort(() => r() - 0.5);
    },
    // ---- CHỮ NÓNG HÔM NAY (src/learn/trends.js nạp vào L.hot)
    hotItems: (lang = L.lang) => (L.hot?.items || []).filter((h) => h.lang === lang).map((h) => ({ ...h, card: get(h.id) })).filter((h) => h.card),
    hotToday(lang = L.lang) { const all = api.hotItems(lang); return can(s.plan, "trend.all") ? all : all.slice(0, TREND_FREE); },
    hotLocked(lang = L.lang) { return api.hotItems(lang).length - api.hotToday(lang).length; },
    hotOf: (id) => (L.hot?.items || []).find((h) => h.id === id) || (L.hot?.archive || []).flatMap((a) => a.items).find((h) => h.id === id),
    // ---- SỔ CỦA TÔI: lưu từ từ app, từ đoạn đọc ké, từ tiện ích Chrome
    booked: (id) => L.book.some((b) => b.id === id),
    book() { return L.book.map((b) => ({ ...b, card: get(b.id) })).filter((b) => b.card); },
    /** lưu 1 từ. item: thẻ có sẵn, hoặc { w, lang, vi?, ph?, ctx?, src?, url? } (từ lạ → tạo thẻ riêng) */
    bookmark(item, plan = "free") {
      if (!can(plan, "book.unlimited") && L.book.length >= BOOK_LIMIT.free) return { ok: false, full: true };
      let c = item.id ? get(item.id) : null;
      if (!c) {
        const lang = item.lang || (/[\u3040-\u30ff]/.test(item.w) ? "ja" : /[\u4e00-\u9fff]/.test(item.w) ? "zh" : "en"), w = String(item.w || "").trim().slice(0, 40); if (!w) return { ok: false };
        const pack = [...cards().values()].find((x) => x.lang === lang && x.w.toLowerCase() === w.toLowerCase());
        c = pack || { id: `${lang}:my:${w.toLowerCase()}`, lang, pack: "book", level: "book", w, ph: item.ph || "", pos: "", vi: item.vi || "", ex: item.ctx || "", exPh: "", exVi: "" };
        if (!pack && !L.custom.some((x) => x.id === c.id)) L.custom.push(c);
      }
      if (L.book.some((b) => b.id === c.id)) return { ok: true, card: c, dup: true };
      L.book.unshift({ id: c.id, t: Date.now(), src: item.src || "app", url: item.url || "", ctx: (item.ctx || "").slice(0, 200) });
      game.emit("book", c); return { ok: true, card: c };
    },
    unbook(id) { L.book = L.book.filter((b) => b.id !== id); (L.bookGone ||= {})[id] = Date.now(); game.emit("book", null); },      // bookGone: dấu đã xoá, để đồng bộ không hồi sinh chữ đã bỏ
    /** điền nghĩa cho từ lạ đã lưu */
    setMeaning(id, vi) { const c = L.custom.find((x) => x.id === id); if (c) { c.vi = vi.trim().slice(0, 80); game.emit("book", c); } },
    counts() { const all = Object.entries(L.cards).filter(([id]) => get(id)?.lang === L.lang).map(([, c]) => c); return { learning: all.filter((c) => c.seen && c.box < MASTER).length, mastered: all.filter((c) => c.box >= MASTER).length, total: cardsOfLevel(L.level[L.lang], L.custom).length }; },
  };
  return api;
}
