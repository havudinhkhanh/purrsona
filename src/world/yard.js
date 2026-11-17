import { fitSvg } from "../render/fit.js";
// KHU VƯỜN NHÌN TỪ TRÊN XUỐNG (hơi xiên) – một cảnh duy nhất, vừa khít màn hình như hình nền.
// Mặt đất là hình chữ nhật (u: 0..UW, v: 0..UH) chiếu lên màn hình bằng phép xoay + nén dọc.
// Góc sau bên phải là căn nhà (tường thấp kiểu cắt ngang), còn lại là vườn: luống hoa, cây, ghế, ao, lối đá.
// Mỗi từ đã thuộc là 1 bông hoa có ghi chữ, mọc dần trên các luống.
import rough from "../vendor/rough.js";
import { rng, clamp, lerp, esc } from "../core/util.js";

export const UW = 100, UH = 64;
const INK = "#262626", INK2 = "#5c5c5c", INK3 = "#9a9a9a", PAPER = "#F3F0E8", WHITE = "#FBFAF6";
const HS = 0.9;
let PHI = (-13 * Math.PI) / 180, TILT = 0.56;

/** các vùng & chỗ ngồi (toạ độ mặt đất) */
export const HOUSE = { u0: 64, u1: 100, v0: 0, v1: 30, door: [73, 81], side: [17, 25] };
export const BEDS = [{ u0: 6, u1: 54, v0: 25, v1: 31 }, { u0: 10, u1: 58, v0: 43, v1: 49 }, { u0: 67, u1: 96, v0: 40, v1: 58 }];
export const SPOTS = {
  desk: { u: 76, v: 3.2, h: 7, zone: "house", use: ["loaf", "nap", "perch", "write"] },
  shelf: { u: 92, v: 1.6, h: 16, zone: "house", use: ["perch", "watch"] },
  catbed: { u: 92, v: 22, h: 0.6, zone: "house", use: ["nap"] },
  rug: { u: 80, v: 15, h: 0, zone: "house", use: ["play", "roll", "groom", "loaf"] },
  sill: { u: 68, v: 0.8, h: 8, zone: "house", use: ["watch", "nap"] },
  bench: { u: 20, v: 9, h: 4, zone: "garden", use: ["nap", "loaf", "perch"] },
  branch: { u: 46, v: 8, h: 15, zone: "garden", use: ["perch", "watch"] },
  stone: { u: 60, v: 52, h: 0, zone: "garden", use: ["nap", "groom"] },
  flowers: { u: 30, v: 37, h: 0, zone: "garden", use: ["play", "roll", "watch"] },
  pond: { u: 25, v: 49.7, h: 0, zone: "garden", use: ["watch"] },
};

const ZOOM = {
  near: { p: { x0: 0.05, x1: 0.95, y0: 0.3, y1: 0.885 }, l: { x0: 0.12, x1: 0.97, y0: 0.2, y1: 0.86 }, over: 1.32, cat: 12 },
  mid: { p: { x0: 0.04, x1: 0.96, y0: 0.42, y1: 0.86 }, l: { x0: 0.1, x1: 0.9, y0: 0.44, y1: 0.88 }, over: 1.08, cat: 10 },
  far: { p: { x0: 0.12, x1: 0.88, y0: 0.5, y1: 0.86 }, l: { x0: 0.2, x1: 0.8, y0: 0.52, y1: 0.88 }, over: 1, cat: 10 },
};
export function createYard(root) {
  const vp = document.createElement("div"); vp.className = "viewport"; root.appendChild(vp);
  vp.innerHTML = `<svg class="ground"></svg><div class="world"><div class="actors"></div></div><div class="shade"></div><div class="topfx"></div>`;
  const G = rough.generator(), ground = vp.querySelector(".ground"), world = vp.querySelector(".world"), actors = vp.querySelector(".actors"), topfx = vp.querySelector(".topfx");
  const S = { vp, vw: 1, vh: 1, k: 1, ox: 0, oy: 0, night: 0, hour: 12, follow: false, forceHour: null, portrait: false, catH: 70, density: "full", zoom: "mid", zf: 1, fu: null, fv: null };
  const ZMIN = 0.7, ZMAX = 3.2, cam = { x: 0, y: 0, tx: 0, ty: 0, hot: 0 };
  // độ dày chi tiết của vườn: full = đầy đủ, calm = gọn, bare = trống (chỉ giữ thứ mèo dùng: nhà, cây, ghế, ao, luống hoa)
  const DENS = { full: { grass: 260, stones: 1, bushes: 4, wild: 10, beds: "dots" }, calm: { grass: 110, stones: 1, bushes: 2, wild: 4, beds: "dots" }, bare: { grass: 28, stones: 0, bushes: 0, wild: 0, beds: "line" } };
  const Dn = () => DENS[S.density] || DENS.full;
  let SEED = 1;
  const o = (x = {}) => ({ seed: SEED++, roughness: 1.1, bowing: 0.9, stroke: INK, strokeWidth: 1.6, fillStyle: "hachure", hachureGap: 6, fillWeight: 0.9, hachureAngle: -41, ...x });
  const out = (d) => G.toPaths(d).map((p) => `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill || "none"}" stroke-linecap="round" stroke-linejoin="round"/>`).join("");
  const D = {
    line: (a, b, x) => out(G.line(a[0], a[1], b[0], b[1], o(x))),
    poly: (pts, x) => out(G.polygon(pts, o(x))),
    lines: (pts, x) => out(G.linearPath(pts, o(x))),
    curve: (pts, x) => out(G.curve(pts, o(x))),
    ell: (cx, cy, w, h, x) => out(G.ellipse(cx, cy, w, h, o(x))),
    circle: (cx, cy, d, x) => out(G.circle(cx, cy, d, o(x))),
    path: (d, x) => out(G.path(d, o(x))),
  };

  // ------------------------------------------------------------------ phép chiếu
  const P = (u, v, h = 0) => [S.ox + (u * Math.cos(PHI) - v * Math.sin(PHI)) * S.k, S.oy + (u * Math.sin(PHI) + v * Math.cos(PHI)) * TILT * S.k - h * S.k * HS];
  function unP(x, y) { const a = (x - S.ox) / S.k, b = (y - S.oy) / (S.k * TILT); return { u: a * Math.cos(PHI) + b * Math.sin(PHI), v: -a * Math.sin(PHI) + b * Math.cos(PHI) }; }
  const rect = (u0, v0, u1, v1, h = 0) => [P(u0, v0, h), P(u1, v0, h), P(u1, v1, h), P(u0, v1, h)];
  const ring = (cu, cv, ru, rv, n = 18) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return P(cu + Math.cos(a) * ru, cv + Math.sin(a) * rv); });

  function layout() {
    S.vw = vp.clientWidth; S.vh = vp.clientHeight; S.portrait = S.vw < S.vh * 0.95;
    // màn dọc: xoay mạnh hơn + nhìn gần thẳng từ trên xuống để mảnh vườn cao lên, đầy màn hình hơn
    PHI = ((S.portrait ? -24 : -13) * Math.PI) / 180; TILT = S.portrait ? 0.7 : 0.56;
    // khung đặt khu vườn: chừa góc trên trái cho chữ, chừa đáy cho thanh chữ nhỏ
    // TẦM NHÌN: gần = vườn tràn màn hình; vừa / xa = vườn lùi ra xa, chừa trời trống cho chữ, mèo nhỏ theo đúng tỉ lệ
    const Z = ZOOM[S.zoom] || ZOOM.mid, R = { ...(S.portrait ? Z.p : Z.l) };
    S.k = 1; S.ox = 0; S.oy = 0;
    const c = [P(0, 0), P(UW, 0), P(UW, UH), P(0, UH)], xs = c.map((p) => p[0]), ys = c.map((p) => p[1]);
    const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
    S.k = Math.min(((R.x1 - R.x0) * S.vw * (S.portrait ? Z.over : 1)) / bw, ((R.y1 - R.y0) * S.vh) / bh);      // màn dọc "gần": cho tràn 2 mép như ảnh nền
    S.ox = (R.x0 * S.vw + (R.x1 - R.x0) * S.vw / 2) - ((Math.min(...xs) + bw / 2) * S.k);
    S.oy = (R.y0 * S.vh + (R.y1 - R.y0) * S.vh / 2) - ((Math.min(...ys) + bh / 2) * S.k);
    // tranh chữ đang chiếm phần trời: lùi mặt sân xuống sao cho cả ngọn cây / mái nhà (~27 đơn vị cao) vẫn nằm dưới chữ
    for (let i = 0; i < 4 && S.reserve; i++) {
      const gTop = Math.min(...[P(0, 0), P(UW, 0), P(UW, UH), P(0, UH)].map((p) => p[1])), need = S.reserve + 27 * S.k * HS;
      if (gTop >= need - 1) break;
      R.y0 = Math.min(R.y1 - 0.25, R.y0 + (need - gTop) / S.vh + 0.005);
      S.k = Math.min(((R.x1 - R.x0) * S.vw * (S.portrait ? Z.over : 1)) / bw, ((R.y1 - R.y0) * S.vh) / bh);
      S.ox = (R.x0 * S.vw + (R.x1 - R.x0) * S.vw / 2) - ((Math.min(...xs) + bw / 2) * S.k);
      S.oy = (R.y0 * S.vh + (R.y1 - R.y0) * S.vh / 2) - ((Math.min(...ys) + bh / 2) * S.k);
    }
    // PHÓNG TO / THU NHỎ (chụm 2 ngón): phóng quanh điểm (fu, fv) của sân, điểm đó nằm đúng chỗ tâm sân cũ
    if (S.zf !== 1) {
      const [ax, ay] = P(UW / 2, UH / 2), fu = clamp(S.fu ?? UW / 2, 0, UW), fv = clamp(S.fv ?? UH / 2, 0, UH);
      S.k *= S.zf; S.ox = 0; S.oy = 0; const [px, py] = P(fu, fv); S.ox = ax - px; S.oy = ay - py;
    }
    const top = Math.min(...[P(0, 0), P(UW, 0), P(UW, UH), P(0, UH)].map((p) => p[1])), bot = Math.max(...[P(0, 0), P(UW, 0), P(UW, UH), P(0, UH)].map((p) => p[1]));
    S.yTop = top; S.yBot = bot;
    // mèo cao theo đơn vị sân (xích đu cao 13): luật xa gần đúng, mèo không to hơn đồ vật; tối thiểu 26px cho dễ thấy
    S.catH = Math.max(26, S.k * Z.cat);
    document.documentElement.style.setProperty("--sc", clamp(S.k / 4, 0.72, 1).toFixed(2));      // lời mèo / chữ cạnh mèo co theo cảnh
    document.documentElement.style.setProperty("--gw", `${Math.round((Math.max(...[P(0, 0), P(UW, 0), P(UW, UH), P(0, UH)].map((p) => p[0])) - Math.min(...[P(0, 0), P(UW, 0), P(UW, UH), P(0, UH)].map((p) => p[0]))) * 1.1)}px`);
    vp.style.setProperty("--crit", clamp(S.k / 4.6, 0.5, 1).toFixed(2));      // bướm ong bay chơi thu nhỏ theo cảnh
    draw(); api.onLayout?.(); camApply(true);
  }

  // ------------------------------------------------------------------ vẽ
  const sprites = [];
  function sprite(id, baseY, svg) { sprites.push({ id, z: Math.round(baseY), svg }); }
  function draw() {
    SEED = 11; sprites.length = 0; const r = rng("yard"), k = S.k;
    let g = "";
    // bóng đổ của cả mảnh đất + mặt cỏ
    g += `<g opacity=".35">${D.poly(rect(1.2, 1.6, UW + 1.2, UH + 1.6), { stroke: "none", fill: INK3, hachureGap: 5 })}</g>`;
    g += D.poly(rect(0, 0, UW, UH), { fill: PAPER, fillStyle: "solid", strokeWidth: 2.2 });
    for (let i = 0; i < Dn().grass; i++) { const u = r() * UW, v = r() * UH; if (u > HOUSE.u0 && v < HOUSE.v1) continue; const [x, y] = P(u, v), h = (3 + r() * 5) * k * 0.08; g += `<path d="M${x - 3} ${y} q2 ${-h} 0 ${-h * 1.6} M${x} ${y} q1 ${-h * 1.4} 3 ${-h * 1.9} M${x + 3} ${y} q-1 ${-h} 3 ${-h * 1.3}" stroke="${INK2}" stroke-width="1.1" fill="none" opacity="${(0.25 + r() * 0.35).toFixed(2)}" stroke-linecap="round"/>`; }
    // nhà: sàn gỗ
    const H0 = HOUSE;
    g += D.poly(rect(H0.u0, H0.v0, H0.u1, H0.v1), { fill: WHITE, fillStyle: "solid", strokeWidth: 2 });
    for (let v = 3; v < H0.v1; v += 3) g += `<g opacity=".45">${D.line(P(H0.u0, v), P(H0.u1, v), { strokeWidth: 1, stroke: INK2 })}</g>`;
    g += D.poly(ring(80, 15, 9, 6), { fill: INK3, fillStyle: "cross-hatch", hachureGap: 7, strokeWidth: 1.3 });
    // lối đá từ cửa nhà ra vườn
    if (Dn().stones) for (const [u, v] of [[77, 33.5], [72, 38], [66, 42], [62, 47.5], [57, 52], [52, 56.5]]) g += D.poly(ring(u, v, 2.6, 1.9, 10), { fill: WHITE, fillStyle: "solid", strokeWidth: 1.3 });
    // ao
    g += D.poly(ring(24, 56, 9, 5.2, 22), { fill: INK3, hachureGap: 4.5, hachureAngle: 10, strokeWidth: 1.8 }) + `<g opacity=".6">${D.curve([P(19, 55), P(22, 54.4), P(25, 55)], { strokeWidth: 1, stroke: WHITE })}</g>`;
    // luống hoa (đất xới)
    for (const b of BEDS) g += Dn().beds === "dots" ? D.poly(rect(b.u0, b.v0, b.u1, b.v1), { fill: INK3, fillStyle: "dots", hachureGap: 7, strokeWidth: 1.5 }) : `<g opacity=".55">${D.poly(rect(b.u0, b.v0, b.u1, b.v1), { strokeWidth: 1.2 })}</g>`;
    ground.setAttribute("viewBox", `0 0 ${S.vw} ${S.vh}`); ground.innerHTML = g;

    // tường nhà (thấp, kiểu cắt ngang) + tường sau có cửa sổ
    const wallH = 10, low = 2.2;
    sprite("wall-back", P(H0.u0, H0.v0)[1] - 2, D.poly([P(H0.u0, 0), P(H0.u1, 0), P(H0.u1, 0, wallH), P(H0.u0, 0, wallH)], { fill: WHITE, fillStyle: "solid", strokeWidth: 2 })
      + D.poly([P(66, 0, 4), P(71, 0, 4), P(71, 0, 8.5), P(66, 0, 8.5)], { fill: INK3, hachureGap: 4, strokeWidth: 1.4 }) + D.poly([P(84, 0, 5), P(88, 0, 5), P(88, 0, 8), P(84, 0, 8)], { strokeWidth: 1.3 }));
    const lowWall = (a, b) => D.poly([a, b, [b[0], b[1] - low * k * HS], [a[0], a[1] - low * k * HS]], { fill: INK2, hachureGap: 3.5, strokeWidth: 1.6 });
    sprite("wall-left-a", P(H0.u0, H0.side[0])[1], lowWall(P(H0.u0, 0), P(H0.u0, H0.side[0])));
    sprite("wall-left-b", P(H0.u0, H0.v1)[1], lowWall(P(H0.u0, H0.side[1]), P(H0.u0, H0.v1)));
    sprite("wall-front-a", P(H0.u0, H0.v1)[1] + 1, lowWall(P(H0.u0, H0.v1), P(H0.door[0], H0.v1)));
    sprite("wall-front-b", P(H0.u1, H0.v1)[1] + 1, lowWall(P(H0.door[1], H0.v1), P(H0.u1, H0.v1)));
    // bàn học + laptop + đèn
    const box = (u0, v0, u1, v1, h, x) => D.poly([P(u0, v1, h), P(u1, v1, h), P(u1, v0, h), P(u0, v0, h)], x) + D.poly([P(u0, v1, 0), P(u1, v1, 0), P(u1, v1, h), P(u0, v1, h)], { fill: INK3, hachureGap: 4, strokeWidth: 1.4, ...(x?.side || {}) });
    sprite("desk", P(76, 5.5)[1], box(70, 0.6, 83, 5.5, 7, { fill: WHITE, fillStyle: "solid" }) + D.poly([P(72, 3.6, 7), P(77, 3.6, 7), P(77, 2.2, 10.5), P(72, 2.2, 10.5)], { fill: WHITE, fillStyle: "solid", strokeWidth: 1.6 }) + D.line(P(81, 2, 7), P(81, 2, 11)) + D.poly([P(80, 2, 11), P(82.6, 2, 11), P(81.6, 2, 13)], { fill: INK2, hachureGap: 3 }));
    // kệ sách
    sprite("shelf", P(92, 3)[1], box(87, 0.4, 97, 3, 16, { fill: WHITE, fillStyle: "solid" }) + [4, 8, 12].map((h) => D.line(P(87, 3, h), P(97, 3, h), { strokeWidth: 1.4 })).join("") + Array.from({ length: 9 }, (_, i) => D.poly([P(87.6 + i * 1.05, 3, 0.2 + (i % 3) * 4), P(88.4 + i * 1.05, 3, 0.2 + (i % 3) * 4), P(88.4 + i * 1.05, 3, 3 + (i % 3) * 4), P(87.6 + i * 1.05, 3, 3 + (i % 3) * 4)], i % 2 ? { fill: INK2, hachureGap: 2.5, strokeWidth: 1 } : { strokeWidth: 1 })).join(""));
    // ổ mèo
    sprite("catbed", P(92, 24)[1], D.poly(ring(92, 22, 4, 2.6), { fill: INK3, fillStyle: "cross-hatch", hachureGap: 5 }) + D.poly(ring(92, 22, 2.6, 1.6), { fill: WHITE, fillStyle: "solid" }));
    // cây (tán tròn nhìn từ trên, thân đứng)
    { const [x, y] = P(48, 9), w = 20 * k, hh = 15 * k * HS; sprite("tree", y, `<g opacity=".4">${D.ell(x, y, w * 0.8, w * 0.3, { stroke: "none", fill: INK3, hachureGap: 4 })}</g>` + D.line([x - 0.6 * k, y], [x - 0.6 * k, y - hh], { strokeWidth: 2.2 }) + D.line([x + 0.6 * k, y], [x + 0.6 * k, y - hh * 0.9], { strokeWidth: 1.6 }) + D.path(`M${x - w * 0.55} ${y - hh * 0.9} C${x - w * 0.62} ${y - hh * 1.6} ${x - w * 0.1} ${y - hh * 1.95} ${x + w * 0.12} ${y - hh * 1.7} C${x + w * 0.5} ${y - hh * 1.85} ${x + w * 0.66} ${y - hh * 1.2} ${x + w * 0.48} ${y - hh * 0.95} C${x + w * 0.4} ${y - hh * 0.6} ${x - w * 0.35} ${y - hh * 0.55} ${x - w * 0.55} ${y - hh * 0.9} Z`, { fill: INK2, hachureGap: 5, hachureAngle: 60, strokeWidth: 1.8 })); }
    // ghế đá
    sprite("bench", P(20, 10)[1], box(15, 8, 25, 10, 4, { fill: WHITE, fillStyle: "solid" }));
    // bụi cây
    for (const [u, v, s2] of [[4, 4, 5], [56, 3, 4], [6, 60, 4.5], [96, 61, 4]].slice(0, Dn().bushes)) { const [x, y] = P(u, v), w = s2 * k; sprite("bush" + u, y, D.path(`M${x - w} ${y} C${x - w * 1.2} ${y - w * 0.9} ${x - w * 0.3} ${y - w * 1.5} ${x} ${y - w * 1.1} C${x + w * 0.4} ${y - w * 1.6} ${x + w * 1.3} ${y - w * 0.8} ${x + w} ${y} Z`, { fill: INK3, hachureGap: 5, hachureAngle: 30, strokeWidth: 1.5 })); }
    // hàng rào thấp quanh vườn (bỏ đoạn của nhà)
    const post = (u, v) => { const [x, y] = P(u, v), [, yt] = P(u, v, 3.2); return D.line([x, y], [x, yt], { strokeWidth: 1.7 }); };
    let fb = "", fl = "", ff = "", fr = "";
    for (let u = 0; u <= HOUSE.u0; u += 4) fb += post(u, 0);
    fb += D.line(P(0, 0, 2.4), P(HOUSE.u0, 0, 2.4), { strokeWidth: 1.3 });
    for (let v = 4; v <= UH; v += 4) fl += post(0, v); fl += D.line(P(0, 0, 2.4), P(0, UH, 2.4), { strokeWidth: 1.3 });
    for (let v = HOUSE.v1 + 2; v <= UH; v += 4) fr += post(UW, v); fr += D.line(P(UW, HOUSE.v1, 2.4), P(UW, UH, 2.4), { strokeWidth: 1.3 });
    for (let u = 4; u < UW; u += 4) ff += post(u, UH); ff += D.line(P(0, UH, 2.4), P(UW, UH, 2.4), { strokeWidth: 1.3 });
    sprite("fence-back", P(0, 0)[1] - 50, fb); sprite("fence-left", P(0, 0)[1], fl); sprite("fence-right", P(UW, HOUSE.v1)[1], fr); sprite("fence-front", 99999, ff);
    api.extraDraw?.({ D, P, sprite, k, ring, rect });      // đồ vật sân chơi (world/play.js)
    flowers();
    paint();
  }
  // hoa chữ – gọi lại khi có từ mới thuộc
  let words = [];
  const slots = (() => { const out = [], r = rng("slots"); for (let pass = 0; pass < 4; pass++) for (const b of BEDS) for (let u = b.u0 + 2 + pass * 1.6; u < b.u1 - 1; u += 6.5) for (let v = b.v0 + 1.6 + (pass % 2) * 2.6; v < b.v1; v += (b.v1 - b.v0) > 8 ? 5.2 : 99) out.push({ u: u + (r() - 0.5) * 1.2, v: v + (r() - 0.5) * 0.8 }); return out; })();
  function flowers() {
    api.flowerSpots = [];
    const wild = rng("wild");
    words.forEach((c, i) => {
      const sl = slots[i % slots.length], [x, y] = P(sl.u, sl.v), seed = [...c.id].reduce((a, ch) => a + ch.charCodeAt(0), 0), kind = seed % 4, sz = S.k * (0.085 + (seed % 5) * 0.006);
      const label = c.w.length > 10 ? c.w.slice(0, 9) + "…" : c.w, fs = clamp(S.k * 1.5, 10, 18);
      sprite("fl" + i, y, flowerSvg(x, y, kind, sz, seed) + `<text class="hand fl-t${c.lang !== "en" ? " " + c.lang : ""}" x="${x}" y="${y + fs * 0.95}" font-size="${fs}" text-anchor="middle" fill="${INK}">${esc(label)}</text>`);
      api.flowerSpots.push({ x, y: y - 40 * sz, card: c });
    });
    // vài bông hoa dại mờ cho vườn khỏi trống
    for (let i = 0; i < Dn().wild; i++) { const b = BEDS[i % 3], u = lerp(b.u0 + 1, b.u1 - 1, wild()), v = lerp(b.v0 + 0.5, b.v1 - 0.5, wild()), [x, y] = P(u, v); sprite("wild" + i, y, `<g opacity=".35">${flowerSvg(x, y, i % 4, S.k * 0.06, 900 + i)}</g>`); }
  }
  function flowerSvg(x, y, kind, k, seed) {
    SEED = seed; const stem = 46 * k, top = y - stem; let s = D.curve([[x, y], [x + 4 * k, y - stem * 0.5], [x, top]], { strokeWidth: 1.4 });
    if (kind === 0) { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; s += D.ell(x + Math.cos(a) * 11 * k, top + Math.sin(a) * 11 * k, 13 * k, 13 * k, { fill: WHITE, fillStyle: "solid", strokeWidth: 1.2 }); } s += D.circle(x, top, 11 * k, { fill: INK, fillStyle: "cross-hatch", hachureGap: 2.5 }); }
    else if (kind === 1) s += D.path(`M${x - 11 * k} ${top - 4 * k} Q${x - 13 * k} ${top + 13 * k} ${x} ${top + 14 * k} Q${x + 13 * k} ${top + 13 * k} ${x + 11 * k} ${top - 4 * k} L${x + 5 * k} ${top + 2 * k} L${x} ${top - 8 * k} L${x - 5 * k} ${top + 2 * k} Z`, { fill: INK2, hachureGap: 3, strokeWidth: 1.3 });
    else if (kind === 2) { for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; s += D.line([x + Math.cos(a) * 9 * k, top + Math.sin(a) * 9 * k], [x + Math.cos(a) * 20 * k, top + Math.sin(a) * 20 * k], { strokeWidth: 2 }); } s += D.circle(x, top, 20 * k, { fill: INK, fillStyle: "dots", hachureGap: 3 }); }
    else s += D.path(`M${x} ${top - 12 * k} C${x - 14 * k} ${top - 10 * k} ${x - 14 * k} ${top + 8 * k} ${x - 9 * k} ${top + 12 * k} L${x + 9 * k} ${top + 12 * k} C${x + 14 * k} ${top + 8 * k} ${x + 14 * k} ${top - 10 * k} ${x} ${top - 12 * k} Z`, { fill: WHITE, fillStyle: "solid", strokeWidth: 1.3 });
    return s;
  }
  function paint() {
    world.querySelectorAll(".spr").forEach((n) => n.remove());
    const frag = document.createDocumentFragment();
    for (const sp of sprites) { const n = document.createElementNS("http://www.w3.org/2000/svg", "svg"); n.setAttribute("class", "spr"); n.dataset.id = sp.id; n.setAttribute("viewBox", `0 0 ${S.vw} ${S.vh}`); n.style.zIndex = sp.z; n.innerHTML = sp.svg; frag.appendChild(n); }
    world.insertBefore(frag, actors);
    for (const n of world.querySelectorAll(".spr")) fitSvg(n);
    api._sw = null; api.sway(api._swA || 0);
  }

  // ------------------------------------------------------------------ máy quay: phóng to thì khung hình đi theo mèo
  // Chỉ dời 3 lớp (đất, đồ vật, bướm) bằng transform – không vẽ lại, không ngắt việc mèo đang làm.
  const camEls = () => [ground, world, topfx];
  let camStill = 0;
  function camApply(force) {
    const tr = Math.abs(cam.x) < 0.5 && Math.abs(cam.y) < 0.5 ? "" : `translate(${cam.x.toFixed(1)}px, ${cam.y.toFixed(1)}px)`;
    if (!force && tr === cam._tr) return; cam._tr = tr;
    for (const n of camEls()) n.style.transform = tr;
  }
  function camClamp(x, y) {
    if (S.zf <= 1.02) return [0, 0];
    const b = api.bbox(), m = 40;      // không để mép sân lọt vào giữa màn hình
    const lo = (a0, a1, v) => [v - m - a1, m - a0];      // vừa màn: cả sân luôn trong khung; to hơn màn: mép sân không lọt vào trong
    const [x0, x1] = lo(b.x0, b.x1, S.vw), [y0, y1] = lo(b.y0 - 27 * S.k * HS, b.y1, S.vh);
    return [clamp(x, Math.min(x0, x1), Math.max(x0, x1)), clamp(y, Math.min(y0, y1), Math.max(y0, y1))];
  }
  function setLayerHint(on) { for (const n of camEls()) n.style.willChange = on ? "transform" : ""; }
  let pinch = null, wheel = null;
  function preview(s, mx, my, m0x, m0y) {
    const tr = `translate(${(mx - s * m0x + s * cam.x).toFixed(1)}px, ${(my - s * m0y + s * cam.y).toFixed(1)}px) scale(${s.toFixed(3)})`;
    for (const n of camEls()) { n.style.transformOrigin = "0 0"; n.style.transform = tr; }
  }
  function commit(s, mx, my, m0x, m0y) {
    const z = clamp(S.zf * s, ZMIN, ZMAX);
    for (const n of camEls()) { n.style.transformOrigin = ""; }
    if (Math.abs(z - S.zf) < 0.02) { cam._tr = null; camApply(true); return; }
    const g = unP(m0x - cam.x, m0y - cam.y);      // điểm sân nằm dưới 2 ngón lúc bắt đầu
    S.zf = Math.abs(z - 1) < 0.06 ? 1 : z; S.fu = S.zf === 1 ? null : clamp(g.u, 0, UW); S.fv = S.zf === 1 ? null : clamp(g.v, 0, UH);
    layout();
    const [nx, ny] = S.zf === 1 ? [0, 0] : [mx - P(S.fu, S.fv)[0], my - P(S.fu, S.fv)[1]];
    [cam.x, cam.y] = camClamp(nx, ny); cam.tx = cam.x; cam.ty = cam.y; cam.hot = performance.now() + 2500; cam._tr = null; camApply(true);
    api.onZoom?.(S.zf, S.fu, S.fv);
  }
  const mid = (a, b) => [(a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2];
  const gap = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
  vp.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 2) return; e.preventDefault();
    const [a, b] = e.touches, r = vp.getBoundingClientRect(), [x, y] = mid(a, b);
    pinch = { d0: gap(a, b), m0x: x - r.left, m0y: y - r.top, s: 1, mx: x - r.left, my: y - r.top, r };
    api.pinching = true; document.body.classList.add("pinching"); setLayerHint(true); api.onPinchStart?.();
  }, { passive: false });
  vp.addEventListener("touchmove", (e) => {
    if (!pinch || e.touches.length < 2) return; e.preventDefault();
    const [a, b] = e.touches, [x, y] = mid(a, b);
    pinch.s = clamp(gap(a, b) / pinch.d0, ZMIN / S.zf, ZMAX / S.zf); pinch.mx = x - pinch.r.left; pinch.my = y - pinch.r.top;
    preview(pinch.s, pinch.mx, pinch.my, pinch.m0x, pinch.m0y);
  }, { passive: false });
  const pinchEnd = (e) => {
    if (!pinch || (e.touches && e.touches.length >= 2)) return;
    const p = pinch; pinch = null; commit(p.s, p.mx, p.my, p.m0x, p.m0y);
    setTimeout(() => { api.pinching = false; document.body.classList.remove("pinching"); }, 60);
  };
  vp.addEventListener("touchend", pinchEnd); vp.addEventListener("touchcancel", pinchEnd);
  for (const ev of ["gesturestart", "gesturechange"]) vp.addEventListener(ev, (e) => e.preventDefault(), { passive: false });      // Safari: không phóng cả trang
  // máy tính: Ctrl + lăn chuột / chụm trên bàn di chuột
  vp.addEventListener("wheel", (e) => {
    if (!e.ctrlKey && !e.metaKey) return; e.preventDefault();
    const r = vp.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (!wheel) { wheel = { s: 1, m0x: x, m0y: y }; setLayerHint(true); document.body.classList.add("pinching"); }
    wheel.s = clamp(wheel.s * Math.exp(-e.deltaY * 0.01), ZMIN / S.zf, ZMAX / S.zf); preview(wheel.s, wheel.m0x, wheel.m0y, wheel.m0x, wheel.m0y);
    clearTimeout(wheel.t); wheel.t = setTimeout(() => { const w = wheel; wheel = null; commit(w.s, w.m0x, w.m0y, w.m0x, w.m0y); document.body.classList.remove("pinching"); }, 220);
  }, { passive: false });

  // ------------------------------------------------------------------ chỗ đi lại
  const api = {
    S, P, unP, vp, actors, topfx, flowerSpots: [],
    get stage() { return world; },
    room: "yard",
    /** to/nhỏ theo chiều sâu: mèo cao ~S.catH px ở giữa vườn */
    depth(y) { const t = clamp((y - S.yTop) / (S.yBot - S.yTop || 1), 0, 1); return (S.catH / (200 * 0.7)) * lerp(0.8, 1.12, t); },
    /** điểm ngẫu nhiên trong vùng ("house" | "garden" | undefined) */
    rand(zone) {
      for (let i = 0; i < 40; i++) {
        const u = 3 + Math.random() * (UW - 6), v = 3 + Math.random() * (UH - 6), inH = u > HOUSE.u0 + 1.5 && v < HOUSE.v1 - 1.5, nearH = u > HOUSE.u0 - 1.5 && v < HOUSE.v1 + 1.5;
        if (zone === "house" && !inH) continue; if (zone === "garden" && nearH) continue; if (!zone && nearH && !inH) continue;
        if (BEDS.some((b) => u > b.u0 && u < b.u1 && v > b.v0 && v < b.v1) && Math.random() < 0.7) continue;
        return { u, v };
      }
      return { u: 40, v: 38 };
    },
    zoneOf: (u, v) => (u > HOUSE.u0 && v < HOUSE.v1 ? "house" : "garden"),
    /** cửa nhà (để đi vào/ra) */
    door: { in: { u: 77, v: 27 }, out: { u: 77, v: 33 } },
    spot: (id) => SPOTS[id],
    toRoom(cx, cy) { const r = vp.getBoundingClientRect(); return { x: cx - r.left - cam.x, y: cy - r.top - cam.y }; },
    /** độ dời máy quay (toạ độ trong sân + cam = toạ độ trên màn hình) */
    cam,
    get zf() { return S.zf; },
    pinching: false,
    /** đặt mức phóng (1 = vừa khung); fu, fv = điểm sân làm tâm */
    setZf(z, fu = S.fu, fv = S.fv) { z = clamp(+z || 1, ZMIN, ZMAX); if (Math.abs(z - 1) < 0.06) { z = 1; fu = fv = null; } S.zf = z; S.fu = fu; S.fv = fv; cam.x = cam.y = cam.tx = cam.ty = 0; layout(); },
    zoomBy(f, catX, catY) { const g = catX != null ? unP(catX, catY) : { u: S.fu ?? UW / 2, v: S.fv ?? UH / 2 }; api.setZf(S.zf * f, g.u, g.v); api.onZoom?.(S.zf, S.fu, S.fv); },
    zRange: [ZMIN, ZMAX],
    /** mỗi khung hình: phóng to thì giữ mèo trong khung (có vùng chết để khỏi lắc), lướt mượt */
    camTick(dt, x, y, frozen) {
      if (pinch || wheel) return;
      if (S.zf <= 1.02) { if (cam.x || cam.y) { cam.x = cam.y = cam.tx = cam.ty = 0; camApply(true); } return; }
      const sx = x + cam.x, sy = y + cam.y, ax = S.vw * 0.5, ay = S.vh * 0.6, dzx = S.vw * 0.22, dzy = S.vh * 0.17;
      if (!frozen && performance.now() > cam.hot && (Math.abs(sx - ax) > dzx || Math.abs(sy - ay) > dzy)) [cam.tx, cam.ty] = camClamp(ax - x, ay - y);
      const k = 1 - Math.exp(-dt * 2.6), dx = cam.tx - cam.x, dy = cam.ty - cam.y;
      if (Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4) { if (camStill++ === 20) setLayerHint(false); return; }
      if (camStill > 20) setLayerHint(true); camStill = 0;
      cam.x += dx * k; cam.y += dy * k; camApply();
    },
    setWords(list) { words = list; draw(); },
    /** khung bao khu vườn trên màn hình (để đặt chữ, bướm) */
    bbox() { const c = [P(0, 0), P(UW, 0), P(UW, UH), P(0, UH)]; return { x0: Math.min(...c.map((p) => p[0])), x1: Math.max(...c.map((p) => p[0])), y0: Math.min(...c.map((p) => p[1])), y1: Math.max(...c.map((p) => p[1])) }; },
    light(hour) {
      const d = new Date(); S.hour = hour ?? S.forceHour ?? d.getHours() + d.getMinutes() / 60;
      const h = S.hour, a = h < 5 ? 0.42 : h < 7 ? lerp(0.42, 0, (h - 5) / 2) : h < 17.5 ? 0 : h < 19.5 ? lerp(0, 0.42, (h - 17.5) / 2) : 0.42;
      vp.style.setProperty("--shadeA", a.toFixed(3)); S.night = clamp(a / 0.42, 0, 1); S.day = a < 0.05; vp.dataset.night = S.night > 0.5 ? "1" : "0";
    },
    resize: layout,
    redraw() { draw(); },
    /** cây (và bụi) lắc theo gió: a = -1…1 */
    sway(a) {
      api._swA = a; if (api._sw != null && Math.abs(a - api._sw) < 0.01) return; api._sw = a;
      const [x, y] = P(48, 9), deg = (a * 5).toFixed(2);
      for (const n of world.querySelectorAll('.spr[data-id="tree"],.spr[data-id^="bush"]')) { const f = n._fit || { x: 0, y: 0 }; n.style.transformOrigin = n.dataset.id === "tree" ? `${x - f.x}px ${y - f.y}px` : "50% 100%"; n.style.transform = Math.abs(a) < 0.01 ? "" : `skewX(${n.dataset.id === "tree" ? deg : (a * 1.5).toFixed(2)}deg)`; }
    },
    setReserve(px) { px = Math.max(0, Math.round(px)); if (Math.abs(px - (S.reserve || 0)) < 24) return; S.reserve = px; layout(); },
    setZoom(z) { if (!ZOOM[z] || z === S.zoom) return; S.zoom = z; layout(); },
    setDensity(d) { if (!DENS[d] || d === S.density) return; S.density = d; draw(); },
  };
  let rt = 0; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(layout, 120); });
  requestAnimationFrame(layout); layout();
  return api;
}
