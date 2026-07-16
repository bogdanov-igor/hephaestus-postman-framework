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
                                   en: function(t) { return '🚫 Expected "' + t + '"'; } },

    'headers.absent':         { ru: function(l) { return '📨 Header отсутствует: ' + l; },
                                en: function(l) { return '📨 Header absent: ' + l; } },
    'headers.absentExpect':   { ru: function(h) { return '🚫 Header "' + h + '" присутствует, но должен отсутствовать'; },
                                en: function(h) { return '🚫 Header "' + h + '" is present but must be absent'; } },
    'headers.exists':         { ru: function(l) { return '📨 Header существует: ' + l; },
                                en: function(l) { return '📨 Header present: ' + l; } },
    'headers.existsExpect':   { ru: function(h) { return '🚫 Header "' + h + '" отсутствует в ответе'; },
                                en: function(h) { return '🚫 Header "' + h + '" missing from response'; } },
    'headers.equals':         { ru: function(l, v) { return '📨 Header "' + l + '" = "' + v + '"'; },
                                en: function(l, v) { return '📨 Header "' + l + '" = "' + v + '"'; } },
    'headers.equalsExpect':   { ru: function(e, g) { return '🚫 Ожидалось "' + e + '", получено "' + g + '"'; },
                                en: function(e, g) { return '🚫 Expected "' + e + '", got "' + g + '"'; } },
    'headers.cond':           { ru: function(l) { return '📨 Header "' + l + '": условие'; },
                                en: function(l) { return '📨 Header "' + l + '": condition'; } },
    'headers.condExpect':     { ru: function(h, v) { return '🚫 Header "' + h + '": условие не выполнено (значение: "' + v + '")'; },
                                en: function(h, v) { return '🚫 Header "' + h + '": condition failed (value: "' + v + '")'; } },
    'headers.includes':       { ru: function(l, e) { return '📨 Header "' + l + '" содержит "' + e + '"'; },
                                en: function(l, e) { return '📨 Header "' + l + '" contains "' + e + '"'; } },
    'headers.includesExpect': { ru: function(h, e) { return '🚫 Header "' + h + '" не содержит "' + e + '"'; },
                                en: function(h, e) { return '🚫 Header "' + h + '" does not contain "' + e + '"'; } },

    // ─── retryOnStatus ───
    'retryOnStatus.rerunLog': { ru: function(attempt, maxRetries, code, requestName) { return '[HEPHAESTUS] ⚡ retryOnStatus: попытка ' + attempt + '/' + maxRetries + ', status=' + code + ', re-running: ' + requestName; }, en: function(attempt, maxRetries, code, requestName) { return '[HEPHAESTUS] ⚡ retryOnStatus: attempt ' + attempt + '/' + maxRetries + ', status=' + code + ', re-running: ' + requestName; } },
    'retryOnStatus.exhausted': { ru: function(maxRetries, code) { return '⚡ retryOnStatus: исчерпаны все ' + maxRetries + ' повторов (status=' + code + ')'; }, en: function(maxRetries, code) { return '⚡ retryOnStatus: exhausted all ' + maxRetries + ' retries (status=' + code + ')'; } },
    'retryOnStatus.allFailed': { ru: function(maxRetries, code, expected) { return 'Все ' + maxRetries + ' попытки вернули статус ' + code + '. Ожидался не ' + expected + '.'; }, en: function(maxRetries, code, expected) { return 'All ' + maxRetries + ' attempts returned status ' + code + '. Expected not ' + expected + '.'; } },
    // ─── assertions ───
    'assertions.found': { ru: function(soft, name, path) { return (soft ? '⚪ [soft] ' : '🔎 ') + 'Найдено: \'' + name + '\' (' + path + ')'; }, en: function(soft, name, path) { return (soft ? '⚪ [soft] ' : '🔎 ') + 'Found: \'' + name + '\' (' + path + ')'; } },
    'assertions.softFieldNotFound': { ru: function(path) { return '⚪ [soft] Поле не найдено: ' + path + ' — пропущено'; }, en: function(path) { return '⚪ [soft] Field not found: ' + path + ' — skipped'; } },
    'assertions.valueNotFound': { ru: function(path) { return '🚫 Значение не найдено по пути: ' + path; }, en: function(path) { return '🚫 Value not found at path: ' + path; } },
    'assertions.conditionFailed': { ru: function(name) { return '🚫 \'' + name + '\': условие не выполнено'; }, en: function(name) { return '🚫 \'' + name + '\': condition not met'; } },
    'assertions.expectedValue': { ru: function(name, expect) { return '🚫 \'' + name + '\': ожидалось "' + expect + '"'; }, en: function(name, expect) { return '🚫 \'' + name + '\': expected "' + expect + '"'; } },
    'assertions.saved': { ru: function(name, path) { return '💾 Сохранено: \'' + name + '\' ← ' + path; }, en: function(name, path) { return '💾 Saved: \'' + name + '\' ← ' + path; } },
    'assertions.notFoundAtPath': { ru: function(name, path) { return '🚫 \'' + name + '\': не найдена по пути \'' + path + '\''; }, en: function(name, path) { return '🚫 \'' + name + '\': not found at path \'' + path + '\''; } },
    'assertions.unknownScope': { ru: function(scope, name) { return 'varsToSave: неизвестный scope "' + scope + '" для "' + name + '", использован collection'; }, en: function(scope, name) { return 'varsToSave: unknown scope "' + scope + '" for "' + name + '", collection used'; } },
    'assertions.varsSaveNotFound': { ru: function(name, path) { return 'varsToSave: \'' + name + '\' не найдена по пути \'' + path + '\''; }, en: function(name, path) { return 'varsToSave: \'' + name + '\' not found at path \'' + path + '\''; } },
    'assertions.countLabel': { ru: function(length, expected, ok) { return expected !== undefined ? length + ' / ' + expected + (ok ? ' ✅' : ' ❌') : length + ' эл.'; }, en: function(length, expected, ok) { return expected !== undefined ? length + ' / ' + expected + (ok ? ' ✅' : ' ❌') : length + ' items'; } },
    'assertions.countTest': { ru: function(alias, label) { return '📏 Кол-во \'' + alias + '\': ' + label; }, en: function(alias, label) { return '📏 Count \'' + alias + '\': ' + label; } },
    'assertions.countMismatch': { ru: function(alias, expected, length) { return '🚫 \'' + alias + '\': ожидалось ' + expected + ', получено ' + length; }, en: function(alias, expected, length) { return '🚫 \'' + alias + '\': expected ' + expected + ', got ' + length; } },
    'assertions.notExists': { ru: function() { return 'не существует'; }, en: function() { return 'does not exist'; } },
    'assertions.mustBeAbsent': { ru: function(fieldPath) { return '🚫 "' + fieldPath + '" должен отсутствовать'; }, en: function(fieldPath) { return '🚫 "' + fieldPath + '" must be absent'; } },
    'assertions.fieldNotFound': { ru: function(fieldPath) { return '🚫 "' + fieldPath + '" не найдено'; }, en: function(fieldPath) { return '🚫 "' + fieldPath + '" not found'; } },
    'assertions.expectedArray': { ru: function() { return '🚫 ожидался array'; }, en: function() { return '🚫 expected array'; } },
    'assertions.expectedNull': { ru: function() { return '🚫 ожидался null'; }, en: function() { return '🚫 expected null'; } },
    'assertions.expectedType': { ru: function(type) { return '🚫 ожидался тип ' + type; }, en: function(type) { return '🚫 expected type ' + type; } },
    'assertions.lenBelow': { ru: function(len, minLen) { return '🚫 длина ' + len + ' < ' + minLen; }, en: function(len, minLen) { return '🚫 length ' + len + ' < ' + minLen; } },
    'assertions.lenAbove': { ru: function(len, maxLen) { return '🚫 длина ' + len + ' > ' + maxLen; }, en: function(len, maxLen) { return '🚫 length ' + len + ' > ' + maxLen; } },
    'assertions.notMatch': { ru: function(raw, re) { return '🚫 "' + raw + '" не соответствует ' + re; }, en: function(raw, re) { return '🚫 "' + raw + '" does not match ' + re; } },
    'assertions.notParsed': { ru: function() { return 'assertions: ответ не распарсен, проверки пропущены'; }, en: function() { return 'assertions: response not parsed, checks skipped'; } },
    // ─── assertEach ───
    'assertEach.ruleAbsentGot': { ru: function(path, serVal) { return path + ': должен отсутствовать, но = ' + serVal; }, en: function(path, serVal) { return path + ': must be absent, but = ' + serVal; } },
    'assertEach.ruleFieldMissing': { ru: function(path) { return path + ': поле отсутствует'; }, en: function(path) { return path + ': field is missing'; } },
    'assertEach.ruleAbsent': { ru: function(path) { return path + ': должен отсутствовать'; }, en: function(path) { return path + ': must be absent'; } },
    'assertEach.notArray': { ru: function(path) { return '🔢 assertEach[' + path + ']: не массив'; }, en: function(path) { return '🔢 assertEach[' + path + ']: not an array'; } },
    'assertEach.notArrayMsg': { ru: function(path, type) { return '🚫 "' + path + '" не является массивом (получено: ' + type + ')'; }, en: function(path, type) { return '🚫 "' + path + '" is not an array (received: ' + type + ')'; } },
    'assertEach.minCount': { ru: function(minCount, count, ok) { return '🔢 assertEach: minCount=' + minCount + ' (' + count + ' элементов) ' + (ok ? '✅' : '❌'); }, en: function(minCount, count, ok) { return '🔢 assertEach: minCount=' + minCount + ' (' + count + ' elements) ' + (ok ? '✅' : '❌'); } },
    'assertEach.minCountMsg': { ru: function(minCount, count) { return '🚫 Ожидалось минимум ' + minCount + ' элементов, получено ' + count; }, en: function(minCount, count) { return '🚫 Expected at least ' + minCount + ' elements, got ' + count; } },
    'assertEach.maxCount': { ru: function(maxCount, count, ok) { return '🔢 assertEach: maxCount=' + maxCount + ' (' + count + ' элементов) ' + (ok ? '✅' : '❌'); }, en: function(maxCount, count, ok) { return '🔢 assertEach: maxCount=' + maxCount + ' (' + count + ' elements) ' + (ok ? '✅' : '❌'); } },
    'assertEach.maxCountMsg': { ru: function(maxCount, count) { return '🚫 Ожидалось максимум ' + maxCount + ' элементов, получено ' + count; }, en: function(maxCount, count) { return '🚫 Expected at most ' + maxCount + ' elements, got ' + count; } },
    'assertEach.label': { ru: function(globalSoft, path, count, ruleCount) { return (globalSoft ? '⚪ [soft] ' : '') + '🔢 assertEach[' + path + ']: ' + count + ' эл. × ' + ruleCount + ' правил'; }, en: function(globalSoft, path, count, ruleCount) { return (globalSoft ? '⚪ [soft] ' : '') + '🔢 assertEach[' + path + ']: ' + count + ' items × ' + ruleCount + ' rules'; } },
    'assertEach.result': { ru: function(label, hardFailed) { return label + ' — ' + (hardFailed === 0 ? '✅ все прошли' : '❌ ' + hardFailed + ' нарушений'); }, en: function(label, hardFailed) { return label + ' — ' + (hardFailed === 0 ? '✅ all passed' : '❌ ' + hardFailed + ' violations'); } },
    'assertEach.violations': { ru: function(hardFailed, totalChecks, preview, total) { return hardFailed + '/' + totalChecks + ' нарушений:\n' + preview + (total > 10 ? '\n... +' + (total - 10) + ' ещё' : ''); }, en: function(hardFailed, totalChecks, preview, total) { return hardFailed + '/' + totalChecks + ' violations:\n' + preview + (total > 10 ? '\n... +' + (total - 10) + ' more' : ''); } },
    // ─── assertShape ───
    'assertShape.mustBeAbsent': { ru: function(fieldPath, valJson) { return '🚫 "' + fieldPath + '" должен отсутствовать, но = ' + valJson; }, en: function(fieldPath, valJson) { return '🚫 "' + fieldPath + '" must be absent, but = ' + valJson; } },
    'assertShape.notFound': { ru: function(fieldPath) { return '🚫 "' + fieldPath + '" не найдено'; }, en: function(fieldPath) { return '🚫 "' + fieldPath + '" not found'; } },
    'assertShape.typeMismatch': { ru: function(fieldPath, expected, actual) { return '🚫 "' + fieldPath + '": ожидался ' + expected + ', получен ' + actual; }, en: function(fieldPath, expected, actual) { return '🚫 "' + fieldPath + '": expected ' + expected + ', got ' + actual; } },
    // ─── assertOrder ───
    'assertOrder.violationsCount': { ru: function(count) { return '❌ ' + count + ' нарушений'; }, en: function(count) { return '❌ ' + count + ' violations'; } },
    'assertOrder.violationsMsg': { ru: function(dir, by, violations) { return 'Нарушения порядка сортировки (' + dir + ' by "' + by + '"):\n' + violations; }, en: function(dir, by, violations) { return 'Sort order violations (' + dir + ' by "' + by + '"):\n' + violations; } },
    // ─── assertUnique ───
    'assertUnique.dupeCount': { ru: function(count) { return count === 0 ? '✅' : '❌ ' + count + ' дублей'; }, en: function(count) { return count === 0 ? '✅' : '❌ ' + count + ' duplicates'; } },
    'assertUnique.dupesMsg': { ru: function(path, by, list) { return 'Найдены дубли (' + path + (by ? '.' + by : '') + '):\n' + list; }, en: function(path, by, list) { return 'Duplicates found (' + path + (by ? '.' + by : '') + '):\n' + list; } },
    // ─── snapshot ───
    'snapshot.storeSizeWarn': { ru: function() { return 'Используй checkPaths для сокращения или очисти через snapshot-clear метод.'; }, en: function() { return 'Use checkPaths to shorten it or clear it via the snapshot-clear method.'; } },
    'snapshot.recordWarn': { ru: function(rkey) { return '📸 snapshotRecord: baseline перезаписан для "' + rkey + '" — не забудь убрать флаг record (иначе регрессии не ловятся)'; }, en: function(rkey) { return '📸 snapshotRecord: baseline overwritten for "' + rkey + '" — don\'t forget to remove the record flag (otherwise regressions will not be caught)'; } },
    'snapshot.recordTest': { ru: function() { return '📸 Snapshot: 🔴 baseline перезаписан (record)'; }, en: function() { return '📸 Snapshot: 🔴 baseline overwritten (record)'; } },
    'snapshot.postmanApiUnimpl': { ru: function() { return 'snapshot: storage "postman-api" ещё не реализован'; }, en: function() { return 'snapshot: storage "postman-api" is not implemented yet'; } },
    'snapshot.missingTest': { ru: function() { return '📸 Snapshot: не найден (autoSaveMissing отключён)'; }, en: function() { return '📸 Snapshot: not found (autoSaveMissing disabled)'; } },
    'snapshot.missingMsg': { ru: function(key) { return '🚫 Снапшот "' + key + '" не найден'; }, en: function(key) { return '🚫 Snapshot "' + key + '" not found'; } },
    'snapshot.savedTest': { ru: function() { return '📸 Snapshot: ✅ baseline сохранён'; }, en: function() { return '📸 Snapshot: ✅ baseline saved'; } },
    'snapshot.compareTest': { ru: function(mode, pathsLabel, isEqual) { return '📸 Snapshot ' + mode + ' ' + pathsLabel + ': ' + (isEqual ? '✅ совпадает' : '❌ расхождение'); }, en: function(mode, pathsLabel, isEqual) { return '📸 Snapshot ' + mode + ' ' + pathsLabel + ': ' + (isEqual ? '✅ matches' : '❌ mismatch'); } },
    'snapshot.diffMsg': { ru: function(diffStr, diffLen) { return '🚫 Snapshot расхождение:\n' + diffStr + (diffLen > 5 ? '\n  ... и ещё ' + (diffLen - 5) : ''); }, en: function(diffStr, diffLen) { return '🚫 Snapshot mismatch:\n' + diffStr + (diffLen > 5 ? '\n  ... and ' + (diffLen - 5) + ' more' : ''); } },
    'snapshot.diffWarn': { ru: function(count, diffStr) { return '📸 Snapshot diff (' + count + ' различий):\n' + diffStr; }, en: function(count, diffStr) { return '📸 Snapshot diff (' + count + ' differences):\n' + diffStr; } },
    'snapshot.typeDiff_helper_findDiff_noCtx': { ru: function(path, storedType, currentType) { return path + ': тип "' + storedType + '" → "' + currentType + '"'; }, en: function(path, storedType, currentType) { return path + ': type "' + storedType + '" → "' + currentType + '"'; } },
    'snapshot.arrayObjectMismatch_helper_findDiff_noCtx': { ru: function(path) { return path + ': array/object несовпадение'; }, en: function(path) { return path + ': array/object mismatch'; } },
    'snapshot.keyRemoved_helper_findDiff_noCtx': { ru: function(np, val) { return np + ': ключ удалён (был ' + val + ')'; }, en: function(np, val) { return np + ': key removed (was ' + val + ')'; } },
    'snapshot.keyAdded_helper_findDiff_noCtx': { ru: function(np, val) { return np + ': ключ добавлен = ' + val; }, en: function(np, val) { return np + ': key added = ' + val; } },
    'snapshot.expectedArray_helper_nonStrictMatch_noCtx': { ru: function(path) { return path + ': ожидался массив'; }, en: function(path) { return path + ': expected an array'; } },
    'snapshot.keyMissing_helper_nonStrictMatch_noCtx': { ru: function(np) { return np + ': ключ отсутствует'; }, en: function(np) { return np + ': key missing'; } },
    // ─── schema ───
    'schema.noData': { ru: function() { return 'schema: нет данных для валидации (ответ не распарсен)'; }, en: function() { return 'schema: no data to validate (response was not parsed)'; } },
    'schema.tv4Missing': { ru: function() { return 'schema: tv4 не доступен в этой версии Postman'; }, en: function() { return 'schema: tv4 is not available in this version of Postman'; } },
    'schema.testName': { ru: function(valid, count) { return '🔬 Schema: ' + (valid ? '✅ валидна' : '❌ ошибки (' + count + ')'); }, en: function(valid, count) { return '🔬 Schema: ' + (valid ? '✅ valid' : '❌ errors (' + count + ')'); } },
    'schema.validationError': { ru: function(message) { return 'schema: ошибка валидации — ' + message; }, en: function(message) { return 'schema: validation error — ' + message; } },
    // ─── plugins ───
    'plugins.parseError': { ru: function(message) { return 'plugins: ошибка разбора hephaestus.plugins — ' + message; }, en: function(message) { return 'plugins: error parsing hephaestus.plugins — ' + message; } },
    'plugins.readFailed': { ru: function(name, post, message) { return 'plugin "' + name + '": не удалось прочитать "' + post + '" — ' + message; }, en: function(name, post, message) { return 'plugin "' + name + '": failed to read "' + post + '" — ' + message; } },
    'plugins.varEmpty': { ru: function(name, post) { return 'plugin "' + name + '": переменная "' + post + '" пуста'; }, en: function(name, post) { return 'plugin "' + name + '": variable "' + post + '" is empty'; } },
    'plugins.execError': { ru: function(name, message) { return 'plugin "' + name + '": ошибка выполнения — ' + message; }, en: function(name, message) { return 'plugin "' + name + '": execution error — ' + message; } },
    'plugins.testError': { ru: function(name) { return '🔌 Plugin "' + name + '": ошибка'; }, en: function(name) { return '🔌 Plugin "' + name + '": error'; } },
    // ─── securityAudit ───
    'securityAudit.requireHeaderName': { ru: function(h) { return 'Заголовок безопасности: ' + h; }, en: function(h) { return 'Security header: ' + h; } },
    'securityAudit.requireHeaderDetail': { ru: function(h) { return 'отсутствует защитный заголовок "' + h + '"'; }, en: function(h) { return 'missing security header "' + h + '"'; } },
    'securityAudit.forbidHeaderName': { ru: function(h) { return 'Нет раскрытия сервера: ' + h; }, en: function(h) { return 'No server disclosure: ' + h; } },
    'securityAudit.forbidHeaderDetail': { ru: function(h, v) { return 'заголовок "' + h + '" раскрывает "' + v + '"'; }, en: function(h, v) { return 'header "' + h + '" discloses "' + v + '"'; } },
    'securityAudit.bodyLeakName': { ru: function() { return 'Нет утечек отладки в теле ответа'; }, en: function() { return 'No debug leaks in response body'; } },
    'securityAudit.bodyLeakDetail': { ru: function(leaks) { return 'найдены утечки: ' + leaks; }, en: function(leaks) { return 'leaks found: ' + leaks; } },
    'securityAudit.corsName': { ru: function() { return 'CORS: нет wildcard-origin с credentials'; }, en: function() { return 'CORS: no wildcard-origin with credentials'; } },
    'securityAudit.corsDetail': { ru: function() { return 'Access-Control-Allow-Origin: * вместе с Allow-Credentials: true'; }, en: function() { return 'Access-Control-Allow-Origin: * together with Allow-Credentials: true'; } },
    // ─── logger ───
    'logger.snapshotDiffCount': { ru: function(count) { return ' (' + count + ' различий)'; }, en: function(count) { return ' (' + count + ' differences)'; } },
    'logger.schemaValid': { ru: function() { return '✅ валидна'; }, en: function() { return '✅ valid'; } },
    'logger.schemaErrors': { ru: function(count) { return '❌ ' + count + ' ошибок'; }, en: function(count) { return '❌ ' + count + ' errors'; } },
    'logger.emptyResponse': { ru: function() { return '— (пустой ответ)'; }, en: function() { return '— (empty response)'; } },
    // ─── envRequired ───
    'envRequired.noEnv': { ru: function() { return '(нет environment)'; }, en: function() { return '(no environment)'; } },
    'envRequired.missingTest': { ru: function(missing) { return '⚠️ envRequired: отсутствуют переменные [' + missing.join(', ') + ']'; }, en: function(missing) { return '⚠️ envRequired: missing variables [' + missing.join(', ') + ']'; } },
    'envRequired.missingError': { ru: function(missing, envName) { return 'Обязательные environment variables не заданы:\n' + missing.map(function(n) { return '  • ' + n; }).join('\n') + '\n' + 'Текущий environment: ' + envName + '\n' + 'Проверь настройки environment в Postman / Newman.'; }, en: function(missing, envName) { return 'Required environment variables not set:\n' + missing.map(function(n) { return '  • ' + n; }).join('\n') + '\n' + 'Current environment: ' + envName + '\n' + 'Check the environment settings in Postman / Newman.'; } },
    'envRequired.missingPush': { ru: function(missing, envName) { return 'envRequired: не заданы [' + missing.join(', ') + '] в environment "' + envName + '"'; }, en: function(missing, envName) { return 'envRequired: not set [' + missing.join(', ') + '] in environment "' + envName + '"'; } },
    // ─── urlBuilder ───
    'urlBuilder.protocolSubstituted': { ru: function(defaultProtocol) { return '🌐 urlBuilder: протокол не указан — подставлен "' + defaultProtocol + '://"'; }, en: function(defaultProtocol) { return '🌐 urlBuilder: protocol not specified — substituted "' + defaultProtocol + '://"'; } },
    'urlBuilder.baseUrlSet': { ru: function() { return '🌐 URL: базовый адрес задан'; }, en: function() { return '🌐 URL: base address is set'; } },
    'urlBuilder.baseUrlMissing': { ru: function() { return '🚫 baseUrl не задан ни в defaults, ни в override'; }, en: function() { return '🚫 baseUrl is not set in either defaults or override'; } },
    'urlBuilder.insecureHttp': { ru: function() { return '⚠️ URL: небезопасный протокол http'; }, en: function() { return '⚠️ URL: insecure http protocol'; } },
    'urlBuilder.httpWarning': { ru: function() { return '⚠️ baseUrl использует http:// — убедись, что это намеренно.'; }, en: function() { return '⚠️ baseUrl uses http:// — make sure this is intentional.'; } },
    // ─── auth ───
    'auth.oauth2ccNoResponse': { ru: function(err) { return 'oauth2cc: ' + (err ? err.message : 'нет ответа'); }, en: function(err) { return 'oauth2cc: ' + (err ? err.message : 'no response'); } },
    'auth.oauth2ccInvalidJson': { ru: function() { return 'oauth2cc: невалидный JSON в ответе сервера авторизации'; }, en: function() { return 'oauth2cc: invalid JSON in authorization server response'; } },
    'auth.oauth2ccNoAccessToken': { ru: function() { return 'oauth2cc: нет access_token в ответе'; }, en: function() { return 'oauth2cc: no access_token in response'; } },
    'auth.unknownType': { ru: function(type) { return 'auth: неизвестный тип "' + type + '". Допустимые: none, basic, bearer, headers, variables, oauth2cc'; }, en: function(type) { return 'auth: unknown type "' + type + '". Allowed: none, basic, bearer, headers, variables, oauth2cc'; } },
    'auth.error': { ru: function(msg) { return 'auth: ошибка — ' + msg; }, en: function(msg) { return 'auth: error — ' + msg; } },
    // ─── dateUtils ───
    'dateUtils.unknownExpr': { ru: function(expr, varName) { return 'dateUtils: неизвестное выражение "' + expr + '" для "' + varName + '"'; }, en: function(expr, varName) { return 'dateUtils: unknown expression "' + expr + '" for "' + varName + '"'; } },
    // ─── logger ───
    'logger.authNone': { ru: function() { return 'none (отключена)'; }, en: function() { return 'none (disabled)'; } },
    'logger.unknownAuthType': { ru: function(type) { return type + ' (неизвестный тип)'; }, en: function(type) { return type + ' (unknown type)'; } },
    'logger.initErrors': { ru: function() { return '⚠️  [Hephaestus] Ошибки инициализации:\n'; }, en: function() { return '⚠️  [Hephaestus] Initialization errors:\n'; } },
    // ─── configMerge ───
    'configMerge.parseDefaultsFailed': { ru: function(message) { return 'configMerge: не удалось разобрать hephaestus.defaults — ' + message; }, en: function(message) { return 'configMerge: failed to parse hephaestus.defaults — ' + message; } },
    // ─── engine ───
    'engine.postCritical': { ru: function() { return '🚫 Hephaestus post-request: критическая ошибка'; }, en: function() { return '🚫 Hephaestus post-request: critical error'; } },
    'engine.preCritical': { ru: function() { return '🚫 Hephaestus pre-request: критическая ошибка'; }, en: function() { return '🚫 Hephaestus pre-request: critical error'; } },
};

export function t(ctx, id) {
    const entry = M[id];
    if (!entry) return id;
    const args = Array.prototype.slice.call(arguments, 2);
    const fn = entry[locOf(ctx)] || entry.ru;
    return fn.apply(null, args);
}
