import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGUAGE_CODES, LANGUAGE_NAMES, SEO_CONTENT } from './seo-content.mjs';

export const ORIGIN = 'https://sunnyberd.github.io';
export const BASE_PATH = '/Tasbih';

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

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

  const content = SEO_CONTENT[code];
  const url = `${ORIGIN}${BASE_PATH}/${code}/`;
  const featureItems = content.features.map(item => `<li>${escapeHtml(item)}</li>`).join('\n          ');
  const stepItems = content.steps.map(item => `<li>${escapeHtml(item)}</li>`).join('\n          ');
  const faqItems = content.faq.map(item => `
        <details>
          <summary>${escapeHtml(item.question)}</summary>
          <p>${escapeHtml(item.answer)}</p>
        </details>`).join('');
  const languageLinks = LANGUAGE_CODES.map(language =>
    `<a href="${BASE_PATH}/${language}/" hreflang="${language}" lang="${language}"${language === code ? ' aria-current="page"' : ''}>${escapeHtml(LANGUAGE_NAMES[language])}</a>`
  ).join('\n          ');
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Azkar',
    url,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Any',
    isAccessibleForFree: true,
    inLanguage: code,
    description: content.description,
    image: `${ORIGIN}${BASE_PATH}/icon-512.png`,
    featureList: content.features,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
  }).replaceAll('<', '\\u003c');

  return `<!doctype html>
<html lang="${code}" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(content.title)}</title>
  <meta name="description" content="${escapeHtml(content.description)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
  <link rel="canonical" href="${url}">
    ${alternateLinks()}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Azkar">
  <meta property="og:title" content="${escapeHtml(content.title)}">
  <meta property="og:description" content="${escapeHtml(content.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${ORIGIN}${BASE_PATH}/icon-512.png">
  <meta property="og:image:alt" content="Azkar">
  <meta property="og:locale" content="${escapeHtml(content.locale)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(content.title)}">
  <meta name="twitter:description" content="${escapeHtml(content.description)}">
  <meta name="twitter:image" content="${ORIGIN}${BASE_PATH}/icon-512.png">
  <link rel="icon" type="image/png" sizes="192x192" href="${BASE_PATH}/icon-192.png">
  <link rel="apple-touch-icon" href="${BASE_PATH}/icon-192.png">
  <link rel="manifest" href="${BASE_PATH}/manifest.json">
  <link rel="stylesheet" href="${BASE_PATH}/seo-landing.css">
  <script type="application/ld+json">${structuredData}</script>
</head>
<body>
  <main>
    <header class="hero">
      <img class="app-icon" src="${BASE_PATH}/icon-192.png" width="96" height="96" alt="Azkar">
      <p class="eyebrow">Azkar</p>
      <h1>${escapeHtml(content.h1)}</h1>
      <p class="intro">${escapeHtml(content.intro)}</p>
      <a class="cta" href="${BASE_PATH}/?lang=${code}">${escapeHtml(content.cta)}</a>
    </header>

    <section aria-labelledby="features-title">
      <h2 id="features-title">${escapeHtml(content.featuresTitle)}</h2>
      <ul class="features">
          ${featureItems}
      </ul>
    </section>

    <section aria-labelledby="steps-title">
      <h2 id="steps-title">${escapeHtml(content.stepsTitle)}</h2>
      <ol class="steps">
          ${stepItems}
      </ol>
    </section>

    <section aria-labelledby="faq-title">
      <h2 id="faq-title">${escapeHtml(content.faqTitle)}</h2>
      <div class="faq">${faqItems}
      </div>
    </section>

    <nav aria-labelledby="language-title">
      <h2 id="language-title">${escapeHtml(content.languageLabel)}</h2>
      <div class="languages">
          ${languageLinks}
      </div>
    </nav>
  </main>
  <footer>${escapeHtml(content.footer)}</footer>
</body>
</html>
`;
}

export function renderSitemap(lastmod) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) throw new Error('lastmod must use YYYY-MM-DD');
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
