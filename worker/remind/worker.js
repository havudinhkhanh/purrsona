// MÈO NHẮC – Cloudflare Worker gửi Web Push đúng giờ người dùng chọn (kể cả khi đã đóng app).
// Tin push KHÔNG mang nội dung: máy người dùng tự soạn câu nhắc (sw.js). Worker chỉ lưu:
//   { sub (địa chỉ push của trình duyệt), giờ nhắc, múi giờ, hôm nay đã học chưa } – không tên, không chữ học.
// KV: SUBS. Secret: VAPID_PUBLIC (base64url, 65 byte), VAPID_PRIVATE_JWK (JSON). Tạo khoá: node tools/vapid-keys.mjs
const json = (o, s = 200, h = {}) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...h } });
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const enc = (o) => b64u(new TextEncoder().encode(JSON.stringify(o)));

function cors(req, env) {
  const o = req.headers.get("origin") || "", ok = (env.ALLOWED_ORIGINS || "").split(",").map((x) => x.trim()).includes(o);
  return ok ? { "access-control-allow-origin": o, "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type", vary: "origin" } : null;
}
async function vapidAuth(endpoint, env) {
  const aud = new URL(endpoint).origin, exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const key = await crypto.subtle.importKey("jwk", JSON.parse(env.VAPID_PRIVATE_JWK), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const head = enc({ typ: "JWT", alg: "ES256" }), body = enc({ aud, exp, sub: env.VAPID_SUBJECT || "https://purrsona.pages.dev" });
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(`${head}.${body}`));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${env.VAPID_PUBLIC}`;
}
async function sendPush(sub, env) {
  const r = await fetch(sub.endpoint, { method: "POST", headers: { authorization: await vapidAuth(sub.endpoint, env), ttl: "21600", urgency: "normal", "content-length": "0" } });
  return r.status;
}
// giờ địa phương theo múi giờ của người dùng
function local(tz) { const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz || "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map((x) => [x.type, x.value])); return { d: `${p.year}-${p.month}-${p.day}`, m: +p.hour * 60 + +p.minute }; }
// chỉ gửi tới máy chủ push thật của trình duyệt (chặn dùng Worker để gọi địa chỉ bất kỳ)
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /(^|\.)push\.apple\.com$/, /^updates\.push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/];
const okEndpoint = (u) => { try { const x = new URL(u); return x.protocol === "https:" && PUSH_HOSTS.some((re) => re.test(x.hostname)); } catch { return false; } };
// chỉ mục theo khung 15 phút giờ UTC: cron mỗi lượt chỉ đọc những người tới giờ (không quét hết)
function utcSlots(st) {
  const off = (() => { const d = new Date(), loc = new Date(d.toLocaleString("en-US", { timeZone: st.tz })), utc = new Date(d.toLocaleString("en-US", { timeZone: "UTC" })); return Math.round((loc - utc) / 60000); })();
  const all = [...st.times, ...(st.streakNag && st.streak ? ["21:30"] : [])];
  return [...new Set(all.map((t) => { const [h, m] = t.split(":").map(Number); let x = (h * 60 + m - off) % 1440; if (x < 0) x += 1440; x = Math.floor(x / 15) * 15; return String(Math.floor(x / 60)).padStart(2, "0") + String(x % 60).padStart(2, "0"); }))];
}
async function reindex(env, id, rec) {
  for (const q of rec.slots || []) await env.SUBS.delete(`q:${q}:${id}`);
  rec.slots = utcSlots(rec.state); for (const q of rec.slots) await env.SUBS.put(`q:${q}:${id}`, "1", { expirationTtl: 60 * 86400 });
}
const valid = (st) => st && Array.isArray(st.times) && st.times.length <= 4 && st.times.every((t) => /^\d{2}:\d{2}$/.test(t)) && typeof st.tz === "string" && st.tz.length < 60;

export default {
  async fetch(req, env) {
    const url = new URL(req.url), h = cors(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: h ? 204 : 403, headers: h || {} });
    if (url.pathname === "/vapid") return new Response(env.VAPID_PUBLIC || "", { headers: { "content-type": "text/plain", ...(h || {}) } });
    if (!h) return json({ error: "origin" }, 403);
    if (req.method !== "POST") return json({ error: "method" }, 405, h);
    let b; try { b = JSON.parse(await req.text()); } catch { return json({ error: "json" }, 400, h); }      // nhận text/plain (không preflight)
    const id = String(b.id || "").slice(0, 64); if (!/^[\w-]{8,64}$/.test(id)) return json({ error: "id" }, 400, h);
    if (url.pathname === "/subscribe") {
      if (!okEndpoint(b.sub?.endpoint) || !valid(b.state)) return json({ error: "bad" }, 400, h);
      const old = await env.SUBS.get(`u:${id}`, "json"), rec = { sub: { endpoint: b.sub.endpoint }, state: b.state, sent: {}, slots: old?.slots || [] };
      await reindex(env, id, rec); await env.SUBS.put(`u:${id}`, JSON.stringify(rec), { expirationTtl: 60 * 86400 });
      return json({ ok: 1 }, 200, h);
    }
    if (url.pathname === "/state") {
      const cur = await env.SUBS.get(`u:${id}`, "json"); if (!cur || !valid(b.state)) return json({ ok: 0 }, 200, h);
      const moved = JSON.stringify([cur.state.times, cur.state.tz, cur.state.streakNag, cur.state.streak]) !== JSON.stringify([b.state.times, b.state.tz, b.state.streakNag, b.state.streak]);
      cur.state = b.state; if (moved) await reindex(env, id, cur); await env.SUBS.put(`u:${id}`, JSON.stringify(cur), { expirationTtl: 60 * 86400 }); return json({ ok: 1 }, 200, h);
    }
    if (url.pathname === "/unsubscribe") { const cur = await env.SUBS.get(`u:${id}`, "json"); for (const q of cur?.slots || []) await env.SUBS.delete(`q:${q}:${id}`); await env.SUBS.delete(`u:${id}`); return json({ ok: 1 }, 200, h); }
    return json({ error: "path" }, 404, h);
  },
  // chạy mỗi 15 phút: chỉ đọc những người có giờ nhắc rơi vào khung 15 phút hiện tại (chỉ mục q:HHMM:id)
  async scheduled(ev, env, ctx) {
    const now = new Date(ev.scheduledTime || Date.now()), q = String(now.getUTCHours()).padStart(2, "0") + String(Math.floor(now.getUTCMinutes() / 15) * 15).padStart(2, "0");
    let cursor;
    do {
      const page = await env.SUBS.list({ prefix: `q:${q}:`, cursor }); cursor = page.list_complete ? null : page.cursor;
      for (const k of page.keys) ctx.waitUntil((async () => {
        const id = k.name.split(":")[2], rec = await env.SUBS.get(`u:${id}`, "json"); if (!rec) { await env.SUBS.delete(k.name); return; }
        const st = rec.state, L = local(st.tz), key = `${L.d} ${q}`;
        if ((st.d === L.d && st.studied) || rec.sent?.[key]) return;
        const status = await sendPush(rec.sub, env);
        if (status === 404 || status === 410) { for (const s of rec.slots || []) await env.SUBS.delete(`q:${s}:${id}`); await env.SUBS.delete(`u:${id}`); return; }
        rec.sent = { [key]: 1 }; await env.SUBS.put(`u:${id}`, JSON.stringify(rec), { expirationTtl: 60 * 86400 });
      })());
    } while (cursor);
  },
};
