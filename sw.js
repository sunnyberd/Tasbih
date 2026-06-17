/**
 * Azkar PWA — Service Worker
 *
 * СТРАТЕГИЯ ТИХОГО АВТО-ОБНОВЛЕНИЯ:
 *  - Навигация (index.html — вся логика приложения внутри него) → Network-First.
 *    Онлайн-пользователи всегда получают свежий код при следующем открытии,
 *    БЕЗ всплывашек и без необходимости вручную менять версию кэша.
 *    Офлайн → отдаётся последняя сохранённая версия.
 *  - Локальные .js/.json (hadiths.js, manifest.json) → Stale-While-Revalidate:
 *    мгновенно из кэша + фоновое обновление к следующему запуску.
 *  - Иконки и Google Fonts → Cache-First (практически не меняются).
 *
 *  Новый SW активируется немедленно (skipWaiting + clients.claim) и тихо
 *  удаляет устаревшие кэши. Пользователь ничего не замечает — просто всегда
 *  работает с актуальной версией.
 */

// При каждом релизе можно (но НЕ обязательно) бампать версию — навигация
// и так network-first. Версия гарантирует полную чистку устаревших кэшей.
const CACHE_VERSION = 'v2';
const CACHE_NAME = `azkar-${CACHE_VERSION}`;
const OFFLINE_URL = './index.html';

// Файлы, которые кешируем сразу при установке
const PRECACHE_ASSETS = [
  './index.html',
  './manifest.json',
  './hadiths.js',
  './icon-192.png',
  './icon-512.png'
];

// Внешние домены, которые кешируем по запросу (runtime cache)
const CACHEABLE_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com'
];

// ─── УСТАНОВКА ────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      // Немедленно становимся активным SW, не дожидаясь закрытия вкладок
      .then(() => self.skipWaiting())
  );
});

// ─── АКТИВАЦИЯ ────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Удаляю старый кеш:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Пропускаем не-GET и chrome-extension запросы
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // Шрифты Google — Cache-First с долгим хранением
  if (CACHEABLE_ORIGINS.some(origin => request.url.startsWith(origin))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Запросы к внешним API (Aladhan и др.) — Network-Only, без кеша
  if (url.hostname !== self.location.hostname && !CACHEABLE_ORIGINS.some(o => request.url.startsWith(o))) {
    event.respondWith(networkOnly(request));
    return;
  }

  // ── Главный документ приложения (навигация) → Network-First ──
  // Гарантирует, что после обновления кода ВСЕ онлайн-пользователи
  // получают свежую версию при следующем открытии. Тихо, без всплывашек.
  if (request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // ── Локальные JS/JSON (hadiths.js, manifest.json) → Stale-While-Revalidate ──
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.json')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Остальная локальная статика (иконки и т.п.) — Cache-First
  event.respondWith(cacheFirst(request));
});

// ─── СТРАТЕГИИ ────────────────────────────────────────────────────────────────

/**
 * Network-First: всегда пробуем сеть (свежая версия), кэш — только офлайн-фолбэк.
 * Обновляет кэш свежим ответом, чтобы офлайн была доступна последняя версия.
 */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    const fallback = await cache.match(OFFLINE_URL);
    if (fallback) return fallback;
    throw err;
  }
}

/**
 * Stale-While-Revalidate: мгновенно отдаём из кэша, в фоне качаем свежее
 * и обновляем кэш к следующему запуску.
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then(response => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await networkFetch) || fetch(request);
}

/**
 * Cache-First: берём из кеша, если нет — качаем и кешируем
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    // Кешируем только успешные ответы
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Офлайн-фолбэк: вернуть главную страницу для навигационных запросов
    if (request.mode === 'navigate') {
      const fallback = await caches.match(OFFLINE_URL);
      if (fallback) return fallback;
    }
    throw err;
  }
}

/**
 * Network-Only: всегда идём в сеть (для API запросов)
 */
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (err) {
    // API недоступно офлайн — возвращаем пустой JSON
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ─── PUSH-УВЕДОМЛЕНИЯ ─────────────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Azkar', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'azkar-notification',
    renotify: true,
    data: { url: data.url || './' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Azkar', options)
  );
});

// ─── КЛИК ПО УВЕДОМЛЕНИЮ ──────────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Если приложение уже открыто — фокусируемся на нём
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Иначе открываем новое окно
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// ─── ФОНОВАЯ СИНХРОНИЗАЦИЯ (BackgroundSync API) ───────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'azkar-backup') {
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  console.log('[SW] Background sync: azkar-backup');
  // Уведомляем все открытые вкладки, чтобы они инициировали backup
  const allClients = await clients.matchAll({ includeUncontrolled: true });
  allClients.forEach(client => {
    client.postMessage({ type: 'BACKGROUND_SYNC', tag: 'azkar-backup' });
  });
}

// ─── СООБЩЕНИЯ ОТ ПРИЛОЖЕНИЯ ──────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (!event.data) return;

  switch (event.data.type) {
    // Принудительно обновить SW (вызывать при выходе новой версии)
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    // Получить версию кеша
    case 'GET_VERSION':
      event.ports?.[0]?.postMessage({ version: CACHE_NAME });
      break;

    // Очистить кеш вручную
    case 'CLEAR_CACHE':
      caches.delete(CACHE_NAME).then(() => {
        event.ports?.[0]?.postMessage({ ok: true });
      });
      break;
  }
});
