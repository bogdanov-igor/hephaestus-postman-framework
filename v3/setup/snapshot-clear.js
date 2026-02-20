// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Hephaestus v3 — Snapshot Clear Utility                                 ║
// ║  Вставить в Pre-request Script метода "🗑️ snapshot-clear"               ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Управление через collectionVariables:
//
//   hephaestus.snapshot.clearFilter — подстрока для выборочной очистки
//     Пусто / не задан → очистить ВСЕ снапшоты
//     "Login"          → удалить только снапшоты, содержащие "Login" в ключе
//     "col::200"       → удалить снапшоты коллекции "col" со статусом 200
//
// Ключ снапшота имеет формат: {collectionName}::{requestName}::{statusCode}::{format}

const clearFilter = pm.collectionVariables.get('hephaestus.snapshot.clearFilter') || '';

// ── Загрузка текущего хранилища ───────────────────────────────────────────
let store = {};
try {
    const raw = pm.collectionVariables.get('hephaestus.snapshots');
    store = raw ? JSON.parse(raw) : {};
} catch (e) {
    console.warn('⚠️ Не удалось прочитать hephaestus.snapshots:', e.message);
    store = {};
}

const allKeys = Object.keys(store);
let removed   = 0;
let removedKeys = [];

if (allKeys.length === 0) {
    pm.test('🗑️ Snapshot Clear: хранилище уже пустое', () => pm.expect(true).to.be.true);
    console.log('ℹ️ hephaestus.snapshots пустое — нечего удалять.');
} else if (!clearFilter) {

    // ── Очистить всё ──────────────────────────────────────────────────────
    removedKeys = allKeys;
    removed     = allKeys.length;
    pm.collectionVariables.set('hephaestus.snapshots', '{}');

    pm.test('🗑️ Snapshot Clear: ✅ очищено ' + removed + ' снапшотов', () => pm.expect(true).to.be.true);
    console.log([
        '╔══════════════════════════════════════════════════════════════╗',
        '║  🗑️ HEPHAESTUS — SNAPSHOT CLEAR',
        '╠══════════════════════════════════════════════════════════════╣',
        '║  Режим:   очистить всё',
        '║  Удалено: ' + removed + ' снапшотов',
        '╚══════════════════════════════════════════════════════════════╝'
    ].join('\n'));
    console.log(removedKeys.map(k => '  🗑️  ' + k).join('\n'));

} else {

    // ── Выборочная очистка по фильтру ─────────────────────────────────────
    removedKeys = allKeys.filter(k => k.includes(clearFilter));
    removedKeys.forEach(k => delete store[k]);
    removed     = removedKeys.length;

    pm.collectionVariables.set('hephaestus.snapshots', JSON.stringify(store));

    if (removed > 0) {
        pm.test('🗑️ Snapshot Clear: ✅ удалено ' + removed + ' (фильтр: "' + clearFilter + '")', () => pm.expect(true).to.be.true);
        console.log([
            '╔══════════════════════════════════════════════════════════════╗',
            '║  🗑️ HEPHAESTUS — SNAPSHOT CLEAR',
            '╠══════════════════════════════════════════════════════════════╣',
            '║  Фильтр:  "' + clearFilter + '"',
            '║  Удалено: ' + removed + ' из ' + allKeys.length,
            '║  Осталось: ' + (allKeys.length - removed),
            '╚══════════════════════════════════════════════════════════════╝'
        ].join('\n'));
        console.log(removedKeys.map(k => '  🗑️  ' + k).join('\n'));
    } else {
        pm.test('🗑️ Snapshot Clear: ⚠️ ничего не найдено по фильтру "' + clearFilter + '"', () => pm.expect(true).to.be.true);
        console.log('⚠️ По фильтру "' + clearFilter + '" снапшоты не найдены.');
        console.log('📋 Все доступные ключи:\n' + allKeys.map(k => '  • ' + k).join('\n'));
    }
}
