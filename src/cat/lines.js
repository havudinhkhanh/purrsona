// LỜI CỦA MÈO – nói như người thật nói: ngắn, đanh đá, xưng "tui", gọi chủ là {sen}.
// Tránh văn mẫu: không liệt kê ba vế, không gạch ngang, không "không phải A mà là B".
// Khoá theo tình huống; tâm trạng có câu riêng ("tình huống.tâm trạng"). Biến: {cat} {sen} {n} {w} {vi} {d}.
const L = {
  // ---- chào
  hello: ["Ủa về rồi hả.", "Mở app rồi thì học đi chớ.", "Tưởng quên đường về luôn rồi.", "Rồi, nay học gì đây?"],
  "hello.clingy": ["Về rồi! Học với tui đi.", "Nhớ {sen} quá trời."],
  "hello.grumpy": ["Khỏi nói. Học trước đi.", "Hừ. Giờ mới chịu mở app hả."],
  morning: ["Mới sáng ra học {n} chữ là vừa.", "Cà phê xong chưa? Rồi học.", "Sáng sớm đầu còn tỉnh, học lẹ đi."],
  night: ["Khuya rồi mà chưa ôn hả.", "Ôn một chữ rồi đi ngủ nè.", "Giờ này còn thức thì học luôn đi."],
  back: ["Đi đâu mất {d} ngày vậy?", "{d} ngày không thấy mặt. Chữ bay hết rồi.", "Bỏ tui {d} ngày. Ghi sổ rồi nha."],
  // ---- học
  ok: ["Ừa, đúng.", "Trúng rồi. Ăn hên hả?", "Được đó. Đừng có vênh.", "Ờ, cũng biết đó chớ.", "Đúng á? Bất ngờ ghê."],
  "ok.diva": ["Đúng. Lần này thôi nha.", "Tạm được."],
  "ok.clingy": ["Giỏi quá trời!", "Thấy chưa, biết mà!"],
  combo: ["{n} câu liền. Ai nhắc bài hả?", "Nay giỏi bất thường. Nghi lắm.", "{n} câu liền luôn. Ừa, giỏi."],
  wrong: ["Sai rồi má.", "Hôm qua mới học xong mà ta.", "Quên rồi hả?", "Đọc lại coi.", "Sai mà chọn tự tin ghê.", "Hông phải."],
  "wrong.grumpy": ["Sai nữa. Cào bây giờ.", "Trời ơi lại sai."],
  "wrong.clingy": ["Sai xíu thôi, làm lại nè.", "Gần trúng rồi đó."],
  lapse: ["Lần thứ {n} rồi đó. '{w}' với {sen} có thù hả?", "Lại '{w}'. Ghi vô tay đi: {vi}.", "'{w}' là '{vi}'. Nói hoài."],
  newword: ["Từ mới nè: '{w}'. Nhớ giùm.", "'{w}'. Nhìn kỹ, lát tui hỏi.", "Học '{w}' đi, dễ mà."],
  master: ["'{w}' thuộc rồi đó. Ngoài vườn mới nở một bông.", "Thêm một bông hoa. Công tui chỉ đó.", "Thuộc '{w}' rồi. Mất có {n} ngày."],
  done: ["Xong rồi hả. Ừa, cũng được.", "Hết bài. Tui đi ngủ đây.", "Nay đủ chỉ tiêu. Hông khen đâu."],
  // ---- nhắc / kháy
  nag_due: ["Còn {n} từ chưa ôn kìa.", "{n} từ nằm đó chờ nãy giờ.", "Ôn có {n} từ mà làm như đi đánh trận.", "{n} từ sắp bay khỏi đầu rồi đó."],
  nag_new: ["Nay chưa học chữ nào đâu nha.", "Lướt điện thoại hoài. Học đi.", "Có {n} từ mới đang chờ đó."],
  nag_streak: ["Chuỗi {n} ngày đó, bỏ là mất ráng chịu.", "{n} ngày liền rồi, nay tính nghỉ hả?"],
  forgot: ["'{w}' là gì, nhớ hông?", "Nói nghĩa '{w}' coi. Hông được nhìn.", "'{w}'. Quen quen hả? Quên rồi chớ gì."],
  idle_tap: ["Bấm tui chi? Học đi.", "Chọt nữa là cào à.", "Rảnh quá ha.", "Muốn tui đố hông?"],
  quiz_ask: ["Đố nè: '{w}' là gì?", "Kiểm tra miệng nè: '{w}'?", "'{w}'. Trả lời lẹ."],
  quiz_rev: ["Chữ nào đây? Nghĩ kỹ.", "Chọn đi, tui đang nhìn.", "Sai là bị tui nói đó."],
  garden: ["Con bướm kia có chữ kìa.", "Con ong còn siêng hơn {sen}.", "Vườn trống trơn, học thêm đi."],
  // ---- viết lề (ngắn, kiểu vẽ bậy)
  wall_due: ["{n} từ chưa ôn", "ôn đi trời", "{n} từ đang chờ", "chữ sắp bay mất"],
  wall_new: ["nay chưa học chữ nào", "{n} từ mới chờ nãy giờ", "học đi rồi chơi"],
  wall_done: ["nay học rồi. tạm được", "{sen} học xong (lạ ghê)", "đủ bài ✓"],
  wall_word: ["{w} = {vi}", "nhớ: {w}", "{w} là {vi} đó"],
  wall_streak: ["{n} ngày liền 🔥", "chuỗi {n} ngày, giữ nha"],
  // ---- sinh hoạt
  pet_good: ["Prrr… đúng chỗ.", "Ừm. Gãi tiếp.", "Đừng để ai thấy nha.", "Được đó."],
  "pet_good.diva": ["Đúng chỗ rồi. Lần này thôi.", "Nhẹ tay chút."],
  pet_bad: ["Ngược lông kìa!", "Hông phải chỗ đó.", "Nói rồi đó nha."],
  pet_hate: ["Đừng đụng chỗ đó.", "Lần sau cắn thiệt."],
  poke: ["Gì?", "Bỏ tay ra.", "Lại nữa.", "Rảnh quá. Ôn bài đi."],
  "poke.clingy": ["Hì.", "Nữa đi.", "Chơi với tui!"],
  "poke.grumpy": ["Cào bây giờ.", "Đi chỗ khác."],
  annoyed: ["Đủ rồi.", "Tui đi đây."],
  call_yes: ["Tới đây.", "Kêu gì đó?", "Ừa tới. Học đi."],
  "call_yes.clingy": ["Tới liền!", "Có tui nè!"],
  call_no: ["Nghe rồi. Hông tới.", "Bận.", "Học xong rồi kêu."],
  angry_call: ["Hông.", "Đang giận. Học bù đi rồi tính."],
  nap: ["Ngủ xíu.", "Đừng kêu. Học xong rồi hẵng kêu.", "zzz…"],
  wake: ["Gì vậy?", "Ai cho kêu dậy?", "Hông có ngủ. Đang nghĩ đề."],
  enter: ["Đi tuần.", "Coi có gì mới hông."],
  "enter.garden": ["Ra vườn đếm hoa.", "Bướm đâu rồi ta.", "Nắng đã quá."],
  "enter.house": ["Vô nhà coi. Bàn học vẫn nằm đó chờ kìa.", "Coi {sen} học tới đâu rồi."],
  watch: ["Chim kìa.", "Ngồi ngắm trời. Đừng phá.", "Ngoài kia có con bướm."],
  "watch.poet": ["Đám mây giống chữ 'cloud' ghê.", "Làm mèo sướng, khỏi thi cử."],
  groom: ["Đang làm đẹp.", "Đừng nhìn."],
  stretch: ["Ưỡn cái.", "Rồi, giờ làm gì?"],
  zoom: ["!!!", "Hông có gì đâu!", "Chạy!"],
  sulk: ["Hông nói chuyện.", "Đi đi.", "Giận. Học xong mới hết."],
  "sulk.clingy": ["Giận… mà đừng đi.", "Dỗ tui đi. Mà dỗ bằng học bài á."],
  highfive_ok: ["Đập tay! Đừng có quen.", "Rồi, một lần thôi."],
  highfive_no: ["Tay gì?", "Hông đập. Học xong rồi đập."],
  chase: ["Bắt được rồi!", "Con bướm này mang chữ gì vậy?", "Chậm quá."],
  bee: ["Ong. Né.", "Ong làm cả ngày kìa. Còn {sen} thì sao?"],
  kitten: ["Chữ! Chữ!", "Cái gì kia!", "Meo meo!"],
  // ---- quấn người
  follow: ["Đợi tui với!", "{sen} đi đâu đó?", "{sen} đi đâu tui đi đó."],
  headbutt: ["Prrr… {sen} của tui.", "Dụi cái nào.", "Học giỏi thì được dụi."],
  headbutt_back: ["Prrrrr…", "Biết mà.", "Nữa đi."],
  pawtap: ["Meo? {sen} ơi, bài đâu?", "Cốc cốc. Học hông?", "Nhìn tui nè. Rồi nhìn bài."],
  pawtap_ok: ["Rồi, học thôi.", "Vậy mới được chớ."],
  pawtap_no: ["Thôi kệ.", "Bận thì thôi. Chữ hông đợi đâu."],
  knead: ["Nhào bột nè… prrr.", "Êm ghê.", "Học tiếp đi, tui nằm đây."],
  belly: ["Bụng nè. Dám hông?", "Khoe chơi thôi, hông phải mời."],
  belly_trap: ["Dính bẫy rồi!", "Ai biểu tin mèo.", "Bụng chỉ để ngắm thôi nha."],
  belly_ok: ["Lần này thôi đó.", "Prrr… được."],
  sleepnear: ["Ngủ kế {sen} nha.", "Ấm ghê.", "Học đi, tui canh."],
  blink_back: ["Prrr.", "Biết mà.", "Tui cũng thương {sen}. Mà vẫn phải học."],
  idle: ["…", "Hm.", "Nhìn gì?"],
};
// tên mèo + cách mèo gọi bạn (mặc định "Sen") – điền lúc chạy
const NAMES = { cat: "na na", sen: "Sen" };
export function setNames(o) { Object.assign(NAMES, o); }
export function line(key, mood, room, vars = {}) {
  const cand = (room && L[`${key}.${room}`]) || (mood && L[`${key}.${mood}`]) || L[key] || L.idle;
  const v = { ...NAMES, ...vars };
  return cand[Math.floor(Math.random() * cand.length)].replace(/\{(\w+)\}/g, (m, k) => (v[k] ?? m));
}
export const hasLine = (k) => !!L[k];
