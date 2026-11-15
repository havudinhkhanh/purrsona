// NHẠC LO-FI tự sinh bằng Web Audio (không cần file, không bản quyền): hợp âm Rhodes êm, bass trầm, tiếng lách tách đĩa than,
// nhịp ~72 BPM, mỗi 4 ô nhịp đổi màu hợp âm. Ban đêm tự dịu xuống. Muốn dùng nhạc thật: thay start() bằng new Audio("assets/music/x.mp3").
let AC = null, master = null, on = false, timer = 0, step = 0, crackle = null;
const PROG = [
  [[53, 57, 60, 64], 41], [[52, 55, 59, 62], 40], [[50, 53, 57, 60], 38], [[48, 52, 55, 59], 36],     // Fmaj7 · Em7 · Dm7 · Cmaj7
  [[46, 50, 53, 57], 34], [[45, 48, 52, 55], 33], [[50, 53, 57, 60], 38], [[43, 47, 50, 53], 31],     // Bbmaj7 · Am7 · Dm7 · G7
];
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
function ensure() { if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = 0; const lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2200; master.connect(lp); lp.connect(AC.destination); } if (AC.state === "suspended") AC.resume(); }
function note(m, t, d, v, type = "sine") {
  const o = AC.createOscillator(), o2 = AC.createOscillator(), g = AC.createGain(); o.type = type; o2.type = "sine"; o.frequency.value = hz(m); o2.frequency.value = hz(m) * 2.001;
  const g2 = AC.createGain(); g2.gain.value = 0.18; o2.connect(g2); g2.connect(g); o.connect(g); g.connect(master);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.03); g.gain.exponentialRampToValueAtTime(v * 0.4, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.start(t); o2.start(t); o.stop(t + d + 0.05); o2.stop(t + d + 0.05);
}
function startCrackle() {
  const len = AC.sampleRate * 3, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() < 0.0009 ? (Math.random() * 2 - 1) * 0.8 : (Math.random() * 2 - 1) * 0.015;
  crackle = AC.createBufferSource(); crackle.buffer = buf; crackle.loop = true; const g = AC.createGain(); g.gain.value = 0.35; const hp = AC.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 900; crackle.connect(hp); hp.connect(g); g.connect(master); crackle.start();
}
function bar() {
  if (!on) return; const beat = 60 / 72, t0 = AC.currentTime + 0.05, [ch, bass] = PROG[Math.floor(step / 2) % PROG.length];
  ch.forEach((m, i) => note(m, t0 + i * 0.03, beat * 3.6, 0.07));                       // rải hợp âm nhẹ
  note(bass, t0, beat * 1.8, 0.16, "triangle"); note(bass, t0 + beat * 2, beat * 1.6, 0.12, "triangle");
  const mel = [ch[3] + 12, ch[2] + 12, ch[1] + 12, ch[3] + 14]; for (let i = 0; i < 2; i++) if (Math.random() < 0.6) note(mel[Math.floor(Math.random() * mel.length)], t0 + beat * (1 + i * 1.5 + (Math.random() < 0.5 ? 0.5 : 0)), beat * 1.4, 0.045);
  step++; timer = setTimeout(bar, beat * 4 * 1000 - 20);
}
export const music = {
  get on() { return on; },
  start(vol = 0.55) { ensure(); if (on) return; on = true; step = 0; master.gain.cancelScheduledValues(AC.currentTime); master.gain.setTargetAtTime(vol, AC.currentTime, 1.2); startCrackle(); bar(); },
  stop() { if (!on) return; on = false; clearTimeout(timer); master.gain.setTargetAtTime(0, AC.currentTime, 0.6); setTimeout(() => { try { crackle?.stop(); } catch { /* đã dừng */ } }, 2500); },
  volume(v) { if (master && on) master.gain.setTargetAtTime(v, AC.currentTime, 1.5); },
};
