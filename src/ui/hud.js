// GIAO DIỆN nổi trên sân khấu chì: thẻ mèo, đảo thông báo, nút Học, bảng trượt (sheet).
import { APP, PLANS, SKINS, DAILY_OPTS, BOOK_LIMIT, READ_LIMIT, REMIND, can, planOf } from "../config.js";
import { TRAITS, ZONES, SPOTS } from "../cat/personality.js";
import { esc, hhmm, dayKey } from "../core/util.js";
import { save } from "../core/store.js";
import { unlock } from "../core/sound.js";
import { SKILLS, levelOf, nextXp } from "../cat/memory.js";
import { TIERS } from "../cat/bond.js";
import { LANGS, parseCsv, allCards } from "../learn/packs.js";
import { buildIndex, scanText } from "../learn/scan.js";
import { line } from "../cat/lines.js";
import { BOX_IV, MASTER } from "../learn/srs.js";
import { icon } from "./icons.js";

const ACT_VI = { nap: "Đang ngủ", watch: "Ngắm trời", explore: "Đi dạo", groom: "Liếm lông", zoomies: "Chạy rần rần", selfplay: "Tự chơi", perch: "Leo trèo", chase: "Đuổi bướm", seek: "Tìm bạn", sulk: "Đang dỗi", write: "Viết bậy lên tường", nag: "Kháy bạn", quizme: "Đố bạn", headbutt: "Dụi đầu", blinkat: "Chớp mắt", knead: "Nhào bột", bellyup: "Khoe bụng", pawtap: "Gõ màn hình", sleepnear: "Ngủ cạnh bạn", sniff: "Ngửi hoa", sunbathe: "Phơi nắng", sitpretty: "Ngồi ngắm bạn", pondgaze: "Ngắm ao", scratchtree: "Mài móng vô cây", yarn: "Chơi cuộn len", flowerpounce: "Vồ hoa", greet: "Đón bạn", follow: "Đi theo bạn", wander: "Thong thả", pet: "Được vuốt ve", sleep: "Ngủ" };
const planChip = (p) => (p === "free" ? "" : `<span class="chip chip-${p}">${PLANS[p].vi}</span>`);

export function createHud(game, root) {
  const s = game.save, R = game.R, learn = game.learn;
  const el = document.createElement("div"); el.className = "hud"; root.appendChild(el);
  el.innerHTML = `<div class="sheet-wrap" hidden><div class="scrim" data-a="close"></div><section class="sheet" role="dialog" aria-modal="true"><div class="grab"></div><div class="sheet-body"></div></section></div>`;
  const q = (x) => el.querySelector(x);
  const toast = (text) => game.wall?.whisper(text);
  game.on("bond-up", (t) => { game.buzz?.([20, 60, 20, 60, 40]); toast(`${t.emo} ${game.cat.name} giờ coi bạn là ${t.vi.toLowerCase()}. ${t.unlock}`); });
  game.on("grudge", (on) => toast(on ? `${game.cat.name} đang giận. Học bù đi.` : `${game.cat.name} hết giận rồi`));
  game.on("skill", ({ k, level }) => toast(`${game.cat.name} lên cấp ${SKILLS[k].vi.toLowerCase()} ${level}`));
  game.on("bloom", (c) => toast(`Mới nở một bông: ${c.w} = ${c.vi}`));
  game.on("streak", (n) => { if (n > 1) toast(`${n} ngày liền rồi đó`); });
  function refresh() {}

  // ------------------------------------------------------------------ bảng trượt
  const wrap = q(".sheet-wrap"), body = q(".sheet-body");
  let closeT = 0;
  game.sheetOpen = () => !wrap.hidden;
  function open(html, cls = "") { clearTimeout(closeT); game.buzz?.(6); const keep = wrap.classList.contains("open"); body.innerHTML = html; wrap.className = "sheet-wrap " + cls + (keep ? " open" : ""); wrap.hidden = false; if (!keep) requestAnimationFrame(() => wrap.classList.add("open")); }
  function close() { wrap.classList.remove("open"); clearTimeout(closeT); closeT = setTimeout(() => { wrap.hidden = true; body.innerHTML = ""; }, 260); refresh(); }
  const head = (t, sub = "") => `<div class="sh-head"><div><h2>${t}</h2>${sub ? `<p>${sub}</p>` : ""}</div><button class="ic" data-a="close" aria-label="Đóng">${icon("close")}</button></div>`;
  const lock = (feat) => !can(s.plan, feat);
  const boxDots = (b = 0) => `<i class="dots" title="Hộp ${b}/6">${Array.from({ length: 6 }, (_, i) => `<b class="${i < b ? "on" : ""}"></b>`).join("")}</i>`;
  const noteCard = (x, today) => `<article class="letter${today ? " today" : ""}"><header>${icon("letter")}<time>${x.d === dayKey() ? "Sáng nay" : new Date(x.d).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" })}</time></header>${x.text.split("\n").map((l) => `<p>${esc(l)}</p>`).join("")}</article>`;
  let wordsTab = "book", readRes = null, readText = "";
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

  const tabBar = (tabs) => `<div class="tabs scroll">${tabs.map(([k, v]) => `<button data-wtab="${k}" class="${wordsTab === k ? "on" : ""}">${v}${k === "book" && s.learn.book.length ? ` <small>${s.learn.book.length}</small>` : ""}</button>`).join("")}</div>`;
  function hotList() {
    const H = learn.hotToday(), locked = learn.hotLocked(), d = s.learn.hot?.d;
    const row = (h) => { const c = h.card, on = learn.booked(c.id), st = learn.stat(c.id) || {};
      return `<li class="hrow"><button class="sp" data-bsay="${esc(c.id)}" aria-label="Nghe">${icon("speaker")}</button>
        <div><span class="tag">${esc(h.tag)}${h.level ? ` · ${esc(h.level)}` : ""}</span><br><span class="w ${c.lang}">${esc(c.w)}</span><span class="ph">${esc(c.ph || "")}</span><span class="vi">${esc(c.vi)}</span>
        <span class="hw">${esc(h.why)}${(h.src || []).map((x) => ` <a href="${esc(x.u)}" target="_blank" rel="noopener">${esc(x.t)} ↗</a>`).join("")}</span></div>
        ${st.seen ? boxDots(st.box || 0) : `<button class="ib star${on ? " on" : ""}" data-hstar="${esc(c.id)}" aria-label="${on ? "Bỏ khỏi sổ" : "Lưu vào sổ"}">${icon("star")}</button>`}</li>`; };
    const arch = (s.learn.hot?.archive || []).map((a) => ({ d: a.d, items: a.items.filter((h) => h.lang === learn.lang).map((h) => ({ ...h, card: learn.card(h.id) })).filter((h) => h.card) })).filter((a) => a.items.length);
    return `<p class="muted">${d ? `Mẻ ngày ${new Date(d).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" })} · ` : ""}chữ đang nổi trên báo và mạng. Câu ví dụ tự viết, bấm ↗ để đọc tin gốc.</p>
      ${H.some((h) => !learn.stat(h.card.id)?.seen) ? `<button class="primary" data-a="learnhot">${icon("bolt")} Học chữ nóng (${H.filter((h) => !learn.stat(h.card.id)?.seen).length})</button>` : ""}
      <ol class="hlist">${H.map(row).join("") || `<p class="muted">Chưa có mẻ nào. Mở mạng một lần để mèo lấy chữ mới.</p>`}</ol>
      ${locked > 0 ? `<button class="locked" data-a="plans">${icon("lock")} Còn ${locked} chữ nóng nữa hôm nay · Plus</button>` : ""}
      ${arch.length ? (lock("trend.archive") ? `<button class="locked" data-a="plans">${icon("lock")} Xem lại chữ nóng ${arch.length} ngày trước · Pro</button>` : arch.map((a) => `<details class="harch"><summary>${new Date(a.d).toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "numeric" })} · ${a.items.length} chữ</summary><ol class="hlist">${a.items.map(row).join("")}</ol></details>`).join("")) : ""}`;
  }
  function remindBlock() {
    const N = game.notify; if (!N) return "";
    const st = N.status(), R = N.R, on = R.on && st === "ok", max = N.maxTimes();
    const note = { "ios-install": "iPhone chỉ nhận thông báo khi mở app từ màn hình chính: Safari › Chia sẻ › Thêm vào MH chính, rồi bật ở đây.", denied: "Bạn đã chặn thông báo. Vào cài đặt trình duyệt cho phép lại.", unsupported: "Trình duyệt này không hỗ trợ thông báo." }[st];
    return `<div class="remind"><div class="row"><span>${icon("bell")} ${esc(game.cat.name)} nhắc học</span>${on ? `<input type="checkbox" data-remind checked>` : st === "ask" || (st === "ok" && !R.on) ? `<button class="btn pri sm" data-a="remind-on">Bật</button>` : ""}</div>
      ${note ? `<p class="muted">${note}</p>` : ""}
      ${on ? `<div class="row"><span>Giờ nhắc${max > 1 ? ` (tối đa ${max})` : ""}</span><span class="seg">${REMIND.presets.map((hm) => `<button data-rtime="${hm}" class="${R.times.includes(hm) ? "on" : ""}">${hm.replace(/^0/, "")}</button>`).join("")}</span></div>
        ${max === 1 ? `<button class="locked" data-a="plans">${icon("lock")} Nhắc tới 3 lần/ngày + cứu chuỗi buổi tối · Plus</button>` : `<label class="row"><span>Nhắc cứu chuỗi lúc 21:30</span><input type="checkbox" data-rstreak ${R.streak ? "checked" : ""}></label>`}
        <button class="ghost" data-a="remind-test">${icon("bell")} Thử nhắc ngay</button>
        <p class="muted">${REMIND.endpoint ? "Nhắc cả khi đã đóng app." : "Hiện nhắc được khi app còn mở hoặc chạy nền. Muốn nhắc cả khi đóng app: bật máy chủ nhắc (xem README)."} Học xong bài trong ngày thì ${esc(game.cat.name)} im.</p>` : ""}</div>`;
  }
  function bookList() {
    const B = learn.book().filter((b) => b.card.lang === learn.lang), lim = can(s.plan, "book.unlimited") ? 0 : BOOK_LIMIT.free, ready = B.filter((b) => b.card.vi).length;
    const row = (b) => { const c = b.card, st = learn.stat(c.id) || {}, src = host(b.url) || (b.src === "read" ? "đọc ké" : b.src === "ext" ? "tiện ích" : "");
      return `<li class="brow"><button class="sp" data-bsay="${esc(c.id)}" aria-label="Nghe">${icon("speaker")}</button><span class="w ${c.lang}">${esc(c.w)}</span>
        ${c.vi ? `<span class="vi">${esc(c.vi)}</span>` : `<input class="bvi" data-bvi="${esc(c.id)}" placeholder="điền nghĩa…" maxlength="80">`}
        ${boxDots(st.box || 0)}<button class="ic bx" data-unbook="${esc(c.id)}" aria-label="Bỏ khỏi sổ">${icon("close")}</button>
        ${b.ctx || src ? `<small class="bctx">${b.ctx ? `“${esc(b.ctx.slice(0, 90))}”` : ""}${src ? ` · ${esc(src)}` : ""}</small>` : ""}</li>`; };
    return `<p class="muted">${B.length} từ${lim ? ` / ${lim} (Free)` : ""} · bấm ☆ ở chữ trên tường, ở Đọc cùng mèo, hoặc bôi đen trên web (tiện ích) để lưu.</p>
      ${ready ? `<button class="primary" data-a="learnbook">${icon("bolt")} Học sổ này (${ready} từ)</button>` : ""}
      <ol class="wlist book">${B.map(row).join("") || `<p class="muted">Sổ trống. Lưu mấy chữ hay gặp đi.</p>`}</ol>
      ${lim && B.length >= lim ? `<button class="locked" data-a="plans">${icon("lock")} Sổ đầy. Plus lưu không giới hạn</button>` : ""}`;
  }
  const SHEETS = {

    words() {
      const lists = { today: learn.todayCards(), learning: learn.learning(), mastered: learn.mastered().filter((c) => c.lang === learn.lang), weak: learn.weak(30) };
      const L = lists[wordsTab] || [];
      const row = (c) => { const st = learn.stat(c.id) || {}; return `<li><button class="wrow" data-wd="${esc(c.id)}"><span class="w ${c.lang}">${esc(c.w)}</span><span class="vi">${esc(c.vi)}</span>${boxDots(st.box || 0)}</button><div class="wex" hidden>${esc(c.ph || "")}${c.ex ? `<br><i>${esc(c.ex)}</i>${c.exPh ? `<br><small>${esc(c.exPh)}</small>` : ""}<br><small>${esc(c.exVi || "")}</small>` : ""}${st.seen ? `<br><small>Đúng ${st.right || 0} · sai ${st.wrong || 0}${st.due ? ` · ôn lại ${st.due <= Date.now() ? "ngay" : new Date(st.due).toLocaleDateString("vi-VN")}` : ""}</small>` : ""}</div></li>`; };
      const tabs = [["book", "Sổ của tôi"], ["hot", "Chữ nóng"], ["today", "Hôm nay"], ["learning", "Đang học"], ["mastered", "Đã thuộc"], ["weak", "Hay sai"]];
 if (wordsTab === "book") return head("Sổ từ", `${LANGS[learn.lang].vi}`) + tabBar(tabs) + bookList();
      if (wordsTab === "hot") return head("Sổ từ", `${LANGS[learn.lang].vi}`) + tabBar(tabs) + hotList();
      return head("Sổ từ", `${LANGS[learn.lang].vi} · ${esc(learn.levels().find((l) => l.key === s.learn.level[learn.lang])?.vi || "")}`) + tabBar(tabs) + `
        ${wordsTab === "weak" && lock("stats.full") ? `<button class="locked" data-a="plans">${icon("lock")} Danh sách từ hay sai có trong Plus</button>` : `<ol class="wlist">${L.map(row).join("") || `<p class="muted">Trống. ${wordsTab === "mastered" ? "Học đều tay thì sẽ có." : "Bấm Học để bắt đầu."}</p>`}</ol>`}`;
    },
    book() { wordsTab = "book"; return SHEETS.words(); },
    read() {
      const lim = READ_LIMIT[s.plan] || READ_LIMIT.free, r = readRes;
      const known = (c) => learn.stat(c.id)?.box >= MASTER ? "thuộc" : learn.stat(c.id)?.seen ? "đang học" : "chưa học";
      const chip = (c) => `<button class="rchip ${c.lang} k-${known(c) === "thuộc" ? "m" : known(c) === "đang học" ? "l" : "n"}" data-rsave="${esc(c.id)}" title="${esc(c.vi)}">${learn.booked(c.id) ? "★" : "☆"} ${esc(c.w)}<small>${esc(c.vi)}</small></button>`;
      return head("Đọc cùng mèo", "Dán đoạn bạn đang đọc. Mèo quét, chỉ chữ đáng lưu.") + `<textarea class="rbox" data-rtext maxlength="${lim}" placeholder="Dán bài báo, email, caption…">${esc(readText)}</textarea>
        <p class="muted rlim">${readText.length}/${lim} ký tự${lim < 60000 ? ` · Plus đọc bài dài` : ""}</p>
        <button class="primary" data-a="scan">${icon("eye")} Cho mèo đọc</button>
        ${r ? `<p class="rsay">${esc(r.say)}</p>
          <h3>Chữ trong gói (${r.found.length})</h3><div class="rchips">${r.found.slice(0, 40).map((f) => chip(f.card)).join("") || `<p class="muted">Không có chữ nào trong gói ${LANGS[learn.lang].vi.toLowerCase()}.</p>`}</div>
          ${r.strange.length ? `<h3>Chữ lạ đáng lưu</h3><div class="rchips">${r.strange.map((x) => `<button class="rchip k-n" data-rnew="${esc(x.w)}">${learn.booked(`en:my:${x.w}`) ? "★" : "☆"} ${esc(x.w)}${x.n > 1 ? `<small>×${x.n}</small>` : ""}</button>`).join("")}</div><p class="muted">Lưu chữ lạ vào sổ, rồi điền nghĩa trong Sổ của tôi để mèo đố.</p>` : ""}` : ""}
        <p class="muted">Trên máy tính: cài tiện ích Purrsona cho Chrome, mèo đọc ké ngay trên trang. Trên điện thoại: bấm Chia sẻ → Purrsona.</p>`;
    },
    stats() {
      const days = lock("stats.full") ? 7 : 30, arr = []; for (let i = days - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = dayKey(d), v = s.learn.days[k] || { right: 0, wrong: 0, new: 0 }; arr.push({ k, d, v }); }
      const max = Math.max(5, ...arr.map((x) => x.v.right + x.v.wrong)), c = learn.counts(), S2 = s.learn.streak;
      const all = arr.reduce((a, x) => ({ r: a.r + x.v.right, w: a.w + x.v.wrong }), { r: 0, w: 0 }), acc = all.r + all.w ? Math.round((all.r / (all.r + all.w)) * 100) : 0;
      return head("Tiến độ", `${LANGS[learn.lang].vi}`) + `<div class="kpis"><div><b>🔥 ${learn.streakAlive()}</b><small>ngày liền · kỷ lục ${S2.best}</small></div><div><b>${c.mastered}</b><small>từ đã thuộc</small></div><div><b>${c.learning}</b><small>đang học</small></div><div><b>${acc}%</b><small>đúng ${days} ngày</small></div></div>
        <h3>${days} ngày gần đây</h3><div class="bars">${arr.map((x) => `<div title="${x.k}: ${x.v.right} đúng, ${x.v.wrong} sai"><i style="height:${((x.v.right) / max) * 100}%"></i><i class="w" style="height:${(x.v.wrong / max) * 100}%"></i><small>${x.d.getDate()}</small></div>`).join("")}</div>
        <p class="muted">Cột đặc: câu đúng · cột gạch: câu sai. Cấp hiện tại: ${c.mastered + c.learning}/${c.total} từ đã gặp.</p>
        ${lock("stats.full") ? `<button class="locked" data-a="plans">${icon("lock")} Xem 30 ngày và từ hay sai với Plus</button>` : ""}
        <h3>Ôn lại theo hộp</h3><p class="muted">${BOX_IV.slice(1).map((ms, i) => `hộp ${i + 1}: ${Math.round(ms / 864e5)} ngày`).join(" · ")}. Lên hộp ${MASTER} là thuộc – một bông hoa nở ngoài vườn.</p>`;
    },
    notes() {
      s.noteSeen = dayKey(); save(s);
      const L = [...(s.notes || [])].reverse(), all = !lock("notes.archive"), shown = all ? L : L.slice(0, 1);
      return head(`Giấy nhắn của ${esc(game.cat.name)}`, "Mỗi sáng một tờ, viết từ chuyện học hôm qua.") + `<div class="letters">${shown.map((x, i) => noteCard(x, i === 0)).join("")}</div>
        ${!all && L.length > 1 ? `<button class="locked" data-a="plans">${icon("lock")} Đọc lại ${L.length - 1} tờ cũ với Plus</button>` : ""}`;
    },

    cat() {
      const t = game.today, tr = t.traits, mem = game.memory, M = mem.M, bd = game.bond, nx = bd.next, fl = learn.mastered().length;
      const skills = Object.entries(SKILLS).map(([k, d]) => { const xp = M.skills[k] || 0, lv = levelOf(xp), n2 = nextXp(xp), base = [0, 4, 12, 28, 55, 100][lv], pct = lv >= 5 ? 100 : Math.round(((xp - base) / (n2 - base)) * 100); return `<div class="skill"><span class="se">${d.emo}</span><div><b>${d.vi} <em>Cấp ${lv}</em></b><s><u style="width:${pct}%"></u></s><small>${lv >= 5 ? "Tối đa" : d.how} · ${d.perk}</small></div></div>`; }).join("");
      return head(esc(game.cat.name), `${esc(game.cat.breed || "")} · ${game.age.vi} · gọi bạn là “${esc(s.profile.nick || "Sen")}”`) + `
      <div class="bondcard"><div class="bc-top"><span class="bc-emo">${bd.T.emo}</span><div><small>Gắn bó</small><b>${bd.T.vi}</b></div><em>${Math.round(bd.v)}/100</em></div>
        <s><u style="width:${bd.pct}%"></u></s><p>${nx ? `Còn ${Math.ceil(nx.min - bd.v)} điểm nữa thành <b>${nx.vi}</b>: ${nx.unlock}` : "Thân nhất rồi. Vẫn kháy, nhưng là kháy yêu."}</p>
        <ol class="tiers">${TIERS.map((x, i) => `<li class="${i <= bd.tier ? "on" : ""}"><span>${i <= bd.tier ? x.emo : icon("lock")}</span><div><b>${x.vi}</b><small>${x.unlock}</small></div></li>`).join("")}</ol>
        <p class="muted">Tăng khi: học đều, đúng liền mạch, thuộc từ mới, vuốt đúng chỗ, đáp lại khi mèo dụi/gõ màn hình.</p></div>
      <div class="moodcard"><div class="mc-emo">${t.mood.emo}</div><div><small>Hôm nay</small><b>${t.mood.vi}</b><p>${t.mood.desc}</p></div></div>
      <h3>Tính cách hôm nay</h3><div class="traits">${Object.entries(TRAITS).map(([k, vi]) => `<div><span>${vi}</span><s><u style="width:${Math.round(tr[k] * 100)}%"></u></s></div>`).join("")}</div>
      <h3>Sở thích</h3><div class="likes"><div><small>Thích được gãi</small><b>${ZONES[t.likeZone]}</b></div><div><small>Chỗ ruột hôm nay</small><b>${SPOTS[t.spot] || "—"}</b></div></div>
      <h3>Thói tật</h3><div class="quirks">${game.quirks.map((x) => `<div><span>${x.emo}</span><div><b>${x.vi}</b><small>${x.desc}</small></div></div>`).join("")}</div>
      <h3>Phụ kiện · mở bằng hoa (${fl} 🌼)</h3><div class="skins">${SKINS.map((k) => { const ok = game.skinOpen(k.id); return `<button data-skin="${k.id}" class="${s.skin === k.id ? "on" : ""} ${ok ? "" : "lockd"}">${R.snapshot("sit", k.id)}<small>${k.vi}${ok ? "" : ` · ${k.feat && lock(k.feat) ? "Pro" : k.flowers + " hoa"}`}</small></button>`; }).join("")}</div>
      <h3>Kỹ năng</h3><div class="skills">${skills}</div>
      <h3>${esc(game.cat.name)} nhớ…</h3>${M.notes.length ? `<ol class="notes">${M.notes.slice(0, 8).map((n) => `<li>${esc(n.text)}</li>`).join("")}</ol>` : `<p class="muted">Chưa nhớ gì nhiều.</p>`}
      <p class="muted">Mẹo: chạm 1 lần = mèo đố bạn · chạm đúp = đập tay · vuốt = gãi.</p>`;
    },
    menu() {
      return head(APP.name, APP.tagline) + `<div class="menu">
        <button data-a="learn"><span>${icon("pencil")}</span>Học</button><button data-a="review"><span>${icon("bolt")}</span>Ôn nhanh</button>
        <button data-a="words"><span>${icon("book")}</span>Sổ từ</button><button data-a="read"><span>${icon("eye")}</span>Đọc cùng mèo</button><button data-a="stats"><span>${icon("chart")}</span>Tiến độ</button>
        <button data-a="notes"><span>${icon("letter")}</span>Giấy nhắn</button><button data-a="cat"><span>${icon("cat")}</span>Hồ sơ mèo</button>
        <button data-a="plans"><span>${icon("star")}</span>Gói ${planChip(s.plan) || "Miễn phí"}</button><button data-a="settings"><span>${icon("settings")}</span>Cài đặt</button></div>`;
    },
    lang() {
      const L = s.learn;
      return head("Ngôn ngữ & trình độ") + `<div class="pick2">${Object.entries(LANGS).map(([k, v]) => `<button data-setlang="${k}" class="${L.lang === k ? "on" : ""}"><b>${v.flag}</b><span>${v.vi}</span></button>`).join("")}</div>
        <h3>Trình độ ${LANGS[L.lang].vi}</h3><div class="lvls">${learn.levels().map((lv) => { const lk = lock(lv.tier === "pro" ? "level.pro" : lv.tier === "plus" ? "level.plus" : "x"); return `<button data-level="${lv.key}" class="${L.level[L.lang] === lv.key ? "on" : ""} ${lk ? "lockd" : ""}">${esc(lv.vi)}<small>${lv.n} từ${lk ? ` · ${icon("lock")} ${PLANS[lv.tier].vi}` : ""}</small></button>`; }).join("")}</div>
        <p class="muted">Đổi ngôn ngữ không mất tiến độ – mỗi ngôn ngữ có hoa riêng trong vườn.</p>`;
    },
    plans() {
      const rows = [["Học mỗi ngày, ôn lặp lại, vườn hoa chữ", 1, 1, 1], ["Cấp độ", "A2 · HSK 1", "Đến B2 · HSK 3", "+ gói chuyên ngành"], ["Từ mới mỗi ngày", "tối đa 5", "tối đa 20", "tối đa 50"], ["Câu nghe đọc & tự gõ", 0, 1, 1], ["Thống kê 30 ngày, từ hay sai", 0, 1, 1], ["Đọc lại giấy nhắn cũ", 0, 1, 1], ["Tiếng Anh tài chính – kinh doanh", 0, 0, 1], ["Tự nhập danh sách từ (CSV)", 0, 0, 1], ["Mèo kháy bằng AI theo đúng từ bạn sai", 0, 0, 1]];
      const cell = (v) => (v === 1 ? "✓" : v === 0 ? "–" : v);
      return head("Gói", "Bản thử: chọn gói để mở khoá ngay (chưa nối thanh toán).") + `<div class="plans">${Object.entries(PLANS).map(([k, p]) => `<button data-plan="${k}" class="${s.plan === k ? "on" : ""}"><b>${p.vi}</b><span>${p.price}</span><small>${p.note}</small>${s.plan === k ? "<em>Đang dùng</em>" : ""}</button>`).join("")}</div>
      <table class="cmp"><thead><tr><th></th><th>Free</th><th>Plus</th><th>Pro</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r[0]}</td>${r.slice(1).map((v) => `<td>${cell(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    },
    settings() {
      const h = s.settings.hour, L = s.learn;
      return head("Cài đặt") + `<div class="settings">${remindBlock()}
        <button class="row link" data-a="lang"><span>Ngôn ngữ & trình độ</span><span>${LANGS[L.lang].vi} ›</span></button>
        <div class="row"><span>Từ mới mỗi ngày</span><span class="seg">${DAILY_OPTS[s.plan].map((n) => `<button data-daily="${n}" class="${L.daily === n ? "on" : ""}">${n}</button>`).join("")}</span></div>
        <div class="row"><span>Đổi chữ trên tường</span><span class="seg">${[5, 15, 60].map((n) => `<button data-rot="${n}" class="${(s.settings.rotate || 15) === n ? "on" : ""}">${n === 60 ? "1 giờ" : n + "′"}</button>`).join("")}</span></div>
        <div class="row"><span>Sân vườn</span><span class="seg">${[["full", "Đầy đủ"], ["calm", "Gọn"], ["bare", "Trống"]].map(([k, v]) => `<button data-yard="${k}" class="${(s.settings.yard || "full") === k ? "on" : ""}">${v}</button>`).join("")}</span></div>
        <label class="row"><span>${esc(game.cat.name)} gọi bạn là</span><input class="nick" type="text" maxlength="16" value="${esc(s.profile.nick || "Sen")}" data-nick placeholder="Sen"></label>
        <label class="row"><span>Đọc to từ vựng</span><input type="checkbox" data-set="tts" ${s.settings.tts ? "checked" : ""}></label>
        <label class="row"><span>Từ mới tự đọc khi hiện</span><input type="checkbox" data-set="autoSay" ${s.settings.autoSay !== false ? "checked" : ""}></label>
        <label class="row"><span>Mèo kháy thường xuyên</span><input type="checkbox" data-set="nag" ${s.settings.nag !== false ? "checked" : ""}></label>
        <div class="row"><span>Tốc độ đọc</span><span class="seg">${[[0.7, "Chậm"], [0.9, "Vừa"], [1.05, "Nhanh"]].map(([v, k]) => `<button data-rate="${v}" class="${(s.settings.rate || 0.9) === v ? "on" : ""}">${k}</button>`).join("")}</span></div>
        <div class="row"><span>Cỡ giao diện</span><span class="seg">${[["s", "Nhỏ"], ["m", "Vừa"], ["l", "Lớn"]].map(([k, v]) => `<button data-ui="${k}" class="${(s.settings.ui || "m") === k ? "on" : ""}">${v}</button>`).join("")}</span></div>
        <label class="row"><span>Âm thanh (meo, rừ rừ)</span><input type="checkbox" data-set="sound" ${s.settings.sound ? "checked" : ""}></label>
        <label class="row"><span>Nhạc lo-fi</span><input type="checkbox" data-set="music" ${s.settings.music ? "checked" : ""}></label>
        <label class="row"><span>Rung nhẹ</span><input type="checkbox" data-set="haptics" ${s.settings.haptics !== false ? "checked" : ""}></label>
        <label class="row"><span>Máy quay theo mèo</span><input type="checkbox" data-set="follow" ${s.settings.follow ? "checked" : ""}></label>
        <label class="row"><span>Mèo kháy bằng AI ${planChip("pro")}</span><input type="checkbox" data-set="aiVoice" ${s.settings.aiVoice ? "checked" : ""} ${can(s.plan, "ai.voice") ? "" : "disabled"}></label>
        <label class="row"><span>Giảm chuyển động</span><input type="checkbox" data-set="reduced" ${s.settings.reduced ? "checked" : ""}></label>
        <div class="row col"><span>Giờ trong nhà <small>${h == null ? "Theo giờ thật" : `Xem thử ${Math.floor(h)}:00`}</small></span><input type="range" min="-1" max="23.5" step="0.5" value="${h ?? -1}" data-set="hour"></div>
        <label class="row ${lock("import.csv") ? "lockd" : ""}"><span>Nhập danh sách từ (CSV) ${planChip("pro")}<small>từ, phiên âm, nghĩa, ví dụ, dịch</small></span>${lock("import.csv") ? `<button class="ghost" data-a="plans">Mở</button>` : `<input type="file" accept=".csv,.txt,text/csv" data-csv hidden><span class="ghost">${icon("upload")}</span>`}</label>
        <div class="row two"><button data-a="export" class="ghost">Sao lưu</button><button data-a="reset" class="ghost danger">Học lại từ đầu</button></div>
        <p class="muted">${APP.name} ${APP.version} · Dữ liệu chỉ lưu trên máy này.</p></div>`;
    },
  };
  function show(k) { if (SHEETS[k]) open(SHEETS[k](), "sh-" + k); }
  game.showSheet = show;

  // ------------------------------------------------------------------ chào ngày mới / lần đầu
  game.welcome = () => { if (game.newDay && game.note && s.onboarded) toast(`${game.cat.name} để lại giấy nhắn. Bấm ≡ để đọc.`); };

  // ------------------------------------------------------------------ bấm nút
  el.addEventListener("click", (e) => {
    unlock(); game.lastInput = Date.now(); game.musicResume?.();
    const b = e.target.closest("[data-a],[data-plan],[data-skin],[data-ui],[data-setlang],[data-level],[data-daily],[data-wtab],[data-wd],[data-rate],[data-rot],[data-yard],[data-rtime],[data-bsay],[data-unbook],[data-rsave],[data-rnew],[data-hstar]"); if (!b || !el.contains(b)) return;
    if (b.dataset.bsay) { game.speakCard(learn.card(b.dataset.bsay)); return; }
    if (b.dataset.hstar) { const id = b.dataset.hstar; if (learn.booked(id)) learn.unbook(id); else { const h = learn.hotOf(id), r = learn.bookmark({ ...learn.card(id), src: "hot", url: h?.src?.[0]?.u || "" }, s.plan); if (r.full) return toast("Sổ đầy rồi. Plus lưu thoải mái."); game.jab?.("book"); } save(s); show("words"); return; }
    if (b.dataset.unbook) { learn.unbook(b.dataset.unbook); save(s); show("words"); return; }
    if (b.dataset.rsave || b.dataset.rnew) { const c = b.dataset.rsave ? learn.card(b.dataset.rsave) : null, id = c ? c.id : `en:my:${b.dataset.rnew}`;
      if (learn.booked(id)) learn.unbook(id); else { const ctx = (readText.match(new RegExp(`[^.!?。！？\\n]*${(c?.lang === "zh" ? "" : "\\b") + (c ? c.w : b.dataset.rnew).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^.!?。！？\\n]*`, "i")) || [""])[0].trim();
        const r = learn.bookmark(c || { w: b.dataset.rnew, lang: "en", ctx, src: "read" }, s.plan); if (r.full) return toast("Sổ đầy rồi. Plus lưu thoải mái."); if (c) s.learn.book[0].src = "read", s.learn.book[0].ctx = ctx.slice(0, 200); game.jab?.("book"); }
      save(s); show("read"); return; }
    if (b.dataset.setlang) { learn.setLang(b.dataset.setlang); save(s); show(wrap.classList.contains("sh-onboard") ? "onboard" : "lang"); refresh(); return; }
    if (b.dataset.level) { if (b.classList.contains("lockd")) return show("plans"); learn.setLevel(b.dataset.level); save(s); show(wrap.classList.contains("sh-onboard") ? "onboard" : "lang"); refresh(); return; }
    if (b.dataset.daily) { learn.setDaily(+b.dataset.daily); save(s); b.parentElement.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); refresh(); return; }
    if (b.dataset.rtime) { if (!game.notify.toggleTime(b.dataset.rtime)) toast(`Gói Free nhắc 1 giờ/ngày. Plus thì 3.`); show("settings"); return; }
    if (b.dataset.yard) { s.settings.yard = b.dataset.yard; game.yard.setDensity(b.dataset.yard); game.critters?.ambient(); save(s); show("settings"); return; }
    if (b.dataset.rot) { s.settings.rotate = +b.dataset.rot; save(s); show("settings"); game.wall?.ambient(true); return; }
    if (b.dataset.rate) { s.settings.rate = +b.dataset.rate; save(s); show("settings"); game.speakCard(learn.todayCards()[0] || learn.due()[0]); return; }
    if (b.dataset.wtab) { wordsTab = b.dataset.wtab; show("words"); return; }
    if (b.dataset.wd) { const ex = b.nextElementSibling; ex.hidden = !ex.hidden; game.speakCard(learn.card(b.dataset.wd)); return; }
    if (b.dataset.ui) { s.settings.ui = b.dataset.ui; applyUi(); save(s); show("settings"); return; }
    if (b.dataset.plan) { s.plan = b.dataset.plan; if (!DAILY_OPTS[s.plan].includes(s.learn.daily)) learn.setDaily(DAILY_OPTS[s.plan].at(-1)); save(s, true); show("plans"); refresh(); return; }
    if (b.dataset.skin) { if (!game.setSkin(b.dataset.skin)) { const k = SKINS.find((x) => x.id === b.dataset.skin); return toast(k.feat && lock(k.feat) ? "Mũ phớt có trong gói Pro" : `Cần ${k.flowers} bông hoa (từ đã thuộc) để mở`); } show("cat"); return; }
    const a = b.dataset.a;
    switch (a) {
      case "close": return close();
      case "learn": close(); return game.wall.lesson("full");
      case "learnbook": close(); return game.wall.lesson("book");
      case "learnhot": close(); return game.wall.lesson("hot");
      case "remind-on": game.notify.enable().then((r) => { toast(r === "ok" ? `Ok. ${game.cat.name} sẽ nhắc. Đừng tắt.` : r === "denied" ? "Bị chặn rồi. Mở cài đặt trình duyệt cho phép lại." : r === "ios-install" ? "Thêm app vào màn hình chính trước đã." : "Chưa bật được thông báo."); show("settings"); }); return;
      case "remind-test": game.notify.test(); return;
      case "scan": { const ta = q("[data-rtext]"); readText = (ta?.value || "").slice(0, READ_LIMIT[s.plan] || READ_LIMIT.free); readRes = runScan(readText); show("read"); game.sayLine?.(readRes.say, 4200); return; }
      case "review": close(); return game.wall.lesson(learn.todo().due ? "review" : "fun");
      case "call": return game.call();
      case "music": return game.music();
      case "immersive": return immersive(true);
      case "shoo": return;
      case "export": { const blob = new Blob([JSON.stringify(s, null, 1)], { type: "application/json" }); const u = URL.createObjectURL(blob); const l = document.createElement("a"); l.href = u; l.download = `purrsona-${dayKey()}.json`; l.click(); return; }
      case "reset": if (b.dataset.sure) { globalThis.__purrReset = true; localStorage.removeItem(APP.saveKey); location.reload(); } else { b.dataset.sure = 1; b.textContent = "Chạm lần nữa để xoá hết"; } return;
      default: show(a);
    }
  });
  function runScan(text) {
    const idx = buildIndex([...allCards(s.learn.custom).values()].filter((c) => c.lang === learn.lang));
    const r = scanText(text, idx, (w) => learn.booked(`en:my:${w}`)), mood = game.today?.mood?.id;
    const nk = r.found.filter((f) => learn.stat(f.card.id)?.seen).length;
    const key = r.tokens < 25 ? "read_short" : r.found.length === 0 ? "read_none" : nk === 0 ? "read_unlearned" : nk >= 8 ? "read_lots" : r.tokens > 900 && Math.random() < 0.4 ? "read_long" : "read_some";
    r.say = line(key, mood, null, { n: nk || r.found.length }); return r;
  }
  game.readText = (text) => { readText = String(text || "").slice(0, READ_LIMIT[s.plan] || READ_LIMIT.free); readRes = runScan(readText); show("read"); game.sayLine?.(readRes.say, 4200); };
  el.addEventListener("input", (e) => { if (e.target.matches("[data-rtext]")) { readText = e.target.value; const m = q(".rlim"); if (m) m.textContent = `${readText.length}/${e.target.maxLength} ký tự`; } });
  el.addEventListener("change", (e) => {
    if (e.target.matches("[data-remind]")) { if (!e.target.checked) { game.notify.disable(); show("settings"); } return; }
    if (e.target.matches("[data-rstreak]")) { game.notify.R.streak = e.target.checked; save(s); game.notify.sync(); return; }
    if (e.target.matches("[data-bvi]")) { if (e.target.value.trim()) { learn.setMeaning(e.target.dataset.bvi, e.target.value); save(s); show("words"); } return; }
    if (e.target.matches("[data-nick]")) { game.setNick(e.target.value); e.target.value = s.profile.nick; toast(`${game.cat.name} sẽ gọi bạn là “${s.profile.nick}”`); return; }
    if (e.target.matches("[data-csv]") && e.target.files[0]) { e.target.files[0].text().then((txt) => { const L = parseCsv(txt, learn.lang); s.learn.custom = [...s.learn.custom.filter((c) => c.lang !== learn.lang || c.pack === "book"), ...L]; learn.setLevel("custom/mine"); save(s, true); toast(`Đã nhập ${L.length} từ – đang học danh sách của bạn`); show("lang"); }); return; }
    const k = e.target.dataset.set; if (!k) return;
    if (k === "hour") { const v = +e.target.value; game.setHour(v < 0 ? null : v); show("settings"); return; }
    if (k === "music") { game.music(e.target.checked); return; }
    s.settings[k] = e.target.checked; if (k === "follow") game.followCat(e.target.checked); if (k === "reduced") { R.reduced = e.target.checked; document.documentElement.classList.toggle("reduced", e.target.checked); } save(s);
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !wrap.hidden) close(); });
  // phím tắt trong bài học: 1–4 chọn đáp án, Enter = tiếp
  addEventListener("keydown", (e) => {
    if (wrap.hidden || e.target.matches("input")) return;
    const n = +e.key; if (n >= 1 && n <= 4) { body.querySelectorAll(".opt:not(:disabled)")[n - 1]?.click(); return; }
    if (e.key === "Enter") body.querySelector("[data-next]")?.click();
  });

  function applyUi() { document.documentElement.dataset.uisize = s.settings.ui || "m"; }
  applyUi();
  const eye = document.createElement("button"); eye.className = "uneye"; eye.hidden = true; eye.setAttribute("aria-label", "Hiện giao diện"); eye.innerHTML = icon("eye"); root.appendChild(eye);
  function immersive(on) { el.classList.toggle("hidden", on); eye.hidden = !on; if (on) toast("Chạm con mắt ở góc dưới để hiện lại giao diện"); }
  eye.onclick = () => immersive(false);
  return { toast, show, refresh };
}
export { planOf };
