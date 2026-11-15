// GIỌNG AI (gói Pro, tuỳ chọn): mèo nói câu mới theo đúng chuyện đã xảy ra, dựa vào trí nhớ.
// Cần 1 Cloudflare Worker trung gian giữ khoá API (xem worker/ai-voice). Chưa cấu hình → luôn dùng câu có sẵn trong lines.js.
// Câu có sẵn hiện ngay; câu AI về trong < 3 giây thì thay vào – người chơi không bao giờ phải chờ.
import { AI, can } from "../config.js";

let last = 0;
export async function aiLine(game, situation, fallback) {
  if (!AI.endpoint || !can(game.save.plan, "ai.voice") || !game.save.settings.aiVoice) return null;
  if (Date.now() - last < AI.minGapMs) return null; last = Date.now();
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), AI.timeoutMs);
  try {
    const r = await fetch(AI.endpoint, {
      method: "POST", signal: ctl.signal, headers: { "content-type": "application/json" },
      body: JSON.stringify({
        cat: { name: game.cat.name, breed: game.cat.breed, voice: game.cat.voice || "", quirks: game.quirks.map((q) => q.vi) },
        today: { mood: game.today.mood.vi, moodDesc: game.today.mood.desc },
        memory: game.memory.summary(), situation, room: game.body.room, hour: new Date().getHours(), example: fallback,
      }),
    });
    if (!r.ok) return null; const j = await r.json(); return (j.text || "").trim().slice(0, 80) || null;
  } catch { return null; } finally { clearTimeout(tm); }
}
