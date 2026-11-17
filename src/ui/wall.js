// CHỮ TRÊN HÌNH NỀN – kiểu màn hình khoá: góc trái trên là từ đang học (tự đổi theo giờ),
// góc phải là giờ, ngày, chuỗi ngày học; đáy là vài chữ bấm được. Học và đố diễn ra ngay trên cảnh:
// đố thì bướm bay ra mang đáp án, chạm đúng con là xong. Không có cửa sổ bật lên.
import { esc, dayKey, pick } from "../core/util.js";
import { icon } from "./icons.js";
import { LANGS } from "../learn/packs.js";

const WD = ["chủ nhật", "thứ hai", "thứ ba", "thứ tư", "thứ năm", "thứ sáu", "thứ bảy"];
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\s'’\-.,!?。，！？]/g, "");

export function createWall(game, root) {
  const s = game.save, learn = game.learn, cr = game.critters;
  const el = document.createElement("div"); el.className = "typo"; root.appendChild(el);
  el.innerHTML = `<section class="tl" aria-live="polite"></section>
    <aside class="tr"><div class="clock"></div><div class="date"></div><div class="stat"></div></aside>
    <div class="scribs"></div><p class="whisper" aria-live="polite"></p>
    <nav class="bl"><button data-w="learn"></button><button data-w="review"></button><button data-w="words">sổ từ</button><button data-w="menu" aria-label="Menu">${icon("menu")}</button></nav>`;
  const q = (x) => el.querySelector(x), tl = q(".tl");
  let mode = "ambient", shift = 0, cur = null, series = [], quizT = 0, lastQuiz = Date.now(), shownAt = 0;

  // ------------------------------------------------------------------ đồng hồ & số liệu (góc phải)
  function clock() {
    const d = new Date(), t = learn.todo();
    q(".clock").textContent = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    q(".date").textContent = `${WD[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`;
    const st = learn.streakAlive(), fl = learn.mastered().filter((c) => c.lang === learn.lang).length;
    q(".stat").innerHTML = `${st ? `<span>🔥 ${st} ngày</span>` : `<span>chưa có chuỗi</span>`}<span>🌼 ${fl}</span>${t.due ? `<span>${t.due} từ chờ ôn</span>` : ""}`;
    q("[data-w=learn]").textContent = t.neu ? `học ${t.neu} từ mới` : "học";
    q("[data-w=review]").textContent = t.due ? `ôn ${t.due}` : "đố vui";
    el.dataset.lang = learn.lang;
  }

  // ------------------------------------------------------------------ từ đang treo (đổi theo giờ)
  function features() {
    const T = learn.todayCards(), due = learn.due(), weak = learn.weak(4), mast = learn.mastered().filter((c) => c.lang === learn.lang);
    const seen = new Set(), out = [];
    for (const c of [...T, ...due, ...weak, ...mast.slice(-6)]) if (c && !seen.has(c.id)) { seen.add(c.id); out.push(c); }
    return out;
  }
  function featured() {
    const L = features(); if (!L.length) return null;
    const mins = Math.floor((Date.now() - new Date().setHours(0, 0, 0, 0)) / 60000), every = s.settings.rotate || 15;
    return L[(Math.floor(mins / every) + shift) % L.length];
  }
  const lab = (c) => { const st = learn.stat(c.id); if (!st || !st.seen) return "từ mới hôm nay"; if (st.box >= 4) return "đã thuộc · nhắc lại cho vui"; if (st.due <= Date.now() && st.right + st.wrong > 0) return "tới lúc ôn"; return "đang học"; };
  function write(html, cls = "") { tl.className = "tl " + cls; tl.innerHTML = html; tl.classList.remove("in"); void tl.offsetWidth; tl.classList.add("in"); shownAt = Date.now(); }
  const say = (c) => (s.settings.tts ? `<button class="sp" data-say="${esc(c.id)}" aria-label="Nghe">${icon("speaker")}</button>` : "");
  function ambient(force) {
    if (!s.onboarded) return onboard();
    mode = "ambient"; const c = featured();
    if (!c) { write(`<p class="k">${LANGS[learn.lang].vi}</p><h1 class="w">xong rồi</h1><p class="vi">Hôm nay hết chữ. Mai ${esc(game.cat.name)} đem chữ mới tới.</p>`); cur = null; return; }
    if (!force && cur && cur.id === c.id && tl.dataset.id === c.id) return;
    cur = c; tl.dataset.id = c.id;
    const st = learn.stat(c.id), isNew = !st || !st.seen;
    write(`<p class="k">${lab(c)}</p><h1 class="w ${c.lang}">${esc(c.w)}${say(c)}</h1><p class="ph">${esc(c.ph || "")}${c.pos ? ` · ${esc(c.pos)}` : ""}</p><p class="vi">${esc(c.vi)}</p>
      ${c.ex ? `<p class="ex ${c.lang}">${esc(c.ex)}${c.exPh ? `<small>${esc(c.exPh)}</small>` : ""}<i>${esc(c.exVi || "")}</i></p>` : ""}
      <p class="acts">${isNew ? `<button data-w="seen">nhớ rồi ✓</button>` : `<button data-w="quizme">đố từ này</button>`}<button data-w="next">từ khác →</button></p>`);
  }
  function onboard() {
    mode = "onboard";
    write(`<p class="k">chào, tui là ${esc(game.cat.name)}</p><h1 class="w">học gì nè?</h1>
      <p class="acts big">${Object.entries(LANGS).map(([k, v]) => `<button data-picklang="${k}">${v.vi}</button>`).join("")}</p>
      <p class="vi small">Mỗi ngày vài từ thôi. Tui viết lên đây, rồi thả bướm ra đố. Lười là tui biết liền.</p>`);
  }

  // ------------------------------------------------------------------ đố ngay trên cảnh
  function canQuiz(c) { const st = learn.stat(c.id); return st && st.seen; }
  function quiz(c, src = "wall") {
    if (!c) return; mode = "quiz"; cur = c; clearTimeout(quizT); lastQuiz = Date.now();
    const plus = game.can("quiz.listen") && s.settings.tts, st = learn.stat(c.id) || {};
    const kind = plus && st.box >= 2 && Math.random() < 0.3 ? "listen" : Math.random() < 0.55 ? "mc" : "rev";
    const opts = learn.options(c, 4);
    const tag = (o) => (kind === "mc" ? o.vi : o.w);
    const prompt = kind === "mc" ? `<h1 class="w ${c.lang}">${esc(c.w)}${say(c)}</h1><p class="ph">${esc(c.ph || "")}</p><p class="hint">nghĩa là gì? bắt con bướm đúng nghĩa</p>`
      : kind === "rev" ? `<h1 class="w vi">${esc(c.vi)}</h1><p class="hint">từ nào? bắt con bướm mang đúng chữ</p>`
      : `<h1 class="w">nghe nè ${say(c)}</h1><p class="hint">nghe rồi bắt con bướm mang đúng chữ</p>`;
    write(`<p class="k">${src === "cat" ? `${esc(game.cat.name)} đố` : "đố nè"}${series.length ? ` · còn ${series.length}` : ""}</p>${prompt}
      <p class="opts">${opts.map((o) => `<button data-ans="${esc(o.id)}" class="${kind === "mc" ? "" : o.lang}">${esc(tag(o))}</button>`).join("")}</p><p class="acts"><button data-w="skip">bỏ qua</button></p>`, "quiz");
    cr.answers(opts.map((o) => ({ id: o.id, tag: tag(o), lang: kind === "mc" ? "vi" : o.lang })), (id, b) => answer(id, b));
    if (kind === "listen") setTimeout(() => game.speakCard(c), 300);
    quizT = setTimeout(() => { if (mode === "quiz") { whisper(game.lineOf("pawtap_no")); cr.clearAnswers(); series = []; ambient(true); } }, 45000);
  }
  function answer(id, b) {
    if (mode !== "quiz" || !cur) return; mode = "result"; clearTimeout(quizT);
    const c = cur, ok = id === c.id, r = learn.answer(c.id, ok);
    tl.querySelectorAll("[data-ans]").forEach((x) => { x.disabled = true; if (x.dataset.ans === c.id) x.classList.add("right"); else if (x.dataset.ans === id) x.classList.add("wrong"); });
    const bf = game.critters.list.find((x) => x.answer && x.id === c.id); if (bf) cr.land(bf, true); if (b && !ok) cr.land(b, false);
    setTimeout(() => cr.clearAnswers(), 1400);
    const line = game.react(r, c); game.sayLine(line, 3200);
    const res = document.createElement("p"); res.className = "res"; res.innerHTML = ok ? `đúng rồi ✓${r.combo >= 3 ? ` · ${r.combo} câu liền` : ""}` : `sai · <b>${esc(c.w)}</b> = ${esc(c.vi)}`;
    tl.appendChild(res); game.buzz?.(ok ? 8 : [20, 50, 20]); if (ok) game.speakCard(c);
    if (!ok && !c._retry) { c._retry = 1; series.push(c); }
    setTimeout(next, ok ? 2000 : 3200);
  }
  function next() {
    if (series.length) { const n = series.shift(); if (n.__new) return showNew(n); return quiz(n); }
    if (mode === "result" || mode === "quiz") { ambient(true); if (learn.doneToday()) { game.say("done"); game.emit("lesson-done"); } }
  }
  /** "học": từ mới hiện lên từng từ, bấm nhớ rồi → bướm đố ngay; xong tới các từ cần ôn */
  function lesson(kind = "full") {
    if (!s.onboarded) return onboard();
    const neu = kind === "full" ? learn.newToday() : [], due = kind === "fun" ? [] : learn.due().slice(0, kind === "review" ? 8 : 12);
    series = []; neu.forEach((c) => series.push(Object.assign(Object.create(c), { __new: 1 })));
    due.filter((c) => !neu.some((n) => n.id === c.id)).forEach((c) => series.push(c));
    if (!series.length) { const pool = [...learn.learning(), ...learn.mastered().filter((c) => c.lang === learn.lang)]; if (!pool.length) { whisper(game.lineOf("idle_tap")); return; } series = [pick(pool)]; }
    next();
  }
  function showNew(c0) {
    const c = Object.getPrototypeOf(c0); mode = "new"; cur = c; tl.dataset.id = c.id;
    write(`<p class="k">từ mới${series.filter((x) => x.__new).length ? ` · còn ${series.filter((x) => x.__new).length} từ nữa` : ""}</p><h1 class="w ${c.lang}">${esc(c.w)}${say(c)}</h1><p class="ph">${esc(c.ph || "")}${c.pos ? ` · ${esc(c.pos)}` : ""}</p><p class="vi">${esc(c.vi)}</p>
      ${c.ex ? `<p class="ex ${c.lang}">${esc(c.ex)}${c.exPh ? `<small>${esc(c.exPh)}</small>` : ""}<i>${esc(c.exVi || "")}</i></p>` : ""}<p class="acts"><button data-w="seen-next">nhớ rồi, đố đi ✓</button></p>`, "new");
    if (s.settings.tts) setTimeout(() => game.speakCard(c), 400);
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
    const sp = e.target.closest("[data-say]"); if (sp) { game.speakCard(learn.card(sp.dataset.say)); return; }
    const an = e.target.closest("[data-ans]"); if (an) return answer(an.dataset.ans);
    const lg = e.target.closest("[data-picklang]"); if (lg) { learn.setLang(lg.dataset.picklang); s.onboarded = true; game.save && game.persist(); whisper(`Ok, học ${LANGS[lg.dataset.picklang].vi.replace(/^Tiếng/, "tiếng")}.`); ambient(true); clock(); return lesson("full"); }
    const b = e.target.closest("[data-w]"); if (!b) return; const a = b.dataset.w;
    if (a === "seen" && cur) { learn.seen(cur.id); whisper(game.lineOf("newword", { w: cur.w })); setTimeout(() => quiz(cur), 900); return; }
    if (a === "seen-next" && cur) { learn.seen(cur.id); return quiz(cur); }
    if (a === "next") { shift++; return ambient(true); }
    if (a === "quizme" && cur) return quiz(cur);
    if (a === "skip") { cr.clearAnswers(); series = []; clearTimeout(quizT); return ambient(true); }
    if (a === "learn") return lesson("full");
    if (a === "review") return learn.todo().due ? lesson("review") : lesson("fun");
    game.showSheet?.(a);
  });

  // tự đố khi đang nhìn: 4–7 phút một lần, nếu có từ đã học
  setInterval(() => {
    clock();
    if (document.hidden || game.sheetOpen?.() || game.closeup?.busy) return;
    if (mode === "ambient") { ambient(); const quizable = [...learn.due(), ...learn.learning().filter(canQuiz)]; if (quizable.length && Date.now() - lastQuiz > (4 + Math.random() * 3) * 60e3 && Date.now() - (game.lastInput || 0) < 10 * 60e3) quiz(quizable[0]); }
  }, 15000);
  for (const k of ["learn", "lang", "streak"]) game.on(k, clock);
  // dòng mèo viết lề hết đúng nữa thì tự xoá (vd: "chưa học chữ nào" sau khi đã học)
  game.on("learn", () => { const t = learn.todo(), n0 = (s.wall || []).length; s.wall = (s.wall || []).filter((n) => !((n.kind === "new" && !t.neu) || (n.kind === "due" && !t.due))); if (s.wall.length !== n0) drawScribs(false); });
  game.on("lang", () => { shift = 0; ambient(true); });
  clock(); ambient(true); drawScribs(false);
  return { ambient, quiz, lesson, whisper, scribble, get mode() { return mode; } };
}
export { norm, dayKey };
