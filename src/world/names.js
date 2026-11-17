// GỌI TÊN ĐỒ VẬT: mọi thứ trong vườn & trong nhà đều có chữ (hàng rào, cổng, nhà, cửa, giá phơi…).
// Mặc định KHÔNG bật thẻ to: chỉ hiện viên chữ nhỏ thân thiện; muốn tìm hiểu thì chạm viên chữ → thẻ mở to (đọc, ví dụ, lưu, học).
// Bật/tắt viên chữ cho tất cả đồ vật bằng nút nhãn ở góc trên. Tắt rồi vẫn chạm thẳng vào đồ vật để xem tên nó.
import { UH, RACK, GATE } from "./yard.js";
import { esc } from "../core/util.js";
import { icon } from "../ui/icons.js";

// u, v: vị trí trên mặt sân; h: độ cao (đơn vị sân). w: chữ theo từng tiếng (id thẻ = lang:chữ)
const OBJ = [
  { u: 30, v: UH, h: 3.2, w: { en: "fence", zh: "篱笆", ja: "柵" } },
  { u: (GATE.u0 + GATE.u1) / 2, v: UH, h: 6, w: { en: "gate", zh: "大门", ja: "門" } },
  { u: 82, v: 0, h: 11, w: { en: "house", zh: "房子", ja: "家" } },
  { u: 68.5, v: 0, h: 9, w: { en: "window", zh: "窗户", ja: "窓" } },
  { u: 77, v: 30, h: 2.4, w: { en: "door", zh: "门", ja: "ドア" } },
  { u: 64, v: 8, h: 2.6, w: { en: "wall", zh: "墙", ja: "壁" } },
  { u: 90, v: 27, h: 0, w: { en: "floor", zh: "地板", ja: "床" } },
  { u: 80, v: 15, h: 0, w: { en: "rug", zh: "地毯", ja: "じゅうたん" } },
  { u: 79, v: 3, h: 7, w: { en: "desk", zh: "书桌", ja: "机" } },
  { u: 74.5, v: 2.9, h: 10.8, w: { en: "laptop", zh: "笔记本电脑", ja: "パソコン" } },
  { u: 92, v: 1.7, h: 16.5, w: { en: "bookshelf", zh: "书架", ja: "本棚" } },
  { u: 92, v: 22, h: 1.2, w: { en: "cat bed", zh: "猫窝", ja: "猫のベッド" } },
  { u: 48, v: 9, h: 17, w: { en: "tree", zh: "树", ja: "木" } },
  { u: 20, v: 9, h: 4.4, w: { en: "bench", zh: "长椅", ja: "ベンチ" } },
  { u: 56, v: 3, h: 3.4, w: { en: "bush", zh: "灌木", ja: "茂み" } },
  { u: 30, v: 28, h: 0, w: { en: "flower bed", zh: "花坛", ja: "花壇" } },
  { u: 38, v: 38, h: 0, w: { en: "grass", zh: "草", ja: "草" } },
  { u: 66, v: 42, h: 0, w: { en: "stepping stone", zh: "踏脚石", ja: "飛び石" } },
  { u: 24, v: 56, h: 0, w: { en: "pond", zh: "池塘", ja: "池" } },
  { u: 42, v: 57, h: 3.6, w: { en: "rose", zh: "玫瑰", ja: "バラ" } },
  { u: 32, v: 13, h: 13.5, w: { en: "swing", zh: "秋千", ja: "ブランコ" } },
  { u: 55, v: 35.5, h: 7, w: { en: "slide", zh: "滑梯", ja: "滑り台" } },
  { u: 62.4, v: 35.5, h: 10.5, w: { en: "ladder", zh: "梯子", ja: "はしご" } },
  { u: 6.5, v: 37, h: 12.5, w: { en: "trellis", zh: "瓜架", ja: "ひょうたん" } },
  { u: 66.6, v: 32.2, h: 3, w: { en: "flower pot", zh: "花盆", ja: "植木鉢" } },
  { u: (RACK.u0 + RACK.u1) / 2, v: RACK.v, h: RACK.h + 0.6, w: { en: "clothesline", zh: "晾衣架", ja: "物干し" } },
];

export function createNames(game) {
  const s = game.save, Y = game.yard, learn = game.learn;
  const layer = document.createElement("div"); layer.className = "names"; Y.topfx.appendChild(layer);
  const card = document.createElement("div"); card.className = "ncard"; card.hidden = true; card.setAttribute("role", "dialog"); card.setAttribute("aria-label", "Chữ của đồ vật"); document.body.appendChild(card);
  let on = !!s.settings.names, temp = null, tempT = 0;
  const cardOf = (o) => learn.card(`${learn.lang}:${o.w[learn.lang]}`);
  const pos = (o) => Y.P(o.u, o.v, o.h);

  function pill(o, c, cls = "") {
    const [x, y] = pos(o), b = document.createElement("button");
    b.className = "npill " + cls; b.type = "button"; b.dataset.nid = c.id; b.style.left = x.toFixed(0) + "px"; b.style.top = y.toFixed(0) + "px";
    b.innerHTML = `<b class="${c.lang}">${esc(c.w)}</b>`; b.setAttribute("aria-label", `${c.w}: xem chữ`);
    layer.appendChild(b); return b;
  }
  function render() {
    layer.querySelectorAll(".npill:not(.temp)").forEach((n) => n.remove());
    if (!on) return;
    const made = [];
    for (const o of OBJ) { const c = cardOf(o); if (c) made.push(pill(o, c)); }
    // né nhau: viên nào đè viên đã đặt thì đẩy lên trên một nấc (đo 1 lần, không đo mỗi khung)
    const boxes = [];
    for (const b of made.sort((a, z) => parseFloat(z.style.top) - parseFloat(a.style.top))) {
      const w = b.offsetWidth, h = b.offsetHeight; let x = parseFloat(b.style.left), y = parseFloat(b.style.top);
      for (let i = 0; i < 6 && boxes.some((r) => Math.abs(r.x - x) < (r.w + w) / 2 + 2 && Math.abs(r.y - y) < h + 2); i++) y -= h + 3;
      b.style.top = y.toFixed(0) + "px"; boxes.push({ x, y, w });
    }
  }
  function close() { card.hidden = true; card.dataset.id = ""; }
  function open(id, from) {
    const c = learn.card(id); if (!c) return;
    const st = learn.stat(c.id), booked = learn.booked(c.id), inToday = learn.todayCards().some((x) => x.id === c.id);
    card.dataset.id = c.id;
    card.innerHTML = `<button class="ib sm nx" data-nclose aria-label="Đóng">${icon("close")}</button>
      <div class="nw"><b class="${c.lang}" data-nsay>${esc(c.w)}</b><button class="ib sm" data-nsay aria-label="Nghe">${icon("speaker")}</button></div>
      <p class="nph">${esc(c.ph || "")}${c.pos ? ` · ${esc(c.pos)}` : ""}</p><p class="nvi">${esc(c.vi)}</p>
      ${c.ex ? `<button class="nex ${c.lang}" data-nsayex>${esc(c.ex)} ${icon("speaker")}</button>${c.exPh ? `<p class="nexph">${esc(c.exPh)}</p>` : ""}<p class="nexvi">${esc(c.exVi || "")}</p>` : ""}
      <div class="nacts"><button class="btn sm${booked ? " on" : ""}" data-nstar>${icon("star")}${booked ? "Đã lưu" : "Lưu sổ"}</button>${st?.seen ? `<span class="nst">đang học</span>` : inToday ? `<span class="nst">có trong bài hôm nay</span>` : `<button class="btn sm pri" data-nadopt>＋ Học chữ này</button>`}</div>`;
    card.hidden = false;
    // đặt thẻ cạnh viên chữ, không lọt khỏi màn hình
    const r = from?.getBoundingClientRect?.() || { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0, bottom: innerHeight / 2 };
    const cw = card.offsetWidth, ch = card.offsetHeight, m = 10;
    let x = r.left + r.width / 2 - cw / 2, y = r.top - ch - 10; if (y < 60) y = r.bottom + 10;
    x = Math.max(m, Math.min(innerWidth - cw - m, x)); y = Math.max(56, Math.min(innerHeight - ch - 90, y));
    card.style.left = x + "px"; card.style.top = y + "px"; card.classList.remove("in"); void card.offsetWidth; card.classList.add("in");
    game.speakCard(c, false, true);
  }
  layer.addEventListener("pointerdown", (e) => e.stopPropagation());
  layer.addEventListener("click", (e) => { const b = e.target.closest(".npill"); if (b) open(b.dataset.nid, b); });
  card.addEventListener("pointerdown", (e) => e.stopPropagation());
  card.addEventListener("click", (e) => {
    const id = card.dataset.id, c = learn.card(id); if (!c) return;
    if (e.target.closest("[data-nclose]")) return close();
    if (e.target.closest("[data-nsay]")) return game.speakCard(c, false, true);
    if (e.target.closest("[data-nsayex]")) return game.speakCard(c, true, true);
    if (e.target.closest("[data-nstar]")) { if (learn.booked(id)) learn.unbook(id); else learn.bookmark(c, s.plan); game.persist(); return open(id, layer.querySelector(`[data-nid="${CSS.escape(id)}"]`)); }
    if (e.target.closest("[data-nadopt]")) { learn.adopt(id); game.wall?.whisper("Thêm vô bài hôm nay rồi. Bấm Học để học."); game.persist(); return open(id, layer.querySelector(`[data-nid="${CSS.escape(id)}"]`)); }
  });
  addEventListener("pointerdown", (e) => { if (!card.hidden && !card.contains(e.target) && !e.target.closest?.(".npill")) close(); }, true);

  const api = {
    get on() { return on; },
    toggle(v = !on) { on = v; s.settings.names = v; game.persist?.(); close(); render(); return on; },
    /** chạm vào cảnh: gần đồ vật nào thì hiện viên chữ nhỏ của nó (dù đang tắt nhãn) */
    tapAt(p) {
      let best = null, bd = 30;
      for (const o of OBJ) { const [x, y] = pos(o), [, y0] = Y.P(o.u, o.v, 0), d = Math.min(Math.hypot(x - p.x, y - p.y), Math.hypot(x - p.x, y0 - p.y)); if (d < bd && cardOf(o)) { bd = d; best = o; } }
      if (!best) return false;
      const c = cardOf(best); if (on) { const b = layer.querySelector(`[data-nid="${CSS.escape(c.id)}"]`); if (b) { open(c.id, b); return true; } }
      temp?.remove(); clearTimeout(tempT); temp = pill(best, c, "temp"); tempT = setTimeout(() => { temp?.remove(); temp = null; }, 6000);
      game.speakCard(c, false, false); return true;
    },
    render, close,
  };
  const prev = Y.onLayout; Y.onLayout = () => { prev?.(); render(); };
  game.on("lang", () => { close(); render(); });
  render();
  return api;
}
