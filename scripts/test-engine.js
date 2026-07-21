#!/usr/bin/env node
/**
 * Hephaestus — Engine Behavioral Test Harness  v4.0.0
 *
 * Runs the ACTUAL in-Postman engine through the real Newman/Postman sandbox
 * (chai, tv4, CryptoJS, xml2js all present) against a local mock server, and
 * captures a deterministic "behavior fingerprint": every pm.test name + its
 * pass/fail, plus the normalized [HEPHAESTUS_CI] JSON line per request
 * (response time/size stripped so the fingerprint is stable across runs).
 *
 * Usage:
 *   node scripts/test-engine.js                  # assert current engine == golden
 *   node scripts/test-engine.js --update-golden  # capture golden from current engine
 *   node scripts/test-engine.js --print          # print fingerprint (debug)
 *
 * This is the safety net for refactoring the engine (Phase 2): a modular/bundled
 * engine must reproduce the golden fingerprint byte-for-byte.
 */

'use strict';

const fs      = require('fs');
const path    = require('path');
const http    = require('http');
const newman  = require('newman');

const ROOT        = path.resolve(__dirname, '..');
const GOLDEN_PATH = path.join(ROOT, 'scripts/fixtures/engine-golden.json');

// ── Mock server: deterministic canned responses ───────────────────────────────

function startMockServer() {
    const server = http.createServer(function (req, res) {
        const url = req.url.split('?')[0];

        function json(obj, code, headers) {
            res.writeHead(code || 200, Object.assign({ 'Content-Type': 'application/json' }, headers || {}));
            res.end(JSON.stringify(obj));
        }

        if (url === '/obj') {
            return json({ data: { id: 42, name: 'Alice', status: 'active', score: 7, tags: ['a', 'b'] }, count: 2 });
        }
        // Deliberately slow so a 1 ms budget fails on every machine. 60 ms is far
        // enough above scheduler noise that the verdict never flips.
        if (url === '/slow') {
            return setTimeout(function () { json({ ok: true }); }, 60);
        }
        if (url === '/list') {
            return json({ items: [
                { id: 1, kind: 'x', price: 10 },
                { id: 2, kind: 'y', price: 20 },
                { id: 3, kind: 'z', price: 30 }
            ] });
        }
        if (url === '/xml') {
            res.writeHead(200, { 'Content-Type': 'application/xml' });
            return res.end('<root><token>ABC123</token><user><id>7</id></user></root>');
        }
        if (url === '/binary') {
            // unparseable body (not JSON, not XML, not text) → the notParsed path
            res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
            return res.end('\x00\x01BINARY-not-json-' + 'x'.repeat(60));
        }
        if (url === '/headers') {
            return json({ ok: true }, 200, { 'X-Request-Id': 'req-123', 'X-Version': 'v2' });
        }
        if (url === '/echo-auth') {
            return json({ authorization: req.headers['authorization'] || '' });
        }
        if (url === '/secure') {
            return json({ ok: true }, 200, {
                'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
                'Content-Security-Policy':   "default-src 'self'",
                'X-Frame-Options':           'DENY',
                'X-Content-Type-Options':    'nosniff'
            });
        }
        if (url === '/setcookie-weak') {
            return json({ ok: true }, 200, { 'Set-Cookie': 'sid=abc123' });
        }
        if (url === '/setcookie-strong') {
            return json({ ok: true }, 200, { 'Set-Cookie': 'sid=abc123; Secure; HttpOnly; SameSite=Strict' });
        }
        if (url === '/setcookie-named-flag') {
            // Cookie whose NAME is a flag but the Secure ATTRIBUTE is genuinely absent.
            return json({ ok: true }, 200, { 'Set-Cookie': 'Secure=1; HttpOnly' });
        }
        if (url === '/jwt-none' || url === '/jwt-ok' || url === '/jwt-expired') {
            const b64 = function (o) { return Buffer.from(JSON.stringify(o)).toString('base64url'); };
            const alg = url === '/jwt-none' ? 'none' : 'HS256';
            const exp = url === '/jwt-expired' ? 1 : 9999999999;
            const token = b64({ alg: alg, typ: 'JWT' }) + '.' + b64({ sub: 'x', exp: exp }) + '.' + (alg === 'none' ? '' : 'sig');
            return json({ token: token });
        }
        if (url === '/nostore') {
            return json({ ok: true }, 200, { 'Cache-Control': 'no-store' });
        }
        if (url === '/graphql-ok') {
            return json({ data: { user: { id: 1, name: 'Alice' } } });
        }
        if (url === '/graphql-errors') {
            // GraphQL returns HTTP 200 even with an errors[] array — the classic trap.
            return json({ data: null, errors: [{ message: 'User not found', path: ['user'] }] });
        }
        if (url === '/struct-same') {
            // Same SHAPE as the seeded baseline, different values + array length.
            return json({ id: 999, name: 'different', tags: ['p', 'q', 'r'] });
        }
        if (url === '/struct-changed') {
            // id type flipped (number → string) and a field added vs the baseline.
            return json({ id: '1', name: 'x', extra: true });
        }
        if (url === '/retry503-longwait') {
            // 503 with a Retry-After far beyond the cap → engine must stop retrying.
            return json({ error: 'unavailable' }, 503, { 'Retry-After': '3600' });
        }
        return json({ error: 'not found' }, 404);
    });
    return new Promise(function (resolve) {
        server.listen(0, '127.0.0.1', function () { resolve(server); });
    });
}

// ── Fixture collection (embeds the engine under test) ─────────────────────────

function methodScripts(preOverride, postOverride) {
    return [
        { listen: 'prerequest', script: { type: 'text/javascript', exec: [
            'const override = ' + JSON.stringify(preOverride, null, 2) + ';',
            'eval(pm.collectionVariables.get("hephaestus.v3.pre"));'
        ] } },
        { listen: 'test', script: { type: 'text/javascript', exec: [
            'const override = ' + JSON.stringify(postOverride, null, 2) + ';',
            'eval(pm.collectionVariables.get("hephaestus.v3.post"));'
        ] } }
    ];
}

function buildCollection(preSrc, postSrc, baseUrl) {
    const defaults = {
        baseUrl: baseUrl,
        defaultProtocol: 'http',
        auth: { enabled: false, type: 'none' },
        dateFormat: 'yyyy-MM-dd',
        expectedStatus: [200],
        contentType: 'json',
        snapshot: { enabled: false, storage: 'collection-vars', mode: 'non-strict', autoSaveMissing: true, checkPaths: [], ignorePaths: [] },
        schema: { enabled: false, definition: null },
        secrets: ['token', 'authorization'],
        envRequired: [],
        ci: true,
        logLevel: 'silent',
        softFail: false,
        randomData: {}
    };

    const items = [
        {
            name: 'obj-assertions',
            request: { method: 'GET', url: baseUrl + '/obj' },
            event: methodScripts({}, {
                expectedStatus: 200,
                keysToFind: [{ path: 'data.id' }, { path: 'data.name' }],
                assertions: {
                    'data.id':     { eq: 42, gt: 0 },
                    'data.name':   { eq: 'Alice' },
                    'data.status': { exists: true, eq: 'active' },
                    'count':       { gte: 2 }
                },
                varsToSave: { savedId: { path: 'data.id', name: 'savedId' } },
                keysToCount: { tags: { path: 'data.tags', expected: 2 } }
            })
        },
        {
            name: 'list-array-asserts',
            request: { method: 'GET', url: baseUrl + '/list' },
            event: methodScripts({}, {
                assertEach: { path: 'items', rules: { id: { gt: 0 }, kind: { exists: true } } },
                assertShape: { 'items': 'array', 'items.0.id': 'number', 'items.0.kind': 'string', 'items.0.price': 'number' },
                assertOrder: { path: 'items', by: 'id', direction: 'asc' },
                assertUnique: { path: 'items', by: 'id' }
            })
        },
        {
            name: 'xml-extract',
            request: { method: 'GET', url: baseUrl + '/xml' },
            event: methodScripts({}, {
                contentType: 'xml',
                keysToFind: [{ path: 'root.token' }],
                varsToSave: { xmlToken: { path: 'root.token', name: 'xmlToken' } }
            })
        },
        {
            name: 'headers-assert',
            request: { method: 'GET', url: baseUrl + '/headers' },
            event: methodScripts({}, {
                assertHeaders: [
                    { name: 'X-Request-Id' },
                    { name: 'X-Version', equals: 'v2' },
                    { name: 'X-Absent', absent: true }
                ]
            })
        },
        {
            name: 'auth-bearer',
            request: { method: 'GET', url: baseUrl + '/echo-auth' },
            event: methodScripts(
                { auth: { enabled: true, type: 'bearer', token: 'TESTTOKEN' } },
                { assertions: { 'authorization': { eq: 'Bearer TESTTOKEN' } } }
            )
        },
        {
            name: 'schema-validate',
            request: { method: 'GET', url: baseUrl + '/obj' },
            event: methodScripts({}, {
                schema: { enabled: true, definition: {
                    type: 'object',
                    properties: {
                        data: { type: 'object', properties: { id: { type: 'number' }, name: { type: 'string' } }, required: ['id', 'name'] },
                        count: { type: 'number' }
                    },
                    required: ['data']
                } }
            })
        },
        {
            name: 'snapshot-save',
            request: { method: 'GET', url: baseUrl + '/obj' },
            event: methodScripts({}, {
                snapshot: { enabled: true, mode: 'non-strict', autoSaveMissing: true }
            })
        },
        {
            name: 'security-audit',
            request: { method: 'GET', url: baseUrl + '/secure' },
            event: methodScripts({}, {
                securityAudit: { enabled: true }
            })
        },
        {
            name: 'snapshot-record',
            request: { method: 'GET', url: baseUrl + '/obj' },
            event: methodScripts({}, {
                snapshot: { enabled: true, mode: 'non-strict', record: true }
            })
        },
        {
            // Regression: malformed securityAudit lists (strings, not arrays) must
            // fall back to defaults, never crash the whole post-request pipeline.
            name: 'security-audit-malformed',
            request: { method: 'GET', url: baseUrl + '/secure' },
            event: methodScripts({}, {
                securityAudit: { enabled: true, requireHeaders: 'content-security-policy', forbidBodyPatterns: 'oops' }
            })
        },
        {
            // i18n: with locale 'en', translated modules emit English test names.
            name: 'locale-en',
            request: { method: 'GET', url: baseUrl + '/obj' },
            event: methodScripts({ locale: 'en' }, { locale: 'en', expectedStatus: 200 })
        },
        // ── i18n EN coverage: clones of rich fixtures with locale 'en' so the
        //    golden also locks English output across assertions/headers/schema/security. ──
        {
            name: 'obj-assertions-en',
            request: { method: 'GET', url: baseUrl + '/obj' },
            event: methodScripts({ locale: 'en' }, {
                locale: 'en',
                expectedStatus: 200,
                keysToFind: [{ path: 'data.id' }, { path: 'data.name' }],
                assertions: {
                    'data.id':     { eq: 42, gt: 0 },
                    'data.name':   { eq: 'Alice' },
                    'data.status': { exists: true, eq: 'active' },
                    'count':       { gte: 2 }
                },
                varsToSave: { savedIdEn: { path: 'data.id', name: 'savedIdEn' } },
                keysToCount: { tags: { path: 'data.tags', expected: 2 } }
            })
        },
        {
            name: 'list-array-asserts-en',
            request: { method: 'GET', url: baseUrl + '/list' },
            event: methodScripts({ locale: 'en' }, {
                locale: 'en',
                assertEach: { path: 'items', rules: { id: { gt: 0 }, kind: { exists: true } } },
                assertShape: { 'items': 'array', 'items.0.id': 'number', 'items.0.kind': 'string', 'items.0.price': 'number' },
                assertOrder: { path: 'items', by: 'id', direction: 'asc' },
                assertUnique: { path: 'items', by: 'id' }
            })
        },
        {
            name: 'headers-assert-en',
            request: { method: 'GET', url: baseUrl + '/headers' },
            event: methodScripts({ locale: 'en' }, {
                locale: 'en',
                assertHeaders: [
                    { name: 'X-Request-Id' },
                    { name: 'X-Version', equals: 'v2' },
                    { name: 'X-Absent', absent: true }
                ]
            })
        },
        {
            name: 'schema-validate-en',
            request: { method: 'GET', url: baseUrl + '/obj' },
            event: methodScripts({ locale: 'en' }, {
                locale: 'en',
                schema: { enabled: true, definition: {
                    type: 'object',
                    properties: {
                        data: { type: 'object', properties: { id: { type: 'number' }, name: { type: 'string' } }, required: ['id', 'name'] },
                        count: { type: 'number' }
                    },
                    required: ['data']
                } }
            })
        },
        {
            name: 'security-audit-en',
            request: { method: 'GET', url: baseUrl + '/secure' },
            event: methodScripts({ locale: 'en' }, {
                locale: 'en',
                securityAudit: { enabled: true }
            })
        },
        {
            // storage:'postman-api' is unavailable offline — it must warn once
            // (ctx._meta.errors → CI 'errors') and FALL BACK to collection-vars so
            // the snapshot still saves a baseline (savedTest), not silently no-op.
            name: 'snapshot-postman-api-fallback',
            request: { method: 'GET', url: baseUrl + '/obj' },
            event: methodScripts({}, {
                snapshot: { enabled: true, storage: 'postman-api', mode: 'non-strict', autoSaveMissing: true }
            })
        },
        // ── i18n EN error paths ──────────────────────────────────────────────
        //    The EN fixtures above all PASS, which means they only ever exercise
        //    the success half of each catalog entry. A missing or malformed English
        //    failure message is invisible until something actually fails, so these
        //    negative clones lock the English text of the failure messages too.
        {
            name: 'neg-status-en',
            request: { method: 'GET', url: baseUrl + '/obj' },
            event: methodScripts({ locale: 'en' }, { locale: 'en', expectedStatus: 599 })
        },
        {
            name: 'neg-contenttype-en',
            request: { method: 'GET', url: baseUrl + '/obj' },
            event: methodScripts({ locale: 'en' }, { locale: 'en', contentType: 'xml' })
        },
        {
            name: 'neg-empty-body-en',
            request: { method: 'GET', url: baseUrl + '/obj' },
            event: methodScripts({ locale: 'en' }, { locale: 'en', expectEmpty: true })
        },
        {
            name: 'neg-assertions-en',
            request: { method: 'GET', url: baseUrl + '/obj' },
            event: methodScripts({ locale: 'en' }, {
                locale: 'en',
                keysToFind: [{ path: 'data.absent' }],
                assertions: {
                    'data.id':      { eq: 7, lt: 0 },
                    'data.name':    { matches: '^Z' },
                    'data.missing': { exists: true },
                    'count':        { gte: 9999 }
                },
                keysToCount: { tags: { path: 'data.tags', expected: 99 } }
            })
        },
        {
            name: 'neg-shape-en',
            request: { method: 'GET', url: baseUrl + '/obj' },
            event: methodScripts({ locale: 'en' }, {
                locale: 'en',
                assertShape: { 'data': 'array', 'data.id': 'string', 'count': 'absent', 'nope': 'any' }
            })
        },
        {
            name: 'neg-list-asserts-en',
            request: { method: 'GET', url: baseUrl + '/list' },
            event: methodScripts({ locale: 'en' }, {
                locale: 'en',
                assertEach: { path: 'items', minCount: 99, rules: { id: { lt: 0 }, kind: { eq: 'nope' } } },
                assertOrder: { path: 'items', by: 'id', direction: 'desc' },
                assertUnique: { path: 'items', by: 'nope' }
            })
        },
        {
            name: 'neg-headers-en',
            request: { method: 'GET', url: baseUrl + '/headers' },
            event: methodScripts({ locale: 'en' }, {
                locale: 'en',
                assertHeaders: [
                    { name: 'X-Missing' },
                    { name: 'X-Version', equals: 'v99' },
                    { name: 'X-Request-Id', absent: true }
                ]
            })
        },
        {
            name: 'neg-schema-en',
            request: { method: 'GET', url: baseUrl + '/obj' },
            event: methodScripts({ locale: 'en' }, {
                locale: 'en',
                schema: { enabled: true, definition: {
                    type: 'object',
                    properties: { data: { type: 'string' }, missing: { type: 'number' } },
                    required: ['data', 'missing']
                } }
            })
        },
        {
            // maxResponseTime is a TOP-LEVEL key. There is no `metrics` block — an
            // override that nests it there is silently ignored, which is exactly the
            // kind of mistake a locked failure message makes visible.
            name: 'maxtime-ok-en',
            request: { method: 'GET', url: baseUrl + '/obj' },
            event: methodScripts({ locale: 'en' }, { locale: 'en', maxResponseTime: 60000 })
        },
        {
            name: 'neg-maxtime-en',
            request: { method: 'GET', url: baseUrl + '/slow' },
            event: methodScripts({ locale: 'en' }, { locale: 'en', maxResponseTime: 1 })
        },
        {
            name: 'neg-maxbytes-en',
            request: { method: 'GET', url: baseUrl + '/obj' },
            event: methodScripts({ locale: 'en' }, { locale: 'en', maxBytes: 1 })
        },
        {
            name: 'neg-strict-unknown-key-en',
            request: { method: 'GET', url: baseUrl + '/obj' },
            event: methodScripts({ locale: 'en' }, { locale: 'en', strictMode: true, snapshsot: { enabled: true } })
        },
        {
            // typo-guard: strictMode makes an unknown override key ('snapshsot') fail
            // the run. A NEGATIVE fixture — its failing assertion is EXPECTED (the
            // "neg-" prefix keeps it out of the harness's unexpected-failure count).
            name: 'neg-strict-unknown-key',
            request: { method: 'GET', url: baseUrl + '/obj' },
            event: methodScripts({}, { strictMode: true, snapshsot: { enabled: true } })
        },
        {
            // typo-guard MUST NOT fire for a known plugin config key (slackUrl) or for
            // a custom key allowlisted via extraKeys — even under strictMode. POSITIVE
            // fixture: every assertion passes, locking that valid plugin/custom configs
            // are never false-failed.
            name: 'strict-allowed-keys-ok',
            request: { method: 'GET', url: baseUrl + '/obj' },
            event: methodScripts({}, { strictMode: true, slackUrl: 'https://hooks.example', extraKeys: ['myCustom'], myCustom: 1 })
        },
        {
            // maxBytes: a generous response-size budget passes.
            name: 'maxbytes-ok',
            request: { method: 'GET', url: baseUrl + '/obj' },
            event: methodScripts({}, { maxBytes: 100000 })
        },
        {
            // maxBytes: a 1-byte budget is exceeded — NEGATIVE fixture (expected fail).
            name: 'neg-maxbytes-over',
            request: { method: 'GET', url: baseUrl + '/obj' },
            event: methodScripts({}, { maxBytes: 1 })
        },
        {
            // maxBytes must fire even when the body doesn't parse (binary/garbage) —
            // that's where a size guard matters most. NEGATIVE fixture (expected fail).
            name: 'neg-maxbytes-binary',
            request: { method: 'GET', url: baseUrl + '/binary' },
            event: methodScripts({}, { maxBytes: 1 })
        },
        // ── securityAudit v2 (each isolates one v2 check: empty require/forbid lists,
        //    CORS + body-leak off, so only the new check emits assertions) ──
        {
            name: 'secaudit-cookies-ok',
            request: { method: 'GET', url: baseUrl + '/setcookie-strong' },
            event: methodScripts({}, { securityAudit: { enabled: true, requireHeaders: [], forbidHeaders: [], forbidBodyPatterns: [], checkCors: false, cookieFlags: true } })
        },
        {
            name: 'neg-secaudit-cookie-weak',
            request: { method: 'GET', url: baseUrl + '/setcookie-weak' },
            event: methodScripts({}, { securityAudit: { enabled: true, requireHeaders: [], forbidHeaders: [], forbidBodyPatterns: [], checkCors: false, cookieFlags: true } })
        },
        {
            // Regression guard: cookie NAMED "Secure" without the Secure attribute must
            // still be flagged — flags are scanned only in the attribute segment.
            name: 'neg-secaudit-cookie-named-flag',
            request: { method: 'GET', url: baseUrl + '/setcookie-named-flag' },
            event: methodScripts({}, { securityAudit: { enabled: true, requireHeaders: [], forbidHeaders: [], forbidBodyPatterns: [], checkCors: false, cookieFlags: ['Secure'] } })
        },
        {
            name: 'secaudit-jwt-ok',
            request: { method: 'GET', url: baseUrl + '/jwt-ok' },
            event: methodScripts({}, { securityAudit: { enabled: true, requireHeaders: [], forbidHeaders: [], forbidBodyPatterns: [], checkCors: false, checkJwt: true } })
        },
        {
            name: 'neg-secaudit-jwt-none',
            request: { method: 'GET', url: baseUrl + '/jwt-none' },
            event: methodScripts({}, { securityAudit: { enabled: true, requireHeaders: [], forbidHeaders: [], forbidBodyPatterns: [], checkCors: false, checkJwt: true } })
        },
        {
            name: 'neg-secaudit-jwt-expired',
            request: { method: 'GET', url: baseUrl + '/jwt-expired' },
            event: methodScripts({}, { securityAudit: { enabled: true, requireHeaders: [], forbidHeaders: [], forbidBodyPatterns: [], checkCors: false, checkJwt: true } })
        },
        {
            name: 'secaudit-nostore-ok',
            request: { method: 'GET', url: baseUrl + '/nostore' },
            event: methodScripts({}, { securityAudit: { enabled: true, requireHeaders: [], forbidHeaders: [], forbidBodyPatterns: [], checkCors: false, requireNoStore: true } })
        },
        {
            name: 'neg-secaudit-cacheable',
            request: { method: 'GET', url: baseUrl + '/obj' },
            event: methodScripts({}, { securityAudit: { enabled: true, requireHeaders: [], forbidHeaders: [], forbidBodyPatterns: [], checkCors: false, requireNoStore: true } })
        },
        {
            // GraphQL happy path: no errors + data shape checks all pass.
            name: 'graphql-ok',
            request: { method: 'GET', url: baseUrl + '/graphql-ok' },
            event: methodScripts({}, { graphql: { noErrors: true, dataShape: { 'user.id': 'number', 'user.name': 'string' } } })
        },
        {
            // 200 with an errors[] array → noErrors must FAIL (the trap this catches).
            name: 'neg-graphql-errors',
            request: { method: 'GET', url: baseUrl + '/graphql-errors' },
            event: methodScripts({}, { graphql: true })
        },
        {
            // Negative testing: we EXPECT one error containing "not found" → both pass.
            name: 'graphql-expect-errors',
            request: { method: 'GET', url: baseUrl + '/graphql-errors' },
            event: methodScripts({}, { graphql: { errorCount: 1, errorContains: 'not found' } })
        },
        {
            // retryOnStatus + respectRetryAfter: server asks to wait 3600s, far above the
            // 10s cap → engine stops retrying (no setNextRequest, single pass) and fails
            // with a clear message. expectedStatus:[503] isolates the Retry-After failure.
            name: 'neg-retryafter-exceeds-cap',
            request: { method: 'GET', url: baseUrl + '/retry503-longwait' },
            event: methodScripts({}, { expectedStatus: [503], retryOnStatus: { statuses: [503], maxRetries: 3, respectRetryAfter: true } })
        },
        {
            // Structural snapshot: same shape as the seeded baseline (values + array
            // length differ) → MATCH. Name matches the seeded key EngineTest::structural-match.
            name: 'structural-match',
            request: { method: 'GET', url: baseUrl + '/struct-same' },
            event: methodScripts({}, { snapshot: { enabled: true, mode: 'structural', autoSaveMissing: false } })
        },
        {
            // Structural snapshot: id type flipped + a field added vs the seeded baseline
            // → structural DIFF (expected fail). Name matches EngineTest::neg-structural-changed.
            name: 'neg-structural-changed',
            request: { method: 'GET', url: baseUrl + '/struct-changed' },
            event: methodScripts({}, { snapshot: { enabled: true, mode: 'structural', autoSaveMissing: false } })
        }
    ];

    return {
        info: { name: 'Hephaestus Engine Test', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
        item: items,
        variable: [
            { key: 'hephaestus.v3.pre',  value: preSrc },
            { key: 'hephaestus.v3.post', value: postSrc },
            { key: 'hephaestus.defaults', value: JSON.stringify(defaults) },
            { key: 'hephaestus.collectionName', value: 'EngineTest' },
            // Pre-seeded structural baselines so the mode:"structural" COMPARE path is
            // exercised (the empty store below only ever hits the SAVE path otherwise).
            { key: 'hephaestus.snapshots', value: JSON.stringify({
                'EngineTest::structural-match::200::json': {
                    savedAt: '2020-01-01T00:00:00.000Z', statusCode: 200, format: 'json',
                    mode: 'structural', checkPaths: [], data: { id: 1, name: 'x', tags: ['a'] }
                },
                'EngineTest::neg-structural-changed::200::json': {
                    savedAt: '2020-01-01T00:00:00.000Z', statusCode: 200, format: 'json',
                    mode: 'structural', checkPaths: [], data: { id: 1, name: 'x' }
                }
            }) },
            // Plugin coverage: verifies the eval'd plugin can reach ctx AND _override
            // (the closure contract that a module split must preserve).
            { key: 'hephaestus.plugins', value: JSON.stringify([{ name: 'test-plugin', post: 'hephaestus.plugin.test' }]) },
            { key: 'hephaestus.plugin.test', value:
                "pm.test('🔌 [test-plugin] ctx reachable', function(){ pm.expect(ctx.response.code).to.eql(200); });" +
                "pm.test('🔌 [test-plugin] _override reachable', function(){ pm.expect(_override).to.be.an('object'); });"
            }
        ]
    };
}

// ── Run one engine → behavior fingerprint ─────────────────────────────────────

function normalizeCi(obj) {
    // Strip volatile fields so the fingerprint is stable across runs.
    const clone = Object.assign({}, obj);
    delete clone.time;
    delete clone.size;
    delete clone.v;
    return clone;
}

function runEngine(preSrc, postSrc) {
    return startMockServer().then(function (server) {
        const port    = server.address().port;
        const baseUrl = 'http://127.0.0.1:' + port;
        const collection = buildCollection(preSrc, postSrc, baseUrl);

        const ciByRequest = {};   // requestName -> normalized CI object
        const tests       = [];   // { item, name, ok }
        let currentItem   = '';

        return new Promise(function (resolve, reject) {
            newman.run({ collection: collection, reporters: [] })
                .on('beforeItem', function (err, ev) { if (!err && ev.item) currentItem = ev.item.name; })
                .on('assertion', function (err, ev) {
                    // Timing assertions embed the measured duration in their name, which
                    // would make the fingerprint flap run to run. No existing golden entry
                    // contains a millisecond value, so this normalization is additive.
                    const name = String(ev.assertion).replace(/\b\d+ms\b/g, '<ms>');
                    tests.push({ item: currentItem, name: name, ok: !err });
                })
                .on('console', function (err, ev) {
                    if (err || !ev.messages) return;
                    ev.messages.forEach(function (m) {
                        const s = String(m);
                        const i = s.indexOf('[HEPHAESTUS_CI]');
                        if (i === -1) return;
                        try {
                            const parsed = JSON.parse(s.slice(i + '[HEPHAESTUS_CI]'.length).trim());
                            ciByRequest[parsed.request || currentItem] = normalizeCi(parsed);
                        } catch (e) { /* ignore non-JSON */ }
                    });
                })
                .on('done', function (err) {
                    server.close();
                    if (err) return reject(err);
                    // Deterministic ordering.
                    tests.sort(function (a, b) {
                        return (a.item + '¦' + a.name).localeCompare(b.item + '¦' + b.name);
                    });
                    resolve({
                        tests: tests,
                        ci: Object.keys(ciByRequest).sort().reduce(function (acc, k) { acc[k] = ciByRequest[k]; return acc; }, {})
                    });
                });
        });
    });
}

// ── Main ──────────────────────────────────────────────────────────────────────

const UPDATE = process.argv.includes('--update-golden');
const PRINT  = process.argv.includes('--print');

// Engine sources default to the committed engine files; override via env to
// test a fresh esbuild bundle against the golden baseline before writing it.
const preSrc  = fs.readFileSync(process.env.HEPH_PRE  || path.join(ROOT, 'engine/pre-request.js'),  'utf8');
const postSrc = fs.readFileSync(process.env.HEPH_POST || path.join(ROOT, 'engine/post-request.js'), 'utf8');

runEngine(preSrc, postSrc).then(function (fingerprint) {
    const json = JSON.stringify(fingerprint, null, 2) + '\n';

    const total  = fingerprint.tests.length;
    const failed = fingerprint.tests.filter(function (t) { return !t.ok; });
    // Fixtures named "neg-…" are negative tests: their failing assertions are
    // EXPECTED (locked in the golden), so they don't count as unexpected failures.
    const unexpected = failed.filter(function (t) { return !/^neg-/.test(t.item); });
    const expected   = failed.filter(function (t) { return /^neg-/.test(t.item); });

    if (PRINT) { process.stdout.write(json); }

    console.error('\n🔬 Engine harness: ' + total + ' assertions across ' +
                Object.keys(fingerprint.ci).length + ' requests; ' + unexpected.length + ' unexpected failure(s)' +
                (expected.length ? ' (' + expected.length + ' expected)' : ''));
    if (unexpected.length) {
        unexpected.forEach(function (t) { console.error('   ❌ [' + t.item + '] ' + t.name); });
    }

    if (UPDATE) {
        fs.mkdirSync(path.dirname(GOLDEN_PATH), { recursive: true });
        fs.writeFileSync(GOLDEN_PATH, json);
        console.error('✅ Golden baseline written: scripts/fixtures/engine-golden.json (' + total + ' assertions)');
        process.exit(0);
    }

    let golden;
    try {
        golden = fs.readFileSync(GOLDEN_PATH, 'utf8');
    } catch (e) {
        console.error('❌ No golden baseline. Run: node scripts/test-engine.js --update-golden');
        process.exit(1);
    }

    if (json === golden) {
        console.error('✅ Engine behavior matches golden baseline — no drift');
        process.exit(0);
    }

    console.error('❌ Engine behavior DIVERGED from golden baseline.');
    // Minimal diff: which test statuses changed.
    try {
        const g = JSON.parse(golden);
        const gm = {}; g.tests.forEach(function (t) { gm[t.item + '¦' + t.name] = t.ok; });
        const nm = {}; fingerprint.tests.forEach(function (t) { nm[t.item + '¦' + t.name] = t.ok; });
        Object.keys(gm).forEach(function (k) {
            if (!(k in nm))          console.error('   − removed: ' + k + ' (was ' + (gm[k] ? 'pass' : 'fail') + ')');
            else if (nm[k] !== gm[k]) console.error('   ~ changed: ' + k + ' ' + (gm[k] ? 'pass' : 'fail') + ' → ' + (nm[k] ? 'pass' : 'fail'));
        });
        Object.keys(nm).forEach(function (k) { if (!(k in gm)) console.error('   + added: ' + k + ' (' + (nm[k] ? 'pass' : 'fail') + ')'); });
        if (JSON.stringify(g.ci) !== JSON.stringify(fingerprint.ci)) {
            console.error('   ~ [HEPHAESTUS_CI] state changed (see --print)');
        }
    } catch (e) { /* ignore */ }
    process.exit(1);
}).catch(function (err) {
    console.error('❌ Engine harness error: ' + (err && err.message ? err.message : err));
    process.exit(1);
});
