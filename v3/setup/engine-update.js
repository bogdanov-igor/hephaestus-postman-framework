// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Hephaestus v3 — Engine Update                                          ║
// ║  Вставить в Pre-request Script метода "🔧 engine-update"                ║
// ║  Запустить для загрузки/обновления движка из git в collectionVariables  ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║  © 2026 Богданов Игорь Александрович  bogdanov.ig.alex@gmail.com        ║
// ║  https://github.com/bogdanov-igor/hephaestus-postman-framework          ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ── Конфигурация ──────────────────────────────────────────────────────────
// hephaestus.version   — "main" (последняя) или "3.1.0" (конкретный тег)
// hephaestus.githubToken — Personal Access Token для приватного репозитория
//                          (оставить пустым для публичного репозитория)

const version = pm.collectionVariables.get("hephaestus.version") || "main";
const token   = pm.collectionVariables.get("hephaestus.githubToken")
             || pm.environment.get("hephaestus.githubToken")
             || "";

const REPO_RAW = "https://raw.githubusercontent.com/bogdanov-igor/hephaestus-postman-framework";
const ref      = version === "main" ? "main" : "v" + version;

const ENGINE_FILES = [
    { key: "hephaestus.v3.pre",  path: "v3/engine/pre-request.js",  label: "Pre-Request Engine"  },
    { key: "hephaestus.v3.post", path: "v3/engine/post-request.js", label: "Post-Request Engine" }
];

if (!token) {
    console.log("ℹ️ hephaestus.githubToken не задан — загрузка из публичного репозитория");
} else {
    console.log("🔐 hephaestus.githubToken найден — загрузка из приватного репозитория");
}

let completed = 0;
let failed    = 0;

ENGINE_FILES.forEach(function(file) {
    var request = {
        url:    REPO_RAW + "/" + ref + "/" + file.path,
        method: "GET",
        header: {}
    };

    if (token) {
        request.header["Authorization"] = "token " + token;
    }

    pm.sendRequest(request, function(err, res) {
        if (err) {
            failed++;
            pm.test("❌ " + file.label + " — сетевая ошибка", function() {
                throw new Error(err.message);
            });
            return;
        }

        if (res.code === 404) {
            failed++;
            pm.test("❌ " + file.label + " — HTTP 404", function() {
                throw new Error(
                    "Файл не найден: " + file.path + " (ref: " + ref + ")\n" +
                    "Причины: репозиторий приватный — задай hephaestus.githubToken, " +
                    "или неверный ref — проверь hephaestus.version"
                );
            });
            return;
        }

        if (res.code !== 200) {
            failed++;
            pm.test("❌ " + file.label + " — HTTP " + res.code, function() {
                throw new Error("Неожиданный ответ: HTTP " + res.code + " для " + file.path);
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
