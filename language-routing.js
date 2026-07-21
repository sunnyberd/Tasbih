(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
        return;
    }
    root.AZKAR_LANGUAGE_ROUTING = api;
    try {
        api.persistRequestedLanguage(root.location.search, root.localStorage);
    } catch (_) {}
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const SUPPORTED_LANGUAGES = Object.freeze([
        'en', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'ru', 'uz', 'zh', 'tr', 'hi', 'id', 'ms', 'th'
    ]);

    function getRequestedLanguage(search) {
        let value;
        try {
            value = new URLSearchParams(String(search || '')).get('lang');
        } catch (_) {
            return null;
        }
        return SUPPORTED_LANGUAGES.includes(value) ? value : null;
    }

    function persistRequestedLanguage(search, storage) {
        const language = getRequestedLanguage(search);
        if (!language || !storage) return null;

        let settings = {};
        try {
            settings = JSON.parse(storage.getItem('azkar_settings') || '{}') || {};
        } catch (_) {
            settings = {};
        }
        settings.language = language;
        storage.setItem('azkar_settings', JSON.stringify(settings));
        return language;
    }

    return Object.freeze({
        SUPPORTED_LANGUAGES,
        getRequestedLanguage,
        persistRequestedLanguage
    });
});
