import { createGame } from "./game.js";
import { createHud } from "./ui/hud.js";
import { connectBridge } from "./meta/bridge.js";
import { loadTrends } from "./learn/trends.js";

const root = document.getElementById("app");
try {
  const game = await createGame(root);
  createHud(game, root);
  if (game.save.settings.reduced) document.documentElement.classList.add("reduced");
  game.start();
  setTimeout(() => game.welcome(), 600);
  connectBridge(game);
  // chữ nóng: lấy mẻ mới khi mở app và mỗi lần quay lại app (tối đa 1 lần/30 phút)
  let lastHot = 0; const hot = () => { if (Date.now() - lastHot < 30 * 60e3) return; lastHot = Date.now(); loadTrends(game); };
  setTimeout(hot, 1500); addEventListener("visibilitychange", () => { if (!document.hidden) hot(); });
  document.getElementById("boot")?.classList.add("gone");
  window.PURR = game;      // tiện gỡ lỗi trên console
} catch (e) {
  console.error(e);
  document.getElementById("boot").innerHTML = `<p>Mèo làm gãy bút chì rồi.<br><small>${e.message}</small></p>`;
}

// PWA: cài như app, chạy không cần mạng sau lần mở đầu
if ("serviceWorker" in navigator && location.protocol === "https:" && window.top === window) navigator.serviceWorker.register("sw.js").catch(() => {});
