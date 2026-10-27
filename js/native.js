// Azkar — связка с нативным Android-приложением (папка android-app/, Capacitor).
// В обычном браузере ничего не делает. В APK:
//   1. navigator.vibrate идёт в нативную вибрацию через канал «будильника» —
//      работает, даже когда вибрация в настройках телефона выключена;
//   2. плавающий счётчик (настройка pipCounter) висит поверх всех приложений
//      и внутри Azkar, пока настройка включена, в цветах текущей темы.
//      Тапы по нему засчитываются здесь;
//   3. в тёмном режиме зикра скрываются строка состояния и кнопки навигации.
// Подключается после js/app.js — использует его глобальные settings, pipTap, togglePipCounter, showToast.

(function () {
    var C = window.Capacitor;
    if (!C || !C.isNativePlatform || !C.isNativePlatform() || C.getPlatform() !== 'android') return;
    // @capacitor/core (registerPlugin) на страницу не подключён — зовём плагин
    // напрямую через мост, который Capacitor сам внедряет в WebView.
    var N = new Proxy({}, {
        get: function (_, method) {
            if (method === 'addListener') {
                return function (ev, cb) { return C.addListener('TasbihNative', ev, cb); };
            }
            return function (opts) { return C.nativePromise('TasbihNative', method, opts || {}); };
        }
    });

    var status = {};

    // Web Client ID из Firebase: Authentication → Sign-in method → Google →
    // «Конфигурация Web SDK» → Web client ID. Без него вход через Google в APK не работает.
    var GOOGLE_WEB_CLIENT_ID = '939307317987-tlo9797ceo1hc3tejjfdhp6b7qodlqfj.apps.googleusercontent.com';

    // ---- Вход через Google (app.js → signInWithGoogle) ----
    window.AzkarNative = {
        googleIdToken: function () {
            return N.googleSignIn({ webClientId: GOOGLE_WEB_CLIENT_ID }).then(function (r) { return (r && r.idToken) || null; });
        }
    };

    // ---- Вибрация ----
    navigator.vibrate = function (pattern) {
        var arr = Array.isArray(pattern) ? pattern : [pattern];
        arr = arr.map(function (v) { return Math.max(0, Number(v) || 0); });
        N.vibrate({ pattern: arr }).catch(function () {});
        return true;
    };

    // ---- Плавающий счётчик ----
    function appSettings() { return typeof settings !== 'undefined' ? settings : {}; }

    function applyStatus(s) {
        if (!s) return;
        status = s;
        // Нативный пузырь заменяет веб-кнопку — две кнопки на экране не нужны.
        document.documentElement.classList.toggle('native-overlay', !!(s.enabled && s.canDraw));
        renderOverlayRow();
    }

    // Любой CSS-цвет (rgb, color-mix, oklch...) → #AARRGGBB через canvas.
    var _cctx = null;
    function toArgb(css) {
        if (!css) return null;
        try {
            if (!_cctx) {
                var cv = document.createElement('canvas'); cv.width = cv.height = 1;
                _cctx = cv.getContext('2d', { willReadFrequently: true });
            }
            _cctx.clearRect(0, 0, 1, 1);
            _cctx.fillStyle = '#000'; _cctx.fillStyle = css;
            _cctx.fillRect(0, 0, 1, 1);
            var d = _cctx.getImageData(0, 0, 1, 1).data;
            return '#' + [d[3], d[0], d[1], d[2]].map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
        } catch (e) { return null; }
    }

    // Цвета веб-кнопки #pipCounterBtn в текущей теме (css/app.css, css/design.css).
    function themeColors() {
        var btn = document.getElementById('pipCounterBtn');
        var root = getComputedStyle(document.documentElement);
        var cs = btn ? getComputedStyle(btn) : null;
        var out = {
            bgColor: toArgb(cs && cs.backgroundColor),
            borderColor: toArgb(cs && cs.borderTopColor),
            numColorStart: toArgb(root.getPropertyValue('--grad-start').trim()),
            numColorEnd: toArgb(root.getPropertyValue('--grad-mid').trim()),
            labelColor: toArgb(root.getPropertyValue('--text-dim').trim())
        };
        Object.keys(out).forEach(function (k) { if (!out[k]) delete out[k]; });
        return out;
    }

    var _pushQueued = false;
    function pushOverlay() {
        if (_pushQueued) return;
        _pushQueued = true;
        Promise.resolve().then(function () {
            _pushQueued = false;
            var s = appSettings();
            var num = document.getElementById('pipCountNum');
            var label = document.getElementById('pipCountLabel');
            var opts = themeColors();
            opts.enabled = !!s.pipCounter;
            opts.count = parseInt(num && num.textContent, 10) || 0;
            opts.label = (label && label.textContent) || '';
            opts.vibration = !!s.vibration;
            opts.vibrationLevel = s.vibrationLevel || 3;
            N.setOverlay(opts).then(applyStatus).catch(function () {});
        });
    }

    var _draining = false;
    function drainTaps() {
        if (_draining) return;
        _draining = true;
        N.consumePending().then(function (r) {
            var n = (r && r.count) || 0;
            for (var i = 0; i < n; i++) {
                try { pipTap(); } catch (e) { console.warn('[native] pipTap', e); }
            }
        }).catch(function () {}).then(function () {
            _draining = false;
            pushOverlay();
        });
    }

    function askOverlayPermission() {
        if (typeof showToast === 'function') showToast('Разрешите «Поверх других приложений» для Azkar', 3500);
        setTimeout(function () {
            N.requestOverlayPermission().catch(function () {}).then(pushOverlay);
        }, 700);
    }

    function ensurePermission() {
        if (!appSettings().pipCounter) return;
        N.getStatus().then(function (s) {
            applyStatus(s);
            if (!s.canDraw) askOverlayPermission();
        });
    }

    var _origToggle = window.togglePipCounter;
    if (typeof _origToggle === 'function') {
        window.togglePipCounter = function () {
            _origToggle.apply(this, arguments);
            pushOverlay();
            ensurePermission();
        };
    }

    N.addListener('overlayTap', drainTaps);

    // ---- Строка под настройкой 📌: показывается только если что-то не так ----
    function injectStyles() {
        var st = document.createElement('style');
        st.textContent =
            'html.native-overlay #pipCounterBtn{display:none!important}' +
            '.nat-row{padding:6px 16px 12px 52px;font-size:.78rem;color:var(--text-dim);line-height:1.45}' +
            '.nat-btn{display:inline-block;margin:6px 6px 0 0;padding:6px 12px;border-radius:20px;border:1px solid var(--gold,#d4af37);' +
            'background:transparent;color:var(--gold,#d4af37);font:inherit;font-size:.76rem;cursor:pointer}';
        document.head.appendChild(st);
    }

    function renderOverlayRow() {
        var row = document.getElementById('natOverlayRow');
        if (!row) return;
        var ok = status.canDraw && status.running;
        row.style.display = (!appSettings().pipCounter || ok) ? 'none' : '';
        if (!status.canDraw) {
            row.innerHTML = '❌ Нет разрешения «Поверх других приложений».<br>' +
                '<button class="nat-btn" data-act="perm">Выдать разрешение</button>';
        } else if (!status.running) {
            row.innerHTML = '⚠️ Разрешение есть, но кнопка не запустилась. ' +
                (String(status.manufacturer).toLowerCase().match(/xiaomi|redmi|poco/)
                    ? 'На Xiaomi включите «Всплывающие окна в фоне» и «Автозапуск» в разрешениях приложения.<br>'
                    : 'Проверьте разрешения приложения.<br>') +
                '<button class="nat-btn" data-act="settings">Настройки приложения</button>' +
                '<button class="nat-btn" data-act="retry">Попробовать снова</button>';
        }
    }

    function injectRows() {
        var pipToggle = document.getElementById('pipToggle');
        var pipRow = pipToggle && pipToggle.closest('.set-row');
        if (pipRow && !document.getElementById('natOverlayRow')) {
            var o = document.createElement('div');
            o.id = 'natOverlayRow'; o.className = 'nat-row';
            pipRow.parentNode.insertBefore(o, pipRow.nextSibling);
            o.addEventListener('click', function (e) {
                var b = e.target.closest('[data-act]');
                if (!b) return;
                var act = b.getAttribute('data-act');
                if (act === 'perm') askOverlayPermission();
                else if (act === 'settings') N.openAppSettings();
                else pushOverlay();
                // Сервис стартует асинхронно — перепроверяем чуть позже.
                setTimeout(function () { N.getStatus().then(applyStatus); }, 1500);
            });
        }
        renderOverlayRow();
    }

    // Полосы за строкой состояния и навигацией — цвета фона темы (как в PWA);
    // светлая тема — тёмные значки времени/батареи, тёмная — светлые.
    var _barStyle = '', _barColor = '';
    function syncStatusBar() {
        var light = /^light/.test(document.documentElement.getAttribute('data-theme') || '');
        var style = light ? 'LIGHT' : 'DARK';
        if (style !== _barStyle) {
            _barStyle = style;
            C.nativePromise('SystemBars', 'setStyle', { style: style }).catch(function () {});
        }
        // Тот же цвет, что PWA отдаёт системе через <meta name="theme-color"> (applyTheme в app.js).
        var meta = document.querySelector('meta[name="theme-color"]');
        var color = toArgb(meta && meta.content) ||
                    toArgb(getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
        if (color && color !== _barColor) {
            _barColor = color;
            N.setBarColor({ color: color }).catch(function () {});
        }
    }

    // Тёмный режим зикра (#stealthOverlay в app.js): когда экран стал чёрным
    // (класс counting), прячем строку состояния и кнопки навигации.
    var _immersive = false;
    function syncImmersive() {
        var ov = document.getElementById('stealthOverlay');
        var on = !!(ov && ov.classList.contains('counting'));
        if (on === _immersive) return;
        _immersive = on;
        N.setImmersive({ on: on }).catch(function () {});
    }

    // ---- Уведомления: время намаза, дуа Абу Умамы, зикр, хадисы ----
    // В WebView нет веб-уведомлений и push, поэтому расписание на 7 дней —
    // то же, что веб-версия отдаёт push-серверу (app.js → _buildPushEvents) —
    // отдаём Android (NotifScheduler.java). Он ставит будильник и показывает
    // уведомление, даже когда приложение закрыто. Пока приложение на экране,
    // как и в браузере, показывается баннер сверху.
    var notif = { permission: 'prompt', exact: true };
    function applyNotif(s) { if (s && s.permission) notif = s; return s; }

    // app.js проверяет Notification.permission — подставляем статус Android.
    if (!('Notification' in window)) {
        var NativeNotification = function () {};   // new Notification(...) — уведомления идут через NotifScheduler
        Object.defineProperty(NativeNotification, 'permission', {
            get: function () { return notif.permission === 'prompt' ? 'default' : notif.permission; }
        });
        NativeNotification.requestPermission = function () { return window.requestNotifPermission(); };
        window.Notification = NativeNotification;
    }

    var EXACT_ASKED_KEY = 'azkar_native_exact_asked';
    window.requestNotifPermission = function () {
        return N.requestNotifPermission().then(applyNotif).catch(function () {}).then(function () {
            syncNotifSoon(true);
            // Android 12+: без «Будильников и напоминаний» намаз может прийти на несколько минут позже
            var asked = false;
            try { asked = localStorage.getItem(EXACT_ASKED_KEY) === '1'; } catch (e) {}
            if (notif.permission === 'granted' && !notif.exact && !asked) {
                try { localStorage.setItem(EXACT_ASKED_KEY, '1'); } catch (e) {}
                if (typeof showToast === 'function') showToast('Разрешите «Будильники и напоминания», чтобы намаз приходил вовремя', 3500);
                setTimeout(function () { N.openExactAlarmSettings().then(applyNotif).catch(function () {}); }, 900);
            }
            return window.Notification.permission;
        });
    };

    var _notifTimer = null, _notifSent = '';
    function syncNotif(force) {
        var events = [];
        try { if (typeof _buildPushEvents === 'function') events = _buildPushEvents(); } catch (e) {}
        var json = JSON.stringify(events);
        if (!force && json === _notifSent) return;
        _notifSent = json;
        N.setNotifications({ events: events }).then(applyNotif).catch(function () { _notifSent = ''; });
    }
    function syncNotifSoon(force) {
        clearTimeout(_notifTimer);
        _notifTimer = setTimeout(function () { syncNotif(force); }, force ? 300 : 2000);
    }
    // app.js зовёт schedulePushSync() при каждом изменении расписания
    // (настройки, локация, новый хадис) — в APK вместо push обновляем будильники.
    window.schedulePushSync = function (force) { syncNotifSoon(!!force); };

    // Тап по уведомлению с хадисом — открыть его в попапе
    function openNotificationTap() {
        N.consumeNotificationTap().then(function (d) {
            if (d && d.hadithText && typeof openHadithPopupRaw === 'function') {
                setTimeout(function () { openHadithPopupRaw(d.hadithText, d.hadithSource || ''); }, 400);
            }
        }).catch(function () {});
    }
    N.addListener('notificationTap', openNotificationTap);

    // Баннер в приложении не открыли — как в PWA, событие остаётся в шторке.
    // В app.js это делается через Service Worker, которого в APK нет.
    window._pinHadithNotification = function (h) {
        var body = (typeof _hadithText === 'function') ? _hadithText(h) : '';
        if (!body || notif.permission !== 'granted') return;
        N.showNotification({
            tag: 'azkar-hadith-' + Date.now(), kind: 'hadith',
            title: (typeof t === 'function') ? t('hadithLabel') : 'Hadith', body: body,
            source: (typeof _hadithSource === 'function') ? _hadithSource(h) : ''
        }).catch(function () {});
    };
    window._pinNotifNotification = function (n) {
        if (!n || !n.body || notif.permission !== 'granted') return;
        N.showNotification({
            tag: n.tag || ('azkar-notif-' + Date.now()), kind: '',
            title: n.title || 'Azkar', body: n.body, url: n.url || ''
        }).catch(function () {});
    };
    // Ссылки (сайт отзывов) — в браузере телефона, а не внутри приложения
    window.azkarOpenUrl = function (url) {
        N.openUrl({ url: url }).catch(function () {});
    };

    function startNotifications() {
        N.getNotifStatus().then(applyNotif).catch(function () {}).then(function () {
            // Уведомления включены, а разрешения ещё не спрашивали (Android 13+)
            var s = appSettings();
            if (s.notifMaster !== false && notif.permission === 'prompt') window.requestNotifPermission();
            else syncNotifSoon(true);
        });
        openNotificationTap();
    }

    function start() {
        injectStyles();
        injectRows();
        startNotifications();
        ['pipCountNum', 'pipCountLabel', 'pipCounterBtn'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) new MutationObserver(pushOverlay).observe(el, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
        });
        // Смена темы — перекрашиваем пузырь и значки строки состояния. Цвета темы
        // меняются плавно (переходы CSS-переменных), поэтому повторяем после анимации.
        var themeObs = new MutationObserver(function () {
            pushOverlay(); syncStatusBar();
            setTimeout(function () { pushOverlay(); syncStatusBar(); }, 900);
        });
        var stealth = document.getElementById('stealthOverlay');
        if (stealth) new MutationObserver(syncImmersive).observe(stealth, { attributes: true, attributeFilter: ['class'] });
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) new MutationObserver(syncStatusBar).observe(meta, { attributes: true, attributeFilter: ['content'] });
        syncStatusBar();
        themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });
        themeObs.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) { pushOverlay(); return; }
            drainTaps();
            // Пользователь мог только что выдать разрешение в настройках Android.
            setTimeout(function () { N.getStatus().then(applyStatus); }, 600);
        });
        N.getStatus().then(applyStatus);
        // Тапы, сделанные пока приложение было выгружено из памяти.
        setTimeout(drainTaps, 800);
        setTimeout(ensurePermission, 1200);
        setTimeout(function () { N.getStatus().then(applyStatus); }, 2500);
        pushOverlay();
    }
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start);
})();
