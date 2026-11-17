// MÈO ĐỌC KÉ: quét một đoạn văn (bài báo, trang web, đoạn dán vào) để tìm
// chữ đã có trong các gói từ và vài chữ lạ đáng lưu. Không cần mạng.
// Dùng chung cho app (đoạn dán / chia sẻ) và tiện ích Chrome (tools/build-extension.mjs chép sang).

const STOP = new Set("about above after again against because before being below between during further having itself myself others ourselves should themselves there these those through under until which while would could their people really something nothing everything anything another however without within around become becomes became always little things thing still where whether every other first second third years today yesterday tomorrow minutes minute hours number using please thanks thank posted comments comment share shares follow followers likes reply replies video videos photo photos online website cookies cookie privacy policy terms account login subscribe newsletter update updated updates continue reading related articles article source sources image images click search menu home page pages better bigger smaller faster easier harder longer higher larger greater clearer honestly actually finally usually really simply serious seriously probably certainly already almost enough friend friends family morning tonight weekend school mother father children people person business company money market really pretty little better rather people moment single simple public really little everyone everybody someone somebody meeting morning evening another between without against nothing anything everything themselves yourself himself herself country history company general several million billion hundred thousand problem program service example certain however although because whatever whenever whether children students teacher student kitchen holiday weather picture computer internet message phone".split(" "));

/** các dạng gốc có thể của 1 chữ tiếng Anh: arrives/arrived/arriving → arrive, studies → study, quickly → quick */
export function forms(w) {
  const out = [w], add = (x) => { if (x.length >= 3 && !out.includes(x)) out.push(x); };
  if (/ies$/.test(w)) add(w.slice(0, -3) + "y"); if (/ied$/.test(w)) add(w.slice(0, -3) + "y");
  for (const suf of ["ing", "ed", "es", "s", "ly", "d"]) if (w.endsWith(suf)) { const b = w.slice(0, -suf.length); add(b); add(b + "e"); if (/(.)\1$/.test(b)) add(b.slice(0, -1)); }
  return out;
}

/** mục lục từ: tiếng Anh tra theo chữ thường (kể cả cụm 2 chữ), tiếng Trung tra chuỗi con dài trước */
export function buildIndex(cards) {
  const en = new Map(), zh = [];
  for (const c of cards) { if (!c || !c.w) continue; if (c.lang === "zh") zh.push(c); else en.set(c.w.toLowerCase(), c); }
  zh.sort((a, b) => b.w.length - a.w.length);
  return { en, zh };
}

/** quét văn bản → { lang, tokens, found: [{card, n}], strange: [{w, n}] } */
export function scanText(text, idx, known = () => false, limit = 12) {
  text = String(text || "").slice(0, 60000);
  const cjk = (text.match(/[一-鿿]/g) || []).length, words = text.match(/[A-Za-z][A-Za-z'’-]*[A-Za-z]|[A-Za-z]/g) || [];
  const lang = cjk > words.length * 1.5 ? "zh" : cjk > 40 ? "mix" : "en";
  const found = new Map(), strange = new Map();
  // tiếng Anh: từ đơn + cụm 2 chữ ("cash flow", "due diligence")
  const lower = words.map((w) => w.toLowerCase().replace(/[’]/g, "'"));
  for (let i = 0; i < lower.length; i++) {
    const two = i + 1 < lower.length ? lower[i] + " " + lower[i + 1] : null;
    let c = two && idx.en.get(two); if (!c) for (const f of forms(lower[i])) if ((c = idx.en.get(f))) break;
    if (c) { const f = found.get(c.id) || { card: c, n: 0 }; f.n++; found.set(c.id, f); if (two && idx.en.get(two)) i++; continue; }
    const w = lower[i], raw = words[i];
    if (w.length >= 7 && !STOP.has(w) && !/(ly|est)$/.test(w) && !(/ing$/.test(w) && w.length < 10) && !(/er$/.test(w) && w.length < 9) && !known(w) && !(raw[0] === raw[0].toUpperCase() && raw.slice(1) !== raw.slice(1).toUpperCase() && i > 0)) strange.set(w, (strange.get(w) || 0) + 1);
  }
  // tiếng Trung: tìm từ dài trước, không đếm trùng chỗ
  if (cjk) {
    const taken = new Uint8Array(text.length);
    for (const c of idx.zh) {
      let p = text.indexOf(c.w);
      while (p >= 0) { let free = true; for (let k = p; k < p + c.w.length; k++) if (taken[k]) { free = false; break; } if (free) { for (let k = p; k < p + c.w.length; k++) taken[k] = 1; const f = found.get(c.id) || { card: c, n: 0 }; f.n++; found.set(c.id, f); } p = text.indexOf(c.w, p + c.w.length); }
    }
  }
  return {
    lang, tokens: words.length + cjk,
    found: [...found.values()].sort((a, b) => b.n - a.n),
    strange: [...strange].map(([w, n]) => ({ w, n })).sort((a, b) => b.n - a.n || b.w.length - a.w.length).slice(0, limit),
  };
}
