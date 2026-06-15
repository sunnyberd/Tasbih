/* ╔══════════════════════════════════════════════════════════════════╗
 * ║                 SERVICE WORKER — Azkar PWA                       ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  Отвечает за:                                                     ║
 * ║   • офлайн-работу (кэш app-shell + ресурсы)                       ║
 * ║   • ПРИНУДИТЕЛЬНОЕ обновление: при онлайне всегда берётся свежая  ║
 * ║     версия из сети, кэш — только запасной вариант для офлайна.    ║
 * ║   • мгновенную активацию (SKIP_WAITING) и снос старых кэшей       ║
 * ║   • фоновые уведомления: хадисы, напоминания                     ║
 * ║   • фаджр-бэкап при закрытом приложении                          ║
 * ║                                                                  ║
 * ║  Все пути относительные → не зависят от имени папки/репозитория. ║
 * ║                                                                  ║
 * ║  ПРИ ЛЮБОМ ИЗМЕНЕНИИ ФАЙЛОВ поднимай число в CACHE_VERSION —      ║
 * ║  это гарантированно сбросит старый кэш у всех пользователей.     ║
 * ╚══════════════════════════════════════════════════════════════════╝ */

'use strict';

// ⬇️ ПОДНИМАЙ ЭТО ЧИСЛО ПРИ КАЖДОМ ОБНОВЛЕНИИ ПРИЛОЖЕНИЯ ⬇️
const CACHE_VERSION = 'azkar-v2';

// Все ресурсы кэшируем по относительным путям (резолвятся от расположения sw.js).
const APP_SHELL = [
    './',
    './index.html',
    './hadiths.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
];

// ──────────────────────────────────────────────────────────────────────
//  INSTALL — предзагружаем app-shell в кэш и сразу активируемся
// ──────────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) =>
            // Добавляем по одному и игнорируем единичные ошибки, чтобы
            // недоступность одного файла не сорвала установку целиком.
            Promise.all(
                APP_SHELL.map((url) =>
                    cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
                )
            )
        )
    );
    // Новый воркер готов сразу, не ждём закрытия вкладок.
    self.skipWaiting();
});

// ──────────────────────────────────────────────────────────────────────
//  ACTIVATE — сносим ВСЕ старые версии кэша и берём управление страницами
// ──────────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
            );
            await self.clients.claim();
        })()
    );
});

// ──────────────────────────────────────────────────────────────────────
//  FETCH — стратегии кэширования
//   • свои файлы (same-origin) → NETWORK-FIRST: всегда тянем свежее из
//     сети, обновляем кэш; офлайн → отдаём из кэша. Это и есть
//     «принудительное обновление» — старый кэш не залипает.
//   • сторонние (шрифты/CDN)   → stale-while-revalidate (быстро + фон).
// ──────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    const sameOrigin = url.origin === self.location.origin;

    if (sameOrigin) {
        // NETWORK-FIRST для всех своих ресурсов.
        event.respondWith(
            (async () => {
                try {
                    // cache: 'no-store' для навигации/HTML гарантирует свежий ответ.
                    const fresh = await fetch(req);
                    if (fresh && fresh.status === 200) {
                        const cache = await caches.open(CACHE_VERSION);
                        cache.put(req, fresh.clone());
                    }
                    return fresh;
                } catch (e) {
                    // Офлайн — отдаём из кэша, с фолбэком на стартовую страницу.
                    const cached =
                        (await caches.match(req)) ||
                        (await caches.match('./index.html')) ||
                        (await caches.match('./'));
                    return cached || Response.error();
                }
            })()
        );
        return;
    }

    // Сторонние запросы — stale-while-revalidate.
    event.respondWith(
        (async () => {
            const cached = await caches.match(req);
            const network = fetch(req)
                .then((res) => {
                    if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
                        caches.open(CACHE_VERSION).then((cache) => cache.put(req, res.clone()));
                    }
                    return res;
                })
                .catch(() => null);
            return cached || (await network) || Response.error();
        })()
    );
});

// ──────────────────────────────────────────────────────────────────────
//  ТАЙМЕРЫ УВЕДОМЛЕНИЙ
//  ВНИМАНИЕ: setTimeout в SW работает, только пока воркер жив. Браузер
//  может «усыпить» SW — это ограничение платформы. Для гарантированной
//  фоновой доставки нужен Push-сервер (обработчик push заложен ниже).
// ──────────────────────────────────────────────────────────────────────
let reminderTimer = null;
let hadithTimer = null;
let hadithConfig = null;
let fajrTimer = null;

function clearReminder() {
    if (reminderTimer) { clearTimeout(reminderTimer); reminderTimer = null; }
}

function scheduleReminder(data) {
    clearReminder();
    const delay = Math.max(0, Number(data.delayMs) || 0);
    reminderTimer = setTimeout(() => {
        self.registration.showNotification(data.title || 'Azkar', {
            body: data.body || '',
            icon: data.icon || './icon-192.png',
            badge: data.badge || './icon-192.png',
            tag: 'azkar-reminder',
            renotify: true,
            data: { url: './' },
        });
        scheduleReminder({ ...data, delayMs: 24 * 60 * 60 * 1000 });
    }, delay);
}

function clearHadith() {
    if (hadithTimer) { clearTimeout(hadithTimer); hadithTimer = null; }
    hadithConfig = null;
}

function randomBetween(min, max) {
    min = Number(min) || 0;
    max = Number(max) || min;
    if (max < min) max = min;
    return min + Math.random() * (max - min);
}

function scheduleHadith(cfg) {
    if (hadithTimer) { clearTimeout(hadithTimer); hadithTimer = null; }
    if (!cfg || !Array.isArray(cfg.items) || !cfg.items.length) { hadithConfig = null; return; }
    hadithConfig = cfg;
    const delay = randomBetween(cfg.minMs, cfg.maxMs);
    hadithTimer = setTimeout(async () => {
        const text = cfg.items[Math.floor(Math.random() * cfg.items.length)];
        const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const visible = clientsList.some((c) => c.visibilityState === 'visible');

        if (visible) {
            clientsList.forEach((c) => c.postMessage({ type: 'SHOW_HADITH', text }));
        } else {
            try {
                await self.registration.showNotification(cfg.title || 'Хадис', {
                    body: text,
                    icon: cfg.icon || './icon-192.png',
                    badge: cfg.badge || './icon-192.png',
                    tag: 'azkar-hadith',
                    renotify: true,
                    data: { url: './' },
                });
            } catch (e) {}
        }
        scheduleHadith(hadithConfig);
    }, delay);
}

function scheduleFajrBackup(data) {
    if (fajrTimer) { clearTimeout(fajrTimer); fajrTimer = null; }
    const now = Date.now();
    let delay = Number(data.fajrMs) - now;
    if (delay < 0) delay += 24 * 60 * 60 * 1000;
    delay = Math.max(0, delay);
    fajrTimer = setTimeout(async () => {
        const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        clientsList.forEach((c) => c.postMessage({ type: 'FAJR_BACKUP_DATA', today: data.today }));
    }, delay);
}

// ──────────────────────────────────────────────────────────────────────
//  MESSAGE — протокол общения со страницей (index.html)
// ──────────────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
    const msg = event.data || {};
    switch (msg.type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
        case 'SCHEDULE_REMINDER':
            scheduleReminder(msg);
            break;
        case 'CANCEL_REMINDER':
            clearReminder();
            break;
        case 'SCHEDULE_HADITH':
            scheduleHadith(msg);
            break;
        case 'CANCEL_HADITH':
            clearHadith();
            break;
        case 'SCHEDULE_FAJR_BACKUP':
            scheduleFajrBackup(msg);
            break;
        default:
            break;
    }
});

// ──────────────────────────────────────────────────────────────────────
//  PERIODIC SYNC — фаджр-бэкап (Android, при поддержке браузера)
// ──────────────────────────────────────────────────────────────────────
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'fajr-backup') {
        event.waitUntil(
            (async () => {
                const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
                const today = new Date().toISOString().slice(0, 10);
                clientsList.forEach((c) => c.postMessage({ type: 'FAJR_BACKUP_DATA', today }));
            })()
        );
    }
});

// ──────────────────────────────────────────────────────────────────────
//  NOTIFICATION CLICK — открываем/фокусируем приложение
// ──────────────────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = new URL(
        (event.notification.data && event.notification.data.url) || './',
        self.registration.scope
    ).href;
    event.waitUntil(
        (async () => {
            const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            for (const client of clientsList) {
                if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        })()
    );
});

// ──────────────────────────────────────────────────────────────────────
//  PUSH — поддержка пуш-уведомлений (на будущее, при наличии Push-сервера)
// ──────────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
    let payload = {};
    try { payload = event.data ? event.data.json() : {}; } catch (e) {
        payload = { body: event.data ? event.data.text() : '' };
    }
    event.waitUntil(
        self.registration.showNotification(payload.title || 'Azkar', {
            body: payload.body || '',
            icon: payload.icon || './icon-192.png',
            badge: payload.badge || './icon-192.png',
            tag: payload.tag || 'azkar-push',
            renotify: true,
            data: { url: payload.url || './' },
        })
    );
});
