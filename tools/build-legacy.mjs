// ĐÓNG GÓI BẢN CHO MÁY CŨ: gom src/ thành 1 file, hạ cú pháp mới (?., ??, ||=, …) xuống mức iOS 12 / Chrome 64.
// Máy mới vẫn chạy src/ trực tiếp (module) – index.html tự chọn. Chạy lại mỗi khi sửa src/:
//   npx esbuild --version >/dev/null && node tools/build-legacy.mjs
import { build } from "esbuild";
await build({
  entryPoints: ["src/main.js"], bundle: true, format: "iife", minify: true, sourcemap: false, legalComments: "none",
  target: ["safari12", "chrome64", "firefox68"], outfile: "legacy/app.js",
  inject: ["tools/legacy-polyfills.js"], logLevel: "warning",
  // import.meta.url (chỉ registry.js dùng để tìm assets/cats) → tính theo địa chỉ trang
  define: { "import.meta.url": "__PURR_REG_URL" },
  banner: { js: "/* Purrsona – bản cho máy cũ, đóng gói tự động từ src/ (đừng sửa tay) */\nvar __PURR_REG_URL = new URL(\"src/render/registry.js\", document.baseURI).href;" },
});
console.log("legacy/app.js xong");
