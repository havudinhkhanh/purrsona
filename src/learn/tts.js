// ĐỌC TO: giọng có sẵn của máy (Web Speech API) – miễn phí, chạy cả khi offline nếu máy có giọng.
// Mấy cái bẫy đã xử lý:
//  • iPhone: lần đọc đầu phải nằm ngay trong cú chạm; nút gạt im lặng làm câm giọng đọc → phát 1 đoạn
//    âm thanh im lặng bằng <audio> để chuyển phiên âm thanh sang "phát" (đọc được cả khi gạt im lặng).
//  • Chrome: gọi cancel() rồi speak() liền nhau hay nuốt mất câu; câu đọc bị dọn rác giữa chừng → giữ tham chiếu.
//  • Chrome: bộ đọc tự "pause" sau một lúc → resume() trước khi đọc.
// Muốn giọng tự nhiên hơn: thay speak() bằng file mp3 hoặc API TTS qua Worker (gói Pro).
const VOICES = {};
let current = null, unlocked = false, onIssue = null;
export const canSpeak = () => typeof speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined";
/** nhận báo lỗi để hiện cho người dùng: fn(kind, lang) với kind = "none" | "voice" | "error" */
export function onSpeakIssue(fn) { onIssue = fn; }

function voices() { try { return speechSynthesis.getVoices() || []; } catch { return []; } }
function pickVoice(lang) {
  if (VOICES[lang]) return VOICES[lang];
  const vs = voices(), pre = lang.slice(0, 2).toLowerCase(), norm = (x) => (x.lang || "").replace("_", "-").toLowerCase();
  const exact = vs.filter((x) => norm(x) === lang.toLowerCase()), same = vs.filter((x) => norm(x).startsWith(pre));
  // ưu tiên giọng có sẵn trong máy (chạy offline); giọng mạng (vd "Google UK English") để cuối
  const good = (L) => L.find((x) => x.localService && /premium|enhanced|natural|neural|siri/i.test(x.name)) || L.find((x) => x.localService) || L.find((x) => /premium|enhanced|natural|neural|siri|google/i.test(x.name)) || L[0];
  const v = good(exact) || good(same) || null;
  if (v) VOICES[lang] = v; return v;
}
if (canSpeak()) { voices(); speechSynthesis.addEventListener?.("voiceschanged", () => { for (const k in VOICES) delete VOICES[k]; }); }

// 0,1 giây im lặng (WAV) – dùng để mở khoá âm thanh trên iPhone
const SILENT = "data:audio/wav;base64,UklGRvQHAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YdAHAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==";
/** gọi trong cú chạm (click/touchend): mở khoá loa + bộ đọc. Chỉ coi là xong khi âm thanh thật sự phát được. */
export function unlockSpeech() {
  if (unlocked || !canSpeak()) return;
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch { /* Safari cũ */ }      // Safari 17+: đọc cả khi gạt im lặng
  try { const a = new Audio(SILENT); a.setAttribute("playsinline", ""); a.play().then(() => { unlocked = true; }).catch(() => {}); } catch { /* bỏ qua */ }
  try { if (!speechSynthesis.speaking) { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); } } catch { /* bỏ qua */ }
}
/** quiet = true: tự đọc (không do bấm) → có lỗi cũng im, khỏi làm phiền */
export function speak(text, lang = "en-GB", rate = 0.9, quiet = false) {
  if (!text) return Promise.resolve(false);
  if (!canSpeak()) { if (!quiet) onIssue?.("none", lang); return Promise.resolve(false); }
  return new Promise((res) => {
    const go = () => {
      try {
        const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = rate; u.pitch = 1; u.volume = 1;
        const v = pickVoice(lang); if (v) u.voice = v; else if (voices().length && !quiet) onIssue?.("voice", lang);
        let done = false; const end = (ok) => { if (done) return; done = true; if (current === u) current = null; res(ok); };
        u.onend = () => end(true);
        u.onerror = (e) => { if (!quiet && e.error !== "interrupted" && e.error !== "canceled") onIssue?.("error", lang, e.error); end(false); };
        current = u; try { speechSynthesis.resume(); } catch { /* cũ */ } speechSynthesis.speak(u);
        setTimeout(() => end(true), 8000 + text.length * 120);
      } catch { if (!quiet) onIssue?.("error", lang); res(false); }
    };
    // đang đọc dở thì dừng rồi đợi chút mới đọc câu mới (đọc liền bị nuốt); rảnh thì đọc ngay trong cú chạm
    // đang đọc dở câu thật thì dừng rồi đợi chút (đọc liền bị nuốt); còn lại đọc ngay trong cú chạm
    if (current && (speechSynthesis.speaking || speechSynthesis.pending)) { speechSynthesis.cancel(); setTimeout(go, 90); } else go();
  });
}
