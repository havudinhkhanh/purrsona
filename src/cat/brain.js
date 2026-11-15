// BỘ NÃO: chọn việc tiếp theo theo nhu cầu + tính cách hôm nay + giờ trong ngày, rồi tự đi tới đúng phòng / đúng chỗ.
// Mỗi hoạt động = { id, score(ctx) → số, run(ctx) async }. Thêm hoạt động mới = thêm 1 mục vào ACTS.
import { ROOMS, route } from "../world/rooms.js";
import { CANCEL } from "./body.js";
import { clamp, rand, pick, weighted } from "../core/util.js";

const W = (r) => ROOMS[r].walk;
const randFloor = (r) => { const w = W(r); return { x: rand(w.x0 + 80, w.x1 - 80), y: rand(w.y0 + 10, w.y1 - 10) }; };

export function createBrain(game) {
  const { body: B } = game;
  const st = { cur: null, since: 0, lastPotty: Date.now() - 2 * 3600e3, busyUntil: 0, interrupt: null, alive: true, lastRoomChange: 0 };
  const N = () => game.save.cat.needs;
  const T = () => game.today.traits;
  const mood = () => game.today.mood.id;
  const say = (k, room) => game.say(k, room);
  const SP = (r) => game.spotsOf(r);
  const qmod = (id) => game.quirks.reduce((v, q) => v * ((q.mod || {})[id] || 1), 1);
  const allowed = (r) => game.roomAllowed(r);
  // hồi chiêu lưu trong save – mở lại app không bị "dụi đầu" liên tục
  const cd = () => (game.save.cd ||= {});
  const cool = (k, min) => Date.now() - (cd()[k] || 0) > min * 60e3;
  const used = (k) => { cd()[k] = Date.now(); };
  const at = (tier) => game.bond?.at(tier);
  const att = () => game.attention?.();
  const idleS = () => (Date.now() - (game.lastInput || Date.now())) / 1000;

  // ------------------------------------------------------------------ di chuyển cấp cao
  async function down() { if (B.h > 0) { const w = W(B.room); await B.jumpTo(clamp(B.x + (B.face > 0 ? 120 : -120), w.x0, w.x1), clamp(B.y + 36, w.y0, w.y1), 0, null); } }
  async function goRoom(to, gait) {
    const path = route(B.room, to, allowed); if (!path) return false;
    for (const step of path) {
      await down();
      const R = ROOMS[step.room], ex = step.side === "left" ? 100 : R.W - 100, ey = R.walk.y0 + 18;
      await B.walkTo(ex, ey, { gait });
      await B.walkTo(step.side === "left" ? -90 : R.W + 90, ey + 4, { gait });
      const N2 = ROOMS[step.to], enterLeft = step.side === "right";      // ra cửa phải → vào phòng mới từ mép trái
      await game.moveCat(step.to, enterLeft ? -90 : N2.W + 90, N2.walk.y0 + 22, enterLeft ? 1 : -1);
      await B.walkTo(enterLeft ? 200 : N2.W - 200, N2.walk.y0 + 40, { gait });
      say("enter", step.to); st.lastRoomChange = Date.now();
    }
    return true;
  }
  async function goSpot(room, id, gait) {
    const sp = SP(room)[id]; if (!sp) return null;
    if (B.room !== room) { if (!(await goRoom(room, gait))) return null; }
    if (B.h > 0 && B.z === sp.z && Math.abs(B.x - sp.x) < 40) return sp;
    await down();
    const w = W(room);
    if (sp.h > 0) {
      const side = B.x < sp.x ? -1 : 1, ax = clamp(sp.x + side * 130, w.x0, w.x1), ay = clamp(Math.max(sp.y + 34, w.y0), w.y0, w.y1);
      await B.walkTo(ax, ay, { gait }); await B.jumpTo(sp.x, sp.y, sp.h, sp.z); game.memory.xp("climber", sp.h > 300 ? 2 : 1);
    } else await B.walkTo(sp.x, clamp(sp.y, w.y0, w.y1), { gait });
    if (sp.face) B.faceTo(sp.face);
    game.moment?.("spot:" + id);
    return sp;
  }
  const gaitFor = () => (mood() === "zoomie" && Math.random() < 0.15 ? "run" : "walk");      // đủng đỉnh: hầu như chỉ đi bộ
  const spotsWith = (use, rooms = Object.keys(ROOMS)) => rooms.filter(allowed).flatMap((r) => Object.entries(SP(r)).filter(([, s]) => s.use.includes(use) && (!s.day || game.scene.S.day) && (!s.minClimb || game.memory.level("climber") >= s.minClimb)).map(([id, s]) => ({ room: r, id, s })));
  const near = (c) => (c.room === B.room ? 1.6 : 1) * (c.id === game.today.spot ? 2.2 : 1) * (c.id === game.obsession.spot ? 3 : 1) * game.quirks.reduce((v, q) => v * ((q.spot || {})[c.id] || 1), 1);

  // ------------------------------------------------------------------ hoạt động
  const ACTS = [
    { id: "eat", score: () => (game.save.house.bowl ? (100 - N().hunger) / 100 : 0) * 2.2 * (0.6 + T().greedy),
      async run() { await goSpot("kitchen", "bowl", N().hunger < 18 ? "run" : "walk"); await B.act("eat", rand(6, 9) * 1000); game.ate(); await B.act("lick_lip", 2200); say("eat"); await B.act("groom", 4000); } },
    { id: "beg", score: () => { const fh = game.memory.usualFeedHour(), lv = game.memory.level("mealtime"), clock = fh != null && lv >= 2 && Math.abs(game.scene.S.hour - fh) < 0.6 ? 0.8 + lv * 0.3 : 0; return game.save.house.bowl ? 0 : ((N().hunger < 45 ? (60 - N().hunger) / 30 : 0) + clock) * (0.5 + T().greedy); },
      async run() { await goSpot("kitchen", "mat"); for (let i = 0; i < 3; i++) { await B.act("look_up", 2500); say("hungry"); game.meow(1); await B.act("idle_tail", 4000); if (game.save.house.bowl) return; } } },
    { id: "nap", score: () => { const h = game.scene.S.hour, sleepyHour = (h > 11 && h < 16) || h > 23 || h < 5 ? 0.5 : 0; return ((100 - N().energy) / 100) * 1.6 + T().lazy * 0.6 + sleepyHour + (mood() === "sleepy" ? 0.6 : 0); },
      async run() {
        const pb = planNow(), pc = pb?.act === "nap" && pb.spot && SP(pb.room)?.[pb.spot] && allowed(pb.room) ? { room: pb.room, id: pb.spot } : null;
        const c = pc || weighted(spotsWith("nap"), (c) => near(c) * (c.s.h > 0 ? 1 + T().brave * 0.4 : 1)); if (!c) return;
        await goSpot(c.room, c.id); await B.act("loaf", rand(2.5, 5) * 1000); if (Math.random() < 0.4) say("nap");
        st.sleeping = true; await B.act("sleep", rand(40, 110) * 1000 * (0.6 + T().lazy)); st.sleeping = false;
        await B.act("stretch", 2600); if (Math.random() < 0.5) say("stretch");
      } },
    { id: "potty", score: () => ((Date.now() - st.lastPotty) / 3600e3 > 2.5 ? 1.6 : 0),
      async run() {
        if (game.save.house.litter >= 3) { await goSpot("bathroom", "mat"); say("dirty"); game.meow(2); await B.act("idle_tail", 4000); st.lastPotty = Date.now() - 1.8 * 3600e3; return; }
        await goSpot("bathroom", "litter"); say("potty"); await B.act("loaf", 6000); await B.act("scratch", 1600); game.pottied(); st.lastPotty = Date.now();
      } },
    { id: "watch", score: () => 0.35 + T().curious * 0.5 + (mood() === "poet" ? 1.2 : 0),
      async run() { const pb = planNow(); const c = (pb?.act === "watch" && pb.room && allowed(pb.room) ? { room: pb.room, id: "window" } : null) || weighted(spotsWith("watch"), near); if (!c) return; await goSpot(c.room, c.id); await B.act("idle_tail", rand(5, 9) * 1000); say("watch"); await B.act("look_up", rand(4, 8) * 1000); await B.act("idle_tail", rand(8, 20) * 1000); } },
    { id: "explore", score: () => 0.3 + T().curious * 0.9 + (mood() === "explorer" ? 1.2 : 0) - (Date.now() - st.lastRoomChange < 60e3 ? 0.5 : 0),
      async run() {
        const rooms = Object.keys(ROOMS).filter((r) => r !== B.room && allowed(r)); const to = pick(rooms); if (!to) return;
        await goRoom(to, gaitFor());
        for (let i = 0; i < 2; i++) { const p = randFloor(to); await B.walkTo(p.x, p.y, { gait: Math.random() < 0.3 ? "stalk" : "walk" }); await B.act(Math.random() < 0.5 ? "idle_tail" : "look_up", rand(2, 5) * 1000); }
      } },
    { id: "groom", score: () => 0.35 + (100 - N().hygiene) / 100,
      async run() { if (Math.random() < 0.5) { const c = weighted(spotsWith("groom", [B.room]), () => 1); if (c) await goSpot(c.room, c.id); } await B.act("groom_full", 9000); if (Math.random() < 0.3) say("groom"); await B.act("lick_body", rand(3, 6) * 1000); N().hygiene = clamp(N().hygiene + 20, 0, 100); } },
    { id: "scratch", score: () => 0.25 + T().sassy * 0.3,
      async run() { await goSpot("living", "post"); await B.act("stretch", 1500); await B.act("scratch", rand(3, 6) * 1000); if (Math.random() < 0.4) say("scratch"); } },
    { id: "zoomies", score: () => { const h = game.scene.S.hour; const crazy = Math.abs(h - game.today.crazyHour) < 0.75 ? 1.6 : 0; return N().energy > 55 ? crazy + (mood() === "zoomie" ? 1 : 0) + T().playful * 0.3 : 0; },
      async run() { say("zoom"); const w = W(B.room); for (let i = 0; i < 4; i++) { await B.walkTo(i % 2 ? w.x0 + 60 : w.x1 - 60, rand(w.y0, w.y1), { gait: "run" }); } if (Math.random() < 0.6) { const rooms = Object.keys(ROOMS).filter((r) => r !== B.room && allowed(r)); await goRoom(pick(rooms), "run"); } await B.act("loaf", 3000); N().energy -= 8; N().fun += 15; } },
    { id: "selfplay", score: () => T().playful * 0.7 + (100 - N().fun) / 140,
      async run() { const c = weighted(spotsWith("play"), near); if (c) await goSpot(c.room, c.id); if (Math.random() < 0.5) { await B.act("roll_play", 3500); } else { await B.act("crouch", 1200); await B.act("play_yarn", 6000); } N().fun = clamp(N().fun + 12, 0, 100); } },
    { id: "perch", score: () => 0.2 + T().brave * 0.4 + T().curious * 0.2,
      async run() { const c = weighted(spotsWith("perch").concat(spotsWith("naughty")), near); if (!c) return; await goSpot(c.room, c.id); if (c.s.use.includes("naughty")) say("naughty"); await B.act("loaf", rand(8, 20) * 1000); } },
    { id: "seek", score: () => (game.memory.angry || !game.ownerHome() ? 0 : ((100 - N().social) / 100) * (0.4 + T().affectionate * 1.4) + (mood() === "clingy" ? 0.9 : 0)),
      async run() { await comeTo(game.scene.room); await B.act("idle_tail", rand(6, 14) * 1000); } },
    { id: "sulk", score: () => (game.memory.angry ? game.memory.grudge / 28 : 0),
      async run() {
        // dỗi: tới chỗ xa máy quay, quay lưng lại phía bạn, thỉnh thoảng liếc
        const S = game.scene.S, w = W(B.room); await down();
        const mid = S.cam + S.viewW / 2, tx = mid < (w.x0 + w.x1) / 2 ? w.x1 - 120 : w.x0 + 120;
        await B.walkTo(tx, w.y0 + 20); B.faceTo(tx > mid ? 1 : -1); say("sulk");
        await B.act("loaf", rand(10, 18) * 1000); B.faceTo(-B.face); await B.act("look_up", 1200); B.faceTo(-B.face); await B.act("loaf", rand(6, 12) * 1000);
      } },
    { id: "knock", score: () => (game.save.house.cup !== "broken" ? (0.12 + T().sassy * 0.35 + (100 - N().social) / 400) * (Date.now() - (st.lastKnock || 0) > 40 * 60e3 ? 1 : 0) : 0),
      async run() {
        st.lastKnock = Date.now(); const sp = await goSpot("kitchen", "counter"); if (!sp) return;
        await B.walkTo(game.CUP.x - 70, sp.y); B.faceTo(1); await B.act("crouch", 900);
        const seen = game.scene.room === "kitchen"; await B.act("groom", 700); game.knockCup();
        say(seen ? "knock_seen" : "knock"); await B.act("look_up", 1600); await B.act("loaf", 4000);
      } },
    { id: "dock", score: () => (game.ownerHome() && game.scene.room === B.room && !document.hidden && Date.now() - (st.lastDock || 0) > 15 * 60e3 && !game.memory.angry ? 0.1 + (100 - N().social) / 160 + T().sassy * 0.25 : 0),
      async run() {
        st.lastDock = Date.now(); const S = game.scene.S, w = W(B.room); await down();
        await B.walkTo(clamp(S.cam + S.viewW / 2, w.x0, w.x1), w.y1); say("dock"); await B.act("look_up", 900);
        if (game.scene.room !== B.room) return;
        await game.dockSit(true); const end = Date.now() + rand(9, 16) * 1000;
        try { while (Date.now() < end && game.docked) await B.act("idle", 500); } finally { game.dockSit(false); }
      } },
    { id: "dawnyell", score: () => { const h = game.scene.S.hour; return h > 4.5 && h < 6.5 && N().hunger < 80 && !game.save.house.bowl ? 2.5 : 0; },
      async run() { await comeTo(game.scene.room); for (let i = 0; i < 3; i++) { say("dawn"); game.meow(2); await B.act("look_up", 2400); await B.act("idle_tail", 2200); if (game.save.house.bowl) return; } } },
    { id: "nightsong", score: () => { const h = game.scene.S.hour; return (h > 23 || h < 3) && game.quirks.some((q) => q.night) ? 0.9 : 0; },
      async run() { await down(); const p = randFloor(B.room); await B.walkTo(p.x, p.y); for (let i = 0; i < 2; i++) { say("nightsong"); game.meow(2); await B.act("look_up", 2600); } } },
    // ---- QUẤN NGƯỜI: mở dần theo bậc gắn bó (cat/bond.js). Chỉ diễn khi bạn đang nhìn.
    { id: "headbutt", score: () => (att() && at("friend") && !game.memory.angry && cool("headbutt", 25) ? 0.3 + (100 - N().social) / 110 + T().affectionate * 0.7 + (mood() === "clingy" ? 1.1 : 0) : 0),
      async run() {
        used("headbutt"); await comeTo(game.scene.room); await B.act("look_up", 700);
        if (!att()) return; const r = await game.closeup.headbutt();
        N().social = clamp(N().social + 16, 0, 100); game.bond.gain(0.5 + (r.back > 4 ? 1.2 : 0), "headbutt"); game.moment("headbutt", true);
        await B.act("idle_tail", 3500);
      } },
    { id: "blinkat", score: () => (att() && at("friend") && !game.memory.angry && cool("blinkat", 35) ? 0.25 + T().affectionate * 0.5 + (mood() === "poet" ? 0.4 : 0) : 0),
      async run() {
        used("blinkat"); await comeTo(game.scene.room); await B.act("loaf", 1200); if (!att()) return;
        const r = await game.closeup.slowblink(); if (r.back) { game.bond.gain(0.8, "blink"); game.moment("slowblink", true); }
        await B.act("loaf", 5000);
      } },
    { id: "gift", score: () => (att() && at("friend") && cool("gift", 150) ? 0.35 + T().playful * 0.3 + game.memory.level("hunter") * 0.12 : 0),
      async run() {
        used("gift"); const home = game.scene.room, rooms = Object.keys(ROOMS).filter((r) => r !== home && allowed(r)); const hunt = pick(rooms); if (!hunt) return;
        await goRoom(hunt, "walk"); await down(); const p = randFloor(hunt); await B.walkTo(p.x, p.y, { gait: "stalk" });
        await B.act("crouch", 1400); await B.act("chase", 600); const g = game.carryGift();
        try {
          await goRoom(game.scene.room, "gift_carry"); await comeTo(game.scene.room, "gift_carry");
          say("gift_bring"); game.meow(1); await B.act("gift_drop", 900);
        } finally { game.dropGift(); }
        st.giftWaiting = g.id; try { await B.act("idle_tail", 9000); } finally { st.giftWaiting = null; }
      } },
    { id: "knead", score: () => (att() && at("bestie") && cool("knead", 40) && !game.memory.angry ? 0.35 + T().affectionate * 0.5 + (mood() === "clingy" ? 0.8 : 0) + (N().energy < 50 ? 0.3 : 0) : 0),
      async run() {
        used("knead"); await comeTo(game.scene.room); say("knead"); B.knead = true; if (game.save.settings.sound) game.purr(true);
        try { const end = Date.now() + rand(9, 15) * 1000; while (Date.now() < end) { await B.act("knead", 2000); game.hearts?.(1); } }
        finally { B.knead = false; game.purr(false); }
        game.bond.gain(0.4, "knead"); game.moment("knead", true); await B.act("loaf", 4000);
      } },
    { id: "bellyup", score: () => (att() && at("bestie") && cool("belly", 45) && !game.memory.angry ? 0.3 + T().playful * 0.4 + T().sassy * 0.2 : 0),
      async run() {
        used("belly"); await comeTo(game.scene.room); await B.act("lie", 800); game.belly = { t: Date.now() }; say("belly");
        if (!game.save.cd.bellyHint) { game.save.cd.bellyHint = 1; game.emit("toast", { text: `${game.cat.name} khoe bụng… vuốt thử? (rủi ro tự chịu)` }); }
        try { await B.act("belly_up", rand(8, 12) * 1000); } finally { game.belly = null; }
      } },
    { id: "pawtap", score: () => (game.ownerHome() && !document.hidden && at("bestie") && idleS() > 120 && cool("pawtap", 30) && N().social < 75 && !game.closeup?.busy ? 1.2 + T().affectionate * 0.6 : 0),
      async run() {
        used("pawtap"); await comeTo(game.scene.room); await B.act("look_up", 900); const r = await game.closeup.pawtap();
        if (r.answered) { game.bond.gain(1, "pawtap"); N().social = clamp(N().social + 14, 0, 100); game.moment("pawtap", true); await B.act("idle_tail", 4000); }
        else await B.act("loaf", 6000);
      } },
    { id: "sleepnear", score: () => { const h = game.scene.S.hour, late = h >= 21 || h < 2; return game.ownerHome() && !document.hidden && at(late ? "friend" : "soul") && idleS() > 150 && N().energy < 80 && cool("sleepnear", 60) ? 1.1 + T().lazy * 0.6 + (late ? 0.6 : 0) : 0; },
      async run() {
        used("sleepnear"); await comeTo(game.scene.room); say("sleepnear"); await B.act("loaf", 3500);
        st.sleeping = true; game.moment("sleepnear"); try { await B.act("sleep", rand(60, 150) * 1000); } finally { st.sleeping = false; }
        await B.act("stretch", 2400);
      } },
    // ---- theo LỊCH CỦA CHỦ (chỉ nổi lên khi tới khối giờ tương ứng trong kế hoạch ngày)
    { id: "wakeowner", score: () => 0,
      async run() { await goSpot("bedroom", "bed"); for (let i = 0; i < 3; i++) { say("wakeup"); game.meow(2); await B.act("look_up", 2600); await B.act("loaf", 4000); if (planNow()?.act !== "wakeowner") return; } await B.act("loaf", 20000); } },
    { id: "seeoff", score: () => 0,
      async run() { await goSpot("living", "entry"); B.faceTo(1); say("seeoff"); await B.act("idle_tail", 9000); await B.act("loaf", 15000); } },
    { id: "waitdoor", score: () => 0,
      async run() { await goSpot("living", "entry"); B.faceTo(1); await B.act("loaf", rand(10, 20) * 1000); say("waiting"); await B.act("look_up", 2500); await B.act("loaf", rand(15, 30) * 1000); } },
    { id: "greet", score: () => 0,
      async run() {
        if (!game.ownerHome()) { await goSpot("living", "entry"); B.faceTo(1); say("waiting"); await B.act("loaf", 20000); return; }
        const awayH = game.awayH || 0, big = at("friend") && awayH > 2;
        await comeTo(game.scene.room, big ? "trot_tailup" : "walk"); game.moment("greetrun");
        if (big) { await B.act("chirp", 900); say("miss"); game.meow(2); await B.act("rub", 2600); if (att()) { const r = await game.closeup.headbutt(); game.bond.gain(0.4 + (r.back > 4 ? 0.8 : 0), "greet"); } }
        else { say("greet"); game.meow(2); }
        B.wobble = 0.5; try { await B.act("idle_tail", 3500); } finally { B.wobble = 0; } await B.act("roll_play", 3000); N().social = clamp(N().social + 15, 0, 100);
      } },
    { id: "bedtime", score: () => 0,
      async run() { await goSpot("bedroom", "bed"); await B.act("groom", 4000); await B.act("loaf", 5000); st.sleeping = true; try { await B.act("sleep", rand(120, 300) * 1000); } finally { st.sleeping = false; } } },
    { id: "meeting", score: () => 0,
      async run() {
        // bạn họp online ở nhà → mèo kiểu gì cũng chen vào "khung hình"
        if (!game.ownerHome() || document.hidden) { const c = weighted(spotsWith("nap"), near); if (c) await goSpot(c.room, c.id); await B.act("sleep", 60000); return; }
        await comeTo(game.scene.room); say("meeting"); game.meow(1); await B.act("look_up", 2000);
        if (game.scene.room === B.room && Math.random() < 0.7) { await game.dockSit(true); try { await B.act("idle", rand(12, 22) * 1000); } finally { game.dockSit(false); } }
        await B.act("loaf", rand(20, 40) * 1000);
      } },
    { id: "prowl", score: () => 0,
      async run() { const rooms = Object.keys(ROOMS).filter(allowed); for (let i = 0; i < 2; i++) { const to = pick(rooms); await goRoom(to, "walk"); const p = randFloor(to); await B.walkTo(p.x, p.y, { gait: "stalk" }); await B.act("look_up", 2500); } } },
    { id: "wander", score: () => 0.45,
      async run() { await down(); const p = randFloor(B.room); await B.walkTo(p.x, p.y); await B.act(pick(["idle", "idle_tail", "loaf", "look_up"]), rand(4, 12) * 1000); } },
  ];

  async function comeTo(room, gait = "walk") {
    const r = ROOMS[room]; if (!allowed(room)) return;
    if (B.room !== room) await goRoom(room, gait);
    await down();
    // đứng lệch khỏi giữa màn hình một chút – để thanh nút dưới không che mất mèo
    const S = game.scene.S, mid = S.cam + S.viewW / 2, side = B.x < mid ? -1 : 1;
    const cx = clamp(mid + side * S.viewW * rand(0.18, 0.28), r.walk.x0, r.walk.x1);
    await B.walkTo(cx, r.walk.y1 - 30, { gait }); B.faceTo(mid - cx);
  }

  function planNow() { return game.schedule?.blockAt(); }
  function choose() {
    const ctx = {}, kid = game.age.stage === "kitten", pb = planNow();
    // kế hoạch ngày: việc của khối giờ hiện tại được ưu tiên mạnh (vẫn chừa chỗ cho bất ngờ)
    const planBoost = (a) => (pb && a.id === pb.act ? (a.score(ctx) > 0 ? 5 : 0) + (["wakeowner", "seeoff", "waitdoor", "greet", "bedtime", "prowl", "zoomies", "meeting"].includes(a.id) ? 3.2 : 0) : 0);
    const scored = ACTS.map((a) => ({ a, s: (Math.max(0, a.score(ctx)) * (pb && a.id === pb.act ? 5 : 1) + planBoost(a)) * qmod(a.id) * (kid && ["selfplay", "zoomies", "explore"].includes(a.id) ? 1.6 : 1) * (a.id === st.cur ? 0.35 : 1) * rand(0.75, 1.25) }));
    scored.sort((x, y) => y.s - x.s);
    return weighted(scored.slice(0, 3), (x) => x.s * x.s).a;
  }

  async function loop() {
    while (st.alive) {
      try {
        if (st.interrupt) { const f = st.interrupt; st.interrupt = null; await f(); continue; }
        const a = choose(); st.cur = a.id; st.since = Date.now(); game.emit("activity", a.id);
        await a.run();
      } catch (e) { if (e !== CANCEL) { console.error(e); await B.wait(1000); } }
      st.sleeping = false;
      if (!st.interrupt) { try { await B.act(pick(["idle", "idle_tail", "idle_tail", "loaf"]), rand(1.6, 3.4) * 1000 * (game.chill?.idle || 1.6)); } catch (e) { if (e !== CANCEL) console.error(e); } }
    }
  }

  return {
    st, ACTS, goRoom, goSpot, comeTo, down,
    start() { loop(); },
    get activity() { return st.cur; },
    planNow,
    get sleeping() { return !!st.sleeping; },
    /** chen ngang việc đang làm (người chơi tương tác) */
    interrupt(fn, label) { st.interrupt = fn; if (label) { st.cur = label; game.emit("activity", label); } B.cancel(); },
  };
}
