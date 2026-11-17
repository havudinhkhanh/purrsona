// NHẠC LO-FI tự sinh bằng Web Audio (không file, không bản quyền).
// Đàn Rhodes (FM) rải hợp âm 7–9 lười biếng, bass tròn, trống boom-bap nhỏ & nhún (swing), băng cassette chao nhẹ,
// tiếng đĩa than lách tách + mưa lâm râm, phòng vang ấm. ~70 BPM, mỗi 8 ô nhịp đổi vòng hợp âm, thỉnh thoảng nghỉ trống cho thở.
// Ban đêm game gọi volume() cho dịu xuống. Muốn dùng nhạc thật: thay start() bằng new Audio("assets/music/x.mp3").
let AC = null, on = false, timer = 0;
let input, drumBus, keysBus, revSend, master, noiseBuf, crackle = null, bed = null;
let bar = 0, nextT = 0, prog = null, motif = null, key = 0;
const BPM = 70, BEAT = 60 / BPM, S16 = BEAT / 4, SWING = 0.14 * S16;     // 16 phần nhịp, nốt lẻ trễ một chút = "nhún"

// vòng hợp âm (đã xếp thế tay cho êm): [bass, [nốt]] – giọng C, sẽ dịch theo key
const PROGS = [
  [[38, [53, 60, 64, 69]], [43, [53, 59, 64, 69]], [36, [52, 59, 62, 67]], [45, [55, 60, 64, 71]]],      // Dm9 · G13 · Cmaj9 · Am9
  [[41, [52, 57, 60, 67]], [40, [50, 55, 59, 62]], [38, [53, 57, 60, 64]], [36, [52, 55, 59, 62]]],      // Fmaj9 · Em7 · Dm9 · Cmaj7
  [[45, [55, 60, 64, 67]], [41, [52, 57, 60, 64]], [36, [52, 55, 59, 62]], [43, [53, 57, 59, 64]]],      // Am7 · Fmaj7 · Cmaj7 · G9sus
  [[41, [52, 57, 60, 64]], [43, [53, 57, 62, 65]], [40, [50, 55, 59, 62]], [45, [52, 55, 60, 67]]],      // Fmaj7 · G7sus · Em7 · Am7
];
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function impulse(sec = 2.6) {      // phòng vang tự tạo: nhiễu tắt dần, đuôi tối dần
  const n = Math.floor(AC.sampleRate * sec), b = AC.createBuffer(2, n, AC.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { const t = i / n; lp += ((Math.random() * 2 - 1) - lp) * (0.5 - 0.42 * t); d[i] = lp * Math.pow(1 - t, 2.6); } }
  return b;
}
function lfo(freq, depth, target, type = "sine") { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = freq; g.gain.value = depth; o.connect(g); g.connect(target); o.start(); return o; }

function ensure() {
  if (!AC) {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    // chuỗi tổng: chao băng (delay rung) → bão hoà nhẹ → cắt treble → cắt rền → loa
    master = AC.createGain(); master.gain.value = 0;
    const wob = AC.createDelay(0.1); wob.delayTime.value = 0.014; lfo(0.55, 0.0016, wob.delayTime); lfo(5.3, 0.00018, wob.delayTime);
    const sat = AC.createWaveShaper(), curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; curve[i] = Math.tanh(x * 1.6) / Math.tanh(1.6); } sat.curve = curve;
    const lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2600; lp.Q.value = 0.4; lfo(0.05, 350, lp.frequency);      // treble mở/đóng rất chậm như sóng radio
    const hp = AC.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 38;
    input = AC.createGain(); input.gain.value = 0.9;
    input.connect(wob); wob.connect(sat); sat.connect(lp); lp.connect(hp); hp.connect(master); master.connect(AC.destination);
    const rev = AC.createConvolver(); rev.buffer = impulse(); revSend = AC.createGain(); revSend.gain.value = 0.32; revSend.connect(rev); rev.connect(input);
    keysBus = AC.createGain(); keysBus.gain.value = 1; keysBus.connect(input);
    drumBus = AC.createGain(); drumBus.gain.value = 0.55; const dlp = AC.createBiquadFilter(); dlp.type = "lowpass"; dlp.frequency.value = 6000; drumBus.connect(dlp); dlp.connect(input);
    const n = AC.sampleRate; noiseBuf = AC.createBuffer(1, n, n); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  if (AC.state === "suspended") AC.resume();
}

// ------------------------------------------------------------------ nhạc cụ
function rhodes(m, t, dur, vel, dest = keysBus, pan = 0) {
  const f = hz(m + key), car = AC.createOscillator(), mod = AC.createOscillator(), mg = AC.createGain(), amp = AC.createGain();
  car.frequency.value = f; mod.frequency.value = f; car.detune.value = rnd(-6, 6);
  // FM: chỉ số điều biến cao lúc gõ rồi tắt nhanh → tiếng "tine" mềm, sau đó tròn như sine
  mg.gain.setValueAtTime(f * 2.2 * vel, t); mg.gain.exponentialRampToValueAtTime(f * 0.18, t + 0.6);
  mod.connect(mg); mg.connect(car.frequency); car.connect(amp);
  amp.gain.setValueAtTime(0.0001, t); amp.gain.exponentialRampToValueAtTime(0.17 * vel, t + 0.012); amp.gain.exponentialRampToValueAtTime(0.07 * vel, t + 0.9); amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let out = amp; if (AC.createStereoPanner) { const p = AC.createStereoPanner(); p.pan.value = pan; amp.connect(p); out = p; }
  out.connect(dest); const s = AC.createGain(); s.gain.value = 0.55; out.connect(s); s.connect(revSend);
  car.start(t); mod.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
}
function bass(m, t, dur, vel) {
  const o = AC.createOscillator(), g = AC.createGain(), lp = AC.createBiquadFilter(); o.type = "triangle"; o.frequency.value = hz(m + key);
  lp.type = "lowpass"; lp.frequency.value = 260; o.connect(lp); lp.connect(g); g.connect(keysBus);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2 * vel, t + 0.04); g.gain.exponentialRampToValueAtTime(0.1 * vel, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o.stop(t + dur + 0.05);
}
function noise(t, dur, type, freq, q, vel, dest, rev = 0) {
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = noiseBuf; s.playbackRate.value = rnd(0.9, 1.1);
  f.type = type; f.frequency.value = freq; f.Q.value = q; s.connect(f); f.connect(g); g.connect(dest);
  if (rev) { const r = AC.createGain(); r.gain.value = rev; g.connect(r); r.connect(revSend); }
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.start(t, Math.random() * 0.8); s.stop(t + dur + 0.02);
}
function kick(t, vel) {
  const o = AC.createOscillator(), g = AC.createGain(); o.frequency.setValueAtTime(105, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
  o.connect(g); g.connect(drumBus); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.42 * vel, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
  o.start(t); o.stop(t + 0.42);
  // nhún: đàn lùi nhẹ khi trống đá rồi trồi lên lại
  keysBus.gain.setTargetAtTime(0.72, t, 0.012); keysBus.gain.setTargetAtTime(1, t + 0.06, 0.12);
}
function snare(t, vel) {
  noise(t, 0.16, "bandpass", 1900, 0.7, 0.32 * vel, drumBus, 0.35);
  const o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = 185; o.connect(g); g.connect(drumBus);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12 * vel, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); o.start(t); o.stop(t + 0.12);
}
const hat = (t, vel) => noise(t, rnd(0.03, 0.05), "highpass", 5200, 0.5, 0.11 * vel, drumBus);

// ------------------------------------------------------------------ nền: đĩa than + mưa lâm râm
function startBed() {
  const len = AC.sampleRate * 4, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() < 0.0006 ? (Math.random() * 2 - 1) * 0.7 : (Math.random() * 2 - 1) * 0.008;
  crackle = AC.createBufferSource(); crackle.buffer = buf; crackle.loop = true;
  const hp = AC.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 700; const g = AC.createGain(); g.gain.value = 0.16;
  crackle.connect(hp); hp.connect(g); g.connect(master); crackle.start();
  bed = AC.createBufferSource(); bed.buffer = noiseBuf; bed.loop = true;
  const bp = AC.createBiquadFilter(); bp.type = "lowpass"; bp.frequency.value = 900; const bg = AC.createGain(); bg.gain.value = 0.018; lfo(0.08, 0.006, bg.gain);
  bed.connect(bp); bp.connect(bg); bg.connect(master); bed.start();
}

// ------------------------------------------------------------------ soạn từng ô nhịp
const human = () => rnd(-0.012, 0.012);
const at = (t0, i) => t0 + i * S16 + (i % 2 ? SWING : 0) + human();      // vị trí nốt 16 có swing + lệch tay
function newMotif() {      // giai điệu thưa 2–4 nốt, lặp lại qua các hợp âm cho có "câu"
  const n = 2 + Math.floor(Math.random() * 3), slots = [2, 3, 6, 8, 10, 11, 14].sort(() => Math.random() - 0.5).slice(0, n).sort((a, b) => a - b);
  return slots.map((s) => ({ s, k: Math.floor(Math.random() * 4), up: Math.random() < 0.3 ? 2 : 0, len: rnd(1.2, 2.4) }));
}
function playBar(t0) {
  if (bar % 8 === 0) { prog = pick(PROGS); if (bar % 16 === 0) motif = newMotif(); }
  const [b, ch] = prog[bar % 4], drums = bar >= 2 && bar % 16 !== 14 && bar % 16 !== 15;      // 2 ô đầu & 2 ô cuối mỗi 16 ô: nghỉ trống
  // đàn: rải lười từ dưới lên, thỉnh thoảng đánh lại nửa sau ô nhịp
  const strum = rnd(0.018, 0.04);
  ch.forEach((m, i) => rhodes(m, t0 + i * strum + human(), BEAT * 3.8, rnd(0.62, 0.8), keysBus, (i - 1.5) * 0.18));
  if (Math.random() < 0.45) ch.slice(1).forEach((m, i) => rhodes(m, at(t0, 10) + i * 0.02, BEAT * 1.6, rnd(0.35, 0.48), keysBus, (i - 1) * 0.2));
  // bass
  bass(b, t0 + human(), BEAT * 1.7, 1); if (Math.random() < 0.7) bass(Math.random() < 0.25 ? b + 7 : b, at(t0, 10), BEAT * 1.2, 0.75);
  // giai điệu: nốt trong hợp âm, lên một quãng tám, chỉ 1 nửa số ô nhịp có
  if (motif && (bar % 4 === 1 || bar % 4 === 2 || Math.random() < 0.25)) for (const n of motif) if (Math.random() < 0.85) rhodes(ch[n.k] + 12 + n.up, at(t0, n.s), BEAT * n.len, rnd(0.45, 0.6), keysBus, rnd(-0.3, 0.3));
  if (!drums) return;
  kick(at(t0, 0), 1); if (Math.random() < 0.55) kick(at(t0, 7), 0.6); kick(at(t0, 10), 0.85);
  snare(at(t0, 4), rnd(0.85, 1)); snare(at(t0, 12), rnd(0.85, 1)); if (Math.random() < 0.25) snare(at(t0, 15), 0.25);
  for (let i = 0; i < 16; i += 2) hat(at(t0, i), i % 4 ? rnd(0.45, 0.6) : rnd(0.8, 1));
  for (let i = 1; i < 16; i += 2) if (Math.random() < 0.18) hat(at(t0, i), rnd(0.2, 0.35));
}
function schedule() {
  if (!on) return;
  // xếp lịch trước ~1,5 giây theo đồng hồ âm thanh (không lệch nhịp khi máy bận)
  while (nextT < AC.currentTime + 1.5) { if (nextT < AC.currentTime) nextT = AC.currentTime + 0.05; playBar(nextT); bar++; nextT += BEAT * 4; }
  timer = setTimeout(schedule, 300);
}

export const music = {
  get on() { return on; },
  start(vol = 0.55) {
    ensure(); if (on) return; on = true; bar = 0; key = pick([0, -2, 3, -4]); prog = null; motif = null; nextT = AC.currentTime + 0.1;
    master.gain.cancelScheduledValues(AC.currentTime); master.gain.setTargetAtTime(vol, AC.currentTime, 2);
    startBed(); schedule();
  },
  stop() {
    if (!on) return; on = false; clearTimeout(timer); master.gain.setTargetAtTime(0, AC.currentTime, 0.7);
    const old = [crackle, bed]; crackle = bed = null;
    setTimeout(() => { for (const s of old) { try { s?.stop(); } catch { /* đã dừng */ } } }, 3000);
  },
  volume(v) { if (master && on) master.gain.setTargetAtTime(v, AC.currentTime, 1.5); },
  /** đánh thức lại sau khi iPhone treo bộ âm thanh (vào nền, có cuộc gọi, bật lúc chưa chạm hẳn) */
  resume() { if (AC && AC.state !== "running") AC.resume().then(() => { if (on && nextT < AC.currentTime) nextT = AC.currentTime + 0.1; }).catch(() => {}); },
};
