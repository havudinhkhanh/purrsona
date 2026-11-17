// MÈO NHẮC HỌC (thông báo hệ thống).
// 1) Xin quyền khi người dùng bấm "Cho mèo nhắc" (không tự xin lúc mở app).
// 2) Ghi "tình hình hôm nay" (đã học chưa, bao nhiêu từ chờ, chuỗi ngày, chữ nóng) vào Cache "purr-state"
//    để service worker tự soạn câu nhắc – kể cả khi app đã đóng. Tin push KHÔNG chứa dữ liệu nào.
// 3) Hẹn giờ: app còn mở → tự hẹn; Android/Chrome đã cài → Periodic Background Sync;
//    có Worker (REMIND.endpoint) → Web Push đúng giờ cả khi đóng app (iPhone cần "Thêm vào MH chính", iOS 16.4+).
import { REMIND, can } from "../config.js";
import { dayKey } from "../core/util.js";
import { save } from "../core/store.js";

const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const b64u = (s) => { const p = "=".repeat((4 - (s.length % 4)) % 4), b = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };

export function createNotify(game) {
  const s = game.save, learn = game.learn;
  s.settings.remind ||= { on: false, times: ["20:30"], streak: true };
  const R = s.settings.remind;
  s.device ||= { id: crypto.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2) };

  const support = () => "Notification" in window && "serviceWorker" in navigator;
  /** "ok" | "ask" | "denied" | "ios-install" | "unsupported" */
  function status() {
    if (isIOS() && !standalone()) return "ios-install";
    if (!support()) return "unsupported";
    return Notification.permission === "granted" ? "ok" : Notification.permission === "denied" ? "denied" : "ask";
  }
  const maxTimes = () => (can(s.plan, "remind.multi") ? 3 : 1);

  // ---- tình hình hôm nay → Cache cho service worker đọc
  function state() {
    const t = learn.todo(), hot = learn.hotToday()[0];
    return { d: dayKey(), studied: learn.studiedToday(), done: learn.doneToday?.() || false, due: t.due, neu: t.neu, streak: learn.streakAlive(), hot: hot ? hot.card.w : "", cat: game.cat.name, sen: s.profile.nick || "Sen", times: R.on ? R.times : [], streakNag: R.on && R.streak && can(s.plan, "remind.multi"), tz: Intl.DateTimeFormat().resolvedOptions().timeZone, endpoint: REMIND.endpoint || "", id: s.device.id, vapid: vapidKey || "", mood: game.today?.mood?.id || "", emo: game.today?.mood?.emo || "", wx: game.weather?.kind || "", angry: !!game.memory?.angry };
  }
  async function writeState() {
    try { const c = await caches.open("purr-state"); await c.put("state.json", new Response(JSON.stringify(state()), { headers: { "content-type": "application/json" } })); } catch { /* không có Cache API */ }
    // text/plain: không cần hỏi trước (preflight) → gửi kịp cả khi app vừa bị ẩn
    if (REMIND.endpoint && R.on && s.device.push) fetch(REMIND.endpoint + "/state", { method: "POST", headers: { "content-type": "text/plain" }, body: JSON.stringify({ id: s.device.id, state: slim() }), keepalive: true })
      .then((r) => r.json()).then((j) => { if (j && j.ok === 0) { s.device.push = false; save(s); pushSubscribe(); } }).catch(() => {});
  }
  // Worker chỉ cần biết: giờ nhắc, múi giờ, hôm nay đã học chưa (không gửi chữ, không gửi tên)
  const slim = () => { const x = state(); return { d: x.d, studied: x.studied, times: x.times, tz: x.tz, streakNag: x.streakNag, streak: x.streak > 1 }; };

  // ---- khoá VAPID lấy sẵn, để lúc bấm "Bật" gọi subscribe ngay sau khi cho phép (iPhone đòi còn trong cú chạm)
  let vapidKey = "";
  if (REMIND.endpoint) fetch(REMIND.endpoint + "/vapid").then((r) => r.text()).then((k) => { vapidKey = k.trim(); }).catch(() => {});
  // ---- nhắc khi app còn sống (tab nền trên máy tính/Android); đang mở trước mặt thì mèo kháy trong app thay vì bắn thông báo
  let timer = 0;
  function plan() {
    clearTimeout(timer); if (!R.on || status() !== "ok") return;
    const now = new Date(), next = R.times.map((hm) => { const [h, m] = hm.split(":").map(Number), d = new Date(now); d.setHours(h, m, 0, 0); if (d <= now) d.setDate(d.getDate() + 1); return d; }).sort((a, b) => a - b)[0];
    if (!next) return;
    const slot = `${String(next.getHours()).padStart(2, "0")}:${String(next.getMinutes()).padStart(2, "0")}`;
    timer = setTimeout(async () => {
      if (!document.hidden) { if (!learn.studiedToday()) game.nag?.(); }
      else { await writeState(); const reg = await navigator.serviceWorker.ready; reg.active?.postMessage({ type: "remind-now", slot }); }
      plan();
    }, Math.min(next - now, 2 ** 31 - 1));
  }

  async function pushSubscribe(reg0) {
    if (!REMIND.endpoint || !("PushManager" in window)) return false;
    try {
      const reg = reg0 || (await navigator.serviceWorker.ready); if (!vapidKey) vapidKey = (await (await fetch(REMIND.endpoint + "/vapid")).text()).trim();
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(vapidKey) }));
      const r = await fetch(REMIND.endpoint + "/subscribe", { method: "POST", headers: { "content-type": "text/plain" }, body: JSON.stringify({ id: s.device.id, sub, state: slim() }) });
      s.device.push = r.ok; save(s); return r.ok;
    } catch { return false; }
  }
  async function periodic() { try { const reg = await navigator.serviceWorker.ready; if (reg.periodicSync) { const p = await navigator.permissions.query({ name: "periodic-background-sync" }); if (p.state === "granted") await reg.periodicSync.register("purr-remind", { minInterval: 3 * 3600e3 }); } } catch { /* không hỗ trợ */ } }

  const api = {
    status, maxTimes, R,
    async enable() {
      const st = status(); if (st === "ios-install" || st === "unsupported") return st;
      const reg = await navigator.serviceWorker.getRegistration();      // lấy trước khi xin quyền: sau đó gọi subscribe ngay, không chờ thêm
      const p = await Notification.requestPermission(); if (p !== "granted") return p === "denied" ? "denied" : "ask";
      const pushing = REMIND.endpoint && reg && vapidKey ? pushSubscribe(reg) : null;
      R.on = true; R.times = R.times.slice(0, maxTimes()); save(s); await writeState(); plan(); periodic(); if (!pushing) pushSubscribe();
      return "ok";
    },
    disable() { R.on = false; save(s); clearTimeout(timer); writeState(); if (REMIND.endpoint && s.device.push) fetch(REMIND.endpoint + "/unsubscribe", { method: "POST", headers: { "content-type": "text/plain" }, body: JSON.stringify({ id: s.device.id }) }).catch(() => {}); },
    toggleTime(hm) { const has = R.times.includes(hm); if (has && R.times.length > 1) R.times = R.times.filter((x) => x !== hm); else if (!has) { if (R.times.length >= maxTimes()) return false; R.times = [...R.times, hm].sort(); } save(s); writeState(); plan(); return true; },
    async test() { await writeState(); const reg = await navigator.serviceWorker.ready; reg.active?.postMessage({ type: "remind-now", test: true }); },
    sync: writeState,
  };
  // cập nhật tình hình mỗi khi học, đổi ngày, ẩn app
  for (const k of ["learn", "streak", "hot", "lang", "mood", "weather"]) game.on(k, () => { clearTimeout(api._w); api._w = setTimeout(writeState, 1500); });
  addEventListener("visibilitychange", () => { if (document.hidden) writeState(); });
  if (support()) { writeState(); plan(); if (R.on && status() === "ok") { periodic(); if (REMIND.endpoint && !s.device.push) pushSubscribe(); } }
  return api;
}
