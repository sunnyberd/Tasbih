// Azkar — сайт отзывов (reviews.html).
// Читает отзывы из Firebase: ratings/{uid} (оценки) и messages/{id} (тексты).
// Лайки — после входа через Google (тот же аккаунт, что и в приложении).
// Разработчик (ADMIN_UID) видит под каждым отзывом поле ответа, статус и удаление.
// Тексты — из тех же файлов i18n/, что и у приложения (раздел feedbackPage).

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
    // Ссылка на APK (например, из GitHub Releases). Пусто — кнопка «Скачать» скрыта.
    var APK_URL = "";
    var I18N_VERSION = "116";
    var LANGS = ["en", "de", "es", "fr", "it", "ja", "ko", "ru", "uz", "zh", "tr", "hi", "id", "ms", "th"];
    var THEMES = {
        "dark": ["#0a0a0a", "#d4af37"], "dark-emerald": ["#060f0a", "#2ecc71"], "dark-purple": ["#07050f", "#a855f7"],
        "dark-blue": ["#030b12", "#38bdf8"], "dark-rose": ["#0f0509", "#f472b6"],
        "light": ["#f8f6f2", "#b85c1a"], "light-rosesapphire": ["#fdf2f6", "#c2698f"], "light-lavender": ["#f5f3fa", "#7c5cbf"],
        "light-ocean": ["#f0f7fc", "#0369a1"], "light-mint": ["#f0faf6", "#0d7a5f"]
    };
    var STAR_PATH = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";
    var HEART_PATH = "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z";
    var G_LOGO = '<svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

    function $(id) { return document.getElementById(id); }
    function esc(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }
    function params() { try { return new URLSearchParams(location.search); } catch (e) { return { get: function () { return null; } }; } }
    function appSettings() { try { return JSON.parse(localStorage.getItem("azkar_settings") || "{}") || {}; } catch (e) { return {}; } }
    function tsMs(v) { return v && typeof v.toMillis === "function" ? v.toMillis() : 0; }
    function starsHtml(n) {
        var h = "";
        for (var i = 1; i <= 5; i++) h += '<svg class="' + (i <= n ? "f" : "") + '" viewBox="0 0 24 24"><path d="' + STAR_PATH + '"/></svg>';
        return '<span class="stars">' + h + "</span>";
    }

    /* ===== ЯЗЫК (переводы из i18n/) ===== */
    var P = params();
    var lang = P.get("lang") || appSettings().language || (navigator.language || "en").slice(0, 2).toLowerCase();
    if (LANGS.indexOf(lang) < 0) lang = "en";
    var DICT = {};
    window.AZKAR_I18N_REGISTER = function (l, dict, ui) {
        if (ui && ui.feedbackPage) Object.keys(ui.feedbackPage).forEach(function (k) { DICT[k] = ui.feedbackPage[k]; });
    };
    function loadScript(src) {
        return new Promise(function (resolve) {
            var el = document.createElement("script");
            el.src = src;
            el.onload = el.onerror = function () { resolve(); };
            document.head.appendChild(el);
        });
    }
    function t(key) {
        var d = DICT[lang] || {}, v = d[key];
        if (v == null && DICT.en) v = DICT.en[key];
        return v == null ? "" : v;
    }
    function applyTexts() {
        document.documentElement.lang = lang;
        document.querySelectorAll("[data-t]").forEach(function (el) {
            var v = t(el.getAttribute("data-t"));
            if (v) el.textContent = v;
        });
        var title = t("headerTitle");
        if (title) document.title = "Azkar — " + title;
    }
    function fmtDate(ms) {
        try { return new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: "numeric" }).format(new Date(ms)); }
        catch (e) { return new Date(ms).toLocaleDateString(); }
    }
    function statusLabel(s) {
        return s === "done" ? t("statusDone") : s === "progress" ? t("statusProgress") : s === "review" ? t("statusReview") : "";
    }

    /* ===== ТЕМА (как в приложении) ===== */
    (function applyTheme() {
        var id = P.get("theme") || appSettings().theme || "dark";
        var th = THEMES[id] || THEMES.dark;
        var root = document.documentElement;
        root.style.setProperty("--bg", th[0]);
        root.style.setProperty("--gold", th[1]);
        root.style.setProperty("--border", hexA(th[1], 0.22));
        root.style.setProperty("--glow", hexA(th[1], 0.14));
        if (id.indexOf("light") === 0) root.classList.add("light");
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", th[0]);
    })();
    function hexA(hex, a) {
        var n = parseInt(hex.slice(1), 16);
        return "rgba(" + (n >> 16 & 255) + ", " + (n >> 8 & 255) + ", " + (n & 255) + ", " + a + ")";
    }

    /* ===== FIREBASE ===== */
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
                renderAccount();
                if (loaded) loadMyLikes().then(renderFeed);
            });
            return A.getRedirectResult(auth).catch(function () {});
        });
    }
    function isAdmin() { return !!(user && user.uid === ADMIN_UID); }

    /* ===== ДАННЫЕ ===== */
    var messages = [];
    var liked = {};
    var sortMode = "top";
    var loaded = false;
    function loadAll() {
        return Promise.all([
            F.getDocs(F.query(F.collection(db, "messages"), F.limit(500))),
            F.getDocs(F.query(F.collection(db, "ratings"), F.limit(5000)))
        ]).then(function (res) {
            messages = res[0].docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
            loaded = true;
            renderSummary(res[1].docs.map(function (d) { return d.data().rating | 0; }));
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

    /* ===== ОТРИСОВКА ===== */
    function renderSummary(ratings) {
        var el = $("summary");
        ratings = ratings.filter(function (r) { return r >= 1 && r <= 5; });
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
    function renderAccount() {
        var el = $("account");
        if (user) {
            el.innerHTML = '<div class="grow"><b>' + esc(user.displayName || user.email || "") + "</b></div>" +
                '<button type="button" class="g-btn" data-act="signout">' + esc(t("signOut")) + "</button>";
        } else {
            el.innerHTML = '<div class="grow">' + esc(t("signInHint")) + "</div>" +
                '<button type="button" class="g-btn" data-act="signin">' + G_LOGO + esc(t("signIn")) + "</button>";
        }
    }
    function sorted() {
        var list = messages.slice();
        if (sortMode === "new") list.sort(function (a, b) { return tsMs(b.createdAt) - tsMs(a.createdAt); });
        else list.sort(function (a, b) { return ((b.likes | 0) - (a.likes | 0)) || (tsMs(b.createdAt) - tsMs(a.createdAt)); });
        return list;
    }
    function msgHtml(m) {
        var mine = user && user.uid === m.uid;
        var name = m.name || "—";
        var date = fmtDate(tsMs(m.createdAt) || Date.now()) + (m.editedAt ? " · " + t("edited") : "");
        var st = statusLabel(m.status);
        var h = '<article class="msg card" id="m-' + esc(m.id) + '" data-id="' + esc(m.id) + '">' +
            '<div class="msg-head"><div class="avatar">' + esc(name.charAt(0).toUpperCase()) + "</div>" +
            '<div class="who"><div class="who-name">' + esc(name) + (mine ? '<span class="you">' + esc(t("you")) + "</span>" : "") + "</div>" +
            '<div class="who-date">' + esc(date) + "</div></div>" + starsHtml(m.rating | 0) + "</div>" +
            '<p class="msg-text">' + esc(m.text || "") + "</p>";
        if (m.reply) {
            h += '<div class="reply"><div class="reply-label">' + esc(t("devReply")) + '</div><div class="reply-text">' + esc(m.reply) + "</div></div>";
        }
        h += '<div class="msg-foot"><button type="button" class="like' + (liked[m.id] ? " on" : "") + '" data-act="like" aria-pressed="' + (liked[m.id] ? "true" : "false") + '">' +
            '<svg viewBox="0 0 24 24"><path d="' + HEART_PATH + '"/></svg>' + (m.likes | 0) + "</button>" +
            (st ? '<span class="status' + (m.status === "done" ? " done" : "") + '">' + esc(st) + "</span>" : "") + "</div>";
        if (isAdmin()) {
            var opts = [["", t("statusNone")], ["review", t("statusReview")], ["progress", t("statusProgress")], ["done", t("statusDone")]];
            h += '<div class="admin"><select data-f="status">' + opts.map(function (o) {
                    return '<option value="' + o[0] + '"' + ((m.status || "") === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>";
                }).join("") + "</select>" +
                '<textarea data-f="reply" placeholder="' + esc(t("replyPh")) + '">' + esc(m.reply || "") + "</textarea>" +
                '<div class="admin-row"><button type="button" class="del" data-act="del">' + esc(t("actDelete")) + '</button>' +
                '<button type="button" data-act="save">' + esc(t("btnSave")) + "</button></div></div>";
        }
        return h + "</article>";
    }
    function renderFeed() {
        var feed = $("feed");
        var state = $("state");
        if (!messages.length) {
            feed.innerHTML = "";
            state.textContent = t("emptyTitle");
            state.classList.remove("hidden");
            return;
        }
        state.classList.add("hidden");
        feed.innerHTML = sorted().map(msgHtml).join("");
    }
    function flashFromHash() {
        var id = decodeURIComponent((location.hash || "").replace(/^#/, ""));
        if (!id) return;
        var el = document.getElementById(id);
        if (!el) return;
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

    /* ===== ДЕЙСТВИЯ ===== */
    function signIn() {
        var provider = new A.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        A.signInWithPopup(auth, provider).catch(function (e) {
            var code = e && e.code || "";
            if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
                A.signInWithRedirect(auth, provider);
            }
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
            if (on) delete liked[m.id]; else liked[m.id] = true;
            m.likes = Math.max(0, (m.likes | 0) + (on ? -1 : 1));
            btn.classList.toggle("on", !on);
            btn.setAttribute("aria-pressed", on ? "false" : "true");
            btn.lastChild.textContent = String(m.likes);
        }).catch(function () { toast(t("errNetwork")); }).then(function () { btn.disabled = false; });
    }
    function adminSave(m, card) {
        var reply = card.querySelector('[data-f="reply"]').value.trim();
        var status = card.querySelector('[data-f="status"]').value;
        var patch = {
            reply: reply || F.deleteField(),
            status: status || F.deleteField()
        };
        if (reply && reply !== (m.reply || "")) patch.replyAt = F.serverTimestamp();
        F.updateDoc(F.doc(db, "messages", m.id), patch).then(function () {
            if (reply) m.reply = reply; else delete m.reply;
            if (status) m.status = status; else delete m.status;
            renderFeed();
            toast(t("toastUpdated"));
        }).catch(function () { toast(t("errNetwork")); });
    }
    function adminDelete(m) {
        if (!confirm(t("confirmDelMsg"))) return;
        F.deleteDoc(F.doc(db, "messages", m.id)).then(function () {
            messages = messages.filter(function (x) { return x.id !== m.id; });
            renderFeed();
            toast(t("toastDeleted"));
        }).catch(function () { toast(t("errNetwork")); });
    }

    document.addEventListener("click", function (e) {
        var sortBtn = e.target.closest("[data-sort]");
        if (sortBtn) {
            sortMode = sortBtn.dataset.sort;
            document.querySelectorAll("[data-sort]").forEach(function (b) { b.classList.toggle("on", b === sortBtn); });
            renderFeed();
            return;
        }
        var act = e.target.closest("[data-act]");
        if (!act || !F) return;
        var a = act.dataset.act;
        if (a === "signin") { signIn(); return; }
        if (a === "signout") { A.signOut(auth); return; }
        var card = act.closest(".msg");
        var m = card && messages.filter(function (x) { return x.id === card.dataset.id; })[0];
        if (!m) return;
        if (a === "like") toggleLike(m, act);
        else if (a === "save" && isAdmin()) adminSave(m, card);
        else if (a === "del" && isAdmin()) adminDelete(m);
    });

    /* ===== СТАРТ ===== */
    if (APK_URL) { $("apkLink").href = APK_URL; $("apkLink").classList.remove("hidden"); }
    var texts = loadScript("i18n/en.js?v=" + I18N_VERSION).then(function () {
        return lang === "en" ? null : loadScript("i18n/" + lang + ".js?v=" + I18N_VERSION);
    }).then(applyTexts);
    texts.then(function () { return initFirebase(); })
        .then(loadAll)
        .then(function () {
            renderAccount();
            return loadMyLikes();
        })
        .then(function () { renderFeed(); flashFromHash(); })
        .catch(function () {
            $("state").textContent = t("loadError") || "Error";
            $("state").classList.remove("hidden");
        });
})();
