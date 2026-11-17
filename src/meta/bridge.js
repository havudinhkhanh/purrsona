// CẦU NỐI: (1) Chia sẻ từ điện thoại (Web Share Target: ?title&text&url) → mở "Đọc cùng mèo".
// (2) Tiện ích Chrome Purrsona: khi mở app, tiện ích gửi các từ đã lưu trên web sang,
//     app trả lại danh sách từ đã học để tiện ích gạch dưới đúng chữ. Chỉ nhận tin trong cùng trang.
import { save } from "../core/store.js";
import { MASTER } from "../learn/srs.js";

const clip = (x, n) => String(x ?? "").slice(0, n);

export function connectBridge(game) {
  const s = game.save, learn = game.learn;
  // (1) chia sẻ vào app
  const qs = new URLSearchParams(location.search);
  if (qs.has("text") || qs.has("url") || qs.has("title")) {
    const text = [qs.get("title"), qs.get("text")].filter(Boolean).join("\n"), url = qs.get("url") || (text.match(/https?:\/\/\S+/) || [""])[0];
    history.replaceState(null, "", location.pathname);
    setTimeout(() => { game.readText?.(text.replace(url, "").trim() || text); if (url) s.lastShared = clip(url, 300); }, 900);
  }
  // (2) tiện ích Chrome
  // gửi tiện ích: mọi từ đã gặp (cả 2 thứ tiếng) + từ trong sổ – để gạch dưới đúng và không mời lưu lại
  const known = () => { const ids = new Set([...Object.keys(s.learn.cards).filter((id) => s.learn.cards[id].seen), ...s.learn.book.map((b) => b.id)]);
    return [...ids].slice(0, 5000).map((id) => learn.card(id)).filter(Boolean).map((c) => ({ id: c.id, w: c.w, lang: c.lang, vi: c.vi || "", ph: c.ph || "", m: (learn.stat(c.id)?.box || 0) >= MASTER ? 1 : 0 })); };
  const reply = (type, extra) => window.postMessage({ src: "purrsona-app", type, ...extra }, location.origin);
  window.addEventListener("message", (e) => {
    if (e.source !== window || e.origin !== location.origin) return;
    const d = e.data; if (!d || d.src !== "purrsona-ext") return;
    if (d.type === "hello") return reply("known", { words: known(), book: s.learn.book.length, plan: s.plan });
    if (d.type === "book" && Array.isArray(d.items)) {
      let n = 0, full = false; const done = [];
      for (const it of d.items.slice(0, 200)) {
        const r = learn.bookmark({ id: it.id && learn.card(it.id) ? it.id : undefined, w: clip(it.w, 40), lang: it.lang === "zh" ? "zh" : "en", vi: clip(it.vi, 80), ctx: clip(it.ctx, 200), url: clip(it.url, 300), src: "ext" }, s.plan);
        if (r.full) { full = true; break; } if (r.ok) { done.push(it.key); if (!r.dup) n++; }
      }
      save(s); reply("ack", { keys: done, full, words: known() });
      if (n) setTimeout(() => game.wall?.whisper(`Tiện ích nhét ${n} chữ vô sổ.`), 400);
    }
  });
  reply("ready", {});
}
