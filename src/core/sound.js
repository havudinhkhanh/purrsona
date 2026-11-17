// Âm thanh tổng hợp bằng Web Audio (không cần file): tiếng meo (từ na – my-bit) + tiếng rừ rừ.
// Muốn dùng file thật: thay meow()/purr() bằng new Audio("assets/sfx/meow1.mp3").play().
let AC = null, purrNode = null;
const rnd = (a, b) => a + Math.random() * (b - a);
export const unlock = () => { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch { /* bỏ qua */ } };
const ok = () => AC && AC.state === "running" && !document.hidden;

export function meow(n = 1, pitch = 1) {
  if (!ok()) return;
  for (let k = 0; k < n; k++) {
    const t = AC.currentTime + k * 0.62 + 0.02, d = rnd(0.48, 0.7), f0 = rnd(560, 700) * (k ? 1.06 : 1) * pitch, out = AC.createGain(); out.gain.value = 0.18; out.connect(AC.destination);
    const o = AC.createOscillator(), o2 = AC.createOscillator(), lfo = AC.createOscillator(), lg = AC.createGain(); o.type = "sawtooth"; o2.type = "triangle"; lfo.frequency.value = 6.5; lg.gain.value = 14; lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
    [[o, 1], [o2, 2]].forEach(([os, m]) => { os.frequency.setValueAtTime(f0 * 0.82 * m, t); os.frequency.linearRampToValueAtTime(f0 * 1.38 * m, t + d * 0.32); os.frequency.linearRampToValueAtTime(f0 * 0.78 * m, t + d); });
    const b1 = AC.createBiquadFilter(), b2 = AC.createBiquadFilter(), g = AC.createGain(); b1.type = b2.type = "bandpass"; b1.Q.value = 5; b2.Q.value = 7;
    b1.frequency.setValueAtTime(800, t); b1.frequency.linearRampToValueAtTime(1700, t + d * 0.35); b1.frequency.linearRampToValueAtTime(700, t + d);
    b2.frequency.setValueAtTime(2200, t); b2.frequency.linearRampToValueAtTime(2900, t + d * 0.35); b2.frequency.linearRampToValueAtTime(1900, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + 0.07); g.gain.setValueAtTime(1, t + d * 0.62); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(b1); o.connect(b2); o2.connect(b1); b1.connect(g); b2.connect(g); g.connect(out);
    [o, o2, lfo].forEach((x) => { x.start(t); x.stop(t + d + 0.05); });
  }
}
/** rừ rừ: nhiễu lọc thấp, nhịp ~25 Hz */
export function purr(on) {
  if (!on) { if (purrNode) { const p = purrNode; purrNode = null; p.g.gain.setTargetAtTime(0, AC.currentTime, 0.15); setTimeout(() => p.src.stop(), 600); } return; }
  if (!ok() || purrNode) return;
  const len = AC.sampleRate * 2, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) { const t = i / AC.sampleRate, beat = 0.5 + 0.5 * Math.sin(2 * Math.PI * 24 * t), breath = 0.55 + 0.45 * Math.sin(2 * Math.PI * 0.5 * t); d[i] = (Math.random() * 2 - 1) * beat * beat * breath; }
  const src = AC.createBufferSource(); src.buffer = buf; src.loop = true;
  const lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 180; const g = AC.createGain(); g.gain.value = 0;
  src.connect(lp); lp.connect(g); g.connect(AC.destination); src.start(); g.gain.setTargetAtTime(0.5, AC.currentTime, 0.2); purrNode = { src, g };
}
export function hiss() {
  if (!ok()) return; const t = AC.currentTime, len = AC.sampleRate * 0.6, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.min(1, i / 800) * (1 - i / len);
  const s = AC.createBufferSource(); s.buffer = buf; const hp = AC.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2500; const g = AC.createGain(); g.gain.value = 0.12; s.connect(hp); hp.connect(g); g.connect(AC.destination); s.start(t);
}

/** sấm: nhiễu trầm lọc thấp, rền dài */
export function thunder() {
  if (!ok()) return; const t = AC.currentTime, len = AC.sampleRate * 3.2, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
  let v = 0; for (let i = 0; i < len; i++) { v = v * 0.985 + (Math.random() * 2 - 1) * 0.15; const e = Math.min(1, i / 2400) * Math.pow(1 - i / len, 1.6) * (0.7 + 0.3 * Math.sin(i / 3100)); d[i] = v * e * 3; }
  const s = AC.createBufferSource(); s.buffer = buf; const lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 260; const g = AC.createGain(); g.gain.value = 0.55; s.connect(lp); lp.connect(g); g.connect(AC.destination); s.start(t);
}

/** "rầm" – tiếng đồ rơi / bước chân dồn dập */
export function thunk() {
  if (!ok()) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = "sine"; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.35);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + 0.5);
  const len = AC.sampleRate * 0.25, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const n = AC.createBufferSource(); n.buffer = buf; const lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; const g2 = AC.createGain(); g2.gain.value = 0.35; n.connect(lp); lp.connect(g2); g2.connect(AC.destination); n.start(t);
}
/** màn trập máy ảnh */
export function shutter() {
  if (!ok()) return; const t = AC.currentTime; for (const dt of [0, 0.07]) { const len = AC.sampleRate * 0.04, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len); const n = AC.createBufferSource(); n.buffer = buf; const hp = AC.createBiquadFilter(); hp.type = "bandpass"; hp.frequency.value = 3000; const g = AC.createGain(); g.gain.value = 0.25; n.connect(hp); hp.connect(g); g.connect(AC.destination); n.start(t + dt); }
}

// ------------------------------------------------------------------ tiếng đồ vật cho các trò của mèo (tổng hợp, không cần file)
const noiseBuf = (sec, shape) => { const len = Math.max(1, Math.floor(AC.sampleRate * sec)), b = AC.createBuffer(1, len, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * shape(i / len); return b; };
function tone(f, t, d, v, type = "sine", f2) { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.03); }
/** cốc / chậu sứ va: vài hoạ âm cao tắt nhanh */
export function clink(pitch = 1) { if (!ok()) return; const t = AC.currentTime; [1, 2.76, 5.4].forEach((m, i) => tone(1250 * pitch * m, t + i * 0.004, 0.35 - i * 0.08, 0.08 / (i + 1))); }
/** vải sột soạt / đồ bay qua: nhiễu quét */
export function swish() { if (!ok()) return; const t = AC.currentTime, s = AC.createBufferSource(); s.buffer = noiseBuf(0.45, (x) => Math.sin(Math.PI * x)); const f = AC.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.2; f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.4); const g = AC.createGain(); g.gain.value = 0.16; s.connect(f); f.connect(g); g.connect(AC.destination); s.start(t); }
/** bụp nhẹ: đồ mềm rơi (khăn, gối, tất) */
export function plop() { if (!ok()) return; const t = AC.currentTime; tone(180, t, 0.18, 0.25, "sine", 70); const s = AC.createBufferSource(); s.buffer = noiseBuf(0.12, (x) => Math.pow(1 - x, 3)); const f = AC.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 600; const g = AC.createGain(); g.gain.value = 0.18; s.connect(f); f.connect(g); g.connect(AC.destination); s.start(t); }
/** chuông đồng hồ báo thức reng reng */
export function ring() { if (!ok()) return; const t = AC.currentTime; for (let i = 0; i < 10; i++) tone(i % 2 ? 2350 : 2600, t + i * 0.06, 0.07, 0.05, "square"); }
/** chìa khoá leng keng */
export function jingle() { if (!ok()) return; const t = AC.currentTime; for (let i = 0; i < 5; i++) tone(3000 + Math.random() * 1600, t + i * 0.045 + Math.random() * 0.02, 0.12, 0.05, "triangle"); }
/** bật dù: phựt */
export function pop() { if (!ok()) return; const t = AC.currentTime; tone(420, t, 0.09, 0.2, "sine", 900); }
/** đất văng lộp độp */
export function patter() { if (!ok()) return; const t = AC.currentTime; for (let i = 0; i < 6; i++) tone(240 + Math.random() * 160, t + 0.05 + i * 0.035 + Math.random() * 0.02, 0.06, 0.06, "triangle", 90); }
