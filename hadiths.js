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
    }

    // ── Добавляй новые хадисы ЗДЕСЬ, выше этой строки ──
    // Не забудь запятую после предыдущего хадиса!
];
