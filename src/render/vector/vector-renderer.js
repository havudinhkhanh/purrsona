// Bộ vẽ VECTOR (biến hình đường viền) – dùng cho na. Tuân theo hợp đồng renderer (xem src/render/registry.js).
import { decodePose, mapOf, morph, morphMap, pathOf, extentOf, f1, mk, arcRes, keepPoly } from "./morph.js";

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
  const idle = (f, ms = 300) => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: ms }) : setTimeout(f, 16));
  const LITE = document.documentElement.classList.contains("lite");      // máy yếu / iPhone: bỏ khung giữa (đỡ nửa bộ nhớ), chỉ tải bộ động tác chính
  // 🎬 bảng khung từ VIDEO mèo thật (bộ mới của na bên my-bit): pe = mắt vẽ lại mỗi khung cùng 1 kiểu · m = khung giữa (i+½) dựng sẵn bằng luồng quang học
  //    tx = tâm thân từng khung (clip máy quay đứng yên: thân dời trong khung → cộng vào vị trí mèo, chân không trượt) · st = khung giống dáng đứng nhất (bắt đầu đi)
  //    Giải mã từng mẩu ≤ 6 ms lúc máy rảnh → mở app không khựng
  const decode = (nm, d) => new Promise((done) => {
    const F = [], useM = d.m && !LITE, MID = useM ? [] : null, L = d.f.length, Lm = useM ? d.m.length : 0; let i = 0;
    const one = (key, v) => { const P = (POSE[key] = decodePose(key, v)); if (d.pe) { P.pe = d.es || [10, 12]; P.polys = P.polys.filter(keepPoly); if (!d.m) P.polys = P.polys.map((q) => mk(q.t, arcRes(q.p))); } return P; };
    const step = () => { const t0 = performance.now(); while (i < L + Lm && performance.now() - t0 < 6) { if (i < L) F.push(one(nm + i, d.f[i])); else MID.push(one(nm + "m" + (i - L), d.m[i - L])); i++; }
      if (i < L + Lm) return idle(step); done({ F, MID }); };
    step();
  });
  const loadSheet = async (nm) => {
    if (SHEET[nm] || !man.sheets[nm]) return SHEET[nm];
    const d = await get(man.sheets[nm]);
    const { F, MID } = await decode(nm, d);
    const T = [0]; (d.w || []).forEach((w, i) => T.push(T[i] + w));
    F.T = T; F.W = d.w; F.hard = new Set(d.hard || []); F.mid = MID; F.pe = d.pe; F.tx = d.tx || null; F.st = d.st || 0; SHEET[nm] = F;
    // bảng vẽ tay: tính sẵn cách khớp điểm cặp khung kề lúc rảnh → khi chạy không khựng (bảng video hiện khung gần nhất, khỏi tính)
    if (!d.pe) { let k = 0; const n = F.length;
      const warm = () => { const t0 = performance.now(); while (k < n && performance.now() - t0 < 6) { const j = (k + 1) % n; if (j || d.loop) mapOf(F[k], F[j], !(F.hard.has(k) || j < k)); k++; } if (k < n) idle(warm); };
      idle(warm); }
    return F;
  };
  // thứ tự tải: man.load (bộ chính trước, phần còn lại lúc rảnh, cách nhau chút cho trang thở); máy yếu dùng man.loadLite. Trong lúc chờ dùng dáng dự phòng (fb)
  const order = (LITE && man.loadLite) || man.load || Object.keys(man.sheets || {}), core = man.loadCore || 2;
  const sheetsReady = order.reduce((p, nm, k) => p.then(() => (k < core ? 0 : new Promise((r) => setTimeout(() => idle(r, 4000), 700)))).then(() => loadSheet(nm)).catch(() => null), Promise.resolve());

  // ------------------------------------------------------------------ DOM
  const el = document.createElement("div"); el.className = "cr cr-vector";
  const vb = man.viewBox || [-200, -262, 400, 272];
  el.innerHTML = `<svg xmlns="${NS}" class="cat-svg" viewBox="${vb.join(" ")}" aria-hidden="true"><g class="bd"><g class="og" style="opacity:0"><path class="b"/><path class="gd"/><path class="pk"/></g><g class="mn"><circle class="eyeb" r="9"/><circle class="eyeg" r="4.2"/><path class="b" fill-rule="nonzero"/><path class="gd"/><path class="pk"/><g class="pe" style="display:none">${[1, 2].map((n) => `<g class="pe${n}"><ellipse class="pi"/><ellipse class="pp"/><circle class="ph"/></g>`).join("")}</g><g class="accw"></g></g></g></svg>`;
  const svg = el.firstElementChild, q = (s) => svg.querySelector(s);
  const R = { bd: q(".bd"), mn: q(".mn"), b: q(".mn .b"), gd: q(".mn .gd"), pk: q(".mn .pk"), eyeb: q(".eyeb"), eyeg: q(".eyeg"), acc: q(".accw"), og: q(".og"), ob: q(".og .b"), ogd: q(".og .gd"), opk: q(".og .pk"), pe: q(".pe"), pe1: q(".pe1"), pe2: q(".pe2") };
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
      if (c.loop) A.ph = (A.ph + dt * rate) % span;
      else if (c.yo) A.ph = (A.ph + dt * rate) % (2 * span);      // yo: phát tới–lui êm (giữ dáng nằm / cuộn thở bao lâu cũng được)
      else { A.ph = Math.min(span, A.ph + dt * rate); if (A.ph >= span) A.done = true; }
      const q = c.yo ? span * (0.5 - 0.5 * Math.cos((Math.PI * A.ph) / span)) : A.ph;
      const [i, j, u] = sheetAt(c, q);
      if (c.mv && i >= c.mv[0] && i < c.mv[1]) adv += c.mv[2] * dt;
      // clip máy quay đứng yên (đứng → nằm, vồ, thức dậy…): thân mèo dời trong khung → cộng quãng dời vào vị trí mèo, vẽ lùi lại đúng chừng đó → chân không trượt, hết clip không nhảy
      if (F.tx && !c.loop && !c.na) { const t = F.tx[i] * (1 - u) + F.tx[j] * u; if (A.tx0 == null) A.tx0 = A.txL = t; adv += t - A.txL; A.txL = t; A.off = -(t - A.tx0); }
      if (F.mid) { const mi = j === i + 1 || (j < i && c.loop && i === F.length - 1 && !c.a) ? F.mid[i] : null; return !mi ? (u < 0.5 ? F[i] : F[j]) : u < 0.25 ? F[i] : u < 0.75 ? mi : F[j]; }      // khung giữa dựng sẵn (48 hình/giây) – không nắn viền
      if (F.pe) return u < 0.5 ? F[i] : F[j];
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

  // đường viền của khung có tên (bảng khung, dáng vẽ) không đổi → giữ sẵn chuỗi path, khỏi dựng lại
  const dOf = (sh) => { if (sh.id && sh._d) return sh._d; const d = [pathOf(sh, [0, 1]), pathOf(sh, [2]), pathOf(sh, [3])]; if (sh.id) sh._d = d; return d; };
  let lastSh = null, lastTf = null;
  // 👁 mắt mèo video VẼ LẠI mỗi khung cùng 1 kiểu (tròng, đồng tử dọc, chấm sáng) – cỡ đo từ video; mắt xa (nhìn chéo ¾) hẹp hơn, mờ theo góc
  function peEyes(sh, k) {
    const e = sh.eye, pe = sh.pe; if (!e || !pe || k <= 0.01) { R.pe.style.display = "none"; return; }
    R.pe.style.display = ""; const rx = Math.max(3.6, pe[0] * 0.5), ry = Math.max(3.4, pe[1] * 0.46);
    const one = (g, x, y, sx, al) => { if (al <= 0.02) { g.style.display = "none"; return; } g.style.display = ""; g.style.opacity = al.toFixed(3); g.setAttribute("transform", `translate(${f1(x)} ${f1(y)}) scale(${sx} 1)`);
      const [ir, pu, hl] = g.children; ir.setAttribute("rx", f1(rx)); ir.setAttribute("ry", f1(ry));
      pu.setAttribute("cx", f1(rx * 0.12)); pu.setAttribute("rx", f1(rx * 0.3)); pu.setAttribute("ry", f1(ry * 0.86));
      hl.setAttribute("cx", f1(-rx * 0.28)); hl.setAttribute("cy", f1(-ry * 0.38)); hl.setAttribute("r", f1(Math.max(0.9, rx * 0.2))); };
    one(R.pe1, e[0], e[1], 1, k); if (e.length > 2) one(R.pe2, e[2], e[3], 0.78, k * (e[4] ?? 1)); else R.pe2.style.display = "none";
  }
  function draw(sh, tf) {
    if (sh === lastSh && tf === lastTf) return; lastSh = sh; lastTf = tf;      // khung video giữ nguyên → khỏi đụng DOM
    const [d01, d2, d3] = dOf(sh);
    R.b.setAttribute("d", d01); R.gd.setAttribute("d", d2); R.pk.setAttribute("d", d3);
    R.bd.setAttribute("transform", tf);
    const e = sh.eye, k = sh.eyeK ?? 1;
    if (e && !sh.pe) { for (const c of [R.eyeb, R.eyeg]) { c.setAttribute("cx", f1(e[0])); c.setAttribute("cy", f1(e[1])); } R.eyeb.style.opacity = k; R.eyeg.style.opacity = k; }
    else { R.eyeb.style.opacity = 0; R.eyeg.style.opacity = 0; }
    peEyes(sh, k);
    const hasHat = !!e && sh.polys.some((p) => p.t === 2 && p.cy < e[1] - 6);      // vàng NẰM TRÊN mắt = băng mũ (dáng vẽ cũ); vàng dưới mắt = vòng cổ (mèo video) → vẫn đeo phụ kiện được
    if (e && !hasHat && skin !== "classic") { R.acc.setAttribute("transform", `translate(${f1(e[0] - (skin === "fedora" ? 8 : 0))} ${f1(e[1] - (skin === "fedora" ? 16 : 0))})`); R.acc.style.opacity = k; } else R.acc.style.opacity = 0;
  }
  function ghost(sh, a, b) {
    if (!sh) { if (A.ogOn) { R.og.style.opacity = 0; R.mn.style.opacity = ""; A.ogOn = false; } return; }
    R.ob.setAttribute("d", pathOf(sh, [0, 1])); R.ogd.setAttribute("d", pathOf(sh, [2])); R.opk.setAttribute("d", pathOf(sh, [3]));
    R.og.style.opacity = a.toFixed(3); R.mn.style.opacity = b.toFixed(3); A.ogOn = true;
  }

  function start(name, dur, cont = false) {
    const c = CLIP[name], F0 = c.sheet && SHEET[c.sheet];
    const st = c.loop && c.upf && F0 && F0.st ? F0.st : 0;      // vào vòng đi / chạy từ khung giống dáng đứng nhất (đo sẵn từ video)
    const tg = st ? F0[st] : startOf(c);
    A.off0 = A.off || 0; A.off = 0; A.tx0 = null;      // độ lùi vẽ của clip cũ (clip máy quay đứng yên) → nắn dần về 0, không nhảy
    A.snap = cont ? null : A.sh; A.map = cont ? null : mapOf(A.sh, tg); A.t0 = performance.now(); A.clip = c; A.name = name; A.ct = 0; A.done = false;
    A.ph = st ? (F0.W ? F0.T[st] - F0.T[c.a || 0] : st - (c.a || 0)) : 0;
    A.bridge = null; A.dis = false; if (cont) { A.off0 = 0; return; }
    const video = !!(tg.pe || A.sh.pe);
    // mèo video luôn nắn hình (không hoà mờ 2 con chồng nhau); dáng vẽ cũ: 2 dáng khác xa → tìm dáng "trạm" (ngồi / ổ bánh mì / thủ thế / nằm) nắn qua 2 chặng
    A.dis = !video && A.map.cost > 0.4;
    if (A.dis) {
      let best = null;
      for (const h of HUBS) { const P = POSE[h]; if (!P || P === tg || P === A.sh) continue; const m1 = mapOf(A.sh, P), m2 = mapOf(P, tg), cc = Math.max(m1.cost, m2.cost); if (cc < 0.42 && (!best || cc < best.c)) best = { m1, m2, c: cc }; }
      if (best) { A.dis = false; A.bridge = best; } else A.rmap = mapOf(tg, A.snap);
    }
    A.dur = dur || (video ? Math.min(900, 380 + A.map.cost * 700) : A.bridge ? 640 : A.dis ? 380 : ["sleep", "lie", "roll", "stretch"].includes(name) ? 620 : 420);
    A.dur *= api.durMul || 1; if (api.reduced) A.dur = 1;
  }
  const api = {
    kind: "vector", el, ready: Promise.resolve(), sheetsReady, manifest: man,
    has,
    info(name) { const c = CLIP[name] || {}; return { loop: !!(c.loop || (!c.sheet && !c.seq)), speed: c.speed || 0, moves: !!(c.upf || c.stride) }; },
    /** chuyển sang động tác – tự hoà / nắn hình từ dáng đang có */
    play(name, { restart = false, dur } = {}) {
      const c = CLIP[name]; if (!c) return;
      if ((A.clip === c || A.next === name) && !restart) return;
      // via: vào bằng clip chuyển dáng (ngồi → nằm, đứng → cuộn) rồi mới sang clip chính – chỉ khi bảng của clip chuyển đã tải
      const vc = c.via && CLIP[c.via];
      if (vc && vc.sheet && SHEET[vc.sheet] && A.clip !== vc && !(A.clip?.sheet && A.clip.sheet === c.sheet)) { start(c.via, dur); A.next = name; return; }
      A.next = null; start(name, dur);
    },
    get clip() { return A.next || A.name; },
    /** pha hiện tại của clip (công cụ xuất khung dùng để đo chu kỳ vòng lặp) */
    _phase() { return A.clip?.osc || A.clip?.br ? A.ct : A.ph; },
    get done() { return A.next ? false : A.done; },
    /** dt giây · v = tốc độ trên mặt đất (đơn vị hình / giây) để chân khớp đất · trả về quãng tự đi */
    update(dt, v = 0) {
      if (!A.clip) return 0; adv = 0; A.ct += dt; A.gx = null;
      if (A.next && A.done) { const nx = A.next, prev = A.clip; A.next = null; const nc = CLIP[nx]; start(nx, 0, nc.sheet === prev.sheet && (nc.a || 0) === (prev.b ?? -1)); }      // hết clip chuyển dáng → nối thẳng clip chính (cùng bảng, khung kề nhau thì khỏi nắn)
      const c = A.clip; let sh = shapeOf(c, A.snap && A.sh?.pe ? 0 : dt, v);      // đang nắn sang clip video: clip chờ ở khung đầu (khỏi nắn xong nhảy cóc vài khung)
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
      { const off = A.snap ? A.off0 * (1 - easeIO(Math.min(1, (performance.now() - A.t0) / A.dur))) : A.off || 0; if (Math.abs(off) > 0.05) tf += `translate(${f1(off)} 0) `; }
      if (c.rock && !A.snap) tf += `rotate(${f1(c.rock * Math.sin(A.ct * 3.2))} 0 -50) `;
      if (c.scr && !A.snap) tf += `translate(0 ${f1(-4 * Math.abs(Math.sin(A.ct * 9)))}) `;
      if (c.br && !A.snap) tf += `scale(1 ${(1 + 0.012 * c.br * Math.sin(A.ct * (c.br > 1 ? 1.1 : 1.6))).toFixed(4)})`;
      draw(sh, tf); ghost(gh, ga, gb);
      return adv;
    },
    /** bề rộng dáng hiện tại (đơn vị hình) – cho bóng đổ */
    extent() { const [l, r] = extentOf(A.sh), o = A.off || 0; return [l + o, r + o]; },
    /** toạ độ mắt hiện tại (đơn vị hình) */
    eye() { const e = A.sh.eye, o = A.off || 0; return e && o ? [e[0] + o, e[1]] : e; },
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
