// BƯỚM & ONG bay trên khu vườn. Lúc đố bài, mỗi con bướm mang 1 đáp án – chạm đúng con là xong câu.
import { clamp, rand, esc } from "../core/util.js";

const INK = "#262626";
const BFLY = `<svg viewBox="-30 -24 60 48"><g class="wing"><path d="M0 0 C-12 -26 -32 -18 -26 -2 C-30 8 -14 16 0 4Z" fill="#F3F0E8" stroke="${INK}" stroke-width="2"/><path d="M-8 -8 l-10 -6 M-12 0 l-8 2" stroke="${INK}" stroke-width="1.2"/></g><g class="wing r"><path d="M0 0 C12 -26 32 -18 26 -2 C30 8 14 16 0 4Z" fill="#F3F0E8" stroke="${INK}" stroke-width="2"/><path d="M8 -8 l10 -6 M12 0 l8 2" stroke="${INK}" stroke-width="1.2"/></g><path d="M0 -10 L0 12" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/><path d="M0 -10 q-4 -8 -8 -10 M0 -10 q4 -8 8 -10" stroke="${INK}" stroke-width="1.2" fill="none"/></svg>`;
const BEE = `<svg viewBox="-20 -16 40 32"><ellipse cx="-4" cy="-10" rx="7" ry="9" fill="#F3F0E8" stroke="${INK}" stroke-width="1.6" class="bw"/><ellipse cx="5" cy="-10" rx="7" ry="9" fill="#F3F0E8" stroke="${INK}" stroke-width="1.6" class="bw"/><ellipse cx="0" cy="2" rx="13" ry="9" fill="#F3F0E8" stroke="${INK}" stroke-width="2"/><path d="M-5 -6 v16 M2 -7 v17" stroke="${INK}" stroke-width="3"/><circle cx="11" cy="0" r="1.6" fill="${INK}"/></svg>`;

export function createCritters(game) {
  const Y = game.yard; let list = [];
  const area = () => { const b = Y.bbox(), S = Y.S; return { x0: Math.max(b.x0 + 20, 70), x1: Math.min(b.x1 - 20, S.vw - 90), y0: Math.max(b.y0 - 30, S.vh * 0.3), y1: Math.min(b.y1 - 20, S.vh - 90) }; };
  function add(kind, o = {}) {
    const el = document.createElement("button"); el.className = kind; el.type = "button";
    el.innerHTML = (kind === "bfly" ? BFLY : BEE) + (o.tag ? `<span class="tag${o.lang === "zh" ? " zh" : ""}">${esc(o.tag)}</span>` : "");
    el.setAttribute("aria-label", o.tag ? `Đáp án: ${o.tag}` : kind === "bfly" ? "Bướm" : "Ong");
    const A = area(), x = o.x ?? rand(A.x0, A.x1), y = o.y ?? rand(A.y0, A.y1);
    const c = { kind, el, x, y, tx: x, ty: y, vx: 0, vy: 0, t: Math.random() * 9, ph: Math.random() * 6, ...o };
    el.addEventListener("pointerdown", (e) => { e.stopPropagation(); game.lastInput = Date.now(); c.onTap?.(c); });
    Y.topfx.appendChild(el); list.push(c); return c;
  }
  function remove(c) { c.el.classList.add("gone"); setTimeout(() => c.el.remove(), 400); list = list.filter((x) => x !== c); }
  function ambient() {
    list.filter((c) => !c.answer).forEach(remove);
    if (game.weather?.raining) return;      // mưa: bướm ong trốn hết
    add("bfly", { onTap: (c) => { c.tx += rand(-200, 200); c.ty -= 120; game.say?.("chase"); } });
    add("bfly", { onTap: (c) => { c.tx += rand(-200, 200); c.ty -= 120; } });
    const bees = { full: 2, calm: 1, bare: 0 }[game.yard.S.density] ?? 2;
    for (let i = 0; i < bees; i++) add("bee", { onTap: () => { game.buzz?.([6, 30, 6]); game.say?.("bee"); } });
  }
  /** bướm đáp án: opts = [{ id, tag, lang }], onPick(id) */
  function answers(opts, onPick) {
    clearAnswers(); const A = area();
    // bướm đáp án bay lơ lửng quanh chỗ của mình (không bay lung tung) để dễ chạm trúng
    // màn hẹp: lưới 2 cột; màn rộng: 1 hàng so le. Nhãn không rộng quá ô của mình → không đè nhau, không tràn mép
    const vw = Y.S.vw, x0 = 14, x1 = vw - 14, narrow = vw < 700, cols = narrow ? 2 : opts.length, rows = Math.ceil(opts.length / cols), cw = (x1 - x0) / cols;
    opts.forEach((o, i) => {
      const col = i % cols, row = Math.floor(i / cols), x = x0 + (col + 0.5) * cw;
      const y = narrow ? A.y0 + (A.y1 - A.y0) * ((row + 0.35) / rows) : A.y0 + (A.y1 - A.y0) * (0.35 + 0.3 * (i % 2));
      const c = add("bfly", { answer: true, id: o.id, tag: o.tag, lang: o.lang, x, y, hx: x, hy: y, onTap: (c) => onPick(c.id, c) });
      c.el.style.setProperty("--tw", `${Math.max(90, Math.min(cw - 18, 260))}px`);
    });
  }
  function clearAnswers() { list.filter((c) => c.answer).forEach(remove); }
  function land(c, ok) { c.el.classList.add(ok ? "right" : "wrong"); if (ok) { const f = game.yard.flowerSpots?.[Math.floor(Math.random() * (game.yard.flowerSpots.length || 1))]; if (f) { c.tx = f.x; c.ty = f.y - 10; } } }
  function tick(dt) {
    const A = area();
    for (const c of list) {
      c.t += dt;
      if (c.kind === "bfly") {
        const slow = c.answer ? 0.12 : 0.25;
        if (c.answer && c.hx != null && !c.el.classList.contains("right")) { if (Math.hypot(c.tx - c.x, c.ty - c.y) < 6 || Math.random() < dt * 0.4) { c.tx = c.hx + rand(-14, 14); c.ty = c.hy + rand(-10, 10); } }
        else if (Math.hypot(c.tx - c.x, c.ty - c.y) < 20 || Math.random() < dt * slow) { c.tx = clamp(c.x + rand(-180, 180), A.x0, A.x1); c.ty = clamp(c.y + rand(-120, 120), A.y0, A.y1); }
        const sp = c.answer ? 0.35 : 0.6;
        c.vx += ((c.tx - c.x) * sp - c.vx) * dt * 1.5; c.vy += ((c.ty - c.y) * sp - c.vy) * dt * 1.5;
        c.x += c.vx * dt; c.y += c.vy * dt + Math.sin(c.t * 6 + c.ph) * (c.answer ? 0.25 : 0.6);
        c.el.style.transform = `translate(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px)`; c.el.firstChild.style.transform = `scaleX(${c.vx < 0 ? -1 : 1})`;
      } else {
        if (!c.cx || Math.random() < dt * 0.08) { const f = game.yard.flowerSpots?.length ? game.yard.flowerSpots[Math.floor(Math.random() * game.yard.flowerSpots.length)] : { x: rand(A.x0, A.x1), y: rand(A.y0 + 60, A.y1) }; c.cx = f.x; c.cy = f.y - 20; c.r = rand(30, 70); }
        const tx = c.cx + Math.sin(c.t * 1.6) * c.r, ty = c.cy + Math.sin(c.t * 3.2) * c.r * 0.35, px = c.x;
        c.x += (tx - c.x) * Math.min(1, dt * 3); c.y += (ty - c.y) * Math.min(1, dt * 3);
        c.el.style.transform = `translate(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px)`; c.el.firstChild.style.transform = `scaleX(${c.x < px ? -1 : 1})`;
      }
    }
  }
  const nearest = (x, y) => list.filter((c) => c.kind === "bfly" && !c.answer).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
  const scare = (c) => { if (c) { c.tx = c.x + (Math.random() < 0.5 ? -260 : 260); c.ty = c.y - 160; } };
  return { ambient, answers, clearAnswers, land, tick, nearest, scare, get list() { return list; } };
}
