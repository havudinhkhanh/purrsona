// GIẤY NHẮN CỦA MÈO: mỗi sáng 1 tờ, viết từ kết quả học hôm qua + tâm trạng hôm nay + độ thân.
// Lưu 30 tờ gần nhất; đọc lại giấy cũ là quyền lợi gói Plus.
import { dayKey, rng } from "../core/util.js";
import { TIERS, tierIndex } from "../cat/bond.js";

// tâm trạng nói kiểu người thật nói
const SPOKEN = { grumpy: "đang quạu", sleepy: "làm biếng", diva: "khó ở", clingy: "muốn được ôm", foodie: "đói bụng", zoomie: "tăng động", explorer: "tò mò", poet: "mơ màng" };

export function writeNote(game) {
  const s = game.save, L = s.learn, cat = game.cat.name, sen = s.profile?.nick || "Sen";
  const y = new Date(); y.setDate(y.getDate() - 1); const D = L.days[dayKey(y)];
  const r = rng(dayKey() + cat), P = (a) => a[Math.floor(r() * a.length)];
  const ti = tierIndex(s.cat.bond), mood = game.today.mood, t = game.learn.todo(), first = dayKey(new Date(s.created)) === dayKey();
  const out = [P(ti >= 3 ? [`${sen} ơi,`, `Nè ${sen},`] : [`${sen} nè,`, `${sen} à,`, `Ê ${sen},`])];
  if (first) out.push(P([`Từ nay tui dạy ${sen} học chữ. Hông lấy tiền, chỉ lấy snack.`, `Từ giờ tui kèm ${sen} học chữ. Lười là tui biết liền.`]));
  else if (!D || D.right + D.wrong === 0) out.push(P([`Hôm qua ${sen} hông học chữ nào. Tui ghi sổ rồi.`, `Hôm qua trống trơn. Tui ngồi viết bậy cả buổi.`]));
  else { const acc = Math.round((D.right / (D.right + D.wrong)) * 100); out.push(`Hôm qua ${sen} học ${D.new} từ mới, trúng ${D.right}, trật ${D.wrong}. ${acc >= 85 ? P(["Cũng được.", "Hông tệ, mà đừng vênh."]) : acc >= 60 ? P(["Còn non lắm.", "Sai hơi nhiều à nha."]) : P(["Thảm luôn.", "Nhìn mà muốn độn thổ."])}`); }
  if (t.due) out.push(t.neu ? P([`Nay có ${t.due} từ phải ôn với ${t.neu} từ mới.`, `${t.due} từ cũ đang chờ, thêm ${t.neu} từ mới nữa.`]) : `Nay có ${t.due} từ phải ôn.`);
  else if (t.neu) out.push(`Nay có ${t.neu} từ mới. Ít xíu à.`);
  out.push(`Nay tui ${SPOKEN[mood.id] || "hơi khó ở"}. ${P(["Liệu hồn mà học.", "Đừng có chọc.", "Sai ít ít thôi."])}`);
  const st = game.learn.streakAlive(); if (st >= 2) out.push(`Được ${st} ngày liền rồi. ${P(["Giữ nha.", "Đứt là tui cười đó.", "Ghê ha."])}`);
  if (ti >= 2) out.push(P([`Học xong ra vườn coi hoa nha.`, `Thương ${sen} lắm á. Mà lười là tui vẫn kháy nha.`]));
  out.push(`— ${cat} 🐾`);
  return { d: dayKey(), text: out.join("\n"), tier: TIERS[ti].id };
}
/** giấy nhắn hôm nay (một lần mỗi ngày) */
export function noteToday(game) {
  const s = game.save; s.notes ||= [];
  let N = s.notes.find((x) => x.d === dayKey());
  if (!N) { N = writeNote(game); s.notes.push(N); if (s.notes.length > 30) s.notes = s.notes.slice(-30); }
  return N;
}
