// MÈO ĐỌC KÉ trên mọi trang: mèo chì ngồi góc, gạch dưới chữ đã học, rê vào ra nghĩa,
// bôi đen là lưu vô sổ, kháy theo loại trang. Mọi thứ chạy trong máy, không gửi trang đi đâu.
(() => {
  if (window.top !== window || globalThis.__purrInit) return; globalThis.__purrInit = true;
  const L = globalThis.PURR_LINES, POSES = globalThis.PURR_POSES, { buildIndex, scanText } = globalThis.PURR_SCAN;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const fill = (t, v = {}) => t.replace(/\{(\w+)\}/g, (m, k) => (v[k] ?? m));
  const host = location.hostname.replace(/^www\./, "");
  const hasMeta = !!document.querySelector('meta[name="purrsona-app"]');
  // chỉ nối với app ở đúng địa chỉ người dùng đặt trong popup (hoặc máy mình) – trang lạ có gắn thẻ meta cũng không lấy được sổ
  const appOrigin = (u) => { try { return new URL(u).origin; } catch { return ""; } };
  const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
  const st = { on: true, hl: true, known: [], pending: [], skip: [] };

  chrome.storage.local.get(null).then((o) => {
    Object.assign(st, o);
    const isApp = hasMeta && (location.origin === appOrigin(st.appUrl || "https://purrsona.pages.dev/") || LOCAL.test(location.origin));
    if (isApp) return bridge();
    if (hasMeta) return;      // trang khác giả làm app: không ngồi, không gửi gì
    if (!st.on || st.skip.includes(host) || sensitive()) return;
    boot();
  });

  // trang có ô mật khẩu / thanh toán → mèo không ngồi, không quét
  function sensitive() { return !!document.querySelector('input[type=password],input[autocomplete^="cc-"]') || /bank|banking|checkout|payment|thanh-toan/i.test(location.href); }

  // ------------------------------------------------------------------ cầu nối với app (khi đang mở app Purrsona)
  const cut = (x, n) => String(x ?? "").slice(0, n);
  const clean = (L) => L.slice(0, 5000).filter((k) => k && typeof k.w === "string").map((k) => ({ id: cut(k.id, 80), w: cut(k.w, 40), lang: k.lang === "zh" ? "zh" : "en", vi: cut(k.vi, 80), ph: cut(k.ph, 60), m: k.m ? 1 : 0 }));
  function bridge() {
    const send = (type, extra) => window.postMessage({ src: "purrsona-ext", type, ...extra }, location.origin);
    window.addEventListener("message", (e) => {
      if (e.source !== window || e.origin !== location.origin || e.data?.src !== "purrsona-app") return;
      const d = e.data;
      if (d.type === "ready") { send("hello"); if (st.pending.length) send("book", { items: st.pending }); }
      if (d.type === "known" && Array.isArray(d.words)) chrome.storage.local.set({ known: clean(d.words) });
      if (d.type === "ack") {
        const done = new Set(d.keys || []); chrome.storage.local.get("pending").then(({ pending = [] }) => chrome.storage.local.set({ pending: pending.filter((p) => !done.has(p.key)), ...(Array.isArray(d.words) ? { known: clean(d.words) } : {}) }));
      }
    });
    send("hello"); if (st.pending.length) send("book", { items: st.pending });
  }

  // ------------------------------------------------------------------ chỉ mục từ
  let idx, byLow, knownMap;
  function index() {
    const cards = globalThis.PURR_WORDS.map(([id, lang, w, ph, vi, pack, level]) => ({ id, lang, w, ph, vi, pack, level }));
    const have = new Set(cards.map((c) => c.id));
    for (const k of st.known) if (k.vi && !have.has(k.id)) cards.push({ id: String(k.id), lang: k.lang === "zh" ? "zh" : "en", w: String(k.w), ph: String(k.ph || ""), vi: String(k.vi) });
    idx = buildIndex(cards); byLow = new Map(cards.map((c) => [c.w.toLowerCase(), c]));
    knownMap = new Map(st.known.map((k) => [k.id, k.m ? "m" : "l"]));
  }
  const state = (c) => knownMap.get(c.id) || "n";
  const look = (w) => { for (const x of globalThis.PURR_SCAN.forms(w.toLowerCase())) { const c = byLow.get(x); if (c) return c; } return null; };

  // ------------------------------------------------------------------ giao diện (shadow DOM, không đụng CSS trang)
  let root, catEl, bub, tip, selBtn, lastSay = 0, bubT = 0;
  function fonts() {
    if (document.getElementById("purr-font")) return; const u = (f) => chrome.runtime.getURL(`fonts/${f}`), s = document.createElement("style"); s.id = "purr-font";
    s.textContent = `@font-face{font-family:PurrHand;font-display:swap;src:url(${u("ph-vietnamese-400.woff2")}) format("woff2");unicode-range:U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+1EA0-1EF9}@font-face{font-family:PurrHand;font-display:swap;src:url(${u("ph-latin-400.woff2")}) format("woff2");unicode-range:U+0000-00FF,U+2000-206F}`;
    document.head.appendChild(s);
  }
  function ui() {
    fonts();
    const hostEl = document.createElement("purrsona-cat"); hostEl.style.cssText = "all:initial;position:fixed;z-index:2147483646;inset:auto 0 0 auto;";
    root = hostEl.attachShadow({ mode: "closed" }); document.documentElement.appendChild(hostEl);
    root.innerHTML = `<style>
      :host{all:initial}*{box-sizing:border-box;font-family:PurrHand,"Comic Neue","Segoe Print",ui-rounded,system-ui,sans-serif}
      .cat{position:fixed;right:14px;bottom:10px;width:84px;height:84px;cursor:pointer;filter:drop-shadow(0 1px 0 #fff) contrast(1.05);transition:transform .25s cubic-bezier(.3,1.6,.5,1),opacity .3s}
      .cat:hover{transform:translateY(-3px) rotate(-2deg)}.cat svg{width:100%;height:100%;overflow:visible}.cat.away{opacity:0;transform:translateY(40px);pointer-events:none}
      .x{position:fixed;right:8px;bottom:84px;width:20px;height:20px;border-radius:50%;border:1.5px solid #1d1d1f;background:#F3F0E8;color:#1d1d1f;font:700 12px/16px system-ui;text-align:center;cursor:pointer;opacity:0;transition:opacity .2s}
      .wrap:hover .x{opacity:.8}
      .bub{position:fixed;right:22px;bottom:100px;max-width:260px;background:#F3F0E8;color:#1d1d1f;border:1.8px solid #1d1d1f;border-radius:14px 18px 13px 17px/16px 13px 18px 14px;box-shadow:3px 4px 0 rgba(20,20,20,.16);padding:6px 13px 8px;font-size:18px;line-height:1.2;opacity:0;transform:scale(.7);transform-origin:85% 100%;transition:opacity .18s,transform .25s cubic-bezier(.3,1.6,.5,1);pointer-events:none}
      .bub.in{opacity:1;transform:none}.bub::after{content:"";position:absolute;right:30px;bottom:-8px;width:13px;height:13px;background:#F3F0E8;border-right:1.8px solid #1d1d1f;border-bottom:1.8px solid #1d1d1f;transform:rotate(45deg)}
      .tip{position:fixed;left:0;top:0;max-width:300px;background:#F3F0E8;color:#1d1d1f;border:1.6px solid #1d1d1f;border-radius:10px 13px 10px 12px;box-shadow:2px 3px 0 rgba(20,20,20,.15);padding:6px 10px 7px;font-size:17px;line-height:1.2;display:none;pointer-events:auto}
      .tip b{font-size:20px;font-weight:400}.tip small{color:#666;font-family:system-ui;font-size:11px;margin-left:4px}.tip .vi{display:block;font-family:system-ui,sans-serif;font-size:13px;color:#333;margin-top:2px}
      .tip button,.sel{font-family:PurrHand,ui-rounded,system-ui,sans-serif;font-size:15px;font-weight:400;background:none;border:0;border-bottom:1.4px solid #1d1d1f;color:#1d1d1f;padding:0;margin:5px 10px 0 0;cursor:pointer}
      .sel{position:fixed;display:none;background:#F3F0E8;border:1.6px solid #1d1d1f;border-radius:999px;padding:3px 11px 4px;margin:0;box-shadow:2px 3px 0 rgba(20,20,20,.15)}
      @media (prefers-reduced-motion:reduce){.cat,.bub{transition:none}}
    </style>
    <div class="wrap"><div class="cat" title="Purrsona – bấm để nghe kháy, bôi đen chữ để lưu">${POSES.sit}</div><button class="x" title="Ẩn mèo trên trang này">×</button></div>
    <div class="bub"></div><div class="tip"></div><button class="sel">☆ lưu vào sổ</button>`;
    catEl = root.querySelector(".cat"); bub = root.querySelector(".bub"); tip = root.querySelector(".tip"); selBtn = root.querySelector(".sel");
    catEl.addEventListener("click", poke);
    root.querySelector(".x").addEventListener("click", () => { say(pick(L.hide), true); setTimeout(() => { catEl.classList.add("away"); hostEl.remove(); clearHl(); }, 1200); });
    selBtn.addEventListener("mousedown", (e) => e.preventDefault());
    selBtn.addEventListener("click", () => { const t = selBtn.dataset.w; selBtn.style.display = "none"; if (t) save(t, selBtn.dataset.ctx); });
    tip.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.save) save(b.dataset.save, tip.dataset.ctx); if (b.dataset.speak) speak(b.dataset.speak, b.dataset.lang); });
  }
  function pose(p) { if (POSES[p]) catEl.innerHTML = POSES[p]; }
  function say(text, force = false) {
    const now = Date.now(); if (!force && now - lastSay < 40000) return; lastSay = now;
    bub.textContent = text; bub.classList.add("in"); clearTimeout(bubT); bubT = setTimeout(() => bub.classList.remove("in"), 4200);
  }
  function speak(text, lang) { try { const u = new SpeechSynthesisUtterance(text); u.lang = lang === "zh" ? "zh-CN" : "en-GB"; u.rate = 0.9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch { /* không có giọng */ } }

  // ------------------------------------------------------------------ loại trang
  const CATS = [
    ["social", /facebook|instagram|tiktok|(^|\.)x\.com|twitter|threads\.net|reddit|pinterest/],
    ["video", /youtube|netflix|twitch|vimeo|primevideo|disneyplus|bilibili/],
    ["news", /vnexpress|tuoitre|thanhnien|dantri|zingnews|znews|bbc\.|cnn\.|nytimes|reuters|theguardian|bloomberg|ft\.com|wsj\.com|economist|apnews|cafef/],
    ["shopping", /shopee|lazada|tiki\.vn|amazon\.|ebay|aliexpress|taobao|temu/],
    ["work", /docs\.google|notion\.|slack\.|github\.|gitlab|atlassian|jira|figma|office\.com|sharepoint|teams\.microsoft|linkedin/],
    ["finance", /tradingview|binance|vndirect|vietstock|investing\.com|coinmarketcap|ssi\.com|fireant/],
    ["learn", /wikipedia|coursera|edx\.|medium\.com|substack|khanacademy|duolingo|quizlet|udemy/],
    ["dict", /cambridge\.org|oxfordlearners|dictionary|translate\.google|wordreference|mdbg|laban\.vn/],
  ];
  const kind = () => (CATS.find(([, re]) => re.test(host)) || [null])[0];

  // ------------------------------------------------------------------ quét + gạch dưới (CSS Highlight API: không sửa DOM của trang)
  let res = null;
  const SKIPSEL = "script,style,noscript,textarea,input,select,code,pre,svg,canvas,purrsona-cat,[contenteditable],[contenteditable=true]";
  const skipped = (el) => !el || !!el.closest(SKIPSEL);
  function clearHl() { try { for (const k of ["purr-m", "purr-l", "purr-n"]) CSS.highlights?.delete(k); } catch { /* cũ */ } }
  function highlight() {
    if (!st.hl || !CSS.highlights || typeof Highlight === "undefined") return;
    if (!document.getElementById("purr-hl-style")) { const s = document.createElement("style"); s.id = "purr-hl-style"; s.textContent = "::highlight(purr-l){text-decoration:underline 2px dashed #1d1d1fb0;text-underline-offset:3px}::highlight(purr-m){text-decoration:underline 1.5px solid #1d1d1f60;text-underline-offset:3px}::highlight(purr-n){text-decoration:underline 1px dotted #1d1d1f50;text-underline-offset:3px}"; document.head.appendChild(s); }
    const H = { m: new Highlight(), l: new Highlight(), n: new Highlight() }; let n = 0;
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (t) => { const p = t.parentElement; if (!t.nodeValue.trim() || skipped(p) || p.isContentEditable) return NodeFilter.FILTER_REJECT; return NodeFilter.FILTER_ACCEPT; } });
    const re = /[A-Za-z][A-Za-z'-]*[A-Za-z]/g;
    for (let t = tw.nextNode(); t && n < 600; t = tw.nextNode()) {
      const v = t.nodeValue; let m; re.lastIndex = 0;
      while ((m = re.exec(v)) && n < 600) {
        const two = v.slice(m.index).match(/^[A-Za-z]+ [A-Za-z]+/), c2 = two && byLow.get(two[0].toLowerCase()), c = c2 || look(m[0]); if (!c || c.lang !== "en") continue;
        const len = c2 ? two[0].length : m[0].length, r = new Range(); r.setStart(t, m.index); r.setEnd(t, m.index + len); H[state(c)].add(r); n++; if (c2) re.lastIndex = m.index + len;
      }
      if (/[一-鿿]/.test(v)) for (const c of idx.zh) { let p = v.indexOf(c.w); while (p >= 0 && n < 600) { const r = new Range(); r.setStart(t, p); r.setEnd(t, p + c.w.length); H[state(c)].add(r); n++; p = v.indexOf(c.w, p + c.w.length); } }
    }
    CSS.highlights.set("purr-m", H.m); CSS.highlights.set("purr-l", H.l); CSS.highlights.set("purr-n", H.n);
  }
  function scan() {
    const text = (document.body?.innerText || "").slice(0, 60000);
    res = scanText(text, idx, () => true, 0);
    res.vi = (text.match(/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/gi) || []).length;
    res.kn = res.found.filter((f) => state(f.card) !== "n");
    highlight();
  }
  function opener() {
    const k = kind(), kn = res.kn.length;
    if (res.vi > 200 && res.found.length < 3) return say(pick(L.vi), true);
    const lw = res.kn.find((f) => state(f.card) === "l");
    if (lw && Math.random() < 0.45) return say(fill(pick(L.learning), { w: lw.card.w }), true);
    if (k && Math.random() < 0.6 && (kn || !/\{n\}/.test(L[k].join("")))) return say(fill(pick(L[k]), { n: kn }), true);
    if (!res.found.length) return say(pick(L.none), true);
    if (!kn) return say(fill(pick(L.unlearned), { n: res.found.length }), true);
    return say(fill(pick(kn >= 8 ? L.lots : L.some), { n: kn }), true);
  }
  let quizC = null;
  function poke() {
    pose(Math.random() < 0.5 ? "groom" : "sit"); setTimeout(() => pose("sit"), 1600);
    if (quizC) { const c = quizC; quizC = null; return say(fill(pick(L.reveal), { vi: c.vi }), true); }
    const pool = res?.kn.length ? res.kn : res?.found || [];
    if (pool.length && Math.random() < 0.6) { quizC = pick(pool).card; return say(fill(pick(L.quiz), { w: quizC.w }), true); }
    say(pick(L.poke), true);
  }

  // ------------------------------------------------------------------ rê chuột vào chữ → nghĩa
  let hovT = 0;
  function wordAt(x, y) {
    const r = document.caretRangeFromPoint?.(x, y); if (!r || r.startContainer.nodeType !== 3) return null;
    const t = r.startContainer, v = t.nodeValue, o = r.startOffset; if (skipped(t.parentElement)) return null;
    if (/[一-鿿]/.test(v[o] || "")) { for (const c of idx.zh) { for (let s = Math.max(0, o - c.w.length + 1); s <= o; s++) if (v.startsWith(c.w, s)) return { c, t, s, e: s + c.w.length }; } return null; }
    let s = o, e = o; while (s > 0 && /[A-Za-z'-]/.test(v[s - 1])) s--; while (e < v.length && /[A-Za-z'-]/.test(v[e])) e++;
    if (e - s < 2) return null; const two = v.slice(s).match(/^[A-Za-z]+ [A-Za-z]+/), c = (two && byLow.get(two[0].toLowerCase())) || look(v.slice(s, e));
    return c ? { c, t, s, e } : null;
  }
  function sentence(t, s) { const v = t.parentElement?.innerText || t.nodeValue; const i = v.indexOf(t.nodeValue.slice(s, s + 20)); const a = Math.max(v.lastIndexOf(".", i) + 1, 0), b = v.indexOf(".", i); return v.slice(a, b < 0 ? undefined : b + 1).trim().slice(0, 200); }
  function onMove(e) {
    clearTimeout(hovT);
    hovT = setTimeout(() => {
      if (e.target?.tagName === "PURRSONA-CAT") return;
      const h = wordAt(e.clientX, e.clientY); if (!h) { tip.style.display = "none"; return; }
      const c = h.c, saved = st.pending.some((p) => p.w.toLowerCase() === c.w.toLowerCase()) || knownMap.has(c.id);
      tip.innerHTML = `<b>${esc(c.w)}</b><small>${esc(c.ph || "")}</small><span class="vi">${esc(c.vi)}</span><button data-speak="${esc(c.w)}" data-lang="${c.lang === "zh" ? "zh" : "en"}">nghe</button>${saved ? `<button disabled style="opacity:.6">${knownMap.has(c.id) ? "đang học" : "★ đã lưu"}</button>` : `<button data-save="${esc(c.w)}">☆ lưu sổ</button>`}`;
      tip.dataset.ctx = sentence(h.t, h.s);
      const r = new Range(); r.setStart(h.t, h.s); r.setEnd(h.t, h.e); const b = r.getBoundingClientRect();
      tip.style.display = "block"; const w = tip.offsetWidth, hh = tip.offsetHeight;
      tip.style.transform = `translate(${Math.min(Math.max(8, b.left), innerWidth - w - 8)}px, ${b.top - hh - 8 < 8 ? b.bottom + 8 : b.top - hh - 8}px)`;
    }, 160);
  }
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // ------------------------------------------------------------------ bôi đen → lưu
  function onUp(e) {
    if (e?.target?.tagName === "PURRSONA-CAT") return;
    setTimeout(() => {
      const sel = getSelection(), t = sel?.toString().trim() || "";
      if (!t || t.length > 40 || t.split(/\s+/).length > 3 || !/[A-Za-z一-鿿]/.test(t)) { selBtn.style.display = "none"; return; }
      const b = sel.getRangeAt(0).getBoundingClientRect(); selBtn.dataset.w = t;
      const node = sel.anchorNode; selBtn.dataset.ctx = node?.nodeType === 3 ? sentence(node, sel.anchorOffset) : "";
      selBtn.style.display = "block"; selBtn.style.left = `${Math.min(b.left, innerWidth - 150)}px`; selBtn.style.top = `${b.top - 36 < 6 ? b.bottom + 6 : b.top - 36}px`;
    }, 10);
  }
  async function save(w, ctx = "") {
    w = w.trim().slice(0, 40); const c = look(w) || byLow.get(w.toLowerCase());
    const { pending = [] } = await chrome.storage.local.get("pending");
    if (!pending.some((p) => p.w.toLowerCase() === w.toLowerCase())) pending.unshift({ key: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, id: c?.id, w: c?.w || w, lang: c?.lang || (/[一-鿿]/.test(w) ? "zh" : "en"), vi: c?.vi || "", ctx: ctx || "", url: location.href.split("#")[0].slice(0, 300), t: Date.now() });
    if (pending.length > 500) return say(pick(L.full), true);
    st.pending = pending; await chrome.storage.local.set({ pending });
    tip.style.display = "none"; pose("groom"); setTimeout(() => pose("sit"), 1500); say(pick(L.book), true);
  }

  // ------------------------------------------------------------------ chạy
  function boot() {
    if (!document.body || document.body.innerText.length < 80) return;
    index(); ui(); scan();
    setTimeout(opener, 1500);
    addEventListener("mousemove", onMove, { passive: true });
    addEventListener("mouseup", onUp);
    addEventListener("keydown", (e) => { if (e.key === "Escape") { tip.style.display = "none"; selBtn.style.display = "none"; } });
    let sc = 0; addEventListener("scroll", () => { tip.style.display = "none"; selBtn.style.display = "none"; if (++sc % 40 === 0 && Math.random() < 0.3 && res.kn.length) say(fill(pick(L.learning), { w: pick(res.kn).card.w })); }, { passive: true });
    // trang tự tải thêm nội dung (mạng xã hội, SPA) → quét lại thưa thớt
    let lastScan = Date.now(), lastLen = document.body.innerText.length, due = 0;
    const rescan = () => { due = 0; const n = document.body.innerText.length; if (Math.abs(n - lastLen) < 200) return; lastLen = n; lastScan = Date.now(); (window.requestIdleCallback || setTimeout)(scan); };
    new MutationObserver(() => { if (!due) due = setTimeout(rescan, Math.max(3000, 10000 - (Date.now() - lastScan))); }).observe(document.body, { childList: true, subtree: true });
    setInterval(() => { if (document.hidden) return; pose(pick(["sit", "sit", "lie", "loaf"])); }, 45000);
    chrome.runtime.onMessage.addListener((m, _from, reply) => { if (m?.type === "save") { const n = getSelection()?.anchorNode; save(m.w, n?.nodeType === 3 ? sentence(n, getSelection().anchorOffset) : ""); reply({ ok: 1 }); } });
    chrome.storage.onChanged.addListener((ch) => { if (ch.known) { st.known = ch.known.newValue || []; index(); scan(); } if (ch.hl) { st.hl = ch.hl.newValue; st.hl ? highlight() : clearHl(); } if ((ch.on && !ch.on.newValue) || (ch.skip && (ch.skip.newValue || []).includes(host))) { clearHl(); root?.host?.remove(); } });
  }
})();
