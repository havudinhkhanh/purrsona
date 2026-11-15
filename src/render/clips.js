// =====================================================================================
// BỘ TỪ VỰNG ĐỘNG TÁC CHUẨN — hợp đồng giữa "bộ não" mèo và mọi bộ vẽ (renderer).
// Bộ não chỉ gọi các tên dưới đây. Mỗi con mèo (cat.json) tự khai báo nó có những động tác nào.
// Thiếu động tác → tự lùi về động tác gần nhất theo bảng FALLBACK → con mèo nào cũng chạy được,
// kể cả bộ khung hình mới chỉ có idle + walk. Thêm khung mới = thêm tên vào cat.json, KHÔNG sửa code.
// =====================================================================================

/** kind: "loop" lặp vô hạn · "once" chạy 1 lần rồi báo xong · "move" lặp + có di chuyển (đồng bộ bước chân) */
export const CLIPS = {
  idle:       { kind: "loop", vi: "Ngồi thở",             note: "Ngồi yên, thở nhẹ. BẮT BUỘC phải có." },
  idle_tail:  { kind: "loop", vi: "Ngồi vẫy đuôi",        note: "Ngồi yên, đuôi phe phẩy" },
  look_up:    { kind: "loop", vi: "Ngước nhìn",           note: "Ngồi ngửa cổ nhìn lên (đòi ăn, nhìn chim)" },
  loaf:       { kind: "loop", vi: "Ngồi ổ bánh mì",       note: "Khoanh chân dưới ngực" },
  lie:        { kind: "loop", vi: "Nằm dài",              note: "Nằm nghiêng, thở" },
  sleep:      { kind: "loop", vi: "Cuộn tròn ngủ",        note: "Cuộn tròn, thở chậm" },
  groom:      { kind: "loop", vi: "Liếm chân",            note: "Lặp liếm chân / rửa mặt" },
  groom_full: { kind: "once", vi: "Rửa mặt trọn bộ",      note: "Ngồi → giơ chân → liếm → rửa mặt → ngồi lại" },
  lick_body:  { kind: "loop", vi: "Liếm lông",            note: "" },
  lick_lip:   { kind: "loop", vi: "Liếm mép",             note: "Sau khi ăn" },
  stretch:    { kind: "loop", vi: "Vươn vai",             note: "" },
  crouch:     { kind: "loop", vi: "Thủ thế",              note: "Hạ thấp người, mông ngoáy, sắp vồ" },
  eat:        { kind: "loop", vi: "Ăn",                   note: "Cúi đầu vào bát" },
  walk:       { kind: "move", vi: "Đi",                   note: "Chu kỳ bước khép vòng. Khai báo speed (đơn vị/giây) để chân không trượt" },
  run:        { kind: "move", vi: "Chạy",                 note: "" },
  stalk:      { kind: "move", vi: "Rình",                 note: "Bò thấp, chậm" },
  jump:       { kind: "loop", vi: "Nhảy (dáng bay)",      note: "Dáng giữa không trung; quỹ đạo do game tính" },
  chase:      { kind: "loop", vi: "Vồ",                   note: "Dáng vồ tới" },
  roll:       { kind: "loop", vi: "Lăn lộn",              note: "Nằm ngửa lắc" },
  roll_play:  { kind: "once", vi: "Lăn lộn trọn bộ",      note: "" },
  play_yarn:  { kind: "loop", vi: "Chơi len",             note: "" },
  scratch:    { kind: "loop", vi: "Cào trụ",              note: "" },
};

/** Lùi về động tác gần nhất khi con mèo không có động tác được gọi */
export const FALLBACK = {
  idle_tail: "idle", look_up: "idle", loaf: "idle", lie: "loaf", sleep: "lie",
  groom: "idle", groom_full: "groom", lick_body: "groom", lick_lip: "groom", stretch: "idle",
  crouch: "loaf", eat: "crouch", run: "walk", stalk: "walk", jump: "idle", chase: "jump",
  roll: "lie", roll_play: "roll", play_yarn: "roll", scratch: "stretch",
};

/** tên chuẩn → tên có thật của con mèo này */
export function resolveClip(has, name) {
  let n = name, guard = 0;
  while (!has(n) && guard++ < 8) n = FALLBACK[n] || "idle";
  return has(n) ? n : "idle";
}
