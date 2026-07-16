#!/usr/bin/env node
/**
 * Hephaestus Build Utilities  v3.9.0
 *
 * Two modes:
 *   node scripts/build.js            → CHECK mode (no writes). Verifies every
 *                                      generated artifact is in sync. Used by CI
 *                                      and `npm test`. Exits 1 on any drift.
 *   node scripts/build.js --emit     → EMIT mode. Regenerates the shipped
 *                                      artifacts, then runs the same checks.
 *
 * Generated artifacts (single-sourced from engine/ + setup/defaults.json):
 *   1. engine/checksums.json                         — SHA-256 of both engine files
 *   2. collection variable  hephaestus.v3.pre        — full pre-request engine (zero-download)
 *   3. collection variable  hephaestus.v3.post       — full post-request engine (zero-download)
 *   4. collection variable  hephaestus.version       — pinned to package.json version
 *   5. collection variable  hephaestus.defaults      — regenerated from setup/defaults.json
 *
 * Checks:
 *   - engine/*.js are in-sync esbuild bundles of engine/src
 *   - engine VERSION matches package.json
 *   - version single-source across all tool banners + SECURITY.md
 *   - defaults.json / collection JSON are valid
 *   - the 5 generated artifacts above are in sync (run `--emit` to fix)
 */

'use strict';

const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');
const esbuild = require('esbuild');

const ROOT  = path.resolve(__dirname, '..');
const EMIT  = process.argv.includes('--emit');

const COLLECTION_PATH = 'collection/hephaestus-template.postman_collection.json';
const CHECKSUMS_PATH  = 'engine/checksums.json';
const ENGINE_FILES    = ['engine/pre-request.js', 'engine/post-request.js'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function read(relPath) {
    return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function writeFile(relPath, content) {
    fs.writeFileSync(path.join(ROOT, relPath), content);
}

function sha256(str) {
    return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

function extractBlock(source, startMarker, endMarker) {
    const start = source.indexOf(startMarker);
    const end   = source.indexOf(endMarker, start + startMarker.length);
    if (start === -1 || end === -1) return null;
    return source.slice(start, end + endMarker.length);
}

let errors = 0;
let checks = 0;
const written = [];

function pass(msg) { checks++; console.log('  ✅ ' + msg); }
function fail(msg) { checks++; errors++; console.error('  ❌ ' + msg); }
function info(msg) { console.log('  ℹ️  ' + msg); }

// A generated artifact is either written (EMIT) or verified (CHECK).
// `current` = what is on disk now; `desired` = what it should be.
function reconcile(label, current, desired, writeFn) {
    if (current === desired) { pass(label + ' in sync'); return; }
    if (EMIT) {
        writeFn();
        written.push(label);
        pass(label + ' regenerated');
    } else {
        fail(label + ' is OUT OF SYNC — run `npm run build:emit`');
    }
}

// ── Load once ────────────────────────────────────────────────────────────────

function safeRead(relPath) {
    try { return read(relPath); } catch (e) { return ''; }
}

const pkg        = JSON.parse(read('package.json'));
const pkgVersion = pkg.version;
// safeRead so a missing/renamed engine/src degrades to a clean check failure
// (Check 1/2) instead of an uncaught ENOENT stack trace.
const preSrcMod  = safeRead('engine/src/pre-request.js');
const postSrcMod = safeRead('engine/src/post-request.js');

// ── Check 1: engine bundle ────────────────────────────────────────────────────

console.log('\n🔧 Check 1: engine bundle in sync with engine/src (esbuild)');

function bundleEngine(entryRel) {
    const result = esbuild.buildSync({
        entryPoints: [path.join(ROOT, entryRel)],
        bundle: true, format: 'iife', target: 'es2017',
        write: false, logLevel: 'silent'
    });
    return result.outputFiles[0].text;
}

let preSource  = '';
let postSource = '';
try {
    preSource  = bundleEngine('engine/src/pre-request.js');
    postSource = bundleEngine('engine/src/post-request.js');
    reconcile('engine/pre-request.js (bundle)',  safeRead('engine/pre-request.js'),  preSource,  function() { writeFile('engine/pre-request.js',  preSource); });
    reconcile('engine/post-request.js (bundle)', safeRead('engine/post-request.js'), postSource, function() { writeFile('engine/post-request.js', postSource); });
} catch (e) {
    fail('esbuild bundling failed: ' + e.message);
}

// ── Check 2: engine VERSION ↔ package.json ────────────────────────────────────

console.log('\n🔧 Check 2: VERSION consistency');

function extractVersion(source, label) {
    const m = source.match(/(?:const|let|var)\s+VERSION\s*=\s*["']([^"']+)["']/);
    if (!m) { fail('VERSION not found in ' + label); return null; }
    return m[1];
}

const preVersion  = extractVersion(preSrcMod,  'engine/src/pre-request.js');
const postVersion = extractVersion(postSrcMod, 'engine/src/post-request.js');

if (preVersion && postVersion && preVersion === postVersion) {
    pass('Engine VERSION matches in both files: ' + preVersion);
} else if (preVersion && postVersion) {
    fail('Engine VERSION mismatch: pre=' + preVersion + ', post=' + postVersion);
}

if (preVersion && pkgVersion && preVersion === pkgVersion) {
    pass('Engine VERSION matches package.json: ' + pkgVersion);
} else if (preVersion && pkgVersion) {
    fail('Version mismatch: engine=' + preVersion + ', package.json=' + pkgVersion);
    info('Update package.json version or engine VERSION constant');
}

// ── Check 3: version single-source across tool banners ────────────────────────

console.log('\n🔧 Check 3: version single-source (' + pkgVersion + ')');

// Files whose EVERY semver reference must equal the current package version.
// (Excludes README/CHANGELOG/SECURITY which legitimately mention past versions,
//  and engine-update.js which shows a version string only as a format example.)
const BANNER_FILES = [
    'scripts/build.js', 'scripts/ci-to-junit.js', 'scripts/compare.js', 'scripts/docs.js',
    'scripts/generate-report.js', 'scripts/init.js', 'scripts/migrate.js', 'scripts/summary.js',
    'scripts/test.js', 'scripts/watch.js',
    'setup/snapshot-view.js', 'setup/snapshot-clear.js',
    'Dockerfile', 'docker-compose.yml'
];

let bannerDrift = 0;
BANNER_FILES.forEach(function(rel) {
    let src;
    try { src = read(rel); } catch (e) { return; }
    // Match both `vX.Y.Z` banners and bare `X.Y.Z` (Docker). First drop URLs
    // (Postman collection-schema URLs, GitHub links) and node base-image tags
    // so unrelated versions aren't flagged as Hephaestus banner drift.
    const found = (src
        .replace(/https?:\/\/[^\s"'`)]+/g, '')
        .replace(/node:\d+\.\d+\.\d+/g, '')
        .match(/v?\d+\.\d+\.\d+/g) || [])
        .map(function(v) { return v.replace(/^v/, ''); });
    const bad   = found.filter(function(v) { return v !== pkgVersion; });
    if (bad.length) {
        bannerDrift++;
        fail(rel + ' references ' + Array.from(new Set(bad)).join(', ') + ' (expected ' + pkgVersion + ')');
    }
});
if (bannerDrift === 0) {
    pass('All tool banners reference ' + pkgVersion);
}

// SECURITY.md must list the current minor as supported.
const secMinor = pkgVersion.split('.').slice(0, 2).join('.'); // "3.8"
try {
    const sec = read('SECURITY.md');
    // Require the current minor to appear on a ✅-supported row, not just anywhere.
    const supported = sec.split('\n').some(function(l) {
        return l.indexOf(secMinor + '.x') !== -1 && l.indexOf('✅') !== -1;
    });
    if (supported) {
        pass('SECURITY.md lists ' + secMinor + '.x as ✅ supported');
    } else {
        fail('SECURITY.md does not list current minor ' + secMinor + '.x on a ✅ row');
    }
} catch (e) {
    fail('SECURITY.md not readable: ' + e.message);
}

// ── Check 4: defaults.json is valid JSON ──────────────────────────────────────

console.log('\n🔧 Check 4: defaults.json is valid JSON');

let defaultsObj = null;
try {
    defaultsObj = JSON.parse(read('setup/defaults.json'));
    pass('setup/defaults.json is valid JSON (' + Object.keys(defaultsObj).length + ' keys)');
} catch (e) {
    fail('setup/defaults.json is invalid JSON: ' + e.message);
}

// ── Check 5: collection JSON is valid ─────────────────────────────────────────

console.log('\n🔧 Check 5: collection JSON is valid');

let collection = null;
let collectionRaw = null;
try {
    collectionRaw = read(COLLECTION_PATH);
    collection = JSON.parse(collectionRaw);
    pass(COLLECTION_PATH + ' is valid JSON');
} catch (e) {
    fail('collection JSON is invalid: ' + e.message);
}

// ── Check 6: generated artifacts in sync (zero-download + integrity) ───────────

console.log('\n🔧 Check 6: generated artifacts (engine embedded, checksums, defaults)');

// Guard on preSource/postSource: if esbuild bundling failed (Check 1), skip all
// artifact writes so EMIT can't overwrite checksums/collection with empty engines.
if (collection && defaultsObj && preSource && postSource) {
    // --- 6a. checksums.json ---
    const desiredChecksums = JSON.stringify({
        version:   pkgVersion,
        algorithm: 'sha256',
        files: {
            'engine/pre-request.js':  sha256(preSource),
            'engine/post-request.js': sha256(postSource)
        }
    }, null, 2) + '\n';

    let currentChecksums = '';
    try { currentChecksums = read(CHECKSUMS_PATH); } catch (e) { currentChecksums = ''; }
    reconcile('engine/checksums.json', currentChecksums, desiredChecksums, function() {
        writeFile(CHECKSUMS_PATH, desiredChecksums);
    });

    // --- 6b–6e. collection variables ---
    const varMap = {};
    (collection.variable || []).forEach(function(v) { varMap[v.key] = v; });

    function setVar(key, value) {
        if (!varMap[key]) { fail('collection variable "' + key + '" is missing'); return; }
        varMap[key].value = value;
    }

    // Regenerate hephaestus.defaults from setup/defaults.json.
    // baseUrl is intentionally blanked so the template forces the user to set it
    // (an empty baseUrl makes the engine emit a loud "not configured" test).
    const defaultsForCollection = Object.assign({}, defaultsObj);
    delete defaultsForCollection._comment;
    defaultsForCollection.baseUrl = '';
    const desiredDefaults = JSON.stringify(defaultsForCollection);

    const desired = {
        'hephaestus.v3.pre':  preSource,
        'hephaestus.v3.post': postSource,
        'hephaestus.version': pkgVersion,
        'hephaestus.defaults': desiredDefaults
    };
    Object.keys(desired).forEach(function(key) { setVar(key, desired[key]); });

    // Compare the fully-serialized collection so embedded engine drift, variable
    // changes, and formatting normalization are all caught by one check.
    const desiredCollectionRaw = JSON.stringify(collection, null, 2) + '\n';
    reconcile('collection (embedded engine + vars)', collectionRaw, desiredCollectionRaw, function() {
        writeFile(COLLECTION_PATH, desiredCollectionRaw);
    });
} else {
    fail('skipped artifact checks (collection/defaults missing or engine bundle empty)');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(50));
console.log('Mode: ' + (EMIT ? 'EMIT' : 'CHECK') + '   Checks: ' + checks +
            '   Passed: ' + (checks - errors) + '   Failed: ' + errors);
if (written.length) {
    console.log('Regenerated: ' + written.join(', '));
}

if (errors > 0) {
    console.error('\n❌ Build ' + (EMIT ? 'emit' : 'checks') + ' failed (' + errors +
                  ' error' + (errors > 1 ? 's' : '') + ')');
    process.exit(1);
} else {
    console.log('\n✅ All build checks passed' + (EMIT ? ' (artifacts regenerated)' : ''));
    process.exit(0);
}
