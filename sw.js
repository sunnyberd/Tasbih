// ===== Azkar PWA Service Worker =====
// Версия: v75 — кнопка «Написать» открывает feedback.html. Кэш сброшен.
// Версия: v71 — напоминание о зикре два раза в день (~12:00 и ~22:00) через SCHEDULE_EVENTS.
// v70 — дуа Абу Умамы: Фаджр и Аср (через 15 минут после намаза), новые тексты и иконка.
// v69 — добавлены уведомления времён намазов и зикра Абу Умамы
// (SCHEDULE_EVENTS / CANCEL_EVENTS — список событий с точным временем от страницы).
// v68 — хадисы раз в 2–4 часа (тестовая минута убрана); страница
// присылает SW точное время первого показа (firstDelayMs), дальше SW сам берёт
// случайный интервал 2–4 ч; после системного уведомления SW сообщает странице
// (HADITH_NOTIFIED), чтобы та начала новое окно; в настройках снова есть
// переключатель хадисов.
// Бампать CACHE_NAME при каждом релизе → activate-handler выкинет старый кэш.
const CACHE_NAME = 'azkar-v75';

// ===== УСТАНОВКА И КЭШ =====
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// ===== REMINDER ALARM SYSTEM =====
// SW хранит таймер в своём контексте — живёт дольше, чем страница.
// На Android Chrome SW может жить в фоне и реально показывать уведомление.

let _reminderTimer = null;
let _reminderConfig = null; // { delayMs, title, body, icon, badge, reminderTime }

function clearReminderTimer() {
    if (_reminderTimer !== null) {
        clearTimeout(_reminderTimer);
        _reminderTimer = null;
    }
}

function scheduleReminder(config) {
    clearReminderTimer();
    _reminderConfig = config;

    const { delayMs, title, body, icon, badge, reminderTime } = config;

    // Защита: не ставим таймер более чем на 25 часов (лимит некоторых браузеров)
    const safeDelay = Math.min(delayMs, 25 * 60 * 60 * 1000);

    _reminderTimer = setTimeout(async () => {
        _reminderTimer = null;

        // Показываем уведомление через SW — работает без открытой вкладки
        try {
            await self.registration.showNotification(title, {
                body,
                icon,
                badge,
                tag: 'azkar-reminder',
                renotify: true,
                requireInteraction: false,
                vibrate: [200, 100, 200],
                data: { url: self.registration.scope }
            });
        } catch(e) {}

        // Перепланируем на следующий день автоматически
        if (_reminderConfig) {
            const [h, m] = (reminderTime || '14:00').split(':').map(Number);
            const now = new Date();
            const target = new Date(now);
            target.setHours(h, m, 0, 0);
            target.setDate(target.getDate() + 1); // всегда завтра после срабатывания
            const nextDelay = target - now;
            scheduleReminder({ ..._reminderConfig, delayMs: nextDelay });
        }
    }, safeDelay);
}

// ===== HADITH RANDOM NOTIFICATIONS =====
// Случайный показ хадиса раз в 2–4 часа. Если приложение открыто — шлём
// сообщение странице (баннер). Если свёрнуто/закрыто и SW ещё жив — системное
// уведомление. ВАЖНО (PWA): когда приложение полностью закрыто надолго, ОС
// может усыпить SW, поэтому фоновые уведомления — «по возможности», без гарантии.
let _hadithTimer = null;
let _hadithCfg = null; // { items, title, minMs, maxMs, icon, badge }

function clearHadithTimer() {
    if (_hadithTimer !== null) { clearTimeout(_hadithTimer); _hadithTimer = null; }
}

function scheduleHadith(cfg, firstDelayMs) {
    clearHadithTimer();
    if (cfg) _hadithCfg = cfg;
    const c = _hadithCfg;
    if (!c || !Array.isArray(c.items) || !c.items.length) return;
    const min = c.minMs || (2 * 60 * 60 * 1000);
    const max = c.maxMs || (4 * 60 * 60 * 1000);
    let delay = min + Math.floor(Math.random() * Math.max(1, max - min));
    // Первый показ — ровно в то время, которое сохранила страница (если прислала)
    if (typeof firstDelayMs === 'number' && firstDelayMs > 0) delay = firstDelayMs;
    delay = Math.min(delay, 25 * 60 * 60 * 1000);
    _hadithTimer = setTimeout(fireHadith, delay);
}

function fireHadith() {
    _hadithTimer = null;
    const c = _hadithCfg;
    if (!c || !c.items || !c.items.length) return;
    const text = c.items[Math.floor(Math.random() * c.items.length)];
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        const visible = clients.find(cl => cl.visibilityState === 'visible');
        if (visible) {
            clients.forEach(cl => cl.postMessage({ type: 'SHOW_HADITH', text: text }));
        } else {
            self.registration.showNotification(c.title || 'Hadith', {
                body: text,
                icon: c.icon,
                badge: c.badge,
                tag: 'azkar-hadith',
                renotify: true,
                requireInteraction: false,
                data: { url: self.registration.scope }
            }).then(() => {
                // Сообщаем странице (если она где-то жива), что хадис уже показан
                clients.forEach(cl => cl.postMessage({ type: 'HADITH_NOTIFIED' }));
            }).catch(() => {});
        }
        scheduleHadith(); // перепланируем следующий случайный интервал 2–4 ч
    }).catch(() => { scheduleHadith(); });
}

// ===== ПРИЁМ СООБЩЕНИЙ ОТ СТРАНИЦЫ =====
self.addEventListener('message', (event) => {
    const { type } = event.data || {};

    if (type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (type === 'SCHEDULE_REMINDER') {
        scheduleReminder(event.data);
    }

    if (type === 'CANCEL_REMINDER') {
        clearReminderTimer();
        _reminderConfig = null;
    }

    if (type === 'SCHEDULE_HADITH') {
        scheduleHadith(event.data, event.data.firstDelayMs);
    }

    if (type === 'CANCEL_HADITH') {
        clearHadithTimer();
        _hadithCfg = null;
    }

    if (type === 'SCHEDULE_EVENTS') {
        scheduleEvents(event.data);
    }

    if (type === 'CANCEL_EVENTS') {
        clearEventTimer();
        _evList = [];
    }
});

// ===== PRAYER / ABU UMAMAH EVENT NOTIFICATIONS =====
// Страница присылает список событий { ts, tag, title, body } (на сегодня и завтра).
// SW ставит таймер на ближайшее. Если приложение открыто и видимо — уведомление
// показывает сама страница (баннер), SW молчит. Если свёрнуто — системное уведомление.
// Фон «по возможности»: ОС может усыпить SW у полностью закрытого PWA.
let _evList = [];
let _evTimer = null;
let _evCfg = { icon: 'icon-192.png', badge: 'icon-192.png' };
const _evFiredTags = new Set();

function clearEventTimer() {
    if (_evTimer !== null) { clearTimeout(_evTimer); _evTimer = null; }
}

function scheduleEvents(data) {
    clearEventTimer();
    _evCfg = { icon: data.icon || _evCfg.icon, badge: data.badge || _evCfg.badge };
    const now = Date.now();
    _evList = (data.events || [])
        .filter(e => e && typeof e.ts === 'number' && e.ts > now - 30000 && !_evFiredTags.has(e.tag))
        .sort((a, b) => a.ts - b.ts);
    armNextEvent();
}

function armNextEvent() {
    clearEventTimer();
    if (!_evList.length) return;
    const delay = Math.max(0, Math.min(_evList[0].ts - Date.now(), 25 * 60 * 60 * 1000));
    _evTimer = setTimeout(fireDueEvents, delay);
}

function fireDueEvents() {
    _evTimer = null;
    const now = Date.now();
    const due = [];
    while (_evList.length && _evList[0].ts <= now + 1000) due.push(_evList.shift());
    if (!due.length) { armNextEvent(); return; }
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        const visible = clients.some(cl => cl.visibilityState === 'visible');
        due.forEach(ev => {
            if (_evFiredTags.has(ev.tag)) return;
            _evFiredTags.add(ev.tag);
            if (visible) return; // страница сама покажет баннер
            self.registration.showNotification(ev.title, {
                body: ev.body,
                icon: _evCfg.icon,
                badge: _evCfg.badge,
                tag: ev.tag,
                renotify: false,
                requireInteraction: false,
                data: { url: self.registration.scope }
            }).catch(() => {});
        });
        armNextEvent();
    }).catch(() => { armNextEvent(); });
}

// ===== КЛИК ПО УВЕДОМЛЕНИЮ — открыть приложение =====
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = (event.notification.data && event.notification.data.url)
        ? event.notification.data.url
        : self.registration.scope;

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            // Если приложение уже открыто — фокусируемся на нём
            const existing = clients.find(c => c.url.startsWith(self.registration.scope));
            if (existing) {
                return existing.focus();
            }
            // Иначе открываем новую вкладку
            return self.clients.openWindow(targetUrl);
        })
    );
});

// ===== FETCH — гибридная стратегия =====
// HTML / навигационные запросы: network-first (свежий контент всегда выигрывает,
//   кэш остаётся как fallback на случай оффлайна). Так пользователь сразу
//   видит новые версии после деплоя без необходимости вручную чистить кэш.
// Остальная статика (картинки, манифест, иконки): cache-first для скорости.
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith(self.registration.scope)) return;

    const isHtml = event.request.mode === 'navigate'
        || (event.request.headers.get('accept') || '').includes('text/html');

    if (isHtml) {
        // Network-first: пробуем сеть, при неудаче — кэш.
        event.respondWith(
            fetch(event.request).then(response => {
                if (response && response.status === 200) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                }
                return response;
            }).catch(() =>
                caches.open(CACHE_NAME).then(cache => cache.match(event.request))
            )
        );
        return;
    }

    // Cache-first для статики: мгновенный ответ, фоновое обновление.
    event.respondWith(
        caches.open(CACHE_NAME).then(cache =>
            cache.match(event.request).then(cached => {
                const fetchPromise = fetch(event.request).then(response => {
                    if (response && response.status === 200) {
                        cache.put(event.request, response.clone());
                    }
                    return response;
                }).catch(() => cached);
                return cached || fetchPromise;
            })
        )
    );
});

// Хранит время фаджра которое прислало приложение
let _fajrMs = null;
let _fajrToday = null;
let _fajrTimer = null;

// Слушаем сообщения от приложения
self.addEventListener('message', function(e) {
    if (!e.data) return;

    // Существующие обработчики (SKIP_WAITING, SCHEDULE_REMINDER и т.д.) — не трогаем

    if (e.data.type === 'SCHEDULE_FAJR_BACKUP') {
        _fajrMs = e.data.fajrMs;
        _fajrToday = e.data.today;
        _scheduleFajrBackup();
    }
});

function _scheduleFajrBackup() {
    if (_fajrTimer) { clearTimeout(_fajrTimer); _fajrTimer = null; }
    if (!_fajrMs) return;

    const now = Date.now();
    let fajrMs = _fajrMs;

    // Если фаджр уже прошёл — ставим на завтра
    if (fajrMs <= now) {
        fajrMs += 86400000;
    }

    const delay = fajrMs - now;
    console.log('[SW Backup] Next fajr backup in', Math.round(delay / 60000), 'min');

    _fajrTimer = setTimeout(function() {
        _doFajrBackup();
        // Планируем следующий день
        _fajrMs = fajrMs + 86400000;
        _fajrToday = new Date(fajrMs).toISOString().slice(0, 10);
        _scheduleFajrBackup();
    }, delay);
}

function _doFajrBackup() {
    const today = new Date().toISOString().slice(0, 10);
    // Резервная копия делается только когда приложение открыто (в нём живут данные).
    // Если приложение открыто — просим его сохранить бэкап.
    // Если закрыто — ничего не показываем: копия сохранится сама при следующем заходе.
    return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
        clients.forEach(function(client) {
            client.postMessage({ type: 'FAJR_BACKUP_DATA', today: today });
        });
    });
}

// Periodic Background Sync (Android Chrome)
self.addEventListener('periodicsync', function(e) {
    if (e.tag === 'fajr-backup') {
        e.waitUntil(_doFajrBackup());
    }
});
