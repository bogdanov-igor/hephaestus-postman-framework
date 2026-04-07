// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Hephaestus v3 — Post-Request Template                                  ║
// ║  Редактировать ТОЛЬКО секцию override                                   ║
// ║  Остальное — не трогать                                                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝

const override = { // eslint-disable-line no-unused-vars

    // ── Ожидаемый формат ответа ───────────────────────────────────────────────
    contentType: "json",  // "json" | "xml" | "text"
    expectEmpty: false,   // true → ожидаем пустое тело (напр. 204)

    // ── Ожидаемые HTTP-статусы ────────────────────────────────────────────────
    // По умолчанию: [200, 201, 202]
    // Число:  expectedStatus: 204
    // Массив: expectedStatus: [200, 201]
    // Негативный сценарий: expectedStatus: 400
    // expectedStatus: [200, 201, 202],

    // ── Проверка заголовков ответа ────────────────────────────────────────────
    assertHeaders: [
        // Заголовок существует:
        // { name: "X-Request-Id" }

        // Заголовок содержит строку:
        // { name: "Content-Type", expect: "application/json" }

        // Точное совпадение:
        // { name: "X-Api-Version", equals: "v2" }

        // Условие через функцию:
        // { name: "X-Rate-Limit-Remaining", label: "Rate limit > 0", expect: v => Number(v) > 0 }

        // Заголовок отсутствует:
        // { name: "X-Deprecated", absent: true }
    ],

    // ── Автоповтор запроса при статусе (v3.7) ────────────────────────────────
    // retryOnStatus: { statuses: [503, 429], maxRetries: 3 }

    // ── Структурные проверки типов (v3.6) ─────────────────────────────────────
    // Быстрая валидация контракта: один тип на поле
    // Типы: string | number | boolean | object | array | null | any | absent
    assertShape: {
        // "data":        "object",
        // "data.id":     "number",
        // "data.name":   "string",
        // "data.items":  "array",
        // "meta":        "any",
        // "error":       "absent"
    },

    // ── Проверка сортировки массива (v3.6) ────────────────────────────────────
    // assertOrder: {
    //     path:      "data.items",
    //     by:        "createdAt",
    //     direction: "desc",     // "asc" | "desc"
    //     type:      "date"      // "string" | "number" | "date"
    // },

    // ── Shorthand assertions map (v3.4) ──────────────────────────────────────
    // Краткий синтаксис: { "path.to.field": { operators... } }
    // Операторы: exists, absent, eq, ne, gt, gte, lt, lte,
    //            type, minLen, maxLen, includes, matches, soft, when
    assertions: {
        // Поле существует:
        // "data.id": { exists: true }

        // Точное совпадение:
        // "data.status": { eq: "active" }

        // Диапазон:
        // "data.count": { gte: 1, lte: 100 }

        // Тип:
        // "data.items": { type: "array", minLen: 1 }

        // Regex / подстрока:
        // "data.email": { matches: "@" }

        // Поле отсутствует:
        // "meta.error": { absent: true }

        // Мягкая проверка:
        // "data.extra": { exists: true, soft: true }

        // Условная проверка (пропустить если статус 404):
        // "data.token": { exists: true, when: "ctx.api.status !== 404" }
    },

    // ── Проверка наличия значений в ответе ────────────────────────────────────
    keysToFind: [
        // Проверить что поле существует:
        // { path: "data.id", name: "ID записи" }

        // Проверить что поле существует И равно значению:
        // { path: "data.status", name: "Статус", expect: "active" }

        // Проверить через функцию:
        // { path: "data.code", name: "Код ответа", expect: v => v >= 200 && v < 300 }

        // Без учёта регистра:
        // { path: "data.type", name: "Тип", expect: "success", ignoreCase: true }

        // Мягкая проверка (не падает если поля нет):
        // { path: "data.extra", name: "Extra", soft: true }
    ],

    // ── Сохранение значений в переменные ──────────────────────────────────────
    varsToSave: {
        // Формат: alias: { path, scope, name, transform? }
        // Scope: "collection" | "environment" | "local"
        //
        // Пример:
        // token: { path: "SELFCARE.SESSION_ID", scope: "collection", name: "prod.token" }
    },

    // ── Проверка каждого элемента массива (v3.5) ──────────────────────────────
    assertEach: {
        path: "data.items",    // JSONPath к массиву в ответе
        minCount: 1,           // минимум N элементов (опционально)
        // maxCount: 100,      // максимум N элементов (опционально)
        rules: {
            // Те же операторы что и в assertions map:
            // "id":     { type: "number", gt: 0 }
            // "status": { exists: true }
            // "email":  { matches: "@", soft: true }  — мягкая
        }
    },

    // ── Подсчёт элементов ─────────────────────────────────────────────────────
    keysToCount: {
        // Формат: alias: { path, expected?, filter?, type? }
        //
        // Пример — ожидать 5 активных элементов:
        // items: { path: "data.items", expected: 5, filter: i => i.active === true }

        // Пример — считать ключи объекта:
        // fields: { path: "data.meta", expected: 3, type: "object" }
    },

    // ── Snapshot ──────────────────────────────────────────────────────────────
    snapshot: {
        enabled: false,

        // mode: "strict"      → полное совпадение ответа
        // mode: "non-strict"  → сравниваем только checkPaths (по умолчанию)
        // mode: "non-strict",

        // Что сравнивать ("пометить обязательные поля"):
        // checkPaths: ["data.status", "data.items[*].id"],

        // Что игнорировать:
        // ignorePaths: ["data.timestamp", "data.requestId"]
    },

    // ── Schema validation ─────────────────────────────────────────────────────
    schema: {
        enabled: false,

        // JSON Schema (draft-07):
        // definition: {
        //     type: "object",
        //     required: ["id", "status"],
        //     properties: {
        //         id:     { type: "number" },
        //         status: { type: "string", enum: ["active", "inactive"] }
        //     }
        // }
    },

    // ── Уникальность значений в массиве (v3.8) ────────────────────────────────
    // assertUnique: { path: "data.items", by: "id" }

    // ── Автоповтор при статусе (v3.7) ─────────────────────────────────────────
    // retryOnStatus: { statuses: [503, 429], maxRetries: 3 }

    // ── Вербозность лога (v3.8) ───────────────────────────────────────────────
    // logLevel: "normal",  // "silent" | "minimal" | "normal" | "verbose"

    // ── Все assertions — non-blocking (v3.8) ──────────────────────────────────
    // softFail: true

};

// ─────────────────────────────────────────────────────────────────────────────
// Движок — не редактировать
// ─────────────────────────────────────────────────────────────────────────────
eval(pm.collectionVariables.get("hephaestus.v3.post"));
