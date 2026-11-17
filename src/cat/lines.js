// LỜI CỦA MÈO – cộc, khinh khỉnh, kiệm lời. Xưng "tui", gọi chủ là {sen}. Đa số dưới 6 chữ.
// Không giảng giải, không động viên kiểu sách vở. Khen thì nhỏ giọt, chê thì thẳng.
// GIỚI HẠN: chỉ kháy chuyện lười, né, quên, lướt. Không chê đầu óc, ngoại hình, tiền bạc, con người.
// Khoá theo tình huống; tâm trạng có câu riêng ("tình huống.tâm trạng"). Biến: {cat} {sen} {n} {w} {vi} {d} {site}.
const L = {
  // ---- chào
  hello: ["Ờ. Về rồi hả.", "Mở app. Hiếm ghê.", "Lại là {sen}.", "Tưởng đi luôn rồi."],
  "hello.clingy": ["Về rồi hả. Ừ, vui.", "Ngồi đây học đi."],
  "hello.grumpy": ["Hừ.", "Giờ mới mò tới."],
  morning: ["Sáng rồi. Học.", "Dậy rồi thì học {n} chữ.", "Đánh răng xong chưa? Học."],
  night: ["Khuya rồi. Chưa ôn.", "Thức làm gì. Ôn đi.", "Mắt díp rồi còn lướt."],
  back: ["{d} ngày. Biến đâu vậy?", "Đi {d} ngày. Còn nhớ chữ nào hông?", "Tưởng bỏ học luôn rồi."],
  // ---- học
  ok: ["Ờ.", "Trúng. Hên.", "Đoán đúng thôi.", "Ừ, vậy đó.", "Hừ. Được.", "Tạm."],
  "ok.diva": ["Tạm chấp nhận.", "Ừ. Lần này thôi."],
  "ok.clingy": ["Giỏi. Xíu xíu.", "Ừa, đúng rồi đó."],
  combo: ["{n} câu liền. Ai nhắc vậy?", "Nay uống nhầm thuốc hả?", "{n} câu. Nghi lắm."],
  wrong: ["Sai.", "Chậc.", "Vậy cũng sai.", "Đoán mò hả?", "Nhìn kỹ chưa?", "Quên lẹ ghê.", "Ủa?", "Hôm qua mới học đó."],
  "wrong.grumpy": ["Sai nữa. Mệt.", "Trời đất."],
  "wrong.clingy": ["Sai rồi. Lại nha.", "Gần trúng. Mà sai."],
  lapse: ["'{w}' lần {n}. Thù hả?", "'{w}' = {vi}. Nói hoài.", "Lại '{w}'. Hết nói."],
  newword: ["'{w}'. Nhớ đi.", "Chữ mới. Đừng có quên.", "'{w}'. Lát hỏi."],
  master: ["'{w}' thuộc. Mọc một bông.", "Thêm bông hoa. Công tui.", "Thuộc rồi. Đừng vênh."],
  done: ["Xong. Đi chỗ khác.", "Đủ bài. Hông khen.", "Hết. Tui ngủ."],
  // ---- nhắc / kháy
  nag_due: ["{n} từ chưa ôn kìa.", "{n} từ. Ngồi đó nhìn.", "Ôn {n} từ mà lâu ghê."],
  nag_new: ["Chưa học chữ nào.", "Lướt hoài.", "{n} từ mới. Đợi ai?"],
  nag_streak: ["Chuỗi {n} ngày. Bỏ thì ráng chịu.", "{n} ngày. Nay tính đứt hả?"],
  forgot: ["'{w}' là gì? Biết mà.", "'{w}'. Quên chưa?", "Nói nghĩa '{w}' coi."],
  idle_tap: ["Bấm tui chi.", "Chọt nữa cào.", "Rảnh ghê.", "Bấm Học kìa."],
  quiz_ask: ["Đố: '{w}'?", "'{w}'. Lẹ.", "'{w}' là gì?"],
  quiz_rev: ["Chữ nào?", "Chọn lẹ.", "Tui nhìn đó."],
  garden: ["Bướm có chữ kìa.", "Ong còn siêng hơn.", "Vườn trơ trọi."],
  // ---- kháy lúc ngồi không (hiện tooltip định kỳ)
  jab_idle: ["Ngồi ngó gì?", "Chán ghê.", "Tui ngáp nè.", "Lướt nữa đi. Cho quên hết.", "Đang học hay đang mơ?", "Im ru vậy?"],
  // tâm trạng hôm nay đổi giọng kháy (đọc ở Thêm › Mèo: tâm trạng)
  "jab_idle.grumpy": ["Hừ.", "Nhìn gì. Học đi.", "Đang cáu. Đừng chọc."],
  "jab_idle.clingy": ["Ngồi đây với tui nè.", "Đừng đi đâu nha.", "Học chung đi."],
  "jab_idle.sleepy": ["Ngáp…", "Học lẹ đi tui còn ngủ.", "zzz… chưa học hả."],
  "jab_idle.diva": ["Ngắm tui đủ chưa.", "Tui đẹp. Còn {sen} thì học đi.", "Bổn mèo đang chờ."],
  "jab_idle.zoomie": ["Chạy một vòng rồi học!", "Lẹ lẹ lẹ!", "Tui hết kiên nhẫn rồi!"],
  "jab_idle.foodie": ["Đói. Học 1 chữ cho tui 1 viên.", "Snack đâu? Chữ đâu?"],
  "jab_idle.poet": ["Trời đẹp. Chữ chưa vô đầu.", "Ngồi ngắm mây. Mây cũng biết chữ."],
  "jab_idle.explorer": ["Tui tìm ra chữ mới. Muốn coi hông?", "Lục được 1 chữ dưới ghế."],
  "nag_due.grumpy": ["{n} từ. Ôn. Ngay.", "Đừng để tui nói lần hai. {n} từ."],
  "nag_due.clingy": ["{n} từ đợi {sen} nè. Ôn với tui đi.", "Ôn {n} từ rồi chơi với tui."],
  "nag_new.diva": ["{n} chữ mới. Tui chọn kỹ đó.", "Chữ mới tui đem tới. Học đi."],
  "nag_new.sleepy": ["{n} chữ mới… học đi rồi tui ngủ."],
  jab_wrong_recent: ["Câu hồi nãy sai đó. Nhớ chưa?", "'{w}' hồi nãy sai. Ghi vô đầu.", "Vừa sai '{w}' xong."],
  jab_done: ["Học xong rồi còn ngồi đó.", "Đi làm việc khác đi.", "Ừ, nay được."],
  jab_misc: ["Hừ.", "Xì.", "Nhìn tui làm gì.", "Bài đâu?", "Ngáp.", "Mèo còn nhớ hơn."],
  // ---- phản ứng khi bấm giao diện
  ui_next: ["Né từ khó hả?", "Đổi hoài.", "Chạy trốn."],
  ui_skip: ["Bỏ chạy hả?", "Né hả?", "Không biết thì nói."],
  ui_menu: ["Lục lọi gì?", "Tìm gì? Bài ở ngoài."],
  ui_lang: ["Cái kia chưa xong.", "Đổi qua đổi lại."],
  ui_speak: ["Nghe kỹ.", "Lặp theo đi.", "Nghe nữa cũng vậy."],
  book: ["Lưu rồi. Rồi có học không?", "Lưu cho có hả?", "Lưu nhiều. Học ít."],
  // ---- chữ nóng hôm nay
  hot_new: ["Báo nay nói '{w}' hoài. Biết hông?", "Chữ nóng: '{w}'. Học kẻo quê.", "'{w}' đang hot. {sen} chưa biết hả?"],
  // ---- thời tiết (kháy chuyện trời, không chê người)
  wx_rain: ["Mưa. Vô nhà.", "Ướt lông là giận đó.", "Mưa rồi. Ngồi học đi, khỏi đi đâu."],
  wx_storm: ["Sấm! Tui không sợ. Tui chỉ… đi vô.", "Giông. Đừng ra ngoài.", "Trời giận. Giống tui."],
  wx_thunder: ["!!!", "Ai cho sấm.", "Không sợ. Chỉ giật mình."],
  wx_rainwatch: ["Ngồi coi mưa. Thơ ghê.", "Mưa rơi. Chữ rơi khỏi đầu {sen}.", "Mưa là để học."],
  wx_hot: ["Nắng muốn chảy mỡ.", "Nóng. Đừng kêu tui.", "Tui nằm bóng cây. {sen} vô học đi."],
  wx_wind: ["Gió thổi bay hết chữ rồi.", "Gió. Lông tui rối.", "Bay hết. Lá với trí nhớ."],
  wx_leaf: ["Bắt được! …À, lá.", "Lá này dám bay ngang tui."],
  wx_cloudy: ["Âm u. Hợp học bài.", "Trời xám. Tui cũng xám."],
  wx_after: ["Tạnh rồi. Ra vườn.", "Hết mưa. Chữ còn không?"],
  // ---- đọc ké (dán đoạn văn / chia sẻ)
  read_none: ["Đọc gì mà không dính chữ nào.", "Toàn chữ lạ. Dịch máy hả?"],
  read_unlearned: ["{n} chữ trong gói. Chưa học chữ nào.", "Có {n} chữ đáng học. Đợi gì?"],
  read_some: ["Có {n} chữ đã học. Ít.", "Biết {n} chữ. Đọc nổi hông?"],
  read_lots: ["{n} chữ quen. Cũng được.", "Đọc ổn. Đừng tưởng bở."],
  read_short: ["Có nhiêu đó mà nhờ đọc.", "Ngắn ghê."],
  read_long: ["Dài vậy ai đọc.", "Đọc hết hông đó?"],
  // ---- sinh hoạt
  pet_good: ["Prrr.", "Ừm. Tiếp.", "Đừng để ai thấy.", "Được."],
  "pet_good.diva": ["Đúng chỗ. Lần này.", "Nhẹ tay."],
  pet_bad: ["Ngược lông!", "Sai chỗ.", "Nói rồi đó."],
  pet_hate: ["Đừng. Đụng.", "Cắn đó."],
  poke: ["Gì.", "Bỏ tay ra.", "Lại nữa.", "Rảnh."],
  "poke.clingy": ["Hì.", "Nữa đi."],
  "poke.grumpy": ["Cào bây giờ.", "Đi chỗ khác."],
  annoyed: ["Đủ rồi.", "Tui đi."],
  call_yes: ["Gì.", "Kêu chi.", "Ừ, tới."],
  "call_yes.clingy": ["Tới nè.", "Có tui."],
  call_no: ["Nghe. Không tới.", "Bận.", "Học xong rồi kêu."],
  angry_call: ["Không.", "Giận. Học bù đi."],
  nap: ["Ngủ.", "Đừng kêu.", "zzz"],
  wake: ["Gì?", "Ai cho kêu.", "Đang nghĩ đề."],
  enter: ["Đi tuần.", "Kiểm tra."],
  "enter.garden": ["Ra vườn.", "Đếm hoa coi."],
  "enter.house": ["Vô nhà.", "Coi bàn học."],
  watch: ["Chim.", "Đừng phá.", "Ngắm trời."],
  "watch.poet": ["Mây giống chữ 'cloud'.", "Mèo khỏi thi. Sướng."],
  groom: ["Đang đẹp.", "Đừng nhìn."],
  stretch: ["Ưỡn.", "Rồi."],
  zoom: ["!!!", "Không có gì!", "Chạy!"],
  sulk: ["Không nói.", "Đi đi.", "Giận."],
  "sulk.clingy": ["Giận. Mà đừng đi.", "Dỗ bằng học bài."],
  highfive_ok: ["Đập. Đừng quen.", "Một lần thôi."],
  highfive_no: ["Tay gì.", "Không đập."],
  chase: ["Bắt rồi.", "Chậm quá."],
  bee: ["Ong. Né.", "Ong làm cả ngày. Còn {sen}?"],
  kitten: ["Chữ!", "Cái gì kia!", "Meo."],
  // ---- quấn người
  follow: ["Đợi.", "Đi đâu đó?"],
  headbutt: ["Prrr. Của tui.", "Dụi cái.", "Học giỏi mới được dụi."],
  headbutt_back: ["Prrrr.", "Biết mà."],
  pawtap: ["Ê. Bài đâu?", "Cốc cốc. Học.", "Nhìn tui. Rồi nhìn bài."],
  pawtap_ok: ["Ừ, học.", "Vậy mới được."],
  pawtap_no: ["Thôi kệ.", "Bận thì thôi."],
  knead: ["Nhào bột. Prrr.", "Êm.", "Học tiếp đi."],
  belly: ["Bụng nè. Dám hông?", "Khoe thôi."],
  belly_trap: ["Dính!", "Ai biểu tin mèo.", "Bụng để ngắm."],
  belly_ok: ["Lần này thôi.", "Prrr."],
  sleepnear: ["Ngủ kế {sen}.", "Ấm.", "Học đi. Tui canh."],
  blink_back: ["Prrr.", "Biết mà.", "Thương. Mà vẫn kháy."],
  idle: ["…", "Hm.", "Nhìn gì."],
};
// tên mèo + cách mèo gọi bạn (mặc định "Sen") – điền lúc chạy
const NAMES = { cat: "na", sen: "Sen" };
export function setNames(o) { Object.assign(NAMES, o); }
export function line(key, mood, room, vars = {}) {
  const cand = (room && L[`${key}.${room}`]) || (mood && L[`${key}.${mood}`]) || L[key] || L.idle;
  const v = { ...NAMES, ...vars };
  return cand[Math.floor(Math.random() * cand.length)].replace(/\{(\w+)\}/g, (m, k) => (v[k] ?? m));
}
export const hasLine = (k) => !!L[k];
