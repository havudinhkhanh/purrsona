// Bộ "cọ vẽ" dùng chung cho các phòng – mọi phòng vẽ cùng 1 phong cách (phẳng, ấm, bo mềm).
// Toạ độ phòng: cao 900, sàn bắt đầu ở FLOOR_Y. Đổi phong cách = đổi file này; muốn dùng ảnh AI vẽ phòng: xem rooms.js (bg).
export const H = 900, FLOOR_Y = 620;

export const shadow = (cx, cy, rx, ry, o = 0.18) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#2a1a10" opacity="${o}"/>`;

export function wall(W, c1, c2, extra = "") {
  return `<defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <rect width="${W}" height="${FLOOR_Y}" fill="url(#wg)"/>${extra}`;
}
/** sàn gỗ / gạch có phối cảnh (các vạch hội tụ về giữa) */
export function floor(W, kind, c1, c2, line) {
  const vx = W / 2; let s = `<defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect y="${FLOOR_Y}" width="${W}" height="${H - FLOOR_Y}" fill="url(#fg)"/>`;
  const rows = [FLOOR_Y, 652, 692, 742, 806, 900];
  if (kind === "wood") {
    for (let x = -W; x <= W * 2; x += 120) s += `<line x1="${x}" y1="${FLOOR_Y}" x2="${vx + (x - vx) * 1.9}" y2="${H}" stroke="${line}" stroke-width="2" opacity=".55"/>`;
    rows.slice(1, -1).forEach((y, i) => { for (let x = (i % 2) * 140 - 200; x < W + 200; x += 280) { const f = 1 + ((y - FLOOR_Y) / (H - FLOOR_Y)) * 0.9; s += `<line x1="${vx + (x - vx) * f}" y1="${y}" x2="${vx + (x + 60 - vx) * f}" y2="${y}" stroke="${line}" stroke-width="2" opacity=".35"/>`; } });
  } else if (kind === "tile") {
    for (let x = -W; x <= W * 2; x += 110) s += `<line x1="${x}" y1="${FLOOR_Y}" x2="${vx + (x - vx) * 1.9}" y2="${H}" stroke="${line}" stroke-width="2.5"/>`;
    rows.slice(1, -1).forEach((y) => (s += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${line}" stroke-width="2.5"/>`));
  } else if (kind === "deck") {
    rows.slice(1, -1).concat([626, 640, 670, 714, 770, 845]).forEach((y) => (s += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${line}" stroke-width="2" opacity=".6"/>`));
  }
  // bóng tối dọc chân tường cho có chiều sâu
  s += `<rect y="${FLOOR_Y}" width="${W}" height="26" fill="#000" opacity=".06"/>`;
  return s;
}
export const baseboard = (W, c) => `<rect y="${FLOOR_Y - 22}" width="${W}" height="24" fill="${c}"/><rect y="${FLOOR_Y - 22}" width="${W}" height="3" fill="#fff" opacity=".35"/>`;

/** ô cửa ra vào ở mép trái / phải (mèo đi qua đây sang phòng khác) */
export function doorway(side, W, frame, inside = "#3b2e25", label = "") {
  const x = side === "left" ? 28 : W - 28 - 150, w = 150, top = 250;
  return `<g class="door">
    <rect x="${x - 12}" y="${top - 14}" width="${w + 24}" height="${FLOOR_Y - top + 14}" rx="10" fill="${frame}"/>
    <rect x="${x}" y="${top}" width="${w}" height="${FLOOR_Y - top}" rx="4" fill="${inside}"/>
    <path d="M${x} ${FLOOR_Y} L${x + w} ${FLOOR_Y} L${x + w + (side === "left" ? -40 : 40)} ${FLOOR_Y + 40} L${x + (side === "left" ? -40 : 40)} ${FLOOR_Y + 40} Z" fill="${inside}" opacity=".18"/>
    <rect x="${x}" y="${top}" width="${w}" height="${FLOOR_Y - top}" fill="url(#dlight)" opacity=".5"/>
    ${label ? `<text x="${x + w / 2}" y="${top - 30}" text-anchor="middle" font-size="22" font-family="system-ui" fill="#000" opacity=".28">${label}</text>` : ""}
  </g>`;
}
export const doorDefs = `<defs><linearGradient id="dlight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9c4" stop-opacity="0"/><stop offset="1" stop-color="#ffe9c4" stop-opacity=".35"/></linearGradient></defs>`;

/** cửa sổ: bầu trời đổi theo giờ (lớp .sky đọc biến CSS), có mây, khung, bậu */
export function windowBox(x, y, w, h, { frame = "#fff", sill = "#e9dccb", panes = 2, curtain = null, cross = true } = {}) {
  const id = "sk" + x + y;
  let s = `<g class="win">
    <defs><clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/></clipPath></defs>
    <rect x="${x - 14}" y="${y - 14}" width="${w + 28}" height="${h + 28}" rx="12" fill="${frame}"/>
    <g clip-path="url(#${id})">
      <rect class="sky" fill="url(#skyg)" x="${x}" y="${y}" width="${w}" height="${h}"/>
      <circle class="sun" cx="${x + w * 0.72}" cy="${y + h * 0.3}" r="${Math.min(w, h) * 0.12}"/>
      <g class="cloud" opacity=".9"><ellipse cx="${x + w * 0.3}" cy="${y + h * 0.35}" rx="${w * 0.14}" ry="${h * 0.06}" fill="#fff"/><ellipse cx="${x + w * 0.38}" cy="${y + h * 0.31}" rx="${w * 0.1}" ry="${h * 0.07}" fill="#fff"/></g>
      <g class="stars"><circle cx="${x + w * 0.2}" cy="${y + h * 0.2}" r="2" fill="#fff"/><circle cx="${x + w * 0.55}" cy="${y + h * 0.12}" r="1.6" fill="#fff"/><circle cx="${x + w * 0.8}" cy="${y + h * 0.42}" r="1.8" fill="#fff"/><circle cx="${x + w * 0.4}" cy="${y + h * 0.5}" r="1.4" fill="#fff"/></g>
      <path d="M${x} ${y + h} L${x + w * 0.15} ${y + h * 0.78} L${x + w * 0.3} ${y + h * 0.84} L${x + w * 0.42} ${y + h * 0.7} L${x + w * 0.55} ${y + h * 0.8} L${x + w * 0.7} ${y + h * 0.66} L${x + w * 0.85} ${y + h * 0.82} L${x + w} ${y + h * 0.74} L${x + w} ${y + h} Z" class="hills"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#glass)"/>
    </g>`;
  for (let i = 1; i < panes; i++) s += `<rect x="${x + (w * i) / panes - 5}" y="${y}" width="10" height="${h}" fill="${frame}"/>`;
  if (cross) s += `<rect x="${x}" y="${y + h * 0.42}" width="${w}" height="9" fill="${frame}"/>`;
  s += `<rect x="${x - 26}" y="${y + h + 10}" width="${w + 52}" height="18" rx="5" fill="${sill}"/><rect x="${x - 26}" y="${y + h + 26}" width="${w + 52}" height="6" fill="#000" opacity=".08"/>`;
  if (curtain) s += curtains(x - 40, y - 40, w + 80, h + 70, curtain);
  return s + `</g>`;
}
export const glassDefs = `<defs><linearGradient id="skyg" x1="0" y1="0" x2="0" y2="1"><stop class="sk1" offset="0"/><stop class="sk2" offset="1"/></linearGradient><linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset=".55" stop-color="#fff" stop-opacity=".12"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`;

export function curtains(x, y, w, h, c) {
  const rod = `<rect x="${x - 20}" y="${y - 8}" width="${w + 40}" height="8" rx="4" fill="#8a6a4a"/><circle cx="${x - 20}" cy="${y - 4}" r="9" fill="#8a6a4a"/><circle cx="${x + w + 20}" cy="${y - 4}" r="9" fill="#8a6a4a"/>`;
  const one = (x0, dir) => { const cw = w * 0.22; const p = `M${x0} ${y} L${x0 + dir * cw} ${y} Q${x0 + dir * cw * 0.7} ${y + h * 0.55} ${x0 + dir * cw * 1.05} ${y + h} L${x0} ${y + h} Z`;
    return `<path d="${p}" fill="${c}"/><path d="M${x0 + dir * cw * 0.33} ${y} Q${x0 + dir * cw * 0.25} ${y + h * 0.6} ${x0 + dir * cw * 0.38} ${y + h}" stroke="#000" stroke-opacity=".12" stroke-width="6" fill="none"/><path d="M${x0 + dir * cw * 0.7} ${y} Q${x0 + dir * cw * 0.55} ${y + h * 0.55} ${x0 + dir * cw * 0.78} ${y + h}" stroke="#000" stroke-opacity=".1" stroke-width="5" fill="none"/>`; };
  return rod + one(x, 1) + one(x + w, -1);
}

export function plant(x, y, s = 1, pot = "#C9744B", leaf = "#4F7D5B", kind = "monstera") {
  const k = (v) => v * s; let leaves = "";
  if (kind === "monstera") {
    const L = [[-70, -150, -40], [10, -200, 5], [70, -140, 35], [-30, -230, -15], [50, -250, 20], [-90, -90, -60], [95, -80, 60]];
    leaves = L.map(([dx, dy, r]) => `<path d="M${x} ${y - k(40)} Q${x + k(dx * 0.4)} ${y + k(dy * 0.5)} ${x + k(dx)} ${y + k(dy)}" stroke="#3E6A4A" stroke-width="${k(4)}" fill="none"/><g transform="translate(${x + k(dx)} ${y + k(dy)}) rotate(${r}) scale(${s})"><path d="M0 0 C-38 -10 -44 -58 0 -78 C44 -58 38 -10 0 0Z" fill="${leaf}"/><path d="M0 -4 L0 -72" stroke="#fff" stroke-opacity=".25" stroke-width="2"/><path d="M-22 -30 l-14 4 M22 -30 l14 4 M-18 -52 l-12 0 M18 -52 l12 0" stroke="#000" stroke-opacity=".12" stroke-width="5"/></g>`).join("");
  } else if (kind === "snake") {
    leaves = [-30, -15, 0, 14, 28].map((dx, i) => `<path d="M${x + k(dx)} ${y - k(40)} Q${x + k(dx * 1.4)} ${y - k(120 + i * 15)} ${x + k(dx * 0.6)} ${y - k(180 + (i % 3) * 35)} Q${x + k(dx + 8)} ${y - k(110)} ${x + k(dx + 10)} ${y - k(40)}Z" fill="${i % 2 ? leaf : "#6E9A5E"}"/>`).join("");
  } else if (kind === "fern") {
    leaves = [-60, -35, -10, 15, 40, 65].map((a) => `<path d="M${x} ${y - k(40)} q${k(a * 0.6)} ${k(-60)} ${k(a * 1.6)} ${k(-40 - Math.abs(a))}" stroke="${leaf}" stroke-width="${k(14)}" stroke-linecap="round" fill="none"/>`).join("");
  } else if (kind === "bougainvillea") {
    leaves = `<path d="M${x} ${y - k(40)} C${x - k(20)} ${y - k(160)} ${x + k(30)} ${y - k(220)} ${x + k(10)} ${y - k(300)}" stroke="#5b4030" stroke-width="${k(7)}" fill="none"/>` + Array.from({ length: 26 }, (_, i) => { const a = i * 2.39, r = k(30 + (i % 7) * 12); return `<circle cx="${x + Math.cos(a) * r}" cy="${y - k(170) + Math.sin(a) * r * 1.2}" r="${k(16 + (i % 3) * 4)}" fill="${["#D6408A", "#E05C9E", "#C2307A", "#4F7D5B"][i % 4]}"/>`; }).join("");
  }
  return `<g class="plant">${shadow(x, y, k(60), k(10))}${leaves}<path d="M${x - k(44)} ${y - k(46)} L${x + k(44)} ${y - k(46)} L${x + k(34)} ${y} L${x - k(34)} ${y} Z" fill="${pot}"/><rect x="${x - k(50)}" y="${y - k(54)}" width="${k(100)}" height="${k(14)}" rx="${k(5)}" fill="${pot}"/><rect x="${x - k(50)}" y="${y - k(54)}" width="${k(100)}" height="${k(5)}" fill="#fff" opacity=".2"/></g>`;
}

export function frameArt(x, y, w, h, frame, inner) {
  return `<g class="art">${shadow(x + w / 2, y + h + 8, w * 0.4, 6, 0.08)}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${frame}"/><rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h - 20}" fill="#FBF6EE"/>${inner(x + 10, y + 10, w - 20, h - 20)}</g>`;
}
/** tranh trừu tượng kiểu Matisse */
export const abstract = (cols) => (x, y, w, h) => `<circle cx="${x + w * 0.35}" cy="${y + h * 0.45}" r="${Math.min(w, h) * 0.28}" fill="${cols[0]}"/><path d="M${x + w * 0.5} ${y + h} Q${x + w * 0.6} ${y + h * 0.3} ${x + w} ${y + h * 0.4} L${x + w} ${y + h}Z" fill="${cols[1]}"/><rect x="${x + w * 0.12}" y="${y + h * 0.12}" width="${w * 0.18}" height="${h * 0.18}" fill="${cols[2]}"/>`;
/** tranh mèo (bóng mèo nhỏ) */
export const catPic = (c) => (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/><path d="M${x + w * 0.42} ${y + h * 0.85} q-2 -30 10 -46 l-4 -14 l10 9 q8 -3 16 0 l10 -9 l-4 14 q12 16 10 46 q16 4 22 -10" fill="#1d1d22" stroke="#1d1d22" stroke-width="2" stroke-linejoin="round" transform="scale(1)"/><circle cx="${x + w * 0.75}" cy="${y + h * 0.25}" r="${w * 0.1}" fill="#F6D27A"/>`;

/** đèn: thân + chao; nơi phát sáng ban đêm khai báo riêng ở lights[] của phòng */
export function floorLamp(x, y, c = "#E8C27A") {
  return `<g class="lamp">${shadow(x, y, 50, 9)}<ellipse cx="${x}" cy="${y - 4}" rx="38" ry="9" fill="#3b3330"/><rect x="${x - 4}" y="${y - 330}" width="8" height="326" fill="#3b3330"/><path d="M${x - 70} ${y - 330} L${x + 70} ${y - 330} L${x + 46} ${y - 430} L${x - 46} ${y - 430} Z" fill="${c}"/><path d="M${x - 70} ${y - 330} L${x + 70} ${y - 330} L${x + 66} ${y - 342} L${x - 66} ${y - 342}Z" fill="#000" opacity=".1"/></g>`;
}
export function pendant(x, y, len, c = "#2F3B3A") {
  return `<g class="lamp"><line x1="${x}" y1="0" x2="${x}" y2="${y + len}" stroke="#2a2a2a" stroke-width="3"/><path d="M${x - 50} ${y + len + 60} Q${x} ${y + len - 20} ${x + 50} ${y + len + 60} Z" fill="${c}"/><ellipse cx="${x}" cy="${y + len + 60}" rx="50" ry="8" fill="#FFE8B0"/></g>`;
}
export function shelf(x, y, w, c, items = "") {
  return `<g class="shelf"><rect x="${x}" y="${y}" width="${w}" height="12" rx="3" fill="${c}"/><rect x="${x}" y="${y + 12}" width="${w}" height="5" fill="#000" opacity=".1"/>${items}</g>`;
}
export const books = (x, y, cols) => cols.map((c, i) => { const h = 50 + ((i * 37) % 30), w = 16 + ((i * 13) % 8); const xx = x + cols.slice(0, i).reduce((s, _, j) => s + 18 + ((j * 13) % 8), 0); return `<rect x="${xx}" y="${y - h}" width="${w}" height="${h}" rx="2" fill="${c}"/>`; }).join("");
export const rug = (cx, cy, rx, ry, c1, c2) => `<g class="rug"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c1}"/><ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.78}" ry="${ry * 0.72}" fill="none" stroke="${c2}" stroke-width="6" stroke-dasharray="2 14" stroke-linecap="round"/><ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.5}" ry="${ry * 0.44}" fill="none" stroke="${c2}" stroke-width="4" opacity=".7"/></g>`;
