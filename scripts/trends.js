#!/usr/bin/env node
/**
 * Hephaestus — Run Trends  v3.9.0
 *
 * Zero-backend history view: reads the JSONL history written by
 * `summary.js --history` and renders unicode sparklines for pass-rate and p95
 * across runs, plus the latest value and its delta vs the previous run.
 *
 * Usage:
 *   node scripts/trends.js [history.jsonl] [--last N] [--json] [--no-color]
 *
 * Options:
 *   [history.jsonl]  History file (default: .hephaestus/history.jsonl)
 *   --last N         Only consider the most recent N runs
 *   --json           Emit machine-readable JSON instead of the terminal view
 *   --no-color       Disable terminal colors
 *   --help           Show this help and exit 0
 *
 * Exit codes: 0 = rendered ok · 1 = missing/unreadable/empty history.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_HISTORY = '.hephaestus/history.jsonl';
const SPARK = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
const MID   = SPARK[Math.floor((SPARK.length - 1) / 2)]; // flat/mid bar for degenerate series

// ─── CLI ──────────────────────────────────────────────────────────────────────

const args     = process.argv.slice(2);
const wantJson  = args.includes('--json');
const noColor   = args.includes('--no-color') || wantJson;
const wantHelp  = args.includes('--help') || args.includes('-h');

// --last N (positive integer). The value slot is remembered so it can never be
// mistaken for the positional history path.
let lastN        = null;
const lastIdx    = args.indexOf('--last');
const lastValIdx = lastIdx !== -1 ? lastIdx + 1 : -1;
if (lastIdx !== -1) {
    const v = parseInt(args[lastIdx + 1], 10);
    if (!isNaN(v) && v > 0) lastN = v;
}

// First non-flag arg is the history file, skipping the --last value slot.
const positional  = args.find(function(a, i) { return !a.startsWith('-') && i !== lastValIdx; });
const historyFile = positional || DEFAULT_HISTORY;

// ─── Help ─────────────────────────────────────────────────────────────────────

function printHelp() {
    console.log([
        '',
        '⚒️  Hephaestus — Run Trends',
        '',
        'Usage: node scripts/trends.js [history.jsonl] [--last N] [--json] [--no-color]',
        '',
        '  [history.jsonl]  History file (default: ' + DEFAULT_HISTORY + ')',
        '  --last N         Only the most recent N runs',
        '  --json           Machine-readable JSON output',
        '  --no-color       Disable terminal colors',
        '  --help           Show this help',
        '',
        'History is produced by:  node scripts/summary.js <results.json> --history',
        ''
    ].join('\n'));
}

if (wantHelp) {
    printHelp();
    process.exit(0);
}

// ─── Read + parse history ─────────────────────────────────────────────────────

let raw;
try {
    raw = fs.readFileSync(path.resolve(historyFile), 'utf8');
} catch (err) {
    console.error('Hephaestus trends: cannot read history file "' + historyFile + '" — ' + err.message);
    console.error('Record some runs first, e.g.:  node scripts/summary.js <results.json> --history');
    process.exit(1);
}

const records = [];
raw.split('\n').forEach(function(line, i) {
    const trimmed = line.trim();
    // Skip blank lines and #-comments.
    if (!trimmed || trimmed.charAt(0) === '#') return;
    try {
        records.push(JSON.parse(trimmed));
    } catch (err) {
        // Tolerate one bad line — warn, don't crash the whole view.
        console.error('⚠️  Skipping malformed history line ' + (i + 1) + ': ' + err.message);
    }
});

if (records.length === 0) {
    console.error('Hephaestus trends: no runs recorded in "' + historyFile + '" yet.');
    console.error('Record some runs first, e.g.:  node scripts/summary.js <results.json> --history');
    process.exit(1);
}

// ─── Series helpers ───────────────────────────────────────────────────────────

function num(v) {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
}

// Unicode sparkline. All-equal (incl. single value) renders a flat mid bar
// instead of dividing by a zero range.
function sparkline(values) {
    if (!values.length) return '';
    // Fold min/max (not Math.min.apply(...values)) so a very long history can't
    // blow the argument/stack limit with a RangeError.
    let min = values[0], max = values[0];
    for (let i = 1; i < values.length; i++) {
        if (values[i] < min) min = values[i];
        if (values[i] > max) max = values[i];
    }
    const range = max - min;
    return values.map(function(v) {
        if (range === 0) return MID;
        const idx = Math.round((v - min) / range * (SPARK.length - 1));
        return SPARK[idx];
    }).join('');
}

function deltaOf(values) {
    if (values.length < 2) return 0;
    return values[values.length - 1] - values[values.length - 2];
}

const sliced    = lastN ? records.slice(-lastN) : records;
const passRates = sliced.map(function(r) { return num(r.passRate); });
const p95s      = sliced.map(function(r) { return num(r.p95); });

const passMetric = {
    values: passRates,
    latest: passRates[passRates.length - 1],
    delta:  deltaOf(passRates),
    spark:  sparkline(passRates)
};
const p95Metric = {
    values: p95s,
    latest: p95s[p95s.length - 1],
    delta:  deltaOf(p95s),
    spark:  sparkline(p95s)
};

// ─── JSON output ──────────────────────────────────────────────────────────────

if (wantJson) {
    const out = {
        count:    sliced.length,
        passRate: passMetric,
        p95:      p95Metric
    };
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    process.exit(0);
}

// ─── Terminal render ──────────────────────────────────────────────────────────

const c = {
    green: function(s) { return noColor ? s : '\x1b[32m' + s + '\x1b[0m'; },
    red:   function(s) { return noColor ? s : '\x1b[31m' + s + '\x1b[0m'; },
    bold:  function(s) { return noColor ? s : '\x1b[1m'  + s + '\x1b[0m'; },
    dim:   function(s) { return noColor ? s : '\x1b[2m'  + s + '\x1b[0m'; },
    cyan:  function(s) { return noColor ? s : '\x1b[36m' + s + '\x1b[0m'; }
};

// Format a delta with an up/down arrow, coloured by whether the move is "good".
// goodIsUp=true → higher is better (pass rate); false → lower is better (p95).
function fmtDelta(d, unit, goodIsUp) {
    if (d === 0) return c.dim('▬ ±0' + unit);
    const up   = d > 0;
    const good = goodIsUp ? up : !up;
    const text = (up ? '▲ +' : '▼ ') + d + unit;
    return good ? c.green(text) : c.red(text);
}

function padR(s, n) { return String(s).padEnd(n); }
function padL(s, n) { return String(s).padStart(n); }

const runWord = sliced.length === 1 ? 'run' : 'runs';

console.log('');
console.log(c.bold('  🔥 HEPHAESTUS  Run Trends') + c.dim('   (' + sliced.length + ' ' + runWord + ')'));
console.log(c.dim('  ' + '─'.repeat(64)));

console.log(
    '  ' + c.bold(padR('Pass rate', 11))
    + c.cyan(padR(passMetric.spark, Math.max(passMetric.spark.length, 12)))
    + '  ' + padL(passMetric.latest + '%', 7)
    + '  ' + fmtDelta(passMetric.delta, '%', true)
);
console.log(
    '  ' + c.bold(padR('p95', 11))
    + c.cyan(padR(p95Metric.spark, Math.max(p95Metric.spark.length, 12)))
    + '  ' + padL(p95Metric.latest + 'ms', 7)
    + '  ' + fmtDelta(p95Metric.delta, 'ms', false)
);
console.log('');

if (sliced.length === 1) {
    console.log(c.dim('  Only one run recorded — deltas appear once a second run is logged.'));
    console.log('');
}

process.exit(0);
