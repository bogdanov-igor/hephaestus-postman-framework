#!/usr/bin/env node
/**
 * Hephaestus — Flaky-Test Detector  v4.0.0
 *
 * Given TWO OR MORE Newman JSON result files from repeated runs of the SAME
 * collection, finds assertions that FLAP — pass in some runs and fail in
 * others. Flaky assertions erode trust in the suite; surfacing them lets you
 * quarantine or fix the flake instead of chasing a red build that is green on
 * retry.
 *
 * Usage:
 *   node scripts/flaky.js <results1.json> <results2.json> ... [--json] [--fail-on-flaky] [--no-color]
 *   npx hephaestus flaky run1.json run2.json run3.json
 *
 * Options:
 *   --json           Emit machine-readable JSON instead of the console report
 *   --fail-on-flaky  Exit 1 if any flaky assertion is found (CI gate)
 *   --no-color       Disable terminal colors
 *   --help           Show this help and exit 0
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── CLI ──────────────────────────────────────────────────────────────────────

const args        = process.argv.slice(2);
const files       = args.filter(function(a) { return !a.startsWith('-'); });
const jsonOut     = args.includes('--json');
const failOnFlaky = args.includes('--fail-on-flaky');
const noColor     = args.includes('--no-color') || jsonOut;
const wantHelp    = args.includes('--help') || args.includes('-h');

const USAGE = 'Usage: node scripts/flaky.js <results1.json> <results2.json> ... [--json] [--fail-on-flaky] [--no-color]';

function printHelp() {
    console.log([
        '',
        '⚒️  Hephaestus Flaky-Test Detector  v4.0.0',
        '',
        'Finds assertions that flap (pass in some runs, fail in others) across two',
        'or more Newman result files from repeated runs of the SAME collection.',
        '',
        USAGE,
        '',
        'Options:',
        '  --json           Emit machine-readable JSON instead of the console report',
        '  --fail-on-flaky  Exit 1 if any flaky assertion is found (CI gate)',
        '  --no-color       Disable terminal colors',
        '  --help           Show this help and exit',
        '',
        'Notes: detects assertion pass/fail flakiness across runs (assumes a stable',
        'item id per request); a request that sometimes does not run at all leaves no',
        'failing assertion and is not flagged.',
        ''
    ].join('\n'));
}

if (wantHelp) {
    printHelp();
    process.exit(0);
}

if (files.length < 2) {
    console.error('Flaky detection needs at least TWO result files (repeated runs of the same collection).');
    console.error(USAGE);
    process.exit(1);
}

// ─── Load runs ─────────────────────────────────────────────────────────────────

const runs = files.map(function(file) {
    let raw;
    try {
        raw = fs.readFileSync(path.resolve(file), 'utf8');
    } catch (e) {
        console.error('Cannot read "' + file + '": ' + e.message);
        process.exit(1);
    }
    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        console.error('Invalid JSON in "' + file + '": ' + e.message);
        process.exit(1);
    }
    // Validate the shape up front so a wrong-shaped file gives a clean message
    // instead of a raw stack trace deep in the classify loop.
    if (!data || typeof data !== 'object' || !Array.isArray(data.run && data.run.executions)) {
        console.error('"' + file + '" is not a Newman result (missing run.executions array). ' +
            'Export one with: newman run … --reporter-json-export ' + file);
        process.exit(1);
    }
    return data;
});

// ─── Keying ────────────────────────────────────────────────────────────────────

const SEP = '␟';   // U+241F — effectively never present in a request/assertion name

// Stable composite execution key — identical to scripts/compare.js so a request
// pairs across all N runs exactly as it does in a two-run compare. Prefer the
// Postman item id (stable across runs on the same collection); else the leaf
// name. iteration + per-(id,iteration) occurrence index disambiguate `-n`
// iterations and duplicate request names positionally (every run iterates items
// in the same order, so occurrence order pairs across runs).
function execKey(exec, counts) {
    const item = exec.item || {};
    const iter = (exec.cursor && typeof exec.cursor.iteration === 'number') ? exec.cursor.iteration : 0;
    const base = (item.id || item.name || 'Unknown') + SEP + iter;
    const occ  = counts[base] = (counts[base] || 0) + 1;
    return base + SEP + (occ - 1);
}

// ─── Aggregate assertion outcomes across all runs ──────────────────────────────

// assertion key → { request, assertion, pass, fail }.  The key is
//   execKey ␟ assertionName ␟ nameOccurrence
// The trailing name-occurrence index disambiguates duplicate assertion NAMES
// within a single execution (positional pairing across runs), the same way
// execKey disambiguates duplicate request names. Skips never touch pass/fail —
// a run that skips an assertion contributes no evidence about its flakiness.
const agg = {};

runs.forEach(function(data) {
    const executions = (data.run && data.run.executions) || [];
    const execCounts = {};
    executions.forEach(function(exec) {
        const reqName    = (exec.item && exec.item.name) || 'Unknown';
        const key        = execKey(exec, execCounts);
        const assertions = exec.assertions || [];
        const nameCounts = {};
        assertions.forEach(function(a) {
            const name = (a && a.assertion != null) ? String(a.assertion) : '(unnamed assertion)';
            const occ  = nameCounts[name] = (nameCounts[name] || 0) + 1;
            const aKey = key + SEP + name + SEP + (occ - 1);
            let rec = agg[aKey];
            if (!rec) rec = agg[aKey] = { request: reqName, assertion: name, pass: 0, fail: 0 };
            if (a && a.skipped === true) return;   // skipped → ignored for flakiness
            if (a && a.error) rec.fail++;
            else rec.pass++;
        });
    });
});

// ─── Classify ──────────────────────────────────────────────────────────────────

// FLAKY   = observed with ≥1 pass AND ≥1 fail
// stable  = only passes (stablePass) or only fails (stableFail)
// all-skip (0 pass, 0 fail) is not a data point — excluded from every bucket, so
// flake-rate never divides by zero.
const flaky = [];
let stablePass = 0;
let stableFail = 0;

Object.keys(agg).forEach(function(k) {
    const r = agg[k];
    const observed = r.pass + r.fail;
    if (observed === 0) return;   // all-skip
    if (r.pass > 0 && r.fail > 0) {
        flaky.push({
            request:   r.request,
            assertion: r.assertion,
            pass:      r.pass,
            fail:      r.fail,
            rate:      Math.round(r.fail / observed * 10000) / 10000,   // fail fraction, 0..1
        });
    } else if (r.fail === 0) {
        stablePass++;
    } else {
        stableFail++;
    }
});

// A run that contributed no assertions (a mis-wired pipeline pointing at a
// collection, or a Newman run that errored out) would otherwise pass silently —
// surface it so a --fail-on-flaky gate can't read green on nothing evaluated.
if (Object.keys(agg).length === 0) {
    console.error('⚠ 0 assertions evaluated across ' + runs.length + ' run(s) — are these Newman result files with assertions?');
}

// Most-flaky first; ties broken by more evidence, then name, for deterministic output.
flaky.sort(function(a, b) {
    if (b.rate !== a.rate) return b.rate - a.rate;
    const bTot = b.pass + b.fail, aTot = a.pass + a.fail;
    if (bTot !== aTot) return bTot - aTot;
    if (a.request !== b.request) return a.request < b.request ? -1 : 1;
    return a.assertion < b.assertion ? -1 : (a.assertion > b.assertion ? 1 : 0);
});

// ─── JSON output ───────────────────────────────────────────────────────────────

if (jsonOut) {
    console.log(JSON.stringify({
        runs:       runs.length,
        flaky:      flaky,
        stablePass: stablePass,
        stableFail: stableFail
    }, null, 2));
    process.exit(failOnFlaky && flaky.length > 0 ? 1 : 0);
}

// ─── Console output ────────────────────────────────────────────────────────────

const c = {
    green:  function(s) { return noColor ? s : '\x1b[32m' + s + '\x1b[0m'; },
    red:    function(s) { return noColor ? s : '\x1b[31m' + s + '\x1b[0m'; },
    yellow: function(s) { return noColor ? s : '\x1b[33m' + s + '\x1b[0m'; },
    bold:   function(s) { return noColor ? s : '\x1b[1m'  + s + '\x1b[0m'; },
    dim:    function(s) { return noColor ? s : '\x1b[2m'  + s + '\x1b[0m'; }
};

const W  = 70;
const HR = c.dim('─'.repeat(W));

console.log('');
console.log(c.bold('  ⚒️  Hephaestus — Flaky-Test Detector'));
console.log(HR);
console.log(c.dim('  Runs analyzed: ') + runs.length);
console.log('');

if (flaky.length === 0) {
    console.log('  ' + c.green('✓ no flaky assertions across ' + runs.length + ' runs'));
    console.log('');
} else {
    console.log(c.bold('  Flaky assertions  ') + c.red('(' + flaky.length + ')'));
    console.log(HR);
    flaky.forEach(function(f) {
        const pct   = Math.round(f.rate * 100);
        const tally = c.green(f.pass + '✓') + '/' + c.red(f.fail + '✗');
        console.log('  ' + c.yellow('⚡') + ' ' + c.bold(f.request));
        console.log('      ↳ ' + f.assertion);
        console.log('        ' + tally + '  ' + c.yellow('(' + pct + '% fail)'));
    });
    console.log('');
}

console.log('  ' + c.bold(flaky.length + ' flaky') + ' · ' + stablePass + ' stable-pass · ' + stableFail + ' stable-fail');
console.log('');

process.exit(failOnFlaky && flaky.length > 0 ? 1 : 0);
