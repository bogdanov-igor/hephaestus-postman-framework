/**
 * Hephaestus Plugin — Custom Assertion Library
 *
 * Регистрирует дополнительные pm.test-проверки поверх стандартного пайплайна.
 * Используй как отправную точку для своей библиотеки.
 *
 * Доступные объекты:
 *   ctx.api.body    — parsed response body (object | string)
 *   ctx.api.status  — HTTP status code (number)
 *   ctx.api.headers — response headers object (lowercase keys)
 *   ctx.api.responseTime — ms (number)
 *   ctx.config      — merged hephaestus config for this request
 *   ctx.iteration   — { index, count, data, get(key) }
 *
 * Установка:
 *   Сохрани этот файл в collectionVariable: hephaestus.plugin.custom
 *   Добавь в hephaestus.plugins:
 *
 *   pm.collectionVariables.set('hephaestus.plugins', JSON.stringify([
 *       { name: 'custom-assertions', code: pm.collectionVariables.get('hephaestus.plugin.custom') }
 *   ]));
 */

(function customAssertions(ctx) {

    // ── Helpers ────────────────────────────────────────────────────────────

    function getPath(obj, path) {
        return path.split('.').reduce(function(acc, key) {
            return acc !== null && acc !== undefined ? acc[key] : undefined;
        }, obj);
    }

    function assert(name, fn) {
        pm.test(name, function() { fn(); });
    }

    var body   = ctx.api.body;
    var status = ctx.api.status;
    var time   = ctx.api.responseTime;

    // ── Example: response time SLA ─────────────────────────────────────────
    // Провалит тест, если ответ медленнее 3 сек.
    var slaMs = ctx.config.slaMsLimit || 3000;
    assert('⏱ Response time < ' + slaMs + 'ms', function() {
        pm.expect(time).to.be.below(slaMs, 'Response time ' + time + 'ms exceeds SLA of ' + slaMs + 'ms');
    });

    // ── Example: pagination contract ───────────────────────────────────────
    // Если тело — объект и содержит "page", проверяем контракт пагинации.
    if (body && typeof body === 'object' && 'page' in body) {
        assert('📄 Pagination: page >= 1', function() {
            pm.expect(body.page).to.be.at.least(1);
        });
        assert('📄 Pagination: perPage present', function() {
            pm.expect(body).to.have.property('perPage');
        });
        assert('📄 Pagination: total present', function() {
            pm.expect(body).to.have.property('total');
        });
    }

    // ── Example: error response contract ──────────────────────────────────
    // Для 4xx/5xx: тело должно иметь поле "error" или "message"
    if (status >= 400) {
        assert('🚨 Error body has message field', function() {
            pm.expect(body).to.satisfy(function(b) {
                return b && (typeof b.error !== 'undefined' || typeof b.message !== 'undefined');
            }, 'Error response should contain "error" or "message" field');
        });
    }

    // ── Example: data-driven field check ──────────────────────────────────
    // Если запущено с --iteration-data и строка содержит expectedId,
    // проверяем что id в ответе совпадает.
    var expectedId = ctx.iteration.get('expectedId');
    if (expectedId !== undefined && body && body.id !== undefined) {
        assert('🔄 Response id matches iteration expectedId', function() {
            pm.expect(String(body.id)).to.equal(String(expectedId));
        });
    }

    // ── Example: CORS header ───────────────────────────────────────────────
    // Проверяем наличие заголовка Access-Control-Allow-Origin на API-ответах
    if (ctx.config.checkCors) {
        assert('🌐 CORS: Access-Control-Allow-Origin present', function() {
            pm.expect(ctx.api.headers).to.have.property('access-control-allow-origin');
        });
    }

    // ── Example: JSON:API compliant body ──────────────────────────────────
    if (ctx.config.assertJsonApi && body && typeof body === 'object') {
        assert('📦 JSON:API: top-level "data" key present', function() {
            pm.expect(body).to.have.property('data');
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    // Добавь свои проверки ниже этой строки:
    // ─────────────────────────────────────────────────────────────────────

}(ctx));
