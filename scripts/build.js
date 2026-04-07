#!/usr/bin/env node
/**
 * Hephaestus Build Utilities
 *
 * Currently provides:
 *   1. configMerge sync-check — verifies the shared module is identical in both engine files
 *   2. Version consistency check — engine VERSION matches package.json
 *
 * Future (v4):
 *   - Modular compilation: engine/_src/ → engine/ (with shared/ injection)
 *   - Minification for collectionVariables size reduction
 *
 * Usage:
 *   node scripts/build.js        # run all checks
 *   node scripts/build.js --check-only
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ── Helpers ──────────────────────────────────────────────────────────────────

function read(relPath) {
    return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function extractBlock(source, startMarker, endMarker) {
    const start = source.indexOf(startMarker);
    const end   = source.indexOf(endMarker, start + startMarker.length);
    if (start === -1 || end === -1) return null;
    return source.slice(start, end + endMarker.length);
}

let errors = 0;
let checks = 0;

function pass(msg) { checks++; console.log('  ✅ ' + msg); }
function fail(msg) { checks++; errors++; console.error('  ❌ ' + msg); }
function info(msg) { console.log('  ℹ️  ' + msg); }

// ── Check 1: configMerge sync ─────────────────────────────────────────────────

console.log('\n🔧 Check 1: configMerge sync between engine files');

const preSource  = read('engine/pre-request.js');
const postSource = read('engine/post-request.js');

const CONFIG_MERGE_START = '    const configMerge = {';
const CONFIG_MERGE_END   = '    };';

const preBlock  = extractBlock(preSource,  CONFIG_MERGE_START, CONFIG_MERGE_END);
const postBlock = extractBlock(postSource, CONFIG_MERGE_START, CONFIG_MERGE_END);

if (!preBlock) {
    fail('configMerge block not found in engine/pre-request.js');
} else if (!postBlock) {
    fail('configMerge block not found in engine/post-request.js');
} else if (preBlock === postBlock) {
    pass('configMerge is identical in both engine files');
} else {
    fail('configMerge is OUT OF SYNC between pre-request.js and post-request.js');

    // Show diff summary
    const preLines  = preBlock.split('\n');
    const postLines = postBlock.split('\n');
    const maxLen    = Math.max(preLines.length, postLines.length);

    console.log('\n  Diff (pre vs post):');
    for (let i = 0; i < maxLen; i++) {
        const a = preLines[i]  || '';
        const b = postLines[i] || '';
        if (a !== b) {
            console.log('  Line ' + (i + 1) + ':');
            console.log('    pre:  ' + a);
            console.log('    post: ' + b);
        }
    }
}

// ── Check 2: VERSION constants ────────────────────────────────────────────────

console.log('\n🔧 Check 2: VERSION consistency');

function extractVersion(source, label) {
    const m = source.match(/const VERSION\s*=\s*'([^']+)'/);
    if (!m) { fail('VERSION not found in ' + label); return null; }
    return m[1];
}

const preVersion  = extractVersion(preSource,  'engine/pre-request.js');
const postVersion = extractVersion(postSource, 'engine/post-request.js');
const pkg         = JSON.parse(read('package.json'));
const pkgVersion  = pkg.version;

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

// ── Check 3: defaults.json is valid JSON ──────────────────────────────────────

console.log('\n🔧 Check 3: defaults.json is valid JSON');

try {
    const defaults = JSON.parse(read('setup/defaults.json'));
    pass('setup/defaults.json is valid JSON (' + Object.keys(defaults).length + ' keys)');
} catch (e) {
    fail('setup/defaults.json is invalid JSON: ' + e.message);
}

// ── Check 4: collection template is valid JSON ────────────────────────────────

console.log('\n🔧 Check 4: collection JSON is valid');

try {
    JSON.parse(read('collection/hephaestus-template.postman_collection.json'));
    pass('collection/hephaestus-template.postman_collection.json is valid JSON');
} catch (e) {
    fail('collection JSON is invalid: ' + e.message);
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(50));
console.log('Checks: ' + checks + '   Passed: ' + (checks - errors) + '   Failed: ' + errors);

if (errors > 0) {
    console.error('\n❌ Build checks failed (' + errors + ' error' + (errors > 1 ? 's' : '') + ')');
    process.exit(1);
} else {
    console.log('\n✅ All build checks passed');
    process.exit(0);
}
