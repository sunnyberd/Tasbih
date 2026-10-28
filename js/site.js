// Azkar — сайт (site.html): язык и тема, живые чётки, скриншоты, установка APK, отзывы.
// Отзывы — в Firebase, общие с приложением (один Google-аккаунт — один отзыв):
//   ratings/{uid}  — { rating, name, updatedAt }
//   messages/{id}  — { uid, name, text, rating, lang, app, likes, createdAt, editedAt?, reply?, replyAt?, status? }
// Написать, изменить и удалить свой отзыв можно и здесь, и в приложении.
// Разработчик (ADMIN_UID) видит под каждым отзывом ответ, статус и удаление.

(function () {
    "use strict";

    var FIREBASE_SDK_VERSION = "12.15.0";
    var FIREBASE_CONFIG = {
        apiKey: "AIzaSyCK08Vc1hxLM12fLUQM-Ipq3jnMfB4aY3U",
        authDomain: "azkar-pwa.firebaseapp.com",
        projectId: "azkar-pwa",
        storageBucket: "azkar-pwa.firebasestorage.app",
        messagingSenderId: "939307317987",
        appId: "1:939307317987:web:2aeda9da43b3c1adc3a3d6"
    };
    var ADMIN_UID = "duVscbSkshZ9J1YuCq2iZq7QluO2";
    // Новая версия приложения: загрузить на GitHub файл Azkar.apk (заменив старый) —
    // кнопка «Установить» появится сама, рядом — размер файла.
    var APK_FILE = "Azkar.apk";
    var MAX_TEXT = 1200, MIN_TEXT = 4;
    // Поменяли скриншоты (site-*.jpg) — увеличь, чтобы у всех обновились картинки
    var SHOTS_VERSION = 2;
    var THEMES = {
        "dark": ["#0a0a0a", "#d4af37"], "dark-emerald": ["#060f0a", "#2ecc71"], "dark-purple": ["#07050f", "#a855f7"],
        "dark-blue": ["#030b12", "#38bdf8"], "dark-rose": ["#0f0509", "#f472b6"],
        "light": ["#f8f6f2", "#b85c1a"], "light-rosesapphire": ["#fdf2f6", "#c2698f"], "light-lavender": ["#f5f3fa", "#7c5cbf"],
        "light-ocean": ["#f0f7fc", "#0369a1"], "light-mint": ["#f0faf6", "#0d7a5f"]
    };
    var STAR_PATH = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";
    var HEART_PATH = "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z";
    var PENCIL = '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
    var TRASH = '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
    var G_LOGO = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
    var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var I18N = window.AZKAR_SITE_I18N || {};
    // как в выборе языка в приложении
    var ORDER = ["en", "de", "es", "fr", "it", "ja", "ko", "ru", "uz", "zh", "tr", "hi", "id", "ms", "th"];

    function $(id) { return document.getElementById(id); }
    function esc(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }
    function params() { try { return new URLSearchParams(location.search); } catch (e) { return { get: function () { return null; } }; } }
    function appSettings() { try { return JSON.parse(localStorage.getItem("azkar_settings") || "{}") || {}; } catch (e) { return {}; } }
    function tsMs(v) { return v && typeof v.toMillis === "function" ? v.toMillis() : 0; }
    function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
    function starsHtml(n) {
        var h = "";
        for (var i = 1; i <= 5; i++) h += '<svg class="' + (i <= n ? "f" : "") + '" viewBox="0 0 24 24"><path d="' + STAR_PATH + '"/></svg>';
        return '<span class="stars" aria-label="' + n + '/5">' + h + "</span>";
    }
    // поле ответа и сообщения растёт вместе с текстом (до max-height из CSS)
    function autoGrow(el) {
        if (!el) return;
        el.style.height = "auto";
        el.style.height = el.scrollHeight + 2 + "px";
    }

    /* ===================== ЯЗЫК ===================== */
    var P = params();
    function pickLang() {
        var cands = [P.get("lang"), appSettings().language];
        (navigator.languages || [navigator.language || "en"]).forEach(function (l) { cands.push(String(l).slice(0, 2).toLowerCase()); });
        for (var i = 0; i < cands.length; i++) if (cands[i] && I18N[cands[i]]) return cands[i];
        return "en";
    }
    var lang = pickLang();
    function t(key) {
        var v = (I18N[lang] || {})[key];
        if (v == null) v = (I18N.en || {})[key];
        return v == null ? "" : v;
    }
    function applyTexts() {
        document.documentElement.lang = lang;
        document.querySelectorAll("[data-t]").forEach(function (el) {
            var v = t(el.getAttribute("data-t"));
            if (v) el.textContent = v;
        });
        document.title = "Azkar — " + t("heroTitle");
        $("langSelect").setAttribute("aria-label", t("langLabel"));
        $("tasbih").setAttribute("aria-label", t("demoHint"));
        // скриншоты: русские для ru, английские для остальных языков
        var shotLang = lang === "ru" ? "ru" : "en";
        document.querySelectorAll("[data-shot]").forEach(function (img) {
            img.src = "site-" + img.dataset.shot + "-" + shotLang + ".jpg?v=" + SHOTS_VERSION;
            img.alt = img.closest("figure").querySelector("figcaption").textContent;
        });
        renderApkMeta();
        renderDemo();
    }
    function buildLangSelect() {
        var sel = $("langSelect");
        sel.innerHTML = ORDER.filter(function (l) { return I18N[l]; }).map(function (l) {
            return '<option value="' + l + '"' + (l === lang ? " selected" : "") + ">" + esc(I18N[l]._name || l) + "</option>";
        }).join("");
        sel.addEventListener("change", function () {
            lang = sel.value;
            try {
                var u = new URL(location.href);
                u.searchParams.set("lang", lang);
                history.replaceState(null, "", u.toString());
            } catch (e) {}
            applyTexts();
            renderMyBox();
            renderSummary(lastRatings);
            renderFeed();
        });
    }
    // В браузерах нет узбекских названий месяцев (выходит «2026 M10 27») — пишем сами
    var UZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
    function fmtDate(ms) {
        if (lang === "uz") { var d = new Date(ms); return d.getDate() + " " + UZ_MONTHS[d.getMonth()] + " " + d.getFullYear(); }
        try { return new Intl.DateTimeFormat(lang, { day: "numeric", month: "long", year: "numeric" }).format(new Date(ms)); }
        catch (e) { return new Date(ms).toLocaleDateString(); }
    }

    /* ===================== ТЕМА (как в приложении) ===================== */
    (function applyTheme() {
        var id = P.get("theme") || appSettings().theme || "dark";
        var th = THEMES[id] || THEMES.dark;
        var root = document.documentElement;
        root.style.setProperty("--night", th[0]);
        root.style.setProperty("--gold", th[1]);
        root.style.setProperty("--line", hexA(th[1], 0.22));
        root.style.setProperty("--glow", hexA(th[1], 0.15));
        if (id.indexOf("light") === 0) root.classList.add("light");
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", th[0]);
    })();
    function hexA(hex, a) {
        var n = parseInt(hex.slice(1), 16);
        return "rgba(" + (n >> 16 & 255) + ", " + (n >> 8 & 255) + ", " + (n & 255) + ", " + a + ")";
    }

    /* ===================== УСТАНОВКА APK ===================== */
    // Есть ли Azkar.apk рядом с сайтом — тогда показываем «Установить» и размер.
    var apkBytes = 0;
    function checkApk() {
        if (!window.fetch) return;
        fetch(APK_FILE, { method: "HEAD", cache: "no-store" }).then(function (r) {
            if (!r.ok) return;
            apkBytes = Number(r.headers.get("content-length")) || 0;
            $("apkRow").classList.remove("hidden");
            $("apkBtn").classList.remove("hidden");
            renderApkMeta();
        }).catch(function () {});
    }
    function renderApkMeta() {
        var el = $("apkMeta");
        if (!el || !apkBytes) return;
        var size;
        try { size = new Intl.NumberFormat(lang, { style: "unit", unit: "megabyte", maximumFractionDigits: 1 }).format(apkBytes / 1048576); }
        catch (e) { size = (apkBytes / 1048576).toFixed(1) + " MB"; }
        el.textContent = t("apkFile").replace("{size}", size);
    }

    /* ===================== ЖИВЫЕ ЧЁТКИ ===================== */
    // 33 бусины; после тасбиха — тахмид и такбир (33 + 33 + 34 = 100)
    var PHRASES = [
        { ar: "سُبْحَانَ ٱللَّٰهِ", tr: "SubhanAllah", m: "m1", goal: 33 },
        { ar: "ٱلْحَمْدُ لِلَّٰهِ", tr: "Alhamdulillah", m: "m2", goal: 33 },
        { ar: "ٱللَّٰهُ أَكْبَرُ", tr: "Allahu Akbar", m: "m3", goal: 34 }
    ];
    var BEADS = 33;
    var demo = { phrase: 0, count: 0, total: 0, done: false };
    var beadEls = [];
    function buildBeads() {
        var g = $("beads");
        var html = "";
        for (var i = 0; i < BEADS; i++) {
            // первая бусина — сверху, дальше по часовой стрелке
            var a = (i / BEADS) * Math.PI * 2 - Math.PI / 2;
            var x = 200 + 172 * Math.cos(a), y = 200 + 172 * Math.sin(a);
            html += '<circle class="bead" cx="' + x.toFixed(2) + '" cy="' + y.toFixed(2) + '" r="' + (i === 0 ? 13 : 11) + '"/>';
        }
        g.innerHTML = html;
        beadEls = Array.prototype.slice.call(g.querySelectorAll(".bead"));
    }
    function renderDemo() {
        var p = PHRASES[demo.phrase];
        $("dAr").textContent = p.ar;
        $("dTr").textContent = p.tr;
        $("dMean").textContent = t(p.m);
        $("dNum").textContent = demo.done ? 100 : demo.count;
        $("dGoal").textContent = demo.done ? 100 : p.goal;
        // горят последние `count` бусин, текущая — (total − 1) по кругу
        var lit = demo.done ? BEADS : Math.min(demo.count, BEADS);
        var cur = ((demo.total - 1) % BEADS + BEADS) % BEADS;
        var on = {};
        for (var k = 0; k < lit; k++) on[((cur - k) % BEADS + BEADS) % BEADS] = true;
        beadEls.forEach(function (b, i) {
            b.classList.toggle("on", !!on[i]);
            b.classList.toggle("now", !demo.done && demo.count > 0 && i === cur);
        });
        // чётки «проходят через пальцы»: текущая бусина всегда сверху
        $("beads").style.transform = "rotate(" + (-Math.max(demo.total - 1, 0) * 360 / BEADS) + "deg)";
        $("demoNote").textContent = demo.done ? t("demoDone") : t("demoHint");
        $("demoAgain").classList.toggle("hidden", !demo.done);
    }
    function tapDemo() {
        if (demo.done) return;
        var p = PHRASES[demo.phrase];
        demo.count++;
        demo.total++;
        if (demo.count >= p.goal) {
            if (demo.phrase < PHRASES.length - 1) { demo.phrase++; demo.count = 0; vibrate([20, 60, 20]); }
            else { demo.done = true; vibrate([30, 80, 30, 80, 60]); }
        } else {
            vibrate(10);
        }
        var box = $("tasbih");
        if (!REDUCED) { box.classList.remove("tick"); void box.offsetWidth; box.classList.add("tick"); }
        renderDemo();
    }
    function resetDemo() {
        // продолжаем вращение вперёд, а не откручиваем назад
        var turns = Math.ceil(demo.total / BEADS) * BEADS;
        demo = { phrase: 0, count: 0, total: turns, done: false };
        renderDemo();
    }

    /* ===================== СКРИНШОТЫ: стрелки ===================== */
    function initShots() {
        var row = $("shots");
        var btns = document.querySelectorAll(".shots-nav .arrow");
        function step() { var f = row.querySelector(".shot"); return f ? f.getBoundingClientRect().width + 20 : 260; }
        function sync() {
            var max = row.scrollWidth - row.clientWidth - 2;
            btns[0].disabled = row.scrollLeft <= 2;
            btns[1].disabled = row.scrollLeft >= max;
        }
        btns.forEach(function (b) {
            b.addEventListener("click", function () {
                row.scrollBy({ left: Number(b.dataset.dir) * step() * 2, behavior: REDUCED ? "auto" : "smooth" });
            });
        });
        row.addEventListener("scroll", sync, { passive: true });
        window.addEventListener("resize", sync);
        sync();
    }

    /* ===================== ОКНО ПОДТВЕРЖДЕНИЯ ===================== */
    function askConfirm(title, sub, yes, no) {
        return new Promise(function (resolve) {
            var m = $("modal");
            $("mTitle").textContent = title;
            $("mSub").textContent = sub || "";
            $("mYes").textContent = yes || t("btnYes");
            $("mNo").textContent = no || t("btnNo");
            m.classList.remove("hidden");
            $("mNo").focus();
            function done(v) {
                m.classList.add("hidden");
                $("mYes").onclick = $("mNo").onclick = m.onclick = document.onkeydown = null;
                resolve(v);
            }
            $("mYes").onclick = function () { done(true); };
            $("mNo").onclick = function () { done(false); };
            m.onclick = function (e) { if (e.target === m) done(false); };
            document.onkeydown = function (e) { if (e.key === "Escape") done(false); };
        });
    }

    /* ===================== FIREBASE ===================== */
    var F = null, A = null, db = null, auth = null, user = null;
    function initFirebase() {
        var base = "https://www.gstatic.com/firebasejs/" + FIREBASE_SDK_VERSION + "/";
        return Promise.all([
            import(base + "firebase-app.js"),
            import(base + "firebase-auth.js"),
            import(base + "firebase-firestore.js")
        ]).then(function (m) {
            var app = m[0].initializeApp(FIREBASE_CONFIG);
            A = m[1];
            F = m[2];
            auth = A.getAuth(app);
            db = F.getFirestore(app);
            A.onAuthStateChanged(auth, function (u) {
                user = u;
                editing = null;
                loadMine().then(renderMyBox);
                if (loaded) loadMyLikes().then(renderFeed);
            });
            return A.getRedirectResult(auth).catch(function () {});
        });
    }
    function isAdmin() { return !!(user && user.uid === ADMIN_UID); }

    /* ===================== ОТЗЫВЫ: лента ===================== */
    var messages = [];
    var lastRatings = [];
    var liked = {};
    var sortMode = "new";
    var loaded = false;
    function loadAll() {
        return Promise.all([
            F.getDocs(F.query(F.collection(db, "messages"), F.limit(500))),
            F.getDocs(F.query(F.collection(db, "ratings"), F.limit(5000)))
        ]).then(function (res) {
            messages = res[0].docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
            lastRatings = res[1].docs.map(function (d) { return d.data().rating | 0; });
            loaded = true;
            renderSummary(lastRatings);
        });
    }
    function loadMyLikes() {
        liked = {};
        if (!user || !messages.length) return Promise.resolve();
        return Promise.all(messages.map(function (m) {
            return F.getDoc(F.doc(db, "messages", m.id, "likes", user.uid)).then(function (s) {
                if (s.exists()) liked[m.id] = true;
            }).catch(function () {});
        }));
    }
    function renderSummary(ratings) {
        var el = $("summary");
        ratings = (ratings || []).filter(function (r) { return r >= 1 && r <= 5; });
        if (!ratings.length) { el.classList.add("hidden"); return; }
        var n = ratings.length;
        var avg = ratings.reduce(function (s, r) { return s + r; }, 0) / n;
        var rows = "";
        for (var v = 5; v >= 1; v--) {
            var c = ratings.filter(function (r) { return r === v; }).length;
            rows += '<div class="dist-row"><span>' + v + '</span><span class="dist-track"><i class="dist-fill" style="width:' + (c / n * 100) + '%"></i></span><span>' + c + "</span></div>";
        }
        el.innerHTML = '<div class="sum-left"><div class="sum-avg">' + avg.toFixed(1) + "</div>" + starsHtml(Math.round(avg)) +
            '<div class="sum-count">' + esc(t("ratingsCount").replace("{n}", n)) + "</div></div>" +
            '<div class="dist">' + rows + "</div>";
        el.classList.remove("hidden");
    }
    function sorted() {
        var list = messages.slice();
        if (sortMode === "new") list.sort(function (a, b) { return tsMs(b.createdAt) - tsMs(a.createdAt); });
        else list.sort(function (a, b) { return ((b.likes | 0) - (a.likes | 0)) || (tsMs(b.createdAt) - tsMs(a.createdAt)); });
        return list;
    }
    function statusLabel(s) {
        return s === "done" ? t("statusDone") : s === "progress" ? t("statusProgress") : s === "review" ? t("statusReview") : "";
    }
    function msgHtml(m) {
        var mine = user && user.uid === m.uid;
        var name = m.name || "—";
        var date = fmtDate(tsMs(m.createdAt) || Date.now()) + (m.editedAt ? ", " + t("edited") : "");
        var st = statusLabel(m.status);
        var h = '<article class="msg" id="m-' + esc(m.id) + '" data-id="' + esc(m.id) + '">' +
            '<div class="msg-head"><div class="avatar" aria-hidden="true">' + esc(name.charAt(0).toUpperCase()) + "</div>" +
            '<div class="who"><div class="who-name">' + esc(name) + (mine ? '<span class="you">' + esc(t("you")) + "</span>" : "") + "</div>" +
            '<div class="who-date">' + esc(date) + "</div></div>" + starsHtml(m.rating | 0) + "</div>" +
            '<p class="msg-text">' + esc(m.text || "") + "</p>";
        if (m.reply) {
            h += '<div class="reply"><div class="reply-label">' + esc(t("devReply")) + '</div><div class="reply-text">' + esc(m.reply) + "</div></div>";
        }
        h += '<div class="msg-foot"><button type="button" class="like' + (liked[m.id] ? " on" : "") + '" data-act="like" aria-pressed="' + (liked[m.id] ? "true" : "false") + '" aria-label="' + esc(t("actLike")) + '">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + HEART_PATH + '"/></svg><span>' + (m.likes | 0) + "</span></button>" +
            (st ? '<span class="status' + (m.status === "done" ? " done" : "") + '">' + esc(st) + "</span>" : "") + "</div>";
        if (isAdmin()) {
            var opts = [["", t("statusNone")], ["review", t("statusReview")], ["progress", t("statusProgress")], ["done", t("statusDone")]];
            h += '<div class="admin"><select data-f="status">' + opts.map(function (o) {
                    return '<option value="' + o[0] + '"' + ((m.status || "") === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>";
                }).join("") + "</select>" +
                '<textarea data-f="reply" rows="2" placeholder="' + esc(t("replyPh")) + '">' + esc(m.reply || "") + "</textarea>" +
                '<div class="admin-row"><button type="button" class="del" data-act="del">' + esc(t("actDelete")) + "</button>" +
                '<button type="button" data-act="save">' + esc(t("btnSave")) + "</button></div></div>";
        }
        return h + "</article>";
    }
    function renderFeed() {
        if (!loaded) return;
        var feed = $("feed"), has = messages.length > 0;
        $("state").classList.add("hidden");
        $("rvEmpty").classList.toggle("hidden", has);
        $("sort").classList.toggle("hidden", !has);
        feed.innerHTML = has ? sorted().map(msgHtml).join("") : "";
        feed.querySelectorAll('textarea[data-f="reply"]').forEach(autoGrow);
    }
    function flashFromHash() {
        var id = decodeURIComponent((location.hash || "").replace(/^#/, ""));
        if (!id) return;
        var el = document.getElementById(id);
        // раздел (#reviews и т. п.) — прокрутить заново: лента догрузилась и сдвинула страницу
        if (id.indexOf("m-") !== 0) { if (el) el.scrollIntoView(); return; }
        if (!el) { var r = $("reviews"); if (r) r.scrollIntoView(); return; }
        el.scrollIntoView({ block: "center" });
        el.classList.add("flash");
    }

    var toastTimer = null;
    function toast(msg) {
        var el = $("toast");
        el.textContent = msg;
        el.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2600);
    }

    /* ===================== СВОЙ ОТЗЫВ: форма, правка, удаление ===================== */
    var mine = null;          // { rating, name, msgId, text, likes, reply, status, ts }
    var editing = null;       // { rating } — правка своего отзыва
    var draft = { rating: 0, name: "", text: "" };
    var busy = false;
    function loadMine() {
        mine = null;
        if (!user) return Promise.resolve();
        return Promise.all([
            F.getDoc(F.doc(db, "ratings", user.uid)),
            F.getDocs(F.query(F.collection(db, "messages"), F.where("uid", "==", user.uid), F.limit(5)))
        ]).then(function (res) {
            var r = res[0].exists() ? res[0].data() : null;
            var m = res[1].docs.map(function (d) { var x = d.data(); x.id = d.id; return x; })
                .sort(function (a, b) { return tsMs(b.createdAt) - tsMs(a.createdAt); })[0] || null;
            if (!r && !m) return;
            mine = {
                rating: r ? r.rating : (m.rating || 0),
                name: (r && r.name) || (m && m.name) || "",
                msgId: m ? m.id : null, text: m ? m.text : "",
                likes: m ? (m.likes | 0) : 0, reply: m && m.reply ? m.reply : "", status: m && m.status ? m.status : "",
                ts: tsMs(r && r.updatedAt) || tsMs(m && m.createdAt) || Date.now()
            };
        }).catch(function () {});
    }
    function rateHtml(n) {
        var h = "";
        var texts = t("ratingTexts") || [];
        for (var i = 1; i <= 5; i++) {
            h += '<button type="button" data-star="' + i + '" aria-label="' + esc(texts[i - 1] || i) + '"><svg class="' + (i <= n ? "f" : "") + '" viewBox="0 0 24 24"><path d="' + STAR_PATH + '"/></svg></button>';
        }
        return '<div class="rate" role="radiogroup">' + h + '</div><div class="rate-cap' + (n ? "" : " empty") + '" id="rateCap">' +
            esc(n ? texts[n - 1] : t("ratingEmpty")) + "</div>";
    }
    function formHtml(rating, name, text, submitLabel, withCancel) {
        return rateHtml(rating) +
            '<div class="err hidden" id="errRating">' + esc(t("errRating")) + "</div>" +
            '<label class="fld" for="fbName">' + esc(t("labelName")) + "</label>" +
            '<input class="inp" id="fbName" maxlength="40" value="' + esc(name) + '" placeholder="' + esc(t("phName")) + '">' +
            '<label class="fld" for="fbText">' + esc(t("labelMessage")) + "</label>" +
            '<textarea class="inp" id="fbText" maxlength="' + MAX_TEXT + '" placeholder="' + esc(t("phMessage")) + '">' + esc(text) + "</textarea>" +
            '<div class="err hidden" id="errText">' + esc(t("errMessage")) + "</div>" +
            '<div class="mb-actions">' +
                (withCancel ? '<button type="button" class="btn btn-line" data-act="cancel">' + esc(t("btnCancel")) + "</button>" : "") +
                '<button type="button" class="btn btn-gold" data-act="' + (withCancel ? "saveMine" : "submit") + '">' + esc(submitLabel) + "</button>" +
            "</div>";
    }
    function renderMyBox() {
        var el = $("mybox");
        if (!F) { el.innerHTML = '<p class="mb-hint">' + esc(t("signInWrite")) + "</p>"; return; }
        if (!user) {
            el.innerHTML = '<p class="mb-hint">' + esc(t("signInWrite")) + "</p>" +
                '<div><button type="button" class="g-btn" data-act="signin">' + G_LOGO + esc(t("signIn")) + "</button></div>";
            return;
        }
        var head = '<div class="mb-user"><b>' + esc(user.displayName || user.email || "") + "</b>" +
            '<button type="button" class="link-btn" data-act="signout">' + esc(t("signOut")) + "</button></div>";
        if (!mine) {
            if (!draft.name) draft.name = (user.displayName || "").slice(0, 40);
            el.innerHTML = head + '<div class="mb-title">' + esc(t("formTitle")) + "</div>" +
                formHtml(draft.rating, draft.name, draft.text, t("btnSubmit"), false);
        } else if (editing) {
            el.innerHTML = head + '<div class="mb-title">' + esc(t("yourReview")) + "</div>" +
                formHtml(editing.rating, mine.name, mine.text || "", t("btnSave"), true);
        } else {
            var meta = "<span>" + esc(fmtDate(mine.ts)) + "</span>";
            if (mine.msgId && mine.likes > 0) meta += '<span class="mb-likes"><svg viewBox="0 0 24 24"><path d="' + HEART_PATH + '"/></svg>' + mine.likes + "</span>";
            if (statusLabel(mine.status)) meta += '<span class="status' + (mine.status === "done" ? " done" : "") + '">' + esc(statusLabel(mine.status)) + "</span>";
            el.innerHTML = head +
                '<div class="mb-title"><span>' + esc(t("yourReview")) + '</span><span class="mb-acts">' +
                    '<button type="button" class="icon-btn" data-act="edit" aria-label="' + esc(t("actEdit")) + '" title="' + esc(t("actEdit")) + '">' + PENCIL + "</button>" +
                    '<button type="button" class="icon-btn danger" data-act="delMine" aria-label="' + esc(t("actDelete")) + '" title="' + esc(t("actDelete")) + '">' + TRASH + "</button>" +
                "</span></div>" +
                '<div style="margin-top:8px">' + starsHtml(mine.rating) + "</div>" +
                '<div class="mb-name">' + esc(mine.name || t("guest")) + "</div>" +
                (mine.text ? '<p class="mb-text">' + esc(mine.text) + "</p>" : '<p class="mb-empty">' + esc(t("onlyRating")) + "</p>") +
                '<div class="mb-meta">' + meta + "</div>" +
                (mine.reply ? '<div class="reply"><div class="reply-label">' + esc(t("devReply")) + '</div><div class="reply-text">' + esc(mine.reply) + "</div></div>" : "");
        }
        autoGrow($("fbText"));
    }
    function setFormRating(n) {
        if (editing) editing.rating = n; else draft.rating = n;
        document.querySelectorAll("#mybox [data-star] svg").forEach(function (svg, i) { svg.classList.toggle("f", i < n); });
        var cap = $("rateCap");
        cap.textContent = (t("ratingTexts") || [])[n - 1] || "";
        cap.classList.remove("empty");
        $("errRating").classList.add("hidden");
        vibrate(10);
    }
    function readForm() {
        var text = $("fbText").value.trim().slice(0, MAX_TEXT);
        var name = ($("fbName").value.trim() || user.displayName || t("guest")).slice(0, 40);
        var rating = editing ? editing.rating : draft.rating;
        var ok = true;
        if (!rating) { $("errRating").classList.remove("hidden"); ok = false; }
        if (text && text.length < MIN_TEXT) { $("errText").classList.remove("hidden"); ok = false; }
        return ok ? { text: text, name: name, rating: rating } : null;
    }
    function msgDoc(v) {
        return { uid: user.uid, name: v.name, text: v.text, rating: v.rating, lang: lang, app: "site", likes: 0, createdAt: F.serverTimestamp() };
    }
    function afterWrite(msg) {
        return loadAll().then(loadMine).then(loadMyLikes).then(function () {
            renderMyBox();
            renderFeed();
            if (msg) toast(msg);
        });
    }
    function submitReview(btn) {
        if (busy) return;
        var v = readForm();
        if (!v) { vibrate(60); return; }
        busy = true; btn.disabled = true;
        var batch = F.writeBatch(db);
        batch.set(F.doc(db, "ratings", user.uid), { rating: v.rating, name: v.name, updatedAt: F.serverTimestamp() });
        if (v.text) batch.set(F.doc(F.collection(db, "messages")), msgDoc(v));
        batch.commit().then(function () {
            draft = { rating: 0, name: "", text: "" };
            vibrate([12, 60, 12]);
            return afterWrite(t("thanksTitle"));
        }).catch(function () { toast(t("errNetwork")); btn.disabled = false; }).then(function () { busy = false; });
    }
    function saveMine(btn) {
        if (busy || !mine) return;
        var v = readForm();
        if (!v) { vibrate(60); return; }
        busy = true; btn.disabled = true;
        var batch = F.writeBatch(db);
        batch.set(F.doc(db, "ratings", user.uid), { rating: v.rating, name: v.name, updatedAt: F.serverTimestamp() });
        var ref = mine.msgId ? F.doc(db, "messages", mine.msgId) : null;
        if (ref && v.text) batch.update(ref, { name: v.name, text: v.text, rating: v.rating, editedAt: F.serverTimestamp() });
        else if (ref && !v.text) batch.delete(ref);
        else if (!ref && v.text) batch.set(F.doc(F.collection(db, "messages")), msgDoc(v));
        batch.commit().then(function () {
            editing = null;
            return afterWrite(t("toastUpdated"));
        }).catch(function () { toast(t("errNetwork")); btn.disabled = false; }).then(function () { busy = false; });
    }
    function deleteMine() {
        if (busy || !mine) return;
        askConfirm(t("confirmDeleteTitle"), t("confirmDeleteSub")).then(function (yes) {
            if (!yes) return;
            busy = true;
            var batch = F.writeBatch(db);
            batch.delete(F.doc(db, "ratings", user.uid));
            if (mine.msgId) batch.delete(F.doc(db, "messages", mine.msgId));
            return batch.commit().then(function () {
                draft = { rating: 0, name: "", text: "" };
                return afterWrite(t("toastDeleted"));
            }).catch(function () { toast(t("errNetwork")); });
        }).then(function () { busy = false; });
    }

    /* ===================== ВХОД / ЛАЙКИ / РАЗРАБОТЧИК ===================== */
    function signIn() {
        var provider = new A.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        A.signInWithPopup(auth, provider).catch(function (e) {
            var code = (e && e.code) || "";
            if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
                A.signInWithRedirect(auth, provider);
            }
        });
    }
    function signOut() {
        askConfirm(t("signOutQ"), "", t("signOut"), t("btnCancel")).then(function (yes) {
            if (yes) A.signOut(auth);
        });
    }
    function toggleLike(m, btn) {
        if (!user) { signIn(); return; }
        if (btn.disabled) return;
        btn.disabled = true;
        var on = !!liked[m.id];
        var batch = F.writeBatch(db);
        var likeRef = F.doc(db, "messages", m.id, "likes", user.uid);
        if (on) batch.delete(likeRef); else batch.set(likeRef, { createdAt: F.serverTimestamp() });
        batch.update(F.doc(db, "messages", m.id), { likes: F.increment(on ? -1 : 1) });
        batch.commit().then(function () {
            if (on) delete liked[m.id]; else { liked[m.id] = true; vibrate(12); }
            m.likes = Math.max(0, (m.likes | 0) + (on ? -1 : 1));
            btn.classList.toggle("on", !on);
            btn.setAttribute("aria-pressed", on ? "false" : "true");
            btn.querySelector("span").textContent = String(m.likes);
        }).catch(function () { toast(t("errNetwork")); }).then(function () { btn.disabled = false; });
    }
    function adminSave(m, card) {
        var reply = card.querySelector('[data-f="reply"]').value.trim();
        var status = card.querySelector('[data-f="status"]').value;
        var patch = { reply: reply || F.deleteField(), status: status || F.deleteField() };
        if (reply && reply !== (m.reply || "")) patch.replyAt = F.serverTimestamp();
        F.updateDoc(F.doc(db, "messages", m.id), patch).then(function () {
            if (reply) m.reply = reply; else delete m.reply;
            if (status) m.status = status; else delete m.status;
            renderFeed();
            toast(t("toastUpdated"));
        }).catch(function () { toast(t("errNetwork")); });
    }
    function adminDelete(m) {
        askConfirm(t("confirmDelMsg"), "").then(function (yes) {
            if (!yes) return;
            // Удаляем отзыв целиком — текст и оценку автора: у него в приложении
            // и на сайте отзыв исчезает, звёзды снова пустые, можно написать заново.
            var batch = F.writeBatch(db);
            batch.delete(F.doc(db, "messages", m.id));
            if (m.uid) batch.delete(F.doc(db, "ratings", m.uid));
            batch.commit().then(function () {
                return afterWrite(t("toastDeleted"));
            }).catch(function () { toast(t("errNetwork")); });
        });
    }

    /* ===================== СОБЫТИЯ ===================== */
    document.addEventListener("click", function (e) {
        var sortBtn = e.target.closest("[data-sort]");
        if (sortBtn) {
            sortMode = sortBtn.dataset.sort;
            document.querySelectorAll("[data-sort]").forEach(function (b) { b.setAttribute("aria-selected", b === sortBtn ? "true" : "false"); });
            renderFeed();
            return;
        }
        var star = e.target.closest("#mybox [data-star]");
        if (star) { setFormRating(Number(star.dataset.star)); return; }
        var act = e.target.closest("[data-act]");
        if (!act || !F) return;
        var a = act.dataset.act;
        if (a === "signin") { signIn(); return; }
        if (a === "signout") { signOut(); return; }
        if (a === "submit") { submitReview(act); return; }
        if (a === "saveMine") { saveMine(act); return; }
        if (a === "edit") { editing = { rating: mine.rating }; renderMyBox(); $("fbText").focus(); return; }
        if (a === "cancel") { editing = null; renderMyBox(); return; }
        if (a === "delMine") { deleteMine(); return; }
        var card = act.closest(".msg");
        var m = card && messages.filter(function (x) { return x.id === card.dataset.id; })[0];
        if (!m) return;
        if (a === "like") toggleLike(m, act);
        else if (a === "save" && isAdmin()) adminSave(m, card);
        else if (a === "del" && isAdmin()) adminDelete(m);
    });
    document.addEventListener("input", function (e) {
        var el = e.target;
        if (el.matches('textarea[data-f="reply"], #fbText')) autoGrow(el);
        if (el.id === "fbText") { $("errText").classList.add("hidden"); if (!mine) draft.text = el.value; }
        if (el.id === "fbName" && !mine) draft.name = el.value;
    });
    var tas = $("tasbih");
    tas.addEventListener("click", tapDemo);
    tas.addEventListener("keydown", function (e) {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); tapDemo(); }
    });
    $("demoAgain").addEventListener("click", resetDemo);
    var nav = $("nav");
    function onScroll() { nav.classList.toggle("scrolled", window.scrollY > 8); }
    window.addEventListener("scroll", onScroll, { passive: true });

    /* ===================== СТАРТ ===================== */
    $("year").textContent = String(new Date().getFullYear());
    buildLangSelect();
    buildBeads();
    applyTexts();
    renderMyBox();
    initShots();
    onScroll();
    checkApk();
    // Проверка вёрстки ленты на своём компьютере: localhost/site.html?sample=1
    if (location.hostname === "localhost" && P.get("sample")) {
        var ago = function (d) { return { toMillis: function () { return Date.now() - d * 864e5; } }; };
        messages = [
            { id: "s1", uid: "a", name: "Ахмад", rating: 5, likes: 14, createdAt: ago(3), text: "Лучший тасбих, которым я пользовался. Удобно, что можно ставить свою цель." },
            { id: "s2", uid: "b", name: "Mariam", rating: 4, likes: 6, createdAt: ago(1), status: "progress", text: "Please add a widget for the home screen!", reply: "Thank you, we're already working on it." },
            { id: "s3", uid: "c", name: "Bekzod", rating: 5, likes: 3, createdAt: ago(6), status: "done", text: "Bomdoddan keyin vazifalar yangilanishi juda qulay." },
            { id: "s4", uid: "d", name: "Yusuf", rating: 3, likes: 0, createdAt: ago(0), text: "Компас киблы иногда показывает неточно." }
        ];
        lastRatings = [5, 4, 5, 3, 5, 5, 4];
        loaded = true;
        // ?sample=admin — посмотреть форму отзыва и поля разработчика (без записи в базу)
        if (P.get("sample") === "admin") { F = {}; user = { uid: ADMIN_UID, displayName: "Sunnatilla" }; renderMyBox(); }
        renderSummary(lastRatings);
        renderFeed();
        return;
    }
    initFirebase()
        .then(loadAll)
        .then(function () { renderMyBox(); return loadMyLikes(); })
        .then(function () { renderFeed(); flashFromHash(); })
        .catch(function () {
            $("state").textContent = t("loadError");
            $("state").classList.remove("hidden");
        });
})();
