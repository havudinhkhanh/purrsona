// TÀI KHOẢN: đăng nhập bằng mã 6 số qua email, đồng bộ tiến độ giữa các máy, gói (free/plus/pro) do máy chủ quyết.
// Máy chủ: worker/api (Cloudflare Worker + D1). Chưa điền ACCOUNT.endpoint thì app chạy như cũ, không có tài khoản.
import { ACCOUNT, APP } from "../config.js";
import { save } from "../core/store.js";
const APP_KEY = APP.saveKey;

const SKIP = new Set(["account", "device", "wxCache", "lastShared"]);
const endpoint = () => { try { return localStorage.getItem("purrsona.api") || ACCOUNT.endpoint || ""; } catch { return ACCOUNT.endpoint || ""; } };

/** gộp 2 bản tiến độ. `base` giữ cài đặt, mèo, gói…; phần học thì cộng dồn cả hai:
 *  thẻ học lấy bản đã trả lời nhiều hơn, ngày học lấy số lớn hơn, sổ & từ riêng gộp chung (trừ chữ đã xoá). */
export function mergeSaves(base, other) {
  if (!base) return other; if (!other) return base;
  const out = structuredClone(base), L = (out.learn ||= {}), A = base.learn || {}, B = other.learn || {};
  const tries = (c) => (c ? (c.right || 0) + (c.wrong || 0) : -1);
  L.cards = { ...(B.cards || {}) }; for (const [id, c] of Object.entries(A.cards || {})) { const d = L.cards[id]; L.cards[id] = !d || tries(c) > tries(d) || (tries(c) === tries(d) && (c.last || 0) >= (d.last || 0)) ? c : d; }
  L.days = { ...(B.days || {}) }; for (const [k, v] of Object.entries(A.days || {})) { const w = L.days[k] || {}; L.days[k] = Object.fromEntries([...new Set([...Object.keys(v), ...Object.keys(w)])].map((f) => [f, Math.max(v[f] || 0, w[f] || 0)])); }
  const gone = { ...(B.bookGone || {}) }; for (const [id, t] of Object.entries(A.bookGone || {})) gone[id] = Math.max(gone[id] || 0, t); L.bookGone = gone;
  const union = (x = [], y = []) => { const m = new Map(); for (const it of [...y, ...x]) m.set(it.id, it); return [...m.values()]; };
  L.book = union(A.book, B.book).filter((b) => !(gone[b.id] > (b.t || 0))).sort((p, q) => (q.t || 0) - (p.t || 0)); L.custom = union(A.custom, B.custom);
  L.xp = Math.max(A.xp || 0, B.xp || 0);
  const sa = A.streak || {}, sb = B.streak || {}; L.streak = (sa.last || "") >= (sb.last || "") ? { ...sa, best: Math.max(sa.best || 0, sb.best || 0) } : { ...sb, best: Math.max(sa.best || 0, sb.best || 0) };
  return out;
}
// thay nội dung object tại chỗ (các module đang giữ tham chiếu tới s.learn, s.play…)
const refill = (dst, src) => { for (const k of Object.keys(dst)) delete dst[k]; Object.assign(dst, src); };

export function createAccount(game) {
  const s = game.save; s.account ||= { token: "", user: null, rev: 0, last: 0 };
  const A = s.account, ev = (n, d) => game.emit("account", { n, ...d });
  const dropPlan = () => { if (s.plan !== "free") { s.plan = "free"; game.emit("plan", "free"); } };      // hết phiên / đăng xuất: gói theo tài khoản không còn
  const api = async (path, { method = "GET", body, auth = true, keepalive = false } = {}) => {
    const ep = endpoint(); if (!ep) throw Object.assign(new Error("no_endpoint"), { code: "no_endpoint" });
    const raw = body ? JSON.stringify(body) : undefined;
    const r = await fetch(ep.replace(/\/$/, "") + path, { method, headers: { "content-type": "text/plain", ...(auth && A.token ? { authorization: `Bearer ${A.token}` } : {}) }, body: raw, keepalive: keepalive && (raw ? new Blob([raw]).size : 0) < 60000 });      // giới hạn keepalive tính theo byte
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && auth) { A.token = ""; A.user = null; A.rev = 0; dropPlan(); save(s); ev("out"); }
    if (!r.ok) throw Object.assign(new Error(j.error || "http"), { code: j.error || "http", status: r.status, data: j });
    return j;
  };
  const exportSave = () => Object.fromEntries(Object.entries(s).filter(([k]) => !SKIP.has(k)));
  const summary = () => ({ lang: s.learn?.lang, streak: game.learn.streakAlive(), mastered: game.learn.counts?.().mastered || 0, vibe: game.vibe?.id || s.settings?.vibe || "home" });
  const applyUser = (u) => { if (!u) return; A.user = u; if (u.plan && s.plan !== u.plan) { s.plan = u.plan; game.emit("plan", u.plan); } if (u.nick && (!s.profile.nick || s.profile.nick === "Sen")) s.profile.nick = u.nick; };

  let pushT = 0, busy = null;
  // đẩy tiến độ lên; máy khác vừa đồng bộ (409) thì gộp tại chỗ rồi đẩy lại, tối đa 3 lần. Trả về true nếu xong.
  function push(opt = {}) {
    if (!A.token) return Promise.resolve(false); if (busy) return opt.keepalive ? busy.then(() => push(opt)) : busy;
    busy = (async () => {
      for (let i = 0; i < 3; i++) {
        try { const r = await api("/sync", { method: "PUT", body: { rev: A.rev, data: exportSave(), summary: summary() }, keepalive: opt.keepalive }); A.rev = r.rev; A.last = Date.now(); save(s); ev("synced"); return true; }
        catch (e) {
          if (e.code !== "conflict") { ev("error", { code: e.code }); return false; }
          const m = mergeSaves(exportSave(), e.data.data); for (const k of ["learn", "play"]) if (m[k] && s[k]) refill(s[k], m[k]); else if (m[k]) s[k] = m[k];
          A.rev = e.data.rev || 0; save(s, true); game.emit("learn", { type: "merged" });
        }
      }
      return false;
    })().finally(() => { busy = null; });
    return busy;
  }
  const soon = (ms = 4000) => { if (!A.token) return; clearTimeout(pushT); pushT = setTimeout(push, ms); };

  const acc = {
    get on() { return !!endpoint(); }, get user() { return A.user; }, get last() { return A.last; },
    async start(email) { await api("/auth/start", { method: "POST", body: { email }, auth: false }); },
    async verify(email, code) {
      const r = await api("/auth/verify", { method: "POST", body: { email, code, nick: s.profile.nick }, auth: false });
      A.token = r.token; applyUser(r.user); save(s, true);
      // lần đầu trên máy này: lấy bản trên máy chủ, gộp với tiến độ đang có, rồi tải lại app
      const sv = await api("/sync"); A.rev = sv.rev || 0;
      // máy này chưa từng đồng bộ → bản trên máy chủ làm gốc (cài đặt, mèo, ghi chú…), chỉ cộng thêm tiến độ học của máy này
      if (sv.data) { const m = mergeSaves(sv.data, exportSave()); const keep = { account: A, device: s.device }; localStorage.setItem(APP_KEY, JSON.stringify({ ...m, ...keep, plan: r.user.plan })); globalThis.__purrReset = true; await pushNow(m); location.reload(); return r.user; }
      await push(); ev("in"); return r.user;
    },
    async logout() { await push(); try { await api("/auth/logout", { method: "POST" }); } catch { /* đã hết phiên */ } A.token = ""; A.user = null; A.rev = 0; dropPlan(); save(s, true); ev("out"); },
    async remove() { await api("/me", { method: "DELETE" }); A.token = ""; A.user = null; A.rev = 0; dropPlan(); save(s, true); ev("out"); },
    sync: push, soon,
  };
  async function pushNow(data) { try { const r = await api("/sync", { method: "PUT", body: { rev: A.rev, data, summary: summary() } }); A.rev = r.rev; A.last = Date.now(); s.account = A; localStorage.setItem(APP_KEY, JSON.stringify({ ...data, account: A, device: s.device, plan: s.plan })); } catch { /* lần sau */ } }

  // mở app: làm mới gói/quyền, lấy thông báo chung (mèo đọc to lên), đẩy tiến độ khi học / khi ẩn app
  if (endpoint()) {
    if (A.token) api("/me").then((r) => { applyUser(r.user); save(s); ev("in"); }).catch(() => {});
    api("/announce", { auth: false }).then((r) => { const seen = (s.annSeen ||= []); const it = (r.items || []).find((x) => !seen.includes(x.id) && (x.audience === "all" || x.audience === s.plan)); if (it) { seen.push(it.id); s.annSeen = seen.slice(-30); save(s); setTimeout(() => { game.sayLine?.(it.text, 6000); game.wall?.whisper(`📢 ${it.text}`, 8000); }, 5000); } }).catch(() => {});
    for (const k of ["learn", "book", "streak"]) game.on(k, () => soon());
    addEventListener("visibilitychange", () => { if (document.hidden) push({ keepalive: true }); });
  }
  return acc;
}
