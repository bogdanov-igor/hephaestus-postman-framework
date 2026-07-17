#!/usr/bin/env node
/**
 * Hephaestus — Tool Suite Tests  v3.9.0
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

const NODE = process.execPath;

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
    "import { isSensitive } from " + JSON.stringify(path.join(ROOT, 'engine/src/shared/mask.js')) + ";",
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

// ─── 14. mock.js ──────────────────────────────────────────────────────────────

console.log('\n⑭ mock.js');

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

    const srv = spawn(NODE, [MOCK, mockCollectionFile, '-p', String(PORT), '--quiet', '--no-color'], { stdio: 'ignore' });
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
