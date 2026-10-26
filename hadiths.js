// Hadith database for Azkar — переводы на все 15 языков приложения.
// Приложение читает этот массив автоматически; index.html и js/app.js менять не нужно.
//
// НОМЕРА ХАДИСОВ: приведены по нумерации сайта sunnah.com
// (издания Darussalam; для «Сахих Муслим» — сквозная нумерация).
// В разных печатных изданиях нумерация может отличаться, поэтому при
// сверке ориентируйтесь именно на sunnah.com.
//
// ============================================================
//  КАК ДОБАВИТЬ ХАДИС — скопируй блок и вставь в конец массива:
// ============================================================
//
//  {
//      arabic: "اتَّقُوا اللَّهَ حَيْثُمَا كُنْتُمْ",
//      text: {
//          ru: "Бойтесь Аллаха, где бы вы ни были.",
//          en: "Fear Allah wherever you are."
//          // остальные языки можно добавить позже — пока их нет,
//          // пользователь увидит английский текст
//      },
//      source: { ru: "Ат-Тирмизи, №1987", en: "At-Tirmidhi, No. 1987" }
//  },
//
//  Старый формат (только русский) тоже работает:
//  { arabic: "...", translation: "текст", source: "источник" }
//
//  После правки файла повысь CACHE_NAME в sw.js, чтобы телефоны получили новую версию.
// ============================================================

window.AZKAR_HADITHS = [
    {
        arabic: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
        text: {
            ru: "Поистине, дела оцениваются по намерениям, и каждому человеку — лишь то, что он намеревался.",
            en: "Actions are judged only by intentions, and every person will have only what they intended.",
            uz: "Albatta, amallar niyatlarga ko'radir va har bir kishiga faqat niyat qilgan narsasi bo'ladi.",
            de: "Wahrlich, die Taten werden nur nach den Absichten beurteilt, und jedem Menschen steht nur das zu, was er beabsichtigt hat.",
            es: "En verdad, las obras se juzgan según las intenciones, y a cada persona le corresponde solo lo que se propuso.",
            fr: "Les actes ne valent que par les intentions, et chacun n'obtiendra que ce qu'il a eu l'intention de faire.",
            it: "In verità, le azioni valgono secondo le intenzioni, e a ciascuno spetta solo ciò che ha inteso.",
            ja: "まことに行いは意図によって判断され、人はそれぞれ意図したものだけを得る。",
            ko: "진실로 행위는 의도에 따라 평가되며, 각 사람에게는 그가 의도한 것만이 있다.",
            zh: "一切行为只凭举意而定，每个人只得到他所举意的。",
            tr: "Ameller ancak niyetlere göredir. Herkese ancak niyet ettiği şey vardır.",
            hi: "निःसंदेह कर्मों का दारोमदार नीयतों पर है, और हर व्यक्ति को वही मिलेगा जिसकी उसने नीयत की।",
            id: "Sesungguhnya amal itu tergantung niatnya, dan setiap orang hanya mendapatkan apa yang ia niatkan.",
            ms: "Sesungguhnya setiap amalan bergantung pada niat, dan setiap orang hanya memperoleh apa yang diniatkannya.",
            th: "แท้จริงการงานทั้งหลายขึ้นอยู่กับเจตนา และแต่ละคนจะได้รับเฉพาะสิ่งที่เขาได้ตั้งเจตนาไว้"
        },
        source: {
            ru: "Аль-Бухари, №1; Муслим, №1907", en: "Al-Bukhari, No. 1; Muslim, No. 1907", uz: "Buxoriy, №1; Muslim, №1907",
            de: "Al-Bukhari, Nr. 1; Muslim, Nr. 1907", es: "Al-Bujari, n.º 1; Muslim, n.º 1907", fr: "Al-Boukhari, n° 1 ; Muslim, n° 1907",
            it: "Al-Bukhari, n. 1; Muslim, n. 1907", ja: "ブハーリー 第1番、ムスリム 第1907番", ko: "부카리 1번, 무슬림 1907번",
            zh: "布哈里，第1号；穆斯林，第1907号", tr: "Buhârî, No. 1; Müslim, No. 1907", hi: "बुख़ारी, क्रमांक 1; मुस्लिम, क्रमांक 1907",
            id: "Al-Bukhari, no. 1; Muslim, no. 1907", ms: "Al-Bukhari, no. 1; Muslim, no. 1907", th: "อัลบุคอรี หมายเลข 1; มุสลิม หมายเลข 1907"
        }
    },
    {
        arabic: "الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ",
        text: {
            ru: "Мусульманин — тот, от языка и руки которого в безопасности другие мусульмане.",
            en: "A Muslim is the one from whose tongue and hand other Muslims are safe.",
            uz: "Musulmon — tili va qo'lidan boshqa musulmonlar omonda bo'lgan kishidir.",
            de: "Ein Muslim ist derjenige, vor dessen Zunge und Hand die Muslime sicher sind.",
            es: "El musulmán es aquel de cuya lengua y mano están a salvo los demás musulmanes.",
            fr: "Le musulman est celui dont les musulmans sont à l'abri de la langue et de la main.",
            it: "Il musulmano è colui dalla cui lingua e dalla cui mano gli altri musulmani sono al sicuro.",
            ja: "ムスリムとは、その舌と手から他のムスリムが安全である者である。",
            ko: "무슬림이란 그의 혀와 손으로부터 다른 무슬림들이 안전한 사람이다.",
            zh: "穆斯林是其他穆斯林免受其口舌与双手伤害的人。",
            tr: "Müslüman, dilinden ve elinden Müslümanların emin olduğu kimsedir.",
            hi: "मुसलमान वह है जिसकी ज़बान और हाथ से दूसरे मुसलमान सुरक्षित रहें।",
            id: "Seorang muslim adalah orang yang kaum muslimin lainnya selamat dari lisan dan tangannya.",
            ms: "Seorang Muslim ialah orang yang Muslim lain selamat daripada lidah dan tangannya.",
            th: "มุสลิมคือผู้ที่บรรดามุสลิมปลอดภัยจากลิ้นและมือของเขา"
        },
        source: {
            ru: "Аль-Бухари, №10; Муслим, №40", en: "Al-Bukhari, No. 10; Muslim, No. 40", uz: "Buxoriy, №10; Muslim, №40",
            de: "Al-Bukhari, Nr. 10; Muslim, Nr. 40", es: "Al-Bujari, n.º 10; Muslim, n.º 40", fr: "Al-Boukhari, n° 10 ; Muslim, n° 40",
            it: "Al-Bukhari, n. 10; Muslim, n. 40", ja: "ブハーリー 第10番、ムスリム 第40番", ko: "부카리 10번, 무슬림 40번",
            zh: "布哈里，第10号；穆斯林，第40号", tr: "Buhârî, No. 10; Müslim, No. 40", hi: "बुख़ारी, क्रमांक 10; मुस्लिम, क्रमांक 40",
            id: "Al-Bukhari, no. 10; Muslim, no. 40", ms: "Al-Bukhari, no. 10; Muslim, no. 40", th: "อัลบุคอรี หมายเลข 10; มุสลิม หมายเลข 40"
        }
    },
    {
        arabic: "تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ",
        text: {
            ru: "Улыбка в лицо своему брату — это садака (милостыня) для тебя.",
            en: "Your smile in the face of your brother is charity (sadaqah) for you.",
            uz: "Birodaringning yuziga tabassum qilishing sen uchun sadaqadir.",
            de: "Dein Lächeln im Gesicht deines Bruders ist für dich eine Sadaqa (Almosen).",
            es: "Tu sonrisa ante tu hermano es para ti una sadaqa (caridad).",
            fr: "Ton sourire à ton frère est pour toi une aumône (sadaqa).",
            it: "Il tuo sorriso rivolto a tuo fratello è per te una sadaqa (elemosina).",
            ja: "あなたが兄弟に向けるほほえみは、あなたにとってサダカ（施し）である。",
            ko: "네 형제의 얼굴을 보며 미소 짓는 것은 너에게 사다까(자선)이다.",
            zh: "你对你的兄弟微笑，对你来说就是施舍（萨达格）。",
            tr: "Kardeşinin yüzüne gülümsemen senin için bir sadakadır.",
            hi: "अपने भाई के सामने मुस्कुराना तुम्हारे लिए सदक़ा (दान) है।",
            id: "Senyummu di hadapan saudaramu adalah sedekah bagimu.",
            ms: "Senyumanmu di hadapan saudaramu adalah sedekah bagimu.",
            th: "การยิ้มของท่านต่อหน้าพี่น้องของท่านคือเศาะดะเกาะฮ์ (ทาน) สำหรับท่าน"
        },
        source: {
            ru: "Ат-Тирмизи, №1956 (хасан)", en: "At-Tirmidhi, No. 1956 (hasan)", uz: "Termiziy, №1956 (hasan)",
            de: "At-Tirmidhi, Nr. 1956 (hasan)", es: "At-Tirmidhi, n.º 1956 (hasan)", fr: "At-Tirmidhi, n° 1956 (hasan)",
            it: "At-Tirmidhi, n. 1956 (hasan)", ja: "ティルミズィー 第1956番（ハサン）", ko: "티르미디 1956번 (하산)",
            zh: "提尔密济，第1956号（良好）", tr: "Tirmizî, No. 1956 (hasen)", hi: "तिर्मिज़ी, क्रमांक 1956 (हसन)",
            id: "At-Tirmidzi, no. 1956 (hasan)", ms: "At-Tirmizi, no. 1956 (hasan)", th: "อัตติรมิซี หมายเลข 1956 (หะสัน)"
        }
    },
    {
        arabic: "لَيْسَ الشَّدِيدُ بِالصُّرَعَةِ، إِنَّمَا الشَّدِيدُ الَّذِي يَمْلِكُ نَفْسَهُ عِنْدَ الْغَضَبِ",
        text: {
            ru: "Сильный — не тот, кто побеждает в борьбе. Поистине, сильный — тот, кто владеет собой в гневе.",
            en: "The strong person is not the one who overcomes others in wrestling. Truly, the strong one is the one who controls himself when angry.",
            uz: "Kuchli odam kurashda yenguvchi emas. Albatta, kuchli odam g'azab paytida o'zini tuta oladigan kishidir.",
            de: "Stark ist nicht, wer im Ringkampf siegt. Wahrlich, stark ist, wer sich im Zorn beherrscht.",
            es: "El fuerte no es quien vence en la lucha. En verdad, el fuerte es quien se domina cuando se enfada.",
            fr: "Le fort n'est pas celui qui terrasse les autres à la lutte ; le fort est celui qui se maîtrise lors de la colère.",
            it: "Il forte non è colui che vince nella lotta. In verità, il forte è colui che sa dominarsi nell'ira.",
            ja: "強い者とは、組み打ちで相手を倒す者ではない。まことに強い者とは、怒りのときに自分を制する者である。",
            ko: "강한 자는 씨름에서 이기는 자가 아니다. 진실로 강한 자는 화가 날 때 자신을 다스리는 자이다.",
            zh: "强者不是摔跤中把人摔倒的人，真正的强者是发怒时能克制自己的人。",
            tr: "Güçlü kimse güreşte rakibini yenen değildir. Gerçek güçlü, öfke anında kendine hâkim olandır.",
            hi: "ताक़तवर वह नहीं जो कुश्ती में दूसरों को पछाड़ दे। सच में ताक़तवर वह है जो ग़ुस्से के समय ख़ुद पर क़ाबू रखे।",
            id: "Orang kuat bukanlah yang menang dalam bergulat. Sesungguhnya orang kuat adalah yang mampu menguasai dirinya ketika marah.",
            ms: "Orang yang kuat bukanlah yang menang dalam bergusti. Sesungguhnya orang yang kuat ialah yang dapat mengawal dirinya ketika marah.",
            th: "ผู้ที่แข็งแรงไม่ใช่ผู้ที่ชนะในการปล้ำ แท้จริงผู้ที่แข็งแรงคือผู้ที่ควบคุมตนเองได้ในยามโกรธ"
        },
        source: {
            ru: "Аль-Бухари, №6114; Муслим, №2609", en: "Al-Bukhari, No. 6114; Muslim, No. 2609", uz: "Buxoriy, №6114; Muslim, №2609",
            de: "Al-Bukhari, Nr. 6114; Muslim, Nr. 2609", es: "Al-Bujari, n.º 6114; Muslim, n.º 2609", fr: "Al-Boukhari, n° 6114 ; Muslim, n° 2609",
            it: "Al-Bukhari, n. 6114; Muslim, n. 2609", ja: "ブハーリー 第6114番、ムスリム 第2609番", ko: "부카리 6114번, 무슬림 2609번",
            zh: "布哈里，第6114号；穆斯林，第2609号", tr: "Buhârî, No. 6114; Müslim, No. 2609", hi: "बुख़ारी, क्रमांक 6114; मुस्लिम, क्रमांक 2609",
            id: "Al-Bukhari, no. 6114; Muslim, no. 2609", ms: "Al-Bukhari, no. 6114; Muslim, no. 2609", th: "อัลบุคอรี หมายเลข 6114; มุสลิม หมายเลข 2609"
        }
    },
    {
        arabic: "الْزَمْهَا فَإِنَّ الْجَنَّةَ تَحْتَ رِجْلَيْهَا",
        text: {
            ru: "Оставайся с ней (с матерью), поистине, Рай — под её ногами.",
            en: "Stay with her (your mother), for Paradise is beneath her feet.",
            uz: "Uning (onangning) yonida bo'l, chunki jannat uning oyoqlari ostidadir.",
            de: "Bleib bei ihr (deiner Mutter), denn das Paradies liegt unter ihren Füßen.",
            es: "Quédate con ella (tu madre), pues el Paraíso está bajo sus pies.",
            fr: "Reste auprès d'elle (ta mère), car le Paradis est sous ses pieds.",
            it: "Resta con lei (tua madre), perché il Paradiso è sotto i suoi piedi.",
            ja: "彼女（母親）のそばにいなさい。まことに楽園は彼女の足もとにある。",
            ko: "그녀(어머니) 곁에 머물러라. 진실로 천국은 그녀의 발 아래에 있다.",
            zh: "你要守在她（你的母亲）身边，因为乐园就在她的脚下。",
            tr: "Onun (annenin) yanından ayrılma, çünkü cennet onun ayaklarının altındadır.",
            hi: "उसके (अपनी माँ के) साथ रहो, क्योंकि जन्नत उसके क़दमों के नीचे है।",
            id: "Tetaplah bersamanya (ibumu), karena surga berada di bawah kakinya.",
            ms: "Tetaplah bersamanya (ibumu), kerana syurga berada di bawah kakinya.",
            th: "จงอยู่กับนาง (มารดาของท่าน) เพราะแท้จริงสวรรค์อยู่ใต้เท้าของนาง"
        },
        source: {
            ru: "Ан-Насаи, №3104 (сахих)", en: "An-Nasa'i, No. 3104 (sahih)", uz: "Nasaiy, №3104 (sahih)",
            de: "An-Nasa'i, Nr. 3104 (sahih)", es: "An-Nasai, n.º 3104 (sahih)", fr: "An-Nasa'i, n° 3104 (sahih)",
            it: "An-Nasa'i, n. 3104 (sahih)", ja: "ナサーイー 第3104番（サヒーフ）", ko: "나사이 3104번 (사히흐)",
            zh: "奈萨仪，第3104号（正确）", tr: "Nesâî, No. 3104 (sahih)", hi: "नसाई, क्रमांक 3104 (सहीह)",
            id: "An-Nasa'i, no. 3104 (shahih)", ms: "An-Nasa'i, no. 3104 (sahih)", th: "อันนะสาอี หมายเลข 3104 (เศาะฮีห์)"
        }
    },
    {
        arabic: "مَنْ دَلَّ عَلَى خَيْرٍ فَلَهُ مِثْلُ أَجْرِ فَاعِلِهِ",
        text: {
            ru: "Кто указал на благое — тому такая же награда, как и совершившему его.",
            en: "Whoever guides someone to good will have a reward like that of the one who does it.",
            uz: "Kim yaxshilikka yo'l ko'rsatsa, unga o'sha yaxshilikni qilganning ajriday ajr bor.",
            de: "Wer zu etwas Gutem hinweist, erhält den gleichen Lohn wie derjenige, der es tut.",
            es: "Quien indica el camino hacia el bien recibe la misma recompensa que quien lo realiza.",
            fr: "Celui qui indique un bien obtient une récompense semblable à celle de celui qui l'accomplit.",
            it: "Chi indica il bene riceve una ricompensa pari a quella di chi lo compie.",
            ja: "善を指し示した者には、それを行った者と同じ報奨がある。",
            ko: "선행으로 인도하는 자에게는 그것을 행한 자와 같은 보상이 있다.",
            zh: "谁指引他人行善，谁就获得与行善者同样的回赐。",
            tr: "Bir hayra yol gösterene, onu yapanın sevabı kadar sevap vardır.",
            hi: "जिसने किसी को भलाई की राह दिखाई, उसे उस भलाई करने वाले के बराबर सवाब मिलेगा।",
            id: "Barang siapa menunjukkan kepada kebaikan, maka ia mendapat pahala seperti pahala orang yang melakukannya.",
            ms: "Sesiapa yang menunjukkan kepada kebaikan, baginya pahala seperti pahala orang yang melakukannya.",
            th: "ผู้ใดชี้นำไปสู่ความดี เขาจะได้รับผลบุญเช่นเดียวกับผู้ที่กระทำความดีนั้น"
        },
        source: {
            ru: "Муслим, №1893", en: "Muslim, No. 1893", uz: "Muslim, №1893",
            de: "Muslim, Nr. 1893", es: "Muslim, n.º 1893", fr: "Muslim, n° 1893",
            it: "Muslim, n. 1893", ja: "ムスリム 第1893番", ko: "무슬림 1893번",
            zh: "穆斯林，第1893号", tr: "Müslim, No. 1893", hi: "मुस्लिम, क्रमांक 1893",
            id: "Muslim, no. 1893", ms: "Muslim, no. 1893", th: "มุสลิม หมายเลข 1893"
        }
    },
    {
        arabic: "خَيْرُكُمْ خَيْرُكُمْ لِأَهْلِهِ",
        text: {
            ru: "Лучший из вас — тот, кто лучше всего относится к своей семье.",
            en: "The best of you are those who are best to their families.",
            uz: "Sizlarning eng yaxshingiz — oilasiga eng yaxshi munosabatda bo'lganingizdir.",
            de: "Die Besten unter euch sind diejenigen, die am besten zu ihrer Familie sind.",
            es: "Los mejores de vosotros son los que mejor tratan a su familia.",
            fr: "Les meilleurs d'entre vous sont les meilleurs envers leur famille.",
            it: "I migliori tra voi sono coloro che sono i migliori verso la propria famiglia.",
            ja: "あなたがたのうち最も優れた者は、自分の家族に対して最も良い者である。",
            ko: "너희 가운데 가장 훌륭한 자는 자기 가족에게 가장 잘하는 자이다.",
            zh: "你们中最优秀的人，是对家人最好的人。",
            tr: "Sizin en hayırlınız, ailesine karşı en hayırlı olanınızdır.",
            hi: "तुममें सबसे अच्छा वह है जो अपने घरवालों के लिए सबसे अच्छा है।",
            id: "Sebaik-baik kalian adalah yang paling baik kepada keluarganya.",
            ms: "Sebaik-baik kamu ialah yang paling baik terhadap keluarganya.",
            th: "ผู้ที่ดีที่สุดในหมู่พวกท่าน คือผู้ที่ดีที่สุดต่อครอบครัวของเขา"
        },
        source: {
            ru: "Ат-Тирмизи, №3895 (сахих)", en: "At-Tirmidhi, No. 3895 (sahih)", uz: "Termiziy, №3895 (sahih)",
            de: "At-Tirmidhi, Nr. 3895 (sahih)", es: "At-Tirmidhi, n.º 3895 (sahih)", fr: "At-Tirmidhi, n° 3895 (sahih)",
            it: "At-Tirmidhi, n. 3895 (sahih)", ja: "ティルミズィー 第3895番（サヒーフ）", ko: "티르미디 3895번 (사히흐)",
            zh: "提尔密济，第3895号（正确）", tr: "Tirmizî, No. 3895 (sahih)", hi: "तिर्मिज़ी, क्रमांक 3895 (सहीह)",
            id: "At-Tirmidzi, no. 3895 (shahih)", ms: "At-Tirmizi, no. 3895 (sahih)", th: "อัตติรมิซี หมายเลข 3895 (เศาะฮีห์)"
        }
    },
    {
        arabic: "إِنَّ اللَّهَ جَمِيلٌ يُحِبُّ الْجَمَالَ",
        text: {
            ru: "Поистине, Аллах красив и любит красоту.",
            en: "Truly, Allah is beautiful and loves beauty.",
            uz: "Albatta, Alloh go'zaldir va go'zallikni sevadi.",
            de: "Wahrlich, Allah ist schön und liebt die Schönheit.",
            es: "En verdad, Allah es bello y ama la belleza.",
            fr: "Certes, Allah est beau et Il aime la beauté.",
            it: "In verità, Allah è bello e ama la bellezza.",
            ja: "まことにアッラーは美しく、美を愛される。",
            ko: "진실로 알라께서는 아름다우시며 아름다움을 사랑하신다.",
            zh: "真主确是美的，他喜爱美。",
            tr: "Şüphesiz Allah güzeldir, güzelliği sever.",
            hi: "निःसंदेह अल्लाह सुंदर है और सुंदरता को पसंद करता है।",
            id: "Sesungguhnya Allah itu indah dan mencintai keindahan.",
            ms: "Sesungguhnya Allah itu indah dan menyukai keindahan.",
            th: "แท้จริงอัลลอฮ์ทรงงดงาม และทรงรักความงดงาม"
        },
        source: {
            ru: "Муслим, №91 (в составе хадиса о кибре)", en: "Muslim, No. 91 (part of the hadith about arrogance)", uz: "Muslim, №91 (kibr haqidagi hadis tarkibida)",
            de: "Muslim, Nr. 91 (Teil des Hadith über den Hochmut)", es: "Muslim, n.º 91 (parte del hadiz sobre la soberbia)", fr: "Muslim, n° 91 (extrait du hadith sur l'orgueil)",
            it: "Muslim, n. 91 (parte dell'hadith sulla superbia)", ja: "ムスリム 第91番（高慢に関するハディースの一部）", ko: "무슬림 91번 (교만에 관한 하디스의 일부)",
            zh: "穆斯林，第91号（关于骄傲的圣训的一部分）", tr: "Müslim, No. 91 (kibir hakkındaki hadisin bir bölümü)", hi: "मुस्लिम, क्रमांक 91 (घमंड वाली हदीस का अंश)",
            id: "Muslim, no. 91 (bagian dari hadis tentang kesombongan)", ms: "Muslim, no. 91 (sebahagian hadis tentang takbur)", th: "มุสลิม หมายเลข 91 (ส่วนหนึ่งของหะดีษเรื่องความหยิ่งยโส)"
        }
    },
    {
        arabic: "لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ",
        text: {
            ru: "Не уверует никто из вас по-настоящему, пока не пожелает своему брату того же, чего желает себе.",
            en: "None of you truly believes until he loves for his brother what he loves for himself.",
            uz: "Sizlardan hech biringiz o'zi uchun yaxshi ko'rgan narsani birodari uchun ham yaxshi ko'rmaguncha (komil) mo'min bo'lmaydi.",
            de: "Keiner von euch glaubt wahrhaftig, bis er seinem Bruder wünscht, was er sich selbst wünscht.",
            es: "Ninguno de vosotros cree verdaderamente hasta que desee para su hermano lo que desea para sí mismo.",
            fr: "Aucun de vous n'est véritablement croyant tant qu'il n'aime pas pour son frère ce qu'il aime pour lui-même.",
            it: "Nessuno di voi crede veramente finché non desidera per suo fratello ciò che desidera per sé stesso.",
            ja: "あなたがたのだれも、自分が好むものを兄弟のためにも好むようになるまでは、真に信仰したことにはならない。",
            ko: "너희 가운데 누구도 자신이 원하는 것을 형제를 위해서도 원하기 전까지는 참된 신앙인이 아니다.",
            zh: "你们中任何人都不算真正的信士，直到他为他的兄弟喜爱他为自己所喜爱的。",
            tr: "Sizden biriniz, kendisi için istediğini kardeşi için de istemedikçe (gerçek) iman etmiş olmaz.",
            hi: "तुममें से कोई सच्चा ईमान वाला नहीं हो सकता, जब तक वह अपने भाई के लिए वही न चाहे जो अपने लिए चाहता है।",
            id: "Tidak sempurna iman salah seorang di antara kalian hingga ia mencintai untuk saudaranya apa yang ia cintai untuk dirinya sendiri.",
            ms: "Tidak sempurna iman seseorang daripada kamu sehingga dia menyukai untuk saudaranya apa yang dia sukai untuk dirinya sendiri.",
            th: "คนหนึ่งคนใดในหมู่พวกท่านยังไม่ศรัทธาอย่างแท้จริง จนกว่าเขาจะรักให้พี่น้องของเขาได้รับสิ่งที่เขารักให้แก่ตัวเอง"
        },
        source: {
            ru: "Аль-Бухари, №13; Муслим, №45", en: "Al-Bukhari, No. 13; Muslim, No. 45", uz: "Buxoriy, №13; Muslim, №45",
            de: "Al-Bukhari, Nr. 13; Muslim, Nr. 45", es: "Al-Bujari, n.º 13; Muslim, n.º 45", fr: "Al-Boukhari, n° 13 ; Muslim, n° 45",
            it: "Al-Bukhari, n. 13; Muslim, n. 45", ja: "ブハーリー 第13番、ムスリム 第45番", ko: "부카리 13번, 무슬림 45번",
            zh: "布哈里，第13号；穆斯林，第45号", tr: "Buhârî, No. 13; Müslim, No. 45", hi: "बुख़ारी, क्रमांक 13; मुस्लिम, क्रमांक 45",
            id: "Al-Bukhari, no. 13; Muslim, no. 45", ms: "Al-Bukhari, no. 13; Muslim, no. 45", th: "อัลบุคอรี หมายเลข 13; มุสลิม หมายเลข 45"
        }
    },
    {
        arabic: "مَنْ نَفَّسَ عَنْ مُؤْمِنٍ كُرْبَةً مِنْ كُرَبِ الدُّنْيَا نَفَّسَ اللَّهُ عَنْهُ كُرْبَةً مِنْ كُرَبِ يَوْمِ الْقِيَامَةِ",
        text: {
            ru: "Кто снимет с верующего одну из мирских тягот — Аллах снимет с него одну из тягот в День Воскресения.",
            en: "Whoever relieves a believer of one of the hardships of this world, Allah will relieve him of one of the hardships of the Day of Resurrection.",
            uz: "Kim mo'minning dunyo qiyinchiliklaridan birini yengillatsa, Alloh undan Qiyomat kunining qiyinchiliklaridan birini yengillatadi.",
            de: "Wer einem Gläubigen eine der Nöte dieser Welt nimmt, dem nimmt Allah eine der Nöte am Tag der Auferstehung.",
            es: "Quien alivie a un creyente de una de las angustias de este mundo, Allah lo aliviará de una de las angustias del Día de la Resurrección.",
            fr: "Quiconque soulage un croyant d'une des détresses de ce bas monde, Allah le soulagera d'une des détresses du Jour de la Résurrection.",
            it: "Chi allevia un credente da una delle angustie di questo mondo, Allah lo allevierà da una delle angustie del Giorno della Resurrezione.",
            ja: "信仰者の現世の苦難の一つを取り除いた者からは、アッラーが復活の日の苦難の一つを取り除かれる。",
            ko: "누구든지 신앙인의 현세의 고난 하나를 덜어 주면, 알라께서 심판의 날의 고난 하나를 그에게서 덜어 주신다.",
            zh: "谁为一个信士解除今世的一个困难，真主就在复生日为他解除一个困难。",
            tr: "Kim bir müminin dünya sıkıntılarından birini giderirse, Allah da ondan kıyamet gününün sıkıntılarından birini giderir.",
            hi: "जो किसी मोमिन की दुनिया की मुसीबतों में से एक मुसीबत दूर करेगा, अल्लाह क़यामत के दिन की मुसीबतों में से एक मुसीबत उससे दूर कर देगा।",
            id: "Barang siapa melapangkan satu kesusahan dunia dari seorang mukmin, Allah akan melapangkan darinya satu kesusahan pada hari kiamat.",
            ms: "Sesiapa yang melepaskan seorang mukmin daripada satu kesusahan dunia, Allah akan melepaskannya daripada satu kesusahan pada hari kiamat.",
            th: "ผู้ใดปลดเปลื้องความทุกข์ยากหนึ่งในความทุกข์ยากแห่งดุนยาให้แก่ผู้ศรัทธา อัลลอฮ์จะทรงปลดเปลื้องความทุกข์ยากหนึ่งในความทุกข์ยากแห่งวันกิยามะฮ์ให้แก่เขา"
        },
        source: {
            ru: "Муслим, №2699", en: "Muslim, No. 2699", uz: "Muslim, №2699",
            de: "Muslim, Nr. 2699", es: "Muslim, n.º 2699", fr: "Muslim, n° 2699",
            it: "Muslim, n. 2699", ja: "ムスリム 第2699番", ko: "무슬림 2699번",
            zh: "穆斯林，第2699号", tr: "Müslim, No. 2699", hi: "मुस्लिम, क्रमांक 2699",
            id: "Muslim, no. 2699", ms: "Muslim, no. 2699", th: "มุสลิม หมายเลข 2699"
        }
    },

    {
        arabic: "إِذَا تَوَضَّأَ الْعَبْدُ الْمُسْلِمُ فَأَحْسَنَ وُضُوءَهُ خَرَجَتْ خَطَايَاهُ مِنْ جَسَدِهِ حَتَّى تَخْرُجَ مِنْ تَحْتِ أَظْفَارِهِ",
        text: {
            ru: "Кто совершает омовение должным образом, у того грехи выходят из тела, даже из-под ногтей.",
            en: "When a Muslim performs ablution properly, his sins come out of his body, even from under his fingernails.",
            uz: "Musulmon kishi tahoratni to'g'ri qilsa, uning gunohlari tanasidan chiqib ketadi, hatto tirnoqlari ostidan ham.",
            de: "Wenn ein Muslim die Waschung richtig vollzieht, verlassen seine Sünden seinen Körper, sogar unter seinen Fingernägeln hervor.",
            es: "Cuando un musulmán realiza bien la ablución, sus pecados salen de su cuerpo, incluso de debajo de sus uñas.",
            fr: "Lorsqu'un musulman accomplit correctement son ablution, ses péchés sortent de son corps, jusque de sous ses ongles.",
            it: "Quando un musulmano compie correttamente l'abluzione, i suoi peccati escono dal suo corpo, perfino da sotto le unghie.",
            ja: "ムスリムが正しくウドゥー（小浄）を行えば、罪は身体から出て行き、爪の下からさえも出て行く。",
            ko: "무슬림이 우두를 올바르게 하면, 그의 죄는 몸에서 빠져나가며 심지어 손톱 밑에서도 빠져나간다.",
            zh: "穆斯林若完善地做小净，他的罪过就会从身体里排出，甚至从指甲缝里排出。",
            tr: "Müslüman abdestini güzelce alırsa, günahları vücudundan çıkar, hatta tırnaklarının altından bile.",
            hi: "जब मुसलमान अच्छी तरह वुज़ू करता है, तो उसके गुनाह उसके शरीर से निकल जाते हैं, यहाँ तक कि उसके नाख़ूनों के नीचे से भी।",
            id: "Apabila seorang muslim berwudu dengan baik, dosa-dosanya keluar dari tubuhnya, bahkan dari bawah kuku-kukunya.",
            ms: "Apabila seorang Muslim berwuduk dengan sempurna, dosa-dosanya keluar dari tubuhnya, sehingga dari bawah kukunya.",
            th: "เมื่อมุสลิมคนหนึ่งอาบน้ำละหมาดอย่างดี บาปของเขาจะออกจากร่างกายของเขา แม้กระทั่งจากใต้เล็บของเขา"
        },
        source: {
            ru: "Муслим, №245", en: "Muslim, No. 245", uz: "Muslim, №245",
            de: "Muslim, Nr. 245", es: "Muslim, n.º 245", fr: "Muslim, n° 245",
            it: "Muslim, n. 245", ja: "ムスリム 第245番", ko: "무슬림 245번",
            zh: "穆斯林，第245号", tr: "Müslim, No. 245", hi: "मुस्लिम, क्रमांक 245",
            id: "Muslim, no. 245", ms: "Muslim, no. 245", th: "มุสลิม หมายเลข 245"
        }
    },

    {
        arabic: "إِنَّ أَبْغَضَ الرِّجَالِ إِلَى اللَّهِ الأَلَدُّ الْخَصِمُ",
        text: {
            ru: "Поистине, самый ненавистный для Аллаха из мужчин — это непримиримый спорщик.",
            en: "Indeed, the most hated of men to Allah is the most quarrelsome adversary.",
            uz: "Albatta, odamlar ichida Allohga eng yoqimsiz kishi — eng qattiq janjalkashdir.",
            de: "Wahrlich, der Mann, der Allah am meisten verhasst ist, ist der hartnäckigste Streitsüchtige.",
            es: "Ciertamente, el hombre más aborrecido por Allah es el más pendenciero y contencioso.",
            fr: "Certes, l'homme le plus détesté d'Allah est le plus acharné dans la querelle.",
            it: "Certamente, l'uomo più odiato da Allah è il più litigioso e contenzioso.",
            ja: "まことに、アッラーに最も嫌われる男は、頑固で争いを好む者である。",
            ko: "진실로 알라께 가장 미움받는 남자는 완고하게 다투기를 좋아하는 자이다.",
            zh: "真主最憎恶的人，就是最好争辩、最顽固的人。",
            tr: "Allah katında erkeklerin en çok buğzettiği kişi, en inatçı tartışmacıdır.",
            hi: "निश्चय ही अल्लाह के निकट सबसे घृणित पुरुष वह है जो सबसे अधिक झगड़ालू और हठी हो।",
            id: "Sesungguhnya laki-laki yang paling dibenci Allah adalah orang yang paling keras kepala dalam berdebat.",
            ms: "Sesungguhnya lelaki yang paling dibenci oleh Allah ialah orang yang paling keras kepala dan suka bertengkar.",
            th: "แท้จริง ชายที่อัลลอฮ์ทรงเกลียดที่สุดคือผู้ที่ดื้อรั้นและชอบโต้เถียงที่สุด"
        },
        source: {
            ru: "Аль-Бухари, №2457; Муслим, №2668", en: "Al-Bukhari, No. 2457; Muslim, No. 2668", uz: "Buxoriy, №2457; Muslim, №2668",
            de: "Buchari, Nr. 2457; Muslim, Nr. 2668", es: "Bujari, n.º 2457; Muslim, n.º 2668", fr: "Bukhari, n° 2457 ; Muslim, n° 2668",
            it: "Bukhari, n. 2457; Muslim, n. 2668", ja: "ブハーリー 第2457番; ムスリム 第2668番", ko: "부하리 2457번; 무슬림 2668번",
            zh: "布哈里，第2457号；穆斯林，第2668号", tr: "Buhârî, No. 2457; Müslim, No. 2668", hi: "बुख़ारी, क्रमांक 2457; मुस्लिम, क्रमांक 2668",
            id: "Bukhari, no. 2457; Muslim, no. 2668", ms: "Bukhari, no. 2457; Muslim, no. 2668", th: "บุคอรี หมายเลข 2457; มุสลิม หมายเลข 2668"
        }
    },

    {
        arabic: "إِذَا سَأَلْتُمُ اللَّهَ فَاسْأَلُوهُ الْفِرْدَوْسَ، فَإِنَّهُ أَوْسَطُ الْجَنَّةِ وَأَعْلَى الْجَنَّةِ، وَفَوْقَهُ عَرْشُ الرَّحْمَنِ، وَمِنْهُ تَفَجَّرُ أَنْهَارُ الْجَنَّةِ",
        text: {
            ru: "Когда просите у Аллаха, просите у Него аль-Фирдаус: поистине, он — середина Рая и самое высокое его место; над ним — Трон Милостивого, и из него разливаются реки Рая.",
            en: "When you ask Allah, ask Him for al-Firdaws: indeed, it is the middle and the highest part of Paradise; above it is the Throne of the Most Merciful, and from it the rivers of Paradise flow.",
            uz: "Allohdan so'raganingizda Firdavsni so'rang. Albatta, u Jannatning o'rtasi va eng yuqori joyidir. Uning ustida Rahmonning Arshi bor, undan Jannat daryolari oqib chiqadi.",
            de: "Wenn ihr Allah bittet, so bittet Ihn um al-Firdaus; denn es ist die Mitte und der höchste Teil des Paradieses, über ihm ist der Thron des Barmherzigen, und aus ihm entspringen die Flüsse des Paradieses.",
            es: "Cuando pidáis a Allah, pedidle al-Firdaus, pues es el centro y la parte más alta del Paraíso; sobre él está el Trono del Misericordioso, y de él brotan los ríos del Paraíso.",
            fr: "Lorsque vous demandez à Allah, demandez-Lui al-Firdaws : c'est le centre et la partie la plus élevée du Paradis ; au-dessus se trouve le Trône du Très Miséricordieux, et de lui jaillissent les fleuves du Paradis.",
            it: "Quando chiedete ad Allah, chiedetegli al-Firdaws: è il centro e la parte più alta del Paradiso; sopra di esso c'è il Trono del Misericordioso, e da esso sgorgano i fiumi del Paradiso.",
            ja: "アッラーに求めるときは、フィルダウスを求めなさい。それは楽園の中央であり最も高い所で、その上にはラフマーンの玉座があり、そこから楽園の川々が湧き出ています。",
            ko: "알라께 구하려거든 알 피르다우스를 구하라. 그곳은 낙원의 한가운데이자 가장 높은 곳이며, 그 위에는 자비로우신 분의 보좌가 있고, 거기서 낙원의 강들이 흘러나온다.",
            zh: "你们向真主祈求时，就求祂赐予菲尔道斯乐园。它是乐园的中央、最高处，其上是至慈主的宝座，乐园的河流从那里涌出。",
            tr: "Allah'tan istediğinizde Firdevs'i isteyin. Çünkü o Cennetin ortası ve en yücesidir; onun üzerinde Rahman'ın Arşı vardır ve ondan Cennet nehirleri akar.",
            hi: "जब तुम अल्लाह से माँगो, तो उससे फ़िरदौस माँगो; वह जन्नत का बीच का और सबसे ऊँचा भाग है, उसके ऊपर रहमान का अर्श है और उसी से जन्नत की नदियाँ बहती हैं।",
            id: "Apabila kalian meminta kepada Allah, mintalah Firdaus kepada-Nya; sesungguhnya ia adalah bagian tengah dan tertinggi surga, di atasnya ada Arasy Yang Maha Pengasih, dan darinya mengalir sungai-sungai surga.",
            ms: "Apabila kamu memohon kepada Allah, mohonlah Firdaus; sesungguhnya ia ialah bahagian tengah dan tertinggi syurga, di atasnya ada 'Arasy Yang Maha Pemurah, dan daripadanya mengalir sungai-sungai syurga.",
            th: "เมื่อพวกท่านขอต่ออัลลอฮ์ ก็จงขออัลฟิรเดาส์ เพราะแท้จริงมันคือส่วนกลางและส่วนสูงสุดของสวรรค์ เหนือมันคือบัลลังก์ของพระผู้ทรงกรุณาปรานี และจากมันมีแม่น้ำแห่งสวรรค์ไหลออกมา"
        },
        source: {
            ru: "Аль-Бухари, №7423", en: "Al-Bukhari, No. 7423", uz: "Buxoriy, №7423",
            de: "Buchari, Nr. 7423", es: "Bujari, n.º 7423", fr: "Bukhari, n° 7423",
            it: "Bukhari, n. 7423", ja: "ブハーリー 第7423番", ko: "부하리 7423번",
            zh: "布哈里，第7423号", tr: "Buhârî, No. 7423", hi: "बुख़ारी, क्रमांक 7423",
            id: "Bukhari, no. 7423", ms: "Bukhari, no. 7423", th: "บุคอรี หมายเลข 7423"
        }
    },

    {
        arabic: "مَنْ بَاتَ طَاهِرًا فِي ثَوْبِهِ مَلَكٌ، فَلَا يَنْقَلِبُ سَاعَةً مِنَ اللَّيْلِ إِلَّا قَالَ: اللَّهُمَّ اغْفِرْ لِعَبْدِكَ فُلَانٍ فَإِنَّهُ بَاتَ طَاهِرًا",
        text: {
            ru: "Тот, кто будет засыпать с омовением, то в его рубахе заночует ангел, и не пройдёт ни один час в ночи, кроме как ангел будет говорить: «Всевышний, прости ему, ведь он заснул с омовением».",
            en: "Whoever sleeps in a state of ablution, an angel will spend the night in his garment, and at every hour of the night the angel will say: \"O Allah, forgive him, for he slept in a state of ablution.\"",
            uz: "Kim tahorat bilan uxlasa, uning kiyimida farishta tunaydi va tunning har bir soatida farishta: «Ey Alloh, u tahorat bilan uxlagani uchun uni kechir», deydi.",
            de: "Wer mit Waschung schläft, in dessen Gewand übernachtet ein Engel; und zu jeder Stunde der Nacht sagt der Engel: „O Allah, vergib ihm, denn er ist mit Waschung eingeschlafen.“",
            es: "Quien se acuesta en estado de ablución, un ángel pasa la noche en su ropa, y a cada hora de la noche el ángel dice: «¡Oh Allah, perdónale, pues se acostó en estado de ablución!».",
            fr: "Celui qui s'endort en état d'ablution, un ange passe la nuit dans son vêtement, et à chaque heure de la nuit l'ange dit : « Ô Allah, pardonne-lui, car il s'est endormi en état d'ablution ! ».",
            it: "Chi va a dormire in stato di abluzione, un angelo trascorre la notte nella sua veste, e ad ogni ora della notte l'angelo dice: «O Allah, perdonalo, perché si è addormentato in stato di abluzione!».",
            ja: "ウドゥー（小浄）を保ったまま眠る者の衣服には天使が泊まり、夜のどの時刻にも天使はこう言います。「アッラーよ、この者を赦したまえ。ウドゥーをして眠ったのだから」",
            ko: "우두(소정결)를 한 채 잠드는 자의 옷에는 천사가 밤을 지내며, 밤의 어느 시각이든 천사가 말한다. \"알라여, 그는 우두를 하고 잠들었으니 그를 용서하소서.\"",
            zh: "凡身带小净而入睡的人，天使会在他的衣服上过夜；夜间每一个时辰，天使都会说：“主啊，请你赦宥他吧，他是带着小净入睡的。”",
            tr: "Abdestli olarak uyuyan kimsenin elbisesinde bir melek geceler; gecenin her saatinde melek şöyle der: «Allah'ım, abdestli uyuduğu için onu bağışla.»",
            hi: "जो व्यक्ति वुज़ू की हालत में सोता है, उसके वस्त्र में एक फ़रिश्ता रात बिताता है; रात की हर घड़ी में फ़रिश्ता कहता है: «ऐ अल्लाह, उसे माफ़ कर दे, क्योंकि वह वुज़ू के साथ सोया।»",
            id: "Barang siapa tidur dalam keadaan berwudu, maka seorang malaikat bermalam di pakaiannya; setiap saat di malam hari malaikat itu berkata: “Ya Allah, ampunilah dia, karena ia tidur dalam keadaan berwudu.”",
            ms: "Sesiapa yang tidur dalam keadaan berwuduk, maka seorang malaikat bermalam di pakaiannya; pada setiap saat di malam hari malaikat itu berkata: “Ya Allah, ampunilah dia, kerana dia tidur dalam keadaan berwuduk.”",
            th: "ผู้ใดนอนในสภาพที่มีการอาบน้ำละหมาด มีมลาอิกะฮ์ค้างคืนอยู่ในเสื้อผ้าของเขา และในทุกชั่วโมงของกลางคืนมลาอิกะฮ์จะกล่าวว่า “ข้าแต่อัลลอฮ์ ขอทรงอภัยให้เขาด้วย เพราะเขานอนในสภาพที่มีการอาบน้ำละหมาด”"
        },
        source: {
            ru: "Ас-Сильсиля ас-Сахиха, №2539", en: "As-Silsila as-Sahiha, No. 2539", uz: "As-Silsilat as-Sahiha, №2539",
            de: "As-Silsila as-Sahiha, Nr. 2539", es: "As-Silsila as-Sahiha, n.º 2539", fr: "As-Silsila as-Sahiha, n° 2539",
            it: "As-Silsila as-Sahiha, n. 2539", ja: "アッ＝シルシラ・アッ＝サヒーハ 第2539番", ko: "앗-실실라 앗-사히하 2539번",
            zh: "《正确圣训系列》第2539号", tr: "Silsiletü's-Sahiha, No. 2539", hi: "सिलसिला अस-सहीहा, क्रमांक 2539",
            id: "As-Silsilah Ash-Shahihah, no. 2539", ms: "As-Silsilah As-Sahihah, no. 2539", th: "อัส-สิลซิละฮ์ อัศ-เศาะฮีฮะฮ์ หมายเลข 2539"
        }
    },

    {
        arabic: "مَنْ قَالَ: سُبْحَانَ اللهِ وَبِحَمْدِهِ فِي يَوْمٍ مِائَةَ مَرَّةٍ، حُطَّتْ خَطَايَاهُ، وَإِنْ كَانَتْ مِثْلَ زَبَدِ الْبَحْرِ",
        text: {
            ru: "Кто скажет «Субхану-Ллахи ва бихамдихи» сто раз в день, у того грехи будут прощены, даже если они как пена морская.",
            en: "Whoever says \"Subhan Allah wa bihamdihi\" one hundred times a day, his sins will be forgiven even if they were like the foam of the sea.",
            uz: "Kim kuniga yuz marta «Subhanalloh va bihamdihi» desa, gunohlari kechiriladi, garchi ular dengiz ko'pigidek bo'lsa ham.",
            de: "Wer am Tag hundertmal „Subhan Allah wa bihamdihi“ sagt, dem werden seine Sünden vergeben, selbst wenn sie wie der Schaum des Meeres wären.",
            es: "Quien diga cien veces al día «Subḥān Allāh wa bihamdihi», sus pecados serán perdonados, aunque sean como la espuma del mar.",
            fr: "Celui qui dit cent fois par jour « Subhan Allah wa bihamdihi », ses péchés lui seront pardonnés, fussent-ils comme l'écume de la mer.",
            it: "Chi dice cento volte al giorno «Subhan Allah wa bihamdihi», i suoi peccati saranno perdonati, anche se fossero come la schiuma del mare.",
            ja: "一日に百回「スブハーナッラーヒ・ワ・ビハムディヘ（アッラーは清らかなり、その讃美とともに）」と唱える者は、たとえ罪が海の泡のように多くとも、赦される。",
            ko: "하루에 백 번 \"수브하낰라히 와 비함디히\"라고 말하는 자는, 그의 죄가 바다의 거품과 같을지라도 용서받는다.",
            zh: "谁一天说一百遍“赞美真主，并赞颂祂”（Subhān Allāh wa bihamdihi），他的罪过即使如海上的泡沫，也会被勾销。",
            tr: "Her gün yüz defa «Sübhanallahi ve bihamdihi» diyen kimsenin, günahları deniz köpüğü kadar bile olsa bağışlanır.",
            hi: "जो व्यक्ति एक दिन में सौ बार «सुब्हानल्लाहि व बिहम्दिही» कहे, उसके गुनाह माफ़ कर दिए जाते हैं, भले ही वे समुद्र के झाग के बराबर हों।",
            id: "Barang siapa membaca “Subhanallah wa bihamdihi” seratus kali dalam sehari, dosa-dosanya diampuni walaupun sebanyak buih di lautan.",
            ms: "Sesiapa yang membaca “Subhanallahi wa bihamdihi” seratus kali dalam sehari, dosanya diampunkan walaupun sebanyak buih di laut.",
            th: "ผู้ใดกล่าว «ซุบหานัลลอฮิ วะบิฮัมดิฮ์» วันละหนึ่งร้อยครั้ง บาปของเขาจะถูกลบล้าง แม้จะมากเท่าฟองคลื่นในทะเล"
        },
        source: {
            ru: "Аль-Бухари, №6405", en: "Al-Bukhari, No. 6405", uz: "Buxoriy, №6405",
            de: "Buchari, Nr. 6405", es: "Bujari, n.º 6405", fr: "Bukhari, n° 6405",
            it: "Bukhari, n. 6405", ja: "ブハーリー 第6405番", ko: "부하리 6405번",
            zh: "布哈里，第6405号", tr: "Buhârî, No. 6405", hi: "बुख़ारी, क्रमांक 6405",
            id: "Bukhari, no. 6405", ms: "Bukhari, no. 6405", th: "บุคอรี หมายเลข 6405"
        }
    },

    {
        arabic: "قَالَ اللَّهُ: إِذَا أَرَادَ عَبْدِي أَنْ يَعْمَلَ سَيِّئَةً فَلَا تَكْتُبُوهَا عَلَيْهِ، فَإِنْ عَمِلَهَا فَاكْتُبُوهَا بِمِثْلِهَا، وَإِنْ تَرَكَهَا مِنْ أَجْلِي فَاكْتُبُوهَا لَهُ حَسَنَةً",
        text: {
            ru: "Аллах сказал: «Если Мой раб задумал совершить грех, не записывайте его на него. Если совершит — запишите один такой же грех. А если оставит его ради Меня — запишите ему благо».",
            en: "Allah says: \"If My servant intends to commit an evil deed, do not record it against him. If he does it, record it as one like it. But if he refrains from it for My sake, record it for him as a good deed.\"",
            uz: "Alloh aytadi: «Bandam yomonlik qilishni niyat qilsa, uni unga yozmanglar. Agar qilsa, unga shunga o'xshash bittasini yozinglar. Agar Mening roziligim uchun tark etsa, unga savob sifatida yozinglar».",
            de: "Allah spricht: „Wenn Mein Diener die Absicht hat, eine böse Tat zu begehen, so schreibt sie ihm nicht auf. Tut er sie, schreibt sie ihm als eine gleiche auf. Verzichtet er aber um Meinetwillen darauf, so schreibt sie ihm als gute Tat auf.“",
            es: "Dice Allah: «Si Mi siervo tiene la intención de cometer un mal, no se lo anotéis. Si lo comete, anotadle una falta igual. Pero si lo abandona por Mí, anotadle una buena acción».",
            fr: "Allah dit : « Si Mon serviteur a l'intention de commettre une mauvaise action, ne la lui inscrivez pas. S'il la commet, inscrivez-la comme une seule mauvaise action semblable. S'il y renonce pour Moi, inscrivez-la-lui comme une bonne action. »",
            it: "Allah dice: «Se il Mio servo ha l'intenzione di compiere un male, non glielo scrivete. Se lo compie, scrivetene uno solo uguale. Ma se vi rinuncia per amor Mio, scrivetelo come un bene».",
            ja: "アッラーは仰せられる。「わが僕が悪事を行おうと意図しても、それを記録してはならない。もし行えば、同じ一つの悪事として記録せよ。しかし、わがために止めたならば、それを善行として記録せよ。」",
            ko: "알라께서 말씀하셨다. \"내 종이 악한 일을 하려고 마음먹으면 그에게 기록하지 말라. 만약 그가 행하면 같은 하나의 죄로 기록하라. 그러나 나를 위해 그것을 버리면 그를 위한 선행으로 기록하라.\"",
            zh: "真主说：“如果我的仆人打算做恶事，你们不要记录他的罪过；如果他做了，就按一件记录；如果他为了我而放弃，就为他记录一件善功。”",
            tr: "Allah şöyle buyurur: «Kulum bir kötülük yapmaya niyetlenirse, onu ona yazmayın. Eğer yaparsa, bir benzeri olarak yazın. Ama Benim için bırakırsa, onu ona bir iyilik olarak yazın.»",
            hi: "अल्लाह फ़रमाता है: «यदि मेरा बंदा कोई बुरा काम करने का इरादा करे, तो उसे उसके नाम न लिखो। यदि वह उसे करे, तो उसके बराबर एक ही लिखो। किंतु यदि वह मेरी ख़ातिर उसे छोड़ दे, तो उसके लिए उसे एक नेकी लिखो।»",
            id: "Allah berfirman: “Jika hamba-Ku berniat melakukan keburukan, janganlah kalian catat keburukan itu atasnya. Jika ia melakukannya, catatlah satu keburukan yang semisal. Namun jika ia meninggalkannya karena Aku, catatlah baginya satu kebaikan.”",
            ms: "Allah berfirman: “Jika hamba-Ku berniat melakukan kejahatan, janganlah kamu catatkan kejahatan itu ke atasnya. Jika dia melakukannya, catatlah satu kejahatan yang sama. Jika dia meninggalkannya kerana Aku, catatlah baginya satu kebaikan.”",
            th: "อัลลอฮ์ตรัสว่า “หากบ่าวของข้าตั้งใจจะทำความชั่ว ก็อย่าบันทึกมันไว้แก่เขา หากเขาทำมัน ก็จงบันทึกไว้เท่าเดิมหนึ่งครั้ง แต่หากเขาละมันไว้เพื่อข้า ก็จงบันทึกให้เขาเป็นความดีหนึ่งครั้ง”"
        },
        source: {
            ru: "Аль-Бухари, №7501", en: "Al-Bukhari, No. 7501", uz: "Buxoriy, №7501",
            de: "Buchari, Nr. 7501", es: "Bujari, n.º 7501", fr: "Bukhari, n° 7501",
            it: "Bukhari, n. 7501", ja: "ブハーリー 第7501番", ko: "부하리 7501번",
            zh: "布哈里，第7501号", tr: "Buhârî, No. 7501", hi: "बुख़ारी, क्रमांक 7501",
            id: "Bukhari, no. 7501", ms: "Bukhari, no. 7501", th: "บุคอรี หมายเลข 7501"
        }
    }

    // ── Добавляй новые хадисы ЗДЕСЬ, выше этой строки ──
    // Не забудь запятую после предыдущего хадиса!
];
