// CHỮ TRÊN HÌNH NỀN – kiểu màn hình khoá: góc trái trên là từ đang học (tự đổi theo giờ),
// góc phải là giờ, ngày, chuỗi ngày học; đáy là vài chữ bấm được. Học và đố diễn ra ngay trên cảnh:
// đố thì bướm bay ra mang đáp án, chạm đúng con là xong. Không có cửa sổ bật lên.
import { esc, dayKey, pick } from "../core/util.js";
import { icon } from "./icons.js";
import { LANGS, cardsOfLevel } from "../learn/packs.js";
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
  let mode = "ambient", shift = 0, cur = null, series = [], quizT = 0, lastQuiz = Date.now(), shownAt = 0;

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
  const lab = (c) => { const st = learn.stat(c.id); if (hotInfo(c) && (!st || st.box < 4)) return `chữ nóng hôm nay · ${hotInfo(c).tag}`; if (!st || !st.seen) return "từ mới hôm nay"; if (st.box >= 4) return "đã thuộc · nhắc lại cho vui"; if (st.due <= Date.now() && st.right + st.wrong > 0) return "tới lúc ôn"; return "đang học"; };
  // thẻ chữ mặc định là widget nhỏ ở góc (để ngắm mèo); chạm vào thẻ mới mở rộng xem ví dụ, lý do, nguồn
  function write(html, cls = "", big = false) { tl.className = "tl card " + cls + (big ? " big" : " mini"); tl.innerHTML = html; tl.scrollTop = 0; tl.classList.remove("in"); void tl.offsetWidth; tl.classList.add("in"); shownAt = Date.now(); }
  const say = (c, ex = false) => `<button class="ib${ex ? " sm" : ""}" ${ex ? "data-sayex" : "data-say"}="${esc(c.id)}" aria-label="${ex ? "Nghe câu ví dụ" : "Nghe"}">${icon("speaker")}</button>`;
  const star = (c) => `<button class="ib star${learn.booked(c.id) ? " on" : ""}" data-star="${esc(c.id)}" aria-pressed="${learn.booked(c.id)}" aria-label="${learn.booked(c.id) ? "Bỏ khỏi sổ" : "Lưu vào sổ"}">${icon("star")}</button>`;
  const top = (label, c) => `<div class="c-top"><span class="kick">${label}</span>${c ? star(c) : ""}</div>`;
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
      <div class="pacts">${say(c)}${star(c)}<button class="ib" data-w="next" aria-label="Chữ khác">${icon("arrow")}</button>${n ? `<button class="pchip" data-w="${t.neu ? "learn" : "review"}">${t.neu ? `${t.neu} từ mới` : `${t.due} từ cần ôn`} · ${t.neu ? "Học" : "Ôn"}</button>` : ""}</div>`, "poster");
    requestAnimationFrame(() => game.yard?.setReserve?.(tl.getBoundingClientRect().bottom + 6));      // chừa trời cho tranh chữ, vườn lùi xuống
    return true;
  }
  function ambient(force) {
    if (!s.onboarded) return onboard();
    mode = "ambient";
    if (posterOn() && poster(force)) return;
    const c = featured();
    if (!c) { write(`${top(LANGS[learn.lang].vi)}<h1 class="w">Xong rồi</h1><p class="lead">Hôm nay hết chữ. Mai ${esc(game.cat.name)} đem chữ mới tới.</p>`); cur = null; return; }
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
  function quiz(c, src = "wall") {
    if (!c) return; mode = "quiz"; cur = c; clearTimeout(quizT); lastQuiz = Date.now();
    const plus = game.can("quiz.listen") && s.settings.tts, st = learn.stat(c.id) || {};
    const kind = plus && st.box >= 2 && Math.random() < 0.3 ? "listen" : Math.random() < 0.55 ? "mc" : "rev";
    const opts = learn.options(c, 4);
    const tag = (o) => (kind === "mc" ? o.vi : o.w);
    const prompt = kind === "mc" ? `${wordH(c)}<p class="ph">${esc(c.ph || "")}</p><p class="hint">Nghĩa là gì? Bắt con bướm đúng nghĩa.</p>`
      : kind === "rev" ? `<h1 class="w vi">${esc(c.vi)}</h1><p class="hint">Chữ nào? Bắt con bướm mang đúng chữ.</p>`
      : `<div class="c-word"><h1 class="w">Nghe nè</h1>${say(c)}</div><p class="hint">Nghe rồi chọn đúng chữ.</p>`;
    const long = kind === "mc" && opts.some((o) => (o.vi || "").length > 22);
    write(`${top(`${src === "cat" ? `${esc(game.cat.name)} đố` : "đố nè"}${series.length ? ` · còn ${series.length}` : ""}`)}${prompt}
      <div class="opts${long ? " one" : ""}">${opts.map((o, i) => `<button class="opt ${kind === "mc" ? "" : o.lang}" data-ans="${esc(o.id)}"><i>${i + 1}</i>${esc(tag(o))}</button>`).join("")}</div><div class="acts"><button class="btn text x-mini" data-w="more">Hiện đáp án</button><button class="btn text" data-w="skip">Bỏ qua</button></div>`, "quiz");
    cr.answers(opts.map((o) => ({ id: o.id, tag: tag(o), lang: kind === "mc" ? "vi" : o.lang })), (id, b) => answer(id, b));
    if (kind === "listen") setTimeout(() => game.speakCard(c, false, true), 300);
    quizT = setTimeout(() => { if (mode === "quiz") { whisper(game.lineOf("pawtap_no")); cr.clearAnswers(); series = []; ambient(true); } }, 45000);
  }
  function answer(id, b) {
    if (mode !== "quiz" || !cur) return; mode = "result"; clearTimeout(quizT);
    const c = cur, ok = id === c.id, r = learn.answer(c.id, ok);
    tl.querySelectorAll("[data-ans]").forEach((x) => { x.disabled = true; if (x.dataset.ans === c.id) x.classList.add("right"); else if (x.dataset.ans === id) x.classList.add("wrong"); });
    const bf = game.critters.list.find((x) => x.answer && x.id === c.id); if (bf) cr.land(bf, true); if (b && !ok) cr.land(b, false);
    setTimeout(() => cr.clearAnswers(), 1400);
    const line = game.react(r, c); game.sayLine(line, 3200);
    const res = document.createElement("p"); res.className = "res " + (ok ? "ok" : "bad"); res.innerHTML = ok ? `${icon("check")}Đúng${r.combo >= 3 ? ` · ${r.combo} câu liền` : ""}` : `Sai · <b>${esc(c.w)}</b> = ${esc(c.vi)}`;
    tl.querySelector(".acts")?.replaceWith(res); game.buzz?.(ok ? 8 : [20, 50, 20]); if (ok) game.speakCard(c, false, false);
    if (!ok && !c._retry) { c._retry = 1; series.push(c); }
    setTimeout(next, ok ? 2000 : 3200);
  }
  function next() {
    if (series.length) { const n = series.shift(); if (n.__new) return showNew(n); return quiz(n); }
    if (mode === "result" || mode === "quiz") { ambient(true); if (learn.doneToday()) { game.say("done"); game.emit("lesson-done"); askRemind(); } }
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
    const neu = kind === "full" ? learn.newToday() : kind === "hot" ? learn.hotToday().map((h) => h.card).filter((c) => !(learn.stat(c.id)?.right + learn.stat(c.id)?.wrong > 0)) : kind === "book" ? learn.book().map((b) => b.card).filter((c) => c.vi && c.lang === learn.lang && !(learn.stat(c.id)?.right + learn.stat(c.id)?.wrong > 0)) : [], due = kind === "fun" || kind === "hot" ? [] : kind === "book" ? learn.book().map((b) => b.card).filter((c) => c.vi && c.lang === learn.lang && learn.stat(c.id)?.seen) : learn.due().slice(0, kind === "review" ? 8 : 12);
    series = []; neu.forEach((c) => series.push(Object.assign(Object.create(c), { __new: 1 })));
    due.filter((c) => !neu.some((n) => n.id === c.id)).forEach((c) => series.push(c));
    if (!series.length) { const pool = [...learn.learning(), ...learn.mastered().filter((c) => c.lang === learn.lang)]; if (!pool.length) { whisper(game.lineOf("idle_tap")); return; } series = [pick(pool)]; }
    next();
  }
  function showNew(c0) {
    const c = Object.getPrototypeOf(c0); mode = "new"; cur = c; tl.dataset.id = c.id;
    const left = series.filter((x) => x.__new).length;
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
  el.addEventListener("click", (e) => {
    game.lastInput = Date.now();
    const sx = e.target.closest("[data-sayex]"); if (sx) { game.speakCard(learn.card(sx.dataset.sayex), true); return; }
    const sp = e.target.closest("[data-say]"); if (sp) { game.speakCard(learn.card(sp.dataset.say)); if (Math.random() < 0.2) game.jab("ui_speak"); return; }
    const stb = e.target.closest("[data-star]"); if (stb) { const id = stb.dataset.star; if (learn.booked(id)) { learn.unbook(id); stb.classList.remove("on"); whisper("Bỏ khỏi sổ."); } else { const r = learn.bookmark(learn.card(id), s.plan); if (r.full) { whisper("Sổ đầy rồi. Gói Plus thì lưu thoải mái."); return; } stb.classList.add("on"); whisper("Lưu vô sổ rồi."); game.jab("book"); } stb.setAttribute("aria-pressed", learn.booked(id)); game.buzz?.(8); game.persist(); return; }
    const an = e.target.closest("[data-ans]"); if (an) return answer(an.dataset.ans);
    const lg = e.target.closest("[data-picklang]"); if (lg) { learn.setLang(lg.dataset.picklang); s.onboarded = true; game.save && game.persist(); whisper(`Ok, học ${LANGS[lg.dataset.picklang].vi.replace(/^Tiếng/, "tiếng")}.`); ambient(true); clock(); return lesson("full"); }
    const b = e.target.closest("[data-w]");
    if (!b) { if (tl.contains(e.target) && !e.target.closest("a,button") && tl.classList.contains("mini") && !tl.classList.contains("poster") && mode !== "result") tl.classList.toggle("open"); return; }
    const a = b.dataset.w;
    if (a === "seen" && cur) { learn.seen(cur.id); whisper(game.lineOf("newword", { w: cur.w })); setTimeout(() => quiz(cur), 900); return; }
    if (a === "seen-next" && cur) { learn.seen(cur.id); return quiz(cur); }
    if (a === "next") { shift++; if (Math.random() < 0.35) game.jab("ui_next"); return ambient(true); }
    if (a === "quizme" && cur) return quiz(cur);
    if (a === "skip") { cr.clearAnswers(); series = []; clearTimeout(quizT); game.jab("ui_skip"); return ambient(true); }
    if (a === "more") { tl.classList.toggle("open"); return; }
    if (a === "learn") return lesson("full");
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
    if (mode === "ambient") { ambient(); const quizable = [...learn.due(), ...learn.learning().filter(canQuiz)]; if (quizable.length && Date.now() - lastQuiz > (4 + Math.random() * 3) * 60e3 && Date.now() - (game.lastInput || 0) < 10 * 60e3) quiz(quizable[0]); }
  }, 15000);
  for (const k of ["learn", "lang", "streak", "weather"]) game.on(k, clock);
  // dòng mèo viết lề hết đúng nữa thì tự xoá (vd: "chưa học chữ nào" sau khi đã học)
  game.on("learn", () => { const t = learn.todo(), n0 = (s.wall || []).length; s.wall = (s.wall || []).filter((n) => !((n.kind === "new" && !t.neu) || (n.kind === "due" && !t.due))); if (s.wall.length !== n0) drawScribs(false); });
  game.on("lang", () => { shift = 0; series = []; ambient(true); });
  game.on("hot", (e) => { if (mode !== "ambient") return; const h = learn.hotToday()[0]; if (e.fresh && h) { const L = features(), i = L.findIndex((c) => c.id === h.card.id); if (i >= 0) { const mins = Math.floor((Date.now() - new Date().setHours(0, 0, 0, 0)) / 60000); shift = ((i - Math.floor(mins / (s.settings.rotate || 15))) % L.length + L.length) % L.length; } } ambient(true); });
  clock(); ambient(true); drawScribs(false);
  return { ambient, quiz, lesson, whisper, scribble, clock, refresh: () => { series = []; if (!posterOn()) game.yard?.setReserve?.(0); ambient(true); }, get mode() { return mode; } };
}
export { norm, dayKey };
