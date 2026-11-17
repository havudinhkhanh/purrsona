// KHO CHỮ TỰ LỚN: mỗi ngày việc chạy định kỳ ("nuôi kho chữ") viết thêm chữ + câu ví dụ + câu mèo vào data/lexicon/<ngày>.json,
// kiểm bằng tools/lexicon-check.mjs rồi đẩy lên. App mở lên tự nạp, chữ mới vào đúng cấp – người học không phải cập nhật gì.
import { addLexicon } from "./packs.js";
import { addLines } from "../cat/lines.js";

export async function loadLexicon(game) {
  try {
    const idx = await fetch("data/lexicon/index.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)); if (!idx?.files?.length) return 0;
    const files = idx.files.slice(-90), seen = (game.save.lexSeen ||= []);
    let added = 0, fresh = 0;
    for (const f of files) {
      const D = await fetch(`data/lexicon/${f}`, { cache: f === files.at(-1) ? "no-cache" : "default" }).then((r) => (r.ok ? r.json() : null)).catch(() => null); if (!D) continue;
      const n = addLexicon(D.add || []); addLines(D.lines || {}); added += n;
      if (!seen.includes(f)) { seen.push(f); fresh += (D.add || []).reduce((a, x) => a + (x.rows?.length || 0), 0); }
    }
    game.save.lexSeen = seen.slice(-120);
    if (added) { game.learn.L.today.d = game.learn.L.today.d === "" ? "" : game.learn.L.today.d; game.emit("lexicon", { added, fresh }); }
    return added;
  } catch { return 0; }
}
