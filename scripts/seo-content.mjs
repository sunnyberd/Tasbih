export const LANGUAGE_CODES = Object.freeze([
  'en','de','es','fr','it','ja','ko','ru','uz','zh','tr','hi','id','ms','th'
]);

export const LANGUAGE_NAMES = Object.freeze({
  en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français', it: 'Italiano',
  ja: '日本語', ko: '한국어', ru: 'Русский', uz: "O‘zbekcha", zh: '简体中文',
  tr: 'Türkçe', hi: 'हिन्दी', id: 'Bahasa Indonesia', ms: 'Bahasa Melayu', th: 'ไทย'
});

export const SEO_CONTENT = Object.freeze({
  en: {
    locale: 'en_US', title: 'Azkar — Dhikr, Tasbih Counter & Duas',
    description: 'Azkar is a free multilingual dhikr and tasbih counter with duas, the 99 Names of Allah, goals, reminders and statistics. Use it online or offline.',
    h1: 'Free dhikr and digital tasbih counter',
    intro: 'Azkar helps you count daily dhikr, keep personal duas, learn the 99 Names of Allah and follow your goals. Install the web app on your phone or use it directly in any modern browser.',
    featuresTitle: 'Everything for your daily dhikr',
    features: ['Simple tasbih counter with custom goals', 'Personal duas and special dhikr lists', 'The 99 Names of Allah', 'Reminders, streaks and useful statistics', 'Offline use with optional Google account synchronization'],
    stepsTitle: 'How to use Azkar', steps: ['Open Azkar in your browser.', 'Choose a goal or create your own dhikr.', 'Tap to count and review your progress.'],
    faqTitle: 'Frequently asked questions', faq: [
      { question: 'Is Azkar free?', answer: 'Yes. Azkar is a free web application and its main features can be used without payment.' },
      { question: 'Can I use it offline?', answer: 'Yes. After the first visit, core counting and saved content remain available without an internet connection.' },
      { question: 'Can I use the same data on another device?', answer: 'Optional Google account synchronization can transfer supported data between devices. Changes may need time or a connection to appear.' }
    ], cta: 'Open Azkar', languageLabel: 'Choose language', footer: 'Azkar — a calm companion for daily remembrance.'
  },
  de: {
    locale: 'de_DE', title: 'Azkar — Dhikr, Tasbih-Zähler & Duas',
    description: 'Azkar ist ein kostenloser mehrsprachiger Dhikr- und Tasbih-Zähler mit Duas, den 99 Namen Allahs, Zielen, Erinnerungen und Statistiken.',
    h1: 'Kostenloser Dhikr- und digitaler Tasbih-Zähler',
    intro: 'Azkar hilft dir, den täglichen Dhikr zu zählen, persönliche Duas zu speichern, die 99 Namen Allahs zu lernen und deine Ziele zu verfolgen. Nutze die Web-App direkt im Browser oder installiere sie auf deinem Smartphone.',
    featuresTitle: 'Alles für deinen täglichen Dhikr',
    features: ['Einfacher Tasbih-Zähler mit eigenen Zielen', 'Persönliche Duas und besondere Dhikr-Listen', 'Die 99 Namen Allahs', 'Erinnerungen, Serien und Statistiken', 'Offline nutzbar mit optionaler Google-Kontosynchronisierung'],
    stepsTitle: 'So verwendest du Azkar', steps: ['Öffne Azkar im Browser.', 'Wähle ein Ziel oder erstelle deinen eigenen Dhikr.', 'Tippe zum Zählen und sieh deinen Fortschritt an.'],
    faqTitle: 'Häufige Fragen', faq: [
      { question: 'Ist Azkar kostenlos?', answer: 'Ja. Azkar ist eine kostenlose Web-App und die wichtigsten Funktionen sind ohne Bezahlung verfügbar.' },
      { question: 'Funktioniert Azkar offline?', answer: 'Ja. Nach dem ersten Öffnen bleiben der Zähler und gespeicherte Inhalte auch ohne Internet verfügbar.' },
      { question: 'Kann ich Daten auf mehreren Geräten verwenden?', answer: 'Die optionale Google-Kontosynchronisierung kann unterstützte Daten übertragen. Änderungen benötigen eventuell Zeit oder eine Internetverbindung.' }
    ], cta: 'Azkar öffnen', languageLabel: 'Sprache wählen', footer: 'Azkar — ein ruhiger Begleiter für den täglichen Dhikr.'
  },
  es: {
    locale: 'es_ES', title: 'Azkar — Dhikr, contador Tasbih y duas',
    description: 'Azkar es un contador gratuito y multilingüe de dhikr y tasbih con duas, los 99 nombres de Alá, objetivos, recordatorios y estadísticas.',
    h1: 'Contador gratuito de dhikr y tasbih digital',
    intro: 'Azkar te ayuda a contar el dhikr diario, guardar duas personales, conocer los 99 nombres de Alá y seguir tus objetivos. Puedes instalar la aplicación web en tu teléfono o usarla directamente en el navegador.',
    featuresTitle: 'Todo para tu dhikr diario',
    features: ['Contador tasbih sencillo con objetivos personalizados', 'Duas personales y listas de dhikr especial', 'Los 99 nombres de Alá', 'Recordatorios, rachas y estadísticas', 'Uso sin conexión y sincronización opcional con Google'],
    stepsTitle: 'Cómo usar Azkar', steps: ['Abre Azkar en tu navegador.', 'Elige un objetivo o crea tu propio dhikr.', 'Toca para contar y revisa tu progreso.'],
    faqTitle: 'Preguntas frecuentes', faq: [
      { question: '¿Azkar es gratis?', answer: 'Sí. Azkar es una aplicación web gratuita y sus funciones principales no requieren pago.' },
      { question: '¿Puedo usarla sin conexión?', answer: 'Sí. Después de la primera visita, el contador y el contenido guardado siguen disponibles sin internet.' },
      { question: '¿Puedo usar mis datos en otro dispositivo?', answer: 'La sincronización opcional con una cuenta de Google puede transferir los datos compatibles. Los cambios pueden tardar o necesitar conexión.' }
    ], cta: 'Abrir Azkar', languageLabel: 'Elegir idioma', footer: 'Azkar — un compañero sereno para el recuerdo diario.'
  },
  fr: {
    locale: 'fr_FR', title: 'Azkar — Dhikr, compteur Tasbih et duas',
    description: 'Azkar est un compteur gratuit et multilingue de dhikr et tasbih avec duas, les 99 noms d’Allah, objectifs, rappels et statistiques.',
    h1: 'Compteur gratuit de dhikr et tasbih numérique',
    intro: 'Azkar vous aide à compter le dhikr quotidien, conserver vos duas, découvrir les 99 noms d’Allah et suivre vos objectifs. Installez cette application web sur votre téléphone ou utilisez-la directement dans le navigateur.',
    featuresTitle: 'Tout pour votre dhikr quotidien',
    features: ['Compteur tasbih simple avec objectifs personnalisés', 'Duas personnelles et listes de dhikr', 'Les 99 noms d’Allah', 'Rappels, séries et statistiques', 'Utilisation hors ligne et synchronisation Google facultative'],
    stepsTitle: 'Comment utiliser Azkar', steps: ['Ouvrez Azkar dans votre navigateur.', 'Choisissez un objectif ou créez votre dhikr.', 'Touchez pour compter et consultez vos progrès.'],
    faqTitle: 'Questions fréquentes', faq: [
      { question: 'Azkar est-il gratuit ?', answer: 'Oui. Azkar est une application web gratuite et ses fonctions principales sont accessibles sans paiement.' },
      { question: 'Puis-je l’utiliser hors ligne ?', answer: 'Oui. Après la première ouverture, le compteur et les contenus enregistrés restent disponibles sans connexion.' },
      { question: 'Puis-je retrouver mes données sur un autre appareil ?', answer: 'La synchronisation Google facultative peut transférer les données prises en charge. Les changements peuvent demander du temps ou une connexion.' }
    ], cta: 'Ouvrir Azkar', languageLabel: 'Choisir la langue', footer: 'Azkar — un compagnon paisible pour le rappel quotidien.'
  },
  it: {
    locale: 'it_IT', title: 'Azkar — Dhikr, contatore Tasbih e dua',
    description: 'Azkar è un contatore gratuito e multilingue di dhikr e tasbih con dua, i 99 nomi di Allah, obiettivi, promemoria e statistiche.',
    h1: 'Contatore gratuito di dhikr e tasbih digitale',
    intro: 'Azkar ti aiuta a contare il dhikr quotidiano, conservare le dua personali, conoscere i 99 nomi di Allah e seguire i tuoi obiettivi. Installa la web app sul telefono oppure usala direttamente nel browser.',
    featuresTitle: 'Tutto per il tuo dhikr quotidiano',
    features: ['Contatore tasbih semplice con obiettivi personalizzati', 'Dua personali ed elenchi di dhikr', 'I 99 nomi di Allah', 'Promemoria, serie e statistiche', 'Uso offline e sincronizzazione Google facoltativa'],
    stepsTitle: 'Come usare Azkar', steps: ['Apri Azkar nel browser.', 'Scegli un obiettivo o crea il tuo dhikr.', 'Tocca per contare e controlla i progressi.'],
    faqTitle: 'Domande frequenti', faq: [
      { question: 'Azkar è gratuito?', answer: 'Sì. Azkar è una web app gratuita e le funzioni principali sono disponibili senza pagamento.' },
      { question: 'Posso usarlo offline?', answer: 'Sì. Dopo il primo accesso, il contatore e i contenuti salvati restano disponibili senza internet.' },
      { question: 'Posso usare i dati su un altro dispositivo?', answer: 'La sincronizzazione Google facoltativa può trasferire i dati supportati. Le modifiche possono richiedere tempo o una connessione.' }
    ], cta: 'Apri Azkar', languageLabel: 'Scegli la lingua', footer: 'Azkar — un compagno sereno per il ricordo quotidiano.'
  },
  ja: {
    locale: 'ja_JP', title: 'Azkar — ズィクル・タスビーフカウンターとドゥアー',
    description: 'Azkarは、ドゥアー、アッラーの99の御名、目標、リマインダー、統計を備えた無料の多言語ズィクル・タスビーフカウンターです。',
    h1: '無料のズィクル・デジタルタスビーフカウンター',
    intro: 'Azkarは、毎日のズィクルを数え、個人のドゥアーを保存し、アッラーの99の御名を学び、目標を確認するためのウェブアプリです。スマートフォンにインストールするか、ブラウザーでそのまま利用できます。',
    featuresTitle: '毎日のズィクルに必要な機能',
    features: ['自由な目標を設定できるタスビーフカウンター', '個人のドゥアーと特別なズィクル一覧', 'アッラーの99の御名', 'リマインダー、継続記録、統計', 'オフライン利用と任意のGoogleアカウント同期'],
    stepsTitle: 'Azkarの使い方', steps: ['ブラウザーでAzkarを開きます。', '目標を選ぶか、自分のズィクルを作成します。', 'タップして数え、進み具合を確認します。'],
    faqTitle: 'よくある質問', faq: [
      { question: 'Azkarは無料ですか？', answer: 'はい。Azkarは無料のウェブアプリで、主な機能は支払いなしで利用できます。' },
      { question: 'オフラインでも使えますか？', answer: 'はい。最初に開いた後は、主要なカウンターと保存した内容をインターネットなしでも利用できます。' },
      { question: '別の端末でもデータを使えますか？', answer: '任意のGoogleアカウント同期で対応データを移せます。反映には時間やインターネット接続が必要な場合があります。' }
    ], cta: 'Azkarを開く', languageLabel: '言語を選択', footer: 'Azkar — 毎日の想念に寄り添う静かなウェブアプリ。'
  },
  ko: {
    locale: 'ko_KR', title: 'Azkar — 지크르, 타스비 카운터와 두아',
    description: 'Azkar는 두아, 알라의 99가지 이름, 목표, 알림과 통계를 제공하는 무료 다국어 지크르 및 타스비 카운터입니다.',
    h1: '무료 지크르 및 디지털 타스비 카운터',
    intro: 'Azkar는 매일의 지크르를 세고, 개인 두아를 저장하고, 알라의 99가지 이름을 배우며 목표를 확인할 수 있는 웹 앱입니다. 휴대전화에 설치하거나 브라우저에서 바로 사용할 수 있습니다.',
    featuresTitle: '매일의 지크르를 위한 기능',
    features: ['개인 목표를 설정할 수 있는 간편한 타스비 카운터', '개인 두아와 특별 지크르 목록', '알라의 99가지 이름', '알림, 연속 기록과 통계', '오프라인 사용과 선택적 Google 계정 동기화'],
    stepsTitle: 'Azkar 사용 방법', steps: ['브라우저에서 Azkar를 엽니다.', '목표를 선택하거나 나만의 지크르를 만듭니다.', '화면을 눌러 세고 진행 상황을 확인합니다.'],
    faqTitle: '자주 묻는 질문', faq: [
      { question: 'Azkar는 무료인가요?', answer: '네. Azkar는 무료 웹 앱이며 주요 기능을 결제 없이 사용할 수 있습니다.' },
      { question: '오프라인에서도 사용할 수 있나요?', answer: '네. 처음 방문한 뒤에는 주요 카운터와 저장된 내용을 인터넷 없이도 사용할 수 있습니다.' },
      { question: '다른 기기에서도 데이터를 사용할 수 있나요?', answer: '선택적 Google 계정 동기화로 지원되는 데이터를 옮길 수 있습니다. 반영에는 시간이나 연결이 필요할 수 있습니다.' }
    ], cta: 'Azkar 열기', languageLabel: '언어 선택', footer: 'Azkar — 매일의 기억을 위한 차분한 동반자.'
  },
  ru: {
    locale: 'ru_RU', title: 'Azkar — зикр, счётчик тасбиха и дуа',
    description: 'Azkar — бесплатный многоязычный счётчик зикра и электронный тасбих с дуа, 99 именами Аллаха, целями, напоминаниями и статистикой.',
    h1: 'Бесплатный счётчик зикра и электронный тасбих',
    intro: 'Azkar помогает считать ежедневный зикр, хранить личные дуа, изучать 99 имён Аллаха и следить за своими целями. Установите веб-приложение на телефон или пользуйтесь им прямо в современном браузере.',
    featuresTitle: 'Всё для ежедневного зикра',
    features: ['Удобный счётчик тасбиха с личными целями', 'Личные дуа и списки особых зикров', '99 имён Аллаха', 'Напоминания, серии дней и статистика', 'Работа офлайн и необязательная синхронизация через Google'],
    stepsTitle: 'Как пользоваться Azkar', steps: ['Откройте Azkar в браузере.', 'Выберите цель или создайте собственный зикр.', 'Нажимайте для подсчёта и следите за прогрессом.'],
    faqTitle: 'Частые вопросы', faq: [
      { question: 'Azkar бесплатный?', answer: 'Да. Azkar — бесплатное веб-приложение, основные возможности доступны без оплаты.' },
      { question: 'Можно пользоваться без интернета?', answer: 'Да. После первого открытия основные функции счётчика и сохранённые материалы доступны офлайн.' },
      { question: 'Можно перенести данные на другое устройство?', answer: 'Необязательная синхронизация через Google переносит поддерживаемые данные. Для появления изменений может потребоваться время и подключение.' }
    ], cta: 'Открыть Azkar', languageLabel: 'Выбрать язык', footer: 'Azkar — спокойный помощник для ежедневного поминания.'
  },
  uz: {
    locale: 'uz_UZ', title: 'Azkar — zikr, tasbeh hisoblagichi va duolar',
    description: 'Azkar — duolar, Allohning 99 ismi, maqsadlar, eslatmalar va statistika mavjud bepul ko‘p tilli zikr va tasbeh hisoblagichi.',
    h1: 'Bepul zikr va elektron tasbeh hisoblagichi',
    intro: 'Azkar kundalik zikrlarni sanash, shaxsiy duolarni saqlash, Allohning 99 ismini o‘rganish va maqsadlarni kuzatishga yordam beradi. Veb-ilovani telefonga o‘rnating yoki brauzerda bevosita foydalaning.',
    featuresTitle: 'Kundalik zikr uchun barcha imkoniyatlar',
    features: ['Shaxsiy maqsadli qulay tasbeh hisoblagichi', 'Shaxsiy duolar va maxsus zikr ro‘yxatlari', 'Allohning 99 ismi', 'Eslatmalar, davomiy kunlar va statistika', 'Oflayn ishlash va ixtiyoriy Google sinxronizatsiyasi'],
    stepsTitle: 'Azkar’dan foydalanish', steps: ['Azkar’ni brauzerda oching.', 'Maqsadni tanlang yoki o‘z zikringizni yarating.', 'Sanash uchun bosing va natijalarni kuzating.'],
    faqTitle: 'Ko‘p beriladigan savollar', faq: [
      { question: 'Azkar bepulmi?', answer: 'Ha. Azkar bepul veb-ilova bo‘lib, asosiy imkoniyatlardan to‘lovsiz foydalanish mumkin.' },
      { question: 'Internetsiz ishlaydimi?', answer: 'Ha. Birinchi marta ochilgandan so‘ng hisoblagich va saqlangan ma’lumotlar oflayn holatda ham ishlaydi.' },
      { question: 'Ma’lumotlarni boshqa qurilmada ishlatish mumkinmi?', answer: 'Ixtiyoriy Google sinxronizatsiyasi qo‘llab-quvvatlanadigan ma’lumotlarni ko‘chiradi. O‘zgarishlar uchun vaqt yoki internet kerak bo‘lishi mumkin.' }
    ], cta: 'Azkar’ni ochish', languageLabel: 'Tilni tanlang', footer: 'Azkar — kundalik zikr uchun sokin hamroh.'
  },
  zh: {
    locale: 'zh_CN', title: 'Azkar — 赞念、赞珠计数器与祈祷',
    description: 'Azkar是一款免费的多语言赞念与电子赞珠计数器，包含祈祷、安拉的九十九个尊名、目标、提醒和统计，并支持在线与离线使用。',
    h1: '免费的赞念与电子赞珠计数器',
    intro: 'Azkar可以帮助您记录每日赞念、保存个人祈祷、学习安拉的九十九个尊名并跟踪目标。您可以把这款网页应用安装到手机，也可以直接在现代浏览器中使用。',
    featuresTitle: '每日赞念所需的功能',
    features: ['可设置个人目标的简洁赞珠计数器', '个人祈祷和特别赞念列表', '安拉的九十九个尊名', '提醒、连续记录和统计', '离线使用与可选的Google账户同步'],
    stepsTitle: '如何使用Azkar', steps: ['在浏览器中打开Azkar。', '选择目标或创建自己的赞念。', '点击计数并查看进度。'],
    faqTitle: '常见问题', faq: [
      { question: 'Azkar免费吗？', answer: '是的。Azkar是一款免费的网页应用，主要功能无需付费即可使用。' },
      { question: '可以离线使用吗？', answer: '可以。首次打开后，主要计数功能和已保存的内容在没有网络时仍可使用。' },
      { question: '可以在其他设备使用数据吗？', answer: '可选的Google账户同步可以传输支持的数据。更改可能需要一些时间或网络连接才能显示。' }
    ], cta: '打开Azkar', languageLabel: '选择语言', footer: 'Azkar — 陪伴每日赞念的宁静工具。'
  },
  tr: {
    locale: 'tr_TR', title: 'Azkar — Zikir, tesbih sayacı ve dualar',
    description: 'Azkar; dualar, Allah’ın 99 ismi, hedefler, hatırlatıcılar ve istatistikler içeren ücretsiz, çok dilli zikir ve tesbih sayacıdır.',
    h1: 'Ücretsiz zikir ve dijital tesbih sayacı',
    intro: 'Azkar günlük zikri saymanıza, kişisel duaları saklamanıza, Allah’ın 99 ismini öğrenmenize ve hedeflerinizi izlemenize yardımcı olur. Web uygulamasını telefonunuza yükleyin veya doğrudan tarayıcıda kullanın.',
    featuresTitle: 'Günlük zikir için tüm özellikler',
    features: ['Kişisel hedefli kolay tesbih sayacı', 'Kişisel dualar ve özel zikir listeleri', 'Allah’ın 99 ismi', 'Hatırlatıcılar, seriler ve istatistikler', 'Çevrim dışı kullanım ve isteğe bağlı Google senkronizasyonu'],
    stepsTitle: 'Azkar nasıl kullanılır?', steps: ['Azkar’ı tarayıcıda açın.', 'Bir hedef seçin veya kendi zikrinizi oluşturun.', 'Saymak için dokunun ve ilerlemenizi izleyin.'],
    faqTitle: 'Sık sorulan sorular', faq: [
      { question: 'Azkar ücretsiz mi?', answer: 'Evet. Azkar ücretsiz bir web uygulamasıdır ve temel özellikler ödeme gerektirmez.' },
      { question: 'Çevrim dışı kullanabilir miyim?', answer: 'Evet. İlk ziyaretten sonra sayaç ve kaydedilen içerikler internet olmadan da kullanılabilir.' },
      { question: 'Verilerimi başka cihazda kullanabilir miyim?', answer: 'İsteğe bağlı Google senkronizasyonu desteklenen verileri aktarabilir. Değişiklikler için zaman veya bağlantı gerekebilir.' }
    ], cta: 'Azkar’ı aç', languageLabel: 'Dil seçin', footer: 'Azkar — günlük zikir için sakin bir yardımcı.'
  },
  hi: {
    locale: 'hi_IN', title: 'Azkar — ज़िक्र, तस्बीह काउंटर और दुआएँ',
    description: 'Azkar एक मुफ़्त बहुभाषी ज़िक्र और तस्बीह काउंटर है, जिसमें दुआएँ, अल्लाह के 99 नाम, लक्ष्य, रिमाइंडर और आँकड़े शामिल हैं।',
    h1: 'मुफ़्त ज़िक्र और डिजिटल तस्बीह काउंटर',
    intro: 'Azkar रोज़ाना ज़िक्र गिनने, निजी दुआएँ सहेजने, अल्लाह के 99 नाम सीखने और अपने लक्ष्यों पर नज़र रखने में मदद करता है। वेब ऐप को फ़ोन पर इंस्टॉल करें या आधुनिक ब्राउज़र में सीधे इस्तेमाल करें।',
    featuresTitle: 'रोज़ाना ज़िक्र के लिए सभी सुविधाएँ',
    features: ['अपने लक्ष्य वाला आसान तस्बीह काउंटर', 'निजी दुआएँ और विशेष ज़िक्र सूचियाँ', 'अल्लाह के 99 नाम', 'रिमाइंडर, लगातार दिनों का रिकॉर्ड और आँकड़े', 'ऑफ़लाइन उपयोग और वैकल्पिक Google सिंक'],
    stepsTitle: 'Azkar का उपयोग कैसे करें', steps: ['ब्राउज़र में Azkar खोलें।', 'लक्ष्य चुनें या अपना ज़िक्र बनाएँ।', 'गिनने के लिए टैप करें और प्रगति देखें।'],
    faqTitle: 'अक्सर पूछे जाने वाले सवाल', faq: [
      { question: 'क्या Azkar मुफ़्त है?', answer: 'हाँ। Azkar एक मुफ़्त वेब ऐप है और इसकी मुख्य सुविधाओं के लिए भुगतान नहीं करना पड़ता।' },
      { question: 'क्या इसे ऑफ़लाइन चला सकते हैं?', answer: 'हाँ। पहली बार खोलने के बाद मुख्य काउंटर और सहेजी गई सामग्री इंटरनेट के बिना भी उपलब्ध रहती है।' },
      { question: 'क्या डेटा दूसरे डिवाइस पर मिल सकता है?', answer: 'वैकल्पिक Google सिंक समर्थित डेटा को दूसरे डिवाइस तक पहुँचा सकता है। बदलाव दिखने में समय या इंटरनेट लग सकता है।' }
    ], cta: 'Azkar खोलें', languageLabel: 'भाषा चुनें', footer: 'Azkar — रोज़ाना याद के लिए एक शांत साथी।'
  },
  id: {
    locale: 'id_ID', title: 'Azkar — Dzikir, penghitung tasbih & doa',
    description: 'Azkar adalah penghitung dzikir dan tasbih multibahasa gratis dengan doa, 99 nama Allah, target, pengingat, dan statistik.',
    h1: 'Penghitung dzikir dan tasbih digital gratis',
    intro: 'Azkar membantu Anda menghitung dzikir harian, menyimpan doa pribadi, mempelajari 99 nama Allah, dan memantau target. Pasang aplikasi web ini di ponsel atau gunakan langsung melalui peramban modern.',
    featuresTitle: 'Semua kebutuhan dzikir harian',
    features: ['Penghitung tasbih sederhana dengan target pribadi', 'Doa pribadi dan daftar dzikir khusus', '99 nama Allah', 'Pengingat, rangkaian hari, dan statistik', 'Penggunaan offline dan sinkronisasi Google opsional'],
    stepsTitle: 'Cara menggunakan Azkar', steps: ['Buka Azkar di peramban.', 'Pilih target atau buat dzikir sendiri.', 'Ketuk untuk menghitung dan lihat kemajuan.'],
    faqTitle: 'Pertanyaan umum', faq: [
      { question: 'Apakah Azkar gratis?', answer: 'Ya. Azkar adalah aplikasi web gratis dan fitur utamanya dapat digunakan tanpa pembayaran.' },
      { question: 'Bisakah digunakan offline?', answer: 'Ya. Setelah kunjungan pertama, penghitung utama dan konten tersimpan tetap tersedia tanpa internet.' },
      { question: 'Bisakah data digunakan di perangkat lain?', answer: 'Sinkronisasi Google opsional dapat memindahkan data yang didukung. Perubahan mungkin memerlukan waktu atau koneksi internet.' }
    ], cta: 'Buka Azkar', languageLabel: 'Pilih bahasa', footer: 'Azkar — teman yang tenang untuk dzikir harian.'
  },
  ms: {
    locale: 'ms_MY', title: 'Azkar — Zikir, pembilang tasbih & doa',
    description: 'Azkar ialah pembilang zikir dan tasbih berbilang bahasa percuma dengan doa, 99 nama Allah, sasaran, peringatan dan statistik.',
    h1: 'Pembilang zikir dan tasbih digital percuma',
    intro: 'Azkar membantu anda membilang zikir harian, menyimpan doa peribadi, mempelajari 99 nama Allah dan mengikuti sasaran. Pasang aplikasi web ini pada telefon atau gunakannya terus dalam pelayar moden.',
    featuresTitle: 'Semua keperluan zikir harian',
    features: ['Pembilang tasbih mudah dengan sasaran peribadi', 'Doa peribadi dan senarai zikir khas', '99 nama Allah', 'Peringatan, rentetan hari dan statistik', 'Penggunaan luar talian dan penyegerakan Google pilihan'],
    stepsTitle: 'Cara menggunakan Azkar', steps: ['Buka Azkar dalam pelayar.', 'Pilih sasaran atau cipta zikir sendiri.', 'Ketik untuk membilang dan lihat kemajuan.'],
    faqTitle: 'Soalan lazim', faq: [
      { question: 'Adakah Azkar percuma?', answer: 'Ya. Azkar ialah aplikasi web percuma dan ciri utamanya boleh digunakan tanpa bayaran.' },
      { question: 'Bolehkah digunakan luar talian?', answer: 'Ya. Selepas lawatan pertama, pembilang utama dan kandungan tersimpan kekal tersedia tanpa internet.' },
      { question: 'Bolehkah data digunakan pada peranti lain?', answer: 'Penyegerakan Google pilihan boleh memindahkan data yang disokong. Perubahan mungkin memerlukan masa atau sambungan internet.' }
    ], cta: 'Buka Azkar', languageLabel: 'Pilih bahasa', footer: 'Azkar — teman yang tenang untuk zikir harian.'
  },
  th: {
    locale: 'th_TH', title: 'Azkar — ซิกร์ ตัวนับตัสบีห์และดุอาอ์',
    description: 'Azkar คือตัวนับซิกร์และตัสบีห์หลายภาษาฟรี พร้อมดุอาอ์ พระนามทั้ง 99 ของอัลลอฮ์ เป้าหมาย การเตือน และสถิติ ใช้ได้ทั้งออนไลน์และออฟไลน์',
    h1: 'ตัวนับซิกร์และตัสบีห์ดิจิทัลฟรี',
    intro: 'Azkar ช่วยนับซิกร์ประจำวัน บันทึกดุอาอ์ส่วนตัว เรียนรู้พระนามทั้ง 99 ของอัลลอฮ์ และติดตามเป้าหมาย คุณสามารถติดตั้งเว็บแอปบนโทรศัพท์หรือใช้โดยตรงในเบราว์เซอร์สมัยใหม่',
    featuresTitle: 'ทุกสิ่งสำหรับซิกร์ประจำวัน',
    features: ['ตัวนับตัสบีห์ใช้ง่ายพร้อมเป้าหมายส่วนตัว', 'ดุอาอ์ส่วนตัวและรายการซิกร์พิเศษ', 'พระนามทั้ง 99 ของอัลลอฮ์', 'การเตือน สถิติต่อเนื่อง และข้อมูลสรุป', 'ใช้งานออฟไลน์และซิงค์ Google แบบเลือกใช้'],
    stepsTitle: 'วิธีใช้ Azkar', steps: ['เปิด Azkar ในเบราว์เซอร์', 'เลือกเป้าหมายหรือสร้างซิกร์ของคุณเอง', 'แตะเพื่อนับและดูความคืบหน้า'],
    faqTitle: 'คำถามที่พบบ่อย', faq: [
      { question: 'Azkar ฟรีหรือไม่?', answer: 'ฟรี Azkar เป็นเว็บแอปที่ใช้งานคุณสมบัติหลักได้โดยไม่ต้องชำระเงิน' },
      { question: 'ใช้งานออฟไลน์ได้หรือไม่?', answer: 'ได้ หลังจากเปิดครั้งแรก ตัวนับหลักและข้อมูลที่บันทึกไว้ยังใช้งานได้โดยไม่ต้องเชื่อมต่ออินเทอร์เน็ต' },
      { question: 'ใช้ข้อมูลบนอุปกรณ์อื่นได้หรือไม่?', answer: 'การซิงค์ Google แบบเลือกใช้สามารถย้ายข้อมูลที่รองรับได้ การเปลี่ยนแปลงอาจต้องใช้เวลาหรือการเชื่อมต่ออินเทอร์เน็ต' }
    ], cta: 'เปิด Azkar', languageLabel: 'เลือกภาษา', footer: 'Azkar — เพื่อนที่สงบสำหรับการรำลึกประจำวัน'
  }
});
