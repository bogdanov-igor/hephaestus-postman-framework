'use strict';
/**
 * Hephaestus — demo scaffold  v4.0.1
 *
 * Builds a self-contained demo: a collection wired to the real engine, an
 * environment, and the snapshots that let `hephaestus mock` serve it. The point
 * is that someone can go from `init --demo` to a green Newman run without an
 * account, an API key, or a network — the mock replays the snapshots shipped
 * inside the collection itself.
 *
 * Paths are deliberately static. `mock` matches dynamic segments ({{id}}, :id)
 * literally, so a demo request on /products/{{productId}} would register the
 * route with the braces still in it and 404 at run time.
 */

const fs   = require('fs');
const path = require('path');

const ROOT     = path.resolve(__dirname, '..', '..');
const TEMPLATE = path.join(ROOT, 'collection', 'hephaestus-template.postman_collection.json');

const DEMO_NAME = 'Hephaestus Demo';
// mock defaults to 3000, which is the most-occupied port on a dev machine, so
// the demo names its own and the printed command passes -p explicitly.
const DEMO_PORT = 4010;

// ─── Demo data ────────────────────────────────────────────────────────────────

const PRODUCTS = [
    { id: 'p-1001', name: 'Anvil',        price: 120, inStock: true  },
    { id: 'p-1002', name: 'Bellows',      price: 340, inStock: true  },
    { id: 'p-1003', name: 'Forge tongs',  price: 55,  inStock: false },
];

// ─── Script wiring ────────────────────────────────────────────────────────────

// Requests carry an override block followed by the engine eval — the same shape
// the template uses, so a demo request is copy-pasteable into a real collection.
function script(overrideLines, phase) {
    return {
        listen: phase === 'pre' ? 'prerequest' : 'test',
        script: {
            type: 'text/javascript',
            exec: []
                .concat(['// ── Override ──────────────────────────────────────────────────────'])
                .concat(overrideLines)
                .concat([
                    '',
                    '// ── Engine ────────────────────────────────────────────────────────',
                    "eval(pm.collectionVariables.get('hephaestus.v3." + (phase === 'pre' ? 'pre' : 'post') + "'));",
                ]),
        },
    };
}

function request(method, segments, body) {
    const req = {
        method: method,
        header: body ? [{ key: 'Content-Type', value: 'application/json' }] : [],
        url: {
            raw: '{{baseUrl}}/' + segments.join('/'),
            host: ['{{baseUrl}}'],
            path: segments.slice(),
        },
    };
    if (body) req.body = { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } };
    return req;
}

// ─── The five demo requests ───────────────────────────────────────────────────
//
// Each one demonstrates exactly one headline feature, in the order the README
// walks through them.

const ITEMS = [
    {
        name: '1. Health check',
        description: 'The smallest possible Hephaestus test: assert the status code.',
        request: request('GET', ['health']),
        post: [
            'const override = {',
            '    expectedStatus: 200',
            '};',
        ],
        snapshot: { statusCode: 200, format: 'json', data: { status: 'ok', version: '4.0.1' } },
    },
    {
        name: '2. List products',
        description: 'Shape of every element, a sort order, and a response-time budget — '
                   + 'three assertions that would each be a hand-written pm.test().',
        request: request('GET', ['products']),
        post: [
            'const override = {',
            '    expectedStatus: 200,',
            '',
            '    // Contract of the envelope itself.',
            '    assertShape: {',
            "        'items': 'array',",
            "        'total': 'number',",
            "        'error': 'absent'",
            '    },',
            '',
            '    // Contract of every element. Per-element checks live here, not in',
            '    // assertShape — assertShape takes plain paths, not [] notation.',
            '    assertEach: {',
            "        path: 'items',",
            '        minCount: 1,',
            '        rules: {',
            "            'id':    { type: 'string' },",
            "            'price': { type: 'number', gt: 0 }",
            '        }',
            '    },',
            '',
            "    // type: 'number' matters — the default is string comparison, under",
            '    // which "55" sorts after "120".',
            '    assertOrder: {',
            "        path: 'items',",
            "        by:   'price',",
            "        direction: 'asc',",
            "        type: 'number'",
            '    },',
            '',
            '    // Top-level, not nested under a "metrics" block — there is no such',
            '    // block, and an unknown key is silently ignored unless strictMode',
            '    // is on. strictMode catches exactly this class of typo.',
            '    maxResponseTime: 2000',
            '};',
        ],
        snapshot: {
            statusCode: 200, format: 'json',
            data: { items: PRODUCTS.slice().sort(function(a, b) { return a.price - b.price; }), total: PRODUCTS.length },
        },
    },
    {
        name: '3. Create product',
        description: 'Value-level assertions, plus saving a field from the response into a '
                   + 'collection variable for later requests.',
        request: request('POST', ['products'], { name: 'Quench tub', price: 210 }),
        post: [
            'const override = {',
            '    expectedStatus: 201,',
            '    assertions: {',
            "        'name':    { eq: 'Quench tub' },",
            "        'price':   { eq: 210 },",
            "        'id':      { matches: '^p-' }",
            '    },',
            '    varsToSave: {',
            '        newId: {',
            "            path:  'id',",
            "            scope: 'collection',",
            "            name:  'demo.productId'",
            '        }',
            '    }',
            '};',
        ],
        snapshot: { statusCode: 201, format: 'json', data: { id: 'p-1004', name: 'Quench tub', price: 210, inStock: true } },
    },
    {
        name: '4. Get product (snapshot)',
        description: 'Structural snapshot: the test fails if a field disappears or changes '
                   + 'type, and stays quiet when a value merely changes.',
        request: request('GET', ['products', 'p-1001']),
        post: [
            'const override = {',
            '    expectedStatus: 200,',
            '    snapshot: {',
            '        enabled: true,',
            "        mode:    'structural',",
            '        autoSaveMissing: true',
            '    }',
            '};',
        ],
        snapshot: { statusCode: 200, format: 'json', data: PRODUCTS[0] },
    },
    {
        name: '5. Missing product (negative)',
        description: 'A 404 is the expected result here — the run stays green because the '
                   + 'test says so, not because nothing was checked.',
        request: request('GET', ['products', 'does-not-exist']),
        post: [
            'const override = {',
            '    expectedStatus: 404,',
            '    assertions: {',
            "        'error': { exists: true }",
            '    }',
            '};',
        ],
        snapshot: { statusCode: 404, format: 'json', data: { error: 'Product not found' } },
    },
];

// ─── Build ────────────────────────────────────────────────────────────────────

function setVar(collection, key, value) {
    const vars = collection.variable || (collection.variable = []);
    const hit  = vars.filter(function(v) { return v && v.key === key; })[0];
    if (hit) hit.value = value;
    else vars.push({ key: key, value: value, type: 'string' });
}

// Snapshot store key, mirroring engine/src/post-request.js:
//   {collectionName}::{requestName}::{statusCode}::{format}
function snapshotKey(requestName, statusCode, format) {
    return [DEMO_NAME, requestName, statusCode, format].join('::');
}

function buildDemo() {
    if (!fs.existsSync(TEMPLATE)) {
        throw new Error('Demo needs the shipped template but it is missing: ' + TEMPLATE);
    }
    const collection = JSON.parse(fs.readFileSync(TEMPLATE, 'utf8'));

    collection.info = collection.info || {};
    collection.info.name        = DEMO_NAME;
    collection.info.description = 'Generated by `hephaestus init --demo`. Runs offline against '
                                + '`hephaestus mock` — no account, no API key, no network.';
    delete collection.info._postman_id;

    // Replace the template's example folders with the demo requests. The engine
    // itself lives in collection variables and is left exactly as shipped.
    collection.item = ITEMS.map(function(spec) {
        return {
            name:        spec.name,
            description: { content: spec.description, type: 'text/markdown' },
            event:       [script(spec.post, 'post')],
            request:     spec.request,
            response:    [],
        };
    });

    // Snapshots let `mock` serve this collection back to Newman.
    const snapshots = {};
    ITEMS.forEach(function(spec) {
        const s = spec.snapshot;
        snapshots[snapshotKey(spec.name, s.statusCode, s.format)] = {
            format:     s.format,
            statusCode: s.statusCode,
            data:       s.data,
            savedAt:    '2026-01-01T00:00:00.000Z',
        };
    });

    setVar(collection, 'hephaestus.collectionName', DEMO_NAME);
    setVar(collection, 'hephaestus.snapshots', JSON.stringify(snapshots));
    setVar(collection, 'baseUrl', 'http://localhost:' + DEMO_PORT);

    const environment = {
        name: 'Hephaestus Demo',
        values: [
            { key: 'baseUrl', value: 'http://localhost:' + DEMO_PORT, type: 'default', enabled: true },
        ],
        _postman_variable_scope: 'environment',
    };

    return { collection: collection, environment: environment, port: DEMO_PORT, name: DEMO_NAME };
}

function readme(collectionFile, environmentFile) {
    return [
        '# Hephaestus demo',
        '',
        'Five requests against a mock that is served from the collection itself.',
        'No account, no API key, no network.',
        '',
        '## Run it',
        '',
        'Terminal 1 — serve the recorded responses:',
        '',
        '```bash',
        'hephaestus mock ' + collectionFile + ' -p ' + DEMO_PORT,
        '```',
        '',
        'Terminal 2 — run the tests against it:',
        '',
        '```bash',
        'newman run ' + collectionFile + ' -e ' + environmentFile,
        '```',
        '',
        'Expected: 5 requests, all green — including request 5, which asserts a 404.',
        '',
        '## What each request shows',
        '',
        '| # | Request | Feature |',
        '|---|---|---|',
        '| 1 | Health check | `expectedStatus` |',
        '| 2 | List products | `assertShape`, `assertEach`, `assertOrder`, `maxResponseTime` |',
        '| 3 | Create product | `assertions`, `varsToSave` |',
        '| 4 | Get product | `snapshot` (structural) |',
        '| 5 | Missing product | a negative test that keeps the run green |',
        '',
        'Open any request in Postman: the whole test is the `override` block at the',
        'top of the Tests tab. The line under it evaluates the engine.',
        '',
        '## Then',
        '',
        '```bash',
        'newman run ' + collectionFile + ' -e ' + environmentFile + ' -r json --reporter-json-export run.json',
        'hephaestus summary run.json',
        'hephaestus report  run.json demo-report.html',
        'hephaestus docs    ' + collectionFile + ' -o demo-api.md',
        '```',
        '',
    ].join('\n');
}

module.exports = { buildDemo, readme, snapshotKey, DEMO_NAME, DEMO_PORT, ITEMS };
