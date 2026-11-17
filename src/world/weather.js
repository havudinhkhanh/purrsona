// THỜI TIẾT trên khu vườn: nắng, nắng chói chang, mây, gió, mưa, giông.
// Nguồn: trời thật (Open-Meteo, miễn phí, không cần khoá – chỉ gửi toạ độ làm tròn 1 số lẻ ≈ 10 km)
// hoặc tự đổi theo giờ (khi tắt mạng / người dùng chọn). Vẽ bằng 1 canvas nét mực, rẻ cho máy yếu.
import { clamp, lerp, rng, dayKey } from "../core/util.js";
import { HOUSE, UW, UH } from "./yard.js";

export const WX = {
  clear: { vi: "Nắng nhẹ", emo: "🌤" }, hot: { vi: "Nắng chói chang", emo: "☀️" }, cloudy: { vi: "Nhiều mây", emo: "☁️" },
  wind: { vi: "Gió lớn", emo: "🍃" }, rain: { vi: "Mưa", emo: "🌧" }, storm: { vi: "Giông", emo: "⛈" },
};
const HCM = { lat: 10.8, lon: 106.7, name: "TP. Hồ Chí Minh" };

/** mã thời tiết WMO + gió + nhiệt → loại của mình */
function classify(c) {
  const code = c.weather_code, wind = c.wind_speed_10m || 0, t = c.apparent_temperature ?? c.temperature_2m ?? 30;
  if (code >= 95) return "storm";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (c.precipitation || 0) > 0.2) return "rain";
  if (wind >= 28) return "wind";
  if (code <= 1 && c.is_day && t >= 33) return "hot";
  if ((c.cloud_cover ?? 0) >= 75 || code === 3 || code === 45 || code === 48) return "cloudy";
  return c.is_day && t >= 34 ? "hot" : "clear";
}
/** tự đổi: mỗi khung 2 giờ một kiểu, mùa mưa (5–11) chiều hay mưa */
function simulate() {
  const d = new Date(), h = d.getHours(), slot = Math.floor(h / 2), r = rng(`wx|${dayKey()}|${slot}`)();
  const wet = d.getMonth() >= 4 && d.getMonth() <= 10, aft = h >= 13 && h <= 19;
  const pRain = wet ? (aft ? 0.45 : 0.18) : 0.08, pStorm = wet && aft ? 0.12 : 0.02;
  if (r < pStorm) return "storm"; if (r < pRain) return "rain"; if (r < pRain + 0.12) return "wind";
  if (h >= 10 && h <= 15 && r > 0.55) return "hot"; if (r > 0.85) return "cloudy"; return "clear";
}

export function createWeather(game) {
  const s = game.save, Y = game.yard, S = Y.S;
  s.settings.wx ||= { mode: "real", fixed: "rain", place: null };
  const W = s.settings.wx;
  const cv = document.createElement("canvas"); cv.className = "wx"; Y.vp.insertBefore(cv, Y.vp.querySelector(".shade"));
  const fog = document.createElement("div"); fog.className = "wxfog"; Y.vp.insertBefore(fog, Y.vp.querySelector(".shade"));
  const ctx = cv.getContext("2d");
  const st = { kind: "clear", temp: null, place: (W.place || HCM).name, src: "sim", rain: 0, wind: 0, sun: 0, cloud: 0, flash: 0 };
  let drops = [], leaves = [], clouds = [], splashes = [], dpr = 1, nextBolt = 0, bolt = null;

  function size() { dpr = Math.min(document.documentElement.classList.contains("lite") ? 1.25 : 2, devicePixelRatio || 1); cv.width = S.vw * dpr; cv.height = S.vh * dpr; cv.style.width = S.vw + "px"; cv.style.height = S.vh + "px"; }
  const inHouse = (u, v) => u > HOUSE.u0 - 1 && v < HOUSE.v1 + 1;
  const newDrop = (fresh) => { let u, v; do { u = Math.random() * UW; v = Math.random() * UH; } while (inHouse(u, v)); return { u, v, h: fresh ? Math.random() * 60 : 50 + Math.random() * 20, sp: 70 + Math.random() * 40 }; };
  const newLeaf = () => ({ x: st.windDir > 0 ? -20 : S.vw + 20, y: S.vh * (0.25 + Math.random() * 0.6), ph: Math.random() * 6, sp: 120 + Math.random() * 140, r: Math.random() * 6 });

  // độ mạnh từng thành phần chuyển dần (không bật tắt giật cục)
  const target = () => ({ rain: { rain: 0.55, storm: 1 }[st.kind] || 0, wind: { wind: 1, storm: 0.85, rain: 0.15, cloudy: 0.2 }[st.kind] || 0, sun: { hot: 1, clear: 0.45 }[st.kind] || 0, cloud: { cloudy: 1, rain: 0.6, storm: 0.9, wind: 0.4 }[st.kind] || 0 });
  st.windDir = 1;

  function set(kind, src = st.src) {
    if (!WX[kind]) return; const prev = st.kind; st.kind = kind; st.src = src;
    Y.vp.dataset.wx = kind;
    if (prev !== kind) game.emit("weather", { kind, prev });
  }
  async function fetchReal() {
    const p = W.place || HCM;
    try {
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat.toFixed(1)}&longitude=${p.lon.toFixed(1)}&current=temperature_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,is_day&timezone=auto`;
      const r = await fetch(u, { cache: "no-store" }); if (!r.ok) throw 0; const j = await r.json(), c = j.current;
      st.temp = Math.round(c.temperature_2m); s.wxCache = { at: Date.now(), kind: classify(c), temp: st.temp }; set(s.wxCache.kind, "real"); return true;
    } catch { return false; }
  }
  async function refresh() {
    if (W.mode === "off") { set("clear", "off"); return; }
    if (W.mode === "fixed" && game.can?.("weather.pick")) { set(W.fixed, "fixed"); return; }
    if (W.mode === "real") {
      if (s.wxCache && Date.now() - s.wxCache.at < 25 * 60e3) { st.temp = s.wxCache.temp; set(s.wxCache.kind, "real"); return; }
      if (await fetchReal()) return;
    }
    st.temp = null; set(simulate(), "sim");
  }

  // ------------------------------------------------------------------ vẽ mỗi khung hình
  let t0 = 0;
  function tick(dt) {
    if (S.vw * dpr !== cv.width || S.vh * dpr !== cv.height) size();
    const T = target(), k = 1 - Math.exp(-dt * 0.6);
    for (const key of ["rain", "wind", "sun", "cloud"]) st[key] = lerp(st[key], s.settings.reduced ? T[key] * 0.4 : T[key], k);
    fog.style.opacity = (st.rain * 0.22 + st.cloud * 0.1).toFixed(3);
    Y.vp.style.setProperty("--sunA", (st.sun * (S.night > 0.5 ? 0 : 1)).toFixed(3));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, S.vw, S.vh);
    t0 += dt; const kk = S.k, ink = "rgba(31,31,31,";
    // nắng: vầng mặt trời + tia gạch nét ở góc phải trên; chói chang thì tia dài, xoay chậm, có hơi nóng bốc lên
    if (st.sun > 0.02 && S.night < 0.6) {
      const a = st.sun * (1 - S.night), cx = S.vw * 0.97, cy = S.vh * (S.portrait ? 0.15 : 0.06), R = Math.min(S.vw, S.vh) * (0.06 + 0.03 * a);
      ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = ink + (0.5 * a).toFixed(3) + ")"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.stroke();
      const n = 14, rot = t0 * 0.05;
      for (let i = 0; i < n; i++) { const ang = rot + (i / n) * Math.PI * 2, L = R * (1.5 + (i % 2) * 0.6 + a * 1.4); ctx.beginPath(); ctx.moveTo(Math.cos(ang) * R * 1.25, Math.sin(ang) * R * 1.25); ctx.lineTo(Math.cos(ang) * L, Math.sin(ang) * L); ctx.stroke(); }
      if (st.kind === "hot") {      // tia chói quét xuống vườn
        ctx.strokeStyle = ink + (0.07 * a).toFixed(3) + ")"; ctx.lineWidth = 1;
        for (let i = 0; i < 26; i++) { const ang = Math.PI * 0.55 + (i / 26) * Math.PI * 0.42 + Math.sin(t0 * 0.2 + i) * 0.01; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ang) * S.vw * 1.2, Math.sin(ang) * S.vw * 1.2); ctx.stroke(); }
      }
      ctx.restore();
      if (st.kind === "hot") {      // hơi nóng bốc lên: vài nét lượn sóng mờ trên mặt đất
        ctx.strokeStyle = ink + (0.16 * a).toFixed(3) + ")"; ctx.lineWidth = 1.1;
        for (let i = 0; i < 9; i++) { const u = (i * 13 + 7) % 60, v = 20 + ((i * 17) % 40), [x, y] = Y.P(u, v), ph = t0 * 1.6 + i; ctx.beginPath(); for (let j = 0; j <= 12; j++) { const yy = y - j * 3 - ((t0 * 14 + i * 9) % 26); ctx.lineTo(x + Math.sin(ph + j * 0.7) * 2.5, yy); } ctx.stroke(); }
      }
    }
    // mây: bóng mây gạch chéo trôi ngang mặt vườn
    if (st.cloud > 0.03) {
      while (clouds.length < 3) clouds.push({ u: -30 - Math.random() * 60, v: 8 + Math.random() * 48, r: 14 + Math.random() * 12, sp: 1.2 + Math.random() });
      ctx.save(); ctx.globalAlpha = 0.16 * st.cloud; ctx.fillStyle = "#3b3d44";
      for (const c of clouds) { c.u += c.sp * dt * (1 + st.wind * 3) * st.windDir; if (c.u > UW + 40) c.u = -40; if (c.u < -60) c.u = UW + 30; const [x, y] = Y.P(c.u, c.v); ctx.beginPath(); ctx.ellipse(x, y, c.r * kk, c.r * kk * 0.42, -0.2, 0, 7); ctx.fill(); }
      ctx.restore();
    }
    // gió: lá bay ngang + vệt gió cong
    if (st.wind > 0.05) {
      const want = Math.round(14 * st.wind); while (leaves.length < want) leaves.push(newLeaf());
      ctx.strokeStyle = ink + (0.6 * st.wind).toFixed(3) + ")"; ctx.lineWidth = 1.3; ctx.fillStyle = "rgba(251,250,246,.9)";
      leaves = leaves.filter((L) => L.x > -40 && L.x < S.vw + 40);
      for (const L of leaves) {
        L.x += L.sp * dt * st.windDir * (0.5 + st.wind); L.y += Math.sin(t0 * 3 + L.ph) * 40 * dt; L.r += dt * 4;
        ctx.save(); ctx.translate(L.x, L.y); ctx.rotate(L.r); ctx.beginPath(); ctx.ellipse(0, 0, 7, 3.2, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.stroke(); ctx.restore();
      }
      ctx.strokeStyle = ink + (0.18 * st.wind).toFixed(3) + ")"; ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) { const y = S.vh * (0.2 + i * 0.12), off = ((t0 * 260 * st.windDir + i * 337) % (S.vw + 400)) - 200, x = st.windDir > 0 ? off : S.vw - off; ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 40, y - 8, x + 80, y + 8, x + 130, y - 2); ctx.stroke(); }
    }
    // mưa: hạt rơi theo phối cảnh tới đúng điểm trên mặt đất (tránh trong nhà), chạm đất thì bắn vòng nước
    if (st.rain > 0.03) {
      const want = Math.round((st.kind === "storm" ? 240 : 140) * st.rain); while (drops.length < want) drops.push(newDrop(true)); if (drops.length > want) drops.length = want;
      const lean = 0.35 * st.wind * st.windDir;
      ctx.strokeStyle = ink + (0.5 * Math.min(1, st.rain + 0.2)).toFixed(3) + ")"; ctx.lineWidth = 1.15; ctx.beginPath();
      for (const d of drops) {
        d.h -= d.sp * dt;
        if (d.h <= 0) { splashes.push({ u: d.u, v: d.v, t: 0 }); Object.assign(d, newDrop(false)); continue; }
        const [x1, y1] = Y.P(d.u + lean * d.h, d.v, d.h), [x2, y2] = Y.P(d.u + lean * (d.h + 5), d.v, d.h + 5);
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      }
      ctx.stroke();
      ctx.lineWidth = 1; splashes = splashes.filter((p) => (p.t += dt) < 0.35);
      for (const p of splashes) { const [x, y] = Y.P(p.u, p.v), r = 2 + p.t * 22; ctx.strokeStyle = ink + (0.35 * (1 - p.t / 0.35)).toFixed(3) + ")"; ctx.beginPath(); ctx.ellipse(x, y, r * kk * 0.12, r * kk * 0.05, 0, 0, 7); ctx.stroke(); }
    } else { drops.length = 0; splashes.length = 0; }
    // giông: chớp – loé trắng + tia sét gãy khúc ở góc trời
    if (st.kind === "storm" && !s.settings.reduced) {
      if (t0 > nextBolt) { nextBolt = t0 + 6 + Math.random() * 10; st.flash = 1; const x = S.vw * (0.2 + Math.random() * 0.6); bolt = { pts: Array.from({ length: 7 }, (_, i) => [x + (Math.random() - 0.5) * 50, i * S.vh * 0.045]), t: 0 }; game.emit("thunder"); }
      if (st.flash > 0) { st.flash = Math.max(0, st.flash - dt * 3); ctx.fillStyle = `rgba(255,255,255,${(st.flash * 0.55).toFixed(3)})`; ctx.fillRect(0, 0, S.vw, S.vh); }
      if (bolt && (bolt.t += dt) < 0.25) { ctx.strokeStyle = ink + ".85)"; ctx.lineWidth = 2.2; ctx.beginPath(); bolt.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
    }
    // cây lắc theo gió
    Y.sway?.(st.wind * (0.6 + 0.4 * Math.sin(t0 * 2.3)) * st.windDir);
  }

  const api = {
    st, tick, refresh, set,
    get kind() { return st.kind; }, get raining() { return st.kind === "rain" || st.kind === "storm"; }, get hot() { return st.kind === "hot"; }, get windy() { return st.kind === "wind" || st.kind === "storm"; },
    label() { return `${WX[st.kind].emo}${st.temp != null ? ` ${st.temp}°` : ""}`; },
    async useMyPlace() {
      return new Promise((res) => {
        if (!navigator.geolocation) return res(false);
        navigator.geolocation.getCurrentPosition((p) => { W.place = { lat: Math.round(p.coords.latitude * 10) / 10, lon: Math.round(p.coords.longitude * 10) / 10, name: "Chỗ bạn" }; W.mode = "real"; s.wxCache = null; refresh().then(() => res(true)); }, () => res(false), { maximumAge: 3600e3, timeout: 8000 });
      });
    },
  };
  size(); refresh(); setInterval(refresh, 10 * 60e3);
  addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  return api;
}
