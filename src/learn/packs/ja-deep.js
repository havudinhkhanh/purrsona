// Gói "Chữ sâu" (tiếng Nhật): những chữ khó dịch, đẹp, kèm 1 câu như hình nền cho chế độ "Tranh chữ". Câu tự viết.
// Mỗi từ: [chữ, "kana · romaji", từ loại, nghĩa, câu, romaji câu, dịch câu]. Cấp 1 Free, cấp 2 Plus.
export default {
  id: "ja-deep", lang: "ja", vi: "Chữ sâu", tier: "free",
  levels: [
    { id: "DEEP1", vi: "Chữ sâu · 1", tier: "free", words: [
      ["木漏れ日", "こもれび · komorebi", "danh từ", "nắng xuyên qua kẽ lá", "木漏れ日の下で、猫が目を細めている。", "Komorebi no shita de, neko ga me o hosomete iru.", "Dưới nắng xuyên kẽ lá, con mèo lim dim mắt."],
      ["生き甲斐", "いきがい · ikigai", "danh từ", "lẽ sống, điều khiến mỗi sáng muốn thức dậy", "小さなことでも、生き甲斐になる。", "Chiisana koto demo, ikigai ni naru.", "Chuyện nhỏ thôi cũng có thể thành lẽ sống."],
      ["積ん読", "つんどく · tsundoku", "danh từ", "mua sách về chất đống, chưa đọc", "机の上は積ん読でいっぱいだ。", "Tsukue no ue wa tsundoku de ippai da.", "Trên bàn toàn sách mua về chưa đọc."],
      ["金継ぎ", "きんつぎ · kintsugi", "danh từ", "hàn chén vỡ bằng vàng; vết nứt cũng đẹp", "傷も金継ぎのように美しくなれる。", "Kizu mo kintsugi no yō ni utsukushiku nareru.", "Vết thương cũng có thể đẹp như chén hàn vàng."],
      ["森林浴", "しんりんよく · shinrin'yoku", "danh từ", "tắm rừng, đi giữa cây để thư thái", "週末は森林浴で心を休める。", "Shūmatsu wa shinrin'yoku de kokoro o yasumeru.", "Cuối tuần tắm rừng cho lòng nghỉ ngơi."],
      ["縁", "えん · en", "danh từ", "duyên", "ここで会えたのも何かの縁だね。", "Koko de aeta no mo nanika no en da ne.", "Gặp được nhau ở đây cũng là duyên nhỉ."],
      ["七転び八起き", "ななころびやおき · nanakorobi yaoki", "thành ngữ", "ngã bảy lần, đứng dậy tám lần", "七転び八起き、また明日がんばろう。", "Nanakorobi yaoki, mata ashita ganbarō.", "Ngã bảy lần dậy tám lần, mai lại cố tiếp."],
      ["初心", "しょしん · shoshin", "danh từ", "tâm thế người mới học", "初心を忘れずに続けたい。", "Shoshin o wasurezu ni tsuzuketai.", "Muốn đi tiếp mà không quên tâm thế ban đầu."],
      ["懐かしい", "なつかしい · natsukashii", "tính từ", "thân thương, gợi nhớ", "この匂い、懐かしいね。", "Kono nioi, natsukashii ne.", "Mùi này gợi nhớ ghê."],
      ["居場所", "いばしょ · ibasho", "danh từ", "chỗ mình thuộc về", "誰にでも居場所がある。", "Dare ni demo ibasho ga aru.", "Ai cũng có một chỗ để thuộc về."],
      ["一息", "ひといき · hitoiki", "danh từ", "một hơi nghỉ, nghỉ một chút", "お茶で一息つこう。", "Ocha de hitoiki tsukō.", "Uống chén trà nghỉ một chút nào."],
      ["余白", "よはく · yohaku", "danh từ", "khoảng trống (để thở)", "人生にも余白が必要だ。", "Jinsei ni mo yohaku ga hitsuyō da.", "Đời cũng cần khoảng trống."],
    ] },
    { id: "DEEP2", vi: "Chữ sâu · 2", tier: "plus", words: [
      ["物の哀れ", "もののあわれ · mono no aware", "danh từ", "nỗi xao xuyến trước cái chóng qua", "散る桜に物の哀れを感じる。", "Chiru sakura ni mono no aware o kanjiru.", "Thấy xao xuyến khi hoa anh đào rơi."],
      ["幽玄", "ゆうげん · yūgen", "danh từ", "vẻ đẹp sâu xa, mờ ảo", "霧の山には幽玄な美しさがある。", "Kiri no yama ni wa yūgen na utsukushisa ga aru.", "Núi trong sương có vẻ đẹp mờ ảo sâu xa."],
      ["花鳥風月", "かちょうふうげつ · kachō fūgetsu", "thành ngữ", "hoa, chim, gió, trăng – vẻ đẹp thiên nhiên", "花鳥風月を楽しむ心を持ちたい。", "Kachō fūgetsu o tanoshimu kokoro o mochitai.", "Muốn có tâm hồn biết thưởng thức thiên nhiên."],
      ["一生懸命", "いっしょうけんめい · isshōkenmei", "phó từ", "hết sức mình", "一生懸命やれば、それでいい。", "Isshōkenmei yareba, sore de ii.", "Làm hết sức là được rồi."],
      ["夕焼け", "ゆうやけ · yūyake", "danh từ", "ráng chiều", "帰り道の夕焼けがきれいだった。", "Kaerimichi no yūyake ga kirei datta.", "Ráng chiều trên đường về đẹp lắm."],
      ["月が綺麗ですね", "つきがきれいですね · tsuki ga kirei desu ne", "cụm từ", "\"trăng đẹp nhỉ\" – cách nói khéo \"tôi thương bạn\"", "月が綺麗ですね、と彼は言った。", "Tsuki ga kirei desu ne, to kare wa itta.", "Anh ấy nói: trăng đẹp nhỉ."],
      ["猫舌", "ねこじた · nekojita", "danh từ", "\"lưỡi mèo\" – người không ăn được đồ nóng", "私は猫舌だから、少し冷ましてから飲む。", "Watashi wa nekojita dakara, sukoshi samashite kara nomu.", "Tôi lưỡi mèo nên để nguội chút mới uống."],
      ["縁側", "えんがわ · engawa", "danh từ", "hiên gỗ nhà Nhật", "縁側で猫と昼寝をした。", "Engawa de neko to hirune o shita.", "Ngủ trưa với mèo ngoài hiên gỗ."],
      ["雨音", "あまおと · amaoto", "danh từ", "tiếng mưa", "雨音を聞きながら本を読む。", "Amaoto o kikinagara hon o yomu.", "Vừa nghe tiếng mưa vừa đọc sách."],
      ["寄り道", "よりみち · yorimichi", "danh từ", "ghé ngang, đi đường vòng", "たまには寄り道も悪くない。", "Tama ni wa yorimichi mo warukunai.", "Thỉnh thoảng đi vòng cũng không tệ."],
      ["恩返し", "おんがえし · ongaeshi", "danh từ", "đền ơn", "いつか恩返しがしたい。", "Itsuka ongaeshi ga shitai.", "Mong một ngày được đền ơn."],
      ["終わり良ければ全て良し", "おわりよければすべてよし · owari yokereba subete yoshi", "thành ngữ", "kết thúc đẹp là mọi thứ đều ổn", "最後に笑えたら、終わり良ければ全て良し。", "Saigo ni waraetara, owari yokereba subete yoshi.", "Cuối cùng cười được thì mọi thứ đều ổn."],
    ] },
  ],
};
