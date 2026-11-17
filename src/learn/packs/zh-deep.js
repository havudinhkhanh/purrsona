// Gói "Chữ sâu" (tiếng Trung): chữ và thành ngữ nghĩa sâu, kèm 1 câu như hình nền, cho chế độ "Tranh chữ".
// Câu ví dụ đều tự viết. Mỗi từ: [chữ Hán, pinyin, từ loại, nghĩa, câu, pinyin câu, dịch câu]. Cấp 1 Free, cấp 2 Plus.
export default {
  id: "zh-deep", lang: "zh", vi: "Chữ sâu", tier: "free",
  levels: [
    { id: "DEEP1", vi: "Chữ sâu · 1", tier: "free", words: [
      ["缘分", "yuánfèn", "danh từ", "duyên phận", "有些人一见如故，大概就是缘分。", "Yǒuxiē rén yí jiàn rú gù, dàgài jiù shì yuánfèn.", "Có người vừa gặp đã như quen, chắc là duyên."],
      ["释怀", "shìhuái", "động từ", "buông bỏ, nguôi ngoai", "时间不一定治愈一切，但会教你释怀。", "Shíjiān bù yídìng zhìyù yíqiè, dàn huì jiāo nǐ shìhuái.", "Thời gian chưa chắc chữa lành tất cả, nhưng sẽ dạy bạn buông."],
      ["温柔", "wēnróu", "tính từ", "dịu dàng", "温柔不是软弱，是一种力量。", "Wēnróu bú shì ruǎnruò, shì yì zhǒng lìliang.", "Dịu dàng không phải yếu đuối, mà là một sức mạnh."],
      ["岁月", "suìyuè", "danh từ", "năm tháng", "岁月很长，慢慢走就好。", "Suìyuè hěn cháng, mànmàn zǒu jiù hǎo.", "Năm tháng còn dài, cứ đi chậm thôi."],
      ["初心", "chūxīn", "danh từ", "tâm ban đầu, ý định ban đầu", "走得再远，也别忘了初心。", "Zǒu de zài yuǎn, yě bié wàngle chūxīn.", "Đi xa đến đâu cũng đừng quên điều mình muốn lúc đầu."],
      ["心安", "xīn'ān", "tính từ", "lòng yên", "心安的地方，就是家。", "Xīn'ān de dìfang, jiù shì jiā.", "Nơi lòng yên, là nhà."],
      ["烟火气", "yānhuǒqì", "danh từ", "hơi ấm đời thường (khói bếp, chợ, phố)", "最治愈的，是街边的烟火气。", "Zuì zhìyù de, shì jiē biān de yānhuǒqì.", "Chữa lành nhất là hơi ấm đời thường bên phố."],
      ["小确幸", "xiǎoquèxìng", "danh từ", "niềm vui nhỏ mà chắc chắn", "下班路上有晚霞，就是今天的小确幸。", "Xiàbān lùshang yǒu wǎnxiá, jiù shì jīntiān de xiǎoquèxìng.", "Đường tan làm có ráng chiều, là niềm vui nhỏ hôm nay."],
      ["慢慢来", "mànmàn lái", "cụm từ", "từ từ thôi", "别急，慢慢来，比较快。", "Bié jí, mànmàn lái, bǐjiào kuài.", "Đừng vội, từ từ thôi, lại nhanh hơn."],
      ["知足", "zhīzú", "tính từ", "biết đủ", "知足的人，口袋不满也很富有。", "Zhīzú de rén, kǒudai bù mǎn yě hěn fùyǒu.", "Người biết đủ, túi không đầy vẫn giàu."],
      ["刹那", "chànà", "danh từ", "khoảnh khắc, sát na", "花开只是一刹那，记住就够了。", "Huā kāi zhǐ shì yí chànà, jìzhù jiù gòu le.", "Hoa nở chỉ một khoảnh khắc, nhớ được là đủ."],
      ["治愈", "zhìyù", "động từ", "chữa lành", "一只猫的呼噜声，可以治愈很多事。", "Yì zhī māo de hūlu shēng, kěyǐ zhìyù hěn duō shì.", "Tiếng rừ rừ của một con mèo chữa lành được nhiều chuyện."],
    ] },
    { id: "DEEP2", vi: "Chữ sâu · 2", tier: "plus", words: [
      ["无常", "wúcháng", "danh từ, tính từ", "vô thường", "人生无常，所以今天更要好好吃饭。", "Rénshēng wúcháng, suǒyǐ jīntiān gèng yào hǎohǎo chīfàn.", "Đời vô thường, nên hôm nay càng phải ăn uống tử tế."],
      ["遗憾", "yíhàn", "danh từ", "điều tiếc nuối", "有遗憾的青春，才是真的青春。", "Yǒu yíhàn de qīngchūn, cái shì zhēn de qīngchūn.", "Tuổi trẻ có tiếc nuối mới là tuổi trẻ thật."],
      ["意难平", "yì nán píng", "cụm từ", "lòng khó nguôi (lóng mạng)", "那个结局，我到现在还意难平。", "Nàge jiéjú, wǒ dào xiànzài hái yì nán píng.", "Cái kết đó, tới giờ tôi vẫn chưa nguôi."],
      ["余生", "yúshēng", "danh từ", "quãng đời còn lại", "余生很贵，别浪费在不值得的人身上。", "Yúshēng hěn guì, bié làngfèi zài bù zhíde de rén shēnshang.", "Quãng đời còn lại đắt lắm, đừng phí cho người không đáng."],
      ["念旧", "niànjiù", "động từ", "hoài niệm, nhớ chuyện cũ", "念旧的人，总把旧东西留得好好的。", "Niànjiù de rén, zǒng bǎ jiù dōngxi liú de hǎohǎo de.", "Người hoài niệm luôn giữ đồ cũ rất kỹ."],
      ["孤独", "gūdú", "tính từ", "cô độc", "孤独不可怕，可怕的是在人群里孤独。", "Gūdú bù kěpà, kěpà de shì zài rénqún li gūdú.", "Cô độc không đáng sợ, đáng sợ là cô độc giữa đám đông."],
      ["归宿", "guīsù", "danh từ", "nơi thuộc về", "每条河都有自己的归宿。", "Měi tiáo hé dōu yǒu zìjǐ de guīsù.", "Con sông nào cũng có nơi để về."],
      ["浮生", "fúshēng", "danh từ", "kiếp phù sinh, đời người trôi nổi", "浮生若梦，醒来记得喝杯茶。", "Fúshēng ruò mèng, xǐnglai jìde hē bēi chá.", "Đời như giấc mộng, tỉnh dậy nhớ uống chén trà."],
      ["来日方长", "láirì fāng cháng", "thành ngữ", "ngày dài còn ở phía trước", "别难过，来日方长。", "Bié nánguò, láirì fāng cháng.", "Đừng buồn, ngày còn dài mà."],
      ["一期一会", "yì qī yí huì", "thành ngữ", "mỗi lần gặp là duy nhất", "一期一会，所以每次见面都要好好告别。", "Yì qī yí huì, suǒyǐ měi cì jiànmiàn dōu yào hǎohǎo gàobié.", "Mỗi lần gặp là duy nhất, nên lần nào cũng chào nhau cho tử tế."],
      ["告别", "gàobié", "động từ", "từ biệt", "学会告别，也是长大的一部分。", "Xuéhuì gàobié, yě shì zhǎngdà de yí bùfen.", "Biết cách từ biệt cũng là một phần của lớn lên."],
      ["星河", "xīnghé", "danh từ", "dải ngân hà", "抬头看看星河，烦恼就变小了。", "Táitóu kànkan xīnghé, fánnǎo jiù biàn xiǎo le.", "Ngẩng lên nhìn dải ngân hà, phiền muộn bỗng nhỏ lại."],
    ] },
  ],
};
