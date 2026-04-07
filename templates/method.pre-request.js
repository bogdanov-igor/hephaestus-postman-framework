// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Hephaestus v3 — Pre-Request Template                                   ║
// ║  Редактировать ТОЛЬКО секцию override                                   ║
// ║  Остальное — не трогать                                                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝

const override = { // eslint-disable-line no-unused-vars

    // ── URL ──────────────────────────────────────────────────────────────────
    // Если метод идёт на тот же сервер что в defaults — убрать baseUrl отсюда
    // baseUrl: "https://other-api.example.com",

    // ── Авторизация ───────────────────────────────────────────────────────────
    // По умолчанию отключена (из defaults). Включить если нужно:
    auth: {
        enabled: false,

        // Примеры:

        // Без авторизации:
        // type: "none"

        // Basic (Base64 login:password → Authorization: Basic ...):
        // type: "basic",
        // user: "{{login}}",
        // pass: "{{password}}"

        // Bearer токен (→ Authorization: Bearer ...):
        // type: "bearer",
        // token: "{{prod.token}}"

        // Произвольные заголовки:
        // type: "headers",
        // fields: { "X-Api-Key": "{{api_key}}", "X-Tenant": "ucell" }

        // Произвольные pm.variables (используешь {{имя}} в теле/URL/заголовках метода):
        // type: "variables",
        // fields: {
        //   "login":    "{{login.technical.main}}",
        //   "channel":  "{{channel.technical.main}}",
        //   "password": "{{password.technical.main}}"
        //   // или любой другой набор:
        //   // "clientId": "{{client_id}}",
        //   // "secret":   "{{client_secret}}"
        // }

        // OAuth2 client_credentials (автообновляемый токен):
        // type: "oauth2cc",
        // oauth2cc: {
        //   tokenUrl:     "https://auth.example.com/oauth/token",
        //   clientId:     "{{oauth_client_id}}",
        //   clientSecret: "{{oauth_client_secret}}",
        //   scope:        "api:read api:write",   // опционально
        //   // extraParams: { "audience": "https://api.example.com" }
        // }
        // Токен кешируется в collectionVariables и обновляется автоматически.
    },

    // ── Обязательные переменные environment (v3.5) ────────────────────────────
    // Запрос не уйдёт если хотя бы одна переменная пуста/отсутствует:
    // envRequired: ["BASE_URL", "OAUTH_CLIENT_ID", "DB_PASSWORD"]

    // ── Формат даты ───────────────────────────────────────────────────────────
    // Если нужен формат, отличный от defaults:
    // dateFormat: "yyyy-MM-dd'T'hh:mm:ss.nnn+tt00"

    // ── Генераторы тестовых данных (v3.8) ─────────────────────────────────────
    // Автоматически заполняет pm.variables перед запросом:
    //   "random.email"       → "user_a3f2c1@test.com"
    //   "random.uuid"        → "550e8400-e29b-41d4-a716-..."
    //   "random.int:1:9999"  → "4287"
    //   "random.str:16"      → "xk8mP2nQ7w3bRz9v"
    //   "random.bool"        → "true"
    //   "random.date"        → "2025-09-14"
    // randomData: {
    //   email:   "random.email",
    //   userId:  "random.int:1:9999",
    //   orderId: "random.uuid",
    // }
    // Затем используй {{email}}, {{userId}}, {{orderId}} в теле/URL/заголовках.

};

// ─────────────────────────────────────────────────────────────────────────────
// Движок — не редактировать
// ─────────────────────────────────────────────────────────────────────────────
eval(pm.collectionVariables.get("hephaestus.v3.pre"));
