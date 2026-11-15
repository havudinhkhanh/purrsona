// LỊCH CỦA CHỦ + KẾ HOẠCH NGÀY CỦA MÈO
// · Lịch nền bạn tự khai: dậy / ra khỏi nhà / về / đi ngủ (ngày làm, ngày nghỉ) + giờ máy cho ăn tự động.
// · Nếu đã KẾT NỐI LỊCH (Google / iCal / file .ics): mỗi ngày được "chỉnh" theo sự kiện thật –
//   họp ngoài → ra khỏi nhà thêm; họp online → ở nhà nhưng bận (mèo phá cuộc họp); đi xa → mèo ở nhà một mình;
//   nghỉ phép → ở nhà cả ngày; sự kiện sớm → dậy sớm; tiệc khuya → ngủ muộn.
// · Mỗi ngày sinh 1 KẾ HOẠCH cố định (hạt giống = id mèo + ngày). Mở app lúc nào thì mèo đang ở đúng khối giờ đó.
import { rng, dayKey, clamp } from "../core/util.js";
import { today as todayOf } from "../cat/personality.js";

export const DEFAULT_OWNER = {
  weekday: { wake: 7, leave: 8.25, back: 18, sleep: 23.5 },
  weekend: { wake: 8.75, leave: null, back: null, sleep: 24.25 },
  feeder: [7.5, 18.75], feederOn: true, workdays: [1, 2, 3, 4, 5], set: false,
};
const norm = (h) => ((h % 24) + 24) % 24;
export const fmtH = (h) => { if (h == null) return "–"; const n = norm(h), H = Math.floor(n), M = Math.round((n - H) * 60); return `${String(M === 60 ? H + 1 : H).padStart(2, "0")}:${String(M === 60 ? 0 : M).padStart(2, "0")}`; };
export const parseH = (s) => { if (!s) return null; const [h, m] = s.split(":").map(Number); return h + (m || 0) / 60; };

export const ACT_INFO = {
  wakeowner: { vi: "Gọi bạn dậy", ic: "⏰" }, eat: { vi: "Ăn", ic: "🐟" }, seeoff: { vi: "Tiễn bạn ra cửa", ic: "👋" },
  nap: { vi: "Ngủ", ic: "😴" }, watch: { vi: "Ngắm cửa sổ", ic: "🪟" }, groom: { vi: "Liếm lông", ic: "🧼" }, explore: { vi: "Đi tuần quanh nhà", ic: "🐾" },
  selfplay: { vi: "Tự chơi", ic: "🧶" }, perch: { vi: "Leo chỗ cao", ic: "🧗" }, waitdoor: { vi: "Ra cửa ngồi chờ", ic: "🚪" }, greet: { vi: "Đón bạn về", ic: "🏠" },
  seek: { vi: "Lẽo đẽo theo bạn", ic: "💕" }, zoomies: { vi: "Giờ điên", ic: "🌀" }, bedtime: { vi: "Lên giường ngủ cùng", ic: "🛏️" }, prowl: { vi: "Đi tuần đêm", ic: "🌙" },
  meeting: { vi: "Phá cuộc họp online", ic: "💻" }, alone: { vi: "Ở nhà một mình", ic: "🏡" },
};

export function createSchedule(game) {
  const s = game.save;
  s.owner = { ...DEFAULT_OWNER, ...(s.owner || {}) };
  const O = () => s.owner;
  const isWork = (d) => O().workdays.includes(d.getDay());
  const dayOf = (d) => (isWork(d) ? O().weekday : O().weekend);
  const cal = () => game.calendar;
  const cache = new Map(); game.on?.("calendar", () => cache.clear()); game.on?.("schedule", () => cache.clear());

  /** 1 ngày sau khi trộn lịch nền với lịch thật: { wake, sleep, segs:[{a,b,state:away|busy|trip,title,src}] } (giờ tính từ 00:00 của ngày) */
  function dayInfo(d) {
    const day = new Date(d); day.setHours(0, 0, 0, 0); const key = dayKey(day) + "|" + (cal()?.C.synced || 0);
    if (cache.has(key)) return cache.get(key);
    const base = dayOf(day); let wake = base.wake, sleep = base.sleep, segs = [];
    if (base.leave != null) segs.push({ a: base.leave, b: base.back, state: "away", src: "base", title: "Đi làm" });
    const evs = cal()?.connected ? cal().eventsOn(day) : [], h = (t) => (t - day.getTime()) / 3600e3;
    const notes = [];
    for (const ev of evs) {
      const k = cal().kindOf(ev), a = h(ev.start), b = h(ev.end);
      if (k === "off") { segs = segs.filter((x) => x.src !== "base"); notes.push(`🏠 ${ev.title}`); }
      else if (k === "trip") { segs.push({ a: Math.max(-6, a - 1), b: Math.min(30, b + 1), state: "trip", src: "cal", title: ev.title }); notes.push(`✈️ ${ev.title}`); }
      else if (k === "away") { segs.push({ a: a - 0.5, b: b + 0.5, state: "away", src: "cal", title: ev.title }); }
      else if (k === "busy") segs.push({ a, b, state: "busy", src: "cal", title: ev.title });
    }
    // gộp các khoảng đi vắng chồng nhau; "bận ở nhà" nằm trong lúc đi vắng thì bỏ
    const away = segs.filter((x) => x.state !== "busy").sort((x, y) => x.a - y.a), merged = [];
    for (const x of away) { const l = merged[merged.length - 1]; if (l && x.a <= l.b + 0.25) { l.b = Math.max(l.b, x.b); if (x.state === "trip") l.state = "trip"; if (x.src === "cal") { l.src = "cal"; l.title = x.title; } } else merged.push({ ...x }); }
    const busy = segs.filter((x) => x.state === "busy" && !merged.some((m) => x.a >= m.a && x.b <= m.b));
    const all = [...merged, ...busy].sort((x, y) => x.a - y.a);
    // việc sớm → dậy sớm; việc khuya → ngủ muộn (chỉ tính việc trong ngày, không tính chuyến đi)
    const dayItems = all.filter((x) => x.state !== "trip" && x.a > 3);
    if (dayItems.length) { wake = Math.max(4.5, Math.min(wake, dayItems[0].a - 0.75)); const last = Math.max(...dayItems.map((x) => x.b)); if (last > sleep - 0.5) sleep = Math.min(28, last + 0.75); }
    const info = { day, wake, sleep, segs: all, notes, fromCal: evs.length > 0, tripAllDay: merged.some((x) => x.state === "trip" && x.a <= wake && x.b >= sleep) };
    cache.set(key, info); return info;
  }

  /** bạn đang làm gì: asleep | home | away (busy = ở nhà) */
  function ownerState(d = new Date()) {
    const day = new Date(d); day.setHours(0, 0, 0, 0); const y = new Date(day); y.setDate(y.getDate() - 1);
    const h = (d - day) / 3600e3, I = dayInfo(day), Y = dayInfo(y);
    const inSeg = (info, hh) => info.segs.find((x) => x.state !== "busy" && hh >= x.a && hh < x.b);
    if (inSeg(I, h) || inSeg(Y, h + 24)) return "away";
    if (Y.sleep > 24 && h < Y.sleep - 24) return "asleep";
    if (h < I.wake) return "asleep";
    if (I.sleep <= 24 && h >= I.sleep) return "asleep";
    return "home";
  }
  /** cuộc họp online đang diễn ra (để mèo phá) */
  function busyNow(d = new Date()) { const day = new Date(d); day.setHours(0, 0, 0, 0); const h = (d - day) / 3600e3; return dayInfo(day).segs.find((x) => x.state === "busy" && h >= x.a && h < x.b) || null; }

  /** kế hoạch 1 "ngày mèo" từ giờ bạn dậy, dài tới giờ dậy hôm sau */
  function planFor(d) {
    const day = new Date(d); day.setHours(0, 0, 0, 0);
    const I = dayInfo(day), r = rng(game.cat.id + "|plan|" + dayKey(day) + "|" + (I.fromCal ? I.segs.map((x) => x.a.toFixed(1)).join(",") : "")), td = todayOf(game.cat, day), mood = td.mood.id, crazy = td.crazyHour;
    const B = [], add = (a, b, act, room, spot, extra) => { if (b - a > 0.05) B.push({ a, b, act, room, spot, ...extra }); };
    const napSpots = [["bedroom", "bed"], ["living", "sofa"], ["bedroom", "catbed"], ["living", "treetop"], ["living", "sunbeam"], ["balcony", "chair"]].filter(([rm]) => game.roomAllowed(rm));
    const fav = game.obsession?.spot, pickNap = (h) => { const dayL = h > 9 && h < 15.5; const pool = napSpots.filter(([, sp]) => sp !== "sunbeam" || dayL); const f = pool.find(([, sp]) => sp === fav); return f && r() < 0.45 ? f : pool[Math.floor(r() * pool.length)]; };
    const fill = (a, b, owner) => {
      let t = a;
      while (b - t > 0.2) {
        const k = r(), sleepy = mood === "sleepy" ? 0.15 : 0, len = Math.min(b - t, owner ? 0.5 + r() * 1 : 0.75 + r() * 1.75);
        let blk;
        if (k < 0.5 + sleepy) { const [rm, sp] = pickNap(t); blk = ["nap", rm, sp]; }
        else if (k < 0.66) blk = ["watch", r() < 0.5 ? "living" : "bedroom", "window"];
        else if (k < 0.76) blk = ["groom", null, null];
        else if (k < 0.86) blk = ["explore", null, null];
        else if (k < 0.93) blk = ["perch", null, null];
        else blk = [owner ? "seek" : "selfplay", null, null];
        add(t, t + len, ...blk); t += len;
      }
    };
    const w = I.wake, sl = I.sleep, nw = new Date(day); nw.setDate(nw.getDate() + 1); const nextWake = 24 + dayInfo(nw).wake - 0.25;
    // đi xa cả ngày: không ai gọi dậy, không ai tiễn – mèo tự sống, máy cho ăn lo bữa
    if (I.tripAllDay) {
      const seg = I.segs.find((x) => x.state === "trip"); fill(w, Math.min(sl, seg.b - 0.5), false);
      if (seg.b < sl) { add(seg.b - 0.5, seg.b, "waitdoor", "living", "entry"); add(seg.b, seg.b + 0.3, "greet", "living", "entry"); fill(seg.b + 0.3, sl - 0.25, true); add(sl - 0.25, sl + 2.5, "bedtime", "bedroom", "bed"); }
      else add(sl - 0.25, sl + 2.5, "nap", "bedroom", "bed", { title: "Ngủ một mình trên giường chủ" });
      add(sl + 2.5, nextWake, "nap", "bedroom", r() < 0.6 ? "bed" : "catbed");
      return { day: dayKey(day), wake: w, sleep: sl, blocks: B, info: I };
    }
    add(w - 0.25, w + 0.2, "wakeowner", "bedroom", "bed");
    add(w + 0.2, w + 0.6, "eat", "kitchen", "bowl");
    // dải thời gian trong ngày: xen kẽ ở nhà / đi vắng / họp online theo các đoạn đã trộn
    let t = w + 0.6, ate = false;
    const dinner = 18.75;
    for (const sg of I.segs.filter((x) => x.b > t && x.a < sl - 0.5)) {
      const a = Math.max(t, sg.a);
      if (!ate && dinner < a && dinner > t) { fill(t, dinner, true); add(dinner, dinner + 0.4, "eat", "kitchen", "bowl"); t = dinner + 0.4; ate = true; }
      fill(t, a - (sg.state === "busy" ? 0 : 0.2), true);
      if (sg.state === "busy") { add(a, Math.min(sg.b, sl - 0.5), "meeting", null, null, { title: sg.title }); t = Math.min(sg.b, sl - 0.5); continue; }
      add(a - 0.2, a + 0.1, "seeoff", "living", "entry", { title: sg.title });
      const back = Math.min(sg.b, sl - 0.3);
      fill(a + 0.1, back - 0.5, false);
      add(back - 0.5, back, "waitdoor", "living", "entry", { title: sg.title });
      add(back, back + 0.3, "greet", "living", "entry"); t = back + 0.3;
    }
    if (!ate) { const dn = Math.max(t, dinner); fill(t, dn, true); add(dn, dn + 0.4, "eat", "kitchen", "bowl"); t = dn + 0.4; }
    const zA = clamp(crazy, t, sl - 1.2);
    if (zA > t) { fill(t, zA, true); add(zA, zA + 0.35, "zoomies", null, null); t = zA + 0.35; }
    fill(t, sl - 0.25, true);
    add(sl - 0.25, sl + 2.5, "bedtime", "bedroom", "bed");
    const prowl = sl + 2.5 + r() * 1.5; add(sl + 2.5, prowl, "nap", ...pickNap(2)); add(prowl, prowl + 0.4, "prowl", null, null);
    add(prowl + 0.4, nextWake, "nap", "bedroom", r() < 0.6 ? "bed" : "catbed");
    return { day: dayKey(day), wake: w, sleep: sl, blocks: B.sort((x, y) => x.a - y.a), info: I };
  }

  function blockAt(d = new Date()) {
    const day = new Date(d); day.setHours(0, 0, 0, 0); const h = (d - day) / 3600e3;
    for (const off of [0, -1]) {
      const pd = new Date(day); pd.setDate(pd.getDate() + off); const p = planFor(pd), hh = h - off * 24;
      const b = p.blocks.find((x) => hh >= x.a && hh < x.b); if (b) return { ...b, start: new Date(pd.getTime() + b.a * 3600e3), end: new Date(pd.getTime() + b.b * 3600e3) };
    }
    return null;
  }
  function blocksBetween(from, to) {
    const out = [], d0 = new Date(from); d0.setHours(0, 0, 0, 0); d0.setDate(d0.getDate() - 1);
    for (let d = new Date(d0); d <= to; d.setDate(d.getDate() + 1)) { for (const b of planFor(d).blocks) { const st = new Date(d.getTime() + b.a * 3600e3), en = new Date(d.getTime() + b.b * 3600e3); if (en > from && st < to) out.push({ ...b, start: st, end: en }); } }
    return out.sort((x, y) => x.start - y.start);
  }
  return { O, ownerState, busyNow, dayInfo, planFor, blockAt, blocksBetween, isWork, dayOf, save: (o) => { s.owner = { ...s.owner, ...o, set: true }; cache.clear(); game.emit("schedule"); } };
}
