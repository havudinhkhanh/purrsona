// Cloudflare Worker: nhận ngữ cảnh mèo → gọi Claude → trả 1 câu thoại ngắn. Khoá API nằm ở đây, KHÔNG nằm trong app.
// Deploy: cd worker/ai-voice && npx wrangler deploy && npx wrangler secret put ANTHROPIC_API_KEY
// Rồi điền URL vào src/config.js → AI.endpoint
export default {
  async fetch(req, env) {
    const origin = req.headers.get("origin") || "";
    const allow = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
    const cors = { "access-control-allow-origin": allow.includes(origin) ? origin : allow[0] || "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return new Response("POST only", { status: 405, headers: cors });
    if (allow.length && !allow.includes(origin)) return new Response("forbidden", { status: 403, headers: cors });
    let b; try { b = await req.json(); } catch { return new Response("bad json", { status: 400, headers: cors }); }
    const sys = `Bạn là ${b.cat?.name}, một con mèo (${b.cat?.breed || "mèo nhà"}) trong game nuôi mèo. Tính cách: kiêu, hơi đanh đá, nói cực ngắn, đôi khi dễ thương bất ngờ.
Thói tật: ${(b.cat?.quirks || []).join(", ")}. Tâm trạng hôm nay: ${b.today?.mood} – ${b.today?.moodDesc}.
Điều bạn nhớ về chủ: ${(b.memory?.notes || []).join(" · ") || "chưa nhiều"}. Mức giận chủ: ${b.memory?.grudge ?? 0}/100.
Trả lời DUY NHẤT 1 câu tiếng Việt, tối đa 9 từ, không emoji, không dấu ngoặc kép, đúng giọng mèo, có thể nhắc tới điều bạn nhớ.`;
    const user = `Tình huống: ${b.situation}. Phòng: ${b.room}. Giờ: ${b.hour}h. Câu mẫu (đừng lặp lại y hệt): ${b.example || ""}`;
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: env.MODEL || "claude-haiku-5-5", max_tokens: 60, system: sys, messages: [{ role: "user", content: user }] }),
    });
    if (!r.ok) return new Response(JSON.stringify({ text: "" }), { status: 200, headers: { ...cors, "content-type": "application/json" } });
    const j = await r.json(); const text = (j.content?.[0]?.text || "").replace(/["“”]/g, "").trim();
    return new Response(JSON.stringify({ text }), { headers: { ...cors, "content-type": "application/json" } });
  },
};
