#!/usr/bin/env node
/**
 * Hephaestus — Tool Suite Tests  v4.0.0
 *
 * Validates all tooling scripts and project consistency.
 * Run: npm test
 *
 * Tests:
 *  1. defaults.json — valid JSON, contains required keys
 *  2. Version consistency — engines / package.json / CHANGELOG
 *  3. engine syntax — node --check both engines
 *  4. build.js — no configMerge drift between engines
 *  5. migrate.js — runs against template collection
 *  6. ci-to-junit.js — converts minimal Newman fixture
 *  7. docs.js — generates Markdown from collection (+ --json flag)
 *  8. summary.js — generates Markdown summary from Newman JSON
 *  9. generate-report.js — generates HTML from minimal Newman fixture
 * 10. ci-to-junit output — valid XML structure
 * 11. generate-report output — contains key HTML elements
 */

'use strict';

const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TMP  = path.join(ROOT, '.test-tmp');

// ─── Minimal fixtures ────────────────────────────────────────────────────────

const NEWMAN_FIXTURE = {
    collection: { info: { name: 'Test Collection' } },
    environment: { name: 'test' },
    run: {
        stats: {
            requests:   { total: 2, pending: 0, failed: 1 },
            assertions: { total: 4, pending: 0, failed: 1 }
        },
        timings: { responseAverage: 123, started: Date.now() - 5000, completed: Date.now() },
        executions: [
            {
                item: { name: 'GET User', request: { method: 'GET' } },
                response: { code: 200, responseTime: 100, responseSize: 512 },
                assertions: [
                    { assertion: 'Status is 200', skipped: false, error: null },
                    { assertion: 'Has user id',   skipped: false, error: null },
                ]
            },
            {
                item: { name: 'POST Login', request: { method: 'POST' } },
                response: { code: 401, responseTime: 45, responseSize: 64 },
                assertions: [
                    { assertion: 'Status is 200', skipped: false, error: { message: 'expected 401 to equal 200' } },
                    { assertion: 'Has token',     skipped: false, error: null },
                ]
            }
        ],
        failures: []
    }
};

const COLLECTION_FIXTURE = {
    info: { name: 'Fixture Collection', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    item: [
        {
            name: 'Auth',
            item: [
                {
                    name: 'GET Token',
                    request: { method: 'GET', url: { raw: 'https://api.example.com/token' } },
                    event: [
                        { listen: 'prerequest', script: { exec: ['eval(pm.collectionVariables.get("hephaestus.v3.pre"))'], type: 'text/javascript' } },
                        { listen: 'test',       script: { exec: ['eval(pm.collectionVariables.get("hephaestus.v3.post"))'], type: 'text/javascript' } }
                    ]
                },
                {
                    name: 'POST Login',
                    request: { method: 'POST', url: { raw: 'https://api.example.com/login' } },
                    event: [
                        { listen: 'prerequest', script: { exec: ['// plain prerequest'], type: 'text/javascript' } },
                        { listen: 'test',       script: { exec: ['pm.test("status", () => pm.expect(pm.response.code).to.equal(200))'], type: 'text/javascript' } }
                    ]
                }
            ]
        },
        {
            name: 'No Scripts Request',
            request: { method: 'GET', url: { raw: 'https://api.example.com/ping' } }
        }
    ]
};

// ─── Test runner ─────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
const failures = [];

function test(name, fn) {
    process.stdout.write('  ' + name + ' ... ');
    try {
        fn();
        console.log('✅');
        passed++;
    } catch(e) {
        console.log('❌  ' + e.message);
        failures.push({ name, error: e.message });
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

function assertContains(str, substr, label) {
    if (!str.includes(substr)) throw new Error((label || '') + ': expected to contain "' + substr + '"');
}

function run(cmd, opts) {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe','pipe','pipe'], ...opts }).trim();
}

// ─── Setup ────────────────────────────────────────────────────────────────────

if (!fs.existsSync(TMP)) fs.mkdirSync(TMP);

const newmanFixtureFile  = path.join(TMP, 'newman.json');
const collectionFixtureFile = path.join(TMP, 'collection.json');
fs.writeFileSync(newmanFixtureFile, JSON.stringify(NEWMAN_FIXTURE));
fs.writeFileSync(collectionFixtureFile, JSON.stringify(COLLECTION_FIXTURE));

// Quoted for safe interpolation into run()'s shell command strings — a Node install
// path may contain spaces (e.g. C:\Program Files\nodejs\node.exe on Windows). Plain
// double-quotes (not JSON.stringify, which would escape backslashes and break cmd.exe).
const NODE = '"' + process.execPath + '"';

console.log('\n🔬 Hephaestus Tool Suite Tests\n');

// ─── 1. defaults.json ─────────────────────────────────────────────────────────

console.log('① defaults.json');

test('valid JSON', function() {
    const defaults = JSON.parse(fs.readFileSync(path.join(ROOT, 'setup/defaults.json'), 'utf8'));
    assert(typeof defaults === 'object', 'should be object');
});

test('contains required keys', function() {
    const defaults = JSON.parse(fs.readFileSync(path.join(ROOT, 'setup/defaults.json'), 'utf8'));
    ['auth', 'snapshot', 'schema', 'secrets', 'ci', 'envRequired'].forEach(function(k) {
        assert(k in defaults, 'missing key: ' + k);
    });
});

test('envRequired is array', function() {
    const defaults = JSON.parse(fs.readFileSync(path.join(ROOT, 'setup/defaults.json'), 'utf8'));
    assert(Array.isArray(defaults.envRequired), 'envRequired should be array');
});

// ─── 2. Version consistency ───────────────────────────────────────────────────

console.log('\n② Version consistency');

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

test('package.json version matches engine pre-request VERSION', function() {
    const pre = fs.readFileSync(path.join(ROOT, 'engine/pre-request.js'), 'utf8');
    const match = pre.match(/(?:const|let|var)\s+VERSION\s*=\s*["']([^"']+)["']/);
    assert(match, 'VERSION not found in pre-request.js');
    assert(match[1] === pkg.version, 'pre-request VERSION ' + match[1] + ' !== package.json ' + pkg.version);
});

test('package.json version matches engine post-request VERSION', function() {
    const post = fs.readFileSync(path.join(ROOT, 'engine/post-request.js'), 'utf8');
    const match = post.match(/(?:const|let|var)\s+VERSION\s*=\s*["']([^"']+)["']/);
    assert(match, 'VERSION not found in post-request.js');
    assert(match[1] === pkg.version, 'post-request VERSION ' + match[1] + ' !== package.json ' + pkg.version);
});

test('CHANGELOG.md contains current version', function() {
    const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
    assert(changelog.includes('## [' + pkg.version + ']'), 'CHANGELOG missing section for v' + pkg.version);
});

// ─── 3. Engine syntax ────────────────────────────────────────────────────────

console.log('\n③ Engine syntax');

test('pre-request.js — valid syntax', function() {
    run(NODE + ' --check "' + path.join(ROOT, 'engine/pre-request.js') + '"');
});

test('post-request.js — valid syntax', function() {
    run(NODE + ' --check "' + path.join(ROOT, 'engine/post-request.js') + '"');
});

// ─── 4. build.js ─────────────────────────────────────────────────────────────

console.log('\n④ build.js');

test('exits 0 (no configMerge drift, version consistent)', function() {
    run(NODE + ' "' + path.join(ROOT, 'scripts/build.js') + '"');
});

// ─── 5. migrate.js ───────────────────────────────────────────────────────────

console.log('\n⑤ migrate.js');

test('runs without error on fixture collection', function() {
    const out = run(NODE + ' "' + path.join(ROOT, 'scripts/migrate.js') + '" "' + collectionFixtureFile + '"');
    assert(out.length > 0, 'expected non-empty output');
});

test('--json flag produces valid JSON', function() {
    const out = run(NODE + ' "' + path.join(ROOT, 'scripts/migrate.js') + '" "' + collectionFixtureFile + '" --json');
    const arr = JSON.parse(out);
    assert(Array.isArray(arr), 'should be array');
    assert(arr.length > 0, 'should have entries');
});

test('correctly classifies migrated vs needs-migration', function() {
    const out = run(NODE + ' "' + path.join(ROOT, 'scripts/migrate.js') + '" "' + collectionFixtureFile + '" --json');
    const arr = JSON.parse(out);
    const migrated = arr.find(function(r) { return r.name === 'GET Token'; });
    assert(migrated, 'GET Token not found in output');
    assert(migrated.status === 'migrated', 'GET Token should be "migrated", got "' + migrated.status + '"');
    const needs = arr.find(function(r) { return r.name === 'POST Login'; });
    assert(needs, 'POST Login not found in output');
    assert(needs.status === 'needs-migration', 'POST Login should be "needs-migration", got "' + needs.status + '"');
});

// ─── 6. ci-to-junit.js ───────────────────────────────────────────────────────

console.log('\n⑥ ci-to-junit.js');

const junitOut = path.join(TMP, 'junit.xml');

test('generates JUnit XML file', function() {
    run(NODE + ' "' + path.join(ROOT, 'scripts/ci-to-junit.js') + '" "' + newmanFixtureFile + '" "' + junitOut + '"');
    assert(fs.existsSync(junitOut), 'junit.xml not created');
});

test('output is valid XML structure', function() {
    const xml = fs.readFileSync(junitOut, 'utf8');
    assertContains(xml, '<?xml version="1.0"', 'missing XML declaration');
    assertContains(xml, '<testsuites', 'missing testsuites element');
    assertContains(xml, '<testsuite', 'missing testsuite element');
    assertContains(xml, 'GET User', 'missing request name');
});

test('failure shows in XML', function() {
    const xml = fs.readFileSync(junitOut, 'utf8');
    assertContains(xml, '<failure', 'missing failure element for POST Login');
});

// ─── 7. docs.js ──────────────────────────────────────────────────────────────

console.log('\n⑦ docs.js');

const docsOut = path.join(TMP, 'api-docs.md');

test('generates Markdown from collection', function() {
    run(NODE + ' "' + path.join(ROOT, 'scripts/docs.js') + '" "' + collectionFixtureFile + '" -o "' + docsOut + '"');
    assert(fs.existsSync(docsOut), 'api-docs.md not created');
});

test('Markdown contains request names', function() {
    const md = fs.readFileSync(docsOut, 'utf8');
    assertContains(md, 'GET Token',  'missing GET Token');
    assertContains(md, 'POST Login', 'missing POST Login');
});

test('docs without -o writes to stdout and leaves the collection untouched', function() {
    // REGRESSION (data loss): `args[args.indexOf('-o') + 1]` resolves to args[0] —
    // the input collection — when -o is absent, and the writer then overwrote the
    // user's collection with the generated Markdown. Every previous docs test
    // passed -o, which is exactly why this shipped.
    const victim = path.join(TMP, 'victim-collection.json');
    fs.copyFileSync(collectionFixtureFile, victim);
    const before = fs.readFileSync(victim, 'utf8');
    const out = run(NODE + ' "' + path.join(ROOT, 'scripts/docs.js') + '" "' + victim + '"');
    assertContains(out, '# ', 'Markdown should be printed to stdout');
    assert(fs.readFileSync(victim, 'utf8') === before, 'the input collection was MODIFIED');
    JSON.parse(fs.readFileSync(victim, 'utf8')); // throws if no longer a collection
});

test('docs refuses to write over the input collection', function() {
    const victim = path.join(TMP, 'victim2-collection.json');
    fs.copyFileSync(collectionFixtureFile, victim);
    const before = fs.readFileSync(victim, 'utf8');
    let code = 0;
    try { run(NODE + ' "' + path.join(ROOT, 'scripts/docs.js') + '" "' + victim + '" -o "' + victim + '"'); }
    catch (e) { code = e.status || 1; }
    assert(code === 1, 'writing docs over the input must exit 1, got ' + code);
    assert(fs.readFileSync(victim, 'utf8') === before, 'the collection was modified anyway');
});

test('watch without -c reports usage instead of watching a flag as a file', function() {
    let code = 0, out = '';
    try { out = run(NODE + ' "' + path.join(ROOT, 'scripts/watch.js') + '" --delay 500'); }
    catch (e) { code = e.status || 1; out = String(e.stdout || '') + String(e.stderr || ''); }
    assert(code === 1, 'missing -c must exit 1, got ' + code);
    assertContains(out, 'Usage', 'should print usage');
});

test('Markdown contains method info', function() {
    const md = fs.readFileSync(docsOut, 'utf8');
    assertContains(md, 'GET', 'missing GET method');
    assertContains(md, 'POST', 'missing POST method');
});

test('--json flag produces valid JSON array', function() {
    const out = run(NODE + ' "' + path.join(ROOT, 'scripts/docs.js') + '" "' + collectionFixtureFile + '" --json');
    const arr = JSON.parse(out);
    assert(Array.isArray(arr), 'should be array');
    const names = arr.map(function(r) { return r.name; });
    assert(names.includes('GET Token'), 'GET Token not found');
    assert(names.includes('POST Login'), 'POST Login not found');
});

// ─── 8. summary.js ───────────────────────────────────────────────────────────

console.log('\n⑧ summary.js');

const summaryMdOut = path.join(TMP, 'summary.md');

test('--md flag generates Markdown summary', function() {
    // The fixture has a failing assertion, so --md now correctly exits 1 (the
    // markdown is still written before exit) — tolerate the non-zero exit here.
    try {
        run(NODE + ' "' + path.join(ROOT, 'scripts/summary.js') + '" "' + newmanFixtureFile + '" --md > "' + summaryMdOut + '"', { shell: true });
    } catch (e) { /* expected: exit 1 due to fixture failures */ }
    assert(fs.existsSync(summaryMdOut), 'summary.md not created');
});

test('summary Markdown contains collection name', function() {
    const md = fs.readFileSync(summaryMdOut, 'utf8');
    assertContains(md, 'Test Collection', 'missing collection name');
});

test('summary Markdown contains Folders section', function() {
    const md = fs.readFileSync(summaryMdOut, 'utf8');
    assertContains(md, '## Folders', 'missing Folders section');
});

test('summary Markdown includes Response Times percentiles (p95)', function() {
    const md = fs.readFileSync(summaryMdOut, 'utf8');
    assertContains(md, '## Response Times', 'missing Response Times section');
    assertContains(md, 'p95', 'missing p95 percentile');
});

const slaFixtureFile = path.join(TMP, 'sla-pass.json');
fs.writeFileSync(slaFixtureFile, JSON.stringify({
    collection: { info: { name: 'Perf' } },
    run: {
        stats: { requests: { total: 1, failed: 0 }, assertions: { total: 1, failed: 0 } },
        timings: { started: 0, completed: 300 },
        executions: [{ item: { name: 'GET Slow', request: { method: 'GET' } }, response: { code: 200, responseTime: 300, responseSize: 128 }, assertions: [{ assertion: 'ok', skipped: false, error: null }] }],
        failures: []
    }
}));

test('summary --sla gates on p95 breach (exit 1)', function() {
    let code = 0;
    try { run(NODE + ' "' + path.join(ROOT, 'scripts/summary.js') + '" "' + slaFixtureFile + '" --sla=100 --no-color'); }
    catch(e) { code = e.status || 1; }
    assert(code === 1, 'SLA breach (p95 300 > 100) should exit 1, got ' + code);
});

test('summary --sla passes when p95 under threshold (exit 0)', function() {
    const out = run(NODE + ' "' + path.join(ROOT, 'scripts/summary.js') + '" "' + slaFixtureFile + '" --sla=500 --no-color');
    assertContains(out, '✅', 'expected all-pass with SLA ok');
});

// ─── 9. compare.js ───────────────────────────────────────────────────────────

console.log('\n⑨ compare.js');

const newman2Fixture = {
    collection: { info: { name: 'Test Collection v2' } },
    environment: { name: 'test' },
    run: {
        stats: {
            requests:   { total: 2, pending: 0, failed: 0 },
            assertions: { total: 4, pending: 0, failed: 0 }
        },
        timings: { responseAverage: 200, started: Date.now() - 6000, completed: Date.now() },
        executions: [
            {
                item: { name: 'GET User', request: { method: 'GET' } },
                response: { code: 200, responseTime: 300, responseSize: 512 },
                assertions: [
                    { assertion: 'Status is 200', skipped: false, error: null },
                    { assertion: 'Has user id',   skipped: false, error: null },
                ]
            },
            {
                item: { name: 'POST Login', request: { method: 'POST' } },
                response: { code: 200, responseTime: 45, responseSize: 64 },
                assertions: [
                    { assertion: 'Status is 200', skipped: false, error: null },
                    { assertion: 'Has token',     skipped: false, error: null },
                ]
            }
        ],
        failures: []
    }
};

const newman2File = path.join(TMP, 'newman2.json');
fs.writeFileSync(newman2File, JSON.stringify(newman2Fixture));

const compareOut = path.join(TMP, 'compare.md');

test('--md compares two runs and produces Markdown', function() {
    // compare.js exits 1 when regressions found — that's correct; we catch and check output
    try {
        run(NODE + ' "' + path.join(ROOT, 'scripts/compare.js') + '" "' + newmanFixtureFile + '" "' + newman2File + '" --md > "' + compareOut + '"', { shell: true });
    } catch(e) { /* exit 1 is expected when regressions detected */ }
    assert(fs.existsSync(compareOut), 'compare.md not created');
});

test('compare Markdown has verdict section', function() {
    const md = fs.readFileSync(compareOut, 'utf8');
    assertContains(md, '## Verdict', 'missing Verdict');
});

test('compare detects resolved failures (POST Login fixed in v2)', function() {
    const md = fs.readFileSync(compareOut, 'utf8');
    assertContains(md, 'Resolved', 'missing Resolved section');
});

test('compare detects performance regression (GET User: 100ms → 300ms)', function() {
    const md = fs.readFileSync(compareOut, 'utf8');
    assertContains(md, 'GET User', 'GET User not mentioned');
});

test('compare exits 0 when no failures (same good run twice)', function() {
    run(NODE + ' "' + path.join(ROOT, 'scripts/compare.js') + '" "' + newman2File + '" "' + newman2File + '" --md', { shell: true });
});

// Regression: two requests sharing the same name must NOT collide. Here the
// FIRST "GET Item" goes fail→pass (a resolved failure) while the second stays
// green. A name-keyed map (last-wins) would keep only the 2nd occurrence in both
// runs and miss the resolved failure entirely; the composite key catches it.
const dupName = function(code, err) {
    return { item: { name: 'GET Item', request: { method: 'GET' } },
             response: { code: code, responseTime: 50, responseSize: 64 },
             assertions: [ { assertion: 'Status is 200', skipped: false, error: err } ] };
};
const dupBeforeFile = path.join(TMP, 'dup-before.json');
const dupAfterFile  = path.join(TMP, 'dup-after.json');
const dupStats = { requests: { total: 2, pending: 0, failed: 0 }, assertions: { total: 2, pending: 0, failed: 0 } };
fs.writeFileSync(dupBeforeFile, JSON.stringify({ collection:{info:{name:'C'}}, environment:{name:'e'},
    run: { stats: dupStats, timings: { started: 0, completed: 1 },
           executions: [ dupName(500, { message: 'expected 500 to equal 200' }), dupName(200, null) ], failures: [] } }));
fs.writeFileSync(dupAfterFile, JSON.stringify({ collection:{info:{name:'C'}}, environment:{name:'e'},
    run: { stats: dupStats, timings: { started: 0, completed: 1 },
           executions: [ dupName(200, null), dupName(200, null) ], failures: [] } }));

test('compare disambiguates same-named requests (composite key, not last-wins)', function() {
    const dupOut = path.join(TMP, 'dup-compare.md');
    try {
        run(NODE + ' "' + path.join(ROOT, 'scripts/compare.js') + '" "' + dupBeforeFile + '" "' + dupAfterFile + '" --md > "' + dupOut + '"', { shell: true });
    } catch(e) { /* resolved-only diff exits 0, but guard anyway */ }
    const md = fs.readFileSync(dupOut, 'utf8');
    assertContains(md, 'Resolved', 'resolved failure on the 1st "GET Item" was collapsed by name collision');
});

// ─── 9b. engine shared/mask.js (secret redaction) ─────────────────────────────
// The golden harness runs logLevel:'silent', so masking is NEVER exercised there
// (a green golden says nothing about redaction). This locks the security-critical
// predicate directly: substring match is the fail-safe default — under-masking a
// real secret (leak) is the dangerous direction, over-masking a log field is not.

console.log('\n⑨ᵇ engine shared/mask.js');

const maskProbe = path.join(TMP, 'mask-probe.mjs');
fs.writeFileSync(maskProbe, [
    // A bare absolute path is not a valid ESM specifier on Windows (needs a file:// URL).
    "import { isSensitive } from " + JSON.stringify(require('url').pathToFileURL(path.join(ROOT, 'engine/src/shared/mask.js')).href) + ";",
    "const S = ['token','password','pass','secret','key','authorization','session'];",
    // MUST mask — real secret field names, incl. concatenated-lowercase (regression guard)
    "const must = ['password','passwd','passphrase','passcode','passkey','apikey','apiKey','api_key','x-api-key','privatekey','publickey','sshkey','masterkey','dbpass','userpass','sessionToken','authorization','secretValue','user_pass'];",
    // MUST NOT mask — no configured secret word appears as a substring
    "const clean = ['email','username','userId','width','video','count','status'];",
    "for (const k of must)  if (!isSensitive(k, S)) { console.error('LEAK: ' + k); process.exit(2); }",
    "for (const k of clean) if (isSensitive(k, S))  { console.error('over-mask: ' + k); process.exit(3); }",
    // empty / missing secrets => never sensitive
    "if (isSensitive('password', [])) process.exit(4);",
    "if (isSensitive('password', null)) process.exit(5);",
    "console.log('ok');"
].join('\n'));

test('isSensitive masks all real secret fields incl. concatenated-lowercase (no leak)', function() {
    const out = run(NODE + ' ' + JSON.stringify(maskProbe));
    assertContains(out, 'ok', 'mask probe did not pass');
});

// ─── 9c. engine shared/retry-after.js (Retry-After parsing) ───────────────────
// The golden harness can't drive a setNextRequest retry loop, so the parse — the
// security/correctness-critical part of the Retry-After feature — is locked here.
// nowMs is injected so the HTTP-date branch is deterministic.

console.log('\n⑨ᶜ engine shared/retry-after.js');

const raProbe = path.join(TMP, 'retry-after-probe.mjs');
fs.writeFileSync(raProbe, [
    // file:// URL so the import is a valid ESM specifier on Windows too.
    "import { parseRetryAfterMs as p } from " + JSON.stringify(require('url').pathToFileURL(path.join(ROOT, 'engine/src/shared/retry-after.js')).href) + ";",
    "const NOW = 1000000000000;", // fixed reference instant
    "function eq(a, b, label) { if (a !== b) { console.error('FAIL ' + label + ': got ' + a + ', want ' + b); process.exit(2); } }",
    // delta-seconds
    "eq(p('120', NOW), 120000, 'delta 120s');",
    "eq(p('0', NOW), 0, 'delta 0s (retry now)');",
    "eq(p('3600', NOW), 3600000, 'delta 3600s');",
    "eq(p('  30  ', NOW), 30000, 'delta trimmed');",
    // HTTP-date — future, past, exact-now
    "eq(p(new Date(NOW + 5000).toUTCString(), NOW), 5000, 'http-date +5s');",
    "eq(p(new Date(NOW - 5000).toUTCString(), NOW), 0, 'http-date in the past => 0');",
    "eq(p(new Date(NOW).toUTCString(), NOW), 0, 'http-date == now => 0 (sub-second floors)');",
    // absent / empty / unparseable => null (caller decides)
    "eq(p(null, NOW), null, 'null header');",
    "eq(p(undefined, NOW), null, 'undefined header');",
    "eq(p('', NOW), null, 'empty header');",
    "eq(p('   ', NOW), null, 'whitespace header');",
    "eq(p('later', NOW), null, 'unparseable word');",
    "eq(p('-5', NOW), null, 'negative not a delta, not a date');",
    "eq(p('12.5', NOW), null, 'fractional not an integer delta');",
    "console.log('ok');"
].join('\n'));

test('parseRetryAfterMs handles delta-seconds, HTTP-date (future/past) and invalid input', function() {
    const out = run(NODE + ' ' + JSON.stringify(raProbe));
    assertContains(out, 'ok', 'retry-after probe did not pass');
});

// ─── 9d. engine shared/structure.js (structural snapshot diff) ────────────────
// The golden harness only drives a couple of seeded structural compares, so the
// diff logic — the whole point of snapshot mode:"structural" — is locked here.

console.log('\n⑨ᵈ engine shared/structure.js');

const structProbe = path.join(TMP, 'structure-probe.mjs');
fs.writeFileSync(structProbe, [
    "import { structuralDiff as d } from " + JSON.stringify(require('url').pathToFileURL(path.join(ROOT, 'engine/src/shared/structure.js')).href) + ";",
    "function eq(got, want, label){ const g=JSON.stringify(got), w=JSON.stringify(want); if(g!==w){ console.error('FAIL '+label+': got '+g+' want '+w); process.exit(2); } }",
    // Same shape, different values AND different array length → NO diff (the whole point)
    "eq(d({id:1,name:'a',tags:['x']}, {id:999,name:'zzz',tags:['p','q','r']}), [], 'values+array-length ignored');",
    // Type change, added field, removed field (sorted)
    "eq(d({id:1,name:'a',old:true}, {id:'1',name:'a',neu:2}), ['+ neu (number)','- old (boolean)','~ id: number → string'], 'add/remove/typechange');",
    // Nested + arrays collapse to [*]
    "eq(d({data:{items:[{id:1}]}}, {data:{items:[{id:1},{id:2}]}}), [], 'nested array same shape');",
    "eq(d({data:{items:[{id:1}]}}, {data:{items:[{id:1,extra:'x'}]}}), ['+ data.items[*].extra (string)'], 'nested field added');",
    // null vs value is a type change; empty containers are distinct leaves
    "eq(d({a:null}, {a:5}), ['~ a: null → number'], 'null to number');",
    "eq(d({a:{}}, {a:{x:1}}), ['+ a.x (number)','- a (empty-object)'], 'empty object filled');",
    "eq(d({a:[]}, {a:[1]}), ['~ a[*]: empty-array → number'], 'empty array filled → type change at a[*]');",
    // Identical → empty
    "eq(d({x:1,y:'s',z:true}, {x:2,y:'t',z:false}), [], 'identical shape');",
    // prototype-name safety: fields named after Object.prototype members are real leaves
    "eq(d({id:1}, {id:1, toString:2}), ['+ toString (number)'], 'added field named toString detected');",
    "eq(d({id:1, valueOf:2}, {id:1}), ['- valueOf (number)'], 'removed field named valueOf detected');",
    "eq(d(JSON.parse('{\"__proto__\":1,\"id\":2}'), JSON.parse('{\"__proto__\":\"s\",\"id\":2}')), ['~ __proto__: number → string'], '__proto__ leaf tracked');",
    // heterogeneous arrays: union of distinct types, order-independent
    "eq(d({arr:[1]}, {arr:[1,'x']}), ['~ arr[*]: number → number|string'], 'mixed array types unioned');",
    "eq(d({arr:['x',1]}, {arr:[1,'x']}), [], 'mixed array order-independent');",
    // root-level array label is consistent between empty and non-empty
    "eq(d([], [1]), ['~ [*]: empty-array → number'], 'root empty→filled array uses [*]');",
    "console.log('ok');"
].join('\n'));

test('structuralDiff ignores values/array-length but catches add/remove/type-change', function() {
    const out = run(NODE + ' ' + JSON.stringify(structProbe));
    assertContains(out, 'ok', 'structure probe did not pass');
});

// ─── 9e. check-locales.js (locale catalog gate) ───────────────────────────────
// t() falls back to `ru` when a locale is missing, so an incomplete translation
// would ship silently. This gate is what makes a locale contribution reviewable.

console.log('\n⑨ᵉ check-locales.js');

const locales = require(path.join(ROOT, 'scripts/check-locales.js'));

test('check-locales catches a missing locale, an arity mismatch and status drift', function() {
    const r = locales.analyse({
        'a.missing': { ru: function() { return 'р'; } },                                  // no en
        'a.arity':   { ru: function(x) { return 'р' + x; }, en: function() { return 'e'; } },
        'a.ok':      { ru: function(x) { return 'р' + x; }, en: function(x) { return 'e' + x; } }
    }, { ru: { 200: 'ок' }, en: { 200: 'ok', 404: 'nf' } });
    const joined = r.errors.join(' | ');
    assertContains(joined, 'a.missing', 'missing locale reported');
    assertContains(joined, 'a.arity', 'arity mismatch reported');
    assertContains(joined, 'statusLabel 404', 'status-code drift reported');
    assert(joined.indexOf('a.ok') === -1, 'a consistent message must not be reported: ' + joined);
});

test('check-locales accepts array/number/object template arguments (no false positives)', function() {
    // Templates take arrays (.join()), numbers, or error-like objects (.message) —
    // none of those may be reported as broken just because a string probe would fail.
    const r = locales.analyse({
        'a.list': { ru: function(xs) { return 'р' + xs.join(','); }, en: function(xs) { return 'e' + xs.join(','); } },
        'a.num':  { ru: function(n) { return 'р' + (n + 1); },       en: function(n) { return 'e' + (n + 1); } },
        'a.err':  { ru: function(e) { return 'р' + (e ? e.message : 'нет'); }, en: function(e) { return 'e' + (e ? e.message : 'none'); } }
    }, {});
    assert(r.errors.length === 0, 'array/number/object templates must pass: ' + r.errors.join(' | '));
});

test('check-locales catches locales that disagree on the argument type', function() {
    // The call site passes exactly one type, so if ru needs an array and en needs a
    // string, one of them throws inside the engine — accepting each independently
    // (first shape that does not throw) would let that ship.
    const r = locales.analyse({
        'a.list': { ru: function(xs) { return 'р' + xs.join(','); }, en: function(s) { return 'e' + s.toUpperCase(); } }
    }, { ru: { 200: 'ок' }, en: { 200: 'ok' } });
    assertContains(r.errors.join(' | '), 'disagree on the argument type', 'type divergence reported');
});

test('check-locales catches a template that reads a field nothing provides', function() {
    const r = locales.analyse({
        'a.leak': { ru: function(o) { return 'р' + o.nope; }, en: function(o) { return 'e' + o.nope; } }
    }, { ru: { 200: 'ок' }, en: { 200: 'ok' } });
    assertContains(r.errors.join(' | '), 'leaks undefined', 'undefined leak reported');
});

test('check-locales does not pass vacuously (dropped locale, empty catalog, status gaps)', function() {
    // Deriving the expected locales purely from the catalog would call each of these
    // "consistent" — the baseline is what makes wholesale loss an error.
    const dropped = locales.analyse({ 'a': { ru: function() { return 'р'; } } }, { ru: { 200: 'ок' } });
    assertContains(dropped.errors.join(' | '), 'missing "en"', 'dropping a locale everywhere is an error');

    const empty = locales.analyse({}, {});
    assertContains(empty.errors.join(' | '), 'catalog is empty', 'empty catalog is an error');

    // A locale translated in every message but absent from the status map cannot be
    // selected at runtime (locOf keys off the status map).
    const noStatus = locales.analyse({ 'a': { ru: function() { return 'р'; }, en: function() { return 'e'; } } },
        { ru: { 200: 'ок' } });
    assertContains(noStatus.errors.join(' | '), 'missing locale "en"', 'locale absent from status map reported');

    const emptyLabel = locales.analyse({ 'a': { ru: function() { return 'р'; }, en: function() { return 'e'; } } },
        { ru: { 200: 'ок' }, en: { 200: '' } });
    assertContains(emptyLabel.errors.join(' | '), 'empty or non-string label', 'empty status label reported');
});

test('the shipped catalog is complete and consistent across every locale', function() {
    const out = run(NODE + ' "' + path.join(ROOT, 'scripts/check-locales.js') + '" --json');
    const r = JSON.parse(out);
    assert(r.errors.length === 0, 'shipped catalog has problems: ' + r.errors.join(' | '));
    assert(r.locales.indexOf('ru') !== -1 && r.locales.indexOf('en') !== -1, 'ru + en present');
    assert(r.ids > 100, 'expected a populated catalog, got ' + r.ids + ' ids');
});

// ─── 10. generate-report.js ───────────────────────────────────────────────────

console.log('\n⑩ generate-report.js');

const reportOut = path.join(TMP, 'report.html');

test('generates HTML report', function() {
    run(NODE + ' "' + path.join(ROOT, 'scripts/generate-report.js') + '" "' + newmanFixtureFile + '" "' + reportOut + '"');
    assert(fs.existsSync(reportOut), 'report.html not created');
});

test('HTML contains key elements', function() {
    const html = fs.readFileSync(reportOut, 'utf8');
    assertContains(html, 'Hephaestus',   'missing Hephaestus branding');
    assertContains(html, 'Test Collection', 'missing collection name');
    assertContains(html, 'GET User',     'missing request name');
    assertContains(html, 'POST Login',   'missing request name');
    assertContains(html, 'PASS RATE',     'missing SVG pass-rate chart');
});

test('HTML has no external <script> or <link rel=stylesheet>', function() {
    const html = fs.readFileSync(reportOut, 'utf8');
    // Allow anchor hrefs to GitHub, forbid external JS/CSS asset loads
    const scriptSrc  = (html.match(/<script\b[^>]+src="https?:\/\//g) || []);
    const linkHref   = (html.match(/<link\b[^>]+href="https?:\/\//g) || []);
    assert(scriptSrc.length === 0, 'found external <script src>: ' + scriptSrc.join(', '));
    assert(linkHref.length  === 0, 'found external <link href>: '  + linkHref.join(', '));
});

// ─── 11. hephaestus CLI ───────────────────────────────────────────────────────

console.log('\n⑪ hephaestus CLI (bin/hephaestus.js)');

const CLI = path.join(ROOT, 'bin/hephaestus.js');

test('--version prints package version', function() {
    assertContains(run(NODE + ' "' + CLI + '" --version'), pkg.version, 'version');
});

test('--help lists all user commands', function() {
    const out = run(NODE + ' "' + CLI + '" --help');
    ['summary', 'compare', 'report', 'junit', 'migrate', 'docs', 'init', 'watch'].forEach(function(c) {
        assertContains(out, c, 'help command ' + c);
    });
});

test('unknown command exits non-zero', function() {
    let code = 0;
    try { run(NODE + ' "' + CLI + '" frobnicate'); } catch(e) { code = e.status || 1; }
    assert(code !== 0, 'unknown command should exit non-zero');
});

test('report subcommand delegates → HTML file', function() {
    const outHtml = path.join(TMP, 'cli-report.html');
    run(NODE + ' "' + CLI + '" report "' + newmanFixtureFile + '" "' + outHtml + '"');
    assert(fs.existsSync(outHtml), 'HTML should be created');
    assertContains(fs.readFileSync(outHtml, 'utf8'), '<html', 'report HTML');
});

test('junit subcommand delegates → JUnit XML', function() {
    const outXml = path.join(TMP, 'cli-junit.xml');
    run(NODE + ' "' + CLI + '" junit "' + newmanFixtureFile + '" "' + outXml + '"');
    assert(fs.existsSync(outXml), 'XML should be created');
    assertContains(fs.readFileSync(outXml, 'utf8'), 'testsuite', 'junit XML');
});

test('propagates sub-command exit code (summary with failures exits 1)', function() {
    let code = 0;
    try { run(NODE + ' "' + CLI + '" summary "' + newmanFixtureFile + '"'); } catch(e) { code = e.status || 1; }
    assert(code === 1, 'summary should propagate exit 1 on failures, got ' + code);
});

// ─── 12. sync-examples.js ─────────────────────────────────────────────────────

console.log('\n⑫ sync-examples.js');

const snapCollectionFile = path.join(TMP, 'snap-collection.json');
const snapOutFile        = path.join(TMP, 'snap-out.json');
fs.writeFileSync(snapCollectionFile, JSON.stringify({
    info: { name: 'Snap', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    variable: [{ key: 'hephaestus.snapshots', value: JSON.stringify({
        'Snap::GET User::200::json': { statusCode: 200, format: 'json', data: { id: 42, name: 'Alice' } }
    }) }],
    item: [{ name: 'GET User', request: { method: 'GET', url: { raw: 'http://x/user' } }, response: [{ name: 'Existing', code: 200, body: '{}' }] }]
}));

test('sync-examples adds a 📸 example from a snapshot', function() {
    run(NODE + ' "' + path.join(ROOT, 'scripts/sync-examples.js') + '" "' + snapCollectionFile + '" -o "' + snapOutFile + '"');
    const col = JSON.parse(fs.readFileSync(snapOutFile, 'utf8'));
    const ex  = (col.item[0].response || []).find(function(r) { return r.name && r.name.indexOf('📸 Snapshot') === 0; });
    assert(ex, 'no 📸 Snapshot example added');
    assert(ex.code === 200, 'example code should be 200');
    assertContains(ex.body, 'Alice', 'example body should contain the snapshot data');
});

test('sync-examples keeps hand-written examples and is idempotent', function() {
    run(NODE + ' "' + path.join(ROOT, 'scripts/sync-examples.js') + '" "' + snapOutFile + '" -o "' + snapOutFile + '"');
    const resp = JSON.parse(fs.readFileSync(snapOutFile, 'utf8')).item[0].response;
    const generated   = resp.filter(function(r) { return r.name && r.name.indexOf('📸 Snapshot') === 0; });
    const handwritten = resp.filter(function(r) { return r.name === 'Existing'; });
    assert(generated.length === 1, 'expected exactly 1 generated example (idempotent), got ' + generated.length);
    assert(handwritten.length === 1, 'hand-written example must be preserved');
});

// ─── 13. openapi-import.js ────────────────────────────────────────────────────

console.log('\n⑬ openapi-import.js');

const openapiYamlFile = path.join(TMP, 'api.yaml');
const openapiOutFile  = path.join(TMP, 'api-collection.json');
fs.writeFileSync(openapiYamlFile, [
    'openapi: 3.0.0',
    'info:',
    '  title: Test API',
    'servers:',
    '  - url: https://api.example.com',
    'paths:',
    '  /pets/{petId}:',
    '    get:',
    '      summary: Get pet',
    '      tags: [pets]',
    '      responses:',
    "        '200':",
    '          description: ok',
    '          content:',
    '            application/json:',
    '              schema:',
    "                $ref: '#/components/schemas/Pet'",
    'components:',
    '  schemas:',
    '    Pet:',
    '      type: object',
    '      required: [id]',
    '      properties:',
    '        id:',
    '          type: integer'
].join('\n'));

test('openapi imports YAML into a collection', function() {
    run(NODE + ' "' + path.join(ROOT, 'scripts/openapi-import.js') + '" "' + openapiYamlFile + '" -o "' + openapiOutFile + '"');
    const col = JSON.parse(fs.readFileSync(openapiOutFile, 'utf8'));
    assert(col.info.name === 'Test API', 'collection name from info.title, got ' + col.info.name);
    const folder = col.item.find(function(f) { return f.name === 'pets'; });
    assert(folder && folder.item.length === 1, 'expected 1 request in pets folder');
});

test('openapi converts path params + pre-fills override (expectedStatus + inlined $ref schema)', function() {
    const col = JSON.parse(fs.readFileSync(openapiOutFile, 'utf8'));
    const req = col.item[0].item[0];
    assertContains(req.request.url.raw, '/pets/:petId', 'path param {petId} → :petId');
    const src = req.event.find(function(e) { return e.listen === 'test'; }).script.exec.join('\n');
    const override = JSON.parse(src.match(/const override = ([\s\S]*?);/)[1]);
    assert(JSON.stringify(override.expectedStatus) === '[200]', 'expectedStatus should be [200]');
    assert(override.schema && override.schema.definition && override.schema.definition.properties && override.schema.definition.properties.id, '$ref schema should be inlined');
});

test('openapi handles flush-style YAML (same-indent lists, server vars, response $ref)', function() {
    const flushYaml = path.join(TMP, 'flush.yaml');
    const flushOut  = path.join(TMP, 'flush-collection.json');
    fs.writeFileSync(flushYaml, [
        'openapi: 3.0.0',
        'info:',
        '  title: Flush API',
        'servers:',
        '- url: https://{host}/v1',
        '  variables:',
        '    host:',
        '      default: api.example.com',
        'paths:',
        '  /pets:',
        '    get:',
        '      tags: [pets]',
        '      responses:',
        "        '200':",
        "          $ref: '#/components/responses/Ok'",
        'components:',
        '  responses:',
        '    Ok:',
        '      content:',
        '        application/json:',
        '          schema:',
        '            type: object',
        '            properties:',
        '              id:',
        '                type: integer'
    ].join('\n'));
    run(NODE + ' "' + path.join(ROOT, 'scripts/openapi-import.js') + '" "' + flushYaml + '" -o "' + flushOut + '"');
    const col = JSON.parse(fs.readFileSync(flushOut, 'utf8'));
    assertContains(col.variable.find(function(v) { return v.key === 'baseUrl'; }).value, 'api.example.com', 'server var {host} should expand to its default');
    const folder = col.item.find(function(f) { return f.name === 'pets'; });
    assert(folder && folder.item.length === 1, 'flush server/tags should yield 1 request in the pets folder');
    const src = folder.item[0].event.find(function(e) { return e.listen === 'test'; }).script.exec.join('\n');
    const override = JSON.parse(src.match(/const override = ([\s\S]*?);\n/)[1]);
    assert(override.schema && override.schema.definition && override.schema.definition.properties && override.schema.definition.properties.id, 'response-level $ref schema should be inlined');
});

// ─── 14. flaky.js ─────────────────────────────────────────────────────────────

console.log('\n⑭ flaky.js');

const FLAKY = path.join(ROOT, 'scripts/flaky.js');

// Three repeated runs of the SAME collection. "Flaky check" flaps pass→fail→pass;
// everything else ("Status is 200", "Has id", "Stable ok") is rock-stable.
function flakyRun(flapErr) {
    return {
        collection: { info: { name: 'Flaky Demo' } },
        run: { executions: [
            { item: { id: 'u1', name: 'GET User' }, assertions: [
                { assertion: 'Status is 200', skipped: false, error: null },
                { assertion: 'Has id',        skipped: false, error: null } ] },
            { item: { id: 'l1', name: 'POST Login' }, assertions: [
                { assertion: 'Stable ok',   skipped: false, error: null },
                { assertion: 'Flaky check', skipped: false, error: flapErr } ] }
        ] }
    };
}

const flakyR1 = path.join(TMP, 'flaky-r1.json');
const flakyR2 = path.join(TMP, 'flaky-r2.json');
const flakyR3 = path.join(TMP, 'flaky-r3.json');
fs.writeFileSync(flakyR1, JSON.stringify(flakyRun(null)));                                    // pass
fs.writeFileSync(flakyR2, JSON.stringify(flakyRun({ message: 'expected 500 to equal 200' }))); // fail
fs.writeFileSync(flakyR3, JSON.stringify(flakyRun(null)));                                    // pass
const flakyArgs = '"' + flakyR1 + '" "' + flakyR2 + '" "' + flakyR3 + '"';

test('flags exactly the flapping assertion (--json)', function() {
    const out = JSON.parse(run(NODE + ' "' + FLAKY + '" ' + flakyArgs + ' --json'));
    assert(out.flaky.length === 1, 'expected exactly 1 flaky assertion, got ' + out.flaky.length);
    const f = out.flaky[0];
    assert(f.assertion === 'Flaky check', 'wrong assertion flagged: ' + f.assertion);
    assert(f.request === 'POST Login', 'wrong request: ' + f.request);
    assert(f.pass === 2 && f.fail === 1, 'expected 2 pass / 1 fail, got ' + f.pass + '/' + f.fail);
});

test('stable assertions are NOT flagged (counted as stable-pass)', function() {
    const out = JSON.parse(run(NODE + ' "' + FLAKY + '" ' + flakyArgs + ' --json'));
    assert(out.stablePass === 3, 'expected 3 stable-pass (Status is 200, Has id, Stable ok), got ' + out.stablePass);
    assert(out.stableFail === 0, 'expected 0 stable-fail, got ' + out.stableFail);
    const names = out.flaky.map(function(f) { return f.assertion; });
    ['Status is 200', 'Has id', 'Stable ok'].forEach(function(n) {
        assert(names.indexOf(n) === -1, n + ' must not be flagged as flaky');
    });
});

test('--json shape: { runs, flaky:[{request,assertion,pass,fail,rate}], stablePass, stableFail }', function() {
    const out = JSON.parse(run(NODE + ' "' + FLAKY + '" ' + flakyArgs + ' --json'));
    assert(out.runs === 3, 'runs should be 3, got ' + out.runs);
    assert(Array.isArray(out.flaky), 'flaky should be an array');
    assert(typeof out.stablePass === 'number', 'stablePass should be a number');
    assert(typeof out.stableFail === 'number', 'stableFail should be a number');
    const f = out.flaky[0];
    ['request', 'assertion', 'pass', 'fail', 'rate'].forEach(function(k) {
        assert(k in f, 'flaky entry missing key: ' + k);
    });
    assert(f.rate > 0.33 && f.rate < 0.34, 'rate should be ~0.3333 (1 fail / 3), got ' + f.rate);
});

test('--fail-on-flaky exits 1 when flaky found', function() {
    let code = 0;
    try { run(NODE + ' "' + FLAKY + '" ' + flakyArgs + ' --fail-on-flaky --no-color'); }
    catch(e) { code = e.status || 1; }
    assert(code === 1, '--fail-on-flaky should exit 1 with flaky present, got ' + code);
});

test('exits 0 by default despite flaky (diagnostic, not a gate)', function() {
    // run() throws on non-zero exit — a clean return proves exit 0.
    run(NODE + ' "' + FLAKY + '" ' + flakyArgs + ' --no-color');
});

test('human render names the flapping request, assertion and tally', function() {
    const out = run(NODE + ' "' + FLAKY + '" ' + flakyArgs + ' --no-color');
    assertContains(out, 'Runs analyzed: 3', 'missing run count header');
    assertContains(out, 'POST Login', 'flapping request not shown');
    assertContains(out, 'Flaky check', 'flapping assertion not shown');
    assertContains(out, '2✓/1✗', 'missing pass/fail tally');
    assertContains(out, '1 flaky · 3 stable-pass · 0 stable-fail', 'missing summary line');
});

test('needs at least TWO result files (usage error, exit 1)', function() {
    let code = 0;
    try { run(NODE + ' "' + FLAKY + '" "' + flakyR1 + '"'); } catch(e) { code = e.status || 1; }
    assert(code === 1, 'single file should exit 1, got ' + code);
});

test('reports no flaky when every run is identical-pass', function() {
    const out = JSON.parse(run(NODE + ' "' + FLAKY + '" "' + flakyR1 + '" "' + flakyR3 + '" "' + flakyR1 + '" --json'));
    assert(out.flaky.length === 0, 'no assertion should flap across identical passing runs');
    const human = run(NODE + ' "' + FLAKY + '" "' + flakyR1 + '" "' + flakyR3 + '" --no-color');
    assertContains(human, '✓ no flaky assertions across 2 runs', 'missing clean-bill-of-health line');
});

test('skipped assertions are ignored (skip ≠ fail, no false flake)', function() {
    // "Flaky check" is skipped in the middle run — pass, skip, pass → stable-pass, never flaky.
    const skipRun = flakyRun(null);
    skipRun.run.executions[1].assertions[1].skipped = true;
    const skipFile = path.join(TMP, 'flaky-skip.json');
    fs.writeFileSync(skipFile, JSON.stringify(skipRun));
    const out = JSON.parse(run(NODE + ' "' + FLAKY + '" "' + flakyR1 + '" "' + skipFile + '" "' + flakyR3 + '" --json'));
    assert(out.flaky.length === 0, 'a skipped run must not make an otherwise-passing assertion flaky');
});

test('an assertion absent from some runs is stable-pass, not flaky (presence-agnostic)', function() {
    // Middle run omits "Flaky check" entirely; the other two pass it → stable-pass.
    const missRun = flakyRun(null);
    missRun.run.executions[1].assertions = [{ assertion: 'Stable ok', skipped: false, error: null }];
    const missFile = path.join(TMP, 'flaky-miss.json');
    fs.writeFileSync(missFile, JSON.stringify(missRun));
    const out = JSON.parse(run(NODE + ' "' + FLAKY + '" "' + flakyR1 + '" "' + missFile + '" "' + flakyR3 + '" --json'));
    assert(out.flaky.length === 0, 'absence in one run must not be treated as a failure');
});

test('malformed result file → clear error, exit 1', function() {
    const badFile = path.join(TMP, 'flaky-bad.json');
    fs.writeFileSync(badFile, '{ not json');
    let code = 0;
    try { run(NODE + ' "' + FLAKY + '" "' + flakyR1 + '" "' + badFile + '"'); } catch(e) { code = e.status || 1; }
    assert(code === 1, 'malformed JSON should exit 1, got ' + code);
});

test('a valid-JSON file that is not a Newman result → clean error (no stack trace), exit 1', function() {
    const notNewman = path.join(TMP, 'flaky-notnewman.json');
    fs.writeFileSync(notNewman, JSON.stringify({ foo: 1 }));   // valid JSON, wrong shape
    let code = 0, err = '';
    try { run(NODE + ' "' + FLAKY + '" "' + flakyR1 + '" "' + notNewman + '"'); }
    catch (e) { code = e.status || 1; err = (e.stderr || '').toString(); }
    assert(code === 1, 'a non-Newman file should exit 1, got ' + code);
    assertContains(err, 'not a Newman result', 'should give a clean message');
    assert(err.indexOf('TypeError') === -1, 'must not dump a raw TypeError stack trace');
});

test('flaky subcommand delegates through the CLI (bin/hephaestus.js)', function() {
    let code = 0;
    try { run(NODE + ' "' + CLI + '" flaky ' + flakyArgs + ' --fail-on-flaky --no-color'); }
    catch(e) { code = e.status || 1; }
    assert(code === 1, 'CLI should propagate flaky --fail-on-flaky exit 1, got ' + code);
});

// ─── 15. trends.js + summary --history ────────────────────────────────────────

console.log('\n⑮ trends.js + summary --history');

const histFile = path.join(TMP, 'history.jsonl');

test('summary --history appends one JSONL line with numeric fields', function() {
    // NEWMAN_FIXTURE has a failing assertion → summary exits 1; the history line
    // is still appended (append runs before process.exit). Tolerate the exit.
    try {
        run(NODE + ' "' + path.join(ROOT, 'scripts/summary.js') + '" "' + newmanFixtureFile + '" --history "' + histFile + '" --no-color');
    } catch (e) { /* expected: exit 1 due to fixture failures */ }
    assert(fs.existsSync(histFile), 'history file not created');
    const lines = fs.readFileSync(histFile, 'utf8').trim().split('\n').filter(Boolean);
    assert(lines.length === 1, 'expected exactly 1 history line, got ' + lines.length);
    const rec = JSON.parse(lines[0]);
    ['passRate', 'p95', 'total', 'failed', 'requests', 'durationMs'].forEach(function(k) {
        assert(typeof rec[k] === 'number', 'field "' + k + '" should be numeric, got ' + typeof rec[k]);
    });
    assert(typeof rec.ts === 'string', 'ts should be an ISO string');
    assert(rec.passRate === 75, 'passRate should be 75 (3/4 assertions), got ' + rec.passRate);
    assert(rec.p95 === 100, 'p95 should be 100 ms, got ' + rec.p95);
    assert(rec.failed === 1, 'failed should be 1, got ' + rec.failed);
});

test('summary --history appends (not overwrites) on a second run', function() {
    try {
        run(NODE + ' "' + path.join(ROOT, 'scripts/summary.js') + '" "' + newmanFixtureFile + '" --history "' + histFile + '" --no-color');
    } catch (e) { /* exit 1 expected */ }
    const lines = fs.readFileSync(histFile, 'utf8').trim().split('\n').filter(Boolean);
    assert(lines.length === 2, 'expected 2 history lines after running twice, got ' + lines.length);
});

const trendsFixture = path.join(TMP, 'trends-history.jsonl');
fs.writeFileSync(trendsFixture, [
    JSON.stringify({ ts: '2026-07-01T00:00:00.000Z', passRate: 80,  p95: 150, total: 10, failed: 2, requests: 5, durationMs: 1000 }),
    JSON.stringify({ ts: '2026-07-02T00:00:00.000Z', passRate: 90,  p95: 120, total: 10, failed: 1, requests: 5, durationMs: 1100 }),
    JSON.stringify({ ts: '2026-07-03T00:00:00.000Z', passRate: 100, p95: 90,  total: 10, failed: 0, requests: 5, durationMs: 900 }),
    '',                                     // blank line — must be tolerated
    '# comment line — must be skipped'
].join('\n'));

test('trends renders sparklines + latest values', function() {
    const out = run(NODE + ' "' + path.join(ROOT, 'scripts/trends.js') + '" "' + trendsFixture + '" --no-color');
    assert(/[▁▂▃▄▅▆▇█]/.test(out), 'expected unicode sparkline block chars in output');
    assertContains(out, '100%', 'latest pass rate');
    assertContains(out, '90ms', 'latest p95');
    assertContains(out, '3 runs', 'run count');
});

test('trends shows deltas vs the previous run', function() {
    const out = run(NODE + ' "' + path.join(ROOT, 'scripts/trends.js') + '" "' + trendsFixture + '" --no-color');
    assertContains(out, '+10%',  'pass-rate delta +10%');
    assertContains(out, '-30ms', 'p95 delta -30ms');
});

test('trends --json has the right shape', function() {
    const out = run(NODE + ' "' + path.join(ROOT, 'scripts/trends.js') + '" "' + trendsFixture + '" --json');
    const obj = JSON.parse(out);
    assert(obj.count === 3, 'count should be 3, got ' + obj.count);
    assert(JSON.stringify(obj.passRate.values) === JSON.stringify([80, 90, 100]), 'passRate.values mismatch');
    assert(obj.passRate.latest === 100, 'passRate.latest should be 100');
    assert(obj.passRate.delta === 10, 'passRate.delta should be 10');
    assert(typeof obj.passRate.spark === 'string' && obj.passRate.spark.length === 3, 'passRate.spark should be a 3-char string');
    assert(obj.p95.latest === 90, 'p95.latest should be 90');
    assert(obj.p95.delta === -30, 'p95.delta should be -30');
});

test('trends sparkline glyphs map low→high (pins exact bars — catches an inverted mapping)', function() {
    const obj = JSON.parse(run(NODE + ' "' + path.join(ROOT, 'scripts/trends.js') + '" "' + trendsFixture + '" --json'));
    assert(obj.passRate.spark === '▁▅█', 'passRate 80/90/100 → "▁▅█", got "' + obj.passRate.spark + '"');
    assert(obj.p95.spark === '█▅▁', 'p95 150/120/90 → "█▅▁" (highest value = tallest bar), got "' + obj.p95.spark + '"');
});

test('summary --history=<file> (equals form) also appends, mirroring --sla=', function() {
    const eqHist = path.join(TMP, 'history-eq.jsonl');
    try {
        run(NODE + ' "' + path.join(ROOT, 'scripts/summary.js') + '" "' + newmanFixtureFile + '" --history=' + eqHist + ' --no-color');
    } catch (e) { /* exit 1 expected — the fixture has a failing assertion */ }
    assert(fs.existsSync(eqHist), '--history=<file> should create the history file');
    assert(fs.readFileSync(eqHist, 'utf8').trim().split('\n').filter(Boolean).length === 1, 'exactly one line appended');
});

test('trends --last N limits to the most recent N runs', function() {
    const out = run(NODE + ' "' + path.join(ROOT, 'scripts/trends.js') + '" "' + trendsFixture + '" --last 2 --json');
    const obj = JSON.parse(out);
    assert(obj.count === 2, 'count should be 2 with --last 2, got ' + obj.count);
    assert(JSON.stringify(obj.passRate.values) === JSON.stringify([90, 100]), 'should keep the last 2 runs');
});

test('trends exits 1 on missing history', function() {
    let code = 0;
    try { run(NODE + ' "' + path.join(ROOT, 'scripts/trends.js') + '" "' + path.join(TMP, 'does-not-exist.jsonl') + '"'); }
    catch (e) { code = e.status || 1; }
    assert(code === 1, 'missing history should exit 1, got ' + code);
});

test('CLI --help lists trends', function() {
    assertContains(run(NODE + ' "' + CLI + '" --help'), 'trends', 'trends command in help');
});

test('CLI trends --help exits 0', function() {
    // execSync throws on a non-zero exit, so reaching the end == exit 0.
    run(NODE + ' "' + CLI + '" trends --help');
});

test('CLI trends delegates → renders from history', function() {
    assertContains(run(NODE + ' "' + CLI + '" trends "' + trendsFixture + '" --no-color'), '100%', 'CLI trends render');
});

// ─── 16. coverage.js ──────────────────────────────────────────────────────────

console.log('\n⑯ coverage.js');

const coverage = require(path.join(ROOT, 'scripts/coverage.js'));
const COVERAGE = path.join(ROOT, 'scripts/coverage.js');

const COV_SPEC = {
    openapi: '3.0.0', info: { title: 'T' },
    paths: {
        '/users':      { get: { tags: ['u'] }, post: { tags: ['u'] } },
        '/users/{id}': { get: { tags: ['u'] }, delete: { tags: ['u'] } },
        '/health':     { get: { tags: ['sys'] } }
    }
};
const COV_COLLECTION = {
    info: { name: 'C' },
    item: [
        { name: 'list', request: { method: 'GET', url: { raw: '{{baseUrl}}/users', path: ['users'] } } },
        { name: 'one',  request: { method: 'GET', url: { raw: '{{baseUrl}}/users/:id', path: ['users', ':id'] } } },
        { name: 'hc',   request: { method: 'GET', url: '{{baseUrl}}/health' } }
    ]
};
const covSpecFile = path.join(TMP, 'cov-spec.json');
const covColFile  = path.join(TMP, 'cov-col.json');
fs.writeFileSync(covSpecFile, JSON.stringify(COV_SPEC));
fs.writeFileSync(covColFile, JSON.stringify(COV_COLLECTION));

test('coverage computeCoverage counts covered/uncovered and normalizes :id ↔ {id}', function() {
    const c = coverage.computeCoverage(COV_SPEC, COV_COLLECTION);
    assert(c.total === 5, 'spec has 5 operations, got ' + c.total);
    assert(c.covered === 3, 'GET /users, GET /users/:id (↔{id}), GET /health → 3 covered, got ' + c.covered);
    assert(c.pct === 60, 'coverage 3/5 = 60%, got ' + c.pct);
    const missKeys = c.uncovered.map(function(o) { return o.method + ' ' + o.path; }).sort();
    assert(missKeys.join('|') === 'DELETE /users/{id}|POST /users', 'uncovered = POST /users + DELETE /users/{id}, got ' + missKeys.join('|'));
});

test('coverage normPath / urlPath collapse {{var}} / {id} / :id and tidy slashes', function() {
    assert(coverage.normPath('/users/{id}') === '/users/{}', '{id} → {}');
    assert(coverage.normPath('/users/:id') === '/users/{}', ':id → {}');
    assert(coverage.normPath('/users/{{userId}}') === '/users/{}', '{{var}} → {}');
    assert(coverage.normPath('/a//b/') === '/a/b', 'collapse + trim slashes');
    assert(coverage.urlPath({ path: ['users', ':id'] }) === '/users/:id', 'path array');
    assert(coverage.urlPath('{{baseUrl}}/health') === '/health', 'strip {{var}} host');
});

test('coverage CLI reports % (--json) and gates on --min (exit 1 below, 0 at/above)', function() {
    const doc = JSON.parse(run(NODE + ' "' + COVERAGE + '" --spec "' + covSpecFile + '" "' + covColFile + '" --json'));
    assert(doc.total === 5 && doc.covered === 3 && doc.pct === 60, 'CLI --json should report 3/5 = 60%');
    let code = 0;
    try { run(NODE + ' "' + COVERAGE + '" --spec "' + covSpecFile + '" "' + covColFile + '" --json --min 80'); }
    catch (e) { code = e.status || 1; }
    assert(code === 1, 'coverage below --min should exit 1 (CI gate), got ' + code);
    run(NODE + ' "' + COVERAGE + '" --spec "' + covSpecFile + '" "' + covColFile + '" --json --min 50');   // meets → exit 0 (run throws on non-zero)
});

test('CLI exposes coverage: --help lists it and `coverage --help` exits 0', function() {
    assertContains(run(NODE + ' "' + CLI + '" --help'), 'coverage', 'CLI help should list coverage');
    assertContains(run(NODE + ' "' + CLI + '" coverage --help'), 'Hephaestus Coverage', '`coverage --help` should print its help');
});

test('coverage normPath is symmetric for literal-suffix / multi-param paths (:id.pdf ↔ {id}.pdf)', function() {
    assert(coverage.normPath('/reports/:id.pdf') === coverage.normPath('/reports/{id}.pdf'), ':id.pdf must normalise like {id}.pdf');
    assert(coverage.normPath('/reports/:id.pdf') === '/reports/{}.pdf', 'a literal suffix stays literal');
    assert(coverage.normPath('/tiles/:z/:x/:y.png') === coverage.normPath('/tiles/{z}/{x}/{y}.png'), 'map-tile multi-param must match');
    assert(coverage.normPath('/geo/:lat,:lng') === coverage.normPath('/geo/{lat},{lng}'), 'matrix-style params must match');
    // round-trip: a /reports/{id}.pdf operation is counted as covered by a :id.pdf request
    const spec = { openapi: '3.0.0', paths: { '/reports/{id}.pdf': { get: {} } } };
    const col  = { item: [{ name: 'r', request: { method: 'GET', url: { path: ['reports', ':id.pdf'] } } }] };
    assert(coverage.computeCoverage(spec, col).pct === 100, ':id.pdf should cover /reports/{id}.pdf (expected 100%)');
});

test('coverage --min errors (exit 1) on missing/empty/non-numeric value — no silent false-green', function() {
    ['--min', '--min ""', '--min abc'].forEach(function(variant) {
        let code = 0;
        try { run(NODE + ' "' + COVERAGE + '" --spec "' + covSpecFile + '" "' + covColFile + '" ' + variant); }
        catch (e) { code = e.status || 1; }
        assert(code === 1, '`' + variant + '` must exit 1 (not silently disable the gate), got ' + code);
    });
});

// ─── 17. mock.js ──────────────────────────────────────────────────────────────

console.log('\n⑰ mock.js');

const mock = require(path.join(ROOT, 'scripts/mock.js'));
const MOCK = path.join(ROOT, 'scripts/mock.js');

const MOCK_COLLECTION = {
    info: { name: 'MockCol' },
    variable: [{ key: 'hephaestus.snapshots', value: JSON.stringify({
        'MockCol::GetThing::404::json': { statusCode: 404, format: 'json', data: { error: 'nope' } },
        'MockCol::GetThing::200::json': { statusCode: 200, format: 'json', data: { id: 1, name: 'Widget' } },
        'MockCol::GetText::200::text':  { statusCode: 200, format: 'text', data: 'plain hello' }
    }) }],
    item: [
        { name: 'GetThing', request: { method: 'GET', url: { raw: '{{baseUrl}}/thing', path: ['thing'] } } },
        { name: 'GetText',  request: { method: 'GET', url: '{{baseUrl}}/text' } },
        { name: 'Orphan',   request: { method: 'GET', url: { raw: '{{baseUrl}}/orphan', path: ['orphan'] } } }
    ]
};
const mockCollectionFile = path.join(TMP, 'mock-collection.json');
fs.writeFileSync(mockCollectionFile, JSON.stringify(MOCK_COLLECTION));

test('mock buildRoutes maps requests to routes and prefers a 2xx/json snapshot', function() {
    const b = mock.buildRoutes(MOCK_COLLECTION);
    assert(b.routes['GET /thing'], 'expected a GET /thing route');
    assert(b.routes['GET /thing'].statusCode === 200, 'should prefer 200 over 404, got ' + b.routes['GET /thing'].statusCode);
    assert(b.routes['GET /text'], 'expected a GET /text route (string url)');
    assert(b.routes['GET /text'].contentType.indexOf('text/plain') === 0, 'text snapshot → text/plain');
    assert(b.routes['GET /orphan'] === undefined, 'a request with no snapshot must not be mounted');
});

test('mock matchRoute normalizes the path and is method-sensitive', function() {
    const b = mock.buildRoutes(MOCK_COLLECTION);
    assert(mock.matchRoute(b.routes, 'GET', '/thing'),  'exact match');
    assert(mock.matchRoute(b.routes, 'GET', '/thing/'), 'trailing slash should still match');
    assert(mock.matchRoute(b.routes, 'get', '/thing'),  'method is case-insensitive');
    assert(!mock.matchRoute(b.routes, 'POST', '/thing'), 'wrong method must not match');
    assert(!mock.matchRoute(b.routes, 'GET', '/missing'), 'unknown path must not match');
});

test('mock urlPath / normalizePath handle string, path[] and {{var}} URLs', function() {
    assert(mock.urlPath('https://api.example.com/a/b?q=1') === '/a/b', 'strip proto/host/query');
    assert(mock.urlPath({ path: ['a', 'b'] }) === '/a/b', 'path array');
    assert(mock.urlPath('{{baseUrl}}/y') === '/y', 'strip {{var}} host');
    assert(mock.normalizePath('/a//b/') === '/a/b', 'collapse + trim slashes');
    assert(mock.normalizePath('') === '/', 'empty → root');
});

test('mock serialize round-trips value types and clamps invalid status codes', function() {
    assert(mock.serialize({ format: 'json', data: 'tok' }).body === '"tok"', 'top-level string → quoted JSON, got ' + mock.serialize({ format: 'json', data: 'tok' }).body);
    assert(mock.serialize({ format: 'json', data: null }).body === 'null', 'null → "null"');
    assert(mock.serialize({ format: 'json', data: 42 }).body === '42', 'number → 42');
    const txt = mock.serialize({ format: 'text', data: 'hello' });
    assert(txt.body === 'hello' && txt.contentType.indexOf('text/plain') === 0, 'text → raw body + text/plain');
    assert(mock.serialize({ statusCode: 1000, format: 'json', data: {} }).statusCode === 200, 'out-of-range status → 200');
    assert(mock.serialize({ statusCode: 'OK', format: 'json', data: {} }).statusCode === 200, 'non-numeric status → 200');
    assert(mock.serialize({ statusCode: 404, format: 'json', data: {} }).statusCode === 404, 'valid status kept');
});

test('mock buildRoutes reports route collisions and tolerates a non-object snapshots value', function() {
    const collided = {
        variable: [{ key: 'hephaestus.snapshots', value: JSON.stringify({
            'C::A::200::json': { statusCode: 200, format: 'json', data: { a: 1 } },
            'C::B::200::json': { statusCode: 200, format: 'json', data: { b: 2 } }
        }) }],
        item: [
            { name: 'A', request: { method: 'GET', url: { path: ['dup'] } } },
            { name: 'B', request: { method: 'GET', url: { path: ['dup'] } } }
        ]
    };
    const b = mock.buildRoutes(collided);
    assert(Object.keys(b.routes).length === 1, 'two requests at one path → a single route');
    assert(b.collisions.length === 1, 'the collision should be reported, got ' + b.collisions.length);
    const nullSnaps = mock.buildRoutes({ variable: [{ key: 'hephaestus.snapshots', value: 'null' }], item: [] });
    assert(Object.keys(nullSnaps.routes).length === 0, 'a "null" snapshots value must not throw and yields zero routes');
});

test('CLI exposes mock: --help lists it and `mock --help` exits 0', function() {
    assertContains(run(NODE + ' "' + CLI + '" --help'), 'mock', 'CLI help should list mock');
    assertContains(run(NODE + ' "' + CLI + '" mock --help'), 'Hephaestus Mock', '`mock --help` should print mock help (and exit 0)');
});

test('mock serves a matching request over HTTP and 404s an unknown path', function() {
    const { spawn } = require('child_process');
    const PORT = 49517;
    // Standalone client so the script isn't fragile through the shell; retries
    // until the spawned server has bound the port.
    const clientFile = path.join(TMP, 'mock-client.js');
    fs.writeFileSync(clientFile, [
        'const http=require("http");const PORT=+process.argv[2];',
        'function go(p,n,cb){const r=http.get({host:"127.0.0.1",port:PORT,path:p},res=>{let b="";res.on("data",d=>b+=d);res.on("end",()=>cb(res.statusCode+"|"+(res.headers["x-hephaestus-mock"]||"")+"|"+b));});',
        'r.on("error",()=>{if(n>0)setTimeout(()=>go(p,n-1,cb),100);else{process.stdout.write("ERR|"+p);process.exit(0);}});}',
        'go("/thing",40,hit=>go("/missing",5,miss=>process.stdout.write(hit+"~~"+miss)));'
    ].join('\n'));

    const srv = spawn(process.execPath, [MOCK, mockCollectionFile, '-p', String(PORT), '--quiet', '--no-color'], { stdio: 'ignore' });
    try {
        const out = run(NODE + ' "' + clientFile + '" ' + PORT);
        const parts = out.split('~~');
        assert(/^200\|hit\|/.test(parts[0]), 'GET /thing → "200|hit|…", got: ' + parts[0]);
        assertContains(parts[0], 'Widget', 'replayed body should contain the recorded data');
        assert(/^404\|miss\|/.test(parts[1] || ''), 'GET /missing → "404|miss|…", got: ' + parts[1]);
    } finally {
        srv.kill('SIGKILL');
    }
});

// ─── 18. doctor.js ────────────────────────────────────────────────────────────
// Pre-flight diagnostic. These tests DO NOT touch the real engine files; the
// checksum-mismatch FAIL path is proven out-of-band (see the framework docs /
// PR notes) against a throwaway mirror. Here we exercise the honest exit-code
// contract instead: clean checkout → exit 0, a real FAIL → exit 1.

console.log('\n⑱ doctor.js');

const DOCTOR = path.join(ROOT, 'scripts/doctor.js');

test('doctor exits 0 and prints a healthy summary on clean checkout', function() {
    // run() throws on any non-zero exit, so reaching the asserts already proves exit 0.
    const out = run(NODE + ' "' + DOCTOR + '" --no-color');
    assertContains(out, 'Pre-flight Doctor', 'missing doctor header');
    assertContains(out, 'passed', 'missing pass summary line');
});

test('doctor --json reports ok:true with all 6 checks on clean checkout', function() {
    const doc = JSON.parse(run(NODE + ' "' + DOCTOR + '" --json'));
    assert(doc.ok === true, 'expected ok:true on clean checkout');
    assert(Array.isArray(doc.checks) && doc.checks.length === 6, 'expected 6 checks, got ' + (doc.checks && doc.checks.length));
    const integrity = doc.checks.find(function(ch) { return ch.name === 'Engine integrity'; });
    assert(integrity && integrity.status === 'PASS', 'engine integrity should PASS on clean checkout');
    const version = doc.checks.find(function(ch) { return ch.name === 'Version consistency'; });
    assert(version && version.status === 'PASS', 'version consistency should PASS on clean checkout');
    const drift = doc.checks.find(function(ch) { return ch.name === 'Defaults drift'; });
    assert(drift && drift.status === 'PASS', 'defaults drift should PASS on clean checkout');
});

test('doctor without -e never FAILs the environment check (honest INFO, no false requirement)', function() {
    const doc = JSON.parse(run(NODE + ' "' + DOCTOR + '" --json'));
    const env = doc.checks.find(function(ch) { return ch.name === 'Environment'; });
    assert(env && env.status === 'INFO', 'without -e the env check must be INFO, not FAIL/PASS');
});

test('doctor gates CI: a real FAIL (invalid -e env) exits 1 and sets ok:false', function() {
    const badEnv = path.join(TMP, 'doctor-bad-env.json');
    fs.writeFileSync(badEnv, '{ this is not valid json');
    let code = 0, out = '';
    try {
        run(NODE + ' "' + DOCTOR + '" -e "' + badEnv + '" --json');
    } catch (e) {
        code = e.status || 1;
        out  = (e.stdout || '').toString();
    }
    assert(code === 1, 'invalid env should exit 1 (CI gate), got ' + code);
    const doc = JSON.parse(out);
    assert(doc.ok === false, 'JSON ok should be false when a check FAILs');
    const env = doc.checks.find(function(ch) { return ch.name === 'Environment'; });
    assert(env && env.status === 'FAIL', 'Environment check should FAIL on invalid env JSON');
});

test('doctor -e with a valid Postman environment PASSes and stays exit 0', function() {
    const goodEnv = path.join(TMP, 'doctor-good-env.json');
    fs.writeFileSync(goodEnv, JSON.stringify({
        name: 'dev',
        values: [
            { key: 'baseUrl', value: 'https://api.example.com', enabled: true },
            { key: 'token',   value: '',                        enabled: true }
        ]
    }));
    const doc = JSON.parse(run(NODE + ' "' + DOCTOR + '" -e "' + goodEnv + '" --json'));
    assert(doc.ok === true, 'valid env + clean checkout should be ok:true');
    const env = doc.checks.find(function(ch) { return ch.name === 'Environment'; });
    assert(env && env.status === 'PASS', 'env check should PASS for a valid environment');
    assertContains(env.detail, '2 variable(s)', 'env detail should report variable count');
});

test('doctor -e with no path FAILs (an unset/empty env var must not silently pass)', function() {
    let code = 0, out = '';
    try {
        run(NODE + ' "' + DOCTOR + '" -e --json');
    } catch (e) {
        code = e.status || 1;
        out  = (e.stdout || '').toString();
    }
    assert(code === 1, '-e without a path should exit 1 (no false all-clear), got ' + code);
    const env = JSON.parse(out).checks.find(function(ch) { return ch.name === 'Environment'; });
    assert(env && env.status === 'FAIL', '-e without a path should FAIL the env check, got ' + (env && env.status));
});

test('CLI exposes doctor: --help lists it and the subcommand delegates (exit 0)', function() {
    assertContains(run(NODE + ' "' + CLI + '" --help'), 'doctor', 'help should list doctor');
    const doc = JSON.parse(run(NODE + ' "' + CLI + '" doctor --json'));
    assert(doc.ok === true, 'CLI doctor --json should report ok:true on clean checkout');
});

// ─── 19. bench.js (engine overhead benchmark) ─────────────────────────────────

console.log('\n⑲ bench.js');

const bench = require(path.join(ROOT, 'scripts/bench.js'));
const BENCH = path.join(ROOT, 'scripts/bench.js');

test('bench parseArgs: defaults and flag parsing', function() {
    const d = bench.parseArgs([]);
    assert(d.requests === 40 && d.runs === 5 && d.json === false && d.maxMs === null, 'defaults wrong: ' + JSON.stringify(d));
    const a = bench.parseArgs(['--requests', '12', '--runs', '3', '--json', '--max-ms', '5']);
    assert(a.requests === 12 && a.runs === 3 && a.json === true && a.maxMs === 5, 'flags wrong: ' + JSON.stringify(a));
    // guards: non-positive / missing values fall back to defaults, never 0 or NaN
    const g = bench.parseArgs(['--requests', '0', '--runs', '-3']);
    assert(g.requests === 40 && g.runs === 5, 'non-positive should fall back: ' + JSON.stringify(g));
});

test('bench median: odd and even lengths', function() {
    assert(bench.median([3, 1, 2]) === 2, 'odd median');
    assert(bench.median([4, 1, 3, 2]) === 2.5, 'even median');
    assert(bench.median([7]) === 7, 'single');
});

test('bench --json produces a valid overhead report and exits 0', function() {
    const out = run(NODE + ' "' + BENCH + '" --requests 2 --runs 1 --json');
    const r = JSON.parse(out);
    assert(r.requests === 2 && r.runs === 1, 'echoes params');
    assert(r.engineBundleBytes && r.engineBundleBytes.total > 0, 'reports bundle size');
    assert(typeof r.overheadPerRequestMs === 'number' && r.overheadPerRequestMs >= 0, 'non-negative overhead');
    assert(r.medianRunMs && r.medianRunMs.engine > 0 && r.medianRunMs.baseline > 0, 'reports run medians');
});

test('bench --max-ms fails loud on a non-numeric budget (never silently disables the gate)', function() {
    // A malformed budget (e.g. an unset CI var) must exit 1, not pass green — the
    // fail-open direction would hide a real regression. Exits before running Newman.
    ['--max-ms abc', '--max-ms'].forEach(function(variant) {
        let code = 0;
        try { run(NODE + ' "' + BENCH + '" ' + variant); }
        catch(e) { code = e.status || 1; }
        assert(code === 1, '`bench ' + variant + '` must exit 1, got ' + code);
    });
});

// ─── 21. panel.js (local dev panel) ───────────────────────────────────────────
// A localhost server that can WRITE deserves its guards locked down, not just its
// happy path: loopback-only Host (anti DNS-rebinding) and a write path a foreign
// page cannot reach (JSON content-type + same-origin).

console.log('\n㉑ panel.js');

const panel = require(path.join(ROOT, 'scripts/panel.js'));

test('panel parseHistory skips malformed lines instead of blanking the view', function() {
    const runs = panel.parseHistory('{"ts":"t1","passRate":90}\nBROKEN\n\n{"ts":"t2"}\n');
    assert(runs.length === 2 && runs[0].ts === 't1' && runs[1].ts === 't2', 'kept the good lines: ' + JSON.stringify(runs));
    assert(panel.parseHistory('').length === 0 && panel.parseHistory(null).length === 0, 'empty/null → []');
});

test('panel extractSnapshots reads the collection variable, tolerates junk', function() {
    const ok = panel.extractSnapshots({ variable: [{ key: 'hephaestus.snapshots', value: '{"k":{"a":1}}' }] });
    assert(ok.k && ok.k.a === 1, 'parsed store');
    assert(JSON.stringify(panel.extractSnapshots({ variable: [{ key: 'hephaestus.snapshots', value: 'NOTJSON' }] })) === '{}', 'bad JSON → {}');
    assert(JSON.stringify(panel.extractSnapshots({})) === '{}', 'no variable → {}');
    assert(JSON.stringify(panel.extractSnapshots(null)) === '{}', 'null collection → {}');
});

test('panel isLoopbackHost accepts only loopback (DNS-rebinding guard)', function() {
    assert(panel.isLoopbackHost('127.0.0.1:7373', 7373) === true, '127.0.0.1');
    assert(panel.isLoopbackHost('localhost:7373', 7373) === true, 'localhost');
    assert(panel.isLoopbackHost('evil.com:7373', 7373) === false, 'foreign host rejected');
    assert(panel.isLoopbackHost('127.0.0.1:9999', 7373) === false, 'wrong port rejected');
    assert(panel.isLoopbackHost(undefined, 7373) === false, 'missing Host rejected');
    // On port 80 browsers omit the port from Host — accept the bare form there only.
    assert(panel.isLoopbackHost('127.0.0.1', 80) === true, 'bare host accepted on :80');
    assert(panel.isLoopbackHost('localhost', 80) === true, 'bare localhost accepted on :80');
    assert(panel.isLoopbackHost('127.0.0.1', 7373) === false, 'bare host rejected on a non-80 port');
    assert(panel.isLoopbackHost('evil.com', 80) === false, 'bare foreign host still rejected');
});

test('panel isWriteAllowed blocks the cross-origin form-POST (CSRF) vector', function() {
    assert(panel.isWriteAllowed({ 'content-type': 'application/json' }, 7373) === true, 'json, no origin');
    assert(panel.isWriteAllowed({ 'content-type': 'application/json', origin: 'http://127.0.0.1:7373' }, 7373) === true, 'json, own origin');
    assert(panel.isWriteAllowed({ 'content-type': 'application/x-www-form-urlencoded' }, 7373) === false, 'simple form POST rejected');
    assert(panel.isWriteAllowed({ 'content-type': 'text/plain' }, 7373) === false, 'text/plain rejected');
    assert(panel.isWriteAllowed({ 'content-type': 'application/json', origin: 'http://evil.com' }, 7373) === false, 'foreign origin rejected');
    assert(panel.isWriteAllowed({}, 7373) === false, 'no content-type rejected');
});

// End-to-end: the server serves the page, reads history, and enforces the guards.
// Runs in a probe so the async server work stays out of this synchronous harness.
const panelProbe = path.join(TMP, 'panel-probe.js');
fs.writeFileSync(panelProbe, [
    "const p = require(" + JSON.stringify(path.join(ROOT, 'scripts/panel.js')) + ");",
    "const http = require('http'), fs = require('fs'), os = require('os'), pathm = require('path');",
    "const dfile = pathm.join(os.tmpdir(), 'hephaestus-panel-probe-defaults.json');",
    "fs.writeFileSync(dfile, JSON.stringify({ baseUrl: 'before' }));",
    "const srv = p.createPanelServer({ port: 0, history: '/nonexistent.jsonl', collection: null, defaultsFile: dfile });",
    "function fail(m){ console.error('FAIL ' + m); process.exit(2); }",
    "srv.listen(0, '127.0.0.1', function(){",
    "  const pt = srv.address().port;",
    "  function req(o, body){ return new Promise(function(res){ const r = http.request(Object.assign({host:'127.0.0.1',port:pt},o), function(rs){ let d=''; rs.on('data',c=>d+=c); rs.on('end',()=>res({code:rs.statusCode,body:d,h:rs.headers})); }); r.on('error',e=>res({code:0,body:String(e),h:{}})); if(body) r.write(body); r.end(); }); }",
    "  (async function(){",
    "    const home = await req({method:'GET',path:'/'});",
    "    if (home.code !== 200 || home.body.indexOf('Dev Panel') === -1) fail('GET / -> ' + home.code);",
    "    const hist = await req({method:'GET',path:'/api/history'});",
    "    if (hist.code !== 200 || JSON.parse(hist.body).runs.length !== 0) fail('history -> ' + hist.code);",
    "    const evil = await req({method:'GET',path:'/',headers:{Host:'evil.com:'+pt}});",
    "    if (evil.code !== 403) fail('evil Host should 403, got ' + evil.code);",
    "    const csrf = await req({method:'POST',path:'/api/defaults',headers:{'Content-Type':'application/x-www-form-urlencoded'}}, 'a=1');",
    "    if (csrf.code !== 403) fail('form POST should 403, got ' + csrf.code);",
    "    const bad = await req({method:'POST',path:'/api/defaults',headers:{'Content-Type':'application/json'}}, 'NOTJSON');",
    "    if (bad.code !== 400) fail('invalid JSON should 400, got ' + bad.code);",
    "    const ok = await req({method:'POST',path:'/api/defaults',headers:{'Content-Type':'application/json'}}, JSON.stringify({baseUrl:'after'}));",
    "    if (ok.code !== 200) fail('valid write should 200, got ' + ok.code);",
    "    if (JSON.parse(fs.readFileSync(dfile,'utf8')).baseUrl !== 'after') fail('write did not land');",
    // the write-capable page must not be frameable
    "    if ((home.h['x-frame-options']||'') !== 'DENY') fail('missing X-Frame-Options');",
    "    if (!/frame-ancestors 'none'/.test(home.h['content-security-policy']||'')) fail('missing CSP frame-ancestors');",
    // docs are served from a fixed map — a traversal-shaped key is simply unknown
    "    const doc = await req({method:'GET',path:'/docs/config-reference.html'});",
    "    if (doc.code !== 200) fail('docs page should 200, got ' + doc.code);",
    "    const trav = await req({method:'GET',path:'/docs/../../etc/passwd'});",
    "    if (trav.code !== 404) fail('doc traversal should 404, got ' + trav.code);",
    // a multi-byte character split across TCP chunks must survive the write
    "    const payload = JSON.stringify({ baseUrl: 'https://\\u00e9.example/\\u03c0' });",
    "    const buf = Buffer.from(payload, 'utf8');",
    "    const cut = buf.indexOf(Buffer.from('\\u00e9','utf8')) + 1;",
    "    await new Promise(function(done){ const q = http.request({host:'127.0.0.1',port:pt,method:'POST',path:'/api/defaults',headers:{'Content-Type':'application/json','Content-Length':buf.length}}, function(s){ s.resume(); s.on('end', done); });",
    "      q.write(buf.slice(0,cut)); setTimeout(function(){ q.write(buf.slice(cut)); q.end(); }, 20); });",
    "    if (fs.readFileSync(dfile,'utf8').indexOf('\\u00e9.example/\\u03c0') === -1) fail('multibyte body corrupted across chunks');",
    "    srv.close(function(){ console.log('ok'); process.exit(0); });",
    "  })();",
    "});"
].join('\n'));

test('panel server: serves the page, reads history, and enforces host/CSRF/JSON guards', function() {
    const out = run(NODE + ' ' + JSON.stringify(panelProbe));
    assertContains(out, 'ok', 'panel probe did not pass');
});

// ─── 20. generate-test.js (override wizard) ───────────────────────────────────

console.log('\n⑳ generate-test.js');

const generate = require(path.join(ROOT, 'scripts/generate-test.js'));
const GEN = path.join(ROOT, 'scripts/generate-test.js');

test('generate buildOverride: post plane emits only chosen, non-default fields', function() {
    const o = generate.buildOverride({
        plane: 'post', locale: 'en', expectedStatus: 200,
        keysToFind: [{ path: 'data.id', expect: '' }, { path: 'data.status', expect: 'active' }],
        assertShape: { 'data.items': 'array' },
        snapshot: { enabled: true, mode: 'structural' }
    });
    assert(o.locale === 'en' && o.expectedStatus === 200, 'locale + status');
    assert(o.keysToFind.length === 2 && o.keysToFind[0].expect === undefined && o.keysToFind[1].expect === 'active', 'keysToFind expect optional');
    assert(o.assertShape['data.items'] === 'array', 'assertShape');
    assert(o.snapshot.enabled === true && o.snapshot.mode === 'structural' && o.snapshot.autoSaveMissing === true, 'snapshot');
    // empty answers → empty override (no junk keys)
    assert(JSON.stringify(generate.buildOverride({ plane: 'post' })) === '{}', 'empty post → {}');
});

test('generate buildOverride: pre plane emits auth only', function() {
    const o = generate.buildOverride({ plane: 'pre', auth: { type: 'bearer', token: '{{prod.token}}' } });
    assert(o.auth && o.auth.enabled === true && o.auth.type === 'bearer' && o.auth.token === '{{prod.token}}', 'bearer auth');
    assert(o.expectedStatus === undefined && o.keysToFind === undefined, 'no post-only fields on pre plane');
    assert(JSON.stringify(generate.buildOverride({ plane: 'pre', auth: { type: 'none' } })) === '{}', 'auth none → {}');
    // basic-auth must emit the engine's field names (user/pass), not username/password
    const b = generate.buildOverride({ plane: 'pre', auth: { type: 'basic', user: 'alice', pass: 's3cret' } });
    assert(b.auth.user === 'alice' && b.auth.pass === 's3cret', 'basic uses user/pass (engine field names)');
    assert(b.auth.username === undefined && b.auth.password === undefined, 'no username/password keys the engine ignores');
});

test('generate buildOverride: NaN expectedStatus is omitted (not emitted as null)', function() {
    // typeof NaN === 'number' would slip through a loose guard and render as null.
    assert(generate.buildOverride({ plane: 'post', expectedStatus: NaN }).expectedStatus === undefined, 'NaN omitted');
    assert(generate.buildOverride({ plane: 'post', expectedStatus: 200 }).expectedStatus === 200, 'real status kept');
});

test('generate renderScript: correct eval line per plane', function() {
    assertContains(generate.renderScript({ locale: 'en' }, 'post'), 'eval(pm.collectionVariables.get("hephaestus.v3.post"))', 'post eval line');
    assertContains(generate.renderScript({ locale: 'en' }, 'pre'), 'eval(pm.collectionVariables.get("hephaestus.v3.pre"))', 'pre eval line');
    assertContains(generate.renderScript({ expectedStatus: 200 }, 'post'), 'const override = {', 'override literal');
});

test('generate wizard runs end-to-end over piped answers and prints a block', function() {
    // input buffered by the line-queue driver → reliable under a pipe. post, ru, 200, no extras.
    const out = run(NODE + ' "' + GEN + '"', { input: '1\n1\n200\nn\nn\nn\n' });
    assertContains(out, 'const override = {', 'prints the override block');
    assertContains(out, 'hephaestus.v3.post', 'post plane eval line');
    assertContains(out, '"expectedStatus": 200', 'carried the status answer');
});

// ─── Cleanup ─────────────────────────────────────────────────────────────────

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch(e) { /* ignore */ }

// ─── Results ─────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log('\n' + '─'.repeat(60));
console.log('Results: ' + passed + '/' + total + ' passed' + (failed > 0 ? ', ' + failed + ' failed' : ''));

if (failures.length > 0) {
    console.log('\nFailed tests:');
    failures.forEach(function(f) { console.log('  ❌ ' + f.name + '\n     ' + f.error); });
}

console.log('');
process.exit(failed > 0 ? 1 : 0);
