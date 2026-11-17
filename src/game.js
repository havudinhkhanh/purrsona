// Bộ điều phối: nối sân khấu chì + thân mèo + bộ não + bộ học chữ + lưu trữ + tương tác người chơi.
import { APP, CHILL, can, SKINS } from "./config.js";
import { load, save, log } from "./core/store.js";
import { bus, clamp, dayKey, rand, pick, lerp } from "./core/util.js";
import * as snd from "./core/sound.js";
import { music } from "./core/music.js";
import { createYard } from "./world/yard.js";
import { createCritters } from "./world/critters.js";
import { createCatRenderer } from "./render/registry.js";
import { createBody, depth, CANCEL } from "./cat/body.js";
import { createBrain } from "./cat/brain.js";
import { today as todayOf, quirksOf, obsessionOf, ageOf } from "./cat/personality.js";
import { createMemory } from "./cat/memory.js";
import { createBond } from "./cat/bond.js";
import { aiLine } from "./cat/voice.js";
import { line, setNames } from "./cat/lines.js";
import { createLearn } from "./learn/srs.js";
import { LANGS } from "./learn/packs.js";
import { speak } from "./learn/tts.js";
import { noteToday } from "./meta/note.js";
import { createCloseup } from "./ui/closeup.js";
import { createWall } from "./ui/wall.js";

export async function createGame(root) {
  const ev = bus();
  const s = load();
  const game = { save: s, emit: ev.emit, on: ev.on, tool: null };
  game.can = (f) => can(s.plan, f);

  // ------------------------------------------------------------------ mèo + trí nhớ + học
  let R;
  try { R = await createCatRenderer(s.catId); } catch (e) { console.warn("không tải được mèo", s.catId, e); s.catId = "nana"; R = await createCatRenderer("nana"); }
  await R.ready; R.reduced = s.settings.reduced;
  game.cat = R.manifest; game.R = R;
  game.today = todayOf(game.cat);
  s.cat.adopted ||= s.created;
  game.quirks = quirksOf(game.cat, s.cat.adopted); game.obsession = obsessionOf(game.cat); game.age = ageOf(s.cat.adopted);
  game.journal = (type, text) => { log(s, type, text); save(s); };
  game.lastSeen0 = s.lastSeen; game.lastInput = Date.now();
  game.awayH = (Date.now() - (s.lastSeen || Date.now())) / 3600e3;
  setNames({ cat: game.cat.name, sen: s.profile.nick || "Sen" });
  game.setNick = (n) => { s.profile.nick = (n || "").trim().slice(0, 16) || "Sen"; setNames({ sen: s.profile.nick }); save(s); };
  const memory = createMemory(game); game.memory = memory; memory.tick();
  const bond = createBond(game); game.bond = bond;
  const learn = createLearn(game); game.learn = learn;
  // phụ kiện mở theo số hoa
  game.skinOpen = (k) => { const sk = SKINS.find((x) => x.id === k); return !!sk && learn.mastered().length >= sk.flowers && (!sk.feat || game.can(sk.feat)); };
  if (!game.skinOpen(s.skin)) s.skin = "classic"; R.setSkin(s.skin);
  // ghé mỗi ngày
  const d0 = dayKey();
  if (s.visits.last !== d0) { const y = new Date(); y.setDate(y.getDate() - 1); s.visits.streak = s.visits.last === dayKey(y) ? s.visits.streak + 1 : 1; s.visits.last = d0; game.newDay = true; }
  // bỏ học ≥ 2 ngày → mèo dỗi một chút (nguôi khi học lại)
  const lastStudy = Object.keys(s.learn.days).sort().pop();
  if (lastStudy && (Date.now() - new Date(lastStudy).getTime()) / 864e5 > 2.5) memory.offend(30, "bỏ học mấy ngày");
  game.note = noteToday(game);

  // ------------------------------------------------------------------ khu vườn (một cảnh, nhìn từ trên xuống)
  const yard = createYard(root); game.yard = yard; game.scene = yard;
  yard.S.forceHour = s.settings.hour; yard.light();
  const B = createBody(R, yard); game.body = B;
  const p0 = s.cat.uv || { u: 50, v: 50 }, [x0, y0] = yard.P(p0.u, p0.v);
  B.setRoom("yard", x0, y0, 0); B.mount();
  // đổi cỡ màn hình → giữ mèo đúng chỗ trên mặt đất
  let catUV = { ...p0 };
  yard.onLayout = () => { const [x, y] = yard.P(catUV.u, catUV.v); B.cancel(); B.x = x; B.y = y; B.h = 0; B.perch = null; };
  B.speedMul = (0.92 + ((game.today.mood.speed || 1) - 1) * 0.4) * game.age.speed * CHILL.speed; B.ageScale = game.age.scale; R.durMul = CHILL.transition; B.runMul = CHILL.run; B.accelT = CHILL.accel; game.chill = CHILL;
  const critters = createCritters(game); game.critters = critters;
  const plant = () => yard.setWords(learn.mastered().filter((c) => c.lang === learn.lang));
  plant(); ev.on("lang", plant);

  // nói: chữ viết tay hiện cạnh mèo (câu có sẵn hiện ngay, câu AI – gói Pro – về kịp thì thay)
  game.lineOf = (key, vars) => line(key, game.today.mood.id, null, vars);
  game.sayLine = (t, ms = 3200) => { B.say(t, ms); return t; };
  game.say = (key, room, ms, vars) => {
    const t = line(key, game.today.mood.id, room, vars); B.say(t, ms || 3200);
    aiLine(game, key, t, vars).then((a) => { if (a && B.sayUntil > performance.now()) B.say(a, ms || 3200); });
    return t;
  };
  game.persist = () => save(s);
  // ---- KHÁY: câu cộc lốc hiện tooltip cạnh mèo. Có giãn cách để không lải nhải.
  let lastJab = 0, lastWrong = null;
  game.jab = (key, vars, force = false) => {
    const now = performance.now(); if (!force && now - lastJab < 6000) return null;
    if (!force && B.sayUntil > now) return null;
    lastJab = now; return game.say(key, null, 4200, vars);
  };
  const jabTick = () => {
    if (!game.attention() || brain.sleeping) return;
    const t = learn.todo(), r = Math.random();
    if (lastWrong && Date.now() - lastWrong.t < 6 * 6e4 && r < 0.35) return game.jab("jab_wrong_recent", { w: lastWrong.w });
    if (t.due + t.neu === 0 && learn.studiedToday()) return game.jab(r < 0.5 ? "jab_done" : "jab_misc");
    if (r < 0.4) return game.nag();
    return game.jab(r < 0.7 ? "jab_idle" : "jab_misc");
  };
  const jabLoop = () => setTimeout(() => { if (s.settings.nag !== false) jabTick(); jabLoop(); }, (18 + Math.random() * 27) * 1000);

  // ------------------------------------------------------------------ nhu cầu (nhẹ) + tiện ích
  const N = s.cat.needs;
  game.meow = (n = 1) => { if (s.settings.sound) snd.meow(n, game.cat.voicePitch || 1); };
  game.purr = (on) => { if (!on || s.settings.sound) snd.purr(on); };
  const buzz = (p) => { if (s.settings.haptics !== false && navigator.userActivation?.hasBeenActive !== false) try { navigator.vibrate?.(p); } catch { /* không hỗ trợ */ } };
  game.buzz = buzz;
  game.ownerHome = () => true;
  game.attention = () => !document.hidden && !game.sheetOpen?.() && !game.closeup?.busy && game.wall?.mode !== "quiz";
  game.closeup = createCloseup(game, root);
  game.speakCard = (c, ex = false) => { if (!c || !s.settings.tts) return; speak(ex ? c.ex : c.w, LANGS[c.lang].tts, s.settings.rate || 0.9); };
  game.call = () => {
    const t = game.today.traits, lv = memory.level("callname");
    const will = Math.random() < clamp(0.25 + t.affectionate * 0.6 + N.social / 300 - t.sassy * 0.25 + lv * 0.08 + (game.today.mood.id === "clingy" ? 0.4 : 0) - (memory.angry ? 0.5 - lv * 0.1 : 0), 0.05, 0.97);
    memory.xp("callname", will ? 2 : 1);
    if (memory.angry && !will) return game.say("angry_call");
    if (brain.sleeping && Math.random() < 0.6) return game.say("wake");
    if (will) brain.interrupt(async () => { game.say("call_yes"); game.meow(1); await brain.comeTo(); N.social = clamp(N.social + 8, 0, 100); await B.act("idle_tail", 8000); }, "seek");
    else game.say("call_no");
  };
  /** mèo kháy theo tình hình học */
  game.nag = () => {
    const t = learn.todo(), sk = learn.streakAlive(), h = new Date().getHours();
    if (t.due + t.neu === 0) return game.say(learn.studiedToday() ? "done" : "idle_tap");
    if (sk >= 2 && !learn.studiedToday() && h >= 19) return game.say("nag_streak", null, 3600, { n: sk });
    if (Math.random() < 0.25) { const w = learn.weak(3)[0] || learn.due()[0]; if (w) return game.say("forgot", null, 3600, { w: w.w }); }
    if (t.due) return game.say("nag_due", null, 3600, { n: t.due });
    return game.say("nag_new", null, 3600, { n: t.neu });
  };
  /** mèo đố bất chợt: HUD hiện thẻ đố, trả kết quả */
  game.catQuiz = async () => {
    const pool = [...learn.due(), ...learn.learning(), ...learn.mastered().filter((c) => c.lang === learn.lang)]; const c = pick(pool); if (!c) return;
    game.say("quiz_ask", null, 4000, { w: c.w });
    game.wall?.quiz(c, "cat");
  };

  // phản ứng của mèo khi bạn trả lời (trong bài học hoặc đố nhanh)
  ev.on("learn", (e) => {
    if (e.type !== "answer") return; const c = learn.card(e.id);
    if (!e.ok && c) lastWrong = { w: c.w, t: Date.now() };
    N.fun = clamp(N.fun + (e.ok ? 2 : 0), 0, 100); N.social = clamp(N.social + 1, 0, 100);
    if (e.ok) { memory.appease(3); if (e.combo >= 5 && e.combo % 5 === 0) bond.gain(0.3, "combo"); }
    if (e.mastered) { bond.gain(1, "master"); game.journal("master", `🌼 Thuộc “${c.w}”`); ev.emit("bloom", c); }
    save(s);
  });
  // phản ứng của mèo ngoài bài học: câu ngắn theo đúng/sai
  game.react = (r, c) => {
    const vars = { w: c.w, vi: c.vi, n: r.combo };
    if (!r.ok) return line(r.lapses >= 2 ? "lapse" : "wrong", game.today.mood.id, null, { ...vars, n: r.lapses + 1 });
    if (r.mastered) return line("master", game.today.mood.id, null, { ...vars, n: Math.max(1, Math.round((Date.now() - (learn.stat(c.id).added || Date.now())) / 864e5)) });
    if (r.combo >= 3 && r.combo % 3 === 0) return line("combo", game.today.mood.id, null, vars);
    return line("ok", game.today.mood.id, null, vars);
  };

  // ------------------------------------------------------------------ vòng lặp khung hình
  let last = 0, tHud = 0, tLight = 0, tNeeds = 0, tMem = 0, tBlink = 4000;
  function frame(t) {
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t;
    B.tick(dt);
    catUV = yard.unP(B.x, B.y); s.cat.uv = catUV;
    critters.tick(dt);
    if (t - tLight > 30000) { tLight = t; yard.light(); if (dayKey() !== game.today.key) { game.today = todayOf(game.cat); ev.emit("mood"); } }
    if (t - tNeeds > 1000) { const h = (t - tNeeds) / 3600e3; tNeeds = t; if (h < 0.01) decay(N, h, brain.sleeping); s.cat.x = B.x; s.cat.y = B.y; save(s); }
    if (t - tHud > 400) { tHud = t; ev.emit("tick"); }
    if (t - tMem > 1000) { tMem = t; memory.tick(); if (!document.hidden) memory.visit(); }
    if (t > tBlink && !brain.sleeping && !B.moving()) { const slow = s.cat.bond >= 25 && !memory.angry && Math.random() < 0.12; R.blink(slow); tBlink = t + rand(2.4, 6.5) * 1000; if (slow) bond.gain(0.1, "blink"); }
    tick2(dt);
    requestAnimationFrame(frame);
  }
  const brain = createBrain(game); game.brain = brain;
  const tick2 = interactions(game, root);
  game.music = (on = !music.on) => { s.settings.music = on; if (on) music.start(yard.S.night > 0.5 ? 0.35 : 0.5); else music.stop(); ev.emit("music", on); save(s); };
  game.musicResume = () => { if (s.settings.music && !music.on) music.start(yard.S.night > 0.5 ? 0.35 : 0.5); };
  addEventListener("visibilitychange", () => { if (document.hidden) save(s, true); });
  addEventListener("pagehide", () => save(s, true));
  ev.on("bloom", plant);
  ev.on("hot", (e) => { const h = learn.hotToday()[0]; if (e.fresh && h) setTimeout(() => game.jab("hot_new", { w: h.card.w }, true), 2500); });

  game.start = () => {
    game.wall = createWall(game, root);
    game.on("flower", (c) => game.wall.whisper(`${c.w}${c.ph ? " · " + c.ph : ""} = ${c.vi}`));
    game.on("toast", (o) => game.wall.whisper(o.text));
    requestAnimationFrame(frame);
    critters.ambient();
    const gap = game.awayH, h = new Date().getHours(), t = learn.todo();
    if (gap > 3 && bond.at("known")) setTimeout(() => brain.interrupt(() => brain.ACTS.find((a) => a.id === "greet").run(), "greet"), 1600);
    else if (gap > 48) setTimeout(() => game.say("back", null, 3600, { d: Math.floor(gap / 24) }), 1200);
    else setTimeout(() => game.say(h < 10 ? "morning" : h >= 22 ? "night" : game.age.stage === "kitten" ? "kitten" : "hello", null, 3200, { n: t.neu + t.due }), 1100);
    brain.start(); jabLoop();
  };
  game.setSkin = (k) => { if (!game.skinOpen(k)) return false; s.skin = k; R.setSkin(k); save(s); return true; };
  game.setHour = (h) => { s.settings.hour = h; yard.S.forceHour = h; yard.light(); save(s); };
  return game;
}

// ------------------------------------------------------------------ nhu cầu giảm theo thời gian
function decay(N, h, sleeping) {
  N.energy = clamp(N.energy + (sleeping ? 28 : -6) * h, 0, 100);
  N.fun = clamp(N.fun - 9 * h, 0, 100);
  N.social = clamp(N.social - 7 * h, 0, 100);
}

// ------------------------------------------------------------------ TƯƠNG TÁC: vuốt ve, chọc, đập tay, chạm hoa, kéo xem
function interactions(game, root) {
  const { scene, body: B, brain, save: s } = game, N = s.cat.needs;
  const T = () => game.today.traits, mood = () => game.today.mood.id;
  let pet = null, goodStrokes = 0;
  const kOf = () => (game.cat.scale || 0.6) * game.yard.depth(B.y) * (B.ageScale || 1);
  function local(p) { const k = kOf(); return { lx: ((p.x - B.x) / k) * B.face, ly: (p.y - (B.y - B.h)) / k }; }
  const zoneOf = ({ lx, ly }) => (lx > 35 ? (ly < -175 ? "head" : "chin") : lx < -60 ? "tail" : "back");
  function hearts(n = 1, bad = false) {
    for (let i = 0; i < n; i++) { const h = document.createElement("div"); h.className = "fx-heart" + (bad ? " bad" : ""); h.textContent = bad ? "✗" : "♥"; const k = kOf(); h.style.left = B.x + rand(-40, 40) * k * 2 + "px"; h.style.top = B.y - B.h - rand(120, 190) * k + "px"; game.yard.topfx.appendChild(h); setTimeout(() => h.remove(), 1400); }
  }
  game.hearts = hearts;
  function scratchMarks(cx, cy) { const m = document.createElement("div"); m.className = "scratch"; m.style.left = cx - 40 + "px"; m.style.top = cy - 40 + "px"; m.innerHTML = `<svg viewBox="0 0 80 80"><path d="M14 10 L46 66"/><path d="M30 6 L60 62"/><path d="M46 8 L72 54"/></svg>`; document.body.appendChild(m); setTimeout(() => m.classList.add("out"), 900); setTimeout(() => m.remove(), 1500); }

  function petStart(e) {
    snd.unlock(); const p = scene.toRoom(e.clientX, e.clientY);
    pet = { id: e.pointerId, last: p, acc: 0, dx: 0, strokes: 0, sx: e.clientX, sy: e.clientY, moved: false };
    if (B.move || B.jump || brain.sleeping) brain.interrupt(async () => { if (B.h === 0 && brain.sleeping) B.say(line("wake", mood())); await B.act(B.h > 0 ? "loaf" : "idle", 60000); }, "pet");
  }
  function petMove(e) {
    const p = scene.toRoom(e.clientX, e.clientY), dx = p.x - pet.last.x, dy = p.y - pet.last.y;
    if (Math.hypot(e.clientX - pet.sx, e.clientY - pet.sy) > 10) pet.moved = true;
    pet.acc += Math.hypot(dx, dy); pet.dx += dx * B.face; pet.last = p;
    if (pet.acc > 70) { stroke(zoneOf(local(p)), pet.dx < 0, e); pet.acc = 0; pet.dx = 0; }
  }
  function leave(run) { brain.interrupt(async () => { await brain.down(); const p = game.yard.rand(); await brain.goUV(p.u, p.v, run ? "run" : "walk"); }, "sulk"); }
  function swat(e) { B.say(line("pet_hate", mood())); hearts(1, true); if (s.settings.sound) snd.hiss(); snd.purr(false); B.wobble = 0; scratchMarks(e.clientX, e.clientY); }
  function stroke(zone, withFur, e) {
    const t = T(), mem = game.memory, tol = 3 + t.affectionate * 7 - t.sassy * 2 - (mood() === "grumpy" ? 3 : 0) - (mem.angry ? 3 : 0);
    pet.strokes++; s.stats.pets++;
    if (game.belly && !game.belly.done) {
      game.belly.done = true; const trap = Math.random() < 0.6 - game.bond.tier * 0.06 + t.sassy * 0.15;
      if (trap) { game.say("belly_trap", null, 1800); swat(e); game.buzz([20, 40, 20]); petEnd(null, true); brain.interrupt(async () => { await B.act("belly_trap", 1400); await B.act("crouch", 600); const p = game.yard.rand(); await brain.goUV(p.u, p.v, "run"); await B.act("groom", 3000); }, "pet"); }
      else { game.say("belly_ok", null, 2200); hearts(3); game.bond.gain(0.6, "belly"); game.purr(true); B.wobble = 0.7; }
      return;
    }
    if (zone === game.today.hateZone && Math.random() < 0.5 + t.sassy * 0.4) {
      swat(e); mem.pet(zone, false); mem.offend(25, "chạm chỗ ghét"); N.social = clamp(N.social - 4, 0, 100); petEnd(null, true);
      brain.interrupt(async () => { await B.act("crouch", 700); await brain.down(); const p = game.yard.rand(); await brain.goUV(p.u, p.v, "run"); await B.act("groom", 4000); }, "sulk");
      return;
    }
    if ((!withFur && zone !== "chin") || (mem.angry && Math.random() < 0.5)) {
      game.say(mem.angry ? "sulk" : "pet_bad"); hearts(1, true); snd.purr(false); B.wobble = 0; mem.pet(zone, false); mem.offend(mem.angry ? 6 : 12, "vuốt ngược lông");
      if (mem.spend(10) < 12) { swat(e); petEnd(null, true); leave(true); }
      return;
    }
    const like = zone === game.today.likeZone || mem.learnedLike(zone);
    if (pet.strokes > tol + (like ? 4 : 0) || mem.spend(like ? 1 : 2.5) < 15) { game.say("annoyed"); petEnd(null, true); leave(false); return; }
    mem.pet(zone, true); N.social = clamp(N.social + (like ? 7 : 4), 0, 100); game.bond.gain(like ? 0.4 : 0.2, "pet");
    hearts(like ? 2 : 1); B.wobble = like ? 0.9 : 0.5; game.purr(true);
    if (pet.strokes === 2 || (like && pet.strokes % 3 === 1)) game.say("pet_good", null, 1800);
    if (pet.strokes === 3 && like) game.R.play(game.R.resolve(B.h > 0 ? "loaf" : "lie"));
    if (++goodStrokes % 6 === 0 && game.learn.todo().due) setTimeout(() => game.nag(), 1800);
  }
  function petEnd(e, abrupt) {
    if (!pet) return; const p = pet; pet = null; snd.purr(false); B.wobble = 0;
    if (!p.moved && !abrupt) return tap();
    if (!abrupt) brain.interrupt(async () => { await B.act(B.h > 0 ? "loaf" : "idle_tail", 3500); await B.act("groom", 3000); }, "groom");
  }
  let tapT = 0, tapTimer = 0;
  function tap() { const now = Date.now(); if (now - tapT < 340) { clearTimeout(tapTimer); tapT = 0; return highfive(); } tapT = now; tapTimer = setTimeout(poke, 340); }
  function highfive() {
    const mem = game.memory, lv = mem.level("highfive"), p = clamp(0.12 + lv * 0.17 + T().affectionate * 0.15 + (mood() === "clingy" ? 0.15 : 0) - (mem.angry ? 0.3 : 0), 0.03, 0.95);
    const ok = !brain.sleeping && Math.random() < p; mem.xp("highfive", ok ? 2 : 1);
    brain.interrupt(async () => {
      if (ok) { game.R.play(game.R.resolve("groom"), { dur: 160 }); hearts(1); game.say("highfive_ok", null, 1800); game.bond.gain(0.4, "highfive"); await B.wait(700); await B.act(B.h > 0 ? "loaf" : "idle_tail", 3000); }
      else { game.say("highfive_no", null, 1600); await B.act("look_up", 1800); }
    }, "pet");
  }
  function poke() {
    const mem = game.memory; game.meow(1);
    if (brain.sleeping) { game.say("wake"); mem.spend(8); brain.interrupt(async () => { await B.act("stretch", 2200); }); return; }
    const left = mood() === "clingy" ? mem.spend(4) : mem.spend(12);
    if (left < 10) { swat({ clientX: innerWidth / 2, clientY: innerHeight / 2 }); mem.offend(15, "bị chọc hoài"); leave(true); return; }
    // chọc mèo = mèo đố bạn (nếu có từ để đố), không thì kháy
    if (Math.random() < 0.5 && game.learn.learning().length + game.learn.mastered().length >= 3) { brain.interrupt(async () => { await B.act("look_up", 500); await game.catQuiz(); await B.act("idle_tail", 2500); }, "quizme"); return; }
    game.say(Math.random() < 0.5 ? "idle_tap" : "poke", null, 2200);
    brain.interrupt(async () => { await B.act("look_up", 1600); await B.act(B.h > 0 ? "loaf" : "idle_tail", 3000); });
  }

  const vp = game.yard.vp; let lastGround = 0;
  vp.addEventListener("pointerdown", (e) => {
    game.lastInput = Date.now(); game.musicResume?.(); snd.unlock();
    if (e.target.closest(".cat-hit")) { vp.setPointerCapture(e.pointerId); petStart(e); return; }
    // chạm hoa → đọc chữ của bông hoa
    const p = scene.toRoom(e.clientX, e.clientY);
    if (scene.flowerSpots?.length) { let best = null, bd = 34; for (const f of scene.flowerSpots) { const d = Math.hypot(f.x - p.x, f.y - p.y); if (d < bd) { bd = d; best = f; } } if (best) { game.emit("flower", best.card); game.speakCard(best.card); return; } }
    // chạm đúp xuống đất = gọi mèo
    if (Date.now() - lastGround < 380) { lastGround = 0; game.call(); } else lastGround = Date.now();
  });
  vp.addEventListener("pointermove", (e) => { if (pet) petMove(e); });
  const up = (e) => { if (pet) petEnd(e); };
  vp.addEventListener("pointerup", up); vp.addEventListener("pointercancel", up);
  vp.addEventListener("keydown", (e) => { if (e.target.closest(".cat-hit") && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); poke(); } });
  return () => {};
}
export { APP, CANCEL, lerp };
