#!/usr/bin/env node
// =====================================================================================
// ĐÓNG GÓI BỘ KHUNG HÌNH → mèo mới cho game (không cần thư viện ngoài, Node 18+).
//
//   node tools/pack-frames.mjs <thư-mục-khung> <id-mèo> ["Tên mèo"]
//
// Thư mục khung (vd. raw/mimi) có dạng:
//   raw/mimi/
//     _cat.json        (tuỳ chọn) cấu hình chung: frameSize, anchor, unitsPerPixel, personality, clips: { walk: {fps, speed, loop} }
//     idle/0001.webp 0002.webp …      ← tên thư mục = tên động tác chuẩn (xem src/render/clips.js)
//     walk/…  run/…  sleep/…
// Kết quả: assets/cats/<id>/ (chép khung + cat.json) và thêm <id> vào assets/cats/index.json.
// Chạy lại bao nhiêu lần cũng được – bản cũ bị thay.
// =====================================================================================
import fs from "node:fs";
import path from "node:path";

const [src, id, name] = process.argv.slice(2);
if (!src || !id) { console.log("Cách dùng: node tools/pack-frames.mjs <thư-mục-khung> <id-mèo> [\"Tên mèo\"]"); process.exit(1); }
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const STD = Object.keys((await import(path.join(ROOT, "src/render/clips.js"))).CLIPS);
const IMG = /\.(png|webp|jpe?g|avif)$/i;
const readJSON = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null);
const conf = readJSON(path.join(src, "_cat.json")) || {}, bake = readJSON(path.join(src, "_bake.json")) || {};
const meta = { ...bake, ...conf, clips: { ...(bake.clips || {}), ...(conf.clips || {}) } };

// cỡ khung: đọc từ PNG (IHDR) hoặc WebP (VP8/VP8L/VP8X) của khung đầu tiên
function sizeOf(f) {
  const b = fs.readFileSync(f);
  if (b.toString("ascii", 1, 4) === "PNG") return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b.toString("ascii", 0, 4) === "RIFF") {
    const t = b.toString("ascii", 12, 16);
    if (t === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (t === "VP8L") { const n = b.readUInt32LE(21); return [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)]; }
    if (t === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  }
  return null;
}

const out = path.join(ROOT, "assets/cats", id);
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const clips = {}; let size = meta.frameSize || null, warn = [];
for (const d of fs.readdirSync(src, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const clip = d.name; if (!STD.includes(clip)) warn.push(`"${clip}" không phải tên động tác chuẩn – vẫn chép, nhưng game chỉ gọi tên chuẩn`);
  const files = fs.readdirSync(path.join(src, clip)).filter((f) => IMG.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (!files.length) continue;
  fs.mkdirSync(path.join(out, clip));
  files.forEach((f) => fs.copyFileSync(path.join(src, clip, f), path.join(out, clip, f)));
  size ||= sizeOf(path.join(src, clip, files[0]));
  const m = meta.clips[clip] || {};
  clips[clip] = { frames: files.map((f) => `${clip}/${f}`), fps: m.fps ?? 24, loop: m.loop ?? !["groom_full", "roll_play"].includes(clip), ...(m.speed ? { speed: m.speed } : {}), ...(m.blend ? { blend: true } : {}) };
  console.log(`  ${clip.padEnd(11)} ${String(files.length).padStart(3)} khung · ${clips[clip].fps} fps${clips[clip].speed ? ` · tốc độ ${clips[clip].speed}` : ""}`);
}
if (!clips.idle) { console.error("✗ Thiếu thư mục idle/ – động tác bắt buộc."); process.exit(1); }
if (!clips.walk) warn.push("Thiếu walk/ – mèo sẽ trượt khi di chuyển (dùng idle). Nên có ít nhất idle + walk.");
size ||= [512, 512];
const cat = {
  id, name: name || meta.name || id, breed: meta.breed || "", renderer: "sprite", version: 1,
  scale: meta.scale ?? 0.7, frameSize: size, anchor: meta.anchor || [size[0] / 2, size[1] * 0.94], unitsPerPixel: meta.unitsPerPixel ?? 230 / (0.45 * size[1]),
  ...(meta.eye ? { eye: meta.eye } : {}),
  personality: meta.personality || { playful: 0.6, lazy: 0.5, curious: 0.6, affectionate: 0.6, sassy: 0.4, greedy: 0.5, brave: 0.5 },
  colors: meta.colors || {}, clips,
};
fs.writeFileSync(path.join(out, "cat.json"), JSON.stringify(cat, null, 1));
const idxF = path.join(ROOT, "assets/cats/index.json"), idx = readJSON(idxF) || [];
const entry = { id, name: cat.name, renderer: "sprite", tier: meta.tier || "plus" };
const i = idx.findIndex((c) => c.id === id); if (i >= 0) idx[i] = entry; else idx.push(entry);
fs.writeFileSync(idxF, JSON.stringify(idx, null, 2));
warn.forEach((w) => console.warn("⚠ " + w));
const miss = STD.filter((c) => !clips[c]);
console.log(`✓ Đã đóng gói "${cat.name}" → assets/cats/${id}/ (${Object.keys(clips).length} động tác, khung ${size.join("×")})`);
if (miss.length) console.log(`  Chưa có (sẽ lùi về động tác gần nhất): ${miss.join(", ")}`);
console.log(`  Xem thử: mở lab.html, chọn "${cat.name}".`);
