// Azkar — страница «Отзывы и пожелания» (вынесена из index.html на этапе 4).
// После правок повысь APP_VERSION (?v= в index.html и в sw.js).

(function () {
    var R = document.getElementById("fbHost").attachShadow({ mode: "open" });
    R.appendChild(document.getElementById("fbTemplate").content.cloneNode(true));

    /* ==================== ЧАСТЬ 1: СЛОВАРИ ПЕРЕВОДОВ ==================== */
    var FB = (window.AZKAR_UI_TRANSLATIONS && window.AZKAR_UI_TRANSLATIONS.feedbackPage) || {};

    /* Названия языков — из i18n.js приложения, с запасным списком */
    var LANG_META_FALLBACK = {
        ru: { flag: "🇷🇺", name: "Русский" }, en: { flag: "🇬🇧", name: "English" }, uz: { flag: "🇺🇿", name: "O'zbekcha" },
        de: { flag: "🇩🇪", name: "Deutsch" }, es: { flag: "🇪🇸", name: "Español" }, fr: { flag: "🇫🇷", name: "Français" },
        it: { flag: "🇮🇹", name: "Italiano" }, ja: { flag: "🇯🇵", name: "日本語" }, ko: { flag: "🇰🇷", name: "한국어" },
        zh: { flag: "🇨🇳", name: "中文（简体）" }, tr: { flag: "🇹🇷", name: "Türkçe" }, hi: { flag: "🇮🇳", name: "हिन्दी" },
        id: { flag: "🇮🇩", name: "Bahasa Indonesia" }, ms: { flag: "🇲🇾", name: "Bahasa Melayu" }, th: { flag: "🇹🇭", name: "ไทย" }
    };
    var LANG_ORDER = ["ru", "en", "uz", "de", "es", "fr", "it", "ja", "ko", "zh", "tr", "hi", "id", "ms", "th"];
    /* ==================== ЧАСТЬ 2: ЛОГИКА ПРИЛОЖЕНИЯ ==================== */
    (function () {
        "use strict";

        /* ============================================================
           НАСТРОЙКИ ПОД КЛЮЧ (при необходимости раскомментируй):
           FEEDBACK_ENDPOINT — URL для автоотправки отзыва POST-запросом
           FEEDBACK_EMAIL    — почта, куда предложить отправить отзыв
           ============================================================ */
        var FEEDBACK_ENDPOINT = "";   // напр. "https://formspree.io/f/xxxx"
        var FEEDBACK_EMAIL = "";      // напр. "feedback@example.com"

        var MAX_TEXT = 1200;
        var LS_SETTINGS = "azkar_settings";
        var LS_REVIEWS = "azkar_feedback_reviews";
        var LS_DRAFT = "azkar_feedback_draft";
        var LS_NAME = "azkar_feedback_name";

        var DARK_THEMES = ["dark", "dark-emerald", "dark-purple", "dark-blue", "dark-rose"];
        var LIGHT_THEMES = ["light", "light-rosesapphire", "light-lavender", "light-ocean", "light-mint"];
        var THEME_COLORS = {
            "dark": { bg: "#0a0a0a", accent: "#d4af37" },
            "light": { bg: "#f8f6f2", accent: "#b85c1a" },
            "dark-emerald": { bg: "#060f0a", accent: "#2ecc71" },
            "dark-purple": { bg: "#07050f", accent: "#a855f7" },
            "dark-blue": { bg: "#030b12", accent: "#38bdf8" },
            "dark-rose": { bg: "#0f0509", accent: "#f472b6" },
            "light-rosesapphire": { bg: "#fdf2f6", accent: "#c2698f" },
            "light-lavender": { bg: "#f5f3fa", accent: "#7c5cbf" },
            "light-ocean": { bg: "#f0f7fc", accent: "#0369a1" },
            "light-mint": { bg: "#f0faf6", accent: "#0d7a5f" }
        };
        var CATS = ["praise", "idea", "bug", "other"];
        var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        var HOVERABLE = window.matchMedia && window.matchMedia("(hover: hover)").matches;

        /* ===== УТИЛИТЫ ===== */
        function $(id) { return R.getElementById(id); }
        function esc(s) {
            return String(s).replace(/[&<>"']/g, function (c) {
                return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
            });
        }
        function escRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
        function readStr(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
        function writeStr(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
        function delStr(k) { try { localStorage.removeItem(k); } catch (e) {} }
        function uid() {
            if (window.crypto && crypto.randomUUID) { try { return crypto.randomUUID(); } catch (e) {} }
            return "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        }
        function vibrate(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {} }
        function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

        /* ===== НАСТРОЙКИ (общие с приложением) ===== */
        var settings = {};
        function readSettings() { try { return JSON.parse(localStorage.getItem(LS_SETTINGS) || "{}") || {}; } catch (e) { return {}; } }
        function saveSettings(patch) {
            /* настройки ведёт приложение, здесь ничего не пишем */
            return settings;
        }

        /* ===== СОСТОЯНИЕ ===== */
        var reviews = [];
        var lang = "en";
        var currentTheme = "dark";
        var state = { category: "praise", rating: 0 };
        var filterCat = "all";
        var searchQ = "";
        var pendingDeleteId = null;
        var lastSharedReview = null;
        var editingId = null;
        var searchTimer = null;
        var draftTimer = null;
        var toastTimer = null;

        /* ===== I18N ===== */
        var LANG_META = (window.AZKAR_UI_TRANSLATIONS && window.AZKAR_UI_TRANSLATIONS.languageMeta) || LANG_META_FALLBACK;
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
            R.querySelectorAll("[data-i18n-aria]").forEach(function (el) { el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"))); });
            var back = $("backBtn");
            if (back) back.setAttribute("aria-label", t("back"));
                        updateRatingCaption();
            updateCharCount();
            updateStarsAria();
            updateComposerMode();
        }
        function updateStarsAria() {
            var texts = tArr("ratingTexts");
            starBtns.forEach(function (btn, i) {
                btn.setAttribute("aria-label", texts[i] + " (" + (i + 1) + "/5)");
            });
        }
        function fmtDate(ts) {
            var dt = new Date(ts);
            try {
                return new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(dt);
            } catch (e) { return dt.toLocaleString(); }
        }
        function fmtDateFull(ts) {
            try { return new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }).format(new Date(ts)); }
            catch (e) { return fmtDate(ts); }
        }

        /* ===== ЯЗЫК ===== */
        var langBtns = [];
        function applyLanguage(l, opts) {
            if (!FB[l]) l = "en";
            lang = l;
                        if (!opts || opts.save !== false) saveSettings({ language: l });
            applyI18n();
            langBtns.forEach(function (b) { b.classList.toggle("active", b.dataset.lang === l); });
            renderStats();
            renderList(false);
        }

        /* ===== ЗВЁЗДЫ (SVG) ===== */
        var STAR_PATH = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";
        function starSvg(cls, size) {
            return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24"' + (size ? ' width="' + size + '" height="' + size + '"' : "") + '><path d="' + STAR_PATH + '"/></svg>';
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
                b.innerHTML = starSvg("", 0);
                (function (v, btn) {
                    btn.addEventListener("click", function () { setRating(v, true, true); });
                    btn.addEventListener("keydown", function (e) {
                        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                            e.preventDefault();
                            var d = e.key === "ArrowRight" ? 1 : -1;
                            var t2 = starBtns[Math.max(0, Math.min(4, v - 1 + d))];
                            if (t2) t2.focus();
                        }
                    });
                })(i, b);
                row.appendChild(b);
                starBtns.push(b);
            }
            if (HOVERABLE) {
                starBtns.forEach(function (btn, idx) {
                    btn.addEventListener("mouseenter", function () {
                        updateStarsVisual(idx + 1);
                        var texts = tArr("ratingTexts");
                        $("ratingCaption").textContent = texts[idx];
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
        function setRating(v, persist, animate) {
            state.rating = v;
            updateStarsVisual(v);
            updateRatingCaption();
            hideErr("errRating");
            if (v) {
                var btn = starBtns[v - 1];
                if (btn && animate && !REDUCED) {
                    starBtns.forEach(function (b) { b.classList.remove("pop"); });
                    void btn.offsetWidth;
                    btn.classList.add("pop");
                    vibrate(12);
                }
            }
            if (persist) saveDraft();
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
        function buildAvgStars() {
            var wrap = $("avgStars");
            var html = "";
            for (var i = 0; i < 5; i++) html += starSvg("", 13);
            wrap.innerHTML = html;
        }
        function buildDistBars() {
            var wrap = $("distBars");
            var html = "";
            for (var v = 5; v >= 1; v--) {
                html += '<div class="dist-row" data-v="' + v + '">' +
                    '<span class="dist-v">' + v + '</span>' +
                    '<span class="dist-track"><i class="dist-fill"></i></span>' +
                    '<span class="dist-n">0</span>' +
                    '</div>';
            }
            wrap.innerHTML = html;
        }

        /* ===== ЗВЁЗДЫ В ШАПКЕ ===== */
        function buildStarsGroup() {
            var group = $("starsGroup");
            if (!group) return;
            var pos = [
                [0, 12, 0], [22, 2, 0.8], [44, 28, 1.6], [64, 10, 0.4], [null, -8, 1.2],
                [null, 10, 2.1, true], [null, 28, 2.8, true], [null, 2, 0.6, true], [null, 12, 0.2, true]
            ];
            // левая половина добавляется через left, правая — через right
            var html = "";
            var lefts = [0, 22, 44, 64];
            var tops = [12, 2, 28, 10];
            var delays = [0, 0.8, 1.6, 0.4];
            var rights = [64, 44, 22, 0];
            var rtops = [10, 28, 2, 12];
            var rdelays = [2.1, 2.8, 0.6, 0.2];
            for (var i = 0; i < 4; i++) {
                html += '<div class="star-icon" style="left:' + lefts[i] + 'px;top:' + tops[i] + 'px;animation-delay:' + delays[i] + 's;">' + starSvg("") + "</div>";
            }
            html += '<div class="star-icon" style="left:50%;top:-8px;transform:translateX(-50%);animation-delay:1.2s;">' + starSvg("") + "</div>";
            for (var j = 0; j < 4; j++) {
                html += '<div class="star-icon" style="right:' + rights[j] + 'px;top:' + rtops[j] + 'px;animation-delay:' + rdelays[j] + 's;">' + starSvg("") + "</div>";
            }
            group.innerHTML = html;
        }

        /* ===== КАТЕГОРИИ ===== */
        function setCategory(c, persist) {
            if (CATS.indexOf(c) === -1) c = "other";
            state.category = c;
            R.querySelectorAll("#catRow .chip").forEach(function (ch) {
                var on = ch.dataset.cat === c;
                ch.classList.toggle("active", on);
                ch.setAttribute("aria-checked", on ? "true" : "false");
            });
            if (persist) saveDraft();
        }

        /* ===== ЧЕРНОВИК ===== */
        var LS_LIKES = "azkar_feedback_likes";
        var HEART_PATH = "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z";
        function readLikes() {
            try { var a = JSON.parse(readStr(LS_LIKES, "[]")); return Array.isArray(a) ? a : []; } catch (e) { return []; }
        }
        function toggleLike(id) {
            var r = reviews.filter(function (x) { return x.id === id; })[0];
            if (!r) return;
            var liked = readLikes();
            var idx = liked.indexOf(id);
            if (idx > -1) { liked.splice(idx, 1); r.likes = Math.max(0, (r.likes | 0) - 1); }
            else { liked.push(id); r.likes = (r.likes | 0) + 1; vibrate(10); }
            writeStr(LS_LIKES, JSON.stringify(liked));
            persistReviews();
            renderList(false);
        }
        function updateComposerMode() {
            var own = reviews.some(function (r) { return r.mine !== false; });
            var editing = !!editingId;
            var comp = $("composer");
            if (comp) comp.classList.toggle("hidden", own && !editing);
            var title = $("formTitle");
            if (title) title.textContent = t(editing ? "formTitleEdit" : "formTitle");
            var lbl = $("submitLabel");
            if (lbl) lbl.textContent = t(editing ? "btnSave" : "btnSubmit");
            var cancel = $("cancelEditBtn");
            if (cancel) cancel.classList.toggle("hidden", !editing);
        }
        function startEdit(id) {
            var r = reviews.filter(function (x) { return x.id === id; })[0];
            if (!r) return;
            editingId = id;
            $("nameInput").value = r.name || "";
            $("msgInput").value = r.text;
            setCategory(r.category, false);
            setRating(r.rating, false);
            hideErr("errRating");
            hideErr("errMsg");
            autoGrow();
            updateCharCount();
            updateComposerMode();
            var comp = $("composer");
            if (comp && comp.scrollIntoView) comp.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
        }
        function cancelEdit() {
            editingId = null;
            $("msgInput").value = "";
            $("nameInput").value = readStr(LS_NAME, "");
            setCategory("praise", false);
            setRating(0, false);
            hideErr("errRating");
            hideErr("errMsg");
            autoGrow();
            updateCharCount();
            updateComposerMode();
        }
        function finishEdit(name, text) {
            var r = reviews.filter(function (x) { return x.id === editingId; })[0];
            editingId = null;
            if (r) {
                r.name = name;
                r.text = text.slice(0, MAX_TEXT);
                r.rating = state.rating;
                r.category = state.category;
            }
            persistReviews();
            if (name) writeStr(LS_NAME, name);
            $("msgInput").value = "";
            autoGrow();
            updateCharCount();
            setRating(0, false);
            setCategory("praise", false);
            hideErr("errRating");
            hideErr("errMsg");
            renderStats();
            renderList(false);
            updateComposerMode();
            showToast(t("toastUpdated"));
        }

        function saveDraft() {
            if (editingId) return;
            writeStr(LS_DRAFT, JSON.stringify({
                name: $("nameInput").value,
                text: $("msgInput").value,
                rating: state.rating,
                category: state.category
            }));
        }
        function scheduleDraft() {
            clearTimeout(draftTimer);
            draftTimer = setTimeout(saveDraft, 350);
        }
        function restoreDraft() {
            var raw = readStr(LS_DRAFT, "");
            if (!raw) { setCategory("praise", false); return; }
            try {
                var d = JSON.parse(raw);
                if (d && typeof d === "object") {
                    if (typeof d.name === "string") $("nameInput").value = d.name;
                    if (typeof d.text === "string") $("msgInput").value = d.text;
                    if (CATS.indexOf(d.category) > -1) setCategory(d.category, false);
                    if (d.rating >= 1 && d.rating <= 5) setRating(d.rating, false);
                }
            } catch (e) {}
            if (!state.category) setCategory("praise", false);
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

        /* ===== ОТЗЫВЫ: ХРАНИЛИЩЕ ===== */
        function loadReviews() {
            var raw = readStr(LS_REVIEWS, "");
            if (!raw) return [];
            try {
                var arr = JSON.parse(raw);
                if (!Array.isArray(arr)) return [];
                return arr.filter(function (r) {
                    return r && typeof r.text === "string" && typeof r.rating === "number" &&
                        r.rating >= 1 && r.rating <= 5 && typeof r.ts === "number";
                }).map(function (r) {
                    return {
                        id: r.id || uid(),
                        name: typeof r.name === "string" ? r.name.slice(0, 40) : "",
                        text: r.text.slice(0, MAX_TEXT),
                        rating: Math.round(r.rating),
                        category: CATS.indexOf(r.category) > -1 ? r.category : "other",
                        ts: r.ts,
                        mine: r.mine !== false,
                        likes: typeof r.likes === "number" ? r.likes : 0
                    };
                });
            } catch (e) { return []; }
        }
        function persistReviews() {
            try { writeStr(LS_REVIEWS, JSON.stringify(reviews)); } catch (e) {}
        }

        /* ===== ОТЗЫВЫ: ОТРИСОВКА ===== */
        function catKey(c) { return "cat" + c.charAt(0).toUpperCase() + c.slice(1); }
        function catIconSvg(c) {
            var paths = {
                praise: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
                idea: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 1 3.6 10.8c-.7.5-1.1 1.3-1.1 2.2H9.5c0-.9-.4-1.7-1.1-2.2A6 6 0 0 1 12 3z"/>',
                bug: '<path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v-9"/>',
                other: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/>'
            };
            return '<svg viewBox="0 0 24 24">' + (paths[c] || paths.other) + "</svg>";
        }
        function highlightText(text, q) {
            if (!q) return esc(text);
            var re;
            try { re = new RegExp("(" + escRe(q) + ")", "ig"); } catch (e) { return esc(text); }
            return text.split(re).map(function (part, i) {
                return i % 2 === 1 ? "<mark>" + esc(part) + "</mark>" : esc(part);
            }).join("");
        }
        function reviewCardHtml(r, index, animate, newId) {
            var delay = animate ? "animation-delay:" + Math.min(index * 45, 260) + "ms;" : "";
            var isNew = newId && r.id === newId;
            var initial = r.name ? esc(r.name.charAt(0).toUpperCase()) : "✦";
            var stars = "";
            for (var i = 1; i <= 5; i++) stars += starSvg(i <= r.rating ? "f" : "", 12);
            var q = searchQ.trim();
            var liked = readLikes().indexOf(r.id) > -1;
            var likes = r.likes | 0;
            var mine = r.mine !== false;
            var likeLabel = esc(t("actLike"));
            var likeBtn = '<button type="button" class="rv-like' + (liked ? " on" : "") + '" data-act="like" aria-pressed="' + (liked ? "true" : "false") + '" aria-label="' + likeLabel + '" title="' + likeLabel + '">' +
                '<svg viewBox="0 0 24 24"><path d="' + HEART_PATH + '"/></svg>' +
                (likes > 0 ? '<span class="rv-like-n">' + likes + "</span>" : "") + "</button>";
            var editBtn = mine ? '<button type="button" class="rv-act" data-act="edit" aria-label="' + esc(t("actEdit")) + '" title="' + esc(t("actEdit")) + '"><svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>' : "";
            return '<article class="review card selectable' + (isNew ? " new" : "") + '" data-id="' + esc(r.id) + '" style="' + delay + '">' +
                '<div class="rv-head">' +
                    '<div class="rv-avatar' + (r.name ? "" : " guest") + '" aria-hidden="true">' + initial + "</div>" +
                    '<div class="rv-meta">' +
                        '<div class="rv-name">' + (r.name ? esc(r.name) : esc(t("guest"))) + "</div>" +
                        '<div class="rv-date" title="' + esc(fmtDateFull(r.ts)) + '">' + esc(fmtDate(r.ts)) + "</div>" +
                    "</div>" +
                    '<div class="rv-stars" aria-hidden="true">' + stars + "</div>" +
                "</div>" +
                '<p class="rv-text">' + highlightText(r.text, q) + "</p>" +
                '<div class="rv-foot">' +
                    likeBtn +
                    '<div class="rv-actions">' +
                        editBtn +
                        '<button type="button" class="rv-act" data-act="share" aria-label="' + esc(t("actShare")) + '" title="' + esc(t("actShare")) + '"><svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4"/><path d="m15.4 6.5-6.8 4"/></svg></button>' +
                        '<button type="button" class="rv-act danger" data-act="del" aria-label="' + esc(t("actDelete")) + '" title="' + esc(t("actDelete")) + '"><svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>' +
                    "</div>" +
                "</div>" +
            "</article>";
        }
        function renderList(animate, newId) {
            var list = $("reviewsList");
            var q = searchQ.trim().toLowerCase();
            var filtered = reviews.slice().sort(function (a, b) { return b.ts - a.ts; });
            if (filterCat !== "all") filtered = filtered.filter(function (r) { return r.category === filterCat; });
            if (q) {
                filtered = filtered.filter(function (r) {
                    return (r.text + " " + r.name).toLowerCase().indexOf(q) > -1;
                });
            }
            var hasAny = reviews.length > 0;
            $("controls").classList.toggle("hidden", !hasAny);

            list.classList.toggle("no-anim", !animate);
            list.innerHTML = filtered.map(function (r, i) { return reviewCardHtml(r, i, animate, newId); }).join("");

            var empty = $("emptyState");
            if (!hasAny) {
                empty.classList.remove("hidden");
                list.classList.add("hidden");
                $("emptyTitle").textContent = t("emptyTitle");
                $("emptySub").textContent = t("emptySub");
            } else if (!filtered.length) {
                empty.classList.remove("hidden");
                list.classList.add("hidden");
                $("emptyTitle").textContent = t(filterCat === "idea" ? "emptyTitleIdea" : filterCat === "bug" ? "emptyTitleBug" : "emptyTitle");
                $("emptySub").textContent = t("emptyFilterSub");
            } else {
                empty.classList.add("hidden");
                list.classList.remove("hidden");
            }
        }
        function renderStats() {
            if (!$("statsCard")) return;
            var n = reviews.length;
            var has = n > 0;
            $("statsCard").classList.toggle("hidden", !has);
            if (!has) return;
            var sum = reviews.reduce(function (s, r) { return s + r.rating; }, 0);
            var avg = sum / n;
            $("avgNum").textContent = avg.toFixed(1);
            $("reviewsCountLine").textContent = n + " · " + t("statReviews");
            $("avgStars").querySelectorAll("svg").forEach(function (svg, i) {
                svg.classList.toggle("f", i < Math.round(avg));
            });
            $("distBars").querySelectorAll(".dist-row").forEach(function (row) {
                var v = Number(row.dataset.v);
                var cnt = reviews.filter(function (r) { return r.rating === v; }).length;
                row.querySelector(".dist-fill").style.width = (cnt / n * 100) + "%";
                row.querySelector(".dist-n").textContent = String(cnt);
            });
        }

        /* ===== ЭКСПОРТ / ШАРИНГ ===== */
        function buildShareText(r) {
            var stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
            var lines = [
                "✦ Azkar · " + t(catKey(r.category)),
                stars + " (" + r.rating + "/5)",
                "",
                r.text
            ];
            if (r.name) lines.push("— " + r.name);
            lines.push(fmtDateFull(r.ts));
            return lines.join("\n");
        }
        function copyText(text) {
            var done = function () { showToast(t("toastCopied")); };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(done).catch(function () { legacyCopy(text); done(); });
            } else {
                legacyCopy(text); done();
            }
        }
        function legacyCopy(text) {
            try {
                var ta = document.createElement("textarea");
                ta.value = text;
                ta.style.position = "fixed";
                ta.style.opacity = "0";
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                ta.remove();
            } catch (e) {}
        }
        function tryShare(text) {
            if (navigator.share) {
                navigator.share({ title: t("docTitle"), text: text }).catch(function (err) {
                    if (err && err.name === "AbortError") return;
                    fallbackShare(text);
                });
                return;
            }
            fallbackShare(text);
        }
        function fallbackShare(text) {
            if (FEEDBACK_EMAIL) {
                location.href = "mailto:" + FEEDBACK_EMAIL +
                    "?subject=" + encodeURIComponent(t("docTitle")) +
                    "&body=" + encodeURIComponent(text);
                return;
            }
            copyText(text);
        }

        /* ===== ТОСТ ===== */
        function showToast(msg, dur) {
            var el = $("toast");
            el.textContent = msg;
            el.classList.add("show");
            clearTimeout(toastTimer);
            toastTimer = setTimeout(function () { el.classList.remove("show"); }, dur || 2200);
        }

        /* ===== ОТПРАВКА ОТЗЫВА ===== */
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
                if (editingId) { finishEdit(name, text); btn.classList.remove("loading"); btn.disabled = false; return; }
                var review = {
                    id: uid(),
                    name: name,
                    text: text.slice(0, MAX_TEXT),
                    rating: state.rating,
                    category: state.category,
                    ts: Date.now(),
                    mine: true
                };
                reviews.unshift(review);
                if (reviews.length > 500) reviews = reviews.slice(0, 500);
                persistReviews();

                if (name) writeStr(LS_NAME, name);
                clearTimeout(draftTimer);
                delStr(LS_DRAFT);
                $("msgInput").value = "";
                autoGrow();
                updateCharCount();
                setRating(0, false);
                updateComposerMode();
                hideErr("errRating");
                hideErr("errMsg");

                btn.classList.remove("loading");
                btn.disabled = false;

                renderStats();
                renderList(true, review.id);
                showSuccess(review);
                vibrate([12, 60, 12]);

                if (FEEDBACK_ENDPOINT) {
                    try {
                        fetch(FEEDBACK_ENDPOINT, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(review)
                        }).catch(function () {});
                    } catch (e) {}
                }
            });
        }

        /* ===== ОКНО УСПЕХА ===== */
        function showSuccess(review) {
            lastSharedReview = review;
            $("successOverlay").classList.add("show");
        }
        function hideSuccess() { $("successOverlay").classList.remove("show"); }

        /* ===== ПОДТВЕРЖДЕНИЕ УДАЛЕНИЯ ===== */
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
            reviews = reviews.filter(function (r) { return r.id !== pendingDeleteId; });
            persistReviews();
            closeConfirm();
            renderStats();
            if (editingId === pendingDeleteId) cancelEdit();
            renderList(false);
            updateComposerMode();
            showToast(t("toastDeleted"));
            vibrate(20);
        }

        /* ===== РАЗМЕТКА СПИСКА ОТЗЫВОВ: ДЕЙСТВИЯ ===== */
        function initReviewActions() {
            $("reviewsList").addEventListener("click", function (e) {
                var btn = e.target.closest("[data-act]");
                if (!btn) return;
                var card = e.target.closest(".review");
                if (!card) return;
                var review = reviews.filter(function (r) { return r.id === card.dataset.id; })[0];
                if (!review) return;
                var act = btn.dataset.act;
                if (act === "like") toggleLike(review.id);
                else if (act === "edit") startEdit(review.id);
                else if (act === "copy") copyText(buildShareText(review));
                else if (act === "share") tryShare(buildShareText(review));
                else if (act === "del") openConfirm(review.id);
            });
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
            // Назад в приложение (профиль)
            var back = $("backBtn");
            if (back) back.addEventListener("click", function () { switchTab("settings"); });

            $("cancelEditBtn").addEventListener("click", cancelEdit);

            // Категории
            $("catRow").addEventListener("click", function (e) {
                var chip = e.target.closest(".chip");
                if (chip) setCategory(chip.dataset.cat, true);
            });

            // Фильтры
            $("filterRow").addEventListener("click", function (e) {
                var chip = e.target.closest(".chip");
                if (!chip) return;
                filterCat = chip.dataset.cat;
                $("filterRow").querySelectorAll(".chip").forEach(function (c) {
                    var on = c === chip;
                    c.classList.toggle("active", on);
                    c.setAttribute("aria-selected", on ? "true" : "false");
                });
                renderList(false);
            });

            // Ввод текста
            $("msgInput").addEventListener("input", function () {
                autoGrow();
                updateCharCount();
                hideErr("errMsg");
                scheduleDraft();
            });
            $("nameInput").addEventListener("input", scheduleDraft);

            // Отправка
            $("submitBtn").addEventListener("click", onSubmit);

            // Удаление
            $("confirmYesBtn").addEventListener("click", doDelete);
            $("confirmNoBtn").addEventListener("click", closeConfirm);
            $("confirmOverlay").addEventListener("click", function (e) {
                if (e.target === this) closeConfirm();
            });

            // Успех
            $("successDoneBtn").addEventListener("click", hideSuccess);
            $("successOverlay").addEventListener("click", function (e) {
                if (e.target === this) hideSuccess();
            });
            $("successShareBtn").addEventListener("click", function () {
                if (lastSharedReview) tryShare(buildShareText(lastSharedReview));
            });

        }

        /* ===== ИНИЦИАЛИЗАЦИЯ ===== */
        function init() {
            settings = readSettings();
            reviews = loadReviews();
            lang = detectLang();
            buildStarsGroup();
            buildStarsRow();
            initReviewActions();
            bindEvents();

            applyLanguage(lang, { save: false });

            // Восстановить имя из прошлого отзыва
            var savedName = readStr(LS_NAME, "");
            if (savedName && !$("nameInput").value) $("nameInput").value = savedName;

            restoreDraft();
            renderStats();
            renderList(false);
            updateComposerMode();
            initReveal();
        }

        var inited = false;
        window.fbOpen = function () {
            if (!inited) { inited = true; init(); return; }
            lang = detectLang();
            applyLanguage(lang, { save: false });
        };
    })();
    
})();
    
