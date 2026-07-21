# Multilingual SEO Landing Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add crawlable, localized SEO landing pages for all 15 Azkar languages and hand visitors into the existing application in the matching language.

**Architecture:** A dependency-free Node generator renders 15 committed static `/<language>/index.html` pages from one localized content module and one shared stylesheet. A small tested browser/Node routing module safely persists supported `?lang=` values before the existing SEO and application initialization run. The root page, generated pages, and sitemap form one consistent canonical/hreflang URL graph.

**Tech Stack:** Static HTML/CSS, vanilla JavaScript, Node.js built-in `node:test`, XML sitemap, GitHub Pages.

## Global Constraints

- Support exactly these language codes: `en`, `de`, `es`, `fr`, `it`, `ja`, `ko`, `ru`, `uz`, `zh`, `tr`, `hi`, `id`, `ms`, `th`.
- Keep the application at `https://sunnyberd.github.io/Tasbih/`; do not duplicate application logic in localized folders.
- Do not modify Firebase synchronization, data schemas, offline queues, statistics, authentication, or counting behavior.
- Do not claim that account synchronization is perfectly real-time.
- Landing-page primary content and metadata must exist in static HTML without requiring JavaScript.
- Use no third-party runtime or test dependencies.
- All public URLs must include the GitHub Pages `/Tasbih/` base path.
- The workspace is not currently a Git repository, so commit steps are recorded but cannot be executed unless Git metadata is restored.

---

## File Map

- Create `seo-landing.css`: shared responsive visual styling for all localized pages.
- Create `scripts/seo-content.mjs`: single source of localized landing-page copy and language names.
- Create `scripts/generate-seo-pages.mjs`: validates content, renders HTML, writes 15 language pages, and writes `sitemap.xml`.
- Create `tests/seo-pages.test.mjs`: generator/content/URL graph tests using Node built-ins.
- Create `language-routing.js`: pure supported-language parsing plus safe browser persistence.
- Create `tests/language-routing.test.cjs`: unit tests for valid, invalid, encoded, and duplicate query parameters.
- Create `<language>/index.html` for all 15 language codes: generated, crawlable landing pages.
- Modify `index.html`: add language alternates and load routing before `seo.js`.
- Modify `sitemap.xml`: generated root plus 15 landing URLs.
- Keep `robots.txt` unchanged after verifying its sitemap target.

---

### Task 1: Localized content contract and static page generator

**Files:**
- Create: `tests/seo-pages.test.mjs`
- Create: `scripts/seo-content.mjs`
- Create: `scripts/generate-seo-pages.mjs`
- Create: `seo-landing.css`
- Generate: `en/index.html`, `de/index.html`, `es/index.html`, `fr/index.html`, `it/index.html`, `ja/index.html`, `ko/index.html`, `ru/index.html`, `uz/index.html`, `zh/index.html`, `tr/index.html`, `hi/index.html`, `id/index.html`, `ms/index.html`, `th/index.html`

**Interfaces:**
- Produces `LANGUAGE_CODES: readonly string[]` in the exact required order.
- Produces `LANGUAGE_NAMES: Record<string, string>` containing native language names.
- Produces `SEO_CONTENT: Record<string, LandingContent>` where every record has `locale`, `title`, `description`, `h1`, `intro`, `featuresTitle`, `features`, `stepsTitle`, `steps`, `faqTitle`, `faq`, `cta`, `languageLabel`, and `footer`.
- Produces `renderLandingPage(code: string): string`, `renderSitemap(lastmod: string): string`, `validateContent(): void`, and `generateAll(rootDir: string, lastmod: string): Promise<void>`.

- [ ] **Step 1: Write the failing generator/content tests**

Create `tests/seo-pages.test.mjs` with assertions that fail before the modules and output pages exist. Use dynamic imports only after explicit existence assertions so the first failure clearly reports the missing feature.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const expectedCodes = ['en','de','es','fr','it','ja','ko','ru','uz','zh','tr','hi','id','ms','th'];

test('localized SEO source and generator exist', () => {
  assert.equal(existsSync(resolve(root, 'scripts/seo-content.mjs')), true);
  assert.equal(existsSync(resolve(root, 'scripts/generate-seo-pages.mjs')), true);
});

test('content covers every supported language with complete copy', async () => {
  assert.equal(existsSync(resolve(root, 'scripts/seo-content.mjs')), true);
  const { LANGUAGE_CODES, LANGUAGE_NAMES, SEO_CONTENT } = await import('../scripts/seo-content.mjs');
  assert.deepEqual(LANGUAGE_CODES, expectedCodes);
  for (const code of expectedCodes) {
    const item = SEO_CONTENT[code];
    assert.ok(LANGUAGE_NAMES[code]);
    assert.ok(item.title.length >= 12 && item.title.length <= 70, `${code} title`);
    assert.ok(item.description.length >= 60 && item.description.length <= 180, `${code} description`);
    assert.ok(item.h1.length >= 10, `${code} h1`);
    assert.ok(item.intro.length >= 60, `${code} intro`);
    assert.ok(item.features.length >= 5, `${code} features`);
    assert.equal(item.steps.length, 3, `${code} steps`);
    assert.ok(item.faq.length >= 3, `${code} faq`);
    for (const faq of item.faq) {
      assert.ok(faq.question.length >= 5);
      assert.ok(faq.answer.length >= 20);
    }
  }
});

test('renderer creates static localized metadata, body copy and reciprocal hreflang', async () => {
  assert.equal(existsSync(resolve(root, 'scripts/generate-seo-pages.mjs')), true);
  const { renderLandingPage } = await import('../scripts/generate-seo-pages.mjs');
  const html = renderLandingPage('ru');
  assert.match(html, /<html lang="ru"/);
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]+">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/sunnyberd\.github\.io\/Tasbih\/ru\/">/);
  assert.match(html, /<h1>[^<]+<\/h1>/);
  assert.match(html, /href="\/Tasbih\/?lang=ru"/);
  for (const code of expectedCodes) {
    assert.match(html, new RegExp(`hreflang="${code}" href="https://sunnyberd\\.github\\.io/Tasbih/${code}/"`));
  }
  assert.match(html, /hreflang="x-default" href="https:\/\/sunnyberd\.github\.io\/Tasbih\/en\/"/);
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(jsonLd);
  assert.equal(JSON.parse(jsonLd).name, 'Azkar');
});

test('generated pages and sitemap form a complete URL set', () => {
  for (const code of expectedCodes) {
    const page = resolve(root, code, 'index.html');
    assert.equal(existsSync(page), true, `${code} page`);
    assert.match(readFileSync(page, 'utf8'), new RegExp(`<html lang="${code}"`));
  }
  const sitemap = readFileSync(resolve(root, 'sitemap.xml'), 'utf8');
  const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(locations, [
    'https://sunnyberd.github.io/Tasbih/',
    ...expectedCodes.map(code => `https://sunnyberd.github.io/Tasbih/${code}/`)
  ]);
  assert.equal(new Set(locations).size, 16);
});
```

- [ ] **Step 2: Run the tests and verify the expected failure**

Run:

```powershell
node --test tests/seo-pages.test.mjs
```

Expected: FAIL at `localized SEO source and generator exist` because `scripts/seo-content.mjs` and `scripts/generate-seo-pages.mjs` do not exist.

- [ ] **Step 3: Implement the localized content source**

Create `scripts/seo-content.mjs`. Export the exact code list and native names below. Each language record must use the existing translated `title`, `description`, and `intro` from `seo.js`; add simple native-language headings, five truthful feature statements, three usage steps, and three FAQ pairs. The account feature and FAQ must say that Google-account synchronization is optional and avoid a real-time guarantee.

```js
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
```

Do not add untranslated English navigation labels or empty arrays. Preserve the product name exactly as `Azkar`.

- [ ] **Step 4: Implement the generator and shared stylesheet**

Create `scripts/generate-seo-pages.mjs` with HTML escaping, validation, deterministic rendering, and a command-line entry point. The renderer must generate semantic sections, localized navigation, Open Graph tags, JSON-LD, self-canonical, 15 alternates, and `x-default`.

```js
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGUAGE_CODES, LANGUAGE_NAMES, SEO_CONTENT } from './seo-content.mjs';

export const ORIGIN = 'https://sunnyberd.github.io';
export const BASE_PATH = '/Tasbih';

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

export function validateContent() {
  for (const code of LANGUAGE_CODES) {
    const item = SEO_CONTENT[code];
    if (!item) throw new Error(`Missing SEO content for ${code}`);
    for (const key of ['locale','title','description','h1','intro','featuresTitle','stepsTitle','faqTitle','cta','languageLabel','footer']) {
      if (!String(item[key] || '').trim()) throw new Error(`Missing ${code}.${key}`);
    }
    if (!Array.isArray(item.features) || item.features.length < 5) throw new Error(`Invalid ${code}.features`);
    if (!Array.isArray(item.steps) || item.steps.length !== 3) throw new Error(`Invalid ${code}.steps`);
    if (!Array.isArray(item.faq) || item.faq.length < 3) throw new Error(`Invalid ${code}.faq`);
  }
}

const alternateLinks = () => [
  ...LANGUAGE_CODES.map(code => `<link rel="alternate" hreflang="${code}" href="${ORIGIN}${BASE_PATH}/${code}/">`),
  `<link rel="alternate" hreflang="x-default" href="${ORIGIN}${BASE_PATH}/en/">`
].join('\n    ');

export function renderLandingPage(code) {
  validateContent();
  if (!LANGUAGE_CODES.includes(code)) throw new Error(`Unsupported language: ${code}`);
  const c = SEO_CONTENT[code];
  const url = `${ORIGIN}${BASE_PATH}/${code}/`;
  const featureItems = c.features.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const stepItems = c.steps.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const faqItems = c.faq.map(item => `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`).join('');
  const languageLinks = LANGUAGE_CODES.map(language => `<a href="${BASE_PATH}/${language}/" hreflang="${language}" lang="${language}">${escapeHtml(LANGUAGE_NAMES[language])}</a>`).join('');
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Azkar', url,
    applicationCategory: 'LifestyleApplication', operatingSystem: 'Any',
    isAccessibleForFree: true, inLanguage: code, description: c.description,
    image: `${ORIGIN}${BASE_PATH}/icon-512.png`,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
  }).replaceAll('<', '\\u003c');

  return `<!doctype html>
<html lang="${code}" dir="ltr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(c.title)}</title>
<meta name="description" content="${escapeHtml(c.description)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="${url}">
${alternateLinks()}
<meta property="og:type" content="website"><meta property="og:site_name" content="Azkar">
<meta property="og:title" content="${escapeHtml(c.title)}"><meta property="og:description" content="${escapeHtml(c.description)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${ORIGIN}${BASE_PATH}/icon-512.png">
<meta property="og:locale" content="${escapeHtml(c.locale)}"><meta name="twitter:card" content="summary">
<link rel="icon" href="${BASE_PATH}/icon-192.png"><link rel="stylesheet" href="${BASE_PATH}/seo-landing.css">
<script type="application/ld+json">${structuredData}</script></head>
<body><main><header class="hero"><img src="${BASE_PATH}/icon-192.png" width="96" height="96" alt="Azkar">
<p class="eyebrow">Azkar</p><h1>${escapeHtml(c.h1)}</h1><p class="intro">${escapeHtml(c.intro)}</p>
<a class="cta" href="${BASE_PATH}/?lang=${code}">${escapeHtml(c.cta)}</a></header>
<section><h2>${escapeHtml(c.featuresTitle)}</h2><ul class="features">${featureItems}</ul></section>
<section><h2>${escapeHtml(c.stepsTitle)}</h2><ol class="steps">${stepItems}</ol></section>
<section><h2>${escapeHtml(c.faqTitle)}</h2><div class="faq">${faqItems}</div></section>
<nav aria-label="${escapeHtml(c.languageLabel)}"><h2>${escapeHtml(c.languageLabel)}</h2><div class="languages">${languageLinks}</div></nav>
</main><footer>${escapeHtml(c.footer)}</footer></body></html>`;
}

export function renderSitemap(lastmod) {
  const urls = ['', ...LANGUAGE_CODES.map(code => `${code}/`)];
  const body = urls.map(path => `  <url>\n    <loc>${ORIGIN}${BASE_PATH}/${path}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export async function generateAll(rootDir, lastmod) {
  validateContent();
  await Promise.all(LANGUAGE_CODES.map(async code => {
    const directory = resolve(rootDir, code);
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, 'index.html'), renderLandingPage(code), 'utf8');
  }));
  await writeFile(resolve(rootDir, 'sitemap.xml'), renderSitemap(lastmod), 'utf8');
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  const rootDir = resolve(dirname(currentFile), '..');
  await generateAll(rootDir, process.argv[2] || new Date().toISOString().slice(0, 10));
}
```

Create `seo-landing.css` as the single source of the dark/gold responsive design. It must style `body`, `main`, `.hero`, headings, `.cta`, sections, feature/step cards, FAQ details, language links, focus states, reduced motion, and a one-column mobile layout. Keep it below 12 KB and do not load web fonts or third-party resources.

- [ ] **Step 5: Generate pages, run tests, and verify green**

Run:

```powershell
node scripts/generate-seo-pages.mjs 2026-07-21
node --test tests/seo-pages.test.mjs
```

Expected: 15 directories are created; all generator/content/page/sitemap tests PASS with no warnings.

- [ ] **Step 6: Commit Task 1 if Git becomes available**

```powershell
git add tests/seo-pages.test.mjs scripts/seo-content.mjs scripts/generate-seo-pages.mjs seo-landing.css sitemap.xml en de es fr it ja ko ru uz zh tr hi id ms th
git commit -m "feat: add multilingual SEO landing pages"
```

Expected in the current workspace: skip with a note because `.git` is absent.

---

### Task 2: Safe language handoff into the existing application

**Files:**
- Create: `tests/language-routing.test.cjs`
- Create: `language-routing.js`
- Modify: `index.html:before seo.js`

**Interfaces:**
- Produces `SUPPORTED_LANGUAGES: readonly string[]`.
- Produces `getRequestedLanguage(search: string): string | null`.
- Produces `persistRequestedLanguage(search: string, storage: StorageLike): string | null`.
- Browser execution exports `window.AZKAR_LANGUAGE_ROUTING` and automatically persists a valid query language before `seo.js` executes.

- [ ] **Step 1: Write the failing routing tests**

Create `tests/language-routing.test.cjs`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const { resolve } = require('node:path');

const modulePath = resolve(__dirname, '..', 'language-routing.js');

test('language routing module exists', () => {
  assert.equal(existsSync(modulePath), true);
});

test('accepts only supported lang query values', () => {
  assert.equal(existsSync(modulePath), true);
  const { getRequestedLanguage } = require(modulePath);
  assert.equal(getRequestedLanguage('?lang=ru'), 'ru');
  assert.equal(getRequestedLanguage('?foo=1&lang=uz'), 'uz');
  assert.equal(getRequestedLanguage('?lang=EN'), null);
  assert.equal(getRequestedLanguage('?lang=ar'), null);
  assert.equal(getRequestedLanguage('?lang='), null);
  assert.equal(getRequestedLanguage(''), null);
});

test('persists a valid language without discarding existing settings', () => {
  const { persistRequestedLanguage } = require(modulePath);
  const state = new Map([['azkar_settings', JSON.stringify({ theme: 'light', sound: false, language: 'en' })]]);
  const storage = { getItem: key => state.get(key) ?? null, setItem: (key, value) => state.set(key, value) };
  assert.equal(persistRequestedLanguage('?lang=th', storage), 'th');
  assert.deepEqual(JSON.parse(state.get('azkar_settings')), { theme: 'light', sound: false, language: 'th' });
});

test('does not write when the query language is absent or unsupported', () => {
  const { persistRequestedLanguage } = require(modulePath);
  let writes = 0;
  const storage = { getItem: () => null, setItem: () => { writes += 1; } };
  assert.equal(persistRequestedLanguage('?lang=ar', storage), null);
  assert.equal(persistRequestedLanguage('', storage), null);
  assert.equal(writes, 0);
});

test('recovers from malformed stored settings', () => {
  const { persistRequestedLanguage } = require(modulePath);
  let saved;
  const storage = { getItem: () => '{broken', setItem: (_key, value) => { saved = value; } };
  assert.equal(persistRequestedLanguage('?lang=ja', storage), 'ja');
  assert.deepEqual(JSON.parse(saved), { language: 'ja' });
});
```

- [ ] **Step 2: Run the routing tests and verify red**

Run:

```powershell
node --test tests/language-routing.test.cjs
```

Expected: FAIL because `language-routing.js` does not exist.

- [ ] **Step 3: Implement the minimal routing module**

Create `language-routing.js`:

```js
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
        return;
    }
    root.AZKAR_LANGUAGE_ROUTING = api;
    try { api.persistRequestedLanguage(root.location.search, root.localStorage); } catch (_) {}
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const SUPPORTED_LANGUAGES = Object.freeze([
        'en','de','es','fr','it','ja','ko','ru','uz','zh','tr','hi','id','ms','th'
    ]);

    function getRequestedLanguage(search) {
        let value;
        try { value = new URLSearchParams(String(search || '')).get('lang'); }
        catch (_) { return null; }
        return SUPPORTED_LANGUAGES.includes(value) ? value : null;
    }

    function persistRequestedLanguage(search, storage) {
        const language = getRequestedLanguage(search);
        if (!language || !storage) return null;
        let settings = {};
        try { settings = JSON.parse(storage.getItem('azkar_settings') || '{}') || {}; }
        catch (_) { settings = {}; }
        settings.language = language;
        storage.setItem('azkar_settings', JSON.stringify(settings));
        return language;
    }

    return Object.freeze({ SUPPORTED_LANGUAGES, getRequestedLanguage, persistRequestedLanguage });
});
```

Modify the root head so routing executes before `seo.js`:

```html
<script src="language-routing.js" defer></script>
<script src="seo.js" defer></script>
```

- [ ] **Step 4: Run routing and SEO tests and verify green**

Run:

```powershell
node --test tests/language-routing.test.cjs tests/seo-pages.test.mjs
```

Expected: all tests PASS with no warnings.

- [ ] **Step 5: Commit Task 2 if Git becomes available**

```powershell
git add language-routing.js tests/language-routing.test.cjs index.html
git commit -m "feat: open Azkar in landing page language"
```

Expected in the current workspace: skip with a note because `.git` is absent.

---

### Task 3: Root hreflang cluster and repository-wide SEO audit

**Files:**
- Modify: `tests/seo-pages.test.mjs`
- Modify: `index.html:after canonical`
- Verify: `robots.txt`
- Regenerate: `sitemap.xml` and all language pages

**Interfaces:**
- Root HTML exposes all 15 localized alternates plus English `x-default`.
- `robots.txt` points to `https://sunnyberd.github.io/Tasbih/sitemap.xml`.

- [ ] **Step 1: Add failing root integration assertions**

Append to `tests/seo-pages.test.mjs`:

```js
test('root application advertises all localized landing pages', () => {
  const rootHtml = readFileSync(resolve(root, 'index.html'), 'utf8');
  for (const code of expectedCodes) {
    assert.match(rootHtml, new RegExp(`rel="alternate" hreflang="${code}" href="https://sunnyberd\\.github\\.io/Tasbih/${code}/"`));
  }
  assert.match(rootHtml, /rel="alternate" hreflang="x-default" href="https:\/\/sunnyberd\.github\.io\/Tasbih\/en\/"/);
  assert.match(rootHtml, /<script src="language-routing\.js" defer><\/script>[\s\S]*<script src="seo\.js" defer><\/script>/);
});

test('robots file exposes the canonical sitemap', () => {
  const robots = readFileSync(resolve(root, 'robots.txt'), 'utf8');
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(robots, /^Sitemap: https:\/\/sunnyberd\.github\.io\/Tasbih\/sitemap\.xml$/m);
});
```

- [ ] **Step 2: Run the audit and verify the hreflang failure**

Run:

```powershell
node --test tests/seo-pages.test.mjs
```

Expected: FAIL because the root page does not yet contain the complete alternate link cluster.

- [ ] **Step 3: Add the root alternate links**

Immediately after the existing root canonical link, add 16 links in this exact order:

```html
<link rel="alternate" hreflang="en" href="https://sunnyberd.github.io/Tasbih/en/">
<link rel="alternate" hreflang="de" href="https://sunnyberd.github.io/Tasbih/de/">
<link rel="alternate" hreflang="es" href="https://sunnyberd.github.io/Tasbih/es/">
<link rel="alternate" hreflang="fr" href="https://sunnyberd.github.io/Tasbih/fr/">
<link rel="alternate" hreflang="it" href="https://sunnyberd.github.io/Tasbih/it/">
<link rel="alternate" hreflang="ja" href="https://sunnyberd.github.io/Tasbih/ja/">
<link rel="alternate" hreflang="ko" href="https://sunnyberd.github.io/Tasbih/ko/">
<link rel="alternate" hreflang="ru" href="https://sunnyberd.github.io/Tasbih/ru/">
<link rel="alternate" hreflang="uz" href="https://sunnyberd.github.io/Tasbih/uz/">
<link rel="alternate" hreflang="zh" href="https://sunnyberd.github.io/Tasbih/zh/">
<link rel="alternate" hreflang="tr" href="https://sunnyberd.github.io/Tasbih/tr/">
<link rel="alternate" hreflang="hi" href="https://sunnyberd.github.io/Tasbih/hi/">
<link rel="alternate" hreflang="id" href="https://sunnyberd.github.io/Tasbih/id/">
<link rel="alternate" hreflang="ms" href="https://sunnyberd.github.io/Tasbih/ms/">
<link rel="alternate" hreflang="th" href="https://sunnyberd.github.io/Tasbih/th/">
<link rel="alternate" hreflang="x-default" href="https://sunnyberd.github.io/Tasbih/en/">
```

- [ ] **Step 4: Regenerate and run the complete automated audit**

Run:

```powershell
node scripts/generate-seo-pages.mjs 2026-07-21
node --test tests/language-routing.test.cjs tests/seo-pages.test.mjs
node --check language-routing.js
node --check seo.js
node --check sw.js
```

Expected: all tests and syntax checks PASS; sitemap contains exactly 16 unique URLs; robots remains unchanged.

- [ ] **Step 5: Commit Task 3 if Git becomes available**

```powershell
git add index.html sitemap.xml tests/seo-pages.test.mjs en de es fr it ja ko ru uz zh tr hi id ms th
git commit -m "seo: connect localized pages with hreflang"
```

Expected in the current workspace: skip with a note because `.git` is absent.

---

### Task 4: Visual and navigation verification

**Files:**
- Inspect: `en/index.html`, `ru/index.html`, `uz/index.html`, `ja/index.html`, `ar/index.html` must not exist
- Inspect: `seo-landing.css`
- Inspect: root application language startup with all supported query values

**Interfaces:**
- Published-path simulation uses `http://127.0.0.1:8765/Tasbih/<language>/` by serving the parent directory of the project.

- [ ] **Step 1: Start a local static server from the parent directory**

Run from `C:\Users\Zephrix\Desktop`:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Expected: server listens on `127.0.0.1:8765` and exposes the project under `/Tasbih/`.

- [ ] **Step 2: Check representative desktop and mobile pages**

Open and inspect:

```text
http://127.0.0.1:8765/Tasbih/en/
http://127.0.0.1:8765/Tasbih/ru/
http://127.0.0.1:8765/Tasbih/uz/
http://127.0.0.1:8765/Tasbih/ja/
http://127.0.0.1:8765/Tasbih/th/
```

Expected at widths near 390 px and 1280 px: no horizontal overflow; readable localized type; visible H1, CTA, features, steps, FAQ, and language navigation; keyboard focus is visible.

- [ ] **Step 3: Verify language handoff behavior**

For each of the 15 values, open `http://127.0.0.1:8765/Tasbih/?lang=<code>` in a clean browser context and verify that the root application title, document language, and visible interface adopt the selected language. Open `?lang=ar` and verify it is ignored.

- [ ] **Step 4: Run final verification from a clean command invocation**

```powershell
node scripts/generate-seo-pages.mjs 2026-07-21
node --test tests/language-routing.test.cjs tests/seo-pages.test.mjs
node --check language-routing.js
node --check seo.js
node --check sw.js
```

Expected: generation succeeds; all tests pass; all syntax checks exit with code 0; no warnings or unexpected output.

- [ ] **Step 5: Prepare deployment handoff**

Confirm the final user actions are limited to uploading/pushing the new files to the GitHub Pages repository, waiting for deployment, submitting `https://sunnyberd.github.io/Tasbih/sitemap.xml` in Google Search Console, inspecting representative localized URLs, and requesting indexing for the root plus the highest-priority language pages.
