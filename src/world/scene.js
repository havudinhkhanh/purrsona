// Sân khấu: dựng phòng, máy quay đi theo mèo, ánh sáng theo giờ thật, chuyển cảnh giữa các phòng.
import { ROOMS } from "./rooms.js";
import { H } from "./art.js";
import { clamp, lerp, $ } from "../core/util.js";

const scopeIds = (svg, rid) => svg.replace(/id="([^"]+)"/g, `id="$1-${rid}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${rid})`);

/** bảng màu ánh sáng theo giờ (giờ thập phân 0–24) – nội suy giữa các mốc */
const SKY = [
  // h,  sk1 (đỉnh trời), sk2 (chân trời), shade (phủ tối), shadeA, glow, sunO, starO, beam, city1, city2, winO
  [0,    "#0E1630", "#26345C", "#1B2347", 0.7, 1, 0, 1, 0, "#1a2240", "#121833", 1],
  [5,    "#1A2448", "#4A4E78", "#2A2E55", 0.45, 0.8, 0, 0.6, 0, "#262c50", "#1b2042", 0.8],
  [6.2,  "#F5B48A", "#FBE3C2", "#F2A27A", 0.16, 0.2, 0.8, 0, 0.3, "#9C8AA8", "#7E6E92", 0.2],
  [8,    "#8EC5EC", "#DDF0FA", "#ffffff", 0, 0, 1, 0, 0.55, "#9DB3C8", "#7F96AE", 0],
  [15.5, "#7DBDE8", "#D6EEF8", "#ffffff", 0, 0, 1, 0, 0.7, "#9DB3C8", "#7F96AE", 0],
  [17.4, "#F2A867", "#FCD9A2", "#F0A060", 0.14, 0.15, 1, 0, 0.9, "#B08A8A", "#8C6C78", 0.2],
  [18.6, "#7A5FA0", "#E9907A", "#6C4E8C", 0.3, 0.6, 0.4, 0.3, 0.3, "#5a4a74", "#45385e", 0.7],
  [19.6, "#202A55", "#4A4677", "#232A52", 0.6, 1, 0, 0.8, 0, "#2a2c52", "#1d2044", 1],
  [24,   "#0E1630", "#26345C", "#1B2347", 0.7, 1, 0, 1, 0, "#1a2240", "#121833", 1],
];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a, b, t) => "#" + hex(a).map((v, i) => Math.round(lerp(v, hex(b)[i], t)).toString(16).padStart(2, "0")).join("");
export function lightAt(hour) {
  let i = 0; while (i < SKY.length - 2 && SKY[i + 1][0] <= hour) i++;
  const A = SKY[i], B = SKY[i + 1], t = clamp((hour - A[0]) / (B[0] - A[0]), 0, 1);
  const m = (k) => (typeof A[k] === "string" ? mixHex(A[k], B[k], t) : lerp(A[k], B[k], t));
  return { sk1: m(1), sk2: m(2), shade: m(3), shadeA: m(4), glow: m(5), sun: m(6), star: m(7), beam: m(8), city1: m(9), city2: m(10), win: m(11), night: clamp(m(4) / 0.62, 0, 1) };
}

export function createScene(root) {
  const vp = document.createElement("div"); vp.className = "viewport"; root.appendChild(vp);
  const S = { vp, room: null, el: null, stage: null, actors: null, fx: null, sc: 1, cam: 0, camV: 0, follow: true, manualUntil: 0, W: 1600, viewW: 1, hour: 12, busy: false, forceHour: null };

  function build(id) {
    const R = ROOMS[id];
    const el = document.createElement("div"); el.className = "room"; el.dataset.room = id;
    const st = document.createElement("div"); st.className = "stage"; st.style.width = R.W + "px"; st.style.height = H + "px";
    const bg = R.bgImage ? `<img class="bg-img" src="${R.bgImage}" alt="">` : `<svg class="bg" viewBox="0 0 ${R.W} ${H}" preserveAspectRatio="none">${scopeIds(R.bg(R.W), id)}</svg>`;
    const prop = (p, dyn) => `<svg class="prop${dyn ? " dyn" : ""}" data-prop="${p.id}" viewBox="0 0 ${R.W} ${H}" style="z-index:${Math.round(p.z)}">${scopeIds(p.svg, id + p.id)}</svg>`;
    const props = R.props.map((p) => prop(p)).join("") + (api.extraProps?.(id) || []).map((p) => prop(p, 1)).join("");
    api._prop = prop;
    const glows = (R.lights || []).map((l) => `<div class="glow ${l.day ? "day" : ""}" style="left:${l.x - l.r}px;top:${l.y - l.r}px;width:${l.r * 2}px;height:${l.r * 2}px"></div>`).join("");
    st.innerHTML = `${bg}${props}<div class="actors"></div><div class="fx"></div><div class="shade"></div>${glows}<div class="topfx"></div>`;
    el.appendChild(st);
    return { el, st };
  }
  function layout() {
    const vw = vp.clientWidth, vh = vp.clientHeight, W = ROOMS[S.room].W;
    S.sc = Math.max(vh / H, vw / W); S.viewW = vw / S.sc; S.W = W; S.vh = vh; S.vw = vw;
    for (const r of vp.querySelectorAll(".room")) { const st = r.firstElementChild; st.style.transform = `scale(${S.sc})`; r.style.height = H * S.sc + "px"; }
    S.cam = clamp(S.cam, 0, Math.max(0, W - S.viewW)); place();
  }
  function place() { if (S.stage) S.stage.style.translate = `${-S.cam * S.sc}px 0`; }

  const api = {
    S,
    get room() { return S.room; },
    get actors() { return S.actors; },
    get fx() { return S.fx; },
    get topfx() { return S.stage.querySelector(".topfx"); },
    get stage() { return S.stage; },
    room0: null,
    /** dựng phòng đầu tiên */
    show(id, camX) {
      vp.innerHTML = ""; S.room = id; const { el, st } = build(id); vp.appendChild(el); S.el = el; S.stage = st; S.actors = st.querySelector(".actors"); S.fx = st.querySelector(".fx");
      layout(); S.cam = clamp(camX ?? 0, 0, Math.max(0, S.W - S.viewW)); place(); api.light(); api.onRoom?.(id);
    },
    /** chuyển cảnh sang phòng khác. dir = +1: phòng mới trượt vào từ phải */
    async go(id, dir, camAt) {
      if (S.busy || id === S.room) return; S.busy = true;
      const old = S.el, { el, st } = build(id); el.classList.add("enter"); vp.appendChild(el);
      const prevRoom = S.room; S.room = id; S.el = el; S.stage = st; S.actors = st.querySelector(".actors"); S.fx = st.querySelector(".fx");
      layout(); S.cam = clamp(camAt ?? (dir > 0 ? 0 : S.W), 0, Math.max(0, S.W - S.viewW)); place(); api.light();
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.style.transform = `translateX(${dir * 100}%)`; old.style.transform = "translateX(0)";
      el.getBoundingClientRect();
      el.classList.add("sliding"); old.classList.add("sliding", "leave");
      el.style.transform = "translateX(0)"; old.style.transform = `translateX(${-dir * 38}%)`;
      api.onRoom?.(id, prevRoom);
      await new Promise((r) => setTimeout(r, reduce ? 10 : 760));
      old.remove(); el.classList.remove("sliding", "enter"); el.style.transform = ""; S.busy = false;
    },
    /** máy quay: bám theo x (toạ độ phòng) – mượt, có nhìn trước theo hướng mèo */
    track(x, face, dt) {
      if (S.busy) return;
      if (!S.follow || performance.now() < S.manualUntil) return;
      const max = Math.max(0, S.W - S.viewW), tgt = clamp(x - S.viewW / 2 + face * S.viewW * 0.08, 0, max);
      const k = 1 - Math.exp((-dt * 2.6) / (S.camSoft || 1)); S.cam = lerp(S.cam, tgt, k); place();
    },
    pan(dx) { S.cam = clamp(S.cam + dx, 0, Math.max(0, S.W - S.viewW)); S.manualUntil = performance.now() + 6000; place(); },
    /** toạ độ màn hình → toạ độ phòng */
    toRoom(cx, cy) { const r = vp.getBoundingClientRect(), top = r.height - H * S.sc; return { x: S.cam + (cx - r.left) / S.sc, y: (cy - r.top - top) / S.sc }; },
    toScreen(x, y) { const r = vp.getBoundingClientRect(), top = r.height - H * S.sc; return { x: r.left + (x - S.cam) * S.sc, y: r.top + top + y * S.sc }; },
    /** ánh sáng theo giờ thật (hoặc giờ ép để xem thử) */
    light(hour) {
      const d = new Date(); S.hour = hour ?? S.forceHour ?? d.getHours() + d.getMinutes() / 60;
      const L = lightAt(S.hour), st = vp.style;
      if (S.weather === "storm") { L.sk1 = mixHex(L.sk1, "#4a525e", 0.75); L.sk2 = mixHex(L.sk2, "#6d7682", 0.75); L.shadeA = Math.max(L.shadeA, 0.32); L.shade = mixHex(L.shade, "#5a6474", 0.6); L.sun = 0; L.beam = 0; L.glow = Math.max(L.glow, 0.55); }
      st.setProperty("--sk1", L.sk1); st.setProperty("--sk2", L.sk2); st.setProperty("--shade", L.shade); st.setProperty("--shadeA", L.shadeA.toFixed(3));
      st.setProperty("--glowO", L.glow.toFixed(3)); st.setProperty("--sunO", L.sun.toFixed(3)); st.setProperty("--starO", L.star.toFixed(3)); st.setProperty("--beamO", L.beam.toFixed(3));
      st.setProperty("--city1", L.city1); st.setProperty("--city2", L.city2); st.setProperty("--winO", L.win.toFixed(3));
      vp.dataset.night = L.night > 0.5 ? "1" : "0"; S.night = L.night; S.day = L.beam > 0.3;
      return L;
    },
    resize: layout,
    /** vẽ lại đồ động của phòng đang xem (cốc vỡ, hộp giấy, đồ Tết…) */
    refreshDyn() { if (!S.stage) return; S.stage.querySelectorAll(".prop.dyn").forEach((n) => n.remove()); const bg = S.stage.querySelector(".bg,.bg-img"); bg.insertAdjacentHTML("afterend", (api.extraProps?.(S.room) || []).map((p) => api._prop(p, 1)).join("")); },
    propEl(id) { return S.stage?.querySelector(`.prop[data-prop="${id}"]`); },
    /** thời tiết: null | "storm" */
    weather(w) { S.weather = w; vp.dataset.weather = w || ""; api.light(); },
    flash() { const f = document.createElement("div"); f.className = "flash"; vp.appendChild(f); setTimeout(() => f.remove(), 900); },
  };
  addEventListener("resize", () => S.room && layout());
  return api;
}
