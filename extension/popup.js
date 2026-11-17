const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
$("cat").innerHTML = globalThis.PURR_POSES?.sit || "";
let site = "";
chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => { try { site = new URL(t.url).hostname.replace(/^www\./, ""); $("site").textContent = site; } catch { $("siteRow").hidden = true; } load(); });
async function load() {
  const o = await chrome.storage.local.get(null), P = o.pending || [];
  $("on").checked = o.on !== false; $("hl").checked = o.hl !== false; $("skip").checked = (o.skip || []).includes(site);
  $("cnt").textContent = P.length; $("kn").textContent = (o.known || []).length;
  $("list").innerHTML = P.slice(0, 30).map((p) => `<li><b>${esc(p.w)}</b><i>${esc(p.vi || (p.url ? new URL(p.url).hostname : ""))}</i></li>`).join("");
  $("url").value = o.appUrl || "https://purrsona.pages.dev/"; $("open").href = $("url").value;
}
$("on").onchange = (e) => chrome.storage.local.set({ on: e.target.checked });
$("hl").onchange = (e) => chrome.storage.local.set({ hl: e.target.checked });
$("skip").onchange = async (e) => { const { skip = [] } = await chrome.storage.local.get("skip"); const s = new Set(skip); e.target.checked ? s.add(site) : s.delete(site); chrome.storage.local.set({ skip: [...s] }); };
$("url").onchange = (e) => { try { const u = new URL(e.target.value); if (!/^https?:$/.test(u.protocol)) throw 0; chrome.storage.local.set({ appUrl: u.href }); $("open").href = u.href; } catch { e.target.value = $("open").href; } };
$("exp").onclick = async () => {
  const { pending = [] } = await chrome.storage.local.get("pending"), q = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const csv = ["word,lang,meaning,context,url", ...pending.map((p) => [p.w, p.lang, p.vi, p.ctx, p.url].map(q).join(","))].join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" })); a.download = "purrsona-so-cua-toi.csv"; a.click();
};
