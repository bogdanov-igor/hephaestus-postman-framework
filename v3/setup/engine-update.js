// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Hephaestus v3 — Engine Update                                          ║
// ║  Вставить в Pre-request Script метода "🔧 engine-update"                ║
// ║  Запустить для загрузки/обновления движка из git в collectionVariables  ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║  © 2026 Богданов Игорь Александрович  bogdanov.ig.alex@gmail.com        ║
// ║  https://github.com/bogdanov-igor/hephaestus-postman-framework          ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ── Конфигурация ──────────────────────────────────────────────────────────
// hephaestus.version     — "main" или "3.1.0" (тег без "v")
// hephaestus.githubToken — GitHub PAT (classic или fine-grained)
//                          Публичный репо: оставить пустым
//                          Приватный репо: токен с доступом к Contents (read)

const REPO_OWNER = "bogdanov-igor";
const REPO_NAME  = "hephaestus-postman-framework";

const version = pm.collectionVariables.get("hephaestus.version") || "main";
const token   = pm.collectionVariables.get("hephaestus.githubToken")
             || pm.environment.get("hephaestus.githubToken")
             || "";

const ref = version === "main" ? "main" : "v" + version;

const ENGINE_FILES = [
    { key: "hephaestus.v3.pre",  path: "v3/engine/pre-request.js",  label: "Pre-Request Engine"  },
    { key: "hephaestus.v3.post", path: "v3/engine/post-request.js", label: "Post-Request Engine" }
];

// Приватный репо → GitHub API (поддерживает classic и fine-grained PAT)
// Публичный репо → raw.githubusercontent.com (без токена)
var useApi = !!token;
console.log(useApi
    ? "🔐 Загрузка через GitHub API (приватный репо, token задан)"
    : "ℹ️ Загрузка через raw.githubusercontent.com (публичный репо)"
);

var completed = 0;
var failed    = 0;

ENGINE_FILES.forEach(function(file) {
    var request;

    if (useApi) {
        // GitHub Contents API: возвращает сырой файл при Accept: application/vnd.github.raw
        request = {
            url:    "https://api.github.com/repos/" + REPO_OWNER + "/" + REPO_NAME + "/contents/" + file.path + "?ref=" + ref,
            method: "GET",
            header: {
                "Authorization": "Bearer " + token,
                "Accept":        "application/vnd.github.raw",
                "X-GitHub-Api-Version": "2022-11-28"
            }
        };
    } else {
        request = {
            url:    "https://raw.githubusercontent.com/" + REPO_OWNER + "/" + REPO_NAME + "/" + ref + "/" + file.path,
            method: "GET",
            header: {}
        };
    }

    pm.sendRequest(request, function(err, res) {
        if (err) {
            failed++;
            pm.test("❌ " + file.label + " — сетевая ошибка", function() {
                throw new Error(err.message);
            });
            return;
        }

        if (res.code === 401) {
            failed++;
            pm.test("❌ " + file.label + " — HTTP 401 Unauthorized", function() {
                throw new Error(
                    "Токен недействителен или истёк.\n" +
                    "Проверь: hephaestus.githubToken задан верно и не истёк."
                );
            });
            return;
        }

        if (res.code === 403) {
            failed++;
            pm.test("❌ " + file.label + " — HTTP 403 Forbidden", function() {
                throw new Error(
                    "Нет прав на чтение репозитория.\n" +
                    "Fine-grained token: добавь разрешение Contents → Read-only для репо " + REPO_NAME + ".\n" +
                    "Classic token: нужен scope 'repo'."
                );
            });
            return;
        }

        if (res.code === 404) {
            failed++;
            pm.test("❌ " + file.label + " — HTTP 404", function() {
                throw new Error(
                    "Файл не найден: " + file.path + " (ref: " + ref + ").\n" +
                    "Проверь: hephaestus.version задан верно."
                );
            });
            return;
        }

        if (res.code !== 200) {
            failed++;
            pm.test("❌ " + file.label + " — HTTP " + res.code, function() {
                throw new Error("Неожиданный ответ: HTTP " + res.code);
            });
            return;
        }

        pm.collectionVariables.set(file.key, res.text());
        completed++;

        pm.test("✅ " + file.label + " загружен (ref: " + ref + ")", function() {
            pm.expect(pm.collectionVariables.get(file.key))
                .to.be.a("string").and.have.length.above(0);
        });

        if (completed + failed === ENGINE_FILES.length) {
            if (failed === 0) {
                pm.collectionVariables.set("hephaestus.engineRef", ref);
                pm.collectionVariables.set("hephaestus.updatedAt", new Date().toISOString());
                console.log("🚀 Hephaestus engine обновлён: ref=" + ref);
            } else {
                console.warn("⚠️ Обновление с ошибками: " + failed + "/" + ENGINE_FILES.length + " файлов не загружены");
            }
        }
    });
});
