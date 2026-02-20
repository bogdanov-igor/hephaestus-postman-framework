// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Hephaestus v3 — Pre-Request Template                                   ║
// ║  Редактировать ТОЛЬКО секцию override                                   ║
// ║  Остальное — не трогать                                                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝

const override = {

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
        //   "pmv-login":    "{{login}}",
        //   "pmv-channel":  "{{channel}}",
        //   "pmv-password": "{{password}}"
        //   // или любой другой набор:
        //   // "pmv-clientId": "{{client_id}}",
        //   // "pmv-secret":   "{{client_secret}}"
        // }
    },

    // ── Формат даты ───────────────────────────────────────────────────────────
    // Если нужен формат, отличный от defaults:
    // dateFormat: "yyyy-MM-dd'T'hh:mm:ss.nnn+tt00"

};

// ─────────────────────────────────────────────────────────────────────────────
// Движок — не редактировать
// ─────────────────────────────────────────────────────────────────────────────
eval(pm.collectionVariables.get("hephaestus.v3.pre"));
