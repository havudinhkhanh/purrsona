// PURRSONA API – Cloudflare Worker + D1.
// Đăng nhập bằng mã 6 số gửi email (không mật khẩu) · đồng bộ tiến độ giữa các máy · gói (free/plus/pro) do máy chủ quyết
// · trang quản trị (thống kê, người dùng, thông báo chung, nhật ký). Secret: PEPPER (chuỗi ngẫu nhiên để băm mã & phiên).
const DAY = 86400e3, CODE_TTL = 10 * 60e3, SESSION_TTL = 60 * DAY, MAX_SAVE = 600_000;
const PLANS = ["free", "plus", "pro"], ROLES = ["user", "admin"];

const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const sha = async (s) => b64u(await crypto.subtle.digest("SHA-256", enc.encode(s)));
const now = () => Date.now();
// DEV_ECHO_CODE chỉ có hiệu lực khi chạy trên máy (wrangler dev); lỡ bật trên máy chủ thật cũng không lộ mã
const isLocal = (req) => /^(localhost|127\.0\.0\.1)$/.test(new URL(req.url).hostname);
const normEmail = (e) => String(e || "").trim().toLowerCase().slice(0, 120);
const okEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, n);

function cors(req, env) {
  const o = req.headers.get("origin") || "", ok = (env.ALLOWED_ORIGINS || "").split(",").map((x) => x.trim()).filter(Boolean).includes(o);
  return ok ? { "access-control-allow-origin": o, "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS", "access-control-allow-headers": "authorization,content-type", "access-control-max-age": "86400", vary: "origin" } : {};
}
const J = (h) => (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...h } });

// giới hạn số lần (chống spam gửi mã, dò mã)
async function limit(env, key, max, windowMs) {
  const t = now(), r = await env.DB.prepare("SELECT n, reset FROM ratelimit WHERE k=?").bind(key).first();
  if (!r || r.reset < t) { await env.DB.prepare("INSERT OR REPLACE INTO ratelimit (k,n,reset) VALUES (?,1,?)").bind(key, t + windowMs).run(); return true; }
  if (r.n >= max) return false;
  await env.DB.prepare("UPDATE ratelimit SET n=n+1 WHERE k=?").bind(key).run(); return true;
}
const audit = (env, actor, action, target, detail) => env.DB.prepare("INSERT INTO audit (actor,action,target,detail,at) VALUES (?,?,?,?,?)").bind(actor, action, target || null, detail ? JSON.stringify(detail).slice(0, 2000) : null, now()).run();
const pub = (u) => ({ id: u.id, email: u.email, nick: u.nick, plan: u.plan_until && u.plan_until < now() ? "free" : u.plan, plan_until: u.plan_until, role: u.role, created_at: u.created_at });

async function sendCode(env, email, code) {
  const text = `Mã đăng nhập Purrsona: ${code}\n\nMã dùng được 10 phút. Không phải bạn yêu cầu thì bỏ qua email này.\n\n– na (con mèo)`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:auto;padding:24px;border:1.6px solid #262626;border-radius:20px;background:#FBFAF6;color:#1f1f1f">
    <p style="margin:0 0 6px;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#545454">Purrsona</p>
    <p style="margin:0 0 14px;font-size:16px">Mã đăng nhập của bạn:</p>
    <p style="margin:0 0 14px;font-size:34px;letter-spacing:8px;font-weight:700">${code}</p>
    <p style="margin:0;font-size:13px;color:#545454">Dùng được 10 phút. Không phải bạn yêu cầu thì bỏ qua email này.<br>– na</p></div>`;
  await env.EMAIL.send({ to: email, from: { email: env.MAIL_FROM, name: env.MAIL_NAME || "Purrsona" }, subject: `${code} là mã đăng nhập Purrsona`, text, html });
}

async function auth(req, env) {
  const tok = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""); if (tok.length < 20) return null;
  const s = await env.DB.prepare("SELECT s.user_id, s.expires, u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.hash=?").bind(await sha(tok + env.PEPPER)).first();
  if (!s || s.expires < now() || s.banned) return null;
  if (!s.last_seen || now() - s.last_seen > 10 * 60e3) await env.DB.prepare("UPDATE users SET last_seen=? WHERE id=?").bind(now(), s.id).run();
  return s;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), H = cors(req, env), json = J(H), p = url.pathname, m = req.method;
    if (m === "OPTIONS") return new Response(null, { status: Object.keys(H).length ? 204 : 403, headers: H });
    if (!Object.keys(H).length && p !== "/health") return json({ error: "origin" }, 403);
    if (!env.PEPPER) return json({ error: "server_not_configured" }, 500);
    const body = async () => { try { return JSON.parse((await req.text()) || "{}"); } catch { return {}; } };
    const ip = req.headers.get("cf-connecting-ip") || "local";
    try {
      if (p === "/health") return json({ ok: 1 });

      // ---------------------------------------------------------------- ĐĂNG NHẬP
      if (p === "/auth/start" && m === "POST") {
        const email = normEmail((await body()).email); if (!okEmail(email)) return json({ error: "email" }, 400);
        if (!(await limit(env, `ip:${ip}`, 20, 3600e3)) || !(await limit(env, `em:${email}`, 4, 15 * 60e3))) return json({ error: "slow_down" }, 429);
        const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1e6).padStart(6, "0");
        // mã mới thay mã cũ nhưng giữ số lần đoán sai trong cửa sổ 15 phút (không reset để né giới hạn)
        await env.DB.prepare("INSERT INTO codes (email,hash,expires,tries,sent_at) VALUES (?,?,?,0,?) ON CONFLICT(email) DO UPDATE SET hash=excluded.hash, expires=excluded.expires, tries=CASE WHEN codes.sent_at>? THEN codes.tries ELSE 0 END, sent_at=excluded.sent_at").bind(email, await sha(`${email}:${code}:${env.PEPPER}`), now() + CODE_TTL, now(), now() - 15 * 60e3).run();
        if (env.DEV_ECHO_CODE === "1" && isLocal(req)) return json({ ok: 1, dev_code: code });
        await sendCode(env, email, code);
        return json({ ok: 1 });
      }
      if (p === "/auth/verify" && m === "POST") {
        const b = await body(), email = normEmail(b.email), code = String(b.code || "").replace(/\D/g, "");
        if (!okEmail(email) || code.length !== 6) return json({ error: "bad" }, 400);
        if (!(await limit(env, `vf:${ip}`, 30, 3600e3))) return json({ error: "slow_down" }, 429);
        // giữ 1 lượt đoán trước khi so mã (nguyên tử) → gửi song song cũng không vượt 5 lần
        const c = await env.DB.prepare("UPDATE codes SET tries=tries+1 WHERE email=? AND tries<5 AND expires>? RETURNING hash, tries").bind(email, now()).first();
        if (!c) { const x = await env.DB.prepare("SELECT tries, expires FROM codes WHERE email=?").bind(email).first(); return json({ error: x && x.tries >= 5 && x.expires > now() ? "too_many" : "expired" }, 400); }
        if (c.hash !== (await sha(`${email}:${code}:${env.PEPPER}`))) return json({ error: "wrong", left: Math.max(0, 5 - c.tries) }, 400);
        const del = await env.DB.prepare("DELETE FROM codes WHERE email=? AND hash=?").bind(email, c.hash).run();
        if (!del.meta?.changes) return json({ error: "expired" }, 400);      // mã đã được dùng bởi yêu cầu khác
        let u = await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(email).first();
        const admin = (env.ADMIN_EMAILS || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean).includes(email);
        if (!u) { u = { id: crypto.randomUUID(), email, nick: clean(b.nick, 16) || null, plan: "free", role: admin ? "admin" : "user", created_at: now() }; await env.DB.prepare("INSERT INTO users (id,email,nick,plan,role,created_at,last_seen) VALUES (?,?,?,?,?,?,?)").bind(u.id, email, u.nick, u.plan, u.role, u.created_at, now()).run(); await audit(env, u.id, "signup", u.id); }
        else if (admin && u.role !== "admin") { await env.DB.prepare("UPDATE users SET role='admin' WHERE id=?").bind(u.id).run(); u.role = "admin"; }
        if (u.banned) return json({ error: "banned" }, 403);
        const tok = b64u(crypto.getRandomValues(new Uint8Array(32)));
        await env.DB.prepare("INSERT INTO sessions (hash,user_id,created_at,expires,ua) VALUES (?,?,?,?,?)").bind(await sha(tok + env.PEPPER), u.id, now(), now() + SESSION_TTL, clean(req.headers.get("user-agent"), 160)).run();
        return json({ token: tok, user: pub(u) });
      }
      if (p === "/announce" && m === "GET") {
        const r = await env.DB.prepare("SELECT id,text,ends,audience FROM announcements WHERE starts<=? AND ends>=? ORDER BY id DESC LIMIT 3").bind(now(), now()).all();
        return json({ items: r.results });
      }

      // ---------------------------------------------------------------- CẦN ĐĂNG NHẬP
      const me = await auth(req, env); if (!me) return json({ error: "auth" }, 401);
      if (p === "/auth/logout" && m === "POST") { await env.DB.prepare("DELETE FROM sessions WHERE hash=?").bind(await sha((req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "") + env.PEPPER)).run(); return json({ ok: 1 }); }
      if (p === "/me" && m === "GET") return json({ user: pub(me) });
      if (p === "/me" && m === "PATCH") { const b = await body(); await env.DB.prepare("UPDATE users SET nick=? WHERE id=?").bind(clean(b.nick, 16) || null, me.id).run(); return json({ ok: 1 }); }
      if (p === "/me" && m === "DELETE") { await env.DB.batch(["DELETE FROM saves WHERE user_id=?", "DELETE FROM sessions WHERE user_id=?", "DELETE FROM users WHERE id=?"].map((q) => env.DB.prepare(q).bind(me.id))); await audit(env, me.id, "delete_self", me.id); return json({ ok: 1 }); }
      // đồng bộ: rev tăng dần; lệch rev → 409 kèm bản trên máy chủ để máy khách gộp
      if (p === "/sync" && m === "GET") { const r = await env.DB.prepare("SELECT data,rev,updated_at FROM saves WHERE user_id=?").bind(me.id).first(); return json(r ? { data: JSON.parse(r.data), rev: r.rev, updated_at: r.updated_at } : { data: null, rev: 0 }); }
      if (p === "/sync" && m === "PUT") {
        const raw = await req.text(); if (raw.length > MAX_SAVE) return json({ error: "too_big" }, 413);
        let b; try { b = JSON.parse(raw); } catch { return json({ error: "json" }, 400); }
        if (!b || typeof b.data !== "object" || b.data === null) return json({ error: "data" }, 400);
        const base = Math.max(0, b.rev | 0), rev = base + 1, S = b.summary || {}, data = JSON.stringify(b.data);
        // ghi có điều kiện: chỉ thắng khi rev máy khách đúng bằng rev hiện tại (2 máy cùng lúc thì 1 máy nhận 409)
        const w = base === 0
          ? await env.DB.prepare("INSERT INTO saves (user_id,data,rev,updated_at) VALUES (?,?,1,?) ON CONFLICT(user_id) DO NOTHING").bind(me.id, data, now()).run()
          : await env.DB.prepare("UPDATE saves SET data=?, rev=?, updated_at=? WHERE user_id=? AND rev=?").bind(data, rev, now(), me.id, base).run();
        if (!w.meta?.changes) { const cur = await env.DB.prepare("SELECT rev,data,updated_at FROM saves WHERE user_id=?").bind(me.id).first(); return json({ error: "conflict", data: cur ? JSON.parse(cur.data) : null, rev: cur?.rev || 0, updated_at: cur?.updated_at }, 409); }
        await env.DB.prepare("UPDATE users SET lang=?, streak=?, mastered=?, vibe=? WHERE id=?").bind(clean(S.lang, 4), Math.max(0, S.streak | 0), Math.max(0, S.mastered | 0), clean(S.vibe, 16), me.id).run();
        return json({ ok: 1, rev });
      }

      // ---------------------------------------------------------------- QUẢN TRỊ
      if (p.startsWith("/admin/")) {
        if (me.role !== "admin") return json({ error: "forbidden" }, 403);
        if (p === "/admin/stats") {
          const t = now(), one = async (q, ...a) => (await env.DB.prepare(q).bind(...a).first()) || {};
          const [all, d1, d7, d30, plans, langs, signups, vibes] = await Promise.all([
            one("SELECT COUNT(*) n FROM users"), one("SELECT COUNT(*) n FROM users WHERE last_seen>?", t - DAY), one("SELECT COUNT(*) n FROM users WHERE last_seen>?", t - 7 * DAY), one("SELECT COUNT(*) n FROM users WHERE last_seen>?", t - 30 * DAY),
            env.DB.prepare("SELECT CASE WHEN plan_until IS NOT NULL AND plan_until<? THEN 'free' ELSE plan END plan, COUNT(*) n FROM users GROUP BY 1").bind(t).all(), env.DB.prepare("SELECT lang, COUNT(*) n FROM users GROUP BY lang").all(),
            env.DB.prepare("SELECT strftime('%Y-%m-%d', created_at/1000, 'unixepoch', '+7 hours') d, COUNT(*) n FROM users WHERE created_at>? GROUP BY d ORDER BY d").bind(t - 30 * DAY).all(),
            env.DB.prepare("SELECT vibe, COUNT(*) n FROM users GROUP BY vibe").all(),
          ]);
          const streak = await one("SELECT AVG(streak) a, MAX(streak) m, AVG(mastered) am FROM users WHERE last_seen>?", t - 7 * DAY);
          return json({ users: all.n, dau: d1.n, wau: d7.n, mau: d30.n, plans: plans.results, langs: langs.results, vibes: vibes.results, signups: signups.results, streak });
        }
        if (p === "/admin/users" && m === "GET") {
          const q = `%${clean(url.searchParams.get("q"), 80)}%`, off = Math.min(1e6, Math.max(0, Math.floor(+url.searchParams.get("offset") || 0))), plan = url.searchParams.get("plan");
          const r = await env.DB.prepare(`SELECT id,email,nick,plan,plan_until,role,banned,created_at,last_seen,lang,streak,mastered,vibe FROM users WHERE (email LIKE ? OR IFNULL(nick,'') LIKE ?) ${PLANS.includes(plan) ? "AND plan=?" : ""} ORDER BY created_at DESC LIMIT 50 OFFSET ?`).bind(...[q, q, ...(PLANS.includes(plan) ? [plan] : []), off]).all();
          return json({ items: r.results });
        }
        const um = p.match(/^\/admin\/users\/([\w-]{8,64})$/);
        if (um && m === "PATCH") {
          const b = await body(), sets = [], vals = [];
          const self = um[1] === me.id;
          if ((b.role !== undefined || b.banned !== undefined) && self) return json({ error: "self" }, 400);      // không tự hạ quyền / tự khoá
          if (PLANS.includes(b.plan)) { sets.push("plan=?"); vals.push(b.plan); }
          if ("plan_until" in b) { const pu = b.plan_until === null ? null : Number(b.plan_until); if (pu !== null && !Number.isFinite(pu)) return json({ error: "plan_until" }, 400); sets.push("plan_until=?"); vals.push(pu); }
          if (ROLES.includes(b.role)) { sets.push("role=?"); vals.push(b.role); }
          if (typeof b.banned === "boolean") { sets.push("banned=?"); vals.push(b.banned ? 1 : 0); }
          if (!sets.length) return json({ error: "nothing" }, 400);
          await env.DB.prepare(`UPDATE users SET ${sets.join(",")} WHERE id=?`).bind(...vals, um[1]).run();
          if (b.banned === true) await env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(um[1]).run();
          await audit(env, me.id, "user_update", um[1], b); return json({ ok: 1 });
        }
        if (p === "/admin/announcements" && m === "GET") return json({ items: (await env.DB.prepare("SELECT * FROM announcements ORDER BY id DESC LIMIT 50").all()).results });
        if (p === "/admin/announcements" && m === "POST") {
          const b = await body(), text = clean(b.text, 140); if (!text) return json({ error: "text" }, 400);
          const starts = +b.starts || now(), ends = +b.ends || now() + 3 * DAY;
          await env.DB.prepare("INSERT INTO announcements (text,starts,ends,audience,created_by,created_at) VALUES (?,?,?,?,?,?)").bind(text, starts, ends, ["all", "free", "plus", "pro"].includes(b.audience) ? b.audience : "all", me.id, now()).run();
          await audit(env, me.id, "announce", null, { text }); return json({ ok: 1 });
        }
        const am = p.match(/^\/admin\/announcements\/(\d+)$/);
        if (am && m === "DELETE") { await env.DB.prepare("DELETE FROM announcements WHERE id=?").bind(+am[1]).run(); await audit(env, me.id, "announce_delete", am[1]); return json({ ok: 1 }); }
        if (p === "/admin/audit") return json({ items: (await env.DB.prepare("SELECT a.*, u.email actor_email FROM audit a LEFT JOIN users u ON u.id=a.actor ORDER BY a.id DESC LIMIT 100").all()).results });
      }
      return json({ error: "not_found" }, 404);
    } catch (e) {
      console.error(e);
      return json({ error: e.code === "E_SENDER_NOT_VERIFIED" ? "mail_not_ready" : "server" }, 500);
    }
  },
  // dọn mã & phiên hết hạn mỗi ngày
  async scheduled(_e, env) { await env.DB.batch([env.DB.prepare("DELETE FROM codes WHERE expires<?").bind(now()), env.DB.prepare("DELETE FROM sessions WHERE expires<?").bind(now()), env.DB.prepare("DELETE FROM ratelimit WHERE reset<?").bind(now())]); },
};
