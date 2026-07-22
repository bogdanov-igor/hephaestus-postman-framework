// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Hephaestus v3 — Engine Update                                          ║
// ║  Вставить в Pre-request Script метода "🔧 engine-update"                ║
// ║  Запустить для загрузки/обновления движка из git в collectionVariables  ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║  © 2026 Bogdanov Igor  bogdanov.ig.alex@gmail.com                       ║
// ║  https://github.com/bogdanov-igor/hephaestus-postman-framework          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Примечание: шаблонная коллекция поставляется с УЖЕ вшитым движком
// (см. `npm run build:emit`), поэтому этот метод нужен только для ОБНОВЛЕНИЯ
// движка до другой версии, а не для первого запуска.
//
// ── Конфигурация ──────────────────────────────────────────────────────────
// hephaestus.version     — "main" или "4.0.1" (тег без "v")
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
    { key: "hephaestus.v3.pre",  path: "engine/pre-request.js",  label: "Pre-Request Engine"  },
    { key: "hephaestus.v3.post", path: "engine/post-request.js", label: "Post-Request Engine" }
];
const CHECKSUMS_PATH = "engine/checksums.json";

// Приватный репо → GitHub API (поддерживает classic и fine-grained PAT)
// Публичный репо → raw.githubusercontent.com (без токена)
var useApi = !!token;
console.log(useApi
    ? "🔐 Загрузка через GitHub API (приватный репо, token задан)"
    : "ℹ️ Загрузка через raw.githubusercontent.com (публичный репо)"
);

// Собирает конфиг pm.sendRequest для файла репозитория по его пути.
function buildRequest(filePath) {
    if (useApi) {
        // GitHub Contents API: возвращает сырой файл при Accept: application/vnd.github.raw
        return {
            url:    "https://api.github.com/repos/" + REPO_OWNER + "/" + REPO_NAME + "/contents/" + filePath + "?ref=" + ref,
            method: "GET",
            header: {
                "Authorization": "Bearer " + token,
                "Accept":        "application/vnd.github.raw",
                "X-GitHub-Api-Version": "2022-11-28"
            }
        };
    }
    return {
        url:    "https://raw.githubusercontent.com/" + REPO_OWNER + "/" + REPO_NAME + "/" + ref + "/" + filePath,
        method: "GET",
        header: {}
    };
}

// ── Шаг 1: манифест целостности (best-effort) ─────────────────────────────
// Сначала тянем engine/checksums.json. Если он доступен — сверяем sha256 каждого
// файла движка перед сохранением. Если недоступен (старый ref без манифеста) —
// апдейт продолжается без проверки (обратная совместимость).
pm.sendRequest(buildRequest(CHECKSUMS_PATH), function(err, res) {
    var expectedHashes = null;

    if (!err && res && res.code === 200) {
        try {
            var manifest = JSON.parse(res.text());
            if (manifest && manifest.files && manifest.algorithm === "sha256") {
                expectedHashes = manifest.files;
                console.log("🔒 Манифест целостности загружен — sha256, v" + (manifest.version || "?"));
            } else {
                console.warn("⚠️ Манифест целостности в неизвестном формате — проверка пропущена");
            }
        } catch (e) {
            console.warn("⚠️ Манифест целостности повреждён (невалидный JSON) — проверка пропущена");
        }
    } else {
        console.warn("⚠️ Манифест целостности недоступен для ref '" + ref + "' — проверка пропущена");
    }

    downloadEngine(expectedHashes);
});

// ── Шаг 2: загрузка и верификация файлов движка ───────────────────────────
function downloadEngine(expectedHashes) {
    var completed   = 0;
    var failed      = 0;
    var verified    = 0;      // файлов, чей sha256 реально сверён с манифестом
    var lastVersion = null;
    var staged      = {};     // file.key -> code; коммитим ТОЛЬКО если failed===0

    function maybeFinish() {
        if (completed + failed !== ENGINE_FILES.length) return;
        if (failed === 0) {
            // Атомарный коммит: движок пишется в переменные только когда ВСЕ файлы
            // прошли — иначе pre/post не разъедутся (никакого "франкенштейна").
            ENGINE_FILES.forEach(function(f) { pm.collectionVariables.set(f.key, staged[f.key]); });
            pm.collectionVariables.set("hephaestus.engineRef",     ref);
            pm.collectionVariables.set("hephaestus.engineVersion", lastVersion || ref);
            pm.collectionVariables.set("hephaestus.updatedAt",     new Date().toISOString());
            console.log([
                "╔══════════════════════════════════════════════════════════════╗",
                "║  🚀 HEPHAESTUS — ENGINE UPDATE COMPLETE                    ║",
                "╠══════════════════════════════════════════════════════════════╣",
                "║  Ref:       " + ref,
                "║  Version:   " + (lastVersion || "—"),
                "║  Integrity: " + (!expectedHashes ? "нет манифеста" : verified === ENGINE_FILES.length ? "sha256 ✅ (" + verified + "/" + ENGINE_FILES.length + ")" : "sha256 частично (" + verified + "/" + ENGINE_FILES.length + " проверено)"),
                "║  Updated:   " + new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
                "╚══════════════════════════════════════════════════════════════╝"
            ].join("\n"));
        } else {
            console.warn("⚠️ Обновление ОТМЕНЕНО: " + failed + "/" + ENGINE_FILES.length + " файлов не прошли — движок НЕ изменён (staged, не закоммичено)");
        }
    }

    ENGINE_FILES.forEach(function(file) {
        pm.sendRequest(buildRequest(file.path), function(err, res) {
            if (err || !res) {
                failed++;
                pm.test("❌ " + file.label + " — сетевая ошибка", function() {
                    throw new Error(err ? err.message : "нет ответа от сервера");
                });
                maybeFinish();
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
                maybeFinish();
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
                maybeFinish();
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
                maybeFinish();
                return;
            }

            if (res.code !== 200) {
                failed++;
                pm.test("❌ " + file.label + " — HTTP " + res.code, function() {
                    throw new Error("Неожиданный ответ: HTTP " + res.code);
                });
                maybeFinish();
                return;
            }

            var code   = res.text();
            var sizeKb = (code.length / 1024).toFixed(1);

            // Проверка целостности: sha256 загруженного кода против манифеста.
            var fileVerified = false;
            if (expectedHashes && expectedHashes[file.path]) {
                if (typeof CryptoJS === "undefined") {
                    console.warn("⚠️ CryptoJS недоступен — проверка целостности " + file.label + " пропущена");
                } else {
                    var actual   = CryptoJS.SHA256(code).toString();
                    var expected = expectedHashes[file.path];
                    if (actual !== expected) {
                        failed++;
                        pm.test("❌ " + file.label + " — нарушена целостность (sha256 mismatch)", function() {
                            throw new Error(
                                "Хэш не совпал: ожидался " + expected.slice(0, 12) + "…, получен " + actual.slice(0, 12) + "….\n" +
                                "Файл повреждён или подменён — код НЕ сохранён."
                            );
                        });
                        maybeFinish();
                        return;
                    }
                    verified++;
                    fileVerified = true;
                }
            } else if (expectedHashes) {
                console.warn("⚠️ Манифест не содержит хэш для " + file.path + " — файл НЕ верифицирован");
            }

            // Верификация: убеждаемся что загруженный код содержит VERSION-константу.
            // Кавычко-агностично: esbuild-бандл использует двойные кавычки.
            var versionMatch  = code.match(/(?:const|let|var)\s+VERSION\s*=\s*["']([^"']+)["']/);
            var loadedVersion = versionMatch ? versionMatch[1] : null;

            if (!loadedVersion) {
                failed++;
                pm.test("❌ " + file.label + " — VERSION-константа не найдена (повреждённый файл?)", function() {
                    throw new Error("VERSION-константа не найдена в загруженном коде — код НЕ сохранён");
                });
                maybeFinish();
                return;
            }

            // Стейджим, но НЕ коммитим — запись в переменные произойдёт в maybeFinish
            // только если ВСЕ файлы прошли (атомарность).
            staged[file.key] = code;
            lastVersion = loadedVersion;
            completed++;

            var intMark = fileVerified ? " 🔒" : "";
            pm.test("✅ " + file.label + " получен v" + loadedVersion + intMark + " (" + sizeKb + " KB, ref: " + ref + ")", function() {
                pm.expect(code).to.be.a("string").and.have.length.above(0);
            });

            maybeFinish();
        });
    });
}
