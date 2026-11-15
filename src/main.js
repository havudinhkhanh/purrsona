import { createGame } from "./game.js";
import { createHud } from "./ui/hud.js";

const root = document.getElementById("app");
try {
  const game = await createGame(root);
  createHud(game, root);
  if (game.save.settings.reduced) document.documentElement.classList.add("reduced");
  game.start();
  setTimeout(() => game.welcome(), 600);
  setTimeout(() => game.firstRun?.(), 1800);
  document.getElementById("boot")?.classList.add("gone");
  window.PURR = game;      // tiện gỡ lỗi trên console
} catch (e) {
  console.error(e);
  document.getElementById("boot").innerHTML = `<p>Không mở được nhà mèo 😿<br><small>${e.message}</small></p>`;
}

// PWA: cài như app, chạy không cần mạng sau lần mở đầu
if ("serviceWorker" in navigator && location.protocol === "https:" && window.top === window) navigator.serviceWorker.register("sw.js").catch(() => {});
