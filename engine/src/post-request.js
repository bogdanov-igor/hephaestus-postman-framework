// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Hephaestus v3 — Post-Request Engine                        v3.9.0      ║
// ║  Хранится в collectionVariables["hephaestus.v3.post"]                  ║
// ║  Обновляется через setup/engine-update.js                               ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║  © 2026 Bogdanov Igor  bogdanov.ig.alex@gmail.com                       ║
// ║  https://github.com/bogdanov-igor/hephaestus-postman-framework          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// configMerge · iterationData · normalizeResponse · metrics · extractor (ctx.api)
// assertions: keysToFind (soft/when) / varsToSave / keysToCount / assertMap / maxResponseTime
// retryOnStatus · assertEach · assertShape · assertOrder · assertUnique · assertHeaders · snapshot · schema (tv4) · plugins · logger

import { configMerge } from './shared/config-merge.js';
import { iterationData } from './shared/iteration-data.js';
import { isSensitive } from './shared/mask.js';
import { t, statusLabel } from './shared/i18n.js';

(function hephaestusPostRequest() {

    const VERSION = '3.9.0';

    // override объявлен СНАРУЖИ (в скрипте метода), eval видит его через scope
    const _override = (typeof override !== 'undefined' && override !== null)
        ? override
        : {};

    // STATUS_LABELS перенесены в engine/src/shared/i18n.js (statusLabel(ctx, code))

    // ════════════════════════════════════════════════════════════
    // CTX
    // ════════════════════════════════════════════════════════════
    /** @type {import('./types.js').Ctx} */
    const ctx = {
        config: {},
        request: {
            method: pm.request.method,
            name:   pm.info.requestName,
            url:    (pm.request.url || '').toString()
        },
        response: {
            code:        pm.response.code,
            time:        pm.response.responseTime,
            size:        pm.response.responseSize,
            raw:         pm.response.text(),
            parsed:      null,
            contentType: (pm.response.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase(),
            format:      'unknown',
            _statusLabel:   '',
            _statusEmoji:   '',
            _sizeFormatted: ''
        },
        api: null,
        _meta: {
            version:     VERSION,
            processedAt: new Date().toISOString(),
            errors:      [],
            results: {
                found:    [],  // [{ name, path, ok }]
                saved:    [],  // [{ name, scope, ok }]
                counts:   [],  // [{ alias, length, expected, ok }]
                headers:  [],  // [{ name, value?, ok, status? }]
                snapshot: null, // { status, key, diff? }
                schema:   null  // { valid, errors }
            }
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: configMerge
    // ⚠️ SHARED — идентичная копия живёт в engine/pre-request.js
    //    При изменении — обновить оба файла синхронно.
    //    TODO (v4): вынести в engine/shared/config-merge.js + build-step
    // ════════════════════════════════════════════════════════════
// configMerge → импортируется из ./shared/config-merge.js (esbuild inline)

    // iterationData → импортируется из ./shared/iteration-data.js (esbuild inline)
    // post-request вызывает run(ctx) без inject — запрос уже отправлен.

    // ════════════════════════════════════════════════════════════
    // MODULE: normalizeResponse
    // ════════════════════════════════════════════════════════════
    const normalizeResponse = {
        _tryXml(ctx, raw) {
            // xml2js (Postman v10+, non-deprecated)
            try {
                const xml2js = require('xml2js');
                const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
                var xmlParsed = null;
                parser.parseString(raw, function(err, result) { if (!err && result) xmlParsed = result; });
                if (xmlParsed !== null) { ctx.response.parsed = xmlParsed; ctx.response.format = 'xml'; return true; }
            } catch (e) { /* xml2js unavailable, try fallback */ }
            // Fallback: xml2Json (deprecated but supported)
            try {
                ctx.response.parsed = xml2Json(raw);
                ctx.response.format = 'xml';
                return true;
            } catch (e) { return false; }
        },
        run(ctx) {
            const raw = ctx.response.raw;
            const ct  = ctx.response.contentType;
            if (ct.includes('json') || ct.includes('javascript')) {
                try { ctx.response.parsed = pm.response.json(); ctx.response.format = 'json'; return; }
                catch (e) { /* fall through */ }
            }
            if (ct.includes('xml') || ct.includes('html')) {
                if (this._tryXml(ctx, raw)) return;
            }
            if (ct === 'text/plain') { ctx.response.format = 'text'; return; }
            try { ctx.response.parsed = JSON.parse(raw); ctx.response.format = 'json'; return; }
            catch (e) { /* not json */ }
            if (this._tryXml(ctx, raw)) return;
            if (raw && raw.length > 0) ctx.response.format = 'text';
        },

        // Экспонирует тело и заголовки запроса в ctx.request
        // для echo-тестирования и плагинов:
        //   ctx.request.body       — raw string тела запроса
        //   ctx.request.bodyParsed — распарсенный объект (если JSON)
        //   ctx.request.headers    — объект заголовков запроса (ключи в нижнем регистре)
        runRequestContext(ctx) {
            try {
                const reqBody = pm.request.body;
                const rawBody = reqBody ? (reqBody.raw || null) : null;
                ctx.request.body = rawBody;
                ctx.request.bodyParsed = null;
                if (rawBody) {
                    try { ctx.request.bodyParsed = JSON.parse(rawBody); } catch(e) { /* not JSON */ }
                }
            } catch(e) { ctx.request.body = null; ctx.request.bodyParsed = null; }

            ctx.request.headers = {};
            try {
                pm.request.headers.each(function(h) {
                    if (h && h.key) ctx.request.headers[h.key.toLowerCase()] = h.value;
                });
            } catch(e) { /* headers недоступны */ }
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: metrics
    //
    // expectedStatus — ожидаемые HTTP-статусы (число или массив):
    //   expectedStatus: 204          → только 204
    //   expectedStatus: [200, 201]   → 200 или 201
    //   не задано                   → [200, 201, 202] по умолчанию
    //
    // Используй для негативного тестирования:
    //   expectedStatus: 400  → тест пройдёт при 400 Bad Request
    //   expectedStatus: 404  → тест пройдёт при 404 Not Found
    // ════════════════════════════════════════════════════════════
    const metrics = {
        _formatSize(bytes) {
            if (!bytes || bytes === 0) return '0 B';
            if (bytes < 1024)         return bytes + ' B';
            if (bytes < 1024 * 1024)  return (bytes / 1024).toFixed(2) + ' KB';
            return (bytes / 1024 / 1024).toFixed(2) + ' MB';
        },
        _resolveAllowed(cfg) {
            const es = cfg.expectedStatus;
            if (Array.isArray(es) && es.length > 0) return es;
            if (typeof es === 'number')             return [es];
            return [200, 201, 202];
        },
        run(ctx) {
            const { code, size } = ctx.response;
            const label   = statusLabel(ctx, code);
            const allowed = this._resolveAllowed(ctx.config);
            const isOk    = allowed.includes(code);
            const emoji   = isOk ? '🟢' : (code >= 400 && code < 500 ? '🟡' : '🔴');
            ctx.response._statusLabel   = label;
            ctx.response._statusEmoji   = emoji;
            ctx.response._sizeFormatted = this._formatSize(size);

            const allowedLabel = allowed.length === 1 ? allowed[0] : '[' + allowed.join(', ') + ']';
            pm.test(t(ctx, 'metrics.status', emoji, code, label), () => {
                pm.expect(code, t(ctx, 'metrics.statusExpect', code, allowedLabel)).to.be.oneOf(allowed);
            });

            const expectEmpty = ctx.config.expectEmpty === true;
            pm.test(t(ctx, 'metrics.bodyName', expectEmpty), () => {
                if (!expectEmpty) pm.expect(ctx.response.raw, t(ctx, 'metrics.bodyEmpty')).to.have.length.above(0);
                else              pm.expect(ctx.response.raw, t(ctx, 'metrics.bodyNotEmpty')).to.have.length.below(10);
            });

            const expectedType = (ctx.config.contentType || '').toLowerCase();
            if (!expectEmpty && expectedType) {
                pm.test(t(ctx, 'metrics.contentType', (ctx.response.contentType || '—')), () => {
                    pm.expect(ctx.response.contentType, t(ctx, 'metrics.contentTypeExpect', expectedType)).to.include(expectedType);
                });
            }
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: extractor
    // ctx.api: get / find / count / save
    // ════════════════════════════════════════════════════════════
    const extractor = {
        _getDeep(obj, path) {
            if (!path) return undefined;
            const parts = path.replace(/\[(\d+)\]/g, '.$1').replace(/\[\*\]|\[\]/g, '.*')
                .split('.').filter(p => p.length > 0);
            const go = (target, idx) => {
                if (idx === parts.length) return target;
                const key = parts[idx];
                if (key === '*') {
                    if (!Array.isArray(target)) return [];
                    return target.flatMap(i => { const r = go(i, idx + 1); return r === undefined ? [] : r; });
                }
                if (target === undefined || target === null) return undefined;
                return go(target[key], idx + 1);
            };
            return go(obj, 0);
        },
        _extractArray(data, path) {
            if (!path || path === '') return Array.isArray(data) ? data : [data];
            const parts = path.replace(/\[(\d+)\]/g, '.$1').replace(/\[\*\]|\[\]/g, '.*')
                .split('.').filter(p => p.length > 0);
            const go = (target, idx) => {
                if (idx === parts.length) return Array.isArray(target) ? target : [target];
                const key = parts[idx];
                if (key === '*') {
                    if (!Array.isArray(target)) return [];
                    return target.flatMap(i => go(i, idx + 1));
                }
                if (target === undefined || target === null) return [];
                return go(target[key], idx + 1);
            };
            return go(data, 0);
        },
        _toLowerDeep(obj) {
            if (typeof obj === 'string') return obj.toLowerCase();
            if (Array.isArray(obj)) return obj.map(i => this._toLowerDeep(i));
            if (typeof obj === 'object' && obj !== null)
                return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, this._toLowerDeep(v)]));
            return obj;
        },
        run(ctx) {
            const self = this; const source = ctx.response.parsed;
            ctx.api = {
                get:   (path) => self._getDeep(source, path),
                // find(path, fn) — массив элементов по пути, опционально фильтрованный
                find:  (path, fn) => { const a = self._extractArray(source, path); return typeof fn === 'function' ? a.filter(fn) : a; },
                // all(path, fn)  — явный синоним find: все элементы (опц. с фильтром)
                all:   (path, fn) => { const a = self._extractArray(source, path); return typeof fn === 'function' ? a.filter(fn) : a; },
                count: (path) => { const a = self._extractArray(source, path); return Array.isArray(a) ? a.length : 0; },
                save:  (path, target) => {
                    const v = self._getDeep(source, path);
                    if (v !== undefined && target && target.name) {
                        const sv = typeof v === 'object' ? JSON.stringify(v) : v;
                        if (target.scope === 'environment') pm.environment.set(target.name, sv);
                        else if (target.scope === 'local')  pm.variables.set(target.name, sv);
                        else                                pm.collectionVariables.set(target.name, sv);
                    }
                    return v;
                }
            };
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: assertions
    // keysToFind / varsToSave / keysToCount
    // ════════════════════════════════════════════════════════════
    const assertions = {
        _transforms(value, t) {
            if (!t) return value;
            return (Array.isArray(t) ? t : [t]).reduce((v, fn) => { try { return typeof fn === 'function' ? fn(v) : v; } catch(e) { return v; } }, value);
        },
        _filters(arr, f, ic) {
            if (!f || !Array.isArray(arr)) return arr;
            return (Array.isArray(f) ? f : [f]).reduce((a, fn) => {
                if (typeof fn !== 'function') return a;
                try { return a.filter(item => fn(ic ? extractor._toLowerDeep(item) : item)); } catch(e) { return a; }
            }, arr);
        },
        runFind(ctx) {
            const entries = _override.keysToFind || [];
            if (!entries.length) return;
            entries.forEach(entry => {
                const e = typeof entry === 'string' ? { path: entry, name: entry } : entry;
                // soft: true — тест не падает если поле не найдено, только предупреждение
                // when: string|fn — условие пропуска (если falsy — assertion пропускается)
                const { path, name = path, expect, transform, filter, ignoreCase = false, soft: _eSoft = false, when: whenExpr } = e;
                const soft = _eSoft || !!ctx.config.softFail;

                // Проверяем условие when
                if (whenExpr !== undefined) {
                    let condResult = true;
                    try {
                        condResult = (typeof whenExpr === 'function') ? whenExpr(ctx) : eval(String(whenExpr));
                    } catch(condErr) { /* при ошибке — запускаем assertion */ }
                    if (!condResult) {
                        ctx._meta.results.found.push({ name, path, ok: true, skipped: true });
                        return; // skip
                    }
                }

                let v = ctx.api.get(path);
                if (ignoreCase && v !== undefined) v = extractor._toLowerDeep(v);
                if (Array.isArray(v) && filter)    v = this._filters(v, filter, false);
                if (v !== undefined && transform)   v = this._transforms(v, transform);
                const found  = v !== undefined && v !== null;
                const label  = t(ctx, 'assertions.found', soft, name, path);
                pm.test(label, () => {
                    if (!found) {
                        if (soft) {
                            console.log(t(ctx, 'assertions.softFieldNotFound', path));
                            pm.expect(true).to.be.true;
                            return;
                        }
                        pm.expect(v, t(ctx, 'assertions.valueNotFound', path)).to.exist;
                    }
                    if (found && expect !== undefined) {
                        if (typeof expect === 'function') pm.expect((() => { try { return expect(v); } catch(e) { return false; } })(), t(ctx, 'assertions.conditionFailed', name)).to.be.true;
                        else pm.expect(v, t(ctx, 'assertions.expectedValue', name, expect)).to.eql(expect);
                    }
                });
                ctx._meta.results.found.push({ name, path, ok: soft || found });
            });
        },
        runSave(ctx) {
            const entries = Object.entries(_override.varsToSave || {});
            if (!entries.length) return;
            entries.forEach(([, opts]) => {
                const { path, scope = 'collection', name, transform, filter, ignoreCase = false } = opts;
                let v = ctx.api.get(path); const raw = v;
                if (ignoreCase && v !== undefined) v = extractor._toLowerDeep(v);
                if (Array.isArray(v) && filter)    v = this._filters(v, filter, ignoreCase);
                if (v !== undefined && transform)   v = this._transforms(v, transform);
                let ok = false;
                pm.test(t(ctx, 'assertions.saved', name, path), () => {
                    pm.expect(raw, t(ctx, 'assertions.notFoundAtPath', name, path)).to.exist; ok = true;
                });
                if (v !== undefined) {
                    const sv = typeof v === 'object' ? JSON.stringify(v) : v;
                    if (scope === 'environment') pm.environment.set(name, sv);
                    else if (scope === 'local')  pm.variables.set(name, sv);
                    else                         pm.collectionVariables.set(name, sv);
                    if (scope !== 'collection' && scope !== 'environment' && scope !== 'local')
                        ctx._meta.errors.push(t(ctx, 'assertions.unknownScope', scope, name));
                } else {
                    ctx._meta.errors.push(t(ctx, 'assertions.varsSaveNotFound', name, path));
                }
                ctx._meta.results.saved.push({ name, scope, ok });
            });
        },
        runCount(ctx) {
            const entries = Object.entries(_override.keysToCount || {});
            if (!entries.length) return;
            entries.forEach(([alias, opts]) => {
                let { path, expected, filter, type = 'array', transformBefore, transformAfter, ignoreCase = false } = opts;
                let extracted = extractor._extractArray(ctx.response.parsed, path);
                if (type === 'object') {
                    if (extracted && typeof extracted === 'object' && !Array.isArray(extracted)) extracted = Object.entries(extracted);
                    else if (Array.isArray(extracted) && extracted.length === 1 && typeof extracted[0] === 'object' && !Array.isArray(extracted[0])) extracted = Object.entries(extracted[0]);
                    else extracted = [];
                }
                if (!Array.isArray(extracted)) extracted = [];
                if (typeof transformBefore === 'function') { try { extracted = extracted.map(i => transformBefore(i) != null ? transformBefore(i) : i).filter(Boolean); } catch(e) { ctx._meta.errors.push('keysToCount[' + alias + '] transformBefore: ' + e.message); } }
                if (ignoreCase) extracted = extractor._toLowerDeep(extracted);
                if (typeof filter === 'function') { try { extracted = extracted.filter(filter); } catch(e) { ctx._meta.errors.push('keysToCount[' + alias + '] filter: ' + e.message); } }
                if (typeof transformAfter === 'function') { try { extracted = transformAfter(extracted); } catch(e) { ctx._meta.errors.push('keysToCount[' + alias + '] transformAfter: ' + e.message); } }
                const length = Array.isArray(extracted) ? extracted.length : 0;
                const ok = expected === undefined || length === expected;
                const label = t(ctx, 'assertions.countLabel', length, expected, ok);
                pm.test(t(ctx, 'assertions.countTest', alias, label), () => {
                    if (expected !== undefined) pm.expect(length, t(ctx, 'assertions.countMismatch', alias, expected, length)).to.eql(expected);
                    else pm.expect(length).to.be.a('number');
                });
                ctx._meta.results.counts.push({ alias, length, expected, ok });
            });
        },
        // ── assertions shorthand map ───────────────────────────────────────────
        // Формат: assertions: { "path.to.field": { exists, eq, ne, gt, gte, lt, lte,
        //                                          type, minLen, maxLen, includes, matches,
        //                                          absent, soft, when } }
        // Все операторы можно комбинировать.
        // ──────────────────────────────────────────────────────────────────────
        runAssertMap(ctx) {
            const map = _override.assertions;
            if (!map || typeof map !== 'object' || Array.isArray(map)) return;

            Object.keys(map).forEach(function(fieldPath) {
                const rule = map[fieldPath];
                if (!rule || typeof rule !== 'object') return;

                const soft = rule.soft === true || !!ctx.config.softFail;

                // Условие when
                if (rule.when !== undefined) {
                    let condResult = true;
                    try {
                        condResult = (typeof rule.when === 'function') ? rule.when(ctx) : eval(String(rule.when));
                    } catch(condErr) { /* при ошибке — запускаем */ }
                    if (!condResult) {
                        ctx._meta.results.found.push({ name: fieldPath, path: fieldPath, ok: true, skipped: true });
                        return;
                    }
                }

                const raw = ctx.api.get(fieldPath);

                function check(label, fn) {
                    if (soft) {
                        pm.test((soft ? '⚪ [soft] ' : '🔬 ') + label + ' [' + fieldPath + ']', function() {
                            let ok = true;
                            try { fn(); } catch(e) { ok = false; console.warn('⚪ soft: ' + e.message); }
                            pm.expect(ok).to.be.true;
                        });
                    } else {
                        pm.test('🔬 ' + label + ' [' + fieldPath + ']', function() { fn(); });
                    }
                }

                // absent — поле должно ОТСУТСТВОВАТЬ
                if (rule.absent === true) {
                    check('absent', function() {
                        pm.expect(raw, t(ctx, 'assertions.mustBeAbsent', fieldPath)).to.be.oneOf([undefined, null]);
                    });
                    ctx._meta.results.found.push({ name: fieldPath, path: fieldPath, ok: raw === undefined || raw === null });
                    return;
                }

                // exists — поле существует (явная проверка или подразумевается при других операторах)
                if (rule.exists === false) {
                    check(t(ctx, 'assertions.notExists'), function() {
                        pm.expect(raw, t(ctx, 'assertions.mustBeAbsent', fieldPath)).to.be.oneOf([undefined, null]);
                    });
                    ctx._meta.results.found.push({ name: fieldPath, path: fieldPath, ok: raw === undefined || raw === null });
                    return;
                }

                // Для всех остальных операторов — поле должно существовать
                check('exists', function() {
                    pm.expect(raw, t(ctx, 'assertions.fieldNotFound', fieldPath)).to.not.be.oneOf([undefined, null]);
                });
                ctx._meta.results.found.push({ name: fieldPath, path: fieldPath, ok: raw !== undefined && raw !== null });

                if (raw === undefined || raw === null) return; // нет смысла продолжать

                if (rule.eq !== undefined)
                    check('eq ' + JSON.stringify(rule.eq), function() { pm.expect(raw).to.eql(rule.eq); });
                if (rule.ne !== undefined)
                    check('ne ' + JSON.stringify(rule.ne), function() { pm.expect(raw).to.not.eql(rule.ne); });
                if (rule.gt !== undefined)
                    check('> ' + rule.gt, function() { pm.expect(raw).to.be.above(rule.gt); });
                if (rule.gte !== undefined)
                    check('>= ' + rule.gte, function() { pm.expect(raw).to.be.at.least(rule.gte); });
                if (rule.lt !== undefined)
                    check('< ' + rule.lt, function() { pm.expect(raw).to.be.below(rule.lt); });
                if (rule.lte !== undefined)
                    check('<= ' + rule.lte, function() { pm.expect(raw).to.be.at.most(rule.lte); });

                if (rule.type !== undefined)
                    check('type=' + rule.type, function() {
                        if (rule.type === 'array')  pm.expect(raw, t(ctx, 'assertions.expectedArray')).to.be.an('array');
                        else if (rule.type === 'null') pm.expect(raw, t(ctx, 'assertions.expectedNull')).to.be.null;
                        else pm.expect(typeof raw, t(ctx, 'assertions.expectedType', rule.type)).to.equal(rule.type);
                    });

                if (rule.minLen !== undefined)
                    check('minLen=' + rule.minLen, function() {
                        const len = Array.isArray(raw) ? raw.length : (typeof raw === 'string' ? raw.length : -1);
                        pm.expect(len, t(ctx, 'assertions.lenBelow', len, rule.minLen)).to.be.at.least(rule.minLen);
                    });
                if (rule.maxLen !== undefined)
                    check('maxLen=' + rule.maxLen, function() {
                        const len = Array.isArray(raw) ? raw.length : (typeof raw === 'string' ? raw.length : Infinity);
                        pm.expect(len, t(ctx, 'assertions.lenAbove', len, rule.maxLen)).to.be.at.most(rule.maxLen);
                    });

                if (rule.includes !== undefined)
                    check('includes ' + JSON.stringify(rule.includes), function() {
                        if (Array.isArray(raw)) pm.expect(raw).to.include(rule.includes);
                        else pm.expect(String(raw)).to.include(String(rule.includes));
                    });

                if (rule.matches !== undefined)
                    check('matches ' + rule.matches, function() {
                        const re = rule.matches instanceof RegExp ? rule.matches : new RegExp(rule.matches);
                        pm.expect(re.test(String(raw)), t(ctx, 'assertions.notMatch', raw, re)).to.be.true;
                    });
            });
        },

        // maxResponseTime: ctx.config.maxResponseTime (число, мс)
        runMaxTime(ctx) {
            const max = ctx.config.maxResponseTime;
            if (!max || typeof max !== 'number') return;
            const time = ctx.response.time;
            const ok   = time <= max;
            pm.test('⏱ Time < ' + max + 'ms: ' + time + 'ms ' + (ok ? '✅' : '❌'), () => {
                pm.expect(time, '🚫 Response time exceeded: ' + time + 'ms > ' + max + 'ms').to.be.at.most(max);
            });
        },
        // maxBytes: ctx.config.maxBytes (число) — бюджет размера ответа в байтах.
        runMaxBytes(ctx) {
            const max = ctx.config.maxBytes;
            if (typeof max !== 'number' || max <= 0) return;
            const size = ctx.response.size;
            if (typeof size !== 'number') return;
            pm.test(t(ctx, 'assertions.maxBytesName', max, size), () => {
                pm.expect(size, t(ctx, 'assertions.maxBytesExceed', size, max)).to.be.at.most(max);
            });
        },
        run(ctx) {
            // The size budget doesn't need a parsed body — check it before the
            // notParsed early-return so an oversized binary/garbage payload is caught.
            this.runMaxBytes(ctx);
            if (!ctx.response.parsed && ctx.response.format !== 'text') {
                ctx._meta.errors.push(t(ctx, 'assertions.notParsed')); return;
            }
            this.runFind(ctx); this.runSave(ctx); this.runCount(ctx); this.runAssertMap(ctx); this.runMaxTime(ctx);
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: assertEach
    //
    // Проверяет каждый элемент массива по набору правил.
    // Все операторы идентичны assertions shorthand map.
    //
    //   assertEach: {
    //     path:     "data.items",        // JSONPath к массиву
    //     minCount: 1,                   // минимум N элементов (опционально)
    //     maxCount: 100,                 // максимум N элементов (опционально)
    //     rules: {                       // правила для каждого элемента
    //       "id":     { type: "number", gt: 0 },
    //       "status": { exists: true },
    //       "email":  { matches: "@", soft: true }
    //     }
    //   }
    //
    // Нарушения агрегируются и выводятся одним pm.test (до 10 строк).
    // ════════════════════════════════════════════════════════════
    const assertEach = {
        _serVal(v) {
            if (v === undefined) return 'undefined';
            if (v === null)      return 'null';
            if (typeof v !== 'object') return JSON.stringify(v);
            var s = JSON.stringify(v);
            return s.length > 80 ? s.slice(0, 77) + '...' : s;
        },

        _checkRule(field, rule, item, idx) {
            const val  = extractor._getDeep(item, field);
            const path = '[' + idx + '].' + field;
            const errs = [];

            // absent
            if (rule.absent === true) {
                if (val !== undefined && val !== null) errs.push(t(ctx, 'assertEach.ruleAbsentGot', path, this._serVal(val)));
                return errs;
            }
            // exists / non-null check
            if (rule.exists !== false) {
                if (val === undefined || val === null) {
                    errs.push(t(ctx, 'assertEach.ruleFieldMissing', path));
                    return errs; // нет смысла продолжать операторы
                }
            } else if (rule.exists === false) {
                if (val !== undefined && val !== null) errs.push(t(ctx, 'assertEach.ruleAbsent', path));
                return errs;
            }

            if (val === undefined || val === null) return errs;

            if (rule.eq  !== undefined && val !== rule.eq)          errs.push(path + ': eq ' + this._serVal(rule.eq)  + ', got ' + this._serVal(val));
            if (rule.ne  !== undefined && val === rule.ne)          errs.push(path + ': ne ' + this._serVal(rule.ne)  + ', got ' + this._serVal(val));
            if (rule.gt  !== undefined && !(val >  rule.gt))        errs.push(path + ': > '  + rule.gt  + ', got ' + this._serVal(val));
            if (rule.gte !== undefined && !(val >= rule.gte))       errs.push(path + ': >= ' + rule.gte + ', got ' + this._serVal(val));
            if (rule.lt  !== undefined && !(val <  rule.lt))        errs.push(path + ': < '  + rule.lt  + ', got ' + this._serVal(val));
            if (rule.lte !== undefined && !(val <= rule.lte))       errs.push(path + ': <= ' + rule.lte + ', got ' + this._serVal(val));

            if (rule.type !== undefined) {
                const actual = Array.isArray(val) ? 'array' : (val === null ? 'null' : typeof val);
                if (actual !== rule.type) errs.push(path + ': type=' + rule.type + ', got ' + actual);
            }

            const len = Array.isArray(val) ? val.length : (typeof val === 'string' ? val.length : null);
            if (rule.minLen !== undefined && len !== null && len < rule.minLen) errs.push(path + ': minLen=' + rule.minLen + ', got ' + len);
            if (rule.maxLen !== undefined && len !== null && len > rule.maxLen) errs.push(path + ': maxLen=' + rule.maxLen + ', got ' + len);

            if (rule.includes !== undefined) {
                const ok = Array.isArray(val) ? val.indexOf(rule.includes) !== -1 : String(val).indexOf(String(rule.includes)) !== -1;
                if (!ok) errs.push(path + ': includes ' + this._serVal(rule.includes) + ' — not found');
            }
            if (rule.matches !== undefined) {
                const re = rule.matches instanceof RegExp ? rule.matches : new RegExp(rule.matches);
                if (!re.test(String(val))) errs.push(path + ': matches ' + rule.matches + ' — no match on ' + this._serVal(val));
            }

            return errs;
        },

        run(ctx) {
            const cfg = _override.assertEach;
            if (!cfg || typeof cfg !== 'object') return;

            const arr = ctx.api.get(cfg.path);

            if (!Array.isArray(arr)) {
                pm.test(t(ctx, 'assertEach.notArray', cfg.path), function() {
                    pm.expect(arr, t(ctx, 'assertEach.notArrayMsg', cfg.path, typeof arr)).to.be.an('array');
                });
                return;
            }

            // Bounds
            if (cfg.minCount !== undefined) {
                const ok = arr.length >= cfg.minCount;
                pm.test(t(ctx, 'assertEach.minCount', cfg.minCount, arr.length, ok), function() {
                    pm.expect(arr.length, t(ctx, 'assertEach.minCountMsg', cfg.minCount, arr.length)).to.be.at.least(cfg.minCount);
                });
            }
            if (cfg.maxCount !== undefined) {
                const ok = arr.length <= cfg.maxCount;
                pm.test(t(ctx, 'assertEach.maxCount', cfg.maxCount, arr.length, ok), function() {
                    pm.expect(arr.length, t(ctx, 'assertEach.maxCountMsg', cfg.maxCount, arr.length)).to.be.at.most(cfg.maxCount);
                });
            }

            const rules      = cfg.rules || {};
            const ruleKeys   = Object.keys(rules);
            if (!ruleKeys.length) return;

            const self         = this;
            const globalSoft   = !!ctx.config.softFail;
            const allFailures  = [];
            const softFailures = [];

            arr.forEach(function(item, idx) {
                ruleKeys.forEach(function(field) {
                    const rule = rules[field];
                    if (!rule || typeof rule !== 'object') return;
                    const errs = self._checkRule(field, rule, item, idx);
                    if (errs.length > 0) {
                        if (globalSoft || rule.soft === true) softFailures.push.apply(softFailures, errs);
                        else                                   allFailures.push.apply(allFailures, errs);
                    }
                });
            });

            const totalChecks = arr.length * ruleKeys.length;
            const hardFailed  = allFailures.length;
            const softFailed  = softFailures.length;
            const label       = t(ctx, 'assertEach.label', globalSoft, cfg.path, arr.length, ruleKeys.length);

            pm.test(t(ctx, 'assertEach.result', label, hardFailed), function() {
                if (hardFailed > 0) {
                    const preview = allFailures.slice(0, 10).join('\n');
                    throw new Error(
                        t(ctx, 'assertEach.violations', hardFailed, totalChecks, preview, allFailures.length)
                    );
                }
            });

            if (softFailed > 0) {
                softFailures.slice(0, 5).forEach(function(msg) { console.warn('⚪ [assertEach soft] ' + msg); });
            }

            ctx._meta.results.found.push({
                name: 'assertEach:' + cfg.path, path: cfg.path,
                ok: hardFailed === 0, count: arr.length, failed: hardFailed
            });
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: retryOnStatus
    //
    // Автоматически повторяет запрос, если HTTP-статус входит в список.
    // На промежуточных попытках пропускает весь pipeline (assertions, snapshot и т.д.).
    // На последней попытке падает с понятным сообщением.
    //
    //   retryOnStatus: {
    //     statuses:   [503, 429],   // статусы, при которых повторять
    //     maxRetries: 3             // макс. кол-во повторов (default: 3)
    //   }
    //
    // Счётчик хранится в pm.variables (автоочистка при успехе / исчерпании).
    // ════════════════════════════════════════════════════════════
    const retryOnStatus = {
        run(_ctx) {
            const cfg = _override.retryOnStatus;
            if (!cfg) return false; // false = pipeline continues normally

            const statuses   = Array.isArray(cfg.statuses) ? cfg.statuses : [cfg.statuses];
            const maxRetries = typeof cfg.maxRetries === 'number' ? cfg.maxRetries : 3;
            const code       = pm.response.code;

            if (!statuses.includes(code)) {
                // Clean counter on successful non-retried status
                pm.variables.unset('hephaestus.retry.' + pm.info.requestName);
                return false;
            }

            const key   = 'hephaestus.retry.' + pm.info.requestName;
            const count = parseInt(pm.variables.get(key) || '0', 10);

            if (count < maxRetries) {
                pm.variables.set(key, String(count + 1));
                pm.test('⚡ Retry ' + (count + 1) + '/' + maxRetries + ' (status ' + code + ')', function() {
                    // This test will show as "passed" to indicate retry in progress
                    // (we don't throw — we just log)
                });
                console.log(t(_ctx, 'retryOnStatus.rerunLog', (count + 1), maxRetries, code, pm.info.requestName));
                pm.setNextRequest(pm.info.requestName);
                return true; // true = skip remaining pipeline
            }

            // Max retries exhausted
            pm.variables.unset(key);
            pm.test(t(_ctx, 'retryOnStatus.exhausted', maxRetries, code), function() {
                throw new Error(
                    t(_ctx, 'retryOnStatus.allFailed', maxRetries, code, statuses.join('/'))
                );
            });
            return false; // allow pipeline to continue so logger emits the summary
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: assertShape
    //
    // Краткие структурные проверки типов — одна строка на поле.
    // Дополнение к assertions/assertEach для быстрой валидации контракта.
    //
    //   assertShape: {
    //     "data":          "object",   // typeof === 'object' && не null && не array
    //     "data.id":       "number",
    //     "data.name":     "string",
    //     "data.active":   "boolean",
    //     "data.items":    "array",
    //     "data.payload":  "null",
    //     "meta":          "any",      // поле существует, тип не важен
    //     "error":         "absent",   // поле ОТСУТСТВУЕТ
    //   }
    //
    // Поддерживаемые типы: string | number | boolean | object | array | null | any | absent
    // ════════════════════════════════════════════════════════════
    const assertShape = {
        _typeOf(v) {
            if (v === null)        return 'null';
            if (Array.isArray(v)) return 'array';
            return typeof v;
        },
        run(ctx) {
            const shape = _override.assertShape;
            if (!shape || typeof shape !== 'object' || Array.isArray(shape)) return;

            const isSoft = !!ctx.config.softFail;
            const self   = this;

            function shapeTest(label, fn) {
                pm.test((isSoft ? '⚪ [soft] ' : '') + label, function() {
                    if (isSoft) { try { fn(); } catch(e) { console.warn('⚪ [soft] ' + label + ': ' + e.message); } }
                    else { fn(); }
                });
            }

            Object.keys(shape).forEach(function(fieldPath) {
                const expected = shape[fieldPath];
                const val      = ctx.api.get(fieldPath);
                const actual   = self._typeOf(val);

                if (expected === 'absent') {
                    shapeTest('🧩 shape "' + fieldPath + '": absent', function() {
                        pm.expect(val, t(ctx, 'assertShape.mustBeAbsent', fieldPath, JSON.stringify(val))).to.be.oneOf([undefined, null]);
                    });
                    return;
                }

                if (expected === 'any') {
                    shapeTest('🧩 shape "' + fieldPath + '": exists', function() {
                        pm.expect(val, t(ctx, 'assertShape.notFound', fieldPath)).to.not.be.oneOf([undefined, null]);
                    });
                    return;
                }

                shapeTest('🧩 shape "' + fieldPath + '": ' + expected, function() {
                    pm.expect(val, t(ctx, 'assertShape.notFound', fieldPath)).to.not.be.oneOf([undefined, null]);
                    pm.expect(actual, t(ctx, 'assertShape.typeMismatch', fieldPath, expected, actual)).to.equal(expected);
                });
            });
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: graphql
    //
    // GraphQL всегда отвечает 200 — даже когда в теле есть errors[]. Этот модуль
    // проверяет контракт GraphQL-ответа: массив ошибок и форму data.*.
    //
    //   graphql: true                          // краткая форма { noErrors: true }
    //   graphql: {
    //     noErrors:      true,                  // errors[] пуст / отсутствует
    //     errorCount:    2,                     // ЛИБО ровно N ошибок (негативный тест)
    //     errorContains: "not found",           // хотя бы одна ошибка содержит подстроку
    //     dataShape:     { "user.id": "number" } // проверки типов под data.*
    //   }
    // ════════════════════════════════════════════════════════════
    const graphql = {
        _typeOf(v) { if (v === null) return 'null'; if (Array.isArray(v)) return 'array'; return typeof v; },
        run(ctx) {
            let cfg = _override.graphql;
            if (!cfg) return;
            if (cfg === true) cfg = { noErrors: true };
            if (typeof cfg !== 'object') return;

            const isSoft = !!ctx.config.softFail;
            const self   = this;
            function gqlTest(label, fn) {
                pm.test((isSoft ? '⚪ [soft] ' : '') + label, function() {
                    if (isSoft) { try { fn(); } catch(e) { console.warn('⚪ [soft] ' + label + ': ' + e.message); } }
                    else { fn(); }
                });
            }

            const errors = ctx.api.get('errors');
            const errArr = Array.isArray(errors) ? errors : [];
            const firstMsg = function() { return errArr.length ? String((errArr[0] && errArr[0].message) || errArr[0]) : ''; };

            if (cfg.noErrors === true) {
                gqlTest(t(ctx, 'graphql.noErrorsName'), function() {
                    pm.expect(errArr.length, t(ctx, 'graphql.hasErrors', errArr.length, firstMsg())).to.equal(0);
                });
            }

            if (typeof cfg.errorCount === 'number') {
                gqlTest(t(ctx, 'graphql.errorCountName', cfg.errorCount), function() {
                    pm.expect(errArr.length, t(ctx, 'graphql.errorCountFail', cfg.errorCount, errArr.length)).to.equal(cfg.errorCount);
                });
            }

            if (typeof cfg.errorContains === 'string') {
                gqlTest(t(ctx, 'graphql.errorContainsName', cfg.errorContains), function() {
                    const hit = errArr.some(function(e) { return String((e && e.message) || e).indexOf(cfg.errorContains) !== -1; });
                    pm.expect(hit, t(ctx, 'graphql.errorContainsFail', cfg.errorContains)).to.equal(true);
                });
            }

            if (cfg.dataShape && typeof cfg.dataShape === 'object' && !Array.isArray(cfg.dataShape)) {
                Object.keys(cfg.dataShape).forEach(function(p) {
                    const expected = cfg.dataShape[p];
                    const fullPath = 'data.' + p;
                    const val      = ctx.api.get(fullPath);
                    const actual   = self._typeOf(val);
                    gqlTest('🔗 GraphQL data "' + p + '": ' + expected, function() {
                        pm.expect(val, t(ctx, 'assertShape.notFound', fullPath)).to.not.be.oneOf([undefined, null]);
                        pm.expect(actual, t(ctx, 'assertShape.typeMismatch', fullPath, expected, actual)).to.equal(expected);
                    });
                });
            }
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: assertOrder
    //
    // Проверяет, что массив отсортирован по заданному полю.
    //
    //   assertOrder: {
    //     path:      "data.items",   // JSONPath к массиву
    //     by:        "createdAt",    // поле для сравнения
    //     direction: "desc",         // "asc" | "desc"
    //     type:      "date"          // "string" | "number" | "date" (опц., def: "string")
    //   }
    //
    // type "date": значение конвертируется через new Date(v).getTime()
    // type "number": Number(v)
    // type "string": локальное строковое сравнение
    // ════════════════════════════════════════════════════════════
    const assertOrder = {
        _extract(item, field) {
            return field.split('.').reduce(function(acc, k) {
                return acc !== null && acc !== undefined ? acc[k] : undefined;
            }, item);
        },

        _toComparable(v, type) {
            if (type === 'number') return Number(v);
            if (type === 'date')   return v ? new Date(v).getTime() : 0;
            return String(v);
        },

        run(ctx) {
            const cfg = _override.assertOrder;
            if (!cfg || typeof cfg !== 'object') return;

            const arr = ctx.api.get(cfg.path);
            if (!Array.isArray(arr) || arr.length < 2) return; // < 2 — сортировка тривиальна

            const by   = cfg.by;
            const dir  = (cfg.direction || 'asc').toLowerCase();
            const type = cfg.type || 'string';
            const self = this;

            const violations = [];
            for (var i = 0; i < arr.length - 1; i++) {
                var a = self._toComparable(self._extract(arr[i],     by), type);
                var b = self._toComparable(self._extract(arr[i + 1], by), type);
                var ordered = dir === 'asc' ? a <= b : a >= b;
                if (!ordered) {
                    violations.push('[' + i + '] ' + JSON.stringify(self._extract(arr[i], by)) +
                        ' → [' + (i+1) + '] ' + JSON.stringify(self._extract(arr[i+1], by)));
                    if (violations.length >= 5) break;
                }
            }

            const isSoft  = !!ctx.config.softFail;
            const label   = (isSoft ? '⚪ [soft] ' : '') + '📊 assertOrder[' + cfg.path + '] by "' + by + '" ' + dir;
            pm.test(label + ' — ' + (violations.length === 0 ? '✅' : t(ctx, 'assertOrder.violationsCount', violations.length)), function() {
                if (violations.length > 0) {
                    const msg = t(ctx, 'assertOrder.violationsMsg', dir, by, violations.join('\n'));
                    if (isSoft) { console.warn('⚪ [soft] assertOrder: ' + msg); }
                    else { throw new Error(msg); }
                }
            });
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: assertUnique
    //
    // Проверяет, что все элементы массива уникальны по значению или по полю.
    //
    //   assertUnique: {
    //     path:  "data.items",   // JSONPath к массиву (обязательно)
    //     by:    "id",           // вложенное поле (опц.; если нет — сравнивает весь элемент)
    //     label: "item IDs"      // метка для теста (опц.)
    //   }
    //
    // При softFail: true — нарушение логируется, тест не падает.
    // ════════════════════════════════════════════════════════════
    const assertUnique = {
        run(ctx) {
            const cfg = _override.assertUnique;
            if (!cfg || typeof cfg !== 'object') return;

            const arr = ctx.api.get(cfg.path);
            if (!Array.isArray(arr)) return;

            const by      = cfg.by;
            const isSoft  = !!ctx.config.softFail;
            const label   = (isSoft ? '⚪ [soft] ' : '') + '🔑 assertUnique[' + cfg.path + ']' + (by ? '.by("' + by + '")' : '') + (cfg.label ? ' — ' + cfg.label : '');

            const seen      = [];
            const dupes     = [];
            arr.forEach(function(item, i) {
                const val = by ? (item !== null && item !== undefined ? item[by] : undefined) : item;
                const key = JSON.stringify(val);
                if (seen.includes(key)) {
                    dupes.push('[' + i + '] ' + key);
                } else {
                    seen.push(key);
                }
            });

            pm.test(label + ' — ' + t(ctx, 'assertUnique.dupeCount', dupes.length), function() {
                if (dupes.length > 0) {
                    const msg = t(ctx, 'assertUnique.dupesMsg', cfg.path, by, dupes.slice(0, 5).join('\n'));
                    if (isSoft) { console.warn('⚪ [soft] assertUnique: ' + msg); }
                    else { throw new Error(msg); }
                }
            });
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: assertHeaders
    //
    // Проверяет заголовки ответа. Формат в override:
    //
    //   assertHeaders: [
    //     { name: "Content-Type", expect: "application/json" }, // содержит строку
    //     { name: "X-Request-Id" },                             // заголовок существует
    //     { name: "X-Deprecated", absent: true },               // заголовок отсутствует
    //     { name: "X-Version", equals: "v2" },                  // точное совпадение
    //     { name: "X-Count", expect: v => Number(v) > 0, name: "X-Count > 0" }
    //   ]
    // ════════════════════════════════════════════════════════════
    const assertHeaders = {
        run(ctx) {
            const entries = _override.assertHeaders || [];
            if (!entries.length) return;

            entries.forEach(function(entry) {
                if (!entry || !entry.name) return;

                const headerName  = entry.name;
                const headerValue = pm.response.headers.get(headerName);
                const label       = entry.label || headerName;

                if (entry.absent) {
                    pm.test(t(ctx, 'headers.absent', label), function() {
                        pm.expect(headerValue, t(ctx, 'headers.absentExpect', headerName)).to.be.oneOf([null, undefined, '']);
                    });
                    ctx._meta.results.headers = ctx._meta.results.headers || [];
                    ctx._meta.results.headers.push({ name: headerName, status: 'absent', ok: !headerValue });
                    return;
                }

                pm.test(t(ctx, 'headers.exists', label), function() {
                    pm.expect(headerValue, t(ctx, 'headers.existsExpect', headerName)).to.be.a('string').and.have.length.above(0);
                });

                if (entry.equals !== undefined) {
                    pm.test(t(ctx, 'headers.equals', label, entry.equals), function() {
                        pm.expect(headerValue, t(ctx, 'headers.equalsExpect', entry.equals, headerValue)).to.equal(String(entry.equals));
                    });
                } else if (typeof entry.expect === 'function') {
                    var fnResult;
                    try { fnResult = entry.expect(headerValue); } catch(e) { fnResult = false; }
                    pm.test(t(ctx, 'headers.cond', label), function() {
                        pm.expect(fnResult, t(ctx, 'headers.condExpect', headerName, headerValue)).to.be.true;
                    });
                } else if (typeof entry.expect === 'string') {
                    pm.test(t(ctx, 'headers.includes', label, entry.expect), function() {
                        pm.expect(headerValue, t(ctx, 'headers.includesExpect', headerName, entry.expect)).to.include(entry.expect);
                    });
                }

                ctx._meta.results.headers = ctx._meta.results.headers || [];
                ctx._meta.results.headers.push({ name: headerName, value: headerValue, ok: !!headerValue });
            });
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: snapshot
    //
    // Хранилище: collectionVariables["hephaestus.snapshots"] = { key: snap }
    // Ключ: {collectionName}::{requestName}::{statusCode}::{format}
    //   collectionName берётся из collectionVariables["hephaestus.collectionName"]
    //
    // Режимы:
    //   strict     — полное deep-equal сравнение (с учётом ignorePaths)
    //   non-strict — все ключи из baseline должны присутствовать в текущем ответе
    //
    // checkPaths — список путей для сравнения (оптимизирует объём хранилища)
    // ignorePaths — пути, которые исключаются из сравнения
    // autoSaveMissing — если снапшот не найден, сохранить как baseline
    //
    // storage: "collection-vars" (default; единственный backend)
    //          "postman-api" — недоступен offline: предупреждает один раз
    //                          и откатывается на collection-vars
    // ════════════════════════════════════════════════════════════
    const snapshot = {

        _key(ctx) {
            const col = pm.collectionVariables.get('hephaestus.collectionName') || 'col';
            return [col, ctx.request.name, ctx.response.code, ctx.response.format].join('::');
        },

        _loadStore() {
            try {
                const raw = pm.collectionVariables.get('hephaestus.snapshots');
                return raw ? JSON.parse(raw) : {};
            } catch (e) { return {}; }
        },

        _saveStore(store, ctx) {
            const str = JSON.stringify(store);
            // Предупреждение при приближении к лимиту collectionVariables (~1MB)
            if (str.length > 900000) {
                ctx._meta.errors.push(
                    'snapshot: hephaestus.snapshots > 900KB. ' +
                    t(ctx, 'snapshot.storeSizeWarn')
                );
            }
            pm.collectionVariables.set('hephaestus.snapshots', str);
        },

        // Строим данные для сравнения:
        // если checkPaths задан — берём только эти пути
        // иначе — весь parsed с удалёнными ignorePaths
        _buildData(ctx) {
            const cfg = ctx.config.snapshot || {};
            const source = ctx.response.parsed;
            const checkPaths  = cfg.checkPaths  || [];
            const ignorePaths = cfg.ignorePaths || [];

            if (checkPaths.length > 0) {
                const data = {};
                checkPaths.forEach(p => { data[p] = extractor._getDeep(source, p); });
                return data;
            }

            if (!source) return ctx.response.raw ? { _rawPreview: ctx.response.raw.slice(0, 500) } : {};

            try {
                const clone = JSON.parse(JSON.stringify(source));
                ignorePaths.forEach(p => this._deletePath(clone, p));
                return clone;
            } catch (e) { return source; }
        },

        _deletePath(obj, path) {
            const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(p => p.length);
            if (!parts.length) return;
            let cur = obj;
            for (let i = 0; i < parts.length - 1; i++) {
                if (!cur || typeof cur !== 'object') return;
                cur = cur[parts[i]];
            }
            if (cur && typeof cur === 'object') delete cur[parts[parts.length - 1]];
        },

        // Strict: точное deep-equal
        _deepEqual(a, b) {
            if (a === b) return true;
            if (typeof a !== typeof b || typeof a !== 'object' || a === null || b === null) return false;
            if (Array.isArray(a) !== Array.isArray(b)) return false;
            const ka = Object.keys(a), kb = Object.keys(b);
            if (ka.length !== kb.length) return false;
            return ka.every(k => this._deepEqual(a[k], b[k]));
        },

        // Compact JSON representation for diff output — no [object Object] surprise
        _sv(v) {
            if (v === undefined) return 'undefined';
            if (v === null)      return 'null';
            if (typeof v !== 'object') return JSON.stringify(v);
            try {
                var s = JSON.stringify(v);
                return s.length > 80 ? s.slice(0, 77) + '...' : s;
            } catch(e) { return String(v); }
        },

        // Собираем список различий для strict
        _findDiff(stored, current, path) {
            const diffs = [];
            if (typeof stored !== typeof current) {
                return [t(ctx, 'snapshot.typeDiff_helper_findDiff_noCtx', path, typeof stored, typeof current)];
            }
            if (typeof stored !== 'object' || stored === null) {
                if (stored !== current) diffs.push(path + ': ' + this._sv(stored) + ' → ' + this._sv(current));
                return diffs;
            }
            if (Array.isArray(stored) !== Array.isArray(current)) {
                return [t(ctx, 'snapshot.arrayObjectMismatch_helper_findDiff_noCtx', path)];
            }
            const keys = new Set([...Object.keys(stored), ...Object.keys(current || {})]);
            keys.forEach(k => {
                const np = path ? path + '.' + k : k;
                if (!(k in (current || {}))) diffs.push(t(ctx, 'snapshot.keyRemoved_helper_findDiff_noCtx', np, this._sv(stored[k])));
                else if (!(k in stored))     diffs.push(t(ctx, 'snapshot.keyAdded_helper_findDiff_noCtx', np, this._sv((current || {})[k])));
                else diffs.push(...this._findDiff(stored[k], (current || {})[k], np));
            });
            return diffs;
        },

        // Non-strict: все ключи из baseline должны присутствовать в current
        _nonStrictMatch(stored, current, diff, path) {
            if (stored === null || stored === undefined) {
                if (stored !== current) { diff.push(path + ': ' + this._sv(stored) + ' → ' + this._sv(current)); return false; }
                return true;
            }
            if (typeof stored !== 'object') {
                if (stored !== current) { diff.push(path + ': ' + this._sv(stored) + ' → ' + this._sv(current)); return false; }
                return true;
            }
            if (Array.isArray(stored)) {
                if (!Array.isArray(current)) { diff.push(t(ctx, 'snapshot.expectedArray_helper_nonStrictMatch_noCtx', path)); return false; }
                return stored.every((item, i) => this._nonStrictMatch(item, current[i], diff, path + '[' + i + ']'));
            }
            return Object.keys(stored).every(k => {
                const np = path ? path + '.' + k : k;
                if (!current || !(k in current)) { diff.push(t(ctx, 'snapshot.keyMissing_helper_nonStrictMatch_noCtx', np)); return false; }
                return this._nonStrictMatch(stored[k], current[k], diff, np);
            });
        },

        run(ctx) {
            const cfg = ctx.config.snapshot || {};
            const wantRecord = cfg.record === true || ctx.config.snapshotRecord === true;
            // record works standalone (no snapshot.enabled needed)
            if (!cfg.enabled && !wantRecord) return;

            // ── snapshotRecord: принудительно перезаписать baseline ────
            // Обновляет устаревший baseline в один клик из UI: поставь
            //   snapshot: { enabled: true, record: true }   (или top-level snapshotRecord: true)
            // — прогони запрос — убери флаг. Игнорирует существующий снапшот и
            // storage (пишет всегда в collection-vars).
            if (wantRecord) {
                const rkey   = this._key(ctx);
                const rstore = this._loadStore();
                rstore[rkey] = {
                    savedAt:    new Date().toISOString(),
                    statusCode: ctx.response.code,
                    format:     ctx.response.format,
                    mode:       cfg.mode || 'non-strict',
                    checkPaths: cfg.checkPaths || [],
                    data:       this._buildData(ctx)
                };
                this._saveStore(rstore, ctx);
                console.warn(t(ctx, 'snapshot.recordWarn', rkey));
                pm.test(t(ctx, 'snapshot.recordTest'), () => pm.expect(true).to.be.true);
                ctx._meta.results.snapshot = { status: 'recorded', key: rkey };
                return;
            }

            const storage = cfg.storage || 'collection-vars';

            // storage: "postman-api" потребовал бы pm.sendRequest → api.getpostman.com
            // + Postman API key — сетевую/ключевую зависимость, нарушающую принцип
            // offline-first. Вместо half-broken no-op (тихо пропустить проверку и
            // создать ложное ощущение защиты) — честно откатываемся на collection-vars
            // и предупреждаем ОДИН раз за прогон. Дальше идёт обычный путь ниже.
            if (storage === 'postman-api' && !pm.collectionVariables.get('hephaestus.snapshotApiWarned')) {
                pm.collectionVariables.set('hephaestus.snapshotApiWarned', '1');
                ctx._meta.errors.push(t(ctx, 'snapshot.postmanApiFallback'));
            }

            const key         = this._key(ctx);
            const store       = this._loadStore();
            const existing    = store[key];
            const currentData = this._buildData(ctx);
            const mode        = cfg.mode || 'non-strict';
            const autoSave    = cfg.autoSaveMissing !== false;
            const checkPaths  = cfg.checkPaths || [];

            // ── Нет снапшота — сохранить baseline ─────────────────────
            if (!existing) {
                if (!autoSave) {
                    pm.test(t(ctx, 'snapshot.missingTest'), () => {
                        pm.expect(false, t(ctx, 'snapshot.missingMsg', key)).to.be.true;
                    });
                    ctx._meta.results.snapshot = { status: 'missing', key };
                    return;
                }
                store[key] = {
                    savedAt:    new Date().toISOString(),
                    statusCode: ctx.response.code,
                    format:     ctx.response.format,
                    mode:       mode,
                    checkPaths: checkPaths,
                    data:       currentData
                };
                this._saveStore(store, ctx);
                pm.test(t(ctx, 'snapshot.savedTest'), () => pm.expect(true).to.be.true);
                ctx._meta.results.snapshot = { status: 'saved', key };
                return;
            }

            // ── Сравнение ──────────────────────────────────────────────
            const storedData = existing.data;
            const diff       = [];
            let   isEqual    = false;

            if (mode === 'strict') {
                isEqual = this._deepEqual(storedData, currentData);
                if (!isEqual) this._findDiff(storedData, currentData, '').forEach(d => diff.push(d));
            } else {
                isEqual = this._nonStrictMatch(storedData, currentData, diff, '');
            }

            const pathsLabel = checkPaths.length > 0
                ? '(' + checkPaths.length + ' paths)'
                : '(full)';

            pm.test(
                t(ctx, 'snapshot.compareTest', mode, pathsLabel, isEqual),
                () => {
                    if (!isEqual) {
                        const diffStr = diff.slice(0, 5).map(d => '  • ' + d).join('\n');
                        pm.expect(isEqual, t(ctx, 'snapshot.diffMsg', diffStr, diff.length)).to.be.true;
                    }
                }
            );

            if (!isEqual && diff.length > 0) {
                console.warn(t(ctx, 'snapshot.diffWarn', diff.length, diff.slice(0, 10).map(d => '  • ' + d).join('\n')));
            }

            ctx._meta.results.snapshot = { status: isEqual ? 'match' : 'diff', key, mode, diff };
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: schema
    // Валидирует ctx.response.parsed по JSON Schema (draft-04/07).
    // Использует tv4 — доступен в Postman sandbox как глобал.
    // Поддерживаемые форматы: json, xml (через xml2js / xml2Json), text (структурно)
    // ════════════════════════════════════════════════════════════
    const schema = {
        run(ctx) {
            const cfg = ctx.config.schema;
            if (!cfg || !cfg.enabled || !cfg.definition) return;

            const source = ctx.response.parsed;
            if (!source) {
                ctx._meta.errors.push(t(ctx, 'schema.noData'));
                ctx._meta.results.schema = { valid: false, errors: ['no parsed data'] };
                return;
            }

            // tv4 — JSON Schema validator, глобально доступен в Postman sandbox
            if (typeof tv4 === 'undefined') {
                ctx._meta.errors.push(t(ctx, 'schema.tv4Missing'));
                return;
            }

            try {
                const result = tv4.validateMultiple(source, cfg.definition);
                const valid  = result.errors.length === 0;
                const count  = result.errors.length;

                pm.test(t(ctx, 'schema.testName', valid, count), () => {
                    if (!valid) {
                        const errStr = result.errors.slice(0, 3)
                            .map(e => '  • [' + (e.dataPath || '/') + '] ' + e.message)
                            .join('\n');
                        pm.expect(valid, '🚫 Schema validation failed:\n' + errStr).to.be.true;
                    }
                });

                if (!valid) {
                    console.warn('🔬 Schema errors:\n' +
                        result.errors.slice(0, 5).map(e => '  • [' + (e.dataPath || '/') + '] ' + e.message).join('\n'));
                }

                ctx._meta.results.schema = {
                    valid,
                    errors: result.errors.map(e => ({ path: e.dataPath, message: e.message }))
                };
            } catch (e) {
                ctx._meta.errors.push(t(ctx, 'schema.validationError', e.message));
            }
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: plugins
    //
    // Расширяй движок без форка: загружай кастомные модули из
    // collectionVariables в рантайме.
    //
    // Настройка (в collectionVariables):
    //   hephaestus.plugins = JSON-массив дескрипторов плагинов
    //
    // Формат плагина:
    //   { "name": "my-plugin", "post": "hephaestus.plugin.my" }
    //
    // Плагин (значение переменной hephaestus.plugin.my) — JS-код,
    // который выполняется в контексте движка и имеет доступ к:
    //   ctx        — объект контекста (config, request, response, api, _meta)
    //   pm         — Postman API
    //   _override  — текущий override запроса
    //
    // Пример кода плагина:
    //   pm.test('🔌 [my-plugin] custom check', function() {
    //     pm.expect(ctx.response.code).to.be.below(500);
    //   });
    //   ctx._meta.errors.push('my-plugin: пример ошибки');
    // ════════════════════════════════════════════════════════════
    const plugins = {
        run(ctx) {
            var raw = '';
            try {
                raw = pm.collectionVariables.get('hephaestus.plugins') || '';
                if (!raw.trim()) return;
            } catch(e) { return; }

            var list;
            try {
                list = JSON.parse(raw);
                if (!Array.isArray(list) || list.length === 0) return;
            } catch(e) {
                ctx._meta.errors.push(t(ctx, 'plugins.parseError', e.message));
                return;
            }

            list.forEach(function(p) {
                if (!p || typeof p !== 'object' || !p.name) return;
                if (!p.post) return;

                var code = '';
                try {
                    code = pm.collectionVariables.get(p.post) || '';
                } catch(e) {
                    ctx._meta.errors.push(t(ctx, 'plugins.readFailed', p.name, p.post, e.message));
                    return;
                }

                if (!code.trim()) {
                    ctx._meta.errors.push(t(ctx, 'plugins.varEmpty', p.name, p.post));
                    return;
                }

                try {
                    eval(code);
                } catch(e) {
                    ctx._meta.errors.push(t(ctx, 'plugins.execError', p.name, e.message));
                    pm.test(t(ctx, 'plugins.testError', p.name), function() {
                        throw new Error(e.message);
                    });
                }
            });
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: securityAudit
    //
    // Пассивный аудит безопасности ответа. Opt-in через config:
    //   securityAudit: {
    //     enabled: true,
    //     requireHeaders: [...],       // защитные заголовки должны присутствовать
    //     forbidHeaders:  [...],       // заголовки раскрытия сервера должны отсутствовать
    //     forbidBodyPatterns: [...],   // стектрейсы / отладка не должны утекать в тело
    //     checkCors: true,             // wildcard ACAO вместе с Allow-Credentials
    //     soft: false                  // findings как предупреждения (passing tests)
    //   }
    // Пропущенные списки берутся из _defaults.
    // ════════════════════════════════════════════════════════════
    const securityAudit = {
        _defaults: {
            requireHeaders: ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options'],
            forbidHeaders:  ['server', 'x-powered-by', 'x-aspnet-version'],
            forbidBodyPatterns: ['SQLSTATE', 'stack trace', 'Traceback (most recent call last)', 'ORA-0', 'db error', 'Warning: mysql'],
            checkCors: true
        },
        _headerVal(name) {
            try { return pm.response.headers.get(name); } catch(e) { return undefined; }
        },
        // All Set-Cookie header values (headers.get collapses duplicates to one).
        _setCookies() {
            try {
                const all = (pm.response.headers && pm.response.headers.all) ? pm.response.headers.all() : [];
                return all.filter(function(h) { return h && h.key && String(h.key).toLowerCase() === 'set-cookie'; })
                          .map(function(h) { return String(h.value); });
            } catch (e) { return []; }
        },
        // JWT-shaped tokens (header.payload.signature, base64url) in a haystack.
        _findJwts(hay) {
            return String(hay).match(/eyJ[A-Za-z0-9_-]{2,}\.[A-Za-z0-9_-]{2,}\.[A-Za-z0-9_-]*/g) || [];
        },
        // base64url segment → JSON object (or null). atob exists in the sandbox.
        _decodeJwtPart(seg) {
            try {
                let s = String(seg).replace(/-/g, '+').replace(/_/g, '/');
                while (s.length % 4) s += '=';
                return JSON.parse(decodeURIComponent(escape(atob(s))));
            } catch (e) { return null; }
        },
        run(ctx) {
            const cfg = ctx.config.securityAudit;
            if (!cfg || !cfg.enabled) return;

            // Security checks intentionally do NOT inherit the global softFail flag
            // (that flag is for flaky functional assertions) — a security regression
            // must fail the run unless securityAudit.soft is explicitly set.
            const soft = cfg.soft === true;
            const self = this;
            const findings = [];

            // Config lists may be malformed (e.g. a bare string) — fall back to
            // defaults for anything that isn't an array so a typo can't crash the pipeline.
            function list(v, dflt) { return Array.isArray(v) ? v : dflt; }

            function secTest(label, ok, detail) {
                const name = (soft ? '🛡️ [soft] ' : '🛡️ ') + label;
                if (soft) {
                    pm.test(name, function() {
                        if (!ok) console.warn('🛡️ [soft] ' + label + ': ' + detail);
                        pm.expect(true).to.be.true;
                    });
                } else {
                    pm.test(name, function() { pm.expect(ok, '🚫 ' + detail).to.be.true; });
                }
            }

            // 1. Обязательные защитные заголовки присутствуют
            list(cfg.requireHeaders, self._defaults.requireHeaders).forEach(function(h) {
                const v = self._headerVal(h);
                const present = typeof v === 'string' && v.length > 0;
                if (!present) findings.push({ type: 'missing-header', name: h });
                secTest(t(ctx, 'securityAudit.requireHeaderName', h), present, t(ctx, 'securityAudit.requireHeaderDetail', h));
            });

            // 2. Заголовки раскрытия сервера отсутствуют
            list(cfg.forbidHeaders, self._defaults.forbidHeaders).forEach(function(h) {
                const v = self._headerVal(h);
                const disclosed = typeof v === 'string' && v.length > 0;
                if (disclosed) findings.push({ type: 'disclosure-header', name: h, value: v });
                secTest(t(ctx, 'securityAudit.forbidHeaderName', h), !disclosed, t(ctx, 'securityAudit.forbidHeaderDetail', h, v));
            });

            // 3. Нет отладочной информации / стектрейсов в теле
            const patterns = list(cfg.forbidBodyPatterns, self._defaults.forbidBodyPatterns);
            const raw = (ctx.response && ctx.response.raw) ? String(ctx.response.raw) : '';
            if (raw && patterns && patterns.length) {
                const hit = patterns.filter(function(p) { return raw.indexOf(p) !== -1; });
                if (hit.length) findings.push({ type: 'body-leak', patterns: hit });
                secTest(t(ctx, 'securityAudit.bodyLeakName'), hit.length === 0, t(ctx, 'securityAudit.bodyLeakDetail', hit.join(', ')));
            }

            // 4. Небезопасный CORS: wildcard-origin вместе с credentials
            if (cfg.checkCors !== false) {
                const acao = self._headerVal('access-control-allow-origin');
                const acac = self._headerVal('access-control-allow-credentials');
                if (acao === '*' && String(acac).toLowerCase() === 'true') {
                    findings.push({ type: 'insecure-cors' });
                    secTest(t(ctx, 'securityAudit.corsName'), false, t(ctx, 'securityAudit.corsDetail'));
                }
            }

            // 5. Cookie hardening: Set-Cookie flags (opt-in via cookieFlags:true|[flags]).
            if (cfg.cookieFlags) {
                const required = Array.isArray(cfg.cookieFlags) ? cfg.cookieFlags : ['Secure', 'HttpOnly', 'SameSite'];
                self._setCookies().forEach(function(c) {
                    const cookieName = c.split('=')[0].trim();
                    // Scan only the attribute segment (after the first ';'), never the
                    // name=value pair — else a cookie literally named after a flag
                    // (e.g. "Secure=1; HttpOnly") would be miscredited with that flag.
                    const firstSemi = c.indexOf(';');
                    const attrs = firstSemi === -1 ? '' : c.slice(firstSemi + 1);
                    const missing = required.filter(function(f) {
                        const esc = String(f).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        return !(new RegExp('(^|;)\\s*' + esc + '\\b', 'i')).test(attrs);
                    });
                    const ok = missing.length === 0;
                    if (!ok) findings.push({ type: 'weak-cookie', name: cookieName, missing: missing });
                    secTest(t(ctx, 'securityAudit.cookieName', cookieName), ok, t(ctx, 'securityAudit.cookieDetail', cookieName, missing.join(', ')));
                });
            }

            // 6. JWT sanity: reject alg:none and expired tokens (opt-in via checkJwt:true).
            if (cfg.checkJwt) {
                self._findJwts(raw + ' ' + self._setCookies().join(' ')).forEach(function(jwt) {
                    const parts = jwt.split('.');
                    const hdr = self._decodeJwtPart(parts[0]);
                    const pl  = self._decodeJwtPart(parts[1]);
                    const algNone = hdr && typeof hdr.alg === 'string' && hdr.alg.toLowerCase() === 'none';
                    const expired = pl && typeof pl.exp === 'number' && (pl.exp * 1000) < Date.now();
                    const ok = !algNone && !expired;
                    if (!ok) findings.push({ type: 'weak-jwt', alg: hdr && hdr.alg, expired: !!expired });
                    secTest(t(ctx, 'securityAudit.jwtName', hdr && hdr.alg), ok,
                        t(ctx, 'securityAudit.jwtDetail', algNone ? 'alg: none' : (expired ? 'exp in the past' : '')));
                });
            }

            // 7. Auth responses must not be cacheable: Cache-Control: no-store (opt-in).
            if (cfg.requireNoStore) {
                const cc = String(self._headerVal('cache-control') || '').toLowerCase();
                const ok = cc.indexOf('no-store') !== -1;
                if (!ok) findings.push({ type: 'cacheable-auth' });
                secTest(t(ctx, 'securityAudit.noStoreName'), ok, t(ctx, 'securityAudit.noStoreDetail', cc || '(missing)'));
            }

            ctx._meta.results.security = { findings: findings, ok: findings.length === 0 };
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: logger
    // ════════════════════════════════════════════════════════════
    const logger = {

        _maskStr(str) {
            if (!str || typeof str !== 'string' || str.length < 6) return '***';
            const keep = Math.max(1, Math.floor(str.length * 0.2));
            return str.slice(0, keep) + '***MASKED***' + str.slice(-keep);
        },

        // Нужно ли маскировать значение по имени ключа — общий shared/mask.js.
        _isSensitive(key, secrets) {
            return isSensitive(key, secrets);
        },

        // Маскирует query-параметры URL, чьи ключи совпадают с secrets
        _maskUrl(url, secrets) {
            if (!url || !secrets || !secrets.length) return url;
            try {
                const qi = url.indexOf('?');
                if (qi === -1) return url;
                const base = url.slice(0, qi);
                const query = url.slice(qi + 1).split('&').map(function(param) {
                    const ei = param.indexOf('=');
                    if (ei === -1) return param;
                    const key = param.slice(0, ei);
                    const val = param.slice(ei + 1);
                    if (this._isSensitive(key, secrets)) {
                        return key + '=' + this._maskStr(val);
                    }
                    return param;
                }, this).join('&');
                return base + '?' + query;
            } catch (e) { return url; }
        },

        // Маскирует чувствительные ключи в объекте (рекурсивно)
        // secrets — список слов; если ключ содержит любое из них — значение маскируется
        _maskObj(obj, secrets) {
            if (!obj || !secrets || secrets.length === 0) return obj;
            try {
                const clone = JSON.parse(JSON.stringify(obj));
                const walk = (o) => {
                    if (typeof o !== 'object' || o === null) return;
                    Object.keys(o).forEach(k => {
                        if (this._isSensitive(k, secrets)) {
                            if (typeof o[k] === 'string') o[k] = this._maskStr(o[k]);
                        } else { walk(o[k]); }
                    });
                };
                walk(clone);
                return clone;
            } catch (e) { return obj; }
        },

        _resultLines(results) {
            const lines = [];
            if (results.found.length > 0) {
                lines.push('🔎 FOUND    ' + results.found.map(r => '\'' + r.name + '\' ✅').join('  |  '));
            }
            if (results.saved.length > 0) {
                lines.push('💾 SAVED    ' + results.saved.map(r => '\'' + r.name + '\' → ' + r.scope + (r.ok ? ' ✅' : ' ❌')).join('  |  '));
            }
            if (results.counts.length > 0) {
                lines.push('📏 COUNT    ' + results.counts.map(r => {
                    const val = r.expected !== undefined ? r.length + '/' + r.expected + (r.ok ? ' ✅' : ' ❌') : r.length;
                    return '\'' + r.alias + '\': ' + val;
                }).join('  |  '));
            }
            if (results.snapshot) {
                const s    = results.snapshot;
                const icon = s.status === 'match' ? '✅' : s.status === 'saved' ? '🆕' : s.status === 'recorded' ? '🔴' : s.status === 'diff' ? '❌' : '⚠️';
                const det  = s.status === 'diff' ? t(ctx, 'logger.snapshotDiffCount', (s.diff || []).length) : s.status === 'saved' ? ' baseline' : '';
                lines.push('📸 SNAPSHOT ' + icon + ' ' + (s.mode || '') + det);
                // Показываем конкретные расхождения прямо в логе
                if (s.status === 'diff' && s.diff && s.diff.length > 0) {
                    s.diff.slice(0, 5).forEach(function(d) { lines.push('    ↳ ' + d); });
                    if (s.diff.length > 5) lines.push('    ↳ ... +' + (s.diff.length - 5) + ' more');
                }
            }
            if (results.headers && results.headers.length > 0) {
                lines.push('📨 HEADERS  ' + results.headers.map(h => '"' + h.name + '" ' + (h.ok ? '✅' : '❌')).join('  |  '));
            }
            if (results.schema) {
                const sv = results.schema;
                lines.push('🔬 SCHEMA   ' + (sv.valid ? t(ctx, 'logger.schemaValid') : t(ctx, 'logger.schemaErrors', sv.errors.length)));
            }
            return lines;
        },

        summary(ctx) {
            const c       = ctx.config;
            const r       = ctx.request;
            const res     = ctx.response;
            const secrets = c.secrets || [];
            const ts      = ctx._meta.processedAt.replace('T', ' ').slice(0, 19);
            const level   = c.logLevel || 'normal'; // silent | minimal | normal | verbose

            // ── CI JSON — всегда, независимо от logLevel ────────────────────
            if (c.ci === true) {
                console.log('[HEPHAESTUS_CI] ' + JSON.stringify({
                    v:        VERSION,
                    request:  r.name,
                    method:   r.method,
                    status:   res.code,
                    time:     res.time,
                    size:     res.size,
                    format:   res.format,
                    found:    ctx._meta.results.found.map(x => x.name),
                    saved:    ctx._meta.results.saved.map(x => x.name),
                    counts:   ctx._meta.results.counts.map(x => ({ alias: x.alias, length: x.length, expected: x.expected, ok: x.ok })),
                    headers:  ctx._meta.results.headers.map(x => ({ name: x.name, ok: x.ok })),
                    snapshot: ctx._meta.results.snapshot,
                    schema:   ctx._meta.results.schema ? { valid: ctx._meta.results.schema.valid } : null,
                    security: ctx._meta.results.security ? { findings: ctx._meta.results.security.findings.length, ok: ctx._meta.results.security.ok } : null,
                    errors:   ctx._meta.errors
                }));
            }

            // silent — никакого console-вывода
            if (level === 'silent') return;

            // minimal — одна компактная строка на запрос
            if (level === 'minimal') {
                const found   = ctx._meta.results.found.filter(function(f) { return f.ok; }).length;
                const saved   = ctx._meta.results.saved.length;
                const snap    = ctx._meta.results.snapshot;
                const snapIco = snap ? (snap.status === 'match' ? '📸✅' : snap.status === 'saved' ? '📸🆕' : snap.status === 'recorded' ? '📸🔴' : '📸❌') : '';
                const parts   = [res._statusEmoji + ' ' + res.code, res.time + 'ms'];
                if (found)   parts.push('🔎×' + found);
                if (saved)   parts.push('💾×' + saved);
                if (snapIco) parts.push(snapIco);
                if (ctx._meta.errors.length) parts.push('⚠️×' + ctx._meta.errors.length);
                console.log('[H] ' + r.method + ' ' + r.name + ' → ' + parts.join(' | '));
                return;
            }

            // normal / verbose — полный блок
            const W   = 62;
            const HR  = '╠' + '═'.repeat(W) + '╣';
            const TOP = '╔' + '═'.repeat(W) + '╗';
            const BOT = '╚' + '═'.repeat(W) + '╝';
            const DIV = '─'.repeat(W + 2);

            const maskedUrl = this._maskUrl(r.url || '—', secrets);
            const urlLine   = maskedUrl.length > W - 6 ? maskedUrl.slice(0, W - 9) + '...' : maskedUrl;

            const masked = this._maskObj(res.parsed, secrets);
            var previewStr;
            if (masked !== null && masked !== undefined) {
                var ps = JSON.stringify(masked, null, 2);
                previewStr = ps.length > 800 ? ps.slice(0, 800) + '\n... [+' + (ps.length - 800) + ' chars]' : ps;
            } else if (res.raw && res.raw.length > 0) {
                previewStr = res.raw.length > 800 ? res.raw.slice(0, 800) + '\n... [+' + (res.raw.length - 800) + ' chars]' : res.raw;
            } else {
                previewStr = t(ctx, 'logger.emptyResponse');
            }

            const resultLines = this._resultLines(ctx._meta.results);

            var lines = [
                TOP,
                '║  HEPHAESTUS v' + VERSION + '  ·  POST-REQUEST',
                '║  📅 ' + ts + ' UTC',
                HR,
                '║  📋  ' + r.method + '  ' + r.name,
                '║  🌐  ' + urlLine,
                HR,
                '║  ' + res._statusEmoji + ' STATUS  ' + res.code + ' — ' + (res._statusLabel || '—'),
                '║  ⏱   ' + res.time + ' ms   📦 ' + (res._sizeFormatted || '—') + '   📄 ' + res.format.toUpperCase(),
                HR,
                '║  📤 RESPONSE PREVIEW',
                DIV,
                previewStr,
                DIV
            ];

            // verbose — добавляем заголовки ответа
            if (level === 'verbose' && res.headers) {
                lines.push('║  📬 RESPONSE HEADERS');
                const hdrs = typeof res.headers.toObject === 'function' ? res.headers.toObject() : {};
                Object.keys(hdrs).slice(0, 10).forEach(function(k) {
                    lines.push('║    ' + k + ': ' + String(hdrs[k]).slice(0, 60));
                });
                lines.push(DIV);
            }

            if (resultLines.length > 0) {
                resultLines.forEach(function(l) { lines.push('║  ' + l); });
            }

            if (ctx._meta.errors.length > 0) {
                ctx._meta.errors.forEach(function(e) { lines.push('║  ⚠️  ' + e); });
            }

            lines.push(BOT);
            console.log(lines.join('\n'));
        }
    };

    // ════════════════════════════════════════════════════════════
    // ORCHESTRATOR — Post-Request Pipeline v3.7
    //
    // configMerge → iterationData → normalizeResponse
    //   → [retryOnStatus?] → metrics → extractor
    //   → assertions → assertEach → assertShape → assertOrder
    //   → assertHeaders → snapshot → schema → plugins
    //   → logger.summary
    //
    // retryOnStatus: если статус совпадает — pm.setNextRequest и пропуск
    // остального пайплайна. Счётчик в pm.variables, автоочистка.
    // ════════════════════════════════════════════════════════════
    try {
        configMerge.run(ctx, _override);
        iterationData.run(ctx);
        normalizeResponse.run(ctx);
        normalizeResponse.runRequestContext(ctx);

        // retryOnStatus: returns true if we should skip the rest of the pipeline
        const _retrying = retryOnStatus.run(ctx);

        if (!_retrying) {
            metrics.run(ctx);
            extractor.run(ctx);
            assertions.run(ctx);
            assertEach.run(ctx);
            assertShape.run(ctx);
            graphql.run(ctx);
            assertOrder.run(ctx);
            assertUnique.run(ctx);
            assertHeaders.run(ctx);
            snapshot.run(ctx);
            schema.run(ctx);
            securityAudit.run(ctx);
            plugins.run(ctx);
            logger.summary(ctx);
        }
    } catch (e) {
        pm.test(t(ctx, 'engine.postCritical'), () => {
            throw new Error('[v' + VERSION + '] ' + e.message);
        });
    }

})();
