// Vá vài hàm mới cho trình duyệt cũ (iPad/iPhone iOS 12–14, Android Chrome 64+). Chỉ nạp ở bản legacy.
if (!Array.prototype.at) Object.defineProperty(Array.prototype, "at", { value(i) { i = Math.trunc(i) || 0; if (i < 0) i += this.length; return this[i]; }, configurable: true, writable: true });
if (!String.prototype.at) Object.defineProperty(String.prototype, "at", { value(i) { i = Math.trunc(i) || 0; if (i < 0) i += this.length; return this[i]; }, configurable: true, writable: true });
if (!Object.fromEntries) Object.fromEntries = (it) => { const o = {}; for (const [k, v] of it) o[k] = v; return o; };
if (!Promise.allSettled) Promise.allSettled = (ps) => Promise.all([...ps].map((p) => Promise.resolve(p).then((value) => ({ status: "fulfilled", value }), (reason) => ({ status: "rejected", reason }))));
if (!window.structuredClone) window.structuredClone = (v) => JSON.parse(JSON.stringify(v));
if (!String.prototype.replaceAll) Object.defineProperty(String.prototype, "replaceAll", { value(a, b) { return a instanceof RegExp ? this.replace(a, b) : this.split(a).join(b); }, configurable: true, writable: true });
if (window.CSS && !CSS.escape) CSS.escape = (s) => String(s).replace(/[^a-zA-Z0-9_ -￿-]/g, (c) => "\\" + c);
if (!window.queueMicrotask) window.queueMicrotask = (f) => Promise.resolve().then(f);
