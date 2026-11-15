// THƯ CỦA MÈO: mỗi sáng một lá thư ngắn viết từ chuyện hôm qua (nhật ký) + tâm trạng hôm nay + độ thân.
// Lưu 30 lá gần nhất; xem lại toàn bộ thư cũ là quyền lợi gói Plus.
import { dayKey, rng } from "../core/util.js";
import { TIERS, tierIndex } from "../cat/bond.js";

export function writeLetter(game) {
  const s = game.save, cat = game.cat.name, sen = s.profile?.nick || "Sen";
  const y = new Date(); y.setDate(y.getDate() - 1); const yd = dayKey(y);
  const J = s.journal.filter((e) => e.d === yd), n = (t) => J.filter((e) => e.type === t).length;
  const r = rng(dayKey() + cat), P = (a) => a[Math.floor(r() * a.length)];
  const ti = tierIndex(s.cat.bond), mood = game.today.mood;
  const out = [];
  out.push(P(ti >= 3 ? [`${sen} yêu của ${cat},`, `Gửi ${sen} – người của ${cat},`] : ti >= 1 ? [`Gửi ${sen},`, `${sen} ơi,`] : [`Gửi người cho ăn,`, `Gửi con người kia,`]));
  // chuyện hôm qua
  const did = [];
  if (n("eat")) did.push(P(["ăn sạch bát", "ăn no nê", "chén hết phần cá"]));
  if (n("play")) did.push(P(["được chơi một trận ra trò", "săn được kha khá chấm đỏ"]));
  if (n("knock")) did.push(P(["lỡ tay đẩy rơi cái cốc (không cố ý đâu)", "dọn bớt đồ trên bàn bếp giùm"]));
  if (n("gift")) did.push(P(["tha quà về tận chỗ " + sen, "đi săn về có quà"]));
  if (n("event")) did.push(P(["canh chim ngoài cửa sổ", "đuổi một vị khách lạ"]));
  if (n("checkin") > 6) did.push(P(["đi tuần hết cả nhà", "kiểm tra lãnh thổ mấy chục lần"]));
  const firstDay = dayKey(new Date(s.created || Date.now())) === dayKey();
  if (firstDay) out.push(P([`Từ hôm nay ${cat} sống ở đây. Nhà hơi lạ, nhưng mùi ${sen} thì dễ chịu.`, `${cat} mới chuyển tới. Đừng làm ồn, để ${cat} đi kiểm tra từng phòng đã.`]));
  else if (did.length) out.push(`Hôm qua ${cat} ${did.slice(0, 3).join(", ")}.`);
  else out.push(P([`Hôm qua nhà yên ắng quá. ${cat} ngủ là chính.`, `Hôm qua ${sen} không ghé. ${cat} không buồn. Hơi hơi thôi.`]));
  // tâm trạng hôm nay
  out.push(`Hôm nay ${cat} thấy ${mood.vi.toLowerCase()} ${mood.emo}. ${P(["Liệu mà chiều.", "Nhớ để ý nha.", "Báo trước cho " + sen + " biết."])}`);
  // độ thân
  out.push(P([
    [`Chưa thân đâu. Cứ cho ăn đều đã.`, `Đừng tưởng vài viên snack là mua được ${cat}.`],
    [`${sen} đi đâu ${cat} hay đi theo. Tình cờ thôi.`, `Mùi ${sen} dễ chịu. Ghi nhận.`],
    [`Hôm nay có thể ${cat} sẽ dụi đầu vào màn hình. Đừng lau vội.`, `Thấy ${sen} là chớp mắt chậm rồi đó. Hiểu chưa?`],
    [`Bụng ${cat} là vùng cấm. Trừ khi ${sen} may mắn.`, `${cat} hay nhớ ${sen} giữa ngày. Đừng nói ai.`],
    [`${cat} sẽ ngủ cạnh ${sen} tối nay. Chừa chỗ nha.`, `Cả nhà này, ${cat} thích nhất là ${sen}. Thế thôi.`, `Ngày nào ${sen} cũng về, ${cat} đều biết trước. Vì ${cat} đợi.`],
  ][ti]));
  if (ti >= 4) out.push(P([`Cảm ơn vì đã là con người của ${cat}.`, `Đi làm vui nha. ${cat} giữ nhà.`]));
  if (s.visits.streak >= 3) out.push(`P.S. ${s.visits.streak} ngày liền ${sen} ghé rồi. ${cat} có đếm.`);
  out.push(`— ${cat} 🐾`);
  return { d: dayKey(), text: out.join("\n"), tier: TIERS[ti].id };
}

/** viết thư hôm nay (một lần mỗi ngày) */
export function letterToday(game) {
  const s = game.save; s.letters ||= [];
  let L = s.letters.find((x) => x.d === dayKey());
  if (!L) { L = writeLetter(game); s.letters.push(L); if (s.letters.length > 30) s.letters = s.letters.slice(-30); }
  return L;
}
