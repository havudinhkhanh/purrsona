// Cloudflare Worker: đọc hộ link lịch iCal (.ics) vì máy chủ lịch không cho trình duyệt đọc trực tiếp (CORS).
// Chỉ cho phép các máy chủ lịch quen thuộc → không thành proxy mở. Không lưu gì.
// Deploy: cd worker/cal-proxy && npx wrangler deploy → dán URL vào src/config.js → CAL.proxy
const HOSTS = [/\.icloud\.com$/, /^calendar\.google\.com$/, /^outlook\.(office365|live|office)\.com$/, /\.calendar\.yahoo\.com$/, /^p\d+-caldav\.icloud\.com$/];
export default {
  async fetch(req, env) {
    const origin = req.headers.get("origin") || "", allow = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
    const cors = { "access-control-allow-origin": allow.includes(origin) ? origin : allow[0] || "*", "access-control-allow-methods": "GET", "cache-control": "private, max-age=300" };
    if (allow.length && origin && !allow.includes(origin)) return new Response("forbidden", { status: 403, headers: cors });
    const u = new URL(req.url).searchParams.get("url"); let t;
    try { t = new URL(u.replace(/^webcal:/i, "https:")); } catch { return new Response("bad url", { status: 400, headers: cors }); }
    if (t.protocol !== "https:" || !HOSTS.some((h) => h.test(t.hostname))) return new Response("host not allowed", { status: 403, headers: cors });
    const r = await fetch(t.toString(), { headers: { accept: "text/calendar" }, cf: { cacheTtl: 300 } });
    const body = await r.text();
    if (!body.includes("BEGIN:VCALENDAR")) return new Response("not a calendar", { status: 422, headers: cors });
    return new Response(body.slice(0, 2_000_000), { headers: { ...cors, "content-type": "text/calendar; charset=utf-8" } });
  },
};
