(function () {
    'use strict';

    const SEO = {
        en: {
            title: 'Azkar — Dhikr, Tasbih Counter & Duas',
            description: 'Azkar is a free multilingual dhikr and tasbih counter with duas, the 99 Names of Allah, goals, reminders and statistics. Install it and use it online or offline.',
            short: 'Free multilingual dhikr counter, duas and 99 Names of Allah. Install and use online or offline.',
            introTitle: 'About Azkar',
            intro: 'Azkar is a free multilingual dhikr and digital tasbih counter with duas, the 99 Names of Allah, personal goals, reminders and statistics. Install it on your phone and use it online or offline.',
            keywords: 'Azkar, Tasbih, Dhikr, Zikr, dua, digital tasbih counter, zikr counter, 99 Names of Allah',
            locale: 'en_US'
        },
        de: {
            title: 'Azkar — Dhikr, Tasbih-Zähler & Duas',
            description: 'Azkar ist ein kostenloser mehrsprachiger Dhikr- und Tasbih-Zähler mit Duas, den 99 Namen Allahs, Zielen, Erinnerungen und Statistiken. Online und offline nutzbar.',
            short: 'Kostenloser Dhikr- und Tasbih-Zähler mit Duas und den 99 Namen Allahs. Online und offline.',
            introTitle: 'Über Azkar',
            intro: 'Azkar ist ein kostenloser mehrsprachiger Dhikr- und digitaler Tasbih-Zähler mit Duas, den 99 Namen Allahs, persönlichen Zielen, Erinnerungen und Statistiken. Installiere ihn und nutze ihn online oder offline.',
            keywords: 'Azkar, Tasbih, Dhikr, Zikr, Dua, Tasbih Zähler, Dhikr Zähler, 99 Namen Allahs',
            locale: 'de_DE'
        },
        es: {
            title: 'Azkar — Dhikr, contador Tasbih y duas',
            description: 'Azkar es un contador gratuito y multilingüe de dhikr y tasbih con duas, los 99 nombres de Alá, objetivos, recordatorios y estadísticas. Funciona online y offline.',
            short: 'Contador gratuito de dhikr y tasbih con duas y los 99 nombres de Alá. Online y offline.',
            introTitle: 'Acerca de Azkar',
            intro: 'Azkar es un contador digital gratuito y multilingüe de dhikr y tasbih con duas, los 99 nombres de Alá, objetivos personales, recordatorios y estadísticas. Instálalo y úsalo online u offline.',
            keywords: 'Azkar, Tasbih, Dhikr, Zikr, dua, contador tasbih, contador dhikr, 99 nombres de Alá',
            locale: 'es_ES'
        },
        fr: {
            title: 'Azkar — Dhikr, compteur Tasbih et duas',
            description: 'Azkar est un compteur gratuit et multilingue de dhikr et tasbih avec duas, les 99 noms d’Allah, objectifs, rappels et statistiques. Utilisable en ligne et hors ligne.',
            short: 'Compteur gratuit de dhikr et tasbih avec duas et les 99 noms d’Allah. En ligne et hors ligne.',
            introTitle: 'À propos d’Azkar',
            intro: 'Azkar est un compteur numérique gratuit et multilingue de dhikr et tasbih avec duas, les 99 noms d’Allah, objectifs personnels, rappels et statistiques. Installez-le et utilisez-le en ligne ou hors ligne.',
            keywords: 'Azkar, Tasbih, Dhikr, Zikr, dua, compteur tasbih, compteur dhikr, 99 noms d Allah',
            locale: 'fr_FR'
        },
        it: {
            title: 'Azkar — Dhikr, contatore Tasbih e dua',
            description: 'Azkar è un contatore gratuito e multilingue di dhikr e tasbih con dua, i 99 nomi di Allah, obiettivi, promemoria e statistiche. Funziona online e offline.',
            short: 'Contatore gratuito di dhikr e tasbih con dua e i 99 nomi di Allah. Online e offline.',
            introTitle: 'Informazioni su Azkar',
            intro: 'Azkar è un contatore digitale gratuito e multilingue di dhikr e tasbih con dua, i 99 nomi di Allah, obiettivi personali, promemoria e statistiche. Installalo e usalo online o offline.',
            keywords: 'Azkar, Tasbih, Dhikr, Zikr, dua, contatore tasbih, contatore dhikr, 99 nomi di Allah',
            locale: 'it_IT'
        },
        ja: {
            title: 'Azkar — ズィクル・タスビーフカウンターとドゥアー',
            description: 'Azkarは、ドゥアー、アッラーの99の御名、目標、リマインダー、統計を備えた無料の多言語ズィクル・タスビーフカウンターです。オンラインでもオフラインでも使えます。',
            short: 'ドゥアーとアッラーの99の御名を備えた無料のズィクル・タスビーフカウンター。',
            introTitle: 'Azkarについて',
            intro: 'Azkarは、ドゥアー、アッラーの99の御名、個人目標、リマインダー、統計を備えた無料の多言語デジタルタスビーフです。スマートフォンにインストールし、オンラインまたはオフラインで利用できます。',
            keywords: 'Azkar, Tasbih, Dhikr, Zikr, ズィクル, タスビーフ, ズィクルカウンター, アッラーの99の御名',
            locale: 'ja_JP'
        },
        ko: {
            title: 'Azkar — 지크르, 타스비 카운터와 두아',
            description: 'Azkar는 두아, 알라의 99가지 이름, 목표, 알림과 통계를 제공하는 무료 다국어 지크르 및 타스비 카운터입니다. 온라인과 오프라인에서 사용하세요.',
            short: '두아와 알라의 99가지 이름을 제공하는 무료 지크르 및 타스비 카운터.',
            introTitle: 'Azkar 소개',
            intro: 'Azkar는 두아, 알라의 99가지 이름, 개인 목표, 알림과 통계를 제공하는 무료 다국어 디지털 타스비입니다. 휴대전화에 설치하여 온라인 또는 오프라인으로 사용하세요.',
            keywords: 'Azkar, Tasbih, Dhikr, Zikr, 지크르, 타스비, 지크르 카운터, 알라의 99가지 이름',
            locale: 'ko_KR'
        },
        ru: {
            title: 'Azkar — зикр, счётчик тасбиха и дуа',
            description: 'Azkar — бесплатное многоязычное приложение: электронный тасбих, счётчик зикра, дуа, 99 имён Аллаха, цели, напоминания и статистика. Работает онлайн и офлайн.',
            short: 'Бесплатный счётчик зикра и тасбиха с дуа и 99 именами Аллаха. Онлайн и офлайн.',
            introTitle: 'О приложении Azkar',
            intro: 'Azkar — бесплатный многоязычный электронный тасбих и счётчик зикра с дуа, 99 именами Аллаха, личными целями, напоминаниями и статистикой. Установите его на телефон и используйте онлайн или офлайн.',
            keywords: 'Azkar, тасбих, зикр, азкар, дуа, счётчик зикра, электронный тасбих, 99 имён Аллаха',
            locale: 'ru_RU'
        },
        uz: {
            title: 'Azkar — zikr, tasbeh hisoblagichi va duolar',
            description: 'Azkar — duolar, Allohning 99 ismi, maqsadlar, eslatmalar va statistika mavjud bepul ko‘p tilli zikr va tasbeh hisoblagichi. Onlayn va oflayn ishlaydi.',
            short: 'Duolar va Allohning 99 ismi mavjud bepul zikr va tasbeh hisoblagichi. Onlayn va oflayn.',
            introTitle: 'Azkar haqida',
            intro: 'Azkar — duolar, Allohning 99 ismi, shaxsiy maqsadlar, eslatmalar va statistika mavjud bepul ko‘p tilli elektron tasbeh va zikr hisoblagichi. Uni telefoningizga o‘rnating va onlayn yoki oflayn foydalaning.',
            keywords: 'Azkar, tasbeh, zikr, duo, zikr hisoblagichi, elektron tasbeh, Allohning 99 ismi',
            locale: 'uz_UZ'
        },
        zh: {
            title: 'Azkar — 记念、赞珠计数器与祈祷',
            description: 'Azkar 是免费的多语言记念与电子赞珠计数器，包含祈祷、安拉的九十九个尊名、目标、提醒和统计。支持在线和离线使用。',
            short: '免费记念与赞珠计数器，包含祈祷和安拉的九十九个尊名。',
            introTitle: '关于 Azkar',
            intro: 'Azkar 是免费的多语言电子赞珠和记念计数器，包含祈祷、安拉的九十九个尊名、个人目标、提醒和统计。可安装到手机并在线或离线使用。',
            keywords: 'Azkar, Tasbih, Dhikr, Zikr, 记念, 赞珠, 赞珠计数器, 安拉的九十九个尊名',
            locale: 'zh_CN'
        },
        tr: {
            title: 'Azkar — Zikir, tesbih sayacı ve dualar',
            description: 'Azkar; dualar, Allah’ın 99 ismi, hedefler, hatırlatıcılar ve istatistikler içeren ücretsiz, çok dilli zikir ve tesbih sayacıdır. Çevrim içi ve çevrim dışı çalışır.',
            short: 'Dualar ve Allah’ın 99 ismi ile ücretsiz zikir ve tesbih sayacı. Çevrim içi ve çevrim dışı.',
            introTitle: 'Azkar hakkında',
            intro: 'Azkar; dualar, Allah’ın 99 ismi, kişisel hedefler, hatırlatıcılar ve istatistikler içeren ücretsiz, çok dilli dijital tesbih ve zikir sayacıdır. Telefonunuza yükleyip çevrim içi veya çevrim dışı kullanın.',
            keywords: 'Azkar, tesbih, zikir, dua, zikir sayacı, dijital tesbih, Allahın 99 ismi',
            locale: 'tr_TR'
        },
        hi: {
            title: 'Azkar — ज़िक्र, तस्बीह काउंटर और दुआएँ',
            description: 'Azkar एक मुफ़्त बहुभाषी ज़िक्र और तस्बीह काउंटर है, जिसमें दुआएँ, अल्लाह के 99 नाम, लक्ष्य, रिमाइंडर और आँकड़े हैं। ऑनलाइन और ऑफ़लाइन चलता है।',
            short: 'दुआओं और अल्लाह के 99 नामों के साथ मुफ़्त ज़िक्र और तस्बीह काउंटर।',
            introTitle: 'Azkar के बारे में',
            intro: 'Azkar एक मुफ़्त बहुभाषी डिजिटल तस्बीह और ज़िक्र काउंटर है, जिसमें दुआएँ, अल्लाह के 99 नाम, व्यक्तिगत लक्ष्य, रिमाइंडर और आँकड़े हैं। इसे फ़ोन पर इंस्टॉल करके ऑनलाइन या ऑफ़लाइन इस्तेमाल करें।',
            keywords: 'Azkar, Tasbih, Dhikr, Zikr, ज़िक्र, तस्बीह, ज़िक्र काउंटर, अल्लाह के 99 नाम',
            locale: 'hi_IN'
        },
        id: {
            title: 'Azkar — Dzikir, penghitung tasbih & doa',
            description: 'Azkar adalah penghitung dzikir dan tasbih multibahasa gratis dengan doa, 99 nama Allah, target, pengingat, dan statistik. Dapat digunakan online maupun offline.',
            short: 'Penghitung dzikir dan tasbih gratis dengan doa dan 99 nama Allah. Online dan offline.',
            introTitle: 'Tentang Azkar',
            intro: 'Azkar adalah penghitung dzikir dan tasbih digital multibahasa gratis dengan doa, 99 nama Allah, target pribadi, pengingat, dan statistik. Instal di ponsel dan gunakan secara online atau offline.',
            keywords: 'Azkar, tasbih, dzikir, zikir, doa, penghitung dzikir, tasbih digital, 99 nama Allah',
            locale: 'id_ID'
        },
        ms: {
            title: 'Azkar — Zikir, pembilang tasbih & doa',
            description: 'Azkar ialah pembilang zikir dan tasbih berbilang bahasa percuma dengan doa, 99 nama Allah, sasaran, peringatan dan statistik. Boleh digunakan dalam dan luar talian.',
            short: 'Pembilang zikir dan tasbih percuma dengan doa dan 99 nama Allah. Dalam dan luar talian.',
            introTitle: 'Tentang Azkar',
            intro: 'Azkar ialah pembilang zikir dan tasbih digital berbilang bahasa percuma dengan doa, 99 nama Allah, sasaran peribadi, peringatan dan statistik. Pasang pada telefon dan gunakannya dalam atau luar talian.',
            keywords: 'Azkar, tasbih, zikir, doa, pembilang zikir, tasbih digital, 99 nama Allah',
            locale: 'ms_MY'
        },
        th: {
            title: 'Azkar — ซิกร์ ตัวนับตัสบีห์และดุอาอ์',
            description: 'Azkar คือตัวนับซิกร์และตัสบีห์หลายภาษาฟรี พร้อมดุอาอ์ พระนามทั้ง 99 ของอัลลอฮ์ เป้าหมาย การเตือนและสถิติ ใช้ได้ทั้งออนไลน์และออฟไลน์',
            short: 'ตัวนับซิกร์และตัสบีห์ฟรี พร้อมดุอาอ์และพระนามทั้ง 99 ของอัลลอฮ์',
            introTitle: 'เกี่ยวกับ Azkar',
            intro: 'Azkar คือตัวนับตัสบีห์และซิกร์ดิจิทัลหลายภาษาฟรี พร้อมดุอาอ์ พระนามทั้ง 99 ของอัลลอฮ์ เป้าหมายส่วนตัว การเตือนและสถิติ ติดตั้งบนโทรศัพท์และใช้งานได้ทั้งออนไลน์และออฟไลน์',
            keywords: 'Azkar, Tasbih, Dhikr, Zikr, ซิกร์, ตัสบีห์, ตัวนับซิกร์, พระนาม 99 ของอัลลอฮ์',
            locale: 'th_TH'
        }
    };

    function setMeta(selector, value) {
        const element = document.querySelector(selector);
        if (element) element.setAttribute('content', value);
    }

    function applySeoLanguage(language) {
        const languageCode = Object.prototype.hasOwnProperty.call(SEO, language) ? language : 'en';
        const content = SEO[languageCode];

        document.title = content.title;
        document.documentElement.lang = languageCode;
        setMeta('meta[name="description"]', content.description);
        setMeta('meta[name="keywords"]', content.keywords);
        setMeta('meta[property="og:title"]', content.title);
        setMeta('meta[property="og:description"]', content.description);
        setMeta('meta[property="og:locale"]', content.locale);
        setMeta('meta[name="twitter:title"]', content.title);
        setMeta('meta[name="twitter:description"]', content.short);

    }

    window.AZKAR_SEO = Object.freeze(SEO);
    window.applySeoLanguage = applySeoLanguage;

    document.addEventListener('DOMContentLoaded', function () {
        let language = document.documentElement.lang || 'en';
        try {
            const settings = JSON.parse(localStorage.getItem('azkar_settings') || '{}');
            if (settings && settings.language) language = settings.language;
        } catch (_) {}
        applySeoLanguage(language);
    }, { once: true });
})();
