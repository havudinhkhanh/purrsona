// PURRSONA API – Cloudflare Pages Function (cùng tên miền với app: /api/*), dữ liệu trong D1.
// Giống các trang khác của bạn: chỉ cần gắn D1 tên "DB" cho dự án Pages là chạy, bảng tự tạo, không cần deploy riêng.
// Đăng nhập: email + mật khẩu · Google (khi có GOOGLE_CLIENT_ID) · mã 6 số qua email (khi có RESEND_API_KEY + MAIL_FROM).
// Quản trị: email trong OWNER_EMAIL (hoặc người đăng ký đầu tiên nếu chưa đặt). Đồng bộ tiến độ, thông báo chung, nhật ký, số liệu học.
const DAY = 86400e3, CODE_TTL = 10 * 60e3, SESSION_TTL = 60 * DAY, MAX_SAVE = 600_000, PBKDF2_ITER = 50000;
const PLANS = ["free", "plus", "pro"], ROLES = ["user", "admin"];

const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };
const sha = async (s) => b64u(await crypto.subtle.digest("SHA-256", enc.encode(s)));
const now = () => Date.now();
const isLocal = (req) => /^(localhost|127\.0\.0\.1)$/.test(new URL(req.url).hostname);
const normEmail = (e) => String(e || "").trim().toLowerCase().slice(0, 120);
const okEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, n);
const owners = (env) => String(env.OWNER_EMAIL || env.ADMIN_EMAILS || "").toLowerCase().split(",").map((x) => x.trim()).filter(Boolean);
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

// ---------------------------------------------------------------- bảng (tự tạo lần đầu) & bí mật (tự sinh nếu chưa đặt PEPPER)
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, nick TEXT, pw TEXT, google_sub TEXT UNIQUE,
    plan TEXT NOT NULL DEFAULT 'free', plan_until INTEGER, role TEXT NOT NULL DEFAULT 'user', banned INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL, last_seen INTEGER, lang TEXT, streak INTEGER NOT NULL DEFAULT 0, mastered INTEGER NOT NULL DEFAULT 0, vibe TEXT, level TEXT)`,
  "CREATE INDEX IF NOT EXISTS users_created ON users(created_at)", "CREATE INDEX IF NOT EXISTS users_seen ON users(last_seen)",
  "CREATE TABLE IF NOT EXISTS codes (email TEXT PRIMARY KEY, hash TEXT NOT NULL, expires INTEGER NOT NULL, tries INTEGER NOT NULL DEFAULT 0, sent_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS resets (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at INTEGER NOT NULL, expires INTEGER NOT NULL, ua TEXT)",
  "CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)",
  "CREATE TABLE IF NOT EXISTS saves (user_id TEXT PRIMARY KEY, data TEXT NOT NULL, rev INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS announcements (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, starts INTEGER NOT NULL, ends INTEGER NOT NULL, audience TEXT NOT NULL DEFAULT 'all', created_by TEXT, created_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS ratelimit (k TEXT PRIMARY KEY, n INTEGER NOT NULL, reset INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT, action TEXT NOT NULL, target TEXT, detail TEXT, at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT NOT NULL, at INTEGER NOT NULL)",
  // số liệu học ẩn danh (không gắn người): chữ nào hay sai, cấp nào đang học → việc nuôi kho chữ mỗi ngày dựa vào đây
  "CREATE TABLE IF NOT EXISTS wordstats (id TEXT PRIMARY KEY, right INTEGER NOT NULL DEFAULT 0, wrong INTEGER NOT NULL DEFAULT 0, users INTEGER NOT NULL DEFAULT 0, at INTEGER NOT NULL)",
];
let ready = null, PEP = null;
async function boot(env) {
  if (!ready) ready = env.DB.batch(SCHEMA.map((q) => env.DB.prepare(q))).catch((e) => { ready = null; throw e; });
  await ready;
  if (!PEP) {
    if (env.PEPPER) PEP = env.PEPPER;
    else { let r = await env.DB.prepare("SELECT v FROM config WHERE k='pepper'").first(); if (!r) { await env.DB.prepare("INSERT OR IGNORE INTO config (k,v,at) VALUES ('pepper',?,?)").bind(b64u(crypto.getRandomValues(new Uint8Array(32))), now()).run(); r = await env.DB.prepare("SELECT v FROM config WHERE k='pepper'").first(); } PEP = r.v; }
  }
  if (Math.random() < 0.02) await env.DB.batch([env.DB.prepare("DELETE FROM codes WHERE expires<?").bind(now()), env.DB.prepare("DELETE FROM sessions WHERE expires<?").bind(now()), env.DB.prepare("DELETE FROM ratelimit WHERE reset<?").bind(now()), env.DB.prepare("DELETE FROM resets WHERE expires<?").bind(now())]);
}

async function limit(env, key, max, windowMs) {
  const t = now(), r = await env.DB.prepare("SELECT n, reset FROM ratelimit WHERE k=?").bind(key).first();
  if (!r || r.reset < t) { await env.DB.prepare("INSERT OR REPLACE INTO ratelimit (k,n,reset) VALUES (?,1,?)").bind(key, t + windowMs).run(); return true; }
  if (r.n >= max) return false;
  await env.DB.prepare("UPDATE ratelimit SET n=n+1 WHERE k=?").bind(key).run(); return true;
}
const audit = (env, actor, action, target, detail) => env.DB.prepare("INSERT INTO audit (actor,action,target,detail,at) VALUES (?,?,?,?,?)").bind(actor, action, target || null, detail ? JSON.stringify(detail).slice(0, 2000) : null, now()).run();
const pub = (u) => ({ id: u.id, email: u.email, nick: u.nick, plan: u.plan_until && u.plan_until < now() ? "free" : u.plan, plan_until: u.plan_until, role: u.role, created_at: u.created_at, has_pw: !!u.pw, google: !!u.google_sub });

// ---------------------------------------------------------------- mật khẩu (PBKDF2) – giống các trang khác của bạn
async function hashPw(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITER }, key, 256);
  return `pbkdf2$${PBKDF2_ITER}$${b64u(salt)}$${b64u(bits)}`;
}
async function checkPw(pw, stored) {
  if (!stored?.startsWith("pbkdf2$")) return false; const [, it, s, h] = stored.split("$");
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const a = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: unb64u(s), iterations: +it }, key, 256)), b = unb64u(h);
  if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0;
}
// ---------------------------------------------------------------- Google (Google Identity Services: xác thực ID token)
let jwks = { at: 0, keys: [] };
async function verifyGoogle(token, cid) {
  const [h, p, s] = String(token || "").split("."); if (!h || !p || !s) throw new Error("token");
  const head = JSON.parse(new TextDecoder().decode(unb64u(h))), body = JSON.parse(new TextDecoder().decode(unb64u(p)));
  if (now() - jwks.at > 3600e3 || !jwks.keys.find((k) => k.kid === head.kid)) { jwks = { at: now(), keys: (await (await fetch("https://www.googleapis.com/oauth2/v3/certs")).json()).keys || [] }; }
  const jwk = jwks.keys.find((k) => k.kid === head.kid); if (!jwk) throw new Error("kid");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  if (!(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, unb64u(s), enc.encode(`${h}.${p}`)))) throw new Error("sig");
  if (!["accounts.google.com", "https://accounts.google.com"].includes(body.iss) || body.aud !== cid || body.exp * 1000 < now() || !body.email_verified) throw new Error("claims");
  return { sub: body.sub, email: normEmail(body.email), name: body.given_name || body.name };
}
// ---------------------------------------------------------------- Cloudflare Access (tuỳ chọn): trang đặt sau Zero Trust → tự đăng nhập bằng email Access
// Cần CF_ACCESS_TEAM (vd "tenban" của tenban.cloudflareaccess.com) + CF_ACCESS_AUD (Application Audience tag). Không có thì tắt hẳn.
let cfJwks = { at: 0, keys: [] };
async function verifyAccess(token, env) {
  const [h, p, s] = String(token || "").split("."); if (!h || !p || !s) throw new Error("token");
  const head = JSON.parse(new TextDecoder().decode(unb64u(h))), body = JSON.parse(new TextDecoder().decode(unb64u(p)));
  const iss = `https://${env.CF_ACCESS_TEAM}.cloudflareaccess.com`;
  if (now() - cfJwks.at > 3600e3 || !cfJwks.keys.find((k) => k.kid === head.kid)) cfJwks = { at: now(), keys: (await (await fetch(`${iss}/cdn-cgi/access/certs`)).json()).keys || [] };
  const jwk = cfJwks.keys.find((k) => k.kid === head.kid); if (!jwk) throw new Error("kid");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  if (!(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, unb64u(s), enc.encode(`${h}.${p}`)))) throw new Error("sig");
  const aud = Array.isArray(body.aud) ? body.aud : [body.aud];
  if (body.iss !== iss || !aud.includes(env.CF_ACCESS_AUD) || body.exp * 1000 < now() || !body.email) throw new Error("claims");
  return { email: normEmail(body.email) };
}
const accessOn = (env) => !!(env.CF_ACCESS_TEAM && env.CF_ACCESS_AUD);
const githubOn = (env) => !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
const cookie = (req, name) => (req.headers.get("cookie") || "").split(/;\s*/).map((x) => x.split("=")).find(([k]) => k === name)?.[1] || "";

// ---------------------------------------------------------------- email (tuỳ chọn): Resend hoặc Cloudflare Email Service
const mailOn = (env) => !!((env.RESEND_API_KEY && env.MAIL_FROM) || (env.EMAIL && env.MAIL_FROM));
async function sendMail(env, to, subject, text, html) {
  if (env.RESEND_API_KEY) { const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, text, html }) }); return r.ok; }
  if (env.EMAIL) { await env.EMAIL.send({ to, from: { email: env.MAIL_FROM, name: env.MAIL_NAME || "Purrsona" }, subject, text, html }); return true; }
  return false;
}
const box = (inner) => `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:auto;padding:24px;border:1.6px solid #262626;border-radius:20px;background:#FBFAF6;color:#1f1f1f"><p style="margin:0 0 6px;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#545454">Purrsona</p>${inner}<p style="margin:14px 0 0;font-size:13px;color:#545454">Không phải bạn yêu cầu thì bỏ qua email này.<br>– na</p></div>`;

async function auth(req, env) {
  const tok = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""); if (tok.length < 20) return null;
  const s = await env.DB.prepare("SELECT s.user_id, s.expires, u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.hash=?").bind(await sha(tok + PEP)).first();
  if (!s || s.expires < now() || s.banned) return null;
  if (!s.last_seen || now() - s.last_seen > 10 * 60e3) await env.DB.prepare("UPDATE users SET last_seen=? WHERE id=?").bind(now(), s.id).run();
  return s;
}
// tạo / tìm người dùng & mở phiên. Quản trị: email trong OWNER_EMAIL, hoặc người đầu tiên khi chưa có quản trị nào
async function upsertUser(env, email, extra = {}) {
  let u = await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(email).first();
  const own = owners(env).includes(email);
  if (!u) {
    const noAdmin = !owners(env).length && !(await env.DB.prepare("SELECT 1 FROM users WHERE role='admin' LIMIT 1").first());
    u = { id: crypto.randomUUID(), email, nick: clean(extra.nick, 16) || null, pw: extra.pw || null, google_sub: extra.google_sub || null, plan: "free", role: own || noAdmin ? "admin" : "user", created_at: now() };
    await env.DB.prepare("INSERT INTO users (id,email,nick,pw,google_sub,plan,role,created_at,last_seen) VALUES (?,?,?,?,?,?,?,?,?)").bind(u.id, email, u.nick, u.pw, u.google_sub, u.plan, u.role, u.created_at, now()).run();
    await audit(env, u.id, "signup", u.id);
  } else if (own && u.role !== "admin") { await env.DB.prepare("UPDATE users SET role='admin' WHERE id=?").bind(u.id).run(); u.role = "admin"; }
  return u;
}
async function session(env, req, u) {
  if (u.banned) return json({ error: "banned" }, 403);
  const tok = b64u(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.prepare("INSERT INTO sessions (hash,user_id,created_at,expires,ua) VALUES (?,?,?,?,?)").bind(await sha(tok + PEP), u.id, now(), now() + SESSION_TTL, clean(req.headers.get("user-agent"), 160)).run();
  return json({ token: tok, user: pub(u) });
}

async function handle(req, env, p) {
  const m = req.method, url = new URL(req.url);
  const body = async () => { try { return JSON.parse((await req.text()) || "{}"); } catch { return {}; } };
  const ip = req.headers.get("cf-connecting-ip") || "local";
  if (p === "/health") return json({ ok: 1 });

  // ---------------------------------------------------------------- ĐĂNG NHẬP
  if (p === "/auth/config") return json({ password: true, google: env.GOOGLE_CLIENT_ID || null, github: githubOn(env), access: accessOn(env) && !!req.headers.get("cf-access-jwt-assertion"), mail: mailOn(env) });
  // GitHub: chuyển sang trang đồng ý của GitHub → quay về /callback → tạo phiên → về app kèm #login=… (mã nằm sau dấu #, không lọt vào nhật ký máy chủ)
  if (p === "/auth/github/start") {
    if (!githubOn(env)) return json({ error: "github_off" }, 400);
    const st = b64u(crypto.getRandomValues(new Uint8Array(18)));
    const to = new URL("https://github.com/login/oauth/authorize"); to.search = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: `${url.origin}/api/auth/github/callback`, scope: "read:user user:email", state: st, allow_signup: "true" });
    const nx = url.searchParams.get("next") === "admin" ? "admin" : "app", h = new Headers({ location: to.toString(), "cache-control": "no-store" });
    h.append("set-cookie", `gh_st=${st}; Path=/api/auth/github; Max-Age=600; HttpOnly; Secure; SameSite=Lax`); h.append("set-cookie", `gh_nx=${nx}; Path=/api/auth/github; Max-Age=600; HttpOnly; Secure; SameSite=Lax`);
    return new Response(null, { status: 302, headers: h });
  }
  if (p === "/auth/github/callback") {
    const back = (frag) => { const h = new Headers({ location: `${url.origin}/${cookie(req, "gh_nx") === "admin" ? "admin.html" : ""}#${frag}`, "cache-control": "no-store" }); h.append("set-cookie", "gh_st=; Path=/api/auth/github; Max-Age=0; HttpOnly; Secure; SameSite=Lax"); h.append("set-cookie", "gh_nx=; Path=/api/auth/github; Max-Age=0; HttpOnly; Secure; SameSite=Lax"); return new Response(null, { status: 302, headers: h }); };
    if (!githubOn(env)) return back("login_error=github_off");
    const code = url.searchParams.get("code"), st = url.searchParams.get("state");
    if (!code || !st || st !== cookie(req, "gh_st")) return back("login_error=state");
    if (!(await limit(env, `gh:${ip}`, 30, 3600e3))) return back("login_error=slow_down");
    const tk = await (await fetch("https://github.com/login/oauth/access_token", { method: "POST", headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: `${url.origin}/api/auth/github/callback` }) })).json().catch(() => ({}));
    if (!tk.access_token) return back("login_error=github_bad");
    const gh = { authorization: `Bearer ${tk.access_token}`, accept: "application/vnd.github+json", "user-agent": "purrsona" };
    const me = await (await fetch("https://api.github.com/user", { headers: gh })).json().catch(() => ({}));
    const ems = await (await fetch("https://api.github.com/user/emails", { headers: gh })).json().catch(() => []);
    const em = Array.isArray(ems) ? (ems.find((e) => e.primary && e.verified) || ems.find((e) => e.verified)) : null;
    if (!em?.email) return back("login_error=github_email");
    const u = await upsertUser(env, normEmail(em.email), { nick: me.name || me.login });
    if (u.banned) return back("login_error=banned");
    const tok = b64u(crypto.getRandomValues(new Uint8Array(32)));
    await env.DB.prepare("INSERT INTO sessions (hash,user_id,created_at,expires,ua) VALUES (?,?,?,?,?)").bind(await sha(tok + PEP), u.id, now(), now() + SESSION_TTL, clean(req.headers.get("user-agent"), 160)).run();
    await audit(env, u.id, "login_github", u.id);
    return back(`login=${tok}`);
  }
  // Cloudflare Access: đã qua cổng Zero Trust thì đổi giấy thông hành của Access lấy phiên Purrsona
  if (p === "/auth/access" && m === "POST") {
    if (!accessOn(env)) return json({ error: "access_off" }, 400);
    let a; try { a = await verifyAccess(req.headers.get("cf-access-jwt-assertion"), env); } catch { return json({ error: "access_bad" }, 401); }
    return session(env, req, await upsertUser(env, a.email, {}));
  }
  if (p === "/auth/register" && m === "POST") {
    const b = await body(), email = normEmail(b.email), pw = String(b.password || "");
    if (!okEmail(email)) return json({ error: "email" }, 400); if (pw.length < 6) return json({ error: "weak" }, 400);
    if (!(await limit(env, `reg:${ip}`, 10, 3600e3))) return json({ error: "slow_down" }, 429);
    const ex = await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first(); if (ex) return json({ error: "exists" }, 409);
    return session(env, req, await upsertUser(env, email, { nick: b.nick, pw: await hashPw(pw) }));
  }
  if (p === "/auth/login" && m === "POST") {
    const b = await body(), email = normEmail(b.email);
    if (!(await limit(env, `li:${ip}`, 30, 3600e3)) || !(await limit(env, `le:${email}`, 8, 15 * 60e3))) return json({ error: "slow_down" }, 429);
    const u = await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(email).first();
    if (!u || !(await checkPw(String(b.password || ""), u.pw))) return json({ error: u && !u.pw ? (u.google_sub ? "use_google" : "no_pw") : "wrong" }, 401);
    if (owners(env).includes(email) && u.role !== "admin") { await env.DB.prepare("UPDATE users SET role='admin' WHERE id=?").bind(u.id).run(); u.role = "admin"; }
    return session(env, req, u);
  }
  if (p === "/auth/google" && m === "POST") {
    if (!env.GOOGLE_CLIENT_ID) return json({ error: "google_off" }, 400);
    let g; try { g = await verifyGoogle((await body()).credential, env.GOOGLE_CLIENT_ID); } catch { return json({ error: "google_bad" }, 401); }
    let u = await env.DB.prepare("SELECT * FROM users WHERE google_sub=? OR email=? ORDER BY google_sub IS NULL LIMIT 1").bind(g.sub, g.email).first();
    if (u && !u.google_sub) await env.DB.prepare("UPDATE users SET google_sub=? WHERE id=?").bind(g.sub, u.id).run();
    if (!u) u = await upsertUser(env, g.email, { nick: g.name, google_sub: g.sub });
    return session(env, req, u);
  }
  // mã 6 số qua email: chỉ khi đã cài gửi mail
  if (p === "/auth/start" && m === "POST") {
    if (!mailOn(env) && !(env.DEV_ECHO_CODE === "1" && isLocal(req))) return json({ error: "mail_off" }, 400);
    const email = normEmail((await body()).email); if (!okEmail(email)) return json({ error: "email" }, 400);
    if (!(await limit(env, `ip:${ip}`, 20, 3600e3)) || !(await limit(env, `em:${email}`, 4, 15 * 60e3))) return json({ error: "slow_down" }, 429);
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1e6).padStart(6, "0");
    await env.DB.prepare("INSERT INTO codes (email,hash,expires,tries,sent_at) VALUES (?,?,?,0,?) ON CONFLICT(email) DO UPDATE SET hash=excluded.hash, expires=excluded.expires, tries=CASE WHEN codes.sent_at>? THEN codes.tries ELSE 0 END, sent_at=excluded.sent_at").bind(email, await sha(`${email}:${code}:${PEP}`), now() + CODE_TTL, now(), now() - 15 * 60e3).run();
    if (env.DEV_ECHO_CODE === "1" && isLocal(req)) return json({ ok: 1, dev_code: code });
    await sendMail(env, email, `${code} là mã đăng nhập Purrsona`, `Mã đăng nhập Purrsona: ${code}\nDùng được 10 phút.`, box(`<p style="margin:0 0 14px;font-size:16px">Mã đăng nhập của bạn:</p><p style="margin:0;font-size:34px;letter-spacing:8px;font-weight:700">${code}</p>`));
    return json({ ok: 1 });
  }
  if (p === "/auth/verify" && m === "POST") {
    const b = await body(), email = normEmail(b.email), code = String(b.code || "").replace(/\D/g, "");
    if (!okEmail(email) || code.length !== 6) return json({ error: "bad" }, 400);
    if (!(await limit(env, `vf:${ip}`, 30, 3600e3))) return json({ error: "slow_down" }, 429);
    const c = await env.DB.prepare("UPDATE codes SET tries=tries+1 WHERE email=? AND tries<5 AND expires>? RETURNING hash, tries").bind(email, now()).first();
    if (!c) { const x = await env.DB.prepare("SELECT tries, expires FROM codes WHERE email=?").bind(email).first(); return json({ error: x && x.tries >= 5 && x.expires > now() ? "too_many" : "expired" }, 400); }
    if (c.hash !== (await sha(`${email}:${code}:${PEP}`))) return json({ error: "wrong", left: Math.max(0, 5 - c.tries) }, 400);
    const del = await env.DB.prepare("DELETE FROM codes WHERE email=? AND hash=?").bind(email, c.hash).run(); if (!del.meta?.changes) return json({ error: "expired" }, 400);
    return session(env, req, await upsertUser(env, email, { nick: b.nick }));
  }
  // quên mật khẩu: có mail thì gửi link; không có thì nhờ quản trị tạo link đặt lại (trang quản trị)
  if (p === "/auth/forgot" && m === "POST") {
    const email = normEmail((await body()).email); if (!mailOn(env)) return json({ error: "mail_off" }, 400);
    if (!(await limit(env, `fg:${email}`, 3, 3600e3))) return json({ error: "slow_down" }, 429);
    const u = await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
    if (u) { const tok = b64u(crypto.getRandomValues(new Uint8Array(24))); await env.DB.prepare("INSERT INTO resets (hash,user_id,expires) VALUES (?,?,?)").bind(await sha(tok + PEP), u.id, now() + 2 * 3600e3).run();
      const link = `${url.origin}/#reset=${tok}`; await sendMail(env, email, "Đặt lại mật khẩu Purrsona", `Đặt lại mật khẩu: ${link}`, box(`<p style="margin:0 0 14px;font-size:16px">Bấm để đặt mật khẩu mới (2 giờ):</p><p><a href="${link}">Đặt lại mật khẩu</a></p>`)); }
    return json({ ok: 1 });      // không tiết lộ email có tồn tại hay không
  }
  if (p === "/auth/reset" && m === "POST") {
    const b = await body(), pw = String(b.password || ""); if (pw.length < 6) return json({ error: "weak" }, 400);
    const r = await env.DB.prepare("DELETE FROM resets WHERE hash=? AND expires>? RETURNING user_id").bind(await sha(String(b.token || "") + PEP), now()).first();
    if (!r) return json({ error: "expired" }, 400);
    await env.DB.batch([env.DB.prepare("UPDATE users SET pw=? WHERE id=?").bind(await hashPw(pw), r.user_id), env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(r.user_id)]);
    return session(env, req, await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(r.user_id).first());
  }
  if (p === "/announce" && m === "GET") {
    const r = await env.DB.prepare("SELECT id,text,ends,audience FROM announcements WHERE starts<=? AND ends>=? ORDER BY id DESC LIMIT 3").bind(now(), now()).all();
    return json({ items: r.results });
  }
  // số liệu học ẩn danh cho việc nuôi kho chữ: cấp đang học, chữ hay sai nhất (đọc công khai, không có thông tin người)
  if (p === "/insights" && m === "GET") {
    const [levels, hard] = await Promise.all([
      env.DB.prepare("SELECT lang, level, COUNT(*) n FROM users WHERE last_seen>? AND level IS NOT NULL GROUP BY lang, level ORDER BY n DESC").bind(now() - 30 * DAY).all(),
      env.DB.prepare("SELECT id, right, wrong, users FROM wordstats WHERE users>=2 ORDER BY (wrong*1.0/(right+wrong+1)) DESC, wrong DESC LIMIT 60").all(),
    ]);
    return json({ levels: levels.results, hard: hard.results, at: now() });
  }

  // ---------------------------------------------------------------- CẦN ĐĂNG NHẬP
      const me = await auth(req, env); if (!me) return json({ error: "auth" }, 401);
      if (p === "/auth/logout" && m === "POST") { await env.DB.prepare("DELETE FROM sessions WHERE hash=?").bind(await sha((req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "") + PEP)).run(); return json({ ok: 1 }); }
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
        await env.DB.prepare("UPDATE users SET lang=?, streak=?, mastered=?, vibe=?, level=? WHERE id=?").bind(clean(S.lang, 4), Math.max(0, S.streak | 0), Math.max(0, S.mastered | 0), clean(S.vibe, 16), clean(S.level, 40) || null, me.id).run();
        // cộng dồn đúng/sai theo chữ (ẩn danh, chỉ phần tăng thêm kể từ lần trước) – tối đa 200 chữ mỗi lần
        if (Array.isArray(S.delta) && S.delta.length) await env.DB.batch(S.delta.slice(0, 200).filter((d) => typeof d?.id === "string" && d.id.length < 60).map((d) => env.DB.prepare("INSERT INTO wordstats (id,right,wrong,users,at) VALUES (?,?,?,1,?) ON CONFLICT(id) DO UPDATE SET right=right+excluded.right, wrong=wrong+excluded.wrong, users=users+?, at=excluded.at").bind(d.id, Math.min(50, Math.max(0, d.r | 0)), Math.min(50, Math.max(0, d.w | 0)), now(), d.n ? 1 : 0)));
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
        const rl = p.match(/^\/admin\/users\/([\w-]{8,64})\/reset-link$/);
        if (rl && m === "POST") { const tok = b64u(crypto.getRandomValues(new Uint8Array(24))); await env.DB.prepare("INSERT INTO resets (hash,user_id,expires) VALUES (?,?,?)").bind(await sha(tok + PEP), rl[1], now() + 72 * 3600e3).run(); await audit(env, me.id, "reset_link", rl[1]); return json({ link: `${url.origin}/#reset=${tok}`, hours: 72 }); }
        const am = p.match(/^\/admin\/announcements\/(\d+)$/);
        if (am && m === "DELETE") { await env.DB.prepare("DELETE FROM announcements WHERE id=?").bind(+am[1]).run(); await audit(env, me.id, "announce_delete", am[1]); return json({ ok: 1 }); }
        if (p === "/admin/audit") return json({ items: (await env.DB.prepare("SELECT a.*, u.email actor_email FROM audit a LEFT JOIN users u ON u.id=a.actor ORDER BY a.id DESC LIMIT 100").all()).results });
      }
  return json({ error: "not_found" }, 404);
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url), p = url.pathname.replace(/^\/api/, "") || "/";
  if (!env.DB) return json({ error: "no_db", hint: "Gắn D1 tên DB cho dự án Pages (Settings › Bindings)" }, 503);
  // chỉ nhận yêu cầu ghi từ chính trang này
  if (request.method !== "GET" && request.method !== "HEAD") { const o = request.headers.get("origin"); if (o && o !== url.origin && !isLocal(request)) return json({ error: "origin" }, 403); }
  try { await boot(env); return await handle(request, env, p); }
  catch (e) { console.error(e); return json({ error: "server" }, 500); }
}
