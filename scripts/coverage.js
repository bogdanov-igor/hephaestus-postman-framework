#!/usr/bin/env node
/**
 * Hephaestus — OpenAPI Coverage  v4.0.0
 *
 * How much of an OpenAPI/Swagger spec does a Postman collection actually
 * exercise? Reports the percentage of spec operations (method + path) covered
 * by the collection's requests and lists the uncovered ones.
 *
 * Usage:
 *   node scripts/coverage.js --spec <openapi.yaml|json> <collection.json> [--json] [--min <pct>]
 *   hephaestus coverage      --spec <openapi.yaml|json> <collection.json> [--json] [--min <pct>]
 *
 *   --min <pct>   Exit 1 if coverage is below <pct> (CI gate). Default: no gate.
 *   --json        Machine-readable output.
 *
 * Path templates are normalised ({id} / :id / {{id}} → a placeholder), so a
 * request to /users/:id covers the /users/{id} operation. Spec paths are compared
 * as-is against the collection request path after {{baseUrl}} — set the
 * collection's baseUrl to the spec server base for an apples-to-apples match.
 * Zero dependencies (reuses the openapi-import spec parser).
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { parseSpec, resolveRefs } = require('./openapi-import.js');

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];

// ─── Pure helpers (exported + unit-tested) ────────────────────────────────────

// Normalise a path so templated segments compare equal regardless of syntax:
// {{var}} / {id} / :id all collapse to "{}"; slashes are tidied.
function normPath(p) {
    if (!p) return '/';
    p = String(p).split('?')[0].split('#')[0];
    p = p.replace(/\{\{[^}]+\}\}/g, '{}')   // {{var}}
         .replace(/\{[^}]+\}/g, '{}')        // {id}
         .replace(/:\w+/g, '{}');            // :id — bounded like {id} so a literal
                                             //       suffix (:id.pdf) / multiple params stay symmetric
    p = p.replace(/\/{2,}/g, '/');
    if (p.charAt(0) !== '/') p = '/' + p;
    if (p.length > 1) p = p.replace(/\/+$/, '');
    return p || '/';
}

// Extract the request path from a Postman URL (string or {raw, path[]}),
// stripping protocol/host/query so it's host-agnostic ({{baseUrl}} etc.).
function urlPath(url) {
    if (url && Array.isArray(url.path) && url.path.length) {
        return '/' + url.path.map(function (s) { return String(s); }).join('/');
    }
    var raw = typeof url === 'string' ? url : (url && url.raw) || '';
    raw = raw.split('?')[0].split('#')[0].replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
    var slash = raw.indexOf('/');
    return slash === -1 ? '/' : raw.slice(slash);
}

// Every {method, path} operation declared by a parsed spec.
function specOperations(spec) {
    var ops = [];
    var paths = (spec && spec.paths) || {};
    Object.keys(paths).forEach(function (p) {
        var item = resolveRefs(paths[p], spec);   // a path-item may itself be a $ref
        if (!item || typeof item !== 'object') return;
        METHODS.forEach(function (m) {
            if (item[m]) ops.push({ method: m.toUpperCase(), path: p, key: m.toUpperCase() + ' ' + normPath(p) });
        });
    });
    return ops;
}

// The set of "METHOD normPath" a collection's requests cover.
function collectionRoutes(collection) {
    var set = {};
    (function walk(items) {
        if (!Array.isArray(items)) return;
        items.forEach(function (item) {
            if (item && item.item) { walk(item.item); return; }   // folder
            if (!item || !item.request) return;
            var method = String(item.request.method || 'GET').toUpperCase();
            set[method + ' ' + normPath(urlPath(item.request.url))] = true;
        });
    })(collection && collection.item);
    return set;
}

function computeCoverage(spec, collection) {
    var ops = specOperations(spec);
    var covered = collectionRoutes(collection);
    var hit = [], miss = [];
    ops.forEach(function (op) { (covered[op.key] ? hit : miss).push(op); });
    var pct = ops.length ? Math.round((hit.length / ops.length) * 1000) / 10 : 100;
    return { total: ops.length, covered: hit.length, uncovered: miss, pct: pct };
}

module.exports = {
    normPath: normPath,
    urlPath: urlPath,
    specOperations: specOperations,
    collectionRoutes: collectionRoutes,
    computeCoverage: computeCoverage
};

// ─── CLI (only when run directly) ─────────────────────────────────────────────

if (require.main === module) {
    var argv     = process.argv.slice(2);
    var jsonOut  = argv.indexOf('--json') !== -1;
    var noColor  = argv.indexOf('--no-color') !== -1 || jsonOut;
    var wantHelp = argv.indexOf('--help') !== -1 || argv.indexOf('-h') !== -1;

    var consumed = {};
    function flagVal(name) {
        var idx = argv.indexOf(name);
        if (idx === -1) return null;
        consumed[idx] = true;
        var v = argv[idx + 1];
        if (v !== undefined && v.charAt(0) !== '-') { consumed[idx + 1] = true; return v; }
        return true;   // present but no value
    }
    var specFile = flagVal('--spec');
    var minRaw   = flagVal('--min');

    var collectionFile = null;
    for (var i = 0; i < argv.length; i++) {
        if (consumed[i] || argv[i].charAt(0) === '-') continue;
        collectionFile = argv[i];
        break;
    }

    var C = {
        dim:   function (s) { return noColor ? s : '\x1b[2m'  + s + '\x1b[0m'; },
        bold:  function (s) { return noColor ? s : '\x1b[1m'  + s + '\x1b[0m'; },
        green: function (s) { return noColor ? s : '\x1b[32m' + s + '\x1b[0m'; },
        red:   function (s) { return noColor ? s : '\x1b[31m' + s + '\x1b[0m'; },
        yellow:function (s) { return noColor ? s : '\x1b[33m' + s + '\x1b[0m'; },
        cyan:  function (s) { return noColor ? s : '\x1b[36m' + s + '\x1b[0m'; }
    };

    if (wantHelp || !specFile || specFile === true || !collectionFile) {
        console.log([
            '',
            '⚒️  Hephaestus Coverage  v4.0.0',
            '',
            'Percentage of an OpenAPI/Swagger spec exercised by a Postman collection.',
            '',
            'Usage: hephaestus coverage --spec <openapi.yaml|json> <collection.json> [options]',
            '',
            'Options:',
            '  --spec <file>   OpenAPI 3.x / Swagger 2.0 spec (JSON or YAML subset)   [required]',
            '  --min <pct>     Exit 1 if coverage is below <pct> (CI gate)',
            '  --json          Machine-readable output',
            '  --no-color      Disable ANSI colours',
            '  --help, -h      This help',
            ''
        ].join('\n'));
        process.exit(wantHelp ? 0 : 1);
    }

    // A malformed --min (empty/missing/non-numeric) must NOT silently disable the
    // gate — that would ship a false-green CI. Error out, like a missing --spec.
    var minPct = null;
    if (minRaw !== null) {
        var minN = (minRaw === true) ? NaN : parseFloat(minRaw);
        if (isNaN(minN)) {
            console.error(C.red('❌ --min requires a numeric percentage (e.g. --min 80).'));
            process.exit(1);
        }
        minPct = minN;
    }

    function readJsonOrSpec(file, kind) {
        var raw;
        try { raw = fs.readFileSync(path.resolve(file), 'utf8'); }
        catch (e) { console.error(C.red('❌ Cannot read ' + kind + ': ') + e.message); process.exit(1); }
        return raw;
    }

    var spec;
    try { spec = parseSpec(readJsonOrSpec(specFile, 'spec')); }
    catch (e) { console.error(C.red('❌ Cannot parse spec: ') + e.message + C.dim('  (YAML support is a subset — try JSON.)')); process.exit(1); }
    if (!spec || typeof spec !== 'object' || !spec.paths || Object.keys(spec.paths).length === 0) {
        console.error(C.red('❌ No paths found in spec (is this a valid OpenAPI/Swagger document?).'));
        process.exit(1);
    }

    var collection;
    try { collection = JSON.parse(readJsonOrSpec(collectionFile, 'collection')); }
    catch (e) { console.error(C.red('❌ Cannot parse collection JSON: ') + e.message); process.exit(1); }

    var cov = computeCoverage(spec, collection);
    var gated = (minPct !== null);
    var belowMin = gated && cov.pct < minPct;

    if (jsonOut) {
        console.log(JSON.stringify({
            spec: specFile, collection: collectionFile,
            total: cov.total, covered: cov.covered, pct: cov.pct,
            min: gated ? minPct : null, ok: !belowMin,
            uncovered: cov.uncovered.map(function (o) { return { method: o.method, path: o.path }; })
        }, null, 2));
    } else {
        var pctColor = cov.pct >= 90 ? C.green : cov.pct >= 60 ? C.yellow : C.red;
        var barLen = 30;
        var filled = Math.round((cov.pct / 100) * barLen);
        var bar = pctColor('█'.repeat(filled)) + C.dim('░'.repeat(barLen - filled));

        console.log('');
        console.log(C.bold('  ⚒️  Hephaestus Coverage'));
        console.log(C.dim('  ' + '─'.repeat(58)));
        console.log(C.dim('  Spec:       ') + specFile + C.dim('  (' + cov.total + ' operation' + (cov.total === 1 ? '' : 's') + ')'));
        console.log(C.dim('  Collection: ') + collectionFile);
        console.log('');
        console.log('  ' + bar + '  ' + pctColor(C.bold(cov.pct + '%')) + C.dim('  (' + cov.covered + '/' + cov.total + ' covered)'));
        console.log('');
        if (cov.uncovered.length) {
            console.log(C.dim('  Uncovered (' + cov.uncovered.length + '):'));
            cov.uncovered.forEach(function (o) {
                console.log('  ' + C.red('✗') + ' ' + C.bold(o.method) + ' '.repeat(Math.max(1, 7 - o.method.length)) + o.path);
            });
        } else {
            console.log('  ' + C.green('✓ every documented operation is exercised.'));
        }
        console.log('');
        if (gated) {
            if (belowMin) console.log('  ' + C.red(C.bold('❌ below --min ' + minPct + '% — failing.')));
            else          console.log('  ' + C.green('✓ meets --min ' + minPct + '%.'));
            console.log('');
        }
    }
    // Set the exit code rather than process.exit(), so a large --json payload
    // fully flushes to a pipe before the process ends.
    process.exitCode = belowMin ? 1 : 0;
}
