// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Hephaestus v3 — Post-Request Template                                  ║
// ║  Редактировать ТОЛЬКО секцию override                                   ║
// ║  Остальное — не трогать                                                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝

const override = {

    // ── Ожидаемый формат ответа ───────────────────────────────────────────────
    contentType: "json",  // "json" | "xml" | "text"
    expectEmpty: false,   // true → ожидаем пустое тело (напр. 204)

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
    ],

    // ── Сохранение значений в переменные ──────────────────────────────────────
    varsToSave: {
        // Формат: alias: { path, scope, name, transform? }
        // Scope: "collection" | "environment" | "local"
        //
        // Пример:
        // token: { path: "SELFCARE.SESSION_ID", scope: "collection", name: "prod.token" }
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
    }

};

// ─────────────────────────────────────────────────────────────────────────────
// Движок — не редактировать
// ─────────────────────────────────────────────────────────────────────────────
eval(pm.collectionVariables.get("hephaestus.v3.post"));
