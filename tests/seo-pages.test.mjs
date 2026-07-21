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
  assert.match(html, /href="\/Tasbih\/\?lang=ru"/);
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

test('root application advertises all localized landing pages', () => {
  const rootHtml = readFileSync(resolve(root, 'index.html'), 'utf8');
  for (const code of expectedCodes) {
    assert.match(rootHtml, new RegExp(`rel="alternate" hreflang="${code}" href="https://sunnyberd\\.github\\.io/Tasbih/${code}/"`));
  }
  assert.match(rootHtml, /rel="alternate" hreflang="x-default" href="https:\/\/sunnyberd\.github\.io\/Tasbih\/en\/"/);
  assert.match(rootHtml, /<script src="language-routing\.js"><\/script>[\s\S]*<script src="seo\.js" defer><\/script>/);
});

test('robots file exposes the canonical sitemap', () => {
  const robots = readFileSync(resolve(root, 'robots.txt'), 'utf8');
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(robots, /^Sitemap: https:\/\/sunnyberd\.github\.io\/Tasbih\/sitemap\.xml$/m);
});
