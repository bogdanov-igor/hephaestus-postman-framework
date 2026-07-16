// ════════════════════════════════════════════════════════════
// SHARED MODULE: i18n
//
// Locale-aware messages for the engine. Locale comes from ctx.config.locale
// ('ru' default — preserves existing output; 'en' for English).
//
//   import { t, statusLabel } from './shared/i18n.js';
//   pm.test(t(ctx, 'metrics.bodyName', expectEmpty), ...);
//
// The `ru` templates MUST reproduce the historical strings byte-for-byte (the
// golden harness locks this). Add English under `en`; missing ids fall back to ru.
// ════════════════════════════════════════════════════════════

function locOf(ctx) {
    return (ctx && ctx.config && ctx.config.locale === 'en') ? 'en' : 'ru';
}

const STATUS = {
    ru: {
        200: 'Успешно', 201: 'Создан', 202: 'Принято', 204: 'Нет содержимого',
        301: 'Перемещён', 302: 'Найден',
        400: 'Неверный запрос', 401: 'Неавторизован', 403: 'Доступ запрещён', 404: 'Не найден',
        405: 'Метод запрещён', 409: 'Конфликт', 422: 'Некорректные данные', 429: 'Слишком много запросов',
        500: 'Ошибка сервера', 502: 'Плохой шлюз', 503: 'Сервис недоступен', 504: 'Таймаут шлюза'
    },
    en: {
        200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content',
        301: 'Moved Permanently', 302: 'Found',
        400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found',
        405: 'Method Not Allowed', 409: 'Conflict', 422: 'Unprocessable Entity', 429: 'Too Many Requests',
        500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout'
    }
};

export function statusLabel(ctx, code) {
    const loc = locOf(ctx);
    return (STATUS[loc] && STATUS[loc][code]) || (loc === 'en' ? 'Unknown status' : 'Неизвестный статус');
}

// Message catalog. Each id maps to { ru, en } template functions.
const M = {
    'metrics.status':            { ru: function(e, c, l) { return e + ' Статус: ' + c + ' — ' + l; },
                                   en: function(e, c, l) { return e + ' Status: ' + c + ' — ' + l; } },
    'metrics.statusExpect':      { ru: function(c, a) { return '🚫 Статус ' + c + ' не входит в ожидаемые: ' + a; },
                                   en: function(c, a) { return '🚫 Status ' + c + ' not in expected: ' + a; } },
    'metrics.bodyName':          { ru: function(e) { return '📭 Тело ответа: ' + (e ? 'пустое ✓' : 'не пустое'); },
                                   en: function(e) { return '📭 Response body: ' + (e ? 'empty ✓' : 'not empty'); } },
    'metrics.bodyEmpty':         { ru: function() { return '🚫 Ответ пустой'; },
                                   en: function() { return '🚫 Response is empty'; } },
    'metrics.bodyNotEmpty':      { ru: function() { return '🚫 Ответ не пустой'; },
                                   en: function() { return '🚫 Response is not empty'; } },
    'metrics.contentType':       { ru: function(ct) { return '🧾 Content-Type: ' + ct; },
                                   en: function(ct) { return '🧾 Content-Type: ' + ct; } },
    'metrics.contentTypeExpect': { ru: function(t) { return '🚫 Ожидался "' + t + '"'; },
                                   en: function(t) { return '🚫 Expected "' + t + '"'; } }
};

export function t(ctx, id) {
    const entry = M[id];
    if (!entry) return id;
    const args = Array.prototype.slice.call(arguments, 2);
    const fn = entry[locOf(ctx)] || entry.ru;
    return fn.apply(null, args);
}
