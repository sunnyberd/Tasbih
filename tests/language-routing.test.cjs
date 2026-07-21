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
  const storage = {
    getItem: key => state.get(key) ?? null,
    setItem: (key, value) => state.set(key, value)
  };
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
