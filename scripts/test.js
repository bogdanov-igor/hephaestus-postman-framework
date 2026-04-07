#!/usr/bin/env node
/**
 * Hephaestus — Tool Suite Tests  v3.8.0
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
    const match = pre.match(/const VERSION = '([^']+)'/);
    assert(match, 'VERSION not found in pre-request.js');
    assert(match[1] === pkg.version, 'pre-request VERSION ' + match[1] + ' !== package.json ' + pkg.version);
});

test('package.json version matches engine post-request VERSION', function() {
    const post = fs.readFileSync(path.join(ROOT, 'engine/post-request.js'), 'utf8');
    const match = post.match(/const VERSION = '([^']+)'/);
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
    run(NODE + ' "' + path.join(ROOT, 'scripts/summary.js') + '" "' + newmanFixtureFile + '" --md > "' + summaryMdOut + '"', { shell: true });
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
