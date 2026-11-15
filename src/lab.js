import { createCatRenderer, listCats } from "./render/registry.js";
import { CLIPS } from "./render/clips.js";

const $ = (s) => document.querySelector(s);
let R = null, cur = "idle", x = 200, face = 1, raf = 0, frames = [], scale = 0.9;

async function load(id) {
  cancelAnimationFrame(raf); if (R) R.destroy();
  R = await createCatRenderer(id); await R.ready;
  const w = document.createElement("div"); w.className = "catw"; w.appendChild(R.el); $("#stage").innerHTML = ""; $("#stage").appendChild(w);
  R.el.style.width = R.box.w * scale + "px"; R.el.style.height = R.box.h * scale + "px"; R.el.style.left = R.el.style.top = "0"; w.style.width = R.el.style.width; w.style.height = R.el.style.height;
  renderList(); play("idle"); raf = requestAnimationFrame(tick);
}
function renderList() {
  $("#clips").innerHTML = Object.entries(CLIPS).map(([k, v]) => {
    const real = R.resolve(k), miss = real !== k;
    return `<button data-k="${k}" class="${miss ? "miss" : ""} ${k === cur ? "on" : ""}"><b>${v.vi}</b><small>${k}${miss ? " → " + real : ""} · ${v.kind}</small></button>`;
  }).join("");
}
function play(k) { cur = k; R.play(R.resolve(k), { restart: true }); renderList(); }
let last = 0;
function tick(t) {
  const dt = last ? Math.min(0.05, (t - last) / 1000) * +$("#slow").value : 0; last = t;
  frames.push(t); while (frames.length && t - frames[0] > 1000) frames.shift(); $("#fps").textContent = frames.length + " khung/giây (màn hình)";
  const inf = R.info(R.resolve(cur)), v = inf.moves && $("#mv").checked ? (inf.speed || 150) * +$("#spd").value : 0;
  const W = $("#stage").clientWidth;
  if (v) { x += face * v * dt * scale; if (x > W - 120) face = -1; if (x < 120) face = 1; }
  const adv = R.update(dt, v); if (adv) x += face * adv * scale;
  if (R.done) play(cur === "idle" ? "idle" : "idle");
  const w = R.el.parentElement; w.style.left = x - R.box.ax * scale + "px"; w.style.transform = `scaleX(${face})`; w.style.transformOrigin = `${R.box.ax * scale}px 100%`;
  w.style.bottom = 40 - (R.box.h - R.box.ay) * scale + "px";
  raf = requestAnimationFrame(tick);
}
$("#clips").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) play(b.dataset.k); });
$("#cat").addEventListener("change", (e) => load(e.target.value));
const cats = await listCats();
$("#cat").innerHTML = cats.map((c) => `<option value="${c.id}">${c.name} · ${c.renderer}</option>`).join("");
load(cats[0].id);
