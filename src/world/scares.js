// HÙ DOẠ (jump scare) – nhẹ nhàng kiểu mèo: mắt trắng trong bóng tối, cúp điện, mặt mèo ló lên sát màn hình,
// bóng mèo khổng lồ trên tường, mèo lạ ngoài cửa sổ, tiếng rầm ở phòng khác, chạy rần rần lúc 3 giờ sáng.
// Mức: Cài đặt → "Hù doạ": Tắt / Nhẹ / Đủ đô. Người bật "giảm chuyển động" → tự tắt.
import { ROOMS } from "./rooms.js";
import { rand, pick, clamp, sleep } from "../core/util.js";
import * as snd from "../core/sound.js";

export function createScares(game, root) {
  const { scene, brain, body: B, R } = game;
  const s = game.save;
  const layer = document.createElement("div"); layer.className = "scare"; root.appendChild(layer);
  const hr = () => scene.S.hour, night = () => hr() >= 20.5 || hr() < 5.5;
  const watching = () => scene.room === B.room && !document.hidden;
  const idleFor = () => (Date.now() - (game.lastInput || 0)) / 1000;
  const level = () => (s.settings.reduced ? "off" : s.settings.scare || "full");
  const done = (id, text) => { game.emit("q", "scare"); game.moment?.(id, true); if (text) game.journal("scare", text); };
  const eyesEl = (cls = "") => { const e = document.createElement("div"); e.className = "eyes2 " + cls; e.innerHTML = "<i></i><i></i>"; return e; };

  const SC = [
    // 1) đang ngủ giữa đêm, bỗng MỞ MẮT TRẮNG nhìn thẳng, không nhúc nhích
    { id: "whiteeyes", soft: true, w: 1.4, ok: () => night() && watching() && brain.sleeping,
      async run() { B.eyeWhite = true; await sleep(rand(2600, 4200)); B.eyeWhite = false; done("whiteeyes", "👁️ Mở mắt trắng lúc nửa đêm"); } },
    // 2) cúp điện: tối om, 2 con mắt trắng ở đâu đó… chớp… rồi LAO thẳng vào màn hình
    { id: "blackout", soft: false, w: 1, ok: () => night() && watching() && !B.moving(),
      async run() {
        brain.interrupt(async () => {
          const dark = document.createElement("div"); dark.className = "blackout"; layer.appendChild(dark); if (s.settings.sound) snd.thunk?.();
          await sleep(500); B.hidden = true;
          const e = eyesEl(); e.style.left = rand(18, 82) + "%"; e.style.top = rand(55, 75) + "%"; layer.appendChild(e);
          await sleep(1400); e.classList.add("blink"); await sleep(900); e.classList.remove("blink"); await sleep(1100);
          e.classList.add("rush"); if (s.settings.sound) { snd.hiss(); snd.meow(1, 0.7); } await sleep(380);
          scene.flash(); dark.remove(); e.remove(); B.hidden = false;
          const S = scene.S, w = ROOMS[B.room].walk; await brain.down(); B.x = clamp(S.cam + S.viewW / 2, w.x0, w.x1); B.y = w.y1 - 20; B.face = Math.random() < 0.5 ? 1 : -1; B.faceShown = B.face;
          game.say("innocent"); await B.act("groom", 4000); await B.act("idle_tail", 3000);
          done("blackout", "🌑 Cúp điện… và đôi mắt");
        }, "scare");
      } },
    // 3) "ở phía sau bạn": mặt mèo khổng lồ ló lên từ mép dưới màn hình, mắt trắng
    { id: "peek", soft: false, w: 0.8, ok: () => idleFor() > 35 && R.kind === "vector" && (night() || Math.random() < 0.3),
      async run() {
        const p = document.createElement("div"); p.className = "peek"; p.innerHTML = R.snapshot("lookup", "classic", { eye: "#F4F7FF", flip: Math.random() < 0.5 }); layer.appendChild(p);
        requestAnimationFrame(() => p.classList.add("up")); if (s.settings.sound) setTimeout(() => snd.meow(1, 0.62), 380);
        await sleep(2300); p.classList.remove("up"); p.classList.add("down"); await sleep(700); p.remove();
        if (!watching()) game.emit("toast", { text: `…${game.cat.name} đang ở ${ROOMS[B.room].vi} cơ mà?` });
        done("peek", "😼 Ló mặt sát màn hình");
      } },
    // 4) bóng mèo khổng lồ lướt trên tường khi đi ngang cây đèn
    { id: "shadow", soft: true, w: 1.1, ok: () => night() && watching() && R.kind === "vector" && (ROOMS[B.room].lights || []).some((l) => !l.day),
      async run() {
        const L = ROOMS[B.room].lights.find((l) => !l.day), w = ROOMS[B.room].walk, ref = R.el.querySelector(".bd");
        ref.id ||= "catbd-live"; const sh = document.createElement("div"); sh.className = "wallshadow";
        sh.innerHTML = `<svg viewBox="-200 -262 400 272"><use href="#${ref.id}"/></svg>`; scene.fx.appendChild(sh);
        let on = true; const follow = () => { if (!on) return; const d = Math.abs(B.x - L.x), k = clamp(4.4 - d / 420, 1.4, 4.2), x = B.x + (B.x - L.x) * 0.45; sh.style.transform = `translate(${x}px, 600px) scale(${k * B.faceShown}, ${k}) translate(-50%, -100%)`; requestAnimationFrame(follow); };
        follow(); requestAnimationFrame(() => sh.classList.add("on"));
        brain.interrupt(async () => {
          await brain.down(); const side = L.x < (w.x0 + w.x1) / 2 ? -1 : 1, from = clamp(L.x - side * 620, w.x0, w.x1), to = clamp(L.x - side * 90, w.x0, w.x1);
          await B.walkTo(from, w.y0 + 8); await B.walkTo(to, w.y0 + 8, { gait: "stalk" });
          sh.classList.remove("on"); await sleep(900); on = false; sh.remove(); await B.act("loaf", 3000);
          done("shadow", "👤 Bóng mèo khổng lồ trên tường");
        }, "scare");
        setTimeout(() => { if (on) { on = false; sh.remove(); } }, 60000);
      } },
    // 5) mèo lạ ngoài cửa sổ – chỉ thấy 2 con mắt
    { id: "stranger", soft: true, w: 0.9, ok: () => night() && ["living", "bedroom", "kitchen"].includes(scene.room),
      async run() {
        const pos = { living: [640, 330], bedroom: [450, 330], kitchen: [730, 210] }[scene.room]; const room = scene.room;
        const e = eyesEl("instage"); e.style.left = pos[0] + "px"; e.style.top = pos[1] + "px"; scene.fx.appendChild(e);
        await sleep(1800); e.classList.add("blink"); await sleep(700); e.classList.remove("blink");
        if (B.room === room) brain.interrupt(async () => { await brain.goSpot(room, "window"); game.say("stranger"); if (s.settings.sound) snd.hiss(); B.extraScale = 1.06; try { await B.act("crouch", 2200); } finally { B.extraScale = 1; } e.remove(); await B.act("idle_tail", 3000); }, "scare");
        await sleep(6000); e.classList.add("gone"); setTimeout(() => e.remove(), 600);
        done("stranger", "👀 Mèo lạ ngoài cửa sổ");
      } },
    // 6) RẦM! ở phòng khác
    { id: "crash", soft: true, w: 0.7, ok: () => !watching() && B.room !== scene.room,
      async run() {
        if (s.settings.sound) snd.thunk?.(); layer.classList.add("shake"); setTimeout(() => layer.classList.remove("shake"), 500); document.getElementById("app")?.classList.add("shake"); setTimeout(() => document.getElementById("app")?.classList.remove("shake"), 500);
        const r = ROOMS[B.room]; game.emit("toast", { text: `💥 RẦM! Có tiếng gì ở ${r.icon} ${r.vi}…`, act: "Xem", fn: () => game.followCat(true) });
        if (B.room === "kitchen" && s.house.cup !== "broken") game.knockCup(); done("crash", `💥 Tiếng rầm ở ${r.vi}`);
      } },
    // 7) 3 giờ sáng: phóng ngang màn hình trong bóng tối, chỉ thấy mắt
    { id: "dash", soft: false, w: 0.8, ok: () => (hr() >= 1 && hr() < 5) || (night() && Math.random() < 0.4),
      async run() {
        brain.interrupt(async () => {
          if (B.room !== scene.room) await brain.goRoom(scene.room, "walk"); await brain.down();
          const S = scene.S, w = ROOMS[B.room].walk, l = clamp(S.cam + 60, w.x0, w.x1), r = clamp(S.cam + S.viewW - 60, w.x0, w.x1);
          await B.walkTo(B.x < (l + r) / 2 ? l : r, w.y1 - 10); await B.act("crouch", 900); B.eyeWhite = true;
          if (s.settings.sound) snd.thunk?.();
          try { await B.walkTo(B.x < (l + r) / 2 ? r : l, w.y1 - 6, { gait: "run", speed: 1500 }); } finally { B.eyeWhite = false; }
          await B.act("loaf", 2500); game.say("innocent"); done("dash", "🌀 Phóng ngang lúc 3 giờ sáng");
        }, "scare");
      } },
  ];

  let next = Date.now() + 70000;
  const api = {
    SC, layer, paused: false,
    fire(id) { const sc = SC.find((x) => x.id === id); if (sc) sc.run(); },
    tick() {
      const lv = level(); if (lv === "off" || api.paused || Date.now() < next || document.hidden) return;
      next = Date.now() + rand(50, 140) * 1000 * (night() ? 1 : 2.5);
      if (["pet", "chase-laser", "chase-feather", "scare", "dock", "storm"].includes(brain.activity)) return;
      if (Math.random() > (lv === "full" ? (night() ? 0.6 : 0.2) : night() ? 0.3 : 0.08)) return;
      const list = SC.filter((x) => (lv === "full" || x.soft) && x.ok()); if (!list.length) return;
      let tot = 0; const ws = list.map((x) => (tot += x.w)), k = Math.random() * tot;
      list[ws.findIndex((v) => v >= k)].run();
    },
  };
  return api;
}
