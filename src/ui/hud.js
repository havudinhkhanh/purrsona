// Giao diện nổi trên sân khấu: thẻ mèo, phòng, cá khô, thanh hành động, thẻ check-in, bảng trượt (sheet).
import { APP, PLANS, SHOP, AI, planOf, can } from "../config.js";
import { ROOMS, ORDER } from "../world/rooms.js";
import { TRAITS, ZONES, TOYS, SPOTS, MOODS, today as todayOf } from "../cat/personality.js";
import { esc, hhmm, fmtDur, dayKey, $ } from "../core/util.js";
import { save } from "../core/store.js";
import { unlock } from "../core/sound.js";
import { listCats } from "../render/registry.js";
import { SKILLS, levelOf, nextXp } from "../cat/memory.js";
import { season } from "../world/decor.js";
import { MOMENTS } from "../meta/album.js";
import { ACT_INFO, fmtH, parseH } from "../meta/schedule.js";
import { KIND, KIND_ORDER } from "../meta/calendar.js";
import { CAL } from "../config.js";

let CATS = [];
listCats().then((c) => (CATS = c)).catch(() => {});

const NEEDS = [["hunger", "No", "🐟"], ["energy", "Sức", "⚡"], ["fun", "Vui", "🎾"], ["social", "Thân", "💕"], ["hygiene", "Sạch", "🫧"]];
const ACT_VI = { eat: "Đang ăn", beg: "Đòi ăn", nap: "Đang ngủ", potty: "Đi vệ sinh", watch: "Ngắm trời", explore: "Đi dạo", groom: "Liếm lông", scratch: "Mài vuốt", zoomies: "Chạy rần rần", selfplay: "Tự chơi", perch: "Leo trèo", seek: "Tìm bạn", wander: "Thong thả", "chase-laser": "Đuổi laser", "chase-feather": "Vờn lông vũ", pet: "Được vuốt ve", wakeowner: "Gọi bạn dậy", seeoff: "Tiễn bạn", waitdoor: "Ngồi chờ cửa", greet: "Đón bạn", bedtime: "Đi ngủ cùng bạn", prowl: "Tuần đêm", meeting: "Phá cuộc họp", talk: "Nghe loa", scare: "…", sulk: "Đang dỗi", knock: "Phá phách", dock: "Chiếm chỗ", dawnyell: "Réo ăn", nightsong: "Hát đêm", bird: "Rình chim", butterfly: "Vờn bướm", gecko: "Săn thạch sùng", box: "Chui hộp", storm: "Trốn sấm", phantom: "Nhìn ma" };
const planChip = (p) => (p === "free" ? "" : `<span class="chip chip-${p}">${PLANS[p].vi}</span>`);

export function createHud(game, root) {
  const s = game.save, R = game.R;
  const el = document.createElement("div"); el.className = "hud"; root.appendChild(el);
  el.innerHTML = `
  <header class="top">
    <button class="catcard" data-a="cat" aria-label="Thông tin mèo">
      <span class="ava"><i class="ring"></i>${R.snapshot("sit")}<em class="moodemo"></em></span>
      <span class="who"><b>${esc(game.cat.name)}</b><span class="mood"></span>
        <span class="needs">${NEEDS.map(([k, vi, ic]) => `<i data-n="${k}" title="${vi}"><em>${ic}</em><s><u></u></s></i>`).join("")}</span></span>
    </button>
    <div class="roomwrap">
      <button class="roompill" data-a="rooms"><span class="ri"></span><span class="rn"></span><span class="where"></span></button>
      <button class="pin" data-a="follow" aria-label="Máy quay theo mèo" title="Máy quay theo mèo">📍</button>
    </div>
    <div class="topr">
      <button class="coins" data-a="shop" aria-label="Cá khô"><span>🐟</span><b></b></button>
      <button class="ic" data-a="menu" aria-label="Menu">☰</button>
    </div>
  </header>
  <aside class="rail" aria-label="Lối tắt">
    <button data-a="cammode" title="Xem qua camera / Ở nhà"><span>📹</span></button>
    <button data-a="schedule" title="Lịch của bạn & kế hoạch của mèo"><span>🗓️</span></button>
    <button data-a="quests" title="Nhiệm vụ hôm nay"><span>🎯</span><i class="badge" hidden></i></button>
    <button data-a="album" title="Sổ khoảnh khắc"><span>📸</span></button>
    <button data-a="journal" title="Nhật ký"><span>📔</span></button>
    <button data-a="music" title="Nhạc chill"><span>🎵</span></button>
    <button data-a="immersive" title="Ẩn giao diện – chỉ ngắm mèo"><span>👁️</span></button>
  </aside>
  <div class="toolhint" hidden></div>
  <div class="camui" aria-hidden="true"><div class="cam-tag"><b class="rec">● REC</b><span class="cam-name"></span><span class="cam-clock"></span><em class="cam-ir">HỒNG NGOẠI</em></div></div>
  <nav class="camdock" aria-label="Điều khiển camera">
    <button data-a="talk"><span>🎙️</span><small>Nói</small></button>
    <button data-a="treat"><span>🐟</span><small>Snack <b class="snk"></b></small></button>
    <button data-a="camlaser" class="main"><span>🔴</span><small>Laser</small></button>
    <button data-a="photo"><span>📷</span><small>Chụp</small></button>
    <button data-a="grid"><span>⊞</span><small>Các cam</small></button>
    <button data-a="recs"><span>📼</span><small>Bản ghi</small></button>
  </nav>
  <nav class="dock">
    <button data-a="feed"><span>🍽️</span><small>Cho ăn</small></button>
    <button data-a="call"><span>📣</span><small>Gọi</small></button>
    <button data-a="play" class="main"><span>🧶</span><small>Chơi</small></button>
    <button data-a="clean"><span>🧹</span><small>Dọn dẹp</small><i class="dot" hidden></i></button>
    <button data-a="photo"><span>📷</span><small>Chụp</small></button>
  </nav>
  <button class="docksit" data-a="shoo" hidden aria-label="Đuổi mèo xuống">${R.snapshot("loaf")}</button>
  <div class="checkin" hidden></div>
  <div class="toasts"></div>
  <div class="sheet-wrap" hidden><div class="scrim" data-a="close"></div><section class="sheet" role="dialog" aria-modal="true"><div class="grab"></div><div class="sheet-body"></div></section></div>`;
  const q = (x) => el.querySelector(x);

  // ------------------------------------------------------------------ cập nhật liên tục
  function refresh() {
    const N = s.cat.needs; for (const [k] of NEEDS) { const v = Math.round(N[k]); const i = q(`[data-n=${k}]`); i.style.setProperty("--v", v + "%"); i.classList.toggle("low", v < 30); }
    q(".mood").textContent = `${game.memory.angry ? "😾 Đang giận" : `${game.today.mood.emo} ${game.today.mood.vi}`} · ${ACT_VI[game.brain.activity] || "…"}`;
    q(".coins b").textContent = s.coins;
    const vr = ROOMS[game.scene.room]; q(".ri").textContent = vr.icon; q(".rn").textContent = vr.vi;
    const here = game.body.room === game.scene.room; q(".where").textContent = here ? "" : `${game.cat.name} ở ${ROOMS[game.body.room].icon}`; q(".where").hidden = here;
    q("[data-a=clean] .dot").hidden = !s.house.litter && s.house.cup !== "broken";
    q("[data-a=follow]").classList.toggle("on", game.scene.S.follow);
    q(".moodemo").textContent = game.memory.angry ? "😾" : game.today.mood.emo;
    const nAvg = (s.cat.needs.hunger + s.cat.needs.energy + s.cat.needs.fun + s.cat.needs.social + s.cat.needs.hygiene) / 5; q(".ring").style.setProperty("--p", Math.round(nAvg) + "%"); q(".ring").classList.toggle("low", nAvg < 35);
    const qb = q(".rail .badge"), qc = game.quests.claimable; qb.hidden = !qc; qb.textContent = qc;
    q("[data-a=music]").classList.toggle("on", !!s.settings.music);
    const cam = game.mode === "cam"; root.dataset.mode = game.mode; q("[data-a=cammode]").classList.toggle("on", cam);
    if (cam) { const order = ["balcony", "bedroom", "living", "kitchen", "bathroom"]; q(".cam-name").textContent = `CAM ${order.indexOf(game.scene.room) + 1} · ${ROOMS[game.scene.room].vi}`; q(".snk").textContent = game.snacksLeft(); }
    root.dataset.ir = cam && (game.scene.S.night || 0) > 0.45 ? "1" : "0";
  }
  game.on("tick", refresh); game.on("needs", refresh); game.on("room", refresh); game.on("follow", refresh); game.on("coins", (c) => { refresh(); if (c.n > 0) floatCoin(c.n); });
  refresh();

  // ------------------------------------------------------------------ thẻ CHECK-IN khi mèo sang phòng
  let ckT = 0;
  game.on("checkin", ({ to, follow, here }) => {
    const r = ROOMS[to], ck = q(".checkin");
    if (!follow && !here) { toast(game.mode === "cam" ? `📹 Phát hiện chuyển động · ${r.icon} ${r.vi}` : `${game.cat.name} vừa sang ${r.icon} ${r.vi}`, { act: "Xem", fn: () => (game.mode === "cam" ? game.camCut(to) : game.followCat(true)) }); return; }
    ck.innerHTML = `<div class="ck-ic">${r.icon}</div><div class="ck-tx"><small>📍 Check-in · ${hhmm()}</small><b>${r.vi}</b><span>${esc(game.cat.name)} · ${esc(r.mood)}</span></div>
      <ol class="ck-map">${ORDER.filter((id) => game.roomAllowed(id)).map((id) => `<li class="${id === to ? "on" : ""}" title="${ROOMS[id].vi}">${ROOMS[id].icon}</li>`).join("")}</ol>`;
    ck.hidden = false; ck.classList.remove("show"); void ck.offsetWidth; ck.classList.add("show");
    clearTimeout(ckT); ckT = setTimeout(() => { ck.classList.remove("show"); setTimeout(() => (ck.hidden = true), 400); }, 2800);
    refresh();
  });

  // ------------------------------------------------------------------ toast
  function toast(text, { act, fn, avatar } = {}) {
    const t = document.createElement("div"); t.className = "toast";
    t.innerHTML = `${avatar ? `<span class="ava sm">${R.snapshot("sit")}</span>` : ""}<span>${esc(text)}</span>${act ? `<button>${esc(act)}</button>` : ""}`;
    if (act) t.querySelector("button").onclick = () => { fn(); t.remove(); };
    q(".toasts").appendChild(t); setTimeout(() => t.classList.add("out"), 3200); setTimeout(() => t.remove(), 3600);
  }
  game.on("toast", (o) => toast(o.text, o));
  function floatCoin(n) { const f = document.createElement("div"); f.className = "coinfloat"; f.textContent = `+${n} 🐟`; q(".topr").appendChild(f); setTimeout(() => f.remove(), 1300); }

  // ------------------------------------------------------------------ bảng trượt
  const wrap = q(".sheet-wrap"), body = q(".sheet-body");
  let closeT = 0;
  function open(html, cls = "") { clearTimeout(closeT); const keep = wrap.classList.contains("open"); body.innerHTML = html; wrap.className = "sheet-wrap " + cls + (keep ? " open" : ""); wrap.hidden = false; if (!keep) requestAnimationFrame(() => wrap.classList.add("open")); }
  let pendingSchedule = !s.owner?.set;
  function close() { wrap.classList.remove("open"); clearTimeout(closeT); closeT = setTimeout(() => (wrap.hidden = true), 260); if (pendingSchedule) { pendingSchedule = false; setTimeout(() => show("schedule"), 450); } }
  game.firstRun = () => { if (pendingSchedule && wrap.hidden) { pendingSchedule = false; show("schedule"); } };
  const lock = (feat) => !can(s.plan, feat);
  const head = (t, sub = "") => `<div class="sh-head"><div><h2>${t}</h2>${sub ? `<p>${sub}</p>` : ""}</div><button class="ic" data-a="close" aria-label="Đóng">✕</button></div>`;

  const SHEETS = {
    cat() {
      const t = game.today, tr = t.traits;
      const mem = game.memory, M = mem.M, se = season();
      const skills = Object.entries(SKILLS).map(([k, d]) => { const xp = M.skills[k] || 0, lv = levelOf(xp), nx = nextXp(xp), base = [0, 4, 12, 28, 55, 100][lv], pct = lv >= 5 ? 100 : Math.round(((xp - base) / (nx - base)) * 100); return `<div class="skill"><span class="se">${d.emo}</span><div><b>${d.vi} <em>Cấp ${lv}</em></b><s><u style="width:${pct}%"></u></s><small>${lv >= 5 ? "Tối đa" : d.how} · ${d.perk}</small></div></div>`; }).join("");
      return head(`${esc(game.cat.name)}`, `${esc(game.cat.breed || "")} · ${game.age.vi} · ngày ${game.age.days} · Gắn bó ${Math.round(s.cat.bond)}/100`) + `
      <div class="moodcard"><div class="mc-emo">${t.mood.emo}</div><div><small>Tâm trạng hôm nay · ${new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" })}</small><b>${t.mood.vi}</b><p>${t.mood.desc}</p></div></div>
      <h3>Cảm xúc lúc này</h3><div class="traits">
        <div><span>😾 Giận bạn</span><s><u class="bad" style="width:${Math.round(mem.grudge)}%"></u></s></div>
        <div><span>🧘 Kiên nhẫn</span><s><u style="width:${Math.round(mem.patience)}%"></u></s></div></div>
      ${mem.angry ? `<p class="muted">Đang giận. Cho ăn, chơi cùng hoặc để yên một lúc sẽ nguôi.</p>` : ""}
      <h3>Tính cách hôm nay</h3><div class="traits">${Object.entries(TRAITS).map(([k, vi]) => `<div><span>${vi}</span><s><u style="width:${Math.round(tr[k] * 100)}%"></u></s></div>`).join("")}</div>
      <h3>Sở thích hôm nay</h3><div class="likes">
        <div><small>Thích được gãi</small><b>${s.found?.[t.key] ? ZONES[t.likeZone] : "❓ Thử vuốt xem"}</b></div>
        <div><small>Đồ chơi ưa</small><b>${TOYS[t.toy]}</b></div>
        <div><small>Chỗ ruột</small><b>${SPOTS[t.spot]}</b></div>
        <div><small>Giờ "điên"</small><b>${t.crazyHour}:00</b></div>
      </div>
      <h3>Ngày mai ${planChip("plus")}</h3>${lock("mood.forecast") ? `<button class="locked" data-a="plans">🔒 Xem trước tâm trạng ngày mai với Plus</button>` : (() => { const d = new Date(); d.setDate(d.getDate() + 1); const m = todayOf(game.cat, d).mood; return `<div class="moodcard sm"><div class="mc-emo">${m.emo}</div><div><b>${m.vi}</b><p>${m.desc}</p></div></div>`; })()}
      <h3>Thói tật (cả đời)</h3><div class="quirks">${game.quirks.map((x) => `<div><span>${x.emo}</span><div><b>${x.vi}</b><small>${x.desc}</small></div></div>`).join("")}<div><span>💘</span><div><b>Tuần này mê: ${game.obsession.vi}</b><small>Đổi mỗi thứ hai</small></div></div>${se ? `<div><span>${se.emo}</span><div><b>Mùa ${se.vi}</b><small>Nhà có đồ trang trí theo mùa</small></div></div>` : ""}</div>
      <h3>Kỹ năng</h3><div class="skills">${skills}</div>
      <h3>${esc(game.cat.name)} nhớ…</h3>${M.notes.length ? `<ol class="notes">${M.notes.slice(0, 10).map((n) => `<li>🧠 ${esc(n.text)}</li>`).join("")}</ol>` : `<p class="muted">Chưa nhớ gì nhiều. Chơi với bé vài ngày, bé sẽ học thói quen của bạn.</p>`}
      <p class="muted">Mẹo: chạm đúp vào mèo để dạy đập tay 🖐️</p>
      <h3>Nhu cầu</h3><div class="traits">${NEEDS.map(([k, vi, ic]) => `<div><span>${ic} ${vi}</span><s><u style="width:${Math.round(s.cat.needs[k])}%"></u></s></div>`).join("")}</div>
      <h3>Mèo trong nhà ${planChip("plus")}</h3><div class="skins">${CATS.map((c) => { const lk = c.id !== "nana" && !can(s.plan, c.tier === "pro" ? "cat.custom" : "cat.second"); return `<button data-cat="${c.id}" class="${s.catId === c.id ? "on" : ""} ${lk ? "lockd" : ""}"><span>${c.renderer === "sprite" ? "🎞️" : "✒️"}</span><b>${esc(c.name)}</b><small>${c.renderer === "sprite" ? "Khung hình" : "Vector"}${lk ? " 🔒" : ""}</small></button>`; }).join("")}</div>
      <h3>Phụ kiện</h3><div class="skins">${R.skins.map((k) => { const it = SHOP.find((x) => x.id === "skin." + k), own = k === "classic" || s.owned["skin." + k]; return `<button data-skin="${k}" class="${s.skin === k ? "on" : ""} ${own ? "" : "lockd"}">${R.snapshot("sit", k)}<small>${k === "classic" ? "Cổ điển" : it?.vi || k}${own ? "" : " 🔒"}</small></button>`; }).join("")}</div>`;
    },
    rooms() {
      return head("Căn nhà", "Chạm để xem phòng. Mèo vẫn tự đi lại.") + `<div class="roomgrid">${ORDER.map((id) => { const r = ROOMS[id], ok = game.roomAllowed(id), cat = game.body.room === id; return `<button data-room="${id}" class="${game.scene.room === id ? "on" : ""} ${ok ? "" : "lockd"}"><span>${r.icon}</span><b>${r.vi}</b><small>${ok ? r.mood : "🔒 " + PLANS[planOf(r.feat)].vi}</small>${cat ? `<i class="here">${game.cat.name} ở đây</i>` : ""}</button>`; }).join("")}</div>`;
    },
    play() {
      const toys = [["yarn", "🧶", "Cuộn len", "Chạm sàn để ném", "toy.yarn"], ["laser", "🔴", "Đèn laser", "Rê ngón tay trên sàn", "toy.laser"], ["feather", "🪶", "Cần lông vũ", "Rê để mèo vồ", "toy.feather"]];
      return head("Chơi với " + esc(game.cat.name), `Hôm nay bé thích: ${TOYS[game.today.toy]}`) + `<div class="toys">${toys.map(([k, ic, vi, hint, id]) => { const own = s.owned[id]; return `<button data-toy="${k}" class="${own ? "" : "lockd"}"><span>${ic}</span><b>${vi}</b><small>${own ? hint : `🔒 Mua ở cửa hàng`}</small></button>`; }).join("")}</div>`;
    },
    shop() {
      return head("Cửa hàng", `Bạn có ${s.coins} 🐟 · Cá khô kiếm được khi chăm mèo, ghé thăm mỗi ngày và khi vắng nhà.`) + `<div class="shop">${SHOP.map((it) => { const own = s.owned[it.id] || it.owned, pl = it.feat && lock(it.feat) ? planOf(it.feat) : null; return `<div class="item"><span class="ii">${it.icon}</span><div><b>${it.vi}</b>${pl ? planChip(pl) : ""}</div>${own ? `<em>Đã có</em>` : pl ? `<button data-a="plans" class="ghost">Nâng gói</button>` : `<button data-buy="${it.id}" ${s.coins < it.price ? "disabled" : ""}>${it.price} 🐟</button>`}</div>`; }).join("")}</div>`;
    },
    journal() {
      const lim = can(s.plan, "journal.all") ? 1e9 : can(s.plan, "journal.30d") ? 30 : 3;
      const days = [...new Set(s.journal.map((e) => e.d))].sort().reverse(), shown = days.slice(0, lim);
      return head("Nhật ký", `Mọi lần check-in, ăn, chơi của ${esc(game.cat.name)}.`) + `<div class="journal">${shown.map((d) => `<h3>${d === dayKey() ? "Hôm nay" : new Date(d).toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "numeric" })}</h3><ol>${s.journal.filter((e) => e.d === d).slice(-60).reverse().map((e) => `<li><time>${hhmm(e.t)}</time><span>${esc(e.text)}</span></li>`).join("")}</ol>`).join("") || "<p class='muted'>Chưa có gì. Mèo đang làm quen nhà mới.</p>"}
        ${days.length > lim ? `<button class="locked" data-a="plans">🔒 Xem thêm ${days.length - lim} ngày cũ với ${lim === 3 ? "Plus" : "Pro"}</button>` : ""}</div>`;
    },
    plans() {
      const rows = [["Nuôi na na, 4 phòng, cuộn len", 1, 1, 1], ["Nhật ký", "3 ngày", "30 ngày", "Không giới hạn"], ["Ban công + laser + lông vũ", 0, 1, 1], ["Xem trước tâm trạng ngày mai", 0, 1, 1], ["Nuôi thêm mèo thứ 2", 0, 1, 1], ["Mèo riêng (thả bộ khung hình của bạn)", 0, 0, 1], ["Mũ phớt, mọi phụ kiện", 0, 0, 1], ["Animation Lab", 0, 0, 1], ["Giọng AI: mèo nói theo trí nhớ", 0, 0, 1]];
      const cell = (v) => (v === 1 ? "✓" : v === 0 ? "–" : v);
      return head("Gói", "Bản thử: chọn gói để mở khoá ngay (chưa nối thanh toán).") + `<div class="plans">${Object.entries(PLANS).map(([k, p]) => `<button data-plan="${k}" class="${s.plan === k ? "on" : ""}"><b>${p.vi}</b><span>${p.price}</span><small>${p.note}</small>${s.plan === k ? "<em>Đang dùng</em>" : ""}</button>`).join("")}</div>
      <table class="cmp"><thead><tr><th></th><th>Free</th><th>Plus</th><th>Pro</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r[0]}</td>${r.slice(1).map((v) => `<td>${cell(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    },
    schedule() {
      const O = game.schedule.O(), W = O.weekday, E = O.weekend, days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"], pb = game.brain.planNow();
      const plan = game.schedule.planFor(new Date()).blocks.filter((b) => b.b - b.a >= 0.2);
      const row = (k, label, v, grp) => `<label class="trow"><span>${label}</span><input type="time" data-sch="${grp}.${k}" value="${v == null ? "" : fmtH(v)}"></label>`;
      const cal = game.calendar, C = cal.C, info = game.schedule.dayInfo(new Date());
      const calBox = cal.connected ? `<div class="calbox on"><div class="cb-h"><b>📅 Đã kết nối ${({ google: "Google Calendar", ics: "lịch iCal", file: "file .ics" })[C.provider]}</b><small>${C.events.length} sự kiện · đồng bộ ${hhmm(C.synced)}</small></div>
          ${info.notes.length || info.fromCal ? `<p class="muted">Hôm nay: ${info.segs.map((x) => `${x.state === "busy" ? "💻" : x.state === "trip" ? "✈️" : "🏢"} ${fmtH(x.a)}–${fmtH(x.b)}${x.title ? " " + esc(x.title) : ""}`).join(" · ") || "ở nhà cả ngày"}</p>` : ""}
          <ol class="cal-ev">${cal.upcoming(7).slice(0, 14).map((e) => { const k = cal.kindOf(e); return `<li><time>${new Date(e.start).toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "numeric" })} ${e.allDay ? "cả ngày" : hhmm(e.start)}</time><span>${esc(e.title || "(không tên)")}</span><button data-kind="${esc(e.id)}" class="k-${k}" title="Chạm để đổi loại">${KIND[k].ic} ${KIND[k].vi}</button></li>`; }).join("") || "<p class='muted'>7 ngày tới chưa có sự kiện.</p>"}</ol>
          <div class="row two"><button class="ghost" data-a="calsync">Đồng bộ lại</button><button class="ghost danger" data-a="caloff">Ngắt kết nối</button></div></div>`
        : `<div class="calbox"><div class="cb-h"><b>📅 Kết nối lịch của bạn</b><small>${esc(game.cat.name)} tự chỉnh theo lịch thật: họp ngoài, họp online, đi công tác, nghỉ phép, tiệc khuya…</small></div>
          <button class="calbtn" data-a="calgoogle"><span>G</span>Google Calendar${CAL.googleClientId ? "" : " <em>chưa cấu hình</em>"}</button>
          <div class="calurl"><input type="url" placeholder="Dán link iCal (Apple iCloud, Outlook, Google…)" data-calurl><button data-a="calics">Kết nối</button></div>
          <label class="calbtn file"><span>⤓</span>Nhập file .ics<input type="file" accept=".ics,text/calendar" data-calfile hidden></label>
          <p class="muted">🔒 Chỉ ĐỌC giờ, tiêu đề, địa điểm sự kiện trong ${CAL.days} ngày tới. Dữ liệu nằm trên máy này, không gửi đi đâu. Ngắt kết nối bất cứ lúc nào.</p></div>`;
      return head("Lịch của bạn", `${esc(game.cat.name)} sống theo lịch này: gọi bạn dậy, tiễn ra cửa, ra cửa ngồi chờ trước giờ bạn về, ngủ cùng bạn.`) + calBox + `
      <h3>Lịch nền · ngày đi làm</h3><div class="days">${days.map((d, i) => `<button data-wd="${i}" class="${O.workdays.includes(i) ? "on" : ""}">${d}</button>`).join("")}</div>
      <div class="tgrid">${row("wake", "Thức dậy", W.wake, "weekday")}${row("leave", "Ra khỏi nhà", W.leave, "weekday")}${row("back", "Về nhà", W.back, "weekday")}${row("sleep", "Đi ngủ", W.sleep, "weekday")}</div>
      <h3>Ngày nghỉ</h3><div class="tgrid">${row("wake", "Thức dậy", E.wake, "weekend")}${row("sleep", "Đi ngủ", E.sleep, "weekend")}</div>
      <h3>Máy cho ăn tự động</h3><div class="tgrid"><label class="row"><span>Bật</span><input type="checkbox" data-set-feeder ${O.feederOn ? "checked" : ""}></label>${row(0, "Lần 1", O.feeder[0], "feeder")}${row(1, "Lần 2", O.feeder[1], "feeder")}</div>
      ${game.memory.usualHour() != null ? `<button class="ghost wide" data-a="learnsch">✨ Gợi ý: bạn hay mở app lúc ${game.memory.usualHour()} giờ – đặt làm giờ về nhà</button>` : ""}
      <button class="primary" data-a="savesch">Lưu lịch</button>
      <h3>Kế hoạch hôm nay của ${esc(game.cat.name)}</h3><ol class="plan">${plan.map((b) => { const i = ACT_INFO[b.act] || { vi: b.act, ic: "🐾" }, on = pb && pb.a === b.a && pb.act === b.act; return `<li class="${on ? "now" : ""}"><time>${fmtH(b.a)}–${fmtH(b.b)}</time><span>${i.ic} ${i.vi}${b.room ? ` · ${ROOMS[b.room].vi}` : ""}${b.title ? ` <i class="calt">📅 ${esc(b.title)}</i>` : ""}</span>${on ? "<em>đang</em>" : ""}</li>`; }).join("")}</ol>`;
    },
    grid() {
      const order = ["balcony", "bedroom", "living", "kitchen", "bathroom"].filter((r) => game.roomAllowed(r));
      return head("Tất cả camera", "Chạm để chuyển camera.") + `<div class="camgrid">${order.map((id, i) => { const r = ROOMS[id], here = game.body.room === id; return `<button data-camroom="${id}" class="${game.scene.room === id ? "on" : ""}"><div class="thumb">${thumbs[id] ||= `<svg viewBox="0 0 ${r.W} 900" preserveAspectRatio="xMidYMax slice">${r.bg(r.W).replace(/id="([^"]+)"/g, 'id="$1-t' + id + '"').replace(/url\(#([^)]+)\)/g, "url(#$1-t" + id + ")")}</svg>`}${here ? `<span class="tcat" style="left:${Math.round((game.body.x / r.W) * 100)}%">${R.snapshotNow()}</span>` : ""}</div><small><b>CAM ${["balcony", "bedroom", "living", "kitchen", "bathroom"].indexOf(id) + 1}</b> ${r.vi}${here ? ` <em>● chuyển động</em>` : ""}</small></button>`; }).join("")}</div>`;
    },
    recs() {
      const d0 = new Date(); d0.setHours(0, 0, 0, 0); const now = new Date();
      const plan = game.schedule.blocksBetween(d0, now).filter((b) => b.end - b.start > 8 * 60e3).map((b) => ({ t: b.start.getTime(), text: `${(ACT_INFO[b.act] || {}).ic || "🐾"} ${(ACT_INFO[b.act] || {}).vi || b.act}`, room: b.room }));
      const jr = s.journal.filter((e) => e.t >= d0.getTime() && ["checkin", "event", "scare", "feeder", "owner", "knock", "moment"].includes(e.type)).map((e) => ({ t: e.t, text: e.text, room: e.room }));
      const all = [...plan, ...jr].sort((a, b) => b.t - a.t).slice(0, 60);
      return head("Bản ghi hôm nay", "Camera tự ghi mỗi khi có chuyển động.") + `<ol class="recs">${all.map((e) => `<li><time>${hhmm(e.t)}</time><span>${esc(e.text)}</span>${e.room ? `<button data-camroom="${e.room}">${ROOMS[e.room]?.icon || ""} Xem</button>` : ""}</li>`).join("") || "<p class='muted'>Chưa có bản ghi.</p>"}</ol>`;
    },
    quests() {
      return head("Nhiệm vụ hôm nay", "Đổi mỗi ngày. Làm xong bấm nhận cá khô.") + `<div class="quests">${game.quests.list().map((x) => `<div class="quest ${x.claimed ? "done" : ""}"><div><b>${x.vi}</b><s><u style="width:${Math.round((x.p / x.n) * 100)}%"></u></s><small>${x.p}/${x.n}</small></div>${x.claimed ? `<em>Đã nhận</em>` : x.p >= x.n ? `<button data-claim="${x.id}">+${x.reward} 🐟</button>` : `<span class="rw">+${x.reward} 🐟</span>`}</div>`).join("")}</div>`;
    },
    album() {
      const A = game.album.A, tab = albumTab;
      const mom = MOMENTS.map((m) => { const c = A.moments[m.id]; return c ? polaroid(c, m.vi, "★".repeat(m.rare)) : `<div class="pola locked"><div class="ph">?</div><small>${"★".repeat(m.rare)} ???</small></div>`; }).join("");
      const ph = A.photos.length ? A.photos.map((c) => polaroid(c, c.caption)).join("") : `<p class="muted">Chưa có ảnh. Bấm 📷 Chụp lúc mèo đang đáng yêu.</p>`;
      return head("Sổ khoảnh khắc", `${game.album.count}/${MOMENTS.length} khoảnh khắc · ${A.photos.length} ảnh`) + `<div class="tabs"><button data-tab="m" class="${tab === "m" ? "on" : ""}">Khoảnh khắc</button><button data-tab="p" class="${tab === "p" ? "on" : ""}">Ảnh của tôi</button></div><div class="polas">${tab === "m" ? mom : ph}</div>`;
    },
    menu() {
      return head(APP.name, APP.tagline) + `<div class="menu">
        <button data-a="quests"><span>🎯</span>Nhiệm vụ</button><button data-a="album"><span>📸</span>Khoảnh khắc</button>
        <button data-a="journal"><span>📔</span>Nhật ký</button><button data-a="shop"><span>🛍️</span>Cửa hàng</button>
        <button data-a="cat"><span>🐈‍⬛</span>Hồ sơ mèo</button><button data-a="rooms"><span>🏠</span>Căn nhà</button>
        <button data-a="plans"><span>⭐</span>Gói ${planChip(s.plan) || "Miễn phí"}</button><button data-a="settings"><span>⚙️</span>Cài đặt</button>
      </div>`;
    },
    settings() {
      const h = s.settings.hour;
      return head("Cài đặt") + `<div class="settings">
        <div class="row"><span>Cỡ giao diện</span><span class="seg">${[["s", "Nhỏ"], ["m", "Vừa"], ["l", "Lớn"]].map(([k, v]) => `<button data-ui="${k}" class="${(s.settings.ui || "m") === k ? "on" : ""}">${v}</button>`).join("")}</span></div>
        <div class="row"><span>Hù doạ 👻</span><span class="seg">${[["off", "Tắt"], ["soft", "Nhẹ"], ["full", "Đủ đô"]].map(([k, v]) => `<button data-scare="${k}" class="${(s.settings.scare || "full") === k ? "on" : ""}">${v}</button>`).join("")}</span></div>
        <label class="row"><span>Nhạc lo-fi chill</span><input type="checkbox" data-set="music" ${s.settings.music ? "checked" : ""}></label>
        <label class="row"><span>Âm thanh (meo, rừ rừ)</span><input type="checkbox" data-set="sound" ${s.settings.sound ? "checked" : ""}></label>
        <label class="row"><span>Máy quay theo mèo</span><input type="checkbox" data-set="follow" ${s.settings.follow ? "checked" : ""}></label>
        <label class="row"><span>Giọng AI – mèo nói theo trí nhớ ${planChip("pro")}${AI.endpoint ? "" : "<small>chưa cấu hình</small>"}</span><input type="checkbox" data-set="aiVoice" ${s.settings.aiVoice ? "checked" : ""} ${can(s.plan, "ai.voice") ? "" : "disabled"}></label>
        <label class="row"><span>Giảm chuyển động</span><input type="checkbox" data-set="reduced" ${s.settings.reduced ? "checked" : ""}></label>
        <div class="row col"><span>Giờ trong nhà <small>${h == null ? "Theo giờ thật" : `Xem thử ${Math.floor(h)}:00`}</small></span><input type="range" min="-1" max="23.5" step="0.5" value="${h ?? -1}" data-set="hour"></div>
        <a class="row link" href="lab.html"><span>🎬 Animation Lab ${planChip("pro")}</span><span>›</span></a>
        <div class="row two"><button data-a="export" class="ghost">Sao lưu</button><button data-a="reset" class="ghost danger">Nuôi lại từ đầu</button></div>
        <p class="muted">${APP.name} ${APP.version} · Dữ liệu chỉ lưu trên máy này.</p></div>`;
    },
  };
  let albumTab = "m"; const thumbs = {};
  const polaroid = (c, cap, stars = "") => `<div class="pola ${c.night ? "night" : ""}"><div class="ph" style="--bg:${c.bg}">${c.svg}</div><small>${stars ? `<i>${stars}</i> ` : ""}${esc(cap)}</small></div>`;
  function show(k) { if (SHEETS[k]) open(SHEETS[k](), "sh-" + k); }
  game.showSheet = show;

  // ------------------------------------------------------------------ vắng nhà / chào ngày mới
  game.welcome = () => {
    const a = game.away, t = game.today;
    if (!a && !game.dailyBonus) return;
    open(head(a ? "Trong lúc bạn vắng nhà" : "Chào ngày mới", a ? `Bạn đi ${fmtDur(a.h * 3600e3)}` : "") + `
      <div class="moodcard"><div class="mc-emo">${t.mood.emo}</div><div><small>Hôm nay ${esc(game.cat.name)}</small><b>${t.mood.vi}</b><p>${t.mood.desc}</p></div></div>
      ${a ? `<ol class="awaylist">${a.events.map((e) => `<li><time>${hhmm(e.t)}</time><span>${esc(e.text)}</span></li>`).join("")}</ol>` : ""}
      <div class="gain">${a ? `<div><b>+${a.coins} 🐟</b><small>Cá khô tích được</small></div>` : ""}${game.dailyBonus ? `<div><b>+${game.dailyBonus} 🐟</b><small>Ghé thăm ${s.visits.streak} ngày liền</small></div>` : ""}</div>
      <button class="primary" data-a="close">Vào nhà</button>`, "sh-welcome");
  };

  // ------------------------------------------------------------------ bấm nút
  el.addEventListener("click", (e) => {
    unlock();
    game.lastInput = Date.now(); game.musicResume?.();
    const b = e.target.closest("[data-a],[data-room],[data-toy],[data-buy],[data-plan],[data-skin],[data-cat],[data-claim],[data-tab],[data-ui],[data-scare],[data-camroom],[data-wd],[data-kind]"); if (!b) return;
    if (b.dataset.kind) { const cal = game.calendar, e = cal.C.events.find((x) => x.id === b.dataset.kind); if (e) { const k = cal.kindOf(e), nk = KIND_ORDER[(KIND_ORDER.indexOf(k) + 1) % KIND_ORDER.length]; cal.setKind(e.id, nk); show("schedule"); } return; }
    if (b.dataset.camroom) { close(); game.camCut(b.dataset.camroom); return; }
    if (b.dataset.wd != null) { const O = game.schedule.O(), i = +b.dataset.wd; O.workdays = O.workdays.includes(i) ? O.workdays.filter((x) => x !== i) : [...O.workdays, i].sort(); b.classList.toggle("on"); return; }
    if (b.dataset.claim) { game.quests.claim(b.dataset.claim); show("quests"); refresh(); return; }
    if (b.dataset.tab) { albumTab = b.dataset.tab; show("album"); return; }
    if (b.dataset.ui) { s.settings.ui = b.dataset.ui; applyUi(); save(s); show("settings"); return; }
    if (b.dataset.scare) { s.settings.scare = b.dataset.scare; save(s); show("settings"); return; }
    const a = b.dataset.a;
    if (b.dataset.room) { if (!game.roomAllowed(b.dataset.room)) return show("plans"); close(); game.viewRoom(b.dataset.room); return; }
    if (b.dataset.toy) { const id = "toy." + b.dataset.toy; if (!s.owned[id]) return show("shop"); close(); game.setTool(b.dataset.toy); return; }
    if (b.dataset.buy) { const it = SHOP.find((x) => x.id === b.dataset.buy); if (s.coins >= it.price) { s.coins -= it.price; s.owned[it.id] = 1; save(s); toast(`Đã mua ${it.icon} ${it.vi}`); if (it.kind === "skin") game.setSkin(it.id.slice(5)); show("shop"); refresh(); } return; }
    if (b.dataset.plan) { s.plan = b.dataset.plan; for (const it of SHOP) if (it.feat && can(s.plan, it.feat) && it.price === 0) s.owned[it.id] = 1; save(s, true); show("plans"); refresh(); return; }
    if (b.dataset.cat) { const c = CATS.find((x) => x.id === b.dataset.cat); if (b.classList.contains("lockd")) return show("plans"); if (c.id !== s.catId) { s.catId = c.id; s.skin = "classic"; save(s, true); location.reload(); } return; }
    if (b.dataset.skin) { const k = b.dataset.skin; if (k !== "classic" && !s.owned["skin." + k]) return show("shop"); game.setSkin(k); show("cat"); return; }
    switch (a) {
      case "close": return close();
      case "feed": return game.feed();
      case "call": return game.call();
      case "clean": return game.clean();
      case "shoo": return game.shoo();
      case "photo": return game.photo();
      case "cammode": { const m = game.mode === "cam" ? "home" : "cam"; game.setMode(m, true); toast(m === "cam" ? "📹 Đang xem qua camera" : "🏠 Bạn đang ở nhà"); return; }
      case "talk": return game.talk();
      case "calgoogle": return calRun(() => game.calendar.connectGoogle());
      case "calics": return calRun(() => game.calendar.connectIcsUrl(body.querySelector("[data-calurl]").value));
      case "calsync": game.calendar.C.synced = 0; return calRun(async () => { await game.calendar.refresh(); return game.calendar.C.events.length; });
      case "caloff": game.calendar.disconnect(); toast("📅 Đã ngắt kết nối lịch – dùng lại lịch nền"); show("schedule"); return;
      case "treat": return game.treat();
      case "camlaser": return game.tool ? game.setTool(null) : s.owned["toy.laser"] ? game.setTool("laser") : show("shop");
      case "learnsch": { const u = game.memory.usualHour(); body.querySelector('[data-sch="weekday.back"]').value = fmtH(u); return; }
      case "savesch": {
        const O = game.schedule.O(), o = { weekday: { ...O.weekday }, weekend: { ...O.weekend }, feeder: [...O.feeder], workdays: O.workdays, feederOn: !!body.querySelector("[data-set-feeder]")?.checked };
        body.querySelectorAll("[data-sch]").forEach((i) => { const [g, k] = i.dataset.sch.split("."), v = parseH(i.value); if (g === "feeder") o.feeder[+k] = v ?? o.feeder[+k]; else { let x = v; if (k === "sleep" && x != null && x < 12) x += 24; o[g][k] = x; } });
        game.schedule.save(o); toast(`🗓️ Đã lưu lịch – ${game.cat.name} sẽ sống theo lịch mới`); show("schedule"); refresh(); return;
      }
      case "music": return game.music();
      case "immersive": return immersive(true);
      case "follow": return game.followCat(!game.scene.S.follow);
      case "play": return game.tool ? game.setTool(null) : show("play");
      case "export": { const blob = new Blob([JSON.stringify(s, null, 1)], { type: "application/json" }); const u = URL.createObjectURL(blob); const l = document.createElement("a"); l.href = u; l.download = `purrsona-${dayKey()}.json`; l.click(); return; }
      case "reset": if (b.dataset.sure) { globalThis.__purrReset = true; localStorage.removeItem(APP.saveKey); s.journal = []; location.reload(); } else { b.dataset.sure = 1; b.textContent = "Chạm lần nữa để xoá hết"; } return;
      default: show(a);
    }
  });
  async function calRun(fn) {
    try { toast("📅 Đang đọc lịch…"); const n = await fn(); const st = game.schedule.ownerState(), I = game.schedule.dayInfo(new Date());
      toast(`📅 Đọc ${n} sự kiện · ${game.cat.name} đã chỉnh kế hoạch${I.segs.length ? ` – hôm nay ${I.segs.map((x) => `${x.state === "busy" ? "💻" : x.state === "trip" ? "✈️" : "🏢"} ${fmtH(x.a)}`).join(", ")}` : " – hôm nay bạn ở nhà"}`); if (st) refresh(); show("schedule");
    } catch (err) { toast("⚠️ " + (err.message || err)); }
  }
  game.on("calendar-error", (m) => toast("📅 " + m));
  el.addEventListener("change", (e) => {
    if (e.target.matches("[data-calfile]") && e.target.files[0]) { const f = e.target.files[0]; calRun(() => game.calendar.importFile(f)); return; }
    const k = e.target.dataset.set; if (!k) return;
    if (k === "hour") { const v = +e.target.value; game.setHour(v < 0 ? null : v); show("settings"); return; }
    if (k === "music") { game.music(e.target.checked); return; }
    s.settings[k] = e.target.checked; if (k === "follow") game.followCat(e.target.checked); if (k === "reduced") { R.reduced = e.target.checked; document.documentElement.classList.toggle("reduced", e.target.checked); } save(s);
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape") { if (!wrap.hidden) close(); else if (game.tool) game.setTool(null); } });

  // cỡ giao diện & chế độ chỉ ngắm mèo
  function applyUi() { document.documentElement.dataset.ui = s.settings.ui || "m"; }
  applyUi();
  const eye = document.createElement("button"); eye.className = "uneye"; eye.hidden = true; eye.setAttribute("aria-label", "Hiện giao diện"); eye.textContent = "👁️"; root.appendChild(eye);
  function immersive(on) { el.classList.toggle("hidden", on); eye.hidden = !on; if (on) { toast("Chạm 👁️ để hiện lại giao diện"); } }
  eye.onclick = () => immersive(false);
  game.on("photo", (c) => { const t = document.createElement("div"); t.className = "photopop"; t.innerHTML = polaroid(c, c.caption); el.appendChild(t); setTimeout(() => t.classList.add("out"), 2200); setTimeout(() => t.remove(), 2800); });
  game.on("moment", (m) => toast(`📸 Khoảnh khắc mới: ${m.vi} ${"★".repeat(m.rare)}`));
  game.on("quests", refresh); game.on("music", refresh); game.on("mode", refresh); game.on("treat", refresh); game.on("schedule", refresh);
  // đồng hồ camera chạy từng giây
  setInterval(() => { if (game.mode === "cam") { const d = new Date(); q(".cam-clock").textContent = `${innerWidth < 520 ? "" : d.toLocaleDateString("vi-VN") + " "}${d.toLocaleTimeString("vi-VN", { hour12: false })}`; } }, 1000);
  game.on("dock", (on) => { const d = q(".docksit"); d.hidden = !on; q(".dock").classList.toggle("blocked", on); if (on) { d.classList.remove("pop"); void d.offsetWidth; d.classList.add("pop"); } });
  game.on("skill", ({ k, level }) => toast(`🎓 ${game.cat.name} lên cấp ${SKILLS[k].vi} ${level}!`));
  game.on("note", (t) => toast(`🧠 ${game.cat.name} nhớ: ${t}`));
  game.on("grudge", (on) => { toast(on ? `😾 ${game.cat.name} đang giận bạn` : `💗 ${game.cat.name} hết giận rồi`); refresh(); });
  // gợi ý khi đang cầm đồ chơi
  game.on("tool", (k) => { const h = q(".toolhint"); h.hidden = !k; h.innerHTML = k ? `<span>${{ yarn: "🧶 Chạm lên sàn để ném len", laser: "🔴 Rê ngón tay trên sàn", feather: "🪶 Rê cần lông trước mặt mèo" }[k]}</span><button data-a="play">Xong</button>` : ""; q("[data-a=play]").classList.toggle("on", !!k); });
  return { toast, show, refresh };
}
