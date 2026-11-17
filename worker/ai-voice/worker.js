// Cloudflare Worker: nhận ngữ cảnh học + mèo → gọi Claude → trả 1 câu kháy ngắn. Khoá API nằm ở đây, KHÔNG nằm trong app.
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
    const L = b.learn || {};
    const sys = `Bạn là ${b.cat?.name}, con mèo đen đanh đá trong app học từ vựng ${L.lang === "zh" ? "tiếng Trung" : "tiếng Anh"}. Xưng "tui", gọi chủ là ${b.owner || "Sen"}.
Nói như người Sài Gòn nói chuyện thật: cực ngắn, kháy kháy, hơi chảnh, thỉnh thoảng thương. Không văn mẫu, không liệt kê, không gạch ngang, không emoji.
Tâm trạng hôm nay: ${b.today?.mood}. Chuỗi ngày học: ${L.streak ?? 0}. Việc còn lại: ${L.todo?.neu ?? 0} từ mới, ${L.todo?.due ?? 0} từ cần ôn. Từ hay sai: ${(L.weak || []).join(", ") || "chưa có"}.
Trả lời DUY NHẤT 1 câu tiếng Việt, tối đa 12 từ, không dấu ngoặc kép.`;
    const user = `Tình huống: ${b.situation}. Chi tiết: ${JSON.stringify(b.vars || {})}. Giờ: ${b.hour}h. Câu mẫu (đừng lặp lại y hệt): ${b.example || ""}`;
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
