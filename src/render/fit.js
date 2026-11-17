// Thu khung SVG về đúng chỗ có nét vẽ.
// Mỗi sprite vốn là 1 SVG phủ kín màn hình; Safari trên iPhone hay cấp cho mỗi cái
// một lớp đồ hoạ riêng cỡ cả màn hình (×3 điểm ảnh) → hết bộ nhớ, trang tự tải lại.
// Thu khung lại thì hình y hệt mà tốn ít hơn hàng chục lần.
export function fitSvg(svg, pad = 6) {
  if (!svg || !svg.getBBox) return null;
  let b; try { b = svg.getBBox(); } catch { return null; }
  if (!b || (!b.width && !b.height)) return null;          // chưa hiển thị: để nguyên khung cũ
  const x = Math.floor(b.x - pad), y = Math.floor(b.y - pad), w = Math.ceil(b.width + pad * 2), h = Math.ceil(b.height + pad * 2);
  svg.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
  const st = svg.style; st.left = x + "px"; st.top = y + "px"; st.width = w + "px"; st.height = h + "px"; st.right = "auto"; st.bottom = "auto";
  svg._fit = { x, y, w, h };
  return svg._fit;
}
export const IOS = typeof navigator !== "undefined" && (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
