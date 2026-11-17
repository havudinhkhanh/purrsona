// Service worker: tải trước vỏ app, sau đó "mạng trước – lỗi thì dùng bản đã lưu" cho mọi file cùng nguồn.
// Mỗi lần phát hành: tăng VERSION để máy người dùng lấy bản mới.
const VERSION = "purrsona-2.6.1";
const SHELL = ["./", "index.html", "styles/app.css", "manifest.webmanifest", "icons/icon.svg", "icons/apple-touch-icon.png", "assets/graphite.png", "src/main.js", "src/game.js", "src/config.js",
  "src/world/yard.js", "src/world/critters.js", "src/world/weather.js", "src/world/play.js", "src/world/vibe.js", "src/world/life.js", "src/ui/fx.js", "src/render/fit.js", "src/learn/lexicon.js", "src/ui/wall.js", "src/ui/hud.js", "src/ui/icons.js", "src/ui/closeup.js", "src/vendor/rough.js",
  "src/learn/srs.js", "src/learn/packs.js", "src/learn/tts.js", "src/learn/scan.js", "src/learn/trends.js", "src/meta/bridge.js", "src/meta/notify.js", "src/learn/packs/en-core.js", "src/learn/packs/zh-core.js", "src/learn/packs/en-business.js", "src/learn/packs/en-scene.js", "src/learn/packs/zh-scene.js", "src/learn/packs/ja-scene.js", "src/learn/packs/en-vibe.js", "src/learn/packs/zh-vibe.js", "src/learn/packs/en-deep.js", "src/learn/packs/zh-deep.js", "src/learn/packs/ja-deep.js", "src/learn/packs/en-yle.js", "src/learn/packs/en-exam.js", "src/learn/packs/zh-hsk.js", "src/learn/packs/ja-core.js", "src/learn/packs/en-life.js", "src/learn/packs/zh-life.js", "src/learn/packs/ja-life.js", "src/meta/account.js",
  "src/core/store.js", "src/core/util.js", "src/core/sound.js", "src/core/music.js", "src/world/art.js", "src/cat/voice.js", "src/render/clips.js", "src/render/registry.js", "src/render/sprite/sprite-renderer.js", "src/render/vector/morph.js", "src/render/vector/vector-renderer.js",
  "src/cat/brain.js", "src/cat/body.js", "src/cat/bond.js", "src/cat/lines.js", "src/cat/memory.js", "src/cat/personality.js", "src/meta/note.js",
  "assets/fonts/ph-latin-400.woff2", "assets/fonts/ph-vietnamese-400.woff2", "assets/fonts/bvp-latin-400.woff2", "assets/fonts/bvp-vietnamese-400.woff2",
  "assets/cats/index.json", "assets/cats/nana/cat.json", "assets/cats/nana/poses.json"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION && k !== "purr-state").map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url); if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith((e.request.mode === "navigate" ? fetch(e.request) : fetch(e.request, { cache: "no-cache" })).then((r) => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then((ca) => ca.put(e.request, c)); } return r; }).catch(() => caches.match(e.request).then((m) => m || caches.match("index.html"))));
});

// ---------------------------------------------------------------- MÈO NHẮC: soạn thông báo từ "tình hình hôm nay" app đã lưu
// Tin push không mang dữ liệu: service worker tự đọc Cache "purr-state" rồi chọn câu. Câu cộc, kháy chuyện lười – không chê người.
// tính cách theo tâm trạng hôm nay của mèo (app ghi vào purr-state): mỗi tâm trạng một giọng
const NAG = {
  none: ["Chưa học chữ nào. Tính sao?", "Hôm nay chưa thấy mặt.", "Lướt đủ chưa? Vô học 2 phút.", "Tui ngồi đợi nãy giờ đó."],
  due: ["{n} từ tới hạn ôn. Để mai là quên.", "{n} từ đang đợi. Tui cũng đợi.", "Ôn {n} từ thôi mà. Lẹ."],
  streak: ["Chuỗi {s} ngày sắp đứt. Vô lẹ.", "{s} ngày đó. Bỏ hả?", "Còn mấy tiếng nữa là mất chuỗi {s} ngày."],
  hot: ["Chữ nóng nay: '{w}'. Biết chưa?", "Báo nay nói '{w}' hoài. Vô coi."],
  test: ["Ờ, nhắc được rồi đó. Giờ đi học."],
};
const MOOD = {
  grumpy: { none: ["Hừ. Còn chưa học.", "Đừng để tui nhắc lần hai.", "Cáu rồi đó. Vô học."], due: ["{n} từ. Ôn liền. Hừ."], streak: ["Mất chuỗi {s} ngày là tui giận cả tuần."] },
  clingy: { none: ["Nhớ {sen} rồi. Vô học với tui đi.", "Tui ngồi đợi ở cửa nè.", "Vô chơi xíu. Học xíu. Nha."], due: ["{n} từ đợi {sen}. Tui cũng đợi."], streak: ["Đừng bỏ tui với chuỗi {s} ngày."] },
  diva: { none: ["Tui không nhắc lần hai đâu.", "Bổn mèo cho phép {sen} vô học.", "Hôm nay tui đẹp. {sen} thì chưa học."], due: ["{n} từ. Tui đã ra lệnh."], streak: ["Chuỗi {s} ngày. Giữ cho tui."] },
  sleepy: { none: ["Tui ngủ dậy rồi. {sen} chưa học.", "Ngáp… học chưa?", "Học đi rồi tui ngủ tiếp."], due: ["{n} từ… zzz… ôn đi."], streak: ["Zzz… chuỗi {s} ngày… đừng đứt."] },
  zoomie: { none: ["Tui chạy 3 vòng vườn rồi! {sen} chưa học chữ nào!", "Lẹ lẹ lẹ! Vô học!"], due: ["{n} từ! Ôn nhanh lên!"], streak: ["Chuỗi {s} ngày! Chạy vô giữ liền!"] },
  explorer: { none: ["Tui lục được chữ mới. Vô coi.", "Có chữ lạ trong vườn. Vô đi."], due: ["Tui tìm ra {n} từ {sen} sắp quên."], streak: ["{s} ngày khám phá. Đừng dừng."] },
  foodie: { none: ["Học 1 chữ = 1 viên snack cho tui. Vô.", "Đói chữ. Đói cá. Vô học."], due: ["{n} từ = {n} viên snack. Lẹ."], streak: ["Chuỗi {s} ngày = 1 con cá. Đừng đứt."] },
  poet: { none: ["Trời hôm nay hợp học chữ.", "Gió thổi qua. Chữ chưa vô đầu."], due: ["{n} chữ chờ như mây chờ gió."], streak: ["{s} ngày. Đừng để thơ đứt đoạn."] },
};
const WXL = { rain: ["Mưa rồi. Ở nhà học đi.", "Mưa. Khỏi đi đâu. Học."], storm: ["Giông. Vô nhà học với tui."], hot: ["Nóng quá. Vô đây ngồi học cho mát."], wind: ["Gió bay hết chữ rồi. Vô học lại."] };
const pickL = (a) => a[Math.floor(Math.random() * a.length)];
const fillL = (t, v) => t.replace(/\{(\w+)\}/g, (m, k) => (v[k] ?? m));
async function readState() { try { const r = await (await caches.open("purr-state")).match("state.json"); return r ? await r.json() : null; } catch { return null; } }
const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
// mỗi khung giờ chỉ nhắc 1 lần dù tới từ đâu (hẹn trong trang, đồng bộ nền, push)
async function claim(slot) {
  if (!slot) return true;
  const c = await caches.open("purr-state"), r = await c.match("shown.json"), shown = r ? await r.json() : {}, key = `${todayLocal()} ${slot}`;
  if (shown[key]) return false; shown[key] = 1; for (const k of Object.keys(shown)) if (!k.startsWith(todayLocal())) delete shown[k];
  await c.put("shown.json", new Response(JSON.stringify(shown))); return true;
}
// khung giờ vừa tới (trong vòng `win` phút) theo danh sách giờ nhắc
function slotNow(st, win = 15) { const n = new Date(), m = n.getHours() * 60 + n.getMinutes(); const all = [...(st?.times || []), ...(st?.streakNag ? ["21:30"] : [])]; return all.find((hm) => { const [h, mm] = hm.split(":").map(Number), t = h * 60 + mm; return m >= t && m - t < win; }) || null; }
async function remind({ test = false, evening = false, slot = null } = {}) {
  const st = await readState(); if (!st && !test) return;
  if (!test && !(await claim(slot))) return false;
  const fresh = st && st.d === todayLocal(), studied = fresh && st.studied;
  if (!test && studied && !(st.due > 0)) return;      // học rồi, hết bài: khỏi nhắc
  const v = { n: st?.due || st?.neu || 3, s: st?.streak || 0, w: st?.hot || "" };
  const key = test ? "test" : evening && v.s > 1 && !studied ? "streak" : !studied && st?.hot && new Date().getHours() < 12 ? "hot" : fresh && st.due > 0 ? "due" : "none";
  v.sen = st?.sen || "Sen";
  const moodL = MOOD[st?.mood]?.[key === "hot" ? "none" : key], r = Math.random();
  const pool = key === "test" ? NAG.test : st?.wx && WXL[st.wx] && key === "none" && r < 0.35 ? WXL[st.wx] : moodL && r < 0.7 ? moodL : NAG[key];
  const body = fillL(pickL(pool), v);
  return self.registration.showNotification(`${st?.cat || "na"}${st?.emo ? " " + st.emo : ""}`, { body, tag: "purr-remind", renotify: true, icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: "./" } });
}
self.addEventListener("message", (e) => { if (e.data?.type === "remind-now") e.waitUntil(remind({ test: !!e.data.test, evening: new Date().getHours() >= 20, slot: e.data.slot || null })); });
self.addEventListener("push", (e) => { let d = {}; try { d = e.data ? e.data.json() : {}; } catch { /* không có dữ liệu */ } e.waitUntil(readState().then((st) => remind({ evening: d.kind === "streak" || new Date().getHours() >= 20, slot: slotNow(st, 30) })).then((r) => r ?? self.registration.showNotification("na", { body: "Ghé coi bài hôm nay.", tag: "purr-remind", icon: "icons/icon-192.png", silent: true }))); });
self.addEventListener("periodicsync", (e) => {
  if (e.tag !== "purr-remind") return;
  e.waitUntil(readState().then((st) => { const slot = slotNow(st, 180); return slot ? remind({ evening: new Date().getHours() >= 20, slot }) : null; }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => { const c = cs.find((x) => "focus" in x); return c ? c.focus() : self.clients.openWindow(e.notification.data?.url || "./"); }));
});

// trình duyệt đổi địa chỉ push → đăng ký lại với máy chủ nhắc (địa chỉ + mã máy lưu trong purr-state)
self.addEventListener("pushsubscriptionchange", (e) => {
  e.waitUntil(readState().then(async (st) => {
    if (!st?.endpoint || !st?.id || !st?.vapid) return;
    const b = atob((st.vapid + "=".repeat((4 - (st.vapid.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")), key = Uint8Array.from(b, (c) => c.charCodeAt(0));
    const sub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    await fetch(st.endpoint + "/subscribe", { method: "POST", headers: { "content-type": "text/plain" }, body: JSON.stringify({ id: st.id, sub, state: { d: st.d, studied: st.studied, times: st.times, tz: st.tz, streakNag: st.streakNag, streak: st.streak > 1 } }) });
  }));
});
