// SỰ KIỆN BẤT NGỜ – bộ bài có độ hiếm. Mỗi 45–120 giây rút 1 lá (có lúc không có gì).
// Thêm sự kiện = thêm 1 mục vào EV: { id, vi, emo, rarity: "common" | "rare" | "epic", ok(), room(), run(room) }
import { ROOMS } from "./rooms.js";
import { rand, pick, clamp, dayKey } from "../core/util.js";
import * as snd from "../core/sound.js";

const W = { common: 1, rare: 0.3, epic: 0.08 };
const SVG = {
  bird: `<svg width="74" height="54" viewBox="0 0 46 34"><path d="M6 22 q10 -16 26 -10 l10 -6 l-4 10 q2 10 -10 14 q-14 4 -22 -8z" fill="#3a3a44"/><circle cx="33" cy="12" r="1.8" fill="#fff"/><path d="M14 18 q6 -12 14 -6" stroke="#55556a" stroke-width="3" fill="none"/><path d="M20 28 l-2 6 M26 28 l1 6" stroke="#3a3a44" stroke-width="2"/></svg>`,
  butterfly: `<svg width="60" height="50" viewBox="-22 -18 44 36"><path d="M0 0 C-8 -18 -24 -16 -18 -2 C-24 8 -10 14 0 2Z" fill="#F2A33A"/><path d="M0 0 C8 -18 24 -16 18 -2 C24 8 10 14 0 2Z" fill="#E8783A"/><circle cx="-12" cy="-6" r="3" fill="#fff" opacity=".8"/><circle cx="12" cy="-6" r="3" fill="#fff" opacity=".8"/><rect x="-1.5" y="-8" width="3" height="16" rx="1.5" fill="#3a2a20"/></svg>`,
  gecko: `<svg width="112" height="64" viewBox="0 0 70 40"><path d="M6 20 q10 -6 24 -3 q14 -4 22 2 q10 2 16 -6 q-2 10 -14 12 q-10 6 -26 4 q-14 2 -22 -9z" fill="#C9B79A"/><path d="M22 16 l-6 -10 M22 24 l-6 10 M40 16 l4 -10 M40 24 l4 10" stroke="#C9B79A" stroke-width="3" stroke-linecap="round"/><circle cx="10" cy="18" r="1.6" fill="#222"/></svg>`,
};

export function createEvents(game) {
  const { scene, brain, body: B, memory } = game;
  const T = () => game.today.traits, mood = () => game.today.mood.id, hr = () => scene.S.hour;
  const qf = (k) => game.quirks.reduce((v, q) => v * (q[k] || 1), 1);
  let critters = [];

  // ---------------------------------------------------------------- sinh vật nhỏ (chim, bướm, thạch sùng) – sống theo phòng, dựng lại khi đổi cảnh
  function critter(room, kind, x, y, z = 1, cls = "") {
    const c = { room, kind, x, y, z, cls, el: null, alive: true };
    c.mount = () => { if (!c.alive || scene.room !== room) return; c.el = document.createElement("div"); c.el.className = "critter " + cls; c.el.innerHTML = SVG[kind]; c.el.style.zIndex = z; c.place(0); scene.fx.appendChild(c.el); };
    c.place = (ms) => { if (!c.el) return; c.el.style.transition = ms ? `transform ${ms}ms cubic-bezier(.45,.05,.4,1), opacity .4s` : "none"; c.el.style.transform = `translate(${c.x}px, ${c.y}px) translate(-50%, -50%) scaleX(${c.flip || 1})`; };
    c.move = (x, y, ms) => { if (x < c.x) c.flip = -1; else if (x > c.x) c.flip = 1; c.x = x; c.y = y; c.place(ms); };
    c.kill = (ms = 400) => { c.alive = false; c.el?.classList.add("gone"); setTimeout(() => c.el?.remove(), ms); critters = critters.filter((k) => k !== c); };
    critters.push(c); c.mount(); return c;
  }
  game.on("room", () => critters.forEach((c) => { c.el?.remove(); c.el = null; c.mount(); }));
  const sayK = (k) => game.say(k);

  const EV = [
    { id: "bird", vi: "Chim đậu cửa sổ", emo: "🐦", rarity: "common", ok: () => hr() > 6 && hr() < 18, room: () => pick(["living", "bedroom"].filter(game.roomAllowed)),
      async run(room) {
        const p = room === "living" ? { x: 800, y: 438 } : { x: 520, y: 418 }; const c = critter(room, "bird", p.x + 140, p.y - 160, 1);
        setTimeout(() => c.move(p.x, p.y, 1400), 60);
        brain.interrupt(async () => {
          await brain.goSpot(room, "window"); sayK("bird"); game.meow(1); await B.act("crouch", 3500); await B.act("look_up", 1500);
          c.el?.classList.add("flap"); c.move(p.x + 260, p.y - 260, 1300); setTimeout(() => c.kill(), 1400);
          sayK("bird_gone"); await B.act("idle_tail", 3000);
        }, "bird");
        setTimeout(() => c.alive && c.kill(), 40000);
      } },
    { id: "butterfly", vi: "Bướm bay vào", emo: "🦋", rarity: "common", ok: () => hr() > 7 && hr() < 17 && game.roomAllowed("balcony"), room: () => "balcony",
      async run(room) {
        const c = critter(room, "butterfly", 300, 420, 3002, "flap"); let n = 0;
        const fly = setInterval(() => { if (!c.alive || n++ > 30) { clearInterval(fly); c.alive && c.kill(); return; } c.move(clamp(c.x + rand(-220, 220), 150, 1450), rand(470, 660), 1100); }, 1200);
        brain.interrupt(async () => {
          if (B.room !== room) await brain.goRoom(room, "walk"); await brain.down(); sayK("butterfly");
          for (let i = 0; i < 4 && c.alive; i++) {
            const tx = c.x, ty = clamp(c.y + 160, ROOMS[room].walk.y0, ROOMS[room].walk.y1);
            await B.walkTo(tx - Math.sign(tx - B.x) * 90, ty, { gait: "stalk" }); await B.act("crouch", 600);
            await B.jumpTo(tx, ty, 0, null, { apex: 170 }); memory.xp("hunter", 1);
          }
          clearInterval(fly); c.el?.classList.add("flap"); c.move(c.x + 400, 120, 1600); setTimeout(() => c.kill(), 1600);
          game.say("play"); await B.act("idle_tail", 2500);
        }, "butterfly");
      } },
    { id: "gecko", vi: "Thạch sùng trên tường", emo: "🦎", rarity: "rare", w: () => qf("gecko"), ok: () => hr() > 18.5 || hr() < 5, room: () => pick(["living", "kitchen", "bedroom", "bathroom"].filter(game.roomAllowed)),
      async run(room) {
        const R = ROOMS[room], x0 = rand(300, R.W - 300), c = critter(room, "gecko", x0, 240, 1);
        let alive = setInterval(() => c.alive && c.move(clamp(c.x + rand(-60, 60), 220, R.W - 220), clamp(c.y + rand(-30, 30), 160, 360), 1800), 2200);
        snd.chirp?.();
        brain.interrupt(async () => {
          if (B.room !== room) await brain.goRoom(room, "run"); await brain.down(); sayK("gecko");
          for (let i = 0; i < 3 && c.alive; i++) { await B.walkTo(clamp(c.x, R.walk.x0, R.walk.x1), R.walk.y0 + 10, { gait: "stalk" }); await B.act("look_up", 1400); await B.act("crouch", 500); await B.jumpTo(B.x + B.face * 10, B.y, 0, null, { apex: 200 + memory.level("hunter") * 25 }); memory.xp("hunter", 1); }
          clearInterval(alive); c.move(c.x + 300, 60, 900); setTimeout(() => c.kill(), 900); sayK("gecko_miss"); await B.act("look_up", 2500);
        }, "gecko");
      } },
    { id: "box", vi: "Thùng hàng mới", emo: "📦", rarity: "rare", w: () => qf("box") * (game.quirks.some((q) => q.id === "boxlover") ? 3 : 1), ok: () => game.save.house.box !== dayKey(), room: () => "living",
      async run() {
        game.save.house.box = dayKey(); if (scene.room === "living") scene.refreshDyn(); game.emit("toast", { text: "📦 Có thùng hàng giao tới phòng khách" });
        brain.interrupt(async () => { await brain.goSpot("living", "box", "run"); sayK("box"); await B.act("loaf", 20000); await B.act("sleep", 60000); }, "box");
      } },
    { id: "storm", vi: "Mưa giông", emo: "⛈️", rarity: "epic", w: () => { const m = new Date().getMonth() + 1; return m >= 5 && m <= 11 ? 2 : 0.6; }, ok: () => scene.S.weather !== "storm", room: () => null,
      async run() {
        scene.weather("storm"); const end = Date.now() + rand(90, 160) * 1000;
        const boom = () => { if (Date.now() > end) { scene.weather(null); B.wobble = 0; return; } scene.flash(); if (game.save.settings.sound) setTimeout(() => snd.thunder(), 300 + Math.random() * 900); setTimeout(boom, rand(9, 22) * 1000); };
        boom();
        brain.interrupt(async () => {
          sayK("storm"); const hide = game.quirks.some((q) => q.id === "bedhog") ? "bed" : "catbed";
          await brain.goSpot("bedroom", hide, "run"); B.wobble = 0.35; try { await B.act("sleep", Math.max(5000, end - Date.now())); } finally { B.wobble = 0; }
        }, "storm");
      } },
    { id: "phantom", vi: "Nhìn thấy… gì đó", emo: "👻", rarity: "rare", ok: () => hr() > 21 || hr() < 4, room: () => null,
      async run() {
        brain.interrupt(async () => {
          await brain.down(); B.faceTo(Math.random() < 0.5 ? 1 : -1); B.extraScale = 1.07; B.wobble = 0.25; sayK("phantom");
          try { await B.act("crouch", 3500); await B.act("look_up", 2000); } finally { B.extraScale = 1; B.wobble = 0; }
          const rooms = Object.keys(ROOMS).filter((r) => r !== B.room && game.roomAllowed(r)); await brain.goRoom(pick(rooms), "run");
        }, "phantom");
      } },
  ];

  function fire(id) {
    const e = EV.find((x) => x.id === id); if (!e) return; const room = e.room();
    const n = memory.seen(e.id); game.journal("event", `${e.emo} ${e.vi}`);
    if (n === 1 && e.rarity !== "common") game.emit("toast", { text: `✨ Lần đầu: ${e.emo} ${e.vi}` });
    e.run(room); setTimeout(() => game.moment?.(e.id), 9000);
  }
  let next = Date.now() + 25000;
  const api = { EV, fire, tick, paused: false };
  function tick() {
    if (api.paused || Date.now() < next || document.hidden) return; next = Date.now() + rand(45, 120) * 1000;
    if (["pet", "chase-laser", "chase-feather", "storm", "dock"].includes(brain.activity) || Math.random() < 0.35) return;
    const list = EV.filter((e) => e.ok() && (!e.room || e.room() !== undefined));
    if (!list.length) return;
    let tot = 0; const ws = list.map((e) => (tot += W[e.rarity] * (e.w ? e.w() : 1)));
    const k = Math.random() * tot; fire(list[ws.findIndex((w) => w >= k)].id);
  }
  return api;
}
