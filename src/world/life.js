// ĐỜI THƯỜNG CỦA MÈO: lâu lâu mèo bày một trò trong nhà / ngoài vườn – kéo khăn rớt, chôm vớ, xô ly nước,
// ngồi lên điện thoại, nằm lên tờ báo… Mỗi trò hiện chữ của đồ vật + hành động theo tiếng đang học (Anh / Trung / Nhật)
// và một câu lẫy. Đồ bày ra nằm đó, chạm vào là "nhặt lên" (cũng ra chữ).
// Thêm: KIỂM TRA BẤT NGỜ – mèo chạy tới hỏi 1 chữ học hôm qua; không nhớ thì mèo mửa ra cục lông.
import { SCENE } from "./play.js";
import { rand, pick, dayKey } from "../core/util.js";

const INK = "#262626", INK2 = "#5c5c5c", INK3 = "#9a9a9a", WHITE = "#FBFAF6";
const HOUSE_SPOTS = [[70, 22], [80, 20], [76, 13], [86, 16], [94, 10]], GARDEN_SPOTS = [[40, 38], [22, 39], [55, 61], [31, 21], [14, 52], [46, 20]];

Object.assign(SCENE, {
  life_towel: { en: ["towel", "pick up"], zh: ["毛巾", "捡起来"], ja: ["タオル", "拾う"] },
  life_teeth: { en: ["toothbrush", "brush your teeth"], zh: ["牙刷", "刷牙"], ja: ["歯ブラシ", "歯を磨く"] },
  life_cup: { en: ["cup", "spill"], zh: ["杯子", "洒"], ja: ["コップ", "こぼす"] },
  life_sock: { en: ["sock", "steal"], zh: ["袜子", "偷"], ja: ["靴下", "盗む"] },
  life_slipper: { en: ["slippers"], zh: ["拖鞋"], ja: ["スリッパ"] },
  life_box: { en: ["box"], zh: ["纸箱"], ja: ["段ボール"] },
  life_bowl: { en: ["bowl", "starving"], zh: ["碗", "饿死了"], ja: ["お皿", "お腹ぺこぺこ"] },
  life_phone: { en: ["phone", "scroll"], zh: ["手机", "刷手机"], ja: ["スマホ", "ダラダラ"] },
  life_paper: { en: ["newspaper"], zh: ["报纸"], ja: ["新聞"] },
  life_alarm: { en: ["alarm clock", "wake up"], zh: ["闹钟", "赖床"], ja: ["目覚まし時計", "寝坊"] },
  life_pillow: { en: ["pillow", "blanket"], zh: ["枕头", "毯子"], ja: ["枕", "毛布"] },
  life_keys: { en: ["keys", "lose", "drop"], zh: ["钥匙", "丢"], ja: ["鍵", "なくす"] },
  life_umbrella: { en: ["umbrella"], zh: ["雨伞"], ja: ["傘"] },
  life_hairball: { en: ["hairball", "throw up"], zh: ["毛球", "吐"], ja: ["毛玉", "吐く"] },
  life_pickup: { en: ["pick up"], zh: ["捡起来"], ja: ["拾う"] },
});

// ------------------------------------------------------------------ đồ vật (nét bút, toạ độ màn hình từ chân đồ vật; u = 1 đơn vị sân)
const S = (u) => ({ s: `stroke="${INK}" stroke-width="${Math.max(1, u * 0.32).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"` });
const PROPS = {
  towel: (x, y, u, st) => `<path d="M${x - 2.6 * u} ${y} q${1.2 * u} ${-1.6 * u} ${2.4 * u} ${-0.4 * u} q${1.4 * u} ${-1.2 * u} ${2.8 * u} ${0.2 * u} l${-0.6 * u} ${0.9 * u} q${-2.4 * u} ${0.6 * u} ${-4.6 * u} ${-0.7 * u}z" fill="${WHITE}" ${S(u).s}/><path d="M${x - 1.4 * u} ${y - 0.6 * u} l${2.6 * u} ${0.1 * u} M${x - 1 * u} ${y - 0.2 * u} l${2 * u} 0" stroke="${INK3}" stroke-width="1"/>`,
  toothbrush: (x, y, u) => `<g transform="rotate(-14 ${x} ${y})"><rect x="${x - 2.4 * u}" y="${y - 0.5 * u}" width="${4 * u}" height="${0.5 * u}" rx="${0.25 * u}" fill="${WHITE}" ${S(u).s}/><rect x="${x + 1.2 * u}" y="${y - 1.2 * u}" width="${1.2 * u}" height="${0.7 * u}" fill="${INK3}" ${S(u).s}/></g>`,
  cup: (x, y, u, st) => st === "spilled" ? `<ellipse cx="${x + 1.6 * u}" cy="${y + 0.2 * u}" rx="${2.6 * u}" ry="${0.8 * u}" fill="${INK3}" opacity=".5"/><g transform="rotate(84 ${x} ${y})"><path d="M${x - 0.9 * u} ${y - 2 * u} h${1.8 * u} l${-0.3 * u} ${2 * u} h${-1.2 * u}z" fill="${WHITE}" ${S(u).s}/></g>` : `<path d="M${x - 0.9 * u} ${y - 2 * u} h${1.8 * u} l${-0.3 * u} ${2 * u} h${-1.2 * u}z" fill="${WHITE}" ${S(u).s}/><path d="M${x - 0.7 * u} ${y - 1.4 * u} h${1.4 * u}" stroke="${INK3}" stroke-width="1"/>`,
  sock: (x, y, u) => `<path d="M${x - 0.6 * u} ${y - 2.2 * u} h${1.3 * u} v${1.5 * u} q${0.2 * u} ${0.5 * u} ${1.2 * u} ${0.5 * u} q${0.5 * u} ${0.2 * u} 0 ${0.8 * u} h${-1.9 * u} q${-0.6 * u} 0 ${-0.6 * u} ${-0.6 * u}z" fill="${WHITE}" ${S(u).s}/><path d="M${x - 0.6 * u} ${y - 1.8 * u} h${1.3 * u}" stroke="${INK2}" stroke-width="1.4"/>`,
  slippers: (x, y, u) => [-1.2, 1.2].map((d) => `<ellipse cx="${x + d * u}" cy="${y}" rx="${0.9 * u}" ry="${0.5 * u}" fill="${WHITE}" ${S(u).s}/><path d="M${x + (d - 0.7) * u} ${y - 0.1 * u} q${0.7 * u} ${-0.7 * u} ${1.4 * u} 0" fill="${INK3}" ${S(u).s}/>`).join(""),
  boxBack: (x, y, u) => `<path d="M${x - 2.6 * u} ${y - 1 * u} l${0.6 * u} ${-2.4 * u} h${4 * u} l${0.6 * u} ${2.4 * u}" fill="${INK3}" ${S(u).s}/>`,
  boxFront: (x, y, u) => `<path d="M${x - 2.6 * u} ${y - 2.6 * u} h${5.2 * u} v${2.6 * u} h${-5.2 * u}z" fill="#d9d2c3" ${S(u).s}/><path d="M${x - 2.6 * u} ${y - 2.6 * u} l${-0.9 * u} ${-1 * u} M${x + 2.6 * u} ${y - 2.6 * u} l${0.9 * u} ${-1 * u}" ${S(u).s}/><path d="M${x - 1.6 * u} ${y - 1.4 * u} h${3.2 * u}" stroke="${INK3}" stroke-width="1" stroke-dasharray="3 2"/>`,
  bowl: (x, y, u) => `<path d="M${x - 1.5 * u} ${y - 0.9 * u} q${1.5 * u} ${1.6 * u} ${3 * u} 0z" fill="${WHITE}" ${S(u).s}/><ellipse cx="${x}" cy="${y - 0.9 * u}" rx="${1.5 * u}" ry="${0.35 * u}" fill="${INK3}" ${S(u).s}/>`,
  phone: (x, y, u) => `<g transform="rotate(-8 ${x} ${y})"><rect x="${x - 1 * u}" y="${y - 0.6 * u}" width="${2 * u}" height="${0.9 * u}" rx="${0.2 * u}" fill="${INK}" ${S(u).s}/><rect x="${x - 0.8 * u}" y="${y - 0.48 * u}" width="${1.6 * u}" height="${0.66 * u}" rx="${0.1 * u}" fill="${INK2}"/></g>`,
  paper: (x, y, u) => `<path d="M${x - 2.4 * u} ${y - 0.3 * u} l${0.6 * u} ${-1.2 * u} h${4 * u} l${-0.4 * u} ${1.4 * u}z" fill="${WHITE}" ${S(u).s}/>${[0, 1, 2].map((i) => `<path d="M${x - 1.6 * u + i * 0.15 * u} ${y - (1.1 - i * 0.3) * u} h${2.6 * u}" stroke="${INK3}" stroke-width="1"/>`).join("")}`,
  alarm: (x, y, u, st) => `<g transform="rotate(${st === "down" ? 70 : 0} ${x} ${y})"><circle cx="${x}" cy="${y - 1.2 * u}" r="${1.1 * u}" fill="${WHITE}" ${S(u).s}/><path d="M${x} ${y - 1.2 * u} v${-0.6 * u} M${x} ${y - 1.2 * u} l${0.45 * u} ${0.2 * u}" ${S(u).s}/><circle cx="${x - 0.9 * u}" cy="${y - 2.2 * u}" r="${0.4 * u}" fill="${INK3}" ${S(u).s}/><circle cx="${x + 0.9 * u}" cy="${y - 2.2 * u}" r="${0.4 * u}" fill="${INK3}" ${S(u).s}/></g>`,
  pillow: (x, y, u) => `<path d="M${x - 2.4 * u} ${y - 0.2 * u} q${-0.4 * u} ${-1.2 * u} 0 ${-1.6 * u} q${2.4 * u} ${-0.5 * u} ${4.8 * u} 0 q${0.4 * u} ${0.4 * u} 0 ${1.6 * u} q${-2.4 * u} ${0.5 * u} ${-4.8 * u} 0z" fill="${WHITE}" ${S(u).s}/>`,
  keys: (x, y, u) => `<circle cx="${x}" cy="${y - 0.4 * u}" r="${0.45 * u}" fill="none" ${S(u).s}/><path d="M${x + 0.3 * u} ${y - 0.2 * u} l${1.3 * u} ${0.3 * u} m${-0.4 * u} ${-0.1 * u} v${0.4 * u} M${x - 0.3 * u} ${y - 0.1 * u} l${-0.9 * u} ${0.6 * u}" ${S(u).s}/>`,
  umbrella: (x, y, u) => `<path d="M${x - 3.2 * u} ${y - 5.4 * u} q${3.2 * u} ${-3 * u} ${6.4 * u} 0 q${-0.8 * u} ${-0.5 * u} ${-1.6 * u} 0 q${-0.8 * u} ${-0.5 * u} ${-1.6 * u} 0 q${-0.8 * u} ${-0.5 * u} ${-1.6 * u} 0 q${-0.8 * u} ${-0.5 * u} ${-1.6 * u} 0z" fill="${INK2}" ${S(u).s}/><path d="M${x} ${y - 7.2 * u} v${7 * u} q0 ${0.6 * u} ${-0.6 * u} ${0.5 * u}" fill="none" ${S(u).s}/>`,
  hairball: (x, y, u) => `<path d="M${x - 0.9 * u} ${y - 0.3 * u} q${0.2 * u} ${-1 * u} ${0.9 * u} ${-0.9 * u} q${0.8 * u} ${-0.2 * u} ${0.9 * u} ${0.6 * u} q${0.1 * u} ${0.6 * u} ${-0.8 * u} ${0.6 * u} q${-0.9 * u} 0 ${-1 * u} ${-0.3 * u}z" fill="${INK2}" ${S(u).s}/><path d="M${x - 0.5 * u} ${y - 0.6 * u} q${0.5 * u} ${-0.3 * u} ${0.9 * u} ${0.1 * u} M${x - 0.3 * u} ${y - 0.3 * u} q${0.4 * u} ${-0.2 * u} ${0.7 * u} 0" stroke="${INK3}" stroke-width="1" fill="none"/><ellipse cx="${x + 0.9 * u}" cy="${y + 0.1 * u}" rx="${1.2 * u}" ry="${0.35 * u}" fill="${INK3}" opacity=".35"/>`,
};

export function createLife(game) {
  const s = game.save, Y = game.yard, B = game.body;
  const layer = document.createElement("div"); layer.className = "life"; Y.actors.appendChild(layer);
  let items = [];      // { id, kind, u, v, st, dz, until, tap, el }
  function put(kind, u, v, o = {}) {
    const it = { id: Math.random().toString(36).slice(2, 7), kind, u, v, st: o.st || "", dz: o.dz || 0, until: Date.now() + (o.ms || 90e3), tap: o.tap, drop: o.drop };
    it.el = document.createElement("div"); it.el.className = "seat lifeprop" + (o.drop ? " drop-in" : ""); layer.appendChild(it.el); items.push(it); draw(it); return it;
  }
  function draw(it) { const [x, y] = Y.P(it.u, it.v), u = Y.S.k * 1.1; it.el.style.zIndex = Math.round(y) + it.dz; it.el.innerHTML = `<svg class="spr" viewBox="0 0 ${Y.S.vw} ${Y.S.vh}">${PROPS[it.kind](x, y, u, it.st)}</svg>`; }
  function remove(it) { it.el.classList.add("gone"); setTimeout(() => it.el.remove(), 350); items = items.filter((x) => x !== it); }
  const redrawAll = () => items.forEach(draw);
  const prevLayout = Y.onLayout; Y.onLayout = () => { prevLayout?.(); redrawAll(); };
  setInterval(() => { const now = Date.now(); for (const it of [...items]) if (it.until < now) remove(it); }, 5000);

  const word = (k) => game.play?.sceneWord(k, true);
  const nearCat = (du = 2.4, dv = 0.6) => { const p = Y.unP(B.x, B.y); return [Math.min(97, Math.max(3, p.u + du * (B.face || 1))), Math.min(62, Math.max(2, p.v + dv))]; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const raining = () => !!game.weather?.raining;

  // ------------------------------------------------------------------ các trò
  const PLAYS = [
    { k: "towel", where: "garden", dry: 1, async run(h) { await B.act("look_up", 900); await B.act("play_yarn", 1600); const [u, v] = nearCat(); put("towel", u, v, { drop: 1, ms: 180e3, tap: pickUp("towel") }); word("life_towel"); h.say("life_towel"); await B.act("idle_tail", 3000); } },
    { k: "teeth", where: "house", async run(h) { const [u, v] = nearCat(); put("toothbrush", u, v, { ms: 90e3, tap: pickUp("teeth") }); await B.act("look_up", 1200); word("life_teeth"); h.say("life_teeth"); await B.act("lick_lip", 1500); await B.act("groom", 3000); } },
    { k: "cup", where: "house", async run(h) { const [u, v] = nearCat(); const c = put("cup", u, v, { ms: 150e3, tap: pickUp("cup") }); await B.act("look_up", 900); await B.act("play_yarn", 900); c.st = "spilled"; draw(c); game.buzz?.(10); word("life_cup"); h.say("life_cup"); await B.act("idle_tail", 2600); } },
    { k: "sock", where: "any", async run(h) { const [u, v] = nearCat(1.8, 0.4); put("sock", u, v, { drop: 1, ms: 150e3, tap: pickUp("sock") }); await B.act("gift_drop", 1200); word("life_sock"); h.say("life_sock"); await B.act("loaf", 4000); } },
    { k: "slipper", where: "house", async run(h) { const p = Y.unP(B.x, B.y); put("slippers", p.u, p.v + 0.2, { dz: -3, ms: 60e3 }); word("life_slipper"); h.say("life_slipper"); await B.act("sleep", rand(7, 11) * 1000); } },
    { k: "box", where: "any", async run(h) { const p = Y.unP(B.x, B.y); put("boxBack", p.u, p.v - 0.2, { dz: -3, ms: 40e3 }); put("boxFront", p.u, p.v + 0.4, { dz: 3, ms: 40e3 }); await sleep(300); word("life_box"); h.say("life_box"); await B.act("loaf", rand(9, 14) * 1000); } },
    { k: "bowl", where: "house", async run(h) { const [u, v] = nearCat(); put("bowl", u, v, { ms: 60e3 }); await B.act("look_up", 1400); await B.act("chirp", 900); word("life_bowl"); h.say("life_bowl"); await B.act("idle_tail", 3000); } },
    { k: "phone", where: "house", async run(h) { const p = Y.unP(B.x, B.y); put("phone", p.u, p.v + 0.3, { dz: -3, ms: 45e3 }); word("life_phone"); h.say("life_phone"); await B.act("loaf", rand(8, 12) * 1000); } },
    { k: "paper", where: "house", async run(h) { const p = Y.unP(B.x, B.y); put("paper", p.u, p.v + 0.3, { dz: -3, ms: 60e3 }); word("life_paper"); h.say("life_paper"); await B.act("lie", rand(8, 12) * 1000); } },
    { k: "alarm", where: "house", async run(h) { const [u, v] = nearCat(); const c = put("alarm", u, v, { ms: 90e3, tap: pickUp("alarm") }); await B.act("look_up", 1000); await B.act("play_yarn", 800); c.st = "down"; draw(c); game.buzz?.(12); word("life_alarm"); h.say("life_alarm"); await B.act("idle_tail", 2400); } },
    { k: "pillow", where: "house", async run(h) { const p = Y.unP(B.x, B.y); put("pillow", p.u, p.v + 0.3, { dz: -3, ms: 60e3 }); word("life_pillow"); h.say("life_pillow"); await B.act("knead", 4000); await B.act("sleep", rand(6, 9) * 1000); } },
    { k: "keys", where: "any", async run(h) { const [u, v] = nearCat(); const c = put("keys", u, v, { ms: 150e3, tap: pickUp("keys") }); await B.act("play_yarn", 1200); c.u = Math.min(97, c.u + 2.2 * (B.face || 1)); draw(c); word("life_keys"); h.say("life_keys"); await B.act("loaf", 3500); } },
    { k: "umbrella", where: "garden", rain: 1, async run(h) { const p = Y.unP(B.x, B.y); put("umbrella", p.u + 0.6, p.v + 0.5, { dz: 4, ms: 40e3 }); word("life_umbrella"); h.say("life_umbrella"); await B.act("loaf", rand(10, 14) * 1000); } },
  ];
  function pickUp(k) { return (it) => { remove(it); word("life_pickup"); game.jab?.("life_picked", {}, true); game.buzz?.(8); }; }

  // ------------------------------------------------------------------ kiểm tra bất ngờ chữ hôm qua → không nhớ thì mửa
  function yesterdayWords() {
    const y = new Date(); y.setDate(y.getDate() - 1); const yd = dayKey(y), L = game.learn;
    return Object.entries(L.L.cards).filter(([id, c]) => (c.seen && dayKey(new Date(c.seen)) === yd) || (c.last && dayKey(new Date(c.last)) === yd)).map(([id]) => L.card(id)).filter((c) => c && c.lang === L.lang && c.vi);
  }
  function waitAnswer(id, ms) {
    return new Promise((res) => {
      let done = false, wrong = false; const offs = [], t0 = Date.now();
      const fin = (v) => { if (done) return; done = true; offs.forEach((f) => f?.()); clearInterval(iv); res(v); };
      offs.push(game.on("learn", (e) => { if (e.type === "answer" && e.id === id) { if (e.ok) fin(true); else wrong = true; } }));
      offs.push(game.on("quiz-skip", (sid) => { if (!sid || sid === id) fin(false); }));
      // sai thì app cho làm lại: chờ tới khi hết đố (không còn ở chế độ đố) rồi mới chốt
      const iv = setInterval(() => { const m = game.wall?.mode; if ((wrong && m !== "quiz" && m !== "result") || Date.now() - t0 > ms) fin(wrong ? false : null); }, 500);
    });
  }
  async function hairball(h, w) {
    await B.act("crouch", 900); await B.act("lick_lip", 700); const [u, v] = nearCat(1.6, 0.8);
    put("hairball", u, v, { drop: 1, ms: 240e3, tap: (it) => { remove(it); word("life_pickup"); game.jab?.("life_cleaned", {}, true); } });
    game.buzz?.([20, 50, 20]); word("life_hairball"); h.say("ambush_fail", { w }); await B.act("groom", 2500);
  }

  function acts(h) {
    const { goUV, cool, used, T } = h;
    const spotFor = (w) => pick(w === "house" ? HOUSE_SPOTS : w === "garden" ? GARDEN_SPOTS : [...HOUSE_SPOTS, ...GARDEN_SPOTS]);
    const life = PLAYS.map((P) => ({ id: "life_" + P.k,
      score: () => (s.onboarded && cool("life", 3) && cool("life_" + P.k, 25) && (P.rain ? raining() : !(P.dry && raining())) ? 0.16 + T().playful * 0.18 + T().curious * 0.12 + (P.rain ? 0.3 : 0) : 0),
      async run() { used("life"); used("life_" + P.k); const [u, v] = raining() && P.where !== "house" && !P.rain ? pick(HOUSE_SPOTS) : spotFor(P.where); await goUV(u + rand(-1.5, 1.5), v + rand(-1, 1)); await P.run(h); } }));
    const ambush = { id: "ambush",
      score: () => (s.onboarded && game.attention?.() && game.wall?.mode === "ambient" && cool("ambush", 120) && yesterdayWords().length ? 1.1 : 0),
      async run() {
        used("ambush"); const c = pick(yesterdayWords()); if (!c) return;
        await h.comeTo?.(); await B.act("look_up", 700); h.say("ambush_ask", { w: c.w });
        game.wall?.quiz(c, "cat"); const ok = await waitAnswer(c.id, 45000);
        if (ok) { h.say("ambush_ok"); await B.act("idle_tail", 2500); } else await hairball(h, c.w);
      } };
    return [...life, ambush];
  }
  function tap(p) {
    for (const it of items) { if (!it.tap) continue; const [x, y] = Y.P(it.u, it.v), r = Math.max(22, Y.S.k * 4); if (Math.hypot(p.x - x, p.y - (y - Y.S.k)) < r) { it.tap(it); return true; } }
    return false;
  }
  return { acts, tap, put, hairball, get items() { return items; } };
}
