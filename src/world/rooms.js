// =====================================================================================
// CĂN NHÀ – dữ liệu các phòng. Thêm phòng = thêm 1 mục vào ROOMS + ORDER. Không đụng code game.
//
//  W          bề ngang phòng (cao luôn = 900)
//  exits      { left: id phòng, right: id phòng }  → ô cửa ở mép, mèo đi ra = chuyển cảnh check-in
//  bg(W)      SVG nền (tường, sàn, cửa sổ…) – nằm SAU mèo. Muốn dùng ảnh AI vẽ: bgImage: "assets/rooms/living.webp"
//  props[]    đồ đạc có chiều sâu { id, z, svg } – z = toạ độ y chân đồ; mèo có y > z sẽ đứng TRƯỚC đồ đó
//  spots{}    chỗ mèo hay tới { x, y, h (độ cao bề mặt so với sàn – nhảy lên), face, use:[hoạt động], z }
//  lights[]   nguồn sáng ban đêm { x, y, r }
//  walk       vùng mèo được đi { x0, x1, y0, y1 }
// =====================================================================================
import * as A from "./art.js";
const { FLOOR_Y: FY } = A;

const sofa = (x, z) => {
  const w = 500, top = z - 270;
  return `${A.shadow(x + w / 2, z, w * 0.55, 16, 0.2)}
  <rect x="${x + 30}" y="${z - 26}" width="12" height="26" rx="3" fill="#5a3c28"/><rect x="${x + w - 42}" y="${z - 26}" width="12" height="26" rx="3" fill="#5a3c28"/>
  <rect x="${x + 20}" y="${top}" width="${w - 40}" height="150" rx="34" fill="#557E77"/>
  <rect x="${x + 20}" y="${top}" width="${w - 40}" height="20" rx="10" fill="#fff" opacity=".1"/>
  <rect x="${x + 50}" y="${top + 98}" width="${(w - 100) / 2 - 4}" height="60" rx="18" fill="#6A948C"/><rect x="${x + w / 2 + 4}" y="${top + 98}" width="${(w - 100) / 2 - 4}" height="60" rx="18" fill="#6A948C"/>
  <rect x="${x}" y="${top + 120}" width="${w}" height="${z - 26 - top - 120}" rx="22" fill="#4C726B"/>
  <rect x="${x - 10}" y="${top + 70}" width="70" height="${z - 26 - top - 70}" rx="30" fill="#5F8A82"/><rect x="${x + w - 60}" y="${top + 70}" width="70" height="${z - 26 - top - 70}" rx="30" fill="#5F8A82"/>
  <rect x="${x + 70}" y="${top + 40}" width="90" height="80" rx="18" fill="#E2B04A" transform="rotate(-8 ${x + 115} ${top + 80})"/><rect x="${x + w - 165}" y="${top + 45}" width="86" height="76" rx="18" fill="#E7DCCB" transform="rotate(7 ${x + w - 122} ${top + 83})"/>
  <path d="M${x + 80} ${top + 70} l70 0" stroke="#000" stroke-opacity=".08" stroke-width="4" transform="rotate(-8 ${x + 115} ${top + 80})"/>`;
};
const coffeeTable = (x, z) => `${A.shadow(x + 170, z, 190, 14, 0.18)}<rect x="${x + 20}" y="${z - 70}" width="12" height="70" fill="#4a3426"/><rect x="${x + 308}" y="${z - 70}" width="12" height="70" fill="#4a3426"/><rect x="${x + 60}" y="${z - 64}" width="10" height="56" fill="#3d2b20"/><rect x="${x + 270}" y="${z - 64}" width="10" height="56" fill="#3d2b20"/><rect x="${x}" y="${z - 90}" width="340" height="24" rx="10" fill="#8A5E3F"/><rect x="${x}" y="${z - 90}" width="340" height="6" rx="3" fill="#fff" opacity=".18"/>
  <rect x="${x + 40}" y="${z - 112}" width="90" height="22" rx="3" fill="#E7DCCB"/><rect x="${x + 46}" y="${z - 126}" width="80" height="14" rx="3" fill="#C8664A"/><path d="M${x + 230} ${z - 90} q0 -36 22 -36 q22 0 22 36z" fill="#F2EBDD"/><path d="M${x + 252} ${z - 126} q-14 -26 -4 -40 m4 40 q8 -30 22 -34" stroke="#4F7D5B" stroke-width="4" fill="none"/>`;
const catTree = (x, z) => `${A.shadow(x, z, 120, 14)}<rect x="${x - 110}" y="${z - 26}" width="220" height="26" rx="10" fill="#D9C7AE"/>
  <rect x="${x - 60}" y="${z - 210}" width="34" height="186" fill="#C9A77A"/><rect x="${x + 30}" y="${z - 330}" width="34" height="306" fill="#C9A77A"/>
  ${Array.from({ length: 14 }, (_, i) => `<line x1="${x - 60}" y1="${z - 40 - i * 12}" x2="${x - 26}" y2="${z - 34 - i * 12}" stroke="#a8875c" stroke-width="3"/>`).join("")}
  ${Array.from({ length: 24 }, (_, i) => `<line x1="${x + 30}" y1="${z - 40 - i * 12}" x2="${x + 64}" y2="${z - 34 - i * 12}" stroke="#a8875c" stroke-width="3"/>`).join("")}
  <rect x="${x - 120}" y="${z - 222}" width="150" height="22" rx="10" fill="#E8DCC8"/><rect x="${x - 120}" y="${z - 222}" width="150" height="6" rx="3" fill="#fff" opacity=".35"/>
  <rect x="${x - 40}" y="${z - 350}" width="160" height="24" rx="10" fill="#E8DCC8"/><rect x="${x - 40}" y="${z - 350}" width="160" height="6" rx="3" fill="#fff" opacity=".35"/>
  <path d="M${x - 92} ${z - 200} q-6 40 6 64" stroke="#C8664A" stroke-width="3" fill="none"/><circle cx="${x - 86}" cy="${z - 132}" r="11" fill="#E2B04A"/>`;
const counter = (x, w, z) => {
  const top = z - 228; let doors = "";
  for (let i = 0; i < Math.floor(w / 130); i++) { const dx = x + 14 + i * 130; doors += `<rect x="${dx}" y="${top + 40}" width="116" height="${z - top - 62}" rx="8" fill="#E9DFD0"/><rect x="${dx + 50}" y="${top + 60}" width="16" height="5" rx="2" fill="#9b8a76"/>`; }
  return `${A.shadow(x + w / 2, z, w * 0.52, 12, 0.15)}<rect x="${x}" y="${top + 20}" width="${w}" height="${z - top - 20}" rx="6" fill="#B98A62"/>${doors}<rect x="${x}" y="${z - 18}" width="${w}" height="18" fill="#6b4c36"/>
  <rect x="${x - 12}" y="${top}" width="${w + 24}" height="26" rx="6" fill="#F4F1EA"/><rect x="${x - 12}" y="${top + 20}" width="${w + 24}" height="6" fill="#000" opacity=".1"/>
  <rect x="${x + w * 0.55}" y="${top - 6}" width="140" height="10" rx="4" fill="#cfd5d6"/><path d="M${x + w * 0.55 + 100} ${top - 6} q0 -60 -40 -60" stroke="#aab3b4" stroke-width="10" fill="none" stroke-linecap="round"/>
  <path d="M${x + 60} ${top} q0 -40 30 -40 q30 0 30 40z" fill="#C8664A"/><rect x="${x + 64}" y="${top - 8}" width="52" height="8" fill="#a65037"/>
  <rect x="${x + 180}" y="${top - 70}" width="22" height="70" rx="4" fill="#4F7D5B"/><rect x="${x + 210}" y="${top - 52}" width="26" height="52" rx="4" fill="#E2B04A"/>`;
};
const fridge = (x, z) => `${A.shadow(x + 95, z, 110, 12)}<rect x="${x}" y="${z - 560}" width="190" height="560" rx="26" fill="#EFE5D2"/><rect x="${x}" y="${z - 560}" width="190" height="560" rx="26" fill="url(#frg)"/><rect x="${x + 8}" y="${z - 380}" width="174" height="5" fill="#d6cab4"/><rect x="${x + 156}" y="${z - 520}" width="10" height="100" rx="5" fill="#bfb29b"/><rect x="${x + 156}" y="${z - 350}" width="10" height="140" rx="5" fill="#bfb29b"/>
  <rect x="${x + 30}" y="${z - 470}" width="44" height="54" rx="4" fill="#F6D27A" transform="rotate(-6 ${x + 52} ${z - 443})"/><circle cx="${x + 92}" cy="${z - 450}" r="14" fill="#E07A5F"/><rect x="${x + 40}" y="${z - 300}" width="60" height="40" rx="3" fill="#fff" transform="rotate(4 ${x + 70} ${z - 280})"/>
  <defs><linearGradient id="frg" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".25" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`;
const bowls = (x, z) => `<g class="bowls">${A.shadow(x, z, 52, 9, 0.2)}<path d="M${x - 48} ${z - 30} L${x + 48} ${z - 30} L${x + 36} ${z} L${x - 36} ${z}Z" fill="#C8664A"/><ellipse cx="${x}" cy="${z - 30}" rx="48" ry="10" fill="#A9503A"/><g class="food"><ellipse cx="${x}" cy="${z - 33}" rx="40" ry="8" fill="#8B5A2B"/><circle cx="${x - 14}" cy="${z - 37}" r="5" fill="#A86B34"/><circle cx="${x + 6}" cy="${z - 38}" r="5" fill="#9b6230"/><circle cx="${x + 20}" cy="${z - 35}" r="5" fill="#B47A3E"/></g><text x="${x}" y="${z - 8}" font-size="15" text-anchor="middle" fill="#fff" opacity=".85" font-family="system-ui" font-weight="700">MEO</text>
  ${A.shadow(x + 110, z + 14, 44, 8, 0.2)}<path d="M${x + 70} ${z - 14} L${x + 150} ${z - 14} L${x + 140} ${z + 14} L${x + 80} ${z + 14}Z" fill="#6E9AA8"/><ellipse cx="${x + 110}" cy="${z - 14}" rx="40" ry="8" fill="#9CC6D2"/><ellipse cx="${x + 104}" cy="${z - 16}" rx="16" ry="3" fill="#fff" opacity=".6"/></g>`;
const bed = (x, z) => {
  const w = 560, top = z - 200;
  return `${A.shadow(x + w / 2, z, w * 0.55, 16, 0.2)}
  <rect x="${x + 20}" y="${z - 420}" width="${w - 40}" height="260" rx="30" fill="#A77B56"/><rect x="${x + 44}" y="${z - 396}" width="${w - 88}" height="210" rx="20" fill="#B88B64"/>
  <rect x="${x}" y="${top + 60}" width="${w}" height="${140 - 20}" rx="14" fill="#8F6646"/><rect x="${x + 16}" y="${z - 22}" width="20" height="22" fill="#6b4a33"/><rect x="${x + w - 36}" y="${z - 22}" width="20" height="22" fill="#6b4a33"/>
  <rect x="${x + 4}" y="${top}" width="${w - 8}" height="90" rx="26" fill="#F6F1E8"/>
  <rect x="${x + 50}" y="${top - 70}" width="170" height="80" rx="30" fill="#FFFFFF"/><rect x="${x + 240}" y="${top - 64}" width="170" height="76" rx="30" fill="#EFE7DA"/><rect x="${x + 400}" y="${top - 44}" width="110" height="64" rx="24" fill="#93A8C4"/>
  <path d="M${x + 4} ${top + 30} Q${x + w * 0.5} ${top + 4} ${x + w - 4} ${top + 26} L${x + w - 4} ${top + 120} Q${x + w * 0.5} ${top + 140} ${x + 4} ${top + 120}Z" fill="#E6EBF3"/>
  <path d="M${x + w * 0.55} ${top + 16} L${x + w - 4} ${top + 22} L${x + w - 4} ${top + 124} L${x + w * 0.6} ${top + 134}Z" fill="#E2B04A"/><path d="M${x + w * 0.58} ${top + 30} L${x + w - 10} ${top + 34}" stroke="#fff" stroke-opacity=".4" stroke-width="4"/>`;
};
const nightstand = (x, z) => `${A.shadow(x + 60, z, 70, 10)}<rect x="${x}" y="${z - 150}" width="120" height="150" rx="10" fill="#C9A77A"/><rect x="${x + 10}" y="${z - 108}" width="100" height="40" rx="5" fill="#B8956A"/><circle cx="${x + 60}" cy="${z - 88}" r="5" fill="#7a5c3c"/>
  <rect x="${x + 52}" y="${z - 230}" width="16" height="80" fill="#E7DCCB"/><path d="M${x + 14} ${z - 230} L${x + 106} ${z - 230} L${x + 88} ${z - 300} L${x + 32} ${z - 300}Z" fill="#E2B04A"/>`;
const catBed = (x, z) => `${A.shadow(x, z, 120, 14)}<ellipse cx="${x}" cy="${z - 26}" rx="118" ry="38" fill="#C8664A"/><ellipse cx="${x}" cy="${z - 38}" rx="96" ry="24" fill="#F2D8C2"/><path d="M${x - 118} ${z - 26} q118 50 236 0 l0 10 q-118 52 -236 0z" fill="#A9503A"/>`;
const tub = (x, z) => {
  const w = 460;
  return `${A.shadow(x + w / 2, z, w * 0.55, 14)}<path d="M${x} ${z - 190} L${x + w} ${z - 190} Q${x + w} ${z - 40} ${x + w - 60} ${z - 30} L${x + 60} ${z - 30} Q${x} ${z - 40} ${x} ${z - 190}Z" fill="#FFFFFF"/><path d="M${x} ${z - 190} L${x + w} ${z - 190} Q${x + w} ${z - 40} ${x + w - 60} ${z - 30} L${x + 60} ${z - 30} Q${x} ${z - 40} ${x} ${z - 190}Z" fill="url(#tubg)"/>
  <rect x="${x - 14}" y="${z - 204}" width="${w + 28}" height="22" rx="11" fill="#F7F7F5"/><path d="M${x + 60} ${z - 30} l-14 30 h24 l10 -30z M${x + w - 60} ${z - 30} l14 30 h-24 l-10 -30z" fill="#C8A064"/>
  <path d="M${x + w - 40} ${z - 204} l0 -90 q0 -26 -26 -26 l-30 0" stroke="#C8A064" stroke-width="10" fill="none" stroke-linecap="round"/>
  <ellipse cx="${x + 140}" cy="${z - 214}" rx="26" ry="10" fill="#F2D7D5"/><circle cx="${x + 132}" cy="${z - 222}" r="5" fill="#fff"/><circle cx="${x + 146}" cy="${z - 226}" r="4" fill="#fff"/>
  <defs><linearGradient id="tubg" x1="0" x2="1"><stop offset="0" stop-color="#cfd9e0" stop-opacity=".6"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#b9c4cc" stop-opacity=".5"/></linearGradient></defs>`;
};
const sink = (x, z) => `${A.shadow(x + 70, z, 70, 10)}<rect x="${x + 50}" y="${z - 250}" width="40" height="250" rx="12" fill="#F7F7F5"/><path d="M${x} ${z - 262} L${x + 140} ${z - 262} Q${x + 140} ${z - 200} ${x + 70} ${z - 200} Q${x} ${z - 200} ${x} ${z - 262}Z" fill="#FFFFFF"/><rect x="${x - 8}" y="${z - 272}" width="156" height="16" rx="8" fill="#F1F1EE"/><path d="M${x + 70} ${z - 272} l0 -26 l24 0" stroke="#C8A064" stroke-width="7" fill="none" stroke-linecap="round"/>`;
const litter = (x, z) => `<g class="litter">${A.shadow(x, z, 100, 10)}<path d="M${x - 92} ${z - 70} L${x + 92} ${z - 70} L${x + 82} ${z} L${x - 82} ${z}Z" fill="#7C8F9A"/><rect x="${x - 98}" y="${z - 78}" width="196" height="14" rx="7" fill="#91A5B0"/><ellipse cx="${x}" cy="${z - 70}" rx="84" ry="8" fill="#E3D3B3"/><g class="dirt"><circle cx="${x - 30}" cy="${z - 73}" r="7" fill="#8b6c45"/><circle cx="${x + 18}" cy="${z - 72}" r="6" fill="#7d5f3c"/><circle cx="${x + 44}" cy="${z - 74}" r="5" fill="#8b6c45"/></g><path d="M${x + 110} ${z} l30 -110" stroke="#9aa" stroke-width="6" stroke-linecap="round"/><path d="M${x + 132} ${z - 116} l20 -30 l16 8 l-18 30z" fill="#E2B04A"/></g>`;
const chair = (x, z) => `${A.shadow(x + 110, z, 130, 14)}<path d="M${x + 20} ${z} l20 -150 M${x + 200} ${z} l-20 -150" stroke="#8a6a42" stroke-width="12" stroke-linecap="round"/>
  <path d="M${x} ${z - 150} Q${x + 110} ${z - 120} ${x + 220} ${z - 150} L${x + 210} ${z - 120} Q${x + 110} ${z - 96} ${x + 10} ${z - 120}Z" fill="#C9A06A"/>
  <path d="M${x - 10} ${z - 150} Q${x - 30} ${z - 360} ${x + 110} ${z - 380} Q${x + 250} ${z - 360} ${x + 230} ${z - 150}" fill="none" stroke="#C9A06A" stroke-width="22" stroke-linecap="round"/>
  ${Array.from({ length: 9 }, (_, i) => `<path d="M${x + 10 + i * 25} ${z - 155} Q${x + 10 + i * 25} ${z - 300} ${x + 110} ${z - 360}" stroke="#B8905A" stroke-width="5" fill="none" opacity=".8"/>`).join("")}
  <rect x="${x + 20}" y="${z - 172}" width="180" height="30" rx="14" fill="#F2E3C6"/>`;
const railing = (W, y) => `<rect y="${y}" width="${W}" height="16" rx="6" fill="#3E4A4F"/>${Array.from({ length: Math.ceil(W / 46) }, (_, i) => `<rect x="${i * 46 + 18}" y="${y + 16}" width="8" height="${FY - y - 16}" fill="#3E4A4F"/>`).join("")}<rect y="${FY - 8}" width="${W}" height="10" fill="#3E4A4F"/>`;
const skyline = (W) => {
  let s = `<rect class="sky" fill="url(#skyg)" width="${W}" height="${FY}"/><circle class="sun" cx="${W * 0.7}" cy="170" r="60"/>`;
  s += `<g class="cloud" opacity=".85"><ellipse cx="${W * 0.25}" cy="150" rx="120" ry="26" fill="#fff"/><ellipse cx="${W * 0.3}" cy="130" rx="80" ry="30" fill="#fff"/><ellipse cx="${W * 0.55}" cy="90" rx="90" ry="18" fill="#fff"/></g>`;
  s += `<g class="stars">${Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 397) % W}" cy="${20 + ((i * 131) % 300)}" r="${1 + (i % 3) * 0.6}" fill="#fff"/>`).join("")}</g>`;
  const far = [], near = [];
  for (let x = -20, i = 0; x < W; i++) { const w = 60 + ((i * 53) % 70), h = 120 + ((i * 97) % 200); far.push(`<rect x="${x}" y="${FY - 120 - h}" width="${w}" height="${h + 120}" />`); x += w + 6; }
  for (let x = 30, i = 0; x < W; i++) { const w = 90 + ((i * 41) % 90), h = 80 + ((i * 67) % 160); near.push(`<rect x="${x}" y="${FY - 40 - h}" width="${w}" height="${h + 40}" rx="4"/>`); x += w + 40 + ((i * 29) % 60); }
  const tower = `<path d="M${W * 0.42} ${FY} L${W * 0.42 + 20} 120 L${W * 0.42 + 34} 60 L${W * 0.42 + 48} 120 L${W * 0.42 + 68} ${FY}Z"/>`;
  const wins = Array.from({ length: 90 }, (_, i) => `<rect x="${(i * 211) % W}" y="${FY - 60 - ((i * 37) % 220)}" width="8" height="10"/>`).join("");
  return s + `<g class="city-far">${far.join("")}${tower}</g><g class="city-near">${near.join("")}</g><g class="city-win">${wins}</g>`;
};
const butterflyHost = `<g class="flutter"></g>`;
// cửa chính (khung + phần ngoài hành lang nằm ở nền; cánh cửa là đồ đạc riêng để mở / đóng được)
const frontDoorFrame = (x) => `<g class="frontdoor-frame"><rect x="${x - 16}" y="214" width="202" height="${FY - 214}" rx="10" fill="#E7DCCB"/><rect x="${x}" y="230" width="170" height="${FY - 230}" fill="#FFE9BC"/><rect x="${x}" y="230" width="170" height="${FY - 230}" fill="url(#hall)"/><rect x="${x + 40}" y="${FY - 120}" width="90" height="120" fill="#C9A77A" opacity=".5"/>
  <defs><linearGradient id="hall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6dc"/><stop offset="1" stop-color="#e8c98e"/></linearGradient></defs>
  <path d="M${x - 30} ${FY + 4} L${x + 200} ${FY + 4} L${x + 214} ${FY + 46} L${x - 44} ${FY + 46}Z" fill="#8B5A3C"/><path d="M${x - 20} ${FY + 14} L${x + 190} ${FY + 14}" stroke="#a46d48" stroke-width="3" stroke-dasharray="6 8"/>
  <text x="${x + 85}" y="${FY + 36}" text-anchor="middle" font-size="16" font-family="system-ui" font-weight="700" fill="#E9C46A" opacity=".85">WELCOME</text></g>`;
const frontDoorLeaf = (x) => `<g class="door-leaf" style="transform-box:fill-box;transform-origin:0% 50%"><rect x="${x}" y="230" width="170" height="${FY - 230}" fill="#7A4E35"/><rect x="${x + 18}" y="256" width="134" height="140" rx="6" fill="#6A4330"/><rect x="${x + 18}" y="420" width="134" height="170" rx="6" fill="#6A4330"/><rect x="${x + 50}" y="276" width="70" height="80" rx="35" fill="#F3D9A4" opacity=".55"/><circle cx="${x + 148}" cy="${FY - 196}" r="8" fill="#E2B04A"/><rect x="${x + 140}" y="${FY - 172}" width="16" height="6" rx="3" fill="#E2B04A"/><rect x="${x}" y="230" width="8" height="${FY - 230}" fill="#000" opacity=".12"/></g>`;
const shoeRack = (x, z) => `${A.shadow(x, z, 60, 8)}<rect x="${x - 50}" y="${z - 70}" width="100" height="70" rx="6" fill="#C9A77A"/><rect x="${x - 44}" y="${z - 40}" width="88" height="5" fill="#a8875c"/><path d="M${x - 40} ${z - 44} q14 -16 32 0z M${x + 6} ${z - 44} q14 -16 32 0z" fill="#3E4A4F"/><path d="M${x - 38} ${z - 8} q16 -14 30 0z M${x + 8} ${z - 8} q16 -14 30 0z" fill="#E07A5F"/>`;

// =====================================================================================
export const ROOMS = {
  living: {
    vi: "Phòng khách", icon: "🛋️", W: 2120, exits: { left: "bedroom", right: "kitchen" },
    walk: { x0: 120, x1: 2000, y0: 708, y1: 822 },
    mood: "Ấm áp, nắng chiều", lines: ["Sofa là của {cat}.", "Ở đây có nắng."],
    bg: (W) => A.wall(W, "#F4E6D2", "#EAD6BC", `<rect y="0" width="${W}" height="14" fill="#fff" opacity=".4"/>`) + A.glassDefs + A.doorDefs
      + A.windowBox(430, 140, 420, 320, { frame: "#FBF7F0", curtain: "#C8664A", panes: 3 })
      + A.frameArt(1080, 190, 150, 190, "#2F2A26", A.abstract(["#E2B04A", "#557E77", "#C8664A"])) + A.frameArt(1260, 230, 130, 130, "#C9A77A", A.catPic("#F2D8C2"))
      + A.baseboard(W, "#F9F3EA") + A.floor(W, "wood", "#C99A6B", "#B5845A", "#8f6440")
      + `<path class="sunbeam" d="M520 640 L900 640 L1060 860 L640 860 Z"/>`
      + A.rug(1100, 790, 380, 70, "#E9C46A", "#C8664A") + A.doorway("left", W, "#FBF7F0", "#4a3a30", "Phòng ngủ") + A.doorway("right", W, "#FBF7F0", "#4a3a30", "Bếp")
      + frontDoorFrame(1690),
    props: [
      { id: "cattree", z: 722, svg: catTree(300, 722) },
      { id: "plant", z: 700, svg: A.plant(920, 700, 1, "#C9744B", "#4F7D5B", "monstera") },
      { id: "sofa", z: 702, svg: sofa(1010, 702) },
      { id: "lamp", z: 694, svg: A.floorLamp(1580, 694) },
      { id: "table", z: 905, svg: coffeeTable(930, 905) },
      { id: "frontdoor", z: 1, svg: frontDoorLeaf(1690) },
      { id: "shoes", z: 700, svg: shoeRack(1890, 700) },
    ],
    spots: {
      sofa: { x: 1250, y: 712, h: 142, z: 702, face: -1, use: ["nap", "loaf", "groom"] },
      sunbeam: { x: 790, y: 770, h: 0, face: 1, use: ["nap", "sunbathe", "groom"], day: true },
      treetop: { x: 340, y: 726, h: 338, z: 722, face: 1, use: ["perch", "nap"] },
      treemid: { x: 250, y: 726, h: 210, z: 722, face: -1, use: ["perch"] },
      post: { x: 410, y: 742, h: 0, face: -1, use: ["scratch"] },
      rug: { x: 1120, y: 780, h: 0, face: 1, use: ["play", "roll", "groom", "loaf"] },
      window: { x: 640, y: 712, h: 238, z: 704, face: 1, use: ["watch"] },
      entry: { x: 1775, y: 732, h: 0, face: 1, use: ["wait"] },
    },
    lights: [{ x: 1580, y: 280, r: 380 }, { x: 640, y: 300, r: 260, day: true }],
    frontDoor: { x: 1690, w: 170 },
  },
  kitchen: {
    vi: "Bếp", icon: "🍳", W: 1600, exits: { left: "living", right: "bathroom" },
    walk: { x0: 120, x1: 1480, y0: 712, y1: 822 },
    mood: "Mùi cá thơm", lines: ["Bát đâu?", "Mùi gì thơm thế."],
    bg: (W) => A.wall(W, "#DDEBE2", "#CFE1D6") + A.glassDefs + A.doorDefs
      + `<rect x="300" y="300" width="860" height="170" fill="#F7F5EF"/>${Array.from({ length: 9 }, (_, i) => `<line x1="300" y1="${300 + i * 21}" x2="1160" y2="${300 + i * 21}" stroke="#dcd7cc" stroke-width="2"/>`).join("")}${Array.from({ length: 21 }, (_, i) => `<line x1="${300 + i * 43}" y1="300" x2="${300 + i * 43}" y2="470" stroke="#dcd7cc" stroke-width="2"/>`).join("")}`
      + `<rect x="300" y="90" width="230" height="190" rx="8" fill="#F4F1EA"/><rect x="312" y="102" width="100" height="166" rx="5" fill="#E9E3D7"/><rect x="418" y="102" width="100" height="166" rx="5" fill="#E9E3D7"/><rect x="930" y="90" width="230" height="190" rx="8" fill="#F4F1EA"/><rect x="942" y="102" width="100" height="166" rx="5" fill="#E9E3D7"/><rect x="1048" y="102" width="100" height="166" rx="5" fill="#E9E3D7"/>`
      + A.windowBox(600, 110, 260, 160, { frame: "#FBF7F0", sill: "#F4F1EA", panes: 2, cross: false })
      + A.shelf(1390, 330, 160, "#B98A62", `<rect x="1400" y="290" width="34" height="40" rx="6" fill="#E2B04A"/><rect x="1442" y="300" width="30" height="30" rx="6" fill="#C8664A"/><path d="M1490 330 q0 -40 20 -40 q20 0 20 40z" fill="#557E77"/>`)
      + A.pendant(730, 0, 40, "#557E77")
      + A.baseboard(W, "#F4F1EA") + A.floor(W, "tile", "#EADFCB", "#DCCDB3", "#c9b89a")
      + A.doorway("left", W, "#FBF7F0", "#4a3a30", "Phòng khách") + A.doorway("right", W, "#FBF7F0", "#4a3a30", "Phòng tắm"),
    props: [
      { id: "counter", z: 692, svg: counter(300, 860, 692) },
      { id: "fridge", z: 700, svg: fridge(1180, 700) },
      { id: "bowls", z: 806, svg: bowls(1250, 806) },
    ],
    spots: {
      bowl: { x: 1180, y: 806, h: 0, face: 1, use: ["eat"] },
      water: { x: 1450, y: 820, h: 0, face: -1, use: ["drink"] },
      counter: { x: 800, y: 698, h: 232, z: 692, face: 1, use: ["naughty", "perch"] },
      mat: { x: 700, y: 790, h: 0, face: 1, use: ["loaf", "groom", "beg"] },
      fridge: { x: 1272, y: 706, h: 560, z: 700, face: -1, use: ["perch", "watch", "nap"], minClimb: 2 },
    },
    lights: [{ x: 730, y: 140, r: 360 }],
  },
  bedroom: {
    vi: "Phòng ngủ", icon: "🛏️", W: 1700, exits: { left: "balcony", right: "living" },
    walk: { x0: 120, x1: 1580, y0: 712, y1: 822 },
    mood: "Yên tĩnh, êm", lines: ["Giường ai? Của na na.", "Ngủ thêm chút."],
    bg: (W) => A.wall(W, "#DCE3EC", "#CDD6E2", Array.from({ length: 60 }, (_, i) => `<circle cx="${40 + ((i * 173) % W)}" cy="${30 + ((i * 89) % 540)}" r="3" fill="#fff" opacity=".55"/>`).join("")) + A.glassDefs + A.doorDefs
      + A.windowBox(300, 150, 300, 290, { frame: "#FBF7F0", curtain: "#F3EEE6", panes: 2 })
      + A.frameArt(760, 120, 380, 120, "#FBF7F0", A.abstract(["#93A8C4", "#E2B04A", "#C8664A"]))
      + A.baseboard(W, "#F7F7F5") + A.floor(W, "wood", "#BE9572", "#A97F5D", "#86603f")
      + A.rug(1000, 850, 330, 44, "#F2EBDD", "#93A8C4") + A.doorway("left", W, "#FBF7F0", "#40525e", "Ban công") + A.doorway("right", W, "#FBF7F0", "#4a3a30", "Phòng khách"),
    props: [
      { id: "catbed", z: 800, svg: catBed(460, 800) },
      { id: "bed", z: 770, svg: bed(700, 770) },
      { id: "nightstand", z: 708, svg: nightstand(1300, 708) },
      { id: "plant", z: 708, svg: A.plant(1470, 708, 0.9, "#E7DCCB", "#4F7D5B", "snake") },
    ],
    spots: {
      bed: { x: 1020, y: 776, h: 204, z: 770, face: -1, use: ["nap", "loaf", "roll", "groom"] },
      catbed: { x: 460, y: 806, h: 22, z: 800, face: 1, use: ["nap", "loaf"] },
      window: { x: 450, y: 714, h: 254, z: 706, face: 1, use: ["watch"] },
      rug: { x: 960, y: 826, h: 0, face: 1, use: ["play", "roll", "stretch"] },
    },
    lights: [{ x: 1360, y: 460, r: 300 }],
  },
  bathroom: {
    vi: "Phòng tắm", icon: "🛁", W: 1400, exits: { left: "kitchen" },
    walk: { x0: 120, x1: 1330, y0: 712, y1: 822 },
    mood: "Mát lạnh", lines: ["Nước? Không, cảm ơn.", "Ai tắm thì tắm. {cat} thì không."],
    bg: (W) => A.wall(W, "#F6E1DE", "#F2D7D5") + A.glassDefs + A.doorDefs
      + `<rect y="330" width="${W}" height="${FY - 330}" fill="#FAFAF8"/>${Array.from({ length: 12 }, (_, i) => `<line x1="0" y1="${330 + i * 24}" x2="${W}" y2="${330 + i * 24}" stroke="#e3e3df" stroke-width="2"/>`).join("")}${Array.from({ length: 12 * 30 }, (_, i) => { const r = Math.floor(i / 30), c = i % 30; return `<line x1="${c * 50 + (r % 2) * 25}" y1="${330 + r * 24}" x2="${c * 50 + (r % 2) * 25}" y2="${354 + r * 24}" stroke="#e3e3df" stroke-width="2"/>`; }).join("")}<rect y="322" width="${W}" height="10" fill="#E8C9C4"/>`
      + `<rect x="358" y="150" width="184" height="210" rx="90" fill="#C8A064"/><rect x="370" y="162" width="160" height="186" rx="80" fill="#DDE8EE"/><path d="M400 200 l40 -20 M410 240 l70 -40" stroke="#fff" stroke-width="8" opacity=".6" stroke-linecap="round"/>`
      + A.windowBox(1120, 110, 170, 130, { frame: "#FBF7F0", sill: "#F4F1EA", panes: 1, cross: false })
      + `<rect x="1180" y="330" width="10" height="200" fill="#C8A064"/><rect x="1150" y="360" width="70" height="140" rx="8" fill="#93A8C4"/><rect x="1150" y="470" width="70" height="10" fill="#7f94b0"/>`
      + A.shelf(620, 260, 180, "#FBF7F0", `<path d="M650 260 q0 -30 16 -30 q16 0 16 30z" fill="#E2B04A"/><rect x="700" y="226" width="22" height="34" rx="5" fill="#93A8C4"/>`)
      + A.baseboard(W, "#E8C9C4") + A.floor(W, "tile", "#E9EEF0", "#D8E0E3", "#c5cfd3")
      + A.rug(880, 838, 150, 26, "#93A8C4", "#fff") + A.doorway("left", W, "#FBF7F0", "#4a3a30", "Bếp"),
    props: [
      { id: "sink", z: 708, svg: sink(380, 708) },
      { id: "tub", z: 726, svg: tub(660, 726) },
      { id: "litter", z: 806, svg: litter(1230, 806) },
    ],
    spots: {
      litter: { x: 1220, y: 810, h: 20, z: 806, face: -1, use: ["potty"] },
      tub: { x: 900, y: 730, h: 196, z: 726, face: 1, use: ["perch", "watch"] },
      sink: { x: 450, y: 714, h: 270, z: 708, face: -1, use: ["naughty", "loaf"] },
      mat: { x: 880, y: 818, h: 0, face: 1, use: ["groom", "loaf"] },
    },
    lights: [{ x: 450, y: 220, r: 260 }],
  },
  balcony: {
    vi: "Ban công", icon: "🌿", W: 1700, exits: { right: "bedroom" }, feat: "room.balcony",
    walk: { x0: 120, x1: 1500, y0: 700, y1: 822 },
    mood: "Gió & nắng", lines: ["Bướm kìa.", "Thành phố ồn quá."],
    bg: (W) => skyline(W) + A.glassDefs + A.doorDefs
      + `<g class="string-lights"><path d="M0 40 Q${W * 0.25} 110 ${W * 0.5} 50 Q${W * 0.75} 110 ${W} 40" stroke="#3b3330" stroke-width="3" fill="none"/>${Array.from({ length: 16 }, (_, i) => { const t = (i + 0.5) / 16, x = t * W, y = 40 + Math.sin(t * Math.PI * 2 - Math.PI / 2) * -30 + 40 - 30; return `<circle class="bulb" cx="${x}" cy="${y + 14}" r="8"/>`; }).join("")}</g>`
      + railing(W, 470) + A.floor(W, "deck", "#B98A62", "#9E7350", "#7a5638")
      + A.doorway("right", W, "#3E4A4F", "#5d6f78", "Phòng ngủ"),
    props: [
      { id: "bougain", z: 712, svg: A.plant(250, 712, 1.1, "#C9744B", "#4F7D5B", "bougainvillea") },
      { id: "fern", z: 700, svg: A.plant(560, 700, 0.8, "#E7DCCB", "#5E8C5A", "fern") },
      { id: "chair", z: 742, svg: chair(1120, 742) },
      { id: "flutter", z: 999, svg: butterflyHost },
    ],
    spots: {
      ledge: { x: 820, y: 700, h: 238, z: 690, face: 1, use: ["watch", "perch"] },
      chair: { x: 1230, y: 748, h: 150, z: 742, face: -1, use: ["nap", "loaf"] },
      plants: { x: 420, y: 760, h: 0, face: -1, use: ["hunt"] },
      sunny: { x: 860, y: 800, h: 0, face: 1, use: ["sunbathe", "nap", "roll"], day: true },
    },
    lights: [{ x: 850, y: 80, r: 700 }],
  },
};
export const ORDER = ["balcony", "bedroom", "living", "kitchen", "bathroom"];

/** đường đi giữa 2 phòng (danh sách các cửa phải qua) – nhà nối thành chuỗi nên BFS đơn giản */
export function route(from, to, allowed = () => true) {
  if (from === to) return [];
  const prev = { [from]: null }, q = [from];
  while (q.length) { const r = q.shift(); for (const [side, n] of Object.entries(ROOMS[r].exits)) { if (!allowed(n) || n in prev) continue; prev[n] = [r, side]; if (n === to) { const path = []; let c = n; while (prev[c]) { path.unshift({ room: prev[c][0], side: prev[c][1], to: c }); c = prev[c][0]; } return path; } q.push(n); } }
  return null;
}
