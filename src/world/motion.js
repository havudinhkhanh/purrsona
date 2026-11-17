// CHUYỂN ĐỘNG CHO ĐỒ VẬT (đổ chậu, khăn rớt, cốc lật…): Web Animations trên chính hình vẽ, không vẽ lại SVG mỗi khung.
// Máy không có Web Animations (iOS 12) hoặc người dùng chọn giảm chuyển động → nhảy thẳng tới trạng thái cuối.
export const canAnim = (el) => !!(el && el.animate) && !document.documentElement.classList.contains("reduced");
/** chạy keyframes, trả về promise khi xong (giữ trạng thái cuối) */
export function play(el, frames, o = {}) {
  if (!canAnim(el)) return Promise.resolve(null);
  const a = el.animate(frames, { duration: 600, easing: "ease", fill: "forwards", ...o });
  return new Promise((res) => { a.onfinish = () => res(a); a.oncancel = () => res(a); });
}
/** đặt tâm xoay/co giãn của 1 SVG đã thu khung (fitSvg) tại điểm (x, y) toạ độ cảnh */
export function pivot(svg, x, y) { const f = svg._fit || { x: parseFloat(svg.style.left) || 0, y: parseFloat(svg.style.top) || 0 }; svg.style.transformOrigin = `${(x - f.x).toFixed(1)}px ${(y - f.y).toFixed(1)}px`; }
/** rơi tự do từ độ cao h (px) xuống, nảy nhẹ; spin = độ xoay khi chạm đất; flutter = lắc ngang kiểu vải */
export function fallFrames(h, { spin = 0, flutter = 0, dx = 0, bounce = 0.18 } = {}) {
  const F = [], n = 10;
  for (let i = 0; i <= n; i++) { const t = i / n, e = t * t, w = flutter ? Math.sin(t * Math.PI * 2.4) * flutter * (1 - t) : 0; F.push({ offset: t * 0.78, transform: `translate(${(dx * t + w).toFixed(1)}px, ${(-h * (1 - e)).toFixed(1)}px) rotate(${(spin * t + (flutter ? Math.sin(t * 7) * 14 * (1 - t) : 0)).toFixed(1)}deg)` }); }
  F.push({ offset: 0.88, transform: `translate(${dx}px, ${(-h * bounce * 0.4).toFixed(1)}px) rotate(${spin}deg) scale(1.04, .94)` });
  F.push({ offset: 1, transform: `translate(${dx}px, 0) rotate(${spin}deg)` });
  return F;
}
/** bụi bay ra ở (x, y) trong lớp topfx */
export function puff(layer, x, y, n = 7, spread = 34, size = 7) {
  for (let i = 0; i < n; i++) { const d = document.createElement("i"); d.className = "puff"; d.style.left = x + "px"; d.style.top = y + "px"; const a = Math.PI * (0.05 + 0.9 * (i / Math.max(1, n - 1))); d.style.setProperty("--dx", `${(-Math.cos(a) * spread * (0.6 + Math.random() * 0.6)).toFixed(0)}px`); d.style.setProperty("--dy", `${(-Math.sin(a) * spread * 0.45 * (0.5 + Math.random())).toFixed(0)}px`); d.style.setProperty("--s", `${(size * (0.6 + Math.random() * 0.7)).toFixed(1)}px`); layer.appendChild(d); setTimeout(() => d.remove(), 650); }
}
/** nước bắn (cốc đổ) */
export function splash(layer, x, y, n = 8) {
  for (let i = 0; i < n; i++) { const d = document.createElement("i"); d.className = "splash"; d.style.left = x + "px"; d.style.top = y + "px"; d.style.setProperty("--dx", `${(Math.random() * 46 - 10).toFixed(0)}px`); d.style.setProperty("--dy", `${(-10 - Math.random() * 22).toFixed(0)}px`); d.style.transform = `rotate(${(Math.random() * 80 - 40).toFixed(0)}deg)`; layer.appendChild(d); setTimeout(() => d.remove(), 500); }
}
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
