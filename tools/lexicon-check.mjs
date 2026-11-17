// Kiểm một mẻ chữ mới cho kho mở rộng rồi cập nhật data/lexicon/index.json.
// Chạy: node tools/lexicon-check.mjs data/lexicon/2026-11-18.json
// Mẻ chữ: { d, note, add: [{ pack, level, rows: [[...], ...] }], lines: { khoá: ["câu", ...] } }
// · en: [chữ, phiên âm IPA, từ loại, nghĩa Việt, câu ví dụ Anh, dịch câu]  · zh/ja: [chữ, đọc (pinyin / "kana · romaji"), từ loại, nghĩa, câu, đọc câu, dịch câu]
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { PACKS, LEVEL_TAG } from "../src/learn/packs.js";

const file = process.argv[2]; if (!file) { console.error("Thiếu đường dẫn mẻ chữ"); process.exit(1); }
const D = JSON.parse(readFileSync(file, "utf8")), err = [], warn = [];
if (!/^\d{4}-\d{2}-\d{2}$/.test(D.d) || !file.endsWith(`${D.d}.json`)) err.push("d phải là YYYY-MM-DD và khớp tên file");
// chữ đã có: trong gói + mọi mẻ trước
const have = new Set(); for (const p of PACKS) for (const l of p.levels) for (const r of l.words) have.add(`${p.lang}:${r[0]}`);
for (const f of readdirSync("data/lexicon").filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f) && f !== `${D.d}.json`)) for (const it of JSON.parse(readFileSync(`data/lexicon/${f}`, "utf8")).add || []) { const p = PACKS.find((x) => x.id === it.pack); for (const r of it.rows || []) have.add(`${p?.lang}:${r[0]}`); }
// câu mèo: chỉ kháy chuyện lười, né, quên, lướt – không chê đầu óc, ngoại hình, tiền bạc, con người
const BAD = /(ngu|đần|dốt|óc chó|đầu rỗng|xấu xí|béo|mập|nghèo|vô dụng|đồ ăn hại|mày|câm|cút)/i;
let total = 0; const seen = new Set();
for (const it of D.add || []) {
  const p = PACKS.find((x) => x.id === it.pack), l = p?.levels.find((x) => x.id === it.level), at = `${it.pack}/${it.level}`;
  if (!l) { err.push(`${at}: không có gói/cấp này`); continue; }
  const size = p.lang === "en" ? 6 : 7;
  for (const [i, r] of (it.rows || []).entries()) {
    const k = `${p.lang}:${r?.[0]}`, w = `${at} #${i + 1} ${r?.[0]}`; total++;
    if (!Array.isArray(r) || r.length !== size || r.some((x) => typeof x !== "string" || !x.trim())) { err.push(`${w}: cần ${size} ô chữ, không trống`); continue; }
    if (r.some((x) => x.length > 220)) err.push(`${w}: ô quá dài`);
    if (have.has(k) || seen.has(k)) err.push(`${w}: trùng chữ đã có`); seen.add(k);
    const ex = r[4];
    if (p.lang === "en" && !ex.toLowerCase().includes(r[0].toLowerCase().split(/[ -]/)[0].slice(0, 4))) warn.push(`${w}: câu ví dụ không thấy chữ`);
    if (p.lang !== "en" && !ex.includes(r[0].slice(0, 2))) warn.push(`${w}: câu ví dụ không chứa chữ`);
    if (p.lang === "en" && !/^\/.*\/$/.test(r[1])) err.push(`${w}: phiên âm phải dạng /…/`);
    if (p.lang === "ja" && !/[a-zāīūēō]/i.test(r[1])) err.push(`${w}: cách đọc tiếng Nhật cần có romaji`);
    if (p.lang === "zh" && !/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(r[1] + r[5])) warn.push(`${w}: pinyin không có dấu thanh?`);
    if (BAD.test(r[3] + r[5] + r[6])) err.push(`${w}: có từ xúc phạm`);
  }
}
let nl = 0;
for (const [k, arr] of Object.entries(D.lines || {})) for (const x of arr || []) { nl++; if (typeof x !== "string" || x.length > 90) err.push(`câu mèo "${k}": ≤ 90 ký tự`); if (BAD.test(x)) err.push(`câu mèo "${x}": vi phạm luật kháy`); }
if (total < 6 || total > 80) err.push(`mỗi mẻ 6–80 chữ (đang có ${total})`);
for (const w of warn) console.warn("⚠", w);
if (err.length) { for (const e of err) console.error("✗", e); process.exit(1); }
const files = readdirSync("data/lexicon").filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
writeFileSync("data/lexicon/index.json", JSON.stringify({ files, updated: D.d, total: files.length }, null, 0) + "\n");
console.log(`✓ ${D.d}: ${total} chữ, ${nl} câu mèo · kho có ${files.length} mẻ`);
console.log("Cấp đã có:", Object.values(LEVEL_TAG).join(", "));
