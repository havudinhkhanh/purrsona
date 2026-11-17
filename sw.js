// Service worker: tải trước vỏ app, sau đó "mạng trước – lỗi thì dùng bản đã lưu" cho mọi file cùng nguồn.
// Mỗi lần phát hành: tăng VERSION để máy người dùng lấy bản mới.
const VERSION = "purrsona-1.2.0";
const SHELL = ["./", "index.html", "styles/app.css", "manifest.webmanifest", "icons/icon.svg", "src/main.js", "src/game.js", "src/config.js",
  "src/world/yard.js", "src/world/critters.js", "src/ui/wall.js", "src/ui/hud.js", "src/ui/icons.js", "src/ui/closeup.js", "src/vendor/rough.js",
  "src/learn/srs.js", "src/learn/packs.js", "src/learn/tts.js", "src/learn/scan.js", "src/learn/trends.js", "src/meta/bridge.js", "src/learn/packs/en-core.js", "src/learn/packs/zh-core.js", "src/learn/packs/en-business.js",
  "src/cat/brain.js", "src/cat/body.js", "src/cat/bond.js", "src/cat/lines.js", "src/cat/memory.js", "src/cat/personality.js", "src/meta/note.js",
  "assets/fonts/ph-latin-400.woff2", "assets/fonts/ph-vietnamese-400.woff2", "assets/fonts/bvp-latin-400.woff2", "assets/fonts/bvp-vietnamese-400.woff2",
  "assets/cats/index.json", "assets/cats/nana/cat.json", "assets/cats/nana/poses.json"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url); if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then((ca) => ca.put(e.request, c)); } return r; }).catch(() => caches.match(e.request).then((m) => m || caches.match("index.html"))));
});
