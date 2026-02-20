// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Hephaestus v3 — Snapshot View Utility                                  ║
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

const allKeys    = Object.keys(store);
const totalSize  = JSON.stringify(store).length;
const sizeKb     = (totalSize / 1024).toFixed(2);

// ── Заголовок ─────────────────────────────────────────────────────────────
console.log([
    '╔══════════════════════════════════════════════════════════════╗',
    '║  📋 HEPHAESTUS — SNAPSHOT VIEW',
    '╠══════════════════════════════════════════════════════════════╣',
    '║  Всего снапшотов: ' + allKeys.length,
    '║  Объём хранилища: ' + sizeKb + ' KB / ~900 KB (лимит)',
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

    console.log('────────────────────────────────────────────────────────────');
    console.log([
        '📸 [' + (idx + 1) + '/' + targetKeys.length + '] ' + key,
        '   📅 Сохранён:  ' + (snap.savedAt || '—'),
        '   🔢 Статус:    ' + (snap.statusCode || parts[2] || '—'),
        '   📄 Формат:    ' + (snap.format || parts[3] || '—'),
        '   🔍 Режим:     ' + (snap.mode || '—'),
        '   📏 Checkpaths: ' + ((snap.checkPaths && snap.checkPaths.length) ? snap.checkPaths.join(', ') : 'нет (full)'),
        '   💾 Размер:    ' + (snapSize / 1024).toFixed(2) + ' KB'
    ].join('\n'));

    // При фильтре — показать содержимое данных
    if (viewFilter && snap.data) {
        const dataStr = JSON.stringify(snap.data, null, 2);
        const limit   = 800;
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
