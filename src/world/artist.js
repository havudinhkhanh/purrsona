// GIAO DIỆN "HỘI HOẠ" (v3): vẽ lại khu vườn thành tranh – bóng đổ mềm theo hướng nắng, ánh sáng đổi theo giờ
// (bình minh hồng cam, trưa sáng trong, chiều vàng, hoàng hôn đỏ, tối xanh có đèn cửa sổ), cây & bụi vẽ từng chùm lá,
// nền có thớ cỏ / vân gỗ / mặt nước loang, hạt giấy vẽ. Giữ nguyên 2 giao diện cũ (bút chì, tranh màu).
// Cách làm (nhẹ máy): lấy hình đã tô màu của bản "tranh màu" → chuyển thành ảnh 1 lần → phủ sáng/tối, hạt giấy,
// rồi đổ bóng xuống nền. Chỉ vẽ lại khi đổi cảnh hoặc đổi giờ (~20 phút/lần), không vẽ mỗi khung hình.
const NS = "http://www.w3.org/2000/svg";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(",")})`; };
const rgbA = (rgb, a) => rgb.replace("rgb(", "rgba(").replace(")", `,${a.toFixed(3)})`);
function rngOf(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ------------------------------------------------------------------ mặt trời theo giờ
// [giờ, màu ánh sáng phủ, độ phủ, trời trên, trời dưới]
const KEYS = [
  [0, "#1c2547", 0.42, "#141a33", "#2a3358"], [4.8, "#26305a", 0.38, "#1c2547", "#3a4370"],
  [6, "#ff9e7a", 0.2, "#f3b9a5", "#fde3c8"], [7.5, "#ffd6a8", 0.12, "#cfe2ef", "#fdf0dc"],
  [11, "#fff6e6", 0.04, "#bcdcf0", "#f4f1e4"], [14, "#fff1d8", 0.05, "#c4def0", "#f6f0df"],
  [16.5, "#ffcf8a", 0.13, "#d9d9e6", "#fbe6c2"], [18, "#ff9b62", 0.22, "#e8a98d", "#fbd2a0"],
  [19, "#b06a8a", 0.3, "#5c4a7a", "#e59a84"], [20.2, "#26305a", 0.4, "#1c2547", "#3b3f6e"], [24, "#1c2547", 0.42, "#141a33", "#2a3358"],
];
export function sunAt(h) {
  h = ((h % 24) + 24) % 24; let i = 0; while (i < KEYS.length - 2 && h >= KEYS[i + 1][0]) i++;
  const [h0, c0, a0, s0, g0] = KEYS[i], [h1, c1, a1, s1, g1] = KEYS[i + 1], t = (h - h0) / (h1 - h0 || 1);
  const day = h > 5.9 && h < 19.2, tt = clamp((h - 6) / 13, 0, 1), el = day ? Math.sin(Math.PI * tt) : 0, az = day ? tt * 2 - 1 : 0;
  const len = day ? clamp(0.32 + (1 - el) * 1.5, 0.32, 1.9) : 0.3;
  return {
    h, day, el, az, night: !day, tint: mix(c0, c1, t), tintA: lerp(a0, a1, t), sky1: mix(s0, s1, t), sky2: mix(g0, g1, t),
    sx: day ? -az * len * 0.85 : 0.12, sy: day ? 0.2 + (1 - el) * 0.22 : 0.16, alpha: (window.__shadowA || 1) * (day ? 0.3 + el * 0.12 : 0.12), blur: day ? 2 + (1 - el) * 3 : 5,
    bucket: Math.floor(h * 3),      // đổi mỗi 20 phút
  };
}

// hạt giấy vẽ (tạo 1 lần)
let grainCv = null;
function grain(c) {
  if (!grainCv) { grainCv = document.createElement("canvas"); grainCv.width = grainCv.height = 112; const g = grainCv.getContext("2d"), d = g.createImageData(112, 112), r = rngOf(7); for (let i = 0; i < 112 * 112; i++) { const v = 128 + (r() - 0.5) * 110; d.data.set([v, v, v * 0.97, 255], i * 4); } g.putImageData(d, 0, 0); }
  return c.createPattern(grainCv, "repeat");
}
// SVG → ảnh (bất đồng bộ)
function toImg(inner, f, dpr) {
  const svg = `<svg xmlns="${NS}" viewBox="${f.x} ${f.y} ${f.w} ${f.h}" width="${Math.ceil(f.w * dpr)}" height="${Math.ceil(f.h * dpr)}">${inner}</svg>`;
  return new Promise((res) => { const im = new Image(); im.decoding = "async"; im.onload = () => res(im); im.onerror = () => res(null); im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); });
}

// ------------------------------------------------------------------ phủ ánh sáng cho 1 hình
function light(c, w, h, sun, id) {
  c.save(); c.globalCompositeOperation = "source-atop";
  // khối: mặt hướng nắng sáng ấm, mặt kia tối lạnh
  const fromLeft = sun.day ? sun.az <= 0 : true, g = c.createLinearGradient(fromLeft ? 0 : w, 0, fromLeft ? w : 0, h * 0.7);
  g.addColorStop(0, `rgba(255,246,222,${(0.06 + 0.2 * sun.el).toFixed(3)})`); g.addColorStop(0.5, "rgba(255,255,255,0)"); g.addColorStop(1, `rgba(28,24,44,${(0.14 + 0.12 * (1 - sun.el)).toFixed(3)})`);
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  // chân đồ vật tối hơn (chỗ chạm đất)
  if (!/^rug|^hole|^rosebed/.test(id)) { const ao = c.createLinearGradient(0, h * 0.72, 0, h); ao.addColorStop(0, "rgba(22,20,30,0)"); ao.addColorStop(1, "rgba(22,20,30,.2)"); c.fillStyle = ao; c.fillRect(0, 0, w, h); }
  // màu nắng theo giờ + hạt giấy
  c.fillStyle = rgbA(sun.tint, sun.tintA); c.fillRect(0, 0, w, h);
  c.globalAlpha = 0.09; c.fillStyle = grain(c); c.fillRect(0, 0, w, h);
  c.restore();
}

// ------------------------------------------------------------------ cây & bụi: vẽ từng chùm lá
function leafColors(sun) { return { deep: "#1f3f26", dark: "#2e5a30", mid: "#477f3c", lit: sun.night ? "#5d7f63" : "#86b85c", hi: sun.night ? "#7d9a86" : "#c6e39a" }; }
function canopy(c, cx, cy, rx, ry, n, sun, r0, seed, under = false) {
  const R = rngOf(seed), C = leafColors(sun), lx = sun.day ? -sun.az : 0.3;      // nắng từ phía ngược hướng bóng
  // lớp tối phía sau, rồi lớp giữa, rồi đốm sáng hướng nắng
  for (let pass = 0; pass < 3; pass++) {
    const cnt = pass === 0 ? n * 0.45 : pass === 1 ? n * 0.4 : n * 0.25;
    for (let i = 0; i < cnt; i++) {
      let px, py, d; do { px = R() * 2 - 1; py = R() * 2 - 1; d = px * px + py * py; } while (d > 1 || (under && py > 0.55));
      const facing = clamp((-px * lx - py * 0.9) * 0.6 + 0.5, 0, 1), r = r0 * (0.6 + R() * 0.7) * (pass === 2 ? 0.7 : 1);
      let col = pass === 0 ? mix(C.deep, C.dark, facing) : pass === 1 ? mix(C.dark, C.lit, facing * 0.9) : mix(C.mid, C.hi, facing);
      if (pass === 2 && facing < 0.55) continue;
      c.fillStyle = col; c.globalAlpha = pass === 2 ? 0.75 : 0.92;
      c.beginPath(); c.ellipse(cx + px * rx, cy + py * ry, r, r * (0.7 + R() * 0.3), R() * 3, 0, Math.PI * 2); c.fill();
    }
  }
  c.globalAlpha = 1;
}
function paintTree(c, m, f, sun) {
  const ox = m.x - f.x, oy = m.y - f.y, w = m.w, hh = m.hh, low = document.documentElement.classList.contains("low");
  // thân: thớ vỏ, sáng phía nắng
  const tg = c.createLinearGradient(ox - w * 0.06, 0, ox + w * 0.06, 0), lit = sun.day && sun.az > 0;
  tg.addColorStop(0, lit ? "#3d2a1d" : "#7a5638"); tg.addColorStop(1, lit ? "#7a5638" : "#3d2a1d");
  c.fillStyle = tg; c.beginPath(); c.moveTo(ox - w * 0.07, oy); c.quadraticCurveTo(ox - w * 0.03, oy - hh * 0.5, ox - w * 0.045, oy - hh * 1.05); c.lineTo(ox + w * 0.045, oy - hh * 1.05); c.quadraticCurveTo(ox + w * 0.03, oy - hh * 0.5, ox + w * 0.08, oy); c.closePath(); c.fill();
  c.strokeStyle = "rgba(40,26,16,.45)"; c.lineWidth = 1; for (let i = 0; i < 5; i++) { const x = ox - w * 0.03 + i * w * 0.015; c.beginPath(); c.moveTo(x, oy - 2); c.lineTo(x + (i % 2 ? 1 : -1), oy - hh * 0.9); c.stroke(); }
  // cành vươn lên tán
  c.strokeStyle = "#4a3324"; c.lineCap = "round"; for (const [dx, dy, lw] of [[-0.22, -1.25, 3], [0.2, -1.3, 2.6], [0.02, -1.45, 2.2]]) { c.lineWidth = lw; c.beginPath(); c.moveTo(ox, oy - hh * 0.95); c.quadraticCurveTo(ox + w * dx * 0.4, oy - hh * 1.15, ox + w * dx, oy + hh * dy); c.stroke(); }
  canopy(c, ox + w * 0.04, oy - hh * 1.28, w * 0.56, hh * 0.62, low ? 170 : 300, sun, w * 0.085, 11);
}
function paintBush(c, m, f, sun, seed) {
  const ox = m.x - f.x, oy = m.y - f.y, w = m.w, low = document.documentElement.classList.contains("low");
  canopy(c, ox, oy - w * 0.62, w * 1.05, w * 0.62, low ? 50 : 90, sun, w * 0.24, seed, true);
}

// ------------------------------------------------------------------ nền: thớ cỏ, nước, nắng loang, tối mép
function groundArt(c, vw, vh, sun, G) {
  const { P, UW, UH, HOUSE } = G, low = document.documentElement.classList.contains("low"), R = rngOf(3);
  const lawn = [P(0, 0), P(UW, 0), P(UW, UH), P(0, UH)];
  c.save(); c.beginPath(); lawn.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.clip();
  // thớ cỏ mịn
  const cols = sun.night ? ["#2f4a3a", "#3c5a46", "#4a6b52"] : ["#5f8f45", "#86b25f", "#a9cb7e", "#4f7a3a", "#c5dd9a"];
  c.lineCap = "round";
  for (let i = 0, n = low ? 900 : 2600; i < n; i++) { const u = R() * UW, v = R() * UH; if (u > HOUSE.u0 - 0.4 && v < HOUSE.v1 + 0.4) continue; const [x, y] = P(u, v), L = 2 + R() * 4.5; c.strokeStyle = cols[i % cols.length]; c.globalAlpha = 0.18 + R() * 0.3; c.lineWidth = 0.8 + R() * 0.9; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + (R() - 0.5) * 2, y - L * 0.6, x + (R() - 0.5) * 3, y - L); c.stroke(); }
  c.globalAlpha = 1; c.restore();
  // mặt ao: loang sáng ở giữa + vệt phản chiếu
  { const [px, py] = P(24, 56), [ex] = P(33, 56), rx = Math.abs(ex - px), ry = rx * 0.48;
    const g = c.createRadialGradient(px - rx * 0.25, py - ry * 0.3, rx * 0.05, px, py, rx); g.addColorStop(0, sun.night ? "rgba(120,140,200,.35)" : "rgba(235,250,255,.55)"); g.addColorStop(0.6, "rgba(120,180,200,.12)"); g.addColorStop(1, "rgba(30,70,90,.25)");
    c.save(); c.beginPath(); c.ellipse(px, py, rx * 0.97, ry * 0.97, 0, 0, Math.PI * 2); c.clip(); c.fillStyle = g; c.fillRect(px - rx, py - ry, rx * 2, ry * 2);
    c.strokeStyle = sun.night ? "rgba(220,230,255,.35)" : "rgba(255,255,255,.7)"; c.lineWidth = 1.4; for (let i = 0; i < 7; i++) { const yy = py - ry * 0.5 + i * ry * 0.16, xx = px - rx * 0.5 + R() * rx * 0.6; c.globalAlpha = 0.4 + R() * 0.4; c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx + rx * (0.12 + R() * 0.2), yy); c.stroke(); }
    c.restore(); }
  // vân gỗ sàn nhà
  { c.save(); const fl = [P(HOUSE.u0, HOUSE.v0), P(HOUSE.u1, HOUSE.v0), P(HOUSE.u1, HOUSE.v1), P(HOUSE.u0, HOUSE.v1)]; c.beginPath(); fl.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.clip();
    c.strokeStyle = "rgba(110,70,40,.18)"; c.lineWidth = 0.8; for (let i = 0; i < (low ? 40 : 110); i++) { const u = HOUSE.u0 + R() * (HOUSE.u1 - HOUSE.u0), v = HOUSE.v0 + R() * (HOUSE.v1 - HOUSE.v0), [x, y] = P(u, v), [x2, y2] = P(u + 2 + R() * 4, v); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo((x + x2) / 2, (y + y2) / 2 + (R() - 0.5) * 2, x2, y2); c.stroke(); }
    // nắng xiên qua cửa sổ / cửa ra vào in vệt sáng lên sàn
    if (sun.day) { const [dx, dy] = P(77, HOUSE.v1 - 4), g = c.createRadialGradient(dx, dy, 2, dx, dy, 60); g.addColorStop(0, `rgba(255,236,190,${(0.25 * sun.el + 0.1).toFixed(2)})`); g.addColorStop(1, "rgba(255,236,190,0)"); c.fillStyle = g; c.fillRect(dx - 70, dy - 70, 140, 140); }
    c.restore(); }
  // phủ màu giờ + nắng chéo + tối mép + hạt giấy
  c.save(); c.globalCompositeOperation = "source-atop";
  const fromLeft = !sun.day || sun.az <= 0, [a0] = P(0, 0), [a1] = P(UW, UH);
  const sg = c.createLinearGradient(fromLeft ? a0 : a1, 0, fromLeft ? a1 : a0, vh); sg.addColorStop(0, `rgba(255,244,214,${(0.05 + 0.18 * sun.el).toFixed(3)})`); sg.addColorStop(0.6, "rgba(255,255,255,0)"); sg.addColorStop(1, `rgba(24,30,40,${(0.1 + 0.1 * (1 - sun.el)).toFixed(3)})`);
  c.fillStyle = sg; c.fillRect(0, 0, vw, vh);
  c.fillStyle = rgbA(sun.tint, sun.tintA); c.fillRect(0, 0, vw, vh);
  c.globalAlpha = 0.08; c.fillStyle = grain(c); c.fillRect(0, 0, vw, vh); c.restore();
}

// ------------------------------------------------------------------ bóng đổ mềm của đồ vật đứng lên nền
const CASTS = /^(tree|bush|wall-|desk|shelf|bench|fence-|rack|swing|slide|trellis|pot|rose\d|v_|catbed)/;
function shadows(c, list, sun, dpr) {
  const blurOk = typeof c.filter === "string";
  for (const o of list) {
    if (!CASTS.test(o.id)) continue;
    const f = o.f, base = o.base, w = f.w, h = f.h, sil = document.createElement("canvas"); sil.width = o.cv.width; sil.height = o.cv.height;
    const s = sil.getContext("2d"); s.drawImage(o.src || o.cv, 0, 0); s.globalCompositeOperation = "source-in"; s.fillStyle = sun.night ? "#0c1230" : "#1d2618"; s.fillRect(0, 0, sil.width, sil.height);
    const sx = sun.sx, sy = sun.sy;
    // điểm (x, y) cao (base - y) so với chân → rơi xuống nền: x + cao·sx, base + cao·sy
    c.save();
    // ma trận trên áp vào toạ độ cục bộ (0..w, 0..h) của hình: x' = f.x + lx + sx·(base − f.y − ly), y' = base + sy·(base − f.y − ly)
    c.setTransform(dpr, 0, -sx * dpr, -sy * dpr, (f.x + sx * (base - f.y)) * dpr, (base + sy * (base - f.y)) * dpr);
    const A = sun.alpha * (/^wall-/.test(o.id) ? 0.5 : 1);
    if (blurOk) { c.filter = `blur(${sun.blur.toFixed(1)}px)`; c.globalAlpha = A; c.drawImage(sil, 0, 0, w, h); c.filter = "none"; }
    else { c.globalAlpha = A / 4; for (const [dx, dy] of [[0, 0], [1.5, 0.5], [-1.2, 0.8], [0.6, -1.1]]) c.drawImage(sil, dx, dy, w, h); }
    c.restore();
  }
}
// đèn ban đêm: cửa sổ & cửa nhà hắt sáng vàng ấm
function nightGlow(c, G) {
  const { P, HOUSE } = G; c.save(); c.globalCompositeOperation = "lighter";
  for (const [u, v, r] of [[77, HOUSE.v1 + 2, 70], [76, 6, 55], [68.5, 3, 40], [86, 3, 40]]) { const [x, y] = P(u, v), g = c.createRadialGradient(x, y, 2, x, y, r); g.addColorStop(0, "rgba(255,190,110,.42)"); g.addColorStop(1, "rgba(255,190,110,0)"); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
  c.restore();
}

export function createArtist() {
  let gen = 0, groundCv = null, groundSvg = null;
  const dprOf = () => Math.min(document.documentElement.classList.contains("low") ? 1 : 2, window.devicePixelRatio || 1);
  async function upgrade({ world, ground, metas, hour, vw, vh, G }) {
    const my = ++gen, dpr = dprOf(), sun = sunAt(hour); groundSvg = ground;
    const nodes = [...world.querySelectorAll("svg.spr[data-id]")].filter((n) => n._fit && !/^fl\d/.test(n.dataset.id));
    // 1) từng đồ vật → ảnh (song song), phủ ánh sáng
    const imgs = await Promise.all(nodes.map((n) => { const m = metas[n.dataset.id]; return m ? Promise.resolve(null) : toImg(n.innerHTML, n._fit, dpr); }));
    if (my !== gen) return;
    const list = [];
    nodes.forEach((n, i) => {
      const id = n.dataset.id, m = metas[id], pad = m ? m.w * 0.18 : 0, f0 = n._fit, f = { x: f0.x - pad, y: f0.y - pad, w: f0.w + pad * 2, h: f0.h + pad * 2 };
      if (!m && !imgs[i]) return;
      const cv = document.createElement("canvas"); cv.className = "spr art"; cv.dataset.id = id; cv.width = Math.ceil(f.w * dpr); cv.height = Math.ceil(f.h * dpr);
      Object.assign(cv.style, { left: f.x + "px", top: f.y + "px", width: f.w + "px", height: f.h + "px", zIndex: n.style.zIndex, transformOrigin: n.style.transformOrigin, transform: n.style.transform });
      cv._fit = f; const c = cv.getContext("2d"); c.scale(dpr, dpr);
      if (m?.kind === "tree") paintTree(c, m, f, sun); else if (m?.kind === "bush") paintBush(c, m, f, sun, [...id].reduce((a, ch) => a + ch.charCodeAt(0), 0)); else c.drawImage(imgs[i], 0, 0, f.w, f.h);
      // trước khi phủ sáng: giữ 1 bản để cắt bóng
      let src = null; if (CASTS.test(id)) { src = document.createElement("canvas"); src.width = cv.width; src.height = cv.height; src.getContext("2d").drawImage(cv, 0, 0); }
      light(c, f.w, f.h, sun, id);
      if (sun.night && id === "wall-back") { const [wx, wy] = G.P(68.5, 0, 6.25), [vx, vy] = G.P(86, 0, 6.5); c.save(); c.globalCompositeOperation = "source-atop"; for (const [x, y] of [[wx, wy], [vx, vy]]) { const g = c.createRadialGradient(x - f.x, y - f.y, 1, x - f.x, y - f.y, 26); g.addColorStop(0, "rgba(255,210,130,.9)"); g.addColorStop(1, "rgba(255,210,130,0)"); c.fillStyle = g; c.fillRect(0, 0, f.w, f.h); } c.restore(); }
      list.push({ n, cv, src, f, id, base: m ? m.y : f0.y + f0.h - 1 });      // chân đồ vật = đáy hình (cây/bụi: gốc)
    });
    // 2) nền
    const gi = await toImg(ground.innerHTML, { x: 0, y: 0, w: vw, h: vh }, dpr); if (my !== gen) return;
    const gc = document.createElement("canvas"); gc.className = "ground-art"; gc.width = Math.ceil(vw * dpr); gc.height = Math.ceil(vh * dpr); Object.assign(gc.style, { width: vw + "px", height: vh + "px" });
    const g = gc.getContext("2d"); g.scale(dpr, dpr); if (gi) g.drawImage(gi, 0, 0, vw, vh);
    groundArt(g, vw, vh, sun, G);
    shadows(g, list, sun, dpr);
    if (sun.night) nightGlow(g, G);
    // 3) đổi vào cảnh một lượt (không chớp)
    for (const o of list) if (o.n.isConnected) o.n.replaceWith(o.cv);
    groundCv?.remove(); groundCv = gc; ground.after(gc); ground.style.visibility = "hidden";
    world.parentElement.style.setProperty("--sky1", sun.sky1); world.parentElement.style.setProperty("--sky2", sun.sky2);
    return sun;
  }
  function clear() { gen++; groundCv?.remove(); groundCv = null; if (groundSvg) groundSvg.style.visibility = ""; }
  return { upgrade, clear, get ground() { return groundCv; } };
}
