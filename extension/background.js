// Nền: menu chuột phải "Lưu vào sổ Purrsona" + đếm số chữ chờ đồng bộ trên biểu tượng.
const DEF = { on: true, hl: true, pending: [], known: [], skip: [], appUrl: "https://purrsona.pages.dev/" };

chrome.runtime.onInstalled.addListener(async () => {
  const cur = await chrome.storage.local.get(null);
  await chrome.storage.local.set({ ...DEF, ...cur });
  chrome.contextMenus.create({ id: "purr-save", title: "Lưu “%s” vào sổ Purrsona", contexts: ["selection"] });
  badge();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "purr-save" || !info.selectionText) return;
  const w = info.selectionText.trim().slice(0, 40); if (!w) return;
  if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "save", w }).then((r) => { if (!r?.ok) saveDirect(w, tab.url); }).catch(() => saveDirect(w, tab?.url));
  else saveDirect(w, "");
});

async function saveDirect(w, url) {
  const { pending = [] } = await chrome.storage.local.get("pending");
  if (!pending.some((p) => p.w.toLowerCase() === w.toLowerCase())) pending.unshift({ key: `${Date.now()}`, w, lang: /[一-鿿]/.test(w) ? "zh" : "en", ctx: "", url: url || "", t: Date.now() });
  await chrome.storage.local.set({ pending: pending.slice(0, 500) });
}

function badge() {
  chrome.storage.local.get("pending").then(({ pending = [] }) => {
    chrome.action.setBadgeText({ text: pending.length ? String(Math.min(pending.length, 99)) : "" });
    chrome.action.setBadgeBackgroundColor({ color: "#1d1d1f" });
  });
}
chrome.storage.onChanged.addListener((ch) => { if (ch.pending) badge(); });
