// Azkar — страница «Отзывы и пожелания» (вынесена из index.html на этапе 4).
// После правок повысь APP_VERSION (?v= в index.html и в sw.js).

(function () {
    var R = document.getElementById("fbHost").attachShadow({ mode: "open" });
    // ЭТАП 5: содержимое страницы (разметка + ~45 КБ стилей) вставляется только при
    // первом открытии — раньше браузер разбирал его при каждом запуске приложения.
    var _fbMounted = false;
    function fbMount() {
        if (_fbMounted) return;
        _fbMounted = true;
        R.appendChild(document.getElementById("fbTemplate").content.cloneNode(true));
    }

    /* ==================== ЧАСТЬ 1: СЛОВАРИ ПЕРЕВОДОВ ==================== */
    var FB = (window.AZKAR_UI_TRANSLATIONS && window.AZKAR_UI_TRANSLATIONS.feedbackPage) || {};

    /* ==================== ЧАСТЬ 2: ЛОГИКА ПРИЛОЖЕНИЯ ==================== */
    /* У человека ОДИН отзыв: оценка (обязательно) + текст (можно без него).
       Хранится в Firebase (правила — в консоли Firestore):
         ratings/{uid}   — { rating, name, updatedAt }         — оценка, одна на человека
         messages/{id}   — { uid, name, text, rating, lang, app, likes, createdAt,
                             editedAt?, reply?, replyAt?, status? } — текст, если он есть
       После отправки форма и звёзды прячутся, остаётся «Ваш отзыв» с ✎ и корзиной.
       Правка — прямо в карточке. Удаление стирает отзыв везде (и с сайта).
       Ниже — витрина (средняя оценка и лучшие отзывы) со ссылкой на сайт отзывов. */
    (function () {
        "use strict";

        var SITE_URL = "https://sunnyberd.github.io/Tasbih/site.html";
        var MAX_TEXT = 1200;
        var MIN_TEXT = 4;
        var NET_TIMEOUT = 15000;
        var LS_DRAFT = "azkar_feedback_draft";
        var LS_NAME = "azkar_feedback_name";
        var LS_MINE = "azkar_fb_mine_";          // + uid: копия своего отзыва (показ без интернета)
        var LS_SHOWCASE = "azkar_fb_showcase";   // копия витрины
        var LS_SEEN = "azkar_fb_seen_";          // + uid: что из реакций уже показали
        var OLD_KEYS = ["azkar_feedback_reviews", "azkar_feedback_rating", "azkar_feedback_likes"];
        var THEME_DEFAULT = "dark";
        var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        var HOVERABLE = window.matchMedia && window.matchMedia("(hover: hover)").matches;

        /* ===== УТИЛИТЫ ===== */
        function $(id) { return R.getElementById(id); }
        function esc(s) {
            return String(s).replace(/[&<>"']/g, function (c) {
                return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
            });
        }
        function readStr(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
        function writeStr(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
        function delStr(k) { try { localStorage.removeItem(k); } catch (e) {} }
        function readJson(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
        function vibrate(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {} }
        function withTimeout(p) {
            return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error("timeout")); }, NET_TIMEOUT); })]);
        }
        function tsMs(v) {
            if (!v) return 0;
            if (typeof v.toMillis === "function") return v.toMillis();
            return typeof v === "number" ? v : 0;
        }
        function isNative() { return !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()); }
        function curLang() { return (typeof currentLang !== "undefined" && currentLang) ? currentLang : "en"; }

        /* ===== FIREBASE ===== */
        function fire() {
            if (typeof initFirebaseAccount !== "function") return Promise.reject(new Error("no firebase"));
            return initFirebaseAccount().then(function (f) {
                var user = f.auth.currentUser;
                return { db: f.db, F: f.firestoreApi, uid: user ? user.uid : null };
            });
        }

        /* ===== СОСТОЯНИЕ ===== */
        var lang = "en";
        var state = { rating: 0 };
        var mine = null;          // { rating, name, msgId, text, likes, reply, status, ts }
        var uid = null;
        var editing = null;       // { rating } — карточка в режиме правки
        var busy = false;
        var draftTimer = null;
        var toastTimer = null;

        /* ===== I18N ===== */
        function detectLang() { var c = curLang(); return FB[c] ? c : "en"; }
        function t(key) {
            var d = FB[lang] || FB.en || {};
            var v = d[key];
            if (v == null && FB.en) v = FB.en[key];
            return v == null ? key : v;
        }
        function tArr(key) {
            var d = FB[lang] || FB.en || {};
            return d[key] || (FB.en && FB.en[key]) || [];
        }
        function applyI18n() {
            R.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
            R.querySelectorAll("[data-i18n-ph]").forEach(function (el) { el.placeholder = t(el.getAttribute("data-i18n-ph")); });
            var back = $("backBtn");
            if (back) back.setAttribute("aria-label", t("back"));
            updateRatingCaption();
            updateCharCount();
            updateStarsAria();
            render();
            renderShowcase(readJson(LS_SHOWCASE));
        }
        function updateStarsAria() {
            var texts = tArr("ratingTexts");
            starBtns.forEach(function (btn, i) { btn.setAttribute("aria-label", texts[i] + " (" + (i + 1) + "/5)"); });
        }
        // В браузерах нет узбекских названий месяцев (выходит «2026 M10 27») — пишем сами
        var UZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
        function fmtDate(ms) {
            if (lang === "uz") { var d = new Date(ms); return d.getDate() + " " + UZ_MONTHS[d.getMonth()] + " " + d.getFullYear(); }
            try {
                return new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: "numeric" }).format(new Date(ms));
            } catch (e) { return new Date(ms).toLocaleDateString(); }
        }
        function statusLabel(s) {
            return s === "done" ? t("statusDone") : s === "progress" ? t("statusProgress") : s === "review" ? t("statusReview") : "";
        }

        /* ===== ЗВЁЗДЫ ===== */
        var STAR_PATH = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";
        var HEART_PATH = "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z";
        function starSvg(cls) { return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24"><path d="' + STAR_PATH + '"/></svg>'; }
        function starsHtml(n) { var h = ""; for (var i = 1; i <= 5; i++) h += starSvg(i <= n ? "f" : ""); return h; }
        var starBtns = [];
        function buildStarsRow() {
            var row = $("starsRow");
            starBtns = [];
            for (var i = 1; i <= 5; i++) {
                var b = document.createElement("button");
                b.type = "button";
                b.className = "star-btn";
                b.setAttribute("role", "radio");
                b.setAttribute("aria-checked", "false");
                b.innerHTML = starSvg("");
                (function (v, btn) {
                    btn.addEventListener("click", function () { setRating(v, true); saveDraft(); });
                })(i, b);
                row.appendChild(b);
                starBtns.push(b);
            }
            if (HOVERABLE) {
                starBtns.forEach(function (btn, idx) {
                    btn.addEventListener("mouseenter", function () {
                        updateStarsVisual(idx + 1);
                        $("ratingCaption").textContent = tArr("ratingTexts")[idx];
                        $("ratingCaption").classList.remove("empty");
                    });
                });
                row.addEventListener("mouseleave", function () { updateStarsVisual(state.rating); updateRatingCaption(); });
            }
        }
        function updateStarsVisual(v) {
            starBtns.forEach(function (b, i) {
                b.classList.toggle("on", i < v);
                b.setAttribute("aria-checked", i < v ? "true" : "false");
            });
        }
        function setRating(v, animate) {
            state.rating = v;
            updateStarsVisual(v);
            updateRatingCaption();
            hideErr("errRating");
            var btn = starBtns[v - 1];
            if (btn && animate && !REDUCED) {
                starBtns.forEach(function (b) { b.classList.remove("pop"); });
                void btn.offsetWidth;
                btn.classList.add("pop");
                vibrate(12);
            }
        }
        function updateRatingCaption() {
            var c = $("ratingCaption");
            if (!c) return;
            if (state.rating) {
                c.textContent = tArr("ratingTexts")[state.rating - 1];
                c.classList.remove("empty");
            } else {
                c.textContent = t("ratingEmpty");
                c.classList.add("empty");
            }
        }

        /* ===== ИМЯ ИЗ GOOGLE-АККАУНТА ===== */
        function googleName() {
            try {
                var acc = (typeof loadGoogleAccount === "function") ? loadGoogleAccount() : null;
                if (!acc) return "";
                var n = String(acc.given_name || acc.name || "").trim();
                if (!n || n.indexOf("@") > -1 || n === "Google user") return "";
                return n.slice(0, 40);
            } catch (e) { return ""; }
        }
        function fillName() {
            var el = $("nameInput");
            if (el.value.trim()) return;
            el.value = readStr(LS_NAME, "") || googleName();
        }
        function nameOf(v) { return (String(v || "").trim() || googleName() || t("guest")).slice(0, 40); }

        /* ===== ЧЕРНОВИК (только пока отзыва ещё нет) ===== */
        function saveDraft() {
            writeStr(LS_DRAFT, JSON.stringify({ name: $("nameInput").value, text: $("msgInput").value, rating: state.rating }));
        }
        function scheduleDraft() { clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 350); }
        function restoreDraft() {
            var d = readJson(LS_DRAFT);
            if (d && typeof d === "object") {
                if (typeof d.name === "string" && d.name.trim()) $("nameInput").value = d.name;
                if (typeof d.text === "string") $("msgInput").value = d.text;
                if (d.rating >= 1 && d.rating <= 5) setRating(d.rating, false);
            }
            autoGrow($("msgInput"));
            updateCharCount();
        }
        function clearForm() {
            clearTimeout(draftTimer);
            delStr(LS_DRAFT);
            $("msgInput").value = "";
            autoGrow($("msgInput"));
            updateCharCount();
            setRating(0, false);
            hideErr("errRating");
            hideErr("errMsg");
        }

        /* ===== ПОЛЯ ===== */
        function autoGrow(el) {
            if (!el) return;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 320) + "px";
        }
        function updateCharCount() {
            var el = $("msgInput");
            var c = $("charCount");
            if (!el || !c) return;
            var len = el.value.length;
            c.textContent = len + " / " + MAX_TEXT;
            c.classList.toggle("warn", len > MAX_TEXT * 0.9 && len < MAX_TEXT);
            c.classList.toggle("max", len >= MAX_TEXT);
        }
        function showErr(id, target) {
            var el = $(id);
            el.classList.add("show");
            clearTimeout(el._t);
            el._t = setTimeout(function () { el.classList.remove("show"); }, 3400);
            if (target && !REDUCED) {
                target.classList.remove("shake");
                void target.offsetWidth;
                target.classList.add("shake");
                setTimeout(function () { target.classList.remove("shake"); }, 460);
            }
        }
        function hideErr(id) { var el = $(id); if (el) el.classList.remove("show"); }

        /* ===== СВОЙ ОТЗЫВ: загрузка и копия в телефоне ===== */
        function saveMineCache() {
            if (!uid) return;
            if (mine) writeStr(LS_MINE + uid, JSON.stringify(mine)); else delStr(LS_MINE + uid);
        }
        function loadMine() {
            return fire().then(function (f) {
                if (!f.uid) return null;
                uid = f.uid;
                var F = f.F;
                return withTimeout(Promise.all([
                    F.getDoc(F.doc(f.db, "ratings", f.uid)),
                    F.getDocs(F.query(F.collection(f.db, "messages"), F.where("uid", "==", f.uid), F.limit(5)))
                ])).then(function (res) {
                    var r = res[0].exists() ? res[0].data() : null;
                    var msgs = res[1].docs.map(function (d) { var x = d.data(); x.id = d.id; return x; })
                        .sort(function (a, b) { return tsMs(b.createdAt) - tsMs(a.createdAt); });
                    var m = msgs[0] || null;
                    if (!r && !m) { mine = null; saveMineCache(); return mine; }
                    mine = {
                        rating: r ? r.rating : (m.rating || 0),
                        name: (r && r.name) || (m && m.name) || "",
                        msgId: m ? m.id : null,
                        text: m ? m.text : "",
                        likes: m ? (m.likes | 0) : 0,
                        reply: m && m.reply ? String(m.reply) : "",
                        status: m && m.status ? String(m.status) : "",
                        ts: tsMs(r && r.updatedAt) || tsMs(m && m.createdAt) || Date.now()
                    };
                    saveMineCache();
                    markSeen(mine);
                    return mine;
                });
            });
        }

        /* ===== ОТРИСОВКА ===== */
        function render() {
            var has = !!mine;
            $("rateBlock").classList.toggle("hidden", has);
            $("composer").classList.toggle("hidden", has);
            var block = $("mineBlock");
            block.classList.toggle("hidden", !has);
            if (!has) { block.innerHTML = ""; return; }

            var pencil = '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
            var trash = '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
            var html = '<div class="mine-head"><span class="mine-title">' + esc(t("yourReview")) + "</span>";
            if (!editing) {
                html += '<div class="mine-actions">' +
                    '<button type="button" class="rv-act" data-act="edit" aria-label="' + esc(t("actEdit")) + '" title="' + esc(t("actEdit")) + '">' + pencil + "</button>" +
                    '<button type="button" class="rv-act danger" data-act="del" aria-label="' + esc(t("actDelete")) + '" title="' + esc(t("actDelete")) + '">' + trash + "</button>" +
                    "</div>";
            }
            html += "</div>";

            if (editing) {
                var sb = "";
                for (var i = 1; i <= 5; i++) {
                    sb += '<button type="button" data-star="' + i + '" aria-label="' + esc(tArr("ratingTexts")[i - 1] || "") + '">' + starSvg(i <= editing.rating ? "f" : "") + "</button>";
                }
                html += '<div class="mine-stars editing" role="radiogroup">' + sb + "</div>" +
                    '<div class="mine-edit">' +
                        '<input class="input" id="mineName" type="text" maxlength="40" value="' + esc(mine.name || "") + '" placeholder="' + esc(t("phName")) + '">' +
                        '<textarea class="textarea" id="mineText" maxlength="' + MAX_TEXT + '" placeholder="' + esc(t("phMessage")) + '">' + esc(mine.text || "") + "</textarea>" +
                        '<div class="field-err" id="errMineMsg">' + esc(t("errMessage")) + "</div>" +
                        '<div class="mine-edit-actions">' +
                            '<button type="button" class="btn-ghost" data-act="cancel">' + esc(t("btnCancel")) + "</button>" +
                            '<button type="button" class="btn-gold" data-act="save">' + esc(t("btnSave")) + "</button>" +
                        "</div>" +
                    "</div>";
            } else {
                html += '<div class="mine-stars" aria-label="' + mine.rating + '/5">' + starsHtml(mine.rating) + "</div>";
                html += '<div class="mine-name">' + esc(mine.name || t("guest")) + "</div>";
                if (mine.text) html += '<p class="mine-text">' + esc(mine.text) + "</p>";
                else html += '<p class="mine-empty">' + esc(t("onlyRating")) + "</p>";
                var meta = '<span>' + esc(fmtDate(mine.ts)) + "</span>";
                if (mine.msgId && mine.likes > 0) meta += '<span class="mine-likes"><svg viewBox="0 0 24 24"><path d="' + HEART_PATH + '"/></svg>' + mine.likes + "</span>";
                if (statusLabel(mine.status)) meta += '<span class="fb-status' + (mine.status === "done" ? " done" : "") + '">' + esc(statusLabel(mine.status)) + "</span>";
                html += '<div class="mine-meta">' + meta + "</div>";
                if (mine.reply) {
                    html += '<div class="mine-reply"><div class="mine-reply-label">' + esc(t("devReply")) + '</div><div class="mine-reply-text">' + esc(mine.reply) + "</div></div>";
                }
            }
            block.innerHTML = html;
            if (editing) {
                var ta = $("mineText");
                autoGrow(ta);
                ta.addEventListener("input", function () { autoGrow(ta); hideErr("errMineMsg"); });
            }
        }

        function setLoading(on) { $("fbLoading").classList.toggle("hidden", !on); }

        /* ===== ВИТРИНА ===== */
        function renderShowcase(data) {
            var el = $("showcase");
            if (!el) return;
            if (!data) { el.classList.add("hidden"); return; }
            el.classList.remove("hidden");
            var arrow = '<svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';
            var html = "";
            if (data.n > 0) {
                html += '<div class="sc-head"><span class="sc-avg">' + Number(data.avg || 0).toFixed(1) + '</span><div>' +
                    '<div class="sc-stars">' + starsHtml(Math.round(data.avg || 0)) + "</div>" +
                    '<div class="sc-count">' + esc(t("ratingsCount").replace("{n}", data.n)) + "</div></div></div>";
                if (data.top && data.top.length) {
                    html += '<div class="sc-quotes">' + data.top.map(function (q) {
                        return '<div class="sc-quote"><div class="sc-quote-text">«' + esc(q.text) + '»</div>' +
                            '<div class="sc-quote-by">— ' + esc(q.name || t("guest")) + ' <span class="sc-stars">' + starsHtml(q.rating) + "</span></div></div>";
                    }).join("") + "</div>";
                }
            } else {
                html += '<div class="sc-empty">' + esc(t("beFirst")) + "</div>";
            }
            html += '<button type="button" class="sc-link" data-act="site">' + esc(t("allReviewsLink")) + arrow + "</button>";
            el.innerHTML = html;
        }
        function loadShowcase() {
            return fire().then(function (f) {
                var F = f.F;
                var ratings = F.collection(f.db, "ratings");
                return withTimeout(Promise.all([
                    F.getAggregateFromServer(ratings, { avg: F.average("rating"), n: F.count() }),
                    F.getDocs(F.query(F.collection(f.db, "messages"), F.orderBy("likes", "desc"), F.limit(6)))
                ])).then(function (res) {
                    var a = res[0].data();
                    // Для витрины — хорошие отзывы с текстом (сначала самые залайканные)
                    var top = res[1].docs.map(function (d) { return d.data(); })
                        .filter(function (m) { return m.text && m.rating >= 4; })
                        .slice(0, 2)
                        .map(function (m) { return { text: String(m.text).slice(0, 220), name: m.name || "", rating: m.rating | 0 }; });
                    var data = { avg: a.avg || 0, n: a.n || 0, top: top };
                    writeStr(LS_SHOWCASE, JSON.stringify(data));
                    renderShowcase(data);
                });
            }).catch(function () { /* без интернета — остаётся прошлая копия */ });
        }

        function siteUrl(msgId) {
            var u = SITE_URL + "?lang=" + encodeURIComponent(curLang());
            try {
                var theme = (JSON.parse(localStorage.getItem("azkar_settings") || "{}") || {}).theme || THEME_DEFAULT;
                u += "&theme=" + encodeURIComponent(theme);
            } catch (e) {}
            return u + (msgId ? "#m-" + encodeURIComponent(msgId) : "#reviews");
        }
        function openSite(msgId) {
            var url = siteUrl(msgId);
            if (typeof openExternalUrl === "function") openExternalUrl(url);
            else window.open(url, "_blank", "noopener");
        }

        /* ===== ТОСТ ===== */
        function showToast(msg, dur) {
            var el = $("toast");
            el.textContent = msg;
            el.classList.add("show");
            clearTimeout(toastTimer);
            toastTimer = setTimeout(function () { el.classList.remove("show"); }, dur || 2400);
        }
        function netError() { showToast(t("errNetwork"), 3200); vibrate(60); }

        /* ===== ОТПРАВКА (первый раз) ===== */
        function msgDoc(f, text, rating, name) {
            return {
                uid: f.uid, name: name, text: text, rating: rating,
                lang: curLang(), app: isNative() ? "android" : "web",
                likes: 0, createdAt: f.F.serverTimestamp()
            };
        }
        function onSubmit() {
            if (busy) return;
            var text = $("msgInput").value.trim().slice(0, MAX_TEXT);
            var ok = true;
            if (!state.rating) { showErr("errRating", $("starsRow")); ok = false; }
            if (text && text.length < MIN_TEXT) { showErr("errMsg", $("msgInput")); ok = false; }
            if (!ok) { vibrate(60); return; }
            if (navigator.onLine === false) { netError(); return; }

            var btn = $("submitBtn");
            busy = true;
            btn.classList.add("loading");
            btn.disabled = true;
            var name = nameOf($("nameInput").value);
            var rating = state.rating;
            fire().then(function (f) {
                if (!f.uid) throw new Error("signed out");
                uid = f.uid;
                var F = f.F;
                var batch = F.writeBatch(f.db);
                batch.set(F.doc(f.db, "ratings", f.uid), { rating: rating, name: name, updatedAt: F.serverTimestamp() });
                var ref = null;
                if (text) {
                    ref = F.doc(F.collection(f.db, "messages"));
                    batch.set(ref, msgDoc(f, text, rating, name));
                }
                return withTimeout(batch.commit()).then(function () {
                    mine = { rating: rating, name: name, msgId: ref ? ref.id : null, text: text, likes: 0, reply: "", status: "", ts: Date.now() };
                    saveMineCache();
                    markSeen(mine);
                    writeStr(LS_NAME, name);
                    clearForm();
                    render();
                    $("successOverlay").classList.add("show");
                    vibrate([12, 60, 12]);
                    loadShowcase();
                });
            }).catch(function () { netError(); }).then(function () {
                busy = false;
                btn.classList.remove("loading");
                btn.disabled = false;
            });
        }

        /* ===== ПРАВКА ПРЯМО В КАРТОЧКЕ ===== */
        function startEdit() {
            if (!mine) return;
            editing = { rating: mine.rating };
            render();
            var ta = $("mineText");
            if (ta) { ta.focus(); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) {} }
        }
        function cancelEdit() { editing = null; render(); }
        function saveEdit() {
            if (busy || !mine || !editing) return;
            var text = $("mineText").value.trim().slice(0, MAX_TEXT);
            if (text && text.length < MIN_TEXT) { showErr("errMineMsg", $("mineText")); vibrate(60); return; }
            if (navigator.onLine === false) { netError(); return; }
            var name = nameOf($("mineName").value);
            var rating = editing.rating;
            busy = true;
            fire().then(function (f) {
                if (!f.uid) throw new Error("signed out");
                var F = f.F;
                var batch = F.writeBatch(f.db);
                batch.set(F.doc(f.db, "ratings", f.uid), { rating: rating, name: name, updatedAt: F.serverTimestamp() });
                var msgId = mine.msgId;
                var ref = msgId ? F.doc(f.db, "messages", msgId) : null;
                if (ref && text) batch.update(ref, { name: name, text: text, rating: rating, editedAt: F.serverTimestamp() });
                else if (ref && !text) { batch.delete(ref); msgId = null; }
                else if (!ref && text) {
                    ref = F.doc(F.collection(f.db, "messages"));
                    batch.set(ref, msgDoc(f, text, rating, name));
                    msgId = ref.id;
                }
                return withTimeout(batch.commit()).then(function () {
                    var keep = msgId && msgId === mine.msgId;
                    mine = {
                        rating: rating, name: name, msgId: msgId, text: text,
                        likes: keep ? mine.likes : 0, reply: keep ? mine.reply : "", status: keep ? mine.status : "",
                        ts: Date.now()
                    };
                    saveMineCache();
                    markSeen(mine);
                    writeStr(LS_NAME, name);
                    editing = null;
                    render();
                    showToast(t("toastUpdated"));
                    vibrate(15);
                    loadShowcase();
                });
            }).catch(function () { netError(); }).then(function () { busy = false; });
        }

        /* ===== УДАЛЕНИЕ ===== */
        function openConfirm() { $("confirmOverlay").classList.add("show"); }
        function closeConfirm() { $("confirmOverlay").classList.remove("show"); }
        function doDelete() {
            if (busy || !mine) { closeConfirm(); return; }
            if (navigator.onLine === false) { closeConfirm(); netError(); return; }
            busy = true;
            fire().then(function (f) {
                if (!f.uid) throw new Error("signed out");
                var F = f.F;
                var batch = F.writeBatch(f.db);
                batch.delete(F.doc(f.db, "ratings", f.uid));
                if (mine.msgId) batch.delete(F.doc(f.db, "messages", mine.msgId));
                return withTimeout(batch.commit()).then(function () {
                    mine = null;
                    editing = null;
                    saveMineCache();
                    closeConfirm();
                    clearForm();
                    fillName();
                    render();
                    showToast(t("toastDeleted"));
                    vibrate(20);
                    loadShowcase();
                });
            }).catch(function () { closeConfirm(); netError(); }).then(function () { busy = false; });
        }

        /* ===== ПОЯВЛЕНИЕ СЕКЦИЙ ПРИ СКРОЛЛЕ ===== */
        function initReveal() {
            var els = R.querySelectorAll(".reveal");
            if (REDUCED || !("IntersectionObserver" in window)) {
                els.forEach(function (el) { el.classList.add("in"); });
                return;
            }
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (en) {
                    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
                });
            }, { threshold: 0.08 });
            els.forEach(function (el) { io.observe(el); });
        }

        /* ===== СОБЫТИЯ ===== */
        function bindEvents() {
            var back = $("backBtn");
            if (back) back.addEventListener("click", function () { if (editing) { editing = null; render(); } switchTab("settings"); });

            $("msgInput").addEventListener("input", function () {
                autoGrow($("msgInput"));
                updateCharCount();
                hideErr("errMsg");
                scheduleDraft();
            });
            $("nameInput").addEventListener("input", scheduleDraft);
            $("submitBtn").addEventListener("click", onSubmit);

            $("mineBlock").addEventListener("click", function (e) {
                var star = e.target.closest("[data-star]");
                if (star && editing) {
                    editing.rating = Number(star.dataset.star);
                    R.querySelectorAll("#mineBlock [data-star] svg").forEach(function (svg, i) { svg.classList.toggle("f", i < editing.rating); });
                    vibrate(12);
                    return;
                }
                var act = e.target.closest("[data-act]");
                if (!act) return;
                var a = act.dataset.act;
                if (a === "edit") startEdit();
                else if (a === "del") openConfirm();
                else if (a === "cancel") cancelEdit();
                else if (a === "save") saveEdit();
            });
            $("showcase").addEventListener("click", function (e) {
                if (e.target.closest("[data-act='site']")) openSite();
            });

            $("confirmYesBtn").addEventListener("click", doDelete);
            $("confirmNoBtn").addEventListener("click", closeConfirm);
            $("confirmOverlay").addEventListener("click", function (e) { if (e.target === this) closeConfirm(); });

            function hideSuccess() { $("successOverlay").classList.remove("show"); }
            $("successDoneBtn").addEventListener("click", hideSuccess);
            $("successSeeBtn").addEventListener("click", function () { hideSuccess(); openSite(); });
            $("successOverlay").addEventListener("click", function (e) { if (e.target === this) hideSuccess(); });
        }

        /* ===== ОТКРЫТИЕ СТРАНИЦЫ ===== */
        function refresh() {
            var cachedUid = (typeof firebaseAuth !== "undefined" && firebaseAuth && firebaseAuth.currentUser) ? firebaseAuth.currentUser.uid : null;
            if (cachedUid) {
                uid = cachedUid;
                var cached = readJson(LS_MINE + cachedUid);
                if (cached && !editing) { mine = cached; render(); }
            }
            setLoading(!mine && !!cachedUid);
            loadMine().then(function () {
                if (!editing) render();
                if (!mine) fillName();
            }).catch(function () {}).then(function () { setLoading(false); });
            loadShowcase();
        }

        function init() {
            OLD_KEYS.forEach(delStr);   // старые отзывы хранились только в телефоне
            lang = detectLang();
            buildStarsRow();
            bindEvents();
            restoreDraft();
            fillName();
            applyI18n();
            initReveal();
            refresh();
        }

        var inited = false;
        window.fbOpen = function () {
            fbMount();
            if (!inited) { inited = true; init(); return; }
            lang = detectLang();
            fillName();
            applyI18n();
            refresh();
        };

        /* ===== РЕАКЦИИ НА МОЙ ОТЗЫВ: лайки, ответ разработчика, статус ===== */
        // Проверяем при запуске и при возврате в приложение (не чаще раза в 15 минут).
        // Новое — баннер сверху; не тронули — он уходит в шторку, тап открывает сайт.
        var CHECK_EVERY = 15 * 60 * 1000;
        var lastCheck = 0;
        function markSeen(m) {
            if (!uid || !m) return;
            writeStr(LS_SEEN + uid, JSON.stringify({ id: m.msgId || "", likes: m.likes | 0, reply: m.reply || "", status: m.status || "" }));
        }
        function checkReactions() {
            if (Date.now() - lastCheck < CHECK_EVERY) return;
            if (!(typeof googleAccount !== "undefined" && googleAccount)) return;
            if (navigator.onLine === false || document.hidden) return;
            lastCheck = Date.now();
            loadMine().then(function () {}).catch(function () {});
        }
        // loadMine() сравнивает с тем, что уже показывали, ДО markSeen — оборачиваем
        var _loadMine = loadMine;
        loadMine = function () {
            var before = null;
            return fire().then(function (f) {
                if (f.uid) before = readJson(LS_SEEN + f.uid);
                return _loadMine();
            }).then(function (m) {
                if (m && m.msgId && before && before.id === m.msgId) notifyReaction(before, m);
                return m;
            });
        };
        function notifyReaction(before, m) {
            if (typeof showNotifBanner !== "function") return;
            if (typeof notifMasterOn === "function" && !notifMasterOn()) return;
            lang = detectLang();
            var url = siteUrl(m.msgId);
            if (m.reply && m.reply !== before.reply) {
                showNotifBanner(t("notifReplyTitle"), m.reply.slice(0, 160), "💬", "azkar-fb-reply-" + m.msgId, url);
            } else if (m.status && m.status !== before.status && statusLabel(m.status)) {
                showNotifBanner(t("notifStatusTitle").replace("{s}", statusLabel(m.status)), (m.text || "").slice(0, 120), m.status === "done" ? "✅" : "🛠", "azkar-fb-status-" + m.msgId, url);
            } else if ((m.likes | 0) > (before.likes | 0)) {
                showNotifBanner(t("notifLikeTitle"), t("notifLikeBody").replace("{n}", m.likes), "❤️", "azkar-fb-like-" + m.msgId, url);
            }
        }
        document.addEventListener("visibilitychange", function () { if (!document.hidden) setTimeout(checkReactions, 3000); });
        setTimeout(checkReactions, 12000);
    })();

})();
