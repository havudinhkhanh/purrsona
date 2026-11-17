// TRANG QUẢN TRỊ: đăng nhập bằng mã email (chỉ tài khoản có quyền admin vào được),
// tổng quan số liệu, quản lý người dùng (gói, quyền, khoá), thông báo chung mèo đọc cho mọi người, chữ nóng, nhật ký.
import { ACCOUNT, PLANS } from "../config.js";
import { esc } from "../core/util.js";

const EP = (() => { try { return (localStorage.getItem("purrsona.api") || ACCOUNT.endpoint || "").replace(/\/$/, ""); } catch { return ACCOUNT.endpoint || ""; } })();
const TK = "purrsona.admin.token";
let token = localStorage.getItem(TK) || "", me = null, tab = "overview";
const $ = (s) => document.querySelector(s), main = $("#main");
const toast = (t) => { const e = $(".a-toast"); e.textContent = t; e.classList.add("in"); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove("in"), 2600); };
const ago = (t) => { if (!t) return "—"; const m = Math.round((Date.now() - t) / 60000); return m < 60 ? `${m} phút trước` : m < 1440 ? `${Math.round(m / 60)} giờ trước` : `${Math.round(m / 1440)} ngày trước`; };
const day = (t) => (t ? new Date(t).toLocaleDateString("vi-VN") : "—");

async function api(path, { method = "GET", body } = {}) {
  if (!EP) throw Object.assign(new Error("no_endpoint"), { code: "no_endpoint" });
  const r = await fetch(EP + path, { method, headers: { "content-type": "text/plain", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { token = ""; localStorage.removeItem(TK); render(); }
  if (!r.ok) throw Object.assign(new Error(j.error || "http"), { code: j.error });
  return j;
}

// ------------------------------------------------------------------ đăng nhập
let step = "email", email = "", msg = "";
function login() {
  $(".a-tabs").innerHTML = ""; $(".a-me").innerHTML = "";
  if (!EP) { main.innerHTML = `<div class="a-login panel"><h2>Chưa có máy chủ</h2><p class="muted2">Deploy <code>worker/api</code> rồi điền <code>ACCOUNT.endpoint</code> trong <code>src/config.js</code> (xem README, bước Tài khoản).</p></div>`; return; }
  main.innerHTML = `<form class="a-login panel" id="lf"><h2>Đăng nhập quản trị</h2>
    <label class="fld"><span>Email quản trị</span><input type="email" name="email" required autocomplete="email" value="${esc(email)}"></label>
    ${step === "code" ? `<label class="fld"><span>Mã 6 số</span><input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></label>` : ""}
    <button class="btn2 pri" type="submit">${step === "code" ? "Vào trang quản trị" : "Gửi mã"}</button>${msg ? `<p class="muted2">${esc(msg)}</p>` : ""}</form>`;
  $("#lf").onsubmit = async (e) => {
    e.preventDefault(); const f = new FormData(e.target); email = String(f.get("email")).trim();
    try {
      if (step === "email") { await api("/auth/start", { method: "POST", body: { email } }); step = "code"; msg = "Đã gửi mã. Coi cả hộp thư rác."; }
      else { const r = await api("/auth/verify", { method: "POST", body: { email, code: f.get("code") } }); if (r.user.role !== "admin") { msg = "Tài khoản này không có quyền quản trị."; step = "email"; } else { token = r.token; localStorage.setItem(TK, token); step = "email"; msg = ""; } }
    } catch (err) { msg = { wrong: "Sai mã.", expired: "Mã hết hạn.", too_many: "Sai quá 5 lần. Đợi 15 phút.", slow_down: "Gửi nhiều quá, đợi chút.", email: "Email chưa đúng." }[err.code] || "Không kết nối được."; }
    render();
  };
}

// ------------------------------------------------------------------ các mục
const TABS = [["overview", "Tổng quan"], ["users", "Người dùng"], ["announce", "Thông báo"], ["trends", "Chữ nóng"], ["audit", "Nhật ký"]];
const V = {
  async overview() {
    const s = await api("/admin/stats"), paid = (s.plans || []).filter((p) => p.plan !== "free").reduce((a, p) => a + p.n, 0);
    const max = Math.max(1, ...(s.signups || []).map((x) => x.n)), days = []; for (let i = 29; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5 + 7 * 3600e3).toISOString().slice(0, 10); days.push({ d, n: (s.signups.find((x) => x.d === d) || {}).n || 0 }); }
    const bars = (rows, key) => { const tot = Math.max(1, rows.reduce((a, r) => a + r.n, 0)); return rows.map((r) => `<div class="hbar"><span>${esc(r[key] || "—")}</span><i style="width:${(r.n / tot) * 100}%"></i><span>${r.n}</span></div>`).join("") || `<p class="muted2">Chưa có dữ liệu.</p>`; };
    return `<h2>Tổng quan</h2><div class="kpis2">
      <div class="kpi"><b>${s.users}</b><small>người dùng</small></div><div class="kpi"><b>${s.dau}</b><small>vào hôm nay</small></div>
      <div class="kpi"><b>${s.wau}</b><small>vào 7 ngày qua</small></div><div class="kpi"><b>${s.mau}</b><small>vào 30 ngày qua</small></div>
      <div class="kpi"><b>${paid}</b><small>trả phí (Plus + Pro)</small></div><div class="kpi"><b>${Math.round(s.streak?.a || 0)}</b><small>chuỗi ngày TB (7 ngày)</small></div></div>
      <h3>Đăng ký mới 30 ngày</h3><div class="panel"><div class="bars2">${days.map((x) => `<div title="${x.d}: ${x.n}"><i style="height:${(x.n / max) * 100}%"></i><small>${+x.d.slice(8)}</small></div>`).join("")}</div></div>
      <div class="grid2"><div><h3>Gói</h3><div class="panel">${bars(s.plans || [], "plan")}</div></div><div><h3>Ngôn ngữ đang học</h3><div class="panel">${bars(s.langs || [], "lang")}</div></div><div><h3>Vibe</h3><div class="panel">${bars(s.vibes || [], "vibe")}</div></div></div>`;
  },
  async users() {
    const q = V._q || "", plan = V._plan || "", r = await api(`/admin/users?q=${encodeURIComponent(q)}&plan=${plan}&offset=${V._off || 0}`);
    V._rows = (V._off ? V._rows || [] : []).concat(r.items);
    const row = (u) => `<tr class="${u.banned ? "banned" : ""}" data-u="${esc(u.id)}"><td><b>${esc(u.email)}</b><small>${esc(u.nick || "")}</small></td>
      <td><select data-f="plan">${Object.keys(PLANS).map((p) => `<option value="${p}"${u.plan === p ? " selected" : ""}>${PLANS[p].vi}</option>`).join("")}</select>${u.plan_until ? `<small>tới ${day(u.plan_until)}</small>` : ""}</td>
      <td><select data-f="role"${u.id === me.id ? " disabled title=\"Không tự đổi quyền của mình\"" : ""}><option value="user"${u.role === "user" ? " selected" : ""}>Người dùng</option><option value="admin"${u.role === "admin" ? " selected" : ""}>Quản trị</option></select></td>
      <td>${esc(u.lang || "—")}<small>${esc(u.vibe || "")}</small></td><td>🔥 ${u.streak} · 🌼 ${u.mastered}</td><td>${ago(u.last_seen)}<small>tạo ${day(u.created_at)}</small></td>
      <td><button class="btn2 sm" data-ban="${u.banned ? 0 : 1}"${u.id === me.id ? " disabled" : ""}>${u.banned ? "Mở khoá" : "Khoá"}</button></td></tr>`;
    return `<h2>Người dùng</h2><div class="tools"><input type="search" id="q" placeholder="Tìm email hoặc tên…" value="${esc(q)}"><select id="pf"><option value="">Mọi gói</option>${Object.keys(PLANS).map((p) => `<option value="${p}"${plan === p ? " selected" : ""}>${PLANS[p].vi}</option>`).join("")}</select></div>
      <div class="tblwrap"><table class="tbl"><thead><tr><th>Email</th><th>Gói</th><th>Quyền</th><th>Học</th><th>Tiến độ</th><th>Hoạt động</th><th></th></tr></thead><tbody>${V._rows.map(row).join("") || `<tr><td colspan="7">Không có ai.</td></tr>`}</tbody></table></div>
      ${r.items.length === 50 ? `<p><button class="btn2" id="more">Xem thêm</button></p>` : ""}`;
  },
  async announce() {
    const r = await api("/admin/announcements"), live = (a) => a.starts <= Date.now() && a.ends >= Date.now();
    return `<h2>Thông báo chung</h2><p class="muted2">Mèo đọc to câu này cho mọi người khi mở app (mỗi người 1 lần). Tối đa 140 ký tự, giọng mèo càng tốt.</p>
      <form class="panel" id="af" style="display:grid;gap:10px"><textarea name="text" maxlength="140" rows="2" required placeholder="Ví dụ: Có vibe Nhật Bản rồi. Vô Cài đặt mà đổi."></textarea>
      <div class="tools"><label>Cho <select name="audience"><option value="all">Mọi người</option><option value="free">Gói Free</option><option value="plus">Gói Plus</option><option value="pro">Gói Pro</option></select></label><label>Trong <input type="number" name="days" value="3" min="1" max="30" style="width:70px"> ngày</label><button class="btn2 pri" type="submit">Đăng</button></div></form>
      <h3>Đã đăng</h3><div class="panel">${r.items.map((a) => `<div class="ann"><div><b>${esc(a.text)}</b><br><small>${live(a) ? "đang chạy" : "đã hết"} · ${esc(a.audience)} · ${day(a.starts)} → ${day(a.ends)}</small></div><button class="btn2 sm" data-del="${a.id}">Xoá</button></div>`).join("") || `<p class="muted2">Chưa có.</p>`}</div>`;
  },
  async trends() {
    const idx = await fetch("data/trends/index.json", { cache: "no-store" }).then((r) => r.json()).catch(() => null), L = await fetch("data/trends/latest.json", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    return `<h2>Chữ nóng</h2><p class="muted2">Việc chạy tự động mỗi sáng (5:41) đọc báo, chọn chữ, kiểm bằng <code>tools/trend-check.mjs</code> rồi đẩy lên GitHub. Muốn sửa tay: sửa file <code>data/trends/&lt;ngày&gt;.json</code> rồi chạy lại công cụ kiểm.</p>
      <h3>Mẻ mới nhất ${L ? `· ${esc(L.d)}` : ""}</h3><div class="panel">${L ? L.words.map((w) => `<div class="wd"><b class="${w.lang}">${esc(w.w)}</b><span>${esc(w.vi)} · ${esc(w.tag)} · ${esc(w.level)}<br>${esc(w.why)}</span></div>`).join("") : `<p class="muted2">Không đọc được.</p>`}</div>
      <h3>Các ngày đã có</h3><div class="panel">${(idx?.days || []).map((d) => `<a href="data/trends/${d}.json" target="_blank" rel="noopener">${d}</a>`).join(" · ") || "—"}</div>`;
  },
  async audit() {
    const r = await api("/admin/audit"), A = { signup: "Đăng ký", user_update: "Sửa người dùng", announce: "Đăng thông báo", announce_delete: "Xoá thông báo", delete_self: "Tự xoá tài khoản" };
    return `<h2>Nhật ký</h2><div class="tblwrap"><table class="tbl"><thead><tr><th>Lúc</th><th>Ai</th><th>Việc</th><th>Chi tiết</th></tr></thead><tbody>${r.items.map((a) => `<tr><td>${new Date(a.at).toLocaleString("vi-VN")}</td><td>${esc(a.actor_email || a.actor || "")}</td><td>${A[a.action] || esc(a.action)}</td><td><small>${esc(a.detail || a.target || "")}</small></td></tr>`).join("")}</tbody></table></div>`;
  },
};

async function render() {
  if (!token) return login();
  try { if (!me) me = (await api("/me")).user; } catch { return login(); }
  if (me.role !== "admin") { token = ""; localStorage.removeItem(TK); msg = "Tài khoản này không có quyền quản trị."; return login(); }
  $(".a-me").innerHTML = `<span>${esc(me.email)}</span><button id="lo">Đăng xuất</button>`;
  $("#lo").onclick = async () => { try { await api("/auth/logout", { method: "POST" }); } catch { /* */ } token = ""; me = null; localStorage.removeItem(TK); render(); };
  $(".a-tabs").innerHTML = TABS.map(([k, v]) => `<button data-tab="${k}" class="${tab === k ? "on" : ""}">${v}</button>`).join("");
  main.innerHTML = `<p class="muted2">Đang tải…</p>`;
  try { main.innerHTML = await V[tab](); } catch (e) { main.innerHTML = `<p class="muted2">Lỗi: ${esc(e.code || e.message)}</p>`; }
  bind();
}
function bind() {
  const q = $("#q"); if (q) { let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => { V._q = q.value; V._off = 0; render(); }, 350); }; }
  const pf = $("#pf"); if (pf) pf.onchange = () => { V._plan = pf.value; V._off = 0; render(); };
  const more = $("#more"); if (more) more.onclick = () => { V._off = (V._off || 0) + 50; render(); };
  const af = $("#af"); if (af) af.onsubmit = async (e) => { e.preventDefault(); const f = new FormData(af); await api("/admin/announcements", { method: "POST", body: { text: f.get("text"), audience: f.get("audience"), ends: Date.now() + (+f.get("days") || 3) * 864e5 } }); toast("Đã đăng."); render(); };
}
document.addEventListener("click", async (e) => {
  const t = e.target.closest("[data-tab]"); if (t) { tab = t.dataset.tab; V._off = 0; return render(); }
  const d = e.target.closest("[data-del]"); if (d) { await api(`/admin/announcements/${d.dataset.del}`, { method: "DELETE" }); toast("Đã xoá."); return render(); }
  const bn = e.target.closest("[data-ban]"); if (bn) { const id = bn.closest("[data-u]").dataset.u; try { await api(`/admin/users/${id}`, { method: "PATCH", body: { banned: bn.dataset.ban === "1" } }); toast(bn.dataset.ban === "1" ? "Đã khoá." : "Đã mở khoá."); } catch (err) { toast(`Không được (${err.code}).`); } V._off = 0; return render(); }
});
document.addEventListener("change", async (e) => {
  const s = e.target.closest("select[data-f]"); if (!s) return; const id = s.closest("[data-u]").dataset.u;
  try { await api(`/admin/users/${id}`, { method: "PATCH", body: { [s.dataset.f]: s.value } }); toast("Đã lưu."); } catch (err) { toast(`Không lưu được (${err.code}).`); render(); }
});
render();
