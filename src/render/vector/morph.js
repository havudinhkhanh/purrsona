// Bộ máy BIẾN HÌNH đường viền – port nguyên từ na (my-bit/site/mascot.js, 11/2026).
// Một "dáng" = { id, w, h, eye:[x,y]|null, polys:[{t, p:Float32Array, n, cx, cy, ar}] }
//   t: 0 = khối thân · 1 = lỗ (mắt, nét cắt) · 2 = băng vàng (phụ kiện) · 3 = lưỡi hồng
// Gốc toạ độ: giữa thân, mặt đất y = 0, mèo hướng mặt sang PHẢI. Đơn vị = điểm ảnh bản vẽ gốc.

export function mk(t, p) {
  let cx = 0, cy = 0, ar = 0; const n = p.length / 2;
  for (let i = 0; i < n; i++) { cx += p[2 * i]; cy += p[2 * i + 1]; const j = (i + 1) % n; ar += p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1]; }
  return { t, p, n, cx: cx / n, cy: cy / n, ar: Math.abs(ar / 2) };
}

/** Giải mã 1 dáng dạng nén [w, h, eye, [[type, x0, y0, dx, dy, …], …]]; flip = dáng vẽ quay mặt trái → lật cho cùng hướng */
export function decodePose(id, v, flip = false, eyeOverride = null) {
  const [w, h, eye, ps] = v;
  return {
    id, w, h, eye: eyeOverride || eye,
    polys: ps.map((a) => {
      const t = a[0], n = (a.length - 1) / 2, p = new Float32Array(n * 2); let x = 0, y = 0;
      for (let i = 0; i < n; i++) { x += a[1 + 2 * i]; y += a[2 + 2 * i]; if (i === 0) { x = a[1]; y = a[2]; } const j = flip ? n - 1 - i : i; p[2 * j] = flip ? -x : x; p[2 * j + 1] = y; }
      return mk(t, p);
    }),
  };
}

const resamp = (a, n) => {
  if (a.n === n) return a.p; const o = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { const f = (i * a.n) / n, j = Math.floor(f), u = f - j, k = (j + 1) % a.n; o[2 * i] = a.p[2 * j] + (a.p[2 * k] - a.p[2 * j]) * u; o[2 * i + 1] = a.p[2 * j + 1] + (a.p[2 * k + 1] - a.p[2 * j + 1]) * u; }
  return o;
};

// b (cùng số điểm với a) → xoay vòng điểm đầu cho khớp a nhất
function align(a, b) {
  const n = a.n, A = a.p, step = n > 60 ? 2 : 1; let best = 0, bd = Infinity, bx = 0, by = 0;
  for (let i = 0; i < n; i++) { bx += b[2 * i]; by += b[2 * i + 1]; } bx = bx / n - a.cx; by = by / n - a.cy;
  for (let s = 0; s < n; s += step) { let d = 0; for (let i = 0; i < n; i += 2) { const j = ((i + s) % n) * 2, dx = A[2 * i] - b[j] + bx, dy = A[2 * i + 1] - b[j + 1] + by; d += dx * dx + dy * dy; if (d > bd) break; } if (d < bd) { bd = d; best = s; } }
  const o = new Float32Array(n * 2); for (let i = 0; i < n; i++) { const j = ((i + best) % n) * 2; o[2 * i] = b[j]; o[2 * i + 1] = b[j + 1]; } return o;
}

// chia lại viền theo ĐỘ DÀI (điểm cách đều ~3 đơn vị) – viền từ video dày chỗ cong, thưa chỗ thẳng → khớp lệch, tai / chân co lại khi nắn
export const arcRes = (p, sp = 3) => { const n = p.length / 2, L = [0]; for (let i = 0; i < n; i++) { const j = (i + 1) % n; L.push(L[i] + Math.hypot(p[2 * j] - p[2 * i], p[2 * j + 1] - p[2 * i + 1])); }
  const tot = L[n], m = Math.max(12, Math.round(tot / sp)), o = new Float32Array(m * 2); let k = 0;
  for (let i = 0; i < m; i++) { const d = (i * tot) / m; while (L[k + 1] < d) k++; const j = (k + 1) % n, u = (d - L[k]) / (L[k + 1] - L[k] || 1); o[2 * i] = p[2 * k] + (p[2 * j] - p[2 * k]) * u; o[2 * i + 1] = p[2 * k + 1] + (p[2 * j + 1] - p[2 * k + 1]) * u; }
  return o; };
// lỗ nhỏ / mảnh như sợi chỉ (khe sáng trên vòng cổ, kẽ lông) chỉ lóe 1–2 khung → bỏ, khỏi thành "tia điện" xoẹt qua cổ
export const keepPoly = (q) => { if (q.t !== 1) return true; let L = 0; const P = q.p, n = P.length / 2; for (let i = 0; i < n; i++) { const j = (i + 1) % n; L += Math.hypot(P[2 * j] - P[2 * i], P[2 * j + 1] - P[2 * i + 1]); } return q.ar >= 80 && (2 * q.ar) / (L || 1) >= 3; };
// mắt: [x, y] hoặc [x, y, x2, y2, độ hiện mắt xa] (mắt xa chỉ thấy khi mèo nhìn chéo ¾) – nắn 2 dáng: mắt xa hiện / ẩn dần theo u
export const eyeMix = (a, b, u) => { if (!(a && b)) return u < 0.5 ? a : b; const o = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  if (a.length > 2 && b.length > 2) o.push(a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u, (a[4] ?? 1) + ((b[4] ?? 1) - (a[4] ?? 1)) * u);
  else if (a.length > 2 || b.length > 2) { const s = a.length > 2 ? a : b; o.push(s[2] + o[0] - s[0], s[3] + o[1] - s[1], (s[4] ?? 1) * (a.length > 2 ? 1 - u : u)); }
  return o; };

// ghép điểm theo DTW (dời điểm tự do dọc 2 viền, giữ thứ tự) → đuôi khớp đuôi, chân khớp chân
function dtw(a, b) {
  const n = a.n, A = a.p; let bx = 0, by = 0; for (let i = 0; i < n; i++) { bx += b[2 * i]; by += b[2 * i + 1]; } bx = bx / n - a.cx; by = by / n - a.cy;
  let bestT = Infinity, bestP = null;
  for (const off of [0, -6, 6]) {
    const B = new Float32Array(n * 2); for (let i = 0; i < n; i++) { const j = (((i + off) % n) + n) % n; B[2 * i] = b[2 * j] - bx; B[2 * i + 1] = b[2 * j + 1] - by; }
    const D = new Float32Array(n * n), d = (i, j) => { const dx = A[2 * i] - B[2 * j], dy = A[2 * i + 1] - B[2 * j + 1]; return dx * dx + dy * dy; };
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const c = d(i, j); D[i * n + j] = i === 0 && j === 0 ? c : c + Math.min(i && j ? D[(i - 1) * n + j - 1] : Infinity, i ? D[(i - 1) * n + j] + c : Infinity, j ? D[i * n + j - 1] + c : Infinity); }
    const T = D[n * n - 1]; if (T >= bestT) continue; bestT = T;
    const P = []; let i = n - 1, j = n - 1; P.push(i, j);
    while (i || j) { if (!i) j--; else if (!j) i--; else { const x = D[(i - 1) * n + j - 1], y = D[(i - 1) * n + j], z = D[i * n + j - 1]; if (x <= y && x <= z) { i--; j--; } else if (y <= z) i--; else j--; } P.push(i, j); }
    bestP = { P, B };
  }
  const { P, B } = bestP, K = P.length / 2, oa = new Float32Array(K * 2), ob = new Float32Array(K * 2);
  for (let k = 0; k < K; k++) { const i = P[2 * (K - 1 - k)], j = P[2 * (K - 1 - k) + 1]; oa[2 * k] = A[2 * i]; oa[2 * k + 1] = A[2 * i + 1]; ob[2 * k] = B[2 * j] + bx; ob[2 * k + 1] = B[2 * j + 1] + by; }
  return [oa, ob];
}

const MC = new Map();
/** Cách khớp điểm giữa 2 dáng (có bộ nhớ đệm). fast = 2 khung kề gần trùng → khớp vòng đơn giản, không DTW */
export function mapOf(A, B, fast) {
  const key = A.id && B.id ? A.id + ">" + B.id : null; if (key && MC.has(key)) return MC.get(key);
  const pairs = [], usedB = new Set(), usedA = new Set(), cand = [];
  A.polys.forEach((a, i) => B.polys.forEach((b, j) => { if (a.t !== b.t) return; const d = Math.hypot(a.cx - b.cx, a.cy - b.cy) / (a.t === 0 ? 400 : 60) + Math.abs(Math.log((a.ar + 1) / (b.ar + 1))) * (a.t === 0 ? 0.3 : 0.25); if (a.t !== 0 && d > 1.6) return; cand.push([d, i, j]); }));
  cand.sort((x, y) => x[0] - y[0]);
  for (const [, i, j] of cand) {
    if (usedA.has(i) || usedB.has(j)) continue; usedA.add(i); usedB.add(j); let a = A.polys[i]; const b = B.polys[j];
    if (a.t === 0 && a.n > 220 && !fast) a = mk(0, resamp(a, 220));
    const bb = align(a, resamp(b, a.n));
    if (a.t === 0 && a.n >= 100 && !fast) { const [pa, pb] = dtw(a, bb); pairs.push({ a: pa, b: pb, t: 0 }); } else pairs.push({ a: a.p, b: bb, t: a.t });
  }
  A.polys.forEach((a, i) => { if (!usedA.has(i)) pairs.push({ a: a.p, cx: a.cx, cy: a.cy, t: a.t, out: 1 }); });
  B.polys.forEach((b, j) => { if (!usedB.has(j)) pairs.push({ b: b.p, cx: b.cx, cy: b.cy, t: b.t, in: 1 }); });
  let big = null; for (const q of pairs) if (q.t === 0 && q.b && q.a && (!big || q.a.length > big.a.length)) big = q;
  let cost = 9; if (big) { let d = 0; const n = big.a.length / 2; for (let i = 0; i < n; i++) d += Math.hypot(big.a[2 * i] - big.b[2 * i], big.a[2 * i + 1] - big.b[2 * i + 1]); cost = d / n / 100; }
  const m = { pairs, eA: A.eye, eB: B.eye, pA: A.pe, pB: B.pe, cost }; if (key) MC.set(key, m); return m;
}

/** Dáng trung gian ở mức u theo 1 bản khớp có sẵn. keep = giữ nguyên cỡ lỗ (mắt) suốt quá trình */
export function morphMap(m, u, keep) {
  const polys = [], hk = keep ? 1 : 1 - Math.sin(Math.PI * u);
  for (const q of m.pairs) {
    if (q.out || q.in) { const src = q.out ? q.a : q.b, k = q.out ? 1 - u : u; if (k < 0.04) continue; const n = src.length / 2, o = new Float32Array(src.length); for (let i = 0; i < n; i++) { o[2 * i] = q.cx + (src[2 * i] - q.cx) * k; o[2 * i + 1] = q.cy + (src[2 * i + 1] - q.cy) * k; } polys.push(mk(q.t, o)); continue; }
    const o = new Float32Array(q.a.length); for (let i = 0; i < o.length; i++) o[i] = q.a[i] + (q.b[i] - q.a[i]) * u;
    if (q.t === 1 && hk < 0.999) { const pq = mk(1, o); if (hk < 0.06) continue; for (let i = 0; i < o.length; i += 2) { o[i] = pq.cx + (o[i] - pq.cx) * hk; o[i + 1] = pq.cy + (o[i + 1] - pq.cy) * hk; } }
    polys.push(mk(q.t, o));
  }
  return { id: null, polys, eye: eyeMix(m.eA, m.eB, u), eyeK: m.eA && m.eB ? 1 : Math.abs(u - 0.5) * 2, pe: u < 0.5 ? m.pA || m.pB : m.pB || m.pA };
}

export function morph(A, B, u, keep, fast) {
  if (u <= 0.0001 || A === B) return A; if (u >= 0.9999) return B;
  return morphMap(mapOf(A, B, fast), u, keep);
}

const f1 = (v) => (Math.round(v * 10) / 10).toString();
export function pathOf(sh, types) {
  let d = "";
  for (const q of sh.polys) { if (!types.includes(q.t)) continue; const p = q.p, n = p.length / 2; d += "M" + f1(p[0]) + " " + f1(p[1]); for (let i = 1; i < n; i++) d += "L" + f1(p[2 * i]) + " " + f1(p[2 * i + 1]); d += "Z"; }
  return d;
}

/** bề rộng thực của dáng (để vẽ bóng dưới chân) */
export function extentOf(sh) {
  let l = Infinity, r = -Infinity;
  for (const q of sh.polys) { if (q.t !== 0) continue; const p = q.p; for (let i = 0; i < p.length; i += 2) { if (p[i] < l) l = p[i]; if (p[i] > r) r = p[i]; } }
  return l === Infinity ? [-80, 80] : [l, r];
}
export { f1 };
