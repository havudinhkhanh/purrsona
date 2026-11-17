// GIAO DIỆN nổi trên sân khấu chì: thẻ mèo, đảo thông báo, nút Học, bảng trượt (sheet).
import { APP, PLANS, SKINS, DAILY_OPTS, BOOK_LIMIT, READ_LIMIT, REMIND, can, planOf } from "../config.js";
import { TRAITS, ZONES, SPOTS } from "../cat/personality.js";
import { esc, hhmm, dayKey } from "../core/util.js";
import { save } from "../core/store.js";
import { unlock } from "../core/sound.js";
import { SKILLS, levelOf, nextXp } from "../cat/memory.js";
import { TIERS } from "../cat/bond.js";
import { LANGS, parseCsv, allCards, cardsOfLevel, LEVEL_TAG, LADDERS, nextLevel, isTopic, topicName } from "../learn/packs.js";
import { buildIndex, scanText } from "../learn/scan.js";
import { line } from "../cat/lines.js";
import { BOX_IV, MASTER } from "../learn/srs.js";
import { icon } from "./icons.js";
import { VIBES, vibeFeat } from "../world/vibe.js";

const ACT_VI = { nap: "Đang ngủ", watch: "Ngắm trời", explore: "Đi dạo", groom: "Liếm lông", zoomies: "Chạy rần rần", selfplay: "Tự chơi", perch: "Leo trèo", chase: "Đuổi bướm", seek: "Tìm bạn", sulk: "Đang dỗi", write: "Viết bậy lên tường", nag: "Kháy bạn", quizme: "Đố bạn", headbutt: "Dụi đầu", blinkat: "Chớp mắt", knead: "Nhào bột", bellyup: "Khoe bụng", pawtap: "Gõ màn hình", sleepnear: "Ngủ cạnh bạn", sniff: "Ngửi hoa", sunbathe: "Phơi nắng", sitpretty: "Ngồi ngắm bạn", pondgaze: "Ngắm ao", scratchtree: "Mài móng vô cây", yarn: "Chơi cuộn len", flowerpounce: "Vồ hoa", rainwatch: "Ngồi coi mưa", swing: "Đu xích đu", slide: "Chơi cầu tuột", trellis: "Trèo giàn bầu", dig: "Đào đất", knockpot: "Xô đổ chậu cây", tidy: "Ngẫm nghĩ", shadenap: "Nằm bóng cây", chaseleaf: "Vồ lá bay", greet: "Đón bạn", follow: "Đi theo bạn", wander: "Thong thả", pet: "Được vuốt ve", sleep: "Ngủ" };
const planChip = (p) => (p === "free" ? "" : `<span class="chip chip-${p}">${PLANS[p].vi}</span>`);

// logo GitHub / Cloudflare (nét đơn giản, 1 màu) cho nút đăng nhập
const GH_ICON = `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path fill="currentColor" stroke="none" d="M12 2.2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2.2Z"/></svg>`;
const CF_ICON = `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path fill="currentColor" stroke="none" d="M16.6 15.8l.3-1a1.6 1.6 0 0 0-.1-1.4 1.6 1.6 0 0 0-1.2-.6L7 12.7a.2.2 0 0 1-.1-.3.2.2 0 0 1 .2-.1l8.6-.1c1-.1 2.1-.9 2.5-1.9l.5-1.3a.4.4 0 0 0 0-.2 5.6 5.6 0 0 0-10.8-.6 2.5 2.5 0 0 0-4 2.6A3.6 3.6 0 0 0 .6 14.6a3 3 0 0 0 .1.8c0 .1.1.2.2.2h15.4a.3.3 0 0 0 .3-.2Zm2.7-5.4h-.2l-.1.2-.3 1.1a1.6 1.6 0 0 0 .1 1.4 1.6 1.6 0 0 0 1.2.6l1.8.1a.2.2 0 0 1 .1.1.2.2 0 0 1 0 .2.2.2 0 0 1-.2.1l-1.9.1c-1 .1-2.1.9-2.5 1.9l-.1.4a.1.1 0 0 0 .1.2h6.5a.2.2 0 0 0 .2-.1 4.7 4.7 0 0 0-4.7-6Z"/></svg>`;
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

  // ------------------------------------------------------------------ nút phóng to / thu nhỏ sân (hiện khi đã chụm 2 ngón, hoặc bật trong Cài đặt)
  const zc = document.createElement("div"); zc.className = "zoomchip"; zc.hidden = true; zc.setAttribute("role", "group"); zc.setAttribute("aria-label", "Phóng to khu vườn");
  zc.innerHTML = `<button data-zc="-1" aria-label="Thu nhỏ">−</button><button class="zv" data-zc="0" aria-label="Về khung vừa"></button><button data-zc="1" aria-label="Phóng to">+</button>`;
  el.appendChild(zc);
  const zPct = (z) => `${Math.round(z * 100)}%`;
  const zStep = (d) => { const Y = game.yard; if (d === 0) { Y.setZf(1); Y.onZoom?.(1, null, null); } else Y.zoomBy(d > 0 ? 1.25 : 0.8, game.body.x, game.body.y); game.buzz?.(6); };
  const zSync = () => { const z = game.yard.zf; zc.hidden = Math.abs(z - 1) < 0.01; zc.querySelector(".zv").textContent = zc.hidden ? "" : `↺ ${zPct(z)}`; };
  zc.addEventListener("pointerdown", (e) => e.stopPropagation());
  zc.addEventListener("click", (e) => { const b = e.target.closest("[data-zc]"); if (b) { zStep(+b.dataset.zc); zSync(); } });
  game.on("zoom", zSync); setTimeout(zSync, 0);

  // ------------------------------------------------------------------ bảng trượt
  const wrap = q(".sheet-wrap"), body = q(".sheet-body");
  let closeT = 0;
  game.sheetOpen = () => !wrap.hidden;
  function open(html, cls = "") { clearTimeout(closeT); game.buzz?.(6); const keep = wrap.classList.contains("open"); const st = keep && wrap.classList.contains(cls) ? body.scrollTop : 0; body.innerHTML = html; body.scrollTop = st; wrap.className = "sheet-wrap " + cls + (keep ? " open" : ""); wrap.hidden = false; document.body.classList.add("sheet-on"); sheetEl.style.transform = ""; if (!keep) requestAnimationFrame(() => wrap.classList.add("open")); }
  function close() { wrap.classList.remove("open"); sheetEl.style.transform = ""; q(".scrim").style.opacity = ""; document.body.classList.remove("sheet-on"); clearTimeout(closeT); closeT = setTimeout(() => { wrap.hidden = true; body.innerHTML = ""; }, 260); refresh(); }
  // vuốt xuống để đóng: kéo ở thanh kéo / tiêu đề, hoặc kéo ở bất cứ đâu khi nội dung đang ở đầu
  const sheetEl = q(".sheet");
  (() => {
    let y0 = 0, t0 = 0, dy = 0, on = false, pid = null;
    const wide = () => matchMedia("(min-width:760px)").matches, base = () => (wide() ? "" : "translate(-50%,");
    sheetEl.addEventListener("pointerdown", (e) => {
      if (wide() || e.button > 0 || e.target.closest("input,textarea,select,.seg,.tabs,.opts")) return;
      const onGrab = e.target.closest(".grab,.sh-head") && !e.target.closest("button,a");
      if (!onGrab && body.scrollTop > 2) return;
      y0 = e.clientY; t0 = performance.now(); dy = 0; on = onGrab ? 1 : 0.5; pid = e.pointerId;
    });
    sheetEl.addEventListener("pointermove", (e) => {
      if (!on || e.pointerId !== pid) return; dy = e.clientY - y0;
      if (on === 0.5) { if (dy < 8) return; on = 1; }      // kéo trong nội dung: phải kéo xuống rõ ràng mới tính
      if (!sheetEl.classList.contains("drag")) { sheetEl.classList.add("drag"); try { sheetEl.setPointerCapture(pid); } catch { /* */ } }
      const d = Math.max(0, dy) + Math.min(0, dy) * 0.15;
      sheetEl.style.transform = `${base()}${d}px)`; q(".scrim").style.opacity = String(Math.max(0, 1 - d / 500));
    });
    const end = () => {
      if (!on) return; const v = dy / Math.max(1, performance.now() - t0), drag = sheetEl.classList.contains("drag"); on = false;
      sheetEl.classList.remove("drag");
      if (drag && (dy > 110 || (dy > 30 && v > 0.6))) { game.buzz?.(8); close(); return; }
      sheetEl.style.transform = ""; q(".scrim").style.opacity = "";
    };
    sheetEl.addEventListener("pointerup", end); sheetEl.addEventListener("pointercancel", end);
    // màn cảm ứng: kéo xuống trong nội dung khi đang ở đầu → trình duyệt huỷ pointer, nên bắt bằng touch (không thụ động)
    let ty0 = null, tdy = 0, tt0 = 0;
    body.addEventListener("touchstart", (e) => { ty0 = !wide() && body.scrollTop <= 0 && e.touches.length === 1 && !e.target.closest("input,textarea,select,.seg,.tabs,.opts") ? e.touches[0].clientY : null; tdy = 0; tt0 = performance.now(); }, { passive: true });
    body.addEventListener("touchmove", (e) => {
      if (ty0 === null) return; tdy = e.touches[0].clientY - ty0;
      if (tdy <= 0 || body.scrollTop > 0) { if (sheetEl.classList.contains("drag")) { sheetEl.classList.remove("drag"); sheetEl.style.transform = ""; q(".scrim").style.opacity = ""; } if (tdy < -4) ty0 = null; return; }
      e.preventDefault(); sheetEl.classList.add("drag"); sheetEl.style.transform = `${base()}${tdy}px)`; q(".scrim").style.opacity = String(Math.max(0, 1 - tdy / 500));
    }, { passive: false });
    body.addEventListener("touchend", () => {
      if (ty0 === null) return; ty0 = null; const v = tdy / Math.max(1, performance.now() - tt0), drag = sheetEl.classList.contains("drag"); sheetEl.classList.remove("drag");
      if (drag && (tdy > 110 || (tdy > 30 && v > 0.6))) { game.buzz?.(8); close(); return; } sheetEl.style.transform = ""; q(".scrim").style.opacity = "";
    });
  })();
  const head = (t, sub = "") => `<div class="sh-head"><div><h2>${t}</h2>${sub ? `<p>${sub}</p>` : ""}</div><button class="ic" data-a="close" aria-label="Đóng">${icon("close")}</button></div>`;
  const lock = (feat) => !can(s.plan, feat);
  const boxDots = (b = 0) => `<i class="dots" title="Hộp ${b}/6">${Array.from({ length: 6 }, (_, i) => `<b class="${i < b ? "on" : ""}"></b>`).join("")}</i>`;
  const noteCard = (x, today) => `<article class="letter${today ? " today" : ""}"><header>${icon("letter")}<time>${x.d === dayKey() ? "Sáng nay" : new Date(x.d).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" })}</time></header>${x.text.split("\n").map((l) => `<p>${esc(l)}</p>`).join("")}</article>`;
  let jumpQ = null;
  let loginStep = "email", loginEmail = "", loginMsg = "", loginMode = "login";
  let wordsTab = "book", readRes = null, readText = "", langTab = null;      // langTab: "path" (lộ trình kỳ thi) | "topic" (theo chủ đề)
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
    account() {
      const A = game.account, U = A?.user;
      if (!A?.checked) return head("Tài khoản") + `<p class="muted">Đang hỏi máy chủ…</p>`;
      if (!A.on) return head("Tài khoản") + `<p class="muted">Bản này chưa nối máy chủ tài khoản (bản xem thử). Mở app ở trang chính để đăng nhập; tiến độ trên máy này vẫn được giữ và gộp vào khi đăng nhập.</p>`;
      if (U) return head("Tài khoản") + `<div class="acct"><span class="av big">${esc((U.nick || U.email)[0].toUpperCase())}</span><div><b>${esc(U.nick || "Sen")}</b><small>${esc(U.email)}</small></div><span class="chip chip-${U.plan}">${PLANS[U.plan]?.vi || U.plan}</span></div>
        <p class="muted">${A.last ? `Đồng bộ lúc ${hhmm(A.last)}.` : "Chưa đồng bộ."} Học trên máy nào cũng cộng dồn.</p>
        <button class="primary" data-a="acct-sync">${icon("repeat")} Đồng bộ ngay</button>
        ${U.role === "admin" ? `<a class="ghost" href="admin.html" target="_blank" rel="noopener">${icon("settings")} Trang quản trị</a>` : ""}
        <button class="ghost" data-a="acct-out">Đăng xuất</button>
        <button class="ghost danger" data-a="acct-del">Xoá tài khoản</button>`;
      if (A.lastError) { loginMsg = ERR[A.lastError] || "Đăng nhập không thành công. Thử lại."; A.lastError = ""; }
      const C = A.cfg || {}, msg = loginMsg ? `<p class="muted msg">${esc(loginMsg)}</p>` : "";
      if (A.resetToken) return head("Đặt mật khẩu mới") + `<form class="login" data-login="reset"><label class="fld"><span>Mật khẩu mới</span><input type="password" name="password" autocomplete="new-password" minlength="6" required></label><button class="primary" type="submit">Lưu & đăng nhập</button>${msg}</form>`;
      const tabs = [["login", "Đăng nhập"], ["register", "Tạo tài khoản"], ...(C.mail ? [["code", "Mã qua email"]] : [])];
      return head(loginMode === "register" ? "Tạo tài khoản" : "Đăng nhập", "Giữ tiến độ khi đổi máy, mở khoá gói đã mua.") + `
        ${C.github || C.access ? `<div class="oauth">${C.github ? `<button class="obtn gh" data-a="acct-github">${GH_ICON}<span>Đăng nhập bằng GitHub</span></button>` : ""}${C.access ? `<button class="obtn cf" data-a="acct-access">${CF_ICON}<span>Đăng nhập bằng Cloudflare</span></button>` : ""}</div>` : ""}
        ${C.google ? `<div class="gbtn" data-gbtn></div>` : ""}${C.github || C.access || C.google ? `<p class="or"><span>hoặc dùng email</span></p>` : ""}
        <div class="seg segfull">${tabs.map(([k, v]) => `<button data-lmode="${k}" class="${loginMode === k ? "on" : ""}">${v}</button>`).join("")}</div>
        <form class="login" data-login="${loginMode}">
        <label class="fld"><span>Email</span><input type="email" name="email" autocomplete="email" inputmode="email" required placeholder="ban@email.com" value="${esc(loginEmail)}"></label>
        ${loginMode === "register" ? `<label class="fld"><span>${esc(game.cat.name)} gọi bạn là</span><input name="nick" maxlength="16" placeholder="Sen" value="${esc(s.profile.nick || "")}"></label>` : ""}
        ${loginMode === "code" ? (loginStep === "code" ? `<label class="fld"><span>Mã 6 số</span><input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required placeholder="••••••"></label>` : "")
          : `<label class="fld"><span>Mật khẩu</span><input type="password" name="password" autocomplete="${loginMode === "register" ? "new-password" : "current-password"}" minlength="6" required placeholder="ít nhất 6 ký tự"></label>`}
        <button class="primary" type="submit">${loginMode === "register" ? "Tạo tài khoản" : loginMode === "code" ? (loginStep === "code" ? "Đăng nhập" : "Gửi mã") : "Đăng nhập"}</button>
        ${msg}
        ${loginMode === "login" ? `<button class="ghost" type="button" data-a="forgot">Quên mật khẩu?</button>` : ""}</form>
        <p class="muted">Tiến độ trên máy này được gộp vào tài khoản khi đăng nhập.</p>`;
    },
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
      const A = learn.assess(), pct = (x) => (x === null ? "—" : `${Math.round(x * 100)}%`);
      const selfEval = `<div class="assess"><div class="as-top"><span class="as-lv"><small>đang vững</small><b>${esc(A.solidTag || "chưa có")}</b></span><span class="as-arrow">→</span><span class="as-lv"><small>đang học</small><b>${esc(A.workingTag || "—")}</b></span></div>
        <div class="as-kpi"><div><b>${pct(A.recall)}</b><small>nhớ lại khi ôn</small></div><div><b>${A.active}/14</b><small>ngày có học</small></div><div><b>${s.learn.daily}</b><small>chữ mới/ngày</small></div></div>
        <ul class="as-tips">${A.tips.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>${A.log.length ? `<p class="muted">App tự chỉnh: ${A.log.map((l) => `${l.d.slice(5)} ${l.from}→${l.to} chữ (${esc(l.why)})`).join(" · ")}</p>` : ""}
        ${A.recall !== null && A.recall >= 0.8 && nextLevel(s.learn.level[s.learn.lang]) ? `<button class="jumpbtn" data-a="jump">${icon("bolt")}<span><b>Thử nhảy lớp</b><small>Nhớ tốt rồi, thi 8 câu coi lên được không</small></span></button>` : ""}</div>`;
      return head("Tiến độ", `${LANGS[learn.lang].vi} · tự đánh giá`) + selfEval + `<div class="kpis"><div><b>🔥 ${learn.streakAlive()}</b><small>ngày liền · kỷ lục ${S2.best}</small></div><div><b>${c.mastered}</b><small>từ đã thuộc</small></div><div><b>${c.learning}</b><small>đang học</small></div><div><b>${acc}%</b><small>đúng ${days} ngày</small></div></div>
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
      const U = game.account?.user;
      return head(APP.name, APP.tagline) + `<button class="acct-row" data-a="account"><span class="av">${U ? esc((U.nick || U.email)[0].toUpperCase()) : icon("user")}</span><span><b>${U ? esc(U.nick || U.email) : "Đăng nhập"}</b><small>${U ? `Gói ${PLANS[U.plan]?.vi || U.plan} · đồng bộ mọi máy` : "Lưu tiến độ, học trên nhiều máy"}</small></span>${icon("chevron")}</button><div class="menu">
        <button data-a="learn"><span>${icon("pencil")}</span>Học</button><button data-a="review"><span>${icon("bolt")}</span>Ôn nhanh</button>
        <button data-a="words"><span>${icon("book")}</span>Sổ từ</button><button data-a="read"><span>${icon("eye")}</span>Đọc cùng mèo</button><button data-a="stats"><span>${icon("chart")}</span>Tiến độ</button>
        <button data-a="notes"><span>${icon("letter")}</span>Giấy nhắn</button><button data-a="cat"><span>${icon("cat")}</span>Hồ sơ mèo</button>
        <button data-a="plans"><span>${icon("star")}</span>Gói ${planChip(s.plan) || "Miễn phí"}</button><button data-a="settings"><span>${icon("settings")}</span>Cài đặt</button></div>`;
    },
    lang() {
      const L = s.learn, cur = L.level[L.lang], pace = learn.pace();
      const prog = (key) => { const C = cardsOfLevel(key, L.custom); return C.length ? Math.round((C.filter((c) => learn.stat(c.id)?.seen).length / C.length) * 100) : 0; };
      const TRACK = { en: ["Thiếu nhi · Cambridge YLE", "Người lớn · khung CEFR"], zh: ["HSK"], ja: ["JLPT"] }[L.lang] || [];
      const lvBtn = (lv) => { const lk = !learn.tierOk(lv.key), p = prog(lv.key), tag = LEVEL_TAG[lv.key]; return `<button data-level="${lv.key}" class="${cur === lv.key ? "on" : ""} ${lk ? "lockd" : ""}">${tag ? `<em>${esc(tag)}</em>` : ""}<span>${esc(tag ? lv.vi.replace(new RegExp(`^${tag}\\s*·?\\s*|\\s*\\(${tag}\\)`, "g"), "").replace(/^$/, tag) : lv.vi)}</span><small>${lv.n} từ · đã học ${p}%${lk ? ` · ${icon("lock")} ${PLANS[lv.tier].vi}` : ""}</small><i style="--p:${p}%"></i></button>`; };
      const all = learn.levels(), inLadder = new Set((LADDERS[L.lang] || []).flat());
      const ladders = (LADDERS[L.lang] || []).map((tr, i) => `<h3>${esc(TRACK[i] || "Lộ trình")}</h3><div class="lvls ladder">${tr.map((k) => all.find((x) => x.key === k)).filter(Boolean).map(lvBtn).join("")}</div>`).join("");
      const TR = { free: 0, plus: 1, pro: 2 }, topics = all.filter((lv) => isTopic(lv.key)).map((lv, i) => [lv, i]).sort((a, b) => (TR[a[0].tier] ?? 3) - (TR[b[0].tier] ?? 3) || a[1] - b[1]).map((x) => x[0]),      // Free → Plus → Pro
       extra = all.filter((lv) => !inLadder.has(lv.key) && !isTopic(lv.key));
      const inTopic = isTopic(cur), home = learn.homeLevel(), homeTag = LEVEL_TAG[home] || all.find((x) => x.key === home)?.vi || "";
      const tab = langTab || (inTopic ? "topic" : "path");
      const nx = inTopic ? null : nextLevel(cur), nxl = nx && all.find((x) => x.key === nx);
      const tile = (lv) => { const lk = !learn.tierOk(lv.key), p = prog(lv.key), t = topicName(lv.vi), on = cur === lv.key;
        return `<button data-level="${lv.key}" class="ttile ${on ? "on" : ""} ${lk ? "lockd" : ""}" aria-pressed="${on}"><span class="tico" aria-hidden="true">${esc(t.ico || "•")}</span><b>${esc(t.name)}</b><small>${on ? "Đang học · " : ""}${lv.n} từ${p ? ` · ${p}%` : ""}${lk ? ` · ${icon("lock")} ${PLANS[lv.tier].vi}` : ""}</small><i style="--p:${p}%"></i></button>`; };
      const pathView = `${nxl ? `<button class="jumpbtn" data-a="jump">${icon("bolt")}<span><b>Thi nhảy lên ${esc(LEVEL_TAG[nx] || nxl.vi)}</b><small>8 câu · đúng 6 là qua, chữ đã biết khỏi học lại</small></span>${learn.tierOk(nx) ? "" : `<em>${PLANS[nxl.tier].vi}</em>`}</button>` : ""}
        ${pace !== null ? `<p class="pace">Đúng ngay lần đầu <b>${Math.round(pace * 100)}%</b> · ${pace >= 0.8 ? "học nhanh: chữ dễ được nhảy cóc, ôn thưa hơn" : pace >= 0.5 ? "nhịp vừa" : "chậm lại chút: bớt chữ mới mỗi ngày cho chắc"}</p>` : ""}
        ${ladders}
        ${extra.length ? `<h3>Gói thêm</h3><div class="lvls">${extra.map(lvBtn).join("")}</div>` : ""}`;
      const topicView = `<p class="muted tintro">Học chữ theo tình huống. Học hết một chủ đề, mèo tự đưa bạn về lộ trình${homeTag ? ` <b>${esc(homeTag)}</b>` : ""}.</p>
        <div class="ttiles">${topics.map(tile).join("")}</div>`;
      return head("Ngôn ngữ & trình độ", tab === "topic" ? "Chọn một chủ đề để học chữ theo tình huống." : "Chữ chia theo kỳ thi. Học hết cấp nào tự lên cấp đó; biết rồi thì thi nhảy lớp.") + `<div class="pick3">${Object.entries(LANGS).map(([k, v]) => `<button data-setlang="${k}" class="${L.lang === k ? "on" : ""}"><b class="${k}">${v.flag}</b><span>${v.vi}</span></button>`).join("")}</div>
        ${inTopic ? `<div class="tbanner"><span>Đang học chủ đề <b>${esc(LEVEL_TAG[cur] || "")}</b></span><button class="btn sm" data-level="${esc(home)}">Về ${esc(homeTag || "lộ trình")}</button></div>` : ""}
        ${topics.length ? `<div class="seg ltabs" role="tablist"><button role="tab" data-ltab="path" aria-selected="${tab === "path"}" class="${tab === "path" ? "on" : ""}">Lộ trình kỳ thi</button><button role="tab" data-ltab="topic" aria-selected="${tab === "topic"}" class="${tab === "topic" ? "on" : ""}">Theo chủ đề</button></div>` : ""}
        ${tab === "topic" && topics.length ? topicView : pathView}
        <p class="muted">Đổi ngôn ngữ không mất tiến độ – mỗi ngôn ngữ có hoa riêng trong vườn.</p>`;
    },
    jump() {
      const J = jumpQ; if (!J) return head("Thi nhảy lớp") + `<p class="muted">Chưa có bài.</p>`;
      if (J.i >= J.items.length) { const pass = J.right >= J.need; return head(pass ? "Qua rồi" : "Chưa qua", `${J.right}/${J.items.length} câu đúng`) + `<div class="jres ${pass ? "ok" : ""}"><b>${pass ? `Lên ${esc(J.tag)}` : "Ở lại cấp này"}</b><p>${pass ? `${J.known.length} chữ đã biết được đánh dấu thuộc sẵn, khỏi học lại.` : "Học thêm ít bữa rồi thi lại. Hoặc cứ học, hết cấp tự lên."}</p></div><button class="btn pri wide" data-a="${pass ? "close" : "lang"}">${pass ? "Học tiếp" : "Về trình độ"}</button>`; }
      const c = J.items[J.i], opts = J.opts[J.i];
      return head(`Nhảy lên ${esc(J.tag)}`, `Câu ${J.i + 1}/${J.items.length} · đúng ${J.right}`) + `<div class="jq"><h1 class="w ${c.lang}">${esc(c.w)}</h1><p class="ph">${esc(c.ph || "")}</p></div><div class="jopts">${opts.map((o) => `<button data-jans="${esc(o.id)}">${esc(o.vi)}</button>`).join("")}<button class="ghost" data-jans="?">Không biết</button></div>`;
    },
    plans() {
      const rows = [["Học mỗi ngày, ôn lặp lại, vườn hoa chữ", 1, 1, 1], ["Vibe khu vườn", "Nhà · Nhật", "+ Trung · Ý · Pháp", "+ Thượng Hải xưa"], ["Tranh chữ (chữ sâu)", "12 chữ", "24 chữ", "24 chữ"], ["Đồng bộ nhiều máy", 1, 1, 1], ["Cấp độ", "A1–A2 · Starters–Movers · HSK 1 · N5", "Đến B2 · Flyers · HSK 3 · N3", "+ C1 · HSK 6 · N1 · chuyên ngành"], ["Học thích ứng, thi nhảy lớp", 1, 1, 1], ["Học theo chủ đề (trường học, du lịch, xin việc…)", "5 chủ đề", "12 chủ đề", "Tất cả · IELTS, tài chính, thương mại"], ["Từ mới mỗi ngày", "tối đa 5", "tối đa 20", "tối đa 50"], ["Câu nghe đọc & tự gõ", 0, 1, 1], ["Thống kê 30 ngày, từ hay sai", 0, 1, 1], ["Đọc lại giấy nhắn cũ", 0, 1, 1], ["Tiếng Anh tài chính – kinh doanh", 0, 0, 1], ["Tự nhập danh sách từ (CSV)", 0, 0, 1], ["Mèo kháy bằng AI theo đúng từ bạn sai", 0, 0, 1]];
      const cell = (v) => (v === 1 ? "✓" : v === 0 ? "–" : v);
      return head("Gói", "Bản thử: chọn gói để mở khoá ngay (chưa nối thanh toán).") + `<div class="plans">${Object.entries(PLANS).map(([k, p]) => `<button data-plan="${k}" class="${s.plan === k ? "on" : ""}"><b>${p.vi}</b><span>${p.price}</span><small>${p.note}</small>${s.plan === k ? "<em>Đang dùng</em>" : ""}</button>`).join("")}</div>
      <table class="cmp"><thead><tr><th></th><th>Free</th><th>Plus</th><th>Pro</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r[0]}</td>${r.slice(1).map((v) => `<td>${cell(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    },
    vibe() {
      const cur = game.vibe?.chosen || "home", pv = game.vibe?.preview;
      return head("Vibe khu vườn", "Đổi đồ trang trí, mèo có chỗ chơi mới, kèm chữ riêng của từng vibe.") + `<div class="vibes">${Object.entries(VIBES).map(([k, v]) => { const f = vibeFeat(k), lk = f && lock(f); return `<button data-vibe="${k}" class="${cur === k ? "on" : ""} ${lk ? "lockd" : ""}" aria-pressed="${cur === k}"><span class="ve">${v.emo}</span><b>${v.vi}</b><small>${v.sub}</small>${lk ? `<em>${icon("lock")} ${PLANS[v.tier].vi} · ${pv === k ? "đang thử" : s.vibeTry?.[k] === dayKey() ? "mai thử lại" : "xem thử"}</em>` : cur === k ? "<em>Đang dùng</em>" : ""}</button>`; }).join("")}</div>
        <p class="muted">Mỗi vibe có 8 chữ riêng (Anh và Trung). Chạm vào đồ trang trí trong vườn để nghe chữ.</p>`;
    },
    settings() {
      const h = s.settings.hour, L = s.learn;
      return head("Cài đặt") + `<div class="settings">${remindBlock()}
        <button class="row link" data-a="lang"><span>Ngôn ngữ & trình độ</span><span>${LANGS[L.lang].vi} ›</span></button>
        <div class="row"><span>Từ mới mỗi ngày</span><span class="seg">${DAILY_OPTS[s.plan].map((n) => `<button data-daily="${n}" class="${L.daily === n ? "on" : ""}">${n}</button>`).join("")}</span></div>
        <div class="row"><span>Đổi chữ trên tường</span><span class="seg">${[5, 15, 60].map((n) => `<button data-rot="${n}" class="${(s.settings.rotate || 15) === n ? "on" : ""}">${n === 60 ? "1 giờ" : n + "′"}</button>`).join("")}</span></div>
        <button class="row link" data-a="vibe"><span>Vibe khu vườn</span><span>${game.vibe ? `${VIBES[game.vibe.chosen].emo} ${VIBES[game.vibe.chosen].vi}` : ""} ›</span></button>
        <div class="row"><span>Màn hình chính</span><span class="seg">${[["poster", "Tranh chữ"], ["card", "Thẻ học"]].map(([k, v]) => `<button data-home="${k}" class="${(s.settings.home || "poster") === k ? "on" : ""}">${v}</button>`).join("")}</span></div>
        <div class="row"><span>Kiểu vẽ <small>${{ paint: "tranh màu theo từng khu", art: "bóng đổ, nắng đổi theo giờ, lá vẽ từng chùm" }[s.settings.theme] || "bút chì trắng đen"}</small></span><span class="seg">${[["sketch", "Bút chì"], ["paint", "Tranh màu"], ["art", "Hội hoạ"]].map(([k, v]) => `<button data-theme="${k}" class="${(s.settings.theme || "sketch") === k ? "on" : ""}">${v}</button>`).join("")}</span></div>
        <div class="row"><span>Tầm nhìn</span><span class="seg">${[["near", "Gần"], ["mid", "Vừa"], ["far", "Xa"]].map(([k, v]) => `<button data-zoom="${k}" class="${(s.settings.zoom || "mid") === k ? "on" : ""}">${v}</button>`).join("")}</span></div>
        <div class="row zoomrow"><span>Phóng to mèo & sân <small>hoặc chụm 2 ngón trên sân</small></span><span class="seg"><button data-zstep="-1" aria-label="Thu nhỏ">−</button><button data-zstep="0" class="${Math.abs(game.yard.zf - 1) < 0.01 ? "on" : ""}" aria-label="Về khung vừa">${zPct(game.yard.zf)}</button><button data-zstep="1" aria-label="Phóng to">+</button></span></div>
        <div class="row"><span>Chế độ máy <small>${game.perf?.mode === "auto" ? (game.perf.low ? "đang chạy nhẹ cho máy này" : "đang chạy đẹp") : game.perf?.low ? "nhẹ: 30 hình/giây, bỏ kính mờ" : "đẹp: mượt tối đa"}</small></span><span class="seg">${[["auto", "Tự động"], ["low", "Nhẹ"], ["high", "Đẹp"]].map(([k, v]) => `<button data-perf="${k}" class="${(game.perf?.mode || "auto") === k ? "on" : ""}">${v}</button>`).join("")}</span></div>
        <div class="row"><span>Sân vườn</span><span class="seg">${[["full", "Đầy đủ"], ["calm", "Gọn"], ["bare", "Trống"]].map(([k, v]) => `<button data-yard="${k}" class="${(s.settings.yard || "full") === k ? "on" : ""}">${v}</button>`).join("")}</span></div>
        <div class="row"><span>Thời tiết${game.weather ? ` <small>${game.weather.label()} · ${esc(game.weather.st.src === "real" ? game.weather.st.place : game.weather.st.src === "sim" ? "tự đổi" : "cố định")}</small>` : ""}</span><span class="seg">${[["real", "Trời thật"], ["sim", "Tự đổi"], ["off", "Tắt"]].map(([k, v]) => `<button data-wxmode="${k}" class="${(s.settings.wx?.mode || "real") === k ? "on" : ""}">${v}</button>`).join("")}</span></div>
        ${(s.settings.wx?.mode || "real") === "real" ? `<button class="row link" data-a="wxplace"><span>Nơi lấy thời tiết</span><span>${esc(s.settings.wx?.place?.name || "TP. Hồ Chí Minh")} · dùng vị trí của tôi ›</span></button>` : ""}
        <div class="row"><span>Chọn trời ${lock("weather.pick") ? `<span class="chip chip-plus">Plus</span>` : ""}</span><span class="seg wxseg">${[["auto", "Tự động"], ["hot", "☀️"], ["rain", "🌧"], ["wind", "🍃"], ["storm", "⛈"], ["cloudy", "☁️"]].map(([k, v]) => `<button data-wxfix="${k}" class="${k === "auto" ? (s.settings.wx?.mode !== "fixed" ? "on" : "") : s.settings.wx?.mode === "fixed" && s.settings.wx?.fixed === k ? "on" : ""}" aria-label="${{ auto: "Tự động theo trời", hot: "Nắng", rain: "Mưa", wind: "Gió", storm: "Giông", cloudy: "Mây" }[k]}">${v}</button>`).join("")}</span></div>
        <label class="row"><span>${esc(game.cat.name)} gọi bạn là</span><input class="nick" type="text" maxlength="16" value="${esc(s.profile.nick || "Sen")}" data-nick placeholder="Sen"></label>
        <label class="row"><span>Đọc to từ vựng</span><input type="checkbox" data-set="tts" ${s.settings.tts ? "checked" : ""}></label>
        <label class="row"><span>Từ mới tự đọc khi hiện</span><input type="checkbox" data-set="autoSay" ${s.settings.autoSay !== false ? "checked" : ""}></label>
        <label class="row"><span>Hiện chữ theo việc mèo làm</span><input type="checkbox" data-set="sceneWords" ${s.settings.sceneWords !== false ? "checked" : ""}></label>
        <label class="row"><span>Mèo kháy thường xuyên</span><input type="checkbox" data-set="nag" ${s.settings.nag !== false ? "checked" : ""}></label>
        <div class="row"><span>Tốc độ đọc</span><span class="seg">${[[0.7, "Chậm"], [0.9, "Vừa"], [1.05, "Nhanh"]].map(([v, k]) => `<button data-rate="${v}" class="${(s.settings.rate || 0.9) === v ? "on" : ""}">${k}</button>`).join("")}</span></div>
        <div class="row"><span>Cỡ giao diện</span><span class="seg">${[["s", "Nhỏ"], ["m", "Vừa"], ["l", "Lớn"]].map(([k, v]) => `<button data-ui="${k}" class="${(s.settings.ui || "m") === k ? "on" : ""}">${v}</button>`).join("")}</span></div>
        <button class="row link" data-a="soundtest"><span>Thử loa <small>meo · đọc chữ · đọc câu · nhạc</small></span><span>▶</span></button>
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
  game.showTopics = () => { langTab = "topic"; show("lang"); };

  // ------------------------------------------------------------------ chào ngày mới / lần đầu
  game.welcome = () => { if (game.newDay && game.note && s.onboarded) toast(`${game.cat.name} để lại giấy nhắn. Bấm ≡ để đọc.`); };

  // ------------------------------------------------------------------ bấm nút
  el.addEventListener("click", (e) => {
    unlock(); game.lastInput = Date.now(); game.musicResume?.();
    const b = e.target.closest("[data-a],[data-plan],[data-skin],[data-ui],[data-setlang],[data-level],[data-daily],[data-wtab],[data-wd],[data-rate],[data-rot],[data-yard],[data-wxmode],[data-wxfix],[data-rtime],[data-bsay],[data-unbook],[data-rsave],[data-rnew],[data-hstar],[data-vibe],[data-zoom],[data-zstep],[data-perf],[data-theme],[data-home],[data-jans],[data-lmode],[data-ltab]"); if (!b || !el.contains(b)) return;
    if (b.dataset.bsay) { game.speakCard(learn.card(b.dataset.bsay)); return; }
    if (b.dataset.hstar) { const id = b.dataset.hstar; if (learn.booked(id)) learn.unbook(id); else { const h = learn.hotOf(id), r = learn.bookmark({ ...learn.card(id), src: "hot", url: h?.src?.[0]?.u || "" }, s.plan); if (r.full) return toast("Sổ đầy rồi. Plus lưu thoải mái."); game.jab?.("book"); } save(s); show("words"); return; }
    if (b.dataset.unbook) { learn.unbook(b.dataset.unbook); save(s); show("words"); return; }
    if (b.dataset.rsave || b.dataset.rnew) { const c = b.dataset.rsave ? learn.card(b.dataset.rsave) : null, id = c ? c.id : `en:my:${b.dataset.rnew}`;
      if (learn.booked(id)) learn.unbook(id); else { const ctx = (readText.match(new RegExp(`[^.!?。！？\\n]*${(/[\u3040-\u30ff\u4e00-\u9fff]/.test(c ? c.w : b.dataset.rnew) ? "" : "\\b") + (c ? c.w : b.dataset.rnew).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^.!?。！？\\n]*`, "i")) || [""])[0].trim();
        const r = learn.bookmark(c || { w: b.dataset.rnew, lang: "en", ctx, src: "read" }, s.plan); if (r.full) return toast("Sổ đầy rồi. Plus lưu thoải mái."); if (c) s.learn.book[0].src = "read", s.learn.book[0].ctx = ctx.slice(0, 200); game.jab?.("book"); }
      save(s); show("read"); return; }
    if (b.dataset.ltab) { langTab = b.dataset.ltab; show("lang"); return; }
    if (b.dataset.setlang) { learn.setLang(b.dataset.setlang); save(s); show(wrap.classList.contains("sh-onboard") ? "onboard" : "lang"); refresh(); return; }
    if (b.dataset.level) { if (b.classList.contains("lockd")) return show("plans"); langTab = null; learn.setLevel(b.dataset.level); save(s); show(wrap.classList.contains("sh-onboard") ? "onboard" : "lang"); refresh(); return; }
    if (b.dataset.daily) { learn.setDaily(+b.dataset.daily); save(s); b.parentElement.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); refresh(); return; }
    if (b.dataset.rtime) { if (!game.notify.toggleTime(b.dataset.rtime)) toast(`Gói Free nhắc 1 giờ/ngày. Plus thì 3.`); show("settings"); return; }
    if (b.dataset.wxmode) { s.settings.wx.mode = b.dataset.wxmode; s.wxCache = null; save(s); game.weather.refresh().then(() => show("settings")); return; }
    if (b.dataset.wxfix === "auto") { if (s.settings.wx.mode === "fixed") s.settings.wx.mode = "real"; s.wxCache = null; save(s); game.weather.refresh().then(() => show("settings")); return; }
    if (b.dataset.wxfix) { if (lock("weather.pick")) return show("plans"); s.settings.wx.mode = "fixed"; s.settings.wx.fixed = b.dataset.wxfix; save(s); game.weather.refresh().then(() => show("settings")); return; }
    if (b.dataset.yard) { s.settings.yard = b.dataset.yard; game.yard.setDensity(b.dataset.yard); game.critters?.ambient(); save(s); show("settings"); return; }
    if (b.dataset.rot) { s.settings.rotate = +b.dataset.rot; save(s); show("settings"); game.wall?.ambient(true); return; }
    if (b.dataset.rate) { s.settings.rate = +b.dataset.rate; save(s); show("settings"); game.speakCard(learn.todayCards()[0] || learn.due()[0]); return; }
    if (b.dataset.wtab) { wordsTab = b.dataset.wtab; show("words"); return; }
    if (b.dataset.wd) { const ex = b.nextElementSibling; ex.hidden = !ex.hidden; game.speakCard(learn.card(b.dataset.wd)); return; }
    if (b.dataset.ui) { s.settings.ui = b.dataset.ui; applyUi(); save(s); show("settings"); return; }
    if (b.dataset.plan && game.account?.user) { toast("Gói theo tài khoản. Nâng cấp qua thanh toán (sắp có) hoặc nhờ quản trị bật."); return; }
    if (b.dataset.lmode) { loginMode = b.dataset.lmode; loginStep = "email"; loginMsg = ""; loginEmail = q(".login [name=email]")?.value || loginEmail; show("account"); return; }
    if (b.dataset.jans) { const J = jumpQ, c = J.items[J.i], ok = b.dataset.jans === c.id; if (ok) { J.right++; J.known.push(c.id); } game.buzz?.(ok ? 8 : [10, 40, 10]); J.i++; if (J.i >= J.items.length && J.right >= J.need) { learn.jumpTo(J.key, J.known); save(s, true); refresh(); } show("jump"); return; }
    if (b.dataset.home) { s.settings.home = b.dataset.home; game.persist(); game.wall?.refresh?.(); show("settings"); return; }
    if (b.dataset.zoom) { s.settings.zoom = b.dataset.zoom; game.yard.setZf(1); game.yard.onZoom?.(1, null, null); game.yard.setZoom(b.dataset.zoom); game.persist(); show("settings"); return; }
    if (b.dataset.theme) { if (b.dataset.theme === "art" && !game.can("theme.art")) { game.showSheet?.("plans"); return; } s.settings.theme = b.dataset.theme; game.yard.setTheme(b.dataset.theme); game.persist(); game.critters?.ambient(); show("settings"); return; }
    if (b.dataset.perf) { if (b.dataset.perf !== "auto") game.perf.auto = false; game.setPerf(b.dataset.perf); game.persist(); show("settings"); return; }
    if (b.dataset.zstep != null) { zStep(+b.dataset.zstep); zSync(); show("settings"); return; }
    if (b.dataset.vibe) { const r = game.vibe.set(b.dataset.vibe); if (r.used) { toast(`Hôm nay xem thử rồi. Mở hẳn với gói ${PLANS[r.tier].vi}.`); show("plans"); return; } if (r.preview) toast(`Xem thử 30 giây. Mở hẳn với gói ${PLANS[r.tier].vi}.`); show("vibe"); return; }
    if (b.dataset.plan) { s.plan = b.dataset.plan; game.emit("plan", s.plan); if (!DAILY_OPTS[s.plan].includes(s.learn.daily)) learn.setDaily(DAILY_OPTS[s.plan].at(-1)); save(s, true); show("plans"); refresh(); return; }
    if (b.dataset.skin) { if (!game.setSkin(b.dataset.skin)) { const k = SKINS.find((x) => x.id === b.dataset.skin); return toast(k.feat && lock(k.feat) ? "Mũ phớt có trong gói Pro" : `Cần ${k.flowers} bông hoa (từ đã thuộc) để mở`); } show("cat"); return; }
    const a = b.dataset.a;
    switch (a) {
      case "close": return close();
      case "learn": close(); return game.wall.lesson("full");
      case "learnbook": close(); return game.wall.lesson("book");
      case "learnhot": close(); return game.wall.lesson("hot");
      case "forgot": { const em = (q(".login [name=email]")?.value || loginEmail).trim(); loginEmail = em; if (!game.account.cfg?.mail) { loginMsg = "Chưa bật gửi email. Nhờ quản trị vào trang quản trị bấm \"Link đặt lại\" gửi bạn."; show("account"); return; } if (!em) { loginMsg = "Nhập email trước."; show("account"); return; } game.account.forgot(em).then(() => { loginMsg = `Nếu ${em} có tài khoản, link đặt lại đã gửi tới.`; show("account"); }, () => { loginMsg = "Chưa gửi được. Thử lại."; show("account"); }); return; }
      case "login-back": loginStep = "email"; loginMsg = ""; show("account"); return;
      case "jump": { const L = s.learn, nx = nextLevel(L.level[L.lang]); if (!nx) return; if (!learn.tierOk(nx)) return show("plans");
        const C = cardsOfLevel(nx, L.custom).sort(() => Math.random() - 0.5).slice(0, 8);
        jumpQ = { key: nx, tag: LEVEL_TAG[nx] || nx, items: C, opts: C.map((c) => learn.options(c)), i: 0, right: 0, need: Math.ceil(C.length * 0.75), known: [] }; show("jump"); return; }
      case "acct-sync": game.account.sync().then((ok) => { toast(ok ? "Đồng bộ xong." : "Chưa đồng bộ được. Lát thử lại."); show("account"); }); return;
      case "acct-out": game.account.logout().then(() => { toast("Đăng xuất rồi. Tiến độ vẫn nằm trong máy."); loginStep = "email"; show("account"); }); return;
      case "acct-del": if (b.dataset.sure) game.account.remove().then(() => { toast("Xoá tài khoản rồi."); show("account"); }, () => toast("Chưa xoá được. Kiểm tra mạng rồi thử lại.")); else { b.dataset.sure = 1; b.textContent = "Chạm lần nữa để xoá hẳn"; } return;
      case "remind-on": game.notify.enable().then((r) => { toast(r === "ok" ? `Ok. ${game.cat.name} sẽ nhắc. Đừng tắt.` : r === "denied" ? "Bị chặn rồi. Mở cài đặt trình duyệt cho phép lại." : r === "ios-install" ? "Thêm app vào màn hình chính trước đã." : "Chưa bật được thông báo."); show("settings"); }); return;
      case "remind-test": game.notify.test(); return;
      case "wxplace": game.weather.useMyPlace().then((ok) => { toast(ok ? "Ok, lấy thời tiết chỗ bạn." : "Không lấy được vị trí. Vẫn dùng TP. Hồ Chí Minh."); show("settings"); }); return;
      case "scan": { const ta = q("[data-rtext]"); readText = (ta?.value || "").slice(0, READ_LIMIT[s.plan] || READ_LIMIT.free); readRes = runScan(readText); show("read"); game.sayLine?.(readRes.say, 4200); return; }
      case "review": close(); return game.wall.lesson(learn.todo().due ? "review" : "fun");
      case "call": return game.call();
      case "music": return game.music();
      case "soundtest": return game.soundTest?.();
      case "acct-github": loginMsg = "Đang chuyển sang GitHub…"; show("account"); return game.account?.github();
      case "acct-access": loginMsg = "Đang đăng nhập bằng Cloudflare…"; show("account"); return game.account?.access().then(() => { loginMsg = ""; show("account"); }).catch((e) => { loginMsg = ERR[e.message] || "Không đăng nhập được bằng Cloudflare."; show("account"); });
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
  // đăng nhập: gửi mã → nhập mã
  const ERR = { github_off: "Chưa bật đăng nhập GitHub.", github_bad: "GitHub từ chối. Thử lại.", github_email: "GitHub chưa có email đã xác minh.", state: "Phiên đăng nhập hết hạn. Thử lại.", access_off: "Chưa bật Cloudflare Access.", access_bad: "Không xác minh được Cloudflare Access.", exists: "Email này có tài khoản rồi. Chuyển qua Đăng nhập.", weak: "Mật khẩu ít nhất 6 ký tự.", use_google: "Tài khoản này đăng nhập bằng Google.", no_pw: "Tài khoản chưa có mật khẩu. Bấm Quên mật khẩu hoặc dùng mã qua email.", google_bad: "Google chưa xác thực được. Thử lại.", mail_off: "Chưa bật gửi email. Nhờ quản trị tạo link đặt lại.", email: "Email chưa đúng.", slow_down: "Gửi nhiều quá. Đợi chút rồi thử lại.", wrong: "Sai email/mật khẩu hoặc sai mã.", expired: "Mã hết hạn. Gửi mã mới.", too_many: "Sai quá 5 lần. Đợi 15 phút rồi gửi mã mới.", banned: "Tài khoản này bị khoá.", mail_not_ready: "Máy chủ chưa gửi được email.", no_endpoint: "Máy chủ tài khoản chưa bật." };
  el.addEventListener("submit", async (e) => {
    if (!e.target.matches("[data-login]")) return; e.preventDefault();
    const f = new FormData(e.target), btn = e.target.querySelector("[type=submit]"); btn.disabled = true; loginEmail = String(f.get("email") || "").trim();
    const A = game.account, mode = e.target.dataset.login, pw = String(f.get("password") || ""), hi = (u) => { loginStep = "email"; loginMsg = ""; toast(`Chào ${u.nick || "Sen"}. Tiến độ đã lưu vào tài khoản.`); };
    try {
      if (mode === "reset") { const u = await A.reset(A.resetToken, pw); A.resetToken = null; hi(u); }
      else if (mode === "register") hi(await A.register(loginEmail, pw, String(f.get("nick") || "").trim()));
      else if (mode === "login") hi(await A.login(loginEmail, pw));
      else if (loginStep === "email") { await A.start(loginEmail); loginStep = "code"; loginMsg = `Đã gửi mã tới ${loginEmail}. Coi cả hộp thư rác.`; }
      else hi(await A.verify(loginEmail, String(f.get("code") || "")));
    } catch (err) { loginMsg = ERR[err.code] || "Không kết nối được. Thử lại."; }
    show("account");
  });
  game.on("vibe", () => { if (!wrap.hidden && wrap.classList.contains("sh-vibe")) show("vibe"); });
  // nút Google (Google Identity Services) – chỉ nạp script khi máy chủ có GOOGLE_CLIENT_ID
  function googleBtn() {
    const box = q("[data-gbtn]"), cid = game.account?.cfg?.google; if (!box || !cid) return;
    const draw = () => { try { google.accounts.id.initialize({ client_id: cid, callback: (r) => game.account.google(r.credential).then((u) => { toast(`Chào ${u.nick || "Sen"}.`); show("account"); }, (err) => { loginMsg = ERR[err.code] || "Google chưa xác thực được."; show("account"); }) }); google.accounts.id.renderButton(box, { theme: "outline", size: "large", shape: "pill", text: "continue_with", width: Math.min(360, box.clientWidth || 320) }); } catch { /* */ } };
    if (globalThis.google?.accounts?.id) return draw();
    if (!document.querySelector("script[data-gsi]")) { const sc = document.createElement("script"); sc.src = "https://accounts.google.com/gsi/client"; sc.async = true; sc.dataset.gsi = "1"; sc.onload = draw; document.head.appendChild(sc); } else setTimeout(draw, 600);
  }
  new MutationObserver(() => { if (wrap.classList.contains("sh-account") && !wrap.hidden) googleBtn(); }).observe(body, { childList: true });
  game.on("account", (e) => { if (e?.n === "cfg" && !wrap.hidden && wrap.classList.contains("sh-account")) show("account"); });
  game.on("account", () => { if (!wrap.hidden && (wrap.classList.contains("sh-account") || wrap.classList.contains("sh-menu"))) show(wrap.classList.contains("sh-account") ? "account" : "menu"); });
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
