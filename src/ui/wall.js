// CHỮ TRÊN HÌNH NỀN – kiểu màn hình khoá: góc trái trên là từ đang học (tự đổi theo giờ),
// góc phải là giờ, ngày, chuỗi ngày học; đáy là vài chữ bấm được. Học và đố diễn ra ngay trên cảnh:
// đố thì bướm bay ra mang đáp án, chạm đúng con là xong. Không có cửa sổ bật lên.
import { esc, dayKey, pick } from "../core/util.js";
import { icon } from "./icons.js";
import { LANGS, cardsOfLevel, levelTag } from "../learn/packs.js";
import { can } from "../config.js";

const WD = ["chủ nhật", "thứ hai", "thứ ba", "thứ tư", "thứ năm", "thứ sáu", "thứ bảy"];
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\s'’\-.,!?。，！？]/g, "");

export function createWall(game, root) {
  const s = game.save, learn = game.learn, cr = game.critters;
  const el = document.createElement("div"); el.className = "typo"; root.appendChild(el);
  el.innerHTML = `<header class="hdr"><div class="when"><b class="clock"></b><span class="date"></span></div><div class="chips"></div></header>
    <section class="tl card" aria-live="polite"></section>
    <div class="scribs"></div><p class="whisper" role="status" aria-live="polite"></p>
    <nav class="tabbar" aria-label="Điều hướng">
      <button data-w="learn">${icon("bolt")}<span>Học</span><b class="badge" hidden></b></button>
      <button data-w="review">${icon("repeat")}<span>Ôn</span><b class="badge" hidden></b></button>
      <button data-w="book">${icon("book")}<span>Sổ</span></button>
      <button data-w="read">${icon("eye")}<span>Đọc ké</span></button>
      <button data-w="menu">${icon("menu")}<span>Thêm</span></button>
    </nav>`;
  const q = (x) => el.querySelector(x), tl = q(".tl");
  let blind = null, mode = "ambient", shift = 0, cur = null, series = [], quizT = 0, lastQuiz = Date.now(), shownAt = 0;

  // ------------------------------------------------------------------ đồng hồ & số liệu (góc phải)
  function clock() {
    const d = new Date(), t = learn.todo();
    q(".clock").textContent = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    q(".date").textContent = `${WD[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`;
    const st = learn.streakAlive(), fl = learn.mastered().filter((c) => c.lang === learn.lang).length;
    const W = game.weather; q(".chips").innerHTML = `${W && W.kind ? `<span class="chip-s" title="Thời tiết · ${W.st.place}">${W.label()}</span>` : ""}<span class="chip-s" title="Chuỗi ngày học">🔥 ${st || 0}</span><span class="chip-s" title="Hoa (từ đã thuộc)">🌼 ${fl}</span>`;
    const badge = (sel, n) => { const b = q(`[data-w=${sel}] .badge`); b.hidden = !n; b.textContent = n > 99 ? "99+" : n; };
    badge("learn", t.neu); badge("review", t.due);
    q("[data-w=review] span").textContent = t.due ? "Ôn" : "Đố vui";
    el.dataset.lang = learn.lang;
  }

  // ------------------------------------------------------------------ từ đang treo (đổi theo giờ)
  function features() {
    const T = learn.todayCards(), hot = learn.hotToday().map((h) => h.card), due = learn.due(), weak = learn.weak(4), mast = learn.mastered().filter((c) => c.lang === learn.lang);
    const seen = new Set(), out = [];
    for (const c of [...T, ...hot, ...due, ...weak, ...mast.slice(-6)]) if (c && !seen.has(c.id)) { seen.add(c.id); out.push(c); }
    return out;
  }
  function featured() {
    const L = features(); if (!L.length) return null;
    const mins = Math.floor((Date.now() - new Date().setHours(0, 0, 0, 0)) / 60000), every = s.settings.rotate || 15;
    return L[(Math.floor(mins / every) + shift) % L.length];
  }
  const hotInfo = (c) => { const h = learn.hotOf(c.id); return h && s.learn.hot?.items?.includes(h) ? h : null; };
  const why = (c) => { const h = hotInfo(c); return h ? `<p class="why"><b>Vì sao nóng</b> ${esc(h.why)}</p>${h.src?.[0] ? `<p class="src"><a href="${esc(h.src[0].u)}" target="_blank" rel="noopener">Đọc tin: ${esc(h.src[0].t)} ↗</a></p>` : ""}` : ""; };
  const lab = (c) => { const tg = levelTag(c); return lab0(c) + (tg && !hotInfo(c) ? ` · ${tg}` : ""); };
  const lab0 = (c) => { const st = learn.stat(c.id); if (hotInfo(c) && (!st || st.box < 4)) return `chữ nóng hôm nay · ${hotInfo(c).tag}`; if (!st || !st.seen) return "từ mới hôm nay"; if (st.box >= 4) return "đã thuộc · nhắc lại cho vui"; if (st.due <= Date.now() && st.right + st.wrong > 0) return "tới lúc ôn"; return "đang học"; };
  // thẻ chữ mặc định là widget nhỏ ở góc (để ngắm mèo); chạm vào thẻ mới mở rộng xem ví dụ, lý do, nguồn
  function write(html, cls = "", big = false) { tl.className = "tl card " + cls + (big ? " big" : " mini"); tl.innerHTML = html; tl.scrollTop = 0; tl.classList.remove("in"); void tl.offsetWidth; tl.classList.add("in"); shownAt = Date.now(); }
  const say = (c, ex = false) => `<button class="ib${ex ? " sm" : ""}" ${ex ? "data-sayex" : "data-say"}="${esc(c.id)}" aria-label="${ex ? "Nghe câu ví dụ" : "Nghe"}">${icon("speaker")}</button>`;
  const star = (c) => `<button class="ib star${learn.booked(c.id) ? " on" : ""}" data-star="${esc(c.id)}" aria-pressed="${learn.booked(c.id)}" aria-label="${learn.booked(c.id) ? "Bỏ khỏi sổ" : "Lưu vào sổ"}">${icon("star")}</button>`;
  const pauseBtn = () => `<button class="ib sm pz-btn" data-w="pause" aria-label="Tạm nghỉ học" title="Tạm nghỉ học">${icon("pause")}</button>`;
  const top = (label, c, np) => `<div class="c-top"><span class="kick">${label}</span>${c ? star(c) : ""}${np ? "" : pauseBtn()}</div>`;
  const wordH = (c) => `<div class="c-word"><h1 class="w ${c.lang}" data-say="${esc(c.id)}">${esc(c.w)}</h1>${say(c)}</div>`;
  const exBox = (c) => (c.ex ? `<div class="exbox"><div><p class="ex ${c.lang}">${esc(c.ex)}</p>${c.exPh ? `<p class="exph">${esc(c.exPh)}</p>` : ""}${c.exVi ? `<p class="exvi">${esc(c.exVi)}</p>` : ""}</div>${say(c, true)}</div>` : "");
  const body = (c) => `${wordH(c)}<p class="ph">${esc(c.ph || "")}${c.pos ? ` · ${esc(c.pos)}` : ""}</p><p class="vi">${esc(c.vi)}</p>${exBox(c)}${why(c)}`;
  const autoSay = (c) => { if (s.settings.tts && s.settings.autoSay !== false && navigator.userActivation?.hasBeenActive && !document.hidden) setTimeout(() => game.speakCard(c, false, false), 500); };
  // TRANH CHỮ: chữ sâu + 1 câu như hình nền, chữ to nằm giữa khoảng trời trống; học vẫn ở nút Học
  const posterOn = () => (s.settings.home || "poster") === "poster";
  function deepList() {
    const L = cardsOfLevel(`${learn.lang}-deep/DEEP1`); if (can(s.plan, "level.plus")) L.push(...cardsOfLevel(`${learn.lang}-deep/DEEP2`));
    return L;
  }
  function deepFeatured() {
    const L = deepList(); if (!L.length) return null;
    const mins = Math.floor((Date.now() - new Date().setHours(0, 0, 0, 0)) / 60000), every = s.settings.rotate || 15, day = Math.floor(Date.now() / 864e5);
    return L[((Math.floor(mins / every) + shift + day * 7) % L.length + L.length) % L.length];
  }
  function poster(force) {
    const c = deepFeatured(); if (!c) return false;
    if (!force && cur && cur.id === c.id && tl.dataset.id === c.id && tl.classList.contains("poster")) return true;
    cur = c; tl.dataset.id = c.id; const t = learn.todo(), n = t.neu + t.due;
    write(`<p class="p-kick">chữ sâu · ${esc(LANGS[c.lang].vi.replace(/^Tiếng /, ""))}</p>
      <h1 class="pw ${c.lang}" data-say="${esc(c.id)}">${esc(c.w)}</h1>
      <p class="pph">${esc(c.ph || "")}<span>·</span>${esc(c.vi)}</p>
      ${c.ex ? `<p class="pex ${c.lang}" data-sayex="${esc(c.id)}">${esc(c.ex)}</p>${c.exPh ? `<p class="pexph">${esc(c.exPh)}</p>` : ""}<p class="pexvi">${esc(c.exVi || "")}</p>` : ""}
      <div class="pacts">${say(c)}${star(c)}<button class="ib" data-w="pause" aria-label="Tạm nghỉ học">${icon("pause")}</button><button class="ib" data-w="next" aria-label="Chữ khác">${icon("arrow")}</button>${learn.stat(c.id)?.seen ? `<button class="pchip ghost" data-w="quizme">Đố chữ này</button>` : `<button class="pchip ghost" data-w="adopt">＋ Học chữ này</button>`}${n ? `<button class="pchip" data-w="${t.neu ? "learn" : "review"}">${t.neu ? `${t.neu} từ mới` : `${t.due} từ cần ôn`} · ${t.neu ? "Học" : "Ôn"}</button>` : learn.canExtra() ? `<button class="pchip" data-w="extra">Học thêm 3 từ</button>` : ""}</div>`, "poster");
    requestAnimationFrame(() => game.yard?.setReserve?.(tl.getBoundingClientRect().bottom + 6));      // chừa trời cho tranh chữ, vườn lùi xuống
    return true;
  }
  // hết chữ cấp đang học, cấp kế khoá theo gói: rủ thi nhảy lớp hoặc nâng gói (không nói dối "mai có chữ")
  function stuck() { const st = learn.stalled(); if (!st) return ""; const tag = levelTag({ pack: st.next.split("/")[0], level: st.next.split("/")[1] }); return `<p class="lead">Hết chữ cấp này. ${esc(tag)} mở với gói ${st.tier === "pro" ? "Pro" : "Plus"}; trong lúc đó ${esc(game.cat.name)} lấy chữ đời thường cho học.</p><div class="acts"><button class="btn pri" data-w="plans">Xem gói</button><button class="btn" data-w="lang">Trình độ</button></div>`; }
  // ------------------------------------------------------------------ TẠM NGHỈ HỌC: thẻ thu lại thành viên nhỏ, mèo thôi đố/kháy chuyện học
  const paused = () => (s.settings.pauseUntil || 0) > Date.now();
  const hhmm = (ts) => { const d = new Date(ts); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; };
  function pausedView() {
    mode = "paused"; cur = null; cr.clearAnswers(); game.yard?.setReserve?.(0);
    const u = s.settings.pauseUntil, eod = new Date(u).getHours() === 23 && new Date(u).getMinutes() === 59;
    write(`<div class="pz"><span class="pz-t">${icon("pause")}Đang nghỉ học <small>${eod ? "hết hôm nay" : `tới ${hhmm(u)}`}</small></span><button class="btn pri sm" data-w="resume">Học tiếp</button></div>`, "paused");
  }
  function pauseAsk() {
    mode = "pauseask"; clearTimeout(quizT); clearTimeout(nextT); cr.clearAnswers(); series = []; spellState = null;
    write(`${top(`${esc(game.cat.name)} hỏi`, null, true)}<h1 class="w vi">Nghỉ học bao lâu?</h1><p class="lead">Trong lúc nghỉ, ${esc(game.cat.name)} không đố, không kháy chuyện học. Chuỗi ngày học vẫn tính theo ngày.</p>
      <div class="acts wrap"><button class="btn" data-pz="30">30 phút</button><button class="btn" data-pz="120">2 tiếng</button><button class="btn" data-pz="eod">Hết hôm nay</button><button class="btn text" data-w="resume">Thôi, học tiếp</button></div>`, "", true);
  }
  function pauseFor(v) {
    const now = new Date(), until = v === "eod" ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59).getTime() : Date.now() + +v * 60e3;
    s.settings.pauseUntil = until; game.persist?.(); game.say?.("pause_ok", null, 3200); game.emit("pause", true); pausedView();
  }
  function resume(silent) { const was = paused(); s.settings.pauseUntil = 0; game.persist?.(); if (was && !silent) game.say?.("pause_back", null, 3000); game.emit("pause", false); mode = "ambient"; ambient(true); }
  function ambient(force) {
    if (!s.onboarded) return onboard();
    if (paused()) return pausedView();
    mode = "ambient";
    if (posterOn() && poster(force)) return;
    const c = featured();
    if (!c) { write(`${top(LANGS[learn.lang].vi)}<h1 class="w">Xong rồi</h1><p class="lead">Hôm nay hết chữ. Mai ${esc(game.cat.name)} đem chữ mới tới.</p>${learn.canExtra() ? `<div class="acts"><button class="btn pri" data-w="extra">${icon("bolt")}Học thêm 3 từ</button></div>` : stuck()}`); cur = null; return; }
    if (!force && cur && cur.id === c.id && tl.dataset.id === c.id) return;
    cur = c; tl.dataset.id = c.id;
    const st = learn.stat(c.id), isNew = !st || !st.seen;
    write(`${top(lab(c), c)}${body(c)}
      <div class="acts">${isNew ? `<button class="btn pri" data-w="seen">${icon("check")}Nhớ rồi</button>` : `<button class="btn pri" data-w="quizme">${icon("bolt")}Đố từ này</button>`}<button class="btn x-open" data-w="next">Từ khác${icon("arrow")}</button><button class="btn text x-mini" data-w="more">Xem thêm</button><button class="btn text x-open" data-w="more">Thu gọn</button></div>`);
    if (isNew) autoSay(c);
  }
  function onboard() {
    mode = "onboard";
    write(`${top(`chào, tui là ${esc(game.cat.name)}`)}<h1 class="w">Học gì nè?</h1>
      <div class="acts stack">${Object.entries(LANGS).map(([k, v]) => `<button class="btn pri big" data-picklang="${k}"><b class="flag ${k}">${v.flag}</b>${v.vi}</button>`).join("")}</div>
      <p class="lead">Mỗi ngày vài từ thôi. Tui viết lên đây, rồi thả bướm ra đố. Lười là tui biết liền.</p>`, "onb", true);
  }

  // ------------------------------------------------------------------ đố ngay trên cảnh
  function canQuiz(c) { const st = learn.stat(c.id); return st && st.seen; }

  // ------------------------------------------------------------------ ĐỐ: nhiều kiểu câu, chọn theo độ thuộc (box) và không lặp kiểu liền nhau
  // mc  : chữ → nghĩa (bướm mang nghĩa)          rev : nghĩa → chữ
  // fill: điền chữ vào câu ví dụ (có ngữ cảnh)    tf  : chữ = nghĩa này, đúng hay sai? (nhanh, 2 bướm)
  // spell: xếp chữ cái (tiếng Anh)                 read: chữ Hán/Nhật đọc là gì (pinyin / kana)
  // listen: nghe → chọn chữ (Plus)                 type: tự gõ chữ (Plus)
  let lastKind = "", want = null, qOpts = [], qKind = "";
  const KIND_VI = { mc: "đố nghĩa", rev: "chữ nào", fill: "điền chữ", tf: "đúng hay sai", spell: "xếp chữ", read: "đọc sao", listen: "nghe", type: "gõ chữ" };
  // tìm chữ trong câu ví dụ (kể cả dạng thêm s/ed/ing đơn giản) → [trước, chữ, sau]
  function blankOf(c) {
    if (!c.ex || !c.w) return null; const ex = c.ex;
    if (c.lang !== "en") { const i = ex.indexOf(c.w); return i < 0 ? null : [ex.slice(0, i), c.w, ex.slice(i + c.w.length)]; }
    const w = c.w.toLowerCase(); if (w.includes(" ") ) { const i = ex.toLowerCase().indexOf(w); return i < 0 ? null : [ex.slice(0, i), ex.slice(i, i + w.length), ex.slice(i + w.length)]; }
    const forms = [w, w + "s", w + "es", w + "ed", w + "d", w + "ing", w.replace(/e$/, "") + "ing", w.replace(/y$/, "ies"), w.replace(/y$/, "ied")];
    const re = /[A-Za-z’']+/g; let m; while ((m = re.exec(ex))) if (forms.includes(m[0].toLowerCase())) return [ex.slice(0, m.index), m[0], ex.slice(m.index + m[0].length)];
    return null;
  }
  function chooseKind(c, ctx) {
    if (ctx.kind) return ctx.kind;
    if (ctx.first) return "mc";      // vừa học xong: nhận ra nghĩa trước
    const box = learn.stat(c.id)?.box || 0, K = [["rev", 2], ["tf", box <= 1 ? 2 : 1]];
    if (blankOf(c)) K.push(["fill", box >= 1 ? 4 : 3]);
    if (c.lang === "en" && /^[a-z]{3,11}$/i.test(c.w)) K.push(["spell", box >= 1 ? 3 : 1]);
    if ((c.lang === "zh" || c.lang === "ja") && c.ph && c.ph !== c.w) K.push(["read", 3]);
    if (game.can("quiz.listen") && s.settings.tts) K.push(["listen", box >= 2 ? 3 : 1]);
    if (game.can("quiz.type") && box >= 2 && c.lang === "en") K.push(["type", 2]);
    if (!ctx.round2) K.push(["mc", 2]);
    const L = K.filter(([k]) => k !== lastKind), tot = L.reduce((a, [, w]) => a + w, 0); let r = Math.random() * tot;
    for (const [k, w] of L) if ((r -= w) <= 0) return k;
    return L[0][0];
  }
  const lessonPool = () => [...series.map((x) => x.id), ...learn.todayCards().map((x) => x.id)].map((id) => learn.card(id)).filter(Boolean);
  function quiz(c, src = "wall", ctx = {}) {
    if (!c || (src === "cat" && paused())) return; curRetry = !!(ctx.retry || c._retry); c = learn.card(c.id) || c; mode = "quiz"; cur = c; clearTimeout(quizT); lastQuiz = Date.now();
    let kind = chooseKind(c, ctx);
    if ((kind === "fill" && !blankOf(c)) || (kind === "read" && !(c.lang !== "en" && c.ph)) || ((kind === "spell" || kind === "type") && !/^[a-z]{2,14}$/i.test(c.w))) kind = "rev";
    lastKind = qKind = kind; want = c.id; qOpts = [];
    const head = top(`${src === "cat" ? `${esc(game.cat.name)} đố` : KIND_VI[kind]}${series.length ? ` · còn ${series.length}` : ""}`);
    const acts = `<div class="acts">${kind === "spell" || kind === "type" || kind === "tf" ? `<button class="btn text" data-w="giveup">Chịu, xem đáp án</button>` : `<button class="btn text x-mini" data-w="more">Hiện lựa chọn</button>`}<button class="btn text" data-w="skip">Bỏ qua</button></div>`;
    const bfly = (opts, tag, lang) => { qOpts = opts; cr.answers(opts.map((o) => ({ id: o.id, tag: tag(o), lang: lang(o) })), (id, b) => answer(id, b)); };
    const buttons = (opts, tag, cls) => `<div class="opts${opts.some((o) => tag(o).length > 22) ? " one" : ""}">${opts.map((o, i) => `<button class="opt ${cls(o)}" data-ans="${esc(o.id)}"><i>${i + 1}</i>${esc(tag(o))}</button>`).join("")}</div>`;
    let html = "";
    if (kind === "mc" || kind === "rev" || kind === "listen" || kind === "fill") {
      const opts = learn.options(c, 4, lessonPool());
      const isW = kind !== "mc", tag = (o) => (isW ? o.w : o.vi), cls = (o) => (isW ? o.lang : "");
      const b = kind === "fill" ? blankOf(c) : null;
      const prompt = kind === "mc" ? `${wordH(c)}<p class="ph">${esc(c.ph || "")}</p><p class="hint">Nghĩa là gì? Bắt con bướm đúng nghĩa.</p>`
        : kind === "rev" ? `<h1 class="w vi">${esc(c.vi)}</h1><p class="hint">Chữ nào mang nghĩa này?</p>`
        : kind === "fill" ? `<p class="fill ${c.lang}">${esc(b[0])}<span class="blank">${" ".repeat(2)}?${" ".repeat(2)}</span>${esc(b[2])}</p>${c.exVi ? `<p class="exvi">${esc(c.exVi)}</p>` : ""}<p class="hint">Chữ nào hợp chỗ trống?</p>`
        : `<div class="c-word"><h1 class="w">Nghe nè</h1>${say(c)}</div><p class="hint">Nghe rồi chọn đúng chữ.</p>`;
      html = prompt + buttons(opts, tag, cls); bfly(opts, tag, (o) => (isW ? o.lang : "vi"));
      if (kind === "listen") setTimeout(() => game.speakCard(c, false, true), 300);
    } else if (kind === "read") {
      const opts = learn.options(c, 4, lessonPool()).filter((o, i, a) => o.ph && a.findIndex((x) => x.ph === o.ph) === i);
      html = `<div class="c-word"><h1 class="w ${c.lang}">${esc(c.w)}</h1></div><p class="hint">Đọc là gì? (${c.lang === "zh" ? "pinyin" : "kana"})</p>` + buttons(opts, (o) => o.ph, () => "ph");
      bfly(opts, (o) => o.ph, () => "vi");
    } else if (kind === "tf") {
      const other = learn.options(c, 2, lessonPool()).find((o) => o.id !== c.id), truth = !other || Math.random() < 0.5;
      want = truth ? "T" : "F"; qOpts = other ? [other] : [];
      html = `<div class="c-word"><h1 class="w ${c.lang}" data-say="${esc(c.id)}">${esc(c.w)}</h1>${say(c)}</div><p class="tfq">= ${esc(truth ? c.vi : other.vi)} ?</p><p class="hint">Đúng hay sai? Nhanh tay.</p>
        <div class="opts tf"><button class="opt" data-ans="T"><i>1</i>Đúng</button><button class="opt" data-ans="F"><i>2</i>Sai</button></div>`;
      cr.answers([{ id: "T", tag: "Đúng", lang: "vi" }, { id: "F", tag: "Sai", lang: "vi" }], (id, b) => answer(id, b));
    } else if (kind === "spell") {
      cr.clearAnswers(); const w = c.w.toLowerCase(), pool = w.split(""); if (w.length >= 5) pool.push("etaoinsrlu".replace(/./g, (x) => (w.includes(x) ? "" : x))[Math.floor(Math.random() * 3)] || "e");
      const tiles = pool.map((ch, i) => [ch, i]).sort(() => Math.random() - 0.5);
      html = `<h1 class="w vi">${esc(c.vi)}</h1><p class="ph">${esc(c.ph || "")}</p><div class="slots" aria-label="Chữ đang xếp">${w.split("").map(() => `<span class="slot"></span>`).join("")}</div>
        <div class="tiles">${tiles.map(([ch, i]) => `<button class="tile" data-tile="${esc(ch)}" data-ti="${i}">${esc(ch)}</button>`).join("")}</div><p class="hint">Chạm chữ cái theo đúng thứ tự.</p>`;
      spellState = { w, i: 0, miss: 0 };
    } else if (kind === "type") {
      cr.clearAnswers();
      html = `<h1 class="w vi">${esc(c.vi)}</h1><p class="ph">${esc(c.ph || "")}</p><form class="typein" data-typein><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" aria-label="Gõ chữ tiếng Anh" placeholder="gõ chữ…"><button class="btn pri" type="submit">Xong</button></form><p class="hint">Gõ chữ tiếng Anh mang nghĩa này.</p>`;
      setTimeout(() => tl.querySelector(".typein input")?.focus(), 350);
    }
    write(head + html + acts, "quiz " + kind);
    quizT = setTimeout(() => { if (mode === "quiz") { whisper(game.lineOf("pawtap_no")); cr.clearAnswers(); series = []; ambient(true); } }, 60000);
  }
  let spellState = null, curRetry = false;
  function spellTap(btn) {
    const S0 = spellState; if (mode !== "quiz" || !S0 || btn.disabled) return;
    if (btn.dataset.tile === S0.w[S0.i]) {
      btn.disabled = true; btn.classList.add("used"); const sl = tl.querySelectorAll(".slot")[S0.i]; sl.textContent = S0.w[S0.i]; sl.classList.add("on"); S0.i++;
      game.buzz?.(4); if (S0.i >= S0.w.length) { spellState = null; setTimeout(() => answer(S0.miss <= 1 ? want : "x"), 250); }
    } else { S0.miss++; btn.classList.remove("nope"); void btn.offsetWidth; btn.classList.add("nope"); game.buzz?.([12, 30, 12]); if (S0.miss >= 4) { spellState = null; answer("x"); } }
  }
  function typeCheck(v) {
    if (mode !== "quiz" || !cur) return; const a = norm(v), b = norm(cur.w);
    const near = (x, y) => { if (Math.abs(x.length - y.length) > 1 || y.length < 6) return false; let i = 0, j = 0, e = 0; while (i < x.length && j < y.length) { if (x[i] === y[j]) { i++; j++; } else { if (++e > 1) return false; if (x.length > y.length) i++; else if (y.length > x.length) j++; else { i++; j++; } } } return e + (x.length - i) + (y.length - j) <= 1; };
    if (a === b) return answer(want); if (near(a, b)) { whisper(`Gần đúng: ${cur.w}`); return answer(want); } answer("x");
  }
  // các bướm còn lại cũng là chữ đáng học: hiện nghĩa của chúng sau khi trả lời, chạm + là cho vào bài
  const others = () => { const L = qOpts.filter((o) => o.id !== cur?.id && o.vi); if (!L.length) return ""; const today = new Set(learn.todayCards().map((x) => x.id)); return `<div class="others"><p class="kick">các bướm còn lại</p>${L.map((o) => { const lr = learn.stat(o.id)?.seen; return `<p class="oth"><b class="${o.lang}" data-say="${esc(o.id)}">${esc(o.w)}</b><span>${esc(o.vi)}</span>${lr ? `<small>đang học</small>` : today.has(o.id) ? `<small>bài hôm nay</small>` : `<button class="ib sm" data-adopt="${esc(o.id)}" aria-label="Học chữ này">＋</button>`}</p>`; }).join("")}</div>`; };
  function answer(id, b) {
    if (mode !== "quiz" || !cur) return; mode = "result"; clearTimeout(quizT); spellState = null;
    const c = cur, ok = id === want, r = learn.answer(c.id, ok, { blind: blind === c.id }); blind = null;
    tl.querySelectorAll("[data-ans]").forEach((x) => { x.disabled = true; if (x.dataset.ans === want) x.classList.add("right"); else if (x.dataset.ans === id) x.classList.add("wrong"); });
    tl.querySelectorAll(".tile,.typein input,.typein button").forEach((x) => (x.disabled = true));
    const bf = game.critters.list.find((x) => x.answer && x.id === want); if (bf) cr.land(bf, true); if (b && !ok) cr.land(b, false);
    setTimeout(() => cr.clearAnswers(), 1400);
    const line = game.react(r, c); game.sayLine(line, 3200);
    const res = document.createElement("div"); res.className = "res " + (ok ? "ok" : "bad");
    res.innerHTML = `<p>${ok ? `${icon("check")}Đúng${r.combo >= 3 ? ` · ${r.combo} câu liền` : ""}` : "Sai"} · <b class="${c.lang}">${esc(c.w)}</b> = ${esc(c.vi)}</p>${qKind === "fill" && c.ex ? `<p class="exr ${c.lang}">${esc(c.ex)}</p>` : ""}${others()}`;
    tl.querySelector(".acts")?.replaceWith(res); game.buzz?.(ok ? 8 : [20, 50, 20]);
    // chạm lựa chọn nào thì đọc to chữ đó (cả bướm sai cũng là chữ để học); chọn sai thì đọc tiếp chữ đúng
    const tapped = qOpts.find((o) => o.id === id);
    if (qKind === "fill" && ok) game.speakCard(c, true, false);
    else if (tapped && tapped.id !== c.id) { game.speakCard(tapped, false, false); setTimeout(() => game.speakCard(c, false, false), 1300); }
    else game.speakCard(c, false, false);
    // cảm giác game: đúng → nổ hạt ở con bướm / nút đúng + điểm bay lên; sai → thẻ rung
    const fx = game.fx; if (fx) { if (ok) { const [x, y] = fx.center(bf?.el || tl.querySelector(".opt.right") || tl.querySelector(".slots") || tl); fx.burst(x, y, { n: r.combo >= 3 ? 16 : 11 }); fx.float(x, y - 24, `+${r.xp}`); if (r.combo >= 3) setTimeout(() => fx.float(x, y - 70, `${r.combo} câu liền!`, "big"), 180); if (r.box >= 2 && learn.stat(c.id)?.skip) fx.float(x, y + 30, "nhảy cóc", "sm"); } else fx.shake(tl); }
    if (!ok && !curRetry) series.push(Object.assign(Object.create(c), { _retry: 1, __q2: 1 }));      // sai thì cuối bài hỏi lại 1 lần, kiểu khác
    const wait = (ok ? 2000 : 3400) + (qOpts.length > 1 ? 1600 : 0);
    nextT = setTimeout(next, wait);
  }
  let nextT = 0;
  function next() {
    clearTimeout(nextT);
    if (series.length) { const n = series.shift(); if (n.__new) return showNew(n); return quiz(n, "wall", { round2: !!n.__q2, retry: !!n._retry }); }
    if (mode === "result" || mode === "quiz") { ambient(true); if (learn.doneToday()) { const fast = (learn.pace() ?? 0) >= 0.75 && learn.canExtra(); game.say(fast ? "pace_fast" : "done"); game.emit("lesson-done"); game.fx?.burst(innerWidth / 2, innerHeight * 0.22, { n: 22, spread: 160, size: 16 }); game.fx?.float(innerWidth / 2, innerHeight * 0.3, "Xong bài!", "big"); askRemind(); } }
  }
  /** học xong bài đầu tiên: rủ bật nhắc (hỏi đúng 1 lần) */
  function askRemind() {
    const st = game.notify?.status(); if (s.askedRemind || !(st === "ask" || st === "ios-install")) return; s.askedRemind = Date.now(); game.persist();
    setTimeout(() => { if (mode !== "ambient") return; mode = "ask";
      write(`${top(`${esc(game.cat.name)} hỏi`)}<h1 class="w vi">Mai quên học thì sao?</h1><p class="lead">Để ${esc(game.cat.name)} nhắc mỗi tối. Học xong là im, hứa.${st === "ios-install" ? " Trên iPhone: thêm app vào màn hình chính trước đã." : ""}</p>
        <div class="acts">${st === "ask" ? `<button class="btn pri" data-w="remind">${icon("bell")}Cho nhắc</button>` : ""}<button class="btn" data-w="later">Thôi</button></div>`, "", true);
    }, 3500);
  }
  /** "học": từ mới hiện lên từng từ, bấm nhớ rồi → bướm đố ngay; xong tới các từ cần ôn */
  function lesson(kind = "full") {
    if (!s.onboarded) return onboard();
    if (paused()) resume(true);
    const neu = kind === "full" ? learn.newToday() : kind === "hot" ? learn.hotToday().map((h) => h.card).filter((c) => !(learn.stat(c.id)?.right + learn.stat(c.id)?.wrong > 0)) : kind === "book" ? learn.book().map((b) => b.card).filter((c) => c.vi && c.lang === learn.lang && !(learn.stat(c.id)?.right + learn.stat(c.id)?.wrong > 0)) : [], due = kind === "fun" || kind === "hot" ? [] : kind === "book" ? learn.book().map((b) => b.card).filter((c) => c.vi && c.lang === learn.lang && learn.stat(c.id)?.seen) : learn.due().slice(0, kind === "review" ? 8 : 12);
    // học xen kẽ: chữ 1 → đố ngay · chữ 2 → đố ngay → ôn lại chữ 1 bằng kiểu khác · … → cuối cùng ôn chữ chót
    series = []; neu.forEach((c, i) => { series.push(Object.assign(Object.create(c), { __new: 1 })); if (i >= 1) series.push(Object.assign(Object.create(neu[i - 1]), { __q2: 1 })); });
    if (neu.length) series.push(Object.assign(Object.create(neu[neu.length - 1]), { __q2: 1 }));
    due.filter((c) => !neu.some((n) => n.id === c.id)).forEach((c) => series.push(c));
    if (!series.length) { const pool = [...learn.learning(), ...learn.mastered().filter((c) => c.lang === learn.lang)]; if (!pool.length) { whisper(game.lineOf("idle_tap")); return; } series = [pick(pool)]; }
    next();
  }
  function showNew(c0) {
    const c = Object.getPrototypeOf(c0); mode = "new"; cur = c; tl.dataset.id = c.id;
    const left = series.filter((x) => x.__new).length;
    // học nhanh → hỏi "biết chữ này chưa?" trước khi lộ nghĩa: biết thật thì nhảy cóc (ôn thưa hơn)
    if ((learn.pace() ?? 0) >= 0.75 && !c0.__shown) { write(`${top(`từ mới${left ? ` · còn ${left} từ nữa` : ""} · biết chưa?`, c)}${wordH(c)}<p class="ph">${esc(c.ph || "")}</p><p class="hint">Biết rồi thì đố luôn, đúng là khỏi học chữ này.</p><div class="acts"><button class="btn pri" data-w="know">${icon("bolt")}Biết rồi, đố đi</button><button class="btn" data-w="reveal">Xem nghĩa</button></div>`, "new"); autoSay(c); return; }
    write(`${top(`từ mới${left ? ` · còn ${left} từ nữa` : ""}`, c)}${body(c)}<div class="acts"><button class="btn pri" data-w="seen-next">${icon("check")}Nhớ rồi, đố đi</button><button class="btn text x-mini" data-w="more">Ví dụ</button><button class="btn text x-open" data-w="more">Thu gọn</button></div>`, "new");
    autoSay(c);
    game.sayLine(game.lineOf("newword", { w: c.w }), 3000);
  }

  // ------------------------------------------------------------------ chữ thì thầm (thông báo) & mèo viết lề
  let wt = 0;
  function whisper(text, ms = 4200) { const w = q(".whisper"); w.textContent = text; w.classList.remove("in"); void w.offsetWidth; w.classList.add("in"); clearTimeout(wt); wt = setTimeout(() => w.classList.remove("in"), ms); }
  function scribble(text, kind = "") {
    s.wall ||= []; s.wall = s.wall.filter((n) => !kind || n.kind !== kind); s.wall.push({ text, kind, t: Date.now(), rot: +(Math.random() * 6 - 3).toFixed(1) }); s.wall = s.wall.filter((n) => Date.now() - n.t < 36 * 3600e3).slice(-3);
    drawScribs(true);
  }
  function drawScribs(fresh) { const L = s.wall || []; q(".scribs").innerHTML = L.map((n, i) => `<p class="scrib${fresh && i === L.length - 1 ? " writing" : ""}" style="--rot:${n.rot}deg;--n:${n.text.length}">${esc(n.text)}</p>`).join(""); }

  // ------------------------------------------------------------------ bấm
  el.addEventListener("submit", (e) => { const f = e.target.closest("[data-typein]"); if (!f) return; e.preventDefault(); typeCheck(f.querySelector("input")?.value || ""); });
  el.addEventListener("click", (e) => {
    game.lastInput = Date.now();
    const sx = e.target.closest("[data-sayex]"); if (sx) { game.speakCard(learn.card(sx.dataset.sayex), true); return; }
    const sp = e.target.closest("[data-say]"); if (sp) { game.speakCard(learn.card(sp.dataset.say)); if (Math.random() < 0.2) game.jab("ui_speak"); return; }
    const stb = e.target.closest("[data-star]"); if (stb) { const id = stb.dataset.star; if (learn.booked(id)) { learn.unbook(id); stb.classList.remove("on"); whisper("Bỏ khỏi sổ."); } else { const r = learn.bookmark(learn.card(id), s.plan); if (r.full) { whisper("Sổ đầy rồi. Gói Plus thì lưu thoải mái."); return; } stb.classList.add("on"); whisper("Lưu vô sổ rồi."); game.jab("book"); } stb.setAttribute("aria-pressed", learn.booked(id)); game.buzz?.(8); game.persist(); return; }
    const an = e.target.closest("[data-ans]"); if (an) return answer(an.dataset.ans);
    const ti = e.target.closest("[data-tile]"); if (ti) return spellTap(ti);
    const pz = e.target.closest("[data-pz]"); if (pz) return pauseFor(pz.dataset.pz);
    const ad = e.target.closest("[data-adopt]"); if (ad) { const r = learn.adopt(ad.dataset.adopt); ad.replaceWith(Object.assign(document.createElement("small"), { textContent: r ? "đã thêm" : "" })); whisper(r === true ? "Thêm vô bài hôm nay rồi." : "Chữ này đang học rồi."); clearTimeout(nextT); nextT = setTimeout(next, 2600); return; }
    const lg = e.target.closest("[data-picklang]"); if (lg) { learn.setLang(lg.dataset.picklang); s.onboarded = true; game.save && game.persist(); whisper(`Ok, học ${LANGS[lg.dataset.picklang].vi.replace(/^Tiếng/, "tiếng")}.`); ambient(true); clock(); return lesson("full"); }
    const b = e.target.closest("[data-w]");
    if (!b) { if (tl.contains(e.target) && !e.target.closest("a,button") && tl.classList.contains("mini") && !tl.classList.contains("poster") && mode !== "result" && mode !== "paused") tl.classList.toggle("open"); return; }
    const a = b.dataset.w;
    if (a === "seen" && cur) { learn.seen(cur.id); whisper(game.lineOf("newword", { w: cur.w })); const c = cur; setTimeout(() => quiz(c, "wall", { first: true }), 900); return; }
    if (a === "seen-next" && cur) { learn.seen(cur.id); return quiz(cur, "wall", { first: true }); }
    if (a === "know" && cur) { learn.seen(cur.id); blind = cur.id; return quiz(cur, "wall", { first: true }); }
    if (a === "adopt" && cur) { const c = cur, r = learn.adopt(c.id); if (r === "learning") return quiz(c); if (!r) return; series = [Object.assign(Object.create(c), { __q2: 1 })]; game.jab?.("adopt_word", { w: c.w }, true); return showNew(Object.assign(Object.create(c), { __new: 1 })); }
    if (a === "reveal" && cur) { const c = cur, o = Object.assign(Object.create(c), { __new: 1, __shown: 1 }); return showNew(o); }
    if (a === "next") { shift++; if (Math.random() < 0.35) game.jab("ui_next"); return ambient(true); }
    if (a === "quizme" && cur) return quiz(cur);
    if (a === "giveup") return answer("x");
    if (a === "pause") return pauseAsk();
    if (a === "resume") return resume();
    if (a === "skip") { game.emit("quiz-skip", cur?.id); cr.clearAnswers(); series = []; clearTimeout(quizT); game.jab("ui_skip"); return ambient(true); }
    if (a === "more") { tl.classList.toggle("open"); return; }
    if (a === "learn") return lesson("full");
    if (a === "extra") { const n = learn.extra(3); if (!n) { whisper("Hết chữ ở cấp này rồi. Vô Trình độ mà nhảy lớp."); return ambient(true); } game.jab("pace_more", {}, true); return lesson("full"); }
    if (a === "remind") { game.notify.enable().then((r) => whisper(r === "ok" ? "Ok. Tối nay tui nhắc." : "Chưa bật được. Vào Thêm › Cài đặt.")); return ambient(true); }
    if (a === "later") { whisper("Ừ. Tự giác nha."); return ambient(true); }
    if (a === "menu" && Math.random() < 0.4) game.jab("ui_menu");
    if (a === "review") return learn.todo().due ? lesson("review") : lesson("fun");
    game.showSheet?.(a);
  });

  // mở rộng xong để đó 25 giây thì tự thu nhỏ lại cho thấy mèo
  let openT = 0; new MutationObserver(() => { clearTimeout(openT); if (tl.classList.contains("open")) openT = setTimeout(() => tl.classList.remove("open"), 25000); }).observe(tl, { attributes: true, attributeFilter: ["class"] });
  // phím tắt: 1–4 chọn đáp án, Enter = nút chính
  addEventListener("keydown", (e) => {
    if (game.sheetOpen?.() || e.target.matches?.("input,textarea")) return;
    const n = +e.key; if (n >= 1 && n <= 4) { tl.querySelectorAll(".opt:not(:disabled)")[n - 1]?.click(); return; }
    if (e.key === "Enter") tl.querySelector(".btn.pri")?.click();
  });
  // tự đố khi đang nhìn: 4–7 phút một lần, nếu có từ đã học
  setInterval(() => {
    clock();
    if (document.hidden || game.sheetOpen?.() || game.closeup?.busy) return;
    if (mode === "paused" && !paused()) { resume(); return; }
    if (mode === "ambient") { ambient(); const quizable = [...learn.due(), ...learn.learning().filter(canQuiz)]; if (quizable.length && Date.now() - lastQuiz > (4 + Math.random() * 3) * 60e3 && Date.now() - (game.lastInput || 0) < 10 * 60e3) quiz(quizable[0]); }
  }, 15000);
  for (const k of ["learn", "lang", "streak", "weather"]) game.on(k, clock);
  // dòng mèo viết lề hết đúng nữa thì tự xoá (vd: "chưa học chữ nào" sau khi đã học)
  game.on("learn", () => { const t = learn.todo(), n0 = (s.wall || []).length; s.wall = (s.wall || []).filter((n) => !((n.kind === "new" && !t.neu) || (n.kind === "due" && !t.due))); if (s.wall.length !== n0) drawScribs(false); });
  game.on("lang", () => { shift = 0; series = []; ambient(true); });
  game.on("hot", (e) => { if (mode !== "ambient") return; const h = learn.hotToday()[0]; if (e.fresh && h) { const L = features(), i = L.findIndex((c) => c.id === h.card.id); if (i >= 0) { const mins = Math.floor((Date.now() - new Date().setHours(0, 0, 0, 0)) / 60000); shift = ((i - Math.floor(mins / (s.settings.rotate || 15))) % L.length + L.length) % L.length; } } ambient(true); });
  clock(); ambient(true); drawScribs(false);
  return { ambient, quiz, lesson, pause: pauseAsk, resume, paused, whisper, scribble, clock, refresh: () => { series = []; if (!posterOn()) game.yard?.setReserve?.(0); ambient(true); }, get mode() { return mode; } };
}
export { norm, dayKey };
