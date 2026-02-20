// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Hephaestus v3 — Pre-Request Engine                         v3.0.0      ║
// ║  Хранится в collectionVariables["hephaestus.v3.pre"]                   ║
// ║  Обновляется через setup/engine-update.js                               ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║  © 2026 Богданов Игорь Александрович  bogdanov.ig.alex@gmail.com        ║
// ║  https://github.com/bogdanov-igor/hephaestus-postman-framework          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// Итерация 1: configMerge · urlBuilder · auth · dateUtils · logger
// Итерация 4: masking auth credentials в logger

(function hephaestusPreRequest() {

    const VERSION = '3.0.0';

    // override объявлен СНАРУЖИ (в скрипте метода), eval видит его через scope
    const _override = (typeof override !== 'undefined' && override !== null)
        ? override
        : {};

    // ════════════════════════════════════════════════════════════
    // CTX
    // ════════════════════════════════════════════════════════════
    const ctx = {
        config: {},
        request: {
            method: pm.request.method,
            name:   pm.info.requestName,
            url:    ''
        },
        _meta: {
            version:   VERSION,
            startedAt: new Date().toISOString(),
            errors:    []
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
    // MODULE: urlBuilder
    // Ставит pm.variables("baseUrl") — используй {{baseUrl}} в URL метода
    // ════════════════════════════════════════════════════════════
    const urlBuilder = {
        run(ctx) {
            const baseUrl = (ctx.config.baseUrl || '').replace(/\/$/, '');
            pm.test('🌐 URL: базовый адрес задан', () => {
                pm.expect(baseUrl, '🚫 baseUrl не задан ни в defaults, ни в override').to.be.a('string').and.have.length.above(0);
                pm.expect(baseUrl, '🚫 Некорректный формат URL').to.match(/^https?:\/\/.+/);
            });
            pm.variables.set('baseUrl', baseUrl);
            ctx.request.url = baseUrl;
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: auth
    // Plugin, отключён по умолчанию.
    // Типы: none | basic | bearer | headers | variables
    //
    // БЕЗОПАСНОСТЬ:
    //   — Обработка происходит ДО маскирования — реальные значения
    //     используются для установки заголовков/переменных, но
    //     в console они не попадают (логирует только тип и имена ключей).
    //   — После run() чувствительные поля заменяются masked-версиями
    //     в ctx.config.auth для безопасного отображения в логах.
    // ════════════════════════════════════════════════════════════
    const auth = {
        run(ctx) {
            const a = ctx.config.auth;
            if (!a || !a.enabled) return;

            try {
                switch (a.type) {

                    case 'basic': {
                        // Base64(user:pass) → Authorization: Basic ...
                        const raw = (a.user || '') + ':' + (a.pass || '');
                        const encoded = btoa(unescape(encodeURIComponent(raw)));
                        pm.request.headers.upsert({ key: 'Authorization', value: 'Basic ' + encoded });
                        break;
                    }

                    case 'bearer': {
                        // → Authorization: Bearer {token}
                        pm.request.headers.upsert({ key: 'Authorization', value: 'Bearer ' + (a.token || '') });
                        break;
                    }

                    case 'headers': {
                        // Произвольные заголовки: { "X-Api-Key": "value" }
                        Object.entries(a.fields || {}).forEach(([k, v]) => {
                            pm.request.headers.upsert({ key: k, value: v });
                        });
                        break;
                    }

                    case 'variables': {
                        // Произвольные pm.variables — используй {{имя}} в теле/URL/заголовках
                        Object.entries(a.fields || {}).forEach(([k, v]) => {
                            pm.variables.set(k, v);
                        });
                        break;
                    }

                    default:
                        ctx._meta.errors.push('auth: неизвестный тип "' + a.type + '". Допустимые: none, basic, bearer, headers, variables');
                }
            } catch (e) {
                ctx._meta.errors.push('auth: ошибка — ' + e.message);
            }
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: dateUtils
    // pm.variables: currentDate, monthsAgo1/3/6/12
    // ════════════════════════════════════════════════════════════
    const dateUtils = {
        _shift(date, months) {
            const d = new Date(date), day = d.getDate();
            d.setDate(1);
            d.setMonth(d.getMonth() - months);
            d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
            return d;
        },
        _format(date, fmt) {
            const pad = (v, n) => String(v).padStart(n || 2, '0');
            const off = -date.getTimezoneOffset(), sign = off >= 0 ? '+' : '-', abs = Math.abs(off);
            return [
                ['yyyy', date.getFullYear()],
                ['MM',   pad(date.getMonth() + 1)],
                ['dd',   pad(date.getDate())],
                ['hh',   pad(date.getHours())],
                ['mm',   pad(date.getMinutes())],
                ['ss',   pad(date.getSeconds())],
                ['nnn',  pad(date.getMilliseconds(), 3)],
                ['tt00', sign + pad(Math.floor(abs / 60)) + pad(abs % 60)]
            ].reduce((s, [t, v]) => s.split(t).join(String(v)), fmt);
        },
        run(ctx) {
            const fmt = ctx.config.dateFormat || 'yyyy-MM-dd', now = new Date();
            [['currentDate', 0], ['monthsAgo1', 1], ['monthsAgo3', 3], ['monthsAgo6', 6], ['monthsAgo12', 12]]
                .forEach(([key, n]) => pm.variables.set(key, this._format(n === 0 ? now : this._shift(now, n), fmt)));
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: logger
    //
    // МАСКИРОВАНИЕ СЕКРЕТОВ:
    //   Маскирует реальные значения в ctx.config перед выводом.
    //   Правило: если имя ключа содержит слово из ctx.config.secrets
    //            → значение заменяется на masked-строку (первые/последние 20%).
    //   Применяется к auth.fields, auth.token, auth.pass.
    //   Реальные значения НЕ изменяются (используется клон config для логов).
    // ════════════════════════════════════════════════════════════
    const logger = {

        // Маскирует середину строки: первые и последние 20% остаются
        _maskStr(str) {
            if (!str || typeof str !== 'string' || str.length < 6) return '***';
            const keep = Math.max(1, Math.floor(str.length * 0.2));
            return str.slice(0, keep) + '***MASKED***' + str.slice(-keep);
        },

        // Проверяет, нужно ли маскировать значение по имени ключа
        _isSensitive(key, secrets) {
            if (!secrets || secrets.length === 0) return false;
            const k = key.toLowerCase();
            return secrets.some(s => k.includes(s.toLowerCase()));
        },

        // Рекурсивно маскирует чувствительные поля объекта
        _maskObj(obj, secrets) {
            if (!obj || typeof obj !== 'object') return obj;
            const result = {};
            Object.keys(obj).forEach(k => {
                if (this._isSensitive(k, secrets)) {
                    result[k] = typeof obj[k] === 'string' ? this._maskStr(obj[k]) : '***';
                } else if (typeof obj[k] === 'object' && obj[k] !== null) {
                    result[k] = this._maskObj(obj[k], secrets);
                } else {
                    result[k] = obj[k];
                }
            });
            return result;
        },

        // Формирует безопасное описание auth-конфига для отображения в логах.
        // Значения credentials никогда не попадают в console в открытом виде.
        _authInfo(auth, secrets) {
            if (!auth || !auth.enabled) return 'none (отключена)';

            const ALL_SECRETS = ['token', 'pass', 'password', 'secret', 'key', 'authorization']
                .concat(secrets || []);

            switch (auth.type) {
                case 'basic':
                    return 'basic → Authorization: Basic [user=' +
                        (auth.user || '?') + ', pass=' + this._maskStr(auth.pass || '') + ']';

                case 'bearer':
                    return 'bearer → Authorization: Bearer ' +
                        this._maskStr(auth.token || '');

                case 'headers': {
                    const fields = Object.entries(auth.fields || {}).map(([k, v]) => {
                        return k + '=' + (this._isSensitive(k, ALL_SECRETS) ? this._maskStr(v) : v);
                    });
                    return 'headers [' + fields.join(', ') + ']';
                }

                case 'variables': {
                    const fields = Object.entries(auth.fields || {}).map(([k, v]) => {
                        return k + '=' + (this._isSensitive(k, ALL_SECRETS) ? this._maskStr(v) : v);
                    });
                    return 'variables [' + fields.join(', ') + ']';
                }

                default:
                    return auth.type + ' (неизвестный тип)';
            }
        },

        summary(ctx) {
            const c  = ctx.config;
            const r  = ctx.request;
            const ts = ctx._meta.startedAt.replace('T', ' ').slice(0, 19);

            console.log([
                '╔══════════════════════════════════════════════════════════════╗',
                '║  🚀 HEPHAESTUS v' + VERSION + '  ·  PRE-REQUEST',
                '║  📅 ' + ts + ' UTC',
                '╠══════════════════════════════════════════════════════════════╣',
                '║  📋 REQUEST  ' + r.method + '  ' + r.name,
                '║  🌐 URL      ' + (r.url || '—'),
                '║  👤 AUTH     ' + this._authInfo(c.auth, c.secrets),
                '║  📅 DATE     ' + (pm.variables.get('currentDate') || '—') +
                    '  (fmt: ' + (c.dateFormat || 'yyyy-MM-dd') + ')',
                '╚══════════════════════════════════════════════════════════════╝'
            ].join('\n'));

            if (ctx._meta.errors.length > 0) {
                console.warn(
                    '⚠️  [Hephaestus] Ошибки инициализации:\n' +
                    ctx._meta.errors.map(e => '  • ' + e).join('\n')
                );
            }
        }
    };

    // ════════════════════════════════════════════════════════════
    // ORCHESTRATOR — Pre-Request Pipeline
    // configMerge → urlBuilder → auth → dateUtils → logger.summary
    // ════════════════════════════════════════════════════════════
    try {
        configMerge.run(ctx, _override);
        urlBuilder.run(ctx);
        auth.run(ctx);       // реальные значения → в заголовки/переменные
        dateUtils.run(ctx);
        logger.summary(ctx); // в логах только маскированные значения
    } catch (e) {
        pm.test('🚫 Hephaestus pre-request: критическая ошибка', () => {
            throw new Error('[v' + VERSION + '] ' + e.message);
        });
    }

})();
