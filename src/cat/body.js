// THÂN MÈO trong thế giới: vị trí, hướng, đi / nhảy / leo, bóng đổ, bong bóng thoại, mắt phát sáng ban đêm.
// Không quan tâm mèo được vẽ bằng gì – chỉ nói chuyện với renderer qua hợp đồng (render/registry.js).
import { FLOOR_Y } from "../world/art.js";
import { clamp, lerp, ease } from "../core/util.js";

export const CANCEL = Symbol("cancel");
export const depth = (y) => 0.74 + (0.34 * (y - FLOOR_Y)) / 280;

export function createBody(R, scene, opts = {}) {
  const k0 = R.manifest.scale || 0.6;
  const el = document.createElement("div"); el.className = "cat";
  el.innerHTML = `<div class="cat-flip"></div><div class="cat-hit" role="button" tabindex="0" aria-label="${R.manifest.name}"></div>`;
  const flip = el.firstElementChild, hit = el.lastElementChild; flip.appendChild(R.el);
  const shadow = document.createElement("div"); shadow.className = "cat-shadow";
  const bubble = document.createElement("div"); bubble.className = "bubble"; bubble.hidden = true;
  const eyes = document.createElement("div"); eyes.className = "eyeglow";
  R.el.style.width = R.box.w + "px"; R.el.style.height = R.box.h + "px"; R.el.style.left = -R.box.ax + "px"; R.el.style.top = -R.box.ay + "px"; R.el.style.position = "absolute";

  const B = {
    el, hit, R, room: null, x: 800, y: 780, h: 0, z: null, face: 1, faceShown: 1, v: 0, speedMul: 1,
    tok: 0, move: null, jump: null, sayUntil: 0, lift: 0, extraScale: 1, wobble: 0,
  };
  function mount() { scene.actors.append(shadow, el); scene.topfx.append(bubble, eyes); }

  const guard = (t) => { if (t !== B.tok) throw CANCEL; };
  const frame = () => new Promise((r) => requestAnimationFrame(r));

  B.cancel = () => { B.tok++; B.move = null; B.jump = null; B.v = 0; };
  /** quãng đường còn lại để biết sắp tới nơi */
  B.moving = () => !!(B.move || B.jump);
  B.token = () => B.tok;
  B.mount = mount;
  B.setRoom = (id, x, y, h = 0) => { B.room = id; B.x = x; B.y = y; B.h = h; B.z = null; mount(); };
  B.play = (name, o) => R.play(R.resolve(name), o);
  B.faceTo = (dir) => { if (dir) B.face = dir > 0 ? 1 : -1; };

  /** đi bộ / chạy / rình tới (x, y) trên sàn */
  B.walkTo = async (x, y, { gait = "walk", speed } = {}) => {
    const t = B.tok; const clip = R.resolve(gait), inf = R.info(clip);
    const u = (speed || inf.speed || 160) * B.speedMul * (gait === "run" ? B.runMul ?? 0.7 : 1);      // đơn vị hình / giây
    const dx = x - B.x, dy = y - B.y, dist = Math.hypot(dx, dy * 1.6);
    if (dist < 4) return; if (Math.abs(dx) > 6) B.face = dx > 0 ? 1 : -1;
    R.play(clip); B.move = { x, y, u, t };
    while (B.move && B.move.t === t) { await frame(); guard(t); }
    guard(t);
  };
  /** nhảy lên / xuống bề mặt cao h tại (x, y) */
  B.jumpTo = async (x, y, h, z, o = {}) => {
    const t = B.tok; if (Math.abs(x - B.x) > 4) B.face = x > B.x ? 1 : -1;
    R.play(R.resolve("crouch"), { dur: 160 }); await B.wait(220); guard(t);
    R.play(R.resolve("jump"), { dur: 140 });
    const ap = o.apex ?? 60; const j = { x0: B.x, y0: B.y, h0: B.h, x1: x, y1: y, h1: h, ap, t0: performance.now(), dur: (380 + Math.abs(h - B.h) * 0.9 + Math.max(0, ap - 60) * 1.3) / (B.agility || 1), z1: z, t };
    B.jump = j; B.z = Math.max(z ?? 0, B.z ?? 0) || null;
    while (B.jump === j) { await frame(); guard(t); }
    guard(t); B.z = h > 0 ? z : null; R.play(R.resolve("idle"), { dur: 260 });
    B.squash = performance.now();
  };
  B.wait = (ms) => new Promise((r) => setTimeout(r, ms));
  /** diễn động tác trong ms (clip "once" thì chờ xong) */
  B.act = async (name, ms) => {
    const t = B.tok; const c = R.resolve(name); R.play(c, { restart: true });
    const end = performance.now() + (ms || 1e9);
    while (performance.now() < end) { await frame(); guard(t); if (!R.info(c).loop && R.done) break; }
    guard(t);
  };
  B.say = (text, ms = 2600) => {
    if (!text) return; bubble.textContent = text; bubble.hidden = false; bubble.classList.remove("pop"); void bubble.offsetWidth; bubble.classList.add("pop");
    B.sayUntil = performance.now() + ms;
  };

  /** gọi mỗi khung hình */
  let vcur = 0, prevH = 0, tilt = 0, bobPh = 0;
  B.tick = (dt) => {
    let v = 0, bob = 0;
    if (B.move) {
      // tăng tốc / giảm tốc tự nhiên: chân luôn khớp sàn vì clip đi chạy theo đúng tốc độ thật
      const m = B.move, d = depth(B.y), dx = m.x - B.x, dy = m.y - B.y, dist = Math.hypot(dx, dy), pxPerU = k0 * d;
      const acc = m.u / (B.accelT || 0.48), remainU = dist / pxPerU;
      const vEnd = Math.sqrt(2 * acc * 0.9 * remainU) + 18;
      vcur = Math.min(m.u, vcur + acc * dt, vEnd);
      const px = vcur * pxPerU * dt;
      if (dist <= px || dist < 0.6) { B.x = m.x; B.y = m.y; B.move = null; vcur = 0; }
      else {
        B.x += (dx / dist) * px; B.y += (dy / dist) * px; v = vcur; if (Math.abs(dx) > 3) B.face = dx > 0 ? 1 : -1;
        const depthShare = Math.abs(dy) / (dist || 1);
        bobPh += vcur * dt / 42; bob = depthShare > 0.25 ? -Math.abs(Math.sin(bobPh * Math.PI)) * 3.2 * depthShare : 0;     // đi xéo vào trong / ra ngoài: nhún nhẹ theo bước
      }
    } else vcur = 0;
    if (B.jump) {
      const j = B.jump, u = clamp((performance.now() - j.t0) / j.dur, 0, 1), e = ease.inOutSine(u);
      B.x = lerp(j.x0, j.x1, e); B.y = lerp(j.y0, j.y1, e);
      const top = Math.max(j.h0, j.h1) + j.ap + Math.abs(j.x1 - j.x0) * 0.12;
      B.h = u < 0.5 ? lerp(j.h0, top, ease.out(u * 2)) : lerp(top, j.h1, 1 - ease.out(1 - (u - 0.5) * 2));
      if (u >= 1) { B.h = j.h1; B.jump = null; }
    }
    // nghiêng người theo đường bay: lao lên thì ngóc đầu, rơi xuống thì chúi
    const vh = dt > 0 ? (B.h - prevH) / dt : 0; prevH = B.h;
    tilt = lerp(tilt, B.jump ? clamp(-vh * 0.03, -16, 16) : 0, 1 - Math.exp(-dt * 12));
    const adv = R.update(dt, v); if (adv) B.x += B.face * adv * k0 * depth(B.y);
    // quay người: không lật phẳng như tờ giấy – hình co lại tối đa ~78% rồi bung ra phía kia, hơi nhổm lên
    B.faceShown = lerp(B.faceShown, B.face, 1 - Math.exp(-dt * 11));
    const fAbs = Math.abs(B.faceShown), fSign = B.faceShown >= 0 ? 1 : -1, turning = fAbs < 0.98;
    const fx = fSign * (0.22 + 0.78 * fAbs), turnLift = turning ? 1 + 0.035 * (1 - fAbs) : 1;
    let sq = 1; if (B.squash) { const u = (performance.now() - B.squash) / 220; if (u < 1) sq = 1 - 0.07 * Math.sin(u * Math.PI); else B.squash = 0; }
    if (B.knead) sq *= 1 - 0.022 * Math.abs(Math.sin(performance.now() / 190));      // nhào bột: nhún nhịp nhàng
    const d = depth(B.y), k = k0 * d * B.extraScale * (B.ageScale || 1);
    const wob = B.wobble ? Math.sin(performance.now() / 22) * B.wobble : 0;
    el.style.transform = `translate(${(B.x + wob).toFixed(2)}px, ${(B.y - B.h + bob).toFixed(2)}px) scale(${k.toFixed(4)}, ${(k * sq * turnLift).toFixed(4)})`;
    flip.style.transform = `scaleX(${fx.toFixed(3)}) rotate(${(tilt * B.face).toFixed(2)}deg)`;
    el.style.opacity = B.hidden ? 0 : ""; el.style.pointerEvents = B.hidden ? "none" : "";
    el.style.zIndex = B.z != null ? Math.round(B.z) + 1 : Math.round(B.y);
    const [l, r] = R.extent(); const sw = (r - l) * k * 0.8 * (0.4 + 0.6 * fAbs), air = B.jump ? clamp(1 - Math.abs(B.h - Math.min(B.jump.h0, B.jump.h1)) / 260, 0.3, 1) : 1;
    const baseH = B.jump ? Math.min(B.jump.h0, B.jump.h1) : B.h;
    shadow.style.transform = `translate(${(B.x + ((l + r) / 2) * k * fx).toFixed(1)}px, ${(B.y - baseH).toFixed(1)}px) scale(${(sw / 100).toFixed(3)}, ${(sw / 100).toFixed(3)})`;
    shadow.style.opacity = B.hidden ? 0 : (0.32 * air).toFixed(3); shadow.style.zIndex = el.style.zIndex - 1;
    if (!bubble.hidden) {
      if (performance.now() > B.sayUntil) bubble.hidden = true;
      const hy = B.y - B.h - (R.box.ay - 30) * k * 0.82; bubble.style.transform = `translate(${B.x.toFixed(1)}px, ${hy.toFixed(1)}px) translate(-50%, -100%)`;
    }
    const e = R.eye(), n = scene.S.night || 0;
    if (e) { B.hx = B.x + e[0] * k * fx; B.hy = B.y - B.h + e[1] * k; B.k = k; }      // vị trí đầu – để ngậm quà
    eyes.classList.toggle("white", !!B.eyeWhite);
    if (e && !B.hidden && (B.eyeWhite || (n > 0.25 && !R.blinking && !R.clip.startsWith("sleep")))) { eyes.style.opacity = B.eyeWhite ? 1 : ((n - 0.25) * 1.3).toFixed(2); eyes.style.transform = `translate(${(B.x + e[0] * k * fx).toFixed(1)}px, ${(B.y - B.h + e[1] * k).toFixed(1)}px) scale(${(k * (B.eyeWhite ? 2.6 : 1.6)).toFixed(3)})`; }
    else eyes.style.opacity = 0;
  };
  /** khung bao mèo trên màn hình (để biết chạm vào đâu) */
  B.rect = () => R.el.getBoundingClientRect();
  return B;
}
