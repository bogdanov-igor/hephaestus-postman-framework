#!/usr/bin/env node
'use strict';
/**
 * Hephaestus — Engine overhead benchmark
 *
 * "Measure what you ship." Reports how much the Hephaestus engine actually costs
 * per request, so the "lightweight" claim is backed by numbers rather than vibes.
 *
 * METHOD (A/B, so the numbers isolate the engine and not Newman/HTTP):
 *   Two identical request sets run through the real Newman/Postman sandbox against
 *   a local mock server —
 *     A "engine"   : each request evals the shipped engine (pre + post) with a
 *                    representative override (status + keysToFind + assertions).
 *     B "baseline" : the same HTTP request with a no-op test script.
 *   Both pay identical Newman startup + HTTP cost, so (medianA − medianB) is the
 *   engine's own eval + pipeline time. Divided by the request count = per-request
 *   overhead. Reported as the median of several runs (system noise cancels out).
 *
 * Usage:
 *   node bin/hephaestus.js bench [--requests N] [--runs K] [--json] [--max-ms M]
 *     --requests N   requests per run           (default 40)
 *     --runs K       timed runs per side, median (default 5)
 *     --json         machine-readable output
 *     --max-ms M     CI gate: exit 1 if per-request overhead exceeds M ms
 *
 * Zero dependencies beyond the dev-only `newman` (already used by the test suite).
 */

const fs     = require('fs');
const path   = require('path');
const http   = require('http');

// newman is a devDependency. The other commands drive the `newman` CLI; bench is
// the one place that needs the newman MODULE, and a user who installed hephaestus
// may not have it resolvable. Load it lazily so bench exits with a clear message
// instead of a raw MODULE_NOT_FOUND stack at process start.
function loadNewman() {
    try { return require('newman'); }
    catch (e) {
        console.error('`bench` needs the newman package, which is not installed here.');
        console.error('  npm install newman     (or run bench from a project that has it)');
        process.exit(1);
    }
}

const ROOT = path.resolve(__dirname, '..');

// ── args ──────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
    const a = { requests: 40, runs: 5, json: false, maxMs: null };
    for (let i = 0; i < argv.length; i++) {
        const t = argv[i];
        if (t === '--json') a.json = true;
        else if (t === '--requests') a.requests = parseInt(argv[++i], 10);
        else if (t === '--runs') a.runs = parseInt(argv[++i], 10);
        else if (t === '--max-ms') a.maxMs = parseFloat(argv[++i]);
    }
    if (!(a.requests > 0)) a.requests = 40;
    if (!(a.runs > 0)) a.runs = 5;
    return a;
}

// ── mock server: one canned JSON body for every path ──────────────────────────

function startMock() {
    const body = JSON.stringify({
        data: { id: 42, name: 'Alice', status: 'active', score: 7, tags: ['a', 'b'] },
        count: 2
    });
    const server = http.createServer(function (req, res) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(body);
    });
    return new Promise(function (resolve) {
        server.listen(0, '127.0.0.1', function () { resolve(server); });
    });
}

// ── collections: A = engine, B = baseline ─────────────────────────────────────

// A representative post-request override: a status check, a couple of extracted
// keys and a handful of value assertions — a realistic (not maximal) config.
const REPRESENTATIVE_OVERRIDE = {
    expectedStatus: 200,
    keysToFind: [{ path: 'data.id' }, { path: 'data.name' }],
    assertions: {
        'data.id':     { eq: 42, gt: 0 },
        'data.name':   { eq: 'Alice' },
        'data.status': { exists: true, eq: 'active' },
        'count':       { gte: 2 }
    }
};

function engineScripts() {
    return [
        { listen: 'prerequest', script: { type: 'text/javascript', exec: [
            'const override = {};',
            'eval(pm.collectionVariables.get("hephaestus.v3.pre"));'
        ] } },
        { listen: 'test', script: { type: 'text/javascript', exec: [
            'const override = ' + JSON.stringify(REPRESENTATIVE_OVERRIDE) + ';',
            'eval(pm.collectionVariables.get("hephaestus.v3.post"));'
        ] } }
    ];
}

function baselineScripts() {
    // A no-op prerequest AND test, so the baseline runs the same NUMBER of sandbox
    // events as the engine side (which drives both planes). The fixed per-event
    // Newman/sandbox cost then cancels in the delta, leaving only the engine's own
    // eval + pipeline work — not the cost of booting one extra sandbox event.
    return [
        { listen: 'prerequest', script: { type: 'text/javascript', exec: ['/* baseline: no engine */'] } },
        { listen: 'test',       script: { type: 'text/javascript', exec: ['/* baseline: no engine */'] } }
    ];
}

function buildCollection(mode, requests, baseUrl, preSrc, postSrc) {
    const defaults = {
        baseUrl: baseUrl, defaultProtocol: 'http',
        auth: { enabled: false, type: 'none' },
        expectedStatus: [200], contentType: 'json',
        snapshot: { enabled: false, storage: 'collection-vars', mode: 'non-strict', autoSaveMissing: true, checkPaths: [], ignorePaths: [] },
        schema: { enabled: false, definition: null },
        secrets: [], envRequired: [], ci: false, logLevel: 'silent', softFail: false, randomData: {}
    };
    const makeScripts = mode === 'engine' ? engineScripts : baselineScripts;
    const items = [];
    for (let i = 0; i < requests; i++) {
        items.push({
            name: mode + '-' + i,
            request: { method: 'GET', url: baseUrl + '/obj' },
            event: makeScripts()
        });
    }
    return {
        info: { name: 'HephaestusBench-' + mode, schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
        item: items,
        variable: [
            { key: 'hephaestus.v3.pre',  value: preSrc },
            { key: 'hephaestus.v3.post', value: postSrc },
            { key: 'hephaestus.defaults', value: JSON.stringify(defaults) },
            { key: 'hephaestus.collectionName', value: 'HephaestusBench' },
            { key: 'hephaestus.snapshots', value: '{}' }
        ]
    };
}

// ── timing ────────────────────────────────────────────────────────────────────

// Loaded on first run, not at require() — so the module's exports (parseArgs,
// buildCollection, median) stay require-able for the test suite without newman.
let _newman = null;

function runOnce(collection) {
    if (!_newman) _newman = loadNewman();
    return new Promise(function (resolve, reject) {
        const t0 = process.hrtime.bigint();
        _newman.run({ collection: collection, reporters: [] }, function (err) {
            if (err) return reject(err);
            resolve(Number(process.hrtime.bigint() - t0) / 1e6); // ms
        });
    });
}

function median(xs) {
    const s = xs.slice().sort(function (a, b) { return a - b; });
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
    const args = parseArgs(process.argv.slice(2));

    // Fail LOUD on a malformed budget. A CI gate that silently disables itself
    // (e.g. `--max-ms $BUDGET` with BUDGET unset → NaN) is the dangerous direction:
    // it would pass a real regression green. Guard it like --requests / --runs.
    if (args.maxMs != null && !(args.maxMs >= 0)) {
        process.stderr.write('bench: --max-ms needs a non-negative numeric budget (ms)\n');
        process.exitCode = 1;
        return;
    }

    const preSrc  = fs.readFileSync(path.join(ROOT, 'engine/pre-request.js'), 'utf8');
    const postSrc = fs.readFileSync(path.join(ROOT, 'engine/post-request.js'), 'utf8');
    const sizePre  = Buffer.byteLength(preSrc, 'utf8');
    const sizePost = Buffer.byteLength(postSrc, 'utf8');

    const server  = await startMock();
    const baseUrl = 'http://127.0.0.1:' + server.address().port;
    const engineCol   = buildCollection('engine', args.requests, baseUrl, preSrc, postSrc);
    const baselineCol = buildCollection('baseline', args.requests, baseUrl, preSrc, postSrc);

    if (!args.json) process.stderr.write('Benchmarking engine overhead (' + args.requests + ' req × ' + args.runs + ' runs)…\n');

    try {
        await runOnce(baselineCol); // warmup (JIT, DNS, connection pool)
        await runOnce(engineCol);
        const engineTimes = [], baseTimes = [];
        for (let k = 0; k < args.runs; k++) {
            baseTimes.push(await runOnce(baselineCol));
            engineTimes.push(await runOnce(engineCol));
        }
        const medEngine   = median(engineTimes);
        const medBaseline = median(baseTimes);
        // Overhead is the added time per request; never report negative noise.
        const overheadPerReq = Math.max(0, (medEngine - medBaseline) / args.requests);

        const result = {
            requests: args.requests,
            runs: args.runs,
            engineBundleBytes: { pre: sizePre, post: sizePost, total: sizePre + sizePost },
            medianRunMs: { engine: round(medEngine), baseline: round(medBaseline) },
            overheadPerRequestMs: round(overheadPerReq),
            node: process.version
        };

        server.close();

        if (args.json) {
            process.stdout.write(JSON.stringify(result, null, 2) + '\n');
        } else {
            report(result);
        }

        if (args.maxMs != null && overheadPerReq > args.maxMs) {
            process.stderr.write('\n✖ overhead ' + round(overheadPerReq) + ' ms/req exceeds budget ' + args.maxMs + ' ms\n');
            process.exitCode = 1;
        }
    } catch (err) {
        try { server.close(); } catch (e) { /* ignore */ }
        process.stderr.write('bench failed: ' + (err && err.message ? err.message : err) + '\n');
        process.exitCode = 1;
    }
}

function round(n) { return Math.round(n * 1000) / 1000; }
function kb(bytes) { return (bytes / 1024).toFixed(1) + ' KB'; }

function report(r) {
    const L = [];
    L.push('');
    L.push('  Hephaestus — engine overhead');
    L.push('  ' + '─'.repeat(40));
    L.push('  Engine bundle    ' + kb(r.engineBundleBytes.total) +
        '  (pre ' + kb(r.engineBundleBytes.pre) + ' · post ' + kb(r.engineBundleBytes.post) + ')');
    L.push('  Requests × runs  ' + r.requests + ' × ' + r.runs + '   (median of runs)');
    L.push('  Run: engine      ' + r.medianRunMs.engine + ' ms');
    L.push('  Run: baseline    ' + r.medianRunMs.baseline + ' ms   (same request, no engine)');
    L.push('  ' + '─'.repeat(40));
    L.push('  Overhead / req   ' + r.overheadPerRequestMs + ' ms   ← engine eval + full pipeline');
    L.push('  Node             ' + r.node);
    L.push('');
    process.stdout.write(L.join('\n') + '\n');
}

if (require.main === module) {
    main();
}

module.exports = { parseArgs, buildCollection, median, REPRESENTATIVE_OVERRIDE };
