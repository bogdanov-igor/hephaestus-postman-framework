#!/usr/bin/env node
/**
 * Hephaestus — Pre-flight Doctor  v4.0.1
 *
 * A user/operator health check: "is my Hephaestus checkout + environment
 * healthy, and is the engine I'm about to run intact?" Unlike `npm run build`
 * (a maintainer check), doctor is user-facing and works both from a clone and
 * from an installed / npx package — it locates the repo root the same way the
 * other scripts do (path.join(__dirname, '..')).
 *
 * Usage:
 *   node scripts/doctor.js [-e <env.json>] [--json] [--no-color]
 *   hephaestus doctor       [-e <env.json>] [--json] [--no-color]
 *
 * Checks (each PASS / WARN / FAIL / INFO with a reason + remediation hint):
 *   1. Node runtime is >= 18
 *   2. Engine integrity — sha256(engine/*.js) vs engine/checksums.json
 *   3. Version consistency — package.json / checksums / engine VERSION / banners
 *   4. Defaults drift — collection hephaestus.defaults vs setup/defaults.json
 *   5. setup/defaults.json is valid JSON
 *   6. Environment variables — only when -e <env.json> is supplied (honest: no
 *      invented requirement list; prints INFO when omitted)
 *
 * Exit code: 0 when no check FAILs, 1 otherwise — safe to gate CI on
 *   (`hephaestus doctor` in a pipeline).
 *
 * NB: the hashing (sha256), the VERSION regex, the BANNER_FILES list and the
 * defaults transform mirror scripts/build.js, so doctor agrees with the build
 * on the checks it performs. It does NOT re-bundle engine/src (that needs
 * esbuild, a build-time dependency): an edited-but-unrebuilt engine/src is
 * caught by `npm run build`, not here. Check 2 verifies the shipped bundle is
 * intact (matches its recorded checksum), not that it is a fresh build of src.
 */

'use strict';

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');

const CHECKSUMS_PATH  = 'engine/checksums.json';
const COLLECTION_PATH = 'collection/hephaestus-template.postman_collection.json';
const DEFAULTS_PATH   = 'setup/defaults.json';
const ENGINE_FILES    = ['engine/pre-request.js', 'engine/post-request.js'];

// `npm run build:emit` rebuilds the bundles from engine/src, but the published
// package does not ship engine/src (it is dev-only). Telling a consumer to run
// build:emit would send them down a path that cannot work, so the recovery hint
// adapts: rebuild when the source is present, reinstall when it is not.
const CAN_REBUILD  = fs.existsSync(path.join(ROOT, 'engine/src'));
const REBUILD_HINT = CAN_REBUILD
    ? 'run `npm run build:emit` to rebuild from engine/src'
    : 'reinstall Hephaestus (engine/src is not present in this install, so it cannot be rebuilt here)';

// Files whose EVERY semver reference must equal the current package version.
// Kept byte-identical to scripts/build.js Check 3 so the two never disagree.
// (Missing files — e.g. Dockerfile in an installed package — are simply skipped.)
const BANNER_FILES = [
    'scripts/build.js', 'scripts/ci-to-junit.js', 'scripts/compare.js', 'scripts/docs.js',
    'scripts/generate-report.js', 'scripts/init.js', 'scripts/migrate.js', 'scripts/summary.js',
    'scripts/watch.js', 'scripts/sync-examples.js', 'scripts/openapi-import.js',
    'setup/snapshot-view.js', 'setup/snapshot-clear.js',
    'Dockerfile', 'docker-compose.yml'
];

// ─── CLI ────────────────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const jsonOut = args.includes('--json');
const noColor = args.includes('--no-color') || jsonOut;
const wantHelp = args.includes('--help') || args.includes('-h');

let envFile = null;
let envArgError = false;
for (let i = 0; i < args.length; i++) {
    if (args[i] === '-e' || args[i] === '--env') {
        const next = args[i + 1];
        if (next && next.charAt(0) !== '-') {
            envFile = next;
        } else {
            // -e given but no valid path (empty/unset var, trailing flag, or another
            // option) — surface it instead of silently reporting "no env supplied".
            envArgError = true;
        }
        break;
    }
}

// ─── Shared helpers (identical to build.js where it matters) ──────────────────

function read(relPath) {
    return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function safeRead(relPath) {
    try { return read(relPath); } catch (e) { return null; }
}

function sha256(str) {
    return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

// build.js's exact VERSION-constant matcher, so both agree on the engine version.
function extractVersion(source) {
    const m = source.match(/(?:const|let|var)\s+VERSION\s*=\s*["']([^"']+)["']/);
    return m ? m[1] : null;
}

// Cached loaders — parse the big collection / defaults at most once each.
let _pkg = null;
let _pkgVersion = null;
try { _pkg = JSON.parse(read('package.json')); _pkgVersion = _pkg.version; } catch (e) { /* reported by checks */ }
const pkgVersion = _pkgVersion;

let _col;
let _colLoaded = false;
function loadCollection() {
    if (_colLoaded) return _col;
    _colLoaded = true;
    const raw = safeRead(COLLECTION_PATH);
    if (raw === null) { _col = null; return _col; }
    try { _col = JSON.parse(raw); } catch (e) { _col = null; }
    return _col;
}

function collectionVarMap(col) {
    const m = {};
    (col.variable || []).forEach(function (v) { m[v.key] = v; });
    return m;
}

let _defaults;
let _defaultsLoaded = false;
function loadDefaults() {
    if (_defaultsLoaded) return _defaults;
    _defaultsLoaded = true;
    const raw = safeRead(DEFAULTS_PATH);
    if (raw === null) { _defaults = null; return _defaults; }
    try { _defaults = JSON.parse(raw); } catch (e) { _defaults = null; }
    return _defaults;
}

// ─── Result constructors ──────────────────────────────────────────────────────

function result(status, name, detail, hint) {
    return { name: name, status: status, detail: detail, hint: hint || null };
}
function ok(name, detail)         { return result('PASS', name, detail); }
function warn(name, detail, hint) { return result('WARN', name, detail, hint); }
function fail(name, detail, hint) { return result('FAIL', name, detail, hint); }
function info(name, detail, hint) { return result('INFO', name, detail, hint); }

// ─── Check 1: Node runtime ────────────────────────────────────────────────────

function checkNode() {
    const name = 'Node runtime';
    const raw = process.versions.node;
    const major = parseInt(raw.split('.')[0], 10);
    if (major >= 18) {
        return ok(name, 'Node v' + raw + ' (>= 18)');
    }
    return fail(name, 'Node v' + raw + ' is below the required v18',
        'Upgrade Node to v18 or newer (see package.json "engines")');
}

// ─── Check 2: Engine integrity ────────────────────────────────────────────────

function checkEngineIntegrity() {
    const name = 'Engine integrity';
    const raw = safeRead(CHECKSUMS_PATH);
    if (raw === null) {
        return fail(name, CHECKSUMS_PATH + ' is missing', 'Reinstall Hephaestus or ' + REBUILD_HINT);
    }
    let checksums;
    try { checksums = JSON.parse(raw); } catch (e) {
        return fail(name, CHECKSUMS_PATH + ' is invalid JSON: ' + e.message, REBUILD_HINT + ' (regenerates it)');
    }
    const files = checksums.files || {};
    const bad = [];
    ENGINE_FILES.forEach(function (f) {
        const src = safeRead(f);
        if (src === null) { bad.push(f + ' (missing)'); return; }
        const want = files[f];
        if (!want) { bad.push(f + ' (no recorded checksum)'); return; }
        const got = sha256(src);
        if (got !== want) {
            bad.push(f + ' (sha256 ' + got.slice(0, 12) + '… ≠ ' + want.slice(0, 12) + '…)');
        }
    });
    if (bad.length) {
        return fail(name, 'checksum mismatch: ' + bad.join('; '),
            'Engine bundle is stale or tampered — ' + REBUILD_HINT);
    }
    return ok(name, 'both engine files match ' + CHECKSUMS_PATH + ' (sha256)');
}

// ─── Check 3: Version consistency ─────────────────────────────────────────────

function scanBanners() {
    // Mirror of build.js Check 3: drop URLs and node: base-image tags, then flag
    // any remaining semver that isn't the package version.
    const offenders = [];
    BANNER_FILES.forEach(function (rel) {
        const src = safeRead(rel);
        if (src === null) return;
        const found = (src
            .replace(/https?:\/\/[^\s"'`)]+/g, '')
            .replace(/node:\d+\.\d+\.\d+/g, '')
            .match(/v?\d+\.\d+\.\d+/g) || [])
            .map(function (v) { return v.replace(/^v/, ''); });
        const bad = found.filter(function (v) { return v !== pkgVersion; });
        if (bad.length) {
            offenders.push(rel + ' → ' + Array.from(new Set(bad)).join('/'));
        }
    });
    return offenders;
}

function checkVersions() {
    const name = 'Version consistency';
    if (!pkgVersion) {
        return fail(name, 'could not read version from package.json', 'Restore a valid package.json');
    }
    const drifts = [];

    // checksums.json version
    const cRaw = safeRead(CHECKSUMS_PATH);
    if (cRaw !== null) {
        try {
            const cv = JSON.parse(cRaw).version;
            if (cv && cv !== pkgVersion) drifts.push(CHECKSUMS_PATH + '=' + cv);
        } catch (e) { /* invalid JSON reported by the integrity check */ }
    }

    // engine VERSION constants
    ENGINE_FILES.forEach(function (f) {
        const src = safeRead(f);
        if (src === null) return;
        const v = extractVersion(src);
        if (v && v !== pkgVersion) drifts.push(f + '=' + v);
    });

    // embedded collection version variable
    const col = loadCollection();
    if (col) {
        const varMap = collectionVarMap(col);
        const cvVar = varMap['hephaestus.version'];
        if (cvVar && cvVar.value && cvVar.value !== pkgVersion) {
            drifts.push('collection hephaestus.version=' + cvVar.value);
        }
    }

    // tool-banner drift (same list/logic as build.js)
    scanBanners().forEach(function (o) { drifts.push(o); });

    if (drifts.length) {
        return fail(name, 'version drift vs package.json ' + pkgVersion + ': ' + drifts.join(', '),
            'Align every version to ' + pkgVersion + ' (' + REBUILD_HINT + '; fix any banner)');
    }
    return ok(name, 'all version references pinned to ' + pkgVersion);
}

// ─── Check 4: Defaults drift ──────────────────────────────────────────────────

function checkDefaultsDrift() {
    const name = 'Defaults drift';
    const defaultsObj = loadDefaults();
    if (!defaultsObj) {
        return fail(name, DEFAULTS_PATH + ' is missing or invalid JSON', 'Fix ' + DEFAULTS_PATH + ' (see the JSON check)');
    }
    const col = loadCollection();
    if (!col) {
        return fail(name, COLLECTION_PATH + ' is missing or invalid JSON', 'Restore the template collection');
    }
    const varMap = collectionVarMap(col);
    const embeddedVar = varMap['hephaestus.defaults'];
    if (!embeddedVar) {
        return fail(name, 'collection has no hephaestus.defaults variable', REBUILD_HINT);
    }
    try { JSON.parse(embeddedVar.value); } catch (e) {
        return fail(name, 'embedded hephaestus.defaults is not valid JSON', REBUILD_HINT);
    }
    // Same transform as build.js Check 6: strip the _comment / $schema editor
    // hints and blank baseUrl (the template intentionally ships an empty baseUrl).
    // Compare the raw serialized string exactly as build.js does (compact
    // JSON.stringify, key-order sensitive) so doctor and the build never disagree.
    const desired = Object.assign({}, defaultsObj);
    delete desired._comment;
    delete desired.$schema;
    desired.baseUrl = '';
    if (embeddedVar.value === JSON.stringify(desired)) {
        return ok(name, 'embedded hephaestus.defaults matches ' + DEFAULTS_PATH);
    }
    return fail(name, 'embedded hephaestus.defaults has drifted from ' + DEFAULTS_PATH,
        REBUILD_HINT + ' (re-embeds defaults into the collection)');
}

// ─── Check 5: defaults.json valid JSON ────────────────────────────────────────

function checkDefaultsJson() {
    const name = 'defaults.json valid';
    const raw = safeRead(DEFAULTS_PATH);
    if (raw === null) {
        return fail(name, DEFAULTS_PATH + ' is missing', 'Restore ' + DEFAULTS_PATH);
    }
    try {
        const obj = JSON.parse(raw);
        return ok(name, DEFAULTS_PATH + ' is valid JSON (' + Object.keys(obj).length + ' keys)');
    } catch (e) {
        return fail(name, DEFAULTS_PATH + ' is invalid JSON: ' + e.message, 'Fix the JSON syntax in ' + DEFAULTS_PATH);
    }
}

// ─── Check 6: Environment (optional, honest) ──────────────────────────────────

function checkEnvironment() {
    const name = 'Environment';
    if (envArgError) {
        return fail(name, 'the -e/--env flag requires a path to a Postman environment file',
            'Supply a file: hephaestus doctor -e <env.json> (or omit -e entirely)');
    }
    if (!envFile) {
        return info(name, 'no environment file supplied', 'pass -e <env.json> to check environment variables');
    }
    let raw;
    try { raw = fs.readFileSync(path.resolve(envFile), 'utf8'); } catch (e) {
        return fail(name, 'could not read ' + envFile + ': ' + e.message, 'Check the path to your Postman environment export');
    }
    let env;
    try { env = JSON.parse(raw); } catch (e) {
        return fail(name, envFile + ' is not valid JSON: ' + e.message, 'Export a valid Postman environment (File → Export)');
    }
    const values = Array.isArray(env.values) ? env.values : [];
    if (!values.length) {
        return warn(name, envFile + ' has no variables (expected a Postman environment with a "values" array)',
            'Confirm you exported a Postman *environment*, not a collection');
    }
    const nonEmpty = values.filter(function (v) {
        return v && v.enabled !== false && v.value !== undefined && v.value !== null && String(v.value) !== '';
    });
    const detail = envFile + ': ' + values.length + ' variable(s), ' + nonEmpty.length + ' non-empty';

    // Honest cross-check against the user's OWN declared list (setup/defaults.json
    // → envRequired). This is a config value, not an invented requirement; and it
    // is only ever a WARN, so it can never produce a false CI-gating FAIL.
    const defaultsObj = loadDefaults();
    const required = defaultsObj && Array.isArray(defaultsObj.envRequired) ? defaultsObj.envRequired : [];
    if (required.length) {
        const present = {};
        nonEmpty.forEach(function (v) { present[v.key] = true; });
        const missing = required.filter(function (k) { return !present[k]; });
        if (missing.length) {
            return warn(name, detail + '; missing envRequired: ' + missing.join(', '),
                'Set these (declared in ' + DEFAULTS_PATH + ' → envRequired) in your environment');
        }
        return ok(name, detail + '; all ' + required.length + ' envRequired present');
    }
    return ok(name, detail);
}

// ─── Run all checks ───────────────────────────────────────────────────────────

function printHelp() {
    const lines = [
        '',
        '⚒️  Hephaestus Doctor  v' + (pkgVersion || '?'),
        '',
        'Pre-flight health check for your Hephaestus checkout + engine.',
        '',
        'Usage: hephaestus doctor [-e <env.json>] [--json] [--no-color]',
        '',
        'Checks:',
        '  1. Node runtime is >= 18',
        '  2. Engine integrity      (sha256 of engine/*.js vs engine/checksums.json)',
        '  3. Version consistency   (package.json / checksums / engine / banners)',
        '  4. Defaults drift        (collection hephaestus.defaults vs setup/defaults.json)',
        '  5. setup/defaults.json is valid JSON',
        '  6. Environment variables (only when -e <env.json> is supplied)',
        '',
        'Options:',
        '  -e <env.json>   Postman environment export to inspect (optional)',
        '  --json          Machine-readable output: { ok, version, checks: [...] }',
        '  --no-color      Disable ANSI colours',
        '  --help, -h      This help',
        '',
        'Exit code: 0 when no check FAILs, 1 otherwise (safe to gate CI on).',
        ''
    ];
    console.log(lines.join('\n'));
}

if (wantHelp) {
    printHelp();
    process.exit(0);
}

const checks = [
    checkNode(),
    checkEngineIntegrity(),
    checkVersions(),
    checkDefaultsDrift(),
    checkDefaultsJson(),
    checkEnvironment()
];

const hasFail  = checks.some(function (ch) { return ch.status === 'FAIL'; });
const exitCode = hasFail ? 1 : 0;

// ─── JSON output ──────────────────────────────────────────────────────────────

if (jsonOut) {
    const out = {
        ok: !hasFail,
        version: pkgVersion || null,
        checks: checks.map(function (ch) {
            return { name: ch.name, status: ch.status, detail: ch.detail, hint: ch.hint };
        })
    };
    console.log(JSON.stringify(out, null, 2));
    process.exit(exitCode);
}

// ─── Human-readable output (summary.js house style) ───────────────────────────

const c = {
    green:  function (s) { return noColor ? s : '\x1b[32m' + s + '\x1b[0m'; },
    red:    function (s) { return noColor ? s : '\x1b[31m' + s + '\x1b[0m'; },
    yellow: function (s) { return noColor ? s : '\x1b[33m' + s + '\x1b[0m'; },
    bold:   function (s) { return noColor ? s : '\x1b[1m'  + s + '\x1b[0m'; },
    dim:    function (s) { return noColor ? s : '\x1b[2m'  + s + '\x1b[0m'; },
    cyan:   function (s) { return noColor ? s : '\x1b[36m' + s + '\x1b[0m'; },
};

const MARK = {
    PASS: '✅',
    WARN: '⚠️ ',
    FAIL: '❌',
    INFO: 'ℹ️ '
};
const STATUS_COLOR = {
    PASS: c.green,
    WARN: c.yellow,
    FAIL: c.red,
    INFO: c.cyan
};

const W  = 70;
const HR = '─'.repeat(W);

console.log('');
console.log(c.bold('  ⚒️  HEPHAESTUS  Pre-flight Doctor'));
console.log(c.dim('  ' + HR));
console.log(c.dim('  Version: ') + c.bold('v' + (pkgVersion || '?')));
console.log(c.dim('  Root:    ') + ROOT);
console.log('');

checks.forEach(function (ch, i) {
    const mark  = MARK[ch.status] || '?';
    const label = STATUS_COLOR[ch.status](ch.status);
    console.log('  ' + mark + ' ' + label + '  ' + c.bold((i + 1) + '. ' + ch.name));
    console.log('     ' + c.dim(ch.detail));
    if (ch.hint) {
        console.log('     ' + c.dim('↳ ' + ch.hint));
    }
    console.log('');
});

const counts = { PASS: 0, WARN: 0, FAIL: 0, INFO: 0 };
checks.forEach(function (ch) { counts[ch.status]++; });

const summaryLine = counts.PASS + ' passed, ' + counts.WARN + ' warning(s), ' + counts.FAIL + ' failed'
    + (counts.INFO ? ', ' + counts.INFO + ' info' : '');

console.log(c.dim('  ' + HR));
if (hasFail) {
    console.log('  ' + c.red(c.bold('❌ ' + summaryLine)));
    console.log('  ' + c.red('Hephaestus is NOT healthy — resolve the FAIL item(s) above.'));
} else if (counts.WARN) {
    console.log('  ' + c.yellow(c.bold('⚠️  ' + summaryLine)));
    console.log('  ' + c.green('No blocking problems — Hephaestus is ready to run.'));
} else {
    console.log('  ' + c.green(c.bold('✅ ' + summaryLine)));
    console.log('  ' + c.green('Hephaestus is healthy and ready to run. 🔥'));
}
console.log('');

process.exit(exitCode);
