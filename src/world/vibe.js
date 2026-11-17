// VIBE KHU VƯỜN: đổi phong cách sân – Nhật Bản, Trung Hoa, Thượng Hải xưa, Ý, Pháp.
// Mỗi vibe = vài món đồ vẽ chì ở các ô trống của sân (không đè xích đu, cầu tuột, giàn bầu, luống hoa),
// chữ riêng của vibe (gói en-vibe / zh-vibe), mèo ra ngồi chơi với đồ, chạm đồ là hiện chữ.
// Gói: Free có Nhà + Nhật Bản; Plus mở Trung Hoa, Ý, Pháp; Pro mở Thượng Hải xưa. Vibe khoá được xem thử 30 giây.
import { can } from "../config.js";
import { SCENE } from "./play.js";
import { rand, pick, dayKey } from "../core/util.js";

const INK = "#262626", INK2 = "#5c5c5c", INK3 = "#9a9a9a", WHITE = "#FBFAF6";
// ô trống trên sân (u, v) – đã né nhà, cây, ghế, ao, luống, xích đu, cầu tuột, giàn bầu, lối đá
const SLOT = { tall: [8.5, 50.5], mid: [28, 37.5], side: [58.5, 15], front: [58.5, 61], house: [85, 37], pond: [24, 56] };
// chỗ mèo ngồi cạnh từng ô (lệch sang bên, hơi lùi về sau để đồ trang trí không bị mèo che)
const SIT = { tall: [15, 48.5], mid: [35.5, 36], side: [52.5, 14], house: [79, 36], front: [52, 60] };
const SC = 1.35;      // đồ trang trí to hơn đồ sân chơi một chút cho dễ nhìn trên điện thoại

export const VIBES = {
  home: { vi: "Nhà mình", emo: "🏡", sub: "Vườn quen, không màu mè", tier: "free", items: [] },
  japan: { vi: "Nhật Bản", emo: "🌸", sub: "Cổng torii · đèn đá · anh đào · cá koi", tier: "free", petals: true,
    items: [
      { key: "v_torii", at: "tall", w: 3, h: 12, sit: 1 }, { key: "v_lantern", at: "mid", w: 2.4, h: 8.5, sit: 1 },
      { key: "v_sakura", at: "side", w: 5, h: 11, sit: 1 }, { key: "v_koi", at: "pond", w: 7, h: 2, live: 1 }, { key: "v_koinobori", at: "front", w: 3.6, h: 17 },
    ] },
  china: { vi: "Trung Hoa", emo: "🏮", sub: "Trúc · cổng trăng · đá Thái Hồ · đèn lồng", tier: "plus",
    items: [
      { key: "v_bamboo", at: "tall", w: 4, h: 15, sit: 1 }, { key: "v_rock", at: "mid", w: 3.6, h: 8, sit: 1 },
      { key: "v_lantern2", at: "side", w: 3.4, h: 11, sit: 1 }, { key: "v_moongate", u: 36, v: 0.5, w: 7, h: 10 }, { key: "v_jar", at: "front", w: 2.6, h: 4 },
    ] },
  shanghai: { vi: "Thượng Hải xưa", emo: "🎷", sub: "Cột đèn · xe kéo · máy hát · đèn neon", tier: "pro", tint: "sepia",
    items: [
      { key: "v_lamp", at: "tall", w: 2.4, h: 16, sit: 1 }, { key: "v_rickshaw", at: "mid", w: 5, h: 7, sit: 1 },
      { key: "v_gramo", at: "house", w: 3, h: 9, sit: 1 }, { key: "v_lamp2", at: "side", w: 2.4, h: 16 }, { key: "v_neon", u: 24, v: 0.5, w: 6.5, h: 9 }, { key: "v_qipao", at: "front", w: 2.4, h: 9 },
    ] },
  italy: { vi: "Ý", emo: "🍋", sub: "Cây bách · xe Vespa · chanh · đồ phơi", tier: "plus",
    items: [
      { key: "v_cypress", at: "tall", w: 3, h: 18, sit: 1 }, { key: "v_vespa", at: "mid", w: 4.6, h: 6, sit: 1 },
      { key: "v_lemon", at: "side", w: 3.4, h: 10, sit: 1 }, { key: "v_laundry", u: 22, v: 0.5, w: 16, h: 8 }, { key: "v_gelato", at: "front", w: 3.6, h: 9 },
    ] },
  france: { vi: "Pháp", emo: "🥖", sub: "Tháp xa xa · quán cà phê · xe đạp · oải hương", tier: "plus",
    items: [
      { key: "v_eiffel", u: 34, v: -9, w: 5, h: 30 }, { key: "v_cafe", at: "mid", w: 5, h: 10, sit: 1 },
      { key: "v_bike", at: "house", w: 4, h: 6, sit: 1 }, { key: "v_lights", u: 30, v: 0.5, w: 28, h: 6 }, { key: "v_lavender", at: "front", w: 4, h: 4, sit: 1 },
    ] },
};
export const vibeFeat = (id) => (VIBES[id]?.tier === "pro" ? "vibe.pro" : VIBES[id]?.tier === "plus" ? "vibe.plus" : null);

// đồ trang trí → chữ hiện ra khi mèo chơi / khi chạm
Object.assign(SCENE, {
  v_torii: { en: ["torii", "shrine", "bow"], zh: ["鸟居", "神社", "鞠躬"] }, v_lantern: { en: ["lantern", "serene"], zh: ["石灯笼", "宁静"] },
  v_sakura: { en: ["cherry blossom", "petal"], zh: ["樱花", "花瓣"] }, v_koi: { en: ["koi"], zh: ["锦鲤"], ja: ["鯉"] }, koi_paw: { en: ["splash", "koi"], zh: ["溅", "锦鲤"], ja: ["水しぶき", "鯉"] }, koi_fall: { en: ["slip", "soaked"], zh: ["滑倒", "淋湿"], ja: ["滑る", "びしょ濡れ"] }, v_koinobori: { en: ["koi", "serene"], zh: ["锦鲤", "宁静"] },
  v_bamboo: { en: ["bamboo"], zh: ["竹子"] }, v_rock: { en: ["hollow", "upside down"], zh: ["太湖石", "倒"] }, v_lantern2: { en: ["tassel", "auspicious"], zh: ["灯笼", "吉利"] },
  v_moongate: { en: ["moon gate", "fortune", "courtyard"], zh: ["月亮门", "福", "院子"] }, v_jar: { en: ["courtyard", "auspicious"], zh: ["院子", "吉利"] },
  v_lamp: { en: ["lamppost", "nostalgia"], zh: ["路灯", "外滩"] }, v_lamp2: { en: ["lamppost", "glamorous"], zh: ["路灯", "摩登"] }, v_rickshaw: { en: ["rickshaw"], zh: ["黄包车"] }, v_gramo: { en: ["gramophone", "jazz"], zh: ["留声机", "爵士乐"] },
  v_neon: { en: ["neon", "glamorous"], zh: ["霓虹灯", "摩登"] }, v_qipao: { en: ["qipao"], zh: ["旗袍"] },
  v_cypress: { en: ["cypress"], zh: ["柏树"] }, v_vespa: { en: ["scooter"], zh: ["小绵羊"] }, v_lemon: { en: ["lemon", "terracotta"], zh: ["柠檬", "陶盆"] },
  v_laundry: { en: ["laundry"], zh: ["晾衣服"] }, v_gelato: { en: ["gelato", "espresso", "dolce vita"], zh: ["冰淇淋", "浓缩咖啡", "悠闲"] },
  v_eiffel: { en: ["tower", "rendezvous"], zh: ["埃菲尔铁塔", "浪漫"] }, v_cafe: { en: ["café", "parasol"], zh: ["咖啡馆", "遮阳伞"] },
  v_bike: { en: ["bicycle", "baguette"], zh: ["自行车", "法棍"] }, v_lights: { en: ["string lights"], zh: ["串灯", "浪漫"] }, v_lavender: { en: ["lavender"], zh: ["薰衣草"] },
});

// ------------------------------------------------------------------ nét vẽ từng món (toạ độ màn hình tính từ chân đồ vật)
function painter({ D, P, k }) {
  const U = k * SC, H = k * 0.9 * SC;      // 1 đơn vị sân theo chiều ngang / chiều cao
  const ln = (a, b, w = 1.6, x = {}) => D.line(a, b, { strokeWidth: w, ...x });
  const solid = { fill: WHITE, fillStyle: "solid" }, dark = { fill: INK, fillStyle: "solid" }, stone = { fill: INK3, hachureGap: 3.5, strokeWidth: 1.4 }, mid = { fill: INK2, hachureGap: 3.5, strokeWidth: 1.4 };
  const box = (x, y, w, h0, h1, o = solid, dx = 0) => D.poly([[x - w * U, y - h0 * H], [x + w * U, y - h0 * H], [x + (w + dx) * U, y - h1 * H], [x - (w + dx) * U, y - h1 * H]], { strokeWidth: 1.5, ...o });
  const shadow = (x, y, w) => `<g opacity=".35">${D.ell(x, y, w * U * 2, w * U * 0.6, { stroke: "none", fill: INK3, hachureGap: 4 })}</g>`;
  const at = (x, y, h) => [x, y - h * H];
  const wheel = (x, y, r) => D.circle(x, y - r * H, r * 2 * U, { strokeWidth: 1.6 }) + D.circle(x, y - r * H, r * 0.5 * U, { strokeWidth: 1 }) + [0, 1, 2].map((i) => { const a = (i * Math.PI) / 3; return ln([x - Math.cos(a) * r * U, y - r * H - Math.sin(a) * r * U], [x + Math.cos(a) * r * U, y - r * H + Math.sin(a) * r * U], 0.8); }).join("");
  const T = {
    // ---------- Nhật Bản
    v_torii(u, v) { const [x, y] = P(u, v), a = P(u - 3.4, v), b = P(u + 3.4, v); let g = shadow(x, y, 4);      // quay mặt ra phía người xem
      g += ln(a, at(...a, 10), 2.6) + ln(b, at(...b, 10), 2.6) + ln(at(...P(u - 4.4, v), 8.1), at(...P(u + 4.4, v), 8.1), 2.2);
      const top = [-5.2, -2.6, 0, 2.6, 5.2].map((d, i) => at(...P(u + d, v), 10.2 + (i === 0 || i === 4 ? 1 : i === 2 ? -0.1 : 0.15)));
      g += D.poly([...top, ...top.slice().reverse().map(([px, py]) => [px, py + 1.1 * H])], { fill: INK, hachureGap: 2, strokeWidth: 1.6 });
      g += box(...at(x, y, 8.1), 0.55, 0, 2.1, solid); return g; },
    v_lantern(u, v) { const [x, y] = P(u, v); let g = shadow(x, y, 2);
      g += box(x, y, 1.5, 0, 0.8, stone) + box(x, y, 0.5, 0.8, 3.8, stone) + box(x, y, 1.2, 3.8, 4.3, stone) + box(x, y, 0.95, 4.3, 6.1, solid) + box(x, y, 0.4, 4.7, 5.7, dark);
      g += D.poly([[x - 2.3 * U, y - 6.1 * H], [x + 2.3 * U, y - 6.1 * H], [x + 0.8 * U, y - 7.5 * H], [x - 0.8 * U, y - 7.5 * H]], mid) + D.circle(x, y - 8 * H, 1 * U, { ...solid, strokeWidth: 1.3 });
      return g; },
    v_sakura(u, v) { const [x, y] = P(u, v); let g = shadow(x, y, 4);
      g += D.curve([[x, y], [x - 0.6 * U, y - 3 * H], [x + 0.3 * U, y - 6 * H], [x - 0.2 * U, y - 7.6 * H]], { strokeWidth: 2.6 }) + D.curve([[x + 0.1 * U, y - 5 * H], [x + 2 * U, y - 6.6 * H], [x + 3 * U, y - 7.6 * H]], { strokeWidth: 1.6 }) + D.curve([[x - 0.2 * U, y - 6 * H], [x - 2.4 * U, y - 7.4 * H]], { strokeWidth: 1.4 });
      g += D.path(`M${x - 4.4 * U} ${y - 8 * H} C${x - 5.4 * U} ${y - 10.6 * H} ${x - 2.4 * U} ${y - 12.4 * H} ${x - 0.4 * U} ${y - 11.6 * H} C${x + 1.6 * U} ${y - 13 * H} ${x + 5 * U} ${y - 11.4 * H} ${x + 4.6 * U} ${y - 8.6 * H} C${x + 4.4 * U} ${y - 6.6 * H} ${x - 3.6 * U} ${y - 6 * H} ${x - 4.4 * U} ${y - 8 * H} Z`, { fill: WHITE, fillStyle: "solid", strokeWidth: 1.6 });
      for (let i = 0; i < 9; i++) { const cx = x + (-3.4 + (i % 5) * 1.7 + (i > 4 ? 0.8 : 0)) * U, cy = y - (i > 4 ? 10.6 : 8.8) * H; const r = 0.75 * U;      // bông 5 cánh
        g += [0, 1, 2, 3, 4].map((j) => { const a = (j / 5) * Math.PI * 2; return D.circle(cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.6, r * 0.9, { strokeWidth: 0.8 }); }).join("") + D.circle(cx, cy, r * 0.35, dark); }
      return g; },
    v_koi(u, v) { let g = ""; for (const [du, dv, s] of [[-3, -1.4, 1], [2.6, 1, -1]]) { const [x, y] = P(u + du, v + dv);
        g += D.ell(x, y, 3.2 * U, 1.1 * U, { ...solid, strokeWidth: 1.2 }) + D.poly([[x - s * 1.5 * U, y], [x - s * 2.6 * U, y - 0.7 * U], [x - s * 2.6 * U, y + 0.7 * U]], { ...solid, strokeWidth: 1.1 }) + D.ell(x + s * 0.3 * U, y - 0.1 * U, 1.1 * U, 0.6 * U, { fill: INK2, hachureGap: 2, strokeWidth: 0.8 }); }
      return g; },
    v_koinobori(u, v) { const [x, y] = P(u, v); let g = shadow(x, y, 1.6);      // cờ cá chép bay trên cột
      g += ln([x, y], at(x, y, 16), 2) + D.circle(...at(x, y, 16.4), 0.8 * U, { ...solid, strokeWidth: 1.2 });
      [[15, 4.4, INK], [12.4, 3.6, INK2], [10, 3, WHITE]].forEach(([h, L, c], i) => { const [fx, fy] = at(x + 0.2 * U, y, h), w = L * U, d = 0.9 * H + i * 0.1 * H;
        g += D.path(`M${fx} ${fy - d} C${fx + w * 0.5} ${fy - d * 1.1} ${fx + w * 0.9} ${fy - d * 0.6} ${fx + w} ${fy - d * 0.9} L${fx + w * 0.82} ${fy} L${fx + w} ${fy + d * 0.9} C${fx + w * 0.9} ${fy + d * 0.6} ${fx + w * 0.5} ${fy + d * 1.1} ${fx} ${fy + d} Z`, c === WHITE ? { ...solid, strokeWidth: 1.3 } : { fill: c, hachureGap: 2, strokeWidth: 1.3 });
        g += D.circle(fx + w * 0.18, fy - d * 0.2, d * 0.75, { ...solid, strokeWidth: 1 }) + D.circle(fx + w * 0.18, fy - d * 0.2, d * 0.25, dark); });
      return g; },
    // ---------- Trung Hoa
    v_bamboo(u, v) { let g = ""; const [bx, by] = P(u, v); g += shadow(bx, by, 4);
      for (const [du, dv, h] of [[-1.5, -2, 15], [0.6, -0.6, 13], [-0.4, 1.8, 16], [1.8, 2.6, 11], [2.6, -1.4, 12.5]]) { const [x, y] = P(u + du, v + dv);
        g += D.line([x, y], [x + 0.4 * U, y - h * H], { strokeWidth: 2 }); for (let hh = 2.5; hh < h; hh += 2.6) g += ln([x - 0.5 * U + (hh / h) * 0.4 * U, y - hh * H], [x + 0.5 * U + (hh / h) * 0.4 * U, y - hh * H], 1.2);
        for (let i = 0; i < 3; i++) { const lx = x + 0.4 * U, ly = y - (h - 1 - i * 2.4) * H, s = i % 2 ? 1 : -1; g += D.path(`M${lx} ${ly} q${s * 1.6 * U} ${-0.9 * H} ${s * 3.2 * U} ${0.2 * H} q${-s * 1.6 * U} ${0.4 * H} ${-s * 3.2 * U} ${-0.2 * H}Z`, { fill: INK2, hachureGap: 2, strokeWidth: 1 }); } }
      return g; },
    v_rock(u, v) { const [x, y] = P(u, v); let g = shadow(x, y, 3.4);
      g += D.path(`M${x - 3 * U} ${y} C${x - 3.8 * U} ${y - 3 * H} ${x - 1.4 * U} ${y - 4 * H} ${x - 2 * U} ${y - 6.4 * H} C${x - 2.4 * U} ${y - 8.4 * H} ${x + 0.6 * U} ${y - 8.6 * H} ${x + 0.4 * U} ${y - 6.6 * H} C${x + 2.6 * U} ${y - 7 * H} ${x + 3.6 * U} ${y - 4 * H} ${x + 2.4 * U} ${y - 2.6 * H} C${x + 3.4 * U} ${y - 1.4 * H} ${x + 3 * U} ${y} ${x + 2 * U} ${y} Z`, { fill: INK3, hachureGap: 3, hachureAngle: 70, strokeWidth: 1.8 });
      for (const [dx, dy, r] of [[-1.2, 5.6, 0.8], [0.9, 3.6, 0.6], [-0.4, 2, 0.9], [1.8, 5.2, 0.45]]) g += D.ell(x + dx * U, y - dy * H, r * 2 * U, r * 1.4 * U, dark);
      return g; },
    v_lantern2(u, v) { const [x, y] = P(u, v); let g = shadow(x, y, 3);
      g += ln([x - 3 * U, y], at(x - 3 * U, y, 11), 2) + ln([x + 3 * U, y], at(x + 3 * U, y, 11), 2) + ln(at(x - 3.8 * U, y, 11), at(x + 3.8 * U, y, 11), 2.4) + D.curve([at(x - 4.2 * U, y, 11.6), at(x, y, 11.2), at(x + 4.2 * U, y, 11.6)], { strokeWidth: 1.6 });
      for (const dx of [-1.5, 1.5]) { const cx = x + dx * U; g += ln(at(cx, y, 11), at(cx, y, 9.6), 1) + D.ell(cx, y - 8 * H, 2.6 * U, 3 * H, { fill: INK2, hachureGap: 2.5, strokeWidth: 1.4 }) + ln(at(cx - 0.7 * U, y, 9.6), at(cx + 0.7 * U, y, 9.6), 2) + ln(at(cx - 0.6 * U, y, 6.4), at(cx + 0.6 * U, y, 6.4), 2) + ln(at(cx, y, 6.4), at(cx, y, 4.9), 1) + ln(at(cx - 0.3 * U, y, 5.2), at(cx - 0.4 * U, y, 4.6), 0.8) + ln(at(cx + 0.3 * U, y, 5.2), at(cx + 0.4 * U, y, 4.6), 0.8); }
      return g; },
    v_moongate(u, v) { const a = P(u - 7, v), b = P(u + 7, v), c = P(u, v), r = 3.6;      // bức tường thấp, khoét cửa tròn, dán chữ Phúc ngược
      let g = D.poly([a, b, at(...b, 9), at(...a, 9)], { fill: WHITE, fillStyle: "solid", strokeWidth: 1.8 }) + D.poly([at(...P(u - 7.6, v), 9), at(...P(u + 7.6, v), 9), at(...P(u + 7, v), 10), at(...P(u - 7, v), 10)], mid);
      g += D.ell(c[0], c[1] - r * H, r * 2 * U, r * 2.05 * H, { fill: INK3, hachureGap: 4, hachureAngle: 20, strokeWidth: 2 });
      const [fx, fy] = at(...P(u + 4.8, v), 6.2), s = 1.2 * U; g += D.poly([[fx, fy - s], [fx + s, fy], [fx, fy + s], [fx - s, fy]], { ...solid, strokeWidth: 1.3 }) + `<text x="${fx}" y="${fy + s * 0.42}" font-size="${s * 1.15}" text-anchor="middle" transform="rotate(180 ${fx} ${fy})" fill="${INK}" font-family="serif">福</text>`;
      return g; },
    v_jar(u, v) { const [x, y] = P(u, v); let g = shadow(x, y, 3);
      g += D.path(`M${x - 2 * U} ${y - 3.6 * H} C${x - 3.2 * U} ${y - 2 * H} ${x - 2 * U} ${y} ${x - 1.2 * U} ${y} L${x + 1.2 * U} ${y} C${x + 2 * U} ${y} ${x + 3.2 * U} ${y - 2 * H} ${x + 2 * U} ${y - 3.6 * H} Z`, { fill: INK3, hachureGap: 3.5, strokeWidth: 1.6 });
      g += D.ell(x, y - 3.6 * H, 4.2 * U, 1.3 * U, { ...solid, strokeWidth: 1.6 }) + D.ell(x - 0.6 * U, y - 3.7 * H, 1.6 * U, 0.6 * U, { fill: INK2, hachureGap: 2, strokeWidth: 1 }) + D.ell(x + 0.8 * U, y - 3.5 * H, 1.2 * U, 0.5 * U, { fill: INK2, hachureGap: 2, strokeWidth: 1 });
      return g; },
    // ---------- Thượng Hải xưa
    v_lamp(u, v) { const [x, y] = P(u, v); let g = shadow(x, y, 2);
      g += box(x, y, 0.9, 0, 1.2, mid) + D.poly([[x - 0.45 * U, y - 1.2 * H], [x + 0.45 * U, y - 1.2 * H], [x + 0.25 * U, y - 13 * H], [x - 0.25 * U, y - 13 * H]], { ...solid, strokeWidth: 1.6 });
      for (const s of [-1, 1]) g += D.curve([at(x, y, 12), at(x + s * 1.6 * U, y, 13.4), at(x + s * 2.4 * U, y, 13)], { strokeWidth: 1.5 });
      for (const s of [-1, 0, 1]) { const cx = x + s * 2.4 * U, top = s ? 12.9 : 14.4; g += D.poly([at(cx - 0.8 * U, y, top - 2.2), at(cx + 0.8 * U, y, top - 2.2), at(cx + 1.1 * U, y, top), at(cx - 1.1 * U, y, top)], { ...solid, strokeWidth: 1.3 }) + D.poly([at(cx - 1.2 * U, y, top), at(cx + 1.2 * U, y, top), at(cx, y, top + 1)], mid); }
      return g; },
    v_rickshaw(u, v) { const [x, y] = P(u, v); let g = shadow(x, y, 5);
      g += wheel(x + 0.6 * U, y, 2.8) + ln(at(x - 0.6 * U, y, 3.4), at(x - 6.4 * U, y, 1.2), 1.8) + ln(at(x - 0.2 * U, y, 2.6), at(x - 6.2 * U, y, 0.6), 1.4) + ln(at(x - 6.6 * U, y, 1.3), at(x - 6.6 * U, y, 0), 1.2);
      g += D.poly([at(x - 1.6 * U, y, 3), at(x + 2.6 * U, y, 3), at(x + 2.8 * U, y, 4.4), at(x - 1.4 * U, y, 4.2)], { ...solid, strokeWidth: 1.6 });      // ghế
      g += D.path(`M${x + 2.6 * U} ${y - 4.2 * H} C${x + 3.6 * U} ${y - 6.6 * H} ${x + 3 * U} ${y - 8.4 * H} ${x + 0.6 * U} ${y - 8.2 * H} C${x - 0.6 * U} ${y - 8 * H} ${x - 1.2 * U} ${y - 7 * H} ${x - 1.2 * U} ${y - 6.4 * H} L${x + 1.8 * U} ${y - 4.2 * H} Z`, { fill: INK2, hachureGap: 2.5, strokeWidth: 1.6 });      // mui xe
      for (let i = 1; i < 4; i++) g += D.curve([at(x + (2.6 - i * 0.2) * U, y, 4.2), at(x + (2.8 - i * 0.9) * U, y, 6 + i * 0.4), at(x + (1.4 - i * 0.8) * U, y, 7.6 + i * 0.1)], { strokeWidth: 0.9, stroke: WHITE });
      return g; },
    v_gramo(u, v) { const [x, y] = P(u, v); let g = shadow(x, y, 2.6);
      g += ln([x - 1.6 * U, y], at(x - 1.4 * U, y, 3.6), 1.6) + ln([x + 1.6 * U, y], at(x + 1.4 * U, y, 3.6), 1.6) + D.ell(x, y - 3.8 * H, 4.4 * U, 1.3 * U, { ...solid, strokeWidth: 1.5 });      // bàn con
      g += box(...at(x, y, 3.8), 1.4, 0, 1.6, { fill: INK2, hachureGap: 2.5 }) + D.ell(x, y - 5.5 * H, 2.6 * U, 0.7 * U, dark);
      g += D.curve([at(x + 0.6 * U, y, 5.6), at(x + 0.9 * U, y, 6.8), at(x + 0.2 * U, y, 7.6)], { strokeWidth: 1.6 });
      g += D.path(`M${x + 0.2 * U} ${y - 7.6 * H} C${x - 0.8 * U} ${y - 8.4 * H} ${x - 2 * U} ${y - 10 * H} ${x - 1.8 * U} ${y - 11.4 * H} C${x - 0.2 * U} ${y - 11.6 * H} ${x + 1.4 * U} ${y - 10.6 * H} ${x + 2.2 * U} ${y - 9.4 * H} C${x + 1.2 * U} ${y - 9 * H} ${x + 0.6 * U} ${y - 8.4 * H} ${x + 0.2 * U} ${y - 7.6 * H} Z`, { fill: INK3, hachureGap: 2.5, hachureAngle: 30, strokeWidth: 1.6 });      // loa kèn
      return g; },
    v_neon(u, v) { const a = P(u - 6.5, v), b = P(u + 6.5, v);      // bảng đèn neon dựng trên hàng rào sau
      let g = ln(a, at(...a, 8.5), 1.8) + ln(b, at(...b, 8.5), 1.8) + D.poly([at(...a, 4.6), at(...b, 4.6), at(...b, 8.8), at(...a, 8.8)], { fill: INK, fillStyle: "solid", strokeWidth: 1.6 });
      const [cx, cy] = at(...P(u, v), 6.2), fs = Math.min(2.4 * U, Math.abs(b[0] - a[0]) / 4.6);
      g += `<text x="${cx}" y="${cy + fs * 0.35}" font-size="${fs}" text-anchor="middle" fill="${WHITE}" font-family="serif" letter-spacing="${fs * 0.08}" style="filter:drop-shadow(0 0 2px #fff)">舞 廳 ★</text>`;
      return g; },
    v_qipao(u, v) { const [x, y] = P(u, v); let g = shadow(x, y, 2);
      g += ln([x - 1.4 * U, y], [x, y - 1 * H], 1.4) + ln([x + 1.4 * U, y], [x, y - 1 * H], 1.4) + ln([x, y - 1 * H], at(x, y, 2.4), 1.8);      // chân giá
      g += D.path(`M${x - 0.9 * U} ${y - 8 * H} C${x - 1.8 * U} ${y - 7.2 * H} ${x - 1.8 * U} ${y - 6.6 * H} ${x - 1 * U} ${y - 5.8 * H} C${x - 1.6 * U} ${y - 4.6 * H} ${x - 1.8 * U} ${y - 3.4 * H} ${x - 1.4 * U} ${y - 2.4 * H} L${x + 1.4 * U} ${y - 2.4 * H} C${x + 1.8 * U} ${y - 3.4 * H} ${x + 1.6 * U} ${y - 4.6 * H} ${x + 1 * U} ${y - 5.8 * H} C${x + 1.8 * U} ${y - 6.6 * H} ${x + 1.8 * U} ${y - 7.2 * H} ${x + 0.9 * U} ${y - 8 * H} Z`, { fill: INK2, hachureGap: 2.2, hachureAngle: 60, strokeWidth: 1.5 });
      g += box(...at(x, y, 8), 0.45, 0, 0.8, solid) + D.curve([at(x - 0.4 * U, y, 7.9), at(x + 0.6 * U, y, 7.2), at(x + 0.2 * U, y, 6.5)], { strokeWidth: 1, stroke: WHITE }) + ln(at(x + 0.6 * U, y, 3.6), at(x + 0.9 * U, y, 2.4), 1, { stroke: WHITE });
      return g; },
    // ---------- Ý
    v_cypress(u, v) { let g = ""; for (const [du, dv, h, w] of [[0, 0, 18, 2.2], [5, 1.5, 13, 1.7]]) { const [x, y] = P(u + du, v + dv); g += shadow(x, y, 2);
        g += ln([x, y], at(x, y, 1.6), 2) + D.path(`M${x} ${y - h * H} C${x + w * 0.7 * U} ${y - h * 0.8 * H} ${x + w * U} ${y - h * 0.4 * H} ${x + w * 0.6 * U} ${y - 1.4 * H} L${x - w * 0.6 * U} ${y - 1.4 * H} C${x - w * U} ${y - h * 0.4 * H} ${x - w * 0.7 * U} ${y - h * 0.8 * H} ${x} ${y - h * H} Z`, { fill: INK2, hachureGap: 2.6, hachureAngle: 75, strokeWidth: 1.6 }); }
      return g; },
    v_vespa(u, v) { const [x, y] = P(u, v); let g = shadow(x, y, 4.6);
      g += wheel(x - 3 * U, y, 1.2) + wheel(x + 3 * U, y, 1.2);
      g += D.path(`M${x - 4.2 * U} ${y - 1.4 * H} C${x - 4.6 * U} ${y - 3.4 * H} ${x - 2.6 * U} ${y - 4.2 * H} ${x - 0.6 * U} ${y - 3.6 * H} L${x + 0.6 * U} ${y - 1.8 * H} L${x + 2 * U} ${y - 1.6 * H} C${x + 2.4 * U} ${y - 2.4 * H} ${x + 3.6 * U} ${y - 3 * H} ${x + 4.4 * U} ${y - 2.2 * H} C${x + 4.6 * U} ${y - 1.4 * H} ${x + 4.2 * U} ${y - 1.2 * H} ${x + 3.6 * U} ${y - 1.2 * H} L${x - 3.8 * U} ${y - 1.2 * H} Z`, { ...solid, strokeWidth: 1.7 });      // thân xe bầu bĩnh
      g += D.poly([at(x - 4.2 * U, y, 3.8), at(x - 1.4 * U, y, 3.8), at(x - 1.6 * U, y, 4.5), at(x - 4 * U, y, 4.5)], { fill: INK2, hachureGap: 2, strokeWidth: 1.3 });      // yên
      g += ln(at(x + 3 * U, y, 2.4), at(x + 2.4 * U, y, 6.4), 1.8) + ln(at(x + 1.4 * U, y, 6.6), at(x + 3.4 * U, y, 6.2), 1.8) + D.circle(...at(x + 2.6 * U, y, 5.4), 0.9 * U, { ...solid, strokeWidth: 1.1 });
      return g; },
    v_lemon(u, v) { const [x, y] = P(u, v); let g = shadow(x, y, 2.6);
      g += box(x, y, 1.6, 0, 2.6, { fill: INK3, hachureGap: 2.8, hachureAngle: 0 }, 0.4) + box(x, y, 2.2, 2.6, 3.1, solid);      // chậu đất nung
      g += D.curve([at(x, y, 3), at(x - 0.3 * U, y, 5), at(x, y, 6.4)], { strokeWidth: 1.8 });
      g += D.path(`M${x - 3 * U} ${y - 7.4 * H} C${x - 3.6 * U} ${y - 10 * H} ${x - 1 * U} ${y - 11.4 * H} ${x + 0.4 * U} ${y - 10.6 * H} C${x + 2.4 * U} ${y - 11.4 * H} ${x + 3.8 * U} ${y - 9.4 * H} ${x + 3 * U} ${y - 7.4 * H} C${x + 2.2 * U} ${y - 5.8 * H} ${x - 2.2 * U} ${y - 5.8 * H} ${x - 3 * U} ${y - 7.4 * H} Z`, { fill: INK2, hachureGap: 3, hachureAngle: 50, strokeWidth: 1.5 });
      for (const [dx, dh] of [[-1.6, 7.2], [1.2, 8.6], [2.2, 6.9], [-0.4, 9.6], [0.4, 6.6]]) g += D.ell(x + dx * U, y - dh * H, 1.2 * U, 0.85 * U, { ...solid, strokeWidth: 1.2 });
      return g; },
    v_laundry(u, v) { const a = P(u - 16, v), b = P(u + 16, v);      // dây phơi đồ trên hàng rào sau
      let g = ln(a, at(...a, 7.2), 1.8) + ln(b, at(...b, 7.2), 1.8) + D.curve([at(...a, 7), at(...P(u, v), 6), at(...b, 7)], { strokeWidth: 1.1 });
      [[-11, "shirt"], [-5, "sock"], [-2, "towel"], [5, "shirt"], [10.5, "sock"]].forEach(([du, kind]) => { const [x, y0] = at(...P(u + du, v), 6.35 - 0.6 * Math.cos((du / 16) * Math.PI / 2)), y = y0;
        if (kind === "shirt") g += D.poly([[x - 1.6 * U, y], [x + 1.6 * U, y], [x + 2.4 * U, y + 1.2 * H], [x + 1.4 * U, y + 1.6 * H], [x + 1.2 * U, y + 4 * H], [x - 1.2 * U, y + 4 * H], [x - 1.4 * U, y + 1.6 * H], [x - 2.4 * U, y + 1.2 * H]], du > 0 ? { fill: INK3, hachureGap: 2.5, strokeWidth: 1.3 } : { ...solid, strokeWidth: 1.3 });
        else if (kind === "towel") g += box(x + 1.4 * U, y + 3.4 * H, 1.4, 0, 3.4, { fill: INK2, hachureGap: 2.5, hachureAngle: 0 });
        else g += D.poly([[x - 0.5 * U, y], [x + 0.5 * U, y], [x + 0.5 * U, y + 2.2 * H], [x + 1.4 * U, y + 2.6 * H], [x + 1.2 * U, y + 3.3 * H], [x - 0.5 * U, y + 3 * H]], { ...solid, strokeWidth: 1.2 }); });
      return g; },
    v_gelato(u, v) { const [x, y] = P(u, v); let g = shadow(x, y, 3.6);
      g += wheel(x - 2 * U, y, 1) + wheel(x + 2 * U, y, 1) + box(x, y - 1 * H, 3, 0, 3.6, solid) + [-1, 0, 1].map((i) => D.ell(x + i * 1.8 * U, y - 4.9 * H, 1.3 * U, 0.6 * U, { fill: INK3, hachureGap: 2, strokeWidth: 1 })).join("") + ln(at(x - 2.6 * U, y, 3.4), at(x + 2.6 * U, y, 3.4), 1);
      g += ln(at(x + 2.6 * U, y, 4.6), at(x + 2.6 * U, y, 8.6), 1.4);
      const top = at(x + 2.6 * U, y, 9.6); for (let i = 0; i < 6; i++) { const a0 = Math.PI + (i / 6) * Math.PI, a1 = Math.PI + ((i + 1) / 6) * Math.PI, R = 4.2 * U; g += D.poly([top, [top[0] + Math.cos(a0) * R, top[1] - Math.sin(a0) * R * 0.32 + 1.4 * H], [top[0] + Math.cos(a1) * R, top[1] - Math.sin(a1) * R * 0.32 + 1.4 * H]], i % 2 ? { fill: INK2, hachureGap: 2, strokeWidth: 1.2 } : { ...solid, strokeWidth: 1.2 }); }
      return g; },
    // ---------- Pháp
    v_eiffel(u, v) { const [x, y] = P(u, v), h = 30, L = (t) => (1 - t) ** 2.2;      // tháp ở xa, sau hàng rào: nét mảnh, nhạt
      const side = (s) => Array.from({ length: 9 }, (_, i) => { const t = i / 8; return at(x + s * (0.25 + 3.4 * L(t)) * U, y, t * h); });
      let g = `<g opacity=".55">` + D.lines(side(-1), { strokeWidth: 1.2 }) + D.lines(side(1), { strokeWidth: 1.2 });
      for (const t of [0.16, 0.38, 0.62]) { const w = (0.25 + 3.4 * L(t)) * U; g += ln(at(x - w, y, t * h), at(x + w, y, t * h), 1.4); }
      g += D.path(`M${x - 2.6 * U} ${y} Q${x} ${y - 4 * H} ${x + 2.6 * U} ${y}`, { strokeWidth: 1.1 }) + ln(at(x, y, h), at(x, y, h + 2), 1);
      for (let i = 0; i < 6; i++) { const t = 0.06 + i * 0.1, w = (0.25 + 3.4 * L(t)) * U; g += ln(at(x - w, y, t * h), at(x + w * 0.7, y, (t + 0.08) * h), 0.6); }
      return g + `</g>`; },
    v_cafe(u, v) { const [x, y] = P(u, v); let g = shadow(x, y, 4.4);
      const chair = (cx, s) => ln([cx, y + 0.4 * H], at(cx, y, 2.6), 1.4) + ln([cx + s * 1.4 * U, y + 0.4 * H], at(cx + s * 1.4 * U, y, 2.6), 1.4) + D.ell(cx + s * 0.7 * U, y - 2.6 * H, 2 * U, 0.7 * U, { ...solid, strokeWidth: 1.3 }) + D.curve([at(cx + s * 1.5 * U, y, 2.6), at(cx + s * 1.8 * U, y, 4.4), at(cx + s * 1 * U, y, 5)], { strokeWidth: 1.4 });
      g += chair(x - 4.2 * U, -1) + chair(x + 4.2 * U, 1);
      g += ln([x, y], at(x, y, 3.2), 1.8) + ln([x - 1.2 * U, y + 0.2 * H], [x + 1.2 * U, y + 0.2 * H], 1.6) + D.ell(x, y - 3.3 * H, 4.6 * U, 1.4 * U, { ...solid, strokeWidth: 1.6 }) + box(...at(x - 0.8 * U, y, 3.3), 0.45, 0, 0.9, solid) + D.ell(x + 1 * U, y - 3.5 * H, 1.6 * U, 0.6 * U, { ...solid, strokeWidth: 1 });
      g += ln(at(x, y, 3.3), at(x, y, 10.6), 1.4); const top = at(x, y, 11.4);
      for (let i = 0; i < 8; i++) { const a0 = Math.PI + (i / 8) * Math.PI, a1 = Math.PI + ((i + 1) / 8) * Math.PI, R = 5.6 * U; g += D.poly([top, [top[0] + Math.cos(a0) * R, top[1] - Math.sin(a0) * R * 0.3 + 2 * H], [top[0] + Math.cos(a1) * R, top[1] - Math.sin(a1) * R * 0.3 + 2 * H]], i % 2 ? { fill: INK2, hachureGap: 2.2, strokeWidth: 1.2 } : { ...solid, strokeWidth: 1.2 }); }
      return g; },
    v_bike(u, v) { const [x, y] = P(u, v); let g = shadow(x, y, 4);
      g += wheel(x - 2.6 * U, y, 1.6) + wheel(x + 2.6 * U, y, 1.6);
      const r = at(x - 2.6 * U, y, 1.6), f = at(x + 2.6 * U, y, 1.6), seat = at(x - 1 * U, y, 4.4), head = at(x + 1.8 * U, y, 4.8), crank = at(x - 0.2 * U, y, 1.6);
      g += D.lines([r, seat, crank, r], { strokeWidth: 1.5 }) + D.lines([seat, head, crank], { strokeWidth: 1.5 }) + ln(head, f, 1.5) + ln([seat[0] - 0.8 * U, seat[1] - 0.4 * H], [seat[0] + 0.6 * U, seat[1] - 0.4 * H], 2.4) + D.curve([head, [head[0] + 0.6 * U, head[1] - 0.8 * H], [head[0] + 1.4 * U, head[1] - 0.6 * H]], { strokeWidth: 1.6 });
      g += box(head[0] + 1.5 * U, head[1] + 0.2 * H, 1.1, 0, 1.6, { fill: INK3, hachureGap: 2, hachureAngle: 0, strokeWidth: 1.3 });      // giỏ
      g += D.poly([[head[0] + 0.9 * U, head[1] - 1 * H], [head[0] + 1.6 * U, head[1] - 4.6 * H], [head[0] + 2.4 * U, head[1] - 4.4 * H], [head[0] + 1.8 * U, head[1] - 0.9 * H]], { fill: WHITE, fillStyle: "solid", strokeWidth: 1.3 }) + [1, 2, 3].map((i) => ln([head[0] + (1.3 + i * 0.12) * U, head[1] - (1 + i) * H], [head[0] + (1.8 + i * 0.12) * U, head[1] - (1.4 + i) * H], 0.9)).join("");      // bánh mì dài
      return g; },
    v_lights(u, v) { const a = P(u - 28, v), b = P(u + 28, v), m1 = P(u - 9, v), m2 = P(u + 9, v); let g = "";
      for (const p of [a, m1, m2, b]) g += ln(p, at(...p, 6), 1.5);
      const span = (p, q) => Array.from({ length: 7 }, (_, i) => { const t = i / 6; return at(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, 5.8 - Math.sin(t * Math.PI) * 1.6); });
      for (const [p, q] of [[a, m1], [m1, m2], [m2, b]]) { const pts = span(p, q); g += D.curve(pts, { strokeWidth: 1 }); pts.slice(1, -1).forEach(([px, py], i) => { g += D.ell(px, py + 0.9 * U, 0.9 * U, 1.2 * U, i % 2 ? { ...solid, strokeWidth: 1 } : { fill: INK3, hachureGap: 1.6, strokeWidth: 1 }); }); }
      return g; },
    v_lavender(u, v) { let g = ""; const [bx, by] = P(u, v); g += shadow(bx, by, 4.6);
      for (let i = 0; i < 6; i++) { const du = -3.6 + (i % 3) * 3 + (i > 2 ? 1.4 : 0), dv = i > 2 ? 1.8 : -0.6, [x, y] = P(u + du, v + dv); g += D.poly([[x - 1.2 * U, y], [x + 1.2 * U, y], [x + 0.6 * U, y - 1.6 * H], [x - 0.6 * U, y - 1.6 * H]], { fill: INK3, hachureGap: 3, strokeWidth: 1.1 });
        for (const s of [-0.5, 0, 0.5]) { const tx = x + s * 1.6 * U, ty = y - (3.6 + Math.abs(s)) * H; g += ln([x + s * 0.4 * U, y - 1.4 * H], [tx, ty], 1); for (let j = 0; j < 3; j++) g += D.ell(tx, ty + j * 0.6 * H, 0.55 * U, 0.75 * H, { fill: WHITE, fillStyle: "solid", strokeWidth: 0.8 }); } }
      return g; },
  };
  T.v_lamp2 = T.v_lamp;
  return T;
}

export function createVibe(game) {
  const s = game.save, Y = game.yard, B = game.body;
  let cur = "home", preview = null, previewT = 0;
  const allowed = (id) => { const f = vibeFeat(id); return !f || can(s.plan, f); };
  const want = () => { const id = s.settings.vibe || "home"; return VIBES[id] && allowed(id) ? id : "home"; };
  const posOf = (it) => (it.at ? SLOT[it.at] : [it.u, it.v]);

  // vẽ nối tiếp sau đồ sân chơi
  const prev = Y.extraDraw;
  Y.extraDraw = (ctx) => {
    prev?.(ctx);
    const V = VIBES[cur]; if (!V?.items.length) return;
    const T = painter(ctx);
    for (const it of V.items) { if (it.live) continue; const [u, v] = posOf(it), svg = T[it.key]?.(u, v); if (!svg) continue;
      const z = it.key === "v_koi" ? ctx.P(24, 51)[1] : it.v < 2 ? ctx.P(u, 0)[1] - 40 : ctx.P(u, v)[1];      // đồ trên hàng rào sau nằm sau mọi thứ
      ctx.sprite(it.key, z, svg); }
  };

  // cánh hoa anh đào rơi (Nhật) – nhẹ, tắt khi máy giảm chuyển động
  const petals = document.createElement("div"); petals.className = "petals"; petals.setAttribute("aria-hidden", "true");
  petals.innerHTML = Array.from({ length: 10 }, (_, i) => `<i style="left:${(i * 9.7 + 3) % 96}%;animation-delay:${-(i * 1.9).toFixed(1)}s;animation-duration:${(11 + (i % 4) * 2.5).toFixed(1)}s"></i>`).join("");
  Y.vp.querySelector(".topfx")?.appendChild(petals);

  function apply(id, { redraw = true } = {}) {
    cur = VIBES[id] ? id : "home";
    document.body.dataset.vibe = cur;
    petals.hidden = !VIBES[cur].petals || !!game.weather?.raining;
    if (redraw) Y.redraw();
  }
  apply(want(), { redraw: false });

  // đổi vibe: được phép → lưu; bị khoá → xem thử 30 giây rồi trả lại
  function set(id) {
    if (!VIBES[id]) return { ok: false };
    clearTimeout(previewT); preview = null;
    if (!allowed(id)) { const pv = (s.vibeTry ||= {}); if (pv[id] === dayKey() && preview !== id) return { ok: false, used: true, tier: VIBES[id].tier };      // mỗi vibe khoá: xem thử 1 lần/ngày
      if (preview === id) return { ok: false, preview: true, tier: VIBES[id].tier };
      pv[id] = dayKey(); game.persist(); preview = id; apply(id); react(id); previewT = setTimeout(() => { preview = null; apply(want()); game.emit("vibe", cur); }, 30000); game.emit("vibe", id); return { ok: false, preview: true, tier: VIBES[id].tier }; }
    s.settings.vibe = id; game.persist(); apply(id); react(id); game.emit("vibe", id); game.account?.soon?.(); return { ok: true };
  }
  function react(id) {
    const it = VIBES[id].items.find((x) => x.sit);
    setTimeout(() => { game.jab?.(`vibe_${id}`, {}, true); if (it) game.play?.sceneWord(it.key, true); }, 900);
  }
  // gói đổi (đăng nhập, hết hạn) → vibe không còn quyền thì về Nhà
  game.on?.("plan", () => { if (!preview && cur !== want()) apply(want()); });
  game.on?.("weather", () => { petals.hidden = !VIBES[cur].petals || !!game.weather?.raining; });

  // ------------------------------------------------------------------ AO CÁ KOI (vibe Nhật): cá bơi thật, mèo khều nước, bắt cá, có khi rớt xuống ao
  const POND = { u: 24, v: 56, rx: 6.4, ry: 3.3 }, EDGE = [25, 49.7];
  const koiEl = document.createElement("div"); koiEl.className = "seat koi"; Y.actors.appendChild(koiEl);
  const fish = [{ a: 0, r: 1, sp: 0.32, c: WHITE }, { a: 2.2, r: 0.7, sp: -0.42, c: INK3 }, { a: 4.1, r: 0.86, sp: 0.26, c: WHITE }].map((f) => ({ ...f, ph: Math.random() * 6, scare: 0 }));
  let ripples = [], caught = null;      // caught: cá đang bị mèo nhấc lên {f, t}
  const koiOn = () => cur === "japan";
  function splash(u, v, n = 10) {
    ripples.push({ u, v, t: 0 }); const [x, y] = Y.P(u, v);
    for (let i = 0; i < n; i++) { const d = document.createElement("i"); d.className = "drop"; d.style.left = x + "px"; d.style.top = y + "px"; d.style.setProperty("--dx", `${rand(-34, 34)}px`); d.style.setProperty("--dy", `${rand(-46, -14)}px`); Y.topfx.appendChild(d); setTimeout(() => d.remove(), 700); }
    for (const f of fish) f.scare = 1.6;      // cá giật mình bơi nhanh
  }
  const fishUV = (f, da = 0) => [POND.u + Math.cos(f.a + da) * POND.rx * f.r, POND.v + Math.sin(f.a + da) * POND.ry * f.r];
  function drawFish(x, y, ang, k, c, wig) {
    const L = 1.35 * k, W = 0.5 * k, tail = wig * 0.35;
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(ang * 180 / Math.PI).toFixed(1)})"><path d="M${-L * 0.8} 0 L${-L * 1.5} ${-W * 1.1 + tail * k} L${-L * 1.4} ${W * 1.1 + tail * k}Z" fill="${c}" stroke="${INK}" stroke-width="1"/><ellipse rx="${L}" ry="${W}" fill="${c}" stroke="${INK}" stroke-width="1.1"/><ellipse cx="${L * 0.15}" cy="${-W * 0.15}" rx="${L * 0.35}" ry="${W * 0.45}" fill="${c === WHITE ? INK2 : WHITE}" opacity=".85"/><circle cx="${L * 0.7}" cy="${-W * 0.25}" r="${Math.max(0.8, k * 0.09)}" fill="${INK}"/></g>`;
  }
  let koiAcc = 0;
  function tickKoi(dt0) {
    if (!koiOn()) { if (koiEl.innerHTML) koiEl.innerHTML = ""; return; }
    koiAcc += dt0; if (koiAcc < (document.documentElement.classList.contains("low") ? 0.05 : 0.033)) return; const dt = Math.min(koiAcc, 0.1); koiAcc = 0;      // ~30 khung/giây là đủ cho cá (máy yếu 20)
    const k = Y.S.k, now = performance.now() / 1000; let g = ""; const bx = [Infinity, Infinity, -Infinity, -Infinity], grow = (x, y, r) => { bx[0] = Math.min(bx[0], x - r); bx[1] = Math.min(bx[1], y - r); bx[2] = Math.max(bx[2], x + r); bx[3] = Math.max(bx[3], y + r); };
    for (const r of ripples) { r.t += dt / 1.4; const [x, y] = Y.P(r.u, r.v), R = (0.8 + r.t * 3.2) * k; grow(x, y, R + 2); g += `<ellipse cx="${x}" cy="${y}" rx="${R}" ry="${R * 0.5}" fill="none" stroke="${INK}" stroke-width="1" opacity="${(1 - r.t) * 0.7}"/>`; }
    ripples = ripples.filter((r) => r.t < 1);
    for (const f of fish) {
      if (caught?.f === f) continue;
      f.scare = Math.max(0, f.scare - dt); f.a += f.sp * dt * (1 + f.scare * 2.2); f.r = 0.75 + Math.sin(now * 0.3 + f.ph) * 0.2;
      const [u, v] = fishUV(f), [u2, v2] = fishUV(f, Math.sign(f.sp) * 0.05), [x, y] = Y.P(u, v), [x2, y2] = Y.P(u2, v2);
      grow(x, y, 2.4 * k); g += drawFish(x, y, Math.atan2(y2 - y, x2 - x), k, f.c, Math.sin(now * (6 + f.scare * 8) + f.ph));
    }
    if (caught) { caught.t += dt; const x = B.x + (B.face || 1) * Y.S.catH * 0.45, y = B.y - B.h - Y.S.catH * (0.55 + Math.sin(caught.t * 9) * 0.05); grow(x, y, 2.8 * k); g += drawFish(x, y, -1.2 + Math.sin(caught.t * 14) * 0.6, k * 1.1, caught.f.c, Math.sin(caught.t * 20)); }
    koiEl.style.zIndex = Math.round(Y.P(POND.u, POND.v - POND.ry - 1.8)[1]) - 1;
    if (!g) { koiEl.innerHTML = ""; return; }
    // khung SVG tính từ vị trí cá (không gọi getBBox mỗi khung – bắt trình duyệt tính lại bố cục)
    const x0 = Math.floor(bx[0]), y0 = Math.floor(bx[1]), w = Math.ceil(bx[2] - x0), h = Math.ceil(bx[3] - y0);
    koiEl.innerHTML = `<svg class="spr" viewBox="${x0} ${y0} ${w} ${h}" style="left:${x0}px;top:${y0}px;width:${w}px;height:${h}px;right:auto;bottom:auto">${g}</svg>`;
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function koiAct(h) {
    const { goUV, say, cool, used, T } = h;
    return { id: "koi", score: () => (koiOn() && !game.weather?.raining && cool("koi", 6) ? 0.3 + T().playful * 0.4 + T().curious * 0.2 : 0),
      async run() {
        used("koi"); await goUV(EDGE[0], EDGE[1], "stalk"); const [px] = Y.P(POND.u, POND.v); B.faceTo(px < B.x ? -1 : 1);
        await B.act("crouch", 1800); game.play?.sceneWord("koi_paw", true);
        for (let i = 0, n = 1 + Math.floor(Math.random() * 3); i < n; i++) { await B.act("play_yarn", 700); splash(EDGE[0] - 1 + rand(-1.5, 1.5), POND.v - POND.ry + rand(0.5, 1.6), 8); game.buzz?.(6); await B.act("crouch", rand(600, 1400)); }
        const roll = Math.random();
        if (roll < 0.22) {      // giật mình, rớt xuống ao
          const [x, y] = Y.P(POND.u + rand(-2, 2), POND.v + rand(-0.5, 0.8)); await B.jumpTo(x, y, 0, null, { apex: Y.S.catH * 0.35 });
          splash(POND.u, POND.v, 18); game.buzz?.([20, 40, 30]); game.play?.sceneWord("koi_fall", true); await B.act("look_up", 900); say("koi_fall");
          const [ex, ey] = Y.P(EDGE[0], EDGE[1]); await B.jumpTo(ex, ey, 0, null, { apex: Y.S.catH * 0.5 }); splash(POND.u, POND.v - POND.ry + 0.5, 8);
          await B.act("groom_full", 3200); await B.act("idle_tail", 2000);
        } else if (roll < 0.6) {      // bắt được cá, ngắm rồi thả lại
          await B.act("crouch", 500); const f = pick(fish); caught = { f, t: 0 }; splash(...fishUV(f), 12); await B.act("look_up", 1600); say("koi_catch");
          await sleep(900); caught = null; splash(POND.u + rand(-2, 2), POND.v, 10); await B.act("idle_tail", 1800);
        } else { say("koi_paw"); await B.act("loaf", rand(5, 9) * 1000); }
      } };
  }

  // mèo ra chơi với đồ trang trí
  function acts(h) {
    const { goUV, say, cool, used, T } = h;
    return [koiAct(h), { id: "vibe", score: () => { const its = VIBES[cur].items.filter((x) => x.sit); return its.length && !game.weather?.raining && cool("vibe", 7) ? 0.22 + T().curious * 0.25 + T().lazy * 0.15 : 0; },
      async run() { used("vibe"); const it = pick(VIBES[cur].items.filter((x) => x.sit)), [u, v] = SIT[it.at]; await goUV(u, v); B.faceTo(posOf(it)[0] < u ? -1 : 1);
        await B.act("look_up", 1200); game.play?.sceneWord(it.key, true); if (Math.random() < 0.45) say(`vibesit_${cur}`);
        await B.act(Math.random() < 0.5 ? "loaf" : "idle_tail", rand(6, 12) * 1000); } }];
  }
  // chạm đồ trang trí → hiện chữ của món đó
  function tap(p) {
    const V = VIBES[cur]; if (!V.items.length) return false; const k = Y.S.k;
    for (const it of V.items) { const [u, v] = posOf(it), [x, y] = Y.P(u, v), w = it.w * k * SC, h = it.h * k * 0.9 * SC;
      if (p.x > x - w && p.x < x + w && p.y < y + 6 && p.y > y - h) { game.play?.sceneWord(it.key, true); game.buzz?.(6); return true; } }
    return false;
  }
  return { tick(dt) { tickKoi(dt); }, splash, get id() { return cur; }, get chosen() { return want(); }, get preview() { return preview; }, set, allowed, acts, tap, VIBES };
}
