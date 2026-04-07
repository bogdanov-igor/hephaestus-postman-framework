// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Hephaestus v3 — Snapshot View Utility                      v3.5.0      ║
// ║  Вставить в Pre-request Script метода "📋 snapshot-view"                ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Показывает содержимое hephaestus.snapshots в Console.
// Только чтение — ничего не изменяет.
//
// Управление через collectionVariables:
//
//   hephaestus.snapshot.viewFilter — фильтр для отображения (подстрока в ключе)
//     Пусто / не задан → показать все снапшоты (только ключи + метаданные)
//     "Login"          → показать только снапшоты с "Login" в ключе (+ данные)

const viewFilter = pm.collectionVariables.get('hephaestus.snapshot.viewFilter') || '';

// ── Загрузка хранилища ────────────────────────────────────────────────────
let store = {};
try {
    const raw = pm.collectionVariables.get('hephaestus.snapshots');
    store = raw ? JSON.parse(raw) : {};
} catch (e) {
    pm.test('📋 Snapshot View: ошибка чтения', () => { throw new Error(e.message); });
    return;
}

const allKeys   = Object.keys(store);
const totalSize = JSON.stringify(store).length;
const sizeKb    = (totalSize / 1024).toFixed(2);
// Postman collectionVariable limit: ~256 KB per variable
const LIMIT_KB  = 256;
const usePct    = Math.min(100, (totalSize / (LIMIT_KB * 1024) * 100)).toFixed(1);
const sizeWarn  = parseFloat(usePct) >= 80 ? ' ⚠️' : '';

// ── Заголовок ─────────────────────────────────────────────────────────────
console.log([
    '╔══════════════════════════════════════════════════════════════╗',
    '║  📋 HEPHAESTUS — SNAPSHOT VIEW                              ║',
    '╠══════════════════════════════════════════════════════════════╣',
    '║  Всего снапшотов: ' + allKeys.length,
    '║  Объём хранилища: ' + sizeKb + ' KB / ~' + LIMIT_KB + ' KB (' + usePct + '% использовано)' + sizeWarn,
    viewFilter ? '║  Фильтр: "' + viewFilter + '"' : '║  Фильтр: нет (все снапшоты)',
    '╚══════════════════════════════════════════════════════════════╝'
].join('\n'));

if (allKeys.length === 0) {
    pm.test('📋 Snapshot View: хранилище пустое', () => pm.expect(true).to.be.true);
    console.log('ℹ️ hephaestus.snapshots пустое — снапшоты ещё не созданы.');
    return;
}

// ── Вывод снапшотов ───────────────────────────────────────────────────────
const targetKeys = viewFilter
    ? allKeys.filter(k => k.includes(viewFilter))
    : allKeys;

if (targetKeys.length === 0) {
    pm.test('📋 Snapshot View: ничего не найдено по фильтру "' + viewFilter + '"', () => pm.expect(true).to.be.true);
    console.log('⚠️ По фильтру "' + viewFilter + '" снапшоты не найдены.\nВсе ключи:\n' + allKeys.map(k => '  • ' + k).join('\n'));
    return;
}

pm.test('📋 Snapshot View: ✅ найдено ' + targetKeys.length + ' снапшотов', () => pm.expect(true).to.be.true);

targetKeys.forEach((key, idx) => {
    const snap     = store[key];
    const snapSize = JSON.stringify(snap).length;
    const parts    = key.split('::'); // col::request::status::format

    // Совместимость: savedAt (legacy), _saved (v3.3+), _meta.saved
    const savedAt = snap.savedAt
        || snap._saved
        || (snap._meta && snap._meta.saved)
        || '—';

    const mode       = snap.mode || (snap._meta && snap._meta.mode) || '—';
    const checkPaths = snap.checkPaths || (snap._meta && snap._meta.checkPaths) || [];
    const ignorePaths = snap.ignorePaths || (snap._meta && snap._meta.ignorePaths) || [];
    const statusCode = snap.statusCode || parts[2] || '—';
    const format     = snap.format || (snap._meta && snap._meta.format) || parts[3] || '—';

    console.log('────────────────────────────────────────────────────────────');
    console.log([
        '📸 [' + (idx + 1) + '/' + targetKeys.length + '] ' + key,
        '   📅 Сохранён:    ' + savedAt,
        '   🔢 Статус:      ' + statusCode,
        '   📄 Формат:      ' + format,
        '   🔍 Режим:       ' + mode,
        '   📏 checkPaths:  ' + (checkPaths.length ? checkPaths.join(', ') : 'нет (full)'),
        ignorePaths.length ? '   🚫 ignorePaths: ' + ignorePaths.join(', ') : null,
        '   💾 Размер:      ' + (snapSize / 1024).toFixed(2) + ' KB'
    ].filter(Boolean).join('\n'));

    // При фильтре — показать содержимое данных
    if (viewFilter) {
        const dataObj = snap.data !== undefined ? snap.data : snap;
        // Exclude internal meta keys from display
        const displayData = {};
        Object.keys(dataObj).forEach(k => { if (!k.startsWith('_')) displayData[k] = dataObj[k]; });

        const dataStr = JSON.stringify(displayData, null, 2);
        const limit   = 1000;
        console.log('   📤 Данные:');
        console.log(dataStr.length > limit
            ? dataStr.slice(0, limit) + '\n   ... [+' + (dataStr.length - limit) + ' chars]'
            : dataStr
        );
    }
});

console.log('════════════════════════════════════════════════════════════');
console.log('💡 Для очистки: используй метод "🗑️ snapshot-clear"');
console.log('   hephaestus.snapshot.clearFilter = "" (все) или "Login" (по имени)');
console.log('🌐 Визуальный просмотр: docs/snapshot-viewer.html');
