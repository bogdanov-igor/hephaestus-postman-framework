#!/usr/bin/env node
/**
 * Hephaestus — Snapshot → Postman Examples  v4.0.1
 *
 * Reads the saved Hephaestus snapshots from a collection's `hephaestus.snapshots`
 * variable and writes them back into the collection as native Postman "Example
 * Responses" — so snapshots become visible in the Postman UI and usable with the
 * Postman Mock Server.
 *
 * Snapshot key format: {collectionName}::{requestName}::{statusCode}::{format}
 * Examples are named "📸 Snapshot {code} {format}" and re-synced idempotently
 * (previous 📸 examples are replaced, hand-authored examples are kept).
 *
 * Usage:
 *   node scripts/sync-examples.js <collection.json> [-o out.json] [--in-place] [--filter <substr>]
 *
 * Options:
 *   -o <file>     Output path (default: <input>.with-examples.json)
 *   --in-place    Overwrite the input collection (writes <input>.bak first)
 *   --filter <s>  Only sync snapshot keys containing <s>
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── CLI ──────────────────────────────────────────────────────────────────────

const args      = process.argv.slice(2);
const inputFile  = args.find(function(a) { return !a.startsWith('-'); });
const inPlace    = args.includes('--in-place');
const oIdx       = args.indexOf('-o');
const outArg     = oIdx !== -1 ? args[oIdx + 1] : null;
const fIdx       = args.indexOf('--filter');
const filterStr  = fIdx !== -1 ? args[fIdx + 1] : null;

if (!inputFile) {
    console.error('Usage: node scripts/sync-examples.js <collection.json> [-o out.json] [--in-place] [--filter <substr>]');
    process.exit(1);
}

const EXAMPLE_PREFIX = '📸 Snapshot';

const STATUS_TEXT = {
    200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content',
    301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified',
    400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found',
    405: 'Method Not Allowed', 409: 'Conflict', 422: 'Unprocessable Entity', 429: 'Too Many Requests',
    500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout'
};

// ─── Load ──────────────────────────────────────────────────────────────────────

let collection;
try {
    collection = JSON.parse(fs.readFileSync(path.resolve(inputFile), 'utf8'));
} catch (e) {
    console.error('❌ Cannot read/parse collection: ' + e.message);
    process.exit(1);
}

const variables = collection.variable || [];
const snapVar   = variables.find(function(v) { return v.key === 'hephaestus.snapshots'; });

let snapshots = {};
try {
    snapshots = snapVar && snapVar.value ? JSON.parse(snapVar.value) : {};
} catch (e) {
    console.error('❌ hephaestus.snapshots is not valid JSON: ' + e.message);
    process.exit(1);
}

const snapKeys = Object.keys(snapshots).filter(function(k) {
    return !filterStr || k.indexOf(filterStr) !== -1;
});

if (snapKeys.length === 0) {
    console.error('⚠️  No snapshots found in hephaestus.snapshots' + (filterStr ? ' matching "' + filterStr + '"' : '') + ' — nothing to sync.');
    process.exit(1);
}

// requestName -> [ {key, snap} ]
const byRequest = {};
snapKeys.forEach(function(key) {
    const parts = key.split('::');
    const requestName = parts[1] || '';
    if (!requestName) return;
    (byRequest[requestName] = byRequest[requestName] || []).push({ key: key, snap: snapshots[key] });
});

// ─── Build a Postman example from a snapshot ────────────────────────────────────

function buildExample(item, key, snap) {
    const format = snap.format || 'json';
    const isJson = format === 'json' || format === 'xml';
    // json/xml bodies are JSON-encoded so a top-level string/number round-trips
    // as valid JSON (kept consistent with scripts/mock.js serialize()).
    const bodyStr = format === 'text'
        ? String(snap.data === undefined || snap.data === null ? '' : snap.data)
        : JSON.stringify(snap.data === undefined ? null : snap.data, null, 2);
    const contentType = format === 'xml' ? 'application/json'   // snapshot data is parsed → JSON
        : format === 'text' ? 'text/plain'
        : 'application/json';

    return {
        name: EXAMPLE_PREFIX + ' ' + (snap.statusCode || 200) + ' ' + format,
        originalRequest: item.request || {},
        status: STATUS_TEXT[snap.statusCode] || '',
        code:   snap.statusCode || 200,
        _postman_previewlanguage: isJson ? 'json' : 'text',
        header: [{ key: 'Content-Type', value: contentType }],
        cookie: [],
        body:   bodyStr,
        // marker so re-syncs and users can tell these came from Hephaestus
        description: 'Auto-generated from Hephaestus snapshot: ' + key
    };
}

// ─── Walk the item tree, attach examples ────────────────────────────────────────

let addedExamples = 0;
let touchedRequests = 0;
const matchedRequestNames = {};

function walk(items) {
    if (!Array.isArray(items)) return;
    items.forEach(function(item) {
        if (item.item) { walk(item.item); return; }      // folder
        if (!item.request) return;                        // not a request

        const snaps = byRequest[item.name];
        if (!snaps || !snaps.length) return;

        // Drop previously-generated 📸 examples (idempotent re-sync), keep others.
        const existing = Array.isArray(item.response) ? item.response : [];
        const kept = existing.filter(function(r) {
            return !(r && typeof r.name === 'string' && r.name.indexOf(EXAMPLE_PREFIX) === 0);
        });

        const fresh = snaps.map(function(s) { return buildExample(item, s.key, s.snap); });
        item.response = kept.concat(fresh);

        addedExamples += fresh.length;
        touchedRequests++;
        matchedRequestNames[item.name] = true;
    });
}

walk(collection.item);

// Snapshots whose request name wasn't found in the collection
const orphans = Object.keys(byRequest).filter(function(n) { return !matchedRequestNames[n]; });

// ─── Write ──────────────────────────────────────────────────────────────────────

const outFile = inPlace ? path.resolve(inputFile)
    : outArg ? path.resolve(outArg)
    : path.resolve(inputFile.replace(/\.json$/i, '') + '.with-examples.json');

if (inPlace) {
    fs.copyFileSync(path.resolve(inputFile), path.resolve(inputFile) + '.bak');
}
fs.writeFileSync(outFile, JSON.stringify(collection, null, 2) + '\n');

// ─── Summary ────────────────────────────────────────────────────────────────────

console.log('📸 Synced ' + addedExamples + ' example(s) into ' + touchedRequests + ' request(s).');
if (orphans.length) {
    console.log('⚠️  ' + orphans.length + ' snapshot request name(s) not found in the collection: ' + orphans.join(', '));
}
console.log('→ ' + path.relative(process.cwd(), outFile) + (inPlace ? '  (backup: ' + path.basename(inputFile) + '.bak)' : ''));
process.exit(0);
