// Bộ điều phối: nối sân khấu + thân mèo + bộ não + lưu trữ + tương tác người chơi.
import { APP, ECON, CHILL, can } from "./config.js";
import { load, save, log } from "./core/store.js";
import { bus, clamp, dayKey, hhmm, rand, rng, pick, fmtDur, lerp } from "./core/util.js";
import * as snd from "./core/sound.js";
import { createScene } from "./world/scene.js";
import { ROOMS } from "./world/rooms.js";
import { createCatRenderer } from "./render/registry.js";
import { createBody, depth, CANCEL } from "./cat/body.js";
import { createBrain } from "./cat/brain.js";
import { today as todayOf, SPOTS, quirksOf, obsessionOf, ageOf } from "./cat/personality.js";
import { createMemory } from "./cat/memory.js";
import { aiLine } from "./cat/voice.js";
import { createEvents } from "./world/events.js";
import { extraProps, extraSpots, CUP, SHARDS, season } from "./world/decor.js";
import { createScares } from "./world/scares.js";
import { createQuests } from "./meta/quests.js";
import { createAlbum } from "./meta/album.js";
import { music } from "./core/music.js";
import { createSchedule, ACT_INFO, fmtH } from "./meta/schedule.js";
import { createCalendar } from "./meta/calendar.js";
import { line, setNames } from "./cat/lines.js";
import { createBond } from "./cat/bond.js";
import { pickGift, giftName, GIFTS } from "./meta/gifts.js";
const GIFTS_BY = Object.fromEntries(GIFTS.map((g) => [g.id, g]));
import { letterToday } from "./meta/letter.js";
import { createCloseup } from "./ui/closeup.js";

export async function createGame(root) {
  const ev = bus();
  const s = load();
  const game = { save: s, emit: ev.emit, on: ev.on, tool: null };
  game.plan = () => s.plan;
  game.can = (f) => can(s.plan, f);
  game.roomAllowed = (r) => !ROOMS[r].feat || game.can(ROOMS[r].feat) || !!s.owned[ROOMS[r].feat];

  // ------------------------------------------------------------------ mèo
  let R;
  try { R = await createCatRenderer(s.catId); } catch (e) { console.warn("không tải được mèo", s.catId, e); s.catId = "nana"; R = await createCatRenderer("nana"); }
  await R.ready; R.setSkin(s.skin); R.reduced = s.settings.reduced;
  game.cat = R.manifest; game.R = R;
  game.today = todayOf(game.cat);
  s.cat.adopted ||= s.created;
  game.quirks = quirksOf(game.cat, s.cat.adopted); game.obsession = obsessionOf(game.cat); game.age = ageOf(s.cat.adopted);
  game.journal = (type, text) => { log(s, type, text); save(s); };
  const memory = createMemory(game); game.memory = memory; memory.tick();
  game.spotsOf = (r) => ({ ...ROOMS[r].spots, ...extraSpots(r, game) });
  game.CUP = CUP;
  game.calendar = createCalendar(game);
  const schedule = createSchedule(game); game.schedule = schedule;
  // CHẾ ĐỘ: "home" = bạn đang ở nhà (vuốt ve được) · "cam" = xem qua camera (đi vắng theo lịch)
  game.mode = schedule.ownerState() === "away" ? "cam" : "home";
  game.ownerHome = () => game.mode === "home";

  // ------------------------------------------------------------------ vắng nhà (idle) + ghé thăm mỗi ngày
  game.lastSeen0 = s.lastSeen;
  game.lastInput = Date.now();
  game.awayH = (Date.now() - (s.lastSeen || Date.now())) / 3600e3;
  setNames({ cat: game.cat.name, sen: s.profile.nick || "Sen" });
  game.setNick = (n) => { s.profile.nick = (n || "").trim().slice(0, 16) || "Sen"; setNames({ sen: s.profile.nick }); save(s); };
  const bond = createBond(game); game.bond = bond;
  const away = offline(s, game);
  const d0 = dayKey();
  if (s.visits.last !== d0) {
    const y = new Date(); y.setDate(y.getDate() - 1);
    s.visits.streak = s.visits.last === dayKey(y) ? s.visits.streak + 1 : 1; s.visits.last = d0;
    const bonus = ECON.dailyVisit + Math.min(6, s.visits.streak - 1) * 2; s.coins += bonus; game.dailyBonus = bonus;
    log(s, "day", `${game.today.mood.emo} Hôm nay ${game.cat.name}: ${game.today.mood.vi}`, { mood: game.today.mood.id });
  }
  game.letter = letterToday(game);
  game.away = away;

  // ------------------------------------------------------------------ sân khấu
  const scene = createScene(root); game.scene = scene; scene.extraProps = (r) => extraProps(r, game); scene.S.follow = s.settings.follow; scene.S.forceHour = s.settings.hour;
  if (!game.roomAllowed(s.cat.room)) s.cat.room = "living";
  const B = createBody(R, scene); game.body = B;
  const c0 = s.cat, w0 = ROOMS[c0.room].walk;
  scene.onRoom = (id) => { ev.emit("room", id); };
  scene.show(c0.room, c0.x - 600);
  B.setRoom(c0.room, clamp(c0.x, w0.x0, w0.x1), clamp(c0.y, w0.y0, w0.y1), 0);
  // mở app sau một lúc vắng → mèo đang ở đúng chỗ của khối giờ hiện tại (như mở camera thật)
  game.spawnPlan = () => {
    const pb = schedule.blockAt(); if (!pb?.room || !game.roomAllowed(pb.room)) return false;
    const sp = pb.spot && game.spotsOf(pb.room)[pb.spot], wr = ROOMS[pb.room].walk;
    if (scene.room !== pb.room) scene.show(pb.room, (sp?.x ?? 900) - 700);
    if (sp) { B.setRoom(pb.room, sp.x, sp.y, sp.h || 0); B.z = sp.h > 0 ? sp.z : null; B.faceTo(sp.face); }
    else B.setRoom(pb.room, rand(wr.x0 + 100, wr.x1 - 100), rand(wr.y0, wr.y1), 0);
    B.faceShown = B.face; s.cat.room = pb.room; if (["nap", "bedtime"].includes(pb.act)) R.play(R.resolve("sleep"), { dur: 1 }); return true;
  };
  if (Date.now() - (game.lastSeen0 || 0) > 10 * 60e3) game.spawnPlan();
  B.speedMul = (0.92 + ((game.today.mood.speed || 1) - 1) * 0.4) * game.age.speed * CHILL.speed; B.ageScale = game.age.scale; R.durMul = CHILL.transition; B.runMul = CHILL.run; B.accelT = CHILL.accel; game.chill = CHILL; scene.S.camSoft = CHILL.camera;
  // nói: câu có sẵn hiện ngay, câu AI (Pro) về kịp thì thay
  game.say = (key, room, ms) => { const t = line(key, game.today.mood.id, room); B.say(t, ms); aiLine(game, key, t).then((a) => { if (a && B.sayUntil > performance.now()) B.say(a, ms); }); return t; };
  const sync = () => { if (scene.room === B.room) { if (!B.el.isConnected) B.mount(); } else { B.el.remove(); document.querySelectorAll(".bubble,.eyeglow,.cat-shadow").forEach((n) => { if (!scene.stage.contains(n)) n.remove(); }); } };
  game.syncHouse = () => { const st = scene.stage; if (!st) return; st.classList.toggle("bowl-empty", !s.house.bowl); st.classList.toggle("litter-dirty", s.house.litter > 0); st.dataset.litter = s.house.litter; };
  ev.on("room", () => { game.syncHouse(); });
  game.syncHouse();

  // mèo đi sang phòng khác (bộ não gọi)
  game.moveCat = async (to, x, y, face) => {
    const from = B.room, watching = scene.room === from;
    B.room = to; s.cat.room = to; s.stats.checkins++;
    log(s, "checkin", `📍 ${ROOMS[to].icon} ${ROOMS[to].vi}`, { room: to });
    if (watching && scene.S.follow && game.mode === "cam") {
      B.x = x; B.y = y; B.face = face; B.faceShown = face; B.h = 0; B.z = null;
      game.camCut(to, true); ev.emit("checkin", { to, from, follow: true, cam: true }); ev.emit("q", "checkin");
    } else if (watching && scene.S.follow) {
      const dir = ROOMS[from].exits.right === to ? 1 : -1;
      const p = scene.go(to, dir, x < 0 ? 0 : ROOMS[to].W); B.x = x; B.y = y; B.face = face; B.faceShown = face; B.h = 0; B.z = null;
      B.mount(); ev.emit("checkin", { to, from, follow: true }); ev.emit("q", "checkin"); await p;
    } else {
      B.x = x; B.y = y; B.face = face; B.faceShown = face; B.h = 0; B.z = null; sync();
      ev.emit("checkin", { to, from, follow: false, here: scene.room === to, cam: game.mode === "cam" });
    }
    save(s);
  };
  // chuyển camera: cắt cảnh có nhiễu (không trượt) – đúng cảm giác đổi cam an ninh
  game.camCut = (id, keepFollow = false) => {
    if (!game.roomAllowed(id)) return; if (!keepFollow) scene.S.follow = id === B.room;
    const vp = scene.S.vp; vp.classList.remove("glitch"); void vp.offsetWidth; vp.classList.add("glitch"); setTimeout(() => vp.classList.remove("glitch"), 420);
    scene.show(id, id === B.room ? B.x - scene.S.viewW / 2 : 0); sync(); game.syncHouse(); ev.emit("follow", scene.S.follow);
  };
  game.viewRoom = async (id) => {
    if (game.mode === "cam") return game.camCut(id); if (id === scene.room || !game.roomAllowed(id)) return;
    const order = Object.keys(ROOMS); const cur = scene.room; scene.S.follow = false;
    await scene.go(id, order.indexOf(id) > order.indexOf(cur) ? 1 : -1, 0); sync(); ev.emit("follow", false);
    followYou(id, cur);
  };
  // QUẤN NGƯỜI: bạn sang phòng nào, mèo (đủ thân) lẽo đẽo theo sang phòng đó
  function followYou(id, from) {
    if (!bond.at("known") || brain.sleeping || memory.angry || B.room === id || B.room !== from && Math.random() < 0.5) return;
    if (["eat", "potty", "pet", "greet", "meeting"].includes(brain.activity)) return;
    const t = game.today.traits, p = 0.3 + t.affectionate * 0.4 + bond.tier * 0.08 + (game.today.mood.id === "clingy" ? 0.3 : 0) - t.sassy * 0.15;
    if (Math.random() > p) return;
    setTimeout(() => { if (scene.room !== id) return; brain.interrupt(async () => { await brain.comeTo(id, Math.random() < 0.3 ? "trot_tailup" : "walk"); game.say("follow"); game.moment("follow"); await B.act("idle_tail", 4000); }, "follow"); }, 900);
  }
  game.followCat = async (on = true) => {
    scene.S.follow = on; s.settings.follow = on; scene.S.manualUntil = 0;
    if (on && scene.room !== B.room) { const order = Object.keys(ROOMS); await scene.go(B.room, order.indexOf(B.room) > order.indexOf(scene.room) ? 1 : -1, B.x - scene.S.viewW / 2); sync(); }
    ev.emit("follow", on); save(s);
  };

  // ------------------------------------------------------------------ nhu cầu & sự kiện nhà
  const N = s.cat.needs;
  game.happiness = () => (N.hunger * 1.2 + N.energy * 0.6 + N.fun + N.social + N.hygiene * 0.7) / 450;
  game.ate = () => { N.hunger = clamp(N.hunger + 55, 0, 100); s.house.bowl = 0; game.syncHouse(); log(s, "eat", "🐟 Ăn sạch bát"); save(s); ev.emit("needs"); };
  game.pottied = () => { s.house.litter = Math.min(3, s.house.litter + 1); N.hygiene = clamp(N.hygiene - 4, 0, 100); game.syncHouse(); save(s); };
  game.meow = (n = 1) => { if (s.settings.sound && scene.room === B.room) snd.meow(n, game.cat.voicePitch || 1); };
  game.coins = (n, why) => { if (!n) return; s.coins += n; ev.emit("coins", { n, why }); save(s); };
  game.feed = () => {
    ev.emit("q", "feed");
    if (s.house.bowl) return ev.emit("toast", { text: "Bát vẫn còn đầy." });
    s.house.bowl = 1; s.stats.feeds++; memory.fed(); game.syncHouse(); ev.emit("needs"); save(s);
    if (N.hunger < 80 && !brain.sleeping) { brain.interrupt(async () => { B.say(line("hungry", game.today.mood.id)); await brain.ACTS.find((a) => a.id === "eat").run(); }, "eat"); game.coins(N.hunger < 50 ? ECON.feed : 0, "feed"); if (N.hunger < 50) bond.gain(0.5, "feed"); }
    ev.emit("toast", { text: `Đã đổ hạt vào bát ở ${ROOMS.kitchen.icon} Bếp` });
  };
  game.clean = () => {
    const shards = s.house.cup === "broken";
    if (!s.house.litter && !shards) return ev.emit("toast", { text: "Nhà đang sạch sẽ." });
    if (s.house.litter) { s.house.litter = 0; N.hygiene = clamp(N.hygiene + 10, 0, 100); log(s, "clean", "🧹 Dọn khay cát"); }
    if (shards) { s.house.cup = "ok"; log(s, "clean", "🧹 Quét mảnh cốc, đặt cốc mới"); if (scene.room === "kitchen") scene.refreshDyn(); }
    game.syncHouse(); game.coins(ECON.cleanLitter, "clean"); ev.emit("q", "clean"); ev.emit("toast", { text: shards && s.house.litter === 0 ? "Đã quét mảnh cốc vỡ, đặt cốc mới lên bàn bếp ✨" : "Sạch bong ✨" }); ev.emit("needs");
  };
  game.knockCup = () => {
    if (s.house.cup === "broken") return;
    const done = () => { game.moment("cup"); s.house.cup = "broken"; if (scene.room === "kitchen") scene.refreshDyn(); game.journal("knock", "💥 Đẩy rơi cốc trên bàn bếp"); memory.note("cup", "Cốc trên bàn bếp là để đẩy xuống.", true); ev.emit("needs"); };
    const g = scene.room === "kitchen" && scene.propEl("cup")?.querySelector(".cup");
    if (!g) return done();
    g.style.transformBox = "fill-box"; g.style.transformOrigin = "50% 50%";
    g.animate([{ transform: "translate(0,0)" }, { transform: "translate(34px,0) rotate(8deg)", offset: 0.3 }, { transform: `translate(${SHARDS.x - CUP.x}px, ${SHARDS.y - CUP.y - 10}px) rotate(200deg)` }], { duration: 760, easing: "cubic-bezier(.5,0,.9,.6)" })
      .finished.then(() => { if (s.settings.sound) snd.hiss(); done(); });
  };
  // ngồi chễm chệ lên thanh nút
  game.docked = false;
  game.dockSit = async (on) => { if (on) game.moment("dock", true); B.hidden = on; if (game.docked === on) return; game.docked = on; ev.emit("dock", on); if (on) brain.st.cur = "dock"; };
  game.shoo = () => { if (!game.docked) return; game.docked = false; B.hidden = false; ev.emit("dock", false); game.say("dock_shoo"); memory.spend(6); };
  game.call = () => {
    const t = game.today.traits, lv = memory.level("callname");
    let will = Math.random() < clamp(0.25 + t.affectionate * 0.6 + N.social / 300 - t.sassy * 0.25 + lv * 0.08 + (game.today.mood.id === "clingy" ? 0.4 : 0) - (memory.angry ? 0.5 - lv * 0.1 : 0), 0.05, 0.97);
    memory.xp("callname", 1); if (will) memory.xp("callname", 1);
    if (memory.angry && !will) { const tx = line("angry_call", game.today.mood.id); if (scene.room === B.room) B.say(tx); else ev.emit("toast", { text: `${game.cat.name}: “${tx}”`, avatar: true }); return; }
    const sayFar = (k) => { const tx = line(k, game.today.mood.id); if (scene.room === B.room) B.say(tx); else ev.emit("toast", { text: `${game.cat.name}: “${tx}”`, avatar: true }); };
    if (brain.sleeping && Math.random() < 0.6) { sayFar("wake"); return; }
    if (will) ev.emit("q", "call_come");
    if (will) brain.interrupt(async () => { sayFar("call_yes"); game.meow(1); await brain.comeTo(scene.room); N.social = clamp(N.social + 8, 0, 100); await B.act("idle_tail", 8000); }, "seek");
    else sayFar("call_no");
  };

  // ------------------------------------------------------------------ QUÀ: mèo ngậm về, thả trước mặt bạn, chạm để nhận
  let carry = null;
  game.carryGift = () => { const g = pickGift(memory.level("hunter")); const el = document.createElement("div"); el.className = "giftcarry"; el.textContent = g.emo; carry = { g, el }; return g; };
  game.dropGift = () => {
    if (!carry) return; const { g, el } = carry; carry = null; el.remove();
    const w = ROOMS[B.room].walk; s.house.gift = { id: g.id, room: B.room, x: clamp(B.x + B.face * 70 * (B.k || 0.6), w.x0 + 40, w.x1 - 40), y: clamp(B.y + 18, w.y0, w.y1 + 20) }; save(s); placeGift();
  };
  function placeGift() {
    document.querySelectorAll(".giftdrop").forEach((n) => n.remove());
    const G = s.house.gift; if (!G || G.room !== scene.room || !scene.actors) return;
    const g = pickGiftById(G.id), el = document.createElement("button"); el.className = "giftdrop"; el.setAttribute("aria-label", "Nhận quà");
    el.innerHTML = `<span>${g.emo}</span>`; el.style.transform = `translate(${G.x}px, ${G.y}px)`; el.style.zIndex = Math.round(G.y); scene.actors.appendChild(el);
    el.addEventListener("pointerdown", (e) => { e.stopPropagation(); collectGift(el); });
  }
  const pickGiftById = (id) => GIFTS_BY[id] || { id, emo: "🎁", vi: "Quà" };
  function collectGift(el) {
    const G = s.house.gift; if (!G) return; const g = pickGiftById(G.id); s.house.gift = null;
    s.gifts[g.id] = (s.gifts[g.id] || 0) + 1; const name = giftName(g, s.profile.nick || "Sen");
    game.journal("gift", `🎁 ${game.cat.name} tặng: ${g.emo} ${name}`); game.moment("gift", true); bond.gain(1.5, "gift"); game.coins(2, "gift");
    ev.emit("toast", { text: `🎁 Nhận quà: ${g.emo} ${name}${s.gifts[g.id] === 1 ? " · món mới!" : ""}` }); ev.emit("gift", g); buzz(15);
    el.classList.add("got"); setTimeout(() => el.remove(), 700);
    if (brain.st.giftWaiting) { game.say("gift_thanks"); hearts?.(2); }
  }
  ev.on("room", () => setTimeout(placeGift, 50));
  setTimeout(placeGift, 300);
  const buzz = (p) => { if (s.settings.haptics !== false && navigator.userActivation?.hasBeenActive !== false) try { navigator.vibrate?.(p); } catch { /* không hỗ trợ */ } };
  game.buzz = buzz;
  game.purr = (on) => { if (!on || s.settings.sound) snd.purr(on); };
  // mèo chỉ "quấn" khi bạn đang thực sự nhìn: ở nhà, tab đang mở, không mở bảng, không cầm đồ chơi
  game.attention = () => game.mode === "home" && !document.hidden && !game.tool && !game.sheetOpen?.() && !game.closeup?.busy && !game.docked && game.roomAllowed(scene.room);
  game.closeup = createCloseup(game, root);
  let hearts = null;

  // ------------------------------------------------------------------ vòng lặp khung hình
  let watchSec = 0;
  let last = 0, tHud = 0, tLight = 0, tNeeds = 0, tMem = 0, tBlink = 4000;
  const slowBlinked = () => { game.moment("slowblink"); const n = memory.seen("slowblink"); if (n === 1) { ev.emit("toast", { text: `😽 ${game.cat.name} chớp mắt chậm với bạn – nghĩa là “tin bạn”` }); memory.note("blink", "Đã chớp mắt chậm với bạn. Tin bạn rồi."); } bond.gain(0.2, "blink"); };
  function frame(t) {
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t;
    B.tick(dt);
    if (scene.room === B.room) scene.track(B.x, B.face, dt);
    if (t - tLight > 30000) { tLight = t; scene.light(); ownerTick(); if (dayKey() !== game.today.key) { game.today = todayOf(game.cat); ev.emit("mood"); } }
    if (t - tNeeds > 1000) {
      const h = (t - tNeeds) / 3600e3; tNeeds = t; if (h < 0.01) decay(N, h, brain.sleeping);
      s.cat.x = B.x; s.cat.y = B.y; save(s);
    }
    if (t - tHud > 400) { tHud = t; ev.emit("tick"); }
    if (t - tMem > 1000) { tMem = t; memory.tick(); if (!document.hidden) memory.visit(); events.tick(); scares.tick();
      if (!document.hidden && scene.room === B.room && ++watchSec % 60 === 0) ev.emit("q", "watch_min"); }
    // chớp mắt: thường xuyên, nhanh; thỉnh thoảng chớp CHẬM khi tin bạn (mèo "hôn" bằng mắt)
    if (t > tBlink && !brain.sleeping && !B.moving()) {
      const slow = s.cat.bond >= 25 && !memory.angry && scene.room === B.room && Math.random() < 0.12;
      R.blink(slow); tBlink = t + rand(2.4, 6.5) * 1000;
      if (slow) { slowBlinked(); }
    }
    tick2(dt);
    if (carry) { if (scene.room === B.room && B.hx != null) { if (!carry.el.isConnected) scene.topfx.appendChild(carry.el); const k = B.k || 0.6; carry.el.style.transform = `translate(${(B.hx + B.face * 26 * k).toFixed(1)}px, ${(B.hy + 34 * k).toFixed(1)}px) scale(${(k * 1.6).toFixed(3)})`; } else carry.el.remove(); }
    requestAnimationFrame(frame);
  }
  const brain = createBrain(game); game.brain = brain;
  // ---- lịch chủ chạy thật theo giờ: về nhà / ra khỏi nhà / máy cho ăn
  let lastState = schedule.ownerState(), lastFeedCheck = Date.now(), lastBusy = null;
  function ownerTick() {
    const st = schedule.ownerState(), bz = schedule.busyNow();
    if (bz && lastBusy !== bz.title + bz.a && st === "home") { lastBusy = bz.title + bz.a; ev.emit("toast", { text: `💻 Bạn đang họp “${bz.title || "online"}” – ${game.cat.name} đang tới phá…` }); brain.interrupt(() => brain.ACTS.find((a) => a.id === "meeting").run(), "meeting"); }
    if (st !== lastState) { if (lastState === "away" && st !== "away") game.ownerArrives(); else if (st === "away") game.ownerLeaves(); lastState = st; }
    const now = new Date(); if (s.owner.feederOn) for (const fh of s.owner.feeder) { const ft = new Date(now); ft.setHours(0, 0, 0, 0); ft.setTime(ft.getTime() + fh * 3600e3); if (ft.getTime() > lastFeedCheck && ft <= now) { s.house.bowl = 1; game.syncHouse(); game.journal("feeder", "🤖 Máy cho ăn nhả hạt"); ev.emit("toast", { text: "🤖 Máy cho ăn tự động vừa nhả hạt" }); } }
    lastFeedCheck = now.getTime();
  }
  game.door = (open) => { const leaf = scene.room === "living" && scene.propEl("frontdoor")?.querySelector(".door-leaf"); if (leaf) leaf.style.transform = open ? "perspective(600px) rotateY(-74deg)" : ""; };
  game.setMode = (m, manual = false) => { if (game.mode === m) return; game.mode = m; game.manualMode = manual; ev.emit("mode", m); };
  game.ownerArrives = () => {
    game.setMode("home"); ev.emit("toast", { text: "🔑 Bạn đã về nhà" }); game.journal("owner", "🔑 Bạn về nhà");
    if (scene.S.follow && scene.room !== "living") game.viewRoom("living").then(() => { scene.S.follow = true; });
    setTimeout(() => game.door(true), 900); setTimeout(() => game.door(false), 5200);
    brain.interrupt(async () => { await brain.goSpot("living", "entry", "run"); await brain.ACTS.find((a) => a.id === "greet").run(); }, "greet");
  };
  game.ownerLeaves = () => {
    game.journal("owner", "👋 Bạn ra khỏi nhà"); ev.emit("toast", { text: "👋 Bạn ra khỏi nhà · chuyển sang camera" });
    brain.interrupt(async () => { await brain.ACTS.find((a) => a.id === "seeoff").run(); }, "seeoff");
    setTimeout(() => game.door(true), 2500); setTimeout(() => { game.door(false); game.setMode("cam"); }, 6500);
  };
  // ---- điều khiển qua camera
  let snacks = 5, snackDay = dayKey();
  game.talk = () => {
    game.lastInput = Date.now(); if (scene.room !== B.room) { ev.emit("toast", { text: `Loa ở ${ROOMS[scene.room].vi} – ${game.cat.name} không ở đây` }); return; }
    if (brain.sleeping && Math.random() < 0.7) { R.blink(false); ev.emit("toast", { text: `${game.cat.name} vểnh tai… rồi ngủ tiếp` }); return; }
    const come = Math.random() < 0.25 + memory.level("callname") * 0.1;
    brain.interrupt(async () => { await brain.down(); game.say("talk"); await B.act("look_up", 2400); if (come) { await brain.comeTo(scene.room); await B.act("idle_tail", 5000); } }, "talk");
  };
  game.treat = () => {
    if (snackDay !== dayKey()) { snacks = 5; snackDay = dayKey(); }
    if (!snacks) return ev.emit("toast", { text: "Hộp snack hết rồi – mai nạp lại 5 viên" });
    if (scene.room !== B.room) return ev.emit("toast", { text: `Máy ném snack ở ${ROOMS[scene.room].vi} – ${game.cat.name} không ở đây` });
    snacks--; game.emit("treat", snacks);
    const w = ROOMS[scene.room].walk, S = scene.S, x = clamp(S.cam + S.viewW * (0.3 + Math.random() * 0.4), w.x0, w.x1), y = rand(w.y0 + 20, w.y1 - 10);
    const el = document.createElement("div"); el.className = "treat"; el.textContent = "🐟"; scene.actors.appendChild(el);
    const x0 = S.cam + S.viewW / 2, t0 = performance.now(); const fly = (tt) => { const u = Math.min(1, (tt - t0) / 600); el.style.transform = `translate(${lerp(x0, x, u)}px, ${lerp(380, y, u) - Math.sin(u * Math.PI) * 180}px) rotate(${u * 540}deg)`; el.style.zIndex = Math.round(y); if (u < 1) requestAnimationFrame(fly); }; requestAnimationFrame(fly);
    brain.interrupt(async () => { await brain.down(); await B.wait(400); await B.walkTo(x - Math.sign(x - B.x) * 60, y); B.faceTo(x - B.x); await B.act("eat", 2200); el.remove(); game.say("treat"); N.hunger = clamp(N.hunger + 6, 0, 100); memory.appease(8); bond.gain(0.3, "treat"); await B.act("lick_lip", 1800); }, "eat");
  };
  game.snacksLeft = () => (snackDay !== dayKey() ? 5 : snacks);
  const events = createEvents(game); game.events = events;
  const tick2 = interactions(game, root); hearts = game.hearts;
  const scares = createScares(game, root); game.scares = scares;
  const quests = createQuests(game); game.quests = quests;
  const album = createAlbum(game); game.album = album;
  game.moment = (id, force) => album.unlock(id, force);
  if (season()) setTimeout(() => game.moment("season", true), 6000);
  // chụp ảnh: chớp sáng + màn trập, lưu dáng hiện tại thành polaroid
  game.photo = () => { if (scene.room !== B.room) { ev.emit("toast", { text: `${game.cat.name} không ở phòng này`, act: "Tới xem", fn: () => game.followCat(true) }); return; } const f = document.createElement("div"); f.className = "flash"; scene.S.vp.appendChild(f); setTimeout(() => f.remove(), 900); if (s.settings.sound) snd.shutter(); const c = album.photo(); ev.emit("photo", c); save(s); };
  // nhạc lo-fi
  game.music = (on = !music.on) => { s.settings.music = on; if (on) { music.start(scene.S.night > 0.5 ? 0.35 : 0.55); ev.emit("q", "music"); } else music.stop(); ev.emit("music", on); save(s); };
  game.musicResume = () => { if (s.settings.music && !music.on) music.start(scene.S.night > 0.5 ? 0.35 : 0.55); };
  addEventListener("visibilitychange", () => { if (document.hidden) save(s, true); });
  addEventListener("pagehide", () => save(s, true));

  // lịch thật đổi → nếu đang lệch chế độ thì cập nhật, và báo mèo đã điều chỉnh gì
  ev.on("calendar", () => { const st = schedule.ownerState(); if (!game.manualMode) game.setMode(st === "away" ? "cam" : "home"); lastState = st; });
  game.start = () => {
    game.calendar.refresh();
    requestAnimationFrame(frame);
    const uh = memory.usualHour(), gap = (Date.now() - (game.lastSeen0 || 0)) / 3600e3;
    if (uh != null && uh === new Date().getHours() && gap > 2 && game.roomAllowed("living")) {
      // ra cửa ngồi chờ đúng giờ bạn hay về
      scene.show("living", 0); B.setRoom("living", 240, 760, 0); B.face = 1; B.faceShown = 1;
      setTimeout(() => { game.say("waitdoor"); game.meow(1); }, 1200); brain.st.cur = "seek";
    } else if (gap > 3 && game.ownerHome() && bond.at("known")) {
      // vắng lâu mới mở app → mèo chạy ra đón tận nơi (đủ thân thì dụi đầu luôn vào màn hình)
      setTimeout(() => brain.interrupt(() => brain.ACTS.find((a) => a.id === "greet").run(), "greet"), 1600);
    } else setTimeout(() => game.say(game.age.stage === "kitten" ? "kitten" : "hello"), 900);
    brain.start();
  };
  game.setSkin = (k) => { s.skin = k; R.setSkin(k); save(s); };
  game.setHour = (h) => { s.settings.hour = h; scene.S.forceHour = h; scene.light(); save(s); };
  game.SPOTS = SPOTS;
  return game;
}

// ------------------------------------------------------------------ nhu cầu giảm theo thời gian
function decay(N, h, sleeping) {
  N.hunger = clamp(N.hunger - 7 * h, 0, 100);
  N.energy = clamp(N.energy + (sleeping ? 28 : -6) * h, 0, 100);
  N.fun = clamp(N.fun - 9 * h, 0, 100);
  N.social = clamp(N.social - 7 * h, 0, 100);
  N.hygiene = clamp(N.hygiene - 2.5 * h, 0, 100);
}

// ------------------------------------------------------------------ mô phỏng lúc vắng nhà
function offline(s, game) {
  const h = Math.min(48, (Date.now() - s.lastSeen) / 3600e3); if (h < 0.25) return null;
  const N = s.cat.needs; const start = { ...N };
  decay(N, h * 0.4, false); decay(N, h * 0.6, true);
  const happy = (N.hunger * 1.2 + N.energy * 0.6 + N.fun + N.social + N.hygiene * 0.7) / 450;
  const coins = Math.round(ECON.idlePerHour * Math.min(h, ECON.idleCapHours) * (0.4 + happy * 0.6));
  s.coins += coins;
  const r = rng(s.lastSeen + "|" + game.cat.id), ev = [];
  // camera ghi lại: các khối kế hoạch đã diễn ra trong lúc vắng (đúng lịch của bạn)
  const from = new Date(s.lastSeen), to = new Date();
  for (const b of game.schedule.blocksBetween(from, to).slice(-14)) {
    const info = ACT_INFO[b.act] || { vi: b.act, ic: "🐾" }, where = b.room ? ` · ${ROOMS[b.room]?.vi || ""}` : "";
    const text = `📹 ${info.ic} ${info.vi}${b.spot && SPOTS[b.spot] ? ` (${SPOTS[b.spot]})` : ""}${where}`, t = Math.max(b.start.getTime(), s.lastSeen);
    ev.push({ t, text }); log(s, "cam", text); s.journal[s.journal.length - 1].t = t;
  }
  // máy cho ăn tự động trong lúc vắng
  if (s.owner?.feederOn) for (let d = new Date(from); d <= to; d.setHours(24, 0, 0, 0)) for (const fh of s.owner.feeder) { const ft = new Date(d); ft.setHours(0, 0, 0, 0); ft.setTime(ft.getTime() + fh * 3600e3); if (ft > from && ft <= to) { ev.push({ t: ft.getTime(), text: "🤖 Máy cho ăn nhả hạt · 🐟 ăn sạch" }); log(s, "feeder", "🤖 Máy cho ăn nhả hạt"); N.hunger = clamp(N.hunger + 50, 0, 100); } }
  if (s.house.bowl && N.hunger < 60) { s.house.bowl = 0; N.hunger = clamp(N.hunger + 55, 0, 100); ev.push({ t: Date.now() - 1800e3, text: "🐟 Ăn hết bát bạn để sẵn" }); }
  if (h > 3) s.house.litter = Math.min(3, s.house.litter + Math.floor(h / 4));
  if (h > 1 && s.house.cup !== "broken" && r() < (game.quirks?.some((q) => q.id === "counterthief") ? 0.6 : 0.18)) { s.house.cup = "broken"; ev.push({ t: Date.now() - r() * 3600e3, text: "💥 Đẩy rơi cốc trên bàn bếp" }); log(s, "knock", "💥 Đẩy rơi cốc trên bàn bếp"); }
  ev.sort((a, b) => a.t - b.t);
  return { h, coins, events: ev, start, end: { ...N } };
}

// ------------------------------------------------------------------ TƯƠNG TÁC: vuốt ve, chọc, laser, len, lông vũ, kéo xem phòng
function interactions(game, root) {
  const { scene, body: B, brain, save: s } = game, N = s.cat.needs;
  const T = () => game.today.traits, mood = () => game.today.mood.id;
  let pet = null, pokes = [], drag = null, goodStrokes = 0;
  const dot = { on: false, x: 0, y: 0, el: null, t: 0 }, yarn = { el: null, x: 0, y: 0 };
  const kOf = () => (game.cat.scale || 0.6) * depth(B.y) * (B.ageScale || 1);

  function local(p) { const k = kOf(); return { lx: ((p.x - B.x) / k) * B.face, ly: (p.y - (B.y - B.h)) / k }; }
  const zoneOf = ({ lx, ly }) => (lx > 35 ? (ly < -175 ? "head" : "chin") : lx < -60 ? "tail" : "back");

  function hearts(n = 1, bad = false) {
    for (let i = 0; i < n; i++) { const h = document.createElement("div"); h.className = "fx-heart" + (bad ? " bad" : ""); h.textContent = bad ? "💢" : "♥"; const k = kOf(); h.style.left = B.x + rand(-40, 40) * k * 2 + "px"; h.style.top = B.y - B.h - rand(120, 190) * k + "px"; scene.topfx.appendChild(h); setTimeout(() => h.remove(), 1400); }
  }
  game.hearts = hearts;
  function scratchMarks(cx, cy) { const m = document.createElement("div"); m.className = "scratch"; m.style.left = cx - 40 + "px"; m.style.top = cy - 40 + "px"; m.innerHTML = `<svg viewBox="0 0 80 80"><path d="M14 10 L46 66"/><path d="M30 6 L60 62"/><path d="M46 8 L72 54"/></svg>`; document.body.appendChild(m); setTimeout(() => m.classList.add("out"), 900); setTimeout(() => m.remove(), 1500); }

  // ---------------- vuốt ve
  function petStart(e) {
    if (game.mode === "cam") { game.emit("toast", { text: "📹 Bạn đang xem qua camera – về nhà mới vuốt được 😿" }); pet = null; return; }
    snd.unlock(); const p = scene.toRoom(e.clientX, e.clientY);
    pet = { id: e.pointerId, last: p, acc: 0, dx: 0, strokes: 0, t0: performance.now(), sx: e.clientX, sy: e.clientY, moved: false };
    if (B.move || B.jump || brain.sleeping) brain.interrupt(async () => { if (B.h === 0 && brain.sleeping) B.say(line("wake", mood())); await B.act(B.h > 0 ? "loaf" : "idle", 60000); }, "pet");
  }
  function petMove(e) {
    const p = scene.toRoom(e.clientX, e.clientY), dx = p.x - pet.last.x, dy = p.y - pet.last.y;
    if (Math.hypot(e.clientX - pet.sx, e.clientY - pet.sy) > 10) pet.moved = true;
    pet.acc += Math.hypot(dx, dy); pet.dx += dx * B.face; pet.last = p;
    if (pet.acc > 70) { stroke(zoneOf(local(p)), pet.dx < 0, e); pet.acc = 0; pet.dx = 0; }
  }
  function leave(run) { brain.interrupt(async () => { await brain.down(); const rooms = Object.keys(ROOMS).filter((r) => r !== B.room && game.roomAllowed(r)); await brain.goRoom(pick(rooms), run ? "run" : "walk"); }, "sulk"); }
  function swat(e) { B.say(line("pet_hate", mood())); hearts(1, true); if (s.settings.sound) snd.hiss(); snd.purr(false); B.wobble = 0; scratchMarks(e.clientX, e.clientY); }
  function stroke(zone, withFur, e) {
    const t = T(), mem = game.memory, tol = 3 + t.affectionate * 7 - t.sassy * 2 - (mood() === "grumpy" ? 3 : 0) - (mem.angry ? 3 : 0);
    pet.strokes++; s.stats.pets++;
    // khoe bụng: 1 lần gãi là biết – được thương, hay dính bẫy
    if (game.belly && !game.belly.done) {
      game.belly.done = true; const trap = Math.random() < 0.6 - game.bond.tier * 0.06 + t.sassy * 0.15;
      if (trap) { game.say("belly_trap", null, 1800); swat(e); game.buzz([20, 40, 20]); game.moment("belly_trap", true); petEnd(null, true); brain.interrupt(async () => { await B.act("belly_trap", 1400); await B.act("crouch", 600); const w = ROOMS[B.room].walk; await B.walkTo(clamp(B.x + (B.x < (w.x0 + w.x1) / 2 ? 260 : -260), w.x0, w.x1), B.y, { gait: "run" }); await B.act("groom", 3000); }, "pet"); }
      else { game.say("belly_ok", null, 2200); hearts(3); game.bond.gain(0.6, "belly"); game.moment("belly_ok", true); if (s.settings.sound) snd.purr(true); B.wobble = 0.7; }
      return;
    }
    if (zone === game.today.hateZone && (Math.random() < 0.5 + t.sassy * 0.4)) {
      swat(e); mem.pet(zone, false); mem.offend(25, "chạm chỗ ghét"); N.social = clamp(N.social - 4, 0, 100); petEnd(null, true);
      brain.interrupt(async () => { await B.act("crouch", 700); await brain.down(); const w = ROOMS[B.room].walk; await B.walkTo(B.x < (w.x0 + w.x1) / 2 ? w.x1 - 100 : w.x0 + 100, B.y, { gait: "run" }); await B.act("groom", 4000); }, "sulk");
      return;
    }
    if ((!withFur && zone !== "chin") || (mem.angry && Math.random() < 0.5)) {
      game.say(mem.angry ? "sulk" : "pet_bad"); hearts(1, true); snd.purr(false); B.wobble = 0; mem.pet(zone, false); mem.offend(mem.angry ? 6 : 12, "vuốt ngược lông");
      if (mem.spend(10) < 12) { swat(e); petEnd(null, true); leave(true); return; }
      game.R.play(game.R.resolve("crouch"), { dur: 200 }); setTimeout(() => !pet || game.R.play(game.R.resolve(B.h > 0 ? "loaf" : "idle")), 500); return;
    }
    const like = zone === game.today.likeZone || mem.learnedLike(zone); if (like) game.emit("q", "pet_like");
    if (pet.strokes > tol + (like ? 4 : 0) || mem.spend(like ? 1 : 2.5) < 15) { game.say("annoyed"); petEnd(null, true); leave(false); return; }
    mem.pet(zone, true);
    N.social = clamp(N.social + (like ? 7 : 4), 0, 100); game.bond.gain(like ? 0.6 : 0.3, "pet");
    hearts(like ? 2 : 1); B.wobble = like ? 0.9 : 0.5; if (s.settings.sound) snd.purr(true);
    if (pet.strokes === 2 || like && pet.strokes % 3 === 1) game.say("pet_good", null, 1800);
    if (pet.strokes === 3 && like) game.R.play(game.R.resolve(B.h > 0 ? "loaf" : "lie"));
    if (++goodStrokes % 3 === 0) game.coins(ECON.petGood, "pet");
    if (zone === game.today.likeZone && !s.found?.[game.today.key]) { s.found = { [game.today.key]: 1 }; game.emit("toast", { text: `Phát hiện: hôm nay ${game.cat.name} thích được gãi ${({ head: "đỉnh đầu", chin: "cằm", back: "lưng", tail: "gốc đuôi" })[zone]} 💡` }); log(s, "found", `💡 Thích được gãi ${zone}`); }
  }
  function petEnd(e, abrupt) {
    if (!pet) return; const p = pet; pet = null; snd.purr(false); B.wobble = 0;
    if (!p.moved && !abrupt) return tap();
    if (!abrupt) brain.interrupt(async () => { await B.act(B.h > 0 ? "loaf" : "idle_tail", 3500); await B.act("groom", 3000); }, "groom");
  }
  // chạm 1 lần = chọc · chạm đúp = đưa tay "đập tay"
  let tapT = 0, tapTimer = 0;
  function tap() {
    const now = Date.now();
    if (now - tapT < 340) { clearTimeout(tapTimer); tapT = 0; return highfive(); }
    tapT = now; tapTimer = setTimeout(poke, 340);
  }
  function highfive() {
    const mem = game.memory, lv = mem.level("highfive");
    const p = clamp(0.12 + lv * 0.17 + T().affectionate * 0.15 + (mood() === "clingy" ? 0.15 : 0) - (mem.angry ? 0.3 : 0), 0.03, 0.95);
    const ok = !brain.sleeping && Math.random() < p; mem.xp("highfive", ok ? 2 : 1);
    brain.interrupt(async () => {
      if (ok) { game.emit("q", "highfive"); game.moment("highfive"); game.R.play(game.R.resolve("groom"), { dur: 160 }); hearts(1); const f = document.createElement("div"); f.className = "fx-heart"; f.textContent = "🖐️"; const k = kOf(); f.style.left = B.x + B.face * 60 * k + "px"; f.style.top = B.y - B.h - 150 * k + "px"; scene.topfx.appendChild(f); setTimeout(() => f.remove(), 1400);
        game.say("highfive_ok", null, 1800); game.coins(1, "highfive"); game.bond.gain(0.5, "highfive"); await B.wait(700); await B.act(B.h > 0 ? "loaf" : "idle_tail", 3000); }
      else { game.say("highfive_no", null, 1600); await B.act("look_up", 1800); await B.act(B.h > 0 ? "loaf" : "idle_tail", 2000); }
    }, "pet");
  }
  function poke() {
    const mem = game.memory; game.meow(1);
    if (brain.sleeping) { game.say("wake"); mem.spend(8); brain.interrupt(async () => { await B.act("stretch", 2200); }); return; }
    const left = mood() === "clingy" ? mem.spend(4) : mem.spend(14);
    if (left < 10) { swat({ clientX: innerWidth / 2, clientY: innerHeight / 2 }); mem.offend(15, "bị chọc hoài"); leave(true); return; }
    if (left < 28) { game.say("annoyed"); mem.offend(6, "bị chọc hoài"); leave(true); return; }
    game.say("poke", null, 1800);
    brain.interrupt(async () => { await B.act("look_up", 1600); await B.act(B.h > 0 ? "loaf" : "idle_tail", 3000); });
  }

  // ---------------- đồ chơi
  function laserEl() { if (!dot.el) { dot.el = document.createElement("div"); dot.el.className = "laser"; } if (!dot.el.isConnected) scene.topfx.appendChild(dot.el); return dot.el; }
  function laserAt(p) { const w = ROOMS[scene.room].walk; dot.x = clamp(p.x, w.x0, w.x1); dot.y = clamp(p.y, w.y0 - 30, w.y1 + 10); dot.on = true; dot.t = performance.now(); const el = laserEl(); el.style.transform = `translate(${dot.x}px, ${dot.y}px)`; el.classList.add("on"); }
  async function chase(kind) {
    const t = T(); if (mood() === "sleepy" && Math.random() < 0.6 || brain.sleeping) { B.say(line("play", "sleepy")); await B.act("look_up", 3000); return; }
    if (B.room !== scene.room) await brain.goRoom(scene.room, "run");
    if (kind === "laser" && game.quirks.some((q) => q.laser) && Math.random() < 0.65) { B.say("Chấm đỏ. Lại trò này."); await B.act("loaf", 4000); return; }
    await brain.down(); const until = performance.now() + (25 + t.playful * 45) * 1000; let hits = 0;
    const lv = game.memory.level("hunter"), reach = 280 + lv * 40, catchR = 70 + lv * 10; B.agility = 1 + lv * 0.07; const sm0 = B.speedMul; B.speedMul = sm0 * (1 + lv * 0.06);
    while (game.tool === kind && performance.now() < until) {
      if (!dot.on || performance.now() - dot.t > 2500) { if (dot.on) dot.el?.classList.remove("on"); dot.on = false; await B.act("crouch", 700); continue; }
      const dx = dot.x - B.x, dy = dot.y - B.y, dist = Math.hypot(dx, dy); B.faceTo(dx);
      if (kind === "feather" && dist < 140 + lv * 15) { await B.jumpTo(B.x + Math.sign(dx) * 20, B.y, 0, null, { apex: 90 + lv * 20 }); hits++; game.emit("q", "play_hit"); game.memory.xp("hunter", 1); N.fun = clamp(N.fun + 5, 0, 100); if (hits % 3 === 0) B.say(line("play", mood()), 1500); continue; }
      if (dist < catchR) { game.emit("q", "play_hit"); game.memory.xp("hunter", 1); game.memory.appease(6); await B.act("crouch", 300); dot.on = false; dot.el?.classList.remove("on"); hits++; N.fun = clamp(N.fun + 6, 0, 100); N.energy = clamp(N.energy - 1, 0, 100); B.say(line(Math.random() < 0.5 ? "laser_miss" : "play", mood()), 1500); await B.act("look_up", 900); continue; }
      if (dist < reach && Math.random() < 0.7 + lv * 0.04) { await B.act("crouch", 380 + Math.random() * 400); await B.jumpTo(dot.x, dot.y, 0, null); continue; }
      const step = Math.min(dist - 40, dist > 520 ? 260 : 150);
      await B.walkTo(B.x + (dx / dist) * step, B.y + (dy / dist) * step, { gait: dist > 400 ? "run" : "stalk" });
    }
    B.agility = 1; B.speedMul = sm0;
    if (hits) { s.stats.plays++; game.coins(ECON.play, "play"); game.bond.gain(0.8, "play"); log(s, "play", `${kind === "laser" ? "🔴" : "🪶"} Chơi ${hits} lượt`); }
    await B.act("loaf", 2500);
  }
  function throwYarn(p) {
    const w = ROOMS[scene.room].walk; const x = clamp(p.x, w.x0 + 40, w.x1 - 40), y = clamp(p.y, w.y0, w.y1);
    if (!yarn.el) { yarn.el = document.createElement("div"); yarn.el.className = "yarn"; yarn.el.innerHTML = `<svg viewBox="-30 -30 60 60"><circle r="26" fill="#D9534F"/><path d="M-22 -10 Q0 -30 22 -8 M-25 4 Q0 -18 25 6 M-18 16 Q2 -2 20 18 M-8 -24 Q14 0 -4 25" stroke="#F08A7E" stroke-width="3.5" fill="none"/><path d="M20 18 q20 10 34 2" stroke="#D9534F" stroke-width="3" fill="none"/></svg>`; }
    scene.actors.appendChild(yarn.el);
    const S = scene.S, x0 = S.cam + S.viewW / 2, y0 = 900, t0 = performance.now(), dur = 650;
    const fly = (t) => { const u = Math.min(1, (t - t0) / dur), xx = lerp(x0, x, u), yy = lerp(y0, y, u) - Math.sin(u * Math.PI) * 260; yarn.el.style.transform = `translate(${xx}px, ${yy}px) rotate(${u * 720}deg)`; yarn.el.style.zIndex = Math.round(yy); if (u < 1) requestAnimationFrame(fly); };
    requestAnimationFrame(fly); yarn.x = x; yarn.y = y;
    brain.interrupt(async () => {
      if (B.room !== scene.room) await brain.goRoom(scene.room, "run");
      if (mood() === "sleepy" && Math.random() < 0.5) { B.say(line("play", "sleepy")); await B.act("look_up", 2500); return; }
      await brain.down(); await B.wait(500); await B.act("crouch", 500);
      await B.walkTo(yarn.x - Math.sign(yarn.x - B.x) * 70, yarn.y, { gait: Math.abs(yarn.x - B.x) > 300 ? "run" : "stalk" });
      B.faceTo(yarn.x - B.x); await B.act("play_yarn", 5000); N.fun = clamp(N.fun + 18, 0, 100); game.memory.appease(10); game.emit("q", "play_hit");
      if (Math.random() < 0.5) await B.act("roll_play", 3000); B.say(line("play", mood()), 1600); s.stats.plays++; game.coins(ECON.play, "play"); log(s, "play", "🧶 Chơi len");
    }, "selfplay");
  }

  // ---------------- con trỏ trên màn hình
  const vp = scene.S.vp;
  vp.addEventListener("pointerdown", (e) => {
    game.lastInput = Date.now(); game.musicResume?.();
    snd.unlock();
    if (e.target.closest(".cat-hit") && !game.tool) { vp.setPointerCapture(e.pointerId); petStart(e); return; }
    const p = scene.toRoom(e.clientX, e.clientY);
    if (game.tool === "laser" || game.tool === "feather") { vp.setPointerCapture(e.pointerId); laserAt(p); drag = { tool: 1 }; if (brain.activity !== "chase-" + game.tool) { const k = game.tool; brain.interrupt(() => chase(k), "chase-" + k); } return; }
    if (game.tool === "yarn") { throwYarn(p); game.setTool(null); return; }
    drag = { x: e.clientX, sx: e.clientX, moved: false }; vp.setPointerCapture(e.pointerId);
  });
  vp.addEventListener("pointermove", (e) => {
    if (pet) return petMove(e);
    if (drag?.tool) return laserAt(scene.toRoom(e.clientX, e.clientY));
    if (drag) { const dx = e.clientX - drag.x; drag.x = e.clientX; if (Math.abs(e.clientX - drag.sx) > 8) drag.moved = true; if (drag.moved) scene.pan(-dx / scene.S.sc); }
  });
  const up = (e) => { if (pet) petEnd(e); drag = null; };
  vp.addEventListener("pointerup", up); vp.addEventListener("pointercancel", up);
  vp.addEventListener("keydown", (e) => { if (e.target.closest(".cat-hit") && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); poke(); } });

  game.setTool = (k) => { game.tool = k; vp.dataset.tool = k || ""; if (!k) { dot.on = false; dot.el?.classList.remove("on"); } game.emit("tool", k); };
  return (dt) => {
    if (dot.el && dot.on && game.tool === "feather") dot.el.classList.add("feather"); else dot.el?.classList.remove("feather");
  };
}
export { APP, hhmm };
