// In số chữ từng cấp (gói gốc + kho mở rộng) để việc nuôi kho chữ biết cấp nào đang mỏng.
// Chạy: node tools/lexicon-stats.mjs   (thêm --json để in JSON)
import { readFileSync, readdirSync } from "node:fs";
import { PACKS, LEVEL_TAG, LADDERS, addLexicon } from "../src/learn/packs.js";
for (const f of readdirSync("data/lexicon").filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()) addLexicon(JSON.parse(readFileSync(`data/lexicon/${f}`, "utf8")).add || []);
const rows = []; for (const p of PACKS) for (const l of p.levels) rows.push({ key: `${p.id}/${l.id}`, lang: p.lang, tag: LEVEL_TAG[`${p.id}/${l.id}`] || l.vi, tier: l.tier || p.tier, n: l.words.length, ladder: Object.values(LADDERS).flat(2).includes(`${p.id}/${l.id}`) });
if (process.argv.includes("--json")) console.log(JSON.stringify(rows)); else for (const r of rows) console.log(`${r.lang}  ${r.key.padEnd(22)} ${String(r.n).padStart(4)}  ${r.tag}${r.ladder ? "  (lộ trình)" : ""}  [${r.tier}]`);
