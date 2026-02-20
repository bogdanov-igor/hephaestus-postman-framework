// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Hephaestus v3 — Post-Request Engine                        v3.0.0      ║
// ║  Хранится в collectionVariables["hephaestus.v3.post"]                  ║
// ║  Обновляется через setup/engine-update.js                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// Итерация 1: configMerge · normalizeResponse · metrics · logger
// Итерация 2: extractor (ctx.api) · assertions (keysToFind / varsToSave / keysToCount)
// Итерация 3: snapshot (collection-vars / postman-api) · schema (JSON Schema tv4)

(function hephaestusPostRequest() {

    const VERSION = '3.0.0';

    // override объявлен СНАРУЖИ (в скрипте метода), eval видит его через scope
    const _override = (typeof override !== 'undefined' && override !== null)
        ? override
        : {};

    const STATUS_LABELS = {
        200: 'Успешно',             201: 'Создан',
        202: 'Принято',             204: 'Нет содержимого',
        301: 'Перемещён',           302: 'Найден',
        400: 'Неверный запрос',     401: 'Неавторизован',
        403: 'Доступ запрещён',     404: 'Не найден',
        405: 'Метод запрещён',      409: 'Конфликт',
        422: 'Некорректные данные', 429: 'Слишком много запросов',
        500: 'Ошибка сервера',      502: 'Плохой шлюз',
        503: 'Сервис недоступен',   504: 'Таймаут шлюза'
    };

    // ════════════════════════════════════════════════════════════
    // CTX
    // ════════════════════════════════════════════════════════════
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
                snapshot: null, // { status, key, diff? }
                schema:   null  // { valid, errors }
            }
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: configMerge
    // ════════════════════════════════════════════════════════════
    const configMerge = {
        _merge(target, source) {
            const out = Object.assign({}, target);
            Object.keys(source).forEach(k => {
                const sv = source[k];
                if (sv !== null && sv !== undefined && typeof sv === 'object' && !Array.isArray(sv)) {
                    out[k] = this._merge(typeof out[k] === 'object' && out[k] !== null ? out[k] : {}, sv);
                } else if (sv !== undefined) {
                    out[k] = sv;
                }
            });
            return out;
        },
        run(ctx, override) {
            let defaults = {};
            try {
                const raw = pm.collectionVariables.get('hephaestus.defaults');
                if (raw) defaults = JSON.parse(raw);
            } catch (e) {
                ctx._meta.errors.push('configMerge: не удалось разобрать hephaestus.defaults — ' + e.message);
            }
            ctx.config = this._merge(defaults, override || {});
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: normalizeResponse
    // ════════════════════════════════════════════════════════════
    const normalizeResponse = {
        run(ctx) {
            const raw = ctx.response.raw;
            const ct  = ctx.response.contentType;
            if (ct.includes('json') || ct.includes('javascript')) {
                try { ctx.response.parsed = pm.response.json(); ctx.response.format = 'json'; return; }
                catch (e) { /* fall through */ }
            }
            if (ct.includes('xml') || ct.includes('html')) {
                try { ctx.response.parsed = xml2Json(raw); ctx.response.format = 'xml'; return; }
                catch (e) { /* fall through */ }
            }
            if (ct === 'text/plain') { ctx.response.format = 'text'; return; }
            try { ctx.response.parsed = JSON.parse(raw); ctx.response.format = 'json'; return; }
            catch (e) { /* not json */ }
            try { ctx.response.parsed = xml2Json(raw); ctx.response.format = 'xml'; return; }
            catch (e) { /* not xml */ }
            if (raw && raw.length > 0) ctx.response.format = 'text';
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: metrics
    // ════════════════════════════════════════════════════════════
    const metrics = {
        _formatSize(bytes) {
            if (!bytes || bytes === 0) return '0 B';
            if (bytes < 1024)         return bytes + ' B';
            if (bytes < 1024 * 1024)  return (bytes / 1024).toFixed(2) + ' KB';
            return (bytes / 1024 / 1024).toFixed(2) + ' MB';
        },
        run(ctx) {
            const { code, time, size } = ctx.response;
            const label = STATUS_LABELS[code] || 'Неизвестный статус';
            const emoji = code >= 200 && code < 300 ? '🟢' : code >= 400 && code < 500 ? '🟡' : '🔴';
            ctx.response._statusLabel   = label;
            ctx.response._statusEmoji   = emoji;
            ctx.response._sizeFormatted = this._formatSize(size);
            pm.test(emoji + ' Статус: ' + code + ' — ' + label, () => {
                pm.expect([200, 201, 202], '🚫 Статус ' + code + ' не входит в список успешных').to.include(code);
            });
            const expectEmpty = ctx.config.expectEmpty === true;
            pm.test('📭 Тело ответа: ' + (expectEmpty ? 'пустое ✓' : 'не пустое'), () => {
                if (!expectEmpty) pm.expect(ctx.response.raw, '🚫 Ответ пустой').to.have.length.above(0);
                else              pm.expect(ctx.response.raw, '🚫 Ответ не пустой').to.have.length.below(10);
            });
            const expectedType = (ctx.config.contentType || '').toLowerCase();
            if (!expectEmpty && expectedType) {
                pm.test('🧾 Content-Type: ' + (ctx.response.contentType || '—'), () => {
                    pm.expect(ctx.response.contentType, '🚫 Ожидался "' + expectedType + '"').to.include(expectedType);
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
                find:  (path, fn) => { const a = self._extractArray(source, path); return typeof fn === 'function' ? a.filter(fn) : a; },
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
                const { path, name = path, expect, transform, filter, ignoreCase = false } = e;
                let v = ctx.api.get(path);
                if (ignoreCase && v !== undefined) v = extractor._toLowerDeep(v);
                if (Array.isArray(v) && filter)    v = this._filters(v, filter, false);
                if (v !== undefined && transform)   v = this._transforms(v, transform);
                pm.test('🔎 Найдено: \'' + name + '\' (' + path + ')', () => {
                    pm.expect(v, '🚫 Значение не найдено по пути: ' + path).to.exist;
                    if (expect !== undefined) {
                        if (typeof expect === 'function') pm.expect((() => { try { return expect(v); } catch(e) { return false; } })(), '🚫 \'' + name + '\': условие не выполнено').to.be.true;
                        else pm.expect(v, '🚫 \'' + name + '\': ожидалось "' + expect + '"').to.eql(expect);
                    }
                });
                ctx._meta.results.found.push({ name, path, ok: true });
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
                pm.test('💾 Сохранено: \'' + name + '\' ← ' + path, () => {
                    pm.expect(raw, '🚫 \'' + name + '\': не найдена по пути \'' + path + '\'').to.exist; ok = true;
                });
                if (v !== undefined) {
                    const sv = typeof v === 'object' ? JSON.stringify(v) : v;
                    if (scope === 'environment') pm.environment.set(name, sv);
                    else if (scope === 'local')  pm.variables.set(name, sv);
                    else                         pm.collectionVariables.set(name, sv);
                    if (scope !== 'collection' && scope !== 'environment' && scope !== 'local')
                        ctx._meta.errors.push('varsToSave: неизвестный scope "' + scope + '" для "' + name + '", использован collection');
                } else {
                    ctx._meta.errors.push('varsToSave: \'' + name + '\' не найдена по пути \'' + path + '\'');
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
                const label = expected !== undefined ? length + ' / ' + expected + (ok ? ' ✅' : ' ❌') : length + ' эл.';
                pm.test('📏 Кол-во \'' + alias + '\': ' + label, () => {
                    if (expected !== undefined) pm.expect(length, '🚫 \'' + alias + '\': ожидалось ' + expected + ', получено ' + length).to.eql(expected);
                    else pm.expect(length).to.be.a('number');
                });
                ctx._meta.results.counts.push({ alias, length, expected, ok });
            });
        },
        run(ctx) {
            if (!ctx.response.parsed && ctx.response.format !== 'text') {
                ctx._meta.errors.push('assertions: ответ не распарсен, проверки пропущены'); return;
            }
            this.runFind(ctx); this.runSave(ctx); this.runCount(ctx);
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
    // storage: "collection-vars" (default)
    //          "postman-api" — TODO: через pm.sendRequest к api.getpostman.com
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
                    'Используй checkPaths для сокращения или очисти через snapshot-clear метод.'
                );
            }
            pm.collectionVariables.set('hephaestus.snapshots', str);
        },

        // Строим данные для сравнения:
        // если checkPaths задан — берём только эти пути
        // иначе — весь parsed с удалёнными ignorePaths
        _buildData(ctx) {
            const cfg = ctx.config.snapshot;
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

        // Собираем список различий для strict
        _findDiff(stored, current, path) {
            const diffs = [];
            if (typeof stored !== typeof current) {
                return [path + ': тип "' + typeof stored + '" → "' + typeof current + '"'];
            }
            if (typeof stored !== 'object' || stored === null) {
                if (stored !== current) diffs.push(path + ': "' + stored + '" → "' + current + '"');
                return diffs;
            }
            if (Array.isArray(stored) !== Array.isArray(current)) {
                return [path + ': array/object несовпадение'];
            }
            const keys = new Set([...Object.keys(stored), ...Object.keys(current || {})]);
            keys.forEach(k => {
                const np = path ? path + '.' + k : k;
                if (!(k in (current || {}))) diffs.push(np + ': ключ удалён');
                else if (!(k in stored))     diffs.push(np + ': ключ добавлен');
                else diffs.push(...this._findDiff(stored[k], (current || {})[k], np));
            });
            return diffs;
        },

        // Non-strict: все ключи из baseline должны присутствовать в current
        _nonStrictMatch(stored, current, diff, path) {
            if (stored === null || stored === undefined) {
                if (stored !== current) { diff.push(path + ': "' + stored + '" → "' + current + '"'); return false; }
                return true;
            }
            if (typeof stored !== 'object') {
                if (stored !== current) { diff.push(path + ': "' + stored + '" → "' + current + '"'); return false; }
                return true;
            }
            if (Array.isArray(stored)) {
                if (!Array.isArray(current)) { diff.push(path + ': ожидался массив'); return false; }
                return stored.every((item, i) => this._nonStrictMatch(item, current[i], diff, path + '[' + i + ']'));
            }
            return Object.keys(stored).every(k => {
                const np = path ? path + '.' + k : k;
                if (!current || !(k in current)) { diff.push(np + ': ключ отсутствует'); return false; }
                return this._nonStrictMatch(stored[k], current[k], diff, np);
            });
        },

        run(ctx) {
            const cfg = ctx.config.snapshot;
            if (!cfg || !cfg.enabled) return;

            const storage = cfg.storage || 'collection-vars';

            if (storage === 'postman-api') {
                // TODO Итерация 4+: pm.sendRequest к api.getpostman.com
                // Требует: postman.api.key + postman.collection.uid в environment
                ctx._meta.errors.push('snapshot: storage "postman-api" ещё не реализован');
                return;
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
                    pm.test('📸 Snapshot: не найден (autoSaveMissing отключён)', () => {
                        pm.expect(false, '🚫 Снапшот "' + key + '" не найден').to.be.true;
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
                pm.test('📸 Snapshot: ✅ baseline сохранён', () => pm.expect(true).to.be.true);
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
                '📸 Snapshot ' + mode + ' ' + pathsLabel + ': ' + (isEqual ? '✅ совпадает' : '❌ расхождение'),
                () => {
                    if (!isEqual) {
                        const diffStr = diff.slice(0, 5).map(d => '  • ' + d).join('\n');
                        pm.expect(isEqual, '🚫 Snapshot расхождение:\n' + diffStr + (diff.length > 5 ? '\n  ... и ещё ' + (diff.length - 5) : '')).to.be.true;
                    }
                }
            );

            if (!isEqual && diff.length > 0) {
                console.warn('📸 Snapshot diff (' + diff.length + ' различий):\n' + diff.slice(0, 10).map(d => '  • ' + d).join('\n'));
            }

            ctx._meta.results.snapshot = { status: isEqual ? 'match' : 'diff', key, mode, diff };
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: schema
    // Валидирует ctx.response.parsed по JSON Schema (draft-04/07).
    // Использует tv4 — доступен в Postman sandbox как глобал.
    // Поддерживаемые форматы: json, xml (после xml2Json), text (структурно)
    // ════════════════════════════════════════════════════════════
    const schema = {
        run(ctx) {
            const cfg = ctx.config.schema;
            if (!cfg || !cfg.enabled || !cfg.definition) return;

            const source = ctx.response.parsed;
            if (!source) {
                ctx._meta.errors.push('schema: нет данных для валидации (ответ не распарсен)');
                ctx._meta.results.schema = { valid: false, errors: ['no parsed data'] };
                return;
            }

            // tv4 — JSON Schema validator, глобально доступен в Postman sandbox
            if (typeof tv4 === 'undefined') {
                ctx._meta.errors.push('schema: tv4 не доступен в этой версии Postman');
                return;
            }

            try {
                const result = tv4.validateMultiple(source, cfg.definition);
                const valid  = result.errors.length === 0;
                const count  = result.errors.length;

                pm.test('🔬 Schema: ' + (valid ? '✅ валидна' : '❌ ошибки (' + count + ')'), () => {
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
                ctx._meta.errors.push('schema: ошибка валидации — ' + e.message);
            }
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: logger
    // ════════════════════════════════════════════════════════════
    const logger = {

        _maskStr(str) {
            if (!str || typeof str !== 'string' || str.length < 6) return str;
            const keep = Math.max(1, Math.floor(str.length * 0.2));
            return str.slice(0, keep) + '***MASKED***' + str.slice(-keep);
        },

        _maskObj(obj, secrets) {
            if (!obj || !secrets || secrets.length === 0) return obj;
            try {
                const clone = JSON.parse(JSON.stringify(obj));
                const walk = (o) => {
                    if (typeof o !== 'object' || o === null) return;
                    Object.keys(o).forEach(k => {
                        if (secrets.some(s => k.toLowerCase().includes(s.toLowerCase()))) {
                            if (typeof o[k] === 'string') o[k] = this._maskStr(o[k]);
                        } else { walk(o[k]); }
                    });
                };
                walk(clone);
                return clone;
            } catch (e) { return obj; }
        },

        _preview(parsed, raw, format, limit) {
            const max = limit || 600;
            if (parsed && (format === 'json' || format === 'xml')) {
                const str = JSON.stringify(parsed, null, 2);
                return str.length > max ? str.slice(0, max) + '\n  ... [+' + (str.length - max) + ' chars]' : str;
            }
            if (raw) return raw.length > max ? raw.slice(0, max) + '\n  ... [+' + (raw.length - max) + ' chars]' : raw;
            return '— (пустой ответ)';
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
                const s = results.snapshot;
                const icon = s.status === 'match' ? '✅' : s.status === 'saved' ? '🆕' : s.status === 'diff' ? '❌' : '⚠️';
                const detail = s.status === 'diff' ? ' (' + (s.diff || []).length + ' различий)' : s.status === 'saved' ? ' baseline' : '';
                lines.push('📸 SNAPSHOT ' + icon + '  ' + (s.mode || '') + detail);
            }
            if (results.schema) {
                const sv = results.schema;
                lines.push('🔬 SCHEMA   ' + (sv.valid ? '✅ валидна' : '❌ ' + sv.errors.length + ' ошибок'));
            }

            return lines;
        },

        summary(ctx) {
            const c       = ctx.config;
            const r       = ctx.request;
            const res     = ctx.response;
            const secrets = c.secrets || [];
            const ts      = ctx._meta.processedAt.replace('T', ' ').slice(0, 19);

            // ── Заголовок ──────────────────────────────────────────────
            console.log([
                '╔══════════════════════════════════════════════════════════════╗',
                '║  ✅ HEPHAESTUS v' + VERSION + '  ·  POST-REQUEST',
                '║  📅 ' + ts + ' UTC',
                '╠══════════════════════════════════════════════════════════════╣',
                '║  📋 REQUEST  ' + r.method + '  ' + r.name,
                '║  🌐 URL      ' + (r.url || '—'),
                '╠══════════════════════════════════════════════════════════════╣',
                '║  ' + res._statusEmoji + '  STATUS   ' + res.code + ' — ' + (res._statusLabel || '—'),
                '║  ⏱️  TIME     ' + res.time + ' ms',
                '║  📦 SIZE     ' + (res._sizeFormatted || '—'),
                '║  📄 FORMAT   ' + res.format.toUpperCase(),
                '╠══════════════════════════════════════════════════════════════╣',
                '║  📤 RESPONSE PREVIEW',
                '╚══════════════════════════════════════════════════════════════╝'
            ].join('\n'));

            // ── Preview ────────────────────────────────────────────────
            console.log(this._preview(this._maskObj(res.parsed, secrets), res.raw, res.format, 600));

            // ── Результаты assertions / snapshot / schema ──────────────
            const resultLines = this._resultLines(ctx._meta.results);
            if (resultLines.length > 0) {
                console.log('────────────────────────────────────────────────────────────');
                resultLines.forEach(line => console.log(line));
            }

            // ── Ошибки ─────────────────────────────────────────────────
            if (ctx._meta.errors.length > 0) {
                console.log('────────────────────────────────────────────────────────────');
                console.warn('⚠️  [Hephaestus] Ошибки:\n' + ctx._meta.errors.map(e => '  • ' + e).join('\n'));
            }

            console.log('════════════════════════════════════════════════════════════');

            // ── CI-режим ───────────────────────────────────────────────
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
                    snapshot: ctx._meta.results.snapshot,
                    schema:   ctx._meta.results.schema ? { valid: ctx._meta.results.schema.valid } : null,
                    errors:   ctx._meta.errors
                }));
            }
        }
    };

    // ════════════════════════════════════════════════════════════
    // ORCHESTRATOR — Post-Request Pipeline (Итерация 3)
    //
    // configMerge → normalizeResponse → metrics
    //   → extractor → assertions
    //   → snapshot → schema
    //   → logger.summary
    // ════════════════════════════════════════════════════════════
    try {
        configMerge.run(ctx, _override);
        normalizeResponse.run(ctx);
        metrics.run(ctx);
        extractor.run(ctx);
        assertions.run(ctx);
        snapshot.run(ctx);
        schema.run(ctx);
        logger.summary(ctx);
    } catch (e) {
        pm.test('🚫 Hephaestus post-request: критическая ошибка', () => {
            throw new Error('[v' + VERSION + '] ' + e.message);
        });
    }

})();
