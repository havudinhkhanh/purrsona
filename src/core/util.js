export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = { io: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2), out: (u) => 1 - Math.pow(1 - u, 3), inOutSine: (u) => -(Math.cos(Math.PI * u) - 1) / 2 };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/** băm chuỗi → số nguyên 32-bit (xmur3) */
export function hash(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; }
/** bộ sinh số ngẫu nhiên có hạt giống (mulberry32) – cùng hạt → cùng kết quả (tính cách theo ngày) */
export function rng(seed) { let a = typeof seed === "string" ? hash(seed) : seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];
export function weighted(items, w, r = Math.random) { const s = items.reduce((t, x) => t + Math.max(0, w(x)), 0); let k = r() * s; for (const x of items) { k -= Math.max(0, w(x)); if (k <= 0) return x; } return items[items.length - 1]; }

/** ngày theo giờ máy người dùng: "2026-11-15" */
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const hhmm = (t = Date.now()) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
export const fmtDur = (ms) => { const m = Math.round(ms / 60000); if (m < 60) return `${m} phút`; const h = Math.floor(m / 60); return m % 60 ? `${h} giờ ${m % 60} phút` : `${h} giờ`; };
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** bus sự kiện nhỏ */
export function bus() { const m = new Map(); return { on(e, f) { (m.get(e) || m.set(e, new Set()).get(e)).add(f); return () => m.get(e).delete(f); }, emit(e, d) { (m.get(e) || []).forEach((f) => f(d)); } }; }
