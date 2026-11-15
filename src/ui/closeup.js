// CẬN MẶT: mèo áp sát "camera" (màn hình điện thoại) – dụi đầu, gõ kính, chớp mắt chậm.
// Có video Flow trong cat.json → "closeups": { "headbutt": "closeups/headbutt.mp4", … } thì phát video đó
// (nền xanh #00FF00 được tách ngay trên canvas). Chưa có → dùng mặt mèo vẽ vector bên dưới.
import * as snd from "../core/sound.js";
import { line } from "../cat/lines.js";


const FACE = (fur, eye) => `<svg class="cu-face" viewBox="0 0 400 420" aria-hidden="true">
  <defs><radialGradient id="cu-iris" cx="50%" cy="42%" r="60%"><stop offset="0" stop-color="#FFE7A3"/><stop offset=".55" stop-color="${eye}"/><stop offset="1" stop-color="#9C6A12"/></radialGradient>
  <clipPath id="cu-eyeclip"><ellipse rx="44" ry="46"/></clipPath><radialGradient id="cu-sheen" cx="35%" cy="20%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
  <g class="cu-ears"><path d="M70 170 L52 22 Q60 14 74 22 L178 110 Z" fill="${fur}"/><path d="M330 170 L348 22 Q340 14 326 22 L222 110 Z" fill="${fur}"/>
  <path d="M84 140 L72 50 L150 112 Z" fill="#3A2730"/><path d="M316 140 L328 50 L250 112 Z" fill="#3A2730"/></g>
  <path d="M200 92 C300 92 368 160 370 250 C372 340 300 410 200 410 C100 410 28 340 30 250 C32 160 100 92 200 92 Z" fill="${fur}"/>
  <path d="M200 92 C300 92 368 160 370 250 C372 340 300 410 200 410 C100 410 28 340 30 250 C32 160 100 92 200 92 Z" fill="url(#cu-sheen)"/>
  <g class="cu-eyes">
    <g class="cu-eye" transform="translate(132 236)" clip-path="url(#cu-eyeclip)"><ellipse rx="44" ry="46" fill="url(#cu-iris)"/><ellipse class="cu-pupil" rx="11" ry="34" fill="#140D05"/><circle cx="-14" cy="-18" r="9" fill="#fff" opacity=".9"/><circle cx="12" cy="16" r="4" fill="#fff" opacity=".5"/><rect class="cu-lid" x="-50" y="-52" width="100" height="104" fill="${fur}"/></g>
    <g class="cu-eye" transform="translate(268 236)" clip-path="url(#cu-eyeclip)"><ellipse rx="44" ry="46" fill="url(#cu-iris)"/><ellipse class="cu-pupil" rx="11" ry="34" fill="#140D05"/><circle cx="-14" cy="-18" r="9" fill="#fff" opacity=".9"/><circle cx="12" cy="16" r="4" fill="#fff" opacity=".5"/><rect class="cu-lid" x="-50" y="-52" width="100" height="104" fill="${fur}"/></g>
  </g>
  <path d="M188 304 h24 l-12 13 Z" fill="#E58B9B"/><path d="M200 317 v10 M200 327 q-12 12 -24 4 M200 327 q12 12 24 4" stroke="#5a4a50" stroke-width="4" fill="none" stroke-linecap="round"/>
  <g stroke="#fff" stroke-opacity=".5" stroke-width="2.4" stroke-linecap="round" fill="none"><path d="M150 318 Q90 306 24 316"/><path d="M150 330 Q92 332 30 350"/><path d="M250 318 Q310 306 376 316"/><path d="M250 330 Q308 332 370 350"/></g>
</svg>`;
const PAW = (fur) => `<svg class="cu-paw" viewBox="0 0 200 260" aria-hidden="true"><path d="M40 260 C30 170 40 90 100 80 C160 90 170 170 160 260 Z" fill="${fur}"/>
  <g fill="#E8A0AE"><ellipse cx="100" cy="128" rx="34" ry="28"/><ellipse cx="58" cy="92" rx="13" ry="16"/><ellipse cx="84" cy="70" rx="13" ry="17"/><ellipse cx="116" cy="70" rx="13" ry="17"/><ellipse cx="142" cy="92" rx="13" ry="16"/></g></svg>`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function createCloseup(game, root) {
  const el = document.createElement("div"); el.className = "closeup"; el.hidden = true; root.appendChild(el);
  const col = game.cat.colors || {}, fur = col.fur || "#0c0c0f", eye = col.eye || "#E9B949";
  let busy = false;
  const buzz = (p) => game.buzz?.(p);
  const sayIn = (t) => { const b = el.querySelector(".cu-say"); if (!b) return; b.textContent = t; b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); };
  const heart = (x, y) => { const h = document.createElement("i"); h.className = "cu-heart"; h.textContent = "♥"; h.style.left = x + "%"; h.style.top = y + "%"; el.appendChild(h); setTimeout(() => h.remove(), 1600); };
  /** vết mũi + lông in trên "kính" – vuốt để lau */
  function smudge() {
    const m = document.createElement("div"); m.className = "smudge"; root.appendChild(m);
    let wiped = 0; const wipe = (e) => { wiped += Math.abs(e.movementX) + Math.abs(e.movementY); m.style.opacity = Math.max(0, 1 - wiped / 900); if (wiped > 900) end(); };
    const end = () => { m.removeEventListener("pointermove", wipe); m.classList.add("gone"); setTimeout(() => m.remove(), 600); };
    m.addEventListener("pointermove", wipe); setTimeout(end, 12000);
    m.addEventListener("pointerdown", () => game.emit("toast", { text: "Vuốt để lau vết mũi mèo 🐾" }), { once: true });
  }

  /** phát video Flow nếu mèo có; trả về false nếu không có / lỗi để dùng bản vector */
  async function video(kind) {
    const url = game.cat.closeups?.[kind]; if (!url) return false;
    const v = document.createElement("video"); v.src = new URL(url, game.cat.base || location.href).href; v.muted = true; v.playsInline = true; v.crossOrigin = "anonymous";
    const c = document.createElement("canvas"); c.className = "cu-video"; const g = c.getContext("2d", { willReadFrequently: true });
    try { await v.play(); } catch { return false; }
    c.width = v.videoWidth; c.height = v.videoHeight; el.innerHTML = ""; el.appendChild(c); el.hidden = false; requestAnimationFrame(() => el.classList.add("on"));
    await new Promise((res) => {
      const step = () => {
        if (v.ended || v.paused) return res();
        g.drawImage(v, 0, 0); const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
        for (let i = 0; i < p.length; i += 4) { const r = p[i], gg = p[i + 1], b = p[i + 2]; const k = gg - Math.max(r, b); if (k > 40) p[i + 3] = 0; else if (k > 12) { p[i + 3] = 255 - (k - 12) * 9; p[i + 1] = Math.max(r, b); } }
        g.putImageData(d, 0, 0); requestAnimationFrame(step);
      }; step();
    });
    return true;
  }
  const open = (cls, extra = "") => { el.className = "closeup " + cls; el.innerHTML = `<div class="cu-stage">${FACE(fur, eye)}</div>${extra}<div class="cu-say"></div>`; el.hidden = false; void el.offsetWidth; el.classList.add("on"); };
  const close = async () => { el.classList.remove("on"); el.classList.add("off"); await wait(700); el.hidden = true; el.className = "closeup"; el.innerHTML = ""; };

  const CU = {
    get busy() { return busy; },
    /** dụi đầu vào màn hình. Chạm/vuốt lên mặt mèo lúc này = gãi lại → rất thân */
    async headbutt() {
      if (busy) return {}; busy = true; let back = 0;
      try {
        if (await video("headbutt")) { await close(); smudge(); return { back }; }
        open("cu-headbutt"); const stage = el.querySelector(".cu-stage");
        const onPet = (e) => { if (e.buttons || e.pointerType === "touch") { back++; if (back % 6 === 1) { heart(30 + Math.random() * 40, 30 + Math.random() * 30); buzz(8); } } };
        stage.addEventListener("pointermove", onPet); stage.addEventListener("pointerdown", () => { back += 3; heart(50, 40); buzz(12); });
        if (game.save.settings.sound) snd.purr(true);
        await wait(900); el.classList.add("press"); buzz([14, 60, 14]); sayIn(line("headbutt", game.today.mood.id));
        await wait(700); el.classList.add("rub"); for (let i = 0; i < 3; i++) { heart(20 + i * 30, 50); await wait(520); }
        el.classList.add("blink"); await wait(900); el.classList.remove("blink");
        if (back > 4) { sayIn(line("headbutt_back")); heart(45, 30); heart(60, 35); await wait(1200); }
        await wait(600); snd.purr(false); await close(); smudge();
        return { back };
      } finally { busy = false; snd.purr(false); }
    },
    /** gõ vào màn hình khi nhớ bạn – chạm để đáp lại */
    async pawtap() {
      if (busy) return {}; busy = true;
      try {
        if (await video("pawtap")) { await close(); return { answered: true }; }
        open("cu-pawtap", PAW(fur)); sayIn(line("pawtap"));
        let answered = false; el.onpointerdown = () => { answered = true; buzz(10); };
        for (let i = 0; i < 2 && !answered; i++) { await wait(700); el.classList.add("tap"); buzz(18); const r = document.createElement("i"); r.className = "cu-ring"; el.appendChild(r); setTimeout(() => r.remove(), 900); await wait(260); el.classList.remove("tap"); }
        const end = Date.now() + 5200; while (!answered && Date.now() < end) await wait(120);
        sayIn(line(answered ? "pawtap_ok" : "pawtap_no")); if (answered) { heart(40, 40); heart(60, 34); }
        await wait(1300); el.onpointerdown = null; await close();
        return { answered };
      } finally { busy = false; }
    },
    /** chớp mắt chậm = "hôn bằng mắt". Bấm "Chớp lại" để đáp */
    async slowblink() {
      if (busy) return {}; busy = true;
      try {
        if (await video("slowblink")) { await close(); return { back: true }; }
        open("cu-blink", `<button class="cu-btn">Chớp mắt lại 😌</button>`);
        let back = false; el.querySelector(".cu-btn").onclick = (e) => { e.stopPropagation(); back = true; buzz(10); };
        await wait(1100); el.classList.add("blink"); await wait(1500); el.classList.remove("blink");
        const end = Date.now() + 5000; while (!back && Date.now() < end) await wait(120);
        if (back) { el.classList.add("blink"); sayIn(line("blink_back")); heart(50, 34); await wait(1300); el.classList.remove("blink"); }
        await wait(500); await close(); return { back };
      } finally { busy = false; }
    },
  };
  return CU;
}
