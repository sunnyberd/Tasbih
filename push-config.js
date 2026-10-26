// Azkar — настройки push-уведомлений (приходят, даже когда приложение закрыто).
// Подключается и страницей (index.html), и Service Worker'ом (sw.js).
// server — адрес push-сервера (Cloudflare Worker из папки Tasbih-push).
// Пока он пустой, push выключен и работают только прежние уведомления.
// publicKey — публичный ключ VAPID (не секрет, его можно публиковать).
self.AZKAR_PUSH = {
    server: 'https://azkar-push.azkar-push.workers.dev',
    publicKey: 'BNbA2Y26OCfNW6X2zLqaWdJAZAvpC5FJy9mgp8dpobUltJIn7JPZl28Kc5be4wA2_k3UqEoOBmbdN-6F7VTqs0o'
};
