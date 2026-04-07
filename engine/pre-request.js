// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Hephaestus v3 — Pre-Request Engine                         v3.8.0      ║
// ║  Хранится в collectionVariables["hephaestus.v3.pre"]                   ║
// ║  Обновляется через setup/engine-update.js                               ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║  © 2026 Bogdanov Igor  bogdanov.ig.alex@gmail.com                       ║
// ║  https://github.com/bogdanov-igor/hephaestus-postman-framework          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// configMerge · envRequired · iterationData · random · urlBuilder · auth · dateUtils (flexible) · logger

(function hephaestusPreRequest() {

    const VERSION = '3.8.0';

    // override объявлен СНАРУЖИ (в скрипте метода), eval видит его через scope
    const _override = (typeof override !== 'undefined' && override !== null)
        ? override
        : {};

    // ════════════════════════════════════════════════════════════
    // CTX
    // ════════════════════════════════════════════════════════════
    // ctx.random — генераторы тестовых данных (доступны сразу)
    const _random = {
        uuid() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0;
                return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            });
        },
        email() { return 'user_' + Math.random().toString(16).slice(2, 8) + '@test.com'; },
        str(n)  {
            n = n || 12;
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            var s = '';
            for (var i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
            return s;
        },
        int(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
        float(min, max, dec) {
            dec = dec !== undefined ? dec : 2;
            return parseFloat((Math.random() * (max - min) + min).toFixed(dec));
        },
        bool()       { return Math.random() >= 0.5; },
        pick(arr)    { return arr[Math.floor(Math.random() * arr.length)]; },
        date(from, to) {
            var f = from ? new Date(from).getTime() : Date.now() - 365 * 24 * 3600 * 1000;
            var t = to   ? new Date(to).getTime()   : Date.now();
            return new Date(f + Math.random() * (t - f)).toISOString().slice(0, 10);
        }
    };

    const ctx = {
        config: {},
        request: {
            method: pm.request.method,
            name:   pm.info.requestName,
            url:    ''
        },
        random: _random,
        _meta: {
            version:   VERSION,
            startedAt: new Date().toISOString(),
            errors:    []
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: configMerge
    // ⚠️ SHARED — идентичная копия живёт в engine/post-request.js
    //    При изменении — обновить оба файла синхронно.
    //    TODO (v4): вынести в engine/shared/config-merge.js + build-step
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
    // MODULE: envRequired
    //
    // Проверяет, что обязательные переменные environment заданы
    // ПЕРЕД отправкой запроса — предотвращает запросы с пустыми
    // значениями и даёт понятное сообщение об ошибке.
    //
    // Конфиг (в hephaestus.defaults или override):
    //   envRequired: ["BASE_URL", "OAUTH_CLIENT_ID", "DB_PASSWORD"]
    //
    // Переменная считается "не задана" если:
    //   — отсутствует в environment
    //   — равна пустой строке ""
    //   — равна null/undefined
    // ════════════════════════════════════════════════════════════
    const envRequired = {
        run(ctx) {
            const required = ctx.config.envRequired;
            if (!required || !Array.isArray(required) || required.length === 0) return;

            const missing = required.filter(function(name) {
                var v = pm.environment.get(name);
                return v === null || v === undefined || v === '';
            });

            if (missing.length === 0) return;

            const envName = pm.environment.name || '(нет environment)';
            pm.test('⚠️ envRequired: отсутствуют переменные [' + missing.join(', ') + ']', function() {
                throw new Error(
                    'Обязательные environment variables не заданы:\n' +
                    missing.map(function(n) { return '  • ' + n; }).join('\n') + '\n' +
                    'Текущий environment: ' + envName + '\n' +
                    'Проверь настройки environment в Postman / Newman.'
                );
            });
            ctx._meta.errors.push('envRequired: не заданы [' + missing.join(', ') + '] в environment "' + envName + '"');
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: iterationData
    //
    // Экспонирует данные текущей итерации Newman в ctx.iteration.
    // Доступен при запуске через Newman с --iteration-data file.csv/json.
    //
    // ctx.iteration:
    //   index — текущая итерация (0-based)
    //   count — всего итераций
    //   data  — текущая строка как объект { field: value }
    //   get(key) — значение поля по ключу
    //
    // Автоматически устанавливает pm.variables("iter.fieldName") = value
    // Используй {{iter.email}}, {{iter.userId}} в URL / Body / Headers
    // ════════════════════════════════════════════════════════════
    const iterationData = {
        run(ctx) {
            var data = {};
            try {
                if (typeof pm.iterationData !== 'undefined' && pm.iterationData) {
                    data = (pm.iterationData.toObject ? pm.iterationData.toObject() : {}) || {};
                }
            } catch(e) { /* iterationData недоступен в этом контексте */ }

            ctx.iteration = {
                index: pm.info.iteration || 0,
                count: pm.info.iterationCount || 1,
                data:  data,
                get: function(key) {
                    try { return pm.iterationData ? pm.iterationData.get(key) : undefined; } catch(e) { return undefined; }
                }
            };

            // Инжектируем поля как pm.variables("iter.key") для {{iter.key}} в запросах
            Object.keys(data).forEach(function(key) {
                var val = data[key];
                pm.variables.set('iter.' + key, val !== null && val !== undefined ? String(val) : '');
            });
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: random
    //
    // Генераторы тестовых данных — доступны через ctx.random в плагинах и скриптах.
    // Автоматически заполняет pm.variables по конфигу randomData.
    //
    //   randomData: {                  // в override или defaults
    //     email:  "random.email",      // → pm.variables("random.email") = "user_abc@test.com"
    //     userId: "random.int:1:9999", // → pm.variables("random.userId") = "4287"
    //     token:  "random.uuid"        // → pm.variables("random.token") = "550e8400-..."
    //   }
    //
    //   ctx.random.uuid()            — UUID v4
    //   ctx.random.email()           — "user_<hex6>@test.com"
    //   ctx.random.str(n)            — случайная строка из a-z0-9 длиной n (default 12)
    //   ctx.random.int(min, max)     — целое в диапазоне [min, max]
    //   ctx.random.float(min,max,d)  — дробное, d десятичных знаков
    //   ctx.random.bool()            — true / false
    //   ctx.random.pick(arr)         — случайный элемент массива
    //   ctx.random.date(from?, to?)  — ISO-строка случайной даты в диапазоне
    // ════════════════════════════════════════════════════════════
    const random = {
        run(ctx) {
            const r = ctx.random;
            const rd = _override.randomData || ctx.config.randomData;
            if (!rd || typeof rd !== 'object') return;
            Object.keys(rd).forEach(function(varName) {
                const expr = String(rd[varName]);
                let val;
                if (expr === 'random.uuid')         val = r.uuid();
                else if (expr === 'random.email')   val = r.email();
                else if (expr === 'random.bool')    val = String(r.bool());
                else if (expr === 'random.str')     val = r.str(12);
                else if (expr.startsWith('random.str:')) val = r.str(parseInt(expr.split(':')[1], 10) || 12);
                else if (expr.startsWith('random.int:')) {
                    const p = expr.split(':');
                    val = String(r.int(parseInt(p[1], 10), parseInt(p[2], 10)));
                } else if (expr.startsWith('random.float:')) {
                    const p = expr.split(':');
                    val = String(r.float(parseFloat(p[1]), parseFloat(p[2]), parseInt(p[3], 10) || 2));
                } else if (expr === 'random.date') val = r.date();
                else val = expr; // literal

                pm.variables.set(varName, val !== null && val !== undefined ? String(val) : '');
            });
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: urlBuilder
    // Ставит pm.variables("baseUrl") — используй {{baseUrl}} в URL метода
    // ════════════════════════════════════════════════════════════
    const urlBuilder = {
        run(ctx) {
            const defaultProtocol = (ctx.config.defaultProtocol || 'https').replace(/:\/\/$/, '').toLowerCase();
            let rawUrl = (ctx.config.baseUrl || '').trim().replace(/\/$/, '');

            // Автоподстановка протокола, если не указан
            if (rawUrl && !/^https?:\/\//i.test(rawUrl)) {
                rawUrl = defaultProtocol + '://' + rawUrl;
                console.log('🌐 urlBuilder: протокол не указан — подставлен "' + defaultProtocol + '://"');
            }

            pm.test('🌐 URL: базовый адрес задан', () => {
                pm.expect(rawUrl, '🚫 baseUrl не задан ни в defaults, ни в override').to.be.a('string').and.have.length.above(0);
            });

            // Предупреждение при http (не блокирует выполнение)
            if (/^http:\/\//i.test(rawUrl)) {
                pm.test('⚠️ URL: небезопасный протокол http', () => {
                    console.warn('⚠️ baseUrl использует http:// — убедись, что это намеренно.');
                    pm.expect(true).to.be.true;
                });
            }

            pm.variables.set('baseUrl', rawUrl);
            ctx.request.url = rawUrl;
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: auth
    // Plugin, отключён по умолчанию.
    // Типы: none | basic | bearer | headers | variables | oauth2cc
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

                    case 'none':
                        break;

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

                    case 'oauth2cc': {
                        // OAuth2 client_credentials grant.
                        //
                        // Конфиг (в override.auth.oauth2cc):
                        //   tokenUrl    — URL сервера авторизации
                        //   clientId    — client_id
                        //   clientSecret — client_secret (или используй secrets.oauthClientSecret)
                        //   scope       — запрашиваемые scope (опционально)
                        //   extraParams — { key: value, ... } дополнительные параметры тела
                        //
                        // Токен кешируется в collectionVariables["hephaestus.oauth2.{clientId}.*"]
                        // и автоматически обновляется при истечении (с буфером 60с).
                        //
                        const oa  = a.oauth2cc || {};
                        const ns  = 'hephaestus.oauth2.' + (oa.clientId || 'default');
                        const tok = pm.collectionVariables.get(ns + '.token');
                        const exp = parseInt(pm.collectionVariables.get(ns + '.expiry') || '0');
                        const now = Date.now();

                        if (tok && exp > now + 60000) {
                            // Токен ещё действует — используем кеш
                            pm.request.headers.upsert({ key: 'Authorization', value: 'Bearer ' + tok });
                            break;
                        }

                        // Нужен новый токен
                        const body = [
                            { key: 'grant_type',    value: 'client_credentials' },
                            { key: 'client_id',     value: oa.clientId || '' },
                            { key: 'client_secret', value: oa.clientSecret || (ctx.config.secrets && ctx.config.secrets.oauthClientSecret) || pm.environment.get('OAUTH_CLIENT_SECRET') || '' },
                        ];
                        if (oa.scope) body.push({ key: 'scope', value: oa.scope });
                        Object.entries(oa.extraParams || {}).forEach(([k, v]) => body.push({ key: k, value: v }));

                        pm.sendRequest({
                            url:    oa.tokenUrl,
                            method: 'POST',
                            header: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body:   { mode: 'urlencoded', urlencoded: body.filter(p => p.value) }
                        }, function(err, response) {
                            if (err || !response) {
                                ctx._meta.errors.push('oauth2cc: ' + (err ? err.message : 'нет ответа'));
                                return;
                            }
                            var tokenBody;
                            try { tokenBody = response.json(); } catch(je) {
                                ctx._meta.errors.push('oauth2cc: невалидный JSON в ответе сервера авторизации');
                                return;
                            }
                            var accessToken = tokenBody.access_token;
                            if (!accessToken) {
                                ctx._meta.errors.push('oauth2cc: нет access_token в ответе');
                                return;
                            }
                            var expiresIn = ((tokenBody.expires_in || 3600) * 1000);
                            pm.collectionVariables.set(ns + '.token',  accessToken);
                            pm.collectionVariables.set(ns + '.expiry', String(now + expiresIn));
                            pm.request.headers.upsert({ key: 'Authorization', value: 'Bearer ' + accessToken });
                        });
                        break;
                    }

                    default:
                        ctx._meta.errors.push('auth: неизвестный тип "' + a.type + '". Допустимые: none, basic, bearer, headers, variables, oauth2cc');
                }
            } catch (e) {
                ctx._meta.errors.push('auth: ошибка — ' + e.message);
            }
        }
    };

    // ════════════════════════════════════════════════════════════
    // MODULE: dateUtils
    //
    // Встроенные pm.variables (всегда):
    //   currentDate, monthsAgo1, monthsAgo3, monthsAgo6, monthsAgo12
    //
    // Пользовательские переменные через override.dates:
    //   dates: { "varName": "<expression>" }
    //
    // Выражения:
    //   today | yesterday | tomorrow
    //   startOfMonth | endOfMonth
    //   startOfNextMonth | endOfNextMonth
    //   startOfPrevMonth | endOfPrevMonth
    //   startOfYear | endOfYear
    //   today+7d | today-1d | today+2w | today-1m | today+1y
    //   (d=дни, w=недели, m=месяцы, y=годы)
    // ════════════════════════════════════════════════════════════
    const dateUtils = {
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
        // Сдвиг на N месяцев с учётом граничных дат месяца (обратная совместимость)
        _shiftMonths(date, months) {
            const d = new Date(date), day = d.getDate();
            d.setDate(1);
            d.setMonth(d.getMonth() - months);
            d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
            return d;
        },
        // Последний день месяца для заданного года/месяца
        _lastDay(y, m) { return new Date(y, m + 1, 0).getDate(); },
        // Парсит выражение в Date (или null если не распознано)
        _parse(expr, now) {
            const e = (expr || '').trim().toLowerCase();
            const cp = () => new Date(now);
            if (e === 'today')              return cp();
            if (e === 'yesterday')          { const d = cp(); d.setDate(d.getDate() - 1); return d; }
            if (e === 'tomorrow')           { const d = cp(); d.setDate(d.getDate() + 1); return d; }
            if (e === 'startofmonth')       { const d = cp(); d.setDate(1); return d; }
            if (e === 'endofmonth')         { const d = cp(); d.setDate(this._lastDay(d.getFullYear(), d.getMonth())); return d; }
            if (e === 'startofnextmonth')   { const d = cp(); d.setDate(1); d.setMonth(d.getMonth() + 1); return d; }
            if (e === 'endofnextmonth')     { const d = cp(); d.setDate(1); d.setMonth(d.getMonth() + 2); d.setDate(0); return d; }
            if (e === 'startofprevmonth')   { const d = cp(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d; }
            if (e === 'endofprevmonth')     { const d = cp(); d.setDate(1); d.setDate(0); return d; }
            if (e === 'startofyear')        { return new Date(now.getFullYear(), 0, 1); }
            if (e === 'endofyear')          { return new Date(now.getFullYear(), 11, 31); }
            // today±Nd/w/m/y
            const m = e.match(/^today([+-])(\d+)([dwmy])$/);
            if (m) {
                const n = parseInt(m[2]) * (m[1] === '+' ? 1 : -1);
                const d = cp();
                if (m[3] === 'd') { d.setDate(d.getDate() + n); }
                else if (m[3] === 'w') { d.setDate(d.getDate() + n * 7); }
                else if (m[3] === 'm') {
                    const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n);
                    d.setDate(Math.min(day, this._lastDay(d.getFullYear(), d.getMonth())));
                }
                else if (m[3] === 'y') { d.setFullYear(d.getFullYear() + n); }
                return d;
            }
            return null;
        },
        run(ctx) {
            const fmt = ctx.config.dateFormat || 'yyyy-MM-dd';
            const now = new Date();
            // Встроенные переменные (обратная совместимость)
            [['currentDate', 0], ['monthsAgo1', 1], ['monthsAgo3', 3], ['monthsAgo6', 6], ['monthsAgo12', 12]]
                .forEach(([key, n]) => pm.variables.set(key, this._format(n === 0 ? now : this._shiftMonths(now, n), fmt)));
            // Пользовательские переменные из config.dates
            const dates = ctx.config.dates;
            if (dates && typeof dates === 'object') {
                Object.keys(dates).forEach(varName => {
                    const d = this._parse(dates[varName], now);
                    if (d) {
                        pm.variables.set(varName, this._format(d, fmt));
                    } else {
                        ctx._meta.errors.push('dateUtils: неизвестное выражение "' + dates[varName] + '" для "' + varName + '"');
                    }
                });
            }
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
            const c     = ctx.config;
            const r     = ctx.request;
            const ts    = ctx._meta.startedAt.replace('T', ' ').slice(0, 19);
            const level = c.logLevel || 'normal';

            if (level === 'silent') return;

            if (level === 'minimal') {
                console.log('[H→] ' + r.method + ' ' + r.name + ' · ' + (r.url || '—').slice(0, 80));
                return;
            }

            const iter = ctx.iteration;
            const iterLine = (iter && iter.count > 1)
                ? '║  🔄 ITERATION  ' + (iter.index + 1) + ' / ' + iter.count +
                  (Object.keys(iter.data).length > 0 ? '  [' + Object.keys(iter.data).join(', ') + ']' : '')
                : null;

            const logLines = [
                '╔══════════════════════════════════════════════════════════════╗',
                '║  🚀 HEPHAESTUS v' + VERSION + '  ·  PRE-REQUEST',
                '║  📅 ' + ts + ' UTC',
                '╠══════════════════════════════════════════════════════════════╣',
                '║  📋 REQUEST  ' + r.method + '  ' + r.name,
                '║  🌐 URL      ' + (r.url || '—'),
                '║  👤 AUTH     ' + this._authInfo(c.auth, c.secrets),
                '║  📅 DATE     ' + (pm.variables.get('currentDate') || '—') +
                    '  (fmt: ' + (c.dateFormat || 'yyyy-MM-dd') + ')'
            ];
            if (iterLine) logLines.push(iterLine);
            logLines.push('╚══════════════════════════════════════════════════════════════╝');
            console.log(logLines.join('\n'));

            if (ctx._meta.errors.length > 0) {
                console.warn(
                    '⚠️  [Hephaestus] Ошибки инициализации:\n' +
                    ctx._meta.errors.map(e => '  • ' + e).join('\n')
                );
            }
        }
    };

    // ════════════════════════════════════════════════════════════
    // ORCHESTRATOR — Pre-Request Pipeline (v3.5)
    // configMerge → envRequired → iterationData → urlBuilder → auth → dateUtils → logger.summary
    // ════════════════════════════════════════════════════════════
    try {
        configMerge.run(ctx, _override);
        envRequired.run(ctx);
        iterationData.run(ctx);
        random.run(ctx);     // генерирует pm.variables из randomData config
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
