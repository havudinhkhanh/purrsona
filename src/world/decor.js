// Đồ đạc ĐỘNG (đổi theo trạng thái game) + đồ trang trí THEO MÙA. Scene gọi extraProps(roomId) mỗi lần dựng phòng.
import { shadow } from "./art.js";
import { dayKey } from "../core/util.js";

const TET = ["2026-02-17", "2027-02-06", "2028-01-26", "2029-02-13", "2030-02-03"];
const MOON = ["2026-09-25", "2027-09-15", "2028-10-03", "2029-09-22", "2030-09-12"];
const near = (list, d, before, after) => list.some((x) => { const t = (d - new Date(x + "T00:00:00")) / 86400e3; return t >= -before && t <= after; });
export function season(d = new Date()) {
  if (near(TET, d, 14, 7)) return { id: "tet", vi: "Tết", emo: "🧧" };
  if (near(MOON, d, 7, 2)) return { id: "moon", vi: "Trung thu", emo: "🏮" };
  const m = d.getMonth() + 1, day = d.getDate();
  if (m === 12 && day >= 10 && day <= 26) return { id: "xmas", vi: "Giáng sinh", emo: "🎄" };
  if (m === 10 && day >= 24) return { id: "halloween", vi: "Halloween", emo: "🎃" };
  return null;
}

export const CUP = { x: 1010, y: 464 }, SHARDS = { x: 1080, y: 772 };
const cup = (x, y) => `<g class="cup"><rect x="${x - 16}" y="${y - 38}" width="32" height="38" rx="6" fill="#557E77"/><path d="M${x + 16} ${y - 30} q16 0 16 12 q0 12 -16 12" stroke="#557E77" stroke-width="6" fill="none"/><rect x="${x - 16}" y="${y - 38}" width="32" height="6" rx="3" fill="#fff" opacity=".25"/><path d="M${x - 6} ${y - 50} q-6 -8 0 -16 m10 16 q-6 -8 0 -16" stroke="#fff" stroke-width="3" fill="none" opacity=".6"/></g>`;
const shards = (x, y) => `<g class="shards">${shadow(x, y, 46, 6, 0.12)}<path d="M${x - 40} ${y} l14 -12 l8 12z M${x - 8} ${y + 2} l10 -18 l12 16z M${x + 22} ${y} l6 -10 l14 8z M${x + 4} ${y + 6} l-8 -6 l14 -2z" fill="#557E77"/><path d="M${x - 2} ${y - 14} l6 0" stroke="#fff" stroke-width="2" opacity=".5"/></g>`;
const boxBack = (x, z) => `${shadow(x, z, 110, 12, 0.22)}<path d="M${x - 90} ${z - 120} L${x + 90} ${z - 120} L${x + 96} ${z - 40} L${x - 96} ${z - 40}Z" fill="#B88A5A"/><path d="M${x - 90} ${z - 120} l-40 -44 l120 6 z" fill="#C9A06A"/><path d="M${x + 90} ${z - 120} l44 -40 l-110 4z" fill="#A9784A"/>`;
const boxFront = (x, z) => `<path d="M${x - 100} ${z - 70} L${x + 100} ${z - 70} L${x + 92} ${z} L${x - 92} ${z}Z" fill="#C9A06A"/><path d="M${x - 100} ${z - 70} L${x + 100} ${z - 70}" stroke="#A9784A" stroke-width="5"/><rect x="${x - 34}" y="${z - 48}" width="68" height="24" rx="3" fill="#E9DCC6"/><text x="${x}" y="${z - 30}" text-anchor="middle" font-size="15" font-family="system-ui" font-weight="700" fill="#8a6a42">FRAGILE</text>`;
const mai = (x, z) => `<g>${shadow(x, z, 70, 10)}<path d="M${x} ${z - 60} C${x - 30} ${z - 180} ${x + 40} ${z - 240} ${x - 10} ${z - 330} M${x} ${z - 150} C${x + 60} ${z - 200} ${x + 90} ${z - 230} ${x + 120} ${z - 300} M${x - 6} ${z - 200} C${x - 70} ${z - 230} ${x - 90} ${z - 280} ${x - 110} ${z - 320}" stroke="#5b4030" stroke-width="7" fill="none" stroke-linecap="round"/>
  ${Array.from({ length: 34 }, (_, i) => { const a = i * 2.4, r = 30 + (i % 9) * 11; return `<circle cx="${x + Math.cos(a) * r * 1.3}" cy="${z - 250 + Math.sin(a) * r}" r="${7 + (i % 3) * 2}" fill="${i % 5 ? "#F2C230" : "#F7DD72"}"/>`; }).join("")}
  ${[[-60, -230], [70, -260], [20, -300], [-90, -290]].map(([dx, dy]) => `<rect x="${x + dx}" y="${z + dy}" width="22" height="34" rx="3" fill="#D63B2F"/><rect x="${x + dx + 5}" y="${z + dy + 8}" width="12" height="6" fill="#F2C230"/>`).join("")}
  <path d="M${x - 50} ${z - 70} L${x + 50} ${z - 70} L${x + 38} ${z} L${x - 38} ${z}Z" fill="#C8463A"/><rect x="${x - 56}" y="${z - 78}" width="112" height="14" rx="5" fill="#B33A2F"/><text x="${x}" y="${z - 26}" text-anchor="middle" font-size="26" fill="#F2C230" font-family="serif">福</text></g>`;
const xmas = (x, z) => `<g>${shadow(x, z, 80, 10)}${[0, 1, 2, 3].map((i) => `<path d="M${x} ${z - 330 + i * 60} L${x + 50 + i * 22} ${z - 230 + i * 60} L${x - 50 - i * 22} ${z - 230 + i * 60}Z" fill="${i % 2 ? "#2F6B4A" : "#3B7D57"}"/>`).join("")}<rect x="${x - 12}" y="${z - 50}" width="24" height="40" fill="#6b4a33"/><rect x="${x - 40}" y="${z - 14}" width="80" height="14" rx="4" fill="#C8463A"/>
  ${Array.from({ length: 14 }, (_, i) => `<circle class="bulb" cx="${x + Math.sin(i * 1.7) * (20 + i * 5)}" cy="${z - 300 + i * 18}" r="6"/>`).join("")}<path d="M${x} ${z - 362} l7 16 l17 2 l-13 11 l4 17 l-15 -9 l-15 9 l4 -17 l-13 -11 l17 -2z" fill="#F2C230"/></g>`;
const lantern = (x) => `<g><line x1="${x}" y1="0" x2="${x}" y2="90" stroke="#3b3330" stroke-width="3"/><path d="M${x} 90 l26 48 l52 6 l-38 36 l10 52 l-50 -26 l-50 26 l10 -52 l-38 -36 l52 -6z" fill="#E0463A"/><path d="M${x} 90 l26 48 l52 6 l-38 36 l10 52 l-50 -26 l-50 26 l10 -52 l-38 -36 l52 -6z" fill="none" stroke="#F2C230" stroke-width="4"/><circle class="bulb" cx="${x}" cy="168" r="16"/><path d="M${x - 8} 256 l8 30 l8 -30" stroke="#F2C230" stroke-width="3" fill="none"/></g>`;
const pumpkin = (x, z) => `<g>${shadow(x, z, 60, 9)}<ellipse cx="${x}" cy="${z - 44}" rx="60" ry="44" fill="#E07A2F"/><ellipse cx="${x}" cy="${z - 44}" rx="24" ry="44" fill="#EB8C3E"/><rect x="${x - 6}" y="${z - 100}" width="12" height="20" rx="4" fill="#4F7D5B"/><path d="M${x - 30} ${z - 56} l12 -14 l12 14z M${x + 6} ${z - 56} l12 -14 l12 14z M${x - 30} ${z - 30} q30 16 60 0 l-8 10 q-22 8 -44 0z" fill="#3a2410"/></g>`;

/** đồ động + đồ mùa cho 1 phòng */
export function extraProps(room, game) {
  const h = game.save.house, out = [];
  if (room === "kitchen") { if (h.cup !== "broken") out.push({ id: "cup", z: 693, svg: cup(CUP.x, CUP.y) }); else out.push({ id: "shards", z: SHARDS.y, svg: shards(SHARDS.x, SHARDS.y) }); }
  if (room === "living" && h.box === dayKey()) { out.push({ id: "boxback", z: 800, svg: boxBack(600, 812) }, { id: "boxfront", z: 836, svg: boxFront(600, 812) }); }
  const se = season();
  if (se?.id === "tet" && room === "living") out.push({ id: "mai", z: 712, svg: mai(760, 712) });
  if (se?.id === "xmas" && room === "living") out.push({ id: "xmas", z: 716, svg: xmas(1440, 716) });
  if (se?.id === "moon" && room === "living") out.push({ id: "lantern", z: 2, svg: lantern(1320) });
  if (se?.id === "halloween" && room === "kitchen") out.push({ id: "pumpkin", z: 760, svg: pumpkin(200, 760) });
  return out;
}
/** chỗ mèo hay tới phát sinh từ đồ động */
export function extraSpots(room, game) {
  if (room === "living" && game.save.house.box === dayKey()) return { box: { x: 600, y: 812, h: 16, z: 812, face: 1, use: ["nap", "loaf"] } };
  return {};
}
