// Kiểm tra file chữ nóng của một ngày rồi xuất latest.json + index.json cho app.
// Chạy: node tools/trend-check.mjs data/trends/2026-11-17.json
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { allCards } from "../src/learn/packs.js";

const TAGS = ["kinh tế", "công nghệ", "thế giới", "xã hội", "giải trí", "thể thao", "mạng xã hội", "sức khoẻ", "giáo dục"];
const LEVELS = ["A2", "B1", "B2", "C1", "C2", "slang", "HSK1", "HSK2", "HSK3", "HSK4", "HSK5", "HSK6"];
const file = process.argv[2]; if (!file) { console.error("Thiếu đường dẫn file ngày"); process.exit(1); }
const D = JSON.parse(readFileSync(file, "utf8")), err = [], warn = [];
if (!/^\d{4}-\d{2}-\d{2}$/.test(D.d) || !file.endsWith(`${D.d}.json`)) err.push("d phải là YYYY-MM-DD và khớp tên file");
if (!Array.isArray(D.words) || D.words.length < 4 || D.words.length > 14) err.push("cần 4–14 chữ");
// không lặp lại chữ đã đăng trong 30 ngày
const past = new Set(); for (const f of readdirSync("data/trends").filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f) && f < `${D.d}.json`).sort().slice(-30)) for (const x of JSON.parse(readFileSync(`data/trends/${f}`, "utf8")).words) past.add(`${x.lang}:${x.w.toLowerCase()}`);
const seen = new Set(), pack = allCards();
for (const [i, x] of (D.words || []).entries()) {
  const at = `#${i + 1} ${x.w}`, k = `${x.lang}:${String(x.w).toLowerCase()}`;
  if (!["en", "zh"].includes(x.lang)) err.push(`${at}: lang phải là en/zh`);
  for (const f of ["w", "ph", "pos", "vi", "ex", "exVi", "why", "tag", "level"]) if (!x[f] || typeof x[f] !== "string") err.push(`${at}: thiếu ${f}`);
  if (x.lang === "zh" && !x.exPh) err.push(`${at}: chữ Hán cần exPh (pinyin câu ví dụ)`);
  if (String(x.w).length > 40 || String(x.vi).length > 90 || String(x.ex).length > 160 || String(x.why).length > 140) err.push(`${at}: quá dài (w≤40, vi≤90, ex≤160, why≤140)`);
  if (!TAGS.includes(x.tag)) err.push(`${at}: tag "${x.tag}" không thuộc ${TAGS.join(", ")}`);
  if (!LEVELS.includes(x.level)) err.push(`${at}: level "${x.level}" không hợp lệ`);
  if (!Array.isArray(x.src) || !x.src.length || x.src.some((s) => !s.t || !/^https:\/\//.test(s.u || ""))) err.push(`${at}: cần src [{t, u https}]`);
  if (x.lang === "en" && x.ex && !x.ex.toLowerCase().includes(String(x.w).toLowerCase().split(" ")[0].slice(0, 5))) warn.push(`${at}: câu ví dụ không chứa chữ`);
  if (x.lang === "zh" && x.ex && !x.ex.includes(x.w)) err.push(`${at}: câu ví dụ phải chứa ${x.w}`);
  if (seen.has(k)) err.push(`${at}: trùng trong ngày`); seen.add(k);
  if (past.has(k)) err.push(`${at}: đã đăng trong 30 ngày qua`);
  if (pack.has(k)) warn.push(`${at}: đã có trong gói từ – app sẽ dùng thẻ của gói`);
}
const en = D.words.filter((x) => x.lang === "en").length, zh = D.words.length - en;
if (en < 2 || zh < 2) err.push(`cần ít nhất 2 chữ mỗi thứ tiếng (đang có en ${en}, zh ${zh})`);
warn.forEach((w) => console.warn("⚠", w));
if (err.length) { err.forEach((e) => console.error("✗", e)); process.exit(1); }
// xuất: latest = ngày mới nhất; index = 60 ngày gần nhất
const days = readdirSync("data/trends").filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map((f) => f.slice(0, 10)).sort().reverse();
writeFileSync("data/trends/latest.json", readFileSync(`data/trends/${days[0]}.json`, "utf8"));
writeFileSync("data/trends/index.json", JSON.stringify({ latest: days[0], days: days.slice(0, 60) }, null, 1) + "\n");
console.log(`✓ ${D.d}: ${en} chữ Anh, ${zh} chữ Trung. latest = ${days[0]}`);
