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
    /* Одна форма без вкладок: 5 звёзд по центру, имя, сообщение (отзыв, пожелание
       или проблема — всё в одном). У человека одна оценка (её можно менять) и сколько
       угодно сообщений. Общая лента отзывов будет на отдельном лендинге. */
    (function () {
        "use strict";

        /* FEEDBACK_ENDPOINT — URL для автоотправки сообщения POST-запросом (пока не подключено) */
        var FEEDBACK_ENDPOINT = "";

        var MAX_TEXT = 1200;
        var LS_REVIEWS = "azkar_feedback_reviews";   // мои сообщения [{ id, name, text, rating, ts }]
        var LS_RATING = "azkar_feedback_rating";     // моя оценка 1–5 (после первой отправки)
        var LS_DRAFT = "azkar_feedback_draft";
        var LS_NAME = "azkar_feedback_name";
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
        function uid() {
            if (window.crypto && crypto.randomUUID) { try { return crypto.randomUUID(); } catch (e) {} }
            return "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        }
        function vibrate(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {} }
        function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

        /* ===== СОСТОЯНИЕ ===== */
        var messages = [];
        var myRating = 0;            // сохранённая оценка (0 — ещё не отправлял)
        var lang = "en";
        var state = { rating: 0 };
        var pendingDeleteId = null;
        var draftTimer = null;
        var toastTimer = null;

        /* ===== I18N ===== */
        function detectLang() {
            var c = (typeof currentLang !== "undefined") ? currentLang : "en";
            return FB[c] ? c : "en";
        }
        function t(key) {
            var d = FB[lang] || FB.en;
            var v = d[key];
            if (v == null) v = FB.en[key];
            return v == null ? key : v;
        }
        function tArr(key) {
            var d = FB[lang] || FB.en;
            return d[key] || FB.en[key] || [];
        }
        function applyI18n() {
            R.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
            R.querySelectorAll("[data-i18n-ph]").forEach(function (el) { el.placeholder = t(el.getAttribute("data-i18n-ph")); });
            var back = $("backBtn");
            if (back) back.setAttribute("aria-label", t("back"));
            updateRatingCaption();
            updateCharCount();
            updateStarsAria();
            renderMine();
        }
        function updateStarsAria() {
            var texts = tArr("ratingTexts");
            starBtns.forEach(function (btn, i) {
                btn.setAttribute("aria-label", texts[i] + " (" + (i + 1) + "/5)");
            });
        }
        function fmtDate(ts) {
            try {
                return new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(ts));
            } catch (e) { return new Date(ts).toLocaleString(); }
        }

        /* ===== ЗВЁЗДЫ ===== */
        var STAR_PATH = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";
        function starSvg(cls) {
            return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24"><path d="' + STAR_PATH + '"/></svg>';
        }
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
                    btn.addEventListener("click", function () { onStarClick(v); });
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
                row.addEventListener("mouseleave", function () {
                    updateStarsVisual(state.rating);
                    updateRatingCaption();
                });
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
        // Оценка уже отправлена — звёзды меняют её сразу; иначе это часть черновика
        function onStarClick(v) {
            setRating(v, true);
            if (myRating) {
                if (v === myRating) return;
                myRating = v;
                writeStr(LS_RATING, String(v));
                renderMine();
                showToast(t("toastRatingUpdated"));
            } else {
                saveDraft();
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
        // Имя, которое указано в аккаунте Google (не адрес почты)
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

        /* ===== ЧЕРНОВИК ===== */
        function saveDraft() {
            writeStr(LS_DRAFT, JSON.stringify({
                name: $("nameInput").value,
                text: $("msgInput").value,
                rating: myRating ? 0 : state.rating
            }));
        }
        function scheduleDraft() {
            clearTimeout(draftTimer);
            draftTimer = setTimeout(saveDraft, 350);
        }
        function restoreDraft() {
            var raw = readStr(LS_DRAFT, "");
            if (raw) {
                try {
                    var d = JSON.parse(raw);
                    if (d && typeof d === "object") {
                        if (typeof d.name === "string" && d.name.trim()) $("nameInput").value = d.name;
                        if (typeof d.text === "string") $("msgInput").value = d.text;
                        if (!myRating && d.rating >= 1 && d.rating <= 5) setRating(d.rating, false);
                    }
                } catch (e) {}
            }
            autoGrow();
            updateCharCount();
        }

        /* ===== ПОЛЯ ===== */
        function autoGrow() {
            var el = $("msgInput");
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
        function showErr(id) {
            var el = $(id);
            el.classList.add("show");
            clearTimeout(el._t);
            el._t = setTimeout(function () { el.classList.remove("show"); }, 3400);
            var target = id === "errRating" ? $("starsRow") : $("msgInput");
            if (target && !REDUCED) {
                target.classList.remove("shake");
                void target.offsetWidth;
                target.classList.add("shake");
                setTimeout(function () { target.classList.remove("shake"); }, 460);
            }
        }
        function hideErr(id) { $(id).classList.remove("show"); }

        /* ===== ХРАНИЛИЩЕ ===== */
        function loadMessages() {
            var raw = readStr(LS_REVIEWS, "");
            if (!raw) return [];
            try {
                var arr = JSON.parse(raw);
                if (!Array.isArray(arr)) return [];
                return arr.filter(function (r) {
                    // чужие записи из старой версии страницы не показываем
                    return r && typeof r.text === "string" && typeof r.ts === "number" && r.mine !== false;
                }).map(function (r) {
                    return {
                        id: r.id || uid(),
                        name: typeof r.name === "string" ? r.name.slice(0, 40) : "",
                        text: r.text.slice(0, MAX_TEXT),
                        rating: typeof r.rating === "number" ? Math.round(r.rating) : 0,
                        ts: r.ts
                    };
                });
            } catch (e) { return []; }
        }
        function persistMessages() { writeStr(LS_REVIEWS, JSON.stringify(messages)); }
        function loadMyRating() {
            var v = Number(readStr(LS_RATING, "0"));
            if (v >= 1 && v <= 5) return Math.round(v);
            // старая версия страницы: оценка из последнего отзыва
            var last = messages.slice().sort(function (a, b) { return b.ts - a.ts; })[0];
            return last && last.rating >= 1 && last.rating <= 5 ? last.rating : 0;
        }

        /* ===== БЛОК «ВАШ ОТЗЫВ» ===== */
        function renderMine() {
            var block = $("mineBlock");
            if (!block) return;
            var has = !!myRating || messages.length > 0;
            block.classList.toggle("hidden", !has);
            if (!has) return;
            var stars = "";
            for (var i = 1; i <= 5; i++) stars += starSvg(i <= myRating ? "f" : "");
            $("mineStars").innerHTML = stars;
            var delLabel = esc(t("actDelete"));
            $("mineList").innerHTML = messages.slice().sort(function (a, b) { return b.ts - a.ts; }).map(function (m) {
                return '<div class="mine-msg" data-id="' + esc(m.id) + '">' +
                    '<div class="mine-msg-body">' +
                        '<div class="mine-msg-text">' + esc(m.text) + "</div>" +
                        '<div class="mine-msg-date">' + esc(fmtDate(m.ts)) + "</div>" +
                    "</div>" +
                    '<button type="button" class="rv-act danger" data-act="del" aria-label="' + delLabel + '" title="' + delLabel + '">' +
                        '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
                    "</button>" +
                "</div>";
            }).join("");
        }

        /* ===== ТОСТ ===== */
        function showToast(msg, dur) {
            var el = $("toast");
            el.textContent = msg;
            el.classList.add("show");
            clearTimeout(toastTimer);
            toastTimer = setTimeout(function () { el.classList.remove("show"); }, dur || 2200);
        }

        /* ===== ОТПРАВКА ===== */
        function onSubmit() {
            var ok = true;
            var text = $("msgInput").value.trim();
            if (!state.rating) { showErr("errRating"); ok = false; }
            if (text.length < 4) { showErr("errMsg"); ok = false; }
            if (!ok) { vibrate(60); return; }

            var btn = $("submitBtn");
            btn.classList.add("loading");
            btn.disabled = true;

            wait(320).then(function () {
                var name = $("nameInput").value.trim().slice(0, 40);
                var msg = { id: uid(), name: name, text: text.slice(0, MAX_TEXT), rating: state.rating, ts: Date.now() };
                messages.unshift(msg);
                if (messages.length > 200) messages = messages.slice(0, 200);
                persistMessages();
                myRating = state.rating;
                writeStr(LS_RATING, String(myRating));
                if (name) writeStr(LS_NAME, name);

                clearTimeout(draftTimer);
                delStr(LS_DRAFT);
                $("msgInput").value = "";
                autoGrow();
                updateCharCount();
                hideErr("errRating");
                hideErr("errMsg");
                btn.classList.remove("loading");
                btn.disabled = false;

                renderMine();
                $("successOverlay").classList.add("show");
                vibrate([12, 60, 12]);

                if (FEEDBACK_ENDPOINT) {
                    try {
                        fetch(FEEDBACK_ENDPOINT, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(msg)
                        }).catch(function () {});
                    } catch (e) {}
                }
            });
        }
        function hideSuccess() { $("successOverlay").classList.remove("show"); }

        /* ===== УДАЛЕНИЕ СООБЩЕНИЯ ===== */
        function openConfirm(id) {
            pendingDeleteId = id;
            $("confirmOverlay").classList.add("show");
        }
        function closeConfirm() {
            pendingDeleteId = null;
            $("confirmOverlay").classList.remove("show");
        }
        function doDelete() {
            if (!pendingDeleteId) return;
            messages = messages.filter(function (m) { return m.id !== pendingDeleteId; });
            persistMessages();
            closeConfirm();
            renderMine();
            showToast(t("toastDeleted"));
            vibrate(20);
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
            if (back) back.addEventListener("click", function () { switchTab("settings"); });

            $("msgInput").addEventListener("input", function () {
                autoGrow();
                updateCharCount();
                hideErr("errMsg");
                scheduleDraft();
            });
            $("nameInput").addEventListener("input", scheduleDraft);
            $("submitBtn").addEventListener("click", onSubmit);

            $("mineList").addEventListener("click", function (e) {
                var btn = e.target.closest("[data-act='del']");
                var row = btn && btn.closest(".mine-msg");
                if (row) openConfirm(row.dataset.id);
            });
            $("confirmYesBtn").addEventListener("click", doDelete);
            $("confirmNoBtn").addEventListener("click", closeConfirm);
            $("confirmOverlay").addEventListener("click", function (e) {
                if (e.target === this) closeConfirm();
            });
            $("successDoneBtn").addEventListener("click", hideSuccess);
            $("successOverlay").addEventListener("click", function (e) {
                if (e.target === this) hideSuccess();
            });
        }

        /* ===== ИНИЦИАЛИЗАЦИЯ ===== */
        function init() {
            messages = loadMessages();
            myRating = loadMyRating();
            if (myRating) writeStr(LS_RATING, String(myRating));
            lang = detectLang();
            buildStarsRow();
            bindEvents();
            if (myRating) setRating(myRating, false);
            restoreDraft();
            fillName();
            applyI18n();
            initReveal();
        }

        var inited = false;
        window.fbOpen = function () {
            fbMount();
            if (!inited) { inited = true; init(); return; }
            lang = detectLang();
            fillName();          // вошёл в Google после первого открытия страницы
            applyI18n();
        };
    })();

})();
