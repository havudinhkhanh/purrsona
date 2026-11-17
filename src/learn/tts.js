// ĐỌC TO: dùng giọng có sẵn của máy (Web Speech API) – miễn phí, chạy cả khi offline nếu máy có giọng.
// Muốn giọng tự nhiên hơn: thay speak() bằng file mp3 (assets/audio/<lang>/<từ>.mp3) hoặc API TTS qua Worker.
const VOICES = {};
function pickVoice(lang) {
  if (VOICES[lang]) return VOICES[lang];
  const vs = speechSynthesis?.getVoices?.() || [], pre = lang.slice(0, 2);
  const v = vs.find((x) => x.lang === lang && /natural|google|siri|premium|enhanced/i.test(x.name)) || vs.find((x) => x.lang === lang) || vs.find((x) => x.lang?.startsWith(pre));
  if (v) VOICES[lang] = v; return v;
}
if (typeof speechSynthesis !== "undefined") speechSynthesis.onvoiceschanged = () => { for (const k in VOICES) delete VOICES[k]; };
export const canSpeak = () => typeof speechSynthesis !== "undefined";
export function speak(text, lang = "en-GB", rate = 0.9) {
  if (!canSpeak() || !text) return Promise.resolve(false);
  return new Promise((res) => {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = rate; const v = pickVoice(lang); if (v) u.voice = v;
      u.onend = () => res(true); u.onerror = () => res(false); speechSynthesis.speak(u);
      setTimeout(() => res(true), 6000);
    } catch { res(false); }
  });
}
