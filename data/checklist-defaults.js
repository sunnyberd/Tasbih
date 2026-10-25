// Azkar — стандартные папки и задачи раздела «Задачи» (на всех языках).
// Загружается ЛЕНИВО: только при первом запуске (создание списка «Ежедневные»),
// при удалении последнего списка и один раз после обновления данных
// (дозаполнение переводов). После правок повысь DATA_VERSION в index.html.
window.AZKAR_CL_DEFAULT_FOLDERS = [
        {
                "names": {
                        "ru": "Ежедневные",
                        "en": "Daily",
                        "uz": "Kunlik",
                        "de": "Täglich",
                        "es": "Diario",
                        "fr": "Quotidien",
                        "it": "Quotidiano",
                        "ja": "毎日",
                        "ko": "매일",
                        "zh": "每日",
                        "tr": "Günlük",
                        "hi": "दैनिक",
                        "ms": "Harian",
                        "id": "Harian",
                        "th": "รายวัน"
                },
                "subfolders": [],
                "tasks": [
                        {
                                "names": {
                                        "ru": "Прочитать Коран (минимум 10 минут)",
                                        "en": "Read Qur'an (at least 10 minutes)",
                                        "uz": "Qur'on o'qish (kamida 10 daqiqa)",
                                        "de": "Qur'an lesen (mindestens 10 Minuten)",
                                        "es": "Leer el Corán (al menos 10 minutos)",
                                        "fr": "Lire le Coran (au moins 10 minutes)",
                                        "it": "Leggere il Corano (almeno 10 minuti)",
                                        "ja": "クルアーンを読む（最低10分）",
                                        "ko": "꾸란 읽기 (최소 10분)",
                                        "zh": "诵读《古兰经》（至少10分钟）",
                                        "tr": "Kur'an oku (en az 10 dakika)",
                                        "hi": "क़ुरआन पढ़ें (कम से कम 10 मिनट)",
                                        "ms": "Baca al-Quran (sekurang-kurangnya 10 minit)",
                                        "id": "Baca al-Quran (minimal 10 menit)",
                                        "th": "อ่านอัลกุรอาน (อย่างน้อย 10 นาที)"
                                },
                                "done": false
                        },
                        {
                                "names": {
                                        "ru": "Прочитать суру Аль-Мульк перед сном",
                                        "en": "Recite Surah Al-Mulk before sleep",
                                        "uz": "Uxlashdan oldin Mulk surasini o'qish",
                                        "de": "Sure Al-Mulk vor dem Schlafen rezitieren",
                                        "es": "Recitar Sura Al-Mulk antes de dormir",
                                        "fr": "Réciter la sourate Al-Mulk avant de dormir",
                                        "it": "Recitare Sura Al-Mulk prima di dormire",
                                        "ja": "就寝前にスーラ・アル＝ムルクを読む",
                                        "ko": "잠자기 전에 알 물크 장 암송하기",
                                        "zh": "睡前诵读《国权章》",
                                        "tr": "Uyumadan önce Mülk sûresini oku",
                                        "hi": "सोने से पहले सूरह अल-मुल्क पढ़ें",
                                        "ms": "Baca Surah Al-Mulk sebelum tidur",
                                        "id": "Baca Surah Al-Mulk sebelum tidur",
                                        "th": "อ่านซูเราะฮ์อัลมุลก์ก่อนนอน"
                                },
                                "done": false
                        },
                        {
                                "names": {
                                        "ru": "Прочитать аят аль-Курси перед сном",
                                        "en": "Recite Ayat al-Kursi before sleep",
                                        "uz": "Uxlashdan oldin Oyat al-Kursini o'qish",
                                        "de": "Ayat al-Kursi vor dem Schlafen rezitieren",
                                        "es": "Recitar Ayat al-Kursi antes de dormir",
                                        "fr": "Réciter Ayat al-Kursi avant de dormir",
                                        "it": "Recitare Ayat al-Kursi prima di dormire",
                                        "ja": "就寝前にアーヤトゥル・クルシーを読む",
                                        "ko": "잠자기 전 아야트 알 쿠르시 암송하기",
                                        "zh": "睡前诵读《宝座节》",
                                        "tr": "Uyumadan önce Ayetü'l-Kürsî'yi oku",
                                        "hi": "सोने से पहले आयतुल-कुर्सी पढ़ें",
                                        "ms": "Baca Ayat al-Kursi sebelum tidur",
                                        "id": "Baca Ayat al-Kursi sebelum tidur",
                                        "th": "อ่านอายะตุลกุรซีย์ก่อนนอน"
                                },
                                "done": false
                        },
                        {
                                "names": {
                                        "ru": "Прочитать «Аль-Ихлас», «Аль-Фалак» и «Ан-Нас» (3 раза перед сном)",
                                        "en": "Recite Al-Ikhlas, Al-Falaq and An-Nas (3 times before sleep)",
                                        "uz": "«Al-Ixlos», «Al-Falaq» va «An-Nos» suralarini o'qish (uxlashdan oldin 3 marta)",
                                        "de": "Al-Ikhlas, Al-Falaq und An-Nas (3-mal vor dem Schlafen) rezitieren",
                                        "es": "Recitar Al-Ijlas, Al-Falaq y An-Nas (3 veces antes de dormir)",
                                        "fr": "Réciter Al-Ikhlas, Al-Falaq et An-Nas (3 fois avant de dormir)",
                                        "it": "Recitare Al-Ikhlas, Al-Falaq e An-Nas (3 volte prima di dormire)",
                                        "ja": "就寝前にアル＝イフラース、アル＝ファラク、アン＝ナースを3回読む",
                                        "ko": "잠자기 전에 알 이클라스, 알 팔라크, 안 나스를 3번 암송",
                                        "zh": "睡前诵读《忠诚章》《破晓章》《世人章》各3次",
                                        "tr": "Uyumadan önce İhlas, Felak ve Nas'ı oku (3 kez)",
                                        "hi": "सोने से पहले अल-इख़लास, अल-फ़लक़ और अन-नास पढ़ें (3 बार)",
                                        "ms": "Baca Al-Ikhlas, Al-Falaq dan An-Nas (3 kali sebelum tidur)",
                                        "id": "Baca Al-Ikhlas, Al-Falaq dan An-Nas (3 kali sebelum tidur)",
                                        "th": "อ่านอัลอิคลาศ อัลฟะลัก และอันนาส (3 ครั้งก่อนนอน)"
                                },
                                "done": false
                        },
                        {
                                "names": {
                                        "ru": "Совершить вуду перед сном",
                                        "en": "Perform wudu before going to sleep",
                                        "uz": "Uxlashdan oldin tahorat olish",
                                        "de": "Wudu vor dem Schlafengehen vollziehen",
                                        "es": "Hacer wudu antes de dormir",
                                        "fr": "Faire les ablutions avant de dormir",
                                        "it": "Fare il wudu prima di dormire",
                                        "ja": "就寝前にウドゥーを行う",
                                        "ko": "잠들기 전 우두 행하기",
                                        "zh": "睡前做小净（伍杜）",
                                        "tr": "Uyumadan önce abdest al",
                                        "hi": "सोने से पहले वुज़ू करें",
                                        "ms": "Ambil wuduk sebelum tidur",
                                        "id": "Berwudu sebelum tidur",
                                        "th": "อาบน้ำละหมาดก่อนนอน"
                                },
                                "done": false
                        }
                ]
        },
        {
                "names": {
                        "ru": "Добрые дела",
                        "en": "Good deeds",
                        "uz": "Yaxshi amallar",
                        "de": "Gute Taten",
                        "es": "Buenas obras",
                        "fr": "Bonnes actions",
                        "it": "Buone azioni",
                        "ja": "善行",
                        "ko": "선행",
                        "zh": "善行",
                        "tr": "İyi ameller",
                        "hi": "अच्छे कर्म",
                        "ms": "Amalan baik",
                        "id": "Amal baik",
                        "th": "ความดี"
                },
                "subfolders": [],
                "tasks": [
                        {
                                "names": {
                                        "ru": "Дать садака",
                                        "en": "Give sadaqa (charity)",
                                        "uz": "Sadaqa berish",
                                        "de": "Sadaqa (Wohltätigkeit) geben",
                                        "es": "Dar sadaqa (caridad)",
                                        "fr": "Donner la sadaqa (aumône)",
                                        "it": "Dare la sadaqa (carità)",
                                        "ja": "サダカ（喜捨）をする",
                                        "ko": "사다카 (자선) 베풀기",
                                        "zh": "施舍（萨达卡）",
                                        "tr": "Sadaka ver",
                                        "hi": "सदक़ा दें (दान)",
                                        "ms": "Beri sedekah",
                                        "id": "Bersedekah",
                                        "th": "บริจาคทาน (เศาะดะเกาะฮ์)"
                                },
                                "done": false
                        },
                        {
                                "names": {
                                        "ru": "Помочь родителям или семье",
                                        "en": "Help your parents or family",
                                        "uz": "Ota-onangiz yoki oilangizga yordam berish",
                                        "de": "Den Eltern oder der Familie helfen",
                                        "es": "Ayudar a tus padres o familia",
                                        "fr": "Aider tes parents ou ta famille",
                                        "it": "Aiutare i genitori o la famiglia",
                                        "ja": "両親や家族を助ける",
                                        "ko": "부모님이나 가족 돕기",
                                        "zh": "帮助父母或家人",
                                        "tr": "Anne babana veya ailene yardım et",
                                        "hi": "अपने माता-पिता या परिवार की मदद करें",
                                        "ms": "Bantu ibu bapa atau keluarga",
                                        "id": "Bantu orang tua atau keluarga",
                                        "th": "ช่วยเหลือพ่อแม่หรือครอบครัว"
                                },
                                "done": false
                        },
                        {
                                "names": {
                                        "ru": "Сделать дуа за родителей и семью",
                                        "en": "Make du'a for your parents and family",
                                        "uz": "Ota-ona va oila uchun duo qilish",
                                        "de": "Bittgebet für Eltern und Familie sprechen",
                                        "es": "Hacer du'a por tus padres y familia",
                                        "fr": "Faire une dou'a pour tes parents et ta famille",
                                        "it": "Fare du'a per i genitori e la famiglia",
                                        "ja": "両親と家族のためにドゥアーをする",
                                        "ko": "부모님과 가족을 위해 두아 드리기",
                                        "zh": "为父母和家人作杜瓦（祈祷）",
                                        "tr": "Anne baban ve ailen için dua et",
                                        "hi": "अपने माता-पिता और परिवार के लिए दुआ करें",
                                        "ms": "Berdoa untuk ibu bapa dan keluarga",
                                        "id": "Berdoa untuk orang tua dan keluarga",
                                        "th": "ขอดุอาอ์ให้พ่อแม่และครอบครัว"
                                },
                                "done": false
                        },
                        {
                                "names": {
                                        "ru": "Улыбнуться брату/сестре по вере (улыбка — садака)",
                                        "en": "Smile at a fellow Muslim (a smile is sadaqa)",
                                        "uz": "Din qardoshingizga tabassum qilish (tabassum — sadaqa)",
                                        "de": "Einen Glaubensbruder/-schwester anlächeln (ein Lächeln ist Sadaqa)",
                                        "es": "Sonreír a un hermano o hermana en la fe (la sonrisa es sadaqa)",
                                        "fr": "Sourire à un frère ou une sœur en la foi (le sourire est une sadaqa)",
                                        "it": "Sorridere a un fratello o sorella nella fede (un sorriso è sadaqa)",
                                        "ja": "同じ信仰の兄弟姉妹に微笑む（微笑みもサダカ）",
                                        "ko": "신앙의 형제자매에게 미소짓기 (미소도 사다카)",
                                        "zh": "对教中兄弟姐妹微笑（微笑也是施舍）",
                                        "tr": "Bir Müslüman kardeşine gülümse (gülümseme sadakadır)",
                                        "hi": "किसी मुसलमान भाई को मुस्कुराएँ (मुस्कान सदक़ा है)",
                                        "ms": "Senyum kepada saudara Muslim (senyuman ialah sedekah)",
                                        "id": "Tersenyum kepada saudara Muslim (senyum adalah sedekah)",
                                        "th": "ยิ้มให้พี่น้องมุสลิม (รอยยิ้มคือทาน)"
                                },
                                "done": false
                        },
                        {
                                "names": {
                                        "ru": "Покормить или напоить животное/птицу",
                                        "en": "Feed or give water to an animal or bird",
                                        "uz": "Hayvon yoki qushni boqish yoki suv berish",
                                        "de": "Ein Tier oder einen Vogel füttern oder tränken",
                                        "es": "Alimentar o dar de beber a un animal o ave",
                                        "fr": "Nourrir ou abreuver un animal ou un oiseau",
                                        "it": "Dare cibo o acqua a un animale o uccello",
                                        "ja": "動物や鳥に餌や水を与える",
                                        "ko": "동물이나 새에게 먹이나 물 주기",
                                        "zh": "给动物或鸟喂食或饮水",
                                        "tr": "Bir hayvanı veya kuşu besle ya da sula",
                                        "hi": "किसी जानवर या पक्षी को खाना या पानी दें",
                                        "ms": "Beri makan atau minum kepada haiwan atau burung",
                                        "id": "Beri makan atau minum hewan atau burung",
                                        "th": "ให้อาหารหรือน้ำแก่สัตว์หรือนก"
                                },
                                "done": false
                        }
                ]
        },
        {
                "names": {
                        "ru": "Духовный рост",
                        "en": "Spiritual growth",
                        "uz": "Ma'naviy o'sish",
                        "de": "Spirituelles Wachstum",
                        "es": "Crecimiento espiritual",
                        "fr": "Croissance spirituelle",
                        "it": "Crescita spirituale",
                        "ja": "精神的成長",
                        "ko": "영적 성장",
                        "zh": "精神成长",
                        "tr": "Manevi gelişim",
                        "hi": "आध्यात्मिक विकास",
                        "ms": "Perkembangan rohani",
                        "id": "Pertumbuhan rohani",
                        "th": "การเติบโตทางจิตวิญญาณ"
                },
                "subfolders": [],
                "tasks": [
                        {
                                "names": {
                                        "ru": "Совершить тахаджуд (ночной намаз)",
                                        "en": "Pray Tahajjud (night prayer)",
                                        "uz": "Tahajjud namozini (kechki nafl namozi) o'qish",
                                        "de": "Tahajjud (Nachtgebet) verrichten",
                                        "es": "Rezar el Tahajjud (oración nocturna)",
                                        "fr": "Accomplir le Tahajjud (prière nocturne)",
                                        "it": "Pregare il Tahajjud (preghiera notturna)",
                                        "ja": "タハッジュド（夜の礼拝）を行う",
                                        "ko": "타하주드 (밤 예배) 드리기",
                                        "zh": "进行塔哈朱德（夜间礼拜）",
                                        "tr": "Teheccüd namazı kıl (gece namazı)",
                                        "hi": "तहज्जुद पढ़ें (रात की नमाज़)",
                                        "ms": "Solat Tahajjud (solat malam)",
                                        "id": "Salat Tahajud (salat malam)",
                                        "th": "ละหมาดตะฮัจญุด (ละหมาดกลางคืน)"
                                },
                                "done": false
                        },
                        {
                                "names": {
                                        "ru": "Соблюсти добровольный пост (нафль)",
                                        "en": "Observe a voluntary fast (nafl)",
                                        "uz": "Ixtiyoriy ro'za (nafl) tutish",
                                        "de": "Freiwilliges Fasten (Nafl) einhalten",
                                        "es": "Observar un ayuno voluntario (nafl)",
                                        "fr": "Observer un jeûne surérogatoire (nafl)",
                                        "it": "Osservare un digiuno volontario (nafl)",
                                        "ja": "自発的な断食（ナフル）を行う",
                                        "ko": "자발적 단식(나플) 지키기",
                                        "zh": "保持自愿斋戒（拿夫里）",
                                        "tr": "Nafile oruç tut",
                                        "hi": "नफ़्ल रोज़ा रखें",
                                        "ms": "Berpuasa sunat (nafl)",
                                        "id": "Berpuasa sunah (nafl)",
                                        "th": "ถือศีลอดสุนัต (นัฟล์)"
                                },
                                "done": false
                        },
                        {
                                "names": {
                                        "ru": "Поразмышлять над одним аятом Корана",
                                        "en": "Reflect on one verse of the Qur'an",
                                        "uz": "Qur'ondan bir oyat haqida tafakkur qilish",
                                        "de": "Über einen Vers des Qur'an nachdenken",
                                        "es": "Reflexionar sobre un versículo del Corán",
                                        "fr": "Méditer sur un verset du Coran",
                                        "it": "Riflettere su un versetto del Corano",
                                        "ja": "クルアーンの一節について熟考する",
                                        "ko": "꾸란의 한 구절에 대해 묵상하기",
                                        "zh": "思考《古兰经》中的一节经文",
                                        "tr": "Kur'an'dan bir âyet üzerinde düşün",
                                        "hi": "क़ुरआन की एक आयत पर विचार करें",
                                        "ms": "Renungkan satu ayat al-Quran",
                                        "id": "Renungkan satu ayat al-Quran",
                                        "th": "ใคร่ครวญอายะฮ์หนึ่งของอัลกุรอาน"
                                },
                                "done": false
                        },
                        {
                                "names": {
                                        "ru": "Послушать лекцию или хадис (не менее 10 минут)",
                                        "en": "Listen to a lecture or hadith (at least 10 minutes)",
                                        "uz": "Ma'ruza yoki hadis tinglash (kamida 10 daqiqa)",
                                        "de": "Einen Vortrag oder Hadith anhören (mindestens 10 Minuten)",
                                        "es": "Escuchar una charla o hadiz (al menos 10 minutos)",
                                        "fr": "Écouter un cours ou un hadith (au moins 10 minutes)",
                                        "it": "Ascoltare una lezione o un hadith (almeno 10 minuti)",
                                        "ja": "講話やハディースを聴く（最低10分）",
                                        "ko": "강의나 하디스 듣기 (최소 10분)",
                                        "zh": "聆听讲座或圣训（至少10分钟）",
                                        "tr": "Bir ders veya hadis dinle (en az 10 dakika)",
                                        "hi": "कोई व्याख्यान या हदीस सुनें (कम से कम 10 मिनट)",
                                        "ms": "Dengar ceramah atau hadis (sekurang-kurangnya 10 minit)",
                                        "id": "Dengarkan ceramah atau hadis (minimal 10 menit)",
                                        "th": "ฟังการบรรยายหรือหะดีษ (อย่างน้อย 10 นาที)"
                                },
                                "done": false
                        },
                        {
                                "names": {
                                        "ru": "Сдержать гнев и промолчать в споре",
                                        "en": "Hold back anger and stay silent in an argument",
                                        "uz": "G'azabni jilovlash va bahsda jim turish",
                                        "de": "Den Zorn zurückhalten und im Streit schweigen",
                                        "es": "Contener la ira y callar en una discusión",
                                        "fr": "Maîtriser sa colère et garder le silence dans une dispute",
                                        "it": "Trattenere la rabbia e tacere in una discussione",
                                        "ja": "怒りを抑え、口論で沈黙を守る",
                                        "ko": "분노를 참고 다툼에서 침묵하기",
                                        "zh": "克制愤怒，在争论中保持沉默",
                                        "tr": "Öfkeni tut ve tartışmada sus",
                                        "hi": "क्रोध को रोकें और बहस में चुप रहें",
                                        "ms": "Tahan marah dan diam dalam pertengkaran",
                                        "id": "Tahan amarah dan diam saat berdebat",
                                        "th": "ระงับความโกรธและเงียบในการโต้เถียง"
                                },
                                "done": false
                        }
                ]
        },
        {
                "names": {
                        "ru": "Утренние и вечерние зикры",
                        "en": "Morning & evening adhkar",
                        "uz": "Ertalabki va kechki zikrlar",
                        "de": "Morgen- und Abend-Adhkar",
                        "es": "Adhkar de la mañana y la tarde",
                        "fr": "Adhkar du matin et du soir",
                        "it": "Adhkar del mattino e della sera",
                        "ja": "朝と夕の祈り（アズカール）",
                        "ko": "아침과 저녁의 아드카르",
                        "zh": "晨昏念诵（阿兹卡）",
                        "tr": "Sabah ve akşam zikirleri",
                        "hi": "सुबह-शाम के अज़कार",
                        "ms": "Zikir pagi & petang",
                        "id": "Zikir pagi & petang",
                        "th": "อัซการ์เช้าและเย็น"
                },
                "subfolders": [],
                "tasks": [
                        {
                                "names": {
                                        "ru": "Сайидул Истигфар — утром и вечером",
                                        "en": "Sayyid al-Istighfar — morning and evening",
                                        "uz": "Sayyidul Istig'for — ertalab va kechqurun",
                                        "de": "Sayyid al-Istighfar — morgens und abends",
                                        "es": "Sayyid al-Istighfar — mañana y tarde",
                                        "fr": "Sayyid al-Istighfar — matin et soir",
                                        "it": "Sayyid al-Istighfar — mattina e sera",
                                        "ja": "サイイドル・イスティグファール — 朝と夕",
                                        "ko": "사이이드 알 이스티그파르 — 아침과 저녁",
                                        "zh": "赛义德·伊斯提格法尔 — 晨昏诵念",
                                        "tr": "Seyyidü'l-İstiğfar — sabah ve akşam",
                                        "hi": "सय्यिदुल-इस्तिग़फ़ार — सुबह और शाम",
                                        "ms": "Sayyid al-Istighfar — pagi dan petang",
                                        "id": "Sayyidul-Istigfar — pagi dan petang",
                                        "th": "สัยยิดุลอิสติฆฟาร — เช้าและเย็น"
                                },
                                "done": false
                        },
                        {
                                "names": {
                                        "ru": "Зикр Абу Умамы (от тревог и долгов) — утром и вечером",
                                        "en": "Du'a of Abu Umamah (against worry and debt) — morning and evening",
                                        "uz": "Abu Umoma duosi (g'am va qarzdan) — ertalab va kechqurun",
                                        "de": "Bittgebet von Abu Umamah (gegen Sorgen und Schulden) — morgens und abends",
                                        "es": "Du'a de Abu Umamah (contra la preocupación y la deuda) — mañana y tarde",
                                        "fr": "Dou'a d'Abou Oumamah (contre l'angoisse et les dettes) — matin et soir",
                                        "it": "Du'a di Abu Umamah (contro l'ansia e i debiti) — mattina e sera",
                                        "ja": "アブー・ウマーマのドゥアー（不安と借金からの保護） — 朝と夕",
                                        "ko": "아부 우마마의 두아 (근심과 빚으로부터) — 아침과 저녁",
                                        "zh": "艾布·吴马麦的杜阿（脱离忧愁与债务） — 晨昏诵念",
                                        "tr": "Ebû Ümâme'nin duası (kaygı ve borca karşı) — sabah ve akşam",
                                        "hi": "अबू उमामा की दुआ (चिंता और क़र्ज़ के विरुद्ध) — सुबह और शाम",
                                        "ms": "Doa Abu Umamah (terhadap kebimbangan dan hutang) — pagi dan petang",
                                        "id": "Doa Abu Umamah (melawan kecemasan dan utang) — pagi dan petang",
                                        "th": "ดุอาอ์ของอบูอุมามะฮ์ (แก้ความกังวลและหนี้สิน) — เช้าและเย็น"
                                },
                                "done": false
                        },
                        {
                                "names": {
                                        "ru": "«Бисмилляхи лязи ля ядурру…» (3 раза утром и вечером — защита)",
                                        "en": "\"Bismillahi lladhi la yadurru...\" (3 times morning and evening — protection)",
                                        "uz": "«Bismillahil-laziy la yadurru…» (ertalab va kechqurun 3 marta — himoya)",
                                        "de": "„Bismillahi lladhi la yadurru…“ (3-mal morgens und abends — Schutz)",
                                        "es": "«Bismillahi lladhi la yadurru…» (3 veces mañana y tarde — protección)",
                                        "fr": "« Bismillahi lladhi la yadurru… » (3 fois matin et soir — protection)",
                                        "it": "«Bismillahi lladhi la yadurru…» (3 volte mattina e sera — protezione)",
                                        "ja": "「ビスミッラー・ッラズィー・ラー・ヤドゥッル…」（朝夕3回 — 守護）",
                                        "ko": "«비스밀라힐 라지 라 야두루…» (아침저녁 3번 — 보호)",
                                        "zh": "\"奉以其名万物无害的安拉之名…\"（晨昏各3次 — 求护佑）",
                                        "tr": "\"Bismillâhi'llezî lâ yedurru...\" (sabah ve akşam 3 kez — koruma)",
                                        "hi": "\"बिस्मिल्लाहिल्लज़ी ला यदुर्रु...\" (सुबह-शाम 3 बार — सुरक्षा)",
                                        "ms": "\"Bismillahilladhi la yadurru...\" (3 kali pagi dan petang — perlindungan)",
                                        "id": "\"Bismillahilladzi la yadurru...\" (3 kali pagi dan petang — perlindungan)",
                                        "th": "\"บิสมิลลาฮิลละซี ลายะฎุรรุ...\" (3 ครั้งเช้าและเย็น — การคุ้มครอง)"
                                },
                                "done": false
                        },
                        {
                                "names": {
                                        "ru": "«Хасбияллаху ля иляха илля Хува» (7 раз утром и вечером)",
                                        "en": "\"Hasbiyallahu la ilaha illa Huwa\" (7 times morning and evening)",
                                        "uz": "«Hasbiyallohu la ilaha illa Huva» (ertalab va kechqurun 7 marta)",
                                        "de": "„Hasbiyallahu la ilaha illa Huwa“ (7-mal morgens und abends)",
                                        "es": "«Hasbiyallahu la ilaha illa Huwa» (7 veces mañana y tarde)",
                                        "fr": "« Hasbiyallahou la ilaha illa Houwa » (7 fois matin et soir)",
                                        "it": "«Hasbiyallahu la ilaha illa Huwa» (7 volte mattina e sera)",
                                        "ja": "「ハスビヤッラーフ・ラー・イラーハ・イッラー・フワ」（朝夕7回）",
                                        "ko": "«하스비얄라후 라 일라하 일라 후와» (아침저녁 7번)",
                                        "zh": "\"哈斯比安拉胡，万物非主，唯有他\"（晨昏各7次）",
                                        "tr": "\"Hasbiyallâhu lâ ilâhe illâ Hû\" (sabah ve akşam 7 kez)",
                                        "hi": "\"हस्बियल्लाहु ला इलाहा इल्ला हुव\" (सुबह-शाम 7 बार)",
                                        "ms": "\"Hasbiyallahu la ilaha illa Huwa\" (7 kali pagi dan petang)",
                                        "id": "\"Hasbiyallahu la ilaha illa Huwa\" (7 kali pagi dan petang)",
                                        "th": "\"หัสบิยัลลอฮุ ลาอิลาฮะอิลลาฮุวะ\" (7 ครั้งเช้าและเย็น)"
                                },
                                "done": false
                        },
                        {
                                "names": {
                                        "ru": "«А'узу би калимятилляхит-таммати мин шарри ма халяк» (3 раза вечером)",
                                        "en": "\"A'udhu bi-kalimatillahi t-tammati min sharri ma khalaq\" (3 times in the evening)",
                                        "uz": "«A'uzu bi-kalimatillahit-tammati min sharri ma xalaq» (kechqurun 3 marta)",
                                        "de": "„A'udhu bi-kalimatillahi t-tammati min sharri ma khalaq“ (3-mal abends)",
                                        "es": "«A'udhu bi-kalimatillahi t-tammati min sharri ma khalaq» (3 veces por la tarde)",
                                        "fr": "« A'oudhou bi-kalimatillahi t-tammati min charri ma khalaq » (3 fois le soir)",
                                        "it": "«A'udhu bi-kalimatillahi t-tammati min sharri ma khalaq» (3 volte la sera)",
                                        "ja": "「アウーズ・ビ・カリマーティッラーヒッ＝ターンマ…」（夕方3回）",
                                        "ko": "«아우주 비 칼리마틸라힛 탐마티 민 샤르리 마 칼라크» (저녁 3번)",
                                        "zh": "\"我借安拉至善的言辞，求免于他所造之物的恶\"（夜晚3次）",
                                        "tr": "\"Eûzü bi-kelimâtillâhi't-tâmmâti min şerri mâ halak\" (akşam 3 kez)",
                                        "hi": "\"अऊज़ु बि-कलिमातिल्लाहित-ताम्माति मिन शर्रि मा ख़लक़\" (शाम को 3 बार)",
                                        "ms": "\"A'udhu bi-kalimatillahi t-tammati min sharri ma khalaq\" (3 kali pada waktu petang)",
                                        "id": "\"A'udzu bi-kalimatillahi t-tammati min syarri ma khalaq\" (3 kali pada waktu petang)",
                                        "th": "\"อะอูซุ บิกะลิมาติลลาฮิตตามมาติ มินชัรริ มาเคาะลัก\" (3 ครั้งในเวลาเย็น)"
                                },
                                "done": false
                        }
                ]
        }
];
