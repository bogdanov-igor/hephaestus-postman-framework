// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Hephaestus v3 — Engine Update                                          ║
// ║  Вставить в Pre-request Script метода "🔧 engine-update"                ║
// ║  Запустить для загрузки/обновления движка из git в collectionVariables  ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Версия для загрузки: "main" (последняя) или конкретный тег, например "v3.1.0"
// Управляется через collectionVariables["hephaestus.version"]
const version = pm.collectionVariables.get("hephaestus.version") || "main";

const REPO_RAW = "https://raw.githubusercontent.com/YOUR_ORG/hephaestus-postman-framework";
const ref = version === "main" ? "main" : `v${version}`;

const ENGINE_FILES = [
    {
        key: "hephaestus.v3.pre",
        path: "v3/engine/pre-request.js",
        label: "Pre-Request Engine"
    },
    {
        key: "hephaestus.v3.post",
        path: "v3/engine/post-request.js",
        label: "Post-Request Engine"
    }
];

let completed = 0;
let failed = 0;

ENGINE_FILES.forEach(({ key, path, label }) => {
    pm.sendRequest(`${REPO_RAW}/${ref}/${path}`, (err, res) => {
        if (err) {
            failed++;
            pm.test(`❌ [engine-update] ${label} — сетевая ошибка`, () => {
                throw new Error(err.message);
            });
            return;
        }

        if (res.code !== 200) {
            failed++;
            pm.test(`❌ [engine-update] ${label} — HTTP ${res.code}`, () => {
                throw new Error(`Файл не найден: ${path} (ref: ${ref})`);
            });
            return;
        }

        pm.collectionVariables.set(key, res.text());
        completed++;

        pm.test(`✅ [engine-update] ${label} загружен (ref: ${ref})`, () => {
            pm.expect(pm.collectionVariables.get(key)).to.be.a("string").and.have.length.above(0);
        });

        if (completed + failed === ENGINE_FILES.length) {
            if (failed === 0) {
                pm.collectionVariables.set("hephaestus.engineRef", ref);
                pm.collectionVariables.set("hephaestus.updatedAt", new Date().toISOString());
                console.log(`🚀 Hephaestus v3 engine обновлён: ref=${ref}`);
            } else {
                console.warn(`⚠️ Обновление завершено с ошибками: ${failed} из ${ENGINE_FILES.length} файлов не загружены`);
            }
        }
    });
});
