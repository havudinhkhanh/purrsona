// BỘ NÃO: chọn việc tiếp theo theo nhu cầu + tính cách hôm nay + giờ + TÌNH HÌNH HỌC CỦA BẠN.
// Mọi vị trí tính trên mặt đất (u, v) của khu vườn rồi chiếu ra màn hình (world/yard.js).
// Mỗi hoạt động = { id, score() → số, run() async }. Thêm hoạt động mới = thêm 1 mục vào ACTS.
import { HOUSE, SPOTS, BEDS, UW, UH } from "../world/yard.js";
import { CANCEL } from "./body.js";
import { clamp, rand, pick, weighted } from "../core/util.js";

export function createBrain(game) {
  const { body: B } = game, Y = game.yard;
  const st = { cur: null, since: 0, interrupt: null, alive: true };
  const N = () => game.save.cat.needs;
  const T = () => game.today.traits;
  const mood = () => game.today.mood.id;
  const say = (k, vars) => game.say(k, null, null, vars);
  const qmod = (id) => game.quirks.reduce((v, q) => v * ((q.mod || {})[id] || 1), 1);
  const cd = () => (game.save.cd ||= {});
  const cool = (k, min) => Date.now() - (cd()[k] || 0) > min * 60e3;
  const used = (k) => { cd()[k] = Date.now(); };
  const at = (tier) => game.bond?.at(tier);
  const att = () => game.attention?.();
  const idleS = () => (Date.now() - (game.lastInput || Date.now())) / 1000;
  const todo = () => game.learn.todo();
  const uv = () => Y.unP(B.x, B.y);
  const zone = () => { const p = uv(); return Y.zoneOf(p.u, p.v); };

  // ------------------------------------------------------------------ di chuyển trên mặt đất
  // nhảy vồ: đích tính theo đơn vị sân (không theo px) → cảnh xa/gần đều đúng, không nhảy xuyên tường nhà / qua rào
  function hop(du) { const p = Y.unP(B.x, B.y); let u = clamp(p.u + B.face * du, 3, UW - 3); const v = clamp(p.v, 3, UH - 3); if (u > HOUSE.u0 - 1 && v < HOUSE.v1 + 1 && p.u <= HOUSE.u0) u = HOUSE.u0 - 2; return Y.P(u, v); }
  async function down() { if (B.h > 0) { const p = Y.unP(B.x, B.y), [x, y] = Y.P(clamp(p.u + (B.face > 0 ? 3 : -3), 2, UW - 2), clamp(p.v + 2.5, 2, UH - 2)); await B.jumpTo(x, y, 0, null); } B.perch = null; }
  /** đi tới (u, v); đi qua cửa nếu đổi khu nhà ↔ vườn */
  async function goUV(u, v, gait = "walk") {
    await down();
    const from = zone(), to = Y.zoneOf(u, v);
    if (from !== to) {
      const d = Y.door; const a = from === "house" ? d.in : d.out, b = from === "house" ? d.out : d.in;
      await walkUV(a.u, a.v, gait, true); await walkUV(b.u, b.v, gait, true);      // qua cửa không dừng lại
      game.emit("zone", to); if (Math.random() < 0.4) game.say("enter", to);
    }
    await walkUV(u, v, gait);
  }
  const walkUV = (u, v, gait, through = false) => { const [x, y] = Y.P(u, v); return B.walkTo(x, y, { gait, through }); };
  async function goSpot(id, gait) {
    const sp = SPOTS[id]; if (!sp) return null;
    if (B.perch === id) return sp;
    if (sp.h > 0) {
      await goUV(sp.u + (Math.random() < 0.5 ? -4 : 4), sp.v + 3, gait);
      const [x, y] = Y.P(sp.u, sp.v), hpx = sp.h * Y.S.k * 0.9;
      await B.jumpTo(x, y, hpx, Math.round(y) + 3, { apex: Math.max(30, hpx * 0.25) }); B.perch = id; game.memory.xp("climber", sp.h > 10 ? 2 : 1);
    } else { await goUV(sp.u, sp.v, gait); B.perch = null; }
    return sp;
  }
  const spotsWith = (use) => Object.entries(SPOTS).filter(([, s]) => s.use.includes(use) && (!game.weather?.raining || s.zone === "house")).map(([id, s]) => ({ id, s }));      // mưa: chỉ chỗ trong nhà
  const near = (c) => (c.id === game.today.spot ? 2.2 : 1) * (c.id === game.obsession.spot ? 3 : 1) * game.quirks.reduce((v, q) => v * ((q.spot || {})[c.id] || 1), 1);
  /** tới phía trước khu vườn, gần chỗ bạn nhìn (lệch khỏi chữ ở góc trái) */
  const wx = () => game.weather || {};
  /** tới gần bạn: ngày mưa thì đứng trong nhà sát mép trước, còn lại ra phía trước vườn */
  async function comeTo(gait = "walk") { if (wx().raining) await goUV(rand(70, 94), rand(22, 27), gait); else await goUV(rand(48, 78), rand(55, 60), gait); B.faceTo(Math.random() < 0.5 ? 1 : -1); }
  /** viết một dòng ra lề giấy */
  async function writeWall(text, kind) {
    await down(); B.lift = 1; await B.act("look_up", 600); await B.act("scratch", 1600);
    game.wall?.scribble(text, kind); game.meow?.(1); await B.act("scratch", 1000); await B.act("idle_tail", 1400); B.lift = 0;
  }
  function wallLine() {
    const t = todo(), sk = game.learn.streakAlive(), w = game.learn.weak(1)[0] || game.learn.todayCards()[0];
    if (t.due > 0) return [game.lineOf("wall_due", { n: t.due }), "due"];
    if (t.neu > 0) return [game.lineOf("wall_new", { n: t.neu }), "new"];
    if (sk >= 3 && Math.random() < 0.4) return [game.lineOf("wall_streak", { n: sk }), "streak"];
    if (w && Math.random() < 0.6) return [game.lineOf("wall_word", { w: w.w, vi: w.vi }), "word"];
    return [game.lineOf("wall_done"), "done"];
  }

  // ------------------------------------------------------------------ hoạt động
  const ACTS = [
    { id: "nap", score: () => { const h = game.yard.S.hour, sleepyHour = (h > 11 && h < 16) || h > 23 || h < 5 ? 0.5 : 0; return ((100 - N().energy) / 100) * 1.6 + T().lazy * 0.6 + sleepyHour + (mood() === "sleepy" ? 0.6 : 0); },
      async run() { const c = weighted(spotsWith("nap"), near); if (!c) return; await goSpot(c.id); await B.act("loaf", rand(2.5, 5) * 1000); if (Math.random() < 0.4) say("nap"); st.sleeping = true; try { await B.act("sleep", rand(40, 110) * 1000 * (0.6 + T().lazy)); } finally { st.sleeping = false; } await B.act("stretch", 2600); } },
    { id: "watch", score: () => 0.35 + T().curious * 0.5 + (mood() === "poet" ? 1.2 : 0),
      async run() { const c = weighted(spotsWith("watch"), near); if (!c) return; await goSpot(c.id); await B.act("idle_tail", rand(5, 9) * 1000); if (Math.random() < 0.5) say("watch"); await B.act("look_up", rand(4, 8) * 1000); await B.act("idle_tail", rand(6, 14) * 1000); } },
    { id: "explore", score: () => 0.4 + T().curious * 0.8 + (mood() === "explorer" ? 1.1 : 0),
      async run() { const z = zone() === "house" ? "garden" : Math.random() < 0.5 ? "house" : "garden"; for (let i = 0; i < 2; i++) { const p = Y.rand(z); await goUV(p.u, p.v, "walk"); await B.act(Math.random() < 0.5 ? "idle_tail" : "look_up", rand(4, 9) * 1000); } } },
    { id: "groom", score: () => 0.45,
      async run() { await B.act("groom_full", 9000); if (Math.random() < 0.3) say("groom"); await B.act("lick_body", rand(3, 6) * 1000); } },
    { id: "zoomies", score: () => { const h = game.yard.S.hour; const crazy = Math.abs(h - game.today.crazyHour) < 0.75 ? 1.6 : 0; return N().energy > 55 && cool("zoom", 30) ? (crazy + (mood() === "zoomie" ? 1 : 0) + T().playful * 0.3) * 0.35 : 0; },
      async run() { used("zoom"); say("zoom"); for (let i = 0; i < 3; i++) { const p = Y.rand("garden"); await goUV(p.u, p.v, "run"); } await B.act("roll_play", 3000); N().energy -= 8; N().fun = clamp(N().fun + 15, 0, 100); } },
    { id: "selfplay", score: () => T().playful * 0.6 + (100 - N().fun) / 160,
      async run() { const c = weighted(spotsWith("play"), near); if (c) await goSpot(c.id); await B.act(Math.random() < 0.5 ? "roll_play" : "roll", 3500); N().fun = clamp(N().fun + 12, 0, 100); } },
    { id: "perch", score: () => 0.3 + T().brave * 0.4 + T().curious * 0.2,
      async run() { const c = weighted(spotsWith("perch"), near); if (!c) return; await goSpot(c.id); await B.act("loaf", rand(8, 20) * 1000); } },
    { id: "chase", score: () => (game.critters?.list.some((c) => c.kind === "bfly" && !c.answer) ? 0.4 + T().playful * 0.8 : 0),
      async run() {
        await down();
        for (let i = 0; i < 3; i++) {
          const b = game.critters.nearest(B.x, B.y); if (!b) break; const p = Y.unP(b.x, b.y + 60), me = uv();
          if (Math.hypot(p.u - me.u, p.v - me.v) > 18) await goUV(clamp((p.u + me.u * 0.3) / 1.3, 3, UW - 3), clamp((p.v + me.v * 0.3) / 1.3, 3, UH - 3), "run");      // đuổi bướm: được chạy
          await goUV(clamp(p.u, 3, UW - 3), clamp(p.v, 3, UH - 3), "stalk"); B.faceTo(b.x - B.x);
          await B.act("crouch", 700 + Math.random() * 500); await B.jumpTo(...hop(6), 0, null, { apex: Y.S.catH * 0.9 });
          game.critters.scare(b); game.memory.xp("hunter", 1); N().fun = clamp(N().fun + 8, 0, 100);
          if (Math.random() < 0.4) say("chase"); await B.act("look_up", 1200);
        }
      } },
    { id: "seek", score: () => (game.memory.angry || !att() ? 0 : ((100 - N().social) / 100) * (0.4 + T().affectionate * 1.4) + (mood() === "clingy" ? 0.9 : 0)),
      async run() { await comeTo(); await B.act("idle_tail", rand(6, 14) * 1000); } },
    { id: "sulk", score: () => (game.memory.angry ? game.memory.grudge / 28 : 0),
      async run() { await goUV(rand(6, 20), rand(4, 10)); B.faceTo(-1); say("sulk"); await B.act("loaf", rand(10, 18) * 1000); B.faceTo(1); await B.act("look_up", 1200); B.faceTo(-1); await B.act("loaf", rand(6, 12) * 1000); } },
    // ---- HỌC: viết ra lề, nhắc, đố
    { id: "write", score: () => { const t = todo(); return cool("write", 8) ? 0.3 + (t.due + t.neu > 0 ? 0.8 : 0.2) + T().sassy * 0.6 : 0; },
      async run() { used("write"); await writeWall(...wallLine()); } },
    { id: "nag", score: () => { const t = todo(), late = game.yard.S.hour >= 20; return att() && cool("nag", 8) && t.due + t.neu > 0 ? 0.5 + T().sassy * 0.8 + (late ? 0.8 : 0) + Math.min(1, (t.due + t.neu) / 15) : 0; },
      async run() { used("nag"); await comeTo(); await B.act("look_up", 600); game.nag(); game.meow(1); await B.act("idle_tail", 5000); } },
    { id: "quizme", score: () => (att() && cool("quizme", 10) && game.wall?.mode === "ambient" && game.learn.learning().length + game.learn.mastered().length >= 2 && idleS() > 20 ? 0.4 + T().sassy * 0.5 + (mood() === "explorer" ? 0.4 : 0) : 0),
      async run() { used("quizme"); await comeTo(); await B.act("look_up", 700); game.catQuiz(); await B.act("idle_tail", 6000); } },
    // ---- QUẤN NGƯỜI (mở dần theo bậc gắn bó, chỉ khi bạn đang nhìn)
    { id: "headbutt", score: () => (att() && at("friend") && !game.memory.angry && cool("headbutt", 25) ? 0.2 + (100 - N().social) / 120 + T().affectionate * 0.6 + (mood() === "clingy" ? 1 : 0) : 0),
      async run() { used("headbutt"); await comeTo(); await B.act("look_up", 700); if (!att()) return; const r = await game.closeup.headbutt(); N().social = clamp(N().social + 16, 0, 100); game.bond.gain(0.5 + (r.back > 4 ? 1.2 : 0), "headbutt"); await B.act("idle_tail", 3500); } },
    { id: "blinkat", score: () => (att() && at("friend") && !game.memory.angry && cool("blinkat", 35) ? 0.25 + T().affectionate * 0.5 + (mood() === "poet" ? 0.4 : 0) : 0),
      async run() { used("blinkat"); await comeTo(); await B.act("loaf", 1200); if (!att()) return; const r = await game.closeup.slowblink(); if (r.back) game.bond.gain(0.8, "blink"); await B.act("loaf", 5000); } },
    { id: "knead", score: () => (att() && at("bestie") && cool("knead", 40) && !game.memory.angry ? 0.35 + T().affectionate * 0.5 + (mood() === "clingy" ? 0.8 : 0) : 0),
      async run() { used("knead"); await comeTo(); say("knead"); B.knead = true; game.purr(true); try { const end = Date.now() + rand(9, 15) * 1000; while (Date.now() < end) { await B.act("knead", 2000); game.hearts?.(1); } } finally { B.knead = false; game.purr(false); } game.bond.gain(0.4, "knead"); await B.act("loaf", 4000); } },
    { id: "bellyup", score: () => (att() && at("bestie") && cool("belly", 45) && !game.memory.angry ? 0.3 + T().playful * 0.4 + T().sassy * 0.2 : 0),
      async run() { used("belly"); await comeTo(); await B.act("lie", 800); game.belly = { t: Date.now() }; say("belly"); try { await B.act("belly_up", rand(8, 12) * 1000); } finally { game.belly = null; } } },
    { id: "pawtap", score: () => (!document.hidden && !game.paused?.() && at("friend") && idleS() > 90 && cool("pawtap", 20) && todo().due + todo().neu > 0 && !game.closeup?.busy && !game.sheetOpen?.() ? 1.2 + T().affectionate * 0.4 + T().sassy * 0.4 : 0),
      async run() { used("pawtap"); await comeTo(); await B.act("look_up", 900); const r = await game.closeup.pawtap(); if (r.answered) { game.bond.gain(1, "pawtap"); N().social = clamp(N().social + 14, 0, 100); game.wall?.lesson("full"); } else await B.act("loaf", 6000); } },
    { id: "sleepnear", score: () => { const h = game.yard.S.hour, late = h >= 21 || h < 2; return att() && at(late ? "friend" : "soul") && idleS() > 150 && N().energy < 80 && cool("sleepnear", 60) ? 1 + T().lazy * 0.6 + (late ? 0.6 : 0) : 0; },
      async run() { used("sleepnear"); await comeTo(); say("sleepnear"); await B.act("loaf", 3500); st.sleeping = true; try { await B.act("sleep", rand(60, 150) * 1000); } finally { st.sleeping = false; } await B.act("stretch", 2400); } },
    { id: "greet", score: () => 0,
      async run() {
        const big = at("friend") && (game.awayH || 0) > 2, d = Math.floor((game.awayH || 0) / 24);
        await comeTo(big ? "trot_tailup" : "walk");
        if (d >= 2) say("back", { d }); else if (big) { await B.act("chirp", 900); say("hello"); game.meow(2); await B.act("rub", 2600); if (att()) { const r = await game.closeup.headbutt(); game.bond.gain(0.4 + (r.back > 4 ? 0.8 : 0), "greet"); } } else say("hello");
        B.wobble = 0.5; try { await B.act("idle_tail", 3500); } finally { B.wobble = 0; } await B.act("roll_play", 3000); N().social = clamp(N().social + 15, 0, 100);
        if (todo().due + todo().neu > 0) { await B.act("look_up", 600); game.nag(); }
      } },
    { id: "wander", score: () => 0.5,
      async run() { const me = uv(), z = game.weather?.raining ? "house" : undefined; let p = Y.rand(z); for (let i = 0; i < 8 && Math.hypot(p.u - me.u, p.v - me.v) > 26; i++) p = Y.rand(z); await goUV(p.u, p.v); await B.act(pick(["idle", "idle_tail", "loaf", "look_up"]), rand(6, 14) * 1000); } },
    // ---- theo thời tiết
    { id: "rainwatch", score: () => (wx().raining ? 0.9 + T().curious * 0.4 : 0),
      async run() { await goUV(rand(70, 94), rand(23, 27)); B.faceTo(-1); await B.act("loaf", rand(8, 16) * 1000); if (Math.random() < 0.4) say("wx_rainwatch"); await B.act("look_up", 2500); await B.act("idle_tail", rand(6, 12) * 1000); } },
    { id: "shadenap", score: () => (wx().hot && !wx().raining ? 1 + T().lazy * 0.5 : 0),
      async run() { await goUV(rand(44, 52), rand(11, 14)); await B.act("lie", rand(15, 30) * 1000); if (Math.random() < 0.3) say("wx_hot"); await B.act("stretch", 2400); } },
    { id: "chaseleaf", score: () => (wx().windy && !wx().raining && cool("leaf", 3) ? 0.6 + T().playful * 0.6 : 0),
      async run() { used("leaf"); const me = uv(); for (let i = 0; i < 2; i++) { await goUV(clamp(me.u + rand(-25, 25), 4, 60), clamp(me.v + rand(-12, 12), 4, UH - 4), "run"); B.faceTo(Math.random() < 0.5 ? 1 : -1); await B.act("crouch", 600); await B.jumpTo(...hop(5.5), 0, null, { apex: Y.S.catH * 0.6 }); } if (Math.random() < 0.4) say("wx_leaf"); await B.act("look_up", 1500); } },
    // ---- thêm việc chậm rãi
    { id: "sniff", score: () => 0.35 + T().curious * 0.4,
      async run() { const b = pick(BEDS); await goUV(clamp(rand(b.u0, b.u1), 3, UW - 3), clamp(b.v1 + 2, 3, UH - 3)); B.faceTo(Math.random() < 0.5 ? 1 : -1); await B.act("crouch", rand(1.8, 3) * 1000); await B.act("look_up", 1600); await B.act("lick_lip", 1200); await B.act("idle_tail", rand(4, 8) * 1000); } },
    { id: "sunbathe", score: () => { const h = game.yard.S.hour; return h >= 8 && h <= 16 && game.yard.S.night < 0.3 ? 0.25 + T().lazy * 0.5 : 0; },
      async run() { const me = uv(); let p = Y.rand("garden"); for (let i = 0; i < 6 && Math.hypot(p.u - me.u, p.v - me.v) > 30; i++) p = Y.rand("garden"); await goUV(p.u, p.v); await B.act("lie", rand(15, 32) * 1000); if (Math.random() < 0.4) await B.act("belly_up", 4000); await B.act("stretch", 2600); } },
    { id: "sitpretty", score: () => 0.3 + T().affectionate * 0.25,
      async run() { await goUV(rand(40, 80), rand(46, 58)); B.faceTo(Math.random() < 0.5 ? 1 : -1); await B.act("idle_tail", rand(8, 16) * 1000); if (Math.random() < 0.3) { await B.act("chirp", 900); game.meow(1); } await B.act("loaf", rand(6, 12) * 1000); } },
    { id: "pondgaze", score: () => 0.22 + T().curious * 0.3,
      async run() { await goSpot("pond"); B.faceTo(-1); await B.act("crouch", rand(3, 5) * 1000); await B.act("idle_tail", rand(5, 9) * 1000); if (Math.random() < 0.3) say("watch"); await B.act("look_up", 2000); } },
    { id: "scratchtree", score: () => (cool("scratch", 8) ? 0.25 + T().playful * 0.2 : 0),
      async run() { used("scratch"); await goUV(48, 11.5); B.faceTo(-1); await B.act("stretch", 1800); await B.act("scratch", rand(2.5, 4) * 1000); await B.act("idle_tail", 3000); } },
    { id: "yarn", score: () => (cool("yarn", 10) ? T().playful * 0.35 + (100 - N().fun) / 260 : 0),
      async run() { used("yarn"); await goSpot("rug"); await B.act("play_yarn", rand(4, 7) * 1000); N().fun = clamp(N().fun + 10, 0, 100); await B.act("loaf", 4000); } },
    { id: "flowerpounce", score: () => (cool("pounce", 6) && game.yard.flowerSpots?.length ? 0.2 + T().playful * 0.5 : 0),
      async run() { used("pounce"); const f = pick(game.yard.flowerSpots), p = Y.unP(f.x, f.y + 40); await goUV(clamp(p.u - 6, 3, UW - 3), clamp(p.v + 2, 3, UH - 3), "run"); B.faceTo(1); await B.act("crouch", 900); await B.jumpTo(...hop(6), 0, null, { apex: Y.S.catH * 0.7 }); await B.act("roll_play", 2600); if (Math.random() < 0.3) say("chase"); N().fun = clamp(N().fun + 10, 0, 100); } },
  ];

  // việc ngoài vườn: trời mưa thì thôi
  const OUTDOOR = new Set(["swing", "slide", "trellis", "dig", "knockpot", "sniff", "sunbathe", "sitpretty", "pondgaze", "scratchtree", "flowerpounce", "chase", "vibe", "koi", "zoomies", "explore", "watch", "perch", "sulk"]);
  const wxMod = (id) => (wx().raining && OUTDOOR.has(id) ? 0 : wx().hot && id === "sunbathe" ? 0 : 1);
  // đồ chơi trong vườn (xích đu, cầu tuột, giàn bầu, đào đất, xô chậu) – world/play.js
  ACTS.push(...(game.play?.acts({ goUV, down, say, cool, used, T, N }) || []), ...(game.vibe?.acts({ goUV, down, say, cool, used, T, N }) || []), ...(game.life?.acts({ goUV, down, say, cool, used, T, N, comeTo }) || []));
  function choose() {
    const kid = game.age.stage === "kitten";
    const scored = ACTS.map((a) => ({ a, s: Math.max(0, a.score()) * qmod(a.id) * wxMod(a.id) * (kid && ["selfplay", "zoomies", "explore", "chase"].includes(a.id) ? 1.6 : 1) * (a.id === st.cur ? 0.35 : 1) * rand(0.75, 1.25) }));
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
      st.sleeping = false; B.lift = 0;
      if (!st.interrupt) { try { await B.act(pick(["idle", "idle_tail", "idle_tail", "loaf", "loaf"]), rand(2.5, 5) * 1000 * (game.chill?.idle || 1.4)); } catch (e) { if (e !== CANCEL) console.error(e); } }
    }
  }
  return {
    st, ACTS, goUV, goSpot, comeTo, down, writeWall,
    start() { loop(); },
    get activity() { return st.cur; },
    get sleeping() { return !!st.sleeping; },
    /** mưa tới mà đang ngoài vườn: chạy vô nhà, lắc nước */
    shelter() { if (zone() !== "garden") return; this.interrupt(async () => { await down(); await goUV(rand(72, 92), rand(20, 26), "run"); await B.act("groom_full", 3500); }, "rainwatch"); },
    interrupt(fn, label) { st.interrupt = fn; if (label) { st.cur = label; game.emit("activity", label); } B.cancel(); },
  };
}
export { HOUSE };
