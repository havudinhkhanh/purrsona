// Bộ vẽ VECTOR (biến hình đường viền) – dùng cho na. Tuân theo hợp đồng renderer (xem src/render/registry.js).
import { decodePose, mapOf, morph, morphMap, pathOf, extentOf, f1 } from "./morph.js";

const NS = "http://www.w3.org/2000/svg";
const easeIO = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const ACC = {
  fedora: `<g class="acc fed"><polygon class="ht" points="-30,-4 30,-12 33,-7 -27,2"/><polygon class="ht" points="-20,-6 -17,-30 -3,-34 4,-30 19,-32 22,-11"/><polygon class="hb" points="-19.5,-10 21.5,-15.5 21,-20 -18.5,-14.5"/></g>`,
  shades: `<g class="acc shd"><path class="gr" d="M-6 0 L-24 -2"/><polygon class="gl" points="-8,-4 14,-6 13,4 2,6 -7,2"/><path class="gh" d="M-2 3 L2 -4 M4 4 L8 -4"/></g>`,
  bow: `<g class="acc bow"><path class="bw" d="M-14 26 l-9 -7 l1 14 z M-14 26 l9 -7 l-1 14 z"/><circle class="bwc" cx="-14" cy="26" r="3"/></g>`,
};

export async function createVectorRenderer(man, base) {
  const get = (f) => fetch(new URL(f, base)).then((r) => { if (!r.ok) throw new Error(f + " " + r.status); return r.json(); });
  const raw = await get(man.poses);
  const POSE = {};
  for (const k in raw) POSE[k] = decodePose(k, raw[k], !!(man.flip || {})[k], (man.eyeAnchors || {})[k]);
  const SHEET = {}, CLIP = man.clips;
  const loadSheet = async (nm) => {
    const d = await get(man.sheets[nm]);
    const F = d.f.map((v, i) => (POSE[nm + i] = decodePose(nm + i, v)));
    const T = [0]; (d.w || []).forEach((w, i) => T.push(T[i] + w));
    F.T = T; F.W = d.w; F.hard = new Set(d.hard || []); SHEET[nm] = F;
    // tính sẵn cách khớp điểm cặp khung kề lúc rảnh → khi chạy không khựng
    let k = 0; const n = F.length;
    const warm = () => { const t0 = performance.now(); while (k < n && performance.now() - t0 < 6) { const j = (k + 1) % n; if (j || d.loop) mapOf(F[k], F[j], !(F.hard.has(k) || j < k)); k++; } if (k < n) (window.requestIdleCallback || setTimeout)(warm); };
    (window.requestIdleCallback || setTimeout)(warm);
  };
  // tải bảng khung sau (nặng) – trong lúc chờ dùng dáng dự phòng (fb)
  const sheetsReady = Promise.allSettled(Object.keys(man.sheets || {}).map(loadSheet));

  // ------------------------------------------------------------------ DOM
  const el = document.createElement("div"); el.className = "cr cr-vector";
  const vb = man.viewBox || [-200, -262, 400, 272];
  el.innerHTML = `<svg xmlns="${NS}" class="cat-svg" viewBox="${vb.join(" ")}" aria-hidden="true"><g class="bd"><g class="og" style="opacity:0"><path class="b"/><path class="gd"/><path class="pk"/></g><g class="mn"><circle class="eyeb" r="9"/><circle class="eyeg" r="4.2"/><path class="b" fill-rule="nonzero"/><path class="gd"/><path class="pk"/><g class="accw"></g></g></g></svg>`;
  const svg = el.firstElementChild, q = (s) => svg.querySelector(s);
  const R = { bd: q(".bd"), mn: q(".mn"), b: q(".mn .b"), gd: q(".mn .gd"), pk: q(".mn .pk"), eyeb: q(".eyeb"), eyeg: q(".eyeg"), acc: q(".accw"), og: q(".og"), ob: q(".og .b"), ogd: q(".og .gd"), opk: q(".og .pk") };
  const col = man.colors || {};
  for (const [k, v] of Object.entries({ "--fur": col.fur, "--eye": col.eye, "--gold": col.gold, "--tongue": col.tongue })) if (v) el.style.setProperty(k, v);
  let skin = "classic";

  // ------------------------------------------------------------------ trình phát
  const A = { sh: POSE.sit || Object.values(POSE)[0], snap: null, map: null, rmap: null, dis: false, t0: 0, dur: 1, clip: null, name: "", ct: 0, ph: 0, done: false, gx: null };
  const has = (n) => !!CLIP[n];
  const HUBS = man.hubs || ["sit", "loaf", "crouch", "lie"];
  const fbOf = (c) => (typeof c.fb === "string" ? CLIP[c.fb] : c.fb) || CLIP.idle;
  const startOf = (c) => (c.sheet ? (SHEET[c.sheet] ? SHEET[c.sheet][c.a || 0] : startOf(fbOf(c))) : POSE[c.p || (c.seq || c.loop)[0]]);
  const sheetSpan = (c) => { const F = SHEET[c.sheet], a = c.a || 0, b = c.b ?? F.length - 1, T = F.T; if (!F.W) return b - a + (c.loop ? 1 : 0); let t = T[b] - T[a]; if (c.loop) t += b === F.length - 1 && F.W.length === F.length ? F.W[b] : 1; return t; };
  function sheetAt(c, ph) {
    const F = SHEET[c.sheet], a = c.a || 0, b = c.b ?? F.length - 1, T = F.T, W = F.W;
    if (!W) { const k = Math.floor(ph), i = a + Math.min(k, b - a); const j = i < b ? i + 1 : c.loop ? a : i; return [i, j, ph - k]; }
    const t = T[a] + ph; let lo = a, hi = b;
    if (t >= T[b]) { const wl = c.loop ? (b === F.length - 1 && W.length === F.length ? W[b] : 1) : 1; return c.loop ? [b, a, Math.min(1, (t - T[b]) / wl)] : [b, b, 0]; }
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= t) lo = m; else hi = m; }
    return [lo, lo + 1, (t - T[lo]) / (W[lo] || 1)];
  }
  let adv = 0;      // quãng đường động tác tự đi (đơn vị hình) trong khung này – vd. lăn lộn xong đi vài bước
  function shapeOf(c, dt, v) {
    if (c.sheet) {
      const F = SHEET[c.sheet]; if (!F) return shapeOf(fbOf(c), dt, v);
      const span = sheetSpan(c), rate = c.upf && v > 0 ? v / c.upf : c.fps;
      if (c.loop) A.ph = (A.ph + dt * rate) % span; else { A.ph = Math.min(span, A.ph + dt * rate); if (A.ph >= span) A.done = true; }
      const [i, j, u] = sheetAt(c, A.ph);
      if (c.mv && i >= c.mv[0] && i < c.mv[1]) adv += c.mv[2] * dt;
      if (i === j || u < 0.004) return F[i];
      const hard = F.hard.has(i) || j < i;
      if (hard && mapOf(F[i], F[j]).cost > 0.5) { A.gx = [F[i], Math.min(1, (1 - u) * 2), Math.min(1, u * 2)]; return F[j]; }
      return morph(F[i], F[j], u, true, !hard);
    }
    if (c.loop) {
      if (c.per) A.ph = (A.ph + dt / c.per) % 1; else A.ph = (A.ph + (Math.max(v, c.minRate || 0) * dt) / c.stride) % 1;
      const Lp = c.loop, n = Lp.length;
      if (n > 2) { const f = A.ph * n, i = Math.floor(f) % n; return morph(POSE[Lp[i]], POSE[Lp[(i + 1) % n]], f - Math.floor(f), true); }
      const w = (0.5 - 0.5 * Math.cos(2 * Math.PI * A.ph)) * (c.amt || 1); return morph(POSE[Lp[0]], POSE[Lp[1]], w, true);
    }
    if (c.osc) { const w = c.osc[1] * (0.5 - 0.5 * Math.cos((2 * Math.PI * A.ct) / c.osc[2])); return morph(POSE[c.p], POSE[c.osc[0]], w, true); }
    return POSE[c.p];
  }

  function draw(sh, tf) {
    R.b.setAttribute("d", pathOf(sh, [0, 1])); R.gd.setAttribute("d", pathOf(sh, [2])); R.pk.setAttribute("d", pathOf(sh, [3]));
    R.bd.setAttribute("transform", tf);
    const e = sh.eye, k = sh.eyeK ?? 1;
    if (e) { for (const c of [R.eyeb, R.eyeg]) { c.setAttribute("cx", f1(e[0])); c.setAttribute("cy", f1(e[1])); } R.eyeb.style.opacity = k; R.eyeg.style.opacity = k; }
    else { R.eyeb.style.opacity = 0; R.eyeg.style.opacity = 0; }
    const hasHat = sh.polys.some((p) => p.t === 2);
    if (e && !hasHat && skin !== "classic") { R.acc.setAttribute("transform", `translate(${f1(e[0] - (skin === "fedora" ? 8 : 0))} ${f1(e[1] - (skin === "fedora" ? 16 : 0))})`); R.acc.style.opacity = k; } else R.acc.style.opacity = 0;
  }
  function ghost(sh, a, b) {
    if (!sh) { if (A.ogOn) { R.og.style.opacity = 0; R.mn.style.opacity = ""; A.ogOn = false; } return; }
    R.ob.setAttribute("d", pathOf(sh, [0, 1])); R.ogd.setAttribute("d", pathOf(sh, [2])); R.opk.setAttribute("d", pathOf(sh, [3]));
    R.og.style.opacity = a.toFixed(3); R.mn.style.opacity = b.toFixed(3); A.ogOn = true;
  }

  const api = {
    kind: "vector", el, ready: Promise.resolve(), sheetsReady, manifest: man,
    has,
    info(name) { const c = CLIP[name] || {}; return { loop: !!(c.loop || (!c.sheet && !c.seq)), speed: c.speed || 0, moves: !!(c.upf || c.stride) }; },
    /** chuyển sang động tác – tự hoà / nắn hình từ dáng đang có */
    play(name, { restart = false, dur } = {}) {
      const c = CLIP[name]; if (!c) return;
      if (A.clip === c && !restart) return;
      const tg = startOf(c); A.snap = A.sh; A.map = mapOf(A.sh, tg); A.t0 = performance.now(); A.clip = c; A.name = name; A.ct = 0; A.ph = 0; A.done = false;
      A.dis = A.map.cost > 0.4; A.bridge = null;
      // 2 dáng khác xa nhau → tìm 1 dáng "trạm" (ngồi / ổ bánh mì / thủ thế / nằm) để nắn hình qua 2 chặng, thay vì hoà mờ 2 con mèo chồng nhau
      if (A.dis) {
        let best = null;
        for (const h of HUBS) { const P = POSE[h]; if (!P || P === tg || P === A.sh) continue; const m1 = mapOf(A.sh, P), m2 = mapOf(P, tg), c = Math.max(m1.cost, m2.cost); if (c < 0.42 && (!best || c < best.c)) best = { m1, m2, c }; }
        if (best) { A.dis = false; A.bridge = best; } else A.rmap = mapOf(tg, A.snap);
      }
      A.dur = dur || (A.bridge ? 640 : A.dis ? 380 : ["sleep", "lie", "roll", "stretch"].includes(name) ? 620 : 420);
      A.dur *= api.durMul || 1; if (api.reduced) A.dur = 1;
    },
    get clip() { return A.name; },
    /** pha hiện tại của clip (công cụ xuất khung dùng để đo chu kỳ vòng lặp) */
    _phase() { return A.clip?.osc || A.clip?.br ? A.ct : A.ph; },
    get done() { return A.done; },
    /** dt giây · v = tốc độ trên mặt đất (đơn vị hình / giây) để chân khớp đất · trả về quãng tự đi */
    update(dt, v = 0) {
      if (!A.clip) return 0; adv = 0; A.ct += dt; A.gx = null;
      const c = A.clip; let sh = shapeOf(c, dt, v);
      let gh = A.gx ? A.gx[0] : null, ga = A.gx ? A.gx[1] : 0, gb = A.gx ? A.gx[2] : 1;
      if (A.snap) {
        const u = Math.min(1, (performance.now() - A.t0) / A.dur);
        if (u >= 1) A.snap = null;
        else if (A.bridge) { const e = easeIO(u); sh = e < 0.5 ? morphMap(A.bridge.m1, e * 2) : morphMap(A.bridge.m2, e * 2 - 1); gh = null; }
        else if (A.dis) { const e = easeIO(u); gh = morphMap(A.map, e * 0.3, true); sh = morphMap(A.rmap, (1 - e) * 0.3, true); gb = Math.min(1, u / 0.5); ga = Math.min(1, (1 - u) / 0.5); }
        else { sh = morphMap(A.map, easeIO(u)); gh = null; }
      }
      A.sh = sh;
      let tf = "";
      if (c.rock && !A.snap) tf += `rotate(${f1(c.rock * Math.sin(A.ct * 3.2))} 0 -50) `;
      if (c.scr && !A.snap) tf += `translate(0 ${f1(-4 * Math.abs(Math.sin(A.ct * 9)))}) `;
      if (c.br && !A.snap) tf += `scale(1 ${(1 + 0.012 * c.br * Math.sin(A.ct * (c.br > 1 ? 1.1 : 1.6))).toFixed(4)})`;
      draw(sh, tf); ghost(gh, ga, gb);
      return adv;
    },
    /** bề rộng dáng hiện tại (đơn vị hình) – cho bóng đổ */
    extent() { return extentOf(A.sh); },
    /** toạ độ mắt hiện tại (đơn vị hình) */
    eye() { return A.sh.eye; },
    /** chớp mắt: nhanh (sống động) hoặc chậm (mèo "hôn" – tin bạn) */
    blink(slow = false) {
      if (api.blinking) return; api.blinking = true; svg.classList.add(slow ? "slowblink" : "blink");
      setTimeout(() => { svg.classList.remove("blink", "slowblink"); setTimeout(() => (api.blinking = false), slow ? 300 : 40); }, slow ? 900 : 130);
    },
    setSkin(s) { skin = s || "classic"; R.acc.innerHTML = ACC[skin] || ""; },
    skins: ["classic", "shades", "bow", "fedora"],
    /** ảnh tĩnh 1 dáng (avatar, cửa hàng) */
    /** ảnh của DÁNG ĐANG CÓ (chụp khoảnh khắc, bóng trên tường, hù doạ) – o: { eye, fur, flip } */
    snapshotNow(o = {}) { return api.snapshot(null, skin, o); },
    snapshot(pose = "sit", s = skin, o = {}) {
      const P = (pose && POSE[pose]) || A.sh; const e = P.eye;
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity; for (const q of P.polys) for (let i = 0; i < q.p.length; i += 2) { x0 = Math.min(x0, q.p[i]); x1 = Math.max(x1, q.p[i]); y0 = Math.min(y0, q.p[i + 1]); }
      const pad = 14, side = Math.max(x1 - x0, -y0) + pad * 2, cx = (x0 + x1) / 2;
      return `<svg xmlns="${NS}" class="cat-snap" viewBox="${f1(cx - side / 2)} ${f1(-side + pad)} ${f1(side)} ${f1(side)}" style="--fur:${o.fur || col.fur || "#0b0b0d"};--eye:${o.eye || col.eye || "#E9B949"}${o.flip ? ";transform:scaleX(-1)" : ""}">${e ? `<circle cx="${e[0]}" cy="${e[1]}" r="9" fill="var(--eye)"/>` : ""}<path fill="var(--fur)" d="${pathOf(P, [0, 1])}"/><path fill="${col.gold || "#C8A064"}" d="${pathOf(P, [2])}"/>${e && ACC[s] ? `<g class="accw" transform="translate(${e[0] - (s === "fedora" ? 8 : 0)} ${e[1] - (s === "fedora" ? 16 : 0)})">${ACC[s]}</g>` : ""}</svg>`;
    },
    destroy() { el.remove(); },
  };
  return api;
}
