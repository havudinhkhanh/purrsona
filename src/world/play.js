// SÂN CHƠI & ĐỒ VẬT trong vườn: xích đu, cầu tuột, giàn bầu (lớn dần theo ngày bạn học), luống hồng để mèo đào,
// chậu cây để mèo xô đổ. Bày bừa thì để nguyên cả ngày; qua đêm "Sen" dọn lại, sáng ra mèo làm bộ ngẫm nghĩ.
// Mèo làm gì → hiện chữ của việc đó cạnh mèo (gói "Chữ trong vườn"), chạm vào là nghe, ☆ là lưu sổ.
import { clamp, rand, pick, dayKey, esc } from "../core/util.js";
import { icon } from "../ui/icons.js";

export const PROPS = {
  swing: { u: 32, v: 13, top: 13, seat: 3.6, len: 9.4 },
  slide: { v: 35.5, ladderU: 62.4, topU: 60.4, top: 10, endU: 49 },      // máng trượt chạy ngang (dọc trục u) cho dễ thấy
  trellis: { u0: 2, u1: 11, v0: 33, v1: 41, h: 12 },
  roses: { u: 42, v: 57, spots: [[38.6, 56.2], [41, 58.2], [43.6, 56.4], [45.6, 58.6], [40.4, 59.6]] },
  pots: [[66.6, 32.2], [88, 32.2], [95, 32.2]],
};
// việc của mèo → chữ hiện ra (id thẻ trong gói en-scene / zh-scene, hoặc gói khác)
export const SCENE = {
  dig: { en: ["dig", "soil"], zh: ["挖", "泥土"], ja: ["掘る", "土"] }, snap: { en: ["rose", "snap"], zh: ["玫瑰", "弄断"], ja: ["バラ", "折る"] },
  swing: { en: ["swing"], zh: ["秋千", "荡秋千"], ja: ["ブランコ"] }, slide: { en: ["slide", "ladder"], zh: ["滑梯", "梯子"], ja: ["滑り台", "はしご"] },
  trellis: { en: ["climb", "trellis", "gourd", "vine"], zh: ["爬", "瓜架", "葫芦", "藤"], ja: ["登る", "ひょうたん", "つる"] }, pot: { en: ["knock over", "flower pot"], zh: ["打翻", "花盆"], ja: ["倒す", "植木鉢"] },
  innocent: { en: ["innocent", "mess"], zh: ["无辜", "乱七八糟"], ja: ["無実", "散らかす"] }, tidy: { en: ["tidy up"], zh: ["收拾"], ja: ["片付ける"] },
  scratchtree: { en: ["scratch", "bark", "claw"], zh: ["抓", "树皮", "爪子"], ja: ["引っかく", "爪"] }, rain: { en: ["shelter", "soaked"], zh: ["躲雨", "淋湿"], ja: ["雨宿り", "びしょ濡れ"] },
  puddle: { en: ["puddle"], zh: ["水坑"], ja: ["水たまり"] }, shade: { en: ["shade", "scorching"], zh: ["树荫"], ja: ["日陰"] }, sunbathe: { en: ["sunbathe"], zh: ["晒太阳"], ja: ["日向ぼっこ"] },
  wind: { en: ["gust", "pounce"], zh: ["刮风", "扑"], ja: ["突風", "飛びかかる"] }, pounce: { en: ["pounce", "flutter"], zh: ["扑", "蝴蝶"], ja: ["飛びかかる", "蝶々"] }, zoomies: { en: ["zoomies"], zh: [], ja: ["猫の運動会"] },
  knead: { en: ["make biscuits"], zh: ["踩奶"], ja: ["ふみふみ"] }, nap: { en: ["nap", "loaf"], zh: ["打盹"], ja: ["昼寝", "香箱座り"] }, stretch: { en: ["stretch"], zh: ["伸懒腰"], ja: ["伸び"] },
  groom: { en: ["groom"], zh: ["舔毛"], ja: ["毛づくろい"] }, purr: { en: ["purr"], zh: ["打呼噜"], ja: ["ゴロゴロ"] }, pond: { en: ["pond"], zh: ["池塘"], ja: ["池", "鯉"] },
};

export function createPlay(game) {
  const s = game.save, Y = game.yard, B = game.body, learn = game.learn;
  const today = dayKey();
  s.play ||= { d: today, holes: [], roses: [1, 1, 1, 1, 1], pots: [0, 0, 0], vine: 1, vineDay: "" };
  const P0 = s.play;
  // ---- qua ngày mới: dọn sạch (Sen dọn ban đêm), hồng mọc lại
  let tidied = false;
  if (P0.d !== today) { tidied = P0.holes.length > 0 || P0.roses.some((r) => !r) || P0.pots.some((p) => p); Object.assign(P0, { d: today, holes: [], roses: [1, 1, 1, 1, 1], pots: [0, 0, 0] }); }

  // ------------------------------------------------------------------ vẽ đồ vật (yard.draw gọi mỗi lần vẽ lại)
  const INK = "#262626", INK2 = "#5c5c5c", INK3 = "#9a9a9a", WHITE = "#FBFAF6";
  Y.extraDraw = ({ D, P, sprite, k, ring }) => {
    const line = (a, b, w = 1.6) => D.line(a, b, { strokeWidth: w });
    // xích đu: 2 khung chữ A + thanh ngang (ghế vẽ riêng để đu được)
    { const { u, v, top } = PROPS.swing; let g = "";
      for (const uu of [u - 5, u + 5]) g += line(P(uu, v - 2.6, 0), P(uu, v, top), 2) + line(P(uu, v + 2.6, 0), P(uu, v, top), 2);
      g += line(P(u - 5.4, v, top), P(u + 5.4, v, top), 2.4);
      sprite("swing", P(u, v + 2.6)[1], g); }
    // cầu tuột: thang + sàn + máng trượt cong (chạy từ phải sang trái)
    { const { v, ladderU, topU, top, endU } = PROPS.slide; let g = "";
      g += line(P(ladderU, v - 1.6, 0), P(ladderU, v - 1.6, top), 1.8) + line(P(ladderU, v + 1.6, 0), P(ladderU, v + 1.6, top), 1.8);
      for (let h = 2; h < top; h += 2) g += line(P(ladderU, v - 1.6, h), P(ladderU, v + 1.6, h), 1.3);
      g += D.poly([P(ladderU, v - 2, top), P(topU, v - 2, top), P(topU, v + 2, top), P(ladderU, v + 2, top)], { fill: WHITE, fillStyle: "solid", strokeWidth: 1.6 });
      for (const dv of [-2, 2]) g += line(P(ladderU, v + dv, top), P(ladderU, v + dv, top + 2.4), 1.4) + line(P(topU, v + dv, top), P(topU, v + dv, top + 2.4), 1.4) + line(P(ladderU, v + dv, top + 2.4), P(topU, v + dv, top + 2.4), 1.4);
      const curve = (dv) => Array.from({ length: 10 }, (_, i) => { const t = i / 9, uu = topU + (endU - topU) * t, hh = top * (1 - t) ** 1.7 + 0.4; return P(uu, v + dv, hh); });
      const L = curve(-2), R = curve(2);
      g += D.poly([...L, ...R.reverse()], { fill: INK3, hachureGap: 4, hachureAngle: 20, strokeWidth: 1.7 });
      for (const dv of [-2, 2]) g += D.curve(curve(dv).map(([x, y]) => [x, y - k * 0.6]), { strokeWidth: 1.2 }) + line(P(topU - 3.5, v + dv, 0), P(topU - 3.5, v + dv, top * 0.62), 1.4);
      sprite("slide", P(endU, v + 2)[1], g); }
    // giàn bầu: 4 cột + khung trên; dây leo & trái bầu theo số ngày bạn học
    { const { u0, u1, v0, v1, h } = PROPS.trellis, st = clamp(P0.vine, 0, 6); let g = "";
      for (const [uu, vv] of [[u0, v0], [u1, v0], [u0, v1], [u1, v1]]) g += line(P(uu, vv, 0), P(uu, vv, h), 1.9);
      g += D.poly([P(u0, v0, h), P(u1, v0, h), P(u1, v1, h), P(u0, v1, h)], { strokeWidth: 1.6 });
      for (let uu = u0 + 3; uu < u1; uu += 3) g += line(P(uu, v0, h), P(uu, v1, h), 1);
      const up = Math.min(1, st / 3);
      for (const [uu, vv] of [[u0, v1], [u1, v1], [u1, v0]].slice(0, Math.max(1, Math.ceil(st / 2)))) { const pts = Array.from({ length: 8 }, (_, i) => { const t = (i / 7) * up; return P(uu + Math.sin(i * 1.7) * 0.6, vv, t * h); }); g += D.curve(pts, { strokeWidth: 1.4, stroke: INK2 }); }
      const leaves = Math.max(0, (st - 2) * 4);
      for (let i = 0; i < leaves; i++) { const uu = u0 + 1 + ((i * 3.7) % (u1 - u0 - 2)), vv = v0 + 1 + ((i * 2.3) % (v1 - v0 - 2)), [x, y] = P(uu, vv, h); g += D.ell(x, y, 7 * k * 0.1 + 6, 4 * k * 0.1 + 3.5, { fill: INK2, hachureGap: 3, strokeWidth: 1 }); }
      const gourds = Math.max(0, st - 2);
      for (let i = 0; i < gourds; i++) { const uu = u0 + 2 + i * 2.2, vv = v0 + 2 + (i % 2) * 3.5, [x, y] = P(uu, vv, h - 3.2), r = k * 0.42; g += line(P(uu, vv, h), [x, y - r * 1.6], 1) + D.ell(x, y - r * 0.9, r * 1.1, r * 1.2, { fill: WHITE, fillStyle: "solid", strokeWidth: 1.4 }) + D.ell(x, y + r * 0.4, r * 1.7, r * 1.8, { fill: WHITE, fillStyle: "solid", strokeWidth: 1.4 }); }
      sprite("trellis", P(u1, v1)[1], g); }
    // luống hồng: đất xới, hồng (còn / gãy), lỗ mèo đào
    { const R = PROPS.roses; sprite("rosebed", P(R.u, R.v - 3)[1], D.poly(ring(R.u, R.v + 0.4, 6.4, 2.9, 16), { fill: INK3, fillStyle: "dots", hachureGap: 5, strokeWidth: 1.4 }));
      R.spots.forEach(([uu, vv], i) => { const [x, y] = P(uu, vv), hh = 4.4 * k * 0.9, r = k * 0.5; let g;
        if (P0.roses[i]) g = D.curve([[x, y], [x + r * 0.4, y - hh * 0.5], [x, y - hh]], { strokeWidth: 1.4 }) + D.circle(x, y - hh, r * 2.2, { fill: WHITE, fillStyle: "solid", strokeWidth: 1.4 }) + D.curve([[x - r * 0.5, y - hh], [x, y - hh - r * 0.6], [x + r * 0.5, y - hh], [x, y - hh + r * 0.4]], { strokeWidth: 1 }) + D.ell(x + r * 1.2, y - hh * 0.5, r * 1.6, r * 0.8, { fill: INK2, hachureGap: 3, strokeWidth: 1 });
        else g = D.curve([[x, y], [x + r * 0.3, y - hh * 0.45], [x + r * 2.4, y - hh * 0.35]], { strokeWidth: 1.4 }) + D.circle(x + r * 3.4, y - r * 0.3, r * 2, { fill: WHITE, fillStyle: "solid", strokeWidth: 1.3 }) + D.line([x + r * 2.8, y - r * 1.4], [x + r * 4, y + r * 0.6], { strokeWidth: 1 });
        sprite("rose" + i, y, g); });
      P0.holes.forEach(([uu, vv], i) => { const [x, y] = P(uu, vv); sprite("hole" + i, y - 1, D.ell(x, y, k * 2.2, k * 0.9, { fill: INK, fillStyle: "solid", strokeWidth: 1.2 }) + D.ell(x + k * 1.8, y - k * 0.2, k * 1.6, k * 0.7, { fill: INK3, fillStyle: "dots", hachureGap: 3, strokeWidth: 1 })); }); }
    // chậu cây (đứng / bị xô đổ)
    PROPS.pots.forEach(([uu, vv], i) => { const [x, y] = P(uu, vv), w = k * 1.1, hh = k * 2.2; let g;
      if (!P0.pots[i]) g = D.poly([[x - w, y - hh], [x + w, y - hh], [x + w * 0.7, y], [x - w * 0.7, y]], { fill: WHITE, fillStyle: "solid", strokeWidth: 1.5 }) + D.line([x - w * 1.1, y - hh], [x + w * 1.1, y - hh], { strokeWidth: 1.8 }) + [-0.8, 0, 0.8].map((d) => D.curve([[x + d * w * 0.4, y - hh], [x + d * w * 1.2, y - hh * 1.6], [x + d * w * 1.6, y - hh * 2.1]], { strokeWidth: 1.4 }) + D.ell(x + d * w * 1.6, y - hh * 2.1, w * 0.9, w * 0.5, { fill: INK2, hachureGap: 2.5, strokeWidth: 1 })).join("");
      else g = D.ell(x + w * 1.6, y + w * 0.1, w * 3.2, w * 1.1, { fill: INK3, fillStyle: "dots", hachureGap: 3, strokeWidth: 1 }) + D.poly([[x - w * 1.4, y - w * 0.9], [x + w * 0.6, y - w * 1.2], [x + w * 0.6, y + w * 0.3], [x - w * 1.2, y + w * 0.2]], { fill: WHITE, fillStyle: "solid", strokeWidth: 1.5 }) + [0, 1].map((d) => D.curve([[x + w, y - w * 0.4], [x + w * 2.4, y - w * (0.9 + d * 0.6)], [x + w * 3.6, y - w * (0.6 + d)]], { strokeWidth: 1.3 })).join("");
      sprite("pot" + i, y, g); });
  };

  // ------------------------------------------------------------------ ghế xích đu (đu được)
  const seat = document.createElement("div"); seat.className = "seat"; Y.actors.appendChild(seat);
  const sw = { a: 0, va: 0, ride: false };
  function drawSeat(dt) {
    const { u, v, top, len } = PROPS.swing, wind = (game.weather?.st.wind || 0) * 0.15;
    sw.va += (-sw.a * 2.6 - sw.va * (sw.ride ? 0.05 : 0.5) + Math.sin(performance.now() / 900) * wind) * dt; sw.a += sw.va * dt;
    const energy = sw.a * sw.a + sw.va * sw.va / 2.6;      // mèo nhún cho đu tiếp, nhưng không quá biên độ ~0,45 rad
    if (sw.ride && energy < 0.2 && Math.abs(sw.a) < 0.1) sw.va += Math.sign(sw.va || 1) * 1.6 * dt;
    sw.a = clamp(sw.a, -0.55, 0.55);
    const sv = v + Math.sin(sw.a) * len, sh = top - Math.cos(sw.a) * len;
    const [a1, a2] = [Y.P(u - 2.2, v, top), Y.P(u + 2.2, v, top)], [b1, b2] = [Y.P(u - 2.2, sv, sh), Y.P(u + 2.2, sv, sh)], [c1, c2] = [Y.P(u - 2.2, sv + 1.2, sh), Y.P(u + 2.2, sv + 1.2, sh)];
    seat.style.zIndex = Math.round(Y.P(u, sv)[1]) - 2;      // ghế nằm sau thân mèo đang ngồi
    seat.innerHTML = `<svg class="spr" viewBox="0 0 ${Y.S.vw} ${Y.S.vh}"><g stroke="#262626" stroke-linecap="round" fill="none"><path d="M${a1}L${b1}M${a2}L${b2}" stroke-width="1.4"/><path d="M${b1}L${b2}L${c2}L${c1}Z" fill="#FBFAF6" stroke-width="1.8"/></g></svg>`;
    return { sv, sh };
  }

  // ------------------------------------------------------------------ chữ hiện cạnh mèo
  let talk = document.querySelector(".talkfx"); const tag = document.createElement("div"); tag.className = "wtag"; tag.hidden = true;
  const mountTag = () => { talk = talk || document.querySelector(".talkfx"); talk?.appendChild(tag); };
  let tagUntil = 0, lastTag = 0, tagCards = [];
  function sceneWord(key, force = false) {
    if (s.settings.sceneWords === false || !s.onboarded) return;
    const now = Date.now(); if (!force && now - lastTag < 12000) return;
    const ids = SCENE[key]?.[learn.lang] || []; if (!ids.length) return;
    const cards = [...ids].sort(() => Math.random() - 0.5).slice(0, 2).map((w) => learn.card(`${learn.lang}:${w}`)).filter(Boolean); if (!cards.length) return;
    lastTag = now; tagCards = cards; mountTag();
    tag.innerHTML = cards.map((c, i) => `<button class="wt${i ? " sm" : ""}" data-tw="${esc(c.id)}"><b class="${c.lang}">${esc(c.w)}</b><small>${esc(c.ph || "")}</small><i>${esc(c.vi)}</i></button>`).join("") + `<button class="wstar${learn.booked(cards[0].id) ? " on" : ""}" data-tstar="${esc(cards[0].id)}" aria-label="Lưu vào sổ">${icon("star")}</button>`;
    tag.hidden = false; tag.classList.remove("in"); void tag.offsetWidth; tag.classList.add("in"); tagUntil = now + 7000;
    learn.L.sceneSeen ||= {}; for (const c of cards) learn.L.sceneSeen[c.id] = (learn.L.sceneSeen[c.id] || 0) + 1;
  }
  tag.addEventListener("pointerdown", (e) => e.stopPropagation());
  tag.addEventListener("click", (e) => {
    const st = e.target.closest("[data-tstar]"); if (st) { const id = st.dataset.tstar; if (learn.booked(id)) learn.unbook(id); else learn.bookmark(learn.card(id), s.plan); st.classList.toggle("on", learn.booked(id)); game.persist(); tagUntil = Date.now() + 5000; return; }
    const w = e.target.closest("[data-tw]"); if (w) { game.speakCard(learn.card(w.dataset.tw), false, true); tagUntil = Date.now() + 6000; }
  });
  function placeTag() {
    if (tag.hidden) return; if (Date.now() > tagUntil) { tag.hidden = true; return; }
    // đặt cạnh mèo (trái hoặc phải); hẹp quá thì xuống dưới chân, không bao giờ che mèo
    const sc = Math.min(1, Math.max(0.72, Y.S.k / 4)), w = tag.offsetWidth * sc, h = tag.offsetHeight * sc, vw = Y.S.vw, vh = Y.S.vh, cH = Y.S.catH, cw = cH * 0.55 + 4, top = B.y - B.h;
    let x, y = top - cH * 0.75 - h / 2;
    if (B.x - cw - w >= 8) x = B.x - cw - w; else if (B.x + cw + w <= vw - 8) x = B.x + cw;
    else { x = clamp(B.x - w / 2, 8, vw - w - 8); y = top + 12; if (y + h > vh - 90) y = top - cH * 1.15 - h; }
    tag.style.transform = `translate(${x.toFixed(0)}px, ${clamp(y, 60, vh - h - 90).toFixed(0)}px) scale(${sc.toFixed(2)})`; tag.style.transformOrigin = "0 0";
  }

  // ------------------------------------------------------------------ mèo chơi đồ vật (brain gọi acts(h))
  function acts(h) {
    const { goUV, down, say, cool, used, T, N } = h, wx = () => game.weather || {};
    const dry = () => !wx().raining;
    return [
      { id: "swing", score: () => (dry() && cool("swing", 5) ? 0.35 + T().playful * 0.4 + T().lazy * 0.2 : 0),
        async run() { used("swing"); const { u, v, top, len } = PROPS.swing; await goUV(u, v + 4); B.faceTo(1); await B.act("crouch", 500);
          const [x, y] = Y.P(u, v + len * Math.sin(sw.a), top - len * Math.cos(sw.a) + 1.2); await B.jumpTo(x, y + 1, (Y.S.k * 0.9) * 4.8, null, { apex: 30 });
          sw.ride = true; sw.va += 0.6; sceneWord("swing", true); if (Math.random() < 0.5) say("play_swing");
          B.ride = () => { const sv = v + Math.sin(sw.a) * len, sh = top - Math.cos(sw.a) * len + 1.2, [xx, yy] = Y.P(u, sv); return { x: xx, y: yy, h: sh * Y.S.k * 0.9 }; };
          try { await B.act(Math.random() < 0.5 ? "loaf" : "idle_tail", rand(9, 16) * 1000); } finally { B.ride = null; sw.ride = false; }
          await down(); } },
      { id: "slide", score: () => (dry() && cool("slide", 6) ? 0.3 + T().playful * 0.5 + (game.age.stage === "kitten" ? 0.4 : 0) : 0),
        async run() { used("slide"); const S = PROPS.slide; await goUV(S.ladderU + 2.6, S.v); B.faceTo(-1);
          const [tx, ty] = Y.P(S.topU + 1, S.v); await B.jumpTo(tx, ty, S.top * Y.S.k * 0.9, Math.round(Y.P(S.endU, S.v + 2)[1]) + 3, { apex: 26 }); B.faceTo(-1); await B.act("look_up", 900);
          if (Math.random() < 0.4) say("play_slide"); sceneWord("slide", true);
          const t0 = performance.now(), dur = 1400; B.play("crouch");
          await new Promise((res) => { B.ride = () => { const t = Math.min(1, (performance.now() - t0) / dur), e = t * t, uu = S.topU + (S.endU - S.topU) * e, hh = S.top * (1 - e) ** 1.7 + 0.5, [xx, yy] = Y.P(uu, S.v); B.face = -1; if (t >= 1) { B.ride = null; res(); } return { x: xx, y: yy, h: hh * Y.S.k * 0.9 }; }; });
          B.h = 0; B.z = null; await B.act("roll_play", 2200); if (Math.random() < 0.4) say("play_slide"); } },
      { id: "trellis", score: () => (cool("trellis", 7) ? 0.25 + T().brave * 0.4 + T().curious * 0.2 : 0),
        async run() { used("trellis"); const R = PROPS.trellis; await goUV((R.u0 + R.u1) / 2, R.v1 + 2.5);
          const [x, y] = Y.P((R.u0 + R.u1) / 2, (R.v0 + R.v1) / 2); await B.jumpTo(x, y, R.h * Y.S.k * 0.9, Math.round(Y.P(R.u1, R.v1)[1]) + 2, { apex: 40 }); B.perch = "trellis";
          sceneWord("trellis", true); if (Math.random() < 0.5) say("play_trellis"); await B.act("loaf", rand(8, 16) * 1000); await B.act("look_up", 1500); await down(); } },
      { id: "dig", score: () => (cool("dig", 4) && P0.holes.length < 6 ? 0.3 + T().curious * 0.3 + T().playful * 0.3 + (wx().kind === "cloudy" ? 0.2 : 0) : 0),
        async run() { used("dig"); const R = PROPS.roses, i = Math.floor(Math.random() * R.spots.length), [ru, rv] = R.spots[i], hu = ru + rand(-1.5, 1.5), hv = rv + rand(-0.6, 0.8);
          await goUV(hu - 2.5, hv + 1.6); B.faceTo(1); await B.act("crouch", 700); sceneWord("dig", true); if (Math.random() < 0.5) say("play_dig");
          dirt(hu, hv); await B.act("scratch", 1600); dirt(hu, hv); await B.act("scratch", 1200);
          P0.holes.push([+hu.toFixed(1), +hv.toFixed(1)]);
          if (P0.roses[i] && Math.random() < 0.45) { P0.roses[i] = 0; game.buzz?.(10); Y.redraw(); await B.act("look_up", 900); say("play_snap"); sceneWord("snap", true); await B.act("idle_tail", 2200); sceneWord("innocent", true); }
          else Y.redraw();
          game.persist(); await B.act("groom", 2000); } },
      { id: "knockpot", score: () => (cool("pot", 6) && P0.pots.some((p) => !p) && !wx().raining ? 0.22 + T().sassy * 0.5 + (game.today.mood.id === "grumpy" ? 0.4 : 0) : 0),
        async run() { used("pot"); const L = P0.pots.map((p, i) => (p ? -1 : i)).filter((i) => i >= 0), i = pick(L), [pu, pv] = PROPS.pots[i];
          await goUV(pu - 2.4, pv + 1.2); B.faceTo(1); await B.act("look_up", 1200);       // nhìn bạn trước khi xô – kiểu mèo
          await B.act("scratch", 500); P0.pots[i] = 1; Y.redraw(); game.persist(); game.buzz?.([12, 30, 12]);
          sceneWord("pot", true); await B.act("idle_tail", 900); say("play_pot"); await B.act("look_up", 1800); } },
    ];
  }
  // đất văng lên lúc đào
  function dirt(u, v) {
    const [x, y] = Y.P(u, v); for (let i = 0; i < 9; i++) { const d = document.createElement("i"); d.className = "dirt"; d.style.left = x + "px"; d.style.top = y + "px"; d.style.setProperty("--dx", `${rand(-40, 40)}px`); d.style.setProperty("--dy", `${rand(-50, -18)}px`); Y.topfx.appendChild(d); setTimeout(() => d.remove(), 700); }
  }

  // ------------------------------------------------------------------ chạm đồ vật
  function tap(p) {
    const near = (u, v, r = 30) => { const [x, y] = Y.P(u, v); return Math.hypot(x - p.x, y - p.y) < r; };
    const go = (id, word) => { const a = game.brain?.ACTS.find((x) => x.id === id); if (a) game.brain.interrupt(() => a.run(), id); if (word) sceneWord(word, true); return true; };
    for (const [i, [u, v]] of PROPS.pots.entries()) if (near(u, v, 28)) { if (P0.pots[i]) { P0.pots[i] = 0; Y.redraw(); game.persist(); game.jab?.("tidy_now", {}, true); sceneWord("tidy", true); return true; } sceneWord("pot", true); return true; }
    for (const [i, [u, v]] of P0.holes.entries()) if (near(u, v, 20)) { P0.holes.splice(i, 1); Y.redraw(); game.persist(); game.jab?.("tidy_now", {}, true); sceneWord("tidy", true); return true; }
    for (const [i, [u, v]] of PROPS.roses.spots.entries()) if (near(u, v, 22)) { if (!P0.roses[i]) { game.jab?.("play_rosetap", {}, true); sceneWord("snap", true); } else sceneWord("dig", true); return true; }
    if (near(PROPS.swing.u, PROPS.swing.v, 46)) return go("swing", "swing");
    if (near((PROPS.slide.topU + PROPS.slide.endU) / 2, PROPS.slide.v, 50)) return go("slide", "slide");
    const T = PROPS.trellis; if (near((T.u0 + T.u1) / 2, (T.v0 + T.v1) / 2, 50)) return go("trellis", "trellis");
    return false;
  }

  // ------------------------------------------------------------------ giàn bầu lớn theo ngày bạn học
  game.on("learn", (e) => { if (e.type !== "answer" || P0.vineDay === dayKey()) return; P0.vineDay = dayKey(); if (P0.vine < 6) { P0.vine++; Y.redraw(); setTimeout(() => game.jab?.("vine_grow", {}, true), 2500); } game.persist(); });

  // sáng ra vườn sạch: mèo làm bộ ngẫm nghĩ rồi kháy
  function morning() {
    if (!tidied || !game.brain) return; tidied = false;
    setTimeout(() => game.brain.interrupt(async () => { await game.brain.comeTo(); await B.act("look_up", 1200); game.sayLine("…", 1600); await B.act("idle_tail", 1800); game.say("tidy_morning", null, 5200); sceneWord("tidy", true); await B.act("loaf", 4000); }, "tidy"), 6500);
  }

  return {
    PROPS, acts, tap, sceneWord, morning,
    tick(dt) { drawSeat(dt); placeTag(); },
  };
}
