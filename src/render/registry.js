// =====================================================================================
// SỔ ĐĂNG KÝ BỘ VẼ – điểm nối DUY NHẤT giữa game và cách vẽ mèo.
//
// HỢP ĐỒNG mọi renderer phải có (game chỉ dùng đúng những thứ này):
//   el                      phần tử HTML chứa hình mèo (game tự đặt vị trí, cỡ, lật trái/phải)
//   box {w,h,ax,ay}         hộp hiển thị theo "đơn vị hình" + điểm neo chạm đất (giữa 2 chân)
//   ready                   Promise – xong khi đủ hình tối thiểu (idle + walk)
//   has(name)               có động tác chuẩn này không (xem clips.js)
//   info(name)              { loop, speed (đơn vị/giây khi đi), moves }
//   play(name, {restart})   chuyển động tác – renderer tự hoà / nắn hình cho mượt
//   update(dt, v) → adv     vẽ khung kế; v = tốc độ trên đất (đồng bộ bước chân); trả về quãng clip tự đi
//   done                    clip "once" đã chạy xong
//   extent() → [l, r]       bề ngang dáng hiện tại (bóng đổ)
//   eye() → [x, y] | null   vị trí mắt (đặt phụ kiện, hiệu ứng)
//   setSkin(id), skins      phụ kiện
//   snapshot(pose)          chuỗi HTML ảnh tĩnh (avatar)
//
// Thêm 1 kiểu vẽ mới (Lottie, Spine, video alpha, WebGL…) = viết 1 file theo hợp đồng trên + 1 dòng dưới.
// =====================================================================================
import { createVectorRenderer } from "./vector/vector-renderer.js";
import { createSpriteRenderer } from "./sprite/sprite-renderer.js";
import { resolveClip } from "./clips.js";

const RENDERERS = {
  vector: createVectorRenderer,
  sprite: createSpriteRenderer,
};

export async function loadCatManifest(id) {
  const base = new URL(`../../assets/cats/${id}/`, import.meta.url);
  const man = await fetch(new URL("cat.json", base), { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error("cat.json " + r.status); return r.json(); });
  if (man.name === "na na") man.name = "na";      // bản cũ còn trong bộ nhớ đệm của trình duyệt
  return { man, base };
}

export async function createCatRenderer(id) {
  const { man, base } = await loadCatManifest(id);
  const make = RENDERERS[man.renderer];
  if (!make) throw new Error(`renderer "${man.renderer}" chưa được đăng ký`);
  const r = await make(man, base);
  if (!r.box) { const vb = man.viewBox || [-200, -262, 400, 272]; r.box = { w: vb[2], h: vb[3], ax: -vb[0], ay: -vb[1] }; }
  r.resolve = (name) => resolveClip(r.has, name);
  man.base = base.href;      // để tìm file đi kèm (clip cận mặt, âm thanh) theo đường dẫn tương đối
  return r;
}

/** danh sách mèo có sẵn trong gói (thêm mèo mới: thêm id vào assets/cats/index.json) */
export async function listCats() {
  return fetch(new URL("../../assets/cats/index.json", import.meta.url), { cache: "no-cache" }).then((r) => r.json());
}
