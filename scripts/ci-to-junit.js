#!/usr/bin/env node
/**
 * Hephaestus — Newman JSON → JUnit XML converter  v3.3.0
 *
 * Converts Newman's JSON reporter output to JUnit XML for CI dashboards
 * (Jenkins, GitHub Actions test summary, GitLab, Azure DevOps).
 *
 * Usage:
 *   node scripts/ci-to-junit.js results.json [output.xml]
 *   node scripts/ci-to-junit.js results.json            # writes junit-report.xml
 *   cat results.json | node scripts/ci-to-junit.js -    # reads stdin
 *
 * Generate source file with Newman:
 *   newman run collection.json --reporter-json-export results.json -r json
 *
 * GitHub Actions integration:
 *   - uses: dorny/test-reporter@v1
 *     with:
 *       files: junit-report.xml
 *       reporter: java-junit
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── CLI ─────────────────────────────────────────────────────────────────────

const args   = process.argv.slice(2);
const inFile = args[0];
const outFile = args[1] || 'junit-report.xml';

if (!inFile) {
    console.error('Usage: node scripts/ci-to-junit.js <results.json|-stdin> [output.xml]');
    process.exit(1);
}

// ─── Load JSON ────────────────────────────────────────────────────────────────

let raw;
try {
    raw = inFile === '-' ? fs.readFileSync('/dev/stdin', 'utf8') : fs.readFileSync(inFile, 'utf8');
} catch (e) {
    console.error('Cannot read input: ' + e.message);
    process.exit(1);
}

let data;
try {
    data = JSON.parse(raw);
} catch (e) {
    console.error('Invalid JSON: ' + e.message);
    process.exit(1);
}

// ─── Parse Newman report ──────────────────────────────────────────────────────

const run       = data.run || {};
const executions = run.executions || [];
const stats     = run.stats || {};
const colName   = (data.collection && data.collection.info && data.collection.info.name) || 'Newman';

function esc(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function ms2s(ms) {
    return ((ms || 0) / 1000).toFixed(3);
}

// Each execution → one <testsuite> with assertions as <testcase>
const suites = executions.map(ex => {
    const itemName    = (ex.item && ex.item.name) || 'unknown';
    const resp        = ex.response || {};
    const elapsed     = resp.responseTime || 0;
    const statusCode  = resp.code || 0;
    const assertions  = ex.assertions || [];

    const testcases = assertions.map(a => {
        const aName  = esc(a.assertion || 'assertion');
        const failed = a.error && a.error.message;
        const timeS  = ms2s(elapsed / Math.max(assertions.length, 1));
        if (failed) {
            return [
                '      <testcase name="' + aName + '" classname="' + esc(itemName) + '" time="' + timeS + '">',
                '        <failure message="' + esc(a.error.message) + '" type="AssertionError">',
                '          ' + esc(a.error.message),
                '        </failure>',
                '      </testcase>',
            ].join('\n');
        }
        return '      <testcase name="' + aName + '" classname="' + esc(itemName) + '" time="' + timeS + '"/>';
    });

    const failures = assertions.filter(a => a.error && a.error.message).length;

    return {
        name:      itemName,
        tests:     assertions.length,
        failures,
        time:      ms2s(elapsed),
        testcases,
        statusCode,
    };
});

// ─── Build JUnit XML ──────────────────────────────────────────────────────────

const totalTests    = suites.reduce((n, s) => n + s.tests, 0);
const totalFailures = suites.reduce((n, s) => n + s.failures, 0);
const totalTime     = suites.reduce((n, s) => n + parseFloat(s.time), 0).toFixed(3);

const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<testsuites name="' + esc(colName) + '"' +
        ' tests="' + totalTests + '"' +
        ' failures="' + totalFailures + '"' +
        ' time="' + totalTime + '">',
];

suites.forEach((s, i) => {
    lines.push(
        '  <testsuite' +
        ' name="' + esc(s.name) + '"' +
        ' tests="' + s.tests + '"' +
        ' failures="' + s.failures + '"' +
        ' time="' + s.time + '"' +
        ' id="' + i + '">'
    );
    if (s.testcases.length === 0) {
        // No assertions — emit one implicit testcase for status
        const statusOk = s.statusCode >= 200 && s.statusCode < 400;
        lines.push('    <testcase name="HTTP ' + s.statusCode + '" classname="' + esc(s.name) + '" time="' + s.time + '"' + (statusOk ? '/>' : '>'));
        if (!statusOk) {
            lines.push('      <failure message="HTTP ' + s.statusCode + '" type="HttpError">Unexpected status code ' + s.statusCode + '</failure>');
            lines.push('    </testcase>');
        }
    } else {
        s.testcases.forEach(tc => lines.push(tc));
    }
    lines.push('  </testsuite>');
});

lines.push('</testsuites>');

const xml = lines.join('\n') + '\n';

// ─── Write output ─────────────────────────────────────────────────────────────

try {
    fs.writeFileSync(outFile, xml, 'utf8');
} catch (e) {
    console.error('Cannot write output: ' + e.message);
    process.exit(1);
}

const passRate = totalTests > 0 ? Math.round((totalTests - totalFailures) / totalTests * 100) : 100;

console.log('✅  JUnit XML written → ' + path.resolve(outFile));
console.log('   Tests: ' + totalTests + '  |  Failures: ' + totalFailures + '  |  Pass rate: ' + passRate + '%  |  Time: ' + totalTime + 's');
