#!/usr/bin/env node
/**
 * Hephaestus — Newman Run Comparator  v3.8.0
 *
 * Compares two Newman JSON result files side-by-side.
 * Highlights new failures, resolved failures, and performance regressions.
 *
 * Usage:
 *   node scripts/compare.js <before.json> <after.json> [--md] [--threshold 20]
 *   npm run compare -- before.json after.json
 *
 * Options:
 *   --md              Output Markdown instead of console
 *   --threshold <N>   Regression % threshold for response time (default: 20)
 *   --no-color        Disable terminal colors
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── CLI ──────────────────────────────────────────────────────────────────────

const args      = process.argv.slice(2);
const files     = args.filter(function(a) { return !a.startsWith('-'); });
const mdMode    = args.includes('--md');
const noColor   = args.includes('--no-color') || mdMode;
const threshold = args.includes('--threshold') ? parseInt(args[args.indexOf('--threshold') + 1], 10) : 20;

if (files.length < 2) {
    console.error('Usage: node scripts/compare.js <before.json> <after.json> [--md] [--threshold 20]');
    process.exit(1);
}

const before = JSON.parse(fs.readFileSync(path.resolve(files[0]), 'utf8'));
const after  = JSON.parse(fs.readFileSync(path.resolve(files[1]), 'utf8'));

// ─── Colors ───────────────────────────────────────────────────────────────────

const c = {
    green:  function(s) { return noColor ? s : '\x1b[32m' + s + '\x1b[0m'; },
    red:    function(s) { return noColor ? s : '\x1b[31m' + s + '\x1b[0m'; },
    yellow: function(s) { return noColor ? s : '\x1b[33m' + s + '\x1b[0m'; },
    bold:   function(s) { return noColor ? s : '\x1b[1m'  + s + '\x1b[0m'; },
    dim:    function(s) { return noColor ? s : '\x1b[2m'  + s + '\x1b[0m'; },
    cyan:   function(s) { return noColor ? s : '\x1b[36m' + s + '\x1b[0m'; },
};

function padR(str, n) { return String(str).padEnd(n); }
function padL(str, n) { return String(str).padStart(n); }

// ─── Parse executions ─────────────────────────────────────────────────────────

function parseRun(data) {
    const executions = (data.run && data.run.executions) || [];
    const map = {};
    executions.forEach(function(exec) {
        const name   = exec.item && exec.item.name || 'Unknown';
        const asserts = exec.assertions || [];
        const failed  = asserts.filter(function(a) { return a.error; }).map(function(a) { return a.assertion; });
        const passed  = asserts.filter(function(a) { return !a.error && !a.skipped; }).length;
        map[name] = {
            name:    name,
            status:  exec.response && exec.response.code || 0,
            time:    exec.response && exec.response.responseTime || 0,
            total:   asserts.length,
            passed:  passed,
            failed:  failed,
            ok:      failed.length === 0,
        };
    });
    return map;
}

const bMap = parseRun(before);
const aMap = parseRun(after);

const allKeys = Array.from(new Set(Object.keys(bMap).concat(Object.keys(aMap))));

// ─── Diff categories ──────────────────────────────────────────────────────────

const newFailures     = [];
const resolved        = [];
const regressions     = [];
const improvements    = [];
const statusChanges   = [];
const onlyBefore      = [];
const onlyAfter       = [];

allKeys.forEach(function(name) {
    const b = bMap[name];
    const a = aMap[name];

    if (!b) { onlyAfter.push(a); return; }
    if (!a) { onlyBefore.push(b); return; }

    // Status code change
    if (b.status !== a.status) {
        statusChanges.push({ name, before: b.status, after: a.status });
    }

    // Assertion changes
    if (b.ok && !a.ok) {
        newFailures.push({ name, newFails: a.failed, resolvedFails: [] });
    } else if (!b.ok && a.ok) {
        resolved.push({ name, resolvedFails: b.failed });
    } else if (!b.ok && !a.ok) {
        const newFails = a.failed.filter(function(f) { return !b.failed.includes(f); });
        const res      = b.failed.filter(function(f) { return !a.failed.includes(f); });
        if (newFails.length > 0 || res.length > 0) {
            newFailures.push({ name, newFails, resolvedFails: res });
        }
    }

    // Performance
    if (b.time > 0 && a.time > 0) {
        const pct = Math.round((a.time - b.time) / b.time * 100);
        if (pct >= threshold) {
            regressions.push({ name, before: b.time, after: a.time, pct });
        } else if (pct <= -threshold) {
            improvements.push({ name, before: b.time, after: a.time, pct });
        }
    }
});

// Sort
regressions.sort(function(a, b) { return b.pct - a.pct; });
improvements.sort(function(a, b) { return a.pct - b.pct; });

// ─── Overall delta ────────────────────────────────────────────────────────────

function stats(data) {
    const s = data.run && data.run.stats || {};
    return {
        requests: (s.requests && s.requests.total) || 0,
        reqFail:  (s.requests && s.requests.failed) || 0,
        asserts:  (s.assertions && s.assertions.total) || 0,
        asFail:   (s.assertions && s.assertions.failed) || 0,
    };
}

const bs = stats(before);
const as = stats(after);

const bInfo = (before.collection && before.collection.info) || {};
const aInfo = (after.collection  && after.collection.info)  || {};

// ─── Markdown output ──────────────────────────────────────────────────────────

if (mdMode) {
    const now = new Date().toISOString().slice(0, 10);
    const lines = [];

    lines.push('# Newman Run Comparison  —  ' + now);
    lines.push('');
    lines.push('| | Before | After | Delta |');
    lines.push('|---|---|---|---|');
    const reqDelta = as.requests - bs.requests;
    const asFDelta = as.asFail - bs.asFail;
    lines.push('| Collection | ' + (bInfo.name || files[0]) + ' | ' + (aInfo.name || files[1]) + ' | |');
    lines.push('| Requests | ' + bs.requests + ' | ' + as.requests + ' | ' + (reqDelta >= 0 ? '+' : '') + reqDelta + ' |');
    lines.push('| Failed assertions | ' + bs.asFail + ' | ' + as.asFail + ' | ' + (asFDelta >= 0 ? '+' : '') + asFDelta + ' |');
    lines.push('');

    if (newFailures.length > 0) {
        lines.push('## ❌ New Failures (' + newFailures.length + ')');
        lines.push('');
        newFailures.forEach(function(f) {
            lines.push('- **' + f.name + '**');
            f.newFails.forEach(function(a) { lines.push('  - ` ' + a + '`'); });
        });
        lines.push('');
    }

    if (resolved.length > 0) {
        lines.push('## ✅ Resolved (' + resolved.length + ')');
        lines.push('');
        resolved.forEach(function(r) { lines.push('- **' + r.name + '**'); });
        lines.push('');
    }

    if (regressions.length > 0) {
        lines.push('## 🐢 Performance Regressions (>' + threshold + '%)');
        lines.push('');
        lines.push('| Request | Before | After | Change |');
        lines.push('|---|---|---|---|');
        regressions.forEach(function(r) {
            lines.push('| ' + r.name + ' | ' + r.before + 'ms | ' + r.after + 'ms | +' + r.pct + '% |');
        });
        lines.push('');
    }

    if (improvements.length > 0) {
        lines.push('## 🚀 Performance Improvements (>' + threshold + '%)');
        lines.push('');
        improvements.forEach(function(r) {
            lines.push('- **' + r.name + '**: ' + r.before + 'ms → ' + r.after + 'ms (' + r.pct + '%)');
        });
        lines.push('');
    }

    if (statusChanges.length > 0) {
        lines.push('## 🔄 Status Code Changes');
        lines.push('');
        statusChanges.forEach(function(s) {
            lines.push('- **' + s.name + '**: `' + s.before + '` → `' + s.after + '`');
        });
        lines.push('');
    }

    const verdict = newFailures.length === 0 && regressions.length === 0 ? '✅ No regressions' : '❌ Regressions detected';
    lines.push('## Verdict: ' + verdict);

    process.stdout.write(lines.join('\n') + '\n');
    process.exit(newFailures.length > 0 || regressions.length > 0 ? 1 : 0);
}

// ─── Console output ───────────────────────────────────────────────────────────

const W = 70;
const HR = c.dim('─'.repeat(W));

console.log('');
console.log(c.bold('  🔥 HEPHAESTUS  Newman Run Comparator'));
console.log(HR);
console.log(c.dim('  Before: ') + (bInfo.name || files[0]));
console.log(c.dim('  After:  ') + (aInfo.name || files[1]));
console.log('');

// Overall delta
const asFDelta = as.asFail - bs.asFail;
const deltaStr = asFDelta === 0 ? c.green('=') : asFDelta > 0 ? c.red('+' + asFDelta + ' failures') : c.green(asFDelta + ' failures');
console.log(c.bold('  ① Overall delta'));
console.log(HR);
console.log('  Requests:    ' + bs.requests + ' → ' + as.requests);
console.log('  Assertions:  ' + bs.asserts + ' → ' + as.asserts);
console.log('  Failed:      ' + bs.asFail + ' → ' + as.asFail + '  (' + deltaStr + ')');
console.log('');

// New failures
if (newFailures.length > 0) {
    console.log(c.bold('  ② New Failures  ') + c.red('(' + newFailures.length + ')'));
    console.log(HR);
    newFailures.forEach(function(f) {
        console.log('  ' + c.red('✗') + ' ' + c.bold(f.name));
        f.newFails.forEach(function(a) { console.log('      ↳ ' + c.red(a)); });
        f.resolvedFails.forEach(function(a) { console.log('      ↘ ' + c.green('resolved: ' + a)); });
    });
    console.log('');
}

// Resolved
if (resolved.length > 0) {
    console.log(c.bold('  ③ Resolved  ') + c.green('(' + resolved.length + ')'));
    console.log(HR);
    resolved.forEach(function(r) { console.log('  ' + c.green('✓') + ' ' + r.name); });
    console.log('');
}

// Regressions
if (regressions.length > 0) {
    console.log(c.bold('  ④ Performance Regressions  ') + c.yellow('(>' + threshold + '%)'));
    console.log(HR);
    regressions.forEach(function(r) {
        console.log(
            '  ' + padR(r.name.slice(0, 42), 44) +
            padL(r.before + 'ms', 8) + ' → ' +
            c.yellow(padL(r.after + 'ms', 8)) +
            c.red('  +' + r.pct + '%')
        );
    });
    console.log('');
}

// Improvements
if (improvements.length > 0) {
    console.log(c.bold('  ⑤ Improvements  ') + c.green('(>' + threshold + '%)'));
    console.log(HR);
    improvements.forEach(function(r) {
        console.log(
            '  ' + padR(r.name.slice(0, 42), 44) +
            padL(r.before + 'ms', 8) + ' → ' +
            c.green(padL(r.after + 'ms', 8)) +
            c.green('  ' + r.pct + '%')
        );
    });
    console.log('');
}

// Status changes
if (statusChanges.length > 0) {
    console.log(c.bold('  ⑥ Status Code Changes'));
    console.log(HR);
    statusChanges.forEach(function(s) {
        console.log('  ' + padR(s.name.slice(0, 42), 44) + s.before + ' → ' + c.yellow(String(s.after)));
    });
    console.log('');
}

// New/removed requests
if (onlyAfter.length > 0) {
    console.log(c.bold('  ⑦ New Requests'));
    console.log(HR);
    onlyAfter.forEach(function(r) { console.log('  ' + c.cyan('+') + ' ' + r.name); });
    console.log('');
}

if (onlyBefore.length > 0) {
    console.log(c.bold('  ⑧ Removed Requests'));
    console.log(HR);
    onlyBefore.forEach(function(r) { console.log('  ' + c.dim('-') + ' ' + r.name); });
    console.log('');
}

const verdict = newFailures.length === 0 && regressions.length === 0;
console.log(verdict
    ? c.green('  ✅ No regressions detected')
    : c.red('  ❌ Regressions detected: ' + newFailures.length + ' new failure(s), ' + regressions.length + ' perf regression(s)')
);
console.log('');

process.exit(verdict ? 0 : 1);
