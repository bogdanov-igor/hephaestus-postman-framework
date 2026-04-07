#!/usr/bin/env node
/**
 * Hephaestus Migration Assistant  v3.3.0
 *
 * Сканирует Postman collection JSON и сообщает статус миграции каждого
 * запроса:  migrated | partial | needs-migration | no-scripts
 *
 * Usage:
 *   node scripts/migrate.js path/to/collection.json [--verbose] [--template]
 *
 * Flags:
 *   --verbose    Показывать тело скриптов для requests со статусом needs-migration
 *   --template   Генерировать стартовый override-шаблон для каждого запроса
 *   --json       Вывод в JSON (удобно для дальнейшей обработки)
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── CLI args ───────────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const file    = args.find(a => !a.startsWith('--'));
const verbose  = args.includes('--verbose');
const template = args.includes('--template');
const jsonOut  = args.includes('--json');

if (!file) {
    console.error('Usage: node scripts/migrate.js <collection.json> [--verbose] [--template] [--json]');
    process.exit(1);
}

if (!fs.existsSync(file)) {
    console.error('File not found: ' + file);
    process.exit(1);
}

// ─── Load collection ────────────────────────────────────────────────────────

let collection;
try {
    collection = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (e) {
    console.error('Invalid JSON: ' + e.message);
    process.exit(1);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const HEPH_PRE_RE  = /hephaestus\.v3\.pre/;
const HEPH_POST_RE = /hephaestus\.v3\.post/;
const PM_TEST_RE   = /pm\.test\s*\(/g;
const PM_EXPECT_RE = /pm\.expect\s*\(/g;
const PM_ENV_SET   = /pm\.(environment|collectionVariables|globals)\.set\s*\(/g;

function scriptText(events, listen) {
    const ev = (events || []).find(e => e.listen === listen);
    if (!ev) return null;
    const src = ev.script && ev.script.exec;
    if (!src) return null;
    return Array.isArray(src) ? src.join('\n') : src;
}

function countMatches(str, re) {
    const matches = str.match(new RegExp(re.source, 'g'));
    return matches ? matches.length : 0;
}

function classify(item) {
    const pre  = scriptText(item.event, 'prerequest');
    const post = scriptText(item.event, 'test');

    const hasHephPre  = pre  && HEPH_PRE_RE.test(pre);
    const hasHephPost = post && HEPH_POST_RE.test(post);
    const hasRawTests = post && (PM_TEST_RE.test(post) || PM_EXPECT_RE.test(post));

    let status;
    if (hasHephPre && hasHephPost) {
        status = 'migrated';
    } else if (hasHephPre || hasHephPost) {
        status = 'partial';
    } else if ((pre && pre.trim()) || (post && post.trim())) {
        status = 'needs-migration';
    } else {
        status = 'no-scripts';
    }

    const info = {
        rawTestCount:   post ? countMatches(post, PM_TEST_RE)   : 0,
        rawExpectCount: post ? countMatches(post, PM_EXPECT_RE) : 0,
        setsVars:       post ? PM_ENV_SET.test(post) : false,
    };

    return { status, hasHephPre, hasHephPost, pre, post, info };
}

function buildTemplate(item, req, classInfo) {
    const method = (req && req.method) ? req.method.toUpperCase() : 'GET';
    const lines = [
        '// override for: ' + (item.name || 'unnamed'),
        'const override = {',
        '    // expectedStatus: [200],',
    ];

    if (classInfo.info.rawTestCount > 0 || classInfo.info.rawExpectCount > 0) {
        lines.push('    assertions: {');
        lines.push('        // Migrate your pm.expect(...) calls here');
        lines.push('        // Example: "$.data.id": { exists: true }');
        lines.push('    },');
    }

    if (classInfo.info.setsVars) {
        lines.push('    varsToSave: {');
        lines.push('        // Example: "tokenField": "$.data.token"');
        lines.push('    },');
    }

    lines.push('};');
    return lines.join('\n');
}

// ─── Traverse collection ─────────────────────────────────────────────────────

const results = [];

function traverse(items, folderPath) {
    (items || []).forEach(item => {
        if (item.item) {
            // folder
            traverse(item.item, folderPath + (item.name ? ' / ' + item.name : ''));
        } else {
            // request
            const req = item.request || {};
            const cls = classify(item);
            results.push({
                name:   item.name || '(unnamed)',
                folder: folderPath || '(root)',
                method: (req.method || '?').toUpperCase(),
                status: cls.status,
                hasHephPre:  cls.hasHephPre,
                hasHephPost: cls.hasHephPost,
                rawTestCount: cls.info.rawTestCount,
                rawExpectCount: cls.info.rawExpectCount,
                setsVars: cls.info.setsVars,
                pre:  cls.pre,
                post: cls.post,
                _cls: cls,
                _req: req,
                _item: item,
            });
        }
    });
}

const colName = (collection.info && collection.info.name) || path.basename(file);
traverse(collection.item, '');

// ─── JSON output ─────────────────────────────────────────────────────────────

if (jsonOut) {
    const out = results.map(r => ({
        name: r.name, folder: r.folder, method: r.method, status: r.status,
        hephaestus: { pre: r.hasHephPre, post: r.hasHephPost },
        raw: { tests: r.rawTestCount, expects: r.rawExpectCount, setsVars: r.setsVars },
    }));
    console.log(JSON.stringify(out, null, 2));
    process.exit(0);
}

// ─── Human-readable output ───────────────────────────────────────────────────

const STATUS_ICON = {
    'migrated':       '✅',
    'partial':        '⚠️ ',
    'needs-migration':'❌',
    'no-scripts':     '⬜',
};

const STATUS_LABEL = {
    'migrated':       'migrated',
    'partial':        'partial',
    'needs-migration':'needs migration',
    'no-scripts':     'no scripts',
};

const counts = { migrated: 0, partial: 0, 'needs-migration': 0, 'no-scripts': 0 };
results.forEach(r => counts[r.status]++);

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  🔥 Hephaestus Migration Assistant  v3.3.0                  ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log('║  Collection: ' + colName.padEnd(48) + '║');
console.log('║  Requests:   ' + String(results.length).padEnd(48) + '║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

let currentFolder = null;

results.forEach(r => {
    if (r.folder !== currentFolder) {
        currentFolder = r.folder;
        console.log('\n📁 ' + (r.folder || '(root)'));
    }
    const icon  = STATUS_ICON[r.status] || '?';
    const label = STATUS_LABEL[r.status] || r.status;
    const extra = [];
    if (r.rawTestCount > 0)   extra.push(r.rawTestCount + ' pm.test');
    if (r.setsVars)            extra.push('sets vars');
    const extraStr = extra.length > 0 ? '  (' + extra.join(', ') + ')' : '';
    console.log('  ' + icon + '  ' + r.method.padEnd(7) + r.name + '  [' + label + ']' + extraStr);

    if (verbose && r.status === 'needs-migration') {
        if (r.pre && r.pre.trim()) {
            console.log('\n     ─── pre-request ───');
            r.pre.split('\n').slice(0, 10).forEach(l => console.log('     ' + l));
            if (r.pre.split('\n').length > 10) console.log('     ... (truncated)');
        }
        if (r.post && r.post.trim()) {
            console.log('\n     ─── test script ───');
            r.post.split('\n').slice(0, 15).forEach(l => console.log('     ' + l));
            if (r.post.split('\n').length > 15) console.log('     ... (truncated)');
        }
        console.log('');
    }

    if (template && r.status !== 'migrated' && r.status !== 'no-scripts') {
        const tpl = buildTemplate(r._item, r._req, r._cls);
        console.log('\n     ─── suggested override ───');
        tpl.split('\n').forEach(l => console.log('     ' + l));
        console.log('');
    }
});

// ─── Summary ────────────────────────────────────────────────────────────────

const pct = n => (results.length ? Math.round(n / results.length * 100) : 0) + '%';

console.log('\n────────────────────────────────────────────────────────────────');
console.log('  ✅ Migrated:        ' + String(counts['migrated']).padStart(3) + '  (' + pct(counts['migrated']) + ')');
console.log('  ⚠️  Partial:         ' + String(counts['partial']).padStart(3) + '  (' + pct(counts['partial']) + ')');
console.log('  ❌ Needs migration: ' + String(counts['needs-migration']).padStart(3) + '  (' + pct(counts['needs-migration']) + ')');
console.log('  ⬜ No scripts:      ' + String(counts['no-scripts']).padStart(3) + '  (' + pct(counts['no-scripts']) + ')');
console.log('────────────────────────────────────────────────────────────────\n');

if (counts['needs-migration'] > 0 || counts['partial'] > 0) {
    console.log('📖  See https://github.com/bogdanov-igor/hephaestus-postman-framework for migration guide.');
    console.log('💡  Run with --verbose to see script bodies, --template for override starters.\n');
} else if (counts['migrated'] === results.length) {
    console.log('🎉  All requests are fully migrated to Hephaestus!\n');
}
