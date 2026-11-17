// Lưu game vào máy (localStorage). Có số phiên bản để nâng cấp dữ liệu cũ khi đổi cấu trúc.
import { APP } from "../config.js";
import { dayKey } from "./util.js";
import { freshLearn } from "../learn/srs.js";

const V = 2;
export function fresh() {
  return {
    v: V, plan: "free", created: Date.now(), lastSeen: Date.now(), onboarded: false,
    catId: "nana", skin: "classic",
    cat: { room: "home", x: 900, y: 790, needs: { energy: 80, fun: 60, social: 55 }, bond: 10 },
    learn: freshLearn(),
    journal: [], visits: { last: "", streak: 0 }, notes: [],
    settings: { sound: true, follow: true, reduced: false, hour: null, aiVoice: true, music: false, ui: "m", haptics: true, tts: true, rate: 0.9, nag: "full" },
    profile: { nick: "Sen" }, cd: {},
    stats: { pets: 0, quizzes: 0 },
  };
}
function migrate(s) {
  const f = fresh();
  // thêm khoá mới mà bản lưu cũ chưa có – không bao giờ xoá dữ liệu người dùng
  const deep = (a, b) => { for (const k in b) { if (a[k] === undefined) a[k] = b[k]; else if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) deep(a[k], b[k]); } };
  deep(s, f); s.v = V; return s;
}
export function load() {
  try { const raw = localStorage.getItem(APP.saveKey); return raw ? migrate(JSON.parse(raw)) : fresh(); } catch { return fresh(); }
}
let tm = 0;
export function save(s, now = false) {
  if (globalThis.__purrReset) return;
  s.lastSeen = Date.now();
  const w = () => { try { if (s.journal.length > 400) s.journal = s.journal.slice(-400); localStorage.setItem(APP.saveKey, JSON.stringify(s)); } catch { /* đầy bộ nhớ: bỏ qua */ } };
  clearTimeout(tm); if (now) w(); else tm = setTimeout(w, 800);
}
export function log(s, type, text, extra = {}) { s.journal.push({ t: Date.now(), d: dayKey(), type, text, ...extra }); }
