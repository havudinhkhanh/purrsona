// KẾT NỐI LỊCH (chỉ ĐỌC, chỉ 14 ngày tới, dữ liệu nằm trên máy người dùng)
//  · Google Calendar  – đăng nhập Google, quyền calendar.events.readonly (cần CAL.googleClientId trong config.js)
//  · Link iCal (.ics) – Apple iCloud, Outlook, Google "địa chỉ bí mật iCal"… (qua worker/cal-proxy vì CORS)
//  · Nhập file .ics   – không cần mạng, không cần quyền
// Mỗi sự kiện được xếp loại: away (ra ngoài) · busy (bận nhưng ở nhà – họp online) · trip (đi xa nhiều ngày) · off (nghỉ ở nhà) · ignore
import { CAL } from "../config.js";

const DAY = 86400e3;
// ------------------------------------------------------------------ xếp loại sự kiện
export const KW = {
  home: ["wfh", "work from home", "ở nhà", "o nha", "online", "zoom", "meet.google", "teams", "google meet", "call", "gọi", "webinar", "remote"],
  trip: ["du lịch", "du lich", "công tác", "cong tac", "trip", "travel", "flight", "bay ", "chuyến bay", "vacation", "nghỉ mát", "về quê", "ve que", "hotel", "khách sạn"],
  off: ["nghỉ phép", "nghi phep", "holiday", "day off", "nghỉ lễ", "ngày nghỉ", "ốm", "sick", "pto"],
  away: ["họp", "meeting", "office", "văn phòng", "công ty", "khách hàng", "client", "gym", "đi ", "ăn tối", "dinner", "lunch", "cafe", "cà phê", "sinh nhật", "đám cưới", "hospital", "bệnh viện", "school", "trường", "tiệc", "party"],
};
const has = (t, list) => list.some((k) => t.includes(k));
export function classify(ev, overrides = {}) {
  if (overrides[ev.id]) return overrides[ev.id];
  const t = ` ${(ev.title || "").toLowerCase()} ${(ev.location || "").toLowerCase()} `;
  const days = (ev.end - ev.start) / DAY;
  if (ev.allDay || days >= 0.9) { if (has(t, KW.trip)) return "trip"; if (has(t, KW.off) || has(t, KW.home)) return "off"; return days >= 1.9 && ev.location ? "trip" : "ignore"; }
  if (has(t, KW.home) || /https?:\/\//.test(ev.location || "")) return "busy";
  if (has(t, KW.trip)) return "trip";
  if (ev.location || has(t, KW.away)) return "away";
  return (ev.end - ev.start) / 3600e3 >= 0.5 ? "away" : "ignore";
}
export const KIND = { away: { vi: "Ra ngoài", ic: "🏢" }, busy: { vi: "Ở nhà, bận", ic: "💻" }, trip: { vi: "Đi xa", ic: "✈️" }, off: { vi: "Nghỉ ở nhà", ic: "🏠" }, ignore: { vi: "Bỏ qua", ic: "·" } };
export const KIND_ORDER = ["away", "busy", "trip", "off", "ignore"];

// ------------------------------------------------------------------ đọc file .ics (RFC 5545 rút gọn: VEVENT, TZID, VALUE=DATE, RRULE DAILY/WEEKLY/MONTHLY, EXDATE)
function zoned(y, mo, d, h, mi, s, tz) {
  const guess = Date.UTC(y, mo, d, h, mi, s);
  if (!tz) return new Date(y, mo, d, h, mi, s).getTime();
  try {
    const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const p = Object.fromEntries(f.formatToParts(new Date(guess)).map((x) => [x.type, x.value]));
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return guess - (asUtc - guess);
  } catch { return new Date(y, mo, d, h, mi, s).getTime(); }
}
function parseDT(v, params) {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/); if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (!h) return { t: new Date(+y, +mo - 1, +d).getTime(), allDay: true };
  if (z) return { t: Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0)), allDay: false };
  return { t: zoned(+y, +mo - 1, +d, +h, +mi, +(s || 0), params.TZID), allDay: false };
}
const unesc = (s) => s.replace(/\\n/gi, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
export function parseICS(text, from = Date.now() - DAY, to = Date.now() + CAL.days * DAY) {
  const lines = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
  const out = []; let ev = null;
  for (const ln of lines) {
    if (ln === "BEGIN:VEVENT") { ev = { ex: [] }; continue; }
    if (ln === "END:VEVENT") { if (ev?.start) expand(ev, from, to, out); ev = null; continue; }
    if (!ev) continue;
    const i = ln.indexOf(":"); if (i < 0) continue;
    const [name, ...ps] = ln.slice(0, i).split(";"), val = ln.slice(i + 1), params = Object.fromEntries(ps.map((p) => p.split("=")));
    if (name === "DTSTART") { const d = parseDT(val, params); if (d) { ev.start = d.t; ev.allDay = d.allDay; } }
    else if (name === "DTEND") { const d = parseDT(val, params); if (d) ev.end = d.t; }
    else if (name === "DURATION") { const m = val.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/); if (m) ev.dur = ((+m[1] || 0) * 24 + (+m[2] || 0) + (+m[3] || 0) / 60) * 3600e3; }
    else if (name === "SUMMARY") ev.title = unesc(val);
    else if (name === "LOCATION") ev.location = unesc(val);
    else if (name === "UID") ev.uid = val;
    else if (name === "RRULE") ev.rrule = Object.fromEntries(val.split(";").map((p) => p.split("=")));
    else if (name === "EXDATE") val.split(",").forEach((v) => { const d = parseDT(v, params); if (d) ev.ex.push(d.t); });
    else if (name === "STATUS" && val === "CANCELLED") ev.cancelled = true;
  }
  return out.sort((a, b) => a.start - b.start);
}
function expand(ev, from, to, out) {
  if (ev.cancelled) return;
  const len = (ev.end ?? (ev.dur ? ev.start + ev.dur : ev.start + (ev.allDay ? DAY : 3600e3))) - ev.start;
  const push = (s) => { if (s + len > from && s < to && !ev.ex.includes(s)) out.push({ id: (ev.uid || ev.title) + "@" + s, title: ev.title || "", location: ev.location || "", start: s, end: s + len, allDay: !!ev.allDay }); };
  const r = ev.rrule; if (!r) return push(ev.start);
  const freq = r.FREQ, iv = +(r.INTERVAL || 1), until = r.UNTIL ? parseDT(r.UNTIL, {}).t : Infinity, count = r.COUNT ? +r.COUNT : Infinity;
  const BD = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }, byday = r.BYDAY ? r.BYDAY.split(",").map((d) => BD[d.slice(-2)]) : null;
  const base = new Date(ev.start); let n = 0;
  for (let k = 0; k < 800 && n < count; k++) {
    const d = new Date(base);
    if (freq === "DAILY") d.setDate(d.getDate() + k * iv);
    else if (freq === "WEEKLY") { d.setDate(d.getDate() + Math.floor(k / 7) * 7 * iv + (k % 7)); if (byday ? !byday.includes(d.getDay()) : k % 7) continue; }
    else if (freq === "MONTHLY") d.setMonth(d.getMonth() + k * iv);
    else if (freq === "YEARLY") d.setFullYear(d.getFullYear() + k * iv);
    else { push(ev.start); return; }
    const t = d.getTime(); if (t > until || t > to) break; n++; push(t);
  }
}

// ------------------------------------------------------------------ Google Calendar (Google Identity Services, chạy hoàn toàn trên trình duyệt)
let gisLoaded = null;
const loadGIS = () => (gisLoaded ||= new Promise((ok, no) => { const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.onload = ok; s.onerror = () => no(new Error("Không tải được Google Sign-In")); document.head.appendChild(s); }));
async function googleToken(prompt) {
  if (!CAL.googleClientId) throw new Error("Chưa cấu hình Google Client ID (xem README – Bước 11)");
  await loadGIS();
  return new Promise((ok, no) => {
    const c = google.accounts.oauth2.initTokenClient({ client_id: CAL.googleClientId, scope: "https://www.googleapis.com/auth/calendar.events.readonly", callback: (r) => (r.error ? no(new Error(r.error)) : ok(r)), error_callback: (e) => no(new Error(e.type || "Đã huỷ")) });
    c.requestAccessToken({ prompt });
  });
}
async function googleEvents(token) {
  const from = new Date(Date.now() - DAY).toISOString(), to = new Date(Date.now() + CAL.days * DAY).toISOString();
  const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=250&timeMin=${from}&timeMax=${to}`, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 401) throw Object.assign(new Error("Hết phiên, cần kết nối lại"), { reauth: true });
  if (!r.ok) throw new Error("Google Calendar lỗi " + r.status);
  const j = await r.json();
  return (j.items || []).filter((e) => e.status !== "cancelled" && (e.transparency !== "transparent")).map((e) => {
    const allDay = !!e.start.date, s = allDay ? new Date(e.start.date + "T00:00:00").getTime() : Date.parse(e.start.dateTime), en = allDay ? new Date(e.end.date + "T00:00:00").getTime() : Date.parse(e.end.dateTime);
    return { id: e.id, title: e.summary || "", location: e.location || e.hangoutLink || "", start: s, end: en, allDay };
  });
}

// ------------------------------------------------------------------ bộ quản lý
export function createCalendar(game) {
  const s = game.save;
  s.calendar ||= { provider: null, url: "", events: [], synced: 0, overrides: {}, consent: false };
  const C = s.calendar;
  let token = null;
  const keep = (evs) => evs.filter((e) => e.end > Date.now() - DAY && e.start < Date.now() + CAL.days * DAY).slice(0, 400).map(({ id, title, location, start, end, allDay }) => ({ id, title: (title || "").slice(0, 80), location: (location || "").slice(0, 80), start, end, allDay }));
  const done = (evs, provider) => { C.events = keep(evs); C.provider = provider; C.synced = Date.now(); C.consent = true; game.emit("calendar"); game.journal("calendar", `📅 Đồng bộ lịch: ${C.events.length} sự kiện`); return C.events.length; };
  const api = {
    C,
    get connected() { return !!C.provider; },
    async connectGoogle() { const t = await googleToken("consent"); token = t.access_token; return done(await googleEvents(token), "google"); },
    async connectIcsUrl(url) {
      url = url.trim().replace(/^webcal:/i, "https:"); if (!/^https:\/\//i.test(url)) throw new Error("Link phải bắt đầu bằng https:// hoặc webcal://");
      let txt = null;
      try { const r = await fetch(url); if (r.ok) txt = await r.text(); } catch { /* CORS – thử qua proxy */ }
      if (!txt) { if (!CAL.proxy) throw new Error("Máy chủ lịch chặn đọc trực tiếp – cần deploy worker/cal-proxy (README – Bước 11)"); const r = await fetch(CAL.proxy + "?url=" + encodeURIComponent(url)); if (!r.ok) throw new Error("Proxy lỗi " + r.status); txt = await r.text(); }
      if (!txt.includes("BEGIN:VCALENDAR")) throw new Error("Link này không phải lịch iCal (.ics)");
      C.url = url; return done(parseICS(txt), "ics");
    },
    async importFile(file) { const txt = await file.text(); if (!txt.includes("BEGIN:VCALENDAR")) throw new Error("File không phải .ics"); return done(parseICS(txt), "file"); },
    /** làm mới khi mở app (Google cần token còn hạn – hết thì im lặng, không bật cửa sổ) */
    async refresh() {
      if (Date.now() - C.synced < 15 * 60e3) return;
      try {
        if (C.provider === "ics" && C.url) await api.connectIcsUrl(C.url);
        else if (C.provider === "google") { if (!token) { const t = await googleToken(""); token = t.access_token; } done(await googleEvents(token), "google"); }
      } catch (e) { if (e.reauth) token = null; game.emit("calendar-error", e.message); }
    },
    disconnect() { if (token && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(token, () => {}); token = null; Object.assign(C, { provider: null, url: "", events: [], synced: 0, overrides: {} }); game.emit("calendar"); },
    kindOf: (ev) => classify(ev, C.overrides),
    setKind(id, k) { C.overrides[id] = k; game.emit("calendar"); },
    /** sự kiện có liên quan tới 1 ngày (00:00 → 06:00 hôm sau) */
    eventsOn(day) { const a = new Date(day).setHours(0, 0, 0, 0), b = a + DAY + 6 * 3600e3; return C.events.filter((e) => e.end > a && e.start < b); },
    upcoming(n = 7) { const now = Date.now(), b = now + n * DAY; return C.events.filter((e) => e.end > now && e.start < b); },
  };
  return api;
}
