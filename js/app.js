// Azkar — основной код приложения (вынесен из index.html на этапе 4).
// Подключается обычным синхронным <script> на прежнем месте — порядок
// выполнения тот же. После правок повысь APP_VERSION (?v= в index.html
// и в sw.js), иначе телефон может взять старую копию из кэша.

        // ==================== I18N ====================
        const i18n = (typeof window !== 'undefined' && window.AZKAR_I18N) ? window.AZKAR_I18N : {};
        const UI_I18N = (typeof window !== 'undefined' && window.AZKAR_UI_TRANSLATIONS) ? window.AZKAR_UI_TRANSLATIONS : {};

        // ==================== ЛЕНИВАЯ ЗАГРУЗКА ДАННЫХ (этап 3) ====================
        // DATA_VERSION повышать при любой правке файлов в папке data/
        // (вместе с CACHE_NAME в sw.js) — иначе телефон возьмёт старую копию из кэша.
        const DATA_VERSION = '110';
        const _dataScripts = {};
        function loadDataScript(src) {
            if (_dataScripts[src]) return _dataScripts[src];
            _dataScripts[src] = new Promise(resolve => {
                const el = document.createElement('script');
                el.src = src + '?v=' + DATA_VERSION;
                el.async = true;
                el.onload = () => resolve(true);
                el.onerror = () => { delete _dataScripts[src]; el.remove(); resolve(false); };
                document.head.appendChild(el);
            });
            return _dataScripts[src];
        }
        // Сбрасывает отметки «уже синхронизировано» — после импорта/восстановления
        // данных стандартные задачи и 99 имён нужно заново проверить.
        function _invalidateDefaultsSync() {
            try { localStorage.removeItem(CL_DEFAULTS_FLAG); localStorage.removeItem(NAMES99_SYNC_FLAG); } catch (e) {}
        }

        // ==================== TRANSLITERATION ====================
        // Returns the localized transliteration of a divine name based on current language
        function getTranslit(name, lang) {
            const key = 'translit_' + lang;
            if (name[key]) return name[key];
            // Fallback: use standard translit
            return name.translit;
        }

        // 99 имён Аллаха
        // Все языки лежат в одной папке: data/names99/<язык>.js — по файлу на язык,
        // каждая строка [значение, описание, транслитерация]. Скачивается только файл
        // выбранного языка и только когда нужен (первое создание папки «99 имён» или
        // смена языка). Переводы вливаются в names99 — массив из 99 объектов вида
        // { ru: 'Милостивый', desc_ru: '…', translit_ru: 'Ар-Рахман', de: …, … }.
        let names99 = null;
        const NAMES99_SYNC_FLAG = 'azkar_names99_synced';
        const _names99LangState = {};   // язык → 'ok' | 'failed'
        function _mergeNames99Lang(lang) {
            const list = window.AZKAR_NAMES_99_I18N && window.AZKAR_NAMES_99_I18N[lang];
            if (!Array.isArray(list) || !list.length) return false;
            if (!names99) names99 = list.map(() => ({}));
            list.forEach((e, i) => {
                const n = names99[i];
                if (!n || !e) return;
                n[lang] = e[0];
                n['desc_' + lang] = e[1];
                n['translit_' + lang] = e[2];
                if (!n.translit && lang === 'en') n.translit = e[2];
            });
            return true;
        }
        function names99Ready(lang) {
            return Array.isArray(names99) && !!_names99LangState[lang];
        }
        function _loadNames99File(lang) {
            if (_names99LangState[lang] === 'ok') return Promise.resolve(true);
            return loadDataScript('data/names99/' + lang + '.js').then(() => {
                const ok = _mergeNames99Lang(lang);
                _names99LangState[lang] = ok ? 'ok' : 'failed';
                return ok;
            });
        }
        function loadNames99(lang) {
            lang = lang || currentLang;
            return _loadNames99File(lang).then(ok => {
                // Файл языка не скачался (нет сети) — берём английский, как запасной.
                if (!ok && lang !== 'en') return _loadNames99File('en');
                return ok;
            }).then(() => names99);
        }

        // Специальные зикры
        // Данные лежат в data/special-dhikrs.js (этап 3 оптимизации).
        let specialDhikrs = Array.isArray(window.AZKAR_SPECIAL_DHIKRS) ? window.AZKAR_SPECIAL_DHIKRS : [];

        // Канонический список дефолтных зикров из кода (неизменяемая ссылка).
        // Нужен, чтобы merge с localStorage мог:
        //   1) восстановить свежие переименования/переводы (см. loadCustomSpecialDhikrs);
        //   2) ДОБАВИТЬ новые дефолтные зикры, которых ещё нет в кэше пользователя
        //      (напр. tahlil_100_daily), на их правильную позицию.
        const SPECIAL_DHIKRS_DEFAULTS = specialDhikrs.slice();

        // ===== SPECIAL FOLDERS =====
        let specialFolders = []; // [{ id, name, dhikrIds: [] }]
        let _specialFolderSelected = null; // null=new folder, 'none'=no folder, number=existing idx

        function loadSpecialFolders() {
            try {
                const saved = localStorage.getItem('azkar_special_folders');
                if (saved) specialFolders = JSON.parse(saved);
            } catch(e) { specialFolders = []; }
            // Миграция: если папка «Особые Награды» ещё не создана — создаём и кладём все дефолтные зикры
            const MIGRATION_ID = 'default_special_rewards';
            // Зикры, которые принадлежат отдельным папкам (перед сном / ежедневные)
            // и НЕ должны попадать в «Особые Награды».
            const SLEEP_DHIKR_IDS = ['sleep_purification','sleep_ayatul_kursi','sleep_tasbih_fatima','sleep_salavat_seal'];
            const DAILY_DHIKR_IDS = ['daily_leaving_home','daily_entering_home','daily_entering_market','daily_yunus','daily_tawakkul'];
            const alreadyMigrated = specialFolders.some(f => f.id === MIGRATION_ID);
            if (!alreadyMigrated) {
                const defaultIds = SPECIAL_DHIKRS_DEFAULTS.map(d => d.id).filter(id => !SLEEP_DHIKR_IDS.includes(id) && !DAILY_DHIKR_IDS.includes(id));
                const folderNames = {
                    ru: 'Особые Награды', en: 'Special Rewards', uz: 'Maxsus Mukofotlar',
                    ar: 'مكافآت خاصة', de: 'Besondere Belohnungen', es: 'Recompensas Especiales',
                    fr: 'Récompenses Spéciales', it: 'Ricompense Speciali', ja: '特別な報酬',
                    ko: '특별한 보상', zh: '特别奖励', tr: 'Özel Ödüller', hi: 'विशेष पुरस्कार', ms: 'Ganjaran Istimewa', id: 'Pahala Istimewa', th: 'รางวัลพิเศษ'
                };
                specialFolders.unshift({
                    id: MIGRATION_ID,
                    name: folderNames[currentLang] || folderNames.ru,
                    dhikrIds: defaultIds
                });
                saveSpecialFolders();
            }
            // Миграция: папка «Ежедневные зикры» — создаётся СРАЗУ ПОСЛЕ «Особые Награды».
            const DAILY_MIGRATION_ID = 'default_daily_dhikrs';
            const dailyAlreadyMigrated = specialFolders.some(f => f.id === DAILY_MIGRATION_ID);
            if (!dailyAlreadyMigrated) {
                const dailyFolderNames = {
                    ru: 'Ежедневные зикры', en: 'Daily Dhikrs', uz: 'Kunlik zikrlar',
                    ar: 'أذكار يومية', de: 'Tägliche Dhikrs', es: 'Dhikrs diarios',
                    fr: 'Dhikrs quotidiens', it: 'Dhikr quotidiani', ja: '日々のドゥアー',
                    ko: '매일의 지크르', zh: '每日念珠', tr: 'Günlük Zikirler', hi: 'दैनिक ज़िक्र', ms: 'Zikir Harian', id: 'Zikir Harian', th: 'ซิกร์ประจำวัน'
                };
                const dailyFolder = {
                    id: DAILY_MIGRATION_ID,
                    name: dailyFolderNames[currentLang] || dailyFolderNames.ru,
                    dhikrIds: DAILY_DHIKR_IDS.slice()
                };
                const srIdx = specialFolders.findIndex(f => f.id === MIGRATION_ID);
                if (srIdx >= 0) specialFolders.splice(srIdx + 1, 0, dailyFolder);
                else specialFolders.unshift(dailyFolder);
                saveSpecialFolders();
            }
            // Миграция: папка «Зикры перед сном»
            const SLEEP_MIGRATION_ID = 'default_sleep_dhikrs';
            const sleepAlreadyMigrated = specialFolders.some(f => f.id === SLEEP_MIGRATION_ID);
            if (!sleepAlreadyMigrated) {
                const sleepFolderNames = {
                    ru: 'Зикры перед сном', en: 'Bedtime Dhikrs', uz: 'Uxlashdan oldin zikrlar',
                    ar: 'أذكار النوم', de: 'Dhikrs vor dem Schlafen', es: 'Dhikrs antes de dormir',
                    fr: 'Dhikrs avant de dormir', it: 'Dhikr prima di dormire', ja: '就寝前のドゥアー',
                    ko: '잠자리 드는 전 두아', zh: '睡前念珠', tr: 'Uyku Öncesi Zikirler', hi: 'सोने से पहले के ज़िक्र', ms: 'Zikir Sebelum Tidur', id: 'Zikir Sebelum Tidur', th: 'ซิกร์ก่อนนอน'
                };
                specialFolders.push({
                    id: SLEEP_MIGRATION_ID,
                    name: sleepFolderNames[currentLang] || sleepFolderNames.ru,
                    dhikrIds: ['sleep_purification', 'sleep_ayatul_kursi', 'sleep_tasbih_fatima', 'sleep_salavat_seal']
                });
                saveSpecialFolders();
            }
            // Миграция: добавить sleep_salavat_seal в папку «Зикры перед сном» для существующих пользователей
            const sleepFolder = specialFolders.find(f => f.id === 'default_sleep_dhikrs');
            if (sleepFolder && !sleepFolder.dhikrIds.includes('sleep_salavat_seal')) {
                sleepFolder.dhikrIds.push('sleep_salavat_seal');
                saveSpecialFolders();
            }
        }

        function saveSpecialFolders() {
            localStorage.setItem('azkar_special_folders', JSON.stringify(specialFolders));
            markDataChanged();
        }
        const DEFAULT_SPECIAL_IDS = new Set(SPECIAL_DHIKRS_DEFAULTS.map(d => d.id));
        // Множество дефолтных зикров, которые пользователь сознательно удалил.
        // Их НЕ нужно восстанавливать при merge, иначе удаление было бы бесполезным.
        function getDeletedDefaultIds() {
            try { return new Set(JSON.parse(localStorage.getItem('azkar_special_deleted_defaults') || '[]')); }
            catch (e) { return new Set(); }
        }
        function markDefaultDeleted(id) {
            if (!DEFAULT_SPECIAL_IDS.has(id)) return; // пользовательские зикры не трекаем
            const set = getDeletedDefaultIds();
            set.add(id);
            localStorage.setItem('azkar_special_deleted_defaults', JSON.stringify([...set]));
        }

        let currentLang = 'en';
        let isSpecialEditMode = false;

        // ===== SPECIAL: CRUD helpers =====
        function getSpecialName(d) {
            const k = 'name' + currentLang.charAt(0).toUpperCase() + currentLang.slice(1);
            return d[k] || d.nameEn || d.nameRu || d.nameCustom || '';
        }
        function getSpecialDesc(d) {
            const k = 'desc' + currentLang.charAt(0).toUpperCase() + currentLang.slice(1);
            return d[k] || d.descEn || d.descRu || d.descCustom || '';
        }
        function getSpecialDetail(d) {
            // «Подробнее» — расширенное описание (необязательное), по языкам.
            const k = 'detail' + currentLang.charAt(0).toUpperCase() + currentLang.slice(1);
            return d[k] || d.detailEn || d.detailRu || d.detailCustom || '';
        }
        function getSpecialText(d) {
            // Текст зикра в читаемом виде (транслитерация), без арабской вязи.
            // Для пользовательских зикров — введённый текст; арабский никогда не показываем.
            return d.text || d.translit || '';
        }
        function toggleSpecialEditMode() {
            isSpecialEditMode = !isSpecialEditMode;
            const btn = document.getElementById('specialEditToggle');
            if (btn) btn.classList.toggle('active', isSpecialEditMode);
            renderSpecialList();
        }
        function openSpecialAddModal() {
            document.getElementById('specialFormEditId').value = '';
            document.getElementById('specialFormName').value = '';
            document.getElementById('specialFormText').value = '';
            document.getElementById('specialFormDesc').value = '';
            document.getElementById('specialFormDetail').value = '';
            document.getElementById('specialFormGoal').value = '100';
            document.getElementById('specialModalTitle').innerText = t('specialModalTitleNew');
            const wrap = document.getElementById('specialFolderSelectWrap');
            const folderNameInput = document.getElementById('specialFolderNameInput');
            const dhikrFields = document.getElementById('specialDhikrFields');
            if (wrap) wrap.style.display = '';
            if (folderNameInput) { folderNameInput.value = ''; folderNameInput.style.display = 'none'; }
            // Default: "без папки" — show dhikr fields immediately
            if (dhikrFields) dhikrFields.style.display = 'flex';
            _specialFolderSelected = 'none';
            _buildSpecialFolderDropdown();
            _updateSpecialFolderSelectBtn('none');
            document.getElementById('specialModal').classList.add('show');
        }
        function openSpecialAddInFolder(folderIdx) {
            document.getElementById('specialFormEditId').value = '';
            document.getElementById('specialFormName').value = '';
            document.getElementById('specialFormText').value = '';
            document.getElementById('specialFormDesc').value = '';
            document.getElementById('specialFormDetail').value = '';
            document.getElementById('specialFormGoal').value = '100';
            document.getElementById('specialModalTitle').innerText = t('specialModalTitleNew');
            const wrap = document.getElementById('specialFolderSelectWrap');
            const folderNameInput = document.getElementById('specialFolderNameInput');
            const dhikrFields = document.getElementById('specialDhikrFields');
            // Hide folder selector — folder is already chosen
            if (wrap) wrap.style.display = 'none';
            if (folderNameInput) { folderNameInput.value = ''; folderNameInput.style.display = 'none'; }
            if (dhikrFields) dhikrFields.style.display = 'flex';
            _specialFolderSelected = folderIdx;
            document.getElementById('specialModal').classList.add('show');
            setTimeout(() => { const n = document.getElementById('specialFormName'); if (n) n.focus(); }, 120);
        }
        function openSpecialEditModal(id) {
            const d = specialDhikrs.find(x => x.id === id); if (!d) return;
            document.getElementById('specialFormEditId').value = id;
            document.getElementById('specialFormName').value = getSpecialName(d);
            document.getElementById('specialFormText').value = getSpecialText(d);
            document.getElementById('specialFormDesc').value = getSpecialDesc(d);
            document.getElementById('specialFormDetail').value = getSpecialDetail(d);
            document.getElementById('specialFormGoal').value = d.goal || 100;
            document.getElementById('specialModalTitle').innerText = t('specialModalTitleEdit');
            const wrap = document.getElementById('specialFolderSelectWrap');
            const folderNameInput = document.getElementById('specialFolderNameInput');
            const dhikrFields = document.getElementById('specialDhikrFields');
            if (wrap) wrap.style.display = 'none';
            if (folderNameInput) folderNameInput.style.display = 'none';
            if (dhikrFields) dhikrFields.style.display = 'flex';
            document.getElementById('specialModal').classList.add('show');
        }
        function closeSpecialModal() {
            document.getElementById('specialModal').classList.remove('show');
            const btn = document.getElementById('specialFolderSelectBtn');
            const dd = document.getElementById('specialFolderDropdown');
            if (btn) btn.classList.remove('open');
            if (dd) dd.classList.remove('open');
        }
        function closeSpecialModalOnBg(e) { if (e.target === document.getElementById('specialModal')) closeSpecialModal(); }

        function _buildSpecialFolderDropdown() {
            const dd = document.getElementById('specialFolderDropdown');
            if (!dd) return;
            dd.innerHTML = '';
            // "New folder" option
            const newOpt = document.createElement('div');
            newOpt.className = 'cl-folder-option active';
            newOpt.dataset.idx = '';
            newOpt.innerHTML = '<span class="fo-icon">➕</span><span class="fo-name">' + escHtml(t('addFolderTitle')) + '</span><svg class="fo-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
            newOpt.onclick = (e) => { e.stopPropagation(); _selectSpecialFolderOption(null); };
            dd.appendChild(newOpt);
            // "Without folder" option
            const noneOpt = document.createElement('div');
            noneOpt.className = 'cl-folder-option';
            noneOpt.dataset.idx = 'none';
            noneOpt.innerHTML = '<span class="fo-icon">📄</span><span class="fo-name">' + escHtml(t('noFolderOption')) + '</span><svg class="fo-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
            noneOpt.onclick = (e) => { e.stopPropagation(); _selectSpecialFolderOption('none'); };
            dd.appendChild(noneOpt);
            // (Existing folders removed — add dhikr to folder via + button inside each folder)
        }

        function _selectSpecialFolderOption(idx) {
            _specialFolderSelected = idx;
            _updateSpecialFolderSelectBtn(idx);
            const btn = document.getElementById('specialFolderSelectBtn');
            const dd = document.getElementById('specialFolderDropdown');
            if (btn) btn.classList.remove('open');
            if (dd) dd.classList.remove('open');
            document.querySelectorAll('#specialFolderDropdown .cl-folder-option').forEach(opt => {
                let optIdx;
                if (opt.dataset.idx === '') optIdx = null;
                else if (opt.dataset.idx === 'none') optIdx = 'none';
                else optIdx = parseInt(opt.dataset.idx);
                opt.classList.toggle('active', optIdx === idx);
            });
            const folderNameInput = document.getElementById('specialFolderNameInput');
            const dhikrFields = document.getElementById('specialDhikrFields');
            // "New folder" — show folder name input, hide dhikr fields
            // "No folder" or existing folder — show dhikr fields, hide folder name input
            const isNewFolder = (idx === null);
            if (folderNameInput) folderNameInput.style.display = isNewFolder ? '' : 'none';
            if (dhikrFields) dhikrFields.style.display = isNewFolder ? 'none' : 'flex';
        }

        function _updateSpecialFolderSelectBtn(idx) {
            const iconEl = document.getElementById('specialFolderSelectIcon');
            const textEl = document.getElementById('specialFolderSelectText');
            if (idx === null) {
                if (iconEl) iconEl.textContent = '➕';
                if (textEl) textEl.textContent = t('addFolderTitle');
            } else if (idx === 'none') {
                if (iconEl) iconEl.textContent = '📄';
                if (textEl) textEl.textContent = t('noFolderOption');
            } else {
                if (iconEl) iconEl.textContent = '📁';
                if (textEl) textEl.textContent = specialFolders[idx] ? specialFolders[idx].name : '';
            }
        }

        function toggleSpecialFolderDropdown(e) {
            e.stopPropagation();
            const btn = document.getElementById('specialFolderSelectBtn');
            const dd = document.getElementById('specialFolderDropdown');
            if (!btn || !dd) return;
            const isOpen = dd.classList.contains('open');
            btn.classList.toggle('open', !isOpen);
            dd.classList.toggle('open', !isOpen);
        }

        function _closeSpecialFolderDropdownOnCardClick(e) {
            if (e.target.closest('#specialFolderSelectBtn') || e.target.closest('#specialFolderDropdown')) return;
            const btn = document.getElementById('specialFolderSelectBtn');
            const dd = document.getElementById('specialFolderDropdown');
            if (btn) btn.classList.remove('open');
            if (dd) dd.classList.remove('open');
        }

        // Все поддерживаемые языковые суффиксы для name*/desc* в специальных зикрах.
        // Используется при добавлении/редактировании, чтобы запись выглядела
        // одинаково на всех языках, а не только на ru/en/uz.
        const SPECIAL_LANG_SUFFIXES = ['Ru','En','Uz','De','Es','Fr','It','Ja','Ko','Zh','Custom'];
        function _fillAllSpecialLangs(target, prefix, value) {
            for (let i = 0; i < SPECIAL_LANG_SUFFIXES.length; i++) {
                target[prefix + SPECIAL_LANG_SUFFIXES[i]] = value;
            }
        }
        function saveSpecialDhikr() {
            const editId = document.getElementById('specialFormEditId').value;
            if (!editId) {
                // Adding new dhikr — check folder selection
                if (_specialFolderSelected === null) {
                    // Create new folder (no dhikr fields needed, just folder name)
                    const folderName = (document.getElementById('specialFolderNameInput').value || '').trim();
                    if (!folderName) { document.getElementById('specialFolderNameInput').focus(); return; }
                    specialFolders.push({ id: 'spfolder_' + Date.now(), name: folderName, dhikrIds: [] });
                    saveSpecialFolders();
                    renderSpecialList();
                    closeSpecialModal();
                    showToast(t('toastFolderCreated').replace('{name}', folderName));
                    return;
                }
            }
            const name = document.getElementById('specialFormName').value.trim();
            if (!name) { showToast(t('toastSpecialEmptyName')); return; }
            const text = document.getElementById('specialFormText').value.trim();
            const desc = document.getElementById('specialFormDesc').value.trim();
            const detail = document.getElementById('specialFormDetail').value.trim();
            const goal = Math.max(1, parseInt(document.getElementById('specialFormGoal').value) || 100);
            if (editId) {
                const d = specialDhikrs.find(x => x.id === editId);
                if (d) {
                    _fillAllSpecialLangs(d, 'name', name);
                    _fillAllSpecialLangs(d, 'desc', desc);
                    _fillAllSpecialLangs(d, 'detail', detail);
                    d.text = text;
                    d.goal = goal; d.isCustom = true;
                }
            } else {
                const newDhikr = { id: 'custom_' + Date.now(), arabic: '', translit: '', text, isCustom: true, goal };
                _fillAllSpecialLangs(newDhikr, 'name', name);
                _fillAllSpecialLangs(newDhikr, 'desc', desc);
                _fillAllSpecialLangs(newDhikr, 'detail', detail);
                specialDhikrs.push(newDhikr);
                // Add to folder if a folder was selected
                if (typeof _specialFolderSelected === 'number' && specialFolders[_specialFolderSelected]) {
                    specialFolders[_specialFolderSelected].dhikrIds.push(newDhikr.id);
                    saveSpecialFolders();
                    showToast(t('toastMovedToFolder').replace('{name}', specialFolders[_specialFolderSelected].name));
                } else {
                    showToast(t('toastSaved'));
                }
            }
            saveSpecialDhikrsToStorage(); markDirty('special'); renderSpecialList(); _dirty.special = false; closeSpecialModal();
            if (editId) showToast(t('toastSaved'));
        }
        let _deleteSpecialId = null;
        function promptDeleteSpecialDhikr(id) {
            _deleteSpecialId = id;
            document.getElementById('deleteSpecialOverlay').classList.add('show');
        }
        function confirmDeleteSpecialDhikr() {
            if (_deleteSpecialId) {
                markDefaultDeleted(_deleteSpecialId);
                specialDhikrs = specialDhikrs.filter(d => d.id !== _deleteSpecialId);
                delete completedSpecial[_deleteSpecialId]; delete specialProgress[_deleteSpecialId]; delete specialResumeSessions[_deleteSpecialId];
                saveSpecialDhikrsToStorage(); saveDataDebounced(); markDirty('special'); renderSpecialList(); _dirty.special = false; showToast(t('toastDeleted'));
                _deleteSpecialId = null;
            }
            document.getElementById('deleteSpecialOverlay').classList.remove('show');
        }
        function cancelDeleteSpecialDhikr() {
            _deleteSpecialId = null;
            document.getElementById('deleteSpecialOverlay').classList.remove('show');
        }
        function deleteSpecialDhikr(id) { promptDeleteSpecialDhikr(id); }
        function saveSpecialDhikrsToStorage() {
            localStorage.setItem('azkar_custom_special_dhikrs', JSON.stringify(specialDhikrs));
            markDataChanged();
        }
        function loadCustomSpecialDhikrs() {
            // ВАЖНО: раньше эта функция полностью заменяла in-code массив
            // specialDhikrs тем, что лежало в localStorage. Из-за этого старые
            // снимки (без полей nameDe/nameEs/nameFr/nameIt/nameJa/nameKo/nameZh
            // и соответствующих desc*) перетирали свежие переводы из кода, и
            // при выборе любого языка кроме ru/en/uz пользователь видел русский
            // текст (фолбэк в getSpecialName/getSpecialDesc).
            //
            // Теперь делаем УМНЫЙ MERGE по id:
            //  • Пользовательский зикр (нет дефолта в коде) — берётся как есть.
            //  • Дефолтный зикр, отредактированный пользователем (isCustom) —
            //    его правки сохраняются, недостающие поля добираются из дефолта.
            //  • Неотредактированный дефолтный зикр — имя/описание/переводы
            //    ВСЕГДА берутся из свежего кода (сохраняется только цель).
            //  • Новый дефолтный зикр, которого ещё нет в кэше (напр.
            //    tahlil_100_daily) — ДОБАВЛЯЕТСЯ на свою каноническую позицию,
            //    если только пользователь не удалял его ранее.
            // Это гарантирует, что переименования, обновления переводов и новые
            // дефолтные зикры доходят до пользователей со старым кэшем, при этом
            // пользовательские правки, удаления и порядок карточек не теряются.
            try {
                const s = localStorage.getItem('azkar_custom_special_dhikrs');
                if (!s) return;
                const stored = JSON.parse(s);
                if (!Array.isArray(stored) || stored.length === 0) return;

                const defaultsById = new Map(SPECIAL_DHIKRS_DEFAULTS.map(d => [d.id, d]));
                const merged = stored
                    .filter(d => d && d.id)
                    .map(d => {
                        const def = defaultsById.get(d.id);
                        // Пользовательский зикр, которого нет среди дефолтов кода —
                        // берём как есть.
                        if (!def) return d;
                        // Дефолтный зикр, который пользователь отредактировал вручную
                        // (isCustom): сохраняем его правки, недостающие поля добираем
                        // из дефолта.
                        if (d.isCustom) return Object.assign({}, def, d);
                        // Неотредактированный дефолтный зикр: имя/описание/переводы/
                        // арабский ВСЕГДА берём из свежего кода. Иначе старый кэш в
                        // localStorage перетирает переименования и обновлённые
                        // переводы (напр. Тахлиль), и пользователь продолжает видеть
                        // устаревшие названия. Сохраняем лишь пользовательскую цель,
                        // если она была задана.
                        return Object.assign({}, def, (d.goal != null ? { goal: d.goal } : {}));
                    });

                // Добавляем новые дефолтные зикры, которых нет в кэше пользователя,
                // на их каноническую позицию (сразу после предыдущего дефолтного
                // зикра из кода). Удалённые пользователем дефолты не восстанавливаем.
                const deletedDefaults = getDeletedDefaultIds();
                const presentIds = new Set(merged.map(d => d.id));
                SPECIAL_DHIKRS_DEFAULTS.forEach((def, codeIdx) => {
                    if (presentIds.has(def.id) || deletedDefaults.has(def.id)) return;
                    // Точка вставки: сразу после ближайшего предшествующего
                    // дефолтного зикра, который уже присутствует в merged.
                    let insertAt = merged.length;
                    for (let k = codeIdx - 1; k >= 0; k--) {
                        const idx = merged.findIndex(m => m.id === SPECIAL_DHIKRS_DEFAULTS[k].id);
                        if (idx !== -1) { insertAt = idx + 1; break; }
                    }
                    merged.splice(insertAt, 0, Object.assign({}, def));
                    presentIds.add(def.id);
                });

                specialDhikrs = merged;

                // Если merge что-то восстановил/добавил — сразу сохраняем
                // починенный снимок в localStorage, чтобы баг не возвращался
                // при перезагрузке.
                const correctedJson = JSON.stringify(merged);
                if (correctedJson !== s) {
                    localStorage.setItem('azkar_custom_special_dhikrs', correctedJson);
                }
            } catch(e) {}
        }
        // ===== DRAG & DROP =====
        let _spDragSrc = null;
        let _spDragId = null; // dhikr id being dragged
        function initSpecialDrag(card, index) {
            const handle = card.querySelector('.special-drag-handle');
            if (!handle) return;
            let _pressTimer = null;
            let _dragActive = false;

            handle.addEventListener('touchstart', e => {
                e.stopPropagation();
                _dragActive = false;
                _pressTimer = setTimeout(() => {
                    _dragActive = true;
                    _spDragSrc = index;
                    // Collect only unfoldered dhikrs for index mapping
                    const inFolderIds = new Set();
                    specialFolders.forEach(f => f.dhikrIds.forEach(id => inFolderIds.add(id)));
                    const unfoldered = specialDhikrs.filter(d => !inFolderIds.has(d.id));
                    _spDragId = unfoldered[index] ? unfoldered[index].id : null;
                    card.classList.add('dragging');
                    if (navigator.vibrate) navigator.vibrate(30);
                }, 500);
            }, { passive: true });

            handle.addEventListener('touchmove', e => {
                if (!_dragActive || _spDragSrc === null) {
                    if (_pressTimer) { clearTimeout(_pressTimer); _pressTimer = null; }
                    return;
                }
                e.preventDefault();
                const touch = e.touches[0];
                // Highlight cards
                document.querySelectorAll('.special-card').forEach((c, i) => {
                    const r = c.getBoundingClientRect(); c.classList.remove('drag-over');
                    if (touch.clientY >= r.top && touch.clientY <= r.bottom && i !== _spDragSrc) c.classList.add('drag-over');
                });
                // Highlight folders
                document.querySelectorAll('#specialListContainer .cl-folder').forEach(fd => {
                    const r = fd.getBoundingClientRect();
                    fd.classList.toggle('folder-drag-over', touch.clientY >= r.top && touch.clientY <= r.bottom);
                });
            }, { passive: false });

            handle.addEventListener('touchend', e => {
                if (_pressTimer) { clearTimeout(_pressTimer); _pressTimer = null; }
                if (!_dragActive || _spDragSrc === null) { _dragActive = false; return; }
                const touch = e.changedTouches[0];
                document.querySelectorAll('.special-card').forEach(c => c.classList.remove('drag-over'));
                // Check if dropped onto a folder
                let droppedOnFolder = null;
                document.querySelectorAll('#specialListContainer .cl-folder').forEach((fd, fi) => {
                    const r = fd.getBoundingClientRect();
                    fd.classList.remove('folder-drag-over');
                    if (touch.clientY >= r.top && touch.clientY <= r.bottom) droppedOnFolder = fi;
                });
                if (droppedOnFolder !== null && _spDragId && specialFolders[droppedOnFolder]) {
                    // Move dhikr into folder
                    if (!specialFolders[droppedOnFolder].dhikrIds.includes(_spDragId)) {
                        specialFolders[droppedOnFolder].dhikrIds.push(_spDragId);
                        saveSpecialFolders();
                        renderSpecialList();
                        showToast(t('toastMovedToFolder').replace('{name}', specialFolders[droppedOnFolder].name));
                    } else {
                        card.classList.remove('dragging');
                    }
                } else {
                    // Reorder among unfoldered
                    const inFolderIds = new Set();
                    specialFolders.forEach(f => f.dhikrIds.forEach(id => inFolderIds.add(id)));
                    let target = null;
                    document.querySelectorAll('.special-card').forEach((c, i) => {
                        const r = c.getBoundingClientRect();
                        if (touch.clientY >= r.top && touch.clientY <= r.bottom) target = i;
                    });
                    if (target !== null && target !== _spDragSrc) {
                        const m = specialDhikrs.splice(_spDragSrc, 1)[0]; specialDhikrs.splice(target, 0, m);
                        saveSpecialDhikrsToStorage(); renderSpecialList();
                    } else { card.classList.remove('dragging'); }
                }
                _spDragSrc = null;
                _spDragId = null;
                _dragActive = false;
            });

            handle.addEventListener('touchcancel', () => {
                if (_pressTimer) { clearTimeout(_pressTimer); _pressTimer = null; }
                card.classList.remove('dragging');
                document.querySelectorAll('.special-card').forEach(c => c.classList.remove('drag-over'));
                document.querySelectorAll('#specialListContainer .cl-folder').forEach(fd => fd.classList.remove('folder-drag-over'));
                _spDragSrc = null;
                _spDragId = null;
                _dragActive = false;
            });
        }

        function t(key) { return i18n[currentLang]?.[key] || i18n['en']?.[key] || i18n['ru']?.[key] || key; }

        function applySettingsSectionLabels(lang) {
            const S = UI_I18N.settingsSections || {};
            const pick = (o) => o[lang] || o.en;
            const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
            set('setSecAppearance', pick(S.appearance));
            set('setSecSound', pick(S.sound));
            set('setSecZikr', pick(S.zikr));
            set('setSecData', pick(S.data));
            set('setThemeHint', pick(S.themeHint));
        }

        function applyLanguage(lang) {
            // Язык ещё не скачан (импорт данных / облачная синхронизация) —
            // сейчас покажем английский, после загрузки перерисуем.
            if (window.AzkarI18n && !AzkarI18n.isLoaded(lang)) {
                AzkarI18n.load(lang).then(function (ok) {
                    if (ok && currentLang === lang) {
                        applyLanguage(lang);
                        if (typeof markDirty === 'function') markDirty('dua','favorites','stats','special');
                    }
                });
            }
            currentLang = lang;
            document.documentElement.lang = lang;
            if (typeof window.applySeoLanguage === 'function') window.applySeoLanguage(lang);
            // Localize the Yes/No buttons on every confirmation card.
            document.querySelectorAll('.overlay-btn-cancel').forEach(function(b){
                b.textContent = t('btnNo');
            });
            document.querySelectorAll('.overlay-btn-confirm').forEach(function(b){
                b.textContent = t('btnYes');
            });
            document.querySelectorAll('.lang-chip').forEach(chip => chip.classList.toggle('active', chip.dataset.lang === lang));
            if (typeof updateLangDropdownUI === 'function') updateLangDropdownUI(lang);
            const els = {
                headerTitle: 'headerTitle', labelGoal: 'labelGoal', labelGoal2: 'labelGoal', labelGoal3: 'labelGoal',
                labelCustom: 'labelCustom', btnReset: 'btnReset', titleDua: 'titleDua', subtitleDua: 'subtitleDua',
                titleFav: 'titleFav', subtitleFav: 'subtitleFav', titleStats: 'titleStats', labelToday: 'labelToday',
                labelTotal: 'labelTotal', labelWeek: 'labelWeek', labelYear: 'labelYear', labelMonth: 'labelMonth',
                chartTitle: 'chartTitle', timeChartTitle: 'timeChartTitle', titleSettings: 'titleSettings',
                labelLang: 'labelLang', labelTheme: 'labelTheme', labelOnlinePresence: 'labelOnlinePresence', labelLiteMode: 'labelLiteMode',
                aeOpt0: 'autoExtendOff', labelSound: 'labelSound',
                labelClickSound: 'labelClickSound',
                setClickSoundHint: 'soundHint', setGoalSoundHint: 'soundHint',
                soundPickerTap: 'clickSoundPickerTitle', soundPickerGoal: 'goalSoundPickerTitle',
                labelVibration: 'labelVibration', labelData: 'labelData',
                btnExport: 'btnExport', btnImport: 'btnImport',
                autoExportBadge: 'badgeAuto', madeWithText: 'madeWith',
                seoAboutButton: 'aboutApp', seoIntroTitle: 'aboutApp', seoIntroText: 'aboutAppText',
                deleteListNoBtn: 'btnNo', deleteListYesBtn: 'btnYes', listNameCancelBtn: 'addFolderCancel',
                btnClearStats: 'btnClearStats',
                clearStatsTitle: 'clearStatsTitle', clearStatsSub: 'clearStatsSub',
                modalTitleNew: 'modalTitleNew',
                btnSaveDua: 'btnSaveDua', btnCancel: 'btnCancel', completionTitle: 'completionTitle',
                completionSub: 'completionSub', resetCounterTitle: 'resetCounterTitle', resetCounterSub: 'resetCounterSub',
                deleteDuaTitle: 'deleteDuaTitle', deleteDuaSub: 'deleteDuaSub',
                btnYes: 'btnYes', btnNo: 'btnNo', btnYesReset: 'btnYes',
                btnNoReset: 'btnNo', btnYesClear: 'btnYes', btnNoClear: 'btnNo',
                btnYesClearStats: 'btnYes', btnNoClearStats: 'btnNo',
                navAzkar: 'navAzkar', navDua: 'navDua', navChecklist: 'titleChecklist', navStats: 'navStats', navSettings: 'navSettings',
                periodWeek: 'periodWeek', periodMonth: 'periodMonth', periodYear: 'periodYear',
                specialListTitle: 'specialListTitle', specialListSubtitle: 'specialListSubtitle',
                labelPip: 'labelPip',
                deleteSpecialTitle: 'specialDeleteTitle', deleteSpecialSub: 'specialDeleteSub',
                btnYesSpecial: 'btnYes', btnNoSpecial: 'btnNo',
                specialFormSaveBtn: 'specialFormSave',
                specialFormCancelBtn: 'specialFormCancel',
                titleChecklist: 'titleChecklist',
                subtitleChecklist: 'subtitleChecklist',
                overallProgressLabel: 'overallProgressLabel',
                clStatsTitle: 'clStatsTitle',
                clStatsSubtitle: 'clStatsSubtitle',
                clStatsCloseBtn: 'clStatsClose',
                dhikrProgressLabel: 'dhikrProgressLabel',
                dhikrStatsTitle: 'dhikrStatsTitle',
                dhikrStatsSubtitle: 'dhikrStatsSubtitle',
                dhikrStatsCloseBtn: 'clStatsClose',
                labelTimer: 'labelTimer',
                labelStealth: 'labelStealth',
                labelAutoAdvance: 'labelAutoAdvance',
                // Hadith UI
                labelHadith: 'labelNotifications',
                hadithPopupLabel: 'hadithLabel',
                hadithCloseHint: 'hadithCloseHint',
                // Add-folder modal (tasks)
                addFolderModalTitle: 'addFolderTitle',
                addFolderCancelBtn: 'addFolderCancel',
                // Dua folder modal (create folder / add dua)
                duaFolderModalTitle: 'addFolderTitle',
                duaFolderCancelBtn: 'addFolderCancel',
                duaFolderConfirmBtn: 'addFolderConfirm',
                // Rename folder modal (shared dua + task)
                renameFolderCancelBtn: 'addFolderCancel',
                renameFolderConfirmBtn: 'btnSaveDua',
                // Delete folder/task overlays — Yes / No
                deleteFolderTitle: 'deleteFolderTitle',
                deleteFolderSub: 'deleteFolderSub',
                deleteFolderYesBtn: 'btnYes',
                deleteFolderNoBtn: 'btnNo',
                deleteTaskTitleEl: 'deleteTaskTitle',
                deleteTaskSubEl: 'deleteTaskSub',
                deleteTaskYesBtn: 'btnYes',
                deleteTaskNoBtn: 'btnNo',
                // Delete dua folder overlay
                deleteDuaFolderYesBtn: 'btnYes',
                deleteDuaFolderNoBtn: 'btnNo',
                // Manual add zikr modal
                manualAddTitle: 'manualAddTitle',
                btnCancelManualAdd: 'btnCancel',
                specialAchieveHint: 'tapToContinue',
            };
            for (let [id, key] of Object.entries(els)) {
                let el = document.getElementById(id);
                if (el) el.innerText = t(key);
            }
            // Подписи для экранного диктора (aria-label) и единица таймера зикра
            document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
            document.querySelectorAll('.zikr-timer-unit').forEach(el => { el.textContent = t('unitSeconds'); });
            // Placeholders that need to follow the active language
            const _addFolderInput = document.getElementById('addFolderInput');
            if (_addFolderInput) _addFolderInput.placeholder = t('placeholderFolderName');
            const _duaFolderInput = document.getElementById('duaFolderInput');
            if (_duaFolderInput) _duaFolderInput.placeholder = t('placeholderFolderName');
            const _renameFolderInput = document.getElementById('renameFolderInput');
            if (_renameFolderInput) _renameFolderInput.placeholder = t('placeholderFolderName');
            // Confirm button on the add-folder modal can also be re-localized here
            // (open-modal handler updates it too, but covering the static case
            // means the label is correct even before the modal is opened.)
            const _addFolderConfirmBtn = document.getElementById('addFolderConfirmBtn');
            if (_addFolderConfirmBtn) _addFolderConfirmBtn.innerText = t('addFolderConfirm');
            // The add-folder dropdown's default ("Новая папка") label
            const _addFolderSelectText = document.getElementById('addFolderSelectText');
            if (_addFolderSelectText) _addFolderSelectText.innerText = t('addFolderTitle');
            const _duaFolderSelectText = document.getElementById('duaFolderSelectText');
            if (_duaFolderSelectText) _duaFolderSelectText.innerText = t('addFolderTitle');
            document.getElementById('duaText').placeholder = t('placeholderDua');
            document.getElementById('duaName').placeholder = t('placeholderDuaName');
            document.getElementById('duaTrans').placeholder = t('placeholderTrans');
            document.getElementById('duaSearch').placeholder = t('placeholderSearch');
            const _manualAddInput = document.getElementById('manualAddInput');
            if (_manualAddInput) _manualAddInput.placeholder = t('manualAddPlaceholder');
            const _manualAddModeBtn = document.getElementById('manualAddModeBtn');
            const _btnConfirmManualAdd = document.getElementById('btnConfirmManualAdd');
            if (_manualAddModeBtn && _btnConfirmManualAdd) {
                if (typeof manualAddMode !== 'undefined' && manualAddMode === 'subtract') {
                    _manualAddModeBtn.setAttribute('aria-label', t('manualAddModeSubtractAria'));
                    _btnConfirmManualAdd.innerText = t('manualAddConfirmSubtract');
                } else {
                    _manualAddModeBtn.setAttribute('aria-label', t('manualAddModeAddAria'));
                    _btnConfirmManualAdd.innerText = t('manualAddConfirm');
                }
            }
            // Dua folder modal — inline dua fields (create dua without/into folder)
            const _dfName = document.getElementById('duaFolderDuaName');
            if (_dfName) _dfName.placeholder = t('placeholderDuaName');
            const _dfText = document.getElementById('duaFolderDuaText');
            if (_dfText) _dfText.placeholder = t('placeholderDua');
            const _dfTrans = document.getElementById('duaFolderDuaTrans');
            if (_dfTrans) _dfTrans.placeholder = t('placeholderTrans');
            const _dfDetail = document.getElementById('duaFolderDuaDetail');
            if (_dfDetail) _dfDetail.placeholder = t('detailMoreLabel');
            const spName = document.getElementById('specialFormName');
            if (spName) spName.placeholder = t('specialFormPlaceholderName');
            const spText = document.getElementById('specialFormText');
            if (spText) spText.placeholder = t('specialFormPlaceholderText');
            const spDesc = document.getElementById('specialFormDesc');
            if (spDesc) spDesc.placeholder = t('specialFormPlaceholderDesc');
            const spDetail = document.getElementById('specialFormDetail');
            if (spDetail) spDetail.placeholder = t('detailMoreLabel');
            // Custom goal modal
            const cgTitle = document.getElementById('customGoalModalTitle');
            if (cgTitle) cgTitle.innerText = t('customGoalModalTitle');
            const cgLabel = document.getElementById('customGoalModalLabel');
            if (cgLabel) cgLabel.innerText = t('customGoalModalLabel');
            const cgSave = document.getElementById('customGoalSaveBtn');
            if (cgSave) cgSave.innerText = t('customGoalSaveBtn');
            const cgCancel = document.getElementById('customGoalCancelBtn');
            if (cgCancel) cgCancel.innerText = t('btnCancel');
            if (typeof updateAutoExtendBadge === 'function') updateAutoExtendBadge();
            const hintText = document.getElementById('hintToastText');
            if (hintText) hintText.innerText = t('hintToastText');
            // Refresh vibration label with new language
            const vLabelEl = document.getElementById('vibrationSliderLabel');
            if (vLabelEl) vLabelEl.textContent = getVibLabel(settings.vibrationLevel || 3);
            applySettingsSectionLabels(lang);
            if (typeof updateGoogleAccountUI === 'function') updateGoogleAccountUI();
            // Хадисы: пересылаем расписание в SW с текстами на текущем языке
            if (settings && hadithOn() && typeof sendHadithScheduleToSW === 'function') {
                sendHadithScheduleToSW();
            }
            // Default "99 Names of Allah" folder: refresh its name and the
            // localized name/meaning/description of every seeded dua.
            if (typeof _syncNames99FolderLanguage === 'function') _syncNames99FolderLanguage();
            // ЭТАП 4: скрытые разделы не рисуем сразу — только помечаем «грязными»,
            // они нарисуются при открытии вкладки (см. switchTab). Видимый — сразу.
            if (_isScreenActive('screen-dua')) { renderDuas(); renderDuaFolders(); _dirty.dua = false; _dirty.duaFolders = false; }
            else markDirty('dua', 'duaFolders');
            if (_isScreenActive('screen-favorites')) { renderFavorites(); _dirty.favorites = false; }
            else markDirty('favorites');
            if (_isScreenActive('screen-stats')) { renderStats(); _dirty.stats = false; }
            else markDirty('stats');
            // Обновляем название системной папки «Особые Награды» при смене языка
            (function() {
                const MIGRATION_ID = 'default_special_rewards';
                const folderNames = {
                    ru: 'Особые Награды', en: 'Special Rewards', uz: 'Maxsus Mukofotlar',
                    ar: 'مكافآت خاصة', de: 'Besondere Belohnungen', es: 'Recompensas Especiales',
                    fr: 'Récompenses Spéciales', it: 'Ricompense Speciali', ja: '特別な報酬',
                    ko: '특별한 보상', zh: '特别奖励', tr: 'Özel Ödüller', hi: 'विशेष पुरस्कार', ms: 'Ganjaran Istimewa', id: 'Pahala Istimewa', th: 'รางวัลพิเศษ'
                };
                const sysFolder = specialFolders.find(f => f.id === MIGRATION_ID);
                if (sysFolder) { sysFolder.name = folderNames[lang] || folderNames.ru; saveSpecialFolders(); }
            })();
            // Обновляем название системной папки «Зикры перед сном» при смене языка
            (function() {
                const SLEEP_ID = 'default_sleep_dhikrs';
                const sleepFolderNames = {
                    ru: 'Зикры перед сном', en: 'Bedtime Dhikrs', uz: 'Uxlashdan oldin zikrlar',
                    ar: 'أذكار النوم', de: 'Dhikrs vor dem Schlafen', es: 'Dhikrs antes de dormir',
                    fr: 'Dhikrs avant de dormir', it: 'Dhikr prima di dormire', ja: '就寝前のドゥアー',
                    ko: '잠자리 드는 전 두아', zh: '睡前念珠', tr: 'Uyku Öncesi Zikirler', hi: 'सोने से पहले के ज़िक्र', ms: 'Zikir Sebelum Tidur', id: 'Zikir Sebelum Tidur', th: 'ซิกร์ก่อนนอน'
                };
                const sleepFolder = specialFolders.find(f => f.id === SLEEP_ID);
                if (sleepFolder) { sleepFolder.name = sleepFolderNames[lang] || sleepFolderNames.ru; saveSpecialFolders(); }
            })();
            // Обновляем название системной папки «Ежедневные зикры» при смене языка
            (function() {
                const DAILY_ID = 'default_daily_dhikrs';
                const dailyFolderNames = {
                    ru: 'Ежедневные зикры', en: 'Daily Dhikrs', uz: 'Kunlik zikrlar',
                    ar: 'أذكار يومية', de: 'Tägliche Dhikrs', es: 'Dhikrs diarios',
                    fr: 'Dhikrs quotidiens', it: 'Dhikr quotidiani', ja: '日々のドゥアー',
                    ko: '매일의 지크르', zh: '每日念珠', tr: 'Günlük Zikirler', hi: 'दैनिक ज़िक्र', ms: 'Zikir Harian', id: 'Zikir Harian', th: 'ซิกร์ประจำวัน'
                };
                const dailyFolder = specialFolders.find(f => f.id === DAILY_ID);
                if (dailyFolder) { dailyFolder.name = dailyFolderNames[lang] || dailyFolderNames.ru; saveSpecialFolders(); }
            })();
            if (_isScreenActive('screen-special-list')) { renderSpecialList(); _dirty.special = false; }
            else markDirty('special');
            // Re-render checklist (folder & task names use per-language `names` map)
            if (typeof renderChecklistFolders === 'function') {
                renderChecklistFolders();
                if (typeof updateChecklistUI === 'function') updateChecklistUI();
                if (typeof updateChecklistListUI === 'function') updateChecklistListUI();
            }
            // Re-localize Qibla page (cardinals, title, subtitle, status, buttons)
            if (typeof window.qiblaApplyLang === 'function') window.qiblaApplyLang();
            // Re-localize prayer clock + modal (next-prayer label uses localized name)
            if (window.PrayerTimes && typeof window.PrayerTimes.applyLang === 'function') window.PrayerTimes.applyLang();
            // Re-localize geo permission overlay (only matters if it's visible / about to show)
            if (typeof window._refreshGeoPermLang === 'function') window._refreshGeoPermLang();
            // Post-salah dhikr mode: keep its own header title (current step name) / selector labels in sync with the new language
            if (typeof updatePostSalahSelectorUI === 'function') updatePostSalahSelectorUI();
            if (postSalahActive && typeof updatePostSalahHeaderTitle === 'function') {
                updatePostSalahHeaderTitle();
            }
            updateDisplay();
        }

        function openAboutApp() {
            const overlay = document.getElementById('aboutAppOverlay');
            if (!overlay) return;
            overlay.classList.add('show');
            overlay.setAttribute('aria-hidden', 'false');
            const title = document.getElementById('seoIntroTitle');
            if (title) setTimeout(() => title.focus({ preventScroll: true }), 30);
        }

        function closeAboutApp() {
            const overlay = document.getElementById('aboutAppOverlay');
            if (!overlay) return;
            overlay.classList.remove('show');
            overlay.setAttribute('aria-hidden', 'true');
        }

        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') closeAboutApp();
        });

        function changeLanguage(lang) {
            // Сначала скачиваем файл языка (обычно доли секунды), потом переключаем —
            // без мигания английским текстом.
            if (window.AzkarI18n && !AzkarI18n.isLoaded(lang)) {
                AzkarI18n.load(lang).then(function (ok) {
                    if (ok) changeLanguage(lang);
                    else { applyLanguage(currentLang); showToast(t('toastLangLoadFailed'), 2600); }
                });
                return;
            }
            currentLang = lang; applyLanguage(lang); saveDataDebounced(); markDirty('dua','favorites','stats','special');
        }

        // ===== LANGUAGE DROPDOWN =====
        const _langMeta = UI_I18N.languageMeta || {};
        function toggleLangDropdown(e) {
            e.stopPropagation();
            const btn = document.getElementById('langSelectBtn');
            const dd = document.getElementById('langDropdown');
            if (!btn || !dd) return;
            const isOpen = dd.classList.contains('open');
            if (isOpen) {
                btn.classList.remove('open');
                dd.classList.remove('open');
            } else {
                btn.classList.add('open');
                dd.classList.add('open');
            }
        }
        function selectLang(lang, e) {
            if (e) e.stopPropagation();
            // Close dropdown first
            const btn = document.getElementById('langSelectBtn');
            const dd = document.getElementById('langDropdown');
            if (btn) btn.classList.remove('open');
            if (dd) dd.classList.remove('open');
            // Run language change (heavy DOM ops) then re-ensure dropdown is closed
            changeLanguage(lang);
            updateLangDropdownUI(lang);
            // Re-enforce closed state after all re-renders
            requestAnimationFrame(function() {
                const btn2 = document.getElementById('langSelectBtn');
                const dd2 = document.getElementById('langDropdown');
                if (btn2) btn2.classList.remove('open');
                if (dd2) dd2.classList.remove('open');
            });
        }
        function updateLangDropdownUI(lang) {
            const meta = _langMeta[lang] || _langMeta.ru;
            const btnFlag = document.getElementById('langBtnFlag');
            const btnText = document.getElementById('langBtnText');
            if (btnFlag) btnFlag.textContent = meta.flag;
            if (btnText) btnText.textContent = meta.name;
            document.querySelectorAll('.lang-option').forEach(opt => {
                opt.classList.toggle('active', opt.dataset.lang === lang);
            });
        }
        // Close dropdown when tapping outside
        document.addEventListener('click', function(e) {
            const wrap = document.getElementById('langSelectWrap');
            if (wrap && !wrap.contains(e.target)) {
                const btn = document.getElementById('langSelectBtn');
                const dd = document.getElementById('langDropdown');
                if (btn) btn.classList.remove('open');
                if (dd) dd.classList.remove('open');
            }
            // Close folder dropdown when tapping outside
            const fWrap = document.getElementById('addFolderSelectWrap');
            if (fWrap && !fWrap.contains(e.target)) {
                const fBtn = document.getElementById('addFolderSelectBtn');
                const fDd = document.getElementById('addFolderDropdown');
                if (fBtn) fBtn.classList.remove('open');
                if (fDd) fDd.classList.remove('open');
            }
        });

        // ==================== STATE ====================
        let count = 0, goal = 33, isUnlimited = false;
        const UNLIMITED_GOAL = 999999999;
        let settings = { autosave: true, theme: 'dark', language: 'en', sound: true, clickSound: true, clickSoundVolume: 10, goalSoundVolume: 10, vibration: false, vibrationLevel: 3, timerEnabled: false, autoExport: false };
        let duas = [], deleteId = null;
        const CIRCUMFERENCE = 848;
        let lastIncrementTime = 0;
        const INCREMENT_DEBOUNCE = 80;
        let goalTriggered = false, duaSearchQuery = '', saveTimeout = null,
            pendingStatsSave = false, currentPeriod = 'week', audioCtx = null,
            isCompletionActive = false, dragSrcIndex = null, customGoal = 0;
        let _prevLap = 0; // tracks previous lap to detect fill<->drain transitions
        // Точка отсчёта кольца/шарика для СТАНДАРТНЫХ целей (33/66/100).
        // При каждом выборе стандартной цели ставится = count, поэтому шарик
        // визуально всегда начинается со старта, тогда как общий счётчик (count)
        // и статистика продолжают идти как обычно.
        // Для «своей цели» — своя, отдельная точка старта (customBaseline).
        let goalBaseline = 0;
        // «Своя цель»: точка старта текущего круга. Запоминается навсегда —
        // переключения 33/66/100 ⇄ «своя цель» её не трогают, поэтому круг
        // продолжается с того места, где остановился. Сдвигается только когда
        // пользователь вводит НОВОЕ число цели или срабатывает авто-продление
        // (+100/+500…) — тогда начинается новый круг.
        let customBaseline = 0;
        // Одноразовый флаг: мгновенно (без анимации) поставить шарик/кольцо на старт.
        let _snapRingToStart = false;
        let specialCount = 0, specialGoal = 100, currentSpecialId = null, isSpecialActive = false;
        let completedSpecial = {};
        let openSpecialFolderIdx = null;
        let _duaDragSrcId = null; // tracks dua id during drag-into-folder
        let specialProgress = {};
        let specialResumeSessions = {};
        // Накопленный (lifetime) счётчик по каждому зикру — НЕ сбрасывается
        // каждый день, растёт бесконечно. 'main' = основной счётчик,
        // остальные ключи = id специальных зикров. Используется только для
        // показа "сколько всего сделано" в статистике; не влияет на цели/прогресс.
        let dhikrTotals = {};
        function loadDhikrTotals() {
            try { dhikrTotals = JSON.parse(localStorage.getItem('azkar_dhikr_totals') || '{}'); }
            catch (e) { dhikrTotals = {}; }
            if (!dhikrTotals || typeof dhikrTotals !== 'object') dhikrTotals = {};
        }
        function saveDhikrTotals() {
            try { localStorage.setItem('azkar_dhikr_totals', JSON.stringify(dhikrTotals)); } catch (e) {}
        }
        function bumpDhikrTotal(id, amount) {
            dhikrTotals[id] = (dhikrTotals[id] || 0) + (amount || 1);
            saveDhikrTotals();
        }
        let lastSpecialIncrementTime = 0;
        // null = нет активного; string = id последнего запущенного зикра (сбрасывается только кнопкой "Назад" или завершением)
        let lastActiveSpecialId = null;
        let _swipeSpecialId = null;
        // 'main' | 'special' — к какому счётчику привязана плавающая кнопка
        let pipMode = 'main';

        // ==================== POST-SALAH DHIKR («Зикры после намаза») ====================
        // Полностью независимый режим главного экрана: последовательность из
        // 4 этапов (Субханаллах×33 → Альхамдулиллях×33 → Аллаху Акбар×33 →
        // Ля иляха илляЛлах×1), с автопереключением между ними и сбросом
        // кольца/счётчика на каждом этапе. НЕ пишет в общую статистику
        // (azkar_stats_v2), НЕ пишет в dhikrTotals, НЕ помечается как
        // completedSpecial, НЕ входит в specialDhikrs/список специальных
        // зикров, НЕ сохраняется между перезагрузками страницы — держится
        // только в памяти на время открытой вкладки. При уходе на другую
        // вкладку через navbar и возврате обратно просто продолжается с
        // того же места, без каких-либо вопросов "продолжить/заново".
        const POST_SALAH_STEPS = [
            { stepGoal: 33, titleKey: 'postSalahStep1' },
            { stepGoal: 33, titleKey: 'postSalahStep2' },
            { stepGoal: 33, titleKey: 'postSalahStep3' },
            { stepGoal: 1,  titleKey: 'postSalahStep4' }
        ];
        let postSalahActive = false;
        let postSalahStepIndex = 0;   // 0..3 — текущий этап
        let postSalahCount = 0;       // счётчик ВНУТРИ текущего этапа (сбрасывается на каждом этапе)
        let _postSalahGoalShown = false;
        function togglePostSalahDropdown(e) {
            e.stopPropagation();
            const btn = document.getElementById('postSalahSelectBtn');
            const dd = document.getElementById('postSalahDropdown');
            if (!btn || !dd) return;
            const isOpen = dd.classList.contains('open');
            if (isOpen) { btn.classList.remove('open'); dd.classList.remove('open'); }
            else { btn.classList.add('open'); dd.classList.add('open'); }
        }
        document.addEventListener('click', function(e) {
            const wrap = document.getElementById('postSalahSelectWrap');
            if (wrap && !wrap.contains(e.target)) {
                const btn = document.getElementById('postSalahSelectBtn');
                const dd = document.getElementById('postSalahDropdown');
                if (btn) btn.classList.remove('open');
                if (dd) dd.classList.remove('open');
            }
        });

        function onPostSalahOptionClick(e) {
            if (e) e.stopPropagation();
            const btn = document.getElementById('postSalahSelectBtn');
            const dd = document.getElementById('postSalahDropdown');
            if (btn) btn.classList.remove('open');
            if (dd) dd.classList.remove('open');
            if (postSalahActive) {
                exitPostSalahMode();
            } else {
                enterPostSalahMode();
            }
        }

        // Подписи берутся из i18n/<язык>.js (версия файла привязана к I18N_VERSION).
        function _tPostSalah(key) { return t(key); }
        function updatePostSalahSelectorUI() {
            const btn = document.getElementById('postSalahSelectBtn');
            const btnText = document.getElementById('postSalahBtnText');
            const opt = document.getElementById('postSalahOption');
            // Кнопка всегда показывает ТЕКУЩИЙ режим.
            // Пункт в выпадающем списке — режим, НА КОТОРЫЙ можно переключиться (противоположный).
            if (btnText) btnText.innerText = postSalahActive ? _tPostSalah('postSalahOptionLabel') : _tPostSalah('postSalahMainLabel');
            if (opt) opt.innerText = postSalahActive ? _tPostSalah('postSalahMainLabel') : _tPostSalah('postSalahOptionLabel');
            // Подсветка кнопки убрана из постоянного режима (active-mode) —
            // теперь кнопка светится только при открытии дропдауна (.open), как lang-select
        }

        // Вход в режим: НИКОГДА не спрашивает "продолжить/заново" — просто
        // показывает текущий этап и его счётчик (в рамках этой открытой
        // страницы). При первом входе за загрузку страницы это этап 0 (0/33).
        function enterPostSalahMode() {
            postSalahActive = true;
            const goalsArea = document.getElementById('mainGoalsArea');
            if (goalsArea) goalsArea.style.display = 'none';
            updatePostSalahSelectorUI();
            updatePostSalahHeaderTitle();
            updatePostSalahDisplay();
        }

        // Девиз на главной: строки делятся только по \n из i18n
        // («Воистину, поминанием Аллаха» / «утешаются сердца»). Если строка не
        // влезает по ширине экрана — уменьшаем шрифт, а не переносим её.
        (function initHeaderTitleFit() {
            const el = document.getElementById('headerTitle');
            if (!el) return;
            function fit() {
                el.style.fontSize = '';
                const avail = el.clientWidth;
                if (avail > 0 && el.scrollWidth > avail) {
                    const base = parseFloat(getComputedStyle(el).fontSize) || 16;
                    el.style.fontSize = Math.max(10, Math.floor(base * avail / el.scrollWidth * 10) / 10) + 'px';
                }
            }
            new MutationObserver(fit).observe(el, { childList: true, characterData: true, subtree: true });
            if (window.ResizeObserver && el.parentElement) new ResizeObserver(fit).observe(el.parentElement);
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit).catch(() => {});
            fit();
        })();

        function exitPostSalahMode() {
            postSalahActive = false;
            const headerTitleEl = document.getElementById('headerTitle');
            if (headerTitleEl) headerTitleEl.innerText = t('headerTitle');
            const goalsArea = document.getElementById('mainGoalsArea');
            if (goalsArea) goalsArea.style.display = '';
            updatePostSalahSelectorUI();
            updateDisplay();
        }

        // Заголовок над полоской = название ТЕКУЩЕГО этапа (Субханаллах / Альхамдулиллях / ...)
        function updatePostSalahHeaderTitle() {
            const headerTitleEl = document.getElementById('headerTitle');
            if (!headerTitleEl) return;
            const step = POST_SALAH_STEPS[postSalahStepIndex];
            const title = step ? t(step.titleKey) : '';
            headerTitleEl.innerText = title;
        }

        function updatePostSalahDisplay() {
            const step = POST_SALAH_STEPS[postSalahStepIndex];
            const stepGoal = step ? step.stepGoal : 33;
            const cd = document.getElementById('countDisplay');
            const td = document.getElementById('totalDisplay');
            const pf = document.getElementById('progressFill');
            const ib = document.getElementById('indicatorBall');
            if (cd) cd.innerText = postSalahCount;
            if (td) td.innerHTML = `/ <span>${stepGoal}</span>`;
            const progress = Math.min(postSalahCount / stepGoal, 1);
            if (pf) pf.style.strokeDashoffset = CIRCUMFERENCE - (progress * CIRCUMFERENCE);
            if (ib) {
                const ringRadius = getComputedStyle(document.documentElement).getPropertyValue('--ring-radius').trim() || '126px';
                ib.style.transform = `rotate(${progress * 360}deg) translateY(calc(${ringRadius} * -1))`;
            }
        }

        let lastPostSalahIncrementTime = 0;
        function incrementPostSalah() {
            const now = Date.now();
            if (now - lastPostSalahIncrementTime < INCREMENT_DEBOUNCE) return;
            lastPostSalahIncrementTime = now;
            vibrate();
            postSalahCount++;
            playClickSound();
            updatePostSalahDisplay();
            requestAnimationFrame(() => {
                let d = document.getElementById('countDisplay');
                if (d) { d.classList.add('pop'); setTimeout(() => d.classList.remove('pop'), 120); }
                let ring = document.querySelector('.counter-ring-wrap');
                if (ring) {
                    let plus = document.createElement('div');
                    plus.className = 'float-plus'; plus.innerText = '+1';
                    const offsetX = (Math.random() - 0.5) * 60;
                    const offsetY = 35 + Math.random() * 15;
                    plus.style.left = `calc(50% + ${offsetX}px)`;
                    plus.style.top = `${offsetY}%`;
                    plus.style.transform = `translate(-50%, -30%) translateZ(0)`;
                    ring.appendChild(plus);
                    setTimeout(() => plus.remove(), 550);
                }
            });
            const step = POST_SALAH_STEPS[postSalahStepIndex];
            const stepGoal = step ? step.stepGoal : 33;
            if (postSalahCount >= stepGoal && !_postSalahGoalShown) {
                _postSalahGoalShown = true;
                const isLastStep = postSalahStepIndex === POST_SALAH_STEPS.length - 1;
                if (isLastStep) {
                    // Все 4 этапа пройдены (33+33+33+1=100) — поздравление и выход из режима.
                    playGoalSound();
                    document.getElementById('postSalahAchieveTitle').innerText = t('completionTitle');
                    document.getElementById('postSalahAchieveName').innerText = _tPostSalah('postSalahOptionLabel');
                    document.getElementById('postSalahAchieveSub').innerText = t('completionSub');
                    document.getElementById('postSalahAchievementOverlay').classList.add('show');
                } else {
                    // Переход к следующему этапу — сразу, без поздравления, только звук клика уже сыгран.
                    postSalahStepIndex++;
                    postSalahCount = 0;
                    _postSalahGoalShown = false;
                    updatePostSalahHeaderTitle();
                    updatePostSalahDisplay();
                }
            }
        }

        function onPostSalahAchievementTap() {
            document.getElementById('postSalahAchievementOverlay').classList.remove('show');
            postSalahStepIndex = 0;
            postSalahCount = 0;
            _postSalahGoalShown = false;
            // Цель выполнена — выходим из режима и возвращаемся на обычный тасбих.
            exitPostSalahMode();
        }

        // Cached DOM refs — assigned after DOMContentLoaded
        let _elCount, _elTotal, _elProgress, _elBall;
        function initDOMCache() {
            _elCount    = document.getElementById('countDisplay');
            _elTotal    = document.getElementById('totalDisplay');
            _elProgress = document.getElementById('progressFill');
            _elBall     = document.getElementById('indicatorBall');
        }

        // ==================== SAVE & STATS ====================
        function scheduleSave() {
            if (saveTimeout) clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => { flushSave(); }, 3000);
        }
        function flushSave() {
            if (saveTimeout) clearTimeout(saveTimeout);
            saveTimeout = null;
            localStorage.setItem('azkar_settings', JSON.stringify({ ...settings, language: currentLang }));
            localStorage.setItem('azkar_count', count);
            localStorage.setItem('azkar_goal', isUnlimited ? UNLIMITED_GOAL : goal);
            localStorage.setItem('azkar_goal_baseline', goalBaseline);
            localStorage.setItem('azkar_custom_baseline', customBaseline);
            localStorage.setItem('azkar_duas', JSON.stringify(duas));
            saveDuaFolders();
            localStorage.setItem('azkar_custom_goal', customGoal);
            localStorage.setItem('azkar_special_completed', JSON.stringify(completedSpecial));
            localStorage.setItem('azkar_special_progress', JSON.stringify(specialProgress));
            localStorage.setItem('azkar_special_resume_sessions', JSON.stringify(specialResumeSessions));
            if (pendingStatsSave && _statsCache !== null) { localStorage.setItem('azkar_stats_v2', JSON.stringify(_statsCache)); pendingStatsSave = false; }
        }
        function saveDataDebounced() { scheduleSave(); pendingStatsSave = true; markDataChanged(); }

        let _statsCache = null;
        function getStats() {
            if (_statsCache === null) {
                _statsCache = JSON.parse(localStorage.getItem('azkar_stats_v2') || '{}');
            }
            return _statsCache;
        }

        // Formats a Date into a LOCAL calendar-day key (YYYY-MM-DD). Stats are
        // bucketed per local day (not UTC) so the chart and totals line up with
        // the Fajr-anchored "today" key returned by _islamicDayKey().
        function _localDayKey(d) {
            return d.getFullYear() + '-' +
                   String(d.getMonth() + 1).padStart(2, '0') + '-' +
                   String(d.getDate()).padStart(2, '0');
        }
        function _dateFromLocalDayKey(key) {
            const [y, m, d] = String(key || '').split('-').map(Number);
            if (!y || !m || !d) return new Date();
            return new Date(y, m - 1, d);
        }

        // Returns the "Islamic day" key (YYYY-MM-DD, local time) used to mark
        // special dhikrs as completed. The day rolls over at Fajr — so if the
        // user does the dhikr at, say, 23:50, midnight does not wipe it; it
        // only resets when the next Fajr arrives. If location/Fajr is not yet
        // known we fall back to local midnight (so behavior remains sensible
        // before the user grants geolocation).
        // Последнее известное время Фаджра хранится в localStorage: при запуске
        // задачи (чеклист) проверяют смену дня ещё ДО того, как модуль намазов
        // готов. Без этого ключ дня считался от полуночи и задачи сбрасывались
        // в 00:00, а не на Фаджр.
        var _fajrCacheWritten = null;
        function _islamicDayKey() {
            const now = new Date();
            let fajrH = (window.PrayerTimes && typeof window.PrayerTimes.getFajrHours === 'function')
                ? window.PrayerTimes.getFajrHours() : null;
            if (fajrH !== null && !isNaN(fajrH)) {
                if (_fajrCacheWritten !== fajrH) {
                    _fajrCacheWritten = fajrH;
                    try { localStorage.setItem('azkar_last_fajr_hours', String(fajrH)); } catch(e) {}
                }
            } else {
                try {
                    const cached = parseFloat(localStorage.getItem('azkar_last_fajr_hours'));
                    fajrH = (cached > 0 && cached < 12) ? cached : null;
                } catch(e) { fajrH = null; }
            }
            let d = now;
            if (fajrH !== null && !isNaN(fajrH)) {
                const nowH = now.getHours() + now.getMinutes()/60 + now.getSeconds()/3600;
                if (nowH < fajrH) {
                    // Before today's Fajr — still considered the previous Islamic day
                    d = new Date(now);
                    d.setDate(d.getDate() - 1);
                }
            }
            return d.getFullYear() + '-' +
                   String(d.getMonth() + 1).padStart(2, '0') + '-' +
                   String(d.getDate()).padStart(2, '0');
        }
        function recordStat(amount) {
            // The "day" rolls over at Fajr (Islamic day), not at midnight — so
            // the daily counter (and the "Today" stat) resets only when the next
            // Fajr arrives. Falls back to local midnight if Fajr is unknown.
            let today = _islamicDayKey();
            let stats = getStats();
            if (!stats[today]) stats[today] = { count: 0 };
            stats[today].count += (amount || 1);
            pendingStatsSave = true; scheduleSave();
            markDirty('stats');
            markDataChanged();
            return today;
        }

        function getAudioCtx() {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            return audioCtx;
        }

        // Тёмный режим зикра в APK: звук только в наушники, чтобы окружающие не
        // слышали. window.azkarHeadphones ставит js/native.js (true/false);
        // в браузере наушники не определить — там звук как обычно.
        function _stealthSoundBlocked() {
            return window.azkarHeadphones === false &&
                typeof window._stealthIsActive === 'function' && window._stealthIsActive();
        }
        function playClickSound() {
            if (!settings.clickSound || _stealthSoundBlocked()) return;
            try {
                const v = settings.clickSoundVolume !== undefined ? settings.clickSoundVolume : 5;
                _playClickSoundById(settings.clickSoundType || 'default', v);
            } catch (e) { console.warn('clickSound error', e); }
        }

        function playGoalSound() {
            if (!settings.sound || _stealthSoundBlocked()) return;
            try {
                const v = settings.goalSoundVolume !== undefined ? settings.goalSoundVolume : 5;
                _playGoalSoundById(settings.goalSoundType || 'default', v);
            } catch (e) { console.warn('goalSound error', e); }
            showGoalNotification();
        }

        function showGoalNotification() {
            if (!('Notification' in window)) return;
            const title = t('completionTitle');
            const body = t('completionSub');
            if (Notification.permission === 'granted') {
                try { new Notification(title, { body, icon: 'icon-192.png', badge: 'badge.png' }); } catch(e) {}
            } else if (Notification.permission === 'default') {
                Notification.requestPermission().then(perm => {
                    if (perm === 'granted') {
                        try { new Notification(title, { body, icon: 'icon-192.png', badge: 'badge.png' }); } catch(e) {}
                    }
                });
            }
        }

        // ==================== ZIKR SMART TIMER ====================
        // Секундомер: слева — текущее время с последнего нажатия (идёт),
        // справа — зафиксированный интервал предыдущего нажатия.
        // Скрывается через (зафиксированный интервал + 2 сек) после нажатия.
        // Работает на обоих экранах: основной зикр и специальные зикры.

        function _makeTimer(elId) {
            let visible = false;
            let rafId   = null;
            let hideId  = null;
            let start   = 0;
            let lastMs  = 0;   // зафиксированный интервал последнего нажатия

            function el()    { return document.getElementById(elId); }
            function curEl() { const e = el(); return e ? e.querySelector('.zt-cur') : null; }
            function avgEl() { const e = el(); return e ? e.querySelector('.zt-avg') : null; }

            function loop() {
                if (rafId === null) return;
                const e = el(); if (!e) return;
                const secs = (Date.now() - start) / 1000;
                const cur = curEl();
                if (cur) cur.textContent = secs.toFixed(1);
                rafId = requestAnimationFrame(loop);
            }

            function updateLastSpan() {
                const a = avgEl();
                if (!a) return;
                a.textContent = lastMs > 0 ? (lastMs / 1000).toFixed(1) : '–';
            }

            function show() {
                const e = el(); if (!e) return;
                if (!visible) {
                    visible = true;
                    e.style.transition = 'opacity 1s ease';
                    e.getBoundingClientRect();
                    e.style.opacity = '1';
                }
                e.classList.remove('tick');
                void e.offsetWidth;
                e.classList.add('tick');
            }

            function hide() {
                const e = el(); if (!e || !visible) return;
                visible = false;
                e.style.transition = 'opacity 1s ease';
                e.style.opacity = '0';
                if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
            }

            function scheduleHide() {
                if (hideId) clearTimeout(hideId);
                // скрываем через зафиксированный интервал + 2 сек (если нет — просто 2 сек)
                const delay = (lastMs > 0 ? lastMs : 0) + 2000;
                hideId = setTimeout(hide, delay);
            }

            function onClick() {
                // проверяем настройку
                if (settings.timerEnabled === false) { hide(); return; }

                const now = Date.now();
                if (start > 0) {
                    const interval = now - start;
                    if (interval > 100 && interval < 60000) {
                        // фиксируем именно этот интервал — без усреднения
                        lastMs = interval;
                        updateLastSpan();
                    }
                }
                start = now;
                if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
                show();
                rafId = requestAnimationFrame(loop);
                scheduleHide();
            }

            return { onClick, hide };
        }

        const _timerMain    = _makeTimer('zikrTimer');
        const _timerSpecial = _makeTimer('zikrTimerSpecial');
        // ==================== END ZIKR SMART TIMER ====================


        let _cachedRingRadius = null;
        function getRingRadius() {
            if (!_cachedRingRadius) {
                _cachedRingRadius = getComputedStyle(document.documentElement).getPropertyValue('--ring-radius').trim() || '126px';
            }
            return _cachedRingRadius;
        }
        window.addEventListener('resize', () => { _cachedRingRadius = null; }, { passive: true });

        function formatGoalShort(n) {
            if (n >= 1000000) return (n / 1000000 % 1 === 0 ? (n/1000000) : (n/1000000).toFixed(1)) + t('numSuffixM');
            if (n >= 1000)    return (n / 1000    % 1 === 0 ? (n/1000)    : (n/1000).toFixed(1))    + t('numSuffixK');
            return String(n);
        }

        function updateDisplay() {
            if (postSalahActive) { updatePostSalahDisplay(); return; }
            const newCount = count;
            const isCustomGoalActive = document.getElementById('customGoalChip') && document.getElementById('customGoalChip').classList.contains('active');
            const isStandard = !isUnlimited && !isCustomGoalActive && goal > 0;

            let dashOffset, ballAngle;
            let lapChanged = false;
            let isEvenCycle = false;
            let cycleFraction = 0;

            if (isUnlimited) {
                dashOffset = CIRCUMFERENCE;
                ballAngle = 0;
            } else if (isStandard) {
                // Для стандартных целей кольцо/шарик считаются ОТНОСИТЕЛЬНО точки
                // отсчёта (goalBaseline), которая ставится при каждом выборе цели.
                // Поэтому шарик всегда стартует с начала, а число (count) и
                // статистика идут как обычно.
                const ringCount = Math.max(0, newCount - goalBaseline);
                const lap = Math.floor(ringCount / goal);
                cycleFraction = (ringCount % goal) / goal;

                // Detect lap change (milestone hit: 33, 66, 100...)
                if (lap !== _prevLap) {
                    lapChanged = true;
                    _prevLap = lap;
                }

                ballAngle = cycleFraction * 360;
                // lap 1,3,5... = 2nd,4th,6th cycle = clockwise-emptying
                isEvenCycle = (lap % 2 === 1);

                if (!isEvenCycle) {
                    // Odd cycle (1st, 3rd, ...): ring fills clockwise behind ball
                    dashOffset = CIRCUMFERENCE - (cycleFraction * CIRCUMFERENCE);
                } else {
                    // Even cycle (2nd, 4th, ...): ring empties clockwise ahead of ball
                    // Filled arc: from ball position → 12 o'clock (clockwise)
                    // Negative dashoffset shifts arc start forward along path
                    dashOffset = -(cycleFraction * CIRCUMFERENCE);
                }
            } else {
                // «Своя цель»: один полный круг = путь от точки старта (customBaseline,
                // ставится при вводе нового числа цели и при каждом авто-продлении)
                // до цели — при любом числе (500, 1000, 10000…) это всегда ровно 100%.
                const span = goal - customBaseline;
                const progress = span > 0
                    ? Math.min(Math.max((newCount - customBaseline) / span, 0), 1)
                    : 1;
                dashOffset = CIRCUMFERENCE - (progress * CIRCUMFERENCE);
                ballAngle = progress * 360;
            }

            requestAnimationFrame(() => {
                _elCount.innerText = newCount;
                _elTotal.innerHTML = isUnlimited ? `<span>∞</span>` : `/ <span>${goal}</span>`;

                if (lapChanged || _snapRingToStart) {
                    // On lap change OR goal (re)selection: snap to cycle start instantly
                    // (no backward animation). _snapRingToStart guarantees that picking
                    // a standard goal puts the ball at the start point immediately.
                    _snapRingToStart = false;
                    _elProgress.style.transition = 'none';
                    _elBall.style.transition = 'none';
                    if (isEvenCycle) {
                        // Even cycle starts with full ring, ball at top
                        _elProgress.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
                        _elProgress.style.strokeDashoffset = '0';
                    } else {
                        // Odd cycle starts with empty ring
                        _elProgress.style.strokeDasharray = `${CIRCUMFERENCE}`;
                        _elProgress.style.strokeDashoffset = `${CIRCUMFERENCE}`;
                    }
                    _elProgress.style.transform = '';
                    _elBall.style.transform = `rotate(${ballAngle}deg) translateY(calc(${getRingRadius()} * -1))`;
                    requestAnimationFrame(() => {
                        _elProgress.style.transition = '';
                        _elBall.style.transition = '';
                    });
                } else if (isEvenCycle) {
                    // Even cycle: Pac-Man effect — ball eats the ring clockwise
                    // dasharray + dashoffset are both animated via CSS transition now,
                    // so drain is as smooth as fill — no need to suppress transitions.
                    const arcLen = CIRCUMFERENCE * (1 - cycleFraction);
                    _elProgress.style.strokeDasharray = `${arcLen} ${CIRCUMFERENCE}`;
                    _elProgress.style.strokeDashoffset = `${dashOffset}`;
                    _elProgress.style.transform = '';
                    _elBall.style.transform = `rotate(${ballAngle}deg) translateY(calc(${getRingRadius()} * -1))`;
                } else {
                    // Odd cycle: standard animated fill clockwise
                    _elProgress.style.strokeDasharray = `${CIRCUMFERENCE}`;
                    _elProgress.style.strokeDashoffset = dashOffset;
                    _elProgress.style.transform = '';
                    _elBall.style.transform = `rotate(${ballAngle}deg) translateY(calc(${getRingRadius()} * -1))`;
                }
            });
            // Update PiP counter
            if (pipMode === 'main') {
                const pipNum = document.getElementById('pipCountNum');
                if (pipNum) pipNum.textContent = newCount;
            }
            saveDataDebounced();
        }

        // Точка старта круга «своей цели» из хранилища. Если её ещё нет
        // (данные до этого обновления) — берём общую точку отсчёта.
        function _readCustomBaseline() {
            const raw = localStorage.getItem('azkar_custom_baseline');
            let v = raw === null ? goalBaseline : parseInt(raw, 10);
            if (isNaN(v) || v < 0 || v > count) v = 0;
            return v;
        }

        function setGoal(g) {
            // Стандартная цель (33/66/100): шарик ВСЕГДА начинается со старта.
            // Фиксируем точку отсчёта = текущий count, чтобы кольцо/шарик пошли с нуля.
            // При этом число (count) и статистика продолжают идти как обычно.
            isUnlimited = false; goal = g; goalTriggered = false; _prevLap = 0;
            goalBaseline = count;
            _snapRingToStart = true;
            document.querySelectorAll('.goal-chip').forEach(ch => ch.classList.remove('active'));
            if (g === 33) document.querySelector('[data-goal="33"]').classList.add('active');
            else if (g === 66) document.querySelector('[data-goal="66"]').classList.add('active');
            else if (g === 100) document.querySelector('[data-goal="100"]').classList.add('active');
            updateDisplay();
        }

        function openCustomGoalModal() {
            document.getElementById('customGoalInput').value = customGoal || 1000;
            document.getElementById('customGoalModal').classList.add('show');
            updateAutoExtendBadge();
        }
        function closeCustomGoalModal() { document.getElementById('customGoalModal').classList.remove('show'); _closeAutoExtendMenuOnce(); }

        /* ===== LONG-PRESS для «Своя цель» ===== */
        let _customPressTimer = null;
        let _hintHideTimer = null;

        function startCustomGoalPress(e) {
            e.preventDefault();
            const chip = document.getElementById('customGoalChip');
            const hint = document.getElementById('hintToast');

            // Сразу выбираем чип и устанавливаем цель (1000 по умолчанию если не задана)
            const activeGoal = customGoal || 1000;
            if (!customGoal) {
                // Первая «своя цель» — круг начинается отсюда.
                customGoal = 1000;
                customBaseline = count;
                document.getElementById('customGoalNum').innerText = formatGoalShort(1000);
                localStorage.setItem('azkar_custom_goal', 1000);
            }
            // Возврат к «своей цели» НЕ сбрасывает круг — шарик продолжает
            // с того места, где остановился (customBaseline не меняется).
            if (customBaseline > count) customBaseline = 0;
            document.querySelectorAll('.goal-chip').forEach(ch => ch.classList.remove('active'));
            chip.classList.add('active');
            isUnlimited = false;
            goal = customGoal;
            goalTriggered = false;
            updateDisplay();
            saveDataDebounced();

            // Показываем подсказку сверху
            clearTimeout(_hintHideTimer);
            hint.classList.add('show');

            // Через 1 сек — открываем модалку и скрываем подсказку
            _customPressTimer = setTimeout(() => {
                hint.classList.remove('show');
                openCustomGoalModal();
                _customPressTimer = null;
            }, 1000);
        }

        function cancelCustomGoalPress() {
            clearTimeout(_customPressTimer);
            _customPressTimer = null;

            const hint = document.getElementById('hintToast');
            // Скрываем подсказку с небольшой задержкой чтобы пользователь успел прочитать
            _hintHideTimer = setTimeout(() => hint.classList.remove('show'), 1200);
        }
        function confirmCustomGoal() {
            const val = parseInt(document.getElementById('customGoalInput').value, 10);
            if (isNaN(val) || val <= 0) { showToast(t('customGoalError')); return; }
            // Новое число цели → новый круг со старта (то же число — круг продолжается).
            const changed = val !== customGoal;
            customGoal = val;
            document.getElementById('customGoalNum').innerText = formatGoalShort(customGoal);
            document.querySelectorAll('.goal-chip').forEach(ch => ch.classList.remove('active'));
            document.getElementById('customGoalChip').classList.add('active');
            isUnlimited = false; goal = customGoal; goalTriggered = false;
            if (changed) { customBaseline = count; _snapRingToStart = true; }
            updateDisplay();
            closeCustomGoalModal();
            // toast removed
        }

        function toggleAutoExtendMenu(e) {
            e.stopPropagation();
            const badge = document.getElementById('autoExtendBadge');
            const dropdown = document.getElementById('autoExtendDropdown');
            const willOpen = !dropdown.classList.contains('open');
            dropdown.classList.toggle('open', willOpen);
            badge.classList.toggle('open', willOpen);
            if (willOpen) {
                setTimeout(() => document.addEventListener('click', _closeAutoExtendMenuOnce), 0);
            }
        }
        function _closeAutoExtendMenuOnce() {
            const dropdown = document.getElementById('autoExtendDropdown');
            const badge = document.getElementById('autoExtendBadge');
            if (dropdown) dropdown.classList.remove('open');
            if (badge) badge.classList.remove('open');
            document.removeEventListener('click', _closeAutoExtendMenuOnce);
        }
        function setAutoExtendStep(e, step) {
            e.stopPropagation();
            settings.autoExtendStep = step;
            saveDataDebounced();
            updateAutoExtendBadge();
            _closeAutoExtendMenuOnce();
        }
        function updateAutoExtendBadge() {
            const badge = document.getElementById('autoExtendBadge');
            const label = document.getElementById('autoExtendBadgeLabel');
            if (!badge || !label) return;
            const step = settings.autoExtendStep || 0;
            if (step > 0) {
                badge.classList.remove('off'); badge.classList.add('on');
                label.innerText = '+' + step;
            } else {
                badge.classList.remove('on'); badge.classList.add('off');
                label.innerText = t('autoExtendOffShort');
            }
            document.querySelectorAll('.auto-extend-option').forEach(opt => {
                opt.classList.toggle('active', parseInt(opt.dataset.step, 10) === step);
            });
        }

        function increment() {
            if (isCompletionActive) return;
            const now = Date.now();
            if (now - lastIncrementTime < INCREMENT_DEBOUNCE) return;
            lastIncrementTime = now;
            // IMPORTANT: vibrate must be called as the FIRST async-free
            // action inside the click handler, otherwise modern Chrome on
            // Android will silently ignore it (transient user-activation
            // gets consumed by other work and Web-Vibration API requires
            // the activation to still be live).
            vibrate();
            count++;
            bumpDhikrTotal('main');
            _timerMain.onClick();
            const statDay = recordStat();
            recordDhikrCloudDelta('main', statDay, true);
            playClickSound();
            updateDisplay();
            requestAnimationFrame(() => {
                let d = document.getElementById('countDisplay');
                d.classList.add('pop');
                setTimeout(() => d.classList.remove('pop'), 120);
                let ring = document.querySelector('.counter-ring-wrap');
                let plus = document.createElement('div');
                plus.className = 'float-plus'; plus.innerText = '+1';
                // Random horizontal offset for visual variety
                const offsetX = (Math.random() - 0.5) * 60;
                const offsetY = 35 + Math.random() * 15;
                plus.style.left = `calc(50% + ${offsetX}px)`;
                plus.style.top = `${offsetY}%`;
                plus.style.transform = `translate(-50%, -30%) translateZ(0)`;
                ring.appendChild(plus);
                setTimeout(() => plus.remove(), 550);
            });
            const isCustomGoalActive = document.getElementById('customGoalChip').classList.contains('active');
            const goalHit = !isUnlimited && !goalTriggered && (
                isCustomGoalActive ? count === goal : ((count - goalBaseline) > 0 && (count - goalBaseline) % goal === 0)
            );
            if (goalHit) {
                goalTriggered = true;
                playGoalSound();
                const isStealthActive = typeof window._stealthIsActive === 'function' && window._stealthIsActive();
                if (isCustomGoalActive) {
                    // Custom goal: show completion overlay (and optionally +100)
                    isCompletionActive = true;
                    // Stealth mode ("кнопка поверх всего"): не показываем карточку
                    // достижения — просто продолжаем (auto-extend/сброс внутри).
                    if (isStealthActive) {
                        // Чёткая вибрация достижения цели (отличается от тап-вибро),
                        // чтобы в тёмном режиме точно почувствовать, что цель взята.
                        vibrateAdvance();
                        closeCompletion();
                        return;
                    }
                    document.getElementById('specialAchieveTitle').innerText = t('completionTitle');
                    document.getElementById('specialAchieveName').innerText = '';
                    document.getElementById('specialAchieveSub').innerText = t('completionSub');
                    document.getElementById('completionOverlay').classList.add('show');
                } else {
                    // Standard goals (33/66/100): show achievement overlay, then continue
                    // Stealth mode: без карточки — просто продолжаем счёт.
                    if (isStealthActive) {
                        // Чёткая вибрация достижения цели (отличается от тап-вибро).
                        vibrateAdvance();
                        goalTriggered = false;
                        updateDisplay();
                        return;
                    }
                    // Show achievement overlay — identical to special dhikrs
                    document.getElementById('specialAchieveTitle').innerText = t('completionTitle');
                    document.getElementById('specialAchieveName').innerText = '';
                    document.getElementById('specialAchieveSub').innerText = t('completionSub');
                    window._azkarMilestoneActive = true;
                    document.getElementById('completionOverlay').classList.add('show');
                }
            }

            // ─── ФОНОВОЕ АВТО-ПРОДЛЕНИЕ «СВОЕЙ ЦЕЛИ» ─────────────────────────
            // Если у «своей цели» включён шаг, её порог срабатывает по общему
            // счёту (count) ДАЖЕ когда сейчас активна другая цель (33/66/100).
            const _aeStep = settings.autoExtendStep || 0;
            if (_aeStep > 0 && !isUnlimited && !isCustomGoalActive &&
                customGoal > 0 && count >= customGoal) {
                // Поднимаем порог своей цели выше текущего счёта выбранным шагом.
                do { customGoal += _aeStep; } while (customGoal <= count);
                // Новый круг своей цели начинается с последнего взятого порога.
                customBaseline = customGoal - _aeStep;
                localStorage.setItem('azkar_custom_goal', customGoal);
                const _cgNum = document.getElementById('customGoalNum');
                if (_cgNum) _cgNum.innerText = formatGoalShort(customGoal);
                playGoalSound();
                showToast('+' + _aeStep);
                saveDataDebounced();
            }
        }

        // ==================== MANUAL ADD (зикр, сделанный без приложения) ====================
        // Позволяет добавить пачку зикров одним числом (например, если считали
        // отдельно, пока телефон заряжался), так, будто пользователь всё это
        // время тапал по одному: счётчик, dhikrTotals, дневная статистика,
        // облачная синхронизация и цели обновляются ровно так же, как при N
        // обычных нажатиях increment().
        //
        // Открывается долгим удержанием (long-press) самого кольца счётчика —
        // по тому же принципу, что и long-press на чипе «Своя цель» — чтобы
        // не занимать место отдельной кнопкой на экране.
        let _manualAddPressTimer = null;
        let _manualAddTriggered = false;
        const MANUAL_ADD_PRESS_MS = 1000;

        function startManualAddPress(e) {
            if (postSalahActive) return;
            _manualAddTriggered = false;
            clearTimeout(_manualAddPressTimer);
            _manualAddPressTimer = setTimeout(() => {
                _manualAddTriggered = true;
                _manualAddPressTimer = null;
                if (navigator.vibrate) { try { navigator.vibrate(15); } catch(err) {} }
                promptManualAdd();
            }, MANUAL_ADD_PRESS_MS);
        }
        function cancelManualAddPress() {
            clearTimeout(_manualAddPressTimer);
            _manualAddPressTimer = null;
        }
        // Обычный клик по кольцу — но только если это НЕ был long-press
        // (иначе после открытия модалки ещё и засчитался бы обычный тап).
        function handleRingClick(e) {
            if (_manualAddTriggered) {
                _manualAddTriggered = false;
                return;
            }
            if (postSalahActive) { incrementPostSalah(); return; }
            increment();
        }

        // 'add' | 'subtract' — режим кнопки над полем ввода. Сбрасывается
        // на 'add' при каждом открытии оверлея.
        let manualAddMode = 'add';

        function toggleManualAddMode() {
            manualAddMode = (manualAddMode === 'add') ? 'subtract' : 'add';
            _applyManualAddModeUI();
            if (navigator.vibrate) { try { navigator.vibrate(10); } catch(err) {} }
        }
        function _applyManualAddModeUI() {
            const btn = document.getElementById('manualAddModeBtn');
            const confirmBtn = document.getElementById('btnConfirmManualAdd');
            if (manualAddMode === 'subtract') {
                btn.classList.add('subtract');
                btn.innerText = '-100';
                btn.setAttribute('aria-label', t('manualAddModeSubtractAria'));
                confirmBtn.innerText = t('manualAddConfirmSubtract');
            } else {
                btn.classList.remove('subtract');
                btn.innerText = '+100';
                btn.setAttribute('aria-label', t('manualAddModeAddAria'));
                confirmBtn.innerText = t('manualAddConfirm');
            }
        }

        function promptManualAdd() {
            const input = document.getElementById('manualAddInput');
            input.value = '';
            manualAddMode = 'add';
            _applyManualAddModeUI();
            document.getElementById('manualAddOverlay').classList.add('show');
            // Поле ввода намеренно НЕ получает автофокус при открытии —
            // клавиатура не должна выскакивать сама; пользователь сам
            // тапнет по полю, когда будет готов ввести число.
        }
        function cancelManualAdd() {
            document.getElementById('manualAddOverlay').classList.remove('show');
        }
        function confirmManualAdd() {
            const input = document.getElementById('manualAddInput');
            const n = Math.floor(Number(input.value));
            if (!n || n <= 0) {
                input.focus();
                return;
            }
            const amount = Math.min(n, 100000);
            document.getElementById('manualAddOverlay').classList.remove('show');
            if (manualAddMode === 'subtract') {
                subtractManualDhikr(amount);
            } else {
                addManualDhikr(amount);
            }
        }
        // Отнимает ранее добавленное количество зикров — та же дельта, что и
        // addManualDhikr, только с обратным знаком. Не уводит счётчик и
        // статистику ниже нуля.
        function subtractManualDhikr(amount) {
            if (isCompletionActive) return;
            if (!amount || amount <= 0) return;

            const applied = Math.min(amount, count);
            if (applied <= 0) { showToast('0'); return; }

            // 1) Общий счётчик.
            count -= applied;

            // 2) Накопленная статистика по основному зикру — не ниже нуля.
            const prevMainTotal = dhikrTotals['main'] || 0;
            dhikrTotals['main'] = Math.max(0, prevMainTotal - applied);
            const totalApplied = prevMainTotal - dhikrTotals['main'];
            saveDhikrTotals();

            // 3) Дневная статистика (тот же Fajr-anchored день) — не ниже нуля.
            const statDay = _islamicDayKey();
            const stats = getStats();
            let statApplied = 0;
            if (stats[statDay]) {
                const prevDay = stats[statDay].count || 0;
                stats[statDay].count = Math.max(0, prevDay - applied);
                statApplied = prevDay - stats[statDay].count;
            }
            pendingStatsSave = true; scheduleSave();
            markDirty('stats');
            markDataChanged();

            // 4) Облачная синхронизация — ровно то, что отняли здесь, со знаком минус.
            const cloudParts = { main: -applied, totals: {}, stats: {} };
            if (totalApplied) cloudParts.totals.main = -totalApplied;
            if (statApplied) cloudParts.stats[statDay] = -statApplied;
            recordDhikrCloudDeltaParts(cloudParts);

            // Если счёт опустился ниже цели — разрешаем достижению сработать
            // снова при следующем пересечении порога обычными тапами.
            if (!isUnlimited && goal > 0 && count < goal) {
                goalTriggered = false;
            }

            updateDisplay();
            showToast('-' + applied);
            saveDataDebounced();
        }
        function addManualDhikr(amount) {
            if (isCompletionActive) return;
            if (!amount || amount <= 0) return;

            // 1) Общий счётчик — как N обычных инкрементов.
            count += amount;

            // 2) Накопленная статистика по основному зикру (карточка "Всего зикров").
            bumpDhikrTotal('main', amount);

            // 3) Дневная статистика (тот же Fajr-anchored день, что и у обычных тапов).
            const statDay = recordStat(amount);

            // 4) Облачная синхронизация — тот же дельта-механизм, что и у обычных тапов.
            recordDhikrCloudDelta('main', statDay, true, amount);

            updateDisplay();
            showToast('+' + amount);

            // 5) Логика целей: проверяем, не пересекли ли мы порог цели этой пачкой,
            // так же, как если бы шли по одному тапу — если пересекли, показываем
            // достижение один раз (не N раз подряд), затем продолжаем счёт с той
            // же позиции, что была бы после N реальных тапов.
            const isCustomGoalActive = document.getElementById('customGoalChip').classList.contains('active');
            let crossedGoal = false;
            if (!isUnlimited && !goalTriggered && goal > 0) {
                if (isCustomGoalActive) {
                    crossedGoal = count >= goal;
                } else {
                    const prevCount = count - amount;
                    crossedGoal = Math.floor((count - goalBaseline) / goal) > Math.floor((prevCount - goalBaseline) / goal);
                }
            }

            if (crossedGoal) {
                goalTriggered = true;
                const isStealthActive = typeof window._stealthIsActive === 'function' && window._stealthIsActive();
                if (isStealthActive) {
                    // Тёмный режим: без карточки достижения — просто продолжаем.
                    vibrateAdvance();
                    if (isCustomGoalActive) {
                        isCompletionActive = true;
                        closeCompletion();
                    } else {
                        window._azkarMilestoneActive = true;
                        goalTriggered = false;
                        updateDisplay();
                    }
                } else {
                    playGoalSound();
                    document.getElementById('specialAchieveTitle').innerText = t('completionTitle');
                    document.getElementById('specialAchieveName').innerText = '';
                    document.getElementById('specialAchieveSub').innerText = t('completionSub');
                    if (isCustomGoalActive) {
                        isCompletionActive = true;
                        document.getElementById('completionOverlay').classList.add('show');
                    } else {
                        window._azkarMilestoneActive = true;
                        document.getElementById('completionOverlay').classList.add('show');
                    }
                }
            }

            // ─── ФОНОВОЕ АВТО-ПРОДЛЕНИЕ «СВОЕЙ ЦЕЛИ» ─────────────────────────
            // Аналогично increment(): если у «своей цели» включён шаг, её порог
            // срабатывает по общему счёту (count), даже когда сейчас активна
            // другая цель (33/66/100).
            const _aeStep = settings.autoExtendStep || 0;
            if (_aeStep > 0 && !isUnlimited && !isCustomGoalActive &&
                customGoal > 0 && count >= customGoal && !crossedGoal) {
                do { customGoal += _aeStep; } while (customGoal <= count);
                // Новый круг своей цели начинается с последнего взятого порога.
                customBaseline = customGoal - _aeStep;
                localStorage.setItem('azkar_custom_goal', customGoal);
                const _cgNum = document.getElementById('customGoalNum');
                if (_cgNum) _cgNum.innerText = formatGoalShort(customGoal);
                playGoalSound();
                showToast('+' + _aeStep);
            }

            saveDataDebounced();
        }

        function promptResetCounter() { document.getElementById('resetCounterOverlay').classList.add('show'); }
        function confirmResetCounter() {
            count = 0; goalTriggered = false; _prevLap = 0; goalBaseline = 0; customBaseline = 0;
            updateDisplay(); saveDataDebounced(); flushSave();
            replaceFirebaseDhikrState(['azkar_count']);
            showToast(t('toastReset'));
            document.getElementById('resetCounterOverlay').classList.remove('show');
        }
        function cancelResetCounter() { document.getElementById('resetCounterOverlay').classList.remove('show'); }
        function closeCompletion() {
            // Milestone (33/66/100): just continue counting
            if (window._azkarMilestoneActive) {
                window._azkarMilestoneActive = false;
                document.getElementById('completionOverlay').classList.remove('show');
                goalTriggered = false;
                updateDisplay();
                return;
            }
            document.getElementById('completionOverlay').classList.remove('show');
            if (isSpecialActive) {
                completeSpecialDhikr();
            } else {
                isCompletionActive = false;
                // Auto-extend by the selected step (only for custom goal)
                const isCustomGoalActive = document.getElementById('customGoalChip').classList.contains('active');
                const _aeStep2 = settings.autoExtendStep || 0;
                if (_aeStep2 > 0 && !isUnlimited && isCustomGoalActive) {
                    // Каждое продление (+100, +500…) — новый полный круг:
                    // старт = достигнутая цель, финиш = цель + шаг.
                    customBaseline = goal;
                    _snapRingToStart = true;
                    goal += _aeStep2;
                    customGoal = goal;
                    goalTriggered = false;
                    localStorage.setItem('azkar_custom_goal', customGoal);
                    document.getElementById('customGoalNum').innerText = formatGoalShort(customGoal);
                    document.querySelectorAll('.goal-chip').forEach(ch => ch.classList.remove('active'));
                    document.getElementById('customGoalChip').classList.add('active');
                    updateDisplay();
                    saveDataDebounced();
                    showToast('+' + _aeStep2);
                }
            }
        }

        // ==================== SPECIAL DHIKRS ====================
        function _createSpecialCard(dhikr, index) {
            const today = _islamicDayKey();
            const card = document.createElement('div');
            const done = completedSpecial[dhikr.id] === today;
            card.className = 'special-card editable' + (done ? ' completed' : '');
            const name = getSpecialName(dhikr);
            const text = getSpecialText(dhikr);
            const desc = getSpecialDesc(dhikr);
            card.innerHTML = `
                <div class="special-drag-handle" title="${t('titleDrag')}"><svg viewBox="0 0 24 24"><circle cx="9" cy="5" r="1.2" fill="currentColor"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="9" cy="19" r="1.2" fill="currentColor"/><circle cx="15" cy="5" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="19" r="1.2" fill="currentColor"/></svg></div>
                <div class="special-card-body">
                    <div class="special-card-name">${name}</div>
                    ${text ? `<div class="special-card-text">${text}</div>` : ''}
                    ${desc ? `<div class="special-card-desc">${desc}</div>` : ''}
                </div>
                <div class="special-card-controls">
                    <button class="special-action-btn" data-id="${dhikr.id}" data-action="edit" title="${escAttr(t('titleEdit'))}">
                        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="special-action-btn del" data-id="${dhikr.id}" data-action="del" title="${escAttr(t('titleDelete'))}">
                        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                </div>
            `;
            card.addEventListener('click', e => {
                const btn = e.target.closest('[data-action]');
                if (btn) {
                    e.stopPropagation();
                    if (btn.dataset.action === 'edit') openSpecialEditModal(btn.dataset.id);
                    else if (btn.dataset.action === 'del') promptDeleteSpecialDhikr(btn.dataset.id);
                    return;
                }
                if (!e.target.closest('.special-drag-handle')) openSpecialDetail(dhikr);
            });
            if (typeof index === 'number') initSpecialDrag(card, index);
            return card;
        }

        function renderSpecialList() {
            const container = document.getElementById('specialListContainer');
            if (!container) return;
            container.innerHTML = '';
            const frag = document.createDocumentFragment();

            // Collect dhikr IDs that belong to any folder
            const inFolderIds = new Set();
            specialFolders.forEach(folder => folder.dhikrIds.forEach(id => inFolderIds.add(id)));

            // Render folders first
            const _todaySpecial = _islamicDayKey();
            specialFolders.forEach((folder, f) => {
                const folderDhikrs = folder.dhikrIds.map(id => specialDhikrs.find(d => d.id === id)).filter(Boolean);
                const allDone = folderDhikrs.length > 0 && folderDhikrs.every(d => completedSpecial[d.id] === _todaySpecial);
                const folderDiv = document.createElement('div');
                const isOpen = openSpecialFolderIdx === f;
                folderDiv.className = 'cl-folder dua-folder acc-folder' + (allDone ? ' special-folder-done' : '') + (isOpen ? ' acc-open' : '');
                folderDiv.id = 'specialFolder' + f;
                folderDiv.innerHTML = `
                    <div class="cl-folder-header" onclick="toggleSpecialFolder(${f})">
                        <div class="cl-folder-left">
                            <div class="cl-folder-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                            </div>
                            <div class="cl-folder-info">
                                <div class="cl-folder-name">${escHtml(folder.name)}</div>
                                <div class="cl-folder-progress-text">${folderDhikrs.filter(d => completedSpecial[d.id] === _todaySpecial).length}/${folderDhikrs.length}</div>
                            </div>
                        </div>
                        <div class="cl-folder-right">
                            <button class="cl-folder-add-sub" onclick="event.stopPropagation();openSpecialAddInFolder(${f})" title="${escAttr(t('addTaskBtn'))}">
                                <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                            </button>
                            <button class="cl-folder-edit" onclick="event.stopPropagation();renameSpecialFolder(${f})" title="${escAttr(t('titleRenameFolder'))}">
                                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button class="cl-folder-delete" onclick="event.stopPropagation();deleteSpecialFolder(${f})" title="${escAttr(t('titleDeleteFolder'))}">
                                <svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                            </button>
                            <svg class="cl-folder-chevron" id="specialFolderChevron${f}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                    </div>
                    <div class="cl-folder-body" id="specialFolderBody${f}">
                        <div class="dua-folder-list-wrap">
                            <div class="dua-list dua-folder-list" id="specialFolderList${f}"></div>
                        </div>
                    </div>`;
                frag.appendChild(folderDiv);

                const listEl = folderDiv.querySelector('#specialFolderList' + f);
                if (listEl && folderDhikrs.length > 0) {
                    folderDhikrs.forEach(dhikr => listEl.appendChild(_createSpecialCard(dhikr)));
                } else if (listEl) {
                    listEl.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text-dim);font-size:0.8rem;">${t('emptyFolder')}</div>`;
                }
            });

            // Render unfolderd dhikrs
            specialDhikrs.forEach((dhikr, index) => {
                if (inFolderIds.has(dhikr.id)) return;
                frag.appendChild(_createSpecialCard(dhikr, index));
            });

            container.appendChild(frag);
        }

        function toggleSpecialFolder(idx) {
            const folderDiv = document.getElementById('specialFolder' + idx);
            if (!folderDiv) return;
            const isOpen = folderDiv.classList.contains('acc-open');
            // Close all special folders (accordion)
            specialFolders.forEach((_, i) => {
                const fd = document.getElementById('specialFolder' + i);
                if (fd) fd.classList.remove('acc-open');
            });
            // If was closed — open it
            if (!isOpen) {
                folderDiv.classList.add('acc-open');
                openSpecialFolderIdx = idx;
            } else {
                openSpecialFolderIdx = null;
            }
        }

        function renameSpecialFolder(idx) {
            if (!specialFolders[idx]) return;
            _renameFolderType = 'special';
            _renameFolderIdx = idx;
            const input = document.getElementById('renameFolderInput');
            const title = document.getElementById('renameFolderTitle');
            const confirmBtn = document.getElementById('renameFolderConfirmBtn');
            if (title) title.textContent = t('renameFolderTitle');
            if (confirmBtn) confirmBtn.textContent = t('btnSaveDua');
            if (input) { input.placeholder = t('placeholderFolderName'); input.value = specialFolders[idx].name || ''; }
            setRenameTaskDailyVisible(false);
            document.getElementById('renameFolderOverlay').classList.add('show');
        }

        let _deleteSpecialFolderIdx = null;
        function deleteSpecialFolder(idx) {
            const folder = specialFolders[idx];
            if (!folder) return;
            _deleteSpecialFolderIdx = idx;
            const titleEl = document.getElementById('deleteSpecialFolderTitle');
            const subEl = document.getElementById('deleteSpecialFolderSub');
            if (titleEl) titleEl.textContent = t('deleteFolderTitle');
            if (subEl) subEl.textContent = t('deleteDuaFolderSub');
            document.getElementById('deleteSpecialFolderOverlay').classList.add('show');
        }
        function confirmDeleteSpecialFolder() {
            if (_deleteSpecialFolderIdx === null) return;
            specialFolders.splice(_deleteSpecialFolderIdx, 1);
            _deleteSpecialFolderIdx = null;
            saveSpecialFolders();
            renderSpecialList();
            document.getElementById('deleteSpecialFolderOverlay').classList.remove('show');
        }
        function cancelDeleteSpecialFolder() {
            _deleteSpecialFolderIdx = null;
            document.getElementById('deleteSpecialFolderOverlay').classList.remove('show');
        }

        function openSpecialDetail(dhikr) {
            const card = document.getElementById('specialDetailCard');
            const name = getSpecialName(dhikr);
            const text = getSpecialText(dhikr);
            const desc = getSpecialDesc(dhikr);
            const detail = getSpecialDetail(dhikr);
            // Страница 1 — как обычно: название, текст, описание, кнопка «Начать»
            const page1 = `
                <div class="detail-title">${name}</div>
                ${text ? `<div class="detail-text">${text}</div>` : ''}
                ${desc ? `<div class="detail-desc">${desc}</div>` : ''}
                <button class="special-start-btn" onclick="startSpecialDhikr('${dhikr.id}')">${t('specialStartBtn')}</button>`;
            // Страница 2 — «Подробнее»: расширенное описание (без кнопки «Начать»).
            // Показывается только если оно заполнено.
            const page2 = detail ? `
                <div class="detail-more-label">${t('detailMoreLabel')}</div>
                <div class="detail-desc">${detail}</div>` : '';
            _renderDetailPager(card, [page1, page2]);
            document.getElementById('specialDetailOverlay').classList.add('show');
        }

        function closeSpecialDetail() {
            document.getElementById('specialDetailOverlay').classList.remove('show');
        }

        function startSpecialDhikr(id) {
            closeSpecialDetail();
            if (shouldOfferSpecialResume(id)) {
                showSpecialResume(id);
                return;
            }
            openSpecialDhikrCounter(id);
        }

        function openSpecialDhikrCounter(id, resumedCount) {
            // Если активен режим "Зикр после намаза" — выходим из него, чтобы
            // не оставлять #countDisplay/#progressFill в рассинхронизированном
            // состоянии при возврате на главный экран.
            if (typeof postSalahActive !== 'undefined' && postSalahActive) {
                postSalahActive = false;
                const _hdrEl = document.getElementById('headerTitle');
                if (_hdrEl) _hdrEl.innerText = t('headerTitle');
                const _goalsEl = document.getElementById('mainGoalsArea');
                if (_goalsEl) _goalsEl.style.display = '';
                if (typeof updatePostSalahSelectorUI === 'function') updatePostSalahSelectorUI();
            }
            currentSpecialId = id;
            lastActiveSpecialId = id;
            _swipeSpecialId = id;
            localStorage.setItem('azkar_last_special_id', id);
            specialCount = resumedCount === undefined ? (specialProgress[id] || 0) : resumedCount;
            isSpecialActive = true;
            _specialGoalShown = (specialCount >= (specialDhikrs.find(d => d.id === id)?.goal || 100));
            const dhikr = specialDhikrs.find(d => d.id === id);
            specialGoal = dhikr ? (dhikr.goal || 100) : 100;
            document.getElementById('specialCounterName').innerText = dhikr ? getSpecialName(dhikr) : '';
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById('screen-special-counter').classList.add('active');
            const specialFab = document.getElementById('specialAddFab');
            if (specialFab) specialFab.style.display = 'none';
            const duaFab = document.getElementById('duaAddFab');
            if (duaFab) duaFab.style.display = 'none';
            pipMode = 'special';
            updatePipCounter();
            // Обновляем отображение цели
            document.getElementById('specialTotalDisplay').innerHTML = `/ <span>${specialGoal}</span>`;
            // Меняем SVG-текст в центре: для салавата ﷺ, для остальных الله
            const specialCenterText = document.getElementById('specialCenterText');
            if (specialCenterText) {
                if (id === 'salavat' || id === 'sleep_salavat_seal') {
                    specialCenterText.textContent = 'ﷺ';
                    specialCenterText.setAttribute('font-size', '36');
                    specialCenterText.setAttribute('y', '44');
                } else {
                    specialCenterText.textContent = 'الله';
                    specialCenterText.setAttribute('font-size', '36');
                    specialCenterText.setAttribute('y', '44');
                }
            }
            updateSpecialDisplay();
            // Stealth mode: activate if enabled
            try {
                document.dispatchEvent(new CustomEvent('_screenChanged', { detail: 'screen-special-counter' }));
                if (typeof window._stealthTryActivate === 'function') window._stealthTryActivate('screen-special-counter');
            } catch(e) {}
        }

        function updateSpecialDisplay() {
            document.getElementById('specialCountDisplay').innerText = specialCount;
            let progress = Math.min(specialCount / specialGoal, 1);
            document.getElementById('specialProgressFill').style.strokeDashoffset = CIRCUMFERENCE - (progress * CIRCUMFERENCE);
            const ringRadius = getComputedStyle(document.documentElement).getPropertyValue('--ring-radius').trim() || '126px';
            document.getElementById('specialIndicatorBall').style.transform = `rotate(${progress * 360}deg) translateY(calc(${ringRadius} * -1))`;
            // Update PiP counter if in special mode
            if (pipMode === 'special') {
                const pipNum = document.getElementById('pipCountNum');
                if (pipNum) pipNum.textContent = specialCount;
                const pipLabel = document.getElementById('pipCountLabel');
                if (pipLabel) pipLabel.textContent = specialGoal ? '/ ' + specialGoal : '';
            }
            if (currentSpecialId) {
                specialProgress[currentSpecialId] = specialCount;
                saveDataDebounced();
            }
        }

        function updateSpecialResumeSession(id) {
            const dhikr = specialDhikrs.find(d => d.id === id);
            const goal = dhikr ? (dhikr.goal || 100) : 100;
            if (specialCount > 0 && specialCount < goal) {
                specialResumeSessions[id] = { count: specialCount, day: _localDayKey(new Date()) };
            } else {
                delete specialResumeSessions[id];
            }
            localStorage.setItem('azkar_special_resume_sessions', JSON.stringify(specialResumeSessions));
        }

        function shouldOfferSpecialResume(id) {
            const session = specialResumeSessions[id];
            const dhikr = specialDhikrs.find(d => d.id === id);
            if (!session || session.chosen || !dhikr || !Number.isFinite(session.count) || session.count <= 0 || session.count >= (dhikr.goal || 100)) return false;
            return typeof session.day === 'string' && session.day < _localDayKey(new Date());
        }

        function showSpecialResume(id) {
            const overlay = document.getElementById('specialResumeOverlay');
            overlay.dataset.specialId = id;
            document.getElementById('specialResumeTitle').textContent = t('specialResumeTitle');
            document.getElementById('specialResumeContinueBtn').textContent = t('specialResumeContinue');
            document.getElementById('specialResumeStartOverBtn').textContent = t('specialResumeStartOver');
            overlay.classList.add('show');
        }

        function continueSpecialResume() {
            const overlay = document.getElementById('specialResumeOverlay');
            const id = overlay.dataset.specialId;
            const session = specialResumeSessions[id];
            overlay.classList.remove('show');
            if (!id || !session) return;
            specialResumeSessions[id] = { ...session, chosen: true };
            localStorage.setItem('azkar_special_resume_sessions', JSON.stringify(specialResumeSessions));
            specialProgress[id] = session.count;
            openSpecialDhikrCounter(id, session.count);
        }

        function startSpecialResumeOver() {
            const overlay = document.getElementById('specialResumeOverlay');
            const id = overlay.dataset.specialId;
            overlay.classList.remove('show');
            if (!id) return;
            delete specialResumeSessions[id];
            specialProgress[id] = 0;
            localStorage.setItem('azkar_special_resume_sessions', JSON.stringify(specialResumeSessions));
            localStorage.setItem('azkar_special_progress', JSON.stringify(specialProgress));
            openSpecialDhikrCounter(id, 0);
        }

        let _specialGoalShown = false;
        function incrementSpecial() {
            const now = Date.now();
            if (now - lastSpecialIncrementTime < INCREMENT_DEBOUNCE) return;
            lastSpecialIncrementTime = now;
            vibrate();
            specialCount++;
            if (currentSpecialId) {
                updateSpecialResumeSession(currentSpecialId);
                bumpDhikrTotal(currentSpecialId);
                recordDhikrCloudDelta(currentSpecialId, null, false);
            }
            _timerSpecial.onClick();
            playClickSound();
            updateSpecialDisplay();
            requestAnimationFrame(() => {
                let d = document.getElementById('specialCountDisplay');
                d.classList.add('pop');
                setTimeout(() => d.classList.remove('pop'), 120);
                let ring = document.querySelector('#screen-special-counter .counter-ring-wrap');
                let plus = document.createElement('div');
                plus.className = 'float-plus';
                plus.innerText = '+1';
                plus.style.left = '50%';
                plus.style.top = '40%';
                plus.style.transform = 'translate(-50%, -30%) translateZ(0)';
                ring.appendChild(plus);
                setTimeout(() => plus.remove(), 550);
            });
            if (specialCount === specialGoal && !_specialGoalShown) {
                _specialGoalShown = true;
                playGoalSound();
                const dhikr = specialDhikrs.find(d => d.id === currentSpecialId);
                const name = dhikr ? getSpecialName(dhikr) : '';
                document.getElementById('specialAchieveTitle').innerText = t('completionTitle');
                document.getElementById('specialAchieveName').innerText = name;
                document.getElementById('specialAchieveSub').innerText = t('completionSub');
                if (typeof window._stealthIsActive === 'function' && window._stealthIsActive()) {
                    vibrateAdvance();
                    onSpecialAchievementTap();
                    return;
                }
                const co = document.getElementById('completionOverlay');
                if (co) co.onclick = onSpecialAchievementTap;
                document.getElementById('completionOverlay').classList.add('show');
            }
        }

        function completeSpecialDhikr() {
            if (currentSpecialId) {
                const today = _islamicDayKey();
                completedSpecial[currentSpecialId] = today;
                delete specialResumeSessions[currentSpecialId];
                
                const folderIdx = specialFolders.findIndex(folder => folder.dhikrIds.includes(currentSpecialId));
                if (folderIdx !== -1) {
                    openSpecialFolderIdx = folderIdx;
                }

                saveDataDebounced();
                markDirty('stats');
                renderSpecialList(); _dirty.special = false;
                renderStats(); _dirty.stats = false;
            }
            isSpecialActive = false;
            _specialGoalShown = false;
            specialCount = 0;
            currentSpecialId = null;
            // Зикр завершён — сбрасываем, чтобы свайп открывал список
            lastActiveSpecialId = null;
            localStorage.removeItem('azkar_last_special_id');
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById('screen-special-list').classList.add('active');
            const specialFab = document.getElementById('specialAddFab');
            if (specialFab) specialFab.style.display = '';
            pipMode = 'main';
            updatePipCounter();
            try { if (typeof window._stealthDeactivate === 'function') window._stealthDeactivate(); } catch(e) {}
        }

        // Tap anywhere on special achievement overlay → go to next dhikr (no countdown)
        function onSpecialAchievementTap() {
            // Скрываем карточку достижения
            document.getElementById('completionOverlay').classList.remove('show');
            // If triggered by custom goal — call closeCompletion (handles +100 logic)
            if (window._azkarCustomGoalActive) {
                window._azkarCustomGoalActive = false;
                closeCompletion();
                return;
            }
            // If this was triggered by an azkar milestone (33/66/100), just continue counting
            if (window._azkarMilestoneActive) {
                window._azkarMilestoneActive = false;
                goalTriggered = false;
                updateDisplay();
                return;
            }
            // Find next dhikr
            const curIdx = specialDhikrs.findIndex(d => d.id === currentSpecialId);
            // Mark current as completed first
            if (currentSpecialId) {
                const today = _islamicDayKey();
                completedSpecial[currentSpecialId] = today;
                delete specialResumeSessions[currentSpecialId];
                
                const folderIdx = specialFolders.findIndex(folder => folder.dhikrIds.includes(currentSpecialId));
                if (folderIdx !== -1) {
                    openSpecialFolderIdx = folderIdx;
                }

                saveDataDebounced();
                markDirty('stats');
                renderSpecialList(); _dirty.special = false;
                renderStats(); _dirty.stats = false;
            }
            isSpecialActive = false;
            _specialGoalShown = false;
            const prevId = currentSpecialId;
            specialCount = 0;
            currentSpecialId = null;
            lastActiveSpecialId = null;
            localStorage.removeItem('azkar_last_special_id');
            // Go to next incomplete dhikr if available (only if autoAdvance is enabled)
            const today = _islamicDayKey();
            let nextDhikr = null;
            if (settings.autoAdvance && curIdx >= 0) {
                for (let i = curIdx + 1; i < specialDhikrs.length; i++) {
                    if (completedSpecial[specialDhikrs[i].id] !== today) {
                        nextDhikr = specialDhikrs[i];
                        break;
                    }
                }
            }
            if (nextDhikr) {
                // Start next dhikr directly without any countdown
                currentSpecialId = nextDhikr.id;
                lastActiveSpecialId = nextDhikr.id;
                isSpecialActive = true;
                localStorage.setItem('azkar_last_special_id', nextDhikr.id);
                specialCount = specialProgress[nextDhikr.id] || 0;
                specialGoal = nextDhikr.goal || 100;
                document.getElementById('specialCounterName').innerText = getSpecialName(nextDhikr);
                document.getElementById('specialTotalDisplay').innerHTML = `/ <span>${specialGoal}</span>`;
                const specialCenterText = document.getElementById('specialCenterText');
                if (specialCenterText) {
                    if (nextDhikr.id === 'salavat' || nextDhikr.id === 'sleep_salavat_seal') {
                        specialCenterText.textContent = 'ﷺ';
                        specialCenterText.setAttribute('font-size', '36');
                        specialCenterText.setAttribute('y', '44');
                    } else {
                        specialCenterText.textContent = 'الله';
                        specialCenterText.setAttribute('font-size', '36');
                        specialCenterText.setAttribute('y', '44');
                    }
                }
                pipMode = 'special';
                updatePipCounter();
                updateSpecialDisplay();
            } else {
                // No next dhikr — go back to list
                document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
                document.getElementById('screen-special-list').classList.add('active');
                const specialFab = document.getElementById('specialAddFab');
                if (specialFab) specialFab.style.display = '';
                pipMode = 'main';
                updatePipCounter();
                const co = document.getElementById('completionOverlay');
                if (co) co.onclick = closeCompletion;
                try { if (typeof window._stealthDeactivate === 'function') window._stealthDeactivate(); } catch(e) {}
            }
        }

        // Сброс специальных зикров на Фаджр:
        // - completedSpecial: удаляем пометки прошлых дней
        // - specialProgress: сбрасываем незавершённый прогресс только при смене исламского дня
        function pruneCompletedSpecial() {
            const today = _islamicDayKey();
            let changed = false;
            Object.keys(completedSpecial).forEach(id => {
                if (completedSpecial[id] !== today) {
                    delete completedSpecial[id];
                    changed = true;
                }
            });
            // Сбрасываем незавершённый прогресс только при смене дня (Фаджр),
            // а не при каждом открытии приложения — иначе прогресс того же дня теряется.
            // Если ключа дня ещё нет, это старый формат данных: считаем сохранённые
            // цифры устаревшими, чтобы застрявший прогресс не жил неделями.
            const progressDay = localStorage.getItem('azkar_special_progress_day');
            if (progressDay !== today) {
                specialProgress = {};
                if (currentSpecialId) {
                    specialCount = 0;
                    _specialGoalShown = false;
                    try { updateSpecialDisplay(); } catch(e) {}
                }
                lastActiveSpecialId = null;
                _swipeSpecialId = null;
                localStorage.removeItem('azkar_last_special_id');
                changed = true;
            }
            // Всегда обновляем ключ дня прогресса
            localStorage.setItem('azkar_special_progress_day', today);
            if (changed) {
                // ВАЖНО: пишем очищенные данные в localStorage СРАЗУ (синхронно),
                // а не только через debounce (saveDataDebounced ждёт 3 сек).
                // Иначе при быстром закрытии приложения после смены дня маркер
                // дня уже обновится, а старый незавершённый прогресс останется
                // на диске и "застрянет" навсегда — баг, который мы чиним.
                localStorage.setItem('azkar_special_completed', JSON.stringify(completedSpecial));
                localStorage.setItem('azkar_special_progress', JSON.stringify(specialProgress));
                saveDataDebounced();
            }
        }

        function goBackFromSpecialCounter() {
            if (currentSpecialId) {
                specialProgress[currentSpecialId] = specialCount;
                saveDataDebounced();
            }
            isSpecialActive = false;
            specialCount = 0;
            currentSpecialId = null;
            // Нажата кнопка "Назад" — явно сбрасываем, свайп откроет список
            lastActiveSpecialId = null;
            _swipeSpecialId = null;
            localStorage.removeItem('azkar_last_special_id');
            // Скрываем completionOverlay если он висел от спец зикра
            const co = document.getElementById('completionOverlay');
            if (co) { co.classList.remove('show'); co.onclick = closeCompletion; }
            window._azkarMilestoneActive = false;
            updateSpecialDisplay();
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById('screen-special-list').classList.add('active');
            const specialFab = document.getElementById('specialAddFab');
            if (specialFab) specialFab.style.display = '';
            pipMode = 'main';
            updatePipCounter();
            try { if (typeof window._stealthDeactivate === 'function') window._stealthDeactivate(); } catch(e) {}
        }

        // ==================== NAMES (default Duas folder data) ====================
        // The 99 names are seeded into Duas as a built-in folder
        // (see ensureNames99DuaFolder). The old dedicated screen was removed.

        function setupSwipe() {
            const azkarScreen = document.getElementById('screen-azkar');
            const duaScreen = document.getElementById('screen-dua');
            const favoritesScreen = document.getElementById('screen-favorites');
            const specialListScreen = document.getElementById('screen-special-list');
            const specialCounterScreen = document.getElementById('screen-special-counter');
            const qiblaScreen = document.getElementById('screen-qibla');
            let startX = 0;

            function handleTouchStart(e) { startX = e.touches[0].clientX; }

            // Duas ↔ Favorites: swipe from Duas opens the favorites list,
            // swipe back returns to all duas. Favorites is no longer a nav tab.
            function handleTouchEndDuaFav(e) {
                if (!startX) return;
                const diff = startX - e.changedTouches[0].clientX;
                if (Math.abs(diff) > 50) {
                    if (diff > 0 && duaScreen.classList.contains('active')) {
                        showFavoritesScreen();
                    } else if (diff < 0 && favoritesScreen.classList.contains('active')) {
                        goBackToDuas();
                    }
                }
                startX = 0;
            }

            function handleTouchEndAzkarSpecial(e) {
                if (!startX) return;
                const diff = startX - e.changedTouches[0].clientX;
                if (Math.abs(diff) > 50) {
                    if (diff > 0 && azkarScreen.classList.contains('active')) {
                        // swipe left → special dhikrs
                        if (specialDhikrs && specialDhikrs.length > 0) switchToSpecialList();
                    } else if (diff < 0 && azkarScreen.classList.contains('active')) {
                        // swipe right → qibla
                        switchToQibla();
                    } else if (diff < 0 && specialListScreen.classList.contains('active')) {
                        switchToAzkar();
                    }
                }
                startX = 0;
            }

            // Qibla: swipe left → back to azkar
            function handleTouchEndQibla(e) {
                if (!startX) return;
                const diff = startX - e.changedTouches[0].clientX;
                if (diff > 50) {
                    switchToAzkar();
                }
                startX = 0;
            }

            // Swipe right on special counter → go back to azkar (home)
            function handleTouchEndSpecialCounter(e) {
                if (!startX) return;
                const diff = startX - e.changedTouches[0].clientX;
                if (diff < -50) {
                    switchToAzkar();
                }
                startX = 0;
            }

            // Touch events
            duaScreen.addEventListener('touchstart', handleTouchStart, { passive: true });
            duaScreen.addEventListener('touchend', handleTouchEndDuaFav, { passive: true });
            favoritesScreen.addEventListener('touchstart', handleTouchStart, { passive: true });
            favoritesScreen.addEventListener('touchend', handleTouchEndDuaFav, { passive: true });
            azkarScreen.addEventListener('touchstart', handleTouchStart, { passive: true });
            azkarScreen.addEventListener('touchend', handleTouchEndAzkarSpecial, { passive: true });
            specialListScreen.addEventListener('touchstart', handleTouchStart, { passive: true });
            specialListScreen.addEventListener('touchend', handleTouchEndAzkarSpecial, { passive: true });
            specialCounterScreen.addEventListener('touchstart', handleTouchStart, { passive: true });
            specialCounterScreen.addEventListener('touchend', handleTouchEndSpecialCounter, { passive: true });
            qiblaScreen.addEventListener('touchstart', handleTouchStart, { passive: true });
            qiblaScreen.addEventListener('touchend', handleTouchEndQibla, { passive: true });

            // Mouse swipe support (PC) — same logic as touch
            function addMouseSwipe(screen, endHandler) {
                screen.addEventListener('mousedown', function(e) {
                    // Don't intercept clicks on interactive elements
                    if (e.target.closest('button, input, textarea, select, a, [onclick], .cl-task, .cl-task-card, .dua-card, .special-card, .goal-chip, .nav-item, .setting-item, .theme-swatch, .special-action-btn, .dua-action-btn')) return;
                    startX = e.clientX;
                    let moved = false;
                    function onMove(ev) { moved = Math.abs(ev.clientX - startX) > 10; }
                    function onUp(ev) {
                        document.removeEventListener('mousemove', onMove);
                        document.removeEventListener('mouseup', onUp);
                        if (!moved) return;
                        const diff = startX - ev.clientX;
                        if (Math.abs(diff) > 50) {
                            // Fake a touch-like call by passing diff directly
                            const fake = { changedTouches: [{ clientX: ev.clientX }] };
                            startX = startX; // keep startX set
                            endHandler(fake);
                        } else {
                            startX = 0;
                        }
                    }
                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp);
                });
            }

            addMouseSwipe(duaScreen, handleTouchEndDuaFav);
            addMouseSwipe(favoritesScreen, handleTouchEndDuaFav);
            addMouseSwipe(azkarScreen, handleTouchEndAzkarSpecial);
            addMouseSwipe(specialListScreen, handleTouchEndAzkarSpecial);
            addMouseSwipe(specialCounterScreen, handleTouchEndSpecialCounter);
            addMouseSwipe(qiblaScreen, handleTouchEndQibla);
        }

        function showFavoritesScreen() {
            document.getElementById('screen-dua').classList.remove('active');
            document.getElementById('screen-favorites').classList.add('active');
            const duaFab = document.getElementById('duaAddFab');
            if (duaFab) duaFab.style.display = 'none';
            renderFavorites();
            _dirty.favorites = false;
        }
        function goBackToDuas() {
            document.getElementById('screen-favorites').classList.remove('active');
            document.getElementById('screen-dua').classList.add('active');
            const duaFab = document.getElementById('duaAddFab');
            if (duaFab) duaFab.style.display = '';
        }
        function switchToSpecialList() {
            // Свайп: используем _swipeSpecialId (не lastActiveSpecialId)
            if (_swipeSpecialId) {
                const dhikr = specialDhikrs.find(d => d.id === _swipeSpecialId);
                if (dhikr) {
                    startSpecialDhikrDirect(_swipeSpecialId);
                    return;
                }
            }
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById('screen-special-list').classList.add('active');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.querySelector('[data-tab="azkar"]').classList.add('active');
            const specialFab = document.getElementById('specialAddFab');
            if (specialFab) specialFab.style.display = '';
            renderSpecialList();
            // Stealth: list screen is not a counter — deactivate
            try {
                document.dispatchEvent(new CustomEvent('_screenChanged', { detail: 'screen-special-list' }));
                if (typeof window._stealthTryActivate === 'function') window._stealthTryActivate('screen-special-list');
            } catch(e) {}
        }

        // Запускает специальный зикр напрямую без открытия detail-карточки
        function startSpecialDhikrDirect(id) {
            if (shouldOfferSpecialResume(id)) {
                showSpecialResume(id);
                return;
            }
            currentSpecialId = id;
            lastActiveSpecialId = id;
            _swipeSpecialId = id;
            localStorage.setItem('azkar_last_special_id', id);
            specialCount = specialProgress[id] || 0;
            isSpecialActive = true;
            _specialGoalShown = (specialCount >= (specialDhikrs.find(d => d.id === id)?.goal || 100));
            const dhikr = specialDhikrs.find(d => d.id === id);
            specialGoal = dhikr ? dhikr.goal : 100;
            document.getElementById('specialCounterName').innerText = dhikr
                ? (dhikr['name'+currentLang.substring(0,1).toUpperCase()+currentLang.substring(1)] || dhikr.nameRu)
                : '';
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById('screen-special-counter').classList.add('active');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.querySelector('[data-tab="azkar"]').classList.add('active');
            const specialFab = document.getElementById('specialAddFab');
            if (specialFab) specialFab.style.display = 'none';
            const duaFab = document.getElementById('duaAddFab');
            if (duaFab) duaFab.style.display = 'none';
            pipMode = 'special';
            updatePipCounter();
            document.getElementById('specialTotalDisplay').innerHTML = `/ <span>${specialGoal}</span>`;
            const specialCenterText = document.getElementById('specialCenterText');
            if (specialCenterText) {
                if (id === 'salavat' || id === 'sleep_salavat_seal') {
                    specialCenterText.textContent = 'ﷺ';
                    specialCenterText.setAttribute('font-size', '36');
                    specialCenterText.setAttribute('y', '44');
                } else {
                    specialCenterText.textContent = 'الله';
                    specialCenterText.setAttribute('font-size', '36');
                    specialCenterText.setAttribute('y', '44');
                }
            }
            updateSpecialDisplay();
            // Stealth: restart countdown pinned to this special dhikr
            try {
                document.dispatchEvent(new CustomEvent('_screenChanged', { detail: 'screen-special-counter' }));
                if (typeof window._stealthTryActivate === 'function') window._stealthTryActivate('screen-special-counter');
            } catch(e) {}
        }
        function switchToAzkar() {
            // Уходим с экрана спец зикра — сохраняем прогресс и сбрасываем состояние,
            // иначе isSpecialActive/currentSpecialId остаются «живыми» в памяти,
            // completionOverlay может всплыть поверх главного экрана и заблокировать его.
            if (currentSpecialId) {
                specialProgress[currentSpecialId] = specialCount;
                saveDataDebounced();
            }
            isSpecialActive = false;
            currentSpecialId = null;
            specialCount = 0;
            lastActiveSpecialId = null;
            localStorage.removeItem('azkar_last_special_id');
            // Скрываем completionOverlay если он был показан для спец зикра
            const co = document.getElementById('completionOverlay');
            if (co) { co.classList.remove('show'); co.onclick = closeCompletion; }
            window._azkarMilestoneActive = false;
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById('screen-azkar').classList.add('active');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.querySelector('[data-tab="azkar"]').classList.add('active');
            const specialFab = document.getElementById('specialAddFab');
            if (specialFab) specialFab.style.display = 'none';
            pipMode = 'main';
            updatePipCounter();
            try {
                document.dispatchEvent(new CustomEvent('_screenChanged', { detail: 'screen-azkar' }));
                if (typeof window._stealthTryActivate === 'function') window._stealthTryActivate('screen-azkar');
            } catch(e) {}
        }

        function switchToQibla() {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById('screen-qibla').classList.add('active');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.querySelector('[data-tab="azkar"]').classList.add('active');
            // Cancel stealth (dark dhikr mode) when navigating to qibla
            if (typeof window._stealthDeactivate === 'function') window._stealthDeactivate();
            qiblaOnOpen();
        }

        // ===== QIBLA COMPASS LOGIC =====
        (function() {
            const KAABA_LAT = 21.4225, KAABA_LNG = 39.8262;

            // ---- Localized strings for the Qibla page (all 10 app languages) ----
            const QIBLA_I18N = UI_I18N.qibla || {};
            function _l() {
                const lang = (typeof currentLang !== 'undefined' ? currentLang : 'en');
                return QIBLA_I18N[lang] || QIBLA_I18N.en || QIBLA_I18N.ru;
            }
            function _isIOSDevice() {
                return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            }

            let _angle = null;        // bearing to Mecca from user (deg from north, CW)
            let _heading = null;      // smoothed device compass heading (rendered)
            let _targetHeading = null;// where we're animating toward
            let _samples = [];        // recent raw readings for moving-average pre-filter
            const _MAX_SAMPLES = 10;
            let _inited = false;
            let _orientListening = false;
            let _rafActive = false;   // rAF render loop running?
            let _firstReading = true;

            // Draw premium tick marks + degree numbers inside the compass rose
            function _drawMarks() {
                const svg = document.getElementById('qiblaMarksSvg');
                if (!svg) return;
                const cx = 120, cy = 120;
                const ROUTER = 117; // outer tick radius (in viewBox units)
                let html = '';

                // Tick marks: 2° micro, 10° minor, 30° major, 90° cardinal
                for (let deg = 0; deg < 360; deg += 2) {
                    const isMajor = (deg % 30 === 0);
                    const isMinor = !isMajor && (deg % 10 === 0);
                    const isCardinal = (deg % 90 === 0);
                    const len = isCardinal ? 13 : (isMajor ? 10 : (isMinor ? 6 : 3));
                    const w = isCardinal ? 1.8 : (isMajor ? 1.4 : (isMinor ? 0.8 : 0.5));
                    const opacity = isCardinal ? 1 : (isMajor ? 0.92 : (isMinor ? 0.65 : 0.32));
                    const color = (deg === 0) ? 'var(--gold)' : (isCardinal ? 'var(--gold-dark)' : 'var(--text-muted)');
                    const rad = (deg - 90) * Math.PI / 180;
                    const x1 = cx + Math.cos(rad) * (ROUTER - len);
                    const y1 = cy + Math.sin(rad) * (ROUTER - len);
                    const x2 = cx + Math.cos(rad) * (ROUTER - 1);
                    const y2 = cy + Math.sin(rad) * (ROUTER - 1);
                    html += '<line x1="' + x1.toFixed(2) + '" y1="' + y1.toFixed(2) +
                            '" x2="' + x2.toFixed(2) + '" y2="' + y2.toFixed(2) +
                            '" stroke="' + color + '" stroke-width="' + w +
                            '" opacity="' + opacity + '" stroke-linecap="round"/>';
                }

                // Degree numbers at every 30° (skip cardinals — letters cover those)
                const labelDist = ROUTER - 22;
                for (let deg = 30; deg < 360; deg += 30) {
                    if (deg % 90 === 0) continue;
                    const rad = (deg - 90) * Math.PI / 180;
                    const x = cx + Math.cos(rad) * labelDist;
                    const y = cy + Math.sin(rad) * labelDist;
                    const lbl = String(deg).padStart(3, '0');
                    html += '<text x="' + x.toFixed(2) + '" y="' + y.toFixed(2) +
                            '" text-anchor="middle" dominant-baseline="central"' +
                            ' font-family="Montserrat, sans-serif" font-size="7"' +
                            ' font-weight="600" fill="var(--text-dim)" opacity="0.7"' +
                            ' letter-spacing="0.4">' + lbl + '</text>';
                }

                svg.innerHTML = html;
            }

            // Great-circle bearing from (lat,lng) to Kaaba
            function _bearing(lat, lng) {
                const φ1 = lat * Math.PI / 180, φ2 = KAABA_LAT * Math.PI / 180;
                const Δλ = (KAABA_LNG - lng) * Math.PI / 180;
                const y = Math.sin(Δλ) * Math.cos(φ2);
                const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
                return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
            }

            function _updateNeedle() {
                if (_angle === null) return;
                const wrap = document.getElementById('qiblaNeedleWrap');
                const rose = document.getElementById('qiblaRose');

                // The needle (arrow) must rotate to point toward Qibla
                // relative to where the device is currently facing.
                // When heading is known: needle = angle - heading (so it
                // moves as the user turns). Rose also rotates by -heading
                // so its "N" label points to real magnetic north.
                // When heading is unknown: needle shows absolute bearing,
                // rose stays at 0 (north up on screen).
                const needleAngle = _heading !== null ? (_angle - _heading) : _angle;
                if (wrap) wrap.style.transform = 'rotate(' + needleAngle + 'deg)';
                if (rose) {
                    const roseAngle = _heading !== null ? -_heading : 0;
                    rose.style.transform = 'rotate(' + roseAngle + 'deg)';
                }

                // Aligned indicator — when needle is at the top of the screen
                // (i.e. device is pointing toward Qibla)
                const status = document.getElementById('qiblaStatus');
                if (status && _heading !== null) {
                    const screenAngle = ((_angle - _heading) % 360 + 360) % 360;
                    const aligned = screenAngle < 5 || screenAngle > 355;
                    status.textContent = aligned ? _l().aligned : '';
                    status.className = 'qibla-status' + (aligned ? ' aligned' : '');
                }

                _lastDrawn = _heading;
            }

            // Refresh all Qibla labels (called on open and on language change)
            function _localizeCardinals() {
                const l = _l();
                const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
                s('qCardN', l.n); s('qCardS', l.s); s('qCardE', l.e); s('qCardW', l.w);
                s('qiblaHeader', l.title); s('qiblaSub', l.sub);
                const errBtn = document.getElementById('qiblaErrBtn');
                if (errBtn) errBtn.textContent = l.geoBtn;
                const compassBtn = document.getElementById('qiblaCompassBtn');
                if (compassBtn) compassBtn.textContent = l.compassBtn;
                const st = document.getElementById('qiblaStatus');
                if (st && !_inited) st.textContent = l.loading;
            }

            function _startOrientation() {
                if (_orientListening) return;
                const listen = () => {
                    _orientListening = true;
                    const compassBtn = document.getElementById('qiblaCompassBtn');
                    if (compassBtn) compassBtn.style.display = 'none';
                    // Prefer deviceorientationabsolute on Android for true-north heading.
                    // On iOS, only deviceorientation fires and we rely on webkitCompassHeading.
                    const isIOS = _isIOSDevice();
                    if (isIOS) {
                        window.addEventListener('deviceorientation', _onOrientIOS, true);
                    } else {
                        // Android: try absolute first, fall back to regular
                        window.addEventListener('deviceorientationabsolute', _onOrientAndroid, true);
                        // Fallback if absolute doesn't fire within 1.5 seconds
                        _absoluteFallbackTimer = setTimeout(() => {
                            if (!_gotAbsoluteEvent) {
                                window.addEventListener('deviceorientation', _onOrientAndroid, true);
                            }
                        }, 1500);
                    }
                };
                // iOS 13+ needs permission — must be called from a user gesture
                if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                    DeviceOrientationEvent.requestPermission().then(r => {
                        if (r === 'granted') listen();
                        else {
                            const status = document.getElementById('qiblaStatus');
                            if (status) status.textContent = _l().compassNotSupported;
                        }
                    }).catch(() => {
                        const status = document.getElementById('qiblaStatus');
                        if (status) status.textContent = _l().compassNotSupported;
                    });
                } else if (window.DeviceOrientationEvent) {
                    listen();
                }
            }

            let _gotAbsoluteEvent = false;
            let _absoluteFallbackTimer = null;

            // Android orientation handler
            function _onOrientAndroid(e) {
                if (e.type === 'deviceorientationabsolute') _gotAbsoluteEvent = true;
                let h = null;
                if (e.absolute && e.alpha != null) {
                    h = (360 - e.alpha) % 360;
                } else if (e.alpha != null) {
                    h = (360 - e.alpha) % 360;
                }
                if (h === null || isNaN(h)) return;
                _feedCompass(h);
            }

            // iOS orientation handler — uses webkitCompassHeading which is
            // TRUE NORTH heading (already compensated for magnetic declination).
            // This is far more accurate on iOS than computing from alpha.
            function _onOrientIOS(e) {
                let h = null;
                // webkitCompassHeading: 0=North, increases clockwise (degrees)
                // This is the best source on iOS — it's true north.
                if (e.webkitCompassHeading != null && e.webkitCompassHeading !== -1) {
                    h = e.webkitCompassHeading;
                } else if (e.alpha != null) {
                    // Fallback: alpha is relative to an arbitrary reference on iOS
                    // but still gives reasonable rotation data
                    h = (360 - e.alpha) % 360;
                }
                if (h === null || isNaN(h)) return;
                _feedCompass(h);
            }

            // Common compass data ingestion (both platforms)
            function _feedCompass(h) {
                // Stage 1: feed into circular moving-average buffer
                _samples.push(h);
                if (_samples.length > _MAX_SAMPLES) _samples.shift();
                const filtered = _circMean(_samples);

                if (_firstReading) {
                    // Snap to first valid reading instantly — no animation
                    _firstReading = false;
                    _targetHeading = filtered;
                    _heading = filtered;
                    _updateNeedle();
                    return;
                }

                _targetHeading = filtered;
                _ensureRaf();
            }

            // ---- Smoothed compass: three-stage filter — premium-grade
            //
            // Stage 1 (per sensor event): circular moving-average of the
            // last 10 raw readings. This kills high-frequency sensor noise
            // immediately, before any animation is involved.
            //
            // Stage 2 (outlier rejection): if the new reading deviates more
            // than 90° from the current average, it's likely a glitch. We
            // discard it.
            //
            // Stage 3 (per animation frame): linear interpolation toward
            // the filtered target. Runs in a tight rAF loop so the rotation
            // is butter-smooth at 60 fps, exactly like high-end native
            // compass apps. The lerp factor is adaptive — small movements
            // are damped heavily, large turns catch up quickly.
            //
            // CSS transitions are intentionally short (60ms) — visual
            // smoothness comes from the JS rAF loop, NOT from CSS, so we
            // never get that "needle keeps overshooting and resetting"
            // jitter that long CSS transitions cause when JS fires often.

            // Circular mean of an array of degrees (0..360), wraparound-safe
            function _circMean(arr) {
                let sx = 0, sy = 0;
                for (const a of arr) {
                    sx += Math.cos(a * Math.PI / 180);
                    sy += Math.sin(a * Math.PI / 180);
                }
                const n = arr.length || 1;
                return (Math.atan2(sy / n, sx / n) * 180 / Math.PI + 360) % 360;
            }

            // Shortest angular distance in degrees (signed, -180..180)
            function _angleDiff(a, b) {
                let d = ((a - b) % 360 + 360) % 360;
                return d > 180 ? d - 360 : d;
            }

            function _ensureRaf() {
                if (_rafActive) return;
                _rafActive = true;
                requestAnimationFrame(_animate);
            }

            function _animate() {
                if (_targetHeading === null) { _rafActive = false; return; }
                if (_heading === null) {
                    _heading = _targetHeading;
                    _updateNeedle();
                    _rafActive = false;
                    return;
                }
                // shortest-arc delta in (-180, 180]
                let delta = _targetHeading - _heading;
                if (delta > 180) delta -= 360;
                else if (delta < -180) delta += 360;
                const absDelta = Math.abs(delta);

                // Convergence — snap and stop animating to save battery
                if (absDelta < 0.03) {
                    _heading = _targetHeading;
                    _updateNeedle();
                    _rafActive = false;
                    return;
                }

                // Adaptive lerp rate per frame (60 fps):
                //   tiny delta  → 0.06 (very slow / smooth — kills jitter)
                //   small delta → 0.10
                //   medium      → 0.16
                //   large turn  → 0.25 (catches up but not snappy)
                let rate;
                if (absDelta < 0.5)     rate = 0.06;
                else if (absDelta < 2)  rate = 0.10;
                else if (absDelta < 10) rate = 0.14;
                else if (absDelta < 30) rate = 0.18;
                else                    rate = 0.25;

                _heading = (_heading + delta * rate + 360) % 360;
                _updateNeedle();
                requestAnimationFrame(_animate);
            }

            // Последняя известная локация (её сохраняет модуль намазов в
            // azkar_geoloc). Если геолокация хоть раз была включена — кибла
            // работает и после того, как её выключили.
            function _savedLocation() {
                try {
                    const loc = window.PrayerTimes && window.PrayerTimes.getLocation && window.PrayerTimes.getLocation();
                    if (loc) return loc;
                    const s = JSON.parse(localStorage.getItem('azkar_geoloc') || 'null');
                    if (s && typeof s.lat === 'number' && typeof s.lng === 'number') return { lat: s.lat, lng: s.lng };
                } catch(e) {}
                return null;
            }

            // Ставит стрелку на Мекку по координатам и запускает компас.
            function _applyQiblaLocation(lat, lng) {
                const status = document.getElementById('qiblaStatus');
                const errBtn = document.getElementById('qiblaErrBtn');
                const compassBtn = document.getElementById('qiblaCompassBtn');
                _inited = true;
                _angle = _bearing(lat, lng);
                if (status) status.textContent = '';
                if (errBtn) errBtn.style.display = 'none';
                _updateNeedle();
                // iOS 13+: permission must come from a user gesture — show button
                if (_isIOSDevice()) {
                    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                        if (!_orientListening && compassBtn) {
                            compassBtn.textContent = _l().compassBtn;
                            compassBtn.style.display = '';
                        }
                    } else {
                        _startOrientation();
                        if (!_orientListening && status) {
                            status.textContent = _l().compassNotSupported;
                        }
                    }
                } else {
                    _startOrientation();
                    if (!_orientListening && status) {
                        status.textContent = _l().compassNotSupported;
                    }
                }
            }

            // Public: called when user opens qibla screen
            window.qiblaOnOpen = function() {
                _localizeCardinals();
                _drawMarks();
                _updateNeedle();
                if (!_inited) {
                    const saved = _savedLocation();
                    if (saved) {
                        // Сразу по сохранённой локации; GPS (если включён) лишь уточнит её
                        _applyQiblaLocation(saved.lat, saved.lng);
                        if (!_isIOSDevice()) window.qiblaInit();
                    } else if (_isIOSDevice()) {
                        const status = document.getElementById('qiblaStatus');
                        const errBtn = document.getElementById('qiblaErrBtn');
                        if (status) status.textContent = _l().loading;
                        if (errBtn) {
                            errBtn.textContent = _l().geoBtn;
                            errBtn.style.display = '';
                        }
                    } else {
                        window.qiblaInit();
                    }
                }
            };

            // Public: re-localize when language changes (without re-initializing geolocation)
            window.qiblaApplyLang = function() {
                _localizeCardinals();
                _updateNeedle();
            };

            window.qiblaInit = function() {
                const status = document.getElementById('qiblaStatus');
                const errBtn = document.getElementById('qiblaErrBtn');
                const compassBtn = document.getElementById('qiblaCompassBtn');
                const l = _l();
                const saved = _savedLocation();
                if (!_inited) {
                    if (status) status.textContent = l.loading;
                    if (errBtn) errBtn.style.display = 'none';
                    if (compassBtn) compassBtn.style.display = 'none';
                }
                // Геолокация недоступна/выключена: работаем по сохранённой локации
                const useSavedOr = (msg, showBtn) => {
                    if (saved) {
                        if (!_inited) _applyQiblaLocation(saved.lat, saved.lng);
                        return;
                    }
                    if (status) status.textContent = msg;
                    if (errBtn && showBtn) {
                        errBtn.textContent = _l().geoBtn;
                        errBtn.style.display = '';
                    }
                };
                if (!navigator.geolocation) { useSavedOr(l.geoNotSupported, false); return; }
                const isIOS = _isIOSDevice();
                const onSuccess = (pos) => {
                    const lat = pos.coords.latitude, lng = pos.coords.longitude;
                    _applyQiblaLocation(lat, lng);
                    // Запоминаем свежую локацию (и для времени намазов)
                    if (!saved || Math.abs(saved.lat - lat) > 0.01 || Math.abs(saved.lng - lng) > 0.01) {
                        if (window.PrayerTimes && window.PrayerTimes.setLocation) {
                            try { window.PrayerTimes.setLocation(lat, lng); } catch(e) {}
                        }
                    }
                };
                const onError = () => {
                    if (isIOS) {
                        // Retry with low accuracy on iOS
                        navigator.geolocation.getCurrentPosition(
                            onSuccess,
                            () => useSavedOr(_l().geoDenied, true),
                            { timeout: 20000, maximumAge: 300000, enableHighAccuracy: false }
                        );
                    } else {
                        useSavedOr(_l().geoDenied, true);
                    }
                };
                navigator.geolocation.getCurrentPosition(
                    onSuccess, onError,
                    { timeout: 15000, maximumAge: 60000, enableHighAccuracy: true }
                );
            };

            // Called when user taps the iOS compass button
            window.qiblaRequestCompass = function() {
                _startOrientation();
            };
        })();
        function switchToStats() {
            document.getElementById('screen-special-list').classList.remove('active');
            document.getElementById('screen-stats').classList.add('active');
        }


        // ==================== STATS RENDER ====================
        function setChartPeriod(period) {
            currentPeriod = period;
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            document.querySelector(`.period-btn[data-period="${period}"]`).classList.add('active');
            renderLineChart(getStats());
        }
        function renderStats() {
            let stats = getStats();
            // "Today" follows the Islamic day — it resets at Fajr, not midnight.
            let today = _islamicDayKey();
            const anchorDate = _dateFromLocalDayKey(today);
            // "Week" is a calendar week starting Monday — it resets every
            // Monday at Fajr, same as "Today" resets daily. We sum only
            // from this week's Monday up to today (not the full Mon-Sun
            // span), since future days haven't happened yet.
            let weekSum = 0;
            {
                const dow = anchorDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
                const daysSinceMonday = (dow === 0) ? 6 : dow - 1;
                for (let i = 0; i <= daysSinceMonday; i++) {
                    let d = new Date(anchorDate); d.setDate(anchorDate.getDate() - i);
                    weekSum += stats[_localDayKey(d)]?.count || 0;
                }
            }
            let monthSum = 0;
            let cur = anchorDate;
            let year = cur.getFullYear(), month = cur.getMonth() + 1;
            const daysInMonth = new Date(year, month, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                let key = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                monthSum += stats[key]?.count || 0;
            }
            let total = 0; for (let [k, v] of Object.entries(stats)) if (k.includes('-')) total += v.count || 0;

            // Animated counter roll-up
            function animateCount(elId, target) {
                const el = document.getElementById(elId);
                if (!el) return;
                // Экран статистики скрыт — анимировать некому, просто ставим число.
                const statsScreen = document.getElementById('screen-stats');
                if (!statsScreen || !statsScreen.classList.contains('active')) { el.textContent = target; return; }
                const start = parseInt(el.textContent) || 0; // textContent не вызывает reflow (innerText вызывает)
                if (start === target) return;
                const duration = Math.min(600, Math.max(200, Math.abs(target - start) * 2));
                const startTime = performance.now();
                function tick(now) {
                    const t = Math.min((now - startTime) / duration, 1);
                    const ease = 1 - Math.pow(1 - t, 3); // cubic ease-out
                    el.innerText = Math.round(start + (target - start) * ease);
                    if (t < 1) requestAnimationFrame(tick);
                    else {
                        el.innerText = target;
                        el.classList.add('bump');
                        setTimeout(() => el.classList.remove('bump'), 200);
                    }
                }
                requestAnimationFrame(tick);
            }
            animateCount('statToday', stats[today]?.count || 0);
            animateCount('statWeek', weekSum);
            animateCount('statMonth', monthSum);
            animateCount('statTotal', total);

            renderLineChart(stats);
            updateDhikrOverallProgress();
        }

        function renderLineChart(stats) {
            const svg = document.getElementById('lineChartSvg');
            svg.innerHTML = '';
            let data = [];
            let labels = [];
            const now = _dateFromLocalDayKey(_islamicDayKey());
            if (currentPeriod === 'week') {
                for (let i = 6; i >= 0; i--) {
                    let d = new Date(now); d.setDate(now.getDate() - i);
                    let key = _localDayKey(d);
                    labels.push(d.getDate() + '/' + (d.getMonth()+1));
                    data.push(stats[key]?.count || 0);
                }
            } else if (currentPeriod === 'month') {
                let daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
                for (let i = 1; i <= daysInMonth; i++) {
                    let key = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
                    labels.push(i);
                    data.push(stats[key]?.count || 0);
                }
            } else {
                const year = now.getFullYear();
                for (let month = 0; month < 12; month++) {
                    let monthKey = `${year}-${String(month+1).padStart(2,'0')}`;
                    let sum = 0;
                    for (let d = 1; d <= 31; d++) {
                        let dk = `${monthKey}-${String(d).padStart(2,'0')}`;
                        sum += stats[dk]?.count || 0;
                    }
                    labels.push(t('monthsShort')[month]);
                    data.push(sum);
                }
            }
            const maxVal = Math.max(1, ...data);
            const width = 400, height = 200, padLeft = 30, padRight = 20, padTop = 10, padBottom = 30;
            const chartW = width - padLeft - padRight;
            const chartH = height - padTop - padBottom;
            const points = data.map((v, i) => ({
                x: padLeft + (i / Math.max(1, data.length - 1)) * chartW,
                y: padTop + chartH - (v / maxVal) * chartH
            }));

            const axis = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            axis.setAttribute('d', `M${padLeft},${padTop+chartH} L${width-padRight},${padTop+chartH}`);
            axis.setAttribute('stroke', 'var(--border)');
            axis.setAttribute('stroke-width', '1');
            axis.setAttribute('fill', 'none');
            svg.appendChild(axis);

            if (points.length > 1) {
                // Build smooth cubic bezier curve path
                function smoothPath(pts) {
                    let d = `M${pts[0].x},${pts[0].y}`;
                    for (let i = 1; i < pts.length; i++) {
                        const prev = pts[i - 1], cur = pts[i];
                        const cpx = (prev.x + cur.x) / 2;
                        d += ` C${cpx},${prev.y} ${cpx},${cur.y} ${cur.x},${cur.y}`;
                    }
                    return d;
                }
                const smoothD = smoothPath(points);

                // Gradient area fill under the curve
                const areaD = smoothD + ` L${points[points.length-1].x},${padTop+chartH} L${points[0].x},${padTop+chartH} Z`;
                const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                area.setAttribute('d', areaD);
                area.setAttribute('fill', 'url(#goldGrad)');
                area.setAttribute('opacity', '0.13');
                svg.insertBefore(area, svg.firstChild);

                // Smooth line
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', smoothD);
                path.setAttribute('stroke', 'url(#goldGrad)');
                path.setAttribute('stroke-width', '2.5');
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke-linecap', 'round');
                path.setAttribute('stroke-linejoin', 'round');
                // Animate the line drawing in
                const pathLen = path.getTotalLength ? path.getTotalLength() : 800;
                path.style.strokeDasharray = pathLen;
                path.style.strokeDashoffset = pathLen;
                path.style.transition = 'stroke-dashoffset 0.7s cubic-bezier(0.2,0.9,0.4,1)';
                svg.appendChild(path);
                requestAnimationFrame(() => { path.style.strokeDashoffset = '0'; });

                // Y-axis grid lines (3 horizontal)
                [0.25, 0.5, 0.75, 1].forEach(frac => {
                    const gy = padTop + chartH - frac * chartH;
                    const gline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    gline.setAttribute('x1', padLeft); gline.setAttribute('x2', width - padRight);
                    gline.setAttribute('y1', gy); gline.setAttribute('y2', gy);
                    gline.setAttribute('stroke', 'var(--border)');
                    gline.setAttribute('stroke-width', '0.6');
                    gline.setAttribute('stroke-dasharray', '3,4');
                    svg.insertBefore(gline, svg.firstChild);
                    // Label
                    const glabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    glabel.setAttribute('x', padLeft - 3);
                    glabel.setAttribute('y', gy + 4);
                    glabel.setAttribute('text-anchor', 'end');
                    glabel.setAttribute('font-size', '9');
                    glabel.setAttribute('fill', 'var(--text-dim)');
                    glabel.textContent = Math.round(maxVal * frac);
                    svg.insertBefore(glabel, svg.firstChild);
                });

                // X-axis labels
                const step = (currentPeriod === 'year' || currentPeriod === 'month') ? 1 : Math.ceil(labels.length / 7);
                labels.forEach((lbl, i) => {
                    if (i % step !== 0 && i !== labels.length - 1) return;
                    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    t.setAttribute('x', points[i].x);
                    t.setAttribute('y', padTop + chartH + 18);
                    t.setAttribute('text-anchor', 'middle');
                    t.setAttribute('font-size', currentPeriod === 'month' ? '8' : '9');
                    t.setAttribute('fill', 'var(--text-dim)');
                    t.textContent = lbl;
                    svg.appendChild(t);
                });

                // Dots with glow + tooltip
                points.forEach((p, i) => {
                    if (data[i] === 0) return; // skip zero points
                    // Glow halo
                    const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    halo.setAttribute('cx', p.x); halo.setAttribute('cy', p.y); halo.setAttribute('r', '8');
                    halo.setAttribute('fill', 'var(--gold)'); halo.setAttribute('opacity', '0.12');
                    svg.appendChild(halo);
                    // Dot
                    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('cx', p.x);
                    circle.setAttribute('cy', p.y);
                    circle.setAttribute('r', '4');
                    circle.setAttribute('fill', 'var(--gold)');
                    circle.setAttribute('stroke', 'var(--bg)');
                    circle.setAttribute('stroke-width', '1.5');
                    circle.style.cursor = 'default';
                    // Animate dot appear
                    circle.style.opacity = '0';
                    circle.style.transition = `opacity 0.3s ease ${0.5 + i * 0.04}s`;
                    requestAnimationFrame(() => { circle.style.opacity = '1'; });
                    svg.appendChild(circle);
                });

                // Подсказка при наведении: значение за этот период показывается над точкой
                const svgNS = 'http://www.w3.org/2000/svg';
                const hoverG = document.createElementNS(svgNS, 'g');
                hoverG.setAttribute('pointer-events', 'none');
                hoverG.style.display = 'none';
                const tipBg = document.createElementNS(svgNS, 'rect');
                tipBg.setAttribute('rx', '8'); tipBg.setAttribute('ry', '8');
                tipBg.setAttribute('fill', 'var(--surface)');
                tipBg.setAttribute('stroke', 'var(--gold)'); tipBg.setAttribute('stroke-width', '1');
                const tipText = document.createElementNS(svgNS, 'text');
                tipText.setAttribute('font-size', '10'); tipText.setAttribute('font-weight', '600');
                tipText.setAttribute('fill', 'var(--gold)'); tipText.setAttribute('text-anchor', 'middle');
                hoverG.appendChild(tipBg); hoverG.appendChild(tipText);
                svg.appendChild(hoverG);
                const vbParts = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
                const vbW = vbParts[2] || 320;
                const hideTip = () => { hoverG.style.display = 'none'; };
                const showTip = (i) => {
                    const p = points[i];
                    tipText.textContent = `${labels[i]}: ${data[i]}`;
                    hoverG.style.display = '';
                    const bb = tipText.getBBox();
                    const w = bb.width + 16, h = bb.height + 10;
                    const cx = Math.max(w / 2 + 2, Math.min(vbW - w / 2 - 2, p.x));
                    let top = p.y - h - 10;
                    if (top < 0) top = p.y + 10;
                    tipBg.setAttribute('x', cx - w / 2); tipBg.setAttribute('y', top);
                    tipBg.setAttribute('width', w); tipBg.setAttribute('height', h);
                    tipText.setAttribute('x', cx); tipText.setAttribute('y', top + h / 2 + bb.height * 0.35);
                };
                const colW = points.length > 1 ? Math.abs(points[1].x - points[0].x) : 40;
                let hideT = null;
                points.forEach((p, i) => {
                    const hit = document.createElementNS(svgNS, 'rect');
                    hit.setAttribute('x', p.x - colW / 2); hit.setAttribute('y', padTop);
                    hit.setAttribute('width', colW); hit.setAttribute('height', chartH);
                    hit.setAttribute('fill', 'transparent');
                    hit.addEventListener('pointerenter', () => { clearTimeout(hideT); showTip(i); });
                    hit.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { clearTimeout(hideT); hideTip(); } });
                    hit.addEventListener('pointerdown', () => { clearTimeout(hideT); showTip(i); hideT = setTimeout(hideTip, 1600); });
                    svg.appendChild(hit);
                });

            }
        }

        function showStatsDetail(message) {
            document.getElementById('statsDetailCard').innerHTML = `<div class="overlay-title">${message}</div>`;
            document.getElementById('statsDetailOverlay').classList.add('show');
        }
        function closeStatsDetail() {
            document.getElementById('statsDetailOverlay').classList.remove('show');
        }

        function promptClearStats() { document.getElementById('clearStatsOverlay').classList.add('show'); }
        function promptClearAll() { document.getElementById('clearStatsOverlay').classList.add('show'); }
        function confirmClearStats() {
            // Сброс основного счётчика зикра
            count = 0; goalTriggered = false; _prevLap = 0; goalBaseline = 0; customBaseline = 0;
            // Сброс цели на 100 по умолчанию
            goal = 100; isUnlimited = false;
            localStorage.setItem('azkar_goal', 100);
            document.querySelectorAll('.goal-chip').forEach(c => c.classList.remove('active'));
            document.querySelector('[data-goal="100"]').classList.add('active');
            
            // Сброс своей цели на 1000 по умолчанию
            customGoal = 1000;
            localStorage.setItem('azkar_custom_goal', 1000);
            const _cgNum = document.getElementById('customGoalNum');
            if (_cgNum) _cgNum.innerText = formatGoalShort(1000);

            updateDisplay(); saveDataDebounced();
            // Сброс статистики
            localStorage.removeItem('azkar_stats_v2');
            _statsCache = {};
            pendingStatsSave = false;
            dhikrTotals = {};
            saveDhikrTotals();
            // Полный сброс специальных зикров: убираем недописанный прогресс
            // (например, если зикр был сделан 30 раз из 100 и не дочитан до
            // конца) и пометки "выполнено сегодня" — пишем синхронно, без
            // debounce, чтобы сброс точно сохранился.
            specialProgress = {};
            specialResumeSessions = {};
            completedSpecial = {};
            localStorage.setItem('azkar_special_progress', JSON.stringify(specialProgress));
            localStorage.setItem('azkar_special_resume_sessions', JSON.stringify(specialResumeSessions));
            localStorage.setItem('azkar_special_completed', JSON.stringify(completedSpecial));
            // Если прямо сейчас открыт экран специального зикра — сбрасываем
            // его живой счётчик на экране тоже.
            if (currentSpecialId) {
                specialCount = 0;
                updateSpecialDisplay();
            }
            flushSave();
            replaceFirebaseDhikrState(['azkar_count', 'azkar_stats_v2', 'azkar_dhikr_totals']);
            renderStats();
            renderSpecialList();
            showToast(t('toastStatsCleared'));
            document.getElementById('clearStatsOverlay').classList.remove('show');
        }
        function cancelClearStats() { document.getElementById('clearStatsOverlay').classList.remove('show'); }

        // ==================== DUAS ====================
        function onDuaSearch() { duaSearchQuery = document.getElementById('duaSearch').value.trim().toLowerCase(); renderDuaFolders(); renderDuas(); _dirty.dua = false; }
        function getFilteredDuas() {
            const unfoldered = getUnfolderedDuas();
            if (!duaSearchQuery) return unfoldered;
            return unfoldered.filter(d => d.text.toLowerCase().includes(duaSearchQuery) || (d.translation && d.translation.toLowerCase().includes(duaSearchQuery)) || (d.name && d.name.toLowerCase().includes(duaSearchQuery)));
        }
        // ===== Card pager (свайп карточек) =====
        // Активная точка подсвечивается цветом темы, неактивная — серая.
        function _wireCardPager(pager, dots) {
            if (!pager || !dots) return;
            const dotEls = dots.querySelectorAll('.card-dot');
            let raf = null;
            const update = () => {
                raf = null;
                const w = Math.max(1, pager.clientWidth);
                const idx = Math.round(pager.scrollLeft / w);
                dotEls.forEach((d, i) => d.classList.toggle('active', i === idx));
            };
            pager.addEventListener('scroll', () => {
                if (raf) return;
                raf = requestAnimationFrame(update);
            }, { passive: true });
            // Клик по точке — переход на страницу (удобно на десктопе)
            dotEls.forEach((dot, i) => {
                dot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    pager.scrollTo({ left: i * pager.clientWidth, behavior: 'smooth' });
                });
            });
        }

        // Контент дуа-карточки в списке: название, текст, описание — обычным стеком (без свайпа).
        function _appendDuaPagedContent(card, d) {
            if (d.name) {
                const nameDiv = document.createElement('div'); nameDiv.className = 'dua-name'; nameDiv.textContent = d.name;
                card.appendChild(nameDiv);
            }
            const textDiv = document.createElement('div'); textDiv.className = 'dua-text'; textDiv.textContent = d.text;
            card.appendChild(textDiv);
            if (d.translation) {
                const transDiv = document.createElement('div'); transDiv.className = 'dua-translation'; transDiv.textContent = d.translation;
                card.appendChild(transDiv);
            }
        }

        // Рендерит детальную (пред-стартовую) карточку с двумя страницами (свайп в сторону):
        // страница 1 — основная (как обычно), страница 2 — «Подробнее». Точки внизу:
        // активная — цвет темы, неактивная — серая. Если страница 2 пустая — одна страница без точек.
        function _renderDetailPager(cardEl, pages) {
            const valid = pages.filter(p => p && p.trim());
            if (valid.length <= 1) {
                cardEl.innerHTML = `<div class="detail-single">${valid[0] || ''}</div>`;
                return;
            }
            const pagesHtml = valid.map(p => `<div class="card-page detail-page">${p}</div>`).join('');
            const dotsHtml = valid.map((_, i) => `<span class="card-dot${i === 0 ? ' active' : ''}"></span>`).join('');
            cardEl.innerHTML = `<div class="card-pager detail-pager">${pagesHtml}</div><div class="card-dots">${dotsHtml}</div>`;
            const pager = cardEl.querySelector('.card-pager');
            _wireCardPager(pager, cardEl.querySelector('.card-dots'));
        }

        function renderDuas() {
            let container = document.getElementById('duaList');
            // One-time desktop drop zone: drop a folder dua onto empty list area → unfolder
            if (container && !container._unfolderDropInit) {
                container._unfolderDropInit = true;
                container.addEventListener('dragover', function(e) {
                    if (!_duaDragSrcId) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (e.target === container) container.classList.add('dua-unfolder-target');
                });
                container.addEventListener('dragleave', function(e) {
                    if (e.target === container) container.classList.remove('dua-unfolder-target');
                });
                container.addEventListener('drop', function(e) {
                    container.classList.remove('dua-unfolder-target');
                    // Only act on drops on the list background (cards handle their own reorder)
                    if (e.target === container && _duaDragSrcId) {
                        e.preventDefault();
                        const id = _duaDragSrcId;
                        _duaDragSrcId = null; dragSrcIndex = null;
                        _unfolderDua(id);
                    }
                });
            }
            container.innerHTML = '';
            let filtered = getFilteredDuas();
            // When searching, also show matching duas from folders
            if (duaSearchQuery) {
                const allFolderIds = new Set();
                duaFolders.forEach(f => f.duaIds.forEach(id => allFolderIds.add(id)));
                const inFolderMatches = duas.filter(d => allFolderIds.has(d.id) && (d.text.toLowerCase().includes(duaSearchQuery) || (d.translation && d.translation.toLowerCase().includes(duaSearchQuery)) || (d.name && d.name.toLowerCase().includes(duaSearchQuery))));
                filtered = [...filtered, ...inFolderMatches];
            }
            if (filtered.length === 0 && duas.length === 0 && duaFolders.length === 0) {
                container.innerHTML = `<div class="empty-state"><svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.5C2 5.4 2.9 4.5 4 4.5H10.5C11.3 4.5 12 5.2 12 6V19C12 19 10 18.5 8 18.5H4C2.9 18.5 2 17.6 2 16.5V6.5Z"/><path d="M22 6.5C22 5.4 21.1 4.5 20 4.5H13.5C12.7 4.5 12 5.2 12 6V19C12 19 14 18.5 16 18.5H20C21.1 18.5 22 17.6 22 16.5V6.5Z"/><line x1="12" y1="6" x2="12" y2="19" stroke-width="1"/><path d="M6 8H9M6 11H9M6 14H8" stroke-width="1.2" opacity="0.7"/></svg><p>${t('emptyDua')}</p><small>${t('emptyDuaSub')}</small></div>`;
                return;
            }
            if (filtered.length === 0 && !duaSearchQuery) {
                return; // All duas are in folders, nothing to show here
            }
            if (filtered.length === 0 && duaSearchQuery) {
                container.innerHTML = `<div class="empty-state"><p>${t('noResults')}</p></div>`; return;
            }
            const fragment = document.createDocumentFragment();
            for (let i = 0; i < filtered.length; i++) {
                const d = filtered[i], idx = duas.findIndex(x => x.id === d.id);
                const card = document.createElement('div'); card.className = 'dua-card';
                card.dataset.index = idx;

                const dragHandle = document.createElement('div'); dragHandle.className = 'drag-handle';
                dragHandle.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="9" cy="5" r="1.2" fill="currentColor"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="9" cy="19" r="1.2" fill="currentColor"/><circle cx="15" cy="5" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="19" r="1.2" fill="currentColor"/></svg>';
                // Touch drag support — same as special cards
                initDuaTouchDrag(dragHandle, card, idx);
                card.appendChild(dragHandle);

                // Desktop drag events
                card.draggable = true;
                card.addEventListener('dragstart', function(e) {
                    dragSrcIndex = parseInt(this.dataset.index);
                    _duaDragSrcId = duas[dragSrcIndex]?.id || null;
                    this.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', _duaDragSrcId || '');
                });
                card.addEventListener('dragover', function(e) {
                    // Only highlight card-to-card if not hovering a folder
                    if (!e.target.closest('.dua-folder')) {
                        e.preventDefault();
                        this.classList.add('drag-over');
                    }
                });
                card.addEventListener('dragleave', function() { this.classList.remove('drag-over'); });
                card.addEventListener('drop', function(e) {
                    e.preventDefault(); this.classList.remove('drag-over');
                    // Ignore if dropped onto a folder (folder handles it)
                    if (e.target.closest('.dua-folder')) return;
                    const targetIdx = parseInt(this.dataset.index);
                    if (dragSrcIndex !== null && dragSrcIndex !== targetIdx) {
                        const [moved] = duas.splice(dragSrcIndex, 1);
                        duas.splice(targetIdx, 0, moved);
                        saveDataDebounced(); renderDuas(); renderFavorites();
                    }
                    dragSrcIndex = null;
                    _duaDragSrcId = null;
                });
                card.addEventListener('dragend', function() {
                    this.classList.remove('dragging');
                    document.querySelectorAll('#duaList .dua-card').forEach(c => c.classList.remove('drag-over'));
                    document.querySelectorAll('.dua-folder').forEach(fd => fd.classList.remove('folder-drag-over'));
                    dragSrcIndex = null;
                    _duaDragSrcId = null;
                });

                const actions = document.createElement('div'); actions.className = 'dua-actions';
                const favBtn = document.createElement('button'); favBtn.className = 'dua-action-btn';
                if (d.favorite) favBtn.classList.add('fav-active');
                favBtn.title = d.favorite ? t('titleFavoriteRemove') : t('titleFavoriteAdd');
                favBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
                favBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleFavorite(d.id); });
                const editBtn = document.createElement('button'); editBtn.className = 'dua-action-btn edit';
                editBtn.title = t('titleEditDua');
                editBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
                editBtn.addEventListener('click', (e) => { e.stopPropagation(); editDua(d.id); });
                const delBtn = document.createElement('button'); delBtn.className = 'dua-action-btn danger';
                delBtn.title = t('titleDeleteDua');
                delBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
                delBtn.addEventListener('click', (e) => { e.stopPropagation(); promptDeleteDua(d.id); });
                actions.appendChild(favBtn); actions.appendChild(editBtn); actions.appendChild(delBtn);
                card.appendChild(actions);

                _appendDuaPagedContent(card, d);

                card.addEventListener('click', function(e) {
                    if (!e.target.closest('.dua-action-btn') && !e.target.closest('.drag-handle')) openDuaDetail(d);
                });

                fragment.appendChild(card);
            }
            container.appendChild(fragment);
        }
        function renderFavorites() {
            let container = document.getElementById('favList'); container.innerHTML = '';
            let favs = duas.filter(d => d.favorite);
            if (favs.length === 0) {
                container.innerHTML = `<div class="empty-state"><svg class="empty-icon" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><p>${t('emptyFav')}</p><small>${t('emptyFavSub')}</small></div>`;
                return;
            }
            const fragment = document.createDocumentFragment();
            for (let i = 0; i < favs.length; i++) {
                const d = favs[i];
                const idx = duas.findIndex(x => x.id === d.id);
                const card = document.createElement('div'); card.className = 'dua-card';
                card.dataset.index = idx;
                card.dataset.favIndex = i;

                // Drag handle (same as duaList)
                const dragHandle = document.createElement('div'); dragHandle.className = 'drag-handle';
                dragHandle.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="9" cy="5" r="1.2" fill="currentColor"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="9" cy="19" r="1.2" fill="currentColor"/><circle cx="15" cy="5" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="19" r="1.2" fill="currentColor"/></svg>';
                initFavTouchDrag(dragHandle, card, i);
                card.appendChild(dragHandle);

                // Desktop drag events (reorder favorites within duas array)
                card.draggable = true;
                card.addEventListener('dragstart', function(e) {
                    _favDragSrcFavIdx = i;
                    this.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                });
                card.addEventListener('dragover', function(e) { e.preventDefault(); this.classList.add('drag-over'); });
                card.addEventListener('dragleave', function() { this.classList.remove('drag-over'); });
                card.addEventListener('drop', function(e) {
                    e.preventDefault(); this.classList.remove('drag-over');
                    const targetFavIdx = parseInt(this.dataset.favIndex);
                    if (_favDragSrcFavIdx !== null && _favDragSrcFavIdx !== targetFavIdx) {
                        const allFavs = duas.filter(d => d.favorite);
                        const srcId = allFavs[_favDragSrcFavIdx]?.id;
                        const tgtId = allFavs[targetFavIdx]?.id;
                        if (srcId && tgtId) {
                            const srcDuaIdx = duas.findIndex(x => x.id === srcId);
                            const tgtDuaIdx = duas.findIndex(x => x.id === tgtId);
                            if (srcDuaIdx !== -1 && tgtDuaIdx !== -1) {
                                const [moved] = duas.splice(srcDuaIdx, 1);
                                duas.splice(tgtDuaIdx, 0, moved);
                                saveDataDebounced(); renderDuas(); renderFavorites();
                            }
                        }
                    }
                    _favDragSrcFavIdx = null;
                });
                card.addEventListener('dragend', function() {
                    this.classList.remove('dragging');
                    document.querySelectorAll('#favList .dua-card').forEach(c => c.classList.remove('drag-over'));
                });

                // Actions — not shown in favorites (drag-only)
                // padding-right compensation: no action buttons, restore text padding
                card.style.paddingRight = '20px';

                _appendDuaPagedContent(card, d);
                card.addEventListener('click', function(e) {
                    if (!e.target.closest('.drag-handle')) openDuaDetail(d);
                });
                fragment.appendChild(card);
            }
            container.appendChild(fragment);
        }

        // Touch drag for favorites — mirrors initDuaTouchDrag but operates on favList
        let _favDragSrcFavIdx = null;
        function initFavTouchDrag(handle, card, favIdx) {
            let _pressTimer = null;
            let _dragActive = false;

            handle.addEventListener('touchstart', e => {
                e.stopPropagation();
                _dragActive = false;
                _pressTimer = setTimeout(() => {
                    _dragActive = true;
                    _favDragSrcFavIdx = favIdx;
                    card.classList.add('dragging');
                    if (navigator.vibrate) navigator.vibrate(30);
                }, 500);
            }, { passive: true });

            handle.addEventListener('touchmove', e => {
                if (!_dragActive || _favDragSrcFavIdx === null) {
                    if (_pressTimer) { clearTimeout(_pressTimer); _pressTimer = null; }
                    return;
                }
                e.preventDefault();
                const touch = e.touches[0];
                document.querySelectorAll('#favList .dua-card').forEach((c) => {
                    const r = c.getBoundingClientRect(); c.classList.remove('drag-over');
                    const cFavIdx = parseInt(c.dataset.favIndex);
                    if (touch.clientY >= r.top && touch.clientY <= r.bottom && cFavIdx !== _favDragSrcFavIdx) c.classList.add('drag-over');
                });
            }, { passive: false });

            handle.addEventListener('touchend', e => {
                if (_pressTimer) { clearTimeout(_pressTimer); _pressTimer = null; }
                if (!_dragActive || _favDragSrcFavIdx === null) { _dragActive = false; return; }
                const touch = e.changedTouches[0]; let targetFavIdx = null;
                document.querySelectorAll('#favList .dua-card').forEach((c) => {
                    const r = c.getBoundingClientRect(); c.classList.remove('drag-over');
                    if (touch.clientY >= r.top && touch.clientY <= r.bottom) targetFavIdx = parseInt(c.dataset.favIndex);
                });
                if (targetFavIdx !== null && targetFavIdx !== _favDragSrcFavIdx) {
                    const allFavs = duas.filter(d => d.favorite);
                    const srcId = allFavs[_favDragSrcFavIdx]?.id;
                    const tgtId = allFavs[targetFavIdx]?.id;
                    if (srcId && tgtId) {
                        const srcDuaIdx = duas.findIndex(x => x.id === srcId);
                        const tgtDuaIdx = duas.findIndex(x => x.id === tgtId);
                        if (srcDuaIdx !== -1 && tgtDuaIdx !== -1) {
                            const [moved] = duas.splice(srcDuaIdx, 1);
                            duas.splice(tgtDuaIdx, 0, moved);
                            saveDataDebounced(); renderDuas(); renderFavorites();
                        }
                    }
                } else { card.classList.remove('dragging'); }
                _favDragSrcFavIdx = null;
                _dragActive = false;
            });

            handle.addEventListener('touchcancel', () => {
                if (_pressTimer) { clearTimeout(_pressTimer); _pressTimer = null; }
                card.classList.remove('dragging');
                document.querySelectorAll('#favList .dua-card').forEach(c => c.classList.remove('drag-over'));
                _favDragSrcFavIdx = null;
                _dragActive = false;
            });
        }

        function handleDragStart(e) {
            dragSrcIndex = parseInt(this.dataset.index);
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', dragSrcIndex);
        }
        function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; this.classList.add('drag-over'); }
        function handleDragLeave(e) { this.classList.remove('drag-over'); }
        function handleDrop(e) {
            e.preventDefault(); this.classList.remove('drag-over');
            const targetIdx = parseInt(this.dataset.index);
            if (dragSrcIndex !== null && dragSrcIndex !== targetIdx) {
                const [moved] = duas.splice(dragSrcIndex, 1);
                duas.splice(targetIdx, 0, moved);
                saveDataDebounced(); renderDuas(); renderFavorites();
            }
            dragSrcIndex = null;
        }
        function handleDragEnd(e) { this.classList.remove('dragging'); document.querySelectorAll('.drag-over').forEach(c => c.classList.remove('drag-over')); }

        // Touch drag for dua cards — long-press to activate
        let _duaTouchSrc = null;
        function initDuaTouchDrag(handle, card, idx) {
            let _pressTimer = null;
            let _dragActive = false;

            handle.addEventListener('touchstart', e => {
                e.stopPropagation();
                _dragActive = false;
                _pressTimer = setTimeout(() => {
                    _dragActive = true;
                    _duaTouchSrc = idx;
                    _duaDragSrcId = duas[idx]?.id || null;
                    card.classList.add('dragging');
                    if (navigator.vibrate) navigator.vibrate(30);
                    // Create ghost label
                    _duaGhostCreate(duas[idx]);
                }, 500);
            }, { passive: true });

            handle.addEventListener('touchmove', e => {
                if (!_dragActive || _duaTouchSrc === null) {
                    // Cancel long press if finger moved before threshold
                    if (_pressTimer) { clearTimeout(_pressTimer); _pressTimer = null; }
                    return;
                }
                e.preventDefault();
                const touch = e.touches[0];

                // Move ghost
                _duaGhostMove(touch.clientX, touch.clientY);

                // Highlight folder under finger (priority over card reorder)
                let overFolder = null;
                document.querySelectorAll('.dua-folder').forEach(fd => {
                    const r = fd.getBoundingClientRect();
                    if (touch.clientX >= r.left && touch.clientX <= r.right &&
                        touch.clientY >= r.top  && touch.clientY <= r.bottom) {
                        overFolder = fd;
                    }
                    fd.classList.remove('folder-drag-over');
                });
                if (overFolder) {
                    overFolder.classList.add('folder-drag-over');
                    // Remove card highlights when hovering a folder
                    document.querySelectorAll('#duaList .dua-card').forEach(c => c.classList.remove('drag-over'));
                } else {
                    // Highlight card-to-card position
                    document.querySelectorAll('#duaList .dua-card').forEach((c) => {
                        const r = c.getBoundingClientRect(); c.classList.remove('drag-over');
                        const cIdx = parseInt(c.dataset.index);
                        if (touch.clientY >= r.top && touch.clientY <= r.bottom && cIdx !== _duaTouchSrc) c.classList.add('drag-over');
                    });
                }
            }, { passive: false });

            handle.addEventListener('touchend', e => {
                if (_pressTimer) { clearTimeout(_pressTimer); _pressTimer = null; }
                _duaGhostRemove();
                document.querySelectorAll('.dua-folder').forEach(fd => fd.classList.remove('folder-drag-over'));

                if (!_dragActive || _duaTouchSrc === null) { _dragActive = false; return; }
                const touch = e.changedTouches[0];

                // Check if dropped on a folder first
                let droppedFolder = null;
                document.querySelectorAll('.dua-folder').forEach(fd => {
                    const r = fd.getBoundingClientRect();
                    if (touch.clientX >= r.left && touch.clientX <= r.right &&
                        touch.clientY >= r.top  && touch.clientY <= r.bottom) {
                        droppedFolder = fd;
                    }
                });

                if (droppedFolder && _duaDragSrcId) {
                    const fid = droppedFolder.dataset.folderId;
                    card.classList.remove('dragging');
                    _dropDuaIntoFolder(_duaDragSrcId, fid);
                } else {
                    // Card-to-card reorder
                    let targetIdx = null;
                    document.querySelectorAll('#duaList .dua-card').forEach((c) => {
                        const r = c.getBoundingClientRect(); c.classList.remove('drag-over');
                        if (touch.clientY >= r.top && touch.clientY <= r.bottom) targetIdx = parseInt(c.dataset.index);
                    });
                    if (targetIdx !== null && targetIdx !== _duaTouchSrc) {
                        const [moved] = duas.splice(_duaTouchSrc, 1);
                        duas.splice(targetIdx, 0, moved);
                        saveDataDebounced(); renderDuas(); renderFavorites();
                    } else { card.classList.remove('dragging'); }
                }

                _duaTouchSrc = null;
                _duaDragSrcId = null;
                _dragActive = false;
            });

            handle.addEventListener('touchcancel', () => {
                if (_pressTimer) { clearTimeout(_pressTimer); _pressTimer = null; }
                _duaGhostRemove();
                card.classList.remove('dragging');
                document.querySelectorAll('#duaList .dua-card').forEach(c => c.classList.remove('drag-over'));
                document.querySelectorAll('.dua-folder').forEach(fd => fd.classList.remove('folder-drag-over'));
                _duaTouchSrc = null;
                _duaDragSrcId = null;
                _dragActive = false;
            });
        }

        // ---- Ghost helpers (touch drag preview label) ----
        function _duaGhostCreate(dua) {
            _duaGhostRemove();
            if (!dua) return;
            const el = document.createElement('div');
            el.id = 'duaDragGhost';
            el.textContent = dua.name || dua.text || '…';
            document.body.appendChild(el);
        }
        function _duaGhostMove(x, y) {
            const el = document.getElementById('duaDragGhost');
            if (!el) return;
            el.style.left = x + 'px';
            el.style.top  = y + 'px';
        }
        function _duaGhostRemove() {
            const el = document.getElementById('duaDragGhost');
            if (el) el.remove();
        }

        function toggleFavorite(id) {
            const dua = duas.find(d => d.id === id); if (!dua) return;
            dua.favorite = !dua.favorite; saveDataDebounced(); renderDuas(); _dirty.dua = false; renderFavorites(); _dirty.favorites = false;
            // Folder dua cards live in a separate container (#duaFoldersContainer)
            // that renderDuas() does NOT rebuild. Re-rendering all folders here
            // would collapse the open folder, so instead we patch the heart icon
            // in-place on every folder card that represents this dua. This makes
            // the favourite state flip instantly, matching the flat list.
            document.querySelectorAll('#duaFoldersContainer .dua-card').forEach(card => {
                if (card.dataset.duaId === id) {
                    const favBtn = card.querySelector('.dua-action-btn');
                    if (favBtn) favBtn.classList.toggle('fav-active', dua.favorite);
                }
            });
            showToast(dua.favorite ? t('toastFavAdded') : t('toastFavRemoved'));
        }
        function openDuaModal() {
            document.getElementById('duaEditId').value = '';
            document.getElementById('duaText').value = document.getElementById('duaTrans').value = '';
            document.getElementById('duaName').value = '';
            document.getElementById('modalTitle').innerText = t('modalTitleNew');
            document.getElementById('duaModal').classList.add('show');
        }
        function editDua(id) {
            // Единый стиль: редактирование дуа использует ту же модалку (cl-modal),
            // что и добавление — как в специальных зикрах (одна форма на add/edit).
            const d = duas.find(i => i.id === id); if (!d) return;
            _duaFolderEditId = id;
            _duaFolderSelected = 'none';
            const wrap = document.getElementById('duaFolderSelectWrap');
            const title = document.getElementById('duaFolderModalTitle');
            const confirmBtn = document.getElementById('duaFolderConfirmBtn');
            const cancelBtn = document.getElementById('duaFolderCancelBtn');
            const input = document.getElementById('duaFolderInput');
            const dName = document.getElementById('duaFolderDuaName');
            const dText = document.getElementById('duaFolderDuaText');
            const dTrans = document.getElementById('duaFolderDuaTrans');
            const dDetail = document.getElementById('duaFolderDuaDetail');
            if (input) input.value = '';
            if (dName) { dName.value = d.name || ''; dName.placeholder = t('placeholderDuaName'); }
            if (dText) { dText.value = d.text || ''; dText.placeholder = t('placeholderDua'); }
            if (dTrans) { dTrans.value = d.translation || ''; dTrans.placeholder = t('placeholderTrans'); }
            if (dDetail) { dDetail.value = d.detail || ''; dDetail.placeholder = t('detailMoreLabel'); }
            // Папка не выбирается при редактировании — скрываем селектор
            if (wrap) wrap.style.display = 'none';
            _toggleDuaFolderFields('none');
            if (title) title.textContent = t('modalTitleEdit');
            if (confirmBtn) confirmBtn.textContent = t('btnSaveDua');
            if (cancelBtn) cancelBtn.textContent = t('addFolderCancel');
            document.getElementById('duaFolderOverlay').classList.add('show');
        }
        function saveDua() {
            const text = document.getElementById('duaText').value.trim();
            if (!text) { showToast(t('toastEnterText')); return; }
            const name = document.getElementById('duaName').value.trim();
            const trans = document.getElementById('duaTrans').value.trim();
            const editId = document.getElementById('duaEditId').value;
            if (editId) {
                const dua = duas.find(d => d.id === editId);
                if (dua) {
                    dua.text = text; dua.name = name; dua.translation = trans;
                    if (dua.builtin) delete dua.builtin;
                }
            } else {
                duas.push({ id: 'dua_' + Date.now(), text, name, translation: trans, favorite: false, created: Date.now() });
            }
            saveDataDebounced(); markDirty('dua','favorites'); renderDuaFolders(); renderDuas(); _dirty.dua = false; renderFavorites(); _dirty.favorites = false; closeDuaModal(); showToast(t('toastSaved'));
        }
        function promptDeleteDua(id) { deleteId = id; document.getElementById('deleteDuaOverlay').classList.add('show'); }
        function confirmDeleteDua() {
            if (deleteId) {
                // Also remove from any folder
                duaFolders.forEach(f => { f.duaIds = f.duaIds.filter(id => id !== deleteId); });
                saveDuaFolders();
                duas = duas.filter(d => d.id !== deleteId); deleteId = null; saveDataDebounced(); markDirty('dua','favorites'); renderDuaFolders(); renderDuas(); _dirty.dua = false; renderFavorites(); _dirty.favorites = false; showToast(t('toastDeleted'));
            }
            document.getElementById('deleteDuaOverlay').classList.remove('show');
        }
        function cancelDeleteDua() { deleteId = null; document.getElementById('deleteDuaOverlay').classList.remove('show'); }
        function closeDuaModal() { document.getElementById('duaModal').classList.remove('show'); }
        function closeDuaModalOnBg(e) { if (e.target === document.getElementById('duaModal')) closeDuaModal(); }

        function openDuaDetail(d) {
            const card = document.getElementById('duaDetailCard');
            const name = d.name || '';
            const text = d.text || '';
            const trans = d.translation || '';
            const detail = d.detail || '';
            // Страница 1 — как обычно: название, текст и описание дуа
            const page1 = `
                ${name ? `<div class="detail-title">${name}</div>` : ''}
                <div class="detail-text">${text}</div>
                ${trans ? `<div class="detail-desc">${trans}</div>` : ''}`;
            // Страница 2 — «Подробнее»: расширенное описание (если заполнено)
            const page2 = detail ? `
                <div class="detail-more-label">${t('detailMoreLabel')}</div>
                <div class="detail-desc">${detail}</div>` : '';
            _renderDetailPager(card, [page1, page2]);
            document.getElementById('duaDetailOverlay').classList.add('show');
        }
        function closeDuaDetail() { document.getElementById('duaDetailOverlay').classList.remove('show'); }

        // ==================== DUA FOLDERS ====================
        let duaFolders = []; // [{ id, name, duaIds: [] }]

        function loadDuaFolders() {
            try {
                const saved = localStorage.getItem('azkar_dua_folders');
                if (saved) duaFolders = JSON.parse(saved);
            } catch(e) { duaFolders = []; }
        }

        function saveDuaFolders() {
            localStorage.setItem('azkar_dua_folders', JSON.stringify(duaFolders));
            markDataChanged();
        }

        // ==================== DEFAULT "99 NAMES OF ALLAH" DUA FOLDER ====================
        // The 99 names now ship as ordinary user content: one default folder
        // inside Duas. Each entry has no Arabic text: title (translit), text
        // (meaning), description (explanation) and an empty "details" field.
        // Seeded once. Deleting the folder leaves a tombstone so it is never
        // resurrected behind the user's back.
        const NAMES99_FOLDER_ID = 'duafolder_names99';
        const NAMES99_DELETED_KEY = 'azkar_names99_dua_deleted';

        function _names99DuaFields(n, lang) {
            return {
                // Name (title): localized transliteration, e.g. "Ар-Рахман".
                name: getTranslit(n, lang),
                // Text: the meaning of the name, e.g. "Милостивый".
                text: n[lang] || n.en || n.ru || '',
                // Description: the explanation previously shown under "Подробнее".
                // Full translations exist for ru/en/uz; other languages fall
                // back to English exactly like the old names screen did.
                translation: n['desc_' + lang] || n.desc_en || n.desc_ru || '',
                // The "Подробнее" page stays empty.
                detail: ''
            };
        }

        function ensureNames99DuaFolder() {
            // The folder id is stable even if the user renames the folder.
            if (duaFolders.some(f => f && f.id === NAMES99_FOLDER_ID)) return;
            try {
                if (localStorage.getItem(NAMES99_DELETED_KEY) === '1') return;
            } catch (e) {}
            // Данные ещё не скачаны — скачиваем и повторяем (папка появится сама).
            if (!names99Ready(currentLang)) {
                loadNames99().then(list => { if (Array.isArray(list) && list.length && names99Ready(currentLang)) ensureNames99DuaFolder(); });
                return;
            }
            if (names99.length === 0) return;

            const ids = [];
            names99.forEach((n, i) => {
                const id = 'name99_' + i;
                let dua = duas.find(d => d.id === id);
                if (!dua) {
                    dua = { id: id, favorite: false, created: Date.now(), builtin: 'name99' };
                    Object.assign(dua, _names99DuaFields(n, currentLang));
                    duas.push(dua);
                } else if (dua.builtin === 'name99') {
                    Object.assign(dua, _names99DuaFields(n, currentLang));
                }
                ids.push(id);
            });
            duaFolders.unshift({
                id: NAMES99_FOLDER_ID,
                name: t('namesTitle'),
                builtin: 'names99',
                duaIds: ids
            });
            try {
                localStorage.setItem('azkar_duas', JSON.stringify(duas));
                localStorage.setItem('azkar_dua_folders', JSON.stringify(duaFolders));
                localStorage.setItem(NAMES99_SYNC_FLAG, currentLang + '|' + DATA_VERSION);
            } catch (e) {}
            markDataChanged();
            // The seed happens after the startup render, so refresh both the
            // folder list and the flat list (otherwise the new folder would
            // only show up after a language change or a reload).
            if (document.getElementById('duaFoldersContainer')) {
                renderDuaFolders();
                renderDuas();
                _dirty.dua = false;
            }
        }

        // Re-localize the built-in folder after a language change. The folder
        // name is only updated while it still carries the builtin marker (a
        // user rename clears it), but the 99 entries themselves stay localized.
        // Первый вызов при запуске может доверять отметке «уже синхронизировано
        // на этом языке» и не скачивать файл 99 имён. Все последующие (смена
        // языка, импорт, облако) проверяют по-настоящему.
        let _names99TrustSyncFlag = true;
        function _syncNames99FolderLanguage() {
            const syncKey = currentLang + '|' + DATA_VERSION;
            const trustFlag = _names99TrustSyncFlag;
            _names99TrustSyncFlag = false;
            if (!names99Ready(currentLang)) {
                let alreadySynced = false;
                try { alreadySynced = trustFlag && localStorage.getItem(NAMES99_SYNC_FLAG) === syncKey; } catch (e) {}
                const hasNames = duas.some(d => d && d.builtin === 'name99');
                if (alreadySynced || !hasNames) {
                    _syncNames99FolderName();
                    return;
                }
                const langAtCall = currentLang;
                loadNames99(langAtCall).then(list => {
                    if (!Array.isArray(list) || currentLang !== langAtCall || !names99Ready(langAtCall)) return;
                    _syncNames99FolderLanguage();
                    // Перерисовать открытый раздел сразу, скрытые — при открытии.
                    if (_isScreenActive('screen-dua')) { renderDuaFolders(); renderDuas(); _dirty.dua = false; _dirty.duaFolders = false; }
                    else markDirty('dua', 'duaFolders');
                    if (_isScreenActive('screen-favorites')) { renderFavorites(); _dirty.favorites = false; }
                    else markDirty('favorites');
                });
                _syncNames99FolderName();
                return;
            }
            const folder = duaFolders.find(f => f && f.id === NAMES99_FOLDER_ID);
            let changed = false;
            if (folder && folder.builtin === 'names99') {
                const translatedName = t('namesTitle');
                if (folder.name !== translatedName) {
                    folder.name = translatedName;
                    changed = true;
                }
            }
            if (Array.isArray(names99) && names99.length) {
                const byId = new Map(duas.map(d => [d.id, d]));
                names99.forEach((n, i) => {
                    const d = byId.get('name99_' + i);
                    if (!d || d.builtin !== 'name99') return;
                    const fields = _names99DuaFields(n, currentLang);
                    if (d.name !== fields.name || d.text !== fields.text ||
                        d.translation !== fields.translation || d.detail !== fields.detail) {
                        Object.assign(d, fields);
                        changed = true;
                    }
                });
            }
            // Persist the one-time migration from the old Arabic cards.
            if (changed) saveDataDebounced();
            try { localStorage.setItem(NAMES99_SYNC_FLAG, currentLang + '|' + DATA_VERSION); } catch (e) {}
        }
        // Только название папки (берётся из переводов интерфейса, данные не нужны).
        function _syncNames99FolderName() {
            const folder = duaFolders.find(f => f && f.id === NAMES99_FOLDER_ID);
            if (folder && folder.builtin === 'names99') {
                const translatedName = t('namesTitle');
                if (folder.name !== translatedName) {
                    folder.name = translatedName;
                    saveDataDebounced();
                }
            }
        }

        function closeOpenDuaFolders() {
            document.querySelectorAll('#duaFoldersContainer .dua-folder.acc-open').forEach(fd => fd.classList.remove('acc-open'));
        }

        function getDuasInFolder(folderId) {
            const folder = duaFolders.find(f => f.id === folderId);
            if (!folder) return [];
            return folder.duaIds.map(id => duas.find(d => d.id === id)).filter(Boolean);
        }

        function getUnfolderedDuas() {
            const allFolderIds = new Set();
            duaFolders.forEach(f => f.duaIds.forEach(id => allFolderIds.add(id)));
            return duas.filter(d => !allFolderIds.has(d.id));
        }

        function renderDuaFolders() {
            const container = document.getElementById('duaFoldersContainer');
            if (!container) return;
            container.innerHTML = '';
            if (duaFolders.length === 0) return;

            duaFolders.forEach((folder, f) => {
                const folderDuas = getDuasInFolder(folder.id);
                const folderDiv = document.createElement('div');
                folderDiv.className = 'cl-folder dua-folder acc-folder';
                folderDiv.id = 'duaFolder' + f;
                folderDiv.dataset.folderId = folder.id;
                folderDiv.innerHTML = `
                    <div class="cl-folder-header" onclick="toggleDuaFolder(${f})">
                        <div class="cl-folder-left">
                            <div class="cl-folder-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                            </div>
                            <div class="cl-folder-info">
                                <div class="cl-folder-name">${escHtml(folder.name)}</div>
                                <div class="cl-folder-progress-text">${folderDuas.length} ${t('duaCountLabel')}</div>
                            </div>
                        </div>
                        <div class="cl-folder-right">
                            <button class="cl-folder-add-sub" onclick="event.stopPropagation();openDuaAddInFolder(${f})" title="${escAttr(t('modalTitleNew'))}">
                                <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                            </button>
                            <button class="cl-folder-edit" onclick="event.stopPropagation();renameDuaFolder(${f})" title="${escAttr(t('titleRenameFolder'))}">
                                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button class="cl-folder-delete" onclick="event.stopPropagation();deleteDuaFolder(${f})" title="${escAttr(t('titleDeleteFolder'))}">
                                <svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                            </button>
                            <svg class="cl-folder-chevron" id="duaFolderChevron${f}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                    </div>
                    <div class="cl-folder-body" id="duaFolderBody${f}">
                        <div class="dua-folder-list-wrap">
                            <div class="dua-list dua-folder-list" id="duaFolderList${f}"></div>
                        </div>
                    </div>`;
                container.appendChild(folderDiv);

                // ---- Desktop drag-into-folder drop targets ----
                folderDiv.addEventListener('dragover', function(e) {
                    if (dragSrcIndex === null && _duaDragSrcId === null) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    document.querySelectorAll('.dua-folder').forEach(fd => fd.classList.remove('folder-drag-over'));
                    this.classList.add('folder-drag-over');
                });
                folderDiv.addEventListener('dragleave', function(e) {
                    // only remove if leaving the folder div itself (not entering a child)
                    if (!this.contains(e.relatedTarget)) {
                        this.classList.remove('folder-drag-over');
                    }
                });
                folderDiv.addEventListener('drop', function(e) {
                    e.preventDefault();
                    this.classList.remove('folder-drag-over');
                    const fid = this.dataset.folderId;
                    if (!fid) return;
                    // determine which dua was being dragged
                    let duaId = _duaDragSrcId;
                    if (!duaId && dragSrcIndex !== null) {
                        duaId = duas[dragSrcIndex]?.id;
                    }
                    if (!duaId) return;
                    _dropDuaIntoFolder(duaId, fid);
                    dragSrcIndex = null;
                    _duaDragSrcId = null;
                });

                // Render duas inside folder
                const listEl = document.getElementById('duaFolderList' + f);
                if (listEl && folderDuas.length > 0) {
                    folderDuas.forEach(d => {
                        const card = _createDuaCard(d, folder.id);
                        listEl.appendChild(card);
                    });
                } else if (listEl) {
                    listEl.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text-dim);font-size:0.8rem;">${t('emptyFolder')}</div>`;
                }
            });
        }

        // Move a dua (by id) into a folder (by folderId), removing from any other folder first
        function _dropDuaIntoFolder(duaId, folderId) {
            if (!duaId || !folderId) return;
            // Remove from any existing folder
            duaFolders.forEach(f => {
                f.duaIds = f.duaIds.filter(id => id !== duaId);
            });
            // Add to target folder (avoid duplicates)
            const targetFolder = duaFolders.find(f => f.id === folderId);
            if (!targetFolder) return;
            if (!targetFolder.duaIds.includes(duaId)) {
                targetFolder.duaIds.push(duaId);
            }
            saveDuaFolders();
            saveDataDebounced();
            renderDuaFolders();
            renderDuas();
            // Show toast
            showToast(t('toastMovedToFolder').replace('{name}', targetFolder.name));
            if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
        }

        function _createDuaCard(d, folderId) {
            const idx = duas.findIndex(x => x.id === d.id);
            const card = document.createElement('div');
            card.className = 'dua-card';
            card.dataset.index = idx;
            card.dataset.folderId = folderId || '';
            card.dataset.duaId = d.id;

            // Drag handle — long-press (touch) or drag (desktop) to move the
            // dua between folders, reorder inside a folder, or out onto the page.
            const dragHandle = document.createElement('div'); dragHandle.className = 'drag-handle';
            dragHandle.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="9" cy="5" r="1.2" fill="currentColor"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="9" cy="19" r="1.2" fill="currentColor"/><circle cx="15" cy="5" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="19" r="1.2" fill="currentColor"/></svg>';
            initFolderDuaTouchDrag(dragHandle, card, d.id, folderId || null);
            card.appendChild(dragHandle);

            // Desktop drag
            card.draggable = true;
            card.addEventListener('dragstart', function(e) {
                _duaDragSrcId = d.id;
                dragSrcIndex = null;
                this.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', d.id);
            });
            card.addEventListener('dragover', function(e) {
                if (!_duaDragSrcId || _duaDragSrcId === d.id) return;
                e.preventDefault();
                e.stopPropagation();
                this.classList.add('drag-over');
            });
            card.addEventListener('dragleave', function() { this.classList.remove('drag-over'); });
            card.addEventListener('drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                this.classList.remove('drag-over');
                const srcId = _duaDragSrcId;
                const tgtFolderId = this.dataset.folderId;
                const tgtDuaId = this.dataset.duaId;
                _duaDragSrcId = null; dragSrcIndex = null;
                if (srcId && tgtDuaId && srcId !== tgtDuaId && tgtFolderId) {
                    _moveDuaBeforeTarget(srcId, tgtFolderId, tgtDuaId);
                }
            });
            card.addEventListener('dragend', function() {
                this.classList.remove('dragging');
                document.querySelectorAll('.dua-folder').forEach(fd => fd.classList.remove('folder-drag-over'));
                document.querySelectorAll('#duaFoldersContainer .dua-card').forEach(c => c.classList.remove('drag-over'));
            });

            const actions = document.createElement('div'); actions.className = 'dua-actions';
            const favBtn = document.createElement('button'); favBtn.className = 'dua-action-btn';
            if (d.favorite) favBtn.classList.add('fav-active');
            favBtn.title = d.favorite ? t('titleFavoriteRemove') : t('titleFavoriteAdd');
            favBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
            favBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleFavorite(d.id); });
            const editBtn = document.createElement('button'); editBtn.className = 'dua-action-btn edit';
            editBtn.title = t('titleEditDua');
            editBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
            editBtn.addEventListener('click', (e) => { e.stopPropagation(); editDua(d.id); });
            const delBtn = document.createElement('button'); delBtn.className = 'dua-action-btn danger';
            delBtn.title = t('titleDeleteDua');
            delBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
            delBtn.addEventListener('click', (e) => { e.stopPropagation(); promptDeleteDua(d.id); });
            actions.appendChild(favBtn); actions.appendChild(editBtn); actions.appendChild(delBtn);
            card.appendChild(actions);

            _appendDuaPagedContent(card, d);
            card.addEventListener('click', function(e) {
                if (!e.target.closest('.dua-action-btn') && !e.target.closest('.drag-handle')) openDuaDetail(d);
            });
            return card;
        }

        // Move a dua (by id) OUT of any folder onto the unfoldered page
        function _unfolderDua(duaId) {
            if (!duaId) return;
            let was = false;
            duaFolders.forEach(f => {
                if (f.duaIds.includes(duaId)) was = true;
                f.duaIds = f.duaIds.filter(id => id !== duaId);
            });
            if (!was) return; // already unfoldered — nothing to do
            saveDuaFolders();
            saveDataDebounced();
            renderDuaFolders();
            renderDuas();
            showToast(t('toastMovedOutOfFolder'));
            if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
        }

        // Reorder/move a dua so it sits right before `targetDuaId` inside
        // `targetFolderId`. Works for both reorder (same folder) and
        // positioned move (different folder).
        function _moveDuaBeforeTarget(srcDuaId, targetFolderId, targetDuaId) {
            if (!srcDuaId || !targetFolderId || srcDuaId === targetDuaId) return;
            const targetFolder = duaFolders.find(f => f.id === targetFolderId);
            if (!targetFolder) return;
            // Remove src from every folder first
            duaFolders.forEach(f => { f.duaIds = f.duaIds.filter(id => id !== srcDuaId); });
            // Insert before the target dua
            let ti = targetFolder.duaIds.indexOf(targetDuaId);
            if (ti < 0) ti = targetFolder.duaIds.length;
            targetFolder.duaIds.splice(ti, 0, srcDuaId);
            saveDuaFolders();
            saveDataDebounced();
            renderDuaFolders();
            renderDuas();
            const idx = duaFolders.findIndex(f => f.id === targetFolderId);
            if (idx >= 0) openDuaFolder(idx);
            if (navigator.vibrate) navigator.vibrate(20);
        }
        function initFolderDuaTouchDrag(handle, card, duaId, folderId) {
            let _pressTimer = null;
            let _dragActive = false;

            handle.addEventListener('touchstart', e => {
                e.stopPropagation();
                _dragActive = false;
                _pressTimer = setTimeout(() => {
                    _dragActive = true;
                    _duaDragSrcId = duaId;
                    card.classList.add('dragging');
                    if (navigator.vibrate) navigator.vibrate(30);
                    _duaGhostCreate(duas.find(x => x.id === duaId));
                }, 500);
            }, { passive: true });

            handle.addEventListener('touchmove', e => {
                if (!_dragActive) {
                    if (_pressTimer) { clearTimeout(_pressTimer); _pressTimer = null; }
                    return;
                }
                e.preventDefault();
                const touch = e.touches[0];
                _duaGhostMove(touch.clientX, touch.clientY);

                // Highlight a different folder under the finger
                let overFolder = null;
                document.querySelectorAll('.dua-folder').forEach(fd => {
                    const r = fd.getBoundingClientRect();
                    if (touch.clientX >= r.left && touch.clientX <= r.right &&
                        touch.clientY >= r.top  && touch.clientY <= r.bottom) {
                        overFolder = fd;
                    }
                    fd.classList.remove('folder-drag-over');
                });
                const dl = document.getElementById('duaList');
                const listEl = card.parentElement;
                if (listEl) listEl.querySelectorAll('.dua-card').forEach(c => c.classList.remove('drag-over'));
                if (overFolder && overFolder.dataset.folderId !== folderId) {
                    // hovering a different folder → move-into target
                    overFolder.classList.add('folder-drag-over');
                    if (dl) dl.classList.remove('dua-unfolder-target');
                } else if (overFolder && overFolder.dataset.folderId === folderId) {
                    // hovering own folder → reorder: highlight the card under the finger
                    if (dl) dl.classList.remove('dua-unfolder-target');
                    if (listEl) listEl.querySelectorAll('.dua-card').forEach(c => {
                        const r = c.getBoundingClientRect();
                        if (touch.clientY >= r.top && touch.clientY <= r.bottom && c.dataset.duaId !== duaId) c.classList.add('drag-over');
                    });
                } else {
                    // outside any folder → will drop onto the unfoldered page
                    if (dl) dl.classList.add('dua-unfolder-target');
                }
            }, { passive: false });

            handle.addEventListener('touchend', e => {
                if (_pressTimer) { clearTimeout(_pressTimer); _pressTimer = null; }
                _duaGhostRemove();
                document.querySelectorAll('.dua-folder').forEach(fd => fd.classList.remove('folder-drag-over'));
                document.querySelectorAll('#duaFoldersContainer .dua-card').forEach(c => c.classList.remove('drag-over'));
                const dl = document.getElementById('duaList'); if (dl) dl.classList.remove('dua-unfolder-target');
                const listEl = card.parentElement;
                card.classList.remove('dragging');

                if (!_dragActive) { _dragActive = false; return; }
                const touch = e.changedTouches[0];

                let droppedFolder = null;
                document.querySelectorAll('.dua-folder').forEach(fd => {
                    const r = fd.getBoundingClientRect();
                    if (touch.clientX >= r.left && touch.clientX <= r.right &&
                        touch.clientY >= r.top  && touch.clientY <= r.bottom) {
                        droppedFolder = fd;
                    }
                });

                if (droppedFolder) {
                    const fid = droppedFolder.dataset.folderId;
                    if (fid && fid !== folderId) {
                        _dropDuaIntoFolder(duaId, fid); // move to another folder
                    } else {
                        // same folder → reorder if dropped on another card
                        let targetDuaId = null;
                        if (listEl) listEl.querySelectorAll('.dua-card').forEach(c => {
                            const r = c.getBoundingClientRect();
                            if (touch.clientY >= r.top && touch.clientY <= r.bottom) targetDuaId = c.dataset.duaId;
                        });
                        if (targetDuaId && targetDuaId !== duaId) {
                            _moveDuaBeforeTarget(duaId, fid, targetDuaId);
                        } else {
                            renderDuaFolders(); // no valid target → reset
                        }
                    }
                } else {
                    _unfolderDua(duaId); // dropped outside any folder → unfolder
                }

                _duaDragSrcId = null;
                _dragActive = false;
            });

            handle.addEventListener('touchcancel', () => {
                if (_pressTimer) { clearTimeout(_pressTimer); _pressTimer = null; }
                _duaGhostRemove();
                card.classList.remove('dragging');
                document.querySelectorAll('.dua-folder').forEach(fd => fd.classList.remove('folder-drag-over'));
                document.querySelectorAll('#duaFoldersContainer .dua-card').forEach(c => c.classList.remove('drag-over'));
                const dl = document.getElementById('duaList'); if (dl) dl.classList.remove('dua-unfolder-target');
                _duaDragSrcId = null;
                _dragActive = false;
            });
        }

        // Открыть конкретную папку (используется после добавления дуа)
        function openDuaFolder(idx) {
            // Close all others first
            duaFolders.forEach((_, i) => {
                if (i !== idx) {
                    const fd = document.getElementById('duaFolder' + i);
                    if (fd) fd.classList.remove('acc-open');
                }
            });
            const fd = document.getElementById('duaFolder' + idx);
            if (fd) fd.classList.add('acc-open');
        }

        function toggleDuaFolder(idx) {
            const folderEl = document.getElementById('duaFolder' + idx);
            if (!folderEl) return;
            const isOpen = folderEl.classList.contains('acc-open');
            // Close all folders (accordion)
            duaFolders.forEach((_, i) => {
                const fd = document.getElementById('duaFolder' + i);
                if (fd) fd.classList.remove('acc-open');
            });
            // If was closed — open it
            if (!isOpen) {
                folderEl.classList.add('acc-open');
            }
        }

        function initDuaFolderOutsideClose() {
            const screen = document.getElementById('screen-dua');
            if (!screen || screen.dataset.outsideCloseBound === '1') return;
            screen.dataset.outsideCloseBound = '1';
            screen.addEventListener('click', function(e) {
                if (e.target.closest('#duaFoldersContainer .dua-folder')) return;
                if (e.target.closest('#duaList .dua-card')) return;
                if (e.target.closest('#duaSearch')) return;
                closeOpenDuaFolders();
            });
        }

        // ---- Dua Folder Modal ----
        let _duaFolderSelected = null; // null = new folder, number = index of existing folder (to add dua)
        let _duaFolderEditId = null;   // when set — модалка работает в режиме редактирования дуа

        function openDuaFolderModal() {
            const input = document.getElementById('duaFolderInput');
            const wrap = document.getElementById('duaFolderSelectWrap');
            const title = document.getElementById('duaFolderModalTitle');
            const confirmBtn = document.getElementById('duaFolderConfirmBtn');
            const cancelBtn = document.getElementById('duaFolderCancelBtn');
            _duaFolderSelected = null;
            _duaFolderEditId = null;
            if (input) input.value = '';
            // Reset the dua fields
            const dName = document.getElementById('duaFolderDuaName');
            const dText = document.getElementById('duaFolderDuaText');
            const dTrans = document.getElementById('duaFolderDuaTrans');
            const dDetail = document.getElementById('duaFolderDuaDetail');
            if (dName) { dName.value = ''; dName.placeholder = t('placeholderDuaName'); }
            if (dText) { dText.value = ''; dText.placeholder = t('placeholderDua'); }
            if (dTrans) { dTrans.value = ''; dTrans.placeholder = t('placeholderTrans'); }
            if (dDetail) { dDetail.value = ''; dDetail.placeholder = t('detailMoreLabel'); }
            if (title) title.textContent = t('addFolderTitle');
            if (input) input.placeholder = t('placeholderFolderName');
            if (confirmBtn) confirmBtn.textContent = t('addFolderConfirm');
            if (cancelBtn) cancelBtn.textContent = t('addFolderCancel');
            // Default view = create folder → show folder name input, hide dua fields
            _toggleDuaFolderFields(null);
            // Dropdown shown: «Новая папка» / «Без папки» (existing folders убраны)
            wrap.style.display = '';
            _buildDuaFolderDropdown();
            _updateDuaFolderSelectBtn(null);
            document.getElementById('duaFolderOverlay').classList.add('show');
        }

        // Добавить дуа прямо в конкретную папку (кнопка «+» в заголовке папки).
        // Селектор папки скрыт — папка уже выбрана, показываем только поля дуа.
        function openDuaAddInFolder(folderIdx) {
            if (!duaFolders[folderIdx]) return;
            _duaFolderSelected = folderIdx;
            _duaFolderEditId = null;
            const wrap = document.getElementById('duaFolderSelectWrap');
            const title = document.getElementById('duaFolderModalTitle');
            const confirmBtn = document.getElementById('duaFolderConfirmBtn');
            const cancelBtn = document.getElementById('duaFolderCancelBtn');
            const input = document.getElementById('duaFolderInput');
            const dName = document.getElementById('duaFolderDuaName');
            const dText = document.getElementById('duaFolderDuaText');
            const dTrans = document.getElementById('duaFolderDuaTrans');
            const dDetail = document.getElementById('duaFolderDuaDetail');
            if (input) input.value = '';
            if (dName) { dName.value = ''; dName.placeholder = t('placeholderDuaName'); }
            if (dText) { dText.value = ''; dText.placeholder = t('placeholderDua'); }
            if (dTrans) { dTrans.value = ''; dTrans.placeholder = t('placeholderTrans'); }
            if (dDetail) { dDetail.value = ''; dDetail.placeholder = t('detailMoreLabel'); }
            // Папка уже выбрана — скрываем выбор папки, показываем поля дуа
            if (wrap) wrap.style.display = 'none';
            _toggleDuaFolderFields(folderIdx);
            if (title) title.textContent = duaFolders[folderIdx].name;
            if (confirmBtn) confirmBtn.textContent = t('btnAdd');
            if (cancelBtn) cancelBtn.textContent = t('addFolderCancel');
            document.getElementById('duaFolderOverlay').classList.add('show');
            setTimeout(() => { if (dName) dName.focus(); }, 120);
        }

        // Show the folder-name input (for «Новая папка») or the dua fields
        // (for «Без папки» / an existing folder).
        function _toggleDuaFolderFields(idx) {
            const folderInput = document.getElementById('duaFolderInput');
            const duaFields = document.getElementById('duaFolderDuaFields');
            const isNewFolder = (idx === null);
            if (folderInput) folderInput.style.display = isNewFolder ? '' : 'none';
            if (duaFields) duaFields.style.display = isNewFolder ? 'none' : 'flex';
        }

        function _buildDuaFolderDropdown() {
            const dd = document.getElementById('duaFolderDropdown');
            if (!dd) return;
            dd.innerHTML = '';
            // 1) "New folder" option (default)
            const newOpt = document.createElement('div');
            newOpt.className = 'cl-folder-option active';
            newOpt.dataset.idx = '';
            newOpt.innerHTML = '<span class="fo-icon">➕</span><span class="fo-name">' + escHtml(t('addFolderTitle')) + '</span><svg class="fo-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
            newOpt.onclick = (e) => { e.stopPropagation(); _selectDuaFolderOption(null); };
            dd.appendChild(newOpt);
            // 2) "Without folder" option
            const noneOpt = document.createElement('div');
            noneOpt.className = 'cl-folder-option';
            noneOpt.dataset.idx = 'none';
            noneOpt.innerHTML = '<span class="fo-icon">📄</span><span class="fo-name">' + escHtml(t('noFolderOption')) + '</span><svg class="fo-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
            noneOpt.onclick = (e) => { e.stopPropagation(); _selectDuaFolderOption('none'); };
            dd.appendChild(noneOpt);
            // (Существующие папки убраны — дуа добавляется в папку через кнопку «+»
            //  в заголовке самой папки, как в специальных зикрах и задачах.)
        }

        function _selectDuaFolderOption(idx) {
            _duaFolderSelected = idx;
            _updateDuaFolderSelectBtn(idx);
            const btn = document.getElementById('duaFolderSelectBtn');
            const dd = document.getElementById('duaFolderDropdown');
            if (btn) btn.classList.remove('open');
            if (dd) dd.classList.remove('open');
            // Update active states
            document.querySelectorAll('#duaFolderDropdown .cl-folder-option').forEach(opt => {
                let optIdx;
                if (opt.dataset.idx === '') optIdx = null;
                else if (opt.dataset.idx === 'none') optIdx = 'none';
                else optIdx = parseInt(opt.dataset.idx);
                opt.classList.toggle('active', optIdx === idx);
            });
            // Update modal text
            const title = document.getElementById('duaFolderModalTitle');
            const input = document.getElementById('duaFolderInput');
            const confirmBtn = document.getElementById('duaFolderConfirmBtn');
            _toggleDuaFolderFields(idx);
            if (idx === null) {
                if (title) title.textContent = t('addFolderTitle');
                if (input) input.placeholder = t('placeholderFolderName');
                if (confirmBtn) confirmBtn.textContent = t('addFolderConfirm');
            } else if (idx === 'none') {
                if (title) title.textContent = t('noFolderOption');
                if (confirmBtn) confirmBtn.textContent = t('btnAdd');
            } else {
                if (title) title.textContent = duaFolders[idx].name;
                if (confirmBtn) confirmBtn.textContent = t('btnAdd');
            }
        }

        function _updateDuaFolderSelectBtn(idx) {
            const iconEl = document.getElementById('duaFolderSelectIcon');
            const textEl = document.getElementById('duaFolderSelectText');
            if (idx === null) {
                if (iconEl) iconEl.textContent = '➕';
                if (textEl) textEl.textContent = t('addFolderTitle');
            } else if (idx === 'none') {
                if (iconEl) iconEl.textContent = '📄';
                if (textEl) textEl.textContent = t('noFolderOption');
            } else {
                if (iconEl) iconEl.textContent = '📁';
                if (textEl) textEl.textContent = duaFolders[idx].name;
            }
        }

        function toggleDuaFolderDropdown(e) {
            e.stopPropagation();
            const btn = document.getElementById('duaFolderSelectBtn');
            const dd = document.getElementById('duaFolderDropdown');
            if (!btn || !dd) return;
            const isOpen = dd.classList.contains('open');
            btn.classList.toggle('open', !isOpen);
            dd.classList.toggle('open', !isOpen);
        }

        // Клик на карточке модала (не на кнопке выбора) — закрывает дропдаун
        function _closeDuaFolderDropdownOnCardClick(e) {
            if (e.target.closest('#duaFolderSelectBtn') || e.target.closest('#duaFolderDropdown')) return;
            const btn = document.getElementById('duaFolderSelectBtn');
            const dd = document.getElementById('duaFolderDropdown');
            if (btn) btn.classList.remove('open');
            if (dd) dd.classList.remove('open');
        }

        function closeDuaFolderModal() {
            document.getElementById('duaFolderOverlay').classList.remove('show');
            _duaFolderEditId = null;
            const btn = document.getElementById('duaFolderSelectBtn');
            const dd = document.getElementById('duaFolderDropdown');
            if (btn) btn.classList.remove('open');
            if (dd) dd.classList.remove('open');
        }

        function confirmDuaFolder() {
            const input = document.getElementById('duaFolderInput');
            const dNameEl = document.getElementById('duaFolderDuaName');
            const dTextEl = document.getElementById('duaFolderDuaText');
            const dTransEl = document.getElementById('duaFolderDuaTrans');
            const dDetailEl = document.getElementById('duaFolderDuaDetail');
            const duaName = dNameEl ? dNameEl.value.trim() : '';
            const duaText = dTextEl ? dTextEl.value.trim() : '';
            const duaTrans = dTransEl ? dTransEl.value.trim() : '';
            const duaDetail = dDetailEl ? dDetailEl.value.trim() : '';

            if (_duaFolderEditId) {
                // Режим редактирования существующего дуа
                if (!duaText) { showToast(t('toastEnterText')); if (dTextEl) dTextEl.focus(); return; }
                const dua = duas.find(d => d.id === _duaFolderEditId);
                if (dua) {
                    dua.text = duaText; dua.name = duaName; dua.translation = duaTrans; dua.detail = duaDetail;
                    // A manual edit turns a seeded name into user content: stop
                    // auto-localizing it on future language changes.
                    if (dua.builtin) delete dua.builtin;
                }
                _duaFolderEditId = null;
                saveDataDebounced(); markDirty('dua','favorites'); renderDuaFolders(); renderDuas(); _dirty.dua = false; renderFavorites(); _dirty.favorites = false;
                closeDuaFolderModal();
                showToast(t('toastSaved'));
                return;
            }

            if (_duaFolderSelected === 'none') {
                // Create a dua WITHOUT any folder (goes to the unfoldered page)
                if (!duaText) { showToast(t('toastEnterText')); if (dTextEl) dTextEl.focus(); return; }
                const newDua = { id: 'dua_' + Date.now(), text: duaText, name: duaName, translation: duaTrans, detail: duaDetail, favorite: false, created: Date.now() };
                duas.push(newDua);
                saveDataDebounced();
                renderDuaFolders();
                renderDuas();
                closeDuaFolderModal();
                showToast(t('toastSaved'));
            } else if (_duaFolderSelected !== null && duaFolders[_duaFolderSelected]) {
                // Add new dua to existing folder
                if (!duaText) { showToast(t('toastEnterText')); if (dTextEl) dTextEl.focus(); return; }
                const folderIdx = _duaFolderSelected;
                const newDua = { id: 'dua_' + Date.now(), text: duaText, name: duaName, translation: duaTrans, detail: duaDetail, favorite: false, created: Date.now() };
                duas.push(newDua);
                duaFolders[folderIdx].duaIds.push(newDua.id);
                saveDataDebounced();
                saveDuaFolders();
                renderDuaFolders();
                renderDuas();
                closeDuaFolderModal();
                // Open the folder so user sees the newly added dua
                openDuaFolder(folderIdx);
                showToast(t('toastMovedToFolder').replace('{name}', duaFolders[folderIdx].name));
            } else {
                // Create new folder
                const name = input ? input.value.trim() : '';
                if (!name) { if (input) input.focus(); return; }
                duaFolders.push({ id: 'duafolder_' + Date.now(), name, duaIds: [] });
                saveDuaFolders();
                renderDuaFolders();
                closeDuaFolderModal();
                showToast(t('toastFolderCreated').replace('{name}', name));
            }
        }

        let _deleteDuaFolderIdx = null;
        function deleteDuaFolder(idx) {
            if (!duaFolders[idx]) return;
            _deleteDuaFolderIdx = idx;
            const titleEl = document.getElementById('deleteDuaFolderTitle');
            const subEl = document.getElementById('deleteDuaFolderSub');
            if (titleEl) titleEl.textContent = t('deleteFolderTitle');
            if (subEl) subEl.textContent = t('deleteFolderSub');
            document.getElementById('deleteDuaFolderOverlay').classList.add('show');
        }
        function confirmDeleteDuaFolder() {
            if (_deleteDuaFolderIdx === null) return;
            const folder = duaFolders[_deleteDuaFolderIdx];
            const removingNames99 = !!(folder && folder.id === NAMES99_FOLDER_ID);
            duaFolders.splice(_deleteDuaFolderIdx, 1);
            _deleteDuaFolderIdx = null;
            if (removingNames99) {
                // Deleting the built-in names folder removes its generated
                // content and remembers the choice so it never reappears.
                try { localStorage.setItem(NAMES99_DELETED_KEY, '1'); } catch(e) {}
                const ids = new Set(folder.duaIds || []);
                duas = duas.filter(d => !(ids.has(d.id) && d.builtin === 'name99'));
                try { flushSave(); } catch(e) {}
            }
            saveDuaFolders();
            renderDuaFolders();
            renderDuas();
            renderFavorites();
            _dirty.dua = false;
            _dirty.favorites = false;
            document.getElementById('deleteDuaFolderOverlay').classList.remove('show');
        }
        function cancelDeleteDuaFolder() {
            _deleteDuaFolderIdx = null;
            document.getElementById('deleteDuaFolderOverlay').classList.remove('show');
        }

        // ==================== RENAME FOLDER (shared: dua + task) ====================
        let _renameFolderType = null; // 'dua' | 'task' | 'tasktask'
        let _renameFolderIdx = null;
        // Used when renaming an individual checklist task (_renameFolderType === 'tasktask')
        let _renameTaskFolder = null, _renameTaskIdx = null;

        function renameDuaFolder(idx) {
            if (!duaFolders[idx]) return;
            _renameFolderType = 'dua';
            _renameFolderIdx = idx;
            const input = document.getElementById('renameFolderInput');
            const title = document.getElementById('renameFolderTitle');
            const confirmBtn = document.getElementById('renameFolderConfirmBtn');
            if (title) title.textContent = t('renameFolderTitle');
            if (confirmBtn) confirmBtn.textContent = t('btnSaveDua');
            if (input) { input.placeholder = t('placeholderFolderName'); input.value = duaFolders[idx].name || ''; }
            setRenameTaskDailyVisible(false);
            document.getElementById('renameFolderOverlay').classList.add('show');
        }

        function renameChecklistFolder(idx) {
            if (!checklistFolders[idx]) return;
            _renameFolderType = 'task';
            _renameFolderIdx = idx;
            const input = document.getElementById('renameFolderInput');
            const title = document.getElementById('renameFolderTitle');
            const confirmBtn = document.getElementById('renameFolderConfirmBtn');
            if (title) title.textContent = t('renameFolderTitle');
            if (confirmBtn) confirmBtn.textContent = t('btnSaveDua');
            if (input) { input.placeholder = t('placeholderFolderName'); input.value = clGetName(checklistFolders[idx]) || ''; }
            setRenameTaskDailyVisible(false);
            document.getElementById('renameFolderOverlay').classList.add('show');
        }

        // Rename a single task inside a checklist folder. Reuses the shared
        // rename modal but swaps the title/placeholder to task-oriented text.
        function renameChecklistTask(folderIdx, taskIdx) {
            const folder = checklistFolders[folderIdx];
            if (!folder || !folder.tasks || !folder.tasks[taskIdx]) return;
            _renameFolderType = 'tasktask';
            _renameTaskFolder = folderIdx;
            _renameTaskIdx = taskIdx;
            const input = document.getElementById('renameFolderInput');
            const title = document.getElementById('renameFolderTitle');
            const confirmBtn = document.getElementById('renameFolderConfirmBtn');
            if (title) title.textContent = t('renameTaskTitle');
            if (confirmBtn) confirmBtn.textContent = t('btnSaveDua');
            if (input) { input.placeholder = t('placeholderTaskName'); input.value = clGetName(folder.tasks[taskIdx]) || ''; }
            if (folder.tasks[taskIdx].type === 'counter') {
                setRenameTaskDailyVisible(false);   // у счётчика нет режима «ежедневная»
            } else {
                _renameTaskDaily = isChecklistTaskDaily(folder.tasks[taskIdx]);
                setRenameTaskDailyVisible(true);
            }
            document.getElementById('renameFolderOverlay').classList.add('show');
        }

        function confirmRenameFolder() {
            const input = document.getElementById('renameFolderInput');
            const name = input ? input.value.trim() : '';
            if (!name) { if (input) input.focus(); return; }
            let toastMsg = t('toastFolderRenamed');
            if (_renameFolderType === 'dua' && duaFolders[_renameFolderIdx]) {
                const idx = _renameFolderIdx;
                duaFolders[idx].name = name;
                // Custom name: stop auto-updating it on language changes.
                delete duaFolders[idx].builtin;
                saveDuaFolders();
                renderDuaFolders();
                openDuaFolder(idx);
            } else if (_renameFolderType === 'special' && specialFolders[_renameFolderIdx]) {
                const idx = _renameFolderIdx;
                specialFolders[idx].name = name;
                saveSpecialFolders();
                renderSpecialList();
                const fd = document.getElementById('specialFolder' + idx);
                if (fd) fd.classList.add('acc-open');
            } else if (_renameFolderType === 'task' && checklistFolders[_renameFolderIdx]) {
                const idx = _renameFolderIdx;
                // Custom name overrides the localized default `names` map
                checklistFolders[idx].name = name;
                delete checklistFolders[idx].names;
                saveChecklist();
                renderChecklistFolders();
                updateChecklistUI();
                setTimeout(() => openFolderEl(idx), 50);
            } else if (_renameFolderType === 'tasktask'
                       && checklistFolders[_renameTaskFolder]
                       && checklistFolders[_renameTaskFolder].tasks[_renameTaskIdx]) {
                const fi = _renameTaskFolder, ti = _renameTaskIdx;
                const task = checklistFolders[fi].tasks[ti];
                // Custom name overrides the localized default `names` map
                task.name = name;
                delete task.names;
                if (task.type !== 'counter') task.daily = _renameTaskDaily;
                saveChecklist();
                renderChecklistFolders();
                updateChecklistUI();
                setTimeout(() => openFolderEl(fi), 50);
                toastMsg = t('toastTaskRenamed');
            } else if (_renameFolderType === 'addSubfolder' && checklistFolders[_renameFolderIdx]) {
                // Create a new subfolder inside the parent folder (создаётся закрытой)
                const fi = _renameFolderIdx;
                if (!Array.isArray(checklistFolders[fi].subfolders)) checklistFolders[fi].subfolders = [];
                checklistFolders[fi].subfolders.push({ name, tasks: [] });
                saveChecklist();
                renderChecklistFolders();
                updateChecklistUI();
                setTimeout(() => openFolderEl(fi), 50);
                toastMsg = '';
            } else if (_renameFolderType === 'addSubTask'
                       && checklistFolders[_renameTaskFolder]
                       && checklistFolders[_renameTaskFolder].subfolders
                       && checklistFolders[_renameTaskFolder].subfolders[_renameTaskIdx]) {
                const fi = _renameTaskFolder, si = _renameTaskIdx;
                checklistFolders[fi].subfolders[si].tasks.push({ name, done: false, daily: _renameTaskDaily });
                saveChecklist();
                renderChecklistFolders();
                updateChecklistUI();
                setTimeout(() => {
                    openFolderEl(fi);
                    const sfEl = document.getElementById('clSubfolder' + fi + '-' + si);
                    if (sfEl) sfEl.classList.add('acc-open');
                }, 50);
                toastMsg = '';
            } else if (_renameFolderType === 'addFolderTask' && checklistFolders[_renameTaskFolder]) {
                // Add a new task directly to this top-level folder
                const fi = _renameTaskFolder;
                if (!Array.isArray(checklistFolders[fi].tasks)) checklistFolders[fi].tasks = [];
                if (_renameAddCounter) {
                    // Задача-счётчик (напр. восполнение намазов): остаток + прогресс + «+1».
                    const tin = document.getElementById('renameTaskCounterTarget');
                    const target = parseInt(tin ? tin.value : '', 10);
                    if (!target || target < 1) { if (tin) tin.focus(); return; }
                    checklistFolders[fi].tasks.push({ name, type: 'counter', target: target, remaining: target, done: false, daily: false });
                } else {
                    checklistFolders[fi].tasks.push({ name, done: false, daily: _renameTaskDaily });
                }
                saveChecklist();
                renderChecklistFolders();
                updateChecklistUI();
                setTimeout(() => openFolderEl(fi), 50);
                toastMsg = '';
            } else if (_renameFolderType === 'subfolder'
                       && checklistFolders[_renameTaskFolder]
                       && checklistFolders[_renameTaskFolder].subfolders
                       && checklistFolders[_renameTaskFolder].subfolders[_renameTaskIdx]) {
                const fi = _renameTaskFolder, si = _renameTaskIdx;
                const sf = checklistFolders[fi].subfolders[si];
                sf.name = name;
                delete sf.names;
                saveChecklist();
                renderChecklistFolders();
                updateChecklistUI();
                setTimeout(() => {
                    openFolderEl(fi);
                    const sfEl = document.getElementById('clSubfolder' + fi + '-' + si);
                    if (sfEl) sfEl.classList.add('acc-open');
                }, 50);
                toastMsg = t('toastSubfolderRenamed');
            } else if (_renameFolderType === 'subtask'
                       && _renameSubTaskF !== null
                       && checklistFolders[_renameSubTaskF]
                       && checklistFolders[_renameSubTaskF].subfolders
                       && checklistFolders[_renameSubTaskF].subfolders[_renameSubTaskS]
                       && checklistFolders[_renameSubTaskF].subfolders[_renameSubTaskS].tasks[_renameSubTaskT]) {
                const fi = _renameSubTaskF, si = _renameSubTaskS, ti = _renameSubTaskT;
                const task = checklistFolders[fi].subfolders[si].tasks[ti];
                task.name = name;
                delete task.names;
                task.daily = _renameTaskDaily;
                saveChecklist();
                renderChecklistFolders();
                updateChecklistUI();
                setTimeout(() => {
                    openFolderEl(fi);
                    const sfEl = document.getElementById('clSubfolder' + fi + '-' + si);
                    if (sfEl) sfEl.classList.add('acc-open');
                }, 50);
                toastMsg = t('toastTaskRenamed');
            }
            closeRenameFolderModal();
            if (toastMsg) showToast(toastMsg);
        }

        function closeRenameFolderModal() {
            document.getElementById('renameFolderOverlay').classList.remove('show');
            _renameFolderType = null;
            _renameFolderIdx = null;
            _renameTaskFolder = null;
            _renameTaskIdx = null;
            _renameSubTaskF = null;
            _renameSubTaskS = null;
            _renameSubTaskT = null;
            _renameAddCounter = false;
            setRenameTaskDailyVisible(false);
        }

        /* ===== VIBRATION ===== */
        // Web Vibration API has multiple gotchas on modern mobile browsers:
        //   1. Must be called from inside a "transient user activation"
        //      handler (sync click/touch, no awaiting).
        //   2. Some Android Chrome builds reject the call if any previous
        //      vibrate() promise is still pending — so we cancel first.
        //   3. iOS Safari does not implement vibrate() at all — we silently
        //      no-op there.
        // We harden the call with a try/catch so a transient failure never
        // bubbles into the click handler and breaks the rest of the chain.
        function vibrate(level) {
            try {
                if (!settings || settings.vibration === false) return;
                if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
                const patterns = { 1: 25, 2: 60, 3: 130 };
                const lvl = (level !== undefined ? level : (settings.vibrationLevel || 3));
                const ms = patterns[lvl];
                if (!ms || ms <= 0) return;
                // Cancel any ongoing pattern, then fire — Chrome Android
                // sometimes drops back-to-back identical-length calls.
                navigator.vibrate(0);
                navigator.vibrate(ms);
            } catch (e) { /* swallow — vibration is best-effort */ }
        }
        // "Вибрация достижения цели / перехода" — срабатывает в тёмном режиме зикра,
        // когда цель достигнута (и для спец-зикров автоматически открывается следующий).
        // Намеренно сильно отличается от обычного тап-вибро (одиночный короткий импульс):
        // здесь чёткий узнаваемый ритм «бз-бз — ДЛИННЫЙ», чтобы достижение цели
        // ощущалось безошибочно даже при слабой отдаче мотора телефона.
        function vibrateAdvance() {
            try {
                if (!settings || settings.vibration === false) return;
                if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
                const lvl = settings.vibrationLevel || 3;
                // Паттерны: [импульс, пауза, импульс, пауза, ДЛИННЫЙ финальный].
                // Финальный импульс намеренно длинный — это и есть "цель достигнута".
                const patterns = {
                    1: [60, 50, 60, 50, 220],
                    2: [110, 60, 110, 60, 340],
                    3: [160, 80, 160, 80, 520]
                };
                const pat = patterns[lvl] || patterns[3];
                // Сбрасываем возможный одиночный тап-импульс и проигрываем паттерн.
                navigator.vibrate(0);
                navigator.vibrate(pat);
            } catch (e) { /* swallow — vibration is best-effort */ }
        }
        // ===== Быстрые иконки на экранах счётчика =====
        // Три места (settings.quickSlots) под кнопкой «Основной зикр» и на экране
        // особого зикра. Тап — то же, что короткий тап по строке в настройках;
        // удержание — карточка выбора: действия в порядке настроек (без языка,
        // данных, аккаунта, отзывов и «О приложении»). Одинаковые иконки управляют
        // одной настройкой — нажал одну, поменялись все. '' — пустое место.
        // icon — id иконки этой строки в настройках: берём её как есть (вкл/выкл).
        // dim — иконка в настройках не меняется, выключенное состояние показываем бледностью.
        var QUICK_ACTIONS = [
            { id: 'theme',          icon: 'themeIcon',          label: 'labelTheme',          on: () => true,                            run: () => toggleTheme() },
            { id: 'onlinePresence', icon: 'onlinePresenceIcon', label: 'labelOnlinePresence', on: () => settings.onlinePresence !== false, run: () => toggleSetting('onlinePresence'), dim: true },
            { id: 'liteMode',       icon: 'liteModeIcon',       label: 'labelLiteMode',       on: () => isLiteModeOn(),                  run: () => toggleLiteMode(), dim: true },
            { id: 'sound',          icon: 'soundIcon',          label: 'labelSound',          on: () => !!settings.sound,                run: () => toggleSetting('sound') },
            { id: 'clickSound',     icon: 'clickSoundIcon',     label: 'labelClickSound',     on: () => !!settings.clickSound,           run: () => toggleSetting('clickSound') },
            { id: 'vibration',      icon: 'vibrationIcon',      label: 'labelVibration',      on: () => !!settings.vibration,            run: () => toggleVibration() },
            { id: 'timerEnabled',   icon: 'timerIcon',          label: 'labelTimer',          on: () => settings.timerEnabled !== false, run: () => toggleSetting('timerEnabled'), dim: true },
            { id: 'autoAdvance',    icon: 'autoAdvanceIcon',    label: 'labelAutoAdvance',    on: () => !!settings.autoAdvance,          run: () => toggleSetting('autoAdvance'), dim: true },
            { id: 'pipCounter',     icon: 'pipIcon',            label: 'labelPip',            on: () => !!settings.pipCounter,           run: () => togglePipCounter(), dim: true },
            { id: 'stealthMode',    icon: 'stealthIcon',        label: 'labelStealth',        on: () => !!settings.stealthMode,          run: btn => _quickStealth(btn) },
            { id: 'notifMaster',    icon: 'hadithIcon',         label: 'labelNotifications',  on: () => notifMasterOn(),                 run: () => toggleNotifMaster() }
        ];
        var QUICK_DEFAULT = ['sound', 'clickSound', 'vibration'];
        const QUICK_HINT_KEY = 'azkar_quick_hint_shown';
        const QUICK_HOLD_MS = 600;
        let _quickPickSlot = -1;

        function _quickAction(id) { return QUICK_ACTIONS.find(a => a.id === id) || null; }
        function quickSlots() {
            const v = Array.isArray(settings.quickSlots) ? settings.quickSlots : QUICK_DEFAULT;
            return [0, 1, 2].map(i => (v[i] === '' || _quickAction(v[i])) ? v[i] : QUICK_DEFAULT[i]);
        }
        function _quickIconText(a) {
            const el = document.getElementById(a.icon);
            return el ? el.textContent.trim() : '';
        }
        // Тёмный режим с экрана счётчика: включили — сразу уходим в чёрный экран (с отсчётом)
        function _quickStealth(btn) {
            toggleSetting('stealthMode');
            const screen = btn && btn.closest('.screen');
            if (settings.stealthMode && screen && typeof window._stealthTryActivate === 'function') {
                window._stealthTryActivate(screen.id);
            }
        }
        function renderQuickToggles() {
            if (!QUICK_ACTIONS) return;   // вызвали раньше, чем дошли до объявления (var, без TDZ)
            const slots = quickSlots();
            document.querySelectorAll('.qt-btn').forEach(b => {
                const a = _quickAction(slots[+b.dataset.slot]);
                b.classList.toggle('qt-empty', !a);
                b.classList.toggle('qt-off', !!(a && a.dim && !a.on()));
                b.textContent = a ? _quickIconText(a) : '';
                b.setAttribute('aria-label', a ? t(a.label) : t('qtPickTitle'));
                if (a && a.id !== 'theme') b.setAttribute('aria-pressed', a.on() ? 'true' : 'false');
                else b.removeAttribute('aria-pressed');
            });
        }
        function _quickTap(btn) {
            const a = _quickAction(quickSlots()[+btn.dataset.slot]);
            if (!a) { openQuickPicker(+btn.dataset.slot); return; }
            a.run(btn);
            // Иконки в настройках обновляются внутри действия — переносим их сюда
            renderQuickToggles();
            requestAnimationFrame(renderQuickToggles);
            let shown = false;
            try { shown = localStorage.getItem(QUICK_HINT_KEY) === '1'; } catch (e) {}
            if (!shown) {
                try { localStorage.setItem(QUICK_HINT_KEY, '1'); } catch (e) {}
                setTimeout(() => showToast(t('qtHint'), 3000), 400);
            }
        }
        function openQuickPicker(slot) {
            _quickPickSlot = slot;
            const cur = quickSlots()[slot];
            const grid = document.getElementById('quickPickGrid');
            document.getElementById('quickPickTitle').textContent = t('qtPickTitle');
            grid.innerHTML = '';
            QUICK_ACTIONS.concat([{ id: '' }]).forEach(a => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'set-ic qt-pick' + (a.id ? '' : ' qt-empty') + (a.id === cur ? ' active' : '');
                b.textContent = a.id ? _quickIconText(a) : '';
                b.setAttribute('aria-label', a.id ? t(a.label) : t('qtEmpty'));
                b.onclick = () => pickQuickAction(a.id);
                grid.appendChild(b);
            });
            document.getElementById('quickPickOverlay').classList.add('show');
        }
        function closeQuickPicker() {
            document.getElementById('quickPickOverlay').classList.remove('show');
            _quickPickSlot = -1;
        }
        function pickQuickAction(id) {
            if (_quickPickSlot < 0) return;
            const slots = quickSlots();
            slots[_quickPickSlot] = id;
            settings.quickSlots = slots;
            saveDataDebounced();
            renderQuickToggles();
            closeQuickPicker();
        }
        // Тап и удержание (без системного меню и без двойного срабатывания)
        (function initQuickToggles() {
            document.querySelectorAll('.qt-btn').forEach(b => {
                let timer = null, held = false;
                b.addEventListener('pointerdown', e => {
                    if (e.pointerType === 'mouse' && e.button !== 0) return;
                    held = false;
                    clearTimeout(timer);
                    timer = setTimeout(() => {
                        timer = null; held = true;
                        openQuickPicker(+b.dataset.slot);
                    }, QUICK_HOLD_MS);
                });
                const cancel = () => { clearTimeout(timer); timer = null; };
                b.addEventListener('pointerup', cancel);
                b.addEventListener('pointerleave', cancel);
                b.addEventListener('pointercancel', cancel);
                b.addEventListener('contextmenu', e => e.preventDefault());
                b.addEventListener('click', e => {
                    if (held) { held = false; e.preventDefault(); return; }
                    _quickTap(b);
                });
            });
        })();

        // ===== Кнопки вокруг счётчика бледнеют, пока их не трогают =====
        // Через IDLE_MS без касаний кнопка «Основной зикр», быстрые иконки и цели
        // уходят до 30% (css: html.ui-idle). Нажатия на круг счётчика не будят —
        // пока считаешь, кнопки остаются в тени. Любое другое касание будит,
        // а нажатая бледная кнопка срабатывает сразу, без второго нажатия.
        (function initIdleFade() {
            const IDLE_MS = 4500;   // столько же живёт исчезающая подсказка сверху (initManualAddHint)
            const root = document.documentElement;
            let timer = null;
            function arm() { clearTimeout(timer); timer = setTimeout(sleep, IDLE_MS); }
            function sleep() {
                const dd = document.getElementById('postSalahDropdown');
                if (dd && dd.classList.contains('open')) { arm(); return; }
                root.classList.add('ui-idle');
            }
            function wake(e) {
                const el = e && e.target;
                if (el && el.closest && el.closest('.counter-ring-wrap, #stealthOverlay')) return;
                root.classList.remove('ui-idle');
                arm();
            }
            document.addEventListener('pointerdown', wake, true);
            document.addEventListener('keydown', wake, true);
            arm();
        })();

        function toggleVibration() {
            settings.vibration = !settings.vibration;
            if (settings.vibration && !settings.vibrationLevel) settings.vibrationLevel = 3;
            saveDataDebounced();
            updateSettingsUI();
            // Fire the test vibration synchronously so user-activation is
            // still valid (no setTimeout — it would consume the activation).
            if (settings.vibration) vibrate(settings.vibrationLevel || 3);
        }
        // Иконки у шкал: динамик меняет число волн по громкости (1–3 без волн, 4–7 одна, 8–10 две),
        // «телефон» — число дуг по силе вибрации (1–3). Волны только плавно гаснут/появляются.
        function setSpeakerIcon(id, vol) {
            const svg = document.getElementById(id);
            if (!svg) return;
            const w1 = svg.querySelector('.sp-w1'), w2 = svg.querySelector('.sp-w2');
            if (w1) w1.style.opacity = vol >= 4 ? '1' : '0';
            if (w2) w2.style.opacity = vol >= 8 ? '1' : '0';
        }
        function setVibrationIcon(lvl) {
            const svg = document.getElementById('vibrationSliderIcon');
            if (!svg) return;
            svg.querySelectorAll('.vb-a').forEach(p => {
                const k = p.classList.contains('vb-a3') ? 3 : p.classList.contains('vb-a2') ? 2 : 1;
                p.style.opacity = lvl >= k ? '1' : '0';
            });
        }
        function onVibrationSlider(val) {
            const lvl = parseInt(val);
            settings.vibrationLevel = lvl;
            saveDataDebounced();
            const labelEl = document.getElementById('vibrationSliderLabel');
            if (labelEl) labelEl.textContent = getVibLabel(lvl);
            const pct = ((lvl - 1) / 2 * 100).toFixed(0) + '%';
            document.getElementById('vibrationSlider').style.setProperty('--slider-pct', pct);
            setVibrationIcon(lvl);
        }
        function testVibration() {
            const lvl = parseInt(document.getElementById('vibrationSlider').value);
            if (lvl > 0 && settings.vibration) vibrate(lvl);
        }
        function getVibLabel(lvl) {
            const map = { 1: t('vibLow'), 2: t('vibMed'), 3: t('vibHigh') };
            return map[lvl] || t('vibHigh');
        }

        /* ===== EXPORT / IMPORT DATA ===== */
        function exportData() {
            try {
                // Сбрасываем отложенные сохранения в localStorage, чтобы снимок
                // был полностью актуальным на момент экспорта.
                flushSave();
                const now = new Date();
                    const pad = n => String(n).padStart(2, '0');
                    const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
                    const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
                    const data = {
                    version: 3,
                    exportedAt: now.toISOString(),
                    // ПОЛНЫЙ снимок всех данных приложения (папки, подпапки, задачи,
                    // задачи в подпапках, папки дуа, дуа, спец-зикры, статистика,
                    // настройки и т.д.). Именно он используется при импорте —
                    // благодаря ему НИЧЕГО не теряется и порядок сохраняется.
                    snapshot: AppStorage.exportAll(),
                    // --- Ниже ключевые поля продублированы в читаемом виде: для
                    //     совместимости со старыми бэкапами и просмотра глазами.
                    //     При импорте используется snapshot (если он есть). ---
                    settings: { ...settings, language: currentLang },
                    count: count,
                    goal: isUnlimited ? 999999999 : goal,
                    customGoal: customGoal,
                    duas: duas,
                    stats: JSON.parse(localStorage.getItem('azkar_stats_v2') || '{}'),
                    dhikrTotals: JSON.parse(localStorage.getItem('azkar_dhikr_totals') || '{}'),
                    completedSpecial: completedSpecial,
                    specialProgress: specialProgress,
                    specialResumeSessions: specialResumeSessions,
                    specialDhikrs: specialDhikrs
                };
                const json = JSON.stringify(data, null, 2);
                const fileName = `azkar-backup-${dateStr}_${timeStr}.json`;
                // APK: браузерного «скачивания» нет — файл сохраняет Android (native.js)
                if (typeof window.azkarSaveFile === 'function') {
                    window.azkarSaveFile(fileName, json).then(function (r) {
                        if (r && r.saved) showToast(t('toastExported') + ' — Download/' + fileName, 3500);
                    }).catch(function () { showToast(t('toastExportError')); });
                    return;
                }
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
            } catch (e) {
            }
        }

        // After an import/restore the imported dhikr numbers must become the
        // cloud numbers too (otherwise the next cloud update would bring the old
        // ones back).
        function syncImportedDhikrKeys(keys) {
            try {
                const list = (keys || []).filter(function(k) { return FIREBASE_ATOMIC_DHIKR_KEYS.has(k); });
                if (list.length) replaceFirebaseDhikrState(list);
            } catch(e) {}
        }

        function importData(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!data || typeof data !== 'object') throw new Error('bad format');

                    // ===== Полное восстановление из снимка (бэкапы v3+) =====
                    // snapshot содержит ВСЕ данные: задачи, папки, подпапки,
                    // задачи внутри подпапок, папки дуа, дуа, спец-зикры,
                    // статистику и настройки — ровно в том же порядке.
                    if (data.snapshot && typeof data.snapshot === 'object') {
                        AppStorage.importAll(data.snapshot);
                        // Перечитываем всё состояние из localStorage в память.
                        try {
                            const ss = localStorage.getItem('azkar_settings');
                            if (ss) Object.assign(settings, JSON.parse(ss));
                            currentLang = settings.language || 'en';
                            count = parseInt(localStorage.getItem('azkar_count') || '0');
                            const gg = localStorage.getItem('azkar_goal');
                            if (gg) { const pg = parseInt(gg); isUnlimited = (pg === UNLIMITED_GOAL); goal = isUnlimited ? 33 : pg; }
                            goalBaseline = parseInt(localStorage.getItem('azkar_goal_baseline') || '0');
                            if (isNaN(goalBaseline) || goalBaseline < 0 || goalBaseline > count) goalBaseline = 0; customBaseline = _readCustomBaseline();
                            customGoal = parseInt(localStorage.getItem('azkar_custom_goal') || '0');
                            duas = JSON.parse(localStorage.getItem('azkar_duas') || '[]');
                            loadDuaFolders();
                            _statsCache = JSON.parse(localStorage.getItem('azkar_stats_v2') || '{}');
                            completedSpecial = JSON.parse(localStorage.getItem('azkar_special_completed') || '{}');
                            specialProgress = JSON.parse(localStorage.getItem('azkar_special_progress') || '{}');
                            specialResumeSessions = JSON.parse(localStorage.getItem('azkar_special_resume_sessions') || '{}');
                            // Перечитываем общий прогресс зикров (azkar_dhikr_totals) в память —
                            // иначе экран «Прогресс» останется пустым после импорта, пока
                            // страница не будет перезагружена.
                            loadDhikrTotals();
                            loadCustomSpecialDhikrs();
                            lastActiveSpecialId = localStorage.getItem('azkar_last_special_id') || null;
                        } catch(e1) {}
                        // Задачи/списки перечитываем через loadChecklist() — он сам
                        // разберёт новый формат (списки) или мигрирует старый v4.
                        _invalidateDefaultsSync();
                        try { loadChecklist(); } catch(e4) {}
                        // applyLanguage перерисовывает дуа, папки дуа, избранное,
                        // имена, статистику, спец-зикры И задачи (папки/подпапки).
                        applyTheme(settings.theme || 'dark');
                        applyLanguage(currentLang);
                        ensureNames99DuaFolder();
                        updateDisplay();
                        updateSettingsUI();
                        updateHadithUI();
                        try { updateDhikrOverallProgress(); } catch(e5) {}
                        markDirty('dua','favorites','stats','special');
                        syncImportedDhikrKeys(Object.keys(data.snapshot));
                        try { showToast(t('toastImported')); } catch(e3) {}
                        return;
                    }

                    // ===== Совместимость со старыми бэкапами (без snapshot) =====
                    // Restore settings
                    if (data.settings) {
                        Object.assign(settings, data.settings);
                        currentLang = settings.language || 'en';
                    }
                    // Restore counter
                    if (typeof data.count === 'number') count = data.count;
                    if (typeof data.customGoal === 'number') customGoal = data.customGoal;
                    if (typeof data.goal === 'number') {
                        if (data.goal === 999999999) { isUnlimited = true; goal = 33; }
                        else { isUnlimited = false; goal = data.goal; }
                    }
                    // Старые бэкапы не содержат точку отсчёта кольца — начинаем с 0.
                    goalBaseline = 0; customBaseline = 0;
                    // Restore duas
                    if (Array.isArray(data.duas)) duas = data.duas;
                    // Restore stats
                    if (data.stats && typeof data.stats === 'object') {
                        _statsCache = data.stats;
                        localStorage.setItem('azkar_stats_v2', JSON.stringify(_statsCache));
                    }
                    // Restore overall dhikr progress (общий прогресс зикров)
                    if (data.dhikrTotals && typeof data.dhikrTotals === 'object') {
                        dhikrTotals = data.dhikrTotals;
                        saveDhikrTotals();
                    }
                    // Restore special
                    if (data.completedSpecial) completedSpecial = data.completedSpecial;
                    if (data.specialProgress) specialProgress = data.specialProgress;
                    if (data.specialResumeSessions) specialResumeSessions = data.specialResumeSessions;
                    // Restore all special dhikrs (including order of built-ins and custom ones)
                    if (Array.isArray(data.specialDhikrs) && data.specialDhikrs.length > 0) {
                        specialDhikrs = data.specialDhikrs;
                        saveSpecialDhikrsToStorage();
                    }

                    // Save everything to localStorage
                    flushSave();
                    markDataChanged();
                    syncImportedDhikrKeys([
                        typeof data.count === 'number' ? 'azkar_count' : '',
                        (data.stats && typeof data.stats === 'object') ? 'azkar_stats_v2' : '',
                        (data.dhikrTotals && typeof data.dhikrTotals === 'object') ? 'azkar_dhikr_totals' : ''
                    ]);
                    applyTheme(settings.theme || 'dark');
                    applyLanguage(currentLang);
                    updateDisplay();
                    try { updateDhikrOverallProgress(); } catch(e6) {}
                    // После импорта — помечаем все разделы устаревшими,
                    // они перерисуются при следующем переходе в них
                    markDirty('dua','favorites','stats','special');
                    updateSettingsUI();

                } catch (err) {
                }
            };
            reader.readAsText(file);
            // Reset so same file can be imported again
            event.target.value = '';
        }

        /* ===== THEME SYSTEM ===== */
        const DARK_THEMES = [
            { id: 'dark', bg: '#0a0a0a',  accent: '#d4af37' },
            { id: 'dark-emerald', bg: '#060f0a',  accent: '#2ecc71' },
            { id: 'dark-purple', bg: '#07050f',  accent: '#a855f7' },
            { id: 'dark-blue', bg: '#030b12',  accent: '#38bdf8' },
            { id: 'dark-rose', bg: '#0f0509',  accent: '#f472b6' },
        ];
        const LIGHT_THEMES = [
            { id: 'light', bg: '#f8f6f2',  accent: '#b85c1a' },
            { id: 'light-rosesapphire', bg: '#fdf2f6',  accent: '#c2698f' },
            { id: 'light-lavender', bg: '#f5f3fa',  accent: '#7c5cbf' },
            { id: 'light-ocean', bg: '#f0f7fc',  accent: '#0369a1' },
            { id: 'light-mint', bg: '#f0faf6',  accent: '#0d7a5f' },
        ];

        function isDarkTheme(th) {
            return DARK_THEMES.some(t => t.id === (th || settings.theme));
        }

        function shouldAnimateThemeChange(currentTheme, nextTheme, options) {
            if (options && options.animate === false) return false;
            return String(currentTheme || '') !== String(nextTheme || '');
        }

        function applyTheme(theme, options) {
            settings.theme = theme;
            // Запоминаем последнюю выбранную тему для каждой группы
            if (isDarkTheme(theme)) {
                settings.lastDarkTheme = theme;
            } else {
                settings.lastLightTheme = theme;
            }

            // Тяжёлые DOM-операции всегда в следующем кадре
            const afterApply = () => {
                const isLight = !isDarkTheme(theme);
                document.querySelector('meta[name="theme-color"]').content = isLight ? '#f4f7fb' : '#0a0a0a';
                updateSettingsUI();
            };

            const root = document.documentElement;
            const currentTheme = root.getAttribute('data-theme') || '';
            if (!shouldAnimateThemeChange(currentTheme, theme, options)) {
                if (currentTheme !== theme) {
                    const alreadySilent = root.classList.contains('no-transition');
                    root.classList.add('no-transition');
                    root.setAttribute('data-theme', theme);
                    if (!alreadySilent) {
                        requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('no-transition')));
                    }
                }
                afterApply();
                return;
            }

            if (document.startViewTransition) {
                // === View Transitions API — ультра-плавный путь ===
                // Браузер снимает скриншот ДО, применяет тему, снимает ПОСЛЕ,
                // затем морфит между ними на GPU без единого пересчёта стилей.
                // @property-переходы отключаем, чтобы избежать двойной анимации.
                document.documentElement.classList.add('no-transition');

                // Ползунок и иконку обновляем ДО startViewTransition —
                // тогда они попадают в «новый» скриншот и переключаются
                // синхронно с темой, без задержки.
                const isLightEarly = !isDarkTheme(theme);
                const toggleEl = document.getElementById('themeToggle');
                if (toggleEl) toggleEl.classList.toggle('on', isLightEarly);
                const themeIconEl = document.getElementById('themeIcon');
                if (themeIconEl) themeIconEl.textContent = isLightEarly ? '☀️' : '🌙';

                const vt = document.startViewTransition(() => {
                    document.documentElement.setAttribute('data-theme', theme);
                });
                vt.finished.then(() => {
                    document.documentElement.classList.remove('no-transition');
                    afterApply();
                });
            } else {
                // === Fallback: @property CSS-переходы (v48-подход) ===
                document.documentElement.setAttribute('data-theme', theme);
                requestAnimationFrame(afterApply);
            }
        }

        function toggleTheme() {
            if (isDarkTheme()) {
                applyTheme(settings.lastLightTheme || 'light');
            } else {
                applyTheme(settings.lastDarkTheme || 'dark');
            }
            saveDataDebounced();
        }

        /* Long-press на теме */
        let _themePressTimer = null;
        function startThemePress(e) {
            e.preventDefault();
            _themePressTimer = setTimeout(() => {
                _themePressTimer = null;
                openThemePicker();
            }, 1000);
        }
        function cancelThemePress() {
            if (_themePressTimer) {
                clearTimeout(_themePressTimer);
                _themePressTimer = null;
                // Close language dropdown if open
                const langBtn = document.getElementById('langSelectBtn');
                const langDd = document.getElementById('langDropdown');
                if (langBtn) langBtn.classList.remove('open');
                if (langDd) langDd.classList.remove('open');
                toggleTheme(); // короткое нажатие
            }
        }

        function openThemePicker() {
            // Close language dropdown if open
            const langBtn = document.getElementById('langSelectBtn');
            const langDd = document.getElementById('langDropdown');
            if (langBtn) langBtn.classList.remove('open');
            if (langDd) langDd.classList.remove('open');

            const isDark = isDarkTheme();
            const list = isDark ? DARK_THEMES : LIGHT_THEMES;
            document.getElementById('themePickerTitle').textContent = isDark ? t('themePickerDark') : t('themePickerLight');
            const grid = document.getElementById('themeGrid');
            grid.innerHTML = '';
            list.forEach(th => {
                const sw = document.createElement('div');
                sw.className = 'theme-swatch' + (settings.theme === th.id ? ' active' : '');
                sw.innerHTML = `
                    <div class="theme-swatch-circle" style="background:${th.bg};border-color:${settings.theme===th.id?th.accent:'transparent'};box-shadow:${settings.theme===th.id?'0 0 0 3px '+th.accent+'33':''};"><div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 60% 40%,${th.accent}55,transparent 70%);"></div><div style="position:absolute;bottom:6px;left:50%;transform:translateX(-50%);width:14px;height:3px;border-radius:2px;background:${th.accent};opacity:0.85;"></div></div>
                    <div class="theme-swatch-label">${t('themeName_' + th.id)}</div>`;
                sw.onclick = () => {
                    applyTheme(th.id);
                    saveDataDebounced();
                    closeThemePicker();
                };
                grid.appendChild(sw);
            });
            document.getElementById('themePickerOverlay').classList.add('show');
            _initSheetDrag(document.getElementById('themePickerOverlay'), document.querySelector('#themePickerOverlay .theme-picker-sheet'), closeThemePicker);
        }

        function closeThemePicker() {
            document.getElementById('themePickerOverlay').classList.remove('show');
        }

        // ===== SOUND PICKERS =====
        // Reusable swipe-down-to-close for any bottom-sheet overlay
        function _initSheetDrag(overlay, sheet, onClose) {
            if (!overlay || !sheet || sheet._sheetDragInit) return;
            sheet._sheetDragInit = true;
            let startY = 0, startX = 0, dy = 0, dragging = false, decided = false, active = false;
            sheet.addEventListener('touchstart', e => {
                if (e.touches.length !== 1) return;
                startY = e.touches[0].clientY;
                startX = e.touches[0].clientX;
                dy = 0; dragging = true; decided = false; active = false;
                sheet.style.transition = 'none';
            }, { passive: true });
            sheet.addEventListener('touchmove', e => {
                if (!dragging) return;
                const ddy = e.touches[0].clientY - startY;
                const ddx = e.touches[0].clientX - startX;
                if (!decided) {
                    if (Math.abs(ddy) < 6 && Math.abs(ddx) < 6) return;
                    decided = true;
                    active = ddy > 0 && Math.abs(ddy) > Math.abs(ddx);
                    if (!active) sheet.style.transition = '';
                }
                if (!active) return;
                dy = Math.max(0, ddy);
                e.preventDefault();
                sheet.style.transform = 'translateY(' + dy + 'px) translateZ(0)';
                const prog = Math.min(1, dy / 320);
                overlay.style.background = 'rgba(0,0,0,' + (0.6 * (1 - prog * 0.6)).toFixed(3) + ')';
            }, { passive: false });
            function endDrag() {
                if (!dragging) return;
                dragging = false;
                if (!active) { sheet.style.transition = ''; sheet.style.transform = ''; return; }
                active = false;
                if (dy > 110) {
                    sheet.style.transition = 'transform 0.26s cubic-bezier(0.3,0,0.4,1)';
                    sheet.style.transform = 'translateY(100%) translateZ(0)';
                    overlay.style.transition = 'opacity 0.26s ease';
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        onClose();
                        sheet.style.transition = ''; sheet.style.transform = '';
                        overlay.style.transition = ''; overlay.style.opacity = '';
                        overlay.style.background = '';
                    }, 260);
                } else {
                    sheet.style.transition = 'transform 0.26s cubic-bezier(0.2,0.9,0.4,1)';
                    sheet.style.transform = 'translateY(0) translateZ(0)';
                    overlay.style.background = '';
                    setTimeout(() => { sheet.style.transition = ''; sheet.style.transform = ''; }, 280);
                }
            }
            sheet.addEventListener('touchend', endDrag);
            sheet.addEventListener('touchcancel', () => {
                dragging = false; active = false;
                sheet.style.transition = ''; sheet.style.transform = '';
                overlay.style.background = '';
            });
        }
        const CLICK_SOUNDS = [
            { id: 'default', emoji: '💧', play: (ctx,v) => { const o=ctx.createOscillator(),g=ctx.createGain(); o.connect(g);g.connect(ctx.destination); o.type='sine'; o.frequency.value=1200; const vol=Math.pow(v/10,2)*0.8+0.02; g.gain.setValueAtTime(vol,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.08); o.start(ctx.currentTime); o.stop(ctx.currentTime+0.08); }},
            { id: 'soft', emoji: '🫧', play: (ctx,v) => { const o=ctx.createOscillator(),g=ctx.createGain(); o.connect(g);g.connect(ctx.destination); o.type='sine'; o.frequency.value=800; const vol=Math.pow(v/10,2)*0.6+0.02; g.gain.setValueAtTime(vol,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.15); o.start(ctx.currentTime); o.stop(ctx.currentTime+0.15); }},
            { id: 'snap', emoji: '🫰', play: (ctx,v) => { const o=ctx.createOscillator(),g=ctx.createGain(); o.connect(g);g.connect(ctx.destination); o.type='square'; o.frequency.value=1800; const vol=Math.pow(v/10,2)*0.5+0.02; g.gain.setValueAtTime(vol,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.03); o.start(ctx.currentTime); o.stop(ctx.currentTime+0.03); }},
            { id: 'crystal', emoji: '✨', play: (ctx,v) => { const o=ctx.createOscillator(),g=ctx.createGain(); o.connect(g);g.connect(ctx.destination); o.type='sine'; o.frequency.value=2000; const vol=Math.pow(v/10,2)*0.5+0.02; g.gain.setValueAtTime(vol,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.12); o.start(ctx.currentTime); o.stop(ctx.currentTime+0.12); }},
            { id: 'pop', emoji: '🔹', play: (ctx,v) => { const now=ctx.currentTime, vol=Math.pow(v/10,2)*0.34+0.012; [[1760,0,0.11,1],[2637,0.018,0.16,0.45]].forEach(([freq,del,dur,mix])=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.setValueAtTime(freq,now+del);g.gain.setValueAtTime(0.0001,now+del);g.gain.linearRampToValueAtTime(vol*mix,now+del+0.008);g.gain.exponentialRampToValueAtTime(0.0001,now+del+dur);o.start(now+del);o.stop(now+del+dur+0.02);}); }},
            { id: 'bubble', emoji: '🪶', play: (ctx,v) => { const now=ctx.currentTime, vol=Math.pow(v/10,2)*0.18+0.008; const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter(); o.connect(f);f.connect(g);g.connect(ctx.destination);o.type='triangle';o.frequency.setValueAtTime(560,now);o.frequency.linearRampToValueAtTime(430,now+0.14);f.type='lowpass';f.frequency.setValueAtTime(1200,now);f.frequency.exponentialRampToValueAtTime(520,now+0.18);g.gain.setValueAtTime(0.0001,now);g.gain.linearRampToValueAtTime(vol,now+0.025);g.gain.exponentialRampToValueAtTime(0.0001,now+0.18);o.start(now);o.stop(now+0.2); }},
            { id: 'tick', emoji: '⏱️', play: (ctx,v) => { const o=ctx.createOscillator(),g=ctx.createGain(); o.connect(g);g.connect(ctx.destination); o.type='triangle'; o.frequency.value=2400; const vol=Math.pow(v/10,2)*0.4+0.02; g.gain.setValueAtTime(vol,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.025); o.start(ctx.currentTime); o.stop(ctx.currentTime+0.025); }},
            { id: 'ding', emoji: '🛎️', play: (ctx,v) => { const o=ctx.createOscillator(),g=ctx.createGain(); o.connect(g);g.connect(ctx.destination); o.type='sine'; o.frequency.value=1600; const vol=Math.pow(v/10,2)*0.6+0.02; g.gain.setValueAtTime(vol,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.2); o.start(ctx.currentTime); o.stop(ctx.currentTime+0.2); }},
            { id: 'flute', emoji: '🪈', play: (ctx,v) => { const o=ctx.createOscillator(),g=ctx.createGain(); o.connect(g);g.connect(ctx.destination); o.type='sine'; o.frequency.setValueAtTime(1400,ctx.currentTime); o.frequency.setValueAtTime(1760,ctx.currentTime+0.04); const vol=Math.pow(v/10,2)*0.5+0.02; g.gain.setValueAtTime(vol,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.18); o.start(ctx.currentTime); o.stop(ctx.currentTime+0.18); }},
            { id: 'shimmer', emoji: '💫', play: (ctx,v) => { const o=ctx.createOscillator(),g=ctx.createGain(),o2=ctx.createOscillator(),g2=ctx.createGain(); o.connect(g);g.connect(ctx.destination); o2.connect(g2);g2.connect(ctx.destination); o.type='sine'; o.frequency.value=1200; o2.type='sine'; o2.frequency.value=1805; const vol=Math.pow(v/10,2)*0.45+0.02; g.gain.setValueAtTime(vol,ctx.currentTime); g2.gain.setValueAtTime(vol*0.7,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.1); g2.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.1); o.start(ctx.currentTime); o.stop(ctx.currentTime+0.1); o2.start(ctx.currentTime); o2.stop(ctx.currentTime+0.1); }}
        ];

        const GOAL_SOUNDS = [
            { id: 'default', emoji: '🎵', play: (ctx,v) => { [880,1320].forEach((freq,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=freq;const vol=(Math.pow(v/10,2)*0.9+0.02)/(i+1);g.gain.setValueAtTime(vol,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+1.2);o.start(ctx.currentTime);o.stop(ctx.currentTime+1.2);}); }},
            { id: 'chime', emoji: '🔔', play: (ctx,v) => { const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.setValueAtTime(600,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(1200,ctx.currentTime+0.3);const vol=Math.pow(v/10,2)*0.7+0.02;g.gain.setValueAtTime(vol,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.8);o.start(ctx.currentTime);o.stop(ctx.currentTime+0.8);}},
            { id: 'peace', emoji: '🕯️', play: (ctx,v) => {
                const now = ctx.currentTime;
                const vol = Math.pow(v/10,2)*0.2+0.01;
                [[432,0,1.55,1],[648,0.08,1.25,0.24]].forEach(([freq,del,dur,mix])=>{
                    const o = ctx.createOscillator(), g = ctx.createGain();
                    o.type = 'sine';
                    o.frequency.setValueAtTime(freq, now+del);
                    g.gain.setValueAtTime(0.0001, now+del);
                    g.gain.linearRampToValueAtTime(vol*mix, now+del+0.2);
                    g.gain.exponentialRampToValueAtTime(0.0001, now+del+dur);
                    o.connect(g); g.connect(ctx.destination);
                    o.start(now+del); o.stop(now+del+dur+0.05);
                });
            }},{ id: 'celebrate', emoji: '🌅', play: (ctx,v) => { [[523,0],[659,0.12],[784,0.24]].forEach(([freq,del])=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.value=freq;const vol=Math.pow(v/10,2)*0.6+0.02;g.gain.setValueAtTime(0,ctx.currentTime+del);g.gain.linearRampToValueAtTime(vol,ctx.currentTime+del+0.04);g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+del+0.9);o.start(ctx.currentTime+del);o.stop(ctx.currentTime+del+0.9);}); }},
            { id: 'wave', emoji: '✨', play: (ctx,v) => {
                const now = ctx.currentTime;
                const vol = Math.pow(v/10,2)*0.32+0.015;
                [[784,0,0.55,1],[988,0.09,0.5,0.72],[1175,0.18,0.62,0.5]].forEach(([freq,del,dur,mix])=>{
                    const o = ctx.createOscillator(), g = ctx.createGain();
                    o.type = 'sine';
                    o.frequency.setValueAtTime(freq, now+del);
                    o.frequency.exponentialRampToValueAtTime(freq*1.012, now+del+dur);
                    g.gain.setValueAtTime(0.0001, now+del);
                    g.gain.linearRampToValueAtTime(vol*mix, now+del+0.025);
                    g.gain.exponentialRampToValueAtTime(0.0001, now+del+dur);
                    o.connect(g); g.connect(ctx.destination);
                    o.start(now+del); o.stop(now+del+dur+0.05);
                });
            }},{ id: 'glory', emoji: '👑', play: (ctx,v) => { [[523,0],[659,0.08],[784,0.16],[1047,0.24]].forEach(([freq,del])=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.value=freq;const vol=Math.pow(v/10,2)*0.5+0.02;g.gain.setValueAtTime(0,ctx.currentTime+del);g.gain.linearRampToValueAtTime(vol,ctx.currentTime+del+0.03);g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+del+1.0);o.start(ctx.currentTime+del);o.stop(ctx.currentTime+del+1.0);}); }},
            { id: 'moon', emoji: '🌙', play: (ctx,v) => { const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.setValueAtTime(440,ctx.currentTime);o.frequency.setValueAtTime(880,ctx.currentTime+0.3);const vol=Math.pow(v/10,2)*0.6+0.02;g.gain.setValueAtTime(vol,ctx.currentTime);g.gain.setValueAtTime(vol*0.8,ctx.currentTime+0.3);g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+1.4);o.start(ctx.currentTime);o.stop(ctx.currentTime+1.4);}},
            { id: 'star', emoji: '⭐', play: (ctx,v) => { [1318,1568,2093].forEach((freq,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.value=freq;const vol=(Math.pow(v/10,2)*0.6+0.02)/(i+1);g.gain.setValueAtTime(vol,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+1.5);o.start(ctx.currentTime);o.stop(ctx.currentTime+1.5);}); }},
            { id: 'echo', emoji: '🪞', play: (ctx,v) => { const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.value=880;const vol=Math.pow(v/10,2)*0.7+0.02;[0,0.35,0.7].forEach((del,i)=>{g.gain.setValueAtTime(vol*(1-i*0.3),ctx.currentTime+del);g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+del+0.3);});g.gain.setValueAtTime(0,ctx.currentTime);g.gain.linearRampToValueAtTime(vol,ctx.currentTime+0.01);o.start(ctx.currentTime);o.stop(ctx.currentTime+1.1);}},
            { id: 'harp', emoji: '🎸', play: (ctx,v) => { [[262,0],[330,0.06],[392,0.12],[523,0.18]].forEach(([freq,del])=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.value=freq;const vol=Math.pow(v/10,2)*0.5+0.02;g.gain.setValueAtTime(0,ctx.currentTime+del);g.gain.linearRampToValueAtTime(vol,ctx.currentTime+del+0.01);g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+del+1.2);o.start(ctx.currentTime+del);o.stop(ctx.currentTime+del+1.2);}); }}
        ];

        const SOUND_LABELS = UI_I18N.soundLabels || {};

        function getSoundLabel(type, id, fallback) {
            const pack = SOUND_LABELS[type] || {};
            const langPack = pack[currentLang] || pack.en || {};
            const enPack = pack.en || {};
            return langPack[id] || enPack[id] || fallback || id;
        }

        function _playClickSoundById(id, vol) {
            const ctx = getAudioCtx();
            const resume = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
            resume.then(() => {
                const snd = CLICK_SOUNDS.find(s => s.id === id) || CLICK_SOUNDS[0];
                snd.play(ctx, vol);
            });
        }
        function _playGoalSoundById(id, vol) {
            const ctx = getAudioCtx();
            const resume = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
            resume.then(() => {
                const snd = GOAL_SOUNDS.find(s => s.id === id) || GOAL_SOUNDS[0];
                snd.play(ctx, vol);
            });
        }

        // Long-press for click sound picker
        let _clickSoundPressTimer = null;
        function startClickSoundPress(e) {
            e.preventDefault();
            _clickSoundPressTimer = setTimeout(() => {
                _clickSoundPressTimer = null;
                openClickSoundPicker();
            }, 1000);
        }
        function cancelClickSoundPress() {
            if (_clickSoundPressTimer) {
                clearTimeout(_clickSoundPressTimer);
                _clickSoundPressTimer = null;
                toggleSetting('clickSound');
            }
        }

        // Long-press for goal sound picker
        let _goalSoundPressTimer = null;
        function startGoalSoundPress(e) {
            e.preventDefault();
            _goalSoundPressTimer = setTimeout(() => {
                _goalSoundPressTimer = null;
                openGoalSoundPicker();
            }, 1000);
        }
        function cancelGoalSoundPress() {
            if (_goalSoundPressTimer) {
                clearTimeout(_goalSoundPressTimer);
                _goalSoundPressTimer = null;
                toggleSetting('sound');
            }
        }

        function openClickSoundPicker() {
            const titleEl = document.getElementById('clickSoundPickerTitle');
            if (titleEl) titleEl.textContent = t('soundPickerTap');
            const grid = document.getElementById('clickSoundGrid');
            grid.innerHTML = '';
            const current = settings.clickSoundType || 'default';
            CLICK_SOUNDS.forEach(s => {
                const opt = document.createElement('div');
                opt.className = 'sound-option' + (current === s.id ? ' active' : '');
                opt.innerHTML = '<div class="sound-icon-circle">' + s.emoji + '</div><div class="sound-option-label">' + getSoundLabel('click', s.id) + '</div>';
                opt.onclick = () => {
                    settings.clickSoundType = s.id;
                    settings.clickSound = true;
                    saveDataDebounced();
                    updateSettingsUI();
                    const vol = settings.clickSoundVolume !== undefined ? settings.clickSoundVolume : 5;
                    _playClickSoundById(s.id, vol);
                    openClickSoundPicker();
                };
                grid.appendChild(opt);
            });
            document.getElementById('clickSoundPickerOverlay').classList.add('show');
            _initSheetDrag(document.getElementById('clickSoundPickerOverlay'), document.querySelector('#clickSoundPickerOverlay .sound-picker-sheet'), closeClickSoundPicker);
        }
        function closeClickSoundPicker() {
            document.getElementById('clickSoundPickerOverlay').classList.remove('show');
        }

        function openGoalSoundPicker() {
            const titleEl = document.getElementById('goalSoundPickerTitle');
            if (titleEl) titleEl.textContent = t('soundPickerGoal');
            const grid = document.getElementById('goalSoundGrid');
            grid.innerHTML = '';
            const current = settings.goalSoundType || 'default';
            GOAL_SOUNDS.forEach(s => {
                const opt = document.createElement('div');
                opt.className = 'sound-option' + (current === s.id ? ' active' : '');
                opt.innerHTML = '<div class="sound-icon-circle">' + s.emoji + '</div><div class="sound-option-label">' + getSoundLabel('goal', s.id) + '</div>';
                opt.onclick = () => {
                    settings.goalSoundType = s.id;
                    settings.sound = true;
                    saveDataDebounced();
                    updateSettingsUI();
                    const vol = settings.goalSoundVolume !== undefined ? settings.goalSoundVolume : 5;
                    _playGoalSoundById(s.id, vol);
                    openGoalSoundPicker();
                };
                grid.appendChild(opt);
            });
            document.getElementById('goalSoundPickerOverlay').classList.add('show');
            _initSheetDrag(document.getElementById('goalSoundPickerOverlay'), document.querySelector('#goalSoundPickerOverlay .sound-picker-sheet'), closeGoalSoundPicker);
        }
        function closeGoalSoundPicker() {
            document.getElementById('goalSoundPickerOverlay').classList.remove('show');
        }

        // ===== ОБЛЕГЧЁННЫЙ РЕЖИМ (этап 6) =====
        // Выбор хранится только на этом устройстве (не в облаке и не в бэкапах):
        // слабый телефон не должен «включать» режим на мощном.
        const LITE_MODE_KEY = 'azkar_lite_mode';
        function isLiteModeOn() { return document.documentElement.classList.contains('lite'); }
        function toggleLiteMode() {
            const on = !isLiteModeOn();
            document.documentElement.classList.toggle('lite', on);
            try { localStorage.setItem(LITE_MODE_KEY, on ? '1' : '0'); } catch (e) {}
            updateSettingsUI();
        }

        function toggleSetting(key) {
            settings[key] = !settings[key];
            saveDataDebounced();
            updateSettingsUI();
            if (key === 'onlinePresence') onlinePresencePreferenceChanged();
        }

        const GOOGLE_ACCOUNT_STORAGE_KEY = 'azkar_google_account_v1';
        const ACCOUNT_ICON_STORAGE_KEY = 'azkar_account_icon_v1';
        const GUEST_SNAPSHOT_STORAGE_KEY = 'azkar_guest_snapshot_v1';
        const ACCOUNT_SNAPSHOT_STORAGE_PREFIX = 'azkar_account_snapshot_v1_';
        const ACCOUNT_SNAPSHOT_DIRTY_PREFIX = 'azkar_account_snapshot_dirty_v1_';
        const FIREBASE_SDK_VERSION = '12.15.0';
        const FIREBASE_CONFIG = {
            apiKey: "AIzaSyCK08Vc1hxLM12fLUQM-Ipq3jnMfB4aY3U",
            authDomain: "azkar-pwa.firebaseapp.com",
            databaseURL: "https://azkar-pwa-default-rtdb.europe-west1.firebasedatabase.app",
            projectId: "azkar-pwa",
            storageBucket: "azkar-pwa.firebasestorage.app",
            messagingSenderId: "939307317987",
            appId: "1:939307317987:web:2aeda9da43b3c1adc3a3d6",
            measurementId: "G-QDKS5VTMHP"
        };
        let googleAccount = loadGoogleAccount();
        let accountIconDataUrl = loadAccountIcon();
        let googleSignInBusy = false;
        let firebaseReadyPromise = null;
        let firebaseAuth = null;
        let firebaseDb = null;
        let firebaseAuthApi = null;
        let firebaseFirestoreApi = null;
        let firebaseCurrentUid = null;
        let firebaseSyncStarting = false;
        let firebaseRemoteImporting = false;
        let firebaseAuthListenerReady = false;
        let firebaseSigningOut = false;
        let firebaseSyncEpoch = 0;
        let firebaseUnsubSnapshot = null;
        const FIREBASE_ATOMIC_DHIKR_KEYS = new Set(['azkar_count', 'azkar_stats_v2', 'azkar_dhikr_totals']);
        const DHIKR_DELTA_STORAGE_PREFIX = 'azkar_dhikr_delta_v1_';
        const DHIKR_SYNC_IDLE_MS = 400;
        const DHIKR_SYNC_BATCH_SIZE = 25;
        let _dhikrDeltaSyncTimer = null;
        let _dhikrDeltaSyncPromise = null;
        // Firebase is not needed to draw the app, so it is started only after
        // the first frames: the account sync right after load (signed-in users
        // only), the "online" counter a few seconds later.
        const AUTH_REDIRECT_PENDING_KEY = 'azkar_auth_redirect_pending_v1';
        const ONLINE_PRESENCE_START_DELAY_MS = 2500;
        const FIREBASE_ANALYTICS_DELAY_MS = 8000;

        // Realtime Database presence uses its own anonymous Firebase app so it
        // never signs the user's Google account in or out.
        const ONLINE_PRESENCE_APP_NAME = 'azkar-presence';
        const ONLINE_PRESENCE_DEVICE_KEY = 'azkar_presence_device_id_v1';
        const ONLINE_PRESENCE_LEASE_KEY = 'azkar_presence_leader_v1';
        const ONLINE_PRESENCE_COUNT_KEY = 'azkar_presence_count_v1';
        const ONLINE_PRESENCE_CHANNEL = 'azkar_presence_tabs_v1';
        const ONLINE_PRESENCE_HEARTBEAT_MS = 15000;
        const ONLINE_PRESENCE_STALE_MS = 60000;
        let onlinePresenceFirebasePromise = null;
        let onlinePresenceFirebase = null;
        let onlinePresenceCoordinatorStarted = false;
        let onlinePresenceCoordinatorMode = '';
        let onlinePresenceSharedWorker = null;
        let onlinePresenceSharedReadyTimer = null;
        let onlinePresenceChannel = null;
        let onlinePresenceHeartbeatTimer = null;
        let onlinePresenceRecordHeartbeatTimer = null;
        let onlinePresenceLeaseTimer = null;
        let onlinePresenceClaimTimer = null;
        let onlinePresenceRetryTimer = null;
        let onlinePresenceLeader = false;
        let onlinePresenceWriterActive = false;
        let onlinePresenceWriterEpoch = 0;
        let onlinePresenceConnected = false;
        let onlinePresenceWriteInFlight = false;
        let onlinePresenceOwnRef = null;
        let onlinePresenceDisconnect = null;
        let onlinePresenceUnsubConnected = null;
        let onlinePresenceUnsubRoot = null;
        let onlinePresenceTabId = '';

        function googleAccountText() {
            const dict = UI_I18N.googleAccount || {};
            return dict[currentLang] || dict.en;
        }

        function accountIconLabel() {
            const dict = UI_I18N.accountIconLabel || {};
            return dict[currentLang] || dict.en;
        }

        function signOutConfirmText() {
            const dict = UI_I18N.signOutConfirm || {};
            return dict[currentLang] || dict.en;
        }

        function signOutConfirmSubText() {
            const dict = UI_I18N.signOutConfirmSub || {};
            return dict[currentLang] || dict.en;
        }

        function loadGoogleAccount() {
            try {
                const raw = localStorage.getItem(GOOGLE_ACCOUNT_STORAGE_KEY);
                return raw ? JSON.parse(raw) : null;
            } catch(e) {
                return null;
            }
        }

        function loadAccountIcon() {
            try {
                return localStorage.getItem(ACCOUNT_ICON_STORAGE_KEY) || '';
            } catch(e) {
                return '';
            }
        }

        function saveGoogleAccount(profile) {
            googleAccount = profile;
            try { localStorage.setItem(GOOGLE_ACCOUNT_STORAGE_KEY, JSON.stringify(profile)); } catch(e) {}
            updateGoogleAccountUI();
        }

        function openAccountIconPicker(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            const input = document.getElementById('accountIconInput');
            if (input) input.click();
        }

        function setAccountIconFromFile(event) {
            const input = event && event.target;
            const file = input && input.files && input.files[0];
            if (!file) return;

            if (!file.type || !file.type.startsWith('image/')) {
                if (input) input.value = '';
                try { showToast(googleAccountText().failed); } catch(e) {}
                return;
            }

            const reader = new FileReader();
            reader.onload = function() {
                const img = new Image();
                img.onload = function() {
                    try {
                        const maxSize = 256;
                        const largestSide = Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height, 1);
                        const scale = Math.min(1, maxSize / largestSide);
                        const width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
                        const height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.clearRect(0, 0, width, height);
                        ctx.drawImage(img, 0, 0, width, height);

                        try {
                            accountIconDataUrl = canvas.toDataURL('image/webp', 0.86);
                        } catch(e) {
                            accountIconDataUrl = canvas.toDataURL('image/png');
                        }
                    } catch(e) {
                        accountIconDataUrl = reader.result || '';
                    }

                    try { localStorage.setItem(ACCOUNT_ICON_STORAGE_KEY, accountIconDataUrl); } catch(e) {}
                    updateAccountIconUI();
                    if (typeof markDataChanged === 'function') markDataChanged();
                    if (input) input.value = '';
                };
                img.onerror = function() {
                    if (input) input.value = '';
                    try { showToast(googleAccountText().failed); } catch(e) {}
                };
                img.src = reader.result;
            };
            reader.onerror = function() {
                if (input) input.value = '';
                try { showToast(googleAccountText().failed); } catch(e) {}
            };
            reader.readAsDataURL(file);
        }

        function updateAccountIconUI() {
            const customIcon = document.getElementById('accountCustomIcon');
            const defaultIcon = document.getElementById('accountDefaultIcon');
            if (!customIcon || !defaultIcon) return;

            if (accountIconDataUrl) {
                customIcon.src = accountIconDataUrl;
                customIcon.hidden = false;
                defaultIcon.style.display = 'none';
            } else {
                customIcon.removeAttribute('src');
                customIcon.hidden = true;
                defaultIcon.style.display = '';
            }
        }

        function firebaseSyncStampKey(uid) {
            return 'azkar_cloud_synced_at_' + uid;
        }

        function getActiveDataOwnerUid() {
            try {
                return localStorage.getItem('azkar_data_owner_uid') || '';
            } catch(e) {
                return '';
            }
        }

        function setActiveDataOwnerUid(uid) {
            try {
                if (uid) localStorage.setItem('azkar_data_owner_uid', uid);
                else localStorage.removeItem('azkar_data_owner_uid');
            } catch(e) {}
        }

        function localDataBelongsToFirebaseUser(uid) {
            return !!uid && getActiveDataOwnerUid() === uid;
        }

        function firebaseAccountSnapshotKey(uid) {
            return ACCOUNT_SNAPSHOT_STORAGE_PREFIX + String(uid || '').replace(/[^a-zA-Z0-9_-]/g, '_');
        }

        function firebaseAccountSnapshotDirtyKey(uid) {
            return ACCOUNT_SNAPSHOT_DIRTY_PREFIX + String(uid || '').replace(/[^a-zA-Z0-9_-]/g, '_');
        }

        function loadFirebaseAccountLocalSnapshot(uid) {
            try {
                if (!uid) return null;
                const raw = localStorage.getItem(firebaseAccountSnapshotKey(uid));
                if (!raw) return null;
                const data = JSON.parse(raw);
                if (!data || !data.snapshot || typeof data.snapshot !== 'object') return null;
                return data;
            } catch(e) {
                return null;
            }
        }

        function isFirebaseAccountLocalSnapshotDirty(uid, data) {
            try {
                if (data && data.dirty === true) return true;
                return !!uid && localStorage.getItem(firebaseAccountSnapshotDirtyKey(uid)) === '1';
            } catch(e) {
                return false;
            }
        }

        function saveFirebaseAccountLocalSnapshot(uid, snapshot, updatedAtMs, dirty) {
            try {
                if (!uid || !snapshot) return;
                const savedAtMs = Number(updatedAtMs || Date.now());
                const isDirty = dirty === true;
                localStorage.setItem(firebaseAccountSnapshotKey(uid), JSON.stringify({
                    savedAt: new Date(savedAtMs).toISOString(),
                    savedAtMs: savedAtMs,
                    dirty: isDirty,
                    snapshot: snapshot
                }));
                if (isDirty) localStorage.setItem(firebaseAccountSnapshotDirtyKey(uid), '1');
                else localStorage.removeItem(firebaseAccountSnapshotDirtyKey(uid));
            } catch(e) {}
        }

        async function initFirebaseAccount() {
            if (firebaseReadyPromise) return firebaseReadyPromise;

            firebaseReadyPromise = (async function() {
                const base = 'https://www.gstatic.com/firebasejs/' + FIREBASE_SDK_VERSION + '/';
                const appApi = await import(base + 'firebase-app.js');
                firebaseAuthApi = await import(base + 'firebase-auth.js');
                firebaseFirestoreApi = await import(base + 'firebase-firestore.js');

                // Только основное приложение ([DEFAULT]): getApps() считает и отдельное
                // приложение счётчика онлайна — если оно создано раньше, getApp() падал
                // с app/no-app (так было в APK при входе через Google).
                const app = (appApi.getApps ? appApi.getApps() : []).find(a => a.name === '[DEFAULT]')
                    || appApi.initializeApp(FIREBASE_CONFIG);
                firebaseAuth = firebaseAuthApi.getAuth(app);
                firebaseDb = firebaseFirestoreApi.getFirestore(app);

                try {
                    await firebaseAuthApi.setPersistence(firebaseAuth, firebaseAuthApi.browserLocalPersistence);
                } catch(e) {}

                // Analytics is not needed for anything the user sees.
                setTimeout(function() {
                    import(base + 'firebase-analytics.js').then(async function(analyticsApi) {
                        if (location.protocol === 'https:' && analyticsApi.isSupported && await analyticsApi.isSupported()) {
                            analyticsApi.getAnalytics(app);
                        }
                    }).catch(function() {});
                }, FIREBASE_ANALYTICS_DELAY_MS);

                if (!firebaseAuthListenerReady) {
                    firebaseAuthListenerReady = true;
                    firebaseAuthApi.onAuthStateChanged(firebaseAuth, function(user) {
                        if (user) {
                            if (firebaseSigningOut) return;
                            applyFirebaseUser(user, { sync: true });
                        } else {
                            firebaseSyncEpoch++;
                            firebaseSigningOut = false;
                            googleSignInBusy = false;
                            firebaseCurrentUid = null;
                            stopRealtimeListener();
                            if (typeof AppStorage !== 'undefined') AppStorage.remote = null;
                            setActiveDataOwnerUid(null);
                            googleAccount = null;
                            try { localStorage.removeItem(GOOGLE_ACCOUNT_STORAGE_KEY); } catch(e) {}
                            updateGoogleAccountUI();
                        }
                    });
                }

                try {
                    const redirectResult = await firebaseAuthApi.getRedirectResult(firebaseAuth);
                    try { localStorage.removeItem(AUTH_REDIRECT_PENDING_KEY); } catch(e) {}
                    if (redirectResult && redirectResult.user) {
                        await applyFirebaseUser(redirectResult.user, { sync: true });
                    }
                } catch(e) {}

                return { auth: firebaseAuth, db: firebaseDb, authApi: firebaseAuthApi, firestoreApi: firebaseFirestoreApi };
            })().catch(function(e) {
                firebaseReadyPromise = null;
                throw e;
            });

            return firebaseReadyPromise;
        }

        // ==================== DEFERRED FIREBASE START ====================
        function shouldStartAccountSyncAtLaunch() {
            if (googleAccount && (googleAccount.uid || googleAccount.id || googleAccount.email)) return true;
            if (getActiveDataOwnerUid()) return true;
            try {
                const redirectAt = Number(localStorage.getItem(AUTH_REDIRECT_PENDING_KEY) || 0);
                if (redirectAt && Date.now() - redirectAt < 15 * 60 * 1000) return true;
            } catch(e) {}
            return false;
        }

        function runWhenIdle(fn, timeoutMs) {
            if (typeof window.requestIdleCallback === 'function') {
                window.requestIdleCallback(function() { fn(); }, { timeout: timeoutMs });
            } else {
                setTimeout(fn, Math.min(timeoutMs, 250));
            }
        }

        function scheduleFirebaseStartup() {
            // The last known "online" number is shown at once, without network.
            try {
                const savedCount = Number(localStorage.getItem(ONLINE_PRESENCE_COUNT_KEY));
                const countEl = document.getElementById('onlinePresenceCount');
                if (countEl && Number.isFinite(savedCount) && savedCount > 0) countEl.textContent = formatOnlineCount(savedCount);
            } catch(e) {}

            const start = function() {
                // Signed-in users: the account sync starts right after the first
                // frames so the numbers are fresh. Guests never download the
                // account SDK until they press "Sign in".
                if (shouldStartAccountSyncAtLaunch()) {
                    requestAnimationFrame(function() {
                        runWhenIdle(function() {
                            initFirebaseAccount().catch(function(e) { console.warn('[Firebase] Init failed:', e); });
                        }, 1200);
                    });
                }
                // The "online" counter (Realtime Database SDK) waits a few seconds.
                setTimeout(function() {
                    runWhenIdle(function() { initOnlinePresence(); }, 2000);
                }, ONLINE_PRESENCE_START_DELAY_MS);
            };
            if (document.readyState === 'complete') start();
            else window.addEventListener('load', start, { once: true });
        }

        // ==================== REALTIME ONLINE PRESENCE ====================
        function formatOnlineCount(num) {
            num = Math.max(0, Number(num) || 0);
            if (num < 1000) return String(num);
            const short = (Math.round(num / 100) / 10).toFixed(1).replace(/\.0$/, '');
            return short + t('numSuffixK');
        }
        window.formatOnlineCount = formatOnlineCount;

        function onlinePresenceEnabled() {
            return settings.onlinePresence !== false;
        }

        function onlinePresenceActiveHere() {
            // The setting controls only whether the local indicator is visible.
            // Presence itself stays active while the app is open and visible.
            return document.visibilityState !== 'hidden';
        }

        function countFreshOnlinePresenceRecords(records, nowMs, staleMs) {
            const now = Number(nowMs) || Date.now();
            const maxAge = Math.max(1000, Number(staleMs) || ONLINE_PRESENCE_STALE_MS);
            return (Array.isArray(records) ? records : []).reduce(function(total, record) {
                if (!record || record.online !== true) return total;
                const timestamp = Number(record.updatedAt || record.connectedAt || 0);
                if (!Number.isFinite(timestamp) || timestamp <= 0) return total;
                const age = now - timestamp;
                return total + (age >= -5000 && age <= maxAge ? 1 : 0);
            }, 0);
        }

        function setOnlinePresenceCount(value, share) {
            const countEl = document.getElementById('onlinePresenceCount');
            const parsed = (value === null || value === undefined || value === '') ? NaN : Number(value);
            const count = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : null;
            if (countEl) countEl.textContent = count === null ? '—' : formatOnlineCount(count);
            if (!share || count === null) return;
            try { localStorage.setItem(ONLINE_PRESENCE_COUNT_KEY, String(count)); } catch(e) {}
            if (onlinePresenceCoordinatorMode === 'shared' && onlinePresenceSharedWorker) {
                try { onlinePresenceSharedWorker.port.postMessage({ type: 'count', id: onlinePresenceTabId, value: count }); } catch(e) {}
            } else if (onlinePresenceCoordinatorMode === 'broadcast' && onlinePresenceChannel) {
                try { onlinePresenceChannel.postMessage({ type: 'count', id: onlinePresenceTabId, value: count }); } catch(e) {}
            }
        }

        function getOnlinePresenceTabId() {
            if (onlinePresenceTabId) return onlinePresenceTabId;
            try { onlinePresenceTabId = sessionStorage.getItem('azkar_presence_tab_id_v1') || ''; } catch(e) {}
            if (!onlinePresenceTabId) {
                try {
                    onlinePresenceTabId = crypto.randomUUID();
                } catch(e) {
                    onlinePresenceTabId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
                }
                try { sessionStorage.setItem('azkar_presence_tab_id_v1', onlinePresenceTabId); } catch(e) {}
            }
            return onlinePresenceTabId;
        }

        async function ensureOnlinePresenceFirebase() {
            if (onlinePresenceFirebasePromise) return onlinePresenceFirebasePromise;
            onlinePresenceFirebasePromise = (async function() {
                const base = 'https://www.gstatic.com/firebasejs/' + FIREBASE_SDK_VERSION + '/';
                const appApi = await import(base + 'firebase-app.js');
                const authApi = await import(base + 'firebase-auth.js');
                const databaseApi = await import(base + 'firebase-database.js');
                let app = appApi.getApps().find(function(item) { return item.name === ONLINE_PRESENCE_APP_NAME; });
                if (!app) app = appApi.initializeApp(FIREBASE_CONFIG, ONLINE_PRESENCE_APP_NAME);
                const auth = authApi.getAuth(app);
                try { await authApi.setPersistence(auth, authApi.browserLocalPersistence); } catch(e) {}
                try {
                    if (typeof auth.authStateReady === 'function') await auth.authStateReady();
                } catch(e) {}
                let user = auth.currentUser;
                if (!user) {
                    const result = await authApi.signInAnonymously(auth);
                    user = result.user;
                }
                const deviceId = user.uid;
                // The anonymous UID is stable for this browser and is also the
                // only deviceId allowed to write by the published database rules.
                try { localStorage.setItem(ONLINE_PRESENCE_DEVICE_KEY, deviceId); } catch(e) {}
                const context = {
                    auth: auth,
                    database: databaseApi.getDatabase(app),
                    databaseApi: databaseApi,
                    deviceId: deviceId,
                    idToken: ''
                };
                try { context.idToken = await user.getIdToken(); } catch(e) {}
                authApi.onIdTokenChanged(auth, function(currentUser) {
                    if (!currentUser) { context.idToken = ''; return; }
                    currentUser.getIdToken().then(function(token) { context.idToken = token; }).catch(function() {});
                });
                return context;
            })().then(function(ctx) {
                onlinePresenceFirebase = ctx;
                return ctx;
            }).catch(function(error) {
                onlinePresenceFirebasePromise = null;
                throw error;
            });
            return onlinePresenceFirebasePromise;
        }

        async function writeOnlinePresenceRecord(epoch) {
            if (onlinePresenceWriteInFlight || !onlinePresenceWriterActive || !onlinePresenceLeader || !onlinePresenceConnected) return;
            const ctx = onlinePresenceFirebase;
            if (!ctx || !onlinePresenceOwnRef) return;
            onlinePresenceWriteInFlight = true;
            try {
                if (onlinePresenceDisconnect) {
                    try { await onlinePresenceDisconnect.cancel(); } catch(e) {}
                }
                const disconnect = ctx.databaseApi.onDisconnect(onlinePresenceOwnRef);
                await disconnect.remove();
                if (epoch !== onlinePresenceWriterEpoch || !onlinePresenceWriterActive || !onlinePresenceLeader || !onlinePresenceActiveHere()) {
                    try { await disconnect.cancel(); } catch(e) {}
                    return;
                }
                onlinePresenceDisconnect = disconnect;
                await ctx.databaseApi.set(onlinePresenceOwnRef, {
                    uid: ctx.deviceId,
                    online: true,
                    connectedAt: ctx.databaseApi.serverTimestamp(),
                    updatedAt: ctx.databaseApi.serverTimestamp()
                });
                startOnlinePresenceRecordHeartbeat(epoch);
            } catch(error) {
                console.warn('[Presence] Could not register device:', error);
            } finally {
                onlinePresenceWriteInFlight = false;
            }
        }

        function startOnlinePresenceRecordHeartbeat(epoch) {
            clearInterval(onlinePresenceRecordHeartbeatTimer);
            onlinePresenceRecordHeartbeatTimer = setInterval(async function() {
                if (epoch !== onlinePresenceWriterEpoch || !onlinePresenceWriterActive || !onlinePresenceLeader || !onlinePresenceConnected || !onlinePresenceActiveHere()) return;
                const ctx = onlinePresenceFirebase;
                if (!ctx || !onlinePresenceOwnRef || onlinePresenceWriteInFlight) return;
                onlinePresenceWriteInFlight = true;
                try {
                    await ctx.databaseApi.update(onlinePresenceOwnRef, {
                        online: true,
                        updatedAt: ctx.databaseApi.serverTimestamp()
                    });
                } catch(error) {
                    console.warn('[Presence] Heartbeat failed:', error);
                } finally {
                    onlinePresenceWriteInFlight = false;
                }
            }, ONLINE_PRESENCE_HEARTBEAT_MS);
        }

        async function startOnlinePresenceWriter() {
            if (onlinePresenceWriterActive || !onlinePresenceLeader || !onlinePresenceActiveHere()) return;
            clearTimeout(onlinePresenceRetryTimer);
            onlinePresenceRetryTimer = null;
            const epoch = ++onlinePresenceWriterEpoch;
            onlinePresenceWriterActive = true;
            try {
                const ctx = await ensureOnlinePresenceFirebase();
                if (epoch !== onlinePresenceWriterEpoch || !onlinePresenceWriterActive || !onlinePresenceLeader || !onlinePresenceActiveHere()) return;
                const api = ctx.databaseApi;
                onlinePresenceOwnRef = api.ref(ctx.database, 'presence/' + ctx.deviceId);
                const connectedRef = api.ref(ctx.database, '.info/connected');
                const rootRef = api.ref(ctx.database, 'presence');

                onlinePresenceUnsubConnected = api.onValue(connectedRef, function(snapshot) {
                    onlinePresenceConnected = snapshot.val() === true;
                    if (onlinePresenceConnected) writeOnlinePresenceRecord(epoch);
                }, function(error) {
                    console.warn('[Presence] Connection listener failed:', error);
                });

                onlinePresenceUnsubRoot = api.onValue(rootRef, function(snapshot) {
                    const records = [];
                    snapshot.forEach(function(child) { records.push(child.val()); });
                    setOnlinePresenceCount(
                        countFreshOnlinePresenceRecords(records, Date.now(), ONLINE_PRESENCE_STALE_MS),
                        true
                    );
                    // If a previous tab disconnected during a handoff and removed
                    // the shared device record, the current leader repairs it.
                    if (onlinePresenceConnected && !snapshot.hasChild(ctx.deviceId)) {
                        setTimeout(function() { writeOnlinePresenceRecord(epoch); }, 180);
                    }
                }, function(error) {
                    console.warn('[Presence] Count listener failed:', error);
                    setOnlinePresenceCount(null, true);
                });
            } catch(error) {
                onlinePresenceWriterActive = false;
                console.warn('[Presence] Firebase init failed:', error);
                setOnlinePresenceCount(null, true);
                if (onlinePresenceLeader && onlinePresenceActiveHere()) {
                    onlinePresenceRetryTimer = setTimeout(startOnlinePresenceWriter, 10000);
                }
            }
        }

        function sendOnlinePresenceKeepaliveDelete() {
            const ctx = onlinePresenceFirebase;
            if (!ctx || !ctx.deviceId || !ctx.idToken || typeof fetch !== 'function') return;
            const url = FIREBASE_CONFIG.databaseURL + '/presence/' + encodeURIComponent(ctx.deviceId) + '.json?auth=' + encodeURIComponent(ctx.idToken);
            try {
                fetch(url, { method: 'DELETE', mode: 'cors', credentials: 'omit', keepalive: true }).catch(function() {});
            } catch(e) {}
        }

        async function stopOnlinePresenceWriter(removeRecord) {
            const shouldRemove = removeRecord !== false;
            if (shouldRemove) sendOnlinePresenceKeepaliveDelete();
            ++onlinePresenceWriterEpoch;
            clearTimeout(onlinePresenceRetryTimer);
            onlinePresenceRetryTimer = null;
            onlinePresenceWriterActive = false;
            onlinePresenceConnected = false;
            onlinePresenceWriteInFlight = false;
            clearInterval(onlinePresenceRecordHeartbeatTimer);
            onlinePresenceRecordHeartbeatTimer = null;
            if (onlinePresenceUnsubConnected) {
                try { onlinePresenceUnsubConnected(); } catch(e) {}
                onlinePresenceUnsubConnected = null;
            }
            if (onlinePresenceUnsubRoot) {
                try { onlinePresenceUnsubRoot(); } catch(e) {}
                onlinePresenceUnsubRoot = null;
            }
            const disconnect = onlinePresenceDisconnect;
            onlinePresenceDisconnect = null;
            if (disconnect) {
                try { await disconnect.cancel(); } catch(e) {}
            }
            const ownRef = onlinePresenceOwnRef;
            onlinePresenceOwnRef = null;
            if (shouldRemove && ownRef && onlinePresenceFirebase) {
                try { await onlinePresenceFirebase.databaseApi.remove(ownRef); } catch(e) {}
            }
        }

        function setOnlinePresenceLeader(isLeader) {
            isLeader = !!isLeader;
            if (onlinePresenceLeader === isLeader) return;
            onlinePresenceLeader = isLeader;
            if (!isLeader) {
                stopOnlinePresenceWriter(true);
                return;
            }
            // Give the previous tab enough time to cancel its onDisconnect and
            // remove the old record before this tab takes ownership.
            setTimeout(function() {
                if (onlinePresenceLeader && onlinePresenceActiveHere()) startOnlinePresenceWriter();
            }, 350);
        }

        function onlinePresenceWorkerSource() {
            return `(function(){
                const tabs=new Map(); let leader=null; let count=0; let order=0;
                function send(tab,msg){try{tab.port.postMessage(msg);}catch(e){}}
                function all(msg){tabs.forEach(function(tab){send(tab,msg);});}
                function elect(){
                    const now=Date.now(); let next=null;
                    tabs.forEach(function(tab,id){
                        if(now-tab.last>12000)return;
                        if(tab.active&&tab.enabled&&(!next||tab.order<next.tab.order))next={id:id,tab:tab};
                    });
                    const nextId=next?next.id:null;
                    if(nextId===leader)return;
                    if(leader&&tabs.has(leader))send(tabs.get(leader),{type:'leader',value:false});
                    leader=nextId;
                    if(leader&&tabs.has(leader))send(tabs.get(leader),{type:'leader',value:true});
                }
                onconnect=function(event){
                    const port=event.ports[0]; port.start();
                    port.onmessage=function(event){
                        const m=event.data||{}; const now=Date.now();
                        if(m.type==='hello'){
                            const wasLeader=leader===m.id;
                            tabs.set(m.id,{port:port,active:!!m.active,enabled:!!m.enabled,last:now,order:++order});
                            send(tabs.get(m.id),{type:'ready',value:count});
                            if(wasLeader)send(tabs.get(m.id),{type:'leader',value:true});else elect();
                            return;
                        }
                        const tab=tabs.get(m.id); if(!tab)return; tab.last=now;
                        if(m.type==='ping'){return;}
                        if(m.type==='state'){tab.active=!!m.active;tab.enabled=!!m.enabled;elect();return;}
                        if(m.type==='bye'){if(leader===m.id)leader=null;tabs.delete(m.id);elect();return;}
                        if(m.type==='count'&&leader===m.id){count=Math.max(0,Number(m.value)||0);all({type:'count',value:count});return;}
                        if(m.type==='preference'){
                            all({type:'preference',enabled:!!m.enabled});
                        }
                    };
                };
                setInterval(function(){
                    const now=Date.now();
                    tabs.forEach(function(tab,id){if(now-tab.last>12000){if(leader===id)leader=null;tabs.delete(id);}});
                    elect();
                },4000);
            })();`;
        }

        function handleOnlinePresenceCoordinatorMessage(message) {
            const data = message || {};
            if (data.type === 'ready') {
                if (onlinePresenceCoordinatorMode !== 'shared-pending') return;
                clearTimeout(onlinePresenceSharedReadyTimer);
                onlinePresenceCoordinatorMode = 'shared';
                setOnlinePresenceCount(data.value, false);
                return;
            }
            if (data.type === 'leader') {
                setOnlinePresenceLeader(!!data.value);
            } else if (data.type === 'count') {
                setOnlinePresenceCount(data.value, false);
            } else if (data.type === 'preference') {
                const enabled = !!data.enabled;
                if (settings.onlinePresence !== enabled) {
                    settings.onlinePresence = enabled;
                    updateSettingsUI();
                }
                postOnlinePresenceCoordinatorState();
            }
        }

        function startOnlinePresenceSharedWorker() {
            if (typeof SharedWorker === 'undefined') return false;
            try {
                const source = onlinePresenceWorkerSource();
                const url = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(source);
                onlinePresenceSharedWorker = new SharedWorker(url, { name: 'azkar-presence-worker-v3' });
                onlinePresenceCoordinatorMode = 'shared-pending';
                onlinePresenceSharedWorker.port.start();
                onlinePresenceSharedWorker.port.onmessage = function(event) {
                    if (onlinePresenceCoordinatorMode === 'shared-pending' || onlinePresenceCoordinatorMode === 'shared') {
                        handleOnlinePresenceCoordinatorMessage(event.data);
                    }
                };
                onlinePresenceSharedWorker.port.postMessage({
                    type: 'hello',
                    id: getOnlinePresenceTabId(),
                    active: onlinePresenceActiveHere(),
                    enabled: true
                });
                onlinePresenceHeartbeatTimer = setInterval(function() {
                    if (!onlinePresenceSharedWorker) return;
                    try { onlinePresenceSharedWorker.port.postMessage({ type: 'ping', id: onlinePresenceTabId }); } catch(e) {}
                }, 3000);
                onlinePresenceSharedReadyTimer = setTimeout(function() {
                    if (onlinePresenceCoordinatorMode !== 'shared-pending') return;
                    try { onlinePresenceSharedWorker.port.postMessage({ type: 'bye', id: onlinePresenceTabId }); } catch(e) {}
                    try { onlinePresenceSharedWorker.port.close(); } catch(e) {}
                    onlinePresenceSharedWorker = null;
                    clearInterval(onlinePresenceHeartbeatTimer);
                    startOnlinePresenceBroadcastFallback();
                }, 1200);
                return true;
            } catch(error) {
                onlinePresenceSharedWorker = null;
                return false;
            }
        }

        function readOnlinePresenceLease() {
            try {
                const value = JSON.parse(localStorage.getItem(ONLINE_PRESENCE_LEASE_KEY) || 'null');
                return value && value.id ? value : null;
            } catch(e) { return null; }
        }

        function releaseOnlinePresenceLease() {
            const lease = readOnlinePresenceLease();
            if (lease && lease.id === onlinePresenceTabId) {
                try { localStorage.removeItem(ONLINE_PRESENCE_LEASE_KEY); } catch(e) {}
                if (onlinePresenceChannel) {
                    try { onlinePresenceChannel.postMessage({ type: 'release', id: onlinePresenceTabId }); } catch(e) {}
                }
            }
            clearTimeout(onlinePresenceClaimTimer);
            onlinePresenceClaimTimer = null;
            setOnlinePresenceLeader(false);
        }

        function tickOnlinePresenceLease() {
            if (onlinePresenceCoordinatorMode !== 'broadcast') return;
            if (!onlinePresenceActiveHere()) {
                releaseOnlinePresenceLease();
                return;
            }
            const now = Date.now();
            const lease = readOnlinePresenceLease();
            if (onlinePresenceLeader && (!lease || lease.id !== onlinePresenceTabId)) {
                setOnlinePresenceLeader(false);
            }
            if (lease && lease.id === onlinePresenceTabId) {
                try { localStorage.setItem(ONLINE_PRESENCE_LEASE_KEY, JSON.stringify({ id: onlinePresenceTabId, expires: now + 7000 })); } catch(e) {}
                setOnlinePresenceLeader(true);
                return;
            }
            if (lease && Number(lease.expires) > now) return;
            if (onlinePresenceClaimTimer) return;
            onlinePresenceClaimTimer = setTimeout(function() {
                onlinePresenceClaimTimer = null;
                if (!onlinePresenceActiveHere() || onlinePresenceCoordinatorMode !== 'broadcast') return;
                const latest = readOnlinePresenceLease();
                if (latest && Number(latest.expires) > Date.now()) return;
                try {
                    localStorage.setItem(ONLINE_PRESENCE_LEASE_KEY, JSON.stringify({ id: onlinePresenceTabId, expires: Date.now() + 7000 }));
                    const won = readOnlinePresenceLease();
                    if (won && won.id === onlinePresenceTabId) {
                        if (onlinePresenceChannel) onlinePresenceChannel.postMessage({ type: 'claim', id: onlinePresenceTabId });
                        setOnlinePresenceLeader(true);
                    }
                } catch(e) {}
            }, 30 + Math.floor(Math.random() * 120));
        }

        function startOnlinePresenceBroadcastFallback() {
            onlinePresenceCoordinatorMode = 'broadcast';
            try {
                onlinePresenceChannel = new BroadcastChannel(ONLINE_PRESENCE_CHANNEL);
                onlinePresenceChannel.onmessage = function(event) {
                    const data = event.data || {};
                    if (data.id === onlinePresenceTabId) return;
                    if (data.type === 'count') setOnlinePresenceCount(data.value, false);
                    else if (data.type === 'claim' || data.type === 'release') tickOnlinePresenceLease();
                    else if (data.type === 'preference') {
                        const enabled = !!data.enabled;
                        if (settings.onlinePresence !== enabled) {
                            settings.onlinePresence = enabled;
                            updateSettingsUI();
                        }
                        tickOnlinePresenceLease();
                    }
                };
            } catch(e) { onlinePresenceChannel = null; }
            onlinePresenceLeaseTimer = setInterval(tickOnlinePresenceLease, 2000);
            tickOnlinePresenceLease();
        }

        function postOnlinePresenceCoordinatorState() {
            if (!onlinePresenceCoordinatorStarted) return;
            const active = onlinePresenceActiveHere();
            if (!active && onlinePresenceLeader) setOnlinePresenceLeader(false);
            if ((onlinePresenceCoordinatorMode === 'shared' || onlinePresenceCoordinatorMode === 'shared-pending') && onlinePresenceSharedWorker) {
                try {
                    onlinePresenceSharedWorker.port.postMessage({
                        type: 'state', id: onlinePresenceTabId, active: active, enabled: true
                    });
                } catch(e) {}
            } else if (onlinePresenceCoordinatorMode === 'broadcast') {
                tickOnlinePresenceLease();
            }
        }

        function sayOnlinePresenceGoodbye() {
            if (!onlinePresenceCoordinatorStarted) return;
            if (onlinePresenceSharedWorker) {
                try { onlinePresenceSharedWorker.port.postMessage({ type: 'bye', id: onlinePresenceTabId }); } catch(e) {}
            }
            if (onlinePresenceCoordinatorMode === 'broadcast') releaseOnlinePresenceLease();
            setOnlinePresenceLeader(false);
        }

        function helloOnlinePresenceAgain() {
            if (!onlinePresenceCoordinatorStarted) return;
            if (onlinePresenceSharedWorker && (onlinePresenceCoordinatorMode === 'shared' || onlinePresenceCoordinatorMode === 'shared-pending')) {
                try {
                    onlinePresenceSharedWorker.port.postMessage({
                        type: 'hello', id: onlinePresenceTabId,
                        active: onlinePresenceActiveHere(), enabled: true
                    });
                } catch(e) {}
            } else if (onlinePresenceCoordinatorMode === 'broadcast') {
                tickOnlinePresenceLease();
            }
        }

        function initOnlinePresence() {
            if (onlinePresenceCoordinatorStarted) {
                postOnlinePresenceCoordinatorState();
                return;
            }
            onlinePresenceCoordinatorStarted = true;
            getOnlinePresenceTabId();
            try {
                const savedCount = Number(localStorage.getItem(ONLINE_PRESENCE_COUNT_KEY));
                if (Number.isFinite(savedCount)) setOnlinePresenceCount(savedCount, false);
            } catch(e) {}
            if (!startOnlinePresenceSharedWorker()) startOnlinePresenceBroadcastFallback();

            document.addEventListener('visibilitychange', postOnlinePresenceCoordinatorState);
            window.addEventListener('pagehide', sayOnlinePresenceGoodbye);
            window.addEventListener('beforeunload', sayOnlinePresenceGoodbye);
            window.addEventListener('pageshow', helloOnlinePresenceAgain);
            window.addEventListener('storage', function(event) {
                if (event.key === ONLINE_PRESENCE_LEASE_KEY && onlinePresenceCoordinatorMode === 'broadcast') {
                    tickOnlinePresenceLease();
                } else if (event.key === ONLINE_PRESENCE_COUNT_KEY && event.newValue !== null) {
                    setOnlinePresenceCount(event.newValue, false);
                } else if (event.key === 'azkar_settings' && event.newValue) {
                    try {
                        const otherSettings = JSON.parse(event.newValue);
                        if (typeof otherSettings.onlinePresence === 'boolean' && otherSettings.onlinePresence !== settings.onlinePresence) {
                            settings.onlinePresence = otherSettings.onlinePresence;
                            updateSettingsUI();
                        }
                    } catch(e) {}
                }
            });
        }

        function onlinePresencePreferenceChanged() {
            if (!onlinePresenceCoordinatorStarted) initOnlinePresence();
            const enabled = onlinePresenceEnabled();
            if (onlinePresenceSharedWorker && (onlinePresenceCoordinatorMode === 'shared' || onlinePresenceCoordinatorMode === 'shared-pending')) {
                try { onlinePresenceSharedWorker.port.postMessage({ type: 'preference', id: onlinePresenceTabId, enabled: enabled }); } catch(e) {}
            } else if (onlinePresenceCoordinatorMode === 'broadcast') {
                if (onlinePresenceChannel) {
                    try { onlinePresenceChannel.postMessage({ type: 'preference', id: onlinePresenceTabId, enabled: enabled }); } catch(e) {}
                }
                tickOnlinePresenceLease();
            }
            postOnlinePresenceCoordinatorState();
        }

        function firebaseProfileFromUser(user) {
            return {
                provider: 'firebase-google',
                id: user.uid || '',
                uid: user.uid || '',
                email: user.email || '',
                name: user.displayName || user.email || 'Google user',
                given_name: user.displayName || '',
                picture: user.photoURL || '',
                signedAt: new Date().toISOString()
            };
        }

        async function applyFirebaseUser(user, options) {
            if (!user) return;
            const syncToken = ++firebaseSyncEpoch;
            if (options && options.sync) {
                const synced = await startFirebaseCloudSync(user, syncToken);
                if (!synced || syncToken !== firebaseSyncEpoch) return;
            }
            if (syncToken === firebaseSyncEpoch) saveGoogleAccount(firebaseProfileFromUser(user));
        }

        // ==================== CLOUD SYNC ENGINE v2 ====================
        // Dhikr numbers (azkar_count, azkar_stats_v2, azkar_dhikr_totals) are
        // NEVER uploaded as a whole copy from a device. The cloud value changes
        // only through Firestore transactions that add this device's taps the
        // cloud has not seen yet (signed deltas, so "-100" works too), or by an
        // explicit user action (reset counter / clear stats / import backup).
        // Every device shows:   cloud value + its own not-yet-uploaded taps.
        // A stale device (a PC that slept, an old tab) therefore can never
        // write its old numbers over newer ones.
        //
        // All other data (settings, duas, special progress, tasks...) syncs per
        // key: a device uploads only the keys it actually changed since the
        // last sync, and when two devices changed the same JSON object the
        // fields are merged (3-way merge against the last synced copy).
        const DHIKR_DELTA_V2_PREFIX = 'azkar_dhikr_delta_v2_';
        const SYNC_BASE_PREFIX = 'azkar_sync_base_v2_';
        const SYNC_MARKER_PREFIX = '__sync_device_';
        const DHIKR_KEY_DEFAULTS = { azkar_count: '0', azkar_dhikr_totals: '{}', azkar_stats_v2: '{}' };
        let _dhikrForceFlush = false;
        let _appDataPushPromise = null;
        let _appDataPushAgain = false;
        let _appDataPushTimer = null;
        let _cloudSyncRetryTimer = null;
        let _realtimeRetryTimer = null;

        function _syncHas(obj, key) {
            return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
        }

        function syncSafeId(value) {
            return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_');
        }

        function newSyncId() {
            try {
                if (crypto && typeof crypto.randomUUID === 'function') return syncSafeId(crypto.randomUUID());
            } catch(e) {}
            return 'd-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
        }

        // The account whose data is currently on this device (null for guests).
        function resolveSyncUid() {
            if (firebaseCurrentUid && localDataBelongsToFirebaseUser(firebaseCurrentUid)) return firebaseCurrentUid;
            const rememberedUid = getActiveDataOwnerUid();
            return (rememberedUid && googleAccount && String(googleAccount.uid || googleAccount.id || '') === rememberedUid)
                ? rememberedUid
                : null;
        }

        // ---------- JSON helpers ----------
        function sameSyncJson(a, b) {
            if (a === b) return true;
            if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
            if (Array.isArray(a) !== Array.isArray(b)) return false;
            if (Array.isArray(a)) {
                if (a.length !== b.length) return false;
                for (let i = 0; i < a.length; i++) if (!sameSyncJson(a[i], b[i])) return false;
                return true;
            }
            const ka = Object.keys(a);
            if (ka.length !== Object.keys(b).length) return false;
            for (let i = 0; i < ka.length; i++) {
                if (!_syncHas(b, ka[i]) || !sameSyncJson(a[ka[i]], b[ka[i]])) return false;
            }
            return true;
        }

        // Stored values are strings (or null when the key is absent). Two JSON
        // strings that differ only in key order are the same value.
        function sameStoredValue(x, y) {
            if (x === undefined) x = null;
            if (y === undefined) y = null;
            if (x === y) return true;
            if (x === null || y === null) return false;
            try { return sameSyncJson(JSON.parse(x), JSON.parse(y)); } catch(e) { return false; }
        }

        // 3-way merge of one stored value: base = last synced copy.
        function mergeSyncValue3(baseRaw, localRaw, remoteRaw) {
            if (localRaw === null || remoteRaw === null) return localRaw;
            let b, l, r;
            try {
                l = JSON.parse(localRaw);
                r = JSON.parse(remoteRaw);
                b = baseRaw === null || baseRaw === undefined ? {} : JSON.parse(baseRaw);
            } catch(e) {
                return localRaw;
            }
            if (!_isPlainSyncObject(l) || !_isPlainSyncObject(r)) return localRaw;
            const bo = _isPlainSyncObject(b) ? b : {};
            const out = { ...r };
            new Set([...Object.keys(bo), ...Object.keys(l)]).forEach(function(k) {
                const inB = _syncHas(bo, k);
                const inL = _syncHas(l, k);
                if (inB && inL && sameSyncJson(bo[k], l[k])) return; // not changed here → keep cloud
                if (!inL) { if (inB) delete out[k]; return; }        // deleted here
                out[k] = l[k];                                         // changed / added here
            });
            return JSON.stringify(out);
        }

        // ---------- signed dhikr deltas ----------
        function emptyDhikrPart() {
            return { main: 0, totals: {}, stats: {} };
        }

        function normalizeDhikrPart(part) {
            const src = part && typeof part === 'object' ? part : {};
            const toInt = function(v) {
                const n = Math.trunc(Number(v));
                return Number.isFinite(n) ? n : 0;
            };
            const cleanMap = function(value) {
                const out = {};
                if (!value || typeof value !== 'object') return out;
                Object.keys(value).forEach(function(k) {
                    const n = toInt(value[k]);
                    if (n) out[k] = n;
                });
                return out;
            };
            return { main: toInt(src.main), totals: cleanMap(src.totals), stats: cleanMap(src.stats) };
        }

        function diffDhikrParts(a, b) {
            const x = normalizeDhikrPart(a);
            const y = normalizeDhikrPart(b);
            const mapDiff = function(m1, m2) {
                const out = {};
                new Set([...Object.keys(m1), ...Object.keys(m2)]).forEach(function(k) {
                    const d = (m1[k] || 0) - (m2[k] || 0);
                    if (d) out[k] = d;
                });
                return out;
            };
            return { main: x.main - y.main, totals: mapDiff(x.totals, y.totals), stats: mapDiff(x.stats, y.stats) };
        }

        function dhikrPartIsZero(p) {
            return !p.main && !Object.keys(p.totals).length && !Object.keys(p.stats).length;
        }

        function dhikrPartSize(p) {
            let size = Math.abs(p.main);
            Object.keys(p.totals).forEach(function(k) { size = Math.max(size, Math.abs(p.totals[k])); });
            return size;
        }

        function dhikrDeltaStorageKey(uid) {
            return DHIKR_DELTA_V2_PREFIX + syncSafeId(uid);
        }

        function normalizeDhikrReset(reset) {
            if (!reset || typeof reset !== 'object' || !reset.values || typeof reset.values !== 'object') return null;
            const values = {};
            FIREBASE_ATOMIC_DHIKR_KEYS.forEach(function(key) {
                if (typeof reset.values[key] === 'string') values[key] = reset.values[key];
            });
            if (!Object.keys(values).length) return null;
            return { id: String(reset.id || newSyncId()), values: values, cum: normalizeDhikrPart(reset.cum) };
        }

        // Per account, per device:
        //   sid          — id of this device's marker document in the cloud
        //   cumulative   — every tap ever recorded here (signed running sum)
        //   acknowledged — the part the cloud has confirmed
        //   reset        — an explicit "set these numbers" action not yet uploaded
        function loadDhikrDeltaState(uid) {
            let parsed = null;
            try { parsed = JSON.parse(localStorage.getItem(dhikrDeltaStorageKey(uid)) || 'null'); } catch(e) {}
            if (parsed && parsed.v === 2 && typeof parsed.sid === 'string' && parsed.sid) {
                return {
                    v: 2,
                    sid: syncSafeId(parsed.sid),
                    cumulative: normalizeDhikrPart(parsed.cumulative),
                    acknowledged: normalizeDhikrPart(parsed.acknowledged),
                    reset: normalizeDhikrReset(parsed.reset)
                };
            }
            // Migration from the v1 format: keep only taps that were never
            // uploaded and start a fresh marker for this device.
            const state = { v: 2, sid: newSyncId(), cumulative: emptyDhikrPart(), acknowledged: emptyDhikrPart(), reset: null };
            try {
                const oldKey = DHIKR_DELTA_STORAGE_PREFIX + syncSafeId(uid);
                const old = JSON.parse(localStorage.getItem(oldKey) || 'null');
                if (old && typeof old === 'object') {
                    const pending = diffDhikrParts(old.cumulative, old.acknowledged);
                    state.cumulative.main = Math.max(0, pending.main);
                    Object.keys(pending.totals).forEach(function(k) { if (pending.totals[k] > 0) state.cumulative.totals[k] = pending.totals[k]; });
                    Object.keys(pending.stats).forEach(function(k) { if (pending.stats[k] > 0) state.cumulative.stats[k] = pending.stats[k]; });
                    localStorage.removeItem(oldKey);
                }
            } catch(e) {}
            saveDhikrDeltaState(uid, state);
            return state;
        }

        function saveDhikrDeltaState(uid, state) {
            try { localStorage.setItem(dhikrDeltaStorageKey(uid), JSON.stringify(state)); } catch(e) {}
        }

        function dhikrStateNeedsUpload(state) {
            return !!state.reset || !dhikrPartIsZero(diffDhikrParts(state.cumulative, state.acknowledged));
        }

        // Records a signed change made on this device:
        //   { main: n, totals: { dhikrId: n }, stats: { 'YYYY-MM-DD': n } }
        function recordDhikrCloudDeltaParts(parts) {
            if (firebaseRemoteImporting) return;
            const uid = resolveSyncUid();
            if (!uid) return;
            const add = normalizeDhikrPart(parts);
            if (dhikrPartIsZero(add)) return;
            const state = loadDhikrDeltaState(uid);
            state.cumulative.main += add.main;
            Object.keys(add.totals).forEach(function(k) { state.cumulative.totals[k] = (state.cumulative.totals[k] || 0) + add.totals[k]; });
            Object.keys(add.stats).forEach(function(k) { state.cumulative.stats[k] = (state.cumulative.stats[k] || 0) + add.stats[k]; });
            saveDhikrDeltaState(uid, state);
            const pending = diffDhikrParts(state.cumulative, state.acknowledged);
            scheduleDhikrDeltaSync(dhikrPartSize(pending) >= DHIKR_SYNC_BATCH_SIZE ? 0 : DHIKR_SYNC_IDLE_MS);
        }

        function recordDhikrCloudDelta(dhikrId, statDay, incrementsMainCounter, amount) {
            const n = Math.trunc(Number(amount)) || 1;
            const parts = { main: incrementsMainCounter ? n : 0, totals: {}, stats: {} };
            if (dhikrId) parts.totals[dhikrId] = n;
            if (statDay) parts.stats[statDay] = n;
            recordDhikrCloudDeltaParts(parts);
        }

        function scheduleDhikrDeltaSync(delayMs) {
            if (_dhikrDeltaSyncTimer) clearTimeout(_dhikrDeltaSyncTimer);
            _dhikrDeltaSyncTimer = setTimeout(function() {
                _dhikrDeltaSyncTimer = null;
                flushDhikrDeltaSync();
            }, Math.max(0, Number(delayMs) || 0));
        }

        // What this device must show = cloud value + own taps the cloud has not
        // counted yet. markerPart = this device's marker in the same cloud
        // snapshot (exactly what the cloud has already counted from here).
        function composeDhikrValues(remoteValues, state, markerPart) {
            const reset = state.reset;
            const pendNormal = diffDhikrParts(state.cumulative, markerPart || state.acknowledged);
            const pendReset = reset ? diffDhikrParts(state.cumulative, reset.cum) : null;
            const pick = function(key) {
                if (reset && _syncHas(reset.values, key)) return { raw: reset.values[key], pend: pendReset };
                return { raw: remoteValues && _syncHas(remoteValues, key) ? remoteValues[key] : null, pend: pendNormal };
            };
            const c = pick('azkar_count');
            const count = Math.max(0, (Math.trunc(Number(c.raw)) || 0) + c.pend.main);
            const t = pick('azkar_dhikr_totals');
            const totals = _parseSyncJsonObject(t.raw);
            Object.keys(t.pend.totals).forEach(function(k) {
                totals[k] = Math.max(0, (Number(totals[k]) || 0) + t.pend.totals[k]);
            });
            const s = pick('azkar_stats_v2');
            const stats = _parseSyncJsonObject(s.raw);
            Object.keys(s.pend.stats).forEach(function(day) {
                if (!_isPlainSyncObject(stats[day])) stats[day] = { count: 0 };
                stats[day].count = Math.max(0, (Number(stats[day].count) || 0) + s.pend.stats[day]);
            });
            return {
                azkar_count: String(count),
                azkar_dhikr_totals: JSON.stringify(totals),
                azkar_stats_v2: JSON.stringify(stats)
            };
        }

        function reloadDhikrStateFromStorage() {
            count = parseInt(localStorage.getItem('azkar_count') || '0', 10) || 0;
            if (isNaN(goalBaseline) || goalBaseline < 0 || goalBaseline > count) goalBaseline = 0; if (customBaseline > count) customBaseline = 0;
            _statsCache = _parseSyncJsonObject(localStorage.getItem('azkar_stats_v2'));
            pendingStatsSave = false;
            loadDhikrTotals();
            updateDisplay();
            try { updatePipCounter(); } catch(e) {}
            try { updateDhikrOverallProgress(); } catch(e) {}
            markDirty('stats');
            try { if (_isScreenActive('screen-stats')) { renderStats(); _dirty.stats = false; } } catch(e) {}
        }

        // ---------- last synced copy of the non-dhikr keys ----------
        function syncBaseKey(uid) {
            return SYNC_BASE_PREFIX + syncSafeId(uid);
        }

        function loadSyncBase(uid) {
            try {
                const data = JSON.parse(localStorage.getItem(syncBaseKey(uid)) || 'null');
                return data && data.values && typeof data.values === 'object' ? data.values : null;
            } catch(e) {
                return null;
            }
        }

        function saveSyncBase(uid, values) {
            try { localStorage.setItem(syncBaseKey(uid), JSON.stringify({ v: 2, values: values || {} })); } catch(e) {}
        }

        // ---------- reading cloud rows ----------
        function readRemoteRows(querySnap) {
            const out = { values: {}, markers: {}, pendingKeys: new Set(), hasAppData: false };
            querySnap.forEach(function(row) {
                const id = row.id;
                const item = row.data() || {};
                const value = (!item.deleted && typeof item.value === 'string') ? item.value : null;
                if (id.indexOf(SYNC_MARKER_PREFIX) === 0) {
                    if (value !== null) out.markers[id.slice(SYNC_MARKER_PREFIX.length)] = value;
                    return;
                }
                if (APP_DATA_KEYS.indexOf(id) === -1) return;
                out.hasAppData = true;
                if (row.metadata && row.metadata.hasPendingWrites) out.pendingKeys.add(id);
                if (value !== null) out.values[id] = value;
            });
            return out;
        }

        // Builds the state this device must show from a full cloud snapshot and
        // writes it into localStorage when anything differs.
        function applyCloudState(uid, remote, options) {
            const opts = options || {};
            flushSave();
            const local = opts.localSnapshot || AppStorage.exportAll();
            const base = _syncHas(opts, 'base') ? opts.base : loadSyncBase(uid);
            const state = loadDhikrDeltaState(uid);
            const markerRaw = _syncHas(remote.markers, state.sid) ? remote.markers[state.sid] : null;
            const markerPart = markerRaw !== null ? normalizeDhikrPart(_parseSyncJsonObject(markerRaw)) : null;

            const next = {};
            const newBase = {};
            const dirtyKeys = [];
            const changedKeys = [];
            const localValue = function(key) { return _syncHas(local, key) ? local[key] : null; };

            APP_DATA_KEYS.forEach(function(key) {
                if (FIREBASE_ATOMIC_DHIKR_KEYS.has(key)) return;
                const l = localValue(key);
                let result;
                if (remote.pendingKeys.has(key)) {
                    // Our own upload of this key is still on its way.
                    result = l;
                    newBase[key] = base && _syncHas(base, key) ? base[key] : l;
                } else {
                    const r = _syncHas(remote.values, key) ? remote.values[key] : null;
                    const b = base ? (_syncHas(base, key) ? base[key] : null) : undefined;
                    if (b === undefined) result = r !== null ? r : l;          // nothing known → cloud wins
                    else if (sameStoredValue(l, b)) result = r;                // unchanged here → cloud
                    else if (sameStoredValue(r, b) || sameStoredValue(r, l)) result = l; // changed only here
                    else result = mergeSyncValue3(b, l, r);                    // changed on both
                    newBase[key] = r;
                }
                if (sameStoredValue(result, l)) result = l;
                if (result !== null && result !== undefined) next[key] = result;
                if (!sameStoredValue(result, newBase[key])) dirtyKeys.push(key);
                if (!sameStoredValue(result, l)) changedKeys.push(key);
            });

            const dhikr = composeDhikrValues(remote.values, state, markerPart);
            FIREBASE_ATOMIC_DHIKR_KEYS.forEach(function(key) {
                const l = localValue(key);
                if (sameStoredValue(l, dhikr[key])) {
                    if (l !== null) next[key] = l;
                } else {
                    next[key] = dhikr[key];
                    changedKeys.push(key);
                }
            });

            if (changedKeys.length || opts.forceWrite) {
                firebaseRemoteImporting = true;
                try {
                    if (opts.forceWrite) {
                        AppStorage.replaceAll(next);
                    } else {
                        changedKeys.forEach(function(key) {
                            try {
                                if (_syncHas(next, key)) localStorage.setItem(key, next[key]);
                                else localStorage.removeItem(key);
                            } catch(e) {}
                        });
                    }
                    if (opts.setOwner) setActiveDataOwnerUid(uid);
                    const onlyDhikr = !opts.forceWrite && changedKeys.every(function(key) { return FIREBASE_ATOMIC_DHIKR_KEYS.has(key); });
                    if (onlyDhikr) reloadDhikrStateFromStorage();
                    else reloadAppStateFromStorage();
                } finally {
                    firebaseRemoteImporting = false;
                }
            } else if (opts.setOwner) {
                setActiveDataOwnerUid(uid);
            }

            const baseChanged = !base || APP_DATA_KEYS.some(function(key) {
                if (FIREBASE_ATOMIC_DHIKR_KEYS.has(key)) return false;
                return (_syncHas(base, key) ? base[key] : null) !== (_syncHas(newBase, key) ? newBase[key] : null);
            });
            if (baseChanged) saveSyncBase(uid, newBase);
            if (changedKeys.length || opts.setOwner) {
                saveFirebaseAccountLocalSnapshot(uid, AppStorage.exportAll(), Date.now(), dirtyKeys.length > 0);
            }

            // The cloud has not counted everything this device recorded (or a
            // late transaction left the marker behind) → upload again.
            const idle = !_dhikrDeltaSyncTimer && !_dhikrDeltaSyncPromise;
            if (dhikrStateNeedsUpload(state)) {
                if (idle) scheduleDhikrDeltaSync(DHIKR_SYNC_IDLE_MS);
            } else if (markerPart && !dhikrPartIsZero(diffDhikrParts(state.cumulative, markerPart))) {
                _dhikrForceFlush = true;
                if (idle) scheduleDhikrDeltaSync(DHIKR_SYNC_IDLE_MS);
            }
            return { dirtyKeys: dirtyKeys, changedKeys: changedKeys };
        }

        // ---------- uploading dhikr changes ----------
        async function flushDhikrDeltaSync() {
            if (_dhikrDeltaSyncPromise) return _dhikrDeltaSyncPromise;
            const uid = firebaseCurrentUid;
            const remote = AppStorage.remote;
            if (!uid || !localDataBelongsToFirebaseUser(uid) || !remote || typeof remote.commitDhikr !== 'function') return false;
            const state = loadDhikrDeltaState(uid);
            if (!dhikrStateNeedsUpload(state) && !_dhikrForceFlush) return true;
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                scheduleDhikrDeltaSync(5000);
                return false;
            }
            _dhikrForceFlush = false;
            const reset = state.reset;
            const sent = reset ? normalizeDhikrPart(reset.cum) : normalizeDhikrPart(state.cumulative);
            _dhikrDeltaSyncPromise = (async function() {
                try {
                    const canonical = await remote.commitDhikr(state.sid, sent, state.acknowledged, reset ? reset.values : null);
                    if (firebaseCurrentUid !== uid || AppStorage.remote !== remote) return false;
                    const latest = loadDhikrDeltaState(uid);
                    if (latest.sid === state.sid) {
                        latest.acknowledged = sent;
                        if (reset && latest.reset && latest.reset.id === reset.id) latest.reset = null;
                        saveDhikrDeltaState(uid, latest);
                    }
                    applyCanonicalDhikr(uid, canonical, sent);
                    if (dhikrStateNeedsUpload(loadDhikrDeltaState(uid))) scheduleDhikrDeltaSync(reset ? 0 : DHIKR_SYNC_IDLE_MS);
                    return true;
                } catch(e) {
                    console.warn('[Firebase dhikr sync] Upload failed:', e);
                    scheduleDhikrDeltaSync(5000);
                    return false;
                } finally {
                    _dhikrDeltaSyncPromise = null;
                }
            })();
            return _dhikrDeltaSyncPromise;
        }

        // Applies the exact values a transaction just wrote: they contain
        // everything up to `sent`; taps made during the upload are added on top.
        function applyCanonicalDhikr(uid, canonical, sent) {
            if (!canonical || firebaseCurrentUid !== uid) return;
            flushSave();
            const state = loadDhikrDeltaState(uid);
            const dhikr = composeDhikrValues(canonical, state, normalizeDhikrPart(sent));
            const changed = [];
            FIREBASE_ATOMIC_DHIKR_KEYS.forEach(function(key) {
                if (!sameStoredValue(localStorage.getItem(key), dhikr[key])) changed.push(key);
            });
            if (!changed.length) return;
            firebaseRemoteImporting = true;
            try {
                changed.forEach(function(key) { try { localStorage.setItem(key, dhikr[key]); } catch(e) {} });
                reloadDhikrStateFromStorage();
            } finally {
                firebaseRemoteImporting = false;
            }
        }

        // An explicit user action that SETS dhikr numbers (reset counter, clear
        // stats, import a backup). The current local values of `keys` become the
        // cloud values; taps recorded before this moment are folded into them.
        function replaceFirebaseDhikrState(keys) {
            const uid = resolveSyncUid();
            if (!uid) return;
            flushSave();
            const local = AppStorage.exportAll();
            const state = loadDhikrDeltaState(uid);
            const allKeys = new Set(keys && keys.length ? keys : Array.from(FIREBASE_ATOMIC_DHIKR_KEYS));
            if (state.reset) Object.keys(state.reset.values).forEach(function(key) { allKeys.add(key); });
            const values = {};
            allKeys.forEach(function(key) {
                if (!FIREBASE_ATOMIC_DHIKR_KEYS.has(key)) return;
                values[key] = _syncHas(local, key) ? local[key] : DHIKR_KEY_DEFAULTS[key];
            });
            if (!Object.keys(values).length) return;
            state.reset = { id: newSyncId(), values: values, cum: normalizeDhikrPart(state.cumulative) };
            saveDhikrDeltaState(uid, state);
            scheduleDhikrDeltaSync(0);
        }

        // ---------- uploading the other keys ----------
        function schedulePushDirtyAppData(uid, delayMs) {
            if (_appDataPushTimer) clearTimeout(_appDataPushTimer);
            _appDataPushTimer = setTimeout(function() {
                _appDataPushTimer = null;
                pushDirtyAppData(uid);
            }, Math.max(0, Number(delayMs) || 0));
        }

        function flushPendingAppDataPush() {
            if (_dataSyncTimer) {
                clearTimeout(_dataSyncTimer);
                _dataSyncTimer = null;
            }
            const uid = resolveSyncUid();
            if (uid) pushDirtyAppData(uid);
        }

        async function pushDirtyAppData(uid) {
            if (!uid || getActiveDataOwnerUid() !== uid) return false;
            if (_appDataPushPromise) {
                _appDataPushAgain = true;
                return _appDataPushPromise;
            }
            flushSave();
            const snapshot = AppStorage.exportAll();
            const remote = AppStorage.remote;
            if (firebaseCurrentUid !== uid || !remote || typeof remote.pushKeys !== 'function') {
                saveFirebaseAccountLocalSnapshot(uid, snapshot, Date.now(), true);
                return false;
            }
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                saveFirebaseAccountLocalSnapshot(uid, snapshot, Date.now(), true);
                schedulePushDirtyAppData(uid, 5000);
                return false;
            }
            const base = loadSyncBase(uid) || {};
            const keys = APP_DATA_KEYS.filter(function(key) {
                if (FIREBASE_ATOMIC_DHIKR_KEYS.has(key)) return false;
                return !sameStoredValue(_syncHas(snapshot, key) ? snapshot[key] : null, _syncHas(base, key) ? base[key] : null);
            });
            if (!keys.length) {
                saveFirebaseAccountLocalSnapshot(uid, snapshot, Date.now(), false);
                return true;
            }
            saveFirebaseAccountLocalSnapshot(uid, snapshot, Date.now(), true);
            _appDataPushPromise = (async function() {
                try {
                    await remote.pushKeys(snapshot, keys);
                    if (firebaseCurrentUid !== uid) return false;
                    const latestBase = loadSyncBase(uid) || {};
                    keys.forEach(function(key) { latestBase[key] = _syncHas(snapshot, key) ? snapshot[key] : null; });
                    saveSyncBase(uid, latestBase);
                    return true;
                } catch(e) {
                    console.warn('[Firebase sync] Push failed:', e);
                    schedulePushDirtyAppData(uid, 5000);
                    return false;
                } finally {
                    _appDataPushPromise = null;
                    if (_appDataPushAgain) {
                        _appDataPushAgain = false;
                        schedulePushDirtyAppData(uid, 0);
                    }
                }
            })();
            return _appDataPushPromise;
        }

        function createFirebaseRemoteAdapter(uid) {
            const db = firebaseDb;
            const api = firebaseFirestoreApi;
            const keyDoc = (key) => api.doc(db, 'users', uid, 'appData', key);
            const metaDoc = api.doc(db, 'users', uid, 'meta', 'sync');
            const collRef = api.collection(db, 'users', uid, 'appData');
            // meta/sync is still written so devices running an older version of
            // the app notice the change.
            const touchMeta = function(writer, now) {
                writer.set(metaDoc, { updatedAtMs: now, updatedAt: api.serverTimestamp(), app: 'azkar-pwa' }, { merge: true });
            };
            const readValue = function(snap) {
                if (!snap || !snap.exists()) return null;
                const d = snap.data() || {};
                return (!d.deleted && typeof d.value === 'string') ? d.value : null;
            };

            return {
                uid: uid,
                async pushKeys(snapshot, keys) {
                    const now = Date.now();
                    const batch = api.writeBatch(db);
                    keys.forEach(function(key) {
                        if (FIREBASE_ATOMIC_DHIKR_KEYS.has(key)) return;
                        const hasValue = _syncHas(snapshot, key);
                        batch.set(keyDoc(key), {
                            value: hasValue ? snapshot[key] : null,
                            deleted: !hasValue,
                            updatedAtMs: now
                        }, { merge: true });
                    });
                    touchMeta(batch, now);
                    await batch.commit();
                    try { localStorage.setItem(firebaseSyncStampKey(uid), String(now)); } catch(e) {}
                },
                async commitDhikr(sid, sent, acknowledged, setValues) {
                    const countRef = keyDoc('azkar_count');
                    const totalsRef = keyDoc('azkar_dhikr_totals');
                    const statsRef = keyDoc('azkar_stats_v2');
                    const deviceRef = keyDoc(SYNC_MARKER_PREFIX + sid);
                    const sentPart = normalizeDhikrPart(sent);
                    const sets = setValues && typeof setValues === 'object' ? setValues : null;
                    const hasSet = function(key) { return !!sets && _syncHas(sets, key); };

                    const run = function(useMarker) {
                        return api.runTransaction(db, async function(tx) {
                            const countSnap = await tx.get(countRef);
                            const totalsSnap = await tx.get(totalsRef);
                            const statsSnap = await tx.get(statsRef);
                            const deviceSnap = useMarker ? await tx.get(deviceRef) : null;
                            const countRaw = readValue(countSnap);
                            const totalsRaw = readValue(totalsSnap);
                            const statsRaw = readValue(statsSnap);
                            const markerRaw = readValue(deviceSnap);
                            // What the cloud has already counted from this device.
                            const previous = markerRaw !== null
                                ? normalizeDhikrPart(_parseSyncJsonObject(markerRaw))
                                : normalizeDhikrPart(acknowledged);
                            const delta = diffDhikrParts(sentPart, previous);

                            if (!sets && dhikrPartIsZero(delta)) {
                                return {
                                    azkar_count: countRaw !== null ? countRaw : '0',
                                    azkar_dhikr_totals: totalsRaw !== null ? totalsRaw : '{}',
                                    azkar_stats_v2: statsRaw !== null ? statsRaw : '{}'
                                };
                            }

                            const remoteCount = hasSet('azkar_count')
                                ? Math.max(0, Math.trunc(Number(sets.azkar_count)) || 0)
                                : Math.max(0, (Math.trunc(Number(countRaw)) || 0) + delta.main);
                            let totals;
                            if (hasSet('azkar_dhikr_totals')) {
                                totals = _parseSyncJsonObject(sets.azkar_dhikr_totals);
                            } else {
                                totals = _parseSyncJsonObject(totalsRaw);
                                Object.keys(delta.totals).forEach(function(k) {
                                    totals[k] = Math.max(0, (Number(totals[k]) || 0) + delta.totals[k]);
                                });
                            }
                            let stats;
                            if (hasSet('azkar_stats_v2')) {
                                stats = _parseSyncJsonObject(sets.azkar_stats_v2);
                            } else {
                                stats = _parseSyncJsonObject(statsRaw);
                                Object.keys(delta.stats).forEach(function(day) {
                                    if (!_isPlainSyncObject(stats[day])) stats[day] = { count: 0 };
                                    stats[day].count = Math.max(0, (Number(stats[day].count) || 0) + delta.stats[day]);
                                });
                            }

                            const now = Date.now();
                            const canonical = {
                                azkar_count: String(remoteCount),
                                azkar_dhikr_totals: JSON.stringify(totals),
                                azkar_stats_v2: JSON.stringify(stats)
                            };
                            const writeValue = function(ref, value) {
                                tx.set(ref, { value: value, deleted: false, updatedAtMs: now }, { merge: true });
                            };
                            writeValue(countRef, canonical.azkar_count);
                            writeValue(totalsRef, canonical.azkar_dhikr_totals);
                            writeValue(statsRef, canonical.azkar_stats_v2);
                            if (useMarker) writeValue(deviceRef, JSON.stringify(sentPart));
                            touchMeta(tx, now);
                            return canonical;
                        });
                    };

                    try {
                        return await run(true);
                    } catch(e) {
                        const code = String(e && (e.code || e.message) || '').toLowerCase();
                        if (!code.includes('permission-denied') && !code.includes('permission_denied')) throw e;
                        console.warn('[Firebase dhikr sync] Device marker is not allowed; using compatible transaction.');
                        return run(false);
                    }
                },
                async pullFromServer() {
                    // Never trust an (empty) offline cache for the first sync.
                    const getter = typeof api.getDocsFromServer === 'function' ? api.getDocsFromServer : api.getDocs;
                    return readRemoteRows(await getter(collRef));
                },
                listen(onRows, onError) {
                    return api.onSnapshot(collRef, function(snap) {
                        if (snap.metadata && snap.metadata.fromCache && snap.empty) return;
                        onRows(readRemoteRows(snap));
                    }, onError);
                }
            };
        }

        function stopRealtimeListener() {
            if (_realtimeRetryTimer) {
                clearTimeout(_realtimeRetryTimer);
                _realtimeRetryTimer = null;
            }
            if (typeof firebaseUnsubSnapshot === 'function') {
                try { firebaseUnsubSnapshot(); } catch(e) {}
                firebaseUnsubSnapshot = null;
            }
        }

        // Listens to the whole appData collection: every event is a complete,
        // consistent copy of the cloud data, so there is no separate pull and
        // no comparison of clocks between devices.
        function startRealtimeListener(uid) {
            stopRealtimeListener();
            const remote = AppStorage.remote;
            if (!uid || !remote || typeof remote.listen !== 'function') return;
            firebaseUnsubSnapshot = remote.listen(function(rows) {
                if (firebaseSigningOut || firebaseRemoteImporting) return;
                if (firebaseCurrentUid !== uid || AppStorage.remote !== remote || !localDataBelongsToFirebaseUser(uid)) return;
                if (!rows.hasAppData) return;
                try {
                    const result = applyCloudState(uid, rows, {});
                    if (result.dirtyKeys.length) schedulePushDirtyAppData(uid, 900);
                } catch(e) {
                    console.warn('[Firebase realtime] Apply failed:', e);
                }
            }, function(err) {
                console.warn('[Firebase realtime] Listener error:', err);
                firebaseUnsubSnapshot = null;
                if (_realtimeRetryTimer) clearTimeout(_realtimeRetryTimer);
                _realtimeRetryTimer = setTimeout(function() {
                    _realtimeRetryTimer = null;
                    if (firebaseCurrentUid === uid && AppStorage.remote === remote) startRealtimeListener(uid);
                }, 5000);
            });
        }

        function retryCloudSyncIfNeeded() {
            if (_cloudSyncRetryTimer) {
                clearTimeout(_cloudSyncRetryTimer);
                _cloudSyncRetryTimer = null;
            }
            if (firebaseSigningOut || firebaseSyncStarting) return;
            const user = firebaseAuth && firebaseAuth.currentUser;
            if (!user) return;
            if (firebaseCurrentUid === user.uid && AppStorage.remote) {
                if (!firebaseUnsubSnapshot) startRealtimeListener(user.uid);
                scheduleDhikrDeltaSync(0);
                return;
            }
            applyFirebaseUser(user, { sync: true });
        }

        async function startFirebaseCloudSync(user, syncToken) {
            if (!user || !user.uid) return false;
            const uid = user.uid;
            const token = syncToken || ++firebaseSyncEpoch;
            if (firebaseCurrentUid === uid && AppStorage.remote && localDataBelongsToFirebaseUser(uid)) return true;

            firebaseSyncStarting = true;
            try {
                const remoteAdapter = createFirebaseRemoteAdapter(uid);
                const rows = await remoteAdapter.pullFromServer();
                if (token !== firebaseSyncEpoch) return false;

                flushSave();
                const localBelongs = localDataBelongsToFirebaseUser(uid);
                let localSnapshot = null;
                let base = null;
                if (localBelongs) {
                    localSnapshot = AppStorage.exportAll();
                    base = loadSyncBase(uid);
                } else {
                    const cached = loadFirebaseAccountLocalSnapshot(uid);
                    if (cached && cached.snapshot && Object.keys(cached.snapshot).length) {
                        localSnapshot = { ...cached.snapshot };
                        base = loadSyncBase(uid);
                    }
                }

                const state = loadDhikrDeltaState(uid);
                if (!rows.hasAppData) {
                    // A brand-new cloud account: seed it from this device.
                    const seed = localSnapshot || buildCleanAccountSnapshot();
                    const values = {};
                    FIREBASE_ATOMIC_DHIKR_KEYS.forEach(function(key) {
                        values[key] = _syncHas(seed, key) ? seed[key] : DHIKR_KEY_DEFAULTS[key];
                    });
                    state.reset = { id: newSyncId(), values: values, cum: normalizeDhikrPart(state.cumulative) };
                    saveDhikrDeltaState(uid, state);
                    applyCloudState(uid, rows, { localSnapshot: seed, base: {}, forceWrite: !localBelongs, setOwner: true });
                } else {
                    // Dhikr keys missing in the cloud (very old accounts) are
                    // seeded with this device's values instead of zeros.
                    if (localSnapshot && !state.reset) {
                        const values = {};
                        FIREBASE_ATOMIC_DHIKR_KEYS.forEach(function(key) {
                            if (!_syncHas(rows.values, key) && _syncHas(localSnapshot, key)) values[key] = localSnapshot[key];
                        });
                        if (Object.keys(values).length) {
                            state.reset = { id: newSyncId(), values: values, cum: normalizeDhikrPart(state.cumulative) };
                            saveDhikrDeltaState(uid, state);
                        }
                    }
                    applyCloudState(uid, rows, { localSnapshot: localSnapshot || {}, base: base, forceWrite: !localBelongs, setOwner: true });
                }

                if (token !== firebaseSyncEpoch || !localDataBelongsToFirebaseUser(uid)) return false;

                firebaseCurrentUid = uid;
                AppStorage.remote = remoteAdapter;
                startRealtimeListener(uid);
                schedulePushDirtyAppData(uid, 0);
                scheduleDhikrDeltaSync(0);
                return token === firebaseSyncEpoch && localDataBelongsToFirebaseUser(uid);
            } catch(e) {
                if (firebaseCurrentUid === uid) firebaseCurrentUid = null;
                if (AppStorage.remote) AppStorage.remote = null;
                stopRealtimeListener();
                console.warn('[Firebase sync] Sync failed:', e);
                if (_cloudSyncRetryTimer) clearTimeout(_cloudSyncRetryTimer);
                _cloudSyncRetryTimer = setTimeout(retryCloudSyncIfNeeded, 15000);
                return false;
            } finally {
                if (token === firebaseSyncEpoch) firebaseSyncStarting = false;
            }
        }

        function updateGoogleAccountUI() {
            const L = googleAccountText();
            const setText = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            };
            const signedIn = !!(googleAccount && googleAccount.email);

            setText('setSecAccount', L.section);
            setText('labelGoogleAccount', L.title);
            setText('googleAccountStatus', signedIn ? L.connected : L.disconnected);
            setText('googleSignInText', googleSignInBusy ? L.signInBusy : L.signIn);
            { const so = document.getElementById('googleSignOutBtn'); if (so) so.setAttribute('aria-label', L.signOut); }

            const accountSectionTitle = document.getElementById('setSecAccount');
            if (accountSectionTitle) {
                accountSectionTitle.hidden = true;
                accountSectionTitle.style.display = 'none';
            }

            const iconPickerBtn = document.getElementById('accountIconPickerBtn');
            if (iconPickerBtn) {
                const label = accountIconLabel();
                iconPickerBtn.setAttribute('aria-label', label);
                iconPickerBtn.title = label;
            }

            const status = document.getElementById('googleAccountStatus');
            if (status) {
                status.hidden = true;
                status.style.display = 'none';
                status.classList.toggle('connected', signedIn);
            }

            const accountHead = document.getElementById('googleAccountHead');
            const profileBox = document.getElementById('googleAccountProfile');
            const signOutBtn = document.getElementById('googleSignOutBtn');
            const signInBtn = document.getElementById('googleSignInBtn');
            if (accountHead) {
                accountHead.hidden = true;
                accountHead.style.display = 'none';
            }
            if (profileBox) {
                profileBox.hidden = !signedIn;
                profileBox.style.display = signedIn ? '' : 'none';
            }
            if (signOutBtn) {
                signOutBtn.hidden = !signedIn;
                signOutBtn.style.display = signedIn ? '' : 'none';
            }
            if (signInBtn) {
                signInBtn.hidden = signedIn;
                signInBtn.style.display = signedIn ? 'none' : '';
                signInBtn.disabled = googleSignInBusy;
                signInBtn.setAttribute('aria-busy', googleSignInBusy ? 'true' : 'false');
            }

            if (signedIn) {
                const avatar = document.getElementById('googleAccountAvatar');
                const name = googleAccount.name || googleAccount.given_name || googleAccount.email;
                if (avatar) {
                    avatar.src = googleAccount.picture || '';
                    avatar.style.display = googleAccount.picture ? '' : 'none';
                }
                setText('googleAccountName', name);
                setText('googleAccountEmail', googleAccount.email);
            }

            updateAccountIconUI();
        }

        async function signInWithGoogle() {
            if (googleSignInBusy) return;
            const L = googleAccountText();
            firebaseSigningOut = false;
            saveGuestLocalSnapshot();
            googleSignInBusy = true;
            updateGoogleAccountUI();
            try {
                const ctx = await initFirebaseAccount();
                // Android-приложение: Google запрещает вход внутри WebView —
                // берём idToken из системного окна выбора аккаунта (js/native.js).
                if (window.AzkarNative && window.AzkarNative.googleIdToken) {
                    const idToken = await window.AzkarNative.googleIdToken();
                    if (!idToken) return; // пользователь закрыл окно выбора аккаунта
                    const cred = ctx.authApi.GoogleAuthProvider.credential(idToken);
                    const result = await ctx.authApi.signInWithCredential(ctx.auth, cred);
                    if (result && result.user) await applyFirebaseUser(result.user, { sync: true });
                    return;
                }
                const provider = new ctx.authApi.GoogleAuthProvider();
                provider.setCustomParameters({ prompt: 'select_account' });

                try {
                    const result = await ctx.authApi.signInWithPopup(ctx.auth, provider);
                    if (result && result.user) await applyFirebaseUser(result.user, { sync: true });
                } catch(popupError) {
                    const code = String(popupError && popupError.code || '');
                    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
                        try { localStorage.setItem(AUTH_REDIRECT_PENDING_KEY, String(Date.now())); } catch(e) {}
                        await ctx.authApi.signInWithRedirect(ctx.auth, provider);
                        return;
                    }
                    throw popupError;
                }
            } catch(e) {
                console.warn('[Firebase auth] Sign-in failed:', e);
                // Показываем код ошибки Firebase, чтобы было понятно, что именно не сработало
                const errCode = String(e && e.code || '').replace(/^auth\//, '');
                showToast(errCode ? L.failed + ' (' + errCode + ')' : L.failed);
            } finally {
                googleSignInBusy = false;
                updateGoogleAccountUI();
            }
        }

        function signOutGoogleAccount() {
            const overlay = document.getElementById('googleSignOutOverlay');
            const title = document.getElementById('googleSignOutTitle');
            const sub = document.getElementById('googleSignOutSub');
            const noBtn = document.getElementById('googleSignOutNoBtn');
            const yesBtn = document.getElementById('googleSignOutYesBtn');
            if (title) title.textContent = signOutConfirmText();
            if (sub) sub.textContent = signOutConfirmSubText();
            if (noBtn) noBtn.textContent = t('btnNo') || 'No';
            if (yesBtn) yesBtn.textContent = t('btnYes') || 'Yes';
            if (overlay) overlay.classList.add('show');
        }

        function cancelGoogleSignOut() {
            const overlay = document.getElementById('googleSignOutOverlay');
            if (overlay) overlay.classList.remove('show');
        }

        async function confirmGoogleSignOut() {
            cancelGoogleSignOut();
            firebaseSigningOut = true;
            firebaseSyncEpoch++;
            googleSignInBusy = true;
            updateGoogleAccountUI();
            const authApi = firebaseAuthApi;
            const auth = firebaseAuth;
            const signingOutUid = firebaseCurrentUid;
            const withTimeout = function(promise, ms) {
                return Promise.race([
                    Promise.resolve(promise).catch(function() {}),
                    new Promise(function(resolve) { setTimeout(resolve, ms); })
                ]);
            };

            try {
                if (_dataSyncTimer) { clearTimeout(_dataSyncTimer); _dataSyncTimer = null; }
                await withTimeout(flushDhikrDeltaSync(), 4000);
                flushSave();
                if (localDataBelongsToFirebaseUser(signingOutUid)) {
                    saveFirebaseAccountLocalSnapshot(signingOutUid, AppStorage.exportAll(), Date.now(), true);
                    await withTimeout(pushDirtyAppData(signingOutUid), 4000);
                }
            } catch(syncError) {}

            googleAccount = null;
            try { localStorage.removeItem(GOOGLE_ACCOUNT_STORAGE_KEY); } catch(e) {}
            stopRealtimeListener();
            if (typeof AppStorage !== 'undefined') AppStorage.remote = null;
            firebaseCurrentUid = null;
            restoreGuestLocalSnapshot();
            updateGoogleAccountUI();

            try {
                if (authApi && auth) {
                    await Promise.race([
                        authApi.signOut(auth),
                        new Promise(function(resolve) { setTimeout(resolve, 2500); })
                    ]);
                    firebaseSigningOut = false;
                    googleSignInBusy = false;
                } else {
                    firebaseSigningOut = false;
                    googleSignInBusy = false;
                }
            } catch(e) {
                firebaseSigningOut = false;
                googleSignInBusy = false;
                console.warn('[Firebase auth] Sign-out failed:', e);
            } finally {
                updateGoogleAccountUI();
            }
        }

        function onClickSoundSlider(val) {
            val = parseInt(val);
            settings.clickSoundVolume = val;
            const pct = ((val - 1) / 9 * 100).toFixed(0) + '%';
            const slider = document.getElementById('clickSoundSlider');
            if (slider) slider.style.setProperty('--slider-pct', pct);
            const label = document.getElementById('clickSoundSliderLabel');
            if (label) label.textContent = val;
            setSpeakerIcon('clickSoundSliderIcon', val);
            saveDataDebounced();
        }

        function onGoalSoundSlider(val) {
            val = parseInt(val);
            settings.goalSoundVolume = val;
            const pct = ((val - 1) / 9 * 100).toFixed(0) + '%';
            const slider = document.getElementById('goalSoundSlider');
            if (slider) slider.style.setProperty('--slider-pct', pct);
            const label = document.getElementById('goalSoundSliderLabel');
            if (label) label.textContent = val;
            setSpeakerIcon('goalSoundSliderIcon', val);
            saveDataDebounced();
        }
        // Пробный звук при отпускании ползунка громкости (событие change срабатывает
        // один раз после отпускания, а не на каждом шаге перетаскивания).
        function previewClickSoundVolume() {
            try {
                const v = settings.clickSoundVolume !== undefined ? settings.clickSoundVolume : 5;
                _playClickSoundById(settings.clickSoundType || 'default', v);
            } catch (e) { console.warn('clickSound preview error', e); }
        }
        function previewGoalSoundVolume() {
            try {
                const v = settings.goalSoundVolume !== undefined ? settings.goalSoundVolume : 5;
                _playGoalSoundById(settings.goalSoundType || 'default', v);
            } catch (e) { console.warn('goalSound preview error', e); }
        }
        function updateSettingsUI() {
            const isLight = !isDarkTheme();
            document.getElementById('themeToggle').classList.toggle('on', isLight);
            document.getElementById('soundToggle').classList.toggle('on', settings.sound);
            // Click sound toggle
            const csToggle = document.getElementById('clickSoundToggle');
            if (csToggle) csToggle.classList.toggle('on', !!settings.clickSound);
            const csIcon = document.getElementById('clickSoundIcon');
            if (csIcon) csIcon.textContent = settings.clickSound ? '🔈' : '🔇';
            // Click sound volume slider
            const csSliderBlock = document.getElementById('clickSoundSliderBlock');
            if (csSliderBlock) csSliderBlock.style.display = settings.clickSound ? '' : 'none';
            const csHint = document.getElementById('setClickSoundHint');
            if (csHint) csHint.style.display = settings.clickSound ? '' : 'none';
            const csSlider = document.getElementById('clickSoundSlider');
            if (csSlider) {
                const vol = settings.clickSoundVolume !== undefined ? settings.clickSoundVolume : 5;
                csSlider.value = vol;
                const pct = ((vol - 1) / 9 * 100).toFixed(0) + '%';
                csSlider.style.setProperty('--slider-pct', pct);
                const csLabel = document.getElementById('clickSoundSliderLabel');
                if (csLabel) csLabel.textContent = vol;
                setSpeakerIcon('clickSoundSliderIcon', vol);
            }
            // Goal sound toggle (soundToggle already handled above via classList)
            // Goal sound volume slider
            const gsSliderBlock = document.getElementById('goalSoundSliderBlock');
            if (gsSliderBlock) gsSliderBlock.style.display = settings.sound ? '' : 'none';
            const gsHint = document.getElementById('setGoalSoundHint');
            if (gsHint) gsHint.style.display = settings.sound ? '' : 'none';
            const gsSlider = document.getElementById('goalSoundSlider');
            if (gsSlider) {
                const vol = settings.goalSoundVolume !== undefined ? settings.goalSoundVolume : 5;
                gsSlider.value = vol;
                const pct = ((vol - 1) / 9 * 100).toFixed(0) + '%';
                gsSlider.style.setProperty('--slider-pct', pct);
                const gsLabel = document.getElementById('goalSoundSliderLabel');
                if (gsLabel) gsLabel.textContent = vol;
                setSpeakerIcon('goalSoundSliderIcon', vol);
            }
            // Theme icon: sun for light, moon for dark
            const themeIcon = document.getElementById('themeIcon');
            if (themeIcon) themeIcon.textContent = isLight ? '☀️' : '🌙';
            // Sound icon
            const soundIcon = document.getElementById('soundIcon');
            if (soundIcon) soundIcon.textContent = settings.sound ? '🎯' : '🔇';
            // Vibration toggle
            const vToggle = document.getElementById('vibrationToggle');
            const vSliderBlock = document.getElementById('vibrationSliderBlock');
            if (vToggle) {
                vToggle.classList.toggle('on', !!settings.vibration);
                if (vSliderBlock) vSliderBlock.style.display = settings.vibration ? '' : 'none';
            }
            // Vibration icon: 📳 when on, 📱 when off
            const vIcon = document.getElementById('vibrationIcon');
            if (vIcon) vIcon.textContent = settings.vibration ? '📳' : '📱';
            renderQuickToggles();
            // Vibration slider (levels 1-3)
            const vSlider = document.getElementById('vibrationSlider');
            if (vSlider) {
                const lvl = settings.vibrationLevel !== undefined ? settings.vibrationLevel : 3;
                vSlider.value = lvl;
                const labelEl = document.getElementById('vibrationSliderLabel');
                if (labelEl) labelEl.textContent = getVibLabel(lvl);
                const pct = ((lvl - 1) / 2 * 100).toFixed(0) + '%';
                vSlider.style.setProperty('--slider-pct', pct);
                setVibrationIcon(lvl);
            }
            // PiP toggle
            const pipToggleEl = document.getElementById('pipToggle');
            if (pipToggleEl) pipToggleEl.classList.toggle('on', !!settings.pipCounter);
            const pipIconEl = document.getElementById('pipIcon');
            if (pipIconEl) pipIconEl.textContent = '📌';
            // Timer toggle
            const timerToggleEl = document.getElementById('timerToggle');
            if (timerToggleEl) timerToggleEl.classList.toggle('on', settings.timerEnabled !== false);
            const timerIconEl = document.getElementById('timerIcon');
            if (timerIconEl) timerIconEl.textContent = '⏱️';
            // Stealth mode toggle
            const stealthToggleEl = document.getElementById('stealthToggle');
            if (stealthToggleEl) stealthToggleEl.classList.toggle('on', !!settings.stealthMode);
            const stealthIconEl = document.getElementById('stealthIcon');
            if (stealthIconEl) stealthIconEl.textContent = settings.stealthMode ? '🌑' : '🌕';
            const autoAdvanceToggleEl = document.getElementById('autoAdvanceToggle');
            if (autoAdvanceToggleEl) autoAdvanceToggleEl.classList.toggle('on', !!settings.autoAdvance);
            // Real online presence indicator toggle + visibility
            const liteToggleEl = document.getElementById('liteModeToggle');
            if (liteToggleEl) liteToggleEl.classList.toggle('on', isLiteModeOn());
            const onlinePresenceToggleEl = document.getElementById('onlinePresenceToggle');
            const onlinePresenceOn = settings.onlinePresence !== false;
            if (onlinePresenceToggleEl) onlinePresenceToggleEl.classList.toggle('on', onlinePresenceOn);
            const onlinePresenceEl = document.getElementById('onlinePresence');
            if (onlinePresenceEl) onlinePresenceEl.style.display = onlinePresenceOn ? '' : 'none';
            if (onlinePresenceCoordinatorStarted) postOnlinePresenceCoordinatorState();
            if (typeof updateGoogleAccountUI === 'function') updateGoogleAccountUI();
            if (typeof updateHadithUI === 'function') updateHadithUI();
        }

        /* ===== ЛЕНИВЫЙ РЕНДЕР: флаги «грязных» разделов =====
           true = раздел ещё не отрисован или данные изменились → нужен рендер
           false = актуален, повторный рендер не нужен                         */
        const _dirty = { dua: true, duaFolders: true, favorites: true, stats: true, special: true };
        function _isScreenActive(id) {
            const el = document.getElementById(id);
            return !!(el && el.classList.contains('active'));
        }

        /* Помечаем разделы устаревшими. Вызывается везде, где меняются данные. */
        function markDirty(...tabs) {
            tabs.forEach(t => { if (t in _dirty) _dirty[t] = true; });
        }

        function switchTab(tab) {
            // Покидаем экран спец зикра через навбар — сохраняем прогресс, сбрасываем состояние
            if (document.getElementById('screen-special-counter').classList.contains('active') && tab !== 'special-counter') {
                if (currentSpecialId) {
                    specialProgress[currentSpecialId] = specialCount;
                    saveDataDebounced();
                }
                isSpecialActive = false;
                _specialGoalShown = false;
                currentSpecialId = null;
                specialCount = 0;
                const _co = document.getElementById('completionOverlay');
                if (_co) { _co.classList.remove('show'); _co.onclick = closeCompletion; }
                window._azkarMilestoneActive = false;
            }
            // Если нажимаем «Зикр» и уже на экране спец зикра — уходим на основной экран
            if (tab === 'azkar' && document.getElementById('screen-special-counter').classList.contains('active')) {
                if (currentSpecialId) {
                    specialProgress[currentSpecialId] = specialCount;
                    saveDataDebounced();
                }
                isSpecialActive = false;
                currentSpecialId = null;
                specialCount = 0;
                lastActiveSpecialId = null;
                localStorage.removeItem('azkar_last_special_id');
                const _co2 = document.getElementById('completionOverlay');
                if (_co2) { _co2.classList.remove('show'); _co2.onclick = closeCompletion; }
                window._azkarMilestoneActive = false;
                document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
                document.getElementById('screen-azkar').classList.add('active');
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                document.querySelector('[data-tab="azkar"]').classList.add('active');
                pipMode = 'main';
                updatePipCounter();
                try {
                    document.dispatchEvent(new CustomEvent('_screenChanged', { detail: 'screen-azkar' }));
                    if (typeof window._stealthTryActivate === 'function') window._stealthTryActivate('screen-azkar');
                } catch(e) {}
                const specialFab = document.getElementById('specialAddFab');
                if (specialFab) specialFab.style.display = 'none';
                const pipBtn = document.getElementById('pipCounterBtn');
                if (pipBtn && settings.pipCounter) pipBtn.classList.add('show');
                return;
            }
            // Если нажимаем «Зикр» и есть сохранённый спец зикр — переходим на него
            if (tab === 'azkar' && lastActiveSpecialId && !currentSpecialId
                && !document.getElementById('screen-azkar').classList.contains('active')) {
                const dhikr = specialDhikrs.find(d => d.id === lastActiveSpecialId);
                if (dhikr) {
                    startSpecialDhikrDirect(lastActiveSpecialId);
                    return;
                }
                lastActiveSpecialId = null;
                localStorage.removeItem('azkar_last_special_id');
            }
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById('screen-' + tab).classList.add('active');
            document.body.classList.toggle('fb-page', tab === 'feedback');
            if (tab === 'feedback' && window.fbOpen) window.fbOpen();
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            const navEl = document.querySelector(`[data-tab="${tab}"]`);
            if (navEl) navEl.classList.add('active');
            // Stealth mode: deactivate when leaving counter screens, activate on azkar
            try {
                document.dispatchEvent(new CustomEvent('_screenChanged', { detail: 'screen-' + tab }));
                if (typeof window._stealthTryActivate === 'function') window._stealthTryActivate('screen-' + tab);
            } catch(e) {}
            // Рендерим раздел только если он «грязный» (первый вход или данные изменились)
            if (tab === 'stats'        && _dirty.stats)    { renderStats();       _dirty.stats = false; }
            if (tab === 'stats') { try { updateDhikrOverallProgress(); } catch(e) {} }
            if (tab === 'favorites'    && _dirty.favorites) { renderFavorites();   _dirty.favorites = false; }
            if (tab === 'dua'          && _dirty.duaFolders) { renderDuaFolders(); _dirty.duaFolders = false; }
            if (tab === 'dua'          && _dirty.dua)       { renderDuas();        _dirty.dua = false; }
            if (tab === 'special-list' && _dirty.special)   { renderSpecialList(); _dirty.special = false; }
            // Show special FAB only on special-list tab
            const specialFab = document.getElementById('specialAddFab');
            if (specialFab) specialFab.style.display = (tab === 'special-list') ? '' : 'none';
            // Show dua FAB only on dua tab
            const duaFab = document.getElementById('duaAddFab');
            if (duaFab) duaFab.style.display = (tab === 'dua') ? '' : 'none';
            // Show checklist FAB only on checklist tab
            const checklistFab = document.getElementById('checklistAddFab');
            if (checklistFab) checklistFab.style.display = (tab === 'checklist') ? '' : 'none';
            // Switch pip mode: azkar tab → main, any other tab doesn't change pip mode
            if (tab === 'azkar') {
                if (currentSpecialId) {
                    specialProgress[currentSpecialId] = specialCount;
                    saveDataDebounced();
                }
                isSpecialActive = false;
                currentSpecialId = null;
                specialCount = 0;
                const _co = document.getElementById('completionOverlay');
                if (_co) { _co.classList.remove('show'); _co.onclick = closeCompletion; }
                window._azkarMilestoneActive = false;
                pipMode = 'main';
                updatePipCounter();
            }
            // PiP counter btn shows on all tabs when enabled
            const pipBtn = document.getElementById('pipCounterBtn');
            if (pipBtn && settings.pipCounter) pipBtn.classList.add('show');
        }

        function showToast(msg, duration) {
            const t = document.getElementById('toast');
            t.innerText = msg; t.classList.add('show');
            clearTimeout(t._hideTimer);
            t._hideTimer = setTimeout(() => t.classList.remove('show'), duration || 2000);
        }

        // ===== ONE-TIME HINT: скрытый жест долгого нажатия на кольцо =====
        // Долгое удержание кольца счётчика открывает "Добавить зикры вручную"
        // (+ / −), но это неочевидный жест — без подсказки о нём никто не
        // узнает. Показываем один раз, при самом первом заходе в приложение.
        function initManualAddHint() {
            try {
                if (localStorage.getItem('azkar_manual_add_hint_shown')) return;
                localStorage.setItem('azkar_manual_add_hint_shown', '1');
            } catch (err) { return; }
            setTimeout(() => {
                showToast(t('manualAddHint'), 4500);
            }, 1600);
        }

        // ===== HADITH REMINDER SYSTEM =====
        // Данные хадисов лежат в отдельном файле hadiths.js (window.AZKAR_HADITHS).
        // ВАЖНО: здесь массива хадисов НЕТ — добавляй новые хадисы в hadiths.js.
        // Весь код ниже устойчив к отсутствию файла: если hadiths.js удалён,
        // getHadiths() вернёт пустой список, и хадисы просто не будут показываться
        // (ошибок не будет, остальное приложение работает как обычно).

        // Безопасно возвращает список хадисов (или [] если файла нет).
        function getHadiths() {
            return (typeof window !== 'undefined' && Array.isArray(window.AZKAR_HADITHS))
                ? window.AZKAR_HADITHS : [];
        }
        // Текст хадиса на текущем языке. Поддерживает новый формат {text:{ru,en,...}}
        // и старый плоский {translation:"..."} — на всякий случай.
        function _hadithText(h) {
            if (!h) return '';
            const lang = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'en';
            if (h.text && typeof h.text === 'object') return h.text[lang] || h.text.en || h.text.ru || '';
            return h.translation || '';
        }
        // Источник хадиса на текущем языке. Поддерживает {source:{ru,...}} и строку.
        function _hadithSource(h) {
            if (!h) return '';
            const lang = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'en';
            if (h.source && typeof h.source === 'object') return h.source[lang] || h.source.en || h.source.ru || '';
            return h.source || '';
        }
        let _hadithTimer = null;
        let _hadithLastIdx = -1;
        let _hadithCurrent = null;     // хадис, выбранный для показа (для баннера → попап)
        let _notifCurrent = null;      // намаз/дуа/зикр в баннере — чтобы уложить его в шторку, если не открыли
        let _hadithBannerTimer = null;

        // Раньше здесь была toggleHadithSetting() для переключателя в настройках —
        // теперь хадисы всегда включены (settings.hadithEnabled жёстко = true
        // в loadData()), переключатель убран из UI.
        function clearHadithTimer() {
            if (_hadithTimer) { clearTimeout(_hadithTimer); _hadithTimer = null; }
        }
        const HADITH_MIN_MS = 3 * 60 * 60 * 1000; // 3 часа — начало окна
        const HADITH_MAX_MS = 6 * 60 * 60 * 1000; // 6 часов — конец окна
        const HADITH_NEXT_KEY = 'azkar_hadith_next_at';
        const HADITH_OVERDUE_DELAY_MS = 3000;     // если время прошло, пока приложение было закрыто

        // Время следующего хадиса хранится в localStorage: так оно переживает
        // перезапуск приложения, и в каждом окне 3–6 часа хадис приходит ровно один раз.
        function _hadithReadNext() {
            try { const v = parseInt(localStorage.getItem(HADITH_NEXT_KEY) || '0', 10); return isNaN(v) ? 0 : v; }
            catch (e) { return 0; }
        }
        function _hadithWriteNext(ts) {
            try { if (ts) localStorage.setItem(HADITH_NEXT_KEY, String(ts)); else localStorage.removeItem(HADITH_NEXT_KEY); }
            catch (e) {}
        }
        function _hadithRollNext() {
            const ts = Date.now() + HADITH_MIN_MS + Math.floor(Math.random() * (HADITH_MAX_MS - HADITH_MIN_MS + 1));
            _hadithWriteNext(ts);
            return ts;
        }
        // Показать хадис и начать новое окно 3–6 часа.
        function _hadithFireAndReschedule() {
            _hadithTimer = null;
            const plannedTs = _hadithReadNext();
            _hadithWriteNext(0);
            if (document.hidden && _hadithSystemNotify(plannedTs)) {
                // приложение свёрнуто — баннера никто не увидит, показываем системное уведомление
            } else {
                showRandomHadith();
            }
            scheduleHadith();
        }
        // Системное уведомление с случайным хадисом (когда приложение свёрнуто).
        function _hadithSystemNotify(plannedTs) {
            try {
                if (!('Notification' in window) || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) return false;
                const list = getHadiths();
                if (!list.length) return false;
                let idx;
                do { idx = Math.floor(Math.random() * list.length); } while (idx === _hadithLastIdx && list.length > 1);
                _hadithLastIdx = idx;
                const body = _hadithText(list[idx]);
                if (!body) return false;
                const source = _hadithSource(list[idx]);
                navigator.serviceWorker.ready.then(reg => reg.showNotification(t('hadithLabel'), {
                    body: body, icon: 'icon-192.png', badge: 'badge.png',
                    tag: 'azkar-hadith-' + (plannedTs || Date.now()), renotify: false, requireInteraction: false,
                    data: { url: reg.scope, hadithText: body, hadithSource: source }
                })).catch(() => {});
                return true;
            } catch (e) { return false; }
        }

        function toggleHadithSetting() {
            if (!settings.hadithEnabled) {
                settings.hadithEnabled = true;
                _hadithWriteNext(0);
                saveDataDebounced();
                updateSettingsUI();
                scheduleHadith();
                try {
                    if ('Notification' in window && Notification.permission === 'default' && typeof requestNotifPermission === 'function') requestNotifPermission();
                } catch (e) {}
            } else {
                settings.hadithEnabled = false;
                saveDataDebounced();
                clearHadithTimer();
                _hadithWriteNext(0);
                hideHadithBanner();
                updateSettingsUI();
                sendHadithScheduleToSW();
            }
        }

        // Передаёт расписание хадисов в Service Worker. SW показывает случайный
        // хадис раз в 3–6 часа: если приложение открыто — присылает сообщение и
        // мы рисуем баннер; если свёрнуто/закрыто (и SW ещё жив) — системное
        // уведомление. Возвращает true, если SW взял расписание на себя.
        function sendHadithScheduleToSW(delayMs) {
            if (!('serviceWorker' in navigator)) return false;
            const list = getHadiths();
            navigator.serviceWorker.ready.then(reg => {
                if (!reg || !reg.active) return;
                if (hadithOn() && list.length && !pushActive()) {
                    const items = list.map(h => _hadithText(h)).filter(Boolean);
                    reg.active.postMessage({
                        type: 'SCHEDULE_HADITH',
                        items: items,
                        title: (typeof t === 'function') ? t('hadithLabel') : 'Хадис',
                        minMs: HADITH_MIN_MS,
                        maxMs: HADITH_MAX_MS,
                        // первый показ SW — ровно в сохранённое время, дальше он сам берёт 3–6 ч
                        firstDelayMs: delayMs || 0,
                        icon: 'icon-192.png',
                        badge: 'badge.png'
                    });
                } else {
                    reg.active.postMessage({ type: 'CANCEL_HADITH' });
                }
            }).catch(() => {});
            return true;
        }

        function scheduleHadith() {
            clearHadithTimer();
            if (!hadithOn() || !getHadiths().length) {
                sendHadithScheduleToSW();
                schedulePushSync();
                return;
            }
            // Service Worker отвечает за фон (когда вкладка скрыта/свёрнута), а
            // таймер страницы — единственный источник показа, пока приложение
            // открыто и видимо. Раньше оба таймера показывали баннер независимо
            // друг от друга и постоянно перезапускали друг друга — из-за этой
            // гонки таймер страницы мог никогда не доходить до конца. Теперь SW
            // просто держит расписание "про запас" на случай сворачивания.
            let next = _hadithReadNext();
            const now = Date.now();
            // нет сохранённого времени или оно подозрительно далеко (сбилось время на устройстве) — новый бросок
            // Время в прошлом (приложение было закрыто) — не показываем сразу при открытии, а начинаем новое окно
            if (!next || next <= now || next - now > HADITH_MAX_MS) next = _hadithRollNext();
            const delay = Math.max(next - now, HADITH_OVERDUE_DELAY_MS);
            sendHadithScheduleToSW(delay);
            schedulePushSync();
            _hadithTimer = setTimeout(_hadithFireAndReschedule, delay);
        }

        // Сообщение от Service Worker приходит, только если ОН сам решил, что
        // вкладка видима (см. fireHadith() в sw.js) — но на практике SW может
        // ошибиться (например, между двумя вкладками) или сработать почти
        // одновременно с таймером страницы. Чтобы не показывать хадис дважды
        // и не перезапускать таймер страницы впустую, реагируем на это
        // сообщение ТОЛЬКО когда страница реально скрыта — иначе просто
        // игнорируем: таймер страницы и так гарантированно доведёт дело до
        // показа сам, без внешних толчков.
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', event => {
                if (event.data?.type === 'HADITH_NOTIFIED' && hadithOn()) {
                    // SW сам показал системное уведомление — начинаем новое окно 3–6 ч
                    _hadithWriteNext(0);
                    scheduleHadith();
                    return;
                }
                if (event.data?.type !== 'SHOW_HADITH' || !hadithOn()) return;
                if (document.hidden) {
                    _hadithWriteNext(0);
                    showRandomHadith();
                    scheduleHadith();
                }
            });
        }
        // Пока вкладка скрыта, браузер может полностью выбросить/заморозить
        // JS-таймер страницы (_hadithTimer) — это нормально, тогда показом
        // временно управляет Service Worker (системные уведомления). Как
        // только пользователь возвращается на видимую вкладку, снова берём
        // инициативу на себя и ставим свежий таймер страницы.
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && hadithOn() && getHadiths().length) {
                scheduleHadith();
            }
        });
        function showRandomHadith() {
            // Новая подача (iOS-style): сначала показываем баннер сверху.
            // По тапу на баннер откроется полноценный попап с этим же хадисом.
            const list = getHadiths();
            if (!list.length) return;   // нет данных (например, hadiths.js удалён) → тихо выходим
            let idx;
            do { idx = Math.floor(Math.random() * list.length); } while (idx === _hadithLastIdx && list.length > 1);
            _hadithLastIdx = idx;
            _hadithCurrent = list[idx];
            showHadithBanner(_hadithCurrent);
        }
        // iOS-style баннер уведомления сверху по центру
        function showHadithBanner(h) {
            if (!h) return;
            const banner = document.getElementById('hadithBanner');
            if (!banner) return;
            _notifCurrent = null;
            const titleEl = document.getElementById('hadithBannerTitle');
            const textEl = document.getElementById('hadithBannerText');
            if (titleEl) titleEl.textContent = t('hadithLabel');
            if (textEl) textEl.textContent = _hadithText(h);
            const icEl = banner.querySelector('.hadith-banner-icon'); if (icEl) icEl.textContent = '📖';
            banner.style.display = 'flex';
            requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('show')));
            if (_hadithBannerTimer) clearTimeout(_hadithBannerTimer);
            // Авто-скрытие через 7 сек, если пользователь не нажал
            _hadithBannerTimer = setTimeout(() => hideHadithBanner({ pin: true }), 7000);
        }
        function hideHadithBanner(opts) {
            const banner = document.getElementById('hadithBanner');
            if (!banner) return;
            if (_hadithBannerTimer) { clearTimeout(_hadithBannerTimer); _hadithBannerTimer = null; }
            // Баннер не открыли (исчез сам или смахнули) → оставляем системное
            // уведомление в шторке. Так теперь работает не только хадис, но и
            // время намаза, дуа Абу Умамы и напоминание о зикре.
            if (opts && opts.pin) {
                if (_hadithCurrent) _pinHadithNotification(_hadithCurrent);
                else if (_notifCurrent) _pinNotifNotification(_notifCurrent);
            }
            _hadithCurrent = null;
            _notifCurrent = null;
            banner.classList.remove('show');
            setTimeout(() => { banner.style.display = 'none'; }, 320);
        }
        // Хадис показан в баннере, но не открыт → кладём его в шторку уведомлений
        function _pinHadithNotification(h) {
            try {
                if (!('Notification' in window) || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) return;
                const body = _hadithText(h);
                if (!body) return;
                const source = _hadithSource(h);
                navigator.serviceWorker.ready.then(reg => reg.showNotification(t('hadithLabel'), {
                    body: body, icon: 'icon-192.png', badge: 'badge.png',
                    tag: 'azkar-hadith-' + Date.now(), renotify: false, requireInteraction: false,
                    data: { url: reg.scope, hadithText: body, hadithSource: source }
                })).catch(() => {});
            } catch (e) {}
        }
        // Намаз / дуа Абу Умамы / зикр показаны в баннере, но не открыты →
        // кладём их в шторку уведомлений. tag берём из события: если Service
        // Worker покажет то же событие сам, записи схлопнутся в одну.
        function _pinNotifNotification(n) {
            try {
                if (!n || !n.body) return;
                if (!('Notification' in window) || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) return;
                navigator.serviceWorker.ready.then(reg => reg.showNotification(n.title || 'Azkar', {
                    body: n.body, icon: 'icon-192.png', badge: 'badge.png',
                    tag: n.tag || ('azkar-notif-' + Date.now()), renotify: false, requireInteraction: false,
                    data: { url: reg.scope, openUrl: n.url || '' }
                })).catch(() => {});
            } catch (e) {}
        }
        // Попап по готовому тексту (из системного уведомления)
        function openHadithPopupRaw(text, source) {
            if (!text) return;
            document.getElementById('hadithTranslationText').textContent = text;
            document.getElementById('hadithSourceText').textContent = source ? '— ' + source : '';
            const overlay = document.getElementById('hadithPopupOverlay');
            overlay.style.display = 'flex';
            requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('show')));
        }
        // Тап по баннеру → открыть полноценный попап
        function openHadithFromBanner() {
            // hideHadithBanner() очищает _hadithCurrent, поэтому запоминаем заранее
            const h = _hadithCurrent;
            const n = _notifCurrent;
            hideHadithBanner();
            if (!h) {
                // реакция на отзыв — открываем сайт отзывов; намаз/зикр — просто закрываем
                if (n && n.url) openExternalUrl(n.url);
                return;
            }
            openHadithPopup(h);
        }
        // Внешняя ссылка: в APK — браузер телефона, в веб-версии — новая вкладка
        function openExternalUrl(url) {
            if (!url) return;
            if (typeof window.azkarOpenUrl === 'function') { window.azkarOpenUrl(url); return; }
            try { window.open(url, '_blank', 'noopener'); } catch (e) { location.href = url; }
        }
        // Полноценный попап по центру экрана (как было раньше)
        function openHadithPopup(h) {
            if (!h) return;
            document.getElementById('hadithTranslationText').textContent = _hadithText(h);
            document.getElementById('hadithSourceText').textContent = '— ' + _hadithSource(h);
            const overlay = document.getElementById('hadithPopupOverlay');
            overlay.style.display = 'flex';
            requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('show')));
        }
        function closeHadithPopup() {
            const overlay = document.getElementById('hadithPopupOverlay');
            overlay.classList.remove('show');
            setTimeout(() => { overlay.style.display = 'none'; }, 340);
        }
        // Синхронизирует ползунок и подпись хадисов в настройках.
        function updateHadithUI() {
            // Главный ползунок «Уведомления» = общий выключатель всех видов уведомлений.
            const master = notifMasterOn();
            const tg = document.getElementById('hadithToggle');
            if (tg) tg.classList.toggle('on', master);
            const ic = document.getElementById('hadithIcon');
            if (ic) ic.textContent = master ? '🔔' : '🔕';
            if (typeof renderQuickToggles === 'function') renderQuickToggles();
            // Мини-меню отдельных уведомлений
            const set = (id, on) => { const el = document.getElementById(id); if (el) el.classList.toggle('on', !!on); };
            set('notifTgHadith', settings.hadithEnabled);
            set('notifTgPrayer', settings.notifPrayer);
            set('notifTgUmama', settings.notifAbuUmama);
            const pop = document.getElementById('notifPop');
            if (pop) pop.classList.toggle('master-off', !master);
        }

        // ===== NOTIFICATION CENTRE =====
        // Тап по «Уведомления» — общий ползунок (всё вкл/выкл).
        // Удержание 1 секунда — компактное окно с отдельными ползунками:
        //   • Хадисы (settings.hadithEnabled)
        //   • Время намазов (settings.notifPrayer)
        //   • Дуа Абу Умамы в Фаджр и Аср, через 15 минут после времени намаза (settings.notifAbuUmama)
        // Напоминание о зикре (~12:00 и ~22:00) отдельного ползунка не имеет — оно идёт вместе с общим ползунком.
        // Всё работает только если включён общий ползунок (settings.notifMaster).
        function notifMasterOn() { return settings.notifMaster !== false; }
        function hadithOn() { return notifMasterOn() && !!settings.hadithEnabled; }
        // t() с запасным текстом, если ключа ещё нет в закэшированном i18n.js
        function tn(key, fallback) {
            const v = (typeof t === 'function') ? t(key) : key;
            return (v && v !== key) ? v : fallback;
        }

        let _notifPressTimer = null;
        let _notifPopupOpenedAt = 0;
        function startNotifPress(e) {
            if (e && e.pointerType === 'mouse' && e.button !== 0) return;
            clearTimeout(_notifPressTimer);
            _notifPressTimer = setTimeout(() => {
                _notifPressTimer = null;
                openNotifPopup();
            }, 1000);
        }
        function cancelNotifPress() {            // отпустили раньше секунды → короткий тап
            if (_notifPressTimer) {
                clearTimeout(_notifPressTimer);
                _notifPressTimer = null;
                toggleNotifMaster();
            }
        }
        function abortNotifPress() {             // палец ушёл / начался скролл → без действия
            if (_notifPressTimer) { clearTimeout(_notifPressTimer); _notifPressTimer = null; }
        }

        function toggleNotifMaster() {
            const turningOn = !notifMasterOn();
            settings.notifMaster = turningOn;
            saveDataDebounced();
            if (turningOn) {
                _hadithWriteNext(0);
                try {
                    if ('Notification' in window && Notification.permission === 'default') requestNotifPermission();
                } catch (e) {}
            } else {
                hideHadithBanner();
            }
            updateHadithUI();
            scheduleHadith();
            scheduleNotifEvents();
        }

        async function _notifEnsureExtras() {
            try {
                if ('Notification' in window) {
                    if (Notification.permission === 'default') await requestNotifPermission();
                    if (Notification.permission === 'denied') showToast(t('notifPermDenied'), 2600);
                }
            } catch (e) {}
            try {
                const pt = window.PrayerTimes;
                if (pt && !pt.getLocation()) {
                    showToast(t('notifNeedLocation'), 2800);
                    pt.requestGeo(() => scheduleNotifEvents());
                }
            } catch (e) {}
        }
        function toggleNotifPrayer() {
            settings.notifPrayer = !settings.notifPrayer;
            saveDataDebounced();
            updateHadithUI();
            scheduleNotifEvents();
            if (settings.notifPrayer) _notifEnsureExtras();
        }
        function toggleNotifUmama() {
            settings.notifAbuUmama = !settings.notifAbuUmama;
            saveDataDebounced();
            updateHadithUI();
            scheduleNotifEvents();
            if (settings.notifAbuUmama) _notifEnsureExtras();
        }

        function openNotifPopup() {
            const set = (id, key) => { const el = document.getElementById(id); if (el) el.textContent = t(key); };
            set('notifPopTitle', 'labelNotifications');
            set('notifLblHadith', 'labelHadith');
            set('notifLblPrayer', 'notifRowPrayer');
            set('notifLblUmama', 'notifRowUmama');
            updateHadithUI();
            _notifPopupOpenedAt = Date.now();
            const ov = document.getElementById('notifPopOverlay');
            if (ov) ov.classList.add('show');
        }
        function closeNotifPopup() {
            if (Date.now() - _notifPopupOpenedAt < 350) return;   // защита от «хвоста» долгого нажатия
            const ov = document.getElementById('notifPopOverlay');
            if (ov) ov.classList.remove('show');
        }
        document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeNotifPopup(); });

        // ----- Расписание: время намазов и дуа Абу Умамы (Фаджр / Аср, +15 минут) -----
        // Страница считает события на сегодня и завтра (по геолокации), сама ставит
        // таймер на ближайшее, а полный список отдаёт в Service Worker — SW показывает
        // системное уведомление, когда приложение свёрнуто. Если приложение открыто —
        // показывается баннер сверху. Гарантий для полностью закрытого PWA нет (ОС может
        // усыпить SW) — как и у хадисов.
        let _notifEvTimer = null;
        const _notifFired = new Set();
        // Дуа Абу Умамы приходит не в сам момент намаза, а спустя это время.
        const UMAMA_DELAY_MS = 15 * 60 * 1000;
        // Если таймер страницы «проспал» (экран выключен, вкладка была в фоне),
        // событие всё равно показываем — но только если опоздали не больше чем на
        // полчаса, чтобы не вываливать старые намазы при возврате в приложение.
        const NOTIF_MISSED_WINDOW_MS = 30 * 60 * 1000;
        function _pad2(n) { return String(n).padStart(2, '0'); }
        // ----- Напоминание о зикре: два раза в день, ~12:00 и ~22:00 со случайным разбросом ±30 минут -----
        // Разброс «случайный», но стабильный в пределах дня (считается из даты), чтобы пересчёты
        // расписания каждые 5 минут не сдвигали время уведомления.
        const ZIKR_SLOTS = [{ key: 'noon', hour: 12 }, { key: 'night', hour: 22 }];
        const ZIKR_JITTER_MIN = 30;
        function _zikrOffsetMin(seedStr) {
            let x = 2166136261;
            for (let i = 0; i < seedStr.length; i++) { x ^= seedStr.charCodeAt(i); x = Math.imul(x, 16777619); }
            x ^= x >>> 15; x = Math.imul(x, 2246822519); x ^= x >>> 13;
            return ((x >>> 0) % (2 * ZIKR_JITTER_MIN + 1)) - ZIKR_JITTER_MIN;   // −30…+30
        }
        function _zikrEvents(base, days) {
            const out = [];
            for (let d = 0; d < days; d++) {
                const day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + d);
                const dk = day.getFullYear() + '-' + (day.getMonth() + 1) + '-' + day.getDate();
                ZIKR_SLOTS.forEach(sl => {
                    const off = _zikrOffsetMin(dk + '|' + sl.key);
                    const ts = new Date(day.getFullYear(), day.getMonth(), day.getDate(), sl.hour, off, 0, 0).getTime();
                    out.push({ ts, tag: 'azkar-zikr-' + sl.key + '-' + dk, kind: 'zikr', icon: '🕌',
                        title: t('notifZikrTitle'),
                        body: t('notifZikrBody') });
                });
            }
            return out;
        }
        // days — на сколько дней вперёд (страница и SW: 2; push-сервер: PUSH_DAYS)
        function buildNotifEvents(days) {
            days = days || 2;
            if (!notifMasterOn()) return [];
            const out = [];
            const base = new Date();
            // Напоминание о зикре — привязано к общему ползунку «Уведомления», геолокация не нужна.
            _zikrEvents(base, days).forEach(e => out.push(e));
            const wantPrayer = !!settings.notifPrayer, wantUmama = !!settings.notifAbuUmama;
            const pt = window.PrayerTimes;
            if ((!wantPrayer && !wantUmama) || !pt || typeof pt.getForDate !== 'function' || !pt.getLocation()) {
                out.sort((a, b) => a.ts - b.ts);
                return out;
            }
            const names = (typeof pt.L === 'function' && pt.L()) || {};
            for (let d = 0; d < days; d++) {
                const day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + d);
                const dk = day.getFullYear() + '-' + (day.getMonth() + 1) + '-' + day.getDate();
                (pt.getForDate(day) || []).forEach(p => {
                    if (!p || p.t === null || p.t === undefined || isNaN(p.t) || p.key === 'sunrise') return;
                    const mins = Math.round(p.t * 60);
                    const ts = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, mins, 0, 0).getTime();
                    const at = new Date(ts);
                    const clock = _pad2(at.getHours()) + ':' + _pad2(at.getMinutes());
                    if (wantPrayer) {
                        out.push({ ts, tag: 'azkar-prayer-' + p.key + '-' + dk, kind: 'prayer', icon: '🕌',
                            title: t('notifPrayerTitle'),
                            body: (names[p.key] || p.key) + ' · ' + clock });
                    }
                    if (wantUmama && (p.key === 'fajr' || p.key === 'asr')) {
                        out.push({ ts: ts + UMAMA_DELAY_MS, tag: 'azkar-umama-' + p.key + '-' + dk, kind: 'umama', icon: '🤲',
                            title: t('notifUmamaTitle'),
                            body: p.key === 'fajr'
                                ? t('notifUmamaMorning')
                                : t('notifUmamaEvening') });
                    }
                });
            }
            out.sort((a, b) => a.ts - b.ts);
            return out;
        }

        function scheduleNotifEvents() {
            clearTimeout(_notifEvTimer);
            _notifEvTimer = null;
            let list = [];
            try { list = buildNotifEvents(); } catch (e) { list = []; }
            const now = Date.now();
            list = list.filter(e => e.ts > now + 1000 && !_notifFired.has(e.tag));
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(reg => {
                    if (!reg || !reg.active) return;
                    // Push-сервер сам пришлёт уведомление — таймер SW не нужен (иначе дубли)
                    if (list.length && !pushActive()) {
                        reg.active.postMessage({ type: 'SCHEDULE_EVENTS', events: list, icon: 'icon-192.png', badge: 'badge.png' });
                    } else {
                        reg.active.postMessage({ type: 'CANCEL_EVENTS' });
                    }
                }).catch(() => {});
            }
            schedulePushSync();
            if (!list.length) return;
            _notifEvTimer = setTimeout(_notifFireDue, Math.max(500, list[0].ts - now));
        }

        function _notifFireDue() {
            _notifEvTimer = null;
            const now = Date.now();
            let list = [];
            try { list = buildNotifEvents(); } catch (e) {}
            list.filter(e => e.ts <= now + 1500 && e.ts > now - NOTIF_MISSED_WINDOW_MS && !_notifFired.has(e.tag))
                .forEach(e => { _notifFired.add(e.tag); _notifDeliver(e); });
            scheduleNotifEvents();
        }

        // Догоняем события, которые наступили, пока таймеры страницы были
        // заморожены (свёрнутое приложение, выключенный экран). Вызывается при
        // возврате в приложение: иначе событие просто терялось.
        function _notifDeliverMissed() {
            const now = Date.now();
            let list = [];
            try { list = buildNotifEvents(); } catch (e) { return; }
            // Уведомления разрешены — пока приложение было свёрнуто, событие уже пришло
            // в шторку (будильник Android / push / таймер SW). Повторный баннер не нужен.
            let systemShown = false;
            try { systemShown = 'Notification' in window && Notification.permission === 'granted'; } catch (e) {}
            list.filter(e => e.ts <= now && e.ts > now - NOTIF_MISSED_WINDOW_MS && !_notifFired.has(e.tag))
                .forEach(e => { _notifFired.add(e.tag); if (!systemShown) _notifDeliver(e); });
        }

        function _notifDeliver(ev) {
            let system = false;
            try {
                if (document.hidden && 'Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
                    navigator.serviceWorker.ready.then(reg => reg.showNotification(ev.title, {
                        body: ev.body, icon: 'icon-192.png', badge: 'badge.png',
                        tag: ev.tag, renotify: false, requireInteraction: false,
                        data: { url: reg.scope }
                    })).catch(() => {});
                    system = true;
                }
            } catch (e) {}
            if (!system) showNotifBanner(ev.title, ev.body, ev.icon, ev.tag);
        }

        // Тот же iOS-style баннер сверху, что и у хадисов, но без попапа по тапу.
        function showNotifBanner(title, text, icon, tag, url) {
            const banner = document.getElementById('hadithBanner');
            if (!banner) return;
            _hadithCurrent = null;
            // Запоминаем событие целиком: если баннер не откроют и он исчезнет,
            // hideHadithBanner({pin:true}) положит его в шторку уведомлений.
            _notifCurrent = { title: title, body: text, icon: icon, tag: tag, url: url || '' };
            const titleEl = document.getElementById('hadithBannerTitle');
            const textEl = document.getElementById('hadithBannerText');
            const icEl = banner.querySelector('.hadith-banner-icon');
            if (titleEl) titleEl.textContent = title;
            if (textEl) textEl.textContent = text;
            if (icEl) icEl.textContent = icon || '🔔';
            banner.style.display = 'flex';
            requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('show')));
            if (_hadithBannerTimer) clearTimeout(_hadithBannerTimer);
            _hadithBannerTimer = setTimeout(() => hideHadithBanner({ pin: true }), 7000);
        }

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) { _notifDeliverMissed(); scheduleNotifEvents(); }
        });
        setInterval(() => { if (!document.hidden) scheduleNotifEvents(); }, 5 * 60 * 1000);
        setTimeout(scheduleNotifEvents, 1500);
        setTimeout(scheduleNotifEvents, 6000);

        // ===== PUSH: уведомления, даже когда приложение закрыто =====
        // Страница сама считает расписание на PUSH_DAYS дней вперёд (намазы, дуа
        // Абу Умамы, зикр, хадисы — уже на языке пользователя) и отправляет его
        // на push-сервер (Cloudflare Worker, папка Tasbih-push) вместе с
        // push-подпиской. Сервер в нужную минуту присылает push, и SW показывает
        // уведомление. Пока в push-config.js не указан server — всё как раньше
        // (таймеры страницы и SW). Пока push работает, таймеры SW отключены, чтобы
        // не было дублей; баннеры при открытом приложении показывает страница.
        // var/function — эти функции вызываются из кода выше, ещё до этой строки.
        var PUSH_DAYS = 7;
        var PUSH_STATE_KEY = 'azkar_push_state';      // { endpoint, hash, at }
        var PUSH_RESYNC_MS = 6 * 60 * 60 * 1000;      // обновлять «горизонт» расписания
        var _pushSyncTimer = null;
        var _pushSyncing = false;
        function _pushCfg() { return (typeof window !== 'undefined' && window.AZKAR_PUSH) || {}; }
        function pushSupported() {
            return !!(_pushCfg().server && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
        }
        function _pushReadState() {
            try { return JSON.parse(localStorage.getItem(PUSH_STATE_KEY) || '{}') || {}; } catch (e) { return {}; }
        }
        function _pushWriteState(st) {
            try { if (st) localStorage.setItem(PUSH_STATE_KEY, JSON.stringify(st)); else localStorage.removeItem(PUSH_STATE_KEY); } catch (e) {}
        }
        // Push включён и сервер уже принял подписку
        function pushActive() {
            try {
                return pushSupported() && Notification.permission === 'granted' && !!_pushReadState().endpoint;
            } catch (e) { return false; }
        }
        function _b64uToBytes(str) {
            const s = String(str).replace(/-/g, '+').replace(/_/g, '/');
            const bin = atob(s + '==='.slice((s.length + 3) % 4));
            const out = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
            return out;
        }
        function _pushHash(str) {
            let x = 2166136261;
            for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
            return (x >>> 0).toString(36) + ':' + str.length;
        }
        // Хадисы на PUSH_DAYS дней: первый — в уже сохранённое время (то же, что
        // у таймера страницы), дальше каждые 3–6 ч. Случайность «с зерном» из
        // этого времени: пока оно не изменилось, расписание одно и то же.
        function _hadithPushEvents(days) {
            if (!hadithOn()) return [];
            const list = getHadiths();
            if (!list.length) return [];
            const now = Date.now();
            let ts = _hadithReadNext();
            if (!ts || ts <= now || ts - now > HADITH_MAX_MS) return [];
            let seed = (ts % 4294967296) >>> 0;
            const rnd = () => {
                seed = (seed + 0x6D2B79F5) >>> 0;
                let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
                r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
                return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
            };
            const end = now + days * 24 * 60 * 60 * 1000;
            const out = [];
            let last = -1;
            while (ts < end && out.length < 80) {
                let idx = Math.floor(rnd() * list.length);
                if (idx === last && list.length > 1) idx = (idx + 1) % list.length;
                last = idx;
                const body = _hadithText(list[idx]);
                if (body) {
                    out.push({ ts, tag: 'azkar-hadith-' + ts, kind: 'hadith',
                        title: t('hadithLabel'), body, source: _hadithSource(list[idx]) });
                }
                ts += HADITH_MIN_MS + Math.floor(rnd() * (HADITH_MAX_MS - HADITH_MIN_MS + 1));
            }
            return out;
        }
        function _buildPushEvents() {
            if (!notifMasterOn()) return [];
            const now = Date.now() + 5000;
            let list = [];
            try { list = buildNotifEvents(PUSH_DAYS); } catch (e) {}
            try { list = list.concat(_hadithPushEvents(PUSH_DAYS)); } catch (e) {}
            return list.filter(e => e.ts > now)
                .sort((a, b) => a.ts - b.ts)
                .map(e => ({ ts: e.ts, tag: e.tag, kind: e.kind || '', title: e.title, body: e.body, source: e.source || '' }));
        }
        async function _pushSubscription(create) {
            const reg = await navigator.serviceWorker.ready;
            let sub = await reg.pushManager.getSubscription();
            if (!sub && create) {
                sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: _b64uToBytes(_pushCfg().publicKey)
                });
            }
            return sub;
        }
        // Отправляет подписку и расписание на сервер (только если что-то изменилось)
        async function syncPush(force) {
            if (!pushSupported() || _pushSyncing) return false;
            _pushSyncing = true;
            const server = String(_pushCfg().server).replace(/\/+$/, '');
            try {
                const st = _pushReadState();
                if (Notification.permission !== 'granted') {
                    // Уведомления запретили — убираем подписку с сервера
                    if (st.endpoint) {
                        fetch(server + '/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ endpoint: st.endpoint }) }).catch(() => {});
                        _pushWriteState(null);
                    }
                    return false;
                }
                const sub = await _pushSubscription(true);
                if (!sub) return false;
                const subJson = sub.toJSON();
                const events = _buildPushEvents();
                const body = JSON.stringify({ subscription: subJson, events: events });
                const hash = _pushHash(body);
                if (!force && st.endpoint === subJson.endpoint && st.hash === hash && Date.now() - (st.at || 0) < PUSH_RESYNC_MS) return true;
                const res = await fetch(server + '/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body });
                if (!res.ok) return false;
                const wasActive = !!st.endpoint;
                _pushWriteState({ endpoint: subJson.endpoint, hash: hash, at: Date.now() });
                // Push заработал — выключаем таймеры SW (иначе уведомления задвоятся)
                if (!wasActive) {
                    navigator.serviceWorker.ready.then(reg => {
                        if (!reg || !reg.active) return;
                        reg.active.postMessage({ type: 'CANCEL_EVENTS' });
                        reg.active.postMessage({ type: 'CANCEL_HADITH' });
                    }).catch(() => {});
                }
                return true;
            } catch (e) {
                return false;
            } finally {
                _pushSyncing = false;
            }
        }
        function schedulePushSync(force) {
            if (!pushSupported()) return;
            clearTimeout(_pushSyncTimer);
            _pushSyncTimer = setTimeout(() => { syncPush(!!force); }, force ? 300 : 3000);
        }
        function loadData() {
            const s = localStorage.getItem('azkar_settings');
            if (s) Object.assign(settings, JSON.parse(s));
            count = parseInt(localStorage.getItem('azkar_count') || '0');
            const g = localStorage.getItem('azkar_goal');
            if (g) { const pg = parseInt(g); isUnlimited = (pg === UNLIMITED_GOAL); goal = isUnlimited ? 33 : pg; }
            else { goal = 100; }
            // Точка отсчёта кольца для стандартных целей. Зажимаем в [0, count],
            // чтобы устаревшее/битое значение не сломало позицию шарика.
            goalBaseline = parseInt(localStorage.getItem('azkar_goal_baseline') || '0');
            if (isNaN(goalBaseline) || goalBaseline < 0 || goalBaseline > count) goalBaseline = 0; customBaseline = _readCustomBaseline();
            customGoal = parseInt(localStorage.getItem('azkar_custom_goal') || '0');
            duas = JSON.parse(localStorage.getItem('azkar_duas') || '[]');
            loadDuaFolders();
            loadSpecialFolders();
            currentLang = settings.language || 'en';
            // Блокируем CSS-переходы на время первой загрузки — иначе тема анимируется из initial-value
            document.documentElement.classList.add('no-transition');
            applyTheme(settings.theme || 'dark');
            // Два rAF гарантируют, что браузер успел применить стили до снятия блокировки
            requestAnimationFrame(() => requestAnimationFrame(() => {
                document.documentElement.classList.remove('no-transition');
            }));
            applyLanguage(currentLang);
            _statsCache = JSON.parse(localStorage.getItem('azkar_stats_v2') || '{}');
            completedSpecial = JSON.parse(localStorage.getItem('azkar_special_completed') || '{}');
            specialProgress = JSON.parse(localStorage.getItem('azkar_special_progress') || '{}');
            specialResumeSessions = JSON.parse(localStorage.getItem('azkar_special_resume_sessions') || '{}');
            loadDhikrTotals();
            // Сбрасываем completedSpecial и specialProgress прошлых дней сразу при загрузке.
            pruneCompletedSpecial();
            loadCustomSpecialDhikrs();
            lastActiveSpecialId = localStorage.getItem('azkar_last_special_id') || null;
            // Restore vibration defaults if not set
            if (settings.vibration === undefined) settings.vibration = false;
            if (settings.vibrationLevel === undefined) settings.vibrationLevel = 3;
            if (settings.clickSoundVolume === undefined) settings.clickSoundVolume = 10;
            if (settings.goalSoundVolume === undefined) settings.goalSoundVolume = 10;
            if (settings.autoExtendStep === undefined) {
                // Миграция прежнего переключателя: включено означало +100.
                settings.autoExtendStep = settings.autoExtend ? 100 : 0;
            }
            delete settings.autoExtend;
            if (settings.autoAdvance === undefined) settings.autoAdvance = false;
            if (settings.stealthMode === undefined) settings.stealthMode = false;
            // Хадисы по умолчанию включены; дальше значение управляется ползунком в настройках.
            if (settings.hadithEnabled === undefined) settings.hadithEnabled = true;
            // Общий ползунок уведомлений и отдельные виды (намазы / зикр Абу Умамы — по умолчанию выключены).
            if (settings.notifMaster === undefined) settings.notifMaster = true;
            if (settings.notifPrayer === undefined) settings.notifPrayer = false;
            if (settings.notifAbuUmama === undefined) settings.notifAbuUmama = false;
            if (settings.onlinePresence === undefined) settings.onlinePresence = true;
            updateSettingsUI();
            updateHadithUI();
            scheduleHadith();
            // Restore PiP counter
            updatePipCounter();
            document.getElementById('customGoalNum').innerText = formatGoalShort(customGoal || 1000);
            document.querySelectorAll('.goal-chip').forEach(c => c.classList.remove('active'));
            if (isUnlimited) document.getElementById('customGoalChip').classList.add('active');
            else if (goal === 33) document.querySelector('[data-goal="33"]').classList.add('active');
            else if (goal === 66) document.querySelector('[data-goal="66"]').classList.add('active');
            else if (goal === 100) document.querySelector('[data-goal="100"]').classList.add('active');
            else if (goal === customGoal) document.getElementById('customGoalChip').classList.add('active');
            // Не считаем цель «уже сработавшей» при загрузке: оверлей достижения
            // на старте не показывается, а флаг иначе мог бы заблокировать
            // следующие срабатывания (33→66→100) после перезапуска.
            goalTriggered = false;
            setupSwipe();
        }

        // ===== WAKE LOCK — removed for battery savings =====
        function requestWakeLock() { /* disabled */ }


        // ===== PAUSE ANIMATIONS IN BACKGROUND (battery saving) =====
        function setAnimationState(state) {
            document.querySelectorAll('.star-icon, .ring-outer-glow').forEach(el => {
                el.style.animationPlayState = state;
            });
        }
        document.addEventListener('visibilitychange', () => {
            setAnimationState(document.hidden ? 'paused' : 'running');
        });

        // ===== FLOATING COUNTER — draggable, Document PiP =====
        let _pipWindow = null;

        // ---- Draggable logic (called after DOM ready) ----
        function initDraggable() {
            const btn = document.getElementById('pipCounterBtn');
            if (!btn) return;
            let isDragging = false;
            let dragStarted = false;
            let longPressTimer = null;
            let startX, startY, btnX, btnY;
            const LONG_PRESS_MS = 900;
            const EDGE_MARGIN  = 10;   // отступ от левого/правого края
            const TOP_MARGIN   = 56;   // отступ сверху (navbar/status bar)
            const BTN_SIZE     = 64;

            /* ── helpers ── */
            function getNavH() {
                // читаем актуальную CSS-переменную --nav-h, иначе фолбэк 80px
                const raw = getComputedStyle(document.documentElement)
                    .getPropertyValue('--nav-h').trim();
                return parseInt(raw) || 80;
            }
            function getSafeB() {
                const raw = getComputedStyle(document.documentElement)
                    .getPropertyValue('--safe-b').trim();
                return parseInt(raw) || 0;
            }

            function getPos() {
                const saved = localStorage.getItem('pip_pos');
                if (saved) { try { return JSON.parse(saved); } catch(e){} }
                return { x: window.innerWidth - BTN_SIZE - EDGE_MARGIN,
                         y: window.innerHeight - getNavH() - getSafeB() - BTN_SIZE - 20 };
            }

            /* applyPos — зажимает в допустимой зоне, НЕ анимирует (мгновенно) */
            function applyPos(x, y, animate) {
                const W = window.innerWidth, H = window.innerHeight;
                const navH = getNavH(), safeB = getSafeB();
                const minY = TOP_MARGIN;
                const maxY = H - navH - safeB - BTN_SIZE - EDGE_MARGIN;
                x = Math.max(EDGE_MARGIN, Math.min(W - BTN_SIZE - EDGE_MARGIN, x));
                y = Math.max(minY, Math.min(maxY, y));
                if (!animate) {
                    // отключаем CSS-transition на позицию — мгновенный follow
                    btn.style.transition = 'box-shadow 0.15s ease, transform 0.15s ease, opacity 0.2s ease';
                }
                btn.style.left   = x + 'px';
                btn.style.top    = y + 'px';
                btn.style.right  = 'auto';
                btn.style.bottom = 'auto';
                return { x, y };
            }

            /* snapToEdge — прилипает к ближайшему краю с CSS spring */
            function snapToEdge(currentX, currentY) {
                const W = window.innerWidth;
                const cx = currentX + BTN_SIZE / 2;
                const snapX = cx < W / 2
                    ? EDGE_MARGIN
                    : W - BTN_SIZE - EDGE_MARGIN;

                // восстанавливаем spring-transition перед финальным прыжком
                btn.style.transition = [
                    'left   0.52s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    'top    0.42s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    'opacity 0.35s ease',
                    'box-shadow 0.2s ease',
                    'transform 0.18s ease'
                ].join(', ');

                return applyPos(snapX, currentY, true);
            }

            function savePos(x, y) { localStorage.setItem('pip_pos', JSON.stringify({ x, y })); }

            /* ── idle fade (5 сек без касания → полупрозрачность) ── */
            let idleTimer = null;
            function resetIdleTimer() {
                btn.classList.remove('pip-idle');
                clearTimeout(idleTimer);
                idleTimer = setTimeout(() => {
                    if (!isDragging) btn.classList.add('pip-idle');
                }, 5000);
            }

            /* инит позиции без анимации — в следующем кадре: getComputedStyle во время
               загрузки страницы заставлял браузер досрочно пересчитать стили всего
               документа (ЭТАП 4). Кнопка в этот момент всё равно невидима. */
            requestAnimationFrame(() => {
                const pos = getPos();
                btn.style.transition = 'none';
                applyPos(pos.x, pos.y, false);
                // восстанавливаем spring-transition после первой расстановки
                requestAnimationFrame(() => {
                    btn.style.transition = '';
                });
            });

            /* ── pointer events ── */
            function onPointerDown(e) {
                if (isDragging) return;
                resetIdleTimer();   // активируем при касании
                startX = e.clientX; startY = e.clientY;
                const rect = btn.getBoundingClientRect();
                btnX = rect.left; btnY = rect.top;
                dragStarted = false;

                longPressTimer = setTimeout(() => {
                    isDragging = true;
                    dragStarted = true;
                    btn.classList.add('dragging');
                    btn.classList.remove('drag-ready', 'pip-idle');
                    if (navigator.vibrate) navigator.vibrate(40);
                }, LONG_PRESS_MS);

                const hintTimer = setTimeout(() => {
                    if (!dragStarted) btn.classList.add('drag-ready');
                }, 300);
                btn._hintTimer = hintTimer;

                btn.setPointerCapture(e.pointerId);
                e.preventDefault();
            }

            function onPointerMove(e) {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                applyPos(btnX + dx, btnY + dy, false);
            }

            function onPointerUp(e) {
                clearTimeout(longPressTimer);
                clearTimeout(btn._hintTimer);
                btn.classList.remove('drag-ready');

                if (isDragging) {
                    const rect = btn.getBoundingClientRect();
                    btn.classList.remove('dragging');
                    isDragging = false;
                    dragStarted = false;

                    // spring-snap к ближайшему краю
                    const snapped = snapToEdge(rect.left, rect.top);
                    savePos(snapped.x, snapped.y);
                    resetIdleTimer();
                } else {
                    pipTap();
                    resetIdleTimer();
                }
            }

            btn.addEventListener('pointerdown',   onPointerDown);
            btn.addEventListener('pointermove',   onPointerMove);
            btn.addEventListener('pointerup',     onPointerUp);
            btn.addEventListener('pointercancel', onPointerUp);

            window.addEventListener('resize', () => {
                const p = getPos();
                btn.style.transition = 'none';
                applyPos(p.x, p.y, false);
                requestAnimationFrame(() => { btn.style.transition = ''; });
            });

            // запускаем idle-таймер после инициализации
            resetIdleTimer();
        }

        function togglePipCounter() {
            settings.pipCounter = !settings.pipCounter;
            saveDataDebounced();
            updateSettingsUI();
            updatePipCounter();
            if (!settings.pipCounter) {
                closePipWindow();
            }
        }

        function updatePipCounter() {
            const btn = document.getElementById('pipCounterBtn');
            const numEl = document.getElementById('pipCountNum');
            const labelEl = document.getElementById('pipCountLabel');
            if (!btn) return;
            if (numEl) {
                numEl.textContent = pipMode === 'special' ? specialCount : count;
            }
            if (labelEl) {
                labelEl.textContent = pipMode === 'special' ? (specialGoal ? '/ ' + specialGoal : '') : '';
            }
            if (settings.pipCounter) {
                btn.classList.add('show');
            } else {
                btn.classList.remove('show');
            }
            syncPipWindow();
        }

        function pipTap() {
            if (pipMode === 'special') {
                incrementSpecial();
            } else {
                increment();
            }
        }

        // ---- Document Picture-in-Picture (Chrome/Edge) ----
        // Opens a tiny always-on-top window with counter + tap button
        // Falls back gracefully if API not supported
        async function openDocumentPiP() {
            if (!window.documentPictureInPicture) return; // API not available, btn in-page is enough
            if (_pipWindow) return; // already open
            try {
                const accent = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim() || '#d4af37';
                const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0a0a0a';
                const surface = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#111';
                const text = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#fff';

                _pipWindow = await window.documentPictureInPicture.requestWindow({
                    width: 160, height: 180,
                    disallowReturnToOpener: false,
                });

                _pipWindow.document.title = t('pipTitle');
                _pipWindow.document.head.innerHTML = `<style>
                    *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;-webkit-touch-callout:none;}
                    body{display:flex;flex-direction:column;align-items:center;justify-content:center;
                        height:100vh;background:${bg};font-family:'Cormorant Garamond',serif;overflow:hidden;gap:8px;}
                    #pn{font-size:3rem;font-weight:700;color:${accent};line-height:1;transition:transform 0.1s;}
                    #pn.pop{transform:scale(1.18);}
                    #pl{font-size:0.55rem;font-weight:600;color:rgba(255,255,255,0.35);letter-spacing:1px;text-transform:uppercase;font-family:sans-serif;}
                    #pb{width:90px;padding:9px 0;border-radius:40px;border:1.5px solid ${accent};
                        background:transparent;color:${accent};font-family:inherit;font-size:1rem;font-weight:600;
                        cursor:pointer;transition:background 0.12s,transform 0.1s;letter-spacing:0.5px;}
                    #pb:active{background:${accent}22;transform:scale(0.94);}
                    @font-face{font-family:'Cormorant Garamond';src:url('${new URL('fonts/cormorantgaramond.woff2', location.href).href}') format('woff2');font-weight:300 700;font-display:swap;}
                </style>`;

                const label = t('pipLabel');
                const tapLabel = t('pipTap');
                _pipWindow.document.body.innerHTML = `
                    <div id="pl">${label}</div>
                    <div id="pn">${count}</div>
                    <button id="pb">${tapLabel}</button>`;

                _pipWindow.document.getElementById('pb').addEventListener('click', () => {
                    increment(); // increments in main window
                });

                _pipWindow.addEventListener('pagehide', () => {
                    _pipWindow = null;
                    // don't turn off setting — user just closed the pip window
                });
            } catch(e) {
                _pipWindow = null;
                // API denied — floating btn is still available
            }
        }

        function closePipWindow() {
            if (_pipWindow) { try { _pipWindow.close(); } catch(e){} _pipWindow = null; }
        }

        function syncPipWindow() {
            if (!_pipWindow) return;
            try {
                const el = _pipWindow.document.getElementById('pn');
                if (el) {
                    el.textContent = count;
                    el.classList.add('pop');
                    setTimeout(() => el.classList.remove('pop'), 120);
                }
            } catch(e) {}
        }

        // ===== РАЗРЕШЕНИЕ НА УВЕДОМЛЕНИЯ =====
        async function requestNotifPermission() {
            if (!('Notification' in window)) return 'denied';
            if (Notification.permission === 'granted') return 'granted';
            if (Notification.permission === 'denied') return 'denied';
            const result = await Notification.requestPermission();
            if (result === 'granted') schedulePushSync(true);
            return result;
        }

        // При сворачивании/закрытии — сразу сохраняем, не ждём debounce
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                flushSave();
                persistRememberedAccountSnapshot();
                flushDhikrDeltaSync();
                flushPendingAppDataPush();
            } else {
                scheduleDhikrDeltaSync(0);
                if (firebaseReadyPromise) retryCloudSyncIfNeeded();
            }
        });

        window.addEventListener('pagehide', () => { flushSave(); persistRememberedAccountSnapshot(); flushDhikrDeltaSync(); flushPendingAppDataPush(); });
        window.addEventListener('online', () => {
            if (firebaseReadyPromise) retryCloudSyncIfNeeded();
            else if (shouldStartAccountSyncAtLaunch()) initFirebaseAccount().catch(function(e) { console.warn('[Firebase] Reconnect failed:', e); });
            scheduleDhikrDeltaSync(0);
        });
        window.addEventListener('beforeunload', () => { flushSave(); });
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                const activeId = document.querySelector('.screen.active')?.id;
                if (activeId === 'screen-azkar') { e.preventDefault(); increment(); }
                else if (activeId === 'screen-special-counter') { e.preventDefault(); incrementSpecial(); }
            }
        });

        // ===== SCROLLBAR AUTOHIDE =====
        // Мировой стандарт: мгновенное появление, исчезание через 1.5s (macOS/Notion/Linear)
        (function initScrollbarAutoHide() {
            const HIDE_DELAY = 1500; // 1.5s — стандарт macOS/Notion
            document.querySelectorAll('.screen').forEach(screen => {
                let hideTimer = null;
                screen.addEventListener('scroll', () => {
                    screen.classList.add('sb-visible');
                    clearTimeout(hideTimer);
                    hideTimer = setTimeout(() => {
                        screen.classList.remove('sb-visible');
                    }, HIDE_DELAY);
                }, { passive: true });
            });
        })();

        // ==================== STORAGE LAYER (local-first, DB-ready) ====================
        // All persistent app data lives in localStorage under the keys listed in
        // APP_DATA_KEYS. This is intentionally synchronous: the data is small JSON,
        // so reads/writes are instant and never block the UI (no freezes). IndexedDB
        // would force every read to become asynchronous and would require rewriting
        // the whole app for no real benefit at this data size, so we stay on
        // localStorage.
        //
        // FUTURE DATABASE: to sync to a backend later, implement an adapter object
        //   { push(snapshot), pull() }  and assign it to AppStorage.remote. Every
        // save funnels through markDataChanged(), and AppStorage.exportAll() returns
        // the full local snapshot ready to upload — so moving from "local only" to
        // "local + database" is a small, contained change with no data loss.
        const APP_DATA_KEYS = [
            'azkar_count', 'azkar_goal', 'azkar_goal_baseline', 'azkar_custom_goal', 'azkar_custom_baseline',
            'azkar_duas', 'azkar_dua_folders', 'azkar_names99_dua_deleted', 'azkar_checklist_lists_v5', 'azkar_checklist_v4', 'azkar_stats_v2',
            'azkar_special_completed', 'azkar_special_progress', 'azkar_custom_special_dhikrs',
            'azkar_special_resume_sessions',
            'azkar_special_deleted_defaults', 'azkar_last_special_id', 'azkar_settings',
            'azkar_special_history', 'azkar_task_history', 'azkar_dhikr_totals', 'azkar_account_icon_v1'
        ];

        const AppStorage = {
            // Assign a remote adapter ({ push(snapshot), pull() }) in the future to
            // enable database sync. null = data is kept purely on this device.
            remote: null,
            // Snapshot every app-data key as a plain { key: value } object — exactly
            // the shape a future database push() would upload.
            exportAll() {
                const out = {};
                APP_DATA_KEYS.forEach(k => {
                    try { const v = localStorage.getItem(k); if (v !== null) out[k] = v; } catch (e) {}
                });
                return out;
            },
            // Write a snapshot (e.g. one pulled from a database) back into local
            // storage. Only known app-data keys are accepted.
            importAll(data) {
                if (!data) return;
                APP_DATA_KEYS.forEach(k => {
                    try { if (Object.prototype.hasOwnProperty.call(data, k)) localStorage.setItem(k, data[k]); } catch (e) {}
                });
            },
            replaceAll(data) {
                APP_DATA_KEYS.forEach(k => {
                    try { localStorage.removeItem(k); } catch (e) {}
                });
                this.importAll(data || {});
            }
        };

        function saveGuestLocalSnapshot() {
            if (firebaseCurrentUid) return;
            try {
                setActiveDataOwnerUid(null);
                flushSave();
                localStorage.setItem(GUEST_SNAPSHOT_STORAGE_KEY, JSON.stringify({
                    savedAt: new Date().toISOString(),
                    snapshot: AppStorage.exportAll()
                }));
            } catch(e) {}
        }

        function restoreGuestLocalSnapshot() {
            try {
                setActiveDataOwnerUid(null);
                const raw = localStorage.getItem(GUEST_SNAPSHOT_STORAGE_KEY);
                if (!raw) return false;
                const data = JSON.parse(raw);
                if (!data || !data.snapshot) return false;
                firebaseRemoteImporting = true;
                try {
                    AppStorage.replaceAll(data.snapshot);
                    reloadAppStateFromStorage();
                } finally {
                    firebaseRemoteImporting = false;
                }
                return true;
            } catch(e) {
                return false;
            }
        }

        function buildCleanAccountSnapshot() {
            const cleanSettings = {
                ...settings,
                language: currentLang || settings.language || 'en'
            };
            return {
                azkar_settings: JSON.stringify(cleanSettings),
                azkar_count: '0',
                azkar_goal: '100',
                azkar_goal_baseline: '0',
                azkar_custom_goal: '0',
                azkar_custom_baseline: '0',
                azkar_duas: '[]',
                azkar_dua_folders: '[]',
                azkar_checklist_lists_v5: JSON.stringify({ activeId: null, lists: [] }),
                azkar_stats_v2: '{}',
                azkar_special_completed: '{}',
                azkar_special_progress: '{}',
                azkar_special_resume_sessions: '{}',
                azkar_custom_special_dhikrs: '[]',
                azkar_special_deleted_defaults: '[]',
                azkar_dhikr_totals: '{}'
            };
        }

        function reloadAppStateFromStorage() {
            try {
                const ss = localStorage.getItem('azkar_settings');
                if (ss) Object.assign(settings, JSON.parse(ss));
                currentLang = settings.language || 'en';
                count = parseInt(localStorage.getItem('azkar_count') || '0');
                const gg = localStorage.getItem('azkar_goal');
                if (gg) {
                    const pg = parseInt(gg);
                    isUnlimited = (pg === UNLIMITED_GOAL);
                    goal = isUnlimited ? 33 : pg;
                }
                goalBaseline = parseInt(localStorage.getItem('azkar_goal_baseline') || '0');
                if (isNaN(goalBaseline) || goalBaseline < 0 || goalBaseline > count) goalBaseline = 0; customBaseline = _readCustomBaseline();
                customGoal = parseInt(localStorage.getItem('azkar_custom_goal') || '0');
                duas = JSON.parse(localStorage.getItem('azkar_duas') || '[]');
                loadDuaFolders();
                loadSpecialFolders();
                _statsCache = JSON.parse(localStorage.getItem('azkar_stats_v2') || '{}');
                completedSpecial = JSON.parse(localStorage.getItem('azkar_special_completed') || '{}');
                specialProgress = JSON.parse(localStorage.getItem('azkar_special_progress') || '{}');
                specialResumeSessions = JSON.parse(localStorage.getItem('azkar_special_resume_sessions') || '{}');
                loadDhikrTotals();
                loadCustomSpecialDhikrs();
                pruneCompletedSpecial();
                lastActiveSpecialId = localStorage.getItem('azkar_last_special_id') || null;
                accountIconDataUrl = loadAccountIcon();
                try { loadChecklist(); } catch(e) {}
                applyTheme(settings.theme || 'dark', { animate: false });
                applyLanguage(currentLang);
                ensureNames99DuaFolder();
                updateDisplay();
                updateSettingsUI();
                updateHadithUI();
                updatePipCounter();
                try { updateDhikrOverallProgress(); } catch(e) {}
                markDirty('dua','favorites','stats','special');
            } catch(e) {
                console.warn('[Storage] Reload failed:', e);
            }
        }

        function _isPlainSyncObject(value) {
            return !!value && typeof value === 'object' && !Array.isArray(value);
        }

        function _parseSyncJsonObject(raw) {
            try {
                const value = JSON.parse(raw || '{}');
                return _isPlainSyncObject(value) ? value : {};
            } catch(e) {
                return {};
            }
        }

        // Single integration point for a future database / sync engine. Local
        // persistence itself is handled by flushSave(); this only mirrors changes to
        // an optional remote adapter (debounced). With no adapter it is a cheap no-op,
        // so every existing save path can call it safely today.
        let _dataSyncTimer = null;
        let _localDataRevision = 0;
        function persistRememberedAccountSnapshot() {
            try {
                const uid = resolveSyncUid();
                if (!uid) return;
                flushSave();
                saveFirebaseAccountLocalSnapshot(uid, AppStorage.exportAll(), Date.now(), true);
            } catch(e) {}
        }
        function markDataChanged() {
            // Imports call updateDisplay(), which also reaches this function. They
            // are not user edits and must not be mistaken for activity made while a
            // remote pull was in flight.
            if (firebaseRemoteImporting) return;
            _localDataRevision++;
            const uid = resolveSyncUid();
            if (!uid) return;
            const canPushNow = firebaseCurrentUid === uid && AppStorage.remote && typeof AppStorage.remote.pushKeys === 'function';
            if (_dataSyncTimer) clearTimeout(_dataSyncTimer);
            _dataSyncTimer = setTimeout(() => {
                _dataSyncTimer = null;
                // Uploads only the keys that really changed since the last sync
                // (dhikr numbers go through their own delta transactions).
                try { pushDirtyAppData(uid); } catch (e) {}
            }, canPushNow ? 900 : 400);
        }

        // One-time cleanup: remove every trace of the former account / Firebase
        // cloud-sync system from this device (stored auth account, avatar,
        // per-account data snapshots, device id, data-owner pointer, sync
        // timestamps and old migration flags). The pure local data in APP_DATA_KEYS
        // is left completely untouched.
        (function _purgeAccountRemnants() {
            try {
                if (localStorage.getItem('azkar_local_only_v1')) return;
                ['azkar_account', 'azkar_avatar', 'azkar_device_id', 'azkar_data_owner',
                 'azkar_cloud_updatedAt', 'azkar_sync_migrated_v40'].forEach(k => {
                    try { localStorage.removeItem(k); } catch (e) {}
                });
                Object.keys(localStorage).forEach(k => {
                    if (k.indexOf('azkar_snap_') === 0) { try { localStorage.removeItem(k); } catch (e) {} }
                });
                localStorage.setItem('azkar_local_only_v1', '1');
            } catch (e) {}
        })();

        // ==================== CHECKLIST (DYNAMIC FOLDERS) ====================
        // Data: folders = [{ name, names?:{ru,en,...}, tasks:[{ name, names?:{...}, done }] }, ...]
        // Default folders/tasks may carry a per-language `names` map so they
        // re-translate live; user-created items only carry a plain `name`.
        let checklistFolders = [];           // рабочий массив = .folders активного списка (ссылка)

        // ===== СПИСКИ ЗАДАЧ (страницы) =====
        // Каждый «список» — отдельная страница со своими папками/подпапками/задачами
        // и собственной статистикой. checklistFolders всегда указывает на folders
        // активного списка. Хранится в azkar_checklist_lists_v5: { activeId, lists }.
        let checklistLists = [];             // [{ id, name?|names?, folders:[...] }]
        let activeChecklistListId = null;
        const CL_LISTS_KEY = 'azkar_checklist_lists_v5';
        // Имя списка по умолчанию (локализуется как папки — через names-карту)
        const CL_DEFAULT_LIST_NAMES = {
            ru: 'Ежедневные', en: 'Daily', uz: 'Kunlik', de: 'Täglich', es: 'Diario',
            fr: 'Quotidien', it: 'Quotidiano', ja: '毎日', ko: '매일', zh: '每日',
            tr: 'Günlük', hi: 'दैनिक', ms: 'Harian', id: 'Harian', th: 'รายวัน'
        };
        function _genListId() {
            return 'list_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        }
        function getActiveChecklistList() {
            return checklistLists.find(l => l && l.id === activeChecklistListId) || checklistLists[0] || null;
        }
        // Перед сохранением: синхронизировать folders активного списка с рабочим массивом
        function _syncActiveListFolders() {
            const a = getActiveChecklistList();
            if (a) a.folders = checklistFolders;
        }

        // Helper: get the localized name with safe fallback
        function clGetName(obj) {
            if (!obj) return '';
            if (obj.names && typeof obj.names === 'object') {
                const lang = (typeof currentLang !== 'undefined' ? currentLang : 'en');
                return obj.names[lang] || obj.names.en || obj.names.ru || obj.name || '';
            }
            return obj.name || '';
        }

        // Default folders & tasks — chosen to NOT duplicate the Special Dhikrs
        // (Subhanallah, Alhamdulillah, Allahu Akbar, Tahlil, Istighfar, Salawat,
        //  Ayat-ul-Kursi as part of Aytul-Kursi-related dhikrs are already there
        //  through Surah dhikrs). These are practical daily acts of worship and
        //  good deeds rather than counted dhikr.
        // v4: Each folder has exactly 5 tasks. Folders may also contain
        // `subfolders` — nested folders with their own tasks (one level deep).
        // Данные лежат в data/checklist-defaults.js и скачиваются только когда нужны
        // (этап 3 оптимизации): первый запуск, удаление последнего списка, или
        // один раз после обновления данных — дозаполнить переводы стандартных задач.
        let CL_DEFAULT_FOLDERS = null;
        const CL_DEFAULTS_FLAG = 'azkar_cl_defaults_v';
        function loadClDefaults() {
            if (CL_DEFAULT_FOLDERS) return Promise.resolve(CL_DEFAULT_FOLDERS);
            return loadDataScript('data/checklist-defaults.js').then(() => {
                if (Array.isArray(window.AZKAR_CL_DEFAULT_FOLDERS)) CL_DEFAULT_FOLDERS = window.AZKAR_CL_DEFAULT_FOLDERS;
                return CL_DEFAULT_FOLDERS;
            });
        }
        function _clDefaultFoldersCopy() {
            return JSON.parse(JSON.stringify(CL_DEFAULT_FOLDERS || []));
        }

        const CL_DAY_KEY = 'azkar_checklist_day_key';

        function isChecklistTaskDaily(task) {
            return !task || task.daily !== false;
        }

        function forEachChecklistTask(cb) {
            checklistFolders.forEach((folder, f) => {
                if (!Array.isArray(folder.tasks)) folder.tasks = [];
                folder.tasks.forEach((task, ti) => cb(task, folder, f, null, ti));
                if (!Array.isArray(folder.subfolders)) folder.subfolders = [];
                folder.subfolders.forEach((sf, s) => {
                    if (!Array.isArray(sf.tasks)) sf.tasks = [];
                    sf.tasks.forEach((task, ti) => cb(task, sf, f, s, ti));
                });
            });
        }

        // Обходит задачи ВО ВСЕХ списках (нужно для сброса ежедневных по дате).
        function forEachChecklistTaskInLists(cb) {
            checklistLists.forEach(list => {
                if (!list) return;
                if (!Array.isArray(list.folders)) list.folders = [];
                list.folders.forEach(folder => {
                    if (!Array.isArray(folder.tasks)) folder.tasks = [];
                    folder.tasks.forEach(task => cb(task, folder));
                    if (!Array.isArray(folder.subfolders)) folder.subfolders = [];
                    folder.subfolders.forEach(sf => {
                        if (!Array.isArray(sf.tasks)) sf.tasks = [];
                        sf.tasks.forEach(task => cb(task, sf));
                    });
                });
            });
        }

        function normalizeChecklistData() {
            let changed = false;
            checklistLists.forEach(list => {
                if (!list) return;
                if (!Array.isArray(list.folders)) { list.folders = []; changed = true; }
                list.folders.forEach(folder => {
                    if (!Array.isArray(folder.tasks)) { folder.tasks = []; changed = true; }
                    if (!Array.isArray(folder.subfolders)) { folder.subfolders = []; changed = true; }
                    folder.subfolders.forEach(sf => {
                        if (!Array.isArray(sf.tasks)) { sf.tasks = []; changed = true; }
                    });
                });
            });
            forEachChecklistTaskInLists(task => {
                if (!task) return;
                if (!task.id) { task.id = 'tk' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); changed = true; }
                if (task.type === 'counter') {
                    // Счётчик-задача (напр. восполнение намазов): всегда разовая.
                    if (task.daily !== false) { task.daily = false; changed = true; }
                    if (typeof task.target !== 'number') { task.target = 0; changed = true; }
                    if (typeof task.remaining !== 'number') { task.remaining = task.target; changed = true; }
                    const shouldDone = task.remaining <= 0;
                    if (!!task.done !== shouldDone) { task.done = shouldDone; changed = true; }
                } else if (task.daily === undefined) {
                    task.daily = true;
                    changed = true;
                }
            });
            return changed;
        }

        function getChecklistDayKey() {
            if (typeof _islamicDayKey === 'function') return _islamicDayKey();
            const d = new Date();
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        }

        function resetChecklistDailyTasks() {
            let changed = false;
            forEachChecklistTaskInLists(task => {
                if (task && isChecklistTaskDaily(task) && task.done) {
                    task.done = false;
                    changed = true;
                }
            });
            return changed;
        }

        function applyChecklistDailyRollover() {
            // Модуль намазов ещё не готов, а время Фаджра не закэшировано, но
            // локация сохранена — ждём модуль (initDayRolloverWatcher повторит
            // проверку), иначе день посчитается от полуночи и задачи сбросятся в 00:00.
            try {
                if (!window.PrayerTimes && localStorage.getItem('azkar_geoloc') &&
                    !localStorage.getItem('azkar_last_fajr_hours')) return false;
            } catch(e) {}
            const today = getChecklistDayKey();
            let last = null;
            try { last = localStorage.getItem(CL_DAY_KEY); } catch(e) {}
            if (last && last !== today) {
                const changed = resetChecklistDailyTasks();
                try { localStorage.setItem(CL_DAY_KEY, today); } catch(e) {}
                if (changed) saveChecklist();
                return changed;
            }
            if (!last) {
                try { localStorage.setItem(CL_DAY_KEY, today); } catch(e) {}
            }
            return false;
        }

        // Добавляет переводы стандартным спискам/папкам/задачам пользователя
        // (для тех, кто начал пользоваться до появления новых языков).
        // Сопоставление по английскому названию — переименованное не трогается.
        function _clBackfillDefaultNames() {
            if (!CL_DEFAULT_FOLDERS) return;
                    const nameLookup = {};
                    (CL_DEFAULT_FOLDERS || []).forEach(f => {
                        if (f.names && f.names.en) nameLookup[f.names.en] = f.names;
                        (f.tasks || []).forEach(t => { if (t.names && t.names.en) nameLookup[t.names.en] = t.names; });
                        (f.subfolders || []).forEach(sf => {
                            if (sf.names && sf.names.en) nameLookup[sf.names.en] = sf.names;
                            (sf.tasks || []).forEach(t => { if (t.names && t.names.en) nameLookup[t.names.en] = t.names; });
                        });
                    });
                    const fill = (obj) => {
                        if (obj && obj.names && obj.names.en && nameLookup[obj.names.en]) {
                            obj.names = Object.assign({}, nameLookup[obj.names.en], obj.names);
                        }
                    };
                    checklistLists.forEach(l => {
                        if (l && l.names && l.names.ru === CL_DEFAULT_LIST_NAMES.ru && l.names.en === CL_DEFAULT_LIST_NAMES.en) {
                            l.names = Object.assign({}, CL_DEFAULT_LIST_NAMES, l.names);
                        }
                        (l && Array.isArray(l.folders) ? l.folders : []).forEach(f => {
                            fill(f);
                            (f.tasks || []).forEach(fill);
                            (f.subfolders || []).forEach(sf => { fill(sf); (sf.tasks || []).forEach(fill); });
                        });
                    });
        }

        function loadChecklist() {
            // Новый формат — СПИСКИ (страницы) в azkar_checklist_lists_v5.
            // Если его нет — мигрируем из старого azkar_checklist_v4 (или сеем
            // дефолт) в список по умолчанию «Ежедневные». Старый ключ v4 НЕ
            // удаляем — он остаётся как страховка и для импорта старых бэкапов.
            let migrated = false;
            let parsed = null;
            try { const raw = localStorage.getItem(CL_LISTS_KEY); if (raw) parsed = JSON.parse(raw); } catch(e) { parsed = null; }
            if (parsed && Array.isArray(parsed.lists) && parsed.lists.length) {
                checklistLists = parsed.lists;
                activeChecklistListId = parsed.activeId || (checklistLists[0] && checklistLists[0].id) || null;
                // Backfill new-language names onto the built-in default «Ежедневные»
                // list (and its preset folders/tasks) for users created before
                // those languages existed. Matches by English name so renamed
                // items are never touched.
                // Дозаполнение нужно один раз на версию данных (или после импорта).
                let needBackfill = true;
                try { needBackfill = localStorage.getItem(CL_DEFAULTS_FLAG) !== DATA_VERSION; } catch (e) {}
                if (needBackfill && !CL_DEFAULT_FOLDERS) {
                    loadClDefaults().then(f => {
                        if (!f) return;
                        _clBackfillDefaultNames();
                        saveChecklist();
                        try { localStorage.setItem(CL_DEFAULTS_FLAG, DATA_VERSION); } catch (e) {}
                        renderChecklistFolders();
                        updateChecklistUI();
                        updateChecklistListUI();
                    });
                } else if (needBackfill) {
                    _clBackfillDefaultNames();
                    try { localStorage.setItem(CL_DEFAULTS_FLAG, DATA_VERSION); } catch (e) {}
                }
            } else {
                let folders = null;
                try { const v4 = localStorage.getItem('azkar_checklist_v4'); if (v4) folders = JSON.parse(v4); } catch(e) { folders = null; }
                if (!Array.isArray(folders)) {
                    if (!CL_DEFAULT_FOLDERS) {
                        // Первый запуск: стандартные задачи ещё не скачаны.
                        // Скачиваем и повторяем loadChecklist (обычно доли секунды).
                        // Пустой список НЕ сохраняем — иначе стандартные задачи потерялись бы.
                        checklistLists = [];
                        activeChecklistListId = null;
                        checklistFolders = [];
                        loadClDefaults().then(f => {
                            if (checklistLists.length) return; // уже что-то создано/импортировано
                            if (!f) CL_DEFAULT_FOLDERS = []; // нет сети — создаём пустой список
                            loadChecklist();
                        });
                        renderChecklistFolders();
                        updateChecklistUI();
                        updateChecklistListUI();
                        return;
                    }
                    folders = _clDefaultFoldersCopy();
                    // Свежие стандартные задачи уже содержат все переводы.
                    try { localStorage.setItem(CL_DEFAULTS_FLAG, DATA_VERSION); } catch (e) {}
                }
                const id = _genListId();
                checklistLists = [{ id: id, names: { ...CL_DEFAULT_LIST_NAMES }, folders: folders }];
                activeChecklistListId = id;
                migrated = true;
            }
            if (!getActiveChecklistList() && checklistLists[0]) activeChecklistListId = checklistLists[0].id;
            const active = getActiveChecklistList();
            checklistFolders = (active && Array.isArray(active.folders)) ? active.folders : [];
            if (active && active.folders !== checklistFolders) active.folders = checklistFolders;

            const normalized = normalizeChecklistData();
            const rolled = applyChecklistDailyRollover();
            if (migrated || (normalized && !rolled)) saveChecklist();
            renderChecklistFolders();
            updateChecklistUI();
            updateChecklistListUI();
        }

        function saveChecklist() {
            _syncActiveListFolders();
            try {
                localStorage.setItem(CL_LISTS_KEY, JSON.stringify({ activeId: activeChecklistListId, lists: checklistLists }));
            } catch(e) {}
            markDataChanged();
        }

        // ===== СЕЛЕКТОР СПИСКОВ (страниц задач) =====
        function updateChecklistListUI() {
            const nameEl = document.getElementById('clListSelectName');
            const active = getActiveChecklistList();
            if (nameEl) nameEl.textContent = active ? clGetName(active) : '';
            _buildChecklistListDropdown();
        }
        function _buildChecklistListDropdown() {
            const dd = document.getElementById('clListDropdown');
            if (!dd) return;
            const editIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
            const delIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>';
            dd.innerHTML = '';
            checklistLists.forEach(list => {
                const opt = document.createElement('div');
                opt.className = 'cl-list-option' + (list.id === activeChecklistListId ? ' active' : '');
                opt.innerHTML = '<svg class="clo-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
                    + '<span class="clo-name">' + escHtml(clGetName(list)) + '</span>'
                    + '<button class="clo-act edit" type="button" title="' + escAttr(t('titleEditList')) + '">' + editIcon + '</button>'
                    + '<button class="clo-act del" type="button" title="' + escAttr(t('titleDeleteList')) + '">' + delIcon + '</button>';
                opt.onclick = (e) => { if (e.target.closest('.clo-act')) return; switchChecklistList(list.id); };
                opt.querySelector('.clo-act.edit').onclick = (e) => { e.stopPropagation(); _closeChecklistListDropdown(); renameChecklistListPrompt(list.id); };
                opt.querySelector('.clo-act.del').onclick = (e) => { e.stopPropagation(); _closeChecklistListDropdown(); deleteChecklistListPrompt(list.id); };
                dd.appendChild(opt);
            });
            const nw = document.createElement('div');
            nw.className = 'cl-list-new';
            nw.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>' + escHtml(t('newListTitle')) + '</span>';
            nw.onclick = (e) => { e.stopPropagation(); _closeChecklistListDropdown(); openNewListModal(); };
            dd.appendChild(nw);
        }
        function toggleChecklistListDropdown(e) {
            if (e) e.stopPropagation();
            const btn = document.getElementById('clListSelectBtn');
            const dd = document.getElementById('clListDropdown');
            if (!btn || !dd) return;
            const isOpen = dd.classList.contains('open');
            if (!isOpen) _buildChecklistListDropdown();
            btn.classList.toggle('open', !isOpen);
            dd.classList.toggle('open', !isOpen);
        }
        function _closeChecklistListDropdown() {
            const btn = document.getElementById('clListSelectBtn');
            const dd = document.getElementById('clListDropdown');
            if (btn) btn.classList.remove('open');
            if (dd) dd.classList.remove('open');
        }
        function switchChecklistList(id) {
            if (id === activeChecklistListId) { _closeChecklistListDropdown(); return; }
            saveChecklist();                       // сохранить текущий список (sync folders)
            activeChecklistListId = id;
            const active = getActiveChecklistList();
            checklistFolders = (active && Array.isArray(active.folders)) ? active.folders : [];
            if (active && active.folders !== checklistFolders) active.folders = checklistFolders;
            saveChecklist();                       // запомнить activeId
            _closeChecklistListDropdown();
            renderChecklistFolders();
            updateChecklistUI();
            updateChecklistListUI();
        }
        // Закрытие дропдауна по клику вне
        document.addEventListener('click', function(e) {
            const w = document.getElementById('clListSelectWrap');
            if (w && !w.contains(e.target)) _closeChecklistListDropdown();
        });

        // ===== CRUD СПИСКОВ (создать / переименовать / удалить) =====
        let _listModalMode = 'new';      // 'new' | 'rename'
        let _renameListId = null;
        function openNewListModal() {
            _listModalMode = 'new';
            _renameListId = null;
            const ttl = document.getElementById('listNameTitle');
            const inp = document.getElementById('listNameInput');
            const cf = document.getElementById('listNameConfirmBtn');
            const cc = document.getElementById('listNameCancelBtn');
            if (ttl) ttl.textContent = t('newListTitle');
            if (inp) { inp.placeholder = t('listNamePlaceholder'); inp.value = ''; }
            if (cf) cf.textContent = t('addFolderConfirm');
            if (cc) cc.textContent = t('addFolderCancel');
            document.getElementById('listNameOverlay').classList.add('show');
        }
        function renameChecklistListPrompt(id) {
            const list = checklistLists.find(l => l.id === id);
            if (!list) return;
            _listModalMode = 'rename';
            _renameListId = id;
            const ttl = document.getElementById('listNameTitle');
            const inp = document.getElementById('listNameInput');
            const cf = document.getElementById('listNameConfirmBtn');
            const cc = document.getElementById('listNameCancelBtn');
            if (ttl) ttl.textContent = t('renameListTitle');
            if (inp) { inp.placeholder = t('listNamePlaceholder'); inp.value = clGetName(list); }
            if (cf) cf.textContent = t('btnSaveDua');
            if (cc) cc.textContent = t('addFolderCancel');
            document.getElementById('listNameOverlay').classList.add('show');
        }
        function closeListNameModal() {
            document.getElementById('listNameOverlay').classList.remove('show');
        }
        function confirmListName() {
            const inp = document.getElementById('listNameInput');
            const name = inp ? inp.value.trim() : '';
            if (!name) { if (inp) inp.focus(); return; }
            if (_listModalMode === 'rename' && _renameListId) {
                const list = checklistLists.find(l => l.id === _renameListId);
                if (list) { list.name = name; delete list.names; }   // своё имя перекрывает дефолтную names-карту
                saveChecklist();
                updateChecklistListUI();
                closeListNameModal();
                showToast(t('toastListRenamed'));
            } else {
                const id = _genListId();
                checklistLists.push({ id: id, name: name, folders: [] });
                closeListNameModal();
                switchChecklistList(id);     // переключиться на новый список (он же сохранит)
            }
        }
        let _deleteListId = null;
        function deleteChecklistListPrompt(id) {
            const list = checklistLists.find(l => l.id === id);
            if (!list) return;
            _deleteListId = id;
            const tt = document.getElementById('deleteListTitle');
            const ss = document.getElementById('deleteListSub');
            if (tt) tt.textContent = t('deleteListTitle');
            if (ss) ss.textContent = t('deleteListSub');
            document.getElementById('deleteListOverlay').classList.add('show');
        }
        function cancelDeleteList() {
            _deleteListId = null;
            document.getElementById('deleteListOverlay').classList.remove('show');
        }
        function confirmDeleteList() {
            if (!_deleteListId) { cancelDeleteList(); return; }
            const idx = checklistLists.findIndex(l => l.id === _deleteListId);
            if (idx === -1) { cancelDeleteList(); return; }
            const wasActive = (checklistLists[idx].id === activeChecklistListId);
            checklistLists.splice(idx, 1);
            if (checklistLists.length === 0) {
                // не оставляем пользователя без списков — пересоздаём дефолтный
                const nid = _genListId();
                checklistLists = [{ id: nid, names: { ...CL_DEFAULT_LIST_NAMES }, folders: _clDefaultFoldersCopy() }];
                activeChecklistListId = nid;
                if (!CL_DEFAULT_FOLDERS) {
                    // Стандартные задачи ещё не скачаны — заполним, как только придут.
                    loadClDefaults().then(f => {
                        const l = checklistLists.find(x => x.id === nid);
                        if (!f || !l || (l.folders && l.folders.length)) return;
                        l.folders = _clDefaultFoldersCopy();
                        if (activeChecklistListId === nid) checklistFolders = l.folders;
                        normalizeChecklistData();
                        saveChecklist();
                        renderChecklistFolders();
                        updateChecklistUI();
                        updateChecklistListUI();
                    });
                }
            } else if (wasActive) {
                activeChecklistListId = checklistLists[Math.max(0, idx - 1)].id;
            }
            const active = getActiveChecklistList();
            checklistFolders = (active && Array.isArray(active.folders)) ? active.folders : [];
            saveChecklist();
            _deleteListId = null;
            document.getElementById('deleteListOverlay').classList.remove('show');
            renderChecklistFolders();
            updateChecklistUI();
            updateChecklistListUI();
            showToast(t('toastListDeleted'));
        }

        // Возвращает HTML карточки задачи: обычной (чекбокс) или счётчика (−1/+1).
        function _clTaskCardHtml(task, f, ti) {
            const dragHandle = '<div class="drag-handle"><svg viewBox="0 0 24 24"><circle cx="9" cy="5" r="1.2" fill="currentColor"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="9" cy="19" r="1.2" fill="currentColor"/><circle cx="15" cy="5" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="19" r="1.2" fill="currentColor"/></svg></div>';
            const editBtn = `<button class="cl-task-edit" onclick="event.stopPropagation();renameChecklistTask(${f},${ti})" title="${escAttr(t('titleEditTask'))}"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>`;
            const delBtn = `<button class="cl-task-delete" onclick="event.stopPropagation();deleteTask(${f},${ti})" title="${escAttr(t('titleDeleteTask'))}"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>`;
            if (task && task.type === 'counter') {
                const target = task.target || 0;
                const rem = (typeof task.remaining === 'number') ? task.remaining : target;
                const done = Math.max(0, target - rem);
                const pct = target > 0 ? Math.round(done / target * 100) : 0;
                return `
                                <div class="cl-task-card cl-counter-card${task.done ? ' done' : ''}" id="clTask${f}-${ti}" data-folder="${f}" data-task="${ti}" onclick="if(!event.target.closest('.drag-handle')&&!event.target.closest('.cl-task-edit')&&!event.target.closest('.cl-task-delete')&&!event.target.closest('.cl-counter-plus'))incrementCounterTask(${f},${ti})">
                                    ${dragHandle}
                                    <div class="cl-counter-body">
                                        <div class="cl-task-name">${escHtml(clGetName(task))}</div>
                                        <div class="cl-counter-line"><span class="cl-counter-remaining" id="clCounterRem${f}-${ti}">${rem}</span> <span class="cl-counter-left">${escHtml(t('counterLeftLabel'))}</span> <span class="cl-counter-sep">·</span> <span id="clCounterProg${f}-${ti}">${done}/${target}</span></div>
                                        <div class="cl-counter-bar"><div class="cl-counter-bar-fill" id="clCounterBar${f}-${ti}" style="width:${pct}%"></div></div>
                                    </div>
                                    <button class="cl-counter-plus" type="button" onclick="event.stopPropagation();decrementCounterTask(${f},${ti})" title="+1">+1</button>
                                    ${editBtn}
                                    ${delBtn}
                                </div>`;
            }
            return `
                                <div class="cl-task-card${task.done ? ' done' : ''}${isChecklistTaskDaily(task) ? ' daily' : ' one-time'}${task.done && !isChecklistTaskDaily(task) ? ' locked' : ''}" id="clTask${f}-${ti}" data-folder="${f}" data-task="${ti}" onclick="if(!event.target.closest('.drag-handle')&&!event.target.closest('.cl-task-edit')&&!event.target.closest('.cl-task-delete'))toggleTask(${f},${ti})">
                                    ${dragHandle}
                                    <div class="cl-checkbox${task.done ? ' checked' : ''}" id="clCheck${f}-${ti}">
                                        <svg class="cl-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                                    </div>
                                    <div class="cl-task-name">${escHtml(clGetName(task))}</div>
                                    ${editBtn}
                                    ${delBtn}
                                </div>`;
        }

        // Счётчик-задачи (например, восполнение пропущенных намазов): −1 / +1.
        function decrementCounterTask(f, ti) {
            const task = checklistFolders[f] && checklistFolders[f].tasks[ti];
            if (!task || task.type !== 'counter') return;
            if ((task.remaining || 0) <= 0) return;
            task.remaining = Math.max(0, (task.remaining || 0) - 1);
            task.done = task.remaining <= 0;
            if (navigator.vibrate) navigator.vibrate(15);
            _refreshCounterCard(f, ti);
            updateChecklistUI();
            saveChecklist();
        }
        function incrementCounterTask(f, ti) {
            const task = checklistFolders[f] && checklistFolders[f].tasks[ti];
            if (!task || task.type !== 'counter') return;
            const target = task.target || 0;
            if ((task.remaining || 0) >= target) return;
            task.remaining = Math.min(target, (task.remaining || 0) + 1);
            task.done = task.remaining <= 0;
            _refreshCounterCard(f, ti);
            updateChecklistUI();
            saveChecklist();
        }
        function _refreshCounterCard(f, ti) {
            const task = checklistFolders[f] && checklistFolders[f].tasks[ti];
            if (!task) return;
            const target = task.target || 0;
            const done = Math.max(0, target - (task.remaining || 0));
            const pct = target > 0 ? Math.round(done / target * 100) : 0;
            const remEl = document.getElementById('clCounterRem' + f + '-' + ti);
            const progEl = document.getElementById('clCounterProg' + f + '-' + ti);
            const barEl = document.getElementById('clCounterBar' + f + '-' + ti);
            const cardEl = document.getElementById('clTask' + f + '-' + ti);
            if (remEl) remEl.textContent = task.remaining;
            if (progEl) progEl.textContent = done + '/' + target;
            if (barEl) barEl.style.width = pct + '%';
            if (cardEl) cardEl.classList.toggle('done', !!task.done);
        }

        function renderChecklistFolders() {
            const container = document.getElementById('checklistFolders');
            if (!container) return;
            container.innerHTML = '';
            checklistFolders.forEach((folder, f) => {
                if (!Array.isArray(folder.subfolders)) folder.subfolders = [];
                // Aggregate progress: own tasks + all subfolder tasks
                const ownDone = folder.tasks.filter(t => t.done).length;
                const ownAll = folder.tasks.length;
                let subDone = 0, subAll = 0;
                folder.subfolders.forEach(sf => {
                    subDone += sf.tasks.filter(t => t.done).length;
                    subAll  += sf.tasks.length;
                });
                const done = ownDone + subDone;
                const all  = ownAll  + subAll;
                const pct = all > 0 ? Math.round(done / all * 100) : 0;
                const folderDiv = document.createElement('div');
                folderDiv.className = 'cl-folder acc-folder' + (done === all && all > 0 ? ' done' : '');
                folderDiv.id = 'clFolder' + f;
                folderDiv.innerHTML = `
                    <div class="cl-folder-header" onclick="toggleFolder(${f})">
                        <div class="cl-folder-left">
                            <div class="cl-folder-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                            </div>
                            <div class="cl-folder-info">
                                <div class="cl-folder-name">${escHtml(clGetName(folder))}</div>
                                <div class="cl-folder-progress-text" id="clFolderProgress${f}">${done} / ${all}</div>
                            </div>
                        </div>
                        <div class="cl-folder-right">
                            <button class="cl-folder-add-sub" onclick="event.stopPropagation();openFolderPlusTaskModal(${f})" title="${escAttr(t('addTaskBtn'))}">
                                <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                            </button>
                            <button class="cl-folder-edit" onclick="event.stopPropagation();renameChecklistFolder(${f})" title="${escAttr(t('titleRenameFolder'))}">
                                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button class="cl-folder-delete" onclick="event.stopPropagation();deleteFolder(${f})" title="${escAttr(t('titleDeleteFolder'))}">
                                <svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                            </button>
                            <svg class="cl-folder-chevron" id="clFolderChevron${f}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                    </div>
                    <div class="cl-folder-body" id="clFolderBody${f}">
                        <div class="dua-folder-list-wrap">
                            <div class="cl-folder-bar-wrap" id="clFolderBarWrap${f}">
                                <div class="cl-progress-bar-bg">
                                    <div class="cl-progress-bar-fill" id="clFolderBarFill${f}" style="width:${pct}%"></div>
                                </div>
                                <span class="cl-progress-pct" id="clFolderBarPct${f}">${pct}%</span>
                            </div>
                            ${folder.subfolders && folder.subfolders.length ? `` : ''}
                            <div class="dua-list dua-folder-list cl-task-list" id="clTaskList${f}">
                                ${folder.tasks.map((task, ti) => _clTaskCardHtml(task, f, ti)).join('')}
                            </div>
                        </div>
                    </div>`;
                container.appendChild(folderDiv);
            });
            _initTaskCardDrag();
            _watchChecklistOpenFolder(container);
            _restoreChecklistOpenFolder();
        }

        // ===== Какая папка задач была открыта — помним и после закрытия приложения =====
        // Для каждого списка задач свой номер открытой папки; -1 — все папки закрыты.
        var CL_OPEN_FOLDER_KEY = 'azkar_cl_open_folder';
        function _clOpenFolderMap() {
            try { return JSON.parse(localStorage.getItem(CL_OPEN_FOLDER_KEY) || '{}') || {}; } catch (e) { return {}; }
        }
        function _restoreChecklistOpenFolder() {
            const saved = _clOpenFolderMap()[activeChecklistListId];
            // Первый запуск — как раньше, открыта первая папка
            const idx = (typeof saved === 'number') ? saved : 0;
            document.querySelectorAll('#checklistFolders .cl-folder.acc-open').forEach(f => f.classList.remove('acc-open'));
            if (idx >= 0) openFolderEl(idx);
        }
        function _watchChecklistOpenFolder(container) {
            if (container.dataset.openWatch === '1') return;
            container.dataset.openWatch = '1';
            new MutationObserver(records => {
                if (!records.some(r => r.target.classList && r.target.classList.contains('cl-folder'))) return;
                const open = container.querySelector('.cl-folder.acc-open');
                const idx = open ? Number(open.id.replace('clFolder', '')) : -1;
                const map = _clOpenFolderMap();
                if (map[activeChecklistListId] === idx) return;
                map[activeChecklistListId] = idx;
                try { localStorage.setItem(CL_OPEN_FOLDER_KEY, JSON.stringify(map)); } catch (e) {}
            }).observe(container, { subtree: true, attributes: true, attributeFilter: ['class'] });
        }

        // ===== SUBFOLDER RENDER =====
        // Renders one nested subfolder (HTML string). It is a compact version of
        // a top-level folder: header with icon/name/actions + body that holds
        // its own task list. Subfolders are limited to one level of nesting on
        // purpose — keeps the UI simple while satisfying "folder inside folder".
        function renderSubfolderHtml(f, s, sf) {
            const done = sf.tasks.filter(t => t.done).length;
            const all  = sf.tasks.length;
            const isDone = done === all && all > 0;
            const tasksHtml = sf.tasks.map((task, ti) => `
                <div class="cl-task-card${task.done ? ' done' : ''}${isChecklistTaskDaily(task) ? ' daily' : ' one-time'}${task.done && !isChecklistTaskDaily(task) ? ' locked' : ''}" id="clSubTask${f}-${s}-${ti}" data-folder="${f}" data-sub="${s}" data-task="${ti}" onclick="if(!event.target.closest('.cl-task-edit')&&!event.target.closest('.cl-task-delete'))toggleSubTask(${f},${s},${ti})">
                    <div class="cl-checkbox${task.done ? ' checked' : ''}" id="clSubCheck${f}-${s}-${ti}">
                        <svg class="cl-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div class="cl-task-name">${escHtml(clGetName(task))}</div>
                    <button class="cl-task-edit" onclick="event.stopPropagation();renameSubTask(${f},${s},${ti})" title="${escAttr(t('titleEditTask'))}">
                        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="cl-task-delete" onclick="event.stopPropagation();deleteSubTask(${f},${s},${ti})" title="${escAttr(t('titleDeleteTask'))}">
                        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                </div>`).join('');
            return `
                <div class="cl-subfolder${isDone ? ' done' : ''}" id="clSubfolder${f}-${s}">
                    <div class="cl-subfolder-header" onclick="toggleSubfolder(${f},${s})">
                        <div class="cl-subfolder-left">
                            <div class="cl-subfolder-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                            </div>
                            <div class="cl-subfolder-info">
                                <div class="cl-subfolder-name">${escHtml(clGetName(sf))}</div>
                                <div class="cl-subfolder-progress-text" id="clSubfolderProgress${f}-${s}">${done} / ${all}</div>
                            </div>
                        </div>
                        <div class="cl-subfolder-right">
                            <button class="cl-subfolder-add-task" onclick="event.stopPropagation();addSubTask(${f},${s})" title="${escAttr(t('titleAddTaskToSubfolder'))}">
                                <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                            </button>
                            <button class="cl-subfolder-edit" onclick="event.stopPropagation();renameSubfolder(${f},${s})" title="${escAttr(t('titleEditSubfolder'))}">
                                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button class="cl-subfolder-delete" onclick="event.stopPropagation();deleteSubfolder(${f},${s})" title="${escAttr(t('titleDeleteSubfolder'))}">
                                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                            </button>
                            <svg class="cl-subfolder-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                    </div>
                    <div class="cl-subfolder-body">
                        <div class="cl-subfolder-body-inner">
                            ${all > 0
                                ? `<div class="cl-task-list" id="clSubTaskList${f}-${s}">${tasksHtml}</div>`
                                : `<div class="cl-subfolder-empty">${escHtml(t('emptyFolder'))}</div>`}
                        </div>
                    </div>
                </div>`;
        }

        // Small helper to safely embed translated strings into HTML attributes.
        function escAttr(s) {
            return String(s == null ? '' : s)
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }

        // ===== TASK CARD DRAG&DROP (reorder within a folder) =====
        let _taskDragFolder = null, _taskDragTask = null;

        function _reorderTask(folderIdx, fromIdx, toIdx) {
            const folder = checklistFolders[folderIdx];
            if (!folder || fromIdx === toIdx) return;
            const tasks = folder.tasks;
            if (fromIdx < 0 || fromIdx >= tasks.length || toIdx < 0 || toIdx >= tasks.length) return;
            const [moved] = tasks.splice(fromIdx, 1);
            tasks.splice(toIdx, 0, moved);
            saveChecklist();
            renderChecklistFolders();
            updateChecklistUI();
            openFolderEl(folderIdx);
            if (navigator.vibrate) navigator.vibrate(20);
        }

        function _initTaskCardDrag() {
            const container = document.getElementById('checklistFolders');
            if (!container) return;
            container.querySelectorAll('.cl-task-card').forEach(card => {
                const fIdx = parseInt(card.dataset.folder);
                const handle = card.querySelector('.drag-handle');
                if (handle) initTaskTouchDrag(handle, card, fIdx);
                // Desktop drag
                card.draggable = true;
                card.addEventListener('dragstart', function(e) {
                    _taskDragFolder = fIdx;
                    _taskDragTask = parseInt(this.dataset.task);
                    this.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                });
                card.addEventListener('dragover', function(e) {
                    if (_taskDragFolder !== fIdx) return; // only reorder inside same folder
                    e.preventDefault();
                    this.classList.add('drag-over');
                });
                card.addEventListener('dragleave', function() { this.classList.remove('drag-over'); });
                card.addEventListener('drop', function(e) {
                    e.preventDefault();
                    this.classList.remove('drag-over');
                    const ti = parseInt(this.dataset.task);
                    if (_taskDragFolder === fIdx && _taskDragTask !== null && _taskDragTask !== ti) {
                        _reorderTask(fIdx, _taskDragTask, ti);
                    }
                    _taskDragFolder = null; _taskDragTask = null;
                });
                card.addEventListener('dragend', function() {
                    this.classList.remove('dragging');
                    container.querySelectorAll('.cl-task-card').forEach(c => c.classList.remove('drag-over'));
                    _taskDragFolder = null; _taskDragTask = null;
                });
            });
        }

        // Touch drag for a task card — long-press the handle to reorder within its folder
        function initTaskTouchDrag(handle, card, folderIdx) {
            let _pressTimer = null;
            let _dragActive = false;

            handle.addEventListener('touchstart', e => {
                e.stopPropagation();
                _dragActive = false;
                _pressTimer = setTimeout(() => {
                    _dragActive = true;
                    _taskDragFolder = folderIdx;
                    _taskDragTask = parseInt(card.dataset.task);
                    card.classList.add('dragging');
                    if (navigator.vibrate) navigator.vibrate(30);
                }, 500);
            }, { passive: true });

            handle.addEventListener('touchmove', e => {
                if (!_dragActive) {
                    if (_pressTimer) { clearTimeout(_pressTimer); _pressTimer = null; }
                    return;
                }
                e.preventDefault();
                const touch = e.touches[0];
                const list = document.getElementById('clTaskList' + folderIdx);
                if (!list) return;
                list.querySelectorAll('.cl-task-card').forEach(c => {
                    const r = c.getBoundingClientRect(); c.classList.remove('drag-over');
                    const ci = parseInt(c.dataset.task);
                    if (touch.clientY >= r.top && touch.clientY <= r.bottom && ci !== _taskDragTask) c.classList.add('drag-over');
                });
            }, { passive: false });

            handle.addEventListener('touchend', e => {
                if (_pressTimer) { clearTimeout(_pressTimer); _pressTimer = null; }
                const list = document.getElementById('clTaskList' + folderIdx);
                card.classList.remove('dragging');
                if (!_dragActive) { _dragActive = false; return; }
                const touch = e.changedTouches[0];
                let targetIdx = null;
                if (list) list.querySelectorAll('.cl-task-card').forEach(c => {
                    const r = c.getBoundingClientRect(); c.classList.remove('drag-over');
                    if (touch.clientY >= r.top && touch.clientY <= r.bottom) targetIdx = parseInt(c.dataset.task);
                });
                if (targetIdx !== null && targetIdx !== _taskDragTask) {
                    _reorderTask(folderIdx, _taskDragTask, targetIdx);
                }
                _taskDragFolder = null; _taskDragTask = null; _dragActive = false;
            });

            handle.addEventListener('touchcancel', () => {
                if (_pressTimer) { clearTimeout(_pressTimer); _pressTimer = null; }
                card.classList.remove('dragging');
                const list = document.getElementById('clTaskList' + folderIdx);
                if (list) list.querySelectorAll('.cl-task-card').forEach(c => c.classList.remove('drag-over'));
                _taskDragFolder = null; _taskDragTask = null; _dragActive = false;
            });
        }

        function escHtml(s) {
            return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        }

        function toggleTask(folderIdx, taskIdx) {
            if (!checklistFolders[folderIdx]) return;
            const task = checklistFolders[folderIdx].tasks[taskIdx];
            if (!task) return;
            if (task.done && !isChecklistTaskDaily(task)) return;
            task.done = !task.done;
            const taskEl = document.getElementById('clTask' + folderIdx + '-' + taskIdx);
            const checkEl = document.getElementById('clCheck' + folderIdx + '-' + taskIdx);
            if (taskEl) taskEl.classList.toggle('done', task.done);
            if (checkEl) checkEl.classList.toggle('checked', task.done);
            if (task.done && navigator.vibrate) navigator.vibrate(20);
            updateChecklistUI();
            saveChecklist();
        }

        // ===== SWIPE-TO-COMPLETE (заменено на drag&drop карточек задач) =====
        // Перетаскивание задач реализовано в _initTaskCardDrag/initTaskTouchDrag.

        function updateChecklistUI() {
            let totalDone = 0, totalAll = 0;
            checklistFolders.forEach((folder, f) => {
                const ownDone = folder.tasks.filter(t => t.done).length;
                const ownAll = folder.tasks.length;
                let subDone = 0, subAll = 0;
                if (Array.isArray(folder.subfolders)) {
                    folder.subfolders.forEach((sf, s) => {
                        const sDone = sf.tasks.filter(t => t.done).length;
                        const sAll = sf.tasks.length;
                        subDone += sDone; subAll += sAll;
                        // Subfolder progress text + done state
                        const sProg = document.getElementById('clSubfolderProgress' + f + '-' + s);
                        if (sProg) sProg.textContent = sDone + ' / ' + sAll;
                        const sEl = document.getElementById('clSubfolder' + f + '-' + s);
                        if (sEl) sEl.classList.toggle('done', sDone === sAll && sAll > 0);
                    });
                }
                const done = ownDone + subDone;
                const all = ownAll + subAll;
                totalDone += done; totalAll += all;
                const pct = all > 0 ? Math.round(done / all * 100) : 0;
                const progText = document.getElementById('clFolderProgress' + f);
                if (progText) progText.textContent = done + ' / ' + all;
                const barFill = document.getElementById('clFolderBarFill' + f);
                const barPct = document.getElementById('clFolderBarPct' + f);
                if (barFill) barFill.style.width = pct + '%';
                if (barPct) barPct.textContent = pct + '%';
                const folderEl = document.getElementById('clFolder' + f);
                if (folderEl) folderEl.classList.toggle('done', done === all && all > 0);
            });
            const overallPct = totalAll > 0 ? Math.round(totalDone / totalAll * 100) : 0;
            const overallFill = document.getElementById('checklistOverallFill');
            const overallPctEl = document.getElementById('checklistOverallPercent');
            if (overallFill) overallFill.style.width = overallPct + '%';
            if (overallPctEl) overallPctEl.textContent = overallPct + '%';
        }

        // ===== CHECKLIST DETAILED STATISTICS =====
        // Aggregates a rich breakdown of the whole checklist: overall progress,
        // daily vs one-time split, per-folder progress and — crucially — each
        // subfolder's own progress. Used by the detailed stats modal.
        function _computeChecklistStats() {
            let subfoldersCount = 0;
            let totalAll = 0, totalDone = 0;
            let dailyAll = 0, dailyDone = 0;
            let onceAll = 0, onceDone = 0;
            let completedFolders = 0;
            const folders = [];

            const tally = (task) => {
                if (isChecklistTaskDaily(task)) { dailyAll++; if (task.done) dailyDone++; }
                else { onceAll++; if (task.done) onceDone++; }
            };

            checklistFolders.forEach((folder) => {
                if (!Array.isArray(folder.tasks)) folder.tasks = [];
                if (!Array.isArray(folder.subfolders)) folder.subfolders = [];
                const ownAll = folder.tasks.length;
                const ownDone = folder.tasks.filter(t => t.done).length;
                folder.tasks.forEach(tally);

                const subs = [];
                let subAll = 0, subDone = 0;
                folder.subfolders.forEach((sf) => {
                    if (!Array.isArray(sf.tasks)) sf.tasks = [];
                    subfoldersCount++;
                    const sAll = sf.tasks.length;
                    const sDone = sf.tasks.filter(t => t.done).length;
                    sf.tasks.forEach(tally);
                    subAll += sAll; subDone += sDone;
                    subs.push({
                        name: clGetName(sf),
                        all: sAll, done: sDone,
                        pct: sAll > 0 ? Math.round(sDone / sAll * 100) : 0,
                        complete: sAll > 0 && sDone === sAll
                    });
                });

                const all = ownAll + subAll;
                const done = ownDone + subDone;
                totalAll += all; totalDone += done;
                if (all > 0 && done === all) completedFolders++;

                folders.push({
                    name: clGetName(folder),
                    all, done,
                    pct: all > 0 ? Math.round(done / all * 100) : 0,
                    complete: all > 0 && done === all,
                    ownAll, ownDone,
                    ownPct: ownAll > 0 ? Math.round(ownDone / ownAll * 100) : 0,
                    subs, hasSubs: subs.length > 0
                });
            });

            return {
                foldersCount: checklistFolders.length,
                subfoldersCount,
                totalAll, totalDone,
                remaining: totalAll - totalDone,
                overallPct: totalAll > 0 ? Math.round(totalDone / totalAll * 100) : 0,
                dailyAll, dailyDone, onceAll, onceDone,
                completedFolders, folders
            };
        }

        function _clStatCard(num, label) {
            return '<div class="clstat-card"><span class="num">' + num + '</span><span class="lbl">' + escHtml(label) + '</span></div>';
        }

        function openChecklistStats() {
            const body = document.getElementById('clStatsBody');
            const overlay = document.getElementById('checklistStatsOverlay');
            if (!body || !overlay) return;

            // Reset any leftover inline styles from a previous swipe-to-close,
            // scroll back to the top and wire up the drag-down-to-close gesture.
            const sheet = overlay.querySelector('.modal-sheet');
            if (sheet) { sheet.style.transition = ''; sheet.style.transform = ''; sheet.scrollTop = 0; }
            overlay.style.background = '';
            overlay.style.opacity = '';
            _initChecklistStatsSheetDrag();

            // Refresh static labels for the active language
            const titleEl = document.getElementById('clStatsTitle');
            if (titleEl) titleEl.textContent = t('clStatsTitle');
            const subEl = document.getElementById('clStatsSubtitle');
            if (subEl) subEl.textContent = t('clStatsSubtitle');
            const closeBtn = document.getElementById('clStatsCloseBtn');
            if (closeBtn) closeBtn.textContent = t('clStatsClose');

            const s = _computeChecklistStats();

            if (s.totalAll === 0) {
                body.innerHTML = '<div class="clstat-empty">' + escHtml(t('clStatsEmpty')) + '</div>';
                overlay.classList.add('show');
                return;
            }

            const folderIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;stroke:var(--gold);flex-shrink:0;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
            const subIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;stroke:var(--gold);flex-shrink:0;opacity:0.85;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
            const C = 2 * Math.PI * 52; // ring circumference (r = 52)
            const off = C - C * s.overallPct / 100;

            let html = '';

            // Overall progress ring + summary lines
            html += '<div class="clstat-overall">' +
                '<div class="clstat-ring">' +
                    '<svg class="clstat-ring-svg" viewBox="0 0 120 120">' +
                        '<circle class="clstat-ring-track" cx="60" cy="60" r="52" fill="none" stroke-width="10"/>' +
                        '<circle class="clstat-ring-fill" cx="60" cy="60" r="52" fill="none" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '" transform="rotate(-90 60 60)"/>' +
                    '</svg>' +
                    '<div class="clstat-ring-pct">' + s.overallPct + '%</div>' +
                '</div>' +
                '<div class="clstat-overall-info">' +
                    '<div class="clstat-overall-line"><span class="lbl">' + escHtml(t('clStatsCompleted')) + '</span><span class="val">' + s.totalDone + ' / ' + s.totalAll + '</span></div>' +
                    '<div class="clstat-overall-line"><span class="lbl">' + escHtml(t('clStatsRemaining')) + '</span><span class="val">' + s.remaining + '</span></div>' +
                    '<div class="clstat-overall-line"><span class="lbl">' + escHtml(t('clStatsCompletedFolders')) + '</span><span class="val">' + s.completedFolders + ' / ' + s.foldersCount + '</span></div>' +
                '</div>' +
            '</div>';

            // Summary stat cards
            html += '<div class="clstat-grid">' +
                _clStatCard(s.foldersCount, t('clStatsFolders')) +
                _clStatCard(s.subfoldersCount, t('clStatsSubfolders')) +
                _clStatCard(s.totalAll, t('clStatsTotal')) +
                _clStatCard(s.totalDone, t('clStatsCompleted')) +
                _clStatCard(s.dailyDone + ' / ' + s.dailyAll, t('clStatsDaily')) +
                _clStatCard(s.onceDone + ' / ' + s.onceAll, t('clStatsOneTime')) +
            '</div>';

            // Per-folder breakdown
            html += '<div class="clstat-section-title">' + escHtml(t('clStatsByFolders')) + '</div>';
            s.folders.forEach(fd => {
                html += '<div class="clstat-folder' + (fd.complete ? ' done' : '') + '">' +
                    '<div class="clstat-folder-head">' +
                        '<div class="clstat-folder-name">' + folderIcon + '<span>' + escHtml(fd.name) + '</span>' + (fd.complete ? '<span class="clstat-badge">✓</span>' : '') + '</div>' +
                        '<div class="clstat-folder-pct">' + fd.pct + '%</div>' +
                    '</div>' +
                    '<div class="clstat-bar-bg"><div class="clstat-bar-fill" style="width:' + fd.pct + '%"></div></div>' +
                    '<div class="clstat-meta"><span>' + escHtml(t('clStatsCompleted')) + ': ' + fd.done + ' / ' + fd.all + '</span><span>' + escHtml(t('clStatsRemaining')) + ': ' + (fd.all - fd.done) + '</span></div>';

                // Show the split only when the folder has subfolders
                if (fd.hasSubs) {
                    html += '<div class="clstat-subrow">' +
                        '<div class="clstat-subrow-head"><span class="nm">' + escHtml(t('clStatsOwnTasks')) + '</span><span class="ct">' + fd.ownDone + ' / ' + fd.ownAll + ' • ' + fd.ownPct + '%</span></div>' +
                        '<div class="clstat-bar-bg sm"><div class="clstat-bar-fill" style="width:' + fd.ownPct + '%"></div></div>' +
                    '</div>';
                    fd.subs.forEach(sb => {
                        html += '<div class="clstat-subrow">' +
                            '<div class="clstat-subrow-head"><span class="nm">' + subIcon + '<span>' + escHtml(sb.name) + '</span>' + (sb.complete ? '<span class="clstat-badge">✓</span>' : '') + '</span><span class="ct">' + sb.done + ' / ' + sb.all + ' • ' + sb.pct + '%</span></div>' +
                            '<div class="clstat-bar-bg sm"><div class="clstat-bar-fill" style="width:' + sb.pct + '%"></div></div>' +
                        '</div>';
                    });
                }
                html += '</div>';
            });

            body.innerHTML = html;
            overlay.classList.add('show');
        }

        function closeChecklistStats() {
            const overlay = document.getElementById('checklistStatsOverlay');
            if (overlay) overlay.classList.remove('show');
        }

        // ---- Swipe-down-to-close for the stats sheet (same UX as the prayer modal) ----
        function _initChecklistStatsSheetDrag() {
            const overlay = document.getElementById('checklistStatsOverlay');
            if (!overlay) return;
            const sheet = overlay.querySelector('.modal-sheet');
            if (!sheet || sheet._dragInit) return;
            sheet._dragInit = true;
            let startY = 0, startX = 0, dy = 0, dragging = false, decided = false, active = false;

            sheet.addEventListener('touchstart', e => {
                if (e.touches.length !== 1) return;
                startY = e.touches[0].clientY;
                startX = e.touches[0].clientX;
                dy = 0; dragging = true; decided = false; active = false;
                sheet.style.transition = 'none';
            }, { passive: true });

            sheet.addEventListener('touchmove', e => {
                if (!dragging) return;
                const ddy = e.touches[0].clientY - startY;
                const ddx = e.touches[0].clientX - startX;
                if (!decided) {
                    if (Math.abs(ddy) < 6 && Math.abs(ddx) < 6) return;
                    decided = true;
                    // Engage only on a mostly-vertical downward drag AND only when
                    // the sheet is scrolled to the very top — otherwise it's a
                    // normal content scroll.
                    active = (ddy > 0 && Math.abs(ddy) > Math.abs(ddx) && sheet.scrollTop <= 0);
                    if (!active) sheet.style.transition = '';
                }
                if (!active) return;
                dy = Math.max(0, ddy);
                e.preventDefault();
                sheet.style.transform = 'translateY(' + dy + 'px) translateZ(0)';
                const prog = Math.min(1, dy / 320);
                overlay.style.background = 'rgba(0,0,0,' + (0.72 * (1 - prog * 0.55)).toFixed(3) + ')';
            }, { passive: false });

            function endDrag() {
                if (!dragging) return;
                dragging = false;
                if (!active) { sheet.style.transition = ''; sheet.style.transform = ''; return; }
                active = false;
                if (dy > 110) {
                    // Slide fully down, then close
                    sheet.style.transition = 'transform 0.26s cubic-bezier(0.3,0,0.4,1)';
                    sheet.style.transform = 'translateY(100%) translateZ(0)';
                    overlay.style.transition = 'opacity 0.26s ease';
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        closeChecklistStats();
                        sheet.style.transition = ''; sheet.style.transform = '';
                        overlay.style.transition = ''; overlay.style.opacity = '';
                        overlay.style.background = '';
                    }, 260);
                } else {
                    // Snap back
                    sheet.style.transition = 'transform 0.26s cubic-bezier(0.2,0.9,0.4,1)';
                    sheet.style.transform = 'translateY(0) translateZ(0)';
                    overlay.style.background = '';
                    setTimeout(() => { sheet.style.transition = ''; sheet.style.transform = ''; }, 280);
                }
            }
            sheet.addEventListener('touchend', endDrag);
            sheet.addEventListener('touchcancel', () => {
                dragging = false; active = false;
                sheet.style.transition = ''; sheet.style.transform = '';
                overlay.style.background = '';
            });
        }

        // ===== DHIKR PROGRESS STATS =====
        // Показывает НАКОПЛЕННЫЙ (lifetime) счётчик по каждому зикру —
        // без дневного сброса и без понятия "% выполнения цели". Просто
        // честная сумма "сколько раз нажато" по каждому зикру и в целом.

        // Обновляет верхний показатель в screen-stats — общая сумма всех
        // засчитанных нажатий (основной зикр + все специальные), без сброса.
        function updateDhikrOverallProgress() {
            let grandTotal = 0;
            Object.keys(dhikrTotals).forEach(k => { grandTotal += (dhikrTotals[k] || 0); });
            const pctEl = document.getElementById('dhikrOverallPercent');
            if (pctEl) pctEl.textContent = formatBigNumber(grandTotal);
        }

        // Компактное форматирование больших чисел (1 234 567 → читаемо с пробелами)
        // Один форматтер на всё приложение: toLocaleString() создаёт новый
        // Intl.NumberFormat при каждом вызове — это медленно (ЭТАП 4).
        const _bigNumberFormat = new Intl.NumberFormat('ru-RU');
        function formatBigNumber(n) {
            n = Math.max(0, Math.floor(n || 0));
            return _bigNumberFormat.format(n).replace(/,/g, ' ');
        }

        function _computeDhikrStats() {
            const mainTotal = dhikrTotals['main'] || 0;

            // Папки специальных зикров
            const inFolderIds = new Set();
            specialFolders.forEach(folder => folder.dhikrIds.forEach(id => inFolderIds.add(id)));

            const folders = specialFolders.map(folder => {
                const dhikrs = folder.dhikrIds
                    .map(id => specialDhikrs.find(d => d.id === id))
                    .filter(Boolean);
                const folderTotal = dhikrs.reduce((sum, d) => sum + (dhikrTotals[d.id] || 0), 0);
                return {
                    name: folder.name,
                    total: folderTotal,
                    dhikrs: dhikrs.map(d => ({
                        name: getSpecialName(d),
                        total: dhikrTotals[d.id] || 0
                    }))
                };
            });

            // Зикры вне папок
            const unfoldered = specialDhikrs
                .filter(d => !inFolderIds.has(d.id))
                .map(d => ({
                    name: getSpecialName(d),
                    total: dhikrTotals[d.id] || 0
                }));

            const specTotal = specialDhikrs.reduce((sum, d) => sum + (dhikrTotals[d.id] || 0), 0);
            const grandTotal = mainTotal + specTotal;

            return {
                main: { total: mainTotal },
                folders, unfoldered,
                specTotal, grandTotal
            };
        }

        function openDhikrStats() {
            const body = document.getElementById('dhikrStatsBody');
            const overlay = document.getElementById('dhikrStatsOverlay');
            if (!body || !overlay) return;

            const sheet = overlay.querySelector('.modal-sheet');
            if (sheet) { sheet.style.transition = ''; sheet.style.transform = ''; sheet.scrollTop = 0; }
            overlay.style.background = '';
            overlay.style.opacity = '';
            _initDhikrStatsSheetDrag();

            const titleEl = document.getElementById('dhikrStatsTitle');
            if (titleEl) titleEl.textContent = t('dhikrStatsTitle');
            const subEl = document.getElementById('dhikrStatsSubtitle');
            if (subEl) subEl.textContent = t('dhikrStatsSubtitle');
            const closeBtn = document.getElementById('dhikrStatsCloseBtn');
            if (closeBtn) closeBtn.textContent = t('clStatsClose');

            const s = _computeDhikrStats();

            const folderIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;stroke:var(--gold);flex-shrink:0;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
            const dhikrIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;stroke:var(--gold);flex-shrink:0;opacity:0.85;"><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="10" opacity=".35"/></svg>';
            const mainIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;stroke:var(--gold);flex-shrink:0;"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" opacity=".5"/></svg>';

            let html = '';

            // Сводка сверху: кольцо с общим числом, поделённое на два цвета —
            // доля основного зикра (основной акцент темы) и доля специальных
            // зикров (светлый акцент той же темы). Кольцо всегда полностью
            // заполнено целиком (без серого "пустого" участка).
            const DC = 2 * Math.PI * 52;
            const mainLen = s.grandTotal > 0 ? DC * (s.main.total / s.grandTotal) : DC;
            const specialLen = DC - mainLen;
            html += '<div class="clstat-overall">' +
                '<div class="clstat-ring">' +
                    '<svg class="clstat-ring-svg" viewBox="0 0 120 120">' +
                        '<circle class="clstat-ring-track" cx="60" cy="60" r="52" fill="none" stroke-width="10"/>' +
                        '<circle class="clstat-ring-fill-main" cx="60" cy="60" r="52" fill="none" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + mainLen.toFixed(2) + ' ' + (DC - mainLen).toFixed(2) + '" stroke-dashoffset="0" transform="rotate(-90 60 60)"/>' +
                        (specialLen > 0.01 ? '<circle class="clstat-ring-fill-special" cx="60" cy="60" r="52" fill="none" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + specialLen.toFixed(2) + ' ' + (DC - specialLen).toFixed(2) + '" stroke-dashoffset="-' + mainLen.toFixed(2) + '" transform="rotate(-90 60 60)"/>' : '') +
                    '</svg>' +
                    '<div class="clstat-ring-pct" style="font-size:1.1rem;line-height:1.1;text-align:center;">' + formatBigNumber(s.grandTotal) + '</div>' +
                '</div>' +
                '<div class="clstat-overall-info">' +
                    '<div class="clstat-overall-line"><span class="lbl">' + escHtml(t('dhikrStatsMainDhikr')) + '</span><span class="val">' + formatBigNumber(s.main.total) + '</span></div>' +
                    '<div class="clstat-overall-line"><span class="lbl">' + escHtml(t('dhikrStatsSpecialLabel')) + '</span><span class="val">' + formatBigNumber(s.specTotal) + '</span></div>' +
                '</div>' +
            '</div>';

            // Папки специальных зикров — сумма по папке + список зикров с их суммами
            if (s.folders.length > 0) {
                html += '<div class="clstat-section-title">' + escHtml(t('dhikrStatsFoldersTitle')) + '</div>';
                s.folders.forEach(fd => {
                    html += '<div class="clstat-folder">' +
                        '<div class="clstat-folder-head">' +
                            '<div class="clstat-folder-name">' + folderIcon + '<span>' + escHtml(fd.name) + '</span></div>' +
                            '<div class="clstat-folder-pct">' + formatBigNumber(fd.total) + '</div>' +
                        '</div>';

                    fd.dhikrs.forEach(dh => {
                        html += '<div class="clstat-subrow">' +
                            '<div class="clstat-subrow-head">' +
                                '<span class="nm">' + dhikrIcon + '<span>' + escHtml(dh.name) + '</span></span>' +
                                '<span class="ct">' + formatBigNumber(dh.total) + '</span>' +
                            '</div>' +
                        '</div>';
                    });

                    html += '</div>';
                });
            }

            // Зикры вне папок — каждый со своей накопленной суммой
            if (s.unfoldered.length > 0) {
                html += '<div class="clstat-section-title">' + escHtml(t('dhikrStatsSpecialDhikrs')) + '</div>';
                s.unfoldered.forEach(dh => {
                    html += '<div class="clstat-folder">' +
                        '<div class="clstat-folder-head">' +
                            '<div class="clstat-folder-name">' + dhikrIcon + '<span>' + escHtml(dh.name) + '</span></div>' +
                            '<div class="clstat-folder-pct">' + formatBigNumber(dh.total) + '</div>' +
                        '</div>' +
                    '</div>';
                });
            }

            if (s.folders.length === 0 && s.unfoldered.length === 0 && s.main.total === 0) {
                body.innerHTML = '<div class="clstat-empty">' + escHtml(t('dhikrStatsNoDhikrs')) + '</div>';
            } else {
                body.innerHTML = html;
            }

            overlay.classList.add('show');
        }

        function closeDhikrStats() {
            const overlay = document.getElementById('dhikrStatsOverlay');
            if (overlay) overlay.classList.remove('show');
        }

        function _initDhikrStatsSheetDrag() {
            const overlay = document.getElementById('dhikrStatsOverlay');
            if (!overlay) return;
            const sheet = overlay.querySelector('.modal-sheet');
            if (!sheet || sheet._dragInit) return;
            sheet._dragInit = true;
            let startY = 0, startX = 0, dy = 0, dragging = false, decided = false, active = false;

            sheet.addEventListener('touchstart', e => {
                if (e.touches.length !== 1) return;
                startY = e.touches[0].clientY;
                startX = e.touches[0].clientX;
                dy = 0; dragging = true; decided = false; active = false;
                sheet.style.transition = 'none';
            }, { passive: true });

            sheet.addEventListener('touchmove', e => {
                if (!dragging) return;
                const ddy = e.touches[0].clientY - startY;
                const ddx = e.touches[0].clientX - startX;
                if (!decided) {
                    if (Math.abs(ddy) < 6 && Math.abs(ddx) < 6) return;
                    decided = true;
                    active = (ddy > 0 && Math.abs(ddy) > Math.abs(ddx) && sheet.scrollTop <= 0);
                    if (!active) sheet.style.transition = '';
                }
                if (!active) return;
                dy = Math.max(0, ddy);
                e.preventDefault();
                sheet.style.transform = 'translateY(' + dy + 'px) translateZ(0)';
                const prog = Math.min(1, dy / 320);
                overlay.style.background = 'rgba(0,0,0,' + (0.72 * (1 - prog * 0.55)).toFixed(3) + ')';
            }, { passive: false });

            function endDrag() {
                if (!dragging) return;
                dragging = false;
                if (!active) { sheet.style.transition = ''; sheet.style.transform = ''; return; }
                active = false;
                if (dy > 110) {
                    sheet.style.transition = 'transform 0.26s cubic-bezier(0.3,0,0.4,1)';
                    sheet.style.transform = 'translateY(100%) translateZ(0)';
                    overlay.style.transition = 'opacity 0.26s ease';
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        closeDhikrStats();
                        sheet.style.transition = ''; sheet.style.transform = '';
                        overlay.style.transition = ''; overlay.style.opacity = '';
                        overlay.style.background = '';
                    }, 260);
                } else {
                    sheet.style.transition = 'transform 0.26s cubic-bezier(0.2,0.9,0.4,1)';
                    sheet.style.transform = 'translateY(0) translateZ(0)';
                    overlay.style.background = '';
                    setTimeout(() => { sheet.style.transition = ''; sheet.style.transform = ''; }, 280);
                }
            }
            sheet.addEventListener('touchend', endDrag);
            sheet.addEventListener('touchcancel', () => {
                dragging = false; active = false;
                sheet.style.transition = ''; sheet.style.transform = '';
                overlay.style.background = '';
            });
        }

        function closeOpenChecklistFolders() {
            document.querySelectorAll('#checklistFolders .cl-folder.acc-open').forEach(f => f.classList.remove('acc-open'));
        }

        function toggleFolder(idx) {
            const folder = document.getElementById('clFolder' + idx);
            if (!folder) return;
            const isOpen = folder.classList.contains('acc-open');
            document.querySelectorAll('#checklistFolders .cl-folder').forEach(f => f.classList.remove('acc-open'));
            if (!isOpen) folder.classList.add('acc-open');
        }

        function openFolderEl(idx) {
            const folder = document.getElementById('clFolder' + idx);
            if (!folder) return;
            // Как и toggleFolder — открыта только одна папка
            document.querySelectorAll('#checklistFolders .cl-folder.acc-open').forEach(f => { if (f !== folder) f.classList.remove('acc-open'); });
            folder.classList.add('acc-open');
        }

        function initChecklistFolderOutsideClose() {
            const screen = document.getElementById('screen-checklist');
            if (!screen || screen.dataset.outsideCloseBound === '1') return;
            screen.dataset.outsideCloseBound = '1';
            screen.addEventListener('click', function(e) {
                if (e.target.closest('#checklistFolders .cl-folder')) return;
                closeOpenChecklistFolders();
            });
        }

        // ===== SUBFOLDER ACTIONS =====
        // Subfolders live one level deep inside a top-level folder under
        // `checklistFolders[f].subfolders[s]`. Each has its own `tasks` array.
        // The functions below mirror the parent-folder/task lifecycle:
        // open/toggle, rename, delete, plus add task + add subfolder.
        function toggleSubfolder(f, s) {
            const el = document.getElementById('clSubfolder' + f + '-' + s);
            if (!el) return;
            el.classList.toggle('acc-open');
        }

        function toggleSubTask(f, s, ti) {
            const folder = checklistFolders[f];
            if (!folder || !folder.subfolders || !folder.subfolders[s]) return;
            const task = folder.subfolders[s].tasks[ti];
            if (!task) return;
            if (task.done && !isChecklistTaskDaily(task)) return;
            task.done = !task.done;
            const taskEl = document.getElementById('clSubTask' + f + '-' + s + '-' + ti);
            const checkEl = document.getElementById('clSubCheck' + f + '-' + s + '-' + ti);
            if (taskEl) taskEl.classList.toggle('done', task.done);
            if (checkEl) checkEl.classList.toggle('checked', task.done);
            if (task.done && navigator.vibrate) navigator.vibrate(20);
            updateChecklistUI();
            saveChecklist();
        }

        function openFolderPlusTaskModal(folderIdx) {
            if (!checklistFolders[folderIdx]) return;
            _folderPlusTaskTarget = folderIdx;
            _renameFolderType = 'addFolderTask'; // custom mode for adding task to folder
            _renameTaskFolder = folderIdx;
            _renameTaskDaily = (localStorage.getItem('cl_daily_pref') !== 'false');
            _renameAddCounter = false;
            const input = document.getElementById('renameFolderInput');
            const title = document.getElementById('renameFolderTitle');
            const confirmBtn = document.getElementById('renameFolderConfirmBtn');
            const cancelBtn = document.getElementById('renameFolderCancelBtn');
            if (title) title.textContent = t('addTaskBtn');
            if (confirmBtn) confirmBtn.textContent = t('addFolderConfirm');
            if (cancelBtn) cancelBtn.textContent = t('addFolderCancel');
            if (input) { input.placeholder = t('placeholderTaskName'); input.value = ''; }
            setRenameTaskDailyVisible(true);
            document.getElementById('renameFolderOverlay').classList.add('show');
        }

        // ----- Add subfolder (opens shared rename modal in 'addSubfolder' mode) -----
        function addSubfolder(f) {
            if (!checklistFolders[f]) return;
            if (!Array.isArray(checklistFolders[f].subfolders)) checklistFolders[f].subfolders = [];
            _renameFolderType = 'addSubfolder';
            _renameFolderIdx = f;
            const input = document.getElementById('renameFolderInput');
            const title = document.getElementById('renameFolderTitle');
            const confirmBtn = document.getElementById('renameFolderConfirmBtn');
            if (title) title.textContent = t('addSubfolderTitleModal');
            if (confirmBtn) confirmBtn.textContent = t('addFolderConfirm');
            if (input) { input.placeholder = t('placeholderSubfolderName'); input.value = ''; }
            setRenameTaskDailyVisible(false);
            document.getElementById('renameFolderOverlay').classList.add('show');
        }

        // ----- Add task into a subfolder (reuses rename modal) -----
        function addSubTask(f, s) {
            if (!checklistFolders[f] || !checklistFolders[f].subfolders || !checklistFolders[f].subfolders[s]) return;
            _renameFolderType = 'addSubTask';
            _renameTaskFolder = f;
            _renameTaskIdx = s; // reuse for subfolder index
            _renameTaskDaily = true;
            const input = document.getElementById('renameFolderInput');
            const title = document.getElementById('renameFolderTitle');
            const confirmBtn = document.getElementById('renameFolderConfirmBtn');
            if (title) title.textContent = t('addTaskBtn');
            if (confirmBtn) confirmBtn.textContent = t('addFolderConfirm');
            if (input) { input.placeholder = t('placeholderTaskName'); input.value = ''; }
            setRenameTaskDailyVisible(true);
            document.getElementById('renameFolderOverlay').classList.add('show');
        }

        // ----- Rename subfolder -----
        function renameSubfolder(f, s) {
            const folder = checklistFolders[f];
            if (!folder || !folder.subfolders || !folder.subfolders[s]) return;
            _renameFolderType = 'subfolder';
            _renameTaskFolder = f;
            _renameTaskIdx = s;
            const input = document.getElementById('renameFolderInput');
            const title = document.getElementById('renameFolderTitle');
            const confirmBtn = document.getElementById('renameFolderConfirmBtn');
            if (title) title.textContent = t('renameSubfolderTitle');
            if (confirmBtn) confirmBtn.textContent = t('btnSaveDua');
            if (input) { input.placeholder = t('placeholderSubfolderName'); input.value = clGetName(folder.subfolders[s]) || ''; }
            setRenameTaskDailyVisible(false);
            document.getElementById('renameFolderOverlay').classList.add('show');
        }

        // ----- Rename task inside a subfolder -----
        function renameSubTask(f, s, ti) {
            const folder = checklistFolders[f];
            if (!folder || !folder.subfolders || !folder.subfolders[s]) return;
            const task = folder.subfolders[s].tasks[ti];
            if (!task) return;
            _renameFolderType = 'subtask';
            _renameSubTaskF = f;
            _renameSubTaskS = s;
            _renameSubTaskT = ti;
            const input = document.getElementById('renameFolderInput');
            const title = document.getElementById('renameFolderTitle');
            const confirmBtn = document.getElementById('renameFolderConfirmBtn');
            if (title) title.textContent = t('renameTaskTitle');
            if (confirmBtn) confirmBtn.textContent = t('btnSaveDua');
            if (input) { input.placeholder = t('placeholderTaskName'); input.value = clGetName(task) || ''; }
            _renameTaskDaily = isChecklistTaskDaily(task);
            setRenameTaskDailyVisible(true);
            document.getElementById('renameFolderOverlay').classList.add('show');
        }

        // ----- Delete subfolder (uses confirm overlay) -----
        let _deleteSubfolderF = null, _deleteSubfolderS = null;
        function deleteSubfolder(f, s) {
            if (!checklistFolders[f] || !checklistFolders[f].subfolders || !checklistFolders[f].subfolders[s]) return;
            _deleteSubfolderF = f;
            _deleteSubfolderS = s;
            const titleEl = document.getElementById('deleteFolderTitle');
            const subEl = document.getElementById('deleteFolderSub');
            if (titleEl) titleEl.textContent = t('deleteSubfolderTitle');
            if (subEl) subEl.textContent = t('deleteSubfolderSub');
            document.getElementById('deleteFolderOverlay').classList.add('show');
            // We piggy-back on confirmDeleteFolder via a flag below
            _deleteFolderIdx = null;
        }

        // ----- Delete task inside a subfolder -----
        let _deleteSubTaskF = null, _deleteSubTaskS = null, _deleteSubTaskT = null;
        function deleteSubTask(f, s, ti) {
            if (!checklistFolders[f] || !checklistFolders[f].subfolders || !checklistFolders[f].subfolders[s]) return;
            if (!checklistFolders[f].subfolders[s].tasks[ti]) return;
            _deleteSubTaskF = f;
            _deleteSubTaskS = s;
            _deleteSubTaskT = ti;
            document.getElementById('deleteTaskOverlay').classList.add('show');
        }

        // Subtask rename state — declared at top-level so confirmRenameFolder
        // can read it without being threaded through the call site.
        let _renameSubTaskF = null, _renameSubTaskS = null, _renameSubTaskT = null;

        function resetChecklist() {
            resetChecklistDailyTasks();
            renderChecklistFolders();
            updateChecklistUI();
            saveChecklist();
        }

        // ===== ADD FOLDER =====
        // current selection: null = new folder, number = folder index
        let _addFolderSelected = null;
        let _folderPlusTaskTarget = null;
        let _fabMode = 'folder'; // 'folder' | 'folderTask'
        let _addTaskDaily = (localStorage.getItem('cl_daily_pref') !== 'false');
        let _addTaskCounter = false;
        let _renameTaskDaily = (localStorage.getItem('cl_daily_pref') !== 'false');
        let _renameAddCounter = false;

        function _setDailyToggle(btn, visible, active) {
            if (!btn) return;
            btn.classList.toggle('show', !!visible);
            btn.classList.toggle('active', !!active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
            btn.title = active ? t('titleDailyTask') : t('titleOneTimeTask');
            btn.setAttribute('aria-label', btn.title);
        }

        function setAddTaskDailyVisible(visible) {
            if (!visible) { _addTaskDaily = (localStorage.getItem('cl_daily_pref') !== 'false'); _addTaskCounter = false; }
            // Тоггл «ежедневная» виден только при добавлении задачи И не в режиме счётчика
            _setDailyToggle(document.getElementById('addTaskDailyToggle'), visible && !_addTaskCounter, _addTaskDaily);
            // Строка выбора типа «счётчик»
            const row = document.getElementById('addTaskCounterRow');
            if (row) row.style.display = visible ? '' : 'none';
            const cbtn = document.getElementById('addTaskCounterToggle');
            if (cbtn) { cbtn.classList.toggle('active', !!_addTaskCounter); cbtn.setAttribute('aria-pressed', _addTaskCounter ? 'true' : 'false'); }
            const lbl = document.getElementById('addTaskCounterLabel');
            if (lbl) lbl.textContent = t('counterTaskToggle');
            const tin = document.getElementById('addTaskCounterTarget');
            if (tin) {
                tin.placeholder = t('counterTargetPlaceholder');
                tin.style.display = (visible && _addTaskCounter) ? '' : 'none';
                if (!_addTaskCounter) tin.value = '';
            }
        }

        function toggleAddTaskDaily(e) {
            if (e) e.stopPropagation();
            _addTaskDaily = !_addTaskDaily;
            localStorage.setItem('cl_daily_pref', _addTaskDaily ? 'true' : 'false');
            setAddTaskDailyVisible(true);
        }

        function toggleAddTaskCounter(e) {
            if (e) e.stopPropagation();
            _addTaskCounter = !_addTaskCounter;
            setAddTaskDailyVisible(true);
        }

        function setRenameTaskDailyVisible(visible) {
            if (!visible) _renameTaskDaily = (localStorage.getItem('cl_daily_pref') !== 'false');
            _setDailyToggle(document.getElementById('renameTaskDailyToggle'), visible, _renameTaskDaily);
            _setRenameCounterRow();
        }

        // Counter ("задача-счётчик", напр. када-намазы) option in the shared
        // rename modal. Shown ONLY when adding a NEW top-level folder task
        // (_renameFolderType === 'addFolderTask') — top-level cards render the
        // counter UI; subfolders do not, so it's not offered there.
        function _setRenameCounterRow() {
            const showOption = (_renameFolderType === 'addFolderTask');
            if (!showOption) _renameAddCounter = false;
            const row = document.getElementById('renameTaskCounterRow');
            if (row) row.style.display = showOption ? '' : 'none';
            const cbtn = document.getElementById('renameTaskCounterToggle');
            if (cbtn) { cbtn.classList.toggle('active', !!_renameAddCounter); cbtn.setAttribute('aria-pressed', _renameAddCounter ? 'true' : 'false'); }
            const lbl = document.getElementById('renameTaskCounterLabel');
            if (lbl) lbl.textContent = t('counterTaskToggle');
            const tin = document.getElementById('renameTaskCounterTarget');
            if (tin) {
                tin.placeholder = t('counterTargetPlaceholder');
                tin.style.display = (showOption && _renameAddCounter) ? '' : 'none';
                if (!_renameAddCounter) tin.value = '';
            }
            // counters are one-time → hide the daily toggle while counter mode is on
            if (showOption && _renameAddCounter) {
                _setDailyToggle(document.getElementById('renameTaskDailyToggle'), false, _renameTaskDaily);
            }
        }

        function toggleRenameAddCounter(e) {
            if (e) e.stopPropagation();
            _renameAddCounter = !_renameAddCounter;
            _setRenameCounterRow();
        }

        function toggleRenameTaskDaily(e) {
            if (e) e.stopPropagation();
            _renameTaskDaily = !_renameTaskDaily;
            localStorage.setItem('cl_daily_pref', _renameTaskDaily ? 'true' : 'false');
            setRenameTaskDailyVisible(true);
        }

        function openAddFolderModal(mode) {
            _fabMode = mode || 'folder';
            const input = document.getElementById('addFolderInput');
            const wrap = document.getElementById('addFolderSelectWrap');
            const title = document.getElementById('addFolderModalTitle');
            const confirmBtn = document.getElementById('addFolderConfirmBtn');
            _addFolderSelected = null;
            _addTaskDaily = (localStorage.getItem('cl_daily_pref') !== 'false');
            _addTaskCounter = false;
            if (input) input.value = '';
            if (wrap) wrap.style.display = 'none'; // Never show folder picker from FAB
            const cancelBtn = document.getElementById('addFolderCancelBtn');
            if (cancelBtn) cancelBtn.textContent = t('addFolderCancel');
            if (_fabMode === 'task') {
                if (title) title.textContent = t('addTaskBtn');
                if (input) input.placeholder = t('placeholderTaskName');
                if (confirmBtn) confirmBtn.textContent = t('addFolderConfirm');
                setAddTaskDailyVisible(true);
            } else {
                if (title) title.textContent = t('addFolderTitle');
                if (input) input.placeholder = t('placeholderFolderName');
                if (confirmBtn) confirmBtn.textContent = t('addFolderConfirm');
                setAddTaskDailyVisible(false);
            }
            document.getElementById('addFolderOverlay').classList.add('show');
        }

        function _buildFolderDropdown() {
            const dd = document.getElementById('addFolderDropdown');
            if (!dd) return;
            // "New folder" option first
            const newOpt = document.createElement('div');
            newOpt.className = 'cl-folder-option active';
            newOpt.dataset.idx = '';
            newOpt.innerHTML = `<span class="fo-icon">➕</span><span class="fo-name">${escHtml(t('addFolderTitle'))}</span><svg class="fo-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
            newOpt.onclick = (e) => { e.stopPropagation(); _selectFolderOption(null); };
            dd.innerHTML = '';
            dd.appendChild(newOpt);
            checklistFolders.forEach((folder, i) => {
                const opt = document.createElement('div');
                opt.className = 'cl-folder-option';
                opt.dataset.idx = i;
                opt.innerHTML = `<span class="fo-icon">📁</span><span class="fo-name">${escHtml(clGetName(folder))}</span><svg class="fo-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
                opt.onclick = (e) => { e.stopPropagation(); _selectFolderOption(i); };
                dd.appendChild(opt);
            });
        }

        function _selectFolderOption(idx) {
            _addFolderSelected = idx;
            _updateFolderSelectBtn(idx);
            // Close dropdown
            const btn = document.getElementById('addFolderSelectBtn');
            const dd = document.getElementById('addFolderDropdown');
            if (btn) btn.classList.remove('open');
            if (dd) dd.classList.remove('open');
            // Update active states
            document.querySelectorAll('#addFolderDropdown .cl-folder-option').forEach(opt => {
                const optIdx = opt.dataset.idx === '' ? null : parseInt(opt.dataset.idx);
                opt.classList.toggle('active', optIdx === idx);
            });
            // Update modal
            const title = document.getElementById('addFolderModalTitle');
            const input = document.getElementById('addFolderInput');
            const confirmBtn = document.getElementById('addFolderConfirmBtn');
            if (idx === null) {
                if (title) title.textContent = t('addFolderTitle');
                if (input) { input.placeholder = t('placeholderFolderName'); }
                if (confirmBtn) confirmBtn.textContent = t('addFolderConfirm');
                setAddTaskDailyVisible(false);
            } else {
                if (title) title.textContent = clGetName(checklistFolders[idx]);
                if (input) { input.placeholder = t('placeholderTaskName'); }
                if (confirmBtn) confirmBtn.textContent = t('addFolderConfirm');
                setAddTaskDailyVisible(true);
            }
        }

        function _updateFolderSelectBtn(idx) {
            const iconEl = document.getElementById('addFolderSelectIcon');
            const textEl = document.getElementById('addFolderSelectText');
            if (idx === null) {
                if (iconEl) iconEl.textContent = '➕';
                if (textEl) textEl.textContent = t('addFolderTitle');
            } else {
                if (iconEl) iconEl.textContent = '📁';
                if (textEl) textEl.textContent = clGetName(checklistFolders[idx]);
            }
        }

        function toggleFolderDropdown(e) {
            e.stopPropagation();
            const btn = document.getElementById('addFolderSelectBtn');
            const dd = document.getElementById('addFolderDropdown');
            if (!btn || !dd) return;
            const isOpen = dd.classList.contains('open');
            btn.classList.toggle('open', !isOpen);
            dd.classList.toggle('open', !isOpen);
        }

        function closeAddFolderModal() {
            document.getElementById('addFolderOverlay').classList.remove('show');
            const btn = document.getElementById('addFolderSelectBtn');
            const dd = document.getElementById('addFolderDropdown');
            if (btn) btn.classList.remove('open');
            if (dd) dd.classList.remove('open');
            setAddTaskDailyVisible(false);
            _folderPlusTaskTarget = null;
            _fabMode = 'folder';
        }

        function confirmAddFolder() {
            const input = document.getElementById('addFolderInput');
            const name = input ? input.value.trim() : '';
            if (!name) { if (input) input.focus(); return; }
            if (_fabMode === 'folderTask' && _folderPlusTaskTarget !== null && checklistFolders[_folderPlusTaskTarget]) {
                // Add task to the folder selected via folder plus menu
                const folderIdx = _folderPlusTaskTarget;
                if (_addTaskCounter) {
                    const tin = document.getElementById('addTaskCounterTarget');
                    const target = parseInt(tin ? tin.value : '', 10);
                    if (!target || target < 1) { if (tin) tin.focus(); return; }
                    checklistFolders[folderIdx].tasks.push({ name, type: 'counter', target: target, remaining: target, done: false, daily: false });
                } else {
                    checklistFolders[folderIdx].tasks.push({ name, done: false, daily: _addTaskDaily });
                }
                _folderPlusTaskTarget = null;
                saveChecklist();
                renderChecklistFolders();
                updateChecklistUI();
                closeAddFolderModal();
                setTimeout(() => openFolderEl(folderIdx), 50);
            } else {
                // Create new folder (создаётся закрытой — без авто-раскрытия)
                checklistFolders.push({ name, tasks: [], subfolders: [] });
                saveChecklist();
                renderChecklistFolders();
                updateChecklistUI();
                closeAddFolderModal();
            }
        }

        let _deleteFolderIdx = null;
        function deleteFolder(idx) {
            if (!checklistFolders[idx]) return;
            _deleteFolderIdx = idx;
            // clear subfolder-delete flag in case we're toggling between modes
            _deleteSubfolderF = null; _deleteSubfolderS = null;
            const titleEl = document.getElementById('deleteFolderTitle');
            const subEl = document.getElementById('deleteFolderSub');
            if (titleEl) titleEl.textContent = t('deleteFolderTitle');
            if (subEl) subEl.textContent = t('deleteFolderSub');
            document.getElementById('deleteFolderOverlay').classList.add('show');
        }
        function confirmDeleteFolder() {
            // Subfolder delete piggy-backs on the same overlay
            if (_deleteSubfolderF !== null && _deleteSubfolderS !== null
                && checklistFolders[_deleteSubfolderF]
                && checklistFolders[_deleteSubfolderF].subfolders) {
                const fi = _deleteSubfolderF, si = _deleteSubfolderS;
                checklistFolders[fi].subfolders.splice(si, 1);
                _deleteSubfolderF = null; _deleteSubfolderS = null;
                saveChecklist();
                renderChecklistFolders();
                updateChecklistUI();
                setTimeout(() => openFolderEl(fi), 50);
                document.getElementById('deleteFolderOverlay').classList.remove('show');
                return;
            }
            if (_deleteFolderIdx === null) return;
            checklistFolders.splice(_deleteFolderIdx, 1);
            _deleteFolderIdx = null;
            saveChecklist();
            renderChecklistFolders();
            updateChecklistUI();
            document.getElementById('deleteFolderOverlay').classList.remove('show');
        }
        function cancelDeleteFolder() {
            _deleteFolderIdx = null;
            _deleteSubfolderF = null;
            _deleteSubfolderS = null;
            document.getElementById('deleteFolderOverlay').classList.remove('show');
        }

        let _deleteTaskFolder = null, _deleteTaskIdx = null;
        function deleteTask(folderIdx, taskIdx) {
            if (!checklistFolders[folderIdx] || !checklistFolders[folderIdx].tasks[taskIdx]) return;
            _deleteTaskFolder = folderIdx;
            _deleteTaskIdx = taskIdx;
            // clear subtask flag
            _deleteSubTaskF = null; _deleteSubTaskS = null; _deleteSubTaskT = null;
            // localize the overlay text
            const titleEl = document.querySelector('#deleteTaskOverlay .overlay-title');
            const subEl = document.querySelector('#deleteTaskOverlay .overlay-sub');
            if (titleEl) titleEl.textContent = t('deleteTaskTitle');
            if (subEl) subEl.textContent = t('deleteTaskSub');
            document.getElementById('deleteTaskOverlay').classList.add('show');
        }
        function confirmDeleteTask() {
            // Subtask delete piggy-backs on the same overlay
            if (_deleteSubTaskF !== null && _deleteSubTaskS !== null && _deleteSubTaskT !== null
                && checklistFolders[_deleteSubTaskF]
                && checklistFolders[_deleteSubTaskF].subfolders
                && checklistFolders[_deleteSubTaskF].subfolders[_deleteSubTaskS]) {
                const fi = _deleteSubTaskF, si = _deleteSubTaskS, ti = _deleteSubTaskT;
                checklistFolders[fi].subfolders[si].tasks.splice(ti, 1);
                _deleteSubTaskF = null; _deleteSubTaskS = null; _deleteSubTaskT = null;
                saveChecklist();
                renderChecklistFolders();
                updateChecklistUI();
                setTimeout(() => {
                    openFolderEl(fi);
                    const sfEl = document.getElementById('clSubfolder' + fi + '-' + si);
                    if (sfEl) sfEl.classList.add('acc-open');
                }, 50);
                document.getElementById('deleteTaskOverlay').classList.remove('show');
                showToast(t('toastTaskDeleted'));
                return;
            }
            if (_deleteTaskFolder === null || _deleteTaskIdx === null) return;
            const folder = checklistFolders[_deleteTaskFolder];
            if (folder) {
                folder.tasks.splice(_deleteTaskIdx, 1);
                saveChecklist();
                renderChecklistFolders();
                updateChecklistUI();
                setTimeout(() => openFolderEl(_deleteTaskFolder), 50);
            }
            _deleteTaskFolder = null;
            _deleteTaskIdx = null;
            document.getElementById('deleteTaskOverlay').classList.remove('show');
            showToast(t('toastTaskDeleted'));
        }
        function cancelDeleteTask() {
            _deleteTaskFolder = null;
            _deleteTaskIdx = null;
            _deleteSubTaskF = null;
            _deleteSubTaskS = null;
            _deleteSubTaskT = null;
            document.getElementById('deleteTaskOverlay').classList.remove('show');
        }

        loadData();
        ensureNames99DuaFolder();
        loadChecklist();
        initDuaFolderOutsideClose();
        initChecklistFolderOutsideClose();
        initDOMCache();
        initDraggable();
        updateDisplay();
        initManualAddHint();
        // Разделы теперь рендерятся лениво — только при первом переходе в них.
        // renderDuas / renderFavorites / renderStats / renderSpecialList
        // вызываются через switchTab() по мере необходимости.
        updateSettingsUI();
        scheduleFirebaseStartup();

        // ===== PRAYER TIMES MODULE =====
        // Calculates the 5 daily prayer times + sunrise from user's
        // geolocation. Drives:
        //   - Header clock (next prayer time + countdown)
        //   - Prayer modal (full schedule)
        //   - Special dhikrs daily reset (anchored on Fajr — Islamic day)
        // Algorithm: standard astronomical formulas (sun declination,
        // equation of time). Defaults: ISNA-style angles (Fajr 18°, Isha 17°,
        // Asr Shafi factor=1).
        (function initPrayerClock() {
            const R = Math.PI / 180;

            // -------- Astronomy --------
            function jd(date) {
                let y = date.getFullYear(), m = date.getMonth() + 1;
                const d = date.getDate() + (date.getHours() + date.getMinutes()/60 + date.getSeconds()/3600) / 24;
                if (m <= 2) { y -= 1; m += 12; }
                const A = Math.floor(y / 100);
                const B = 2 - A + Math.floor(A / 4);
                return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
            }
            function solar(J) {
                const D = J - 2451545.0;
                const g = ((357.529 + 0.98560028 * D) % 360 + 360) % 360;
                const gR = g * R;
                const q = ((280.459 + 0.98564736 * D) % 360 + 360) % 360;
                const L = (q + 1.915 * Math.sin(gR) + 0.020 * Math.sin(2 * gR)) % 360;
                const lam = L * R;
                const eps = (23.439 - 3.6e-7 * D) * R;
                const dec = Math.asin(Math.sin(eps) * Math.sin(lam)) / R;
                const RA  = (Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) / R + 360) % 360;
                // Equation of time in hours
                let EqT = (q - RA) / 15;
                // Normalize to [-0.5, 0.5] day range
                while (EqT > 12) EqT -= 24;
                while (EqT < -12) EqT += 24;
                return { dec, EqT };
            }
            function ha(lat, dec, ang) {
                const c = (Math.sin(-ang * R) - Math.sin(lat * R) * Math.sin(dec * R)) /
                          (Math.cos(lat * R) * Math.cos(dec * R));
                if (Math.abs(c) > 1) return null;
                return Math.acos(c) / R / 15;
            }

            // Hanafi Asr — shadow length factor = 2 (twice the object).
            // Standard (Shafi'i) Asr — shadow length factor = 1.
            function haAsr(lat, dec, factor) {
                const altRad = Math.atan(1 / (factor + Math.tan(Math.abs(lat - dec) * R)));
                const altDeg = altRad / R;
                const c = (Math.sin(altDeg * R) - Math.sin(lat * R) * Math.sin(dec * R)) /
                          (Math.cos(lat * R) * Math.cos(dec * R));
                if (Math.abs(c) > 1) return null;
                return Math.acos(c) / R / 15;
            }

            // ===== WORLDWIDE PRAYER TIME CALCULATION METHODS =====
            const PRAYER_METHODS = {
                mwl:      { name: 'Muslim World League',           fajrAngle: 18, ishaAngle: 17, asrFactor: 1 },
                isna:     { name: 'ISNA (North America)',          fajrAngle: 15, ishaAngle: 15, asrFactor: 1 },
                egypt:    { name: 'Egyptian General Authority',    fajrAngle: 19.5, ishaAngle: 17.5, asrFactor: 1 },
                makkah:   { name: 'Umm al-Qura (Makkah)',         fajrAngle: 18.5, ishaAngle: 0, ishaMinutes: 90, asrFactor: 1 },
                karachi:  { name: 'University of Islamic Sciences, Karachi', fajrAngle: 18, ishaAngle: 18, asrFactor: 2 },
                tehran:   { name: 'Institute of Geophysics, Tehran', fajrAngle: 17.7, ishaAngle: 14, asrFactor: 1 },
                jafari:   { name: 'Shia Ithna-Ashari (Jafari)',    fajrAngle: 16, ishaAngle: 14, asrFactor: 1 },
                turkey:   { name: 'Diyanet (Turkey)',              fajrAngle: 18, ishaAngle: 17, asrFactor: 1 },
                russia:   { name: 'Spiritual Board of Muslims (Russia)', fajrAngle: 18, ishaAngle: 18, asrFactor: 2 },
                singapore:{ name: 'MUIS (Singapore)',              fajrAngle: 20, ishaAngle: 18, asrFactor: 1 },
                france:   { name: 'UOIF (France)',                 fajrAngle: 12, ishaAngle: 12, asrFactor: 1 },
                gulf:     { name: 'Gulf Region',                   fajrAngle: 19.5, ishaAngle: 0, ishaMinutes: 90, asrFactor: 1 },
                kuwait:   { name: 'Kuwait',                        fajrAngle: 18, ishaAngle: 17.5, asrFactor: 1 },
                qatar:    { name: 'Qatar',                         fajrAngle: 18, ishaAngle: 0, ishaMinutes: 90, asrFactor: 1 },
                jordan:   { name: 'Ministry of Awqaf (Jordan)',    fajrAngle: 18, ishaAngle: 18, asrFactor: 1 },
                tunisia:  { name: 'Ministry of Religious Affairs (Tunisia)', fajrAngle: 18, ishaAngle: 18, asrFactor: 1 },
                algeria:  { name: 'Ministry of Religious Affairs (Algeria)', fajrAngle: 18, ishaAngle: 17, asrFactor: 1 },
                morocco:  { name: 'Ministry of Habous (Morocco)',  fajrAngle: 19, ishaAngle: 17, asrFactor: 1 },
                malaysia: { name: 'JAKIM (Malaysia)',              fajrAngle: 20, ishaAngle: 18, asrFactor: 1 },
                indonesia:{ name: 'Kemenag (Indonesia)',           fajrAngle: 20, ishaAngle: 18, asrFactor: 1 },
            };

            // Localized strings for the calculation-method picker + settings row.
            const METHOD_I18N = UI_I18N.prayerMethods || {};

            // Load saved method + auto/manual flag. In "Auto" mode the method is
            // derived from the user's GPS coordinates (see methodForCoords); the
            // user can override it manually in the picker.
            let _currentMethod = 'mwl';
            let _methodAuto = true;
            try {
                const saved = localStorage.getItem('azkar_prayer_method');
                if (saved && PRAYER_METHODS[saved]) _currentMethod = saved;
                if (localStorage.getItem('azkar_prayer_method_auto') === 'false') _methodAuto = false;
            } catch(e) {}

            function _getParams() {
                const m = PRAYER_METHODS[_currentMethod] || PRAYER_METHODS.karachi;
                return {
                    fajrAngle: m.fajrAngle,
                    ishaAngle: m.ishaAngle || 0,
                    ishaMinutes: m.ishaMinutes || 0,
                    asrFactor: m.asrFactor || 1,
                    fajrAdj:    -2 / 60,
                    sunriseAdj: 0,
                    dhuhrAdj:   1 / 60,
                    asrAdj:     0,
                    maghribAdj: 3 / 60,
                    ishaAdj:    0,
                };
            }

            // Returns array of {key, t} (decimal hours, local time)
            function prayers(lat, lng, date) {
                const tz = -date.getTimezoneOffset() / 60;
                const noonDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
                const { dec, EqT } = solar(jd(noonDate));
                const noon = 12 + tz - lng / 15 - EqT;
                const P = _getParams();
                const hFajr = ha(lat, dec, P.fajrAngle),
                      hMag  = ha(lat, dec, 0.833),
                      hSun  = ha(lat, dec, 0.833),
                      hAsr_  = haAsr(lat, dec, P.asrFactor);
                // Isha: angle-based or fixed minutes after Maghrib
                let ishaT = null;
                if (P.ishaAngle > 0) {
                    const hIsha = ha(lat, dec, P.ishaAngle);
                    ishaT = hIsha !== null ? noon + hIsha + P.ishaAdj : null;
                } else if (P.ishaMinutes > 0) {
                    const magT = hMag !== null ? noon + hMag + P.maghribAdj : null;
                    ishaT = magT !== null ? magT + P.ishaMinutes / 60 : null;
                }
                return [
                    { key: 'fajr',    t: hFajr !== null ? noon - hFajr + P.fajrAdj    : null },
                    { key: 'sunrise', t: hSun  !== null ? noon - hSun  + P.sunriseAdj : null },
                    { key: 'dhuhr',   t: noon + P.dhuhrAdj },
                    { key: 'asr',     t: hAsr_ !== null ? noon + hAsr_ + P.asrAdj     : null },
                    { key: 'maghrib', t: hMag  !== null ? noon + hMag  + P.maghribAdj : null },
                    { key: 'isha',    t: ishaT },
                ];
            }

            // -------- Localized prayer names --------
            const PRAYER_I18N = UI_I18N.prayers || {};

            function L() {
                const lang = (typeof currentLang !== 'undefined' ? currentLang : 'en');
                return PRAYER_I18N[lang] || PRAYER_I18N.en || PRAYER_I18N.ru;
            }

            // ===== CALCULATION METHOD AUTO-DETECTION BY GPS =====
            // Picks the most appropriate calculation method for the given
            // coordinates (rough country/region boxes). Used in "Auto" mode so
            // the schedule matches the local convention out of the box.
            function methodForCoords(lat, lng) {
                if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) return 'mwl';
                const box = (la1, la2, lo1, lo2) => lat >= la1 && lat <= la2 && lng >= lo1 && lng <= lo2;
                if (box(22, 32, 24.5, 37)) return 'egypt';           // Egypt
                if (box(35.5, 42.5, 25, 45)) return 'turkey';        // Turkey
                if (box(24, 40, 44, 64)) return 'tehran';            // Iran
                if (box(29, 33.6, 34.7, 39.5)) return 'jordan';      // Jordan
                if (box(28.4, 30.2, 46, 49)) return 'kuwait';        // Kuwait
                if (box(24.4, 26.4, 50.6, 51.7)) return 'qatar';     // Qatar
                if (box(22, 26.6, 51, 60)) return 'gulf';            // UAE / Oman
                if (box(16, 32.5, 34, 56)) return 'makkah';          // Saudi Arabia & peninsula
                if (box(35, 48, 52, 80)) return 'karachi';           // Central Asia (Uzbekistan etc.)
                if (box(5, 39, 60, 93)) return 'karachi';            // Pakistan / India / Bangladesh / Afghanistan
                if (box(1.0, 1.6, 103.4, 104.2)) return 'singapore'; // Singapore
                if (box(0.5, 7.5, 99.5, 120)) return 'malaysia';     // Malaysia / Brunei
                if (box(-11, 6.5, 95, 141.5)) return 'indonesia';    // Indonesia
                if (box(27.5, 36, -13, -1)) return 'morocco';        // Morocco
                if (box(30, 37.5, 7, 12)) return 'tunisia';          // Tunisia
                if (box(18, 37.5, -9, 12)) return 'algeria';         // Algeria
                if (box(15, 72, -170, -50)) return 'isna';           // North America
                if (box(41, 52, -5.5, 8.5)) return 'france';         // France
                if (box(34, 72, -12, 45)) return 'mwl';              // Europe
                if (box(41, 78, 30, 180)) return 'russia';           // Russia & North Asia
                return 'mwl';
            }

            // Localized strings for the method picker / settings entry.
            function ML() {
                const lang = (typeof currentLang !== 'undefined' ? currentLang : 'en');
                return METHOD_I18N[lang] || METHOD_I18N.en || METHOD_I18N.ru;
            }

            // The tappable row shown at the bottom of the prayer modal. Opens the
            // centered method picker (replaces the old "choose city" control).
            function renderMethodTrigger() {
                const ml = ML();
                const m = PRAYER_METHODS[_currentMethod] || PRAYER_METHODS.mwl;
                const value = m.name + (_methodAuto ? ' • ' + ml.auto : '');
                return '' +
                    '<div class="prayer-method-trigger" onclick="openMethodModal()">' +
                        '<div class="pmt-left">' +
                            '<svg class="pmt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>' +
                            '<div class="pmt-text">' +
                                '<div class="pmt-label">' + ml.triggerLabel + '</div>' +
                                '<div class="pmt-value">' + value + '</div>' +
                            '</div>' +
                        '</div>' +
                        '<svg class="pmt-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>' +
                    '</div>';
            }

            // -------- Format helpers --------
            function fmtT(h) {
                if (h === null) return '--:--';
                h = ((h % 24) + 24) % 24;
                const totalMinutes = Math.round(h * 60);
                const hh = Math.floor(totalMinutes / 60) % 24;
                const mm = totalMinutes % 60;
                return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
            }
            function fmtCD(s) {
                s = Math.max(0, s);
                const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
                return '— ' + String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(ss).padStart(2,'0');
            }
            // Used for the in-row countdown inside the prayer modal. Now uses
            // the same leading dash as the header countdown (fmtCD) so both
            // screens look consistent ("— HH:MM:SS").
            function fmtCD2(s) {
                s = Math.max(0, s);
                const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
                return '— ' + String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(ss).padStart(2,'0');
            }

            // -------- State --------
            let uLat = null, uLng = null, _cached = null, _cacheKey = '';
            let _modalRefreshInt = null;

            // Hydrate from localStorage on startup so prayer times work even
            // before geolocation responds (or if user later denies).
            try {
                const saved = JSON.parse(localStorage.getItem('azkar_geoloc') || 'null');
                if (saved && typeof saved.lat === 'number' && typeof saved.lng === 'number') {
                    uLat = saved.lat; uLng = saved.lng;
                }
            } catch(e) {}
            // In Auto mode, derive the calculation method from the hydrated
            // coordinates so the schedule is correct before GPS even responds.
            if (_methodAuto && uLat !== null) {
                _currentMethod = methodForCoords(uLat, uLng);
            }

            function todayPrayers() {
                if (uLat === null) return null;
                const now = new Date(), key = now.toDateString();
                if (key !== _cacheKey || !_cached) { _cached = prayers(uLat, uLng, now); _cacheKey = key; }
                return _cached;
            }

            // Returns the next prayer (or tomorrow's Fajr if all today have passed).
            // Sunrise is treated like any other entry (it gets a countdown too).
            function nextPrayer() {
                if (uLat === null) return null;
                const now = new Date();
                const nowH = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
                for (const p of todayPrayers()) {
                    if (p.t !== null && p.t > nowH)
                        return { p, secs: Math.round((p.t - nowH) * 3600), tomorrow: false };
                }
                // Tomorrow's Fajr
                const tmr = new Date(now); tmr.setDate(tmr.getDate() + 1);
                const tmrPrayers = prayers(uLat, uLng, tmr);
                const fajr = tmrPrayers[0];
                const tillMidnight = (24 - nowH) * 3600;
                const fromMidnight = fajr.t !== null ? fajr.t * 3600 : 0;
                return { p: fajr, secs: Math.round(tillMidnight + fromMidnight), tomorrow: true };
            }

            // -------- Header clock tick --------
            // Bulletproof tick: uses Date.now() and recomputes prayer times
            // when the day changes. The countdown decrements every second.
            function tick() {
                const widgets = document.querySelectorAll('.js-prayer-clock');
                if (!widgets.length) return;
                const l = L();
                const setWidgets = (label, time, countdown) => {
                    widgets.forEach(widget => {
                        const labelEl = widget.querySelector('.js-prayer-name');
                        const clockEl = widget.querySelector('.js-prayer-time');
                        const cdEl = widget.querySelector('.js-prayer-countdown');
                        if (labelEl) labelEl.textContent = label;
                        if (clockEl) clockEl.textContent = time;
                        if (cdEl) cdEl.textContent = countdown;
                    });
                };
                if (uLat === null) {
                    setWidgets('—', '--:--', '— --:--:--');
                    return;
                }
                const np = nextPrayer();
                if (!np) return;
                // Just the prayer name — no "Tomorrow" prefix even when
                // showing tomorrow's Fajr (cleaner, matches premium apps).
                setWidgets((l[np.p.key] || np.p.key), fmtT(np.p.t), fmtCD(np.secs));
            }

            // -------- Modal rendering --------
            function renderModal() {
                const body = document.getElementById('prayerModalBody');
                const title = document.getElementById('prayerModalTitle');
                const sub   = document.getElementById('prayerModalSubtitle');
                if (!body) return;
                const l = L();
                if (title) title.textContent = l.title;

                if (uLat === null) {
                    if (sub) sub.textContent = '';
                    body.innerHTML =
                        '<div class="prayer-empty-state">' +
                            '<div class="prayer-empty-icon">' +
                                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
                                    '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>' +
                                    '<circle cx="12" cy="10" r="3"/>' +
                                '</svg>' +
                            '</div>' +
                            '<div class="prayer-empty-text">' + l.enableTitle + '</div>' +
                            '<div class="prayer-empty-sub">' + l.enableText + '</div>' +
                            '<button class="prayer-allow-btn" onclick="grantGeoPerm()">' + l.enableBtn + '</button>' +
                        '</div>' +
                        renderMethodTrigger();
                    return;
                }

                const now = new Date();
                const nowH = now.getHours() + now.getMinutes()/60 + now.getSeconds()/3600;
                const list = todayPrayers();
                if (!list) return;

                // Find next upcoming prayer index (sunrise included)
                let nextIdx = -1;
                for (let i = 0; i < list.length; i++) {
                    if (list[i].t !== null && list[i].t > nowH) { nextIdx = i; break; }
                }
                // Find CURRENT prayer = last entry whose time has come.
                // While the next prayer hasn't arrived yet, this is the one we select.
                let currentIdx = -1;
                for (let i = 0; i < list.length; i++) {
                    if (list[i].t !== null && list[i].t <= nowH) currentIdx = i;
                }
                // Before today's Fajr nothing has passed yet — we're still inside
                // last night's Isha, so select the last prayer (Isha) as current.
                if (currentIdx === -1) {
                    for (let i = list.length - 1; i >= 0; i--) {
                        if (list[i].t !== null) { currentIdx = i; break; }
                    }
                }
                // Seconds until the next prayer (handles tomorrow's Fajr).
                const npInfo = nextPrayer();
                const cdSecs = npInfo ? npInfo.secs : 0;
                // Row that shows the countdown = the NEXT prayer. If every prayer
                // today has passed, the next is tomorrow's Fajr → put it on Fajr.
                let cdIdx = nextIdx;
                if (cdIdx === -1) {
                    cdIdx = 0;
                }

                // Localized weekday + date for subtitle
                const lang = (typeof currentLang !== 'undefined' ? currentLang : 'en');
                const dateStr = now.toLocaleDateString(lang === 'uz' ? 'uz-UZ' : (lang === 'zh' ? 'zh-CN' : lang),
                    { weekday: 'long', day: 'numeric', month: 'long' });
                if (sub) sub.textContent = l.today + ' • ' + dateStr;

                // Icons per prayer (compact inline SVG)
                const ICONS = {
                    fajr:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="14" r="3"/><line x1="12" y1="3" x2="12" y2="6"/><line x1="3" y1="14" x2="6" y2="14"/><line x1="18" y1="14" x2="21" y2="14"/><line x1="5.6" y1="7.6" x2="7.7" y2="9.7"/><line x1="16.3" y1="9.7" x2="18.4" y2="7.6"/><line x1="2" y1="20" x2="22" y2="20"/></svg>',
                    sunrise: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="4.2" y1="10.2" x2="5.6" y2="11.6"/><line x1="18.4" y1="11.6" x2="19.8" y2="10.2"/><line x1="2" y1="18" x2="22" y2="18"/><polyline points="9 6 12 3 15 6"/></svg>',
                    dhuhr:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/></svg>',
                    asr:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="3" x2="12" y2="6"/><line x1="3" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="21" y2="12"/><line x1="6" y1="6" x2="8" y2="8"/><line x1="16" y1="8" x2="18" y2="6"/></svg>',
                    maghrib: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="9" x2="12" y2="2"/><line x1="2" y1="18" x2="22" y2="18"/><polyline points="9 6 12 9 15 6"/></svg>',
                    isha:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
                };

                let html = '<div class="prayer-list">';
                for (let i = 0; i < list.length; i++) {
                    const p = list[i];
                    // Sunrise now behaves like any other prayer: it can be the
                    // current (gold) row and can show a countdown when it's next.
                    const isCurrent = (i === currentIdx);
                    const isPassed = !isCurrent && (p.t !== null && p.t <= nowH);
                    const isUpcoming = !isCurrent && (p.t !== null && p.t > nowH);
                    // `.next` keeps the bright gold "selected" styling — now applied
                    // to the CURRENT prayer instead of the upcoming one.
                    let cls = 'prayer-row';
                    if (isCurrent) cls += ' next';
                    else if (isPassed) cls += ' passed';
                    else if (isUpcoming) cls += ' upcoming';
                    let timeRight;
                    if (i === cdIdx) {
                        // The NEXT prayer shows its time + a slightly smaller
                        // countdown beneath it (e.g. Maghrib 19:51 / 01:01:10).
                        timeRight = '<div class="prayer-row-time-wrap">' +
                                        '<div class="prayer-row-time">' + fmtT(p.t) + '</div>' +
                                        '<div class="prayer-row-time countdown">' + fmtCD2(cdSecs) + '</div>' +
                                    '</div>';
                    } else {
                        timeRight = '<div class="prayer-row-time">' + fmtT(p.t) + '</div>';
                    }
                    // Cleaner look — no "passed" / status tags under names.
                    // The visual highlight (gold on current, dim on passed,
                    // medium on upcoming) already conveys status.
                    html +=
                        '<div class="' + cls + '" data-idx="' + i + '">' +
                            '<div class="prayer-row-left">' +
                                '<div class="prayer-row-icon">' + (ICONS[p.key] || '') + '</div>' +
                                '<div class="prayer-row-info">' +
                                    '<div class="prayer-row-name">' + (l[p.key] || p.key) + '</div>' +
                                '</div>' +
                            '</div>' +
                            timeRight +
                        '</div>';
                }
                html += '</div>';
                // location footer
                html +=
                    '<div class="prayer-loc-foot">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
                            '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>' +
                            '<circle cx="12" cy="10" r="3"/>' +
                        '</svg>' +
                        '<span>' + uLat.toFixed(2) + '°, ' + uLng.toFixed(2) + '°</span>' +
                    '</div>';

                // calculation-method picker (opens the centered method modal)
                html += renderMethodTrigger();

                body.innerHTML = html;
            }

            // Lightweight 1-second update for the countdown — patches
            // only the countdown text node, no DOM thrash. When the
            // countdown hits 0 we do a full re-render so the row that
            // was "next" becomes "passed" and the next one lights up.
            function _updateModalCountdown() {
                const overlay = document.getElementById('prayerModalOverlay');
                if (!overlay || !overlay.classList.contains('show')) return;
                const list = todayPrayers();
                if (!list) return;
                const now = new Date();
                const nowH = now.getHours() + now.getMinutes()/60 + now.getSeconds()/3600;
                // Recompute the current (selected) prayer index (sunrise included)
                let currentIdx = -1;
                for (let i = 0; i < list.length; i++) {
                    if (list[i].t !== null && list[i].t <= nowH) currentIdx = i;
                }
                if (currentIdx === -1) {
                    for (let i = list.length - 1; i >= 0; i--) {
                        if (list[i].t !== null) { currentIdx = i; break; }
                    }
                }
                // If the selected row no longer matches the current prayer
                // (a prayer time just arrived) — do a full re-render.
                const selRow = overlay.querySelector('.prayer-row.next');
                if (!selRow || parseInt(selRow.dataset.idx) !== currentIdx) { renderModal(); return; }
                const cdEl = overlay.querySelector('.prayer-row-time.countdown');
                if (!cdEl) { renderModal(); return; }
                const np = nextPrayer();
                if (!np || np.secs <= 0) { renderModal(); return; }
                cdEl.textContent = fmtCD2(np.secs);
            }

            function setLocation(lat, lng) {
                uLat = lat; uLng = lng; _cached = null; _cacheKey = '';
                try { localStorage.setItem('azkar_geoloc', JSON.stringify({ lat, lng, ts: Date.now() })); } catch(e) {}
                // Auto mode: keep the calculation method matched to the location.
                if (_methodAuto) {
                    _currentMethod = methodForCoords(lat, lng);
                    try { localStorage.setItem('azkar_prayer_method', _currentMethod); } catch(e) {}
                    if (typeof refreshMethodLabels === 'function') refreshMethodLabels();
                }
                tick();
                if (typeof scheduleNotifEvents === 'function') { try { scheduleNotifEvents(); } catch(e) {} }
                if (document.getElementById('prayerModalOverlay')?.classList.contains('show')) renderModal();
                // Re-render special dhikrs — their "completed today" status uses
                // the Islamic-day key which depends on Fajr time. Now that we
                // know the precise Fajr, the rendering may need to refresh.
                if (typeof renderSpecialList === 'function') {
                    try { renderSpecialList(); } catch(e) {}
                }
            }

            // Triggered from "Allow" button — actually requests browser permission
            function requestGeo(onResult) {
                if (!navigator.geolocation) { onResult && onResult(false); return; }
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                // On iOS, enableHighAccuracy can sometimes hang or fail in
                // certain network/GPS conditions. We try high accuracy first,
                // and if it fails, retry with low accuracy as a fallback.
                navigator.geolocation.getCurrentPosition(
                    pos => { setLocation(pos.coords.latitude, pos.coords.longitude); onResult && onResult(true); },
                    (err) => {
                        if (isIOS && err.code !== 1) {
                            // PERMISSION_DENIED = 1 → don't retry. Otherwise try low-accuracy.
                            navigator.geolocation.getCurrentPosition(
                                pos => { setLocation(pos.coords.latitude, pos.coords.longitude); onResult && onResult(true); },
                                () => { onResult && onResult(false); },
                                { timeout: 20000, maximumAge: 300000, enableHighAccuracy: false }
                            );
                        } else {
                            onResult && onResult(false);
                        }
                    },
                    { timeout: 15000, maximumAge: 60000, enableHighAccuracy: true }
                );
            }

            // ---- Public API ----
            window.PrayerTimes = {
                getNext: nextPrayer,
                getToday: todayPrayers,
                getLocation: () => uLat === null ? null : { lat: uLat, lng: uLng },
                getForDate: (d) => uLat === null ? null : prayers(uLat, uLng, d || new Date()),
                setLocation: setLocation,
                requestGeo: requestGeo,
                tick: tick,
                renderModal: renderModal,
                getFajrHours: () => {
                    const list = todayPrayers();
                    if (!list) return null;
                    const f = list.find(p => p.key === 'fajr');
                    return f ? f.t : null;
                },
                getIshaHours: () => {
                    const list = todayPrayers();
                    if (!list) return null;
                    const i = list.find(p => p.key === 'isha');
                    return i ? i.t : null;
                },
                L: L,
                applyLang: function() { tick(); refreshMethodLabels(); if (document.getElementById('prayerModalOverlay')?.classList.contains('show')) renderModal(); if (document.getElementById('methodModalOverlay')?.classList.contains('show')) openMethodModal(); }
            };

            // ---- Prayer calculation-method picker (global functions) ----
            function _persistMethod() {
                try {
                    localStorage.setItem('azkar_prayer_method', _currentMethod);
                    localStorage.setItem('azkar_prayer_method_auto', _methodAuto ? 'true' : 'false');
                } catch(e) {}
            }

            // Updates the settings-screen row (label + current value). Called on
            // init and whenever the language or the selected method changes.
            function refreshMethodLabels() {
                const ml = ML();
                const lbl = document.getElementById('labelPrayerMethod');
                if (lbl) lbl.textContent = ml.settingsLabel;
                const val = document.getElementById('settingMethodValue');
                if (val) {
                    const m = PRAYER_METHODS[_currentMethod] || PRAYER_METHODS.mwl;
                    val.textContent = _methodAuto ? ml.auto : m.name;
                }
            }

            function renderMethodOptions() {
                const listEl = document.getElementById('methodModalList');
                if (!listEl) return;
                const check = '<svg class="method-opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
                let html = '';
                Object.keys(PRAYER_METHODS).forEach(key => {
                    const m = PRAYER_METHODS[key];
                    const active = (key === _currentMethod && !_methodAuto);
                    const lp = (typeof L === 'function') ? L() : { fajr: 'Fajr', isha: 'Isha' };
                    const MIN = UI_I18N.prayerMinutes || {};
                    const minLbl = MIN[currentLang] || 'min';
                    const sub = m.ishaMinutes
                        ? (lp.fajr + ' ' + m.fajrAngle + '\u00B0 \u2022 ' + lp.isha + ' +' + m.ishaMinutes + ' ' + minLbl)
                        : (lp.fajr + ' ' + m.fajrAngle + '\u00B0 \u2022 ' + lp.isha + ' ' + m.ishaAngle + '\u00B0');
                    html +=
                        '<div class="method-opt' + (active ? ' active' : '') + '" onclick="selectPrayerMethod(\'' + key + '\')">' +
                            '<div class="method-opt-info">' +
                                '<div class="method-opt-name">' + m.name + '</div>' +
                                '<div class="method-opt-sub">' + sub + '</div>' +
                            '</div>' +
                            (active ? check : '') +
                        '</div>';
                });
                listEl.innerHTML = html;
            }

            // ---- Method modal open/close (centered, dimmed backdrop) ----
            window.openMethodModal = function() {
                const ml = ML();
                const titleEl = document.getElementById('methodModalTitle');
                if (titleEl) titleEl.textContent = ml.modalTitle;
                const geoEl = document.getElementById('methodGeoBtnText');
                if (geoEl) geoEl.textContent = ml.useGeo;
                renderMethodOptions();
                document.getElementById('methodModalOverlay')?.classList.add('show');
            };
            window.closeMethodModal = function() {
                document.getElementById('methodModalOverlay')?.classList.remove('show');
            };

            // Manual pick — turns Auto off and locks in the chosen method.
            window.selectPrayerMethod = function(key) {
                if (!PRAYER_METHODS[key]) return;
                _currentMethod = key;
                _methodAuto = false;
                _cached = null; _cacheKey = '';
                _persistMethod();
                tick();
                refreshMethodLabels();
                if (document.getElementById('prayerModalOverlay')?.classList.contains('show')) renderModal();
                closeMethodModal();
            };

            // "Use my location" — switch back to Auto and (re)request GPS. The
            // method is re-derived from the fresh coordinates in setLocation.
            window.usePrayerGeo = function() {
                _methodAuto = true;
                if (uLat !== null) {
                    _currentMethod = methodForCoords(uLat, uLng);
                    _cached = null; _cacheKey = '';
                    tick();
                }
                _persistMethod();
                refreshMethodLabels();
                closeMethodModal();
                if (document.getElementById('prayerModalOverlay')?.classList.contains('show')) renderModal();
                requestGeo(function() {});
            };

            // Initialise the settings-row label/value on first load.
            refreshMethodLabels();

            // ---- Modal open/close ----
            window.openPrayerModal = function() {
                renderModal();
                document.getElementById('prayerModalOverlay')?.classList.add('show');
                _initPrayerSheetDrag();
                if (_modalRefreshInt) clearInterval(_modalRefreshInt);
                // Fast 1-second countdown updates inside the modal
                _modalRefreshInt = setInterval(_updateModalCountdown, 1000);
            };
            window.closePrayerModal = function() {
                document.getElementById('prayerModalOverlay')?.classList.remove('show');
                if (_modalRefreshInt) { clearInterval(_modalRefreshInt); _modalRefreshInt = null; }
            };

            // ---- Swipe-down-to-close (drag the sheet down to dismiss) ----
            function _initPrayerSheetDrag() {
                const overlay = document.getElementById('prayerModalOverlay');
                if (!overlay) return;
                const sheet = overlay.querySelector('.modal-sheet');
                if (!sheet || sheet._dragInit) return;
                sheet._dragInit = true;
                let startY = 0, startX = 0, dy = 0, dragging = false, decided = false, active = false;

                sheet.addEventListener('touchstart', e => {
                    if (e.touches.length !== 1) return;
                    startY = e.touches[0].clientY;
                    startX = e.touches[0].clientX;
                    dy = 0; dragging = true; decided = false; active = false;
                    sheet.style.transition = 'none';
                }, { passive: true });

                sheet.addEventListener('touchmove', e => {
                    if (!dragging) return;
                    const ddy = e.touches[0].clientY - startY;
                    const ddx = e.touches[0].clientX - startX;
                    if (!decided) {
                        if (Math.abs(ddy) < 6 && Math.abs(ddx) < 6) return;
                        decided = true;
                        // Engage only on a mostly-vertical downward drag AND only
                        // when the sheet is scrolled to the very top — otherwise the
                        // gesture is a normal content scroll (the sheet itself
                        // scrolls now that it can hold taller content).
                        active = (ddy > 0 && Math.abs(ddy) > Math.abs(ddx) && sheet.scrollTop <= 0);
                        if (!active) sheet.style.transition = '';
                    }
                    if (!active) return;
                    dy = Math.max(0, ddy);
                    e.preventDefault();
                    sheet.style.transform = 'translateY(' + dy + 'px) translateZ(0)';
                    const prog = Math.min(1, dy / 320);
                    overlay.style.background = 'rgba(0,0,0,' + (0.72 * (1 - prog * 0.55)).toFixed(3) + ')';
                }, { passive: false });

                function endDrag() {
                    if (!dragging) return;
                    dragging = false;
                    if (!active) { sheet.style.transition = ''; sheet.style.transform = ''; return; }
                    active = false;
                    if (dy > 110) {
                        // Slide fully down, then close
                        sheet.style.transition = 'transform 0.26s cubic-bezier(0.3,0,0.4,1)';
                        sheet.style.transform = 'translateY(100%) translateZ(0)';
                        overlay.style.transition = 'opacity 0.26s ease';
                        overlay.style.opacity = '0';
                        setTimeout(() => {
                            window.closePrayerModal();
                            sheet.style.transition = ''; sheet.style.transform = '';
                            overlay.style.transition = ''; overlay.style.opacity = '';
                            overlay.style.background = '';
                        }, 260);
                    } else {
                        // Snap back
                        sheet.style.transition = 'transform 0.26s cubic-bezier(0.2,0.9,0.4,1)';
                        sheet.style.transform = 'translateY(0) translateZ(0)';
                        overlay.style.background = '';
                        setTimeout(() => { sheet.style.transition = ''; sheet.style.transform = ''; }, 280);
                    }
                }
                sheet.addEventListener('touchend', endDrag);
                sheet.addEventListener('touchcancel', () => {
                    dragging = false; active = false;
                    sheet.style.transition = ''; sheet.style.transform = '';
                    overlay.style.background = '';
                });
            }

            // ---- Auto-fetch geolocation at startup (silent — only if already
            //      granted by browser, won't show prompt if not). Pre-permission
            //      prompt is handled by initGeoPermissionFlow() below.
            //      iOS Safari is skipped here because its permission prompt is
            //      most reliable when getCurrentPosition is called from a real tap.
            if (navigator.geolocation) {
                const _isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                if ('permissions' in navigator && !_isIOS) {
                    // Android / Chrome / Firefox — check permission state first
                    navigator.permissions.query({ name: 'geolocation' }).then(res => {
                        if (res.state === 'granted') {
                            navigator.geolocation.getCurrentPosition(
                                pos => setLocation(pos.coords.latitude, pos.coords.longitude),
                                () => {},
                                { timeout: 15000, maximumAge: 60000, enableHighAccuracy: true }
                            );
                        }
                    }).catch(() => {
                        // permissions API failed — fallback
                        if (uLat !== null) {
                            navigator.geolocation.getCurrentPosition(
                                pos => setLocation(pos.coords.latitude, pos.coords.longitude),
                                () => {},
                                { timeout: 15000, maximumAge: 60000, enableHighAccuracy: true }
                            );
                        }
                    });
                } else if (!_isIOS) {
                    // Fallback for browsers without the Permissions API.
                    // iOS Safari should not request geolocation on page load:
                    // the permission prompt is most reliable from a real tap.
                    navigator.geolocation.getCurrentPosition(
                        pos => setLocation(pos.coords.latitude, pos.coords.longitude),
                        () => {},
                        { timeout: 15000, maximumAge: 60000, enableHighAccuracy: true }
                    );
                }
            }

            tick();
            // Self-correcting loop: aligns to wall-clock second boundaries
            // (drift-free even if the tab was throttled). This is far more
            // reliable than a plain setInterval, which can silently fail
            // after long backgrounding.
            (function scheduleTick() {
                const now = Date.now();
                const delay = 1000 - (now % 1000);
                setTimeout(function step() {
                    try { tick(); } catch(e) {}
                    scheduleTick();
                }, delay);
            })();
        })();

        // ===== GEO PERMISSION (first-launch flow) =====
        // Shows a friendly explanation modal before the browser prompt so users
        // understand why we need location. Honors a stored "user said no" flag
        // so we don't pester them on every visit.
        (function initGeoPermissionFlow() {
            const KEY = 'azkar_geo_perm_decided_v1';

            function loc() { return (window.PrayerTimes && window.PrayerTimes.L && window.PrayerTimes.L()) || null; }
            function applyLangToOverlay() {
                const l = loc(); if (!l) return;
                const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
                setText('geoPermTitle', l.perm_title);
                setText('geoPermText', l.perm_text);
                setText('geoPermBullet1', l.perm_b1);
                setText('geoPermBullet2', l.perm_b2);
                setText('geoPermAllowBtn', l.perm_allow);
                setText('geoPermSkipBtn', l.perm_skip);
            }
            window._refreshGeoPermLang = applyLangToOverlay;

            function showOverlay() {
                applyLangToOverlay();
                document.getElementById('geoPermOverlay')?.classList.add('show');
            }
            function hideOverlay() {
                document.getElementById('geoPermOverlay')?.classList.remove('show');
            }

            window.grantGeoPerm = function() {
                hideOverlay();
                // Close prayer modal too if it was the entry point — we'll re-open after
                if (window.PrayerTimes) {
                    window.PrayerTimes.requestGeo(success => {
                        try { localStorage.setItem(KEY, success ? 'granted' : 'denied'); } catch(e) {}
                        // Re-render modal if it was open
                        if (document.getElementById('prayerModalOverlay')?.classList.contains('show')) {
                            window.PrayerTimes.renderModal();
                        }
                    });
                }
            };
            window.dismissGeoPerm = function(persistDecision) {
                hideOverlay();
                if (persistDecision) {
                    try { localStorage.setItem(KEY, 'skipped'); } catch(e) {}
                }
            };

            // Decide whether to show the pre-permission prompt
            (async function maybeShow() {
                let decided = null;
                try { decided = localStorage.getItem(KEY); } catch(e) {}
                // If user already decided, never bother them again here
                if (decided) return;
                // If we already have a stored location, no need to ask
                if (window.PrayerTimes && window.PrayerTimes.getLocation()) return;
                // If browser already granted permission, just fetch silently
                if ('permissions' in navigator) {
                    try {
                        const res = await navigator.permissions.query({ name: 'geolocation' });
                        if (res.state === 'granted') {
                            // Already granted — silently fetch, no need to ask user
                            window.PrayerTimes && window.PrayerTimes.requestGeo(success => {
                                if (success) try { localStorage.setItem(KEY, 'granted'); } catch(e) {}
                            });
                            return;
                        }
                        if (res.state === 'denied') {
                            // Already denied at the OS/browser level — don't pester
                            try { localStorage.setItem(KEY, 'denied'); } catch(e) {}
                            return;
                        }
                    } catch(e) {
                        // permissions API not supported (iOS Safari) — fall through to show overlay
                    }
                }
                // Show our friendly pre-permission modal after a short delay
                // so it doesn't slam the user the instant they open the app.
                setTimeout(showOverlay, 1200);
            })();
        })();

        // ===== ISLAMIC-DAY ROLLOVER WATCHER =====
        // Суточный сброс происходит на Фаджр (не в полночь). При смене ключа дня:
        //
        //  • completedSpecial  — сбрасывается: пометка «сделано сегодня» относится
        //    только к текущему исламскому дню.
        //
        //  • specialProgress   — сбрасывается: каждый день начинаем с нуля,
        //    даже если вчера зикр не был дочитан до конца.
        //
        //  • Чеклист, статистика — обычный суточный сброс.
        (function initDayRolloverWatcher() {
            let _lastDayKey = (typeof _islamicDayKey === 'function') ? _islamicDayKey() : null;
            // Модуль намазов уже готов — проверяем смену дня у задач (при запуске
            // она могла быть отложена, пока не было известно время Фаджра).
            try {
                if (typeof applyChecklistDailyRollover === 'function' && applyChecklistDailyRollover()) {
                    if (typeof renderChecklistFolders === 'function') renderChecklistFolders();
                    if (typeof updateChecklistUI === 'function') updateChecklistUI();
                }
            } catch(e) {}
            function check() {
                if (typeof _islamicDayKey !== 'function') return;
                const k = _islamicDayKey();
                if (k !== _lastDayKey) {
                    _lastDayKey = k;
                    // completedSpecial + specialProgress: сброс на Фаджр
                    try { if (typeof pruneCompletedSpecial === 'function') pruneCompletedSpecial(); } catch(e) {}
                    // specialProgress сбрасывается внутри pruneCompletedSpecial
                    try {
                        if (typeof applyChecklistDailyRollover === 'function' && applyChecklistDailyRollover()) {
                            if (typeof renderChecklistFolders === 'function') renderChecklistFolders();
                            if (typeof updateChecklistUI === 'function') updateChecklistUI();
                        }
                    } catch(e) {}
                    try { if (typeof renderStats === 'function') renderStats(); } catch(e) {}
                    try { if (typeof renderSpecialList === 'function') renderSpecialList(); } catch(e) {}
                }
            }
            setInterval(check, 30000);
            document.addEventListener('visibilitychange', function() { if (!document.hidden) check(); });
        })();

        // ===== STEALTH MODE (тёмный режим зикра) =====
        // Полностью чёрный экран, тап в любую точку = +1.
        // Активируется автоматически при входе на экран тасбих или специального зикра
        // если settings.stealthMode включён.
        // Выход — зажать экран 2 секунды.
        (function initStealthMode() {
            const overlay    = document.getElementById('stealthOverlay');
            const elCountdown = document.getElementById('stealthCountdown');
            const elCount    = document.getElementById('stealthCount');
            const elPlus     = document.getElementById('stealthPlus');
            const elAchievement = document.getElementById('stealthAchievement');
            const elAchievementTitle = document.getElementById('stealthAchievementTitle');
            const elAchievementName = document.getElementById('stealthAchievementName');
            const elAchievementSub = document.getElementById('stealthAchievementSub');
            const elHint     = document.getElementById('stealthHint');
            const elPreHint  = document.getElementById('stealthPreHint');
            const elRingCircle = document.getElementById('stealthHoldCircle');
            const RING_FULL  = 120; // stroke-dasharray

            let _active      = false;
            let _cdTimer     = null;
            let _wakeLock    = null;
            let _holdTimer   = null;
            let _holdInterval = null;
            let _holdStart   = 0;
            let _ignoreTouchEndsUntilClear = false;
            let _achievementActive = false;
            let _achievementOnTap = null;
            const HOLD_MS    = 2000;

            // Which counter screen initiated this stealth session:
            // 'azkar' | 'special' — set at activate(), used for display + increment
            let _targetCounter = 'azkar';

            function updateCountDisplay() {
                // Always show the counter that was active when stealth was triggered,
                // regardless of which screen the user navigated to afterwards.
                let val = 0;
                if (_targetCounter === 'special') val = specialCount;
                else val = count; // 'azkar' is the default
                elCount.textContent = val;
            }

            function showPlus() {
                elPlus.classList.remove('flash');
                void elPlus.offsetWidth; // reflow
                elPlus.classList.add('flash');
            }

            function cancelExitHold() {
                clearTimeout(_holdTimer);
                clearTimeout(overlay._preTimer);
                clearInterval(_holdInterval);
                _holdTimer = null;
                overlay._preTimer = null;
                _holdInterval = null;
                _holdStart = 0;
                const elRing = document.getElementById('stealthHoldRing');
                if (elRing) elRing.classList.remove('ring-active');
                if (elRingCircle) elRingCircle.style.strokeDashoffset = RING_FULL;
            }

            function incrementStealthCounter() {
                if (_targetCounter === 'special') incrementSpecial();
                else increment();
                updateCountDisplay();
                showPlus();
            }

            function hideAchievement() {
                _achievementActive = false;
                _achievementOnTap = null;
                overlay.classList.remove('achievement');
                if (elAchievement) elAchievement.classList.remove('show');
            }

            function completeAchievementTap() {
                if (!_achievementActive) return false;
                const cb = _achievementOnTap;
                hideAchievement();
                if (typeof cb === 'function') cb();
                return true;
            }

            window._stealthShowAchievement = function(opts = {}) {
                if (!_active || !overlay.classList.contains('counting') || !elAchievement) return false;
                clearTimeout(_holdTimer);
                clearTimeout(overlay._preTimer);
                clearInterval(_holdInterval);
                const elRing = document.getElementById('stealthHoldRing');
                if (elRing) elRing.classList.remove('ring-active');
                if (elRingCircle) elRingCircle.style.strokeDashoffset = RING_FULL;

                elAchievementTitle.textContent = opts.title || t('completionTitle');
                elAchievementName.textContent = opts.name || '';
                elAchievementName.style.display = opts.name ? 'block' : 'none';
                elAchievementSub.textContent = opts.sub || t('completionSub');
                _achievementOnTap = opts.onTap || null;
                _achievementActive = true;
                overlay.classList.add('achievement');
                elAchievement.classList.remove('show');
                void elAchievement.offsetWidth; // reflow
                elAchievement.classList.add('show');
                return true;
            };

            function acquireWakeLock() {
                if ('wakeLock' in navigator) {
                    navigator.wakeLock.request('screen').then(wl => { _wakeLock = wl; }).catch(() => {});
                }
            }
            function releaseWakeLock() {
                if (_wakeLock) { try { _wakeLock.release(); } catch(e) {} _wakeLock = null; }
            }

            // Позиционирует пре-подсказку выхода ВЫШЕ кнопок цели (33/66/100/своя)
            // с тем же вертикальным отступом, что и между кнопками цели и навбаром.
            // Только на экране зикра; на других — оставляем CSS-фолбэк (над навбаром).
            function positionPreHint(screenId) {
                if (!elPreHint) return;
                if (screenId !== 'screen-azkar') { elPreHint.style.bottom = ''; return; }
                try {
                    const goalsEl = document.querySelector('#screen-azkar .goals-area');
                    const navEl = document.querySelector('.navbar');
                    if (!goalsEl || !navEl) { elPreHint.style.bottom = ''; return; }
                    const g = goalsEl.getBoundingClientRect();
                    const n = navEl.getBoundingClientRect();
                    if (g.height <= 0 || n.height <= 0) { elPreHint.style.bottom = ''; return; }
                    // Отступ между нижним краем кнопок цели и верхним краем навбара.
                    const gap = Math.max(8, n.top - g.bottom);
                    // Низ подсказки = верхний край кнопок цели минус тот же отступ.
                    const bottomFromViewport = Math.round(window.innerHeight - (g.top - gap));
                    elPreHint.style.bottom = bottomFromViewport + 'px';
                } catch (e) { elPreHint.style.bottom = ''; }
            }

            function activate(screenId) {
                _active = false;
                _ignoreTouchEndsUntilClear = false;
                clearInterval(_cdTimer); _cdTimer = null;
                clearTimeout(_holdTimer);
                clearTimeout(overlay._preTimer);
                clearInterval(_holdInterval);
                releaseWakeLock();
                const elRing = document.getElementById('stealthHoldRing');
                if (elRing) elRing.classList.remove('ring-active');
                if (elRingCircle) elRingCircle.style.strokeDashoffset = RING_FULL;
                hideAchievement();

                _active = true;
                _targetCounter = (screenId === 'screen-special-counter') ? 'special' : 'azkar';
                overlay.classList.remove('counting');
                overlay.classList.add('active');
                // Пре-подсказка выхода видна уже во время отсчёта (до затемнения),
                // ярким текстом цвета темы. Позиционируется ВЫШЕ кнопок цели с тем же
                // отступом, что и между кнопками цели и навбаром (см. positionPreHint).
                if (elPreHint) elPreHint.textContent = t('stealthHint');
                positionPreHint(screenId);
                // Повторяем после того, как анимация появления экрана (translateY)
                // завершится, чтобы координаты были точными.
                setTimeout(() => { if (_active && !overlay.classList.contains('counting')) positionPreHint(screenId); }, 260);
                // Прогреваем AudioContext, пока есть пользовательский жест входа в
                // тёмный режим — чтобы звук достижения надёжно сработал и в нём.
                try {
                    const _ac = (typeof getAudioCtx === 'function') ? getAudioCtx() : null;
                    if (_ac && _ac.state === 'suspended') _ac.resume();
                } catch (e) {}
                elCountdown.classList.remove('hidden');
                let n = 3;
                elCountdown.textContent = n;
                _cdTimer = setInterval(() => {
                    n--;
                    if (n > 0) {
                        elCountdown.textContent = n;
                    } else {
                        clearInterval(_cdTimer);
                        _cdTimer = null;
                        elCountdown.classList.add('hidden');
                        overlay.classList.add('counting');
                        updateCountDisplay();
                        elHint.textContent = t('stealthHint');
                        acquireWakeLock();
                    }
                }, 1000);
            }

            function deactivate() {
                if (!_active) return;
                _active = false;
                _ignoreTouchEndsUntilClear = false;
                clearInterval(_cdTimer); _cdTimer = null;
                overlay.classList.remove('active', 'counting');
                elCountdown.classList.remove('hidden');
                if (elRingCircle) elRingCircle.style.strokeDashoffset = RING_FULL;
                const elRing = document.getElementById('stealthHoldRing');
                if (elRing) elRing.classList.remove('ring-active');
                hideAchievement();
                releaseWakeLock();
                clearTimeout(_holdTimer);
                clearTimeout(overlay._preTimer);
                clearInterval(_holdInterval);
            }

            // Called from switchTab / startSpecialDhikr / switchToAzkar etc.
            window._stealthTryActivate = function(screenId) {
                if (!settings.stealthMode) return;
                if (screenId === 'screen-azkar' || screenId === 'screen-special-counter') {
                    activate(screenId);
                } else {
                    deactivate();
                }
            };
            window._stealthDeactivate = deactivate;
            window._stealthIsActive = () => _active;

            // Taps on overlay
            overlay.addEventListener('touchstart', function(e) {
                if (!overlay.classList.contains('counting')) return;
                e.preventDefault();
                if (_achievementActive) return;

                // A second finger must never replace the first finger's timer:
                // the old unreferenced timer would otherwise keep running and exit
                // stealth mode after the visible ring had already been cancelled.
                // Treat each extra-finger tap as zikr and cancel the exit gesture
                // until all fingers have left the screen.
                if (e.touches.length > 1) {
                    cancelExitHold();
                    _ignoreTouchEndsUntilClear = true;
                    incrementStealthCounter();
                    return;
                }
                if (_ignoreTouchEndsUntilClear) return;

                _holdStart = Date.now();
                if (elRingCircle) {
                    elRingCircle.style.strokeDashoffset = RING_FULL;
                }
                const elRing = document.getElementById('stealthHoldRing');
                if (elRing) elRing.classList.remove('ring-active');

                const PRE_DELAY  = 500;  // 0.5s — ring is invisible, user must hold this long first
                const VISUAL_MS  = 2000; // 2s ring animation after pre-delay
                const TOTAL_MS   = PRE_DELAY + VISUAL_MS; // 2.5s total

                // After pre-delay, show the ring and start animating
                const _preTimer = setTimeout(() => {
                    if (elRing) elRing.classList.add('ring-active');
                    // Animate ring from full offset to 0 over VISUAL_MS
                    const ringStart = Date.now();
                    _holdInterval = setInterval(() => {
                        const elapsed = Date.now() - ringStart;
                        const pct = Math.min(elapsed / VISUAL_MS, 1);
                        if (elRingCircle) elRingCircle.style.strokeDashoffset = RING_FULL * (1 - pct);
                    }, 30);
                }, PRE_DELAY);

                // Store pre-timer ref so we can cancel it on touchend
                overlay._preTimer = _preTimer;

                _holdTimer = setTimeout(() => {
                    clearInterval(_holdInterval);
                    deactivate();
                }, TOTAL_MS);
            }, { passive: false });

            overlay.addEventListener('touchend', function(e) {
                if (!overlay.classList.contains('counting')) return;
                e.preventDefault();
                if (completeAchievementTap()) {
                    updateCountDisplay();
                    return;
                }
                if (_ignoreTouchEndsUntilClear) {
                    if (e.touches.length === 0) _ignoreTouchEndsUntilClear = false;
                    return;
                }
                const held = Date.now() - _holdStart;
                cancelExitHold();
                // Short tap = increment
                if (held < 300) {
                    incrementStealthCounter();
                }
            }, { passive: false });

            overlay.addEventListener('touchcancel', function(e) {
                if (!overlay.classList.contains('counting')) return;
                e.preventDefault();
                cancelExitHold();
                if (e.touches.length === 0) _ignoreTouchEndsUntilClear = false;
            }, { passive: false });

            // Also handle mouse (desktop testing)
            overlay.addEventListener('mousedown', function(e) {
                if (!overlay.classList.contains('counting')) return;
                if (_achievementActive) return;
                _holdStart = Date.now();
                if (elRingCircle) elRingCircle.style.strokeDashoffset = RING_FULL;
                const elRing = document.getElementById('stealthHoldRing');
                if (elRing) elRing.classList.remove('ring-active');

                const PRE_DELAY = 500;
                const VISUAL_MS = 2000;
                const TOTAL_MS  = PRE_DELAY + VISUAL_MS;

                const _preTimer = setTimeout(() => {
                    if (elRing) elRing.classList.add('ring-active');
                    const ringStart = Date.now();
                    _holdInterval = setInterval(() => {
                        const elapsed = Date.now() - ringStart;
                        const pct = Math.min(elapsed / VISUAL_MS, 1);
                        if (elRingCircle) elRingCircle.style.strokeDashoffset = RING_FULL * (1 - pct);
                    }, 30);
                }, PRE_DELAY);
                overlay._preTimer = _preTimer;

                _holdTimer = setTimeout(() => { clearInterval(_holdInterval); deactivate(); }, TOTAL_MS);
            });
            overlay.addEventListener('mouseup', function(e) {
                if (!overlay.classList.contains('counting')) return;
                if (completeAchievementTap()) {
                    updateCountDisplay();
                    return;
                }
                const held = Date.now() - _holdStart;
                clearTimeout(_holdTimer);
                clearTimeout(overlay._preTimer);
                clearInterval(_holdInterval);
                const elRing = document.getElementById('stealthHoldRing');
                if (elRing) elRing.classList.remove('ring-active');
                if (elRingCircle) elRingCircle.style.strokeDashoffset = RING_FULL;
                if (held < 300) {
                    if (_targetCounter === 'special') incrementSpecial();
                    else increment();
                    updateCountDisplay();
                    showPlus();
                }
            });

            // Navigation handler:
            // • counter screen (azkar / special) → restart countdown for that screen
            // • any other screen → fully deactivate
            document.addEventListener('_screenChanged', function(e) {
                if (!settings.stealthMode) return;
                const id = e.detail;
                if (id === 'screen-azkar' || id === 'screen-special-counter') {
                    activate(id);
                } else {
                    deactivate();
                }
            });
        })();

        // ===== INDEXEDDB BACKUP SYSTEM =====
        (function() {
            const DB_NAME = 'azkar_backups';
            const DB_VERSION = 1;
            const STORE = 'backups';
            const MAX_BACKUPS = 30;
            const FAJR_KEY = 'azkar_backup_last_fajr_date';
            const ISHA_KEY = 'azkar_backup_last_isha_date';
            let _db = null;

            function _openDB(onSuccess, onFail) {
                if (_db) { onSuccess(_db); return; }
                const req = indexedDB.open(DB_NAME, DB_VERSION);
                req.onupgradeneeded = function(e) {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE)) {
                        // Используем autoIncrement без keyPath — данные хранятся как есть
                        db.createObjectStore(STORE, { autoIncrement: true });
                    }
                };
                req.onsuccess = function(e) { _db = e.target.result; onSuccess(_db); };
                req.onerror = function(e) {
                    console.warn('[Backup] IndexedDB open error', e);
                    if (onFail) onFail(e);
                };
            }

            // Сохранить копию — сохраняем как JSON-строку чтобы избежать проблем с вложенными объектами
            window.saveBackupToIDB = function(label, onDone) {
                _openDB(function(db) {
                    const snapshot = (typeof window.getBackupSnapshot === 'function')
                        ? window.getBackupSnapshot(label)
                        : { label: label, savedAt: new Date().toISOString() };
                    // Оборачиваем: храним {label, savedAt, json} — так IDB не трогает структуру данных
                    const record = {
                        label: snapshot.label || label,
                        savedAt: snapshot.savedAt || new Date().toISOString(),
                        json: JSON.stringify(snapshot)
                    };
                    const tx = db.transaction(STORE, 'readwrite');
                    const req = tx.objectStore(STORE).add(record);
                    req.onerror = function(e) { console.warn('[Backup] add error', e); if (onDone) onDone(); };
                    tx.oncomplete = function() {
                        // Чистим старые если больше MAX_BACKUPS
                        const tx2 = db.transaction(STORE, 'readwrite');
                        const store2 = tx2.objectStore(STORE);
                        store2.getAllKeys().onsuccess = function(e2) {
                            const keys = e2.target.result;
                            if (keys.length > MAX_BACKUPS) {
                                keys.slice(0, keys.length - MAX_BACKUPS).forEach(function(k) { store2.delete(k); });
                            }
                        };
                        if (onDone) onDone();
                    };
                    tx.onerror = function(e) { console.warn('[Backup] tx error', e); if (onDone) onDone(); };
                }, function() { if (onDone) onDone(); });
            };

            // Получить все копии
            window.getAllBackups = function(cb) {
                _openDB(function(db) {
                    const tx = db.transaction(STORE, 'readonly');
                    const store = tx.objectStore(STORE);
                    const items = [];
                    const curReq = store.openCursor();
                    curReq.onsuccess = function(e) {
                        const cursor = e.target.result;
                        if (cursor) {
                            const rec = cursor.value;
                            let parsed = null;
                            try { parsed = rec.json ? JSON.parse(rec.json) : rec; } catch(ex) { parsed = rec; }
                            parsed._idbKey = cursor.key;
                            items.push(parsed);
                            cursor.continue();
                        } else {
                            cb(items.reverse());
                        }
                    };
                    curReq.onerror = function() { cb([]); };
                }, function() { cb([]); });
            };

            // Удалить копию
            window.deleteBackup = function(id, cb) {
                _openDB(function(db) {
                    if (id === undefined || id === null) { if (cb) cb(); return; }
                    const tx = db.transaction(STORE, 'readwrite');
                    tx.objectStore(STORE).delete(id);
                    tx.oncomplete = function() { if (cb) cb(); };
                    tx.onerror = function() { if (cb) cb(); };
                }, function() { if (cb) cb(); });
            };

            // Восстановить копию — идентично importData()
            window.restoreBackup = function(data) {
                try {
                    // ===== Полное восстановление через snapshot (v3+) =====
                    if (data.snapshot && typeof data.snapshot === 'object' &&
                        typeof AppStorage !== 'undefined' && AppStorage.importAll) {
                        AppStorage.importAll(data.snapshot);
                        try {
                            const ss = localStorage.getItem('azkar_settings');
                            if (ss) Object.assign(settings, JSON.parse(ss));
                            currentLang = settings.language || 'en';
                            count = parseInt(localStorage.getItem('azkar_count') || '0');
                            const gg = localStorage.getItem('azkar_goal');
                            if (gg) { const pg = parseInt(gg); isUnlimited = (pg === UNLIMITED_GOAL); goal = isUnlimited ? 33 : pg; }
                            goalBaseline = parseInt(localStorage.getItem('azkar_goal_baseline') || '0');
                            if (isNaN(goalBaseline) || goalBaseline < 0 || goalBaseline > count) goalBaseline = 0; customBaseline = _readCustomBaseline();
                            customGoal = parseInt(localStorage.getItem('azkar_custom_goal') || '0');
                            duas = JSON.parse(localStorage.getItem('azkar_duas') || '[]');
                            if (typeof loadDuaFolders === 'function') loadDuaFolders();
                            _statsCache = JSON.parse(localStorage.getItem('azkar_stats_v2') || '{}');
                            completedSpecial = JSON.parse(localStorage.getItem('azkar_special_completed') || '{}');
                            specialProgress = JSON.parse(localStorage.getItem('azkar_special_progress') || '{}');
                            specialResumeSessions = JSON.parse(localStorage.getItem('azkar_special_resume_sessions') || '{}');
                            // Перечитываем общий прогресс зикров в память (см. importData).
                            if (typeof loadDhikrTotals === 'function') loadDhikrTotals();
                            if (typeof loadCustomSpecialDhikrs === 'function') loadCustomSpecialDhikrs();
                            lastActiveSpecialId = localStorage.getItem('azkar_last_special_id') || null;
                        } catch(e1) {}
                        _invalidateDefaultsSync();
                        try { if (typeof loadChecklist === 'function') loadChecklist(); } catch(e4) {}
                        if (typeof applyTheme === 'function') applyTheme(settings.theme || 'dark');
                        if (typeof applyLanguage === 'function') applyLanguage(currentLang);
                        if (typeof ensureNames99DuaFolder === 'function') ensureNames99DuaFolder();
                        if (typeof updateDisplay === 'function') updateDisplay();
                        if (typeof updateSettingsUI === 'function') updateSettingsUI();
                        if (typeof updateHadithUI === 'function') updateHadithUI();
                        try { if (typeof updateDhikrOverallProgress === 'function') updateDhikrOverallProgress(); } catch(e5) {}
                        if (typeof markDirty === 'function') markDirty('dua','favorites','stats','special');
                        if (typeof syncImportedDhikrKeys === 'function') syncImportedDhikrKeys(Object.keys(data.snapshot));
                        closeBackupModal();
                        try { showToast(t('toastImported')); } catch(e3) {}
                        return;
                    }

                    // ===== Совместимость со старыми бэкапами (без snapshot) =====
                    if (data.settings) { Object.assign(settings, data.settings); if (data.settings.language) currentLang = data.settings.language; }
                    if (data.count !== undefined) { count = data.count; localStorage.setItem('azkar_count', String(count)); }
                    if (data.goal !== undefined) { goal = data.goal; isUnlimited = (goal >= 999999999); localStorage.setItem('azkar_goal', String(data.goal)); }
                    goalBaseline = 0; localStorage.setItem('azkar_goal_baseline', '0');
                    customBaseline = 0; localStorage.setItem('azkar_custom_baseline', '0');
                    if (data.customGoal !== undefined) { customGoal = data.customGoal; localStorage.setItem('azkar_custom_goal', String(customGoal)); }
                    if (data.duas) { duas = data.duas; localStorage.setItem('azkar_duas', JSON.stringify(duas)); }
                    if (data.completedSpecial) { completedSpecial = data.completedSpecial; localStorage.setItem('azkar_special_completed', JSON.stringify(completedSpecial)); }
                    if (data.specialProgress) { specialProgress = data.specialProgress; localStorage.setItem('azkar_special_progress', JSON.stringify(specialProgress)); }
                    if (data.specialResumeSessions) { specialResumeSessions = data.specialResumeSessions; localStorage.setItem('azkar_special_resume_sessions', JSON.stringify(specialResumeSessions)); }
                    if (Array.isArray(data.specialDhikrs) && data.specialDhikrs.length > 0) {
                        specialDhikrs = data.specialDhikrs;
                        if (typeof saveSpecialDhikrsToStorage === 'function') saveSpecialDhikrsToStorage();
                    }
                    if (data.stats && typeof data.stats === 'object') {
                        _statsCache = data.stats;
                        localStorage.setItem('azkar_stats_v2', JSON.stringify(_statsCache));
                    }
                    if (data.dhikrTotals && typeof data.dhikrTotals === 'object') {
                        dhikrTotals = data.dhikrTotals;
                        if (typeof saveDhikrTotals === 'function') saveDhikrTotals();
                    }
                    if (typeof flushSave === 'function') flushSave();
                    if (typeof markDataChanged === 'function') markDataChanged();
                    if (typeof syncImportedDhikrKeys === 'function') syncImportedDhikrKeys([
                        data.count !== undefined ? 'azkar_count' : '',
                        (data.stats && typeof data.stats === 'object') ? 'azkar_stats_v2' : '',
                        (data.dhikrTotals && typeof data.dhikrTotals === 'object') ? 'azkar_dhikr_totals' : ''
                    ]);
                    if (typeof applyTheme === 'function') applyTheme(settings.theme || 'dark');
                    if (typeof applyLanguage === 'function') applyLanguage(currentLang);
                    if (typeof updateDisplay === 'function') updateDisplay();
                    try { if (typeof updateDhikrOverallProgress === 'function') updateDhikrOverallProgress(); } catch(e7) {}
                    if (typeof markDirty === 'function') markDirty('dua','favorites','stats','special');
                    if (typeof updateSettingsUI === 'function') updateSettingsUI();
                    closeBackupModal();
                    try { showToast(t('toastImported')); } catch(e3) {}
                    console.log('[Backup] Restored (legacy):', data.savedAt);
                } catch(e) { console.warn('[Backup] Restore error:', e); }
            };

            // Авто-бэкап: две копии в день — после фаджра и после иша.
            // Копия создаётся автоматически, когда пользователь заходит в приложение
            // (а также по таймеру, пока приложение открыто).
            function _getPrayerMs(hours, fallbackHours) {
                try {
                    const now = new Date();
                    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    if (hours !== null && hours !== undefined && !isNaN(hours)) {
                        return base.getTime() + Math.floor(hours)*3600000 + Math.round((hours%1)*60)*60000;
                    }
                    return base.getTime() + fallbackHours * 3600000;
                } catch(e) { return null; }
            }
            function _getFajrMs() {
                const h = (window.PrayerTimes && typeof window.PrayerTimes.getFajrHours === 'function')
                    ? window.PrayerTimes.getFajrHours() : null;
                return _getPrayerMs(h, 4);   // запасной фаджр ≈ 04:00
            }
            function _getIshaMs() {
                const h = (window.PrayerTimes && typeof window.PrayerTimes.getIshaHours === 'function')
                    ? window.PrayerTimes.getIshaHours() : null;
                return _getPrayerMs(h, 20);  // запасная иша ≈ 20:00
            }

            // Сохранить копию для слота (fajr/isha), но не чаще одного раза в день на слот
            function _doSlotBackup(key) {
                const now = new Date();
                const today = now.toISOString().slice(0, 10);
                if (localStorage.getItem(key) === today) return;
                const pad = n => String(n).padStart(2,'0');
                const label = now.getFullYear() + '.' + pad(now.getMonth()+1) + '.' + pad(now.getDate())
                    + '  ' + pad(now.getHours()) + ':' + pad(now.getMinutes());
                window.saveBackupToIDB(label, function() {
                    localStorage.setItem(key, today);
                    console.log('[Backup] Auto-saved (' + key + '):', today);
                });
            }

            // Проверить оба слота прямо сейчас (вызывается при открытии приложения)
            function _checkBackupsNow() {
                const now = Date.now();
                const fajrMs = _getFajrMs();
                if (fajrMs && now >= fajrMs) _doSlotBackup(FAJR_KEY);
                const ishaMs = _getIshaMs();
                if (ishaMs && now >= ishaMs) _doSlotBackup(ISHA_KEY);
            }

            function _scheduleNext() {
                // 1) Делаем пропущенные копии сразу при заходе в приложение
                _checkBackupsNow();
                // 2) Планируем ближайший слот (фаджр или иша)
                const now = Date.now();
                const times = [];
                let fajrMs = _getFajrMs();
                if (fajrMs) { if (fajrMs <= now) fajrMs += 86400000; times.push(fajrMs); }
                let ishaMs = _getIshaMs();
                if (ishaMs) { if (ishaMs <= now) ishaMs += 86400000; times.push(ishaMs); }
                if (!times.length) { setTimeout(_scheduleNext, 60000); return; }
                const next = Math.min.apply(null, times);
                setTimeout(function() { _checkBackupsNow(); _scheduleNext(); }, Math.max(1000, next - now));
            }

            if (document.readyState === 'complete') { _scheduleNext(); }
            else { window.addEventListener('load', _scheduleNext); }
        })();

        // ===== BACKUP MODAL =====
        function openBackupModal() {
            const L = i18n[currentLang] || i18n['en'] || i18n['ru'];
            document.getElementById('backupModalTitle').textContent = t('backupTitle');
            document.getElementById('backupModalOverlay').classList.add('show');
            _renderBackupList();
        }
        function closeBackupModal() {
            document.getElementById('backupModalOverlay').classList.remove('show');
        }
        function _fmtBackupDate(d) {
            if (isNaN(d)) return '';
            const pad = n => String(n).padStart(2,'0');
            return d.getFullYear() + '.' + pad(d.getMonth()+1) + '.' + pad(d.getDate())
                + '  ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
        }
        // Снимок данных — доступен из главного scope где живут все переменные приложения
        window.getBackupSnapshot = function(label) {
            if (typeof flushSave === 'function') flushSave();
            const now = new Date();
            return {
                label: label || _fmtBackupDate(now),
                savedAt: now.toISOString(),
                version: 3,
                snapshot: (typeof AppStorage !== 'undefined' && AppStorage.exportAll) ? AppStorage.exportAll() : null,
                settings: { ...settings, language: currentLang },
                count: count,
                goal: isUnlimited ? 999999999 : goal,
                customGoal: customGoal,
                duas: duas,
                stats: JSON.parse(localStorage.getItem('azkar_stats_v2') || '{}'),
                dhikrTotals: JSON.parse(localStorage.getItem('azkar_dhikr_totals') || '{}'),
                completedSpecial: completedSpecial,
                specialProgress: specialProgress,
                specialResumeSessions: specialResumeSessions,
                specialDhikrs: specialDhikrs
            };
        };
        function _renderBackupList() {
            const L = i18n[currentLang] || i18n['en'] || i18n['ru'];
            window.getAllBackups(function(list) {
                const container = document.getElementById('backupList');
                container.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:0.9rem;padding:20px 0;" id="backupEmptyMsg"' + (list.length ? ' hidden' : '') + '>' + t('backupEmpty') + '</div>';
                if (!list.length) return;
                list.forEach(function(item) {
                    const row = document.createElement('div');
                    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--surface-light);border:1px solid var(--border);border-radius:14px;gap:8px;cursor:pointer;transition:border-color 0.18s,background 0.18s;';
                    row.onmouseenter = function() { row.style.borderColor = 'var(--border-hover)'; row.style.background = 'var(--surface)'; };
                    row.onmouseleave = function() { row.style.borderColor = 'var(--border)'; row.style.background = 'var(--surface-light)'; };
                    const info = document.createElement('div');
                    info.style.cssText = 'flex:1;min-width:0;pointer-events:none;';
                    // Show label (date+time) in one line, no duplicated date below
                    const labelText = item.label || _fmtBackupDate(new Date(item.savedAt));
                    info.innerHTML = '<div style="font-size:0.88rem;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:0.01em;">' + labelText + '</div>';
                    row.onclick = function(e) {
                        if (e.target === delBtn || delBtn.contains(e.target)) return;
                        promptRestoreBackup(item);
                    };
                    const delBtn = document.createElement('button');
                    delBtn.style.cssText = 'flex-shrink:0;width:28px;height:28px;border-radius:50%;border:1px solid var(--border);background:none;color:var(--text-dim);cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;line-height:1;';
                    delBtn.textContent = '×';
                    delBtn.title = t('titleDelete');
                    delBtn.onclick = function(e) {
                        e.stopPropagation();
                        const key = item._idbKey !== undefined ? item._idbKey : (item.id !== undefined ? item.id : item.savedAt);
                        promptDeleteBackup(key);
                    };
                    row.appendChild(info);
                    row.appendChild(delBtn);
                    container.appendChild(row);
                });
            });
        }

        // ===== BACKUP DELETE CONFIRMATION CARD =====
        let _deleteBackupKey = null;
        function promptDeleteBackup(key) {
            _deleteBackupKey = key;
            const L = i18n[currentLang] || i18n['en'] || i18n['ru'];
            const tt = document.getElementById('deleteBackupTitle');
            const ss = document.getElementById('deleteBackupSub');
            if (tt) tt.textContent = t('backupDelete');
            if (ss) ss.textContent = t('backupDeleteSub');
            document.getElementById('deleteBackupOverlay').classList.add('show');
        }
        function cancelDeleteBackup() {
            _deleteBackupKey = null;
            document.getElementById('deleteBackupOverlay').classList.remove('show');
        }
        function confirmDeleteBackup() {
            if (_deleteBackupKey === null) { cancelDeleteBackup(); return; }
            const key = _deleteBackupKey;
            _deleteBackupKey = null;
            document.getElementById('deleteBackupOverlay').classList.remove('show');
            window.deleteBackup(key, function() { _renderBackupList(); });
        }

        // ===== BACKUP RESTORE CONFIRMATION CARD =====
        let _restoreBackupItem = null;
        function promptRestoreBackup(item) {
            _restoreBackupItem = item;
            const L = i18n[currentLang] || i18n['en'] || i18n['ru'];
            const tt = document.getElementById('restoreBackupTitle');
            const ss = document.getElementById('restoreBackupSub');
            if (tt) tt.textContent = t('backupRestoreTitle');
            if (ss) ss.textContent = t('backupRestoreSub');
            document.getElementById('restoreBackupOverlay').classList.add('show');
        }
        function cancelRestoreBackup() {
            _restoreBackupItem = null;
            document.getElementById('restoreBackupOverlay').classList.remove('show');
        }
        function confirmRestoreBackup() {
            if (!_restoreBackupItem) { cancelRestoreBackup(); return; }
            const item = _restoreBackupItem;
            _restoreBackupItem = null;
            document.getElementById('restoreBackupOverlay').classList.remove('show');
            window.restoreBackup(item);
        }

        // Разблокировка AudioContext на мобильных — браузер требует жест пользователя
        // Создаём/возобновляем контекст при первом touch/click на странице
        function unlockAudioCtx() {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            document.removeEventListener('touchstart', unlockAudioCtx, true);
            document.removeEventListener('mousedown', unlockAudioCtx, true);
        }
        document.addEventListener('touchstart', unlockAudioCtx, true);
        document.addEventListener('mousedown', unlockAudioCtx, true);
    
