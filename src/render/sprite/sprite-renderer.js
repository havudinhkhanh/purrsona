// Bộ vẽ KHUNG HÌNH (sprite) – cho bộ khung PNG / WebP do Gemini, ChatGPT, Midjourney… tạo ra.
// Thả thư mục khung + cat.json (renderer: "sprite") vào assets/cats/<id>/ là chạy. Xem docs/ANIMATION_SPEC.md.
//
// Mỗi clip khai báo 1 trong 3 cách:
//   "frames": ["walk/0001.webp", …]                                  – danh sách file
//   "pattern": "walk/walk_{i}.webp", "count": 24, "start": 1, "pad": 4 – mẫu tên file
//   "atlas": { "src": "walk.webp", "cols": 8, "count": 24 }          – 1 tấm ghép nhiều khung (lưới đều)
// cùng fps, loop, speed (đơn vị/giây khi đi đúng nhịp – chỉ clip di chuyển), blend (hoà 2 khung kề – cho bộ ít khung).

export async function createSpriteRenderer(man, base) {
  const [FW, FH] = man.frameSize || [512, 512];
  const upp = man.unitsPerPixel ?? 0.5;                       // 1 điểm ảnh khung = bao nhiêu "đơn vị hình"
  const anc = man.anchor || [FW / 2, FH * 0.94];              // điểm chạm đất (giữa 2 chân) trong khung
  const el = document.createElement("div"); el.className = "cr cr-sprite";
  const cv = document.createElement("canvas"); cv.width = FW; cv.height = FH; cv.className = "cat-cv"; el.appendChild(cv);
  const g = cv.getContext("2d");
  const CL = man.clips || {};

  const src = (c) => {
    if (c.frames) return c.frames.map((f) => ({ f }));
    if (c.pattern) { const n = c.count, s = c.start ?? 1, pad = c.pad ?? 4; return Array.from({ length: n }, (_, i) => ({ f: c.pattern.replace("{i}", String(s + i).padStart(pad, "0")) })); }
    if (c.atlas) { const a = c.atlas, w = a.w || FW, h = a.h || FH; return Array.from({ length: a.count }, (_, i) => ({ f: a.src, sx: (i % a.cols) * w, sy: Math.floor(i / a.cols) * h, sw: w, sh: h })); }
    return [];
  };
  const IMG = new Map();
  const img = (f) => { if (IMG.has(f)) return IMG.get(f); const im = new Image(); im.decoding = "async"; im.src = new URL(f, base).href; const p = im.decode().then(() => im).catch(() => null); IMG.set(f, p); p.then((v) => IMG.set(f, v || null)); return p; };
  const FR = {};
  const load = async (name) => { if (FR[name]) return FR[name]; const c = CL[name]; const list = src(c); FR[name] = list; await Promise.all(list.map(async (x) => { x.im = await img(x.f); })); list.ready = true; return list; };
  // tải trước idle + walk, phần còn lại tải dần
  const ready = Promise.all(["idle", "walk"].filter((n) => CL[n]).map(load));
  ready.then(() => Object.keys(CL).forEach((n) => load(n)));

  const A = { name: "", c: null, ph: 0, done: false, prev: null, pt0: 0, last: null };
  const frameAt = (list, c) => {
    const n = list.length; if (!n) return [null, null, 0];
    const f = c.loop ? A.ph % n : Math.min(n - 1, A.ph); const i = Math.floor(f), j = c.loop ? (i + 1) % n : Math.min(n - 1, i + 1);
    return [list[i], list[j], f - i];
  };
  const blit = (x, a) => {
    if (!x || !x.im || !a) return; g.globalAlpha = a;
    if (x.sw) g.drawImage(x.im, x.sx, x.sy, x.sw, x.sh, 0, 0, FW, FH); else g.drawImage(x.im, 0, 0, FW, FH);
  };

  const api = {
    kind: "sprite", el, ready, manifest: man,
    has: (n) => !!CL[n],
    info(n) { const c = CL[n] || {}; return { loop: c.loop !== false, speed: c.speed || 0, moves: !!c.speed }; },
    play(name, { restart = false } = {}) {
      const c = CL[name]; if (!c || (A.c === c && !restart)) return;
      A.prev = A.last; A.pt0 = performance.now(); A.name = name; A.c = c; A.ph = 0; A.done = false; load(name);
    },
    get clip() { return A.name; },
    get done() { return A.done; },
    update(dt, v = 0) {
      const c = A.c; if (!c) return 0; const list = FR[A.name];
      if (!list || !list.ready) { if (A.prev) { g.clearRect(0, 0, FW, FH); blit(A.prev, 1); } return 0; }
      const rate = (c.fps || 24) * (c.speed && v > 0 ? v / c.speed : 1);
      A.ph += dt * rate; if (c.loop === false && A.ph >= list.length - 1) { A.ph = list.length - 1; A.done = true; }
      const [x, y, u] = frameAt(list, c);
      g.clearRect(0, 0, FW, FH);
      const xf = A.prev ? Math.min(1, (performance.now() - A.pt0) / (c.xfade ?? 160)) : 1;      // hoà sang clip mới
      if (A.prev && xf < 1) blit(A.prev, 1 - xf); else A.prev = null;
      if (c.blend && y !== x) { blit(x, xf); blit(y, xf * u); } else blit(x, xf);
      g.globalAlpha = 1; A.last = x; return 0;
    },
    extent() { return [(-anc[0] + FW * 0.2) * upp, (FW * 0.8 - anc[0]) * upp]; },
    eye() { return man.eye ? [(man.eye[0] - anc[0]) * upp, (man.eye[1] - anc[1]) * upp] : null; },
    setSkin() {}, skins: ["classic"], blink() {},
    snapshotNow() { return A.last?.im ? `<img class="cat-snap" alt="" src="${A.last.im.src}">` : api.snapshot(); },
    snapshot() { const c = CL.idle || Object.values(CL)[0]; const f = src(c)[0]; return f ? `<img class="cat-snap" alt="" src="${new URL(f.f, base).href}">` : ""; },
    destroy() { el.remove(); },
    // hộp hiển thị (đơn vị hình): rộng, cao, điểm neo chân
    box: { w: FW * upp, h: FH * upp, ax: anc[0] * upp, ay: anc[1] * upp },
  };
  return api;
}
