// KHO TỪ: nạp các gói, chuẩn hoá về 1 dạng thẻ. Thêm gói mới = thêm 1 file trong packs/ + 1 dòng ở PACKS.
// Gói tự nhập (CSV, gói Pro) lưu trong save.learn.custom và dùng chung dạng thẻ.
import enCore from "./packs/en-core.js";
import zhCore from "./packs/zh-core.js";
import enBiz from "./packs/en-business.js";
import enScene from "./packs/en-scene.js";
import zhScene from "./packs/zh-scene.js";
import enVibe from "./packs/en-vibe.js";
import zhVibe from "./packs/zh-vibe.js";
import enDeep from "./packs/en-deep.js";
import zhDeep from "./packs/zh-deep.js";

export const PACKS = [enCore, zhCore, enBiz, enScene, zhScene, enVibe, zhVibe, enDeep, zhDeep];
export const LANGS = {
  en: { vi: "Tiếng Anh", short: "EN", flag: "Aa", tts: "en-GB", hint: "phiên âm" },
  zh: { vi: "Tiếng Trung", short: "中", flag: "中", tts: "zh-CN", hint: "pinyin" },
};

/** thẻ chuẩn: { id, lang, pack, level, w, ph, pos, vi, ex, exPh, exVi } */
function card(pack, level, row) {
  if (pack.lang === "zh") { const [w, ph, pos, vi, ex, exPh, exVi] = row; return { id: `zh:${w}`, lang: "zh", pack: pack.id, level: level.id, w, ph, pos, vi, ex, exPh, exVi }; }
  const [w, ph, pos, vi, ex, exVi] = row; return { id: `${pack.lang}:${w}`, lang: pack.lang, pack: pack.id, level: level.id, w, ph, pos, vi, ex, exPh: "", exVi };
}
let ALL = null; const MIX = { ref: null, n: -1, v: -1, m: null };      // bộ nhớ đệm khi có từ riêng
/** từ lưu từ web/đọc ké nằm trong custom với pack "book": không phải danh sách tự nhập (CSV) */
const imported = (custom) => custom.filter((c) => c.pack !== "book" && c.pack !== "trend" && c.vi);
export function allCards(custom = []) {
  if (!ALL) { ALL = new Map(); for (const p of PACKS) for (const l of p.levels) for (const r of l.words) { const c = card(p, l, r); if (!ALL.has(c.id)) ALL.set(c.id, c); } }
  if (!custom.length) return ALL;
  if (MIX.ref === custom && MIX.n === custom.length && MIX.v === custom.reduce((a, c) => a + (c.vi || "").length, 0)) return MIX.m;
  const m = new Map(ALL); for (const c of custom) m.set(c.id, c);
  Object.assign(MIX, { ref: custom, n: custom.length, v: custom.reduce((a, c) => a + (c.vi || "").length, 0), m }); return m;
}
/** các cấp độ của một ngôn ngữ (kèm gói tự nhập) */
export function levelsOf(lang, custom = []) {
  const out = [];
  for (const p of PACKS) if (p.lang === lang) for (const l of p.levels) out.push({ key: `${p.id}/${l.id}`, pack: p, level: l, tier: l.tier || p.tier, n: l.words.length, vi: l.vi });
  const mine = imported(custom).filter((c) => c.lang === lang);
  if (mine.length) out.push({ key: "custom/mine", pack: { id: "custom", vi: "Từ của tôi" }, level: { id: "mine" }, tier: "pro", n: mine.length, vi: "Danh sách tự nhập" });
  return out;
}
export function cardsOfLevel(key, custom = []) {
  if (key === "custom/mine") return imported(custom);
  const [pid, lid] = key.split("/"), p = PACKS.find((x) => x.id === pid), l = p?.levels.find((x) => x.id === lid);
  return l ? l.words.map((r) => card(p, l, r)) : [];
}

/** đọc CSV (Pro): mỗi dòng "từ, phiên âm, nghĩa, ví dụ, dịch ví dụ" – dấu phẩy trong ô thì bọc "…" */
export function parseCsv(text, lang) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; continue; }
    if (ch === '"') q = true; else if (ch === "," || ch === "\t" || ch === ";") { row.push(cell.trim()); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (cell || row.length) { row.push(cell.trim()); rows.push(row); } row = []; cell = ""; if (ch === "\r" && text[i + 1] === "\n") i++; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows.filter((r) => r[0] && r[2] && !/^(word|từ|tu)$/i.test(r[0])).slice(0, 2000)
    .map(([w, ph = "", vi = "", ex = "", exVi = ""]) => ({ id: `${lang}:my:${w}`, lang, pack: "custom", level: "mine", w, ph, pos: "", vi, ex, exPh: "", exVi }));
}
