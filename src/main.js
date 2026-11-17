import { createGame } from "./game.js";
import { IOS } from "./render/fit.js";
import { createHud } from "./ui/hud.js";
import { connectBridge } from "./meta/bridge.js";
import { loadTrends } from "./learn/trends.js";
import { loadLexicon } from "./learn/lexicon.js";
import { createNotify } from "./meta/notify.js";
import { createAccount } from "./meta/account.js";

// iPhone/iPad: bỏ hiệu ứng kính mờ & hoà trộn lớp (Safari hết bộ nhớ đồ hoạ là tải lại trang). ?lite=0 / ?lite=1 để thử.
{ const q = new URLSearchParams(location.search).get("lite"), lowMem = (navigator.deviceMemory || 8) <= 3; if (q === "1" || (q !== "0" && (IOS || lowMem))) document.documentElement.classList.add("lite"); if (IOS) document.documentElement.classList.add("ios"); }

const root = document.getElementById("app");
(async () => { try {
  const game = await createGame(root);
  createHud(game, root);
  if (game.save.settings.reduced) document.documentElement.classList.add("reduced");
  game.start();
  setTimeout(() => game.welcome(), 600);
  connectBridge(game);
  game.notify = createNotify(game);
  game.account = createAccount(game);
  // chữ nóng: lấy mẻ mới khi mở app và mỗi lần quay lại app (tối đa 1 lần/30 phút)
  let lastHot = 0; const hot = () => { if (Date.now() - lastHot < 30 * 60e3) return; lastHot = Date.now(); loadTrends(game); loadLexicon(game); };
  setTimeout(hot, 1500); addEventListener("visibilitychange", () => { if (!document.hidden) hot(); });
  document.getElementById("boot")?.classList.add("gone");
  window.PURR = game;      // tiện gỡ lỗi trên console
} catch (e) {
  console.error(e);
  document.getElementById("boot").innerHTML = `<p>Mèo làm gãy bút chì rồi.<br><small>${e.message}</small></p>`;
} })();      // không dùng await ở cấp cao nhất: để bản cho máy cũ (legacy) đóng gói được

// PWA: cài như app, chạy không cần mạng sau lần mở đầu
if ("serviceWorker" in navigator && location.protocol === "https:" && window.top === window) navigator.serviceWorker.register("sw.js").catch(() => {});
