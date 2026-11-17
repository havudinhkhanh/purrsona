// HIỆU ỨNG GAME (nhẹ, mượt): nổ cánh hoa / tia sáng khi trả lời đúng, số điểm bay lên, con dấu lên cấp, rung khi sai.
// Chỉ dùng transform + opacity (máy yếu vẫn 60 khung/giây). Máy bật "giảm chuyển động" thì bỏ qua hết.
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function createFx(root = document.body) {
  const layer = document.createElement("div"); layer.className = "fx"; layer.setAttribute("aria-hidden", "true"); root.appendChild(layer);
  const kill = (el, ms) => setTimeout(() => el.remove(), ms);
  const SHAPES = {
    petal: (s) => `<svg viewBox="-6 -6 12 12" width="${s}" height="${s}"><path d="M0-5C3-3 3 3 0 5C-3 3-3-3 0-5Z" fill="#FBFAF6" stroke="#262626" stroke-width="1.2"/></svg>`,
    spark: (s) => `<svg viewBox="-6 -6 12 12" width="${s}" height="${s}"><path d="M0-5L1.2-1.2 5 0 1.2 1.2 0 5-1.2 1.2-5 0-1.2-1.2Z" fill="#262626"/></svg>`,
    dot: (s) => `<svg viewBox="-3 -3 6 6" width="${s * 0.5}" height="${s * 0.5}"><circle r="2.4" fill="#262626"/></svg>`,
  };
  /** nổ một chùm hạt tại (x, y) – toạ độ màn hình */
  function burst(x, y, { n = 12, spread = 90, kinds = ["petal", "spark", "dot"], size = 14 } = {}) {
    if (reduced()) return;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5, d = spread * (0.55 + Math.random() * 0.6), k = kinds[i % kinds.length];
      const el = document.createElement("i"); el.className = "fxp"; el.innerHTML = SHAPES[k](size * (0.7 + Math.random() * 0.6));
      el.style.cssText = `left:${x}px;top:${y}px;--dx:${(Math.cos(a) * d).toFixed(0)}px;--dy:${(Math.sin(a) * d - spread * 0.35).toFixed(0)}px;--r:${(Math.random() * 540 - 270).toFixed(0)}deg;--t:${(620 + Math.random() * 380).toFixed(0)}ms`;
      layer.appendChild(el); kill(el, 1100);
    }
    const ring = document.createElement("i"); ring.className = "fxring"; ring.style.cssText = `left:${x}px;top:${y}px`; layer.appendChild(ring); kill(ring, 700);
  }
  /** chữ bay lên (vd "+12", "x3 liền") */
  function float(x, y, text, cls = "") {
    if (reduced()) return;
    const el = document.createElement("b"); el.className = "fxt " + cls; el.textContent = text; el.style.cssText = `left:${x}px;top:${y}px`; layer.appendChild(el); kill(el, 1300);
  }
  /** con dấu giữa màn hình: lên cấp, qua bài thi, mốc chuỗi ngày */
  function stamp(title, sub = "") {
    const el = document.createElement("div"); el.className = "fxstamp" + (reduced() ? " still" : "");
    el.innerHTML = `<b>${title}</b>${sub ? `<small>${sub}</small>` : ""}`; layer.appendChild(el); kill(el, 2600);
    if (!reduced()) { const r = el.getBoundingClientRect(); setTimeout(() => burst(r.left + r.width / 2, r.top + r.height / 2, { n: 18, spread: 150, size: 16 }), 260); }
  }
  /** rung nhẹ một phần tử (trả lời sai) */
  function shake(el) { if (!el || reduced()) return; el.classList.remove("fxshake"); void el.offsetWidth; el.classList.add("fxshake"); setTimeout(() => el.classList.remove("fxshake"), 500); }
  /** nảy (nút, chip vừa đổi số) */
  function pop(el) { if (!el || reduced()) return; el.classList.remove("fxpop"); void el.offsetWidth; el.classList.add("fxpop"); setTimeout(() => el.classList.remove("fxpop"), 450); }
  const center = (el) => { const r = el?.getBoundingClientRect?.(); return r && r.width ? [r.left + r.width / 2, r.top + r.height / 2] : [innerWidth / 2, innerHeight * 0.35]; };
  return { burst, float, stamp, shake, pop, center };
}
