// Tạo cặp khoá VAPID cho Web Push (chạy 1 lần): node tools/vapid-keys.mjs
// In ra 2 dòng để dán vào `npx wrangler secret put …` của worker/remind. KHÔNG commit khoá bí mật.
import { webcrypto as C } from "node:crypto";
const kp = await C.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const raw = new Uint8Array(await C.subtle.exportKey("raw", kp.publicKey)), jwk = await C.subtle.exportKey("jwk", kp.privateKey);
const b64u = (u) => Buffer.from(u).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
console.log("VAPID_PUBLIC =", b64u(raw));
console.log("VAPID_PRIVATE_JWK =", JSON.stringify(jwk));
