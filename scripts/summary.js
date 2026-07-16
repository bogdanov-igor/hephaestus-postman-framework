#!/usr/bin/env node
/**
 * Hephaestus — Newman Run Summary  v3.9.0
 *
 * Generates a rich human-readable summary from a Newman JSON results file.
 * Shows overall stats, per-folder breakdown, slowest endpoints, and
 * most-failed assertions.
 *
 * Usage:
 *   node scripts/summary.js <results.json> [--md] [--no-color] [--sla=<ms>]
 *
 * Options:
 *   --md        Output Markdown instead of console table
 *   --no-color  Disable terminal colors
 *   --sla=<ms>  SLA threshold — fails (exit 1) if response-time p95 exceeds <ms>
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── CLI ──────────────────────────────────────────────────────────────────────

const args      = process.argv.slice(2);
const inputFile = args.find(function(a) { return !a.startsWith('-'); });
const mdMode    = args.includes('--md');
const noColor   = args.includes('--no-color') || mdMode;
const slaArg    = args.find(function(a) { return a.indexOf('--sla=') === 0; });
const slaMs     = slaArg ? parseInt(slaArg.slice(6), 10) : null;
const slaOn     = typeof slaMs === 'number' && !isNaN(slaMs) && slaMs > 0;
if (slaArg && !slaOn) {
    console.error('⚠️  Invalid --sla value "' + slaArg.slice(6) + '" — SLA gate disabled (expected a positive number of ms).');
}

if (!inputFile) {
    console.error('Usage: node scripts/summary.js <results.json> [--md] [--no-color] [--sla=<ms>]');
    process.exit(1);
}

const raw  = fs.readFileSync(path.resolve(inputFile), 'utf8');
const data = JSON.parse(raw);

// ─── Color helpers ────────────────────────────────────────────────────────────

const c = {
    green:  function(s) { return noColor ? s : '\x1b[32m' + s + '\x1b[0m'; },
    red:    function(s) { return noColor ? s : '\x1b[31m' + s + '\x1b[0m'; },
    yellow: function(s) { return noColor ? s : '\x1b[33m' + s + '\x1b[0m'; },
    bold:   function(s) { return noColor ? s : '\x1b[1m'  + s + '\x1b[0m'; },
    dim:    function(s) { return noColor ? s : '\x1b[2m'  + s + '\x1b[0m'; },
    cyan:   function(s) { return noColor ? s : '\x1b[36m' + s + '\x1b[0m'; },
};

function passRate(pass, total) {
    if (total === 0) return '—';
    return Math.round(pass / total * 100) + '%';
}

function padR(str, n) { return String(str).padEnd(n); }
function padL(str, n) { return String(str).padStart(n); }

// ─── Parse executions ─────────────────────────────────────────────────────────

const run        = data.run || {};
const stats      = run.stats || {};
const timings    = run.timings || {};
const executions = run.executions || [];
const colInfo    = data.collection && data.collection.info || {};

// Per-execution stats
const requests = executions.map(function(exec) {
    const assertions = exec.assertions || [];
    const passed     = assertions.filter(function(a) { return !a.error && !a.skipped; }).length;
    const failed     = assertions.filter(function(a) { return a.error; }).length;
    const folder     = (exec.item && exec.item.name) ? exec.item.name.split('/')[0] : '(root)';

    return {
        name:        exec.item && exec.item.name || 'Unknown',
        method:      exec.item && exec.item.request && exec.item.request.method || 'GET',
        status:      exec.response && exec.response.code || 0,
        time:        exec.response && exec.response.responseTime || 0,
        size:        exec.response && exec.response.responseSize || 0,
        assertions:  assertions.length,
        passed:      passed,
        failed:      failed,
        folder:      folder,
        failedNames: assertions.filter(function(a) { return a.error; }).map(function(a) { return a.assertion; }),
    };
});

// ─── Per-folder aggregation ───────────────────────────────────────────────────

const folderMap = {};
requests.forEach(function(r) {
    if (!folderMap[r.folder]) {
        folderMap[r.folder] = { requests: 0, assertions: 0, passed: 0, failed: 0, totalTime: 0 };
    }
    const f = folderMap[r.folder];
    f.requests++;
    f.assertions += r.assertions;
    f.passed     += r.passed;
    f.failed     += r.failed;
    f.totalTime  += r.time;
});

// ─── Slowest endpoints ────────────────────────────────────────────────────────

const slowest = requests.slice().sort(function(a, b) { return b.time - a.time; }).slice(0, 5);

// ─── Response-time percentiles + SLA ──────────────────────────────────────────

const times = requests
    .map(function(r) { return r.time; })
    // exclude 0 (failed / no-response executions) so they don't deflate percentiles
    .filter(function(t) { return typeof t === 'number' && t > 0; })
    .sort(function(a, b) { return a - b; });

function percentile(sorted, p) {
    if (!sorted.length) return 0;
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return sorted[idx];
}

const pct = {
    min: times.length ? times[0] : 0,
    p50: percentile(times, 50),
    p90: percentile(times, 90),
    p95: percentile(times, 95),
    p99: percentile(times, 99),
    max: times.length ? times[times.length - 1] : 0,
    avg: times.length ? Math.round(times.reduce(function(s, t) { return s + t; }, 0) / times.length) : 0
};

const slaBreaches = slaOn
    ? requests.filter(function(r) { return r.time > slaMs; }).sort(function(a, b) { return b.time - a.time; })
    : [];
const slaFailed = slaOn && pct.p95 > slaMs;

// ─── Most-failed assertions ───────────────────────────────────────────────────

const failMap = {};
requests.forEach(function(r) {
    r.failedNames.forEach(function(name) {
        failMap[name] = (failMap[name] || 0) + 1;
    });
});
const topFailed = Object.keys(failMap)
    .sort(function(a, b) { return failMap[b] - failMap[a]; })
    .slice(0, 5)
    .map(function(n) { return { name: n, count: failMap[n] }; });

// ─── Overall ──────────────────────────────────────────────────────────────────

const totalReqs     = (stats.requests && stats.requests.total) || requests.length;
const failedReqs    = (stats.requests && stats.requests.failed) || 0;
const totalAsserts  = (stats.assertions && stats.assertions.total) || 0;
const failedAsserts = (stats.assertions && stats.assertions.failed) || 0;
const passedAsserts = totalAsserts - failedAsserts;

const durationMs = timings.completed && timings.started
    ? timings.completed - timings.started
    : requests.reduce(function(s, r) { return s + r.time; }, 0);

const collectionName = colInfo.name || path.basename(inputFile, '.json');
const envName        = data.environment && data.environment.name || '—';

// ─── Markdown output ──────────────────────────────────────────────────────────

// Failure gate: assertion failures, request failures, or an SLA p95 breach.
// Computed before the mdMode branch so Markdown output propagates it too.
const exitCode = failedAsserts > 0 || failedReqs > 0 || slaFailed ? 1 : 0;

if (mdMode) {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
    const lines = [];

    lines.push('# Newman Run Summary');
    lines.push('');
    lines.push('> ' + collectionName + ' · ' + envName + ' · ' + now);
    lines.push('');
    lines.push('## Overall');
    lines.push('');
    lines.push('| | Value |');
    lines.push('|---|---|');
    lines.push('| Requests | ' + totalReqs + ' (' + (totalReqs - failedReqs) + ' passed, ' + failedReqs + ' failed) |');
    lines.push('| Assertions | ' + totalAsserts + ' (' + passedAsserts + ' passed, ' + failedAsserts + ' failed) |');
    lines.push('| Pass rate | ' + passRate(passedAsserts, totalAsserts) + ' |');
    lines.push('| Duration | ' + (durationMs / 1000).toFixed(1) + 's |');
    lines.push('');

    lines.push('## Folders');
    lines.push('');
    lines.push('| Folder | Requests | Pass rate | Avg time |');
    lines.push('|---|---|---|---|');
    Object.keys(folderMap).forEach(function(name) {
        const f = folderMap[name];
        const pr = passRate(f.passed, f.assertions);
        const avg = f.requests ? Math.round(f.totalTime / f.requests) : 0;
        lines.push('| ' + name + ' | ' + f.requests + ' | ' + pr + ' | ' + avg + ' ms |');
    });
    lines.push('');

    if (slowest.length > 0) {
        lines.push('## Slowest Endpoints');
        lines.push('');
        lines.push('| Request | Method | Time | Status |');
        lines.push('|---|---|---|---|');
        slowest.forEach(function(r) {
            lines.push('| ' + r.name + ' | `' + r.method + '` | ' + r.time + ' ms | ' + r.status + ' |');
        });
        lines.push('');
    }

    if (times.length > 0) {
        lines.push('## Response Times');
        lines.push('');
        lines.push('| min | p50 | p90 | p95 | p99 | max | avg |');
        lines.push('|---|---|---|---|---|---|---|');
        lines.push('| ' + [pct.min, pct.p50, pct.p90, pct.p95, pct.p99, pct.max, pct.avg].map(function(v) { return v + ' ms'; }).join(' | ') + ' |');
        lines.push('');
        if (slaOn) {
            lines.push('**SLA ' + slaMs + ' ms** — p95 = ' + pct.p95 + ' ms — ' + (slaFailed ? '❌ breached' : '✅ ok'));
            if (slaBreaches.length > 0) {
                lines.push('');
                lines.push('| Over-SLA request | Time |');
                lines.push('|---|---|');
                slaBreaches.slice(0, 10).forEach(function(r) { lines.push('| ' + r.name + ' | ' + r.time + ' ms |'); });
            }
            lines.push('');
        }
    }

    if (topFailed.length > 0) {
        lines.push('## Most Failed Assertions');
        lines.push('');
        lines.push('| Assertion | Failures |');
        lines.push('|---|---|');
        topFailed.forEach(function(f) {
            lines.push('| ' + f.name + ' | ' + f.count + ' |');
        });
        lines.push('');
    }

    process.stdout.write(lines.join('\n') + '\n');
    process.exit(exitCode);
}

// ─── Console output ───────────────────────────────────────────────────────────

const W = 70;
const HR  = '─'.repeat(W);
const DIM = c.dim(HR);

console.log('');
console.log(c.bold('  🔥 HEPHAESTUS  Newman Run Summary'));
console.log(c.dim('  ' + HR));
console.log(c.dim('  Collection: ') + c.bold(collectionName));
console.log(c.dim('  Environment: ') + envName);
console.log('');

// Overall stats
const overallColor = failedAsserts === 0 ? c.green : c.red;
const prStr = passRate(passedAsserts, totalAsserts);
console.log(c.bold('  ① Overall'));
console.log('  ' + DIM);
console.log(
    '  Requests:   ' + c.bold(String(totalReqs)) + '  ('
    + c.green(String(totalReqs - failedReqs)) + ' passed, '
    + (failedReqs > 0 ? c.red(String(failedReqs)) : c.dim('0')) + ' failed)'
);
console.log(
    '  Assertions: ' + c.bold(String(totalAsserts)) + '  ('
    + c.green(String(passedAsserts)) + ' passed, '
    + (failedAsserts > 0 ? c.red(String(failedAsserts)) : c.dim('0')) + ' failed)'
);
console.log('  Pass rate:  ' + overallColor(c.bold(prStr)));
console.log('  Duration:   ' + (durationMs / 1000).toFixed(1) + 's');
console.log('');

// Folder table
console.log(c.bold('  ② Per-Folder'));
console.log('  ' + DIM);
const COL = [32, 10, 11, 10];
console.log(
    '  '
    + c.bold(padR('Folder', COL[0]))
    + c.bold(padL('Reqs', COL[1]))
    + c.bold(padL('Pass rate', COL[2]))
    + c.bold(padL('Avg time', COL[3]))
);
console.log('  ' + DIM);
Object.keys(folderMap).forEach(function(name) {
    const f   = folderMap[name];
    const pr  = passRate(f.passed, f.assertions);
    const avg = f.requests ? Math.round(f.totalTime / f.requests) : 0;
    const prColored = f.failed > 0 ? c.red(padL(pr, COL[2])) : c.green(padL(pr, COL[2]));
    console.log(
        '  '
        + padR(name.slice(0, COL[0] - 2), COL[0])
        + padL(String(f.requests), COL[1])
        + prColored
        + padL(avg + ' ms', COL[3])
    );
});
console.log('');

// Slowest
if (slowest.length > 0) {
    console.log(c.bold('  ③ Top ' + slowest.length + ' Slowest'));
    console.log('  ' + DIM);
    slowest.forEach(function(r, i) {
        console.log(
            '  ' + (i + 1) + '. '
            + padR(r.name.slice(0, 40), 42)
            + c.yellow(padL(r.time + ' ms', 8))
            + c.dim('  ' + r.method + ' ' + r.status)
        );
    });
    console.log('');
}

// Most failed
if (topFailed.length > 0) {
    console.log(c.bold('  ④ Most Failed Assertions'));
    console.log('  ' + DIM);
    topFailed.forEach(function(f, i) {
        console.log(
            '  ' + (i + 1) + '. '
            + padR(f.name.slice(0, 50), 52)
            + c.red('×' + f.count)
        );
    });
    console.log('');
}

// Response times + SLA
if (times.length > 0) {
    console.log(c.bold('  ⑤ Response Times'));
    console.log('  ' + DIM);
    console.log(
        '  min ' + pct.min + '   p50 ' + pct.p50 + '   p90 ' + pct.p90
        + '   p95 ' + c.bold(String(pct.p95)) + '   p99 ' + pct.p99 + '   max ' + pct.max + c.dim('  (ms)')
    );
    if (slaOn) {
        const slaLine = 'SLA ' + slaMs + ' ms  →  p95 ' + pct.p95 + ' ms  ' + (slaFailed ? '❌ BREACHED' : '✅ ok');
        console.log('  ' + (slaFailed ? c.red(slaLine) : c.green(slaLine)));
        slaBreaches.slice(0, 5).forEach(function(r) {
            console.log('  ' + c.red('    ⚠ ' + r.name.slice(0, 40) + '  ' + r.time + ' ms'));
        });
    }
    console.log('');
}

console.log(exitCode === 0
    ? c.green('  ✅ All tests passed!')
    : c.red('  ❌ ' + [
        failedAsserts > 0 ? failedAsserts + ' assertion(s) failed' : '',
        failedReqs > 0    ? failedReqs + ' request(s) failed'      : '',
        slaFailed         ? 'SLA breached (p95 ' + pct.p95 + ' > ' + slaMs + ' ms)' : ''
    ].filter(Boolean).join(', '))
);
console.log('');

process.exit(exitCode);
