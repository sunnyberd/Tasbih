/* ╔══════════════════════════════════════════════════════════════════╗
 * ║                 SERVICE WORKER — Azkar / Tasbih PWA               ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  Отвечает за:                                                     ║
 * ║   • офлайн-работу (кэш app-shell + ресурсы)                       ║
 * ║   • мгновенное обновление (SKIP_WAITING)                          ║
 * ║   • фоновые уведомления: хадисы, напоминания                     ║
 * ║   • фаджр-бэкап при закрытом приложении                          ║
 * ║                                                                  ║
 * ║  ВАЖНО: при изменении кэшируемых файлов поднимай CACHE_VERSION,   ║
 * ║  чтобы у пользователей подтянулась новая версия.                 ║
 * ╚══════════════════════════════════════════════════════════════════╝ */

'use strict';

// При любом изменении статических файлов меняй версию — это сбросит старый кэш.
const CACHE_VERSION = 'azkar-v1';
const SCOPE = '/Tasbih/';

// App-shell — файлы, которые нужны для запуска приложения офлайн.
const APP_SHELL = [
    '/Tasbih/',
    '/Tasbih/index.html',
    '/Tasbih/hadiths.js',
    '/Tasbih/manifest.json',
    '/Tasbih/icon-192.png',
    '/Tasbih/icon-512.png',
];

// ──────────────────────────────────────────────────────────────────────
//  INSTALL — предзагружаем app-shell в кэш
// ──────────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) =>
            // addAll падает целиком, если хоть один файл недоступен,
            // поэтому добавляем по одному и игнорируем единичные ошибки.
            Promise.all(
                APP_SHELL.map((url) =>
                    cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
                )
            )
        )
    );
    // Не ждём закрытия всех вкладок — новый SW готов сразу.
    self.skipWaiting();
});

// ──────────────────────────────────────────────────────────────────────
//  ACTIVATE — удаляем старые версии кэша и берём управление страницами
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
//   • навигация/HTML  → network-first (свежая версия, фолбэк на кэш офлайн)
//   • остальные GET    → stale-while-revalidate (быстро + обновление в фоне)
// ──────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const req = event.request;

    // Обрабатываем только GET; POST/прочее пропускаем напрямую.
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // Сторонние запросы (например Google Fonts) — кэшируем мягко (SWR),
    // но не ломаем загрузку, если сеть недоступна.
    const sameOrigin = url.origin === self.location.origin;

    // Навигационные запросы (открытие/перезагрузка приложения).
    const isNavigation =
        req.mode === 'navigate' ||
        (req.headers.get('accept') || '').includes('text/html');

    if (isNavigation && sameOrigin) {
        event.respondWith(
            (async () => {
                try {
                    const fresh = await fetch(req);
                    const cache = await caches.open(CACHE_VERSION);
                    cache.put(req, fresh.clone());
                    return fresh;
                } catch (e) {
                    // Офлайн — отдаём кэш страницы или index.html как фолбэк.
                    const cached =
                        (await caches.match(req)) ||
                        (await caches.match('/Tasbih/index.html')) ||
                        (await caches.match('/Tasbih/'));
                    return cached || Response.error();
                }
            })()
        );
        return;
    }

    // Stale-while-revalidate для статики и шрифтов.
    event.respondWith(
        (async () => {
            const cached = await caches.match(req);
            const network = fetch(req)
                .then((res) => {
                    // Кэшируем только успешные ответы (basic/cors, status 200).
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
//  может «усыпить» SW — это ограничение платформы (не баг). Для надёжных
//  отложенных уведомлений нужен Push-сервер. Здесь реализован best-effort
//  поверх того протокола сообщений, который ждёт index.html.
// ──────────────────────────────────────────────────────────────────────
let reminderTimer = null;
let hadithTimer = null;
let hadithConfig = null;       // { items, title, minMs, maxMs, icon, badge }
let fajrBackup = null;         // { fajrMs, today }
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
            icon: data.icon || '/Tasbih/icon-192.png',
            badge: data.badge || '/Tasbih/icon-192.png',
            tag: 'azkar-reminder',
            renotify: true,
            data: { url: SCOPE },
        });
        // Перепланируем на следующий день (24 ч), пока SW жив.
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

        // Если приложение открыто — просим страницу показать баннер.
        const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const visible = clientsList.some((c) => c.visibilityState === 'visible');

        if (visible) {
            clientsList.forEach((c) => c.postMessage({ type: 'SHOW_HADITH', text }));
        } else {
            // Свёрнуто/закрыто — системное уведомление (если разрешено).
            try {
                await self.registration.showNotification(cfg.title || 'Хадис', {
                    body: text,
                    icon: cfg.icon || '/Tasbih/icon-192.png',
                    badge: cfg.badge || '/Tasbih/icon-192.png',
                    tag: 'azkar-hadith',
                    renotify: true,
                    data: { url: SCOPE },
                });
            } catch (e) {}
        }
        // Планируем следующий хадис.
        scheduleHadith(hadithConfig);
    }, delay);
}

function clearFajr() {
    if (fajrTimer) { clearTimeout(fajrTimer); fajrTimer = null; }
    fajrBackup = null;
}

function scheduleFajrBackup(data) {
    if (fajrTimer) { clearTimeout(fajrTimer); fajrTimer = null; }
    fajrBackup = data;
    const now = Date.now();
    let delay = Number(data.fajrMs) - now;
    // Если время фаджра уже прошло сегодня — планируем на завтра.
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
    const targetUrl = (event.notification.data && event.notification.data.url) || SCOPE;
    event.waitUntil(
        (async () => {
            const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            for (const client of clientsList) {
                if (client.url.includes(SCOPE) && 'focus' in client) {
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
//  PUSH — поддержка пуш-уведомлений (если в будущем добавите Push-сервер)
// ──────────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
    let payload = {};
    try { payload = event.data ? event.data.json() : {}; } catch (e) {
        payload = { body: event.data ? event.data.text() : '' };
    }
    event.waitUntil(
        self.registration.showNotification(payload.title || 'Azkar', {
            body: payload.body || '',
            icon: payload.icon || '/Tasbih/icon-192.png',
            badge: payload.badge || '/Tasbih/icon-192.png',
            tag: payload.tag || 'azkar-push',
            renotify: true,
            data: { url: payload.url || SCOPE },
        })
    );
});
