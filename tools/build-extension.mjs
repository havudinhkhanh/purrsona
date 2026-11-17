// Sinh các file dùng chung cho tiện ích Chrome từ mã của app (chạy: node tools/build-extension.mjs).
//   extension/words.js  – từ trong các gói (tra nghĩa ngay trên trang, không cần mạng)
//   extension/scan.js   – bộ quét chữ, chép từ src/learn/scan.js
//   extension/poses.js  – dáng mèo chì (SVG tĩnh), xuất từ R.snapshot của app (tools/cat-poses.json)
import { readFileSync, writeFileSync } from "node:fs";
import { PACKS } from "../src/learn/packs.js";
import { allCards } from "../src/learn/packs.js";

const cards = [...allCards([]).values()].map((c) => [c.id, c.lang, c.w, c.ph || "", c.vi, c.pack, c.level]);
writeFileSync("extension/words.js", `// tự sinh từ src/learn/packs – đừng sửa tay\nglobalThis.PURR_WORDS = ${JSON.stringify(cards)};\n`);
const scan = readFileSync("src/learn/scan.js", "utf8").replace(/^export /gm, "");
writeFileSync("extension/scan.js", `// tự sinh từ src/learn/scan.js – đừng sửa tay\n${scan}\nglobalThis.PURR_SCAN = { buildIndex, scanText, forms };\n`);
const poses = JSON.parse(readFileSync("tools/cat-poses.json", "utf8"));
const keep = Object.fromEntries(["sit", "lie", "groom", "loaf"].filter((k) => poses[k]).map((k) => [k, poses[k].replace(/class="cat-snap"/, 'class="pc"')]));
writeFileSync("extension/poses.js", `// tự sinh từ tools/cat-poses.json – đừng sửa tay\nglobalThis.PURR_POSES = ${JSON.stringify(keep)};\n`);
console.log(`words ${cards.length} · poses ${Object.keys(keep).join(",")} · packs ${PACKS.length ?? Object.keys(PACKS).length}`);
