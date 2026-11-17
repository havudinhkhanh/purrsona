// GIAO DIỆN "TRANH MÀU": cùng khu vườn, cùng nét vẽ, nhưng tô màu theo từng khu (cỏ, gỗ, đất, nước, gạch…)
// như tranh màu nước / bút chì màu: nền màu đặc + nét cọ gạch (hachure) đậm hơn làm vân, viền nâu ấm thay viền đen.
// Không vẽ lại hình: đổi màu các mã màu "giữ chỗ" của bản bút chì → rẻ, máy yếu chạy được.
// Mã giữ chỗ: INK (viền) · INK2 (đậm) · INK3 (vừa) · WHITE (sáng) · PAPER (nền) · TEX (vân cọ, chỉ có ở bản tranh màu)
export const TEX = "#010101", HL = "#020202";
const PAL = {
  //        sáng       vừa        đậm        nền        vân cọ     viền
  lawn:   ["#b8d48c", "#86b25f", "#5f8f45", "#9cc172", "#5e8c43", "#4d6f37"],
  blade:  ["#cfe3a6", "#7aa957", "#5b8a40", "#9cc172", "#4f7a3a", "#5d8d42"],
  wood:   ["#ecd2ae", "#c99d6c", "#9a6f47", "#ddb88d", "#a87b51", "#6b4c31"],
  rug:    ["#f0b9a0", "#cf735d", "#9b4636", "#e09479", "#8f3f30", "#6d3328"],
  stone:  ["#e6e1d6", "#bdb6aa", "#8f887d", "#d3cdc2", "#9d968b", "#6a645b"],
  water:  ["#cde8ea", "#78b2c0", "#3e7b8e", "#9fd0d8", "#2f6779", "#2b5866"],
  soil:   ["#b38a64", "#8d6646", "#634430", "#9f7754", "#56391f", "#4b3322"],
  shadow: ["#56653f", "#56653f", "#3f4c2e", "#56653f", "#3f4c2e", "#3f4c2e"],
  wall:   ["#f4ead8", "#9ec5d6", "#8a7963", "#efe2cb", "#c9b79c", "#5c4b3b"],
  brick:  ["#e8b49a", "#c46d52", "#a4533c", "#d88a6c", "#8a4430", "#5e3326"],
  desk:   ["#e6c7a0", "#a87e55", "#7a5638", "#d4ae84", "#8a6343", "#55402c"],
  shelf:  ["#ead2b0", "#6f93c2", "#b85f4e", "#dcbf98", "#4f6f9b", "#55402c"],
  catbed: ["#f6dccb", "#d9897a", "#a85a4d", "#eec0ae", "#b2645a", "#6e3f37"],
  leaf:   ["#a9d17e", "#5c9a43", "#2f6a2c", "#7cb35a", "#285a24", "#3b4a22"],
  fence:  ["#efe0c4", "#b88f62", "#86623f", "#dcc39a", "#8d6a45", "#7a583a"],
  cloth:  ["#f8f5ec", "#e07a5f", "#b5543c", "#f2ece0", "#c36a52", "#6a5a4c"],
  metal:  ["#f6dc8a", "#e2b04b", "#b07c2a", "#efcb6a", "#a87326", "#6e5320"],
  rose:   ["#f6b3c2", "#5f9a46", "#2f6a2c", "#f0a0b2", "#d1667f", "#5a3a2a"],
  pot:    ["#e3916a", "#8d6646", "#5c8f3f", "#d97f57", "#a85a3a", "#6b3b26"],
  gourd:  ["#dfe8a8", "#5c9a43", "#2f6a2c", "#cbd98c", "#285a24", "#3b4a22"],
  vibe:   ["#f2e4c9", "#c4553f", "#7d3a2c", "#e8d3ac", "#8a3b2a", "#4a2e24"],
  misc:   ["#f1e8d8", "#a9b6a0", "#6f7d68", "#e2d8c4", "#5f6b58", "#4b443c"],
};
const FLOWER = [["#f7c6d3", "#e8879f"], ["#f8e08e", "#e2b43c"], ["#d9c8f2", "#9d7fd1"], ["#ffffff", "#f2b0a0"], ["#bfe3f2", "#6aa9cc"]];
/** đồ vật (id sprite) → bảng màu */
export function materialOf(id) {
  if (/^wall-back/.test(id)) return "wall"; if (/^wall-/.test(id)) return "brick";
  if (id === "desk") return "desk"; if (id === "shelf") return "shelf"; if (id === "catbed") return "catbed";
  if (id === "tree" || /^bush/.test(id)) return "leaf"; if (id === "bench") return "stone";
  if (/^fence|^gate/.test(id) || id === "rack" || id === "swing") return id === "rack" ? "cloth" : "fence";
  if (id === "slide") return "metal"; if (id === "trellis") return "gourd"; if (id === "rosebed" || /^hole/.test(id)) return "soil";
  if (/^rose/.test(id)) return "rose"; if (/^pot/.test(id)) return "pot"; if (/^v_/.test(id)) return "vibe"; if (/^fl\d/.test(id)) return "flower";
  return "misc";
}
const MAP = (p) => ({ "#262626": p[5], "#5C5C5C": p[2], "#9A9A9A": p[1], "#FBFAF6": p[0], "#F3F0E8": p[3], "#010101": p[4], "#020202": p[0] });
/** đổi màu 1 đoạn SVG bút chì sang tranh màu theo bảng của đồ vật */
export function paintSvg(svg, mat, seed = 0) {
  let p = PAL[mat] || PAL.misc;
  if (mat === "flower") { const f = FLOWER[seed % FLOWER.length]; p = [f[0], "#6fa04f", "#3f7a37", f[0], f[1], "#4a5a32"]; }
  const m = MAP(p);
  return svg.replace(/(fill|stroke)="(#262626|#5c5c5c|#9a9a9a|#FBFAF6|#F3F0E8|#010101|#020202)"/gi, (all, a, c) => `${a}="${m[c.toUpperCase()] || c}"`);
}
/** phần trang trí riêng của nền tranh màu: vệt nắng loang, bóng tối mép sân (vẽ 1 lần cùng nền) */
export function groundExtras(P, UW, UH, k, rng, house, low) {
  const lawn = [P(0, 0), P(UW, 0), P(UW, UH), P(0, UH)].map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ");
  const [lx0, ly0] = P(0, 0), [lx1, ly1] = P(UW, UH);
  let s0 = `<defs><clipPath id="pz-lawn"><polygon points="${lawn}"/></clipPath>
    <linearGradient id="pz-light" gradientUnits="userSpaceOnUse" x1="${lx0}" y1="${ly0}" x2="${lx1}" y2="${ly1}"><stop offset="0" stop-color="#fff6cf" stop-opacity=".38"/><stop offset=".55" stop-color="#fff6cf" stop-opacity="0"/><stop offset="1" stop-color="#20361a" stop-opacity=".22"/></linearGradient></defs>`;
  // nét cọ cỏ nhiều sắc xanh (vẽ 1 lần), ánh nắng chéo từ góc trên trái
  const G = ["#6f9f4c", "#a9cb7e", "#557f3c", "#c5dd9a", "#7fae57"]; let st = "";
  for (let i = 0, n = low ? 220 : 560; i < n; i++) { const u = rng() * UW, v = rng() * UH; if (u > house.u0 - 0.5 && v < house.v1 + 0.5) continue; const [x, y] = P(u, v), L = (0.6 + rng() * 1.1) * k, a = -0.9 + rng() * 0.5;
    st += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} q${(Math.cos(a) * L * 0.5).toFixed(1)} ${(Math.sin(a) * L * 0.5 - 1.5).toFixed(1)} ${(Math.cos(a) * L).toFixed(1)} ${(Math.sin(a) * L).toFixed(1)}" stroke="${G[i % G.length]}" stroke-width="${(1.2 + rng() * 1.4).toFixed(1)}" stroke-linecap="round" fill="none" opacity="${(0.25 + rng() * 0.3).toFixed(2)}"/>`; }
  s0 += `<g clip-path="url(#pz-lawn)">${st}<polygon points="${lawn}" fill="url(#pz-light)"/></g>`;
  return s0 + groundSun(P, k, rng);
}
function groundSun(P, k, rng) {
  let s = `<defs><radialGradient id="pz-sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff7d6" stop-opacity=".55"/><stop offset="1" stop-color="#fff7d6" stop-opacity="0"/></radialGradient>
    <radialGradient id="pz-dap" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#2f4a22" stop-opacity=".28"/><stop offset="1" stop-color="#2f4a22" stop-opacity="0"/></radialGradient></defs>`;
  // vệt nắng loang trên cỏ + đốm bóng lá dưới tán cây
  for (let i = 0; i < 7; i++) { const u = 6 + rng() * 54, v = 14 + rng() * 46, [x, y] = P(u, v), r = (5 + rng() * 7) * k; s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 0.55).toFixed(1)}" fill="url(#pz-sun)"/>`; }
  for (let i = 0; i < 9; i++) { const u = 40 + rng() * 18, v = 6 + rng() * 9, [x, y] = P(u, v), r = (1.5 + rng() * 2.5) * k; s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 0.6).toFixed(1)}" fill="url(#pz-dap)"/>`; }
  return s;
}
